import { storage } from '@lilos/sdk';

/**
 * The open tabs of the Editor windows, kept so that they come back: closing a window does not
 * ask to save, its documents and unsaved changes are shown again the next time.
 *
 *   'editor-tabs': { sessions: { [id]: { used, active, tabs: [Tab] } } }
 *     Tab: { key, file: id | null, name, lang?: language chosen by the user, sel?: [start, end], top?,
 *            ws?: the workspace it was closed in (tabs of CLOSED) }
 *     A window's state (getState) holds the id of its session. The session CLOSED gathers the tabs
 *     of the windows the user closed: the next new window takes them.
 *   'editor-draft:<key>': { text, base, time }
 *     The unsaved text of a tab; base: hash() of the file text it was written on (null: no file).
 *
 * Sessions not used for 90 days go, with their drafts (a workarea deleted with an Editor in it).
 */
const KEY = 'editor-tabs';
const DRAFT = 'editor-draft:';
export const CLOSED = 'closed';
/** Characters: a longer unsaved text is not kept (closing the window asks about it). */
export const DRAFT_LIMIT = 2_000_000;
const MAX_AGE = 90 * 86_400_000;
const ORPHAN_AGE = 86_400_000;
const MAX_TABS = 200;
const ID = /^[\w.:-]{1,80}$/;

const isIndex = n => Number.isInteger(n) && n >= 0;

function cleanTab(t) {
  if (!t || typeof t !== 'object' || !ID.test(t.key)) return null;
  const tab = { key: t.key, file: typeof t.file === 'string' && ID.test(t.file) ? t.file : null, name: typeof t.name === 'string' ? t.name.slice(0, 255) : '' };
  if (typeof t.lang === 'string' && ID.test(t.lang)) tab.lang = t.lang;
  if (Array.isArray(t.sel) && t.sel.length === 2 && t.sel.every(isIndex)) tab.sel = [t.sel[0], t.sel[1]];
  if (typeof t.top === 'number' && t.top > 0 && Number.isFinite(t.top)) tab.top = Math.round(t.top);
  if (typeof t.ws === 'string' && ID.test(t.ws)) tab.ws = t.ws;
  return tab;
}

function cleanSession(s) {
  if (!s || typeof s !== 'object') return null;
  const seen = new Set();
  const tabs = (Array.isArray(s.tabs) ? s.tabs : []).map(cleanTab).filter(t => t && !seen.has(t.key) && seen.add(t.key)).slice(0, MAX_TABS);
  const active = tabs.some(t => t.key === s.active) ? s.active : tabs[0]?.key ?? null;
  return { used: Number.isFinite(s.used) ? s.used : 0, active, tabs };
}

function read() {
  const raw = storage.get(KEY, null);
  const sessions = {};
  for (const [id, s] of Object.entries(raw?.sessions && typeof raw.sessions === 'object' ? raw.sessions : {})) {
    const clean = ID.test(id) && cleanSession(s);
    if (clean) sessions[id] = clean;
  }
  return sessions;
}

const write = sessions => storage.set(KEY, { sessions });

/** A saved session ({ active, tabs }), or null. */
export function readSession(id) {
  const s = read()[id];
  return s ? { active: s.active, tabs: s.tabs } : null;
}

export function writeSession(id, { active, tabs }) {
  const sessions = read();
  const clean = cleanSession({ used: Date.now(), active, tabs });
  if (JSON.stringify(sessions[id]?.tabs) === JSON.stringify(clean.tabs) && sessions[id]?.active === clean.active && Date.now() - sessions[id].used < 3_600_000) return;
  sessions[id] = clean;
  write(sessions);
}

/** Removes a session; with drafts: true, also the drafts of its tabs. */
export function removeSession(id, { drafts = false } = {}) {
  const sessions = read();
  if (!sessions[id]) return;
  if (drafts) sessions[id].tabs.forEach(t => removeDraft(t.key));
  delete sessions[id];
  write(sessions);
}

/**
 * Takes the tabs of the windows closed by the user that `wanted(tab)` accepts ({ active, tabs } or
 * null); the others stay aside.
 */
export function takeClosed(wanted = () => true) {
  const s = readSession(CLOSED);
  if (!s) return null;
  const taken = s.tabs.filter(wanted);
  const left = s.tabs.filter(tab => !taken.includes(tab));
  if (left.length) writeSession(CLOSED, { active: s.active, tabs: left });
  else removeSession(CLOSED);
  return taken.length ? { active: s.active, tabs: taken } : null;
}

/**
 * Adds the tabs of a window just closed to the ones put aside before (another window's): nothing
 * is lost. A file open in both keeps the tab just closed.
 */
export function addClosed({ active, tabs }) {
  if (!tabs.length) return;
  const before = readSession(CLOSED)?.tabs ?? [];
  const files = new Set(tabs.map(t => t.file).filter(Boolean));
  const kept = before.filter(t => {
    if (!t.file || !files.has(t.file)) return true;
    removeDraft(t.key);
    return false;
  });
  writeSession(CLOSED, { active, tabs: [...kept, ...tabs].slice(-MAX_TABS) });
}

/** The draft of a tab ({ text, base }) or null. */
export function readDraft(key) {
  const d = storage.get(DRAFT + key, null);
  return d && typeof d.text === 'string' ? { text: d.text, base: typeof d.base === 'string' ? d.base : null } : null;
}

export function writeDraft(key, text, base) {
  storage.set(DRAFT + key, { text, base, time: Date.now() });
}

export function removeDraft(key) {
  storage.remove(DRAFT + key);
}

/** A short fingerprint of a text (FNV-1a and the length): says whether a file changed. */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${text.length.toString(36)}-${(h >>> 0).toString(36)}`;
}

/** Old sessions and drafts no session knows: once, when the Editor is first loaded. */
function cleanup() {
  const sessions = read();
  const now = Date.now();
  let changed = false;
  for (const [id, s] of Object.entries(sessions)) {
    if (now - s.used <= MAX_AGE) continue;
    s.tabs.forEach(t => removeDraft(t.key));
    delete sessions[id];
    changed = true;
  }
  if (changed) write(sessions);
  const known = new Set(Object.values(sessions).flatMap(s => s.tabs.map(t => t.key)));
  for (const key of storage.keys()) {
    if (!key.startsWith(DRAFT) || known.has(key.slice(DRAFT.length))) continue;
    const time = storage.get(key, null)?.time;
    if (!Number.isFinite(time) || now - time > ORPHAN_AGE) storage.remove(key);
  }
}

cleanup();
