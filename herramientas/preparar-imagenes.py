"""
Prepara las imágenes del tablero para que las use la app.

Las imágenes originales del paquete de recursos pesan unos 29 MB en total: son
PNG de 1254 px con mucho aire alrededor. Así no sirven — la app tiene que abrir
rápido en un celular y encima entrar entera en app-completa.html.

Este script las deja listas:

  1. Recorta el aire sobrante.
  2. Las lleva a la medida en que se van a mostrar.
  3. Las guarda en WebP, que para este tipo de imagen pesa una décima parte que
     un PNG sin perder calidad visible.

El recorte se hace distinto según el tipo:

  - Los componentes se recortan al cuerpo sólido, ignorando la sombra suave que
    traen. Si se dejara la sombra, al ponerlos uno al lado del otro sobre el
    riel quedarían separados y desalineados.
  - Los gabinetes y las tapas conservan su sombra: son el fondo de la escena y
    la sombra es lo que los despega del papel.

Además, a las tapas internas se les calan las ventanas: se les pone transparencia
donde está el hueco por el que asoman las llaves. La tapa pasa así a ser una capa
que se apoya encima de los dispositivos, y el plástico blanco tapa las borneras —
que es como se ve un tablero terminado.

Uso:
    python herramientas/preparar-imagenes.py <carpeta-o-zip-de-origen>

Deja el resultado en codigo/img/ y escribe codigo/img/medidas.json con el
tamaño final de cada pieza.
"""

import io
import json
import os
import sys
import zipfile

try:
    from PIL import Image
except ImportError:
    sys.exit('Falta Pillow. Instalalo con:  python -m pip install Pillow')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'codigo', 'img')

# Alto al que se llevan los dispositivos modulares. Todos miden lo mismo de alto
# en la realidad, así que se unifican acá y después la app sólo decide el ancho
# según cuántos módulos ocupa cada uno.
ALTO_MODULAR = 520
# Ancho al que se llevan gabinetes y tapas.
ANCHO_GABINETE = 1400
CALIDAD = 92

# Qué es cada archivo del paquete y cómo hay que tratarlo.
#   modulos: ancho en módulos DIN (None = no va sobre el riel)
PIEZAS = {
    'thermal-1p':        {'tipo': 'modular', 'modulos': 1},
    'thermal-2p':        {'tipo': 'modular', 'modulos': 2},
    'thermal-4p':        {'tipo': 'modular', 'modulos': 4},
    'rcd-2p':            {'tipo': 'modular', 'modulos': 2},
    'rcd-4p':            {'tipo': 'modular', 'modulos': 4},
    'blind-module':      {'tipo': 'modular', 'modulos': 1},
    'surge-3p':          {'tipo': 'modular', 'modulos': 3},
    'timer-din':         {'tipo': 'modular', 'modulos': 2},
    'modular-contactor': {'tipo': 'modular', 'modulos': 3},
    'motor-guard':       {'tipo': 'modular', 'modulos': 3},
    'power-contactor':   {'tipo': 'modular', 'modulos': 3},
    'overload-relay':    {'tipo': 'modular', 'modulos': 3},
    'terminal-earth':    {'tipo': 'bornera', 'modulos': None},
    'terminal-feed':     {'tipo': 'bornera', 'modulos': None},
    'terminal-neutral':  {'tipo': 'bornera', 'modulos': None},
    'buttons-start-stop': {'tipo': 'puerta', 'modulos': None},
    'wall-12':           {'tipo': 'gabinete', 'filas': 1, 'modulos': 12},
    'wall-24':           {'tipo': 'gabinete', 'filas': 2, 'modulos': 24},
    'wall-36':           {'tipo': 'gabinete', 'filas': 3, 'modulos': 36},
    'wall-48':           {'tipo': 'gabinete', 'filas': 4, 'modulos': 48},
    'control-metal':     {'tipo': 'gabinete', 'filas': 2, 'modulos': 24},
    'wall-12-cover':     {'tipo': 'tapa', 'de': 'wall-12', 'filas': 1, 'modulos': 12},
    'wall-24-cover':     {'tipo': 'tapa', 'de': 'wall-24', 'filas': 2, 'modulos': 24},
    'wall-36-cover':     {'tipo': 'tapa', 'de': 'wall-36', 'filas': 3, 'modulos': 36},
    'wall-48-cover':     {'tipo': 'tapa', 'de': 'wall-48', 'filas': 4, 'modulos': 48},
    # La puerta del gabinete metálico es ciega: no tiene ventanas que calar.
    'control-metal-door': {'tipo': 'puerta-cerrada', 'de': 'control-metal'},
    'adonai-logo-transparente': {'tipo': 'logo'},
    'adonai-logo-y-nombre':     {'tipo': 'logo'},
}


