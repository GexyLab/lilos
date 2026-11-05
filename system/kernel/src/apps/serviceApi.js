import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { KERNEL } from '../services.js';
import { coversPath } from './permissions.js';
import { homeNodes, syncHome, isProtected, readUserKey as readKey } from '../api/home.js';
import { compareVersions } from './manifest.js';
import { normalizeUrl } from './sources.js';
import { logger } from '../log.js';
import { defineStrings, localize } from '../strings.js';

/**
 * The lilos API of a service (see appServices.js): what it may ask of the kernel, each request
 * checked against its app's permissions and done for its owner — the user it runs for, or nobody
 * (a system service: no home, only its own data and the network).
 *
 *   storage.get(key) / storage.set(key, value)   the app's own data. For a user: the same keys its
 *                                                windows see (app:<id>:<key> in .config; lilOS reads
 *                                                them again when it reloads). For the system: a file
 *                                                in the app's folder, removed with the app.
 *   files.read(path) / files.write(path, text) / files.list(path) / files.mkdir(path)
 *                                                '~/…' paths, with fs.read / fs.write; users only
 *   net.fetch(url, { method, headers, body })    → { status, headers, body }: only the origins of its
 *                                                net: permissions, no redirects followed, text, 5 MB, 30 s
 *   ui.notify(text | { text, level, action })    a notification for the owner (system: for the admins);
 *                                                see api/notifications.js
 *   apps.updates()                               → [{ id, name, version, latest, repo }]: installed apps with a newer
 *                                                version in the repository they came from (permission apps.manage)
 *   home.load() → { home, nodes, tags }          the whole home as lilOS's page has it (nodes with front ids, the
 *                                                tag definitions), for a service that works on it as the page does
 *                                                (the Terminal's shell): permission fs.read:~ or fs.write:~
 *   home.sync({ put, remove })                   changes of the tree, as the page sends them (fs.write:~); the
 *                                                user's open pages see them ('fs.external')
 *   home.read(id) → { base64 } / home.write(id, { base64 } | { text })   a file's content by its id (front id).
 *                                                Not a file an app protects (content: true in its data: an
 *                                                encrypted one): its keys are never in the kernel
 *
 * Besides the requests, the service has lilos.locale ({ code, i18n }, as in lilOS: the SDK's
 * i18n.js): its strings in its user's language (English for the system), as they were when it started.
 *
 * The kernel's errors reach the service in the language of its user (`locale`: their code, 'en' for
 * the system), see appServices.js.
 *
 * Returns { invoke(method, params) }.
 */
const STORAGE_KEY = /^[\w.-]{1,64}$/;
const HOME_PATH = /^~(\/[^/\0]{1,255}){0,16}$/;
const MAX_VALUE = 256 << 10;
const MAX_SYSTEM_DATA = 1 << 20;
const MAX_FETCH = 5 << 20;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);

const newId = () => randomBytes(9).toString('base64url');
const { t } = defineStrings('lilos:kernel.serviceApi', { en: { strings: {
  noHome: 'A system service has no home: no files', key: 'Key not valid', path: 'Path not valid: {path}',
  denied: 'Permission denied: {permission}', id: 'Identifier not valid', noFile: 'The file does not exist', notFile: 'It is not a file',
  protected: '«{name}» is protected by an app (encrypted, for example): it opens only in the browser',
  protectedWrite: '«{name}» is protected by an app (encrypted, for example): it is not overwritten',
  noFolder: 'The folder does not exist', notFolder: 'It is not a folder', valueTooLarge: 'Value too large (at most 256 KB)',
  dataTooLarge: 'Data of the service too large (at most 1 MB)', textTooLong: 'Text too long', address: 'Address not valid',
  method: 'Method not allowed', bodyTooLarge: 'Request body too large', network: 'Network: {message}',
  timeout: 'Network: no answer in 30 seconds', answerTooLarge: 'Response too large (at most 5 MB)', fileTooLarge: 'File too large',
  unknown: 'Unknown function: {name}',
} } });
const log = logger('services');

