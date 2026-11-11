/**
 * The numeric methods of the Numerical analysis blocks: data lists, zeros, series, ODE steps, least
 * squares, interpolation, complex numbers. Pure functions on numbers and arrays; formulas are
 * handled elsewhere (lib/shared/mathexpr.js). Every loop is bounded (a count and a time budget): a
 * block never keeps the worker busy for long.
 */

export const MAX_SECONDS = 8;
export const MAX_LIST = 1_000_000;

/** A budget of time: call it in loops; it throws when the time is over. */
export function budget(seconds = MAX_SECONDS) {
  const end = Date.now() + seconds * 1000;
  let n = 0;
  return () => {
    if ((++n & 127) === 0 && Date.now() > end) throw new Error(`Calcolo troppo lungo (più di ${seconds} secondi): riduci i punti o l'intervallo`);
  };
}

export const finite = Number.isFinite;
/** Rounds to as many digits as an error estimate says are meaningful (at least 6, at most 13). */
export function tidyBy(v, err) {
  if (!finite(v) || v === 0) return v;
  const digits = Math.max(6, Math.min(13, Math.floor(-Math.log10(Math.abs(err) / Math.abs(v) + 1e-16)) - 1));
  return Number(v.toPrecision(digits));
}








// ---- Data (lists)

/** The lists x and y of a data set: two lists, or one list of points ({x,y} or [x,y]); y alone → x = 0, 1, 2… */
export function pairs(xs, ys, what = 'dati') {
  let x, y;
  const asNum = v => (typeof v === 'number' ? v : v === null || v === undefined || v === '' ? NaN : Number(String(v).replace(',', '.')));
  const first = a => (Array.isArray(a) && a.length ? a[0] : undefined);
  if (ys === undefined && Array.isArray(xs)) { ys = xs; xs = undefined; }
  if (!Array.isArray(ys)) throw new Error(`Servono dei dati: una lista di numeri o di punti`);
  if (ys.length > MAX_LIST) throw new Error(`Troppi dati (più di ${MAX_LIST})`);
  const f = first(ys);
  if (f !== null && typeof f === 'object') {
    x = ys.map(p => asNum(Array.isArray(p) ? p[0] : p?.x));
    y = ys.map(p => asNum(Array.isArray(p) ? p[1] : p?.y));
  } else {
    y = ys.map(asNum);
    if (xs === undefined) x = y.map((_, i) => i);
    else {
      if (!Array.isArray(xs)) throw new Error('Serve una lista di numeri per le x');
      x = xs.map(asNum);
    }
  }
  if (x.length !== y.length) throw new Error(`Le liste x e y hanno lunghezze diverse (${x.length} e ${y.length})`);
  return { x, y };
}

/** Pairs without the ones that are not numbers (and the number skipped). */
export function cleanPairs(p) {
  const x = [], y = [];
  for (let i = 0; i < p.x.length; i++) if (finite(p.x[i]) && finite(p.y[i])) { x.push(p.x[i]); y.push(p.y[i]); }
  return { x, y, skipped: p.x.length - x.length };
}

/** Sorted by x; two equal x are an error. */
export function sortPairs(p) {
  const idx = p.x.map((_, i) => i).sort((i, j) => p.x[i] - p.x[j]);
  const x = idx.map(i => p.x[i]), y = idx.map(i => p.y[i]);
  for (let i = 1; i < x.length; i++) if (x[i] === x[i - 1]) throw new Error(`Due punti hanno la stessa x (${x[i]})`);
  return { x, y };
}


/** dy/dx from the data: central differences inside (non-uniform spacing), one-sided at the ends. */
export function dataDerivative(x, y, method = 'central') {
  const n = x.length, d = new Array(n).fill(null);
  if (n < 2) return d;
  for (let i = 0; i < n; i++) {
    let v;
    if (method === 'forward') v = i < n - 1 ? (y[i + 1] - y[i]) / (x[i + 1] - x[i]) : (y[i] - y[i - 1]) / (x[i] - x[i - 1]);
    else if (method === 'backward') v = i > 0 ? (y[i] - y[i - 1]) / (x[i] - x[i - 1]) : (y[1] - y[0]) / (x[1] - x[0]);
    else if (i === 0) v = (y[1] - y[0]) / (x[1] - x[0]);
    else if (i === n - 1) v = (y[i] - y[i - 1]) / (x[i] - x[i - 1]);
    else {
      const h0 = x[i] - x[i - 1], h1 = x[i + 1] - x[i];
      v = (-h1 / (h0 * (h0 + h1))) * y[i - 1] + ((h1 - h0) / (h0 * h1)) * y[i] + (h0 / (h1 * (h0 + h1))) * y[i + 1];
    }
    d[i] = finite(v) ? v : null;
  }
  return d;
}

