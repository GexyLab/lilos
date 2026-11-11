import { h } from '../../core/dom.js';
import { Emitter } from '../../core/events.js';
import { icon } from '../icons.js';
import { selectionGesture } from '../selectionGesture.js';
import { portsOf, linkKey, typesMatch, logicText } from '../../core/logicModel.js';
import { formatLogicValue } from './format.js';

/**
 * The drawing of a Logic Studio schema (LogicSchema): blocks, their ports and the links between
 * them, on a canvas that pans and zooms. Ports are never added or removed here (only in the
 * properties sidebar): the added ones are shown with their name in italics.
 *
 *   const canvas = new LogicCanvas({ schema, catalog, lang, componentOf, labels });
 *   el.append(canvas.el);
 *   canvas.on('select', ({ blocks, links }) => …)
 *
 * Options
 *   schema        LogicSchema
 *   catalog       logic.catalog() (its packages' blocks)
 *   lang          the language of the labels
 *   componentOf   block → { def, added } | null: for the object of a Componente UI, the component's
 *                 definition and added ports (its ports are the component's)
 *   labels        { error, missing } the host app's texts (defaults: lilOS's)
 *   readOnly      no editing (a program shown live)
 *
 * Mouse: drag a block to move it (the selected ones together); drag from an output to an input
 * to link them, from a linked input to take its link away; drag the background to select with a
 * rectangle, with the middle button (or Space held) to move the view; the wheel zooms where the
 * pointer is. Keys (the canvas focused): Canc removes the selection, Ctrl+A selects all, Ctrl+D
 * duplicates, arrows move the selection, Esc deselects.
 *
 * Events: 'select' { blocks, links } · 'open' { id } (double click) · 'contextmenu' { kind:
 * 'block'|'link'|'canvas', id, link, clientX, clientY, world } · 'linkDrop' { from, world, clientX,
 * clientY } (a link dropped on nothing) · 'view' { x, y, zoom }
 */

const MIN_ZOOM = 0.2, MAX_ZOOM = 2.5, GRID = 20;

export class LogicCanvas extends Emitter {
  el; #world; #svg; #band;
  #schema; #catalog; #lang; #componentOf; #labels; #readOnly;
  #defs = new Map();
  #view = { x: 0, y: 0, zoom: 1 };
  #blocks = new Map();     // id → { el, ports: Map('in:name'|'out:name' → el), sig }
  #sel = new Set();
  #selLinks = new Set();
  #live = null; #liveOff = []; #values = new Map(); #states = new Map(); #schemaName = '';
  #drawing = false; #space = false; #temp = null;
  #offs = [];

