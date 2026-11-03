import { Writer } from './xdr.js';
import { RpcClient, RpcError, AUTH_SYS, AUTH_NONE, authSys } from './rpc.js';

/**
 * NFS version 3 (RFC 1813) with its MOUNT protocol and the portmapper (RFC 1833) to find them:
 * the client side, over TCP. Only what a file manager needs: lookups, attributes, reading a
 * folder (READDIRPLUS), reading and writing (WRITE UNSTABLE, then COMMIT), creating, removing,
 * renaming, links read, space (FSSTAT). Every value from the server is bounded (xdr.js).
 */
const PORTMAP = 100000, MOUNT = 100005, NFS = 100003;
const FH_MAX = 64;
const NAME_MAX = 1024;
const PATH_MAX = 4096;
const MAX_ENTRIES = 100_000;          // entries of one folder, all pages together
const MAX_EXPORTS = 1000;

export const FILE = 1, DIR = 2, LINK = 5;
const STATUS = {
  1: ['denied', 'operazione non permessa'], 2: ['not_found', 'non esiste'], 5: ['lost', 'errore di lettura o scrittura sul server'],
  6: ['not_found', 'dispositivo non disponibile'], 13: ['denied', 'accesso negato'], 17: ['exists', 'esiste già'], 18: ['unsupported', 'tra file system diversi'],
  19: ['not_found', 'dispositivo inesistente'], 20: ['invalid', 'non è una cartella'], 21: ['invalid', 'è una cartella'], 22: ['invalid', 'argomento non valido'],
  27: ['denied', 'file troppo grande'], 28: ['denied', 'spazio esaurito sul server'], 30: ['denied', 'file system in sola lettura'], 31: ['denied', 'troppi collegamenti'],
  63: ['invalid', 'nome troppo lungo'], 66: ['denied', 'cartella non vuota'], 69: ['denied', 'quota esaurita'], 70: ['lost', 'riferimento non più valido'],
  71: ['unsupported', 'troppi livelli remoti'], 10001: ['lost', 'riferimento non valido'], 10003: ['lost', 'la cartella è cambiata durante la lettura'],
  10004: ['unsupported', 'operazione non supportata'], 10005: ['invalid', 'risposta troppo grande'], 10006: ['invalid', 'errore del server'],
  10007: ['unsupported', 'tipo non supportato'], 10008: ['busy', 'il server è occupato, riprova'],
};
const MOUNT_STATUS = { 1: 'operazione non permessa', 2: 'cartella esportata inesistente', 5: 'errore del server', 13: 'il server non esporta questa cartella a lilOS (indirizzo non autorizzato, o serve una porta sotto 1024: opzione «insecure»)', 20: 'non è una cartella', 22: 'argomento non valido', 63: 'nome troppo lungo', 10004: 'non supportato', 10006: 'errore del server' };

/** An NFS status that is not OK → { net, message } as the driver throws it. */
export class NfsError extends Error {
  constructor(status, what = '') {
    const [net, text] = STATUS[status] ?? ['invalid', `errore ${status}`];
    super(what ? `${what}: ${text}` : text);
    this.status = status;
    this.net = net;
  }
}

// ---------- Decoding ----------

const uhyperLoose = r => { const hi = r.uint(), lo = r.uint(); return hi * 2 ** 32 + lo; };
const time = r => r.uint() * 1000 + Math.floor(r.uint() / 1e6);

function fattr(r) {
  const type = r.uint(), mode = r.uint();
  r.uint();                              // nlink
  const uid = r.uint(), gid = r.uint();
  const size = uhyperLoose(r);
  uhyperLoose(r);                        // used
  r.uint(); r.uint();                    // rdev
  r.hyperBytes(); r.hyperBytes();        // fsid, fileid
  time(r);                               // atime
  const mtime = time(r);
  time(r);                               // ctime
  return { type, mode, uid, gid, size: Number.isSafeInteger(size) ? size : 0, mtime };
}
const postOpAttr = r => (r.bool() ? fattr(r) : null);
const postOpFh = r => (r.bool() ? r.opaque(FH_MAX) : null);
function wcc(r) {
  if (r.bool()) { uhyperLoose(r); time(r); time(r); }
  postOpAttr(r);
}

const sattr = ({ mode = null, size = null } = {}) => {
  const w = new Writer();
  w.bool(mode !== null); if (mode !== null) w.uint(mode);
  w.bool(false).bool(false);             // uid, gid: the server's choice
  w.bool(size !== null); if (size !== null) w.uhyper(size);
  w.uint(0).uint(0);                     // atime, mtime: unchanged
  return w.done();
};
const fh = (w, h) => w.opaque(h);
const dirop = (w, dir, name) => fh(w, dir).string(name);

