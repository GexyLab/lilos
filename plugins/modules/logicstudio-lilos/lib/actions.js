import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

/**
 * The actions of the lilOS blocks, made in the kernel's main thread for the program's owner
 * (the engine's broker): fn(user, args, tools), user = { kind: 'user', id, username, name, role }.
 *
 * Files: always AS THE USER through the fs service (never the kernel's principal), so the fs module
 * decides what they may see and change, and the kernel's guards count their space and file size.
 * Only the user's home: '~/…' or '/home/<user>/…'; never its .config (lilOS's own settings) and
 * never a file whose content an app protects (FileCrypt).
 *
 * services: { fs: () => service, notifications: () => service }, asked for at use time: the kernel
 * wraps fs with its quota guards after every module started.
 */
export const LIMITS = Object.freeze({
  read: 5 << 20,          // a file read whole, at most
  write: 5 << 20,         // what a block writes or adds at once, at most
  append: 64 << 20,       // a file grown by «Aggiungi a file», at most (it is written again whole)
  list: 2000,             // the items of a folder given to the program
  parts: 32,              // the parts of a path
  eventData: 64 << 10,    // the data of an «Evento a lilOS» (JSON)
  eventsPerSecond: 20,    // per program
});

const LEVELS = new Set(['info', 'success', 'warning', 'error']);
const EVENT_NAME = /^[\w.-]{1,64}$/;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const newId = () => randomBytes(9).toString('base64url');
const isProtected = node => Object.values(node?.meta?.apps ?? {}).some(v => v?.content === true);
const kb = n => `${Math.round(n / 1024)} KB`;
const mb = n => `${Math.round(n / (1 << 20))} MB`;

/** An error for the program: Italian, safe to show. */
const oops = message => new Error(message);

