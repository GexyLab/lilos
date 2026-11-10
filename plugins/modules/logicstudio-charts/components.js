/**
 * The chart Componenti UI of Logic Studio. The browser loads this file (served by the engine) in
 * lilOS and in the IDE; the kernel imports it only to read the definitions. It imports nothing:
 * the drawing is the SDK's chart library (sdk/ui/charts.js), which render(el, c) finds in
 * c.host.charts (when where the window is gives its own) or c.charts.
 *
 * Ports, seen from the schema: inputs are what a schema sets, outputs what the user does.
 * Every component also has the inputs enabled and visible. In the editor of windows (c.design)
 * each chart shows made-up data, so that one sees what it will look like.
 */

const L = (en, it) => ({ en, it });
const COMMON = [{ name: 'enabled', type: 'bool', label: L('enabled', 'abilitato') }, { name: 'visible', type: 'bool', label: L('visible', 'visibile') }];
const P = (key, type, en, it, extra = {}) => ({ key, type, label: L(en, it), ...extra });
const num = v => (typeof v === 'number' ? v : v === null || v === undefined || v === '' ? NaN : Number(String(v).replace(',', '.')));

// ---------------------------------------------------------------- ports and props shared by the charts
const DATA = { name: 'data', type: 'any', label: L('data (list or object)', 'dati (lista o oggetto)') };
const ADD = { name: 'add', type: 'any', label: L('add point', 'aggiungi punto') };
const CLEAR = { name: 'clear', type: 'pulse', label: L('clear', 'pulisci') };
const PICKED = { name: 'picked', type: 'object', label: L('picked point', 'punto scelto') };

const titleProp = P('label', 'text', 'Title', 'Titolo', { default: '', translate: true });
const heightProp = (d = 200) => P('height', 'number', 'Height (px)', 'Altezza (px)', { default: d, min: 20, max: 2000 });
const legendProp = P('legend', 'checkbox', 'Legend', 'Legenda', { default: true });
const unitProp = P('unit', 'text', 'Unit', 'Unità', { default: '' });
const decimalsProp = P('decimals', 'number', 'Decimals', 'Decimali', { min: 0, max: 10 });
const minProp = P('min', 'number', 'Minimum (empty: automatic)', 'Minimo (vuoto: automatico)');
const maxProp = P('max', 'number', 'Maximum (empty: automatic)', 'Massimo (vuoto: automatico)');
const maxPointsProp = P('maxPoints', 'number', 'Points kept per series', 'Punti tenuti per serie', { default: 1000, min: 10, max: 100000 });
const colorsProp = P('colors', 'select', 'Colours', 'Colori', { default: 'standard', options: ['standard', 'blue'] });
const toolsProp = P('tools', 'checkbox', 'Table view, PNG and CSV buttons', 'Pulsanti vista tabella, PNG e CSV', { default: true });

const BASE = [titleProp, heightProp(), legendProp, unitProp, decimalsProp, minProp, maxProp, maxPointsProp, colorsProp, toolsProp];

function def(type, icon, label, spec, render) {
  return {
    type, version: 1, category: 'charts', icon, label,
    inputs: [...(spec.inputs ?? []), ...COMMON], outputs: spec.outputs ?? [], props: spec.props ?? [],
    ...(spec.grow && { grow: spec.grow }),
    render,
  };
}

/** The options of the SDK chart from the props. */
function optionsOf(c, extra = {}) {
  const p = c.props;
  const o = {
    lang: c.lang, title: p.label ? c.t(p.label) : '', height: num(p.height) > 0 ? num(p.height) : 200,
    legend: p.legend !== false, tools: p.tools !== false && !c.design, unit: p.unit ?? '', colors: p.colors === 'blue' ? 'blue' : 'standard',
    maxPoints: Math.min(num(c.host?.chartPoints) > 0 ? num(c.host.chartPoints) : Infinity, num(p.maxPoints) > 0 ? num(p.maxPoints) : 1000),
    onPick: point => c.send('picked', point),
  };
  if (Number.isInteger(num(p.decimals))) o.decimals = num(p.decimals);
  if (Number.isFinite(num(p.min))) o.min = num(p.min);
  if (Number.isFinite(num(p.max))) o.max = num(p.max);
  return { ...o, ...extra };
}