// ---------- Portmapper and MOUNT ----------

/** The port of an RPC program on a host (portmapper GETPORT, TCP); 0 if not registered. */
export async function getPort(host, prog, vers, { port = 111 } = {}) {
  const c = await RpcClient.open(host, port);
  try {
    const r = await c.call(PORTMAP, 2, 3, new Writer().uint(prog).uint(vers).uint(6).uint(0).done());
    return r.uint();
  } finally {
    c.close();
  }
}

async function mountClient(host, mountPort, portmapPort = 111) {
  const port = mountPort || await getPort(host, MOUNT, 3, { port: portmapPort });
  if (!port) throw new RpcError('rpc', 'Il server non offre il servizio MOUNT (NFSv3): forse è solo NFSv4');
  return RpcClient.open(host, port);
}

/** The folders a server exports: [{ dir, groups }]. */
export async function exports(host, { mountPort = 0, portmapPort } = {}) {
  const c = await mountClient(host, mountPort, portmapPort);
  try {
    const r = await c.call(MOUNT, 3, 5, Buffer.alloc(0));
    const out = [];
    while (r.bool()) {
      const dir = r.string(PATH_MAX);
      const groups = [];
      while (r.bool()) { if (groups.length < 100) groups.push(r.string(NAME_MAX)); else r.string(NAME_MAX); }
      out.push({ dir, groups });
      if (out.length > MAX_EXPORTS) break;
    }
    return out;
  } finally {
    c.close();
  }
}

/** Mounts an exported folder: its file handle (MNT). The connection to MOUNT is closed after. */
export async function mount(host, dir, cred, { mountPort = 0, portmapPort } = {}) {
  const c = await mountClient(host, mountPort, portmapPort);
  try {
    const r = await c.call(MOUNT, 3, 1, new Writer().string(dir).done(), cred);
    const status = r.uint();
    if (status !== 0) {
      const err = new Error(`Montaggio rifiutato: ${MOUNT_STATUS[status] ?? `errore ${status}`}`);
      err.net = status === 2 ? 'not_found' : 'denied';
      throw err;
    }
    const handle = r.opaque(FH_MAX);
    const flavors = [];
    for (let n = Math.min(r.uint(), 32); n > 0; n--) flavors.push(r.uint());
    return { handle, flavors };
  } finally {
    c.close();
  }
}

/** Tells the server the folder is no longer mounted (UMNT): best effort. */
export async function unmount(host, dir, cred, { mountPort = 0, portmapPort } = {}) {
  const c = await mountClient(host, mountPort, portmapPort).catch(() => null);
  if (!c) return;
  try { await c.call(MOUNT, 3, 3, new Writer().string(dir).done(), cred); } catch { /* gone already */ } finally { c.close(); }
}

// ---------- NFS ----------

/** The NFS service of a mounted folder: the procedures, on one connection. */
export class Nfs3 {
  #rpc; #cred;

  constructor(rpc, identity) {
    this.#rpc = rpc;
    this.#cred = identity ? { flavor: AUTH_SYS, body: authSys(identity) } : { flavor: AUTH_NONE, body: Buffer.alloc(0) };
  }

  static async open(host, identity, { port = 0, portmapPort = 111 } = {}) {
    const p = port || await getPort(host, NFS, 3, { port: portmapPort }).catch(() => 0) || 2049;
    return new Nfs3(await RpcClient.open(host, p), identity);
  }

  static credOf(identity) {
    return identity ? { flavor: AUTH_SYS, body: authSys(identity) } : { flavor: AUTH_NONE, body: Buffer.alloc(0) };
  }

