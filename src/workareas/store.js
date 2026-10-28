import { storage, uid } from '@lilos/sdk';

const STORAGE_KEY = 'workareas';
export const MIN_SIZE = { w: 280, h: 180 };
const MAX_WORKAREAS = 200;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;
export const MAX_META = 40;
const MAX_META_KEY = 60;
const MAX_META_VALUE = 500;
const MAX_WINDOWS = 30;
const MAX_STATE = 4000;   // characters of JSON per window state

/**
 * Saved workareas ('lilos:workareas'), validated on load: stored data is untrusted.
 *
 *   Workarea: { id, title, rect: { x, y, w, h }, collapsed, created, modified, description,
 *                meta: [{ key, value }], items: [node ids], windows: [SavedWindow] }
 *   SavedWindow: { app, state, rect: { x, y, w, h, minimized } }
 *
 * `items` are the desk items hidden with the workarea while it is reduced to an icon; while it
 * is open its content is whatever lies inside the area. `windows` are the app windows to reopen.
 */
const finite = v => Number.isFinite(v);
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export const cleanTitle = v => text(v, MAX_TITLE).replace(/\s+/g, ' ').trim();

export function cleanMeta(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_META)
    .filter(m => m && typeof m === 'object')
    .map(m => ({ key: text(m.key, MAX_META_KEY).replace(/\s+/g, ' ').trim(), value: text(m.value, MAX_META_VALUE) }));
}

function cleanRect(r) {
  if (!r || ![r.x, r.y, r.w, r.h].every(finite)) return null;
  return { x: r.x, y: r.y, w: Math.max(MIN_SIZE.w, r.w), h: Math.max(MIN_SIZE.h, r.h) };
}

function cleanWindow(w) {
  if (!w || typeof w.app !== 'string' || !/^[\w-]{1,40}$/.test(w.app)) return null;
  const r = w.rect;
  if (!r || ![r.x, r.y].every(finite)) return null;
  let state = null;
  if (w.state && typeof w.state === 'object' && !Array.isArray(w.state)) {
    try { if (JSON.stringify(w.state).length <= MAX_STATE) state = w.state; } catch { /* not JSON */ }
  }
  return {
    app: w.app, state,
    rect: { x: r.x, y: r.y, ...(finite(r.w) && r.w > 0 && { w: r.w }), ...(finite(r.h) && r.h > 0 && { h: r.h }), minimized: r.minimized === true },
  };
}

function cleanWorkarea(raw, now) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !/^[\w-]{1,40}$/.test(raw.id)) return null;
  const rect = cleanRect(raw.rect);
  if (!rect) return null;
  return {
    id: raw.id,
    title: cleanTitle(raw.title) || 'Workarea',
    rect,
    collapsed: raw.collapsed === true,
    created: finite(raw.created) ? raw.created : now,
    modified: finite(raw.modified) ? raw.modified : now,
    description: text(raw.description, MAX_DESCRIPTION),
    meta: cleanMeta(raw.meta),
    items: Array.isArray(raw.items) ? raw.items.filter(id => typeof id === 'string').slice(0, 5000) : [],
    windows: Array.isArray(raw.windows) ? raw.windows.slice(0, MAX_WINDOWS).map(cleanWindow).filter(Boolean) : [],
  };
}

/** `key`: every workspace keeps its workareas apart ('lilos:ws:<id>:workareas'). */
export function loadWorkareas(key = STORAGE_KEY) {
  const data = storage.get(key);
  if (!Array.isArray(data)) return [];
  const now = Date.now();
  const seen = new Set();
  return data.slice(0, MAX_WORKAREAS).map(w => cleanWorkarea(w, now)).filter(w => w && !seen.has(w.id) && seen.add(w.id));
}

export function saveWorkareas(list, key = STORAGE_KEY) {
  storage.set(key, list);
}

export function newWorkarea(rect, title) {
  const now = Date.now();
  return {
    id: uid(), title: cleanTitle(title) || 'Nuova workarea', rect: cleanRect(rect),
    collapsed: false, created: now, modified: now, description: '', meta: [], items: [], windows: [],
  };
}

export function cleanSavedWindow(w) {
  return cleanWindow(w);
}

export const LIMITS = { MAX_WORKAREAS, MAX_WINDOWS, MAX_DESCRIPTION, MAX_META_KEY, MAX_META_VALUE, MAX_TITLE };
