import { Emitter } from './events.js';
import { storage, uid } from './storage.js';
import { splitName } from './fileTypes.js';
import { contents } from './db.js';

const STORAGE_KEY = 'fs';
const ROOT = 'root';
const TYPES = new Set(['folder', 'file', 'app']);
const MAX_NAME = 255;

/**
 * Virtual file system: a tree of folders, files and app shortcuts. The tree (names and metadata)
 * is persisted under 'lilos:fs'; file contents (text) live in IndexedDB, read and written with
 * the asynchronous read() / write().
 *
 *   Node: { id, type: 'folder' | 'file' | 'app', name, parent, created, modified,
 *           size?, color?, app?, system? }      size: bytes of the content (UTF-8)
 *
 * Names are unique inside a folder (case-insensitive): create() and rename() add a number
 * when needed. System nodes (system: true) cannot be renamed or removed.
 * Every getter returns copies: change the tree only through the methods.
 *
 * Events: 'change' { type: 'create' | 'rename' | 'update' | 'remove', node, parent, ids? }
 *   (ids: every node removed, subtree included)
 */
class FileSystem extends Emitter {
  #nodes = new Map();

  /** False when nothing was stored yet (first start): the system seeds the tree. */
  loaded = false;

  constructor() {
    super();
    this.#load(storage.get(STORAGE_KEY));
    // Contents whose node is gone (deleted, or the tree was reset): clean up after start-up
    setTimeout(() => this.#collectContents(), 3000);
  }

  get root() { return ROOT; }

  get(id) {
    const node = this.#nodes.get(id);
    return node ? { ...node } : null;
  }

  exists(id) {
    return this.#nodes.has(id);
  }

  /** Direct children of a folder, in creation order. */
  children(id) {
    return [...this.#nodes.values()].filter(n => n.parent === id).map(n => ({ ...n }));
  }

  /** Folders from the root down to the node itself. */
  ancestors(id) {
    const chain = [];
    for (let n = this.#nodes.get(id); n; n = this.#nodes.get(n.parent)) chain.unshift({ ...n });
    return chain;
  }

  /** '/Scrivania/Progetti' ('/' for the root). */
  path(id) {
    const names = this.ancestors(id).slice(1).map(n => n.name);
    return '/' + names.join('/');
  }

  /** Node at a path ('/Documenti/Note'), or null. Case-insensitive like names. */
  resolve(path) {
    let node = this.#nodes.get(ROOT);
    for (const part of String(path).split('/').filter(Boolean)) {
      node = [...this.#nodes.values()].find(n => n.parent === node.id && n.name.toLowerCase() === part.toLowerCase());
      if (!node) return null;
    }
    return { ...node };
  }

  /** True if `id` is `ancestorId` or inside it. */
  isInside(id, ancestorId) {
    return this.ancestors(id).some(n => n.id === ancestorId);
  }

  /** Number of nodes inside a folder, at any depth. */
  count(id) {
    let total = 0;
    for (const child of this.children(id)) total += 1 + (child.type === 'folder' ? this.count(child.id) : 0);
    return total;
  }

  /** `name`, or `name 2`, `name 3`… (before the extension) if taken in the folder. */
  uniqueName(parentId, name, exceptId = null) {
    const taken = new Set(this.children(parentId).filter(n => n.id !== exceptId).map(n => n.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    const [base, ext] = splitName(name);
    for (let n = 2; ; n++) {
      const candidate = ext ? `${base} ${n}.${ext}` : `${base} ${n}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  create(parentId, { type, name, color, app, size, system = false, id } = {}) {
    const parent = this.#nodes.get(parentId);
    if (!parent || parent.type !== 'folder') throw new Error('La cartella di destinazione non esiste');
    if (!TYPES.has(type)) throw new Error(`Tipo non valido: ${type}`);
    if (id != null && (typeof id !== 'string' || this.#nodes.has(id))) throw new Error('Identificatore non valido');
    const now = Date.now();
    const node = {
      id: id ?? uid(), type, name: this.uniqueName(parentId, checkName(name)), parent: parentId,
      created: now, modified: now,
      ...(type === 'file' && { size: Number.isFinite(size) && size >= 0 ? size : 0 }),
      ...(type === 'folder' && typeof color === 'string' && { color }),
      ...(type === 'app' && { app: String(app ?? '') }),
      ...(system && { system: true }),
    };
    this.#nodes.set(node.id, node);
    this.#touch(parentId, now);
    this.#save();
    this.emit('change', { type: 'create', node: { ...node }, parent: parentId });
    return { ...node };
  }

  /** Renames and returns the final (unique) name. */
  rename(id, name) {
    const node = this.#editable(id);
    const unique = this.uniqueName(node.parent, checkName(name), id);
    if (unique === node.name) return unique;
    node.name = unique;
    node.modified = Date.now();
    this.#save();
    this.emit('change', { type: 'rename', node: { ...node }, parent: node.parent });
    return unique;
  }

  /** Change metadata that is not the name (e.g. a folder's color). */
  update(id, { color } = {}) {
    const node = this.#nodes.get(id);
    if (!node) throw new Error('Elemento inesistente');
    if (node.type === 'folder' && typeof color === 'string') node.color = color;
    this.#save();
    this.emit('change', { type: 'update', node: { ...node }, parent: node.parent });
  }

  /** Text content of a file ('' if it has none yet). */
  async read(id) {
    const node = this.#nodes.get(id);
    if (!node || node.type !== 'file') throw new Error('Il file non esiste');
    const text = await contents.get(id);
    return typeof text === 'string' ? text : '';
  }

  /** Saves the text content of a file; updates size and modification date ('update' event). */
  async write(id, text) {
    const node = this.#nodes.get(id);
    if (!node || node.type !== 'file') throw new Error('Il file non esiste');
    const value = String(text);
    await contents.set(id, value);
    if (!this.#nodes.has(id)) return;   // removed while saving
    node.size = new TextEncoder().encode(value).length;
    node.modified = Date.now();
    this.#touch(node.parent, node.modified);
    this.#save();
    this.emit('change', { type: 'update', node: { ...node }, parent: node.parent });
  }

  /** Removes the node and, for folders, everything inside it. Permanent. */
  remove(id) {
    const node = this.#editable(id);
    const ids = [id, ...this.#descendants(id)];
    if (ids.some(i => this.#nodes.get(i).system)) throw new Error('Contiene cartelle di sistema');
    ids.forEach(i => this.#nodes.delete(i));
    ids.forEach(i => contents.delete(i));
    this.#touch(node.parent, Date.now());
    this.#save();
    this.emit('change', { type: 'remove', node: { ...node }, parent: node.parent, ids });
  }

  // ---------- Internals ----------

  #editable(id) {
    const node = this.#nodes.get(id);
    if (!node) throw new Error('Elemento inesistente');
    if (node.system || id === ROOT) throw new Error('Gli elementi di sistema non si possono modificare');
    return node;
  }

  #descendants(id) {
    return this.children(id).flatMap(c => [c.id, ...this.#descendants(c.id)]);
  }

  async #collectContents() {
    for (const key of (await contents.keys()) ?? []) {
      if (!this.#nodes.has(key)) await contents.delete(key);
    }
  }

  #touch(id, time) {
    const node = this.#nodes.get(id);
    if (node) node.modified = time;
  }

  #save() {
    storage.set(STORAGE_KEY, [...this.#nodes.values()]);
  }

  /** Stored data is untrusted: keep only well-formed nodes reachable from the root. */
  #load(data) {
    const now = Date.now();
    this.#nodes.set(ROOT, { id: ROOT, type: 'folder', name: '', parent: null, created: now, modified: now, system: true });
    if (!Array.isArray(data)) return;
    this.loaded = true;

    const byId = new Map();
    for (const n of data) {
      if (!n || typeof n !== 'object' || typeof n.id !== 'string' || n.id === ROOT || byId.has(n.id)) continue;
      if (!TYPES.has(n.type) || typeof n.parent !== 'string' || !validName(n.name)) continue;
      byId.set(n.id, n);
    }
    // Breadth-first from the root: orphans and cycles are dropped
    const queue = [ROOT];
    while (queue.length) {
      const parentId = queue.shift();
      const names = new Set();
      for (const n of byId.values()) {
        if (n.parent !== parentId || this.#nodes.has(n.id) || names.has(n.name.toLowerCase())) continue;
        names.add(n.name.toLowerCase());
        const time = v => (Number.isFinite(v) ? v : now);
        this.#nodes.set(n.id, {
          id: n.id, type: n.type, name: n.name, parent: parentId, created: time(n.created), modified: time(n.modified),
          ...(n.type === 'file' && { size: Number.isFinite(n.size) && n.size >= 0 ? n.size : 0 }),
          ...(n.type === 'folder' && typeof n.color === 'string' && { color: n.color }),
          ...(n.type === 'app' && { app: String(n.app ?? '') }),
          ...(n.system === true && { system: true }),
        });
        if (n.type === 'folder') queue.push(n.id);
      }
    }
  }
}

function validName(name) {
  return typeof name === 'string' && name.trim() === name && name.length > 0 && name.length <= MAX_NAME && !name.includes('/');
}

function checkName(name) {
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim().replaceAll('/', '-').slice(0, MAX_NAME);
  if (!clean) throw new Error('Il nome non può essere vuoto');
  return clean;
}

export const fs = new FileSystem();
