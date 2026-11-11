/**
 * The trigonometry blocks of Logic Studio, loaded by the engine in each user's worker (and read in
 * the kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js.
 *
 * Every block that reads or gives an angle has the setting «Unità» (degrees by default, radians,
 * gradians, turns). Multiples of a right angle are exact: sin(180°) = 0, not 1.2e-16, and tan(90°)
 * is an error instead of 1.6e16. Results have 15 significant digits.
 */

const L = (en, it) => ({ en, it });
const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : v === null || v === undefined || v === '' ? NaN : Number(String(v).trim().replace(',', '.')));
const tidy = x => (Number.isFinite(x) ? Number(x.toPrecision(15)) : x);
const TAU = 2 * Math.PI;

/** One unit in radians, and a right angle in the unit. */
const UNITS = { deg: [Math.PI / 180, 90], rad: [1, Math.PI / 2], grad: [Math.PI / 200, 100], turn: [TAU, 0.25] };
const SYMBOL = { deg: '°', rad: ' rad', grad: ' gon', turn: ' giri' };
const UNIT_OPTIONS = [
  { value: 'deg', label: L('Degrees (°)', 'Gradi (°)') },
  { value: 'rad', label: L('Radians (rad)', 'Radianti (rad)') },
  { value: 'grad', label: L('Gradians (gon)', 'Gradi centesimali (gon)') },
  { value: 'turn', label: L('Turns', 'Giri') },
];
const unitField = (key = 'unit', label = L('Unit', 'Unità')) => ({ key, type: 'select', default: 'deg', options: UNIT_OPTIONS, label });
const RANGE_OPTIONS = [
  { value: 'signed', label: L('From −180° to 180°', 'Da −180° a 180°') },
  { value: 'positive', label: L('From 0° to 360°', 'Da 0° a 360°') },
];

const unitOf = b => UNITS[b.config.unit] ?? UNITS.deg;
const toRad = (v, b) => v * unitOf(b)[0];
const fromRad = (r, b) => tidy(r / unitOf(b)[0]);

/** A finite number, or an error naming the input. */
function need(v, what) {
  const n = num(v);
  if (!Number.isFinite(n)) throw new Error(`${what}: serve un numero`);
  return n;
}

/** The angle as a number of right angles when it is a whole one (0, 1, 2, 3 mod 4), else null. */
function quadrant(angle, b) {
  const q = angle / unitOf(b)[1];
  if (b.config.unit === 'rad' ? angle !== 0 : !Number.isInteger(Math.round(q * 1e9) / 1e9)) return null;
  return ((Math.round(q) % 4) + 4) % 4;
}

const angleText = (v, b) => `${tidy(v)}${SYMBOL[b.config.unit] ?? '°'}`;

/** sin and cos of an angle in the block's unit, exact on right angles. */
function sinCos(angle, b) {
  const q = quadrant(angle, b);
  if (q !== null) return [[0, 1, 0, -1][q], [1, 0, -1, 0][q]];
  const r = toRad(angle, b);
  return [Math.sin(r), Math.cos(r)];
}

/** An angle in radians into the range of the setting «Intervallo»: (−π, π] or [0, 2π). */
function wrap(r, range) {
  let x = r % TAU;
  if (range === 'positive') { if (x < 0) x += TAU; return x; }
  if (x <= -Math.PI) x += TAU;
  if (x > Math.PI) x -= TAU;
  return x;
}

const DIRECT = {
  sin: [L('sin · sine (Math.sin)', 'sin · seno (Math.sin)'), (s, c) => s, null],
  cos: [L('cos · cosine (Math.cos)', 'cos · coseno (Math.cos)'), (s, c) => c, null],
  tan: [L('tan · tangent (Math.tan)', 'tan · tangente (Math.tan)'), (s, c) => s / c, 'cos'],
  cot: [L('cot · cotangent', 'cot · cotangente'), (s, c) => c / s, 'sin'],
  sec: [L('sec · secant', 'sec · secante'), (s, c) => 1 / c, 'cos'],
  csc: [L('csc · cosecant', 'csc · cosecante'), (s, c) => 1 / s, 'sin'],
};

