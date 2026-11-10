/**
 * Charts for every app, drawn in SVG (no dependencies).
 *
 *   const ch = chart(el, { kind: 'line', series: [{ name: 'Nord', data: [3, 5, 4] }], options: { title: 'Pioggia', unit: 'mm' } });
 *   ch.append(0, { x: 3, y: 6 });        // or ch.append('Nord', 6): a point at the end (live: now)
 *   ch.update(newSeries); ch.clear(); ch.destroy();
 *   const png = await ch.toPNG(); const csv = ch.toCSV();   // Blobs
 *
 * kind: line, area, column, bar, pie, scatter, histogram, live, step, heatmap, radar, spark (CHART_KINDS).
 * series: see charts/data.js for the shapes accepted (a list of numbers, of {x, y}, of series
 *   { name, data, color }, an object name → values, rows of a table, a JSON text). heatmap takes a
 *   matrix (array of arrays) or { rows, cols, values }.
 * options:
 *   title, lang (default <html lang>), height (px of the drawing; 'auto' = fill el), legend (true),
 *   tools (true: table view, PNG, CSV buttons), unit, decimals, min, max, maxPoints (1000 per series),
 *   colors ('standard' | 'blue' | [css colours]), xLabel, time (x is a time),
 *   area: stacked (false | 'stacked' | 'percent');  column, bar: stacked;  bar: sort ('none'|'asc'|'desc');
 *   pie: donut;  histogram: bins ('auto' | number), binWidth;  live, step: window (seconds), paused;
 *   heatmap: rows, cols (labels);  texts: { key: text } to replace lilOS's texts (lilos:sdk.charts);
 *   onPick(point): a click (or Enter) on a point, bar, slice, cell…
 * One value axis only, never two. The colours are the CSS variables --lui-chart-1…8 of .lui-chart
 * (sdk/styles/logic.css, light and dark), always in the same order: a series keeps its colour when
 * others are hidden.
 */
import { h } from '../core/dom.js';
import { locale } from '../core/locale.js';
import { icon } from './icons.js';
import { KINDS, slicesOf, s } from './charts/kinds.js';
import { toSeries, toGrid, pointOf, ISO_DATE, finite, toNumber, safeColor } from './charts/data.js';
import { formatNumber, withUnit } from './charts/scale.js';
import { tableOf, cellText, csvOf, pngOf } from './charts/export.js';

export const CHART_KINDS = Object.freeze(Object.keys(KINDS));

// lilOS's text tables: English here, the other languages from the language packs
const { t: chartText } = locale.define('lilos:sdk.charts', {
  en: { strings: {
    table: 'Show as a table', chart: 'Show as a chart', png: 'Save as PNG', csv: 'Save as CSV', empty: 'No data', other: 'Other',
    series: 'Series', value: 'Value', count: 'Count', share: 'Share', name: 'Name', from: 'From', to: 'To', time: 'Time',
    category: 'Category', axis: 'Axis', point: 'Point', total: 'total', on: 'on', off: 'off', more: 'Only the first {n} rows are shown.',
    hidden: 'hidden', summarySeries: '{n} series', summaryPoints: '{n} points', summaryRange: 'values from {a} to {b}',
    keys: 'Arrows: move between the values. Enter: choose.',
    line: 'Line chart', area: 'Area chart', column: 'Column chart', bar: 'Bar chart', pie: 'Pie chart', scatter: 'Scatter chart',
    histogram: 'Histogram', live: 'Real-time chart', step: 'States over time', heatmap: 'Heat map', radar: 'Radar chart', spark: 'Sparkline',
  } },
});

const TIME_KINDS = new Set(['live', 'step']);
const CAT_KINDS = new Set(['column', 'bar', 'radar', 'pie']);
const BLUE = 6;
let counter = 0;

