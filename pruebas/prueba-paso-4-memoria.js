const fs=require('fs'), vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
if(!src.includes(tail)) throw new Error('tail not found');
src=src.replace(tail, `  globalThis.__adonaiTest={comprobarProteccionGeneral, calcularProteccionGeneral, NORMATIVE_PACK, MOTOR_VERSION};\n})();`);
const store=new Map();
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global;
global.window.matchMedia=()=>({matches:false,addEventListener(){}});
global.window.addEventListener=()=>{};
global.window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={};
global.Image=function(){};
global.Blob=function(){};
global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'});
const {comprobarProteccionGeneral}=global.__adonaiTest;
function base(tipo='Residencial', sens=30, ra=null, amb='seco'){
  return {obra:{naturaleza:'Instalación nueva',tipo},proteccionGeneral:{diferencialSensibilidad:sens,resistenciaTierraOhm:ra,ambienteTierra:amb,sobretensionesRiesgo:'no',pararrayosLps:'no',spdExiste:'desconocido'}};
}
// Test the verification function with a precomputed valid general protection so only RCD/earth is isolated.
function pg(sens=30){return {aplica:true,modo:'nueva',coordina:true,termicaIn:25,diferencialIn:25,diferencialExiste:true,diferencialSensibilidad:sens,diferencialTipo:'A'};}
const cases=[
  ['residential dry 30mA no measurement => pending',base('Residencial',30,null,'seco'),pg(30),'pendiente',1666.6666667],
  ['residential dry 30mA 100ohm => cumple',base('Residencial',30,100,'seco'),pg(30),'cumple',1666.6666667],
  ['residential wet 30mA 900ohm => no_cumple',base('Residencial',30,900,'humedo'),pg(30),'no_cumple',800],
  ['residential 300mA => no_cumple',base('Residencial',300,100,'seco'),pg(300),'no_cumple',166.6666667],
  ['industrial dry 300mA 100ohm => cumple',base('Industrial',300,100,'seco'),pg(300),'cumple',166.6666667],
];
let failed=0;
for(const [name,d,p,expected,max] of cases){
  const r=comprobarProteccionGeneral(d,p);
  const ok=r.estado===expected && Math.abs(r.raMax-max)<0.01;
  console.log(ok?'PASS':'FAIL',name,'=>',r.estado,'RAmax',r.raMax);
  if(!ok) failed++;
}
if(global.__adonaiTest.MOTOR_VERSION!=='3.0.0') {console.log('FAIL motor version'); failed++;}
if(global.__adonaiTest.NORMATIVE_PACK.version!=='2.2-cierre-profesional') {console.log('FAIL pack version'); failed++;}
process.exitCode=failed?1:0;
