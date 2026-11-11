/**
 * Numerical analysis blocks that work on data: derivative of a data set, interpolation, regression
 * (fit), complex numbers. The functions they give back are texts in the syntax of
 * lib/shared/mathexpr.js, like the ones of the fn.* blocks.
 */
import * as N from './numeric.js';
import { L, text, intIn, real, pure, pick, checkList, goodName } from './common.js';

const f12 = v => String(Number(v.toPrecision(12)));
const goodVar = v => goodName(v);
const MAX_FORMULA = 2000;
/** Least squares, with the leftovers of rounding (a coefficient 1e-12 times the biggest) set to zero. */
const solve = (A, y) => { const c = N.lstsq(A, y); const s = Math.max(...c.map(Math.abs)); return c.map(k => (Math.abs(k) < 1e-12 * s ? 0 : k)); };
const lineText = (m, q, v) => {
  if (m === 0) return f12(q);
  const first = m === 1 ? v : m === -1 ? `-${v}` : `${f12(m)} * ${v}`;
  return q === 0 ? first : `${first} ${q < 0 ? '-' : '+'} ${f12(Math.abs(q))}`;
};
/** A text of coefficients from the highest degree: a*x^n + … */
const polyFromHigh = (coefs, v) => {
  const parts = [];
  coefs.forEach((c, i) => {
    const k = coefs.length - 1 - i;
    if (!c) return;
    const mag = f12(Math.abs(c));
    const pow = k === 0 ? null : k === 1 ? v : `${v}^${k}`;
    const t = pow === null ? mag : mag === '1' ? pow : `${mag} * ${pow}`;
    parts.push({ neg: c < 0, t });
  });
  if (!parts.length) return '0';
  return parts.map((p, i) => (i === 0 ? (p.neg ? `-${p.t}` : p.t) : `${p.neg ? '-' : '+'} ${p.t}`)).join(' ');
};

