import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { fail, KernelError } from '../errors.js';
import { logger } from '../log.js';
import { openHome, toFrontNode } from '../api/home.js';
import { cleanPath, joinPath, cleanName, isSafeName } from './drivers.js';

const log = logger('trasferimenti');
const MAX_ITEMS = 100_000;          // files and folders of one user, all queues together
const MAX_SOURCES = 1000;           // in one request
const RETRIES = [2000, 5000, 10000];
const EMIT_EVERY = 400;
const SAVE_EVERY = 2000;
const ROWS = 200;                   // items a list sends at most
const TERMINAL = new Set(['done', 'error', 'canceled', 'skipped']);
const POLICIES = new Set(['replace', 'keep', 'skip']);

/**
 * Copies of files and folders to and from the network connections (net/network.js), done by the
 * kernel: they go on with lilOS closed and after a restart. Each user has one queue per
 * destination (a connection, or the home): a queue copies one file at a time, queues go on
 * together; what is sent to a destination that has a queue goes at the end of it. Nothing is
 * moved: the sources stay where they are.
 *
 *   ref (a place)  { home: '<id of a node of lilOS>' } ('root' is the home) | { mount: '<connection>', path }
 *   item           { id, parent, kind: 'file' | 'folder', name, src, dst?, size, done, state, error, from, to, … }
 *     state        'scanning' (a folder being read) | 'queued' | 'running' | 'conflict' (a file with that name
 *                  is there: the user chooses) | 'done' | 'error' | 'canceled' | 'skipped'
 *     dst          the folder it goes into (top items; the others go into their folder's)
 *
 * A file that exists where it goes stops its queue until the user says what to do (resolve):
 * 'replace', 'keep' (both: the new one gets a number), 'skip'; `all` keeps the choice for the
 * rest of the queue. Folders that exist are merged. When the connection drops a file is tried
 * again (three times, waiting longer each time), from where it stopped when the protocol can.
 * When a queue has nothing left to do the user gets a notification; what failed stays in it
 * (retry, dismiss) until they deal with it.
 *
 * Saved in DATA_DIR/net/transfers-<user>.json. Events for the user's pages: 'net.transfers'
 * (snapshot(), a few times a second while something runs), 'fs.external' { put: [node], remove:
 * [id] } (nodes of lilOS the kernel made or removed in the home), 'net.notify' { text, level }
 * (the end of a queue, when there is no notifications service).
 */
export class Transfers {
  #kernel;
  #net;
  #users = new Map();      // user id → state
  #ticker = null;

  constructor(kernel, network) {
    this.#kernel = kernel;
    this.#net = network;
  }

  // ---------- Saved queues ----------

  #file(userId) {
    return join(this.#net.dir, `transfers-${createHash('sha256').update(String(userId)).digest('hex').slice(0, 32)}.json`);
  }

