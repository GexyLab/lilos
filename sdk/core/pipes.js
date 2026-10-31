import { Emitter } from './events.js';
import { storage } from './storage.js';
import { splitName } from './fileTypes.js';

/**
 * Pipes on events. Every operation of the system that others may watch or change is an *event*
 * declared in a catalog (define). An event has two stages:
 *
 *   before   ahead of the operation: a handler may change the request (the fields the event lets
 *            change) or stop it
 *   after    on the result: a handler may change it (when the event lets it) or only look at it.
 *            It runs in the reverse order of before: who changes first on the way in changes last
 *            on the way out, so two handlers that overlap (one compresses, one encrypts) nest.
 *
 * Handlers subscribe to an event and a stage (subscribe), asking to be among the first, the last
 * or in the middle; inside each band the user's order counts (setOrder), then who came first.
 * The chain is fixed when the event starts. A handler gets the data and
 *   ctx: { event, stage, position, total, prev, next, caller }
 *     position   its place in the chain (0 the first), total how many there are
 *     prev/next  who comes before and after it: { app, entry, name } | { system: true, name } | null
 *     caller     who asked for the operation: { app, opened } (an installed app; opened: the file was
 *                handed to it) | { system: true } (lilOS, a system app) | null
 * and returns nothing (the data goes on as it is), { data } (the changed data: only the fields the
 * event lets change are taken), or { stop: { error?, silent? } } (the operation does not happen:
 * it fails with `error`; silent: nobody needs to be told, the handler took care of it).
 *
 * A handler that throws or does not answer in time makes the operation fail: it is never skipped
 * (a file is not written as it is because its encryption did not answer). What a handler does
 * while it handles an event does not pass through its own handlers again: the operations an app
 * asks for skip the handlers of that same app.
 *
 * Contents that belong to an app (node.apps[id].content: an encrypted file) are not seen by the
 * handlers of other apps: for file.open, file.read and file.write of such a file only lilOS's and
 * that app's handlers run. And a handler sees only its own app's data on a node (node.apps).
 * Limits: 50 subscriptions per app, 256 operations running at once, 32 of them asked by one app.
 *
 * `where` filters what a handler is called for, checked here without calling it:
 *   { meta: 'own' }     files the handler's app marked (node.apps[app], see fs.setAppMeta)
 *   { ext: ['txt'] }    files with these extensions ('' = none)
 *   { type: 'file' }    nodes of this type
 *   { app: ['editor'] } app.launch of these apps
 * lilOS's own handlers may also give a function (data) → boolean.
 *
 * Event definition: define(name, def)
 *   { label, description?, edit?: { before?: [field], after?: [field] }, stop?: true,
 *     protected?: true   only lilOS and system apps subscribe
 *     sync?: true        a synchronous operation: before is for lilOS's own synchronous handlers
 *                        (runSync), the others only look at it after (notify)
 *     owner?: appId      an app's own event: its name starts with the app id ('acme.notes.saved')
 *     check?(data, stage) → data   cleans what a handler gave back (throws if not valid)
 *     timeout?: ms }
 *
 * Events: 'change' — the catalog, the subscriptions or the order changed (Control Panel shows the chains)
 */
const STAGES = ['before', 'after'];
const BANDS = ['first', 'middle', 'last'];
const NAME = /^[a-z0-9][a-z0-9.-]{0,63}\.[a-z][a-zA-Z0-9]{0,40}$/;
const ORDER_KEY = 'pipes-order';
const TIMEOUT = 15_000;
const MAX_ACTIVE = 256;      // operations going through pipes at once
const MAX_PER_APP = 32;      // … asked by one app
const MAX_SUBS = 50;         // subscriptions of one app
const CONTENT_EVENTS = new Set(['file.open', 'file.read', 'file.write']);
const SEGMENT = /^[a-z][a-zA-Z0-9]{0,40}$/;
const WHERE_KEYS = new Set(['meta', 'ext', 'type', 'app']);

export class PipeStopped extends Error {
  constructor(message, { silent = false } = {}) {
    super(message || 'Operazione fermata');
    this.name = 'PipeStopped';
    this.silent = silent;
  }
}

class Pipes extends Emitter {
  #events = new Map();
  #subs = new Map();
  #seq = 0;
  #active = 0;
  #byApp = new Map();