export const blocks = [
  pure({
    type: 'num.dataDerivative', autostart: false, icon: 'sync', label: L('Derivative of data', 'Derivata di dati'),
    inputs: [{ name: 'x', type: 'list', label: L('x list', 'lista delle x') }, { name: 'y', type: 'list', label: L('y list', 'lista delle y') }],
    outputs: [
      { name: 'derivative', type: 'list', label: L('dy/dx', 'dy/dx') },
      { name: 'x', type: 'list', label: L('x list', 'lista delle x') },
    ],
    config: [
      { key: 'method', type: 'select', default: 'central', options: [{ value: 'central', label: L('Central', 'Centrale') }, { value: 'forward', label: L('Forward', 'In avanti') }, { value: 'backward', label: L('Backward', 'All\'indietro') }], label: L('Method', 'Metodo') },
      { key: 'dx', type: 'number', default: 1, label: L('Spacing (if there is no x list)', 'Distanza (se non c\'è la lista x)') },
    ],
    compute(inputs, c) {
      const p = N.pairs(inputs.x, inputs.y);
      const plain = Array.isArray(inputs.y) && typeof inputs.y[0] !== 'object';
      if (inputs.x === undefined && plain) {
        const dx = real(c.config.dx, 'Distanza');
        if (dx === 0) throw new Error('Distanza: deve essere diversa da zero');
        p.x = p.x.map(i => i * dx);
      }
      if (p.x.length < 2) throw new Error('Servono almeno 2 punti');
      for (let i = 1; i < p.x.length; i++) if (!(p.x[i] > p.x[i - 1])) throw new Error('Le x devono essere in ordine crescente, senza ripetizioni');
      return { derivative: N.dataDerivative(p.x, p.y, c.config.method), x: p.x };
    },
  }),

  pure({
    type: 'num.interpolate', autostart: false, icon: 'chart', label: L('Interpolation', 'Interpolazione'),
    inputs: [{ name: 'x', type: 'list' }, { name: 'y', type: 'list' }, { name: 'at', type: 'any', label: L('at', 'in') }],
    outputs: [
      { name: 'y', type: 'any' },
      { name: 'f', type: 'text', label: L('f (function)', 'f (funzione)') },
    ],
    config: [
      { key: 'method', type: 'select', default: 'spline', options: [{ value: 'linear', label: L('Linear', 'Lineare') }, { value: 'lagrange', label: L('Lagrange polynomial', 'Polinomio di Lagrange') }, { value: 'spline', label: L('Natural cubic spline', 'Spline cubica naturale') }], label: L('Method', 'Metodo') },
      { key: 'at', type: 'text', default: '0', label: L('x (when the input is not linked)', 'x (se l\'ingresso non è collegato)') },
      { key: 'extrapolate', type: 'checkbox', default: false, label: L('Allow x outside the data', 'Ammetti x fuori dai dati') },
      { key: 'variable', type: 'text', default: 'x', label: L('Variable of the function', 'Variabile della funzione') },
    ],
    compute(inputs, c) {
      const v = text(c.config.variable).trim() || 'x';
      if (!goodVar(v)) throw new Error(`Nome di variabile non valido: «${v}»`);
      const p = N.cleanPairs(N.pairs(inputs.x, inputs.y));
      if (p.x.length < 2) throw new Error('Servono almeno 2 punti');
      if (p.x.length > 5000) throw new Error('Troppi punti per interpolare (al massimo 5000)');
      const method = c.config.method ?? 'spline';
      if (method === 'lagrange' && p.x.length > 60) throw new Error('Il polinomio di Lagrange è instabile con più di 60 punti: usa la spline');
      const { x, y } = N.sortPairs(p);
      const g = N.interpolator(x, y, method);
      const lo = x[0], hi = x[x.length - 1];
      const at1 = a => {
        const t = real(a, 'x');
        if (!c.config.extrapolate && (t < lo || t > hi)) throw new Error(`x = ${t} è fuori dai dati (da ${lo} a ${hi})`);
        return g(t);
      };
      const raw = pick(inputs, c, 'at');
      const out = { y: Array.isArray(raw) ? checkList(raw, 'La lista delle x').map(at1) : at1(raw) };
      const fn = textOfInterpolation(x, y, method, v);
      if (fn) out.f = fn;
      return out;
    },
  }),

  pure({
    type: 'num.fit', autostart: false, icon: 'chart', label: L('Regression (fit)', 'Regressione (fit)'),
    inputs: [{ name: 'x', type: 'list' }, { name: 'y', type: 'list' }, { name: 'at', type: 'number', hidden: true }],
    outputs: [
      { name: 'coefficients', type: 'list', label: L('coefficients', 'coefficienti') },
      { name: 'f', type: 'text', label: L('f (function)', 'f (funzione)') },
      { name: 'r2', type: 'number', label: L('R²', 'R²') },
      { name: 'rmse', type: 'number', label: L('RMS error', 'errore quadratico medio') },
      { name: 'prediction', type: 'number', label: L('value at x', 'valore in x') },
      { name: 'residuals', type: 'list', label: L('residuals', 'residui') },
    ],
    config: [
      { key: 'model', type: 'select', default: 'linear', options: [
        { value: 'linear', label: L('Linear: y = a·x + b', 'Lineare: y = a·x + b') },
        { value: 'polynomial', label: L('Polynomial of degree n', 'Polinomio di grado n') },
        { value: 'exponential', label: L('Exponential: y = a·e^(b·x)', 'Esponenziale: y = a·e^(b·x)') },
        { value: 'logarithmic', label: L('Logarithmic: y = a + b·ln x', 'Logaritmica: y = a + b·ln x') },
        { value: 'power', label: L('Power: y = a·x^b', 'Potenza: y = a·x^b') },
      ], label: L('Model', 'Modello') },
      { key: 'degree', type: 'number', default: 2, min: 1, max: 12, label: L('Degree n', 'Grado n'), when: { model: 'polynomial' } },
      { key: 'variable', type: 'text', default: 'x', label: L('Variable of the function', 'Variabile della funzione') },
      { key: 'at', type: 'text', default: '', label: L('x for the value (empty: none)', 'x per il valore (vuoto: nessuno)') },
    ],
    compute(inputs, c) {
      const v = text(c.config.variable).trim() || 'x';
      if (!goodVar(v)) throw new Error(`Nome di variabile non valido: «${v}»`);
      const p = N.cleanPairs(N.pairs(inputs.x, inputs.y));
      const { x, y } = p;
      const model = c.config.model ?? 'linear';
      let coefs, predict, fn;
      switch (model) {
        case 'polynomial': {
          const d = intIn(c.config.degree, 1, 12, 'Grado');
          coefs = solve(x.map(t => Array.from({ length: d + 1 }, (_, k) => t ** (d - k))), y);
          predict = t => N.polyEval(coefs, t);
          fn = polyFromHigh(coefs, v);
          break;
        }
        case 'exponential': {
          if (y.some(t => t <= 0)) throw new Error('Il modello esponenziale vuole tutte le y maggiori di zero');
          const [b, la] = solve(x.map(t => [t, 1]), y.map(Math.log));
          coefs = [Math.exp(la), b];
          predict = t => coefs[0] * Math.exp(coefs[1] * t);
          fn = `${f12(coefs[0])} * exp(${f12(coefs[1])} * ${v})`;
          break;
        }
        case 'logarithmic': {
          if (x.some(t => t <= 0)) throw new Error('Il modello logaritmico vuole tutte le x maggiori di zero');
          const [b, a] = solve(x.map(t => [Math.log(t), 1]), y);
          coefs = [a, b];
          predict = t => coefs[0] + coefs[1] * Math.log(t);
          fn = `${f12(coefs[0])} ${coefs[1] < 0 ? '-' : '+'} ${f12(Math.abs(coefs[1]))} * ln(${v})`;
          break;
        }
        case 'power': {
          if (x.some(t => t <= 0) || y.some(t => t <= 0)) throw new Error('Il modello a potenza vuole tutte le x e le y maggiori di zero');
          const [b, la] = solve(x.map(t => [Math.log(t), 1]), y.map(Math.log));
          coefs = [Math.exp(la), b];
          predict = t => coefs[0] * t ** coefs[1];
          fn = `${f12(coefs[0])} * ${v} ^ ${coefs[1] < 0 ? `(${f12(coefs[1])})` : f12(coefs[1])}`;
          break;
        }
        default: {
          const [a, b] = solve(x.map(t => [t, 1]), y);
          coefs = [a, b];
          predict = t => a * t + b;
          fn = lineText(a, b, v);
        }
      }
      const res = y.map((yi, i) => yi - predict(x[i]));
      const ssRes = res.reduce((s, r) => s + r * r, 0);
      const mean = y.reduce((s, t) => s + t, 0) / y.length;
      const ssTot = y.reduce((s, t) => s + (t - mean) ** 2, 0);
      const r2 = ssTot === 0 ? (ssRes < 1e-20 ? 1 : 0) : 1 - ssRes / ssTot;
      const out = {
        coefficients: coefs.map(k => Number(k.toPrecision(13))), f: fn,
        r2: Number(Math.min(1, r2).toPrecision(13)), rmse: Math.sqrt(ssRes / y.length), residuals: res,
      };
      const at = inputs.at !== undefined ? inputs.at : text(c.config.at).trim() === '' ? undefined : c.config.at;
      if (at !== undefined) out.prediction = predict(real(at, 'x'));
      return out;
    },
  }),

  pure({
    type: 'num.complex', icon: 'calculator', label: L('Complex numbers', 'Numeri complessi'),
    inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }],
    outputs: [
      { name: 'result', type: 'object', label: L('result {re, im}', 'risultato {re, im}') },
      { name: 'text', type: 'text', label: L('as text', 'come testo') },
      { name: 're', type: 'number' },
      { name: 'im', type: 'number' },
      { name: 'modulus', type: 'number', label: L('modulus', 'modulo') },
      { name: 'argument', type: 'number', label: L('argument (rad)', 'argomento (rad)') },
      { name: 'polar', type: 'object', label: L('polar {r, theta}', 'polare {r, theta}') },
    ],
    config: [
      { key: 'op', type: 'select', default: 'add', options: [
        { value: 'add', label: L('a + b', 'a + b') }, { value: 'sub', label: L('a − b', 'a − b') }, { value: 'mul', label: L('a × b', 'a × b') },
        { value: 'div', label: L('a ÷ b', 'a ÷ b') }, { value: 'pow', label: L('a ^ b', 'a ^ b') }, { value: 'root', label: L('b-th root of a', 'radice b-esima di a') },
        { value: 'conj', label: L('conjugate of a', 'coniugato di a') }, { value: 'neg', label: L('−a', '−a') }, { value: 'recip', label: L('1 ÷ a', '1 ÷ a') },
        { value: 'sqrt', label: L('√a', '√a') }, { value: 'exp', label: L('e^a', 'e^a') }, { value: 'ln', label: L('ln a', 'ln a') },
        { value: 'sin', label: L('sin a', 'sin a') }, { value: 'cos', label: L('cos a', 'cos a') }, { value: 'none', label: L('a as it is (modulus, argument…)', 'a com\'è (modulo, argomento…)') },
        { value: 'fromPolar', label: L('from polar: modulus a, angle b', 'da polare: modulo a, angolo b') },
      ], label: L('Operation', 'Operazione') },
      { key: 'a', type: 'text', default: '3+4i', label: L('a (when the input is not linked)', 'a (se l\'ingresso non è collegato)') },
      { key: 'b', type: 'text', default: '1-2i', label: L('b (when the input is not linked)', 'b (se l\'ingresso non è collegato)') },
    ],
    compute(inputs, c) {
      const op = c.config.op ?? 'add';
      const a = op === 'fromPolar' ? null : N.toComplex(pick(inputs, c, 'a'));
      const needsB = ['add', 'sub', 'mul', 'div', 'pow', 'root', 'fromPolar'].includes(op);
      const b = needsB && op !== 'fromPolar' ? N.toComplex(pick(inputs, c, 'b')) : null;
      let r;
      switch (op) {
        case 'add': r = N.C.add(a, b); break;
        case 'sub': r = N.C.sub(a, b); break;
        case 'mul': r = N.C.mul(a, b); break;
        case 'div': r = N.C.div(a, b); break;
        case 'pow': r = N.C.pow(a, b); break;
        case 'root': if (b.re === 0 && b.im === 0) throw new Error('Divisione per zero'); r = N.C.pow(a, N.C.div({ re: 1, im: 0 }, b)); break;
        case 'conj': r = N.C.conj(a); break;
        case 'neg': r = N.C.neg(a); break;
        case 'recip': r = N.C.div({ re: 1, im: 0 }, a); break;
        case 'sqrt': r = N.C.sqrt(a); break;
        case 'exp': r = N.C.exp(a); break;
        case 'ln': r = N.C.ln(a); break;
        case 'sin': r = N.C.sin(a); break;
        case 'cos': r = N.C.cos(a); break;
        case 'fromPolar': r = N.C.fromPolar(real(pick(inputs, c, 'a'), 'Modulo'), real(pick(inputs, c, 'b'), 'Angolo')); break;
        default: r = a;
      }
      if (![r.re, r.im].every(Number.isFinite)) throw new Error('Il risultato non è un numero finito');
      const clean = x => (Math.abs(x) < 1e-15 * Math.max(1, Math.abs(r.re), Math.abs(r.im)) ? 0 : x);
      r = { re: clean(r.re), im: clean(r.im) };
      const mod = N.C.abs(r), arg = N.C.arg(r);
      return { result: r, text: N.complexText(r), re: r.re, im: r.im, modulus: mod, argument: arg, polar: { r: mod, theta: arg } };
    },
  }),
];

