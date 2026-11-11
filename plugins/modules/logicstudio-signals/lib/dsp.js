/**
 * The signal maths of the Signals package (logicstudio-signals): FFT (radix-2 and Bluestein for any
 * length), windows, filter design (Butterworth and Chebyshev I/II through analog prototypes and the
 * bilinear transform, RBJ biquads, windowed-sinc FIR), filtering with kept state, convolution,
 * Hilbert transform, polynomial roots. Plain JS, no dependencies; imported by blocks.js.
 *
 * Arrays in, plain arrays or Float64Arrays out; complex numbers as { re, im }.
 */

// ------------------------------------------------------------------------------------------ complex
export const C = (re, im = 0) => ({ re, im });
export const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
export const csub = (a, b) => C(a.re - b.re, a.im - b.im);
export const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
export const cabs = a => Math.hypot(a.re, a.im);
export const cneg = a => C(-a.re, -a.im);
export const cscale = (a, s) => C(a.re * s, a.im * s);
export function csqrt(a) {
  const r = cabs(a);
  const re = Math.sqrt((r + a.re) / 2), im = Math.sqrt(Math.max(0, (r - a.re) / 2));
  return C(re, a.im < 0 ? -im : im);
}
const cprod = list => list.reduce((acc, x) => cmul(acc, x), C(1));

// ---------------------------------------------------------------------------------------------- FFT
export const isPow2 = n => n > 0 && (n & (n - 1)) === 0;
export const nextPow2 = n => { let p = 1; while (p < n) p *= 2; return p; };

/** In place radix-2 FFT of re/im (Float64Array, length a power of 2). inverse: e^{+i}, no 1/n. */
function radix2(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const ang = sign * 2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/**
 * DFT of any length: X[k] = Σ x[n] e^{∓2πikn/N}. Returns new Float64Arrays { re, im }.
 * inverse = true uses e^{+…} and divides by N (the IDFT).
 */
export function fft(reIn, imIn = null, inverse = false) {
  const n = reIn.length;
  const re = Float64Array.from(reIn), im = imIn ? Float64Array.from(imIn) : new Float64Array(n);
  if (n === 0) return { re, im };
  if (isPow2(n)) radix2(re, im, inverse);
  else bluestein(re, im, inverse);
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  return { re, im };
}

/** Bluestein's chirp-z: a DFT of any length through a power-of-2 convolution. In place. */
function bluestein(re, im, inverse) {
  const n = re.length, m = nextPow2(2 * n - 1), sign = inverse ? 1 : -1;
  const wr = new Float64Array(n), wi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const ang = sign * Math.PI * ((k * k) % (2 * n)) / n;
    wr[k] = Math.cos(ang); wi[k] = Math.sin(ang);
  }
  const ar = new Float64Array(m), ai = new Float64Array(m), br = new Float64Array(m), bi = new Float64Array(m);
  for (let k = 0; k < n; k++) {
    ar[k] = re[k] * wr[k] - im[k] * wi[k]; ai[k] = re[k] * wi[k] + im[k] * wr[k];
  }
  br[0] = wr[0]; bi[0] = -wi[0];
  for (let k = 1; k < n; k++) { br[k] = br[m - k] = wr[k]; bi[k] = bi[m - k] = -wi[k]; }
  radix2(ar, ai, false); radix2(br, bi, false);
  for (let k = 0; k < m; k++) {
    const r = ar[k] * br[k] - ai[k] * bi[k]; ai[k] = ar[k] * bi[k] + ai[k] * br[k]; ar[k] = r;
  }
  radix2(ar, ai, true);
  for (let k = 0; k < n; k++) {
    const cr = ar[k] / m, ci = ai[k] / m;
    re[k] = cr * wr[k] - ci * wi[k]; im[k] = cr * wi[k] + ci * wr[k];
  }
}

// ------------------------------------------------------------------------------------------ windows
export const WINDOWS = ['rect', 'hann', 'hamming', 'blackman', 'blackmanHarris', 'flattop', 'bartlett', 'kaiser', 'tukey'];