  get rpc() { return this.#rpc; }

  /** A procedure: its arguments, → a Reader positioned after the status (OK) or throws NfsError. */
  async #call(proc, args, { what = '', signal, onError } = {}) {
    for (let attempt = 0; ; attempt++) {
      const r = await this.#rpc.call(NFS, 3, proc, args, this.#cred, { signal });
      const status = r.uint();
      if (status === 0) return r;
      if (status === 10008 && attempt < 5) {   // JUKEBOX: the server is fetching it, ask again later
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      onError?.(r);
      throw new NfsError(status, what);
    }
  }

  async getattr(h) {
    return fattr(await this.#call(1, fh(new Writer(), h).done()));
  }

  /** { handle, attr } of a name in a folder, or null if there is none. */
  async lookup(dir, name) {
    try {
      const r = await this.#call(3, dirop(new Writer(), dir, name).done());
      const handle = r.opaque(FH_MAX);
      const attr = postOpAttr(r);
      return { handle, attr: attr ?? await this.getattr(handle) };
    } catch (err) {
      if (err.status === 2) return null;
      throw err;
    }
  }

  async readlink(h) {
    const r = await this.#call(5, fh(new Writer(), h).done());
    postOpAttr(r);
    return r.string(PATH_MAX);
  }

  /** Up to `count` bytes from `offset`: { data, eof }. */
  async read(h, offset, count, { signal } = {}) {
    const r = await this.#call(6, fh(new Writer(), h).uhyper(offset).uint(count).done(), { signal });
    postOpAttr(r);
    const n = r.uint();
    const eof = r.bool();
    const data = r.opaque(count);
    if (data.length !== n) throw new NfsError(5);
    return { data, eof };
  }

  /** Writes bytes at `offset` (UNSTABLE: COMMIT makes them sure). → { count, verf } */
  async write(h, offset, data, { signal, stable = 0 } = {}) {
    const r = await this.#call(7, fh(new Writer(), h).uhyper(offset).uint(data.length).uint(stable).opaque(data).done(), { signal, onError: wcc });
    wcc(r);
    const count = r.uint();
    r.uint();
    return { count, verf: r.fixed(8).toString('hex') };
  }

  async commit(h, { signal } = {}) {
    const r = await this.#call(21, fh(new Writer(), h).uhyper(0).uint(0).done(), { signal });
    wcc(r);
    return r.fixed(8).toString('hex');
  }

  /** Makes a file (empty; an existing one is emptied: UNCHECKED with size 0). → handle */
  async create(dir, name, { mode = 0o644 } = {}) {
    const r = await this.#call(8, new Writer().fixed(dirop(new Writer(), dir, name).done()).uint(0).fixed(sattr({ mode, size: 0 })).done(), { what: name });
    const handle = postOpFh(r);
    return handle ?? (await this.lookup(dir, name))?.handle;
  }

  async setSize(h, size) {
    await this.#call(2, new Writer().fixed(fh(new Writer(), h).done()).fixed(sattr({ size })).bool(false).done());
  }

  async mkdir(dir, name, { mode = 0o755 } = {}) {
    const r = await this.#call(9, new Writer().fixed(dirop(new Writer(), dir, name).done()).fixed(sattr({ mode })).done(), { what: name });
    return postOpFh(r);
  }

  async remove(dir, name) {
    await this.#call(12, dirop(new Writer(), dir, name).done(), { what: name });
  }

  async rmdir(dir, name) {
    await this.#call(13, dirop(new Writer(), dir, name).done(), { what: name });
  }

  async rename(fromDir, fromName, toDir, toName) {
    await this.#call(14, new Writer().fixed(dirop(new Writer(), fromDir, fromName).done()).fixed(dirop(new Writer(), toDir, toName).done()).done(), { what: fromName });
  }

  /** Everything in a folder: [{ name, attr, handle }] ('.' and '..' left out). */
  async readdirplus(dir) {
    const out = [];
    let cookie = Buffer.alloc(8), verf = Buffer.alloc(8);
    const seen = new Set();
    for (;;) {
      const r = await this.#call(17, fh(new Writer(), dir).fixed(cookie).fixed(verf).uint(64 * 1024).uint(512 * 1024).done());
      postOpAttr(r);
      verf = r.fixed(8);
      let last = null;
      while (r.bool()) {
        r.hyperBytes();                  // fileid
        const name = r.string(NAME_MAX);
        last = r.hyperBytes();
        const attr = postOpAttr(r);
        const handle = postOpFh(r);
        if (name !== '.' && name !== '..') out.push({ name, attr, handle });
        if (out.length > MAX_ENTRIES) throw new NfsError(10005);
      }
      const eof = r.bool();
      if (eof || !last) return out;
      const key = last.toString('hex');
      if (seen.has(key)) return out;     // a server that loops: what was read so far
      seen.add(key);
      cookie = last;
    }
  }

  /** { total, free } bytes of the file system (FSSTAT). */
  async fsstat(h) {
    const r = await this.#call(18, fh(new Writer(), h).done());
    postOpAttr(r);
    const total = uhyperLoose(r);
    const free = uhyperLoose(r);
    return { total, free };
  }

  /** The sizes the server prefers: { rtpref, wtpref } (FSINFO). */
  async fsinfo(h) {
    const r = await this.#call(19, fh(new Writer(), h).done());
    postOpAttr(r);
    const rtmax = r.uint(), rtpref = r.uint();
    r.uint();
    const wtmax = r.uint(), wtpref = r.uint();
    return { rtmax, rtpref, wtmax, wtpref };
  }

  close() {
    this.#rpc.close();
  }
}
