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
 * trigger, hidden }] — base ports first, then the added ones (name = their id x1, x2…, label = their
 * name). A block also has the output «error» (Exception). For the object of a component in a schema
 * (role 'component') pass the component's definition and its added ports as `component`.
 * `hidden`: hidden on the drawing (portHidden); a linked port is shown anyway. `hiddenByDefault`:
 * its definition says `hidden: true` (a port most schemas do not need, shown with the eye).
 */
export function portsOf(item, def, { lang = 'en', component = null, errorLabel = t('error') } = {}) {
  const src = component?.def ?? def;
  const added = component ? component.added : item?.added;
  const base = side => (src?.[side] ?? []).map(p => ({ name: p.name, label: label(p.label, lang) || p.name, type: p.type ?? 'any', added: false, trigger: p.trigger !== false, hiddenByDefault: p.hidden === true }));
  const extra = side => (added?.[side] ?? []).map(p => ({ name: p.id, label: p.name, type: src?.grow?.[side]?.type ?? 'any', added: true, trigger: true }));
  const inputs = [...base('inputs'), ...extra('inputs')];
  const outputs = [...base('outputs'), ...extra('outputs')];
  // A schema port has the type chosen in its settings
  if (def?.role === 'schemaIn' && outputs[0]) outputs[0].type = item?.config?.type ?? 'any';
  if (def?.role === 'schemaOut' && inputs[0]) inputs[0].type = item?.config?.type ?? 'any';
  // the Exception is hidden by default, unless the block's definition says showError: true (core.throw)
  if (def && !def.role && !component) outputs.push({ name: 'error', label: errorLabel, type: 'any', added: false, error: true, hiddenByDefault: def.showError !== true });
  if (component) outputs.push({ name: 'error', label: errorLabel, type: 'any', added: false, error: true, hiddenByDefault: true });
  for (const p of inputs) p.hidden = portHidden(item, 'inputs', p.name, p.hiddenByDefault);
  for (const p of outputs) p.hidden = portHidden(item, 'outputs', p.name, p.hiddenByDefault);
  return { inputs, outputs };
}

/**
 * Whether a port of a block is hidden on the drawing: the user's choice (item.hide = { inputs:
 * { name: bool }, outputs: { … } }), else the default — hidden are the output «error» (Exception)
 * and the ports whose definition says `hidden: true`. `byDefault` (the `hiddenByDefault` of
 * portsOf) gives the default of that port when known: a block defined `showError: true` has its
 * Exception shown. A linked port is always drawn: LogicSchema.setPortHidden does not hide it, and
 * the drawing shows it anyway.
 */
export function portHidden(item, side, name, byDefault = null) {
  const v = item?.hide?.[side]?.[name];
  if (typeof v === 'boolean') return v;
  return typeof byDefault === 'boolean' ? byDefault : side === 'outputs' && name === 'error';
}

/** item.hide of a file, kept only as { inputs: { name: bool }, outputs: { name: bool } }. */
function cleanHide(raw) {
  if (!plain(raw)) return null;
  const side = s => Object.fromEntries(Object.entries(plain(raw[s]) ? raw[s] : {}).filter(([k, v]) => k && typeof v === 'boolean').slice(0, 200));
  const hide = { inputs: side('inputs'), outputs: side('outputs') };
  return Object.keys(hide.inputs).length || Object.keys(hide.outputs).length ? hide : null;
}

/**
 * Whether a port of type `from` may go into one of type `to` without a warning. A pulse is a
 * boolean that is true for an instant (then false again): it goes into a bool input too.
 */
export function typesMatch(from, to) {
  if (!from || !to || from === 'any' || to === 'any') return true;
  if (from === to) return true;
  if (to === 'pulse') return true;              // anything arriving starts a pulse input (not false)
  if (from === 'pulse' && to === 'bool') return true;
  if (to === 'text') return from !== 'pulse';   // shown as text
  return false;
}

/** The port of a group that starts it: [group, 'run'] (from outside) and, inside, towards its blocks. */
export const GROUP_RUN = 'run';

/**
 * The groups of a schema kept valid (in place, after any change): each block in one group at
 * most, no empty group, the links of «run» only from outside into a group and from a group to its
 * blocks, and every port reached by a link across a group's edge exposed by that group.
 */
