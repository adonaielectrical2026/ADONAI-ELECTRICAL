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

Las tablas de ampacidad, factores de corrección, secciones mínimas y curvas sugeridas figuran en la app como "Pendiente de verificación". Son valores de referencia y hay que confirmarlos contra el Reglamento de Baja Tensión de UTE y las normas UNIT/IEC vigentes antes de usarlos en una instalación real.
