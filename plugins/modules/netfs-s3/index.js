import https from 'node:https';
import { createHash, createHmac } from 'node:crypto';
import { netError } from './lib/shared/errors.js';
import { sessionAgents, request, readText, drain, resumable } from './lib/shared/http.js';
import { parseXml, kid, kids, txt, escapeXml } from './lib/shared/xml.js';
import { chunks } from './lib/shared/streams.js';
import { folderParts } from './lib/shared/paths.js';
import { needLookup } from './lib/shared/kernel.js';

/**
 * Amazon S3 and the services that speak its API (Cloudflare R2, Backblaze B2, Wasabi, MinIO and
 * others) for the Rete folder: service 'netfs.s3', see the kernel's net/drivers.js. A connection
 * is one bucket (and, if the user wants, a folder inside it).
 *
 * Requests are signed here (AWS Signature Version 4): no SDK. Bodies that stream are sent as
 * UNSIGNED-PAYLOAD (the signature covers the headers; TLS protects the bytes), small XML bodies
 * are signed with their hash.
 *
 * S3 has no folders: keys have '/' in them ('Foto/2026/a.jpg') and a listing with the delimiter
 * '/' gives the "folders" of a level. An empty folder is an empty object 'Foto/' (as the AWS
 * console makes them). Renaming copies on the server (CopyObject, UploadPartCopy over 5 GB) and
 * then removes the original: a folder object by object. Big files go up in parts (multipart, 16 MB
 * or more), a part tried again on its own when it fails; a canceled upload is aborted. Downloads
 * resume (Range). Objects in an archive class (Glacier Flexible Retrieval, Deep Archive) have a
 * badge and cannot be read until restored on the provider's console.
 */
const MAX_PAGES = 200;                 // 200 × 1000 keys at most in a listing
const SINGLE_MAX = 16 << 20;           // bigger files go in parts
const PART = 16 << 20;
const MAX_PARTS = 10_000;
const COPY_MAX = 5 * 1024 ** 3;        // CopyObject's limit: bigger objects are copied in parts
const ARCHIVED = new Set(['GLACIER', 'DEEP_ARCHIVE']);

const label = (en, it) => ({ en, it });

// ---------- Providers ----------

/** What differs between providers: the address of a region, signing region, path style. */
const PROVIDERS = {
  aws: { label: 'Amazon Web Services (AWS)' },
  r2: { label: 'Cloudflare R2' },
  b2: { label: 'Backblaze B2' },
  wasabi: { label: 'Wasabi' },
  minio: { label: 'MinIO' },
  other: { label: label('Other S3-compatible service', 'Altro servizio compatibile con S3') },
};

/** The endpoint of a connection: { origin: URL (no path), region, pathStyle, guessRegion }. Throws 'invalid'. */
export function endpointOf(v) {
  const provider = PROVIDERS[v.provider] ? v.provider : 'aws';
  const region = String(v.region ?? '').trim();
  if (region && !/^[a-z0-9-]{2,40}$/.test(region)) throw netError('invalid', 'Regione non valida (per esempio eu-south-1)');
  switch (provider) {
    case 'aws':
      return { origin: new URL(`https://s3.${region || 'us-east-1'}.amazonaws.com`), region: region || 'us-east-1', pathStyle: false, guessRegion: !region };
    case 'r2': {
      const account = String(v.account ?? '').trim();
      if (!/^[a-f0-9]{32}$/i.test(account)) throw netError('invalid', 'ID dell’account Cloudflare non valido (32 cifre esadecimali)');
      return { origin: new URL(`https://${account}.r2.cloudflarestorage.com`), region: 'auto', pathStyle: true };
    }
    case 'b2':
      if (!region) throw netError('invalid', 'Per Backblaze B2 serve la regione (per esempio eu-central-003)');
      return { origin: new URL(`https://s3.${region}.backblazeb2.com`), region, pathStyle: true };
    case 'wasabi':
      return { origin: new URL(`https://s3.${region || 'us-east-1'}.wasabisys.com`), region: region || 'us-east-1', pathStyle: true };
    default: {
      let url;
      try { url = new URL(String(v.url ?? '').trim()); } catch { throw netError('invalid', 'Indirizzo non valido: serve per esempio https://s3.example.com o http://nas:9000'); }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw netError('invalid', 'L’indirizzo deve cominciare con https:// o http://');
      if (url.username || url.password) throw netError('invalid', 'Non scrivere chiavi nell’indirizzo: usa i campi della chiave di accesso');
      if ((url.pathname && url.pathname !== '/') || url.search || url.hash) throw netError('invalid', 'L’indirizzo è solo quello del server (senza percorso): il bucket va nel suo campo');
      return { origin: new URL(url.origin), region: region || 'us-east-1', pathStyle: provider === 'minio' || v.pathStyle !== false };
    }
  }
}

