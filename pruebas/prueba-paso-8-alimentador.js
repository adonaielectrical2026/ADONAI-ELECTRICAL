const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
if(!src.includes(tail)) throw new Error('tail not found');
src=src.replace(tail,`  globalThis.__adonaiTest={calcularAcometida,calcularProteccionGeneral,comprobarProteccionGeneral,migrarEsquemaDB,NORMATIVE_PACK,MOTOR_VERSION,DB_SCHEMA_VERSION};\n})();`);
const store=new Map(); global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global; window.matchMedia=()=>({matches:false,addEventListener(){}}); window.addEventListener=()=>{}; window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){}; global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'}); const T=global.__adonaiTest; let failed=0;
function assert(name,ok,detail=''){console.log(ok?'PASS':'FAIL',name,detail);if(!ok)failed++;}
function circ(id,ib,f){return {id,nombre:id,ib,v:230,fases:1,fasesConfirmadas:true,faseAsignada:f,l:10,material:'cobre',metodo:'embutido',aislacion:'pvc',tempAmb:25,agrupados:1,cosPhi:1,caidaMax:5,uso:'fuerza',tipoProteccion:'mcb'};}
function draft(){return {sistemaId:'tri_tt',obra:{naturaleza:'Instalación nueva',tipo:'Comercial'},factores:{fuerza:1,iluminacion:1},cargas:[],balanceFases:{potenciaContratadaKw:20},acometida:{l:10,seccion:null,neutroSeccion:null,peSeccion:null},circuitos:[circ('C1',10,'L1'),circ('C2',10,'L2'),circ('C3',10,'L3')],proteccionGeneral:{diferencialSensibilidad:30,resistenciaTierraOhm:100,ambienteTierra:'seco',sobretensionesRiesgo:'no'}};}
let d=draft(),a=T.calcularAcometida(d);
assert('TT equilibrado estima IN fundamental ~0',a.tieneNeutro && a.neutroCorriente<1e-6,JSON.stringify({n:a.neutroCorriente,sn:a.neutroSeccion}));
assert('neutro automático = fase',a.neutroSeccion===a.seccion,JSON.stringify({fase:a.seccion,n:a.neutroSeccion}));
assert('PE pequeño suministro tiene mínimo',a.peMin!==null && a.peSeccion===a.peMin,JSON.stringify({fase:a.seccion,pe:a.peSeccion,min:a.peMin}));
d.circuitos=[circ('C1',20,'L1'),circ('C2',5,'L2'),circ('C3',5,'L3')]; a=T.calcularAcometida(d);
assert('desequilibrio genera corriente de neutro',a.neutroCorriente>0,JSON.stringify({n:a.neutroCorriente}));
d.acometida.neutroSeccion=1.5; a=T.calcularAcometida(d);
assert('reducir neutro queda pendiente o no cumple',a.estado!=='cumple' && a.pendientes.some(x=>x.includes('armónicos')),JSON.stringify(a.pendientes));
d=draft(); d.sistemaId='tri_it'; d.circuitos=[{...circ('A',10,'L1-L2'),sistemaId:'tri_it'},{...circ('B',10,'L2-L3'),sistemaId:'tri_it'},{...circ('C',10,'L3-L1'),sistemaId:'tri_it'}]; a=T.calcularAcometida(d); let pg=T.calcularProteccionGeneral(d);
assert('IT no inventa neutro',a.tieneNeutro===false && a.neutroSeccion===null,JSON.stringify(a));
assert('IT térmica general 3 polos',pg.termicaPolos===3,String(pg.termicaPolos));
let mig=T.migrarEsquemaDB({schemaVersion:7,trabajos:[{sistemaId:'mono',acometida:{l:10,seccion:6},circuitos:[]}],presupuestos:[],settings:{},seq:{}}).db;
assert('migración v8 añade N y PE automáticos',mig.schemaVersion===14 && mig.trabajos[0].acometida.neutroSeccion===null && mig.trabajos[0].acometida.peSeccion===null,JSON.stringify(mig.trabajos[0].acometida));
assert('motor 2.6.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION);
assert('pack 1.4',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version);
assert('schema v8',T.DB_SCHEMA_VERSION===14,String(T.DB_SCHEMA_VERSION));
process.exitCode=failed?1:0;
