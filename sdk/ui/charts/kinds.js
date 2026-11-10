/**
 * The kinds of the SDK charts, drawn in SVG. Each kind is a function (ctx) → layout, where
 *   ctx: { g, w, h, opts, lang, t, model, series (the visible ones), hidden, clipId, font, fmt, colorOf }
 *   layout: { size, at(i) → target, hit(mx, my) → index | target | -1, nav?(i, key) → i }
 *   target: { x, y, guide?, band?, dots?, mark?, title, rows: [{ color, name, value }], pick }
 * The time-series kinds (line, area, live, step, spark) only need { points: [{ x, y }] } sorted
 * by x, so a faster renderer (canvas, WebGL) can take their place behind the same layout.
 */
import { niceTicks, decimalsOf, timeTicks, formatNumber, formatTime, textWidth, fitText, nearest, lastAtOrBefore } from './scale.js';
import { finite, boolState, toNumber } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') e.textContent = String(v);
    else e.setAttribute(k, typeof v === 'number' ? String(Math.round(v * 10) / 10) : v);
  }
  parent?.append(e);
  return e;
}
const crisp = v => Math.round(v) + 0.5;
const S = 1000, M = 60 * S, D = 24 * 60 * M;

/** The title of a point's x in a tooltip. */
export function xTitle(ctx, x, span = 0) {
  const type = ctx.model.xType;
  if (type === 'time') return span && span < D ? formatTime(x, ctx.lang, span < 15 * M ? S : M) : formatTime(x, ctx.lang, M, true);
  if (type === 'cat') return String(ctx.model.categories[x] ?? x);
  return formatNumber(x, ctx.lang);
}

function empty(ctx) {
  s('text', { x: ctx.w / 2, y: ctx.h / 2, class: 'empty', 'text-anchor': 'middle', dy: '0.32em', text: ctx.t('empty') }, ctx.g);
  return { size: 0, empty: true };
}

/** Labels along a horizontal axis, those that would overlap left out. */
function xLabels(ctx, items, y, minX = 0, maxX = ctx.w) {
  let lastRight = -Infinity;
  const g = s('g', { class: 'xl' }, ctx.g);
  for (const { x, text } of items) {
    if (!text) continue;
    const tw = textWidth(text, ctx.font);
    let left = x - tw / 2, anchor = 'middle', ax = x;
    if (left < minX) { left = minX; anchor = 'start'; ax = minX; }
    if (left + tw > maxX) { left = maxX - tw; anchor = 'end'; ax = maxX; }
    if (left < lastRight + 8) continue;
    s('text', { x: ax, y, 'text-anchor': anchor, text }, g);
    lastRight = left + tw;
  }
}

/**
 * The value axis on the left and the x axis below: grid, ticks, labels.
 * x: { type: 'cat', cats } | { type: 'num' | 'time', min, max }
 */
function axesXY(ctx, { yMin, yMax, includeZero = false, integer = false, x, top = null, clipLeft = 6 }) {
  const { w, h, opts, g, font } = ctx;
  if (!finite(yMin) || !finite(yMax)) { yMin = 0; yMax = 1; }
  if (includeZero) { yMin = Math.min(0, yMin); yMax = Math.max(0, yMax); }
  const y0 = top ?? (opts.unit ? 20 : 10), bottom = 24;
  const count = Math.max(2, Math.min(8, Math.floor((h - y0 - bottom) / 34)));
  const yt = niceTicks(yMin, yMax, count, { fixedMin: toNumber(opts.min), fixedMax: toNumber(opts.max), integer });
  const dec = decimalsOf(yt.step);
  const labels = yt.ticks.map(v => formatNumber(v, ctx.lang, dec));
  const left = Math.ceil(Math.max(0, ...labels.map(l => textWidth(l, font)))) + 14;
  const x0 = left, x1 = w - 14, y1 = h - bottom;
  const sy = v => y1 - (v - yt.min) / ((yt.max - yt.min) || 1) * (y1 - y0);
  const grid = s('g', { class: 'grid' }, g);
  const yl = s('g', { class: 'yl' }, g);
  yt.ticks.forEach((v, i) => {
    const y = crisp(sy(v));
    if (v !== yt.min) s('line', { x1: x0, x2: x1, y1: y, y2: y }, grid);
    s('text', { x: x0 - 8, y, 'text-anchor': 'end', dy: '0.32em', text: labels[i] }, yl);
  });
  if (opts.unit) s('text', { x: x0 - 8, y: y0 - 11, class: 'unit', 'text-anchor': 'end', text: opts.unit }, g);
  let sx, band = 0;
  if (x.type === 'cat') {
    const n = Math.max(1, x.cats.length);
    band = (x1 - x0) / n;
    sx = i => x0 + (i + 0.5) * band;
    const maxW = Math.max(band - 6, 40);
    xLabels(ctx, x.cats.map((c, i) => ({ x: sx(i), text: fitText(c, maxW, font) })), y1 + 16, 0, w);
  } else {
    const span = (x.max - x.min) || 1;
    sx = v => x0 + (v - x.min) / span * (x1 - x0);
    const n = Math.max(3, Math.floor((x1 - x0) / 80));
    if (x.type === 'time') {
      const tt = timeTicks(x.min, x.max, n);
      xLabels(ctx, tt.ticks.map(t => ({ x: sx(t), text: formatTime(t, ctx.lang, tt.step) })), y1 + 16, 0, w);
    } else {
      const nt = niceTicks(x.min, x.max, n);
      const d = decimalsOf(nt.step);
      xLabels(ctx, nt.ticks.filter(v => v >= x.min - 1e-9 && v <= x.max + 1e-9).map(v => ({ x: sx(v), text: formatNumber(v, ctx.lang, d) })), y1 + 16, 0, w);
    }
  }
  s('line', { class: 'base', x1: x0, x2: x1, y1: crisp(y1), y2: crisp(y1) }, g);
  const zero = yt.min < 0 && yt.max > 0 ? sy(0) : null;
  if (zero !== null) s('line', { class: 'zero', x1: x0, x2: x1, y1: crisp(zero), y2: crisp(zero) }, g);
  const base = yt.min >= 0 ? y1 : yt.max <= 0 ? y0 : sy(0);
  // where the marks may go (the live line enters from the left edge)
  s('rect', { x: x0 - clipLeft, y: y0 - 6, width: Math.max(0, x1 - x0 + clipLeft + 6), height: Math.max(0, y1 - y0 + 12) }, s('clipPath', { id: ctx.clipId }, s('defs', {}, g)));
  return { x0, x1, y0, y1, sx, sy, yt, band, base };
}

