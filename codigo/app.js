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

  const CATEGORIAS = [
    { id: 'iluminacion', label: 'Iluminación', cosPhiDefault: 1, uso: 'iluminacion' },
    { id: 'tomacorrientes', label: 'Tomacorrientes de uso general', cosPhiDefault: 1, uso: 'tomacorrientes' },
    { id: 'cargaFija', label: 'Carga fija especial', cosPhiDefault: 0.8, uso: 'fuerza' },
  ];
  const CARGAS_FIJAS_PRESETS = [
    { nombre: 'Aire acondicionado', w: 2200, cosPhi: 0.85 },
    { nombre: 'Termotanque / calefón', w: 2000, cosPhi: 1 },
    { nombre: 'Cocina eléctrica', w: 3500, cosPhi: 1 },
    { nombre: 'Horno eléctrico', w: 2000, cosPhi: 1 },
    { nombre: 'Lavarropas', w: 1500, cosPhi: 0.9 },
    { nombre: 'Secarropas', w: 2000, cosPhi: 1 },
    { nombre: 'Motor / otro', w: 750, cosPhi: 0.8 },
  ];
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
  const BREAKER_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
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
    if (!draft || draft.obra.naturaleza !== 'Proyecto nuevo') return { aplica: false };
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

  function generarMateriales(circuitos, draft) {
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
      if (largoCable > 0) add('Cable unipolar ' + fmt(calc.seccionAdoptada, calc.seccionAdoptada < 10 ? 1 : 0).replace(/,00$/, '') + ' mm²', 'm', largoCable);
      const largo = Math.ceil((Number(c.l) || 0) * 1.1);
      if (largo > 0) {
        if (c.metodo === 'amurado_pvc') {
          add('Caño PVC rígido ' + diametroCano(calc.seccionAdoptada) + ' mm', 'm', largo);
          add('Grampa omega', 'un.', largo);
        } else if (c.metodo === 'amurado_galvanizado') {
          add('Caño de acero galvanizado ' + diametroCano(calc.seccionAdoptada) + ' mm', 'm', largo);
          add('Grampa omega', 'un.', largo);
        } else if (c.metodo === 'bandeja') {
          add('Bandeja portacable ' + anchoBandeja(conductores) + ' mm', 'm', largo);
          const nMensulas = Math.ceil(largo / 1.5);
          add('Ménsula para bandeja', 'un.', nMensulas);
          add('Taco fischer 10mm', 'un.', nMensulas * 2);
          add('Tornillo cabeza tuerca para taco 10mm', 'un.', nMensulas * 2);
          add('Tornillo con tuerca 8mm', 'un.', nMensulas * 2);
        } else if (c.metodo !== 'aire') {
          // embutido, enterrado, o metodo viejo/desconocido: caño corrugado (comportamiento por defecto)
          add('Caño corrugado ' + diametroCano(calc.seccionAdoptada) + ' mm', 'm', largo);
        }
        // 'aire' (aire libre): sin canalización
      }
      const tipoTermica = c.fases === 1 ? 'bipolar' : 'tetrapolar';
      add('Térmica ' + tipoTermica + ' ' + calc.breaker + 'A curva ' + calc.curva, 'un.', 1);
    });
    if (draft && draft.obra && draft.obra.naturaleza === 'Proyecto nuevo') {
      const nLlaves = circuitos.length + 2; // + térmica general + diferencial general
      add('Tablero eléctrico (' + nLlaves + ' módulos)', 'un.', 1);
      add('Caja para medidor', 'un.', 1);
      add('Jabalina / electrodo de puesta a tierra', 'un.', 1);
      add('Caño PVC 1" x 3m (puesta a tierra)', 'un.', 2);
      add('Codo PVC 1" (puesta a tierra)', 'un.', 6);
    }
    return Object.values(mapa);
  }

  /* ============================================================
     PERSISTENCIA
     ============================================================ */
  const STORAGE_KEY = 'adonai_ht_v1';
  function defaultDB() {
    return { trabajos: [], presupuestos: [], settings: { margen: 30, iva: 22 }, seq: { trabajo: 0, presupuesto: 0 }, _seeded: false };
  }
  let DB;
  try { DB = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultDB(); } catch (e) { DB = defaultDB(); }
  if (!DB.settings) DB.settings = { margen: 30, iva: 22 };
  if (!DB.seq) DB.seq = { trabajo: 0, presupuesto: 0 };

  function saveDB() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); } catch (e) {} }

  function seedSampleData() {
    const sistema = SISTEMAS.tri_tt;
    const cargas = [
      { id: 'c1', nombre: 'Iluminación depósito', categoria: 'iluminacion', potenciaW: 100, cantidad: 8, cosPhi: 1 },
      { id: 'c2', nombre: 'Tomas generales', categoria: 'tomacorrientes', potenciaW: 200, cantidad: 10, cosPhi: 1 },
      { id: 'c3', nombre: 'Motor bomba', categoria: 'cargaFija', potenciaW: 2200, cantidad: 1, cosPhi: 0.85 },
    ];
    const circuitos = importarCargasComoCircuitos(cargas, sistema).map((c, i) => ({ ...c, l: [18, 30, 42][i] || 15 }));
    const materiales = generarMateriales(circuitos, { obra: { naturaleza: 'Proyecto nuevo' } });
    const now = Date.now();
    const trabajo = {
      id: 'T' + (++DB.seq.trabajo), codigo: 'REL-' + new Date().getFullYear() + '-0001',
      cliente: { nombre: 'Empresa Delta (ejemplo)', telefono: '', whatsapp: '', email: '', contacto: '', obs: '' },
      obra: { nombre: 'Depósito Central', direccion: '', localidad: 'Salto', tipo: 'Industrial', naturaleza: 'Proyecto nuevo', obs: '' },
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
  function showView(id) {
    $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + id; });
    currentView = id;
    $('#bottom-nav').hidden = VIEWS_WITH_NAV.indexOf(id) === -1;
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.nav === id));
    $('.shell').scrollTop = 0;
    window.scrollTo(0, 0);
    if (id === 'home') renderHome();
    if (id === 'trabajos') renderTrabajos();
    if (id === 'presupuestos') renderPresupuestos();
    if (id === 'perfil') renderPerfil();
  }

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
      obra: { nombre: '', direccion: '', localidad: 'Salto', tipo: 'Residencial', naturaleza: 'Proyecto nuevo', obs: '' },
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

  function renderCargasList() {
    const wrap = $('#cargas-list');
    wrap.innerHTML = '';
    if (draft.cargas.length === 0) {
      wrap.appendChild(el('div', { class: 'empty-state', html: 'Agregá el primer circuito para empezar a calcular.' }));
      return;
    }
    draft.cargas.forEach((c) => {
      const card = el('div', { class: 'item-card' });
      const isFija = c.categoria === 'cargaFija';
      card.innerHTML =
        '<button class="remove-btn" type="button">' + icon('ic-trash') + '</button>' +
        '<div class="item-grid" style="padding-right:30px">' +
        '<div class="field"><label>Nombre</label><input class="input" data-f="nombre" placeholder="Ej: Iluminación living" value="' + escapeHtml(c.nombre) + '"></div>' +
        '<div class="field"><label>Categoría</label><select class="select" data-f="categoria">' +
        CATEGORIAS.map((cat) => '<option value="' + cat.id + '"' + (cat.id === c.categoria ? ' selected' : '') + '>' + cat.label + '</option>').join('') +
        '</select></div>' +
        (isFija ? '<div class="field"><label>Carga típica</label><select class="select" data-f="preset"><option value="">Elegir preset…</option>' +
          CARGAS_FIJAS_PRESETS.map((p, i) => '<option value="' + i + '">' + p.nombre + ' (' + p.w + 'W)</option>').join('') + '</select></div>' : '') +
        '<div class="field"><label>Potencia (W)</label><input class="input" type="number" data-f="potenciaW" value="' + c.potenciaW + '"></div>' +
        '<div class="field"><label>Cantidad</label><input class="input" type="number" min="1" data-f="cantidad" value="' + c.cantidad + '"></div>' +
        '<div class="field"><label>cos φ</label><input class="input" type="number" step="0.05" min="0" max="1" data-f="cosPhi" value="' + c.cosPhi + '"></div>' +
        '</div>';
      card.querySelector('.remove-btn').addEventListener('click', () => { draft.cargas = draft.cargas.filter((x) => x.id !== c.id); renderCargasList(); renderPotenciaResultado(); });
      card.querySelectorAll('[data-f]').forEach((input) => {
        input.addEventListener('change', () => {
          const f = input.dataset.f;
          if (f === 'preset') {
            const p = CARGAS_FIJAS_PRESETS[input.value];
            if (p) { c.nombre = c.nombre || p.nombre; c.potenciaW = p.w; c.cosPhi = p.cosPhi; renderCargasList(); renderPotenciaResultado(); }
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
          c[f] = (f === 'nombre' || f === 'material' || f === 'metodo') ? input.value : Number(input.value);
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
    renderPerfilNormativa();
    renderPerfilSeguridad();
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
      materiales: materialesCosto, manoObra: 0, traslados: 0, otros: 0,
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
      showView(b.dataset.back);
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
      draft.circuitos.push({ id: uid('m2'), nombre: '', ib: 10, v: sistema.v, fases: sistema.fases, l: 15, material: 'cobre', metodo: 'embutido', tempAmb: 30, agrupados: 1, caidaMax: 5, cosPhi: 1, uso: 'fuerza' });
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
    ['#pi-manoobra', '#pi-traslados', '#pi-otros', '#pi-margen', '#pi-iva', '#pi-validez', '#pi-formapago', '#pi-plazo', '#pres-cliente-nombre']
      .forEach((sel) => $(sel).addEventListener('input', () => { recalcPresupuesto(); savePresupuesto(); }));
    $('#btn-pres-aprobar').addEventListener('click', () => {
      presActual.estado = 'aprobado';
      savePresupuesto();
      renderPresupuestoDetalle();
      toast('Presupuesto aprobado');
    });
    $('#btn-pres-pdf').addEventListener('click', () => generarPdfPresupuesto(presActual));
    $('#btn-pres-doc').addEventListener('click', () => generarPdfPresupuesto(presActual));
  }

  function generarPdfPresupuesto(p) {
    savePresupuesto();
    const t = calcularTotalesPresupuesto(p);
    const w = window.open('', '_blank');
    if (!w) { toast('Habilitá las ventanas emergentes para generar el PDF'); return; }
    const trabajo = p.trabajoId ? DB.trabajos.find((tr) => tr.id === p.trabajoId) : null;
    const materialesItems = trabajo && trabajo.materiales && trabajo.materiales.length ? trabajo.materiales : null;
    const filasMateriales = materialesItems
      ? materialesItems.map((m) =>
          '<tr><td>' + escapeHtml(m.nombre) + ' <span class="muted">(' + fmt(m.cantidad, 0) + ' ' + escapeHtml(m.unidad) + ')</span></td><td class="r">' + money(m.cantidad * m.precioUnit) + '</td></tr>'
        ).join('')
      : '<tr><td>Materiales</td><td class="r">' + money(p.materiales) + '</td></tr>';
    w.document.write(
      '<title>' + p.codigo + '</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:40px;color:#171719;max-width:640px;margin:0 auto}' +
      'h1{font-size:20px;margin-bottom:2px}.muted{color:#6f7277;font-size:13px;margin-bottom:24px}' +
      'table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px solid #e2e3e5;font-size:14px}' +
      '.r{text-align:right}.total{font-weight:800;font-size:18px}.tag{font-weight:800;letter-spacing:0.06em}' +
      '.head{display:flex;align-items:center;gap:10px;margin-bottom:6px}.head img{height:36px;width:auto}</style>' +
      '<div class="head"><img src="' + LOGO_SRC + '" alt=""><div class="tag">ADONAI ELECTRICAL</div></div>' +
      '<h1>Presupuesto ' + p.codigo + '</h1>' +
      '<div class="muted">Cliente / proyecto: ' + escapeHtml(p.clienteNombre || '—') + '</div>' +
      '<table>' +
      filasMateriales +
      '<tr><td>Mano de obra</td><td class="r">' + money(p.manoObra) + '</td></tr>' +
      '<tr><td>Traslados</td><td class="r">' + money(p.traslados) + '</td></tr>' +
      '<tr><td>Otros gastos</td><td class="r">' + money(p.otros) + '</td></tr>' +
      '<tr><td>Costo total</td><td class="r">' + money(t.costoTotal) + '</td></tr>' +
      '<tr><td>Margen (' + p.margen + '%)</td><td class="r">' + money(t.subtotal - t.costoTotal) + '</td></tr>' +
      '<tr><td>IVA (' + p.iva + '%)</td><td class="r">' + money(t.ivaMonto) + '</td></tr>' +
      '<tr><td class="total">TOTAL CLIENTE</td><td class="r total">' + money(t.total) + '</td></tr>' +
      '</table>' +
      '<p class="muted" style="margin-top:24px">Validez: ' + p.validez + ' días · Forma de pago: ' + escapeHtml(p.formaPago) + ' · Plazo estimado: ' + p.plazo + ' días</p>'
    );
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  function wirePerfil() {
    $('#perfil-margen').addEventListener('change', () => { DB.settings.margen = Number($('#perfil-margen').value) || 0; saveDB(); });
    $('#perfil-iva').addEventListener('change', () => { DB.settings.iva = Number($('#perfil-iva').value) || 0; saveDB(); });
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
    renderCondTensiones();
    renderCondDatoLabel();
    calcularConductorForm();
    showView('home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
