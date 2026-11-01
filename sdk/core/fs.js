import { Emitter } from './events.js';
import { storage, uid } from './storage.js';
import { splitName } from './fileTypes.js';
import { contents } from './db.js';
import { kernel } from './kernel.js';
import { pipes } from './pipeCatalog.js';

const STORAGE_KEY = 'fs';
const ROOT = 'root';
const TRASH = 'trash';
const TYPES = new Set(['folder', 'file', 'app']);
const MAX_NAME = 255;
const WORKSPACE_ID = /^[\w-]{1,40}$/;
const TAG_ID = /^[\w-]{1,40}$/;
const MAX_TAGS = 30;   // per node
const APP_ID = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const MAX_APPS = 8;          // apps with data on one node
const MAX_APP_META = 1024;   // characters of JSON, per app
const MAX_APPS_META = 2048;  // all apps together: the kernel takes at most 4 KB of metadata per node
const NOT_FOR_NET = 'Non disponibile per i file di una connessione di rete';
const MOUNT_PREFIX = 'net-';
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
 *           size?, color?, app?, system?, workspace?, private?, tags?, apps? }   size: bytes of the content
 *
 * Apps' data on a node (setAppMeta): `apps` holds, per app id, a small object only that app writes
 * (lilOS checks it). `content: true` in it says that the content is the app's to read: without the
 * app, lilOS does not hand it out as it is (an encrypted file). Copies keep it, the name does not change.
 *
 * Contents go through the pipes of the events file.read and file.write (pipes.js): an app may
 * change what is read and written (decrypt, encrypt). `caller` (who asks: { app, opened } or
 * { system: true }) is what the handlers see; the operations an app asks for skip its own handlers.
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
 * lists them (isTrashed() for one id), untrash() puts them back where they were or into a given
 * folder (a 'create' for each node), purge() and purgeTrash() delete them for good. Items trashed
 * from a private folder are seen in the trash only from that workspace. Event 'trash': what the
 * trash holds changed.
 *   Trashed item: node + trashed: { at, from, scope? }   from: the parent it left; scope: the workspace
 *
 * Network (Rete): the folders of a network connection (see net.js) are in the tree too, under
 * a mount node that setMounts() puts in a folder (the system's Rete). Their nodes have `net` (the
 * connection's id); the mount node also has `mount: true`, `mountState` and `protocol`. They are
 * not saved: what a folder holds is read from the server with refresh() (when it is opened), and
 * children() gives what was read last. Creating, renaming, moving inside the same connection and
 * removing go to the server at once (a failure reads the folder again and emits 'netError'
 * { message }); removing is for good (no trash, no undo). Their contents are read and written on
 * the server. Tags, colors, apps' data and copies between places are not for them: files go to and
 * from a connection with net.transfer() (done by the kernel). isRemote(), netRef() and netPath() tell them.
 * external() takes the nodes the kernel made or removed in the home (what a transfer brought).
 */
class FileSystem extends Emitter {
  #nodes = new Map();
  #workspace = null;
  #hiddenTags = new Set();
  /** Snapshots still held (by the undo history): scrub() takes contents out of them. */
  #snapshots = new Set();   // WeakRefs

  /** False when nothing was stored yet (first start): the system seeds the tree. */
  loaded = false;

  /** Connected to the kernel: sends the nodes that changed. */
  #tracker = null;

  constructor() {
    super();
    if (kernel.connected) {
      this.#load(kernel.data.nodes);
      this.loaded = !kernel.data.fresh;
      const read = () => new Map([...this.#nodes].filter(([id, n]) => id !== ROOT && id !== TRASH && !n.net));
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
    if (parent.net) return this.#netCreate(parent, type, name);
    if (id != null && (typeof id !== 'string' || this.#nodes.has(id))) throw new Error('Identificatore non valido');
    const owner = workspace !== undefined ? workspace : system && !own ? null : this.#workspace;
    if (owner != null && !validWorkspace(owner)) throw new Error('Workspace non valido');
    if (own && (type !== 'folder' || !owner)) throw new Error('Solo una cartella con un workspace può essere privata');
    pipes.runSync('file.create', { parent: parentId, type, name });
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
    pipes.notify('file.create', { node: copy(node) });
    return copy(node);
  }

  /** Renames and returns the final (unique) name. */
  rename(id, name) {
    const node = this.#editable(id);
    const unique = this.#unique(node.parent, checkName(name), id, node);
    if (unique === node.name) return unique;
    pipes.runSync('file.rename', { node: copy(node), name: unique });
    const from = node.name;
    const oldPath = node.net ? this.#netPath(node.id) : null;
    node.name = unique;
    node.modified = Date.now();
    if (node.net) this.#netOp(node.net, { op: 'rename', path: oldPath, to: this.#netPath(node.id) }, [node.parent]);
    this.#save();
    this.emit('change', { type: 'rename', node: copy(node), parent: node.parent });
    pipes.notify('file.rename', { node: copy(node), from });
    return unique;
  }

  /** Change metadata that is not the name (e.g. a folder's color). */
  update(id, { color } = {}) {
    const node = this.#find(id);
    if (!node) throw new Error('Elemento inesistente');
    if (node.net) throw new Error(NOT_FOR_NET);
    if (node.type === 'folder' && typeof color === 'string') node.color = color;
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
  }

  /** Data of an app on a node (a copy), or null. */
  appMeta(id, appId) {
    const value = this.#find(id)?.apps?.[appId];
    return value ? structuredClone(value) : null;
  }

  /**
   * Sets (or, with null, takes away) the data of an app on a node: a plain object of at most
   * 1 KB of JSON. Setting `content: true` takes the node's old contents out of the undo history
   * (scrub): they may be what the app is protecting. Emits an 'update' change.
   */
  setAppMeta(id, appId, value) {
    const node = this.#find(id);
    if (!node || id === ROOT) throw new Error('Elemento inesistente');
    if (node.net) throw new Error(NOT_FOR_NET);
    this.#setApp(node, appId, value);
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
  }

  /** Text content of a file ('' if it has none yet). */
  async read(id, { caller = null } = {}) {
    const node = this.#file(id);
    if (node.net) return (await this.#netContent(node)).text();
    await this.#tracker?.flush();   // a file just created must exist in the kernel
    if (!pipes.wants('file.read', { node: copy(node) }, caller)) {
      const text = await contents.get(id);
      return typeof text === 'string' ? text : '';
    }
    return (await this.#readThrough(node, caller)).text();
  }

  /**
   * Content of a file as bytes: a Blob (empty if it has none yet), typed from the file's
   * extension ('image/png' for a .png…) unless `type` is given.
   */
  async readBlob(id, { type, caller = null } = {}) {
    const node = this.#file(id);
    if (node.net) return new Blob([await this.#netContent(node)], { type: type ?? MIME[splitName(node.name)[1].toLowerCase()] ?? '' });
    await this.#tracker?.flush();
    const blob = pipes.wants('file.read', { node: copy(node) }, caller)
      ? await this.#readThrough(node, caller)
      : (await contents.getBlob(id)) ?? new Blob([]);
    return new Blob([blob], { type: type ?? MIME[splitName(node.name)[1].toLowerCase()] ?? '' });
  }

  /**
   * Saves the content of a file: text (a string), or bytes (a Blob, an ArrayBuffer or a typed
   * array). Updates size and modification date ('update' event).
   * mark: { app, value } also sets that app's data on the node (setAppMeta) once the content is
   * saved, in the same change: a content and the mark that says how to read it never part.
   */
  async write(id, data, { caller = null, mark = null } = {}) {
    let node = this.#file(id);
    if (mark) checkAppMeta(mark.app, mark.value);
    let value = data instanceof Blob ? data : data instanceof ArrayBuffer || ArrayBuffer.isView(data) ? new Blob([data]) : String(data);
    if (node.net) {
      if (mark) throw new Error(NOT_FOR_NET);
      await kernel.request('PUT', this.#netUrl(node.net, 'content', this.#netPath(id)), value);
      const now = this.#nodes.get(id);
      if (!now) return;
      now.size = value instanceof Blob ? value.size : new TextEncoder().encode(value).length;
      now.modified = Date.now();
      this.emit('change', { type: 'update', node: copy(now), parent: now.parent });
      return;
    }
    await this.#tracker?.flush();
    if (pipes.wants('file.write', { node: copy(node) }, caller)) {
      const out = await pipes.around('file.write', { node: copy(node), content: toBlob(value) }, async d => {
        await this.#store(id, d.content);
        return { node: copy(this.#nodes.get(id) ?? node) };
      }, { caller });
      node = this.#nodes.get(out.node.id);
    } else {
      await this.#store(id, value);
      node = this.#nodes.get(id);
    }
    if (!node) return;   // removed while saving
    if (mark) this.#setApp(node, mark.app, mark.value);
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
  }

  /**
   * A copy of a file (its content as it is stored, and the apps' data on it) in a folder, with
   * `name` or its own (made unique). An encrypted file stays encrypted. Returns the new node.
   */
  async copy(id, parentId, { name } = {}) {
    const source = this.#file(id);
    if (source.net || this.#find(parentId)?.net) throw new Error(NOT_FOR_NET);
    await this.#tracker?.flush();
    const blob = (await contents.getBlob(id)) ?? new Blob([]);
    const created = this.create(parentId, { type: 'file', name: name ?? source.name, size: blob.size });
    const node = this.#nodes.get(created.id);
    if (source.apps) node.apps = structuredClone(source.apps);
    await this.#tracker?.flush();
    await contents.set(node.id, blob);
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
    pipes.notify('file.copy', { node: copy(node), source: copy(source) });
    return copy(node);
  }

  /** Puts the stored content of a file, and the apps' data on it, into another existing file. */
  async copyContent(fromId, toId) {
    const source = this.#file(fromId);
    const target = this.#file(toId);
    if (source.net || target.net) throw new Error(NOT_FOR_NET);
    await this.#tracker?.flush();
    await this.#store(toId, (await contents.getBlob(fromId)) ?? new Blob([]));
    if (!this.#nodes.has(toId)) return;
    if (source.apps) target.apps = structuredClone(source.apps);
    else delete target.apps;
    this.#save();
    this.emit('change', { type: 'update', node: copy(target), parent: target.parent });
    pipes.notify('file.copy', { node: copy(target), source: copy(source) });
  }

  /** The bytes of a file through the file.read pipe. */
  async #readThrough(node, caller) {
    const out = await pipes.around('file.read', { node: copy(node) }, async () => ({ node: copy(node), content: (await contents.getBlob(node.id)) ?? new Blob([]) }), { caller });
    return out.content;
  }

  /** Saves a content as it is; size and dates follow. The caller saves the tree and tells. */
  async #store(id, value) {
    await contents.set(id, value);
    const node = this.#nodes.get(id);
    if (!node) return;
    node.size = value instanceof Blob ? value.size : new TextEncoder().encode(value).length;
    node.modified = Date.now();
    this.#touch(node.parent, node.modified);
  }

  #file(id) {
    const node = this.#find(id);
    if (!node || node.type !== 'file') throw new Error('Il file non esiste');
    return node;
  }

  #setApp(node, appId, value) {
    checkAppMeta(appId, value);
    if (value == null) {
      if (!node.apps?.[appId]) return;
      delete node.apps[appId];
      if (!Object.keys(node.apps).length) delete node.apps;
      return;
    }
    if (!node.apps?.[appId] && Object.keys(node.apps ?? {}).length >= MAX_APPS) throw new Error('Troppe app hanno dati su questo elemento');
    const next = { ...node.apps, [appId]: structuredClone(value) };
    if (JSON.stringify(next).length > MAX_APPS_META) throw new Error('Troppi dati delle app su questo elemento');
    node.apps = next;
    if (value.content === true) this.scrub(node.id);
  }

  /**
   * Takes the contents of these nodes out of every snapshot still held (the undo history): putting
   * them back gives an empty file. For a content that must not stay anywhere in clear.
   */
  scrub(...ids) {
    for (const ref of this.#snapshots) {
      const snap = ref.deref();
      if (!snap) { this.#snapshots.delete(ref); continue; }
      for (const id of ids) if (Object.hasOwn(snap.contents, id)) delete snap.contents[id];
    }
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
    // Between the home and a connection, or two connections: a transfer (net.transfer), not a move
    if ((node.net || target.net) && node.net !== target.net) throw new Error('Tra la home e la rete i file si copiano con un trasferimento');
    pipes.runSync('file.move', { node: copy(node), to: parentId });
    const from = node.parent;
    const oldPath = node.net ? this.#netPath(id) : null;
    node.name = this.#unique(parentId, node.name, id, node);
    node.parent = parentId;
    if (node.net) this.#netOp(node.net, { op: 'rename', path: oldPath, to: this.#netPath(id) }, [from, parentId]);
    const now = Date.now();
    this.#touch(from, now);
    this.#touch(parentId, now);
    this.#save();
    this.emit('change', { type: 'move', node: copy(node), parent: parentId, from, ids: [id, ...this.#descendants(id)] });
    pipes.notify('file.move', { node: copy(node), from });
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
      if (n.type !== 'file' || n.net) continue;
      const blob = await contents.getBlob(n.id);
      if (blob instanceof Blob) data[n.id] = blob;
    }
    const snap = { nodes, contents: data };
    this.#snapshots.add(new WeakRef(snap));
    return snap;
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
      if (this.#nodes.has(n.id) || !parent || parent.type !== 'folder' || n.net || parent.net) continue;
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
    pipes.runSync('file.remove', { node: copy(node), ids });
    if (node.net) this.#netOp(node.net, { op: 'remove', path: this.#netPath(id) }, [node.parent]);
    ids.forEach(i => this.#nodes.delete(i));
    ids.forEach(i => contents.delete(i));
    this.#touch(node.parent, Date.now());
    this.#save();
    this.emit('change', { type: 'remove', node: copy(node), parent: node.parent, ids });
    pipes.notify('file.remove', { node: copy(node), ids });
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
      if (!node || node.system || node.net || done.includes(id)) continue;   // a connection's: removed for good, not trashed
      const inside = this.#descendants(id);
      if (inside.some(i => this.#nodes.get(i).system)) continue;
      pipes.runSync('trash.put', { ids: [id] });
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
      pipes.notify('trash.put', { ids: done });
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

  /** True if `id` is an item in the trash that the current workspace sees (see trashed()). */
  isTrashed(id) {
    const node = this.#nodes.get(id);
    return node?.parent === TRASH && this.#trashVisible(node);
  }

  /**
   * Puts trashed nodes back into the folder they came from (if it is gone or cannot be seen, into
   * the root), or into `parentId` when given (a visible folder, or nothing is put back), with a
   * unique name. Returns [{ id, parent }] for each one put back.
   */
  untrash(ids, parentId = null) {
    const into = parentId == null ? null : this.#find(parentId);
    if (parentId != null && (into?.type !== 'folder' || into.net)) return [];   // not onto a server
    const restored = [];
    for (const id of ids) {
      const node = this.#nodes.get(id);
      if (node?.parent !== TRASH || !this.#trashVisible(node)) continue;
      const back = into ?? this.#find(node.trashed.from);
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
    pipes.notify('trash.restore', { ids: restored.map(r => r.id) });
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
    if (node.net) throw new Error(NOT_FOR_NET);
    const clean = cleanTags(tagIds);
    if (clean.join() === (node.tags ?? []).join()) return;
    pipes.runSync('tags.assign', { node: copy(node), tags: clean });
    if (clean.length) node.tags = clean;
    else delete node.tags;
    this.#save();
    this.emit('change', { type: 'update', node: copy(node), parent: node.parent });
    pipes.notify('tags.assign', { node: copy(node), tags: clean });
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

  // ---------- Network (Rete) ----------

  /** True for a node of a network connection (its mount node included). */
  isRemote(id) {
    return !!this.#nodes.get(id)?.net;
  }

  /** The path of a node inside its connection ('/' for the mount node), null for the others. */
  netPath(id) {
    const node = this.#find(id);
    return node?.net ? this.#netPath(id) : null;
  }

  /** Where a node is, as the kernel's transfers name places: { home: id } or { mount, path }. */
  netRef(id) {
    const node = this.#find(id);
    if (!node) throw new Error('Elemento inesistente');
    return node.net ? { mount: node.net, path: this.#netPath(id) } : { home: id };
  }

  /**
   * Puts the mount nodes of the connections in a folder (the system's Rete): one per connection,
   * named as it, with its state. Connections gone take what was read of them along; a connection
   * that is not connected any more forgets what was read (opened again, it is read again).
   *   mounts: [{ id, name, protocol, state }]
   */
  setMounts(parentId, mounts) {
    const parent = this.#nodes.get(parentId);
    if (!parent || parent.type !== 'folder' || parent.net) return;
    const now = Date.now();
    const wanted = new Map(mounts.map(m => [MOUNT_PREFIX + m.id, m]));
    for (const node of [...this.#nodes.values()]) {
      if (!node.mount || (node.parent === parentId && wanted.has(node.id))) continue;
      const ids = [node.id, ...this.#descendants(node.id)];
      ids.forEach(i => this.#nodes.delete(i));
      this.emit('change', { type: 'remove', node: copy(node), parent: node.parent, ids });
    }
    for (const [id, m] of wanted) {
      const old = this.#nodes.get(id);
      if (!old) {
        const node = { id, type: 'folder', name: m.name, parent: parentId, created: now, modified: now, system: true, net: m.id, mount: true, mountState: m.state, protocol: m.protocol };
        this.#nodes.set(id, node);
        this.emit('change', { type: 'create', node: copy(node), parent: parentId });
        continue;
      }
      const renamed = old.name !== m.name;
      const changed = renamed || old.mountState !== m.state || old.protocol !== m.protocol;
      if (m.state !== 'on' && old.mountState === 'on') this.#dropChildren(id);
      Object.assign(old, { name: m.name, mountState: m.state, protocol: m.protocol });
      if (changed) this.emit('change', { type: renamed ? 'rename' : 'update', node: copy(old), parent: parentId });
    }
  }

  /**
   * Reads again what is in a folder of a connection (opening it): resolves when the tree has it,
   * rejects with the kernel's error (a password to type: code 'secret_required'; a server to
   * confirm: 'untrusted'). Other folders: nothing to do.
   */
  async refresh(id) {
    const node = this.#find(id);
    if (!node?.net || node.type !== 'folder') return;
    const path = this.#netPath(id);
    const { entries } = await kernel.request('GET', this.#netUrl(node.net, 'list', path));
    if (!this.#nodes.has(id) || this.#netPath(id) !== path) return;   // gone or moved meanwhile
    const kids = [...this.#nodes.values()].filter(n => n.parent === id);
    const byName = new Map(kids.map(n => [n.name, n]));
    const seen = new Set();
    for (const e of Array.isArray(entries) ? entries : []) {
      if (typeof e?.name !== 'string' || !e.name || e.name.includes('/') || seen.has(e.name)) continue;
      seen.add(e.name);
      const type = e.type === 'folder' ? 'folder' : 'file';
      const modified = Number.isFinite(e.modified) && e.modified > 0 ? e.modified : Date.now();
      const old = byName.get(e.name);
      if (old && old.type === type) {
        if (type === 'file' && (old.size !== e.size || old.modified !== modified)) {
          Object.assign(old, { size: Number(e.size) || 0, modified });
          this.emit('change', { type: 'update', node: copy(old), parent: id });
        }
        continue;
      }
      if (old) this.#dropNode(old);
      const fresh = { id: uid(), type, name: e.name, parent: id, created: modified, modified, net: node.net, ...(type === 'file' && { size: Number(e.size) || 0 }) };
      this.#nodes.set(fresh.id, fresh);
      this.emit('change', { type: 'create', node: copy(fresh), parent: id });
    }
    for (const old of kids) if (!seen.has(old.name) && this.#nodes.has(old.id)) this.#dropNode(old);
  }

  /** The kernel says what is in a folder of a connection changed: read again if it was read. */
  netChanged(mountId, path) {
    const folder = [...this.#nodes.values()].find(n => n.net === mountId && n.type === 'folder' && this.#netPath(n.id) === path);
    if (folder && (folder.mount || [...this.#nodes.values()].some(n => n.parent === folder.id))) this.refresh(folder.id).catch(() => {});
  }

  /**
   * Nodes of the home the kernel made, changed (put) or removed (remove: ids): what a transfer
   * brought. They are what the kernel has already: nothing is sent back.
   */
  external({ put = [], remove = [] } = {}) {
    const accepted = [];
    for (const n of Array.isArray(put) ? put : []) {
      if (!n || typeof n.id !== 'string' || n.id === ROOT || n.id === TRASH || !TYPES.has(n.type) || !validName(n.name)) continue;
      const parent = this.#nodes.get(n.parent);
      if (!parent || parent.type !== 'folder' || parent.net) continue;
      const old = this.#nodes.get(n.id);
      if (old) {
        if (old.net || old.parent !== n.parent) continue;
        Object.assign(old, { name: n.name, modified: Number.isFinite(n.modified) ? n.modified : old.modified, ...(old.type === 'file' && { size: Number(n.size) || 0 }) });
        accepted.push([old.id, old]);
        if (this.#visible(old)) this.emit('change', { type: 'update', node: copy(old), parent: old.parent });
        continue;
      }
      const now = Date.now();
      const node = {
        id: n.id, type: n.type, name: n.name, parent: n.parent,
        created: Number.isFinite(n.created) ? n.created : now, modified: Number.isFinite(n.modified) ? n.modified : now,
        ...(n.type === 'file' && { size: Number(n.size) || 0 }),
        ...(validWorkspace(n.workspace) && { workspace: n.workspace }),
      };
      this.#nodes.set(node.id, node);
      accepted.push([node.id, node]);
      if (this.#visible(node)) this.emit('change', { type: 'create', node: copy(node), parent: node.parent });
    }
    this.#tracker?.accept(accepted);
    const gone = [];
    for (const id of Array.isArray(remove) ? remove : []) {
      const node = this.#nodes.get(id);
      if (!node || node.net || node.system || id === ROOT || id === TRASH) continue;
      const ids = [id, ...this.#descendants(id)];
      ids.forEach(i => { this.#nodes.delete(i); contents.delete(i); });
      gone.push(...ids);
      this.emit('change', { type: 'remove', node: copy(node), parent: node.parent, ids });
    }
    this.#tracker?.forget(gone);
  }

  /** '/docs/a.txt': a node's path in its connection. */
  #netPath(id) {
    const parts = [];
    for (let n = this.#nodes.get(id); n && !n.mount; n = this.#nodes.get(n.parent)) parts.unshift(n.name);
    return `/${parts.join('/')}`;
  }

  #netUrl(mountId, what, path) {
    return `/net/mounts/${encodeURIComponent(mountId)}/${what}?path=${encodeURIComponent(path)}`;
  }

  async #netContent(node) {
    return kernel.request('GET', this.#netUrl(node.net, 'content', this.#netPath(node.id)), undefined, { blob: true });
  }

  /** A node made in a folder of a connection: in the tree now, on the server a moment later. */
  #netCreate(parent, type, name) {
    if (type === 'app') throw new Error(NOT_FOR_NET);
    pipes.runSync('file.create', { parent: parent.id, type, name });
    const now = Date.now();
    const node = { id: uid(), type, name: '', parent: parent.id, created: now, modified: now, net: parent.net, ...(type === 'file' && { size: 0 }) };
    node.name = this.#unique(parent.id, checkName(name), null, node);
    this.#nodes.set(node.id, node);
    this.emit('change', { type: 'create', node: copy(node), parent: parent.id });
    pipes.notify('file.create', { node: copy(node) });
    const path = this.#netPath(node.id);
    if (type === 'folder') this.#netOp(parent.net, { op: 'mkdir', path }, [parent.id]);
    else {
      kernel.request('PUT', this.#netUrl(parent.net, 'content', path), '')
        .catch(err => this.#netFailed(err, [parent.id]));
    }
    return copy(node);
  }

  /** Does an operation on the server; if it fails, the folders it touched are read again and 'netError' says why. */
  #netOp(mountId, body, folders) {
    kernel.request('POST', `/net/mounts/${encodeURIComponent(mountId)}/ops`, body).catch(err => this.#netFailed(err, folders));
  }

  #netFailed(err, folders) {
    for (const id of new Set(folders)) if (this.#nodes.has(id)) this.refresh(id).catch(() => {});
    this.emit('netError', { message: err?.message ?? String(err), code: err?.code ?? null });
  }

  /** Forgets what was read inside a folder of a connection. */
  #dropChildren(id) {
    for (const child of [...this.#nodes.values()].filter(n => n.parent === id)) this.#dropNode(child);
  }

  /** Takes a node of a connection, with what was read inside it, out of the tree (not from the server). */
  #dropNode(node) {
    const ids = [node.id, ...this.#descendants(node.id)];
    ids.forEach(i => this.#nodes.delete(i));
    this.emit('change', { type: 'remove', node: copy(node), parent: node.parent, ids });
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
    pipes.runSync('trash.purge', { count: ids.length });
    const all = ids.flatMap(id => [id, ...this.#descendants(id)]);
    all.forEach(i => this.#nodes.delete(i));
    all.forEach(i => contents.delete(i));
    this.#save();
    this.emit('trash');
    pipes.notify('trash.purge', { count: ids.length });
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
          ...(cleanApps(n.apps) && { apps: cleanApps(n.apps) }),
        });
        if (n.type === 'folder') queue.push(n.id);
      }
    }
  }
}

/** A copy of a node that shares nothing with it (`tags` is an array, `apps` objects). */
const copy = n => ({ ...n, ...(n.tags && { tags: [...n.tags] }), ...(n.apps && { apps: structuredClone(n.apps) }) });

const toBlob = v => (v instanceof Blob ? v : new Blob([v]));

/** An app's data on a node: a plain object of JSON, small (null: none). Throws if not valid. */
function checkAppMeta(appId, value) {
  if (typeof appId !== 'string' || !APP_ID.test(appId)) throw new Error('App non valida');
  if (value == null) return;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('I dati di un’app sono un oggetto');
  const text = JSON.stringify(value);
  if (!text || text.length > MAX_APP_META) throw new Error('Dati dell’app troppo grandi (al massimo 1 KB)');
}

/** Stored apps' data (untrusted): only valid entries, or null. */
function cleanApps(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [appId, value] of Object.entries(raw).slice(0, MAX_APPS)) {
    try {
      checkAppMeta(appId, value);
      if (value) out[appId] = JSON.parse(JSON.stringify(value));
    } catch { /* dropped */ }
  }
  return Object.keys(out).length && JSON.stringify(out).length <= MAX_APPS_META ? out : null;
}

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
