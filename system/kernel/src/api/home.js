import { fail } from '../errors.js';
import { readBody } from '../http.js';
import { visible } from './apps.js';

/**
 * lilOS (the desktop) works on the user's home through these endpoints. It knows nodes by its own
 * ids ('root' is the home, 'trash' the trash root); here they become ids of the fs service, kept
 * apart per user: '<home id>/<id>'. Under the home:
 *
 *   .trash     the trash root of lilOS
 *   .config    lilOS's settings and preferences: one file per key, JSON
 *
 *   GET  /api/boot                 { user, fresh, nodes, storage, apps, appSecurity }   everything lilOS needs to start
 *   POST /api/fs/sync              { put: [node], remove: [id] }     one transaction
 *   GET  /api/fs/content/:id       text of a file
 *   PUT  /api/fs/content/:id       saves the text of a file
 *   POST /api/storage              { set: { key: value }, remove: [key] }
 *
 * Access control is the fs module's: these only translate ids and check the shape of the data.
 */
const FRONT_ID = /^[\w-]{1,64}$/;
const KEY = /^[\w:.-]{1,120}$/;
const TYPES = new Set(['folder', 'file', 'app']);
const META = ['color', 'app', 'system', 'workspace', 'private', 'tags', 'trashed'];
const MAX_NODES = 5000;
const MAX_META = 4 << 10;
const MAX_VALUE = 512 << 10;
const MAX_CONTENT = 10 << 20;

const finite = v => Number.isFinite(v);

class HomeView {
  constructor(fs, principal, homeId) {
    this.fs = fs;
    this.principal = principal;
    this.homeId = homeId;
    this.trashId = `${homeId}/~trash`;
    this.configId = `${homeId}/~config`;
  }

  toBack(id, { parent = false } = {}) {
    if (parent && id === 'root') return this.homeId;
    if (parent && id === 'trash') return this.trashId;
    if (typeof id !== 'string' || !FRONT_ID.test(id) || id === 'root' || id === 'trash') fail('invalid', 'Identificatore non valido');
    return `${this.homeId}/${id}`;
  }

  toFront(id) {
    if (id === this.homeId) return 'root';
    if (id === this.trashId) return 'trash';
    const prefix = `${this.homeId}/`;
    return id.startsWith(prefix) && FRONT_ID.test(id.slice(prefix.length)) ? id.slice(prefix.length) : null;
  }

  keyId(key) {
    if (typeof key !== 'string' || !KEY.test(key)) fail('invalid', `Chiave non valida: ${String(key).slice(0, 40)}`);
    return `${this.configId}/${key}`;
  }
}

const ensured = new Set();

async function openHome(kernel, principal) {
  if (!principal) fail('unauthorized', 'Accesso richiesto');
  const fs = kernel.service('fs');
  const home = await fs.home(principal);
  const view = new HomeView(fs, principal, home.id);
  if (home.created || !ensured.has(home.id)) {
    const now = Date.now();
    const folder = (id, name) => ({ id, parent: home.id, name, type: 'folder', meta: {}, created: now, modified: now });
    const missing = [];
    if (!(await fs.stat(principal, view.trashId))) missing.push(folder(view.trashId, '.trash'));
    if (!(await fs.stat(principal, view.configId))) missing.push(folder(view.configId, '.config'));
    if (missing.length) await fs.apply(principal, { put: missing });
    ensured.add(home.id);
  }
  return view;
}

/** A node from lilOS → a node for the fs service. */
function toBackNode(view, n) {
  if (!n || typeof n !== 'object') fail('invalid', 'Elemento non valido');
  if (!TYPES.has(n.type) || typeof n.name !== 'string' || !finite(n.created) || !finite(n.modified)) fail('invalid', 'Elemento non valido');
  const meta = {};
  for (const k of META) if (n[k] !== undefined) meta[k] = n[k];
  if (JSON.stringify(meta).length > MAX_META) fail('too_large', 'Troppi dati in un elemento');
  return { id: view.toBack(n.id), parent: view.toBack(n.parent, { parent: true }), name: n.name, type: n.type, meta, created: n.created, modified: n.modified };
}