export function chart(el, { kind = 'line', series = [], options = {} } = {}) {
  if (!KINDS[kind]) throw new Error(`chart: unknown kind ${kind}`);
  const spark = kind === 'spark';
  const opts = {
    title: '', lang: document.documentElement.lang || 'en', height: spark ? 28 : 200, legend: !spark, tools: !spark,
    unit: '', decimals: null, min: null, max: null, maxPoints: 1000, colors: 'standard', window: kind === 'live' ? 60 : 0,
    paused: false, stacked: false, donut: false, sort: 'none', bins: 'auto', texts: {}, onPick: null,
    ...options,
  };
  const id = `lch${++counter}`;
  const t = (key, vars) => {
    if (!opts.texts?.[key]) return chartText(key, vars);
    let out = opts.texts[key];
    for (const [k, v] of Object.entries(vars ?? {})) out = out.replace(`{${k}}`, v);
    return out;
  };

  // ---------------------------------------------------------------- the elements
  const root = h('div', { class: `lui-chart lui-chart-${kind}`, tabindex: '0', role: 'figure' });
  const title = h('div', { class: 'lui-chart-title' });
  const tools = h('div', { class: 'lui-chart-tools' });
  const head = h('div', { class: 'lui-chart-head' }, title, tools);
  const legend = h('div', { class: 'lui-chart-legend', role: 'group' });
  const plot = h('div', { class: 'lui-chart-plot' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'lui-chart-svg');
  svg.setAttribute('aria-hidden', 'true');
  const tip = h('div', { class: 'lui-chart-tip', hidden: true });
  const live = h('div', { class: 'lui-chart-sr', 'aria-live': 'polite' });
  const tableWrap = h('div', { class: 'lui-chart-tablewrap', hidden: true });
  plot.append(svg, tip);
  root.append(head, legend, plot, tableWrap, live);
  el.append(root);

  const tableBtn = toolButton('grid', () => setTableView(!tableOn));
  const pngBtn = toolButton('image', async () => save(await handle.toPNG(), 'png'));
  const csvBtn = toolButton('download', () => save(handle.toCSV(), 'csv'));
  tools.append(tableBtn, pngBtn, csvBtn);

  function toolButton(name, fn) {
    const b = h('button', { type: 'button', class: 'lui-chart-tool' }, icon(name));
    b.addEventListener('click', e => { e.stopPropagation(); fn(); });
    return b;
  }

  function save(blob, ext) {
    const a = h('a', { href: URL.createObjectURL(blob), download: `${(opts.title || t(kind)).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'chart'}.${ext}` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------------------------------------------------------------- the data
  const model = { series: [], xType: 'num', categories: [], catIndex: new Map(), grid: null };
  const hidden = new Set();
  let tableOn = false, layout = null, frame = 0, destroyed = false, focus = -1, pointer = null, wasConnected = false;

  const colorOf = i => {
    const c = opts.colors;
    if (Array.isArray(c) && c.length) return safeColor(c[i % c.length]) ?? `var(--lui-chart-${(i % 8) + 1})`;
    if (c === 'blue') return `var(--lui-chart-b${(i % BLUE) + 1})`;
    return `var(--lui-chart-${(i % 8) + 1})`;
  };

  function xTypeOf(list) {
    if (TIME_KINDS.has(kind) || opts.time) return 'time';
    if (CAT_KINDS.has(kind)) return 'cat';
    if (kind === 'histogram') return 'num';
    let text = false, date = false;
    for (const se of list) for (const p of se.points) {
      if (p.x instanceof Date) date = true;
      else if (typeof p.x === 'string') { if (ISO_DATE.test(p.x.trim())) date = true; else if (!Number.isFinite(Number(p.x))) text = true; }
    }
    return text ? 'cat' : date ? 'time' : 'num';
  }

  function fixX(p, se) {
    if (model.xType === 'time') {
      p.x = p.x instanceof Date ? p.x.getTime() : typeof p.x === 'string' ? (ISO_DATE.test(p.x.trim()) ? Date.parse(p.x) : Number(p.x)) : Number(p.x);
    } else if (model.xType === 'cat') {
      p.x = p.x instanceof Date ? p.x.toISOString() : String(p.x);
      if (!model.catIndex.has(p.x)) { model.catIndex.set(p.x, model.categories.length); model.categories.push(p.x); }
    } else p.x = Number(p.x);
    if (kind !== 'step' && typeof p.y !== 'number' && p.y !== null) { const n = toNumber(p.y); p.y = Number.isFinite(n) ? n : null; }
    return p;
  }

  const decimals = () => { const d = opts.decimals === null || opts.decimals === '' || opts.decimals === undefined ? NaN : toNumber(opts.decimals); return Number.isInteger(d) && d >= 0 ? Math.min(10, d) : null; };
  const sorted = () => model.xType !== 'cat' && kind !== 'scatter' && kind !== 'histogram';
  const maxPoints = () => Math.max(1, Math.round(toNumber(opts.maxPoints)) || 1000);

  function makeSeries(name, i, color = null) {
    return { index: i, key: `${i}:${name}`, name: name || (kind === 'pie' ? '' : `${t('series')} ${i + 1}`), color, points: [] };
  }

  function build(input) {
    model.categories = []; model.catIndex = new Map(); model.grid = null;
    if (kind === 'heatmap') { model.grid = toGrid(input, listOf(opts.rows), listOf(opts.cols)); model.series = []; return; }
    const raw = toSeries(input);
    const now = Date.now();
    model.series = raw.map((r, i) => {
      const se = makeSeries(r.name, i, r.color);
      if (raw.length === 1 && !r.name) se.name = '';
      se.points = r.data.map(pointOf);
      return se;
    });
    model.xType = xTypeOf(model.series);
    for (const se of model.series) {
      // numbers without times in a time chart: one a second, up to now
      if (model.xType === 'time') se.points.forEach((p, i) => { if (p.auto) p.x = now - (se.points.length - 1 - i) * 1000; });
      se.points.forEach(p => fixX(p, se));
      if (sorted()) se.points.sort((a, b) => a.x - b.x);
      if (se.points.length > maxPoints()) se.points.splice(0, se.points.length - maxPoints());
    }
  }

  const listOf = v => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? v.split(',').map(x => x.trim()) : null);

  function seriesFor(key) {
    if (typeof key === 'string' && !/^\d+$/.test(key)) {
      let se = model.series.find(x => x.name === key);
      if (!se) { se = makeSeries(key, model.series.length); model.series.push(se); }
      return se;
    }
    const i = Math.max(0, Number(key) || 0);
    while (model.series.length <= i) model.series.push(makeSeries('', model.series.length));
    return model.series[i];
  }

  // ---------------------------------------------------------------- drawing
  const request = () => { if (!frame && !destroyed) frame = requestAnimationFrame(draw); };

  function plotHeight() {
    const hh = toNumber(opts.height);
    if (hh > 0) return hh;
    return Math.max(60, plot.clientHeight);
  }

  function visibleSeries() {
    return model.series.filter(se => !hidden.has(se.key)).map(se => ({ ...se, color: se.color || colorOf(se.index), dash: opts.colors === 'standard' && se.index >= 8 }));
  }

  function draw() {
    frame = 0;
    if (destroyed) return;
    title.textContent = opts.title || '';
    head.hidden = !opts.title && !opts.tools;
    tools.hidden = !opts.tools;
    tableBtn.title = t(tableOn ? 'chart' : 'table');
    tableBtn.setAttribute('aria-label', tableBtn.title);
    tableBtn.replaceChildren(icon(tableOn ? 'chart' : 'grid'));
    tableBtn.setAttribute('aria-pressed', String(tableOn));
    pngBtn.title = t('png');
    pngBtn.setAttribute('aria-label', pngBtn.title);
    csvBtn.title = t('csv');
    csvBtn.setAttribute('aria-label', csvBtn.title);
    drawLegend();
    root.setAttribute('aria-label', summary());
    root.setAttribute('aria-description', t('keys'));
    if (tableOn) drawTable();
    const height = plotHeight();
    if (toNumber(opts.height) > 0) plot.style.height = `${height}px`;
    root.classList.toggle('lui-chart-fill', !(toNumber(opts.height) > 0));
    const w = Math.floor(plot.clientWidth);
    if (w < 10 || tableOn) return;
    svg.setAttribute('width', w);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${w} ${height}`);
    svg.replaceChildren();
    const g = s('g', {}, svg);
    const cs = getComputedStyle(root);
    const ctx = {
      g, w, h: height, kind, opts, lang: opts.lang, t, model, series: visibleSeries(), hidden, clipId: id, colorOf,
      font: `${cs.getPropertyValue('--lui-chart-font-size').trim() || '10.5px'} ${cs.fontFamily}`,
      fmt: v => withUnit(formatNumber(v, opts.lang, decimals()), opts.unit),
    };
    try { layout = KINDS[kind](ctx) ?? { size: 0 }; } catch (err) { layout = { size: 0 }; console.error('chart', err); }
    s('g', { class: 'overlay' }, svg);
    if (pointer) showAt(hitAt(pointer.x, pointer.y));
    else if (focus >= 0 && focus < layout.size) showAt(layout.at(focus));
    else hideTip();
  }

  function legendItems() {
    if (!opts.legend || kind === 'heatmap' || kind === 'spark') return [];
    if (kind === 'pie') return slicesOf(model, t).map(sl => ({ key: sl.key, name: sl.name, color: sl.other ? 'var(--lui-chart-other)' : colorOf(sl.index) }));
    return model.series.map(se => ({ key: se.key, name: se.name, color: se.color || colorOf(se.index) }));
  }

  function drawLegend() {
    const items = legendItems();
    legend.hidden = items.length < 2;
    legend.setAttribute('aria-label', t('series'));
    legend.replaceChildren(...(items.length < 2 ? [] : items.map(it => {
      const off = hidden.has(it.key);
      const b = h('button', { type: 'button', class: `lui-chart-key${off ? ' off' : ''}`, 'aria-pressed': String(!off) }, h('i', { style: `background:${it.color}` }), it.name || '—');
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (hidden.has(it.key)) hidden.delete(it.key); else hidden.add(it.key);
        focus = -1;
        request();
      });
      return b;
    })));
  }

  function summary() {
    const parts = [opts.title, t(kind)].filter(Boolean);
    if (kind === 'heatmap') {
      const g = model.grid;
      if (g) parts.push(`${g.rows.length} × ${g.cols.length}`);
    } else {
      const n = model.series.length;
      if (n > 1) parts.push(`${t('summarySeries', { n })} (${model.series.map(se => se.name).join(', ')})`);
      const ys = model.series.flatMap(se => se.points.map(p => p.y)).filter(finite);
      parts.push(t('summaryPoints', { n: model.series.reduce((a, se) => a + se.points.length, 0) }));
      if (ys.length) parts.push(t('summaryRange', { a: withUnit(formatNumber(Math.min(...ys), opts.lang), opts.unit), b: withUnit(formatNumber(Math.max(...ys), opts.lang), opts.unit) }));
    }
    return parts.join(', ');
  }

  function drawTable() {
    const tb = tableOf(kind, model, opts, t);
    const LIMIT = 500;
    const unitHead = (hd, i) => (i > 0 && opts.unit && tb.types[i] === 'num' && kind !== 'histogram' ? `${hd} (${opts.unit})` : hd);
    const table = h('table', { class: 'lui-chart-table' },
      opts.title ? h('caption', {}, opts.title) : null,
      h('thead', {}, h('tr', {}, ...tb.head.map((hd, i) => h('th', { scope: 'col', class: i > 0 && (tb.types[i] === 'num' || tb.types[i] === 'pct') ? 'n' : null }, unitHead(hd, i))))),
      h('tbody', {}, ...tb.rows.slice(0, LIMIT).map(r => h('tr', {}, ...r.map((v, i) => h(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : { class: tb.types[i] === 'num' || tb.types[i] === 'pct' ? 'n' : '' }, cellText(v, tb.types[i], opts.lang, opts, t)))))));
    tableWrap.replaceChildren(...[table, tb.rows.length > LIMIT ? h('p', { class: 'lui-chart-more' }, t('more', { n: LIMIT })) : null].filter(Boolean));
    if (!toNumber(opts.height)) return;
    tableWrap.style.maxHeight = `${Math.max(120, plotHeight())}px`;
  }

  function setTableView(on) {
    tableOn = !!on;
    plot.hidden = tableOn;
    tableWrap.hidden = !tableOn;
    hideTip();
    if (!tableOn) tableWrap.replaceChildren();
    draw();
  }

  // ---------------------------------------------------------------- tooltip, pick, keyboard
  function hitAt(mx, my) {
    if (!layout?.size && !layout?.hit) return null;
    const r = layout.hit?.(mx, my);
    if (r === undefined || r === null || r === -1) return null;
    return typeof r === 'number' ? (r >= 0 && r < layout.size ? layout.at(r) : null) : r;
  }

  function hideTip() {
    tip.hidden = true;
    svg.querySelector('.overlay')?.replaceChildren();
    svg.querySelectorAll('.lui-chart-hl').forEach(e => e.classList.remove('lui-chart-hl'));
  }

  function showAt(target) {
    hideTip();
    if (!target) return;
    const ov = svg.querySelector('.overlay');
    if (ov) {
      const gd = target.guide;
      if (gd && gd.x !== undefined) s('line', { class: 'guide', x1: Math.round(gd.x) + 0.5, x2: Math.round(gd.x) + 0.5, y1: gd.y0, y2: gd.y1 }, ov);
      else if (gd) s('line', { class: 'guide', x1: gd.x1, y1: gd.y1, x2: gd.x2, y2: gd.y2 }, ov);
      if (target.band) s('rect', { class: target.band.outline ? 'cellmark' : 'band', x: target.band.x, y: target.band.y, width: target.band.w, height: target.band.h, rx: target.band.outline ? 3 : 0 }, ov);
      for (const d of target.dots ?? []) s('circle', { class: 'hdot', cx: d.x, cy: d.y, r: d.r ?? 4, style: `fill:${d.color}` }, ov);
    }
    target.mark?.classList.add('lui-chart-hl');
    tip.replaceChildren(
      target.title ? h('b', {}, target.title) : null,
      ...(target.rows ?? []).map(r => h('div', { class: 'r' }, r.color ? h('i', { style: `background:${r.color}` }) : h('span', { class: 'sp' }), h('span', { class: 'n' }, r.name ?? ''), h('span', { class: 'v' }, r.value ?? ''))));
    tip.hidden = false;
    const pw = plot.clientWidth, ph = plot.clientHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = target.x + 14;
    if (left + tw > pw - 4) left = target.x - tw - 14;
    if (left < 4) left = Math.max(4, Math.min(pw - tw - 4, target.x - tw / 2));
    const top = Math.max(4, Math.min(ph - th - 4, target.y - th / 2));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function announce(target) {
    if (!target) return;
    live.textContent = [target.title, ...(target.rows ?? []).map(r => `${r.name ?? ''} ${r.value ?? ''}`.trim())].filter(Boolean).join(', ');
  }

  function pick(target, markEl) {
    if (!target || typeof opts.onPick !== 'function') return;
    const p = { ...target.pick };
    if (markEl?.dataset?.series !== undefined && kind !== 'pie') {
      p.series = markEl.dataset.series;
      const v = Number(markEl.dataset.value);
      if (Number.isFinite(v)) p.y = v;
    } else if (target.dots?.length > 1 && pointer && !p.series) {
      const d = target.dots.reduce((a, b) => (Math.abs(b.y - pointer.y) < Math.abs(a.y - pointer.y) ? b : a));
      p.series = d.name; p.y = d.v;
    }
    try { opts.onPick(p); } catch (err) { console.error('chart onPick', err); }
  }

  const local = e => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  svg.addEventListener('pointermove', e => { pointer = local(e); showAt(hitAt(pointer.x, pointer.y)); });
  svg.addEventListener('pointerleave', () => { pointer = null; if (focus < 0) hideTip(); });
  svg.addEventListener('click', e => { const p = local(e); pick(hitAt(p.x, p.y), e.target.closest?.('[data-series]')); });
  root.addEventListener('keydown', e => {
    if (e.target !== root || tableOn || !layout?.size) return;
    const n = layout.size;
    let i = focus;
    const nav = layout.nav?.(Math.max(0, i), e.key);
    if (nav !== null && nav !== undefined) i = nav;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = i < 0 ? 0 : i + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = i < 0 ? n - 1 : i - 1;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else if ((e.key === 'Enter' || e.key === ' ') && focus >= 0) { e.preventDefault(); pick(layout.at(focus)); return; }
    else if (e.key === 'Escape' && focus >= 0) { focus = -1; hideTip(); return; }
    else return;
    e.preventDefault();
    focus = Math.max(0, Math.min(n - 1, i));
    const target = layout.at(focus);
    pointer = null;
    showAt(target);
    announce(target);
  });
  root.addEventListener('blur', () => { if (focus >= 0) { focus = -1; if (!pointer) hideTip(); } });

  // ---------------------------------------------------------------- sizes, time
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => request()) : null;
  ro?.observe(plot);
  let timer = 0;
  function startTimer() {
    clearInterval(timer);
    timer = 0;
    const win = toNumber(opts.window);
    if (opts.paused || !(kind === 'live' || (kind === 'step' && win > 0))) return;
    const every = Math.max(100, Math.min(1000, (win || 60) * 1000 / Math.max(200, plot.clientWidth || 600)));
    timer = setInterval(() => {
      if (!root.isConnected) { if (wasConnected) handle.destroy(); return; }
      wasConnected = true;
      if (!document.hidden && !tableOn) request();
    }, every);
  }

  function prune(se) {
    if (se.points.length > maxPoints()) se.points.splice(0, se.points.length - maxPoints());
    const win = toNumber(opts.window);
    if (TIME_KINDS.has(kind) && win > 0 && !opts.paused) {
      // keep one point before the window: the line (or the state) comes in from the left edge
      const start = Date.now() - win * 1000;
      let k = 0;
      while (k + 1 < se.points.length && se.points[k + 1].x < start) k++;
      if (k > 0) se.points.splice(0, k);
    }
  }

  // ---------------------------------------------------------------- the handle
  const handle = {
    el: root,
    kind,
    /** New data (the same shapes chart() takes). Hidden series stay hidden. */
    update(input) { build(input); focus = -1; request(); },
    /** A point at the end of a series (index, or name: a new series if there is none). */
    append(key, point) {
      if (kind === 'heatmap') return;
      const se = seriesFor(key ?? 0);
      const p = pointOf(point, se.points.length);
      if (p.auto) {
        const last = se.points[se.points.length - 1];
        p.x = model.xType === 'time' ? Date.now() : model.xType === 'cat' ? String(model.categories.length + 1) : last ? Number(last.x) + 1 : 0;
      }
      if (model.series.length === 1 && !se.points.length && !model.categories.length && model.xType === 'num' && typeof p.x === 'string' && !Number.isFinite(Number(p.x))) {
        model.xType = xTypeOf([{ points: [p] }]);
      }
      fixX(p, se);
      const pts = se.points;
      if (sorted() && pts.length && p.x < pts[pts.length - 1].x) pts.splice(pts.findIndex(q => q.x > p.x), 0, p);
      else pts.push(p);
      prune(se);
      request();
    },
    /** Empties the chart (the series stay, without points). */
    clear() {
      for (const se of model.series) se.points = [];
      model.categories = []; model.catIndex = new Map();
      if (model.grid) model.grid = { rows: [], cols: [], values: [] };
      focus = -1;
      request();
    },
    /** Changes options (title, unit, min, max, window…). */
    setOptions(o) {
      const rebuild = ['rows', 'cols', 'time'].some(k => k in o);
      Object.assign(opts, o);
      if (rebuild && kind === 'heatmap' && model.grid) model.grid = toGrid({ values: model.grid.values }, listOf(opts.rows), listOf(opts.cols));
      startTimer();
      request();
    },
    /** Draws again for a new size (a ResizeObserver does it by itself). */
    resize() { if (frame) cancelAnimationFrame(frame); frame = 0; draw(); },
    /** Shows the data as an HTML table instead of the chart (or back). */
    tableView(on = !tableOn) { setTableView(on); },
    /** The data as a table: { head, rows, types }. */
    table() { return tableOf(kind, model, opts, t); },
    /** The data as a CSV file (Blob). */
    toCSV() { return new Blob(['﻿', csvOf(tableOf(kind, model, opts, t))], { type: 'text/csv;charset=utf-8' }); },
    /** The chart as a PNG image (Promise of a Blob). */
    toPNG(scale = 2) {
      const cs = getComputedStyle(root);
      const bg = cs.getPropertyValue('--lui-chart-bg').trim() || '#fff';
      const legendList = legendItems().length >= 2 ? legendItems().map(it => ({ ...it, color: resolveColor(it.color), off: hidden.has(it.key) })) : [];
      return pngOf(svg, { background: resolveColor(bg), ink: cs.color, dim: resolveColor('var(--lui-chart-axis)'), font: cs.fontFamily, title: opts.title, legend: legendList, scale });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      ro?.disconnect();
      clearInterval(timer);
      if (frame) cancelAnimationFrame(frame);
      root.remove();
    },
  };

  /** A CSS colour (var(), color-mix()) as the browser computes it, for the canvas. */
  function resolveColor(c) {
    const probe = h('i', { style: `color:${c};display:none` });
    root.append(probe);
    const v = getComputedStyle(probe).color;
    probe.remove();
    return v || '#888';
  }

  build(series);
  startTimer();
  if (root.isConnected) { wasConnected = true; draw(); } else request();
  return handle;
}

