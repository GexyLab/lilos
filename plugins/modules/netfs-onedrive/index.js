import { createReadStream, createWriteStream } from 'node:fs';
import { rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { netError } from './lib/shared/errors.js';
import { fetcher, bearerCall } from './lib/shared/cloud.js';
import { chunks, skipFirst } from './lib/shared/streams.js';
import { folderParts, under } from './lib/shared/paths.js';
import { sleep, retryDelay } from './lib/shared/time.js';
import { needPaths, needKernel } from './lib/shared/kernel.js';

/**
 * OneDrive for the Rete folder (service 'netfs.onedrive', see the kernel's net/drivers.js): the
 * user's own OneDrive, personal or of work or school, through Microsoft Graph.
 *
 * Sign-in: the kernel's (`oauth`, net/oauth.js), with the Microsoft app each lilOS installation
 * registers on Azure as a public client, set once for every protocol in Control Panel → Microsoft
 * app. The refresh token is the connection's secret; connect() gets the access token from
 * ctx.tokens, which the kernel renews (and keeps the new refresh token Microsoft gives).
 *
 * Shared folders: Graph's list of what others shared (sharedWithMe) stops working in November
 * 2026, so the folders shared with the user open through their shortcuts, the ones added to "My
 * files" on onedrive.com: with the `shared` setting on, a shortcut is a folder of the connection
 * and what is inside it is read on the drive it points to (that needs Files.ReadWrite.All).
 *
 * Downloads resume (Range); uploads start over (an upload session cannot add to a file). Removing
 * sends to OneDrive's recycle bin. Settings (the module's configuration, Control Panel → OneDrive):
 *   shared     open the shared folders added as shortcuts (asks for Files.ReadWrite.All)
 * For tests only: graphUrl replaces Microsoft's address.
 */
const SIMPLE_MAX = 4 << 20;                  // bigger files go by upload session
const CHUNK = 320 * 1024 * 32;               // 10 MiB: upload pieces are multiples of 320 KiB
const RETRIES = 3;                           // throttled (429, 503) or broken requests, tried again
const MAX_WAIT = 30_000;                     // longest Retry-After honored
const MAX_PAGES = 200;                       // 200 × 999 entries in a folder, at most
const SELECT = 'name,size,folder,file,package,remoteItem,lastModifiedDateTime';
const FORBIDDEN = /["*:<>?\\|\u0000-\u001f]/;
const RESERVED = /^(\.lock|con|prn|aux|nul|com\d|lpt\d|desktop\.ini|_vti_.*)$/i;

const label = (en, it) => ({ en, it });

let conf = {};
let moduleCtx = null;

const graphBase = () => String(conf.graphUrl || 'https://graph.microsoft.com/v1.0').replace(/\/+$/, '');
const sharedOn = () => conf.shared === true;

/** What the sign-in asks Microsoft for (the kernel adds offline_access, openid, profile). */
const scopes = () => ['User.Read', sharedOn() ? 'Files.ReadWrite.All' : 'Files.ReadWrite'];

/** '/a b/c' → '/a%20b/c' (each part encoded, ':' and '#' too). */
const encodePath = path => path.split('/').map(encodeURIComponent).join('/');

/** A folder of OneDrive as the user writes it ('Lavoro/2026/') → '/Lavoro/2026'; '/' for all of it. */
export const cleanRoot = raw => `/${folderParts(raw, 'Cartella di OneDrive non valida', FORBIDDEN).join('/')}`;

/** A name OneDrive accepts for a new file or folder. Throws 'invalid'. */
function checkName(name) {
  if (FORBIDDEN.test(name)) throw netError('invalid', `OneDrive non accetta questi caratteri nei nomi: " * : < > ? \\ | («${name}»)`);
  if (RESERVED.test(name) || name.startsWith('~$')) throw netError('invalid', `OneDrive non accetta il nome «${name}»`);
  if (/^\s|[\s.]$/.test(name)) throw netError('invalid', `OneDrive non accetta nomi che iniziano con uno spazio o finiscono con uno spazio o un punto («${name}»)`);
}

/** fetch with a time limit until the answer starts (the body may then take its time). */
const timedFetch = fetcher('OneDrive');

// ---------- Graph ----------

/** A Graph error → an error with `net`. */
async function graphError(res) {
  const body = await res.json().catch(() => null);
  const code = String(body?.error?.code ?? '');
  const said = String(body?.error?.message ?? '').split(/\r?\n/)[0].slice(0, 240);
  const text = said || `errore ${res.status}`;
  switch (res.status) {
    case 401: return netError('auth', `Accesso a OneDrive non più valido (${text})`);
    case 403: return netError('denied', text);
    case 404: return netError('not_found', 'Non esiste su OneDrive');
    case 409: case 412: return netError('exists', text);
    case 423: return netError('denied', `Elemento bloccato: forse è aperto in Office (${text})`);
    case 507: return netError('denied', 'Spazio esaurito su OneDrive');
    case 400: return netError(code === 'notSupported' ? 'unsupported' : 'invalid', text);
    default: return netError(res.status >= 500 || res.status === 429 ? 'unreachable' : 'invalid', text);
  }
}

const retryAfter = (res, attempt) => retryDelay(res.headers.get('retry-after'), attempt, MAX_WAIT);

class Session {
  resume = { read: true, write: false };
  #tokens; #root; #paths;
  #anchors = new Map();   // full path (lower case) of a shortcut → { driveId, id }

  constructor(tokens, root, paths) {
    this.#tokens = tokens;
    this.#root = root;
    this.#paths = paths;
  }

  /** A Graph request: `path` after the API address (or a whole address from Graph itself). */
  async #graph(method, path, { body, headers = {}, signal, raw = false } = {}) {
    const url = /^https?:\/\//.test(path) ? path : `${graphBase()}${path}`;
    if (!url.startsWith(`${graphBase()}/`) && !url.startsWith(graphBase().replace(/\/v1\.0$/, '/'))) throw netError('invalid', 'Indirizzo di Graph inatteso');
    return bearerCall(url, { method, body, signal, raw, headers: { Accept: 'application/json', ...headers } }, {
      tokens: this.#tokens, fetch: timedFetch, error: graphError, retries: RETRIES,
      retryable: res => [429, 502, 503, 504].includes(res.status),
    });
  }

  // ---------- Addresses (shortcuts included) ----------

  #full(path) {
    return under(this.#root, path);
  }

  /**
   * The Graph address of a path of the connection. Inside a shortcut (shared folder) it goes by the
   * drive the shortcut points to. follow false: a shortcut itself (to rename or remove it), not
   * what it points to.
   */
  #url(path, opts) {
    return this.#address(this.#full(path), opts);
  }

  /** #url for a full path (from the top of the OneDrive, not of the connection). */
  #address(full, { follow = true } = {}) {
    const key = full.toLowerCase();
    let best = null;
    for (const [p, target] of this.#anchors) {
      if ((key === p && follow) || key.startsWith(`${p}/`)) if (!best || p.length > best.p.length) best = { p, target };
    }
    if (!best) return full === '/' ? '/me/drive/root' : `/me/drive/root:${encodePath(full)}:`;
    const base = `/drives/${encodeURIComponent(best.target.driveId)}/items/${encodeURIComponent(best.target.id)}`;
    const rest = full.slice(best.p.length);
    return rest ? `${base}:${encodePath(rest)}:` : base;
  }

  /** The drive a path is on (its shortcut's, or the user's: null). */
  #driveOf(path, opts) {
    const m = /^\/drives\/([^/]+)\/items\//.exec(this.#url(path, opts));
    return m ? decodeURIComponent(m[1]) : null;
  }

  /** Remembers the shortcuts among the entries of a folder (full path of the folder). */
  #learn(fullFolder, items) {
    if (!sharedOn()) return;
    for (const it of items) {
      const target = it.remoteItem;
      if (!target?.folder || !target.id || !target.parentReference?.driveId || typeof it.name !== 'string') continue;
      this.#anchors.set(under(fullFolder, `/${it.name}`).toLowerCase(), { driveId: target.parentReference.driveId, id: target.id });
    }
  }

  /**
   * Runs fn(); if a path was not found and shortcuts are on, reads the folders on the way to it
   * (a shortcut there is learned) and runs it once more.
   */
  async #findAnd(path, fn) {
    try {
      return await fn();
    } catch (err) {
      if (err.net !== 'not_found' || !sharedOn() || !await this.#discover(path)) throw err;
      return fn();
    }
  }

  /** Reads the folders above `path` to find the shortcuts it goes through; true if one was new. */
  async #discover(path) {
    const parts = this.#full(path).split('/').filter(Boolean);
    let found = false, at = '/';
    for (const part of parts.slice(0, -1)) {
      const next = under(at, `/${part}`);
      if (!this.#anchors.has(next.toLowerCase())) {
        const items = await this.#children(this.#address(at)).catch(() => null);
        if (!items) return found;
        const hit = items.find(i => i.name?.toLowerCase() === part.toLowerCase());
        if (!hit) return found;
        if (hit.remoteItem?.folder) { this.#learn(at, [hit]); found = true; }
      }
      at = next;
    }
    return found;
  }

  async #children(itemUrl) {
    const out = [];
    let next = `${itemUrl}/children?$top=999&$select=${SELECT}`;
    for (let page = 0; next && page < MAX_PAGES; page++) {
      const body = await this.#graph('GET', next);
      out.push(...(Array.isArray(body?.value) ? body.value : []));
      next = typeof body?.['@odata.nextLink'] === 'string' ? body['@odata.nextLink'] : null;
    }
    return out;
  }

  #entry(it, name = it.name) {
    const target = it.remoteItem;
    const folder = !!(it.folder || target?.folder);
    return {
      name, type: folder ? 'folder' : 'file',
      size: folder ? 0 : Number(target?.size ?? it.size) || 0,
      modified: Date.parse(target?.lastModifiedDateTime ?? it.lastModifiedDateTime) || 0,
    };
  }

  // ---------- The driver's session ----------

  async list(path) {
    return this.#findAnd(path, async () => {
      const items = await this.#children(this.#url(path));
      this.#learn(this.#full(path), items);
      // Shortcuts to what others shared: only with the setting on (they need Files.ReadWrite.All)
      return items.filter(it => sharedOn() || !it.remoteItem).map(it => this.#entry(it));
    });
  }

  async stat(path) {
    try {
      return await this.#findAnd(path, async () => {
        const it = await this.#graph('GET', `${this.#url(path)}?$select=${SELECT}`);
        return this.#entry(it, path === '/' ? it.name : this.#paths.baseName(path));
      });
    } catch (err) {
      if (err.net === 'not_found') return null;
      throw err;
    }
  }

  async read(path, { start = 0, signal } = {}) {
    const res = await this.#findAnd(path, () => this.#graph('GET', `${this.#url(path)}/content`, { signal, raw: true, headers: start > 0 ? { Range: `bytes=${start}-` } : {} }))
      .catch(err => {
        if (err.net === 'not_found' || err.net === 'invalid') {
          return this.#graph('GET', `${this.#url(path)}?$select=package`).then(it => {
            throw it?.package ? netError('unsupported', 'I blocchi appunti di OneNote si aprono solo sul web') : err;
          }, () => { throw err; });
        }
        throw err;
      });
    const stream = Readable.fromWeb(res.body);
    return start > 0 && res.status === 200 ? stream.pipe(skipFirst(start)) : stream;
  }

  async write(path, source, { start = 0, signal, size } = {}) {
    if (start > 0) throw netError('unsupported', 'OneDrive non riprende un invio a metà');
    checkName(this.#paths.baseName(path));
    const held = await hold(source, Number.isSafeInteger(size) ? size : null, signal);
    try {
      await this.#findAnd(path, () => (held.buffer
        ? this.#graph('PUT', `${this.#url(path)}/content`, { body: held.buffer, headers: { 'Content-Type': 'application/octet-stream' }, signal })
        : this.#upload(path, held, signal)));
    } finally {
      if (held.dir) await rm(held.dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /** A big file, in pieces, through an upload session. */
  async #upload(path, held, signal) {
    const session = await this.#graph('POST', `${this.#url(path)}/createUploadSession`, { body: { item: { '@microsoft.graph.conflictBehavior': 'replace' } }, signal });
    const uploadUrl = session?.uploadUrl;
    if (typeof uploadUrl !== 'string' || !/^https?:\/\//.test(uploadUrl)) throw netError('invalid', 'OneDrive non ha aperto la sessione di caricamento');
    try {
      let offset = 0;
      for await (const piece of chunks(createReadStream(held.file), CHUNK)) {
        const end = offset + piece.length - 1;
        for (let attempt = 0; ; attempt++) {
          // The upload address carries its own authorization: no token with it
          const res = await timedFetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${offset}-${end}/${held.size}` }, body: piece }, signal)
            .catch(err => { if (attempt < RETRIES && err.net === 'unreachable') return null; throw err; });
          if (res && (res.ok || res.status === 202)) { await res.body?.cancel().catch(() => {}); break; }
          if (res && ![429, 500, 502, 503, 504].includes(res.status)) throw await graphError(res);
          if (attempt >= RETRIES) throw res ? await graphError(res) : netError('unreachable', 'Invio interrotto');
          await sleep(res ? retryAfter(res, attempt) : 2000, signal);
        }
        offset += piece.length;
      }
      if (offset !== held.size) throw netError('invalid', 'Dimensione del file cambiata durante l’invio');
    } catch (err) {
      timedFetch(uploadUrl, { method: 'DELETE' }).then(r => r.body?.cancel(), () => {});
      throw err;
    }
  }

  async mkdir(path) {
    const { baseName, parentOf } = this.#paths;
    const name = baseName(path);
    checkName(name);
    await this.#findAnd(parentOf(path), () => this.#graph('POST', `${this.#url(parentOf(path))}/children`, {
      body: { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
    }));
  }

  async rename(from, to) {
    const { baseName, parentOf } = this.#paths;
    const name = baseName(to);
    checkName(name);
    const body = { name };
    if (parentOf(from) !== parentOf(to)) {
      const fromDrive = this.#driveOf(from, { follow: false });
      if (fromDrive !== this.#driveOf(to, { follow: false })) {
        throw netError('unsupported', 'Tra il tuo OneDrive e una cartella condivisa non si sposta: copia e poi elimina');
      }
      const parent = await this.#findAnd(parentOf(to), () => this.#graph('GET', `${this.#url(parentOf(to))}?$select=id,parentReference`));
      body.parentReference = { id: parent.id, ...(fromDrive && { driveId: parent.parentReference?.driveId ?? fromDrive }) };
    }
    await this.#findAnd(from, () => this.#graph('PATCH', this.#url(from, { follow: false }), { body }));
    this.#forget(from);
  }

  async remove(path) {
    await this.#findAnd(path, () => this.#graph('DELETE', this.#url(path, { follow: false })));
    this.#forget(path);
  }

  /** A folder and what is inside it, in one request: OneDrive's recycle bin gets it whole. */
  removeTree(path) {
    return this.remove(path);
  }

  async link(path) {
    const it = await this.#findAnd(path, () => this.#graph('GET', `${this.#url(path)}?$select=webUrl`));
    return it?.webUrl;
  }

  /** The space of the OneDrive (its quota). */
  async space() {
    const drive = await this.#graph('GET', '/me/drive?$select=quota');
    return { used: Number(drive?.quota?.used) || 0, total: Number(drive?.quota?.total) || 0 };
  }

  #forget(path) {
    const key = this.#full(path).toLowerCase();
    for (const p of [...this.#anchors.keys()]) if (p === key || p.startsWith(`${key}/`)) this.#anchors.delete(p);
  }

  /** The connection's folder is there (and is a folder). */
  async check() {
    if (this.#root === '/') {
      await this.#graph('GET', '/me/drive?$select=id');
      return;
    }
    const top = await this.stat('/');
    if (!top) throw netError('not_found', `La cartella ${this.#root} non esiste su OneDrive`);
    if (top.type !== 'folder') throw netError('invalid', `${this.#root} non è una cartella`);
  }

  /** The signed-in account: its e-mail address or user name. */
  async me() {
    const body = await this.#graph('GET', '/me?$select=mail,userPrincipalName');
    const who = String(body?.mail || body?.userPrincipalName || '').trim();
    if (!who) throw netError('invalid', 'Microsoft non ha detto chi è l’account');
    return who;
  }

  close() {}
}

/**
 * The bytes to send, held: in memory up to 4 MB ({ buffer }), else in a temporary file
 * ({ file, size, dir }), as an upload session needs the size first and may send a piece twice.
 */
async function hold(source, size, signal) {
  if (size !== null && size <= SIMPLE_MAX) {
    const chunks = [];
    for await (const c of source) chunks.push(c);
    return { buffer: Buffer.concat(chunks) };
  }
  const dir = await mkdtemp(join(tmpdir(), 'lilos-onedrive-'));
  const file = join(dir, 'upload');
  let total = 0;
  const count = new Transform({ transform(chunk, _enc, done) { total += chunk.length; done(null, chunk); } });
  try {
    await pipeline(source, count, createWriteStream(file), { signal });
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
  if (total <= SIMPLE_MAX) {
    const chunks = [];
    for await (const c of createReadStream(file)) chunks.push(c);
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    return { buffer: Buffer.concat(chunks) };
  }
  return { file, size: total, dir };
}

// ---------- The driver ----------

const driver = {
  label: label('OneDrive', 'OneDrive'),
  order: 60,
  links: { office: true },
  recycles: true,
  space: true,
  group: 'cloud',
  fields: [
    {
      key: 'account', type: 'signin', label: label('Microsoft account', 'Account Microsoft'), required: true,
      button: label('Sign in with Microsoft', 'Accedi con Microsoft'),
      hint: label('Personal (outlook.com, hotmail.com…) or work or school', 'Personale (outlook.com, hotmail.com…) o di lavoro o dell’istituto'),
    },
    {
      key: 'root', type: 'text', label: label('OneDrive folder', 'Cartella di OneDrive'), placeholder: '/',
      hint: label('Optional: only this folder, for example /Work/2026', 'Facoltativo: solo questa cartella, per esempio /Lavoro/2026'),
    },
  ],

  check(v) {
    cleanRoot(v.root);
  },

  address(v) {
    const root = (() => { try { return cleanRoot(v.root); } catch { return '/'; } })();
    return `onedrive://${v.account ?? ''}${root === '/' ? '' : root}`;
  },

  oauth: {
    provider: 'microsoft',
    scopes,
    /** The account's e-mail address or user name, once its OneDrive answers. */
    async account({ tokens }) {
      const session = new Session(tokens, '/', null);   // only the top: no paths to take apart
      const me = await session.me();
      await session.check().catch(err => {
        throw err.net === 'not_found' || err.net === 'denied' ? netError('invalid', `L’account ${me} non ha un OneDrive (${err.message})`) : err;
      });
      return me;
    },
  },

  async connect(values, ctx = {}) {
    const { tokens } = needKernel(ctx, 'tokens');
    const paths = needPaths(ctx, moduleCtx);
    if (!tokens) throw netError('auth', 'Serve un nuovo accesso');
    await tokens.get();
    const session = new Session(tokens, cleanRoot(values.root), paths);
    await session.check();
    return session;
  },
};

export default {
  async init(ctx) {
    moduleCtx = ctx;
    conf = ctx.config;
    ctx.onConfig?.(config => { conf = config; });
    ctx.provide('netfs.onedrive', driver);
  },
};