/** Modified Bessel function of the first kind, order 0 (for Kaiser). */
function besselI0(x) {
  let sum = 1, term = 1, k = 1;
  const q = (x / 2) ** 2;
  do { term *= q / (k * k); sum += term; k++; } while (term > 1e-14 * sum && k < 500);
  return sum;
}

const cosineSum = (a, n, d) => Array.from({ length: n }, (_, i) => a.reduce((s, c, k) => s + (k % 2 ? -1 : 1) * c * Math.cos(2 * Math.PI * k * i / d), 0));

/** A window of n points. periodic = true: for spectra (DFT-even, denominator n), else symmetric. */
export function windowOf(kind, n, { periodic = true, beta = 8.6, alpha = 0.5 } = {}) {
  if (n <= 1) return n === 1 ? [1] : [];
  const d = periodic ? n : n - 1;
  switch (kind) {
    case 'rect': return new Array(n).fill(1);
    case 'hann': return cosineSum([0.5, 0.5], n, d);
    case 'hamming': return cosineSum([0.54, 0.46], n, d);
    case 'blackman': return cosineSum([0.42, 0.5, 0.08], n, d);
    case 'blackmanHarris': return cosineSum([0.35875, 0.48829, 0.14128, 0.01168], n, d);
    case 'flattop': return cosineSum([0.21557895, 0.41663158, 0.277263158, 0.083578947, 0.006947368], n, d);
    case 'bartlett': return Array.from({ length: n }, (_, i) => 1 - Math.abs((i - d / 2) / (d / 2)));
    case 'kaiser': {
      const den = besselI0(beta);
      return Array.from({ length: n }, (_, i) => besselI0(beta * Math.sqrt(Math.max(0, 1 - ((2 * i) / d - 1) ** 2))) / den);
    }
    case 'tukey': {
      const a = Math.min(1, Math.max(0, alpha));
      if (a === 0) return new Array(n).fill(1);
      return Array.from({ length: n }, (_, i) => {
        const x = i / d;
        if (x < a / 2) return 0.5 * (1 + Math.cos(Math.PI * (2 * x / a - 1)));
        if (x > 1 - a / 2) return 0.5 * (1 + Math.cos(Math.PI * (2 * x / a - 2 / a + 1)));
        return 1;
      });
    }
    default: throw new Error(`Finestra sconosciuta: ${kind}`);
  }
}

// ------------------------------------------------------------------------------- analog prototypes
/** Butterworth, order n, cutoff 1 rad/s: { z, p, k }. */
function buttap(n) {
  const p = [];
  for (let m = -n + 1; m < n; m += 2) { const a = Math.PI * m / (2 * n); p.push(C(-Math.cos(a), -Math.sin(a))); }
  return { z: [], p, k: 1 };
}

/** Chebyshev type I, ripple rp dB in the pass band, edge at 1 rad/s. */
function cheb1ap(n, rp) {
  const eps = Math.sqrt(10 ** (rp / 10) - 1), mu = Math.asinh(1 / eps) / n;
  const p = [];
  for (let m = -n + 1; m < n; m += 2) {
    const th = Math.PI * m / (2 * n);
    // -sinh(mu + i·th)
    p.push(C(-Math.sinh(mu) * Math.cos(th), -Math.cosh(mu) * Math.sin(th)));
  }
  let k = cprod(p.map(cneg)).re;
  if (n % 2 === 0) k /= Math.sqrt(1 + eps * eps);
  return { z: [], p, k };
}

/** Chebyshev type II, rs dB of attenuation in the stop band, which starts at 1 rad/s. */
function cheb2ap(n, rs) {
  const de = 1 / Math.sqrt(10 ** (rs / 10) - 1), mu = Math.asinh(1 / de) / n;
  const ms = [];
  if (n % 2) { for (let m = -n + 1; m < 0; m += 2) ms.push(m); for (let m = 2; m < n; m += 2) ms.push(m); } else for (let m = -n + 1; m < n; m += 2) ms.push(m);
  const z = ms.map(m => C(0, 1 / Math.sin(m * Math.PI / (2 * n))));   // -conj(i / sin(…)) = i / sin(…)
  const p = [];
  for (let m = -n + 1; m < n; m += 2) {
    const a = Math.PI * m / (2 * n);
    const q = C(-Math.cos(a), -Math.sin(a));
    p.push(cdiv(C(1), C(Math.sinh(mu) * q.re, Math.cosh(mu) * q.im)));
  }
  const k = cdiv(cprod(p.map(cneg)), cprod(z.map(cneg))).re;
  return { z, p, k };
}

