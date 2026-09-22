const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
src=src.replace(tail,`  globalThis.__adonaiTest={requisitosAislamientoIEC,comprobarEnsayoCircuito,comprobarProtocoloEnsayos,migrarEsquemaDB,NORMATIVE_PACK,MOTOR_VERSION,DB_SCHEMA_VERSION};\n})();`);
const store=new Map(); global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global; window.matchMedia=()=>({matches:false,addEventListener(){}}); window.addEventListener=()=>{}; window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){}; global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'}); const T=global.__adonaiTest; let failed=0;
function assert(name,ok,detail=''){console.log(ok?'PASS':'FAIL',name,detail); if(!ok)failed++;}
assert('hasta 500 V -> 500 Vcc / 1 MΩ',JSON.stringify(T.requisitosAislamientoIEC({v:230}))===JSON.stringify({tensionEnsayoV:500,minimoMohm:1}),JSON.stringify(T.requisitosAislamientoIEC({v:230})));
function draftBase(){return {sistemaId:'mono_tt',obra:{tipo:'Residencial',naturaleza:'Instalación nueva'},factores:{iluminacion:1,tomacorrientes:.66,cargaFija:.8},acometida:{l:10,seccion:null,neutroSeccion:null,peSeccion:null},balanceFases:{potenciaContratadaKw:null},cargas:[],materiales:[],proteccionGeneral:{diferencialSensibilidad:30,ambienteTierra:'seco',resistenciaTierraOhm:50,diferencialExiste:'si',diferencialTipo:'A',diferencialSelectividad:'instantaneo',tiempoDiferencialGeneralS:.15,equipotencialPrincipalAplica:'no',equipotencialSuplementariaAplica:'no',ensayoRcdGeneral:'si',ensayoFuncionalProtecciones:'si'},protocoloEnsayos:{fecha:'2026-09-21',tecnico:'Técnico',instrumento:'Multifunción',serie:'123',calibracion:'si'},circuitos:[]};}
let d=draftBase(); let c={id:'C1',nombre:'Tomas',fases:1,v:230,ib:5,material:'cobre',metodo:'embutido',aislacion:'pvc',tempAmb:30,agrupados:1,cosPhi:1,caidaMax:5,uso:'fuerza',l:10,continuidadPe:'si',aislamientoEnsayoV:500,aislamientoMohm:50,polaridad:'si',secuenciaFases:'pendiente',ensayoRcd:'pendiente'}; d.circuitos=[c];
let r=T.comprobarEnsayoCircuito(c,d); assert('aislamiento 50 MΩ y polaridad correcta verifica ensayo de circuito',r.estado==='cumple',JSON.stringify(r));
c={...c,aislamientoMohm:.8}; d.circuitos=[c]; r=T.comprobarEnsayoCircuito(c,d); assert('aislamiento <1 MΩ no cumple',r.estado==='no_cumple',JSON.stringify(r.causas));
c={...c,aislamientoMohm:10,aislamientoEnsayoV:250}; d.circuitos=[c]; r=T.comprobarEnsayoCircuito(c,d); assert('250 Vcc mantiene mínimo 1 MΩ y deja nota condicionada',r.estado==='cumple' && r.notas.some(x=>x.includes('250 Vcc')),JSON.stringify(r));
c={...c,aislamientoEnsayoV:500,aislamientoMohm:10,polaridad:'pendiente'}; d.circuitos=[c]; r=T.comprobarEnsayoCircuito(c,d); assert('polaridad faltante queda pendiente',r.estado==='pendiente',JSON.stringify(r.pendientes));
c={...c,polaridad:'si'}; d.circuitos=[c]; let p=T.comprobarProtocoloEnsayos(d); assert('protocolo completo verifica',p.estado==='cumple',JSON.stringify(p));
d.protocoloEnsayos.calibracion='pendiente'; p=T.comprobarProtocoloEnsayos(d); assert('calibración sin confirmar deja protocolo pendiente',p.estado==='pendiente',JSON.stringify(p.pendientes));
const mig=T.migrarEsquemaDB({schemaVersion:12,trabajos:[{proteccionGeneral:{},circuitos:[{}]}],presupuestos:[],settings:{},seq:{}}).db;
assert('migración v13 no inventa ensayos',mig.schemaVersion===14 && mig.trabajos[0].circuitos[0].aislamientoMohm===null && mig.trabajos[0].circuitos[0].polaridad==='pendiente' && mig.trabajos[0].protocoloEnsayos.calibracion==='pendiente',JSON.stringify(mig.trabajos[0]));
assert('motor 2.7.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION); assert('pack 2.0',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version); assert('schema 13',T.DB_SCHEMA_VERSION===14,T.DB_SCHEMA_VERSION);
process.exitCode=failed?1:0;