/** Draws the chart into el with the library of the SDK. */
function mount(el, c, kind, extra, preview) {
  el.classList.add('lui-chartc', `lui-chartc-${kind}`);
  const lib = c.host?.charts ?? c.charts;
  if (!lib?.chart) { el.append(c.h('div', { class: 'lui-missing' }, c.icon('warning'), 'charts')); return null; }
  return lib.chart(el, { kind, series: c.design ? preview() : [], options: optionsOf(c, { ...extra, ...(c.design && { paused: true }) }) });
}

/**
 * A value on «add point»: a number (a point at the end of the first series), [x, y], { x, y, series },
 * or { <series>: value, … } (one point per series, at the same x).
 */
function addTo(ch, v) {
  if (v === null || v === undefined || v === '') return;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || Array.isArray(v)) { ch.append(0, v); return; }
  if (typeof v !== 'object') return;
  if (['y', 'value', 'v'].some(k => v[k] !== undefined)) { ch.append(v.series ?? 0, v); return; }
  const x = v.x ?? v.t ?? v.time;
  for (const [name, y] of Object.entries(v)) if (!['x', 't', 'time'].includes(name)) ch.append(name, x === undefined ? { y } : { x, y });
}

/** The usual inputs: data, add point, clear. */
function bindData(c, ch, { add = true } = {}) {
  if (!ch || c.design) return;
  c.on('data', v => ch.update(v));
  if (add) c.on('add', v => addTo(ch, v));
  c.on('clear', () => ch.clear());
}

