/**
 * The signal blocks of Logic Studio (signal theory), loaded by the engine in each user's worker (and
 * read in the kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js; the maths is in lib/dsp.js.
 *
 * Signals travel a frame at a time, never a message per sample (the engine allows 10000 runs every
 * 10 s by default):
 *   signal   { fs, t0, samples: [...], im?: [...] }   fs in Hz, t0 = time of the first sample (s),
 *                                                     im = imaginary part of a complex signal
 *   spectrum { kind: 'spectrum', fs, n, df, sided, f, mag, db, phase, re, im, … }
 *   psd      { kind: 'psd', fs, df, f, psd, db, scaling }
 *   response { kind: 'response', fs, f, mag, db, phase (degrees), groupDelay (s) }
 * A plain list of numbers is a signal too, at the fs of the block's setting «fs delle liste».
 * The longest signal is the engine's limit signalSamples (b.limits, 65536 by default).
 * Error messages are Italian, like the engine's.
 */
import * as D from './lib/dsp.js';

const L = (en, it) => ({ en, it });
const O = (value, en, it) => ({ value, label: L(en, it) });
const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : Number(String(v ?? '').replace(',', '.')));
const isNum = v => typeof v === 'number' && Number.isFinite(v);
/** A number, or a text that is one («2,5» too). */
const numLike = v => isNum(v) || (typeof v === 'string' && v.trim() !== '' && isNum(num(v)));
const cfg = (b, key, d) => { const v = b.config[key]; return v === undefined || v === null || v === '' ? d : v; };
const cnum = (b, key, d) => { const v = num(cfg(b, key, d)); return Number.isFinite(v) ? v : d; };
const DB_FLOOR = -300;
const db20 = x => Math.max(DB_FLOOR, 20 * Math.log10(Math.abs(x)));
const db10 = x => Math.max(DB_FLOOR, 10 * Math.log10(Math.abs(x)));
/** The largest |x| of a long array (no spread: it would overflow the call stack). */
const peakAbs = x => { let m = 0; for (const v of x) { const a = Math.abs(v); if (a > m) m = a; } return m; };
const round12 = x => (Number.isFinite(x) ? Number(x.toPrecision(12)) : x);

// ------------------------------------------------------------------------------------ signals in/out
const DEFAULT_MAX = 65536;
const maxN = b => { const n = Number(b.limits?.signalSamples); return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX; };
function checkN(n, b) {
  if (n > maxN(b)) throw new Error(`Segnale troppo lungo: ${n} campioni, al massimo ${maxN(b)} (Pannello di controllo → Logic Studio → Limiti)`);
}
const listFs = b => { const v = cnum(b, 'listFs', 1000); return v > 0 ? v : 1000; };

function toNums(list, what) {
  const out = new Float64Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const v = typeof list[i] === 'number' ? list[i] : num(list[i]);
    if (!Number.isFinite(v)) throw new Error(`${what}: il valore ${i + 1} non è un numero`);
    out[i] = v;
  }
  return out;
}

const isSignalObj = v => v !== null && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.samples);
const isFreqObj = v => v !== null && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.f);

/** A signal from a port: { fs, t0, x: Float64Array, im: Float64Array | null }. */
function sigIn(v, b, what = 'Il segnale') {
  if (v === undefined || v === null) throw new Error(`${what} manca`);
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { throw new Error(`${what} deve essere una lista di numeri o un oggetto { fs, samples }`); } }
  let fs, t0 = 0, x, im = null;
  if (Array.isArray(v)) { fs = listFs(b); x = toNums(v, what); }
  else if (isSignalObj(v)) {
    fs = num(v.fs);
    if (!(fs > 0)) throw new Error(`${what} ha una frequenza di campionamento (fs) non valida`);
    t0 = isNum(num(v.t0)) ? num(v.t0) : 0;
    x = toNums(v.samples, what);
    if (Array.isArray(v.im)) {
      im = toNums(v.im, what);
      if (im.length !== x.length) throw new Error(`${what} ha samples e im di lunghezze diverse`);
    }
  } else throw new Error(`${what} deve essere una lista di numeri o un oggetto { fs, samples }`);
  checkN(x.length, b);
  return { fs, t0, x, im };
}

/** A signal to send. */
function sigOut(fs, x, t0 = 0, im = null) {
  const s = { fs, t0: round12(t0), samples: Array.from(x) };
  if (im) s.im = Array.from(im);
  return s;
}

/** The same shape as what came in: a number, a list, or a signal. */
function sameShape(v, fs, x, t0) {
  if (Array.isArray(v)) return Array.from(x);
  return sigOut(fs, x, t0);
}

const SIG_IN = { name: 'signal', type: 'any', label: L('signal', 'segnale') };
const SIG_OUT = { name: 'signal', type: 'object', label: L('signal', 'segnale') };
const RESET = { name: 'reset', type: 'pulse', label: L('reset', 'azzera'), hidden: true };

const F_LISTFS = { key: 'listFs', type: 'number', default: 1000, min: 0.000001, label: L('fs of plain lists (Hz)', 'fs delle liste semplici (Hz)') };
const F_FS = { key: 'fs', type: 'number', default: 1000, min: 0.000001, label: L('Sampling rate fs (Hz)', 'Frequenza di campionamento fs (Hz)') };
const F_N = { key: 'samples', type: 'number', default: 1000, min: 1, label: L('Samples N', 'Campioni N') };
const WIN_OPTS = [
  O('rect', 'Rectangular (none)', 'Rettangolare (nessuna)'), O('hann', 'Hann', 'Hann'), O('hamming', 'Hamming', 'Hamming'),
  O('blackman', 'Blackman', 'Blackman'), O('blackmanHarris', 'Blackman-Harris', 'Blackman-Harris'), O('flattop', 'Flat-top', 'Flat-top'),
  O('bartlett', 'Bartlett (triangular)', 'Bartlett (triangolare)'), O('kaiser', 'Kaiser', 'Kaiser'), O('tukey', 'Tukey', 'Tukey'),
];
const F_WINDOW = d => ({ key: 'window', type: 'select', default: d, options: WIN_OPTS, label: L('Window', 'Finestra') });
const F_BETA = { key: 'beta', type: 'number', default: 8.6, min: 0, max: 50, label: L('Kaiser β', 'β di Kaiser'), when: { window: 'kaiser' } };
const F_ALPHA = { key: 'alpha', type: 'number', default: 0.5, min: 0, max: 1, label: L('Tukey α (tapered part)', 'α di Tukey (parte che scende)'), when: { window: 'tukey' } };
const winOf = (b, n, periodic = true) => D.windowOf(cfg(b, 'window', 'rect'), n, { periodic, beta: cnum(b, 'beta', 8.6), alpha: cnum(b, 'alpha', 0.5) });

// ---------------------------------------------------------------------------------------- generators
const GEN_IN = { name: 'generate', type: 'pulse', label: L('generate', 'genera') };
const F_CONTINUE = { key: 'continue', type: 'checkbox', default: true, label: L('Time goes on (each frame after the last)', 'Il tempo continua (ogni finestra dopo l\'ultima)') };

/**
 * A generator: sends a frame at the start (when «generate» is not linked) or at each pulse on it.
 * When «generate» is not linked, a value on another input also sends a new frame.
 * make(inputs, b, { fs, n, t0, m }) → samples.
 */
function generator(def, make) {
  const emit = (inputs, b) => {
    const fs = cnum(b, 'fs', 1000), n = Math.round(cnum(b, 'samples', 1000));
    if (!(fs > 0)) throw new Error('La frequenza di campionamento deve essere più di 0');
    if (!(n >= 1)) throw new Error('Serve almeno un campione');
    checkN(n, b);
    const m = b.memory();
    const t0 = b.config.continue === false ? 0 : (m.t ?? 0);
    const x = make(inputs, b, { fs, n, t0, m });
    m.t = t0 + n / fs;
    return { signal: sigOut(fs, x, t0) };
  };
  return {
    ...def, version: 1, category: 'signal',
    inputs: [GEN_IN, ...(def.inputs ?? [])],
    outputs: [SIG_OUT],
    config: [...def.config, F_FS, F_N, F_CONTINUE],
    start(b) {
      b.memory().t = 0;
      if (!b.linked('generate')) { const out = emit({}, b); b.send('signal', out.signal); }
    },
    run(inputs, b) {
      if (b.trigger === 'generate' || !b.linked('generate')) return emit(inputs, b);
      return undefined;
    },
  };
}

const frac = x => x - Math.floor(x);
const WAVES = {
  sine: u => Math.sin(2 * Math.PI * u),
  square: (u, d) => (u < d ? 1 : -1),
  triangle: u => (u < 0.25 ? 4 * u : u < 0.75 ? 2 - 4 * u : 4 * u - 4),
  sawtooth: u => (u < 0.5 ? 2 * u : 2 * u - 2),
  pulse: (u, d) => (u < d ? 1 : 0),
};

/** Standard normal numbers from a seeded generator (Box–Muller). */
function gaussOf(r) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = r.next();
    const v = r.next(), mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}
const PINK_SCALE = 1 / 3.04;      // Paul Kellet's filter on unit white noise: std ≈ 3.04
const BROWN_R = 0.998;            // leaky integrator: std = 1 / sqrt(1 − r²)

// ------------------------------------------------------------------------------------ filter helpers
/** Filter state kept between frames: a new design (key) or a pulse on «reset» starts from zero. */
function filterMemory(b, key) {
  const m = b.memory();
  if (m.key !== key || b.trigger === 'reset') { m.key = key; m.state = null; m.sent = false; }
  return m;
}

/** Runs a design (sos or b/a) on a signal, keeping the state unless zero phase. */
function applyFilter(b, m, design, s) {
  const zp = !!b.config.zeroPhase;
  let y;
  if (design.sos) {
    const once = x => D.sosfilt(design.sos, x);
    if (zp) y = D.zeroPhase(once, s.x, 3 * (2 * design.sos.length + 1));
    else { m.state ??= design.sos.map(() => [0, 0]); y = D.sosfilt(design.sos, s.x, m.state); }
  } else {
    const once = x => D.lfilter(design.b, design.a, x);
    if (zp) y = D.zeroPhase(once, s.x, 3 * Math.max(design.b.length, design.a.length));
    else { m.state ??= new Array(Math.max(design.b.length, design.a.length) - 1).fill(0); y = D.lfilter(design.b, design.a, s.x, m.state); }
  }
  return y;
}

const coeffsOf = (design, fs) => (design.sos ? { fs, sos: design.sos, ...D.sos2ba(design.sos) } : { fs, b: [...design.b], a: [...design.a] });
const COEFF_OUT = { name: 'coefficients', type: 'object', label: L('coefficients', 'coefficienti'), hidden: true };
const F_ZEROPHASE = { key: 'zeroPhase', type: 'checkbox', default: false, label: L('Zero phase (forward and backward, filtfilt)', 'Fase zero (avanti e indietro, filtfilt)') };

/**
 * A filter block: design(b, fs) → { sos } or { b, a }; key(b, fs) says when the design changes.
 * At the start it sends its coefficients designed at «fs delle liste», for Risposta in frequenza.
 */
function filterBlock(def, design) {
  const key = (b, fs) => JSON.stringify([fs, b.config]);
  return {
    ...def, version: 1, category: 'signal',
    inputs: [SIG_IN, ...(def.inputs ?? []), RESET],
    outputs: [SIG_OUT, COEFF_OUT, ...(def.outputs ?? [])],
    config: [...def.config, F_LISTFS],
    start(b) {
      try { b.send('coefficients', coeffsOf(design(b, listFs(b), {}), listFs(b))); } catch { /* the error comes with the first signal */ }
    },
    run(inputs, b) {
      if (b.trigger === 'reset') { filterMemory(b, null); return undefined; }
      if (inputs.signal === undefined) return undefined;
      const s = sigIn(inputs.signal, b);
      const m = filterMemory(b, key(b, s.fs) + JSON.stringify(inputs.coefficients ?? null));
      const d = design(b, s.fs, inputs);
      const y = applyFilter(b, m, d, s);
      const out = { signal: sameShape(inputs.signal, s.fs, y, s.t0) };
      if (!m.sent) { out.coefficients = coeffsOf(d, s.fs); m.sent = true; }
      if (def.extra) Object.assign(out, def.extra(b, d, s.fs));
      return out;
    },
  };
}

const BAND_OPTS = [O('lowpass', 'Low-pass', 'Passa-basso'), O('highpass', 'High-pass', 'Passa-alto'), O('bandpass', 'Band-pass', 'Passa-banda'), O('bandstop', 'Band-stop', 'Elimina-banda')];
const F_F1 = { key: 'f1', type: 'number', default: 100, min: 0, label: L('Cutoff frequency (Hz)', 'Frequenza di taglio (Hz)') };
const F_F2 = { key: 'f2', type: 'number', default: 200, min: 0, label: L('Upper frequency (Hz)', 'Frequenza alta (Hz)'), when: { band: ['bandpass', 'bandstop'] } };