  constructor({ schema, catalog, lang = 'en', componentOf = () => null, labels = {}, readOnly = false } = {}) {
    super();
    this.#schema = schema;
    this.#lang = lang;
    this.#componentOf = componentOf;
    this.#labels = { error: logicText('error'), missing: logicText('missing'), ...labels };
    this.#readOnly = readOnly;
    this.setCatalog(catalog);
    this.#svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.#svg.setAttribute('class', 'lgc-links');
    this.#world = h('div', { class: 'lgc-world' }, this.#svg);
    this.el = h('div', { class: 'lgc', tabIndex: 0, dataset: { wheel: 'native', pan: 'native' } }, this.#world);
    this.#view = { ...(schema.data.view ?? { x: 0, y: 0, zoom: 1 }) };
    this.#bind();
    const onChange = () => this.refresh();
    schema.on('change', onChange);
    this.#offs.push(() => schema.off('change', onChange));
    this.refresh();
  }

  get view() { return { ...this.#view }; }
  get selection() { return { blocks: [...this.#sel], links: [...this.#selLinks] }; }
  get readOnly() { return this.#readOnly; }

  setCatalog(catalog) {
    this.#defs = new Map((catalog?.packages ?? []).flatMap(p => p.blocks.map(b => [b.type, b])));
    if (this.#world) this.refresh(true);
  }

  def(type) { return this.#defs.get(type) ?? null; }

  setReadOnly(on) { this.#readOnly = !!on; this.el.classList.toggle('lgc-ro', this.#readOnly); }

  destroy() {
    this.detach();
    this.#offs.forEach(f => f());
    this.el.remove();
  }

  // ------------------------------------------------------------------ drawing

  /** Draws again what changed (all = true: everything). */
  refresh(all = false) {
    const data = this.#schema.data;
    const seen = new Set();
    for (const b of data.blocks) {
      seen.add(b.id);
      const def = this.#defs.get(b.type);
      const comp = def?.role === 'component' ? this.#componentOf(b) : null;
      const sig = JSON.stringify([b, !!def, comp?.def?.type, comp?.added, this.#lang]);
      let entry = this.#blocks.get(b.id);
      if (!entry || entry.sig !== sig || all) {
        const fresh = this.#blockEl(b, def, comp);
        if (entry) entry.el.replaceWith(fresh.el); else this.#world.append(fresh.el);
        entry = { ...fresh, sig };
        this.#blocks.set(b.id, entry);
      } else {
        entry.el.style.left = `${b.x}px`;
        entry.el.style.top = `${b.y}px`;
      }
      entry.el.classList.toggle('sel', this.#sel.has(b.id));
      const state = this.#states.get(b.id);
      entry.el.classList.toggle('run', state === 'run');
      entry.el.classList.toggle('err', state === 'error');
    }
    for (const [id, entry] of this.#blocks) if (!seen.has(id)) { entry.el.remove(); this.#blocks.delete(id); this.#sel.delete(id); }
    const keys = new Set(data.links.map(linkKey));
    for (const k of this.#selLinks) if (!keys.has(k)) this.#selLinks.delete(k);
    this.#applyView();
    this.#drawLinks();
  }

  #blockEl(b, def, comp) {
    const lang = this.#lang;
    const name = def ? (def.label?.[lang] ?? def.label?.en ?? def.type) : b.type;
    const ports = def ? portsOf(b, def, { lang, component: comp, errorLabel: this.#labels.error }) : { inputs: [], outputs: [] };
    const linkedIn = new Set(this.#schema.data.links.filter(l => l.to[0] === b.id).map(l => l.to[1]));
    const linkedOut = new Set(this.#schema.data.links.filter(l => l.from[0] === b.id).map(l => l.from[1]));
    let title = b.label || name, kind = '';
    let sub = def ? summary(b, def, lang) : this.#labels.missing;
    if (def?.role === 'schemaIn' || def?.role === 'schemaOut') { title = b.config.port || name; kind = name; sub = ''; }
    if (def?.role === 'component') { title = b.label || comp?.def?.label?.[lang] || comp?.def?.label?.en || name; sub = `${b.config.window ?? ''} › ${b.config.component ?? ''}`; }
    const portEls = new Map();
    const row = (p, side) => {
      const el = h('div', {
        class: `lgc-p ${side} t-${p.type}${p.added ? ' added' : ''}${p.error ? ' error' : ''}${(side === 'in' ? linkedIn : linkedOut).has(p.name) ? ' on' : ''}${p.error && !linkedOut.has('error') ? ' dim' : ''}`,
        dataset: { port: p.name, side, type: p.type },
      }, h('i', { class: 'lgc-dot' }), h('span', {}, p.label), h('em', { class: 'lgc-v' }));
      if (side === 'in' && b.ports?.[p.name]?.trigger === false) el.classList.add('notrigger');
      portEls.set(`${side}:${p.name}`, el);
      return el;
    };
    const el = h('div', {
      class: `lgc-block cat-${def?.category ?? 'missing'}${def ? '' : ' ghost'}${def?.role ? ` role-${def.role}` : ''}`,
      dataset: { id: b.id },
      style: `left:${b.x}px;top:${b.y}px`,
    },
    h('div', { class: 'lgc-h' }, icon(def?.icon ?? 'warning'), h('span', { class: 'lgc-t' }, title), kind ? h('span', { class: 'lgc-k' }, kind) : null),
    sub ? h('div', { class: 'lgc-sub' }, sub) : null,
    h('div', { class: 'lgc-ports' }, ...ports.inputs.map(p => row(p, 'in')), ...ports.outputs.map(p => row(p, 'out'))));
    return { el, ports: portEls };
  }

  /** Where a port's dot is, in world coordinates. */
  #portAt(id, side, port) {
    const entry = this.#blocks.get(id);
    const el = entry?.ports.get(`${side}:${port}`);
    if (!el) return null;
    const b = this.#schema.block(id);
    const x = b.x + (side === 'in' ? 0 : entry.el.offsetWidth);
    const y = b.y + el.offsetTop + el.offsetHeight / 2;
    return { x, y };
  }

  #drawLinks() {
    const ns = 'http://www.w3.org/2000/svg';
    this.#svg.replaceChildren();
    for (const old of this.#world.querySelectorAll('.lgc-val')) old.remove();
    for (const l of this.#schema.data.links) {
      const a = this.#portAt(l.from[0], 'out', l.from[1]);
      const b = this.#portAt(l.to[0], 'in', l.to[1]);
      if (!a || !b) continue;
      const key = linkKey(l);
      const type = this.#blocks.get(l.from[0])?.ports.get(`out:${l.from[1]}`)?.dataset.type ?? 'any';
      const toType = this.#blocks.get(l.to[0])?.ports.get(`in:${l.to[1]}`)?.dataset.type ?? 'any';
      const d = curve(a, b);
      const hit = document.createElementNS(ns, 'path');
      hit.setAttribute('d', d);
      hit.setAttribute('class', 'lgc-hit');
      hit.dataset.link = key;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', `lgc-link t-${type}${this.#selLinks.has(key) ? ' sel' : ''}${l.from[1] === 'error' ? ' error' : ''}${typesMatch(type, toType) ? '' : ' mismatch'}`);
      path.dataset.link = key;
      this.#svg.append(hit, path);
      const value = this.#values.get(`${l.from[0]}.${l.from[1]}`);
      if (value !== undefined) {
        path.classList.add('live');
        const pill = h('span', { class: `lgc-val${l.from[1] === 'error' ? ' error' : ''}`, style: `left:${(a.x + b.x) / 2}px;top:${(a.y + b.y) / 2}px` }, formatLogicValue(value, this.#lang));
        this.#world.append(pill);
      }
    }
    if (this.#temp) this.#svg.append(this.#temp);
  }

  #applyView() {
    const { x, y, zoom } = this.#view;
    this.#world.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    this.el.style.backgroundPosition = `${x}px ${y}px`;
    this.el.style.backgroundSize = `${GRID * zoom}px ${GRID * zoom}px`;
  }

  // ------------------------------------------------------------------ view

  toWorld(clientX, clientY) {
    const r = this.el.getBoundingClientRect();
    return { x: (clientX - r.left - this.#view.x) / this.#view.zoom, y: (clientY - r.top - this.#view.y) / this.#view.zoom };
  }

  /** The middle of what is visible, in world coordinates. */
  center() {
    const r = this.el.getBoundingClientRect();
    return this.toWorld(r.left + r.width / 2, r.top + r.height / 2);
  }

  setView(view, { save = true } = {}) {
    this.#view = { x: view.x, y: view.y, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom)) };
    this.#applyView();
    this.emit('view', this.view);
    if (save && !this.#readOnly) {
      clearTimeout(this._viewTimer);
      this._viewTimer = setTimeout(() => this.#schema.setView(this.#view), 400);
    }
  }

  zoomAt(factor, clientX, clientY) {
    const r = this.el.getBoundingClientRect();
    const cx = clientX ?? r.left + r.width / 2, cy = clientY ?? r.top + r.height / 2;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.#view.zoom * factor));
    const k = zoom / this.#view.zoom;
    this.setView({ x: cx - r.left - (cx - r.left - this.#view.x) * k, y: cy - r.top - (cy - r.top - this.#view.y) * k, zoom });
  }

  /** Everything (or the given blocks) in view. */
  fit(ids = null) {
    const list = this.#schema.data.blocks.filter(b => !ids || ids.includes(b.id));
    const r = this.el.getBoundingClientRect();
    if (!list.length || !r.width) { this.setView({ x: r.width / 2 || 0, y: r.height / 2 || 0, zoom: 1 }); return; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of list) {
      const el = this.#blocks.get(b.id)?.el;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + (el?.offsetWidth ?? 160)); y1 = Math.max(y1, b.y + (el?.offsetHeight ?? 80));
    }
    const pad = 48;
    const zoom = Math.min(1.2, Math.max(MIN_ZOOM, Math.min((r.width - pad * 2) / (x1 - x0), (r.height - pad * 2) / (y1 - y0))));
    this.setView({ x: r.width / 2 - ((x0 + x1) / 2) * zoom, y: r.height / 2 - ((y0 + y1) / 2) * zoom, zoom });
  }

  // ------------------------------------------------------------------ selection

  select(blocks = [], links = [], { add = false } = {}) {
    if (!add) { this.#sel.clear(); this.#selLinks.clear(); }
    blocks.forEach(id => this.#sel.add(id));
    links.forEach(k => this.#selLinks.add(k));
    this.#selectionChanged();
  }

  #selectionChanged() {
    for (const [id, entry] of this.#blocks) entry.el.classList.toggle('sel', this.#sel.has(id));
    this.#drawLinks();
    this.emit('select', this.selection);
  }

  removeSelection() {
    if (this.#readOnly) return;
    const links = this.#schema.data.links.filter(l => this.#selLinks.has(linkKey(l)));
    if (this.#sel.size) this.#schema.removeBlocks([...this.#sel]);
    else if (links.length) this.#schema.disconnect(links);
    this.#sel.clear();
    this.#selLinks.clear();
    this.emit('select', this.selection);
  }

  /** Adds a block of a definition (at a world point, or in the middle of the view) and selects it. */
  place(def, at = null) {
    if (this.#readOnly) return null;
    const p = at ?? this.center();
    let x = snap(p.x - 70), y = snap(p.y - 20);
    // Clicked in the palette again and again: each one a step further, not on top of the last
    if (!at) while (this.#schema.data.blocks.some(b => Math.abs(b.x - x) < 16 && Math.abs(b.y - y) < 16)) { x += 30; y += 30; }
    const id = this.#schema.addBlock(def, { x, y });
    this.select([id]);
    this.el.focus({ preventScroll: true });
    return id;
  }

  // ------------------------------------------------------------------ live

  /** Shows a running program on the drawing: values on the links and ports, blocks' states. */
  attach(live, schemaName) {
    this.detach();
    this.#live = live;
    this.#schemaName = schemaName;
    const prefix = `${schemaName}/`;
    const onValues = ({ values }) => {
      for (const [key, v] of Object.entries(values)) if (key.startsWith(prefix)) this.#values.set(key.slice(prefix.length), v);
      this.#showValues();
    };
    const onStates = ({ states }) => {
      for (const [key, s] of Object.entries(states)) if (key.startsWith(prefix)) this.#states.set(key.slice(prefix.length), s);
      for (const [id, entry] of this.#blocks) {
        const s = this.#states.get(id);
        entry.el.classList.toggle('run', s === 'run');
        entry.el.classList.toggle('err', s === 'error');
      }
    };
    live.on('values', onValues);
    live.on('states', onStates);
    this.#liveOff = [() => live.off('values', onValues), () => live.off('states', onStates)];
    this.el.classList.add('lgc-live');
  }

  detach() {
    this.#liveOff.forEach(f => f());
    this.#liveOff = [];
    this.#live = null;
    this.#values.clear();
    this.#states.clear();
    this.el.classList.remove('lgc-live');
    for (const entry of this.#blocks.values()) {
      entry.el.classList.remove('run', 'err');
      for (const p of entry.ports.values()) p.querySelector('.lgc-v').textContent = '';
    }
    this.#drawLinks();
  }

  #showValues() {
    if (this._valuesFrame) return;
    this._valuesFrame = requestAnimationFrame(() => {
      this._valuesFrame = 0;
      for (const [id, entry] of this.#blocks) {
        for (const [key, el] of entry.ports) {
          if (!key.startsWith('in:')) continue;
          const v = this.#values.get(`${id}.${key.slice(3)}`);
          el.querySelector('.lgc-v').textContent = v === undefined ? '' : formatLogicValue(v, this.#lang, 12);
        }
      }
      this.#drawLinks();
    });
  }

  // ------------------------------------------------------------------ input

  #bind() {
    const el = this.el;
    el.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || !e.shiftKey) this.zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), e.clientX, e.clientY);
      else this.setView({ ...this.#view, x: this.#view.x - e.deltaY });
    }, { passive: false });

    el.addEventListener('pointerdown', e => {
      el.focus({ preventScroll: true });
      if (e.button === 1 || (e.button === 0 && this.#space)) { e.preventDefault(); this.#pan(e); return; }
      if (e.button !== 0) return;
      const dot = e.target.closest('.lgc-dot');
      const block = e.target.closest('.lgc-block');
      const link = e.target.closest('[data-link]');
      if (dot && !this.#readOnly) { e.preventDefault(); this.#linkDrag(e, dot.parentElement, block.dataset.id); return; }
      if (block) { this.#blockDrag(e, block.dataset.id); return; }
      if (link) { this.select([], [link.dataset.link], { add: e.shiftKey }); return; }
      this.#bandSelect(e);
    });

    el.addEventListener('dblclick', e => {
      const block = e.target.closest('.lgc-block');
      if (block) this.emit('open', { id: block.dataset.id });
    });

    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const block = e.target.closest('.lgc-block');
      const link = e.target.closest('[data-link]');
      const world = this.toWorld(e.clientX, e.clientY);
      if (block) {
        if (!this.#sel.has(block.dataset.id)) this.select([block.dataset.id]);
        this.emit('contextmenu', { kind: 'block', id: block.dataset.id, clientX: e.clientX, clientY: e.clientY, world });
      } else if (link) {
        this.select([], [link.dataset.link]);
        this.emit('contextmenu', { kind: 'link', link: link.dataset.link, clientX: e.clientX, clientY: e.clientY, world });
      } else {
        this.emit('contextmenu', { kind: 'canvas', clientX: e.clientX, clientY: e.clientY, world });
      }
    });

    el.addEventListener('keydown', e => {
      if (e.target !== el) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === ' ') { this.#space = true; el.classList.add('lgc-pan'); e.preventDefault(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { this.removeSelection(); e.preventDefault(); }
      else if (mod && e.key.toLowerCase() === 'a') { this.select(this.#schema.data.blocks.map(b => b.id)); e.preventDefault(); }
      else if (mod && e.key.toLowerCase() === 'd' && this.#sel.size && !this.#readOnly) { this.select(this.#schema.duplicate([...this.#sel])); e.preventDefault(); }
      else if (e.key === 'Escape') this.select([]);
      else if (e.key.startsWith('Arrow') && this.#sel.size && !this.#readOnly) {
        const step = e.shiftKey ? GRID : 1;
        const [dx, dy] = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        const positions = {};
        for (const id of this.#sel) { const b = this.#schema.block(id); if (b) positions[id] = [b.x + dx, b.y + dy]; }
        this.#schema.place(positions);
        e.preventDefault();
      }
    });
    el.addEventListener('keyup', e => { if (e.key === ' ') { this.#space = false; el.classList.remove('lgc-pan'); } });
    el.addEventListener('blur', () => { this.#space = false; el.classList.remove('lgc-pan'); });
  }

  #pan(e) {
    const start = { ...this.#view }, sx = e.clientX, sy = e.clientY;
    this.el.classList.add('lgc-panning');
    const move = ev => this.setView({ ...start, x: start.x + ev.clientX - sx, y: start.y + ev.clientY - sy });
    const end = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', end); this.el.classList.remove('lgc-panning'); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', end);
  }

  #bandSelect(e) {
    const add = e.shiftKey;
    const before = add ? [...this.#sel] : [];
    selectionGesture(e, {
      container: this.el,
      onUpdate: hit => {
        const ids = [...this.#blocks].filter(([, entry]) => hit(entry.el.getBoundingClientRect())).map(([id]) => id);
        for (const [id, entry] of this.#blocks) entry.el.classList.toggle('sel', before.includes(id) || ids.includes(id));
      },
      onEnd: hit => {
        if (!hit) { this.select([]); return; }
        const ids = [...this.#blocks].filter(([, entry]) => hit(entry.el.getBoundingClientRect())).map(([id]) => id);
        this.select([...new Set([...before, ...ids])]);
      },
    });
  }

  #blockDrag(e, id) {
    if (e.shiftKey) { this.#sel.has(id) ? this.#sel.delete(id) : this.#sel.add(id); this.#selectionChanged(); return; }
    if (!this.#sel.has(id)) this.select([id]);
    if (this.#readOnly) return;
    const sx = e.clientX, sy = e.clientY;
    const start = new Map([...this.#sel].map(i => [i, { ...this.#schema.block(i) }]).filter(([, b]) => b.id));
    let moved = false;
    const move = ev => {
      const dx = (ev.clientX - sx) / this.#view.zoom, dy = (ev.clientY - sy) / this.#view.zoom;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      for (const [i, b] of start) {
        const entry = this.#blocks.get(i);
        const blk = this.#schema.block(i);
        if (!entry || !blk) continue;
        blk.x = ev.altKey ? b.x + dx : snap(b.x + dx);
        blk.y = ev.altKey ? b.y + dy : snap(b.y + dy);
        entry.el.style.left = `${blk.x}px`;
        entry.el.style.top = `${blk.y}px`;
      }
      this.#drawLinks();
    };
    const end = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', end);
      if (!moved) return;
      const positions = {};
      for (const [i, b] of start) {
        const blk = this.#schema.block(i);
        if (!blk) continue;
        positions[i] = [blk.x, blk.y];
        blk.x = b.x; blk.y = b.y;   // back as they were: place() records the move in the history
      }
      this.#schema.place(positions);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', end);
  }

  /** Dragging a link: from an output; from a linked input it takes its last link away. */
  #linkDrag(e, portEl, blockId) {
    const side = portEl.dataset.side;
    let from;
    let removing = null;
    if (side === 'out') from = [blockId, portEl.dataset.port];
    else {
      const links = this.#schema.data.links.filter(l => l.to[0] === blockId && l.to[1] === portEl.dataset.port);
      if (!links.length) return;
      removing = links.at(-1);
      from = removing.from;
    }
    const a = this.#portAt(from[0], 'out', from[1]);
    if (!a) return;
    const temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    temp.setAttribute('class', `lgc-link temp t-${this.#blocks.get(from[0])?.ports.get(`out:${from[1]}`)?.dataset.type ?? 'any'}`);
    this.#temp = temp;
    if (removing) { this.#schema.data.links = this.#schema.data.links.filter(l => l !== removing); this.#drawLinks(); }
    this.el.classList.add('lgc-linking');
    const move = ev => {
      const p = this.toWorld(ev.clientX, ev.clientY);
      temp.setAttribute('d', curve(a, p));
      for (const t of this.el.querySelectorAll('.lgc-p.target')) t.classList.remove('target');
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.lgc-p.in');
      if (over && over.closest('.lgc-block')?.dataset.id !== from[0]) over.classList.add('target');
    };
    const end = ev => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', end);
      this.#temp = null;
      temp.remove();
      this.el.classList.remove('lgc-linking');
      for (const t of this.el.querySelectorAll('.lgc-p.target')) t.classList.remove('target');
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.lgc-p.in');
      const target = over ? [over.closest('.lgc-block')?.dataset.id, over.dataset.port] : null;
      if (removing) {
        // put it back as it was, then record what happened as one step
        this.#schema.data.links.push(removing);
        if (target && target[0] !== from[0] && !(target[0] === removing.to[0] && target[1] === removing.to[1])) {
          this.#schema.edit('relink', data => {
            data.links = data.links.filter(l => linkKey(l) !== linkKey(removing));
            if (!data.links.some(l => linkKey(l) === linkKey({ from, to: target }))) data.links.push({ from: [...from], to: target });
          });
        } else if (!target) this.#schema.disconnect([removing]);
        else this.#drawLinks();
        return;
      }
      if (target && target[0]) this.#schema.connect(from, target);
      else this.emit('linkDrop', { from, world: this.toWorld(ev.clientX, ev.clientY), clientX: ev.clientX, clientY: ev.clientY });
      this.#drawLinks();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', end);
  }
}

const snap = v => Math.round(v / (GRID / 2)) * (GRID / 2);

function curve(a, b) {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return `M${a.x} ${a.y} C${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

/** A short line under a block's title: its main settings. */
function summary(b, def, lang) {
  const parts = [];
  for (const c of def.config ?? []) {
    if (parts.length >= 2) break;
    const v = b.config?.[c.key];
    if (v === undefined || v === '' || c.type === 'checkbox') continue;
    if (c.when && Object.entries(c.when).some(([k, want]) => (Array.isArray(want) ? !want.includes(b.config?.[k]) : b.config?.[k] !== want))) continue;
    parts.push(typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const s = parts.join(' · ');
  return s.length > 34 ? `${s.slice(0, 33)}…` : s;
}