const INVERSE = {
  asin: [L('asin · arcsine (Math.asin)', 'asin · arcoseno (Math.asin)'), x => Math.asin(x), x => Math.abs(x) <= 1, 'asin vuole un valore tra −1 e 1'],
  acos: [L('acos · arccosine (Math.acos)', 'acos · arcocoseno (Math.acos)'), x => Math.acos(x), x => Math.abs(x) <= 1, 'acos vuole un valore tra −1 e 1'],
  atan: [L('atan · arctangent (Math.atan)', 'atan · arcotangente (Math.atan)'), x => Math.atan(x), () => true, ''],
  acot: [L('acot · arccotangent (0 to 180°)', 'acot · arcocotangente (da 0 a 180°)'), x => Math.PI / 2 - Math.atan(x), () => true, ''],
  asec: [L('asec · arcsecant', 'asec · arcosecante'), x => Math.acos(1 / x), x => Math.abs(x) >= 1, 'asec vuole un valore minore di −1 o maggiore di 1'],
  acsc: [L('acsc · arccosecant', 'acsc · arcocosecante'), x => Math.asin(1 / x), x => Math.abs(x) >= 1, 'acsc vuole un valore minore di −1 o maggiore di 1'],
};

const HYPERBOLIC = {
  sinh: [L('sinh · hyperbolic sine (Math.sinh)', 'sinh · seno iperbolico (Math.sinh)'), Math.sinh, null],
  cosh: [L('cosh · hyperbolic cosine (Math.cosh)', 'cosh · coseno iperbolico (Math.cosh)'), Math.cosh, null],
  tanh: [L('tanh · hyperbolic tangent (Math.tanh)', 'tanh · tangente iperbolica (Math.tanh)'), Math.tanh, null],
  coth: [L('coth · hyperbolic cotangent', 'coth · cotangente iperbolica'), x => 1 / Math.tanh(x), x => (x === 0 ? 'coth non è definita per x = 0' : null)],
  sech: [L('sech · hyperbolic secant', 'sech · secante iperbolica'), x => 1 / Math.cosh(x), null],
  csch: [L('csch · hyperbolic cosecant', 'csch · cosecante iperbolica'), x => 1 / Math.sinh(x), x => (x === 0 ? 'csch non è definita per x = 0' : null)],
  asinh: [L('asinh · inverse hyperbolic sine (Math.asinh)', 'asinh · settore seno iperbolico (Math.asinh)'), Math.asinh, null],
  acosh: [L('acosh · inverse hyperbolic cosine (Math.acosh)', 'acosh · settore coseno iperbolico (Math.acosh)'), Math.acosh, x => (x < 1 ? 'acosh vuole un valore maggiore o uguale a 1' : null)],
  atanh: [L('atanh · inverse hyperbolic tangent (Math.atanh)', 'atanh · settore tangente iperbolica (Math.atanh)'), Math.atanh, x => (Math.abs(x) >= 1 ? 'atanh vuole un valore tra −1 e 1 esclusi' : null)],
  acoth: [L('acoth · inverse hyperbolic cotangent', 'acoth · settore cotangente iperbolica'), x => Math.atanh(1 / x), x => (Math.abs(x) <= 1 ? 'acoth vuole un valore minore di −1 o maggiore di 1' : null)],
  asech: [L('asech · inverse hyperbolic secant', 'asech · settore secante iperbolica'), x => Math.acosh(1 / x), x => (x <= 0 || x > 1 ? 'asech vuole un valore maggiore di 0 e al massimo 1' : null)],
  acsch: [L('acsch · inverse hyperbolic cosecant', 'acsch · settore cosecante iperbolica'), x => Math.asinh(1 / x), x => (x === 0 ? 'acsch non è definita per x = 0' : null)],
};

const options = table => Object.entries(table).map(([value, [label]]) => ({ value, label }));

const NUM = (name, en, it, extra = {}) => ({ name, type: 'number', label: L(en, it), ...extra });

// ---------------------------------------------------------------- triangles

