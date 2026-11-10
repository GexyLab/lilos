/**
 * The data the SDK charts accept, made into one shape: [{ name, color, data: [raw points] }].
 *
 *   [1, 2, 3]                                   one series, x = position
 *   [{ x, y }, …] or [[x, y], …]                one series (x: number, Date, ISO text or category)
 *   [{ name, data: […] }, …]                     several series
 *   { Nord: […], Sud: […] }                      several series by name
 *   { Nord: 3, Sud: 5 }                          one series of categories (a pie: name → value)
 *   { gen: { Nord: 3, Sud: 5 }, feb: {…} }       categories × series
 *   [{ mese: 'gen', Nord: 3, Sud: 5 }, …]        rows of a table: the text field is x, numbers are series
 *   a JSON text of any of these
 */

export const isPlain = o => !!o && typeof o === 'object' && !Array.isArray(o) && !(o instanceof Date);
export const finite = v => typeof v === 'number' && Number.isFinite(v);
const X_KEYS = ['x', 't', 'time', 'date', 'name', 'label', 'category', 'key'];
const Y_KEYS = ['y', 'value', 'v', 'state', 'count'];
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Any accepted input → [{ name, color, data }]. */
export function toSeries(v) {
  if (v === null || v === undefined || v === '') return [];
  if (typeof v === 'string') {
    try { return toSeries(JSON.parse(v)); } catch { return []; }
  }
  if (typeof v === 'number' || typeof v === 'boolean') return [{ name: '', data: [v] }];
  if (Array.isArray(v)) {
    if (!v.length) return [];
    const dataOf = s => s.data ?? s.points ?? s.values;
    if (v.every(s => isPlain(s) && (Array.isArray(dataOf(s)) || isPlain(dataOf(s))))) {
      // a series' data may also be an object name → value
      return v.map(s => ({ name: String(s.name ?? s.label ?? ''), color: safeColor(s.color), data: isPlain(dataOf(s)) ? Object.entries(dataOf(s)).map(([x, y]) => ({ x, y })) : dataOf(s) }));
    }
    if (v.every(isPlain) && !v.some(r => Y_KEYS.some(k => r[k] !== undefined))) return fromRows(v);
    return [{ name: '', data: v }];
  }
  if (isPlain(v)) {
    if (Array.isArray(v.series)) return toSeries(v.series);
    if (Array.isArray(v.data)) return [{ name: String(v.name ?? ''), color: safeColor(v.color), data: v.data }];
    const entries = Object.entries(v);
    if (!entries.length) return [];
    if (entries.every(([, x]) => Array.isArray(x))) return entries.map(([name, data]) => ({ name, data }));
    if (entries.every(([, x]) => isPlain(x))) {
      const names = [...new Set(entries.flatMap(([, x]) => Object.keys(x)))];
      return names.map(n => ({ name: n, data: entries.map(([cat, x]) => ({ x: cat, y: x[n] ?? null })) }));
    }
    return [{ name: '', data: entries.map(([x, y]) => ({ x, y })) }];
  }
  return [];
}

/** Rows of a table: the first text field (or x, name, label…) is x, every numeric field a series. */
function fromRows(rows) {
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const xKey = X_KEYS.find(k => keys.includes(k)) ?? keys.find(k => rows.some(r => typeof r[k] === 'string' && !Number.isFinite(Number(r[k]))));
  const names = keys.filter(k => k !== xKey && rows.some(r => typeof r[k] === 'number' || typeof r[k] === 'boolean'));
  return names.map(k => ({ name: k, data: rows.map((r, i) => ({ x: xKey ? r[xKey] : i, y: r[k] ?? null })) }));
}

/** A raw point → { x, y, auto } (auto: x was not given). Text numbers become numbers. */
export function pointOf(p, i) {
  if (p === null || p === undefined) return { x: i, y: null, auto: true };
  if (typeof p === 'number' || typeof p === 'boolean') return { x: i, y: p, auto: true };
  if (typeof p === 'string') return { x: i, y: numberOrText(p), auto: true };
  if (Array.isArray(p)) return { x: p[0] ?? i, y: numberOrText(p[1] ?? null), auto: p.length < 2 };
  if (isPlain(p)) {
    const xk = X_KEYS.find(k => p[k] !== undefined && p[k] !== null);
    const yk = Y_KEYS.find(k => p[k] !== undefined);
    return { x: xk ? p[xk] : i, y: yk ? numberOrText(p[yk]) : null, auto: !xk };
  }
  return { x: i, y: null, auto: true };
}

function numberOrText(v) {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (s === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : v;
}

/** A number from anything (NaN when it is not one). */
export function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null || v === undefined || v === '') return NaN;
  return Number(String(v).replace(',', '.'));
}

/**
 * A grid for the heatmap: { rows: [labels], cols: [labels], values: [[number|null]] } from a matrix
 * (array of arrays), { rows, cols, values } or series (rows = series, cols = x).
 */
export function toGrid(v, rowLabels = null, colLabels = null) {
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
  let values = [], rows = null, cols = null;
  if (Array.isArray(v) && v.length && v.every(Array.isArray)) values = v;
  else if (isPlain(v) && Array.isArray(v.values)) { values = v.values; rows = v.rows; cols = v.cols ?? v.columns; }
  else if (v !== null && v !== undefined) {
    const series = toSeries(v);
    const colSet = [];
    const seen = new Map();
    for (const s of series) for (const [i, raw] of s.data.entries()) { const p = pointOf(raw, i); const k = String(p.x); if (!seen.has(k)) { seen.set(k, colSet.length); colSet.push(k); } }
    rows = series.map(s => s.name);
    cols = colSet;
    values = series.map(s => { const r = new Array(colSet.length).fill(null); s.data.forEach((raw, i) => { const p = pointOf(raw, i); r[seen.get(String(p.x))] = p.y; }); return r; });
  }
  values = values.filter(Array.isArray).map(r => r.map(x => { const n = toNumber(x); return Number.isFinite(n) ? n : null; }));
  const nCols = Math.max(0, ...values.map(r => r.length));
  const list = (given, n) => Array.from({ length: n }, (_, i) => String(given?.[i] ?? i + 1));
  return { rows: list(rows?.length ? rows : rowLabels, values.length), cols: list(cols?.length ? cols : colLabels, nCols), values: values.map(r => [...r, ...new Array(nCols - r.length).fill(null)]) };
}

/** True/false states of the step chart, from booleans, 0/1 or on/off words. */
const TRUE = new Set(['true', 'on', '1', 'yes', 'sì', 'si', 'acceso', 'aperto']);
const FALSE = new Set(['false', 'off', '0', 'no', 'spento', 'chiuso']);
export function boolState(v) {
  if (typeof v === 'boolean') return v;
  if (v === 0 || v === 1) return v === 1;
  if (typeof v === 'string') { const s = v.trim().toLowerCase(); if (TRUE.has(s)) return true; if (FALSE.has(s)) return false; }
  return undefined;
}

/** A colour from data as CSS accepts it safely: #rgb…#rrggbbaa, rgb()/hsl() with numbers; else null. */
export function safeColor(v) {
  if (typeof v !== 'string') return null;
  const c = v.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(c) || /^(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/-]+\)$/.test(c) ? c : null;
}
