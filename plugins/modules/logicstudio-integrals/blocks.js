/**
 * The integral blocks of Logic Studio (definite and indefinite integrals, areas, volumes, data and
 * signals, differential equations), loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js.
 *
 * A function travels as text, as in logicstudio-functions (lib/shared/mathexpr.js has the syntax);
 * the ends of an interval can be numbers, expressions such as pi/2, or inf and -inf where the
 * block says so. Every numeric integral is limited to 100 000 evaluations of the function (the
 * multiple ones to 2 000 000), so a schema cannot hang the worker.
 */
import { parse, print, simplify, derive, compile, integrate, integrateNumeric, brent, numericDerivative, solveOde, budget, symbols } from './lib/shared/mathexpr.js';
import { L, num, tidy, F_IN, exprField, varField, pick, variableOf, treeOf, functionOf, bound, need, startWhenFree, checkList } from './lib/shared/mathblocks.js';

const NUM = (name, en, it, extra = {}) => ({ name, type: 'number', label: L(en, it), ...extra });
const TEXT = (name, en, it, extra = {}) => ({ name, type: 'text', label: L(en, it), ...extra });
const LIST = (name, en, it, extra = {}) => ({ name, type: 'list', label: L(en, it), ...extra });
const ANY = (name, en, it, extra = {}) => ({ name, type: 'any', label: L(en, it), ...extra });

const METHODS = [
  { value: 'gk', label: L('Adaptive Gauss–Kronrod (best)', 'Gauss-Kronrod adattivo (il migliore)') },
  { value: 'simpson', label: L('Adaptive Simpson', 'Simpson adattivo') },
  { value: 'romberg', label: L('Romberg', 'Romberg') },
  { value: 'trapezoid', label: L('Trapezoids (n intervals)', 'Trapezi (n intervalli)') },
  { value: 'midpoint', label: L('Rectangles at the midpoint (n intervals)', 'Rettangoli al punto medio (n intervalli)') },
];
const methodFields = [
  { key: 'method', type: 'select', default: 'gk', options: METHODS, label: L('Method', 'Metodo') },
  { key: 'tolerance', type: 'number', default: 1e-10, min: 1e-15, max: 0.1, label: L('Tolerance', 'Tolleranza') },
  { key: 'n', type: 'number', default: 1000, min: 1, max: 99999, label: L('Intervals (trapezoids, rectangles)', 'Intervalli (trapezi, rettangoli)') },
];
const endFields = (a = '0', b = '1') => [
  { key: 'a', type: 'text', default: a, label: L('From a (when the input is not linked)', 'Da a (se l\'ingresso non è collegato)') },
  { key: 'b', type: 'text', default: b, label: L('To b (when the input is not linked)', 'A b (se l\'ingresso non è collegato)') },
];
const END_A = ANY('a', 'a (from)', 'a (da)'), END_B = ANY('b', 'b (to)', 'b (a)');

/** The function of a block and its variable, or undefined while f is linked and empty. */
function fnOf(inputs, b, port = 'f', key = 'expr') {
  const tree = treeOf(inputs, b, port, key);
  if (tree === undefined) return undefined;
  const v = variableOf(b);
  return { tree, v, f: functionOf(tree, [v]) };
}

/** The interval [a, b] of a block, or undefined while a linked end is empty. */
function endsOf(inputs, b, infinite = false) {
  const A = pick(inputs, b, 'a'), B = pick(inputs, b, 'b');
  if (A === undefined || B === undefined) return undefined;
  return [bound(A, 'a', infinite), bound(B, 'b', infinite)];
}

const options = b => ({ method: b.config.method ?? 'gk', tol: Math.max(1e-15, num(b.config.tolerance) || 1e-10), n: Math.round(num(b.config.n) || 1000) });

/** f' as a function: symbolic when possible, else numeric. */
function slopeOf(fx) {
  try { const d = compile(derive(fx.tree, fx.v), [fx.v]); return x => d(x); } catch { return x => numericDerivative(fx.f, x, 1); }
}

