import { createHmac } from 'node:crypto';
import { netError } from './lib/shared/errors.js';
import { sessionAgents, request, readText, drain, resumable } from './lib/shared/http.js';
import { parseXml, kid, kids, txt } from './lib/shared/xml.js';
import { chunks } from './lib/shared/streams.js';
import { folderParts } from './lib/shared/paths.js';
import { sleep } from './lib/shared/time.js';
import { needLookup, needKernel } from './lib/shared/kernel.js';

/**
 * Azure Blob Storage for the Rete folder: service 'netfs.azblob', see the kernel's net/drivers.js.
 * A connection is one container of a storage account (and, if the user wants, a folder in it).
 *
 * Three ways in: the account key (Shared Key: requests signed here), a SAS token (added to every
 * address as it is), or Microsoft Entra (the kernel's sign-in, `oauth`: a token for
 * https://storage.azure.com from ctx.tokens; the user needs a data role such as "Storage Blob Data
 * Contributor"). Entra uses the Microsoft app of Control Panel → Microsoft app (OneDrive's too),
 * with the Azure Storage permission added; key and SAS need no app.
 *
 * Without a hierarchical namespace folders are parts of blob names ('Foto/2026/a.jpg'); an empty
 * folder is an empty blob named as the folder with the metadata hdi_isfolder=true (as Data Lake
 * and Hadoop make them). Renaming copies on the server, then removes. Accounts with a hierarchical
 * namespace (Data Lake Storage Gen2) have real folders: making, renaming and removing a folder go
 * to the dfs endpoint, in one request. Big files go in blocks of 8 MB (Put Block + Put Block
 * List), each tried again on its own. Downloads resume. Blobs in the Archive tier have a badge and
 * cannot be read until rehydrated.
 */
const VERSION = '2021-12-02';
const MAX_PAGES = 100;               // 100 × 5000 names at most in a listing
const SINGLE_MAX = 32 << 20;         // known and up to this: one Put Blob
const BLOCK = 8 << 20;
const MAX_BLOCKS = 50_000;
const COPY_WAIT = 30 * 60_000;       // longest wait for a server-side copy

const label = (en, it) => ({ en, it });

// ---------- Addresses ----------

const ACCOUNT = /^[a-z0-9]{3,24}$/;
const CONTAINER = /^(\$root|[a-z0-9](?!.*--)[a-z0-9-]{1,61}[a-z0-9])$/;

/**
 * Where the account is: { origin, base (path before the container: '' or '/devstoreaccount1'),
 * dfs (the Data Lake endpoint's origin, or null) }. Throws 'invalid'.
 */
