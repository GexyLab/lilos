/**
 * Numerical analysis blocks that work on a formula: sample f on an interval, compose f∘g,
 * simplify, gradient, maxima / minima / inflections. A function travels as text (the syntax of
 * lib/shared/mathexpr.js), taken from the input «f» or from the setting «Funzione».
 */
import * as N from './numeric.js';
import { parse, simplify, substitute, derive, polyCoeffs, polyTree, numericDerivative } from './shared/mathexpr.js';
import {
  L, num, text, tidy, intIn, real, bound, need, pure, pick, F_IN, exprField, varField, treeOf, variableOf, functionOf, fnOf,
  compile, print, namesOf,
} from './common.js';

const MAX_POINTS = 200_000;
const NUMBER = (name, en, it, extra = {}) => ({ name, type: 'number', label: L(en, it), ...extra });
const round6 = v => (Number.isFinite(v) ? (Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(10))) : v);
const safe = g => x => { try { return g(x); } catch { return NaN; } };

/** The symbolic derivative as a tree, or null when there is none (min, max…). */
function derivativeTree(tree, v) {
  try { return derive(tree, v); } catch { return null; }
}

export const blocks = [
  pure({
    type: 'num.sample', icon: 'chart', label: L('Sample f', 'Campiona f'),
    inputs: [F_IN, NUMBER('a', 'from a', 'da a'), NUMBER('b', 'to b', 'a b'), NUMBER('n', 'points', 'punti', { hidden: true })],
    outputs: [
      { name: 'x', type: 'list', label: L('x list', 'lista delle x') },
      { name: 'y', type: 'list', label: L('y list', 'lista delle y') },
      { name: 'points', type: 'list', label: L('points {x, y}', 'punti {x, y}') },
    ],
    config: [
      exprField('sin(x)'), varField,
      { key: 'a', type: 'text', default: '0', label: L('From a (when a is not linked)', 'Da a (se a non è collegato)') },
      { key: 'b', type: 'text', default: '2 pi', label: L('To b (when b is not linked)', 'A b (se b non è collegato)') },
      { key: 'n', type: 'number', default: 100, min: 2, max: MAX_POINTS, label: L('Points', 'Punti') },
    ],
    compute(inputs, c) {
      const { f } = fnOf(inputs, c);
      const a = bound(pick(inputs, c, 'a'), 'a'), b = bound(pick(inputs, c, 'b'), 'b');
      const n = intIn(pick(inputs, c, 'n'), 2, MAX_POINTS, 'Punti');
      const tick = N.budget();
      const x = new Array(n), y = new Array(n), points = new Array(n);
      for (let i = 0; i < n; i++) {
        tick();
        const xi = a + ((b - a) * i) / (n - 1);
        const yi = f(xi);
        x[i] = tidy(xi); y[i] = Number.isFinite(yi) ? tidy(yi) : null;   // not defined there: null (a gap in a chart)
        points[i] = { x: x[i], y: y[i] };
      }
      return { x, y, points };
    },
  }),

  pure({
    type: 'num.compose', icon: 'merge', label: L('Compose f∘g', 'Componi f∘g'),
    inputs: [F_IN, { name: 'g', type: 'text', label: L('g (function)', 'g (funzione)') }],
    outputs: [{ name: 'f', type: 'text', label: L('f∘g (function)', 'f∘g (funzione)') }],
    config: [
      exprField('sin(x)'),
      { key: 'inner', type: 'text', default: 'x^2', label: L('Function g (when g is not linked)', 'Funzione g (se g non è collegato)') },
      varField,
      { key: 'order', type: 'select', default: 'fg', options: [{ value: 'fg', label: L('f(g(x))', 'f(g(x))') }, { value: 'gf', label: L('g(f(x))', 'g(f(x))') }], label: L('Order', 'Ordine') },
    ],
    compute(inputs, c) {
      const f = treeOf(inputs, c), g = treeOf(inputs, c, 'g', 'inner');
      const v = variableOf(c);
      const [outer, inner] = c.config.order === 'gf' ? [g, f] : [f, g];
      const out = print(simplify(substitute(outer, { [v]: inner })));
      if (out.length > 2000) throw new Error('La composizione è troppo lunga (più di 2000 caratteri)');
      return { f: out };
    },
  }),

  pure({
    type: 'num.simplify', icon: 'check', label: L('Simplify', 'Semplifica'),
    inputs: [F_IN],
    outputs: [
      { name: 'f', type: 'text', label: L('f (simplified)', 'f (semplificata)') },
      { name: 'changed', type: 'bool', label: L('changed', 'cambiata') },
    ],
    config: [
      exprField('2x + 3x + sin(x)^2 + cos(x)^2'), varField,
      {
        key: 'mode', type: 'select', default: 'simplify', label: L('Method', 'Metodo'),
        options: [
          { value: 'simplify', label: L('Simplify', 'Semplifica') },
          { value: 'polynomial', label: L('Expanded polynomial (a + bx + cx²…)', 'Polinomio sviluppato (a + bx + cx²…)') },
        ],
      },
    ],
    compute(inputs, c) {
      const tree = treeOf(inputs, c);
      const v = variableOf(c);
      let out;
      if (c.config.mode === 'polynomial') {
        const coeffs = polyCoeffs(tree, v);
        if (!coeffs) throw new Error(`f non è un polinomio in ${v} con coefficienti numerici (di grado al massimo 20)`);
        out = polyTree(coeffs, v);
      } else out = simplify(tree);
      const t = print(out);
      return { f: t, changed: t !== print(tree) };
    },
  }),

  pure({
    type: 'num.gradient', icon: 'arrowUp', label: L('Gradient ∇f', 'Gradiente ∇f'),
    inputs: [F_IN, { name: 'point', type: 'any', label: L('point [x, y, …] or {x, y, …}', 'punto [x, y, …] o {x, y, …}') }],
    outputs: [
      { name: 'list', type: 'list', label: L('gradient [∂f/∂x, …]', 'gradiente [∂f/∂x, …]') },
      { name: 'gradient', type: 'object', label: L('gradient {x, y, …}', 'gradiente {x, y, …}') },
      { name: 'magnitude', type: 'number', label: L('magnitude', 'modulo') },
      { name: 'symbolic', type: 'object', label: L('partial derivatives (text)', 'derivate parziali (testo)'), hidden: true },
    ],
    config: [
      exprField('x^2 + 3x*y + y^2'),
      { key: 'variables', type: 'text', default: 'x, y', label: L('Variables (in order)', 'Variabili (in ordine)') },
      { key: 'point', type: 'text', default: '1, 2', label: L('Point (when the input is not linked)', 'Punto (se l\'ingresso non è collegato)') },
      { key: 'method', type: 'select', default: 'auto', label: L('Method', 'Metodo'), options: [{ value: 'auto', label: L('Exact (symbolic), else numeric', 'Esatto (simbolico), altrimenti numerico') }, { value: 'numeric', label: L('Numeric (central differences)', 'Numerico (differenze centrali)') }] },
      { key: 'step', type: 'number', default: 0.00001, min: 1e-9, max: 1, label: L('Numeric step h', 'Passo numerico h') },
    ],
    compute(inputs, c) {
      const vars = namesOf(c.config.variables, 'Variabili', 8);
      const tree = treeOf(inputs, c);
      const f = functionOf(tree, vars);
      let raw = pick(inputs, c, 'point');
      if (typeof raw === 'string' && /^\s*[[{]/.test(raw)) {
        try { raw = JSON.parse(raw); } catch { throw new Error('Il punto non è valido: scrivi «1, 2» oppure [1, 2]'); }
      } else if (typeof raw === 'string' || typeof raw === 'number') raw = text(raw).split(/[\s,;]+/).filter(Boolean);
      const at = vars.map((v, i) => {
        const val = Array.isArray(raw) ? raw[i] : raw && typeof raw === 'object' ? raw[v] : undefined;
        if (val === undefined) throw new Error(Array.isArray(raw) ? `Il punto ha ${raw.length} valori, servono ${vars.length}` : `Manca il valore di «${v}» nel punto`);
        return need(val, `«${v}»`);
      });
      const h0 = Math.max(1e-9, Math.min(1, num(c.config.step) || 1e-5));
      const symbolic = {}, partial = {};
      for (const v of vars) {
        const d = c.config.method === 'numeric' ? null : derivativeTree(tree, v);
        symbolic[v] = d ? print(d) : null;
        partial[v] = d ? compile(d, vars) : null;
      }
      const list = vars.map((v, i) => {
        let g = partial[v] ? partial[v](...at) : NaN;
        if (!Number.isFinite(g)) {
          const h = h0 * Math.max(1, Math.abs(at[i]));
          const p = at.slice(), m = at.slice();
          p[i] += h; m[i] -= h;
          g = (f(...p) - f(...m)) / (2 * h);
        }
        if (!Number.isFinite(g)) throw new Error('La funzione non è definita (o non è derivabile) in questo punto');
        return tidy(g);
      });
      return { list, gradient: Object.fromEntries(vars.map((v, i) => [v, list[i]])), magnitude: tidy(Math.hypot(...list)), symbolic };
    },
  }),

  pure({
    type: 'num.extrema', icon: 'chart', label: L('Maxima · Minima · Inflections', 'Massimi · Minimi · Flessi'),
    inputs: [F_IN, NUMBER('a', 'from', 'da'), NUMBER('b', 'to', 'a')],
    outputs: [
      { name: 'maxima', type: 'list', label: L('local maxima {x, y}', 'massimi relativi {x, y}') },
      { name: 'minima', type: 'list', label: L('local minima {x, y}', 'minimi relativi {x, y}') },
      { name: 'inflections', type: 'list', label: L('inflection points {x, y}', 'flessi {x, y}') },
      { name: 'maximum', type: 'object', label: L('highest point {x, y}', 'punto più alto {x, y}'), hidden: true },
      { name: 'minimum', type: 'object', label: L('lowest point {x, y}', 'punto più basso {x, y}'), hidden: true },
    ],
    config: [
      exprField('x^3 - 3x'), varField,
      { key: 'a', type: 'text', default: '-3', label: L('From (when a is not linked)', 'Da (se a non è collegato)') },
      { key: 'b', type: 'text', default: '3', label: L('To (when b is not linked)', 'A (se b non è collegato)') },
      { key: 'n', type: 'number', default: 600, min: 10, max: 100000, label: L('Sub-intervals to scan', 'Sottointervalli da esaminare') },
    ],
    compute(inputs, c) {
      const fx = fnOf(inputs, c);
      const a = bound(pick(inputs, c, 'a'), 'da'), b = bound(pick(inputs, c, 'b'), 'a');
      if (!(b > a)) throw new Error('L\'intervallo deve avere «da» minore di «a»');
      const n = intIn(c.config.n, 10, 100000, 'Sottointervalli');
      const tick = N.budget();
      const d1t = derivativeTree(fx.tree, fx.v), d2t = d1t && derivativeTree(d1t, fx.v);
      const f = safe(fx.f);
      const d1 = safe(d1t ? compile(d1t, [fx.v]) : x => numericDerivative(fx.f, x, 1));
      const d2 = safe(d2t ? compile(d2t, [fx.v]) : x => numericDerivative(fx.f, x, 2));
      const r = extremaOf(f, d1, d2, a, b, n, tick);
      return { ...r, maximum: globalExtreme(f, a, b, n, 1, tick), minimum: globalExtreme(f, a, b, n, -1, tick) };
    },
  }),
];

/**
 * Maxima, minima and inflections of f in (a, b): zeros of f' and f'' where the sign changes.
 * `d1`, `d2`: functions. Returns { maxima, minima, inflections } of { x, y }.
 */
export function extremaOf(f, d1, d2, a, b, n, tick) {
  const span = b - a;
  const classify = (g, roots) => {
    const out = [];
    roots.forEach((r, i) => {
      let delta = span / (n * 4);
      const gap = Math.min(i > 0 ? r - roots[i - 1] : Infinity, i < roots.length - 1 ? roots[i + 1] - r : Infinity);
      delta = Math.min(delta, gap / 4);
      if (r - delta <= a || r + delta >= b) return;   // at the ends of the interval: not inside it
      const l = g(r - delta), rr = g(r + delta);
      if (!Number.isFinite(l) || !Number.isFinite(rr)) return;
      if (l > 0 && rr < 0) out.push({ r, kind: 'down' });
      else if (l < 0 && rr > 0) out.push({ r, kind: 'up' });
    });
    return out;
  };
  const point = r => ({ x: round6(r), y: round6(f(r)) });
  const crit = classify(d1, N.allRoots(d1, a, b, { n, tick }));
  const infl = classify(d2, N.allRoots(d2, a, b, { n, tick }));
  return {
    maxima: crit.filter(p => p.kind === 'down').map(p => point(p.r)),
    minima: crit.filter(p => p.kind === 'up').map(p => point(p.r)),
    inflections: infl.map(p => point(p.r)),
  };
}

/** The extreme (max or min) of f on [a, b], ends included, by sampling and refining. */
function globalExtreme(f, a, b, n, sign, tick) {
  let best = -Infinity, bx = a;
  const step = (b - a) / n;
  for (let i = 0; i <= n; i++) { tick(); const x = a + step * i; const y = sign * f(x); if (Number.isFinite(y) && y > best) { best = y; bx = x; } }
  if (!Number.isFinite(best)) return undefined;
  // golden section around the best sample
  let lo = Math.max(a, bx - step), hi = Math.min(b, bx + step);
  const phi = (Math.sqrt(5) - 1) / 2;
  const g = x => { const y = sign * f(x); return Number.isFinite(y) ? y : -Infinity; };
  let c1 = hi - phi * (hi - lo), d1 = lo + phi * (hi - lo), g1 = g(c1), g2 = g(d1);
  for (let k = 0; k < 80 && hi - lo > 1e-13 * Math.max(1, Math.abs(lo)); k++) {
    if (g1 > g2) { hi = d1; d1 = c1; g2 = g1; c1 = hi - phi * (hi - lo); g1 = g(c1); } else { lo = c1; c1 = d1; g1 = g2; d1 = lo + phi * (hi - lo); g2 = g(d1); }
  }
  let x = (lo + hi) / 2;
  if (g(x) < best) x = bx;   // an end of the interval, or a flat spot
  return { x: round6(x), y: round6(f(x)) };
}