const SIDES = ['a', 'b', 'c'], ANGLES = ['alpha', 'beta', 'gamma'];

/** Area, perimeter, heights and radii of a solved triangle (angles in radians). */
function extras(t) {
  const { a, b, c, alpha } = t;
  const area = 0.5 * b * c * Math.sin(alpha);
  const s = (a + b + c) / 2;
  return { area, perimeter: 2 * s, ha: 2 * area / a, hb: 2 * area / b, hc: 2 * area / c, inradius: area / s, circumradius: a / (2 * Math.sin(alpha)) };
}

/** All the values of a solved triangle in the block's unit, rounded. */
function triangleOut(t, b) {
  const out = { ...t, ...extras(t) };
  for (const k of ANGLES) out[k] = fromRad(t[k], b);
  for (const k of Object.keys(out)) if (!ANGLES.includes(k)) out[k] = tidy(out[k]);
  return out;
}

/** The given values: { name: number } for the inputs that have one. */
function given(inputs, names, labels) {
  const out = {};
  for (const n of names) {
    const v = inputs[n];
    if (v === undefined || v === null || v === '') continue;
    out[n] = need(v, labels[n]);
  }
  return out;
}

const SIDE_LABEL = { a: 'a', b: 'b', c: 'c', alpha: 'α', beta: 'β', gamma: 'γ' };

/**
 * Solves a triangle from 3 values with at least a side; angles in radians. Returns the solutions
 * (0, 1 or 2: the ambiguous case of two sides and an angle not between them).
 */
function solveTriangle(g) {
  const sides = SIDES.filter(k => k in g), angles = ANGLES.filter(k => k in g);
  for (const k of sides) if (g[k] <= 0) throw new Error(`Il lato ${k} deve essere maggiore di 0`);
  for (const k of angles) if (g[k] <= 0 || g[k] >= Math.PI) throw new Error(`L'angolo ${SIDE_LABEL[k]} deve essere tra 0° e 180° esclusi`);
  if (sides.length + angles.length !== 3) throw new Error(`Servono esattamente 3 valori (almeno un lato): ne sono arrivati ${sides.length + angles.length}`);
  if (!sides.length) throw new Error('Con tre angoli il triangolo non è determinato: serve almeno un lato');
  const fromSSS = (a, b, c) => {
    if (a + b <= c || a + c <= b || b + c <= a) throw new Error('Con questi lati il triangolo non esiste: ogni lato deve essere minore della somma degli altri due');
    const ang = (x, y, z) => Math.acos(Math.min(1, Math.max(-1, (y * y + z * z - x * x) / (2 * y * z))));
    const alpha = ang(a, b, c), beta = ang(b, a, c);
    return { a, b, c, alpha, beta, gamma: Math.PI - alpha - beta };
  };
  if (sides.length === 3) return [fromSSS(g.a, g.b, g.c)];
  if (angles.length === 2) {
    const t = { ...g };
    const missing = ANGLES.find(k => !(k in g));
    t[missing] = Math.PI - angles.reduce((s, k) => s + g[k], 0);
    if (t[missing] <= 0) throw new Error('La somma degli angoli supera 180°');
    const k = sides[0];
    const ratio = g[k] / Math.sin(t[ANGLES[SIDES.indexOf(k)]]);
    for (let i = 0; i < 3; i++) t[SIDES[i]] = ratio * Math.sin(t[ANGLES[i]]);
    return [t];
  }
  // two sides and an angle
  const angle = angles[0], i = ANGLES.indexOf(angle);
  const opposite = SIDES[i];
  if (!(opposite in g)) {
    // between the two sides: the third side by the law of cosines
    const [p, q] = sides;
    const third = Math.sqrt(g[p] ** 2 + g[q] ** 2 - 2 * g[p] * g[q] * Math.cos(g[angle]));
    const all = { ...g, [opposite]: third };
    return [fromSSS(all.a, all.b, all.c)];
  }
  // not between them: law of sines, 0, 1 or 2 triangles
  const other = sides.find(k => k !== opposite), j = SIDES.indexOf(other);
  const sinOther = g[other] * Math.sin(g[angle]) / g[opposite];
  if (sinOther > 1 + 1e-12) throw new Error('Con questi valori il triangolo non esiste: il lato opposto all\'angolo è troppo corto');
  // the tangent case (sin = 1 within rounding): exactly a right angle
  const first = Math.abs(sinOther - 1) < 1e-12 ? Math.PI / 2 : Math.asin(sinOther);
  const candidates = Math.abs(sinOther - 1) < 1e-12 ? [first] : [first, Math.PI - first];
  const out = [];
  for (const o of candidates) {
    const rest = Math.PI - g[angle] - o;
    if (rest <= 1e-12) continue;
    const t = { ...g };
    t[ANGLES[j]] = o;
    const k = 3 - i - j;
    t[ANGLES[k]] = rest;
    t[SIDES[k]] = g[opposite] / Math.sin(g[angle]) * Math.sin(rest);
    out.push(t);
  }
  if (!out.length) throw new Error('Con questi valori il triangolo non esiste');
  return out;
}