  define(name, def = {}) {
    if (!NAME.test(name)) throw new Error(`Nome di evento non valido: ${String(name).slice(0, 60)}`);
    // '<app id>.<one word>': 'acme' cannot take the names of 'acme.notes'
    if (def.owner && !(name.startsWith(`${def.owner}.`) && SEGMENT.test(name.slice(def.owner.length + 1)))) throw new Error('Un evento di un’app è <id dell’app>.<nome>');
    const known = this.#events.get(name);
    if (known && known.owner !== def.owner) throw new Error(`L’evento ${name} esiste già`);
    this.#events.set(name, {
      name,
      label: String(def.label ?? name).slice(0, 80),
      description: def.description ? String(def.description).slice(0, 300) : '',
      edit: { before: [...(def.edit?.before ?? [])], after: [...(def.edit?.after ?? [])] },
      stop: def.stop === true,
      protected: def.protected === true,
      sync: def.sync === true,
      owner: def.owner ?? null,
      check: typeof def.check === 'function' ? def.check : null,
      timeout: Number.isFinite(def.timeout) ? def.timeout : TIMEOUT,
    });
    this.emit('change');
  }

  /** Takes away the events of an app (it was removed) and every subscription of it. */
  forgetApp(appId) {
    for (const [name, def] of this.#events) if (def.owner === appId) this.#events.delete(name);
    for (const [id, sub] of this.#subs) if (sub.app === appId) this.#subs.delete(id);
    this.emit('change');
  }

  has(name) { return this.#events.has(name); }

  /** The definition of an event (without its functions), or null. */
  describe(name) {
    const def = this.#events.get(name);
    if (!def) return null;
    const { check, ...rest } = def;
    return { ...rest, edit: { before: [...def.edit.before], after: [...def.edit.after] } };
  }

  /** Every event: [{ name, label, description, protected, sync, owner, … }], sorted by name. */
  catalog() {
    return [...this.#events.keys()].sort().map(name => this.describe(name));
  }

  /**
   * A handler for an event. owner: who it is { key, app?, entry?, name, trusted?, sync? }
   *   key      stable name of the handler, for the user's order ('filecrypt#vault', 'lilos:guard')
   *   trusted  lilOS or a system app: may subscribe to protected events and give a function as where
   *   sync     the handler answers synchronously: needed for the before stage of a sync event
   * Returns the function that takes it away.
   */
  subscribe(name, { stage = 'after', position = 'middle', where = null } = {}, handler, owner = {}) {
    const def = this.#events.get(name);
    if (!def) throw new Error(`Evento sconosciuto: ${String(name).slice(0, 60)}`);
    if (!STAGES.includes(stage)) throw new Error('stage deve essere "before" o "after"');
    if (!BANDS.includes(position)) throw new Error('position deve essere "first", "middle" o "last"');
    if (typeof handler !== 'function') throw new Error('Manca la funzione della pipe');
    if (def.protected && !owner.trusted) throw new Error(`L’evento ${name} è riservato al sistema`);
    if (def.sync && stage === 'before' && !(owner.trusted && owner.sync)) {
      throw new Error(`${name} è un’operazione immediata: le app la possono solo osservare (stage "after")`);
    }
    if (owner.app && !owner.trusted && [...this.#subs.values()].filter(x => x.app === owner.app).length >= MAX_SUBS) throw new Error(`Al massimo ${MAX_SUBS} iscrizioni per app`);
    const id = `p${++this.#seq}`;
    this.#subs.set(id, {
      id, event: name, stage, position, where: cleanWhere(where, owner.trusted), handler, seq: this.#seq,
      key: String(owner.key ?? id), app: owner.app ?? null, entry: owner.entry ?? null,
      name: String(owner.name ?? owner.app ?? 'lilOS'), trusted: owner.trusted === true,
    });
    this.emit('change');
    return () => {
      if (this.#subs.delete(id)) this.emit('change');
    };
  }

  /** The chain of an event and stage, in the order it runs: [{ key, app, entry, name, position, where }]. */
  chain(name, stage) {
    return this.#ordered(name, stage).map(s => ({ key: s.key, app: s.app, entry: s.entry, name: s.name, position: s.position, where: typeof s.where === 'function' ? 'lilOS' : s.where }));
  }

  /** The user's order of handlers inside their bands (keys of chain()); null goes back to the default. */
  setOrder(name, stage, keys) {
    const all = storage.get(ORDER_KEY, {});
    const order = all && typeof all === 'object' && !Array.isArray(all) ? all : {};
    const slot = `${name}/${stage}`;
    if (Array.isArray(keys)) order[slot] = keys.filter(k => typeof k === 'string').slice(0, 100);
    else delete order[slot];
    storage.set(ORDER_KEY, order);
    this.emit('change');
  }

  isCustomOrder(name, stage) {
    const all = storage.get(ORDER_KEY, {});
    return !!all && typeof all === 'object' && Array.isArray(all[`${name}/${stage}`]);
  }

  /** True if some handler of the event (either stage) would be called for this data. */
  wants(name, data, caller = null) {
    return STAGES.some(stage => this.#chainFor(name, stage, data, caller).length > 0);
  }

  /**
   * Runs an event around its operation: the before chain on `data`, then op(data) → result, then
   * the after chain on the result (reversed). Resolves with the result. Throws PipeStopped when a
   * handler stops it, an Error when a handler fails.
   */
  async around(name, data, op, { caller = null } = {}) {
    const def = this.#events.get(name);
    if (!def) throw new Error(`Evento sconosciuto: ${name}`);
    const app = caller?.app ?? null;
    if (this.#active >= MAX_ACTIVE) throw new Error('Troppe operazioni in corso');
    if (app && (this.#byApp.get(app) ?? 0) >= MAX_PER_APP) throw new Error('Troppe operazioni in corso per questa app');
    this.#active++;
    if (app) this.#byApp.set(app, (this.#byApp.get(app) ?? 0) + 1);
    try {
      const before = this.#chainFor(name, 'before', data, caller);
      for (let i = 0; i < before.length; i++) data = await this.#step(def, 'before', before, i, data, caller);
      let result = await op(data);
      const after = this.#chainFor(name, 'after', result, caller).reverse();
      for (let i = 0; i < after.length; i++) result = await this.#step(def, 'after', after, i, result, caller);
      return result;
    } finally {
      this.#active--;
      if (app) {
        const n = this.#byApp.get(app) - 1;
        if (n > 0) this.#byApp.set(app, n); else this.#byApp.delete(app);
      }
    }
  }

  /** An event without an operation of its own (an app's event): the data, after both chains. */
  run(name, data, options) {
    return this.around(name, data, d => d, options);
  }

  /**
   * The before stage of a synchronous event: only lilOS's synchronous handlers. Returns the data
   * they left; throws PipeStopped if one stops it.
   */
  runSync(name, data, { caller = null } = {}) {
    const def = this.#events.get(name);
    if (!def) return data;
    const chain = this.#chainFor(name, 'before', data, caller);
    for (let i = 0; i < chain.length; i++) {
      const out = chain[i].handler(data, this.#ctx(def, 'before', chain, i, caller));
      if (out && typeof out.then === 'function') throw new Error(`${chain[i].name}: un’operazione immediata vuole una risposta immediata`);
      data = this.#apply(def, 'before', chain[i], data, out);
    }
    return data;
  }

  /**
   * The after stage of an event, only to look at it: nobody waits for the handlers, and what they
   * give back or throw changes nothing (an error is only logged).
   */
  notify(name, data, { caller = null } = {}) {
    const def = this.#events.get(name);
    if (!def) return;
    const chain = this.#chainFor(name, 'after', data, caller).reverse();
    chain.forEach((sub, i) => {
      Promise.resolve()
        .then(() => withTimeout(sub.handler(structuredCopy(forHandler(data, sub)), this.#ctx(def, 'after', chain, i, caller)), def.timeout, sub.name))
        .catch(err => console.warn(`[lilos] pipe ${name} (${sub.name}):`, err?.message ?? err));
    });
  }

  async #step(def, stage, chain, i, data, caller) {
    const sub = chain[i];
    let out;
    try {
      out = await withTimeout(sub.handler(forHandler(data, sub), this.#ctx(def, stage, chain, i, caller)), def.timeout, sub.name);
    } catch (err) {
      if (err instanceof PipeStopped) throw err;
      throw new Error(`${sub.name}: ${err?.message ?? err}`);
    }
    return this.#apply(def, stage, sub, data, out);
  }

  #apply(def, stage, sub, data, out) {
    if (!out || typeof out !== 'object') return data;
    if (out.stop) {
      if (!def.stop) throw new Error(`${sub.name}: l’evento ${def.name} non si può fermare`);
      const why = typeof out.stop === 'object' ? out.stop : {};
      throw new PipeStopped(typeof why.error === 'string' ? why.error.slice(0, 300) : '', { silent: why.silent === true });
    }
    if (!out.data || typeof out.data !== 'object') return data;
    const next = { ...data };
    for (const field of def.edit[stage]) if (Object.hasOwn(out.data, field)) next[field] = out.data[field];
    return def.check ? def.check(next, stage) : next;
  }

  #ctx(def, stage, chain, i, caller) {
    const who = s => (s ? (s.app ? { app: s.app, entry: s.entry, name: s.name } : { system: true, name: s.name }) : null);
    return { event: def.name, stage, position: i, total: chain.length, prev: who(chain[i - 1]), next: who(chain[i + 1]), caller: caller ? { ...caller } : null };
  }

  /** The handlers of an event and stage, in order (before order: the after stage runs it reversed). */
  #ordered(name, stage) {
    const all = storage.get(ORDER_KEY, {});
    const custom = all && typeof all === 'object' && Array.isArray(all[`${name}/${stage}`]) ? all[`${name}/${stage}`] : [];
    const rank = s => {
      const i = custom.indexOf(s.key);
      return i < 0 ? custom.length : i;
    };
    return [...this.#subs.values()]
      .filter(s => s.event === name && s.stage === stage)
      .sort((a, b) => BANDS.indexOf(a.position) - BANDS.indexOf(b.position) || rank(a) - rank(b) || a.seq - b.seq);
  }

  /** The handlers that run for this data: their where matches, and they are not the caller's own. */
  #chainFor(name, stage, data, caller) {
    return this.#ordered(name, stage).filter(s => !(caller?.app && s.app === caller.app) && matches(s, data) && !foreignContent(s, data));
  }
}

/** Checks a where filter; functions only from lilOS. */
function cleanWhere(where, trusted) {
  if (where == null) return null;
  if (typeof where === 'function') {
    if (!trusted) throw new Error('where: solo un oggetto');
    return where;
  }
  if (typeof where !== 'object' || Array.isArray(where)) throw new Error('where non valido');
  const out = {};
  for (const [k, v] of Object.entries(where)) {
    if (!WHERE_KEYS.has(k)) throw new Error(`where: ${k.slice(0, 30)} non si usa`);
    if (k === 'meta' && v !== 'own') throw new Error('where.meta: solo "own"');
    if (k === 'type' && !['file', 'folder', 'app'].includes(v)) throw new Error('where.type non valido');
    if ((k === 'ext' || k === 'app') && (!Array.isArray(v) || v.length > 50 || v.some(x => typeof x !== 'string' || x.length > 64))) throw new Error(`where.${k}: un elenco di testi`);
    out[k] = Array.isArray(v) ? v.map(x => (k === 'ext' ? x.toLowerCase() : x)) : v;
  }
  return out;
}

function matches(sub, data) {
  const w = sub.where;
  if (!w) return true;
  if (typeof w === 'function') {
    try { return !!w(data); } catch { return false; }
  }
  const node = data?.node;
  if (w.meta === 'own' && !(node?.apps && sub.app && Object.hasOwn(node.apps, sub.app))) return false;
  if (w.type && node?.type !== w.type) return false;
  if (w.ext && !(node?.type === 'file' && w.ext.includes(splitName(node.name)[1].toLowerCase()))) return false;
  if (w.app && !w.app.includes(data?.id)) return false;
  return true;
}

/** A content that belongs to another app (an encrypted file): not for this handler. */
function foreignContent(sub, data) {
  if (sub.trusted || !CONTENT_EVENTS.has(sub.event)) return false;
  return Object.entries(data?.node?.apps ?? {}).some(([id, v]) => v?.content === true && id !== sub.app);
}

/** The data as a handler sees it: of the apps' data on its nodes, only its own app's. */
function forHandler(data, sub) {
  if (sub.trusted || !data || typeof data !== 'object') return data;
  let out = data;
  for (const key of ['node', 'source']) {
    const n = data[key];
    if (!n || typeof n !== 'object' || !n.apps) continue;
    const { apps, ...rest } = n;
    if (out === data) out = { ...data };
    out[key] = sub.app && apps[sub.app] ? { ...rest, apps: { [sub.app]: apps[sub.app] } } : rest;
  }
  return out;
}

function withTimeout(value, ms, name) {
  if (!value || typeof value.then !== 'function') return value;
  let timer;
  return Promise.race([
    value,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${name} non ha risposto in tempo`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

/** What an observer gets is its own copy: it cannot change what others see. */
function structuredCopy(data) {
  try { return structuredClone(data); } catch { return data; }
}

export const pipes = new Pipes();