// --------------------------------------------------------------------------- frequency transforms
function lp2lp({ z, p, k }, wo) {
  return { z: z.map(x => cscale(x, wo)), p: p.map(x => cscale(x, wo)), k: k * wo ** (p.length - z.length) };
}
function lp2hp({ z, p, k }, wo) {
  const deg = p.length - z.length;
  const kk = k * cdiv(cprod(z.map(cneg)), cprod(p.map(cneg))).re;
  return { z: [...z.map(x => cdiv(C(wo), x)), ...Array.from({ length: deg }, () => C(0))], p: p.map(x => cdiv(C(wo), x)), k: kk };
}
function lp2bp({ z, p, k }, wo, bw) {
  const deg = p.length - z.length;
  const split = list => {
    const half = list.map(x => cscale(x, bw / 2));
    const roots = half.map(x => csqrt(csub(cmul(x, x), C(wo * wo))));
    return [...half.map((x, i) => cadd(x, roots[i])), ...half.map((x, i) => csub(x, roots[i]))];
  };
  return { z: [...split(z), ...Array.from({ length: deg }, () => C(0))], p: split(p), k: k * bw ** deg };
}
function lp2bs({ z, p, k }, wo, bw) {
  const deg = p.length - z.length;
  const split = list => {
    const inv = list.map(x => cdiv(C(bw / 2), x));
    const roots = inv.map(x => csqrt(csub(cmul(x, x), C(wo * wo))));
    return [...inv.map((x, i) => cadd(x, roots[i])), ...inv.map((x, i) => csub(x, roots[i]))];
  };
  const kk = k * cdiv(cprod(z.map(cneg)), cprod(p.map(cneg))).re;
  return { z: [...split(z), ...Array.from({ length: deg }, () => C(0, wo)), ...Array.from({ length: deg }, () => C(0, -wo))], p: split(p), k: kk };
}
function bilinear({ z, p, k }, fs) {
  const f2 = 2 * fs, deg = p.length - z.length;
  const map = x => cdiv(cadd(C(f2), x), csub(C(f2), x));
  const kk = k * cdiv(cprod(z.map(x => csub(C(f2), x))), cprod(p.map(x => csub(C(f2), x)))).re;
  return { z: [...z.map(map), ...Array.from({ length: deg }, () => C(-1))], p: p.map(map), k: kk };
}

/** Roots → groups: conjugate pairs (one per pair) and real roots. */
function groupsOf(roots) {
  const tol = 1e-9;
  const reals = [], pairs = [];
  const used = new Array(roots.length).fill(false);
  for (let i = 0; i < roots.length; i++) {
    if (used[i]) continue;
    const r = roots[i];
    if (Math.abs(r.im) <= tol * Math.max(1, cabs(r))) { reals.push(r.re); used[i] = true; continue; }
    // its conjugate
    let best = -1, bd = Infinity;
    for (let j = i + 1; j < roots.length; j++) {
      if (used[j]) continue;
      const d = Math.hypot(roots[j].re - r.re, roots[j].im + r.im);
      if (d < bd) { bd = d; best = j; }
    }
    used[i] = true;
    if (best >= 0) used[best] = true;
    pairs.push(r.im > 0 ? r : C(r.re, -r.im));
  }
  return { reals, pairs };
}

