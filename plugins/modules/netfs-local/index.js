import { createReadStream, createWriteStream, watch as fsWatch } from 'node:fs';
import { lstat, mkdir, readdir, realpath, rename as fsRename, rm, rmdir, stat, statfs, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { netError, isDriverError } from './lib/shared/errors.js';

/**
 * Folders of the computer the kernel runs on, in the Rete folder: service 'netfs.local' (see the
 * kernel's net/drivers.js). With the program lilOS on a computer that is the user's own computer:
 * Documenti, Download, a USB stick… appear in Rete › Questo computer and are read and written in
 * place (no copies).
 *
 * Who may connect what: with one user, or for an administrator, any folder; other users only the
 * folders an administrator lists in the module's settings (`roots`, one per line) or folders
 * inside them. Paths never leave the chosen folder: '..' is refused and symbolic links that point
 * outside it are not shown nor followed. `readOnly` makes the connection read only.
 */
const label = (en, it) => ({ en, it });
let conf = {};

/** The folders listed for the users who are not administrators. */
const roots = () => String(conf.roots ?? '').split(/\r?\n/).map(s => s.trim()).filter(s => s && isAbsolute(s));

function wrap(err) {
  if (isDriverError(err)) return err;
  switch (err?.code) {
    case 'ENOENT': case 'ENOTDIR': return netError('not_found', 'Non trovato');
    case 'EEXIST': case 'ENOTEMPTY': return netError('exists', 'Esiste già');
    case 'EACCES': case 'EPERM': return netError('denied', 'Il computer non lo permette (permessi del suo utente)');
    case 'EBUSY': return netError('denied', 'In uso da un altro programma del computer');
    case 'ENOSPC': return netError('denied', 'Spazio finito sul disco');
    case 'EROFS': return netError('denied', 'Il disco è di sola lettura');
    case 'EIO': case 'ENXIO': case 'ENODEV': return netError('lost', 'Il disco non risponde (scollegato?)');
    default: return netError('invalid', err?.message ?? String(err));
  }
}
const guard = fn => async (...args) => { try { return await fn(...args); } catch (err) { throw wrap(err); } };

const inside = (root, real) => real === root || real.startsWith(root.endsWith(sep) ? root : root + sep);

class Session {
  resume = { read: true, write: true };
  #root;
  #readOnly;
  #watchers = new Set();

  constructor(root, readOnly) {
    this.#root = root;
    this.#readOnly = readOnly;
  }

  /** The path of the computer for a path of the connection ('/a/b'), checked to stay inside. */
  #full(path) {
    const parts = String(path ?? '/').split('/').filter(Boolean);
    if (parts.some(p => p === '.' || p === '..' || p.includes('\0') || p.includes('\\') || (process.platform === 'win32' && p.includes(':')))) {
      throw netError('invalid', 'Percorso non valido');
    }
    const full = join(this.#root, ...parts);
    if (!inside(this.#root, full)) throw netError('invalid', 'Percorso non valido');
    return full;
  }

  /** The path, also through symbolic links, still inside the folder (else 'denied'). */
  async #real(path, { parent = false } = {}) {
    const full = this.#full(path);
    const real = await realpath(parent ? dirname(full) : full);
    if (!inside(this.#root, real)) throw netError('denied', 'Fuori dalla cartella collegata');
    return full;
  }

  #writable() {
    if (this.#readOnly) throw netError('denied', 'Collegamento di sola lettura');
  }

  async #entry(dir, name) {
    const full = join(dir, name);
    const l = await lstat(full);
    let s = l, link = false;
    if (l.isSymbolicLink()) {
      link = true;
      const real = await realpath(full).catch(() => null);
      if (!real || !inside(this.#root, real)) return null;
      s = await stat(full).catch(() => null);
      if (!s) return null;
    }
    if (!s.isFile() && !s.isDirectory()) return null;
    return { name, type: s.isDirectory() ? 'folder' : 'file', size: s.isFile() ? s.size : 0, modified: s.mtimeMs, ...(link && { link: true }) };
  }

  list = guard(async path => {
    const dir = await this.#real(path);
    const names = await readdir(dir);
    const out = await Promise.all(names.map(n => this.#entry(dir, n).catch(() => null)));
    return out.filter(Boolean);
  });

  stat = guard(async path => {
    if (path === '/' || !path) return { name: '', type: 'folder', size: 0, modified: (await stat(this.#root)).mtimeMs };
    try {
      const full = await this.#real(path);
      return await this.#entry(dirname(full), full.slice(dirname(full).length + 1));
    } catch (err) {
      if (err?.code === 'ENOENT' || err?.net === 'not_found') return null;
      throw err;
    }
  });

  read = guard(async (path, { start = 0, signal } = {}) => {
    const full = await this.#real(path);
    return createReadStream(full, { start, signal });
  });

  write = guard(async (path, source, { start = 0, signal } = {}) => {
    this.#writable();
    const full = await this.#real(path, { parent: true });
    if (start > 0) {
      const s = await stat(full);
      if (s.size < start) throw netError('invalid', 'Ripresa oltre la fine del file');
    }
    await pipeline(source, createWriteStream(full, { flags: start > 0 ? 'r+' : 'w', start, signal }));
  });

  mkdir = guard(async path => {
    this.#writable();
    await mkdir(await this.#real(path, { parent: true }));
  });

  rename = guard(async (from, to) => {
    this.#writable();
    const a = await this.#real(from), b = await this.#real(to, { parent: true });
    // A different name only in upper and lower case is the same file on Windows and macOS
    if (a.toLowerCase() !== b.toLowerCase() && await lstat(b).then(() => true, () => false)) throw netError('exists', 'Esiste già');
    await fsRename(a, b);
  });

  remove = guard(async (path, { folder = false } = {}) => {
    this.#writable();
    const full = this.#full(path);
    // A symbolic link goes as itself, never what it points to
    if (folder && !(await lstat(full)).isSymbolicLink()) await rmdir(await this.#real(path));
    else await unlink(full);
  });

  removeTree = guard(async path => {
    this.#writable();
    if (!path || path === '/') throw netError('denied', 'La cartella collegata non si elimina da qui');
    await rm(await this.#real(path), { recursive: true });
  });

  watch(path, onChange) {
    let w;
    try {
      w = fsWatch(this.#full(path), { persistent: false }, () => onChange());
      w.on('error', () => {});
    } catch {
      return () => {};
    }
    this.#watchers.add(w);
    return () => { w.close(); this.#watchers.delete(w); };
  }

  space = guard(async () => {
    const s = await statfs(this.#root);
    return { used: (s.blocks - s.bfree) * s.bsize, total: s.blocks * s.bsize };
  });

  close() {
    for (const w of this.#watchers) w.close();
    this.#watchers.clear();
  }
}

/** The folder as written, absolute (C:\Users\…, /home/…). Throws 'invalid'. */
function cleanFolder(raw) {
  const s = String(raw ?? '').trim();
  if (!s || s.length > 1024 || /[\0-\x1f]/.test(s) || !isAbsolute(s)) throw netError('invalid', 'Serve il percorso completo di una cartella del computer, per esempio C:\\Users\\Mario\\Documents o /home/mario/Documenti');
  return resolve(s);
}

const driver = {
  label: label('This computer (folder)', 'Questo computer (cartella)'),
  order: 0,
  group: 'local',
  space: true,
  fields: [
    {
      key: 'folder', type: 'text', required: true,
      label: label('Folder of the computer', 'Cartella del computer'),
      placeholder: process.platform === 'win32' ? 'C:\\Users\\Mario\\Documents' : process.platform === 'darwin' ? '/Users/mario/Documents' : '/home/mario/Documenti',
      hint: label('Of the computer the kernel of lilOS runs on: with the program lilOS, your own', 'Del computer su cui gira il kernel di lilOS: con il programma lilOS, il tuo'),
    },
    { key: 'readOnly', type: 'checkbox', default: false, label: label('Read only', 'Sola lettura') },
  ],

  address: values => String(values.folder ?? ''),

  check(values) {
    cleanFolder(values.folder);
  },

  async connect(values, ctx = {}) {
    const wanted = cleanFolder(values.folder);
    let root;
    try {
      root = await realpath(wanted);
      if (!(await stat(root)).isDirectory()) throw netError('invalid', 'Non è una cartella');
      await readdir(root);
    } catch (err) {
      throw wrap(err);
    }
    const user = ctx.user ?? {};
    if (user.multiUser && user.role !== 'admin') {
      const allowed = await Promise.all(roots().map(r => realpath(r).catch(() => null)));
      if (!allowed.some(r => r && inside(r, root))) {
        throw netError('denied', 'Questa cartella del computer non è tra quelle che un amministratore ha permesso (Pannello di controllo → Cartelle del computer)');
      }
    }
    return new Session(root, values.readOnly === true);
  },
};

export default {
  async init(ctx) {
    conf = ctx.config ?? {};
    ctx.onConfig?.(config => { conf = config ?? {}; });
    ctx.provide('netfs.local', driver);
  },
};
