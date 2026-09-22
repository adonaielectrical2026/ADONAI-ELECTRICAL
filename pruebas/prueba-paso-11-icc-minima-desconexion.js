const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
src=src.replace(tail,`  globalThis.__adonaiTest={umbralMagneticoGarantizado,evaluarIccMinimaYDesconexion,migrarEsquemaDB,NORMATIVE_PACK,MOTOR_VERSION,DB_SCHEMA_VERSION};\n})();`);
const store=new Map(); global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global; window.matchMedia=()=>({matches:false,addEventListener(){}}); window.addEventListener=()=>{}; window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){}; global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'}); const T=global.__adonaiTest; let failed=0;
function assert(name,ok,detail=''){console.log(ok?'PASS':'FAIL',name,detail); if(!ok)failed++;}
assert('B 10 A -> umbral garantizado 50 A',T.umbralMagneticoGarantizado('B',10)===50);
assert('C 10 A -> umbral garantizado 100 A',T.umbralMagneticoGarantizado('C',10)===100);
assert('D 10 A -> umbral garantizado 200 A',T.umbralMagneticoGarantizado('D',10)===200);

let r=T.evaluarIccMinimaYDesconexion({tipoProteccion:'mcb',v:230,iccMinFinalA:120},10,'C',10000);
assert('C10 con Ikmin 120 A garantiza zona magnética',r.magnetico===true,JSON.stringify(r));
assert('t térmico = I2t/Ik2',Math.abs(r.tiempoAdmisibleS-(10000/(120*120)))<1e-9,JSON.stringify(r));
assert('cota magnética 0.1 s cumple cuando t admisible es mayor',r.tiempoActuacionS===0.1 && r.cumpleTiempo===true && r.cumpleIccMinima===true,JSON.stringify(r));

r=T.evaluarIccMinimaYDesconexion({tipoProteccion:'mcb',v:230,iccMinFinalA:80},10,'C',10000);
assert('C10 con Ikmin 80 A no garantiza magnético',r.magnetico===false,JSON.stringify(r));
assert('sin curva/tiempo queda pendiente y no falso incumplimiento',r.cumpleIccMinima===null && r.causas.length===0 && r.pendientes.length>0,JSON.stringify(r));

r=T.evaluarIccMinimaYDesconexion({tipoProteccion:'mcb',v:230,iccMinFinalA:80,tiempoDesconexionVerificadoS:0.5},10,'C',10000);
assert('tiempo fabricante 0.5 s cumple límite térmico 1.5625 s',r.cumpleTiempo===true && r.cumpleIccMinima===true,JSON.stringify(r));
r=T.evaluarIccMinimaYDesconexion({tipoProteccion:'mcb',v:230,iccMinFinalA:80,tiempoDesconexionVerificadoS:2},10,'C',10000);
assert('tiempo fabricante 2 s excede límite térmico',r.cumpleTiempo===false && r.cumpleIccMinima===false && r.causas.length>0,JSON.stringify(r));

r=T.evaluarIccMinimaYDesconexion({tipoProteccion:'mcb',v:230,iccMinFinalA:120},10,'C',1000);
assert('si t admisible <0.1 s no se aprueba con cota genérica',r.magnetico===true && r.tiempoAdmisibleS<0.1 && r.cumpleIccMinima===null && r.pendientes.some(x=>x.includes('fabricante')),JSON.stringify(r));

r=T.evaluarIccMinimaYDesconexion({tipoProteccion:'mcb',v:230,zCortoFinalOhm:2},10,'C',10000);
assert('Z=2 ohm y 230 V -> Ikmin=115 A',Math.abs(r.iccMinA-115)<1e-9 && r.fuente==='impedancia',JSON.stringify(r));

const mig=T.migrarEsquemaDB({schemaVersion:9,trabajos:[{sistemaId:'mono',circuitos:[{}]}],presupuestos:[],settings:{},seq:{}}).db;
const cm=mig.trabajos[0].circuitos[0];
assert('migración v10 no inventa Ikmin, Z ni tiempo',mig.schemaVersion===14 && cm.iccMinFinalA===null && cm.zCortoFinalOhm===null && cm.tiempoDesconexionVerificadoS===null,JSON.stringify(cm));
assert('motor 2.6.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION);
assert('pack 1.7',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version);
assert('schema 10',T.DB_SCHEMA_VERSION===14,T.DB_SCHEMA_VERSION);
process.exitCode=failed?1:0;
