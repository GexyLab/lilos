/**
 * The standard Componenti UI of Logic Studio. The browser loads this file (served by the engine)
 * in lilOS and in the IDE; the kernel imports it only to read the definitions. It imports nothing:
 * render(el, c) gets in `c` the SDK's h, icon and controls, the component's props, send() for what
 * the user does and on() for what the schemas send (see the SDK's LogicUI).
 *
 * Ports, seen from the schema: inputs are what a schema sets, outputs what the user does; a port
 * in both is «↔». Every component also has the inputs enabled and visible.
 */

const L = (en, it) => ({ en, it });
const COMMON = [{ name: 'enabled', type: 'bool', label: L('enabled', 'abilitato') }, { name: 'visible', type: 'bool', label: L('visible', 'visibile') }];
const P = (key, type, en, it, extra = {}) => ({ key, type, label: L(en, it), ...extra });
const labelProp = P('label', 'text', 'Label', 'Etichetta', { default: '', translate: true });
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const num = v => (typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.')));
// The images an Immagine takes from the program (camera frames): base64 data URLs of these types only
const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const DATA_IMAGE_MAX = 2 << 20;
const optionsOf = v =>(Array.isArray(v) ? v : String(v ?? '').split(',').map(s => s.trim()).filter(Boolean)).map(o => (o && typeof o === 'object' ? { value: String(o.value ?? o.label), label: String(o.label ?? o.value) } : { value: String(o), label: String(o) }));

function def(type, category, icon, label, spec, render) {
  return {
    type, version: 1, category, icon, label,
    inputs: [...(spec.inputs ?? []), ...COMMON], outputs: spec.outputs ?? [], props: spec.props ?? [],
    ...(spec.container && { container: true }), ...(spec.actionPort && { actionPort: spec.actionPort }),
    render,
  };
}

/** A label above a control, the way lilOS forms have it. */
function field(c, el, control) {
  el.classList.add('lui-field');
  const lab = c.props.label ? c.h('span', { class: 'lui-lab' }, c.t(c.props.label)) : null;
  el.replaceChildren(...[lab, control].filter(Boolean));
}

function format(v, c) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return text(v);
  const d = c.props.decimals;
  return new Intl.NumberFormat(c.lang, Number.isInteger(d) ? { minimumFractionDigits: d, maximumFractionDigits: d } : { maximumFractionDigits: 3 }).format(v);
}

