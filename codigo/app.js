(function () {
  'use strict';

  // Aplica el tema guardado (o el del sistema) lo antes posible, para evitar
  // un parpadeo del tema incorrecto antes de que init() termine de correr.
  (function applyThemeEarly() {
    var mode = 'light';
    try {
      var stored = localStorage.getItem('adonai_ht_theme');
      if (stored === 'light' || stored === 'dark') mode = stored;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) mode = 'dark';
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', mode);
  })();

  // El logo vive en logo.png (mismo PNG transparente de la marca).
  const LOGO_SRC = 'logo.png';

  /* ============================================================
     MOTOR DE CÁLCULO (portado y verificado desde el .jsx original)
     ============================================================ */
  const SQRT3 = Math.sqrt(3);
  // Lo que ocupa una bornera de riel puesta de pie, en módulos. Se usa tanto
  // para elegir la medida del gabinete como para dibujarlo.
  const MODULOS_BORNERA = 2;

  const CATEGORIAS = [
    { id: 'iluminacion', label: 'Iluminación', cosPhiDefault: 1, uso: 'iluminacion' },
    { id: 'tomacorrientes', label: 'Tomacorrientes de uso general', cosPhiDefault: 1, uso: 'tomacorrientes' },
    { id: 'cargaFija', label: 'Carga fija especial', cosPhiDefault: 0.8, uso: 'fuerza' },
  ];
  // Cargas típicas de una casa, para no tener que buscar la potencia cada vez.
  //
  // El valor que se usa es el de PLACA (el máximo que declara el fabricante), no
  // el consumo promedio. Un aire de 9000 BTU consume unos 750 W enfriando, pero
  // su placa dice 1300 W: el circuito hay que dimensionarlo por la placa, si no
  // queda corto en el arranque y a plena carga.
  //
  // Marcados con "James" van los que se pudieron verificar contra las fichas de
  // esa marca, que es la de referencia en plaza. El resto son valores de diseño
  // habituales — sirven para dimensionar, pero si el cliente ya compró el
  // aparato conviene cargar la potencia real de su placa.
  const CARGAS_PRESETS = [
    // --- Iluminación ---
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Lámpara LED 9W', w: 9, cosPhi: 1 },
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Lámpara LED 12W', w: 12, cosPhi: 1 },
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Plafón / panel LED 18W', w: 18, cosPhi: 1 },
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Tubo LED 18W', w: 18, cosPhi: 1 },
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Reflector LED 20W', w: 20, cosPhi: 1 },
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Reflector LED 50W', w: 50, cosPhi: 1 },
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Reflector LED 100W', w: 100, cosPhi: 1 },
    { cat: 'iluminacion', grupo: 'Iluminación', nombre: 'Lámpara incandescente 60W', w: 60, cosPhi: 1 },

    // --- Tomacorrientes ---
    { cat: 'tomacorrientes', grupo: 'Tomacorrientes', nombre: 'Tomacorriente de uso general', w: 200, cosPhi: 1 },
    { cat: 'tomacorrientes', grupo: 'Tomacorrientes', nombre: 'Tomacorriente para equipo fijo', w: 500, cosPhi: 1 },

    // --- Climatización ---
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Aire acondicionado 9000 BTU', w: 1300, cosPhi: 0.9, fuente: 'James' },
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Aire acondicionado 12000 BTU', w: 1650, cosPhi: 0.9, fuente: 'James' },
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Aire acondicionado 18000 BTU', w: 2500, cosPhi: 0.9 },
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Aire acondicionado 24000 BTU', w: 3300, cosPhi: 0.9 },
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Estufa eléctrica / caloventor', w: 2000, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Ventilador de techo', w: 70, cosPhi: 0.8 },

    // --- Agua caliente ---
    { cat: 'cargaFija', grupo: 'Agua caliente', nombre: 'Calefón / termotanque 20-30 L', w: 1500, cosPhi: 1, fuente: 'James' },
    { cat: 'cargaFija', grupo: 'Agua caliente', nombre: 'Termotanque 60-80 L', w: 2000, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Agua caliente', nombre: 'Ducha eléctrica instantánea', w: 5500, cosPhi: 1 },

    // --- Cocina ---
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Heladera', w: 350, cosPhi: 0.85 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Heladera grande / freezer', w: 600, cosPhi: 0.85 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Cocina eléctrica (anafe y horno)', w: 5000, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Anafe eléctrico / vitrocerámica', w: 3500, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Horno eléctrico', w: 2500, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Microondas', w: 1400, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Lavavajillas', w: 1800, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Extractor de cocina', w: 200, cosPhi: 0.8 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Pava eléctrica', w: 2000, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Cocina', nombre: 'Cafetera', w: 1000, cosPhi: 1 },

    // --- Lavado ---
    { cat: 'cargaFija', grupo: 'Lavado', nombre: 'Lavarropas', w: 2000, cosPhi: 0.9 },
    { cat: 'cargaFija', grupo: 'Lavado', nombre: 'Lavarropas sin calentar agua', w: 600, cosPhi: 0.9 },
    { cat: 'cargaFija', grupo: 'Lavado', nombre: 'Lavasecarropas', w: 2200, cosPhi: 0.9 },
    { cat: 'cargaFija', grupo: 'Lavado', nombre: 'Secarropas por calor', w: 2500, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Lavado', nombre: 'Secarropas centrífugo', w: 400, cosPhi: 0.85 },
    { cat: 'cargaFija', grupo: 'Lavado', nombre: 'Plancha', w: 1600, cosPhi: 1 },

    // --- Otros ---
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Televisor LED', w: 120, cosPhi: 0.95 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Computadora de escritorio', w: 300, cosPhi: 0.95 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Bomba de agua 1/2 HP', w: 550, cosPhi: 0.8 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Bomba de agua 1 HP', w: 1100, cosPhi: 0.8 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Bomba de piscina', w: 750, cosPhi: 0.8 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Portón eléctrico', w: 400, cosPhi: 0.8 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Cargador de auto eléctrico', w: 7400, cosPhi: 1 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Motor / otro', w: 750, cosPhi: 0.8 },
  ];
  // Uso del circuito. Define la sección mínima reglamentaria, la curva de la
  // térmica y la caída de tensión admisible, así que tiene que poder elegirse:
  // una térmica de iluminación va en curva B y una de fuerza en C.
  const USOS = [
    { id: 'iluminacion', label: 'Iluminación' },
    { id: 'tomacorrientes', label: 'Tomacorrientes' },
    { id: 'fuerza', label: 'Fuerza / carga fija' },
  ];
  // Polos de la llave de un circuito.
  //
  // En monofásico hay dos formas de hacerlo y las dos se usan:
  //   - Bipolar: la llave corta fase y neutro. El neutro del circuito va a la
  //     llave, así que no hace falta bornera de neutro.
  //   - Unipolar: la llave corta sólo la fase y el neutro va a una bornera.
  //     Es lo habitual en los circuitos de iluminación.
  //
  // Alcanza con que UNA llave sea unipolar para que el tablero necesite bornera
  // de neutro. La de tierra va siempre, sea cual sea el caso.
  function polosPorDefecto(circuito) {
    if (circuito.fases !== 1) return 4;
    return circuito.uso === 'iluminacion' ? 1 : 2;
  }
  function polosDe(circuito) {
    const p = Number(circuito.polos);
    if (p === 1 || p === 2 || p === 3 || p === 4) return p;
    return polosPorDefecto(circuito);
  }
  function opcionesPolos(circuito) {
    return circuito.fases === 1
      ? [{ v: 1, label: 'Unipolar — corta la fase' }, { v: 2, label: 'Bipolar — corta fase y neutro' }]
      : [{ v: 3, label: 'Tripolar — corta las fases' }, { v: 4, label: 'Tetrapolar — fases y neutro' }];
  }
  // El tablero lleva bornera de neutro sólo si alguna llave deja el neutro
  // afuera; la de tierra va siempre.
  function necesitaBorneraNeutro(circuitos, sistema) {
    const general = (sistema && sistema.fases === 1) ? 2 : 4;
    if (general === 2 || general === 4) { /* la general siempre corta el neutro */ }
    return (circuitos || []).some((c) => polosDe(c) === 1 || polosDe(c) === 3);
  }

  const SISTEMAS = {
    mono: { id: 'mono', label: 'Monofásico 230V', v: 230, fases: 1 },
    tri_it: { id: 'tri_it', label: 'Trifásico 230V (sistema IT)', v: 230, fases: 3 },
    tri_tt: { id: 'tri_tt', label: 'Trifásico 400V (sistema TT)', v: 400, fases: 3 },
  };
  const MONO_STEPS = [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5];
  const TRI_STEPS = [6, 8, 10, 12, 15, 20, 25, 30, 35, 40];

  // Corriente maxima admisible, RBT-UTE Capitulo II - Anexo (ed. junio 2001).
  // c2 = corriente con 2 conductores cargados (circuito monofasico: fase + neutro).
  // c3 = corriente con 3 conductores cargados (circuito trifasico, neutro no se cuenta).
  const TABLAS_UTE = {
    // "Dentro de conductos" (Anexo S5, Tablas X-XIII). embutido/vista/enterrado-bajo-tubo
    // usan esta categoria: fisicamente son conductores dentro de un cano, solo cambia el
    // entorno (pared, a la vista, bajo tierra). No confundir con Tablas XV/XVI, que son
    // para cable armado enterrado DIRECTO (sin cano) - un producto distinto que esta app
    // no contempla como opcion separada.
    conducto: {
      cobre: {
        pvc: [
          { s: 0.75, c2: 12, c3: 10 }, { s: 1, c2: 14, c3: 13 }, { s: 1.5, c2: 19, c3: 16 },
          { s: 2, c2: 22, c3: 20 }, { s: 2.5, c2: 25, c3: 22 }, { s: 4, c2: 34, c3: 30 },
          { s: 6, c2: 43, c3: 38 }, { s: 10, c2: 60, c3: 53 }, { s: 16, c2: 81, c3: 72 },
          { s: 25, c2: 107, c3: 94 }, { s: 35, c2: 133, c3: 118 }, { s: 50, c2: 160, c3: 142 },
          { s: 70, c2: 204, c3: 181 }, { s: 95, c2: 246, c3: 219 }, { s: 120, c2: 285, c3: 253 },
          { s: 150, c2: 328, c3: 292 }, { s: 185, c2: 375, c3: 332 }, { s: 240, c2: 440, c3: 391 },
          { s: 300, c2: 506, c3: 449 }, { s: 400, c2: 605, c3: 538 },
        ],
        xlpe: [
          { s: 0.75, c2: 16, c3: 14 }, { s: 1, c2: 19, c3: 17 }, { s: 1.5, c2: 24, c3: 21 },
          { s: 2, c2: 29, c3: 26 }, { s: 2.5, c2: 32, c3: 28 }, { s: 4, c2: 44, c3: 38 },
          { s: 6, c2: 56, c3: 50 }, { s: 10, c2: 77, c3: 69 }, { s: 16, c2: 104, c3: 93 },
          { s: 25, c2: 138, c3: 122 }, { s: 35, c2: 171, c3: 150 }, { s: 50, c2: 206, c3: 182 },
          { s: 70, c2: 264, c3: 231 }, { s: 95, c2: 318, c3: 280 }, { s: 120, c2: 368, c3: 324 },
          { s: 150, c2: 428, c3: 382 }, { s: 185, c2: 489, c3: 434 }, { s: 240, c2: 572, c3: 512 },
          { s: 300, c2: 661, c3: 588 }, { s: 400, c2: 791, c3: 704 },
        ],
      },
      aluminio: {
        pvc: [
          { s: 0.75, c2: 9, c3: 8 }, { s: 1, c2: 11, c3: 10 }, { s: 1.5, c2: 14, c3: 13 },
          { s: 2, c2: 17, c3: 15 }, { s: 2.5, c2: 20, c3: 18 }, { s: 4, c2: 26, c3: 24 },
          { s: 6, c2: 34, c3: 31 }, { s: 10, c2: 47, c3: 42 }, { s: 16, c2: 63, c3: 56 },
          { s: 25, c2: 83, c3: 75 }, { s: 35, c2: 103, c3: 92 }, { s: 50, c2: 128, c3: 115 },
          { s: 70, c2: 158, c3: 142 }, { s: 95, c2: 192, c3: 172 }, { s: 120, c2: 222, c3: 199 },
          { s: 150, c2: 255, c3: 228 }, { s: 185, c2: 291, c3: 260 }, { s: 240, c2: 342, c3: 306 },
          { s: 300, c2: 394, c3: 352 }, { s: 400, c2: 471, c3: 422 },
        ],
        xlpe: [
          { s: 0.75, c2: 12, c3: 11 }, { s: 1, c2: 15, c3: 13 }, { s: 1.5, c2: 19, c3: 17 },
          { s: 2, c2: 22, c3: 20 }, { s: 2.5, c2: 26, c3: 23 }, { s: 4, c2: 35, c3: 31 },
          { s: 6, c2: 45, c3: 40 }, { s: 10, c2: 61, c3: 55 }, { s: 16, c2: 82, c3: 74 },
          { s: 25, c2: 109, c3: 97 }, { s: 35, c2: 134, c3: 120 }, { s: 50, c2: 168, c3: 150 },
          { s: 70, c2: 207, c3: 185 }, { s: 95, c2: 251, c3: 224 }, { s: 120, c2: 290, c3: 259 },
          { s: 150, c2: 334, c3: 298 }, { s: 185, c2: 381, c3: 340 }, { s: 240, c2: 448, c3: 400 },
          { s: 300, c2: 515, c3: 460 }, { s: 400, c2: 616, c3: 550 },
        ],
      },
    },
    // "Al aire bajo techo" (Anexo S4, Tablas VI-IX). Columnas usadas: "2 unipolar" (c2) y
    // "3 unipolar" (c3) - la app compra conductores unipolares sueltos, no cable multipolar.
    aire: {
      cobre: {
        pvc: [
          { s: 0.75, c2: 15, c3: 11 }, { s: 1, c2: 18, c3: 14 }, { s: 1.5, c2: 23, c3: 18 },
          { s: 2, c2: 28, c3: 22 }, { s: 2.5, c2: 32, c3: 25 }, { s: 4, c2: 43, c3: 35 },
          { s: 6, c2: 56, c3: 45 }, { s: 10, c2: 78, c3: 64 }, { s: 16, c2: 105, c3: 87 },
          { s: 25, c2: 139, c3: 117 }, { s: 35, c2: 172, c3: 145 }, { s: 50, c2: 208, c3: 177 },
          { s: 70, c2: 266, c3: 229 }, { s: 95, c2: 322, c3: 280 }, { s: 120, c2: 373, c3: 325 },
          { s: 150, c2: 431, c3: 377 }, { s: 185, c2: 491, c3: 431 }, { s: 240, c2: 576, c3: 511 },
          { s: 300, c2: 667, c3: 589 }, { s: 400, c2: 799, c3: 704 }, { s: 500, c2: 920, c3: 802 },
          { s: 630, c2: 1065, c3: 907 },
        ],
        xlpe: [
          { s: 0.75, c2: 18, c3: 14 }, { s: 1, c2: 21, c3: 16 }, { s: 1.5, c2: 28, c3: 21 },
          { s: 2, c2: 33, c3: 26 }, { s: 2.5, c2: 39, c3: 30 }, { s: 4, c2: 52, c3: 42 },
          { s: 6, c2: 67, c3: 54 }, { s: 10, c2: 93, c3: 79 }, { s: 16, c2: 126, c3: 105 },
          { s: 25, c2: 167, c3: 140 }, { s: 35, c2: 208, c3: 176 }, { s: 50, c2: 252, c3: 215 },
          { s: 70, c2: 322, c3: 279 }, { s: 95, c2: 392, c3: 341 }, { s: 120, c2: 454, c3: 397 },
          { s: 150, c2: 524, c3: 461 }, { s: 185, c2: 598, c3: 529 }, { s: 240, c2: 706, c3: 628 },
          { s: 300, c2: 814, c3: 727 }, { s: 400, c2: 978, c3: 873 }, { s: 500, c2: 1126, c3: 996 },
          { s: 630, c2: 1304, c3: 1121 },
        ],
      },
      aluminio: {
        pvc: [
          { s: 0.75, c2: 11, c3: 9 }, { s: 1, c2: 13, c3: 11 }, { s: 1.5, c2: 17, c3: 14 },
          { s: 2, c2: 20, c3: 17 }, { s: 2.5, c2: 23, c3: 19 }, { s: 4, c2: 31, c3: 26 },
          { s: 6, c2: 41, c3: 34 }, { s: 10, c2: 57, c3: 48 }, { s: 16, c2: 78, c3: 66 },
          { s: 25, c2: 104, c3: 89 }, { s: 35, c2: 130, c3: 111 }, { s: 50, c2: 164, c3: 140 },
          { s: 70, c2: 204, c3: 176 }, { s: 95, c2: 249, c3: 215 }, { s: 120, c2: 290, c3: 251 },
          { s: 150, c2: 336, c3: 291 }, { s: 185, c2: 385, c3: 334 }, { s: 240, c2: 456, c3: 397 },
          { s: 300, c2: 528, c3: 461 }, { s: 400, c2: 637, c3: 558 },
        ],
        xlpe: [
          { s: 0.75, c2: 13, c3: 10 }, { s: 1, c2: 15, c3: 12 }, { s: 1.5, c2: 20, c3: 16 },
          { s: 2, c2: 24, c3: 20 }, { s: 2.5, c2: 28, c3: 23 }, { s: 4, c2: 38, c3: 31 },
          { s: 6, c2: 49, c3: 41 }, { s: 10, c2: 69, c3: 58 }, { s: 16, c2: 94, c3: 80 },
          { s: 25, c2: 126, c3: 107 }, { s: 35, c2: 157, c3: 135 }, { s: 50, c2: 198, c3: 171 },
          { s: 70, c2: 246, c3: 214 }, { s: 95, c2: 301, c3: 263 }, { s: 120, c2: 350, c3: 308 },
          { s: 150, c2: 405, c3: 357 }, { s: 185, c2: 465, c3: 411 }, { s: 240, c2: 551, c3: 490 },
          { s: 300, c2: 638, c3: 569 }, { s: 400, c2: 770, c3: 690 },
        ],
      },
    },
  };
  // embutido/vista/enterrado (bajo tubo) son fisicamente "dentro de un cano" -> misma
  // categoria de tabla; solo "aire" (al aire libre/bandeja) usa las tablas de aire.
  const CATEGORIA_METODO = {
    embutido: 'conducto', amurado_pvc: 'conducto', amurado_galvanizado: 'conducto', enterrado: 'conducto',
    bandeja: 'aire', aire: 'aire',
  };
  const RHO_COBRE = 0.0225;
  const FACTOR_RESIST_ALUMINIO = 1.68;
  // Factor de correccion por temperatura ambiente, RBT-UTE Anexo Tabla XIV, por aislacion.
  const TEMP_FACTORS_UTE = {
    pvc: [
      { t: 10, f: 1.15 }, { t: 15, f: 1.10 }, { t: 20, f: 1.05 }, { t: 25, f: 1.00 },
      { t: 30, f: 0.94 }, { t: 35, f: 0.88 }, { t: 40, f: 0.82 }, { t: 45, f: 0.75 },
      { t: 50, f: 0.67 }, { t: 55, f: 0.58 }, { t: 60, f: 0.47 },
    ],
    xlpe: [
      { t: 10, f: 1.11 }, { t: 15, f: 1.08 }, { t: 20, f: 1.04 }, { t: 25, f: 1.00 },
      { t: 30, f: 0.96 }, { t: 35, f: 0.92 }, { t: 40, f: 0.88 }, { t: 45, f: 0.84 },
      { t: 50, f: 0.79 }, { t: 55, f: 0.73 }, { t: 60, f: 0.68 }, { t: 65, f: 0.63 },
      { t: 70, f: 0.56 }, { t: 75, f: 0.48 }, { t: 80, f: 0.39 },
    ],
  };
  const METODO_LABEL = {
    embutido: 'Embutido en pared',
    amurado_pvc: 'Amurado — caño PVC rígido',
    amurado_galvanizado: 'Amurado — caño de acero galvanizado',
    bandeja: 'Bandeja',
    aire: 'Aire libre',
    enterrado: 'Enterrado bajo tierra',
  };
  const BREAKER_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  const CURVA_SUGERIDA = { iluminacion: 'B', tomacorrientes: 'C', fuerza: 'C' };
  // Secciones minimas por resistencia mecanica, RBT-UTE Anexo S9: derivacion para
  // alumbrado 0,75mm2; derivacion para tomacorrientes "en salto" 1,5mm2 (mas conservador
  // que 1mm2 para un solo tomacorriente); derivacion para otros usos 1mm2.
  const MINIMOS_REGLAMENTARIOS = { iluminacion: 0.75, tomacorrientes: 1.5, fuerza: 1 };
  const CAIDA_MAX_DEFAULT = { iluminacion: 3, tomacorrientes: 5, fuerza: 5 };
  const DIAMETRO_CANO = [{ s: 2.5, d: 16 }, { s: 6, d: 20 }, { s: 10, d: 25 }, { s: 16, d: 32 }, { s: 95, d: 40 }];

  /* ============================================================
     PAQUETE NORMATIVO — versiona los valores de referencia del motor
     de cálculo, separados del código, con estado de verificación
     explícito. No se edita a mano: reemplazar este objeto entero
     es "instalar" un paquete nuevo.
     ============================================================ */
  const MOTOR_VERSION = '1.0.0';
  const NORMATIVE_PACK = {
    id: 'rbt-ute-cap-ii-anexo-2001',
    nombre: 'Reglamento de Baja Tensión UTE — Capítulo II y Anexo',
    fuente: 'RBT-UTE, Capítulo II "Instalaciones Interiores o Receptoras" y su Anexo (Tablas I a XVI), edición N.5 / Junio 2001, ute.com.uy',
    version: '0.2-borrador',
    estado: 'pendiente', // 'pendiente' | 'verificado' | 'personalizado'
    vigenteDesde: null,
    actualizadoEl: '2026-09-03',
    notas: 'Ampacidades (Tablas VI-XIII), sección mínima por resistencia mecánica (Anexo §9) y factor de corrección por temperatura (Tabla XIV) tomados directamente del reglamento. Dos supuestos de mapeo quedan pendientes de confirmar con un electricista matriculado: (1) "Enterrado bajo tubo" se calcula con las tablas de "dentro de conductos" (X-XIII), no con las Tablas XV/XVI de cable armado enterrado directo, porque el reglamento no define una tabla propia para conducto enterrado y XV/XVI son para un producto distinto (cable armado sin caño). (2) El factor de agrupamiento de circuitos "al aire" se dejó en 1,00 (sin reducción) porque el Anexo no da una tabla de agrupamiento para ese método — solo para preensamblado (Tabla II) y dentro de conductos (§5.1, ya aplicado).',
  };
  const ESTADO_PACK_LABEL = { pendiente: 'Pendiente de verificación', verificado: 'Verificado', personalizado: 'Personalizado (no verificado)' };
  const ESTADO_PACK_CLASS = { pendiente: 'status-pending', verificado: 'status-approved', personalizado: 'status-review' };

  function fmt(n, dec) {
    if (dec === undefined) dec = 2;
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return Number(n).toLocaleString('es-UY', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function money(n) {
    if (n === null || n === undefined || Number.isNaN(n)) n = 0;
    return '$ ' + Math.round(n).toLocaleString('es-UY');
  }
  function nearestStepUp(value, steps) {
    for (const s of steps) if (s >= value) return s;
    return steps[steps.length - 1];
  }
  function getTempFactorUTE(aislacion, temp) {
    const tabla = TEMP_FACTORS_UTE[aislacion] || TEMP_FACTORS_UTE.pvc;
    let closest = tabla[0];
    for (const tf of tabla) if (Math.abs(tf.t - temp) < Math.abs(closest.t - temp)) closest = tf;
    return closest.f;
  }
  // RBT-UTE Anexo §5.1: recién por encima de 3 conductores cargados en el mismo caño
  // hay reducción (4 a 7 = 0.90, más de 7 = 0.70). Sin tabla equivalente para "al aire".
  function getGroupFactorUTE(categoria, nConductores) {
    if (categoria !== 'conducto') return 1;
    if (nConductores <= 3) return 1;
    if (nConductores <= 7) return 0.90;
    return 0.70;
  }
  function tablaAmpacidad(categoria, material, aislacion) {
    const cat = TABLAS_UTE[categoria] || TABLAS_UTE.conducto;
    const mat = cat[material === 'aluminio' ? 'aluminio' : 'cobre'];
    return mat[aislacion === 'xlpe' ? 'xlpe' : 'pvc'];
  }
  function nearestBreaker(ib, iz) {
    for (const b of BREAKER_RATINGS) if (b >= ib && b <= iz) return b;
    return null;
  }
  function diametroCano(seccion) {
    for (const row of DIAMETRO_CANO) if (seccion <= row.s) return row.d;
    return 40;
  }
  // Ancho de bandeja portacable según cantidad de cables que lleva (criterio del usuario,
  // no una tabla normativa).
  const ANCHO_BANDEJA = [{ n: 6, ancho: 150 }, { n: 10, ancho: 200 }, { n: Infinity, ancho: 250 }];
  function anchoBandeja(nCables) {
    for (const row of ANCHO_BANDEJA) if (nCables <= row.n) return row.ancho;
    return ANCHO_BANDEJA[ANCHO_BANDEJA.length - 1].ancho;
  }

  function calcularPotencia(cargas, sistema, factores) {
    let potenciaInstalada = 0, pDemandTotal = 0, qDemandTotal = 0;
    for (const c of cargas) {
      const pTotal = (Number(c.potenciaW) || 0) * (Number(c.cantidad) || 0);
      potenciaInstalada += pTotal;
      const factor = factores[c.categoria] ?? 1;
      const pCalc = pTotal * factor;
      const cosPhi = Number(c.cosPhi) || 1;
      const phi = Math.acos(Math.min(Math.max(cosPhi, 0), 1));
      qDemandTotal += pCalc * Math.tan(phi);
      pDemandTotal += pCalc;
    }
    const sDemandTotal = Math.sqrt(pDemandTotal ** 2 + qDemandTotal ** 2);
    const cosPhiEq = sDemandTotal > 0 ? pDemandTotal / sDemandTotal : 1;
    const v = sistema.v;
    const corriente = sistema.fases === 1 ? sDemandTotal / v : sDemandTotal / (SQRT3 * v);
    const pKw = pDemandTotal / 1000;
    const suministroSugerido = sistema.fases === 1 ? nearestStepUp(pKw, MONO_STEPS) : nearestStepUp(pKw, TRI_STEPS);
    const minimoDiseno = sistema.fases === 1 ? 6.6 : 7.6;
    return { potenciaInstalada, pDemandTotal, qDemandTotal, sDemandTotal, cosPhiEq, corriente, suministroSugerido, minimoDiseno };
  }

  // Núcleo común: dada una corriente de diseño Ib, busca la sección mínima
  // que cumple corriente admisible + caída de tensión + mínimo reglamentario.
  function calcularSeccion(p) {
    const ib = Number(p.ib) || 0;
    const v = Number(p.v) || 230;
    const l = Number(p.l) || 0;
    const cosPhi = Number(p.cosPhi) || 1;
    const fases = p.fases || 1;
    const material = p.material === 'aluminio' ? 'aluminio' : 'cobre';
    const aislacion = p.aislacion === 'xlpe' ? 'xlpe' : 'pvc';
    const categoria = CATEGORIA_METODO[p.metodo] || 'conducto';
    const tabla = tablaAmpacidad(categoria, material, aislacion);
    const tempF = getTempFactorUTE(aislacion, Number(p.tempAmb) || 30);
    // Conductores activos cargados: 2 (fase+neutro monofásico) o 3 (trifásico, el
    // neutro no se cuenta según RBT-UTE Anexo §5.1).
    const conductoresPorCircuito = fases === 1 ? 2 : 3;
    const nConductores = (Number(p.agrupados) || 1) * conductoresPorCircuito;
    const groupF = getGroupFactorUTE(categoria, nConductores);
    const rho = material === 'aluminio' ? RHO_COBRE * FACTOR_RESIST_ALUMINIO : RHO_COBRE;
    const caidaMax = Number(p.caidaMax) || 5;
    const uso = p.uso || 'fuerza';
    const minimo = MINIMOS_REGLAMENTARIOS[uso] ?? 1;
    const curva = CURVA_SUGERIDA[uso] || 'C';

    let seccionCapacidad = null, seccionCaida = null, elegido = null;
    for (const row of tabla) {
      if (row.s < minimo) continue;
      const izBase = fases === 1 ? row.c2 : row.c3;
      const iz = izBase * tempF * groupF;
      if (seccionCapacidad === null && iz >= ib) seccionCapacidad = row.s;
      const dU = fases === 1 ? (2 * rho * l * ib * cosPhi) / row.s : (SQRT3 * rho * l * ib * cosPhi) / row.s;
      const dUPct = (dU / v) * 100;
      if (seccionCaida === null && dUPct <= caidaMax) seccionCaida = row.s;
      // Además de capacidad y caída, tiene que existir una térmica estándar que
      // proteja el conductor (In >= Ib y In <= Iz) — si no hay ninguna en ese rango
      // para esta sección, no sirve como "elegido" aunque la corriente admisible ya
      // alcance; se sigue probando con la sección siguiente.
      if (iz >= ib && dUPct <= caidaMax && elegido === null) {
        const breaker = nearestBreaker(ib, iz);
        if (breaker !== null) elegido = { seccion: row.s, iz, dUPct, breaker };
      }
    }
    if (!elegido) return { apto: false, ib, seccionCapacidad, seccionCaida, minimo, curva };
    return {
      apto: true, ib, seccionCapacidad, seccionCaida, minimo, curva,
      seccionAdoptada: elegido.seccion, iz: elegido.iz, dUPct: elegido.dUPct, breaker: elegido.breaker,
    };
  }

  function ibDesdeInput(p) {
    // p: {datoConocido, potenciaKw, corrienteA, cosPhi, v, fases}
    if (p.datoConocido === 'corriente') return Number(p.corrienteA) || 0;
    const pW = (Number(p.potenciaKw) || 0) * 1000;
    const cosPhi = Number(p.cosPhi) || 1;
    const sVA = cosPhi > 0 ? pW / cosPhi : pW;
    return p.fases === 1 ? sVA / p.v : sVA / (SQRT3 * p.v);
  }

  function calcularCircuito(c) {
    return calcularSeccion({
      ib: c.ib, v: c.v, fases: c.fases, l: c.l, material: c.material, metodo: c.metodo, aislacion: c.aislacion,
      tempAmb: c.tempAmb, agrupados: c.agrupados, cosPhi: c.cosPhi, caidaMax: c.caidaMax, uso: c.uso || 'fuerza',
    });
  }

  // Térmica y diferencial general de toda la instalación (no de un circuito). Solo aplica
  // a instalaciones nuevas: si es una modificación/reparación sobre una instalación
  // existente, esa protección ya está puesta — no corresponde recalcularla.
  function calcularProteccionGeneral(draft) {
    if (!draft || draft.obra.naturaleza !== 'Instalación nueva') return { aplica: false };
    const sistema = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
    const r = calcularPotencia(draft.cargas, sistema, draft.factores);
    // La térmica general se dimensiona con la potencia a solicitar en el trámite ante UTE
    // (el suministro contratado), no con la demanda instantánea calculada.
    const pW = r.suministroSugerido * 1000;
    const ig = sistema.fases === 1 ? pW / sistema.v : pW / (SQRT3 * sistema.v);
    const maxCircuito = Math.max(0, ...(draft.circuitos || []).map((c) => calcularCircuito(c).breaker || 0));
    const termicaIn = BREAKER_RATINGS.find((b) => b >= ig && b > maxCircuito) ?? BREAKER_RATINGS[BREAKER_RATINGS.length - 1];
    // En Uruguay no suelen conseguirse diferenciales de menos de 25A: si la térmica general
    // da 16 o 20A, el diferencial general igual se sugiere en 25A.
    const diferencialIn = Math.max(termicaIn, 25);
    return {
      aplica: true, ig, termicaIn, termicaCurva: 'C', termicaPolos: sistema.fases === 1 ? 2 : 4,
      diferencialIn, diferencialSensibilidad: (draft.proteccionGeneral && draft.proteccionGeneral.diferencialSensibilidad) || 30,
      diferencialTipo: 'AC',
    };
  }

  function importarCargasComoCircuitos(cargas, sistema) {
    return cargas.map((c, i) => {
      const pTotal = (Number(c.potenciaW) || 0) * (Number(c.cantidad) || 0);
      const cosPhi = Number(c.cosPhi) || 1;
      const s = cosPhi > 0 ? pTotal / cosPhi : pTotal;
      const ib = sistema.fases === 1 ? s / sistema.v : s / (SQRT3 * sistema.v);
      const cat = CATEGORIAS.find((cat) => cat.id === c.categoria);
      const uso = cat ? cat.uso : 'fuerza';
      return {
        id: 'imp-' + Date.now() + '-' + i,
        nombre: c.nombre || (cat ? cat.label : 'Circuito'),
        ib: Math.round(ib * 100) / 100,
        v: sistema.v, fases: sistema.fases, l: 15, material: 'cobre', metodo: 'embutido', aislacion: 'pvc',
        tempAmb: 30, agrupados: 1, caidaMax: CAIDA_MAX_DEFAULT[uso] || 5, cosPhi, uso,
      };
    });
  }

  /* ============================================================
     PRECIOS DE REFERENCIA — punto de partida editable desde la app
     (Perfil → Catálogo de precios), NO una lista de precios en vivo.
     Estos son los valores de fábrica: relevados a mano en fivisa.com.uy
     (Uruguay) el 04/09/2026, precio de lista (sin descuento de tarjeta)
     en USD, convertidos a pesos a razón de USD 1 = $ 40,20 (BCU). El
     usuario puede editarlos en cualquier momento; lo que queda acá es
     solo el valor con el que arranca un dispositivo nuevo o un
     "Restablecer precios de fábrica". Cada material sigue siendo 100%
     editable a mano en cada presupuesto además de esto.
     Precio en 0 = no se encontró en Fivisa (ej. bandeja portacable y
     caño de acero galvanizado roscado son productos más industriales;
     conviene cotizarlos con un proveedor especializado).
     ============================================================ */
  function clonePrecios(obj) {
    try { return structuredClone(obj); } catch (e) { return JSON.parse(JSON.stringify(obj)); }
  }
  const DEFAULT_PRECIOS = {
    cableUnipolar: {
      0.75: 11, 1: 14, 1.5: 20, 2: 27, 2.5: 34, 4: 54, 6: 80, 10: 136, 16: 217, 25: 333,
      // 35mm² en adelante: pocos presupuestos los usan y Fivisa no los tiene en su buscador
      // minorista — estimados por extrapolación lineal desde el precio real de 16 y 25mm².
      35: 462, 50: 655, 70: 913, 95: 1236, 120: 1559, 150: 1946, 185: 2398, 240: 3108,
      300: 3882, 400: 5173, 500: 6464, 630: 8142,
    },
    canoCorrugado: { 16: 13, 20: 14, 25: 19, 32: 27, 40: 39 },
    canoPvcRigido: { 16: 74, 20: 84, 25: 112, 32: 158, 40: 222 },
    canoGalvanizado: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0 },
    bandeja: { 150: 0, 200: 0, 250: 0 },
    grampaOmega: 12,
    mensulaBandeja: 135,
    tacoFischer10mm: 3,
    tornilloTuercaTaco10mm: 0,
    tornilloTuerca8mm: 0,
    codoPvcRigido: 31,
    codoGalvanizado: 0,
    codoCajaBandeja: 0,
    // Las térmicas DIN residenciales cotizaron parejo entre 6 y 40A en Fivisa; para 50A+ se
    // aplica un escalón proporcional (no relevado) porque suelen pasar a otro bastidor/marco.
    // La unipolar no está relevada: sale de la bipolar por proporción. Confirmalo.
    termicaUnipolarBase: 166,
    termicaBipolarBase: 277,
    termicaTetrapolarBase: 294,
    cajaOctogonal: 72,
    portalamparas: 45,
    llaveLuzSimple: 140,
    cajaRectangular: 42,
    tomacorriente: 237,
    // Medidas comerciales: gabinetes de pared de 12, 24, 36 y 48 módulos (filas
    // de 12). El de 48 no está relevado — sale de prolongar la recta que forman
    // los otros; confirmalo antes de presupuestar uno.
    tableroPuntos: [{ n: 12, p: 543 }, { n: 24, p: 967 }, { n: 36, p: 1614 }, { n: 48, p: 1890 }],
    // Borneras de riel. No relevadas: cargá el precio real antes de presupuestar.
    borneraTierra: 0,
    borneraNeutro: 0,
    cajaMedidor: 0,
    jabalina: 978,
    canoPvc1pulg3m: 197,
    codoPvc1pulg: 31,
  };
  const DEFAULT_MANO_OBRA = { tarifaHora: 500, horasJornada: 8 };
  const BASE_POR_TIPO = { unipolar: 'termicaUnipolarBase', bipolar: 'termicaBipolarBase',
                          tripolar: 'termicaTetrapolarBase', tetrapolar: 'termicaTetrapolarBase' };
  function precioTermica(tipo, amp, precios) {
    const base = Number(precios[BASE_POR_TIPO[tipo] || 'termicaBipolarBase']) || 0;
    if (amp <= 40) return base;
    if (amp <= 63) return Math.round(base * 1.5);
    return Math.round(base * 2.5);
  }
  // Medida de gabinete que hay que comprar para una cantidad de módulos: la
  // siguiente de la lista. No existe un gabinete de 20 módulos — se compra el de
  // 24 y sobran cuatro.
  function medidaTablero(nModulos, precios) {
    const pts = precios.tableroPuntos;
    for (const pt of pts) if (nModulos <= pt.n) return pt.n;
    return pts[pts.length - 1].n;
  }
  function precioTablero(nModulos, precios) {
    const pts = precios.tableroPuntos;
    for (const pt of pts) if (nModulos <= pt.n) return pt.p;
    // Más grande que el mayor de catálogo: se prolonga el precio por módulo del
    // último tramo.
    const last = pts[pts.length - 1], prev = pts[pts.length - 2] || pts[0];
    const porModulo = last.n === prev.n ? 0 : (last.p - prev.p) / (last.n - prev.n);
    return Math.round(last.p + porModulo * (nModulos - last.n));
  }

  function generarMateriales(circuitos, draft) {
    const precios = DB.settings.precios;
    const mapa = {};
    function add(nombre, unidad, cantidad, precioUnit) {
      const key = nombre;
      if (!mapa[key]) mapa[key] = { id: 'mat-' + key.replace(/\s+/g, '-'), nombre, unidad, cantidad: 0, precioUnit: precioUnit || 0, auto: true };
      mapa[key].cantidad += cantidad;
    }
    circuitos.forEach((c) => {
      const calc = calcularCircuito(c);
      if (!calc.apto) return;
      const conductores = c.fases === 1 ? 2 : 4;
      const largoCable = Math.ceil((Number(c.l) || 0) * conductores * 1.1);
      if (largoCable > 0) add('Cable unipolar ' + fmt(calc.seccionAdoptada, calc.seccionAdoptada < 10 ? 1 : 0).replace(/,00$/, '') + ' mm²', 'm', largoCable, precios.cableUnipolar[calc.seccionAdoptada] || 0);
      const largo = Math.ceil((Number(c.l) || 0) * 1.1);
      if (largo > 0) {
        const d = diametroCano(calc.seccionAdoptada);
        if (c.metodo === 'amurado_pvc') {
          add('Caño PVC rígido ' + d + ' mm', 'm', largo, precios.canoPvcRigido[d] || 0);
          add('Grampa omega', 'un.', largo, precios.grampaOmega);
          // Cantidad en 0: el caño flexible se dobla solo, pero el amurado con caño rígido
          // necesita codos para los cambios de dirección — no hay forma de saber cuántos
          // hacen falta a partir de la longitud, así que se deja lista para cargar a mano.
          add('Codo PVC rígido ' + d + ' mm (cambio de dirección)', 'un.', 0, precios.codoPvcRigido);
        } else if (c.metodo === 'amurado_galvanizado') {
          add('Caño de acero galvanizado ' + d + ' mm', 'm', largo, precios.canoGalvanizado[d] || 0);
          add('Grampa omega', 'un.', largo, precios.grampaOmega);
          add('Codo caño galvanizado ' + d + ' mm (cambio de dirección)', 'un.', 0, precios.codoGalvanizado);
        } else if (c.metodo === 'bandeja') {
          const ancho = anchoBandeja(conductores);
          add('Bandeja portacable ' + ancho + ' mm', 'm', largo, precios.bandeja[ancho] || 0);
          const nMensulas = Math.ceil(largo / 1.5);
          add('Ménsula para bandeja', 'un.', nMensulas, precios.mensulaBandeja);
          add('Taco fischer 10mm', 'un.', nMensulas * 2, precios.tacoFischer10mm);
          add('Tornillo cabeza tuerca para taco 10mm', 'un.', nMensulas * 2, precios.tornilloTuercaTaco10mm);
          add('Tornillo con tuerca 8mm', 'un.', nMensulas * 2, precios.tornilloTuerca8mm);
          add('Codo / caja de pase para bandeja ' + ancho + ' mm (cambio de dirección)', 'un.', 0, precios.codoCajaBandeja);
        } else if (c.metodo !== 'aire') {
          // embutido, enterrado, o metodo viejo/desconocido: caño corrugado (comportamiento por defecto)
          add('Caño corrugado ' + d + ' mm', 'm', largo, precios.canoCorrugado[d] || 0);
        }
        // 'aire' (aire libre): sin canalización
      }
      const tipoTermica = { 1: 'unipolar', 2: 'bipolar', 3: 'tripolar', 4: 'tetrapolar' }[polosDe(c)];
      add('Térmica ' + tipoTermica + ' ' + calc.breaker + 'A curva ' + calc.curva, 'un.', 1, precioTermica(tipoTermica, calc.breaker, precios));
    });
    // Puntos de luz y de toma, según la cantidad cargada en cada carga del relevamiento.
    // Quedan como cualquier otro material: editables a mano si la cantidad real difiere.
    ((draft && draft.cargas) || []).forEach((carga) => {
      const n = Number(carga.cantidad) || 0;
      if (n <= 0) return;
      if (carga.categoria === 'iluminacion') {
        add('Caja de embutir octogonal', 'un.', n, precios.cajaOctogonal);
        add('Portalámparas', 'un.', n, precios.portalamparas);
        add('Llave de luz simple', 'un.', n, precios.llaveLuzSimple);
      } else if (carga.categoria === 'tomacorrientes') {
        add('Caja de embutir rectangular', 'un.', n, precios.cajaRectangular);
        add('Tomacorriente', 'un.', n, precios.tomacorriente);
      }
    });
    if (draft && draft.obra && draft.obra.naturaleza === 'Instalación nueva') {
      // Módulos que ocupa el tablero, no cantidad de llaves: una térmica bipolar
      // ocupa 2 módulos y una tetrapolar 4. Contando llaves, el gabinete salía
      // por la mitad de lo que cuesta.
      const modulosCircuitos = circuitos.reduce((t, c) => t + polosDe(c), 0);
      const sistemaTablero = (draft && SISTEMAS[draft.sistemaId]) || SISTEMAS.tri_tt;
      const modulosGeneral = (sistemaTablero.fases === 1 ? 2 : 4) * 2; // térmica + diferencial generales
      // Las borneras ocupan lugar en el riel como cualquier otra pieza: si no se
      // cuentan, se termina eligiendo un gabinete donde no entran.
      const modulosBorneras = MODULOS_BORNERA * (necesitaBorneraNeutro(circuitos, sistemaTablero) ? 2 : 1);
      const nModulos = modulosCircuitos + modulosGeneral + modulosBorneras;
      const medida = medidaTablero(nModulos, precios);
      add('Tablero eléctrico de ' + medida + ' módulos (' + nModulos + ' ocupados)', 'un.', 1, precioTablero(nModulos, precios));
      add('Bornera de tierra', 'un.', 1, precios.borneraTierra);
      if (necesitaBorneraNeutro(circuitos, sistemaTablero)) add('Bornera de neutro', 'un.', 1, precios.borneraNeutro);
      add('Caja para medidor', 'un.', 1, precios.cajaMedidor);
      add('Jabalina / electrodo de puesta a tierra', 'un.', 1, precios.jabalina);
      add('Caño PVC 1" x 3m (puesta a tierra)', 'un.', 2, precios.canoPvc1pulg3m);
      add('Codo PVC 1" (puesta a tierra)', 'un.', 6, precios.codoPvc1pulg);
    }
    return Object.values(mapa);
  }
  function calcularManoObra(plazoDias) {
    const mo = DB.settings.manoObra;
    return Math.round((Number(plazoDias) || 0) * mo.horasJornada * mo.tarifaHora);
  }

  /* ============================================================
     TABLERO — DIBUJO CON FOTOS

     Arma el frente del tablero pegando las fotos de codigo/img/ sobre un
     canvas, a partir de las llaves que salieron del cálculo. Se dibujan dos
     vistas:

       - "cerrado": el tablero terminado. Las llaves van DETRÁS de la tapa
         interna, que tiene las ventanas caladas, así que asoma sólo la cara
         y las borneras quedan tapadas. Es la vista para mostrarle al cliente.
       - "abierto": el interior, con las llaves sobre el riel, las borneras de
         neutro y tierra, y los conductores.

     Las medidas de cada pieza y las ventanas de cada tapa vienen en
     img/medidas.json, que genera herramientas/preparar-imagenes.py.
     ============================================================ */

  const TAB_IMG = 'img/';

  // Posición del riel dentro de cada gabinete abierto, medida sobre la imagen.
  // A diferencia de las ventanas de las tapas, que se detectan solas, acá la
  // detección automática no es confiable: el interior tiene sombras y molduras
  // que se confunden con el riel. Son cuatro imágenes fijas, así que se miden
  // una vez y se anotan.
  const TAB_RIELES = {
    'wall-12': { x0: 535, x1: 1185, y: [500] },
    'wall-24': { x0: 620, x1: 1230, y: [385, 655] },
    'wall-36': { x0: 605, x1: 1230, y: [295, 535, 775] },
    'wall-48': { x0: 640, x1: 1235, y: [330, 610, 885, 1160] },
  };

  // Proporciones de una llave modular, medidas sobre las propias imágenes.
  const TAB_ALTO_POR_MODULO = 4.86;  // alto = ancho de un módulo x esto
  const TAB_ANCLA = 0.50;            // qué punto de la llave se centra en la ventana
  const TAB_PALANCA = 0.454;         // dónde empieza la palanca

  const MODULOS_POR_FILA = 12;

  let tabMedidas = null;
  const tabImagenes = {};

  // En app-completa.html las imágenes vienen incrustadas en el propio archivo:
  // abierto con doble clic no hay servidor del cual pedirlas.
  function tabIncrustadas() { return window.__TAB_IMG || null; }

  function tabCargarMedidas() {
    if (tabMedidas) return Promise.resolve(tabMedidas);
    if (window.__TAB_MEDIDAS) { tabMedidas = window.__TAB_MEDIDAS; return Promise.resolve(tabMedidas); }
    return fetch(TAB_IMG + 'medidas.json')
      .then((r) => r.json())
      .then((m) => { tabMedidas = m; return m; });
  }

  function tabCargarImagen(nombre) {
    if (tabImagenes[nombre]) return Promise.resolve(tabImagenes[nombre]);
    const inc = tabIncrustadas();
    const src = (inc && inc[nombre]) ? inc[nombre] : TAB_IMG + nombre + '.webp';
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { tabImagenes[nombre] = img; resolve(img); };
      img.onerror = () => reject(new Error('No se pudo cargar ' + nombre));
      img.src = src;
    });
  }

  /* ---------- qué llaves lleva el tablero ---------- */

  function tabDispositivos(draft) {
    if (!draft) return [];
    const sistema = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
    const mono = sistema.fases === 1;
    const items = [];
    const pg = calcularProteccionGeneral(draft);
    if (pg.aplica) {
      items.push({
        img: mono ? 'thermal-2p' : 'thermal-4p', modulos: mono ? 2 : 4,
        cara: pg.termicaCurva + pg.termicaIn, caraChica: null,
        rotulo: 'GENERAL', etiqueta: 'Térmica general',
        detalle: pg.termicaIn + ' A · ' + pg.termicaPolos + 'P · curva ' + pg.termicaCurva,
      });
      items.push({
        img: mono ? 'rcd-2p' : 'rcd-4p', modulos: mono ? 2 : 4,
        cara: pg.diferencialIn + 'A', caraChica: pg.diferencialSensibilidad + 'mA',
        rotulo: 'DIFERENCIAL', etiqueta: 'Diferencial general',
        detalle: pg.diferencialIn + ' A · ' + pg.diferencialSensibilidad + ' mA · tipo ' + pg.diferencialTipo,
      });
    }
    (draft.circuitos || []).forEach((c, i) => {
      const calc = calcularCircuito(c);
      const polos = polosDe(c);
      const IMG_POLOS = { 1: 'thermal-1p', 2: 'thermal-2p', 3: 'thermal-4p', 4: 'thermal-4p' };
      items.push({
        img: IMG_POLOS[polos], modulos: polos,
        cara: calc.apto ? calc.curva + calc.breaker : '?', caraChica: null,
        n: i + 1, etiqueta: c.nombre || ('Circuito ' + (i + 1)),
        detalle: calc.apto
          ? calc.breaker + ' A · curva ' + calc.curva + ' · ' + calc.seccionAdoptada + ' mm²'
          : 'sin protección definida',
        pendiente: !calc.apto,
      });
    });
    return items;
  }

  function tabLayout(draft) {
    const items = tabDispositivos(draft);
    if (!items.length) return null;
    const sistema = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
    // Las borneras van en el riel y ocupan lugar: entran al reparto como una
    // pieza más, si no el gabinete queda chico y no hay dónde ponerlas.
    const barras = [];
    if (necesitaBorneraNeutro(draft.circuitos, sistema)) {
      barras.push({ img: 'terminal-neutral', modulos: MODULOS_BORNERA, barra: 'neutro',
                    etiqueta: 'Bornera de neutro', detalle: 'neutro de los circuitos unipolares' });
    }
    barras.push({ img: 'terminal-earth', modulos: MODULOS_BORNERA, barra: 'tierra',
                  etiqueta: 'Bornera de tierra', detalle: 'puesta a tierra' });
    const conBarras = items.concat(barras);
    const modulos = conBarras.reduce((t, it) => t + it.modulos, 0);
    const medida = medidaTablero(modulos, DB.settings.precios);
    const gabinete = 'wall-' + medida;
    if (!TAB_RIELES[gabinete]) return null;
    // reparto en filas de 12 sin partir una llave entre dos filas
    const filas = [];
    let fila = [], usado = 0;
    conBarras.forEach((it) => {
      if (usado + it.modulos > MODULOS_POR_FILA) { filas.push(fila); fila = []; usado = 0; }
      fila.push(it); usado += it.modulos;
    });
    if (fila.length) filas.push(fila);
    while (filas.length < TAB_RIELES[gabinete].y.length) filas.push([]);
    return { items, barras, filas, gabinete, medida, modulos };
  }

  /* ---------- dibujo ---------- */

  function tabFuente(px, negrita) {
    return (negrita ? '700 ' : '') + Math.max(7, Math.round(px)) + 'px Helvetica, Arial, sans-serif';
  }

  // Escribe el valor en la cara de la llave: pegado al borde izquierdo y
  // centrado en la banda que queda libre arriba de la palanca.
  function tabEtiqueta(ctx, it, x, topLlave, alto, mod, fracArriba) {
    if (!it.cara) return;
    const centro = topLlave + ((fracArriba + TAB_PALANCA) / 2) * alto;
    const xt = x + mod * 0.17;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#303237';
    if (it.caraChica) {
      const h1 = mod * 0.28, h2 = mod * 0.185, sep = mod * 0.07;
      const total = h1 + sep + h2;
      ctx.font = tabFuente(h1, true);
      ctx.textBaseline = 'top';
      ctx.fillText(it.cara, xt, centro - total / 2);
      ctx.font = tabFuente(h2, true);
      ctx.fillStyle = '#63666b';
      ctx.fillText(it.caraChica, xt, centro - total / 2 + h1 + sep);
    } else {
      ctx.font = tabFuente(mod * 0.28, true);
      ctx.textBaseline = 'middle';
      ctx.fillText(it.cara, xt, centro);
    }
  }

  // Una bornera se monta parada sobre el riel: la imagen viene acostada, así
  // que se la gira un cuarto de vuelta.
  function tabDibujarBarra(ctx, img, x, ancho, cy) {
    if (!img) return;
    const largo = ancho * img.width / img.height;
    ctx.save();
    ctx.translate(x + ancho / 2, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, -largo / 2, -ancho / 2, largo, ancho);
    ctx.restore();
  }

  // Nombre corto para el rótulo: los circuitos suelen llamarse "Living — 2
  // luces, 2 tomas" y en el ancho de una llave sólo entra la primera parte.
  function tabNombreCorto(it) {
    if (it.rotulo) return it.rotulo;
    if (it.barra) return it.barra === 'neutro' ? 'NEUTRO' : 'TIERRA';
    const etiqueta = String(it.etiqueta || '');
    const corte = etiqueta.split(/\s+[—–-]\s+/)[0].trim();
    return (corte || etiqueta).toUpperCase();
  }

  // Franja de rótulos sobre las llaves, como la etiqueta que se pega en el
  // tablero terminado. Incluye las generales.
  function tabRotulos(ctx, rotulos, mod) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = tabFuente(mod * 0.24, true);
    rotulos.forEach((r) => {
      const texto = tabNombreCorto(r.it);
      if (!texto) return;
      const maxAncho = r.w - mod * 0.12;
      let mostrar = texto;
      while (mostrar.length > 1 && ctx.measureText(mostrar).width > maxAncho) {
        mostrar = mostrar.slice(0, -1);
      }
      if (mostrar !== texto) mostrar = mostrar.slice(0, -1) + '…';
      const y = r.cy - r.alto / 2 - mod * 0.16;
      ctx.fillStyle = '#5a5e66';
      ctx.fillText(mostrar, r.x + r.w / 2, y);
    });
  }

  function tabPiezasNecesarias(layout, vista) {
    const set = {};
    layout.items.concat(layout.barras).forEach((it) => { set[it.img] = true; });
    set['blind-module'] = true;
    if (vista === 'cerrado') set[layout.gabinete + '-cover'] = true;
    else set[layout.gabinete] = true;
    set['adonai-logo-y-nombre'] = true;
    return Object.keys(set);
  }

  /**
   * Dibuja el tablero y devuelve el canvas.
   * vista: 'cerrado' (con tapa interna) o 'abierto' (interior y conductores)
   */
  async function tabDibujar(draft, vista, datos) {
    const layout = tabLayout(draft);
    if (!layout) return null;
    await tabCargarMedidas();
    await Promise.all(tabPiezasNecesarias(layout, vista).map(tabCargarImagen));

    const esCerrado = vista === 'cerrado';
    const baseNombre = esCerrado ? layout.gabinete + '-cover' : layout.gabinete;
    const base = tabImagenes[baseNombre];
    const ficha = tabMedidas[baseNombre] || {};

    const CAB = 86;  // alto del cartel de cabecera
    const cv = document.createElement('canvas');
    cv.width = base.width;
    cv.height = base.height + CAB;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#eef1f5';
    ctx.fillRect(0, 0, cv.width, cv.height);

    // filas donde van las llaves
    let ranuras;
    if (esCerrado) {
      ranuras = (ficha.ventanas || []).map((v) => ({ x0: v[0], x1: v[2], cy: (v[1] + v[3]) / 2, alto: v[3] - v[1] }));
    } else {
      const g = TAB_RIELES[layout.gabinete];
      ranuras = g.y.map((cy) => ({ x0: g.x0, x1: g.x1, cy, alto: 0 }));
    }
    if (!ranuras.length) return null;
    const mod = (ranuras[0].x1 - ranuras[0].x0) / MODULOS_POR_FILA;
    const altoLlave = mod * TAB_ALTO_POR_MODULO;

    // En la vista cerrada primero van las llaves y encima la tapa; en la
    // abierta, el gabinete primero y las llaves sobre el riel.
    if (!esCerrado) ctx.drawImage(base, 0, CAB);

    const puestos = [];
    const barrasPuestas = [];
    const rotulos = [];
    ranuras.forEach((r, fi) => {
      const fila = layout.filas[fi] || [];
      if (esCerrado) {
        // fondo del hueco, para que no se vea el blanco del lienzo
        ctx.fillStyle = '#36383c';
        ctx.fillRect(r.x0, r.cy - r.alto / 2 + CAB, r.x1 - r.x0, r.alto);
      }
      let x = r.x0;
      const top = r.cy - TAB_ANCLA * altoLlave + CAB;
      const fracArriba = esCerrado ? TAB_ANCLA - (r.alto / 2) / altoLlave : 0;
      fila.forEach((it) => {
        const w = it.modulos * mod;
        if (it.barra) {
          // la bornera va parada sobre el riel, como se monta de verdad
          tabDibujarBarra(ctx, tabImagenes[it.img], x, w, r.cy + CAB);
          barrasPuestas.push({ it, x, w, cy: r.cy + CAB });
        } else {
          ctx.drawImage(tabImagenes[it.img], x, top, w, altoLlave);
          tabEtiqueta(ctx, it, x, top, altoLlave, mod, fracArriba);
          puestos.push({ it, x, w, cy: r.cy + CAB, fila: fi });
        }
        rotulos.push({ it, x, w, cy: r.cy + CAB, alto: r.alto });
        x += w;
      });
      // Los módulos que sobran se tapan, salvo los dos primeros de la última
      // fila con lugar, que se reservan para las borneras de neutro y tierra.
      const libresFila = MODULOS_POR_FILA - fila.reduce((t, it) => t + it.modulos, 0);
      for (let k = 0; k < libresFila; k++) {
        ctx.drawImage(tabImagenes['blind-module'], x, top, mod, altoLlave);
        x += mod;
      }
    });

    if (!esCerrado) tabConductores(ctx, ranuras, puestos, mod, altoLlave, CAB, layout, barrasPuestas);
    if (esCerrado) {
      ctx.drawImage(base, 0, CAB);
      // Los rótulos van encima de la tapa: es donde se pega la etiqueta en un
      // tablero armado, y así se lee de qué es cada llave sin abrirlo.
      tabRotulos(ctx, rotulos, mod);
    }

    tabCabecera(ctx, cv.width, CAB, layout, vista, datos);
    return cv;
  }

  function tabCabecera(ctx, ancho, alto, layout, vista, datos) {
    datos = datos || {};
    const w = Math.min(ancho * 0.62, 760);
    ctx.fillStyle = '#1f2430';
    ctx.beginPath();
    const r = 10;
    ctx.moveTo(24 + r, 10); ctx.lineTo(24 + w - r, 10);
    ctx.quadraticCurveTo(24 + w, 10, 24 + w, 10 + r); ctx.lineTo(24 + w, alto - 4 - r);
    ctx.quadraticCurveTo(24 + w, alto - 4, 24 + w - r, alto - 4); ctx.lineTo(24 + r, alto - 4);
    ctx.quadraticCurveTo(24, alto - 4, 24, alto - 4 - r); ctx.lineTo(24, 10 + r);
    ctx.quadraticCurveTo(24, 10, 24 + r, 10); ctx.closePath(); ctx.fill();

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff'; ctx.font = tabFuente(26, true);
    ctx.fillText(datos.titulo || 'Tablero', 46, 44);
    ctx.fillStyle = '#a9b0be'; ctx.font = tabFuente(17, false);
    const sub = ['Pared · ' + layout.medida + ' módulos',
                 vista === 'cerrado' ? 'tapa interna' : 'interior abierto',
                 layout.modulos + '/' + layout.medida + ' módulos'];
    ctx.fillText(sub.join(' · '), 46, 70);

    const logo = tabImagenes['adonai-logo-y-nombre'];
    if (logo) {
      const lh = alto - 30, lw = logo.width * lh / logo.height;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(logo, ancho - lw - 28, 14, lw, lh);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- conductores ---------- */

  // Traza un camino ortogonal con las esquinas redondeadas, como se dibuja un
  // unifilar a mano.
  function tabCamino(ctx, puntos, color, grosor) {
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(puntos[0][0], puntos[0][1]);
    for (let i = 1; i < puntos.length - 1; i++) {
      const [px, py] = puntos[i];
      const [nx, ny] = puntos[i + 1];
      const rr = Math.min(14, Math.abs(nx - px) / 2 || 14, Math.abs(ny - py) / 2 || 14);
      ctx.arcTo(px, py, px + Math.sign(nx - px) * rr, py + Math.sign(ny - py) * rr, rr);
    }
    ctx.lineTo(puntos[puntos.length - 1][0], puntos[puntos.length - 1][1]);
    ctx.stroke();
  }

  function tabPunto(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  }

  const TAB_FASE = '#e8a33d';
  const TAB_NEUTRO = '#4fc3e8';
  const TAB_TIERRA = '#57b65a';

  function tabConductores(ctx, ranuras, puestos, mod, altoLlave, CAB, layout, barras) {
    if (!puestos.length) return;
    const grosor = Math.max(3, mod * 0.09);
    const general = puestos[0];
    const dif = puestos[1];

    // Las borneras ya se dibujaron con el resto de las piezas; acá sólo se
    // necesita saber dónde quedaron para llevarles los cables.
    const anchoB = MODULOS_BORNERA * mod;
    const ubicar = (tipo) => {
      const b = barras.find((x) => x.it.barra === tipo);
      return b ? { x: b.x + b.w / 2, y: b.cy } : null;
    };
    const pNeutro = ubicar('neutro');
    const pTierra = ubicar('tierra');

    const arriba = (p) => p.cy - altoLlave * 0.42;
    const abajo = (p) => p.cy + altoLlave * 0.42;

    // 1) del general al diferencial
    if (dif) {
      tabCamino(ctx, [[general.x + general.w * 0.28, arriba(general)],
                      [general.x + general.w * 0.28, arriba(general) - mod * 0.55],
                      [dif.x + dif.w * 0.28, arriba(dif) - mod * 0.55],
                      [dif.x + dif.w * 0.28, arriba(dif)]], TAB_FASE, grosor);
      tabPunto(ctx, general.x + general.w * 0.28, arriba(general), TAB_FASE);
      tabPunto(ctx, dif.x + dif.w * 0.28, arriba(dif), TAB_FASE);
    }

    // 2) del diferencial al peine que alimenta cada circuito, fila por fila
    const circuitos = puestos.slice(dif ? 2 : 1);
    ranuras.forEach((r, fi) => {
      const enFila = circuitos.filter((p) => p.fila === fi);
      if (!enFila.length) return;
      const yPeine = r.cy + CAB - altoLlave * 0.42 - mod * 0.35;
      const x0 = enFila[0].x + enFila[0].w * 0.28;
      const x1 = enFila[enFila.length - 1].x + enFila[enFila.length - 1].w * 0.28;
      tabCamino(ctx, [[x0, yPeine], [x1, yPeine]], TAB_FASE, grosor);
      enFila.forEach((p) => {
        const xc = p.x + p.w * 0.28;
        tabCamino(ctx, [[xc, yPeine], [xc, arriba(p)]], TAB_FASE, grosor);
        tabPunto(ctx, xc, arriba(p), TAB_FASE);
        // salida del circuito hacia abajo
        tabCamino(ctx, [[xc, abajo(p)], [xc, abajo(p) + mod * 0.5]], TAB_FASE, grosor);
        const xn = p.x + p.w * 0.72;
        tabCamino(ctx, [[xn, abajo(p)], [xn, abajo(p) + mod * 0.5]], TAB_NEUTRO, grosor);
        tabPunto(ctx, xc, abajo(p), TAB_FASE);
        tabPunto(ctx, xn, abajo(p), TAB_NEUTRO);
      });
      // el diferencial alimenta el peine de la primera fila
      if (fi === 0 && dif) {
        tabCamino(ctx, [[dif.x + dif.w * 0.28, abajo(dif)],
                        [dif.x + dif.w * 0.28, abajo(dif) + mod * 0.45],
                        [x0 - mod * 0.35, abajo(dif) + mod * 0.45],
                        [x0 - mod * 0.35, yPeine], [x0, yPeine]], TAB_FASE, grosor);
        tabPunto(ctx, dif.x + dif.w * 0.28, abajo(dif), TAB_FASE);
      }
    });

    // 3) neutro: del diferencial a la bornera
    if (dif && pNeutro) {
      const xn = dif.x + dif.w * 0.72;
      tabCamino(ctx, [[xn, abajo(dif)], [xn, abajo(dif) + mod * 0.85],
                      [pNeutro.x, abajo(dif) + mod * 0.85], [pNeutro.x, pNeutro.y - anchoB * 0.9]],
                TAB_NEUTRO, grosor);
      tabPunto(ctx, xn, abajo(dif), TAB_NEUTRO);
    }
    // 4) tierra: de la bornera hacia el borde, como llegada de la jabalina
    if (pTierra) {
      tabCamino(ctx, [[pTierra.x, pTierra.y + anchoB * 0.9],
                      [pTierra.x, pTierra.y + anchoB * 1.4]], TAB_TIERRA, grosor);
    }
  }

  /* ============================================================
     PERSISTENCIA
     ============================================================ */
  // Un catálogo guardado antes de pasar a las medidas comerciales (12/24/36/48)
  // tiene la lista vieja de 6/12/18/24/36/54. Se convierte conservando los
  // precios que el usuario haya editado para las medidas que siguen existiendo,
  // y el de 48 se saca de sus propios 36 y 54 en vez de pisarlo con el de
  // fábrica.
  function migrarMedidasTablero(precios) {
    const pts = precios && precios.tableroPuntos;
    if (!Array.isArray(pts) || !pts.length) return false;
    const medidasNuevas = DEFAULT_PRECIOS.tableroPuntos.map((pt) => pt.n);
    const yaMigrado = pts.length === medidasNuevas.length &&
      pts.every((pt, i) => pt.n === medidasNuevas[i]);
    if (yaMigrado) return false;
    const porMedida = {};
    pts.forEach((pt) => { porMedida[pt.n] = pt.p; });
    precios.tableroPuntos = DEFAULT_PRECIOS.tableroPuntos.map((def) => {
      if (porMedida[def.n] !== undefined) return { n: def.n, p: porMedida[def.n] };
      // 48 no existía: se interpola entre las dos medidas viejas que lo rodean
      const antes = pts.filter((pt) => pt.n < def.n).pop();
      const despues = pts.find((pt) => pt.n > def.n);
      if (antes && despues) {
        const frac = (def.n - antes.n) / (despues.n - antes.n);
        return { n: def.n, p: Math.round(antes.p + frac * (despues.p - antes.p)) };
      }
      return { n: def.n, p: def.p };
    });
    return true;
  }

  const STORAGE_KEY = 'adonai_ht_v1';
  function defaultDB() {
    return {
      trabajos: [], presupuestos: [],
      settings: { margen: 30, iva: 22, precios: clonePrecios(DEFAULT_PRECIOS), manoObra: { ...DEFAULT_MANO_OBRA } },
      seq: { trabajo: 0, presupuesto: 0 }, _seeded: false,
    };
  }
  let DB;
  try { DB = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultDB(); } catch (e) { DB = defaultDB(); }
  if (!DB.settings) DB.settings = { margen: 30, iva: 22 };
  if (!DB.settings.precios) DB.settings.precios = clonePrecios(DEFAULT_PRECIOS);
  const medidasConvertidas = migrarMedidasTablero(DB.settings.precios);
  // Un catálogo guardado antes de que se agregara un precio nuevo no tiene esa
  // clave, y el material saldría en $0 sin que se note. Se completan las que
  // falten con el valor de fábrica, sin tocar las que el usuario ya editó.
  let clavesAgregadas = false;
  Object.keys(DEFAULT_PRECIOS).forEach((k) => {
    if (DB.settings.precios[k] === undefined) {
      DB.settings.precios[k] = clonePrecios(DEFAULT_PRECIOS[k]);
      clavesAgregadas = true;
    }
  });
  if (!DB.settings.manoObra) DB.settings.manoObra = { ...DEFAULT_MANO_OBRA };
  if (!DB.seq) DB.seq = { trabajo: 0, presupuesto: 0 };

  function saveDB() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); } catch (e) {} }
  // La conversión de medidas se guarda enseguida; si no, se repetiría en cada
  // arranque y el catálogo en pantalla no coincidiría con el del disco.
  if (medidasConvertidas || clavesAgregadas) saveDB();

  function seedSampleData() {
    const sistema = SISTEMAS.tri_tt;
    const cargas = [
      { id: 'c1', nombre: 'Iluminación depósito', categoria: 'iluminacion', potenciaW: 100, cantidad: 8, cosPhi: 1 },
      { id: 'c2', nombre: 'Tomas generales', categoria: 'tomacorrientes', potenciaW: 200, cantidad: 10, cosPhi: 1 },
      { id: 'c3', nombre: 'Motor bomba', categoria: 'cargaFija', potenciaW: 2200, cantidad: 1, cosPhi: 0.85 },
    ];
    const circuitos = importarCargasComoCircuitos(cargas, sistema).map((c, i) => ({ ...c, l: [18, 30, 42][i] || 15 }));
    const materiales = generarMateriales(circuitos, { obra: { naturaleza: 'Instalación nueva' }, cargas });
    const now = Date.now();
    const trabajo = {
      id: 'T' + (++DB.seq.trabajo), codigo: 'REL-' + new Date().getFullYear() + '-0001',
      cliente: { nombre: 'Empresa Delta (ejemplo)', telefono: '', whatsapp: '', email: '', contacto: '', obs: '' },
      obra: { nombre: 'Depósito Central', direccion: '', localidad: 'Salto', tipo: 'Industrial', naturaleza: 'Instalación nueva', obs: '' },
      sistemaId: 'tri_tt', factores: { iluminacion: 1.0, tomacorrientes: 0.66, cargaFija: 0.8 },
      proteccionGeneral: { diferencialSensibilidad: 30 },
      cargas, circuitos, materiales, estado: 'revision', observaciones: 'Se verificó caída de tensión y protección según normas vigentes. Pendiente confirmación de tableros.',
      createdAt: now - 3 * 3600e3, updatedAt: now - 3600e3,
    };
    DB.trabajos.push(trabajo);
    const costoMateriales = materiales.reduce((s, m) => s + m.cantidad * m.precioUnit, 0);
    const presupuesto = {
      id: 'P' + (++DB.seq.presupuesto), codigo: 'AE-' + new Date().getFullYear() + '-0001', trabajoId: trabajo.id,
      clienteNombre: 'Empresa Delta (ejemplo)', materiales: 82450, manoObra: 28000, traslados: 4500, otros: 3000,
      margen: 30, iva: 22, validez: 15, formaPago: '50% anticipo / 50% final', plazo: 5, estado: 'borrador',
      createdAt: now - 5 * 3600e3, updatedAt: now - 5 * 3600e3,
    };
    DB.presupuestos.push(presupuesto);
  }
  if (!DB._seeded && DB.trabajos.length === 0 && DB.presupuestos.length === 0) {
    seedSampleData();
    DB._seeded = true;
    saveDB();
  }

  /* ============================================================
     UTILIDADES DE UI
     ============================================================ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach((c) => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function icon(name, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + '><use href="#' + name + '"/></svg>';
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const min = Math.round(diff / 60000);
    if (min < 1) return 'Recién';
    if (min < 60) return 'Hace ' + min + ' min';
    const h = Math.round(min / 60);
    if (h < 24) return 'Hace ' + h + ' h';
    const d = Math.round(h / 24);
    return 'Hace ' + d + ' d';
  }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  const ESTADO_LABEL = { pendiente: 'Pendiente', revision: 'En revisión', aprobado: 'Aprobado', borrador: 'Borrador' };
  const ESTADO_CLASS = { pendiente: 'status-pending', revision: 'status-review', aprobado: 'status-approved', borrador: 'status-draft' };
  function statusPill(estado) {
    return '<span class="status-pill ' + (ESTADO_CLASS[estado] || 'status-draft') + '">' + (ESTADO_LABEL[estado] || estado) + '</span>';
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  const VIEWS_WITH_NAV = ['home', 'trabajos', 'presupuestos', 'perfil'];
  let currentView = 'home';
  // Cada pantalla que se muestra queda como una entrada en el historial del navegador (ver
  // showView más abajo), así el botón "atrás" del celular navega DENTRO de la app en vez de
  // cerrarla — sin esto, en una PWA instalada esa sola entrada inicial hace que "atrás" salga
  // directo de la app apenas se navega a una sub-pantalla (ej. un presupuesto abierto).
  let suppressHistoryPush = false;
  function showView(id) {
    $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + id; });
    currentView = id;
    $('#bottom-nav').hidden = VIEWS_WITH_NAV.indexOf(id) === -1;
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.nav === id));
    $('.shell').scrollTop = 0;
    window.scrollTo(0, 0);
    if (!suppressHistoryPush) {
      if (history.state && history.state.appView) history.pushState({ appView: id }, '', '#' + id);
      else history.replaceState({ appView: id }, '', '#' + id);
    }
    if (id === 'home') renderHome();
    if (id === 'trabajos') renderTrabajos();
    if (id === 'presupuestos') renderPresupuestos();
    if (id === 'perfil') renderPerfil();
    if (id === 'catalogo-precios') renderCatalogoPrecios();
  }
  window.addEventListener('popstate', (e) => {
    const id = (e.state && e.state.appView) || 'home';
    suppressHistoryPush = true;
    showView(id);
    suppressHistoryPush = false;
  });

  /* ============================================================
     PANTALLA: INICIO
     ============================================================ */
  function renderHome() {
    const pendientes = DB.trabajos.filter((t) => t.estado === 'pendiente').length;
    const revision = DB.trabajos.filter((t) => t.estado === 'revision').length;
    $('#home-stats').innerHTML =
      '<div class="stat-pill"><span class="ic">' + icon('ic-clock') + '</span><div><div class="num">' + pendientes + '</div><div class="lbl">pendientes</div></div></div>' +
      '<div class="stat-pill"><span class="ic">' + icon('ic-check-list') + '</span><div><div class="num">' + revision + '</div><div class="lbl">en revisión</div></div></div>';

    const items = []
      .concat(DB.trabajos.map((t) => ({ type: 'trabajo', ref: t, ts: t.updatedAt })))
      .concat(DB.presupuestos.map((p) => ({ type: 'presupuesto', ref: p, ts: p.updatedAt })))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 5);

    const wrap = $('#home-activity');
    wrap.innerHTML = '';
    if (items.length === 0) {
      wrap.innerHTML = '<div class="empty-state">Todavía no hay actividad. Empezá con un nuevo relevamiento.</div>';
    }
    items.forEach((it) => {
      const row = el('div', { class: 'activity-row', style: 'cursor:pointer' });
      if (it.type === 'trabajo') {
        row.innerHTML =
          '<span class="ic">' + icon('ic-clipboard-plus') + '</span>' +
          '<div class="body"><div class="title">' + escapeHtml(it.ref.obra.nombre || it.ref.cliente.nombre || 'Relevamiento') + '</div>' +
          '<div class="meta">' + timeAgo(it.ts) + '</div></div>' + statusPill(it.ref.estado);
        row.addEventListener('click', () => openTrabajo(it.ref.id));
      } else {
        row.innerHTML =
          '<span class="ic">' + icon('ic-file-dollar') + '</span>' +
          '<div class="body"><div class="title">Presupuesto ' + it.ref.codigo + '</div>' +
          '<div class="meta">' + timeAgo(it.ts) + '</div></div>' + statusPill(it.ref.estado);
        row.addEventListener('click', () => openPresupuesto(it.ref.id));
      }
      wrap.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================
     ASISTENTE: NUEVO RELEVAMIENTO
     ============================================================ */
  const WIZARD_STEPS = ['cliente', 'obra', 'cargas', 'circuitos', 'materiales', 'resumen'];
  const WIZARD_LABELS = ['Cliente', 'Obra', 'Cargas', 'Circuitos', 'Materiales', 'Resumen'];
  let draft = null;
  let wizardStep = 0;

  function newDraft() {
    return {
      id: null, codigo: null,
      cliente: { nombre: '', telefono: '', whatsapp: '', email: '', contacto: '', obs: '' },
      obra: { nombre: '', direccion: '', localidad: 'Salto', tipo: 'Residencial', naturaleza: 'Instalación nueva', obs: '' },
      sistemaId: 'tri_tt', factores: { iluminacion: 1.0, tomacorrientes: 0.66, cargaFija: 0.8 },
      proteccionGeneral: { diferencialSensibilidad: 30 },
      cargas: [], circuitos: [], materiales: [], estado: 'pendiente', observaciones: '',
      motorVersion: MOTOR_VERSION, normativaPackId: NORMATIVE_PACK.id, normativaVersion: NORMATIVE_PACK.version,
      createdAt: Date.now(), updatedAt: Date.now(),
    };
  }

  function startRelevamiento() {
    draft = newDraft();
    wizardStep = 0;
    renderClientesExistentes();
    renderWizardForm();
    showView('relevamiento');
    renderWizardStep();
  }

  function openTrabajo(id) {
    const t = DB.trabajos.find((x) => x.id === id);
    if (!t) return;
    draft = JSON.parse(JSON.stringify(t));
    if (!draft.proteccionGeneral) draft.proteccionGeneral = { diferencialSensibilidad: 30 };
    wizardStep = WIZARD_STEPS.length - 1;
    renderClientesExistentes();
    renderWizardForm();
    showView('relevamiento');
    renderWizardStep();
  }

  function renderClientesExistentes() {
    const sel = $('#f-cliente-existente');
    const clientesUnicos = {};
    DB.trabajos.forEach((t) => { if (t.cliente.nombre) clientesUnicos[t.cliente.nombre] = t.cliente; });
    sel.innerHTML = '<option value="">Seleccionar cliente existente…</option>' +
      Object.keys(clientesUnicos).map((n) => '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>').join('');
    sel.onchange = () => {
      const c = clientesUnicos[sel.value];
      if (c) {
        $('#f-cliente-nombre').value = c.nombre || '';
        $('#f-cliente-telefono').value = c.telefono || '';
        $('#f-cliente-whatsapp').value = c.whatsapp || '';
        $('#f-cliente-email').value = c.email || '';
        $('#f-cliente-contacto').value = c.contacto || '';
      }
    };
  }

  function renderWizardStepper() {
    const wrap = $('#wizard-stepper');
    wrap.innerHTML = '';
    WIZARD_STEPS.forEach((key, i) => {
      if (i > 0) wrap.appendChild(el('div', { class: 'step-line' + (i <= wizardStep ? ' done' : '') }));
      const cls = 'step' + (i === wizardStep ? ' current' : i < wizardStep ? ' done' : '');
      const btn = el('button', { class: cls, type: 'button' });
      btn.innerHTML = '<span class="dot">' + (i < wizardStep ? '✓' : i + 1) + '</span><span class="lbl">' + WIZARD_LABELS[i] + '</span>';
      btn.addEventListener('click', () => { wizardStep = i; renderWizardStep(); });
      wrap.appendChild(btn);
    });
  }

  function renderWizardForm() {
    // Precarga los campos desde `draft`
    $('#f-cliente-nombre').value = draft.cliente.nombre;
    $('#f-cliente-telefono').value = draft.cliente.telefono;
    $('#f-cliente-whatsapp').value = draft.cliente.whatsapp;
    $('#f-cliente-email').value = draft.cliente.email;
    $('#f-cliente-contacto').value = draft.cliente.contacto;
    $('#f-cliente-obs').value = draft.cliente.obs;

    $('#f-obra-nombre').value = draft.obra.nombre;
    $('#f-obra-direccion').value = draft.obra.direccion;
    $('#f-obra-localidad').value = draft.obra.localidad;
    $('#f-obra-tipo').value = draft.obra.tipo;
    $('#f-obra-naturaleza').value = draft.obra.naturaleza;
    $('#f-obra-obs').value = draft.obra.obs;

    $('#f-sistema').value = draft.sistemaId;
    renderFactoresGrid();
    renderCargasList();
    renderPotenciaResultado();
    renderCircuitosList();
    renderMaterialesList();
    renderResumen();
  }

  function syncFormToDraft() {
    draft.cliente = {
      nombre: $('#f-cliente-nombre').value.trim(), telefono: $('#f-cliente-telefono').value.trim(),
      whatsapp: $('#f-cliente-whatsapp').value.trim(), email: $('#f-cliente-email').value.trim(),
      contacto: $('#f-cliente-contacto').value.trim(), obs: $('#f-cliente-obs').value.trim(),
    };
    draft.obra = {
      nombre: $('#f-obra-nombre').value.trim(), direccion: $('#f-obra-direccion').value.trim(),
      localidad: $('#f-obra-localidad').value.trim(), tipo: $('#f-obra-tipo').value,
      naturaleza: $('#f-obra-naturaleza').value, obs: $('#f-obra-obs').value.trim(),
    };
    draft.sistemaId = $('#f-sistema').value;
    draft.observaciones = $('#resumen-observaciones') ? $('#resumen-observaciones').value.trim() : draft.observaciones;
    draft.updatedAt = Date.now();
  }

  function renderWizardStep() {
    renderWizardStepper();
    WIZARD_STEPS.forEach((key, i) => { $('#step-' + key).hidden = i !== wizardStep; });
    if (WIZARD_STEPS[wizardStep] === 'circuitos') renderCircuitosList();
    if (WIZARD_STEPS[wizardStep] === 'materiales') renderMaterialesList();
    if (WIZARD_STEPS[wizardStep] === 'resumen') renderResumen();
  }

  function wireWizardNav() {
    $$('[data-step-next]').forEach((b) => b.addEventListener('click', () => {
      syncFormToDraft();
      if (wizardStep < WIZARD_STEPS.length - 1) { wizardStep++; renderWizardStep(); }
    }));
    $$('[data-step-prev]').forEach((b) => b.addEventListener('click', () => {
      syncFormToDraft();
      if (wizardStep > 0) { wizardStep--; renderWizardStep(); }
    }));
    $('#btn-ir-circuitos').addEventListener('click', () => {
      syncFormToDraft();
      // solo importa automáticamente si el paso de circuitos está vacío,
      // para no pisar circuitos ya editados a mano si el usuario vuelve atrás
      if (draft.circuitos.length === 0) {
        const sistema = SISTEMAS[draft.sistemaId];
        draft.circuitos = importarCargasComoCircuitos(draft.cargas, sistema);
      }
      wizardStep = 3;
      renderWizardStep();
    });
    $('#btn-guardar-borrador').addEventListener('click', () => {
      syncFormToDraft();
      persistDraft('pendiente');
      toast('Borrador guardado');
      showView('home');
    });
  }

  function renderFactoresGrid() {
    const wrap = $('#factores-grid');
    wrap.innerHTML = '';
    CATEGORIAS.forEach((cat) => {
      const f = el('div', { class: 'field' });
      f.innerHTML = '<label>' + cat.label + '</label>';
      const input = el('input', { class: 'input', type: 'number', step: '0.05', min: '0', max: '1', value: draft.factores[cat.id] });
      input.addEventListener('input', () => { draft.factores[cat.id] = Number(input.value); renderPotenciaResultado(); });
      f.appendChild(input);
      wrap.appendChild(f);
    });
  }

  // Opciones del selector de cargas típicas, agrupadas por rubro y filtradas
  // por la categoría elegida.
  function opcionesPreset(categoria) {
    const propias = CARGAS_PRESETS.filter((p) => p.cat === categoria);
    const grupos = [];
    propias.forEach((p) => {
      let g = grupos.find((x) => x.nombre === p.grupo);
      if (!g) { g = { nombre: p.grupo, items: [] }; grupos.push(g); }
      g.items.push(p);
    });
    return '<option value="">Escribir a mano…</option>' + grupos.map((g) =>
      '<optgroup label="' + escapeHtml(g.nombre) + '">' + g.items.map((p) =>
        '<option value="' + escapeHtml(p.nombre) + '">' + escapeHtml(p.nombre) + ' — ' + p.w + ' W</option>'
      ).join('') + '</optgroup>').join('');
  }

  function renderCargasList() {
    const wrap = $('#cargas-list');
    wrap.innerHTML = '';
    if (draft.cargas.length === 0) {
      wrap.appendChild(el('div', { class: 'empty-state', html: 'Agregá el primer circuito para empezar a calcular.' }));
      return;
    }
    draft.cargas.forEach((c) => {
      const card = el('div', { class: 'item-card' });
      card.innerHTML =
        '<button class="remove-btn" type="button">' + icon('ic-trash') + '</button>' +
        '<div class="item-grid" style="padding-right:30px">' +
        '<div class="field"><label>Nombre</label><input class="input" data-f="nombre" placeholder="Ej: Iluminación living" value="' + escapeHtml(c.nombre) + '"></div>' +
        '<div class="field"><label>Categoría</label><select class="select" data-f="categoria">' +
        CATEGORIAS.map((cat) => '<option value="' + cat.id + '"' + (cat.id === c.categoria ? ' selected' : '') + '>' + cat.label + '</option>').join('') +
        '</select></div>' +
        '<div class="field" style="grid-column:1/-1"><label>Elegir de la lista</label><select class="select" data-f="preset">' +
        opcionesPreset(c.categoria) + '</select></div>' +
        '<div class="field"><label>Potencia (W)</label><input class="input" type="number" data-f="potenciaW" value="' + c.potenciaW + '"></div>' +
        '<div class="field"><label>Cantidad</label><input class="input" type="number" min="1" data-f="cantidad" value="' + c.cantidad + '"></div>' +
        '<div class="field"><label>cos φ</label><input class="input" type="number" step="0.05" min="0" max="1" data-f="cosPhi" value="' + c.cosPhi + '"></div>' +
        '</div>';
      card.querySelector('.remove-btn').addEventListener('click', () => { draft.cargas = draft.cargas.filter((x) => x.id !== c.id); renderCargasList(); renderPotenciaResultado(); });
      card.querySelectorAll('[data-f]').forEach((input) => {
        input.addEventListener('change', () => {
          const f = input.dataset.f;
          if (f === 'preset') {
            const p = CARGAS_PRESETS.find((x) => x.nombre === input.value);
            if (p) {
              // el nombre se pisa sólo si el técnico no escribió uno propio
              if (!c.nombre || CARGAS_PRESETS.some((x) => x.nombre === c.nombre)) c.nombre = p.nombre;
              c.potenciaW = p.w; c.cosPhi = p.cosPhi;
              renderCargasList(); renderPotenciaResultado();
            }
            return;
          }
          if (f === 'categoria') {
            c.categoria = input.value;
            const cat = CATEGORIAS.find((x) => x.id === input.value);
            if (cat) c.cosPhi = cat.cosPhiDefault;
            renderCargasList();
          } else if (f === 'nombre') { c.nombre = input.value; }
          else { c[f] = Number(input.value); }
          renderPotenciaResultado();
        });
      });
      wrap.appendChild(card);
    });
  }

  function renderPotenciaResultado() {
    const sistema = SISTEMAS[$('#f-sistema') ? $('#f-sistema').value : draft.sistemaId] || SISTEMAS.tri_tt;
    const r = calcularPotencia(draft.cargas, sistema, draft.factores);
    draft._potencia = r;
    $('#potencia-resultado').innerHTML =
      statBox('Potencia instalada', fmt(r.potenciaInstalada / 1000) + ' kW') +
      statBox('Potencia de cálculo', fmt(r.pDemandTotal / 1000) + ' kW', true) +
      statBox('Potencia reactiva', fmt(r.qDemandTotal / 1000) + ' kVAr') +
      statBox('Corriente estimada', fmt(r.corriente) + ' A') +
      statBox('cos φ equivalente', fmt(r.cosPhiEq, 2)) +
      statBox('Suministro sugerido', (sistema.fases === 1 ? 'Mono' : 'Trifásico') + ' · ' + fmt(r.suministroSugerido, 1) + ' kW', true);
    $('#potencia-warning').textContent = r.pDemandTotal / 1000 < r.minimoDiseno
      ? 'La potencia de cálculo está por debajo de la carga mínima de diseño habitual de UTE (' + r.minimoDiseno + ' kW). Puede aplicar igual por excepciones — confirmalo.'
      : '';
    $('#btn-ir-circuitos').disabled = draft.cargas.length === 0;
  }

  function statBox(label, value, big) {
    return '<div class="stat-box"><div class="lbl">' + label + '</div><div class="val' + (big ? ' big' : '') + '">' + value + '</div></div>';
  }

  function proteccionGeneralHtml(pg) {
    return statBox('Térmica general', pg.termicaIn + 'A · ' + pg.termicaPolos + 'p · curva ' + pg.termicaCurva, true) +
      statBox('Diferencial general', pg.diferencialIn + 'A · ' + pg.diferencialSensibilidad + ' mA · tipo ' + pg.diferencialTipo, true);
  }
  function proteccionGeneralLightHtml(pg) {
    return '<div class="light-stat-row"><span class="lbl">Térmica general</span><span class="val strong">' + pg.termicaIn + 'A · ' + pg.termicaPolos + 'p · curva ' + pg.termicaCurva + '</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Diferencial general</span><span class="val strong">' + pg.diferencialIn + 'A · ' + pg.diferencialTipo + '</span></div>';
  }

  function renderCircuitosList() {
    const wrap = $('#circuitos-list');
    wrap.innerHTML = '';
    if (draft.circuitos.length === 0) {
      wrap.appendChild(el('div', { class: 'card card-pad empty-state', html: 'No hay circuitos todavía. Volvé a <b>Cargas</b> y continuá, o agregalos acá manualmente.' }));
    }
    draft.circuitos.forEach((c) => {
      const calc = calcularCircuito(c);
      const card = el('div', { class: 'card card-pad item-card', style: 'position:relative' });
      card.innerHTML =
        '<button class="remove-btn" type="button">' + icon('ic-trash') + '</button>' +
        '<div class="item-grid" style="padding-right:30px">' +
        '<div class="field" style="grid-column:1/-1"><label>Nombre del circuito</label><input class="input" data-f="nombre" value="' + escapeHtml(c.nombre) + '"></div>' +
        '<div class="field"><label>Corriente Ib (A)</label><input class="input" type="number" data-f="ib" value="' + c.ib + '"></div>' +
        '<div class="field"><label>Longitud (m)</label><input class="input" type="number" data-f="l" value="' + c.l + '"></div>' +
        '<div class="field"><label>Material</label><select class="select" data-f="material"><option value="cobre"' + (c.material === 'cobre' ? ' selected' : '') + '>Cobre</option><option value="aluminio"' + (c.material === 'aluminio' ? ' selected' : '') + '>Aluminio</option></select></div>' +
        '<div class="field"><label>Método</label><select class="select" data-f="metodo">' + Object.keys(METODO_LABEL).map((k) => '<option value="' + k + '"' + (c.metodo === k ? ' selected' : '') + '>' + METODO_LABEL[k] + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Temp. amb. (°C)</label><input class="input" type="number" data-f="tempAmb" value="' + c.tempAmb + '"></div>' +
        '<div class="field"><label>Agrupados</label><input class="input" type="number" min="1" data-f="agrupados" value="' + c.agrupados + '"></div>' +
        '<div class="field"><label>Polos</label><select class="select" data-f="polos">' +
        opcionesPolos(c).map((o) => '<option value="' + o.v + '"' + (polosDe(c) === o.v ? ' selected' : '') + '>' + o.label + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Uso</label><select class="select" data-f="uso">' +
        USOS.map((u) => '<option value="' + u.id + '"' + ((c.uso || 'fuerza') === u.id ? ' selected' : '') + '>' + u.label + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Aislación</label><select class="select" data-f="aislacion">' +
        '<option value="pvc"' + ((c.aislacion || 'pvc') === 'pvc' ? ' selected' : '') + '>PVC</option>' +
        '<option value="xlpe"' + (c.aislacion === 'xlpe' ? ' selected' : '') + '>XLPE</option></select></div>' +
        '<div class="field"><label>Caída máx. (%)</label><input class="input" type="number" step="0.5" data-f="caidaMax" value="' + c.caidaMax + '"></div>' +
        '<div class="field"><label>cos φ</label><input class="input" type="number" step="0.05" min="0" max="1" data-f="cosPhi" value="' + c.cosPhi + '"></div>' +
        '</div>' +
        '<div style="margin-top:16px">' + (calc.apto
          ? '<div class="panel-dark card-pad" style="display:flex;flex-wrap:wrap;gap:20px">' +
            statBox('Sección', calc.seccionAdoptada + ' mm²', true) + statBox('Iz corregida', fmt(calc.iz) + ' A') +
            statBox('Caída de tensión', fmt(calc.dUPct) + ' %') + statBox('Protección', calc.breaker + ' A', true) + statBox('Curva sugerida', calc.curva) + '</div>'
          : '<div class="alert-error">Ninguna sección de la tabla cumple corriente admisible y caída de tensión. Revisá longitud, método o caída máxima.</div>') + '</div>';
      card.querySelector('.remove-btn').addEventListener('click', () => { draft.circuitos = draft.circuitos.filter((x) => x.id !== c.id); renderCircuitosList(); });
      card.querySelectorAll('[data-f]').forEach((input) => {
        input.addEventListener('change', () => {
          const f = input.dataset.f;
          const esTexto = f === 'nombre' || f === 'material' || f === 'metodo' || f === 'uso' || f === 'aislacion';
          c[f] = esTexto ? input.value : Number(input.value);
          // Cada uso trae su propia caída máxima admisible: iluminación admite
          // menos que fuerza. Al cambiar el uso se acompaña el valor.
          if (f === 'uso') {
            c.caidaMax = CAIDA_MAX_DEFAULT[input.value] || 5;
            // iluminación suele ir unipolar y el resto bipolar: se acompaña el
            // valor mientras el técnico no lo haya fijado a mano
            if (!c.polosManual) c.polos = polosPorDefecto(c);
          }
          if (f === 'polos') c.polosManual = true;
          renderCircuitosList();
        });
      });
      wrap.appendChild(card);
    });

    const tablaWrap = $('#circuitos-tabla-wrap');
    tablaWrap.hidden = draft.circuitos.length === 0;
    const tbody = $('#circuitos-tabla tbody');
    tbody.innerHTML = draft.circuitos.map((c) => {
      const calc = calcularCircuito(c);
      return '<tr><td>' + escapeHtml(c.nombre || '—') + '</td><td>' + fmt(c.ib) + '</td><td>' + (calc.apto ? calc.seccionAdoptada + ' mm²' : '—') + '</td>' +
        '<td>' + (calc.apto ? calc.breaker + 'A · ' + calc.curva : '—') + '</td>' +
        '<td style="color:' + (calc.apto && calc.dUPct > c.caidaMax ? 'var(--error)' : 'inherit') + '">' + (calc.apto ? fmt(calc.dUPct) : '—') + '</td></tr>';
    }).join('');

    const pgWrap = $('#circuitos-proteccion-general');
    const pg = calcularProteccionGeneral(draft);
    pgWrap.hidden = !pg.aplica || draft.circuitos.length === 0;
    if (pg.aplica) pgWrap.innerHTML = proteccionGeneralHtml(pg);
  }

  function renderMaterialesList() {
    const wrap = $('#materiales-list');
    if (draft.materiales.length === 0 && draft.circuitos.length > 0) {
      draft.materiales = generarMateriales(draft.circuitos, draft);
    }
    wrap.innerHTML = '';
    if (draft.materiales.length === 0) {
      wrap.appendChild(el('div', { class: 'empty-state', html: 'Sin materiales todavía. Cargá circuitos o agregá un ítem manual.' }));
    }
    draft.materiales.forEach((m) => {
      const row = el('div', { class: 'item-card' });
      row.innerHTML =
        '<button class="remove-btn" type="button">' + icon('ic-trash') + '</button>' +
        '<div class="item-grid" style="padding-right:30px;align-items:end">' +
        '<div class="field" style="grid-column:1/-1"><label>Material</label><input class="input" data-f="nombre" value="' + escapeHtml(m.nombre) + '"></div>' +
        '<div class="field"><label>Cantidad</label><input class="input" type="number" data-f="cantidad" value="' + m.cantidad + '"></div>' +
        '<div class="field"><label>Unidad</label><input class="input" data-f="unidad" value="' + m.unidad + '"></div>' +
        '<div class="field"><label>Precio unit. ($)</label><input class="input" type="number" data-f="precioUnit" value="' + m.precioUnit + '"></div>' +
        '</div>';
      row.querySelector('.remove-btn').addEventListener('click', () => { draft.materiales = draft.materiales.filter((x) => x.id !== m.id); renderMaterialesList(); });
      row.querySelectorAll('[data-f]').forEach((input) => {
        input.addEventListener('change', () => {
          const f = input.dataset.f;
          m[f] = (f === 'nombre' || f === 'unidad') ? input.value : Number(input.value);
        });
      });
      wrap.appendChild(row);
    });
  }

  function renderResumen() {
    syncFormToDraftSoft();
    $('#resumen-cliente').textContent = draft.cliente.nombre || 'Sin definir';
    $('#resumen-obra').textContent = draft.obra.nombre || 'Sin definir';
    $('#resumen-estado').value = draft.estado;
    const sistema = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
    const r = calcularPotencia(draft.cargas, sistema, draft.factores);
    $('#resumen-carga').textContent = fmt(r.pDemandTotal / 1000) + ' kW';

    const cWrap = $('#resumen-circuitos');
    cWrap.innerHTML = '';
    if (draft.circuitos.length === 0) cWrap.appendChild(el('div', { class: 'empty-state', html: 'Sin circuitos cargados.' }));
    draft.circuitos.forEach((c, i) => {
      const calc = calcularCircuito(c);
      const row = el('div', { class: 'card card-pad', style: 'display:flex;align-items:center;gap:14px' });
      row.innerHTML =
        '<div style="width:34px;height:34px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem;flex:none">C' + (i + 1) + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:0.88rem">' + escapeHtml(c.nombre || 'Circuito') + '</div>' +
        '<div style="font-size:0.76rem;color:var(--steel)">' + (calc.apto ? calc.seccionAdoptada + ' mm² · ' + calc.breaker + 'A · ΔU ' + fmt(calc.dUPct) + '%' : 'No apto con estos parámetros') + '</div></div>';
      cWrap.appendChild(row);
    });

    const pg = calcularProteccionGeneral(draft);
    $('#resumen-proteccion-general').hidden = !pg.aplica;
    if (pg.aplica) {
      $('#resumen-proteccion-general-stats').innerHTML = proteccionGeneralLightHtml(pg);
      $('#resumen-diferencial-sensibilidad').value = String(pg.diferencialSensibilidad);
    }

    $('#resumen-materiales-count').textContent = draft.materiales.length + ' ítems';
    const mWrap = $('#resumen-materiales-preview');
    mWrap.innerHTML = '';
    draft.materiales.slice(0, 3).forEach((m) => {
      mWrap.appendChild(el('div', { class: 'light-stat-row', html: '<span class="lbl">' + escapeHtml(m.nombre) + '</span><span class="val">' + fmt(m.cantidad, 0) + ' ' + escapeHtml(m.unidad) + '</span>' }));
    });
    if (draft.materiales.length > 3) mWrap.appendChild(el('div', { class: 'light-stat-row', html: '<span class="lbl" style="color:var(--steel)">+' + (draft.materiales.length - 3) + ' más</span><span></span>' }));

    $('#resumen-observaciones').value = draft.observaciones;
  }

  function syncFormToDraftSoft() {
    // sincroniza los campos de texto simples si existen en el DOM, sin pisar valores con vacíos
    if ($('#f-cliente-nombre')) draft.cliente.nombre = $('#f-cliente-nombre').value.trim() || draft.cliente.nombre;
    if ($('#f-obra-nombre')) draft.obra.nombre = $('#f-obra-nombre').value.trim() || draft.obra.nombre;
  }

  function persistDraft(estadoOverride) {
    syncFormToDraft();
    draft.observaciones = $('#resumen-observaciones') ? $('#resumen-observaciones').value.trim() : draft.observaciones;
    if ($('#resumen-estado') && !$('#step-resumen').hidden) draft.estado = $('#resumen-estado').value;
    if (estadoOverride) draft.estado = estadoOverride;
    draft.motorVersion = MOTOR_VERSION;
    draft.normativaPackId = NORMATIVE_PACK.id;
    draft.normativaVersion = NORMATIVE_PACK.version;
    draft.updatedAt = Date.now();
    if (!draft.id) {
      draft.id = uid('T');
      draft.codigo = 'REL-' + new Date().getFullYear() + '-' + String(DB.trabajos.length + 1).padStart(4, '0');
      DB.trabajos.push(draft);
    } else {
      const idx = DB.trabajos.findIndex((t) => t.id === draft.id);
      if (idx >= 0) DB.trabajos[idx] = draft; else DB.trabajos.push(draft);
    }
    saveDB();
  }

  /* ============================================================
     PANTALLA: CALCULAR CONDUCTOR (standalone)
     ============================================================ */
  function tensionesPara(fases) {
    return fases === 1 ? [{ v: 230, label: '230 V' }] : [{ v: 230, label: '230 V (IT)' }, { v: 400, label: '400 V (TT)' }];
  }
  function renderCondTensiones() {
    const fases = Number($('#cond-fases .active').dataset.fases);
    const sel = $('#cond-tension');
    const opts = tensionesPara(fases);
    sel.innerHTML = opts.map((o) => '<option value="' + o.v + '">' + o.label + '</option>').join('');
    if (fases === 3) sel.value = '400';
  }
  function renderCondDatoLabel() {
    const dato = $('#cond-dato').value;
    $('#cond-valor-label').textContent = dato === 'potencia' ? 'Valor (kW)' : 'Valor (A)';
  }
  function calcularConductorForm() {
    const fases = Number($('#cond-fases .active').dataset.fases);
    const v = Number($('#cond-tension').value);
    const dato = $('#cond-dato').value;
    const valor = Number($('#cond-valor').value) || 0;
    const cosPhi = Number($('#cond-cosphi').value) || 1;
    const ib = ibDesdeInput({ datoConocido: dato, potenciaKw: dato === 'potencia' ? valor : 0, corrienteA: dato === 'corriente' ? valor : 0, cosPhi, v, fases });
    const r = calcularSeccion({
      ib, v, fases, l: Number($('#cond-longitud').value) || 0, material: $('#cond-material').value,
      metodo: $('#cond-metodo').value, aislacion: $('#cond-aislacion').value,
      tempAmb: Number($('#cond-temp').value) || 30, agrupados: Number($('#cond-agrupados').value) || 1,
      cosPhi, caidaMax: Number($('#cond-caidamax').value) || 5, uso: $('#cond-uso').value,
    });
    $('#cond-badge').innerHTML = r.apto
      ? '<span class="badge-apto">' + icon('ic-check-circle') + 'Apto · Cumple RBT UTE</span>'
      : '<span class="badge-noapto">' + icon('ic-x-circle') + 'No apto</span>';
    const rows = [
      ['ic-zap', 'Corriente de diseño', fmt(r.ib) + ' A'],
      ['ic-cable', 'Sección por capacidad', (r.seccionCapacidad ?? '—') + (r.seccionCapacidad ? ' mm²' : '')],
      ['ic-ruler', 'Sección por caída', (r.seccionCaida ?? '—') + (r.seccionCaida ? ' mm²' : '')],
      ['ic-tool', 'Sección mínima reglamentaria', r.minimo + ' mm²'],
    ];
    if (r.apto) {
      rows.push(['ic-cable', 'Conductor adoptado', r.seccionAdoptada + ' mm² ' + ($('#cond-material').value === 'cobre' ? 'Cu' : 'Al') + ' ' + $('#cond-aislacion').value.toUpperCase()]);
      rows.push(['ic-calc', 'Protección sugerida', r.breaker + ' A curva ' + r.curva]);
      rows.push(['ic-thermo', 'Caída de tensión', fmt(r.dUPct) + ' % — ' + (r.dUPct <= Number($('#cond-caidamax').value) ? 'Cumple' : 'No cumple')]);
    }
    $('#cond-resultado').innerHTML = rows.map((row) =>
      '<div class="light-stat-row"><span class="lbl">' + icon(row[0]) + row[1] + '</span><span class="val strong">' + row[2] + '</span></div>').join('');
    return r;
  }

  /* ============================================================
     TRABAJOS Y PRESUPUESTOS — listados
     ============================================================ */
  function renderTrabajos() {
    const wrap = $('#trabajos-list');
    wrap.innerHTML = '';
    const items = DB.trabajos.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (items.length === 0) { wrap.appendChild(el('div', { class: 'empty-state', html: 'Todavía no guardaste ningún relevamiento.' })); return; }
    items.forEach((t) => {
      const card = el('div', { class: 'card card-pad', style: 'cursor:pointer;display:flex;align-items:center;gap:14px' });
      card.innerHTML =
        '<span class="ic" style="width:40px;height:40px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:none">' + icon('ic-clipboard-plus') + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:0.9rem">' + escapeHtml(t.obra.nombre || 'Obra sin nombre') + '</div>' +
        '<div style="font-size:0.78rem;color:var(--steel)">' + escapeHtml(t.cliente.nombre || 'Sin cliente') + ' · ' + timeAgo(t.updatedAt) + '</div></div>' +
        statusPill(t.estado);
      card.addEventListener('click', () => openTrabajo(t.id));
      wrap.appendChild(card);
    });
  }

  function renderPresupuestos() {
    const wrap = $('#presupuestos-list');
    wrap.innerHTML = '';
    const items = DB.presupuestos.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (items.length === 0) { wrap.appendChild(el('div', { class: 'empty-state', html: 'Todavía no creaste ningún presupuesto.' })); return; }
    items.forEach((p) => {
      const totales = calcularTotalesPresupuesto(p);
      const card = el('div', { class: 'card card-pad', style: 'cursor:pointer;display:flex;align-items:center;gap:14px' });
      card.innerHTML =
        '<span class="ic" style="width:40px;height:40px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:none">' + icon('ic-file-dollar') + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:0.9rem">' + escapeHtml(p.codigo) + ' · ' + escapeHtml(p.clienteNombre || 'Sin cliente') + '</div>' +
        '<div style="font-size:0.78rem;color:var(--steel)">' + money(totales.total) + ' · ' + timeAgo(p.updatedAt) + '</div></div>' +
        statusPill(p.estado);
      card.addEventListener('click', () => openPresupuesto(p.id));
      wrap.appendChild(card);
    });
  }

  function renderPerfil() {
    $('#perfil-count-trabajos').textContent = DB.trabajos.length;
    $('#perfil-count-presupuestos').textContent = DB.presupuestos.length;
    $('#perfil-margen').value = DB.settings.margen;
    $('#perfil-iva').value = DB.settings.iva;
    $('#perfil-tarifahora').value = DB.settings.manoObra.tarifaHora;
    $('#perfil-horasjornada').value = DB.settings.manoObra.horasJornada;
    renderPerfilNormativa();
    renderPerfilSeguridad();
  }

  /* ============================================================
     CATÁLOGO DE PRECIOS — pantalla propia (Perfil → Catálogo de precios)
     ============================================================ */
  const CATALOGO_PRECIOS_GRUPOS = [
    {
      titulo: 'Cables unipolares ($/m)',
      campos: [{ key: 'cableUnipolar', tipo: 'mapa', etiqueta: (s) => s + ' mm²' }],
    },
    {
      titulo: 'Canalizaciones ($/m)',
      campos: [
        { key: 'canoCorrugado', tipo: 'mapa', etiqueta: (d) => 'Caño corrugado ' + d + ' mm' },
        { key: 'canoPvcRigido', tipo: 'mapa', etiqueta: (d) => 'Caño PVC rígido ' + d + ' mm' },
        { key: 'canoGalvanizado', tipo: 'mapa', etiqueta: (d) => 'Caño de acero galvanizado ' + d + ' mm' },
        { key: 'bandeja', tipo: 'mapa', etiqueta: (a) => 'Bandeja portacable ' + a + ' mm' },
      ],
    },
    {
      titulo: 'Herrajes y codos ($/un.)',
      campos: [
        { key: 'grampaOmega', tipo: 'plano', etiqueta: 'Grampa omega' },
        { key: 'mensulaBandeja', tipo: 'plano', etiqueta: 'Ménsula para bandeja' },
        { key: 'tacoFischer10mm', tipo: 'plano', etiqueta: 'Taco fischer 10mm' },
        { key: 'tornilloTuercaTaco10mm', tipo: 'plano', etiqueta: 'Tornillo cabeza tuerca para taco 10mm' },
        { key: 'tornilloTuerca8mm', tipo: 'plano', etiqueta: 'Tornillo con tuerca 8mm' },
        { key: 'codoPvcRigido', tipo: 'plano', etiqueta: 'Codo PVC rígido (cambio de dirección)' },
        { key: 'codoGalvanizado', tipo: 'plano', etiqueta: 'Codo caño galvanizado (cambio de dirección)' },
        { key: 'codoCajaBandeja', tipo: 'plano', etiqueta: 'Codo / caja de pase para bandeja' },
      ],
    },
    {
      titulo: 'Térmicas ($/un.)',
      campos: [
        { key: 'termicaUnipolarBase', tipo: 'plano', etiqueta: 'Térmica unipolar (hasta 40A)' },
        { key: 'termicaBipolarBase', tipo: 'plano', etiqueta: 'Térmica bipolar (hasta 40A)' },
        { key: 'termicaTetrapolarBase', tipo: 'plano', etiqueta: 'Térmica tetrapolar (hasta 40A)' },
      ],
      nota: 'De 50 a 63A se cobra 1,5× la bipolar; de 80 a 125A, 2,5× — no relevado, es un escalón proporcional. La unipolar tampoco está relevada: sale de la bipolar por proporción.',
    },
    {
      titulo: 'Puntos de luz y de toma ($/un.)',
      campos: [
        { key: 'cajaOctogonal', tipo: 'plano', etiqueta: 'Caja de embutir octogonal' },
        { key: 'portalamparas', tipo: 'plano', etiqueta: 'Portalámparas' },
        { key: 'llaveLuzSimple', tipo: 'plano', etiqueta: 'Llave de luz simple' },
        { key: 'cajaRectangular', tipo: 'plano', etiqueta: 'Caja de embutir rectangular' },
        { key: 'tomacorriente', tipo: 'plano', etiqueta: 'Tomacorriente' },
      ],
    },
    {
      titulo: 'Tablero eléctrico ($/un. según módulos)',
      campos: [{ key: 'tableroPuntos', tipo: 'tablero' }],
      nota: 'Gabinetes de pared de 12, 24, 36 y 48 módulos, en filas de 12. Se cotiza siempre la medida siguiente a lo que ocupan las llaves: para 20 módulos se compra el de 24. El de 48 módulos no está relevado, sale de prolongar la recta de los otros tres — confirmá el precio antes de presupuestar uno.',
    },
    {
      titulo: 'Kit de suministro nuevo ($/un.)',
      campos: [
        { key: 'cajaMedidor', tipo: 'plano', etiqueta: 'Caja para medidor' },
        { key: 'borneraTierra', tipo: 'plano', etiqueta: 'Bornera de tierra' },
        { key: 'borneraNeutro', tipo: 'plano', etiqueta: 'Bornera de neutro' },
        { key: 'jabalina', tipo: 'plano', etiqueta: 'Jabalina / electrodo de puesta a tierra' },
        { key: 'canoPvc1pulg3m', tipo: 'plano', etiqueta: 'Caño PVC 1" x 3m (puesta a tierra)' },
        { key: 'codoPvc1pulg', tipo: 'plano', etiqueta: 'Codo PVC 1" (puesta a tierra)' },
      ],
    },
  ];
  function precioRowHtml(labelHtml, value, onSet) {
    const inputId = 'pc-' + Math.random().toString(36).slice(2, 9);
    return { id: inputId, html: '<div class="light-stat-row"><span class="lbl">' + labelHtml + '</span><span class="val"><input class="input" style="min-height:34px;width:100px;text-align:right" type="number" id="' + inputId + '" value="' + value + '"></span></div>', onSet };
  }
  function renderCatalogoPrecios() {
    const wrap = $('#catalogo-precios-list');
    wrap.innerHTML = '';
    const precios = DB.settings.precios;
    const setters = [];
    CATALOGO_PRECIOS_GRUPOS.forEach((grupo) => {
      const rows = [];
      grupo.campos.forEach((campo) => {
        if (campo.tipo === 'plano') {
          const r = precioRowHtml(escapeHtml(campo.etiqueta), precios[campo.key], (v) => { precios[campo.key] = v; });
          rows.push(r);
        } else if (campo.tipo === 'mapa') {
          Object.keys(precios[campo.key]).map(Number).sort((a, b) => a - b).forEach((k) => {
            const r = precioRowHtml(escapeHtml(campo.etiqueta(k)), precios[campo.key][k], (v) => { precios[campo.key][k] = v; });
            rows.push(r);
          });
        } else if (campo.tipo === 'tablero') {
          precios.tableroPuntos.forEach((pt, i) => {
            const r = precioRowHtml('Hasta ' + pt.n + ' módulos', pt.p, (v) => { precios.tableroPuntos[i].p = v; });
            rows.push(r);
          });
        }
      });
      const details = el('details', { class: 'card card-pad' });
      details.innerHTML = '<summary class="section-label" style="margin:0">' + escapeHtml(grupo.titulo) + '</summary>' +
        (grupo.nota ? '<p style="font-size:0.76rem;color:var(--steel);margin:10px 0 0">' + escapeHtml(grupo.nota) + '</p>' : '') +
        '<div class="stack-sm" style="margin-top:10px">' + rows.map((r) => r.html).join('') + '</div>';
      wrap.appendChild(details);
      rows.forEach((r) => setters.push(r));
    });
    setters.forEach((r) => {
      $('#' + r.id).addEventListener('change', (e) => {
        r.onSet(Number(e.target.value) || 0);
        saveDB();
      });
    });
  }
  function resetCatalogoPrecios() {
    if (!confirm('Esto reemplaza todos los precios del catálogo por los valores de fábrica. ¿Continuar?')) return;
    DB.settings.precios = clonePrecios(DEFAULT_PRECIOS);
    saveDB();
    renderCatalogoPrecios();
    toast('Catálogo restablecido a los precios de fábrica');
  }

  /* ============================================================
     COPIA DE SEGURIDAD — exportar/importar todo el localStorage
     ============================================================ */
  function exportarBackup() {
    const fecha = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adonai-backup-' + fecha + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Copia de seguridad descargada');
  }
  function importarBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { toast('Archivo inválido'); return; }
      if (!data || !Array.isArray(data.trabajos) || !Array.isArray(data.presupuestos) || !data.settings) {
        toast('Archivo inválido'); return;
      }
      if (!confirm('Esto reemplaza TODOS los datos actuales de este dispositivo por los del archivo. ¿Continuar?')) return;
      DB = data;
      if (!DB.settings.precios) DB.settings.precios = clonePrecios(DEFAULT_PRECIOS);
      if (!DB.settings.manoObra) DB.settings.manoObra = { ...DEFAULT_MANO_OBRA };
      if (!DB.seq) DB.seq = { trabajo: 0, presupuesto: 0 };
      saveDB();
      location.reload();
    };
    reader.readAsText(file);
  }

  /* ============================================================
     PRESUPUESTO — detalle
     ============================================================ */
  let presActual = null;
  function calcularTotalesPresupuesto(p) {
    const costoTotal = (Number(p.materiales) || 0) + (Number(p.manoObra) || 0) + (Number(p.traslados) || 0) + (Number(p.otros) || 0);
    const subtotal = costoTotal * (1 + (Number(p.margen) || 0) / 100);
    const ivaMonto = subtotal * (Number(p.iva) || 0) / 100;
    const total = subtotal + ivaMonto;
    return { costoTotal, subtotal, ivaMonto, total };
  }

  function crearPresupuestoDesdeTrabajo(trabajoId) {
    const t = DB.trabajos.find((x) => x.id === trabajoId);
    const materialesCosto = t ? t.materiales.reduce((s, m) => s + (Number(m.cantidad) || 0) * (Number(m.precioUnit) || 0), 0) : 0;
    const p = {
      id: uid('P'), codigo: 'AE-' + new Date().getFullYear() + '-' + String(DB.presupuestos.length + 1).padStart(4, '0'),
      trabajoId: trabajoId || null, clienteNombre: t ? t.cliente.nombre : '',
      materiales: materialesCosto, manoObra: calcularManoObra(5), traslados: 0, otros: 0,
      margen: DB.settings.margen, iva: DB.settings.iva, validez: 15, formaPago: '50% anticipo / 50% final', plazo: 5,
      estado: 'borrador', createdAt: Date.now(), updatedAt: Date.now(),
    };
    DB.presupuestos.push(p);
    saveDB();
    return p;
  }

  function openPresupuesto(id) {
    presActual = DB.presupuestos.find((p) => p.id === id);
    if (!presActual) return;
    showView('presupuesto-detalle');
    renderPresupuestoDetalle();
  }

  function renderPresupuestoDetalle() {
    const p = presActual;
    $('#pres-codigo').textContent = 'Presupuesto ' + p.codigo;
    $('#pres-cliente-nombre').value = p.clienteNombre || '';
    $('#pres-cliente-nombre').readOnly = !!p.trabajoId;
    $('#pres-estado-pill').outerHTML = '<span id="pres-estado-pill" class="status-pill ' + (ESTADO_CLASS[p.estado] || 'status-draft') + '">' + (ESTADO_LABEL[p.estado] || p.estado) + '</span>';
    $('#pi-materiales').textContent = money(p.materiales);
    $('#pi-manoobra').value = p.manoObra;
    $('#pi-traslados').value = p.traslados;
    $('#pi-otros').value = p.otros;
    $('#pi-margen').value = p.margen;
    $('#pi-iva').value = p.iva;
    $('#pi-validez').value = p.validez;
    $('#pi-formapago').value = p.formaPago;
    $('#pi-plazo').value = p.plazo;
    recalcPresupuesto();
  }

  function recalcPresupuesto() {
    const p = presActual;
    p.manoObra = Number($('#pi-manoobra').value) || 0;
    p.traslados = Number($('#pi-traslados').value) || 0;
    p.otros = Number($('#pi-otros').value) || 0;
    p.margen = Number($('#pi-margen').value) || 0;
    p.iva = Number($('#pi-iva').value) || 0;
    p.validez = Number($('#pi-validez').value) || 0;
    p.formaPago = $('#pi-formapago').value;
    p.plazo = Number($('#pi-plazo').value) || 0;
    p.clienteNombre = $('#pres-cliente-nombre').value.trim();
    const t = calcularTotalesPresupuesto(p);
    $('#pi-costototal').textContent = money(t.costoTotal);
    $('#pi-subtotal').textContent = money(t.subtotal);
    $('#pi-ivamonto').textContent = money(t.ivaMonto);
    $('#pi-total').textContent = money(t.total);
    $('#pc-cliente').textContent = p.clienteNombre || 'Cliente';
    $('#pc-total').textContent = money(t.total);
  }

  function savePresupuesto() {
    recalcPresupuesto();
    presActual.updatedAt = Date.now();
    const idx = DB.presupuestos.findIndex((x) => x.id === presActual.id);
    if (idx >= 0) DB.presupuestos[idx] = presActual;
    saveDB();
  }

  /* ============================================================
     EVENTOS GLOBALES
     ============================================================ */
  function wireGlobalNav() {
    $$('.nav-item').forEach((b) => b.addEventListener('click', () => showView(b.dataset.nav)));
    $$('[data-back]').forEach((b) => b.addEventListener('click', () => {
      if (b.closest('#view-relevamiento')) { persistDraft(); }
      if (b.closest('#view-presupuesto-detalle')) { savePresupuesto(); }
      // Retrocede en el historial (igual que el botón físico/gesto de "atrás"), en vez de
      // apilar una pantalla nueva — así los dos caminos de volver quedan sincronizados.
      history.back();
    }));
    $$('.action-tile[data-action]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.action;
      if (a === 'nuevo-relevamiento') startRelevamiento();
      else if (a === 'calcular-conductor') { showView('conductor'); calcularConductorForm(); }
      else if (a === 'calculos-electricos') showView('calculos');
      else if (a === 'nuevo-presupuesto') { presActual = crearPresupuestoDesdeTrabajo(null); showView('presupuesto-detalle'); renderPresupuestoDetalle(); }
      else if (a === 'trabajos') showView('trabajos');
      else if (a === 'presupuestos') showView('presupuestos');
    }));
    $('#btn-ver-todos').addEventListener('click', () => showView('trabajos'));
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
      const g = b.dataset.goto;
      if (g === 'conductor') { showView('conductor'); calcularConductorForm(); }
      if (g === 'potencia-libre') { startRelevamiento(); wizardStep = 2; renderWizardStep(); }
    }));
    $('#btn-trabajos-nuevo').addEventListener('click', startRelevamiento);
    $('#btn-presupuestos-nuevo').addEventListener('click', () => { presActual = crearPresupuestoDesdeTrabajo(null); showView('presupuesto-detalle'); renderPresupuestoDetalle(); });
  }

  function wireCargasCircuitos() {
    $('#btn-add-carga').addEventListener('click', () => {
      draft.cargas.push({ id: uid('c'), nombre: '', categoria: 'iluminacion', potenciaW: 100, cantidad: 1, cosPhi: 1 });
      renderCargasList(); renderPotenciaResultado();
    });
    $('#f-sistema').addEventListener('change', renderPotenciaResultado);
    $('#btn-add-circuito').addEventListener('click', () => {
      const sistema = SISTEMAS[draft.sistemaId];
      draft.circuitos.push({ id: uid('m2'), nombre: '', ib: 10, v: sistema.v, fases: sistema.fases, l: 15,
        material: 'cobre', metodo: 'embutido', aislacion: 'pvc', tempAmb: 30, agrupados: 1,
        caidaMax: CAIDA_MAX_DEFAULT.fuerza, cosPhi: 1, uso: 'fuerza' });
      renderCircuitosList();
    });
    $('#btn-add-material').addEventListener('click', () => {
      draft.materiales.push({ id: uid('mat'), nombre: '', unidad: 'un.', cantidad: 1, precioUnit: 0, auto: false });
      renderMaterialesList();
    });
    $('#btn-regenerar-materiales').addEventListener('click', () => {
      draft.materiales = generarMateriales(draft.circuitos, draft);
      renderMaterialesList();
      toast('Materiales regenerados desde los circuitos');
    });
    $('#resumen-estado').addEventListener('change', () => { draft.estado = $('#resumen-estado').value; });
    $('#resumen-diferencial-sensibilidad').addEventListener('change', () => {
      draft.proteccionGeneral.diferencialSensibilidad = Number($('#resumen-diferencial-sensibilidad').value);
    });
    $('#btn-enviar-revision').addEventListener('click', () => { persistDraft('revision'); toast('Enviado a revisión'); showView('home'); });
    $('#btn-crear-presupuesto').addEventListener('click', () => {
      persistDraft();
      const p = crearPresupuestoDesdeTrabajo(draft.id);
      presActual = p;
      showView('presupuesto-detalle');
      renderPresupuestoDetalle();
    });
  }

  function wireConductor() {
    $$('#cond-fases button').forEach((b) => b.addEventListener('click', () => {
      $$('#cond-fases button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      renderCondTensiones();
      calcularConductorForm();
    }));
    $('#cond-dato').addEventListener('change', () => { renderCondDatoLabel(); calcularConductorForm(); });
    ['#cond-tension', '#cond-valor', '#cond-cosphi', '#cond-longitud', '#cond-material', '#cond-aislacion', '#cond-uso', '#cond-metodo', '#cond-temp', '#cond-agrupados', '#cond-caidamax']
      .forEach((sel) => $(sel).addEventListener('input', calcularConductorForm));
    $('#btn-cond-guardar').addEventListener('click', () => { calcularConductorForm(); toast('Cálculo guardado en el dispositivo'); });
    $('#btn-cond-a-relevamiento').addEventListener('click', () => {
      const r = calcularConductorForm();
      if (!draft) startRelevamiento();
      const fases = Number($('#cond-fases .active').dataset.fases);
      draft.circuitos.push({
        id: uid('cc'), nombre: 'Circuito (' + $('#cond-uso').value + ')', ib: r.ib, v: Number($('#cond-tension').value), fases,
        l: Number($('#cond-longitud').value) || 0, material: $('#cond-material').value, metodo: $('#cond-metodo').value,
        tempAmb: Number($('#cond-temp').value) || 30, agrupados: Number($('#cond-agrupados').value) || 1,
        caidaMax: Number($('#cond-caidamax').value) || 5, cosPhi: Number($('#cond-cosphi').value) || 1, uso: $('#cond-uso').value,
      });
      wizardStep = 3; renderWizardForm(); showView('relevamiento'); renderWizardStep();
      toast('Circuito agregado al relevamiento');
    });
    $('#btn-cond-a-presupuesto').addEventListener('click', () => {
      const r = calcularConductorForm();
      const seccionTxt = r.apto ? r.seccionAdoptada + ' mm² ' + ($('#cond-material').value === 'cobre' ? 'Cu' : 'Al') : 'sin sección apta';
      const p = crearPresupuestoDesdeTrabajo(null);
      p.clienteNombre = 'Conductor ' + seccionTxt;
      presActual = p;
      saveDB();
      showView('presupuesto-detalle');
      renderPresupuestoDetalle();
    });
  }

  function wirePresupuesto() {
    $$('#pres-vista-toggle button').forEach((b) => b.addEventListener('click', () => {
      $$('#pres-vista-toggle button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const vista = b.dataset.vista;
      $('#pres-vista-interno').hidden = vista !== 'interno';
      $('#pres-vista-cliente').hidden = vista !== 'cliente';
    }));
    ['#pi-manoobra', '#pi-traslados', '#pi-otros', '#pi-margen', '#pi-iva', '#pi-validez', '#pi-formapago', '#pres-cliente-nombre']
      .forEach((sel) => $(sel).addEventListener('input', () => { recalcPresupuesto(); savePresupuesto(); }));
    // El plazo maneja la mano de obra (días × horas × tarifa, ver Perfil). Se puede seguir
    // ajustando "Mano de obra" a mano después — ese valor manual queda hasta que el plazo
    // vuelva a cambiar, igual que "Regenerar materiales" no persigue una edición manual.
    $('#pi-plazo').addEventListener('input', () => {
      $('#pi-manoobra').value = calcularManoObra($('#pi-plazo').value);
      recalcPresupuesto();
      savePresupuesto();
    });
    $('#btn-pres-aprobar').addEventListener('click', () => {
      presActual.estado = 'aprobado';
      savePresupuesto();
      renderPresupuestoDetalle();
      toast('Presupuesto aprobado');
    });
    $('#btn-pres-pdf').addEventListener('click', () => generarPdfPresupuesto(presActual));
    $('#btn-pres-doc').addEventListener('click', () => generarPdfPresupuesto(presActual));
    $('#btn-pres-whatsapp').addEventListener('click', () => compartirPdfPorWhatsapp(presActual));
  }

  const NATURALEZA_DESC = {
    'Trámite': 'Gestión de trámite ante UTE u organismo correspondiente, sin trabajo de instalación en el lugar.',
    'Instalación nueva': 'Instalación eléctrica nueva completa, incluye tablero, protección general y puesta a tierra.',
    'Modificación': 'Modificación, ampliación o reparación sobre una instalación eléctrica existente.',
    'Emergencia': 'Intervención de urgencia para resolver una falla o riesgo inmediato.',
  };
  function logoDataUrl() {
    return fetch(LOGO_SRC).then((r) => r.blob()).then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    })).catch(() => null);
  }

  async function construirPdfPresupuesto(p) {
    savePresupuesto();
    const t = calcularTotalesPresupuesto(p);
    const trabajo = p.trabajoId ? DB.trabajos.find((tr) => tr.id === p.trabajoId) : null;
    const materialesItems = trabajo && trabajo.materiales && trabajo.materiales.length ? trabajo.materiales : null;
    const naturaleza = trabajo ? trabajo.obra.naturaleza : null;
    const logo = await logoDataUrl();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = 18;

    if (logo) doc.addImage(logo, 'PNG', margin, y, 12, 12);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(23, 23, 25);
    doc.text('ADONAI ELECTRICAL', margin + 16, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(111, 114, 119);
    doc.text('Energía con propósito', margin + 16, y + 10);
    y += 16;
    doc.setDrawColor(11, 11, 12); doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(23, 23, 25);
    doc.text('Presupuesto ' + p.codigo, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
    doc.text('Cliente / proyecto: ' + (p.clienteNombre || '—'), margin, y);
    y += 6;

    if (naturaleza) {
      const descLines = doc.splitTextToSize(NATURALEZA_DESC[naturaleza] || '', pageWidth - 2 * margin - 8);
      const boxH = 8 + descLines.length * 5 + 7;
      doc.setFillColor(244, 244, 245);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, boxH, 2, 2, 'F');
      let ty = y + 7;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(23, 23, 25);
      doc.text(naturaleza, margin + 4, ty);
      ty += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(23, 23, 25);
      doc.text(descLines, margin + 4, ty);
      ty += descLines.length * 5;
      doc.setTextColor(111, 114, 119);
      doc.text('Plazo estimado: ' + p.plazo + ' días', margin + 4, ty);
      y += boxH + 8;
    } else {
      y += 4;
    }

    if (trabajo && trabajo.circuitos && trabajo.circuitos.length) {
      const filasCircuitos = trabajo.circuitos
        .map((c) => ({ c, calc: calcularCircuito(c) }))
        .filter(({ calc }) => calc.apto)
        .map(({ c, calc }) => [c.nombre || 'Circuito', calc.seccionAdoptada + ' mm²', calc.breaker + ' A curva ' + calc.curva]);
      if (filasCircuitos.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
        doc.text('CIRCUITOS', margin, y);
        y += 4;
        doc.autoTable({
          startY: y,
          margin: { left: margin, right: margin },
          head: [['Circuito', 'Sección de cable', 'Protección']],
          body: filasCircuitos,
          theme: 'plain',
          styles: { fontSize: 9, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
          headStyles: { textColor: [111, 114, 119], fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
          columnStyles: { 1: { halign: 'right', cellWidth: 36 }, 2: { halign: 'right', cellWidth: 40 } },
        });
        y = doc.lastAutoTable.finalY + 4;
        // Cita la fuente normativa usada por el motor de cálculo (NORMATIVE_PACK), sin
        // afirmar "verificado" — el paquete normativo puede seguir en estado "pendiente"
        // (falta confirmación de un electricista matriculado), eso no se le oculta al
        // cliente pero tampoco se sobreafirma acá.
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(111, 114, 119);
        const normLines = doc.splitTextToSize('Secciones y protecciones calculadas según ' + NORMATIVE_PACK.nombre + '.', pageWidth - 2 * margin);
        doc.text(normLines, margin, y);
        y += normLines.length * 4 + 8;
      }
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
    doc.text('MATERIALES', margin, y);
    y += 4;
    // El listado de materiales va como alcance del trabajo, sin precios: al
    // cliente se le informa qué incluye, no cuánto cuesta cada pieza.
    const filasMateriales = materialesItems
      ? materialesItems.map((m) => [m.nombre, fmt(m.cantidad, 0) + ' ' + m.unidad])
      : [['Materiales de la instalación', '']];
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Material', 'Cant.']],
      body: filasMateriales,
      theme: 'plain',
      styles: { fontSize: 9, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
      headStyles: { textColor: [111, 114, 119], fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
      columnStyles: { 1: { halign: 'right', cellWidth: 30 } },
    });
    y = doc.lastAutoTable.finalY + 12;

    // Del dinero, sólo el total. El desglose de costos y el margen son datos
    // internos y no tienen por qué viajar en el presupuesto del cliente.
    const altoCaja = 22;
    doc.setFillColor(244, 244, 245);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, altoCaja, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
    doc.text('TOTAL DEL PRESUPUESTO', margin + 6, y + 9);
    doc.setFontSize(16); doc.setTextColor(23, 23, 25);
    doc.text(money(t.total), pageWidth - margin - 6, y + 14, { align: 'right' });
    y += altoCaja + 10;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
    doc.text('CONDICIONES', margin, y);
    y += 4;
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      body: [
        ['Forma de pago', p.formaPago],
        ['Validez de la oferta', p.validez + ' días'],
        ['Plazo de ejecución', p.plazo + ' días'],
      ],
      theme: 'plain',
      styles: { fontSize: 9, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
      columnStyles: { 1: { halign: 'right' } },
    });
    y = doc.lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(111, 114, 119);
    const incluye = doc.splitTextToSize('El presupuesto contiene costo de materiales y mano de obra incluidos.', pageWidth - 2 * margin);
    doc.text(incluye, margin, y);
    y += incluye.length * 4;

    // Últimas hojas: el frente del tablero, una con la tapa interna puesta
    // —como queda terminado— y otra del interior abierto con los conductores.
    // Si el navegador no puede dibujarlas, el presupuesto sale igual.
    if (trabajo) {
      for (const vista of ['cerrado', 'abierto']) {
        try {
          const cv = await tabDibujar(trabajo, vista, { titulo: 'Presupuesto ' + p.codigo });
          if (!cv) continue;
          doc.addPage();
          let ty = 18;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(23, 23, 25);
          doc.text(vista === 'cerrado' ? 'Tablero terminado' : 'Interior del tablero', margin, ty);
          ty += 6;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(111, 114, 119);
          const nota = vista === 'cerrado'
            ? 'Así queda el tablero con la tapa interna colocada, armado con las protecciones calculadas para esta obra.'
            : 'Interior con las llaves sobre el riel y el recorrido de los conductores. Los cables están dibujados a modo ilustrativo.';
          const lineas = doc.splitTextToSize(nota + ' No es un plano constructivo.', pageWidth - 2 * margin);
          doc.text(lineas, margin, ty);
          ty += lineas.length * 4 + 6;
          const maxW = pageWidth - 2 * margin;
          const maxH = doc.internal.pageSize.getHeight() - ty - 18;
          let iw = maxW, ih = cv.height / cv.width * iw;
          if (ih > maxH) { ih = maxH; iw = cv.width / cv.height * ih; }
          doc.addImage(cv.toDataURL('image/png'), 'PNG', margin + (maxW - iw) / 2, ty, iw, ih, undefined, 'FAST');
        } catch (e) { /* sin hoja de tablero */ }
      }
    }

    return { doc, filename: p.codigo + '.pdf' };
  }

  async function generarPdfPresupuesto(p) {
    const { doc, filename } = await construirPdfPresupuesto(p);
    doc.save(filename);
  }

  // Uruguay: normaliza a formato internacional sin "+" ni espacios para wa.me/api.whatsapp.com
  // (099xxxxxx -> 598 99xxxxxx). Si ya viene con 598 o no hay número, se deja tal cual.
  function numeroWhatsapp(raw) {
    const digitos = (raw || '').replace(/\D/g, '');
    if (!digitos) return '';
    if (digitos.startsWith('598')) return digitos;
    if (digitos.startsWith('0')) return '598' + digitos.slice(1);
    return '598' + digitos;
  }

  async function compartirPdfPorWhatsapp(p) {
    const { doc, filename } = await construirPdfPresupuesto(p);
    const mensaje = 'Hola' + (p.clienteNombre ? ' ' + p.clienteNombre : '') + ', te comparto el presupuesto ' + p.codigo + ' de ADONAI ELECTRICAL.';
    const file = new File([doc.output('blob')], filename, { type: 'application/pdf' });
    // Camino principal (celulares con Web Share API): abre el selector nativo de "compartir"
    // con el PDF ya adjunto — el usuario toca WhatsApp y elige el contacto ahí mismo.
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Presupuesto ' + p.codigo, text: mensaje });
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // el usuario cerró el selector, no hacer nada más
      }
    }
    // Camino de respaldo (desktop, o navegadores sin Web Share de archivos): no hay forma de
    // adjuntar el PDF automáticamente, así que se descarga y se abre WhatsApp con el mensaje
    // listo para que el usuario lo adjunte a mano en el chat.
    doc.save(filename);
    const trabajo = p.trabajoId ? DB.trabajos.find((tr) => tr.id === p.trabajoId) : null;
    const numero = trabajo && trabajo.cliente ? numeroWhatsapp(trabajo.cliente.whatsapp || trabajo.cliente.telefono) : '';
    const url = 'https://api.whatsapp.com/send?' + (numero ? 'phone=' + numero + '&' : '') + 'text=' + encodeURIComponent(mensaje + ' Te lo adjunto en este chat.');
    window.open(url, '_blank');
    toast('PDF descargado — adjuntalo en el chat que se abrió');
  }

  function wirePerfil() {
    $('#perfil-margen').addEventListener('change', () => { DB.settings.margen = Number($('#perfil-margen').value) || 0; saveDB(); });
    $('#perfil-iva').addEventListener('change', () => { DB.settings.iva = Number($('#perfil-iva').value) || 0; saveDB(); });
    $('#perfil-tarifahora').addEventListener('change', () => { DB.settings.manoObra.tarifaHora = Number($('#perfil-tarifahora').value) || 0; saveDB(); });
    $('#perfil-horasjornada').addEventListener('change', () => { DB.settings.manoObra.horasJornada = Number($('#perfil-horasjornada').value) || 0; saveDB(); });
    $('#btn-abrir-catalogo').addEventListener('click', () => { showView('catalogo-precios'); });
    $('#btn-exportar-backup').addEventListener('click', exportarBackup);
    $('#btn-importar-backup').addEventListener('click', () => { $('#input-importar-backup').click(); });
    $('#input-importar-backup').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) importarBackup(file);
      e.target.value = '';
    });
    $('#btn-instalar').addEventListener('click', () => {
      if (window.deferredInstallPrompt) {
        window.deferredInstallPrompt.prompt();
      } else {
        toast('Usá "Compartir" → "Agregar a inicio" en tu navegador para instalarla');
      }
    });
    $('#btn-pin-activar').addEventListener('click', activarPin);
    $('#btn-pin-quitar').addEventListener('click', quitarPin);
  }
  function wireCatalogoPrecios() {
    $('#btn-restablecer-precios').addEventListener('click', resetCatalogoPrecios);
  }

  function renderPerfilNormativa() {
    $('#perfil-norm-nombre').textContent = NORMATIVE_PACK.nombre;
    $('#perfil-norm-version').textContent = NORMATIVE_PACK.version;
    $('#perfil-norm-motor').textContent = MOTOR_VERSION;
    $('#perfil-norm-estado').innerHTML = '<span class="status-pill ' + (ESTADO_PACK_CLASS[NORMATIVE_PACK.estado] || 'status-draft') + '">' +
      (ESTADO_PACK_LABEL[NORMATIVE_PACK.estado] || NORMATIVE_PACK.estado) + '</span>';
    $('#perfil-norm-notas').textContent = NORMATIVE_PACK.notas;
  }

  /* ============================================================
     PIN DE BLOQUEO — bloqueo de pantalla simple, no es cifrado real
     ============================================================ */
  async function sha256Hex(text) {
    const enc = new TextEncoder().encode('adonai-ht::' + text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function hasPinLock() {
    return !!(DB.settings && DB.settings.pinHash);
  }
  function showLockScreen() {
    const ls = $('#lock-screen');
    if (!ls) return;
    ls.hidden = false;
    $('#lock-error').hidden = true;
    $('#lock-olvide-nota').hidden = true;
    const input = $('#lock-pin-input');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
  }
  function hideLockScreen() {
    const ls = $('#lock-screen');
    if (ls) ls.hidden = true;
  }
  async function intentarDesbloquear() {
    const input = $('#lock-pin-input');
    const val = (input && input.value) || '';
    if (!val) return;
    const hash = await sha256Hex(val);
    if (hash === DB.settings.pinHash) {
      hideLockScreen();
    } else {
      $('#lock-error').hidden = false;
      input.value = '';
      input.focus();
    }
  }
  function wireLockScreen() {
    $('#btn-lock-unlock').addEventListener('click', intentarDesbloquear);
    $('#lock-pin-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') intentarDesbloquear(); });
    $('#btn-lock-olvide').addEventListener('click', () => {
      const nota = $('#lock-olvide-nota');
      nota.hidden = !nota.hidden;
    });
  }
  function renderPerfilSeguridad() {
    const activo = hasPinLock();
    $('#perfil-pin-estado').textContent = activo ? 'Activado' : 'Desactivado';
    $('#perfil-pin-set').hidden = activo;
    $('#perfil-pin-quitar').hidden = !activo;
    if (!activo) { $('#perfil-pin-nuevo').value = ''; $('#perfil-pin-confirmar').value = ''; }
  }
  async function activarPin() {
    const a = $('#perfil-pin-nuevo').value.trim();
    const b = $('#perfil-pin-confirmar').value.trim();
    if (!/^\d{4}$/.test(a)) { toast('El PIN debe tener 4 dígitos'); return; }
    if (a !== b) { toast('Los PIN no coinciden'); return; }
    DB.settings.pinHash = await sha256Hex(a);
    saveDB();
    toast('Bloqueo por PIN activado');
    renderPerfilSeguridad();
  }
  function quitarPin() {
    delete DB.settings.pinHash;
    saveDB();
    toast('Bloqueo por PIN desactivado');
    renderPerfilSeguridad();
  }

  /* ============================================================
     TEMA (claro / oscuro) Y FECHA
     ============================================================ */
  const THEME_KEY = 'adonai_ht_theme';
  function storedTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function currentTheme() {
    const s = storedTheme();
    if (s === 'light' || s === 'dark') return s;
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    const btn = $('#btn-theme-toggle');
    const iconUse = document.querySelector('#theme-toggle-icon use');
    if (btn) btn.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    if (iconUse) iconUse.setAttribute('href', mode === 'dark' ? '#ic-sun' : '#ic-moon');
  }
  function wireTheme() {
    applyTheme(currentTheme());
    $('#btn-theme-toggle').addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    });
  }
  function renderFecha() {
    const elDate = $('#util-date');
    if (!elDate) return;
    const d = new Date();
    let txt = '';
    try { txt = d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long' }); }
    catch (e) { txt = d.toLocaleDateString(); }
    if (txt) txt = txt.charAt(0).toUpperCase() + txt.slice(1);
    elDate.textContent = txt;
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    document.querySelectorAll('[data-logo]').forEach((img) => { img.src = LOGO_SRC; });
    try { document.documentElement.style.setProperty('--watermark-src', 'url("' + LOGO_SRC + '")'); } catch (e) {}
    wireTheme();
    renderFecha();
    wireLockScreen();
    if (hasPinLock()) showLockScreen();
    wireGlobalNav();
    wireWizardNav();
    wireCargasCircuitos();
    wireConductor();
    wirePresupuesto();
    wirePerfil();
    wireCatalogoPrecios();
    renderCondTensiones();
    renderCondDatoLabel();
    calcularConductorForm();
    showView('home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