/** Coefficients from a port: { sos } or { b, a } or a list (FIR b). */
function designFromPort(v) {
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { throw new Error('I coefficienti non sono JSON valido'); } }
  if (Array.isArray(v)) return { b: [...toNums(v, 'I coefficienti')], a: [1] };
  if (v && typeof v === 'object') {
    if (Array.isArray(v.sos)) {
      const sos = v.sos.map((s, i) => {
        if (!Array.isArray(s) || s.length !== 6) throw new Error(`La sezione ${i + 1} deve avere 6 coefficienti [b0, b1, b2, a0, a1, a2]`);
        const c = [...toNums(s, 'I coefficienti')];
        if (c[3] === 0) throw new Error(`La sezione ${i + 1} ha a0 = 0`);
        return c.map(x => x / c[3]);
      });
      return { sos };
    }
    if (Array.isArray(v.b)) return normBA(v.b, Array.isArray(v.a) ? v.a : [1]);
  }
  throw new Error('I coefficienti devono essere una lista (FIR), { b, a } o { sos }');
}
function normBA(bIn, aIn) {
  const b = [...toNums(bIn, 'I coefficienti b')], a = [...toNums(aIn, 'I coefficienti a')];
  if (!b.length) throw new Error('Serve almeno un coefficiente b');
  if (!a.length || a[0] === 0) throw new Error('Il primo coefficiente a (a0) non può essere 0');
  return { b: b.map(x => x / a[0]), a: a.map(x => x / a[0]) };
}

// ------------------------------------------------------------------------------------- spectrum helpers
const fmtLabel = x => String(Number(x.toPrecision(4)));

function fftSpectrum(s, b) {
  const n0 = s.x.length;
  if (n0 < 2) throw new Error('Servono almeno 2 campioni');
  let size = Math.round(cnum(b, 'size', 0));
  if (!(size > 0)) size = n0;
  if (b.config.pow2) size = D.nextPow2(size);
  checkN(size, b);
  const w = winOf(b, Math.min(n0, size));
  const re = new Float64Array(size), im = new Float64Array(size);
  let sw = 0;
  for (let i = 0; i < Math.min(n0, size); i++) { re[i] = s.x[i] * w[i]; if (s.im) im[i] = s.im[i] * w[i]; sw += w[i]; }
  const X = D.fft(re, im);
  const N = size, df = s.fs / N, scale = cfg(b, 'scale', 'amplitude');
  const sided = s.im ? 'two' : cfg(b, 'sided', 'one');
  const idx = [];
  if (sided === 'one') for (let k = 0; k <= Math.floor(N / 2); k++) idx.push(k);
  else for (let k = -Math.floor(N / 2); k <= Math.ceil(N / 2) - 1; k++) idx.push(k);
  const out = { kind: 'spectrum', fs: s.fs, t0: s.t0, n: N, df, sided, scale, window: cfg(b, 'window', 'rect'), f: [], mag: [], db: [], phase: [], re: [], im: [] };
  for (const k of idx) {
    const j = (k + N) % N;
    const r = X.re[j], ii = X.im[j], a = Math.hypot(r, ii);
    let mag = a;
    if (scale !== 'raw') {
      mag = a / sw;
      if (sided === 'one' && k !== 0 && !(N % 2 === 0 && k === N / 2)) mag *= 2;
      if (scale === 'rms' && k !== 0) mag /= Math.SQRT2;
    }
    out.f.push(round12(k * df)); out.mag.push(mag); out.db.push(db20(mag)); out.phase.push(Math.atan2(ii, r)); out.re.push(r); out.im.push(ii);
  }
  return out;
}

/** Welch: segments of nper with overlap, averaged periodograms. */
function welch(x, fs, b) {
  const n = x.length;
  let nper = Math.round(cnum(b, 'segment', 256));
  if (!(nper >= 2)) throw new Error('Il segmento deve avere almeno 2 campioni');
  nper = Math.min(nper, n);
  const ov = Math.min(99, Math.max(0, cnum(b, 'overlap', 50)));
  const step = Math.max(1, Math.round(nper * (1 - ov / 100)));
  const w = winOf(b, nper);
  const s1 = w.reduce((a, v) => a + v, 0), s2 = w.reduce((a, v) => a + v * v, 0);
  const density = cfg(b, 'scaling', 'density') === 'density';
  const scale = density ? 1 / (fs * s2) : 1 / (s1 * s1);
  const half = Math.floor(nper / 2) + 1;
  const acc = new Float64Array(half);
  let segs = 0;
  const detrend = cfg(b, 'detrend', 'mean') === 'mean';
  for (let start = 0; start + nper <= n; start += step) {
    const seg = x.subarray(start, start + nper);
    const mean = detrend ? seg.reduce((a, v) => a + v, 0) / nper : 0;
    const X = D.fft(Array.from(seg, (v, i) => (v - mean) * w[i]));
    for (let k = 0; k < half; k++) {
      let p = (X.re[k] ** 2 + X.im[k] ** 2) * scale;
      if (k !== 0 && !(nper % 2 === 0 && k === nper / 2)) p *= 2;
      acc[k] += p;
    }
    segs++;
  }
  const df = fs / nper;
  const psd = Array.from(acc, v => v / segs);
  return { kind: 'psd', fs, df, scaling: density ? 'density' : 'spectrum', segments: segs, f: psd.map((_, k) => round12(k * df)), psd, db: psd.map(db10) };
}