export const components = [
  // ---------------------------------------------------------------- Testo e valori
  def('ui.label', 'values', 'text', L('Label', 'Etichetta'), {
    inputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    props: [P('text', 'text', 'Text', 'Testo', { default: 'Testo', translate: true }), P('size', 'select', 'Size', 'Dimensione', { default: 'normal', options: ['small', 'normal', 'title'] }), P('align', 'select', 'Alignment', 'Allineamento', { default: 'start', options: ['start', 'center', 'end'] })],
  }, (el, c) => {
    el.classList.add(`lui-size-${c.props.size}`, `lui-align-${c.props.align}`);
    el.textContent = c.t(c.props.text);
    c.on('text', v => { el.textContent = text(v); });
  }),

  def('ui.value', 'values', 'hash', L('Value', 'Valore'), {
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    props: [labelProp, P('unit', 'text', 'Unit', 'Unità', { default: '' }), P('decimals', 'number', 'Decimals', 'Decimali', { min: 0, max: 10 }), P('empty', 'text', 'When empty', 'Quando è vuoto', { default: '—' })],
  }, (el, c) => {
    el.classList.add('lui-value');
    const b = c.h('b', {}, c.props.empty);
    const unit = c.props.unit ? c.h('small', {}, ` ${c.props.unit}`) : null;
    el.append(...[c.props.label ? c.h('span', {}, `${c.t(c.props.label)} `) : null, b, unit].filter(Boolean));
    c.on('value', v => { b.textContent = v === null || v === undefined || v === '' ? c.props.empty : format(v, c); });
  }),

  def('ui.gauge', 'values', 'gauge', L('Gauge', 'Indicatore'), {
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }, { name: 'min', type: 'number', label: L('min', 'min') }, { name: 'max', type: 'number', label: L('max', 'max') }],
    props: [labelProp, P('min', 'number', 'Minimum', 'Minimo', { default: 0 }), P('max', 'number', 'Maximum', 'Massimo', { default: 100 }), P('unit', 'text', 'Unit', 'Unità', { default: '' }), P('decimals', 'number', 'Decimals', 'Decimali', { default: 1, min: 0, max: 6 })],
  }, (el, c) => {
    el.classList.add('lui-gauge');
    let min = num(c.props.min), max = num(c.props.max), value = null;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 120 70');
    const arc = (from, to) => {
      const p = a => [60 + 50 * Math.cos(Math.PI * (1 - a)), 62 - 50 * Math.sin(Math.PI * (1 - a))];
      const [x0, y0] = p(from), [x1, y1] = p(to);
      return `M${x0} ${y0} A50 50 0 0 1 ${x1} ${y1}`;
    };
    const track = document.createElementNS(ns, 'path'); track.setAttribute('d', arc(0, 1)); track.setAttribute('class', 'tr');
    const bar = document.createElementNS(ns, 'path'); bar.setAttribute('class', 'br');
    svg.append(track, bar);
    const val = c.h('b', {}, '—');
    el.append(svg, c.h('div', { class: 'lui-gauge-v' }, val, c.props.unit ? c.h('small', {}, ` ${c.props.unit}`) : null), c.props.label ? c.h('span', { class: 'lui-lab' }, c.t(c.props.label)) : null);
    const draw = () => {
      if (value === null || !Number.isFinite(value)) { bar.setAttribute('d', ''); val.textContent = '—'; return; }
      const f = Math.min(1, Math.max(0, (value - min) / ((max - min) || 1)));
      bar.setAttribute('d', f > 0.001 ? arc(0, f) : '');
      val.textContent = format(value, c);
    };
    c.on('value', v => { value = num(v); draw(); });
    c.on('min', v => { min = num(v); draw(); });
    c.on('max', v => { max = num(v); draw(); });
    draw();
  }),

  def('ui.lamp', 'values', 'lamp', L('Lamp', 'Spia'), {
    inputs: [{ name: 'on', type: 'bool', label: L('on', 'accesa') }, { name: 'color', type: 'text', label: L('color', 'colore') }],
    props: [labelProp, P('color', 'select', 'Color', 'Colore', { default: 'green', options: ['green', 'red', 'yellow', 'blue'] })],
  }, (el, c) => {
    el.classList.add('lui-lamp');
    const dot = c.h('i', { class: `c-${c.props.color}` });
    el.append(dot, c.props.label ? c.h('span', {}, c.t(c.props.label)) : null);
    c.on('on', v => dot.classList.toggle('on', !!v && v !== 'false'));
    c.on('color', v => { dot.className = `c-${text(v)}${dot.classList.contains('on') ? ' on' : ''}`; });
  }),

  def('ui.progress', 'values', 'progress', L('Progress bar', 'Barra di avanzamento'), {
    inputs: [{ name: 'value', type: 'number', label: L('value (0–100)', 'valore (0–100)') }],
    props: [labelProp, P('showValue', 'checkbox', 'Show the percentage', 'Mostra la percentuale', { default: true })],
  }, (el, c) => {
    const fill = c.h('i', {});
    const pct = c.h('small', {}, '');
    field(c, el, c.h('div', { class: 'lui-progress' }, c.h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, fill), c.props.showValue ? pct : null));
    c.on('value', v => { const n = Math.max(0, Math.min(100, num(v) || 0)); fill.style.width = `${n}%`; pct.textContent = `${Math.round(n)}%`; fill.parentElement.setAttribute('aria-valuenow', String(n)); });
  }),

  def('ui.image', 'values', 'image', L('Image', 'Immagine'), {
    inputs: [{ name: 'source', type: 'text', label: L('source', 'sorgente') }],
    props: [P('source', 'resource', 'Image', 'Immagine', { default: '' }), P('fit', 'select', 'Fit', 'Adatta', { default: 'contain', options: ['contain', 'cover'] }), P('alt', 'text', 'Description', 'Descrizione', { default: '', translate: true })],
  }, (el, c) => {
    el.classList.add('lui-image');
    const img = c.h('img', { alt: c.t(c.props.alt ?? ''), style: `object-fit:${c.props.fit}` });
    let shown = 0;   // the last source asked for: a slower one before it never takes its place
    const set = async src => {
      const n = ++shown;
      if (!src) { img.removeAttribute('src'); return; }
      const s = String(src);
      // An image made by the program (a webcam frame of the Hardware blocks): only a base64 data URL
      // of PNG, JPEG, WebP or GIF, at most 2 MB; never another scheme, never SVG
      if (s.startsWith('data:')) {
        if (s.length <= DATA_IMAGE_MAX && DATA_IMAGE.test(s)) img.src = s;
        else img.removeAttribute('src');
        return;
      }
      // Else only the project's own resources (never an address outside lilOS)
      try {
        const url = await c.host.resourceUrl?.(s);
        if (n !== shown) return;
        if (url) img.src = url; else img.removeAttribute('src');
      } catch { if (n === shown) img.removeAttribute('src'); }
    };
    el.append(img);
    set(c.props.source);
    c.on('source', set);
  }),

  def('ui.table', 'values', 'table', L('Table', 'Tabella'), {
    inputs: [{ name: 'rows', type: 'list', label: L('rows', 'righe') }],
    outputs: [{ name: 'selected', type: 'object', label: L('chosen row', 'riga scelta') }],
    props: [labelProp, P('columns', 'text', 'Columns (fields, comma separated; empty: all)', 'Colonne (campi separati da virgola; vuoto: tutti)', { default: '' })],
  }, (el, c) => {
    const table = c.h('table', { class: 'lui-table' });
    field(c, el, c.h('div', { class: 'lui-table-wrap' }, table));
    let rows = [];
    const draw = () => {
      const cols = c.props.columns ? String(c.props.columns).split(',').map(s => s.trim()).filter(Boolean) : [...new Set(rows.flatMap(r => (r && typeof r === 'object' && !Array.isArray(r) ? Object.keys(r) : ['valore'])))].slice(0, 12);
      table.replaceChildren(
        c.h('tr', {}, ...cols.map(k => c.h('th', {}, k))),
        ...rows.slice(0, 500).map((r, i) => {
          const tr = c.h('tr', { tabIndex: 0 }, ...cols.map(k => c.h('td', {}, text(r && typeof r === 'object' && !Array.isArray(r) ? r[k] : r))));
          const pick = () => { table.querySelectorAll('tr.on').forEach(x => x.classList.remove('on')); tr.classList.add('on'); c.send('selected', r && typeof r === 'object' ? r : { value: r, index: i }); };
          tr.addEventListener('click', pick);
          tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
          return tr;
        }));
    };
    c.on('rows', v => { rows = Array.isArray(v) ? v : []; draw(); });
    draw();
  }),

  def('ui.console', 'values', 'terminal', L('Console', 'Console'), {
    props: [P('console', 'console', 'Console', 'Console', { default: 'main' }), P('height', 'number', 'Height (px)', 'Altezza (px)', { default: 160, min: 60, max: 1200 })],
  }, (el, c) => {
    el.classList.add('lui-console');
    el.style.height = `${c.props.height}px`;
    const view = !c.design && c.host.consoleView?.(c.props.console);
    el.append(view || c.h('div', { class: 'lui-console-ph' }, c.icon('terminal'), c.props.console));
  }),

  // ---------------------------------------------------------------- Comandi
  def('ui.button', 'commands', 'press', L('Button', 'Pulsante'), {
    inputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    outputs: [{ name: 'pressed', type: 'pulse', label: L('pressed', 'premuto') }],
    props: [P('text', 'text', 'Text', 'Testo', { default: 'Pulsante', translate: true }), P('icon', 'icon', 'Icon', 'Icona', { default: '' }),
      P('variant', 'select', 'Look', 'Aspetto', { default: 'primary', options: ['primary', 'normal', 'danger'] }), P('action', 'action', 'Action on click', 'Azione al clic', { default: { kind: 'none' } })],
    actionPort: 'pressed',
  }, (el, c) => {
    const make = label => {
      const b = c.controls.actionButton({ label, primary: c.props.variant === 'primary', danger: c.props.variant === 'danger', icon: c.props.icon ? c.icon(c.props.icon) : null, onClick: () => c.send('pressed', true) });
      el.replaceChildren(b);
    };
    make(c.t(c.props.text));
    c.on('text', v => make(text(v)));
  }),

  def('ui.toggle', 'commands', 'toggle', L('Switch', 'Interruttore'), {
    inputs: [{ name: 'value', type: 'bool', label: L('value', 'valore') }], outputs: [{ name: 'value', type: 'bool', label: L('value', 'valore') }],
    props: [P('label', 'text', 'Label', 'Etichetta', { default: 'Interruttore', translate: true }), P('value', 'checkbox', 'On at the start', 'Acceso all\'inizio', { default: false })],
  }, (el, c) => {
    const make = v => el.replaceChildren(c.controls.toggle({ value: !!v, label: c.t(c.props.label), onChange: on => c.send('value', on) }));
    make(c.props.value);
    c.on('value', v => make(v === true || v === 'true' || v === 1));
  }),

  def('ui.checkbox', 'commands', 'check', L('Checkbox', 'Casella di spunta'), {
    inputs: [{ name: 'value', type: 'bool', label: L('value', 'valore') }], outputs: [{ name: 'value', type: 'bool', label: L('value', 'valore') }],
    props: [P('label', 'text', 'Label', 'Etichetta', { default: 'Casella', translate: true }), P('value', 'checkbox', 'Checked at the start', 'Spuntata all\'inizio', { default: false })],
  }, (el, c) => {
    const make = v => el.replaceChildren(c.controls.checkbox({ value: !!v, label: c.t(c.props.label), onChange: on => c.send('value', on) }));
    make(c.props.value);
    c.on('value', v => make(v === true || v === 'true' || v === 1));
  }),

  def('ui.radios', 'commands', 'list', L('Option buttons', 'Pulsanti di opzione'), {
    inputs: [{ name: 'value', type: 'text', label: L('value', 'valore') }, { name: 'options', type: 'list', label: L('options', 'opzioni') }],
    outputs: [{ name: 'value', type: 'text', label: L('value', 'valore') }],
    props: [labelProp, P('options', 'text', 'Options (comma separated)', 'Opzioni (separate da virgola)', { default: 'Uno, Due', translate: true }), P('value', 'text', 'Chosen at the start', 'Scelta all\'inizio', { default: '' })],
  }, (el, c) => {
    let options = optionsOf(c.t(c.props.options)), value = c.props.value;
    const make = () => field(c, el, c.controls.radios({ value, options, onChange: v => { value = v; c.send('value', v); } }));
    make();
    c.on('options', v => { options = optionsOf(v); make(); });
    c.on('value', v => { value = text(v); make(); });
  }),

  def('ui.select', 'commands', 'list', L('Selection', 'Selezione'), {
    inputs: [{ name: 'value', type: 'text', label: L('value', 'valore') }, { name: 'options', type: 'list', label: L('options', 'opzioni') }],
    outputs: [{ name: 'value', type: 'text', label: L('value', 'valore') }],
    props: [labelProp, P('options', 'text', 'Options (comma separated)', 'Opzioni (separate da virgola)', { default: 'Uno, Due', translate: true }), P('value', 'text', 'Chosen at the start', 'Scelta all\'inizio', { default: '' })],
  }, (el, c) => {
    let options = optionsOf(c.t(c.props.options)), value = c.props.value || options[0]?.value;
    const make = () => field(c, el, c.controls.selectField({ value, options, onChange: v => { value = v; c.send('value', v); } }));
    make();
    c.on('options', v => { options = optionsOf(v); make(); });
    c.on('value', v => { value = text(v); make(); });
  }),

  def('ui.slider', 'commands', 'slider', L('Slider', 'Cursore'), {
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }, { name: 'min', type: 'number', label: L('min', 'min') }, { name: 'max', type: 'number', label: L('max', 'max') }],
    outputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    props: [labelProp, P('min', 'number', 'Minimum', 'Minimo', { default: 0 }), P('max', 'number', 'Maximum', 'Massimo', { default: 100 }), P('step', 'number', 'Step', 'Passo', { default: 1 }), P('unit', 'text', 'Unit', 'Unità', { default: '' }), P('value', 'number', 'At the start', 'All\'inizio', { default: 0 })],
  }, (el, c) => {
    let min = num(c.props.min), max = num(c.props.max), value = num(c.props.value);
    const make = () => field(c, el, c.controls.slider({ value, min, max, step: num(c.props.step) || 1, unit: c.props.unit, onChange: v => { value = v; c.send('value', v); } }));
    make();
    c.on('value', v => { value = num(v); make(); });
    c.on('min', v => { min = num(v); make(); });
    c.on('max', v => { max = num(v); make(); });
  }),

  def('ui.text', 'commands', 'type', L('Text field', 'Campo di testo'), {
    inputs: [{ name: 'value', type: 'text', label: L('text', 'testo') }],
    outputs: [{ name: 'value', type: 'text', label: L('text', 'testo') }, { name: 'enter', type: 'pulse', label: L('enter', 'invio') }],
    props: [labelProp, P('placeholder', 'text', 'Placeholder', 'Suggerimento', { default: '', translate: true }), P('secret', 'checkbox', 'Hide what is typed', 'Nascondi quello che si scrive', { default: false })],
  }, (el, c) => {
    const make = v => {
      const input = c.controls.textField({ value: v ?? '', placeholder: c.t(c.props.placeholder), type: c.props.secret ? 'password' : 'text', onChange: x => c.send('value', x) });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') c.send('enter', true); });
      field(c, el, input);
    };
    make('');
    c.on('value', v => make(text(v)));
  }),

  def('ui.number', 'commands', 'hash', L('Number field', 'Campo numerico'), {
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    outputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    props: [labelProp, P('min', 'number', 'Minimum', 'Minimo'), P('max', 'number', 'Maximum', 'Massimo'), P('step', 'number', 'Step', 'Passo', { default: 1 }), P('unit', 'text', 'Unit', 'Unità', { default: '' })],
  }, (el, c) => {
    const make = v => {
      const input = c.controls.textField({ type: 'number', value: v ?? '', min: c.props.min, max: c.props.max, step: c.props.step, onChange: x => { if (x !== '') c.send('value', num(x)); } });
      field(c, el, c.h('span', { class: 'lui-num' }, input, c.props.unit ? c.h('small', {}, c.props.unit) : null));
    };
    make('');
    c.on('value', v => make(num(v)));
  }),

  def('ui.datetime', 'commands', 'calendar', L('Date and time', 'Data e ora'), {
    inputs: [{ name: 'value', type: 'text', label: L('value (ISO)', 'valore (ISO)') }],
    outputs: [{ name: 'value', type: 'text', label: L('value (ISO)', 'valore (ISO)') }],
    props: [labelProp, P('kind', 'select', 'Kind', 'Tipo', { default: 'datetime-local', options: ['date', 'time', 'datetime-local'] })],
  }, (el, c) => {
    const make = v => field(c, el, c.controls.textField({ type: c.props.kind, value: v ?? '', onChange: x => c.send('value', x) }));
    make('');
    c.on('value', v => make(text(v).slice(0, c.props.kind === 'date' ? 10 : c.props.kind === 'time' ? 5 : 16)));
  }),

  def('ui.list', 'commands', 'list', L('List', 'Elenco'), {
    inputs: [{ name: 'items', type: 'list', label: L('items', 'voci') }, { name: 'value', type: 'any', label: L('chosen', 'scelto') }],
    outputs: [{ name: 'value', type: 'any', label: L('chosen', 'scelto') }],
    props: [labelProp, P('items', 'text', 'Items (comma separated)', 'Voci (separate da virgola)', { default: '', translate: true }), P('height', 'number', 'Height (px)', 'Altezza (px)', { default: 140, min: 40, max: 1200 })],
  }, (el, c) => {
    let items = optionsOf(c.t(c.props.items)), value = null;
    const list = c.h('div', { class: 'lui-list', role: 'listbox', tabIndex: 0, style: `height:${c.props.height}px` });
    const draw = () => list.replaceChildren(...items.map(o => {
      const row = c.h('div', { role: 'option', class: o.value === value ? 'on' : '', 'aria-selected': String(o.value === value) }, o.label);
      row.addEventListener('click', () => { value = o.value; draw(); c.send('value', o.value); });
      return row;
    }));
    list.addEventListener('keydown', e => {
      const i = items.findIndex(o => o.value === value);
      const j = e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : e.key === 'ArrowUp' ? Math.max(0, i - 1) : -2;
      if (j === -2 || !items[j]) return;
      e.preventDefault(); value = items[j].value; draw(); c.send('value', value);
    });
    field(c, el, list);
    draw();
    c.on('items', v => { items = optionsOf(v); draw(); });
    c.on('value', v => { value = text(v); draw(); });
  }),

  def('ui.file', 'commands', 'folder', L('Choose file', 'Scegli file'), {
    inputs: [{ name: 'value', type: 'text', label: L('path', 'percorso') }],
    outputs: [{ name: 'value', type: 'text', label: L('path', 'percorso') }],
    props: [labelProp, P('exts', 'text', 'Extensions (comma separated, empty: all)', 'Estensioni (separate da virgola, vuoto: tutte)', { default: '' }), P('kind', 'select', 'Choose', 'Scegli', { default: 'file', options: ['file', 'folder'] })],
  }, (el, c) => {
    let value = '';
    const show = c.h('span', { class: 'lui-path' }, '—');
    const btn = c.controls.actionButton({ label: '…', icon: c.icon(c.props.kind === 'folder' ? 'folder' : 'file'), onClick: async () => {
      const path = await c.host.pickFile?.({ kind: c.props.kind, exts: c.props.exts ? String(c.props.exts).split(',').map(s => s.trim().replace(/^\./, '')).filter(Boolean) : null });
      if (path) { value = path; show.textContent = path; c.send('value', path); }
    } });
    field(c, el, c.h('span', { class: 'lui-file' }, show, btn));
    c.on('value', v => { value = text(v); show.textContent = value || '—'; });
  }),

  def('ui.color', 'commands', 'palette', L('Color', 'Colore'), {
    inputs: [{ name: 'value', type: 'text', label: L('color', 'colore') }], outputs: [{ name: 'value', type: 'text', label: L('color', 'colore') }],
    props: [labelProp, P('value', 'text', 'At the start', 'All\'inizio', { default: '#2a78d6' })],
  }, (el, c) => {
    const colors = ['#2a78d6', '#1baf7a', '#eda100', '#e34948', '#6250d6', '#eb6834', '#6b7280'].map(v => ({ value: v, label: v }));
    const make = v => field(c, el, c.controls.swatches({ colors, value: v, onChange: x => c.send('value', x) }));
    make(c.props.value);
    c.on('value', v => make(text(v)));
  }),

  // ---------------------------------------------------------------- Contenitori
  def('ui.column', 'containers', 'rows', L('Column', 'Colonna'), {
    container: true,
    props: [P('gap', 'number', 'Space between (px)', 'Spazio tra (px)', { default: 10, min: 0, max: 64 }), P('padding', 'number', 'Margin (px)', 'Margine (px)', { default: 0, min: 0, max: 64 }), P('align', 'select', 'Alignment', 'Allineamento', { default: 'stretch', options: ['stretch', 'start', 'center', 'end'] })],
  }, (el, c) => {
    el.classList.add('lui-box', 'lui-col');
    el.style.cssText += `gap:${c.props.gap}px;padding:${c.props.padding}px;align-items:${c.props.align}`;
    c.children(el);
  }),

  def('ui.row', 'containers', 'cols', L('Row', 'Riga'), {
    container: true,
    props: [P('gap', 'number', 'Space between (px)', 'Spazio tra (px)', { default: 10, min: 0, max: 64 }), P('padding', 'number', 'Margin (px)', 'Margine (px)', { default: 0, min: 0, max: 64 }), P('align', 'select', 'Alignment', 'Allineamento', { default: 'center', options: ['stretch', 'start', 'center', 'end'] }), P('wrap', 'checkbox', 'Wraps when it needs to', 'Va a capo se serve', { default: true })],
  }, (el, c) => {
    el.classList.add('lui-box', 'lui-row');
    el.style.cssText += `gap:${c.props.gap}px;padding:${c.props.padding}px;align-items:${c.props.align};flex-wrap:${c.props.wrap ? 'wrap' : 'nowrap'}`;
    c.children(el);
  }),

  def('ui.grid', 'containers', 'grid', L('Grid', 'Griglia'), {
    container: true,
    props: [P('columns', 'number', 'Columns (0: automatic)', 'Colonne (0: automatiche)', { default: 2, min: 0, max: 12 }), P('gap', 'number', 'Space between (px)', 'Spazio tra (px)', { default: 10, min: 0, max: 64 }), P('padding', 'number', 'Margin (px)', 'Margine (px)', { default: 0, min: 0, max: 64 })],
  }, (el, c) => {
    el.classList.add('lui-box', 'lui-grid');
    const cols = num(c.props.columns) > 0 ? `repeat(${num(c.props.columns)}, minmax(0, 1fr))` : 'repeat(auto-fill, minmax(140px, 1fr))';
    el.style.cssText += `gap:${c.props.gap}px;padding:${c.props.padding}px;grid-template-columns:${cols}`;
    c.children(el);
  }),

  def('ui.group', 'containers', 'group', L('Box', 'Riquadro'), {
    container: true,
    inputs: [{ name: 'title', type: 'text', label: L('title', 'titolo') }],
    props: [P('title', 'text', 'Title', 'Titolo', { default: 'Riquadro', translate: true }), P('gap', 'number', 'Space between (px)', 'Spazio tra (px)', { default: 8, min: 0, max: 64 })],
  }, (el, c) => {
    el.classList.add('lui-group');
    const title = c.h('legend', {}, c.t(c.props.title));
    const body = c.h('div', { class: 'lui-box lui-col', style: `gap:${c.props.gap}px` });
    el.append(c.h('fieldset', {}, title, body));
    c.children(body);
    c.on('title', v => { title.textContent = text(v); });
  }),

  def('ui.tabs', 'containers', 'tabs', L('Tabs', 'Schede'), {
    container: true,
    inputs: [{ name: 'value', type: 'number', label: L('open tab', 'scheda aperta') }], outputs: [{ name: 'value', type: 'number', label: L('open tab', 'scheda aperta') }],
    props: [P('tabs', 'text', 'Names of the tabs (comma separated)', 'Nomi delle schede (separati da virgola)', { default: 'Uno, Due', translate: true })],
  }, (el, c) => {
    el.classList.add('lui-tabs');
    const names = optionsOf(c.t(c.props.tabs)).map(o => o.label);
    const bar = c.h('div', { class: 'lui-tabbar', role: 'tablist' });
    const body = c.h('div', { class: 'lui-tabbody' });
    const pages = c.children();
    let open = 0;
    const show = i => {
      open = Math.max(0, Math.min(pages.length - 1, i));
      bar.replaceChildren(...pages.map((p, k) => {
        const b = c.h('button', { type: 'button', role: 'tab', class: k === open ? 'on' : '', 'aria-selected': String(k === open) }, names[k] ?? String(k + 1));
        b.addEventListener('click', () => { show(k); c.send('value', k + 1); });
        return b;
      }));
      // In the editor every page shows, one under the other
      pages.forEach((p, k) => { p.hidden = !c.design && k !== open; });
    };
    body.append(...pages);
    el.append(bar, body);
    show(0);
    c.on('value', v => show(num(v) - 1));
  }),

  def('ui.free', 'containers', 'free', L('Free area', 'Area libera'), {
    container: true,
    props: [P('height', 'number', 'Height (px)', 'Altezza (px)', { default: 240, min: 40, max: 2000 })],
  }, (el, c) => {
    el.classList.add('lui-free');
    el.style.height = `${c.props.height}px`;
    c.children(el);
  }),

  def('ui.separator', 'containers', 'minus', L('Separator', 'Separatore'), {
    props: [P('kind', 'select', 'Kind', 'Tipo', { default: 'line', options: ['line', 'space'] }), P('size', 'number', 'Size (px)', 'Dimensione (px)', { default: 12, min: 0, max: 200 })],
  }, (el, c) => {
    el.classList.add('lui-sep', c.props.kind === 'space' ? 'space' : 'line');
    el.style.height = `${c.props.size}px`;
  }),
];
