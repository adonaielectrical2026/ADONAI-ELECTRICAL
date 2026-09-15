"""
Prepara las fotos de los gabinetes abiertos para que las use la app.

Las cuatro fotos de herramientas/fotos-gabinetes/ son los tableros vacíos, sin
tapa interna, con los rieles a la vista. La app las usa de fondo para la vista
"interior abierto" y necesita saber dos cosas de cada una: dónde está cada riel
y cuánto mide un módulo DIN sobre la imagen.

El riel se encuentra solo: la chapa galvanizada tira al azul —el canal azul le
gana al rojo por más de una decena de puntos— y el plástico blanco de la caja,
con sombras y todo, queda neutro. Con eso alcanza para separarlos.

El tamaño del módulo NO se saca de la foto sino de la tapa interna de la misma
medida, que ya está procesada en codigo/img/ con sus ventanas caladas. La foto
se escala hasta que un módulo mida lo mismo en las dos imágenes. Así las llaves
salen del mismo tamaño en la vista abierta y en la cerrada: son dos fotos de
productos distintos, y sin esto el tablero "cambia de tamaño" al pasar de una
hoja del PDF a la otra.

La fila de 12 módulos se centra sobre el riel. Sobra riel a los costados, que
es como queda un tablero de verdad.

Uso:
    python herramientas/preparar-gabinetes.py

Reescribe codigo/img/wall-{12,24,36,48}.webp y actualiza codigo/img/medidas.json
sin tocar el resto de las piezas.
"""

import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Falta Pillow. Instalalo con:  python -m pip install Pillow')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'herramientas', 'fotos-gabinetes')
DESTINO = os.path.join(RAIZ, 'codigo', 'img')

ANCHO_GABINETE = 1400
CALIDAD = 92
MODULOS_POR_FILA = 12

GABINETES = {
    'wall-12': {'tipo': 'gabinete', 'filas': 1, 'modulos': 12},
    'wall-24': {'tipo': 'gabinete', 'filas': 2, 'modulos': 24},
    'wall-36': {'tipo': 'gabinete', 'filas': 3, 'modulos': 36},
    'wall-48': {'tipo': 'gabinete', 'filas': 4, 'modulos': 48},
}

# Cuánto le tiene que ganar el azul al rojo para que el píxel sea riel.
AZUL_MINIMO = 12
# Un riel DIN mide 35 mm de alto y un módulo 17,5: la mitad justo. Midiendo el
# alto del riel sobre la foto sale la escala sin tener que suponer nada.
ALTO_RIEL_EN_MODULOS = 2.0
# Pedazos de riel separados por menos que esto son el mismo riel: la detección
# lo corta en dos donde el labio inferior queda en sombra.
JUNTAR = 45


def es_riel(p):
    r, g, b, a = p
    return a > 128 and (b - r) >= AZUL_MINIMO and 20 < (r + g + b) / 3 < 225