const TRIANGLE_OUT = [
  NUM('a', 'a', 'a'), NUM('b', 'b', 'b'), NUM('c', 'c', 'c'),
  NUM('alpha', 'α', 'α'), NUM('beta', 'β', 'β'), NUM('gamma', 'γ', 'γ'),
  NUM('area', 'area', 'area'), NUM('perimeter', 'perimeter', 'perimetro'),
  NUM('ha', 'height on a', 'altezza su a', { hidden: true }), NUM('hb', 'height on b', 'altezza su b', { hidden: true }), NUM('hc', 'height on c', 'altezza su c', { hidden: true }),
  NUM('inradius', 'inradius', 'raggio inscritto', { hidden: true }), NUM('circumradius', 'circumradius', 'raggio circoscritto', { hidden: true }),
];

// ---------------------------------------------------------------- waves

const SHAPES = {
  sine: [L('Sine', 'Sinusoide'), th => Math.sin(th)],
  cosine: [L('Cosine', 'Cosinusoide'), th => Math.cos(th)],
  square: [L('Square', 'Quadra'), th => (wrap(th, 'positive') < Math.PI ? 1 : -1)],
  triangle: [L('Triangle', 'Triangolare'), th => 2 / Math.PI * Math.asin(Math.sin(th))],
  sawtooth: [L('Sawtooth', 'Dente di sega'), th => { const p = th / TAU + 0.5; return 2 * (p - Math.floor(p)) - 1; }],
};

// ---------------------------------------------------------------- blocks