  #state(principal) {
    let u = this.#users.get(principal.id);
    if (!u) {
      u = { principal: pick(principal), queues: [], index: new Map(), run: null, emitTimer: null, saveTimer: null, lastEmit: 0, saving: Promise.resolve() };
      this.#users.set(principal.id, u);
    }
    return u;
  }

  /** Picks up the queues saved before the kernel stopped. */
  async start() {
    let names = [];
    try { names = await readdir(this.#net.dir); } catch { return; }
    for (const name of names.filter(n => /^transfers-[a-f0-9]{32}\.json$/.test(n))) {
      try {
        const saved = JSON.parse(await readFile(join(this.#net.dir, name), 'utf8'));
        let principal = saved?.user;
        if (principal?.kind !== 'user' || typeof principal.id !== 'string') continue;
        if (this.#kernel.multiUser) {
          const user = await this.#kernel.services.get('users')?.get(principal.id).catch(() => null);
          if (!user) { await rm(join(this.#net.dir, name), { force: true }); continue; }
          principal = { kind: 'user', id: user.id, username: user.username, name: user.name, role: user.role };
        }
        const u = this.#state(principal);
        for (const q of Array.isArray(saved.queues) ? saved.queues : []) {
          const queue = restoreQueue(q);
          if (!queue) continue;
          u.queues.push(queue);
          walk(queue.items, it => u.index.set(it.id, { item: it, queue }));
        }
        const view = await openHome(this.#kernel, principal);
        for (const q of u.queues) {
          const left = [];
          walk(q.items, it => {
            if (it.state === 'running') it.state = it.kind === 'folder' ? 'running' : 'queued';
            if (it.created) { left.push(it.created); delete it.created; it.done = 0; }
          });
          // A file of the home stopped midway: it starts again from nothing
          if (left.length) {
            await view.fs.remove(principal, left.map(id => view.toBack(id))).catch(() => {});
            this.#emit(u, 'fs.external', { remove: left });
          }
          walk(q.items, it => { if (it.state === 'scanning') { it.children = []; this.#scan(u, q, it); } });
          this.#wake(u, q);
        }
        if (u.queues.length) log.info(`Trasferimenti ripresi per ${principal.username ?? principal.id}`);
      } catch (err) {
        log.error(`Trasferimenti non ripresi (${name})`, err);
      }
    }
  }

  #saveSoon(u) {
    if (u.saveTimer) return;
    u.saveTimer = setTimeout(() => { u.saveTimer = null; this.#save(u).catch(err => log.error('Trasferimenti non salvati', err)); }, SAVE_EVERY);
  }

  async #save(u) {
    const run = u.saving.then(async () => {
      const file = this.#file(u.principal.id);
      if (!u.queues.length) return rm(file, { force: true });
      await mkdir(this.#net.dir, { recursive: true });
      const data = { user: u.principal, queues: u.queues.map(saveQueue) };
      await writeFile(`${file}.tmp`, JSON.stringify(data), { mode: 0o600 });
      await rename(`${file}.tmp`, file);
    });
    u.saving = run.catch(() => {});
    return run;
  }

  async stop() {
    clearInterval(this.#ticker);
    for (const u of this.#users.values()) {
      clearTimeout(u.saveTimer);
      u.saveTimer = null;
      for (const q of u.queues) q.controller?.abort(new StopError());
    }
    for (const u of this.#users.values()) await this.#save(u).catch(() => {});
  }

  // ---------- Requests of the page ----------

  /**
   * Adds sources to the queue of the target's destination (made if there is none): { sources: [ref],
   * target: ref (a folder), workspace? }. Returns { queue } (its id).
   */
  async enqueue(principal, { sources, target, workspace = null } = {}) {
    if (!Array.isArray(sources) || !sources.length || sources.length > MAX_SOURCES) fail('invalid', 'Elementi da trasferire non validi');
    const u = this.#state(principal);
    const to = await this.#place(principal, target);
    if (to.type !== 'folder') fail('invalid', 'La destinazione non è una cartella');
    const items = [];
    for (const raw of sources) {
      const from = await this.#place(principal, raw);
      if (from.type !== 'file' && from.type !== 'folder') continue;   // app shortcuts stay where they are
      if (from.ref.home && to.ref.home) fail('invalid', 'Copia tra cartelle di lilOS: non è un trasferimento di rete');
      if (from.ref.mount && from.ref.mount === to.ref.mount && from.type === 'folder' && (to.ref.path === from.ref.path || to.ref.path.startsWith(`${from.ref.path}/`))) {
        fail('invalid', 'Una cartella non si copia dentro se stessa');
      }
      items.push({
        id: newId(), parent: null, kind: from.type, name: from.name, src: from.ref, dst: to.ref,
        size: from.type === 'file' ? from.size : 0, done: 0, state: from.type === 'folder' ? 'scanning' : 'queued', error: null,
        from: from.label, to: to.label, modified: from.modified ?? 0,
        ...(from.type === 'folder' && { children: [] }),
      });
    }
    if (!items.length) fail('invalid', 'Niente da trasferire');
    if (u.index.size + items.length > MAX_ITEMS) fail('invalid', 'Troppi trasferimenti in coda');
    const key = to.ref.mount ?? 'home';
    let q = u.queues.find(x => x.key === key);
    if (!q) {
      q = {
        id: newId(), key, label: to.ref.mount ? await this.#net.nameOf(principal, to.ref.mount) : to.label,
        workspace: typeof workspace === 'string' && /^[\w-]{1,40}$/.test(workspace) ? workspace : null,
        paused: false, policy: null, items: [], created: Date.now(), bytes: 0, sent: 0, received: 0, rate: 0,
      };
      u.queues.push(q);
    }
    // The home's queue is named after the folder its files go to; files for several folders: Home
    if (key === 'home' && q.label !== to.label && q.items.length) q.label = 'Home';
    if (!u.run) u.run = { id: newId(), since: Date.now() };
    for (const it of items) {
      q.items.push(it);
      u.index.set(it.id, { item: it, queue: q });
      if (it.kind === 'folder') this.#scan(u, q, it);
    }
    q.fresh = new Set(items.map(it => it.id));   // added just now: the window marks them for a moment
    this.#changed(u, true);
    this.#wake(u, q);
    return { queue: q.id };
  }

  /** What the transfer window shows (see the class). */
  snapshot(principal) {
    const u = this.#users.get(principal.id);
    return u ? this.#snapshot(u) : { active: false, run: null, since: null, sent: meter(), received: meter(), queues: [] };
  }

  /** The items inside a folder of a queue (the window opens it). */
  children(principal, itemId) {
    const found = this.#users.get(principal.id)?.index.get(itemId);
    if (!found || found.item.kind !== 'folder') fail('not_found', 'Elemento inesistente');
    const list = found.item.children ?? [];
    return { items: list.slice(0, ROWS).map(row), more: Math.max(0, list.length - ROWS) };
  }

  /** Stops items (and what is inside folders), whole queues, or everything (all). */
  cancel(principal, { ids = [], queue = null, all = false } = {}) {
    const u = this.#users.get(principal.id);
    if (!u) return;
    const queues = all ? u.queues : u.queues.filter(q => q.id === queue);
    const items = queues.flatMap(q => q.items);
    for (const id of Array.isArray(ids) ? ids : []) { const f = u.index.get(id); if (f) items.push(f.item); }
    for (const it of items) walk([it], x => { if (!TERMINAL.has(x.state)) { x.state = 'canceled'; x.error = null; } });
    for (const q of u.queues) {
      const current = q.current && u.index.get(q.current)?.item;
      if (current?.state === 'canceled') q.controller?.abort(new CancelError());
      this.#wake(u, q);
    }
    this.#changed(u, true);
  }

  /** What to do with a file that exists where it goes: action 'replace' | 'keep' | 'skip'; all: the same for the rest of its queue. */
  resolve(principal, { id, action, all = false } = {}) {
    const found = this.#users.get(principal.id)?.index.get(id);
    if (!found || found.item.state !== 'conflict') fail('not_found', 'Nessun conflitto da risolvere');
    if (!POLICIES.has(action)) fail('invalid', 'Scelta non valida');
    const u = this.#users.get(principal.id);
    found.item.resolution = action;
    found.item.state = 'queued';
    delete found.item.conflict;
    if (all === true) found.queue.policy = action;
    this.#changed(u, true);
    this.#wake(u, found.queue);
  }

  /** Tries again what failed: these items (folders: what failed inside), or a queue's. */
  retry(principal, { ids = [], queue = null } = {}) {
    const u = this.#users.get(principal.id);
    if (!u) return;
    const roots = [...u.queues.filter(q => q.id === queue).flatMap(q => q.items)];
    for (const id of Array.isArray(ids) ? ids : []) { const f = u.index.get(id); if (f) roots.push(f.item); }
    const touched = new Set();
    for (const it of roots) {
      walk([it], x => {
        if (x.state !== 'error') return;
        x.state = x.kind === 'folder' && x.children?.length ? 'running' : 'queued';
        x.error = null;
        if (x.kind === 'file') x.done = 0;
        touched.add(u.index.get(x.id)?.queue);
      });
      // Its folders must be running again for it to be reached
      for (let p = it.parent && u.index.get(it.parent)?.item; p; p = p.parent && u.index.get(p.parent)?.item) if (p.state === 'error' || p.state === 'done') p.state = 'running';
    }
    if (!u.run && touched.size) u.run = { id: newId(), since: Date.now() };
    for (const q of touched) if (q) this.#wake(u, q);
    this.#changed(u, true);
  }

  /** Takes out of the list what failed (these items, a queue's, or all). */
  dismiss(principal, { ids = [], queue = null, all = false } = {}) {
    const u = this.#users.get(principal.id);
    if (!u) return;
    const drop = new Set(Array.isArray(ids) ? ids : []);
    for (const q of u.queues) {
      if (q.runner) continue;     // still working: only finished queues are tidied
      if (all || q.id === queue) q.items = [];
      else q.items = prune(q.items, it => !drop.has(it.id));
    }
    this.#tidy(u);
    this.#changed(u, true);
  }

  /** Pauses (the file being copied stops, and starts again later) or resumes a queue. */
  pause(principal, { queue, paused } = {}) {
    const u = this.#users.get(principal.id);
    const q = u?.queues.find(x => x.id === queue) ?? fail('not_found', 'Coda inesistente');
    q.paused = paused === true;
    if (q.paused) q.controller?.abort(new PauseError());
    this.#wake(u, q);
    this.#changed(u, true);
  }

  // ---------- Places ----------

  /** A place the page names → { ref, type, name, size, modified, label }. Throws if it does not exist. */
  async #place(principal, raw) {
    if (raw && typeof raw.home === 'string') {
      const view = await openHome(this.#kernel, principal);
      const back = raw.home === 'root' ? view.homeId : view.toBack(raw.home);
      const node = await view.fs.stat(principal, back) ?? fail('not_found', 'Elemento inesistente');
      return { ref: { home: raw.home }, type: node.type, name: node.name, size: node.size, modified: node.modified, label: await this.#homeLabel(principal, view, back) };
    }
    if (raw && typeof raw.mount === 'string') {
      const path = cleanPath(raw.path ?? '/');
      const mountName = await this.#net.nameOf(principal, raw.mount);
      if (path === '/') {
        await this.#net.get(principal, raw.mount);
        return { ref: { mount: raw.mount, path }, type: 'folder', name: mountName, size: 0, label: mountName };
      }
      const entry = await this.#net.stat(principal, raw.mount, path) ?? fail('not_found', 'Non esiste sul server');
      let name = path.slice(path.lastIndexOf('/') + 1);
      if (!isSafeName(name)) fail('invalid', `Nome non trasferibile: ${JSON.stringify(name)}`);
      const ref = { mount: raw.mount, path };
      // A document with no bytes of its own (Google's): copied as its export ('Verbale' → 'Verbale.docx')
      if (entry.web) {
        if (!entry.export) fail('invalid', `«${name}» si apre solo sul web: non si copia`);
        name = `${name}.${entry.export}`;
        if (!isSafeName(name)) fail('invalid', `Nome non trasferibile: ${JSON.stringify(name)}`);
        ref.format = entry.export;
      }
      return { ref, type: entry.type === 'folder' ? 'folder' : 'file', name, size: entry.web ? 0 : Number(entry.size) || 0, modified: Number(entry.modified) || 0, label: `${mountName}${path}` };
    }
    return fail('invalid', 'Posizione non valida');
  }

  /** 'Immagini/sito' (the path in the home), 'Home' for the home. */
  async #homeLabel(principal, view, back) {
    const parts = [];
    for (let id = back, n = 0; id && id !== view.homeId && n < 64; n++) {
      const node = await view.fs.stat(principal, id);
      if (!node) break;
      parts.unshift(node.name);
      id = node.parent;
    }
    return parts.length ? parts.join('/') : 'Home';
  }

  // ---------- Reading folders ----------

  /** Reads what is inside a folder item (all levels) and makes its items. */
  #scan(u, q, item) {
    item.state = 'scanning';
    item.scanning = (async () => {
      const add = (parent, entries) => {
        for (const e of entries) {
          if (u.index.size >= MAX_ITEMS) throw new KernelError('invalid', 'Troppi file da trasferire');
          const child = {
            id: newId(), parent: parent.id, kind: e.type, name: e.name, src: e.src, size: e.type === 'file' ? e.size : 0, done: 0,
            state: 'queued', error: null, modified: e.modified ?? 0, ...(e.type === 'folder' && { children: [] }),
          };
          parent.children.push(child);
          u.index.set(child.id, { item: child, queue: q });
          if (e.type === 'folder') add(child, e.children);
        }
      };
      try {
        const tree = item.src.home ? await this.#homeTree(u.principal, item.src.home) : await this.#mountTree(u, item.src);
        add(item, tree);
        if (item.state === 'scanning') item.state = 'queued';
      } catch (err) {
        if (item.state === 'scanning') { item.state = 'error'; item.error = messageOf(err); }
      } finally {
        delete item.scanning;
        sizeUp(item);
        this.#changed(u, true);
        this.#wake(u, q);
      }
    })();
  }

  /** The tree inside a folder of the home: [{ name, type, size, src, children }] (app shortcuts left out). */
  async #homeTree(principal, frontId) {
    const view = await openHome(this.#kernel, principal);
    const back = frontId === 'root' ? view.homeId : view.toBack(frontId);
    const nodes = await view.fs.tree(principal, back);
    const byParent = new Map();
    for (const n of nodes) {
      if (n.id === back || (n.type !== 'file' && n.type !== 'folder')) continue;
      if (n.id === view.trashId || n.id === view.configId) continue;
      const list = byParent.get(n.parent) ?? [];
      list.push(n);
      byParent.set(n.parent, list);
    }
    const build = parent => (byParent.get(parent) ?? []).map(n => {
      const id = view.toFront(n.id);
      return id && { name: n.name, type: n.type, size: n.size ?? 0, modified: n.modified, src: { home: id }, children: n.type === 'folder' ? build(n.id) : [] };
    }).filter(Boolean);
    return build(back);
  }

  /** The tree inside a folder of a connection. */
  async #mountTree(u, src) {
    const principal = { ...u.principal };
    let budget = MAX_ITEMS - u.index.size;
    const walkDir = async (path, depth) => {
      if (depth > 64) throw new KernelError('invalid', 'Cartelle troppo annidate');
      const out = [];
      for (const e of await this.#net.listFolder(principal, src.mount, path)) {
        if (e.link && e.type === 'folder') continue;   // links to folders are not followed (loops, other places)
        if (e.web && (!e.export || !isSafeName(`${e.name}.${e.export}`))) continue;   // only on the web: nothing to copy
        if (--budget < 0) throw new KernelError('invalid', 'Troppi file da trasferire');
        const p = joinPath(path, e.name);
        if (e.web) {
          out.push({ name: `${e.name}.${e.export}`, type: 'file', size: 0, modified: e.modified, src: { mount: src.mount, path: p, format: e.export }, children: [] });
          continue;
        }
        out.push({ name: e.name, type: e.type, size: e.size, modified: e.modified, src: { mount: src.mount, path: p }, children: e.type === 'folder' ? await walkDir(p, depth + 1) : [] });
      }
      return out;
    };
    return walkDir(src.path, 0);
  }

  // ---------- Running a queue ----------

  /** Starts the queue's runner if it is not running (or tells it something changed). */
  #wake(u, q) {
    q.finished = false;
    if (q.runner) { q.again = true; q.poke?.(); return; }
    q.runner = this.#run(u, q).catch(err => log.error(`Coda ${q.label}`, err)).finally(() => {
      q.runner = null;
      if (q.again) { q.again = false; this.#wake(u, q); }
    });
    this.#tick();
  }

  async #run(u, q) {
    for (;;) {
      q.again = false;
      if (q.paused) { await this.#sleep(q); continue; }
      const next = this.#next(q);
      if (next?.wait) {
        if (next.wait.scanning) await next.wait.scanning.catch(() => {});
        else await this.#sleep(q);          // a conflict: until the user chooses (or cancels)
        continue;
      }
      if (!next) break;
      const it = next.item;
      try {
        if (it.kind === 'folder') await this.#makeFolder(u, q, it);
        else await this.#copyFile(u, q, it);
      } catch (err) {
        if (err instanceof StopError) return;
        log.error(`Trasferimento di ${it.name}`, err);
        it.state = 'error';
        it.error = messageOf(err);
      }
      this.#changed(u, false);
    }
    this.#finish(u, q);
  }

  /** Waits until something changes for the queue (a choice, a cancel, a resume). */
  #sleep(q) {
    if (q.again) return Promise.resolve();   // it changed since the runner last looked
    return new Promise(resolve => {
      q.poke = () => { q.poke = null; resolve(); };
    });
  }

  /** The next thing to do, depth first: { item } | { wait: item } (a folder being read, a conflict) | null. */
  #next(q) {
    const visit = list => {
      for (const it of list) {
        if (TERMINAL.has(it.state)) continue;
        if (it.state === 'scanning' || it.state === 'conflict') return { wait: it };
        if (it.kind === 'folder' && it.state === 'running') {
          const inner = visit(it.children);
          if (inner) return inner;
          it.state = it.children.some(c => c.state === 'error') ? 'error' : 'done';
          if (it.state === 'error' && !it.error) it.error = 'Alcuni file non sono stati trasferiti';
          continue;
        }
        return { item: it };
      }
      return null;
    };
    return visit(q.items);
  }

  /** The folder an item goes into: its own `dst` (items the user sent) or its folder's target. */
  #dstOf(u, it) {
    if (!it.parent) return it.dst;
    return u.index.get(it.parent)?.item.target ?? fail('invalid', 'Cartella di destinazione persa');
  }

  /** Makes (or finds) the folder where a folder item goes. */
  async #makeFolder(u, q, it) {
    const dst = this.#dstOf(u, it);
    const p = u.principal;
    if (dst.home) {
      const view = await openHome(this.#kernel, p);
      const parent = dst.home === 'root' ? view.homeId : view.toBack(dst.home);
      const siblings = await view.fs.list(p, parent);
      const same = siblings.find(n => n.name.toLowerCase() === it.name.toLowerCase());
      if (same?.type === 'folder') it.target = { home: view.toFront(same.id) };
      else {
        const name = same ? uniqueName(it.name, siblings.map(n => n.name)) : it.name;
        it.target = { home: await this.#createHomeNode(u, q, view, parent, name, 'folder') };
      }
    } else {
      const path = joinPath(dst.path, cleanName(it.name));
      const entry = await this.#net.stat(p, dst.mount, path);
      if (entry && entry.type !== 'folder') fail('conflict', `C’è già un file «${it.name}» dove va la cartella`);
      if (!entry) await this.#net.mkdir(p, dst.mount, path);
      it.target = { mount: dst.mount, path };
    }
    it.state = 'running';
  }

  /** A node of lilOS made by the kernel in the home: saved, then told to the user's pages. Returns its id. */
  async #createHomeNode(u, q, view, parentBack, name, type) {
    const id = newId();
    const now = Date.now();
    await view.fs.apply(u.principal, {
      put: [{ id: view.toBack(id), parent: parentBack, name, type, meta: q.workspace ? { workspace: q.workspace } : {}, created: now, modified: now }],
    });
    const node = await view.fs.stat(u.principal, view.toBack(id));
    const front = node && toFrontNode(view, node);
    if (front) this.#emit(u, 'fs.external', { put: [front] });
    return id;
  }

  async #copyFile(u, q, it) {
    const p = u.principal;
    const dst = this.#dstOf(u, it);
    q.current = it.id;
    it.state = 'running';
    it.error = null;
    this.#changed(u, true);
    try {
      // Where it goes, and what is there
      let name = cleanName(it.final ?? it.name), replace = null;
      let existing = await this.#existing(p, dst, name);
      if (existing && dst.mount && it.partial === name) existing = null;   // what it left itself, to resume
      else if (!existing && it.partial === name) delete it.partial;
      if (existing && !it.resolution) {
        const policy = q.policy;
        if (!policy) {
          it.state = 'conflict';
          it.conflict = { existing: { size: existing.size ?? 0, modified: existing.modified ?? 0 }, incoming: { size: it.size, modified: it.modified ?? 0 } };
          return;
        }
        it.resolution = policy;
      }
      if (existing) {
        if (it.resolution === 'skip') { it.state = 'skipped'; delete it.resolution; return; }
        if (it.resolution === 'keep') name = uniqueName(name, await this.#names(p, dst));
        else replace = existing;
      }
      it.final = name;
      if (it.state === 'canceled') return;   // while it was being looked at
      // Replacing on a server: written beside it first, then swapped, so a stop midway keeps the old one
      const writing = replace && dst.mount ? partName(name) : name;
      const left = writing === name ? replace : null;   // what #discard must never remove
      for (let attempt = 0; ; attempt++) {
        const controller = new AbortController();
        q.controller = controller;
        try {
          await this.#copyOnce(u, q, it, dst, writing, replace, controller.signal);
          if (writing !== name) {
            await this.#net.removePath(p, dst.mount, joinPath(dst.path, name));
            await this.#net.rename(p, dst.mount, joinPath(dst.path, writing), joinPath(dst.path, name));
          }
          it.state = 'done';
          // A size the server did not say (Google Photos, documents exported): what came
          if (!it.size && it.done > 0) it.size = it.done; else it.done = it.size;
          delete it.partial;
          delete it.resolution;
          return;
        } catch (err) {
          const reason = controller.signal.reason;
          if (reason instanceof CancelError) { await this.#discard(u, it, dst, writing, left); it.state = 'canceled'; return; }
          if (reason instanceof PauseError) { await this.#discard(u, it, dst, writing, left, { keepRemote: true }); it.state = 'queued'; return; }
          if (reason instanceof StopError) throw reason;
          if (err?.code === 'unavailable' && attempt < RETRIES.length) {
            it.error = `${messageOf(err)} · nuovo tentativo`;
            this.#changed(u, true);
            await delay(RETRIES[attempt]);
            if (it.state === 'canceled') { await this.#discard(u, it, dst, writing, left); return; }
            continue;
          }
          await this.#discard(u, it, dst, writing, left, { keepRemote: true });
          throw err;
        } finally {
          q.controller = null;
        }
      }
    } finally {
      q.current = null;
      if (it.state === 'skipped' || it.state === 'canceled') delete it.resolution;
    }
  }

  /** One attempt at copying a file: from where it stopped, when both sides can. */
  async #copyOnce(u, q, it, dst, name, replace, signal) {
    const p = u.principal;
    let start = 0;
    if (dst.mount && it.done > 0) {
      const session = await this.#net.session(p, dst.mount);
      const srcResume = it.src.home || (await this.#net.session(p, it.src.mount)).resume?.read;
      if (session.resume?.write && srcResume) {
        const there = await this.#net.stat(p, dst.mount, joinPath(dst.path, name));
        if (there && there.type !== 'folder' && there.size <= it.size) start = Number(there.size) || 0;
      }
    }
    it.done = start;
    const source = await this.#open(p, it.src, start, signal);
    const counter = new Transform({
      transform: (chunk, _enc, done) => {
        it.done += chunk.length;
        q.bytes += chunk.length;
        if (dst.mount) q.sent += chunk.length;
        if (it.src.mount) q.received += chunk.length;
        this.#changed(u, false);
        done(null, chunk);
      },
    });
    source.on('error', err => counter.destroy(err));
    // Until the destination reads it, nobody else listens: a cancel or a pause meanwhile must not
    // become an unhandled error (the destination gets the error when it reads, or the abort)
    counter.on('error', () => {});
    signal.addEventListener('abort', () => { source.destroy(signal.reason); counter.destroy(signal.reason); }, { once: true });
    source.pipe(counter);
    if (dst.mount) {
      it.partial = name;
      await this.#net.write(p, dst.mount, joinPath(dst.path, name), counter, { start, signal, size: it.size - start });
      return;
    }
    const view = await openHome(this.#kernel, p);
    const parent = dst.home === 'root' ? view.homeId : view.toBack(dst.home);
    const id = replace ? view.toFront(replace.id) : await this.#createHomeNode(u, q, view, parent, name, 'file');
    if (!replace) it.created = id;
    const back = view.toBack(id);
    if (view.fs.writeFrom) await view.fs.writeFrom(p, back, counter, { signal });
    else {
      const chunks = [];
      for await (const c of counter) chunks.push(c);
      await view.fs.write(p, back, Buffer.concat(chunks));
    }
    delete it.created;
    const node = await view.fs.stat(p, back);
    const front = node && toFrontNode(view, node);
    if (front) this.#emit(u, 'fs.external', { put: [front] });
  }

  /** The content of a place as a stream, from `start`. */
  async #open(p, src, start, signal) {
    if (src.mount) return this.#net.read(p, src.mount, src.path, { start, signal, ...(src.format && { format: src.format }) });
    const view = await openHome(this.#kernel, p);
    const back = view.toBack(src.home);
    if (view.fs.readStream) return view.fs.readStream(p, back, { start });
    return Readable.from([(await view.fs.read(p, back)).subarray(start)]);
  }

  /** What is called `name` in a destination folder: { size, modified, id? } or null. */
  async #existing(p, dst, name) {
    if (dst.mount) {
      const e = await this.#net.stat(p, dst.mount, joinPath(dst.path, name));
      if (e?.type === 'folder') fail('conflict', `C’è già una cartella «${name}» dove va il file`);
      return e;
    }
    const view = await openHome(this.#kernel, p);
    const parent = dst.home === 'root' ? view.homeId : view.toBack(dst.home);
    const same = (await view.fs.list(p, parent)).find(n => n.name.toLowerCase() === name.toLowerCase());
    if (same && same.type !== 'file') fail('conflict', `C’è già un elemento «${name}» che non è un file`);
    return same ?? null;
  }

  async #names(p, dst) {
    if (dst.mount) return (await this.#net.listFolder(p, dst.mount, dst.path)).map(e => e.name);
    const view = await openHome(this.#kernel, p);
    return (await view.fs.list(p, dst.home === 'root' ? view.homeId : view.toBack(dst.home))).map(n => n.name);
  }

  /** What a file that stopped midway left: the new node in the home goes; on a server, the partial file goes unless kept for resuming. */
  async #discard(u, it, dst, name, replace, { keepRemote = false } = {}) {
    const p = u.principal;
    try {
      if (dst.home && it.created) {
        const view = await openHome(this.#kernel, p);
        await view.fs.remove(p, [view.toBack(it.created)]);
        this.#emit(u, 'fs.external', { remove: [it.created] });
        delete it.created;
      } else if (dst.mount && !replace && !keepRemote) {
        await this.#net.removePath(p, dst.mount, joinPath(dst.path, name));
        delete it.partial;
      }
    } catch { /* gone already, or the server is not there: nothing more to do */ }
    if (!keepRemote || dst.home) it.done = 0;
  }

  /** A queue with nothing left to do: tells the user, then keeps only what failed. */
  #finish(u, q) {
    const counts = { done: 0, error: 0, skipped: 0, canceled: 0, bytes: 0 };
    walk(q.items, it => {
      if (it.kind !== 'file') return;
      if (it.state in counts) counts[it.state]++;
      if (it.state === 'done') counts.bytes += it.size;
    });
    if (counts.done || counts.error) this.#notify(u, q, counts).catch(err => log.error('Notifica dei trasferimenti', err));
    q.items = prune(q.items, it => it.state === 'error');
    q.finished = true;
    this.#tidy(u);
    this.#changed(u, true);
  }

  async #notify(u, q, { done, error, bytes }) {
    const parts = [];
    if (done) parts.push(`${done} ${done === 1 ? 'file trasferito' : 'file trasferiti'} in «${q.label}» (${sizeText(bytes)})`);
    if (error) parts.push(`${error} ${error === 1 ? 'file non trasferito' : 'file non trasferiti'}${done ? '' : ` in «${q.label}»`}`);
    const text = `Trasferimento ${error ? (done ? 'finito con errori' : 'non riuscito') : 'completato'}: ${parts.join('. ')}.`;
    const level = error ? (done ? 'warning' : 'error') : 'success';
    const service = this.#kernel.services.get('notifications');
    if (service) {
      try {
        await service.send(u.principal.id, { from: { system: true }, level, text, action: { entry: 'transfers', args: null } });
        return;
      } catch { /* too many: the pages say it */ }
    }
    this.#emit(u, 'net.notify', { text, level });
  }

  /** Drops queues with nothing in them, the indexes of items gone, and ends the run when all is quiet. */
  #tidy(u) {
    u.queues = u.queues.filter(q => q.items.length || (q.runner && !q.finished));
    u.index.clear();
    for (const q of u.queues) walk(q.items, it => u.index.set(it.id, { item: it, queue: q }));
    if (!u.queues.some(q => q.runner && !q.finished)) u.run = null;
  }

  // ---------- Telling the pages ----------

  /** Something changed: the pages hear it soon (now if `now`), and it is saved. */
  #changed(u, now) {
    this.#saveSoon(u);
    if (now) {
      clearTimeout(u.emitTimer);
      u.emitTimer = null;
      return this.#emitSnapshot(u);
    }
    if (u.emitTimer) return;
    u.emitTimer = setTimeout(() => { u.emitTimer = null; this.#emitSnapshot(u); }, Math.max(0, EMIT_EVERY - (Date.now() - u.lastEmit)));
  }

  #emitSnapshot(u) {
    u.lastEmit = Date.now();
    this.#emit(u, 'net.transfers', this.#snapshot(u));
    for (const q of u.queues) q.fresh = null;
  }

  #emit(u, event, data) {
    this.#kernel.events.emit('user', { owner: u.principal.id, event, data });
  }

  /** Speeds, once a second, while something runs. */
  #tick() {
    if (this.#ticker) return;
    this.#ticker = setInterval(() => {
      let busy = false;
      for (const u of this.#users.values()) {
        for (const q of u.queues) {
          const delta = q.bytes - (q.lastBytes ?? q.bytes);
          q.lastBytes = q.bytes;
          q.rate = q.runner ? Math.round(q.rate * 0.5 + delta * 0.5) : 0;
          const s = q.sent - (q.lastSent ?? q.sent), r = q.received - (q.lastReceived ?? q.received);
          q.lastSent = q.sent;
          q.lastReceived = q.received;
          q.sentRate = q.runner ? Math.round((q.sentRate ?? 0) * 0.5 + s * 0.5) : 0;
          q.receivedRate = q.runner ? Math.round((q.receivedRate ?? 0) * 0.5 + r * 0.5) : 0;
          busy ||= !!q.runner;
        }
        if (u.queues.some(q => q.runner)) this.#changed(u, false);
      }
      if (!busy) { clearInterval(this.#ticker); this.#ticker = null; }
    }, 1000);
  }

  #snapshot(u) {
    const sent = meter(), received = meter();
    const queues = u.queues.map(q => {
      let total = 0, done = 0, files = 0, filesDone = 0, conflict = null, current = null;
      walk(q.items, it => {
        if (it.kind !== 'file' || it.state === 'canceled' || it.state === 'skipped') return;
        total += it.size;
        done += it.state === 'done' ? it.size : it.done;
        files++;
        if (it.state === 'done') filesDone++;
        if (it.state === 'conflict' && !conflict) conflict = { id: it.id, name: it.name, to: pathOf(u, it, 'dst'), ...it.conflict };
      });
      const cur = q.current && u.index.get(q.current)?.item;
      if (cur) current = { id: cur.id, name: cur.name, size: cur.size, done: cur.done, from: pathOf(u, cur, 'src'), to: pathOf(u, cur, 'dst'), retrying: cur.error ?? null };
      const up = q.key !== 'home';
      const down = q.items.some(it => it.src?.mount) || q.key === 'home';
      if (up) { sent.total += total; sent.done += done; sent.rate += q.sentRate ?? 0; }
      if (down && !up) { received.total += total; received.done += done; }
      if (down) received.rate += q.receivedRate ?? 0;
      const fresh = q.fresh ?? new Set();
      return {
        id: q.id, label: q.label, key: q.key, dir: up ? 'up' : 'down', paused: q.paused, policy: q.policy,
        state: q.paused ? 'paused' : conflict ? 'conflict' : q.runner ? 'running' : 'done',
        total, done, files, filesDone, rate: q.rate ?? 0, current, conflict,
        items: q.items.slice(0, ROWS).map(it => row(it, fresh.has(it.id))), more: Math.max(0, q.items.length - ROWS),
      };
    });
    return { active: u.queues.some(q => q.runner), run: u.run?.id ?? null, since: u.run?.since ?? null, sent, received, queues };
  }
}

/** A row of the window's list. */
function row(it, fresh = false) {
  let files = 0, filesDone = 0, size = it.size, done = it.state === 'done' ? it.size : it.done;
  if (it.kind === 'folder') {
    size = 0;
    done = 0;
    walk(it.children ?? [], c => {
      if (c.kind !== 'file' || c.state === 'canceled' || c.state === 'skipped') return;
      files++;
      size += c.size;
      if (c.state === 'done') { filesDone++; done += c.size; } else done += c.done;
    });
  }
  return { id: it.id, kind: it.kind, name: it.name, size, done, state: it.state, error: it.error ?? null, files, filesDone, ...(fresh && { fresh: true }) };
}

/** 'Immagini/sito/hero.jpg' or 'Sito aziendale/img': where a file comes from or goes. */
function pathOf(u, it, side) {
  const names = [];
  let top = it;
  while (top.parent) {
    names.unshift(top.name);
    top = u.index.get(top.parent)?.item ?? top;
    if (!top.parent) break;
  }
  if (side === 'src') return [top.from, ...(top === it ? [] : names)].filter(Boolean).join('/');
  const folder = it.parent ? names.slice(0, -1) : [];
  return [top.to, ...(top === it ? [] : [top.name, ...folder])].filter(Boolean).join('/');
}

const meter = () => ({ done: 0, total: 0, rate: 0 });
const newId = () => randomUUID().replaceAll('-', '').slice(0, 20);
const delay = ms => new Promise(r => setTimeout(r, ms));
const pick = p => ({ kind: 'user', id: p.id, username: p.username, name: p.name, role: p.role });

class CancelError extends Error { constructor() { super('Annullato'); this.name = 'AbortError'; } }
class PauseError extends Error { constructor() { super('In pausa'); this.name = 'AbortError'; } }
class StopError extends Error { constructor() { super('Kernel in arresto'); this.name = 'AbortError'; } }

const messageOf = err => (err instanceof KernelError ? err.message : String(err?.message ?? err)).slice(0, 300);

function walk(list, fn) {
  for (const it of list) {
    fn(it);
    if (it.children) walk(it.children, fn);
  }
}

/** Keeps the items for which keep() is true, and the folders that still hold some. */
function prune(list, keep) {
  const out = [];
  for (const it of list) {
    if (it.children) {
      const inner = prune(it.children, keep);
      if (inner.length || keep(it)) out.push({ ...it, children: inner });
    } else if (keep(it)) out.push(it);
  }
  return out;
}

/** A folder item's size: the files inside it. */
function sizeUp(item) {
  let size = 0;
  walk(item.children ?? [], c => { if (c.kind === 'file') size += c.size; });
  item.size = size;
}

/** The temporary name a file replacing another on a server is written with ('.name.lilos-part'). */
const partName = name => `.${name.slice(0, 240)}.lilos-part`;

/** 'name 2.ext' (then 3, 4…) when `name` is taken, case not counting. */
export function uniqueName(name, taken) {
  const set = new Set(taken.map(n => n.toLowerCase()));
  if (!set.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let n = 2; ; n++) if (!set.has(`${base} ${n}${ext}`.toLowerCase())) return `${base} ${n}${ext}`;
}

/** '1,2 GB' */
export function sizeText(bytes) {
  const units = ['byte', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes, u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${u ? v.toLocaleString('it-IT', { maximumFractionDigits: 1 }) : v} ${units[u]}`;
}

const REF = r => (r && typeof r.home === 'string' ? { home: r.home }
  : r && typeof r.mount === 'string' && typeof r.path === 'string' ? { mount: r.mount, path: r.path, ...(typeof r.format === 'string' && /^[a-z0-9]{1,10}$/.test(r.format) && { format: r.format }) }
  : null);
const SAVED = ['id', 'parent', 'kind', 'name', 'size', 'done', 'state', 'error', 'from', 'to', 'modified', 'conflict', 'target', 'created', 'final', 'partial', 'resolution'];

function saveItem(it) {
  const out = {};
  for (const k of SAVED) if (it[k] !== undefined) out[k] = it[k];
  out.src = it.src;
  if (it.dst) out.dst = it.dst;
  if (it.children) out.children = it.children.map(saveItem);
  return out;
}

function saveQueue(q) {
  return { id: q.id, key: q.key, label: q.label, workspace: q.workspace, paused: q.paused, policy: q.policy, created: q.created, items: q.items.map(saveItem) };
}

/** A saved queue (untrusted shape) → a queue, or null. */
function restoreQueue(raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.key !== 'string' || !Array.isArray(raw.items)) return null;
  let restored = 0;
  const item = (r, parent) => {
    const src = REF(r?.src);
    if (!src || typeof r.id !== 'string' || (r.kind !== 'file' && r.kind !== 'folder') || !isSafeName(r.name) || ++restored > MAX_ITEMS) return null;
    const it = {
      id: r.id, parent, kind: r.kind, name: r.name, src, size: Number(r.size) || 0, done: Number(r.done) || 0,
      state: typeof r.state === 'string' ? r.state : 'queued', error: typeof r.error === 'string' ? r.error : null,
      from: typeof r.from === 'string' ? r.from : '', to: typeof r.to === 'string' ? r.to : '', modified: Number(r.modified) || 0,
    };
    if (!parent) { it.dst = REF(r.dst); if (!it.dst) return null; }
    if (r.conflict) it.conflict = r.conflict;
    if (REF(r.target)) it.target = REF(r.target);
    if (typeof r.created === 'string') it.created = r.created;
    if (isSafeName(r.final)) it.final = r.final;
    if (typeof r.partial === 'string') it.partial = r.partial;
    if (POLICIES.has(r.resolution)) it.resolution = r.resolution;
    if (r.kind === 'folder') it.children = (Array.isArray(r.children) ? r.children : []).map(c => item(c, it.id)).filter(Boolean);
    return it;
  };
  return {
    id: raw.id, key: raw.key, label: String(raw.label ?? ''), workspace: typeof raw.workspace === 'string' ? raw.workspace : null,
    paused: raw.paused === true, policy: POLICIES.has(raw.policy) ? raw.policy : null, created: Number(raw.created) || Date.now(),
    items: raw.items.map(r => item(r, null)).filter(Boolean), bytes: 0, sent: 0, received: 0, rate: 0,
  };
}