/** Where f − g changes sign in [a, b] (sampled, then refined): sorted [x]. */
function crossings(h, a, b, samples = 1000) {
  const out = [];
  let px = a, py = h(a);
  for (let i = 1; i <= samples; i++) {
    const x = a + (b - a) * i / samples, y = h(x);
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (y === 0) out.push(x);
      else if (py !== 0 && Math.sign(py) !== Math.sign(y)) { try { out.push(brent(h, px, x).root); } catch { /* a jump */ } }
    }
    px = x; py = y;
  }
  return out;
}

/** ∫ |h| over [a, b], split where h changes sign. */
function absIntegral(h, a, b, opts) {
  const cuts = [a, ...crossings(h, a, b).filter(x => x > a && x < b), b];
  let total = 0, signed = 0;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const r = integrateNumeric(h, cuts[i], cuts[i + 1], opts).value;
    total += Math.abs(r);
    signed += r;
  }
  return { total, signed, cuts };
}

/** A bound of a multiple integral: a number, or an expression in the outer variables. */
function boundFn(v, vars, what) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error(`${what}: serve un numero finito`); return () => v; }
  const text = String(v ?? '').trim();
  if (!text) throw new Error(`${what}: serve un numero o un'espressione`);
  if (/^[+\-−]?(inf|infinity|∞)$/i.test(text)) throw new Error(`${what}: l'infinito non è ammesso qui`);
  const tree = parse(text.replace(',', '.').match(/^-?\d+(\.\d+)?$/) ? text.replace(',', '.') : text);
  const extra = [...symbols(tree)].filter(n => !vars.includes(n));
  if (extra.length) throw new Error(`${what}: può usare solo ${vars.length ? vars.join(', ') : 'numeri'}, non ${extra.join(', ')}`);
  const f = compile(tree, vars);
  return (...xs) => {
    const r = f(...xs);
    if (!Number.isFinite(r)) throw new Error(`${what} non ha un valore finito`);
    return r;
  };
}

/** Points of a data list: numbers with a step dx, or { x, y } / [x, y]. */
function samplesOf(data, dx) {
  checkList(data, 'La lista dei dati');
  if (data.length < 2) throw new Error('Servono almeno 2 dati');
  if (data.every(v => typeof v === 'number' || typeof v === 'string')) {
    if (!(dx > 0)) throw new Error('Il passo dx deve essere maggiore di 0');
    return data.map((v, i) => [i * dx, need(v, `dato ${i + 1}`)]);
  }
  const pts = data.map((p, i) => {
    const [x, y] = Array.isArray(p) ? p : p && typeof p === 'object' ? [p.x, p.y] : [];
    return [need(x, `x del punto ${i + 1}`), need(y, `y del punto ${i + 1}`)];
  });
  for (let i = 1; i < pts.length; i++) if (!(pts[i][0] > pts[i - 1][0])) throw new Error(`Le x devono crescere: il punto ${i + 1} non viene dopo il precedente`);
  return pts;
}

// ---------------------------------------------------------------- blocks

