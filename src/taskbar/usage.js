import { bus, fs, storage, Emitter } from '@lilos/sdk';
import { workspaceKey } from '../workspaces/store.js';

const PART = 'launcher';
const DAY = 86_400_000;
const DAYS = 30;            // "used more often" counts the last 30 days
const MAX_ENTRIES = 100;    // apps and files remembered per workspace, the most recent kept
const MAX_PINNED = 60;
const ID = /^[\w.-]{1,80}$/;

/**
 * What the start menu remembers in each workspace ('lilos:ws:<id>:launcher', removed with the
 * workspace): the favourite apps in their order, and when apps were started and files opened.
 *
 *   { pinned: [app ids], apps: [Entry], files: [Entry] }
 *   Entry: { id, last: time, days: [[day, count]] }   day = days since 1970; only the last DAYS kept
 *
 * Counted: what the user starts (the menu, the desk, the File Manager, «Apri con», a notification:
 * every 'app:launch' of the main window that lilOS does not make by itself) and the files handed
 * to an app to open (args.file). Windows that come back on their own (reload, workareas) are not.
 * Stored data is untrusted: validated on load.
 *
 * Events: 'change' (workspace id)
 */
class Usage extends Emitter {
  #cache = new Map();   // workspace id → data

  constructor() {
    super();
    bus.on('app:launch', ({ id, args, entry = 'main', auto }) => {
      if (auto || entry !== 'main' || !ID.test(String(id))) return;
      const data = this.#data();
      if (!data) return;
      const now = Date.now();
      bump(data.apps, id, now);
      if (typeof args?.file === 'string' && ID.test(args.file)) bump(data.files, args.file, now);
      this.#save();
    });
  }

  // ---------- Queries (of the current workspace) ----------

  /** Favourite app ids, in the user's order. */
  pinned() {
    return [...(this.#data()?.pinned ?? [])];
  }

  isPinned(id) {
    return !!this.#data()?.pinned.includes(id);
  }

  /** [{ id, last }] most recent first; `keep(id)` filters (installed apps, files that still exist). */
  recentApps(keep) { return recent(this.#data()?.apps, keep); }
  recentFiles(keep) { return recent(this.#data()?.files, keep); }

  /** [{ id, count }] used most in the last DAYS days, most first (ties: the most recent). */
  frequentApps(keep) { return frequent(this.#data()?.apps, keep); }
  frequentFiles(keep) { return frequent(this.#data()?.files, keep); }

  // ---------- Changes ----------

  /** Adds (at the end, or at `index`) or removes a favourite. */
  setPinned(id, on, index = null) {
    const data = this.#data();
    if (!data || !ID.test(String(id))) return;
    const list = data.pinned.filter(p => p !== id);
    if (on) list.splice(index ?? list.length, 0, id);
    data.pinned = list.slice(0, MAX_PINNED);
    this.#save();
  }

  /** Takes a file out of both lists (it is not deleted). */
  forgetFile(id) {
    const data = this.#data();
    if (!data) return;
    data.files = data.files.filter(e => e.id !== id);
    this.#save();
  }

  /** Empties the files' lists of the current workspace. */
  clearFiles() {
    const data = this.#data();
    if (!data?.files.length) return;
    data.files = [];
    this.#save();
  }

  // ---------- Internals ----------

  /** The current workspace's data (null without workspaces). */
  #data() {
    const ws = fs.workspace;
    if (!ws) return null;
    if (!this.#cache.has(ws)) this.#cache.set(ws, load(storage.get(workspaceKey(ws, PART))));
    return this.#cache.get(ws);
  }

  #save() {
    const ws = fs.workspace;
    const data = this.#cache.get(ws);
    if (!data) return;
    const today = dayOf(Date.now());
    for (const list of [data.apps, data.files]) list.forEach(e => { e.days = e.days.filter(([d]) => d > today - DAYS); });
    data.apps = latest(data.apps);
    data.files = latest(data.files);
    storage.set(workspaceKey(ws, PART), data);
    this.emit('change', ws);
  }
}

const dayOf = time => Math.floor(time / DAY);

function bump(list, id, now) {
  let e = list.find(x => x.id === id);
  if (!e) list.push(e = { id, last: now, days: [] });
  e.last = now;
  const day = dayOf(now);
  const d = e.days.find(([x]) => x === day);
  if (d) d[1]++;
  else e.days.push([day, 1]);
}

const latest = list => [...list].sort((a, b) => b.last - a.last).slice(0, MAX_ENTRIES);

function recent(list = [], keep = () => true) {
  return latest(list).filter(e => keep(e.id)).map(e => ({ id: e.id, last: e.last }));
}

function frequent(list = [], keep = () => true) {
  const since = dayOf(Date.now()) - DAYS;
  return list
    .map(e => ({ id: e.id, last: e.last, count: e.days.reduce((n, [d, c]) => (d > since ? n + c : n), 0) }))
    .filter(e => e.count > 0 && keep(e.id))
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .map(({ id, count }) => ({ id, count }));
}

function cleanEntry(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !ID.test(raw.id) || !Number.isFinite(raw.last)) return null;
  const days = Array.isArray(raw.days)
    ? raw.days.filter(d => Array.isArray(d) && Number.isInteger(d[0]) && Number.isInteger(d[1]) && d[1] > 0).slice(-DAYS).map(([d, c]) => [d, Math.min(c, 1e6)])
    : [];
  return { id: raw.id, last: raw.last, days };
}

function cleanList(raw) {
  const seen = new Set();
  return Array.isArray(raw) ? latest(raw.slice(0, MAX_ENTRIES * 2).map(cleanEntry).filter(e => e && !seen.has(e.id) && seen.add(e.id))) : [];
}

function load(raw) {
  const pinned = Array.isArray(raw?.pinned) ? [...new Set(raw.pinned.filter(id => typeof id === 'string' && ID.test(id)))].slice(0, MAX_PINNED) : [];
  return { pinned, apps: cleanList(raw?.apps), files: cleanList(raw?.files) };
}

export const usage = new Usage();