// ----------------------------------------------------------------------------------------- the blocks
export const blocks = [
  // --------------------------------------------------------------------------------- generation
  generator({
    type: 'sig.oscillator', icon: 'wave', label: L('Oscillator (waveform generator)', 'Generatore (oscillatore)'),
    inputs: [{ name: 'frequency', type: 'number', label: L('frequency', 'frequenza'), hidden: true }, { name: 'amplitude', type: 'number', label: L('amplitude', 'ampiezza'), hidden: true }],
    config: [
      { key: 'wave', type: 'select', default: 'sine', options: [O('sine', 'Sine', 'Seno'), O('square', 'Square', 'Quadra'), O('triangle', 'Triangle', 'Triangolo'), O('sawtooth', 'Sawtooth', 'Dente di sega'), O('pulse', 'Pulse train (0/1)', 'Treno di impulsi (0/1)')], label: L('Waveform', "Forma d'onda") },
      { key: 'frequency', type: 'number', default: 50, min: 0, label: L('Frequency (Hz)', 'Frequenza (Hz)') },
      { key: 'amplitude', type: 'number', default: 1, label: L('Amplitude', 'Ampiezza') },
      { key: 'phase', type: 'number', default: 0, label: L('Phase (degrees)', 'Fase (gradi)') },
      { key: 'offset', type: 'number', default: 0, label: L('Offset (DC)', 'Offset (continua)') },
      { key: 'duty', type: 'number', default: 50, min: 0, max: 100, label: L('Duty cycle (%)', 'Duty cycle (%)'), when: { wave: ['square', 'pulse'] } },
    ],
  }, (inputs, b, { fs, n, t0 }) => {
    const f = numLike(inputs.frequency) ? num(inputs.frequency) : cnum(b, 'frequency', 50);
    const A = numLike(inputs.amplitude) ? num(inputs.amplitude) : cnum(b, 'amplitude', 1);
    const ph = cnum(b, 'phase', 0) / 360, off = cnum(b, 'offset', 0), duty = Math.min(1, Math.max(0, cnum(b, 'duty', 50) / 100));
    const wave = WAVES[cfg(b, 'wave', 'sine')] ?? WAVES.sine;
    return Float64Array.from({ length: n }, (_, i) => off + A * wave(frac(f * (t0 + i / fs) + ph), duty));
  }),
  generator({
    type: 'sig.noise', icon: 'wave', label: L('Noise (np.random)', 'Rumore (np.random)'),
    config: [
      { key: 'color', type: 'select', default: 'gaussian', options: [O('gaussian', 'White, Gaussian', 'Bianco, gaussiano'), O('uniform', 'White, uniform', 'Bianco, uniforme'), O('pink', 'Pink (1/f)', 'Rosa (1/f)'), O('brown', 'Brown (1/f²)', 'Marrone (1/f²)')], label: L('Kind', 'Tipo') },
      { key: 'amplitude', type: 'number', default: 1, min: 0, label: L('Standard deviation (RMS)', 'Deviazione standard (RMS)') },
      { key: 'mean', type: 'number', default: 0, label: L('Mean (DC)', 'Media (continua)') },
      { key: 'seed', type: 'number', default: 0, min: 0, label: L('Seed (0 = different every time)', 'Seme (0 = ogni volta diverso)') },
    ],
  }, (_inputs, b, { n, m }) => {
    if (m.rng === undefined) { const seed = Math.round(cnum(b, 'seed', 0)); m.rng = seed > 0 ? seed : Math.floor(Math.random() * 4294967296); }
    const r = D.rng(m.rng), gauss = gaussOf(r);
    const sd = cnum(b, 'amplitude', 1), mean = cnum(b, 'mean', 0), color = cfg(b, 'color', 'gaussian');
    m.pink ??= [0, 0, 0, 0, 0, 0, 0]; m.brown ??= 0;
    const p = m.pink;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let v;
      if (color === 'uniform') v = (r.next() * 2 - 1) * Math.sqrt(3);
      else if (color === 'pink') {
        const w = gauss();
        p[0] = 0.99886 * p[0] + w * 0.0555179; p[1] = 0.99332 * p[1] + w * 0.0750759; p[2] = 0.969 * p[2] + w * 0.153852;
        p[3] = 0.8665 * p[3] + w * 0.3104856; p[4] = 0.55 * p[4] + w * 0.5329522; p[5] = -0.7616 * p[5] - w * 0.016898;
        v = (p[0] + p[1] + p[2] + p[3] + p[4] + p[5] + p[6] + w * 0.5362) * PINK_SCALE;
        p[6] = w * 0.115926;
      } else if (color === 'brown') { m.brown = BROWN_R * m.brown + gauss(); v = m.brown * Math.sqrt(1 - BROWN_R * BROWN_R); }
      else v = gauss();
      x[i] = mean + sd * v;
    }
    m.rng = r.state;
    return x;
  }),
  generator({
    type: 'sig.elementary', icon: 'bolt', label: L('Impulse · Step · Ramp', 'Impulso · Gradino · Rampa'),
    config: [
      { key: 'kind', type: 'select', default: 'impulse', options: [O('impulse', 'Impulse δ', 'Impulso δ'), O('step', 'Step u(t)', 'Gradino u(t)'), O('ramp', 'Ramp', 'Rampa'), O('exp', 'Decaying exponential', 'Esponenziale decrescente'), O('rect', 'Rectangle', 'Rettangolo'), O('sinc', 'Sinc', 'Sinc'), O('gauss', 'Gaussian', 'Gaussiana')], label: L('Kind', 'Tipo') },
      { key: 'at', type: 'number', default: 0, label: L('At time (s)', 'Al tempo (s)') },
      { key: 'amplitude', type: 'number', default: 1, label: L('Amplitude', 'Ampiezza') },
      { key: 'width', type: 'number', default: 0.1, min: 0, label: L('Width or time constant τ (s)', 'Larghezza o costante di tempo τ (s)'), when: { kind: ['exp', 'rect', 'sinc', 'gauss'] } },
    ],
  }, (_inputs, b, { fs, n, t0 }) => {
    const kind = cfg(b, 'kind', 'impulse'), at = cnum(b, 'at', 0), A = cnum(b, 'amplitude', 1), w = cnum(b, 'width', 0.1);
    if (['exp', 'rect', 'sinc', 'gauss'].includes(kind) && !(w > 0)) throw new Error('La larghezza deve essere più di 0');
    const k0 = Math.round((at - t0) * fs);
    return Float64Array.from({ length: n }, (_, i) => {
      const t = t0 + i / fs - at;
      switch (kind) {
        case 'impulse': return i === k0 ? A : 0;
        case 'step': return i >= k0 ? A : 0;
        case 'ramp': return i >= k0 ? A * t : 0;
        case 'exp': return i >= k0 ? A * Math.exp(-t / w) : 0;
        case 'rect': return Math.abs(t) <= w / 2 ? A : 0;
        case 'sinc': return A * D.sinc(t / w);
        case 'gauss': return A * Math.exp(-0.5 * (t / w) ** 2);
        default: return 0;
      }
    });
  }),
  generator({
    type: 'sig.chirp', icon: 'wave', label: L('Chirp (scipy.signal.chirp)', 'Chirp (scipy.signal.chirp)'),
    config: [
      { key: 'f0', type: 'number', default: 10, min: 0, label: L('Start frequency f₀ (Hz)', 'Frequenza iniziale f₀ (Hz)') },
      { key: 'f1', type: 'number', default: 200, min: 0, label: L('End frequency f₁ (Hz)', 'Frequenza finale f₁ (Hz)') },
      { key: 'method', type: 'select', default: 'linear', options: [O('linear', 'Linear', 'Lineare'), O('log', 'Logarithmic', 'Logaritmico')], label: L('Sweep', 'Andamento') },
      { key: 'amplitude', type: 'number', default: 1, label: L('Amplitude', 'Ampiezza') },
    ],
  }, (_inputs, b, { fs, n }) => {
    const f0 = cnum(b, 'f0', 10), f1 = cnum(b, 'f1', 200), A = cnum(b, 'amplitude', 1), T = n / fs;
    const log = cfg(b, 'method', 'linear') === 'log';
    if (log && !(f0 > 0 && f1 > 0)) throw new Error('Con l\'andamento logaritmico f₀ e f₁ devono essere più di 0');
    if (log && f0 === f1) return Float64Array.from({ length: n }, (_, i) => A * Math.cos(2 * Math.PI * f0 * i / fs));
    const k = log ? Math.log(f1 / f0) / T : 0;
    return Float64Array.from({ length: n }, (_, i) => {
      const t = i / fs;
      const ph = log ? f0 * (Math.exp(k * t) - 1) / k : f0 * t + (f1 - f0) * t * t / (2 * T);
      return A * Math.cos(2 * Math.PI * ph);
    });
  }),

  // ---------------------------------------------------------------------------- signal ↔ data
  {
    type: 'sig.fromList', version: 1, category: 'signal', icon: 'list', label: L('Signal from list', 'Segnale da lista'),
    inputs: [{ name: 'samples', type: 'list', label: L('samples', 'campioni') }, { name: 'im', type: 'list', label: L('imaginary part', 'parte immaginaria'), hidden: true }, { name: 'fs', type: 'number', label: L('fs', 'fs'), hidden: true }],
    outputs: [SIG_OUT],
    config: [F_FS, { key: 't0', type: 'number', default: 0, label: L('Time of the first sample t₀ (s)', 'Tempo del primo campione t₀ (s)') }],
    run(inputs, b) {
      if (inputs.samples === undefined) return undefined;
      const fs = inputs.fs !== undefined && inputs.fs !== null && num(inputs.fs) > 0 ? num(inputs.fs) : cnum(b, 'fs', 1000);
      if (!(fs > 0)) throw new Error('La frequenza di campionamento deve essere più di 0');
      if (!Array.isArray(inputs.samples)) throw new Error('I campioni devono essere una lista di numeri');
      const x = toNums(inputs.samples, 'I campioni');
      checkN(x.length, b);
      let im = null;
      if (inputs.im !== undefined) {
        if (!Array.isArray(inputs.im)) throw new Error('La parte immaginaria deve essere una lista di numeri');
        im = toNums(inputs.im, 'La parte immaginaria');
        if (im.length !== x.length) throw new Error('La parte immaginaria deve avere tanti valori quanti i campioni');
      }
      return { signal: sigOut(fs, x, cnum(b, 't0', 0), im) };
    },
  },
  {
    type: 'sig.info', version: 1, category: 'signal', icon: 'braces', label: L('Signal parts', 'Scomponi segnale'),
    inputs: [SIG_IN],
    outputs: [
      { name: 'samples', type: 'list', label: L('samples', 'campioni') }, { name: 'fs', type: 'number', label: L('fs (Hz)', 'fs (Hz)') },
      { name: 'n', type: 'number', label: L('N', 'N') }, { name: 'duration', type: 'number', label: L('duration (s)', 'durata (s)'), hidden: true },
      { name: 't0', type: 'number', label: L('t₀ (s)', 't₀ (s)'), hidden: true }, { name: 'times', type: 'list', label: L('times (s)', 'tempi (s)'), hidden: true },
      { name: 'im', type: 'list', label: L('imaginary part', 'parte immaginaria'), hidden: true },
    ],
    config: [F_LISTFS],
    run({ signal }, b) {
      const s = sigIn(signal, b);
      const n = s.x.length;
      return { samples: Array.from(s.x), fs: s.fs, n, duration: round12(n / s.fs), t0: s.t0, times: Array.from({ length: n }, (_, i) => round12(s.t0 + i / s.fs)), im: s.im ? Array.from(s.im) : [] };
    },
  },
  {
    type: 'sig.buffer', version: 1, category: 'signal', icon: 'wait', label: L('Buffer (samples → frames)', 'Buffer (campioni → finestre)'),
    inputs: [{ name: 'value', type: 'any', label: L('sample(s)', 'campione/i') }, RESET],
    outputs: [SIG_OUT, { name: 'waiting', type: 'number', label: L('samples waiting', 'campioni in attesa'), hidden: true }],
    config: [
      { key: 'size', type: 'number', default: 256, min: 1, label: L('Frame size N', 'Lunghezza finestra N') },
      { key: 'hop', type: 'number', default: 0, min: 0, label: L('Hop (0 = N, no overlap)', 'Passo (0 = N, senza sovrapposizione)') },
      { key: 'fs', type: 'number', default: 10, min: 0.000001, label: L('fs of single values (Hz)', 'fs dei valori singoli (Hz)') },
    ],
    run({ value }, b) {
      const m = b.memory();
      if (b.trigger === 'reset' || !m.buf) { m.buf = []; m.start = 0; m.fs = null; }
      if (b.trigger === 'reset' || value === undefined) return { waiting: m.buf.length };
      const size = Math.round(cnum(b, 'size', 256));
      if (!(size >= 1)) throw new Error('La finestra deve avere almeno un campione');
      checkN(size, b);
      let hop = Math.round(cnum(b, 'hop', 0));
      if (!(hop >= 1) || hop > size) hop = size;
      let fs = cnum(b, 'fs', 10), add;
      if (numLike(value)) add = [num(value)];
      else if (Array.isArray(value)) add = Array.from(toNums(value, 'I campioni'));
      else if (isSignalObj(value)) { const s = sigIn(value, b); fs = s.fs; add = Array.from(s.x); }
      else throw new Error('Il valore deve essere un numero, una lista di numeri o un segnale');
      if (m.fs !== null && m.fs !== fs) { m.buf = []; m.start = 0; }
      m.fs = fs;
      m.buf.push(...add);
      while (m.buf.length >= size) {
        b.send('signal', sigOut(fs, m.buf.slice(0, size), m.start / fs));
        m.buf.splice(0, hop);
        m.start += hop;
      }
      return { waiting: m.buf.length };
    },
  },
  {
    type: 'sig.play', version: 1, category: 'signal', icon: 'play', label: L('Play samples', 'Riproduci campioni'),
    inputs: [SIG_IN, { name: 'stop', type: 'pulse', label: L('stop', 'ferma'), hidden: true }],
    outputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }, { name: 'time', type: 'number', label: L('time (s)', 'tempo (s)'), hidden: true }, { name: 'done', type: 'pulse', label: L('done', 'finito') }],
    config: [
      { key: 'rate', type: 'number', default: 10, min: 0, max: 100, label: L('Samples per second (0 = fs of the signal)', 'Campioni al secondo (0 = fs del segnale)') },
      { key: 'loop', type: 'checkbox', default: false, label: L('Start again at the end', 'Ricomincia alla fine') },
      F_LISTFS,
    ],
    run(inputs, b) {
      const m = b.memory();
      if (m.timer !== undefined) { b.clearTimer(m.timer); m.timer = undefined; }
      if (b.trigger === 'stop' || inputs.signal === undefined) return undefined;
      const s = sigIn(inputs.signal, b);
      if (!s.x.length) return { done: true };
      const rate = cnum(b, 'rate', 10) > 0 ? cnum(b, 'rate', 10) : s.fs;
      if (rate > 100) throw new Error(`Troppo veloce: ${rate} campioni al secondo, al massimo 100 (imposta «Campioni al secondo»)`);
      let i = 0;
      const tick = () => {
        b.send('value', s.x[i]); b.send('time', round12(s.t0 + i / s.fs));
        i++;
        if (i >= s.x.length) {
          if (b.config.loop) i = 0;
          else { b.clearTimer(m.timer); m.timer = undefined; b.send('done', true); }
        }
      };
      tick();
      if (m.timer === undefined && i < s.x.length) m.timer = b.setInterval(tick, 1000 / rate);
      return undefined;
    },
  },
  {
    type: 'sig.toChart', version: 1, category: 'signal', icon: 'chart', label: L('To chart', 'Per grafico'),
    inputs: [{ name: 'data', type: 'any', label: L('signal or spectrum', 'segnale o spettro') }],
    outputs: [{ name: 'chart', type: 'list', label: L('chart data', 'dati del grafico') }],
    grow: { inputs: { type: 'any', max: 7, name: 'user', label: L('series', 'serie') } },
    config: [
      { key: 'show', type: 'select', default: 'auto', options: [O('auto', 'Automatic', 'Automatico'), O('value', 'Value (real part)', 'Valore (parte reale)'), O('abs', 'Absolute value', 'Valore assoluto'), O('imag', 'Imaginary part', 'Parte immaginaria'), O('db', 'Decibel', 'Decibel'), O('phase', 'Phase', 'Fase')], label: L('Show', 'Mostra') },
      { key: 'xAxis', type: 'select', default: 'auto', options: [O('auto', 'Time or frequency', 'Tempo o frequenza'), O('index', 'Sample number', 'Numero del campione')], label: L('Horizontal axis', 'Asse orizzontale') },
      { key: 'maxPoints', type: 'number', default: 2000, min: 10, max: 100000, label: L('Points per series, at most', 'Punti per serie, al massimo') },
      { key: 'name', type: 'text', default: '', label: L('Name of the first series', 'Nome della prima serie') },
      F_LISTFS,
    ],
    run(inputs, b) {
      const show = cfg(b, 'show', 'auto'), byIndex = cfg(b, 'xAxis', 'auto') === 'index', maxP = Math.max(10, Math.round(cnum(b, 'maxPoints', 2000)));
      const items = [[cfg(b, 'name', '') || (b.lang === 'it' ? 'segnale' : 'signal'), inputs.data], ...b.added.inputs.map(p => [p.name, p.value])];
      const series = [];
      for (const [name, v] of items) {
        if (v === undefined || v === null) continue;
        let xs, ys;
        if (isFreqObj(v)) {
          const pick = show === 'auto' ? (v.kind === 'response' ? 'db' : v.kind === 'psd' ? 'psd' : 'mag') : show;
          const src = pick === 'db' ? (v.db ?? (v.psd ?? v.mag).map(v.psd ? db10 : db20))
            : pick === 'phase' ? v.phase
              : pick === 'imag' ? v.im
                : v.kind === 'psd' ? v.psd : v.mag;
          if (!Array.isArray(src)) throw new Error(`Lo spettro non ha i valori da mostrare (${pick})`);
          ys = src.map(num); xs = byIndex ? ys.map((_, i) => i) : v.f.map(num);
        } else {
          const s = sigIn(v, b, `«${name}»`);
          const re = s.x, im = s.im;
          ys = Array.from(re, (r, i) => {
            const ii = im ? im[i] : 0;
            switch (show) {
              case 'abs': return Math.hypot(r, ii);
              case 'imag': return ii;
              case 'db': return db20(Math.hypot(r, ii));
              case 'phase': return Math.atan2(ii, r);
              default: return r;
            }
          });
          xs = ys.map((_, i) => (byIndex ? i : round12(s.t0 + i / s.fs)));
        }
        series.push({ name, data: decimate(xs, ys, maxP) });
      }
      return series.length ? { chart: series } : undefined;
    },
  },

  // --------------------------------------------------------------------------- time-domain ops
  {
    type: 'sig.combine', version: 1, category: 'signal', icon: 'merge', label: L('Add · Multiply signals', 'Somma · Prodotto di segnali'),
    inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }],
    outputs: [SIG_OUT],
    grow: { inputs: { type: 'any', max: 16, name: 'letter' } },
    config: [
      { key: 'op', type: 'select', default: 'add', options: [O('add', 'Add a + b + …', 'Somma a + b + …'), O('subtract', 'Subtract a − b − …', 'Sottrai a − b − …'), O('multiply', 'Multiply a · b · …', 'Moltiplica a · b · …'), O('divide', 'Divide a / b / …', 'Dividi a / b / …'), O('mean', 'Mean', 'Media'), O('min', 'Minimum', 'Minimo'), O('max', 'Maximum', 'Massimo')], label: L('Operation', 'Operazione') },
      F_LISTFS,
    ],
    run(inputs, b) {
      const vals = [inputs.a, inputs.b, ...b.added.inputs.map(p => p.value)].filter(v => v !== undefined && v !== null);
      const ops = vals.map(v => (numLike(v) ? num(v) : sigIn(v, b)));
      const sigs = ops.filter(o => typeof o !== 'number');
      if (!sigs.length) throw new Error('Serve almeno un segnale (gli altri possono essere numeri)');
      const fs = sigs[0].fs;
      for (const s of sigs) if (s.fs !== fs) throw new Error(`I segnali hanno fs diverse (${fs} e ${s.fs} Hz): usa prima Ricampiona`);
      const n = Math.min(...sigs.map(s => s.x.length));
      const at = (o, i) => (typeof o === 'number' ? o : o.x[i]);
      const op = cfg(b, 'op', 'add');
      const y = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let acc = at(ops[0], i);
        for (let k = 1; k < ops.length; k++) {
          const v = at(ops[k], i);
          switch (op) {
            case 'subtract': acc -= v; break;
            case 'multiply': acc *= v; break;
            case 'divide': if (v === 0) throw new Error(`Divisione per zero (campione ${i + 1})`); acc /= v; break;
            case 'min': acc = Math.min(acc, v); break;
            case 'max': acc = Math.max(acc, v); break;
            default: acc += v;
          }
        }
        y[i] = op === 'mean' ? acc / ops.length : acc;
      }
      return { signal: sigOut(fs, y, sigs[0].t0) };
    },
  },
  {
    type: 'sig.gain', version: 1, category: 'signal', icon: 'slider', label: L('Gain · Offset', 'Guadagno · Offset'),
    inputs: [SIG_IN],
    outputs: [SIG_OUT],
    config: [
      { key: 'gain', type: 'number', default: 1, label: L('Gain', 'Guadagno') },
      { key: 'unit', type: 'select', default: 'linear', options: [O('linear', 'Times (×)', 'Volte (×)'), O('db', 'Decibel (dB)', 'Decibel (dB)')], label: L('Gain in', 'Guadagno in') },
      { key: 'offset', type: 'number', default: 0, label: L('Offset (added at the end)', 'Offset (aggiunto alla fine)') },
      { key: 'removeMean', type: 'checkbox', default: false, label: L('Remove the mean (DC) first', 'Togli prima la media (continua)') },
      { key: 'normalize', type: 'select', default: 'none', options: [O('none', 'No', 'No'), O('peak', 'Peak to the level', 'Picco al livello'), O('rms', 'RMS to the level', 'RMS al livello')], label: L('Normalize', 'Normalizza') },
      { key: 'level', type: 'number', default: 1, min: 0, label: L('Level', 'Livello'), when: { normalize: ['peak', 'rms'] } },
      { key: 'invert', type: 'checkbox', default: false, label: L('Invert (× −1)', 'Inverti (× −1)') },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b);
      let x = Float64Array.from(s.x);
      if (b.config.removeMean && x.length) { const mean = x.reduce((a, v) => a + v, 0) / x.length; x = x.map(v => v - mean); }
      const norm = cfg(b, 'normalize', 'none');
      if (norm !== 'none' && x.length) {
        const ref = norm === 'peak' ? peakAbs(x) : Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
        if (ref > 0) { const k = cnum(b, 'level', 1) / ref; x = x.map(v => v * k); }
      }
      const g0 = cnum(b, 'gain', 1), g = (cfg(b, 'unit', 'linear') === 'db' ? 10 ** (g0 / 20) : g0) * (b.config.invert ? -1 : 1), off = cnum(b, 'offset', 0);
      return { signal: sameShape(signal, s.fs, x.map(v => v * g + off), s.t0) };
    },
  },
  {
    type: 'sig.window', version: 1, category: 'signal', icon: 'wave', label: L('Window (scipy.signal.get_window)', 'Finestra (scipy.signal.get_window)'),
    inputs: [SIG_IN],
    outputs: [SIG_OUT, { name: 'window', type: 'list', label: L('window', 'finestra'), hidden: true }, { name: 'coherentGain', type: 'number', label: L('coherent gain', 'guadagno coerente'), hidden: true }, { name: 'enbw', type: 'number', label: L('ENBW (bins)', 'ENBW (bin)'), hidden: true }],
    config: [F_WINDOW('hann'), F_BETA, F_ALPHA, { key: 'periodic', type: 'checkbox', default: true, label: L('Periodic (for spectra)', 'Periodica (per gli spettri)') }, F_LISTFS],
    run({ signal }, b) {
      const s = sigIn(signal, b), n = s.x.length;
      const w = winOf(b, n, b.config.periodic !== false);
      const s1 = w.reduce((a, v) => a + v, 0), s2 = w.reduce((a, v) => a + v * v, 0);
      return {
        signal: sameShape(signal, s.fs, s.x.map((v, i) => v * w[i]), s.t0), window: w,
        coherentGain: n ? s1 / n : 0, enbw: s1 ? n * s2 / (s1 * s1) : 0,
      };
    },
  },
  {
    type: 'sig.edit', version: 1, category: 'signal', icon: 'split', label: L('Delay · Trim · Zero-padding', 'Ritardo · Taglia · Zero-padding'),
    inputs: [SIG_IN],
    outputs: [SIG_OUT],
    config: [
      { key: 'op', type: 'select', default: 'delay', options: [O('delay', 'Delay (zeros in front, same length)', 'Ritarda (zeri davanti, stessa lunghezza)'), O('shift', 'Circular shift', 'Scorri in cerchio'), O('trim', 'Trim (from … to …)', 'Taglia (da … a …)'), O('pad', 'Zero-padding to a length', 'Zero-padding a una lunghezza'), O('reverse', 'Reverse time x(−t)', 'Inverti il tempo x(−t)'), O('repeat', 'Repeat', 'Ripeti')], label: L('Operation', 'Operazione') },
      { key: 'seconds', type: 'number', default: 0.1, label: L('Seconds (negative = ahead)', 'Secondi (negativi = in anticipo)'), when: { op: ['delay', 'shift'] } },
      { key: 'from', type: 'number', default: 0, min: 0, label: L('From (s from the start)', "Da (s dall'inizio)"), when: { op: 'trim' } },
      { key: 'to', type: 'number', default: 0, min: 0, label: L('To (s, 0 = the end)', 'A (s, 0 = la fine)'), when: { op: 'trim' } },
      { key: 'length', type: 'number', default: 0, min: 0, label: L('Length (0 = next power of 2)', 'Lunghezza (0 = potenza di 2 successiva)'), when: { op: 'pad' } },
      { key: 'times', type: 'number', default: 2, min: 1, label: L('Times', 'Volte'), when: { op: 'repeat' } },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b), n = s.x.length, x = s.x;
      let y, t0 = s.t0;
      switch (cfg(b, 'op', 'delay')) {
        case 'delay': {
          const k = Math.round(cnum(b, 'seconds', 0.1) * s.fs);
          y = new Float64Array(n);
          for (let i = 0; i < n; i++) { const j = i - k; if (j >= 0 && j < n) y[i] = x[j]; }
          break;
        }
        case 'shift': {
          const k = n ? ((Math.round(cnum(b, 'seconds', 0.1) * s.fs) % n) + n) % n : 0;
          y = new Float64Array(n);
          for (let i = 0; i < n; i++) y[(i + k) % n] = x[i];
          break;
        }
        case 'trim': {
          const a = Math.max(0, Math.round(cnum(b, 'from', 0) * s.fs)), e = cnum(b, 'to', 0) > 0 ? Math.min(n, Math.round(cnum(b, 'to', 0) * s.fs)) : n;
          if (e <= a) throw new Error('«A» deve venire dopo «Da»');
          y = x.slice(a, e); t0 = s.t0 + a / s.fs;
          break;
        }
        case 'pad': {
          const len = Math.round(cnum(b, 'length', 0)) > 0 ? Math.round(cnum(b, 'length', 0)) : D.nextPow2(n);
          checkN(len, b);
          y = D.pad(x, len);
          break;
        }
        case 'reverse': y = Float64Array.from(x).reverse(); break;
        case 'repeat': {
          const t = Math.max(1, Math.round(cnum(b, 'times', 2)));
          checkN(n * t, b);
          y = new Float64Array(n * t);
          for (let k = 0; k < t; k++) y.set(x, k * n);
          break;
        }
        default: throw new Error(`Operazione sconosciuta: ${b.config.op}`);
      }
      return { signal: sameShape(signal, s.fs, y, t0) };
    },
  },
  {
    type: 'sig.resample', version: 1, category: 'signal', icon: 'sync', label: L('Resample', 'Ricampiona (resample)'),
    inputs: [SIG_IN],
    outputs: [SIG_OUT],
    config: [
      { key: 'fsOut', type: 'number', default: 500, min: 0.000001, label: L('New fs (Hz)', 'Nuova fs (Hz)') },
      { key: 'method', type: 'select', default: 'sinc', options: [O('sinc', 'Band-limited (windowed sinc, anti-aliasing)', 'A banda limitata (sinc a finestra, anti-aliasing)'), O('linear', 'Linear interpolation', 'Interpolazione lineare'), O('hold', 'Sample and hold', 'Mantieni (sample and hold)')], label: L('Method', 'Metodo') },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b), fo = cnum(b, 'fsOut', 500);
      if (!(fo > 0)) throw new Error('La nuova fs deve essere più di 0');
      const n = s.x.length, ratio = s.fs / fo, m = Math.floor(n / ratio + 1e-9);
      checkN(m, b);
      const x = s.x, y = new Float64Array(m), method = cfg(b, 'method', 'sinc');
      if (method === 'hold') for (let j = 0; j < m; j++) y[j] = x[Math.min(n - 1, Math.floor(j * ratio + 1e-9))];
      else if (method === 'linear') for (let j = 0; j < m; j++) {
        const u = j * ratio, i = Math.floor(u), f = u - i;
        y[j] = i + 1 < n ? x[i] * (1 - f) + x[i + 1] * f : x[n - 1];
      } else {
        const c = Math.min(1, fo / s.fs), K = Math.ceil(16 / c);
        for (let j = 0; j < m; j++) {
          const u = j * ratio;
          let acc = 0;
          for (let i = Math.max(0, Math.ceil(u - K)); i <= Math.min(n - 1, Math.floor(u + K)); i++) {
            const d = u - i, w = 0.42 + 0.5 * Math.cos(Math.PI * d / K) + 0.08 * Math.cos(2 * Math.PI * d / K);
            acc += x[i] * c * D.sinc(c * d) * w;
          }
          y[j] = acc;
        }
      }
      return { signal: sigOut(fo, y, s.t0) };
    },
  },
  {
    type: 'sig.quantize', version: 1, category: 'signal', icon: 'hash', label: L('Quantize (ADC)', 'Quantizza (ADC)'),
    inputs: [SIG_IN],
    outputs: [SIG_OUT, { name: 'codes', type: 'list', label: L('codes', 'codici'), hidden: true }, { name: 'quantError', type: 'object', label: L('quantization error', 'errore di quantizzazione'), hidden: true }, { name: 'sqnr', type: 'number', label: L('SQNR (dB)', 'SQNR (dB)'), hidden: true }],
    config: [
      { key: 'bits', type: 'number', default: 8, min: 1, max: 32, label: L('Bits', 'Bit') },
      { key: 'min', type: 'number', default: -1, label: L('Range from', 'Intervallo da') },
      { key: 'max', type: 'number', default: 1, label: L('Range to', 'Intervallo a') },
      { key: 'mode', type: 'select', default: 'midrise', options: [O('midrise', 'Mid-rise (no zero level)', 'Mid-rise (senza il livello zero)'), O('midtread', 'Mid-tread (with zero)', 'Mid-tread (con lo zero)')], label: L('Levels', 'Livelli') },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b), bits = Math.round(cnum(b, 'bits', 8)), lo = cnum(b, 'min', -1), hi = cnum(b, 'max', 1);
      if (!(bits >= 1 && bits <= 32)) throw new Error('I bit vanno da 1 a 32');
      if (!(hi > lo)) throw new Error('«Intervallo a» deve essere più grande di «Intervallo da»');
      const levels = 2 ** bits, q = (hi - lo) / levels, mid = cfg(b, 'mode', 'midrise') === 'midtread';
      const codes = [], y = new Float64Array(s.x.length), e = new Float64Array(s.x.length);
      let ps = 0, pe = 0;
      s.x.forEach((v, i) => {
        let code;
        if (mid) {
          const k = Math.round(v / q), kmin = Math.ceil(lo / q), kmax = Math.floor(hi / q);
          const kk = Math.min(kmax, Math.max(kmin, k));
          y[i] = kk * q; code = kk - kmin;
        } else {
          code = Math.min(levels - 1, Math.max(0, Math.floor((v - lo) / q)));
          y[i] = lo + (code + 0.5) * q;
        }
        codes.push(code); e[i] = y[i] - v; ps += v * v; pe += e[i] * e[i];
      });
      return { signal: sameShape(signal, s.fs, y, s.t0), codes, quantError: sigOut(s.fs, e, s.t0), sqnr: pe > 0 ? Math.max(-300, Math.min(300, 10 * Math.log10(ps / pe))) : 300 };
    },
  },
  {
    type: 'sig.nonlinear', version: 1, category: 'signal', icon: 'compare', label: L('Nonlinearity (clip, rectify)', 'Non linearità (clip, raddrizza)'),
    inputs: [SIG_IN],
    outputs: [SIG_OUT],
    config: [
      { key: 'op', type: 'select', default: 'clip', options: [O('clip', 'Clip (hard saturation)', 'Taglia (saturazione netta)'), O('tanh', 'Soft saturation (tanh)', 'Saturazione morbida (tanh)'), O('halfWave', 'Half-wave rectifier', 'Raddrizzatore a semionda'), O('fullWave', 'Full-wave rectifier |x|', 'Raddrizzatore a onda intera |x|'), O('deadzone', 'Dead zone', 'Zona morta'), O('square', 'Square x²', 'Quadrato x²'), O('sign', 'Sign (comparator)', 'Segno (comparatore)')], label: L('Operation', 'Operazione') },
      { key: 'min', type: 'number', default: -0.5, label: L('Minimum', 'Minimo'), when: { op: 'clip' } },
      { key: 'max', type: 'number', default: 0.5, label: L('Maximum', 'Massimo'), when: { op: 'clip' } },
      { key: 'drive', type: 'number', default: 2, min: 0, label: L('Drive', 'Spinta (drive)'), when: { op: 'tanh' } },
      { key: 'threshold', type: 'number', default: 0.1, min: 0, label: L('Threshold', 'Soglia'), when: { op: 'deadzone' } },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b);
      const lo = cnum(b, 'min', -0.5), hi = cnum(b, 'max', 0.5), drive = cnum(b, 'drive', 2), th = cnum(b, 'threshold', 0.1);
      const op = cfg(b, 'op', 'clip');
      if (op === 'clip' && !(hi >= lo)) throw new Error('Il massimo deve essere almeno il minimo');
      const f = {
        clip: v => Math.min(hi, Math.max(lo, v)),
        tanh: v => (drive > 0 ? Math.tanh(drive * v) / Math.tanh(drive) : v),
        halfWave: v => Math.max(0, v),
        fullWave: v => Math.abs(v),
        deadzone: v => (Math.abs(v) <= th ? 0 : v - Math.sign(v) * th),
        square: v => v * v,
        sign: v => Math.sign(v),
      }[op];
      if (!f) throw new Error(`Operazione sconosciuta: ${op}`);
      return { signal: sameShape(signal, s.fs, s.x.map(f), s.t0) };
    },
  },

  // ------------------------------------------------------------------------------------ frequency
  {
    type: 'sig.fft', version: 1, category: 'signal', icon: 'chart', label: L('FFT (np.fft.fft)', 'FFT (np.fft.fft)'),
    inputs: [SIG_IN],
    outputs: [{ name: 'spectrum', type: 'object', label: L('spectrum', 'spettro') }, { name: 'magnitude', type: 'list', label: L('magnitude', 'modulo'), hidden: true }, { name: 'frequencies', type: 'list', label: L('frequencies (Hz)', 'frequenze (Hz)'), hidden: true }],
    config: [
      F_WINDOW('rect'), F_BETA, F_ALPHA,
      { key: 'sided', type: 'select', default: 'one', options: [O('one', 'One-sided (0 … fs/2)', 'Monolatero (0 … fs/2)'), O('two', 'Two-sided (−fs/2 … fs/2)', 'Bilatero (−fs/2 … fs/2)')], label: L('Spectrum', 'Spettro') },
      { key: 'scale', type: 'select', default: 'amplitude', options: [O('amplitude', 'Amplitude (a sine of amplitude A reads A)', 'Ampiezza (un seno di ampiezza A dà A)'), O('rms', 'RMS', 'Efficace (RMS)'), O('raw', 'Raw |X[k]|', 'Grezzo |X[k]|')], label: L('Scale', 'Scala') },
      { key: 'size', type: 'number', default: 0, min: 0, label: L('Points (0 = N; more = zero-padding)', 'Punti (0 = N; di più = zero-padding)') },
      { key: 'pow2', type: 'checkbox', default: false, label: L('Round up to a power of 2', 'Arrotonda a una potenza di 2') },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const sp = fftSpectrum(sigIn(signal, b), b);
      return { spectrum: sp, magnitude: sp.mag, frequencies: sp.f };
    },
  },
  {
    type: 'sig.ifft', version: 1, category: 'signal', icon: 'chart', label: L('IFFT (np.fft.ifft)', 'IFFT (np.fft.ifft)'),
    inputs: [{ name: 'spectrum', type: 'object', label: L('spectrum', 'spettro') }],
    outputs: [SIG_OUT],
    config: [{ key: 'real', type: 'checkbox', default: true, label: L('Real signal (drop the imaginary part)', 'Segnale reale (togli la parte immaginaria)') }],
    run({ spectrum: sp }, b) {
      if (!isFreqObj(sp) || !Array.isArray(sp.re) || !Array.isArray(sp.im)) throw new Error('Serve uno spettro di FFT (con re e im)');
      const N = Math.round(num(sp.n)), fs = num(sp.fs);
      if (!(N >= 1) || !(fs > 0)) throw new Error('Lo spettro non ha n e fs validi');
      checkN(N, b);
      const re = new Float64Array(N), im = new Float64Array(N);
      const k0 = sp.sided === 'two' ? -Math.floor(N / 2) : 0;
      sp.re.forEach((r, i) => { const j = ((k0 + i) % N + N) % N; re[j] = num(r); im[j] = num(sp.im[i]); });
      if (sp.sided !== 'two') for (let k = 1; k < N; k++) if (k > N / 2) { re[k] = re[N - k]; im[k] = -im[N - k]; }
      const X = D.fft(re, im, true);
      const t0 = isNum(num(sp.t0)) ? num(sp.t0) : 0;
      return { signal: b.config.real === false ? sigOut(fs, X.re, t0, X.im) : sigOut(fs, X.re, t0) };
    },
  },
  {
    type: 'sig.psd', version: 1, category: 'signal', icon: 'chart', label: L('Power spectral density (scipy.signal.welch)', 'Densità spettrale (scipy.signal.welch)'),
    inputs: [SIG_IN],
    outputs: [{ name: 'psd', type: 'object', label: L('PSD', 'PSD') }, { name: 'power', type: 'number', label: L('total power', 'potenza totale'), hidden: true }],
    config: [
      { key: 'segment', type: 'number', default: 256, min: 2, label: L('Segment (samples)', 'Segmento (campioni)') },
      { key: 'overlap', type: 'number', default: 50, min: 0, max: 99, label: L('Overlap (%)', 'Sovrapposizione (%)') },
      F_WINDOW('hann'), F_BETA, F_ALPHA,
      { key: 'scaling', type: 'select', default: 'density', options: [O('density', 'Density (unit²/Hz)', 'Densità (unità²/Hz)'), O('spectrum', 'Power spectrum (unit²)', 'Spettro di potenza (unità²)')], label: L('Scaling', 'Scala') },
      { key: 'detrend', type: 'select', default: 'mean', options: [O('mean', 'Remove the mean of each segment', 'Togli la media di ogni segmento'), O('none', 'No', 'No')], label: L('Detrend', 'Detrend') },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b);
      if (s.x.length < 2) throw new Error('Servono almeno 2 campioni');
      const p = welch(s.x, s.fs, b);
      const power = p.scaling === 'density' ? p.psd.reduce((a, v) => a + v, 0) * p.df : p.psd.reduce((a, v) => a + v, 0);
      return { psd: p, power };
    },
  },
  {
    type: 'sig.spectrogram', version: 1, category: 'signal', icon: 'grid', label: L('Spectrogram (STFT)', 'Spettrogramma (STFT)'),
    inputs: [SIG_IN],
    outputs: [{ name: 'grid', type: 'object', label: L('grid (dB) for Heat map', 'griglia (dB) per Mappa di calore') }, { name: 'times', type: 'list', label: L('times (s)', 'tempi (s)'), hidden: true }, { name: 'frequencies', type: 'list', label: L('frequencies (Hz)', 'frequenze (Hz)'), hidden: true }],
    config: [
      { key: 'segment', type: 'number', default: 256, min: 2, label: L('Segment (samples)', 'Segmento (campioni)') },
      { key: 'overlap', type: 'number', default: 50, min: 0, max: 99, label: L('Overlap (%)', 'Sovrapposizione (%)') },
      F_WINDOW('hann'), F_BETA, F_ALPHA,
      { key: 'range', type: 'number', default: 100, min: 10, max: 300, label: L('Range shown (dB under the maximum)', 'Intervallo mostrato (dB sotto il massimo)') },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b), n = s.x.length;
      let nper = Math.round(cnum(b, 'segment', 256));
      if (!(nper >= 2)) throw new Error('Il segmento deve avere almeno 2 campioni');
      nper = Math.min(nper, n);
      if (nper < 2) throw new Error('Servono almeno 2 campioni');
      const step = Math.max(1, Math.round(nper * (1 - Math.min(99, Math.max(0, cnum(b, 'overlap', 50))) / 100)));
      const frames = Math.floor((n - nper) / step) + 1, bins = Math.floor(nper / 2) + 1;
      if (frames * bins > 4 * maxN(b)) throw new Error(`Spettrogramma troppo grande: ${frames} × ${bins} celle, al massimo ${4 * maxN(b)} (allunga il segmento o riduci la sovrapposizione)`);
      const w = winOf(b, nper), s2 = w.reduce((a, v) => a + v * v, 0);
      const cols = [];
      let top = DB_FLOOR;
      for (let k = 0; k < frames; k++) {
        const seg = Array.from(s.x.subarray(k * step, k * step + nper), (v, i) => v * w[i]);
        const X = D.fft(seg);
        const col = [];
        for (let j = 0; j < bins; j++) { const p = (X.re[j] ** 2 + X.im[j] ** 2) / (s.fs * s2) * (j && !(nper % 2 === 0 && j === nper / 2) ? 2 : 1); const d = db10(p); col.push(d); if (d > top) top = d; }
        cols.push(col);
      }
      const floor = top - cnum(b, 'range', 100);
      const df = s.fs / nper;
      const freqs = Array.from({ length: bins }, (_, j) => round12(j * df));
      const times = Array.from({ length: frames }, (_, k) => round12(s.t0 + (k * step + nper / 2) / s.fs));
      // rows: highest frequency first, so that low frequencies sit at the bottom of the map
      const values = [];
      for (let j = bins - 1; j >= 0; j--) values.push(cols.map(c => Math.round(Math.max(floor, c[j]) * 100) / 100));
      return { grid: { rows: freqs.map(fmtLabel).reverse(), cols: times.map(fmtLabel), values }, times, frequencies: freqs };
    },
  },
  {
    type: 'sig.peaks', version: 1, category: 'signal', icon: 'star', label: L('Peaks (find_peaks)', 'Picchi (find_peaks)'),
    inputs: [{ name: 'data', type: 'any', label: L('spectrum or signal', 'spettro o segnale') }],
    outputs: [{ name: 'peaks', type: 'list', label: L('peaks', 'picchi') }, { name: 'position', type: 'number', label: L('position of the highest (Hz or s)', 'posizione del più alto (Hz o s)') }, { name: 'value', type: 'number', label: L('value of the highest', 'valore del più alto') }],
    config: [
      { key: 'count', type: 'number', default: 5, min: 1, max: 1000, label: L('How many, at most', 'Quanti, al massimo') },
      { key: 'minDb', type: 'number', default: -60, max: 0, label: L('Not lower than (dB under the highest)', 'Non più bassi di (dB sotto il più alto)') },
      { key: 'distance', type: 'number', default: 0, min: 0, label: L('Minimum distance (Hz or s)', 'Distanza minima (Hz o s)') },
      { key: 'skipDC', type: 'checkbox', default: true, label: L('Skip 0 Hz (DC)', 'Salta 0 Hz (continua)') },
      F_LISTFS,
    ],
    run({ data }, b) {
      let pos, val, dbs, power = false, freq = false;
      if (isFreqObj(data)) {
        freq = true; power = data.kind === 'psd';
        val = (power ? data.psd : data.mag ?? (data.db ?? []).map(d => 10 ** (num(d) / 20))).map(num);
        pos = data.f.map(num);
      } else {
        const s = sigIn(data, b, 'Il dato');
        val = Array.from(s.x); pos = val.map((_, i) => round12(s.t0 + i / s.fs));
      }
      if (val.length !== pos.length) throw new Error('Lo spettro ha f e valori di lunghezze diverse');
      dbs = val.map(v => (power ? db10(v) : db20(v)));
      const step = pos.length > 1 ? Math.abs(pos[1] - pos[0]) : 1;
      const cands = [];
      for (let i = 0; i < val.length; i++) {
        if (freq && b.config.skipDC !== false && Math.abs(pos[i]) < step / 2) continue;
        const left = i === 0 ? -Infinity : val[i - 1], right = i === val.length - 1 ? -Infinity : val[i + 1];
        if (val[i] > left && val[i] >= right) {
          const p = freq ? D.parabolic(dbs, i) : { delta: 0 };
          const d = freq ? p.value : dbs[i];
          const v = freq ? (power ? 10 ** (d / 10) : 10 ** (d / 20)) : val[i];
          cands.push({ at: round12(pos[i] + p.delta * step), value: v, db: Math.round(d * 1000) / 1000, index: i });
        }
      }
      if (!cands.length) return { peaks: [] };
      const top = cands.reduce((m, c) => Math.max(m, c.db), -Infinity);
      const minDb = cnum(b, 'minDb', -60), dist = cnum(b, 'distance', 0), count = Math.round(cnum(b, 'count', 5));
      const picked = [];
      for (const c of cands.filter(c => c.db >= top + minDb).sort((x, y) => y.value - x.value)) {
        if (picked.length >= count) break;
        if (dist > 0 && picked.some(p => Math.abs(p.at - c.at) < dist)) continue;
        picked.push(c);
      }
      const peaks = picked.map(c => (freq ? { f: c.at, value: c.value, db: c.db } : { t: c.at, value: c.value, index: c.index }));
      return { peaks, position: picked[0].at, value: picked[0].value };
    },
  },
  {
    type: 'sig.goertzel', version: 1, category: 'signal', icon: 'music', label: L('Goertzel (tones, DTMF)', 'Goertzel (toni, DTMF)'),
    inputs: [SIG_IN],
    outputs: [{ name: 'amplitudes', type: 'list', label: L('amplitudes', 'ampiezze') }, { name: 'key', type: 'text', label: L('DTMF key', 'tasto DTMF') }, { name: 'table', type: 'object', label: L('frequency → amplitude', 'frequenza → ampiezza'), hidden: true }],
    config: [
      { key: 'mode', type: 'select', default: 'list', options: [O('list', 'Frequencies of the list', 'Frequenze della lista'), O('dtmf', 'DTMF (phone keys)', 'DTMF (tasti del telefono)')], label: L('Tones', 'Toni') },
      { key: 'frequencies', type: 'json', default: [50, 100, 150], label: L('Frequencies (Hz)', 'Frequenze (Hz)'), when: { mode: 'list' } },
      { key: 'minLevel', type: 'number', default: 0.05, min: 0, label: L('Least amplitude of a key tone', 'Ampiezza minima di un tono del tasto'), when: { mode: 'dtmf' } },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b), n = s.x.length;
      if (!n) throw new Error('Il segnale è vuoto');
      const dtmf = cfg(b, 'mode', 'list') === 'dtmf';
      const ROWS = [697, 770, 852, 941], COLS = [1209, 1336, 1477, 1633];
      let freqs = dtmf ? [...ROWS, ...COLS] : b.config.frequencies;
      if (typeof freqs === 'string') freqs = freqs.split(/[\s;,]+/).filter(Boolean);
      if (!Array.isArray(freqs) || !freqs.length) throw new Error('Scrivi le frequenze come lista, per esempio [50, 100]');
      freqs = freqs.map(num);
      if (freqs.some(f => !(f >= 0 && f <= s.fs / 2))) throw new Error(`Le frequenze devono stare tra 0 e fs/2 (${s.fs / 2} Hz)`);
      const amps = freqs.map(f => {
        const coeff = 2 * Math.cos(2 * Math.PI * f / s.fs);
        let s1 = 0, s2 = 0;
        for (let i = 0; i < n; i++) { const s0 = s.x[i] + coeff * s1 - s2; s2 = s1; s1 = s0; }
        const p = Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
        return (f === 0 ? 1 : 2) * Math.sqrt(p) / n;
      });
      const out = { amplitudes: amps, table: Object.fromEntries(freqs.map((f, i) => [String(f), amps[i]])) };
      if (dtmf) {
        const best = arr => { const idx = arr.map((v, i) => i).sort((x, y) => arr[y] - arr[x]); return { i: idx[0], v: arr[idx[0]], second: arr[idx[1]] }; };
        const r = best(amps.slice(0, 4)), c = best(amps.slice(4));
        const min = cnum(b, 'minLevel', 0.05);
        out.key = r.v >= min && c.v >= min && r.second < r.v / 2 && c.second < c.v / 2 ? '123A456B789C*0#D'[r.i * 4 + c.i] : '';
      } else out.key = '';
      return out;
    },
  },

  // -------------------------------------------------------------------------------------- filters
  filterBlock({
    type: 'sig.iir', icon: 'filter', label: L('IIR filter (butter, cheby1, cheby2)', 'Filtro IIR (butter, cheby1, cheby2)'),
    config: [
      { key: 'family', type: 'select', default: 'butterworth', options: [O('butterworth', 'Butterworth (flat)', 'Butterworth (piatto)'), O('cheby1', 'Chebyshev I (ripple in the pass band)', 'Chebyshev I (ondulazione in banda passante)'), O('cheby2', 'Chebyshev II (ripple in the stop band)', 'Chebyshev II (ondulazione in banda attenuata)')], label: L('Family', 'Famiglia') },
      { key: 'band', type: 'select', default: 'lowpass', options: BAND_OPTS, label: L('Kind', 'Tipo') },
      { key: 'order', type: 'number', default: 4, min: 1, max: 20, label: L('Order', 'Ordine') },
      F_F1, F_F2,
      { key: 'ripple', type: 'number', default: 1, min: 0, label: L('Pass-band ripple (dB)', 'Ondulazione in banda passante (dB)'), when: { family: 'cheby1' } },
      { key: 'attenuation', type: 'number', default: 40, min: 0, label: L('Stop-band attenuation (dB)', 'Attenuazione in banda attenuata (dB)'), when: { family: 'cheby2' } },
      F_ZEROPHASE,
    ],
  }, (b, fs) => ({
    sos: D.designIIR({ family: cfg(b, 'family', 'butterworth'), band: cfg(b, 'band', 'lowpass'), order: cnum(b, 'order', 4), f1: cnum(b, 'f1', 100), f2: cnum(b, 'f2', 200), fs, ripple: cnum(b, 'ripple', 1), attenuation: cnum(b, 'attenuation', 40) }).sos,
  })),
  filterBlock({
    type: 'sig.biquad', icon: 'filter', label: L('Biquad (RBJ, equalizer)', 'Biquad (RBJ, equalizzatore)'),
    config: [
      { key: 'kind', type: 'select', default: 'lowpass', options: [O('lowpass', 'Low-pass', 'Passa-basso'), O('highpass', 'High-pass', 'Passa-alto'), O('bandpass', 'Band-pass', 'Passa-banda'), O('notch', 'Notch', 'Notch (elimina una frequenza)'), O('peak', 'Peak (bell)', 'Picco (campana)'), O('lowshelf', 'Low shelf', 'Shelf basso'), O('highshelf', 'High shelf', 'Shelf alto'), O('allpass', 'All-pass', 'Passa-tutto')], label: L('Kind', 'Tipo') },
      { key: 'frequency', type: 'number', default: 100, min: 0, label: L('Frequency (Hz)', 'Frequenza (Hz)') },
      { key: 'q', type: 'number', default: 0.7071, min: 0.01, max: 100, label: L('Q', 'Q') },
      { key: 'gain', type: 'number', default: 6, label: L('Gain (dB)', 'Guadagno (dB)'), when: { kind: ['peak', 'lowshelf', 'highshelf'] } },
      F_ZEROPHASE,
    ],
  }, (b, fs) => ({ sos: [D.designBiquad({ kind: cfg(b, 'kind', 'lowpass'), f: cnum(b, 'frequency', 100), q: cnum(b, 'q', Math.SQRT1_2), gain: cnum(b, 'gain', 6), fs })] })),
  filterBlock({
    type: 'sig.fir', icon: 'filter', label: L('FIR filter (firwin)', 'Filtro FIR (firwin)'),
    inputs: [{ name: 'coefficients', type: 'any', label: L('coefficients', 'coefficienti'), hidden: true }],
    outputs: [{ name: 'delay', type: 'number', label: L('delay (s)', 'ritardo (s)'), hidden: true }],
    extra: (b, d, fs) => ({ delay: (d.b.length - 1) / 2 / fs }),
    config: [
      { key: 'band', type: 'select', default: 'lowpass', options: [...BAND_OPTS, O('average', 'Moving average', 'Media mobile'), O('custom', 'Coefficients of the list', 'Coefficienti della lista')], label: L('Kind', 'Tipo') },
      { key: 'taps', type: 'number', default: 101, min: 1, max: 4095, label: L('Coefficients (taps)', 'Coefficienti (taps)'), when: { band: ['lowpass', 'highpass', 'bandpass', 'bandstop', 'average'] } },
      { ...F_F1, when: { band: ['lowpass', 'highpass', 'bandpass', 'bandstop'] } }, F_F2,
      { ...F_WINDOW('hamming'), when: { band: ['lowpass', 'highpass', 'bandpass', 'bandstop'] } }, F_BETA,
      { key: 'list', type: 'json', default: [0.25, 0.5, 0.25], label: L('Coefficients b', 'Coefficienti b'), when: { band: 'custom' } },
      F_ZEROPHASE,
    ],
  }, (b, fs, inputs = {}) => {
    const band = cfg(b, 'band', 'lowpass');
    if (inputs.coefficients !== undefined && inputs.coefficients !== null) { const d = designFromPort(inputs.coefficients); if (d.sos || d.a.length > 1) throw new Error('Il filtro FIR vuole solo coefficienti b (una lista)'); return d; }
    if (band === 'custom') return designFromPort(cfg(b, 'list', [1]));
    return { b: D.designFIR({ band, taps: cnum(b, 'taps', 101), f1: cnum(b, 'f1', 100), f2: cnum(b, 'f2', 200), fs, window: cfg(b, 'window', 'hamming'), beta: cnum(b, 'beta', 8.6) }), a: [1] };
  }),
  filterBlock({
    type: 'sig.difference', icon: 'filter', label: L('Difference equation (lfilter)', 'Equazione alle differenze (lfilter)'),
    inputs: [{ name: 'coefficients', type: 'any', label: L('coefficients', 'coefficienti'), hidden: true }],
    config: [
      { key: 'b', type: 'json', default: [0.5, 0.5], label: L('Coefficients b (input)', 'Coefficienti b (ingresso)') },
      { key: 'a', type: 'json', default: [1], label: L('Coefficients a (output)', 'Coefficienti a (uscita)') },
      F_ZEROPHASE,
    ],
  }, (b, _fs, inputs = {}) => {
    if (inputs.coefficients !== undefined && inputs.coefficients !== null) return designFromPort(inputs.coefficients);
    const parse = (v, w) => { if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = v.split(/[\s;,]+/).filter(Boolean); } } if (!Array.isArray(v)) throw new Error(`I coefficienti ${w} devono essere una lista`); return v; };
    return normBA(parse(cfg(b, 'b', [1]), 'b'), parse(cfg(b, 'a', [1]), 'a'));
  }),
  {
    type: 'sig.smooth', version: 1, category: 'signal', icon: 'filter', label: L('Sample filter (moving average, EMA)', 'Filtro su campioni (media mobile, EMA)'),
    inputs: [{ name: 'value', type: 'any', label: L('value or signal', 'valore o segnale') }, RESET],
    outputs: [{ name: 'value', type: 'any', label: L('filtered', 'filtrato') }],
    config: [
      { key: 'kind', type: 'select', default: 'ema', options: [O('ema', 'Exponential (time constant τ)', 'Esponenziale (costante di tempo τ)'), O('alpha', 'Exponential (factor α)', 'Esponenziale (fattore α)'), O('average', 'Moving average of N', 'Media mobile di N'), O('median', 'Moving median of N', 'Mediana mobile di N')], label: L('Kind', 'Tipo') },
      { key: 'tau', type: 'number', default: 1, min: 0, label: L('Time constant τ (s)', 'Costante di tempo τ (s)'), when: { kind: 'ema' } },
      { key: 'alpha', type: 'number', default: 0.2, min: 0, max: 1, label: L('Factor α (0…1, new value weight)', 'Fattore α (0…1, peso del valore nuovo)'), when: { kind: 'alpha' } },
      { key: 'length', type: 'number', default: 10, min: 1, max: 10000, label: L('N values', 'N valori'), when: { kind: ['average', 'median'] } },
      F_LISTFS,
    ],
    run({ value }, b) {
      const m = b.memory();
      if (b.trigger === 'reset' || m.kind !== b.config.kind) { m.kind = b.config.kind; m.y = undefined; m.win = []; m.last = undefined; }
      if (b.trigger === 'reset' || value === undefined) return undefined;
      const kind = cfg(b, 'kind', 'ema'), N = Math.max(1, Math.round(cnum(b, 'length', 10)));
      const step = (x, dt) => {
        if (kind === 'ema' || kind === 'alpha') {
          const tau = cnum(b, 'tau', 1);
          const a = kind === 'alpha' ? Math.min(1, Math.max(0, cnum(b, 'alpha', 0.2))) : tau > 0 ? 1 - Math.exp(-dt / tau) : 1;
          m.y = m.y === undefined ? x : m.y + a * (x - m.y);
          return m.y;
        }
        m.win.push(x);
        while (m.win.length > N) m.win.shift();
        if (kind === 'average') return m.win.reduce((s, v) => s + v, 0) / m.win.length;
        const sorted = [...m.win].sort((p, q) => p - q), h = sorted.length >> 1;
        return sorted.length % 2 ? sorted[h] : (sorted[h - 1] + sorted[h]) / 2;
      };
      if (numLike(value)) {
        const now = b.now(), dt = m.last === undefined ? 0 : (now - m.last) / 1000;
        m.last = now;
        return { value: step(num(value), dt) };
      }
      const s = sigIn(value, b, 'Il valore');
      const y = s.x.map(x => step(x, 1 / s.fs));
      return { value: sameShape(value, s.fs, y, s.t0) };
    },
  },
  {
    type: 'sig.response', version: 1, category: 'signal', icon: 'chart', label: L('Frequency response (freqz, Bode)', 'Risposta in frequenza (freqz, Bode)'),
    inputs: [{ name: 'coefficients', type: 'any', label: L('coefficients', 'coefficienti') }],
    outputs: [
      { name: 'response', type: 'object', label: L('response', 'risposta') },
      { name: 'poles', type: 'list', label: L('poles', 'poli'), hidden: true }, { name: 'zeros', type: 'list', label: L('zeros', 'zeri'), hidden: true },
      { name: 'stable', type: 'bool', label: L('stable', 'stabile'), hidden: true },
    ],
    config: [
      { key: 'points', type: 'number', default: 512, min: 8, max: 8192, label: L('Points', 'Punti') },
      { key: 'scale', type: 'select', default: 'linear', options: [O('linear', 'Linear', 'Lineare'), O('log', 'Logarithmic (decades)', 'Logaritmica (decadi)')], label: L('Frequencies', 'Frequenze') },
      { key: 'fmin', type: 'number', default: 1, min: 0.000001, label: L('Lowest frequency (Hz)', 'Frequenza più bassa (Hz)'), when: { scale: 'log' } },
      F_LISTFS,
    ],
    run({ coefficients }, b) {
      if (coefficients === undefined || coefficients === null) return undefined;
      const d = designFromPort(coefficients);
      const fs = coefficients && typeof coefficients === 'object' && num(coefficients.fs) > 0 ? num(coefficients.fs) : listFs(b);
      const n = Math.round(cnum(b, 'points', 512)), nyq = fs / 2;
      const log = cfg(b, 'scale', 'linear') === 'log', fmin = Math.min(cnum(b, 'fmin', 1), nyq / 10);
      const f = Array.from({ length: n }, (_, i) => (log ? fmin * (nyq / fmin) ** (i / (n - 1)) : nyq * i / (n - 1)));
      const sections = d.sos ? d.sos.map(s => ({ b: s.slice(0, 3), a: s.slice(3) })) : [d];
      const H = f.map(fr => sections.reduce((acc, s) => { const h = D.freqz(s.b, s.a, fr, fs); return { re: acc.re * h.re - acc.im * h.im, im: acc.re * h.im + acc.im * h.re }; }, { re: 1, im: 0 }));
      const mag = H.map(h => Math.hypot(h.re, h.im));
      const ph = D.unwrap(H.map(h => Math.atan2(h.im, h.re)));
      const w = f.map(x => 2 * Math.PI * x);
      const gd = f.map((_, i) => {
        const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
        return w[i1] === w[i0] ? 0 : -(ph[i1] - ph[i0]) / (w[i1] - w[i0]);
      });
      const poles = [], zeros = [];
      for (const s of sections) { zeros.push(...D.rootsOf(s.b)); poles.push(...D.rootsOf(s.a)); }
      const pz = list => list.map(z => ({ re: round12(z.re), im: round12(z.im), abs: round12(Math.hypot(z.re, z.im)) }));
      return {
        response: { kind: 'response', fs, f: f.map(round12), mag, db: mag.map(db20), phase: Array.from(ph, x => x * 180 / Math.PI), groupDelay: gd },
        poles: pz(poles), zeros: pz(zeros), stable: poles.every(p => Math.hypot(p.re, p.im) < 1),
      };
    },
  },

  // ---------------------------------------------------------------------------------- correlation
  {
    type: 'sig.convolve', version: 1, category: 'signal', icon: 'merge', label: L('Convolution (np.convolve)', 'Convoluzione (np.convolve)'),
    inputs: [{ name: 'a', type: 'any', label: L('signal', 'segnale') }, { name: 'b', type: 'any', label: L('impulse response h', 'risposta all\'impulso h') }],
    outputs: [SIG_OUT],
    config: [
      { key: 'mode', type: 'select', default: 'full', options: [O('full', 'Full (N + M − 1)', 'Completa (N + M − 1)'), O('same', 'Same length as a', 'Stessa lunghezza di a'), O('valid', 'Valid (only full overlap)', 'Valida (solo sovrapposizione piena)'), O('circular', 'Circular (length of a)', 'Circolare (lunghezza di a)')], label: L('Mode', 'Modo') },
      F_LISTFS,
    ],
    run(inputs, b) {
      if (inputs.a === undefined || inputs.b === undefined) return undefined;
      const a = sigIn(inputs.a, b, 'Il segnale a'), h = sigIn(inputs.b, b, 'Il segnale b');
      if (isSignalObj(inputs.a) && isSignalObj(inputs.b) && a.fs !== h.fs) throw new Error(`I segnali hanno fs diverse (${a.fs} e ${h.fs} Hz): usa prima Ricampiona`);
      const na = a.x.length, nb = h.x.length;
      if (!na || !nb) throw new Error('I segnali non possono essere vuoti');
      const mode = cfg(b, 'mode', 'full');
      let y, t0 = a.t0;
      if (mode === 'circular') {
        const A = D.fft(a.x), B = D.fft(nb >= na ? h.x.slice(0, na) : D.pad(h.x, na));
        const re = new Float64Array(na), im = new Float64Array(na);
        for (let k = 0; k < na; k++) { re[k] = A.re[k] * B.re[k] - A.im[k] * B.im[k]; im[k] = A.re[k] * B.im[k] + A.im[k] * B.re[k]; }
        y = D.fft(re, im, true).re;
      } else {
        checkN(na + nb - 1, b);
        const full = D.convolve(a.x, h.x);
        if (mode === 'same') { const s0 = Math.floor((nb - 1) / 2); y = full.slice(s0, s0 + na); }
        else if (mode === 'valid') { const lo = Math.min(na, nb) - 1; y = full.slice(lo, na + nb - 1 - lo); t0 = a.t0 + lo / a.fs; }
        else y = full;
      }
      return { signal: sigOut(a.fs, y, t0) };
    },
  },
  {
    type: 'sig.correlate', version: 1, category: 'signal', icon: 'compare', label: L('Correlation (np.correlate)', 'Correlazione (np.correlate)'),
    inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }],
    outputs: [
      { name: 'correlation', type: 'object', label: L('correlation (t = lag)', 'correlazione (t = ritardo)') },
      { name: 'delay', type: 'number', label: L('delay of a on b (s)', 'ritardo di a su b (s)') },
      { name: 'lag', type: 'number', label: L('delay (samples)', 'ritardo (campioni)'), hidden: true },
      { name: 'max', type: 'number', label: L('value at the delay', 'valore al ritardo'), hidden: true },
    ],
    config: [
      { key: 'normalize', type: 'select', default: 'coeff', options: [O('coeff', 'Coefficient (−1 … 1)', 'Coefficiente (−1 … 1)'), O('none', 'None (sums)', 'Nessuna (somme)'), O('biased', 'Biased (÷ N)', 'Polarizzata (÷ N)'), O('unbiased', 'Unbiased (÷ N − |k|)', 'Non polarizzata (÷ N − |k|)')], label: L('Normalization', 'Normalizzazione') },
      { key: 'maxLag', type: 'number', default: 0, min: 0, label: L('Largest delay (s, 0 = all)', 'Ritardo massimo (s, 0 = tutti)') },
      F_LISTFS,
    ],
    run(inputs, b) {
      if (inputs.a === undefined) return undefined;
      const a = sigIn(inputs.a, b, 'Il segnale a');
      const auto = inputs.b === undefined || inputs.b === null;
      const c = auto ? a : sigIn(inputs.b, b, 'Il segnale b');
      if (!auto && isSignalObj(inputs.a) && isSignalObj(inputs.b) && a.fs !== c.fs) throw new Error(`I segnali hanno fs diverse (${a.fs} e ${c.fs} Hz): usa prima Ricampiona`);
      const na = a.x.length, nb = c.x.length;
      if (!na || !nb) throw new Error('I segnali non possono essere vuoti');
      checkN(na + nb - 1, b);
      const full = D.convolve(a.x, Float64Array.from(c.x).reverse());   // r[k] = Σ a[n+k]·b[n], k = −(nb−1) … na−1
      const norm = cfg(b, 'normalize', 'coeff');
      const ea = a.x.reduce((s, v) => s + v * v, 0), eb = c.x.reduce((s, v) => s + v * v, 0);
      const N = Math.max(na, nb);
      const r = Array.from(full, (v, j) => {
        const k = j - (nb - 1);
        if (norm === 'coeff') return ea && eb ? v / Math.sqrt(ea * eb) : 0;
        if (norm === 'biased') return v / N;
        if (norm === 'unbiased') { const overlap = Math.min(na, nb + k) - Math.max(0, k); return overlap > 0 ? v / overlap : 0; }
        return v;
      });
      const maxLagS = cnum(b, 'maxLag', 0);
      let lo = -(nb - 1), hi = na - 1;
      if (maxLagS > 0) { const L2 = Math.round(maxLagS * a.fs); lo = Math.max(lo, -L2); hi = Math.min(hi, L2); }
      const seg = r.slice(lo + nb - 1, hi + nb);
      let best = 0;
      for (let i = 1; i < seg.length; i++) if (seg[i] > seg[best]) best = i;
      const lag = lo + best;
      return { correlation: sigOut(a.fs, seg, lo / a.fs), lag, delay: round12(lag / a.fs), max: seg[best] };
    },
  },

  // -------------------------------------------------------------------------------------- measures
  {
    type: 'sig.measure', version: 1, category: 'signal', icon: 'gauge', label: L('Measures (RMS, peak, mean)', 'Misure (RMS, picco, media)'),
    inputs: [SIG_IN],
    outputs: [
      { name: 'rms', type: 'number', label: L('RMS', 'efficace (RMS)') }, { name: 'peak', type: 'number', label: L('peak |x|', 'picco |x|') }, { name: 'mean', type: 'number', label: L('mean (DC)', 'media (continua)') },
      { name: 'min', type: 'number', label: L('minimum', 'minimo'), hidden: true }, { name: 'max', type: 'number', label: L('maximum', 'massimo'), hidden: true },
      { name: 'peakToPeak', type: 'number', label: L('peak to peak', 'picco-picco'), hidden: true }, { name: 'std', type: 'number', label: L('standard deviation', 'deviazione standard'), hidden: true },
      { name: 'crest', type: 'number', label: L('crest factor', 'fattore di cresta'), hidden: true }, { name: 'power', type: 'number', label: L('mean power', 'potenza media'), hidden: true },
      { name: 'energy', type: 'number', label: L('energy', 'energia'), hidden: true }, { name: 'db', type: 'number', label: L('RMS in dB', 'RMS in dB'), hidden: true },
      { name: 'all', type: 'object', label: L('all the measures', 'tutte le misure'), hidden: true },
    ],
    config: [{ key: 'ref', type: 'number', default: 1, min: 0.000000001, label: L('dB reference (0 dB)', 'Riferimento dei dB (0 dB)') }, F_LISTFS],
    run({ signal }, b) {
      const s = sigIn(signal, b), x = s.x, n = x.length;
      if (!n) throw new Error('Il segnale è vuoto');
      let sum = 0, sq = 0, mn = Infinity, mx = -Infinity;
      for (const v of x) { sum += v; sq += v * v; if (v < mn) mn = v; if (v > mx) mx = v; }
      const mean = sum / n, power = sq / n, rms = Math.sqrt(power), peak = Math.max(Math.abs(mn), Math.abs(mx));
      const std = Math.sqrt(Math.max(0, power - mean * mean));
      const all = { rms, peak, mean, min: mn, max: mx, peakToPeak: mx - mn, std, crest: rms > 0 ? peak / rms : 0, power, energy: sq / s.fs, db: db20(rms / cnum(b, 'ref', 1)), n, duration: round12(n / s.fs) };
      return { ...all, all };
    },
  },
  {
    type: 'sig.distortion', version: 1, category: 'signal', icon: 'gauge', label: L('Distortion (THD, SNR, SINAD)', 'Distorsione (THD, SNR, SINAD)'),
    inputs: [SIG_IN],
    outputs: [
      { name: 'thd', type: 'number', label: L('THD (%)', 'THD (%)') }, { name: 'snr', type: 'number', label: L('SNR (dB)', 'SNR (dB)') },
      { name: 'sinad', type: 'number', label: L('SINAD (dB)', 'SINAD (dB)'), hidden: true }, { name: 'enob', type: 'number', label: L('ENOB (bits)', 'ENOB (bit)'), hidden: true },
      { name: 'thdDb', type: 'number', label: L('THD (dB)', 'THD (dB)'), hidden: true },
      { name: 'frequency', type: 'number', label: L('fundamental (Hz)', 'fondamentale (Hz)'), hidden: true }, { name: 'amplitude', type: 'number', label: L('fundamental amplitude', 'ampiezza della fondamentale'), hidden: true },
    ],
    config: [
      { key: 'fundamental', type: 'number', default: 0, min: 0, label: L('Fundamental (Hz, 0 = the highest peak)', 'Fondamentale (Hz, 0 = il picco più alto)') },
      { key: 'harmonics', type: 'number', default: 5, min: 1, max: 50, label: L('Harmonics counted (from the 2nd)', 'Armoniche contate (dalla 2ª)') },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b), n = s.x.length;
      if (n < 64) throw new Error('Servono almeno 64 campioni');
      const w = D.windowOf('blackmanHarris', n);
      const mean = s.x.reduce((a, v) => a + v, 0) / n;
      const X = D.fft(Array.from(s.x, (v, i) => (v - mean) * w[i]));
      const half = Math.floor(n / 2) + 1, P = new Float64Array(half);
      for (let k = 0; k < half; k++) P[k] = X.re[k] ** 2 + X.im[k] ** 2;
      const lobe = 5, df = s.fs / n;
      const band = k => { let p = 0; for (let j = Math.max(0, k - lobe); j <= Math.min(half - 1, k + lobe); j++) p += P[j]; return p; };
      let k1;
      const fGiven = cnum(b, 'fundamental', 0);
      if (fGiven > 0) { if (fGiven >= s.fs / 2) throw new Error(`La fondamentale deve stare sotto fs/2 (${s.fs / 2} Hz)`); k1 = Math.round(fGiven / df); }
      else { k1 = lobe + 1; for (let k = lobe + 1; k < half; k++) if (P[k] > P[k1]) k1 = k; }
      if (k1 <= lobe) throw new Error('La fondamentale è troppo vicina a 0 Hz per questa lunghezza: servono più campioni');
      let kp = k1;   // the true maximum near k1
      for (let k = Math.max(1, k1 - 2); k <= Math.min(half - 1, k1 + 2); k++) if (P[k] > P[kp]) kp = k;
      const pf = band(kp);
      const used = new Set();
      for (let j = Math.max(0, kp - lobe); j <= Math.min(half - 1, kp + lobe); j++) used.add(j);
      for (let j = 0; j <= lobe; j++) used.add(j);
      const fo = kp + D.parabolic(Array.from(P, v => Math.log(v + 1e-300)), kp).delta;
      let ph = 0;
      for (let h = 2; h <= Math.round(cnum(b, 'harmonics', 5)) + 1; h++) {
        let k = Math.round(h * fo) % n;   // folded into 0 … fs/2 (aliasing)
        if (k >= half) k = n - k;
        if (k <= lobe) continue;
        for (let j = Math.max(0, k - lobe); j <= Math.min(half - 1, k + lobe); j++) if (!used.has(j)) { ph += P[j]; used.add(j); }
      }
      let pt = 0;
      for (let k = 0; k < half; k++) if (!used.has(k)) pt += P[k];
      const pn = pt;
      const s2 = w.reduce((a, v) => a + v * v, 0);
      const sinad = 10 * Math.log10(pf / Math.max(1e-300, pn + ph));
      const lim = v => Math.max(-300, Math.min(300, v));
      return {
        thd: Math.sqrt(ph / pf) * 100, thdDb: lim(10 * Math.log10(Math.max(1e-300, ph) / pf)), snr: lim(10 * Math.log10(pf / Math.max(1e-300, pn))),
        sinad: lim(sinad), enob: (lim(sinad) - 1.76) / 6.02, frequency: round12(fo * df), amplitude: 2 * Math.sqrt(pf / (n * s2)),
      };
    },
  },
  {
    type: 'sig.frequency', version: 1, category: 'signal', icon: 'gauge', label: L('Frequency · Period', 'Frequenza · Periodo'),
    inputs: [SIG_IN],
    outputs: [{ name: 'frequency', type: 'number', label: L('frequency (Hz)', 'frequenza (Hz)') }, { name: 'period', type: 'number', label: L('period (s)', 'periodo (s)') }],
    config: [
      { key: 'method', type: 'select', default: 'zero', options: [O('zero', 'Zero crossings', 'Passaggi per lo zero'), O('autocorr', 'Autocorrelation', 'Autocorrelazione'), O('fft', 'Spectrum peak (FFT)', 'Picco dello spettro (FFT)')], label: L('Method', 'Metodo') },
      { key: 'hysteresis', type: 'number', default: 0.1, min: 0, max: 0.9, label: L('Hysteresis (fraction of the peak)', 'Isteresi (frazione del picco)'), when: { method: 'zero' } },
      F_LISTFS,
    ],
    run({ signal }, b) {
      const s = sigIn(signal, b), n = s.x.length;
      if (n < 4) throw new Error('Servono almeno 4 campioni');
      const mean = s.x.reduce((a, v) => a + v, 0) / n, x = s.x.map(v => v - mean);
      let f = NaN;
      const method = cfg(b, 'method', 'zero');
      if (method === 'zero') {
        const peak = peakAbs(x), th = peak * cnum(b, 'hysteresis', 0.1);
        let armed = false;
        const cross = [];
        for (let i = 1; i < n; i++) {
          if (x[i] < -th) armed = true;
          if (armed && x[i - 1] < 0 && x[i] >= 0) { cross.push(i - 1 + (-x[i - 1]) / (x[i] - x[i - 1])); armed = false; }
        }
        if (cross.length >= 2) f = (cross.length - 1) * s.fs / (cross[cross.length - 1] - cross[0]);
      } else if (method === 'autocorr') {
        const r = D.convolve(x, Float64Array.from(x).reverse()).slice(n - 1);
        let i = 1;
        while (i < n - 1 && r[i] > 0) i++;
        let best = -1;
        for (let k = i; k < n - 1; k++) if (r[k] > r[k - 1] && r[k] >= r[k + 1] && (best < 0 || r[k] > r[best])) best = k;
        if (best > 0) f = s.fs / (best + D.parabolic(Array.from(r), best).delta);
      } else {
        const w = D.windowOf('hann', n), X = D.fft(Array.from(x, (v, i) => v * w[i]));
        const half = Math.floor(n / 2) + 1, mag = Array.from({ length: half }, (_, k) => Math.log(Math.hypot(X.re[k], X.im[k]) + 1e-300));
        let k1 = 1;
        for (let k = 2; k < half; k++) if (mag[k] > mag[k1]) k1 = k;
        f = (k1 + D.parabolic(mag, k1).delta) * s.fs / n;
      }
      if (!(f > 0) || !Number.isFinite(f)) throw new Error('Non trovo una frequenza: il segnale non sembra periodico in questa finestra');
      return { frequency: round12(f), period: round12(1 / f) };
    },
  },
  {
    type: 'sig.envelope', version: 1, category: 'signal', icon: 'wave', label: L('Envelope (scipy.signal.hilbert)', 'Inviluppo (scipy.signal.hilbert)'),
    inputs: [SIG_IN],
    outputs: [
      { name: 'envelope', type: 'object', label: L('envelope', 'inviluppo') },
      { name: 'phase', type: 'object', label: L('instantaneous phase (rad)', 'fase istantanea (rad)'), hidden: true },
      { name: 'frequency', type: 'object', label: L('instantaneous frequency (Hz)', 'frequenza istantanea (Hz)'), hidden: true },
      { name: 'analytic', type: 'object', label: L('analytic signal', 'segnale analitico'), hidden: true },
    ],
    config: [F_LISTFS],
    run({ signal }, b) {
      const s = sigIn(signal, b), n = s.x.length;
      if (n < 2) throw new Error('Servono almeno 2 campioni');
      const z = D.hilbert(s.x);
      const env = Array.from(z.re, (r, i) => Math.hypot(r, z.im[i]));
      const ph = D.unwrap(Array.from(z.re, (r, i) => Math.atan2(z.im[i], r)));
      const fr = Array.from(ph, (p, i) => (i === 0 ? (ph[1] - ph[0]) : (p - ph[i - 1])) * s.fs / (2 * Math.PI));
      return { envelope: sigOut(s.fs, env, s.t0), phase: sigOut(s.fs, ph, s.t0), frequency: sigOut(s.fs, fr, s.t0), analytic: sigOut(s.fs, z.re, s.t0, z.im) };
    },
  },
  {
    type: 'sig.db', version: 1, category: 'signal', icon: 'calculator', label: L('dB ↔ linear', 'dB ↔ lineare'),
    inputs: [{ name: 'value', type: 'any', label: L('value, list or signal', 'valore, lista o segnale') }],
    outputs: [{ name: 'result', type: 'any', label: L('result', 'risultato') }],
    config: [
      { key: 'op', type: 'select', default: 'ampToDb', options: [
        O('ampToDb', 'Amplitude → dB (20·log₁₀)', 'Ampiezza → dB (20·log₁₀)'), O('powerToDb', 'Power → dB (10·log₁₀)', 'Potenza → dB (10·log₁₀)'),
        O('dbToAmp', 'dB → amplitude', 'dB → ampiezza'), O('dbToPower', 'dB → power', 'dB → potenza'),
        O('wToDbm', 'W → dBm', 'W → dBm'), O('dbmToW', 'dBm → W', 'dBm → W'), O('vToDbv', 'V → dBV', 'V → dBV'), O('dbvToV', 'dBV → V', 'dBV → V'),
        O('vToDbu', 'V → dBu (0.775 V)', 'V → dBu (0,775 V)'), O('dbuToV', 'dBu → V', 'dBu → V'),
      ], label: L('Conversion', 'Conversione') },
      { key: 'ref', type: 'number', default: 1, min: 0.000000001, label: L('Reference (0 dB)', 'Riferimento (0 dB)'), when: { op: ['ampToDb', 'powerToDb', 'dbToAmp', 'dbToPower'] } },
      F_LISTFS,
    ],
    run({ value }, b) {
      const ref = cnum(b, 'ref', 1), U = 0.7745966692414834;
      const f = {
        ampToDb: x => db20(x / ref), powerToDb: x => db10(x / ref), dbToAmp: x => ref * 10 ** (x / 20), dbToPower: x => ref * 10 ** (x / 10),
        wToDbm: x => db10(x / 0.001), dbmToW: x => 0.001 * 10 ** (x / 10), vToDbv: x => db20(x), dbvToV: x => 10 ** (x / 20),
        vToDbu: x => db20(x / U), dbuToV: x => U * 10 ** (x / 20),
      }[cfg(b, 'op', 'ampToDb')];
      if (!f) throw new Error(`Conversione sconosciuta: ${b.config.op}`);
      if (numLike(value)) return { result: f(num(value)) };
      const s = sigIn(value, b, 'Il valore');
      return { result: sameShape(value, s.fs, s.x.map(f), s.t0) };
    },
  },

  // ------------------------------------------------------------------------------------ modulation
  modulation('sig.modulate', L('Modulate (AM, FM, PM)', 'Modula (AM, FM, PM)'), false),
  modulation('sig.demodulate', L('Demodulate (AM, FM, PM)', 'Demodula (AM, FM, PM)'), true),
];

