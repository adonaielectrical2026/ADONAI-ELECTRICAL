const fs=require('fs'), vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
if(!src.includes(tail)) throw new Error('tail not found');
src=src.replace(tail, `  globalThis.__adonaiTest={calcularBalanceFases,autoBalancearFases,calcularAcometida,comprobarProteccionGeneral,migrarEsquemaDB,NORMATIVE_PACK,MOTOR_VERSION,DB_SCHEMA_VERSION};\n})();`);
const store=new Map();
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global; global.window.matchMedia=()=>({matches:false,addEventListener(){}}); global.window.addEventListener=()=>{}; global.window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){}; global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'});
const T=global.__adonaiTest; let failed=0;
function assert(name,ok,detail=''){console.log(ok?'PASS':'FAIL',name,detail);if(!ok)failed++;}
function baseDraft(){return {
 sistemaId:'tri_tt', obra:{naturaleza:'Instalación nueva',tipo:'Comercial'}, factores:{fuerza:1,iluminacion:1},
 cargas:[], balanceFases:{potenciaContratadaKw:20}, acometida:{l:10,seccion:null},
 circuitos:[], proteccionGeneral:{diferencialSensibilidad:30,resistenciaTierraOhm:100,ambienteTierra:'seco',sobretensionesRiesgo:'no'}
};}
function c(id,ib,fase){return {id,nombre:id,ib,v:230,fases:1,fasesConfirmadas:true,faseAsignada:fase,l:10,material:'cobre',metodo:'embutido',aislacion:'pvc',tempAmb:25,agrupados:1,cosPhi:1,caidaMax:5,uso:'fuerza',tipoProteccion:'mcb'};}
let d=baseDraft(); d.circuitos=[c('C1',10,'L1'),c('C2',10,'L2'),c('C3',10,'L3')];
let b=T.calcularBalanceFases(d);
assert('balance perfecto TT = 0%',b.estado==='cumple' && b.desequilibrioPct<1e-9 && b.corrientes.every(x=>Math.abs(x-10)<1e-6),JSON.stringify(b));
d=baseDraft(); d.circuitos=[c('C1',12,'L1'),c('C2',10,'L2'),c('C3',8,'L3')]; b=T.calcularBalanceFases(d);
assert('20% exacto con 20 kW cumple',b.estado==='cumple' && Math.abs(b.desequilibrioPct-20)<1e-6 && b.limitePct===20,JSON.stringify(b));
d=baseDraft(); d.circuitos=[c('C1',13,'L1'),c('C2',10,'L2'),c('C3',7,'L3')]; b=T.calcularBalanceFases(d);
assert('30% con 20 kW no cumple',b.estado==='no_cumple' && b.causas.some(x=>x.includes('superior al máximo')),JSON.stringify(b));
d=baseDraft(); d.balanceFases.potenciaContratadaKw=60; d.circuitos=[c('C1',12,'L1'),c('C2',10,'L2'),c('C3',8,'L3')]; b=T.calcularBalanceFases(d);
assert('20% con más de 50 kW excede límite 15%',b.estado==='no_cumple' && b.limitePct===15,JSON.stringify(b));
d=baseDraft(); d.circuitos=[c('C1',10,''),c('C2',10,'L2'),c('C3',10,'L3')]; b=T.calcularBalanceFases(d);
assert('monofásico sin fase asignada queda pendiente',b.estado==='pendiente' && b.pendientes.some(x=>x.includes('falta asignar')),JSON.stringify(b));
d=baseDraft(); d.circuitos=[c('C1',20,''),c('C2',15,''),c('C3',10,''),c('C4',5,'')]; T.autoBalancearFases(d); b=T.calcularBalanceFases(d);
assert('auto balance asigna todas las fases',d.circuitos.every(x=>['L1','L2','L3'].includes(x.faseAsignada)) && b.estado!=='pendiente',JSON.stringify({asig:d.circuitos.map(x=>x.faseAsignada),b}));
// IT 230 V: pares de conductores.
d=baseDraft(); d.sistemaId='tri_it'; d.circuitos=[c('A',10,'L1-L2'),c('B',10,'L2-L3'),c('C',10,'L3-L1')]; b=T.calcularBalanceFases(d);
assert('IT con tres pares iguales queda equilibrado',b.estado==='cumple' && b.desequilibrioPct<1e-6,JSON.stringify(b));
// La fase más cargada debe entrar al enlace cuando supera la corriente equilibrada contratada.
d=baseDraft(); d.balanceFases.potenciaContratadaKw=20; d.circuitos=[c('C1',40,'L1'),c('C2',5,'L2'),c('C3',5,'L3')];
let a=T.calcularAcometida(d);
assert('alimentador usa corriente de fase máxima',a.ibFaseMax>39.9 && a.ibDiseno>=a.ibFaseMax,JSON.stringify({ibFaseMax:a.ibFaseMax,ibDiseno:a.ibDiseno,ig:a.ig}));
let mig=T.migrarEsquemaDB({schemaVersion:6,trabajos:[{sistemaId:'tri_tt',circuitos:[{fases:1,fasesConfirmadas:true}]}],presupuestos:[],settings:{},seq:{}}).db;
assert('migración v7 no inventa fase',mig.schemaVersion===14 && mig.trabajos[0].circuitos[0].faseAsignada==='' && mig.trabajos[0].balanceFases.potenciaContratadaKw===null,JSON.stringify(mig.trabajos[0]));
assert('motor 2.6.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION);
assert('pack 1.4 alimentador',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version);
assert('schema v8',T.DB_SCHEMA_VERSION===14,String(T.DB_SCHEMA_VERSION));
process.exitCode=failed?1:0;
