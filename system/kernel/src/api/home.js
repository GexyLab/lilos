import { fail } from '../errors.js';
import { send, sendStream } from '../http.js';
import { visible } from './apps.js';
import { defineStrings } from '../strings.js';

/**
 * lilOS (the desktop) works on the user's home through these endpoints. It knows nodes by its own
 * ids ('root' is the home, 'trash' the trash root); here they become ids of the fs service, kept
 * apart per user: '<home id>/<id>'. Under the home:
 *
 *   .trash     the trash root of lilOS
 *   .config    lilOS's settings and preferences: one file per key, JSON
 *
 *   GET  /api/boot                 { user, home, fresh, nodes, storage, apps, appSecurity, net }   everything lilOS needs to start
 *                                  (net: the network connections, as GET /api/net gives them)
 *                                  (home: the path of the home in the file system, '/home/<user>')
 *   POST /api/fs/sync              { put: [node], remove: [id] }     one transaction
 *   GET  /api/fs/content/:id       text of a file, at most files.maxText (?raw=1: its bytes, as a stream)
 *   PUT  /api/fs/content/:id       saves the content of a file, text or bytes, as it comes: as a stream,
 *                                  checked against files.maxFileSize and the user's space (files.js)
 *   GET  /api/fs/limits            the limits that count for the user, their quota and space used
 *   POST /api/fs/uploads           { id, size } → { upload, received, piece }   a big file in pieces (files.js)
 *   GET  /api/fs/uploads/:upload   { received, size }
 *   PUT  /api/fs/uploads/:upload?offset=N   a piece → { received } or, the last one, { received, done: true }
 *   DELETE /api/fs/uploads/:upload
 *   POST /api/storage              { set: { key: value }, remove: [key] }
 *
 * Access control is the fs module's: these only translate ids and check the shape of the data.
 *
 * A link of lilOS (type 'link', to a file or a folder) is kept by the fs service as a shortcut:
 * type 'app' with `link` in its metadata. Shortcuts have no content, and the kernel's own users of
 * the tree (transfers, apps' services) already leave them alone; the fs modules need no new type.
 */
export const FRONT_ID = /^[\w-]{1,64}$/;
const KEY = /^[\w:.-]{1,120}$/;
const TYPES = new Set(['folder', 'file', 'app', 'link']);
const META = ['color', 'app', 'link', 'system', 'workspace', 'private', 'tags', 'trashed', 'apps'];
const MAX_NODES = 5000;
const MAX_META = 4 << 10;
const MAX_VALUE = 512 << 10;
const { t } = defineStrings('lilos:kernel.api.home', { en: { strings: {
  signIn: 'Sign in first', id: 'Identifier not valid', key: 'Key not valid: {key}', tooLarge: 'Value too large: {key}',
  changes: 'Changes not valid', item: 'Item not valid', itemData: 'Too much data in an item', tooMany: 'Too many keys at once',
} } });

const finite = v => Number.isFinite(v);

class HomeView {
  constructor(fs, principal, home, store) {
    this.fs = fs;
    // lilOS's own data (.config): written past the user's quota too, or lilOS could not save its state
    this.store = store;
    this.principal = principal;
    this.homeId = home.id;
    this.homePath = home.path;
    this.trashId = `${this.homeId}/~trash`;
    this.configId = `${this.homeId}/~config`;
  }

  toBack(id, { parent = false } = {}) {
    if (parent && id === 'root') return this.homeId;
    if (parent && id === 'trash') return this.trashId;
    if (typeof id !== 'string' || !FRONT_ID.test(id) || id === 'root' || id === 'trash') fail('invalid', t('id'));
    return `${this.homeId}/${id}`;
  }

  toFront(id) {
    if (id === this.homeId) return 'root';
    if (id === this.trashId) return 'trash';
    const prefix = `${this.homeId}/`;
    return id.startsWith(prefix) && FRONT_ID.test(id.slice(prefix.length)) ? id.slice(prefix.length) : null;
  }

  keyId(key) {
    if (typeof key !== 'string' || !KEY.test(key)) fail('invalid', t('key', { key: String(key).slice(0, 40) }));
    return `${this.configId}/${key}`;
  }
}

const ensured = new Set();

export async function openHome(kernel, principal) {
  if (!principal) fail('unauthorized', t('signIn'));
  const fs = kernel.service('fs');
  const home = await fs.home(principal);
  const view = new HomeView(fs, principal, home, kernel.fsBase ?? fs);
  if (home.created || !ensured.has(home.id)) {
    const now = Date.now();
    const folder = (id, name) => ({ id, parent: home.id, name, type: 'folder', meta: {}, created: now, modified: now });
    const missing = [];
    if (!(await fs.stat(principal, view.trashId))) missing.push(folder(view.trashId, '.trash'));
    if (!(await fs.stat(principal, view.configId))) missing.push(folder(view.configId, '.config'));
    if (missing.length) await fs.apply(principal, { put: missing });
    ensured.add(home.id);
    // A new user starts with the settings of the installation (lilos-install.json, firstStart.js)
    const start = kernel.install?.settings;
    if (home.created && start && Object.keys(start).length && !(await fs.stat(principal, view.keyId('settings')))) {
      await writeKey(view, principal, 'settings', start);
    }
  }
  return view;
}