/** Modulate and demodulate share their settings, so that a pair works with the same values. */
function modulation(type, label, demod) {
  return {
    type, version: 1, category: 'signal', icon: 'sync', label,
    inputs: [{ name: 'signal', type: 'any', label: demod ? L('modulated signal', 'segnale modulato') : L('message', 'messaggio') }, RESET],
    outputs: [{ name: 'signal', type: 'object', label: demod ? L('message', 'messaggio') : L('modulated signal', 'segnale modulato') }],
    config: [
      { key: 'kind', type: 'select', default: 'am', options: [O('am', 'AM (with carrier)', 'AM (con portante)'), O('dsbsc', 'DSB-SC (suppressed carrier)', 'DSB-SC (portante soppressa)'), O('fm', 'FM', 'FM'), O('pm', 'PM', 'PM')], label: L('Modulation', 'Modulazione') },
      { key: 'carrier', type: 'number', default: 100, min: 0, label: L('Carrier frequency (Hz)', 'Frequenza della portante (Hz)') },
      { key: 'amplitude', type: 'number', default: 1, min: 0.000000001, label: L('Carrier amplitude', 'Ampiezza della portante') },
      { key: 'index', type: 'number', default: 0.5, min: 0, label: L('Modulation index m', 'Indice di modulazione m'), when: { kind: 'am' } },
      { key: 'deviation', type: 'number', default: 100, min: 0.000000001, label: L('Deviation (Hz per unit of the message)', 'Deviazione (Hz per unità del messaggio)'), when: { kind: 'fm' } },
      { key: 'phaseDev', type: 'number', default: 1.5708, min: 0.000000001, label: L('Phase deviation (rad per unit)', 'Deviazione di fase (rad per unità)'), when: { kind: 'pm' } },
      ...(demod ? [{ key: 'cutoff', type: 'number', default: 0, min: 0, label: L('Low-pass after DSB-SC (Hz, 0 = carrier/2)', 'Passa-basso dopo DSB-SC (Hz, 0 = portante/2)'), when: { kind: 'dsbsc' } }] : []),
      F_LISTFS,
    ],
    run({ signal }, b) {
      const m = b.memory();
      if (b.trigger === 'reset') { m.integral = 0; m.tEnd = undefined; return undefined; }
      if (signal === undefined) return undefined;
      const s = sigIn(signal, b, demod ? 'Il segnale modulato' : 'Il messaggio'), n = s.x.length;
      const fc = cnum(b, 'carrier', 100), A = cnum(b, 'amplitude', 1), kind = cfg(b, 'kind', 'am');
      if (!(fc < s.fs / 2)) throw new Error(`La portante (${fc} Hz) deve stare sotto fs/2 (${s.fs / 2} Hz), altrimenti c'è aliasing`);
      if (!(A > 0)) throw new Error("L'ampiezza della portante deve essere più di 0");
      const t = i => s.t0 + i / s.fs, wc = 2 * Math.PI * fc;
      const mi = cnum(b, 'index', 0.5), kf = cnum(b, 'deviation', 100), kp = cnum(b, 'phaseDev', 1.5708);
      const y = new Float64Array(n);
      if (!demod) {
        if (kind === 'fm') {
          if (m.tEnd === undefined || Math.abs(s.t0 - m.tEnd) > 1.5 / s.fs) m.integral = 0;
          for (let i = 0; i < n; i++) { y[i] = A * Math.cos(wc * t(i) + 2 * Math.PI * kf * m.integral); m.integral += s.x[i] / s.fs; }
          m.tEnd = s.t0 + n / s.fs;
        } else for (let i = 0; i < n; i++) {
          const c = Math.cos(wc * t(i));
          y[i] = kind === 'am' ? A * (1 + mi * s.x[i]) * c : kind === 'dsbsc' ? A * s.x[i] * c : A * Math.cos(wc * t(i) + kp * s.x[i]);
        }
        return { signal: sigOut(s.fs, y, s.t0) };
      }
      if (n < 4) throw new Error('Servono almeno 4 campioni');
      if (kind === 'dsbsc') {
        for (let i = 0; i < n; i++) y[i] = 2 * s.x[i] * Math.cos(wc * t(i)) / A;
        const cut = cnum(b, 'cutoff', 0) > 0 ? cnum(b, 'cutoff', 0) : fc / 2;
        const sos = D.designIIR({ band: 'lowpass', order: 4, f1: Math.min(cut, s.fs / 2 * 0.99), fs: s.fs }).sos;
        return { signal: sigOut(s.fs, D.zeroPhase(x => D.sosfilt(sos, x), y, 27), s.t0) };
      }
      const z = D.hilbert(s.x);
      if (kind === 'am') {
        if (!(mi > 0)) throw new Error("L'indice di modulazione deve essere più di 0");
        for (let i = 0; i < n; i++) y[i] = (Math.hypot(z.re[i], z.im[i]) / A - 1) / mi;
        return { signal: sigOut(s.fs, y, s.t0) };
      }
      // the phase relative to the carrier: arg(z · e^{−iωc t})
      const rel = D.unwrap(Array.from({ length: n }, (_, i) => {
        const c = Math.cos(-wc * t(i)), sn = Math.sin(-wc * t(i));
        return Math.atan2(z.re[i] * sn + z.im[i] * c, z.re[i] * c - z.im[i] * sn);
      }));
      if (kind === 'fm') for (let i = 0; i < n; i++) y[i] = (i === 0 ? rel[1] - rel[0] : rel[i] - rel[i - 1]) * s.fs / (2 * Math.PI) / kf;
      else {
        const mean = rel.reduce((a, v) => a + v, 0) / n, off = 2 * Math.PI * Math.round(mean / (2 * Math.PI));
        for (let i = 0; i < n; i++) y[i] = (rel[i] - off) / kp;
      }
      return { signal: sigOut(s.fs, y, s.t0) };
    },
  };
}

/** At most max points: the min and the max of each bucket, so that peaks stay visible. */
function decimate(xs, ys, max) {
  const n = ys.length;
  const pt = i => ({ x: xs[i], y: Number.isFinite(ys[i]) ? ys[i] : null });
  if (n <= max) return Array.from({ length: n }, (_, i) => pt(i));
  const buckets = Math.max(1, Math.floor(max / 2)), size = n / buckets, out = [];
  for (let k = 0; k < buckets; k++) {
    const a = Math.floor(k * size), e = Math.min(n, Math.floor((k + 1) * size));
    let lo = a, hi = a;
    for (let i = a; i < e; i++) { if (ys[i] < ys[lo]) lo = i; if (ys[i] > ys[hi]) hi = i; }
    if (lo === hi) out.push(pt(lo)); else for (const i of lo < hi ? [lo, hi] : [hi, lo]) out.push(pt(i));
  }
  return out;
}

