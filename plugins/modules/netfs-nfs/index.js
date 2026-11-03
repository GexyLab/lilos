import { Readable } from 'node:stream';
import { Nfs3, NfsError, exports, mount, unmount, FILE, DIR, LINK } from './lib/nfs3.js';
import { RpcError } from './lib/rpc.js';
import { netError, socketError, isDriverError } from './lib/shared/errors.js';
import { chunks } from './lib/shared/streams.js';
import { resolveHost } from './lib/shared/tcp.js';
import { needLookup } from './lib/shared/kernel.js';

/**
 * NFS for the Rete folder: service 'netfs.nfs', see the kernel's net/drivers.js. NFS version 3
 * over TCP, spoken by the module itself (lib/: no mount in the operating system, so it works also
 * where the system has no NFS client, such as Windows Home).
 *
 * Identity: NFSv3 with AUTH_SYS has no password: the server believes the UID and GID the client
 * says, and checks only the client's address (its exports). So the users never type them: an
 * administrator assigns them to each user of lilOS in the module's settings (`identities`, one
 * line per user: 'mario = 1026:100' or 'mario = 1026:100,101'); a user without one cannot
 * connect. Kerberos (krb5, krb5i, krb5p) and NFSv4.1 come later: the connection's choices show
 * them, not selectable.
 *
 * Many servers take only connections from a port below 1024 (Linux's "secure", the default): the
 * module tries one first; where the system does not allow it (Linux without privileges), the
 * server must allow other ports ("insecure", Synology's "Allow connections from non-privileged
 * ports"). Reading and writing go by offset: both resume. NFS has no change notifications: a
 * folder is read again when it is opened. The server's name resolves once, through the kernel
 * (ctx.lookup: only addresses it allows): every connection (portmapper, MOUNT, NFS) goes to that
 * address. For tests only: setting portmapPort (the portmapper's port).
 */
const label = (en, it) => ({ en, it });
const MAX_IO = 1 << 20;
const DEFAULT_IO = 256 << 10;
const HANDLE_LIFE = 30_000;     // a path's handle is used again for this long

let conf = {};

