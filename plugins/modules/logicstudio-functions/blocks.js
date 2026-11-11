/**
 * The function blocks of Logic Studio (algebraic, exponential and logarithmic functions,
 * derivatives), loaded by the engine in each user's worker (and read in the kernel's main thread
 * for the catalog: nothing here runs at import). Same format as logicstudio-core/blocks.js.
 *
 * A function travels as text: an expression such as «3x^2 + 2sin(x)» (lib/shared/mathexpr.js has
 * the syntax). Each block takes it from its input «f», or from its setting «Funzione» when nothing
 * is linked to f; names other than the variable are parameters, which get a value in the block
 * Funzione f(x). Angles inside expressions are radians.
 */
import {
  parse, print, simplify, substitute, derive, compile, symbols, polyCoeffs, polyTree, polyRoots,
  brent, newton, numericDerivative,
} from './lib/shared/mathexpr.js';
import { L, num, tidy, F_IN, exprField, varField, pick, variableOf, treeOf, functionOf, bound, need, startWhenFree, checkList } from './lib/shared/mathblocks.js';

const NUM = (name, en, it, extra = {}) => ({ name, type: 'number', label: L(en, it), ...extra });
const TEXT = (name, en, it, extra = {}) => ({ name, type: 'text', label: L(en, it), ...extra });
const LIST = (name, en, it, extra = {}) => ({ name, type: 'list', label: L(en, it), ...extra });

/** The function of a block and its variable, or undefined while f is linked and empty. */
function fnOf(inputs, b) {
  const tree = treeOf(inputs, b);
  if (tree === undefined) return undefined;
  const v = variableOf(b);
  return { tree, v, f: functionOf(tree, [v]) };
}

/** The symbolic derivative, or null when the function has no symbolic one (min, max…). */
function derivativeTree(tree, v) {
  try { return derive(tree, v); } catch { return null; }
}

/** f' as a function: symbolic when possible, else numeric. */
function derivativeFn(tree, v, f) {
  const d = derivativeTree(tree, v);
  if (d) { const df = compile(d, [v]); return x => df(x); }
  return x => numericDerivative(f, x, 1);
}

/** A value of f that must be finite. */
function at(f, x) {
  const y = f(x);
  if (!Number.isFinite(y)) throw new Error(`La funzione non ha un valore finito in x = ${tidy(x)}`);
  return y;
}

/** A polynomial's coefficients from a list, in the order of the setting: always [c0, c1…]. */
function coeffsOf(list, b, what = 'coefficienti') {
  checkList(list, `La lista dei ${what}`);
  if (!list.length) throw new Error(`La lista dei ${what} è vuota`);
  if (list.length > 101) throw new Error('Al massimo il grado 100');
  const c = list.map((v, i) => need(v, `${what}, elemento ${i + 1}`));
  const low = b.config.order === 'low' ? c : [...c].reverse();
  while (low.length > 1 && low[low.length - 1] === 0) low.pop();
  return low;
}
const inOrder = (low, b) => (b.config.order === 'low' ? low : [...low].reverse()).map(tidy);
const orderField = { key: 'order', type: 'select', default: 'high', label: L('Coefficients', 'Coefficienti'), options: [{ value: 'high', label: L('From the highest power ([1, -3, 2] = x² − 3x + 2)', 'Dal grado più alto ([1, -3, 2] = x² − 3x + 2)') }, { value: 'low', label: L('From the constant term ([2, -3, 1] = 2 − 3x + x²)', 'Dal termine noto ([2, -3, 1] = 2 − 3x + x²)') }] };

/** Polynomial division: [quotient, remainder] of low-first coefficient lists. */
function polyDiv(p, q) {
  if (q.length === 1 && q[0] === 0) throw new Error('Divisione per il polinomio nullo');
  const r = [...p], out = new Array(Math.max(1, p.length - q.length + 1)).fill(0);
  for (let i = p.length - q.length; i >= 0; i--) {
    const c = r[i + q.length - 1] / q[q.length - 1];
    out[i] = c;
    for (let j = 0; j < q.length; j++) r[i + j] -= c * q[j];
  }
  const rem = r.slice(0, Math.max(1, q.length - 1));
  const scale = Math.max(1, ...p.map(Math.abs));
  const clean = a => { const x = a.map(v => (Math.abs(v) < 1e-12 * scale ? 0 : v)); while (x.length > 1 && x[x.length - 1] === 0) x.pop(); return x; };
  return [clean(out), clean(rem)];
}

const POLY_OPS = {
  add: L('p + q', 'p + q'), sub: L('p − q', 'p − q'), mul: L('p · q', 'p · q'),
  div: L('p ÷ q (quotient and remainder)', 'p ÷ q (quoziente e resto)'), gcd: L('GCD of p and q', 'MCD di p e q'),
  derivative: L('Derivative of p', 'Derivata di p'), integral: L('Integral of p (constant 0)', 'Integrale di p (costante 0)'),
};

const POWER_OPS = {
  pow: [L('xⁿ (Math.pow)', 'xⁿ (Math.pow)'), (x, n) => {
    if (x === 0 && n < 0) throw new Error('0 elevato a un esponente negativo non esiste (è una divisione per 0)');
    const r = Math.pow(x, n);
    if (Number.isNaN(r)) throw new Error('Potenza di un numero negativo con esponente non intero: il risultato non è reale');
    return r;
  }, true],
  root: [L('n-th root ⁿ√x', 'Radice n-esima ⁿ√x'), (x, n) => {
    if (n === 0) throw new Error('L\'indice della radice non può essere 0');
    if (x < 0) {
      if (!Number.isInteger(n) || n % 2 === 0) throw new Error('La radice di indice pari di un numero negativo non è reale');
      return -Math.pow(-x, 1 / n);
    }
    return Math.pow(x, 1 / n);
  }, true],
  square: [L('x² (square)', 'x² (quadrato)'), x => x * x],
  cube: [L('x³ (cube)', 'x³ (cubo)'), x => x * x * x],
  sqrt: [L('√x (Math.sqrt)', '√x (Math.sqrt)'), x => { if (x < 0) throw new Error('La radice quadrata di un numero negativo non è reale'); return Math.sqrt(x); }],
  cbrt: [L('∛x (Math.cbrt)', '∛x (Math.cbrt)'), x => Math.cbrt(x)],
  reciprocal: [L('1/x (reciprocal)', '1/x (reciproco)'), x => { if (x === 0) throw new Error('Il reciproco di 0 non esiste'); return 1 / x; }],
};

