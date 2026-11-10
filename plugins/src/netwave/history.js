import { Emitter, storage, uid } from '@lilos/sdk';
import { options } from './options.js';

/**
 * NetWave's history, one per lilOS user, shared by every window (they all run in this module) and
 * kept by the kernel with the user's data (storage):
 *   visits     a page opened: { at, url, title, session?: { id, name } }, one key per day
 *              (netwave.visits.YYYY-MM-DD), so a new visit sends only today's list
 *   sessions   a session opened, saved or closed, with a picture of its tabs, so it can be opened
 *              again even when its file is gone: { id, name, file?, path?, event, at, tabs }
 *   closed     tabs and windows closed (the last 20): { kind: 'tab' | 'window', at, tabs, session? }
 * Private windows never write here. Visits and sessions older than options.keepDays go at start.
 * Events: 'change' { kind: 'visits' | 'sessions' | 'closed' }
 */
const DAY = 'netwave.visits.';
const SESSIONS = 'netwave.sessions';
const CLOSED = 'netwave.closed';
const SESSIONS_MAX = 300;
const CLOSED_MAX = 20;
const PER_DAY_MAX = 2000;
const TITLE_MAX = 300;
const URL_MAX = 4000;

const dayKey = time => {
  const d = new Date(time);
  return `${DAY}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const clip = (s, max) => String(s ?? '').slice(0, max);
const list = key => { const v = storage.get(key, []); return Array.isArray(v) ? v : []; };

/** Tabs as kept in history and sessions: { url, title, pinned? } only. */
export const tabsOf = tabs => tabs.filter(x => x?.url).slice(0, 500).map(x => ({ url: clip(x.url, URL_MAX), title: clip(x.title, TITLE_MAX), ...(x.pinned && { pinned: true }) }));

class History extends Emitter {
  #pruned = false;

  #prune() {
    if (this.#pruned) return;
    this.#pruned = true;
    const keep = options.get('keepDays');
    if (!keep) return;
    const limit = Date.now() - keep * 86_400_000;
    const oldest = dayKey(limit);
    for (const key of storage.keys()) if (key.startsWith(DAY) && key < oldest) storage.remove(key);
    const sessions = list(SESSIONS);
    const kept = sessions.filter(s => s.at >= limit);
    if (kept.length !== sessions.length) storage.set(SESSIONS, kept);
  }

  // ---------- Pages ----------

  /** A page was opened (the address changed in a tab). */
  visit(url, title, session = null) {
    if (!/^https?:/i.test(url)) return null;
    this.#prune();
    const at = Date.now();
    const key = dayKey(at);
    const day = list(key);
    const last = day.at(-1);
    // The same page again right away (a reload, a redirect back): one visit
    if (last && last.url === url && at - last.at < 60_000) {
      last.at = at;
      if (title) last.title = clip(title, TITLE_MAX);
    } else {
      day.push({ at, url: clip(url, URL_MAX), title: clip(title, TITLE_MAX), ...(session && { session: { id: session.id, name: clip(session.name, 120) } }) });
      if (day.length > PER_DAY_MAX) day.splice(0, day.length - PER_DAY_MAX);
    }
    storage.set(key, day);
    this.emit('change', { kind: 'visits' });
    return at;
  }

  /** The title of a page came after its visit. */
  retitle(url, title) {
    const key = dayKey(Date.now());
    const day = list(key);
    const v = [...day].reverse().find(x => x.url === url);
    if (!v || v.title === title) return;
    v.title = clip(title, TITLE_MAX);
    storage.set(key, day);
    this.emit('change', { kind: 'visits' });
  }

  /** Visits, newest first: { from?, to?, text?, session? (id) }; at most `limit`. */
  visits({ from = 0, to = Infinity, text = '', session = null, limit = 1000 } = {}) {
    this.#prune();
    const q = text.trim().toLowerCase();
    const out = [];
    const days = storage.keys().filter(k => k.startsWith(DAY)).sort().reverse();
    for (const key of days) {
      for (const v of list(key).slice().reverse()) {
        if (v.at < from || v.at > to) continue;
        if (session && v.session?.id !== session) continue;
        if (q && !`${v.title} ${v.url}`.toLowerCase().includes(q)) continue;
        out.push(v);
        if (out.length >= limit) return out;
      }
    }
    return out;
  }

  /** Pages visited most, for the start page: [{ url, title, count }]. */
  frequent(limit = 8) {
    const counts = new Map();
    for (const v of this.visits({ from: Date.now() - 30 * 86_400_000, limit: 5000 })) {
      let host;
      try { host = new URL(v.url).origin + new URL(v.url).pathname; } catch { continue; }
      const c = counts.get(host) ?? { url: v.url, title: v.title, count: 0 };
      c.count++;
      counts.set(host, c);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  }

  removeVisits(entries) {
    const byDay = new Map();
    for (const e of entries) {
      const key = dayKey(e.at);
      if (!byDay.has(key)) byDay.set(key, new Set());
      byDay.get(key).add(`${e.at}|${e.url}`);
    }
    for (const [key, set] of byDay) storage.set(key, list(key).filter(v => !set.has(`${v.at}|${v.url}`)));
    this.emit('change', { kind: 'visits' });
  }

  // ---------- Sessions ----------

  /** A session was opened, saved or closed: its tabs at that moment. */
  session({ id, name, file = null, path = null, event, tabs }) {
    if (!id) return;
    this.#prune();
    const all = list(SESSIONS);
    all.push({ id, name: clip(name, 120), file, path: clip(path, 1000) || null, event, at: Date.now(), tabs: tabsOf(tabs) });
    storage.set(SESSIONS, all.slice(-SESSIONS_MAX));
    this.emit('change', { kind: 'sessions' });
  }

  /** The latest entry of each session, newest first (with `events`: all of its entries). */
  sessions({ text = '' } = {}) {
    this.#prune();
    const q = text.trim().toLowerCase();
    const latest = new Map();
    for (const s of list(SESSIONS)) {
      const prev = latest.get(s.id);
      latest.set(s.id, { ...s, events: [...(prev?.events ?? []), { event: s.event, at: s.at }] });
    }
    return [...latest.values()]
      .filter(s => !q || `${s.name} ${s.tabs.map(x => `${x.title} ${x.url}`).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => b.at - a.at);
  }

  /** The entry of a session at a moment (its picture then), or its latest. */
  sessionAt(id, at = null) {
    const all = list(SESSIONS).filter(s => s.id === id);
    return (at ? all.find(s => s.at === at) : all.at(-1)) ?? null;
  }

  removeSession(id) {
    storage.set(SESSIONS, list(SESSIONS).filter(s => s.id !== id));
    this.emit('change', { kind: 'sessions' });
  }

  // ---------- Closed ----------

  closed() { return list(CLOSED).slice().reverse(); }

  addClosed(kind, tabs, session = null) {
    const kept = tabsOf(tabs);
    if (!kept.length) return;
    const all = list(CLOSED);
    all.push({ id: uid(), kind, at: Date.now(), tabs: kept, ...(session && { session: { id: session.id, name: clip(session.name, 120) } }) });
    storage.set(CLOSED, all.slice(-CLOSED_MAX));
    this.emit('change', { kind: 'closed' });
  }

  /** Takes a closed entry out (it is being reopened): the newest tab without an id. */
  takeClosed(id = null) {
    const all = list(CLOSED);
    const i = id ? all.findIndex(x => x.id === id) : all.map(x => x.kind).lastIndexOf('tab');
    if (i < 0) return null;
    const [entry] = all.splice(i, 1);
    storage.set(CLOSED, all);
    this.emit('change', { kind: 'closed' });
    return entry;
  }

  // ---------- Clearing ----------

  /** Clears what happened since `since` (0: everything): pages and/or sessions. */
  clear({ since = 0, pages = true, sessions = true } = {}) {
    if (pages) {
      for (const key of storage.keys()) {
        if (!key.startsWith(DAY)) continue;
        if (!since) { storage.remove(key); continue; }
        const day = list(key);
        const kept = day.filter(v => v.at < since);
        if (kept.length !== day.length) storage.set(key, kept);
      }
      storage.set(CLOSED, since ? list(CLOSED).filter(x => x.at < since) : []);
    }
    if (sessions) storage.set(SESSIONS, since ? list(SESSIONS).filter(s => s.at < since) : []);
    this.emit('change', { kind: 'visits' });
    this.emit('change', { kind: 'sessions' });
    this.emit('change', { kind: 'closed' });
  }
}

export const history = new History();
