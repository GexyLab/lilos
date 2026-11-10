import { fs, Emitter, LogicProject, LogicSchema, LogicWindow, LOGIC_EXTENSIONS } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * A Logic Studio project open in the IDE: a folder with Nome.lsproj and the folders of its
 * elements (schemi/, ui/, risorse/), each with its subfolders. Or a schema alone (a .lsch with
 * no project around it).
 *
 *   const ws = await Workspace.open(fileId)       a .lsproj or a .lsch
 *   ws.project        LogicProject | null          ws.folder   the project's folder id
 *   ws.groups         [{ key: 'schemas'|'windows'|'resources', folder }]   the top folders
 *   ws.doc(path) → Promise<LogicSchema|LogicWindow>   (loaded once, kept)
 *   ws.save(doc) / ws.saveAll()   ws.dirty
 *   ws.documents() → { project, schemas, windows }    for the engine (what is open, saved or not)
 *
 * Events: 'change' (elements or folders changed) · 'dirty' (a document changed or was saved)
 */

export const GROUPS = Object.freeze([
  { key: 'schemas', folder: 'schemi', ext: LOGIC_EXTENSIONS.schema },
  { key: 'windows', folder: 'ui', ext: LOGIC_EXTENSIONS.window },
  { key: 'resources', folder: 'risorse', ext: null },
]);

const extOf = name => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '');
const baseOf = name => (name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name);

export class Workspace extends Emitter {
  project = null;      // LogicProject
  projectFile = null;  // its node id
  folder = null;       // the project's folder id
  single = null;       // a schema alone: its node id
  #docs = new Map();   // relative path → doc
  #files = new Map();  // doc → node id

  static async open(fileId) {
    const node = fs.get(fileId);
    if (!node) throw new Error(t('ws.gone'));
    const ws = new Workspace();
    const ext = extOf(node.name);
    if (ext === LOGIC_EXTENSIONS.project) {
      ws.project = LogicProject.parse(await fs.read(fileId));
      ws.projectFile = fileId;
      ws.folder = node.parent;
      ws.#watch(ws.project, fileId);
      await ws.#sync();
    } else if (ext === LOGIC_EXTENSIONS.schema) {
      ws.single = fileId;
      ws.folder = node.parent;
      const doc = LogicSchema.parse(await fs.read(fileId));
      ws.#docs.set(node.name, doc);
      ws.#watch(doc, fileId);
    } else throw new Error(t('ws.notLogic'));
    return ws;
  }

  /** A new project: <parent>/<name>/<name>.lsproj, schemi/main.lsch, ui/Principale.lsui (the main window). */
  static async create(parentId, name) {
    const clean = fs.cleanName(String(name ?? ''));
    if (!clean) throw new Error(t('ws.noName'));
    const folderName = fs.uniqueName(parentId, clean);
    const folder = fs.create(parentId, { type: 'folder', name: folderName });
    for (const g of GROUPS) fs.create(folder.id, { type: 'folder', name: g.folder });
    const project = LogicProject.create(folderName);
    const schema = LogicSchema.create('main');
    const win = LogicWindow.create(folderName);
    const schemaFile = fs.create(childNamed(folder.id, 'schemi').id, { type: 'file', name: 'main.lsch' });
    const winFile = fs.create(childNamed(folder.id, 'ui').id, { type: 'file', name: 'Principale.lsui' });
    await fs.write(schemaFile.id, schema.toText());
    await fs.write(winFile.id, win.toText());
    project.edit('init', data => {
      data.schemas = { main: 'schemi/main.lsch' };
      data.windows = { Principale: 'ui/Principale.lsui' };
      data.main = 'Principale';
    }, { record: false });
    const projFile = fs.create(folder.id, { type: 'file', name: `${folderName}.lsproj` });
    await fs.write(projFile.id, project.toText());
    return projFile.id;
  }