function tidyGroups(data) {
  if (!Array.isArray(data.groups)) { delete data.groups; return; }
  const blockIds = new Set(data.blocks.map(b => b.id));
  const seen = new Set();
  data.groups = data.groups.filter(g => plain(g) && ID.test(String(g.id ?? '')) && !blockIds.has(g.id)).map(g => ({
    id: g.id, name: String(g.name ?? g.id).slice(0, 80),
    blocks: (Array.isArray(g.blocks) ? g.blocks : []).filter(id => blockIds.has(id) && !seen.has(id) && seen.add(id)),
    collapsed: g.collapsed === true, thread: g.thread === true,
    expose: (Array.isArray(g.expose) ? g.expose : []).filter(e => plain(e) && (e.side === 'in' || e.side === 'out') && typeof e.port === 'string')
      .map(e => ({ block: e.block, side: e.side, port: e.port, ...(typeof e.name === 'string' && e.name.trim() && { name: e.name.trim().slice(0, 60) }) })),
  })).filter(g => g.blocks.length);
  const gids = new Set(data.groups.map(g => g.id));
  const groupOf = new Map(data.groups.flatMap(g => g.blocks.map(id => [id, g.id])));
  data.links = data.links.filter(l => {
    const fromG = gids.has(l.from[0]), toG = gids.has(l.to[0]);
    if ((!blockIds.has(l.from[0]) && !fromG) || (!blockIds.has(l.to[0]) && !toG)) return false;
    if (fromG && (l.from[1] !== GROUP_RUN || groupOf.get(l.to[0]) !== l.from[0])) return false;
    if (toG && (l.to[1] !== GROUP_RUN || l.from[0] === l.to[0] || groupOf.get(l.from[0]) === l.to[0])) return false;
    return true;
  });
  for (const g of data.groups) {
    const keys = new Set();
    g.expose = g.expose.filter(e => groupOf.get(e.block) === g.id && !keys.has(`${e.side}:${e.block}.${e.port}`) && keys.add(`${e.side}:${e.block}.${e.port}`));
  }
  const expose = (gid, block, side, port) => {
    const g = data.groups.find(x => x.id === gid);
    if (!g.expose.some(e => e.block === block && e.side === side && e.port === port)) g.expose.push({ block, side, port });
  };
  for (const l of data.links) {
    const sf = gids.has(l.from[0]) ? l.from[0] : groupOf.get(l.from[0]) ?? null;
    const st = gids.has(l.to[0]) ? null : groupOf.get(l.to[0]) ?? null;
    if (sf === st) continue;
    if (sf && !gids.has(l.from[0])) expose(sf, l.from[0], 'out', l.from[1]);
    if (st) expose(st, l.to[0], 'in', l.to[1]);
  }
  if (!data.groups.length) delete data.groups;
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
        ...(cleanHide(b.hide) && { hide: cleanHide(b.hide) }),
        ...(b.mirror === true && { mirror: true }),
      }));
    // A group's «run» is reached with the group's id
    const groupIds = new Set((Array.isArray(raw.groups) ? raw.groups : []).map(g => g?.id).filter(id => typeof id === 'string' && !ids.has(id)));
    const known = id => ids.has(id) || groupIds.has(id);
    const links = (Array.isArray(raw.links) ? raw.links : []).filter(l => Array.isArray(l?.from) && Array.isArray(l?.to) && known(l.from[0]) && known(l.to[0]))
      .map(l => ({ from: [l.from[0], String(l.from[1])], to: [l.to[0], String(l.to[1])] }));
    const data = {
      format: LOGIC_FORMATS.schema, name: String(raw.name ?? 'schema'), blocks, links,
      ...(Array.isArray(raw.groups) && { groups: raw.groups }),
      notes: Array.isArray(raw.notes) ? raw.notes.filter(plain) : [],
      view: plain(raw.view) ? { x: Number(raw.view.x) || 0, y: Number(raw.view.y) || 0, zoom: Number(raw.view.zoom) || 1 } : { x: 0, y: 0, zoom: 1 },
      ...(plain(raw.consoles) && { consoles: raw.consoles }),
    };
    tidyGroups(data);
    return new LogicSchema(data);
  }

  block(id) { return this.data.blocks.find(b => b.id === id) ?? null; }

  // ---- groups
  //
  // A group (data.groups: [{ id, name, blocks, collapsed, thread, expose: [{ block, side: 'in'|'out',
  // port, name? }] }]) holds some blocks of the schema. Its blocks start only when its port «run»
  // gets a pulse (the engine: nothing linked to «run», they never start); inside, «run» goes on to
  // the blocks it is linked to. Links across its edge reach only the ports it exposes (linking one
  // exposes it). Collapsed, it is drawn as one block with «run» and the exposed ports; `thread`:
  // the engine runs it in a thread of its own.

  get groups() { return this.data.groups ?? []; }
  group(id) { return this.groups.find(g => g.id === id) ?? null; }
  /** The group a block is in, or null. */
  groupOf(blockId) { return this.groups.find(g => g.blocks.includes(blockId)) ?? null; }

  /** Makes a group of blocks that are in no group (the others are left out). Returns its id, or null. */
  addGroup(ids, { name = null } = {}) {
    return this.edit('group', data => {
      const inGroup = new Set((data.groups ?? []).flatMap(g => g.blocks));
      const blocks = ids.filter(id => data.blocks.some(b => b.id === id) && !inGroup.has(id));
      if (!blocks.length) return null;
      const id = nextId('grp', new Set([...data.blocks.map(b => b.id), ...(data.groups ?? []).map(g => g.id)]));
      data.groups ??= [];
      data.groups.push({ id, name: String(name ?? id).slice(0, 80), blocks, collapsed: false, thread: false, expose: [] });
      tidyGroups(data);
      return id;
    });
  }

  /** Undoes groups: their blocks stay where they are, out of any group; the links of their «run» go. */
  ungroup(ids) {
    const set = new Set(ids);
    this.edit('ungroup', data => {
      data.groups = (data.groups ?? []).filter(g => !set.has(g.id));
      data.links = data.links.filter(l => !set.has(l.from[0]) && !set.has(l.to[0]));
      tidyGroups(data);
    });
  }

  /** Removes groups with their blocks (and the links of both); `blocks`: other blocks to remove in the same step. */
  removeGroups(ids, { blocks = [] } = {}) {
    const set = new Set(ids);
    this.edit('removeGroup', data => {
      const gone = new Set([...blocks, ...(data.groups ?? []).filter(g => set.has(g.id)).flatMap(g => [g.id, ...g.blocks])]);
      data.groups = (data.groups ?? []).filter(g => !set.has(g.id));
      data.blocks = data.blocks.filter(b => !gone.has(b.id));
      data.links = data.links.filter(l => !gone.has(l.from[0]) && !gone.has(l.to[0]));
      tidyGroups(data);
    });
  }

  /** Changes a group: { name, collapsed, thread }. */
  setGroup(id, patch) {
    this.edit('groupSet', data => {
      const g = (data.groups ?? []).find(x => x.id === id);
      if (!g) return;
      if (typeof patch.name === 'string') g.name = patch.name.trim().slice(0, 80) || g.name;
      if (patch.collapsed !== undefined) g.collapsed = !!patch.collapsed;
      if (patch.thread !== undefined) g.thread = !!patch.thread;
    });
  }

  /** Puts blocks into a group (out of the one they were in): the links that now cross its edge expose their ports. */
  addToGroup(id, ids) {
    this.edit('groupAdd', data => {
      const g = (data.groups ?? []).find(x => x.id === id);
      if (!g) return;
      for (const other of data.groups) other.blocks = other.blocks.filter(b => !ids.includes(b) || other === g);
      for (const b of ids) if (data.blocks.some(x => x.id === b) && !g.blocks.includes(b)) g.blocks.push(b);
      tidyGroups(data);
    });
  }

  /** Takes blocks out of their groups (a group left empty goes). */
  removeFromGroup(ids) {
    this.edit('groupRemove', data => {
      for (const g of data.groups ?? []) g.blocks = g.blocks.filter(b => !ids.includes(b));
      tidyGroups(data);
    });
  }

  /**
   * Exposes a port of a block of a group (side 'in' | 'out'), so that it is reached from outside
   * the group, or stops exposing it: then the links across the edge to it go too.
   */
  setExposed(id, block, side, port, on) {
    this.edit('expose', data => {
      const g = (data.groups ?? []).find(x => x.id === id);
      if (!g || !g.blocks.includes(block)) return;
      const has = e => e.block === block && e.side === side && e.port === port;
      if (on) { if (!g.expose.some(has)) g.expose.push({ block, side, port }); return; }
      g.expose = g.expose.filter(e => !has(e));
      const inside = b => g.blocks.includes(b) || b === g.id;
      data.links = data.links.filter(l => !(side === 'out' ? l.from[0] === block && l.from[1] === port && !inside(l.to[0])
        : l.to[0] === block && l.to[1] === port && !inside(l.from[0]) && l.from[0] !== g.id));
      tidyGroups(data);
    });
  }

  /** The name an exposed port has on the collapsed group ('' = the port's own label). */
  renameExposed(id, block, side, port, name) {
    this.edit('exposeName', data => {
      const e = (data.groups ?? []).find(x => x.id === id)?.expose.find(x => x.block === block && x.side === side && x.port === port);
      if (!e) return;
      if (String(name ?? '').trim()) e.name = String(name).trim().slice(0, 60);
      else delete e.name;
    });
  }

  /** Moves an exposed port from index `from` to `to` (the order on the collapsed group). */
  moveExposed(id, from, to) {
    this.edit('exposeMove', data => {
      const list = (data.groups ?? []).find(x => x.id === id)?.expose;
      if (!list || from < 0 || from >= list.length) return;
      const [e] = list.splice(from, 1);
      list.splice(Math.max(0, Math.min(list.length, to)), 0, e);
    });
  }

  /** Whether a link may go from `from` to `to` across the groups (a group's «run» only from outside / to the inside). */
  canLink(from, to) {
    const g = id => this.group(id);
    if (from[0] === to[0]) return false;
    if (g(from[0]) && (from[1] !== GROUP_RUN || this.groupOf(to[0])?.id !== from[0])) return false;
    if (g(to[0]) && (to[1] !== GROUP_RUN || this.groupOf(from[0])?.id === to[0])) return false;
    return true;
  }

  /** Copies groups with their blocks and the links among them (and their «run»): the new group ids. */
  duplicateGroups(ids, { dx = 24, dy = 24 } = {}) {
    return this.edit('duplicate', data => {
      const out = [];
      for (const g of (data.groups ?? []).filter(x => ids.includes(x.id))) {
        const taken = new Set([...data.blocks.map(b => b.id), ...data.groups.map(x => x.id)]);
        const map = new Map();
        const gid = nextId('grp', taken);
        taken.add(gid);
        map.set(g.id, gid);
        for (const b of data.blocks.filter(x => g.blocks.includes(x.id))) {
          const id = nextId(b.id.replace(/\d+$/, '') || 'b', taken);
          taken.add(id);
          map.set(b.id, id);
          data.blocks.push({ ...clone(b), id, x: b.x + dx, y: b.y + dy });
        }
        for (const l of data.links.filter(x => map.has(x.from[0]) && map.has(x.to[0]))) {
          data.links.push({ from: [map.get(l.from[0]), l.from[1]], to: [map.get(l.to[0]), l.to[1]] });
        }
        data.groups.push({ ...clone(g), id: gid, blocks: g.blocks.map(b => map.get(b)), expose: g.expose.map(e => ({ ...e, block: map.get(e.block) })) });
        out.push(gid);
      }
      tidyGroups(data);
      return out;
    });
  }

  /** Adds a block of a definition at (x, y): its config starts from the defaults. Returns its id. */
  addBlock(def, { x = 0, y = 0, config = {}, group = null } = {}) {
    return this.edit('add', data => {
      const prefix = (def.type.split('.').pop().replace(/[^a-zA-Z]/g, '').slice(0, 12) || 'b').toLowerCase();
      const id = nextId(prefix, new Set([...data.blocks.map(b => b.id), ...(data.groups ?? []).map(g => g.id)]));
      data.groups?.find(g => g.id === group)?.blocks.push(id);
      const defaults = Object.fromEntries((def.config ?? []).filter(c => c.default !== undefined).map(c => [c.key, c.default]));
      data.blocks.push({ id, type: def.type, v: def.version, x: Math.round(x), y: Math.round(y), config: { ...defaults, ...config }, ports: {} });
      return id;
    });
  }

  /** Removes blocks and their links (a group left empty goes too). */
  removeBlocks(ids) {
    const set = new Set(ids);
    this.edit('remove', data => {
      data.blocks = data.blocks.filter(b => !set.has(b.id));
      data.links = data.links.filter(l => !set.has(l.from[0]) && !set.has(l.to[0]));
      tidyGroups(data);
    });
  }

  /**
   * Copies blocks (and the links among them) moved by (dx, dy): returns the new ids. Copies of
   * blocks all of one group stay in that group.
   */
  duplicate(ids, { dx = 24, dy = 24 } = {}) {
    return this.edit('duplicate', data => {
      const taken = new Set([...data.blocks.map(b => b.id), ...(data.groups ?? []).map(g => g.id)]);
      const groups = new Set(ids.map(id => (data.groups ?? []).find(g => g.blocks.includes(id))?.id ?? null));
      const home = groups.size === 1 ? (data.groups ?? []).find(g => g.id === [...groups][0]) : null;
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
      if (home) home.blocks.push(...map.values());
      tidyGroups(data);
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

  /**
   * Mirrors blocks (one step of the history): a mirrored block has its inputs on the right and its
   * outputs on the left; only the drawing changes, never how it runs. `on`: true | false for all of
   * them, null (the default) turns each one over.
   */
  setMirror(ids, on = null) {
    const set = new Set(ids);
    this.edit('mirror', data => {
      for (const b of data.blocks) {
        if (!set.has(b.id)) continue;
        if (on === null ? !b.mirror : on) b.mirror = true;
        else delete b.mirror;
      }
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

  /**
   * Hides a port of a block on the drawing, or shows it again (side 'inputs' | 'outputs'). A linked
   * port is not hidden: false, nothing changed. Only what differs from the default (the output
   * «error» and the ports defined `hidden: true` hidden, the others shown) is kept in the file:
   * pass `byDefault`, the port's `hiddenByDefault` from portsOf.
   */
  setPortHidden(id, side, port, hidden, byDefault = null) {
    if (hidden && this.linksOf(id, port, side).length) return false;
    this.edit('portHidden', data => {
      const b = data.blocks.find(x => x.id === id);
      if (!b) return;
      b.hide ??= { inputs: {}, outputs: {} };
      b.hide[side] ??= {};
      if (!!hidden === portHidden(null, side, port, byDefault)) delete b.hide[side][port];
      else b.hide[side][port] = !!hidden;
      if (!cleanHide(b.hide)) delete b.hide;
    });
    return true;
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
      if (b.hide?.[side]) { delete b.hide[side][portId]; if (!cleanHide(b.hide)) delete b.hide; }
      data.links = data.links.filter(l => !(side === 'inputs' ? l.to[0] === id && l.to[1] === portId : l.from[0] === id && l.from[1] === portId));
      for (const g of data.groups ?? []) g.expose = g.expose.filter(e => !(e.block === id && e.port === portId && e.side === (side === 'inputs' ? 'in' : 'out')));
      tidyGroups(data);
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

  /**
   * Links an output to an input. false when it is there already or not possible (see canLink). A
   * link across a group's edge exposes the port it reaches inside the group.
   */
  connect(from, to) {
    if (!this.canLink(from, to)) return false;
    if (this.data.links.some(l => l.from[0] === from[0] && l.from[1] === from[1] && l.to[0] === to[0] && l.to[1] === to[1])) return false;
    this.edit('link', data => { data.links.push({ from: [...from], to: [...to] }); tidyGroups(data); });
    return true;
  }

  /**
   * Several links in one step of the history: [[from, to], …]. Those already there or not possible
   * (see canLink) are left out. Returns how many were made.
   */
  connectMany(pairs) {
    const ok = [];
    for (const [from, to] of pairs) {
      if (!this.canLink(from, to)) continue;
      const same = l => l.from[0] === from[0] && l.from[1] === from[1] && l.to[0] === to[0] && l.to[1] === to[1];
      if (this.data.links.some(same) || ok.some(same)) continue;
      ok.push({ from: [...from], to: [...to] });
    }
    if (ok.length) this.edit('link', data => { data.links.push(...ok); tidyGroups(data); });
    return ok.length;
  }

  /** A link taken from its input and dropped on another one (one step). false when not possible. */
  relink(link, to) {
    if (!this.canLink(link.from, to)) return false;
    this.edit('relink', data => {
      data.links = data.links.filter(l => linkKey(l) !== linkKey(link));
      if (!data.links.some(l => linkKey(l) === linkKey({ from: link.from, to }))) data.links.push({ from: [...link.from], to: [...to] });
      tidyGroups(data);
    });
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

/** How a window opens: state 'normal' | 'maximized', modal (a dialog), onTop (always in front). */
export const LOGIC_WINDOW_STATES = Object.freeze(['normal', 'maximized']);

export class LogicWindow extends LogicDocument {
  static create(title = 'Finestra') {
    return new LogicWindow({ format: LOGIC_FORMATS.window, title: String(title), size: { w: 480, h: 360, resizable: true }, state: 'normal', modal: false, onTop: false, root: { id: 'root', type: 'ui.column', props: { gap: 10, padding: 14 }, children: [] } });
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
    return new LogicWindow({
      format: LOGIC_FORMATS.window, title: String(raw.title ?? 'Finestra'), size,
      state: LOGIC_WINDOW_STATES.includes(raw.state) ? raw.state : 'normal', modal: raw.modal === true, onTop: raw.onTop === true, root,
    });
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

  /** How it opens: { state: 'normal' | 'maximized', modal: bool, onTop: bool } (any of them). */
  setOptions({ state, modal, onTop } = {}) {
    this.edit('options', data => {
      if (LOGIC_WINDOW_STATES.includes(state)) data.state = state;
      if (modal !== undefined) data.modal = !!modal;
      if (onTop !== undefined) data.onTop = !!onTop;
    });
  }

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