export const blocks = [
  {
    type: 'trig.fn', version: 1, category: 'trig', icon: 'triangle', label: L('Trigonometric functions (Math.sin, Math.cos…)', 'Funzioni trigonometriche (Math.sin, Math.cos…)'),
    inputs: [NUM('angle', 'angle', 'angolo')],
    outputs: [NUM('value', 'value', 'valore')],
    config: [{ key: 'fn', type: 'select', default: 'sin', options: options(DIRECT), label: L('Function', 'Funzione') }, unitField()],
    run({ angle }, b) {
      if (angle === undefined) return undefined;
      const a = need(angle, 'angolo');
      const [label, f, zero] = DIRECT[b.config.fn] ?? DIRECT.sin;
      const [s, c] = sinCos(a, b);
      if (zero === 'cos' && c === 0 || zero === 'sin' && s === 0) throw new Error(`${b.config.fn} non è definita per ${angleText(a, b)} (${zero} = 0)`);
      return { value: tidy(f(s, c)) };
    },
  },
  {
    type: 'trig.inverse', version: 1, category: 'trig', icon: 'triangle', label: L('Inverse functions (Math.asin, Math.acos…)', 'Funzioni inverse (Math.asin, Math.acos…)'),
    inputs: [NUM('value', 'value', 'valore')],
    outputs: [NUM('angle', 'angle', 'angolo')],
    config: [{ key: 'fn', type: 'select', default: 'asin', options: options(INVERSE), label: L('Function', 'Funzione') }, unitField()],
    run({ value }, b) {
      if (value === undefined) return undefined;
      const x = need(value, 'valore');
      const [, f, ok, message] = INVERSE[b.config.fn] ?? INVERSE.asin;
      if (!ok(x)) throw new Error(message);
      return { angle: fromRad(f(x), b) };
    },
  },
  {
    type: 'trig.atan2', version: 1, category: 'trig', icon: 'compare', label: L('Angle of a point (Math.atan2)', 'Angolo di un punto (Math.atan2)'),
    inputs: [NUM('y', 'y', 'y'), NUM('x', 'x', 'x')],
    outputs: [NUM('angle', 'angle', 'angolo')],
    config: [unitField(), { key: 'range', type: 'select', default: 'signed', options: RANGE_OPTIONS, label: L('Range', 'Intervallo') }],
    run({ y, x }, b) {
      if (y === undefined || x === undefined) return undefined;
      const Y = need(y, 'y'), X = need(x, 'x');
      if (X === 0 && Y === 0) throw new Error('L\'angolo non è definito per x = 0 e y = 0');
      return { angle: fromRad(wrap(Math.atan2(Y, X), b.config.range), b) };
    },
  },
  {
    type: 'trig.hyperbolic', version: 1, category: 'trig', icon: 'chart', label: L('Hyperbolic functions (Math.sinh, Math.cosh…)', 'Funzioni iperboliche (Math.sinh, Math.cosh…)'),
    inputs: [NUM('x', 'x', 'x')],
    outputs: [NUM('value', 'value', 'valore')],
    config: [{ key: 'fn', type: 'select', default: 'sinh', options: options(HYPERBOLIC), label: L('Function', 'Funzione') }],
    run({ x }, b) {
      if (x === undefined) return undefined;
      const v = need(x, 'x');
      const [, f, check] = HYPERBOLIC[b.config.fn] ?? HYPERBOLIC.sinh;
      const problem = check?.(v);
      if (problem) throw new Error(problem);
      const r = f(v);
      if (!Number.isFinite(r)) throw new Error(`${b.config.fn}(${v}) è troppo grande`);
      return { value: tidy(r) };
    },
  },
  {
    type: 'trig.convert', version: 1, category: 'trig', icon: 'sync', label: L('Convert and normalize an angle', 'Converti e normalizza angolo'),
    inputs: [NUM('angle', 'angle', 'angolo')],
    outputs: [NUM('angle', 'angle', 'angolo')],
    config: [
      unitField('unit', L('From', 'Da')),
      unitField('to', L('To', 'A')),
      { key: 'range', type: 'select', default: 'none', options: [{ value: 'none', label: L('As it is', 'Così com\'è') }, ...RANGE_OPTIONS], label: L('Range', 'Intervallo') },
    ],
    run({ angle }, b) {
      if (angle === undefined) return undefined;
      const a = need(angle, 'angolo');
      const from = UNITS[b.config.unit] ?? UNITS.deg, to = UNITS[b.config.to] ?? UNITS.deg;
      let r = a * from[0];
      if (b.config.range !== 'none') {
        // whole turns removed in the unit itself when it has exact values (720° → 0°)
        const turn = TAU / from[0];
        if (b.config.unit !== 'rad') {
          let x = a % turn;
          if (b.config.range === 'positive' ? x < 0 : x <= -turn / 2) x += turn;
          if (b.config.range === 'signed' && x > turn / 2) x -= turn;
          r = x * from[0];
        } else r = wrap(r, b.config.range);
      }
      return { angle: tidy(r / to[0]) };
    },
  },
  {
    type: 'trig.toDms', version: 1, category: 'trig', icon: 'clock', label: L('Degrees → degrees, minutes, seconds', 'Gradi → gradi, primi, secondi'),
    inputs: [NUM('angle', 'angle (°)', 'angolo (°)')],
    outputs: [NUM('degrees', 'degrees', 'gradi'), NUM('minutes', 'minutes', 'primi'), NUM('seconds', 'seconds', 'secondi'), { name: 'text', type: 'text', label: L('text', 'testo') }],
    config: [{ key: 'decimals', type: 'number', default: 0, min: 0, max: 6, label: L('Decimals of the seconds', 'Decimali dei secondi') }],
    run({ angle }, b) {
      if (angle === undefined) return undefined;
      const a = need(angle, 'angolo');
      const dec = Math.min(6, Math.max(0, Math.round(num(b.config.decimals) || 0)));
      const sign = a < 0 ? -1 : 1;
      const f = 10 ** dec;
      // everything in whole units of the last decimal of the seconds, so 59.9999″ carries over
      const total = Math.round(Math.abs(a) * 3600 * f);
      const d = Math.floor(total / (3600 * f));
      const m = Math.floor((total - d * 3600 * f) / (60 * f));
      const s = (total - d * 3600 * f - m * 60 * f) / f;
      const sec = s.toFixed(dec);
      return { degrees: sign * d, minutes: m, seconds: Number(sec), text: `${sign < 0 ? '-' : ''}${d}° ${m}′ ${sec}″` };
    },
  },
  {
    type: 'trig.fromDms', version: 1, category: 'trig', icon: 'clock', label: L('Degrees, minutes, seconds → degrees', 'Gradi, primi, secondi → gradi'),
    inputs: [NUM('degrees', 'degrees', 'gradi'), NUM('minutes', 'minutes', 'primi'), NUM('seconds', 'seconds', 'secondi'), { name: 'text', type: 'text', label: L('text (12° 30′ 15″ N)', 'testo (12° 30′ 15″ N)'), hidden: true }],
    outputs: [NUM('angle', 'angle (°)', 'angolo (°)')],
    config: [],
    run(inputs, b) {
      if (b.trigger === 'text') {
        const t = String(inputs.text ?? '').trim();
        // up to three numbers (degrees, minutes, seconds) with their marks or spaces, a sign before, N/S/E/W/O after
        const m = /^([+\-−]?)\s*((?:\d+(?:[.,]\d+)?\s*(?:°|d|′|'|m|″|"|''|s)?\s*){1,3})([NSEWOnsewo])?$/.exec(t);
        const parts = m ? m[2].match(/\d+(?:[.,]\d+)?/g) : null;
        if (!m || !parts || parts.length > 3) throw new Error(`Angolo non riconosciuto: «${t}» (scrivi per esempio 12° 30′ 15″ o 12 30 15 N)`);
        const [, sg] = m, hemi = m[3];
        const [d, mi = '0', se = '0'] = parts;
        const value = num(d) + num(mi) / 60 + num(se) / 3600;
        if (num(mi) >= 60 || num(se) >= 60) throw new Error('Primi e secondi devono essere minori di 60');
        const negative = sg === '-' || sg === '−' || /[SWOswo]/.test(hemi ?? '');
        return { angle: tidy(negative ? -value : value) };
      }
      const d = inputs.degrees === undefined ? (b.linked('degrees') ? undefined : 0) : need(inputs.degrees, 'gradi');
      const mi = inputs.minutes === undefined ? (b.linked('minutes') ? undefined : 0) : need(inputs.minutes, 'primi');
      const s = inputs.seconds === undefined ? (b.linked('seconds') ? undefined : 0) : need(inputs.seconds, 'secondi');
      if (d === undefined || mi === undefined || s === undefined) return undefined;
      if (mi < 0 || mi >= 60 || s < 0 || s >= 60) throw new Error('Primi e secondi vanno da 0 a meno di 60 (il segno va sui gradi)');
      const value = Math.abs(d) + mi / 60 + s / 3600;
      return { angle: tidy(d < 0 || Object.is(d, -0) ? -value : value) };
    },
  },
  {
    type: 'trig.rightTriangle', version: 1, category: 'trig', icon: 'triangle', label: L('Right triangle', 'Triangolo rettangolo'),
    inputs: [NUM('a', 'leg a', 'cateto a'), NUM('b', 'leg b', 'cateto b'), NUM('c', 'hypotenuse c', 'ipotenusa c'), NUM('alpha', 'α (opposite a)', 'α (opposto ad a)'), NUM('beta', 'β (opposite b)', 'β (opposto a b)')],
    outputs: [
      NUM('a', 'a', 'a'), NUM('b', 'b', 'b'), NUM('c', 'c', 'c'), NUM('alpha', 'α', 'α'), NUM('beta', 'β', 'β'),
      NUM('area', 'area', 'area'), NUM('perimeter', 'perimeter', 'perimetro'),
      NUM('height', 'height on c', 'altezza su c', { hidden: true }), NUM('inradius', 'inradius', 'raggio inscritto', { hidden: true }), NUM('circumradius', 'circumradius', 'raggio circoscritto', { hidden: true }),
    ],
    config: [unitField()],
    run(inputs, b) {
      const g = given(inputs, ['a', 'b', 'c', 'alpha', 'beta'], { a: 'a', b: 'b', c: 'c', alpha: 'α', beta: 'β' });
      const keys = Object.keys(g);
      if (keys.length < 2) return undefined;
      if (keys.length > 2) throw new Error(`Servono esattamente 2 valori: ne sono arrivati ${keys.length}`);
      for (const k of ['a', 'b', 'c']) if (k in g && g[k] <= 0) throw new Error(`Il lato ${k} deve essere maggiore di 0`);
      const right = unitOf(b)[1];
      for (const k of ['alpha', 'beta']) if (k in g && (g[k] <= 0 || g[k] >= right)) throw new Error(`L'angolo ${SIDE_LABEL[k]} deve essere tra 0 e ${angleText(right, b)} esclusi`);
      if ('alpha' in g && 'beta' in g) throw new Error('Con due angoli il triangolo non è determinato: serve almeno un lato');
      let { a, b: bb, c } = g;
      const al = 'alpha' in g ? toRad(g.alpha, b) : 'beta' in g ? Math.PI / 2 - toRad(g.beta, b) : null;
      if (al !== null) {
        if (a !== undefined) { c = a / Math.sin(al); bb = a / Math.tan(al); }
        else if (bb !== undefined) { a = bb * Math.tan(al); c = bb / Math.cos(al); }
        else { a = c * Math.sin(al); bb = c * Math.cos(al); }
      } else if (c === undefined) c = Math.hypot(a, bb);
      else {
        const leg = a ?? bb;
        if (leg >= c) throw new Error('L\'ipotenusa deve essere più lunga del cateto');
        const other = Math.sqrt(c * c - leg * leg);
        if (a === undefined) a = other; else bb = other;
      }
      const alpha = Math.atan2(a, bb);
      return {
        a: tidy(a), b: tidy(bb), c: tidy(c), alpha: fromRad(alpha, b), beta: fromRad(Math.PI / 2 - alpha, b),
        area: tidy(a * bb / 2), perimeter: tidy(a + bb + c), height: tidy(a * bb / c), inradius: tidy((a + bb - c) / 2), circumradius: tidy(c / 2),
      };
    },
  },
  {
    type: 'trig.triangle', version: 1, category: 'trig', icon: 'triangle', label: L('Solve a triangle (laws of sines and cosines)', 'Risolvi triangolo (teoremi dei seni e del coseno)'),
    inputs: [NUM('a', 'side a', 'lato a'), NUM('b', 'side b', 'lato b'), NUM('c', 'side c', 'lato c'), NUM('alpha', 'α (opposite a)', 'α (opposto ad a)'), NUM('beta', 'β (opposite b)', 'β (opposto a b)'), NUM('gamma', 'γ (opposite c)', 'γ (opposto a c)')],
    outputs: [...TRIANGLE_OUT, NUM('solutions', 'solutions', 'soluzioni', { hidden: true }), { name: 'second', type: 'object', label: L('second solution', 'seconda soluzione'), hidden: true }],
    config: [unitField()],
    run(inputs, b) {
      const g = given(inputs, [...SIDES, ...ANGLES], SIDE_LABEL);
      if (Object.keys(g).length < 3) return undefined;
      const flat = 2 * unitOf(b)[1];
      for (const k of ANGLES) if (k in g && (g[k] <= 0 || g[k] >= flat)) throw new Error(`L'angolo ${SIDE_LABEL[k]} deve essere tra 0 e ${angleText(flat, b)} esclusi`);
      for (const k of ANGLES) if (k in g) g[k] = toRad(g[k], b);
      const solutions = solveTriangle(g);
      const out = triangleOut(solutions[0], b);
      return { ...out, solutions: solutions.length, second: solutions[1] ? triangleOut(solutions[1], b) : undefined };
    },
  },
  {
    type: 'trig.toPolar', version: 1, category: 'trig', icon: 'gauge', label: L('Cartesian → polar', 'Cartesiane → polari'),
    inputs: [NUM('x', 'x', 'x'), NUM('y', 'y', 'y')],
    outputs: [NUM('r', 'r (distance)', 'r (distanza)'), NUM('angle', 'θ (angle)', 'θ (angolo)')],
    config: [unitField(), { key: 'range', type: 'select', default: 'positive', options: RANGE_OPTIONS, label: L('Range', 'Intervallo') }],
    run({ x, y }, b) {
      if (x === undefined || y === undefined) return undefined;
      const X = need(x, 'x'), Y = need(y, 'y');
      return { r: tidy(Math.hypot(X, Y)), angle: X === 0 && Y === 0 ? 0 : fromRad(wrap(Math.atan2(Y, X), b.config.range), b) };
    },
  },
  {
    type: 'trig.fromPolar', version: 1, category: 'trig', icon: 'gauge', label: L('Polar → cartesian', 'Polari → cartesiane'),
    inputs: [NUM('r', 'r (distance)', 'r (distanza)'), NUM('angle', 'θ (angle)', 'θ (angolo)')],
    outputs: [NUM('x', 'x', 'x'), NUM('y', 'y', 'y')],
    config: [unitField()],
    run({ r, angle }, b) {
      if (r === undefined || angle === undefined) return undefined;
      const R = need(r, 'r'), [s, c] = sinCos(need(angle, 'angolo'), b);
      return { x: tidy(R * c), y: tidy(R * s) };
    },
  },
  {
    type: 'trig.wave', version: 1, category: 'trig', icon: 'chart', label: L('Wave (sine, square, triangle, sawtooth)', 'Onda (sinusoide, quadra, triangolare, dente di sega)'),
    inputs: [NUM('t', 't (seconds)', 't (secondi)'), { name: 'tick', type: 'pulse', label: L('now', 'adesso') }],
    outputs: [NUM('value', 'value', 'valore')],
    config: [
      { key: 'shape', type: 'select', default: 'sine', options: options(SHAPES), label: L('Shape', 'Forma') },
      { key: 'amplitude', type: 'number', default: 1, label: L('Amplitude', 'Ampiezza') },
      { key: 'frequency', type: 'number', default: 1, min: 0, label: L('Frequency (Hz)', 'Frequenza (Hz)') },
      { key: 'phase', type: 'number', default: 0, label: L('Phase', 'Fase') },
      unitField('unit', L('Unit of the phase', 'Unità della fase')),
      { key: 'offset', type: 'number', default: 0, label: L('Offset', 'Spostamento (offset)') },
    ],
    start(b) { b.memory().t0 = b.now(); },
    run(inputs, b) {
      const t = b.trigger === 'tick' ? (b.now() - (b.memory().t0 ?? b.now())) / 1000 : inputs.t === undefined ? undefined : need(inputs.t, 't');
      if (t === undefined) return undefined;
      const A = num(b.config.amplitude), f = num(b.config.frequency), off = num(b.config.offset) || 0;
      if (!Number.isFinite(A) || !Number.isFinite(f)) throw new Error('Ampiezza e frequenza devono essere numeri');
      const th = TAU * f * t + toRad(num(b.config.phase) || 0, b);
      const [, shape] = SHAPES[b.config.shape] ?? SHAPES.sine;
      const v = shape(th);
      // 1.2e-16 where the wave crosses zero is 0
      return { value: tidy(A * (Math.abs(v) < 1e-12 ? 0 : v) + off) };
    },
  },
];