/** zpk → second-order sections [b0, b1, b2, 1, a1, a2]; poles nearer the unit circle come last. */
export function zpk2sos({ z, p, k }) {
  const P = groupsOf(p), Z = groupsOf(z);
  // pole groups: each pair alone, reals two by two
  const pg = P.pairs.map(x => ({ roots: [x, C(x.re, -x.im)], r: cabs(x) }));
  const pr = [...P.reals].sort((a, b) => Math.abs(a) - Math.abs(b));
  for (let i = 0; i < pr.length; i += 2) pg.push({ roots: pr.slice(i, i + 2).map(x => C(x)), r: Math.max(...pr.slice(i, i + 2).map(Math.abs)) });
  const zg = Z.pairs.map(x => ({ roots: [x, C(x.re, -x.im)] }));
  const zr = [...Z.reals].sort((a, b) => a - b);
  for (let i = 0; i < zr.length; i += 2) zg.push({ roots: zr.slice(i, i + 2).map(x => C(x)) });
  pg.sort((a, b) => a.r - b.r);
  const sos = [];
  const free = [...zg];
  for (const g of pg) {
    // the nearest free zero group with the same number of roots if possible
    let bi = -1, bd = Infinity;
    for (let i = 0; i < free.length; i++) {
      const sameSize = free[i].roots.length === g.roots.length ? 0 : 1e6;
      const d = sameSize + Math.min(...free[i].roots.map(zz => Math.hypot(zz.re - g.roots[0].re, zz.im - g.roots[0].im)));
      if (d < bd) { bd = d; bi = i; }
    }
    const zz = bi >= 0 ? free.splice(bi, 1)[0].roots : [];
    sos.push([...poly2(zz), ...poly2(g.roots)]);
  }
  // zeros left over (should not happen with the designs here): extra sections with poles at 0
  for (const g of free) sos.push([...poly2(g.roots), 1, 0, 0]);
  if (sos.length) { sos[0][0] *= k; sos[0][1] *= k; sos[0][2] *= k; } else sos.push([k, 0, 0, 1, 0, 0]);
  return sos;
}

/** [1, -(r1+r2), r1·r2] for up to two roots (a conjugate pair gives real coefficients). */
function poly2(roots) {
  if (roots.length === 0) return [1, 0, 0];
  if (roots.length === 1) return [1, -roots[0].re, 0];
  const [a, b] = roots;
  return [1, -(a.re + b.re), cmul(a, b).re];
}

export const IIR_FAMILIES = ['butterworth', 'cheby1', 'cheby2'];
export const BANDS = ['lowpass', 'highpass', 'bandpass', 'bandstop'];

/** Digital IIR design: { sos, z, p, k }. f1 (and f2 for band filters) in Hz, below fs/2. */
export function designIIR({ family = 'butterworth', band = 'lowpass', order = 4, f1, f2, fs, ripple = 1, attenuation = 40 }) {
  const n = Math.round(order);
  if (!(n >= 1 && n <= 20)) throw new Error("L'ordine va da 1 a 20");
  if (!(fs > 0)) throw new Error('La frequenza di campionamento deve essere più di 0');
  const nyq = fs / 2;
  const check = f => { if (!(f > 0 && f < nyq)) throw new Error(`La frequenza di taglio (${f} Hz) deve stare tra 0 e fs/2 (${nyq} Hz)`); };
  check(f1);
  const band2 = band === 'bandpass' || band === 'bandstop';
  if (band2) { check(f2); if (!(f2 > f1)) throw new Error('La seconda frequenza deve essere più alta della prima'); }
  if (family === 'cheby1' && !(ripple > 0)) throw new Error("L'ondulazione deve essere più di 0 dB");
  if (family === 'cheby2' && !(attenuation > 0)) throw new Error("L'attenuazione deve essere più di 0 dB");
  const proto = family === 'cheby1' ? cheb1ap(n, ripple) : family === 'cheby2' ? cheb2ap(n, attenuation) : family === 'butterworth' ? buttap(n) : null;
  if (!proto) throw new Error(`Famiglia di filtro sconosciuta: ${family}`);
  const warp = f => 2 * fs * Math.tan(Math.PI * f / fs);
  let analog;
  if (band === 'lowpass') analog = lp2lp(proto, warp(f1));
  else if (band === 'highpass') analog = lp2hp(proto, warp(f1));
  else if (band2) {
    const w1 = warp(f1), w2 = warp(f2), wo = Math.sqrt(w1 * w2), bw = w2 - w1;
    analog = band === 'bandpass' ? lp2bp(proto, wo, bw) : lp2bs(proto, wo, bw);
  } else throw new Error(`Tipo di filtro sconosciuto: ${band}`);
  const digital = bilinear(analog, fs);
  return { sos: zpk2sos(digital), z: digital.z, p: digital.p, k: digital.k };
}