/** The identities the admin assigned: Map username (lower case) → { uid, gid, gids }. Bad lines are skipped. */
export function identities(text = conf.identities) {
  const out = new Map();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const m = /^\s*([^\s=#]+)\s*=\s*(\d{1,10})\s*:\s*(\d{1,10}(?:\s*,\s*\d{1,10}){0,16})\s*(?:#.*)?$/.exec(line);
    if (!m) continue;
    const ids = m[3].split(',').map(s => Number(s.trim()));
    const uid = Number(m[2]);
    if (uid > 0xffffffff || ids.some(n => n > 0xffffffff)) continue;
    out.set(m[1].toLowerCase(), { uid, gid: ids[0], gids: ids.slice(1) });
  }
  return out;
}

function identityOf(user) {
  const id = identities().get(String(user?.username ?? '').toLowerCase());
  if (!id) {
    throw netError('denied', `Un amministratore non ti ha ancora assegnato UID e GID per NFS${user?.username ? ` (utente «${user.username}»)` : ''}: chiediglielo (Pannello di controllo → NFS)`);
  }
  return id;
}

/** An exported folder as written ('/volume1/foto'). Throws 'invalid'. */
function cleanExport(raw) {
  const s = String(raw ?? '').trim();
  if (!s.startsWith('/') || s.length > 1024 || /[\0-\x1f]/.test(s) || s.split('/').some(p => p === '..')) throw netError('invalid', 'Cartella esportata non valida: per esempio /volume1/foto');
  return s.replace(/\/+$/, '') || '/';
}

/** Transport and RPC failures → driver errors. */
function wrap(err) {
  if (err?.code === 'ECONNREFUSED') return netError('unreachable', 'Il server non accetta connessioni NFS (porta chiusa)');
  if (isDriverError(err)) return err;
  if (err instanceof RpcError) {
    if (err.code === 'auth') return netError('denied', err.message);
    if (err.code === 'lost' || err.code === 'timeout') return netError('lost', err.message);
    return netError('unsupported', err.message);
  }
  if (typeof err?.code === 'string') return socketError(err);
  return netError('invalid', err?.message ?? String(err));
}
const guard = fn => async (...args) => { try { return await fn(...args); } catch (err) { throw wrap(err); } };

class Session {
  resume = { read: true, write: true };
  #nfs; #root; #host; #dir; #cred; #io; #handles = new Map(); #lost = null;

  constructor(nfs, root, { host, dir, cred, io }) {
    this.#nfs = nfs;
    this.#root = root;
    this.#host = host;
    this.#dir = dir;
    this.#cred = cred;
    this.#io = io;
    nfs.rpc.onClose(() => this.#lost?.());
    for (const k of ['list', 'stat', 'read', 'write', 'mkdir', 'rename', 'remove', 'space']) this[k] = guard(this[k].bind(this));
  }

  onLost(fn) { this.#lost = fn; }

  /** { handle, attr } of a path, or null. */
  async #resolve(path) {
    const parts = path.split('/').filter(Boolean);
    let at = { handle: this.#root, attr: null };
    let walked = '';
    for (const part of parts) {
      walked += `/${part}`;
      const held = this.#handles.get(walked);
      if (held && Date.now() - held.at < HANDLE_LIFE) { at = held; continue; }
      const found = await this.#nfs.lookup(at.handle, part);
      if (!found) { this.#handles.delete(walked); return null; }
      at = { ...found, at: Date.now() };
      this.#handles.set(walked, at);
      if (this.#handles.size > 2000) this.#handles.delete(this.#handles.keys().next().value);
    }
    if (!at.attr) at = { ...at, attr: await this.#nfs.getattr(at.handle) };
    return at;
  }

  async #need(path) {
    return await this.#resolve(path) ?? (() => { throw netError('not_found', 'Non esiste sul server'); })();
  }

  #forget(path) {
    for (const p of [...this.#handles.keys()]) if (p === path || p.startsWith(`${path}/`)) this.#handles.delete(p);
  }

  async #parent(path) {
    const parent = path.slice(0, path.lastIndexOf('/')) || '/';
    const at = await this.#need(parent);
    if (at.attr.type !== DIR) throw netError('invalid', 'Non è una cartella');
    return { dir: at.handle, name: path.slice(path.lastIndexOf('/') + 1) };
  }

  // ---------- The driver's session ----------

  async list(path) {
    const at = await this.#need(path);
    if (at.attr.type !== DIR) throw netError('invalid', 'Non è una cartella');
    const out = [];
    for (const e of await this.#nfs.readdirplus(at.handle)) {
      const attr = e.attr ?? (e.handle ? await this.#nfs.getattr(e.handle).catch(() => null) : null);
      if (!attr) continue;
      if (e.handle) this.#handles.set(`${path === '/' ? '' : path}/${e.name}`, { handle: e.handle, attr, at: Date.now() });
      out.push(entryOf(e.name, attr));
    }
    return out;
  }

  async stat(path) {
    const at = await this.#resolve(path);
    return at ? entryOf(path.slice(path.lastIndexOf('/') + 1), at.attr) : null;
  }

  async read(path, { start = 0, signal } = {}) {
    let at = await this.#need(path);
    if (at.attr.type === LINK) at = await this.#follow(path, at);
    if (at.attr.type !== FILE) throw netError('invalid', 'Non è un file');
    const nfs = this.#nfs, size = this.#io.read;
    let offset = start, done = false;
    return new Readable({
      async read() {
        if (done) return this.push(null);
        try {
          const { data, eof } = await nfs.read(at.handle, offset, size, { signal });
          offset += data.length;
          if (eof || !data.length) done = true;
          this.push(data.length ? data : null);
          if (done && data.length) this.push(null);
        } catch (err) {
          this.destroy(signal?.aborted ? signal.reason : wrap(err));
        }
      },
    });
  }

  /** What a symbolic link points to, inside the exported folder (a relative path). */
  async #follow(path, at) {
    const target = await this.#nfs.readlink(at.handle);
    if (target.startsWith('/')) throw netError('unsupported', 'Il collegamento punta fuori dalla cartella esportata');
    const parts = (path.slice(0, path.lastIndexOf('/')) || '/').split('/').filter(Boolean);
    for (const p of target.split('/')) {
      if (!p || p === '.') continue;
      if (p === '..') { if (!parts.length) throw netError('unsupported', 'Il collegamento punta fuori dalla cartella esportata'); parts.pop(); } else parts.push(p);
    }
    const found = await this.#resolve(`/${parts.join('/')}`);
    if (!found || found.attr.type === LINK) throw netError('not_found', 'Il collegamento non porta a un file');
    return found;
  }

  /** A file from a stream at `start` (0: made, or emptied; > 0: added to what is there, resuming). */
  async write(path, source, { start = 0, signal } = {}) {
    const { dir, name } = await this.#parent(path);
    let handle;
    if (start > 0) {
      const at = await this.#resolve(path) ?? (() => { throw netError('not_found', 'Il file da riprendere non c’è più'); })();
      if (at.attr.type !== FILE) throw netError('invalid', 'Non è un file');
      handle = at.handle;
      await this.#nfs.setSize(handle, start);   // what is past `start` (a piece not confirmed) goes
    } else {
      const there = await this.#nfs.lookup(dir, name);
      if (there && there.attr.type !== FILE) throw netError('exists', 'C’è già una cartella con questo nome');
      handle = there ? there.handle : await this.#nfs.create(dir, name);
      if (there) await this.#nfs.setSize(handle, 0);
    }
    this.#forget(path);
    let offset = start, verf = null;
    const size = this.#io.write;
    for await (const piece of chunks(source, size)) {
      for (let at = 0; at < piece.length;) {
        const { count, verf: v } = await this.#nfs.write(handle, offset, piece.subarray(at), { signal });
        if (!count) throw netError('lost', 'Il server non ha scritto niente');
        if (verf && v !== verf) throw netError('lost', 'Il server si è riavviato durante la scrittura');
        verf = v;
        at += count;
        offset += count;
      }
    }
    const committed = await this.#nfs.commit(handle, { signal });
    if (verf && committed !== verf) throw netError('lost', 'Il server si è riavviato durante la scrittura');
  }

  async mkdir(path) {
    const { dir, name } = await this.#parent(path);
    await this.#nfs.mkdir(dir, name);
  }

  async rename(from, to) {
    const a = await this.#parent(from), b = await this.#parent(to);
    // NFS replaces what is there: lilOS never does it without asking
    if (await this.#nfs.lookup(b.dir, b.name)) throw netError('exists', 'Esiste già sul server');
    await this.#nfs.rename(a.dir, a.name, b.dir, b.name);
    this.#forget(from);
  }

  async remove(path, { folder = false } = {}) {
    const { dir, name } = await this.#parent(path);
    if (folder) await this.#nfs.rmdir(dir, name); else await this.#nfs.remove(dir, name);
    this.#forget(path);
  }

  async space() {
    const s = await this.#nfs.fsstat(this.#root);
    return { used: Math.max(0, s.total - s.free), total: s.total };
  }

  close() {
    this.#lost = null;
    this.#nfs.close();
    unmount(this.#host, this.#dir, this.#cred, { portmapPort: portmap() }).catch(() => {});
  }
}

function entryOf(name, attr) {
  if (attr.type === DIR) return { name, type: 'folder', size: 0, modified: attr.mtime };
  return { name, type: 'file', size: attr.type === FILE ? attr.size : 0, modified: attr.mtime, ...(attr.type === LINK && { link: true }) };
}

const portOf = v => (Number.isInteger(v.port) && v.port > 0 ? v.port : 0);
/** The portmapper's port: 111 (another one only in tests: setting portmapPort). */
const portmap = () => (Number.isInteger(conf.portmapPort) && conf.portmapPort > 0 ? conf.portmapPort : 111);

// ---------- The driver ----------

const driver = {
  label: label('NFS (Linux, NAS)', 'NFS (Linux, NAS)'),
  order: 80,
  group: 'local',
  space: true,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'nas.local' },
    {
      key: 'version', type: 'select', label: label('Version', 'Versione'), required: true, default: '3',
      options: [
        { value: '3', label: 'NFSv3' },
        { value: '4.1', label: label('NFSv4.1 (coming)', 'NFSv4.1 (in arrivo)'), disabled: true },
      ],
    },
    { key: 'share', type: 'text', label: label('Exported folder', 'Cartella esportata'), required: true, placeholder: '/volume1/foto' },
    {
      key: 'auth', type: 'select', label: label('Authentication', 'Autenticazione'), required: true, default: 'sys',
      options: [
        { value: 'sys', label: label('UID and GID set by the administrator', 'UID e GID dell’amministratore') },
        { value: 'krb5', label: label('Kerberos (coming)', 'Kerberos (in arrivo)'), disabled: true },
      ],
      hint: label('The server trusts the UID and GID lilOS sends: an administrator assigns them to each user (Control Panel → NFS)', 'Il server si fida di UID e GID che lilOS manda: li assegna un amministratore a ogni utente (Pannello di controllo → NFS)'),
    },
    { key: 'port', type: 'number', label: label('NFS port', 'Porta NFS'), min: 1, max: 65535, placeholder: '2049', hint: label('Optional: found by itself', 'Facoltativa: la trova da sola') },
  ],

  ready() {
    if (!identities().size) {
      return label('An administrator must first assign UID and GID to the users (Control Panel → NFS)', 'Un amministratore deve prima assegnare UID e GID agli utenti (Pannello di controllo → NFS)');
    }
    return null;
  },

  check(v) {
    if (v.host !== undefined && !/^[A-Za-z0-9.:[\]-]{1,253}$/.test(String(v.host))) throw netError('invalid', 'Nome del server non valido');
    if (v.share !== undefined) cleanExport(v.share);
    if (v.version !== undefined && v.version !== '3') throw netError('unsupported', 'Per ora solo NFSv3');
    if (v.auth !== undefined && v.auth !== 'sys') throw netError('unsupported', 'Kerberos arriverà in una versione successiva');
  },

  address(v) {
    return `nfs://${v.host ?? ''}${v.share ?? ''}`;
  },

  /** The folders the server exports (MOUNT EXPORT). */
  async shares(values, ctx = {}) {
    const lookup = needLookup(ctx);
    try {
      const { address } = await resolveHost(String(values.host), lookup);
      return (await exports(address, { portmapPort: portmap() })).map(e => e.dir).filter(d => d.startsWith('/'));
    } catch (err) {
      throw wrap(err);
    }
  },

  async connect(values, ctx = {}) {
    const lookup = needLookup(ctx);
    const identity = identityOf(ctx.user);
    const dir = cleanExport(values.share);
    const cred = Nfs3.credOf(identity);
    try {
      const { address: host } = await resolveHost(String(values.host ?? ''), lookup);
      const { handle } = await mount(host, dir, cred, { portmapPort: portmap() });
      const nfs = await Nfs3.open(host, identity, { port: portOf(values), portmapPort: portmap() });
      try {
        const root = await nfs.getattr(handle);
        if (root.type !== DIR) throw netError('invalid', 'La cartella esportata non è una cartella');
        const info = await nfs.fsinfo(handle).catch(() => null);
        const pick = (pref, max) => Math.max(4096, Math.min(MAX_IO, pref || DEFAULT_IO, max || MAX_IO));
        return new Session(nfs, handle, { host, dir, cred, io: { read: pick(info?.rtpref, info?.rtmax), write: pick(info?.wtpref, info?.wtmax) } });
      } catch (err) {
        nfs.close();
        throw err;
      }
    } catch (err) {
      throw err instanceof NfsError ? err : wrap(err);
    }
  },
};

export default {
  async init(ctx) {
    conf = ctx.config;
    ctx.onConfig?.(config => { conf = config; });
    ctx.provide('netfs.nfs', driver);
  },
};