export const blocks = [
  startWhenFree({
    type: 'int.definite', version: 1, category: 'integrals', icon: 'integral', label: L('Definite integral ∫ₐᵇ f(x) dx', 'Integrale definito ∫ₐᵇ f(x) dx'),
    inputs: [F_IN, END_A, END_B],
    outputs: [NUM('value', 'integral', 'integrale'), NUM('estimate', 'error estimate', 'stima dell\'errore', { hidden: true }), NUM('evaluations', 'evaluations', 'valutazioni', { hidden: true })],
    config: [exprField('sin(x)'), varField, ...endFields('0', 'pi'), ...methodFields],
    run(inputs, b) {
      const fx = fnOf(inputs, b), ends = endsOf(inputs, b, true);
      if (!fx || !ends) return undefined;
      const r = integrateNumeric(fx.f, ends[0], ends[1], options(b));
      return { value: r.value, estimate: r.error ?? undefined, evaluations: r.evaluations };
    },
  }),
  startWhenFree({
    type: 'int.primitive', version: 1, category: 'integrals', icon: 'integral', label: L('Antiderivative (indefinite integral)', 'Primitiva (integrale indefinito)'),
    inputs: [F_IN],
    outputs: [TEXT('primitive', 'F (antiderivative)', 'F (primitiva)'), TEXT('text', '∫ f dx = F + C', '∫ f dx = F + C', { hidden: true })],
    config: [exprField('x e^x'), varField, { key: 'C', type: 'number', default: 0, label: L('Constant C added to F', 'Costante C aggiunta a F') }],
    run(inputs, b) {
      const tree = treeOf(inputs, b);
      if (tree === undefined) return undefined;
      const v = variableOf(b);
      const F = integrate(tree, v);
      const C = num(b.config.C) || 0;
      const withC = C ? simplify(parse(`${print(F)} + (${C})`)) : F;
      return { primitive: print(withC), text: `∫ ${print(simplify(tree))} d${v} = ${print(F)} + C` };
    },
  }),
  {
    type: 'int.function', version: 1, category: 'integrals', icon: 'integral', label: L('Integral function F(x) = ∫ₐˣ f(t) dt', 'Funzione integrale F(x) = ∫ₐˣ f(t) dt'),
    inputs: [F_IN, END_A, ANY('x', 'x (number or list)', 'x (numero o lista)')],
    outputs: [ANY('value', 'F(x)', 'F(x)')],
    config: [exprField('e^(-t^2)'), { ...varField, default: 't' }, { key: 'a', type: 'text', default: '0', label: L('From a (when the input is not linked)', 'Da a (se l\'ingresso non è collegato)') }, ...methodFields],
    run(inputs, b) {
      if (inputs.x === undefined) return undefined;
      const fx = fnOf(inputs, b);
      const A = pick(inputs, b, 'a');
      if (!fx || A === undefined) return undefined;
      const a = bound(A, 'a', true), opts = options(b);
      const one = x => integrateNumeric(fx.f, a, bound(x, 'x', true), opts).value;
      if (Array.isArray(inputs.x)) {
        const xs = checkList(inputs.x, 'La lista delle x');
        if (xs.length > 1000) throw new Error('Al massimo 1000 valori di x');
        return { value: xs.map(one) };
      }
      return { value: one(inputs.x) };
    },
  },
  startWhenFree({
    type: 'int.mean', version: 1, category: 'integrals', icon: 'integral', label: L('Mean value on [a, b]', 'Valore medio in [a, b]'),
    inputs: [F_IN, END_A, END_B],
    outputs: [NUM('mean', 'mean value', 'valore medio'), NUM('integral', 'integral', 'integrale', { hidden: true }), NUM('c', 'c with f(c) = mean', 'c con f(c) = media', { hidden: true })],
    config: [exprField('x^2'), varField, ...endFields('0', '3'), ...methodFields],
    run(inputs, b) {
      const fx = fnOf(inputs, b), ends = endsOf(inputs, b);
      if (!fx || !ends) return undefined;
      const [a, z] = ends;
      if (a === z) throw new Error('L\'intervallo ha lunghezza 0');
      const I = integrateNumeric(fx.f, a, z, options(b)).value, mean = I / (z - a);
      const c = crossings(x => fx.f(x) - mean, Math.min(a, z), Math.max(a, z))[0];
      return { mean: tidy(mean), integral: I, c: c === undefined ? undefined : tidy(c) };
    },
  }),
  startWhenFree({
    type: 'int.area', version: 1, category: 'integrals', icon: 'chart', label: L('Area between two curves', 'Area tra due curve'),
    inputs: [F_IN, TEXT('g', 'g (second curve)', 'g (seconda curva)'), END_A, END_B],
    outputs: [NUM('area', 'area', 'area'), NUM('signed', '∫ (f − g)', '∫ (f − g)', { hidden: true }), LIST('crossings', 'crossing points x', 'punti d\'incontro x', { hidden: true })],
    config: [exprField('x'), { key: 'g', type: 'text', default: '0', label: L('Second curve g (when g is not linked; 0 = the x axis)', 'Seconda curva g (se g non è collegato; 0 = l\'asse x)') }, varField, ...endFields('-1', '1'), ...methodFields],
    run(inputs, b) {
      const fx = fnOf(inputs, b), gx = fnOf(inputs, b, 'g', 'g'), ends = endsOf(inputs, b);
      if (!fx || !gx || !ends) return undefined;
      const [a, z] = ends[0] <= ends[1] ? ends : [ends[1], ends[0]];
      const r = absIntegral(x => fx.f(x) - gx.f(x), a, z, options(b));
      return { area: tidy(r.total), signed: tidy(ends[0] <= ends[1] ? r.signed : -r.signed), crossings: r.cuts.slice(1, -1).map(tidy) };
    },
  }),
  startWhenFree({
    type: 'int.revolution', version: 1, category: 'integrals', icon: 'sphere', label: L('Solid of revolution', 'Solido di rotazione'),
    inputs: [F_IN, END_A, END_B, TEXT('g', 'g (inner curve)', 'g (curva interna)', { hidden: true })],
    outputs: [NUM('volume', 'volume', 'volume'), NUM('surface', 'lateral surface', 'superficie laterale')],
    config: [
      exprField('sqrt(x)'),
      { key: 'g', type: 'text', default: '0', label: L('Inner curve g (a hole; 0 = none)', 'Curva interna g (un foro; 0 = nessuno)') },
      varField, ...endFields('0', '4'),
      { key: 'axis', type: 'select', default: 'x', label: L('Axis', 'Asse'), options: [{ value: 'x', label: L('x axis (discs)', 'Asse x (dischi)') }, { value: 'y', label: L('y axis (shells, 0 ≤ a < b)', 'Asse y (gusci, 0 ≤ a < b)') }] },
      ...methodFields,
    ],
    run(inputs, b) {
      const fx = fnOf(inputs, b), gx = fnOf(inputs, b, 'g', 'g'), ends = endsOf(inputs, b);
      if (!fx || !gx || !ends) return undefined;
      const [a, z] = ends;
      if (!(z > a)) throw new Error('Serve a minore di b');
      const opts = options(b), df = slopeOf(fx), PI = Math.PI;
      if (b.config.axis === 'y') {
        if (a < 0) throw new Error('Per la rotazione attorno all\'asse y serve 0 ≤ a < b');
        const V = 2 * PI * absIntegral(x => x * (fx.f(x) - gx.f(x)), a, z, opts).total;
        const S = 2 * PI * integrateNumeric(x => x * Math.sqrt(1 + df(x) ** 2), a, z, opts).value;
        return { volume: tidy(V), surface: tidy(S) };
      }
      const V = PI * absIntegral(x => fx.f(x) ** 2 - gx.f(x) ** 2, a, z, opts).total;
      const S = 2 * PI * integrateNumeric(x => Math.abs(fx.f(x)) * Math.sqrt(1 + df(x) ** 2), a, z, opts).value;
      return { volume: tidy(V), surface: tidy(S) };
    },
  }),
  startWhenFree({
    type: 'int.arcLength', version: 1, category: 'integrals', icon: 'fit', label: L('Arc length', 'Lunghezza d\'arco'),
    inputs: [F_IN, END_A, END_B],
    outputs: [NUM('length', 'length', 'lunghezza')],
    config: [exprField('x^2'), varField, ...endFields('0', '1'), ...methodFields],
    run(inputs, b) {
      const fx = fnOf(inputs, b), ends = endsOf(inputs, b);
      if (!fx || !ends) return undefined;
      const df = slopeOf(fx);
      const r = integrateNumeric(x => Math.sqrt(1 + df(x) ** 2), ends[0], ends[1], options(b));
      return { length: tidy(Math.abs(r.value)) };
    },
  }),
  startWhenFree({
    type: 'int.multiple', version: 1, category: 'integrals', icon: 'integral', label: L('Double and triple integral', 'Integrale doppio e triplo'),
    inputs: [F_IN, ANY('x1', 'x from', 'x da'), ANY('x2', 'x to', 'x a'), ANY('y1', 'y from (number or in x)', 'y da (numero o in x)'), ANY('y2', 'y to (number or in x)', 'y a (numero o in x)'), ANY('z1', 'z from (in x, y)', 'z da (in x, y)', { hidden: true }), ANY('z2', 'z to (in x, y)', 'z a (in x, y)', { hidden: true })],
    outputs: [NUM('value', 'integral', 'integrale'), NUM('evaluations', 'evaluations', 'valutazioni', { hidden: true })],
    config: [
      { key: 'expr', type: 'text', default: 'x*y', label: L('Function f(x, y) or f(x, y, z) (when f is not linked)', 'Funzione f(x, y) o f(x, y, z) (se f non è collegato)') },
      { key: 'dims', type: 'select', default: '2', label: L('Integral', 'Integrale'), options: [{ value: '2', label: L('Double ∬ dy dx', 'Doppio ∬ dy dx') }, { value: '3', label: L('Triple ∭ dz dy dx', 'Triplo ∭ dz dy dx') }] },
      { key: 'x1', type: 'text', default: '0', label: L('x from', 'x da') }, { key: 'x2', type: 'text', default: '1', label: L('x to', 'x a') },
      { key: 'y1', type: 'text', default: '0', label: L('y from (may use x)', 'y da (può usare x)') }, { key: 'y2', type: 'text', default: '1', label: L('y to (may use x)', 'y a (può usare x)') },
      { key: 'z1', type: 'text', default: '0', label: L('z from (may use x, y)', 'z da (può usare x, y)') }, { key: 'z2', type: 'text', default: '1', label: L('z to (may use x, y)', 'z a (può usare x, y)') },
      { key: 'tolerance', type: 'number', default: 1e-8, min: 1e-12, max: 0.1, label: L('Tolerance', 'Tolleranza') },
    ],
    run(inputs, b) {
      const triple = b.config.dims === '3';
      const tree = treeOf(inputs, b);
      const ends = ['x1', 'x2', 'y1', 'y2', ...(triple ? ['z1', 'z2'] : [])].map(k => pick(inputs, b, k));
      if (tree === undefined || ends.some(e => e === undefined)) return undefined;
      const vars = triple ? ['x', 'y', 'z'] : ['x', 'y'];
      const f = functionOf(tree, vars);
      const x1 = bound(ends[0], 'x da'), x2 = bound(ends[1], 'x a');
      const y1 = boundFn(ends[2], ['x'], 'y da'), y2 = boundFn(ends[3], ['x'], 'y a');
      const z1 = triple ? boundFn(ends[4], ['x', 'y'], 'z da') : null, z2 = triple ? boundFn(ends[5], ['x', 'y'], 'z a') : null;
      const bud = budget(2_000_000);
      const tol = Math.max(1e-12, num(b.config.tolerance) || 1e-8);
      const inner = { tol: tol / 10, max: Infinity };
      const fz = bud.wrap(([x, y, z]) => f(x, y, z));
      const gy = triple
        ? (x, y) => integrateNumeric(z => fz([x, y, z]), z1(x, y), z2(x, y), { tol: tol / 100, max: Infinity }).value
        : (x, y) => fz([x, y]);
      const gx = x => integrateNumeric(y => gy(x, y), y1(x), y2(x), inner).value;
      const r = integrateNumeric(gx, x1, x2, { tol, max: Infinity });
      return { value: r.value, evaluations: bud.used };
    },
  }),
  {
    type: 'int.data', version: 1, category: 'integrals', icon: 'list', label: L('Integral of sampled data', 'Integrale di dati campionati'),
    inputs: [LIST('data', 'data (numbers or points {x, y})', 'dati (numeri o punti {x, y})')],
    outputs: [NUM('total', 'integral', 'integrale'), LIST('cumulative', 'running integral', 'integrale progressivo', { hidden: true })],
    config: [
      { key: 'method', type: 'select', default: 'trapezoid', label: L('Method', 'Metodo'), options: [{ value: 'trapezoid', label: L('Trapezoids', 'Trapezi') }, { value: 'simpson', label: L('Simpson (equally spaced points)', 'Simpson (punti equidistanti)') }] },
      { key: 'dx', type: 'number', default: 1, label: L('Step dx (for a list of numbers)', 'Passo dx (per una lista di numeri)') },
    ],
    run({ data }, b) {
      if (data === undefined) return undefined;
      const pts = samplesOf(data, num(b.config.dx));
      const cumulative = [0];
      for (let i = 1; i < pts.length; i++) cumulative.push(cumulative[i - 1] + (pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1]) / 2);
      let total = cumulative[cumulative.length - 1];
      if (b.config.method === 'simpson' && pts.length >= 3) {
        const h = pts[1][0] - pts[0][0];
        for (let i = 2; i < pts.length; i++) if (Math.abs(pts[i][0] - pts[i - 1][0] - h) > 1e-9 * Math.max(1, Math.abs(h))) throw new Error('Simpson vuole punti equidistanti: usa i trapezi');
        const n = pts.length - 1, even = n % 2 === 0 ? n : n - 1;
        let s = 0;
        for (let i = 0; i < even; i += 2) s += h / 3 * (pts[i][1] + 4 * pts[i + 1][1] + pts[i + 2][1]);
        // an odd number of intervals: the last one with a trapezoid
        if (even < n) s += h * (pts[n - 1][1] + pts[n][1]) / 2;
        total = s;
      }
      return { total: tidy(total), cumulative: cumulative.map(tidy) };
    },
  },
  {
    type: 'int.signal', version: 1, category: 'integrals', icon: 'gauge', label: L('Signal integrator (∫ dt)', 'Integratore di segnale (∫ dt)'),
    inputs: [NUM('value', 'value', 'valore'), { name: 'reset', type: 'pulse', label: L('reset', 'azzera') }, { ...NUM('t', 't (seconds; else the clock)', 't (secondi; altrimenti l\'orologio)'), hidden: true, trigger: false }],
    outputs: [NUM('total', 'integral', 'integrale')],
    config: [
      { key: 'per', type: 'select', default: 's', label: L('Time unit', 'Unità di tempo'), options: [{ value: 's', label: L('second', 'secondo') }, { value: 'min', label: L('minute', 'minuto') }, { value: 'h', label: L('hour', 'ora') }] },
      { key: 'method', type: 'select', default: 'trapezoid', label: L('Method', 'Metodo'), options: [{ value: 'trapezoid', label: L('Trapezoids (mean of the last two values)', 'Trapezi (media degli ultimi due valori)') }, { value: 'hold', label: L('Rectangles (the last value holds until the next)', 'Rettangoli (l\'ultimo valore vale fino al prossimo)') }] },
      { key: 'start', type: 'number', default: 0, label: L('Start value', 'Valore iniziale') },
      { key: 'limit', type: 'checkbox', default: false, label: L('Keep between a minimum and a maximum (anti-windup)', 'Tieni tra un minimo e un massimo (anti-windup)') },
      { key: 'min', type: 'number', default: 0, label: L('Minimum', 'Minimo'), when: { limit: true } },
      { key: 'max', type: 'number', default: 100, label: L('Maximum', 'Massimo'), when: { limit: true } },
    ],
    start(b) { b.memory().total = num(b.config.start) || 0; b.send('total', tidy(b.memory().total)); },
    run(inputs, b) {
      const m = b.memory();
      if (b.trigger === 'reset') { m.total = num(b.config.start) || 0; m.last = null; return { total: tidy(m.total) }; }
      if (b.trigger !== 'value' || inputs.value === undefined) return undefined;
      if (b.linked('t') && inputs.t === undefined) return undefined;   // its time has not arrived yet
      const v = need(inputs.value, 'valore');
      const t = b.linked('t') || inputs.t !== undefined ? need(inputs.t, 't') : b.now() / 1000;
      if (m.last) {
        const dt = (t - m.last.t) / ({ s: 1, min: 60, h: 3600 }[b.config.per] ?? 1);
        if (dt > 0) m.total += dt * (b.config.method === 'hold' ? m.last.v : (m.last.v + v) / 2);
      }
      m.last = { t, v };
      if (b.config.limit) {
        const lo = num(b.config.min), hi = num(b.config.max);
        if (Number.isFinite(lo) && m.total < lo) m.total = lo;
        if (Number.isFinite(hi) && m.total > hi) m.total = hi;
      }
      return { total: tidy(m.total) };
    },
  },
  startWhenFree({
    type: 'int.ode', version: 1, category: 'integrals', icon: 'chart', label: L("Differential equation y' = f(x, y)", "Equazione differenziale y' = f(x, y)"),
    inputs: [F_IN, ANY('x0', 'x₀', 'x₀'), NUM('y0', 'y(x₀)', 'y(x₀)'), NUM('dy0', "y'(x₀) (2nd order)", "y'(x₀) (2° ordine)", { hidden: true }), ANY('x1', 'x end', 'x finale')],
    outputs: [NUM('y', 'y(x end)', 'y(x finale)'), NUM('dy', "y'(x end)", "y'(x finale)", { hidden: true }), LIST('points', 'points {x, y}', 'punti {x, y}')],
    config: [
      { key: 'order', type: 'select', default: '1', label: L('Order', 'Ordine'), options: [{ value: '1', label: L("1st: y' = f(x, y)", "1°: y' = f(x, y)") }, { value: '2', label: L("2nd: y'' = f(x, y, y')", "2°: y'' = f(x, y, y')") }] },
      { key: 'expr', type: 'text', default: '-2x*y', label: L("f (when the input is not linked): uses x, y and, for the 2nd order, y'", "f (se l'ingresso non è collegato): usa x, y e, per il 2° ordine, y'") },
      varField,
      { key: 'x0', type: 'text', default: '0', label: L('x₀ (when the input is not linked)', 'x₀ (se l\'ingresso non è collegato)') },
      { key: 'y0', type: 'number', default: 1, label: L('y(x₀) (when the input is not linked)', 'y(x₀) (se l\'ingresso non è collegato)') },
      { key: 'dy0', type: 'number', default: 0, label: L("y'(x₀) (2nd order, when the input is not linked)", "y'(x₀) (2° ordine, se l'ingresso non è collegato)"), when: { order: '2' } },
      { key: 'x1', type: 'text', default: '2', label: L('x end (when the input is not linked)', 'x finale (se l\'ingresso non è collegato)') },
      { key: 'method', type: 'select', default: 'rk45', label: L('Method', 'Metodo'), options: [{ value: 'rk45', label: L('Runge–Kutta 4(5), adaptive (Dormand–Prince)', 'Runge-Kutta 4(5), adattivo (Dormand-Prince)') }, { value: 'rk4', label: L('Runge–Kutta 4, fixed steps', 'Runge-Kutta 4, passi fissi') }, { value: 'euler', label: L('Euler, fixed steps', 'Eulero, passi fissi') }] },
      { key: 'steps', type: 'number', default: 1000, min: 1, max: 1000000, label: L('Steps (RK4, Euler)', 'Passi (RK4, Eulero)') },
      { key: 'tolerance', type: 'number', default: 1e-8, min: 1e-14, max: 0.1, label: L('Tolerance (RK45)', 'Tolleranza (RK45)') },
    ],
    run(inputs, b) {
      const tree = treeOf(inputs, b);
      const X0 = pick(inputs, b, 'x0'), Y0 = pick(inputs, b, 'y0'), X1 = pick(inputs, b, 'x1');
      const second = b.config.order === '2';
      const DY0 = second ? pick(inputs, b, 'dy0') : 0;
      if (tree === undefined || [X0, Y0, X1, DY0].some(v => v === undefined)) return undefined;
      const xv = variableOf(b);
      const vars = second ? [xv, 'y', "y'"] : [xv, 'y'];
      const f = functionOf(tree, vars);
      const x0 = bound(X0, 'x₀'), x1 = bound(X1, 'x finale');
      const y0 = need(Y0, 'y(x₀)'), dy0 = second ? need(DY0, "y'(x₀)") : 0;
      const bud = budget(1_000_000);
      const call = bud.wrap(args => f(...args));
      const F = second ? (x, [y, yp]) => [yp, call([x, y, yp])] : (x, [y]) => [call([x, y])];
      const r = solveOde(F, x0, second ? [y0, dy0] : [y0], x1, { method: b.config.method ?? 'rk45', steps: num(b.config.steps) || 1000, tol: Math.max(1e-14, num(b.config.tolerance) || 1e-8) });
      return { y: tidy(r.y[0]), dy: second ? tidy(r.y[1]) : undefined, points: r.points.map(p => ({ x: tidy(p.x), y: tidy(p.y[0]) })) };
    },
  }),
];