  get name() { return this.project?.data.name ?? baseOf(fs.get(this.single)?.name ?? ''); }
  get groups() { return GROUPS.map(g => ({ ...g, folder: this.project ? childNamed(this.folder, g.folder)?.id ?? null : null })); }
  get dirty() { return !!this.project?.dirty || [...this.#docs.values()].some(d => d.dirty); }

  /** The path of a node relative to the project folder ('schemi/irrigazione/nord.lsch'). */
  relative(id) {
    const chain = fs.ancestors(id);
    const i = chain.findIndex(n => n.id === this.folder);
    return i < 0 ? null : chain.slice(i + 1).map(n => n.name).join('/');
  }

  /** The node at a path relative to the project folder. */
  nodeAt(path) {
    let id = this.folder;
    for (const part of String(path).split('/').filter(Boolean)) {
      id = childNamed(id, part)?.id;
      if (!id) return null;
    }
    return fs.get(id);
  }

  /** The kind of an element from its file: 'schemas' | 'windows' | null. */
  kindOf(name) {
    const ext = extOf(name);
    return ext === LOGIC_EXTENSIONS.schema ? 'schemas' : ext === LOGIC_EXTENSIONS.window ? 'windows' : null;
  }

  /** Name of an element in the project (its key in the .lsproj) from its relative path. */
  nameOf(kind, path) {
    const entries = Object.entries(this.project?.data[kind] ?? {});
    return entries.find(([, p]) => p === path)?.[0] ?? null;
  }

  async doc(path) {
    if (this.#docs.has(path)) return this.#docs.get(path);
    const node = this.single ? fs.get(this.single) : this.nodeAt(path);
    if (!node) throw new Error(t('ws.missingFile', { path }));
    const text = await fs.read(node.id);
    const doc = this.kindOf(node.name) === 'windows' ? LogicWindow.parse(text) : LogicSchema.parse(text);
    this.#docs.set(path, doc);
    this.#watch(doc, node.id);
    return doc;
  }

  loaded(path) { return this.#docs.get(path) ?? null; }
  fileOf(doc) { return this.#files.get(doc) ?? null; }

  #watch(doc, fileId) {
    this.#files.set(doc, fileId);
    doc.on('change', () => this.emit('dirty', { doc }));
    doc.on('saved', () => this.emit('dirty', { doc }));
  }

  async save(doc) {
    const id = this.#files.get(doc);
    if (!id || !fs.exists(id)) throw new Error(t('ws.gone'));
    await fs.write(id, doc.toText());
    doc.markSaved();
  }

  async saveAll() {
    for (const doc of this.#docs.values()) if (doc.dirty) await this.save(doc);
    if (this.project?.dirty) await this.save(this.project);
  }

  /**
   * What the engine runs: every schema and window of the project (the open ones as they are now,
   * the others as saved). A schema alone: just it.
   */
  async documents() {
    if (this.single) {
      const doc = this.#docs.values().next().value;
      return { project: null, schemas: { [doc.data.name || 'schema']: doc.toJSON() }, windows: {} };
    }
    const schemas = {}, windows = {};
    for (const [name, path] of Object.entries(this.project.data.schemas)) schemas[name] = (await this.doc(path)).toJSON();
    for (const [name, path] of Object.entries(this.project.data.windows)) windows[name] = (await this.doc(path)).toJSON();
    return { project: this.project.toJSON(), schemas, windows };
  }

  // ------------------------------------------------------------------ elements and folders

  /**
   * The project and its folders agree: files of schemas and windows found in the folders and
   * missing from the .lsproj are added; entries whose file is gone are taken away.
   */
  async #sync() {
    if (!this.project) return;
    const found = { schemas: new Map(), windows: new Map() };
    const walk = id => {
      for (const n of fs.children(id)) {
        if (n.type === 'folder') walk(n.id);
        else {
          const kind = this.kindOf(n.name);
          if (kind) found[kind].set(this.relative(n.id), n);
        }
      }
    };
    for (const g of this.groups) if (g.folder) walk(g.folder);
    this.project.edit('sync', data => {
      for (const kind of ['schemas', 'windows']) {
        const paths = new Set(found[kind].keys());
        for (const [name, path] of Object.entries(data[kind])) if (!paths.has(path)) delete data[kind][name];
        const known = new Set(Object.values(data[kind]));
        for (const [path, n] of found[kind]) {
          if (known.has(path)) continue;
          let name = baseOf(n.name);
          for (let i = 2; name in data[kind]; i++) name = `${baseOf(n.name)} ${i}`;
          data[kind][name] = path;
        }
      }
      if (data.main && !(data.main in data.windows)) data.main = Object.keys(data.windows)[0] ?? null;
      if (!data.main) data.main = Object.keys(data.windows)[0] ?? null;
    }, { record: false });
  }

  /** A new schema or window in a folder of its group. Returns its relative path. */
  async createElement(kind, folderId, name) {
    const group = GROUPS.find(g => g.key === kind);
    const base = String(name).trim() || (kind === 'schemas' ? 'schema' : 'finestra');
    if (base in this.project.data[kind]) throw new Error(t('ws.nameTaken', { name: base }));
    const fileName = fs.uniqueName(folderId, `${base}.${group.ext}`);
    const node = fs.create(folderId, { type: 'file', name: fileName });
    const doc = kind === 'schemas' ? LogicSchema.create(base) : LogicWindow.create(base);
    await fs.write(node.id, doc.toText());
    const path = this.relative(node.id);
    this.project.setElement(kind, base, path);
    await this.save(this.project);
    this.emit('change');
    return path;
  }

  createFolder(parentId, name) {
    const node = fs.create(parentId, { type: 'folder', name: fs.uniqueName(parentId, String(name).trim() || t('ws.newFolder')) });
    this.emit('change');
    return node.id;
  }

  /** Renames an element (its file and its key in the project) or a folder (the paths inside follow). */
  async rename(nodeId, newName) {
    const node = fs.get(nodeId);
    if (!node) return;
    if (node.type === 'folder') {
      const before = this.relative(nodeId);
      fs.rename(nodeId, String(newName).trim());
      await this.#moved(before, this.relative(nodeId));
    } else {
      const kind = this.kindOf(node.name);
      const oldPath = this.relative(nodeId);
      const name = String(newName).trim();
      if (kind) {
        const oldName = this.nameOf(kind, oldPath);
        if (name !== oldName && name in this.project.data[kind]) throw new Error(t('ws.nameTaken', { name }));
        fs.rename(nodeId, `${name}.${extOf(node.name)}`);
        const doc = this.#docs.get(oldPath);
        if (doc) { this.#docs.delete(oldPath); this.#docs.set(this.relative(nodeId), doc); }
        this.project.renameElement(kind, oldName, name, this.relative(nodeId));
        await this.save(this.project);
      } else fs.rename(nodeId, name);
    }
    this.emit('change');
  }

  /** Moves an element or a folder into another folder of the same group. */
  async move(nodeId, folderId) {
    const before = this.relative(nodeId);
    fs.move(nodeId, folderId);
    await this.#moved(before, this.relative(nodeId));
    this.emit('change');
  }

  /** Paths under `from` are now under `to`: open documents and the project follow. */
  async #moved(from, to) {
    if (!this.project || from === to) return;
    const fix = p => (p === from ? to : p.startsWith(`${from}/`) ? `${to}${p.slice(from.length)}` : p);
    for (const [p, doc] of [...this.#docs]) { const n = fix(p); if (n !== p) { this.#docs.delete(p); this.#docs.set(n, doc); } }
    this.project.edit('move', data => {
      for (const kind of ['schemas', 'windows']) for (const k of Object.keys(data[kind])) data[kind][k] = fix(data[kind][k]);
    });
    await this.save(this.project);
  }

  /** Removes an element or folder (to the trash): the project forgets what was inside. */
  async remove(nodeId) {
    const node = fs.get(nodeId);
    if (!node) return;
    const path = this.relative(nodeId);
    fs.trash([nodeId]);
    for (const p of [...this.#docs.keys()]) if (p === path || p.startsWith(`${path}/`)) this.#docs.delete(p);
    await this.#sync();
    await this.save(this.project);
    this.emit('change');
  }
}

export function childNamed(parentId, name) {
  return fs.children(parentId).find(n => n.name.toLowerCase() === String(name).toLowerCase()) ?? null;
}