const pathOf = (pts, X, Y) => {
  let d = '', open = false;
  for (const p of pts) {
    if (!finite(p.y)) { open = false; continue; }
    d += `${open ? 'L' : 'M'}${X(p).toFixed(1)} ${Y(p).toFixed(1)}`;
    open = true;
  }
  return d;
};

const areaOf = (pts, X, Y, base) => {
  let d = '', run = [];
  const flush = () => {
    if (run.length) d += `M${X(run[0]).toFixed(1)} ${base.toFixed(1)}${run.map(p => `L${X(p).toFixed(1)} ${Y(p).toFixed(1)}`).join('')}L${X(run[run.length - 1]).toFixed(1)} ${base.toFixed(1)}Z`;
    run = [];
  };
  for (const p of pts) { if (finite(p.y)) run.push(p); else flush(); }
  flush();
  return d;
};

const lineStyle = (se, extra = '') => `stroke:${se.color};${se.dash ? 'stroke-dasharray:6 3;' : ''}${extra}`;

/** line, area (stacked or 100 %) and live (the last `window` seconds, scrolling). */
function xy(ctx, mode) {
  const { model, opts, series, g } = ctx;
  if (!series.length) return empty(ctx);
  const type = model.xType;
  const xOf = type === 'cat' ? (p => model.catIndex.get(String(p.x))) : (p => p.x);
  let xMin = Infinity, xMax = -Infinity;
  for (const se of series) for (const p of se.points) { const x = xOf(p); if (finite(x) && finite(p.y)) { if (x < xMin) xMin = x; if (x > xMax) xMax = x; } }
  const live = mode === 'live';
  if (live) {
    const win = Math.max(1, toNumber(opts.window) || 60) * 1000;
    xMax = opts.paused && finite(xMax) ? xMax : Date.now();
    xMin = xMax - win;
  }
  if (!finite(xMin)) return empty(ctx);
  if (type === 'cat') { xMin = 0; xMax = Math.max(0, model.categories.length - 1); }
  const inside = p => { const x = xOf(p); return x >= xMin && x <= xMax; };
  const stacked = mode === 'area' && !!opts.stacked && opts.stacked !== 'none';
  const percent = stacked && opts.stacked === 'percent';
  let yMin = Infinity, yMax = -Infinity, layers = null, xs;
  if (stacked) {
    xs = [...new Set(series.flatMap(se => se.points.filter(p => finite(p.y)).map(xOf)))].filter(finite).sort((a, b) => a - b);
    const maps = series.map(se => new Map(se.points.filter(p => finite(p.y)).map(p => [xOf(p), Math.max(0, p.y)])));
    const totals = xs.map(x => maps.reduce((a, m) => a + (m.get(x) ?? 0), 0));
    let base = xs.map(() => 0);
    layers = series.map((se, k) => {
      const lo = base;
      const hi = xs.map((x, j) => lo[j] + (percent ? (totals[j] ? (maps[k].get(x) ?? 0) / totals[j] * 100 : 0) : (maps[k].get(x) ?? 0)));
      base = hi;
      return { se, lo, hi, map: maps[k] };
    });
    yMin = 0; yMax = percent ? 100 : Math.max(0, ...base);
  } else {
    for (const se of series) for (const p of se.points) if (finite(p.y) && (!live || inside(p))) { if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y; }
  }
  const ax = axesXY(ctx, { yMin, yMax, includeZero: mode === 'area', clipLeft: live ? 0 : 6, x: type === 'cat' ? { type, cats: model.categories } : { type, min: xMin, max: xMax } });
  const X = type === 'cat' ? (p => ax.sx(xOf(p))) : (p => ax.sx(p.x));
  const marks = s('g', { 'clip-path': `url(#${ctx.clipId})` }, g);
  if (stacked) {
    for (const { se, lo, hi } of layers) {
      const up = xs.map((x, j) => `${ax.sx(x).toFixed(1)} ${ax.sy(hi[j]).toFixed(1)}`);
      const down = xs.map((x, j) => `${ax.sx(x).toFixed(1)} ${ax.sy(lo[j]).toFixed(1)}`).reverse();
      s('path', { class: 'fill', d: `M${up.join('L')}L${down.join('L')}Z`, style: `fill:${se.color}` }, marks);
      s('path', { class: 'line', d: `M${up.join('L')}`, style: lineStyle(se) }, marks);
    }
  } else {
    for (const se of series) {
      const pts = se.points;
      if (mode === 'area') s('path', { class: 'fill', d: areaOf(pts, X, p => ax.sy(p.y), ax.base), style: `fill:${se.color}` }, marks);
      s('path', { class: 'line', d: pathOf(pts, X, p => ax.sy(p.y)), style: lineStyle(se) }, marks);
      const n = pts.length;
      if (mode === 'line' && n && n * 14 < ax.x1 - ax.x0) {
        for (const p of pts) if (finite(p.y)) s('circle', { class: 'dot', cx: X(p), cy: ax.sy(p.y), r: 3, style: `fill:${se.color}` }, marks);
      }
    }
  }
  // the x values a tooltip stops on
  if (!stacked) xs = [...new Set(series.flatMap(se => se.points.filter(p => finite(p.y) && inside(p)).map(xOf)))].filter(finite).sort((a, b) => a - b);
  const span = xMax - xMin;
  const tol = 3 * span / Math.max(1, ax.x1 - ax.x0);
  const valueAt = (se, x) => {
    if (type === 'cat') { for (let i = se.points.length - 1; i >= 0; i--) if (xOf(se.points[i]) === x) return se.points[i].y; return null; }
    const i = nearest(se.points, x, p => p.x);
    const p = se.points[i];
    return p && Math.abs(p.x - x) <= tol ? p.y : null;
  };
  const at = i => {
    const x = xs[i];
    const cx = ax.sx(x);
    const rows = [], dots = [], values = {};
    series.forEach((se, k) => {
      const v = stacked ? layers[k].map.get(x) ?? null : valueAt(se, x);
      if (!finite(v)) return;
      const y = stacked ? ax.sy(layers[k].hi[xs.indexOf(x)]) : ax.sy(v);
      rows.push({ color: se.color, name: se.name, value: ctx.fmt(v) });
      dots.push({ x: cx, y, color: se.color, name: se.name, v });
      values[se.name || ctx.t('value')] = v;
    });
    const raw = type === 'cat' ? model.categories[x] : x;
    return {
      x: cx, y: dots.length ? Math.min(...dots.map(d => d.y)) : (ax.y0 + ax.y1) / 2, guide: { x: cx, y0: ax.y0, y1: ax.y1 }, dots,
      title: xTitle(ctx, x, live ? span : 0), rows,
      pick: { x: raw, ...(type === 'time' && { time: new Date(x).toISOString() }), values, index: i },
    };
  };
  return {
    size: xs.length, at,
    hit(mx) {
      if (mx < ax.x0 - 12 || mx > ax.x1 + 12 || !xs.length) return -1;
      const v = type === 'cat' ? (mx - ax.x0) / ax.band - 0.5 : xMin + (mx - ax.x0) / (ax.x1 - ax.x0) * span;
      return nearest(xs, v);
    },
  };
}