// ---- Roots

/** A root of f in [a, b] with f(a), f(b) of opposite signs: 'bisection' | 'brent' | 'newton' (with df, safeguarded). */
export function solveBracket(f, a, b, { method = 'brent', tol = 1e-12, maxIter = 200, df = null } = {}) {
  let fa = f(a), fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (!(fa * fb < 0)) return NaN;
  if (method === 'bisection') {
    for (let i = 0; i < maxIter; i++) {
      const m = (a + b) / 2, fm = f(m);
      if (fm === 0 || (b - a) / 2 < tol) return m;
      if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }
  if (method === 'newton') {
    let x = (a + b) / 2;
    for (let i = 0; i < maxIter; i++) {
      const fx = f(x);
      if (fx === 0) return x;
      if (fa * fx < 0) { b = x; fb = fx; } else { a = x; fa = fx; }
      const d = df ? df(x) : (f(x + 1e-6 * Math.max(1, Math.abs(x))) - f(x - 1e-6 * Math.max(1, Math.abs(x)))) / (2e-6 * Math.max(1, Math.abs(x)));
      let next = x - fx / d;
      if (!finite(next) || next <= a || next >= b) next = (a + b) / 2;   // out of the bracket: bisect
      if (Math.abs(next - x) < tol * Math.max(1, Math.abs(x))) return next;
      x = next;
    }
    return x;
  }
  // Brent
  let c = a, fc = fa, d = b - a, e = d;
  for (let i = 0; i < maxIter; i++) {
    if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) { c = a; fc = fa; d = b - a; e = d; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tol, xm = 0.5 * (c - b);
    if (Math.abs(xm) <= tol1 || fb === 0) return b;
    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      let p, q, r;
      const s = fb / fa;
      if (a === c) { p = 2 * xm * s; q = 1 - s; } else {
        q = fa / fc; r = fb / fc;
        p = s * (2 * xm * q * (q - r) - (b - a) * (r - 1));
        q = (q - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      p = Math.abs(p);
      if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) { e = d; d = p / q; } else { d = xm; e = d; }
    } else { d = xm; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol1 ? d : (xm > 0 ? tol1 : -tol1);
    fb = f(b);
  }
  return b;
}

/** All the zeros of f in [a, b]: sign changes on n sub-intervals, plus the ones where f only touches zero. */
export function allRoots(f, a, b, { n = 400, method = 'brent', tol = 1e-12, maxIter = 200, df = null, tick = () => {} } = {}) {
  if (a > b) [a, b] = [b, a];
  n = Math.max(2, Math.min(n, 200000));
  const xs = new Array(n + 1), ys = new Array(n + 1);
  for (let i = 0; i <= n; i++) { tick(); xs[i] = a + ((b - a) * i) / n; ys[i] = f(xs[i]); }
  const roots = [];
  const push = r => { if (finite(r) && !roots.some(q => Math.abs(q - r) <= 1e-7 * Math.max(1, Math.abs(r)))) roots.push(r); };
  for (let i = 0; i <= n; i++) {
    tick();
    if (ys[i] === 0) { push(xs[i]); continue; }
    if (i < n && finite(ys[i]) && finite(ys[i + 1]) && ys[i] * ys[i + 1] < 0) {
      const r = solveBracket(f, xs[i], xs[i + 1], { method, tol, maxIter, df });
      const fr = Math.abs(f(r));
      // a pole (1/x) also changes sign: there f does not get small
      if (finite(r) && fr <= 1e-9 + 1e-6 * (Math.abs(ys[i]) + Math.abs(ys[i + 1]))) push(r);
    } else if (i > 0 && i < n && finite(ys[i - 1]) && finite(ys[i]) && finite(ys[i + 1]) && ys[i - 1] * ys[i] > 0 && ys[i] * ys[i + 1] > 0
      && Math.abs(ys[i]) <= Math.abs(ys[i - 1]) && Math.abs(ys[i]) <= Math.abs(ys[i + 1])) {
      // a local minimum of |f| that may touch zero without crossing it ((x-1)^2)
      let lo = xs[i - 1], hi = xs[i + 1];
      const g = x => Math.abs(f(x));
      const phi = (Math.sqrt(5) - 1) / 2;
      let c = hi - phi * (hi - lo), d = lo + phi * (hi - lo), gc = g(c), gd = g(d);
      for (let k = 0; k < 100 && hi - lo > 1e-12 * Math.max(1, Math.abs(lo)); k++) {
        if (gc < gd) { hi = d; d = c; gd = gc; c = hi - phi * (hi - lo); gc = g(c); } else { lo = c; c = d; gc = gd; d = lo + phi * (hi - lo); gd = g(d); }
      }
      const r = (lo + hi) / 2;
      if (g(r) < 1e-12 * (1 + Math.abs(ys[i]))) push(r);
    }
  }
  return roots.sort((p, q) => p - q);
}



// ---- Series

/**
 * The sum (or product) of the terms t(n), n from `from`: a finite one (to is a number) or an
 * infinite one (to = Infinity). For the infinite one it is a heuristic: it stops when the terms
 * are negligible (converges); if they do not go to zero it diverges; for a tail like C/n^p it
 * converges when p > 1.05 (and adds the estimated tail) and diverges otherwise; an alternating
 * series with shrinking terms converges (the last term is halved). For a product the series of
 * (t - 1) is judged.
 */
export function seriesSum(term, from, to, { maxTerms = 100000, keep = 200, product = false, tick = () => {} } = {}) {
  const partial = [];
  const finiteRange = finite(to);
  const last = finiteRange ? Math.min(to, from + maxTerms - 1) : from + maxTerms - 1;
  const every = Math.max(1, Math.ceil((last - from + 1) / keep));
  const u = n => (product ? term(n) - 1 : term(n));
  let acc = product ? 1 : 0, small = 0, maxAbs = 0, n = from;
  const recent = [];
  for (; n <= last; n++) {
    tick();
    const t = term(n);
    if (!finite(t)) {
      if (!finiteRange && Math.abs(t) === Infinity) return { value: null, converges: false, count: n - from, partial };
      throw new Error(`Il termine non è un numero finito per n = ${n}`);
    }
    acc = product ? acc * t : acc + t;
    if ((n - from) % every === 0) partial.push(acc);
    const ut = product ? t - 1 : t;
    recent.push(ut);
    if (recent.length > 12) recent.shift();
    maxAbs = Math.max(maxAbs, Math.abs(ut));
    if (!finiteRange) {
      if (Math.abs(ut) <= 1e-15 * Math.max(1, product ? 1 : Math.abs(acc))) small++; else small = 0;
      if (small >= 8) { n++; break; }
    }
  }
  const count = n - from;
  if (finiteRange) {
    if (to > last) return { value: acc, converges: null, count, partial, truncated: true };
    return { value: acc, converges: true, count, partial };
  }
  if (small >= 8) return { value: acc, converges: true, count, partial };
  // The terms did not become negligible within the limit: look at how they behave
  const N = from + count - 1;
  const tN = Math.abs(u(N));
  if (tN === 0) return { value: acc, converges: true, count, partial };
  if (tN > 1e-3 * maxAbs) return { value: null, converges: false, count, partial };   // they do not go to zero
  const alternating = recent.length >= 6 && recent.slice(-6).every((t, i, arr) => i === 0 || Math.sign(t) === -Math.sign(arr[i - 1]));
  const M = Math.max(from + 1, Math.floor(N / 2));
  const tM = Math.abs(u(M));
  if (alternating && tN < tM) return { value: product ? acc : acc - recent[recent.length - 1] / 2, converges: true, count, partial };
  const p = tM > 0 && N > M ? Math.log(tM / tN) / Math.log(N / M) : 0;
  if (p > 1.05) return { value: product ? acc : acc + (tN * N) / (p - 1), converges: true, count, partial };
  return { value: null, converges: false, count, partial };
}

// ---- Differential equations


const axpy = (y, h, ks, coefs) => y.map((v, i) => { let s = v; for (let j = 0; j < coefs.length; j++) if (coefs[j]) s += h * coefs[j] * ks[j][i]; return s; });

/** One step of Euler (1), RK4 (4): y(t+h) from y(t). `F(t, y)` returns an array. */
export function stepOde(F, t, y, h, method) {
  if (method === 'euler') { const k = F(t, y); return y.map((v, i) => v + h * k[i]); }
  const k1 = F(t, y);
  const k2 = F(t + h / 2, axpy(y, h, [k1], [0.5]));
  const k3 = F(t + h / 2, axpy(y, h, [k2], [0.5]));
  const k4 = F(t + h, axpy(y, h, [k3], [1]));
  return y.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}


// ---- Linear algebra (small)

/** Least squares: the x minimising |A x - y| (A has rows of equal length), by Householder QR. */
export function lstsq(A, y) {
  const m = A.length, n = A[0].length;
  if (m < n) throw new Error(`Servono almeno ${n} punti per questo modello (ce ne sono ${m})`);
  const R = A.map(r => r.slice()), b = y.slice();
  for (let k = 0; k < n; k++) {
    let norm = 0;
    for (let i = k; i < m; i++) norm += R[i][k] ** 2;
    norm = Math.sqrt(norm);
    if (norm === 0) throw new Error('I punti non bastano a determinare il modello (colonne dipendenti)');
    const alpha = R[k][k] > 0 ? -norm : norm;
    const v = new Array(m).fill(0);
    for (let i = k; i < m; i++) v[i] = R[i][k];
    v[k] -= alpha;
    let vv = 0;
    for (let i = k; i < m; i++) vv += v[i] * v[i];
    if (vv === 0) continue;
    for (let j = k; j < n; j++) {
      let s = 0;
      for (let i = k; i < m; i++) s += v[i] * R[i][j];
      const c = (2 * s) / vv;
      for (let i = k; i < m; i++) R[i][j] -= c * v[i];
    }
    let s = 0;
    for (let i = k; i < m; i++) s += v[i] * b[i];
    const c = (2 * s) / vv;
    for (let i = k; i < m; i++) b[i] -= c * v[i];
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
    if (Math.abs(R[i][i]) < 1e-13 * Math.max(1, Math.abs(R[0][0]))) throw new Error('I punti non bastano a determinare il modello');
    x[i] = s / R[i][i];
  }
  return x;
}

/** Solves a square system by Gauss with pivoting (for the splines). */
export function solveLinear(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) throw new Error('Sistema lineare singolare');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

// ---- Polynomials (coefficients from the highest degree)

export function polyEval(c, x) {
  let r = 0;
  for (const k of c) r = r * x + k;
  return r;
}
/** Coefficients without the zeros in front. */
export function polyTrim(c) {
  let i = 0;
  while (i < c.length - 1 && c[i] === 0) i++;
  return c.slice(i);
}



// ---- Interpolation

/** Natural cubic spline: the second derivatives at the nodes. */
export function splineSecond(x, y) {
  const n = x.length;
  if (n < 3) return new Array(n).fill(0);
  // tridiagonal system solved by the Thomas algorithm (O(n)): sub[i] M[i-1] + diag[i] M[i] + sup[i] M[i+1] = r[i]
  const m = n - 2, sub = new Array(m), diag = new Array(m), sup = new Array(m), r = new Array(m);
  for (let i = 1; i < n - 1; i++) {
    const h0 = x[i] - x[i - 1], h1 = x[i + 1] - x[i];
    sub[i - 1] = h0; diag[i - 1] = 2 * (h0 + h1); sup[i - 1] = h1;
    r[i - 1] = 6 * ((y[i + 1] - y[i]) / h1 - (y[i] - y[i - 1]) / h0);
  }
  for (let i = 1; i < m; i++) {
    const w = sub[i] / diag[i - 1];
    diag[i] -= w * sup[i - 1]; r[i] -= w * r[i - 1];
  }
  const M = new Array(m);
  M[m - 1] = r[m - 1] / diag[m - 1];
  for (let i = m - 2; i >= 0; i--) M[i] = (r[i] - sup[i] * M[i + 1]) / diag[i];
  return [0, ...M, 0];
}

/** An evaluator of the interpolation through (x, y) sorted by x: linear | lagrange | spline. Outside the data it extends the first/last piece. */
export function interpolator(x, y, method) {
  const n = x.length;
  const seg = v => { let lo = 0, hi = n - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (x[m] <= v) lo = m; else hi = m - 1; } return lo; };
  if (method === 'lagrange') {
    const w = x.map((xi, i) => { let p = 1; for (let j = 0; j < n; j++) if (j !== i) p *= xi - x[j]; return 1 / p; });
    return v => {
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        const d = v - x[i];
        if (d === 0) return y[i];
        const t = w[i] / d;
        num += t * y[i]; den += t;
      }
      return num / den;
    };
  }
  if (method === 'spline') {
    const M = splineSecond(x, y);
    return v => {
      const i = seg(v), h = x[i + 1] - x[i];
      const A = (x[i + 1] - v) / h, B = (v - x[i]) / h;
      return A * y[i] + B * y[i + 1] + ((A ** 3 - A) * M[i] + (B ** 3 - B) * M[i + 1]) * h * h / 6;
    };
  }
  return v => { const i = seg(v); return y[i] + ((y[i + 1] - y[i]) * (v - x[i])) / (x[i + 1] - x[i]); };
}