export const BIQUADS = ['lowpass', 'highpass', 'bandpass', 'notch', 'peak', 'lowshelf', 'highshelf', 'allpass'];

/** RBJ «Audio EQ Cookbook» biquad: one section [b0, b1, b2, 1, a1, a2]. */
export function designBiquad({ kind, f, q = Math.SQRT1_2, gain = 0, fs }) {
  if (!(fs > 0)) throw new Error('La frequenza di campionamento deve essere più di 0');
  if (!(f > 0 && f < fs / 2)) throw new Error(`La frequenza (${f} Hz) deve stare tra 0 e fs/2 (${fs / 2} Hz)`);
  if (!(q > 0)) throw new Error('Q deve essere più di 0');
  const w0 = 2 * Math.PI * f / fs, cw = Math.cos(w0), alpha = Math.sin(w0) / (2 * q), A = 10 ** (gain / 40);
  let b, a;
  switch (kind) {
    case 'lowpass': b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
    case 'highpass': b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
    case 'bandpass': b = [alpha, 0, -alpha]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
    case 'notch': b = [1, -2 * cw, 1]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
    case 'allpass': b = [1 - alpha, -2 * cw, 1 + alpha]; a = [1 + alpha, -2 * cw, 1 - alpha]; break;
    case 'peak': b = [1 + alpha * A, -2 * cw, 1 - alpha * A]; a = [1 + alpha / A, -2 * cw, 1 - alpha / A]; break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b = [A * ((A + 1) - (A - 1) * cw + s), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - s)];
      a = [(A + 1) + (A - 1) * cw + s, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - s];
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b = [A * ((A + 1) + (A - 1) * cw + s), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - s)];
      a = [(A + 1) - (A - 1) * cw + s, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - s];
      break;
    }
    default: throw new Error(`Tipo di biquad sconosciuto: ${kind}`);
  }
  return [b[0] / a[0], b[1] / a[0], b[2] / a[0], 1, a[1] / a[0], a[2] / a[0]];
}

/** Windowed-sinc FIR (odd number of taps, linear phase), or a moving average. */
export function designFIR({ band = 'lowpass', taps = 101, f1, f2, fs, window = 'hamming', beta = 8.6 }) {
  let n = Math.round(taps);
  if (!(n >= 1 && n <= 4095)) throw new Error('I coefficienti vanno da 1 a 4095');
  if (band === 'average') return new Array(n).fill(1 / n);
  if (n % 2 === 0) n += 1;   // odd: type I, works for every band
  const nyq = fs / 2;
  const check = f => { if (!(f > 0 && f < nyq)) throw new Error(`La frequenza di taglio (${f} Hz) deve stare tra 0 e fs/2 (${nyq} Hz)`); };
  check(f1);
  if (band === 'bandpass' || band === 'bandstop') { check(f2); if (!(f2 > f1)) throw new Error('La seconda frequenza deve essere più alta della prima'); }
  const w = windowOf(window, n, { periodic: false, beta });
  const m = (n - 1) / 2;
  const lp = fc => {
    const x = 2 * fc / fs;
    const h = Array.from({ length: n }, (_, i) => x * sinc(x * (i - m)) * w[i]);
    const s = h.reduce((a, v) => a + v, 0);
    return h.map(v => v / s);
  };
  const delta = i => (i === m ? 1 : 0);
  switch (band) {
    case 'lowpass': return lp(f1);
    case 'highpass': return lp(f1).map((v, i) => delta(i) - v);
    case 'bandpass': { const a = lp(f1), b = lp(f2); return b.map((v, i) => v - a[i]); }
    case 'bandstop': { const a = lp(f1), b = lp(f2); return b.map((v, i) => delta(i) - (v - a[i])); }
    default: throw new Error(`Tipo di filtro sconosciuto: ${band}`);
  }
}