/**
 * The text of the interpolating function, or null when it would be too long for a formula. The
 * pieces are joined with max(0, x − xᵢ): the linear one adds the change of slope at each node, the
 * cubic spline adds the change of the cubic coefficient (the lower ones are continuous).
 */
function textOfInterpolation(x, y, method, v) {
  const n = x.length;
  const knot = i => (x[i] === 0 ? v : `${v} ${x[i] < 0 ? '+' : '-'} ${f12(Math.abs(x[i]))}`);
  const base = i => (x[i] === 0 ? v : `(${knot(i)})`);
  const sum = parts => {
    const out = [];
    for (const [k, term] of parts) {
      if (!k) continue;
      const mag = Math.abs(k);
      out.push(`${k < 0 ? '-' : '+'} ${term === null ? f12(mag) : mag === 1 ? term : `${f12(mag)} * ${term}`}`);
    }
    return out.length ? out.join(' ').replace(/^\+ /, '').replace(/^- /, '-') : '0';
  };
  let out = null;
  if (method === 'linear') {
    const slope = i => (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
    const parts = [[y[0], null], [slope(0), base(0)]];
    for (let i = 1; i < n - 1; i++) parts.push([slope(i) - slope(i - 1), `max(0, ${knot(i)})`]);
    out = sum(parts);
  } else if (method === 'spline') {
    const M = N.splineSecond(x, y);
    const cubic = i => (M[i + 1] - M[i]) / (6 * (x[i + 1] - x[i]));
    const h = x[1] - x[0];
    const b1 = (y[1] - y[0]) / h - (h * (2 * M[0] + M[1])) / 6;
    const parts = [[y[0], null], [b1, base(0)], [M[0] / 2, `${base(0)}^2`], [cubic(0), `${base(0)}^3`]];
    for (let i = 1; i < n - 1; i++) parts.push([cubic(i) - cubic(i - 1), `max(0, ${knot(i)})^3`]);
    out = sum(parts);
  } else if (n <= 12) {
    // Lagrange: the expanded polynomial (stable enough for a few points)
    const total = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let poly = [1], den = 1;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const next = new Array(poly.length + 1).fill(0);
        poly.forEach((k, idx) => { next[idx] += k; next[idx + 1] -= x[j] * k; });
        poly = next; den *= x[i] - x[j];
      }
      for (let k = 0; k < n; k++) total[k] += (y[i] / den) * poly[k];
    }
    out = polyFromHigh(total.slice(0, n), v);
  }
  return out && out.length <= MAX_FORMULA ? out.replace(/^\+ /, '') : null;
}