// ---------------------------------------------------------------- made-up data for the editor
const MONTHS = L(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']);
const word = (c, en, it) => (String(c.lang).startsWith('it') ? it : en);
const months = c => (String(c.lang).startsWith('it') ? MONTHS.it : MONTHS.en);
const wave = (n, f, a, b, ph = 0) => Array.from({ length: n }, (_, i) => Math.round((b + a * Math.sin(i * f + ph) + ((i * 7) % 5) * a * 0.08) * 10) / 10);
const zones = c => [word(c, 'North', 'Nord'), word(c, 'South', 'Sud'), word(c, 'East', 'Est'), word(c, 'West', 'Ovest')];
/** Names of the added ports, or two made-up ones. */
const addedNames = (c, en, it) => ((c.added?.inputs ?? []).length ? c.added.inputs.map(p => p.name) : [word(c, en[0], it[0]), word(c, en[1], it[1])]);

const PREVIEW = {
  line: c => { const m = months(c).slice(0, 8); const [n, s] = zones(c); return [{ name: n, data: wave(8, 0.8, 4, 12).map((y, i) => ({ x: m[i], y })) }, { name: s, data: wave(8, 0.8, 3, 17, 1.4).map((y, i) => ({ x: m[i], y })) }]; },
  area: c => { const m = months(c).slice(0, 8); return [{ name: word(c, 'Water', 'Acqua'), data: wave(8, 0.7, 3, 8).map((y, i) => ({ x: m[i], y })) }, { name: word(c, 'Fertiliser', 'Concime'), data: wave(8, 0.7, 2, 4, 2).map((y, i) => ({ x: m[i], y })) }]; },
  column: c => { const z = zones(c); return [{ name: '2025', data: z.map((x, i) => ({ x, y: [12, 9, 14, 7][i] })) }, { name: '2026', data: z.map((x, i) => ({ x, y: [15, 11, 13, 10][i] })) }]; },
  bar: c => zones(c).slice(0, 3).map((x, i) => ({ x, y: [42, 31, 18][i] })),
  pie: c => ({ [word(c, 'Water', 'Acqua')]: 45, [word(c, 'Fertiliser', 'Concime')]: 25, [word(c, 'Energy', 'Energia')]: 18, [word(c, 'Other', 'Altro')]: 12 }),
  scatter: () => Array.from({ length: 30 }, (_, i) => ({ x: 10 + ((i * 37) % 23), y: Math.round((20 + ((i * 37) % 23) * 1.4 + ((i * 13) % 9) - 4) * 10) / 10 })),
  histogram: () => Array.from({ length: 120 }, (_, i) => Math.round((20 + 4 * Math.sin(i * 1.7) + 3 * Math.cos(i * 0.9) + ((i * 7) % 11) / 4) * 10) / 10),
  live: c => { const now = Date.now(); return addedNames(c, ['temperature', 'humidity'], ['temperatura', 'umidità']).map((name, k) => ({ name, data: wave(60, 0.18, 3 + k, 20 + k * 25, k).map((y, i) => ({ x: now - (59 - i) * 1000, y })) })); },
  step: c => {
    const now = Date.now(), win = 300000;
    return addedNames(c, ['pump', 'door'], ['pompa', 'porta']).map((name, k) => ({ name, data: Array.from({ length: 7 }, (_, i) => ({ x: now - win + i * win / 7 + k * 15000, y: (i + k) % 2 === 0 })) }));
  },
  heatmap: c => { const days = word(c, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']); return { rows: days, cols: ['8', '10', '12', '14', '16', '18'], values: days.map((_, r) => wave(6, 0.9, 6, 12, r)) }; },
  radar: c => { const ax = word(c, ['Speed', 'Cost', 'Quality', 'Safety', 'Comfort'], ['Velocità', 'Costo', 'Qualità', 'Sicurezza', 'Comfort']); return [{ name: 'A', data: ax.map((x, i) => ({ x, y: [8, 5, 7, 9, 6][i] })) }, { name: 'B', data: ax.map((x, i) => ({ x, y: [6, 8, 6, 7, 8][i] })) }]; },
  spark: () => wave(30, 0.4, 1.5, 21),
};

// ---------------------------------------------------------------- the charts
export const components = [
  def('charts.line', 'chart', L('Lines', 'Linee'), {
    inputs: [DATA, ADD, CLEAR], outputs: [PICKED], props: BASE,
  }, (el, c) => bindData(c, mount(el, c, 'line', {}, () => PREVIEW.line(c)))),

  def('charts.area', 'chart', L('Areas', 'Aree'), {
    inputs: [DATA, ADD, CLEAR], outputs: [PICKED],
    props: [...BASE, P('stacked', 'select', 'Stacking', 'Impilate', { default: 'none', options: ['none', 'stacked', 'percent'] })],
  }, (el, c) => bindData(c, mount(el, c, 'area', { stacked: c.props.stacked === 'stacked' || c.props.stacked === 'percent' ? c.props.stacked : false }, () => PREVIEW.area(c)))),

  def('charts.column', 'cols', L('Columns', 'Colonne'), {
    inputs: [DATA, ADD, CLEAR], outputs: [{ ...PICKED, label: L('picked column', 'colonna scelta') }],
    props: [...BASE, P('stacked', 'checkbox', 'Stacked', 'Impilate', { default: false })],
  }, (el, c) => bindData(c, mount(el, c, 'column', { stacked: !!c.props.stacked }, () => PREVIEW.column(c)))),

  def('charts.bar', 'rows', L('Bars', 'Barre'), {
    inputs: [DATA, ADD, CLEAR], outputs: [{ ...PICKED, label: L('picked bar', 'barra scelta') }],
    props: [...BASE, P('stacked', 'checkbox', 'Stacked', 'Impilate', { default: false }), P('sort', 'select', 'Order', 'Ordine', { default: 'none', options: ['none', 'asc', 'desc'] })],
  }, (el, c) => bindData(c, mount(el, c, 'bar', { stacked: !!c.props.stacked, sort: c.props.sort }, () => PREVIEW.bar(c)))),

  def('charts.pie', 'gauge', L('Pie · Donut', 'Torta · Ciambella'), {
    inputs: [{ name: 'data', type: 'any', label: L('data (name → value)', 'dati (nome → valore)') }], outputs: [{ ...PICKED, label: L('picked slice', 'fetta scelta') }],
    props: [titleProp, heightProp(), legendProp, unitProp, decimalsProp, colorsProp, toolsProp, P('donut', 'checkbox', 'Donut', 'Ciambella', { default: false })],
  }, (el, c) => {
    const ch = mount(el, c, 'pie', { donut: !!c.props.donut }, () => PREVIEW.pie(c));
    if (ch && !c.design) c.on('data', v => ch.update(v));
  }),

  def('charts.scatter', 'grid', L('Scatter', 'Dispersione'), {
    inputs: [{ name: 'data', type: 'any', label: L('points {x, y}', 'punti {x, y}') }, ADD, CLEAR], outputs: [PICKED], props: BASE,
  }, (el, c) => bindData(c, mount(el, c, 'scatter', {}, () => PREVIEW.scatter(c)))),

  def('charts.histogram', 'cols', L('Histogram', 'Istogramma'), {
    inputs: [{ name: 'values', type: 'list', label: L('values', 'valori') }, { name: 'add', type: 'number', label: L('add value', 'aggiungi valore') }, CLEAR],
    outputs: [{ ...PICKED, label: L('picked class', 'classe scelta') }],
    props: [titleProp, heightProp(), legendProp, unitProp, decimalsProp, maxPointsProp, colorsProp, toolsProp,
      P('bins', 'number', 'Classes (0: automatic)', 'Classi (0: automatiche)', { default: 0, min: 0, max: 200 }),
      P('binWidth', 'number', 'Width of a class (empty: from the classes)', 'Larghezza di una classe (vuoto: dalle classi)')],
  }, (el, c) => {
    const ch = mount(el, c, 'histogram', { bins: num(c.props.bins) > 0 ? num(c.props.bins) : 'auto', ...(num(c.props.binWidth) > 0 && { binWidth: num(c.props.binWidth) }) }, () => PREVIEW.histogram(c));
    if (!ch || c.design) return;
    c.on('values', v => ch.update(Array.isArray(v) ? v : []));
    c.on('add', v => { const n = num(v); if (Number.isFinite(n)) ch.append(0, n); });
    c.on('clear', () => ch.clear());
  }),

  def('charts.live', 'clock', L('Real time', 'Tempo reale'), {
    inputs: [CLEAR], outputs: [PICKED],
    grow: { inputs: { type: 'number', name: 'user', max: 8, label: L('series', 'serie') } },
    props: [titleProp, heightProp(), legendProp, unitProp, decimalsProp, minProp, maxProp, maxPointsProp, colorsProp, toolsProp,
      P('window', 'number', 'Time shown (seconds)', 'Tempo mostrato (secondi)', { default: 60, min: 1, max: 86400 })],
  }, (el, c) => {
    const ports = c.added?.inputs ?? [];
    const ch = mount(el, c, 'live', { window: num(c.props.window) > 0 ? num(c.props.window) : 60 }, () => PREVIEW.live(c));
    if (!ch || c.design) return;
    ch.update(ports.map(p => ({ name: p.name, data: [] })));
    ports.forEach((p, i) => c.on(p.id, v => { const n = num(v); if (Number.isFinite(n)) ch.append(i, { x: Date.now(), y: n }); }));
    c.on('clear', () => ch.clear());
  }),

  def('charts.step', 'toggle', L('Steps', 'Gradini'), {
    inputs: [CLEAR], outputs: [PICKED],
    grow: { inputs: { type: 'any', name: 'user', max: 8, label: L('state', 'stato') } },
    props: [titleProp, heightProp(), legendProp, maxPointsProp, colorsProp, toolsProp,
      P('window', 'number', 'Time shown (seconds, 0: all)', 'Tempo mostrato (secondi, 0: tutto)', { default: 300, min: 0, max: 604800 })],
  }, (el, c) => {
    const ports = c.added?.inputs ?? [];
    const ch = mount(el, c, 'step', { window: num(c.props.window) >= 0 ? num(c.props.window) : 300 }, () => PREVIEW.step(c));
    if (!ch || c.design) return;
    ch.update(ports.map(p => ({ name: p.name, data: [] })));
    ports.forEach((p, i) => c.on(p.id, v => {
      if (v === undefined) return;
      const state = v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
      ch.append(i, { x: Date.now(), y: state });
    }));
    c.on('clear', () => ch.clear());
  }),

  def('charts.heatmap', 'matrix', L('Heat map', 'Mappa di calore'), {
    inputs: [{ name: 'grid', type: 'matrix', label: L('grid', 'griglia') }], outputs: [{ ...PICKED, label: L('picked cell', 'cella scelta') }],
    props: [titleProp, heightProp(), unitProp, decimalsProp, minProp, maxProp, toolsProp,
      P('rows', 'text', 'Names of the rows (comma separated)', 'Nomi delle righe (separati da virgola)', { default: '', translate: true }),
      P('cols', 'text', 'Names of the columns (comma separated)', 'Nomi delle colonne (separati da virgola)', { default: '', translate: true })],
  }, (el, c) => {
    const list = v => (v ? String(c.t(v)).split(',').map(x => x.trim()) : null);
    const ch = mount(el, c, 'heatmap', { rows: list(c.props.rows), cols: list(c.props.cols) }, () => PREVIEW.heatmap(c));
    if (ch && !c.design) c.on('grid', v => ch.update(v));
  }),

  def('charts.radar', 'globe', L('Radar', 'Radar'), {
    inputs: [{ name: 'data', type: 'any', label: L('data (name → value)', 'dati (nome → valore)') }], outputs: [{ ...PICKED, label: L('picked axis', 'asse scelto') }],
    props: [titleProp, heightProp(240), legendProp, unitProp, decimalsProp, minProp, maxProp, colorsProp, toolsProp],
  }, (el, c) => {
    const ch = mount(el, c, 'radar', {}, () => PREVIEW.radar(c));
    if (ch && !c.design) c.on('data', v => ch.update(v));
  }),

  def('charts.spark', 'chart', L('Sparkline', 'Mini linea'), {
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }, CLEAR],
    props: [titleProp, unitProp, decimalsProp, minProp, maxProp, colorsProp,
      P('points', 'number', 'Values kept', 'Valori tenuti', { default: 50, min: 2, max: 1000 }),
      P('height', 'number', 'Height (px)', 'Altezza (px)', { default: 28, min: 12, max: 200 })],
  }, (el, c) => {
    el.classList.add('lui-chartc', 'lui-chartc-spark');
    const lab = c.props.label ? c.h('span', { class: 'lui-lab' }, c.t(c.props.label)) : null;
    const val = c.h('b', {}, '—');
    if (lab) el.append(lab);
    const lib = c.host?.charts ?? c.charts;
    if (!lib?.chart) { el.append(c.h('div', { class: 'lui-missing' }, c.icon('warning'), 'charts')); return; }
    const keep = num(c.props.points) >= 2 ? num(c.props.points) : 50;
    const format = v => {
      const d = num(c.props.decimals);
      const text = new Intl.NumberFormat(c.lang, Number.isInteger(d) ? { minimumFractionDigits: d, maximumFractionDigits: d } : { maximumFractionDigits: 2 }).format(v);
      return c.props.unit ? `${text} ${c.props.unit}` : text;
    };
    const opts = optionsOf(c, { kind: 'spark', title: '', legend: false, tools: false, height: num(c.props.height) > 0 ? num(c.props.height) : 28, maxPoints: keep });
    const preview = c.design ? PREVIEW.spark(c) : [];
    const ch = lib.chart(el, { kind: 'spark', series: preview, options: opts });
    el.append(val);
    if (preview.length) val.textContent = format(preview[preview.length - 1]);
    if (c.design) return;
    c.on('value', v => { const n = num(v); if (!Number.isFinite(n)) return; ch.append(0, n); val.textContent = format(n); });
    c.on('clear', () => { ch.clear(); val.textContent = '—'; });
  }),
];
