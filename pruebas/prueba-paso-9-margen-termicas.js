const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
src=src.replace(tail,`  globalThis.__adonaiTest={nearestBreaker,calcularSeccion,NORMATIVE_PACK,MOTOR_VERSION};\n})();`);
const store=new Map(); global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global; window.matchMedia=()=>({matches:false,addEventListener(){}}); window.addEventListener=()=>{}; window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){}; global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'}); const T=global.__adonaiTest; let failed=0;
function assert(name,ok,detail=''){console.log(ok?'PASS':'FAIL',name,detail); if(!ok)failed++;}
assert('5.1 A no selecciona 6 A; pasa a 10 A',T.nearestBreaker(5.1,20)===10,String(T.nearestBreaker(5.1,20)));
assert('4.8 A puede usar 6 A al 80%',T.nearestBreaker(4.8,20)===6,String(T.nearestBreaker(4.8,20)));
assert('10 A exige al menos 16 A con criterio 80%',T.nearestBreaker(10,25)===16,String(T.nearestBreaker(10,25)));
assert('nunca supera Iz',T.nearestBreaker(10,12)===null,String(T.nearestBreaker(10,12)));
assert('motor 2.6.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION);
assert('pack paso 9',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version);
process.exitCode=failed?1:0;
