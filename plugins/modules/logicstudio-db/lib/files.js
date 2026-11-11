import { randomBytes } from 'node:crypto';

/**
 * The SQLite files of the blocks: files of the user's lilOS home, read and written AS THE USER
 * through the fs service (never the kernel's principal), so the fs module decides what they may see
 * and change and the kernel's guards count their space and file size (the same rules as the lilOS
 * blocks, logicstudio-lilos/lib/actions.js: only '~/…' or '/home/<user>/…', never .config, never a
 * file an app protects).
 *
 * A file open for writing belongs to one program at a time (lock by file id): a second program gets
 * a clear error, or opens it read-only.
 *
 *   open(user, tools, path, { readOnly }) → { shown, bytes: Buffer | null (a new file), save(bytes), close() }
 */
const MAX_PARTS = 32;
const newId = () => randomBytes(9).toString('base64url');
const isProtected = node => Object.values(node?.meta?.apps ?? {}).some(v => v?.content === true);
const oops = message => new Error(message);

function told(err, shown) {
  switch (err?.code) {
    case 'not_found': return oops(`«${shown}» non esiste (o non puoi vederlo)`);
    case 'forbidden': return oops(`Non hai il permesso di usare «${shown}»`);
    case 'quota': return oops('Spazio finito: la tua home ha raggiunto la sua quota');
    case 'too_large': return oops(`«${shown}» è troppo grande per i limiti di lilOS`);
    case 'unavailable': return oops('Il file system di lilOS non risponde: riprova più tardi');
    default: return err instanceof Error ? err : oops(String(err));
  }
}

export function makeFiles(fsService, { maxBytes = () => 1 << 30 } = {}) {
  const fs = () => { const s = fsService?.(); if (!s) throw oops('Il file system di lilOS non c\'è'); return s; };
  const locks = new Map();   // file id → program id

  async function where(user, raw) {
    const path = typeof raw === 'string' ? raw.trim() : '';
    if (!path) throw oops('Manca il file del database SQLite (per esempio ~/Documenti/dati.sqlite)');
    if (path.length > 4096 || path.includes('\0') || path.includes('\\')) throw oops(`Percorso non valido: ${path.slice(0, 80)}`);
    if (!path.startsWith('~') && !path.startsWith('/')) throw oops(`Percorso non valido: ${path.slice(0, 80)} (scrivi ~/… oppure /home/…)`);
    if (path.startsWith('~') && path !== '~' && !path.startsWith('~/')) throw oops(`Percorso non valido: ${path.slice(0, 80)}`);
    const parts = path.split('/').filter(Boolean);
    if (parts.some(p => p === '.' || p === '..')) throw oops(`Percorso non valido: «.» e «..» non sono ammessi (${path.slice(0, 80)})`);
    if (parts.some(p => p.length > 255) || parts.length > MAX_PARTS) throw oops('Percorso troppo lungo');
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
    if (!rest.length) throw oops('Serve il nome di un file, non la home');
    if (rest[0].toLowerCase() === '.config') throw oops('La cartella .config è di lilOS: i programmi non la usano');
    return { full: `/${[...homeParts, ...rest].join('/')}`, shown: `~/${rest.join('/')}`, home, rest };
  }

  const lookup = async (user, full, shown) => { try { return await fs().lookup(user, full); } catch (err) { throw told(err, shown); } };

  async function read(user, node, shown) {
    const limit = maxBytes();
    if (Number(node.size) > limit) throw oops(`Il file «${shown}» è troppo grande: ${Math.round(Number(node.size) / (1 << 20))} MB (al massimo ${Math.round(limit / (1 << 20))} MB)`);
    try {
      const service = fs();
      const size = Number(node.size);
      if ((!Number.isFinite(size) || size <= 0) && typeof service.readStream === 'function') {
        const chunks = [];
        let total = 0;
        for await (const chunk of await service.readStream(user, node.id, { start: 0 })) {
          total += chunk.length;
          if (total > limit) throw oops(`Il file «${shown}» è troppo grande`);
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }
      return Buffer.from(await service.read(user, node.id));
    } catch (err) { throw told(err, shown); }
  }

  return {
    async open(user, tools, path, { readOnly = false } = {}) {
      const at = await where(user, path);
      let node = await lookup(user, at.full, at.shown);
      if (node && node.type !== 'file') throw oops(`«${at.shown}» non è un file`);
      if (node && isProtected(node)) throw oops(`Il contenuto di «${at.shown}» è protetto da un'app: i programmi non lo usano`);
      if (!node && readOnly) throw oops(`Il file «${at.shown}» non esiste`);
      const programId = tools.program?.id;
      if (node && !readOnly && locks.has(node.id) && locks.get(node.id) !== programId) {
        throw oops(`Il file «${at.shown}» è già aperto da un altro programma: chiudilo lì, oppure aprilo in sola lettura`);
      }
      // the lock is taken now, before anything else waits: two programs opening it together cannot both pass
      if (node && !readOnly) locks.set(node.id, programId);
      let bytes;
      try { bytes = node ? await read(user, node, at.shown) : null; } catch (err) {
        if (node && !readOnly && locks.get(node.id) === programId) locks.delete(node.id);
        throw err;
      }
      if (!node) {
        // a new database: the file is made at the first save, in a folder that must be there
        const dirFull = at.full.slice(0, at.full.lastIndexOf('/'));
        const dirShown = at.rest.length > 1 ? `~/${at.rest.slice(0, -1).join('/')}` : '~';
        const parent = await lookup(user, dirFull, dirShown);
        if (!parent) throw oops(`La cartella «${dirShown}» non esiste`);
        if (parent.type !== 'folder') throw oops(`«${dirShown}» non è una cartella`);
        const now = Date.now();
        node = { id: `${at.home.id}/${newId()}`, parent: parent.id, name: at.rest.at(-1), type: 'file', meta: {}, created: now, modified: now };
        try { await fs().apply(user, { put: [node] }); } catch (err) { throw told(err, at.shown); }
      }
      if (!readOnly) locks.set(node.id, programId);
      const id = node.id;
      let closed = false;
      return {
        shown: at.shown,
        bytes,
        readOnly,
        async save(data) {
          if (readOnly) return;
          if (data.length > maxBytes()) throw oops(`Il database «${at.shown}» è diventato troppo grande per salvarlo (al massimo ${Math.round(maxBytes() / (1 << 20))} MB)`);
          try { await fs().write(user, id, Buffer.from(data)); } catch (err) { throw told(err, at.shown); }
        },
        async close() {
          if (closed) return;
          closed = true;
          if (!readOnly && locks.get(id) === programId) locks.delete(id);
        },
      };
    },
  };
}
