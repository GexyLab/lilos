// Copy of modules/_shared/dbhttp.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';

/**
 * A small HTTP client for the Logic Studio packages whose database speaks HTTP (InfluxDB,
 * Elasticsearch): the same file in each of them (lib/http.js), no npm library.
 *
 *  - Addresses: every connection goes through the module's guard (dbcore makeGuard): a name is
 *    resolved by `guard.lookup(port)`, which checks every address it gives (and keeps out the
 *    databases of lilOS itself); an IP written in the URL is checked by `guard.check(ip, port)`.
 *  - TLS (https only): `servername` is the host name; the certificate is checked only with
 *    tls 'verify' ('on' = encrypted without checking it).
 *  - One time limit for the whole request (timeoutMs, the response's body too), one size limit for
 *    the response (maxBytes), the caller's AbortSignal (the program stopped).
 *  - No redirects followed: a 3xx is an error (the address to write is another one).
 *  - Headers (Authorization: a token, a password) are never logged nor put in an error.
 *
 *   const client = new HttpClient({ base: baseUrl('https://host:8086'), guard, tls: 'verify' });
 *   const r = await client.request({ method, path, query, headers, body, timeoutMs, maxBytes, signal });
 *   r → { status, headers, body: Buffer, text(), json() }        client.close()
 */
const MAX_URL = 16384;
const MAX_BODY = 32 << 20;
const oops = (message, code) => Object.assign(new Error(message), code && { code });

/** The server's URL, checked: http or https, no user nor password in it, no query: a URL with no trailing slash. */
export function baseUrl(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) throw oops('Manca l\'indirizzo del server (URL)');
  if (s.length > 2048) throw oops('Indirizzo del server troppo lungo');
  let url;
  try { url = new URL(s); } catch { throw oops(`Indirizzo del server non valido: ${s.slice(0, 120)}`); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw oops(`Solo indirizzi http:// e https://: ${url.protocol}`);
  if (url.username || url.password) throw oops('Non scrivere utente e password nell\'indirizzo: usa i campi delle impostazioni');
  if (!url.hostname) throw oops('Manca il server nell\'indirizzo');
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url;
}

/** The port of a URL (the protocol's one when it does not say). */
export const portOf = url => Number(url.port || (url.protocol === 'https:' ? 443 : 80));

/** Why a request failed, said for the program: never the headers nor the query. */
function told(err, url, timeoutMs) {
  if (['forbidden', 'too_large', 'redirect', 'quota'].includes(err?.code)) return err;
  if (err?.code === 'timeout') return oops(`Nessuna risposta da ${url.host} in ${Math.round(timeoutMs / 1000)} secondi`, 'timeout');
  if (err?.name === 'AbortError' || err?.code === 'ABORT_ERR') return oops('Richiesta interrotta: il programma si è fermato', 'aborted');
  switch (err?.code) {
    case 'ENOTFOUND': case 'EAI_AGAIN': return oops(`Server non trovato: ${url.hostname}`, err.code);
    case 'ECONNREFUSED': return oops(`Connessione rifiutata da ${url.host}`, err.code);
    case 'ECONNRESET': case 'EPIPE': return oops(`Connessione chiusa da ${url.host}`, err.code);
    case 'EHOSTUNREACH': case 'ENETUNREACH': return oops(`${url.host} non è raggiungibile`, err.code);
    case 'CERT_HAS_EXPIRED': return oops(`Il certificato di ${url.hostname} è scaduto`, err.code);
    case 'DEPTH_ZERO_SELF_SIGNED_CERT': case 'SELF_SIGNED_CERT_IN_CHAIN': case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE': case 'ERR_TLS_CERT_ALTNAME_INVALID': case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
      return oops(`Il certificato di ${url.hostname} non è valido (si può non controllarlo nelle impostazioni della connessione)`, err.code);
    case 'EPROTO': case 'ERR_SSL_WRONG_VERSION_NUMBER': return oops(`${url.host} non parla HTTPS (forse l'indirizzo è http://)`, err.code);
    case 'HPE_INVALID_CONSTANT': case 'HPE_INVALID_HEADER_TOKEN': return oops(`${url.host} non risponde in HTTP (forse l'indirizzo è https://)`, err.code);
    default: return oops(`Richiesta a ${url.host} non riuscita: ${String(err?.message ?? err).split('\n')[0].slice(0, 200)}`, err?.code);
  }
}

