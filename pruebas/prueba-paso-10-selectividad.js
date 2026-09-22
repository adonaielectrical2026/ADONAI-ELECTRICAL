const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync('codigo/app.js','utf8');
const tail=`  registrarServiceWorker();\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);\n  else init();\n})();`;
src=src.replace(tail,`  globalThis.__adonaiTest={curvaProteccionDe,comprobarSelectividadTermicas,comprobarSelectividadDiferenciales,migrarEsquemaDB,NORMATIVE_PACK,MOTOR_VERSION,DB_SCHEMA_VERSION};\n})();`);
const store=new Map(); global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.window=global; window.matchMedia=()=>({matches:false,addEventListener(){}}); window.addEventListener=()=>{}; window.removeEventListener=()=>{};
global.document={documentElement:{setAttribute(){}},getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []},readyState:'complete'};
global.navigator={}; global.Image=function(){}; global.Blob=function(){}; global.URL={createObjectURL(){return ''},revokeObjectURL(){}};
vm.runInThisContext(src,{filename:'app.js'}); const T=global.__adonaiTest; let failed=0;
function assert(name,ok,detail=''){console.log(ok?'PASS':'FAIL',name,detail); if(!ok)failed++;}
assert('iluminación sugiere B',T.curvaProteccionDe({uso:'iluminacion'})==='B');
assert('fuerza sugiere C',T.curvaProteccionDe({uso:'fuerza'})==='C');
assert('motor sugiere D',T.curvaProteccionDe({uso:'motor'})==='D');
assert('manual D prevalece',T.curvaProteccionDe({uso:'fuerza',curvaProteccion:'D'})==='D');
function circuito(over={}) {return {id:'c1',nombre:'C1',ib:8,v:230,fases:1,fasesConfirmadas:true,sistemaId:'mono',faseAsignada:'',l:10,material:'cobre',metodo:'embutido',aislacion:'pvc',tempAmb:30,agrupados:1,caidaMax:5,cosPhi:1,uso:'fuerza',expuestoSol:false,tipoProteccion:'mcb',inProteccion:10,iccKa:3,poderCorteKa:6,i2tPasante:5000,equipo:'comun',selectividadFabricante:'pendiente',...over};}
function draft(over={}) {return {sistemaId:'mono',obra:{naturaleza:'Modificación',tipo:'Comercial'},factores:{fuerza:1,iluminacion:1,tomacorrientes:1},cargas:[],balanceFases:{potenciaContratadaKw:10},acometida:{l:10,seccion:10,neutroSeccion:10,peSeccion:10,iccKa:6},circuitos:[circuito()],proteccionGeneral:{termicaExistenteA:40,diferencialExiste:'si',diferencialExistenteA:40,diferencialSensibilidad:300,diferencialTipo:'A',diferencialSelectividad:'S',resistenciaTierraOhm:10,ambienteTierra:'seco',sobretensionesRiesgo:'no'},...over};}
let d=draft();
let st=T.comprobarSelectividadTermicas(d);
assert('sin tabla fabricante -> pendiente',st.estado==='pendiente',JSON.stringify(st));
d.circuitos[0].selectividadFabricante='total'; st=T.comprobarSelectividadTermicas(d);
assert('tabla fabricante total -> cumple',st.estado==='cumple',JSON.stringify(st));
d=draft(); d.circuitos=[circuito({equipo:'cargador_ve',modoCargaVe:'3',rdcdd6mA:true,diferencialIndividualVe:'si'})];
let sr=T.comprobarSelectividadDiferenciales(d);
assert('300mA S sobre 30mA -> selectivo',sr.estado==='cumple',JSON.stringify(sr));
d.proteccionGeneral.diferencialSensibilidad=30; sr=T.comprobarSelectividadDiferenciales(d);
assert('30mA sobre 30mA -> no selectivo',sr.estado==='no_selectiva',JSON.stringify(sr));
d=draft(); d.proteccionGeneral.diferencialSelectividad='instantaneo'; d.circuitos=[circuito({equipo:'cargador_ve',modoCargaVe:'3',rdcdd6mA:true,diferencialIndividualVe:'si'})]; sr=T.comprobarSelectividadDiferenciales(d);
assert('300mA instantáneo -> no selectivo',sr.estado==='no_selectiva',JSON.stringify(sr));
const mig=T.migrarEsquemaDB({schemaVersion:8,trabajos:[{proteccionGeneral:{},circuitos:[{}]}],presupuestos:[],settings:{},seq:{}}).db;
assert('migración v9 no inventa selectividad',mig.schemaVersion===14 && mig.trabajos[0].proteccionGeneral.diferencialSelectividad==='instantaneo' && mig.trabajos[0].circuitos[0].selectividadFabricante==='pendiente');
assert('motor 2.6.0',T.MOTOR_VERSION==='3.0.0',T.MOTOR_VERSION);
assert('pack 1.6',T.NORMATIVE_PACK.version==='2.2-cierre-profesional',T.NORMATIVE_PACK.version);
process.exitCode=failed?1:0;
