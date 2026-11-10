/**
 * Scales, ticks and formatting for the SDK charts (sdk/ui/charts.js).
 */

/** A «nice» step (1, 2, 2.5, 5 × 10^n) that cuts `span` in about `count` parts. */
export function niceStep(span, count) {
  const raw = Math.abs(span) / Math.max(1, count);
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

/** How many decimals a step needs to be written exactly (0.25 → 2). */
export function decimalsOf(step) {
  if (!Number.isFinite(step) || step === 0) return 0;
  const s = String(Number(Math.abs(step).toPrecision(10)));
  if (s.includes('e-')) return Math.min(10, Number(s.split('e-')[1]) + (s.split('e')[0].split('.')[1]?.length ?? 0));
  return Math.min(10, s.split('.')[1]?.length ?? 0);
}

/**
 * Ticks for a value axis: { min, max, step, ticks } with min/max widened to whole steps.
 * fixedMin/fixedMax (when finite) are kept as they are.
 */
export function niceTicks(min, max, count = 5, { fixedMin, fixedMax, integer = false } = {}) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
  if (Number.isFinite(fixedMin)) min = fixedMin;
  if (Number.isFinite(fixedMax)) max = fixedMax;
  if (min > max) [min, max] = [max, min];
  if (min === max) { const d = Math.abs(min) * 0.1 || 1; min -= d; max += d; }
  let step = niceStep(max - min, count);
  if (integer && step < 1) step = 1;
  const lo = Number.isFinite(fixedMin) ? min : Math.floor(min / step + 1e-9) * step;
  const hi = Number.isFinite(fixedMax) ? max : Math.ceil(max / step - 1e-9) * step;
  const dec = decimalsOf(step);
  const ticks = [];
  const first = Math.ceil(lo / step - 1e-9) * step;
  for (let v = first; v <= hi + step * 1e-6 && ticks.length < 200; v += step) ticks.push(Number(v.toFixed(Math.min(15, dec + 2))));
  return { min: lo, max: hi, step, ticks };
}

const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H;
const TIME_STEPS = [S, 2 * S, 5 * S, 10 * S, 15 * S, 30 * S, M, 2 * M, 5 * M, 10 * M, 15 * M, 30 * M, H, 2 * H, 3 * H, 6 * H, 12 * H, D, 2 * D, 7 * D, 14 * D, 30 * D, 91 * D, 182 * D, 365 * D];

/** Ticks for a time axis (ms), on round local times: { ticks, step }. */
export function timeTicks(min, max, count = 5) {
  const raw = (max - min) / Math.max(1, count);
  const step = TIME_STEPS.find(s => s >= raw) ?? Math.ceil(raw / (365 * D)) * 365 * D;
  const off = step >= H ? new Date(min).getTimezoneOffset() * M : 0;
  const ticks = [];
  for (let t = Math.ceil((min - off) / step) * step + off; t <= max && ticks.length < 200; t += step) ticks.push(t);
  return { ticks, step };
}

const numberFormats = new Map();
/** Intl number formatting, cached: decimals null = up to 3, as needed. */
export function formatNumber(v, lang = 'en', decimals = null) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return v === null || v === undefined ? '' : String(v);
  const key = `${lang}|${decimals}`;
  let f = numberFormats.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(lang, Number.isInteger(decimals) ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : { maximumFractionDigits: 3 });
    } catch { f = new Intl.NumberFormat('en', { maximumFractionDigits: 3 }); }
    numberFormats.set(key, f);
  }
  return f.format(Object.is(v, -0) ? 0 : v);
}

/** A number with its unit («21,4 °C», «12 %»). */
export function withUnit(text, unit) {
  if (!unit || text === '') return text;
  return `${text} ${unit}`;
}

const timeFormats = new Map();
/** A time for an axis or a tooltip, as precise as `step` (ms) asks. */
export function formatTime(t, lang = 'en', step = M, full = false) {
  const kind = full ? (step < M ? 'fs' : step < D ? 'fm' : 'fd') : step < M ? 's' : step < D ? 'm' : step < 182 * D ? 'd' : 'y';
  const key = `${lang}|${kind}`;
  let f = timeFormats.get(key);
  if (!f) {
    const o = {
      s: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
      m: { hour: '2-digit', minute: '2-digit' },
      d: { day: 'numeric', month: 'short' },
      y: { month: 'short', year: 'numeric' },
      fs: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' },
      fm: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
      fd: { day: 'numeric', month: 'short', year: 'numeric' },
    }[kind];
    try { f = new Intl.DateTimeFormat(lang, o); } catch { f = new Intl.DateTimeFormat('en', o); }
    timeFormats.set(key, f);
  }
  return f.format(new Date(t));
}

let measureCtx = null;
/** The width in px of a text in a CSS font. */
export function textWidth(text, font) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return String(text).length * 6.5;
  measureCtx.font = font;
  return measureCtx.measureText(String(text)).width;
}

/** A text cut with «…» so that it fits in `max` px. */
export function fitText(text, max, font) {
  text = String(text);
  if (textWidth(text, font) <= max) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (textWidth(`${text.slice(0, mid)}…`, font) <= max) lo = mid; else hi = mid - 1;
  }
  return lo > 0 ? `${text.slice(0, lo)}…` : '';
}

/** Index of the item of a sorted array nearest to v (by key). */
export function nearest(sorted, v, key = x => x) {
  let lo = 0, hi = sorted.length - 1;
  if (hi < 0) return -1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(sorted[mid]) < v) lo = mid + 1; else hi = mid;
  }
  if (lo > 0 && Math.abs(key(sorted[lo - 1]) - v) <= Math.abs(key(sorted[lo]) - v)) return lo - 1;
  return lo;
}

/** Index of the last item of a sorted array with key ≤ v (-1 when none). */
export function lastAtOrBefore(sorted, v, key = x => x) {
  let lo = 0, hi = sorted.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (key(sorted[mid]) <= v) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found;
}