/** Values of the series by category: [series][category]. */
function byCategory(ctx) {
  const { model, series } = ctx;
  return series.map(se => {
    const a = new Array(model.categories.length).fill(null);
    for (const p of se.points) { const i = model.catIndex.get(String(p.x)); if (i !== undefined && finite(p.y)) a[i] = p.y; }
    return a;
  });
}

function stackedExtent(vals, n) {
  let lo = 0, hi = 0;
  for (let i = 0; i < n; i++) {
    let pos = 0, neg = 0;
    for (const a of vals) { const v = a[i]; if (finite(v)) { if (v >= 0) pos += v; else neg += v; } }
    hi = Math.max(hi, pos); lo = Math.min(lo, neg);
  }
  return [lo, hi];
}

const categoryTarget = (ctx, vals, i, extra) => {
  const rows = [], values = {};
  ctx.series.forEach((se, k) => {
    const v = vals[k][i];
    if (!finite(v)) return;
    rows.push({ color: se.color, name: se.name, value: ctx.fmt(v) });
    values[se.name || ctx.t('value')] = v;
  });
  return { title: ctx.model.categories[i], rows, pick: { category: ctx.model.categories[i], values, index: i }, ...extra };
};

function column(ctx) {
  const { model, series, opts, g } = ctx;
  const cats = model.categories;
  if (!cats.length || !series.length) return empty(ctx);
  const vals = byCategory(ctx);
  const stacked = !!opts.stacked && opts.stacked !== 'none';
  const flat = vals.flat().filter(finite);
  const [yMin, yMax] = stacked ? stackedExtent(vals, cats.length) : [Math.min(0, ...flat), Math.max(0, ...flat)];
  const ax = axesXY(ctx, { yMin, yMax, includeZero: true, x: { type: 'cat', cats } });
  const k = series.length;
  const inner = Math.min(ax.band * 0.72, stacked ? 64 : k * 40 + (k - 1) * 2);
  const bw = stacked ? inner : Math.max(1, (inner - 2 * (k - 1)) / k);
  const marks = s('g', { class: 'bars' }, g);
  const tops = new Array(cats.length).fill(ax.base);
  for (let i = 0; i < cats.length; i++) {
    const cx = ax.sx(i);
    let pos = 0, neg = 0;
    series.forEach((se, j) => {
      const v = vals[j][i];
      if (!finite(v)) return;
      let a, b;
      if (stacked) { if (v >= 0) { a = ax.sy(pos); b = ax.sy(pos + v); pos += v; } else { a = ax.sy(neg); b = ax.sy(neg + v); neg += v; } }
      else { a = ax.base; b = ax.sy(v); }
      let y = Math.min(a, b), hh = Math.abs(a - b);
      if (stacked && hh > 3) { y += 1; hh -= 2; }
      const x = stacked ? cx - inner / 2 : cx - inner / 2 + j * (bw + 2);
      s('rect', { class: 'bar', x, y, width: bw, height: Math.max(hh, v ? 1 : 0), rx: Math.min(2, bw / 3), style: `fill:${se.color}`, 'data-series': se.name, 'data-value': String(v) }, marks);
      tops[i] = Math.min(tops[i], y);
    });
  }
  return {
    size: cats.length,
    at: i => categoryTarget(ctx, vals, i, { x: ax.sx(i), y: tops[i], band: { x: ax.x0 + i * ax.band, y: ax.y0, w: ax.band, h: ax.y1 - ax.y0 } }),
    hit(mx) { const i = Math.floor((mx - ax.x0) / ax.band); return i >= 0 && i < cats.length ? i : -1; },
  };
}