const EXP_BASES = {
  e: [L('eˣ (Math.exp)', 'eˣ (Math.exp)'), x => Math.exp(x)],
  two: [L('2ˣ', '2ˣ'), x => 2 ** x],
  ten: [L('10ˣ', '10ˣ'), x => 10 ** x],
  a: [L('aˣ (the «a» input)', 'aˣ (l\'ingresso «a»)'), (x, a) => {
    if (a <= 0) throw new Error('La base a deve essere maggiore di 0');
    return a ** x;
  }, true],
  expm1: [L('eˣ − 1 (Math.expm1, precise near 0)', 'eˣ − 1 (Math.expm1, preciso vicino a 0)'), x => Math.expm1(x)],
};

const LOG_BASES = {
  ln: [L('ln x (natural, Math.log)', 'ln x (naturale, Math.log)'), x => Math.log(x)],
  log10: [L('log₁₀ x (Math.log10)', 'log₁₀ x (Math.log10)'), x => Math.log10(x)],
  log2: [L('log₂ x (Math.log2)', 'log₂ x (Math.log2)'), x => Math.log2(x)],
  b: [L('log_b x (the «b» input)', 'log_b x (l\'ingresso «b»)'), (x, base) => {
    if (base <= 0 || base === 1) throw new Error('La base del logaritmo deve essere maggiore di 0 e diversa da 1');
    return Math.log(x) / Math.log(base);
  }, true],
  log1p: [L('ln(1 + x) (Math.log1p, precise near 0)', 'ln(1 + x) (Math.log1p, preciso vicino a 0)'), x => Math.log1p(x)],
};

/**
 * One side of a limit: the value, ±Infinity, or null when it does not settle. Samples at h = 10⁻¹ …
 * 10⁻⁹ from x₀ (or x = 10 … 10⁹ towards ∞); each pair of samples gives an extrapolated value
 * (Richardson, error ∝ h or ∝ h²), and the pair where two estimates agree best wins: far enough from x₀
 * for the rounding of the computer, close enough for the limit. A value equal to f(x₀), or to 0,
 * within that precision is given exactly.
 */
function oneSide(f, x0, side) {
  const K = 9;
  const xs = Number.isFinite(x0)
    ? Array.from({ length: K }, (_, k) => x0 + side * 10 ** -(k + 1) * Math.max(1, Math.abs(x0)))
    : Array.from({ length: K }, (_, k) => Math.sign(x0) * 10 ** (k + 1));
  const ys = xs.map(x => f(x));
  const tail = ys.slice(-3);
  if (tail.some(y => Number.isNaN(y))) return null;
  // growing without bound with one sign
  if (tail.every(y => Math.abs(y) > 1e5) && tail.every(y => Math.sign(y) === Math.sign(tail[0]))) {
    const growing = tail.every((y, i) => i === 0 || Math.abs(y) >= Math.abs(tail[i - 1]));
    if (growing || tail.some(y => !Number.isFinite(y))) return Math.sign(tail[0]) * Infinity;
  }
  // error ∝ h (factor 10) or ∝ h² (factor 100): both tried, the steadier wins
  let est = NaN, gap = Infinity;
  for (const r of [10, 100]) {
    const R = [];
    for (let k = 0; k + 1 < K; k++) R.push(Number.isFinite(ys[k]) && Number.isFinite(ys[k + 1]) ? (r * ys[k + 1] - ys[k]) / (r - 1) : NaN);
    for (let k = 0; k + 1 < R.length; k++) {
      const d = Math.abs(R[k + 1] - R[k]);
      if (Number.isFinite(d) && d < gap) { gap = d; est = R[k + 1]; }
    }
  }
  if (!Number.isFinite(est)) return null;
  const scale = Math.max(1, ...ys.filter(Number.isFinite).map(Math.abs));
  const tol = Math.max(gap * 10, 1e-12 * scale);
  if (gap > 1e-6 * Math.max(1, Math.abs(est))) return null;
  if (Number.isFinite(x0)) {
    const at = f(x0);
    if (Number.isFinite(at) && Math.abs(at - est) <= tol) return Number(at.toPrecision(15));
  }
  if (Math.abs(est) <= Math.max(tol, 1e-9 * scale)) return 0;
  return Number(est.toPrecision(10));
}

/** Whether f has a corner at x (left and right slopes differ): the derivative does not exist there. */
function corner(f, x) {
  const h = 1e-6 * Math.max(1, Math.abs(x));
  const y = f(x), left = (y - f(x - h)) / h, right = (f(x + h) - y) / h;
  if (![y, left, right].every(Number.isFinite)) return false;
  return Math.abs(left - right) > 1e-3 * Math.max(1, Math.abs(left), Math.abs(right));
}
const noCorner = (f, x, v = 'x') => { if (corner(f, x)) throw new Error(`La derivata non esiste in ${v} = ${tidy(x)}: è un punto angoloso`); };

// ---------------------------------------------------------------- study of a function