/** The body to send: a Buffer or a string as it is, anything else as JSON. → { bytes, type } | null */
function bodyOf(value) {
  if (value === undefined || value === null) return null;
  let bytes, type;
  if (Buffer.isBuffer(value)) { bytes = value; type = 'application/octet-stream'; }
  else if (typeof value === 'string') { bytes = Buffer.from(value, 'utf8'); type = 'text/plain; charset=utf-8'; }
  else { bytes = Buffer.from(JSON.stringify(value), 'utf8'); type = 'application/json'; }
  if (bytes.length > MAX_BODY) throw oops(`Richiesta troppo grande (al massimo ${MAX_BODY >> 20} MB)`, 'too_large');
  return { bytes, type };
}

export class HttpClient {
  #base; #guard; #tls; #agent; #lib; #port; #host;

  /** base: from baseUrl(); guard: the module's (makeGuard); tls: 'verify' | 'on' (https only). */
  constructor({ base, guard, tls = 'verify', maxSockets = 4 }) {
    this.#base = base;
    this.#guard = guard;
    this.#tls = tls === 'on' ? 'on' : 'verify';
    this.#lib = base.protocol === 'https:' ? https : http;
    this.#port = portOf(base);
    this.#host = base.hostname.replace(/^\[|\]$/g, '');
    this.#agent = new this.#lib.Agent({ keepAlive: true, maxSockets, maxFreeSockets: 2, timeout: 60_000 });
  }

  get url() { return this.#base; }

  /**
   * One request: { method, path (after the base's path), query ({name: value} or [[name, value]]),
   * headers, body (Buffer | text | JSON value), timeoutMs, maxBytes, signal }.
   * → { status, headers, body: Buffer, text(), json() } whatever the status, but a 3xx (an error).
   */
  async request({ method = 'GET', path = '/', query, headers = {}, body, timeoutMs = 30_000, maxBytes = 4 << 20, signal } = {}) {
    const url = new URL(this.#base.href);
    url.pathname = `${this.#base.pathname.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;   // the base's '/' is ''
    const pairs = Array.isArray(query) ? query : Object.entries(query ?? {});
    for (const [k, v] of pairs) if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    if (url.href.length > MAX_URL) throw oops('Richiesta troppo lunga (indirizzo)');
    const payload = bodyOf(body);

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) { if (signal.aborted) controller.abort(); else signal.addEventListener('abort', onAbort, { once: true }); }
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      if (isIP(this.#host)) await this.#guard.check(this.#host, this.#port);
      const lookup = await this.#guard.lookup(this.#port);
      const res = await new Promise((resolve, reject) => {
        const req = this.#lib.request({
          protocol: url.protocol, hostname: this.#host, port: this.#port, path: `${url.pathname}${url.search}`, method,
          headers: {
            'user-agent': 'lilOS Logic Studio', 'accept-encoding': 'identity',
            ...(payload && { 'content-type': payload.type }),
            ...headers,
            ...(payload && { 'content-length': String(payload.bytes.length) }),
          },
          agent: this.#agent, lookup, signal: controller.signal,
          ...(this.#lib === https && {
            rejectUnauthorized: this.#tls === 'verify',
            ...(!isIP(this.#host) && { servername: this.#host }),
          }),
        }, resolve);
        req.on('error', reject);
        req.end(payload ? payload.bytes : undefined);
      });
      if (res.statusCode >= 300 && res.statusCode < 400) {
        res.resume();
        throw oops(`Il server ha risposto con un reindirizzamento (${res.statusCode}): controlla l'indirizzo del server`, 'redirect');
      }
      const bytes = await read(res, maxBytes);
      return {
        status: res.statusCode, headers: { ...res.headers }, body: bytes,
        text: () => bytes.toString('utf8'),
        json: () => {
          const t = bytes.toString('utf8');
          if (!t.trim()) return null;
          try { return JSON.parse(t); } catch { throw oops(`Risposta non valida da ${url.host} (non è JSON)`); }
        },
      };
    } catch (err) {
      throw told(timedOut ? oops('timeout', 'timeout') : err, url, timeoutMs);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  /** Closes the sockets kept open. */
  close() { this.#agent.destroy(); }
}

/** The response's bytes, at most maxBytes. */
async function read(res, maxBytes) {
  const tooLarge = () => oops(`Risposta troppo grande (più di ${Math.round(maxBytes / 1024)} KB): chiedi meno dati`, 'too_large');
  const declared = Number(res.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) { res.destroy(); throw tooLarge(); }
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of res) {
      size += chunk.length;
      if (size > maxBytes) throw tooLarge();
      chunks.push(chunk);
    }
  } catch (err) {
    res.destroy();
    throw err;
  }
  return Buffer.concat(chunks);
}