/** What the kernel's services throw (KernelError, with a code), said for the program. */
function told(err, shown) {
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

/** The text of a value, as the blocks write it. */
const textOf = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export function makeActions(services) {
  const need = (service, missing) => { if (!service) throw oops(missing); return service; };
  const fs = () => need(services.fs(), 'Il file system di lilOS non c\'è');
  const notifications = () => need(services.notifications(), 'Il servizio delle notifiche non c\'è');
  const events = new Map();   // program id → [times] of its events in the last second

  /**
   * A path of the user, checked: { full, shown, home, rest }. '~' and '~/a/b' are the home; an
   * absolute one must be inside it ('/home/<user>/…').
   */
  async function where(user, raw) {
    const path = typeof raw === 'string' ? raw.trim() : '';
    if (!path) throw oops('Manca il percorso del file');
    if (path.length > 4096 || path.includes('\0') || path.includes('\\')) throw oops(`Percorso non valido: ${path.slice(0, 80)}`);
    if (!path.startsWith('~') && !path.startsWith('/')) throw oops(`Percorso non valido: ${path.slice(0, 80)} (scrivi ~/… oppure /home/…)`);
    if (path.startsWith('~') && path !== '~' && !path.startsWith('~/')) throw oops(`Percorso non valido: ${path.slice(0, 80)}`);
    const parts = path.split('/').filter(Boolean);
    if (parts.some(p => p === '.' || p === '..')) throw oops(`Percorso non valido: «.» e «..» non sono ammessi (${path.slice(0, 80)})`);
    if (parts.some(p => p.length > 255)) throw oops('Un nome del percorso è troppo lungo (al massimo 255 caratteri)');
    if (parts.length > LIMITS.parts) throw oops(`Percorso troppo profondo (al massimo ${LIMITS.parts} livelli)`);
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

  /** The node of a file that must be there. */
  async function fileNode(user, at) {
    const node = await lookup(user, at);
    if (!node) throw oops(`Il file «${at.shown}» non esiste`);
    if (node.type !== 'file') throw oops(`«${at.shown}» non è un file`);
    if (isProtected(node)) throw oops(`Il contenuto di «${at.shown}» è protetto da un'app: i programmi non lo usano`);
    return node;
  }

  /** The node of a file to write: made empty when missing (its folder must be there). */
  async function fileToWrite(user, at) {
    if (!at.rest.length) throw oops('Serve il nome di un file, non la home');
    const found = await lookup(user, at);
    if (found) {
      if (found.type !== 'file') throw oops(`«${at.shown}» non è un file`);
      if (isProtected(found)) throw oops(`Il contenuto di «${at.shown}» è protetto da un'app: i programmi non lo cambiano`);
      return { node: found, created: false };
    }
    const dirShown = at.rest.length > 1 ? `~/${at.rest.slice(0, -1).join('/')}` : '~';
    const parent = await lookup(user, { full: at.full.slice(0, at.full.lastIndexOf('/')), shown: dirShown });
    if (!parent) throw oops(`La cartella «${dirShown}» non esiste`);
    if (parent.type !== 'folder') throw oops(`«${dirShown}» non è una cartella`);
    const now = Date.now();
    const node = { id: `${at.home.id}/${newId()}`, parent: parent.id, name: at.rest.at(-1), type: 'file', meta: {}, created: now, modified: now };
    try { await fs().apply(user, { put: [node] }); } catch (err) { throw told(err, at.shown); }
    return { node: { ...node, size: 0 }, created: true };
  }

  async function readWhole(user, node, at) {
    try { return Buffer.from(await fs().read(user, node.id)); } catch (err) { throw told(err, at.shown); }
  }

  /** The bytes a block writes: text as it is, json as JSON (pretty), a line of JSON in «lines». */
  function bytesOf(value, mode, { newline = false } = {}) {
    let text;
    if (mode === 'json') text = JSON.stringify(value === undefined ? null : value, null, 2);
    else if (mode === 'lines') text = `${JSON.stringify(value === undefined ? null : value)}\n`;
    else text = textOf(value) + (newline ? '\n' : '');
    const bytes = Buffer.from(text, 'utf8');
    if (bytes.length > LIMITS.write) throw oops(`Troppi dati da scrivere in una volta: ${kb(bytes.length)} (al massimo ${mb(LIMITS.write)})`);
    return bytes;
  }

  return {
    async 'lilos.notify'(user, args, tools) {
      const a = plain(args) ? args : {};
      const level = LEVELS.has(a.level) ? a.level : 'info';
      const title = textOf(a.title).replace(/\s+/g, ' ').trim();
      const body = textOf(a.text).replace(/\s+/g, ' ').trim();
      if (!title && !body) throw oops('La notifica non ha testo');
      const text = title && body ? `${title} — ${body}` : title || body;
      try {
        await notifications().send(user.id, { from: { app: 'logicstudio', name: String(tools.program?.name || 'Logic Studio').slice(0, 80) }, level, text, action: null });
      } catch (err) {
        if (err?.code === 'rate_limited') {
          throw oops(`Troppe notifiche in poco tempo: ${err.retryAfter ? `riprova tra ${err.retryAfter} secondi` : 'riprova tra un minuto'}`);
        }
        if (err?.code === 'invalid') throw oops(`Notifica non valida: ${err.message}`);
        throw err;
      }
      return { sent: true };
    },

    async 'lilos.fileRead'(user, args) {
      const at = await where(user, args?.path);
      const node = await fileNode(user, at);
      if (Number(node.size) > LIMITS.read) throw oops(`Il file «${at.shown}» è troppo grande: ${mb(Number(node.size))} (si leggono al massimo ${mb(LIMITS.read)})`);
      const bytes = await readWhole(user, node, at);
      if (bytes.length > LIMITS.read) throw oops(`Il file «${at.shown}» è troppo grande (si leggono al massimo ${mb(LIMITS.read)})`);
      const text = bytes.toString('utf8');
      if (args?.mode !== 'json') return { content: text, size: bytes.length };
      if (!text.trim()) return { content: null, size: bytes.length };
      try {
        return { content: JSON.parse(text), size: bytes.length };
      } catch (err) {
        throw oops(`Il file «${at.shown}» non è JSON valido: ${err.message}`);
      }
    },

    async 'lilos.fileWrite'(user, args) {
      const at = await where(user, args?.path);
      const bytes = bytesOf(args?.content, args?.mode === 'json' ? 'json' : 'text');
      const { node } = await fileToWrite(user, at);
      try { await fs().write(user, node.id, bytes); } catch (err) { throw told(err, at.shown); }
      return { size: bytes.length };
    },

    async 'lilos.fileAppend'(user, args) {
      const at = await where(user, args?.path);
      const added = bytesOf(args?.content, args?.mode === 'json' ? 'lines' : 'text', { newline: args?.newline !== false });
      const { node, created } = await fileToWrite(user, at);
      const before = created ? 0 : Number(node.size) || 0;
      const size = before + added.length;
      if (size > LIMITS.append) throw oops(`Il file «${at.shown}» diventerebbe troppo grande (si aggiunge fino a ${mb(LIMITS.append)})`);
      const service = fs();
      try {
        if (before <= LIMITS.read || typeof service.readStream !== 'function' || typeof service.writeFrom !== 'function') {
          if (before > LIMITS.read) throw oops(`Il file «${at.shown}» è troppo grande per aggiungere (al massimo ${mb(LIMITS.read)})`);
          const old = before ? await service.read(user, node.id) : Buffer.alloc(0);
          await service.write(user, node.id, Buffer.concat([Buffer.from(old), added]));
        } else {
          // Big: streamed (what is there, then what is added), never whole in memory
          const from = await service.readStream(user, node.id, { start: 0 });
          const source = Readable.from((async function* () { for await (const chunk of from) yield chunk; yield added; })());
          await service.writeFrom(user, node.id, source, { size });
        }
      } catch (err) {
        throw told(err, at.shown);
      }
      return { size };
    },

    async 'lilos.folderList'(user, args) {
      const at = await where(user, args?.path || '~');
      const folder = at.rest.length ? await lookup(user, at) : { id: at.home.id, type: 'folder' };
      if (!folder) throw oops(`La cartella «${at.shown}» non esiste`);
      if (folder.type !== 'folder') throw oops(`«${at.shown}» non è una cartella`);
      let nodes;
      try { nodes = await fs().list(user, folder.id); } catch (err) { throw told(err, at.shown); }
      const show = ['files', 'folders'].includes(args?.show) ? args.show : 'all';
      const items = nodes
        .filter(n => args?.hidden === true || !String(n.name).startsWith('.'))
        .filter(n => !(at.rest.length === 0 && String(n.name).toLowerCase() === '.config'))
        .filter(n => show === 'all' || (show === 'files' ? n.type !== 'folder' : n.type === 'folder'))
        .map(n => ({ name: n.name, type: n.type, size: Number(n.size) || 0, modified: n.modified ?? null, path: `${at.shown}/${n.name}` }))
        .sort((x, y) => (x.type === 'folder' ? 0 : 1) - (y.type === 'folder' ? 0 : 1) || String(x.name).localeCompare(String(y.name)));
      return { items: items.slice(0, LIMITS.list), count: items.length };
    },

    async 'lilos.exists'(user, args) {
      const at = await where(user, args?.path);
      const node = at.rest.length ? await lookup(user, at) : { type: 'folder', size: 0 };
      if (!node) return { exists: false, type: '', size: 0 };
      return { exists: true, type: node.type, size: Number(node.size) || 0 };
    },

    async 'lilos.event'(user, args, tools) {
      const name = typeof args?.name === 'string' ? args.name.trim() : '';
      if (!EVENT_NAME.test(name)) throw oops('Nome dell\'evento non valido (lettere, numeri, «.», «-» e «_», al massimo 64)');
      const data = args?.data === undefined ? null : args.data;
      if ((JSON.stringify(data) ?? '').length > LIMITS.eventData) throw oops(`Dati dell'evento troppo grandi (al massimo ${kb(LIMITS.eventData)})`);
      const id = tools.program?.id ?? '';
      const now = Date.now();
      const times = (events.get(id) ?? []).filter(t => now - t < 1000);
      if (times.length >= LIMITS.eventsPerSecond) throw oops(`Troppi eventi: al massimo ${LIMITS.eventsPerSecond} al secondo`);
      times.push(now);
      events.set(id, times);
      if (events.size > 1000) events.clear();
      tools.emit('logicstudio.event', { program: { id, name: tools.program?.name ?? '' }, name, data });
      return { sent: true };
    },
  };
}
