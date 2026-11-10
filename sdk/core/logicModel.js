import { Emitter } from './events.js';
import { UndoStack } from './history.js';
import { locale } from './locale.js';

const { t } = locale.define('lilos:sdk.logic', {
  en: { strings: {
    noGrow: 'This one does not allow adding ports', maxAdded: 'At most {n} added ports', unknownBlock: 'Unknown block',
    onlyAdded: 'Only added ports can be removed', notSchema: 'This is not a Logic Studio schema (.lsch)',
    notWindow: 'This is not a Logic Studio window (.lsui)', notProject: 'This is not a Logic Studio project (.lsproj)',
    intoContainer: 'Components go only inside a container', unknownComponent: 'Unknown component',
    mainConsole: 'The main console cannot be removed', error: 'Exception', missing: 'The package is missing',
  } },
});

/** Texts of the Logic Studio documents (also for LogicCanvas). */
export const logicText = t;

/**
 * Logic Studio documents, as the IDE (or any app) edits them: a schema (.lsch), a window of the
 * UI (.lsui) and a project (.lsproj). Every change goes through edit(): it is recorded in the
 * document's history (undo/redo) and emits 'change' { what }. The engine checks them again
 * before running (logicstudio-engine, project.js); here they are kept valid as they are edited.
 *
 *   LogicSchema.create(name) / LogicSchema.parse(json)
 *   LogicWindow.create(title) / LogicWindow.parse(json)
 *   LogicProject.create(name) / LogicProject.parse(json)
 *   doc.toJSON() → plain object; doc.toText() → the file's text; doc.dirty; doc.markSaved()
 *   doc.history → UndoStack
 *
 * Definitions (blocks and components) come from logic.catalog(): portsOf(item, def) gives the
 * ports of a block or component with the ones added by the user.
 */

export const LOGIC_FORMATS = Object.freeze({ project: 'lilos-lsproj/1', schema: 'lilos-lsch/1', window: 'lilos-lsui/1' });
export const LOGIC_EXTENSIONS = Object.freeze({ project: 'lsproj', schema: 'lsch', window: 'lsui' });
export const PORT_TYPES = Object.freeze(['number', 'bool', 'text', 'object', 'list', 'matrix', 'any', 'pulse']);

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const ID = /^[\w-]{1,40}$/;
const label = (l, lang) => (l && typeof l === 'object' ? l[lang] ?? l.en ?? '' : String(l ?? ''));

/** A document of Logic Studio: data, history, dirty state. */
class LogicDocument extends Emitter {
  data;
  history = new UndoStack({ limit: 200 });
  #saved;

  constructor(data) {
    super();
    this.data = data;
    this.#saved = JSON.stringify(data);
  }

