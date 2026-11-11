import { randomBytes } from 'node:crypto';

/**
 * The files of a user's home for the Logic Studio packages that read or write them in the kernel's
 * main thread (the actions of their blocks). The same rules as the lilOS blocks (logicstudio-lilos):
 *
 * - always AS THE USER through the fs service (never the kernel's principal): the fs module decides
 *   what they may see and change, the kernel's guards count their space and the size of their files;
 * - only the user's home: '~', '~/…' or '/home/<user>/…' (the home's own path, any case);
 * - never its .config (lilOS's own settings), never a file whose content an app protects (FileCrypt);
 * - no '.', '..', '\', NUL; at most `parts` levels, 255 characters a name.
 *
 * Errors are Italian and safe to show to the program (lsUser: true).
 *
 *   const files = homeFiles(() => ctx.service('fs'))
 *   const at = await files.where(user, '~/foto/a.jpg')     { full, shown, home, rest }
 *   await files.fileNode(user, at)                         the node of a file that must be there
 *   await files.fileToWrite(user, at)                      { node, created }: made empty when missing
 *   await files.read(user, at, maxBytes)                   the whole file (Buffer)
 *   await files.write(user, at, bytes)                     replaces the file (made when missing)
 *   await files.writeFrom(user, at, readable, size)        the same from a stream (big files)
 *
 * `fs` is asked for at use time: the kernel wraps the service with its quota guards after every
 * module started.
 */

export const oops = message => Object.assign(new Error(message), { lsUser: true });

const isProtected = node => Object.values(node?.meta?.apps ?? {}).some(v => v?.content === true);
const mb = n => `${Math.round(n / (1 << 20))} MB`;

/** What the kernel's services throw (KernelError, with a code), said for the program. */
export function told(err, shown) {
  if (err?.lsUser) return err;
  switch (err?.code) {
    case 'not_found': return oops(`«${shown}» non esiste (o non puoi vederlo)`);
    case 'forbidden': return oops(`Non hai il permesso di usare «${shown}»`);
    case 'quota': return oops('Spazio finito: la tua home ha raggiunto la sua quota');
    case 'too_large': return oops(`«${shown}» è troppo grande per i limiti di lilOS`);
    case 'invalid': return oops(`«${shown}»: ${err.message || 'operazione non valida'}`);
    case 'unavailable': return oops('Il file system di lilOS non risponde: riprova più tardi');
    default: return err instanceof Error ? err : oops(String(err));
  }
}

