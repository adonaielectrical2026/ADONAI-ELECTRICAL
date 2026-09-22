# ADONAI ELECTRICAL — Herramientas Técnicas

App interna de relevamientos, cálculos eléctricos y presupuestos.

## Qué hay en esta carpeta

- **`app-completa.html`** — La app entera en un solo archivo. Doble clic y se abre en el navegador. No necesita internet ni instalar nada.
- **`codigo/`** — La misma app, separada en archivos legibles para editar:
  - `index.html` — estructura de las pantallas
  - `estilos.css` — colores, tipografía, componentes
  - `app.js` — cálculos, wizard, presupuestos, PIN
  - `manifest.json` — datos de instalación (nombre, iconos)
  - `logo.png` — logo de la marca (fondo transparente)
  - `icon-*.png` — iconos para la pantalla de inicio
- **`COMO-INSTALAR.txt`** — guía de instalación en texto plano (mismo contenido que este README).

## Cómo instalarla en el celular

Para que se instale como app (ícono propio, pantalla completa, sin barra del navegador) el celular tiene que abrirla desde una dirección web (`https://`), no desde un archivo suelto.

La app ya está publicada acá:

**https://adonaielectrical.netlify.app**

Ese link lo puede abrir cualquier técnico, sin cuenta y sin contraseña. Pasáselo y que siga los pasos de acá abajo según su celular.

**Android (Chrome)**
1. Abrí el link en Chrome.
2. Menú de los 3 puntos (arriba a la derecha).
3. Tocá "Instalar aplicación" o "Agregar a pantalla principal".
4. Confirmá. Queda el ícono de ADONAI en la pantalla de inicio.

**iPhone / iPad (Safari — tiene que ser Safari, no Chrome)**
1. Abrí el link en Safari.
2. Tocá el botón Compartir (el cuadrado con la flecha para arriba).
3. Bajá y tocá "Agregar a inicio" / "Add to Home Screen".
4. Tocá "Agregar". Queda el ícono en la pantalla de inicio.

## Tablet

Sí, funciona igual que en el celular y se instala con los mismos pasos (Android: Chrome / iPad: Safari). En pantallas grandes la app se muestra centrada, con el ancho de un celular, para que los formularios no queden estirados a lo ancho de toda la tablet.

## En la computadora

Doble clic en `app-completa.html` y se abre en el navegador. Funciona todo: cálculos, relevamientos, presupuestos y el PDF.

También se puede instalar como app de escritorio si en vez del archivo abrís la dirección web del Camino B: en Chrome/Edge aparece un ícono de instalar a la derecha de la barra de direcciones.

## Cómo se publica

El sitio está conectado al repositorio: **cada cambio que llega a `main` se publica solo**, sin hacer nada a mano.

Netlify arma el sitio con las instrucciones de `netlify.toml`: toma el contenido de `codigo/` y le suma `app-completa.html`, para que el archivo único también se pueda descargar desde el sitio.

Si alguna vez hace falta publicar a mano (por ejemplo para probar algo sin pasar por `main`):

```
netlify deploy --prod --build
```

## Dónde se guardan los datos

Todo queda guardado **solo en el dispositivo** donde se usa la app (navegador); no hay servidor ni sincronización. Consecuencias a tener en cuenta:

- Lo que carga un técnico en su celular no se ve en el tuyo.
- Si se borran los datos del navegador, se borran los trabajos guardados.
- El PIN es un bloqueo de pantalla simple: todavía no cifra los datos.

## Importante sobre los cálculos

La app informa cada comprobación como **Verificado**, **Pendiente** o **No cumple** según los datos realmente disponibles. La memoria usa como base el Reglamento de Baja Tensión de UTE y referencias IEC complementarias donde corresponde. El estado técnico global incluye circuitos, protección general, puesta a tierra y evaluación de sobretensiones.

En canalizaciones enterradas se solicita la **resistividad térmica del terreno** y la **profundidad**. Se aplica el factor complementario de IEC 60364-5-52 B.52.16 hasta 0,8 m; fuera de ese alcance la comprobación queda **Pendiente** y requiere cálculo específico.

Para sobretensiones, la app registra la evaluación exigida por UTE cuando sean de temer sobretensiones atmosféricas. Si corresponde SPD, verifica su existencia, propone Tipo 1+2 cuando hay LPS y Tipo 2 en los demás casos como referencia IEC, y exige tierra inferior a 10 Ω para el descargador.

En modificaciones, reparaciones y emergencias la app no supone que la protección existente es correcta: exige relevar la sección real del alimentador, la térmica general, la existencia/corriente del diferencial, la puesta a tierra y la evaluación de sobretensiones. Si falta alguno de esos datos, la memoria no se cierra como verificada.

## Auditoría de circuitos — Paso 6

La memoria valida la alimentación de cada circuito de forma independiente del suministro general. En suministros trifásicos, las cargas importadas no heredan automáticamente tres fases: se crean provisionalmente como 1φ/230 V y quedan **Pendientes** hasta que el técnico confirme 1φ o 3φ. Si hay circuitos monofásicos en un suministro trifásico, la protección general queda **Pendiente** hasta verificar el reparto/balance de fases.

Los puntos de carga de vehículos eléctricos exigen indicar modo de carga y confirmar/proyectar un diferencial individual de hasta 30 mA. La selección propuesta del tipo diferencial considera el modo y la presencia de RDC-DD de 6 mA.

Las tablas B/C del Anexo de cortocircuito se leen literalmente. Cuando la celda necesaria participa de una irregularidad no monótona de la tabla publicada, la app no la corrige por inferencia: deja la Icc **Pendiente** y solicita un valor informado/medido o cálculo específico.

El PDF interno incluye ahora una sección **Causas y pendientes por circuito**, de modo que cada estado pueda auditarse sin volver a abrir el relevamiento.


## Paso 7 — balance de fases
La memoria asigna circuitos monofásicos a fases/conductores, calcula corrientes L1/L2/L3, contrasta el desequilibrio con UTE RBT Cap. II §9 (20 % hasta 50 kW; 15 % por encima) y usa la fase más cargada para el alimentador y la protección general.

## Paso 16 — cierre profesional
La pantalla Resumen incorpora una revisión final de obra. La aplicación no considera un expediente definitivo si quedan circuitos no conformes, verificaciones pendientes, ensayos incompletos o falta identificar al responsable técnico. Es posible emitir borradores, que quedan marcados como tales.

El cierre permite generar por separado Memoria Técnica, Protocolo de Ensayos y Esquema Unifilar, o un Expediente Técnico combinado. También admite firma gráfica opcional y hasta seis anexos fotográficos comprimidos. La firma gráfica es documental y no sustituye una firma digital certificada.
