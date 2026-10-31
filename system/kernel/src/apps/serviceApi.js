import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { KERNEL } from '../services.js';
import { coversPath } from './permissions.js';
import { compareVersions } from './manifest.js';
import { normalizeUrl } from './sources.js';
import { logger } from '../log.js';

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
 *   ui.notify(text)                              a message in the owner's lilOS (system: the admins')
 *   apps.updates()                               → [{ id, name, version, latest, repo }]: installed apps with a newer
 *                                                version in the repository they came from (permission apps.manage)
 *
 * Returns { invoke(method, params) }.
 */
const STORAGE_KEY = /^[\w.-]{1,64}$/;
const HOME_PATH = /^~(\/[^/\0]{1,255}){0,16}$/;
const MAX_TEXT = 10 << 20;
const MAX_VALUE = 256 << 10;
const MAX_SYSTEM_DATA = 1 << 20;
const MAX_FETCH = 5 << 20;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);

const newId = () => randomBytes(9).toString('base64url');
const log = logger('services');

export function serviceApi({ kernel, app, owner, notify, readUserKey, writeUserKey }) {
  const fs = kernel.service('fs');
  const perms = app.manifest.permissions ?? [];
  const user = () => owner ?? fail('forbidden', 'Un servizio di sistema non ha una home: niente file');

  // ---------- Storage ----------
  const dataId = `app:${app.id}/~data`;
  const systemData = async () => {
    try {
      return JSON.parse((await fs.read(KERNEL, dataId)).toString('utf8')) ?? {};
    } catch {
      return {};
    }
  };
  const key = k => (typeof k === 'string' && STORAGE_KEY.test(k) ? k : fail('invalid', 'Chiave non valida'));

  // ---------- Files ----------
  const resolve = async (path, write) => {
    if (typeof path !== 'string' || !HOME_PATH.test(path) || path.split('/').includes('..')) fail('invalid', `Percorso non valido: ${String(path).slice(0, 60)}`);
    if (!coversPath(perms, path, { write })) fail('forbidden', `Permesso negato: ${path}`);
    const home = await fs.home(user());
    return { full: home.path + path.slice(1), home };
  };
  const split = full => [full.slice(0, full.lastIndexOf('/')), full.slice(full.lastIndexOf('/') + 1)];
  const create = async (full, type) => {
    const [dir, name] = split(full);
    const parent = await fs.lookup(owner, dir) ?? fail('not_found', 'La cartella non esiste');
    if (parent.type !== 'folder') fail('invalid', 'Non è una cartella');
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
      if (text.length > MAX_VALUE) fail('too_large', 'Valore troppo grande (al massimo 256 KB)');
      if (owner) return writeUserKey(owner, `app:${app.id}:${k}`, value ?? null);
      const data = { ...(await systemData()), [k]: value ?? null };
      const all = JSON.stringify(data);
      if (all.length > MAX_SYSTEM_DATA) fail('too_large', 'Dati del servizio troppo grandi (al massimo 1 MB)');
      if (!(await fs.stat(KERNEL, dataId))) {
        const now = Date.now();
        await fs.apply(KERNEL, { put: [{ id: dataId, parent: `app:${app.id}`, name: '.data', type: 'file', meta: {}, created: now, modified: now }] });
      }
      await fs.write(KERNEL, dataId, Buffer.from(all, 'utf8'));
    },

    'files.read': async path => {
      const { full } = await resolve(path, false);
      const node = await fs.lookup(owner, full) ?? fail('not_found', 'Il file non esiste');
      if (node.type !== 'file') fail('invalid', 'Non è un file');
      return (await fs.read(owner, node.id)).toString('utf8');
    },
    'files.write': async (path, text) => {
      const { full } = await resolve(path, true);
      const body = String(text ?? '');
      if (body.length > MAX_TEXT) fail('too_large', 'Testo troppo lungo');
      const node = await fs.lookup(owner, full) ?? await create(full, 'file');
      if (node.type !== 'file') fail('invalid', 'Non è un file');
      await fs.write(owner, node.id, Buffer.from(body, 'utf8'));
    },
    'files.list': async path => {
      const { full } = await resolve(path, false);
      const node = await fs.lookup(owner, full) ?? fail('not_found', 'La cartella non esiste');
      if (node.type !== 'folder') fail('invalid', 'Non è una cartella');
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
      try { target = new URL(String(url)); } catch { fail('invalid', 'Indirizzo non valido'); }
      if (!perms.includes(`net:${target.origin}`)) fail('forbidden', `Permesso negato: net:${target.origin}`);
      const opts = options && typeof options === 'object' ? options : {};
      const method = String(opts.method ?? 'GET').toUpperCase();
      if (!METHODS.has(method)) fail('invalid', 'Metodo non permesso');
      const headers = {};
      for (const [k, v] of Object.entries(opts.headers && typeof opts.headers === 'object' ? opts.headers : {})) {
        if (/^[\w-]{1,64}$/.test(k) && !/^(cookie|host)$/i.test(k)) headers[k] = String(v).slice(0, 4096);
      }
      const body = opts.body == null ? undefined : String(opts.body);
      if (body && body.length > MAX_FETCH) fail('too_large', 'Corpo della richiesta troppo grande');
      let res;
      try {
        res = await fetch(target, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
      } catch (err) {
        fail('unavailable', `Rete: ${err.name === 'TimeoutError' ? 'nessuna risposta in 30 secondi' : err.message}`);
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of res.body ?? []) {
        size += chunk.length;
        if (size > MAX_FETCH) fail('too_large', 'Risposta troppo grande (al massimo 5 MB)');
        chunks.push(chunk);
      }
      return { status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.concat(chunks).toString('utf8') };
    },

    'ui.notify': text => notify(String(text ?? '').slice(0, 200)),

    'apps.updates': async () => {
      if (!perms.includes('apps.manage')) fail('forbidden', 'Permesso negato: apps.manage');
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
            out.push({ id: have.id, name: entry.manifest.name, version: have.version, latest: entry.manifest.version, repo: repo.name ?? '' });
          }
        }
      }
      return out;
    },
  };

  return {
    invoke(method, params) {
      const run = typeof method === 'string' && Object.hasOwn(methods, method) ? methods[method] : null;
      if (!run) fail('invalid', `Funzione sconosciuta: ${String(method).slice(0, 40)}`);
      return run(...(Array.isArray(params) ? params : []));
    },
  };
}