def recortar(im, solido):
    """Recorta al contenido. Con `solido`, ignora la sombra suave."""
    alfa = im.getchannel('A')
    if solido:
        alfa = alfa.point(lambda v: 255 if v > 200 else 0)
    caja = alfa.getbbox()
    return im.crop(caja) if caja else im


def borde_ventana(px, W, H, cx, cy):
    """Crece desde un punto interior hasta topar con el blanco de la tapa."""
    def blanco(p):
        r, g, b, a = p
        return a > 200 and min(r, g, b) > 186
    x0 = cx
    while x0 > 1 and not blanco(px[x0 - 1, cy]):
        x0 -= 1
    x1 = cx
    while x1 < W - 2 and not blanco(px[x1 + 1, cy]):
        x1 += 1
    xm = (x0 + x1) // 2
    y0 = cy
    while y0 > 1 and not blanco(px[xm, y0 - 1]):
        y0 -= 1
    y1 = cy
    while y1 < H - 2 and not blanco(px[xm, y1 + 1]):
        y1 += 1
    return [x0, y0, x1, y1]


def calar_ventanas(im, filas):
    """Encuentra las ventanas de una tapa y las deja transparentes.

    La puerta abierta ocupa la franja izquierda y es oscura como las ventanas,
    así que sólo se miran los huecos que empiezan pasada esa zona.
    """
    W, H = im.size
    px = im.load()

    def hueco(p):
        r, g, b, a = p
        return a > 200 and (r + g + b) / 3 < 175

    # centro vertical de cada ventana: filas donde hay un hueco ancho a la derecha
    marcadas = {}
    for y in range(H):
        tramos, ini = [], None
        for x in range(W):
            if hueco(px[x, y]):
                if ini is None:
                    ini = x
            elif ini is not None:
                tramos.append((ini, x - 1))
                ini = None
        if ini is not None:
            tramos.append((ini, W - 1))
        cand = [t for t in tramos if t[0] > W * 0.28 and (t[1] - t[0]) > W * 0.28]
        if cand:
            marcadas[y] = max(cand, key=lambda t: t[1] - t[0])

    bandas, act = [], None
    for y in range(H):
        if y in marcadas:
            act = [y, y] if act is None else [act[0], y]
        elif act is not None:
            if act[1] - act[0] >= 25:
                bandas.append(tuple(act))
            act = None
    if act and act[1] - act[0] >= 25:
        bandas.append(tuple(act))
    bandas.sort(key=lambda b: b[1] - b[0], reverse=True)
    bandas = sorted(bandas[:filas])
    if len(bandas) != filas:
        return im, []

    ventanas = []
    for y0, y1 in bandas:
        cy = (y0 + y1) // 2
        x0, x1 = marcadas[cy]
        ventanas.append(borde_ventana(px, W, H, (x0 + x1) // 2, cy))

    # Todas las ventanas de una tapa son iguales: se unifica la medida para que
    # las llaves queden alineadas de fila a fila.
    ax0 = min(v[0] for v in ventanas)
    ax1 = max(v[2] for v in ventanas)
    alto = max(v[3] - v[1] for v in ventanas)
    centros = [round((v[1] + v[3]) / 2) for v in ventanas]
    ventanas = [[ax0, c - alto // 2, ax1, c - alto // 2 + alto] for c in centros]

    alfa = im.getchannel('A')
    for x0, y0, x1, y1 in ventanas:
        alfa.paste(0, (x0, y0, x1 + 1, y1 + 1))
    im.putalpha(alfa)
    return im, ventanas


def leer_originales(origen):
    """Devuelve {nombre_sin_extension: bytes} desde una carpeta o un zip."""
    imagenes = {}
    if os.path.isfile(origen) and origen.lower().endswith('.zip'):
        with zipfile.ZipFile(origen) as z:
            for info in z.infolist():
                if info.is_dir() or not info.filename.lower().endswith('.png'):
                    continue
                nombre = os.path.splitext(os.path.basename(info.filename))[0]
                imagenes[nombre] = z.read(info)
    else:
        for raiz, _, archivos in os.walk(origen):
            for a in archivos:
                if a.lower().endswith(('.png', '.webp')):
                    nombre = os.path.splitext(a)[0]
                    with open(os.path.join(raiz, a), 'rb') as f:
                        imagenes[nombre] = f.read()
    return imagenes


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__.strip().splitlines()[-3].strip())
    origen = sys.argv[1]
    if not os.path.exists(origen):
        sys.exit('No existe ' + origen)

    originales = leer_originales(origen)
    if not originales:
        sys.exit('No se encontró ninguna imagen en ' + origen)

    os.makedirs(DESTINO, exist_ok=True)
    medidas = {}
    total = 0
    desconocidas = []

    for nombre, datos in sorted(originales.items()):
        ficha = PIEZAS.get(nombre)
        if not ficha:
            desconocidas.append(nombre)
            continue
        im = Image.open(io.BytesIO(datos)).convert('RGBA')
        tipo = ficha['tipo']

        if tipo in ('modular', 'bornera', 'puerta'):
            im = recortar(im, solido=True)
            if tipo == 'modular':
                # Alto igual para todos y ancho exacto según los módulos: así
                # encajan en la grilla del riel sin huecos ni superposiciones.
                ancho = int(round(ALTO_MODULAR * ficha['modulos'] / 4.86))
                im = im.resize((ancho, ALTO_MODULAR), Image.LANCZOS)
            else:
                im = im.resize((int(round(im.width * ALTO_MODULAR / im.height)), ALTO_MODULAR), Image.LANCZOS)
        else:
            im = recortar(im, solido=False)
            ancho = ANCHO_GABINETE if tipo in ('gabinete', 'tapa', 'puerta-cerrada') else 512
            im = im.resize((ancho, max(1, round(im.height * ancho / im.width))), Image.LANCZOS)

        ventanas = []
        if tipo == 'tapa':
            im, ventanas = calar_ventanas(im, ficha['filas'])
            if not ventanas:
                print('  AVISO: no se pudieron ubicar las ventanas de ' + nombre)

        salida = os.path.join(DESTINO, nombre + '.webp')
        im.save(salida, format='WEBP', quality=CALIDAD, method=6)
        peso = os.path.getsize(salida)
        total += peso
        ficha = dict(ficha)
        ficha.update({'w': im.width, 'h': im.height})
        if ventanas:
            ficha['ventanas'] = ventanas
            ficha['modulo'] = round((ventanas[0][2] - ventanas[0][0]) / 12.0, 2)
        medidas[nombre] = ficha
        extra = ('  %d ventana(s), módulo %.1f px' % (len(ventanas), ficha['modulo'])) if ventanas else ''
        print('  %-26s %5d x %-5d %6.0f KB%s' % (nombre, im.width, im.height, peso / 1024, extra))

    with open(os.path.join(DESTINO, 'medidas.json'), 'w', encoding='utf-8') as f:
        json.dump(medidas, f, ensure_ascii=False, indent=2, sort_keys=True)

    print('\n%d piezas en codigo/img/ — %.1f MB en total' % (len(medidas), total / 1048576))
    if desconocidas:
        print('\nSin ficha en PIEZAS (no se procesaron): ' + ', '.join(desconocidas))
    faltan = [n for n in PIEZAS if n not in medidas]
    if faltan:
        print('Declaradas pero no encontradas en el origen: ' + ', '.join(sorted(faltan)))


if __name__ == '__main__':
    main()
