import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { fail } from '../errors.js';
import { openHome, toFrontNode } from '../api/home.js';
import { joinPath, isSafeName } from '../net/drivers.js';
import { localText } from '../../../../sdk/core/scheduleRules.js';

/**
 * «Copia una cartella»: a folder of the home or of a network connection copied into another, by
 * the kernel, also with lilOS closed. It goes into a folder with its name inside the destination:
 *   versions   a new folder each time, «Documenti 2026-11-03 02.00», keeping the last `keep`
 *   update     «Documenti»: only the files that are new or changed (another size, or newer)
 *   mirror     as update, and what is no longer in the source goes from the destination (into
 *              lilOS's trash, or for good on a connection)
 * `exclude`: names (with * and ?) left out, files and folders. Links, app shortcuts and the items of
 * a connection with no bytes of their own (a Google document) are left out. Files of lilOS keep
 * the data of their apps (an encrypted file stays one). A file that fails is told in the log and
 * the copy goes on; the run then ends in error.
 * The user's open pages see the new nodes of the home ('fs.external').
 */
const MAX_ITEMS = 100_000;
const MAX_LOG_LINES = 300;
const SAME_TIME = 2000;

const lower = s => s.toLowerCase();
const newId = () => randomBytes(9).toString('base64url');
const kb = n => (n < 1 << 20 ? `${(n / 1024).toFixed(0)} KB` : n < 1 << 30 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${(n / (1 << 30)).toFixed(2)} GB`);

/** '*.tmp', '~$*' → a test on a name (case-insensitive). */
export function excluder(globs) {
  const res = globs.map(g => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i'));
  return name => res.some(re => re.test(name));
}

/** A folder of the home, as the copy uses it. Dirs are ids of the fs service. */
async function homePlace(kernel, principal, ref) {
  const view = await openHome(kernel, principal);
  const root = view.toBack(ref.home, { parent: true });
  const node = await view.fs.stat(principal, root) ?? fail('not_found', `${ref.label || 'La cartella'} non c’è più`);
  if (node.type !== 'folder') fail('invalid', `${ref.label || 'La cartella'} non è una cartella`);
  const emit = data => kernel.events.emit('user', { owner: principal.id, event: 'fs.external', data });
  const hidden = new Set([view.trashId, view.configId]);
  const put = async n => {
    await view.fs.apply(principal, { put: [n] });
    const front = toFrontNode(view, n);
    if (front) emit({ put: [front] });
  };
  return {
    root,
    name: root === view.homeId ? (principal.name || principal.username || 'Home') : node.name,
    async list(dir) {
      const out = new Map();
      for (const n of await view.fs.list(principal, dir)) {
        if (hidden.has(n.id) || (n.type !== 'file' && n.type !== 'folder')) continue;
        out.set(lower(n.name), { name: n.name, type: n.type, size: n.size ?? 0, modified: n.modified ?? 0, ref: n.id, node: n });
      }
      return out;
    },
    async mkdir(dir, name) {
      const now = Date.now();
      const n = { id: `${view.homeId}/${newId()}`, parent: dir, name, type: 'folder', meta: {}, created: now, modified: now };
      await put(n);
      return n.id;
    },
    read(entry) {
      if (view.fs.readStream) return view.fs.readStream(principal, entry.ref, { start: 0 });
      return view.fs.read(principal, entry.ref).then(data => Readable.from([data]));
    },
    async write(dir, name, existing, source, { signal, meta }) {
      let id = existing?.ref;
      if (!id) {
        const now = Date.now();
        id = `${view.homeId}/${newId()}`;
        await view.fs.apply(principal, { put: [{ id, parent: dir, name, type: 'file', meta: meta ?? {}, created: now, modified: now }] });
      } else if (meta && JSON.stringify(meta) !== JSON.stringify(existing.node.meta ?? {})) {
        await view.fs.apply(principal, { put: [{ ...existing.node, meta, modified: Date.now() }] });
      }
      if (view.fs.writeFrom) await view.fs.writeFrom(principal, id, source, { signal });
      else {
        const chunks = [];
        for await (const c of source) chunks.push(c);
        await view.fs.write(principal, id, Buffer.concat(chunks));
      }
      const saved = await view.fs.stat(principal, id);
      const front = saved && toFrontNode(view, saved);
      if (front) emit({ put: [front] });
    },
    /** Into lilOS's trash, as lilOS puts things there (it can be restored). */
    async remove(entry) {
      const at = Date.now();
      const from = view.toFront(entry.node.parent);
      await view.fs.apply(principal, { put: [{ ...entry.node, parent: view.trashId, meta: { ...entry.node.meta, trashed: { at, from } } }] });
      const id = view.toFront(entry.ref);
      if (id) emit({ trash: [{ id, at, from }] });
    },
    metaOf: entry => {
      const apps = entry.node?.meta?.apps;
      return apps ? { apps } : null;
    },
  };
}

/** A folder of a network connection. Dirs are paths of the connection. */
async function netPlace(kernel, principal, ref) {
  const net = kernel.network;
  const name = await net.nameOf(principal, ref.mount);
  const root = ref.path || '/';
  const stat = root === '/' ? { type: 'folder' } : await net.stat(principal, ref.mount, root);
  if (!stat) fail('not_found', `${ref.label || root} non c’è più su «${name}»`);
  if (stat.type !== 'folder') fail('invalid', `${ref.label || root} non è una cartella`);
  return {
    root,
    name: root === '/' ? name : root.split('/').filter(Boolean).pop(),
    async list(dir) {
      const out = new Map();
      for (const e of await net.listFolder(principal, ref.mount, dir)) {
        if (e.link || e.web || (e.type !== 'file' && e.type !== 'folder') || !isSafeName(e.name)) continue;
        out.set(lower(e.name), { name: e.name, type: e.type, size: e.size ?? 0, modified: e.modified ?? 0, ref: joinPath(dir, e.name) });
      }
      return out;
    },
    async mkdir(dir, n) {
      const path = joinPath(dir, n);
      await net.mkdir(principal, ref.mount, path);
      return path;
    },
    read: (entry, signal) => net.read(principal, ref.mount, entry.ref, { start: 0, signal }),
    write: (dir, n, existing, source, { signal, size }) => net.write(principal, ref.mount, joinPath(dir, n), source, { start: 0, signal, size }),
    remove: entry => net.removePath(principal, ref.mount, entry.ref),
    metaOf: () => null,
  };
}

const openPlace = (kernel, principal, ref) => (ref.mount ? netPlace(kernel, principal, ref) : homePlace(kernel, principal, ref));

export async function runCopy({ kernel, task, run, principal, signal }) {
  const w = task.what;
  const src = await openPlace(kernel, principal, w.from);
  const dst = await openPlace(kernel, principal, w.to);
  const skip = excluder(w.exclude ?? []);
  const lines = [];
  const errors = [];
  const counts = { copied: 0, bytes: 0, same: 0, removed: 0, folders: 0, seen: 0 };
  const line = text => { if (lines.length < MAX_LOG_LINES) lines.push(text); };
  const stop = () => { if (signal.aborted) throw signal.reason ?? new Error('cancelled'); };
  const home = !w.from.mount && !w.to.mount;

  // Where the copy goes
  const top = await dst.list(dst.root);
  let target;
  if (w.mode === 'versions') {
    const stamp = localText(run.due ?? Date.now(), task.when.tz).replace('T', ' ').replace(':', '.');
    let name = `${src.name} ${stamp}`;
    for (let i = 2; top.has(lower(name)); i++) name = `${src.name} ${stamp} (${i})`;
    target = await dst.mkdir(dst.root, name);
    line(`Nuova versione: ${name}`);
  } else {
    const there = top.get(lower(src.name));
    if (there && there.type !== 'folder') fail('conflict', `Dove copiare c’è già un file «${src.name}»`);
    target = there?.ref ?? await dst.mkdir(dst.root, src.name);
  }

  const copyFile = async (entry, dir, existing, path) => {
    const source = await src.read(entry, signal);
    source.on?.('error', () => {});
    const meta = home ? src.metaOf(entry) : null;
    await dst.write(dir, entry.name, existing, source, { signal, size: entry.size, meta });
    counts.copied++;
    counts.bytes += entry.size;
    line(`copiato ${path}`);
  };

  const walk = async (from, to, path) => {
    stop();
    const [s, d] = await Promise.all([src.list(from), w.mode === 'versions' && path === '' ? new Map() : dst.list(to)]);
    for (const entry of s.values()) {
      stop();
      if (skip(entry.name)) continue;
      if (++counts.seen > MAX_ITEMS) fail('too_large', `Più di ${MAX_ITEMS} elementi: copia una cartella più piccola`);
      const here = path ? `${path}/${entry.name}` : entry.name;
      const existing = d.get(lower(entry.name)) ?? null;
      try {
        if (entry.type === 'folder') {
          if (existing && existing.type !== 'folder') {
            if (w.mode === 'versions') throw new Error('c’è un file con lo stesso nome');
            await dst.remove(existing);
            line(`rimosso il file ${here} (ora è una cartella)`);
          }
          const sub = existing?.type === 'folder' ? existing.ref : await dst.mkdir(to, entry.name);
          if (!existing || existing.type !== 'folder') counts.folders++;
          await walk(entry.ref, sub, here);
        } else {
          if (existing?.type === 'folder') throw new Error('c’è una cartella con lo stesso nome');
          const same = existing && existing.size === entry.size && existing.modified >= entry.modified - SAME_TIME;
          if (same && w.mode !== 'versions') { counts.same++; continue; }
          await copyFile(entry, to, existing, here);
        }
      } catch (err) {
        if (signal.aborted) throw err;
        errors.push(`${here}: ${err.message}`);
        line(`ERRORE ${here}: ${err.message}`);
      }
    }
    if (w.mode !== 'mirror') return;
    for (const [key, entry] of d) {
      if (s.has(key) || skip(entry.name)) continue;
      stop();
      const here = path ? `${path}/${entry.name}` : entry.name;
      try {
        await dst.remove(entry);
        counts.removed++;
        line(`eliminato ${here}`);
      } catch (err) {
        errors.push(`${here}: ${err.message}`);
      }
    }
  };
  await walk(src.root, target, '');

  // Old versions beyond `keep`
  if (w.mode === 'versions') {
    const prefix = `${src.name} `;
    const versions = [...(await dst.list(dst.root)).values()]
      .filter(e => e.type === 'folder' && e.name.startsWith(prefix) && /^\d{4}-\d{2}-\d{2} \d{2}\.\d{2}( \(\d+\))?$/.test(e.name.slice(prefix.length)))
      .sort((a, b) => (a.name < b.name ? 1 : -1));
    for (const old of versions.slice(w.keep)) {
      try {
        await dst.remove(old);
        line(`versione vecchia eliminata: ${old.name}`);
      } catch (err) {
        errors.push(`${old.name}: ${err.message}`);
      }
    }
  }

  const parts = [`${counts.copied} file copiati (${kb(counts.bytes)})`];
  if (counts.same) parts.push(`${counts.same} invariati`);
  if (counts.removed) parts.push(`${counts.removed} eliminati`);
  const summary = parts.join(', ');
  const log = [summary, ...lines, ...(lines.length >= MAX_LOG_LINES ? ['…'] : [])].join('\n');
  if (errors.length) return { state: 'error', text: `${errors.length} non copiati: ${errors[0]}`.slice(0, 300), log };
  return { state: 'ok', text: summary, log };
}