/** A key of the user's .config (what lilOS's storage keeps), or `fallback` when missing or damaged. */
export async function readUserKey(kernel, principal, key, fallback = null) {
  const view = await openHome(kernel, principal);
  try {
    return JSON.parse((await view.fs.read(principal, view.keyId(key))).toString('utf8'));
  } catch {
    return fallback;
  }
}

/** Writes a key of the user's .config (JSON, at most 512 KB). lilOS sees it after it reloads. */
export async function writeUserKey(kernel, principal, key, value) {
  await writeKey(await openHome(kernel, principal), principal, key, value);
}

async function writeKey(view, principal, key, value) {
  const text = JSON.stringify(value) ?? 'null';
  if (text.length > MAX_VALUE) fail('too_large', t('tooLarge', { key }));
  const id = view.keyId(key);
  if (!(await view.fs.stat(principal, id))) {
    const now = Date.now();
    await view.fs.apply(principal, { put: [{ id, parent: view.configId, name: key, type: 'file', meta: {}, created: now, modified: now }] });
  }
  await view.store.write(principal, id, Buffer.from(text, 'utf8'));
}

/** A node whose content an app keeps as its own (content: true in its data: an encrypted file): its keys are never in the kernel. */
export const isProtected = node => Object.values(node?.meta?.apps ?? {}).some(v => v?.content === true);

/** The user's home as lilOS's page has it: its nodes (front ids), the .config folder left out. */
export async function homeNodes(kernel, principal) {
  const view = await openHome(kernel, principal);
  const nodes = (await view.fs.tree(principal, view.homeId)).filter(n => n.id !== view.configId && n.parent !== view.configId).map(n => toFrontNode(view, n)).filter(Boolean);
  return { view, nodes };
}

/** Changes of the tree as lilOS's page sends them ({ put: [node], remove: [id] }), in one transaction. */
export async function syncHome(kernel, principal, { put = [], remove = [] } = {}) {
  const view = await openHome(kernel, principal);
  if (!Array.isArray(put) || !Array.isArray(remove) || put.length + remove.length > MAX_NODES) fail('invalid', t('changes'));
  await view.fs.apply(principal, { put: put.map(n => toBackNode(view, n)), remove: remove.map(id => view.toBack(id)) });
  return view;
}

/** A node from lilOS → a node for the fs service. */
function toBackNode(view, n) {
  if (!n || typeof n !== 'object') fail('invalid', t('item'));
  if (!TYPES.has(n.type) || typeof n.name !== 'string' || !finite(n.created) || !finite(n.modified)) fail('invalid', t('item'));
  const meta = {};
  for (const k of META) if (n[k] !== undefined) meta[k] = n[k];
  if (n.type === 'link' ? !meta.link || typeof meta.link !== 'object' || Array.isArray(meta.link) : 'link' in meta) fail('invalid', t('item'));
  if (JSON.stringify(meta).length > MAX_META) fail('too_large', t('itemData'));
  const type = n.type === 'link' ? 'app' : n.type;
  return { id: view.toBack(n.id), parent: view.toBack(n.parent, { parent: true }), name: n.name, type, meta, created: n.created, modified: n.modified };
}

/** A node of the fs service → a node of lilOS, or null for the ones lilOS does not see as nodes. */
export function toFrontNode(view, n) {
  const id = view.toFront(n.id), parent = view.toFront(n.parent);
  if (!id || id === 'root' || id === 'trash' || !parent) return null;
  return {
    ...(n.meta && typeof n.meta === 'object' ? n.meta : {}),
    id, parent, type: n.type === 'app' && n.meta?.link ? 'link' : n.type, name: n.name, created: n.created, modified: n.modified,
    ...(n.type === 'file' && { size: n.size }),
  };
}