/** Horizontal bars, sortable; one series gets its values written at the end of the bars. */
function bar(ctx) {
  const { model, series, opts, g, w, h, font } = ctx;
  const cats = model.categories;
  if (!cats.length || !series.length) return empty(ctx);
  const vals = byCategory(ctx);
  const stacked = !!opts.stacked && opts.stacked !== 'none';
  let order = cats.map((_, i) => i);
  if (opts.sort === 'asc' || opts.sort === 'desc') {
    const tot = i => vals.reduce((a, r) => a + (finite(r[i]) ? r[i] : 0), 0);
    order.sort((a, b) => (opts.sort === 'asc' ? tot(a) - tot(b) : tot(b) - tot(a)));
  }
  const flat = vals.flat().filter(finite);
  let [lo, hi] = stacked ? stackedExtent(vals, cats.length) : [Math.min(0, ...flat), Math.max(0, ...flat)];
  const showValues = series.length === 1;
  const valueW = showValues ? Math.max(0, ...flat.map(v => textWidth(ctx.fmt(v), font))) + 8 : 0;
  const labelW = Math.min(w * 0.38, Math.max(0, ...cats.map(c => textWidth(c, font))) + 12);
  const x0 = Math.ceil(labelW), x1 = w - 14 - valueW, y0 = opts.unit ? 18 : 6, y1 = h - 24;
  const xt = niceTicks(Math.min(0, lo), Math.max(0, hi), Math.max(3, Math.floor((x1 - x0) / 80)), { fixedMin: toNumber(opts.min), fixedMax: toNumber(opts.max) });
  const sx = v => x0 + (v - xt.min) / ((xt.max - xt.min) || 1) * (x1 - x0);
  const grid = s('g', { class: 'grid' }, g);
  const d = decimalsOf(xt.step);
  xt.ticks.forEach(v => { if (v !== xt.min) s('line', { x1: crisp(sx(v)), x2: crisp(sx(v)), y1: y0, y2: y1 }, grid); });
  xLabels(ctx, xt.ticks.map(v => ({ x: sx(v), text: formatNumber(v, ctx.lang, d) })), y1 + 16, 0, w);
  if (opts.unit) s('text', { x: x1, y: y0 - 7, class: 'unit', 'text-anchor': 'end', text: opts.unit }, g);
  const zx = sx(Math.max(xt.min, Math.min(xt.max, 0)));
  s('line', { class: 'base', x1: crisp(zx), x2: crisp(zx), y1: y0, y2: y1 }, g);
  const band = (y1 - y0) / cats.length;
  const k = series.length;
  const inner = Math.min(band * 0.72, stacked ? 32 : k * 22 + (k - 1) * 2);
  const bh = stacked ? inner : Math.max(1, (inner - 2 * (k - 1)) / k);
  const marks = s('g', { class: 'bars' }, g);
  const labels = s('g', { class: 'cl' }, g);
  const ends = new Array(cats.length).fill(zx);
  order.forEach((i, row) => {
    const cy = y0 + (row + 0.5) * band;
    s('text', { x: x0 - 8, y: cy, 'text-anchor': 'end', dy: '0.32em', text: fitText(cats[i], labelW - 12, font) }, labels);
    let pos = 0, neg = 0;
    series.forEach((se, j) => {
      const v = vals[j][i];
      if (!finite(v)) return;
      let a, b;
      if (stacked) { if (v >= 0) { a = sx(pos); b = sx(pos + v); pos += v; } else { a = sx(neg); b = sx(neg + v); neg += v; } }
      else { a = zx; b = sx(v); }
      let x = Math.min(a, b), ww = Math.abs(a - b);
      if (stacked && ww > 3) { x += 1; ww -= 2; }
      const y = stacked ? cy - inner / 2 : cy - inner / 2 + j * (bh + 2);
      s('rect', { class: 'bar', x, y, width: Math.max(ww, v ? 1 : 0), height: bh, rx: Math.min(2, bh / 3), style: `fill:${se.color}`, 'data-series': se.name, 'data-value': String(v) }, marks);
      ends[i] = Math.max(ends[i], x + ww);
      if (showValues && bh >= 10) s('text', { class: 'vl', x: v >= 0 ? x + ww + 5 : x - 5, y: y + bh / 2, 'text-anchor': v >= 0 ? 'start' : 'end', dy: '0.32em', text: ctx.fmt(v) }, g);
    });
  });
  return {
    size: order.length,
    at: r => { const i = order[r]; const cy = y0 + (r + 0.5) * band; return categoryTarget(ctx, vals, i, { x: ends[i], y: cy, band: { x: x0, y: y0 + r * band, w: x1 - x0, h: band } }); },
    hit(mx, my) { const r = Math.floor((my - y0) / band); return r >= 0 && r < order.length ? r : -1; },
  };
}

/** The slices of a pie: the first series' points (name → value), or one slice per series of one point. At most 6. */
export function slicesOf(model, t) {
  const list = model.series;
  let sl;
  if (list.length > 1 && list.every(se => se.points.length === 1)) sl = list.map((se, i) => ({ key: se.key, name: se.name, value: se.points[0].y, index: i }));
  else sl = (list[0]?.points ?? []).map((p, i) => ({ key: `p:${p.x}`, name: String(p.x), value: p.y, index: i }));
  sl = sl.filter(x => finite(x.value) && x.value > 0);
  if (sl.length > 6) {
    const keep = new Set([...sl].sort((a, b) => b.value - a.value).slice(0, 5));
    const rest = sl.filter(x => !keep.has(x));
    sl = sl.filter(x => keep.has(x));
    sl.push({ key: 'p:\u0000other', name: t('other'), value: rest.reduce((a, x) => a + x.value, 0), index: -1, other: true, parts: rest.map(x => x.name) });
  }
  return sl;
}