// ---- Complex numbers ({ re, im })

export const C = {
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
  div: (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    if (d === 0) throw new Error('Divisione per zero');
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  },
  abs: a => Math.hypot(a.re, a.im),
  arg: a => Math.atan2(a.im, a.re),
  conj: a => ({ re: a.re, im: -a.im }),
  neg: a => ({ re: -a.re, im: -a.im }),
  exp: a => ({ re: Math.exp(a.re) * Math.cos(a.im), im: Math.exp(a.re) * Math.sin(a.im) }),
  ln: a => { if (a.re === 0 && a.im === 0) throw new Error('Il logaritmo di 0 non esiste'); return { re: Math.log(Math.hypot(a.re, a.im)), im: Math.atan2(a.im, a.re) }; },
  sqrt: a => { const r = Math.hypot(a.re, a.im), re = Math.sqrt((r + a.re) / 2), im = Math.sqrt(Math.max(0, (r - a.re) / 2)); return { re, im: a.im < 0 ? -im : im }; },
  sin: a => ({ re: Math.sin(a.re) * Math.cosh(a.im), im: Math.cos(a.re) * Math.sinh(a.im) }),
  cos: a => ({ re: Math.cos(a.re) * Math.cosh(a.im), im: -Math.sin(a.re) * Math.sinh(a.im) }),
  pow(a, b) {
    if (a.re === 0 && a.im === 0) { if (b.re === 0 && b.im === 0) return { re: 1, im: 0 }; return { re: 0, im: 0 }; }
    return C.exp(C.mul(b, C.ln(a)));
  },
  fromPolar: (r, theta) => ({ re: r * Math.cos(theta), im: r * Math.sin(theta) }),
};