def buscar_rieles(im):
    """Devuelve [{y0, y1, cy, x0, x1}] de arriba hacia abajo."""
    px = im.load()
    W, H = im.size
    por_fila = [sum(1 for x in range(W) if es_riel(px[x, y])) for y in range(H)]
    techo = max(por_fila)
    if not techo:
        return []
    bandas, act = [], None
    for y, n in enumerate(por_fila):
        if n >= techo * 0.30:
            act = [y, y] if act is None else [act[0], y]
        elif act is not None:
            bandas.append(act)
            act = None
    if act:
        bandas.append(act)
    unidas = []
    for b in bandas:
        if unidas and b[0] - unidas[-1][1] <= JUNTAR:
            unidas[-1][1] = b[1]
        else:
            unidas.append(list(b))
    unidas = [b for b in unidas if b[1] - b[0] >= 25]
    rieles = []
    for y0, y1 in unidas:
        xs = [x for x in range(W) if any(es_riel(px[x, y]) for y in range(y0, y1 + 1))]
        rieles.append({'y0': y0, 'y1': y1, 'cy': (y0 + y1) // 2, 'x0': min(xs), 'x1': max(xs)})
    return rieles


def modulo_de_la_tapa(medidas, nombre):
    tapa = medidas.get(nombre + '-cover') or {}
    return tapa.get('modulo'), tapa.get('h')


def procesar(nombre, ficha, medidas):
    ruta = os.path.join(ORIGEN, nombre + '.webp')
    if not os.path.exists(ruta):
        print('  %-10s FALTA la foto en %s' % (nombre, ORIGEN))
        return None

    im = Image.open(ruta).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    im = im.resize((ANCHO_GABINETE, round(im.height * ANCHO_GABINETE / im.width)), Image.LANCZOS)

    rieles = buscar_rieles(im)
    if len(rieles) != ficha['filas']:
        print('  %-10s AVISO: encontré %d riel(es) y esperaba %d' % (nombre, len(rieles), ficha['filas']))
        if not rieles:
            return None

    alto_riel = sorted(r['y1'] - r['y0'] for r in rieles)[len(rieles) // 2]
    modulo_foto = alto_riel / ALTO_RIEL_EN_MODULOS

    modulo_tapa, _ = modulo_de_la_tapa(medidas, nombre)
    escala = (modulo_tapa / modulo_foto) if modulo_tapa else 1.0
    modulo = modulo_tapa or modulo_foto

    ancho = max(1, round(im.width * escala))
    alto = max(1, round(im.height * escala))
    im = im.resize((ancho, alto), Image.LANCZOS)

    # Lienzo del ancho de siempre, con la foto centrada. Todas las piezas miden
    # 1400 de ancho, así la vista abierta y la cerrada salen impresas iguales:
    # el PDF las escala por el ancho, y un módulo termina midiendo lo mismo en
    # las dos hojas. De alto no se rellena nada, para no dejar aire muerto.
    lienzo = Image.new('RGBA', (ANCHO_GABINETE, alto), (0, 0, 0, 0))
    dx = (ANCHO_GABINETE - ancho) // 2
    lienzo.alpha_composite(im, (dx, 0))

    # La fila de 12 módulos va centrada sobre el riel. El centro horizontal es
    # el mismo para todas las filas: si cada una se centrara sola, las llaves
    # de una fila no quedarían alineadas con las de la de abajo.
    centros = [((r['x0'] + r['x1']) / 2) * escala + dx for r in rieles]
    centro = sum(centros) / len(centros)
    media_fila = MODULOS_POR_FILA * modulo / 2
    x0 = int(round(centro - media_fila))
    x1 = int(round(centro + media_fila))
    ys = [int(round(r['cy'] * escala)) for r in rieles]

    sobra = min(x0 - (rieles[0]['x0'] * escala + dx), (rieles[0]['x1'] * escala + dx) - x1)
    if sobra < -2:
        print('  %-10s AVISO: la fila de 12 módulos no entra en el riel' % nombre)

    salida = os.path.join(DESTINO, nombre + '.webp')
    lienzo.save(salida, format='WEBP', quality=CALIDAD, method=6)

    ficha = dict(ficha)
    ficha.update({'w': lienzo.width, 'h': lienzo.height, 'modulo': round(modulo, 2),
                  'rieles': {'x0': x0, 'x1': x1, 'y': ys}})
    print('  %-10s %4d x %-4d %6.0f KB   %d riel(es), módulo %.1f px (foto %.1f, x%.3f)'
          % (nombre, lienzo.width, lienzo.height, os.path.getsize(salida) / 1024,
             len(ys), modulo, modulo_foto, escala))
    return ficha


def main():
    ruta_medidas = os.path.join(DESTINO, 'medidas.json')
    with open(ruta_medidas, encoding='utf-8') as f:
        medidas = json.load(f)

    for nombre, ficha in sorted(GABINETES.items()):
        nueva = procesar(nombre, ficha, medidas)
        if nueva:
            medidas[nombre] = nueva

    with open(ruta_medidas, 'w', encoding='utf-8') as f:
        json.dump(medidas, f, indent=2, ensure_ascii=False, sort_keys=True)
    print('medidas.json actualizado')


if __name__ == '__main__':
    main()