export function homeFiles(getFs, { parts: maxParts = 32 } = {}) {
  const fs = () => getFs() ?? (() => { throw oops('Il file system di lilOS non c\'è'); })();

  async function where(user, raw) {
    const path = typeof raw === 'string' ? raw.trim() : '';
    if (!path) throw oops('Manca il percorso del file');
    if (path.length > 4096 || path.includes('\0') || path.includes('\\')) throw oops(`Percorso non valido: ${path.slice(0, 80)}`);
    if (!path.startsWith('~') && !path.startsWith('/')) throw oops(`Percorso non valido: ${path.slice(0, 80)} (scrivi ~/… oppure /home/…)`);
    if (path.startsWith('~') && path !== '~' && !path.startsWith('~/')) throw oops(`Percorso non valido: ${path.slice(0, 80)}`);
    const parts = path.split('/').filter(Boolean);
    if (parts.some(p => p === '.' || p === '..')) throw oops(`Percorso non valido: «.» e «..» non sono ammessi (${path.slice(0, 80)})`);
    if (parts.some(p => p.length > 255)) throw oops('Un nome del percorso è troppo lungo (al massimo 255 caratteri)');
    if (parts.length > maxParts) throw oops(`Percorso troppo profondo (al massimo ${maxParts} livelli)`);
    let home;
    try { home = await fs().home(user); } catch (err) { throw told(err, '~'); }
    const homeParts = String(home.path).split('/').filter(Boolean);
    let rest;
    if (parts[0] === '~') rest = parts.slice(1);
    else {
      const inside = parts.length >= homeParts.length && homeParts.every((h, i) => h.toLowerCase() === parts[i].toLowerCase());
      if (!inside) throw oops(`Puoi usare solo i file della tua home (~/… oppure ${home.path}/…): ${path.slice(0, 80)}`);
      rest = parts.slice(homeParts.length);
    }
    if (rest[0]?.toLowerCase() === '.config') throw oops('La cartella .config è di lilOS: i programmi non la usano');
    const shown = rest.length ? `~/${rest.join('/')}` : '~';
    return { full: `/${[...homeParts, ...rest].join('/')}`, shown, home, rest };
  }

  async function lookup(user, at) {
    try { return await fs().lookup(user, at.full); } catch (err) { throw told(err, at.shown); }
  }

  async function fileNode(user, at) {
    const node = await lookup(user, at);
    if (!node) throw oops(`Il file «${at.shown}» non esiste`);
    if (node.type !== 'file') throw oops(`«${at.shown}» non è un file`);
    if (isProtected(node)) throw oops(`Il contenuto di «${at.shown}» è protetto da un'app: i programmi non lo usano`);
    return node;
  }

  /** Checks, without making anything, that a file can be written there: { exists, dirShown }. */
  async function canWrite(user, at) {
    if (!at.rest.length) throw oops('Serve il nome di un file, non la home');
    const found = await lookup(user, at);
    if (found) {
      if (found.type !== 'file') throw oops(`«${at.shown}» non è un file`);
      if (isProtected(found)) throw oops(`Il contenuto di «${at.shown}» è protetto da un'app: i programmi non lo cambiano`);
      return { exists: true };
    }
    const dirShown = at.rest.length > 1 ? `~/${at.rest.slice(0, -1).join('/')}` : '~';
    if (at.rest.length > 1) {
      const parent = await lookup(user, { full: at.full.slice(0, at.full.lastIndexOf('/')), shown: dirShown });
      if (!parent) throw oops(`La cartella «${dirShown}» non esiste`);
      if (parent.type !== 'folder') throw oops(`«${dirShown}» non è una cartella`);
    }
    return { exists: false };
  }

  async function fileToWrite(user, at) {
    if (!at.rest.length) throw oops('Serve il nome di un file, non la home');
    const found = await lookup(user, at);
    if (found) {
      if (found.type !== 'file') throw oops(`«${at.shown}» non è un file`);
      if (isProtected(found)) throw oops(`Il contenuto di «${at.shown}» è protetto da un'app: i programmi non lo cambiano`);
      return { node: found, created: false };
    }
    const dirShown = at.rest.length > 1 ? `~/${at.rest.slice(0, -1).join('/')}` : '~';
    const parent = at.rest.length > 1
      ? await lookup(user, { full: at.full.slice(0, at.full.lastIndexOf('/')), shown: dirShown })
      : { id: at.home.id, type: 'folder' };
    if (!parent) throw oops(`La cartella «${dirShown}» non esiste`);
    if (parent.type !== 'folder') throw oops(`«${dirShown}» non è una cartella`);
    const now = Date.now();
    const node = { id: `${at.home.id}/${randomBytes(9).toString('base64url')}`, parent: parent.id, name: at.rest.at(-1), type: 'file', meta: {}, created: now, modified: now };
    try { await fs().apply(user, { put: [node] }); } catch (err) { throw told(err, at.shown); }
    return { node: { ...node, size: 0 }, created: true };
  }

  async function read(user, at, max) {
    const node = await fileNode(user, at);
    const size = Number(node.size);
    if (Number.isFinite(size) && size > max) throw oops(`Il file «${at.shown}» è troppo grande: ${mb(size)} (si leggono al massimo ${mb(max)})`);
    try {
      const service = fs();
      if ((!Number.isFinite(size) || size <= 0) && typeof service.readStream === 'function') {
        const chunks = [];
        let total = 0;
        for await (const chunk of await service.readStream(user, node.id, { start: 0 })) {
          total += chunk.length;
          if (total > max) throw oops(`Il file «${at.shown}» è troppo grande (si leggono al massimo ${mb(max)})`);
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }
      const bytes = Buffer.from(await service.read(user, node.id));
      if (bytes.length > max) throw oops(`Il file «${at.shown}» è troppo grande (si leggono al massimo ${mb(max)})`);
      return bytes;
    } catch (err) { throw told(err, at.shown); }
  }

  async function write(user, at, bytes) {
    const { node } = await fileToWrite(user, at);
    try { await fs().write(user, node.id, bytes); } catch (err) { throw told(err, at.shown); }
    return { size: bytes.length };
  }

  async function writeFrom(user, at, readable, size) {
    const { node } = await fileToWrite(user, at);
    const service = fs();
    try {
      if (typeof service.writeFrom === 'function') await service.writeFrom(user, node.id, readable, Number.isSafeInteger(size) ? { size } : {});
      else {
        const chunks = [];
        for await (const chunk of readable) chunks.push(Buffer.from(chunk));
        await service.write(user, node.id, Buffer.concat(chunks));
      }
    } catch (err) { throw told(err, at.shown); }
    return { size };
  }

  return { where, lookup, fileNode, canWrite, fileToWrite, read, write, writeFrom, oops, told };
}
