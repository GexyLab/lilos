/**
 * The data of a chart as a table (the table view, CSV) and the chart as a PNG image.
 */
import { formatNumber, formatTime } from './scale.js';
import { finite, boolState } from './data.js';
import { binsOf, countBins } from './kinds.js';

/**
 * The same data the chart shows: { head: [texts], rows: [[raw values]], types: ['text'|'num'|'time'|'pct'|'state'] }.
 * Every series is in it, the hidden ones too.
 */
export function tableOf(kind, model, opts, t) {
  if (kind === 'heatmap') {
    const g = model.grid ?? { rows: [], cols: [], values: [] };
    return { head: ['', ...g.cols], rows: g.values.map((r, i) => [g.rows[i], ...r]), types: ['text', ...g.cols.map(() => 'num')] };
  }
  const series = model.series;
  const name = (se, i) => se.name || (series.length > 1 ? `${t('series')} ${i + 1}` : t('value'));
  if (kind === 'pie') {
    // every slice, also those the chart folds into «Other»
    const list = (series.length > 1 && series.every(se => se.points.length === 1) ? series.map(se => [se.name, se.points[0].y]) : (series[0]?.points ?? []).map(p => [String(p.x), p.y]))
      .filter(([, v]) => finite(v) && v > 0);
    const total = list.reduce((a, [, v]) => a + v, 0);
    return { head: [t('name'), t('value'), t('share')], rows: list.map(([n, v]) => [n, v, total ? v / total * 100 : 0]), types: ['text', 'num', 'pct'] };
  }
  if (kind === 'scatter') {
    return { head: [t('series'), 'x', 'y'], rows: series.flatMap((se, i) => se.points.filter(p => finite(p.y)).map(p => [name(se, i), p.x, p.y])), types: ['text', model.xType === 'time' ? 'time' : 'num', 'num'] };
  }
  if (kind === 'histogram') {
    const per = series.map(se => se.points.map(p => p.y).filter(finite));
    const all = per.flat();
    const b = all.length ? binsOf(all, opts) : null;
    if (!b) return { head: [t('from'), t('to'), t('count')], rows: [], types: ['num', 'num', 'num'] };
    const counts = per.map(v => countBins(v, b));
    return {
      head: [t('from'), t('to'), ...series.map((se, i) => (series.length > 1 ? name(se, i) : t('count')))],
      rows: Array.from({ length: b.n }, (_, i) => [b.lo + i * b.step, b.lo + (i + 1) * b.step, ...counts.map(c => c[i])]),
      types: ['num', 'num', ...series.map(() => 'num')],
    };
  }
  // one row per x, one column per series
  const type = model.xType;
  let xs;
  if (type === 'cat') xs = [...model.categories];
  else xs = [...new Set(series.flatMap(se => se.points.map(p => p.x)))].filter(finite).sort((a, b) => a - b);
  const maps = series.map(se => new Map(se.points.map(p => [type === 'cat' ? String(p.x) : p.x, p.y])));
  const xHead = opts.xLabel || (type === 'time' ? t('time') : type === 'cat' ? t(kind === 'radar' ? 'axis' : 'category') : 'x');
  return {
    head: [xHead, ...series.map(name)],
    rows: xs.map(x => [x, ...maps.map(m => m.get(x) ?? null)]),
    types: [type === 'time' ? 'time' : type === 'cat' ? 'text' : 'num', ...series.map(() => (kind === 'step' ? 'state' : 'num'))],
  };
}

/** A cell for the table view. */
export function cellText(v, type, lang, opts, t) {
  if (v === null || v === undefined || v === '') return '';
  if (type === 'time') return finite(v) ? formatTime(v, lang, 1000, true) : String(v);
  if (type === 'pct') return `${formatNumber(v, lang, 1)}%`;
  if (type === 'state') { const b = boolState(v); return b === undefined ? String(v) : t(b ? 'on' : 'off'); }
  if (type === 'num') return finite(v) ? formatNumber(v, lang, Number.isInteger(opts.decimals) ? opts.decimals : null) : String(v);
  return String(v);
}

/** The table as CSV text (comma, dot for decimals, ISO times). */
export function csvOf(table) {
  const q = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const cell = (v, type) => (v === null || v === undefined ? '' : type === 'time' && finite(v) ? new Date(v).toISOString() : v);
  return [table.head.map(q).join(','), ...table.rows.map(r => r.map((v, i) => q(cell(v, table.types[i]))).join(','))].join('\r\n') + '\r\n';
}

const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linejoin', 'stroke-linecap',
  'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'paint-order', 'visibility', 'display', 'stop-color', 'stop-opacity'];

/**
 * The chart as a PNG Blob: title, legend and the drawing, on the chart's background. The styles
 * (theme variables) are written into a copy of the SVG, which then needs nothing else.
 */
export async function pngOf(svg, { background = '#fff', ink = '#000', dim = '#666', font = 'sans-serif', title = '', legend = [], scale = 2 } = {}) {
  const w = Number(svg.getAttribute('width')) || 300, h = Number(svg.getAttribute('height')) || 150;
  const clone = svg.cloneNode(true);
  const src = svg.querySelectorAll('*'), dst = clone.querySelectorAll('*');
  src.forEach((e, i) => {
    const cs = getComputedStyle(e);
    dst[i].setAttribute('style', PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';'));
  });
  clone.querySelectorAll('.overlay').forEach(e => e.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('PNG: drawing failed')); img.src = url; });
    const pad = 12;
    const head = (title ? 24 : 0) + (legend.length ? 22 : 0);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((w + pad * 2) * scale);
    canvas.height = Math.ceil((h + head + pad * 2) * scale);
    const c = canvas.getContext('2d');
    c.scale(scale, scale);
    c.fillStyle = background;
    c.fillRect(0, 0, w + pad * 2, h + head + pad * 2);
    let y = pad;
    if (title) { c.fillStyle = ink; c.font = `600 13px ${font}`; c.textBaseline = 'top'; c.fillText(title, pad, y); y += 24; }
    if (legend.length) {
      c.font = `11.5px ${font}`; c.textBaseline = 'middle';
      let x = pad;
      for (const it of legend) {
        c.fillStyle = it.color; c.fillRect(x, y + 3, 10, 10);
        c.fillStyle = it.off ? dim : ink; c.fillText(it.name, x + 15, y + 8);
        x += 15 + c.measureText(it.name).width + 14;
      }
      y += 22;
    }
    c.drawImage(img, pad, y, w, h);
    return await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('PNG: no image'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
