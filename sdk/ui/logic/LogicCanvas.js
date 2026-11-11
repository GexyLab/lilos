import { h } from '../../core/dom.js';
import { Emitter } from '../../core/events.js';
import { icon } from '../icons.js';
import { selectionGesture } from '../selectionGesture.js';
import { portsOf, linkKey, typesMatch, logicText, GROUP_RUN } from '../../core/logicModel.js';
import { formatLogicValue } from './format.js';

/**
 * The drawing of a Logic Studio schema (LogicSchema): blocks, their ports, the links between them
 * and the groups, on a canvas that pans and zooms. Ports are never added, removed, hidden or shown
 * here (only in the properties sidebar): the added ones are shown with their name in italics; the
 * hidden ones (portHidden: the output «error» unless shown) are not drawn, unless they are linked.
 *
 * Groups: an open group is a frame around its blocks (it follows them), with its port «Run» in
 * the header: the dot on the left edge is reached from outside, the one after «Run» goes to the
 * blocks inside. The ports a group exposes have a ring. A collapsed group is drawn as one block:
 * «Run» and the exposed ports; the links inside it are not drawn.
 *
 *   const canvas = new LogicCanvas({ schema, catalog, lang, componentOf, labels });
 *   el.append(canvas.el);
 *   canvas.on('select', ({ blocks, links, groups }) => …)
 *
 * Options
 *   schema        LogicSchema
 *   catalog       logic.catalog() (its packages' blocks)
 *   lang          the language of the labels
 *   componentOf   block → { def, added } | null: for the object of a Componente UI, the component's
 *                 definition and added ports (its ports are the component's)
 *   labels        { error, missing, run, group, blocks, thread } the host app's texts (defaults: lilOS's;
 *                 blocks: '{n} blocks')
 *   readOnly      no editing (a program shown live)
 *
 * Mouse: drag a block to move it (the selected ones together); drag a group by its header (or a
 * collapsed one) to move it with its blocks; a block dropped inside an open group goes into it;
 * drag from an output to an input to link them, from a linked input to take its link away; drag
 * the background to select with a rectangle, with the middle button (or Space held) to move the
 * view; the wheel zooms where the pointer is; double click on a collapsed group opens it, on the
 * header of an open one collapses it. Keys (the canvas focused): Canc removes the selection, Ctrl+A
 * selects all, Ctrl+D duplicates, Ctrl+G makes a group of the selected blocks, Ctrl+Shift+G undoes
 * the selected groups, arrows move the selection, Esc deselects.
 *
 * Events: 'select' { blocks, links, groups } · 'open' { id } (double click on a block) ·
 * 'contextmenu' { kind: 'block'|'link'|'group'|'canvas', id, link, clientX, clientY, world } ·
 * 'linkDrop' { from, world, clientX, clientY } (a link dropped on nothing) · 'view' { x, y, zoom }
 */

const MIN_ZOOM = 0.2, MAX_ZOOM = 2.5, GRID = 20;
const PAD = 16, HEAD = 28;   // a group's frame: space around its blocks, height of its header

export class LogicCanvas extends Emitter {
  el; #world; #svg; #band;
  #schema; #catalog; #lang; #componentOf; #labels; #readOnly;
  #defs = new Map();
  #view = { x: 0, y: 0, zoom: 1 };
  #blocks = new Map();     // id → { el, ports: Map('in:name'|'out:name' → el), sig }
  #groups = new Map();     // id → { el, ports: Map, sig, collapsed, x, y } (a frame, or a collapsed group)
  #sel = new Set();
  #selLinks = new Set();
  #selGroups = new Set();
  #live = null; #liveOff = []; #values = new Map(); #states = new Map(); #schemaName = '';
  #drawing = false; #space = false; #temp = null;
  #offs = [];

