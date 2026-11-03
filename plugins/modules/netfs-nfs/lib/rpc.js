import { randomInt } from 'node:crypto';
import { Reader, Writer, XdrError } from './xdr.js';
import { privilegedConnect } from './shared/tcp.js';

/**
 * ONC RPC version 2 (RFC 5531) over TCP, with record marking: calls with AUTH_SYS (uid, gid,
 * groups) or AUTH_NONE, matched to their replies by xid. Many servers take only connections from
 * a port below 1024 (NFS's "secure" option): the client tries one first, and uses an ordinary
 * port when the system does not allow it (an unprivileged process on Linux). The host is an
 * address the driver resolved through the kernel (ctx.lookup).
 */
export const AUTH_NONE = 0;
export const AUTH_SYS = 1;
const MAX_RECORD = 8 << 20;           // a reply bigger than this is refused
const CALL_TIMEOUT = 60_000;
const CONNECT_TIMEOUT = 15_000;

/** An RPC failure: code 'rpc' (the call was not run) or 'auth' (credentials refused), or the transport's. */
export class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const AUTH_STAT = { 1: 'credenziali non valide', 2: 'credenziali rifiutate (forse serve una porta sotto 1024)', 3: 'verifica non valida', 4: 'verifica rifiutata', 5: 'sicurezza troppo debole (il server vuole Kerberos)' };

/** The bytes of AUTH_SYS credentials. */
export function authSys({ uid, gid, gids = [] }) {
  return new Writer().uint(Math.floor(Date.now() / 1000)).string('lilos').uint(uid).uint(gid).uint(gids.length).uints(gids.slice(0, 16)).done();
}

/** One TCP connection to an RPC program. */
export class RpcClient {
  #socket; #pending = new Map(); #xid = randomInt(1, 2 ** 31); #buffered = []; #size = 0; #need = null; #last = false; #fragments = []; #fragmentsSize = 0;
  #closed = null; #onClose = new Set();
  privileged;

  constructor(socket, privileged) {
    this.#socket = socket;
    this.privileged = privileged;
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 30_000);
    socket.on('data', chunk => this.#data(chunk));
    socket.on('error', err => this.#end(err));
    socket.on('close', () => this.#end(new RpcError('lost', 'Connessione chiusa dal server')));
  }

  static async open(host, port) {
    const { socket, privileged } = await privilegedConnect(host, port, { timeout: CONNECT_TIMEOUT });
    return new RpcClient(socket, privileged);
  }

  get closed() { return !!this.#closed; }

  onClose(fn) { this.#onClose.add(fn); }

  #end(err) {
    if (this.#closed) return;
    this.#closed = err;
    for (const p of this.#pending.values()) { clearTimeout(p.timer); p.reject(err); }
    this.#pending.clear();
    this.#socket.destroy();
    for (const fn of this.#onClose) { try { fn(err); } catch { /* listener's */ } }
  }

  /** Bytes from the server: records (fragments with a 4-byte mark), each one a reply. */
  #data(chunk) {
    this.#buffered.push(chunk);
    this.#size += chunk.length;
    while (this.#size >= 4) {
      if (this.#need === null) {
        const head = this.#buffered[0].length >= 4 ? this.#buffered[0] : Buffer.concat(this.#buffered);
        const mark = head.readUInt32BE(0);
        const length = mark & 0x7fffffff;
        if (length > MAX_RECORD || this.#fragmentsSize + length > MAX_RECORD) return this.#end(new RpcError('rpc', 'Risposta del server troppo grande'));
        this.#need = 4 + length;
        this.#last = (mark & 0x80000000) !== 0;
      }
      if (this.#size < this.#need) return;
      // A whole fragment is here: joined once
      const all = this.#buffered.length === 1 ? this.#buffered[0] : Buffer.concat(this.#buffered);
      this.#fragments.push(all.subarray(4, this.#need));
      this.#fragmentsSize += this.#need - 4;
      const rest = all.subarray(this.#need);
      this.#buffered = rest.length ? [rest] : [];
      this.#size = rest.length;
      this.#need = null;
      if (this.#last) {
        const record = this.#fragments.length === 1 ? this.#fragments[0] : Buffer.concat(this.#fragments);
        this.#fragments = [];
        this.#fragmentsSize = 0;
        this.#reply(record);
      }
    }
  }

  #reply(record) {
    let r, xid;
    try {
      r = new Reader(record);
      xid = r.uint();
      if (r.uint() !== 1) return;   // not a reply: ignored
    } catch {
      return;
    }
    const p = this.#pending.get(xid);
    if (!p) return;
    this.#pending.delete(xid);
    clearTimeout(p.timer);
    try {
      const replyStat = r.uint();
      if (replyStat === 1) {
        const reject = r.uint();
        if (reject === 0) throw new RpcError('rpc', `Versione di RPC non supportata dal server (${r.uint()}-${r.uint()})`);
        const why = r.uint();
        throw new RpcError('auth', `Il server ha rifiutato l’accesso: ${AUTH_STAT[why] ?? `errore ${why}`}`);
      }
      r.uint(); r.opaque(400);   // the server's verifier
      const accept = r.uint();
      if (accept === 1) throw new RpcError('rpc', 'Servizio non disponibile sul server');
      if (accept === 2) throw new RpcError('rpc', `Versione non supportata dal server (${r.uint()}-${r.uint()})`);
      if (accept === 3) throw new RpcError('rpc', 'Operazione non supportata dal server');
      if (accept !== 0) throw new RpcError('rpc', `Il server non ha eseguito la richiesta (${accept})`);
      p.resolve(r);
    } catch (err) {
      p.reject(err instanceof XdrError ? new RpcError('rpc', err.message) : err);
    }
  }

  /**
   * Calls a procedure: args a Buffer (XDR); cred { flavor, body }. Resolves with a Reader on the
   * results. signal: stops waiting (the reply, if it comes, is dropped).
   */
  call(prog, vers, proc, args, cred = { flavor: AUTH_NONE, body: Buffer.alloc(0) }, { signal } = {}) {
    if (this.#closed) return Promise.reject(this.#closed);
    const xid = this.#xid = (this.#xid + 1) % 2 ** 32 || 1;
    const head = new Writer().uint(xid).uint(0).uint(2).uint(prog).uint(vers).uint(proc).uint(cred.flavor).opaque(cred.body).uint(AUTH_NONE).uint(0).done();
    const length = head.length + args.length;
    const mark = Buffer.alloc(4);
    mark.writeUInt32BE((0x80000000 | length) >>> 0);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.#pending.delete(xid); reject(new RpcError('timeout', 'Il server non risponde')); }, CALL_TIMEOUT);
      this.#pending.set(xid, { resolve, reject, timer });
      signal?.addEventListener('abort', () => {
        if (!this.#pending.delete(xid)) return;
        clearTimeout(timer);
        reject(signal.reason);
      }, { once: true });
      this.#socket.write(Buffer.concat([mark, head, args]));
    });
  }

  close() {
    this.#end(new RpcError('lost', 'Connessione chiusa'));
  }
}