function pie(ctx) {
  const { model, g, w, h, opts, hidden, t } = ctx;
  const slices = slicesOf(model, t).map(sl => ({ ...sl, color: sl.other ? 'var(--lui-chart-other)' : ctx.colorOf(sl.index) })).filter(sl => !hidden.has(sl.key));
  const total = slices.reduce((a, x) => a + x.value, 0);
  if (!slices.length || !(total > 0)) return empty(ctx);
  const cx = w / 2, cy = h / 2, r = Math.max(10, Math.min(w, h) / 2 - 8);
  const ri = opts.donut ? r * 0.6 : 0;
  let a = -Math.PI / 2;
  const P = (ang, rad) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
  const marks = s('g', { class: 'slices' }, g);
  const out = slices.map((sl, i) => {
    const a0 = a, a1 = a + sl.value / total * Math.PI * 2;
    a = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    let d;
    if (slices.length === 1) {
      d = `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z` + (ri ? `M${cx - ri} ${cy}A${ri} ${ri} 0 1 0 ${cx + ri} ${cy}A${ri} ${ri} 0 1 0 ${cx - ri} ${cy}Z` : '');
    } else {
      const [x0, y0] = P(a0, r), [x1, y1] = P(a1, r);
      if (ri) { const [x2, y2] = P(a1, ri), [x3, y3] = P(a0, ri); d = `M${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 ${large} 0 ${x3} ${y3}Z`; }
      else d = `M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}Z`;
    }
    const mark = s('path', { class: 'slice', d, style: `fill:${sl.color}`, 'fill-rule': 'evenodd', 'data-series': sl.name, 'data-value': String(sl.value) }, marks);
    const share = sl.value / total;
    const mid = (a0 + a1) / 2;
    if (share >= 0.06 && r > 40) {
      const [lx, ly] = P(mid, ri ? (r + ri) / 2 : r * 0.64);
      s('text', { class: `pl${!sl.other && sl.index % 8 === 3 ? ' dark' : ''}`, x: lx, y: ly, 'text-anchor': 'middle', dy: '0.32em', text: `${formatNumber(share * 100, ctx.lang, 0)}%` }, g);
    }
    const [tx, ty] = P(mid, r * 0.9);
    return { sl, a0, a1, mark, x: tx, y: ty, share };
  });
  if (ri) {
    s('text', { class: 'total', x: cx, y: cy - 2, 'text-anchor': 'middle', text: ctx.fmt(total) }, g);
    s('text', { class: 'totl', x: cx, y: cy + 14, 'text-anchor': 'middle', text: t('total') }, g);
  }
  return {
    size: out.length,
    at: i => {
      const o = out[i];
      return {
        x: o.x, y: o.y, mark: o.mark, title: o.sl.name,
        rows: [{ color: o.sl.color, name: ctx.fmt(o.sl.value), value: `${formatNumber(o.share * 100, ctx.lang, 1)}%` }, ...(o.sl.parts ? [{ name: o.sl.parts.slice(0, 6).join(', ') + (o.sl.parts.length > 6 ? '…' : ''), value: '' }] : [])],
        pick: { name: o.sl.name, value: o.sl.value, share: o.share, index: i },
      };
    },
    hit(mx, my) {
      const dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy);
      if (dist > r + 4 || dist < ri - 2) return -1;
      let ang = Math.atan2(dy, dx);
      if (ang < -Math.PI / 2) ang += Math.PI * 2;
      return out.findIndex(o => ang >= o.a0 && ang <= o.a1);
    },
  };
}

function scatter(ctx) {
  const { model, series, g } = ctx;
  const all = series.flatMap(se => se.points.filter(p => finite(p.y) && finite(p.x)).map(p => ({ p, se })));
  if (!all.length) return empty(ctx);
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const { p } of all) { xMin = Math.min(xMin, p.x); xMax = Math.max(xMax, p.x); yMin = Math.min(yMin, p.y); yMax = Math.max(yMax, p.y); }
  const type = model.xType === 'time' ? 'time' : 'num';
  // a little room around the points, so that none sits on an edge
  const px = (xMax - xMin) * 0.04 || 1, py = (yMax - yMin) * 0.04 || 1;
  yMin -= py; yMax += py;
  if (type === 'num') { const nt = niceTicks(xMin - px, xMax + px, 6); xMin = nt.min; xMax = nt.max; }
  else if (xMin === xMax) { xMin -= M; xMax += M; }
  const ax = axesXY(ctx, { yMin, yMax, x: { type, min: xMin, max: xMax } });
  const marks = s('g', { class: 'points' }, g);
  all.sort((a, b) => a.p.x - b.p.x);
  for (const it of all) {
    it.cx = ax.sx(it.p.x); it.cy = ax.sy(it.p.y);
    s('circle', { class: 'pt', cx: it.cx, cy: it.cy, r: 4, style: `fill:${it.se.color}`, 'data-series': it.se.name, 'data-value': String(it.p.y) }, marks);
  }
  return {
    size: all.length,
    at: i => {
      const it = all[i];
      const xs = type === 'time' ? formatTime(it.p.x, ctx.lang, S, true) : formatNumber(it.p.x, ctx.lang);
      return {
        x: it.cx, y: it.cy, dots: [{ x: it.cx, y: it.cy, color: it.se.color, r: 6 }], title: it.se.name || ctx.t('point'),
        rows: [{ name: 'x', value: xs }, { name: 'y', value: ctx.fmt(it.p.y) }],
        pick: { series: it.se.name, x: it.p.x, y: it.p.y, ...(it.p.label && { label: it.p.label }), index: i },
      };
    },
    hit(mx, my) {
      let best = -1, bd = 24 * 24;
      all.forEach((it, i) => { const d = (it.cx - mx) ** 2 + (it.cy - my) ** 2; if (d < bd) { bd = d; best = i; } });
      return best;
    },
  };
}

/** The classes of a histogram: { lo, step, n } from options.bins (number) / binWidth, or automatic. */
export function binsOf(values, opts) {
  let min = Math.min(...values), max = Math.max(...values);
  if (!finite(min)) return null;
  if (min === max) { min -= 0.5; max += 0.5; }
  const width = toNumber(opts.binWidth);
  const fixed = Math.round(toNumber(opts.bins));
  let lo, step, n;
  if (width > 0) { step = width; lo = Math.floor(min / step) * step; n = Math.max(1, Math.ceil((max - lo) / step + 1e-9)); }
  else if (fixed > 0) { n = Math.min(200, fixed); step = (max - min) / n; lo = min; }
  else {
    const k = Math.ceil(Math.log2(values.length) + 1);
    step = niceTicks(min, max, Math.max(1, k)).step;
    lo = Math.floor(min / step) * step;
    n = Math.max(1, Math.ceil((max - lo) / step + 1e-9));
  }
  if (lo + n * step <= max) n++;
  return { lo, step, n: Math.min(n, 500) };
}

export function countBins(values, b) {
  const c = new Array(b.n).fill(0);
  for (const v of values) { const i = Math.min(b.n - 1, Math.max(0, Math.floor((v - b.lo) / b.step + 1e-9))); c[i]++; }
  return c;
}