export const sinc = x => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

// ---------------------------------------------------------------------------------------- filtering
/** Filters x with SOS sections; state = [[z1, z2], …] (changed in place) or null for zero state. */
export function sosfilt(sos, x, state = null) {
  const st = state ?? sos.map(() => [0, 0]);
  let y = Float64Array.from(x);
  sos.forEach(([b0, b1, b2, , a1, a2], s) => {
    let [z1, z2] = st[s];
    for (let i = 0; i < y.length; i++) {
      const xi = y[i], yi = b0 * xi + z1;
      z1 = b1 * xi - a1 * yi + z2;
      z2 = b2 * xi - a2 * yi;
      y[i] = yi;
    }
    st[s][0] = z1; st[s][1] = z2;
  });
  return y;
}

/** Direct form II transposed of b/a (a[0] = 1); state: array of max(len)-1 (changed in place). */
export function lfilter(b, a, x, state = null) {
  const n = Math.max(b.length, a.length);
  const B = [...b, ...new Array(n - b.length).fill(0)], A = [...a, ...new Array(n - a.length).fill(0)];
  const z = state ?? new Array(n - 1).fill(0);
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const xi = x[i], yi = B[0] * xi + (n > 1 ? z[0] : 0);
    for (let k = 1; k < n - 1; k++) z[k - 1] = B[k] * xi - A[k] * yi + z[k];
    if (n > 1) z[n - 2] = B[n - 1] * xi - A[n - 1] * yi;
    y[i] = yi;
  }
  return y;
}

/** Forward and backward (zero phase), with an odd extension of the edges like filtfilt. */
export function zeroPhase(filterOnce, x, padlen) {
  const n = x.length;
  const pl = Math.min(padlen, n - 1);
  if (pl < 1) return filterOnce(filterOnce(x).reverse()).reverse();
  const ext = new Float64Array(n + 2 * pl);
  for (let i = 0; i < pl; i++) ext[i] = 2 * x[0] - x[pl - i];
  for (let i = 0; i < n; i++) ext[pl + i] = x[i];
  for (let i = 0; i < pl; i++) ext[pl + n + i] = 2 * x[n - 1] - x[n - 2 - i];
  const y = filterOnce(filterOnce(ext).reverse()).reverse();
  return y.slice(pl, pl + n);
}

/** sos → { b, a } (polynomial product of the sections). */
export function sos2ba(sos) {
  let b = [1], a = [1];
  for (const s of sos) { b = polymul(b, s.slice(0, 3)); a = polymul(a, s.slice(3, 6)); }
  return { b: trimZeros(b), a: trimZeros(a) };
}
const trimZeros = p => { const q = [...p]; while (q.length > 1 && q[q.length - 1] === 0) q.pop(); return q; };
export function polymul(p, q) {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) r[i + j] += p[i] * q[j];
  return r;
}

/** Frequency response of b/a at frequency f (Hz): complex H(e^{iω}). */
export function freqz(b, a, f, fs) {
  const w = 2 * Math.PI * f / fs;
  const ev = c => c.reduce((acc, v, k) => cadd(acc, C(v * Math.cos(-w * k), v * Math.sin(-w * k))), C(0));
  return cdiv(ev(b), ev(a));
}

/** Roots of a polynomial c[0] + c[1]x + … (ascending powers? no: c[0]·z^0 of z^-k form) —
 *  here c are coefficients of z^{-k}; the roots in z are those of c[0] z^n + c[1] z^{n-1} + … + c[n]. */
