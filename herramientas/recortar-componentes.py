"""
Recorta el fondo de las fotos de componentes y las deja listas para el tablero.

Pensado para fotos sacadas con el celular sobre un fondo de color plano y
saturado (azul o verde). Las llaves son blancas, grises o negras, así que
contra un fondo de color fuerte se separan sin ambiguedad y el recorte sale
limpio sin herramientas pagas.

Qué hace con cada foto:
  1. Detecta el color del fondo mirando los bordes de la imagen.
  2. Borra todo lo que se parezca a ese color.
  3. Limpia el "derrame" de color que el fondo deja en los bordes del objeto.
  4. Recorta la imagen al objeto.
  5. Opcionalmente lleva todas las piezas al mismo alto en pixeles.

El paso 5 importa: todas las llaves modulares DIN miden lo mismo de alto
(el frente normalizado). Igualando el alto, quedan todas a la misma escala
aunque cada foto se haya sacado desde distinta distancia.

Uso:
    python herramientas/recortar-componentes.py fotos/ recortes/
    python herramientas/recortar-componentes.py fotos/ recortes/ --alto 600
    python herramientas/recortar-componentes.py fotos/ recortes/ --tolerancia 90

Si alguna foto sale con agujeros (se comió parte de la llave), subí la
tolerancia con cuidado o repetí la foto con un fondo más contrastado.
"""

import argparse
import os
import sys

try:
    from PIL import Image, ImageChops, ImageFilter, ImageStat
except ImportError:
    sys.exit('Falta Pillow. Instalalo con:  python -m pip install Pillow')

EXTENSIONES = ('.jpg', '.jpeg', '.png', '.webp', '.bmp')


def color_de_fondo(img, banda=12):
    """Color promedio del marco exterior de la foto: ahí siempre hay fondo."""
    w, h = img.size
    banda = max(2, min(banda, w // 4, h // 4))
    trozos = [
        img.crop((0, 0, w, banda)),                 # arriba
        img.crop((0, h - banda, w, h)),             # abajo
        img.crop((0, 0, banda, h)),                 # izquierda
        img.crop((w - banda, 0, w, h)),             # derecha
    ]
    suma = [0.0, 0.0, 0.0]
    for t in trozos:
        media = ImageStat.Stat(t).mean
        for i in range(3):
            suma[i] += media[i]
    return tuple(int(v / len(trozos)) for v in suma)


def mascara_objeto(img, fondo, tolerancia):
    """Blanco donde hay objeto, negro donde hay fondo.

    Se mide la distancia al color de fondo canal por canal y se toma la
    mayor. Todo se hace con operaciones de Pillow (en C), así que una foto
    de celular a resolución completa se procesa en un instante.
    """
    plano = Image.new('RGB', img.size, fondo)
    dif = ImageChops.difference(img, plano)
    r, g, b = dif.split()
    dist = ImageChops.lighter(ImageChops.lighter(r, g), b)
    # Umbral duro y despues un suavizado mínimo, para que el borde no quede
    # dentado pero tampoco se coma un pixel de la llave.
    mascara = dist.point(lambda v: 255 if v > tolerancia else 0)
    return mascara.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.6))


def quitar_derrame(img, fondo):
    """Baja el tinte del fondo que queda impregnado en el contorno.

    Sin esto, un fondo azul deja un halo azulado alrededor de la llave que
    se nota apenas la pegás sobre otro fondo.
    """
    canales = list(img.split()[:3])
    dominante = max(range(3), key=lambda i: fondo[i])
    # si el fondo no tiene un color claramente dominante no hay derrame que corregir
    otros = [fondo[i] for i in range(3) if i != dominante]
    if fondo[dominante] < 60 or fondo[dominante] < max(otros) * 1.25:
        return img
    resto = [canales[i] for i in range(3) if i != dominante]
    tope = ImageChops.lighter(resto[0], resto[1])
    canales[dominante] = ImageChops.darker(canales[dominante], tope)
    return Image.merge('RGB', canales)


def procesar(ruta, salida, tolerancia, alto):
    img = Image.open(ruta).convert('RGB')
    fondo = color_de_fondo(img)
    mascara = mascara_objeto(img, fondo, tolerancia)

    caja = mascara.getbbox()
    if not caja:
        return None, 'no se encontró ningún objeto (¿el fondo es del mismo color que la pieza?)'

    limpia = quitar_derrame(img, fondo)
    recorte = limpia.crop(caja)
    recorte.putalpha(mascara.crop(caja))

    if alto:
        ancho = max(1, round(recorte.width * alto / recorte.height))
        recorte = recorte.resize((ancho, alto), Image.LANCZOS)

    recorte.save(salida)
    return recorte.size, None


def main():
    ap = argparse.ArgumentParser(description='Recorta el fondo de las fotos de componentes.')
    ap.add_argument('entrada', help='carpeta con las fotos originales')
    ap.add_argument('salida', help='carpeta donde dejar los PNG recortados')
    ap.add_argument('--tolerancia', type=int, default=70,
                    help='cuánto se tolera que un pixel se parezca al fondo (0-255, por defecto 70). '
                         'Más alto = borra más fondo, con riesgo de comerse la pieza.')
    ap.add_argument('--alto', type=int, default=0,
                    help='alto final en pixeles, igual para todas las piezas. '
                         'Recomendado para las llaves modulares, que miden todas lo mismo de alto.')
    args = ap.parse_args()

    if not os.path.isdir(args.entrada):
        sys.exit('No existe la carpeta ' + args.entrada)
    os.makedirs(args.salida, exist_ok=True)

    fotos = sorted(f for f in os.listdir(args.entrada) if f.lower().endswith(EXTENSIONES))
    if not fotos:
        sys.exit('No hay fotos en ' + args.entrada)

    ok = 0
    for nombre in fotos:
        destino = os.path.join(args.salida, os.path.splitext(nombre)[0] + '.png')
        try:
            medida, error = procesar(os.path.join(args.entrada, nombre), destino,
                                     args.tolerancia, args.alto)
        except Exception as e:
            medida, error = None, str(e)
        if error:
            print('  FALLO  %-34s %s' % (nombre, error))
        else:
            print('  ok     %-34s %d x %d px' % (nombre, medida[0], medida[1]))
            ok += 1

    print('\n%d de %d fotos recortadas en %s' % (ok, len(fotos), args.salida))
    if ok < len(fotos):
        print('Para las que fallaron: repetí la foto sobre un fondo de color más fuerte, '
              'o probá con --tolerancia más alta.')


if __name__ == '__main__':
    main()