function histogram(ctx) {
  const { series, g, opts } = ctx;
  const per = series.map(se => se.points.map(p => p.y).filter(finite));
  const all = per.flat();
  if (!all.length) return empty(ctx);
  const b = binsOf(all, opts);
  const counts = per.map(v => countBins(v, b));
  const hi = Math.max(1, ...counts.flat());
  const xMax = b.lo + b.n * b.step;
  const ax = axesXY(ctx, { yMin: 0, yMax: hi, includeZero: true, integer: true, x: { type: 'num', min: b.lo, max: xMax } });
  const k = series.length;
  const marks = s('g', { class: 'bars' }, g);
  const tops = new Array(b.n).fill(ax.base);
  for (let i = 0; i < b.n; i++) {
    const a = ax.sx(b.lo + i * b.step), z = ax.sx(b.lo + (i + 1) * b.step);
    const inner = Math.max(1, z - a - 2), bw = Math.max(1, (inner - (k - 1)) / k);
    series.forEach((se, j) => {
      const c = counts[j][i];
      if (!c) return;
      const y = ax.sy(c);
      s('rect', { class: 'bar', x: a + 1 + j * (bw + 1), y, width: bw, height: Math.max(1, ax.base - y), rx: Math.min(2, bw / 3), style: `fill:${se.color}`, 'data-series': se.name, 'data-value': String(c) }, marks);
      tops[i] = Math.min(tops[i], y);
    });
  }
  const d = Math.max(decimalsOf(b.step), toNumber(opts.decimals) >= 0 ? toNumber(opts.decimals) : 0);
  const edge = v => formatNumber(v, ctx.lang, Math.min(6, d));
  return {
    size: b.n,
    at: i => {
      const from = b.lo + i * b.step, to = from + b.step;
      const rows = series.map((se, j) => ({ color: se.color, name: series.length > 1 ? se.name : ctx.t('count'), value: formatNumber(counts[j][i], ctx.lang, 0) }));
      const cx = ax.sx(from + b.step / 2);
      return {
        x: cx, y: tops[i], band: { x: ax.sx(from), y: ax.y0, w: ax.sx(to) - ax.sx(from), h: ax.y1 - ax.y0 },
        title: `${edge(from)} – ${edge(to)}${opts.unit ? `\u00a0${opts.unit}` : ''}`, rows,
        pick: { from, to, counts: Object.fromEntries(series.map((se, j) => [se.name || ctx.t('count'), counts[j][i]])), index: i },
      };
    },
    hit(mx) { const i = Math.floor((mx - ax.x0) / ((ax.x1 - ax.x0) / b.n)); return i >= 0 && i < b.n ? i : -1; },
  };
}

/** States over time, one lane per series: true/false (a band in the series' colour) or texts (a colour per state). */
function step(ctx) {
  const { series, g, w, h, opts, font, t } = ctx;
  if (!series.length) return empty(ctx);
  let xMin = Infinity, xMax = -Infinity;
  for (const se of series) for (const p of se.points) { if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x; }
  if (!finite(xMin)) return empty(ctx);
  const end = opts.paused ? xMax : Math.max(xMax, Date.now());
  const win = toNumber(opts.window) > 0 ? toNumber(opts.window) * 1000 : 0;
  const start = win ? end - win : xMin;
  const span = Math.max(1, end - start);
  const labelW = Math.min(w * 0.35, Math.max(0, ...series.map(se => textWidth(se.name, font))) + 14);
  const x0 = Math.ceil(labelW), x1 = w - 14, y0 = 6, y1 = h - 24;
  const sx = v => x0 + (v - start) / span * (x1 - x0);
  const lane = Math.min(34, (y1 - y0) / series.length);
  const tt = timeTicks(start, end, Math.max(3, Math.floor((x1 - x0) / 80)));
  const grid = s('g', { class: 'grid' }, g);
  tt.ticks.forEach(v => s('line', { x1: crisp(sx(v)), x2: crisp(sx(v)), y1: y0, y2: y0 + lane * series.length }, grid));
  const ly = y0 + lane * series.length;
  xLabels(ctx, tt.ticks.map(v => ({ x: sx(v), text: formatTime(v, ctx.lang, tt.step) })), ly + 16, 0, w);
  s('line', { class: 'base', x1: x0, x2: x1, y1: crisp(ly), y2: crisp(ly) }, g);
  s('rect', { x: x0, y: 0, width: Math.max(0, x1 - x0), height: h }, s('clipPath', { id: ctx.clipId }, s('defs', {}, g)));
  const states = new Map();      // text state → colour slot, in order of appearance
  const stateColor = v => { const k = String(v); if (!states.has(k)) states.set(k, states.size); return `var(--lui-chart-${(states.get(k) % 8) + 1})`; };
  const marks = s('g', { 'clip-path': `url(#${ctx.clipId})` }, g);
  const labels = s('g', { class: 'cl' }, g);
  const lanes = series.map((se, k) => {
    const isBool = se.points.every(p => p.y === null || boolState(p.y) !== undefined);
    const top = y0 + k * lane, pad = Math.max(3, lane * 0.18), bh = lane - pad * 2;
    s('text', { x: x0 - 8, y: top + lane / 2, 'text-anchor': 'end', dy: '0.32em', text: fitText(se.name, labelW - 14, font) }, labels);
    const first = Math.max(0, lastAtOrBefore(se.points, start, p => p.x));
    for (let i = first; i < se.points.length; i++) {
      const p = se.points[i];
      if (p.y === null || p.y === undefined) continue;
      const a = sx(Math.max(start, p.x)), z = sx(Math.min(end, se.points[i + 1]?.x ?? end));
      if (z <= a) continue;
      if (isBool) {
        if (boolState(p.y)) s('rect', { class: 'state', x: a, y: top + pad, width: z - a, height: bh, rx: 2, style: `fill:${se.color}` }, marks);
        else s('line', { class: 'off', x1: a, x2: z, y1: top + lane / 2, y2: top + lane / 2 }, marks);
      } else {
        const color = stateColor(p.y);
        s('rect', { class: 'state', x: a + 0.5, y: top + pad, width: Math.max(1, z - a - 1), height: bh, rx: 2, style: `fill:${color}` }, marks);
        const text = String(p.y);
        if (z - a > textWidth(text, font) + 10 && bh >= 12) s('text', { class: `sl${states.get(text) % 8 === 3 ? ' dark' : ''}`, x: a + 5, y: top + lane / 2, dy: '0.32em', text }, marks);
      }
    }
    return { se, isBool };
  });
  const stateText = (l, v) => (l.isBool ? t(boolState(v) ? 'on' : 'off') : String(v));
  const swatch = (l, v) => (l.isBool ? (boolState(v) ? l.se.color : 'var(--lui-chart-axis)') : stateColor(v));
  const targetAt = time => {
    const rows = [], values = {};
    for (const l of lanes) {
      const i = lastAtOrBefore(l.se.points, time, p => p.x);
      const v = l.se.points[i]?.y;
      if (i < 0 || v === null || v === undefined) continue;
      rows.push({ color: swatch(l, v), name: l.se.name, value: stateText(l, v) });
      values[l.se.name] = l.isBool ? boolState(v) : v;
    }
    const x = sx(time);
    return { x, y: y0 + lane * series.length / 2, guide: { x, y0, y1: ly }, title: formatTime(time, ctx.lang, span < D ? S : M, span >= D), rows, pick: { time: new Date(time).toISOString(), x: time, values } };
  };
  const changes = [...new Set(series.flatMap(se => se.points.map(p => p.x)))].filter(x => x >= start && x <= end).sort((a, b) => a - b);
  return {
    size: changes.length,
    at: i => targetAt(changes[i]),
    hit(mx) { if (mx < x0 || mx > x1) return -1; return targetAt(start + (mx - x0) / (x1 - x0) * span); },
  };
}