/** A node of the fs service → a node of lilOS, or null for the ones lilOS does not see as nodes. */
function toFrontNode(view, n) {
  const id = view.toFront(n.id), parent = view.toFront(n.parent);
  if (!id || id === 'root' || id === 'trash' || !parent) return null;
  return {
    ...(n.meta && typeof n.meta === 'object' ? n.meta : {}),
    id, parent, type: n.type, name: n.name, created: n.created, modified: n.modified,
    ...(n.type === 'file' && { size: n.size }),
  };
}

export function homeRoutes(kernel) {
  const { router } = kernel;

  router.add('GET', '/api/boot', async ({ principal }) => {
    const view = await openHome(kernel, principal);
    const nodes = (await view.fs.tree(principal, view.homeId)).filter(n => n.id !== view.configId && n.parent !== view.configId).map(n => toFrontNode(view, n)).filter(Boolean);
    const storage = {};
    for (const n of await view.fs.tree(principal, view.configId, { content: true })) {
      if (n.parent !== view.configId || n.type !== 'file') continue;
      try { storage[n.name] = JSON.parse(n.content?.toString('utf8') ?? ''); } catch { /* damaged: lilOS uses its default */ }
    }
    return {
      user: { id: principal.id, username: principal.username, name: principal.name, role: principal.role },
      fresh: !nodes.length && !Object.keys(storage).length,
      nodes,
      storage,
      apps: (await kernel.installer.list()).map(a => visible(a, principal)),
      appSecurity: await kernel.installer.security(),
    };
  });

  router.add('POST', '/api/fs/sync', async ({ principal, json }) => {
    const view = await openHome(kernel, principal);
    const { put = [], remove = [] } = await json(8 << 20);
    if (!Array.isArray(put) || !Array.isArray(remove) || put.length + remove.length > MAX_NODES) fail('invalid', 'Modifiche non valide');
    await view.fs.apply(principal, { put: put.map(n => toBackNode(view, n)), remove: remove.map(id => view.toBack(id)) });
  });

  router.add('GET', '/api/fs/content/:id', async ({ principal, params }) => {
    const view = await openHome(kernel, principal);
    return (await view.fs.read(principal, view.toBack(params.id))).toString('utf8');
  });

  router.add('PUT', '/api/fs/content/:id', async ({ req, principal, params }) => {
    const view = await openHome(kernel, principal);
    await view.fs.write(principal, view.toBack(params.id), await readBody(req, MAX_CONTENT));
  });

  router.add('POST', '/api/storage', async ({ principal, json }) => {
    const view = await openHome(kernel, principal);
    const { set = {}, remove = [] } = await json(8 << 20);
    if (!set || typeof set !== 'object' || Array.isArray(set) || !Array.isArray(remove)) fail('invalid', 'Modifiche non valide');
    const entries = Object.entries(set);
    if (entries.length + remove.length > 500) fail('invalid', 'Troppe chiavi in una volta');
    const now = Date.now();
    const values = entries.map(([key, value]) => {
      const text = JSON.stringify(value) ?? 'null';
      if (text.length > MAX_VALUE) fail('too_large', `Valore troppo grande: ${key}`);
      return { id: view.keyId(key), key, text };
    });
    const existing = new Set((await view.fs.list(principal, view.configId)).map(n => n.id));
    const fresh = values.filter(v => !existing.has(v.id));
    if (fresh.length) {
      await view.fs.apply(principal, { put: fresh.map(v => ({ id: v.id, parent: view.configId, name: v.key, type: 'file', meta: {}, created: now, modified: now })) });
    }
    for (const v of values) await view.fs.write(principal, v.id, Buffer.from(v.text, 'utf8'));
    const gone = remove.map(key => view.keyId(key)).filter(id => existing.has(id));
    if (gone.length) await view.fs.remove(principal, gone);
  });
}
