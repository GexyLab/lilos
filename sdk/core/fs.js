import { Emitter } from './events.js';
import { storage, uid } from './storage.js';
import { splitName } from './fileTypes.js';
import { contents } from './db.js';
import { kernel } from './kernel.js';

const STORAGE_KEY = 'fs';
const ROOT = 'root';
const TRASH = 'trash';
const TYPES = new Set(['folder', 'file', 'app']);
const MAX_NAME = 255;
const WORKSPACE_ID = /^[\w-]{1,40}$/;
const TAG_ID = /^[\w-]{1,40}$/;
const MAX_TAGS = 30;   // per node
/** Type of the Blob readBlob() gives, by extension. */
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
  avif: 'image/avif', ico: 'image/x-icon', svg: 'image/svg+xml', pdf: 'application/pdf', json: 'application/json',
  txt: 'text/plain', md: 'text/markdown', html: 'text/html', css: 'text/css', js: 'text/javascript',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4', webm: 'video/webm',
};

/**
 * Virtual file system: a tree of folders, files and app shortcuts, kept whole in memory. Connected
 * to the kernel, the tree is the user's home: loaded at start-up and kept in sync by differences
 * (only the nodes that changed are sent, a moment later); file contents are read and written
 * there with the asynchronous read() / write(). Without the kernel the tree is saved under
 * 'lilos:fs' and the contents in IndexedDB. A content is text or bytes (an image): write() takes
 * either, read() gives text, readBlob() bytes.
 *
 *   Node: { id, type: 'folder' | 'file' | 'app', name, parent, created, modified,
 *           size?, color?, app?, system?, workspace?, private?, tags? }   size: bytes of the content
 *
 * Names are unique inside a folder (case-insensitive): create() and rename() add a number
 * when needed. System nodes (system: true) cannot be renamed or removed.
 * Every getter returns copies: change the tree only through the methods.
 *
 * Workspaces (set by the system with setWorkspace): every node created while a workspace is set
 * keeps its id in `workspace` (the owner; moving or renaming does not change it). A folder with
 * `private: true` (a workspace's desk) is seen, with everything inside it, only while its own
 * workspace is set: for the others it does not exist (get, exists, children, resolve… and every
 * change). Two private folders of different workspaces can have the same name in the same parent.
 * With no workspace set everything is visible.
 *
 * Events: 'change' { type: 'create' | 'rename' | 'update' | 'move' | 'remove', node, parent, from?, ids? }
 *   (remove: ids = every node removed, subtree included; move: from = old parent, ids = the moved subtree)
 *   'scope' (workspace id): what is visible changed (another workspace, or hidden tags) — views
 *   read the tree again
 *
 * Tags: `tags` holds ids of tags defined with the SDK's `tags` (setTags, tagged, dropTag). Nodes
 * with a hidden tag (setHiddenTags) are left out of children() but still exist: tagged() finds them.
 *
 * snapshot() + restore() put removed nodes back as they were (same ids, contents included):
 * that is how deleting is undone.
 *
 * Trash: trash() moves nodes, with what they contain, under a second, hidden root. For every
 * other method they no longer exist (a 'remove' event with `trashed: true` is emitted); trashed()
 * lists them, untrash() puts them back where they were (a 'create' for each node), purge() and
 * purgeTrash() delete them for good. Items trashed from a private folder are seen in the trash
 * only from that workspace. Event 'trash': what the trash holds changed.
 *   Trashed item: node + trashed: { at, from, scope? }   from: the parent it left; scope: the workspace
 */
class FileSystem extends Emitter {
  #nodes = new Map();
  #workspace = null;
  #hiddenTags = new Set();

  /** False when nothing was stored yet (first start): the system seeds the tree. */
  loaded = false;

  /** Connected to the kernel: sends the nodes that changed. */
  #tracker = null;

