const fs=require('fs');
let src=fs.readFileSync(__dirname+'/../codigo/app.js','utf8');
let fail=0; function ok(n,c,d=''){ if(c) console.log('PASS',n,d); else {console.log('FAIL',n,d); fail++;} }
ok('motor 3.0.0',/const MOTOR_VERSION = '3\.0\.0'/.test(src));
ok('pack cierre profesional',/version: '2\.2-cierre-profesional'/.test(src));
ok('schema v14',/const DB_SCHEMA_VERSION = 14/.test(src));
ok('revisión final implementada',/function evaluarCierreProfesional\(/.test(src));
ok('documentos separados',/generarDocumentoCierre\('memoria'\)/.test(src)&&/generarDocumentoCierre\('protocolo'\)/.test(src)&&/generarDocumentoCierre\('unifilar'\)/.test(src)&&/generarDocumentoCierre\('expediente'\)/.test(src));
ok('duplicado reinicia cierre',/copia\.cierreProfesional = \{ responsableNombre:''/.test(src));
process.exit(fail?1:0);