  constructor({ schema, catalog, lang = 'en', componentOf = () => null, labels = {}, readOnly = false } = {}) {
    super();
    this.#schema = schema;
    this.#lang = lang;
    this.#componentOf = componentOf;
    this.#labels = {
      error: logicText('error'), missing: logicText('missing'), run: 'Run', group: 'Group', blocks: '{n} blocks', thread: 'Thread',
      collapse: 'Collapse', runOff: 'Nothing is linked to Run: the group does not start', ...labels,
    };
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
  get selection() { return { blocks: [...this.#sel], links: [...this.#selLinks], groups: [...this.#selGroups] }; }
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
    const groups = this.#schema.groups;
    const hiddenIn = new Map();   // block id → its collapsed group
    for (const g of groups) if (g.collapsed) for (const id of g.blocks) hiddenIn.set(id, g);
    const exposed = new Map();    // block id → Set('in:port'|'out:port') exposed by its open group
    for (const g of groups) if (!g.collapsed) for (const e of g.expose) (exposed.get(e.block) ?? exposed.set(e.block, new Set()).get(e.block)).add(`${e.side}:${e.port}`);
    const seen = new Set();
    // The linked ports of each block: they are drawn filled, and never hidden
    const linked = new Map();
    const mark = (id, key) => { if (!linked.has(id)) linked.set(id, new Set()); linked.get(id).add(key); };
    for (const l of data.links) { mark(l.from[0], `out:${l.from[1]}`); mark(l.to[0], `in:${l.to[1]}`); }
    for (const b of data.blocks) {
      if (hiddenIn.has(b.id)) continue;
      seen.add(b.id);
      const def = this.#defs.get(b.type);
      const comp = def?.role === 'component' ? this.#componentOf(b) : null;
      const on = linked.get(b.id) ?? new Set();
      const ex = exposed.get(b.id) ?? new Set();
      const sig = JSON.stringify([b, !!def, comp?.def?.type, comp?.added, this.#lang, [...on].sort(), [...ex].sort()]);
      let entry = this.#blocks.get(b.id);
      if (!entry || entry.sig !== sig || all) {
        const fresh = this.#blockEl(b, def, comp, on, ex);
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
    // Groups (after the blocks: a frame takes the size of its blocks)
    const seenGroups = new Set();
    for (const g of groups) {
      seenGroups.add(g.id);
      const runLinked = data.links.some(l => l.to[0] === g.id);
      const innerLinked = data.links.some(l => l.from[0] === g.id);
      const sig = JSON.stringify([g, runLinked, innerLinked, this.#lang, g.collapsed ? this.#collapsedSig(g, linked) : null]);
      let entry = this.#groups.get(g.id);
      if (!entry || entry.sig !== sig || all) {
        const fresh = g.collapsed ? this.#collapsedEl(g, linked, runLinked) : this.#frameEl(g, runLinked, innerLinked);
        if (entry) entry.el.replaceWith(fresh.el); else this.#world.prepend(fresh.el);
        entry = { ...fresh, sig, collapsed: g.collapsed };
        this.#groups.set(g.id, entry);
      }
      this.#placeGroup(g, entry);
      entry.el.classList.toggle('sel', this.#selGroups.has(g.id));
      entry.el.classList.toggle('run', this.#states.get(g.id) === 'run');
    }
    for (const [id, entry] of this.#groups) if (!seenGroups.has(id)) { entry.el.remove(); this.#groups.delete(id); this.#selGroups.delete(id); }
    // Frames below the blocks, the svg of the links below everything
    this.#world.prepend(...[...this.#groups.values()].filter(e => !e.collapsed).map(e => e.el));
    this.#world.prepend(this.#svg);
    const keys = new Set(data.links.map(linkKey));
    for (const k of this.#selLinks) if (!keys.has(k)) this.#selLinks.delete(k);
    this.#applyView();
    this.#drawLinks();
  }

  #blockEl(b, def, comp, linked, exposed = new Set()) {
    const lang = this.#lang;
    const all = def ? portsOf(b, def, { lang, component: comp, errorLabel: this.#labels.error }) : { inputs: [], outputs: [] };
    const linkedIn = new Set([...linked].filter(k => k.startsWith('in:')).map(k => k.slice(3)));
    const linkedOut = new Set([...linked].filter(k => k.startsWith('out:')).map(k => k.slice(4)));
    // Hidden ports are not drawn, unless linked (a schema saved before they were hidden)
    const ports = { inputs: all.inputs.filter(p => !p.hidden || linkedIn.has(p.name)), outputs: all.outputs.filter(p => !p.hidden || linkedOut.has(p.name)) };
    const { title, kind, sub } = this.#titles(b, def, comp);
    const portEls = new Map();
    const row = (p, side) => {
      const el = portRow(p, side, b.id, p.name, (side === 'in' ? linkedIn : linkedOut).has(p.name));
      if (side === 'in' && b.ports?.[p.name]?.trigger === false) el.classList.add('notrigger');
      if (exposed.has(`${side}:${p.name}`)) el.classList.add('exposed');
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

  /** A block's title, the word beside it and the line under it. */
  #titles(b, def, comp) {
    const lang = this.#lang;
    const name = def ? (def.label?.[lang] ?? def.label?.en ?? def.type) : b.type;
    let title = b.label || name, kind = '';
    let sub = def ? summary(b, def, lang) : this.#labels.missing;
    if (def?.role === 'schemaIn' || def?.role === 'schemaOut') { title = b.config.port || name; kind = name; sub = ''; }
    // The object of a UI area: "UI > <area name>", so it reads as a piece of the window
    if (def?.role === 'component') { title = `UI > ${b.label || comp?.def?.label?.[lang] || comp?.def?.label?.en || name}`; sub = `${b.config.window ?? ''} › ${b.config.component ?? ''}`; }
    return { title, kind, sub };
  }

  // ---- groups

  /** The exposed ports of a group: [{ block, side, port, label, type, title }] in its order. */
  #exposedPorts(g) {
    const out = [];
    for (const e of g.expose) {
      const b = this.#schema.block(e.block);
      const def = b && this.#defs.get(b.type);
      if (!def) continue;
      const comp = def.role === 'component' ? this.#componentOf(b) : null;
      const ports = portsOf(b, def, { lang: this.#lang, component: comp, errorLabel: this.#labels.error });
      const p = ports[e.side === 'in' ? 'inputs' : 'outputs'].find(x => x.name === e.port);
      if (!p) continue;
      out.push({ block: e.block, side: e.side, port: e.port, label: e.name || p.label, type: p.type, title: this.#titles(b, def, comp).title, added: p.added, error: p.error });
    }
    // Two ports with the same name on one side: the block's title tells them apart
    for (const p of out) if (!g.expose.find(e => e.block === p.block && e.side === p.side && e.port === p.port)?.name && out.some(q => q !== p && q.side === p.side && q.label === p.label)) p.label = `${p.title} · ${p.label}`;
    return out;
  }

  #collapsedSig(g, linked) {
    return this.#exposedPorts(g).map(p => [p.block, p.side, p.port, p.label, p.type, linked.get(p.block)?.has(`${p.side}:${p.port}`)]);
  }

  /** A collapsed group: one block with «Run» and the ports it exposes. */
  #collapsedEl(g, linked, runLinked) {
    const portEls = new Map();
    const run = portRow({ name: GROUP_RUN, label: this.#labels.run, type: 'pulse' }, 'in', g.id, GROUP_RUN, runLinked);
    run.classList.add('lgc-run');
    if (!runLinked) run.title = this.#labels.runOff ?? '';
    portEls.set(`in:${GROUP_RUN}`, run);
    const rows = [run];
    const exposed = this.#exposedPorts(g);
    for (const side of ['in', 'out']) {
      for (const p of exposed.filter(x => x.side === side)) {
        const el = portRow(p, side, p.block, p.port, !!linked.get(p.block)?.has(`${side}:${p.port}`));
        el.title = `${p.title} › ${p.port}`;
        portEls.set(`${side}:${p.block}.${p.port}`, el);
        rows.push(el);
      }
    }
    const el = h('div', { class: `lgc-block lgc-grp-c${g.thread ? ' thread' : ''}${runLinked ? '' : ' off'}`, dataset: { group: g.id } },
      h('div', { class: 'lgc-h' }, icon('group'), h('span', { class: 'lgc-t' }, g.name), g.thread ? h('span', { class: 'lgc-k', title: this.#labels.thread }, icon('chip')) : null),
      h('div', { class: 'lgc-sub' }, this.#labels.blocks.replace('{n}', String(g.blocks.length))),
      h('div', { class: 'lgc-ports' }, ...rows));
    return { el, ports: portEls };
  }

  /** An open group: a frame around its blocks; «Run» in the header (from outside on the left edge, to the inside after the word). */
  #frameEl(g, runLinked, innerLinked) {
    const portEls = new Map();
    const runIn = portRow({ name: GROUP_RUN, label: this.#labels.run, type: 'pulse' }, 'in', g.id, GROUP_RUN, runLinked);
    runIn.classList.add('lgc-run');
    const runOut = portRow({ name: GROUP_RUN, label: '', type: 'pulse' }, 'out', g.id, GROUP_RUN, innerLinked);
    runOut.classList.add('lgc-run', 'inner');
    portEls.set(`in:${GROUP_RUN}`, runIn);
    portEls.set(`out:${GROUP_RUN}`, runOut);
    const head = h('div', { class: 'lgc-gh', dataset: { group: g.id } },
      runIn, runOut,
      icon('group'), h('span', { class: 'lgc-t' }, g.name),
      g.thread ? h('span', { class: 'lgc-k', title: this.#labels.thread }, icon('chip'), this.#labels.thread) : null,
      h('button', { type: 'button', class: 'lgc-gx', dataset: { collapse: g.id }, title: this.#labels.collapse ?? '', 'aria-label': this.#labels.collapse ?? '' }, icon('minus')));
    const el = h('div', { class: `lgc-grp${g.thread ? ' thread' : ''}${runLinked ? '' : ' off'}`, dataset: { frame: g.id } }, head);
    return { el, ports: portEls };
  }

  /** Where a group is: a collapsed one at the top left of its blocks; a frame around them. */
  #placeGroup(g, entry) {
    const blocks = g.blocks.map(id => this.#schema.block(id)).filter(Boolean);
    if (!blocks.length) return;
    if (g.collapsed) {
      entry.x = Math.min(...blocks.map(b => b.x));
      entry.y = Math.min(...blocks.map(b => b.y));
      entry.el.style.left = `${entry.x}px`;
      entry.el.style.top = `${entry.y}px`;
      return;
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of blocks) {
      const el = this.#blocks.get(b.id)?.el;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + (el?.offsetWidth || 140)); y1 = Math.max(y1, b.y + (el?.offsetHeight || 60));
    }
    entry.x = x0 - PAD;
    entry.y = y0 - PAD - HEAD;
    // at least as wide as its header (Run, the name, the thread, −)
    const head = entry.el.firstElementChild;
    const need = head ? [...head.children].reduce((w, c) => w + c.offsetWidth, 0) + 6 * head.children.length + 10 : 0;
    Object.assign(entry.el.style, { left: `${entry.x}px`, top: `${entry.y}px`, width: `${Math.max(x1 - x0 + PAD * 2, need)}px`, height: `${y1 - y0 + PAD * 2 + HEAD}px` });
  }

  #layoutGroups() {
    for (const g of this.#schema.groups) {
      const entry = this.#groups.get(g.id);
      if (entry) this.#placeGroup(g, entry);
    }
  }

  /** The open group whose frame is at a world point (to drop blocks into it), or null. */
  groupAt(world) {
    for (const g of this.#schema.groups) {
      const entry = this.#groups.get(g.id);
      if (!entry || g.collapsed) continue;
      const w = entry.el.offsetWidth, ht = entry.el.offsetHeight;
      if (world.x >= entry.x && world.x <= entry.x + w && world.y >= entry.y && world.y <= entry.y + ht) return g.id;
    }
    return null;
  }

  /** The element of a port: of a block, of a group's «run», or the one a collapsed group shows for a block inside it. */
  #portEl(id, side, port) {
    const g = this.#schema.group(id);
    if (g) return this.#groups.get(id)?.ports.get(`${side}:${port}`) ?? null;
    const holder = this.#schema.groupOf(id);
    if (holder?.collapsed) return this.#groups.get(holder.id)?.ports.get(`${side}:${id}.${port}`) ?? null;
    return this.#blocks.get(id)?.ports.get(`${side}:${port}`) ?? null;
  }

  /** Where a port's dot is, in world coordinates. */
  #portAt(id, side, port) {
    const el = this.#portEl(id, side, port);
    if (!el) return null;
    const g = this.#schema.group(id);
    const holder = g ? null : this.#schema.groupOf(id);
    if (g || holder?.collapsed) {
      const entry = this.#groups.get(g?.id ?? holder.id);
      if (g && !g.collapsed) {
        // the frame's header: «run» from outside on the left edge; to the inside after its word
        const x = entry.x + (side === 'in' ? 0 : el.offsetLeft + el.offsetWidth);
        return { x, y: entry.y + el.offsetTop + el.offsetHeight / 2 };
      }
      return { x: entry.x + (side === 'in' ? 0 : entry.el.offsetWidth), y: entry.y + el.offsetTop + el.offsetHeight / 2 };
    }
    const entry = this.#blocks.get(id);
    const b = this.#schema.block(id);
    const x = b.x + (side === 'in' ? 0 : entry.el.offsetWidth);
    const y = b.y + el.offsetTop + el.offsetHeight / 2;
    return { x, y };
  }

  /** A link inside a collapsed group (both ends in it, or from its «run»): not drawn. */
  #insideCollapsed(l) {
    const scope = (end, from) => (this.#schema.group(end[0]) ? (from ? end[0] : null) : this.#schema.groupOf(end[0])?.id ?? null);
    const a = scope(l.from, true), b = scope(l.to, false);
    return !!a && a === b && !!this.#schema.group(a)?.collapsed;
  }

  #drawLinks() {
    const ns = 'http://www.w3.org/2000/svg';
    this.#svg.replaceChildren();
    for (const old of this.#world.querySelectorAll('.lgc-val')) old.remove();
    for (const l of this.#schema.data.links) {
      if (this.#insideCollapsed(l)) continue;
      const a = this.#portAt(l.from[0], 'out', l.from[1]);
      const b = this.#portAt(l.to[0], 'in', l.to[1]);
      if (!a || !b) continue;
      const key = linkKey(l);
      const type = this.#portEl(l.from[0], 'out', l.from[1])?.dataset.type ?? 'any';
      const toType = this.#portEl(l.to[0], 'in', l.to[1])?.dataset.type ?? 'any';
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
    const boxes = [];
    for (const b of this.#schema.data.blocks) {
      if (ids && !ids.includes(b.id)) continue;
      const el = this.#blocks.get(b.id)?.el;
      if (el) boxes.push([b.x, b.y, b.x + el.offsetWidth, b.y + el.offsetHeight]);
    }
    for (const [id, entry] of this.#groups) {
      if (ids && !this.#schema.group(id)?.blocks.some(b => ids.includes(b))) continue;
      boxes.push([entry.x, entry.y, entry.x + entry.el.offsetWidth, entry.y + entry.el.offsetHeight]);
    }
    const r = this.el.getBoundingClientRect();
    if (!boxes.length || !r.width) { this.setView({ x: r.width / 2 || 0, y: r.height / 2 || 0, zoom: 1 }); return; }
    const x0 = Math.min(...boxes.map(b => b[0])), y0 = Math.min(...boxes.map(b => b[1]));
    const x1 = Math.max(...boxes.map(b => b[2] || b[0] + 160)), y1 = Math.max(...boxes.map(b => b[3] || b[1] + 80));
    const pad = 48;
    const zoom = Math.min(1.2, Math.max(MIN_ZOOM, Math.min((r.width - pad * 2) / Math.max(1, x1 - x0), (r.height - pad * 2) / Math.max(1, y1 - y0))));
    this.setView({ x: r.width / 2 - ((x0 + x1) / 2) * zoom, y: r.height / 2 - ((y0 + y1) / 2) * zoom, zoom });
  }

  // ------------------------------------------------------------------ selection

  select(blocks = [], links = [], { add = false, groups = [] } = {}) {
    if (!add) { this.#sel.clear(); this.#selLinks.clear(); this.#selGroups.clear(); }
    blocks.forEach(id => this.#sel.add(id));
    links.forEach(k => this.#selLinks.add(k));
    groups.forEach(id => this.#selGroups.add(id));
    this.#selectionChanged();
  }

  #selectionChanged() {
    for (const [id, entry] of this.#blocks) entry.el.classList.toggle('sel', this.#sel.has(id));
    for (const [id, entry] of this.#groups) entry.el.classList.toggle('sel', this.#selGroups.has(id));
    this.#drawLinks();
    this.emit('select', this.selection);
  }

  removeSelection() {
    if (this.#readOnly) return;
    const links = this.#schema.data.links.filter(l => this.#selLinks.has(linkKey(l)));
    if (this.#selGroups.size) this.#schema.removeGroups([...this.#selGroups], { blocks: [...this.#sel] });
    else if (this.#sel.size) this.#schema.removeBlocks([...this.#sel]);
    else if (links.length) this.#schema.disconnect(links);
    this.#sel.clear();
    this.#selLinks.clear();
    this.#selGroups.clear();
    this.emit('select', this.selection);
  }

  /** A group of the selected blocks (those in no group); it gets selected. Returns its id, or null. */
  groupSelection() {
    if (this.#readOnly || !this.#sel.size) return null;
    const taken = new Set(this.#schema.groups.map(g => g.name));
    let n = this.#schema.groups.length + 1;
    while (taken.has(`${this.#labels.group} ${n}`)) n++;
    const id = this.#schema.addGroup([...this.#sel], { name: `${this.#labels.group} ${n}` });
    if (id) this.select([], [], { groups: [id] });
    return id;
  }

  /** Undoes the selected groups: their blocks stay, selected. */
  ungroupSelection() {
    if (this.#readOnly || !this.#selGroups.size) return;
    const blocks = [...this.#selGroups].flatMap(id => this.#schema.group(id)?.blocks ?? []);
    this.#schema.ungroup([...this.#selGroups]);
    this.select(blocks);
  }

  /** Copies of the selection: blocks (Ctrl+D) and groups with their blocks. */
  duplicateSelection() {
    if (this.#readOnly) return;
    const groups = this.#selGroups.size ? this.#schema.duplicateGroups([...this.#selGroups]) : [];
    const blocks = this.#sel.size ? this.#schema.duplicate([...this.#sel]) : [];
    this.select(blocks, [], { groups });
  }

  /** Adds a block of a definition (at a world point, or in the middle of the view) and selects it; dropped in an open group, it goes into it. */
  place(def, at = null) {
    if (this.#readOnly) return null;
    const p = at ?? this.center();
    let x = snap(p.x - 70), y = snap(p.y - 20);
    // Clicked in the palette again and again: each one a step further, not on top of the last
    if (!at) while (this.#schema.data.blocks.some(b => Math.abs(b.x - x) < 16 && Math.abs(b.y - y) < 16)) { x += 30; y += 30; }
    const id = this.#schema.addBlock(def, { x, y, group: at ? this.groupAt(at) : null });
    this.select([id]);
    this.el.focus({ preventScroll: true });
    return id;
  }

  // ------------------------------------------------------------------ live

  /** Shows a running program on the drawing: values on the links and ports, blocks' (and groups') states. */
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
      for (const [id, entry] of this.#groups) entry.el.classList.toggle('run', this.#states.get(id) === 'run');
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
    for (const entry of [...this.#blocks.values(), ...this.#groups.values()]) {
      entry.el.classList.remove('run', 'err');
      for (const p of entry.ports.values()) { const v = p.querySelector('.lgc-v'); if (v) v.textContent = ''; }
    }
    this.#drawLinks();
  }

  #showValues() {
    if (this._valuesFrame) return;
    this._valuesFrame = requestAnimationFrame(() => {
      this._valuesFrame = 0;
      for (const entry of [...this.#blocks.values(), ...this.#groups.values()]) {
        for (const [key, el] of entry.ports) {
          if (!key.startsWith('in:')) continue;
          const v = this.#values.get(el.dataset.vkey);
          const out = el.querySelector('.lgc-v');
          if (out) out.textContent = v === undefined ? '' : formatLogicValue(v, this.#lang, 12);
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
      const head = e.target.closest('.lgc-gh');
      const link = e.target.closest('[data-link]');
      const collapse = e.target.closest('[data-collapse]');
      if (collapse) { e.preventDefault(); if (!this.#readOnly) this.#schema.setGroup(collapse.dataset.collapse, { collapsed: true }); return; }
      if (dot && !this.#readOnly) { e.preventDefault(); this.#linkDrag(e, dot.parentElement); return; }
      if (block?.dataset.group) { this.#groupDrag(e, block.dataset.group); return; }
      if (head) { this.#groupDrag(e, head.dataset.group); return; }
      if (block) { this.#blockDrag(e, block.dataset.id); return; }
      if (link) { this.select([], [link.dataset.link], { add: e.shiftKey }); return; }
      this.#bandSelect(e);
    });

    el.addEventListener('dblclick', e => {
      if (e.target.closest('.lgc-dot, [data-collapse]')) return;
      const block = e.target.closest('.lgc-block');
      const head = e.target.closest('.lgc-gh');
      if (block?.dataset.group) { if (!this.#readOnly) this.#schema.setGroup(block.dataset.group, { collapsed: false }); return; }
      if (head) { if (!this.#readOnly) this.#schema.setGroup(head.dataset.group, { collapsed: true }); return; }
      if (block) this.emit('open', { id: block.dataset.id });
    });

    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const block = e.target.closest('.lgc-block');
      const head = e.target.closest('.lgc-gh');
      const link = e.target.closest('[data-link]');
      const world = this.toWorld(e.clientX, e.clientY);
      const group = block?.dataset.group ?? head?.dataset.group;
      if (group) {
        if (!this.#selGroups.has(group)) this.select([], [], { groups: [group] });
        this.emit('contextmenu', { kind: 'group', id: group, clientX: e.clientX, clientY: e.clientY, world });
      } else if (block) {
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
      else if (mod && e.key.toLowerCase() === 'a') { this.selectAll(); e.preventDefault(); }
      else if (mod && e.key.toLowerCase() === 'd' && (this.#sel.size || this.#selGroups.size) && !this.#readOnly) { this.duplicateSelection(); e.preventDefault(); }
      else if (mod && e.key.toLowerCase() === 'g' && !this.#readOnly) { if (e.shiftKey) this.ungroupSelection(); else this.groupSelection(); e.preventDefault(); }
      else if (e.key === 'Escape') this.select([]);
      else if (e.key.startsWith('Arrow') && (this.#sel.size || this.#selGroups.size) && !this.#readOnly) {
        const step = e.shiftKey ? GRID : 1;
        const [dx, dy] = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        const positions = {};
        for (const id of this.#movingIds()) { const b = this.#schema.block(id); if (b) positions[id] = [b.x + dx, b.y + dy]; }
        this.#schema.place(positions);
        e.preventDefault();
      }
    });
    el.addEventListener('keyup', e => { if (e.key === ' ') { this.#space = false; el.classList.remove('lgc-pan'); } });
    el.addEventListener('blur', () => { this.#space = false; el.classList.remove('lgc-pan'); });
  }

  /** The blocks that move with the selection: the selected ones and those of the selected groups. */
  #movingIds() {
    const ids = new Set(this.#sel);
    for (const id of this.#selGroups) for (const b of this.#schema.group(id)?.blocks ?? []) ids.add(b);
    return [...ids];
  }

  /** Selects every block drawn and every collapsed group. */
  selectAll() {
    const collapsed = this.#schema.groups.filter(g => g.collapsed);
    const hidden = new Set(collapsed.flatMap(g => g.blocks));
    this.select(this.#schema.data.blocks.filter(b => !hidden.has(b.id)).map(b => b.id), [], { groups: collapsed.map(g => g.id) });
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
    const beforeGroups = add ? [...this.#selGroups] : [];
    const collapsed = () => [...this.#groups].filter(([id]) => this.#schema.group(id)?.collapsed);
    selectionGesture(e, {
      container: this.el,
      onUpdate: hit => {
        const ids = [...this.#blocks].filter(([, entry]) => hit(entry.el.getBoundingClientRect())).map(([id]) => id);
        for (const [id, entry] of this.#blocks) entry.el.classList.toggle('sel', before.includes(id) || ids.includes(id));
        for (const [id, entry] of collapsed()) entry.el.classList.toggle('sel', beforeGroups.includes(id) || hit(entry.el.getBoundingClientRect()));
      },
      onEnd: hit => {
        if (!hit) { this.select([]); return; }
        const ids = [...this.#blocks].filter(([, entry]) => hit(entry.el.getBoundingClientRect())).map(([id]) => id);
        const groups = collapsed().filter(([, entry]) => hit(entry.el.getBoundingClientRect())).map(([id]) => id);
        this.select([...new Set([...before, ...ids])], [], { groups: [...new Set([...beforeGroups, ...groups])] });
      },
    });
  }

  /** Moves blocks while the pointer moves (the selected ones, or those of the dragged groups); one step of the history at the end. */
  #moveDrag(e, ids, onEnd = null) {
    if (this.#readOnly) return;
    const sx = e.clientX, sy = e.clientY;
    const start = new Map(ids.map(i => [i, { ...this.#schema.block(i) }]).filter(([, b]) => b.id));
    let moved = false;
    const move = ev => {
      const dx = (ev.clientX - sx) / this.#view.zoom, dy = (ev.clientY - sy) / this.#view.zoom;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      for (const [i, b] of start) {
        const blk = this.#schema.block(i);
        if (!blk) continue;
        blk.x = ev.altKey ? b.x + dx : snap(b.x + dx);
        blk.y = ev.altKey ? b.y + dy : snap(b.y + dy);
        const entry = this.#blocks.get(i);
        if (entry) { entry.el.style.left = `${blk.x}px`; entry.el.style.top = `${blk.y}px`; }
      }
      this.#layoutGroups();
      this.#drawLinks();
    };
    const end = ev => {
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
      onEnd?.(ev);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', end);
  }

  #blockDrag(e, id) {
    if (e.shiftKey) { this.#sel.has(id) ? this.#sel.delete(id) : this.#sel.add(id); this.#selectionChanged(); return; }
    if (!this.#sel.has(id)) this.select([id]);
    // Blocks in no group dropped inside an open group go into it
    this.#moveDrag(e, this.#movingIds(), ev => {
      const free = [...this.#sel].filter(i => !this.#schema.groupOf(i));
      if (!free.length) return;
      const target = this.#groupUnder(ev, free);
      if (target) this.#schema.addToGroup(target, free);
    });
  }

  /** The open group under the pointer, not counting the frames of the blocks being dragged. */
  #groupUnder(ev) {
    const at = this.toWorld(ev.clientX, ev.clientY);
    return this.groupAt(at);
  }

  #groupDrag(e, id) {
    if (e.shiftKey) { this.#selGroups.has(id) ? this.#selGroups.delete(id) : this.#selGroups.add(id); this.#selectionChanged(); return; }
    if (!this.#selGroups.has(id)) this.select([], [], { groups: [id] });
    this.#moveDrag(e, this.#movingIds());
  }

  /** Dragging a link: from an output; from a linked input it takes its last link away. */
  #linkDrag(e, portEl) {
    const side = portEl.dataset.side;
    const id = portEl.dataset.bid;
    let from;
    let removing = null;
    if (side === 'out') from = [id, portEl.dataset.port];
    else {
      const links = this.#schema.data.links.filter(l => l.to[0] === id && l.to[1] === portEl.dataset.port);
      if (!links.length) return;
      removing = links.at(-1);
      from = removing.from;
    }
    const a = this.#portAt(from[0], 'out', from[1]);
    if (!a) return;
    const temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    temp.setAttribute('class', `lgc-link temp t-${this.#portEl(from[0], 'out', from[1])?.dataset.type ?? 'any'}`);
    this.#temp = temp;
    if (removing) { this.#schema.data.links = this.#schema.data.links.filter(l => l !== removing); this.#drawLinks(); }
    this.el.classList.add('lgc-linking');
    const targetOf = ev => {
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.lgc-p.in');
      return over && this.el.contains(over) ? over : null;
    };
    const move = ev => {
      const p = this.toWorld(ev.clientX, ev.clientY);
      temp.setAttribute('d', curve(a, p));
      for (const t of this.el.querySelectorAll('.lgc-p.target')) t.classList.remove('target');
      const over = targetOf(ev);
      if (over && this.#schema.canLink(from, [over.dataset.bid, over.dataset.port])) over.classList.add('target');
    };
    const end = ev => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', end);
      this.#temp = null;
      temp.remove();
      this.el.classList.remove('lgc-linking');
      for (const t of this.el.querySelectorAll('.lgc-p.target')) t.classList.remove('target');
      const over = targetOf(ev);
      const target = over ? [over.dataset.bid, over.dataset.port] : null;
      if (removing) {
        // put it back as it was, then record what happened as one step
        this.#schema.data.links.push(removing);
        if (target && !(target[0] === removing.to[0] && target[1] === removing.to[1])) {
          if (!this.#schema.relink(removing, target)) this.#drawLinks();
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

/** A port's row: its dot, its name, its value (inputs). `bid`: the block (or group) the port is of. */
function portRow(p, side, bid, port, linked) {
  return h('div', {
    class: `lgc-p ${side} t-${p.type}${p.added ? ' added' : ''}${p.error ? ' error' : ''}${linked ? ' on' : ''}${p.error && !linked ? ' dim' : ''}`,
    dataset: { port, side, type: p.type, bid, vkey: `${bid}.${port}` },
  }, h('i', { class: 'lgc-dot' }), p.label ? h('span', {}, p.label) : null, h('em', { class: 'lgc-v' }));
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
