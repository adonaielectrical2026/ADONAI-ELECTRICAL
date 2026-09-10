# Fotos de componentes para el frente del tablero

Lista de lo que hay que fotografiar y cómo, para que la app pueda armar el
frente del tablero con fotos reales en vez de un dibujo.

Con estas piezas alcanza. El pack de Canva que se usó de referencia tiene más de
mil elementos porque cubre tableros industriales con PLC, contactores y
variadores; para lo que hacemos, son ocho fotos.

## Las piezas

### Imprescindibles — sin estas no se puede armar nada

| # | Pieza | Archivo | Nota |
|---|---|---|---|
| 1 | Térmica bipolar | `termica-2p.jpg` | La que lleva casi todos los circuitos |
| 2 | Térmica tetrapolar | `termica-4p.jpg` | Circuitos trifásicos |
| 3 | Diferencial bipolar | `diferencial-2p.jpg` | Protección general en monofásico |
| 4 | Diferencial tetrapolar | `diferencial-4p.jpg` | Protección general en trifásico |
| 5 | Gabinete abierto, vacío | `gabinete.jpg` | Es el fondo de todo el dibujo |

### Recomendadas — se puede empezar sin ellas, pero suman mucho

| # | Pieza | Archivo | Nota |
|---|---|---|---|
| 6 | Tapa ciega de 1 módulo | `tapa-ciega.jpg` | Tapa los módulos que sobran |
| 7 | Riel DIN | `riel-din.jpg` | Un tramo corto; se repite por software |
| 8 | Bornera | `bornera.jpg` | La fila de abajo del tablero |

**Respetá los nombres de archivo.** Así la app sabe qué es cada cosa sin tener
que preguntarlo.

## Cómo sacarlas

1. **Fondo de color fuerte.** Una cartulina azul o verde. Las llaves son
   blancas, grises o negras, así que contra un color saturado se recortan solas.
   Nada de fondo blanco ni de madera.

2. **De frente, no desde arriba.** La pieza acostada sobre la cartulina y el
   celular perpendicular, justo encima. *La perspectiva es lo único que arruina
   un montaje de fotos*: si una llave se ve en diagonal y la de al lado no, se
   nota al instante. Apoyá el celular en algo para no temblar.

3. **Luz pareja.** A la sombra, o con día nublado. Sin flash directo, que quema
   el plástico blanco y borra el rótulo impreso.

4. **La palanca como se va a mostrar**: cerrada, con la banda roja a la vista.

5. **La distancia no importa.** El script iguala la altura de todas las piezas.
   Las llaves modulares DIN miden todas lo mismo de alto, así que quedan a la
   misma escala aunque cada foto salga distinta.

6. **Limpiá la pieza** antes: una marca de dedo o polvo se ve enorme cuando la
   foto se amplía.

## Sobre el amperaje impreso

Cada térmica tiene su valor impreso en la cara (C16, C20…). Hay dos caminos:

- **Una sola foto por tipo** (lo de la tabla de arriba): la app escribe el valor
  encima. Ocho fotos y listo. Es por donde conviene empezar.
- **Una foto por amperaje**: `termica-2p-16a.jpg`, `termica-2p-20a.jpg`, etc.
  Sale más fiel porque el rótulo es el real, pero son muchas más fotos.

No hace falta decidirlo ahora. Empezá por el primero; si después se quiere el
rótulo real, se agregan fotos sin rehacer nada.

## Procesarlas

Poné las fotos en una carpeta y corré:

```bash
python herramientas/recortar-componentes.py fotos/ recortes/ --alto 600
```

**Ojo con `--alto`:** iguala la altura de todo lo que procesa. Sirve para las
llaves, que miden todas lo mismo, pero **no** para el gabinete ni el riel, que
tienen otro tamaño. Esas dos van aparte, sin `--alto`:

```bash
python herramientas/recortar-componentes.py fotos-llaves/    recortes/ --alto 600
python herramientas/recortar-componentes.py fotos-gabinete/  recortes/
```

Si alguna sale con agujeros —se comió parte de la pieza— subí la tolerancia:

```bash
python herramientas/recortar-componentes.py fotos/ recortes/ --alto 600 --tolerancia 100
```

Y si sigue fallando, es que el fondo se parece demasiado a la pieza: repetí esa
foto con una cartulina de otro color.

## Antes de sacar las ocho

Sacá **una sola**, la térmica bipolar, y pasala por el script. Si el recorte sale
limpio, la técnica de la foto sirve y podés hacer el resto de corrido. Si no,
ajustás una foto en vez de ocho.

## Las marcas

Fotos que sacás vos, de componentes que comprás vos y vas a instalar: se usan sin
problema en las presentaciones a tus clientes. Es tu material.

Lo que no se puede es meter en la app las imágenes de un pack comprado a un
tercero — esas son el producto de otro.
