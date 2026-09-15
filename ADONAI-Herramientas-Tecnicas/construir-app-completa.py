"""
Arma app-completa.html a partir de la carpeta codigo/.

app-completa.html es la misma app en un solo archivo: se abre con doble clic,
sin servidor y sin internet. Para eso hay que meter adentro del HTML todo lo
que en codigo/ vive en archivos sueltos (CSS, JavaScript, logo, iconos).

Se corre desde la carpeta del proyecto, cada vez que se toca algo en codigo/:

    python construir-app-completa.py
"""

import base64
import io
import json
import os
import sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
CODIGO = os.path.join(RAIZ, 'codigo')
SALIDA = os.path.join(RAIZ, 'app-completa.html')


def texto(nombre):
    with io.open(os.path.join(CODIGO, nombre), encoding='utf-8') as f:
        return f.read()


def data_uri(nombre, mime):
    with open(os.path.join(CODIGO, nombre), 'rb') as f:
        return 'data:' + mime + ';base64,' + base64.b64encode(f.read()).decode('ascii')


def reemplazar_una(html, viejo, nuevo, que):
    """Reemplaza exigiendo que haya exactamente una coincidencia.

    Si alguien renombra o mueve algo en index.html, es preferible que el build
    corte con un error a que genere en silencio un app-completa.html al que le
    falte el CSS o el logo.
    """
    n = html.count(viejo)
    if n != 1:
        raise SystemExit('ERROR: se esperaba 1 coincidencia de %s en index.html, hay %d' % (que, n))
    return html.replace(viejo, nuevo)


def main():
    html = texto('index.html')

    # manifest.json va como data URI para que la app siga siendo instalable
    # incluso servida desde un archivo suelto.
    manifest = texto('manifest.json')
    # Los iconos que el manifest referencia por nombre también se incrustan.
    for icono in ('icon-192.png', 'icon-512.png'):
        manifest = manifest.replace('"' + icono + '"', '"' + data_uri(icono, 'image/png') + '"')
    from urllib.parse import quote
    html = reemplazar_una(
        html,
        '<link rel="manifest" href="manifest.json">',
        '<link rel="manifest" href="data:application/manifest+json,' + quote(manifest, safe='') + '">',
        'el link del manifest')

    html = reemplazar_una(
        html,
        '<link rel="icon" href="favicon.ico" sizes="any">',
        '<link rel="icon" href="' + data_uri('favicon.ico', 'image/x-icon') + '" sizes="any">',
        'el link del favicon')

    html = reemplazar_una(
        html,
        '<link rel="apple-touch-icon" href="icon-180.png">',
        '<link rel="apple-touch-icon" href="' + data_uri('icon-180.png', 'image/png') + '">',
        'el link del icono de iPhone')

    html = reemplazar_una(
        html,
        '<link rel="stylesheet" href="estilos.css">',
        '<style>\n' + texto('estilos.css') + '\n</style>',
        'el link de estilos.css')

    # El logo lo carga el JavaScript por su nombre de archivo: adentro del
    # archivo único tiene que pasar a ser un data URI.
    app_js = texto('app.js')
    app_js = app_js.replace("const LOGO_SRC = 'logo.png';",
                            "const LOGO_SRC = '" + data_uri('logo.png', 'image/png') + "';")
    if 'LOGO_SRC = \'data:image/png' not in app_js:
        raise SystemExit('ERROR: no se pudo incrustar el logo (cambió la línea de LOGO_SRC en app.js)')

    # Las imágenes del tablero van incrustadas: en el archivo único no hay
    # servidor al cual pedírselas, y sin ellas el dibujo no se puede armar.
    carpeta_img = os.path.join(CODIGO, 'img')
    imagenes = {}
    for nombre in sorted(os.listdir(carpeta_img)):
        if nombre.endswith('.webp'):
            imagenes[nombre[:-5]] = data_uri(os.path.join('img', nombre), 'image/webp')
    with io.open(os.path.join(carpeta_img, 'medidas.json'), encoding='utf-8') as f:
        medidas = f.read()
    incrustadas = ('<script>window.__TAB_IMG=' + json.dumps(imagenes) +
                   ';window.__TAB_MEDIDAS=' + medidas + ';</script>')

    scripts = (
        incrustadas +
        '<script>\n' + texto('jspdf.umd.min.js') + '\n</script>\n'
        '<script>\n' + texto('jspdf.plugin.autotable.min.js') + '\n</script>\n'
        '<script>\n' + app_js + '\n</script>'
    )
    html = reemplazar_una(
        html,
        '<script src="jspdf.umd.min.js"></script>\n'
        '<script src="jspdf.plugin.autotable.min.js"></script>\n'
        '<script src="app.js"></script>',
        scripts,
        'los tres <script src>')

    with io.open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('app-completa.html generado — %.1f KB' % (os.path.getsize(SALIDA) / 1024.0))


if __name__ == '__main__':
    sys.exit(main())
