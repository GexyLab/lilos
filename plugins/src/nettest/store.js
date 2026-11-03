import { Emitter, fs, storage } from '@lilos/sdk';
import { parseCollection, collectionText, newCollection, EXT } from './model.js';
import { t } from './i18n.js';

/**
 * What every NetTest window shares (one per lilOS page): the collections open in the sidebar, the
 * history, the global variables, the environment chosen for each collection.
 *
 *   «Le mie richieste» (key 'mine') lives in the app's storage, always there, saved by itself;
 *   the others are .nettest files of the home (key: the file's id), saved with Salva (Ctrl+S) like
 *   a document: `dirty` until then.
 *
 * Storage keys: nettest.mine (a collection), nettest.open ([file id]), nettest.history ([entry]),
 * nettest.globals ([{ key, value }]), nettest.env ({ key: environment id }), nettest.cookies
 * ({ host: { name: { value, path, expires } } }).
 * Events: 'collections' (opened, closed, renamed, saved), 'change' (key) the content of one changed,
 * 'history', 'globals', 'env'.
 */
const MINE = 'mine';
const MAX_HISTORY = 200;
const keys = { mine: 'nettest.mine', open: 'nettest.open', history: 'nettest.history', globals: 'nettest.globals', env: 'nettest.env', cookies: 'nettest.cookies' };

class Store extends Emitter {
  /** key → { key, file, data, dirty } */
  collections = new Map();
  #loaded = false;
  #saveMine = 0;

  load() {
    if (this.#loaded) return;
    this.#loaded = true;
    let mine = null;
    try { mine = storage.get(keys.mine, null) ? parseCollection(JSON.stringify(storage.get(keys.mine))) : null; } catch { mine = null; }
    this.collections.set(MINE, { key: MINE, file: null, data: mine ?? newCollection(t('mine.name')), dirty: false });
    for (const id of storage.get(keys.open, [])) if (typeof id === 'string') this.openFile(id, { quiet: true }).catch(() => {});
    fs.on('change', e => {
      if (e.type === 'remove') for (const id of e.ids ?? [e.node?.id]) if (this.collections.has(id)) this.close(id);
      if (e.type === 'rename' && this.collections.has(e.node?.id)) this.emit('collections');
    });
  }

  get list() { return [...this.collections.values()]; }
  get(key) { return this.collections.get(key) ?? null; }
  nameOf(entry) { return entry.key === MINE ? t('mine.name') : entry.data.name || fs.get(entry.file)?.name.replace(/\.nettest$/i, '') || '—'; }

  #remember() {
    storage.set(keys.open, this.list.filter(c => c.file).map(c => c.file));
  }

  /** Opens a .nettest file (already open: that one). */
  async openFile(id, { quiet = false } = {}) {
    if (this.collections.has(id)) return this.collections.get(id);
    const node = fs.get(id);
    if (node?.type !== 'file') throw new Error(t('file.missing'));
    let data;
    try {
      data = parseCollection(await fs.read(id));
    } catch (err) {
      throw new Error(t(err.message.startsWith('file.') ? err.message : 'file.invalid', { name: node.name }));
    }
    if (!data.name) data.name = node.name.replace(/\.nettest$/i, '');
    const entry = { key: id, file: id, data, dirty: false };
    this.collections.set(id, entry);
    this.#remember();
    if (!quiet) this.emit('collections');
    else queueMicrotask(() => this.emit('collections'));
    return entry;
  }

  /** A new collection in a file of `folder`, named after it. */
  async createFile(folder, name, data = newCollection(name)) {
    const clean = fs.cleanName(name, { portable: true }).slice(0, 80).trim() || 'NetTest';
    const node = fs.create(folder, { type: 'file', name: `${clean}.${EXT}` });
    data.name ||= clean;
    await fs.write(node.id, collectionText(data));
    const entry = { key: node.id, file: node.id, data, dirty: false };
    this.collections.set(node.id, entry);
    this.#remember();
    this.emit('collections');
    return entry;
  }

  close(key) {
    if (key === MINE) return;
    this.collections.delete(key);
    this.#remember();
    this.emit('collections');
  }

  /** The content of a collection changed: «mine» is saved a moment later, a file becomes dirty. */
  touch(key) {
    const entry = this.collections.get(key);
    if (!entry) return;
    if (key === MINE) {
      clearTimeout(this.#saveMine);
      this.#saveMine = setTimeout(() => storage.set(keys.mine, JSON.parse(collectionText(entry.data))), 400);
    } else if (!entry.dirty) {
      entry.dirty = true;
      this.emit('collections');
    }
    this.emit('change', key);
  }

  async save(key) {
    const entry = this.collections.get(key);
    if (!entry) return;
    if (!entry.file) return this.touch(key);
    if (!fs.get(entry.file)) throw new Error(t('file.missing'));
    await fs.write(entry.file, collectionText(entry.data));
    entry.dirty = false;
    this.emit('collections');
  }

  /** A copy of a collection in a new file (Salva con nome, or «mine» exported). */
  async saveAs(key, folder, name) {
    const entry = this.collections.get(key);
    const data = structuredClone(entry.data);
    data.name = name;
    return this.createFile(folder, name, data);
  }

  // ---------- History, globals, environments, cookies ----------

  get history() { const h = storage.get(keys.history, []); return Array.isArray(h) ? h : []; }

  addHistory(entry) {
    storage.set(keys.history, [entry, ...this.history].slice(0, MAX_HISTORY));
    this.emit('history');
  }

  clearHistory() {
    storage.set(keys.history, []);
    this.emit('history');
  }

  get globals() { const g = storage.get(keys.globals, []); return Array.isArray(g) ? g : []; }

  setGlobals(rows) {
    storage.set(keys.globals, rows.map(r => ({ key: String(r.key ?? ''), value: String(r.value ?? ''), enabled: r.enabled !== false })));
    this.emit('globals');
  }

  /** The environment chosen for a collection (an id of its environments), or null. */
  envId(key) {
    const id = storage.get(keys.env, {})?.[key] ?? null;
    return this.get(key)?.data.environments.some(e => e.id === id) ? id : null;
  }

  env(key) {
    const id = this.envId(key);
    return id ? this.get(key).data.environments.find(e => e.id === id) : null;
  }

  setEnv(key, id) {
    storage.set(keys.env, { ...storage.get(keys.env, {}), [key]: id });
    this.emit('env', key);
  }

  get cookies() { const c = storage.get(keys.cookies, {}); return c && typeof c === 'object' ? c : {}; }
  setCookies(jar) { storage.set(keys.cookies, jar); this.emit('cookies'); }
}

export const MINE_KEY = MINE;
export const store = new Store();
