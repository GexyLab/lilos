import { h, icon, fs, LogicUI, LogicConsoleView, textField, selectField, checkbox, actionButton, messageBox, Window, portsOf } from '@lilos/sdk';
import { pickFile } from '@lilos/system';
import { DRAG_TYPE } from './palette.js';
import { t, i18n } from './i18n.js';

/**
 * A window (.lsui) in its tab: «Progetta» draws it with its Componenti UI (SDK LogicUI) to put
 * them in place: a click in the palette adds into the container selected (or at the end), dragging
 * puts them where the blue line shows; «Anteprima» works like the real window, live while a test runs.
 * Each component has its object in a schema (Proprietà → «Oggetto nello schema»): the schemas
 * reach it only through that.
 */
const ICONS = ['', 'drop', 'play', 'stop', 'power', 'gear', 'bell', 'check', 'x', 'plus', 'minus', 'refresh', 'save', 'trash', 'warning', 'info', 'home', 'window', 'link'];

export class WindowEditor {
  el; doc; name;
  #studio; #surface; #frame; #ui = null; #mode = 'design';
  #sel = null;
  #live = null;
  #drop = null;           // { parent, index, line }
  #urls = [];             // blob URLs of the resources shown, freed when drawn again

  constructor(studio, doc, name) {
    this.#studio = studio;
    this.doc = doc;
    this.name = name;
    this.#frame = h('div', { class: 'ls-wframe' });
    this.#surface = h('div', { class: 'ls-wsurface', tabIndex: 0 }, this.#frame);
    this.el = h('div', { class: 'ls-editor ls-window' }, this.#surface);
    doc.on('change', () => { this.render(); studio.inspector.render(); studio.renderStatus(); });
    this.#bind();
    this.render();
  }

  get selected() { return this.#sel; }
  setCatalog() { this.render(); }
  destroy() { this.#ui?.destroy(); }
  show() { this.#surface.focus({ preventScroll: true }); }

  statusText() {
    const n = this.doc.components(type => this.#studio.componentDef(type)).length;
    return t('status.window', { n, max: this.#studio.limits?.maxComponents ?? 200, w: this.doc.data.size.w, h: this.doc.data.size.h });
  }

  toolbar(b) {
    return [
      b('pencil', t('window.design'), () => this.setMode('design'), { cls: this.#mode === 'design' ? 'on' : '' }),
      b('eye', t('window.preview'), () => this.setMode('preview'), { cls: this.#mode !== 'design' ? 'on' : '' }),
    ];
  }

  setMode(mode) {
    this.#mode = mode;
    this.render();
    this.#studio.renderToolbar();
  }

  /** A test is running: the preview shows it live. */
  attach(live) { this.#live = live; if (this.#mode !== 'design') this.render(); }
  detach() { this.#live = null; if (this.#mode !== 'design') this.render(); }

  #texts() {
    const texts = this.#studio.ws?.project?.data.texts ?? {};
    return texts[i18n.lang] ?? {};
  }

  render() {
    const studio = this.#studio;
    const d = this.doc.data;
    const mode = this.#mode === 'design' ? 'design' : this.#live ? 'live' : 'preview';
    this.#ui?.destroy();
    this.#urls.splice(0).forEach(u => URL.revokeObjectURL(u));
    this.#ui = new LogicUI({ window: d, components: studio.components ?? new Map(), lang: i18n.lang, texts: this.#texts(), host: this.#host(), mode });
    if (mode === 'live') this.#ui.attach(this.#live, this.name);
    this.#ui.on('action', ({ action }) => this.#previewAction(action));
    this.#frame.style.width = `${d.size.w}px`;
    this.#frame.style.height = `${d.size.h}px`;
    this.#frame.replaceChildren(
      h('div', { class: 'ls-wtitle' }, icon('window'), h('span', {}, d.title || this.name), h('span', { class: 'sp' }), h('i'), h('i'), h('i')),
      h('div', { class: 'ls-wbody' }, this.#ui.el));
    if (this.#sel) this.#ui.elementOf(this.#sel)?.classList.add('lui-sel');
  }

  /** What the components may ask, in the IDE: consoles of the test, resources, files, other windows. */
  #host() {
    const studio = this.#studio;
    return {
      consoleView: id => (studio.runner.consoles ? new LogicConsoleView(studio.runner.consoles, { console: id }).el : null),
      resourceUrl: async path => {
        const node = studio.ws?.nodeAt?.(String(path).replace(/^\/+/, ''));
        if (!node || node.type !== 'file') return null;
        const url = URL.createObjectURL(await fs.readBlob(node.id));
        this.#urls.push(url);
        return url;
      },
      pickFile: async ({ kind, exts }) => {
        const node = await pickFile(studio.openWindow, { kind, exts });
        return node ? fs.path(node.id ?? node) : null;
      },
      openWindow: name => this.#previewAction({ kind: 'open', window: name }),
    };
  }

  /** «Apri una finestra» in the preview: the other window in a window of its own. */
  async #previewAction(action) {
    const studio = this.#studio;
    if (action.kind !== 'open' || !action.window) return;
    const path = studio.ws?.project?.data.windows[action.window];
    if (!path) return;
    const doc = await studio.ws.doc(path);
    const win = new Window({ title: doc.data.title || action.window, subtitle: t('window.previewOf'), icon: 'window', width: doc.data.size.w, height: doc.data.size.h + 30 });
    const ui = new LogicUI({ window: doc.data, components: studio.components, lang: i18n.lang, texts: this.#texts(), host: this.#host(), mode: this.#live ? 'live' : 'preview' });
    if (this.#live) ui.attach(this.#live, action.window);
    win.body.append(h('div', { class: 'ls-wbody' }, ui.el));
    win.on('destroy', () => ui.destroy());
    studio.openWindow(win, `preview-${action.window}`);
  }

  // ------------------------------------------------------------------ selection, adding, moving

  select(id) {
    this.#sel = id;
    for (const el of this.#frame.querySelectorAll('.lui-sel')) el.classList.remove('lui-sel');
    if (id) this.#ui?.elementOf(id)?.classList.add('lui-sel');
    this.#studio.inspector.render();
  }

  #isContainer(type) { return !!this.#studio.componentDef(type)?.container; }

  /** Adds a component: into the selected container, or next to the selected one, or at the end. */
  place(def, target = null) {
    if (this.#mode !== 'design') this.setMode('design');
    const max = this.#studio.limits?.maxComponents ?? 200;
    if (this.doc.nodes().length > max) { messageBox(this.#studio.win, { icon: 'warning', title: t('limit.components', { n: max }) }); return null; }
    let parent = 'root', index = Infinity;
    if (target) ({ parent, index } = target);
    else if (this.#sel) {
      const found = this.doc.find(this.#sel);
      if (found && this.#isContainer(found.node.type) && found.node.children) parent = found.node.id;
      else if (found?.parent) { parent = found.parent.id; index = found.index + 1; }
    }
    const props = def.type === 'ui.label' ? {} : {};
    try {
      const id = this.doc.add(def, parent, index, props);
      if (target?.layout) this.doc.setLayout(id, target.layout);
      this.select(id);
      return id;
    } catch (err) {
      messageBox(this.#studio.win, { icon: 'warning', title: err.message });
      return null;
    }
  }

  #bind() {
    const s = this.#surface;
    s.addEventListener('click', e => {
      if (this.#mode !== 'design') return;
      const c = e.target.closest('.lui-c');
      this.select(c && c.dataset.id !== 'root' ? c.dataset.id : null);
    });
    s.addEventListener('dblclick', e => {
      const c = e.target.closest('.lui-c');
      if (c && this.#mode === 'design') this.#openObject(c.dataset.id);
    });
    s.addEventListener('keydown', e => {
      if (this.#mode !== 'design' || !this.#sel || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.#remove(this.#sel); }
      if (e.key === 'Escape') this.select(null);
    });
    // From the palette
    s.addEventListener('dragover', e => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE) || this.#mode !== 'design') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.#showDrop(e.clientX, e.clientY, null);
    });
    s.addEventListener('dragleave', e => { if (!s.contains(e.relatedTarget)) this.#hideDrop(); });
    s.addEventListener('drop', e => {
      const type = e.dataTransfer.getData(DRAG_TYPE);
      const def = type && this.#studio.componentDef(type);
      const target = this.#drop;
      this.#hideDrop();
      if (!def || !target) return;
      e.preventDefault();
      this.place(def, target);
    });
    // Moving what is there
    s.addEventListener('pointerdown', e => {
      if (this.#mode !== 'design' || e.button !== 0) return;
      const c = e.target.closest('.lui-c');
      if (!c || c.dataset.id === 'root') return;
      const id = c.dataset.id;
      const sx = e.clientX, sy = e.clientY;
      let moving = false;
      const move = ev => {
        if (!moving && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        moving = true;
        c.classList.add('lui-moving');
        this.#showDrop(ev.clientX, ev.clientY, id);
      };
      const end = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', end);
        c.classList.remove('lui-moving');
        const target = this.#drop;
        this.#hideDrop();
        if (!moving || !target) return;
        if (target.layout) { if (target.parent === this.doc.find(id)?.parent?.id) this.doc.setLayout(id, target.layout); else { this.doc.move(id, target.parent, target.index); this.doc.setLayout(id, target.layout); } }
        else this.doc.move(id, target.parent, target.index);
        this.select(id);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', end);
    });
  }

  /** Where something dropped at (x, y) goes: { parent, index } (and a layout in an Area libera). */
  #showDrop(x, y, moving) {
    this.#hideDrop(false);
    let el = document.elementFromPoint(x, y)?.closest('.lui-c');
    // never into what is moving
    while (el && moving && (el.dataset.id === moving || el.closest(`[data-id="${moving}"]`))) el = el.parentElement?.closest('.lui-c');
    let container = el;
    while (container && !this.#isContainer(container.dataset.type)) container = container.parentElement?.closest('.lui-c');
    if (!container) return;
    const id = container.dataset.id;
    const node = this.doc.find(id)?.node;
    if (!node) return;
    if (node.type === 'ui.free') {
      const r = container.getBoundingClientRect();
      this.#drop = { parent: id, index: Infinity, layout: { x: Math.round(Math.max(0, x - r.left - 10)), y: Math.round(Math.max(0, y - r.top - 10)) } };
      container.classList.add('lui-drop-in');
      return;
    }
    // the children's elements, in order
    const kids = (node.children ?? []).map(ch => this.#ui.elementOf(ch.id)).filter(Boolean);
    const horizontal = node.type === 'ui.row';
    let index = kids.length;
    for (const [i, k] of kids.entries()) {
      const r = k.getBoundingClientRect();
      if (horizontal ? x < r.left + r.width / 2 : y < r.top + r.height / 2) { index = i; break; }
    }
    this.#drop = { parent: id, index };
    const fr = this.#frame.getBoundingClientRect();
    const ref = kids[index] ?? kids[index - 1];
    const cr = container.getBoundingClientRect();
    let line;
    if (!ref) line = { left: cr.left + 6, top: cr.top + 6, width: cr.width - 12, height: 3 };
    else {
      const r = ref.getBoundingClientRect();
      const after = !kids[index];
      line = horizontal
        ? { left: (after ? r.right : r.left) - 2, top: r.top, width: 3, height: r.height }
        : { left: r.left, top: (after ? r.bottom : r.top) - 2, width: r.width, height: 3 };
    }
    const bar = h('div', { class: 'lui-drop-line', style: `left:${line.left - fr.left}px;top:${line.top - fr.top}px;width:${line.width}px;height:${line.height}px` });
    this.#frame.append(bar);
    container.classList.add('lui-drop-in');
  }

  #hideDrop(clear = true) {
    for (const el of this.#frame.querySelectorAll('.lui-drop-line')) el.remove();
    for (const el of this.#frame.querySelectorAll('.lui-drop-in')) el.classList.remove('lui-drop-in');
    if (clear) this.#drop = null;
  }

  async #remove(id) {
    const obj = this.#objectOf(id);
    if (obj) {
      const res = await messageBox(this.#studio.win, {
        icon: 'warning', title: t('window.removeQ'), text: t('window.removeObject', { schema: obj.schema }),
        buttons: ['cancel', { value: 'ok', label: t('explorer.remove'), danger: true }],
      });
      if (res !== 'ok') return;
    }
    this.doc.remove([id]);
    this.select(null);
  }

  // ------------------------------------------------------------------ the object in a schema

  /** The schema (open or not, loaded) that holds the object of a component: { schema, path, block } | null. */
  #objectOf(id) {
    const ws = this.#studio.ws;
    if (!ws?.project) return null;
    for (const [schema, path] of Object.entries(ws.project.data.schemas)) {
      const doc = ws.loaded(path);
      const b = doc?.data.blocks.find(x => this.#studio.blockDef(x.type)?.role === 'component' && x.config.window === this.name && x.config.component === id);
      if (b) return { schema, path, block: b.id };
    }
    return null;
  }

  async #openObject(id) {
    const obj = this.#objectOf(id);
    if (!obj) return;
    await this.#studio.openElement('schemas', obj.path);
    const view = this.#studio.current?.view;
    view?.canvas.select([obj.block]);
    view?.canvas.fit([obj.block]);
  }

  /** Makes the object of a component in a schema (at the middle of its view) and shows it there. */
  async #makeObject(id, schema) {
    const ws = this.#studio.ws;
    const path = ws.project.data.schemas[schema];
    const def = (this.#studio.catalog?.packages ?? []).flatMap(p => p.blocks).find(b => b.role === 'component');
    if (!path || !def) return;
    const doc = await ws.doc(path);
    const node = this.doc.find(id)?.node;
    const v = doc.data.view ?? { x: 0, y: 0, zoom: 1 };
    const blockId = doc.addBlock(def, { x: Math.round((-v.x + 300) / (v.zoom || 1)), y: Math.round((-v.y + 160) / (v.zoom || 1)), config: { window: this.name, component: id } });
    if (node?.props?.label || node?.props?.text) doc.setLabel(blockId, String(node.props.label || node.props.text).slice(0, 80));
    await this.#openObject(id);
  }

  // ------------------------------------------------------------------ Proprietà

  inspector() {
    const studio = this.#studio;
    const sec = text => h('h5', { class: 'ls-sec' }, text);
    const row = (label, control) => h('label', { class: 'ls-field' }, h('span', {}, label), control);
    if (!this.#sel) {
      const d = this.doc.data;
      return [
        sec(t('window.window')),
        row(t('window.title'), textField({ value: d.title, maxLength: 120, onChange: v => this.doc.setTitle(v) })),
        row(t('window.width'), textField({ type: 'number', value: d.size.w, min: 160, max: 4000, onChange: v => this.doc.setSize({ w: Math.max(160, Number(v) || 480) }) })),
        row(t('window.height'), textField({ type: 'number', value: d.size.h, min: 120, max: 4000, onChange: v => this.doc.setSize({ h: Math.max(120, Number(v) || 360) }) })),
        h('div', { class: 'ls-field' }, checkbox({ value: d.size.resizable !== false, label: t('window.resizable'), onChange: v => this.doc.setSize({ resizable: v }) })),
        sec(t('window.opens')),
        h('p', { class: 'ls-hint' }, this.#entryText()),
        h('p', { class: 'ls-hint' }, t('window.hint')),
      ];
    }
    const found = this.doc.find(this.#sel);
    if (!found) return [];
    const node = found.node;
    const def = studio.componentDef(node.type);
    if (!def) return [h('p', { class: 'ls-insp-note warn' }, t('window.missing', { type: node.type }))];
    const out = [h('div', { class: 'ls-insp-h cat-ui' }, icon(def.icon ?? 'window'), h('b', {}, studio.label(def)), h('span', { class: 'ls-hint mono', style: 'margin-left:auto' }, node.id))];
    if ((def.props ?? []).length) out.push(sec(t('inspector.settings')));
    for (const p of def.props ?? []) out.push(this.#prop(node, p));
    if (!def.container) {
      const ports = portsOf(node, def, { lang: i18n.lang, component: { def, added: node.added ?? { inputs: [], outputs: [] } } });
      out.push(sec(t('inspector.ports')));
      out.push(h('table', { class: 'ls-ports' },
        ...ports.inputs.map(p => h('tr', {}, h('td', { class: 'nm' }, h('i', { class: `ls-dotc t-${p.type}` }), p.label), h('td', { class: 'ty' }, `← ${t(`type.${p.type}`)}`))),
        ...ports.outputs.filter(p => !p.error).map(p => h('tr', {}, h('td', { class: 'nm' }, h('i', { class: `ls-dotc t-${p.type}` }), p.label), h('td', { class: 'ty' }, `→ ${t(`type.${p.type}`)}`)))));
      out.push(h('p', { class: 'ls-hint' }, t('window.portsHint')));
      // Its object in a schema
      out.push(sec(t('window.object')));
      const obj = this.#objectOf(node.id);
      const ws = studio.ws;
      if (obj) {
        out.push(h('div', { class: 'ls-port-line' }, icon('blocks'), h('span', {}, `${obj.schema} › ${obj.block}`)));
        out.push(h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('window.openObject'), icon: icon('open'), onClick: () => this.#openObject(node.id) })));
      } else if (ws?.project) {
        const schemas = Object.keys(ws.project.data.schemas);
        out.push(h('p', { class: 'ls-hint' }, t('window.noObject')));
        let chosen = schemas[0];
        out.push(row(t('window.inSchema'), selectField({ value: chosen, options: schemas, onChange: v => { chosen = v; } })));
        out.push(h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('window.makeObject'), icon: icon('plus'), primary: true, onClick: () => this.#makeObject(node.id, chosen) })));
      }
    }
    out.push(h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('window.remove'), icon: icon('trash'), danger: true, onClick: () => this.#remove(node.id) })));
    return out;
  }

  #entryText() {
    const project = this.#studio.ws?.project?.data;
    if (!project) return '';
    if (project.main === this.name) return t('entry.main');
    const entry = project.entrypoints?.[this.name];
    return entry ? t(`entry.${entry.kind}`) : t('entry.none');
  }

  #prop(node, p) {
    const studio = this.#studio;
    const value = node.props?.[p.key] ?? p.default;
    const set = v => this.doc.setProp(node.id, p.key, v);
    const label = studio.label(p);
    const row = control => h('label', { class: 'ls-field' }, h('span', {}, label), control);
    switch (p.type) {
      case 'checkbox': return h('div', { class: 'ls-field' }, checkbox({ value: !!value, label, onChange: set }));
      case 'number': return row(textField({ type: 'number', value: value ?? '', min: p.min, max: p.max, step: p.step ?? 'any', onChange: v => set(v === '' ? undefined : Number(v)) }));
      case 'select': return row(selectField({ value, options: (p.options ?? []).map(o => ({ value: o, label: optLabel(p.key, o) })), onChange: set }));
      case 'icon': return row(selectField({ value: value ?? '', options: ICONS.map(i => ({ value: i, label: i || '—' })), onChange: set }));
      case 'console': {
        const list = studio.ws?.project?.data.consoles.list ?? [{ id: 'main', name: t('console.main') }];
        return row(selectField({ value: value ?? 'main', options: list.map(c => ({ value: c.id, label: c.name })), onChange: set }));
      }
      case 'resource': {
        const res = this.#resources();
        return row(selectField({ value: value ?? '', options: [{ value: '', label: '—' }, ...res.map(r => ({ value: r, label: r }))], onChange: set }));
      }
      case 'action': {
        const a = value && typeof value === 'object' ? value : { kind: 'none' };
        const windows = Object.keys(studio.ws?.project?.data.windows ?? {}).filter(w => w !== this.name);
        return h('div', { class: 'ls-field' }, h('span', {}, label),
          selectField({ value: a.kind, options: ['none', 'open', 'close'].map(k => ({ value: k, label: t(`action.${k}`) })), onChange: k => set(k === 'open' ? { kind: k, window: windows[0] ?? '' } : { kind: k }) }),
          a.kind === 'open' ? selectField({ value: a.window, options: windows, onChange: w => set({ ...a, window: w }) }) : null,
          h('small', { class: 'ls-hint' }, t('action.hint')));
      }
      default: return row(textField({ value: value ?? '', maxLength: 2000, onChange: set }));
    }
  }

  /** The files under risorse/ (relative to the project), for images. */
  #resources() {
    const ws = this.#studio.ws;
    const folder = ws?.groups.find(g => g.key === 'resources')?.folder;
    const out = [];
    const walk = id => { for (const n of fs.children(id)) { if (n.type === 'folder') walk(n.id); else out.push(ws.relative(n.id)); } };
    if (folder) walk(folder);
    return out;
  }
}

function optLabel(key, value) {
  const k = `opt.${key}.${value}`;
  const s = t(k);
  return s === k ? String(value) : s;
}
