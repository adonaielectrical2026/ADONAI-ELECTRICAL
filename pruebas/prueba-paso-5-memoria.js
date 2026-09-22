const fs=require('fs'), vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
if(!src.includes(tail)) throw new Error('tail not found');
src=src.replace(tail, `  globalThis.__adonaiTest={comprobarProteccionGeneral, calcularProteccionGeneral, evaluarSobretensiones, factorTerrenoEnterrado, NORMATIVE_PACK, MOTOR_VERSION, DB_SCHEMA_VERSION};\n})();`);
const store=new Map();
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global;
global.window.matchMedia=()=>({matches:false,addEventListener(){}});
global.window.addEventListener=()=>{}; global.window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){};
global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'});
const T=global.__adonaiTest;
let failed=0;
function assert(name, ok, detail='') { console.log(ok?'PASS':'FAIL', name, detail); if(!ok) failed++; }

// Terreno enterrado
let t=T.factorTerrenoEnterrado({metodo:'enterrado',resistividadTerreno:2.5,profundidadEnterrado:0.5});
assert('terreno 2.5 K m/W -> factor 1.00', t.estado==='cumple' && Math.abs(t.factor-1)<1e-9, JSON.stringify(t));
t=T.factorTerrenoEnterrado({metodo:'enterrado',resistividadTerreno:3,profundidadEnterrado:0.8});
assert('terreno 3.0 K m/W -> factor 0.96', t.estado==='cumple' && Math.abs(t.factor-0.96)<1e-9, JSON.stringify(t));
t=T.factorTerrenoEnterrado({metodo:'enterrado',resistividadTerreno:2.5,profundidadEnterrado:1.0});
assert('profundidad >0.8 m -> pendiente', t.estado==='pendiente' && t.pendientes.some(x=>x.includes('0,8')), JSON.stringify(t));
t=T.factorTerrenoEnterrado({metodo:'enterrado',resistividadTerreno:null,profundidadEnterrado:0.5});
assert('sin resistividad -> pendiente', t.estado==='pendiente', JSON.stringify(t));

function draftNueva({tipo='Residencial',ra=100,riesgo='no',lps='no',spd='desconocido',spdTipo='',sens=30}={}) {
  return {obra:{naturaleza:'Instalación nueva',tipo},proteccionGeneral:{
    diferencialSensibilidad:sens,resistenciaTierraOhm:ra,ambienteTierra:'seco',
    sobretensionesRiesgo:riesgo,pararrayosLps:lps,spdExiste:spd,spdTipo
  }};
}
function pgNueva(sens=30){return {aplica:true,modo:'nueva',coordina:true,termicaIn:25,diferencialIn:25,diferencialExiste:true,diferencialSensibilidad:sens,diferencialTipo:'A'};}
let r=T.comprobarProteccionGeneral(draftNueva(),pgNueva());
assert('obra nueva sin riesgo declarado -> cumple',r.estado==='cumple',JSON.stringify(r));
r=T.comprobarProteccionGeneral(draftNueva({riesgo:'si',spd:'no'}),pgNueva());
assert('SPD requerido y ausente -> no cumple',r.estado==='no_cumple' && r.sobretensiones.tipoPropuesto==='Tipo 2',JSON.stringify(r.sobretensiones));
r=T.comprobarProteccionGeneral(draftNueva({riesgo:'si',lps:'si',spd:'si',spdTipo:'Tipo 2',ra:5}),pgNueva());
assert('LPS con SPD solo tipo 2 -> no cumple y propone 1+2',r.estado==='no_cumple' && r.sobretensiones.tipoPropuesto==='Tipo 1+2',JSON.stringify(r.sobretensiones));
r=T.comprobarProteccionGeneral(draftNueva({riesgo:'si',spd:'si',spdTipo:'Tipo 2',ra:12}),pgNueva());
assert('SPD requerido con tierra >=10 ohm -> no cumple',r.estado==='no_cumple' && r.causas.some(x=>x.includes('inferior a 10')),JSON.stringify(r.causas));
r=T.comprobarProteccionGeneral(draftNueva({riesgo:'pendiente'}),pgNueva());
assert('riesgo de sobretensión sin evaluar -> pendiente',r.estado==='pendiente',JSON.stringify(r.pendientes));

function draftExistente(pg={}){
 return {obra:{naturaleza:'Modificación',tipo:'Residencial'},acometida:{seccion:10},proteccionGeneral:{
   diferencialSensibilidad:30,resistenciaTierraOhm:100,ambienteTierra:'seco',sobretensionesRiesgo:'no',pararrayosLps:'no',spdExiste:'desconocido',spdTipo:'',...pg
 }};
}
function pgExistente(over={}) {return {aplica:true,modo:'existente',enlace:{ibDiseno:30,iz:50},alimentadorConfirmado:true,termicaIn:40,diferencialExiste:true,diferencialIn:40,diferencialSensibilidad:30,diferencialTipo:'A',coordina:true,...over};}
r=T.comprobarProteccionGeneral(draftExistente(),pgExistente());
assert('modificación con protección existente relevada -> cumple',r.estado==='cumple',JSON.stringify(r));
r=T.comprobarProteccionGeneral(draftExistente({diferencialExiste:'no'}),pgExistente({diferencialExiste:false,diferencialIn:null}));
assert('modificación sin diferencial -> no cumple',r.estado==='no_cumple',JSON.stringify(r.causas));
r=T.comprobarProteccionGeneral(draftExistente(),pgExistente({alimentadorConfirmado:false}));
assert('modificación sin sección real del alimentador -> pendiente',r.estado==='pendiente',JSON.stringify(r.pendientes));

assert('motor 2.6.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION);
assert('pack v1.4',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version);
assert('schema v8',T.DB_SCHEMA_VERSION===14,String(T.DB_SCHEMA_VERSION));
process.exitCode=failed?1:0;