function heatmap(ctx) {
  const { model, g, w, h, opts, font } = ctx;
  const grid = model.grid;
  if (!grid || !grid.values.length || !grid.cols.length) return empty(ctx);
  const nr = grid.rows.length, nc = grid.cols.length;
  const flat = grid.values.flat().filter(finite);
  let lo = toNumber(opts.min), hi = toNumber(opts.max);
  if (!finite(lo)) lo = Math.min(...flat);
  if (!finite(hi)) hi = Math.max(...flat);
  if (!finite(lo)) { lo = 0; hi = 1; }
  if (hi === lo) hi = lo + 1;
  const labelW = Math.min(w * 0.3, Math.max(0, ...grid.rows.map(r => textWidth(r, font))) + 12);
  const x0 = Math.ceil(labelW), x1 = w - 10, y0 = 26, y1 = h - 22;
  const cw = (x1 - x0) / nc, ch = (y1 - y0) / nr;
  // the scale: min ▭▭▭ max
  const d = toNumber(opts.decimals) >= 0 ? toNumber(opts.decimals) : decimalsOf(niceTicks(lo, hi, 4).step);
  const lmin = formatNumber(lo, ctx.lang, d), lmax = withUnitText(formatNumber(hi, ctx.lang, d), opts.unit);
  const gw = Math.min(140, w * 0.3);
  const gx = x1 - gw - textWidth(lmax, font) - 8;
  const gradId = `${ctx.clipId}g`;
  const lg = s('linearGradient', { id: gradId }, s('defs', {}, g));
  s('stop', { offset: '0', style: 'stop-color:var(--lui-chart-seq-lo)' }, lg);
  s('stop', { offset: '1', style: 'stop-color:var(--lui-chart-seq-hi)' }, lg);
  s('text', { class: 'yl', x: gx - 6, y: 10, 'text-anchor': 'end', dy: '0.32em', text: lmin }, g);
  s('rect', { x: gx, y: 5, width: gw, height: 10, rx: 2, style: `fill:url(#${gradId})` }, g);
  s('text', { class: 'yl', x: gx + gw + 6, y: 10, dy: '0.32em', text: lmax }, g);
  const share = v => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const marks = s('g', { class: 'cells' }, g);
  const showValues = cw >= 26 && ch >= 16;
  grid.values.forEach((row, r) => row.forEach((v, c) => {
    const x = x0 + c * cw, y = y0 + r * ch;
    if (!finite(v)) { s('rect', { class: 'nocell', x: x + 1, y: y + 1, width: Math.max(0, cw - 2), height: Math.max(0, ch - 2), rx: 2 }, marks); return; }
    const p = Math.round(share(v) * 100);
    s('rect', { class: 'cell', x: x + 1, y: y + 1, width: Math.max(0, cw - 2), height: Math.max(0, ch - 2), rx: 2, style: `fill:color-mix(in oklab, var(--lui-chart-seq-hi) ${p}%, var(--lui-chart-seq-lo))`, 'data-series': grid.rows[r], 'data-value': String(v) }, marks);
    if (showValues) {
      const text = formatNumber(v, ctx.lang, d);
      if (textWidth(text, font) + 6 <= cw) s('text', { class: `cv${p > 55 ? ' light' : ''}`, x: x + cw / 2, y: y + ch / 2, 'text-anchor': 'middle', dy: '0.32em', text }, g);
    }
  }));
  const rl = s('g', { class: 'cl' }, g);
  grid.rows.forEach((r, i) => s('text', { x: x0 - 8, y: y0 + (i + 0.5) * ch, 'text-anchor': 'end', dy: '0.32em', text: fitText(r, labelW - 12, font) }, rl));
  xLabels(ctx, grid.cols.map((c, i) => ({ x: x0 + (i + 0.5) * cw, text: fitText(c, Math.max(cw * 2 - 8, 30), font) })), y1 + 15, 0, w);
  return {
    size: nr * nc,
    at: i => {
      const r = Math.floor(i / nc), c = i % nc, v = grid.values[r][c];
      return {
        x: x0 + (c + 0.5) * cw, y: y0 + r * ch, band: { x: x0 + c * cw, y: y0 + r * ch, w: cw, h: ch, outline: true },
        title: `${grid.rows[r]} · ${grid.cols[c]}`, rows: [{ color: finite(v) ? `color-mix(in oklab, var(--lui-chart-seq-hi) ${Math.round(share(v) * 100)}%, var(--lui-chart-seq-lo))` : null, name: ctx.t('value'), value: finite(v) ? ctx.fmt(v) : '—' }],
        pick: { row: grid.rows[r], col: grid.cols[c], rowIndex: r, colIndex: c, value: v },
      };
    },
    hit(mx, my) { const c = Math.floor((mx - x0) / cw), r = Math.floor((my - y0) / ch); return c >= 0 && c < nc && r >= 0 && r < nr ? r * nc + c : -1; },
    nav(i, key) { return key === 'ArrowDown' ? i + nc : key === 'ArrowUp' ? i - nc : null; },
  };
}