  constructor() {
    super();
    if (kernel.connected) {
      this.#load(kernel.data.nodes);
      this.loaded = !kernel.data.fresh;
      const read = () => new Map([...this.#nodes].filter(([id]) => id !== ROOT && id !== TRASH));
      this.#tracker = kernel.track('fs', {
        read,
        send: (set, remove, options) => this.#send(set.map(([, n]) => n), remove, options),
      });
      this.#tracker.reset();   // what was just loaded is what the kernel has
    } else {
      this.#load(storage.get(STORAGE_KEY));
      // Contents whose node is gone (deleted, or the tree was reset): clean up after start-up
      setTimeout(() => this.#collectContents(), 3000);
    }
  }

  get root() { return ROOT; }

  /** Id of the hidden root that holds the trashed nodes (never visible through get, children…). */
  get trashRoot() { return TRASH; }

  /** The workspace whose private folders are visible and that owns new nodes (null: none). */
  get workspace() { return this.#workspace; }

  /** Set by the system when the user changes workspace. Emits 'scope'. */
  setWorkspace(id) {
    if (id != null && !validWorkspace(id)) throw new Error('Workspace non valido');
    if ((id ?? null) === this.#workspace) return;
    this.#workspace = id ?? null;
    this.emit('scope', this.#workspace);
  }

  get(id) {
    const node = this.#find(id);
    return node ? copy(node) : null;
  }

  exists(id) {
    return !!this.#find(id);
  }

  /** Direct children of a folder, in creation order. */
  children(id) {
    if (!this.#find(id)) return [];
    return [...this.#nodes.values()].filter(n => n.parent === id && this.#visible(n) && !this.#concealed(n)).map(copy);
  }

  /** Folders from the root down to the node itself. */
  ancestors(id) {
    const chain = [];
    if (!this.#find(id)) return chain;
    for (let n = this.#nodes.get(id); n; n = this.#nodes.get(n.parent)) chain.unshift(copy(n));
    return chain;
  }

  /**
   * Path of the root, the user's home: '/home/<user>' connected to the kernel (as the kernel's file
   * system has it), '~' without.
   */
  get home() {
    const path = kernel.connected && kernel.data.home;
    return typeof path === 'string' && path.startsWith('/') ? path.replace(/\/+$/, '') : '~';
  }

  /** '/home/eugenio/Documenti/Note' (home for the root). */
  path(id) {
    return [this.home, ...this.ancestors(id).slice(1).map(n => n.name)].join('/');
  }

  /**
   * Node at a path, or null. Case-insensitive like names. The path starts at the home
   * ('/home/eugenio/Documenti/Note', as path() gives it), at '~' ('~/Documenti/Note') or, without
   * either, in the home all the same ('/Documenti/Note').
   */
  resolve(path) {
    path = String(path);
    const lower = path.toLowerCase(), home = this.home.toLowerCase();
    if (lower === home || lower.startsWith(home + '/')) path = path.slice(home.length);
    else if (path === '~' || path.startsWith('~/')) path = path.slice(1);
    let node = this.#nodes.get(ROOT);
    for (const part of path.split('/').filter(Boolean)) {
      node = [...this.#nodes.values()].find(n => n.parent === node.id && n.name.toLowerCase() === part.toLowerCase() && this.#visible(n));
      if (!node) return null;
    }
    return copy(node);
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
    return this.#unique(parentId, name, exceptId, null);
  }

  /**
   * New node. `workspace` is the owner: the current workspace by default (shared system folders
   * have none). `private: true` makes a folder visible only in its owner workspace.
   */
  create(parentId, { type, name, color, app, size, system = false, id, workspace, private: own = false } = {}) {
    const parent = this.#find(parentId);
    if (!parent || parent.type !== 'folder') throw new Error('La cartella di destinazione non esiste');
    if (!TYPES.has(type)) throw new Error(`Tipo non valido: ${type}`);
    if (id != null && (typeof id !== 'string' || this.#nodes.has(id))) throw new Error('Identificatore non valido');
    const owner = workspace !== undefined ? workspace : system && !own ? null : this.#workspace;
    if (owner != null && !validWorkspace(owner)) throw new Error('Workspace non valido');
    if (own && (type !== 'folder' || !owner)) throw new Error('Solo una cartella con un workspace può essere privata');
    const now = Date.now();
    const node = {
      id: id ?? uid(), type, name: '', parent: parentId,
      created: now, modified: now,
      ...(type === 'file' && { size: Number.isFinite(size) && size >= 0 ? size : 0 }),
      ...(type === 'folder' && typeof color === 'string' && { color }),
      ...(type === 'app' && { app: String(app ?? '') }),
      ...(system && { system: true }),
      ...(owner && { workspace: owner }),
      ...(own && { private: true }),
    };
    node.name = this.#unique(parentId, checkName(name), null, node);
    this.#nodes.set(node.id, node);
    this.#touch(parentId, now);
    this.#save();
    this.emit('change', { type: 'create', node: copy(node), parent: parentId });
    return copy(node);
  }

  /** Renames and returns the final (unique) name. */
  rename(id, name) {
    const node = this.#editable(id);
    const unique = this.#unique(node.parent, checkName(name), id, node);
    if (unique === node.name) return unique;
    node.name = unique;
    node.modified = Date.now();
    this.#save();
    this.emit('change', { type: 'rename', node: copy(node), parent: node.parent });
    return unique;
  }

  /** Change metadata that is not the name (e.g. a folder's color). */
  update(id, { color } = {}) {
    const node = this.#find(id);
    if (!node) throw new Error('Elemento inesistente');
    if (node.type === 'folder' && typeof color === 'string') node.color = color;
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
  }

  /** Text content of a file ('' if it has none yet). */
  async read(id) {
    const node = this.#find(id);
    if (!node || node.type !== 'file') throw new Error('Il file non esiste');
    await this.#tracker?.flush();   // a file just created must exist in the kernel
    const text = await contents.get(id);
    return typeof text === 'string' ? text : '';
  }

  /**
   * Content of a file as bytes: a Blob (empty if it has none yet), typed from the file's
   * extension ('image/png' for a .png…) unless `type` is given.
   */
  async readBlob(id, { type } = {}) {
    const node = this.#find(id);
    if (!node || node.type !== 'file') throw new Error('Il file non esiste');
    await this.#tracker?.flush();
    const blob = (await contents.getBlob(id)) ?? new Blob([]);
    return new Blob([blob], { type: type ?? MIME[splitName(node.name)[1].toLowerCase()] ?? '' });
  }

  /**
   * Saves the content of a file: text (a string), or bytes (a Blob, an ArrayBuffer or a typed
   * array). Updates size and modification date ('update' event).
   */
  async write(id, data) {
    const node = this.#find(id);
    if (!node || node.type !== 'file') throw new Error('Il file non esiste');
    const value = data instanceof Blob ? data : data instanceof ArrayBuffer || ArrayBuffer.isView(data) ? new Blob([data]) : String(data);
    await this.#tracker?.flush();
    await contents.set(id, value);
    if (!this.#nodes.has(id)) return;   // removed while saving
    node.size = value instanceof Blob ? value.size : new TextEncoder().encode(value).length;
    node.modified = Date.now();
    this.#touch(node.parent, node.modified);
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
  }

  /**
   * Moves a node (with its content) into another folder; the name is made unique there.
   * Returns the final name. A folder cannot go inside itself; system nodes do not move.
   */
  move(id, parentId) {
    const node = this.#editable(id);
    const target = this.#find(parentId);
    if (!target || target.type !== 'folder') throw new Error('La cartella di destinazione non esiste');
    if (this.isInside(parentId, id)) throw new Error('Una cartella non può andare dentro se stessa');
    if (node.parent === parentId) return node.name;
    const from = node.parent;
    node.name = this.#unique(parentId, node.name, id, node);
    node.parent = parentId;
    const now = Date.now();
    this.#touch(from, now);
    this.#touch(parentId, now);
    this.#save();
    this.emit('change', { type: 'move', node: copy(node), parent: parentId, from, ids: [id, ...this.#descendants(id)] });
    return node.name;
  }

  /**
   * Copy of nodes with everything inside them and the contents of their files, to put them back
   * later with restore(). Take it before removing: removing deletes the contents.
   */
  async snapshot(ids) {
    const nodes = [];
    for (const id of ids) {
      if (!this.#find(id) || nodes.some(n => n.id === id)) continue;
      for (const i of [id, ...this.#descendants(id)]) nodes.push(copy(this.#nodes.get(i)));
    }
    // As bytes: text and images come back exactly as they were
    const data = {};
    for (const n of nodes) {
      if (n.type !== 'file') continue;
      const blob = await contents.getBlob(n.id);
      if (blob instanceof Blob) data[n.id] = blob;
    }
    return { nodes, contents: data };
  }

  /**
   * Puts back what snapshot() copied: same ids, names (made unique if taken meanwhile), metadata
   * (owner workspace included) and contents. Nodes whose folder is gone, or not visible from the
   * current workspace, are skipped, so are ids that exist again.
   * Emits a 'create' for each node put back. Resolves with the ids restored.
   */
  async restore({ nodes, contents: data = {} }) {
    const restored = [];
    for (const n of nodes) {
      const parent = this.#find(n.parent);
      if (this.#nodes.has(n.id) || !parent || parent.type !== 'folder') continue;
      const node = { ...copy(n), name: this.#unique(n.parent, n.name, null, n) };
      this.#nodes.set(node.id, node);
      restored.push(node);
    }
    if (!restored.length) return [];
    this.#touch(restored[0].parent, Date.now());
    this.#save();
    for (const node of restored) this.emit('change', { type: 'create', node: copy(node), parent: node.parent });
    await this.#tracker?.flush();
    for (const node of restored) {
      const value = data[node.id];
      if (node.type === 'file' && (typeof value === 'string' || value instanceof Blob)) await contents.set(node.id, value);
    }
    return restored.map(n => n.id);
  }

  /** Removes the node and, for folders, everything inside it (contents too: see snapshot()). */
  remove(id) {
    const node = this.#editable(id);
    const ids = [id, ...this.#descendants(id)];
    if (ids.some(i => this.#nodes.get(i).system)) throw new Error('Contiene cartelle di sistema');
    ids.forEach(i => this.#nodes.delete(i));
    ids.forEach(i => contents.delete(i));
    this.#touch(node.parent, Date.now());
    this.#save();
    this.emit('change', { type: 'remove', node: copy(node), parent: node.parent, ids });
  }

  /**
   * Deletes every node, system folders and trashed items included, with their contents, without
   * events: for the system's reset, which reloads lilOS after it (the tree is seeded again).
   * Resolves once saved.
   */
  async reset() {
    for (const id of [...this.#nodes.keys()]) {
      if (id === ROOT || id === TRASH) continue;
      this.#nodes.delete(id);
      contents.delete(id);
    }
    if (this.#tracker) await this.#tracker.flush();
    else storage.remove(STORAGE_KEY);
  }

  // ---------- Trash ----------

  /**
   * Moves nodes (with everything inside them) to the trash; system nodes, and folders with system
   * nodes inside, are skipped. Returns the ids trashed.
   */
  trash(ids) {
    const done = [];
    const at = Date.now();
    for (const id of ids) {
      const node = this.#find(id);
      if (!node || node.system || done.includes(id)) continue;
      const inside = this.#descendants(id);
      if (inside.some(i => this.#nodes.get(i).system)) continue;
      const from = node.parent;
      const scope = this.ancestors(from).reverse().find(n => n.private)?.workspace;
      node.parent = TRASH;
      node.trashed = { at, from, ...(scope && { scope }) };
      this.#touch(from, at);
      done.push(id);
      this.emit('change', { type: 'remove', node: { ...node, parent: from }, parent: from, ids: [id, ...inside], trashed: true });
    }
    if (done.length) {
      this.#save();
      this.emit('trash');
    }
    return done;
  }

  /**
   * What is in the trash and can be seen from the current workspace, newest first. Each item:
   * the node with `trashed`, `inside` (how many nodes it contains) and `bytes` (its files, inside included).
   */
  trashed() {
    return [...this.#nodes.values()]
      .filter(n => n.parent === TRASH && this.#trashVisible(n))
      .map(n => {
        const inside = this.#descendants(n.id).map(i => this.#nodes.get(i));
        const bytes = [n, ...inside].reduce((sum, x) => sum + (x.size ?? 0), 0);
        return { ...copy(n), trashed: { ...n.trashed }, inside: inside.length, bytes };
      })
      .sort((a, b) => b.trashed.at - a.trashed.at);
  }

  /**
   * Puts trashed nodes back into the folder they came from (if it is gone or cannot be seen, into
   * the root), with a unique name. Returns [{ id, parent }] for each one put back.
   */
  untrash(ids) {
    const restored = [];
    for (const id of ids) {
      const node = this.#nodes.get(id);
      if (node?.parent !== TRASH || !this.#trashVisible(node)) continue;
      const back = this.#find(node.trashed.from);
      const parent = back?.type === 'folder' ? back.id : ROOT;
      delete node.trashed;
      node.parent = parent;
      node.name = this.#unique(parent, node.name, id, node);
      this.#touch(parent, Date.now());
      restored.push({ id, parent });
    }
    if (!restored.length) return [];
    this.#save();
    for (const { id } of restored) {
      for (const i of [id, ...this.#descendants(id)]) {
        const node = this.#nodes.get(i);
        this.emit('change', { type: 'create', node: copy(node), parent: node.parent });
      }
    }
    this.emit('trash');
    return restored;
  }

  /** Deletes trashed nodes for good, contents included. Returns how many trashed items went. */
  purge(ids) {
    return this.#purge(ids.filter(id => {
      const node = this.#nodes.get(id);
      return node?.parent === TRASH && this.#trashVisible(node);
    }));
  }

  /**
   * Deletes for good what was trashed before `time`, whatever workspace it came from; with no
   * time, everything the current workspace sees (emptying the trash). Returns how many items went.
   */
  purgeTrash(time = null) {
    return this.#purge([...this.#nodes.values()]
      .filter(n => n.parent === TRASH && (time == null ? this.#trashVisible(n) : n.trashed.at < time))
      .map(n => n.id));
  }

  /** Items trashed from the private folders of a workspace become visible from every workspace. */
  unscopeTrash(workspaceId) {
    let changed = false;
    for (const node of this.#nodes.values()) {
      if (node.parent !== TRASH || node.trashed.scope !== workspaceId) continue;
      delete node.trashed.scope;
      changed = true;
    }
    if (!changed) return;
    this.#save();
    this.emit('trash');
  }

  // ---------- Tags ----------

  /**
   * Sets the tags of a node: ids of tags defined with the SDK's `tags` (order kept, duplicates
   * and invalid ids dropped, at most 30). System nodes have no tags. Emits an 'update' change.
   */
  setTags(id, tagIds) {
    const node = this.#editable(id);
    const clean = cleanTags(tagIds);
    if (clean.join() === (node.tags ?? []).join()) return;
    if (clean.length) node.tags = clean;
    else delete node.tags;
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
  }

  /**
   * Every node with the tag, anywhere the current workspace can see (not in the trash), the ones
   * hidden by a tag included: that is how hidden items are found again.
   */
  tagged(tagId) {
    return [...this.#nodes.values()].filter(n => n.tags?.includes(tagId) && this.#visible(n)).map(copy);
  }

  /** Takes a tag off every node, trash included (the tag is being deleted). Returns how many changed. */
  dropTag(tagId) {
    const changed = [...this.#nodes.values()].filter(n => n.tags?.includes(tagId));
    for (const node of changed) {
      node.tags = node.tags.filter(t => t !== tagId);
      if (!node.tags.length) delete node.tags;
    }
    if (!changed.length) return 0;
    this.#save();
    changed.filter(n => this.#visible(n)).forEach(node => this.emit('change', { type: 'update', node: copy(node), parent: node.parent }));
    return changed.length;
  }

  /** Tags whose nodes are hidden (set by the system from the invisible tags). */
  get hiddenTags() { return [...this.#hiddenTags]; }

  /**
   * Nodes with one of these tags are left out of children() — so out of the desk, File and every
   * list — but get(), exists(), resolve() and tagged() still find them. Emits 'scope'.
   */
  setHiddenTags(tagIds) {
    const next = new Set(cleanTags(tagIds, Infinity));
    if (next.size === this.#hiddenTags.size && [...next].every(t => this.#hiddenTags.has(t))) return;
    this.#hiddenTags = next;
    this.emit('scope', this.#workspace);
  }

  /** True if the node exists and one of its tags is hidden. */
  isHidden(id) {
    const node = this.#find(id);
    return !!node && this.#concealed(node);
  }

  // ---------- Workspaces (used by the system) ----------

  /**
   * Gives an owner to every node that has none, except the system ones (nodes made before
   * workspaces existed). Returns how many changed.
   */
  claim(workspaceId) {
    if (!validWorkspace(workspaceId)) throw new Error('Workspace non valido');
    let count = 0;
    for (const node of this.#nodes.values()) {
      if (node.system || node.workspace) continue;
      node.workspace = workspaceId;
      count++;
    }
    if (count) this.#save();
    return count;
  }

  /** How many nodes a workspace owns, wherever they are (its private desk included, even unseen). */
  ownedCount(workspaceId) {
    let count = 0;
    for (const node of this.#nodes.values()) if (node.workspace === workspaceId && !node.private && !this.#inTrash(node)) count++;
    return count;
  }

  /** Makes a folder private to a workspace, which becomes its owner. Its name is made unique if needed. */
  makePrivate(id, workspaceId) {
    const node = this.#nodes.get(id);
    if (!node || id === ROOT || node.type !== 'folder') throw new Error('Cartella inesistente');
    if (!validWorkspace(workspaceId)) throw new Error('Workspace non valido');
    Object.assign(node, { workspace: workspaceId, private: true });
    node.name = this.#unique(node.parent, node.name, id, node);
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
  }

  /**
   * A private folder becomes an ordinary shared one (not system; the owner stays) and moves into
   * `parentId` with `name`: the desk of a workspace being deleted. Works whatever workspace is set.
   * Returns the final name.
   */
  share(id, parentId, name) {
    const node = this.#nodes.get(id);
    const target = this.#find(parentId);
    if (!node?.private) throw new Error('La cartella non è privata');
    if (!target || target.type !== 'folder' || target.id === id || this.#descendants(id).includes(parentId)) {
      throw new Error('La cartella di destinazione non esiste');
    }
    const from = node.parent;
    delete node.private;
    delete node.system;
    node.parent = parentId;
    node.name = this.#unique(parentId, checkName(name), id, node);
    const now = Date.now();
    this.#touch(from, now);
    this.#touch(parentId, now);
    this.#save();
    this.emit('change', { type: 'move', node: copy(node), parent: parentId, from, ids: [id, ...this.#descendants(id)] });
    return node.name;
  }

  // ---------- Internals ----------

  /** The node, if it exists and the current workspace can see it. */
  #find(id) {
    const node = this.#nodes.get(id);
    return node && this.#visible(node) ? node : null;
  }

  /** False if the node is in the trash, or is (or is inside) a private folder of another workspace. */
  #visible(node) {
    for (let n = node; n; n = this.#nodes.get(n.parent)) {
      if (n.id === TRASH) return false;
      if (this.#workspace && n.private && n.workspace !== this.#workspace) return false;
    }
    return true;
  }

  /** True if one of the node's tags is hidden. */
  #concealed(node) {
    return !!node.tags && this.#hiddenTags.size > 0 && node.tags.some(t => this.#hiddenTags.has(t));
  }

  #inTrash(node) {
    for (let n = node; n; n = this.#nodes.get(n.parent)) if (n.id === TRASH) return true;
    return false;
  }

  /** A trashed item (directly in the trash) that the current workspace can see. */
  #trashVisible(node) {
    return !this.#workspace || !node.trashed.scope || node.trashed.scope === this.#workspace;
  }

  #purge(ids) {
    if (!ids.length) return 0;
    const all = ids.flatMap(id => [id, ...this.#descendants(id)]);
    all.forEach(i => this.#nodes.delete(i));
    all.forEach(i => contents.delete(i));
    this.#save();
    this.emit('trash');
    return ids.length;
  }

  /**
   * `name`, or `name 2`… if a sibling that can be seen together with `node` has it (null: a shared
   * node, which clashes with every sibling). Private folders of different workspaces never clash.
   */
  #unique(parentId, name, exceptId, node) {
    const clash = n => n.parent === parentId && n.id !== exceptId && !(node?.private && n.private && n.workspace !== node.workspace);
    const taken = new Set([...this.#nodes.values()].filter(clash).map(n => n.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    const [base, ext] = splitName(name);
    for (let n = 2; ; n++) {
      const candidate = ext ? `${base} ${n}.${ext}` : `${base} ${n}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  #editable(id) {
    const node = this.#find(id);
    if (!node) throw new Error('Elemento inesistente');
    if (node.system || id === ROOT) throw new Error('Gli elementi di sistema non si possono modificare');
    return node;
  }

  /** Every node inside a folder, at any depth. */
  #descendants(id) {
    return [...this.#nodes.values()].filter(n => n.parent === id).flatMap(c => [c.id, ...this.#descendants(c.id)]);
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

  /**
   * Sends changes to the kernel in batches of 2000 (it accepts at most 5000 per request):
   * parents before children, so a folder exists before what goes in it, then the removals.
   */
  async #send(put, remove, { keepalive } = {}) {
    const BATCH = 2000;
    const depth = id => {
      let d = 0;
      for (let n = this.#nodes.get(id); n && d < 256; n = this.#nodes.get(n.parent)) d++;
      return d;
    };
    const sorted = put.length > BATCH ? [...put].sort((a, b) => depth(a.id) - depth(b.id)) : put;
    const batches = [];
    for (let i = 0; i < sorted.length; i += BATCH) batches.push({ put: sorted.slice(i, i + BATCH), remove: [] });
    for (let i = 0; i < remove.length; i += BATCH) batches.push({ put: [], remove: remove.slice(i, i + BATCH) });
    for (const body of batches) await kernel.request('POST', '/fs/sync', body, { keepalive: keepalive && batches.length === 1 });
  }

  #save() {
    if (this.#tracker) this.#tracker.schedule();
    else storage.set(STORAGE_KEY, [...this.#nodes.values()]);
  }

  /** Stored data is untrusted: keep only well-formed nodes reachable from the root. */
  #load(data) {
    const now = Date.now();
    this.#nodes.set(ROOT, { id: ROOT, type: 'folder', name: '', parent: null, created: now, modified: now, system: true });
    this.#nodes.set(TRASH, { id: TRASH, type: 'folder', name: '', parent: null, created: now, modified: now, system: true });
    if (!Array.isArray(data)) return;
    this.loaded = true;

    const byId = new Map();
    for (const n of data) {
      if (!n || typeof n !== 'object' || typeof n.id !== 'string' || n.id === ROOT || n.id === TRASH || byId.has(n.id)) continue;
      if (!TYPES.has(n.type) || typeof n.parent !== 'string' || !validName(n.name)) continue;
      byId.set(n.id, n);
    }
    // Breadth-first from the two roots: orphans and cycles are dropped
    const queue = [ROOT, TRASH];
    while (queue.length) {
      const parentId = queue.shift();
      const names = new Map();   // lowercase name → who uses it: '' a shared node, or the owners of private folders
      for (const n of byId.values()) {
        if (n.parent !== parentId || this.#nodes.has(n.id)) continue;
        const owner = validWorkspace(n.workspace) ? n.workspace : null;
        const own = n.private === true && n.type === 'folder' && !!owner;
        // Trashed items need where they came from; their names may repeat
        const trashed = parentId === TRASH ? validTrashed(n.trashed) : null;
        if (parentId === TRASH && !trashed) continue;
        // A name repeats only between private folders of different workspaces (never seen together)
        const key = n.name.toLowerCase(), users = names.get(key) ?? new Set();
        if (!trashed && (users.has('') || (users.size && !own) || (own && users.has(owner)))) continue;
        names.set(key, users.add(own ? owner : ''));
        const time = v => (Number.isFinite(v) ? v : now);
        this.#nodes.set(n.id, {
          id: n.id, type: n.type, name: n.name, parent: parentId, created: time(n.created), modified: time(n.modified),
          ...(n.type === 'file' && { size: Number.isFinite(n.size) && n.size >= 0 ? n.size : 0 }),
          ...(n.type === 'folder' && typeof n.color === 'string' && { color: n.color }),
          ...(n.type === 'app' && { app: String(n.app ?? '') }),
          ...(n.system === true && { system: true }),
          ...(owner && { workspace: owner }),
          ...(own && { private: true }),
          ...(trashed && { trashed }),
          ...(n.system !== true && cleanTags(n.tags).length && { tags: cleanTags(n.tags) }),
        });
        if (n.type === 'folder') queue.push(n.id);
      }
    }
  }
}

/** A copy of a node that shares nothing with it (`tags` is an array). */
const copy = n => ({ ...n, ...(n.tags && { tags: [...n.tags] }) });

/** Tag ids: strings of 1-40 letters, digits, _ and -, no duplicates, at most `max`. */
function cleanTags(list, max = MAX_TAGS) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(t => typeof t === 'string' && TAG_ID.test(t)))].slice(0, max);
}

function validWorkspace(id) {
  return typeof id === 'string' && WORKSPACE_ID.test(id);
}

function validTrashed(t) {
  if (!t || typeof t !== 'object' || !Number.isFinite(t.at) || typeof t.from !== 'string') return null;
  return { at: t.at, from: t.from, ...(validWorkspace(t.scope) && { scope: t.scope }) };
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