export function homeRoutes(kernel) {
  const { router } = kernel;

  router.add('GET', '/api/boot', async ({ principal }) => {
    const { view, nodes } = await homeNodes(kernel, principal);
    const storage = {};
    for (const n of await view.fs.tree(principal, view.configId, { content: true })) {
      if (n.parent !== view.configId || n.type !== 'file') continue;
      try { storage[n.name] = JSON.parse(n.content?.toString('utf8') ?? ''); } catch { /* damaged: lilOS uses its default */ }
    }
    return {
      user: { id: principal.id, username: principal.username, name: principal.name, role: principal.role },
      home: view.homePath,
      fresh: !nodes.length && !Object.keys(storage).length,
      nodes,
      storage,
      apps: (await kernel.dependencies.withUnmet(await kernel.installer.list())).map(a => visible(a, principal)),
      appSecurity: await kernel.installer.security(),
      net: await kernel.network.list(principal),
    };
  });

  // Only the tree of the home, again (the command lilos before each line: what others changed meanwhile)
  router.add('GET', '/api/fs/tree', async ({ principal }) => {
    const { view, nodes } = await homeNodes(kernel, principal);
    const [tags, locale] = await Promise.all([readUserKey(kernel, principal, 'tags', []), readUserKey(kernel, principal, 'locale', null)]);
    return { home: view.homePath, nodes, tags: Array.isArray(tags) ? tags : [], locale: typeof locale === 'string' ? locale : null };
  });

  router.add('POST', '/api/fs/sync', async ({ req, principal, json }) => {
    const changes = await json(8 << 20) ?? {};
    await syncHome(kernel, principal, changes);
    // From the command lilos (no page of its own): the user's open pages get the changes, as from a service
    if (req.headers['x-lilos-client'] === 'cli') {
      const put = Array.isArray(changes.put) ? changes.put : [];
      const remove = Array.isArray(changes.remove) ? changes.remove : [];
      const trash = put.filter(n => n?.parent === 'trash' && n.trashed).map(n => ({ id: n.id, at: n.trashed.at, from: n.trashed.from }));
      kernel.events.emit('user', { owner: principal.id, event: 'fs.external', data: { put: put.filter(n => n?.parent !== 'trash'), remove, trash } });
    }
  });

  router.add('GET', '/api/fs/content/:id', async ({ res, principal, params, query }) => {
    const view = await openHome(kernel, principal);
    const id = view.toBack(params.id);
    if (query.get('raw') === '1' && view.fs.readStream) {
      const node = await view.fs.stat(principal, id);
      return sendStream(res, await view.fs.readStream(principal, id), node ? { 'Content-Length': String(node.size) } : {});
    }
    if (query.get('raw') !== '1') kernel.fileLimits.checkText((await view.fs.stat(principal, id))?.size ?? 0);
    const data = await view.fs.read(principal, id);
    if (query.get('raw') !== '1') return data.toString('utf8');
    send(res, 200, data, { 'Content-Type': 'application/octet-stream' });
  });

  // As a stream: the kernel never holds the file (files.js counts it against the limits)
  router.add('PUT', '/api/fs/content/:id', async ({ req, principal, params }) => {
    const view = await openHome(kernel, principal);
    const length = Number(req.headers['content-length']);
    const controller = new AbortController();
    req.on('close', () => { if (!req.complete) controller.abort(); });
    await view.fs.writeFrom(principal, view.toBack(params.id), req, { signal: controller.signal, ...(Number.isSafeInteger(length) && length >= 0 && { size: length }) });
  });

  router.add('GET', '/api/fs/limits', async ({ principal }) => {
    if (!principal) fail('unauthorized', t('signIn'));
    return kernel.fileLimits.limitsFor(principal);
  });

  const uploadId = params => (/^[\w-]{1,64}$/.test(params.upload) ? params.upload : fail('invalid', t('id')));

  router.add('POST', '/api/fs/uploads', async ({ principal, json }) => {
    const view = await openHome(kernel, principal);
    const { id, size } = await json(4 << 10);
    return kernel.uploads.start(principal, view.fs, view.toBack(id), size);
  });

  router.add('GET', '/api/fs/uploads/:upload', async ({ principal, params }) => {
    if (!principal) fail('unauthorized', t('signIn'));
    return kernel.uploads.status(principal, uploadId(params));
  });

  router.add('PUT', '/api/fs/uploads/:upload', async ({ req, principal, params, query }) => {
    if (!principal) fail('unauthorized', t('signIn'));
    const offset = Number(query.get('offset') ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0) fail('invalid', t('id'));
    return kernel.uploads.piece(principal, uploadId(params), offset, req);
  });

  router.add('DELETE', '/api/fs/uploads/:upload', async ({ principal, params }) => {
    if (!principal) fail('unauthorized', t('signIn'));
    kernel.uploads.cancel(principal, uploadId(params));
  });

  router.add('POST', '/api/storage', async ({ principal, json }) => {
    const view = await openHome(kernel, principal);
    const { set = {}, remove = [] } = await json(8 << 20);
    if (!set || typeof set !== 'object' || Array.isArray(set) || !Array.isArray(remove)) fail('invalid', t('changes'));
    const entries = Object.entries(set);
    if (entries.length + remove.length > 500) fail('invalid', t('tooMany'));
    const now = Date.now();
    const values = entries.map(([key, value]) => {
      const text = JSON.stringify(value) ?? 'null';
      if (text.length > MAX_VALUE) fail('too_large', t('tooLarge', { key }));
      return { id: view.keyId(key), key, text };
    });
    const existing = new Set((await view.fs.list(principal, view.configId)).map(n => n.id));
    const fresh = values.filter(v => !existing.has(v.id));
    if (fresh.length) {
      await view.fs.apply(principal, { put: fresh.map(v => ({ id: v.id, parent: view.configId, name: v.key, type: 'file', meta: {}, created: now, modified: now })) });
    }
    for (const v of values) await view.store.write(principal, v.id, Buffer.from(v.text, 'utf8'));
    const gone = remove.map(key => view.keyId(key)).filter(id => existing.has(id));
    if (gone.length) await view.fs.remove(principal, gone);
  });
}