export function accountUrl(v) {
  const account = String(v.account ?? '').trim();
  if (!ACCOUNT.test(account)) throw netError('invalid', 'Nome dell’account di archiviazione non valido (3-24 lettere minuscole e cifre)');
  const raw = String(v.url ?? '').trim();
  if (!raw) return { account, origin: `https://${account}.blob.core.windows.net`, base: '', dfs: `https://${account}.dfs.core.windows.net` };
  let url;
  try { url = new URL(raw); } catch { throw netError('invalid', 'Indirizzo personalizzato non valido'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw netError('invalid', 'L’indirizzo deve cominciare con https:// o http://');
  if (url.username || url.password || url.search || url.hash) throw netError('invalid', 'L’indirizzo personalizzato è solo quello del servizio (il token SAS va nel suo campo)');
  const base = url.pathname.replace(/\/+$/, '');
  if (base && !/^(\/[A-Za-z0-9._-]+)+$/.test(base)) throw netError('invalid', 'Percorso dell’indirizzo non valido');
  return { account, url: url.href, origin: url.origin, base, dfs: url.hostname.includes('.blob.') ? `${url.protocol}//${url.host.replace('.blob.', '.dfs.')}` : null };
}

export function cleanPrefix(raw) {
  const parts = folderParts(raw, 'Cartella del contenitore non valida');
  return parts.length ? `${parts.join('/')}/` : '';
}

const encodeKey = key => key.split('/').map(encodeURIComponent).join('/');

// ---------- Shared Key ----------

/** The Authorization header of a request signed with the account key (Shared Key, version 2009-09-19 and later). */
export function sharedKey({ method, url, headers, account, key }) {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  const length = h['content-length'] && h['content-length'] !== '0' ? h['content-length'] : '';
  const xms = Object.keys(h).filter(k => k.startsWith('x-ms-')).sort().map(k => `${k}:${h[k].trim().replace(/\s+/g, ' ')}\n`).join('');
  const params = new Map();
  for (const [k, v] of url.searchParams) {
    const name = k.toLowerCase();
    params.set(name, params.has(name) ? `${params.get(name)},${v}` : v);
  }
  const resource = `/${account}${url.pathname}${[...params.keys()].sort().map(k => `\n${k}:${params.get(k)}`).join('')}`;
  const toSign = [
    method, h['content-encoding'] ?? '', h['content-language'] ?? '', length, h['content-md5'] ?? '', h['content-type'] ?? '',
    '', h['if-modified-since'] ?? '', h['if-match'] ?? '', h['if-none-match'] ?? '', h['if-unmodified-since'] ?? '', h.range ?? '',
  ].join('\n') + '\n' + xms + resource;
  const sig = createHmac('sha256', Buffer.from(key, 'base64')).update(toSign, 'utf8').digest('base64');
  return `SharedKey ${account}:${sig}`;
}

// ---------- Errors ----------

/** An error answer of the service (status, x-ms-error-code, the XML or JSON body) → a driver error. */
export function azError(status, code, body, { entra = false } = {}) {
  let message = '';
  try {
    const doc = parseXml(body || '');
    const e = kid(doc, 'Error');
    code ||= txt(kid(e, 'Code'));
    message = txt(kid(e, 'Message')).split('\n')[0].slice(0, 200);
  } catch {
    try { const j = JSON.parse(body); code ||= j?.error?.code ?? ''; message = String(j?.error?.message ?? '').split('\n')[0].slice(0, 200); } catch { /* the status says it */ }
  }
  const said = message || code || `errore ${status}`;
  if (code === 'AuthenticationFailed' || code === 'InvalidAuthenticationInfo' || status === 401 || (status === 403 && /failed to authenticate/i.test(message))) {
    return netError('auth', 'Accesso all’account di archiviazione non valido');
  }
  if (code === 'AuthorizationPermissionMismatch' || code === 'AuthorizationFailure') {
    return netError('denied', entra ? 'Il tuo account non ha un ruolo sui dati: serve «Collaboratore ai dati dei BLOB di archiviazione» (Storage Blob Data Contributor) sull’account o sul contenitore' : said);
  }
  if (code === 'ContainerNotFound') return netError('not_found', 'Il contenitore non esiste');
  if (code === 'BlobNotFound' || code === 'PathNotFound' || code === 'ResourceNotFound' || status === 404) return netError('not_found', 'Non esiste nel contenitore');
  if (code === 'BlobArchived') return netError('unsupported', 'File nel livello Archivio: va riattivato dal portale di Azure prima di leggerlo');
  if (code === 'BlobAlreadyExists' || code === 'PathAlreadyExists' || code === 'ContainerAlreadyExists') return netError('exists', said);
  if (status === 403) return netError('denied', said);
  if (status === 409) return netError('exists', said);
  if (status === 413) return netError('denied', 'File troppo grande');
  if (status >= 500 || status === 429) return netError('unreachable', `servizio non disponibile (${said})`);
  return netError('invalid', said);
}

// ---------- The session ----------

class Session {
  resume = { read: true, write: false };
  #where; #container; #prefix; #auth; #agents; #hns = false;

  /** auth: { kind: 'key', key } | { kind: 'sas', sas } | { kind: 'entra', tokens } */
  constructor(where, container, prefix, auth, trust, lookup) {
    this.#where = where;
    this.#container = container;
    this.#prefix = prefix;
    this.#auth = auth;
    this.#agents = sessionAgents(trust, { lookup });
  }

  #url(key, query = {}, { dfs = false, container = this.#container } = {}) {
    const origin = dfs ? this.#where.dfs : this.#where.origin;
    const url = new URL(`${origin}${this.#where.base}/${container ? `${container}${key ? `/${encodeKey(key)}` : ''}` : ''}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    // The SAS token's parameters, never in place of the request's own (comp, restype…)
    if (this.#auth.kind === 'sas') for (const [k, v] of new URLSearchParams(this.#auth.sas)) if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    return url;
  }

  /**
   * One request, signed as the connection signs (Shared Key, SAS in the address, Entra token).
   * Throttling and server errors are tried again when the body can be sent again.
   */
  async #request(method, key, { query, headers = {}, body = null, length, signal, dfs = false, container } = {}) {
    return request({
      method, body, signal, agents: this.#agents,
      prepare: async () => {
        const url = this.#url(key, query, { dfs, container });
        const h = { 'x-ms-version': VERSION, 'x-ms-date': new Date().toUTCString(), ...headers };
        if (Buffer.isBuffer(body)) h['content-length'] = String(body.length);
        else if (body) h['content-length'] = String(length);
        else if (['PUT', 'POST'].includes(method)) h['content-length'] = '0';
        if (this.#auth.kind === 'key') h.authorization = sharedKey({ method, url, headers: h, account: this.#where.account, key: this.#auth.key });
        else if (this.#auth.kind === 'entra') h.authorization = `Bearer ${await this.#auth.tokens.get()}`;
        return { url, headers: h };
      },
      fail: async res => {
        const text = method === 'HEAD' ? '' : await readText(res, 64 << 10).catch(() => '');
        return azError(res.statusCode, res.headers['x-ms-error-code'] ?? '', text, { entra: this.#auth.kind === 'entra' });
      },
    });
  }

  async #xml(method, key, opts) {
    return parseXml(await readText(await this.#request(method, key, opts)));
  }

  #key(path) {
    return `${this.#prefix}${path.split('/').filter(Boolean).join('/')}`;
  }

  /** One page after another of a listing: (doc) → continue? */
  async #pages(query, each, { container } = {}) {
    let marker;
    for (let page = 0; page < MAX_PAGES; page++) {
      const doc = await this.#xml('GET', '', { query: { restype: 'container', comp: 'list', maxresults: 5000, ...query, ...(marker && { marker }) }, container });
      const r = kid(doc, 'EnumerationResults') ?? (() => { throw netError('invalid', 'Risposta del servizio non valida'); })();
      each(r);
      marker = txt(kid(r, 'NextMarker'));
      if (!marker) return;
    }
    throw netError('invalid', 'Cartella troppo grande');
  }

  /** Every blob under a prefix (all levels): [{ key, size }]. */
  async #all(prefix) {
    const out = [];
    await this.#pages({ prefix }, r => {
      for (const b of kids(kid(r, 'Blobs'), 'Blob')) out.push({ key: txt(kid(b, 'Name')), size: Number(txt(kid(kid(b, 'Properties'), 'Content-Length'))) || 0, folder: isFolder(b) });
    });
    return out;
  }

  // ---------- The driver's session ----------

  async list(path) {
    const base = path === '/' ? this.#prefix : `${this.#key(path)}/`;
    const byName = new Map();
    await this.#pages({ prefix: base, delimiter: '/', include: 'metadata' }, r => {
      const blobs = kid(r, 'Blobs');
      for (const p of kids(blobs, 'BlobPrefix')) {
        const name = txt(kid(p, 'Name')).slice(base.length, -1);
        if (name && !name.includes('/')) byName.set(name, { name, type: 'folder', size: 0, modified: 0 });
      }
      for (const b of kids(blobs, 'Blob')) {
        const name = txt(kid(b, 'Name')).slice(base.length);
        if (!name || name.includes('/')) continue;
        const props = kid(b, 'Properties');
        if (isFolder(b)) { if (!byName.has(name)) byName.set(name, { name, type: 'folder', size: 0, modified: Date.parse(txt(kid(props, 'Last-Modified'))) || 0 }); continue; }
        byName.set(name, entry(name, { size: txt(kid(props, 'Content-Length')), modified: txt(kid(props, 'Last-Modified')), tier: txt(kid(props, 'AccessTier')) }));
      }
    });
    return [...byName.values()];
  }

  async stat(path) {
    if (path === '/') return { name: '', type: 'folder', size: 0, modified: 0 };
    const key = this.#key(path);
    const name = path.slice(path.lastIndexOf('/') + 1);
    try {
      const res = await this.#request('HEAD', key);
      drain(res);
      if (String(res.headers['x-ms-meta-hdi_isfolder']).toLowerCase() === 'true' || String(res.headers['x-ms-resource-type']) === 'directory') {
        return { name, type: 'folder', size: 0, modified: Date.parse(res.headers['last-modified']) || 0 };
      }
      return entry(name, { size: res.headers['content-length'], modified: res.headers['last-modified'], tier: res.headers['x-ms-access-tier'] });
    } catch (err) {
      if (err.net !== 'not_found') throw err;
    }
    const doc = await this.#xml('GET', '', { query: { restype: 'container', comp: 'list', prefix: `${key}/`, maxresults: 1 } });
    return kids(kid(kid(doc, 'EnumerationResults'), 'Blobs'), 'Blob').length ? { name, type: 'folder', size: 0, modified: 0 } : null;
  }

  async read(path, { start = 0, signal } = {}) {
    const res = await this.#request('GET', this.#key(path), { headers: start > 0 ? { 'x-ms-range': `bytes=${start}-` } : {}, signal });
    return resumable(res, { start, signal });
  }

  async write(path, source, { start = 0, signal, size } = {}) {
    if (start > 0) throw netError('unsupported', 'Azure Blob Storage non riprende un invio a metà');
    const key = this.#key(path);
    const headers = { 'x-ms-blob-type': 'BlockBlob', 'content-type': 'application/octet-stream' };
    if (Number.isSafeInteger(size) && size <= SINGLE_MAX) {
      drain(await this.#request('PUT', key, { headers, body: source, length: size, signal }));
      return;
    }
    const blockSize = Number.isSafeInteger(size) && size > BLOCK * (MAX_BLOCKS - 100) ? Math.ceil(size / (MAX_BLOCKS - 100) / (1 << 20)) * (1 << 20) : BLOCK;
    const ids = [];
    for await (const piece of chunks(source, blockSize, { atLeastOne: true })) {
      if (ids.length >= MAX_BLOCKS) throw netError('denied', 'File troppo grande per Azure Blob Storage');
      const id = Buffer.from(`lilos-${String(ids.length).padStart(6, '0')}`).toString('base64');
      drain(await this.#request('PUT', key, { query: { comp: 'block', blockid: id }, body: piece, signal }));
      ids.push(id);
    }
    const xml = `<?xml version="1.0" encoding="utf-8"?><BlockList>${ids.map(id => `<Latest>${id}</Latest>`).join('')}</BlockList>`;
    drain(await this.#request('PUT', key, { query: { comp: 'blocklist' }, body: Buffer.from(xml), headers: { 'content-type': 'application/xml', 'x-ms-blob-content-type': 'application/octet-stream' }, signal }));
  }

  async mkdir(path) {
    if (await this.stat(path)) throw netError('exists', 'Esiste già nel contenitore');
    if (this.#hns) {
      drain(await this.#request('PUT', this.#key(path), { dfs: true, query: { resource: 'directory' } }));
      return;
    }
    drain(await this.#request('PUT', this.#key(path), { headers: { 'x-ms-blob-type': 'BlockBlob', 'x-ms-meta-hdi_isfolder': 'true' }, body: Buffer.alloc(0) }));
  }

  async rename(from, to) {
    const what = await this.stat(from) ?? (() => { throw netError('not_found', 'Non esiste nel contenitore'); })();
    if (await this.stat(to)) throw netError('exists', 'Esiste già nel contenitore');
    if (this.#hns) {
      const source = `/${this.#container}/${encodeKey(this.#key(from))}`;
      const sas = this.#auth.kind === 'sas' ? `?${this.#auth.sas}` : '';
      drain(await this.#request('PUT', this.#key(to), { dfs: true, headers: { 'x-ms-rename-source': `${source}${sas}` } }));
      return;
    }
    if (what.type === 'file') {
      await this.#copy(this.#key(from), this.#key(to));
      drain(await this.#request('DELETE', this.#key(from)));
      return;
    }
    const src = this.#key(from), dst = this.#key(to);
    const all = await this.#all(`${src}/`);
    for (const b of all) await this.#copy(b.key, dst + b.key.slice(src.length));
    const marker = await this.#markerExists(src);
    if (marker) await this.#copy(src, dst);
    for (const b of all) drain(await this.#request('DELETE', b.key));
    if (marker) drain(await this.#request('DELETE', src));
  }

  async #markerExists(key) {
    try { drain(await this.#request('HEAD', key)); return true; } catch (err) { if (err.net === 'not_found') return false; throw err; }
  }

  /** A server-side copy (Copy Blob), waited for when the service does it in the background. */
  async #copy(from, to) {
    const src = this.#url(from);
    if (this.#auth.kind !== 'sas') src.search = '';
    const res = await this.#request('PUT', to, { headers: { 'x-ms-copy-source': src.href } });
    drain(res);
    let status = res.headers['x-ms-copy-status'];
    const until = Date.now() + COPY_WAIT;
    while (status === 'pending' && Date.now() < until) {
      await sleep(1000);
      const h = await this.#request('HEAD', to);
      drain(h);
      status = h.headers['x-ms-copy-status'];
    }
    if (status && status !== 'success') throw netError('invalid', `Copia sul server non riuscita (${status})`);
  }

  async remove(path, { folder = false } = {}) {
    if (folder) {
      if (this.#hns) { drain(await this.#request('DELETE', this.#key(path), { dfs: true, query: { recursive: 'false' } })); return; }
      if (await this.#markerExists(this.#key(path))) drain(await this.#request('DELETE', this.#key(path)));
      return;
    }
    drain(await this.#request('DELETE', this.#key(path)));
  }

  async removeTree(path) {
    const what = await this.stat(path);
    if (!what) return;
    if (what.type === 'file') return this.remove(path);
    if (this.#hns) { drain(await this.#request('DELETE', this.#key(path), { dfs: true, query: { recursive: 'true' } })); return; }
    const key = this.#key(path);
    // Deepest first: a folder's marker after what is inside it
    const all = (await this.#all(`${key}/`)).sort((a, b) => b.key.length - a.key.length);
    for (const b of all) {
      try { drain(await this.#request('DELETE', b.key)); } catch (err) { if (err.net !== 'not_found') throw err; }
    }
    if (await this.#markerExists(key)) drain(await this.#request('DELETE', key));
  }

  /** The container can be listed; whether the account has a hierarchical namespace. */
  async check() {
    const doc = await this.#xml('GET', '', { query: { restype: 'container', comp: 'list', prefix: this.#prefix, maxresults: 1 } });
    if (this.#prefix && !kids(kid(kid(doc, 'EnumerationResults'), 'Blobs'), 'Blob').length && !await this.#markerExists(this.#prefix.slice(0, -1))) {
      throw netError('not_found', `La cartella ${this.#prefix} non esiste nel contenitore`);
    }
    if (this.#where.dfs && this.#auth.kind !== 'sas') {
      try {
        const res = await this.#request('GET', '', { query: { restype: 'account', comp: 'properties' }, container: '' });
        drain(res);
        this.#hns = String(res.headers['x-ms-is-hns-enabled']).toLowerCase() === 'true';
      } catch { this.#hns = false; }
    }
  }

  /** The containers of the account. */
  async containers() {
    const out = [];
    let marker;
    for (let page = 0; page < 20; page++) {
      const doc = await this.#xml('GET', '', { query: { comp: 'list', maxresults: 5000, ...(marker && { marker }) }, container: '' });
      const r = kid(doc, 'EnumerationResults');
      for (const c of kids(kid(r, 'Containers'), 'Container')) out.push(txt(kid(c, 'Name')));
      marker = txt(kid(r, 'NextMarker'));
      if (!marker) break;
    }
    return out.filter(n => CONTAINER.test(n));
  }

  close() {
    for (const a of Object.values(this.#agents)) a.destroy();
  }
}

const isFolder = b => kids(kid(b, 'Metadata'), 'hdi_isfolder').some(m => txt(m).toLowerCase() === 'true') || txt(kid(kid(b, 'Properties'), 'ResourceType')) === 'directory';

function entry(name, { size, modified, tier }) {
  return {
    name, type: 'file', size: Number(size) || 0, modified: Date.parse(modified) || 0,
    ...(String(tier).toLowerCase() === 'archive' && { badge: label('archived', 'archiviato') }),
  };
}

/** How a connection signs its requests. */
function authOf(values, ctx) {
  const secret = ctx.secret ?? {};
  const kind = values.auth ?? 'key';
  if (kind === 'sas') {
    const sas = String(secret.sas ?? '').trim().replace(/^\?/, '');
    if (!sas || !/(^|&)sig=/.test(sas)) throw netError('auth', 'Token SAS mancante o non valido');
    return { kind, sas };
  }
  if (kind === 'entra') {
    const { tokens } = needKernel(ctx, 'tokens');
    if (!tokens) throw netError('auth', 'Serve un nuovo accesso');
    return { kind, tokens };
  }
  const key = String(secret.key ?? '').trim();
  if (!key || !/^[A-Za-z0-9+/=]{20,200}$/.test(key)) throw netError('auth', 'Chiave dell’account mancante o non valida');
  return { kind: 'key', key };
}

// ---------- The driver ----------

const driver = {
  label: label('Azure Blob Storage', 'Azure Blob Storage'),
  order: 75,
  group: 'cloud',
  fields: [
    {
      key: 'account', type: 'text', label: label('Storage account', 'Account di archiviazione'), required: true, placeholder: 'mystorage',
      hint: label('The name before .blob.core.windows.net', 'Il nome prima di .blob.core.windows.net'),
    },
    {
      key: 'auth', type: 'select', label: label('Access', 'Accesso'), required: true, default: 'key',
      options: [
        { value: 'key', label: label('Account key', 'Chiave dell’account') },
        { value: 'sas', label: label('SAS token', 'Token SAS') },
        { value: 'entra', label: label('Microsoft Entra (sign in)', 'Microsoft Entra (accesso con account)') },
      ],
    },
    {
      key: 'key', type: 'password', secret: true, required: true, when: { auth: 'key' }, label: label('Account key', 'Chiave dell’account'),
      hint: label('Azure portal → the account → Access keys', 'Portale di Azure → l’account → Chiavi di accesso'),
    },
    {
      key: 'sas', type: 'password', secret: true, required: true, when: { auth: 'sas' }, label: label('SAS token', 'Token SAS'),
      hint: label('From «Shared access signature» or «Generate SAS» (with list, read, write, delete)', 'Da «Firma di accesso condiviso» o «Genera SAS» (con elenco, lettura, scrittura, eliminazione)'),
    },
    {
      key: 'entra', type: 'signin', required: true, when: { auth: 'entra' }, label: label('Microsoft account', 'Account Microsoft'),
      button: label('Sign in with Microsoft', 'Accedi con Microsoft'),
      hint: label('A work or school account with a data role on the storage account', 'Un account di lavoro o dell’istituto con un ruolo sui dati dell’account'),
    },
    { key: 'share', type: 'text', label: label('Container', 'Contenitore'), required: true, placeholder: 'documents' },
    { key: 'root', type: 'text', label: label('Folder in the container', 'Cartella nel contenitore'), placeholder: '/', hint: label('Optional: only this folder', 'Facoltativo: solo questa cartella') },
    {
      key: 'url', type: 'text', label: label('Custom address', 'Indirizzo personalizzato'), placeholder: 'http://127.0.0.1:10000/devstoreaccount1',
      hint: label('Optional: Azurite, national clouds, your own domain', 'Facoltativo: Azurite, cloud nazionali, dominio proprio'),
    },
  ],

  check(v) {
    accountUrl(v);
    cleanPrefix(v.root);
    if (v.share !== undefined && !CONTAINER.test(String(v.share))) throw netError('invalid', 'Nome del contenitore non valido (lettere minuscole, cifre e trattini)');
  },

  address(v) {
    const root = (() => { try { return cleanPrefix(v.root); } catch { return ''; } })();
    return `azure://${v.account ?? ''}/${v.share ?? ''}${root ? `/${root.slice(0, -1)}` : ''}`;
  },

  oauth: {
    provider: 'microsoft',
    scopes: ['https://storage.azure.com/user_impersonation'],
    accounts: 'work',     // a data role is given to work or school accounts
    manual: true,
    optional: true,       // key and SAS work without the app
    field: 'entra',
  },

  async shares(values, ctx = {}) {
    const session = new Session(accountUrl(values), '', '', authOf(values, ctx), ctx.trust ?? null, needLookup(ctx));
    try {
      return await session.containers();
    } finally {
      session.close();
    }
  },

  async connect(values, ctx = {}) {
    if (!CONTAINER.test(String(values.share ?? ''))) throw netError('invalid', 'Nome del contenitore non valido');
    const session = new Session(accountUrl(values), values.share, cleanPrefix(values.root), authOf(values, ctx), ctx.trust ?? null, needLookup(ctx));
    try {
      await session.check();
    } catch (err) {
      session.close();
      throw err;
    }
    return session;
  },
};

export default {
  async init(ctx) {
    ctx.provide('netfs.azblob', driver);
  },
};
