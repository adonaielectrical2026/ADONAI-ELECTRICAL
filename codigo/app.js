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
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Aire acondicionado inverter 12000 BTU', w: 1300, cosPhi: 0.95, equipo: 'variador_mono' },
    { cat: 'cargaFija', grupo: 'Climatización', nombre: 'Aire acondicionado inverter 18000 BTU', w: 1900, cosPhi: 0.95, equipo: 'variador_mono' },
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
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Bomba de agua 1/2 HP', w: 550, cosPhi: 0.8 , uso: 'motor'},
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Bomba de agua 1 HP', w: 1100, cosPhi: 0.8 , uso: 'motor'},
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Bomba de piscina', w: 750, cosPhi: 0.8 , uso: 'motor'},
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Portón eléctrico', w: 400, cosPhi: 0.8 },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Cargador de auto eléctrico', w: 7400, cosPhi: 1, equipo: 'cargador_ve' },
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Motor / otro', w: 750, cosPhi: 0.8 , uso: 'motor'},
    { cat: 'cargaFija', grupo: 'Otros', nombre: 'Inversor fotovoltaico', w: 3000, cosPhi: 1, equipo: 'fotovoltaica' },
  ];
  // Uso del circuito. Define la sección mínima reglamentaria, la curva de la
  // térmica y la caída de tensión admisible, así que tiene que poder elegirse:
  // una térmica de iluminación va en curva B y una de fuerza en C.
  const USOS = [
    { id: 'iluminacion', label: 'Iluminación' },
    { id: 'tomacorrientes', label: 'Tomacorrientes de uso general' },
    { id: 'fuerza', label: 'Electrodomésticos / carga fija' },
    { id: 'motor', label: 'Motor o bomba (arranque fuerte)' },
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
  // En monofásica todo va bipolar menos iluminación, que va unipolar con el
  // neutro a bornera. En trifásica, tetrapolar.
  function polosPorDefecto(circuito) {
    // En IT 230 V no se presupone neutro: un circuito monofásico usa dos
    // conductores activos y debe cortarlos ambos; uno trifásico usa 3 polos.
    if (circuito.sistemaId === 'tri_it') return circuito.fases === 1 ? 2 : 3;
    if (circuito.fases !== 1) return 4;
    return circuito.uso === 'iluminacion' ? 1 : 2;
  }
  function polosDe(circuito) {
    const p = Number(circuito.polos);
    if (p === 1 || p === 2 || p === 3 || p === 4) return p;
    return polosPorDefecto(circuito);
  }
  function opcionesPolos(circuito) {
    if (circuito.sistemaId === 'tri_it') {
      return circuito.fases === 1
        ? [{ v: 2, label: 'Bipolar — corta los dos conductores activos' }]
        : [{ v: 3, label: 'Tripolar — corta las tres fases' }];
    }
    return circuito.fases === 1
      ? [{ v: 1, label: 'Unipolar — corta la fase' }, { v: 2, label: 'Bipolar — corta fase y neutro' }]
      : [{ v: 3, label: 'Tripolar — corta las fases' }, { v: 4, label: 'Tetrapolar — fases y neutro' }];
  }
  // El tablero lleva bornera de neutro sólo en sistemas que realmente lo
  // tienen y si alguna llave deja ese neutro fuera de la protección.
  function necesitaBorneraNeutro(circuitos, sistema) {
    if (sistema && sistema.id === 'tri_it') return false;
    return (circuitos || []).some((c) => polosDe(c) === 1 || polosDe(c) === 3);
  }

  const SISTEMAS = {
    mono: { id: 'mono', label: 'Monofásico 230V', v: 230, fases: 1 },
    tri_it: { id: 'tri_it', label: 'Trifásico 230V (sistema IT)', v: 230, fases: 3 },
    tri_tt: { id: 'tri_tt', label: 'Trifásico 400V (sistema TT)', v: 400, fases: 3 },
  };
  function tensionDeCircuito(sistema, fasesCircuito) {
    // En los tres sistemas de la app, un circuito monofásico se calcula a
    // 230 V: fase-neutro en TT 400/230 y entre dos conductores activos en IT
    // 230 V. Un circuito trifásico usa la tensión de línea del suministro.
    return Number(fasesCircuito) === 3 ? sistema.v : 230;
  }

  // Potencias normalizadas de uso general publicadas por UTE. Los escalones de
  // 1,4 / 2,0 / 2,5 / 3,0 kW existen, pero son para destinos específicos: no se
  // sugieren automáticamente para una instalación general.
  const MONO_STEPS = [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5];
  const MONO_STEPS_RESTRINGIDOS = [1.4, 2, 2.5, 3];
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
  // Caída de tensión, RBT-UTE Capítulo II - Anexo §8: el reglamento la plantea
  // por conductividad, no por resistividad.
  //     monofásico   e = 2·L·W / (K·S·V)
  //     trifásico    e =   L·W / (K·S·V)
  // Con W = V·I·cosφ (o √3·V·I·cosφ) queda e = 2·L·I·cosφ/(K·S), que es como lo
  // resuelve la app.
  //
  // K: UTE da la conductividad a 25 °C (56,9 cobre, 34,7 aluminio), pero cuando
  // la sección se dimensiona por capacidad térmica —que es lo que hace la app—
  // indica usar la de la temperatura de servicio de la aislación: 70 °C el PVC
  // y 90 °C el XLPE. Esos valores salen de la resistividad a 20 °C corregida
  // por temperatura (cobre 0,01724 y α 0,00393; aluminio 0,02826 y α 0,00403).
  const CONDUCTIVIDAD_UTE = {
    cobre: { pvc: 48.4, xlpe: 45.5, c25: 56.9 },
    aluminio: { pvc: 29.4, xlpe: 27.6, c25: 34.7 },
  };
  function getConductividadUTE(material, aislacion) {
    const mat = CONDUCTIVIDAD_UTE[material === 'aluminio' ? 'aluminio' : 'cobre'];
    return mat[aislacion === 'xlpe' ? 'xlpe' : 'pvc'];
  }
  // Anexo §3.3.2: conductores expuestos al sol, corriente admisible x 0,90.
  const FACTOR_SOL_UTE = 0.90;
  function getSolarFactorUTE(expuesto) { return expuesto ? FACTOR_SOL_UTE : 1; }
  // Los interruptores termomagnéticos domiciliarios (IEC 60898) tienen corriente
  // convencional de disparo I2 = 1,45·In, así que la segunda condición de la
  // IEC 60364-4-43 §431.4.2 —I2 <= 1,45·Iz— se cumple siempre que In <= Iz. Para
  // fusibles u otros dispositivos hay que mirar la curva del fabricante.
  const FACTOR_I2_MCB = 1.45;
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
  // Temperatura ambiente de cálculo: siempre 30 °C, que es el criterio de la
  // empresa para toda la obra al aire o en conducto no enterrado. Queda editable
  // circuito por circuito para un caso que lo justifique, pero no se sugiere
  // ninguna otra.
  const TEMP_AMBIENTE_DEFECTO = 30;
  // Caño enterrado (supuesto 1, cerrado el 22/9/2026): UTE y el Reglamento de
  // Baja Tensión toman como condición normal de diseño una temperatura de
  // terreno de 25 °C a 0,5-0,7 m de profundidad y una resistividad térmica de
  // 1,0 K·m/W. La temperatura se propone acá; la resistividad alimenta además
  // el factor de la Tabla B.52.16 (factorTerrenoEnterrado), donde 1,0 K·m/W da
  // 1,18 — una condición más favorable que la referencia de 2,5 de la tabla.
  // Ambos valores quedan editables si hay un estudio de suelo real.
  const TEMP_TERRENO_ENTERRADO_DEFECTO = 25;
  const RESISTIVIDAD_TERRENO_UTE_DEFECTO = 1.0;

  const METODO_LABEL = {
    embutido: 'Embutido en pared',
    amurado_pvc: 'Amurado — caño PVC rígido',
    amurado_galvanizado: 'Amurado — caño de acero galvanizado',
    bandeja: 'Bandeja perforada bajo techo',
    aire: 'Al aire bajo techo / exterior protegido',
    enterrado: 'Enterrado en caño',
  };
  const BREAKER_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  // Curva de la térmica según lo que alimenta el circuito:
  //   B: cargas resistivas, de arranque suave — iluminación.
  //   C: cargas inductivas moderadas, la más común y la más versátil — los
  //      tomacorrientes de uso general, que terminan alimentando cualquier
  //      electrodoméstico, y las cargas fijas tipo lavarropas, heladera o aire.
  //   D: cargas inductivas con picos fuertes de arranque — motores y bombas.
  const CURVA_SUGERIDA = { iluminacion: 'B', tomacorrientes: 'C', fuerza: 'C', motor: 'D' };
  // IEC 60898-1: banda de disparo magnético instantáneo aproximada por curva.
  // Se usa para informar/validar la elección, no para afirmar selectividad entre
  // interruptores; esa verificación requiere curvas/tablas del fabricante.
  const CURVA_MAGNETICA_IEC = {
    B: { min: 3, max: 5, uso: 'cargas con bajo pico de arranque / circuitos largos o Icc mínima baja' },
    C: { min: 5, max: 10, uso: 'uso general' },
    D: { min: 10, max: 20, uso: 'motores, transformadores y cargas con fuerte corriente de arranque' },
  };
  function curvaProteccionDe(p) {
    const manual = String((p && p.curvaProteccion) || '').toUpperCase();
    if (CURVA_MAGNETICA_IEC[manual]) return manual;
    return CURVA_SUGERIDA[(p && p.uso) || 'fuerza'] || 'C';
  }
  const CURVA_DESCRIPCION = {
    B: 'Cargas resistivas, de arranque suave: iluminación.',
    C: 'Cargas inductivas moderadas: tomacorrientes de uso general, lavarropas, heladera, aire acondicionado.',
    D: 'Cargas inductivas con pico fuerte de arranque: motores y bombas.',
  };

  // Paso 11: cortocircuito mínimo al final de línea y tiempo de desconexión.
  // Para afirmar disparo magnético garantizado se usa el extremo superior de
  // la banda IEC 60898-1: B=5·In, C=10·In, D=20·In.
  function umbralMagneticoGarantizado(curva, inA) {
    const r = CURVA_MAGNETICA_IEC[String(curva || '').toUpperCase()];
    const inNom = Number(inA);
    return r && inNom > 0 ? r.max * inNom : null;
  }
  function evaluarIccMinimaYDesconexion(p, inA, curva, i2tAdmisible) {
    const out = { iccMinA:null, fuente:null, umbralMagneticoA:null, relacionIn:null, magnetico:null,
      tiempoAdmisibleS:null, tiempoActuacionS:null, fuenteTiempo:null, cumpleTiempo:null, cumpleIccMinima:null,
      notas:[], pendientes:[], causas:[] };
    const manualI = Number(p && p.iccMinFinalA);
    const z = Number(p && p.zCortoFinalOhm);
    const v = Number(p && p.v) || 230;
    if (manualI > 0) { out.iccMinA = manualI; out.fuente = 'informada'; }
    else if (z > 0) { out.iccMinA = v / z; out.fuente = 'impedancia'; }

    const umbral = umbralMagneticoGarantizado(curva, inA);
    out.umbralMagneticoA = umbral;
    if (out.iccMinA !== null && Number(inA) > 0) out.relacionIn = out.iccMinA / Number(inA);

    if (out.iccMinA !== null && umbral !== null) {
      out.magnetico = out.iccMinA >= umbral;
      if (out.magnetico) {
        out.notas.push('La Icc mínima alcanza ' + fmt(out.relacionIn,1) + '·In y supera el extremo superior de la banda ' + curva + ' (' + fmt(umbral,0) + ' A): se garantiza entrada en la zona magnética IEC 60898-1.');
      } else {
        out.notas.push('La Icc mínima al final (' + fmt(out.iccMinA,0) + ' A) queda por debajo de ' + fmt(umbral,0) + ' A (' + (CURVA_MAGNETICA_IEC[curva] ? CURVA_MAGNETICA_IEC[curva].max : '?') + '·In): no se garantiza la zona magnética; puede actuar la zona térmica según la curva del fabricante.');
      }
    } else if ((p && p.tipoProteccion || 'mcb') === 'mcb') {
      out.pendientes.push('Falta la Icc mínima al final del circuito o la impedancia de lazo de cortocircuito para comprobar el despeje en el punto más desfavorable.');
    }

    const adm = Number(i2tAdmisible);
    if (out.iccMinA !== null && adm > 0) {
      out.tiempoAdmisibleS = adm / Math.pow(out.iccMinA, 2);
      out.notas.push('Por UTE RBT Cap. II - Anexo §7, el conductor admite aproximadamente hasta ' + fmt(out.tiempoAdmisibleS,3) + ' s a esa Icc mínima antes de alcanzar su límite térmico de cortocircuito.');
    } else if (out.iccMinA !== null && !(adm > 0)) {
      out.pendientes.push('Falta el límite térmico de cortocircuito del conductor para obtener el tiempo máximo admisible a la Icc mínima.');
    }

    // Criterio confirmado el 22/9/2026: no se asume una cota genérica de
    // 0,1 s para la zona magnética, ni siquiera cuando la Icc mínima la
    // garantiza. Siempre hace falta el tiempo real de actuación —curva del
    // fabricante o ensayo— para cerrar esta comprobación.
    const tManual = Number(p && p.tiempoDesconexionVerificadoS);
    if (tManual > 0) {
      out.tiempoActuacionS = tManual;
      out.fuenteTiempo = 'fabricante/ensayo';
    }

    if (out.tiempoActuacionS !== null && out.tiempoAdmisibleS !== null) {
      out.cumpleTiempo = out.tiempoActuacionS <= out.tiempoAdmisibleS;
      if (out.cumpleTiempo) out.notas.push('Tiempo de actuación usado: ' + fmt(out.tiempoActuacionS,3) + ' s ≤ tiempo térmico admisible ' + fmt(out.tiempoAdmisibleS,3) + ' s.');
      else out.causas.push('El tiempo de actuación documentado (' + fmt(out.tiempoActuacionS,3) + ' s) supera el tiempo térmico admisible del conductor a la Icc mínima (' + fmt(out.tiempoAdmisibleS,3) + ' s).');
    } else if (out.iccMinA !== null && !(tManual > 0)) {
      out.pendientes.push(out.magnetico === true
        ? 'La Icc mínima garantiza la zona magnética, pero falta el tiempo real de actuación (curva tiempo-corriente del fabricante o ensayo) a ' + fmt(out.iccMinA,0) + ' A: no se asume una cota genérica.'
        : 'Como la Icc mínima no garantiza disparo magnético, falta leer en la curva tiempo-corriente del fabricante el tiempo de actuación a ' + fmt(out.iccMinA,0) + ' A (o medir/documentar ese tiempo).');
    }

    if (out.iccMinA !== null) {
      out.cumpleIccMinima = out.cumpleTiempo === true ? true : (out.causas.length ? false : null);
    }
    return out;
  }
  // Secciones minimas por resistencia mecanica, RBT-UTE Anexo S9: derivacion para
  // alumbrado 0,75mm2; derivacion para tomacorrientes "en salto" 1,5mm2 (mas conservador
  // que 1mm2 para un solo tomacorriente); derivacion para otros usos 1mm2.
  const MINIMOS_REGLAMENTARIOS = { iluminacion: 0.75, tomacorrientes: 1.5, fuerza: 1, motor: 1 };
  // Mínimos de la casa, más exigentes que la norma: en iluminación 1 mm² porque
  // 0,75 no se consigue en plaza, y 1,5 mm² en todo el resto. Van aparte del
  // mínimo reglamentario a propósito — la tabla de arriba dice lo que dice la
  // norma y no se toca; manda el mayor de los dos.
  const MINIMOS_COMERCIALES = { iluminacion: 1, tomacorrientes: 1.5, fuerza: 1.5, motor: 1.5 };
  const CAIDA_MAX_DEFAULT = { iluminacion: 3, tomacorrientes: 5, fuerza: 5, motor: 5 };

  // RBT-UTE Capítulo IV, Tabla II: cantidad máxima de conductores unipolares
  // (UNIT-IEC 227) por diámetro nominal de caño. Se cuenta también el
  // conductor de protección, que va con la misma sección que la fase.
  const CANO_UTE_TABLA_II = {
    1:   { 16: 7, 20: 12, 25: 20, 32: 34, 40: 55, 50: 87, 63: 144 },
    1.5: { 16: 5, 20: 9, 25: 15, 32: 26, 40: 43, 50: 67, 63: 112 },
    2:   { 16: 4, 20: 7, 25: 12, 32: 21, 40: 34, 50: 54, 63: 90 },
    2.5: { 16: 3, 20: 6, 25: 10, 32: 17, 40: 28, 50: 44, 63: 73 },
    4:   { 16: 2, 20: 4, 25: 7, 32: 13, 40: 21, 50: 34, 63: 56 },
    6:   { 16: 2, 20: 3, 25: 6, 32: 10, 40: 17, 50: 26, 63: 44 },
    10:  { 16: 1, 20: 2, 25: 3, 32: 6, 40: 10, 50: 16, 63: 28 },
    16:  { 16: 1, 20: 1, 25: 2, 32: 4, 40: 7, 50: 12, 63: 20 },
    25:  { 16: 0, 20: 1, 25: 1, 32: 3, 40: 5, 50: 8, 63: 13 },
    35:  { 16: 0, 20: 0, 25: 1, 32: 2, 40: 4, 50: 6, 63: 10 },
    50:  { 16: 0, 20: 0, 25: 1, 32: 1, 40: 2, 50: 4, 63: 7 },
    70:  { 16: 0, 20: 0, 25: 0, 32: 1, 40: 2, 50: 3, 63: 5 },
    95:  { 16: 0, 20: 0, 25: 0, 32: 1, 40: 1, 50: 2, 63: 4 },
    120: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 1, 50: 2, 63: 3 },
    150: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 1, 50: 1, 63: 2 },
    185: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 1, 63: 2 },
    240: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 1, 63: 1 },
    300: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 0, 63: 1 },
    400: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 0, 63: 1 },
  };
  // RBT-UTE Capítulo IV, Tabla III: conductos aislantes pesados. Es la que se
  // usa para el caño enterrado.
  const CANO_UTE_TABLA_III_PESADO = {
    1:   { 16: 6, 20: 10, 25: 17, 32: 30, 40: 51, 50: 82 },
    1.5: { 16: 4, 20: 7, 25: 13, 32: 23, 40: 40, 50: 63 },
    2:   { 16: 3, 20: 6, 25: 11, 32: 18, 40: 32, 50: 51 },
    2.5: { 16: 3, 20: 5, 25: 9, 32: 15, 40: 26, 50: 41 },
    4:   { 16: 2, 20: 3, 25: 6, 32: 11, 40: 20, 50: 32 },
    6:   { 16: 1, 20: 3, 25: 5, 32: 9, 40: 15, 50: 25 },
    10:  { 16: 1, 20: 1, 25: 3, 32: 5, 40: 10, 50: 15 },
    16:  { 16: 0, 20: 1, 25: 2, 32: 4, 40: 7, 50: 11 },
    25:  { 16: 0, 20: 0, 25: 1, 32: 2, 40: 4, 50: 7 },
    35:  { 16: 0, 20: 0, 25: 1, 32: 2, 40: 3, 50: 6 },
    50:  { 16: 0, 20: 0, 25: 0, 32: 1, 40: 2, 50: 4 },
    70:  { 16: 0, 20: 0, 25: 0, 32: 1, 40: 2, 50: 3 },
    95:  { 16: 0, 20: 0, 25: 0, 32: 0, 40: 1, 50: 2 },
    120: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 1, 50: 2 },
    150: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 1, 50: 1 },
    185: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 1 },
    240: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 1 },
    300: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 0 },
    400: { 16: 0, 20: 0, 25: 0, 32: 0, 40: 0, 50: 0 },
  };
  // Límite de caída: el de UTE por uso (3 % alumbrado, 5 % el resto). El
  // criterio de proyecto puede ser más exigente, nunca más permisivo.
  function limiteCaidaUTE(uso) { return CAIDA_MAX_DEFAULT[uso] || 5; }
  function limiteCaidaEfectivo(uso, criterioProyecto) {
    const ute = limiteCaidaUTE(uso);
    const proyecto = Number(criterioProyecto);
    return proyecto > 0 ? Math.min(ute, proyecto) : ute;
  }

  /* ============================================================
     PAQUETE NORMATIVO — versiona los valores de referencia del motor
     de cálculo, separados del código, con estado de verificación
     explícito. No se edita a mano: reemplazar este objeto entero
     es "instalar" un paquete nuevo.
     ============================================================ */
  const MOTOR_VERSION = '3.0.0';
  const NORMATIVE_PACK = {
    id: 'rbt-ute-interiores-2001-rev-2026',
    nombre: 'Reglamento de Baja Tensión UTE — instalaciones interiores y protecciones',
    fuente: 'RBT-UTE: Caps. II, IV, V, VI, VIII, XXIII, XXVI y XXX; Comunicado Normativa Técnico Comercial UTE Nro. 26002 (19/02/2026); Norma de Instalaciones de Enlace de BT versión agosto 2026 (vigente 13/08/2026), ute.com.uy.',
    version: '2.2-cierre-profesional',
    estado: 'pendiente', // 'pendiente' | 'verificado' | 'personalizado'
    vigenteDesde: null,
    actualizadoEl: '2026-09-21',
    // Supuesto 2, pendiente de confirmación. El contraste numérico de las
    // Tablas VI a IX (llevando la IEC B.52.2 de 30 a 25 °C con 1,06) cae
    // entre los métodos E y F, que son un circuito al aire separado de la
    // pared: la interacción con circuitos vecinos queda fuera y por eso se
    // aplica la B.52.17. Cuando el técnico instalador autorizado por UTE lo confirme o lo descarte se
    // cambia acá, sin tocar el cálculo.
    parametros: {
      // Criterio de la casa: al aire libre nunca va un circuito en contacto
      // con otro, así que ese método no lleva reducción por agrupamiento.
      aireLibreSeparado: true,
      aplicarAgrupamientoAire: true,
      fuenteFactoresAire: 'IEC-B.52.17',
      aplicarAgrupamientoEnterrado: true,
      fuenteFactoresEnterrado: 'IEC-B.52.19',
      // Corrección adicional del terreno para conductos enterrados. Se usa como
      // referencia técnica complementaria la IEC 60364-5-52 Tabla B.52.16. La
      // tabla declara aplicabilidad hasta 0,8 m de profundidad; más abajo se
      // deja pendiente un cálculo específico (IEC 60287 / fabricante).
      fuenteResistividadTerreno: 'IEC-B.52.16',
      profundidadMaxTablaTerrenoM: 0.8,
      // Supuesto 1 (caño enterrado), cerrado el 22/9/2026: valores estándar de
      // diseño de UTE, confirmados por el usuario. Alimentan la temperatura de
      // terreno (Tabla XIV) y la resistividad por defecto de la Tabla B.52.16.
      tempTerrenoEnterrado: 25,
      resistividadTerrenoEnterrado: 1.0,
      profundidadReferenciaEnterradoM: [0.5, 0.7],
      // Aprobación del supuesto 2 (B.52.17 y B.52.19) por el técnico
      // instalador. En Uruguay no hay matrícula sino categoría UTE; figura en
      // el listado de técnicos instaladores de UTE, Salto, Categoría C. Con
      // null, los circuitos que usan esos factores salen como pendientes.
      aprobacionSupuesto2: { nombre: 'Claudio Rodríguez', categoria: 'C', fecha: '2026-09-17' },
      // Cortocircuito. El Anexo da el método (Tabla A por potencia del
      // transformador, Tablas B a E por el cable) pero no un valor por
      // defecto, y en vivienda casi nunca se conocen esos datos. Sin Icc real
      // y sin subestación propia se toma la de plaza: 6 kA, que es la del
      // ejemplo del propio Anexo (20 kA → 6 kA tras 5 m de 6 mm²) y el primer
      // escalón de la gama. Con subestación propia (> 50 kW, §10) la
      // instalación está casi en bornes del transformador: no hay default.
      // Confirmado por el técnico instalador (17/9/2026): 6 kA de plaza en
      // monofásico y en trifásico.
      iccPlazaKa: 6,
      // Poder de corte mínimo según la corriente nominal de la térmica, criterio
      // de la casa: 6 kA hasta 99 A y 10 kA desde 100 A, aunque la Icc sea menor.
      pisoPoderCorte: [
        { desdeA: 0, ka: 6 },
        { desdeA: 100, ka: 10 },
      ],
      potenciaSubestacionKw: 50,
      // Gama de termomagnéticos que se cotiza (Schneider Acti9 iC60), por su
      // poder de corte Icn según IEC 60898-1. Confirmada por el usuario el
      // 17/9/2026. La iC60 llega hasta 63 A: por encima se cotiza por poder de
      // corte sin nombrar la línea.
      gamaPoderCorte: [
        { linea: 'iC60N', icnKa: 6 },
        { linea: 'iC60H', icnKa: 10 },
        { linea: 'iC60L', icnKa: 15 },
      ],
      gamaHastaA: 63,
    },
    notas:'Ampacidades (Tablas VI-XIII), temperatura (Tabla XIV, escalón inmediato superior), sol (§3.3.2), caída de tensión con conductividad de servicio (§8) medida desde el medidor, caños por Tablas II y III del Capítulo IV, protección contra sobrecargas y cortocircuitos (Cap. V §1.a y §1.b; Anexo §7). La memoria incorpora la protección general y la puesta a tierra: diferencial obligatorio en el tablero general; en instalaciones domiciliarias, 30 mA; y verificación R_A·IΔn ≤ 50 V en local seco o ≤ 24 V en local húmedo/mojado (RBT Caps. VI, VIII y XXIII; Comunicado UTE 26002 de 19/02/2026). Criterios de la casa, más exigentes que el reglamento: agrupamiento contando neutro y tierra, reducción al aire y en bandeja con factores de referencia IEC, 30 °C y mínimos de 1 / 1,5 mm². Al aire libre sin reducción por agrupamiento (criterio de la casa: nunca un circuito en contacto con otro). En bandeja, IEC 60364-5-52 Tabla B.52.17 según el montaje, sin reducción si entre circuitos hay más de 2·De; enterrados por separación entre caños (Tabla B.52.19). Factores IEC de agrupamiento (B.52.17 y B.52.19): aprobados el 17/09/2026 por Claudio Rodríguez, técnico instalador UTE Categoría C (supuesto 2). Cortocircuito en tres niveles: Icc informada (se verifica), subestación propia (se exige la Icc, Tabla A) o 6 kA de plaza (no verificado); poder de corte por Icn IEC 60898-1 con la gama iC60 N/H/L. Canalizaciones enterradas: la app aplica además un factor por resistividad térmica del terreno (IEC 60364-5-52 B.52.16, referencia complementaria) y sólo cierra esa comprobación hasta 0,8 m de profundidad; por encima exige cálculo específico. La memoria también evalúa sobretensiones atmosféricas y verifica la protección general existente en modificaciones/reparaciones. Auditoría v1.3: validación estricta de datos esenciales, protección diferencial individual de puntos de carga VE, uso literal de las Tablas B/C de cortocircuito y balance real de fases. En suministros trifásicos cada circuito monofásico se asigna a fase (TT) o par de conductores (IT), se calculan las corrientes de línea, se compara el desequilibrio con la Tabla I del Capítulo II (20 % hasta 50 kW; 15 % por encima) y la fase más cargada entra en el dimensionado del alimentador y la protección general. Para operacionalizar el porcentaje, la app documenta como criterio técnico la máxima desviación de corriente respecto del promedio dividida por el promedio. Auditoría v1.5: selección de curvas B/C/D según IEC 60898-1 y coordinación/selectividad de protecciones. La selectividad entre interruptores no se presume por relación de In: queda pendiente hasta respaldarla con tablas/curvas del fabricante y la Icc del punto; para RCD en cascada se verifica como referencia IEC la relación IΔn aguas arriba ≥ 3× aguas abajo y cabecera selectiva tipo S/temporizada. Auditoría v1.8: protección contra contactos indirectos TT/IT, con R_A·IΔn o R_A·I_d, tiempos IEC 60364-4-41 y vigilancia de primer defecto en IT. Auditoría v1.9: PE de cada circuito, continuidad eléctrica y equipotencialidad principal/suplementaria según UTE Cap. XXIII e IEC 60364-5-54/-6 como referencia complementaria. Auditoría v2.0: protocolo de puesta en servicio según IEC 60364-6 como referencia complementaria: aislamiento, polaridad, secuencia de fases, continuidad PE, RCD, tierra, pruebas funcionales y registro de resultados; en circuitos hasta 500 V se usa 500 Vcc y 1 MΩ mínimo, admitiendo 250 Vcc con mínimo 1 MΩ cuando no sea practicable desconectar SPD/electrónica sensible. Auditoría v1.7: la Icc mínima al final del circuito se contrasta contra el extremo superior de la banda magnética IEC 60898-1 (B 5·In, C 10·In, D 20·In). El tiempo térmico admisible del conductor a esa Icc mínima se calcula a partir del criterio de UTE RBT Cap. II - Anexo §7; si no se garantiza la zona magnética, la app exige leer/documentar el tiempo de actuación en la curva del fabricante y compararlo con dicho límite, sin confundir este análisis con los tiempos de protección contra choque eléctrico. Auditoría v1.4: el alimentador se descompone en fase, neutro y PE; el neutro se adopta por defecto con la misma sección que fase porque la app no modela armónicos de orden triple, y una reducción manual queda pendiente de justificación específica. Para pequeños/medianos suministros individuales, el PE sigue el criterio del Cap. XXIII §4 y §10; fuera de ese alcance se adopta S_PE = S_fase como criterio conservador, pero la comprobación térmica específica frente a falta queda explicitada como pendiente si no existe dato de energía/tiempo de despeje.',
  };
  // Referencias que respaldan cada paso del motor. El reglamento que rige en
  // Uruguay es el de UTE: es la referencia principal y es la que manda. La IEC
  // entra sólo como referencia técnica complementaria, donde aporta la
  // formulación explícita que el reglamento no escribe con esas letras.
  const REFERENCIAS_NORMATIVAS = [
    { rango: 'principal', tema: 'Dimensionado del conductor',
      cita: 'UTE, Reglamento de Baja Tensión, Capítulo II - Anexo: Cálculo de Secciones de los Conductores. El conductor se dimensiona evitando calentamiento inadmisible y caída de tensión excesiva, y considerando además resistencia mecánica y comportamiento ante cortocircuito.' },
    { rango: 'principal', tema: 'Corrientes máximas admisibles',
      cita: 'UTE, RBT Capítulo II - Anexo, Tablas VI a IX (al aire bajo techo) y X a XIII (dentro de conductos: X cobre PVC, XI cobre XLPE, XII aluminio PVC, XIII aluminio XLPE), corregidas por temperatura ambiente (Tabla XIV, tomando el escalón inmediato superior) y por agrupamiento (§5.1: 4 a 7 conductores 0,90; más de 7, 0,70). La columna de la tabla es la de 2 conductores cargados en monofásico y 3 en trifásico, como indica el reglamento.' },
    { rango: 'principal', tema: 'Conteo de conductores para el agrupamiento',
      cita: 'Criterio de la casa, más exigente que el reglamento: para contar los conductores dentro del caño se suman todos los que van adentro —3 en monofásico y 5 en trifásico—, incluidos el neutro del trifásico y el conductor de protección, que el Anexo §5.1 no computa.' },
    { rango: 'principal', tema: 'Exposición solar',
      cita: 'UTE, RBT Capítulo II - Anexo §3.3.2: si los conductores están expuestos al sol, la corriente admisible se afecta por un factor 0,90.' },
    { rango: 'principal', tema: 'Protección contra sobrecargas',
      cita: 'UTE, RBT Capítulo V - Agrupamiento de accesorios de protección - Tableros, numeral 1.a: el dispositivo de protección debe garantizar el límite de corriente admisible del conductor.' },
    { rango: 'complementaria', tema: 'Curvas B/C/D de interruptores modulares',
      cita: 'IEC 60898-1: bandas de disparo magnético instantáneo utilizadas por la app como referencia de selección: B 3–5·In, C 5–10·In y D 10–20·In. La elección final debe considerar corriente de arranque e Icc mínima del circuito.' },
    { rango: 'complementaria', tema: 'Selectividad entre interruptores',
      cita: 'IEC 60364: la selectividad puede ser total o parcial y debe verificarse con las características tiempo-corriente/energía y los límites declarados por el fabricante; la app no la presume por una simple relación entre corrientes nominales.' },
    { rango: 'complementaria', tema: 'Icc mínima y tiempo de desconexión',
      cita: 'UTE RBT Cap. II - Anexo §7 exige que el tiempo de actuación de la protección limite la temperatura del conductor durante el cortocircuito. IEC 60898-1: bandas magnéticas B 3–5·In, C 5–10·In y D 10–20·In; la app usa el extremo superior (5/10/20·In) para afirmar que la zona magnética está garantizada. Si no se alcanza, se exige el tiempo de actuación de la curva del fabricante y se compara con el tiempo térmico admisible del conductor a Ik,min.' },
    { rango: 'complementaria', tema: 'Selectividad entre diferenciales',
      cita: 'IEC 60364-5-53: para selectividad total entre RCD en cascada se coordina sensibilidad y tiempo; como regla de referencia, IΔn aguas arriba ≥ 3·IΔn aguas abajo y dispositivo aguas arriba selectivo tipo S (o temporizado compatible).' },
    { rango: 'principal', tema: 'Reparto y balance de cargas monofásicas',
      cita: 'UTE, RBT Capítulo II numeral 9 y Tabla I: en instalaciones trifásicas las cargas monofásicas deben repartirse entre las fases o conductores polares para mantener el mayor equilibrio posible. Se admite hasta 20 % de desequilibrio con potencia contratada de hasta 50 kW y hasta 15 % por encima de 50 kW. El Reglamento no explicita en ese numeral la fórmula porcentual; la app documenta y aplica como criterio técnico la máxima desviación de las corrientes de línea respecto de su promedio, dividida por ese promedio.' },
    { rango: 'principal', tema: 'Distribución de carga en el tablero',
      cita: 'UTE, RBT Capítulo V numeral 1.4.6: las cargas deben distribuirse equilibradamente en las tres fases; cuando no sea posible se admite únicamente el desequilibrio indicado por la Tabla I del Capítulo II.' },
    { rango: 'principal', tema: 'Neutro del alimentador',
      cita: 'UTE, RBT Capítulo II §3.1 considera al neutro conductor activo. En cargas específicas con armónicos, como alumbrado de descarga, el Capítulo XVII exige que el neutro tenga la misma sección que fase. La app adopta S_N = S_fase por defecto y no permite declarar como verificada una reducción sin una justificación específica de corriente de neutro/armónicos.' },
    { rango: 'principal', tema: 'Conductor de protección del alimentador',
      cita: 'UTE, RBT Capítulo XXIII §4 remite, para viviendas, pequeños comercios o industrias individuales hasta 15 kW en 220 V o 20 kW en 380 V, a las secciones del numeral 10. El §10.1 fija 16 mm² Cu para la línea principal de tierra, salvo líneas repartidoras de menor sección, en cuyo caso se adopta igual sección que fase; además exige soportar la corriente de falta durante el tiempo de despeje. Fuera de ese alcance la app usa S_PE = S_fase como criterio conservador y deja explícita la necesidad de comprobación térmica específica.' },
    { rango: 'principal', tema: 'Separación neutro - tierra',
      cita: 'UTE, RBT Capítulo XXIII §5.4 y Capítulo VI: en suministros UTE de baja tensión el neutro no debe unirse en ningún punto con la red de puesta a tierra del cliente; el sistema interior adoptado es TT.' },
    { rango: 'principal', tema: 'Protección contra cortocircuitos',
      cita: 'UTE, RBT Capítulo V numeral 1.b: en el origen de todo circuito debe haber una protección con capacidad de corte acorde a la corriente de cortocircuito prevista. El Anexo del Capítulo II §7 permite verificar térmicamente el conductor frente al cortocircuito, y su Tabla A (con las Tablas B a E para el tramo de cable) da la corriente de cortocircuito según la potencia del transformador, calculada con 500 MVA aguas arriba.' },
    { rango: 'principal', tema: 'Protección diferencial del tablero general',
      cita: 'UTE, Comunicado Normativa Técnico Comercial Nro. 26002 (19/02/2026): en todos los tableros generales de los clientes se debe instalar interruptor diferencial; para instalaciones domiciliarias es obligatorio el diferencial de alta sensibilidad de 30 mA. El tablero general incluye además interruptor general automático, protecciones de circuitos y bornera de conductores de protección.' },
    { rango: 'principal', tema: 'Diferencial interior vs. PDIE de la instalación de enlace',
      cita: 'UTE, Norma de Instalaciones de Enlace de BT versión agosto 2026, §4.4 y §4.4.1: la Protección Diferencial de la Instalación de Enlace (PDIE) es un dispositivo distinto del diferencial general interior; se instala excepcionalmente cuando UTE lo disponga y su suministro e instalación están a cargo de UTE. La app no la incluye como material del cliente.' },
    { rango: 'principal', tema: 'Diferencial y resistencia de puesta a tierra',
      cita: 'UTE, RBT Capítulo VI: la sensibilidad del diferencial debe coordinar con la resistencia a tierra de las masas, cumpliendo R ≤ 50/I en locales secos y R ≤ 24/I en locales húmedos o mojados, con I en amperios. La app muestra el valor máximo de R y exige cargar una medición para cerrar la verificación.' },
    { rango: 'principal', tema: 'Puesta a tierra y tensión de contacto',
      cita: 'UTE, RBT Capítulo XXIII §9: la resistencia de tierra debe impedir tensiones de contacto superiores a 24 V en local o emplazamiento conductor y 50 V en los demás casos, para corrientes de defecto eliminadas en menos de 5 s. En suministros UTE de baja tensión es obligatorio el interruptor diferencial en el tablero general.' },
    { rango: 'complementaria', tema: 'Contactos indirectos en TT: tiempos de desconexión',
      cita: 'IEC 60364-4-41, Tabla 41.1 y 411.3.2: a 230 V, en TT se usan 0,2 s para circuitos finales dentro del alcance indicado por la norma y 1 s para circuitos de distribución u otros no comprendidos. La app exige tiempo de ensayo/documentado; no presume que un RCD cumple sólo por su IΔn.' },
    { rango: 'complementaria', tema: 'Contactos indirectos en IT: primer y segundo defecto',
      cita: 'IEC 60364-4-41 §411.6: en primer defecto se comprueba R_A·I_d ≤ U_L y debe detectarse/señalizarse el defecto cuando se mantiene la continuidad de servicio. Ante segundo defecto, con masas interconectadas se aplican condiciones equivalentes a TN; con masas en grupos o tierras independientes se aplican condiciones tipo TT.' },
    { rango: 'principal', tema: 'Protección contra sobretensiones',
      cita: 'UTE, RBT Capítulo V numeral 2 y Comunicado Normativa Técnico Comercial Nro. 26002 (19/02/2026): cuando sean de temer sobretensiones de origen atmosférico deben instalarse descargadores a tierra lo más cerca posible del origen. La puesta a tierra de los descargadores debe ser aislada y su resistencia inferior a 10 Ω.' },
    { rango: 'principal', tema: 'Cálculo de la corriente de cortocircuito',
      cita: 'UTE, RBT Capítulo II - Anexo §7, Tabla A (Icc en bornes del transformador según su potencia, 500 MVA aguas arriba) y Tablas B (220 V) y C (380 V) (Icc al extremo de un cable según sección y longitud). La app aplica la Tabla A y luego las Tablas B o C al tramo de red y acometida y al alimentador. Criterios del lado seguro: transformador y fila de Icc inmediatos superiores, sección inmediata superior, longitud inmediata inferior, y ante erratas del Anexo, el valor que da mayor Icc. Las Tablas D y E son una lectura simplificada de las B y C para Icc de hasta 20 kA y no se usan.' },
    { rango: 'principal', tema: 'Corriente de cortocircuito por defecto',
      cita: 'El Anexo da el método pero no un valor por defecto. Con la Icc informada por UTE o medida, se verifica. Con subestación propia (más de 50 kW, Anexo §10) no hay default: la instalación está casi en bornes del transformador y se toma la Tabla A sin atenuar por cable. En suministro estándar sin dato se toma 6 kA de plaza, que es el valor del ejemplo del propio Anexo (20 kA pasan a 6 kA tras 5 m de 6 mm²); la térmica se cotiza con ese poder de corte y el cortocircuito queda marcado como no verificado.' },
    { rango: 'complementaria', tema: 'Cantidad de circuitos por diferencial y disparos intempestivos',
      cita: 'IEC 60364-5-53 §531.3.2 no establece un máximo general de 3 circuitos por RCD. Exige seleccionar y subdividir los circuitos para limitar disparos intempestivos y establece que la suma de corrientes de fuga/protección aguas abajo no supere el 30 % de la corriente diferencial asignada IΔn. Por ello la app no usa “3 circuitos máximo” como requisito IEC; cuando se disponga de corrientes de fuga medidas o de fabricante, debe comprobarse ΣI_fuga ≤ 0,30·IΔn.' },
    { rango: 'criterio-casa', tema: 'Margen de selección automática de térmicas',
      cita: 'Criterio interno ADONAI ELECTRICAL, no exigencia textual IEC/UTE: la selección automática procura Ib ≤ 0,80·In, manteniendo simultáneamente Ib ≤ In ≤ Iz. Ejemplo: Ib = 5,1 A no selecciona automáticamente 6 A; pasa al siguiente calibre normalizado que cumpla el margen y la capacidad del conductor.' },
    { rango: 'complementaria', tema: 'Tipo de diferencial y cargas electrónicas',
      cita: 'IEC 61008-1 / 61009-1 son normas de producto para RCCB/RCBO; IEC 62423 agrega requisitos para diferenciales tipo F y B, e IEC 62955 para RDC-DD de carga de vehículos eléctricos. La app propone A por defecto y adopta F/B de forma conservadora según la electrónica, pero la selección final debe contrastarse con el equipo y su fabricante. Para VE manda además UTE RBT Capítulo XXX §9.4.2: cada punto de conexión ≤ 30 mA; en modo 3, tipo B o tipo A/F combinado con RDC-DD de 6 mA; en modo 4, al menos tipo A.' },
    { rango: 'principal', tema: 'Protección diferencial individual para VE',
      cita: 'UTE, RBT Capítulo XXX §9.4.2: cada Punto de Conexión debe protegerse individualmente mediante un sistema diferencial de sensibilidad no superior a 30 mA y corte de todos los conductores activos incluido el neutro. Modos 1 y 2: al menos tipo A. Modo 3: tipo B, o tipo A/F combinado con RDC-DD de 6 mA. Modo 4: al menos tipo A.' },
    { rango: 'principal', tema: 'Tablas B y C de cortocircuito',
      cita: 'UTE, RBT Capítulo II - Anexo §7, Tablas B y C. La app conserva los valores publicados literalmente. Si la celda necesaria participa de una anomalía no monótona impresa en la tabla, no la corrige por inferencia: deja la Icc pendiente y exige dato informado/medido o cálculo específico.' },
    { rango: 'complementaria', tema: 'Poder de corte de los termomagnéticos',
      cita: 'IEC 60898-1: poder de corte asignado Icn, el que se compara con la Icc en termomagnéticos de uso doméstico y análogo (ensayo O-CO-CO). El Icu de la IEC 60947-2 que traen las fichas es otro ensayo y no se usa en la comparación. Gama que se cotiza, confirmada: Schneider Acti9 iC60 (N 6 kA, H 10 kA, L 15 kA, iguales en 230 V 1P/2P y en 400 V 3P/4P, hasta 63 A; en la L verificar el SKU, porque en algunos calibres altos baja); se cotiza el primer escalón que cubre la Icc. Criterio de la casa: mínimo 6 kA hasta 99 A y 10 kA desde 100 A, en monofásico y trifásico.' },
    { rango: 'principal', tema: 'Caída de tensión',
      cita: 'UTE, RBT Capítulo II - Anexo, numeral 8 - Caídas de Tensión: máximo 3 % en circuitos de alumbrado y 5 % en los demás usos, medidos entre el origen de la instalación y cualquier punto de utilización. Fórmulas S = 2LW/(KeV) en monofásico y S = LW/(KeV) en trifásico. Para conductores dimensionados por capacidad térmica, K a temperatura de servicio: 48,4 (Cu/PVC), 45,5 (Cu/XLPE), 29,4 (Al/PVC) y 27,6 (Al/XLPE).' },
    { rango: 'principal', tema: 'Canalizaciones',
      cita: 'UTE, RBT Capítulo IV - Conductos protectores, numeral 1.1 y Tablas I a V: el diámetro depende de la sección, la cantidad de conductores y la clase de conducto. Se usa la Tabla II para caño embutido y a la vista, y la Tabla III (conductos pesados) para el enterrado.' },
    { rango: 'complementaria', tema: 'Coordinación conductor - protección',
      cita: 'IEC 60364-4-43:2023, numeral 431.4.2 - Coordination between conductors and overload protective devices: Ib <= In <= Iz y, además, I2 <= 1,45·Iz. Es la formulación explícita de lo que el Capítulo V numeral 1.a de UTE exige.' },
    { rango: 'complementaria', tema: 'Corriente convencional de actuación (I2)',
      cita: 'Los interruptores termomagnéticos según IEC 60898-1 tienen corriente convencional de disparo I2 = 1,45·In, de modo que I2 <= 1,45·Iz queda garantizado cuando In <= Iz. UTE admite como dispositivos de protección contra sobrecorrientes interruptores automáticos o fusibles con características adecuadas (Comunicado 26002, 19/02/2026).' },
    { rango: 'complementaria', tema: 'Energía pasante en cortocircuito',
      cita: 'Un termomagnético limita la corriente de cortocircuito: para verificar térmicamente el conductor se compara la energía que deja pasar (I²t, dato del fabricante) con la que el conductor admite, (k·S)². Calcular con la corriente plena durante todo el tiempo de despeje sobrestima esa energía y rechaza circuitos que cumplen.' },
    { rango: 'complementaria', tema: 'Agrupamiento al aire y en bandeja',
      cita: 'El Anexo de UTE sólo da factores de agrupamiento para conductos (§5.1). Al aire y en bandeja se usa IEC 60364-5-52, Tabla B.52.17, por cantidad de circuitos y con una fila por montaje: en manojo o haz (1,00 · 0,80 · 0,70 · 0,65 · 0,60 · 0,57 · 0,54 · 0,52 · 0,50; 12 circuitos 0,45, 16 → 0,41, 20 → 0,38), capa única sobre pared, piso o bandeja no perforada (1,00 · 0,85 · 0,79 · 0,75 · 0,73 · 0,72 · 0,72 · 0,71 · 0,70) y capa única sobre bandeja perforada (1,00 · 0,88 · 0,82 · 0,77 · 0,75 · 0,73 · 0,73 · 0,72 · 0,72). Con una cantidad intermedia se toma la columna inmediata superior. El criterio de separación es un umbral (IEC 60364-5-52 y REBT ITC-BT-19): si la distancia entre las superficies de un circuito y el vecino supera 2·De no se corrige (factor 1,00); en contacto o más cerca, el factor de la fila. Se mide entre superficies y entre circuitos. Por defecto se toma en contacto. Las Tablas VI a IX, llevadas a la misma temperatura, caen entre los métodos E y F de la IEC (un circuito al aire), por lo que aplicarles la B.52.17 es el uso previsto. Aprobado el 17/09/2026 por Claudio Rodríguez, técnico instalador UTE Categoría C (supuesto 2).' },
    { rango: 'complementaria', tema: 'Agrupamiento de caños enterrados',
      cita: 'Si los circuitos enterrados comparten caño, rige el §5.1 del Anexo de UTE. Si cada circuito va en su propio caño, se aplica además el factor por separación entre caños de IEC 60364-5-52, Tabla B.52.19 (en contacto, 0,25 m, 0,5 m y 1 m); a partir de 1 m la influencia térmica mutua es despreciable y el factor se toma 1. Aprobado el 17/09/2026 por Claudio Rodríguez, técnico instalador UTE Categoría C (supuesto 2).' },
    { rango: 'complementaria', tema: 'Terreno en canalizaciones enterradas',
      cita: 'IEC 60364-5-52, Tabla B.52.16: referencia complementaria para corregir la capacidad de cables en conductos enterrados cuando la resistividad térmica del suelo difiere de 2,5 K·m/W. Los factores de esa tabla son aplicables hasta 0,8 m de profundidad; para mayor profundidad o condiciones de secado no uniforme se requiere un método específico, por ejemplo IEC 60287.' },
    { rango: 'complementaria', tema: 'Selección del descargador de sobretensión',
      cita: 'IEC 60364-5-53, sección 534, se usa sólo como referencia de selección del SPD: cuando existe sistema externo de protección contra el rayo o riesgo de corriente de rayo se propone Tipo 1+2 en el origen; para sobretensiones inducidas/transmitidas sin ese riesgo se propone Tipo 2. La necesidad del SPD la determina el criterio de UTE indicado arriba.' },
    { rango: 'complementaria', tema: 'Separación entre potencia y datos',
      cita: 'EN 50174-2 fija distancias entre cables de potencia y de datos (del orden de 30 a 200 mm según la potencia y si hay tabique metálico). Es un criterio de compatibilidad electromagnética, no térmico: no modifica la corriente admisible ni el factor de agrupamiento.' },
    { rango: 'complementaria', tema: 'Sistemas de cableado',
      cita: 'IEC 60364-5-52:2009 + AMD1:2024 - Wiring systems, criterios generales de selección de sistemas de cableado, incluido el numeral 525 sobre caída de tensión.' },
    { rango: 'principal', tema: 'Continuidad de los conductores de protección',
      cita: 'UTE, RBT Capítulo XXIII §5.4, §6 y §10.5: los PE unen las masas a la línea principal de tierra; el circuito de tierra debe formar una línea eléctricamente continua, las masas se conectan por derivaciones y no pueden intercalarse seccionadores, fusibles ni interruptores.' },
    { rango: 'complementaria', tema: 'Sección de PE y equipotencialidad',
      cita: 'IEC 60364-5-54: método simplificado para PE del mismo material que fase (S_PE=S_fase hasta 16 mm²; 16 mm² entre 16 y 35 mm²; S_fase/2 por encima de 35 mm²). Si el PE va separado, mínimo 2,5 mm² Cu con protección mecánica o 4 mm² Cu sin ella. Conductor equipotencial principal: al menos la mitad del mayor PE, mínimo 6 mm² Cu y no necesita exceder 25 mm² Cu. La equipotencial suplementaria se coordina con el PE asociado.' },
    { rango: 'complementaria', tema: 'Ensayo de continuidad del PE',
      cita: 'IEC 60364-6: antes de la puesta en servicio se verifica la continuidad de los conductores de protección y de las uniones equipotenciales. La app registra el resultado del ensayo; no inventa un límite universal de ohmios porque la norma exige continuidad y el valor aceptable depende de longitud, sección y conexiones.' },
    { rango: 'complementaria', tema: 'Verificación inicial y protocolo de ensayos',
      cita: 'IEC 60364-6:2016 §6.4 exige inspección y ensayos antes de la puesta en servicio: continuidad de conductores de protección y equipotenciales, resistencia de aislamiento, polaridad, protección por desconexión automática, protección adicional, secuencia de fases, pruebas funcionales y verificación de caída de tensión, con informe de resultados. Tabla 6.1: hasta 500 V, ensayo de aislamiento a 500 Vcc y mínimo 1 MΩ; si no es practicable desconectar SPD/electrónica sensible, puede usarse 250 Vcc manteniendo 1 MΩ.' },
  ];
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
  // Por encima del mayor escalón no se sugiere nada: antes se devolvía el
  // último en silencio, que es una potencia menor a la que hace falta.
  function nearestStepUp(value, steps) {
    for (const s of steps) if (s >= value) return s;
    return null;
  }
  // Tabla XIV. Una temperatura intermedia toma el escalón inmediato superior,
  // que es el más desfavorable: con 32 °C se usa el factor de 35 °C. Fuera del
  // rango de la tabla no hay factor y el cálculo queda sin verificar.
  function getTempFactorUTE(aislacion, temp) {
    const tabla = TEMP_FACTORS_UTE[aislacion] || TEMP_FACTORS_UTE.pvc;
    const t = Number(temp);
    if (!Number.isFinite(t) || t < tabla[0].t || t > tabla[tabla.length - 1].t) return null;
    for (const tf of tabla) if (tf.t >= t) return tf.f;
    return null;
  }
  // Agrupamiento al aire, en bandeja y enterrado. El Anexo de UTE sólo trae la
  // tabla del §5.1 para conductos, así que en los demás montajes se usan los
  // valores de referencia de la IEC 60364-5-52 (y REBT ITC-BT-19), que van por
  // cantidad de CIRCUITOS, no por conductores.
  //
  // Al aire y en bandeja el criterio es un umbral, sin factores intermedios:
  // si la distancia entre las SUPERFICIES del circuito y la del circuito vecino
  // es mayor a 2·De (De = diámetro exterior del cable), no hay agrupamiento y
  // el factor es 1,00; si se tocan o están más cerca, se usa la fila de la
  // Tabla B.52.17 que corresponde al montaje. El umbral se mira entre
  // circuitos: los conductores de un mismo circuito pueden ir juntos. Por
  // defecto se toma "en contacto"; "separados" sólo si el instalador lo
  // declara. Ojo: manojo no es capa única. Si los circuitos van atados con
  // precintos o amontonados en el fondo de la bandeja, corresponde la fila de
  // manojo (0,80 con dos circuitos, no 0,88).
  //
  // Enterrado: si los circuitos comparten caño, manda el §5.1. Si cada uno va
  // en su caño, factor por separación entre caños (IEC 60364-5-52 Tabla
  // B.52.19): en contacto, 0,25 m, 0,5 m y 1 m; pasado 1 m la influencia
  // mutua es despreciable (1,00).
  //
  // La separación entre potencia y datos (EN 50174-2, 30 a 200 mm) es un
  // criterio de compatibilidad electromagnética, no térmico: no entra acá.
  //
  // Son valores de referencia, no tablas del reglamento uruguayo. Aprobados
  // como supuesto 2 por el técnico instalador el 17/9/2026 (ver
  // NORMATIVE_PACK.parametros.aprobacionSupuesto2), con respaldo en el
  // contraste de las Tablas VI a IX con los métodos E y F de la IEC.
  const GRUPO_B5217 = {
    manojo: [{ n: 1, f: 1.00 }, { n: 2, f: 0.80 }, { n: 3, f: 0.70 }, { n: 4, f: 0.65 }, { n: 5, f: 0.60 },
             { n: 6, f: 0.57 }, { n: 7, f: 0.54 }, { n: 8, f: 0.52 }, { n: 9, f: 0.50 }, { n: 12, f: 0.45 },
             { n: 16, f: 0.41 }, { n: 20, f: 0.38 }],
    capa_pared: [{ n: 1, f: 1.00 }, { n: 2, f: 0.85 }, { n: 3, f: 0.79 }, { n: 4, f: 0.75 }, { n: 5, f: 0.73 },
                 { n: 6, f: 0.72 }, { n: 7, f: 0.72 }, { n: 8, f: 0.71 }, { n: 9, f: 0.70 }],
    capa_bandeja_perforada: [{ n: 1, f: 1.00 }, { n: 2, f: 0.88 }, { n: 3, f: 0.82 }, { n: 4, f: 0.77 }, { n: 5, f: 0.75 },
                             { n: 6, f: 0.73 }, { n: 7, f: 0.73 }, { n: 8, f: 0.72 }, { n: 9, f: 0.72 }],
  };
  const MONTAJES_AIRE = [
    { id: 'manojo', label: 'En manojo o haz (atados, amontonados o en envolvente)' },
    { id: 'capa_pared', label: 'Capa única sobre pared, piso o bandeja no perforada' },
    { id: 'capa_bandeja_perforada', label: 'Capa única sobre bandeja perforada' },
  ];
  const MONTAJE_DEFECTO = { aire: 'capa_pared', bandeja: 'capa_bandeja_perforada' };
  function montajeDe(metodo, montaje) {
    if (!MONTAJE_DEFECTO[metodo]) return null;
    return GRUPO_B5217[montaje] ? montaje : MONTAJE_DEFECTO[metodo];
  }
  // Montajes donde hay que elegir fila y separación: la bandeja siempre; al
  // aire libre sólo si la casa no lo da por separado.
  function pideMontaje(metodo) {
    if (!MONTAJE_DEFECTO[metodo]) return false;
    return !(metodo === 'aire' && NORMATIVE_PACK.parametros.aireLibreSeparado);
  }
  function textoMontaje(metodo, montaje) {
    const m = MONTAJES_AIRE.find((x) => x.id === montajeDe(metodo, montaje));
    return m ? m.label : '';
  }
  // Diámetro exterior orientativo del unipolar 750 V PVC, en mm. Sirve para
  // mostrar el umbral de 2·De; el dato real sale del catálogo que se cotiza.
  const DE_UNIPOLAR_PVC = { 1: 2.7, 1.5: 3.0, 2.5: 3.6, 4: 4.4, 6: 5.0, 10: 6.6, 16: 7.8, 25: 9.6 };
  function umbralSeparacion(seccion) {
    const de = DE_UNIPOLAR_PVC[seccion];
    return de ? Math.ceil(2 * de) : null;
  }

  // IEC 60364-5-52 Tabla B.52.19: un circuito por caño, caños enterrados.
  const GRUPO_ENTERRADO = {
    contacto: [{ n: 1, f: 1.00 }, { n: 2, f: 0.85 }, { n: 3, f: 0.75 }, { n: 4, f: 0.70 }, { n: 5, f: 0.65 }, { n: 6, f: 0.60 }],
    m025:     [{ n: 1, f: 1.00 }, { n: 2, f: 0.90 }, { n: 3, f: 0.85 }, { n: 4, f: 0.80 }, { n: 5, f: 0.80 }, { n: 6, f: 0.80 }],
    m05:      [{ n: 1, f: 1.00 }, { n: 2, f: 0.95 }, { n: 3, f: 0.90 }, { n: 4, f: 0.85 }, { n: 5, f: 0.85 }, { n: 6, f: 0.80 }],
    m1:       [{ n: 1, f: 1.00 }, { n: 2, f: 0.95 }, { n: 3, f: 0.95 }, { n: 4, f: 0.90 }, { n: 5, f: 0.90 }, { n: 6, f: 0.90 }],
  };
  const DISPOSICIONES_ENTERRADO = [
    { id: 'mismo', label: 'Todos en el mismo caño (§5.1)' },
    { id: 'contacto', label: 'Un caño por circuito, caños en contacto' },
    { id: 'm025', label: 'Un caño por circuito, a 0,25 m' },
    { id: 'm05', label: 'Un caño por circuito, a 0,5 m' },
    { id: 'm1', label: 'Un caño por circuito, a 1 m' },
    { id: 'libres', label: 'Un caño por circuito, a más de 1 m (sin reducción)' },
  ];
  function disposicionEnterrado(disposicion) {
    return DISPOSICIONES_ENTERRADO.some((d) => d.id === disposicion) ? disposicion : 'mismo';
  }

  // IEC 60364-5-52 B.52.16 — referencia complementaria para conductos
  // enterrados. Para un valor intermedio se toma el escalón de resistividad
  // inmediatamente superior: es conservador porque una resistividad mayor
  // disipa peor y da un factor igual o menor. El factor 1,00 corresponde a la
  // referencia de 2,5 K·m/W. La tabla se declara aplicable hasta 0,8 m.
  const TERRENO_B5216 = [
    { rho: 0.5, f: 1.28 }, { rho: 0.7, f: 1.20 }, { rho: 1.0, f: 1.18 },
    { rho: 1.5, f: 1.10 }, { rho: 2.0, f: 1.05 }, { rho: 2.5, f: 1.00 },
    { rho: 3.0, f: 0.96 },
  ];
  function factorTerrenoEnterrado(p) {
    if (!p || p.metodo !== 'enterrado') return { aplica: false, factor: 1, estado: 'no_aplica' };
    const rho = Number(p.resistividadTerreno);
    const profundidad = Number(p.profundidadEnterrado);
    const limite = NORMATIVE_PACK.parametros.profundidadMaxTablaTerrenoM || 0.8;
    const pendientes = [];
    if (!(rho > 0)) pendientes.push('Falta la resistividad térmica del terreno (K·m/W).');
    if (!(profundidad > 0)) pendientes.push('Falta la profundidad de la canalización enterrada.');
    if (profundidad > limite) pendientes.push('La profundidad (' + fmt(profundidad) + ' m) supera ' + fmt(limite) + ' m: la Tabla B.52.16 no cierra esta condición; requiere cálculo específico o dato del fabricante.');
    let factor = 1;
    let fueraRango = false;
    if (rho > 0) {
      const fila = TERRENO_B5216.find((x) => x.rho >= rho);
      if (fila) factor = fila.f;
      else { factor = TERRENO_B5216[TERRENO_B5216.length - 1].f; fueraRango = true; }
      if (rho < TERRENO_B5216[0].rho || rho > TERRENO_B5216[TERRENO_B5216.length - 1].rho) {
        fueraRango = true;
        pendientes.push('La resistividad térmica (' + fmt(rho) + ' K·m/W) queda fuera del rango tabulado de 0,5 a 3,0 K·m/W; confirmar por cálculo específico o fabricante.');
      }
    }
    return { aplica: true, factor, rho: rho > 0 ? rho : null, profundidad: profundidad > 0 ? profundidad : null,
             limiteProfundidad: limite, fueraRango, pendientes,
             estado: pendientes.length ? 'pendiente' : 'cumple' };
  }
  // Toma la columna de la tabla igual o inmediatamente superior a la cantidad
  // de circuitos, que es la más desfavorable (10 circuitos en manojo → la de
  // 12). Pasado el final de la tabla, su último valor.
  function factorPorCircuitos(tabla, circuitos) {
    const n = Math.max(1, Number(circuitos) || 1);
    for (const fila of tabla) if (fila.n >= n) return fila.f;
    return tabla[tabla.length - 1].f;
  }

  // RBT-UTE Anexo §5.1: dentro de un caño, recién por encima de 3 conductores
  // cargados hay reducción (4 a 7 = 0,90; más de 7 = 0,70).
  function factorConducto(n) {
    if (n <= 3) return 1;
    if (n <= 7) return 0.90;
    return 0.70;
  }
  // p: datos del circuito (metodo, agrupados, montaje, separados2De,
  // disposicion). nConductores: los de todo el caño; porCircuito: los de uno.
  function getGroupFactorUTE(p, nConductores, porCircuito) {
    const metodo = p.metodo;
    const circuitos = p.agrupados;
    const param = NORMATIVE_PACK.parametros;
    if (metodo === 'aire' && param.aireLibreSeparado) return 1;
    if (MONTAJE_DEFECTO[metodo]) {
      if (p.separados2De || !param.aplicarAgrupamientoAire) return 1;
      return factorPorCircuitos(GRUPO_B5217[montajeDe(metodo, p.montaje)], circuitos);
    }
    if (metodo === 'enterrado') {
      const disp = disposicionEnterrado(p.disposicion);
      if (disp !== 'mismo') {
        // cada caño lleva un solo circuito: §5.1 adentro y separación afuera
        const dentro = factorConducto(porCircuito);
        if (disp === 'libres' || !param.aplicarAgrupamientoEnterrado) return dentro;
        return dentro * factorPorCircuitos(GRUPO_ENTERRADO[disp], circuitos);
      }
    }
    return factorConducto(nConductores);
  }
  // Si el factor de agrupamiento del circuito sale de una tabla IEC de
  // referencia (y no del §5.1 de UTE), devuelve la tabla; si no, null.
  // ---------- Corriente de cortocircuito por el método del Anexo ----------
  // RBT-UTE, Capítulo II - Anexo §7, Tablas A, B y C (N.5, junio 2001).
  // Tabla A: Icc en bornes del transformador (500 MVA aguas arriba), en A.
  // A 220 V el Anexo no da valores desde 1250 kVA.
  const ANEXO_TABLA_A = {
    kva: [16, 25, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000],
    220: [1000, 1560, 2490, 3110, 3920, 4970, 6210, 7750, 9900, 12350, 15400, 19340, 24500, 31200, 38200, 35350, 40350, null, null, null],
    380: [580, 900, 1450, 1800, 2270, 2870, 3590, 4480, 5720, 7140, 8900, 11200, 14150, 17650, 22100, 24800, 27800, 31400, 36600, 39100],
  };
  // Tablas B (220 V) y C (380 V): Icc al extremo de un cable. Cada fila de
  // secciones da, por columna, la longitud en metros (null = sin dato); cada
  // fila de "Icc arriba" da, en la misma columna, la Icc abajo en kA.
  // Las transcripciones son literales, erratas incluidas; se corrigen al usar.
  const ANEXO_TABLA_B = {
    red: 220, tabla: 'B',
    secciones: [
      { cu: 1.5, al: 2.5, l: [null, null, null, null, 1, null, null, 2] },
      { cu: 2.5, al: 4, l: [null, null, null, 1, null, null, 2, 3] },
      { cu: 4, al: 6, l: [null, null, 1, null, null, 2, 3, 4] },
      { cu: 6, al: 10, l: [null, 1, null, null, 2, 3, 4, 6] },
      { cu: 10, al: 16, l: [1, null, 2, null, 3, 5, 7, 10] },
      { cu: 16, al: 25, l: [1, 2, null, 3, 5, 8, 11, 16] },
      { cu: 25, al: 35, l: [1, 3, 4, 5, 8, 13, 18, 25] },
      { cu: 35, al: 50, l: [2, 4, 5, 7, 11, 18, 25, 35] },
      { cu: 50, al: 70, l: [3, 5, 8, 10, 15, 25, 35, 50] },
      { cu: null, al: 95, l: [3, 6, 9, 12, 18, 30, 42, 60] },
      { cu: 70, al: 120, l: [4, 8, 11, 15, 23, 38, 53, 75] },
      { cu: null, al: 150, l: [4, 8, 12, 16, 24, 40, 57, 81] },
      { cu: 95, al: 185, l: [5, 10, 14, 19, 29, 48, 67, 96] },
      { cu: 120, al: 240, l: [6, 12, 18, 24, 36, 60, 84, 120] },
      { cu: 150, al: null, l: [6, 13, 20, 26, 39, 65, 91, 130] },
      { cu: 185, al: 300, l: [7, 15, 23, 30, 46, 77, 108, 154] },
      { cu: 240, al: null, l: [9, 19, 28, 38, 57, 96, 134, 192] },
      { cu: 300, al: null, l: [12, 24, 36, 48, 72, 120, 168, 240] },
    ],
    icc: [
      { arriba: 15, abajo: [14, 14, 13, 12, 10, 8, 6, 5] },
      { arriba: 20, abajo: [19, 18, 16, 15, 12, 9, 7, 5] },
      { arriba: 25, abajo: [23, 21, 19, 17, 14, 10, 7, 5] },
      { arriba: 30, abajo: [28, 24, 21, 19, 15, 10, 7, 5] },
      { arriba: 35, abajo: [31, 27, 23, 20, 15, 10, 8, 5] },
      { arriba: 40, abajo: [36, 30, 25, 21, 16, 10, 8, 6] },
      { arriba: 45, abajo: [39, 32, 27, 22, 16, 11, 8, 6] },
      { arriba: 50, abajo: [43, 34, 28, 23, 17, 11, 8, 6] },
      { arriba: 60, abajo: [49, 38, 29, 24, 17, 11, 8, 6] },
      { arriba: 70, abajo: [55, 40, 31, 25, 17, 11, 8, 6] },
      { arriba: 80, abajo: [61, 43, 32, 26, 18, 11, 8, 6] },
      { arriba: 90, abajo: [66, 45, 33, 26, 18, 11, 8, 6] },
      { arriba: 100, abajo: [70, 46, 34, 26, 18, 11, 8, 6] },
    ],
  };
  const ANEXO_TABLA_C = {
    red: 380, tabla: 'C',
    secciones: [
      { cu: 1.5, al: 2.5, l: [null, null, null, 1, null, null, 2, null] },
      { cu: 2.5, al: 4, l: [null, null, 1, null, null, 2, 3, 4] },
      { cu: 4, al: 6, l: [null, 1, null, null, 2, 3, 4, 6] },
      { cu: 6, al: 10, l: [1, null, null, 2, 3, 4, 6, 10] },
      { cu: 10, al: 16, l: [1, 2, 3, 3, 5, 7, 10, 15] },
      { cu: 16, al: 25, l: [2, null, 5, 5, 8, 11, 16, 24] },
      { cu: 25, al: 35, l: [3, 4, 7, 8, 13, 18, 25, 38] },
      { cu: 35, al: 50, l: [4, 5, 10, 11, 18, 25, 35, 53] },
      { cu: 50, al: 70, l: [5, 8, 12, 15, 25, 35, 50, 75] },
      { cu: null, al: 95, l: [6, 9, 15, 18, 30, 42, 60, 90] },
      { cu: 70, al: 120, l: [8, 11, 16, 23, 38, 53, 75, 113] },
      { cu: null, al: 150, l: [8, 12, 19, 24, 40, 57, 81, 122] },
      { cu: 95, al: 185, l: [10, 14, 24, 29, 48, 67, 96, 145] },
      { cu: 120, al: 240, l: [12, 18, 36, 36, 60, 84, 120, 180] },
      { cu: 150, al: null, l: [13, 20, 30, 39, 65, 91, 130, 195] },
      { cu: 185, al: 300, l: [15, 23, 38, 46, 77, 108, 154, 231] },
      { cu: 240, al: null, l: [19, 28, 38, 27, 96, 134, 192, 288] },
      { cu: 300, al: null, l: [24, 36, 48, 72, 120, 168, 240, 360] },
    ],
    icc: [
      { arriba: 15, abajo: [14, 14, 13, 12, 11, 9, 7, 6] },
      { arriba: 20, abajo: [19, 18, 17, 16, 13, 10, 8, 6] },
      { arriba: 25, abajo: [23, 22, 20, 18, 14, 11, 9, 6] },
      { arriba: 30, abajo: [27, 25, 23, 20, 15, 12, 9, 6] },
      { arriba: 35, abajo: [31, 28, 26, 21, 16, 12, 9, 6] },
      { arriba: 40, abajo: [35, 32, 28, 23, 16, 13, 9, 6] },
      { arriba: 45, abajo: [38, 34, 30, 21, 17, 13, 9, 6] },
      { arriba: 50, abajo: [41, 36, 32, 25, 17, 13, 9, 6] },
      { arriba: 60, abajo: [47, 40, 25, 27, 18, 13, 9, 6] },
      { arriba: 70, abajo: [52, 44, 37, 28, 18, 13, 10, 6] },
      { arriba: 80, abajo: [58, 47, 39, 29, 18, 13, 10, 7] },
      { arriba: 90, abajo: [62, 49, 41, 29, 19, 14, 10, 7] },
      { arriba: 100, abajo: [65, 51, 42, 30, 19, 14, 10, 7] },
    ],
  };

  // Las Tablas B y C publicadas por UTE contienen algunos valores que rompen la
  // progresión esperable (por ejemplo, en la Tabla C aparecen secuencias no
  // monótonas). La app NO los corrige por inferencia. Se usan los valores
  // impresos literalmente y, si la celda requerida participa de una anomalía,
  // la Icc queda pendiente para evitar una falsa precisión normativa.
  function celdaTablaAnexoAmbigua(filaLongitudes, filaIcc, col) {
    const l = filaLongitudes || [];
    const i = (filaIcc && filaIcc.abajo) || [];
    const indices = new Set([col - 1, col, col + 1].filter((x) => x >= 0));
    for (const j of indices) {
      if (j > 0 && l[j] !== null && l[j - 1] !== null && l[j] < l[j - 1]) return true;
      if (j > 0 && i[j] !== undefined && i[j - 1] !== undefined && i[j] > i[j - 1]) return true;
    }
    return false;
  }
  function tablaAnexoPorRed(red) { return Number(red) === 220 ? ANEXO_TABLA_B : ANEXO_TABLA_C; }
  function redAnexoPorDefecto(draft) { return draft && draft.sistemaId === 'tri_it' ? 220 : 380; }

  // Tabla A. Una potencia intermedia toma el transformador inmediato superior.
  function iccTablaA(kva, red) {
    const col = ANEXO_TABLA_A[Number(red) === 220 ? 220 : 380];
    const i = ANEXO_TABLA_A.kva.findIndex((k) => k >= Number(kva));
    if (i < 0) return null;
    let a = null;
    for (let j = 0; j <= i; j++) if (col[j] !== null) a = Math.max(a || 0, col[j]);
    return col[i] === null ? null : a / 1000;
  }

  // Tablas B y C: Icc al final de un tramo de cable.
  // - Sección: la fila del material igual o inmediata superior (un cable más
  //   grueso atenúa menos, así que es del lado seguro). Menor que la primera
  //   fila, la primera; mayor que la última, la última.
  // - Longitud: la columna con la longitud igual o inmediata inferior. Si el
  //   tramo es más corto que la primera longitud de la fila, no se atenúa.
  // - Icc arriba: la fila igual o inmediata superior. Por debajo de 15 kA se
  //   usa la de 15 y el resultado nunca supera la Icc de arriba.
  function iccPorTramoAnexo(red, iccArribaKa, seccion, material, largo) {
    const t = tablaAnexoPorRed(red);
    const mat = material === 'aluminio' ? 'al' : 'cu';
    const filas = t.secciones.filter((f) => f[mat] !== null);
    const fila = filas.find((f) => f[mat] >= Number(seccion)) || filas[filas.length - 1];
    const L = Number(largo) || 0;
    let col = -1;
    fila.l.forEach((x, j) => { if (x !== null && x <= L) col = j; });
    const base = { tabla: t.tabla, seccionFila: fila[mat], largo: L };
    if (col < 0) return { ...base, ka: iccArribaKa, atenua: false };
    const arriba = t.icc.find((f) => f.arriba >= iccArribaKa);
    if (!arriba) return { ...base, ka: null, fueraDeTabla: true };
    if (celdaTablaAnexoAmbigua(fila.l, arriba, col)) {
      return { ...base, ka: null, ambigua: true, filaArriba: arriba.arriba, largoColumna: fila.l[col],
        error: 'La celda necesaria de la Tabla ' + t.tabla + ' participa de una anomalía no monótona en la publicación UTE; no se corrige por inferencia.' };
    }
    return { ...base, ka: Math.min(iccArribaKa, arriba.abajo[col]), atenua: true, filaArriba: arriba.arriba, largoColumna: fila.l[col] };
  }

  // Icc en el tablero: Tabla A por el transformador, después la red/acometida
  // hasta el medidor y por último el alimentador hasta el tablero.
  function calcularIccAnexo(draft) {
    const a = (draft && draft.acometida) || {};
    if (!(Number(a.trafoKva) > 0)) return null;
    const red = Number(a.red) === 220 || Number(a.red) === 380 ? Number(a.red) : redAnexoPorDefecto(draft);
    const pasos = [];
    const bornes = iccTablaA(a.trafoKva, red);
    if (bornes === null) return { ka: null, red, pasos, error: 'La Tabla A no da valor para ' + a.trafoKva + ' kVA a ' + red + ' V.' };
    pasos.push('Tabla A: ' + a.trafoKva + ' kVA a ' + red + ' V → ' + fmt(bornes) + ' kA en bornes');
    let ka = bornes;
    const tramos = [
      { nombre: 'red y acometida', l: a.redL, s: a.redSeccion, m: a.redMaterial || 'aluminio' },
      { nombre: 'alimentador', l: a.l !== undefined ? a.l : ACOMETIDA_DEFECTO.l, s: a.seccion || calcularAcometida(draft).seccion, m: 'cobre' },
    ];
    for (const tr of tramos) {
      if (!(Number(tr.l) > 0) || !(Number(tr.s) > 0)) continue;
      const r = iccPorTramoAnexo(red, ka, tr.s, tr.m, tr.l);
      if (r.fueraDeTabla) return { ka: null, red, pasos, error: 'La Icc de ' + fmt(ka) + ' kA supera la mayor fila de la Tabla ' + r.tabla + ' (100 kA).' };
      if (r.ambigua) return { ka: null, red, pasos, error: r.error + ' Cargá una Icc informada/medida o realizá un cálculo específico.' };
      pasos.push('Tabla ' + r.tabla + ', ' + tr.nombre + ' ' + fmt(tr.l, 0) + ' m de ' + fmt(tr.s, tr.s < 10 ? 1 : 0).replace(/,0$/, '') + ' mm² ' +
        (tr.m === 'aluminio' ? 'Al' : 'Cu') + ' → ' + fmt(r.ka) + ' kA' + (r.atenua ? '' : ' (tramo más corto que la tabla: sin atenuar)'));
      ka = r.ka;
    }
    return { ka, red, pasos, bornes };
  }

  // Corriente de cortocircuito que corresponde al circuito, en tres niveles:
  //   real        → la cargada (en el circuito o en el tablero): se verifica;
  //   subestacion → instalación con SE propia (> 50 kW) sin dato: no hay
  //                 default, se exige la Icc (Anexo Tabla A, sin atenuar);
  //   plaza       → suministro estándar sin dato: 6 kA para elegir la
  //                 térmica, marcado como no verificado.
  function iccDelCircuito(p) {
    const param = NORMATIVE_PACK.parametros;
    const real = Number(p.iccKa) > 0 ? Number(p.iccKa) : (Number(p.iccTableroKa) > 0 ? Number(p.iccTableroKa) : null);
    if (real !== null) {
      const origen = Number(p.iccKa) > 0 ? 'informada' : (p.iccTableroOrigen || 'informada');
      return { fuente: 'real', iccKa: real, origen };
    }
    if (p.conSubestacion) return { fuente: 'subestacion', iccKa: null };
    return { fuente: 'plaza', iccKa: param.iccPlazaKa };
  }
  // Poder de corte con el que se cotiza la protección. En termomagnéticos
  // manda el Icn de la IEC 60898-1 (el del rectángulo del frente); el Icu de
  // la IEC 60947-2 de la ficha es otro ensayo y no entra en la comparación.
  // Si no se declara, se toma el primer escalón de la gama que cubre la Icc y
  // el mínimo que corresponde a la corriente nominal (inA).
  function pisoPoderCorte(inA) {
    let ka = 0;
    for (const f of NORMATIVE_PACK.parametros.pisoPoderCorte) if ((Number(inA) || 0) >= f.desdeA) ka = f.ka;
    return ka;
  }
  function poderCorteDe(p, inA) {
    const param = NORMATIVE_PACK.parametros;
    const icc = iccDelCircuito(p);
    const piso = pisoPoderCorte(inA);
    const declarado = Number(p.poderCorteKa) > 0 ? Number(p.poderCorteKa) : null;
    const mcb = (p.tipoProteccion || 'mcb') === 'mcb';
    const base = { ...icc, pisoKa: piso, mcb };
    if (declarado !== null) return { ...base, poderCorteKa: declarado, linea: null, declarado: true };
    if (!mcb || icc.iccKa === null) return { ...base, poderCorteKa: null, linea: null, declarado: false };
    const exigido = Math.max(icc.iccKa, piso);
    const g = param.gamaPoderCorte.find((x) => x.icnKa >= exigido) || null;
    const conLinea = g && !((Number(inA) || 0) > param.gamaHastaA);
    return { ...base, poderCorteKa: g ? g.icnKa : null, linea: conLinea ? g.linea : null, declarado: false, fueraDeGama: !g };
  }
  // Instalación con subestación propia: marcada a mano o potencia > 50 kW.
  function contextoCortocircuito(draft) {
    const acom = (draft && draft.acometida) || {};
    let conSubestacion = acom.subestacion === 'si';
    if (acom.subestacion !== 'si' && acom.subestacion !== 'no' && draft) {
      const sistema = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
      const r = calcularPotencia(draft.cargas || [], sistema, draft.factores || {});
      const kw = Math.max(r.suministroSugerido || 0, r.pDemandTotal / 1000);
      conSubestacion = r.fueraRango || kw > NORMATIVE_PACK.parametros.potenciaSubestacionKw;
    }
    // La Icc cargada a mano manda; si no hay, la calculada con el Anexo.
    const anexo = draft ? calcularIccAnexo(draft) : null;
    if (Number(acom.iccKa) > 0) return { iccTableroKa: Number(acom.iccKa), iccTableroOrigen: 'informada', conSubestacion, anexo };
    if (anexo && anexo.ka !== null) return { iccTableroKa: anexo.ka, iccTableroOrigen: 'calculada', conSubestacion, anexo };
    return { iccTableroKa: null, conSubestacion, anexo };
  }
  function textoPoderCorte(pc) {
    if (pc.poderCorteKa === null) return pc.fuente === 'subestacion' ? 'PdC a definir (falta Icc)' : 'PdC a definir';
    return (pc.linea ? pc.linea + ' ' : '') + fmt(pc.poderCorteKa, 0) + ' kA' + (pc.mcb ? ' (IEC 60898-1)' : ' (IEC 60947-2)');
  }

  // Texto de la aprobación del supuesto 2, o '' si todavía no está aprobado.
  function textoAprobacionSupuesto2() {
    const a = NORMATIVE_PACK.parametros.aprobacionSupuesto2;
    if (!a || !a.nombre) return '';
    const fecha = a.fecha ? a.fecha.split('-').reverse().join('/') : '';
    return 'aprobado por ' + a.nombre + (a.categoria ? ' (técnico instalador UTE Cat. ' + a.categoria + ')' : '') + (fecha ? ' el ' + fecha : '');
  }
  function factorDeReferencia(p) {
    const param = NORMATIVE_PACK.parametros;
    if ((Number(p.agrupados) || 1) <= 1) return null;
    if (p.metodo === 'aire' && param.aireLibreSeparado) return null;
    if (MONTAJE_DEFECTO[p.metodo]) {
      return p.separados2De || !param.aplicarAgrupamientoAire ? null : 'IEC 60364-5-52 Tabla B.52.17';
    }
    if (p.metodo === 'enterrado' && param.aplicarAgrupamientoEnterrado) {
      const disp = disposicionEnterrado(p.disposicion);
      return disp === 'mismo' || disp === 'libres' ? null : 'IEC 60364-5-52 Tabla B.52.19';
    }
    return null;
  }
  function tablaAmpacidad(categoria, material, aislacion) {
    const cat = TABLAS_UTE[categoria] || TABLAS_UTE.conducto;
    const mat = cat[material === 'aluminio' ? 'aluminio' : 'cobre'];
    return mat[aislacion === 'xlpe' ? 'xlpe' : 'pvc'];
  }
  const MARGEN_TERMICA_CASA = 0.80;
  // Criterio ADONAI de diseño (no requisito IEC/UTE): en selección automática
  // se procura que Ib no supere el 80 % de In. Así se evita dejar una térmica
  // trabajando demasiado cerca de su corriente nominal y se conserva margen
  // razonable para pequeñas ampliaciones/variaciones de carga. Siempre manda
  // además la condición normativa Ib <= In <= Iz.
  function nearestBreaker(ib, iz) {
    for (const b of BREAKER_RATINGS) {
      if (ib <= b * MARGEN_TERMICA_CASA && b <= iz) return b;
    }
    return null;
  }
  // Diámetro de caño por las tablas del Capítulo IV, contando los conductores
  // que van adentro. 0,75 mm² no figura: se usa la fila de 1 mm², que es más
  // exigente. Devuelve null si ningún diámetro de la tabla alcanza.
  function diametroCano(seccion, cantidadConductores, metodo) {
    let sec = Number(seccion);
    if (sec === 0.75) sec = 1;
    const tabla = metodo === 'enterrado' ? CANO_UTE_TABLA_III_PESADO : CANO_UTE_TABLA_II;
    const capacidades = tabla[sec];
    if (!capacidades) return null;
    const n = Math.max(1, Number(cantidadConductores) || 1);
    for (const d of Object.keys(capacidades).map(Number).sort((a, b) => a - b)) {
      if ((capacidades[d] || 0) >= n) return d;
    }
    return null;
  }
  // Ancho de bandeja portacable según cantidad de cables que lleva (criterio del usuario,
  // no una tabla normativa).
  // Con qué cable se resuelve cada método. Los que no figuran van con cable
  // unipolar por dentro del caño, que es lo habitual.
  const CABLE_POR_METODO = {
    aire: { precio: 'cableBajoGoma', etiqueta: 'bajo goma' },
    bandeja: { precio: 'cableBajoPlastico', etiqueta: 'bajo plástico' },
  };
  const ANCHO_BANDEJA = [{ n: 6, ancho: 150 }, { n: Infinity, ancho: 200 }];
  // Medida de caño que hay que comprar para un diámetro calculado: la misma si
  // se consigue, y si no la siguiente hacia arriba. Si el cálculo pide más de
  // lo que hay, devuelve el diámetro pedido — así el material queda en $0 y se
  // ve, en vez de cotizar en silencio un caño más angosto del que corresponde.
  function medidaCano(d, disponibles) {
    const medidas = Object.keys(disponibles || {}).map(Number).sort((a, b) => a - b);
    for (const m of medidas) if (m >= d) return m;
    return d;
  }

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
    // Carga mínima que se puede solicitar: 3,5 kW en monofásica —es el escalón
    // más chico de uso general— y 7,6 kW en trifásica.
    const minimoDiseno = sistema.fases === 1 ? 3.5 : 7.6;
    // Una demanda por encima del mayor escalón cargado no recibe una potencia
    // menor: queda marcada para trámite específico.
    const fueraRango = pKw > 0 && suministroSugerido === null;
    return { potenciaInstalada, pDemandTotal, qDemandTotal, sDemandTotal, cosPhiEq, corriente, suministroSugerido, minimoDiseno, fueraRango };
  }


  // ---------- Balance de fases ----------
  // UTE Cap. II §9 obliga a repartir las cargas monofásicas en suministros
  // trifásicos y su Tabla I limita el desequilibrio a 20 % hasta 50 kW y 15 %
  // por encima. Ese numeral no explicita la fórmula porcentual; para hacer la
  // comprobación reproducible la app usa como criterio técnico:
  //   100 · max(|I_fase - I_promedio|) / I_promedio
  // Las corrientes se obtienen de la demanda de cada carga cuando existe el
  // vínculo carga→circuito; en circuitos manuales se usa Ib.
  function cpx(re, im) { return { re, im }; }
  function cpxAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function cpxPolar(mag, deg) {
    const a = deg * Math.PI / 180;
    return { re: mag * Math.cos(a), im: mag * Math.sin(a) };
  }
  function cpxNeg(a) { return { re: -a.re, im: -a.im }; }
  function cpxMag(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }

  function demandaCircuitoParaBalance(c, draft) {
    const cargas = (draft && draft.cargas) || [];
    const factores = (draft && draft.factores) || {};
    const carga = c.cargaId ? cargas.find((x) => x.id === c.cargaId) : null;
    let cosPhi = Number(c.cosPhi);
    if (!(cosPhi > 0 && cosPhi <= 1)) cosPhi = carga && Number(carga.cosPhi) > 0 ? Number(carga.cosPhi) : 1;
    let sVA = 0;
    let fuente = 'Ib del circuito';
    if (carga) {
      const pTotal = (Number(carga.potenciaW) || 0) * (Number(carga.cantidad) || 0);
      const factor = factores[carga.categoria] ?? 1;
      const pDemanda = pTotal * factor;
      if (pDemanda > 0) {
        sVA = pDemanda / cosPhi;
        fuente = 'carga vinculada con factor de demanda';
      }
    }
    const fases = Number(c.fases);
    const v = Number(c.v) || 230;
    if (!(sVA > 0) && Number(c.ib) > 0) {
      sVA = fases === 3 ? SQRT3 * v * Number(c.ib) : v * Number(c.ib);
    }
    const ibDemanda = sVA > 0 ? (fases === 3 ? sVA / (SQRT3 * v) : sVA / v) : 0;
    const phiDeg = Math.acos(Math.min(1, Math.max(0, cosPhi))) * 180 / Math.PI;
    return { sVA, ibDemanda, cosPhi, phiDeg, fuente };
  }

  function opcionesFaseCircuito(sistema) {
    if (!sistema || sistema.fases !== 3) return [];
    if (sistema.id === 'tri_it') {
      return [
        { v: 'L1-L2', label: 'L1–L2' },
        { v: 'L2-L3', label: 'L2–L3' },
        { v: 'L3-L1', label: 'L3–L1' },
      ];
    }
    return [
      { v: 'L1', label: 'L1' },
      { v: 'L2', label: 'L2' },
      { v: 'L3', label: 'L3' },
    ];
  }

  function faseAsignadaValida(c, sistema) {
    if (!sistema || sistema.fases !== 3 || Number(c.fases) !== 1) return true;
    return opcionesFaseCircuito(sistema).some((x) => x.v === c.faseAsignada);
  }

  function calcularBalanceFases(draft) {
    const sistema = (draft && SISTEMAS[draft.sistemaId]) || SISTEMAS.tri_tt;
    if (sistema.fases !== 3) {
      return { aplica: false, estado: 'no_aplica', corrientes: [0,0,0], promedio: 0, desequilibrioPct: 0, limitePct: null, faseMax: null, corrienteMax: 0, pendientes: [], causas: [], notas: [] };
    }
    const corr = [cpx(0,0), cpx(0,0), cpx(0,0)];
    const pendientes = [], causas = [], notas = [];
    const detalles = [];
    const circuitos = (draft && draft.circuitos) || [];
    const angFase = [0, -120, 120];
    const angPar = { 'L1-L2': 30, 'L2-L3': -90, 'L3-L1': 150 };
    const indicesPar = { 'L1-L2': [0,1], 'L2-L3': [1,2], 'L3-L1': [2,0] };

    circuitos.forEach((c) => {
      if (c.cargaDesvinculada) return;
      const fases = Number(c.fases);
      if (c.fasesConfirmadas === false || !(fases === 1 || fases === 3)) {
        pendientes.push('"' + (c.nombre || 'Circuito') + '": falta confirmar si es monofásico o trifásico.');
        return;
      }
      const d = demandaCircuitoParaBalance(c, draft);
      if (!(d.ibDemanda > 0)) {
        pendientes.push('"' + (c.nombre || 'Circuito') + '": no hay corriente/potencia válida para el balance.');
        return;
      }
      if (fases === 3) {
        for (let i=0;i<3;i++) corr[i] = cpxAdd(corr[i], cpxPolar(d.ibDemanda, angFase[i] - d.phiDeg));
        detalles.push({ id:c.id, nombre:c.nombre || 'Circuito', fases:3, asignacion:'L1-L2-L3', corriente:d.ibDemanda, fuente:d.fuente });
        return;
      }
      if (!faseAsignadaValida(c, sistema)) {
        pendientes.push('"' + (c.nombre || 'Circuito') + '": falta asignar la fase' + (sistema.id === 'tri_it' ? ' o par de conductores' : '') + '.');
        return;
      }
      if (sistema.id === 'tri_it') {
        const par = indicesPar[c.faseAsignada];
        const iPar = cpxPolar(d.ibDemanda, angPar[c.faseAsignada] - d.phiDeg);
        corr[par[0]] = cpxAdd(corr[par[0]], iPar);
        corr[par[1]] = cpxAdd(corr[par[1]], cpxNeg(iPar));
      } else {
        const idx = { L1:0, L2:1, L3:2 }[c.faseAsignada];
        corr[idx] = cpxAdd(corr[idx], cpxPolar(d.ibDemanda, angFase[idx] - d.phiDeg));
      }
      detalles.push({ id:c.id, nombre:c.nombre || 'Circuito', fases:1, asignacion:c.faseAsignada, corriente:d.ibDemanda, fuente:d.fuente });
    });

    const corrientes = corr.map(cpxMag);
    const promedio = (corrientes[0] + corrientes[1] + corrientes[2]) / 3;
    const corrienteMax = Math.max(...corrientes);
    const idxMax = corrientes.indexOf(corrienteMax);
    const desequilibrioPct = promedio > 0 ? Math.max(...corrientes.map((x) => Math.abs(x - promedio))) / promedio * 100 : 0;
    const pot = calcularPotencia((draft && draft.cargas) || [], sistema, (draft && draft.factores) || {});
    const guardado = draft && draft.balanceFases ? Number(draft.balanceFases.potenciaContratadaKw) : 0;
    const potenciaContratadaKw = guardado > 0 ? guardado : pot.suministroSugerido;
    const fuentePotencia = guardado > 0 ? 'ingresada' : (pot.suministroSugerido !== null ? 'suministro sugerido' : 'pendiente');
    const limitePct = potenciaContratadaKw !== null && Number(potenciaContratadaKw) > 0 ? (Number(potenciaContratadaKw) <= 50 ? 20 : 15) : null;
    if (limitePct === null) pendientes.push('Falta definir la potencia contratada/proyectada para aplicar el límite de desequilibrio de UTE.');
    if (!pendientes.length && limitePct !== null && desequilibrioPct > limitePct + 1e-9) {
      causas.push('Desequilibrio de fases de ' + fmt(desequilibrioPct) + ' %, superior al máximo de ' + fmt(limitePct,0) + ' % para ' + fmt(potenciaContratadaKw,1) + ' kW de potencia contratada/proyectada.');
    }
    notas.push('Corrientes de línea para balance: L1 ' + fmt(corrientes[0]) + ' A · L2 ' + fmt(corrientes[1]) + ' A · L3 ' + fmt(corrientes[2]) + ' A.');
    notas.push('Índice aplicado = máxima desviación respecto de la corriente media / corriente media × 100. Es el criterio técnico documentado de la app para operacionalizar la Tabla I de UTE; el numeral 9 fija los límites pero no explicita la fórmula.');
    return {
      aplica:true, estado: causas.length ? 'no_cumple' : (pendientes.length ? 'pendiente' : 'cumple'),
      corrientes, promedio, desequilibrioPct, limitePct, faseMax:['L1','L2','L3'][idxMax], corrienteMax,
      potenciaContratadaKw: potenciaContratadaKw || null, fuentePotencia, pendientes, causas, notas, detalles,
    };
  }

  function autoBalancearFases(draft) {
    const sistema = (draft && SISTEMAS[draft.sistemaId]) || SISTEMAS.tri_tt;
    if (sistema.fases !== 3) return;
    const candidatos = opcionesFaseCircuito(sistema).map((x) => x.v);
    const monos = ((draft && draft.circuitos) || []).filter((c) => Number(c.fases) === 1 && c.fasesConfirmadas !== false && !c.cargaDesvinculada);
    monos.sort((a,b) => demandaCircuitoParaBalance(b,draft).ibDemanda - demandaCircuitoParaBalance(a,draft).ibDemanda);
    monos.forEach((c) => {
      let mejor = candidatos[0], mejorIdx = Infinity, mejorMax = Infinity;
      candidatos.forEach((fase) => {
        const anterior = c.faseAsignada;
        c.faseAsignada = fase;
        const b = calcularBalanceFases(draft);
        const idx = Number.isFinite(b.desequilibrioPct) ? b.desequilibrioPct : Infinity;
        if (idx < mejorIdx - 1e-9 || (Math.abs(idx-mejorIdx) < 1e-9 && b.corrienteMax < mejorMax)) {
          mejor = fase; mejorIdx = idx; mejorMax = b.corrienteMax;
        }
        c.faseAsignada = anterior;
      });
      c.faseAsignada = mejor;
      c.faseManual = false;
    });
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
    const uso = p.uso || 'fuerza';
    const minimo = Math.max(MINIMOS_REGLAMENTARIOS[uso] ?? 1, MINIMOS_COMERCIALES[uso] ?? 1.5);
    const curva = curvaProteccionDe(p);
    const tempF = getTempFactorUTE(aislacion, p.tempAmb ?? TEMP_AMBIENTE_DEFECTO);
    if (tempF === null) {
      return {
        apto: false, ib, seccionCapacidad: null, seccionCaida: null, minimo, curva,
        error: 'Temperatura ambiente fuera del rango de la Tabla XIV para esta aislación: el cálculo no se puede verificar.',
      };
    }
    // Conductores que se cuentan para el agrupamiento dentro del caño: todos
    // los que van adentro, incluidos el neutro del trifásico y el conductor de
    // protección. Es criterio de la casa y es MÁS EXIGENTE que el Anexo §5.1,
    // que no computa ninguno de esos dos. Ojo que es otra cosa que la columna
    // de la tabla de ampacidad: ahí se usa la de 2 conductores cargados en
    // monofásico y la de 3 en trifásico, que es lo que dice el reglamento.
    const conductoresPorCircuito = fases === 1 ? 3 : 5;
    const nConductores = (Number(p.agrupados) || 1) * conductoresPorCircuito;
    const groupF = getGroupFactorUTE(p, nConductores, conductoresPorCircuito);
    const solarF = getSolarFactorUTE(Boolean(p.expuestoSol));
    const terreno = factorTerrenoEnterrado(p);
    const terrenoF = terreno.factor || 1;
    const k = getConductividadUTE(material, aislacion);
    // Límite: el de UTE para el uso, o el de proyecto si es más exigente.
    const caidaUTE = limiteCaidaUTE(uso);
    const caidaProyecto = Number(p.caidaMax) > 0 ? Number(p.caidaMax) : caidaUTE;
    const caidaMax = limiteCaidaEfectivo(uso, caidaProyecto);
    // El reglamento mide la caída desde el origen de la instalación: lo que ya
    // se perdió antes del circuito —el alimentador entre el medidor y el
    // tablero, u otro tramo cargado a mano— se suma a la del circuito.
    const caidaPrevia = Math.max(0, Number(p.caidaPrevia) || 0) + Math.max(0, Number(p.caidaAguasArribaPct) || 0);
    const inManual = Number(p.inProteccion) > 0 ? Number(p.inProteccion) : null;

    let seccionCapacidad = null, seccionCaida = null, elegido = null;
    for (const row of tabla) {
      if (row.s < minimo) continue;
      const izBase = fases === 1 ? row.c2 : row.c3;
      const iz = izBase * tempF * groupF * solarF * terrenoF;
      if (seccionCapacidad === null && iz >= ib) seccionCapacidad = row.s;
      const dU = caidaVolt(fases, l, ib, cosPhi, k, row.s);
      const dUPct = (dU / v) * 100;
      const dUPctTotal = dUPct + caidaPrevia;
      if (seccionCaida === null && dUPctTotal <= caidaMax) seccionCaida = row.s;
      // Además de capacidad y caída, tiene que existir una térmica que proteja
      // el conductor (In >= Ib y In <= Iz). Si se fijó una a mano, tiene que
      // ser esa; si no, la primera de catálogo que cumpla.
      if (iz >= ib && dUPctTotal <= caidaMax && elegido === null) {
        const breaker = inManual !== null
          ? (inManual >= ib && inManual <= iz ? inManual : null)
          : nearestBreaker(ib, iz);
        if (breaker !== null) elegido = { seccion: row.s, iz, dUPct, dUPctTotal, breaker };
      }
    }
    const factores = { ft: tempF, fa: groupF, fs: solarF, fr: terrenoF, terreno, k, caidaUTE, caidaProyecto, caidaMax, caidaPrevia };
    if (!elegido) return { apto: false, ib, seccionCapacidad, seccionCaida, minimo, curva, ...factores };
    return {
      apto: true, ib, seccionCapacidad, seccionCaida, minimo, curva, ...factores,
      seccionAdoptada: elegido.seccion, iz: elegido.iz, breaker: elegido.breaker,
      dUPct: elegido.dUPct, dUPctTotal: elegido.dUPctTotal,
    };
  }

  // e = 2·L·I·cosφ/(K·S) en monofásico y √3·L·I·cosφ/(K·S) en trifásico.
  function caidaVolt(fases, l, ib, cosPhi, k, seccion) {
    if (!(k > 0) || !(seccion > 0)) return 0;
    return (fases === 1 ? 2 : SQRT3) * l * ib * cosPhi / (k * seccion);
  }

  /*
   * Comprobación del circuito, con la sección y la protección que se quieran
   * verificar (por defecto, las que eligió la app). Son las tres condiciones
   * que tienen que cumplirse a la vez:
   *
   *   1. capacidad de conducción          Iz >= Ib
   *   2. coordinación con la protección   Ib <= In <= Iz   (y I2 <= 1,45·Iz)
   *   3. caída de tensión                 ΔU% <= máximo del uso
   */
  // Energía que admite un conductor de cobre en cortocircuito, en A²s, según la
  // fórmula del Anexo §7: I = 0,34·S/√t·√log10((234+θf)/(234+θi)) kA. θi es la
  // temperatura de servicio (70 °C PVC, 90 °C XLPE) y θf la final: 160 °C, que
  // es la de PVC y la conservadora para XLPE si no se sabe si los terminales
  // son prensados (con prensados UTE admite 250 °C).
  function i2tAdmisibleCobre(seccion, aislacion) {
    const ti = aislacion === 'xlpe' ? 90 : 70;
    const tf = 160;
    return Math.pow(340 * seccion, 2) * Math.log10((234 + tf) / (234 + ti));
  }

  function comprobarCircuito(p, opciones) {
    const o = opciones || {};
    const base = calcularSeccion(p);
    const seccion = Number(o.seccion) || base.seccionAdoptada || null;
    const inProt = Number(o.in) || Number(p.inProteccion) || base.breaker || null;
    const fases = p.fases || 1;
    const material = p.material === 'aluminio' ? 'aluminio' : 'cobre';
    const aislacion = p.aislacion === 'xlpe' ? 'xlpe' : 'pvc';
    const categoria = CATEGORIA_METODO[p.metodo] || 'conducto';
    const ib = Number(p.ib) || 0;
    const v = Number(p.v) || 230;
    const uso = p.uso || 'fuerza';
    const caidaUTE = limiteCaidaUTE(uso);
    const caidaProyecto = Number(p.caidaMax) > 0 ? Number(p.caidaMax) : caidaUTE;
    const caidaMax = limiteCaidaEfectivo(uso, caidaProyecto);
    const caidaPrevia = Math.max(0, Number(p.caidaPrevia) || 0) + Math.max(0, Number(p.caidaAguasArribaPct) || 0);
    const r = { ib, seccion, in: inProt, caidaMax, caidaUTE, caidaProyecto, caidaPrevia, causas: [], pendientes: [], notas: [], base };
    if (!seccion) {
      r.causas.push(base.error || 'No hay ninguna sección de tabla que sirva para este circuito.');
      r.verificado = false;
      r.estado = 'no_cumple';
      return r;
    }

    const fila = tablaAmpacidad(categoria, material, aislacion).find((x) => x.s === seccion);
    r.ft = getTempFactorUTE(aislacion, p.tempAmb ?? TEMP_AMBIENTE_DEFECTO);
    if (r.ft === null) {
      r.causas.push('Temperatura ambiente fuera del rango de la Tabla XIV para esta aislación: el cálculo no se puede verificar.');
      r.verificado = false;
      r.estado = 'no_cumple';
      return r;
    }
    r.fa = getGroupFactorUTE(p, (Number(p.agrupados) || 1) * (fases === 1 ? 3 : 5), fases === 1 ? 3 : 5);
    r.fs = getSolarFactorUTE(Boolean(p.expuestoSol));
    r.terreno = factorTerrenoEnterrado(p);
    r.fr = r.terreno.factor || 1;
    r.izTabla = fila ? (fases === 1 ? fila.c2 : fila.c3) : 0;
    r.iz = r.izTabla * r.ft * r.fa * r.fs * r.fr;
    r.k = getConductividadUTE(material, aislacion);
    r.dU = caidaVolt(fases, Number(p.l) || 0, ib, Number(p.cosPhi) || 1, r.k, seccion);
    r.dUPct = (r.dU / v) * 100;
    r.dUPctTotal = r.dUPct + caidaPrevia;

    // 1 y 2: capacidad y coordinación
    r.cumpleCapacidad = r.iz >= ib;
    r.cumpleIbIn = inProt !== null && ib <= inProt;
    r.cumpleInIz = inProt !== null && inProt <= r.iz;
    r.tipoProteccion = o.tipoProteccion || p.tipoProteccion || 'mcb';
    r.curvaProteccion = curvaProteccionDe(p);
    r.curvaSugerida = CURVA_SUGERIDA[uso] || 'C';
    r.rangoMagnetico = CURVA_MAGNETICA_IEC[r.curvaProteccion] || CURVA_MAGNETICA_IEC.C;
    const i2Manual = Number(o.i2 || p.i2 || 0);
    r.i2 = inProt === null ? null
      : (r.tipoProteccion === 'mcb' ? inProt * FACTOR_I2_MCB : (i2Manual > 0 ? i2Manual : null));
    r.limite145 = r.iz * 1.45;
    r.cumpleI2 = r.i2 !== null ? r.i2 <= r.limite145 : null;
    // 3: caída
    r.cumpleCaida = r.dUPctTotal <= caidaMax;

    // Cortocircuito (Cap. V §1.b y Anexo §7). Cuando falta un dato necesario la
    // comprobación queda pendiente: nunca se presenta el circuito como verificado.
    const pc = poderCorteDe(p, inProt);
    r.iccFuente = pc.fuente;
    r.iccOrigen = pc.origen || null;
    r.pisoPoderCorteKa = pc.pisoKa;
    r.iccKa = pc.iccKa;
    r.poderCorteKa = pc.poderCorteKa;
    r.poderCorteLinea = pc.linea;
    r.poderCorteTexto = textoPoderCorte(pc);
    r.icu60947Ka = Number(p.icu60947Ka) > 0 ? Number(p.icu60947Ka) : null;
    r.i2tPasante = Number(p.i2tPasante) > 0 ? Number(p.i2tPasante) : null;
    r.tiempoDespejeS = Number(p.tiempoDespejeS) > 0 ? Number(p.tiempoDespejeS) : null;
    // Con la Icc de plaza no hay verificación numérica, salvo que se declare
    // un poder de corte menor que ese piso.
    r.cumplePisoPoderCorte = r.poderCorteKa === null || !pc.mcb ? null : r.poderCorteKa >= pc.pisoKa;
    if (r.iccKa === null || r.poderCorteKa === null) r.cumplePoderCorte = null;
    else if (pc.fuente === 'plaza') r.cumplePoderCorte = r.poderCorteKa < r.iccKa ? false : null;
    else r.cumplePoderCorte = r.poderCorteKa >= r.iccKa;
    if (r.cumplePisoPoderCorte === false) r.cumplePoderCorte = false;
    r.i2tAdmisible = material === 'cobre' ? i2tAdmisibleCobre(seccion, aislacion) : null;
    r.i2tExigido = null;
    if (material === 'cobre') {
      // Un termomagnético limita la corriente: manda la energía que deja pasar
      // (dato del fabricante). Con otro dispositivo, Icc² · t.
      if (r.tipoProteccion === 'mcb') r.i2tExigido = r.i2tPasante;
      else if (pc.fuente === 'real' && r.tiempoDespejeS !== null) r.i2tExigido = Math.pow(r.iccKa * 1000, 2) * r.tiempoDespejeS;
    }
    r.cumpleTermicaCorto = r.i2tExigido !== null ? r.i2tExigido <= r.i2tAdmisible : null;

    // Icc mínima en el extremo más alejado y tiempo de desconexión. Esta
    // comprobación es distinta del poder de corte (Icc máxima en origen).
    r.desconexion = evaluarIccMinimaYDesconexion(p, inProt, r.curvaProteccion, r.i2tAdmisible);
    r.iccMinFinalA = r.desconexion.iccMinA;
    r.umbralMagneticoA = r.desconexion.umbralMagneticoA;
    r.cumpleDisparoMagnetico = r.desconexion.magnetico;
    r.tiempoAdmisibleIccMinS = r.desconexion.tiempoAdmisibleS;
    r.tiempoDesconexionVerificadoS = r.desconexion.tiempoActuacionS;
    r.cumpleTiempoDesconexion = r.desconexion.cumpleTiempo;
    r.cumpleIccMinima = r.desconexion.cumpleIccMinima;

    if (!r.cumpleCapacidad) r.causas.push('Sección insuficiente por capacidad térmica: la corriente admisible corregida (' + fmt(r.iz) + ' A) no llega a la corriente de diseño (' + fmt(ib) + ' A).');
    if (inProt === null) r.causas.push('No hay una protección de catálogo que coordine con este conductor.');
    if (inProt !== null && !r.cumpleIbIn) r.causas.push('La protección seleccionada es inferior a la corriente de diseño del circuito. Seleccione una corriente nominal superior.');
    if (inProt !== null && !r.cumpleInIz) r.causas.push('La corriente nominal de la protección supera la capacidad admisible del conductor. Aumente la sección del conductor o seleccione una protección adecuada.');
    if (inProt !== null && r.cumpleIbIn && r.cumpleInIz) {
      r.cargaTermicaPct = inProt > 0 ? (ib / inProt) * 100 : null;
      if (r.cargaTermicaPct > MARGEN_TERMICA_CASA * 100) {
        r.notas.push('La protección cumple Ib ≤ In ≤ Iz, pero la corriente de diseño utiliza ' + fmt(r.cargaTermicaPct, 0) + '% de In. Criterio ADONAI: en selección automática se busca Ib ≤ 80% de In; si fue selección manual, conviene revisar el margen disponible.');
      }
    }
    if (r.tipoProteccion === 'mcb') {
      r.notas.push('Curva ' + r.curvaProteccion + ': disparo magnético IEC 60898-1 aprox. entre ' + r.rangoMagnetico.min + '·In y ' + r.rangoMagnetico.max + '·In.');
      if (r.curvaProteccion !== r.curvaSugerida) {
        r.notas.push('La curva fue fijada distinta de la sugerida (' + r.curvaSugerida + '). Verificar corriente de arranque e Icc mínima al final del circuito.');
      }
      if (r.curvaProteccion === 'D' && uso !== 'motor') r.notas.push('Curva D fuera de un circuito identificado como motor: justificar el pico de arranque de la carga y verificar la Icc mínima necesaria para disparo magnético.');
    }
    if (r.cumpleI2 === false) r.causas.push('La corriente convencional de actuación I2 supera 1,45 · Iz.');
    if (r.cumpleI2 === null && inProt !== null) r.pendientes.push('Falta la I2 del fabricante para completar la comprobación de sobrecarga de este dispositivo.');
    if (!r.cumpleCaida) r.causas.push('Caída de tensión superior al límite: ' + fmt(r.dUPctTotal) + ' % desde el medidor' +
      (caidaPrevia > 0 ? ' (' + fmt(caidaPrevia) + ' % antes del circuito + ' + fmt(r.dUPct) + ' % del circuito)' : '') +
      ' contra un máximo de ' + fmt(caidaMax) + ' %.');
    if (r.cumplePisoPoderCorte === false) {
      r.causas.push('El poder de corte de la protección (' + fmt(r.poderCorteKa) + ' kA) es inferior al mínimo de la casa para una térmica de ' +
        inProt + ' A: ' + fmt(pc.pisoKa, 0) + ' kA (6 kA hasta 99 A y 10 kA desde 100 A).');
    } else if (r.cumplePoderCorte === false) {
      r.causas.push('El poder de corte de la protección (' + fmt(r.poderCorteKa) + ' kA) es inferior a la corriente de cortocircuito ' +
        (pc.fuente === 'plaza' ? 'de plaza' : 'prevista') + ' (' + fmt(r.iccKa) + ' kA).');
    }
    if (pc.fueraDeGama) r.causas.push('La corriente de cortocircuito (' + fmt(r.iccKa) + ' kA) supera el mayor escalón de la gama de termomagnéticos (' +
      fmt(NORMATIVE_PACK.parametros.gamaPoderCorte.slice(-1)[0].icnKa, 0) + ' kA): hace falta una protección de mayor poder de corte o filiación con la de cabecera.');
    if (pc.fuente === 'subestacion') r.pendientes.push('Instalación con subestación propia (más de ' + NORMATIVE_PACK.parametros.potenciaSubestacionKw +
      ' kW): falta la corriente de cortocircuito en el tablero. No se aplica el valor de plaza: tomarla de la Tabla A del Anexo para el transformador real, sin atenuar por cable, y elegir el escalón de la gama que la cubra.');
    r.factorReferencia = factorDeReferencia(p);
    if (r.factorReferencia) {
      const aprobado = textoAprobacionSupuesto2();
      r.notas.push('Factor de agrupamiento ' + fmt(r.fa) + ': valor de referencia (' + r.factorReferencia + '), ' +
        (aprobado ? 'criterio ' + aprobado + ' (supuesto 2).' : 'pendiente de confirmación por técnico instalador autorizado por UTE (supuesto 2).'));
    }
    if (!(ib > 0)) r.pendientes.push('Falta la corriente de diseño o la carga del circuito.');
    if (!(Number(p.l) > 0)) r.pendientes.push('Falta la longitud eléctrica del circuito.');
    if (r.cumplePoderCorte === null) {
      r.pendientes.push('La comprobación del poder de corte está incompleta: falta una Icc real o un dato de protección verificable.');
    }
    if (r.poderCorteKa === null && !pc.mcb && pc.fuente !== 'subestacion') {
      r.notas.push('Poder de corte sin verificar: falta el Icu (IEC 60947-2) del dispositivo' +
        (pc.fuente === 'plaza' ? '; la Icc de plaza es ' + fmt(r.iccKa, 0) + ' kA.' : '.'));
    } else if (pc.fuente === 'plaza' && r.cumplePoderCorte !== false) {
      r.notas.push('Poder de corte de plaza: se cotiza ' + r.poderCorteTexto + ' con la Icc de plaza de ' + fmt(r.iccKa, 0) + ' kA' +
        (pc.pisoKa > r.iccKa ? ' (mínimo de ' + fmt(pc.pisoKa, 0) + ' kA por ser una térmica de 100 A o más)' : '') +
        '. El cortocircuito no está verificado contra una Icc real: cargar la informada por UTE o medida.');
    } else if (pc.fuente === 'real' && !pc.declarado && r.poderCorteKa !== null) {
      r.notas.push('Se cotiza ' + r.poderCorteTexto + ', el primer escalón que cubre la Icc ' + (pc.origen === 'calculada' ? 'calculada con el Anexo' : 'informada') + ' de ' + fmt(r.iccKa) + ' kA' +
        (pc.pisoKa > r.iccKa ? ' y el mínimo de ' + fmt(pc.pisoKa, 0) + ' kA para 100 A o más' : '') + '.');
    } else if (pc.fuente === 'real' && r.poderCorteKa === null && !pc.fueraDeGama) {
      r.notas.push('Poder de corte sin verificar: falta el Icu (IEC 60947-2) del dispositivo.');
    }
    r.desconexion.causas.forEach((x) => r.causas.push(x));
    r.desconexion.pendientes.forEach((x) => r.pendientes.push(x));
    r.desconexion.notas.forEach((x) => r.notas.push(x));
    if (material === 'aluminio') r.notas.push('La verificación térmica en cortocircuito del aluminio requiere un cálculo específico: UTE advierte una reducción del tiempo admisible.');
    else if (r.cumpleTermicaCorto === false) r.causas.push('El conductor no soporta la energía del cortocircuito: ' + fmt(r.i2tExigido / 1000, 0) + ' kA²s contra ' + fmt(r.i2tAdmisible / 1000, 0) + ' kA²s admisibles.');
    else if (r.cumpleTermicaCorto === null) {
      r.pendientes.push(r.tipoProteccion === 'mcb'
        ? 'Cortocircuito térmico pendiente: falta la energía pasante I²t del termomagnético (dato del fabricante).'
        : 'Cortocircuito térmico pendiente: falta la corriente de cortocircuito o el tiempo de despeje.');
    }

    // En enterrados la memoria sólo cierra si se declararon las condiciones
    // térmicas del terreno dentro del campo de aplicación de la referencia.
    if (r.terreno && r.terreno.aplica) {
      r.terreno.pendientes.forEach((x) => r.pendientes.push(x));
      if (r.terreno.rho !== null) r.notas.push('Terreno: ρt = ' + fmt(r.terreno.rho) + ' K·m/W; factor adicional = ' + fmt(r.fr, 2) + ' (IEC 60364-5-52 B.52.16, referencia complementaria).' +
        (r.terreno.rho === RESISTIVIDAD_TERRENO_UTE_DEFECTO ? ' Valor de condición normal de UTE (supuesto 1); reemplazar por un estudio de suelo real si se cuenta con uno.' : ''));
      if (r.terreno.profundidad !== null && r.terreno.profundidad <= r.terreno.limiteProfundidad) r.notas.push('Profundidad enterrada = ' + fmt(r.terreno.profundidad) + ' m, dentro del alcance tabulado hasta ' + fmt(r.terreno.limiteProfundidad) + ' m.');
    }
    if (p.cargaDesvinculada) {
      r.pendientes.push('El circuito ya no tiene una carga vinculada: revisar o eliminar manualmente.');
    }

    // Auditoría de integridad de datos: no se completa un dato inválido con un
    // valor favorable por defecto cuando de él depende un "Verificado".
    const cosPhiIngresado = Number(p.cosPhi);
    if (!(Number(p.v) > 0)) r.pendientes.push('Falta una tensión válida del circuito.');
    if (!(p.fases === 1 || p.fases === 3)) r.pendientes.push('Cantidad de fases inválida o no definida.');
    if (p.fasesConfirmadas === false) r.pendientes.push('Falta confirmar si el circuito es monofásico o trifásico; en un suministro trifásico no se heredan automáticamente las fases del suministro.');
    if (p.sistemaId && SISTEMAS[p.sistemaId]) {
      const sistemaCircuito = SISTEMAS[p.sistemaId];
      if (sistemaCircuito.fases === 1 && p.fases === 3) {
        r.causas.push('El circuito está definido como trifásico pero el suministro del proyecto es monofásico.');
      }
      if (p.fases === 1 || p.fases === 3) {
        const tensionEsperada = tensionDeCircuito(sistemaCircuito, p.fases);
        if (Number(p.v) > 0 && Math.abs(Number(p.v) - tensionEsperada) > 1) {
          r.causas.push('La tensión del circuito (' + fmt(Number(p.v), 0) + ' V) no coincide con la alimentación ' + p.fases + 'φ prevista para ' + sistemaCircuito.label + ' (' + fmt(tensionEsperada, 0) + ' V).');
        }
      }
    }
    if (!(cosPhiIngresado > 0 && cosPhiIngresado <= 1)) r.pendientes.push('Falta un cos φ válido (mayor que 0 y menor o igual a 1).');
    if (p.iccAnexoError && !(Number(p.iccKa) > 0) && !(Number(p.iccTableroKa) > 0)) {
      r.pendientes.push('Icc calculada con el Anexo pendiente: ' + p.iccAnexoError);
    }

    // VE: la protección diferencial individual forma parte de la comprobación
    // del circuito, no sólo de una sugerencia de materiales.
    if (p.equipo === 'cargador_ve') {
      const modo = String(p.modoCargaVe || '');
      if (!['1','2','3','4'].includes(modo)) {
        r.pendientes.push('VE: falta indicar el modo de carga (1, 2, 3 o 4) para verificar la protección diferencial del punto de conexión.');
      }
      const difInd = p.diferencialIndividualVe || 'desconocido';
      if (difInd === 'no') {
        r.causas.push('VE: el punto de conexión no tiene protección diferencial individual. UTE Cap. XXX §9.4.2 la exige para cada punto, con IΔn ≤ 30 mA y corte omnipolar.');
      } else if (difInd !== 'si') {
        r.pendientes.push('VE: falta confirmar/proyectar la protección diferencial individual de IΔn ≤ 30 mA y corte de todos los conductores activos.');
      }
      if (modo === '3' && p.rdcdd6mA !== true) {
        r.notas.push('VE modo 3 sin RDC-DD de 6 mA confirmado: la solución propuesta debe usar diferencial tipo B ≤ 30 mA.');
      } else if (modo === '3' && p.rdcdd6mA === true) {
        r.notas.push('VE modo 3 con RDC-DD de 6 mA: UTE admite diferencial tipo A o F ≤ 30 mA.');
      } else if (modo === '1' || modo === '2' || modo === '4') {
        r.notas.push('VE modo ' + modo + ': protección diferencial individual al menos tipo A y ≤ 30 mA.');
      }
    }

    r.pe = comprobarPeCircuito(p, seccion);
    r.pe.causas.forEach((x)=>r.causas.push(x));
    r.pe.pendientes.forEach((x)=>r.pendientes.push(x));
    r.pe.notas.forEach((x)=>r.notas.push(x));

    r.estado = r.causas.length ? 'no_cumple' : (r.pendientes.length ? 'pendiente' : 'cumple');
    r.verificado = r.estado === 'cumple';
    return r;
  }

  function ibDesdeInput(p) {
    // p: {datoConocido, potenciaKw, corrienteA, cosPhi, rendimiento, v, fases}
    if (p.datoConocido === 'corriente') return Number(p.corrienteA) || 0;
    const pW = (Number(p.potenciaKw) || 0) * 1000;
    const cosPhi = Number(p.cosPhi) || 1;
    // El rendimiento entra cuando la potencia declarada es la útil en el eje
    // —motores, bombas—: la que toma de la red es mayor.
    const rend = Number(p.rendimiento) > 0 ? Number(p.rendimiento) : 1;
    const sVA = (cosPhi > 0 ? pW / cosPhi : pW) / rend;
    return p.fases === 1 ? sVA / p.v : sVA / (SQRT3 * p.v);
  }

  function siguienteSeccionNormalizada(minimo) {
    const m = Number(minimo) || 0;
    const normalizadas=[1,1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400];
    return normalizadas.find((x) => x >= m) || m || null;
  }
  function peMinimoCircuitoIEC(seccionFase, material, separado, protegidoMec) {
    const sf = Number(seccionFase) || 0;
    if (!(sf > 0)) return null;
    let base = sf <= 16 ? sf : (sf <= 35 ? 16 : sf / 2);
    if (separado) {
      const mec = material === 'aluminio' ? 16 : (protegidoMec ? 2.5 : 4);
      base = Math.max(base, mec);
    }
    return siguienteSeccionNormalizada(base);
  }
  function comprobarPeCircuito(p, seccionFase) {
    const separado = p.peSeparado === true;
    const protegido = p.peProteccionMecanica !== false;
    const minimo = peMinimoCircuitoIEC(seccionFase, p.material || 'cobre', separado, protegido);
    const seccion = Number(p.peSeccion) > 0 ? Number(p.peSeccion) : minimo;
    const ensayo = p.continuidadPe || 'pendiente';
    const tieneR = p.resistenciaContinuidadPeOhm !== null && p.resistenciaContinuidadPeOhm !== undefined && p.resistenciaContinuidadPeOhm !== '' && Number(p.resistenciaContinuidadPeOhm) >= 0;
    const resistencia = tieneR ? Number(p.resistenciaContinuidadPeOhm) : null;
    const causas=[], pendientes=[], notas=[];
    if (!(seccion > 0)) pendientes.push('PE: falta definir la sección del conductor de protección.');
    else if (minimo && seccion < minimo) causas.push('PE: sección ' + fmt(seccion) + ' mm² menor que el mínimo adoptado de ' + fmt(minimo) + ' mm².');
    if (ensayo === 'no') causas.push('PE: el ensayo de continuidad indicó circuito de protección abierto/no continuo.');
    else if (ensayo !== 'si') pendientes.push('PE: falta ensayar y documentar la continuidad del conductor de protección hasta la masa del circuito.');
    if (ensayo === 'si') notas.push('PE: continuidad ensayada' + (resistencia !== null ? ' · R=' + fmt(resistencia,3) + ' Ω' : '') + '. IEC 60364-6 no se sustituye por un límite fijo universal de resistencia; se conserva el valor medido para trazabilidad.');
    notas.push('PE mínimo por referencia IEC 60364-5-54: ' + (minimo ? fmt(minimo) + ' mm²' : 'pendiente') + (separado ? (protegido ? ' · separado con protección mecánica' : ' · separado sin protección mecánica') : ' · en la misma canalización/cable que los conductores activos') + '.');
    return {seccion,minimo,separado,protegido,ensayo,resistencia,causas,pendientes,notas,estado:causas.length?'no_cumple':(pendientes.length?'pendiente':'cumple')};
  }

  function comprobarEquipotencialidad(draft) {
    const pg=(draft&&draft.proteccionGeneral)||{};
    const acom=calcularAcometida(draft);
    const caida=caidaPreviaDe(draft);
    let mayorPe=Number(acom.peSeccion)||0;
    ((draft&&draft.circuitos)||[]).forEach((c)=>{ const calc=calcularCircuito(c,caida); if(calc.apto){ const pe=comprobarPeCircuito(c,calc.seccionAdoptada); mayorPe=Math.max(mayorPe,Number(pe.seccion)||0); } });
    const minPrincipal=siguienteSeccionNormalizada(Math.max(6,Math.min(25,mayorPe/2||6)));
    const aplica=pg.equipotencialPrincipalAplica||'pendiente';
    const sec=Number(pg.equipotencialPrincipalSeccion)>0?Number(pg.equipotencialPrincipalSeccion):null;
    const cont=pg.equipotencialPrincipalContinuidad||'pendiente';
    const causas=[],pendientes=[],notas=[];
    if(aplica==='pendiente') pendientes.push('Falta evaluar si existen partes conductoras extrañas que deban incorporarse a la equipotencialidad principal.');
    if(aplica==='si'){
      if(!sec) pendientes.push('Falta definir/relevar la sección de la equipotencial principal.');
      else if(sec<minPrincipal) causas.push('Equipotencial principal: ' + fmt(sec) + ' mm² es menor que el mínimo adoptado de ' + fmt(minPrincipal) + ' mm² Cu.');
      if(cont==='no') causas.push('Equipotencial principal: el ensayo de continuidad no fue satisfactorio.');
      else if(cont!=='si') pendientes.push('Falta ensayar la continuidad de la equipotencial principal.');
    }
    const sup=pg.equipotencialSuplementariaAplica||'no';
    const supSec=Number(pg.equipotencialSuplementariaSeccion)>0?Number(pg.equipotencialSuplementariaSeccion):null;
    const supCont=pg.equipotencialSuplementariaContinuidad||'pendiente';
    const supProt=pg.equipotencialSuplementariaProtegida!==false;
    const minSup=siguienteSeccionNormalizada(Math.max(supProt?2.5:4, mayorPe/2||2.5));
    if(sup==='pendiente') pendientes.push('Falta definir si la obra requiere equipotencialidad suplementaria por local/condición especial.');
    if(sup==='si'){
      if(!supSec) pendientes.push('Falta definir/relevar la sección de la equipotencial suplementaria.');
      else if(supSec<minSup) causas.push('Equipotencial suplementaria: ' + fmt(supSec) + ' mm² es menor que el mínimo conservador adoptado de ' + fmt(minSup) + ' mm² Cu.');
      if(supCont==='no') causas.push('Equipotencial suplementaria: el ensayo de continuidad no fue satisfactorio.');
      else if(supCont!=='si') pendientes.push('Falta ensayar la continuidad de la equipotencial suplementaria.');
    }
    notas.push('UTE Cap. XXIII exige continuidad del circuito de tierra y conexiones por derivación; IEC 60364-5-54 se usa como referencia complementaria para dimensionar PE y equipotenciales.');
    return {mayorPe,minPrincipal,aplica,seccion:sec,continuidad:cont,suplementariaAplica:sup,suplementariaSeccion:supSec,minSuplementaria:minSup,causas,pendientes,notas,estado:causas.length?'no_cumple':(pendientes.length?'pendiente':'cumple')};
  }

  function requisitosAislamientoIEC(c) {
    const v = Number(c && c.v) || 0;
    if (!(v > 0)) return { tensionEnsayoV: null, minimoMohm: null };
    if (v <= 500) return { tensionEnsayoV: 500, minimoMohm: 1 };
    return { tensionEnsayoV: 1000, minimoMohm: 1 };
  }
  function comprobarEnsayoCircuito(c, draft) {
    const req = requisitosAislamientoIEC(c);
    const causas=[], pendientes=[], notas=[];
    const riso = Number(c.aislamientoMohm);
    const vtest = Number(c.aislamientoEnsayoV);
    if (!(riso > 0)) pendientes.push('Aislamiento: falta medir y registrar la resistencia de aislamiento.');
    else if (req.minimoMohm !== null && riso < req.minimoMohm) causas.push('Aislamiento: ' + fmt(riso,2) + ' MΩ es menor que el mínimo IEC de ' + fmt(req.minimoMohm,1) + ' MΩ.');
    if (!(vtest > 0)) pendientes.push('Aislamiento: falta registrar la tensión de ensayo utilizada.');
    else if (req.tensionEnsayoV && vtest !== req.tensionEnsayoV && !(vtest===250 && req.tensionEnsayoV===500)) causas.push('Aislamiento: tensión de ensayo ' + fmt(vtest,0) + ' Vcc no corresponde al criterio IEC adoptado para este circuito.');
    else if (vtest===250 && req.tensionEnsayoV===500) notas.push('Aislamiento ensayado a 250 Vcc: sólo válido cuando no resulta practicable desconectar SPD/electrónica sensible; se mantiene mínimo 1 MΩ.');

    const sistema = SISTEMAS[(draft&&draft.sistemaId)||c.sistemaId] || SISTEMAS.tri_tt;
    const polaridadAplica = Number(c.fases)===1 && sistema.id !== 'tri_it';
    if (polaridadAplica) {
      if (c.polaridad==='no') causas.push('Polaridad: el ensayo no fue satisfactorio.');
      else if (c.polaridad!=='si') pendientes.push('Polaridad: falta verificar fase/neutro y dispositivos unipolares.');
    }
    const secuenciaAplica = Number(c.fases)===3;
    if (secuenciaAplica) {
      if (c.secuenciaFases==='no') causas.push('Secuencia de fases: el orden medido no es el previsto/documentado.');
      else if (c.secuenciaFases!=='si') pendientes.push('Secuencia de fases: falta verificar el orden de fases.');
    }

    const pg=(draft&&draft.proteccionGeneral)||{};
    const d=diferencialDelCircuito(c);
    const tg=tipoDiferencialGeneral(calcularProteccionGeneral(draft||{proteccionGeneral:pg,circuitos:[]}));
    const rcdDedicado = c.equipo==='cargador_ve' || RANGO_DIFERENCIAL[d.tipo] > RANGO_DIFERENCIAL[tg];
    if (rcdDedicado) {
      if (c.ensayoRcd==='no') causas.push('RCD dedicado: el ensayo funcional/desconexión no fue satisfactorio.');
      else if (c.ensayoRcd!=='si') pendientes.push('RCD dedicado: falta ejecutar y documentar el ensayo del dispositivo.');
      if (c.ensayoRcd==='si' && !(Number(c.tiempoRcdS)>0)) pendientes.push('RCD dedicado: falta registrar el tiempo de actuación medido.');
    }

    const lazo = Number(c.impedanciaLazoTierraOhm)>0 ? Number(c.impedanciaLazoTierraOhm) : null;
    const esquema=esquemaContactosIndirectos(draft||{});
    const lazoAplica = esquema==='IT' && pg.masasInterconectadasIt===true;
    if (lazoAplica && lazo===null && !(Number(c.tiempoDefectoTierraS)>0)) pendientes.push('IT segundo defecto: falta documentar impedancia de lazo o tiempo de desconexión equivalente.');
    if (lazo!==null) notas.push('Impedancia de lazo de defecto a tierra registrada: ' + fmt(lazo,3) + ' Ω.');
    return {req,polaridadAplica,secuenciaAplica,rcdDedicado,lazoAplica,lazo,causas,pendientes,notas,estado:causas.length?'no_cumple':(pendientes.length?'pendiente':'cumple')};
  }
  function comprobarProtocoloEnsayos(draft) {
    const pg=(draft&&draft.proteccionGeneral)||{};
    const proto=(draft&&draft.protocoloEnsayos)||{};
    const causas=[],pendientes=[],notas=[],circuitos=[];
    ((draft&&draft.circuitos)||[]).forEach((c,i)=>{const r=comprobarEnsayoCircuito(c,draft); circuitos.push({indice:i,circuito:c,resultado:r}); r.causas.forEach(x=>causas.push('C'+(i+1)+' '+(c.nombre||'Circuito')+': '+x)); r.pendientes.forEach(x=>pendientes.push('C'+(i+1)+' '+(c.nombre||'Circuito')+': '+x));});
    if (pg.ensayoRcdGeneral==='no') causas.push('RCD general: el ensayo funcional/desconexión no fue satisfactorio.');
    else if (pg.ensayoRcdGeneral!=='si') pendientes.push('Falta documentar el ensayo funcional del diferencial general.');
    if (pg.ensayoRcdGeneral==='si' && !(Number(pg.tiempoDiferencialGeneralS)>0)) pendientes.push('RCD general: falta registrar el tiempo de actuación medido.');
    if (pg.ensayoFuncionalProtecciones==='no') causas.push('Pruebas funcionales: interruptores/aparamenta no funcionaron satisfactoriamente.');
    else if (pg.ensayoFuncionalProtecciones!=='si') pendientes.push('Falta ejecutar/documentar las pruebas funcionales de interruptores y aparatos de mando/protección.');
    if (!(Number(pg.resistenciaTierraOhm)>0)) pendientes.push('Falta medición de resistencia de puesta a tierra para el protocolo.');
    const eq=comprobarEquipotencialidad(draft); if(eq.estado==='no_cumple') causas.push('Continuidad/equipotencialidad: existen incumplimientos.'); else if(eq.estado==='pendiente') pendientes.push('Continuidad/equipotencialidad: quedan ensayos pendientes.');
    if (!proto.fecha) pendientes.push('Protocolo: falta fecha de ensayos.');
    if (!String(proto.tecnico||'').trim()) pendientes.push('Protocolo: falta identificar al técnico que realizó/verificó los ensayos.');
    if (!String(proto.instrumento||'').trim()) pendientes.push('Protocolo: falta identificar instrumento/equipo de medida.');
    if ((proto.calibracion||'pendiente')==='no') causas.push('Protocolo: instrumento declarado con calibración no vigente/no conforme.');
    else if ((proto.calibracion||'pendiente')!=='si') pendientes.push('Protocolo: falta confirmar calibración/verificación vigente del instrumento cuando corresponda.');
    notas.push('IEC 60364-6 se usa como referencia complementaria para la verificación inicial y el informe de ensayos. Los requisitos particulares de UTE y de instalaciones especiales prevalecen cuando correspondan.');
    return {circuitos,causas,pendientes,notas,estado:causas.length?'no_cumple':(pendientes.length?'pendiente':'cumple')};
  }

  // Todo lo que el motor necesita de un circuito guardado. Un solo lugar, así
  // la pantalla, la planilla y el PDF calculan exactamente lo mismo.
  function datosCircuito(c, caidaPrevia, ctx) {
    return {
      iccTableroKa: ctx ? ctx.iccTableroKa : null, iccTableroOrigen: ctx ? ctx.iccTableroOrigen : null,
      iccAnexoError: ctx && ctx.anexo && ctx.anexo.error ? ctx.anexo.error : null,
      conSubestacion: ctx ? ctx.conSubestacion : false,
      icu60947Ka: c.icu60947Ka,
      ib: c.ib, v: c.v, fases: c.fases, fasesConfirmadas: c.fasesConfirmadas !== false, sistemaId: c.sistemaId || null,
      l: c.l, material: c.material, metodo: c.metodo, aislacion: c.aislacion,
      tempAmb: c.tempAmb, agrupados: c.agrupados, disposicion: c.disposicion, montaje: c.montaje, separados2De: c.separados2De,
      resistividadTerreno: c.resistividadTerreno, profundidadEnterrado: c.profundidadEnterrado, cosPhi: c.cosPhi,
      caidaMax: c.caidaMax, caidaPrevia, uso: c.uso || 'fuerza', expuestoSol: c.expuestoSol,
      inProteccion: c.inProteccion, tipoProteccion: c.tipoProteccion || 'mcb', curvaProteccion: c.curvaProteccion || '', i2: c.i2,
      selectividadFabricante: c.selectividadFabricante || 'pendiente', selectividadLimiteKa: c.selectividadLimiteKa,
      iccKa: c.iccKa, poderCorteKa: c.poderCorteKa, i2tPasante: c.i2tPasante, tiempoDespejeS: c.tiempoDespejeS,
      iccMinFinalA: c.iccMinFinalA, zCortoFinalOhm: c.zCortoFinalOhm, tiempoDesconexionVerificadoS: c.tiempoDesconexionVerificadoS,
      cargaDesvinculada: c.cargaDesvinculada,
      equipo: c.equipo || 'comun', modoCargaVe: c.modoCargaVe || '', rdcdd6mA: Boolean(c.rdcdd6mA),
      diferencialIndividualVe: c.diferencialIndividualVe || 'desconocido',
      peSeccion: c.peSeccion, peSeparado: c.peSeparado === true, peProteccionMecanica: c.peProteccionMecanica !== false,
      continuidadPe: c.continuidadPe || 'pendiente', resistenciaContinuidadPeOhm: c.resistenciaContinuidadPeOhm,
    };
  }
  function calcularCircuito(c, caidaPrevia) {
    return calcularSeccion(datosCircuito(c, caidaPrevia));
  }

  /*
   * Alimentador entre el medidor y el tablero general. Su caída de tensión es
   * la que arrastran todos los circuitos, porque el reglamento mide desde el
   * origen de la instalación (Cap. II - Anexo §8) y no desde el tablero.
   *
   * La corriente es la demanda calculada de toda la instalación; la sección,
   * la que se cargue a mano o la que sale de proteger la térmica general.
   */
  const ACOMETIDA_DEFECTO = { l: 10, seccion: null, neutroSeccion: null, peSeccion: null };
  function corrienteNeutroFundamental(balance, sistema, ibDiseno) {
    if (sistema.id === 'tri_it') return { aplica:false, corriente:0, estado:'no_aplica', nota:'Sistema IT 230 V de 3 hilos: no se presupone conductor neutro.' };
    if (sistema.fases === 1) return { aplica:true, corriente:ibDiseno, estado:'calculado', nota:'Monofásico: por el neutro circula la corriente del circuito de alimentación.' };
    if (!balance || balance.estado === 'pendiente' || !Array.isArray(balance.corrientes)) {
      return { aplica:true, corriente:null, estado:'pendiente', nota:'Falta cerrar el balance de fases para estimar la componente fundamental de corriente por el neutro.' };
    }
    const [i1,i2,i3] = balance.corrientes.map((x)=>Math.max(0,Number(x)||0));
    // Suma vectorial de tres corrientes separadas 120°. Es una estimación de la
    // componente fundamental. No incluye armónicos triples, que se suman en N.
    const rad = Math.max(0, i1*i1 + i2*i2 + i3*i3 - i1*i2 - i2*i3 - i3*i1);
    return { aplica:true, corriente:Math.sqrt(rad), estado:'calculado', nota:'Componente fundamental estimada por suma vectorial L1/L2/L3; los armónicos triples no están modelados.' };
  }
  function peMinimoPequenoSuministro(seccionFase) {
    const sf = Number(seccionFase) || 0;
    if (!(sf > 0)) return null;
    return sf < 16 ? sf : 16;
  }
  function calcularAcometida(draft) {
    const acom = (draft && draft.acometida) || ACOMETIDA_DEFECTO;
    const sistema = (draft && SISTEMAS[draft.sistemaId]) || SISTEMAS.tri_tt;
    const l = Number(acom.l) || 0;
    const r = calcularPotencia((draft && draft.cargas) || [], sistema, (draft && draft.factores) || {});
    const fueraRango = r.suministroSugerido === null;
    const pW = (r.suministroSugerido || 0) * 1000;
    const ig = sistema.fases === 1 ? pW / sistema.v : pW / (SQRT3 * sistema.v);
    const maxCircuito = Math.max(0, ...(((draft && draft.circuitos) || []).map((c) => calcularCircuito(c).breaker || 0)));
    const balance = sistema.fases === 3 ? calcularBalanceFases(draft) : { aplica:false, estado:'no_aplica', corrienteMax:0 };
    const ibFaseMax = balance.aplica && balance.estado !== 'pendiente' ? balance.corrienteMax : 0;
    const ibDiseno = Math.max(ig, ibFaseMax, maxCircuito + 0.01);
    const datos = {
      ib: ibDiseno, v: sistema.v, fases: sistema.fases, l,
      material: 'cobre', metodo: 'embutido', aislacion: 'pvc', tempAmb: TEMP_AMBIENTE_DEFECTO,
      agrupados: 1, cosPhi: r.cosPhiEq || 1, caidaMax: 3, uso: 'fuerza',
    };
    const auto = calcularSeccion(datos);
    const seccion = Number(acom.seccion) || auto.seccionAdoptada || null;
    const comp = seccion ? comprobarCircuito(datos, { seccion }) : null;
    const iz = comp ? comp.iz : 0;
    const termicaIn = seccion ? nearestBreaker(ibDiseno, iz) : null;

    const hayMono = sistema.fases === 3 && ((draft && draft.circuitos) || []).some((c) => Number(c.fases) === 1);
    const iCaida = balance.aplica && balance.estado !== 'pendiente' && balance.corrienteMax > 0 ? balance.corrienteMax : r.corriente;
    const fasesCaida = hayMono && balance.aplica && balance.estado !== 'pendiente' ? 1 : sistema.fases;
    const vCaida = fasesCaida === 1 ? 230 : sistema.v;
    const dU = seccion ? caidaVolt(fasesCaida, l, iCaida, r.cosPhiEq || 1, getConductividadUTE('cobre', 'pvc'), seccion) : 0;
    const dUPct = vCaida ? (dU / vCaida) * 100 : 0;

    // NEUTRO. Por defecto se adopta la misma sección que fase: además de ser
    // conservador, evita subdimensionarlo cuando existan armónicos triples no
    // modelados. Una reducción manual se deja como pendiente de justificación.
    const neutroCalc = corrienteNeutroFundamental(balance, sistema, ibDiseno);
    const tieneNeutro = neutroCalc.aplica;
    const neutroSeccion = tieneNeutro ? (Number(acom.neutroSeccion) || seccion) : null;
    let neutroIz = null;
    if (tieneNeutro && neutroSeccion && neutroCalc.corriente !== null) {
      const dn = { ...datos, fases:1, v:230, ib:Math.max(neutroCalc.corriente,0.01), caidaMax:100 };
      const cn = comprobarCircuito(dn, { seccion: neutroSeccion });
      neutroIz = cn ? cn.iz : null;
    }
    const neutroCausas = [], neutroPendientes = [];
    if (tieneNeutro) {
      if (!neutroSeccion) neutroPendientes.push('Falta definir la sección del neutro del alimentador.');
      if (neutroCalc.estado === 'pendiente') neutroPendientes.push(neutroCalc.nota);
      if (neutroCalc.corriente !== null && neutroIz !== null && neutroIz < neutroCalc.corriente) neutroCausas.push('La capacidad admisible del neutro (' + fmt(neutroIz) + ' A) es menor que la corriente fundamental estimada (' + fmt(neutroCalc.corriente) + ' A).');
      if (seccion && neutroSeccion && neutroSeccion < seccion) neutroPendientes.push('El neutro es menor que fase. La app no modela armónicos triples: justificar la reducción con cálculo específico antes de declararlo verificado.');
    }

    // PE. Para pequeños/medianos suministros individuales se aplica el criterio
    // explícito del Cap. XXIII §4/§10. Fuera de ese alcance se adopta S_PE=S_fase
    // como criterio conservador, pero se mantiene pendiente la comprobación
    // térmica específica por corriente de falta/tiempo de despeje.
    const potenciaRefKw = Number(r.suministroSugerido) || (pW/1000) || 0;
    const alcancePe = sistema.fases === 1 ? potenciaRefKw <= 15 : (sistema.id === 'tri_tt' ? potenciaRefKw <= 20 : false);
    const peMin = alcancePe ? peMinimoPequenoSuministro(seccion) : seccion;
    const peSeccion = Number(acom.peSeccion) || peMin || null;
    const peCausas = [], pePendientes = [];
    if (!peSeccion) pePendientes.push('Falta definir la sección del conductor de protección (PE) del alimentador.');
    if (peMin && peSeccion < peMin) peCausas.push('El PE (' + fmt(peSeccion) + ' mm²) es menor que el mínimo adoptado (' + fmt(peMin) + ' mm²).');
    if (!alcancePe && peSeccion) pePendientes.push('Fuera del alcance simplificado del Cap. XXIII §4: falta documentar la comprobación térmica del PE frente a la máxima corriente de falta y el tiempo de despeje. Se adopta S_PE = S_fase como criterio conservador.');

    const causas = [], pendientes = [];
    if (!seccion) pendientes.push('No se pudo determinar la sección de fase del alimentador.');
    if (termicaIn === null && !fueraRango) causas.push('No hay una protección general normalizada que cumpla Ib ≤ In ≤ Iz con la sección de fase adoptada.');
    if (dUPct > 3) causas.push('La caída del alimentador supera el criterio de proyecto de 3 % reservado para poder alimentar circuitos de iluminación.');
    neutroCausas.forEach((x)=>causas.push('Neutro: '+x)); neutroPendientes.forEach((x)=>pendientes.push('Neutro: '+x));
    peCausas.forEach((x)=>causas.push('PE: '+x)); pePendientes.forEach((x)=>pendientes.push('PE: '+x));
    if (balance.aplica && balance.estado === 'pendiente') pendientes.push('Falta cerrar el balance de fases para validar corriente máxima de fase y neutro.');

    return {
      l, ib: r.corriente, ig, maxCircuito, ibFaseMax, ibDiseno, balance, seccion, iz,
      termicaIn: fueraRango ? null : termicaIn, fueraRango, automatica: !acom.seccion,
      dU, dUPct, datos, caidaConFaseMax: fasesCaida === 1 && sistema.fases === 3,
      tieneNeutro, neutroCorriente:neutroCalc.corriente, neutroNota:neutroCalc.nota,
      neutroSeccion, neutroAutomatica: tieneNeutro && !acom.neutroSeccion, neutroIz,
      peSeccion, peMin, peAutomatica: !acom.peSeccion, peAlcanceSimplificado:alcancePe,
      causas, pendientes, estado: causas.length ? 'no_cumple' : (pendientes.length ? 'pendiente' : 'cumple'),
    };
  }
  function caidaPreviaDe(draft) {
    if (!draft || !draft.acometida || !(Number(draft.acometida.l) > 0)) return 0;
    return calcularAcometida(draft).dUPct;
  }

  // ---------- Selectividad / coordinación de protecciones ----------
  // IEC 60364 trata la selectividad como coordinación entre dispositivos. Para
  // interruptores automáticos no basta comparar In: la selectividad total o
  // parcial debe respaldarse con curvas/tablas del fabricante y la Icc del punto.
  function comprobarSelectividadTermicas(draft) {
    const pg = calcularProteccionGeneral(draft);
    if (!pg.aplica || !(Number(pg.termicaIn) > 0)) return { estado:'pendiente', detalles:[], notas:['Falta definir/relevar la térmica general.'] };
    const detalles=[]; let hayPendiente=false, hayNo=false;
    const ctx=contextoCortocircuito(draft);
    const caida=caidaPreviaDe(draft);
    ((draft&&draft.circuitos)||[]).forEach((c)=>{
      const calc=calcularCircuito(c,caida);
      if (!calc.apto) return;
      const inDown=Number(c.inProteccion)||calc.breaker;
      const estadoFab=c.selectividadFabricante||'pendiente';
      const lim=Number(c.selectividadLimiteKa)>0?Number(c.selectividadLimiteKa):null;
      const comp=comprobarCircuito(datosCircuito(c,caida,ctx));
      let estado='pendiente', motivo='Falta tabla/curva de selectividad del fabricante para la pareja cabecera–circuito.';
      if (estadoFab==='total') { estado='cumple'; motivo='Selectividad total declarada según tabla/curva del fabricante.'; }
      else if (estadoFab==='no') { estado='no_selectiva'; motivo='El fabricante indica que esta combinación no es selectiva.'; }
      else if (estadoFab==='parcial') {
        if (lim===null) { estado='pendiente'; motivo='Selectividad parcial declarada, pero falta el límite de selectividad Is (kA).'; }
        else if (!(Number(comp.iccKa)>0) || comp.iccFuente==='plaza') { estado='pendiente'; motivo='Falta Icc real/calculada para comparar con el límite de selectividad ' + fmt(lim) + ' kA.'; }
        else if (comp.iccKa<=lim) { estado='cumple'; motivo='Selectividad parcial válida hasta ' + fmt(lim) + ' kA; Icc del circuito ' + fmt(comp.iccKa) + ' kA.'; }
        else { estado='no_selectiva'; motivo='Icc ' + fmt(comp.iccKa) + ' kA supera el límite de selectividad ' + fmt(lim) + ' kA.'; }
      }
      if (Number(pg.termicaIn)<=inDown && estadoFab==='pendiente') motivo += ' Además, In general ('+fmt(pg.termicaIn,0)+' A) no es mayor que In del circuito ('+fmt(inDown,0)+' A), por lo que no hay escalonamiento por corriente.';
      if (estado==='pendiente') hayPendiente=true;
      if (estado==='no_selectiva') hayNo=true;
      detalles.push({ circuito:c.nombre||'Circuito', inGeneral:Number(pg.termicaIn), inCircuito:inDown, curvaCircuito:curvaProteccionDe(c), estado, motivo, limiteKa:lim });
    });
    return { estado:hayNo?'no_selectiva':(hayPendiente?'pendiente':'cumple'), detalles, notas:['La selectividad entre interruptores no se declara por simple relación de corrientes: requiere datos del fabricante y la Icc del punto.'] };
  }

  function comprobarSelectividadDiferenciales(draft) {
    const pg=calcularProteccionGeneral(draft);
    if (!pg.aplica || !diferencialGeneralDisponible(pg)) return {estado:'pendiente', detalles:[], notas:['Falta confirmar/instalar el diferencial general.']};
    const tipoGen=tipoDiferencialGeneral(pg);
    const sensUp=Number(pg.diferencialSensibilidad)||30;
    const retardo=((draft.proteccionGeneral||{}).diferencialSelectividad||'instantaneo');
    const dedicados=[];
    ((draft&&draft.circuitos)||[]).forEach((c)=>{
      const d=diferencialDelCircuito(c);
      const requiereTipo=RANGO_DIFERENCIAL[d.tipo]>RANGO_DIFERENCIAL[tipoGen];
      const ve=c.equipo==='cargador_ve' && c.diferencialIndividualVe==='si';
      if (requiereTipo||ve) dedicados.push({c,tipo:d.tipo,sens:30});
    });
    if (!dedicados.length) return {estado:'no_aplica',detalles:[],notas:['No hay RCD dedicado aguas abajo que requiera coordinación en cascada.']};
    const detalles=dedicados.map((x)=>{
      const ratio=sensUp/x.sens;
      const sensibilidadOk=ratio>=3;
      const tiempoOk=retardo==='S';
      return {circuito:x.c.nombre||'Circuito',sensUp,sensDown:x.sens,ratio,tipoUp:tipoGen,tipoDown:x.tipo,retardo,estado:(sensibilidadOk&&tiempoOk)?'cumple':'no_selectiva',motivo:(sensibilidadOk&&tiempoOk)?'Cumple criterio IEC de selectividad total: IΔn aguas arriba ≥ 3× aguas abajo y cabecera tipo S.':'No se demuestra selectividad total IEC: se requiere IΔn aguas arriba ≥ 3× aguas abajo y dispositivo aguas arriba selectivo tipo S/temporizado.'};
    });
    return {estado:detalles.every(x=>x.estado==='cumple')?'cumple':'no_selectiva',detalles,notas:['La falta de selectividad no elimina por sí sola la protección diferencial; afecta principalmente continuidad de servicio y localización de la falla.']};
  }

  // Corrientes nominales en las que se fabrican los diferenciales.
  const RCD_NOMINALES = [25, 40, 63];
  function inDiferencial(amp) {
    return RCD_NOMINALES.find((x) => x >= amp) || null;
  }
  // Tipo de diferencial según lo que detecta (IEC 61008/61009, IEC 62423):
  //   AC → sólo alterna senoidal. No se propone nunca: casi todo artefacto
  //        actual tiene electrónica. Queda como elección manual con aviso.
  //   A  → alterna + continua pulsante. Es el de fábrica de la app.
  //   F  → lo de A + alta frecuencia hasta 1 kHz (variadores monofásicos).
  //   B  → lo de A y F + continua pura (cargador de auto, fotovoltaica,
  //        variador trifásico, UPS sin aislación).
  // La jerarquía es estricta: A no cubre a F y F no cubre a B. Además, una
  // fuga de continua pura puede cegar a un tipo A o F aguas arriba, que deja
  // de proteger incluso la parte de alterna.
  const TIPO_DIFERENCIAL_DEFECTO = 'A';
  const RANGO_DIFERENCIAL = { AC: 0, A: 1, F: 2, B: 3 };
  const TIPOS_DIFERENCIAL = [
    { v: 'A', label: 'Tipo A (recomendado)' },
    { v: 'F', label: 'Tipo F (variadores monofásicos)' },
    { v: 'B', label: 'Tipo B (continua pura)' },
    { v: 'AC', label: 'Tipo AC (sólo resistencias, no recomendado)' },
  ];
  // Electrónica del equipo que alimenta el circuito.
  const EQUIPOS_CIRCUITO = [
    { id: 'comun', label: 'Sin variador (electrónica común)', tipo: 'A' },
    { id: 'resistiva', label: 'Sólo resistencias, sin electrónica', tipo: 'A' },
    { id: 'variador_mono', label: 'Con variador monofásico (aire inverter, bomba, lavarropas)', tipo: 'F' },
    { id: 'variador_tri', label: 'Con variador de frecuencia trifásico', tipo: 'B' },
    { id: 'cargador_ve', label: 'Cargador de auto eléctrico', tipo: 'B' },
    { id: 'fotovoltaica', label: 'Inversor fotovoltaico', tipo: 'B' },
    { id: 'ups', label: 'UPS o rectificador sin aislación', tipo: 'B' },
  ];
  function tipoDiferencialGeneral(pg) {
    return (pg && RANGO_DIFERENCIAL[pg.diferencialTipo] !== undefined) ? pg.diferencialTipo : TIPO_DIFERENCIAL_DEFECTO;
  }
  function diferencialGeneralDisponible(pg) {
    if (!pg || !pg.aplica) return false;
    // En obra nueva el diferencial forma parte de la solución proyectada. En
    // una instalación existente sólo puede declararse cobertura cuando el
    // técnico confirmó que el dispositivo realmente está instalado.
    return pg.modo !== 'existente' || pg.diferencialExiste === true;
  }
  function textoTipoDiferencial(tipo) {
    return 'tipo ' + (RANGO_DIFERENCIAL[tipo] !== undefined ? tipo : TIPO_DIFERENCIAL_DEFECTO);
  }
  // Tipo propuesto para el circuito y por qué. En VE no se afirma que "todo
  // cargador pide B": UTE Cap. XXX distingue el modo de carga. Como la app no
  // pide el modo, adopta B de forma conservadora si no consta un RDC-DD de 6 mA.
  function diferencialDelCircuito(c) {
    const eq = EQUIPOS_CIRCUITO.find((e) => e.id === c.equipo) || EQUIPOS_CIRCUITO[0];
    if (eq.id === 'cargador_ve') {
      const modo = String(c.modoCargaVe || '');
      if (modo === '3' && c.rdcdd6mA) return { tipo: 'A', motivo: 'VE modo 3 con RDC-DD de 6 mA: tipo A/F permitido por UTE Cap. XXX §9.4.2', equipo: eq.id };
      if (modo === '3') return { tipo: 'B', motivo: 'VE modo 3 sin RDC-DD de 6 mA declarado: tipo B según UTE Cap. XXX §9.4.2', equipo: eq.id };
      if (modo === '1' || modo === '2' || modo === '4') return { tipo: 'A', motivo: 'VE modo ' + modo + ': al menos tipo A según UTE Cap. XXX §9.4.2', equipo: eq.id };
      return { tipo: 'B', motivo: 'Modo de carga VE pendiente: se muestra tipo B de forma conservadora hasta definirlo', equipo: eq.id };
    }
    return { tipo: eq.tipo, motivo: eq.label.toLowerCase(), equipo: eq.id };
  }
  // Diferencial dedicado cuando el general no alcanza el tipo que pide el
  // circuito, y avisos de coordinación con el general.
  function diferencialesDedicados(circuitos, tipoGeneral) {
    const dedicados = [];
    const avisos = [];
    const rg = RANGO_DIFERENCIAL[tipoGeneral];
    circuitos.forEach((c) => {
      const d = diferencialDelCircuito(c);
      if (RANGO_DIFERENCIAL[d.tipo] > rg) dedicados.push({ circuito: c, ...d });
      if (d.tipo === 'B' && rg < RANGO_DIFERENCIAL.B) {
        avisos.push('"' + (c.nombre || 'Circuito') + '" tiene configurado/propuesto tipo B: si queda aguas abajo del diferencial general tipo ' + tipoGeneral +
          ', una fuga de continua lo puede cegar. Alimentarlo antes del diferencial general, con su propio tipo B, o poner la cabecera en tipo B.');
      }
    });
    if (tipoGeneral === 'AC') {
      avisos.unshift('Diferencial general tipo AC: sólo detecta alterna senoidal. Casi cualquier artefacto actual tiene electrónica, así que sólo corresponde si toda la instalación son resistencias.');
    }
    return { dedicados, avisos };
  }

  // Protección general de toda la instalación. En obra nueva se propone y
  // dimensiona; en modificación/reparación/emergencia se verifica la existente.
  // Un trámite administrativo sin intervención física no fuerza esta comprobación.
  function calcularProteccionGeneral(draft) {
    if (!draft || !draft.obra || draft.obra.naturaleza === 'Trámite') return { aplica: false };
    const sistema = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
    const nueva = draft.obra.naturaleza === 'Instalación nueva';
    const enlace = calcularAcometida(draft);
    const pgGuardada = draft.proteccionGeneral || {};
    const comun = {
      aplica: true, modo: nueva ? 'nueva' : 'existente', enlace,
      termicaCurva: 'C', termicaPolos: sistema.fases === 1 ? 2 : (sistema.id === 'tri_it' ? 3 : 4),
      diferencialSensibilidad: Number(pgGuardada.diferencialSensibilidad) || 30,
      diferencialTipo: RANGO_DIFERENCIAL[pgGuardada.diferencialTipo] !== undefined ? pgGuardada.diferencialTipo : TIPO_DIFERENCIAL_DEFECTO,
      diferencialSelectividad: pgGuardada.diferencialSelectividad === 'S' ? 'S' : 'instantaneo',
      ambienteTierra: pgGuardada.ambienteTierra === 'humedo' ? 'humedo' : 'seco',
      resistenciaTierraOhm: Number(pgGuardada.resistenciaTierraOhm) > 0 ? Number(pgGuardada.resistenciaTierraOhm) : null,
      sobretensionesRiesgo: ['si','no'].includes(pgGuardada.sobretensionesRiesgo) ? pgGuardada.sobretensionesRiesgo : 'pendiente',
      pararrayosLps: pgGuardada.pararrayosLps === 'si' ? 'si' : (pgGuardada.pararrayosLps === 'no' ? 'no' : 'desconocido'),
      spdExiste: pgGuardada.spdExiste === 'si' ? 'si' : (pgGuardada.spdExiste === 'no' ? 'no' : 'desconocido'),
      spdTipo: pgGuardada.spdTipo || '',
      tiempoDiferencialGeneralS: Number(pgGuardada.tiempoDiferencialGeneralS) > 0 ? Number(pgGuardada.tiempoDiferencialGeneralS) : null,
      monitorAislamientoIt: pgGuardada.monitorAislamientoIt === 'si' ? true : (pgGuardada.monitorAislamientoIt === 'no' ? false : null),
      masasInterconectadasIt: pgGuardada.masasInterconectadasIt === 'si' ? true : (pgGuardada.masasInterconectadasIt === 'no' ? false : null),
      corrientePrimerDefectoMa: Number(pgGuardada.corrientePrimerDefectoMa) > 0 ? Number(pgGuardada.corrientePrimerDefectoMa) : null,
    };

    if (!nueva) {
      const termicaIn = Number(pgGuardada.termicaExistenteA) > 0 ? Number(pgGuardada.termicaExistenteA) : null;
      const diferencialIn = Number(pgGuardada.diferencialExistenteA) > 0 ? Number(pgGuardada.diferencialExistenteA) : null;
      const diferencialExiste = pgGuardada.diferencialExiste === 'si' ? true : (pgGuardada.diferencialExiste === 'no' ? false : null);
      const coordina = termicaIn !== null ? (termicaIn >= enlace.ibDiseno && termicaIn <= enlace.iz) : null;
      return { ...comun, termicaIn, diferencialIn, diferencialExiste, coordina,
               alimentadorConfirmado: Number(draft.acometida && draft.acometida.seccion) > 0,
               fueraRango: enlace.fueraRango };
    }

    if (enlace.fueraRango || enlace.termicaIn === null) {
      return { ...comun, termicaIn: null, diferencialIn: null, diferencialExiste: true, coordina: false, fueraRango: enlace.fueraRango,
               motivo: enlace.fueraRango
                 ? 'La demanda supera el mayor escalón de potencia cargado: requiere trámite y selección específicos.'
                 : 'Ninguna térmica de catálogo coordina con el conductor de enlace: subí la sección del alimentador.' };
    }
    const termicaIn = enlace.termicaIn;
    const diferencialIn = inDiferencial(Math.max(termicaIn, 25)) || Math.max(termicaIn, 25);
    const ctx = contextoCortocircuito(draft);
    const poderCorte = poderCorteDe({ iccTableroKa: ctx.iccTableroKa, iccTableroOrigen: ctx.iccTableroOrigen, conSubestacion: ctx.conSubestacion, tipoProteccion: 'mcb' }, termicaIn);
    return { ...comun, termicaIn, diferencialIn, diferencialExiste: true, coordina: true, poderCorte };
  }

  // UTE determina la necesidad: si son de temer sobretensiones atmosféricas,
  // hay que colocar descargadores cerca del origen. La app no reemplaza esa
  // evaluación por una regla inventada. Una vez marcada la necesidad, sí
  // propone el tipo con IEC 60364-5-53 §534 como referencia complementaria.
  function evaluarSobretensiones(draft, pg) {
    const g = (draft && draft.proteccionGeneral) || {};
    const riesgo = ['si','no'].includes(g.sobretensionesRiesgo) ? g.sobretensionesRiesgo : 'pendiente';
    const lps = g.pararrayosLps === 'si';
    const spdExiste = g.spdExiste === 'si' ? true : (g.spdExiste === 'no' ? false : null);
    const tipoDeclarado = String(g.spdTipo || '');
    const requerido = lps ? true : (riesgo === 'si' ? true : (riesgo === 'no' ? false : null));
    const tipoPropuesto = requerido ? (lps ? 'Tipo 1+2' : 'Tipo 2') : null;
    const causas = [], pendientes = [], notas = [];
    if (requerido === null) pendientes.push('Falta evaluar si son de temer sobretensiones atmosféricas según UTE RBT Cap. V §2.');
    if (requerido === true) {
      if (spdExiste === false) causas.push('Se determinó riesgo de sobretensiones atmosféricas pero no hay descargador instalado/proyectado.');
      if (spdExiste === null) pendientes.push('Falta confirmar si el descargador de sobretensión está instalado o incluido en el proyecto.');
      if (spdExiste === true && !tipoDeclarado) pendientes.push('Falta confirmar el tipo del SPD instalado/proyectado.');
      if (spdExiste === true && lps && tipoDeclarado && !/1/.test(tipoDeclarado)) causas.push('Con sistema externo de protección contra el rayo se propone SPD Tipo 1+2 en el origen; el tipo declarado no incluye Tipo 1.');
      const ra = Number(g.resistenciaTierraOhm);
      if (!(ra > 0)) pendientes.push('Falta la medición de tierra para comprobar el requisito de los descargadores.');
      else if (ra >= 10) causas.push('Para los descargadores UTE exige resistencia de tierra inferior a 10 Ω; la medición cargada es ' + fmt(ra) + ' Ω.');
      notas.push('SPD propuesto: ' + tipoPropuesto + ' en el origen, como referencia de selección IEC 60364-5-53 §534.');
    } else if (requerido === false) {
      notas.push('El proyecto declara que no son de temer sobretensiones atmosféricas; UTE no obliga al descargador por ese criterio. Documentar la evaluación de obra.');
    }
    return { requerido, riesgo, lps, spdExiste, tipoDeclarado, tipoPropuesto,
             estado: causas.length ? 'no_cumple' : (pendientes.length ? 'pendiente' : 'cumple'),
             causas, pendientes, notas };
  }

  function esquemaContactosIndirectos(draft) {
    const sistema = SISTEMAS[(draft && draft.sistemaId) || 'tri_tt'] || SISTEMAS.tri_tt;
    return sistema.id === 'tri_it' ? 'IT' : 'TT';
  }

  function tiempoMaxDefectoTierra(c, esquema, masasInterconectadasIt, draftArg) {
    const dref = draftArg || draft;
    const inA = Number((calcularCircuito(c, caidaPreviaDe(dref)) || {}).breaker || c.inProteccion || 0);
    const uso = c.uso || 'fuerza';
    const circuitoFinal = (uso === 'tomacorrientes' && inA > 0 && inA <= 63) || (uso !== 'tomacorrientes' && inA > 0 && inA <= 32);
    if (esquema === 'TT' || (esquema === 'IT' && masasInterconectadasIt === false)) return circuitoFinal ? 0.2 : 1.0;
    if (esquema === 'IT' && masasInterconectadasIt === true) return circuitoFinal ? 0.4 : 5.0;
    return null;
  }

  function comprobarContactosIndirectos(draft, pg, base) {
    if (!pg || !pg.aplica) return { aplica:false, estado:'no_aplica', causas:[], pendientes:[], notas:[] };
    const esquema = esquemaContactosIndirectos(draft);
    const g = (draft && draft.proteccionGeneral) || {};
    const ul = base && Number(base.tensionLimite) > 0 ? Number(base.tensionLimite) : (g.ambienteTierra === 'humedo' ? 24 : 50);
    const ra = Number(g.resistenciaTierraOhm) > 0 ? Number(g.resistenciaTierraOhm) : null;
    const causas=[], pendientes=[], notas=[], circuitos=[];
    if (esquema === 'TT') {
      const idnA = (Number(pg.diferencialSensibilidad) || 30) / 1000;
      const uc = ra !== null ? ra * idnA : null;
      if (ra === null) pendientes.push('TT: falta medir R_A para comprobar la tensión de contacto por R_A·IΔn.');
      else if (uc > ul) causas.push('TT: R_A·IΔn = ' + fmt(uc) + ' V supera U_L = ' + fmt(ul,0) + ' V.');
      const tGeneral = Number(g.tiempoDiferencialGeneralS) > 0 ? Number(g.tiempoDiferencialGeneralS) : null;
      (draft.circuitos || []).forEach((c) => {
        const tmax = tiempoMaxDefectoTierra(c, 'TT', null, draft);
        const t = Number(c.tiempoDefectoTierraS) > 0 ? Number(c.tiempoDefectoTierraS) : tGeneral;
        const estado = t === null ? 'pendiente' : (t <= tmax ? 'cumple' : 'no_cumple');
        circuitos.push({ circuito:c.nombre || 'Circuito', t, tmax, estado, fuente:Number(c.tiempoDefectoTierraS)>0?'circuito':'general' });
        if (t === null) pendientes.push('TT: falta tiempo de desconexión por defecto a tierra para "' + (c.nombre || 'Circuito') + '" (máx. ' + fmt(tmax,1) + ' s).');
        else if (t > tmax) causas.push('TT: "' + (c.nombre || 'Circuito') + '" desconecta en ' + fmt(t,3) + ' s y supera ' + fmt(tmax,1) + ' s.');
      });
      notas.push('IEC 60364-4-41, Tabla 41.1: en TT a 230 V, 0,2 s para circuitos finales dentro de los límites de 411.3.2.2 y 1 s para distribución/otros circuitos.');
      return { aplica:true, esquema, estado:causas.length?'no_cumple':(pendientes.length?'pendiente':'cumple'), causas, pendientes, notas, ul, ra, tensionContacto:uc, circuitos };
    }

    const id = Number(g.corrientePrimerDefectoMa) > 0 ? Number(g.corrientePrimerDefectoMa)/1000 : null;
    const uc1 = (ra !== null && id !== null) ? ra * id : null;
    if (ra === null) pendientes.push('IT: falta medir R_A para verificar el primer defecto.');
    if (id === null) pendientes.push('IT: falta ingresar la corriente de primer defecto I_d para comprobar R_A·I_d ≤ U_L.');
    if (uc1 !== null && uc1 > ul) causas.push('IT: en primer defecto R_A·I_d = ' + fmt(uc1) + ' V supera U_L = ' + fmt(ul,0) + ' V.');
    if (pg.monitorAislamientoIt === null) pendientes.push('IT: falta confirmar dispositivo de vigilancia/monitorización del aislamiento para señalizar el primer defecto.');
    else if (pg.monitorAislamientoIt === false) causas.push('IT: no se confirmó vigilancia de aislamiento; el primer defecto debe ser detectado/señalizado cuando el sistema se mantiene en servicio.');
    if (pg.masasInterconectadasIt === null) pendientes.push('IT: falta confirmar si todas las masas están interconectadas por PE y colectivamente puestas a tierra.');
    (draft.circuitos || []).forEach((c) => {
      const tmax = tiempoMaxDefectoTierra(c, 'IT', pg.masasInterconectadasIt, draft);
      const t = Number(c.tiempoDefectoTierraS) > 0 ? Number(c.tiempoDefectoTierraS) : null;
      const estado = tmax === null || t === null ? 'pendiente' : (t <= tmax ? 'cumple' : 'no_cumple');
      circuitos.push({ circuito:c.nombre || 'Circuito', t, tmax, estado, fuente:'circuito' });
      if (tmax === null) return;
      if (t === null) pendientes.push('IT: falta documentar el tiempo de despeje del segundo defecto para "' + (c.nombre || 'Circuito') + '" (máx. ' + fmt(tmax,1) + ' s).');
      else if (t > tmax) causas.push('IT: segundo defecto en "' + (c.nombre || 'Circuito') + '" despeja en ' + fmt(t,3) + ' s y supera ' + fmt(tmax,1) + ' s.');
    });
    notas.push('IEC 60364-4-41 §411.6: el primer defecto en IT debe mantener R_A·I_d dentro de la tensión límite y ser detectado; ante un segundo defecto, con masas interconectadas se aplican condiciones tipo TN y con tierras independientes, tipo TT.');
    return { aplica:true, esquema, estado:causas.length?'no_cumple':(pendientes.length?'pendiente':'cumple'), causas, pendientes, notas, ul, ra, corrientePrimerDefectoA:id, tensionContacto:uc1, circuitos };
  }

  // Comprobación conjunta de protección general, tierra y sobretensiones.
  function comprobarProteccionGeneral(draft, calculada) {
    const pg = calculada || calcularProteccionGeneral(draft);
    if (!pg.aplica) return { aplica: false, estado: 'no_aplica', causas: [], pendientes: [], notas: [] };
    const guardada = (draft && draft.proteccionGeneral) || {};
    const residencial = !!(draft && draft.obra && draft.obra.tipo === 'Residencial');
    const sensibilidadMa = Number(pg.diferencialSensibilidad) || 30;
    const ambiente = guardada.ambienteTierra === 'humedo' ? 'humedo' : 'seco';
    const tensionLimite = ambiente === 'humedo' ? 24 : 50;
    const sensibilidadA = sensibilidadMa / 1000;
    const raMax = sensibilidadA > 0 ? tensionLimite / sensibilidadA : null;
    const ra = Number(guardada.resistenciaTierraOhm);
    const tieneRa = Number.isFinite(ra) && ra > 0;
    const causas = [], pendientes = [], notas = [];
    if (pg.enlace) {
      (pg.enlace.causas || []).forEach((x) => causas.push('Alimentador: ' + x));
      (pg.enlace.pendientes || []).forEach((x) => pendientes.push('Alimentador: ' + x));
    }

    if (pg.modo === 'nueva') {
      if (!pg.coordina || pg.termicaIn === null || pg.diferencialIn === null) causas.push(pg.motivo || 'La protección general no coordina con el alimentador.');
    } else {
      if (!pg.alimentadorConfirmado) pendientes.push('En ampliación/reparación falta confirmar la sección real del alimentador existente; no se acepta como verificada la sección calculada automáticamente.');
      if (pg.termicaIn === null) pendientes.push('Falta relevar la corriente nominal del interruptor general existente.');
      else if (pg.alimentadorConfirmado && pg.coordina === false) {
        if (pg.termicaIn < pg.enlace.ibDiseno) causas.push('La térmica general existente (' + fmt(pg.termicaIn,0) + ' A) queda por debajo de la corriente de diseño resultante (' + fmt(pg.enlace.ibDiseno) + ' A).');
        if (pg.termicaIn > pg.enlace.iz) causas.push('La térmica general existente (' + fmt(pg.termicaIn,0) + ' A) supera la capacidad admisible del alimentador relevado (' + fmt(pg.enlace.iz) + ' A).');
      }
      if (pg.diferencialExiste === null) pendientes.push('Falta confirmar si el tablero general existente tiene interruptor diferencial.');
      else if (pg.diferencialExiste === false) causas.push('El tablero general existente no tiene interruptor diferencial; UTE exige diferencial en todos los tableros generales de clientes.');
      else {
        if (pg.diferencialIn === null) pendientes.push('Falta relevar la corriente nominal del diferencial general existente.');
        else if (pg.termicaIn !== null && pg.diferencialIn < pg.termicaIn) causas.push('El diferencial existente (' + fmt(pg.diferencialIn,0) + ' A) tiene corriente nominal inferior a la térmica general (' + fmt(pg.termicaIn,0) + ' A).');
      }
    }
    if ((pg.modo === 'nueva' || pg.diferencialExiste === true) && residencial && sensibilidadMa !== 30) {
      causas.push('Instalación domiciliaria: UTE exige diferencial general de alta sensibilidad de 30 mA.');
    }
    if (!tieneRa) pendientes.push('Falta ingresar la resistencia de puesta a tierra medida para verificar R_A · IΔn ≤ ' + tensionLimite + ' V.');
    else if (raMax !== null && ra > raMax) causas.push('La resistencia de puesta a tierra (' + fmt(ra) + ' Ω) supera el máximo de ' + fmt(raMax) + ' Ω para ' + sensibilidadMa + ' mA y ' + tensionLimite + ' V.');

    const sobretensiones = evaluarSobretensiones(draft, pg);
    sobretensiones.causas.forEach((x) => causas.push(x));
    sobretensiones.pendientes.forEach((x) => pendientes.push(x));
    sobretensiones.notas.forEach((x) => notas.push(x));
    notas.push('UTE RBT Cap. VI: R ≤ ' + tensionLimite + '/IΔn; con ' + sensibilidadMa + ' mA resulta R_A máx. = ' + fmt(raMax) + ' Ω.');
    notas.push('El diferencial general es obligatorio; en instalaciones domiciliarias debe ser de 30 mA (Comunicado UTE 26002, 19/02/2026).');
    const sistemaObra = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
    const balanceFases = sistemaObra.fases === 3 ? calcularBalanceFases(draft) : { aplica:false, estado:'no_aplica', pendientes:[], causas:[], notas:[] };
    if (balanceFases.aplica) {
      balanceFases.causas.forEach((x) => causas.push('Balance de fases: ' + x));
      balanceFases.pendientes.forEach((x) => pendientes.push('Balance de fases: ' + x));
      balanceFases.notas.forEach((x) => notas.push(x));
      if (balanceFases.estado === 'cumple') notas.push('Reparto de cargas dentro del límite de UTE: ' + fmt(balanceFases.desequilibrioPct) + ' % ≤ ' + fmt(balanceFases.limitePct,0) + ' %.');
    }

    const contactosIndirectos = comprobarContactosIndirectos(draft, pg, { tensionLimite });
    contactosIndirectos.causas.forEach((x) => causas.push('Contactos indirectos: ' + x));
    contactosIndirectos.pendientes.forEach((x) => pendientes.push('Contactos indirectos: ' + x));
    contactosIndirectos.notas.forEach((x) => notas.push(x));

    return {
      aplica: true, modo: pg.modo, estado: causas.length ? 'no_cumple' : (pendientes.length ? 'pendiente' : 'cumple'),
      causas, pendientes, notas, residencial, sensibilidadMa, ambiente, tensionLimite,
      resistenciaTierraOhm: tieneRa ? ra : null, raMax, sobretensiones, balanceFases, contactosIndirectos,
      cumpleTierra: tieneRa && raMax !== null ? ra <= raMax : null,
      cumpleSensibilidad: !residencial || sensibilidadMa === 30,
    };
  }

  function importarCargasComoCircuitos(cargas, sistema) {
    return cargas.map((c, i) => {
      const pTotal = (Number(c.potenciaW) || 0) * (Number(c.cantidad) || 0);
      const cosPhi = Number(c.cosPhi) || 1;
      const s = cosPhi > 0 ? pTotal / cosPhi : pTotal;
      // En suministro trifásico una carga no se convierte mágicamente en
      // trifásica. Se parte de monofásico 230 V (conservador) y se exige que el
      // técnico confirme 1φ/3φ en Circuitos. En suministro mono queda confirmado.
      const fasesCircuito = 1;
      const vCircuito = tensionDeCircuito(sistema, fasesCircuito);
      const ib = s / vCircuito;
      const cat = CATEGORIAS.find((cat) => cat.id === c.categoria);
      const uso = c.uso || (cat ? cat.uso : 'fuerza');
      const circuito = {
        id: c.id ? 'imp-' + c.id : 'imp-' + Date.now() + '-' + i,
        cargaId: c.id || null,
        nombre: c.nombre || (cat ? cat.label : 'Circuito'),
        ib: Math.round(ib * 100) / 100,
        v: vCircuito, fases: fasesCircuito, fasesConfirmadas: sistema.fases === 1, sistemaId: sistema.id,
        faseAsignada: '', faseManual: false,
        l: 15, material: 'cobre', metodo: 'embutido', aislacion: 'pvc',
        tempAmb: 30, agrupados: 1, resistividadTerreno: null, profundidadEnterrado: 0.5, caidaMax: CAIDA_MAX_DEFAULT[uso] || 5, cosPhi, uso,
        equipo: c.equipo || 'comun',
      };
      circuito.origenCarga = {
        nombre: circuito.nombre, ib: circuito.ib, cosPhi: circuito.cosPhi,
        uso: circuito.uso, equipo: circuito.equipo,
      };
      return circuito;
    });
  }

  // Mantiene la relación carga -> circuito cuando el técnico vuelve atrás y
  // modifica las cargas. Los datos derivados se actualizan; longitud, método,
  // aislamiento y demás ajustes hechos en Circuitos se conservan. Un circuito
  // cuya carga se eliminó no se borra: queda marcado para revisión manual.
  function sincronizarCargasComoCircuitos(cargas, sistema, circuitosActuales) {
    const bases = importarCargasComoCircuitos(cargas, sistema);
    const actuales = Array.isArray(circuitosActuales) ? circuitosActuales : [];
    const usados = new Set();

    const sincronizados = bases.map((base) => {
      let existente = actuales.find((c) => !usados.has(c.id) && c.cargaId && c.cargaId === base.cargaId);
      if (!existente) {
        // Compatibilidad con relevamientos creados antes de guardar cargaId.
        existente = actuales.find((c) => !usados.has(c.id) && !c.cargaId &&
          String(c.id || '').startsWith('imp-') && c.nombre === base.nombre);
      }
      if (!existente) return base;
      usados.add(existente.id);
      return {
        ...base,
        ...existente,
        cargaId: base.cargaId,
        nombre: existente.nombreManual ? existente.nombre : base.nombre,
        ib: existente.ibManual ? existente.ib : (existente.fasesManual && Number(existente.fases) === 3
          ? Math.round((base.ib * 230 / (SQRT3 * sistema.v)) * 100) / 100
          : base.ib),
        v: existente.fasesManual ? tensionDeCircuito(sistema, existente.fases) : base.v,
        fases: existente.fasesManual ? Number(existente.fases) : base.fases,
        fasesConfirmadas: existente.fasesManual ? true : base.fasesConfirmadas,
        faseAsignada: existente.faseAsignada || '', faseManual: Boolean(existente.faseManual),
        sistemaId: sistema.id,
        cosPhi: existente.cosPhiManual ? existente.cosPhi : base.cosPhi,
        uso: existente.usoManual ? existente.uso : base.uso,
        equipo: existente.equipoManual ? existente.equipo : base.equipo,
        origenCarga: base.origenCarga,
        cargaDesvinculada: false,
      };
    });

    const idsCargas = new Set(bases.map((c) => c.cargaId));
    const restantes = actuales.filter((c) => !usados.has(c.id)).map((c) => {
      let actualizado = { ...c };
      const cambioSistema = Boolean(actualizado.sistemaId && actualizado.sistemaId !== sistema.id);
      actualizado.sistemaId = sistema.id;
      if (cambioSistema) {
        if (sistema.fases === 1) {
          actualizado.fases = 1;
          actualizado.v = tensionDeCircuito(sistema, 1);
          actualizado.fasesConfirmadas = true;
          actualizado.fasesManual = false;
        } else {
          // Un cambio de suministro invalida la inferencia anterior. Se vuelve
          // a 1φ/230 V, que es conservador, y el técnico debe confirmar 1φ/3φ.
          actualizado.fases = 1;
          actualizado.v = tensionDeCircuito(sistema, 1);
          actualizado.fasesConfirmadas = false;
          actualizado.fasesManual = false;
        }
        actualizado.faseAsignada = '';
        actualizado.faseManual = false;
        actualizado.polosManual = false;
      } else if (sistema.fases === 1) {
        actualizado.fases = 1;
        actualizado.v = tensionDeCircuito(sistema, 1);
        actualizado.fasesConfirmadas = true;
        actualizado.faseAsignada = '';
        actualizado.faseManual = false;
      }
      if (actualizado.cargaId && !idsCargas.has(actualizado.cargaId)) actualizado.cargaDesvinculada = true;
      return actualizado;
    });
    return sincronizados.concat(restantes);
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
     Los precios se cargan siempre de LISTA, sin descuentos promocionales ni
     de medio de pago: las promociones son de unos días y desarman el margen
     cuando se presupuesta con ellas.
     Precio en 0 = no se encontró en Fivisa (ej. bandeja portacable y
     caño de acero galvanizado roscado son productos más industriales;
     conviene cotizarlos con un proveedor especializado).
     ============================================================ */
  function clonePrecios(obj) {
    try { return structuredClone(obj); } catch (e) { return JSON.parse(JSON.stringify(obj)); }
  }
  // Los precios están en pesos. Los que se relevaron en proveedores que cotizan
  // en dólares (MGI) se convirtieron a $40,23 por dólar, la cotización del
  // 12/9/2026. Si el dólar se mueve mucho, esos renglones quedan viejos: son los
  // que dicen "MGI" en el comentario.
  const DEFAULT_PRECIOS = {
    // Cable multipolar, por metro. Relevado en Fivisa, que lo vende en rollos de
    // 100 m y cotiza en dólares: precio del rollo pasado a metro a $40,23.
    // El bajo goma va al aire libre y el bajo plástico en bandeja.
    // Los de 4 conductores —los que pide un circuito trifásico— no están
    // relevados: salen del de 3 conductores más un 30 %. Confirmalos.
    // 3x6 y 3x10 son cable Fustix (Funsa) extra flexible, relevados el
    // 22/9/2026: bajo goma USD 696,68 y USD 1.198,63 el rollo de 100 m
    // (N06146 / N06150); bajo plástico USD 705,79 y USD 1.207,00 (N04412 /
    // N04414). Por encima de 10 mm² no está relevado en 3x.
    // Aluminio: no se consigue en bajo goma ni bajo plástico —el conductor
    // rígido de aluminio no se fabrica en esa vaina flexible—. Para 2
    // conductores a la intemperie (luminarias de cancha, complejos de
    // viviendas) el producto real es el preensamblado aéreo autoportante,
    // relevado en Fivisa el 22/9/2026: Fucetix XLPE 2x16mm² (N11399, USD
    // 1,86/m) y 2x25mm² (N11400, USD 2,92/m), ya por metro (no viene en
    // rollo fijo). Corriente admisible de fábrica: 2x16 → 70 A al aire /
    // 88 A enterrado a 0,70 m; se cotiza aparte del método de cálculo
    // automático, que no lo modela como conducto/bandeja.
    cablePreensambladoAluminio: { 16: 75, 25: 117 },
    cableBajoGoma: {
      '2x1': 39, '2x1.5': 55, '2x2': 73, '2x2.5': 89, '2x4': 134, '2x6': 197,
      '3x1': 54, '3x1.5': 77, '3x2': 102, '3x2.5': 125, '3x4': 192, '3x6': 280, '3x10': 482,
      '4x1': 70, '4x1.5': 100, '4x2': 133, '4x2.5': 163, '4x4': 250,
    },
    cableBajoPlastico: {
      '2x1': 38, '2x1.5': 51, '2x2': 67, '2x2.5': 81, '2x4': 122, '2x6': 178,
      '3x1': 61, '3x1.5': 82, '3x2': 106, '3x2.5': 129, '3x4': 195, '3x6': 284, '3x10': 486,
      '4x1': 79, '4x1.5': 107, '4x2': 138, '4x2.5': 168, '4x4': 254,
    },
    cableUnipolar: {
      1: 14, 1.5: 20, 2: 27, 2.5: 34, 4: 54, 6: 80, 10: 136, 16: 217, 25: 333,
      // 35mm² en adelante: pocos presupuestos los usan y Fivisa no los tiene en su buscador
      // minorista — estimados por extrapolación lineal desde el precio real de 16 y 25mm².
      35: 462, 50: 655, 70: 913, 95: 1236, 120: 1559, 150: 1946, 185: 2398, 240: 3108,
      300: 3882, 400: 5173, 500: 6464, 630: 8142,
    },
    canoCorrugado: { 16: 13, 20: 14, 25: 19, 32: 27, 40: 39 },
    canoPvcRigido: { 16: 74, 20: 84, 25: 112, 32: 158, 40: 222 },
    // MGI, caño zincado EMT, tira de 3,05 m, pasado a metro y a pesos ($40,23):
    //   20 mm  = 3/4" (17,93 ext)   U$S 4,78/tira  -> $63/m
    //   25 mm  = 1"   (23,42 ext)   U$S 7,19/tira  -> $95/m
    //   32 mm  = 1 1/4" (29,54 ext) U$S 9,93/tira  -> $131/m
    canoGalvanizado: { 20: 63, 25: 95, 32: 131 },
    // Bandeja calada galvanizada, tramo de 3 m, pasado a metro:
    //   150x65 (Punto Eléctrico) U$S 35,55 = $1.430 el tramo -> $477/m
    //   200x65 (Electro Uruguay)          $1.767,32 el tramo -> $589/m
    bandeja: { 150: 477, 200: 589 },
    grampaOmega: 12,
    mensulaBandeja: 135,
    codoPvcRigido: 31,
    // MGI, curva zincada EMT: 3/4" (20mm) U$S 0,40. Es la medida que más sale en
    // vivienda. Si se trabaja con caño más grueso, 1" son $29 y 1 1/4" $47.
    codoGalvanizado: 16,
    // Curva horizontal metálica 200x65 (MercadoLibre, vendedor KENTIUM): $964.
    // Es el precio de la bandeja de 200 mm, la más ancha que cotiza la app; en
    // bandejas más angostas la curva sale menos.
    codoCajaBandeja: 964,
    // Las térmicas DIN residenciales cotizaron parejo entre 6 y 40A en Fivisa; para 50A+ se
    // aplica un escalón proporcional (no relevado) porque suelen pasar a otro bastidor/marco.
    // Relevado en Fivisa, línea Hyundai HGD63S, la misma con la que coincide la
    // bipolar: 1P 16A 4,5kA (HY1116S) $80 de lista. La proporción que se usaba
    // antes daba más del doble.
    // Termomagnéticos Schneider Acti9 iC60N (6 kA según IEC 60898-1), que es
    // la gama que se cotiza. Relevado en fivisa.com.uy el 17/09/2026, precio
    // de lista en USD y pasado a pesos con el dólar del catálogo:
    //   1P  40A MG2418N  USD 11,95     1P  63A MG2421N  USD 13,70
    //   2P  25A MG2438N  USD 21,23     2P  63A MG2446N  USD 29,65
    //   4P  25A MG2478N  USD 44,37     4P  63A MG2486N  USD 67,35
    // Por encima de 63 A la iC60 no llega: el tetrapolar sale de un C120N 4P
    // 100A de 10 kA (MG2874, USD 200,46), que además cumple el mínimo de
    // 10 kA desde 100 A. El bipolar de más de 63 A queda en 0 a propósito: a
    // esa corriente el suministro ya es trifásico.
    termicaUnipolarBase: 481,
    termicaUnipolar63: 551,
    termicaUnipolar125: 0,
    termicaBipolarBase: 854,
    termicaBipolar63: 1193,
    termicaBipolar125: 0,
    termicaTetrapolarBase: 1785,
    termicaTetrapolar63: 2710,
    termicaTetrapolar125: 8065,
    // Diferenciales de 30 mA, por tipo, polos y corriente nominal.
    //
    // Tipo A — línea Chint NL1-63 de mgi.com.uy, relevada el 17/09/2026 en
    // USD (2P: 27,43 · 26,84 · 27,43 · 4P: 28,71 · 40,61 · 41,63). En Fivisa
    // está el Schneider Acti9 iID A-SI 2P 25A a $ 5.784 y en Electro Uruguay
    // un ABB SI 4P 25A a $ 7.842: si se compran esos, se cargan acá.
    //
    // Tipos F y B — uy.wiautomation.com, relevado el 21/09/2026 en pesos:
    //   F 2P 25A  ABB F202 F-25/0,03              $ 3.977
    //   F 2P 40A  Schneider Resi9 R9R71240 F-SI   $ 7.348
    //   F 4P 25A  ABB F204 F-25/0.03              $ 12.489
    //   F 4P 40A  ABB F204 F-40/0.03              $ 6.604
    //   B 2P 63A  Schneider Acti9 A9Z61263 B-SI   $ 27.591
    //   B 4P 25A  Schneider Acti9 A9Z61425 B-SI   $ 19.486
    //   B 4P 40A  Schneider Acti9 A9Z61440 B-SI   $ 13.495
    //   B 4P 63A  Schneider Acti9 A9Z61463 B-SI   $ 20.797
    // En tipo B el Schneider salió más barato que el ABB en tetrapolar
    // (ABB: 26.660 / 22.001 / 23.053) y en bipolar 25 y 40 A manda el Tongou.
    // En tipo F no hay ninguno de 63 A, ni bipolar ni tetrapolar.
    // Los que quedan en 0 no están en ese proveedor: se cotizan a
    // mano. WiAutomation no es distribuidor oficial y despacha desde Europa,
    // así que conviene confirmar plazo y flete antes de cerrar el precio.
    //
    // Tipo B bipolar — Tongou TORD4B-63 2P 40A 30mA, pensado para cargador de
    // auto, en MercadoLibre Uruguay el 21/09/2026: USD 247 de lista (ese día
    // estaba con 38 % de descuento, a USD 153,13, pero las promociones van y
    // vienen y el catálogo se arma siempre con el precio de lista). Es gama
    // económica y sale bastante menos que el ABB; el de 25A toma el mismo
    // precio, que es el tamaño que publica el vendedor.
    diferencialA2P: { 25: 1103, 40: 1080, 63: 1103 },
    diferencialA4P: { 25: 1155, 40: 1634, 63: 1675 },
    diferencialF2P: { 25: 3977, 40: 7348, 63: 0 },
    diferencialF4P: { 25: 12489, 40: 6604, 63: 0 },
    diferencialB2P: { 25: 9937, 40: 9937, 63: 27591 },
    diferencialB4P: { 25: 19486, 40: 13495, 63: 20797 },
    // Diferencial tipo A, 30 mA, hasta 40 A. Sin relevar: se carga en el
    // catálogo. Los tipos F, B y AC se cotizan a mano en cada presupuesto.
    cajaOctogonal: 72,
    portalamparas: 45,
    llaveLuzSimple: 140,
    cajaRectangular: 42,
    tomacorriente: 237,
    // Medidas comerciales: gabinetes de pared de 12, 24, 36 y 48 módulos (filas
    // de 12). El de 48 no está relevado — sale de prolongar la recta que forman
    // los otros; confirmalo antes de presupuestar uno.
    tableroPuntos: [{ n: 12, p: 543 }, { n: 24, p: 967 }, { n: 36, p: 1614 }, { n: 48, p: 1890 }],
    // Relevado en Fivisa: barra para riel DIN de 7 vías 63A (CE3105) $55 de
    // lista. La de neutro es la misma pieza en otro color, así que va al mismo
    // precio hasta que se confirme.
    borneraTierra: 55,
    borneraNeutro: 55,
    // La caja del medidor depende del suministro, así que van las dos.
    // Monofásica: JOServitec, cajón UTE con llave, $980 con IVA.
    // Trifásica: MGI, caja medidor con ICP (TAF), U$S 51,67 = $2.079.
    cajaMedidorMono: 980,
    cajaMedidorTrifasica: 2079,
    jabalina: 978,
    canoPvc1pulg3m: 197,
    codoPvc1pulg: 31,
  };
  // Cotización con la que se pasaron a pesos los precios relevados en dólares.
  const DOLAR_BASE = 40.23;
  // Cuáles son esos precios: los proveedores que cotizan en dólares (MGI y,
  // para el cable multipolar, Fivisa). Cuando cambia la cotización, sólo estos
  // se recalculan; el resto está relevado en pesos y no se toca.
  const PRECIOS_EN_DOLARES = [
    { clave: 'termicaUnipolarBase' }, { clave: 'termicaUnipolar63' },
    { clave: 'termicaBipolarBase' }, { clave: 'termicaBipolar63' },
    { clave: 'termicaTetrapolarBase' }, { clave: 'termicaTetrapolar63' }, { clave: 'termicaTetrapolar125' },
    { clave: 'diferencialA2P', medida: 25 }, { clave: 'diferencialA2P', medida: 40 }, { clave: 'diferencialA2P', medida: 63 },
    { clave: 'diferencialA4P', medida: 25 }, { clave: 'diferencialA4P', medida: 40 }, { clave: 'diferencialA4P', medida: 63 },
    { clave: 'diferencialB2P', medida: 25 }, { clave: 'diferencialB2P', medida: 40 },
    { clave: 'cableBajoGoma' }, { clave: 'cableBajoPlastico' }, { clave: 'cablePreensambladoAluminio' },
    { clave: 'canoGalvanizado' }, { clave: 'codoGalvanizado' },
    { clave: 'bandeja', medida: 150 }, { clave: 'cajaMedidorTrifasica' },
  ];
  // Un catálogo sin revisar envejece mal: con la inflación y el dólar moviéndose,
  // presupuestar con precios viejos se come el margen sin que se note.
  const DIAS_PRECIOS_VIEJOS = 30;

  // Los que pasaron de "sin relevar" a relevado. Al agregar uno nuevo acá, se
  // actualiza solo en los celulares que ya tienen la app.
  const PRECIOS_RELEVADOS = [
    { clave: 'termicaUnipolarBase', viejo: 166, nuevo: 80 },
    // 17/09/2026: se pasa de la línea Hyundai de 4,5 kA a la Schneider iC60N
    // de 6 kA, que es la que exige el criterio de poder de corte de plaza.
    { clave: 'termicaUnipolarBase', viejo: 80, nuevo: 481 },
    { clave: 'termicaBipolarBase', viejo: 277, nuevo: 854 },
    { clave: 'termicaTetrapolarBase', viejo: 294, nuevo: 1785 },
    // el tipo B bipolar pasa al Tongou de MercadoLibre, que es el que se
    // consigue para cargador de auto y sale bastante menos que el ABB
    { clave: 'diferencialB2P', medida: 25, viejo: 16592, nuevo: 9937 },
    { clave: 'diferencialB2P', medida: 40, viejo: 0, nuevo: 9937 },
    // el 21/09/2026 se había cargado el precio con descuento promocional
    { clave: 'diferencialB2P', medida: 25, viejo: 6160, nuevo: 9937 },
    { clave: 'diferencialB2P', medida: 40, viejo: 6160, nuevo: 9937 },
    // 21/09/2026: se completan los que faltaban y el tipo B tetrapolar pasa
    // del ABB al Schneider, que en esa medida sale menos
    { clave: 'diferencialB2P', medida: 63, viejo: 0, nuevo: 27591 },
    { clave: 'diferencialB4P', medida: 25, viejo: 26660, nuevo: 19486 },
    { clave: 'diferencialB4P', medida: 40, viejo: 22001, nuevo: 13495 },
    { clave: 'diferencialB4P', medida: 63, viejo: 23053, nuevo: 20797 },
    { clave: 'diferencialF2P', medida: 25, viejo: 7348, nuevo: 3977 },
    { clave: 'borneraTierra', viejo: 0, nuevo: 55 },
    { clave: 'borneraNeutro', viejo: 0, nuevo: 55 },
    { clave: 'codoGalvanizado', viejo: 0, nuevo: 16 },
    { clave: 'cajaMedidorMono', viejo: 0, nuevo: 980 },
    { clave: 'cajaMedidorTrifasica', viejo: 0, nuevo: 2079 },
    { clave: 'codoCajaBandeja', viejo: 0, nuevo: 964 },
    // los que van por medida llevan además cuál
    { clave: 'bandeja', medida: 150, viejo: 442, nuevo: 477 },
  ];

  // Proveedores de referencia para relevar precios, por si hay que rehacerlo:
  //   Fivisa (fivisa.com.uy) y Electro Uruguay (electrouruguay.com) cotizan en
  //   pesos; MGI (mgi.com.uy) en dólares. Las bandejas no están en catálogo web
  //   de ninguno: Electro Uruguay las publica en MercadoLibre.
  // Rendimiento para estimar el plazo de una obra (ver estimarPlazo). Se
  // ajustan en Perfil, junto con la tarifa.
  const DEFAULT_DOLAR = { cotizacion: DOLAR_BASE, actualizado: null };
  const DEFAULT_MANO_OBRA = { tarifaHora: 500, horasJornada: 8, bocasPorJornada: 6, jornadasCargaFija: 0.5, jornadasTablero: 1 };
  const BASE_POR_TIPO = { unipolar: 'termicaUnipolarBase', bipolar: 'termicaBipolarBase',
                          tripolar: 'termicaTetrapolarBase', tetrapolar: 'termicaTetrapolarBase' };
  // Pasa a la cotización nueva los precios que se relevaron en dólares.
  function ajustarPreciosPorDolar(precios, cotizacionVieja, cotizacionNueva) {
    if (!(cotizacionVieja > 0) || !(cotizacionNueva > 0) || cotizacionVieja === cotizacionNueva) return 0;
    const factor = cotizacionNueva / cotizacionVieja;
    let tocados = 0;
    PRECIOS_EN_DOLARES.forEach((r) => {
      const destino = r.medida === undefined ? precios : precios[r.clave];
      const clave = r.medida === undefined ? r.clave : r.medida;
      if (!destino) return;
      if (r.medida === undefined && typeof destino[clave] === 'object' && destino[clave]) {
        Object.keys(destino[clave]).forEach((k) => {
          if (destino[clave][k] > 0) { destino[clave][k] = Math.round(destino[clave][k] * factor); tocados++; }
        });
        return;
      }
      if (destino[clave] > 0) { destino[clave] = Math.round(destino[clave] * factor); tocados++; }
    });
    return tocados;
  }
  function diasDesde(ts) {
    if (!ts) return null;
    return Math.floor((Date.now() - ts) / (24 * 3600e3));
  }

  // Precio por tramo de corriente nominal, con los tres escalones relevados:
  // hasta 40 A, de 50 a 63 A y de 80 a 125 A. El que no está relevado queda
  // en 0 y el material sale sin precio, para cargarlo a mano.
  function precioTermica(tipo, amp, precios) {
    const familia = (BASE_POR_TIPO[tipo] || 'termicaBipolarBase').replace('Base', '');
    const tramo = amp <= 40 ? 'Base' : (amp <= 63 ? '63' : '125');
    return Number(precios[familia + tramo]) || 0;
  }
  // Precio del diferencial por tipo, polos y corriente. Lo que no está
  // relevado queda en 0 y el material sale sin precio, para cargarlo a mano.
  function precioDiferencial(tipoRcd, polos, amp, precios) {
    const escalon = inDiferencial(amp);
    const mapa = precios['diferencial' + tipoRcd + (polos <= 2 ? '2P' : '4P')];
    if (!escalon || !mapa) return 0;
    return Number(mapa[escalon]) || 0;
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

  // Rubro de cada material, para agrupar la lista en el presupuesto en vez de
  // que salga en el orden en que la fue armando el cálculo. El orden de la
  // tabla importa: lo de puesta a tierra también empieza con "Caño" y "Codo",
  // así que se resuelve antes que la canalización.
  const RUBROS_MATERIAL = [
    [/puesta a tierra|^Jabalina/i, 'Puesta a tierra'],
    [/^Cable /i, 'Cables'],
    [/^(Caño|Codo|Grampa|Bandeja|Ménsula)/i, 'Canalización'],
    [/^(Térmica|Diferencial|Interruptor)/i, 'Protecciones'],
    [/^(Tablero|Bornera|Caja para medidor)/i, 'Tablero'],
    [/^(Caja de embutir|Portalámparas|Llave de luz|Tomacorriente)/i, 'Cajas y accesorios'],
  ];
  // En este orden salen los rubros en el presupuesto.
  const ORDEN_RUBROS = ['Cables', 'Canalización', 'Protecciones', 'Tablero',
                        'Cajas y accesorios', 'Puesta a tierra', 'Otros'];
  function rubroDe(nombre) {
    for (const [patron, rubro] of RUBROS_MATERIAL) if (patron.test(nombre)) return rubro;
    return 'Otros';
  }
  // Agrupa respetando ORDEN_RUBROS. Los materiales cargados a mano no traen
  // rubro, así que se clasifican por el nombre en el momento.
  function materialesPorRubro(materiales) {
    const grupos = new Map();
    (materiales || []).forEach((m) => {
      const r = m.rubro || rubroDe(m.nombre || '');
      if (!grupos.has(r)) grupos.set(r, []);
      grupos.get(r).push(m);
    });
    return ORDEN_RUBROS.filter((r) => grupos.has(r)).map((r) => ({ rubro: r, items: grupos.get(r) }))
      .concat([...grupos.keys()].filter((r) => ORDEN_RUBROS.indexOf(r) === -1)
        .map((r) => ({ rubro: r, items: grupos.get(r) })));
  }

  function generarMateriales(circuitos, draft) {
    const precios = DB.settings.precios;
    const caidaPrevia = caidaPreviaDe(draft);
    const ctxCorto = contextoCortocircuito(draft);
    const mapa = {};
    function add(nombre, unidad, cantidad, precioUnit) {
      const key = nombre;
      if (!mapa[key]) mapa[key] = { id: 'mat-' + key.replace(/\s+/g, '-'), nombre, unidad, cantidad: 0, precioUnit: precioUnit || 0, auto: true, rubro: rubroDe(nombre) };
      mapa[key].cantidad += cantidad;
    }
    const pgMat = calcularProteccionGeneral(draft);
    const tipoGeneralMat = pgMat.aplica ? tipoDiferencialGeneral(pgMat) : TIPO_DIFERENCIAL_DEFECTO;
    const rcdMat = diferencialesDedicados(circuitos, tipoGeneralMat);
    circuitos.forEach((c) => {
      const calc = calcularCircuito(c, caidaPrevia);
      if (!calc.apto) return;
      // Conductores activos (fase y neutro) más el de protección, que va con
      // la misma sección que la fase. Antes el de tierra no se cotizaba.
      const conductores = c.fases === 1 ? 2 : 4;
      const enCano = conductores + 1;
      const seccion = calc.seccionAdoptada;
      const seccionTxt = fmt(seccion, seccion < 10 ? 1 : 0).replace(/,00$/, '');
      const largo = Math.ceil((Number(c.l) || 0) * 1.1);
      const tierra = () => add('Cable unipolar verde/amarillo (tierra) ' + seccionTxt + ' mm²', 'm', largo,
                               precios.cableUnipolar[seccion] || 0);
      // Al aire libre se tira cable bajo goma y en bandeja bajo plástico: son un
      // cable solo con todos los conductores adentro, así que se cotiza el largo
      // del tramo. En monofásica el 3x ya trae la tierra; en trifásica el
      // catálogo llega a 4x, así que la tierra va aparte.
      const multi = CABLE_POR_METODO[c.metodo];
      if (multi && largo > 0) {
        const hilos = c.fases === 1 ? 3 : 4;
        add('Cable ' + multi.etiqueta + ' ' + hilos + 'x' + seccionTxt + ' mm²' + (c.fases === 1 ? ' (con tierra)' : ''), 'm', largo,
            precios[multi.precio][hilos + 'x' + seccion] || 0);
        if (c.fases !== 1) tierra();
      } else if (largo > 0) {
        add('Cable unipolar ' + seccionTxt + ' mm²', 'm', Math.ceil((Number(c.l) || 0) * conductores * 1.1),
            precios.cableUnipolar[seccion] || 0);
        tierra();
      }
      if (largo > 0) {
        // Diámetro por las Tablas II y III del Capítulo IV, con la tierra
        // adentro. El galvanizado usa la Tabla II como referencia —sus tablas
        // propias, IV y V, van en pulgadas— y después la medida que se consigue.
        const d = diametroCano(seccion, enCano, c.metodo);
        const sinTabla = (tipo) => add(tipo + ' — dimensionar a mano: ' + enCano + ' conductores de ' + seccionTxt + ' mm² no entran en la tabla UTE', 'm', largo, 0);
        if (d === null && c.metodo !== 'bandeja' && c.metodo !== 'aire') {
          sinTabla(c.metodo === 'amurado_galvanizado' ? 'Caño galvanizado' : 'Caño');
        } else if (c.metodo === 'amurado_pvc') {
          add('Caño PVC rígido ' + d + ' mm', 'm', largo, precios.canoPvcRigido[d] || 0);
          add('Grampa omega', 'un.', largo, precios.grampaOmega);
          // Cantidad en 0: el caño flexible se dobla solo, pero el amurado con caño rígido
          // necesita codos para los cambios de dirección — no hay forma de saber cuántos
          // hacen falta a partir de la longitud, así que se deja lista para cargar a mano.
          add('Codo PVC rígido ' + d + ' mm (cambio de dirección)', 'un.', 0, precios.codoPvcRigido);
        } else if (c.metodo === 'amurado_galvanizado') {
          // En acero no se manejan todas las medidas que sí existen en PVC: si
          // el cálculo pide una que no se consigue, se pasa a la siguiente. Un
          // caño más ancho siempre entra; uno más angosto, no.
          const dAcero = medidaCano(d, precios.canoGalvanizado);
          add('Caño de acero galvanizado ' + dAcero + ' mm', 'm', largo, precios.canoGalvanizado[dAcero] || 0);
          add('Grampa omega', 'un.', largo, precios.grampaOmega);
          add('Codo caño galvanizado ' + dAcero + ' mm (cambio de dirección)', 'un.', 0, precios.codoGalvanizado);
        } else if (c.metodo === 'bandeja') {
          const ancho = anchoBandeja(conductores);
          add('Bandeja portacable ' + ancho + ' mm', 'm', largo, precios.bandeja[ancho] || 0);
          const nMensulas = Math.ceil(largo / 1.5);
          add('Ménsula para bandeja', 'un.', nMensulas, precios.mensulaBandeja);
          // La tornillería de fijación —tacos y tornillos— no se lista: es de
          // ferretería, ningún proveedor eléctrico la publica y va de a varias
          // por ménsula. Se carga a mano en "Otros gastos" del presupuesto.
          add('Codo / caja de pase para bandeja ' + ancho + ' mm (cambio de dirección)', 'un.', 0, precios.codoCajaBandeja);
        } else if (c.metodo !== 'aire') {
          // embutido, enterrado, o metodo viejo/desconocido: caño corrugado (comportamiento por defecto)
          add('Caño corrugado ' + d + ' mm', 'm', largo, precios.canoCorrugado[d] || 0);
        }
        // 'aire' (aire libre): sin canalización
      }
      const tipoTermica = { 1: 'unipolar', 2: 'bipolar', 3: 'tripolar', 4: 'tetrapolar' }[polosDe(c)];
      if ((c.tipoProteccion || 'mcb') === 'mcb') {
        // El poder de corte va en el nombre: un iC60H o iC60L no cuesta lo
        // mismo que el N de lista, así que esos quedan sin precio para cargar.
        const pc = poderCorteDe(datosCircuito(c, caidaPrevia, ctxCorto), calc.breaker);
        // Precio de lista sólo para el poder de corte normal de esa nominal
        // (6 kA, o 10 kA desde 100 A); un escalón mayor por la Icc va a mano.
        const base = pc.poderCorteKa !== null && pc.poderCorteKa <= Math.max(pc.pisoKa, NORMATIVE_PACK.parametros.iccPlazaKa);
        add('Térmica ' + tipoTermica + ' ' + calc.breaker + 'A curva ' + calc.curva + ' — ' + textoPoderCorte(pc), 'un.', 1,
            base ? precioTermica(tipoTermica, calc.breaker, precios) : 0);
      } else {
        add('Interruptor ' + tipoTermica + ' ' + calc.breaker + 'A (caja moldeada u otro) — elegir modelo', 'un.', 1, 0);
      }
      // Diferencial propio cuando el general no alcanza el tipo que pide el
      // equipo. Sin precio de catálogo: F y B se cotizan a mano.
      const ded = rcdMat.dedicados.find((d) => d.circuito === c);
      if (ded && calc.breaker) {
        const polosRcd = c.fases === 1 ? 2 : 4;
        const inRcd = inDiferencial(Math.max(25, calc.breaker)) || Math.max(25, calc.breaker);
        add('Diferencial tipo ' + ded.tipo + ' ' + polosRcd + 'P ' + inRcd + 'A 30 mA — ' + (c.nombre || 'circuito'), 'un.', 1,
            precioDiferencial(ded.tipo, polosRcd, inRcd, precios));
      }
    });
    // Alimentador medidor → tablero. Se cotiza separado de los circuitos para
    // respetar la sección propia de fase, neutro y PE.
    const alimMat = calcularAcometida(draft);
    if (alimMat.seccion && Number(alimMat.l) > 0) {
      const largoAlim = Math.ceil(Number(alimMat.l) * 1.1);
      const nFases = (SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt).fases === 1 ? 1 : 3;
      const sf = alimMat.seccion, sn = alimMat.neutroSeccion, spe = alimMat.peSeccion;
      const txtSf = fmt(sf, sf < 10 ? 1 : 0).replace(/,00$/, '');
      add('Cable unipolar fase alimentador ' + txtSf + ' mm²', 'm', largoAlim * nFases, precios.cableUnipolar[sf] || 0);
      if (alimMat.tieneNeutro && sn) {
        const txtSn = fmt(sn, sn < 10 ? 1 : 0).replace(/,00$/, '');
        add('Cable unipolar neutro alimentador ' + txtSn + ' mm²', 'm', largoAlim, precios.cableUnipolar[sn] || 0);
      }
      if (spe) {
        const txtPe = fmt(spe, spe < 10 ? 1 : 0).replace(/,00$/, '');
        add('Cable unipolar verde/amarillo (PE alimentador) ' + txtPe + ' mm²', 'm', largoAlim, precios.cableUnipolar[spe] || 0);
      }
    }

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
    if (pgMat.aplica && pgMat.modo === 'nueva' && pgMat.termicaIn !== null) {
      // Protección general del tablero: la térmica con su poder de corte y el
      // diferencial con su tipo. Mismo criterio de precio que los circuitos.
      const tipoGen = ({2:'bipolar',3:'tripolar',4:'tetrapolar'})[pgMat.termicaPolos] || 'bipolar';
      const pcGen = pgMat.poderCorte;
      const baseGen = pcGen && pcGen.poderCorteKa !== null && pcGen.poderCorteKa <= Math.max(pcGen.pisoKa, NORMATIVE_PACK.parametros.iccPlazaKa);
      add('Térmica general ' + tipoGen + ' ' + pgMat.termicaIn + 'A curva ' + pgMat.termicaCurva + ' — ' + (pcGen ? textoPoderCorte(pcGen) : 'PdC a definir'),
          'un.', 1, baseGen ? precioTermica(tipoGen, pgMat.termicaIn, precios) : 0);
      const fueraDeGamaRcd = !inDiferencial(pgMat.diferencialIn);
      add('Diferencial general tipo ' + tipoGeneralMat + ' ' + pgMat.termicaPolos + 'P ' + pgMat.diferencialIn + 'A ' + pgMat.diferencialSensibilidad + ' mA' +
          (fueraDeGamaRcd ? (pgMat.termicaPolos <= 2 ? ' — revisar: a esta corriente el suministro va trifásico' : ' — sobre 63 A hay que cotizarlo a mano') : ''),
          'un.', 1, precioDiferencial(tipoGeneralMat, pgMat.termicaPolos, pgMat.diferencialIn, precios));
    }
    if (draft && draft.obra && draft.obra.naturaleza === 'Instalación nueva') {
      // Módulos que ocupa el tablero, no cantidad de llaves: una térmica bipolar
      // ocupa 2 módulos y una tetrapolar 4. Contando llaves, el gabinete salía
      // por la mitad de lo que cuesta.
      const modulosCircuitos = circuitos.reduce((t, c) => t + polosDe(c), 0) +
        rcdMat.dedicados.reduce((t, d) => t + (d.circuito.fases === 1 ? 2 : 4), 0);
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
      const mono = sistemaTablero.fases === 1;
      add('Caja para medidor ' + (mono ? 'monofásico' : 'trifásico'), 'un.', 1,
          mono ? precios.cajaMedidorMono : precios.cajaMedidorTrifasica);
      add('Jabalina / electrodo de puesta a tierra', 'un.', 1, precios.jabalina);
      add('Caño PVC 1" x 3m (puesta a tierra)', 'un.', 2, precios.canoPvc1pulg3m);
      add('Codo PVC 1" (puesta a tierra)', 'un.', 6, precios.codoPvc1pulg);
    }
    return Object.values(mapa);
  }
  // Plazo de ejecución a partir de lo relevado, en jornadas enteras:
  //   - bocas de luz y tomas: una jornada cada tantas bocas (canalizar,
  //     cablear y colocar mecanismos);
  //   - cada carga fija (aire, horno, bomba...): su circuito propio;
  //   - el tablero, en una instalación nueva: armado, acometida y tierra.
  // Como la mano de obra sale del plazo, esto es lo que la hace depender del
  // tamaño de la obra en vez de ser siempre la misma.
  function estimarPlazo(trabajo) {
    const mo = DB.settings.manoObra;
    let bocas = 0, fijas = 0;
    ((trabajo && trabajo.cargas) || []).forEach((c) => {
      const n = Number(c.cantidad) || 0;
      if (c.categoria === 'cargaFija') fijas += n; else bocas += n;
    });
    const tablero = !!(trabajo && trabajo.obra && trabajo.obra.naturaleza === 'Instalación nueva');
    const jornadas = bocas / (Number(mo.bocasPorJornada) || 6)
      + fijas * (Number(mo.jornadasCargaFija) || 0)
      + (tablero ? Number(mo.jornadasTablero) || 0 : 0);
    return { dias: Math.max(1, Math.ceil(jornadas - 1e-9)), bocas, fijas, tablero };
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

  // La posición de los rieles de cada gabinete abierto —igual que las ventanas
  // de las tapas— viene medida en img/medidas.json, bajo "rieles".
  // Las calcula herramientas/preparar-gabinetes.py sobre las propias fotos.

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
    if (pg.aplica && pg.termicaIn !== null) {
      // Los puentes de la general y del diferencial llevan la sección que
      // corresponde a la térmica general. En instalaciones existentes no se
      // dibuja un diferencial que todavía no fue confirmado en el relevamiento.
      const seccionGeneral = calcularCircuito({
        ib: pg.termicaIn, v: sistema.v, fases: sistema.fases, l: 1, material: 'cobre', metodo: 'embutido',
        aislacion: 'pvc', tempAmb: 30, agrupados: 1, resistividadTerreno: null, profundidadEnterrado: 0.5, caidaMax: 5, cosPhi: 1, uso: 'fuerza',
      }).seccionAdoptada || null;
      items.push({
        img: mono ? 'thermal-2p' : 'thermal-4p', modulos: mono ? 2 : 4, seccion: seccionGeneral,
        cara: (pg.termicaCurva || '') + pg.termicaIn, caraChica: null,
        rotulo: 'GENERAL', etiqueta: pg.modo === 'existente' ? 'Térmica general existente' : 'Térmica general',
        detalle: pg.termicaIn + ' A' + (pg.modo === 'nueva' ? ' · ' + pg.termicaPolos + 'P · curva ' + pg.termicaCurva : ' · relevada'),
      });
      if (diferencialGeneralDisponible(pg) && pg.diferencialIn !== null) {
        items.push({
          img: mono ? 'rcd-2p' : 'rcd-4p', modulos: mono ? 2 : 4, seccion: seccionGeneral,
          cara: pg.diferencialIn + 'A', caraChica: pg.diferencialSensibilidad + 'mA',
          rotulo: 'DIFERENCIAL', etiqueta: pg.modo === 'existente' ? 'Diferencial general existente' : 'Diferencial general',
          detalle: pg.diferencialIn + ' A · ' + pg.diferencialSensibilidad + ' mA · ' + textoTipoDiferencial(pg.diferencialTipo),
        });
      }
    }
    const tipoGeneralTab = pg.aplica ? tipoDiferencialGeneral(pg) : TIPO_DIFERENCIAL_DEFECTO;
    const dedicadosTab = diferencialesDedicados(draft.circuitos || [], tipoGeneralTab).dedicados;
    (draft.circuitos || []).forEach((c, i) => {
      const calc = calcularCircuito(c);
      const polos = polosDe(c);
      const IMG_POLOS = { 1: 'thermal-1p', 2: 'thermal-2p', 3: 'thermal-4p', 4: 'thermal-4p' };
      // El diferencial propio del circuito va antes de su llave, alimentado
      // como cualquier circuito y con un puente hasta la térmica que protege.
      const ded = dedicadosTab.find((d) => d.circuito === c);
      if (ded && calc.apto) {
        const polosRcd = c.fases === 1 ? 2 : 4;
        const inRcd = inDiferencial(Math.max(25, calc.breaker)) || Math.max(25, calc.breaker);
        items.push({
          img: polosRcd === 2 ? 'rcd-2p' : 'rcd-4p', modulos: polosRcd, seccion: calc.seccionAdoptada,
          cara: inRcd + 'A', caraChica: '30mA', rcdDe: c.id,
          etiqueta: 'Diferencial tipo ' + ded.tipo + ' · ' + (c.nombre || ('Circuito ' + (i + 1))),
          detalle: 'tipo ' + ded.tipo + ' · ' + inRcd + ' A · 30 mA · ' + ded.motivo,
        });
      }
      items.push({
        protegidoPor: ded && calc.apto ? c.id : null,
        img: IMG_POLOS[polos], modulos: polos,
        cara: calc.apto ? calc.curva + calc.breaker : '?', caraChica: null,
        n: i + 1, etiqueta: c.nombre || ('Circuito ' + (i + 1)),
        seccion: calc.apto ? calc.seccionAdoptada : null,
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
    const rieles = ((tabMedidas || {})[gabinete] || {}).rieles;
    if (!rieles) return null;
    // reparto en filas de 12 sin partir una llave entre dos filas
    const filas = [];
    let fila = [], usado = 0;
    conBarras.forEach((it) => {
      if (usado + it.modulos > MODULOS_POR_FILA) { filas.push(fila); fila = []; usado = 0; }
      fila.push(it); usado += it.modulos;
    });
    if (fila.length) filas.push(fila);
    while (filas.length < rieles.y.length) filas.push([]);
    return { items, barras, filas, gabinete, medida, modulos, rieles };
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
  // que se la gira un cuarto de vuelta, hacia el lado en que los agujeros de
  // los bornes quedan a la derecha, mirando al riel libre, que es por donde
  // llegan los cables. Devuelve dónde quedó cada agujero, de arriba abajo.
  const TAB_BORNES = {  // centro de cada borne, sobre el largo de la imagen
    'terminal-earth': [128, 325, 522, 719, 916, 1113].map((x) => x / 1244),
    'terminal-neutral': [118, 330, 543, 755, 968, 1180].map((x) => x / 1302),
  };
  function tabDibujarBarra(ctx, img, nombre, x, ancho, cy) {
    if (!img) return [];
    const largo = ancho * img.width / img.height;
    ctx.save();
    ctx.translate(x + ancho / 2, cy);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -largo / 2, -ancho / 2, largo, ancho);
    ctx.restore();
    const xAgujero = x + ancho * 0.93;
    return (TAB_BORNES[nombre] || []).map((f) => ({ x: xAgujero, y: cy - largo / 2 + f * largo }));
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
    // Las tapas ciegas sólo se usan con la tapa interna puesta.
    if (vista === 'cerrado') { set['blind-module'] = true; set[layout.gabinete + '-cover'] = true; }
    else set[layout.gabinete] = true;
    set['adonai-logo-y-nombre'] = true;
    return Object.keys(set);
  }

  /**
   * Dibuja el tablero y devuelve el canvas.
   * vista: 'cerrado' (con tapa interna) o 'abierto' (interior y conductores)
   */
  async function tabDibujar(draft, vista, datos) {
    // Las medidas van primero: el reparto en filas depende de cuántos rieles
    // tiene el gabinete, y eso sale de medidas.json.
    await tabCargarMedidas();
    const layout = tabLayout(draft);
    if (!layout) return null;
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
      const g = layout.rieles;
      ranuras = g.y.map((cy) => ({ x0: g.x0, x1: g.x1, cy, alto: 0 }));
    }
    if (!ranuras.length) return null;
    const mod = (ranuras[0].x1 - ranuras[0].x0) / MODULOS_POR_FILA;
    const altoLlave = mod * TAB_ALTO_POR_MODULO;

    function ciegos(x, top, cuantos) {
      for (let k = 0; k < cuantos; k++) {
        ctx.drawImage(tabImagenes['blind-module'], x + k * mod, top, mod, altoLlave);
      }
    }

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
      const libresFila = MODULOS_POR_FILA - fila.reduce((t, it) => t + it.modulos, 0);
      let libresSinUsar = libresFila;
      fila.forEach((it, idx) => {
        const w = it.modulos * mod;
        if (it.barra) {
          if (esCerrado) {
            // Con la tapa puesta la bornera no se ve: queda detrás del
            // plástico y por la ventana asoman tapas ciegas, como en un
            // tablero terminado.
            ciegos(x, top, it.modulos);
          } else {
            // Si hay lugar, entre la bornera de neutro y la de tierra queda un
            // módulo libre: por ahí bajan los cables del neutro.
            const antes = fila[idx - 1];
            if (antes && antes.barra && libresSinUsar > 0) { x += mod; libresSinUsar--; }
            // la bornera va parada sobre el riel, como se monta de verdad
            const bornes = tabDibujarBarra(ctx, tabImagenes[it.img], it.img, x, w, r.cy + CAB);
            barrasPuestas.push({ it, x, w, cy: r.cy + CAB, fila: fi, bornes });
          }
        } else {
          ctx.drawImage(tabImagenes[it.img], x, top, w, altoLlave);
          tabEtiqueta(ctx, it, x, top, altoLlave, mod, fracArriba);
          puestos.push({ it, x, w, cy: r.cy + CAB, fila: fi });
        }
        // Si la bornera no se ve, su rótulo tampoco.
        if (!(esCerrado && it.barra)) rotulos.push({ it, x, w, cy: r.cy + CAB, alto: r.alto });
        x += w;
      });
      // Los módulos que sobran se tapan con tapas ciegas. Sin tapa interna no
      // hay nada que tapar: ahí queda el riel a la vista, como en la obra.
      if (esCerrado) ciegos(x, top, libresFila);
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
  /* ---------- conductores ---------- */

  // Los colores que usa ADONAI en obra: fases blanco, rojo y negro; neutro
  // celeste; tierra verde y amarilla. En monofásica la fase va en blanco.
  const TAB_COLOR = { L1: '#f4f4f2', L2: '#c8252b', L3: '#2b2b2e', N: '#2b8ad6', PE: '#2e9a47' };
  const TAB_PE_RAYA = '#f1c318';

  function tabTono(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
    return 'rgb(' + c.join(',') + ')';
  }

  // Recorre la polilínea redondeando cada quiebre, como dobla un cable.
  function tabTrazar(ctx, pts, radio) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], p = pts[i], n = pts[i + 1];
      const r = Math.min(radio, Math.hypot(p[0] - a[0], p[1] - a[1]) / 2, Math.hypot(n[0] - p[0], n[1] - p[1]) / 2);
      ctx.arcTo(p[0], p[1], n[0], n[1], r);
    }
    const u = pts[pts.length - 1];
    ctx.lineTo(u[0], u[1]);
  }

  // Diámetro exterior de un cable unipolar con aislación de PVC, en mm, según
  // su sección. Con esto cada conductor se dibuja con su grosor real respecto
  // del módulo DIN de 17,5 mm (un poco afinado, para que se lean los mazos).
  const TAB_DIAMETRO = [[1, 2.6], [1.5, 3.0], [2.5, 3.6], [4, 4.2], [6, 4.8], [10, 6.2],
                        [16, 7.4], [25, 9.2], [35, 10.4], [50, 12.2]];
  function tabGrosor(seccion, mod) {
    const fila = TAB_DIAMETRO.find(([s]) => s >= (seccion || 2.5)) || TAB_DIAMETRO[TAB_DIAMETRO.length - 1];
    return Math.max(2.5, mod * fila[1] / 17.5 * 0.75);
  }

  // Terminal tipo pin preaislado: el pin metálico entra al borne y el cuello
  // de plástico abraza la punta del cable. El cuello va del color que trae de
  // fábrica según la sección: rojo hasta 1,5 mm², azul hasta 2,5 y amarillo
  // de 4 para arriba.
  const TAB_PIN = { pin: 1.2, cuello: 1.7 };  // largos, en grosores de cable
  function tabColorPuntera(seccion) {
    if (seccion && seccion <= 1.5) return '#c9262d';
    if (seccion && seccion > 2.5) return '#e2b01a';
    return '#1f5fbf';
  }
  function tabPuntera(ctx, punta, desde, g, seccion) {
    const ang = Math.atan2(punta[1] - desde[1], punta[0] - desde[0]);
    const largoPin = g * TAB_PIN.pin, anchoPin = g * 0.46;
    const largoCuello = g * TAB_PIN.cuello, anchoCuello = g * 1.35;
    const x1 = -largoPin, x0 = x1 - largoCuello;
    ctx.save();
    ctx.translate(punta[0], punta[1]);
    ctx.rotate(ang);
    // pin estañado
    ctx.fillStyle = '#b4b9bf';
    ctx.fillRect(x1, -anchoPin / 2, largoPin, anchoPin);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(x1, -anchoPin / 2, largoPin, anchoPin * 0.3);
    // cuello, afinado hacia el pin
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = g;
    ctx.shadowOffsetY = g * 0.4;
    ctx.fillStyle = tabColorPuntera(seccion);
    ctx.beginPath();
    ctx.moveTo(x0, -anchoCuello / 2);
    ctx.lineTo(x1 - g * 0.5, -anchoCuello / 2);
    ctx.lineTo(x1, -anchoPin * 0.8);
    ctx.lineTo(x1, anchoPin * 0.8);
    ctx.lineTo(x1 - g * 0.5, anchoCuello / 2);
    ctx.lineTo(x0, anchoCuello / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0 + g * 0.15, -anchoCuello / 2 + g * 0.12, largoCuello - g * 0.75, anchoCuello * 0.22);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x0 + g * 0.35, -anchoCuello / 2, g * 0.12, anchoCuello);
    ctx.restore();
  }

  // Un conductor con volumen: sombra sobre el fondo, borde oscuro, cuerpo del
  // color de la vaina y un brillo fino. Donde entra a un borne lleva su
  // terminal tipo pin.
  function tabCable(ctx, c) {
    const g = c.g;
    const pts = c.pts.filter((p, i, arr) => i === 0 || Math.hypot(p[0] - arr[i - 1][0], p[1] - arr[i - 1][1]) > 0.5);
    if (pts.length < 2) return;
    const color = TAB_COLOR[c.fase];
    const radio = g * 2.4;
    // la vaina termina adentro del cuello del terminal
    const hastaCuello = g * (TAB_PIN.pin + TAB_PIN.cuello * 0.6);
    const recortar = (desde, hacia) => {
      const d = Math.hypot(hacia[0] - desde[0], hacia[1] - desde[1]) || 1;
      const k = Math.min(hastaCuello, d * 0.95) / d;
      return [hacia[0] - (hacia[0] - desde[0]) * k, hacia[1] - (hacia[1] - desde[1]) * k];
    };
    const vaina = pts.slice();
    const puntas = [];
    const n = pts.length;
    if (c.borneInicio) { vaina[0] = recortar(pts[1], pts[0]); puntas.push([pts[0], pts[1]]); }
    if (c.borneFin) { vaina[n - 1] = recortar(pts[n - 2], pts[n - 1]); puntas.push([pts[n - 1], pts[n - 2]]); }

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = g * 1.5;
    ctx.shadowOffsetX = g * 0.4;
    ctx.shadowOffsetY = g * 0.7;
    ctx.strokeStyle = tabTono(color, -0.5);
    ctx.lineWidth = g;
    tabTrazar(ctx, vaina, radio); ctx.stroke();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = color;
    ctx.lineWidth = g * 0.72;
    tabTrazar(ctx, vaina, radio); ctx.stroke();
    if (c.fase === 'PE') {
      ctx.strokeStyle = TAB_PE_RAYA;
      ctx.lineCap = 'butt';
      ctx.setLineDash([g * 1.8, g * 1.8]);
      tabTrazar(ctx, vaina, radio); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
    }
    // la luz viene de arriba a la izquierda
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = g * 0.2;
    ctx.translate(-g * 0.17, -g * 0.17);
    tabTrazar(ctx, vaina, radio); ctx.stroke();
    ctx.restore();

    puntas.forEach(([punta, desde]) => tabPuntera(ctx, punta, desde, g, c.seccion));
  }

  // Troquel sacado, con la boca del caño asomando.
  function tabTroquelAbierto(ctx, t) {
    ctx.save();
    ctx.fillStyle = '#1f2124';
    ctx.beginPath(); ctx.ellipse(t.x, t.y, t.w / 2, t.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5d6167';
    ctx.lineWidth = Math.max(2, t.h * 0.22);
    ctx.beginPath(); ctx.ellipse(t.x, t.y, t.w * 0.38, t.h * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Anillo del conector del caño. Va encima de los cables: así parece que
  // pasan por adentro.
  function tabConector(ctx, t) {
    ctx.save();
    ctx.lineWidth = Math.max(2.5, t.h * 0.2);
    ctx.strokeStyle = '#d9dcdf';
    ctx.beginPath(); ctx.ellipse(t.x, t.y, t.w * 0.47, t.h * 0.44, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(t.x, t.y, t.w * 0.53, t.h * 0.53, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Precinto que junta un mazo de cables.
  function tabPrecinto(ctx, x0, y0, x1, y1, g) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1c1d20';
    ctx.lineWidth = g * 0.8;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = g * 0.2;
    ctx.beginPath(); ctx.moveTo(x0, y0 - g * 0.15); ctx.lineTo(x1, y1 - g * 0.15); ctx.stroke();
    ctx.restore();
  }

  /*
   * Tendido del interior, como lo arma un electricista:
   *
   *   - La acometida entra por un troquel de arriba y llega a la térmica general.
   *   - De la general al diferencial, un puente que da la vuelta por el canal
   *     izquierdo.
   *   - Del diferencial sale una troncal por el canal izquierdo a cada fila, y
   *     ahí se reparte de llave en llave con puentes cortos.
   *   - El neutro de las llaves unipolares sale de la bornera de neutro, que se
   *     alimenta del diferencial. La tierra entra por abajo a su bornera.
   *   - Cada circuito sale con sus fases, su neutro y su tierra por un troquel
   *     de abajo. Los de la última fila bajan derecho; los de las filas de
   *     arriba bajan por el canal derecho.
   */
  function tabConductores(ctx, ranuras, puestos, mod, altoLlave, CAB, layout, barras) {
    if (!puestos.length) return;
    const troq = (tabMedidas[layout.gabinete] || {}).troqueles || {};
    const bocasDe = (lado) => (troq[lado] || []).map((t) => ({ x: t.x, y: t.y + CAB, w: t.w, h: t.h, cables: [] }));
    const arriba = bocasDe('arriba');
    const abajo = bocasDe('abajo');
    if (!arriba.length || !abajo.length) return;

    // grosor de referencia (2,5 mm²) para los carriles y los precintos
    const g = tabGrosor(2.5, mod);
    const sp = g * 1.2;
    const filas = ranuras.length;
    const ultima = filas - 1;
    const techo = (fi) => ranuras[fi].cy + CAB - TAB_ANCLA * altoLlave;
    const piso = (fi) => techo(fi) + altoLlave;
    const huecoArriba = (fi) => techo(fi) - (fi ? piso(fi - 1) : arriba[0].y + arriba[0].h / 2);
    const huecoAbajo = (fi) => (fi < ultima ? techo(fi + 1) : abajo[0].y - abajo[0].h / 2) - piso(fi);
    const canalIzq = ranuras[0].x0 - mod * 0.45;
    const canalDer = ranuras[0].x1 + mod * 0.45;

    // Carriles: cada tendido horizontal va a su propia altura dentro del hueco
    // entre filas, y cada bajada por un canal lateral a su propia distancia.
    // Si son más de los que entran, se enciman como un mazo de verdad.
    const usoArriba = new Array(filas).fill(0);
    const usoAbajo = new Array(filas).fill(0);
    const usoCanal = { izq: 0, der: 0 };
    const carrilArriba = (fi) => {
      const max = Math.max(1, Math.floor(huecoArriba(fi) * 0.5 / sp));
      return techo(fi) - huecoArriba(fi) * 0.22 - (usoArriba[fi]++ % max) * sp;
    };
    const carrilAbajo = (fi) => {
      const max = Math.max(1, Math.floor(huecoAbajo(fi) * 0.5 / sp));
      return piso(fi) + huecoAbajo(fi) * 0.22 + (usoAbajo[fi]++ % max) * sp;
    };
    const carrilCanal = (lado) => {
      const i = usoCanal[lado]++ % Math.max(1, Math.floor(mod * 1.1 / sp));
      return lado === 'izq' ? canalIzq - i * sp : canalDer + i * sp;
    };

    const cables = [];
    const bajadas = [];
    const tender = (fase, pts, borneInicio, borneFin, seccion) => cables.push({ fase, pts, borneInicio, borneFin, seccion });
    // Lo que alimenta al tablero y a cada fila lleva la sección de la general;
    // sin general, la del circuito más grueso.
    const SECCION_ALIMENTACION = (puestos.find((p) => p.it.rotulo === 'GENERAL') || {}).it?.seccion
      || Math.max(2.5, ...puestos.map((p) => p.it.seccion || 0));
    const porCanal = (x, ya, yb) => bajadas.push({ x, y0: Math.min(ya, yb), y1: Math.max(ya, yb) });

    const polo = (p, k) => p.x + (k + 0.5) * p.w / p.it.modulos;
    const bArriba = (p) => p.cy - TAB_ANCLA * altoLlave + altoLlave * 0.03;
    const bAbajo = (p) => p.cy - TAB_ANCLA * altoLlave + altoLlave * 0.97;
    const masCerca = (lista, x) => lista.reduce((m, t) => (Math.abs(t.x - x) < Math.abs(m.x - x) ? t : m));

    const general = puestos.find((p) => p.it.rotulo === 'GENERAL');
    const dif = puestos.find((p) => p.it.rotulo === 'DIFERENCIAL');
    const circuitos = puestos.filter((p) => !p.it.rotulo);
    // Los diferenciales propios de un circuito se alimentan como cualquier
    // llave, pero no salen al troquel: su salida es la térmica que protegen.
    const alimentados = circuitos.filter((p) => !p.it.protegidoPor);
    const salidas = circuitos.filter((p) => !p.it.rcdDe);
    const tri = general ? general.it.modulos >= 4 : circuitos.some((p) => p.it.modulos >= 3);
    const RED = tri ? ['L1', 'L2', 'L3', 'N'] : ['L1', 'N'];
    const fuente = dif || general;
    const cabecera = general || dif;
    const bocaAcometida = masCerca(arriba, cabecera ? polo(cabecera, 0) : canalIzq);

    // Lo que entra por los polos de una llave de circuito. En trifásica las
    // llaves monofásicas se reparten entre las tres fases.
    // Fases de cada llave. Una térmica con diferencial propio hereda las del
    // diferencial, que es el que la alimenta.
    const fasesPorPuesto = new Map();
    let giroFase = 0;
    alimentados.forEach((p) => {
      fasesPorPuesto.set(p, giroFase++);
      if (p.it.rcdDe) {
        const prot = circuitos.find((q) => q.it.protegidoPor === p.it.rcdDe);
        if (prot) fasesPorPuesto.set(prot, giroFase - 1);
      }
    });
    const conductoresDe = (p, i) => {
      const giro = fasesPorPuesto.has(p) ? fasesPorPuesto.get(p) : i;
      const fase = tri ? ['L1', 'L2', 'L3'][giro % 3] : 'L1';
      switch (p.it.modulos) {
        case 1: return [fase];
        case 2: return [fase, 'N'];
        case 3: return ['L1', 'L2', 'L3'];
        default: return ['L1', 'L2', 'L3', 'N'];
      }
    };
    const neutroDeBornera = (p) => p.it.modulos === 1 || p.it.modulos === 3;
    const bNeutro = barras.find((b) => b.it.barra === 'neutro' && b.bornes.length);
    const bTierra = barras.find((b) => b.it.barra === 'tierra' && b.bornes.length);

    // 1) puente de la general al diferencial
    if (general && dif) {
      const yB = RED.map(() => carrilAbajo(general.fila));
      const xc = RED.map(() => carrilCanal('izq'));
      const yA = RED.map(() => carrilArriba(dif.fila));
      RED.forEach((f, k) => {
        tender(f, [[polo(general, k), bAbajo(general)], [polo(general, k), yB[k]], [xc[k], yB[k]],
                   [xc[k], yA[k]], [polo(dif, k), yA[k]], [polo(dif, k), bArriba(dif)]], true, true, SECCION_ALIMENTACION);
        porCanal(xc[k], yB[k], yA[k]);
      });
    }

    // 2) troncal a cada fila y puentes de llave en llave
    const tomas = {};
    alimentados.forEach((p, i) => {
      conductoresDe(p, i).forEach((f, k) => {
        const clave = p.fila + '|' + f;
        (tomas[clave] = tomas[clave] || []).push([polo(p, k), bArriba(p), p.it.seccion]);
      });
    });
    const filasConCircuitos = [...new Set(alimentados.map((p) => p.fila))].sort((a, b) => a - b);
    RED.forEach((f, k) => {
      filasConCircuitos.forEach((fi) => {
        const lista = (tomas[fi + '|' + f] || []).sort((a, b) => a[0] - b[0]);
        if (!lista.length) return;
        const yA = carrilArriba(fi);
        const xc = carrilCanal('izq');
        let inicio;
        if (fuente) {
          const yB = carrilAbajo(fuente.fila);
          inicio = [[polo(fuente, k), bAbajo(fuente)], [polo(fuente, k), yB], [xc, yB]];
          porCanal(xc, yB, yA);
        } else {
          // sin protección general, la acometida va directo a las llaves
          const yT = carrilArriba(0);
          const xb = bocaAcometida.x + (k - (RED.length - 1) / 2) * sp;
          inicio = [[xb, bocaAcometida.y], [xb, yT], [xc, yT]];
          bocaAcometida.cables.push(f);
          porCanal(xc, yT, yA);
        }
        tender(f, inicio.concat([[xc, yA], [lista[0][0], yA], lista[0]]), !!fuente, true, SECCION_ALIMENTACION);
        for (let j = 1; j < lista.length; j++) {
          const a = lista[j - 1], b = lista[j];
          const yP = techo(fi) - Math.min(mod * (0.2 + 0.12 * k), huecoArriba(fi) * (0.1 + 0.05 * k));
          tender(f, [a, [a[0], yP], [b[0], yP], b], true, true, Math.max(a[2] || 0, b[2] || 0) || null);
        }
      });
    });

    // Bornes de las borneras. La de tierra se alimenta por el de más abajo y la
    // de neutro por el de más arriba; los circuitos toman los otros de abajo
    // hacia arriba. Cuanto más arriba el borne, más lejos de la bornera baja su
    // cable: así ningún cable pisa el tramo corto de otro.
    const bornesTomados = { tierra: 0, neutro: 0 };
    const tomarBorne = (b) => {
      const n = b.bornes.length;
      const i = bornesTomados[b.it.barra]++ % (n - 1);
      const h = b.it.barra === 'tierra' ? n - 2 - i : n - 1 - i;
      return { h: b.bornes[h], dx: g * 3.2 + (n - 1 - h) * sp * 0.7, fila: b.fila };
    };
    const desdeBorne = (fase, t) => ({ fase, x: t.h.x + t.dx, y: t.h.y, fila: t.fila, borne: t.h });

    // 2b) puente del diferencial propio a la térmica que protege
    circuitos.filter((p) => p.it.rcdDe).forEach((rcd) => {
      const prot = circuitos.find((q) => q.it.protegidoPor === rcd.it.rcdDe);
      if (!prot) return;
      const fases = conductoresDe(prot, 0);
      const yB = carrilAbajo(rcd.fila);
      fases.forEach((f, k) => {
        if (k >= rcd.it.modulos) return;
        tender(f, [[polo(rcd, k), bAbajo(rcd)], [polo(rcd, k), yB], [polo(prot, k), yB], [polo(prot, k), bArriba(prot)]],
               true, true, prot.it.seccion);
      });
    });

    // 3) alimentación de la bornera de neutro
    if (bNeutro && fuente) {
      const kN = RED.indexOf('N');
      const h = bNeutro.bornes[0];
      const dx = tabGrosor(SECCION_ALIMENTACION, mod) * 3.2 + bNeutro.bornes.length * sp * 0.7;
      const yB = carrilAbajo(fuente.fila);
      const xc = carrilCanal('izq');
      const yA = carrilArriba(bNeutro.fila);
      tender('N', [[polo(fuente, kN), bAbajo(fuente)], [polo(fuente, kN), yB], [xc, yB], [xc, yA],
                   [h.x + dx, yA], [h.x + dx, h.y], [h.x, h.y]], true, true, SECCION_ALIMENTACION);
      porCanal(xc, yB, yA);
    }

    // 4) salidas de los circuitos y entrada de la tierra
    //
    // Los circuitos se reparten por igual entre los troqueles de arriba y los
    // de abajo: la primera mitad —las filas de arriba— sale por arriba y el
    // resto por abajo. Cada circuito sale en un mazo con sus fases, su neutro y
    // su tierra. Los que van hacia abajo desde la última fila bajan derecho; el
    // resto va por el canal del costado que le queda más cerca. Los troqueles
    // se asignan en el orden en que los mazos llegan, de izquierda a derecha,
    // para que no se crucen.
    const medio = (ranuras[0].x0 + ranuras[0].x1) / 2;
    const grupos = salidas.map((p, i) => {
      const hilos = conductoresDe(p, i).map((f, k) => ({ fase: f, x: polo(p, k), y: bAbajo(p), fila: p.fila }));
      if (bNeutro && neutroDeBornera(p)) hilos.push(desdeBorne('N', tomarBorne(bNeutro)));
      if (bTierra) hilos.push(desdeBorne('PE', tomarBorne(bTierra)));
      const centro = p.x + p.w / 2;
      return { hilos, fila: p.fila, x: centro, canal: centro < medio ? 'izq' : 'der', seccion: p.it.seccion };
    });
    const totalCircuitos = grupos.reduce((t, gr) => t + gr.hilos.length, 0);
    let llevados = 0;
    grupos.slice().sort((a, b) => (a.fila - b.fila) || (a.x - b.x)).forEach((gr) => {
      gr.sube = grupos.length > 1 && llevados + gr.hilos.length / 2 < totalCircuitos / 2;
      llevados += gr.hilos.length;
      gr.directo = !gr.sube && gr.fila === ultima;
    });
    if (bTierra) {
      const h = bTierra.bornes[bTierra.bornes.length - 1];
      const hilo = { fase: 'PE', x: h.x + tabGrosor(SECCION_ALIMENTACION, mod) * 3.2, y: h.y, fila: bTierra.fila, borne: h, entra: true };
      grupos.push({ hilos: [hilo], fila: bTierra.fila, x: hilo.x, canal: 'der', sube: false, directo: bTierra.fila === ultima });
    }

    // Por un canal, el mazo que recorre más tramo va por afuera y llega primero
    // a la punta: hacia abajo es el de la fila más alta, hacia arriba el de la
    // más baja.
    const ordenDe = (gr) => {
      if (gr.directo) return gr.x;
      const lejos = gr.sube ? gr.fila : -gr.fila;
      return gr.canal === 'izq' ? -1e6 - lejos * 1e4 + gr.x : 1e6 + lejos * 1e4 + gr.x;
    };
    const repartir = (lista, bocas) => {
      if (!lista.length || !bocas.length) return;
      lista.sort((a, b) => ordenDe(a) - ordenDe(b));
      const total = lista.reduce((t, gr) => t + gr.hilos.length, 0);
      let acumulado = 0;
      lista.forEach((gr, j) => {
        // Con menos mazos que troqueles, uno por troquel y bien repartidos;
        // con más, en proporción a los cables de cada uno.
        const k = lista.length <= bocas.length
          ? (lista.length === 1 ? (gr.canal === 'izq' ? 0 : bocas.length - 1) : Math.round(j * (bocas.length - 1) / (lista.length - 1)))
          : Math.min(bocas.length - 1, Math.floor((acumulado + gr.hilos.length / 2) / total * bocas.length));
        gr.boca = bocas[k];
        gr.lejania = Math.abs(k - (bocas.length - 1) / 2);
        acumulado += gr.hilos.length;
        gr.hilos.forEach((h) => gr.boca.cables.push(h));
      });
      bocas.forEach((t) => {
        const paso = Math.min(sp, t.w * 0.75 / Math.max(1, t.cables.length));
        t.cables.forEach((c, j) => { c.bx = t.x + (j - (t.cables.length - 1) / 2) * paso; });
      });
    };
    // Arriba se deja libre el troquel de la acometida, salvo que no haya otro.
    const bocasArriba = arriba.length > 1 ? arriba.filter((t) => t !== bocaAcometida) : arriba;
    repartir(grupos.filter((gr) => gr.sube), bocasArriba);
    repartir(grupos.filter((gr) => !gr.sube), abajo);

    // Carriles de los canales: el que recorre menos, por adentro.
    grupos.filter((gr) => !gr.directo)
      .sort((a, b) => (a.sube ? a.fila : -a.fila) - (b.sube ? b.fila : -b.fila))
      .forEach((gr) => gr.hilos.forEach((h) => {
        if (gr.sube || h.fila !== ultima) h.xc = carrilCanal(gr.canal);
      }));
    // Carriles del piso y del techo: primero los mazos que van a los troqueles
    // del medio; los de las puntas doblan más cerca de la pared y no cortan a
    // nadie.
    grupos.slice().sort((a, b) => a.lejania - b.lejania).forEach((gr) => gr.hilos.forEach((h) => {
      h.yFin = gr.sube ? carrilArriba(0) : carrilAbajo(ultima);
    }));

    grupos.forEach((gr) => gr.hilos.forEach((c) => {
      const t = gr.boca;
      const pts = c.borne ? [[c.borne.x, c.borne.y], [c.x, c.y]] : [[c.x, c.y]];
      if (!gr.sube && c.fila === ultima) {
        pts.push([c.x, c.yFin], [c.bx, c.yFin], [c.bx, t.y]);
      } else {
        const y = carrilAbajo(c.fila);
        pts.push([c.x, y], [c.xc, y], [c.xc, c.yFin], [c.bx, c.yFin], [c.bx, t.y]);
        porCanal(c.xc, y, c.yFin);
      }
      if (c.entra) tender(c.fase, pts.reverse(), false, true, SECCION_ALIMENTACION);
      else tender(c.fase, pts, true, false, gr.seccion);
    }));

    // 5) acometida: va última para quedar en los carriles más altos
    if (cabecera) {
      const derecha = polo(cabecera, 0) >= bocaAcometida.x;
      const ys = {};
      const orden = RED.map((f, k) => k);
      if (!derecha) orden.reverse();
      orden.forEach((k) => { ys[k] = carrilArriba(cabecera.fila); });
      const paso = Math.min(sp, bocaAcometida.w * 0.75 / RED.length);
      RED.forEach((f, k) => {
        const xb = bocaAcometida.x + (k - (RED.length - 1) / 2) * paso;
        tender(f, [[xb, bocaAcometida.y], [xb, ys[k]], [polo(cabecera, k), ys[k]], [polo(cabecera, k), bArriba(cabecera)]], false, true, SECCION_ALIMENTACION);
        bocaAcometida.cables.push(f);
      });
    }

    // dibujo: troqueles, cables, conectores y precintos
    const usadas = arriba.concat(abajo).filter((t) => t.cables.length);
    usadas.forEach((t) => tabTroquelAbierto(ctx, t));
    cables.forEach((c) => { c.g = tabGrosor(c.seccion, mod); tabCable(ctx, c); });
    usadas.forEach((t) => tabConector(ctx, t));

    arriba.concat(abajo).forEach((t) => {
      const xs = t.cables.map((c) => c.bx).filter((x) => x !== undefined);
      if (xs.length < 2) return;
      const y = abajo.includes(t) ? t.y - t.h * 0.5 - g * 2.6 : t.y + t.h * 0.5 + g * 2.6;
      tabPrecinto(ctx, Math.min(...xs) - g * 0.7, y, Math.max(...xs) + g * 0.7, y, g);
    });
    ranuras.forEach((r) => {
      const y = r.cy + CAB;
      [canalIzq, canalDer].forEach((borde) => {
        const xs = bajadas.filter((b) => b.y0 < y - g && b.y1 > y + g && Math.abs(b.x - borde) < mod * 1.3).map((b) => b.x);
        if (xs.length < 2) return;
        tabPrecinto(ctx, Math.min(...xs) - g * 0.7, y, Math.max(...xs) + g * 0.7, y, g);
      });
    });
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
  const DB_SCHEMA_VERSION = 14;
  function defaultDB() {
    return {
      schemaVersion: DB_SCHEMA_VERSION,
      trabajos: [], presupuestos: [],
      settings: { margen: 30, iva: 22, precios: clonePrecios(DEFAULT_PRECIOS),
                  manoObra: { ...DEFAULT_MANO_OBRA }, dolar: { ...DEFAULT_DOLAR },
                  preciosRevisados: Date.now() },
      seq: { trabajo: 0, presupuesto: 0 }, _seeded: false,
    };
  }

  // Migra de forma explícita la estructura local. Los cambios de datos más
  // específicos (catálogo, medidas y presupuestos) siguen teniendo sus propias
  // migraciones debajo, pero el número de esquema permite saber qué versión
  // abrió y normalizó cada copia de seguridad.
  function migrarEsquemaDB(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { db: defaultDB(), cambio: true };
    let cambio = false;
    const versionAnterior = Number(data.schemaVersion) || 0;
    if (!Array.isArray(data.trabajos)) { data.trabajos = []; cambio = true; }
    if (!Array.isArray(data.presupuestos)) { data.presupuestos = []; cambio = true; }
    if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) { data.settings = {}; cambio = true; }
    if (!data.seq || typeof data.seq !== 'object' || Array.isArray(data.seq)) { data.seq = { trabajo: 0, presupuesto: 0 }; cambio = true; }

    // v2: estado de materiales regenerados / pendientes de regenerar.
    if (versionAnterior < 2) {
      data.trabajos.forEach((tr) => {
        if (tr && tr.materialesDesactualizados === undefined) tr.materialesDesactualizados = false;
      });
      cambio = true;
    }

    // v3: vínculo carga -> circuito. No se fuerza una asociación por nombre
    // durante la migración para no enlazar una carga equivocada; el paso
    // Circuitos la reconstruye de forma segura al sincronizar.
    if (versionAnterior < 3) cambio = true;

    // v4: la memoria agrega la comprobación de puesta a tierra. Se conserva la
    // sensibilidad existente y sólo se agregan los nuevos campos; la resistencia
    // queda vacía para que una copia antigua no aparezca falsamente verificada.
    if (versionAnterior < 4) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.proteccionGeneral || typeof tr.proteccionGeneral !== 'object') tr.proteccionGeneral = { diferencialSensibilidad: 30 };
        if (!tr.proteccionGeneral.ambienteTierra) tr.proteccionGeneral.ambienteTierra = 'seco';
        if (tr.proteccionGeneral.resistenciaTierraOhm === undefined) tr.proteccionGeneral.resistenciaTierraOhm = null;
      });
      cambio = true;
    }

    // v5: terreno enterrado, sobretensiones y verificación de protecciones
    // existentes. Ningún dato antiguo se da por confirmado: los nuevos campos
    // quedan en estado desconocido para evitar falsos "Verificado".
    if (versionAnterior < 5) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.proteccionGeneral || typeof tr.proteccionGeneral !== 'object') tr.proteccionGeneral = { diferencialSensibilidad: 30 };
        const pg = tr.proteccionGeneral;
        if (!pg.diferencialExiste) pg.diferencialExiste = 'desconocido';
        if (pg.termicaExistenteA === undefined) pg.termicaExistenteA = null;
        if (pg.diferencialExistenteA === undefined) pg.diferencialExistenteA = null;
        if (!pg.sobretensionesRiesgo) pg.sobretensionesRiesgo = 'pendiente';
        if (!pg.pararrayosLps) pg.pararrayosLps = 'desconocido';
        if (!pg.spdExiste) pg.spdExiste = 'desconocido';
        if (pg.spdTipo === undefined) pg.spdTipo = '';
        (tr.circuitos || []).forEach((c) => {
          if (c.resistividadTerreno === undefined) c.resistividadTerreno = c.metodo === 'enterrado' ? RESISTIVIDAD_TERRENO_UTE_DEFECTO : null;
          if (c.profundidadEnterrado === undefined) c.profundidadEnterrado = 0.5;
        });
      });
      cambio = true;
    }

    // v6: auditoría estricta de circuitos. Los VE antiguos no reciben un modo
    // ni una protección individual supuestos: quedan pendientes hasta relevarlos.
    if (versionAnterior < 6) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        const sistema = SISTEMAS[tr.sistemaId] || SISTEMAS.tri_tt;
        (tr.circuitos || []).forEach((c) => {
          if (c.modoCargaVe === undefined) c.modoCargaVe = '';
          if (c.diferencialIndividualVe === undefined) c.diferencialIndividualVe = 'desconocido';
          c.sistemaId = sistema.id;
          if (sistema.fases === 1) {
            c.fases = 1; c.v = 230; c.fasesConfirmadas = true;
          } else if (c.fasesConfirmadas === undefined) {
            // Los proyectos viejos heredaban 3 fases del suministro sin poder
            // distinguir el circuito. Se recalculan provisionalmente a 1φ/230 V
            // y se exige confirmación para no conservar un subdimensionado.
            c.fases = 1; c.v = 230; c.fasesConfirmadas = false; c.fasesManual = false;
          }
        });
      });
      cambio = true;
    }

    // v7: balance de fases. No se inventa una fase para circuitos monofásicos
    // existentes; quedan sin asignación hasta que el técnico los distribuya o
    // use la función de balance automático. La potencia contratada puede quedar
    // vacía y, mientras tanto, se usa el escalón sugerido si existe.
    if (versionAnterior < 7) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.balanceFases || typeof tr.balanceFases !== 'object') tr.balanceFases = { potenciaContratadaKw: null };
        const sistema = SISTEMAS[tr.sistemaId] || SISTEMAS.tri_tt;
        (tr.circuitos || []).forEach((c) => {
          if (c.faseAsignada === undefined) c.faseAsignada = '';
          if (c.faseManual === undefined) c.faseManual = false;
          if (sistema.fases === 1 || Number(c.fases) === 3) c.faseAsignada = '';
        });
      });
      cambio = true;
    }

    // v8: alimentador completo. Las copias anteriores sólo tenían la sección
    // de fase; neutro y PE quedan en automático (null) para no inventar una
    // sección relevada manualmente.
    if (versionAnterior < 8) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.acometida || typeof tr.acometida !== 'object') tr.acometida = { ...ACOMETIDA_DEFECTO };
        if (tr.acometida.neutroSeccion === undefined) tr.acometida.neutroSeccion = null;
        if (tr.acometida.peSeccion === undefined) tr.acometida.peSeccion = null;
      });
      cambio = true;
    }

    // v9: coordinación/selectividad. Los proyectos anteriores no reciben una
    // selectividad supuesta; quedan pendientes hasta cargar dato del fabricante.
    if (versionAnterior < 9) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.proteccionGeneral || typeof tr.proteccionGeneral !== 'object') tr.proteccionGeneral = { diferencialSensibilidad:30 };
        if (!tr.proteccionGeneral.diferencialSelectividad) tr.proteccionGeneral.diferencialSelectividad = 'instantaneo';
        (tr.circuitos || []).forEach((c)=>{
          if (c.curvaProteccion === undefined) c.curvaProteccion = '';
          if (!c.selectividadFabricante) c.selectividadFabricante = 'pendiente';
          if (c.selectividadLimiteKa === undefined) c.selectividadLimiteKa = null;
        });
      });
      cambio = true;
    }

    // v10: Icc mínima al final de línea y tiempo de actuación de la protección. No se
    // inventan mediciones en proyectos anteriores: quedan vacías hasta relevar.
    if (versionAnterior < 10) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        (tr.circuitos || []).forEach((c)=>{
          if (c.iccMinFinalA === undefined) c.iccMinFinalA = null;
          if (c.zCortoFinalOhm === undefined) c.zCortoFinalOhm = null;
          if (c.tiempoDesconexionVerificadoS === undefined) c.tiempoDesconexionVerificadoS = null;
        });
      });
      cambio = true;
    }

    // v11: protección contra contactos indirectos TT/IT. Los tiempos de ensayo,
    // la corriente de primer defecto y la vigilancia IT nunca se inventan al migrar.
    if (versionAnterior < 11) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.proteccionGeneral || typeof tr.proteccionGeneral !== 'object') tr.proteccionGeneral = { diferencialSensibilidad:30 };
        const pg = tr.proteccionGeneral;
        if (pg.tiempoDiferencialGeneralS === undefined) pg.tiempoDiferencialGeneralS = null;
        if (pg.monitorAislamientoIt === undefined) pg.monitorAislamientoIt = 'desconocido';
        if (pg.masasInterconectadasIt === undefined) pg.masasInterconectadasIt = 'desconocido';
        if (pg.corrientePrimerDefectoMa === undefined) pg.corrientePrimerDefectoMa = null;
        (tr.circuitos || []).forEach((c)=>{
          if (c.tiempoDefectoTierraS === undefined) c.tiempoDefectoTierraS = null;
        });
      });
      cambio = true;
    }

    // v12: PE, continuidad y equipotencialidad. Ningún ensayo antiguo se presume realizado.
    if (versionAnterior < 12) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.proteccionGeneral || typeof tr.proteccionGeneral !== 'object') tr.proteccionGeneral = { diferencialSensibilidad:30 };
        const pg=tr.proteccionGeneral;
        if (pg.equipotencialPrincipalAplica === undefined) pg.equipotencialPrincipalAplica='pendiente';
        if (pg.equipotencialPrincipalSeccion === undefined) pg.equipotencialPrincipalSeccion=null;
        if (pg.equipotencialPrincipalContinuidad === undefined) pg.equipotencialPrincipalContinuidad='pendiente';
        if (pg.equipotencialSuplementariaAplica === undefined) pg.equipotencialSuplementariaAplica='no';
        if (pg.equipotencialSuplementariaSeccion === undefined) pg.equipotencialSuplementariaSeccion=null;
        if (pg.equipotencialSuplementariaContinuidad === undefined) pg.equipotencialSuplementariaContinuidad='pendiente';
        if (pg.equipotencialSuplementariaProtegida === undefined) pg.equipotencialSuplementariaProtegida=true;
        (tr.circuitos||[]).forEach((c)=>{
          if (c.peSeccion === undefined) c.peSeccion=null;
          if (c.peSeparado === undefined) c.peSeparado=false;
          if (c.peProteccionMecanica === undefined) c.peProteccionMecanica=true;
          if (c.continuidadPe === undefined) c.continuidadPe='pendiente';
          if (c.resistenciaContinuidadPeOhm === undefined) c.resistenciaContinuidadPeOhm=null;
        });
      });
      cambio=true;
    }

    // v13: protocolo de puesta en servicio. No se inventan mediciones ni ensayos.
    if (versionAnterior < 13) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.proteccionGeneral || typeof tr.proteccionGeneral !== 'object') tr.proteccionGeneral={diferencialSensibilidad:30};
        const pg=tr.proteccionGeneral;
        if (pg.ensayoRcdGeneral === undefined) pg.ensayoRcdGeneral='pendiente';
        if (pg.ensayoFuncionalProtecciones === undefined) pg.ensayoFuncionalProtecciones='pendiente';
        if (!tr.protocoloEnsayos || typeof tr.protocoloEnsayos !== 'object') tr.protocoloEnsayos={fecha:'',tecnico:'',instrumento:'',serie:'',calibracion:'pendiente'};
        (tr.circuitos||[]).forEach((c)=>{
          if (c.aislamientoEnsayoV === undefined) c.aislamientoEnsayoV=null;
          if (c.aislamientoMohm === undefined) c.aislamientoMohm=null;
          if (c.polaridad === undefined) c.polaridad='pendiente';
          if (c.secuenciaFases === undefined) c.secuenciaFases='pendiente';
          if (c.ensayoRcd === undefined) c.ensayoRcd='pendiente';
          if (c.tiempoRcdS === undefined) c.tiempoRcdS=null;
          if (c.impedanciaLazoTierraOhm === undefined) c.impedanciaLazoTierraOhm=null;
        });
      });
      cambio=true;
    }

    // v14: cierre profesional. Los datos de firma/anexos no se inventan y el
    // estado definitivo siempre se recalcula a partir de las verificaciones reales.
    if (versionAnterior < 14) {
      data.trabajos.forEach((tr) => {
        if (!tr || typeof tr !== 'object') return;
        if (!tr.cierreProfesional || typeof tr.cierreProfesional !== 'object') {
          tr.cierreProfesional = { responsableNombre:'', categoriaUTE:'', fecha:'', declaracion:'pendiente', firmaDataUrl:'', fotos:[] };
        }
        if (!Array.isArray(tr.cierreProfesional.fotos)) tr.cierreProfesional.fotos = [];
      });
      cambio = true;
    }

    if (data.schemaVersion !== DB_SCHEMA_VERSION) { data.schemaVersion = DB_SCHEMA_VERSION; cambio = true; }
    return { db: data, cambio };
  }

  let DB;
  let esquemaMigrado = false;
  try {
    const migracion = migrarEsquemaDB(JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultDB());
    DB = migracion.db;
    esquemaMigrado = migracion.cambio;
  } catch (e) {
    DB = defaultDB();
    esquemaMigrado = true;
  }
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
  // Precios que en su momento salieron sin relevar —en $0 o estimados— y que
  // después se relevaron. Se actualizan sólo si el catálogo guardado todavía
  // tiene el valor viejo: si el técnico lo corrigió a mano, manda lo suyo.
  PRECIOS_RELEVADOS.forEach((r) => {
    const destino = r.medida === undefined ? DB.settings.precios : DB.settings.precios[r.clave];
    const clave = r.medida === undefined ? r.clave : r.medida;
    if (destino && destino[clave] === r.viejo) {
      destino[clave] = r.nuevo;
      clavesAgregadas = true;
    }
  });
  // Los precios que van por medida —caño por diámetro, bandeja por ancho— son
  // objetos, y la lista de arriba sólo alcanza a los sueltos. Acá se completan
  // los que siguen en $0, que es como salieron cuando no estaban relevados, y
  // las medidas que se agregaron después. Un valor ya cargado no se toca.
  Object.keys(DEFAULT_PRECIOS).forEach((k) => {
    const def = DEFAULT_PRECIOS[k], guardado = DB.settings.precios[k];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return;
    if (!guardado || typeof guardado !== 'object') return;
    Object.keys(def).forEach((medida) => {
      if ((guardado[medida] === 0 || guardado[medida] === undefined) && def[medida] !== 0) {
        guardado[medida] = def[medida];
        clavesAgregadas = true;
      }
    });
  });

  // Materiales que se sacaron de la lista dejan su precio dando vueltas en el
  // catálogo guardado. No molestan, pero si algún día se vuelve a usar ese
  // nombre reaparecería un valor viejo: se limpian.
  Object.keys(DB.settings.precios).forEach((k) => {
    if (!(k in DEFAULT_PRECIOS)) {
      delete DB.settings.precios[k];
      clavesAgregadas = true;
      return;
    }
    // lo mismo con las medidas que se dejaron de usar, como la bandeja de 250
    const def = DEFAULT_PRECIOS[k], guardado = DB.settings.precios[k];
    if (!def || typeof def !== 'object' || Array.isArray(def)) return;
    if (!guardado || typeof guardado !== 'object') return;
    Object.keys(guardado).forEach((medida) => {
      if (!(medida in def)) { delete guardado[medida]; clavesAgregadas = true; }
    });
  });
  if (!DB.settings.dolar) { DB.settings.dolar = { ...DEFAULT_DOLAR }; clavesAgregadas = true; }
  if (!DB.settings.preciosRevisados) { DB.settings.preciosRevisados = Date.now(); clavesAgregadas = true; }
  if (!DB.settings.manoObra) DB.settings.manoObra = { ...DEFAULT_MANO_OBRA };
  Object.keys(DEFAULT_MANO_OBRA).forEach((k) => {
    if (DB.settings.manoObra[k] === undefined) { DB.settings.manoObra[k] = DEFAULT_MANO_OBRA[k]; clavesAgregadas = true; }
  });
  if (!DB.seq) DB.seq = { trabajo: 0, presupuesto: 0 };

  // Las primeras versiones de la app armaban la lista de materiales sin
  // precio, y el catálogo llegó después: esos relevamientos quedaron guardados
  // con todo en $0 aunque el catálogo ya tenga precio. Se cotizan de nuevo los
  // materiales automáticos que no tienen precio, buscándolos por nombre en la
  // lista que armaría hoy el cálculo. Las cantidades y lo cargado a mano no se
  // tocan.
  function cotizarMaterialesSinPrecio(trabajo) {
    if (!trabajo || !Array.isArray(trabajo.materiales) || !trabajo.materiales.length) return false;
    const sinPrecio = trabajo.materiales.filter((m) => m.auto !== false && !(Number(m.precioUnit) > 0));
    if (!sinPrecio.length) return false;
    let referencia;
    try { referencia = generarMateriales(trabajo.circuitos || [], trabajo); } catch (e) { return false; }
    const precioPorNombre = {};
    referencia.forEach((m) => { if (m.precioUnit > 0) precioPorNombre[m.nombre] = m.precioUnit; });
    let cambio = false;
    sinPrecio.forEach((m) => {
      if (precioPorNombre[m.nombre]) { m.precioUnit = precioPorNombre[m.nombre]; cambio = true; }
    });
    return cambio;
  }

  // El total de materiales de un presupuesto sale de su relevamiento. Mientras
  // no esté aprobado, se mantiene al día: si se corrige el relevamiento, el
  // presupuesto lo acompaña. Uno aprobado ya se le pasó al cliente y no cambia.
  function costoMaterialesTrabajo(trabajo) {
    return (trabajo.materiales || []).reduce((t, m) => t + (Number(m.cantidad) || 0) * (Number(m.precioUnit) || 0), 0);
  }
  function sincronizarPresupuestos(trabajoId) {
    let cambio = false;
    DB.presupuestos.forEach((pr) => {
      if (!pr.trabajoId || pr.estado === 'aprobado') return;
      if (trabajoId && pr.trabajoId !== trabajoId) return;
      const tr = DB.trabajos.find((x) => x.id === pr.trabajoId);
      if (!tr || !(tr.materiales || []).length) return;
      const costo = costoMaterialesTrabajo(tr);
      if (costo !== pr.materiales) { pr.materiales = costo; cambio = true; }
    });
    return cambio;
  }

  // Si el navegador no deja guardar (memoria llena, modo privado), se avisa:
  // antes fallaba en silencio y los cambios se perdían al cerrar.
  function mostrarEstadoPersistencia(mensaje) {
    const aviso = document.getElementById('storage-alert');
    if (!aviso) return;
    if (!mensaje) {
      aviso.hidden = true;
      aviso.textContent = '';
      return;
    }
    aviso.textContent = mensaje;
    aviso.hidden = false;
  }

  function saveDB() {
    try {
      DB.schemaVersion = DB_SCHEMA_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
      mostrarEstadoPersistencia('');
      return true;
    } catch (e) {
      console.error('No se pudieron guardar los datos:', e);
      const mensaje = 'No se pudieron guardar los cambios en este dispositivo. Exportá una copia de seguridad antes de cerrar la app.';
      mostrarEstadoPersistencia(mensaje);
      if (typeof toast === 'function' && document.getElementById('toast')) toast(mensaje);
      return false;
    }
  }
  // La conversión de medidas se guarda enseguida; si no, se repetiría en cada
  // arranque y el catálogo en pantalla no coincidiría con el del disco.
  DB.trabajos.forEach((tr) => { if (cotizarMaterialesSinPrecio(tr)) clavesAgregadas = true; });
  if (sincronizarPresupuestos()) clavesAgregadas = true;
  if (esquemaMigrado || medidasConvertidas || clavesAgregadas) saveDB();

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
      proteccionGeneral: { diferencialSensibilidad: 30, ambienteTierra: 'seco', resistenciaTierraOhm: null, diferencialExiste: 'desconocido', termicaExistenteA: null, diferencialExistenteA: null, sobretensionesRiesgo: 'pendiente', pararrayosLps: 'desconocido', spdExiste: 'desconocido', spdTipo: '', diferencialSelectividad: 'instantaneo', equipotencialPrincipalAplica: 'pendiente', equipotencialPrincipalSeccion: null, equipotencialPrincipalContinuidad: 'pendiente', equipotencialSuplementariaAplica: 'no', equipotencialSuplementariaSeccion: null, equipotencialSuplementariaContinuidad: 'pendiente', equipotencialSuplementariaProtegida: true, ensayoRcdGeneral: 'pendiente', ensayoFuncionalProtecciones: 'pendiente' },
      protocoloEnsayos: { fecha:'', tecnico:'', instrumento:'', serie:'', calibracion:'pendiente' },
      cierreProfesional: { responsableNombre:'', categoriaUTE:'', fecha:'', declaracion:'pendiente', firmaDataUrl:'', fotos:[] },
      cargas, circuitos, materiales, estado: 'revision', observaciones: 'Se verificó caída de tensión y protección según normas vigentes. Pendiente confirmación de tableros.',
      createdAt: now - 3 * 3600e3, updatedAt: now - 3600e3,
    };
    DB.trabajos.push(trabajo);
    const costoMateriales = materiales.reduce((s, m) => s + m.cantidad * m.precioUnit, 0);
    const plazoEjemplo = estimarPlazo(trabajo).dias;
    const presupuesto = {
      id: 'P' + (++DB.seq.presupuesto), codigo: 'AE-' + new Date().getFullYear() + '-0001', trabajoId: trabajo.id,
      clienteNombre: 'Empresa Delta (ejemplo)', materiales: costoMateriales, manoObra: calcularManoObra(plazoEjemplo),
      traslados: 4500, otros: 3000,
      margen: 30, iva: 22, validez: 15, formaPago: '50% anticipo / 50% final', plazo: plazoEjemplo, estado: 'borrador',
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

  // Un presupuesto vale mientras corre su validez. Se cuenta desde que se creó,
  // que es cuando se le pasa al cliente. Los aprobados ya se cerraron y los
  // borradores todavía no salieron: no vencen.
  const DIA_MS = 24 * 3600e3;
  function vencimientoDe(p) {
    if (!p || p.estado === 'aprobado' || p.estado === 'borrador') return null;
    const validez = Number(p.validez) || 0;
    if (!validez) return null;
    const vence = (p.createdAt || Date.now()) + validez * DIA_MS;
    const dias = Math.ceil((vence - Date.now()) / DIA_MS);
    return { vence, dias, vencido: dias < 0 };
  }
  function textoVencimiento(v) {
    if (!v) return '';
    if (v.vencido) return 'Venció hace ' + Math.abs(v.dias) + (Math.abs(v.dias) === 1 ? ' día' : ' días');
    if (v.dias === 0) return 'Vence hoy';
    return 'Vence en ' + v.dias + (v.dias === 1 ? ' día' : ' días');
  }

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

    // Ofertas que se están por caer: si nadie las mira, se vencen solas.
    const avisos = $('#home-avisos');
    avisos.innerHTML = '';
    const porVencer = DB.presupuestos
      .map((p) => ({ p, v: vencimientoDe(p) }))
      .filter((x) => x.v && x.v.dias <= 3)
      .sort((a, b) => a.v.dias - b.v.dias);
    if (porVencer.length) {
      const card = el('div', { class: 'card card-pad stack-sm' });
      card.innerHTML = '<div class="section-label" style="margin:0">Ofertas por vencer</div>';
      porVencer.slice(0, 4).forEach(({ p, v }) => {
        const row = el('div', { class: 'activity-row', style: 'cursor:pointer' });
        row.innerHTML = '<span class="ic">' + icon('ic-clock') + '</span>' +
          '<div class="body"><div class="title">' + escapeHtml(p.codigo + ' · ' + (p.clienteNombre || 'Sin cliente')) + '</div>' +
          '<div class="meta" style="color:' + (v.vencido ? 'var(--error)' : 'inherit') + '">' + textoVencimiento(v) + '</div></div>';
        row.addEventListener('click', () => openPresupuesto(p.id));
        card.appendChild(row);
      });
      avisos.appendChild(card);
    }

    // El estado de copia de seguridad se muestra en Perfil, no en Inicio.
    // Así el dashboard reserva este espacio para actividad reciente y avisos operativos.

    const dias = diasDesde(DB.settings.preciosRevisados);
    if (dias !== null && dias >= DIAS_PRECIOS_VIEJOS) {
      const card = el('div', { class: 'card card-pad', style: 'cursor:pointer' });
      card.innerHTML = '<div class="activity-row"><span class="ic">' + icon('ic-cable') + '</span>' +
        '<div class="body"><div class="title">Precios sin revisar</div>' +
        '<div class="meta">Hace ' + dias + ' días que no se tocan. Revisalos antes de presupuestar.</div></div></div>';
      card.addEventListener('click', () => { showView('catalogo-precios'); renderCatalogoPrecios(); });
      avisos.appendChild(card);
    }

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
      acometida: { ...ACOMETIDA_DEFECTO },
      sistemaId: 'tri_tt', factores: { iluminacion: 1.0, tomacorrientes: 0.66, cargaFija: 0.8 },
      proteccionGeneral: { diferencialSensibilidad: 30, ambienteTierra: 'seco', resistenciaTierraOhm: null, diferencialExiste: 'desconocido', termicaExistenteA: null, diferencialExistenteA: null, sobretensionesRiesgo: 'pendiente', pararrayosLps: 'desconocido', spdExiste: 'desconocido', spdTipo: '', diferencialSelectividad: 'instantaneo', equipotencialPrincipalAplica: 'pendiente', equipotencialPrincipalSeccion: null, equipotencialPrincipalContinuidad: 'pendiente', equipotencialSuplementariaAplica: 'no', equipotencialSuplementariaSeccion: null, equipotencialSuplementariaContinuidad: 'pendiente', equipotencialSuplementariaProtegida: true, ensayoRcdGeneral: 'pendiente', ensayoFuncionalProtecciones: 'pendiente' },
      protocoloEnsayos: { fecha:'', tecnico:'', instrumento:'', serie:'', calibracion:'pendiente' },
      cierreProfesional: { responsableNombre:'', categoriaUTE:'', fecha:'', declaracion:'pendiente', firmaDataUrl:'', fotos:[] },
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
    if (cotizarMaterialesSinPrecio(t)) { sincronizarPresupuestos(t.id); saveDB(); }
    draft = JSON.parse(JSON.stringify(t));
    if (!draft.proteccionGeneral) draft.proteccionGeneral = { diferencialSensibilidad: 30, ambienteTierra: 'seco', resistenciaTierraOhm: null, diferencialExiste: 'desconocido', termicaExistenteA: null, diferencialExistenteA: null, sobretensionesRiesgo: 'pendiente', pararrayosLps: 'desconocido', spdExiste: 'desconocido', spdTipo: '' };
    if (!draft.cierreProfesional || typeof draft.cierreProfesional !== 'object') draft.cierreProfesional = { responsableNombre:'', categoriaUTE:'', fecha:'', declaracion:'pendiente', firmaDataUrl:'', fotos:[] };
    if (!Array.isArray(draft.cierreProfesional.fotos)) draft.cierreProfesional.fotos = [];
    if (!draft.proteccionGeneral.ambienteTierra) draft.proteccionGeneral.ambienteTierra = 'seco';
    if (draft.proteccionGeneral.resistenciaTierraOhm === undefined) draft.proteccionGeneral.resistenciaTierraOhm = null;
    if (!draft.proteccionGeneral.diferencialExiste) draft.proteccionGeneral.diferencialExiste = 'desconocido';
    if (draft.proteccionGeneral.termicaExistenteA === undefined) draft.proteccionGeneral.termicaExistenteA = null;
    if (draft.proteccionGeneral.diferencialExistenteA === undefined) draft.proteccionGeneral.diferencialExistenteA = null;
    if (!draft.proteccionGeneral.sobretensionesRiesgo) draft.proteccionGeneral.sobretensionesRiesgo = 'pendiente';
    if (!draft.proteccionGeneral.pararrayosLps) draft.proteccionGeneral.pararrayosLps = 'desconocido';
    if (!draft.proteccionGeneral.spdExiste) draft.proteccionGeneral.spdExiste = 'desconocido';
    if (draft.proteccionGeneral.spdTipo === undefined) draft.proteccionGeneral.spdTipo = '';
    if (draft.proteccionGeneral.equipotencialPrincipalAplica === undefined) draft.proteccionGeneral.equipotencialPrincipalAplica = 'pendiente';
    if (draft.proteccionGeneral.equipotencialPrincipalSeccion === undefined) draft.proteccionGeneral.equipotencialPrincipalSeccion = null;
    if (draft.proteccionGeneral.equipotencialPrincipalContinuidad === undefined) draft.proteccionGeneral.equipotencialPrincipalContinuidad = 'pendiente';
    if (draft.proteccionGeneral.equipotencialSuplementariaAplica === undefined) draft.proteccionGeneral.equipotencialSuplementariaAplica = 'no';
    if (draft.proteccionGeneral.equipotencialSuplementariaSeccion === undefined) draft.proteccionGeneral.equipotencialSuplementariaSeccion = null;
    if (draft.proteccionGeneral.equipotencialSuplementariaContinuidad === undefined) draft.proteccionGeneral.equipotencialSuplementariaContinuidad = 'pendiente';
    (draft.circuitos || []).forEach((c) => { if (c.resistividadTerreno === undefined) c.resistividadTerreno = c.metodo === 'enterrado' ? RESISTIVIDAD_TERRENO_UTE_DEFECTO : null; if (c.profundidadEnterrado === undefined) c.profundidadEnterrado = 0.5; if (!c.sistemaId) c.sistemaId = draft.sistemaId; if (c.iccMinFinalA === undefined) c.iccMinFinalA = null; if (c.zCortoFinalOhm === undefined) c.zCortoFinalOhm = null; if (c.tiempoDesconexionVerificadoS === undefined) c.tiempoDesconexionVerificadoS = null; if (c.peSeccion === undefined) c.peSeccion = null; if (c.peSeparado === undefined) c.peSeparado = false; if (c.peProteccionMecanica === undefined) c.peProteccionMecanica = true; if (c.continuidadPe === undefined) c.continuidadPe = 'pendiente'; if (c.resistenciaContinuidadPeOhm === undefined) c.resistenciaContinuidadPeOhm = null; if (c.aislamientoEnsayoV === undefined) c.aislamientoEnsayoV = null; if (c.aislamientoMohm === undefined) c.aislamientoMohm = null; if (c.polaridad === undefined) c.polaridad = 'pendiente'; if (c.secuenciaFases === undefined) c.secuenciaFases = 'pendiente'; if (c.ensayoRcd === undefined) c.ensayoRcd = 'pendiente'; if (c.tiempoRcdS === undefined) c.tiempoRcdS = null; if (c.impedanciaLazoTierraOhm === undefined) c.impedanciaLazoTierraOhm = null; });
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
    (draft.circuitos || []).forEach((c) => { if (c.resistividadTerreno === undefined) c.resistividadTerreno = c.metodo === 'enterrado' ? RESISTIVIDAD_TERRENO_UTE_DEFECTO : null; if (c.profundidadEnterrado === undefined) c.profundidadEnterrado = 0.5; if (!c.sistemaId) c.sistemaId = draft.sistemaId; if (c.iccMinFinalA === undefined) c.iccMinFinalA = null; if (c.zCortoFinalOhm === undefined) c.zCortoFinalOhm = null; if (c.tiempoDesconexionVerificadoS === undefined) c.tiempoDesconexionVerificadoS = null; if (c.peSeccion === undefined) c.peSeccion = null; if (c.peSeparado === undefined) c.peSeparado = false; if (c.peProteccionMecanica === undefined) c.peProteccionMecanica = true; if (c.continuidadPe === undefined) c.continuidadPe = 'pendiente'; if (c.resistenciaContinuidadPeOhm === undefined) c.resistenciaContinuidadPeOhm = null; if (c.aislamientoEnsayoV === undefined) c.aislamientoEnsayoV = null; if (c.aislamientoMohm === undefined) c.aislamientoMohm = null; if (c.polaridad === undefined) c.polaridad = 'pendiente'; if (c.secuenciaFases === undefined) c.secuenciaFases = 'pendiente'; if (c.ensayoRcd === undefined) c.ensayoRcd = 'pendiente'; if (c.tiempoRcdS === undefined) c.tiempoRcdS = null; if (c.impedanciaLazoTierraOhm === undefined) c.impedanciaLazoTierraOhm = null; });
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
      const sistema = SISTEMAS[draft.sistemaId];
      const antes = JSON.stringify(draft.circuitos);
      draft.circuitos = sincronizarCargasComoCircuitos(draft.cargas, sistema, draft.circuitos);
      if (JSON.stringify(draft.circuitos) !== antes && draft.materiales.length) draft.materialesDesactualizados = true;
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
              // los presets de motor o bomba arrastran su uso: la térmica va
              // con curva D por el pico de arranque
              if (p.uso) c.uso = p.uso; else delete c.uso;
              // y su electrónica, que define el tipo de diferencial
              if (p.equipo) c.equipo = p.equipo; else delete c.equipo;
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
      statBox('Suministro sugerido', r.suministroSugerido === null
        ? 'Fuera de los escalones cargados'
        : (sistema.fases === 1 ? 'Mono' : 'Trifásico') + ' · ' + fmt(r.suministroSugerido, 1) + ' kW', true);
    const pKw = r.pDemandTotal / 1000;
    $('#potencia-warning').textContent = r.fueraRango
      ? 'La demanda supera el mayor escalón de potencia cargado. No se asigna una potencia menor: requiere trámite y selección específicos.'
      : (pKw > 0 && pKw < r.minimoDiseno
        ? 'La potencia de cálculo está por debajo de la mínima que se puede solicitar (' + fmt(r.minimoDiseno, 1) + ' kW). UTE tiene escalones menores para destinos específicos: confirmá el caso.'
        : '');
    $('#btn-ir-circuitos').disabled = draft.cargas.length === 0;
  }

  function statBox(label, value, big) {
    return '<div class="stat-box"><div class="lbl">' + label + '</div><div class="val' + (big ? ' big' : '') + '">' + value + '</div></div>';
  }

  function proteccionGeneralHtml(pg) {
    if (pg.modo === 'existente') {
      return statBox('Térmica general existente', pg.termicaIn !== null ? pg.termicaIn + ' A' : 'Pendiente de relevar', true) +
        statBox('Diferencial general existente', pg.diferencialExiste === false ? 'No instalado' : (pg.diferencialExiste === true ? ((pg.diferencialIn || '—') + ' A · ' + pg.diferencialSensibilidad + ' mA · ' + textoTipoDiferencial(pg.diferencialTipo)) : 'Pendiente de confirmar'), true);
    }
    if (pg.termicaIn === null) return '<div class="alert-error">' + escapeHtml(pg.motivo) + '</div>';
    return statBox('Térmica general', pg.termicaIn + 'A · ' + pg.termicaPolos + 'p · curva ' + pg.termicaCurva + (pg.poderCorte ? ' · ' + textoPoderCorte(pg.poderCorte) : ''), true) +
      statBox('Diferencial general', pg.diferencialIn + 'A · ' + pg.diferencialSensibilidad + ' mA · ' + textoTipoDiferencial(pg.diferencialTipo), true);
  }
  function proteccionGeneralLightHtml(pg) {
    if (pg.modo === 'existente') {
      return '<div class="light-stat-row"><span class="lbl">Térmica general existente</span><span class="val strong">' + (pg.termicaIn !== null ? pg.termicaIn + ' A' : 'Pendiente') + '</span></div>' +
        '<div class="light-stat-row"><span class="lbl">Diferencial general existente</span><span class="val strong">' + (pg.diferencialExiste === false ? 'No instalado' : (pg.diferencialExiste === true ? ((pg.diferencialIn || '—') + ' A · ' + pg.diferencialSensibilidad + ' mA · ' + textoTipoDiferencial(pg.diferencialTipo)) : 'Pendiente')) + '</span></div>';
    }
    if (pg.termicaIn === null) return '<div class="alert-error">' + escapeHtml(pg.motivo) + '</div>';
    return '<div class="light-stat-row"><span class="lbl">Térmica general</span><span class="val strong">' + pg.termicaIn + 'A · ' + pg.termicaPolos + 'p · curva ' + pg.termicaCurva + (pg.poderCorte ? ' · ' + textoPoderCorte(pg.poderCorte) : '') + '</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Diferencial general</span><span class="val strong">' + pg.diferencialIn + 'A · ' + pg.diferencialSensibilidad + ' mA · ' + textoTipoDiferencial(pg.diferencialTipo) + '</span></div>';
  }
  function proteccionGeneralVerificacionHtml(v) {
    if (!v || !v.aplica) return '';
    const titulo = v.estado === 'cumple' ? 'Verificado' : (v.estado === 'pendiente' ? 'Pendiente' : 'No cumple');
    const clase = v.estado === 'cumple' ? 'alert-success' : (v.estado === 'pendiente' ? 'alert-warning' : 'alert-error');
    const partes = [];
    partes.push('<b>Protección general, tierra y sobretensiones: ' + titulo + '.</b>');
    if (v.resistenciaTierraOhm !== null) partes.push('R<sub>A</sub> = ' + fmt(v.resistenciaTierraOhm) + ' Ω; máximo por diferencial = ' + fmt(v.raMax) + ' Ω.');
    else partes.push('Falta la medición de R<sub>A</sub>; máximo por diferencial = ' + fmt(v.raMax) + ' Ω.');
    if (v.contactosIndirectos && v.contactosIndirectos.aplica) {
      partes.push('Esquema de protección contra contactos indirectos: <b>' + v.contactosIndirectos.esquema + '</b> · ' + (v.contactosIndirectos.estado === 'cumple' ? 'verificado' : (v.contactosIndirectos.estado === 'pendiente' ? 'pendiente' : 'no cumple')) + '.');
    }
    if (v.sobretensiones) {
      if (v.sobretensiones.requerido === true) partes.push('SPD requerido; propuesta: ' + escapeHtml(v.sobretensiones.tipoPropuesto) + '.');
      else if (v.sobretensiones.requerido === false) partes.push('SPD no requerido por la evaluación declarada de sobretensiones atmosféricas.');
      else partes.push('Evaluación de sobretensiones pendiente.');
    }
    v.causas.forEach((x) => partes.push(escapeHtml(x)));
    v.pendientes.forEach((x) => partes.push(escapeHtml(x)));
    return '<div class="' + clase + '" style="margin-top:10px">' + partes.join(' ') + '</div>';
  }


  // Ficha del alimentador: longitud, sección y la caída que arrastra.
  function renderAcometida() {
    if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
    const a = calcularAcometida(draft);
    $('#f-acom-l').value = draft.acometida.l;
    $('#f-acom-icc').value = Number(draft.acometida.iccKa) > 0 ? draft.acometida.iccKa : '';
    $('#f-acom-subestacion').value = draft.acometida.subestacion || 'auto';
    const kvaSel = $('#f-acom-kva');
    if (!kvaSel.options.length) {
      kvaSel.innerHTML = '<option value="">No lo sé (no calcular)</option>' +
        ANEXO_TABLA_A.kva.map((k) => '<option value="' + k + '">' + k + ' kVA</option>').join('');
      const secc = [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
      $('#f-acom-redsec').innerHTML = '<option value="">Elegir</option>' +
        secc.map((x) => '<option value="' + x + '">' + fmt(x, x < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²</option>').join('');
    }
    kvaSel.value = draft.acometida.trafoKva ? String(draft.acometida.trafoKva) : '';
    $('#f-acom-red').value = String(draft.acometida.red || redAnexoPorDefecto(draft));
    $('#f-acom-redl').value = Number(draft.acometida.redL) > 0 ? draft.acometida.redL : '';
    $('#f-acom-redsec').value = draft.acometida.redSeccion ? String(draft.acometida.redSeccion) : '';
    $('#f-acom-redmat').value = draft.acometida.redMaterial || 'aluminio';
    const sel = $('#f-acom-seccion');
    const secciones = tablaAmpacidad('conducto', 'cobre', 'pvc').map((x) => x.s);
    sel.innerHTML = '<option value="">La que calcula la app' + (a.seccion ? ' (' + fmt(a.seccion, a.seccion < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²)' : '') + '</option>' +
      secciones.map((x) => '<option value="' + x + '"' + (Number(draft.acometida.seccion) === x ? ' selected' : '') + '>' +
        fmt(x, x < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²</option>').join('');
    const selN = $('#f-acom-neutro');
    const selPe = $('#f-acom-pe');
    if (selN) {
      selN.disabled = !a.tieneNeutro;
      selN.innerHTML = !a.tieneNeutro ? '<option value="">No aplica (sistema sin neutro)</option>' :
        '<option value="">Automático = fase' + (a.neutroSeccion ? ' (' + fmt(a.neutroSeccion, a.neutroSeccion < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²)' : '') + '</option>' +
        secciones.map((x) => '<option value="' + x + '"' + (Number(draft.acometida.neutroSeccion) === x ? ' selected' : '') + '>' + fmt(x, x < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²</option>').join('');
    }
    if (selPe) selPe.innerHTML = '<option value="">Automático' + (a.peSeccion ? ' (' + fmt(a.peSeccion, a.peSeccion < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²)' : '') + '</option>' +
      secciones.map((x) => '<option value="' + x + '"' + (Number(draft.acometida.peSeccion) === x ? ' selected' : '') + '>' + fmt(x, x < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²</option>').join('');
    const limite = 3;
    $('#acom-resultado').innerHTML =
      '<div class="light-stat-row"><span class="lbl">Corriente de demanda / de diseño</span><span class="val strong">' + fmt(a.ib) + ' A · ' + fmt(a.ibDiseno) + ' A</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Sección del alimentador</span><span class="val strong">' + (a.seccion ? a.seccion + ' mm² Cu' : '—') + (a.automatica ? ' (calculada)' : ' (fijada)') + '</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Neutro</span><span class="val strong">' + (!a.tieneNeutro ? 'No aplica' : ((a.neutroSeccion ? a.neutroSeccion + ' mm² Cu' : 'Pendiente') + (a.neutroCorriente !== null ? ' · I<sub>N,fund</sub> ≈ ' + fmt(a.neutroCorriente) + ' A' : ''))) + '</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Conductor de protección (PE)</span><span class="val strong">' + (a.peSeccion ? a.peSeccion + ' mm² Cu' : 'Pendiente') + (a.peMin ? ' · mínimo adoptado ' + a.peMin + ' mm²' : '') + '</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Corriente admisible del enlace</span><span class="val strong">' + fmt(a.iz) + ' A</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Térmica general que coordina</span><span class="val strong" style="color:' + (a.termicaIn ? 'inherit' : 'var(--error)') + '">' +
        (a.termicaIn ? a.termicaIn + ' A (Ib ' + fmt(a.ibDiseno) + ' ≤ In ≤ Iz ' + fmt(a.iz) + ')' : 'ninguna coordina: subí la sección') + '</span></div>' +
      '<div class="light-stat-row"><span class="lbl">Caída del alimentador</span><span class="val strong" style="color:' + (a.dUPct > limite ? 'var(--error)' : 'inherit') + '">' +
        fmt(a.dU) + ' V · ' + fmt(a.dUPct) + ' %</span></div>' +
      (() => {
        const ctx = contextoCortocircuito(draft);
        const pc = poderCorteDe({ iccTableroKa: ctx.iccTableroKa, iccTableroOrigen: ctx.iccTableroOrigen, conSubestacion: ctx.conSubestacion, tipoProteccion: 'mcb' }, a.termicaIn);
        const txt = pc.fuente === 'real' ? fmt(pc.iccKa) + ' kA ' + (pc.origen === 'calculada' ? 'calculada' : 'informada') + ' → ' + textoPoderCorte(pc)
          : pc.fuente === 'plaza' ? fmt(pc.iccKa, 0) + ' kA de plaza → ' + textoPoderCorte(pc) + ', sin verificar'
          : 'subestación propia: cargá la Icc (Anexo Tabla A)';
        return '<div class="light-stat-row"><span class="lbl">Cortocircuito en el tablero</span><span class="val strong" style="color:' +
          (pc.fuente === 'subestacion' || pc.fueraDeGama ? 'var(--error)' : 'inherit') + '">' + escapeHtml(txt) + '</span></div>' +
          (ctx.anexo && Number(draft.acometida.iccKa) > 0
            ? '<div class="light-stat-row"><span class="lbl">Cálculo con el Anexo</span><span class="val">no se usa: manda la Icc cargada a mano</span></div>' : '') +
          (ctx.anexo && ctx.anexo.error
            ? '<div class="light-stat-row"><span class="lbl">Cálculo con el Anexo</span><span class="val" style="color:var(--error)">' + escapeHtml(ctx.anexo.error) + '</span></div>' : '') +
          (ctx.anexo && !ctx.anexo.error && !(Number(draft.acometida.iccKa) > 0)
            ? '<div class="light-stat-row" style="align-items:flex-start"><span class="lbl">Cálculo con el Anexo</span><span class="val" style="text-align:right;font-size:0.78rem">' +
              ctx.anexo.pasos.map(escapeHtml).join('<br>') + '</span></div>' : '');
      })() +
      '<div class="light-stat-row"><span class="lbl">Estado del alimentador</span><span class="val strong" style="color:' + (a.estado === 'cumple' ? 'inherit' : 'var(--error)') + '">' + (a.estado === 'cumple' ? 'Verificado' : (a.estado === 'pendiente' ? 'Pendiente' : 'No cumple')) + '</span></div>' +
      ((a.causas.length || a.pendientes.length) ? '<div class="alert-' + (a.causas.length ? 'error' : 'warning') + '" style="margin-top:8px">' + a.causas.concat(a.pendientes).map(escapeHtml).join(' ') + '</div>' : '') +
      '<div class="light-stat-row"><span class="lbl">Margen que queda para los circuitos</span><span class="val">' +
        fmt(Math.max(0, 3 - a.dUPct)) + ' % en iluminación · ' + fmt(Math.max(0, 5 - a.dUPct)) + ' % en el resto</span></div>';
  }

  // Fichas con los datos avanzados abiertos: se re-dibujan con cada cambio y
  // no tienen que cerrarse solas.
  const circuitosAbiertos = new Set();
  function tieneAvanzados(c) {
    return Boolean(c.expuestoSol || c.inProteccion || (c.tipoProteccion && c.tipoProteccion !== 'mcb') ||
      c.iccKa || c.poderCorteKa || c.icu60947Ka || c.i2tPasante || c.tiempoDespejeS || c.iccMinFinalA || c.zCortoFinalOhm || c.tiempoDesconexionVerificadoS || c.modoCargaVe || c.diferencialIndividualVe === 'si' || c.diferencialIndividualVe === 'no');
  }

  function renderCircuitosList() {
    renderAcometida();
    const caidaPrevia = caidaPreviaDe(draft);
    const ctxCorto = contextoCortocircuito(draft);
    const wrap = $('#circuitos-list');
    wrap.innerHTML = '';
    if (draft.circuitos.length === 0) {
      wrap.appendChild(el('div', { class: 'card card-pad empty-state', html: 'No hay circuitos todavía. Volvé a <b>Cargas</b> y continuá, o agregalos acá manualmente.' }));
    }
    draft.circuitos.forEach((c) => {
      const calc = calcularCircuito(c, caidaPrevia);
      const comp = calc.apto ? comprobarCircuito(datosCircuito(c, caidaPrevia, ctxCorto)) : null;
      const sistemaCircuito = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
      const faseHtml = sistemaCircuito.fases === 3 && c.fasesConfirmadas !== false && Number(c.fases) === 1
        ? '<div class="field"><label>' + (sistemaCircuito.id === 'tri_it' ? 'Par de conductores' : 'Fase asignada') + '</label><select class="select" data-f="faseAsignada">' +
          '<option value=""' + (!c.faseAsignada ? ' selected' : '') + '>Pendiente de asignar</option>' +
          opcionesFaseCircuito(sistemaCircuito).map((x) => '<option value="' + x.v + '"' + (c.faseAsignada === x.v ? ' selected' : '') + '>' + x.label + '</option>').join('') + '</select></div>'
        : '';
      const card = el('div', { class: 'card card-pad item-card', style: 'position:relative' });
      card.innerHTML =
        '<button class="remove-btn" type="button">' + icon('ic-trash') + '</button>' +
        (c.cargaDesvinculada ? '<div class="alert-warning" style="margin:0 30px 12px 0"><b>Circuito sin carga vinculada.</b> La carga original fue eliminada; revisalo o quitá este circuito manualmente.</div>' : '') +
        '<div class="item-grid" style="padding-right:30px">' +
        '<div class="field" style="grid-column:1/-1"><label>Nombre del circuito</label><input class="input" data-f="nombre" value="' + escapeHtml(c.nombre) + '"></div>' +
        '<div class="field"><label>Corriente Ib (A)</label><input class="input" type="number" data-f="ib" value="' + c.ib + '"></div>' +
        ((SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt).fases === 3
          ? '<div class="field"><label>Alimentación del circuito</label><select class="select" data-f="fasesCircuito">' +
            '<option value=""' + (c.fasesConfirmadas === false ? ' selected' : '') + '>Pendiente de confirmar</option>' +
            '<option value="1"' + (c.fasesConfirmadas !== false && Number(c.fases) === 1 ? ' selected' : '') + '>Monofásico · 230 V</option>' +
            '<option value="3"' + (c.fasesConfirmadas !== false && Number(c.fases) === 3 ? ' selected' : '') + '>Trifásico · ' + (SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt).v + ' V</option></select></div>'
          : '<div class="field"><label>Alimentación del circuito</label><div class="hint" style="margin:0">Monofásico · 230 V</div></div>') +
        faseHtml +
        '<div class="field"><label>Longitud (m)</label><input class="input" type="number" data-f="l" value="' + c.l + '"></div>' +
        '<div class="field"><label>Material</label><select class="select" data-f="material"><option value="cobre"' + (c.material === 'cobre' ? ' selected' : '') + '>Cobre</option><option value="aluminio"' + (c.material === 'aluminio' ? ' selected' : '') + '>Aluminio</option></select></div>' +
        '<div class="field"><label>Método</label><select class="select" data-f="metodo">' + Object.keys(METODO_LABEL).map((k) => '<option value="' + k + '"' + (c.metodo === k ? ' selected' : '') + '>' + METODO_LABEL[k] + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>' + (c.metodo === 'enterrado' ? 'Temp. terreno (°C)' : 'Temp. amb. (°C)') + '</label><input class="input" type="number" data-f="tempAmb" value="' + c.tempAmb + '"></div>' +
        (c.metodo === 'aire' && NORMATIVE_PACK.parametros.aireLibreSeparado
          ? '<div class="field"><label>Agrupamiento</label><div class="hint" style="margin:0">Sin reducción: al aire libre los circuitos van separados, nunca en contacto.</div></div>'
          : '<div class="field"><label>' + (c.metodo === 'bandeja' ? 'Circuitos en la bandeja' : 'Circuitos agrupados') + '</label><input class="input" type="number" min="1" data-f="agrupados" value="' + c.agrupados + '"></div>') +
        (pideMontaje(c.metodo)
          ? '<div class="field"><label>Montaje</label><select class="select" data-f="montaje">' +
            MONTAJES_AIRE.map((m) => '<option value="' + m.id + '"' + (montajeDe(c.metodo, c.montaje) === m.id ? ' selected' : '') + '>' + m.label + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label>Separación con el circuito vecino' + (calc.apto && umbralSeparacion(calc.seccionAdoptada) ? ' (2·De ≈ ' + umbralSeparacion(calc.seccionAdoptada) + ' mm)' : '') + '</label><select class="select" data-f="separados2De">' +
            '<option value="0"' + (!c.separados2De ? ' selected' : '') + '>En contacto o a menos de 2·De</option>' +
            '<option value="1"' + (c.separados2De ? ' selected' : '') + '>A más de 2·De (sin reducción)</option></select></div>'
          : '') +
        (c.metodo === 'enterrado'
          ? '<div class="field"><label>Caños y separación</label><select class="select" data-f="disposicion">' +
            DISPOSICIONES_ENTERRADO.map((d) => '<option value="' + d.id + '"' + (disposicionEnterrado(c.disposicion) === d.id ? ' selected' : '') + '>' + d.label + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label>Resistividad térmica terreno (K·m/W)</label><input class="input" type="number" min="0" step="0.1" data-f="resistividadTerreno" placeholder="UTE: 1,0 en condición normal" value="' + (Number(c.resistividadTerreno) || '') + '"></div>' +
            '<div class="field"><label>Profundidad del caño (m)</label><input class="input" type="number" min="0" step="0.05" data-f="profundidadEnterrado" value="' + (Number(c.profundidadEnterrado) || 0.5) + '"></div>'
          : '') +
        '<div class="field"><label>Polos</label><select class="select" data-f="polos">' +
        opcionesPolos(c).map((o) => '<option value="' + o.v + '"' + (polosDe(c) === o.v ? ' selected' : '') + '>' + o.label + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Uso</label><select class="select" data-f="uso">' +
        USOS.map((u) => '<option value="' + u.id + '"' + ((c.uso || 'fuerza') === u.id ? ' selected' : '') + '>' + u.label + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Electrónica del equipo</label><select class="select" data-f="equipo">' +
        EQUIPOS_CIRCUITO.map((e) => '<option value="' + e.id + '"' + ((c.equipo || 'comun') === e.id ? ' selected' : '') + '>' + e.label + '</option>').join('') +
        '</select></div>' +
        (c.equipo === 'cargador_ve'
          ? '<div class="field"><label>Modo de carga VE</label><select class="select" data-f="modoCargaVe">' +
            '<option value=""' + (!c.modoCargaVe ? ' selected' : '') + '>Pendiente de definir</option>' +
            ['1','2','3','4'].map((m) => '<option value="' + m + '"' + (String(c.modoCargaVe) === m ? ' selected' : '') + '>Modo ' + m + '</option>').join('') + '</select></div>' +
            '<div class="field"><label>Diferencial individual del punto (≤ 30 mA, omnipolar)</label><select class="select" data-f="diferencialIndividualVe">' +
            '<option value="desconocido"' + ((c.diferencialIndividualVe || 'desconocido') === 'desconocido' ? ' selected' : '') + '>Pendiente / no relevado</option>' +
            '<option value="si"' + (c.diferencialIndividualVe === 'si' ? ' selected' : '') + '>Sí / incluido en proyecto</option>' +
            '<option value="no"' + (c.diferencialIndividualVe === 'no' ? ' selected' : '') + '>No</option></select></div>' +
            '<div class="field"><label>¿Trae monitor de continua 6 mA (IEC 62955)?</label><select class="select" data-f="rdcdd6mA">' +
            '<option value="0"' + (!c.rdcdd6mA ? ' selected' : '') + '>No o no sé</option>' +
            '<option value="1"' + (c.rdcdd6mA ? ' selected' : '') + '>Sí</option></select></div>'
          : '') +
        '<div class="field"><label>Aislación</label><select class="select" data-f="aislacion">' +
        '<option value="pvc"' + ((c.aislacion || 'pvc') === 'pvc' ? ' selected' : '') + '>PVC</option>' +
        '<option value="xlpe"' + (c.aislacion === 'xlpe' ? ' selected' : '') + '>XLPE</option></select></div>' +
        '<div class="field"><label>Criterio de proyecto (%)</label><input class="input" type="number" step="0.5" min="0.1" data-f="caidaMax" value="' + c.caidaMax + '"></div>' +
        '<div class="field"><label>cos φ</label><input class="input" type="number" step="0.05" min="0" max="1" data-f="cosPhi" value="' + c.cosPhi + '"></div>' +
        '</div>' +
        // Los datos que casi nunca cambian van plegados, para que la ficha no
        // sea eterna en el celular.
        '<details class="avanzados" style="margin-top:12px"' + (circuitosAbiertos.has(c.id) ? ' open' : '') + '>' +
        '<summary class="section-label" style="margin:0">Datos avanzados' + (tieneAvanzados(c) ? ' · cargados' : '') + '</summary>' +
        '<div class="item-grid" style="margin-top:10px">' +
        '<div class="field"><label>Expuesto al sol</label><select class="select" data-f="expuestoSol">' +
        '<option value="0"' + (!c.expuestoSol ? ' selected' : '') + '>No</option><option value="1"' + (c.expuestoSol ? ' selected' : '') + '>Sí (x 0,90)</option></select></div>' +
        '<div class="field"><label>Protección (In)</label><select class="select" data-f="inProteccion">' +
        '<option value="">La que calcula la app</option>' +
        BREAKER_RATINGS.map((b) => '<option value="' + b + '"' + (Number(c.inProteccion) === b ? ' selected' : '') + '>' + b + ' A</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Tipo de protección</label><select class="select" data-f="tipoProteccion">' +
        '<option value="mcb"' + ((c.tipoProteccion || 'mcb') === 'mcb' ? ' selected' : '') + '>Termomagnético IEC 60898</option>' +
        '<option value="otro"' + (c.tipoProteccion === 'otro' ? ' selected' : '') + '>Caja moldeada, fusible u otro (Icu propio)</option></select></div>' +
        ((c.tipoProteccion || 'mcb') === 'otro'
          ? '<div class="field"><label>I₂ del fabricante (A)</label><input class="input" type="number" step="0.1" min="0" data-f="i2" value="' + (Number(c.i2) || '') + '"></div>'
          : '') +
        '<div class="field"><label>Curva termomagnética</label><select class="select" data-f="curvaProteccion"><option value=""' + (!c.curvaProteccion ? ' selected' : '') + '>Automática según uso</option>' + ['B','C','D'].map((x)=>'<option value="'+x+'"'+(c.curvaProteccion===x?' selected':'')+'>Curva '+x+'</option>').join('') + '</select></div>' +
        '<div class="field"><label>Selectividad con térmica general</label><select class="select" data-f="selectividadFabricante"><option value="pendiente"'+((c.selectividadFabricante||'pendiente')==='pendiente'?' selected':'')+'>Pendiente / sin tabla fabricante</option><option value="total"'+(c.selectividadFabricante==='total'?' selected':'')+'>Total según fabricante</option><option value="parcial"'+(c.selectividadFabricante==='parcial'?' selected':'')+'>Parcial según fabricante</option><option value="no"'+(c.selectividadFabricante==='no'?' selected':'')+'>No selectiva</option></select></div>' +
        (c.selectividadFabricante==='parcial' ? '<div class="field"><label>Límite de selectividad Is (kA)</label><input class="input" type="number" step="0.1" min="0" data-f="selectividadLimiteKa" value="'+(Number(c.selectividadLimiteKa)||'')+'"></div>' : '') +
        '<div class="field"><label>Icc máxima en el circuito (kA)</label><input class="input" type="number" step="0.1" min="0" data-f="iccKa" placeholder="La del tablero" value="' + (Number(c.iccKa) || '') + '"></div>' +
        '<div class="field"><label>Sección PE del circuito (mm²)</label><input class="input" type="number" step="0.5" min="0" data-f="peSeccion" placeholder="Automático IEC" value="' + (Number(c.peSeccion) || '') + '"><div class="hint">Vacío = mínimo automático IEC 60364-5-54 según la sección de fase.</div></div>' +
        '<div class="field"><label>Disposición del PE</label><select class="select" data-f="peSeparado"><option value="0"' + (!c.peSeparado ? ' selected' : '') + '>Misma canalización / cable</option><option value="1"' + (c.peSeparado ? ' selected' : '') + '>PE separado</option></select></div>' +
        (c.peSeparado ? '<div class="field"><label>Protección mecánica del PE separado</label><select class="select" data-f="peProteccionMecanica"><option value="1"' + (c.peProteccionMecanica !== false ? ' selected' : '') + '>Sí</option><option value="0"' + (c.peProteccionMecanica === false ? ' selected' : '') + '>No</option></select></div>' : '') +
        '<div class="field"><label>Ensayo de continuidad PE</label><select class="select" data-f="continuidadPe"><option value="pendiente"' + ((c.continuidadPe||'pendiente')==='pendiente'?' selected':'') + '>Pendiente</option><option value="si"' + (c.continuidadPe==='si'?' selected':'') + '>Continuidad verificada</option><option value="no"' + (c.continuidadPe==='no'?' selected':'') + '>No continuo / falla</option></select></div>' +
        '<div class="field"><label>Resistencia continuidad PE (Ω, opcional)</label><input class="input" type="number" step="0.001" min="0" data-f="resistenciaContinuidadPeOhm" placeholder="Valor medido" value="' + (c.resistenciaContinuidadPeOhm !== null && c.resistenciaContinuidadPeOhm !== undefined ? c.resistenciaContinuidadPeOhm : '') + '"></div>' +
        '<div class="field"><label>Tensión ensayo aislamiento (Vcc)</label><select class="select" data-f="aislamientoEnsayoV"><option value=""' + (!c.aislamientoEnsayoV?' selected':'') + '>Pendiente</option><option value="250"' + (Number(c.aislamientoEnsayoV)===250?' selected':'') + '>250 Vcc · sólo SPD/electrónica sensible</option><option value="500"' + (Number(c.aislamientoEnsayoV)===500?' selected':'') + '>500 Vcc</option><option value="1000"' + (Number(c.aislamientoEnsayoV)===1000?' selected':'') + '>1000 Vcc</option></select></div>' +
        '<div class="field"><label>Resistencia de aislamiento (MΩ)</label><input class="input" type="number" step="0.01" min="0" data-f="aislamientoMohm" placeholder="Medición" value="' + (Number(c.aislamientoMohm)>0?c.aislamientoMohm:'') + '"><div class="hint">IEC 60364-6: hasta 500 V, mínimo 1 MΩ; ensayo normal a 500 Vcc.</div></div>' +
        '<div class="field"><label>Ensayo de polaridad</label><select class="select" data-f="polaridad"><option value="pendiente"'+((c.polaridad||'pendiente')==='pendiente'?' selected':'')+'>Pendiente</option><option value="si"'+(c.polaridad==='si'?' selected':'')+'>Correcta</option><option value="no"'+(c.polaridad==='no'?' selected':'')+'>Incorrecta</option></select></div>' +
        '<div class="field"><label>Secuencia de fases</label><select class="select" data-f="secuenciaFases"><option value="pendiente"'+((c.secuenciaFases||'pendiente')==='pendiente'?' selected':'')+'>Pendiente / no aplica</option><option value="si"'+(c.secuenciaFases==='si'?' selected':'')+'>Correcta</option><option value="no"'+(c.secuenciaFases==='no'?' selected':'')+'>Incorrecta</option></select></div>' +
        '<div class="field"><label>Ensayo RCD dedicado</label><select class="select" data-f="ensayoRcd"><option value="pendiente"'+((c.ensayoRcd||'pendiente')==='pendiente'?' selected':'')+'>Pendiente / no aplica</option><option value="si"'+(c.ensayoRcd==='si'?' selected':'')+'>Satisfactorio</option><option value="no"'+(c.ensayoRcd==='no'?' selected':'')+'>No satisfactorio</option></select></div>' +
        '<div class="field"><label>Tiempo RCD dedicado (s)</label><input class="input" type="number" step="0.001" min="0" data-f="tiempoRcdS" placeholder="Si aplica" value="' + (Number(c.tiempoRcdS)>0?c.tiempoRcdS:'') + '"></div>' +
        '<div class="field"><label>Impedancia lazo de defecto a tierra (Ω)</label><input class="input" type="number" step="0.001" min="0" data-f="impedanciaLazoTierraOhm" placeholder="Cuando corresponda" value="' + (Number(c.impedanciaLazoTierraOhm)>0?c.impedanciaLazoTierraOhm:'') + '"><div class="hint">Registro de ensayo cuando el esquema/método de verificación lo requiere; no se confunde con Z de cortocircuito L-N/L-L.</div></div>' +
        '<div class="field"><label>Icc mínima al final (A)</label><input class="input" type="number" step="1" min="0" data-f="iccMinFinalA" placeholder="Medida o calculada" value="' + (Number(c.iccMinFinalA) || '') + '"><div class="hint">Sirve para comprobar si la curva B/C/D entra en zona magnética.</div></div>' +
        '<div class="field"><label>Impedancia de lazo de cortocircuito al final (Ω)</label><input class="input" type="number" step="0.001" min="0" data-f="zCortoFinalOhm" placeholder="Alternativa a Icc mínima" value="' + (Number(c.zCortoFinalOhm) || '') + '"><div class="hint">Si se carga, la app usa Icc = U/Z. La Icc manual prevalece.</div></div>' +
        '<div class="field"><label>Tiempo de actuación a Ik,min (s)</label><input class="input" type="number" step="0.001" min="0" data-f="tiempoDesconexionVerificadoS" placeholder="Curva fabricante / ensayo" value="' + (Number(c.tiempoDesconexionVerificadoS) || '') + '"><div class="hint">Sólo hace falta si Ik,min no garantiza la zona magnética o si se quiere documentar el tiempo real.</div></div>' +
        '<div class="field"><label>Tiempo por defecto a tierra / segundo defecto (s)</label><input class="input" type="number" step="0.001" min="0" data-f="tiempoDefectoTierraS" placeholder="Ensayo RCD o verificación de protección" value="' + (Number(c.tiempoDefectoTierraS) || '') + '"><div class="hint">TT: puede heredarse del ensayo del diferencial general. IT: documentar por circuito el despeje del segundo defecto.</div></div>' +
        ((c.tipoProteccion || 'mcb') === 'mcb'
          ? '<div class="field"><label>Icn IEC 60898-1 (kA)</label><input class="input" type="number" step="0.5" min="0" data-f="poderCorteKa" placeholder="Según la gama" value="' + (Number(c.poderCorteKa) || '') + '"></div>' +
            '<div class="field"><label>Icu IEC 60947-2 (kA, sólo ficha)</label><input class="input" type="number" step="0.5" min="0" data-f="icu60947Ka" value="' + (Number(c.icu60947Ka) || '') + '"></div>'
          : '<div class="field"><label>Icu IEC 60947-2 (kA)</label><input class="input" type="number" step="0.5" min="0" data-f="poderCorteKa" value="' + (Number(c.poderCorteKa) || '') + '"></div>') +
        ((c.tipoProteccion || 'mcb') === 'mcb'
          ? '<div class="field"><label>Energía pasante I²t (A²s)</label><input class="input" type="number" step="100" min="0" data-f="i2tPasante" value="' + (Number(c.i2tPasante) || '') + '"></div>'
          : '<div class="field"><label>Tiempo de despeje (s)</label><input class="input" type="number" step="0.01" min="0" data-f="tiempoDespejeS" value="' + (Number(c.tiempoDespejeS) || '') + '"></div>') +
        '</div></details>' +
        '<div style="margin-top:16px">' + (calc.apto
          ? '<div class="panel-dark card-pad" style="display:flex;flex-wrap:wrap;gap:20px">' +
            statBox('Sección', calc.seccionAdoptada + ' mm²', true) + statBox('Iz corregida', fmt(calc.iz) + ' A') +
            statBox('Caída del circuito', fmt(calc.dUPct) + ' %') +
            statBox('Caída desde el medidor', fmt(calc.dUPctTotal) + ' %', true) +
            statBox('Protección', calc.breaker + ' A · curva ' + calc.curva + ' ' + (comp && comp.poderCorteKa !== null ? ' · ' + fmt(comp.poderCorteKa, 0) + ' kA' + (comp.iccFuente === 'plaza' ? ' (plaza)' : '') : ''), true) + statBox('Curva sugerida', calc.curva) +
            statBox('Icc mín. final', comp && comp.iccMinFinalA !== null ? fmt(comp.iccMinFinalA,0) + ' A' + (comp.umbralMagneticoA ? ' / umbral ' + fmt(comp.umbralMagneticoA,0) + ' A' : '') : 'Pendiente') +
            statBox('Desconexión', comp && comp.cumpleTiempoDesconexion === true ? 'Verificada' : (comp && comp.cumpleTiempoDesconexion === false ? 'No cumple' : 'Pendiente')) +
            statBox('PE', comp && comp.pe ? fmt(comp.pe.seccion) + ' mm² · ' + (comp.pe.estado === 'cumple' ? 'continuidad OK' : (comp.pe.estado === 'no_cumple' ? 'No cumple' : 'Pendiente')) : 'Pendiente') +
            statBox('Diferencial', (() => {
              const d = diferencialDelCircuito(c);
              const pgC = calcularProteccionGeneral(draft);
              const tg = pgC.aplica ? tipoDiferencialGeneral(pgC) : TIPO_DIFERENCIAL_DEFECTO;
              if (pgC.modo === 'existente' && pgC.diferencialExiste === false) return 'General no instalado · pendiente de corrección';
              if (pgC.modo === 'existente' && pgC.diferencialExiste !== true) return 'General sin relevar · pendiente';
              return RANGO_DIFERENCIAL[d.tipo] > RANGO_DIFERENCIAL[tg] ? 'Dedicado tipo ' + d.tipo : 'General tipo ' + tg;
            })()) +
            statBox('Comprobación', comp.estado === 'cumple' ? 'Verificado' : (comp.estado === 'pendiente' ? 'Pendiente' : 'No cumple')) + '</div>' +
            (comp.causas.length || comp.pendientes.length
              ? '<ul style="margin:10px 0 0;padding-left:18px;font-size:0.8rem;color:var(--error)">' +
                comp.causas.concat(comp.pendientes).map((x) => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul>'
              : '')
          : '<div class="alert-error">' + escapeHtml(calc.error || 'Ninguna sección de la tabla cumple corriente admisible y caída de tensión. Revisá longitud, método o criterio de proyecto.') + '</div>') + '</div>';
      const detalles = card.querySelector('details.avanzados');
      detalles.addEventListener('toggle', () => {
        if (detalles.open) circuitosAbiertos.add(c.id); else circuitosAbiertos.delete(c.id);
      });
      card.querySelector('.remove-btn').addEventListener('click', () => { draft.circuitos = draft.circuitos.filter((x) => x.id !== c.id); renderCircuitosList(); });
      card.querySelectorAll('[data-f]').forEach((input) => {
        input.addEventListener('change', () => {
          const f = input.dataset.f;
          const esTexto = f === 'nombre' || f === 'material' || f === 'metodo' || f === 'uso' || f === 'aislacion' ||
            f === 'disposicion' || f === 'montaje' || f === 'tipoProteccion' || f === 'equipo' || f === 'modoCargaVe' || f === 'diferencialIndividualVe' || f === 'faseAsignada' || f === 'curvaProteccion' || f === 'selectividadFabricante' || f === 'continuidadPe' || f === 'polaridad' || f === 'secuenciaFases' || f === 'ensayoRcd';
          if (f === 'fasesCircuito') {
            const sistemaActual = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
            if (!input.value) {
              c.fases = 1; c.v = 230; c.fasesConfirmadas = false; c.fasesManual = false; c.faseAsignada = ''; c.faseManual = false; c.sistemaId = sistemaActual.id;
            } else {
              c.fases = Number(input.value); c.v = tensionDeCircuito(sistemaActual, c.fases); c.fasesConfirmadas = true; c.fasesManual = true; c.sistemaId = sistemaActual.id;
              if (c.fases === 3) { c.faseAsignada = ''; c.faseManual = false; }
              if (!c.ibManual && c.origenCarga && Number(c.origenCarga.ib) > 0) {
                c.ib = c.fases === 3 ? Math.round((c.origenCarga.ib * 230 / (SQRT3 * sistemaActual.v)) * 100) / 100 : c.origenCarga.ib;
              }
              if (!c.polosManual) c.polos = polosPorDefecto(c);
            }
          } else if (f === 'expuestoSol' || f === 'separados2De' || f === 'rdcdd6mA' || f === 'peSeparado' || f === 'peProteccionMecanica') c[f] = input.value === '1';
          // vacío = que decida la app
          else if (f === 'inProteccion' || f === 'i2' || f === 'iccKa' || f === 'poderCorteKa' || f === 'icu60947Ka' || f === 'i2tPasante' || f === 'tiempoDespejeS' || f === 'selectividadLimiteKa' || f === 'iccMinFinalA' || f === 'zCortoFinalOhm' || f === 'tiempoDesconexionVerificadoS' || f === 'tiempoDefectoTierraS' || f === 'peSeccion' || f === 'resistenciaContinuidadPeOhm' || f === 'aislamientoEnsayoV' || f === 'aislamientoMohm' || f === 'tiempoRcdS' || f === 'impedanciaLazoTierraOhm') {
            c[f] = Number(input.value) > 0 ? Number(input.value) : null;
          } else c[f] = esTexto ? input.value : Number(input.value);
          if (f === 'nombre') c.nombreManual = true;
          if (f === 'faseAsignada') c.faseManual = true;
          if (f === 'ib') c.ibManual = true;
          if (f === 'cosPhi') c.cosPhiManual = true;
          if (f === 'uso') c.usoManual = true;
          if (f === 'equipo') c.equipoManual = true;
          // Cada uso trae su propia caída máxima admisible: iluminación admite
          // menos que fuerza. Al cambiar el uso se acompaña el valor.
          if (f === 'uso') {
            c.caidaMax = CAIDA_MAX_DEFAULT[input.value] || 5;
            // iluminación suele ir unipolar y el resto bipolar: se acompaña el
            // valor mientras el técnico no lo haya fijado a mano
            if (!c.polosManual) c.polos = polosPorDefecto(c);
          }
          if (f === 'polos') c.polosManual = true;
          // al enterrar el caño se propone la temperatura de terreno (25 °C,
          // supuesto 1, UTE) en vez de la de aire (30 °C), y la resistividad
          // estándar de UTE (1,0 K·m/W) si el campo todavía no fue tocado
          if (f === 'metodo') {
            if (input.value === 'enterrado') {
              if (c.tempAmb === TEMP_AMBIENTE_DEFECTO) c.tempAmb = TEMP_TERRENO_ENTERRADO_DEFECTO;
              if (!(Number(c.resistividadTerreno) > 0)) c.resistividadTerreno = RESISTIVIDAD_TERRENO_UTE_DEFECTO;
            } else if (c.tempAmb === TEMP_TERRENO_ENTERRADO_DEFECTO) {
              c.tempAmb = TEMP_AMBIENTE_DEFECTO;
            }
          }
          renderCircuitosList();
        });
      });
      wrap.appendChild(card);
    });

    const tablaWrap = $('#circuitos-tabla-wrap');
    tablaWrap.hidden = draft.circuitos.length === 0;
    const tbody = $('#circuitos-tabla tbody');
    tbody.innerHTML = draft.circuitos.map((c) => {
      const calc = calcularCircuito(c, caidaPrevia);
      return '<tr><td>' + escapeHtml(c.nombre || '—') + '</td><td>' + fmt(c.ib) + '</td><td>' + (calc.apto ? calc.seccionAdoptada + ' mm²' : '—') + '</td>' +
        '<td>' + (calc.apto ? calc.breaker + 'A · ' + calc.curva : '—') + '</td>' +
        '<td style="color:' + (calc.apto && calc.dUPctTotal > calc.caidaMax ? 'var(--error)' : 'inherit') + '">' + (calc.apto ? fmt(calc.dUPctTotal) : '—') + '</td></tr>';
    }).join('');

    const balanceWrap = $('#circuitos-balance-fases');
    const sistemaBalance = SISTEMAS[draft.sistemaId] || SISTEMAS.tri_tt;
    const balance = calcularBalanceFases(draft);
    balanceWrap.hidden = sistemaBalance.fases !== 3 || draft.circuitos.length === 0;
    if (!balanceWrap.hidden) {
      const potSugerida = calcularPotencia(draft.cargas || [], sistemaBalance, draft.factores || {}).suministroSugerido;
      balanceWrap.innerHTML =
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
          '<div><div class="section-label" style="margin:0 0 4px">BALANCE DE FASES</div><div class="hint" style="margin:0">UTE RBT Cap. II §9 y Cap. V §1.4.6</div></div>' +
          '<button class="btn btn-secondary" type="button" id="btn-auto-balance">Distribuir automáticamente</button>' +
        '</div>' +
        '<div class="item-grid" style="margin-top:12px">' +
          '<div class="field"><label>Potencia contratada / proyectada (kW)</label><input class="input" id="f-potencia-contratada-balance" type="number" min="0" step="0.5" placeholder="' + (potSugerida !== null ? fmt(potSugerida,1) + ' sugeridos' : 'Ingresar') + '" value="' + (draft.balanceFases && Number(draft.balanceFases.potenciaContratadaKw) > 0 ? Number(draft.balanceFases.potenciaContratadaKw) : '') + '"><div class="hint">Vacío = usa el suministro sugerido, si está disponible.</div></div>' +
          statBox('L1', fmt(balance.corrientes[0]) + ' A', balance.faseMax === 'L1') +
          statBox('L2', fmt(balance.corrientes[1]) + ' A', balance.faseMax === 'L2') +
          statBox('L3', fmt(balance.corrientes[2]) + ' A', balance.faseMax === 'L3') +
          statBox('Fase más cargada', balance.faseMax ? balance.faseMax + ' · ' + fmt(balance.corrienteMax) + ' A' : 'Pendiente', true) +
          statBox('Desequilibrio', fmt(balance.desequilibrioPct) + ' %' + (balance.limitePct !== null ? ' / máx. ' + fmt(balance.limitePct,0) + ' %' : ''), true) +
          statBox('Estado', balance.estado === 'cumple' ? 'Verificado' : (balance.estado === 'pendiente' ? 'Pendiente' : 'No cumple'), true) +
        '</div>' +
        (balance.causas.length || balance.pendientes.length
          ? '<ul style="margin:10px 0 0;padding-left:18px;font-size:0.8rem;color:var(--error)">' + balance.causas.concat(balance.pendientes).map((x) => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul>'
          : '<div class="hint" style="margin-top:10px">Índice = máxima desviación respecto de la corriente media / corriente media × 100.</div>');
      $('#btn-auto-balance').addEventListener('click', () => { autoBalancearFases(draft); renderCircuitosList(); });
      $('#f-potencia-contratada-balance').addEventListener('change', () => {
        if (!draft.balanceFases) draft.balanceFases = { potenciaContratadaKw: null };
        draft.balanceFases.potenciaContratadaKw = Number($('#f-potencia-contratada-balance').value) > 0 ? Number($('#f-potencia-contratada-balance').value) : null;
        renderCircuitosList();
      });
    }

    const pgWrap = $('#circuitos-proteccion-general');
    const pg = calcularProteccionGeneral(draft);
    pgWrap.hidden = !pg.aplica || draft.circuitos.length === 0;
    if (pg.aplica) pgWrap.innerHTML = proteccionGeneralHtml(pg);
  }

  function renderMaterialesList() {
    const wrap = $('#materiales-list');
    if (draft.materiales.length === 0 && draft.circuitos.length > 0) {
      draft.materiales = generarMateriales(draft.circuitos, draft);
      draft.materialesDesactualizados = false;
    }
    $('#materiales-warning').hidden = !draft.materialesDesactualizados;
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
    $('#resumen-potencia-instalada').textContent = fmt(r.potenciaInstalada / 1000) + ' kW';

    const cWrap = $('#resumen-circuitos');
    cWrap.innerHTML = '';
    if (draft.circuitos.length === 0) cWrap.appendChild(el('div', { class: 'empty-state', html: 'Sin circuitos cargados.' }));
    const caidaPreviaResumen = caidaPreviaDe(draft);
    const ctxCortoResumen = contextoCortocircuito(draft);
    const estadosTecnicos = [];
    draft.circuitos.forEach((c, i) => {
      const calc = calcularCircuito(c, caidaPreviaResumen);
      const comp = calc.apto ? comprobarCircuito(datosCircuito(c, caidaPreviaResumen, ctxCortoResumen)) : null;
      const estadoTecnico = comp ? comp.estado : 'no_cumple';
      estadosTecnicos.push(estadoTecnico);
      const estadoTecnicoHtml = estadoTecnico === 'cumple'
        ? '<span class="badge-apto">Verificado</span>'
        : (estadoTecnico === 'pendiente'
          ? '<span class="badge-pendiente">Pendiente</span>'
          : '<span class="badge-noapto">No cumple</span>');
      const row = el('div', { class: 'card card-pad summary-circuit-card' });
      if (calc.apto) {
        row.innerHTML =
          '<div class="summary-circuit-id">C' + (i + 1) + '</div>' +
          '<div class="summary-circuit-name">' + escapeHtml(c.nombre || 'Circuito') + estadoTecnicoHtml + '</div>' +
          '<div class="summary-circuit-stat"><b>' + calc.seccionAdoptada + ' mm²</b><span>Sección</span></div>' +
          '<div class="summary-circuit-stat"><b>' + calc.breaker + ' A</b><span>Protección</span></div>' +
          '<div class="summary-circuit-stat"><b>' + fmt(calc.dUPct) + ' %</b><span>Caída</span></div>' +
          '<svg class="summary-circuit-chevron"><use href="#ic-chevron-right"/></svg>';
      } else {
        row.innerHTML =
          '<div class="summary-circuit-id">C' + (i + 1) + '</div>' +
          '<div class="summary-circuit-name">' + escapeHtml(c.nombre || 'Circuito') + '<span class="summary-circuit-warning">No apto con estos parámetros</span></div>' +
          '<svg class="summary-circuit-chevron"><use href="#ic-chevron-right"/></svg>';
      }
      cWrap.appendChild(row);
    });

    const pg = calcularProteccionGeneral(draft);
    const verPg = comprobarProteccionGeneral(draft, pg);
    if (pg.aplica) estadosTecnicos.push(verPg.estado);
    const verEq = comprobarEquipotencialidad(draft);
    estadosTecnicos.push(verEq.estado);
    const verProto = comprobarProtocoloEnsayos(draft);
    estadosTecnicos.push(verProto.estado);

    const estadoTecnicoWrap = $('#resumen-estado-tecnico');
    if (estadosTecnicos.includes('no_cumple')) {
      estadoTecnicoWrap.innerHTML = '<div class="alert-error"><b>Estado técnico: no cumple.</b> Hay circuitos, protecciones, puesta a tierra o ensayos de puesta en servicio que deben corregirse antes de cerrar la instalación.</div>';
    } else if (estadosTecnicos.includes('pendiente')) {
      estadoTecnicoWrap.innerHTML = '<div class="alert-warning"><b>Estado técnico: verificación pendiente.</b> Faltan mediciones, datos o validaciones obligatorias para cerrar la memoria.</div>';
    } else if (estadosTecnicos.length) {
      estadoTecnicoWrap.innerHTML = '<div class="alert-success"><b>Estado técnico: verificado.</b> Los circuitos, protecciones, puesta a tierra y el protocolo de ensayos completaron las comprobaciones aplicables.</div>';
    } else {
      estadoTecnicoWrap.innerHTML = '<div class="alert-warning"><b>Estado técnico: pendiente.</b> No hay circuitos para comprobar.</div>';
    }

    $('#resumen-proteccion-general').hidden = !pg.aplica;
    if (pg.aplica) {
      $('#resumen-proteccion-general-stats').innerHTML = proteccionGeneralLightHtml(pg);
      $('#resumen-diferencial-sensibilidad').value = String(pg.diferencialSensibilidad);
      $('#resumen-diferencial-tipo').value = tipoDiferencialGeneral(pg);
      $('#resumen-diferencial-selectividad').value = pg.diferencialSelectividad === 'S' ? 'S' : 'instantaneo';
      $('#resumen-tierra-ambiente').value = pg.ambienteTierra;
      $('#resumen-tierra-resistencia').value = pg.resistenciaTierraOhm !== null ? String(pg.resistenciaTierraOhm) : '';
      $('#resumen-tiempo-diferencial-general').value = pg.tiempoDiferencialGeneralS !== null ? String(pg.tiempoDiferencialGeneralS) : '';
      const esquemaCI = esquemaContactosIndirectos(draft);
      $('#resumen-esquema-contactos').textContent = esquemaCI;
      $('#resumen-it-campos').hidden = esquemaCI !== 'IT';
      $('#resumen-it-imd').value = pg.monitorAislamientoIt === true ? 'si' : (pg.monitorAislamientoIt === false ? 'no' : 'desconocido');
      $('#resumen-it-masas').value = pg.masasInterconectadasIt === true ? 'si' : (pg.masasInterconectadasIt === false ? 'no' : 'desconocido');
      $('#resumen-it-id').value = pg.corrientePrimerDefectoMa !== null ? String(pg.corrientePrimerDefectoMa) : '';
      $('#resumen-eqp-principal-aplica').value = pg.equipotencialPrincipalAplica || 'pendiente';
      $('#resumen-eqp-principal-seccion').value = pg.equipotencialPrincipalSeccion !== null && pg.equipotencialPrincipalSeccion !== undefined ? String(pg.equipotencialPrincipalSeccion) : '';
      $('#resumen-eqp-principal-continuidad').value = pg.equipotencialPrincipalContinuidad || 'pendiente';
      $('#resumen-eqp-suplementaria-aplica').value = pg.equipotencialSuplementariaAplica || 'no';
      $('#resumen-eqp-suplementaria-seccion').value = pg.equipotencialSuplementariaSeccion !== null && pg.equipotencialSuplementariaSeccion !== undefined ? String(pg.equipotencialSuplementariaSeccion) : '';
      $('#resumen-eqp-suplementaria-continuidad').value = pg.equipotencialSuplementariaContinuidad || 'pendiente';
      $('#resumen-eqp-verificacion').innerHTML = '<div class="' + (verEq.estado==='cumple'?'alert-success':(verEq.estado==='no_cumple'?'alert-error':'alert-warning')) + '"><b>PE y equipotencialidad: ' + (verEq.estado==='cumple'?'verificado':(verEq.estado==='no_cumple'?'no cumple':'pendiente')) + '.</b> ' + escapeHtml(verEq.causas.concat(verEq.pendientes).join(' ')) + '</div>';
      if (!draft.protocoloEnsayos) draft.protocoloEnsayos={fecha:'',tecnico:'',instrumento:'',serie:'',calibracion:'pendiente'};
      $('#resumen-protocolo-fecha').value = draft.protocoloEnsayos.fecha || '';
      $('#resumen-protocolo-tecnico').value = draft.protocoloEnsayos.tecnico || '';
      $('#resumen-protocolo-instrumento').value = draft.protocoloEnsayos.instrumento || '';
      $('#resumen-protocolo-serie').value = draft.protocoloEnsayos.serie || '';
      $('#resumen-protocolo-calibracion').value = draft.protocoloEnsayos.calibracion || 'pendiente';
      $('#resumen-prueba-funcional').value = pg.ensayoFuncionalProtecciones || 'pendiente';
      $('#resumen-ensayo-rcd-general').value = pg.ensayoRcdGeneral || 'pendiente';
      $('#resumen-protocolo-verificacion').innerHTML = '<div class="' + (verProto.estado==='cumple'?'alert-success':(verProto.estado==='no_cumple'?'alert-error':'alert-warning')) + '"><b>Protocolo de ensayos: ' + (verProto.estado==='cumple'?'completo':(verProto.estado==='no_cumple'?'no conforme':'pendiente')) + '.</b> ' + escapeHtml(verProto.causas.concat(verProto.pendientes).slice(0,4).join(' ')) + (verProto.causas.length+verProto.pendientes.length>4?' …':'') + '</div>';
      $('#resumen-pg-existente').hidden = pg.modo !== 'existente';
      if (pg.modo === 'existente') {
        $('#resumen-termica-existente').value = pg.termicaIn !== null ? String(pg.termicaIn) : '';
        $('#resumen-diferencial-existe').value = pg.diferencialExiste === true ? 'si' : (pg.diferencialExiste === false ? 'no' : 'desconocido');
        $('#resumen-diferencial-in-existente').value = pg.diferencialIn !== null ? String(pg.diferencialIn) : '';
      }
      $('#resumen-sobretensiones-riesgo').value = pg.sobretensionesRiesgo;
      $('#resumen-pararrayos-lps').value = pg.pararrayosLps;
      $('#resumen-spd-existe').value = pg.spdExiste;
      $('#resumen-spd-tipo').value = pg.spdTipo || '';
      $('#resumen-proteccion-general-verificacion').innerHTML = proteccionGeneralVerificacionHtml(verPg);
      const rcd = diferencialesDedicados(draft.circuitos, tipoDiferencialGeneral(pg));
      const generalRcdDisponible = diferencialGeneralDisponible(pg);
      $('#resumen-diferenciales').innerHTML = !generalRcdDisponible
        ? '<div class="alert-warning"><b>Cobertura diferencial de los circuitos: pendiente.</b> No se declara ningún circuito como cubierto por el diferencial general hasta confirmar/instalar ese dispositivo. Los tipos requeridos por cargas electrónicas siguen mostrándose en cada circuito.</div>'
        : (rcd.dedicados.length
          ? rcd.dedicados.map((d) => '<div class="light-stat-row"><span class="lbl">' + escapeHtml(d.circuito.nombre || 'Circuito') +
              '</span><span class="val strong">Diferencial dedicado tipo ' + d.tipo + '</span></div>').join('')
          : '<div class="light-stat-row"><span class="lbl">Diferenciales por circuito</span><span class="val">Cubiertos por el diferencial general relevado/proyectado</span></div>') +
        rcd.avisos.map((a) => '<div class="alert-error" style="margin-top:8px">' + escapeHtml(a) + '</div>').join('');

      const selTerm = comprobarSelectividadTermicas(draft);
      const selRcd = comprobarSelectividadDiferenciales(draft);
      const estadoSel = (e) => e === 'cumple' ? '<span class="badge-apto">Verificada</span>' : (e === 'no_aplica' ? '<span class="badge-pendiente">No aplica</span>' : (e === 'no_selectiva' ? '<span class="badge-noapto">No selectiva</span>' : '<span class="badge-pendiente">Pendiente</span>'));
      $('#resumen-diferenciales').innerHTML += '<div class="section-label" style="margin-top:14px">Coordinación y selectividad</div>' +
        '<div class="light-stat-row"><span class="lbl">Térmicas general ↔ circuitos</span><span class="val">' + estadoSel(selTerm.estado) + '</span></div>' +
        selTerm.detalles.map((x)=>'<div class="hint" style="margin:4px 0 8px"><b>'+escapeHtml(x.circuito)+':</b> '+escapeHtml(x.motivo)+'</div>').join('') +
        '<div class="light-stat-row"><span class="lbl">Diferenciales en cascada</span><span class="val">' + estadoSel(selRcd.estado) + '</span></div>' +
        selRcd.detalles.map((x)=>'<div class="hint" style="margin:4px 0 8px"><b>'+escapeHtml(x.circuito)+':</b> '+escapeHtml(x.motivo)+'</div>').join('');
    }

    $('#resumen-materiales-count').textContent = draft.materiales.length + ' ítems';
    const mWrap = $('#resumen-materiales-preview');
    mWrap.innerHTML = '';
    if (draft.materialesDesactualizados) {
      mWrap.appendChild(el('div', { class: 'alert-warning', html: '<b>Materiales desactualizados.</b> Volvé al paso Materiales y usá Regenerar.' }));
    }
    draft.materiales.slice(0, 3).forEach((m) => {
      mWrap.appendChild(el('div', { class: 'light-stat-row', html: '<span class="lbl">' + escapeHtml(m.nombre) + '</span><span class="val">' + fmt(m.cantidad, 0) + ' ' + escapeHtml(m.unidad) + '</span>' }));
    });
    if (draft.materiales.length > 3) mWrap.appendChild(el('div', { class: 'light-stat-row', html: '<span class="lbl" style="color:var(--steel)">+' + (draft.materiales.length - 3) + ' más</span><span></span>' }));

    $('#resumen-observaciones').value = draft.observaciones;
    renderCierreProfesional();
  }

  function cierreBase(trabajo) {
    if (!trabajo.cierreProfesional || typeof trabajo.cierreProfesional !== 'object') trabajo.cierreProfesional = { responsableNombre:'', categoriaUTE:'', fecha:'', declaracion:'pendiente', firmaDataUrl:'', fotos:[] };
    if (!Array.isArray(trabajo.cierreProfesional.fotos)) trabajo.cierreProfesional.fotos = [];
    return trabajo.cierreProfesional;
  }

  function evaluarCierreProfesional(trabajo) {
    const c = cierreBase(trabajo);
    const faltantes = [], fallas = [], ok = [];
    const tramite = trabajo.obra && trabajo.obra.naturaleza === 'Trámite';
    if (!trabajo.cliente || !String(trabajo.cliente.nombre || '').trim()) faltantes.push('Identificar al cliente.'); else ok.push('Cliente identificado.');
    if (!trabajo.obra || !String(trabajo.obra.nombre || '').trim()) faltantes.push('Identificar la obra.'); else ok.push('Obra identificada.');
    if (!String(c.responsableNombre || '').trim()) faltantes.push('Ingresar responsable técnico.');
    if (!String(c.categoriaUTE || '').trim()) faltantes.push('Ingresar categoría UTE / habilitación del responsable.');
    if (!c.fecha) faltantes.push('Ingresar fecha de cierre.');
    if (c.declaracion !== 'si') faltantes.push('Confirmar la declaración del responsable técnico.');
    if (!tramite) {
      if (!(trabajo.circuitos || []).length) faltantes.push('Agregar al menos un circuito.');
      const caida = caidaPreviaDe(trabajo), ctx = contextoCortocircuito(trabajo);
      (trabajo.circuitos || []).forEach((circ, i) => {
        const calc = calcularCircuito(circ, caida);
        if (!calc.apto) { fallas.push('C' + (i+1) + ': no apto con los parámetros actuales.'); return; }
        const comp = comprobarCircuito(datosCircuito(circ, caida, ctx));
        if (comp.estado === 'no_cumple') fallas.push('C' + (i+1) + ': no cumple.');
        else if (comp.estado === 'pendiente') faltantes.push('C' + (i+1) + ': verificación técnica pendiente.');
      });
      const pg = calcularProteccionGeneral(trabajo);
      const vpg = comprobarProteccionGeneral(trabajo, pg);
      if (pg.aplica && vpg.estado === 'no_cumple') fallas.push('Protección general / puesta a tierra: no cumple.');
      else if (pg.aplica && vpg.estado === 'pendiente') faltantes.push('Protección general / puesta a tierra: pendiente.');
      const veq = comprobarEquipotencialidad(trabajo);
      if (veq.estado === 'no_cumple') fallas.push('PE / equipotencialidad: no cumple.');
      else if (veq.estado === 'pendiente') faltantes.push('PE / equipotencialidad: pendiente.');
      const vp = comprobarProtocoloEnsayos(trabajo);
      if (vp.estado === 'no_cumple') fallas.push('Protocolo de ensayos: no conforme.');
      else if (vp.estado === 'pendiente') faltantes.push('Protocolo de ensayos: pendiente.');
      if (trabajo.materialesDesactualizados) faltantes.push('Regenerar la lista de materiales.');
    }
    const estado = fallas.length ? 'no_cumple' : (faltantes.length ? 'pendiente' : 'listo');
    c.estadoFinal = estado;
    c.ultimaRevision = Date.now();
    return { estado, faltantes, fallas, ok };
  }

  function renderCierreProfesional() {
    if (!draft || !$('#cierre-revision')) return;
    const c = cierreBase(draft);
    $('#cierre-responsable').value = c.responsableNombre || '';
    $('#cierre-categoria').value = c.categoriaUTE || '';
    $('#cierre-fecha').value = c.fecha || '';
    $('#cierre-declaracion').value = c.declaracion || 'pendiente';
    $('#cierre-firma-estado').textContent = c.firmaDataUrl ? 'Firma gráfica adjunta al proyecto.' : 'Sin firma gráfica adjunta.';
    const r = evaluarCierreProfesional(draft);
    const badge = $('#cierre-badge');
    badge.className = r.estado === 'listo' ? 'badge-apto' : (r.estado === 'no_cumple' ? 'badge-noapto' : 'badge-pendiente');
    badge.textContent = r.estado === 'listo' ? 'Listo para emitir' : (r.estado === 'no_cumple' ? 'No cumple' : 'Pendiente');
    const mensajes = r.fallas.concat(r.faltantes);
    $('#cierre-revision').innerHTML = mensajes.length
      ? '<div class="' + (r.fallas.length ? 'alert-error' : 'alert-warning') + '"><b>' + (r.fallas.length ? 'No se puede cerrar como definitivo.' : 'Revisión final pendiente.') + '</b><ul style="margin:7px 0 0;padding-left:18px">' + mensajes.slice(0,10).map(x=>'<li>'+escapeHtml(x)+'</li>').join('') + (mensajes.length>10?'<li>… y '+(mensajes.length-10)+' punto(s) más.</li>':'') + '</ul></div>'
      : '<div class="alert-success"><b>Listo para emitir.</b> La revisión final no detecta incumplimientos ni datos críticos pendientes.</div>';
    const fotos = c.fotos || [];
    $('#cierre-fotos-lista').innerHTML = fotos.length ? fotos.map((f,i)=>'<div class="light-stat-row"><span class="lbl">'+escapeHtml(f.nombre||('Foto '+(i+1)))+'</span><button class="btn btn-ghost btn-sm" type="button" data-quitar-foto="'+i+'">Quitar</button></div>').join('') : '<div class="hint">Sin anexos fotográficos.</div>';
    $$('[data-quitar-foto]', $('#cierre-fotos-lista')).forEach(btn=>btn.addEventListener('click',()=>{ c.fotos.splice(Number(btn.dataset.quitarFoto),1); renderCierreProfesional(); }));
  }

  function comprimirImagenArchivo(file, maxPx, calidad) {
    return new Promise((resolve,reject)=>{
      const rd=new FileReader(); rd.onerror=reject; rd.onload=()=>{
        const img=new Image(); img.onerror=reject; img.onload=()=>{
          const esc=Math.min(1,(maxPx||1000)/Math.max(img.width,img.height));
          const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(img.width*esc)); cv.height=Math.max(1,Math.round(img.height*esc));
          cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height); resolve(cv.toDataURL('image/jpeg',calidad||0.72));
        }; img.src=rd.result;
      }; rd.readAsDataURL(file);
    });
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
    sincronizarPresupuestos(draft.id);
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
  // Panel de comprobación: las tres condiciones, con sus números a la vista y la
  // causa concreta cuando alguna no se cumple.
  // cumple: true / false, o null cuando faltan datos para decidir.
  function filaComprobacion(titulo, cumple, detalle, formula) {
    const badge = cumple === null
      ? '<span class="badge-pendiente">Sin datos</span>'
      : (cumple
        ? '<span class="badge-apto">' + icon('ic-check-circle') + 'Cumple</span>'
        : '<span class="badge-noapto">' + icon('ic-x-circle') + 'No cumple</span>');
    return '<div class="light-stat-row" style="align-items:flex-start;gap:10px">' +
      '<span class="lbl" style="flex:1"><strong>' + titulo + '</strong>' +
      '<span style="display:block;font-family:ui-monospace,monospace;font-size:0.78rem;color:var(--steel)">' + escapeHtml(detalle) + '</span>' +
      (formula ? '<span style="display:block;font-size:0.72rem;color:var(--steel)">' + escapeHtml(formula) + '</span>' : '') +
      '</span>' + badge + '</div>';
  }
  function renderComprobacion(c) {
    const wrap = $('#cond-comprobacion');
    if (!wrap) return;
    if (!c.seccion) {
      wrap.innerHTML = '<div class="empty-state">No hay sección de tabla que cumpla con estos datos.</div>';
      return;
    }
    const izTxt = fmt(c.izTabla) + ' A x ' + fmt(c.ft, 2) + ' (temp.) x ' + fmt(c.fa, 2) + ' (agrup.) x ' + fmt(c.fs, 2) + ' (sol) = ' + fmt(c.iz) + ' A';
    const inTxt = c.in === null ? 'sin protección' : fmt(c.in) + ' A';
    let html = '<div class="light-stat-grid">' +
      filaComprobacion('Capacidad de conducción', c.cumpleCapacidad,
        'Iz ' + fmt(c.iz) + ' A >= Ib ' + fmt(c.ib) + ' A', izTxt) +
      filaComprobacion('Coordinación con la protección', c.cumpleIbIn && c.cumpleInIz,
        'Ib ' + fmt(c.ib) + ' A <= In ' + inTxt + ' <= Iz ' + fmt(c.iz) + ' A',
        'IEC 60364-4-43 §431.4.2 · UTE RBT Cap. V §1.a') +
      filaComprobacion('Sobrecarga (I2)', c.cumpleI2,
        'I2 ' + (c.i2 === null ? '—' : fmt(c.i2) + ' A') + ' <= 1,45 · Iz ' + fmt(c.limite145) + ' A',
        c.tipoProteccion === 'mcb' ? 'I2 = 1,45 · In para termomagnéticos IEC 60898' : 'I2 del fabricante') +
      filaComprobacion('Caída de tensión', c.cumpleCaida,
        (c.caidaPrevia > 0
          ? 'Circuito ' + fmt(c.dUPct) + ' % + antes del circuito ' + fmt(c.caidaPrevia) + ' % = ' + fmt(c.dUPctTotal) + ' %'
          : 'Circuito ' + fmt(c.dUPct) + ' %') + ' <= ' + fmt(c.caidaMax) + ' %',
        'UTE RBT Cap. II - Anexo §8 · K = ' + fmt(c.k, 1) + ' (servicio)') +
      filaComprobacion('Poder de corte', c.cumplePoderCorte,
        c.poderCorteTexto + ' >= Icc ' + (c.iccKa === null ? '—' : fmt(c.iccKa) + ' kA') +
          (c.iccFuente === 'real'
            ? (c.iccOrigen === 'calculada' ? ' (calculada con el Anexo, Tablas A a C)' : ' (informada)')
            : { plaza: ' (de plaza, no verificada)', subestacion: ' (falta: subestación propia)' }[c.iccFuente]) +
          (c.icu60947Ka !== null ? ' · Icu IEC 60947-2 ' + fmt(c.icu60947Ka) + ' kA, sólo informativo' : ''),
        'UTE RBT Cap. V §1.b · Anexo Tabla A') +
      filaComprobacion('Icc mínima / despeje al final', c.cumpleIccMinima,
        c.iccMinFinalA === null ? 'Icc mínima final pendiente' : fmt(c.iccMinFinalA,0) + ' A' + (c.umbralMagneticoA ? ' · umbral magnético ' + fmt(c.umbralMagneticoA,0) + ' A (' + c.curvaProteccion + ')' : '') + (c.tiempoAdmisibleIccMinS !== null ? ' · t térmico admisible ' + fmt(c.tiempoAdmisibleIccMinS,3) + ' s' : ''),
        'UTE RBT Cap. II - Anexo §7 + IEC 60898-1') +
      filaComprobacion('Tiempo de actuación a Ik,min', c.cumpleTiempoDesconexion,
        c.tiempoDesconexionVerificadoS !== null ? fmt(c.tiempoDesconexionVerificadoS,3) + ' s' + (c.tiempoAdmisibleIccMinS !== null ? ' ≤ ' + fmt(c.tiempoAdmisibleIccMinS,3) + ' s admisibles' : '') : 'Pendiente',
        'Curva tiempo-corriente / cota magnética IEC 60898-1; límite térmico UTE Anexo §7') +
      filaComprobacion('Cortocircuito térmico', c.cumpleTermicaCorto,
        c.i2tExigido === null
          ? 'Admisible ' + (c.i2tAdmisible === null ? '—' : fmt(c.i2tAdmisible / 1000, 0) + ' kA²s')
          : fmt(c.i2tExigido / 1000, 0) + ' kA²s <= ' + fmt(c.i2tAdmisible / 1000, 0) + ' kA²s admisibles',
        'UTE RBT Cap. II - Anexo §7' + (c.tipoProteccion === 'mcb' ? ' · energía pasante del termomagnético' : '')) +
      '</div>';
    html += '<div style="margin-top:12px">' + (c.estado === 'cumple'
      ? '<span class="badge-apto">' + icon('ic-check-circle') + 'Circuito técnicamente verificado</span>'
      : (c.estado === 'pendiente'
        ? '<span class="badge-pendiente">Dimensionado preliminar · verificación pendiente</span>'
        : '<span class="badge-noapto">' + icon('ic-x-circle') + 'Circuito no cumple</span>')) + '</div>';
    if (c.causas.length) {
      html += '<ul style="margin:10px 0 0;padding-left:18px;font-size:0.82rem;color:var(--error)">' +
        c.causas.map((x) => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul>';
    }
    const avisos = c.pendientes.concat(c.notas);
    if (avisos.length) {
      html += '<ul style="margin:10px 0 0;padding-left:18px;font-size:0.8rem;color:var(--steel)">' +
        avisos.map((x) => '<li>' + escapeHtml(x) + '</li>').join('') + '</ul>';
    }
    html += '<details style="margin-top:12px"><summary class="section-label" style="margin:0">En qué se respalda</summary>' +
      '<div class="stack-sm" style="margin-top:8px">' + referenciasHtml() + '</div></details>';
    wrap.innerHTML = html;
  }

  // Las referencias, separadas en las dos categorías que corresponden: primero
  // el reglamento que rige en Uruguay, después lo complementario.
  function referenciasHtml() {
    const bloque = (rango, titulo, nota) =>
      '<div><div class="section-label" style="margin:0">' + titulo + '</div>' +
      '<div style="font-size:0.74rem;color:var(--steel);margin-bottom:6px">' + nota + '</div>' +
      REFERENCIAS_NORMATIVAS.filter((r) => r.rango === rango).map((r) =>
        '<div style="margin-bottom:8px"><div style="font-weight:700;font-size:0.8rem">' + escapeHtml(r.tema) + '</div>' +
        '<div style="font-size:0.78rem;color:var(--steel)">' + escapeHtml(r.cita) + '</div></div>').join('') + '</div>';
    return bloque('principal', 'Reglamentación aplicable', 'Reglamento de Baja Tensión de UTE: es la norma que rige en Uruguay y la que manda en todo el cálculo.') +
      bloque('complementaria', 'Referencia técnica complementaria', 'Normas IEC, citadas donde aportan la formulación explícita de lo que el reglamento exige.');
  }

  function opcionesComprobacion(material, aislacion, metodo) {
    const categoria = CATEGORIA_METODO[metodo] || 'conducto';
    const secciones = tablaAmpacidad(categoria, material, aislacion).map((r) => r.s);
    const sel = $('#cond-seccion');
    const inSel = $('#cond-in');
    const antesS = sel.value, antesIn = inSel.value;
    sel.innerHTML = '<option value="">La que calcula la app</option>' +
      secciones.map((x) => '<option value="' + x + '">' + fmt(x, x < 10 ? 1 : 0).replace(/,0$/, '') + ' mm²</option>').join('');
    inSel.innerHTML = '<option value="">La que calcula la app</option>' +
      BREAKER_RATINGS.map((x) => '<option value="' + x + '">' + x + ' A</option>').join('');
    sel.value = antesS; inSel.value = antesIn;
  }

  function calcularConductorForm() {
    const fases = Number($('#cond-fases .active').dataset.fases);
    const v = Number($('#cond-tension').value);
    const dato = $('#cond-dato').value;
    const valor = Number($('#cond-valor').value) || 0;
    const cosPhi = Number($('#cond-cosphi').value) || 1;
    const rendimiento = Number($('#cond-rendimiento').value) || 1;
    const ib = ibDesdeInput({ datoConocido: dato, potenciaKw: dato === 'potencia' ? valor : 0, corrienteA: dato === 'corriente' ? valor : 0, cosPhi, rendimiento, v, fases });
    const datos = {
      ib, v, fases, l: Number($('#cond-longitud').value) || 0, material: $('#cond-material').value,
      metodo: $('#cond-metodo').value, aislacion: $('#cond-aislacion').value,
      tempAmb: Number($('#cond-temp').value) || 30, agrupados: Number($('#cond-agrupados').value) || 1,
      disposicion: $('#cond-disposicion').value,
      resistividadTerreno: Number($('#cond-terreno-rho').value) || null,
      profundidadEnterrado: Number($('#cond-terreno-prof').value) || null,
      montaje: $('#cond-montaje').value,
      separados2De: $('#cond-separados').value === '1',
      cosPhi, caidaMax: Number($('#cond-caidamax').value) || 5, uso: $('#cond-uso').value,
      expuestoSol: $('#cond-sol').value === '1',
      caidaAguasArribaPct: Number($('#cond-caida-arriba').value) || 0,
      tipoProteccion: $('#cond-prot-tipo').value,
      i2: Number($('#cond-i2').value) || null,
      iccKa: Number($('#cond-icc').value) || null,
      poderCorteKa: Number($('#cond-podercorte').value) || null,
      icu60947Ka: Number($('#cond-icu').value) || null,
      conSubestacion: $('#cond-subestacion').value === 'si',
      i2tPasante: Number($('#cond-i2t').value) || null,
      tiempoDespejeS: Number($('#cond-tiempo').value) || null,
    };
    const esMcb = datos.tipoProteccion === 'mcb';
    $('#cond-i2-wrap').hidden = esMcb;
    $('#cond-i2t-wrap').hidden = !esMcb;
    $('#cond-tiempo-wrap').hidden = esMcb;
    $('#cond-icu-wrap').hidden = !esMcb;
    $('#cond-podercorte-label').textContent = esMcb ? 'Icn IEC 60898-1 (kA)' : 'Icu IEC 60947-2 (kA)';
    // montaje y separación cuentan al aire y en bandeja; los caños, enterrado
    const alAire = pideMontaje(datos.metodo);
    $('#cond-montaje-wrap').hidden = !alAire;
    $('#cond-aire-nota').hidden = !(datos.metodo === 'aire' && NORMATIVE_PACK.parametros.aireLibreSeparado);
    $('#cond-disposicion-wrap').hidden = datos.metodo !== 'enterrado';
    $('#cond-terreno-wrap').hidden = datos.metodo !== 'enterrado';
    if (alAire && $('#cond-montaje').dataset.metodo !== datos.metodo) {
      // al cambiar de método se propone el montaje típico de ese método
      $('#cond-montaje').value = MONTAJE_DEFECTO[datos.metodo];
      $('#cond-montaje').dataset.metodo = datos.metodo;
      datos.montaje = MONTAJE_DEFECTO[datos.metodo];
    }
    if ($('#cond-temp').dataset.metodo !== datos.metodo) {
      // enterrado se propone a temperatura de terreno (25 °C, supuesto 1) y
      // resistividad estándar de UTE (1,0 K·m/W), salvo que ya se hayan tocado
      if (datos.metodo === 'enterrado') {
        if (datos.tempAmb === TEMP_AMBIENTE_DEFECTO) { $('#cond-temp').value = TEMP_TERRENO_ENTERRADO_DEFECTO; datos.tempAmb = TEMP_TERRENO_ENTERRADO_DEFECTO; }
        if (!(Number($('#cond-terreno-rho').value) > 0)) { $('#cond-terreno-rho').value = RESISTIVIDAD_TERRENO_UTE_DEFECTO; datos.resistividadTerreno = RESISTIVIDAD_TERRENO_UTE_DEFECTO; }
      } else if (datos.tempAmb === TEMP_TERRENO_ENTERRADO_DEFECTO) {
        $('#cond-temp').value = TEMP_AMBIENTE_DEFECTO;
        datos.tempAmb = TEMP_AMBIENTE_DEFECTO;
      }
      $('#cond-temp-label').textContent = datos.metodo === 'enterrado' ? 'Temp. terreno (°C)' : 'Temp. ambiente (°C)';
      $('#cond-temp').dataset.metodo = datos.metodo;
    }
    const r = calcularSeccion(datos);
    opcionesComprobacion(datos.material, datos.aislacion, datos.metodo);
    renderComprobacion(comprobarCircuito(datos, { seccion: $('#cond-seccion').value, in: $('#cond-in').value }));
    $('#cond-badge').innerHTML = r.apto
      ? '<span class="badge-apto">' + icon('ic-check-circle') + 'Dimensionado apto</span>'
      : '<span class="badge-noapto">' + icon('ic-x-circle') + 'No apto</span>';
    const rows = [
      ...(r.error ? [['ic-tool', 'Observación', r.error]] : []),
      ['ic-zap', 'Corriente de diseño', fmt(r.ib) + ' A'],
      ['ic-cable', 'Sección por capacidad', (r.seccionCapacidad ?? '—') + (r.seccionCapacidad ? ' mm²' : '')],
      ['ic-ruler', 'Sección por caída', (r.seccionCaida ?? '—') + (r.seccionCaida ? ' mm²' : '')],
      ['ic-tool', 'Sección mínima reglamentaria', r.minimo + ' mm²'],
    ];
    if (r.apto) {
      rows.push(['ic-cable', 'Conductor adoptado', r.seccionAdoptada + ' mm² ' + ($('#cond-material').value === 'cobre' ? 'Cu' : 'Al') + ' ' + $('#cond-aislacion').value.toUpperCase()]);
      rows.push(['ic-calc', 'Protección sugerida', r.breaker + ' A curva ' + r.curva]);
      rows.push(['ic-tool', 'Por qué esa curva', CURVA_DESCRIPCION[r.curva] || '—']);
      rows.push(['ic-ruler', 'Conductividad K (servicio)', fmt(r.k, 1) + ' m/(Ω·mm²)']);
      rows.push(['ic-thermo', 'Caída del circuito', fmt(r.dUPct) + ' %']);
      rows.push(['ic-thermo', 'Caída total desde el origen', fmt(r.dUPctTotal) + ' % de ' + fmt(r.caidaMax) + ' % — ' + (r.dUPctTotal <= r.caidaMax ? 'Cumple' : 'No cumple')]);
    }
    const resultMain = $('#cond-result-main');
    if (resultMain) {
      if (r.apto) {
        const materialTxt = $('#cond-material').value === 'cobre' ? 'Cu' : 'Al';
        const aislacionTxt = $('#cond-aislacion').value.toUpperCase();
        resultMain.innerHTML =
          '<div class="result-adopted">' +
            '<div class="kicker">Conductor seleccionado</div>' +
            '<div class="main">' + r.seccionAdoptada + ' mm² ' + materialTxt + ' / ' + aislacionTxt + '</div>' +
            '<div class="sub">Protección sugerida: <strong>' + r.breaker + ' A curva ' + r.curva + '</strong></div>' +
          '</div>' +
          '<div class="result-mini-grid">' +
            '<div class="result-mini"><div class="v">' + fmt(r.ib) + ' A</div><div class="l">Corriente</div></div>' +
            '<div class="result-mini"><div class="v">' + fmt(r.dUPctTotal) + ' %</div><div class="l">Caída total</div></div>' +
            '<div class="result-mini"><div class="v">' + r.breaker + ' A</div><div class="l">Protección</div></div>' +
          '</div>';
      } else {
        resultMain.innerHTML = '<div class="result-adopted"><div class="kicker">Resultado</div><div class="main">Revisar datos</div><div class="sub">No se encontró una combinación apta con los datos ingresados.</div></div>';
      }
    }
    $('#cond-resultado').innerHTML = rows.map((row) =>
      '<div class="light-stat-row"><span class="lbl">' + icon(row[0]) + row[1] + '</span><span class="val strong">' + row[2] + '</span></div>').join('');
    return r;
  }

  /* ============================================================
     TRABAJOS Y PRESUPUESTOS — listados
     ============================================================ */
  // Duplicar: la mayoría de las obras se parecen a otra ya hecha. Se copia todo
  // menos la identidad —código, estado y fechas— para no pisar el original.
  function duplicarTrabajo(id) {
    const t = DB.trabajos.find((x) => x.id === id);
    if (!t) return null;
    const copia = JSON.parse(JSON.stringify(t));
    copia.id = uid('T');
    copia.codigo = 'REL-' + new Date().getFullYear() + '-' + String(DB.trabajos.length + 1).padStart(4, '0');
    copia.obra = { ...copia.obra, nombre: (copia.obra.nombre || 'Obra') + ' (copia)' };
    copia.estado = 'pendiente';
    copia.cierreProfesional = { responsableNombre:'', categoriaUTE:'', fecha:'', declaracion:'pendiente', firmaDataUrl:'', fotos:[] };
    copia.createdAt = Date.now();
    copia.updatedAt = Date.now();
    DB.trabajos.push(copia);
    saveDB();
    return copia;
  }
  function duplicarPresupuesto(id) {
    const p = DB.presupuestos.find((x) => x.id === id);
    if (!p) return null;
    const copia = JSON.parse(JSON.stringify(p));
    copia.id = uid('P');
    copia.codigo = 'AE-' + new Date().getFullYear() + '-' + String(DB.presupuestos.length + 1).padStart(4, '0');
    copia.estado = 'borrador';
    copia.createdAt = Date.now();
    copia.updatedAt = Date.now();
    DB.presupuestos.push(copia);
    saveDB();
    return copia;
  }
  // Botón de duplicar dentro de una tarjeta que ya se abre al tocarla.
  function botonDuplicar(alDuplicar) {
    const b = el('button', { class: 'icon-btn', style: 'flex:none', title: 'Duplicar' });
    b.innerHTML = icon('ic-copy');
    b.addEventListener('click', (e) => { e.stopPropagation(); alDuplicar(); });
    return b;
  }
  // Busca en cualquiera de los textos de la ficha, sin acentos ni mayúsculas.
  function sinAcentos(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function coincide(texto, busqueda) {
    const q = sinAcentos(busqueda).trim();
    if (!q) return true;
    const t = sinAcentos(texto);
    return q.split(/\s+/).every((palabra) => t.includes(palabra));
  }

  function renderTrabajos() {
    const wrap = $('#trabajos-list');
    wrap.innerHTML = '';
    const busqueda = ($('#trabajos-buscar') && $('#trabajos-buscar').value) || '';
    const todos = DB.trabajos.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    const items = todos.filter((t) => coincide([t.obra.nombre, t.obra.direccion, t.obra.localidad, t.cliente.nombre, t.codigo].join(' '), busqueda));
    if (items.length === 0) {
      wrap.appendChild(el('div', { class: 'empty-state', html: todos.length ? 'Ningún relevamiento coincide con la búsqueda.' : 'Todavía no guardaste ningún relevamiento.' }));
      return;
    }
    items.forEach((t) => {
      const card = el('div', { class: 'card card-pad', style: 'cursor:pointer;display:flex;align-items:center;gap:14px' });
      card.innerHTML =
        '<span class="ic" style="width:40px;height:40px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:none">' + icon('ic-clipboard-plus') + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:0.9rem">' + escapeHtml(t.obra.nombre || 'Obra sin nombre') + '</div>' +
        '<div style="font-size:0.78rem;color:var(--steel)">' + escapeHtml(t.cliente.nombre || 'Sin cliente') + ' · ' + timeAgo(t.updatedAt) + '</div></div>' +
        statusPill(t.estado);
      card.appendChild(botonDuplicar(() => {
        const copia = duplicarTrabajo(t.id);
        if (copia) { toast('Relevamiento duplicado'); openTrabajo(copia.id); }
      }));
      card.addEventListener('click', () => openTrabajo(t.id));
      wrap.appendChild(card);
    });
  }

  function renderPresupuestos() {
    const wrap = $('#presupuestos-list');
    wrap.innerHTML = '';
    const busqueda = ($('#presupuestos-buscar') && $('#presupuestos-buscar').value) || '';
    const todos = DB.presupuestos.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    const items = todos.filter((p) => coincide([p.codigo, p.clienteNombre].join(' '), busqueda));
    if (items.length === 0) {
      wrap.appendChild(el('div', { class: 'empty-state', html: todos.length ? 'Ningún presupuesto coincide con la búsqueda.' : 'Todavía no creaste ningún presupuesto.' }));
      return;
    }
    items.forEach((p) => {
      const totales = calcularTotalesPresupuesto(p);
      const vence = vencimientoDe(p);
      const card = el('div', { class: 'card card-pad', style: 'cursor:pointer;display:flex;align-items:center;gap:14px' });
      card.innerHTML =
        '<span class="ic" style="width:40px;height:40px;border-radius:50%;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:none">' + icon('ic-file-dollar') + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:0.9rem">' + escapeHtml(p.codigo) + ' · ' + escapeHtml(p.clienteNombre || 'Sin cliente') + '</div>' +
        '<div style="font-size:0.78rem;color:var(--steel)">' + money(totales.total) + ' · ' + timeAgo(p.updatedAt) +
        (vence ? ' · <span style="color:' + (vence.vencido ? 'var(--error)' : 'inherit') + '">' + textoVencimiento(vence) + '</span>' : '') +
        '</div></div>' + statusPill(p.estado);
      card.appendChild(botonDuplicar(() => {
        const copia = duplicarPresupuesto(p.id);
        if (copia) { toast('Presupuesto duplicado'); openPresupuesto(copia.id); }
      }));
      card.addEventListener('click', () => openPresupuesto(p.id));
      wrap.appendChild(card);
    });
  }

  function renderPerfil() {
    $('#perfil-count-trabajos').textContent = DB.trabajos.length;
    $('#perfil-count-presupuestos').textContent = DB.presupuestos.length;
    const schemaEl = $('#perfil-schema-version');
    if (schemaEl) schemaEl.textContent = 'v' + DB_SCHEMA_VERSION;
    $('#perfil-margen').value = DB.settings.margen;
    $('#perfil-iva').value = DB.settings.iva;
    $('#perfil-tarifahora').value = DB.settings.manoObra.tarifaHora;
    $('#perfil-horasjornada').value = DB.settings.manoObra.horasJornada;
    $('#perfil-bocasjornada').value = DB.settings.manoObra.bocasPorJornada;
    $('#drive-client-id').value = DB.settings.googleClientId || '';
    $('#drive-origen').value = location.origin;
    renderPerfilBackup();
    $('#perfil-jornadascargafija').value = DB.settings.manoObra.jornadasCargaFija;
    $('#perfil-jornadastablero').value = DB.settings.manoObra.jornadasTablero;
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
      titulo: 'Cable preensamblado de aluminio, aéreo ($/m)',
      campos: [{ key: 'cablePreensambladoAluminio', tipo: 'mapa', etiqueta: (s) => '2x' + s + ' mm²' }],
      nota: 'Fucetix XLPE autoportante, para distribución aérea (luminarias de cancha, complejos de viviendas). Relevado en Fivisa el 22/09/2026. El aluminio no se consigue en cable bajo goma ni bajo plástico —esa vaina flexible es sólo para cobre—; este es el equivalente real de 2 conductores. No entra en el cálculo automático de sección: se agrega a mano en el presupuesto.',
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
        { key: 'codoPvcRigido', tipo: 'plano', etiqueta: 'Codo PVC rígido (cambio de dirección)' },
        { key: 'codoGalvanizado', tipo: 'plano', etiqueta: 'Codo caño galvanizado (cambio de dirección)' },
        { key: 'codoCajaBandeja', tipo: 'plano', etiqueta: 'Codo / caja de pase para bandeja' },
      ],
    },
    {
      titulo: 'Térmicas ($/un.)',
      campos: [
        { key: 'termicaUnipolarBase', tipo: 'plano', etiqueta: 'Térmica unipolar (hasta 40A)' },
        { key: 'termicaUnipolar63', tipo: 'plano', etiqueta: 'Térmica unipolar (50 a 63A)' },
        { key: 'termicaUnipolar125', tipo: 'plano', etiqueta: 'Térmica unipolar (80 a 125A)' },
        { key: 'termicaBipolarBase', tipo: 'plano', etiqueta: 'Térmica bipolar (hasta 40A)' },
        { key: 'termicaBipolar63', tipo: 'plano', etiqueta: 'Térmica bipolar (50 a 63A)' },
        { key: 'termicaBipolar125', tipo: 'plano', etiqueta: 'Térmica bipolar (80 a 125A)' },
        { key: 'termicaTetrapolarBase', tipo: 'plano', etiqueta: 'Térmica tetrapolar (hasta 40A)' },
        { key: 'termicaTetrapolar63', tipo: 'plano', etiqueta: 'Térmica tetrapolar (50 a 63A)' },
        { key: 'termicaTetrapolar125', tipo: 'plano', etiqueta: 'Térmica tetrapolar (80 a 125A)' },
      ],
      nota: 'Schneider Acti9 iC60N (6 kA), relevado en Fivisa el 17/09/2026 en USD, precio de lista. Por encima de 63A la iC60 no llega: el tetrapolar sale de un C120N de 10 kA. El bipolar de más de 63A queda en 0 porque a esa corriente el suministro ya es trifásico.',
    },
    {
      titulo: 'Diferenciales tipo A, 30 mA ($/un.)',
      campos: [
        { key: 'diferencialA2P', tipo: 'mapa', etiqueta: (a) => 'Bipolar ' + a + 'A' },
        { key: 'diferencialA4P', tipo: 'mapa', etiqueta: (a) => 'Tetrapolar ' + a + 'A' },
      ],
      nota: 'Chint NL1-63 tipo A, relevado en MGI el 17/09/2026 en USD. Alternativas para cargar a mano: Schneider Acti9 iID A-SI 2P 25A ($ 5.784, Fivisa) y ABB SI 4P 25A ($ 7.842 con IVA, Electro Uruguay). No hay bipolar de más de 63A: a esa corriente el suministro va trifásico.',
    },
    {
      titulo: 'Diferenciales tipo F, 30 mA ($/un.)',
      campos: [
        { key: 'diferencialF2P', tipo: 'mapa', etiqueta: (a) => 'Bipolar ' + a + 'A' },
        { key: 'diferencialF4P', tipo: 'mapa', etiqueta: (a) => 'Tetrapolar ' + a + 'A' },
      ],
      nota: 'Relevado en uy.wiautomation.com el 21/09/2026: ABB F202 F-25 bipolar, Schneider Resi9 R9R71240 F-SI bipolar 40A y ABB F204 F de 25 y 40A. No hay ninguno de 63A, ni bipolar ni tetrapolar: ese queda a cotizar. WiAutomation no es distribuidor oficial y despacha desde Europa: confirmar plazo y flete.',
    },
    {
      titulo: 'Diferenciales tipo B, 30 mA ($/un.)',
      campos: [
        { key: 'diferencialB2P', tipo: 'mapa', etiqueta: (a) => 'Bipolar ' + a + 'A' },
        { key: 'diferencialB4P', tipo: 'mapa', etiqueta: (a) => 'Tetrapolar ' + a + 'A' },
      ],
      nota: 'Bipolar de 25 y 40A: Tongou TORD4B-63 2P 40A, de MercadoLibre (USD 247 de lista el 21/09/2026), que es gama económica; el de 25A toma ese mismo precio. El de 63A y los tetrapolares son Schneider Acti9 iID B-SI (A9Z612xx / A9Z614xx) de WiAutomation, que salieron menos que los ABB equivalentes. Alternativas relevadas para cargar a mano: Schneider 2P 25A $ 17.285 y 2P 40A $ 19.411, ABB F202 B-25 $ 16.592 y ABB F204 B de 25, 40 y 63A ($ 26.660 / $ 22.001 / $ 23.053). Se usa cuando el circuito queda configurado con diferencial tipo B (por ejemplo, VE modo 3 sin RDC-DD de 6 mA o cuando el fabricante/equipo lo exige). En VE no siempre corresponde B: con RDC-DD de 6 mA puede corresponder A/F según UTE Cap. XXX y el modo de carga.',
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
        { key: 'cajaMedidorMono', tipo: 'plano', etiqueta: 'Caja para medidor monofásico' },
        { key: 'cajaMedidorTrifasica', tipo: 'plano', etiqueta: 'Caja para medidor trifásico' },
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
  function renderCatalogoDolar() {
    const d = DB.settings.dolar;
    $('#cat-dolar').value = d.cotizacion;
    const dias = diasDesde(DB.settings.preciosRevisados);
    const nota = $('#cat-revision');
    nota.textContent = dias === null ? 'Sin revisar todavía.'
      : dias === 0 ? 'Revisados hoy.'
      : 'Revisados hace ' + dias + (dias === 1 ? ' día.' : ' días.') + (dias >= DIAS_PRECIOS_VIEJOS ? ' Conviene actualizarlos.' : '');
    nota.style.color = dias !== null && dias >= DIAS_PRECIOS_VIEJOS ? 'var(--error)' : 'var(--steel)';
  }
  function marcarPreciosRevisados() {
    DB.settings.preciosRevisados = Date.now();
    saveDB();
    renderCatalogoDolar();
    toast('Catálogo marcado como revisado hoy');
  }
  function aplicarCotizacionDolar() {
    const nueva = Number($('#cat-dolar').value) || 0;
    const vieja = Number(DB.settings.dolar.cotizacion) || DOLAR_BASE;
    if (!(nueva > 0)) { toast('Poné una cotización válida'); return; }
    if (nueva === vieja) { toast('La cotización es la misma'); return; }
    const tocados = ajustarPreciosPorDolar(DB.settings.precios, vieja, nueva);
    DB.settings.dolar = { cotizacion: nueva, actualizado: Date.now() };
    DB.settings.preciosRevisados = Date.now();
    saveDB();
    renderCatalogoPrecios();
    toast(tocados + ' precio(s) actualizados con el dólar a $' + nueva);
  }

  function renderCatalogoPrecios() {
    renderCatalogoDolar();
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
        DB.settings.preciosRevisados = Date.now();
        saveDB();
        renderCatalogoDolar();
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
    DB.settings.ultimoBackup = Date.now();
    saveDB();
    renderPerfilBackup();
    toast('Copia de seguridad descargada');
  }
  /* ---------- copia en Google Drive ----------
   *
   * La copia es el mismo JSON que se baja a mano, subido al Drive del usuario.
   * Se usa el permiso más chico que existe (drive.file): la app sólo ve los
   * archivos que ella misma crea, nunca el resto del Drive. El ID de cliente lo
   * saca el usuario de la consola de Google y queda guardado en el dispositivo;
   * sin eso, Google no deja entrar desde una página.
   */
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_PREFIJO = 'adonai-backup-';
  const DIAS_SIN_RESPALDO = 7;
  let driveToken = null;  // vive en memoria: vence en una hora y se vuelve a pedir

  function cargarScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const sc = document.createElement('script');
      sc.src = src;
      sc.onload = resolve;
      sc.onerror = () => reject(new Error('sin conexión'));
      document.head.appendChild(sc);
    });
  }

  async function driveAcceso() {
    const clientId = (DB.settings.googleClientId || '').trim();
    if (!clientId) throw new Error('Falta el ID de cliente de Google (Perfil > Copia en Google Drive)');
    if (driveToken && driveToken.vence > Date.now() + 60e3) return driveToken.token;
    await cargarScript('https://accounts.google.com/gsi/client');
    return new Promise((resolve, reject) => {
      try {
        const cliente = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: DRIVE_SCOPE,
          callback: (resp) => {
            if (resp.error || !resp.access_token) { reject(new Error('No se pudo entrar con Google')); return; }
            driveToken = { token: resp.access_token, vence: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
            resolve(driveToken.token);
          },
        });
        cliente.requestAccessToken({ prompt: driveToken ? '' : 'consent' });
      } catch (e) { reject(new Error('No se pudo abrir el acceso de Google')); }
    });
  }

  async function guardarEnDrive() {
    try {
      toast('Conectando con Google...');
      const token = await driveAcceso();
      const ahora = new Date();
      const sello = ahora.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
      const nombre = DRIVE_PREFIJO + sello + '.json';
      const cuerpo = JSON.stringify(DB);
      const limite = 'adonai' + Date.now();
      const multipart =
        '--' + limite + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify({ name: nombre, mimeType: 'application/json' }) +
        '\r\n--' + limite + '\r\nContent-Type: application/json\r\n\r\n' + cuerpo +
        '\r\n--' + limite + '--';
      const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + limite },
        body: multipart,
      });
      if (!r.ok) throw new Error('Drive respondió ' + r.status);
      DB.settings.ultimoBackup = Date.now();
      saveDB();
      renderPerfilBackup();
      toast('Copia guardada en tu Drive');
    } catch (e) {
      toast(e.message || 'No se pudo guardar en Drive');
    }
  }

  async function restaurarDeDrive() {
    try {
      toast('Conectando con Google...');
      const token = await driveAcceso();
      const consulta = encodeURIComponent("name contains '" + DRIVE_PREFIJO + "' and trashed = false");
      const r = await fetch('https://www.googleapis.com/drive/v3/files?q=' + consulta +
        '&orderBy=modifiedTime desc&pageSize=5&fields=files(id,name,modifiedTime)',
        { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error('Drive respondió ' + r.status);
      const lista = (await r.json()).files || [];
      if (!lista.length) { toast('No hay copias guardadas en Drive'); return; }
      const ultima = lista[0];
      const fecha = new Date(ultima.modifiedTime).toLocaleString();
      if (!confirm('Esto reemplaza TODOS los datos de este dispositivo por la copia "' + ultima.name + '" (' + fecha + '). ¿Continuar?')) return;
      const rd = await fetch('https://www.googleapis.com/drive/v3/files/' + ultima.id + '?alt=media',
        { headers: { Authorization: 'Bearer ' + token } });
      if (!rd.ok) throw new Error('No se pudo bajar la copia');
      const data = await rd.json();
      if (!data || !Array.isArray(data.trabajos) || !Array.isArray(data.presupuestos) || !data.settings) {
        toast('La copia no tiene el formato esperado'); return;
      }
      DB = migrarEsquemaDB(data).db;
      if (!DB.settings.precios) DB.settings.precios = clonePrecios(DEFAULT_PRECIOS);
      if (!DB.settings.manoObra) DB.settings.manoObra = { ...DEFAULT_MANO_OBRA };
      if (!DB.seq) DB.seq = { trabajo: 0, presupuesto: 0 };
      saveDB();
      location.reload();
    } catch (e) {
      toast(e.message || 'No se pudo restaurar de Drive');
    }
  }

  function renderPerfilBackup() {
    const p = $('#perfil-backup-estado');
    if (!p) return;
    const dias = diasDesde(DB.settings.ultimoBackup);
    p.textContent = dias === null ? 'Todavía no hiciste ninguna copia de seguridad.'
      : dias === 0 ? 'Última copia: hoy.'
      : 'Última copia: hace ' + dias + (dias === 1 ? ' día.' : ' días.');
    p.style.color = dias === null || dias >= DIAS_SIN_RESPALDO ? 'var(--error)' : 'var(--steel)';
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
      DB = migrarEsquemaDB(data).db;
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
    const materialesCosto = t ? costoMaterialesTrabajo(t) : 0;
    const plazo = t ? estimarPlazo(t).dias : 5;
    const p = {
      id: uid('P'), codigo: 'AE-' + new Date().getFullYear() + '-' + String(DB.presupuestos.length + 1).padStart(4, '0'),
      trabajoId: trabajoId || null, clienteNombre: t ? t.cliente.nombre : '',
      materiales: materialesCosto, manoObra: calcularManoObra(plazo), traslados: 0, otros: 0,
      margen: DB.settings.margen, iva: DB.settings.iva, validez: 15, formaPago: '50% anticipo / 50% final', plazo,
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

  // Materiales con cantidad y sin precio: un presupuesto así no se puede aprobar.
  function materialesSinPrecio(p) {
    const tr = p && p.trabajoId ? DB.trabajos.find((x) => x.id === p.trabajoId) : null;
    return tr ? (tr.materiales || []).filter((m) => (Number(m.cantidad) || 0) > 0 && !(Number(m.precioUnit) > 0)) : [];
  }

  function renderPresupuestoDetalle() {
    const p = presActual;
    $('#pres-codigo').textContent = 'Presupuesto ' + p.codigo;
    $('#pres-cliente-nombre').value = p.clienteNombre || '';
    $('#pres-cliente-nombre').readOnly = !!p.trabajoId;
    $('#pres-estado-pill').outerHTML = '<span id="pres-estado-pill" class="status-pill ' + (ESTADO_CLASS[p.estado] || 'status-draft') + '">' + (ESTADO_LABEL[p.estado] || p.estado) + '</span>';
    $('#pi-materiales').textContent = money(p.materiales);
    const aviso = $('#pi-materiales-warning');
    if (aviso) {
      const sinPrecio = materialesSinPrecio(p);
      aviso.hidden = sinPrecio.length === 0;
      aviso.textContent = sinPrecio.length
        ? 'Presupuesto incompleto: ' + sinPrecio.length + (sinPrecio.length === 1 ? ' material tiene' : ' materiales tienen') +
          ' precio $0 (' + sinPrecio.slice(0, 3).map((m) => m.nombre).join(', ') + (sinPrecio.length > 3 ? '…' : '') +
          '). Cotizalos antes de aprobarlo.'
        : '';
    }
    $('#pi-manoobra').value = p.manoObra;
    $('#pi-traslados').value = p.traslados;
    $('#pi-otros').value = p.otros;
    $('#pi-margen').value = p.margen;
    $('#pi-iva').value = p.iva;
    $('#pi-validez').value = p.validez;
    const vence = vencimientoDe(p);
    const notaV = $('#pi-validez-nota');
    if (notaV) {
      notaV.textContent = vence ? textoVencimiento(vence) : '';
      notaV.style.color = vence && vence.vencido ? 'var(--error)' : 'var(--steel)';
      notaV.hidden = !vence;
    }
    $('#pi-formapago').value = p.formaPago;
    $('#pi-plazo').value = p.plazo;
    const tr = p.trabajoId ? DB.trabajos.find((x) => x.id === p.trabajoId) : null;
    const nota = $('#pi-plazo-nota');
    if (nota) {
      if (tr) {
        const e = estimarPlazo(tr);
        const partes = [];
        if (e.bocas) partes.push(e.bocas + (e.bocas === 1 ? ' boca' : ' bocas'));
        if (e.fijas) partes.push(e.fijas + (e.fijas === 1 ? ' carga fija' : ' cargas fijas'));
        if (e.tablero) partes.push('tablero');
        nota.textContent = 'Estimado para esta obra: ' + e.dias + (e.dias === 1 ? ' día' : ' días') +
          (partes.length ? ' (' + partes.join(', ') + ')' : '') + '. Se ajusta en Perfil.';
        nota.hidden = false;
      } else {
        nota.hidden = true;
      }
    }
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
    $('#drive-client-id').addEventListener('change', () => {
      DB.settings.googleClientId = $('#drive-client-id').value.trim();
      driveToken = null;
      saveDB();
      toast('ID de cliente guardado');
    });
    $('#btn-drive-guardar').addEventListener('click', guardarEnDrive);
    $('#btn-drive-restaurar').addEventListener('click', restaurarDeDrive);
    $('#btn-drive-desconectar').addEventListener('click', () => { driveToken = null; toast('Sesión de Google olvidada'); });
    $('#btn-cat-dolar').addEventListener('click', aplicarCotizacionDolar);
    $('#btn-cat-revisado').addEventListener('click', marcarPreciosRevisados);
    $('#trabajos-buscar').addEventListener('input', renderTrabajos);
    $('#presupuestos-buscar').addEventListener('input', renderPresupuestos);
    $('#btn-trabajos-nuevo').addEventListener('click', startRelevamiento);
    $('#btn-presupuestos-nuevo').addEventListener('click', () => { presActual = crearPresupuestoDesdeTrabajo(null); showView('presupuesto-detalle'); renderPresupuestoDetalle(); });
  }

  function wireCargasCircuitos() {
    $('#btn-add-carga').addEventListener('click', () => {
      draft.cargas.push({ id: uid('c'), nombre: '', categoria: 'iluminacion', potenciaW: 100, cantidad: 1, cosPhi: 1 });
      renderCargasList(); renderPotenciaResultado();
    });
    $('#f-sistema').addEventListener('change', renderPotenciaResultado);
    $('#f-acom-l').addEventListener('change', () => {
      if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
      draft.acometida.l = Number($('#f-acom-l').value) || 0;
      renderCircuitosList();
    });
    $('#f-acom-icc').addEventListener('change', () => {
      if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
      draft.acometida.iccKa = Number($('#f-acom-icc').value) > 0 ? Number($('#f-acom-icc').value) : null;
      renderCircuitosList();
    });
    [['#f-acom-kva', 'trafoKva', true], ['#f-acom-red', 'red', true], ['#f-acom-redl', 'redL', true],
     ['#f-acom-redsec', 'redSeccion', true], ['#f-acom-redmat', 'redMaterial', false]].forEach(([sel, campo, numero]) => {
      $(sel).addEventListener('change', () => {
        if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
        const v = $(sel).value;
        draft.acometida[campo] = numero ? (Number(v) > 0 ? Number(v) : null) : v;
        renderCircuitosList();
      });
    });
    $('#f-acom-subestacion').addEventListener('change', () => {
      if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
      draft.acometida.subestacion = $('#f-acom-subestacion').value;
      renderCircuitosList();
    });
    $('#f-acom-seccion').addEventListener('change', () => {
      if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
      draft.acometida.seccion = Number($('#f-acom-seccion').value) || null;
      renderCircuitosList();
    });
    $('#f-acom-neutro').addEventListener('change', () => {
      if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
      draft.acometida.neutroSeccion = Number($('#f-acom-neutro').value) || null;
      renderCircuitosList();
    });
    $('#f-acom-pe').addEventListener('change', () => {
      if (!draft.acometida) draft.acometida = { ...ACOMETIDA_DEFECTO };
      draft.acometida.peSeccion = Number($('#f-acom-pe').value) || null;
      renderCircuitosList();
    });
    $('#btn-add-circuito').addEventListener('click', () => {
      const sistema = SISTEMAS[draft.sistemaId];
      draft.circuitos.push({ id: uid('m2'), nombre: '', ib: 10, v: 230, fases: 1,
        fasesConfirmadas: sistema.fases === 1, sistemaId: sistema.id, faseAsignada: '', faseManual: false, l: 15,
        material: 'cobre', metodo: 'embutido', aislacion: 'pvc', tempAmb: 30, agrupados: 1,
        caidaMax: CAIDA_MAX_DEFAULT.fuerza, cosPhi: 1, uso: 'fuerza', expuestoSol: false, tipoProteccion: 'mcb', curvaProteccion: '', selectividadFabricante: 'pendiente', selectividadLimiteKa: null,
        iccMinFinalA: null, zCortoFinalOhm: null, tiempoDesconexionVerificadoS: null });
      renderCircuitosList();
    });
    $('#btn-add-material').addEventListener('click', () => {
      draft.materiales.push({ id: uid('mat'), nombre: '', unidad: 'un.', cantidad: 1, precioUnit: 0, auto: false });
      renderMaterialesList();
    });
    $('#btn-regenerar-materiales').addEventListener('click', () => {
      draft.materiales = generarMateriales(draft.circuitos, draft);
      draft.materialesDesactualizados = false;
      // Se guarda en el acto: si no, alguien regenera, se va derecho a hacer el
      // PDF y sale con la lista vieja, porque el PDF lee el relevamiento
      // guardado y no el borrador en pantalla.
      persistDraft();
      renderMaterialesList();
      toast('Materiales regenerados desde los circuitos');
    });
    $('#resumen-estado').addEventListener('change', () => { draft.estado = $('#resumen-estado').value; });
    $('#resumen-diferencial-tipo').innerHTML = TIPOS_DIFERENCIAL.map((t) => '<option value="' + t.v + '">' + t.label + '</option>').join('');
    $('#resumen-diferencial-tipo').addEventListener('change', () => {
      if (!draft.proteccionGeneral) draft.proteccionGeneral = { diferencialSensibilidad: 30, ambienteTierra: 'seco', resistenciaTierraOhm: null, diferencialExiste: 'desconocido', termicaExistenteA: null, diferencialExistenteA: null, sobretensionesRiesgo: 'pendiente', pararrayosLps: 'desconocido', spdExiste: 'desconocido', spdTipo: '' };
      draft.proteccionGeneral.diferencialTipo = $('#resumen-diferencial-tipo').value;
      renderResumen();
    });
    $('#resumen-diferencial-selectividad').addEventListener('change', () => {
      if (!draft.proteccionGeneral) draft.proteccionGeneral = { diferencialSensibilidad:30 };
      draft.proteccionGeneral.diferencialSelectividad = $('#resumen-diferencial-selectividad').value === 'S' ? 'S' : 'instantaneo';
      renderResumen();
    });
    $('#resumen-diferencial-sensibilidad').addEventListener('change', () => {
      if (!draft.proteccionGeneral) draft.proteccionGeneral = { diferencialSensibilidad: 30, ambienteTierra: 'seco', resistenciaTierraOhm: null, diferencialExiste: 'desconocido', termicaExistenteA: null, diferencialExistenteA: null, sobretensionesRiesgo: 'pendiente', pararrayosLps: 'desconocido', spdExiste: 'desconocido', spdTipo: '' };
      draft.proteccionGeneral.diferencialSensibilidad = Number($('#resumen-diferencial-sensibilidad').value);
      renderResumen();
    });
    $('#resumen-tierra-ambiente').addEventListener('change', () => {
      if (!draft.proteccionGeneral) draft.proteccionGeneral = { diferencialSensibilidad: 30, ambienteTierra: 'seco', resistenciaTierraOhm: null, diferencialExiste: 'desconocido', termicaExistenteA: null, diferencialExistenteA: null, sobretensionesRiesgo: 'pendiente', pararrayosLps: 'desconocido', spdExiste: 'desconocido', spdTipo: '' };
      draft.proteccionGeneral.ambienteTierra = $('#resumen-tierra-ambiente').value === 'humedo' ? 'humedo' : 'seco';
      renderResumen();
    });
    $('#resumen-tierra-resistencia').addEventListener('change', () => {
      if (!draft.proteccionGeneral) draft.proteccionGeneral = { diferencialSensibilidad: 30, ambienteTierra: 'seco', resistenciaTierraOhm: null, diferencialExiste: 'desconocido', termicaExistenteA: null, diferencialExistenteA: null, sobretensionesRiesgo: 'pendiente', pararrayosLps: 'desconocido', spdExiste: 'desconocido', spdTipo: '' };
      const v = Number($('#resumen-tierra-resistencia').value);
      draft.proteccionGeneral.resistenciaTierraOhm = v > 0 ? v : null;
      renderResumen();
    });
    $('#resumen-tiempo-diferencial-general').addEventListener('change', () => {
      const v = Number($('#resumen-tiempo-diferencial-general').value); draft.proteccionGeneral.tiempoDiferencialGeneralS = v > 0 ? v : null; renderResumen();
    });
    $('#resumen-it-imd').addEventListener('change', () => { draft.proteccionGeneral.monitorAislamientoIt = $('#resumen-it-imd').value; renderResumen(); });
    $('#resumen-it-masas').addEventListener('change', () => { draft.proteccionGeneral.masasInterconectadasIt = $('#resumen-it-masas').value; renderResumen(); });
    $('#resumen-it-id').addEventListener('change', () => { const v=Number($('#resumen-it-id').value); draft.proteccionGeneral.corrientePrimerDefectoMa = v>0?v:null; renderResumen(); });
    $('#resumen-eqp-principal-aplica').addEventListener('change',()=>{draft.proteccionGeneral.equipotencialPrincipalAplica=$('#resumen-eqp-principal-aplica').value;renderResumen();});
    $('#resumen-eqp-principal-seccion').addEventListener('change',()=>{const v=Number($('#resumen-eqp-principal-seccion').value);draft.proteccionGeneral.equipotencialPrincipalSeccion=v>0?v:null;renderResumen();});
    $('#resumen-eqp-principal-continuidad').addEventListener('change',()=>{draft.proteccionGeneral.equipotencialPrincipalContinuidad=$('#resumen-eqp-principal-continuidad').value;renderResumen();});
    $('#resumen-eqp-suplementaria-aplica').addEventListener('change',()=>{draft.proteccionGeneral.equipotencialSuplementariaAplica=$('#resumen-eqp-suplementaria-aplica').value;renderResumen();});
    $('#resumen-eqp-suplementaria-seccion').addEventListener('change',()=>{const v=Number($('#resumen-eqp-suplementaria-seccion').value);draft.proteccionGeneral.equipotencialSuplementariaSeccion=v>0?v:null;renderResumen();});
    $('#resumen-eqp-suplementaria-continuidad').addEventListener('change',()=>{draft.proteccionGeneral.equipotencialSuplementariaContinuidad=$('#resumen-eqp-suplementaria-continuidad').value;renderResumen();});
    ['fecha','tecnico','instrumento','serie'].forEach((f)=>{
      $('#resumen-protocolo-'+f).addEventListener('change',()=>{ if(!draft.protocoloEnsayos) draft.protocoloEnsayos={fecha:'',tecnico:'',instrumento:'',serie:'',calibracion:'pendiente'}; draft.protocoloEnsayos[f]=$('#resumen-protocolo-'+f).value.trim(); renderResumen(); });
    });
    $('#resumen-protocolo-calibracion').addEventListener('change',()=>{ if(!draft.protocoloEnsayos) draft.protocoloEnsayos={}; draft.protocoloEnsayos.calibracion=$('#resumen-protocolo-calibracion').value; renderResumen(); });
    $('#resumen-prueba-funcional').addEventListener('change',()=>{draft.proteccionGeneral.ensayoFuncionalProtecciones=$('#resumen-prueba-funcional').value;renderResumen();});
    $('#resumen-ensayo-rcd-general').addEventListener('change',()=>{draft.proteccionGeneral.ensayoRcdGeneral=$('#resumen-ensayo-rcd-general').value;renderResumen();});
    $('#resumen-termica-existente').addEventListener('change', () => {
      const v = Number($('#resumen-termica-existente').value); draft.proteccionGeneral.termicaExistenteA = v > 0 ? v : null; renderResumen();
    });
    $('#resumen-diferencial-existe').addEventListener('change', () => { draft.proteccionGeneral.diferencialExiste = $('#resumen-diferencial-existe').value; renderResumen(); });
    $('#resumen-diferencial-in-existente').addEventListener('change', () => {
      const v = Number($('#resumen-diferencial-in-existente').value); draft.proteccionGeneral.diferencialExistenteA = v > 0 ? v : null; renderResumen();
    });
    $('#resumen-sobretensiones-riesgo').addEventListener('change', () => { draft.proteccionGeneral.sobretensionesRiesgo = $('#resumen-sobretensiones-riesgo').value; renderResumen(); });
    $('#resumen-pararrayos-lps').addEventListener('change', () => { draft.proteccionGeneral.pararrayosLps = $('#resumen-pararrayos-lps').value; renderResumen(); });
    $('#resumen-spd-existe').addEventListener('change', () => { draft.proteccionGeneral.spdExiste = $('#resumen-spd-existe').value; renderResumen(); });
    $('#resumen-spd-tipo').addEventListener('change', () => { draft.proteccionGeneral.spdTipo = $('#resumen-spd-tipo').value; renderResumen(); });
    ['responsable','categoria','fecha'].forEach((f)=>{
      $('#cierre-'+f).addEventListener('change',()=>{ const c=cierreBase(draft); const map={responsable:'responsableNombre',categoria:'categoriaUTE',fecha:'fecha'}; c[map[f]]=$('#cierre-'+f).value.trim(); renderCierreProfesional(); });
    });
    $('#cierre-declaracion').addEventListener('change',()=>{ cierreBase(draft).declaracion=$('#cierre-declaracion').value; renderCierreProfesional(); });
    $('#cierre-firma').addEventListener('change', async()=>{ const f=$('#cierre-firma').files[0]; if(!f)return; try{ cierreBase(draft).firmaDataUrl=await comprimirImagenArchivo(f,800,0.72); renderCierreProfesional(); toast('Firma gráfica incorporada'); }catch(e){ toast('No se pudo procesar la firma'); } });
    $('#cierre-fotos').addEventListener('change', async()=>{ const c=cierreBase(draft); const disponibles=Math.max(0,6-c.fotos.length); const files=Array.from($('#cierre-fotos').files).slice(0,disponibles); for(const f of files){ try{ c.fotos.push({nombre:f.name,dataUrl:await comprimirImagenArchivo(f,1200,0.68)}); }catch(e){} } $('#cierre-fotos').value=''; renderCierreProfesional(); toast('Anexos fotográficos actualizados'); });
    $('#btn-pdf-memoria').addEventListener('click',()=>generarDocumentoCierre('memoria'));
    $('#btn-pdf-protocolo').addEventListener('click',()=>generarDocumentoCierre('protocolo'));
    $('#btn-pdf-unifilar').addEventListener('click',()=>generarDocumentoCierre('unifilar'));
    $('#btn-pdf-expediente').addEventListener('click',()=>generarDocumentoCierre('expediente'));
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
    ['#cond-seccion', '#cond-in', '#cond-rendimiento'].forEach((sel) => {
      $(sel).addEventListener('change', calcularConductorForm);
    });
    // cada uso trae su caída máxima: iluminación admite 3 % y el resto 5 %
    $('#cond-disposicion').addEventListener('change', calcularConductorForm);
    ['#cond-terreno-rho', '#cond-terreno-prof'].forEach((sel) => $(sel).addEventListener('input', calcularConductorForm));
    $('#cond-montaje').addEventListener('change', calcularConductorForm);
    $('#cond-separados').addEventListener('change', calcularConductorForm);
    ['#cond-sol', '#cond-prot-tipo'].forEach((sel) => $(sel).addEventListener('change', calcularConductorForm));
    $('#cond-subestacion').addEventListener('change', calcularConductorForm);
    ['#cond-caida-arriba', '#cond-i2', '#cond-icc', '#cond-podercorte', '#cond-icu', '#cond-i2t', '#cond-tiempo'].forEach((sel) => {
      $(sel).addEventListener('input', calcularConductorForm);
    });
    $('#cond-uso').addEventListener('change', () => {
      $('#cond-caidamax').value = CAIDA_MAX_DEFAULT[$('#cond-uso').value] || 5;
      calcularConductorForm();
    });
    $('#btn-cond-guardar').addEventListener('click', () => { calcularConductorForm(); toast('Cálculo guardado en el dispositivo'); });
    $('#btn-cond-a-relevamiento').addEventListener('click', () => {
      const r = calcularConductorForm();
      if (!draft) startRelevamiento();
      const fases = Number($('#cond-fases .active').dataset.fases);
      draft.circuitos.push({
        id: uid('cc'), nombre: 'Circuito (' + $('#cond-uso').value + ')', ib: r.ib, v: Number($('#cond-tension').value), fases,
        fasesConfirmadas: true, fasesManual: true, sistemaId: draft.sistemaId || 'tri_tt', faseAsignada: '', faseManual: false,
        l: Number($('#cond-longitud').value) || 0, material: $('#cond-material').value, metodo: $('#cond-metodo').value,
        tempAmb: Number($('#cond-temp').value) || 30, agrupados: Number($('#cond-agrupados').value) || 1,
        resistividadTerreno: Number($('#cond-terreno-rho').value) || null, profundidadEnterrado: Number($('#cond-terreno-prof').value) || 0.5,
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
      if (materialesSinPrecio(presActual).length) {
        toast('No se puede aprobar: hay materiales con precio $0.');
        renderPresupuestoDetalle();
        return;
      }
      presActual.estado = 'aprobado';
      savePresupuesto();
      renderPresupuestoDetalle();
      toast('Presupuesto aprobado');
    });
    $('#btn-pres-pdf').addEventListener('click', () => generarPdfPresupuesto(presActual));
    $('#btn-pres-pdf-interno').addEventListener('click', () => generarPdfPresupuesto(presActual, { interno: true }));
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

  // jsPDF escribe con las fuentes base del PDF, que sólo entienden Latin-1. Los
  // acentos entran, pero el guión largo y las comillas tipográficas caen en un
  // rango que Latin-1 usa para caracteres de control: en pantalla se ven y en el
  // PDF desaparecen, dejando un hueco. Se cambian por su equivalente simple.
  const PDF_REEMPLAZOS = [[/[—–]/g, '-'], [/[‘’]/g, "'"],
                          [/[“”]/g, '"'], [/…/g, '...'], [/ /g, ' ']];
  function pdfTexto(t) {
    let r = String(t == null ? '' : t);
    for (const [de, a] of PDF_REEMPLAZOS) r = r.replace(de, a);
    return r;
  }
  function pdfFilas(filas) {
    return filas.map((f) => f.map(pdfTexto));
  }

  /**
   * Arma el PDF del presupuesto.
   * opciones.interno: incluye el desglose de costos y el precio de cada
   * material. Es la copia para la empresa; la del cliente lleva sólo el total.
   */
  async function construirPdfPresupuesto(p, opciones) {
    const interno = !!(opciones && opciones.interno);
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
    // Lo que se dibuja a mano —títulos, la caja del total, el texto final— no
    // pasa solo de hoja como las tablas: si no entra, quedaba dibujado fuera
    // de la página. Antes de cada bloque se mira si entra entero y, si no, se
    // empieza hoja nueva.
    const pie = doc.internal.pageSize.getHeight() - margin;
    const margenTablas = { left: margin, right: margin, top: margin, bottom: margin };
    const lugarPara = (alto) => {
      if (y + alto > pie) { doc.addPage(); y = margin; }
    };
    // Alto aproximado de una fila de las tablas de 9 pt.
    const FILA = 7.8;

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
    doc.text((interno ? 'Memoria técnica y presupuesto ' : 'Presupuesto ') + p.codigo, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
    doc.text(pdfTexto('Cliente: ' + (p.clienteNombre || '-')), margin, y);
    y += 5;
    // Datos de contacto y de la obra: si el presupuesto se imprime y circula,
    // tiene que poder saberse de qué obra habla sin volver a la app.
    const datos = [];
    if (trabajo) {
      const tel = trabajo.cliente.telefono || trabajo.cliente.whatsapp;
      if (tel) datos.push('Tel. ' + tel);
      const lugar = [trabajo.obra.nombre, trabajo.obra.direccion, trabajo.obra.localidad]
        .filter(Boolean).join(', ');
      if (lugar) datos.push('Obra: ' + lugar);
    }
    datos.forEach((linea) => {
      doc.text(pdfTexto(linea), margin, y);
      y += 5;
    });
    const fecha = new Date(p.createdAt || Date.now());
    let fechaTxt;
    try { fechaTxt = fecha.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { fechaTxt = fecha.toLocaleDateString(); }
    doc.text(pdfTexto('Fecha: ' + fechaTxt), margin, y);
    y += 6;
    if (interno) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(179, 38, 30);
      doc.text('COPIA INTERNA - NO ENTREGAR AL CLIENTE', margin, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(111, 114, 119);
      y += 6;
    }

    if (naturaleza) {
      const descLines = doc.splitTextToSize(NATURALEZA_DESC[naturaleza] || '', pageWidth - 2 * margin - 8);
      const boxH = 8 + descLines.length * 5 + 2;
      doc.setFillColor(244, 244, 245);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, boxH, 2, 2, 'F');
      let ty = y + 7;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(23, 23, 25);
      doc.text(naturaleza, margin + 4, ty);
      ty += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(23, 23, 25);
      doc.text(descLines, margin + 4, ty);
      y += boxH + 8;
    } else {
      y += 4;
    }

    if (interno && trabajo) {
      const sistemaResumen = SISTEMAS[trabajo.sistemaId] || SISTEMAS.tri_tt;
      const potenciaResumen = calcularPotencia(trabajo.cargas || [], sistemaResumen, trabajo.factores || {});
      const previaEstadoPdf = caidaPreviaDe(trabajo);
      const ctxEstadoPdf = contextoCortocircuito(trabajo);
      const estadosResumen = [];
      let cantCumple = 0, cantPendiente = 0, cantNoCumple = 0;
      (trabajo.circuitos || []).forEach((c) => {
        const calc = calcularCircuito(c, previaEstadoPdf);
        const comp = calc.apto ? comprobarCircuito(datosCircuito(c, previaEstadoPdf, ctxEstadoPdf)) : { estado: 'no_cumple' };
        estadosResumen.push(comp.estado);
        if (comp.estado === 'cumple') cantCumple++;
        else if (comp.estado === 'pendiente') cantPendiente++;
        else cantNoCumple++;
      });
      const pgResumen = calcularProteccionGeneral(trabajo);
      if (pgResumen.aplica) estadosResumen.push(comprobarProteccionGeneral(trabajo, pgResumen).estado);
      estadosResumen.push(comprobarEquipotencialidad(trabajo).estado);
      estadosResumen.push(comprobarProtocoloEnsayos(trabajo).estado);
      const estadoGlobal = estadosResumen.includes('no_cumple') ? 'NO CUMPLE' : (estadosResumen.includes('pendiente') ? 'PENDIENTE' : (estadosResumen.length ? 'VERIFICADO' : 'PENDIENTE'));

      lugarPara(48);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
      doc.text('RESUMEN TECNICO DE LA INSTALACION', margin, y); y += 5;
      doc.autoTable({
        startY: y, margin: margenTablas,
        head: [['Estado global','Sistema','Pot. instalada','Pot. demandada']],
        body: pdfFilas([[estadoGlobal, sistemaResumen.nombre || trabajo.sistemaId || '-', fmt(potenciaResumen.potenciaInstalada/1000) + ' kW', fmt(potenciaResumen.pDemandTotal/1000) + ' kW']]),
        theme:'plain', styles:{fontSize:8,textColor:[23,23,25],cellPadding:{top:2,bottom:2,left:0,right:0},lineWidth:{bottom:0.2},lineColor:[226,227,229]},
        headStyles:{fontSize:7,textColor:[111,114,119],fontStyle:'bold'}
      });
      y = doc.lastAutoTable.finalY + 3;
      doc.autoTable({
        startY:y, margin:margenTablas,
        head:[['Circuitos','Verificados','Pendientes','No cumple']],
        body:pdfFilas([[(trabajo.circuitos||[]).length, cantCumple, cantPendiente, cantNoCumple]]),
        theme:'plain', styles:{fontSize:8,textColor:[23,23,25],cellPadding:{top:2,bottom:2,left:0,right:0},lineWidth:{bottom:0.2},lineColor:[226,227,229]},
        headStyles:{fontSize:7,textColor:[111,114,119],fontStyle:'bold'},
        columnStyles:{0:{halign:'right'},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}}
      });
      y = doc.lastAutoTable.finalY + 3;
      const criterioEstado = estadoGlobal === 'VERIFICADO'
        ? 'La memoria no registra pendientes ni incumplimientos en las comprobaciones aplicables con los datos cargados.'
        : (estadoGlobal === 'PENDIENTE'
          ? 'La memoria contiene datos, mediciones o validaciones pendientes. No debe interpretarse como cierre técnico definitivo.'
          : 'La memoria registra al menos un incumplimiento que debe corregirse antes del cierre técnico.');
      const resumenNota = doc.splitTextToSize(pdfTexto(criterioEstado), pageWidth - 2*margin);
      doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(111,114,119); doc.text(resumenNota, margin, y);
      y += resumenNota.length*3.2 + 7;
    }

    if (trabajo && trabajo.circuitos && trabajo.circuitos.length) {
      const previaResumenPdf = caidaPreviaDe(trabajo);
      const ctxResumenPdf = contextoCortocircuito(trabajo);
      const filasCircuitos = trabajo.circuitos
        .map((c) => ({
          c,
          calc: calcularCircuito(c),
          comp: comprobarCircuito(datosCircuito(c, previaResumenPdf, ctxResumenPdf)),
        }))
        .filter(({ calc }) => calc.apto)
        .map(({ c, calc, comp }) => [
          c.nombre || 'Circuito',
          calc.seccionAdoptada + ' mm²',
          calc.breaker + ' A curva ' + calc.curva,
          comp.estado === 'cumple' ? 'Verificado' : (comp.estado === 'pendiente' ? 'Pendiente' : 'No cumple'),
        ]);
      if (filasCircuitos.length) {
        lugarPara(4 + FILA * 3);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
        doc.text('CIRCUITOS', margin, y);
        y += 4;
        doc.autoTable({
          startY: y,
          margin: margenTablas,
          head: [['Circuito', 'Sección de cable', 'Protección', 'Estado']],
          body: pdfFilas(filasCircuitos),
          theme: 'plain',
          styles: { fontSize: 9, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
          headStyles: { textColor: [111, 114, 119], fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
          columnStyles: { 1: { halign: 'right', cellWidth: 32 }, 2: { halign: 'right', cellWidth: 36 }, 3: { halign: 'right', cellWidth: 24 } },
        });
        y = doc.lastAutoTable.finalY + 4;
        // Cita la fuente normativa usada por el motor de cálculo (NORMATIVE_PACK), sin
        // afirmar "verificado" — el paquete normativo puede seguir en estado "pendiente"
        // (falta confirmación de un técnico instalador autorizado por UTE), eso no se le oculta al
        // cliente pero tampoco se sobreafirma acá.
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(111, 114, 119);
        const textoNormaPdf = NORMATIVE_PACK.estado === 'verificado'
          ? 'Secciones y protecciones comprobadas según ' + NORMATIVE_PACK.nombre + '.'
          : 'Cálculo según ' + NORMATIVE_PACK.nombre + '. Cada circuito informa su propio estado (Verificado / Pendiente / No cumple). ' +
            'El paquete ' + NORMATIVE_PACK.version + ' incorpora resistividad/profundidad del terreno, sobretensiones, protecciones generales existentes, auditoría de datos esenciales, alimentación 1φ/3φ por circuito, protección diferencial individual de los puntos de carga VE, balance de fases, verificación separada de fase, neutro y PE del alimentador, selectividad, Icc mínima/tiempo de desconexión, PE/equipotencialidad y protocolo de puesta en servicio IEC 60364-6.';
        const normLines = doc.splitTextToSize(pdfTexto(textoNormaPdf), pageWidth - 2 * margin);
        lugarPara(normLines.length * 4);
        doc.text(normLines, margin, y);
        y += normLines.length * 4 + 8;
      }
    }

    // La copia interna lleva la comprobación de cada circuito, con los números
    // que respaldan el cálculo y la norma que los pide.
    if (interno && trabajo && trabajo.circuitos && trabajo.circuitos.length) {
      const previaPdf = caidaPreviaDe(trabajo);
      const ctxCortoPdf = contextoCortocircuito(trabajo);
      let hayReferencia = false;
      let hayPlaza = false;
      let haySubestacion = false;
      const detallesTerrenoPdf = [];
      const detallesVePdf = [];
      const auditoriaCircuitosPdf = [];
      const balancePdf = calcularBalanceFases(trabajo);
      if (balancePdf.aplica) {
        lugarPara(4 + FILA * 4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
        doc.text('BALANCE DE FASES', margin, y); y += 4;
        doc.autoTable({
          startY:y, margin:margenTablas,
          head:[['L1','L2','L3','Máxima','Desequilibrio','Límite UTE','Estado']],
          body:pdfFilas([[
            fmt(balancePdf.corrientes[0]) + ' A', fmt(balancePdf.corrientes[1]) + ' A', fmt(balancePdf.corrientes[2]) + ' A',
            (balancePdf.faseMax || '—') + ' · ' + fmt(balancePdf.corrienteMax) + ' A', fmt(balancePdf.desequilibrioPct) + ' %',
            balancePdf.limitePct !== null ? fmt(balancePdf.limitePct,0) + ' %' : 'Pendiente',
            balancePdf.estado === 'cumple' ? 'Verificado' : (balancePdf.estado === 'pendiente' ? 'Pendiente' : 'No cumple')
          ]]), theme:'plain',
          styles:{fontSize:8,textColor:[23,23,25],cellPadding:{top:2,bottom:2,left:0,right:0},lineWidth:{bottom:0.2},lineColor:[226,227,229]},
          headStyles:{textColor:[111,114,119],fontStyle:'bold',fontSize:7,lineWidth:{bottom:0.2},lineColor:[226,227,229]},
          columnStyles:{0:{halign:'right'},1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'}},
        });
        y = doc.lastAutoTable.finalY + 3;
        const detalleBalance = 'Potencia contratada/proyectada: ' + (balancePdf.potenciaContratadaKw !== null ? fmt(balancePdf.potenciaContratadaKw,1) + ' kW (' + balancePdf.fuentePotencia + ')' : 'pendiente') + '. Índice aplicado: máxima desviación de corriente respecto del promedio / promedio × 100. UTE Cap. II §9 fija 20 % hasta 50 kW y 15 % por encima; la fórmula porcentual es el criterio técnico documentado de la app.';
        const bl = doc.splitTextToSize(pdfTexto(detalleBalance), pageWidth - 2*margin); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(bl,margin,y); y += bl.length*3.2 + 5;
      }
      const filasComp = trabajo.circuitos.map((c) => {
        const comp = comprobarCircuito(datosCircuito(c, previaPdf, ctxCortoPdf));
        if (comp.factorReferencia) hayReferencia = true;
        if (comp.iccFuente === 'plaza') hayPlaza = true;
        if (comp.iccFuente === 'subestacion') haySubestacion = true;
        if (c.metodo === 'enterrado') {
          const t = comp.terreno || factorTerrenoEnterrado(c);
          detallesTerrenoPdf.push((c.nombre || 'Circuito') + ': ρt ' +
            (t.rho !== null ? fmt(t.rho) + ' K·m/W' : 'pendiente') + ' · profundidad ' +
            (t.profundidad !== null ? fmt(t.profundidad) + ' m' : 'pendiente') + ' · fρ ' + fmt(comp.fr || 1, 2) +
            (t.estado === 'cumple' ? ' · dentro del alcance tabulado' : ' · verificación pendiente'));
        }
        if (c.equipo === 'cargador_ve') {
          const dVe = diferencialDelCircuito(c);
          detallesVePdf.push((c.nombre || 'Circuito VE') + ': modo ' + (c.modoCargaVe || 'pendiente') +
            ' · diferencial individual ' + ((c.diferencialIndividualVe || 'desconocido') === 'si' ? 'confirmado/proyectado' : ((c.diferencialIndividualVe || 'desconocido') === 'no' ? 'NO' : 'pendiente')) +
            ' · solución diferencial ' + textoTipoDiferencial(dVe.tipo) + ' ≤ 30 mA' +
            (String(c.modoCargaVe) === '3' ? (c.rdcdd6mA ? ' + RDC-DD 6 mA' : ' (sin RDC-DD confirmado)') : ''));
        }
        const mensajesAuditoria = comp.causas.map((x) => 'NO CUMPLE: ' + x)
          .concat(comp.pendientes.map((x) => 'PENDIENTE: ' + x));
        if (mensajesAuditoria.length) {
          auditoriaCircuitosPdf.push({
            nombre: (c.nombre || 'Circuito') + ' · ' + (c.fases || '?') + 'φ ' + (Number(c.v) > 0 ? fmt(Number(c.v), 0) + ' V' : 'tensión pendiente'),
            mensajes: mensajesAuditoria,
          });
        }
        return [(c.nombre || 'Circuito') + (comp.factorReferencia ? ' *' : '') + (comp.iccFuente === 'plaza' ? ' **' : ''),
                comp.seccion ? comp.seccion + ' mm²' : '-',
                fmt(comp.ib) + ' A',
                comp.in ? comp.in + ' A' : '-',
                comp.poderCorteKa !== null ? fmt(comp.poderCorteKa, 0) + ' kA' : '-',
                comp.iccMinFinalA !== null ? fmt(comp.iccMinFinalA,0) + ' A' : '-',
                comp.cumpleTiempoDesconexion === true ? 'OK' : (comp.cumpleTiempoDesconexion === false ? 'No' : 'Pend.'),
                fmt(comp.iz) + ' A',
                fmt(comp.dUPctTotal) + ' %',
                comp.estado === 'cumple' ? 'Verificado' : (comp.estado === 'pendiente' ? 'Pendiente' : 'No cumple')];
      });
      lugarPara(4 + FILA * 3);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
      doc.text('COMPROBACION DE CIRCUITOS', margin, y);
      y += 4;
      doc.autoTable({
        startY: y,
        margin: margenTablas,
        head: [['Circuito', 'Sección', 'Ib', 'In', 'PdC', 'Ik min', 't desc.', 'Iz corr.', 'Caída total', 'Estado']],
        body: pdfFilas(filasComp),
        theme: 'plain',
        styles: { fontSize: 8, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
        headStyles: { textColor: [111, 114, 119], fontStyle: 'bold', fontSize: 7, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' } },
      });
      y = doc.lastAutoTable.finalY + 4;
      if (detallesTerrenoPdf.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(111, 114, 119);
        const tt = doc.splitTextToSize(pdfTexto('ENTERRADOS · factor térmico de terreno aplicado'), pageWidth - 2 * margin);
        doc.text(tt, margin, y);
        y += tt.length * 3.2;
        doc.setFont('helvetica', 'normal');
        detallesTerrenoPdf.forEach((detalle) => {
          const dl = doc.splitTextToSize(pdfTexto('• ' + detalle), pageWidth - 2 * margin);
          lugarPara(dl.length * 3.2 + 1);
          doc.text(dl, margin, y);
          y += dl.length * 3.2;
        });
        y += 2;
      }
      if (detallesVePdf.length) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(111, 114, 119);
        const tv = doc.splitTextToSize(pdfTexto('VE · protección diferencial individual por punto'), pageWidth - 2 * margin);
        doc.text(tv, margin, y);
        y += tv.length * 3.2;
        doc.setFont('helvetica', 'normal');
        detallesVePdf.forEach((detalle) => {
          const dl = doc.splitTextToSize(pdfTexto('• ' + detalle), pageWidth - 2 * margin);
          lugarPara(dl.length * 3.2 + 1);
          doc.text(dl, margin, y);
          y += dl.length * 3.2;
        });
        y += 2;
      }
      if (auditoriaCircuitosPdf.length) {
        lugarPara(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(111, 114, 119);
        doc.text('CAUSAS Y PENDIENTES POR CIRCUITO', margin, y);
        y += 4;
        auditoriaCircuitosPdf.forEach((item) => {
          lugarPara(8);
          doc.setFont('helvetica', 'bold');
          const nl = doc.splitTextToSize(pdfTexto(item.nombre), pageWidth - 2 * margin);
          doc.text(nl, margin, y);
          y += nl.length * 3.2;
          doc.setFont('helvetica', 'normal');
          item.mensajes.forEach((mensaje) => {
            const ml = doc.splitTextToSize(pdfTexto('• ' + mensaje), pageWidth - 2 * margin - 4);
            lugarPara(ml.length * 3.2 + 1);
            doc.text(ml, margin + 4, y);
            y += ml.length * 3.2;
          });
          y += 1;
        });
        y += 1;
      }
      const selTermPdf = comprobarSelectividadTermicas(trabajo);
      const selRcdPdf = comprobarSelectividadDiferenciales(trabajo);
      lugarPara(14);
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(111,114,119);
      doc.text('COORDINACION Y SELECTIVIDAD', margin, y); y += 4;
      doc.autoTable({
        startY:y, margin:margenTablas,
        head:[['Protecciones','Estado','Criterio']],
        body:pdfFilas([
          ['Térmicas general ↔ circuitos', selTermPdf.estado === 'cumple' ? 'Verificada' : (selTermPdf.estado === 'no_selectiva' ? 'No selectiva' : 'Pendiente'), 'IEC: total/parcial según curvas o tablas del fabricante e Icc'],
          ['Diferenciales en cascada', selRcdPdf.estado === 'cumple' ? 'Verificada' : (selRcdPdf.estado === 'no_aplica' ? 'No aplica' : (selRcdPdf.estado === 'no_selectiva' ? 'No selectiva' : 'Pendiente')), 'Referencia IEC: IΔn arriba ≥ 3× abajo + cabecera tipo S/temporizada']
        ]), theme:'plain',
        styles:{fontSize:8,textColor:[23,23,25],cellPadding:{top:2,bottom:2,left:0,right:0},lineWidth:{bottom:0.2},lineColor:[226,227,229]},
        headStyles:{textColor:[111,114,119],fontStyle:'bold',fontSize:7,lineWidth:{bottom:0.2},lineColor:[226,227,229]}
      });
      y=doc.lastAutoTable.finalY+3;
      const selDetallesPdf = selTermPdf.detalles.map((x)=>x.circuito+': '+x.motivo).concat(selRcdPdf.detalles.map((x)=>x.circuito+': '+x.motivo));
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(111,114,119);
      selDetallesPdf.forEach((detalle)=>{ const dl=doc.splitTextToSize(pdfTexto('• '+detalle),pageWidth-2*margin); lugarPara(dl.length*3.2+1); doc.text(dl,margin,y); y+=dl.length*3.2; });
      y+=2;

      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(111, 114, 119);
      const refs = doc.splitTextToSize(pdfTexto(
        (hayReferencia
          ? '* Factor de agrupamiento con valor de referencia de IEC 60364-5-52 (Tabla B.52.17 al aire y en bandeja, B.52.19 en caños enterrados separados), no del reglamento de UTE: ' + (textoAprobacionSupuesto2() ? 'criterio ' + textoAprobacionSupuesto2() + ' (supuesto 2). ' : 'pendiente de confirmación por técnico instalador autorizado por UTE (supuesto 2). ')
          : '') +
        (hayPlaza
          ? '** Poder de corte de plaza: la térmica se cotiza con 6 kA (Icn según IEC 60898-1, primer escalón de la gama) porque no se conoce la corriente de cortocircuito del tablero. El cortocircuito de ese circuito no está verificado numéricamente contra una Icc real. '
          : '') +
        (haySubestacion
          ? 'Instalación con subestación propia: falta la corriente de cortocircuito en el tablero (Anexo, Tabla A); no se aplica el valor de plaza y la protección queda a definir. '
          : '') +
        'Cómo se comprobó cada circuito. Capacidad de conducción: Iz = I de tabla x factor de temperatura (Tabla XIV, escalón superior) x factor de agrupamiento x factor solar (0,90 si está al sol) x factor de terreno cuando es enterrado, ' +
        'y se verifica Iz >= Ib (Reglamento de Baja Tensión de UTE, Capítulo II - Anexo, Tablas VI a XIV, §3.3.2 y §5.1; para el agrupamiento se cuentan también el neutro y la tierra, criterio más exigente que el reglamento; al aire y en bandeja, IEC 60364-5-52 Tabla B.52.17 según el montaje, sin reducción si entre circuitos hay más de 2 diámetros exteriores; en caños enterrados separados, Tabla B.52.19 según la distancia, sin reducción a más de 1 m). ' +
        'Coordinación con la protección: Ib <= In <= Iz (UTE, Capítulo V numeral 1.a; formulación explícita en IEC 60364-4-43:2023 §431.4.2, referencia técnica complementaria, ' +
        'que agrega I2 <= 1,45 Iz, cumplida porque en los termomagnéticos IEC 60898-1 es I2 = 1,45 In). ' +
        'Caída de tensión: e = 2LW/(KSV) en monofásico y LW/(KSV) en trifásico, con la conductividad de servicio (Cu/PVC 48,4; Cu/XLPE 45,5; Al/PVC 29,4; Al/XLPE 27,6), ' +
        'sumando la caída del alimentador entre el medidor y el tablero, contra un máximo de 3 % en alumbrado y 5 % en los demás usos (UTE, Capítulo II - Anexo, numeral 8). ' +
        'Cortocircuito (Capítulo V §1.b, Anexo §7 y Tabla A): el poder de corte que se compara es el Icn de la IEC 60898-1 en termomagnéticos (el Icu de la IEC 60947-2 no se usa) y el Icu en otros dispositivos; la verificación térmica requiere la energía pasante del termomagnético. ' +
        'Las Tablas B y C se usan con los valores publicados literalmente: si la celda requerida participa de una anomalía no monótona, la app no inventa una corrección y deja la Icc pendiente. ' +
        'Para VE, UTE RBT Cap. XXX §9.4.2 exige protección diferencial individual por Punto de Conexión, IΔn ≤ 30 mA y corte de todos los conductores activos; la selección de tipo depende del modo de carga. ' +
        'Icc mínima al final: para termomagnéticos IEC 60898-1 se compara con el extremo superior de la banda magnética (B 5·In, C 10·In, D 20·In). El tiempo máximo que soporta el conductor a esa Icc mínima se obtiene de la relación térmica del UTE RBT Cap. II - Anexo §7 (equivalente a I²t admisible / Ik,min²). Si no se garantiza la zona magnética, la app exige leer/documentar el tiempo de actuación en la curva del fabricante y lo compara con ese tiempo térmico admisible.'),
        pageWidth - 2 * margin);
      doc.text(refs, margin, y);
      y += refs.length * 3.2 + 8;
    }

    if (interno && trabajo) {
      const alimPdf = calcularAcometida(trabajo);
      lugarPara(4 + FILA * 7);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
      doc.text('ALIMENTADOR GENERAL', margin, y); y += 4;
      const estadoAlim = alimPdf.estado === 'cumple' ? 'Verificado' : (alimPdf.estado === 'pendiente' ? 'Pendiente' : 'No cumple');
      doc.autoTable({
        startY:y, margin:margenTablas,
        head:[['Magnitud','Resultado','Estado']],
        body:pdfFilas([
          ['Fase', (alimPdf.seccion ? fmt(alimPdf.seccion) + ' mm² Cu' : 'Pendiente') + ' · Ib diseño ' + fmt(alimPdf.ibDiseno) + ' A · Iz ' + fmt(alimPdf.iz) + ' A', alimPdf.termicaIn ? 'Verificado' : 'No cumple'],
          ['Neutro', !alimPdf.tieneNeutro ? 'No aplica' : ((alimPdf.neutroSeccion ? fmt(alimPdf.neutroSeccion) + ' mm² Cu' : 'Pendiente') + (alimPdf.neutroCorriente !== null ? ' · I_N fundamental ≈ ' + fmt(alimPdf.neutroCorriente) + ' A' : '')), !alimPdf.tieneNeutro ? 'No aplica' : (alimPdf.pendientes.some((x)=>x.indexOf('Neutro:')===0) ? 'Pendiente' : (alimPdf.causas.some((x)=>x.indexOf('Neutro:')===0) ? 'No cumple' : 'Verificado'))],
          ['PE', alimPdf.peSeccion ? fmt(alimPdf.peSeccion) + ' mm² Cu' + (alimPdf.peMin ? ' · mínimo adoptado ' + fmt(alimPdf.peMin) + ' mm²' : '') : 'Pendiente', alimPdf.pendientes.some((x)=>x.indexOf('PE:')===0) ? 'Pendiente' : (alimPdf.causas.some((x)=>x.indexOf('PE:')===0) ? 'No cumple' : 'Verificado')],
          ['Protección general', alimPdf.termicaIn ? fmt(alimPdf.termicaIn,0) + ' A · Ib ≤ In ≤ Iz' : 'Sin coordinación disponible', alimPdf.termicaIn ? 'Verificado' : 'No cumple'],
          ['Caída medidor → tablero', fmt(alimPdf.dU) + ' V · ' + fmt(alimPdf.dUPct) + ' %', alimPdf.dUPct <= 3 ? 'Verificado' : 'No cumple'],
          ['Estado conjunto', 'Fase + neutro + PE + caída + coordinación', estadoAlim],
        ]), theme:'plain',
        styles:{fontSize:8,textColor:[23,23,25],cellPadding:{top:2,bottom:2,left:0,right:0},lineWidth:{bottom:0.2},lineColor:[226,227,229]},
        headStyles:{textColor:[111,114,119],fontStyle:'bold',fontSize:7,lineWidth:{bottom:0.2},lineColor:[226,227,229]},
        columnStyles:{1:{halign:'right'},2:{halign:'right',cellWidth:25}},
      });
      y=doc.lastAutoTable.finalY+3;
      const alimNotas = [alimPdf.neutroNota].concat(alimPdf.causas).concat(alimPdf.pendientes).filter(Boolean).join(' ');
      const alimRef = doc.splitTextToSize(pdfTexto('UTE RBT Cap. II: el neutro es conductor activo. Cap. XXIII §5.4: neutro y tierra del cliente no deben unirse. Para pequeños/medianos suministros individuales, Cap. XXIII §4 y §10 fijan el criterio simplificado de tierra; fuera de ese alcance la app adopta S_PE = S_fase conservadoramente y exige documentar la comprobación térmica frente a falta. ' + alimNotas), pageWidth - 2*margin);
      doc.setFont('helvetica','italic'); doc.setFontSize(7); doc.setTextColor(111,114,119); doc.text(alimRef,margin,y); y += alimRef.length*3.2 + 7;

      const pgPdf = calcularProteccionGeneral(trabajo);
      const verPgPdf = comprobarProteccionGeneral(trabajo, pgPdf);
      if (pgPdf.aplica) {
        const estadoTxt = (v) => v === true ? 'Verificado' : (v === false ? 'No cumple' : 'Pendiente');
        const sensOk = verPgPdf.residencial ? verPgPdf.cumpleSensibilidad : true;
        const filasPg = [
          [pgPdf.modo === 'existente' ? 'Térmica general existente' : 'Térmica general', pgPdf.termicaIn !== null ? (pgPdf.termicaIn + ' A' + (pgPdf.modo === 'nueva' ? ' · ' + pgPdf.termicaPolos + 'p · curva ' + pgPdf.termicaCurva : '')) : 'Pendiente', pgPdf.modo === 'existente' ? (pgPdf.termicaIn === null ? 'Pendiente' : (pgPdf.coordina === false ? 'No cumple' : 'Verificar')) : (pgPdf.coordina ? 'Verificado' : 'No cumple')],
          [pgPdf.modo === 'existente' ? 'Diferencial general existente' : 'Diferencial general', pgPdf.diferencialExiste === false ? 'No instalado' : (pgPdf.diferencialIn !== null ? pgPdf.diferencialIn + ' A · ' + pgPdf.diferencialSensibilidad + ' mA · ' + textoTipoDiferencial(pgPdf.diferencialTipo) : 'Pendiente'), pgPdf.diferencialExiste === false ? 'No cumple' : estadoTxt(sensOk && pgPdf.diferencialExiste !== null ? true : null)],
          ['Puesta a tierra', verPgPdf.resistenciaTierraOhm !== null ? fmt(verPgPdf.resistenciaTierraOhm) + ' Ω (máx. ' + fmt(verPgPdf.raMax) + ' Ω)' : 'Medición pendiente (máx. ' + fmt(verPgPdf.raMax) + ' Ω)', estadoTxt(verPgPdf.cumpleTierra)],
          ['Contactos indirectos', verPgPdf.contactosIndirectos && verPgPdf.contactosIndirectos.aplica ? (verPgPdf.contactosIndirectos.esquema + ' · U_L ' + fmt(verPgPdf.contactosIndirectos.ul,0) + ' V' + (verPgPdf.contactosIndirectos.tensionContacto !== null && verPgPdf.contactosIndirectos.tensionContacto !== undefined ? ' · U_c≈' + fmt(verPgPdf.contactosIndirectos.tensionContacto) + ' V' : '')) : 'No aplica', verPgPdf.contactosIndirectos && verPgPdf.contactosIndirectos.estado === 'cumple' ? 'Verificado' : (verPgPdf.contactosIndirectos && verPgPdf.contactosIndirectos.estado === 'no_cumple' ? 'No cumple' : 'Pendiente')],
          ['Sobretensiones', verPgPdf.sobretensiones.requerido === true ? ('SPD requerido · ' + verPgPdf.sobretensiones.tipoPropuesto) : (verPgPdf.sobretensiones.requerido === false ? 'No requerido según evaluación declarada' : 'Evaluación pendiente'), verPgPdf.sobretensiones.estado === 'cumple' ? 'Verificado' : (verPgPdf.sobretensiones.estado === 'pendiente' ? 'Pendiente' : 'No cumple')],
          ['Estado conjunto', 'Protección + tierra + contactos indirectos + sobretensiones', verPgPdf.estado === 'cumple' ? 'Verificado' : (verPgPdf.estado === 'pendiente' ? 'Pendiente' : 'No cumple')],
        ];
        lugarPara(4 + FILA * 6);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
        const eqPdf = comprobarEquipotencialidad(trabajo);
        if (y > 235) { doc.addPage(); y = 24; }
        doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('PE, CONTINUIDAD Y EQUIPOTENCIALIDAD', margin, y); y += 6;
        const filasPe = (trabajo.circuitos||[]).map((c,i)=>{ const cc=calcularCircuito(c,caidaPreviaDe(trabajo)); const pe=cc.apto?comprobarPeCircuito(c,cc.seccionAdoptada):null; return ['C'+(i+1)+' '+(c.nombre||'Circuito'), pe?fmt(pe.seccion)+' mm² (mín. '+fmt(pe.minimo)+' mm²)':'-', pe?(pe.ensayo==='si'?'Continuidad OK'+(pe.resistencia!==null?' · '+fmt(pe.resistencia,3)+' Ω':''):(pe.ensayo==='no'?'No continuo':'Pendiente')):'Pendiente']; });
        filasPe.push(['Equipotencial principal', eqPdf.aplica==='no'?'No aplica':(eqPdf.seccion?fmt(eqPdf.seccion)+' mm² · mín. '+fmt(eqPdf.minPrincipal)+' mm²':'Pendiente'), eqPdf.continuidad==='si'?'Continuidad OK':(eqPdf.continuidad==='no'?'No cumple':'Pendiente')]);
        filasPe.push(['Equipotencial suplementaria', eqPdf.suplementariaAplica==='no'?'No aplica':(eqPdf.suplementariaSeccion?fmt(eqPdf.suplementariaSeccion)+' mm² · mín. '+fmt(eqPdf.minSuplementaria)+' mm²':'Pendiente'), eqPdf.suplementariaContinuidad==='si'?'Continuidad OK':(eqPdf.suplementariaAplica==='no'?'No aplica':(eqPdf.suplementariaContinuidad==='no'?'No cumple':'Pendiente'))]);
        doc.autoTable({startY:y,head:[['Elemento','Sección','Ensayo']],body:filasPe,theme:'grid',styles:{fontSize:7},margin:{left:margin,right:margin}}); y=doc.lastAutoTable.finalY+5;
        const eqRef=doc.splitTextToSize(pdfTexto('UTE RBT Cap. XXIII §5.4, §6 y §10.5: el circuito de tierra debe ser eléctricamente continuo y las masas se conectan por derivaciones; no se intercalan protecciones ni seccionadores en el PE. IEC 60364-5-54 se usa como referencia complementaria para secciones de PE/equipotencialidad e IEC 60364-6 para registrar el ensayo de continuidad.'),pageWidth-2*margin); doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(eqRef,margin,y);y+=eqRef.length*3.2+6;

        const protoPdf=comprobarProtocoloEnsayos(trabajo);
        if (y > 220) { doc.addPage(); y=24; }
        doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(111,114,119); doc.text('PROTOCOLO DE ENSAYOS DE PUESTA EN SERVICIO',margin,y); y+=5;
        const meta=trabajo.protocoloEnsayos||{};
        const filasProto=(trabajo.circuitos||[]).map((c,i)=>{const r=comprobarEnsayoCircuito(c,trabajo);return [
          'C'+(i+1)+' '+(c.nombre||'Circuito'),
          Number(c.aislamientoMohm)>0?(fmt(c.aislamientoMohm,2)+' MΩ @ '+(Number(c.aislamientoEnsayoV)||'—')+' Vcc'):'Pendiente',
          r.polaridadAplica?(c.polaridad==='si'?'OK':(c.polaridad==='no'?'No':'Pend.')):'N/A',
          r.secuenciaAplica?(c.secuenciaFases==='si'?'OK':(c.secuenciaFases==='no'?'No':'Pend.')):'N/A',
          c.continuidadPe==='si'?'OK':(c.continuidadPe==='no'?'No':'Pend.'),
          r.rcdDedicado?(c.ensayoRcd==='si'?('OK'+(Number(c.tiempoRcdS)>0?' · '+fmt(c.tiempoRcdS,3)+' s':'')):(c.ensayoRcd==='no'?'No':'Pend.')):'General',
          r.estado==='cumple'?'Verificado':(r.estado==='no_cumple'?'No cumple':'Pendiente')
        ];});
        doc.autoTable({startY:y,margin:margenTablas,head:[['Circuito','Aislamiento','Polaridad','Secuencia','PE','RCD','Estado']],body:pdfFilas(filasProto),theme:'plain',styles:{fontSize:7,textColor:[23,23,25],cellPadding:{top:2,bottom:2,left:0,right:0},lineWidth:{bottom:0.2},lineColor:[226,227,229]},headStyles:{fontSize:6.5,textColor:[111,114,119],fontStyle:'bold'},columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'}}}); y=doc.lastAutoTable.finalY+3;
        const metaTxt='Fecha: '+(meta.fecha||'pendiente')+' · Técnico: '+(meta.tecnico||'pendiente')+' · Instrumento: '+(meta.instrumento||'pendiente')+(meta.serie?' · Serie: '+meta.serie:'')+' · Calibración: '+((meta.calibracion||'pendiente')==='si'?'conforme':((meta.calibracion||'pendiente')==='no'?'NO conforme':'pendiente'))+' · Tierra: '+(Number(pgPdf.resistenciaTierraOhm)>0?fmt(pgPdf.resistenciaTierraOhm)+' Ω':'pendiente')+' · RCD general: '+((pgPdf.ensayoRcdGeneral||'pendiente')==='si'?'satisfactorio':((pgPdf.ensayoRcdGeneral||'pendiente')==='no'?'NO satisfactorio':'pendiente'))+(Number(pgPdf.tiempoDiferencialGeneralS)>0?' · '+fmt(pgPdf.tiempoDiferencialGeneralS,3)+' s':'')+' · Estado protocolo: '+(protoPdf.estado==='cumple'?'VERIFICADO':(protoPdf.estado==='no_cumple'?'NO CUMPLE':'PENDIENTE'))+'.';
        const ml=doc.splitTextToSize(pdfTexto(metaTxt),pageWidth-2*margin); doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(ml,margin,y);y+=ml.length*3.2+3;
        const refProto=doc.splitTextToSize(pdfTexto('IEC 60364-6 (referencia complementaria): continuidad, aislamiento, polaridad, desconexión automática/protección adicional, secuencia de fases, pruebas funcionales e informe de resultados. Tabla 6.1: circuitos hasta 500 V → 500 Vcc y mínimo 1 MΩ; si no es practicable desconectar SPD/electrónica sensible puede reducirse a 250 Vcc manteniendo 1 MΩ.'),pageWidth-2*margin); doc.setFont('helvetica','italic');doc.setFontSize(7);doc.text(refProto,margin,y);y+=refProto.length*3.2+7;

        doc.text('PROTECCION GENERAL, TIERRA Y SOBRETENSIONES', margin, y);
        y += 4;
        doc.autoTable({
          startY: y,
          margin: margenTablas,
          head: [['Comprobación', 'Resultado', 'Estado']],
          body: pdfFilas(filasPg),
          theme: 'plain',
          styles: { fontSize: 8, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
          headStyles: { textColor: [111, 114, 119], fontStyle: 'bold', fontSize: 7, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', cellWidth: 25 } },
        });
        y = doc.lastAutoTable.finalY + 4;
        doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(111, 114, 119);
        const tierraRef = doc.splitTextToSize(pdfTexto(
          'UTE: el diferencial es obligatorio en el tablero general y en instalaciones domiciliarias debe ser de 30 mA (Comunicado Nro. 26002, 19/02/2026). ' +
          'La coordinación con tierra se comprueba con R ≤ 50/IΔn en local seco o R ≤ 24/IΔn en local húmedo/mojado (RBT Cap. VI); el Cap. XXIII limita la tensión de contacto a 50 V o 24 V respectivamente. ' +
          'La resistencia debe provenir de una medición: si no se carga, la memoria permanece Pendiente. Para contactos indirectos, IEC 60364-4-41 se usa como referencia complementaria: TT 230 V exige 0,2 s en los circuitos finales comprendidos y 1 s en distribución/otros; en IT se verifica el primer defecto por R_A·I_d y su detección, y el segundo defecto con condiciones tipo TN si las masas están interconectadas o tipo TT si son independientes. UTE RBT Cap. V §2 exige descargadores cerca del origen cuando sean de temer sobretensiones atmosféricas y exige para ellos tierra inferior a 10 Ω. La app registra esa evaluación y usa IEC 60364-5-53 §534 sólo como referencia para proponer Tipo 1+2 o Tipo 2.'),
          pageWidth - 2 * margin);
        doc.text(tierraRef, margin, y);
        y += tierraRef.length * 3.2 + 8;
      }
    }

    lugarPara(4 + FILA * 3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
    doc.text('MATERIALES', margin, y);
    y += 4;
    // Agrupado por rubro: en el orden en que lo arma el cálculo los cables
    // quedan salteados entre las térmicas y cuesta leerlo. Los precios por
    // material van sólo en la copia interna.
    // Una tabla por rubro, para que el nombre del rubro nunca quede solo al pie
    // de una hoja con sus materiales en la siguiente.
    const bloquesMateriales = [];
    if (materialesItems) {
      materialesPorRubro(materialesItems).forEach((g) => {
        const filas = [[{ content: g.rubro, colSpan: interno ? 3 : 2, styles: { fontStyle: 'bold', textColor: [111, 114, 119], fontSize: 8 } }]];
        g.items.forEach((m) => {
          const fila = [m.nombre, fmt(m.cantidad, 0) + ' ' + m.unidad];
          if (interno) fila.push(money(m.cantidad * m.precioUnit));
          filas.push(fila);
        });
        bloquesMateriales.push(filas);
      });
    } else {
      bloquesMateriales.push([interno ? ['Materiales de la instalación', '', money(p.materiales)]
                                      : ['Materiales de la instalación', '']]);
    }
    bloquesMateriales.forEach((filas, i) => {
      // el rubro entra con al menos su primer material (y el encabezado, en el primero)
      if (i > 0) lugarPara(FILA * 2);
      doc.autoTable({
        startY: y,
        margin: margenTablas,
        head: [interno ? ['Material', 'Cant.', 'Costo'] : ['Material', 'Cant.']],
        showHead: i === 0 ? 'everyPage' : 'never',
        body: filas.map((f) => f.map((c) => (typeof c === 'string' ? pdfTexto(c) : c))),
        theme: 'plain',
        styles: { fontSize: 9, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
        headStyles: { textColor: [111, 114, 119], fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
        columnStyles: interno ? { 1: { halign: 'right', cellWidth: 26 }, 2: { halign: 'right', cellWidth: 28 } }
                              : { 1: { halign: 'right', cellWidth: 30 } },
      });
      y = doc.lastAutoTable.finalY;
    });
    y += 12;

    if (interno) {
      const filasDesglose = [
        ['Materiales', money(p.materiales)],
        ['Mano de obra', money(p.manoObra)],
        ['Traslados', money(p.traslados)],
        ['Otros gastos', money(p.otros)],
        ['Costo total', money(t.costoTotal)],
        ['Margen (' + p.margen + '%)', money(t.subtotal - t.costoTotal)],
        ['Subtotal de venta', money(t.subtotal)],
        ['IVA (' + p.iva + '%)', money(t.ivaMonto)],
      ];
      lugarPara(4 + FILA * filasDesglose.length + 2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(111, 114, 119);
      doc.text('DESGLOSE', margin, y);
      y += 4;
      doc.autoTable({
        startY: y,
        margin: margenTablas,
        body: filasDesglose,
        theme: 'plain',
        styles: { fontSize: 9, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
        columnStyles: { 1: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.row.index === 4) { data.cell.styles.fontStyle = 'bold'; }
        },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Del dinero, en la del cliente sólo el total: el desglose de costos y el
    // margen son datos internos y no tienen por qué viajar con el presupuesto.
    const altoCaja = 22;
    const incluye = doc.splitTextToSize('El presupuesto contiene costo de materiales y mano de obra incluidos.', pageWidth - 2 * margin);
    // El total, las condiciones y la nota van juntos en la misma hoja.
    lugarPara(altoCaja + 10 + 4 + FILA * 3 + 8 + incluye.length * 4);
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
      margin: margenTablas,
      body: [
        ['Forma de pago', pdfTexto(p.formaPago)],
        ['Validez de la oferta', p.validez + ' días'],
        ['Plazo de ejecución', p.plazo + ' días'],
      ],
      theme: 'plain',
      styles: { fontSize: 9, textColor: [23, 23, 25], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 }, lineWidth: { bottom: 0.2 }, lineColor: [226, 227, 229] },
      columnStyles: { 1: { halign: 'right' } },
    });
    y = doc.lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(111, 114, 119);
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

    // Pie de página documental: identidad, trazabilidad de versión y numeración.
    const totalPaginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      doc.setPage(pagina);
      const h = doc.internal.pageSize.getHeight();
      doc.setDrawColor(226,227,229); doc.setLineWidth(0.2);
      doc.line(margin, h - 11, pageWidth - margin, h - 11);
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(111,114,119);
      const etiqueta = interno ? 'Memoria técnica interna' : 'Presupuesto';
      doc.text(pdfTexto('ADONAI ELECTRICAL · ' + etiqueta + ' · Motor ' + MOTOR_VERSION + ' · Normativa ' + NORMATIVE_PACK.version), margin, h - 6.5);
      doc.text('Página ' + pagina + ' de ' + totalPaginas, pageWidth - margin, h - 6.5, { align: 'right' });
    }

    return { doc, filename: p.codigo + (interno ? '-interno' : '') + '.pdf' };
  }

  async function generarPdfPresupuesto(p, opciones) {
    const { doc, filename } = await construirPdfPresupuesto(p, opciones);
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

  function pdfCierreTitulo(doc, titulo, subtitulo, borrador) {
    const w=doc.internal.pageSize.getWidth();
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(23,23,25); doc.text(pdfTexto(titulo),18,20);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(111,114,119); doc.text(pdfTexto(subtitulo||''),18,27);
    if (borrador) { doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(180,70,70); doc.text('BORRADOR - REVISION FINAL PENDIENTE',w-18,20,{align:'right'}); }
    doc.setDrawColor(226,227,229); doc.line(18,32,w-18,32);
  }

  function pdfCierrePie(doc, etiqueta) {
    const n=doc.getNumberOfPages(), w=doc.internal.pageSize.getWidth();
    for(let i=1;i<=n;i++){ doc.setPage(i); const h=doc.internal.pageSize.getHeight(); doc.setDrawColor(226,227,229); doc.line(18,h-11,w-18,h-11); doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(111,114,119);doc.text(pdfTexto('ADONAI ELECTRICAL · '+etiqueta+' · Motor '+MOTOR_VERSION+' · Normativa '+NORMATIVE_PACK.version),18,h-6.5);doc.text('Página '+i+' de '+n,w-18,h-6.5,{align:'right'}); }
  }

  function pdfDibujarUnifilar(doc, trabajo, yInicio) {
    let y=yInicio||42; const x=28, w=154;
    const pg=calcularProteccionGeneral(trabajo);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(23,23,25);doc.text('Esquema unifilar simplificado',18,y); y+=9;
    const caja=(texto,yy,ancho=58)=>{ doc.setDrawColor(80,80,80);doc.roundedRect(x,yy,ancho,10,1,1);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(23,23,25);doc.text(pdfTexto(texto),x+ancho/2,yy+6.2,{align:'center'}); };
    caja('Suministro '+((SISTEMAS[trabajo.sistemaId]||{}).nombre||trabajo.sistemaId),y); y+=16;
    doc.line(x+29,y-6,x+29,y);
    caja('Protección general '+(pg.termicaIn?fmt(pg.termicaIn,0)+' A':'pendiente'),y); y+=16;
    doc.line(x+29,y-6,x+29,y);
    caja('RCD '+(pg.diferencialSensibilidad?fmt(pg.diferencialSensibilidad,0)+' mA':'pendiente')+' '+tipoDiferencialGeneral(pg),y); y+=18;
    const circs=trabajo.circuitos||[]; const cols=Math.min(3,Math.max(1,circs.length)); const colW=w/cols;
    const startY=y;
    circs.forEach((c,i)=>{ const calc=calcularCircuito(c,caidaPreviaDe(trabajo)); const col=i%cols,row=Math.floor(i/cols); const cx=x+col*colW, cy=startY+row*28; if(col===0){doc.line(x+29,cy-8,x+w-10,cy-8);} doc.line(cx+20,cy-8,cx+20,cy); doc.roundedRect(cx,cy,Math.min(colW-8,46),14,1,1); doc.setFontSize(6.5);doc.text(pdfTexto('C'+(i+1)+' '+(c.nombre||'Circuito')).slice(0,34),cx+2,cy+5); doc.text(pdfTexto((calc.breaker||'—')+' A · '+(calc.seccionAdoptada||'—')+' mm²'),cx+2,cy+10); });
    const rows=Math.ceil(circs.length/cols); y=startY+rows*28+6;
    doc.setFont('helvetica','italic');doc.setFontSize(7);doc.setTextColor(111,114,119);doc.text(pdfTexto('Representación automática de una línea para documentación. No sustituye planos constructivos ni esquemas del fabricante.'),18,y);
    return y+6;
  }

  async function construirDocumentoCierre(tipo, trabajo) {
    const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'}); const cierre=evaluarCierreProfesional(trabajo); const borrador=cierre.estado!=='listo';
    const codigo=trabajo.codigo||'REL'; const cliente=(trabajo.cliente&&trabajo.cliente.nombre)||'-'; const obra=(trabajo.obra&&trabajo.obra.nombre)||'-'; const cp=cierreBase(trabajo);
    const addCover=()=>{ pdfCierreTitulo(doc,'ADONAI ELECTRICAL','Cierre profesional de obra · '+codigo,borrador); doc.setFont('helvetica','bold');doc.setFontSize(20);doc.setTextColor(23,23,25);doc.text(pdfTexto(tipo==='expediente'?'EXPEDIENTE TÉCNICO':'DOCUMENTACIÓN TÉCNICA'),18,58); doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(pdfTexto('Cliente: '+cliente),18,72);doc.text(pdfTexto('Obra: '+obra),18,79);doc.text(pdfTexto('Responsable: '+(cp.responsableNombre||'pendiente')+' · '+(cp.categoriaUTE||'habilitación pendiente')),18,86);doc.text(pdfTexto('Fecha de cierre: '+(cp.fecha||'pendiente')),18,93);doc.setFontSize(9);doc.setTextColor(111,114,119);doc.text(pdfTexto(borrador?'Estado documental: BORRADOR. Existen verificaciones o datos de cierre pendientes.':'Estado documental: DEFINITIVO. Revisión final completada.'),18,106); };
    const addMemoria=(usarActual=false)=>{ if(!usarActual) doc.addPage(); pdfCierreTitulo(doc,'Memoria técnica',codigo+' · '+cliente,borrador); let y=42; const r=calcularPotencia(trabajo.cargas||[],trabajo.factores||{}); const pg=calcularProteccionGeneral(trabajo); doc.autoTable({startY:y,margin:{left:18,right:18},body:pdfFilas([['Sistema',(SISTEMAS[trabajo.sistemaId]||{}).nombre||trabajo.sistemaId],['Potencia instalada',fmt(r.potenciaInstalada/1000)+' kW'],['Potencia de cálculo',fmt(r.pDemandTotal/1000)+' kW'],['Circuitos',(trabajo.circuitos||[]).length],['Protección general',pg.termicaIn?fmt(pg.termicaIn,0)+' A':'Pendiente'],['RCD general',pg.diferencialSensibilidad?fmt(pg.diferencialSensibilidad,0)+' mA · '+tipoDiferencialGeneral(pg):'Pendiente']]),theme:'plain',styles:{fontSize:9},columnStyles:{0:{fontStyle:'bold',cellWidth:48}}}); y=doc.lastAutoTable.finalY+8; const rows=(trabajo.circuitos||[]).map((c,i)=>{const calc=calcularCircuito(c,caidaPreviaDe(trabajo));const comp=calc.apto?comprobarCircuito(datosCircuito(c,caidaPreviaDe(trabajo),contextoCortocircuito(trabajo))):{estado:'no_cumple'};return ['C'+(i+1),c.nombre||'Circuito',fmt(calc.ib||0)+' A',calc.seccionAdoptada?calc.seccionAdoptada+' mm²':'—',calc.breaker?calc.breaker+' A':'—',comp.estado==='cumple'?'Verificado':(comp.estado==='no_cumple'?'No cumple':'Pendiente')];}); doc.autoTable({startY:y,margin:{left:18,right:18},head:[['ID','Circuito','Ib','Sección','Térmica','Estado']],body:pdfFilas(rows),theme:'grid',styles:{fontSize:7}}); y=doc.lastAutoTable.finalY+8; const vr=evaluarCierreProfesional(trabajo); doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('Revisión final',18,y);y+=5;doc.setFont('helvetica','normal');doc.setFontSize(8);const txt=(vr.fallas.concat(vr.faltantes).length?vr.fallas.concat(vr.faltantes):['Sin pendientes críticos.']).map(x=>'• '+x).join('\n');doc.text(doc.splitTextToSize(pdfTexto(txt),174),18,y); };
    const addProtocolo=(usarActual=false)=>{ if(!usarActual) doc.addPage(); pdfCierreTitulo(doc,'Protocolo de ensayos',codigo+' · IEC 60364-6 como referencia complementaria',borrador); let y=42; const meta=trabajo.protocoloEnsayos||{}; doc.autoTable({startY:y,margin:{left:18,right:18},body:pdfFilas([['Fecha',meta.fecha||'Pendiente'],['Técnico',meta.tecnico||'Pendiente'],['Instrumento',meta.instrumento||'Pendiente'],['Serie',meta.serie||'—'],['Calibración',meta.calibracion==='si'?'Conforme':(meta.calibracion==='no'?'No conforme':'Pendiente')]]),theme:'plain',styles:{fontSize:8},columnStyles:{0:{fontStyle:'bold',cellWidth:42}}}); y=doc.lastAutoTable.finalY+7; const rows=(trabajo.circuitos||[]).map((c,i)=>['C'+(i+1),c.nombre||'Circuito',Number(c.aislamientoMohm)>0?fmt(c.aislamientoMohm,2)+' MΩ':'Pend.',c.polaridad==='si'?'OK':(c.polaridad==='no'?'No':'Pend.'),c.secuenciaFases==='si'?'OK':(c.secuenciaFases==='no'?'No':'Pend./N/A'),c.continuidadPe==='si'?'OK':(c.continuidadPe==='no'?'No':'Pend.'),c.ensayoRcd==='si'?'OK':(c.ensayoRcd==='no'?'No':'Pend./General')]); doc.autoTable({startY:y,margin:{left:18,right:18},head:[['ID','Circuito','Aislamiento','Polaridad','Secuencia','PE','RCD']],body:pdfFilas(rows),theme:'grid',styles:{fontSize:6.6}}); };
    const addUnifilar=(usarActual=false)=>{ if(!usarActual) doc.addPage(); pdfCierreTitulo(doc,'Esquema unifilar',codigo+' · generado desde los datos del proyecto',borrador); pdfDibujarUnifilar(doc,trabajo,42); };
    const addResponsable=()=>{ doc.addPage(); pdfCierreTitulo(doc,'Declaración y responsable técnico',codigo,borrador); let y=44; doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(23,23,25); const t='El responsable técnico declara que la información y las mediciones registradas en este expediente corresponden a los datos cargados en la aplicación y que las verificaciones indicadas como cumplidas fueron revisadas antes de la emisión.';doc.text(doc.splitTextToSize(pdfTexto(t),174),18,y);y+=24;doc.autoTable({startY:y,margin:{left:18,right:18},body:pdfFilas([['Responsable',cp.responsableNombre||'Pendiente'],['Categoría / habilitación',cp.categoriaUTE||'Pendiente'],['Fecha',cp.fecha||'Pendiente'],['Declaración',cp.declaracion==='si'?'Confirmada':'Pendiente']]),theme:'plain',styles:{fontSize:9},columnStyles:{0:{fontStyle:'bold',cellWidth:50}}}); y=doc.lastAutoTable.finalY+12;if(cp.firmaDataUrl){try{doc.addImage(cp.firmaDataUrl,'JPEG',18,y,55,25);}catch(e){}}else{doc.line(18,y+18,78,y+18);doc.setFontSize(7);doc.setTextColor(111,114,119);doc.text('Firma',18,y+22);} };
    const addFotos=()=>{ (cp.fotos||[]).forEach((f,i)=>{doc.addPage();pdfCierreTitulo(doc,'Anexo fotográfico '+(i+1),pdfTexto(f.nombre||'Foto de obra'),borrador);try{const props=doc.getImageProperties(f.dataUrl);const mw=174,mh=225;let iw=mw,ih=props.height/props.width*iw;if(ih>mh){ih=mh;iw=props.width/props.height*ih;}doc.addImage(f.dataUrl,'JPEG',18+(mw-iw)/2,42,iw,ih);}catch(e){doc.setFontSize(9);doc.text('No se pudo incorporar esta imagen.',18,45);}}); };
    if(tipo==='memoria'){ addMemoria(true); }
    else if(tipo==='protocolo'){ addProtocolo(true); }
    else if(tipo==='unifilar'){ addUnifilar(true); }
    else { addCover(); addMemoria(); addProtocolo(); addUnifilar(); addResponsable(); addFotos(); }
    pdfCierrePie(doc,tipo==='expediente'?'Expediente técnico':(tipo==='memoria'?'Memoria técnica':(tipo==='protocolo'?'Protocolo de ensayos':'Esquema unifilar')));
    return {doc,filename:codigo+'-'+tipo+(borrador?'-BORRADOR':'')+'.pdf'};
  }

  async function generarDocumentoCierre(tipo) {
    if(!draft) return;
    persistDraft();
    const r=evaluarCierreProfesional(draft);
    if(r.estado!=='listo') toast('Se emitirá como BORRADOR porque la revisión final tiene pendientes.');
    const out=await construirDocumentoCierre(tipo,draft); out.doc.save(out.filename);
  }

  function wirePerfil() {
    $('#perfil-margen').addEventListener('change', () => { DB.settings.margen = Number($('#perfil-margen').value) || 0; saveDB(); });
    $('#perfil-iva').addEventListener('change', () => { DB.settings.iva = Number($('#perfil-iva').value) || 0; saveDB(); });
    $('#perfil-tarifahora').addEventListener('change', () => { DB.settings.manoObra.tarifaHora = Number($('#perfil-tarifahora').value) || 0; saveDB(); });
    $('#perfil-horasjornada').addEventListener('change', () => { DB.settings.manoObra.horasJornada = Number($('#perfil-horasjornada').value) || 0; saveDB(); });
    $('#perfil-bocasjornada').addEventListener('change', () => { DB.settings.manoObra.bocasPorJornada = Number($('#perfil-bocasjornada').value) || 6; saveDB(); });
    $('#perfil-jornadascargafija').addEventListener('change', () => { DB.settings.manoObra.jornadasCargaFija = Number($('#perfil-jornadascargafija').value) || 0; saveDB(); });
    $('#perfil-jornadastablero').addEventListener('change', () => { DB.settings.manoObra.jornadasTablero = Number($('#perfil-jornadastablero').value) || 0; saveDB(); });
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

  function mejorarAccesibilidad() {
    // Une las etiquetas visibles con sus campos sin tener que repetir código en cada formulario.
    document.querySelectorAll('.field label:not([for])').forEach((label) => {
      const campo = label.parentElement && label.parentElement.querySelector('input[id], select[id], textarea[id]');
      if (campo) label.setAttribute('for', campo.id);
    });
    document.querySelectorAll('.icon-btn[data-back]:not([aria-label])').forEach((btn) => btn.setAttribute('aria-label', 'Volver'));
    document.querySelectorAll('button').forEach((btn) => {
      if (btn.hasAttribute('aria-label')) return;
      const texto = (btn.textContent || '').trim();
      const titulo = btn.getAttribute('title');
      if (!texto && titulo) btn.setAttribute('aria-label', titulo);
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  // Guarda la app en el dispositivo para abrirla sin conexión. Sólo funciona
  // servida por http(s), no desde el archivo suelto.
  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Sin modo sin conexión:', e));
  }

  function init() {
    document.querySelectorAll('[data-logo]').forEach((img) => { img.src = LOGO_SRC; });
    mejorarAccesibilidad();
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

  registrarServiceWorker();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
