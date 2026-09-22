const fs=require('fs'), vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
if(!src.includes(tail)) throw new Error('tail not found');
src=src.replace(tail, `  globalThis.__adonaiTest={comprobarCircuito, comprobarProteccionGeneral, diferencialDelCircuito, iccPorTramoAnexo, importarCargasComoCircuitos, sincronizarCargasComoCircuitos, migrarEsquemaDB, NORMATIVE_PACK, MOTOR_VERSION, DB_SCHEMA_VERSION};\n})();`);
const store=new Map();
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global; global.window.matchMedia=()=>({matches:false,addEventListener(){}}); global.window.addEventListener=()=>{}; global.window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){}; global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'});
const T=global.__adonaiTest; let failed=0;
function assert(name,ok,detail=''){console.log(ok?'PASS':'FAIL',name,detail);if(!ok)failed++;}
function circuito(over={}){return {
 ib:10,v:230,fases:1,l:10,material:'cobre',metodo:'embutido',aislacion:'pvc',tempAmb:25,agrupados:1,cosPhi:1,caidaMax:5,uso:'fuerza',
 inProteccion:16,tipoProteccion:'mcb',iccKa:3,poderCorteKa:6,i2tPasante:10000,equipo:'comun',sistemaId:'mono',iccMinFinalA:200,tiempoDesconexionVerificadoS:0.05,continuidadPe:'si',...over
};}
let r=T.comprobarCircuito(circuito());
assert('circuito completo puede cerrar verificado',r.estado==='cumple',JSON.stringify({estado:r.estado,causas:r.causas,pendientes:r.pendientes}));
r=T.comprobarCircuito(circuito({cosPhi:0}));
assert('cos phi inválido no puede quedar verificado',r.estado==='pendiente' && r.pendientes.some(x=>x.includes('cos φ')),JSON.stringify(r.pendientes));
r=T.comprobarCircuito(circuito({equipo:'cargador_ve',modoCargaVe:'',diferencialIndividualVe:'desconocido'}));
assert('VE sin modo ni diferencial individual -> pendiente',r.estado==='pendiente' && r.pendientes.some(x=>x.includes('modo de carga')) && r.pendientes.some(x=>x.includes('diferencial individual')),JSON.stringify(r.pendientes));
r=T.comprobarCircuito(circuito({equipo:'cargador_ve',modoCargaVe:'3',diferencialIndividualVe:'no'}));
assert('VE sin diferencial individual -> no cumple',r.estado==='no_cumple' && r.causas.some(x=>x.includes('no tiene protección diferencial individual')),JSON.stringify(r.causas));
r=T.comprobarCircuito(circuito({equipo:'cargador_ve',modoCargaVe:'3',diferencialIndividualVe:'si',rdcdd6mA:false}));
assert('VE modo 3 sin RDC-DD confirmado usa tipo B y puede cerrar',r.estado==='cumple' && T.diferencialDelCircuito({equipo:'cargador_ve',modoCargaVe:'3',rdcdd6mA:false}).tipo==='B',JSON.stringify(r));
r=T.comprobarCircuito(circuito({equipo:'cargador_ve',modoCargaVe:'3',diferencialIndividualVe:'si',rdcdd6mA:true}));
assert('VE modo 3 con RDC-DD 6mA propone tipo A/F',r.estado==='cumple' && T.diferencialDelCircuito({equipo:'cargador_ve',modoCargaVe:'3',rdcdd6mA:true}).tipo==='A',JSON.stringify(r));

let imp=T.importarCargasComoCircuitos([{id:'c1',nombre:'Luz',categoria:'iluminacion',potenciaW:2300,cantidad:1,cosPhi:1}],{id:'tri_tt',v:400,fases:3});
assert('carga en suministro 3f no se hereda como circuito 3f',imp[0].fases===1 && imp[0].v===230 && imp[0].fasesConfirmadas===false && Math.abs(imp[0].ib-10)<0.01,JSON.stringify(imp[0]));
r=T.comprobarCircuito(circuito({fasesConfirmadas:false}));
assert('circuito trifásico sin confirmar fases -> pendiente',r.estado==='pendiente' && r.pendientes.some(x=>x.includes('monofásico o trifásico')),JSON.stringify(r.pendientes));
r=T.comprobarCircuito(circuito({sistemaId:'mono',fases:3,v:230,fasesConfirmadas:true}));
assert('suministro mono no admite circuito 3f',r.estado==='no_cumple' && r.causas.some(x=>x.includes('suministro del proyecto es monofásico')),JSON.stringify(r.causas));
r=T.comprobarCircuito(circuito({sistemaId:'tri_tt',fases:3,v:230,fasesConfirmadas:true}));
assert('tensión incompatible con alimentación 3f no puede verificar',r.estado==='no_cumple' && r.causas.some(x=>x.includes('no coincide con la alimentación')),JSON.stringify(r.causas));
const syncCambio=T.sincronizarCargasComoCircuitos([], {id:'tri_tt',v:400,fases:3}, [{id:'m1',nombre:'Manual',fases:3,v:230,fasesConfirmadas:true,fasesManual:true,sistemaId:'mono'}]);
assert('cambio de sistema invalida fases previas de circuito manual',syncCambio[0].sistemaId==='tri_tt' && syncCambio[0].fases===1 && syncCambio[0].v===230 && syncCambio[0].fasesConfirmadas===false,JSON.stringify(syncCambio[0]));
const pgBase={aplica:true,modo:'nueva',coordina:true,termicaIn:25,diferencialIn:25,diferencialExiste:true,diferencialSensibilidad:30,diferencialTipo:'A'};
const dBal={sistemaId:'tri_tt',obra:{naturaleza:'Instalación nueva',tipo:'Residencial'},circuitos:[{fases:1}],proteccionGeneral:{diferencialSensibilidad:30,resistenciaTierraOhm:100,ambienteTierra:'seco',sobretensionesRiesgo:'no',pararrayosLps:'no',spdExiste:'desconocido'}};
let bal=T.comprobarProteccionGeneral(dBal,pgBase);
assert('trifásico con circuitos monofásicos no cierra sin balance de fases',bal.estado==='pendiente' && bal.pendientes.some(x=>x.toLowerCase().includes('balance de fases')),JSON.stringify(bal.pendientes));

let icc=T.iccPorTramoAnexo(380,30,70,'cobre',23);
assert('ejemplo UTE Tabla C: 30 kA, 70mm2, 23m -> 20 kA',Math.abs(icc.ka-20)<1e-9 && !icc.ambigua,JSON.stringify(icc));
icc=T.iccPorTramoAnexo(380,60,240,'cobre',30);
assert('celda no monótona Tabla C no se corrige silenciosamente',icc.ka===null && icc.ambigua===true,JSON.stringify(icc));
const mig=T.migrarEsquemaDB({schemaVersion:5,trabajos:[{circuitos:[{equipo:'cargador_ve'}]}],presupuestos:[],settings:{},seq:{}}).db;
assert('migración v6 deja VE antiguo pendiente',mig.schemaVersion===14 && mig.trabajos[0].circuitos[0].modoCargaVe==='' && mig.trabajos[0].circuitos[0].diferencialIndividualVe==='desconocido',JSON.stringify(mig.trabajos[0].circuitos[0]));
assert('motor 2.6.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION);
assert('pack alimentador completo',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version);
assert('schema v8',T.DB_SCHEMA_VERSION===14,String(T.DB_SCHEMA_VERSION));
process.exitCode=failed?1:0;