  get dirty() { return JSON.stringify(this.data) !== this.#saved; }
  markSaved() { this.#saved = JSON.stringify(this.data); this.emit('saved'); }

  toJSON() { return clone(this.data); }
  toText() { return `${JSON.stringify(this.data, null, 2)}\n`; }

  /**
   * Changes the document: fn(data) changes it in place (and may return a result). Recorded as
   * one step of the history; a fn that throws changes nothing.
   */
  edit(what, fn, { record = true } = {}) {
    const before = JSON.stringify(this.data);
    const work = JSON.parse(before);
    const result = fn(work);
    const after = JSON.stringify(work);
    if (after === before) return result;
    this.data = work;
    if (record) {
      this.history.push({
        label: what,
        undo: () => { this.data = JSON.parse(before); this.emit('change', { what, undo: true }); },
        redo: () => { this.data = JSON.parse(after); this.emit('change', { what, redo: true }); },
      });
    }
    this.emit('change', { what });
    return result;
  }

  /** Replaces the whole document (a file read again): history cleared. */
  replace(data) {
    this.data = data;
    this.history.clear();
    this.markSaved();
    this.emit('change', { what: 'replace' });
  }
}

/** A new id: prefix + the first number not taken. */
function nextId(prefix, taken) {
  for (let n = 1; ; n++) if (!taken.has(`${prefix}${n}`)) return `${prefix}${n}`;
}

/**
 * The ports of a block (or of a component): { inputs, outputs }, each [{ name, label, type, added,
 * trigger }] — base ports first, then the added ones (name = their id x1, x2…, label = their name).
 * A block also has the output «error» (Eccezione). For the object of a component in a schema
 * (role 'component') pass the component's definition and its added ports as `component`.
 */
export function portsOf(item, def, { lang = 'en', component = null, errorLabel = t('error') } = {}) {
  const src = component?.def ?? def;
  const added = component ? component.added : item?.added;
  const base = side => (src?.[side] ?? []).map(p => ({ name: p.name, label: label(p.label, lang) || p.name, type: p.type ?? 'any', added: false, trigger: p.trigger !== false }));
  const extra = side => (added?.[side] ?? []).map(p => ({ name: p.id, label: p.name, type: src?.grow?.[side]?.type ?? 'any', added: true, trigger: true }));
  const inputs = [...base('inputs'), ...extra('inputs')];
  const outputs = [...base('outputs'), ...extra('outputs')];
  // A schema port has the type chosen in its settings
  if (def?.role === 'schemaIn' && outputs[0]) outputs[0].type = item?.config?.type ?? 'any';
  if (def?.role === 'schemaOut' && inputs[0]) inputs[0].type = item?.config?.type ?? 'any';
  if (def && !def.role && !component) outputs.push({ name: 'error', label: errorLabel, type: 'any', added: false, error: true });
  if (component) outputs.push({ name: 'error', label: errorLabel, type: 'any', added: false, error: true });
  return { inputs, outputs };
}

/** Whether a port of type `from` may go into one of type `to` without a warning. */
export function typesMatch(from, to) {
  if (!from || !to || from === 'any' || to === 'any') return true;
  if (from === to) return true;
  if (to === 'pulse') return true;              // anything arriving starts a pulse input
  if (to === 'text') return from !== 'pulse';   // shown as text
  return false;
}

/** The name a newly added port gets. */
function addedName(grow, side, existing, def, lang) {
  const g = grow?.[side];
  const used = new Set([...(def?.[side] ?? []).map(p => p.name), ...existing.map(p => p.name)]);
  if (g?.name === 'letter') {
    for (let c = 97; c <= 122; c++) if (!used.has(String.fromCharCode(c))) return String.fromCharCode(c);
  }
  const n = existing.length + 1;
  if (g?.name === 'number') return String((def?.[side] ?? []).length + n);
  const base = label(g?.label, lang) || (side === 'inputs' ? 'ingresso' : 'uscita');
  for (let i = n; ; i++) if (!used.has(`${base} ${i}`)) return `${base} ${i}`;
}

/** Adds a port to item.added (item: a block or a component, in place). Returns the port. */
function addPortTo(item, def, side, { limit = 32, lang = 'en', name = null } = {}) {
  const grow = def?.grow?.[side];
  if (!grow) throw new Error(t('noGrow'));
  item.added ??= { inputs: [], outputs: [] };
  item.added.inputs ??= [];
  item.added.outputs ??= [];
  const list = item.added[side];
  if (list.length >= Math.min(limit, grow.max)) throw new Error(t('maxAdded', { n: Math.min(limit, grow.max) }));
  const taken = new Set([...item.added.inputs, ...item.added.outputs].map(p => p.id));
  const port = { id: nextId('x', taken), name: name ?? addedName(def.grow, side, list, def, lang) };
  list.push(port);
  return port;
}

// ---------------------------------------------------------------------------------------- schema

export class LogicSchema extends LogicDocument {
  static create(name = 'schema') {
    return new LogicSchema({ format: LOGIC_FORMATS.schema, name: String(name), blocks: [], links: [], notes: [], view: { x: 0, y: 0, zoom: 1 } });
  }

  /** From a file's JSON: what is not valid is left out (the engine would refuse it anyway). */
  static parse(json) {
    const raw = typeof json === 'string' ? JSON.parse(json) : json;
    if (!plain(raw) || raw.format !== LOGIC_FORMATS.schema) throw new Error(t('notSchema'));
    const ids = new Set();
    const blocks = (Array.isArray(raw.blocks) ? raw.blocks : []).filter(b => plain(b) && ID.test(String(b.id ?? '')) && typeof b.type === 'string' && !ids.has(b.id) && ids.add(b.id))
      .map(b => ({
        id: b.id, type: b.type, v: Number.isInteger(b.v) ? b.v : 1, x: Number(b.x) || 0, y: Number(b.y) || 0,
        ...(typeof b.label === 'string' && b.label && { label: b.label.slice(0, 80) }),
        config: plain(b.config) ? b.config : {}, ports: plain(b.ports) ? b.ports : {},
        ...(plain(b.added) && { added: { inputs: Array.isArray(b.added.inputs) ? b.added.inputs : [], outputs: Array.isArray(b.added.outputs) ? b.added.outputs : [] } }),
      }));
    const links = (Array.isArray(raw.links) ? raw.links : []).filter(l => Array.isArray(l?.from) && Array.isArray(l?.to) && ids.has(l.from[0]) && ids.has(l.to[0]))
      .map(l => ({ from: [l.from[0], String(l.from[1])], to: [l.to[0], String(l.to[1])] }));
    const doc = new LogicSchema({
      format: LOGIC_FORMATS.schema, name: String(raw.name ?? 'schema'), blocks, links,
      notes: Array.isArray(raw.notes) ? raw.notes.filter(plain) : [],
      view: plain(raw.view) ? { x: Number(raw.view.x) || 0, y: Number(raw.view.y) || 0, zoom: Number(raw.view.zoom) || 1 } : { x: 0, y: 0, zoom: 1 },
      ...(plain(raw.consoles) && { consoles: raw.consoles }),
    });
    return doc;
  }

  block(id) { return this.data.blocks.find(b => b.id === id) ?? null; }

  /** Adds a block of a definition at (x, y): its config starts from the defaults. Returns its id. */
  addBlock(def, { x = 0, y = 0, config = {} } = {}) {
    return this.edit('add', data => {
      const prefix = (def.type.split('.').pop().replace(/[^a-zA-Z]/g, '').slice(0, 12) || 'b').toLowerCase();
      const id = nextId(prefix, new Set(data.blocks.map(b => b.id)));
      const defaults = Object.fromEntries((def.config ?? []).filter(c => c.default !== undefined).map(c => [c.key, c.default]));
      data.blocks.push({ id, type: def.type, v: def.version, x: Math.round(x), y: Math.round(y), config: { ...defaults, ...config }, ports: {} });
      return id;
    });
  }

  /** Removes blocks and their links. */
  removeBlocks(ids) {
    const set = new Set(ids);
    this.edit('remove', data => {
      data.blocks = data.blocks.filter(b => !set.has(b.id));
      data.links = data.links.filter(l => !set.has(l.from[0]) && !set.has(l.to[0]));
    });
  }

  /** Copies blocks (and the links among them) moved by (dx, dy): returns the new ids. */
  duplicate(ids, { dx = 24, dy = 24 } = {}) {
    return this.edit('duplicate', data => {
      const taken = new Set(data.blocks.map(b => b.id));
      const map = new Map();
      for (const b of data.blocks.filter(x => ids.includes(x.id))) {
        const prefix = b.id.replace(/\d+$/, '') || 'b';
        const id = nextId(prefix, taken);
        taken.add(id);
        map.set(b.id, id);
        data.blocks.push({ ...clone(b), id, x: b.x + dx, y: b.y + dy });
      }
      for (const l of data.links.filter(x => map.has(x.from[0]) && map.has(x.to[0]))) {
        data.links.push({ from: [map.get(l.from[0]), l.from[1]], to: [map.get(l.to[0]), l.to[1]] });
      }
      return [...map.values()];
    });
  }

  /** Moves blocks to positions: { id: [x, y] } (one step of the history: a drag ended). */
  place(positions) {
    this.edit('move', data => {
      for (const b of data.blocks) if (positions[b.id]) [b.x, b.y] = positions[b.id].map(Math.round);
    });
  }

  setConfig(id, key, value) {
    this.edit('config', data => {
      const b = data.blocks.find(x => x.id === id);
      if (b) b.config[key] = clone(value);
    });
  }

  setLabel(id, text) {
    this.edit('label', data => {
      const b = data.blocks.find(x => x.id === id);
      if (!b) return;
      if (text) b.label = String(text).slice(0, 80);
      else delete b.label;
    });
  }

  /** An input's options: start (a value at the start) and trigger (false: it keeps the value without starting the block). */
  setPort(id, port, { start, trigger } = {}) {
    this.edit('port', data => {
      const b = data.blocks.find(x => x.id === id);
      if (!b) return;
      const p = { ...(b.ports[port] ?? {}) };
      if (start !== undefined) { if (start === null || start === '') delete p.start; else p.start = clone(start); }
      if (trigger !== undefined) { if (trigger) delete p.trigger; else p.trigger = false; }
      if (Object.keys(p).length) b.ports[port] = p; else delete b.ports[port];
    });
  }

  /** Adds a port (only from the properties sidebar): side 'inputs' | 'outputs'. Returns the port. */
  addPort(id, def, side, options) {
    return this.edit('addPort', data => {
      const b = data.blocks.find(x => x.id === id);
      if (!b) throw new Error(t('unknownBlock'));
      return addPortTo(b, def, side, options);
    });
  }

  /** Removes an added port (never a base one) and its links. */
  removePort(id, side, portId) {
    this.edit('removePort', data => {
      const b = data.blocks.find(x => x.id === id);
      const list = b?.added?.[side];
      if (!list || !list.some(p => p.id === portId)) throw new Error(t('onlyAdded'));
      b.added[side] = list.filter(p => p.id !== portId);
      delete b.ports[portId];
      data.links = data.links.filter(l => !(side === 'inputs' ? l.to[0] === id && l.to[1] === portId : l.from[0] === id && l.from[1] === portId));
    });
  }

  renamePort(id, side, portId, name) {
    this.edit('renamePort', data => {
      const p = data.blocks.find(x => x.id === id)?.added?.[side]?.find(x => x.id === portId);
      if (p) p.name = String(name).trim().slice(0, 60) || p.name;
    });
  }

  /** Moves an added port from index `from` to `to` among the added ones of its side. */
  movePort(id, side, from, to) {
    this.edit('movePort', data => {
      const list = data.blocks.find(x => x.id === id)?.added?.[side];
      if (!list || from < 0 || from >= list.length) return;
      const [p] = list.splice(from, 1);
      list.splice(Math.max(0, Math.min(list.length, to)), 0, p);
    });
  }

  /** The links touching a port (to show what removing it would remove). */
  linksOf(id, port, side) {
    return this.data.links.filter(l => (side === 'inputs' ? l.to[0] === id && l.to[1] === port : l.from[0] === id && l.from[1] === port));
  }

  /** Links an output to an input. false when it is there already or not possible. */
  connect(from, to) {
    if (from[0] === to[0]) return false;
    if (this.data.links.some(l => l.from[0] === from[0] && l.from[1] === from[1] && l.to[0] === to[0] && l.to[1] === to[1])) return false;
    this.edit('link', data => { data.links.push({ from: [...from], to: [...to] }); });
    return true;
  }

  disconnect(links) {
    const keys = new Set(links.map(linkKey));
    this.edit('unlink', data => { data.links = data.links.filter(l => !keys.has(linkKey(l))); });
  }

  setView(view) {
    this.edit('view', data => { data.view = { x: Math.round(view.x), y: Math.round(view.y), zoom: Math.round(view.zoom * 1000) / 1000 }; }, { record: false });
  }

  rename(name) { this.edit('rename', data => { data.name = String(name).slice(0, 80); }); }

  /** The schema's ports in the project: its Ingressi and Uscite di schema. */
  schemaPorts(catalogDef) {
    const inputs = [], outputs = [];
    for (const b of this.data.blocks) {
      const role = catalogDef(b.type)?.role;
      if (role === 'schemaIn') inputs.push({ name: String(b.config.port ?? ''), type: b.config.type ?? 'any', block: b.id, description: b.config.description ?? '' });
      if (role === 'schemaOut') outputs.push({ name: String(b.config.port ?? ''), type: b.config.type ?? 'any', block: b.id, description: b.config.description ?? '' });
    }
    return { inputs, outputs };
  }

  /** The objects of components in this schema: [{ block, window, component }]. */
  componentObjects(catalogDef) {
    return this.data.blocks.filter(b => catalogDef(b.type)?.role === 'component').map(b => ({ block: b.id, window: b.config.window, component: b.config.component }));
  }
}

export const linkKey = l => `${l.from[0]}.${l.from[1]}>${l.to[0]}.${l.to[1]}`;

// ---------------------------------------------------------------------------------------- window

export class LogicWindow extends LogicDocument {
  static create(title = 'Finestra') {
    return new LogicWindow({ format: LOGIC_FORMATS.window, title: String(title), size: { w: 480, h: 360, resizable: true }, root: { id: 'root', type: 'ui.column', props: { gap: 10, padding: 14 }, children: [] } });
  }

  static parse(json) {
    const raw = typeof json === 'string' ? JSON.parse(json) : json;
    if (!plain(raw) || raw.format !== LOGIC_FORMATS.window) throw new Error(t('notWindow'));
    const ids = new Set();
    const clean = (node, depth) => {
      if (!plain(node) || depth > 32 || typeof node.type !== 'string') return null;
      let id = ID.test(String(node.id ?? '')) && !ids.has(node.id) ? node.id : null;
      if (!id) id = nextId((node.type.split('.').pop() || 'c').replace(/[^a-zA-Z]/g, '').toLowerCase() || 'c', ids);
      ids.add(id);
      const out = { id, type: node.type, v: Number.isInteger(node.v) ? node.v : 1, props: plain(node.props) ? node.props : {} };
      if (plain(node.added)) out.added = { inputs: Array.isArray(node.added.inputs) ? node.added.inputs : [], outputs: Array.isArray(node.added.outputs) ? node.added.outputs : [] };
      if (plain(node.layout)) out.layout = node.layout;
      if (Array.isArray(node.children)) out.children = node.children.map(c => clean(c, depth + 1)).filter(Boolean);
      return out;
    };
    const root = clean(raw.root, 0) ?? { id: 'root', type: 'ui.column', props: {}, children: [] };
    const size = plain(raw.size) ? { w: Math.max(160, Number(raw.size.w) || 480), h: Math.max(120, Number(raw.size.h) || 360), resizable: raw.size.resizable !== false } : { w: 480, h: 360, resizable: true };
    return new LogicWindow({ format: LOGIC_FORMATS.window, title: String(raw.title ?? 'Finestra'), size, root });
  }

  /** Every node with its parent: [{ node, parent, index, depth }] in document order. */
  nodes() {
    const out = [];
    const walk = (node, parent, index, depth) => {
      out.push({ node, parent, index, depth });
      (node.children ?? []).forEach((c, i) => walk(c, node, i, depth + 1));
    };
    walk(this.data.root, null, 0, 0);
    return out;
  }

  find(id) { return this.nodes().find(n => n.node.id === id) ?? null; }

  /** Adds a component of a definition into container `parent` at `index`. Returns its id. */
  add(def, parent = 'root', index = Infinity, props = {}) {
    return this.edit('add', data => {
      const all = [];
      const walk = n => { all.push(n); (n.children ?? []).forEach(walk); };
      walk(data.root);
      const host = all.find(n => n.id === parent);
      if (!host || !Array.isArray(host.children)) throw new Error(t('intoContainer'));
      const prefix = (def.type.split('.').pop() || 'c').replace(/[^a-zA-Z]/g, '').toLowerCase() || 'c';
      const id = nextId(prefix, new Set(all.map(n => n.id)));
      const defaults = Object.fromEntries((def.props ?? []).filter(p => p.default !== undefined).map(p => [p.key, p.default]));
      const node = { id, type: def.type, v: def.version, props: { ...defaults, ...props } };
      if (def.container) node.children = [];
      host.children.splice(Math.min(index, host.children.length), 0, node);
      return id;
    });
  }

  remove(ids) {
    const set = new Set(ids);
    this.edit('remove', data => {
      const walk = n => { if (n.children) { n.children = n.children.filter(c => !set.has(c.id)); n.children.forEach(walk); } };
      walk(data.root);
    });
  }

  /** Moves a component into container `parent` at `index` (not into itself). */
  move(id, parent, index) {
    this.edit('move', data => {
      const all = [];
      const walk = (n, p) => { all.push({ n, p }); (n.children ?? []).forEach(c => walk(c, n)); };
      walk(data.root, null);
      const item = all.find(x => x.n.id === id);
      const host = all.find(x => x.n.id === parent)?.n;
      if (!item?.p || !host?.children) return;
      // not into itself or one of its own containers
      for (let cur = all.find(x => x.n.id === parent); cur; cur = all.find(x => x.n === cur.p)) if (cur.n.id === id) return;
      const from = item.p.children.indexOf(item.n);
      item.p.children.splice(from, 1);
      const at = item.p === host && from < index ? index - 1 : index;
      host.children.splice(Math.max(0, Math.min(host.children.length, at)), 0, item.n);
    });
  }

  setProp(id, key, value) {
    this.edit('prop', data => {
      const walk = n => { if (n.id === id) { if (value === undefined) delete n.props[key]; else n.props[key] = clone(value); return true; } return (n.children ?? []).some(walk); };
      walk(data.root);
    });
  }

  /** Position and size in an Area libera: { x, y, w, h }. */
  setLayout(id, layout) {
    this.edit('layout', data => {
      const walk = n => { if (n.id === id) { n.layout = { ...(n.layout ?? {}), ...layout }; return true; } return (n.children ?? []).some(walk); };
      walk(data.root);
    });
  }

  addPort(id, def, side, options) {
    return this.edit('addPort', data => {
      let target = null;
      const walk = n => { if (n.id === id) target = n; else (n.children ?? []).forEach(walk); };
      walk(data.root);
      if (!target) throw new Error(t('unknownComponent'));
      return addPortTo(target, def, side, options);
    });
  }

  removePort(id, side, portId) {
    this.edit('removePort', data => {
      const walk = n => { if (n.id === id && n.added?.[side]) n.added[side] = n.added[side].filter(p => p.id !== portId); (n.children ?? []).forEach(walk); };
      walk(data.root);
    });
  }

  renamePort(id, side, portId, name) {
    this.edit('renamePort', data => {
      const walk = n => { const p = n.id === id ? n.added?.[side]?.find(x => x.id === portId) : null; if (p) p.name = String(name).trim().slice(0, 60) || p.name; (n.children ?? []).forEach(walk); };
      walk(data.root);
    });
  }

  setTitle(title) { this.edit('title', data => { data.title = String(title).slice(0, 120); }); }
  setSize(size) { this.edit('size', data => { data.size = { ...data.size, ...size }; }); }

  /** The components with ports (not the containers), for the schemas: [{ id, type }]. */
  components(componentDef) {
    return this.nodes().map(n => n.node).filter(n => n.id !== 'root' && !componentDef(n.type)?.container);
  }
}

// ---------------------------------------------------------------------------------------- project

export class LogicProject extends LogicDocument {
  static create(name = 'Progetto') {
    return new LogicProject({
      format: LOGIC_FORMATS.project, name: String(name), version: '1.0.0', description: '',
      schemas: {}, windows: {}, main: null, links: [],
      consoles: { list: [{ id: 'main', name: 'Principale' }], outside: 'onInput', closeAfterAnswer: true, notify: true, copyToLog: 'warnings', mainOpens: 'start' },
      options: { keepValues: true, syncCopies: true },
      entrypoints: {}, uses: {}, texts: {}, app: { id: null, glyph: null, color: null, runs: 'open' },
    });
  }

  static parse(json) {
    const raw = typeof json === 'string' ? JSON.parse(json) : json;
    if (!plain(raw) || raw.format !== LOGIC_FORMATS.project) throw new Error(t('notProject'));
    const base = LogicProject.create(raw.name).data;
    const paths = v => Object.fromEntries(Object.entries(plain(v) ? v : {}).filter(([k, p]) => typeof p === 'string' && k && p));
    return new LogicProject({
      ...base,
      ...raw,
      schemas: paths(raw.schemas), windows: paths(raw.windows),
      links: (Array.isArray(raw.links) ? raw.links : []).filter(l => typeof l?.from === 'string' && typeof l?.to === 'string'),
      consoles: { ...base.consoles, ...(plain(raw.consoles) ? raw.consoles : {}) },
      options: { ...base.options, ...(plain(raw.options) ? raw.options : {}) },
      entrypoints: plain(raw.entrypoints) ? raw.entrypoints : {},
      app: { ...base.app, ...(plain(raw.app) ? raw.app : {}) },
      format: LOGIC_FORMATS.project,
    });
  }

  /** Adds (or moves) an element: kind 'schemas' | 'windows', name → path relative to the project folder. */
  setElement(kind, name, path) {
    this.edit('element', data => {
      data[kind][name] = path;
      if (kind === 'windows' && !data.main) data.main = name;
    });
  }

  removeElement(kind, name) {
    this.edit('removeElement', data => {
      delete data[kind][name];
      if (kind === 'schemas') data.links = data.links.filter(l => !l.from.startsWith(`${name}:`) && !l.to.startsWith(`${name}:`));
      if (kind === 'windows') { delete data.entrypoints[name]; if (data.main === name) data.main = Object.keys(data.windows)[0] ?? null; }
    });
  }

  renameElement(kind, from, to, path) {
    this.edit('renameElement', data => {
      if (!(from in data[kind]) || to in data[kind]) return;
      data[kind] = Object.fromEntries(Object.entries(data[kind]).map(([k, v]) => (k === from ? [to, path ?? v] : [k, v])));
      if (kind === 'schemas') {
        const fix = ref => (ref.startsWith(`${from}:`) ? `${to}:${ref.slice(from.length + 1)}` : ref);
        data.links = data.links.map(l => ({ from: fix(l.from), to: fix(l.to) }));
      }
      if (kind === 'windows') {
        if (data.main === from) data.main = to;
        if (data.entrypoints[from]) { data.entrypoints[to] = data.entrypoints[from]; delete data.entrypoints[from]; }
      }
    });
  }

  setMain(name) { this.edit('main', data => { if (name in data.windows) data.main = name; }); }

  /** Links an Uscita di schema ('schema:port') to an Ingresso di schema. */
  link(from, to) {
    if (this.data.links.some(l => l.from === from && l.to === to)) return false;
    this.edit('link', data => { data.links.push({ from, to }); });
    return true;
  }

  unlink(from, to) { this.edit('unlink', data => { data.links = data.links.filter(l => !(l.from === from && l.to === to)); }); }

  /** A schema port renamed: the project's links follow it. */
  renamePortRef(schema, from, to) {
    this.edit('renamePort', data => {
      const fix = ref => (ref === `${schema}:${from}` ? `${schema}:${to}` : ref);
      data.links = data.links.map(l => ({ from: fix(l.from), to: fix(l.to) }));
    });
  }

  setConsoles(patch) { this.edit('consoles', data => { data.consoles = { ...data.consoles, ...clone(patch) }; }); }

  addConsole(name) {
    return this.edit('addConsole', data => {
      const id = nextId('c', new Set(data.consoles.list.map(c => c.id)));
      data.consoles.list.push({ id, name: String(name).slice(0, 60) || id });
      return id;
    });
  }

  removeConsole(id) {
    if (id === 'main') throw new Error(t('mainConsole'));
    this.edit('removeConsole', data => { data.consoles.list = data.consoles.list.filter(c => c.id !== id); });
  }

  updateConsole(id, patch) {
    this.edit('console', data => { const c = data.consoles.list.find(x => x.id === id); if (c) Object.assign(c, clone(patch), { id }); });
  }

  setOptions(patch) { this.edit('options', data => { data.options = { ...data.options, ...clone(patch) }; }); }
  setEntrypoint(window, entry) { this.edit('entrypoint', data => { if (entry) data.entrypoints[window] = clone(entry); else delete data.entrypoints[window]; }); }
  setInfo(patch) { this.edit('info', data => { for (const k of ['name', 'version', 'description', 'icon']) if (patch[k] !== undefined) data[k] = patch[k]; }); }
  setApp(patch) { this.edit('app', data => { data.app = { ...data.app, ...clone(patch) }; }); }
  setTexts(texts) { this.edit('texts', data => { data.texts = clone(texts); }); }
}