const withUnitText = (text, unit) => (unit ? `${text}\u00a0${unit}` : text);

function radar(ctx) {
  const { model, series, g, w, h, opts, font } = ctx;
  const axes = model.categories.slice(0, 12);
  if (axes.length < 3 || !series.length) return empty(ctx);
  const vals = byCategory(ctx);
  const flat = vals.flat().filter(finite);
  const yt = niceTicks(finite(toNumber(opts.min)) ? toNumber(opts.min) : Math.min(0, ...flat), Math.max(...flat, 0), 4, { fixedMin: toNumber(opts.min), fixedMax: toNumber(opts.max) });
  const labW = Math.min(110, Math.max(...axes.map(a => textWidth(a, font))) + 8);
  const r = Math.max(20, Math.min(w / 2 - labW - 6, h / 2 - 22));
  const cx = w / 2, cy = h / 2;
  const n = axes.length;
  const ang = i => -Math.PI / 2 + i * Math.PI * 2 / n;
  const rad = v => (Math.max(yt.min, Math.min(yt.max, v)) - yt.min) / ((yt.max - yt.min) || 1) * r;
  const P = (i, rr) => [cx + rr * Math.cos(ang(i)), cy + rr * Math.sin(ang(i))];
  const grid = s('g', { class: 'grid' }, g);
  const d = decimalsOf(yt.step);
  yt.ticks.forEach(v => {
    if (v === yt.min) return;
    s('polygon', { points: axes.map((_, i) => P(i, rad(v)).map(c => c.toFixed(1)).join(',')).join(' ') }, grid);
    const [, ty] = P(0, rad(v));
    s('text', { class: 'rl', x: cx + 4, y: ty, dy: '0.9em', text: formatNumber(v, ctx.lang, d) }, g);
  });
  axes.forEach((a, i) => {
    const [x, y] = P(i, r);
    s('line', { x1: cx, y1: cy, x2: x, y2: y }, grid);
    const [lx, ly] = P(i, r + 8);
    const cos = Math.cos(ang(i));
    s('text', { class: 'al', x: lx, y: ly, 'text-anchor': Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end', dy: Math.sin(ang(i)) < -0.5 ? '-0.1em' : Math.sin(ang(i)) > 0.5 ? '0.8em' : '0.32em', text: fitText(a, labW, font) }, g);
  });
  const marks = s('g', { class: 'shapes' }, g);
  series.forEach((se, k) => {
    const pts = axes.map((_, i) => P(i, rad(finite(vals[k][i]) ? vals[k][i] : yt.min)));
    s('polygon', { class: 'shape', points: pts.map(p => p.map(c => c.toFixed(1)).join(',')).join(' '), style: `fill:${se.color};${lineStyle(se)}` }, marks);
    pts.forEach(([x, y], i) => { if (finite(vals[k][i])) s('circle', { class: 'dot', cx: x, cy: y, r: 2.5, style: `fill:${se.color}` }, marks); });
  });
  return {
    size: n,
    at: i => {
      const [x, y] = P(i, r);
      const dots = series.map((se, k) => (finite(vals[k][i]) ? { x: P(i, rad(vals[k][i]))[0], y: P(i, rad(vals[k][i]))[1], color: se.color } : null)).filter(Boolean);
      return { x, y, guide: { x1: cx, y1: cy, x2: x, y2: y }, dots, ...categoryTarget(ctx, vals, i) };
    },
    hit(mx, my) {
      if (Math.hypot(mx - cx, my - cy) > r + 40) return -1;
      let a = Math.atan2(my - cy, mx - cx) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      return Math.round(a / (Math.PI * 2 / n)) % n;
    },
  };
}

/** A tiny line without axes, for a row of text. */
function spark(ctx) {
  const { series, g, w, h, opts } = ctx;
  const se = series[0];
  const pts = (se?.points ?? []).filter(p => finite(p.y));
  if (!pts.length) return { size: 0, empty: true };
  let lo = Math.min(...pts.map(p => p.y)), hi = Math.max(...pts.map(p => p.y));
  if (finite(toNumber(opts.min))) lo = toNumber(opts.min);
  if (finite(toNumber(opts.max))) hi = toNumber(opts.max);
  if (hi === lo) { hi += 1; lo -= 1; }
  const xMin = pts[0].x, xMax = pts[pts.length - 1].x;
  const pad = 3;
  const X = p => pad + (xMax === xMin ? (w - pad * 2) : (p.x - xMin) / (xMax - xMin) * (w - pad * 2));
  const Y = p => h - pad - (p.y - lo) / (hi - lo) * (h - pad * 2);
  s('path', { class: 'fill spark', d: areaOf(pts, X, Y, h - pad), style: `fill:${se.color}` }, g);
  s('path', { class: 'line spark', d: pathOf(pts, X, Y), style: `stroke:${se.color}` }, g);
  const last = pts[pts.length - 1];
  s('circle', { class: 'dot', cx: X(last), cy: Y(last), r: 2.5, style: `fill:${se.color}` }, g);
  const xs = pts.map(X);
  return {
    size: pts.length,
    at: i => {
      const p = pts[i];
      return { x: xs[i], y: Y(p), guide: { x: xs[i], y0: 0, y1: h }, dots: [{ x: xs[i], y: Y(p), color: se.color }], title: ctx.model.xType === 'time' ? formatTime(p.x, ctx.lang, S) : '', rows: [{ color: se.color, name: se.name, value: ctx.fmt(p.y) }], pick: { x: p.x, y: p.y, index: i } };
    },
    hit(mx) { return nearest(xs, mx); },
  };
}

export const KINDS = {
  line: ctx => xy(ctx, 'line'),
  area: ctx => xy(ctx, 'area'),
  column,
  bar,
  pie,
  scatter,
  histogram,
  live: ctx => xy(ctx, 'live'),
  step,
  heatmap,
  radar,
  spark,
};