/** A bucket name S3 or a compatible service may have. */
const BUCKET = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,254}$/;

/** The folder of the bucket the connection opens ('Lavoro/2026/' → 'Lavoro/2026/'; '' for all of it). Throws 'invalid'. */
export function cleanPrefix(raw) {
  const parts = folderParts(raw, 'Cartella del bucket non valida');
  return parts.length ? `${parts.join('/')}/` : '';
}

// ---------- Signature Version 4 ----------

/** RFC 3986 encoding as SigV4 wants it ('/' kept in paths). */
export const uriEncode = (s, keepSlash = false) => {
  const out = encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return keepSlash ? out.replace(/%2F/g, '/') : out;
};
const sha256 = data => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
export const EMPTY_HASH = sha256('');

/**
 * Signs a request (SigV4, header form): adds x-amz-date, x-amz-content-sha256, the session token
 * if any, and Authorization to `headers` (lower-case names). `url` carries the encoded path and
 * the query; `payload` is the body's hex SHA-256 or 'UNSIGNED-PAYLOAD'.
 */
export function signV4({ method, url, headers, payload, region, accessKey, secretKey, sessionToken, now = new Date(), service = 's3' }) {
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  headers.host = url.host;
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = payload;
  if (sessionToken) headers['x-amz-security-token'] = sessionToken;
  const query = [...url.searchParams].map(([k, v]) => [uriEncode(k), uriEncode(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('&');
  const names = Object.keys(headers).map(n => n.toLowerCase()).sort();
  const canonicalHeaders = names.map(n => `${n}:${String(headers[n]).trim().replace(/\s+/g, ' ')}\n`).join('');
  const signed = names.join(';');
  const canonical = [method, url.pathname || '/', query, canonicalHeaders, signed, payload].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, day), region), service), 'aws4_request');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signed}, Signature=${createHmac('sha256', key).update(toSign).digest('hex')}`;
  return headers;
}

// ---------- Errors ----------

/** An S3 error answer (status and its XML <Error>) → a driver error. */
export function s3Error(status, body) {
  let code = '', message = '', region = '';
  try {
    const doc = parseXml(body || '');
    const e = kid(doc, 'Error');
    code = txt(kid(e, 'Code'));
    message = txt(kid(e, 'Message')).slice(0, 200);
    region = txt(kid(e, 'Region'));
  } catch { /* not XML: the status says it */ }
  const said = message || code || `errore ${status}`;
  if (['InvalidAccessKeyId', 'SignatureDoesNotMatch', 'InvalidToken', 'ExpiredToken', 'TokenRefreshRequired', 'InvalidSecurity'].includes(code) || status === 401) {
    return netError('auth', 'Chiave di accesso non valida');
  }
  if (code === 'NoSuchBucket') return netError('not_found', 'Il bucket non esiste');
  if (code === 'NoSuchKey' || code === 'NoSuchUpload' || status === 404) return netError('not_found', 'Non esiste nel bucket');
  if (code === 'InvalidObjectState') return netError('unsupported', 'File archiviato (Glacier): va ripristinato dalla console del fornitore prima di leggerlo');
  if (code === 'PermanentRedirect' || code === 'AuthorizationHeaderMalformed' || code === 'IllegalLocationConstraintException' || status === 301) {
    return netError('invalid', `Il bucket è in un’altra regione${region ? ` (${region})` : ''}: scrivila nel campo Regione`);
  }
  if (code === 'AccessDenied' || code === 'AllAccessDisabled' || status === 403) return netError('denied', said);
  if (code === 'EntityTooLarge') return netError('denied', 'File troppo grande per il bucket');
  if (code === 'QuotaExceeded' || code === 'XMinioStorageFull') return netError('denied', 'Spazio esaurito');
  if (code === 'BucketAlreadyOwnedByYou' || status === 409) return netError('exists', said);
  if (code === 'NotImplemented' || status === 501) return netError('unsupported', said);
  if (status === 503 || status === 500 || status === 502 || status === 504 || code === 'SlowDown') return netError('unreachable', `server non disponibile (${said})`);
  return netError('invalid', said);
}

// ---------- The session ----------

class Session {
  resume = { read: true, write: false };
  #end; #bucket; #prefix; #keys; #agents;

  constructor(end, bucket, prefix, keys, trust, lookup) {
    this.#end = end;
    this.#bucket = bucket;
    this.#prefix = prefix;
    this.#keys = keys;
    this.#agents = sessionAgents(trust, { lookup });
  }

  get region() { return this.#end.region; }

  /** The address of an object (key: '' for the bucket); path style when the provider wants it or the name would break TLS. */
  #url(key, query = {}, { bucket = this.#bucket } = {}) {
    const o = this.#end.origin;
    const virtual = bucket && !this.#end.pathStyle && !/[.A-Z_]/.test(bucket);
    const url = virtual
      ? new URL(`${o.protocol}//${bucket}.${o.host}/${uriEncode(key, true)}`)
      : new URL(`${o.protocol}//${o.host}/${bucket ? `${uriEncode(bucket)}/` : ''}${uriEncode(key, true)}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    return url;
  }

  /**
   * One signed request. body: a Buffer (signed with its hash) or a stream (unsigned payload, with
   * its Content-Length). Throttling and server errors are tried again when the body can be sent again.
   */
  async #request(method, key, { query, headers = {}, body = null, length, signal, bucket } = {}) {
    const buffered = body === null || Buffer.isBuffer(body);
    return request({
      method, body, signal, agents: this.#agents,
      prepare: () => {
        const url = this.#url(key, query, { bucket: bucket ?? this.#bucket });
        const h = { ...headers };
        if (Buffer.isBuffer(body)) h['content-length'] = String(body.length);
        else if (body) h['content-length'] = String(length);
        signV4({ method, url, headers: h, payload: buffered ? sha256(body ?? '') : 'UNSIGNED-PAYLOAD', region: this.#end.region, ...this.#keys });
        return { url, headers: h };
      },
      success: status => (status >= 200 && status < 300) || status === 304,
      fail: async res => s3Error(res.statusCode, method === 'HEAD' ? '' : await readText(res, 64 << 10).catch(() => '')),
    });
  }

  async #xml(method, key, opts) {
    const res = await this.#request(method, key, opts);
    return parseXml(await readText(res));
  }

  #key(path) {
    return `${this.#prefix}${path.split('/').filter(Boolean).join('/')}`;
  }

  /** Every key under a prefix (all levels), { key, size }; at most MAX_PAGES pages. */
  async #all(prefix) {
    const out = [];
    let token;
    for (let page = 0; page < MAX_PAGES; page++) {
      const doc = await this.#xml('GET', '', { query: { 'list-type': 2, prefix, 'max-keys': 1000, ...(token && { 'continuation-token': token }) } });
      const r = kid(doc, 'ListBucketResult');
      for (const c of kids(r, 'Contents')) out.push({ key: txt(kid(c, 'Key')), size: Number(txt(kid(c, 'Size'))) || 0 });
      token = txt(kid(r, 'NextContinuationToken'));
      if (txt(kid(r, 'IsTruncated')) !== 'true' || !token) return out;
    }
    throw netError('invalid', 'Troppi oggetti nella cartella');
  }

  // ---------- The driver's session ----------

  async list(path) {
    const base = path === '/' ? this.#prefix : `${this.#key(path)}/`;
    const out = [], seen = new Set();
    let token;
    for (let page = 0; page < MAX_PAGES; page++) {
      const doc = await this.#xml('GET', '', { query: { 'list-type': 2, prefix: base, delimiter: '/', 'max-keys': 1000, ...(token && { 'continuation-token': token }) } });
      const r = kid(doc, 'ListBucketResult') ?? (() => { throw netError('invalid', 'Risposta del server non S3'); })();
      for (const p of kids(r, 'CommonPrefixes')) {
        const name = txt(kid(p, 'Prefix')).slice(base.length, -1);
        if (name && !name.includes('/') && !seen.has(name)) { seen.add(name); out.push({ name, type: 'folder', size: 0, modified: 0 }); }
      }
      for (const c of kids(r, 'Contents')) {
        const key = txt(kid(c, 'Key'));
        const name = key.slice(base.length);
        if (!name || name.includes('/') || seen.has(name)) continue;   // the folder's own object, or odd keys
        seen.add(name);
        out.push(this.#entry(name, { size: txt(kid(c, 'Size')), modified: txt(kid(c, 'LastModified')), storage: txt(kid(c, 'StorageClass')) }));
      }
      token = txt(kid(r, 'NextContinuationToken'));
      if (txt(kid(r, 'IsTruncated')) !== 'true' || !token) break;
      if (page === MAX_PAGES - 1) throw netError('invalid', 'Cartella troppo grande');
    }
    return out;
  }

  #entry(name, { size, modified, storage }) {
    return {
      name, type: 'file', size: Number(size) || 0, modified: Date.parse(modified) || 0,
      ...(ARCHIVED.has(storage) && { badge: label('archived', 'archiviato') }),
    };
  }

  async stat(path) {
    if (path === '/') return { name: '', type: 'folder', size: 0, modified: 0 };
    const key = this.#key(path);
    const name = path.slice(path.lastIndexOf('/') + 1);
    try {
      const res = await this.#request('HEAD', key);
      drain(res);
      return this.#entry(name, { size: res.headers['content-length'], modified: res.headers['last-modified'], storage: res.headers['x-amz-storage-class'] });
    } catch (err) {
      if (err.net !== 'not_found') throw err;
    }
    const doc = await this.#xml('GET', '', { query: { 'list-type': 2, prefix: `${key}/`, 'max-keys': 1 } });
    return kids(kid(doc, 'ListBucketResult'), 'Contents').length ? { name, type: 'folder', size: 0, modified: 0 } : null;
  }

  async read(path, { start = 0, signal } = {}) {
    const res = await this.#request('GET', this.#key(path), { headers: start > 0 ? { range: `bytes=${start}-` } : {}, signal });
    return resumable(res, { start, signal });
  }

  async write(path, source, { start = 0, signal, size } = {}) {
    if (start > 0) throw netError('unsupported', 'S3 non riprende un invio a metà');
    const key = this.#key(path);
    if (Number.isSafeInteger(size) && size <= SINGLE_MAX) {
      // Known and small: one PUT, streaming
      const res = await this.#request('PUT', key, { body: source, length: size, signal, headers: { 'content-type': 'application/octet-stream' } });
      drain(res);
      return;
    }
    const partSize = Number.isSafeInteger(size) && size > PART * (MAX_PARTS - 100) ? Math.ceil(size / (MAX_PARTS - 100) / (1 << 20)) * (1 << 20) : PART;
    const parts = chunks(source, partSize);
    const first = await parts.next();
    if (first.done || first.value.length < partSize) {
      // Small after all: one PUT with what came
      const body = first.done ? Buffer.alloc(0) : first.value;
      drain(await this.#request('PUT', key, { body, signal, headers: { 'content-type': 'application/octet-stream' } }));
      return;
    }
    const doc = await this.#xml('POST', key, { query: { uploads: '' }, headers: { 'content-type': 'application/octet-stream' }, body: Buffer.alloc(0), signal });
    const uploadId = txt(kid(kid(doc, 'InitiateMultipartUploadResult'), 'UploadId'));
    if (!uploadId) throw netError('invalid', 'Il server non ha aperto il caricamento a parti');
    const done = [];
    try {
      let n = 0;
      for (let piece = first; !piece.done; piece = await parts.next()) {
        if (++n > MAX_PARTS) throw netError('denied', 'File troppo grande per S3');
        const res = await this.#request('PUT', key, { query: { partNumber: n, uploadId }, body: piece.value, signal });
        const etag = res.headers.etag;
        drain(res);
        if (!etag) throw netError('invalid', 'Il server non ha confermato una parte');
        done.push({ n, etag });
      }
      const xml = `<CompleteMultipartUpload>${done.map(p => `<Part><PartNumber>${p.n}</PartNumber><ETag>${escapeXml(p.etag)}</ETag></Part>`).join('')}</CompleteMultipartUpload>`;
      const res = await this.#request('POST', key, { query: { uploadId }, body: Buffer.from(xml), headers: { 'content-type': 'application/xml' }, signal });
      // S3 may answer 200 with an error inside, after a while
      const text = await readText(res);
      if (/<Error>/.test(text)) throw s3Error(500, text);
    } catch (err) {
      this.#request('DELETE', key, { query: { uploadId } }).then(drain, () => {});
      throw err;
    }
  }

  async mkdir(path) {
    if (await this.stat(path)) throw netError('exists', 'Esiste già nel bucket');
    drain(await this.#request('PUT', `${this.#key(path)}/`, { body: Buffer.alloc(0) }));
  }

  async rename(from, to) {
    const what = await this.stat(from) ?? (() => { throw netError('not_found', 'Non esiste nel bucket'); })();
    if (await this.stat(to)) throw netError('exists', 'Esiste già nel bucket');
    if (what.type === 'file') {
      await this.#copy(this.#key(from), this.#key(to), what.size);
      drain(await this.#request('DELETE', this.#key(from)));
      return;
    }
    // A folder: every object under it, copied then removed
    const src = `${this.#key(from)}/`, dst = `${this.#key(to)}/`;
    const all = await this.#all(src);
    for (const o of all) await this.#copy(o.key, dst + o.key.slice(src.length), o.size);
    await this.#deleteKeys(all.map(o => o.key));
  }

  /** A server-side copy of one object (in parts over 5 GB). */
  async #copy(from, to, size) {
    const source = `/${this.#bucket}/${uriEncode(from, true)}`;
    if (size <= COPY_MAX) {
      const text = await readText(await this.#request('PUT', to, { headers: { 'x-amz-copy-source': source }, body: Buffer.alloc(0) }));
      if (/<Error>/.test(text)) throw s3Error(500, text);
      return;
    }
    const doc = await this.#xml('POST', to, { query: { uploads: '' }, body: Buffer.alloc(0) });
    const uploadId = txt(kid(kid(doc, 'InitiateMultipartUploadResult'), 'UploadId'));
    const part = 1 << 30;
    const done = [];
    try {
      for (let n = 1, at = 0; at < size; n++, at += part) {
        const end = Math.min(size, at + part) - 1;
        const r = await this.#xml('PUT', to, { query: { partNumber: n, uploadId }, headers: { 'x-amz-copy-source': source, 'x-amz-copy-source-range': `bytes=${at}-${end}` }, body: Buffer.alloc(0) });
        done.push({ n, etag: txt(kid(kid(r, 'CopyPartResult'), 'ETag')) });
      }
      const xml = `<CompleteMultipartUpload>${done.map(p => `<Part><PartNumber>${p.n}</PartNumber><ETag>${escapeXml(p.etag)}</ETag></Part>`).join('')}</CompleteMultipartUpload>`;
      const text = await readText(await this.#request('POST', to, { query: { uploadId }, body: Buffer.from(xml), headers: { 'content-type': 'application/xml' } }));
      if (/<Error>/.test(text)) throw s3Error(500, text);
    } catch (err) {
      this.#request('DELETE', to, { query: { uploadId } }).then(drain, () => {});
      throw err;
    }
  }

  /** Removes keys, 1000 per request (DeleteObjects). */
  async #deleteKeys(keys) {
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      const xml = Buffer.from(`<Delete><Quiet>true</Quiet>${batch.map(k => `<Object><Key>${escapeXml(k)}</Key></Object>`).join('')}</Delete>`);
      const md5 = createHash('md5').update(xml).digest('base64');
      const doc = await this.#xml('POST', '', { query: { delete: '' }, body: xml, headers: { 'content-type': 'application/xml', 'content-md5': md5 } });
      const error = kids(kid(doc, 'DeleteResult'), 'Error')[0];
      if (error) throw s3Error(403, `<Error><Code>${escapeXml(txt(kid(error, 'Code')))}</Code><Message>${escapeXml(txt(kid(error, 'Message')))}</Message></Error>`);
    }
  }

  async remove(path, { folder = false } = {}) {
    drain(await this.#request('DELETE', folder ? `${this.#key(path)}/` : this.#key(path)));
  }

  /** A folder with everything under it (or a file), in batches. */
  async removeTree(path) {
    const what = await this.stat(path);
    if (!what) return;
    if (what.type === 'file') return this.remove(path);
    const all = await this.#all(`${this.#key(path)}/`);
    await this.#deleteKeys([...new Set([...all.map(o => o.key), `${this.#key(path)}/`])]);
  }

  /** The bucket can be listed (and the folder is there). */
  async check() {
    const doc = await this.#xml('GET', '', { query: { 'list-type': 2, prefix: this.#prefix, 'max-keys': 1 } });
    if (!kid(doc, 'ListBucketResult')) throw netError('invalid', 'Risposta del server non S3');
    if (this.#prefix && !kids(kid(doc, 'ListBucketResult'), 'Contents').length) throw netError('not_found', `La cartella ${this.#prefix} non esiste nel bucket`);
  }

  /** The buckets of the account (ListBuckets). */
  async buckets() {
    const doc = await this.#xml('GET', '', { bucket: '' });
    return kids(kid(kid(doc, 'ListAllMyBucketsResult'), 'Buckets'), 'Bucket').map(b => txt(kid(b, 'Name'))).filter(n => BUCKET.test(n));
  }

  close() {
    for (const a of Object.values(this.#agents)) a.destroy();
  }
}

/** The region a bucket of AWS is in, from S3's answer to an unsigned HEAD (it says it even when it refuses). */
async function bucketRegion(bucket, lookup) {
  const url = new URL(`https://s3.amazonaws.com/${uriEncode(bucket)}`);
  return new Promise(resolve => {
    const req = https.request(url, { method: 'HEAD', timeout: 15_000, lookup }, res => { drain(res); resolve(res.headers['x-amz-bucket-region'] || null); });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
    req.end();
  });
}

// ---------- The driver ----------

const providerIs = list => ({ provider: list });

const driver = {
  label: label('Amazon S3 and compatible', 'Amazon S3 e compatibili'),
  order: 70,
  group: 'cloud',
  fields: [
    {
      key: 'provider', type: 'select', label: label('Provider', 'Fornitore'), required: true, default: 'aws',
      options: Object.entries(PROVIDERS).map(([value, p]) => ({ value, label: p.label })),
    },
    {
      key: 'url', type: 'text', label: label('Server address', 'Indirizzo del server'), required: true, when: providerIs(['minio', 'other']),
      placeholder: 'https://s3.example.com', hint: label('With the port if needed (MinIO: http://nas:9000)', 'Con la porta se serve (MinIO: http://nas:9000)'),
    },
    {
      key: 'account', type: 'text', label: label('Cloudflare account ID', 'ID dell’account Cloudflare'), required: true, when: providerIs(['r2']),
      hint: label('Cloudflare dashboard → R2 → Account details', 'Dashboard di Cloudflare → R2 → Dettagli dell’account'),
    },
    {
      key: 'region', type: 'text', label: label('Region', 'Regione'), when: providerIs(['aws', 'b2', 'wasabi', 'minio', 'other']),
      placeholder: 'eu-south-1', hint: label('AWS: found by itself if left empty. Backblaze B2: required (eu-central-003)', 'AWS: la trova da sola se la lasci vuota. Backblaze B2: obbligatoria (eu-central-003)'),
    },
    { key: 'accessKey', type: 'text', label: label('Access key ID', 'ID della chiave di accesso'), required: true },
    {
      key: 'secretKey', type: 'password', label: label('Secret access key', 'Chiave di accesso segreta'), secret: true, required: true,
      hint: label('Better a key that opens this bucket only', 'Meglio una chiave che apre solo questo bucket'),
    },
    {
      key: 'sessionToken', type: 'password', label: label('Session token', 'Token di sessione'), secret: true, when: providerIs(['aws', 'other']),
      hint: label('Only for temporary credentials (STS)', 'Solo per credenziali temporanee (STS)'),
    },
    { key: 'share', type: 'text', label: label('Bucket', 'Bucket'), required: true, placeholder: 'my-bucket' },
    { key: 'root', type: 'text', label: label('Folder in the bucket', 'Cartella nel bucket'), placeholder: '/', hint: label('Optional: only this folder', 'Facoltativo: solo questa cartella') },
    { key: 'pathStyle', type: 'checkbox', label: label('Bucket in the path (path style)', 'Bucket nel percorso (path style)'), default: true, when: providerIs(['other']) },
  ],

  check(v) {
    endpointOf(v);
    cleanPrefix(v.root);
    if (v.share !== undefined && !BUCKET.test(String(v.share))) throw netError('invalid', 'Nome del bucket non valido');
  },

  address(v) {
    const root = (() => { try { return cleanPrefix(v.root); } catch { return ''; } })();
    const where = (() => { try { const e = endpointOf(v); return v.provider === 'aws' ? '' : ` (${e.origin.host})`; } catch { return ''; } })();
    return `s3://${v.share ?? ''}${root ? `/${root.slice(0, -1)}` : ''}${where}`;
  },

  async shares(values, ctx = {}) {
    const { secret = {}, trust = null } = ctx;
    const session = new Session(endpointOf(values), '', '', keysOf(values, secret), trust, needLookup(ctx));
    try {
      return await session.buckets();
    } finally {
      session.close();
    }
  },

  async connect(values, ctx = {}) {
    const { secret = {}, trust = null } = ctx;
    const lookup = needLookup(ctx);
    const end = endpointOf(values);
    if (!BUCKET.test(String(values.share ?? ''))) throw netError('invalid', 'Nome del bucket non valido');
    if (end.guessRegion) {
      const region = await bucketRegion(values.share, lookup);
      if (region && /^[a-z0-9-]{2,40}$/.test(region)) Object.assign(end, endpointOf({ ...values, region }));
    }
    const session = new Session(end, values.share, cleanPrefix(values.root), keysOf(values, secret), trust, lookup);
    try {
      await session.check();
    } catch (err) {
      session.close();
      throw err;
    }
    return session;
  },
};

/** The keys that sign: the access key ID (a value) and the secret ones. */
function keysOf(values, secret) {
  if (typeof secret.secretKey !== 'string' || !secret.secretKey) throw netError('auth', 'Manca la chiave di accesso segreta');
  if (!/^[!-~]{1,256}$/.test(String(values.accessKey ?? ''))) throw netError('invalid', 'ID della chiave di accesso non valido');
  return { accessKey: values.accessKey, secretKey: secret.secretKey, sessionToken: secret.sessionToken || null };
}

export default {
  async init(ctx) {
    ctx.provide('netfs.s3', driver);
  },
};