/** Sign changes of g on the samples, refined: [x]. Poles (|g| large on both sides) are skipped. */
function signChanges(g, xs, ys) {
  const out = [];
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] === 0) { if (!out.length || Math.abs(out[out.length - 1] - xs[i]) > 1e-12) out.push(xs[i]); continue; }
    if (i === 0 || !Number.isFinite(ys[i]) || !Number.isFinite(ys[i - 1]) || ys[i - 1] === 0) continue;
    if (Math.sign(ys[i]) === Math.sign(ys[i - 1])) continue;
    try {
      const { root } = brent(g, xs[i - 1], xs[i], 1e-14);
      const gr = g(root);
      const scale = Math.max(Math.abs(ys[i]), Math.abs(ys[i - 1]), 1e-300);
      if (Number.isFinite(gr) && Math.abs(gr) <= 1e-6 * Math.max(1, scale)) out.push(root);
    } catch { /* a pole or a jump */ }
  }
  return out;
}

const pt = (x, y) => ({ x: tidy(x), y: tidy(y) });

// ---------------------------------------------------------------- blocks

export const blocks = [
  startWhenFree({
    type: 'fn.define', version: 1, category: 'functions', icon: 'function', label: L('Function f(x)', 'Funzione f(x)'),
    inputs: [],
    outputs: [TEXT('f', 'f (function)', 'f (funzione)'), LIST('names', 'names left', 'nomi rimasti', { hidden: true })],
    config: [{ key: 'expr', type: 'text', default: 'x^2', label: L('Function', 'Funzione') }],
    grow: { inputs: { type: 'number', max: 16, name: 'user', label: L('parameter', 'parametro') } },
    run(inputs, b) {
      const params = {};
      for (const p of b.added.inputs) {
        if (p.value === undefined) { if (b.linked(p.id)) return undefined; continue; }
        params[p.name] = need(p.value, p.name);
      }
      const tree = treeOf({}, b, 'f', 'expr');
      const out = simplify(substitute(tree, params));
      return { f: print(out), names: [...symbols(out)].sort() };
    },
  }),
  {
    type: 'fn.eval', version: 1, category: 'functions', icon: 'function', label: L('Evaluate f(x)', 'Calcola f(x)'),
    inputs: [F_IN, { name: 'x', type: 'any', label: L('x (number or list)', 'x (numero o lista)') }],
    outputs: [{ name: 'y', type: 'any', label: L('f(x)', 'f(x)') }],
    config: [exprField(), varField],
    grow: { inputs: { type: 'number', max: 8, name: 'user', label: L('other variable', 'altra variabile') } },
    run(inputs, b) {
      if (inputs.x === undefined) return undefined;
      const tree = treeOf(inputs, b);
      if (tree === undefined) return undefined;
      const v = variableOf(b);
      const others = b.added.inputs;
      if (others.some(p => p.value === undefined)) return undefined;
      const f = functionOf(tree, [v, ...others.map(p => p.name)]);
      const rest = others.map(p => need(p.value, p.name));
      const one = x => { const y = f(need(x, v), ...rest); return Number.isFinite(y) ? tidy(y) : null; };
      if (Array.isArray(inputs.x)) return { y: checkList(inputs.x, 'La lista delle x').map(one) };
      const y = one(inputs.x);
      if (y === null) throw new Error(`La funzione non ha un valore finito in ${v} = ${inputs.x}`);
      return { y };
    },
  },
  startWhenFree({
    type: 'fn.table', version: 1, category: 'functions', icon: 'chart', label: L('Table of values', 'Tabella valori'),
    inputs: [F_IN, NUM('from', 'from', 'da'), NUM('to', 'to', 'a')],
    outputs: [LIST('points', 'points {x, y}', 'punti {x, y}'), LIST('xs', 'x list', 'lista delle x', { hidden: true }), LIST('ys', 'y list', 'lista delle y', { hidden: true })],
    config: [exprField(), varField, { key: 'from', type: 'number', default: -10, label: L('From', 'Da') }, { key: 'to', type: 'number', default: 10, label: L('To', 'A') }, { key: 'count', type: 'number', default: 101, min: 2, max: 10000, label: L('Points', 'Punti') }],
    run(inputs, b) {
      const fx = fnOf(inputs, b);
      const a = pick(inputs, b, 'from'), z = pick(inputs, b, 'to');
      if (!fx || a === undefined || z === undefined) return undefined;
      const lo = bound(a, 'da'), hi = bound(z, 'a');
      const n = Math.round(num(b.config.count));
      if (!Number.isInteger(n) || n < 2 || n > 10000) throw new Error('Punti: da 2 a 10000');
      const xs = [], ys = [];
      for (let i = 0; i < n; i++) {
        const x = lo + (hi - lo) * i / (n - 1), y = fx.f(x);
        xs.push(tidy(x)); ys.push(Number.isFinite(y) ? tidy(y) : null);
      }
      return { points: xs.map((x, i) => ({ x, y: ys[i] })), xs, ys };
    },
  }),
  startWhenFree({
    type: 'fn.solve', version: 1, category: 'functions', icon: 'compare', label: L('Solve f(x) = 0', 'Risolvi f(x) = 0'),
    inputs: [F_IN, NUM('a', 'interval from', 'intervallo da'), NUM('b', 'interval to', 'intervallo a'), NUM('x0', 'start point (Newton)', 'punto di partenza (Newton)', { hidden: true })],
    outputs: [NUM('root', 'root', 'radice'), NUM('value', 'f(root)', 'f(radice)', { hidden: true }), NUM('iterations', 'iterations', 'iterazioni', { hidden: true })],
    config: [
      exprField('x^2 - 2'), varField,
      { key: 'method', type: 'select', default: 'brent', label: L('Method', 'Metodo'), options: [{ value: 'brent', label: L('Brent, in the interval [a, b]', 'Brent, nell\'intervallo [a, b]') }, { value: 'newton', label: L('Newton, from x0', 'Newton, dal punto x0') }] },
      { key: 'a', type: 'text', default: '0', label: L('Interval from (when a is not linked)', 'Intervallo da (se a non è collegato)') },
      { key: 'b', type: 'text', default: '2', label: L('Interval to (when b is not linked)', 'Intervallo a (se b non è collegato)') },
      { key: 'x0', type: 'text', default: '1', label: L('Start point (when x0 is not linked)', 'Punto di partenza (se x0 non è collegato)') },
    ],
    run(inputs, b) {
      const fx = fnOf(inputs, b);
      if (!fx) return undefined;
      let r;
      if (b.config.method === 'newton') {
        const x0 = pick(inputs, b, 'x0');
        if (x0 === undefined) return undefined;
        r = newton(fx.f, derivativeFn(fx.tree, fx.v, fx.f), bound(x0, 'x0'));
      } else {
        const a = pick(inputs, b, 'a'), z = pick(inputs, b, 'b');
        if (a === undefined || z === undefined) return undefined;
        const lo = bound(a, 'a'), hi = bound(z, 'b');
        r = brent(fx.f, lo, hi);
        const fr = Math.abs(fx.f(r.root)), scale = Math.max(1, Math.abs(fx.f(lo)), Math.abs(fx.f(hi)));
        if (!(fr <= 1e-6 * scale)) throw new Error(`f cambia segno in x ≈ ${tidy(r.root)} senza annullarsi: è un salto o un polo, non una radice`);
      }
      return { root: tidy(r.root), value: tidy(fx.f(r.root)), iterations: r.iterations };
    },
  }),
  {
    type: 'fn.quadratic', version: 1, category: 'functions', icon: 'chart', label: L('Quadratic equation ax² + bx + c = 0', 'Equazione di 2° grado ax² + bx + c = 0'),
    inputs: [NUM('a', 'a', 'a'), NUM('b', 'b', 'b'), NUM('c', 'c', 'c')],
    outputs: [
      NUM('x1', 'x₁', 'x₁'), NUM('x2', 'x₂', 'x₂'), NUM('delta', 'Δ (discriminant)', 'Δ (discriminante)'),
      { name: 'complex', type: 'bool', label: L('complex roots', 'radici complesse'), hidden: true },
      LIST('roots', 'roots {re, im}', 'radici {re, im}', { hidden: true }),
      NUM('vertexX', 'vertex x', 'vertice x', { hidden: true }), NUM('vertexY', 'vertex y', 'vertice y', { hidden: true }),
    ],
    config: [],
    run(inputs) {
      if (['a', 'b', 'c'].some(k => inputs[k] === undefined)) return undefined;
      const a = need(inputs.a, 'a'), bb = need(inputs.b, 'b'), c = need(inputs.c, 'c');
      if (a === 0) throw new Error('a = 0: non è un\'equazione di secondo grado');
      const delta = bb * bb - 4 * a * c;
      const roots = polyRoots([c, bb, a]);
      const vx = -bb / (2 * a);
      const out = { delta: tidy(delta), complex: delta < 0, roots, vertexX: tidy(vx), vertexY: tidy(a * vx * vx + bb * vx + c) };
      if (delta >= 0) { out.x1 = roots[0].re; out.x2 = roots[1].re; }
      return out;
    },
  },
  {
    type: 'fn.poly', version: 1, category: 'functions', icon: 'function', label: L('Polynomial: value and roots', 'Polinomio: valore e radici'),
    inputs: [LIST('coefficients', 'coefficients', 'coefficienti'), { name: 'x', type: 'any', label: L('x (number or list)', 'x (numero o lista)') }],
    outputs: [
      { name: 'value', type: 'any', label: L('p(x)', 'p(x)') },
      LIST('roots', 'roots {re, im}', 'radici {re, im}'), LIST('real', 'real roots', 'radici reali'),
      NUM('degree', 'degree', 'grado', { hidden: true }), TEXT('expression', 'expression', 'espressione', { hidden: true }),
      LIST('derivative', 'derivative coefficients', 'coefficienti della derivata', { hidden: true }),
    ],
    config: [orderField],
    run(inputs, b) {
      if (inputs.coefficients === undefined) return undefined;
      const c = coeffsOf(inputs.coefficients, b);
      const ev = x => { let s = 0; for (let i = c.length - 1; i >= 0; i--) s = s * x + c[i]; return tidy(s); };
      const out = {};
      if (b.trigger !== 'x') {
        if (c.length === 1 && c[0] === 0) throw new Error('Il polinomio nullo ha infinite radici');
        const roots = polyRoots(c);
        const real = [...new Set(roots.filter(r => r.im === 0).map(r => r.re))].sort((p, q) => p - q);
        Object.assign(out, { roots, real, degree: c.length - 1, expression: print(polyTree(c)), derivative: c.length === 1 ? [0] : inOrder(c.slice(1).map((v, i) => v * (i + 1)), b) });
      }
      if (inputs.x !== undefined) out.value = Array.isArray(inputs.x) ? checkList(inputs.x, 'La lista delle x').map(x => ev(need(x, 'x'))) : ev(need(inputs.x, 'x'));
      return out;
    },
  },
  {
    type: 'fn.polyOps', version: 1, category: 'functions', icon: 'function', label: L('Operations on polynomials', 'Operazioni tra polinomi'),
    inputs: [LIST('p', 'p (coefficients)', 'p (coefficienti)'), LIST('q', 'q (coefficients)', 'q (coefficienti)')],
    outputs: [LIST('result', 'result', 'risultato'), LIST('remainder', 'remainder', 'resto', { hidden: true }), TEXT('expression', 'expression', 'espressione', { hidden: true })],
    config: [{ key: 'op', type: 'select', default: 'mul', options: Object.entries(POLY_OPS).map(([value, label]) => ({ value, label })), label: L('Operation', 'Operazione') }, orderField],
    run(inputs, b) {
      const op = POLY_OPS[b.config.op] ? b.config.op : 'mul';
      const one = op === 'derivative' || op === 'integral';
      if (inputs.p === undefined || !one && inputs.q === undefined) return undefined;
      const p = coeffsOf(inputs.p, b, 'coefficienti di p');
      const q = one ? null : coeffsOf(inputs.q, b, 'coefficienti di q');
      let r, rem;
      if (op === 'add' || op === 'sub') r = Array.from({ length: Math.max(p.length, q.length) }, (_, i) => (p[i] ?? 0) + (op === 'sub' ? -1 : 1) * (q[i] ?? 0));
      else if (op === 'mul') { r = new Array(p.length + q.length - 1).fill(0); p.forEach((x, i) => q.forEach((y, j) => { r[i + j] += x * y; })); }
      else if (op === 'div') [r, rem] = polyDiv(p, q);
      else if (op === 'derivative') r = p.length === 1 ? [0] : p.slice(1).map((v, i) => v * (i + 1));
      else if (op === 'integral') r = [0, ...p.map((v, i) => v / (i + 1))];
      else {
        // Euclid; the result is monic
        let x = p, y = q;
        if (y.length === 1 && y[0] === 0) [x, y] = [y, x];
        for (let i = 0; i < 200 && !(y.length === 1 && Math.abs(y[0]) < 1e-12); i++) [x, y] = [y, polyDiv(x, y)[1]];
        r = x.map(v => v / x[x.length - 1]);
      }
      while (r.length > 1 && Math.abs(r[r.length - 1]) < 1e-15) r.pop();
      return { result: inOrder(r, b), remainder: rem ? inOrder(rem, b) : undefined, expression: print(polyTree(r)) };
    },
  },
  {
    type: 'fn.power', version: 1, category: 'functions', icon: 'calculator', label: L('Powers and roots (Math.pow, Math.sqrt)', 'Potenze e radici (Math.pow, Math.sqrt)'),
    inputs: [NUM('x', 'x', 'x'), NUM('n', 'n (exponent or index)', 'n (esponente o indice)')],
    outputs: [NUM('result', 'result', 'risultato')],
    config: [{ key: 'op', type: 'select', default: 'pow', options: Object.entries(POWER_OPS).map(([value, [label]]) => ({ value, label })), label: L('Operation', 'Operazione') }],
    run(inputs, b) {
      const [, f, withN] = POWER_OPS[b.config.op] ?? POWER_OPS.pow;
      if (inputs.x === undefined || withN && inputs.n === undefined) return undefined;
      const r = f(need(inputs.x, 'x'), withN ? need(inputs.n, 'n') : undefined);
      if (!Number.isFinite(r)) throw new Error('Il risultato è troppo grande');
      return { result: tidy(r) };
    },
  },
  {
    type: 'fn.exp', version: 1, category: 'functions', icon: 'chart', label: L('Exponentials (Math.exp)', 'Esponenziali (Math.exp)'),
    inputs: [NUM('x', 'x', 'x'), NUM('a', 'a (base)', 'a (base)', { hidden: true })],
    outputs: [NUM('result', 'result', 'risultato')],
    config: [{ key: 'base', type: 'select', default: 'e', options: Object.entries(EXP_BASES).map(([value, [label]]) => ({ value, label })), label: L('Function', 'Funzione') }],
    run(inputs, b) {
      const [, f, withA] = EXP_BASES[b.config.base] ?? EXP_BASES.e;
      if (inputs.x === undefined || withA && inputs.a === undefined) return undefined;
      const r = f(need(inputs.x, 'x'), withA ? need(inputs.a, 'a') : undefined);
      if (!Number.isFinite(r)) throw new Error('Il risultato è troppo grande');
      return { result: tidy(r) };
    },
  },
  {
    type: 'fn.log', version: 1, category: 'functions', icon: 'chart', label: L('Logarithms (Math.log)', 'Logaritmi (Math.log)'),
    inputs: [NUM('x', 'x', 'x'), NUM('b', 'b (base)', 'b (base)', { hidden: true })],
    outputs: [NUM('result', 'result', 'risultato')],
    config: [{ key: 'base', type: 'select', default: 'ln', options: Object.entries(LOG_BASES).map(([value, [label]]) => ({ value, label })), label: L('Function', 'Funzione') }],
    run(inputs, b) {
      const key = LOG_BASES[b.config.base] ? b.config.base : 'ln';
      const [, f, withB] = LOG_BASES[key];
      if (inputs.x === undefined || withB && inputs.b === undefined) return undefined;
      const x = need(inputs.x, 'x');
      if (key === 'log1p' ? x <= -1 : x <= 0) throw new Error(key === 'log1p' ? 'ln(1 + x) vuole x > −1' : 'Il logaritmo vuole x > 0');
      return { result: tidy(f(x, withB ? need(inputs.b, 'b') : undefined)) };
    },
  },
  {
    type: 'fn.growth', version: 1, category: 'functions', icon: 'chart', label: L('Exponential growth and decay', 'Crescita e decadimento esponenziale'),
    inputs: [NUM('n0', 'N₀ (start value)', 'N₀ (valore iniziale)'), NUM('t', 't (time)', 't (tempo)'), NUM('k', 'k (rate)', 'k (tasso)', { hidden: true }), NUM('T', 'T (half-life or doubling time)', 'T (dimezzamento o raddoppio)', { hidden: true })],
    outputs: [NUM('n', 'N(t)', 'N(t)'), NUM('k', 'k (rate)', 'k (tasso)', { hidden: true }), NUM('halfLife', 'half-life or doubling time', 'tempo di dimezzamento o raddoppio', { hidden: true })],
    config: [
      { key: 'mode', type: 'select', default: 'rate', label: L('Given', 'Dato'), options: [{ value: 'rate', label: L('Rate k: N = N₀·e^(k·t)', 'Tasso k: N = N₀·e^(k·t)') }, { value: 'halfLife', label: L('Half-life T (decay)', 'Tempo di dimezzamento T (decadimento)') }, { value: 'doubling', label: L('Doubling time T (growth)', 'Tempo di raddoppio T (crescita)') }] },
      { key: 'k', type: 'number', default: 0.05, label: L('k (when the input is not linked)', 'k (se l\'ingresso non è collegato)') },
      { key: 'T', type: 'number', default: 10, label: L('T (when the input is not linked)', 'T (se l\'ingresso non è collegato)') },
    ],
    run(inputs, b) {
      if (inputs.n0 === undefined || inputs.t === undefined) return undefined;
      const n0 = need(inputs.n0, 'N₀'), t = need(inputs.t, 't');
      let k;
      if (b.config.mode === 'halfLife' || b.config.mode === 'doubling') {
        const T = pick(inputs, b, 'T');
        if (T === undefined) return undefined;
        const tt = need(T, 'T');
        if (tt <= 0) throw new Error('T deve essere maggiore di 0');
        k = (b.config.mode === 'halfLife' ? -1 : 1) * Math.LN2 / tt;
      } else {
        const kk = pick(inputs, b, 'k');
        if (kk === undefined) return undefined;
        k = need(kk, 'k');
      }
      const n = n0 * Math.exp(k * t);
      if (!Number.isFinite(n)) throw new Error('Il risultato è troppo grande');
      return { n: tidy(n), k: tidy(k), halfLife: k === 0 ? undefined : tidy(Math.LN2 / Math.abs(k)) };
    },
  },

  // ---- differential calculus
  startWhenFree({
    type: 'fn.derivative', version: 1, category: 'functions', icon: 'function', label: L('Derivative (symbolic)', 'Derivata (simbolica)'),
    inputs: [F_IN],
    outputs: [TEXT('derivative', "f'", "f'")],
    config: [exprField('x^3 + sin(x)'), varField, { key: 'order', type: 'number', default: 1, min: 1, max: 10, label: L('Order', 'Ordine') }],
    run(inputs, b) {
      const tree = treeOf(inputs, b);
      if (tree === undefined) return undefined;
      const v = variableOf(b);
      const n = Math.round(num(b.config.order));
      if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error('Ordine: da 1 a 10');
      let d = tree;
      for (let i = 0; i < n; i++) d = derive(d, v);
      const text = print(d);
      if (text.length > 20_000) throw new Error('La derivata è troppo lunga (più di 20000 caratteri)');
      return { derivative: text };
    },
  }),
  {
    type: 'fn.derivativeAt', version: 1, category: 'functions', icon: 'function', label: L("Derivative at a point f'(x)", "Derivata in un punto f'(x)"),
    inputs: [F_IN, { name: 'x', type: 'any', label: L('x (number or list)', 'x (numero o lista)') }],
    outputs: [{ name: 'value', type: 'any', label: L("f'(x)", "f'(x)") }],
    config: [
      exprField(), varField,
      { key: 'method', type: 'select', default: 'auto', label: L('Method', 'Metodo'), options: [{ value: 'auto', label: L('Exact (symbolic), else numeric', 'Esatto (simbolico), altrimenti numerico') }, { value: 'numeric', label: L('Numeric (central differences)', 'Numerico (differenze centrali)') }] },
      { key: 'order', type: 'number', default: 1, min: 1, max: 4, label: L('Order', 'Ordine') },
    ],
    run(inputs, b) {
      if (inputs.x === undefined) return undefined;
      const fx = fnOf(inputs, b);
      if (!fx) return undefined;
      const n = Math.round(num(b.config.order));
      if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error('Ordine: da 1 a 4');
      let g = null;
      if (b.config.method !== 'numeric') {
        let d = fx.tree;
        try { for (let i = 0; i < n; i++) d = derive(d, fx.v); g = compile(d, [fx.v]); } catch { g = null; }
      }
      const one = x => {
        const xv = need(x, fx.v);
        noCorner(fx.f, xv, fx.v);
        const y = g ? g(xv) : numericDerivative(fx.f, xv, n);
        if (!Number.isFinite(y)) throw new Error(`La derivata non ha un valore finito in ${fx.v} = ${tidy(xv)}`);
        return tidy(y);
      };
      return { value: Array.isArray(inputs.x) ? checkList(inputs.x, 'La lista delle x').map(one) : one(inputs.x) };
    },
  },
  {
    type: 'fn.tangent', version: 1, category: 'functions', icon: 'fit', label: L('Tangent line', 'Retta tangente'),
    inputs: [F_IN, NUM('x0', 'x₀', 'x₀')],
    outputs: [NUM('slope', 'slope m', 'pendenza m'), NUM('intercept', 'intercept q', 'intercetta q'), TEXT('equation', 'equation', 'equazione'), NUM('y0', 'f(x₀)', 'f(x₀)', { hidden: true }), TEXT('normal', 'normal line', 'retta normale', { hidden: true })],
    config: [exprField()],
    run(inputs, b) {
      if (inputs.x0 === undefined) return undefined;
      const tree = treeOf(inputs, b);
      if (tree === undefined) return undefined;
      const f = functionOf(tree, ['x']);
      const x0 = need(inputs.x0, 'x₀'), y0 = at(f, x0);
      noCorner(f, x0);
      const m = derivativeFn(tree, 'x', f)(x0);
      if (!Number.isFinite(m)) throw new Error(`La tangente in x = ${tidy(x0)} è verticale o non esiste`);
      const line = (k, q) => `y = ${print(simplify(parse(`${k}x + ${q}`.replace('+ -', '- '))))}`;
      const out = { slope: tidy(m), intercept: tidy(y0 - m * x0), y0: tidy(y0), equation: line(tidy(m), tidy(y0 - m * x0)) };
      out.normal = m === 0 ? `x = ${tidy(x0)}` : line(tidy(-1 / m), tidy(y0 + x0 / m));
      return out;
    },
  },
  {
    type: 'fn.limit', version: 1, category: 'functions', icon: 'arrowRight', label: L('Limit (numeric)', 'Limite (numerico)'),
    inputs: [F_IN, { name: 'x0', type: 'any', label: L('x₀ (number, inf, -inf)', 'x₀ (numero, inf, -inf)') }],
    outputs: [NUM('value', 'limit', 'limite'), { name: 'exists', type: 'bool', label: L('exists', 'esiste') }, NUM('left', 'from the left', 'da sinistra', { hidden: true }), NUM('right', 'from the right', 'da destra', { hidden: true })],
    config: [exprField('sin(x)/x'), varField, { key: 'side', type: 'select', default: 'both', label: L('Side', 'Lato'), options: [{ value: 'both', label: L('Both sides', 'Entrambi i lati') }, { value: 'left', label: L('From the left (x → x₀⁻)', 'Da sinistra (x → x₀⁻)') }, { value: 'right', label: L('From the right (x → x₀⁺)', 'Da destra (x → x₀⁺)') }] }],
    run(inputs, b) {
      if (inputs.x0 === undefined) return undefined;
      const fx = fnOf(inputs, b);
      if (!fx) return undefined;
      const x0 = bound(inputs.x0, 'x₀', true);
      const safe = x => { try { return fx.f(x); } catch { return NaN; } };
      if (!Number.isFinite(x0)) {
        const v = oneSide(safe, x0, 1);
        return { value: v === null ? undefined : v, exists: v !== null && Number.isFinite(v), left: undefined, right: undefined };
      }
      const left = b.config.side === 'right' ? undefined : oneSide(safe, x0, -1);
      const right = b.config.side === 'left' ? undefined : oneSide(safe, x0, 1);
      let value;
      if (b.config.side === 'left') value = left;
      else if (b.config.side === 'right') value = right;
      else value = left !== null && right !== null && (left === right || Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-6 * Math.max(1, Math.abs(left))) ? left : null;
      // exists: a finite limit; ±Infinity goes out on «limite» when both sides agree
      return { value: value === null ? undefined : value, exists: value !== null && Number.isFinite(value), left: left ?? undefined, right: right ?? undefined };
    },
  },
  {
    type: 'fn.taylor', version: 1, category: 'functions', icon: 'function', label: L('Taylor polynomial', 'Polinomio di Taylor'),
    inputs: [F_IN, NUM('x0', 'x₀ (centre)', 'x₀ (centro)')],
    outputs: [TEXT('polynomial', 'polynomial', 'polinomio'), LIST('coefficients', 'coefficients c₀, c₁…', 'coefficienti c₀, c₁…', { hidden: true })],
    config: [exprField('e^x'), varField, { key: 'order', type: 'number', default: 3, min: 1, max: 12, label: L('Order', 'Ordine') }],
    run(inputs, b) {
      if (inputs.x0 === undefined) return undefined;
      const tree = treeOf(inputs, b);
      if (tree === undefined) return undefined;
      const v = variableOf(b);
      functionOf(tree, [v]);
      const x0 = need(inputs.x0, 'x₀');
      const n = Math.round(num(b.config.order));
      if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error('Ordine: da 1 a 12');
      noCorner(compile(tree, [v]), x0, v);
      const coeffs = [];
      let d = tree, fact = 1;
      for (let k = 0; k <= n; k++) {
        if (k > 0) { d = derive(d, v); fact *= k; }
        const y = compile(d, [v])(x0);
        if (!Number.isFinite(y)) throw new Error(`La derivata di ordine ${k} non ha un valore finito in ${v} = ${tidy(x0)}`);
        coeffs.push(tidy(y / fact));
      }
      const t = x0 === 0 ? v : `(${v} - ${x0})`.replace('- -', '+ ');
      const text = coeffs.map((c, k) => (c === 0 ? null : k === 0 ? `${c}` : `${c}*${t}^${k}`)).filter(Boolean).join(' + ') || '0';
      return { polynomial: print(simplify(parse(text))), coefficients: coeffs };
    },
  },
  startWhenFree({
    type: 'fn.study', version: 1, category: 'functions', icon: 'chart', label: L('Study of a function', 'Studio di funzione'),
    inputs: [F_IN, NUM('a', 'from', 'da'), NUM('b', 'to', 'a')],
    outputs: [
      LIST('zeros', 'zeros', 'zeri'), LIST('maxima', 'local maxima {x, y}', 'massimi relativi {x, y}'), LIST('minima', 'local minima {x, y}', 'minimi relativi {x, y}'),
      LIST('inflections', 'inflection points {x, y}', 'flessi {x, y}'),
      LIST('increasing', 'increasing on [from, to]', 'crescente in [da, a]', { hidden: true }), LIST('decreasing', 'decreasing on [from, to]', 'decrescente in [da, a]', { hidden: true }),
      { name: 'max', type: 'object', label: L('absolute maximum {x, y}', 'massimo assoluto {x, y}'), hidden: true }, { name: 'min', type: 'object', label: L('absolute minimum {x, y}', 'minimo assoluto {x, y}'), hidden: true },
    ],
    config: [exprField('x^3 - 3x'), varField, { key: 'a', type: 'text', default: '-3', label: L('From (when the input is not linked)', 'Da (se l\'ingresso non è collegato)') }, { key: 'b', type: 'text', default: '3', label: L('To (when the input is not linked)', 'A (se l\'ingresso non è collegato)') }, { key: 'samples', type: 'number', default: 1000, min: 10, max: 10000, label: L('Samples', 'Campioni') }],
    run(inputs, b) {
      const fx = fnOf(inputs, b);
      const A = pick(inputs, b, 'a'), B = pick(inputs, b, 'b');
      if (!fx || A === undefined || B === undefined) return undefined;
      const lo = bound(A, 'da'), hi = bound(B, 'a');
      if (!(hi > lo)) throw new Error('L\'intervallo deve avere «da» minore di «a»');
      const n = Math.round(num(b.config.samples));
      if (!Number.isInteger(n) || n < 10 || n > 10000) throw new Error('Campioni: da 10 a 10000');
      const safe = g => x => { try { return g(x); } catch { return NaN; } };
      const f = safe(fx.f);
      const d1t = derivativeTree(fx.tree, fx.v), d2t = d1t && derivativeTree(d1t, fx.v);
      const d1 = safe(d1t ? compile(d1t, [fx.v]) : x => numericDerivative(fx.f, x, 1));
      const d2 = safe(d2t ? compile(d2t, [fx.v]) : x => numericDerivative(fx.f, x, 2));
      const xs = Array.from({ length: n + 1 }, (_, i) => lo + (hi - lo) * i / n);
      const fs = xs.map(f), d1s = xs.map(d1), d2s = xs.map(d2);
      const fscale = Math.max(1e-300, ...fs.filter(Number.isFinite).map(Math.abs));
      const zs = signChanges(f, xs, fs);
      // a zero right at an end that rounding left as 1e-16 (sin on [0, 2π])
      for (const [i, x] of [[0, lo], [n, hi]]) if (Number.isFinite(fs[i]) && fs[i] !== 0 && Math.abs(fs[i]) < 1e-12 * fscale && !zs.some(z => Math.abs(z - x) < 1e-12 * Math.max(1, Math.abs(x)))) zs.push(x);
      const zeros = zs.sort((p, q) => p - q).map(tidy);
      const crit = signChanges(d1, xs, d1s);
      const maxima = [], minima = [];
      const eps = (hi - lo) / n / 4;
      for (const c of crit) {
        const before = d1(c - eps), after = d1(c + eps);
        if (before > 0 && after < 0) maxima.push(pt(c, f(c)));
        else if (before < 0 && after > 0) minima.push(pt(c, f(c)));
      }
      const inflections = signChanges(d2, xs, d2s).filter(c => Number.isFinite(f(c)) && Math.sign(d2(c - eps)) !== Math.sign(d2(c + eps))).map(c => pt(c, f(c)));
      // monotony between the critical points and the ends
      const cuts = [lo, ...crit.filter(c => c > lo && c < hi), hi];
      const increasing = [], decreasing = [];
      for (let i = 0; i + 1 < cuts.length; i++) {
        const s = d1((cuts[i] + cuts[i + 1]) / 2);
        if (!Number.isFinite(s) || s === 0) continue;
        const list = s > 0 ? increasing : decreasing;
        const last = list[list.length - 1];
        if (last && last[1] === tidy(cuts[i])) last[1] = tidy(cuts[i + 1]);
        else list.push([tidy(cuts[i]), tidy(cuts[i + 1])]);
      }
      // absolute ones among the samples, the ends and the critical points
      let max = null, min = null;
      for (const x of [...xs, ...crit]) {
        const y = f(x);
        if (!Number.isFinite(y)) continue;
        if (!max || y > max.y) max = { x, y };
        if (!min || y < min.y) min = { x, y };
      }
      return { zeros, maxima, minima, inflections, increasing, decreasing, max: max ? pt(max.x, max.y) : undefined, min: min ? pt(min.x, min.y) : undefined };
    },
  }),
  {
    type: 'fn.signalDerivative', version: 1, category: 'functions', icon: 'gauge', label: L('Rate of change of a signal (d/dt)', 'Derivata di un segnale (d/dt)'),
    inputs: [NUM('value', 'value', 'valore'), { name: 'reset', type: 'pulse', label: L('reset', 'azzera'), hidden: true }, { ...NUM('t', 't (seconds; else the clock)', 't (secondi; altrimenti l\'orologio)'), hidden: true, trigger: false }],
    outputs: [NUM('rate', 'rate', 'velocità di variazione')],
    config: [
      { key: 'per', type: 'select', default: 's', label: L('Per', 'Al'), options: [{ value: 's', label: L('second', 'secondo') }, { value: 'min', label: L('minute', 'minuto') }, { value: 'h', label: L('hour', 'ora') }] },
      { key: 'smoothing', type: 'number', default: 0, min: 0, max: 0.99, label: L('Smoothing (0 = none, 0.9 = strong)', 'Smorzamento (0 = nessuno, 0,9 = forte)') },
    ],
    run(inputs, b) {
      const m = b.memory();
      if (b.trigger === 'reset') { m.last = null; m.rate = undefined; return undefined; }
      if (b.trigger !== 'value' || inputs.value === undefined) return undefined;
      if (b.linked('t') && inputs.t === undefined) return undefined;   // its time has not arrived yet
      const v = need(inputs.value, 'valore');
      const t = b.linked('t') || inputs.t !== undefined ? need(inputs.t, 't') : b.now() / 1000;
      const last = m.last;
      m.last = { t, v };
      if (!last) return undefined;
      const dt = (t - last.t) / ({ s: 1, min: 60, h: 3600 }[b.config.per] ?? 1);
      if (dt <= 0) return undefined;
      const raw = (v - last.v) / dt;
      const alpha = Math.min(0.99, Math.max(0, num(b.config.smoothing) || 0));
      m.rate = m.rate === undefined ? raw : alpha * m.rate + (1 - alpha) * raw;
      return { rate: tidy(m.rate) };
    },
  },
];

/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
const SUBCATEGORIES = [
  ['functions', L('Functions', 'Funzioni'), ['fn.define', 'fn.eval', 'fn.table', 'fn.solve']],
  ['algebraic', L('Algebraic', 'Algebriche'), ['fn.quadratic', 'fn.poly', 'fn.polyOps', 'fn.power']],
  ['exp', L('Exponentials and logarithms', 'Esponenziali e logaritmi'), ['fn.exp', 'fn.log', 'fn.growth']],
  ['calculus', L('Differential calculus', 'Calcolo differenziale'), ['fn.derivative', 'fn.derivativeAt', 'fn.tangent', 'fn.limit', 'fn.taylor', 'fn.study', 'fn.signalDerivative']],
];
SUBCATEGORIES.forEach(([id, label, types], i) => {
  for (const b of blocks) if (types.includes(b.type)) b.subcategory = { id, label, order: i };
});