/** A complex number from a number, {re, im}, [re, im], or a text such as "3+4i", "-2j", "i". */
export function toComplex(v) {
  if (typeof v === 'number') { if (!finite(v)) throw new Error('Un numero complesso deve avere parti finite'); return { re: v, im: 0 }; }
  if (typeof v === 'boolean') return { re: Number(v), im: 0 };
  if (Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'number')) return { re: v[0], im: v[1] };
  if (v && typeof v === 'object' && (typeof v.re === 'number' || typeof v.im === 'number')) return { re: Number(v.re ?? 0), im: Number(v.im ?? 0) };
  if (typeof v === 'string') {
    const s = v.replace(/\s+/g, '').replace(/,/g, '.').replace('−', '-');
    if (s.length > 80) throw new Error('Numero complesso non valido');
    const num = String.raw`(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`;
    let m, re = 0, im = 0, hit = false;
    if ((m = new RegExp(`^([+-]?${num})$`).exec(s))) { re = Number(m[1]); hit = true; }
    else if ((m = new RegExp(`^([+-]?(?:${num})?)[ij]$`).exec(s))) { im = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number(m[1]); hit = true; }
    else if ((m = new RegExp(`^([+-]?${num})([+-](?:${num})?)[ij]$`).exec(s))) { re = Number(m[1]); im = m[2] === '+' ? 1 : m[2] === '-' ? -1 : Number(m[2]); hit = true; }
    if (hit && finite(re) && finite(im)) return { re, im };
    // "i2" style is not accepted; a lone number was handled above
  }
  throw new Error(`Non è un numero complesso: «${typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v)?.slice(0, 40)}»`);
}

/** The text of a complex number: 3+4i, -2i, 5. */
export function complexText(z, digits = 12) {
  const f = x => String(Number(x.toPrecision(digits)));
  const re = Math.abs(z.re) < 1e-15 * Math.abs(z.im) ? 0 : z.re;
  const im = Math.abs(z.im) < 1e-15 * Math.abs(z.re) ? 0 : z.im;
  if (im === 0) return f(re);
  const imText = Math.abs(im) === 1 ? '' : f(Math.abs(im));
  if (re === 0) return `${im < 0 ? '-' : ''}${imText}i`;
  return `${f(re)}${im < 0 ? '-' : '+'}${imText}i`;
}
