import http from 'node:http';
import https from 'node:https';
import { createHash, randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { netError, socketError } from './lib/shared/errors.js';
import { sessionAgents, send, readText, drain, resumable, REQUEST_TIMEOUT } from './lib/shared/http.js';
import { parseXml, kid, kids, txt } from './lib/shared/xml.js';
import { needLookup, needPaths } from './lib/shared/kernel.js';

/**
 * WebDAV for the Rete folder (service 'netfs.webdav', see the kernel's net/drivers.js): files and
 * folders of Nextcloud, ownCloud, Apache mod_dav, NAS and other servers, over HTTP or HTTPS.
 * The path of the address is the root of the connection. Sign-in with Basic, or Digest (RFC 7616,
 * MD5 or SHA-256) when the server asks for it.
 *
 * Over HTTPS nothing is sent (no request, so no password) on a connection whose certificate is not
 * verified or confirmed by the user: the socket goes to a request only after the check, otherwise
 * the call stops with 'untrusted' and the certificate's SHA-256 fingerprint to show.
 *
 * WebDAV has no standard way to add to a file, so an upload cannot resume (resume.write false);
 * a download can (Range), and if the server ignores Range the first bytes are skipped.
 */
const DAV = 'DAV:';
const MAX_XML = 8 << 20;               // a PROPFIND answer of a very big folder, at most
const MAX_REDIRECTS = 3;
const CONTINUE_WAIT = 1_500;           // how long PUT waits for "100 Continue" before sending anyway
const REDIRECT = new Set([301, 302, 303, 307, 308]);

const label = (en, it) => ({ en, it });
let modulePaths = null;   // ctx.paths of init (the kernel's path helpers)

// ---------- XML (PROPFIND answers) ----------

const child = (el, name) => kid(el, name, DAV);
const childrenOf = (el, name) => kids(el, name, DAV);
const statusOf = el => Number(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i.exec(txt(el))?.[1]) || null;

/** The responses of a multistatus: [{ href, status, props: { name: element } }] (only the DAV: properties found, 2xx). */
export function parseMultistatus(text) {
  let doc;
  try { doc = parseXml(text, { maxLength: MAX_XML }); } catch { throw netError('invalid', 'Risposta del server non WebDAV'); }
  const ms = child(doc, 'multistatus') ?? (() => { throw netError('invalid', 'Risposta del server non WebDAV'); })();
  return childrenOf(ms, 'response').map(r => {
    const props = {};
    for (const ps of childrenOf(r, 'propstat')) {
      const code = statusOf(child(ps, 'status'));
      if (code !== null && (code < 200 || code > 299)) continue;
      for (const p of child(ps, 'prop')?.children ?? []) if (p.ns === DAV) props[p.name] = p;
    }
    return { href: txt(child(r, 'href')), status: statusOf(child(r, 'status')), props };
  });
}

// ---------- Paths ----------

const decodePart = s => { try { return decodeURIComponent(s); } catch { return s; } };
/** '/a%20b/c/' → '/a b/c' (decoded, no trailing slash; '/' for the top). */
const decodePath = pathname => `/${pathname.split('/').filter(Boolean).map(decodePart).join('/')}`;
const encodePath = path => path.split('/').filter(Boolean).map(encodeURIComponent).join('/');

/** True if a redirect only adds '/' to the URL (the server's way to say it is a folder); hex case may differ. */
function sameFolder(location, url) {
  try {
    const to = new URL(location, url);
    return to.origin === url.origin && to.pathname.endsWith('/') && decodePath(to.pathname) === decodePath(url.pathname);
  } catch {
    return false;
  }
}

/** The address of a connection: an http(s) URL, without user, query or fragment, ending with '/'. Throws 'invalid'. */
function baseUrl(raw) {
  let url;
  try { url = new URL(String(raw ?? '').trim()); } catch { throw netError('invalid', 'Indirizzo non valido: serve per esempio https://server/cartella/'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw netError('invalid', 'L’indirizzo deve cominciare con https:// o http://');
  const user = decodePart(url.username);
  url.username = ''; url.password = ''; url.search = ''; url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return { url, user };
}

// ---------- Sign-in ----------

/** The challenges of a 401, from each WWW-Authenticate header: [{ scheme, params }] (one header may hold several). */
export function parseChallenges(values) {
  const out = [];
  for (const value of values) {
    const re = /\s*(?:,\s*)*([A-Za-z0-9!#$%&'*+.^_`|~-]+)(?:\s*=\s*("(?:[^"\\]|\\.)*"|[^\s,]*))?/gy;
    let current = null, m;
    while (re.lastIndex < value.length && (m = re.exec(value)) && m[0]) {
      if (m[2] === undefined) {
        // A token alone: a new scheme (a token68 such as Negotiate's data is taken as one too: no harm)
        out.push(current = { scheme: m[1].toLowerCase(), params: {} });
      } else if (current) {
        const v = m[2].startsWith('"') ? m[2].slice(1, -1).replace(/\\(.)/g, '$1') : m[2];
        current.params[m[1].toLowerCase()] = v;
      }
    }
  }
  return out;
}

const HASH = { md5: 'md5', 'md5-sess': 'md5', 'sha-256': 'sha256', 'sha-256-sess': 'sha256' };

/** The Digest answer for one request (RFC 7616): the Authorization header's value. */
export function digestAuthorization({ user, password, method, uri, challenge: c, nc, cnonce }) {
  const algorithm = (c.algorithm || 'MD5').toLowerCase();
  const H = s => createHash(HASH[algorithm]).update(s, 'utf8').digest('hex');
  let ha1 = H(`${user}:${c.realm ?? ''}:${password}`);
  if (algorithm.endsWith('-sess')) ha1 = H(`${ha1}:${c.nonce}:${cnonce}`);
  const ha2 = H(`${method}:${uri}`);
  const qop = c.qop ? 'auth' : null;
  const ncHex = nc.toString(16).padStart(8, '0');
  const response = qop ? H(`${ha1}:${c.nonce}:${ncHex}:${cnonce}:${qop}:${ha2}`) : H(`${ha1}:${c.nonce}:${ha2}`);
  const q = s => `"${String(s).replace(/(["\\])/g, '\\$1')}"`;
  const parts = [
    `username=${q(user)}`, `realm=${q(c.realm ?? '')}`, `nonce=${q(c.nonce)}`, `uri=${q(uri)}`,
    `algorithm=${c.algorithm || 'MD5'}`, `response=${q(response)}`,
  ];
  if (c.opaque !== undefined) parts.push(`opaque=${q(c.opaque)}`);
  if (qop) parts.push(`qop=${qop}`, `nc=${ncHex}`, `cnonce=${q(cnonce)}`);
  return `Digest ${parts.join(', ')}`;
}

/** The best challenge we can answer: Digest SHA-256, then Digest MD5, then Basic; null if none. */
function pickChallenge(challenges) {
  const digests = challenges.filter(c => c.scheme === 'digest' && c.params.nonce && HASH[(c.params.algorithm || 'MD5').toLowerCase()]
    && (!c.params.qop || c.params.qop.split(',').some(q => q.trim().toLowerCase() === 'auth')));
  const rank = c => ((c.params.algorithm || 'MD5').toLowerCase().startsWith('sha-256') ? 0 : 1);
  digests.sort((a, b) => rank(a) - rank(b));
  if (digests.length) return { scheme: 'digest', params: digests[0].params };
  if (challenges.some(c => c.scheme === 'basic')) return { scheme: 'basic' };
  return null;
}

// ---------- Errors ----------

/** An HTTP status that is not a success, as a driver error. */
function httpError(status, method) {
  if (status === 401) return netError('auth', 'Utente o password non validi');
  if (status === 403) return netError('denied', 'accesso negato (403)');
  if (status === 404 || status === 410) return netError('not_found', `Non esiste sul server (${status})`);
  if (status === 405 && method === 'MKCOL') return netError('exists', 'Esiste già sul server');
  if (status === 405 && method === 'PROPFIND') return netError('unsupported', 'Il server non è WebDAV a questo indirizzo (405)');
  if (status === 409) return netError('not_found', 'Manca la cartella che lo contiene (409)');
  if (status === 412 && method === 'MOVE') return netError('exists', 'Esiste già sul server');
  if (status === 423) return netError('denied', 'bloccato da un altro programma (423)');
  if (status === 507) return netError('denied', 'spazio esaurito sul server (507)');
  if (status === 413) return netError('denied', 'file troppo grande per il server (413)');
  if (status === 405 || status === 501) return netError('unsupported', `operazione non disponibile (${status})`);
  if (status === 502 || status === 503 || status === 504) return netError('unreachable', `server non disponibile (${status})`);
  if (status >= 400 && status < 500) return netError('invalid', `richiesta rifiutata (${status})`);
  return new Error(`Errore del server (${status})`);
}

// ---------- Driver ----------

const PROPFIND_BODY = Buffer.from('<?xml version="1.0" encoding="utf-8"?>\n'
  + '<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/><d:getlastmodified/></d:prop></d:propfind>');

const driver = {
  label: label('WebDAV', 'WebDAV'),
  order: 40,
  fields: [
    {
      key: 'url', type: 'text', label: label('Address', 'Indirizzo'), required: true,
      placeholder: 'https://cloud.example.com/remote.php/dav/files/ann/',
      hint: label(
        'The folder to open, with https:// (Nextcloud: …/remote.php/dav/files/<user>/). With http:// the password travels unencrypted',
        'La cartella da aprire, con https:// (Nextcloud: …/remote.php/dav/files/<utente>/). Con http:// la password viaggia in chiaro',
      ),
    },
    { key: 'user', type: 'text', label: label('User', 'Utente') },
    { key: 'password', type: 'password', label: label('Password', 'Password'), secret: true, hint: label('For Nextcloud, better an app password', 'Per Nextcloud, meglio una password per le app') },
  ],

  /** User and password go in their fields: written in the address they would be kept as text. */
  check(v) {
    let url;
    try { url = new URL(String(v.url ?? '').trim()); } catch { return; }
    if (url.username || url.password) throw netError('invalid', 'Non scrivere utente e password nell’indirizzo: usa i campi Utente e Password');
  },

  address(v) {
    try {
      const { url, user } = baseUrl(v.url);
      const who = v.user || user;
      return `${url.protocol}//${who ? `${who}@` : ''}${url.host}${decodePath(url.pathname)}`;
    } catch {
      return String(v.url ?? 'webdav');
    }
  },

  async connect(values, ctx = {}) {
    const { secret = {}, trust = null } = ctx;
    const { url, user } = baseUrl(values.url);
    const session = new Session(url, values.user || user, secret.password ?? '', trust, { lookup: needLookup(ctx), paths: needPaths(ctx, { paths: modulePaths }) });
    try {
      const top = await session.stat('/');
      if (!top) throw netError('not_found', 'La cartella dell’indirizzo non esiste sul server');
      if (top.type !== 'folder') throw netError('invalid', 'L’indirizzo non è una cartella WebDAV');
    } catch (err) {
      session.close();
      throw err;
    }
    return session;
  },
};

class Session {
  resume = { read: true, write: false };
  #base; #user; #password; #agents; #paths; #auth = null; #nc = 0;

  constructor(base, user, password, trust, { lookup, paths }) {
    this.#base = base;
    this.#user = user ?? '';
    this.#password = password ?? '';
    this.#paths = paths;
    this.#agents = sessionAgents(trust, { lookup, maxSockets: 6 });
  }

  /** The URL of a path of the connection ('/' is the address itself); folders end with '/'. */
  #url(path, folder = false) {
    const rel = encodePath(path);
    return new URL(this.#base.pathname + rel + (folder && rel ? '/' : ''), this.#base);
  }

  get #hasCredentials() { return !!(this.#user || this.#password); }

  #authorization(method, url) {
    if (!this.#auth || !this.#hasCredentials) return null;
    if (this.#auth.scheme === 'basic') return `Basic ${Buffer.from(`${this.#user}:${this.#password}`, 'utf8').toString('base64')}`;
    return digestAuthorization({
      user: this.#user, password: this.#password, method, uri: url.pathname + url.search,
      challenge: this.#auth.params, nc: ++this.#nc, cnonce: randomBytes(12).toString('hex'),
    });
  }

  /** After a 401: true if asking again (with credentials, or a fresh nonce) makes sense. */
  #challenge(res, sentAuth) {
    const values = [];
    for (let i = 0; i < res.rawHeaders.length; i += 2) if (res.rawHeaders[i].toLowerCase() === 'www-authenticate') values.push(res.rawHeaders[i + 1]);
    const picked = pickChallenge(parseChallenges(values));
    if (!picked) {
      if (values.length) throw netError('unsupported', 'Il server chiede un tipo di accesso che lilOS non conosce');
      return false;
    }
    if (!this.#hasCredentials) return false;
    const stale = picked.scheme === 'digest' && String(picked.params.stale).toLowerCase() === 'true';
    if (sentAuth && picked.scheme === this.#auth?.scheme && !stale) return false;   // the same credentials were refused
    this.#auth = picked;
    this.#nc = 0;
    return true;
  }

  /** One request: resolves with the answer (its body not read yet); a failed connection rejects with a driver error. */
  async #send(method, url, { headers = {}, body = null, signal } = {}) {
    const auth = this.#authorization(method, url);
    const res = await send(url, {
      method, body, signal, agent: this.#agents[url.protocol],
      headers: { 'User-Agent': 'lilOS', ...headers, ...(auth && { Authorization: auth }) },
    });
    res.sentAuth = !!auth;
    return res;
  }

  /**
   * A request that can be sent again: signs in when the server asks (once), sends again once if a
   * kept-alive socket was closed under it, and follows redirects (same server only) with `follow`.
   */
  async #call(method, url, { headers, body, signal, follow = false } = {}) {
    let signedIn = false, replayed = false, redirects = 0;
    for (;;) {
      let res;
      try {
        res = await this.#send(method, url, { headers, body, signal });
      } catch (err) {
        if (err.reused && !replayed && err.net === 'lost') { replayed = true; continue; }
        throw err;
      }
      if (res.statusCode === 401) {
        drain(res);
        if (!signedIn && this.#challenge(res, res.sentAuth)) { signedIn = true; continue; }
        throw httpError(401, method);
      }
      if (follow && REDIRECT.has(res.statusCode) && res.headers.location) {
        drain(res);
        if (++redirects > MAX_REDIRECTS) throw netError('invalid', 'Troppi rimandi del server');
        url = this.#redirect(url, res.headers.location);
        continue;
      }
      return res;
    }
  }

  /** Where a redirect goes, if it is the same server (http may become https, never the other way). */
  #redirect(from, location) {
    let to;
    try { to = new URL(location, from); } catch { throw netError('invalid', 'Il server rimanda a un indirizzo non valido'); }
    const upgrade = from.protocol === 'http:' && to.protocol === 'https:';
    if (to.hostname !== from.hostname || (to.protocol !== from.protocol && !upgrade) || (!upgrade && to.port !== from.port)) {
      throw netError('invalid', `Il server rimanda a un altro indirizzo (${to.origin}): correggi l’indirizzo della connessione`);
    }
    return to;
  }

  async #propfind(url, depth) {
    const res = await this.#call('PROPFIND', url, {
      headers: { Depth: String(depth), 'Content-Type': 'application/xml; charset=utf-8', 'Content-Length': String(PROPFIND_BODY.length) },
      body: PROPFIND_BODY, follow: true,
    });
    if (res.statusCode !== 207 && res.statusCode !== 200) { drain(res); throw httpError(res.statusCode, 'PROPFIND'); }
    // The answer's own address (after redirects), to read relative hrefs against
    const at = new URL(res.req?.path ?? url.pathname, url);
    return { at, responses: parseMultistatus(await readText(res, MAX_XML)) };
  }

  /** An answer of MOVE or DELETE that is a multistatus (207): the first failure in it, or null. */
  async #multistatusFailure(res, method) {
    const failed = parseMultistatus(await readText(res, MAX_XML)).find(r => r.status && (r.status < 200 || r.status > 299));
    return failed ? httpError(failed.status, method) : null;
  }

  /** A request without body for MKCOL, MOVE and DELETE; a folder named without '/' is asked again with it. */
  async #simple(method, path, { folder = false, headers = () => ({}), ok }) {
    let url = this.#url(path, folder);
    for (let again = false; ; again = true) {
      const res = await this.#call(method, url, { headers: headers(folder) });
      const location = res.headers.location;
      if (!again && !folder && REDIRECT.has(res.statusCode) && location && sameFolder(location, url)) {
        // A folder without the final '/' (Apache's DirectorySlash): the same request on 'folder/'
        drain(res);
        folder = true;
        url = this.#url(path, true);
        continue;
      }
      if (res.statusCode === 207) {
        const failure = await this.#multistatusFailure(res, method);
        if (failure) throw failure;
        return;
      }
      drain(res);
      if (ok.includes(res.statusCode)) return;
      throw httpError(res.statusCode, method);
    }
  }

  // ---------- The session (drivers.js) ----------

  async list(path) {
    const url = this.#url(path, true);
    const { at, responses } = await this.#propfind(url, 1);
    const self = decodePath(at.pathname);
    const out = [], names = new Set();
    let selfSeen = false;
    responses.forEach((r, index) => {
      if (!r.href || (r.status && (r.status < 200 || r.status > 299))) return;
      let where;
      try { where = decodePath(new URL(r.href, at).pathname); } catch { return; }
      if (where === self) { selfSeen = true; return; }
      // A server behind a proxy that rewrites paths: the folder itself is the first answer
      if (index === 0 && !selfSeen && r.props.resourcetype && this.#paths.baseName(where) === this.#paths.baseName(self) && responses.length > 1
        && responses.slice(1).every(o => { try { return decodePath(new URL(o.href, at).pathname).startsWith(`${where}/`); } catch { return false; } })) return;
      const name = this.#paths.baseName(where);
      if (!name || name === '.' || name === '..' || /[\0-\x1f\x7f]/.test(name) || names.has(name)) return;
      names.add(name);
      out.push(entryOf(name, r.props));
    });
    return out;
  }

  async stat(path) {
    try {
      const { responses } = await this.#propfind(this.#url(path), 0);
      const r = responses.find(x => !x.status || (x.status >= 200 && x.status < 300));
      return r ? entryOf(this.#paths.baseName(path), r.props) : null;
    } catch (err) {
      if (err.net === 'not_found') return null;
      throw err;
    }
  }

  async read(path, { start = 0, signal } = {}) {
    const headers = { 'Accept-Encoding': 'identity', ...(start > 0 && { Range: `bytes=${start}-` }) };
    const res = await this.#call('GET', this.#url(path), { headers, signal, follow: true });
    const status = res.statusCode;
    if (status === 416 && start > 0) { drain(res); return Readable.from([]); }   // nothing after `start`
    if (status !== 200 && status !== 206) { drain(res); throw httpError(status, 'GET'); }
    return resumable(res, { start, signal });
  }

  /**
   * Uploads a file with PUT, streaming. "Expect: 100-continue" lets the server refuse (or ask to
   * sign in) before the body goes, so the request can be made again without losing the source.
   * With `size` the body has a Content-Length (some servers refuse a chunked PUT), else it is chunked.
   */
  async write(path, source, { start = 0, signal, size } = {}) {
    if (start > 0) throw netError('unsupported', 'WebDAV non permette di riprendere un invio a metà');
    const url = this.#url(path);
    let sourceError = null;
    const onSourceError = err => { sourceError = err; };
    source.on('error', onSourceError);
    try {
      for (let attempt = 0, expect = true; ; attempt++) {
        if (sourceError) throw sourceError;
        const auth = this.#authorization('PUT', url);
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.request(url, {
          method: 'PUT', agent: this.#agents[url.protocol], signal, timeout: REQUEST_TIMEOUT,
          headers: {
            'User-Agent': 'lilOS', 'Content-Type': 'application/octet-stream', ...(Number.isSafeInteger(size) && { 'Content-Length': String(size) }),
            ...(expect && { Expect: '100-continue' }), ...(auth && { Authorization: auth }),
          },
        });
        req.on('timeout', () => req.destroy(Object.assign(new Error('Il server non risponde'), { code: 'ETIMEDOUT' })));
        let bodyStarted = false;
        const answer = new Promise((resolve, reject) => {
          req.on('response', resolve);
          req.on('error', err => reject(socketError(err, { started: bodyStarted })));
        });
        answer.catch(() => {});
        req.flushHeaders();
        // Wait for "100 Continue" (or an early answer); some servers never send it, so not for long
        const early = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(null), expect ? CONTINUE_WAIT : 0);
          req.once('continue', () => { clearTimeout(timer); resolve(null); });
          answer.then(res => { clearTimeout(timer); resolve(res); }, err => { clearTimeout(timer); reject(err); });
        });
        if (early) {
          drain(early);
          req.destroy();
          if (early.statusCode === 401 && attempt < 2 && this.#challenge(early, !!auth)) continue;
          if (early.statusCode === 417 && expect) { expect = false; continue; }   // a server that refuses Expect
          throw httpError(early.statusCode >= 200 && early.statusCode < 300 ? 400 : early.statusCode, 'PUT');
        }
        if (sourceError) { req.destroy(); throw sourceError; }
        bodyStarted = true;
        source.pipe(req);
        source.once('error', err => req.destroy(err));
        let res;
        try {
          res = await answer;
        } catch (err) {
          if (sourceError) throw sourceError;
          throw err;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await new Promise(resolve => { if (source.readableEnded) resolve(); else source.once('end', resolve).once('close', resolve); });
          drain(res);
          if (sourceError) throw sourceError;
          return;
        }
        drain(res);
        source.unpipe(req);
        req.destroy();
        if (res.statusCode === 401) {
          // The nonce went stale while the body was on its way: the source is spent, the transfer tries again
          if (this.#challenge(res, !!auth)) throw netError('lost', 'Il server ha chiesto di nuovo l’accesso durante l’invio');
          throw httpError(401, 'PUT');
        }
        throw httpError(res.statusCode, 'PUT');
      }
    } finally {
      source.off('error', onSourceError);
    }
  }

  async mkdir(path) {
    // Some servers (rclone, others) answer 201 to MKCOL on a folder that is there: ask first
    if (await this.stat(path)) throw netError('exists', 'Esiste già sul server');
    return this.#simple('MKCOL', path, { folder: true, ok: [200, 201, 204] });
  }

  rename(from, to) {
    return this.#simple('MOVE', from, {
      ok: [200, 201, 204],
      headers: folder => ({ Destination: this.#url(to, folder).href, Overwrite: 'F' }),
    });
  }

  remove(path, { folder = false } = {}) {
    return this.#simple('DELETE', path, { folder, ok: [200, 202, 204] });
  }

  close() {
    for (const agent of Object.values(this.#agents)) agent.destroy();
  }
}

function entryOf(name, props) {
  const folder = !!child(props.resourcetype, 'collection');
  const modified = Date.parse(txt(props.getlastmodified));
  return {
    name,
    type: folder ? 'folder' : 'file',
    size: folder ? 0 : Number(txt(props.getcontentlength)) || 0,
    modified: Number.isFinite(modified) ? modified : 0,
  };
}

export default {
  async init(ctx) {
    modulePaths = ctx.paths ?? null;
    ctx.provide('netfs.webdav', driver);
  },
};