export function serviceApi({ kernel, app, owner, notify, readUserKey, writeUserKey, locale = 'en' }) {
  const fs = kernel.service('fs');
  const perms = app.manifest.permissions ?? [];
  const user = () => owner ?? fail('forbidden', t('noHome'));

  // ---------- Storage ----------
  const dataId = `app:${app.id}/~data`;
  const systemData = async () => {
    try {
      return JSON.parse((await fs.read(KERNEL, dataId)).toString('utf8')) ?? {};
    } catch {
      return {};
    }
  };
  const key = k => (typeof k === 'string' && STORAGE_KEY.test(k) ? k : fail('invalid', t('key')));

  // ---------- Files ----------
  const resolve = async (path, write) => {
    if (typeof path !== 'string' || !HOME_PATH.test(path) || path.split('/').includes('..')) fail('invalid', t('path', { path: String(path).slice(0, 60) }));
    if (!coversPath(perms, path, { write })) fail('forbidden', t('denied', { permission: path }));
    const home = await fs.home(user());
    return { full: home.path + path.slice(1), home };
  };
  const split = full => [full.slice(0, full.lastIndexOf('/')), full.slice(full.lastIndexOf('/') + 1)];
  /** A file of the owner's home by its front id, unless an app protects its content. */
  const ownNode = async id => {
    if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) fail('invalid', t('id'));
    const home = await fs.home(user());
    const node = await fs.stat(owner, `${home.id}/${id}`) ?? fail('not_found', t('noFile'));
    if (node.type !== 'file') fail('invalid', t('notFile'));
    if (isProtected(node)) fail('forbidden', t('protected', { name: node.name }));
    return node;
  };
  const create = async (full, type) => {
    const [dir, name] = split(full);
    const parent = await fs.lookup(owner, dir) ?? fail('not_found', t('noFolder'));
    if (parent.type !== 'folder') fail('invalid', t('notFolder'));
    const home = await fs.home(owner);
    const now = Date.now();
    const node = { id: `${home.id}/${newId()}`, parent: parent.id, name, type, meta: {}, created: now, modified: now };
    await fs.apply(owner, { put: [node] });
    return node;
  };

  const methods = {
    'storage.get': async k => {
      key(k);
      if (owner) return readUserKey(owner, `app:${app.id}:${k}`, null);
      return (await systemData())[k] ?? null;
    },
    'storage.set': async (k, value) => {
      key(k);
      const text = JSON.stringify(value ?? null);
      if (text.length > MAX_VALUE) fail('too_large', t('valueTooLarge'));
      if (owner) return writeUserKey(owner, `app:${app.id}:${k}`, value ?? null);
      const data = { ...(await systemData()), [k]: value ?? null };
      const all = JSON.stringify(data);
      if (all.length > MAX_SYSTEM_DATA) fail('too_large', t('dataTooLarge'));
      if (!(await fs.stat(KERNEL, dataId))) {
        const now = Date.now();
        await fs.apply(KERNEL, { put: [{ id: dataId, parent: `app:${app.id}`, name: '.data', type: 'file', meta: {}, created: now, modified: now }] });
      }
      await fs.write(KERNEL, dataId, Buffer.from(all, 'utf8'));
    },

    'files.read': async path => {
      const { full } = await resolve(path, false);
      const node = await fs.lookup(owner, full) ?? fail('not_found', t('noFile'));
      if (node.type !== 'file') fail('invalid', t('notFile'));
      if (isProtected(node)) fail('forbidden', t('protected', { name: node.name }));
      return (await fs.read(owner, node.id)).toString('utf8');
    },
    'files.write': async (path, text) => {
      const { full } = await resolve(path, true);
      const body = String(text ?? '');
      if (body.length > kernel.settings.limit('files.maxText')) fail('too_large', t('textTooLong'));
      const node = await fs.lookup(owner, full) ?? await create(full, 'file');
      if (node.type !== 'file') fail('invalid', t('notFile'));
      if (isProtected(node)) fail('forbidden', t('protectedWrite', { name: node.name }));
      await fs.write(owner, node.id, Buffer.from(body, 'utf8'));
    },
    'files.list': async path => {
      const { full } = await resolve(path, false);
      const node = await fs.lookup(owner, full) ?? fail('not_found', t('noFolder'));
      if (node.type !== 'folder') fail('invalid', t('notFolder'));
      return (await fs.list(owner, node.id))
        .filter(n => !n.name.startsWith('.'))
        .map(n => ({ name: n.name, type: n.type, size: n.size ?? 0, modified: n.modified }));
    },
    'files.mkdir': async path => {
      const { full } = await resolve(path, true);
      if (await fs.lookup(owner, full)) return;
      await create(full, 'folder');
    },

    'net.fetch': async (url, options = {}) => {
      let target;
      try { target = new URL(String(url)); } catch { fail('invalid', t('address')); }
      if (!perms.includes(`net:${target.origin}`)) fail('forbidden', t('denied', { permission: `net:${target.origin}` }));
      const opts = options && typeof options === 'object' ? options : {};
      const method = String(opts.method ?? 'GET').toUpperCase();
      if (!METHODS.has(method)) fail('invalid', t('method'));
      const headers = {};
      for (const [k, v] of Object.entries(opts.headers && typeof opts.headers === 'object' ? opts.headers : {})) {
        if (/^[\w-]{1,64}$/.test(k) && !/^(cookie|host)$/i.test(k)) headers[k] = String(v).slice(0, 4096);
      }
      const body = opts.body == null ? undefined : String(opts.body);
      if (body && body.length > MAX_FETCH) fail('too_large', t('bodyTooLarge'));
      let res;
      try {
        res = await fetch(target, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
      } catch (err) {
        fail('unavailable', err.name === 'TimeoutError' ? t('timeout') : t('network', { message: err.message }));
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of res.body ?? []) {
        size += chunk.length;
        if (size > MAX_FETCH) fail('too_large', t('answerTooLarge'));
        chunks.push(chunk);
      }
      return { status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.concat(chunks).toString('utf8') };
    },

    'home.load': async () => {
      if (!coversPath(perms, '~', { write: false })) fail('forbidden', t('denied', { permission: 'fs.read:~' }));
      const { view, nodes } = await homeNodes(kernel, user());
      const tags = await readKey(kernel, owner, 'tags', []);
      return { home: view.homePath, nodes, tags: Array.isArray(tags) ? tags : [] };
    },
    'home.sync': async (body = {}) => {
      if (!coversPath(perms, '~', { write: true })) fail('forbidden', t('denied', { permission: 'fs.write:~' }));
      const changes = body && typeof body === 'object' ? body : {};
      const put = Array.isArray(changes.put) ? changes.put : [];
      const remove = Array.isArray(changes.remove) ? changes.remove : [];
      await syncHome(kernel, user(), { put, remove });
      // The user's open pages: new and changed nodes, the ones gone and the ones put in the trash
      const trash = put.filter(n => n?.parent === 'trash' && n.trashed).map(n => ({ id: n.id, at: n.trashed.at, from: n.trashed.from }));
      kernel.events.emit('user', { owner: owner.id, event: 'fs.external', data: { put: put.filter(n => n?.parent !== 'trash'), remove, trash } });
    },
    'home.read': async id => {
      if (!coversPath(perms, '~', { write: false })) fail('forbidden', t('denied', { permission: 'fs.read:~' }));
      const node = await ownNode(id);
      return { base64: (await fs.read(owner, node.id)).toString('base64') };
    },
    'home.write': async (id, data = {}) => {
      if (!coversPath(perms, '~', { write: true })) fail('forbidden', t('denied', { permission: 'fs.write:~' }));
      const node = await ownNode(id);
      const body = typeof data?.base64 === 'string' ? Buffer.from(data.base64, 'base64') : Buffer.from(String(data?.text ?? ''), 'utf8');
      // Whole in memory (the service's message): at most files.maxReadWhole; size and space are the fs guard's
      if (body.length > kernel.settings.limit('files.maxReadWhole')) fail('too_large', t('fileTooLarge'));
      await fs.write(owner, node.id, body);
    },

    'ui.notify': value => notify(value !== null && typeof value === 'object' ? value : String(value ?? '')),

    'apps.updates': async () => {
      if (!perms.includes('apps.manage')) fail('forbidden', t('denied', { permission: 'apps.manage' }));
      const installed = await kernel.installer.list();
      const out = [];
      for (const repo of await kernel.repos.list()) {
        // Once more before giving up: a repository read at the same moment by someone else can fail once
        const catalog = await kernel.repos.catalog(repo.id).catch(() => kernel.repos.catalog(repo.id)).catch(err => {
          log.warn(`${app.id}: catalogo di ${repo.name ?? repo.url} non letto: ${err.message}`);
          return null;
        });
        for (const entry of catalog?.apps ?? []) {
          const have = entry.manifest && installed.find(a => a.id === entry.manifest.id);
          if (!have?.source?.url || normalizeUrl(have.source.url) !== normalizeUrl(repo.url)) continue;
          if (compareVersions(entry.manifest.version, have.version) > 0) {
            out.push({ id: have.id, name: entry.manifest.name, version: have.version, latest: entry.manifest.version, repo: localize(repo.name ?? '', locale) });
          }
        }
      }
      return out;
    },
  };

  return {
    invoke(method, params) {
      const run = typeof method === 'string' && Object.hasOwn(methods, method) ? methods[method] : null;
      if (!run) fail('invalid', t('unknown', { name: String(method).slice(0, 40) }));
      return run(...(Array.isArray(params) ? params : []));
    },
  };
}