export function rootsOf(c) {
  const p = trimZeros(c);
  while (p.length > 1 && p[0] === 0) p.shift();
  const n = p.length - 1;
  if (n < 1) return [];
  if (n === 1) return [C(-p[1] / p[0])];
  if (n === 2) {
    const [a, b, cc] = p, d = b * b - 4 * a * cc;
    if (d >= 0) { const s = Math.sqrt(d); return [C((-b + s) / (2 * a)), C((-b - s) / (2 * a))]; }
    const s = Math.sqrt(-d); return [C(-b / (2 * a), s / (2 * a)), C(-b / (2 * a), -s / (2 * a))];
  }
  // Durand–Kerner on the monic polynomial
  const m = p.map(v => v / p[0]);
  const evalAt = z => m.reduce((acc, v) => cadd(cmul(acc, z), C(v)), C(0));
  const r = Math.max(1, ...m.slice(1).map(Math.abs));
  let roots = Array.from({ length: n }, (_, i) => { const ang = 2 * Math.PI * i / n + 0.4; return C(r * Math.cos(ang), r * Math.sin(ang)); });
  for (let it = 0; it < 500; it++) {
    let move = 0;
    roots = roots.map((z, i) => {
      let den = C(1);
      roots.forEach((w, j) => { if (j !== i) den = cmul(den, csub(z, w)); });
      const step = cdiv(evalAt(z), den);
      move = Math.max(move, cabs(step));
      return csub(z, step);
    });
    if (move < 1e-13) break;
  }
  return roots.map(z => C(Math.abs(z.re) < 1e-12 ? 0 : z.re, Math.abs(z.im) < 1e-12 ? 0 : z.im));
}

// ------------------------------------------------------------------------------------- convolution
/** Linear convolution, direct or through the FFT for long signals. */
export function convolve(a, b) {
  const na = a.length, nb = b.length;
  if (!na || !nb) return new Float64Array(0);
  const n = na + nb - 1;
  if (na * nb <= 100000) {
    const y = new Float64Array(n);
    for (let i = 0; i < na; i++) { const ai = a[i]; if (ai) for (let j = 0; j < nb; j++) y[i + j] += ai * b[j]; }
    return y;
  }
  const m = nextPow2(n);
  const A = fft(pad(a, m)), B = fft(pad(b, m));
  const re = new Float64Array(m), im = new Float64Array(m);
  for (let k = 0; k < m; k++) { re[k] = A.re[k] * B.re[k] - A.im[k] * B.im[k]; im[k] = A.re[k] * B.im[k] + A.im[k] * B.re[k]; }
  return fft(re, im, true).re.slice(0, n);
}
export const pad = (x, m) => { const y = new Float64Array(m); y.set(x.length > m ? x.slice(0, m) : x); return y; };

// -------------------------------------------------------------------------------------- analytic
/** Analytic signal x + i·H{x} through the FFT. */
export function hilbert(x) {
  const n = x.length;
  const X = fft(x);
  const h = new Float64Array(n);
  if (n > 0) h[0] = 1;
  if (n % 2 === 0) { h[n / 2] = 1; for (let k = 1; k < n / 2; k++) h[k] = 2; } else for (let k = 1; k < (n + 1) / 2; k++) h[k] = 2;
  for (let k = 0; k < n; k++) { X.re[k] *= h[k]; X.im[k] *= h[k]; }
  return fft(X.re, X.im, true);
}

export function unwrap(ph) {
  const out = Float64Array.from(ph);
  let off = 0;
  for (let i = 1; i < out.length; i++) {
    const d = ph[i] - ph[i - 1];
    if (d > Math.PI) off -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
    else if (d < -Math.PI) off += 2 * Math.PI * Math.round(-d / (2 * Math.PI));
    out[i] = ph[i] + off;
  }
  return out;
}

/** Parabolic interpolation around a peak at i of y: { delta (−0.5…0.5), value }. */
export function parabolic(y, i) {
  if (i <= 0 || i >= y.length - 1) return { delta: 0, value: y[i] };
  const a = y[i - 1], b = y[i], c = y[i + 1], den = a - 2 * b + c;
  if (den === 0) return { delta: 0, value: b };
  const d = 0.5 * (a - c) / den;
  return { delta: d, value: b - 0.25 * (a - c) * d };
}

// ------------------------------------------------------------------------------------ random
/** mulberry32: a small seeded generator of numbers in [0, 1). The state is an integer. */
export function rng(state) {
  let s = state >>> 0;
  return {
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    get state() { return s; },
  };
}
