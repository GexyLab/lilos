/**
 * Data that lilOS kept in this browser before the kernel: settings and the tree in localStorage
 * ('lilos:*'), file contents in IndexedDB ('lilos'). Brought into the user's home once, if the
 * user wants, then deleted from the browser.
 */
const PREFIX = 'lilos:';
const FRONT_ID = /^[\w-]{1,64}$/;
const KEY = /^[\w:.-]{1,120}$/;
const TYPES = new Set(['folder', 'file', 'app']);
const BATCH = 1000;

export function hasLocalData() {
  try {
    return Object.keys(localStorage).some(k => k.startsWith(PREFIX));
  } catch {
    return false;
  }
}

function readContents() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('lilos');
      req.onupgradeneeded = () => req.transaction.abort();   // it did not exist: nothing to read
      req.onerror = () => resolve(new Map());
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('contents')) return db.close(), resolve(new Map());
        const out = new Map();
        const cursor = db.transaction('contents').objectStore('contents').openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) return db.close(), resolve(out);
          if (typeof c.key === 'string' && typeof c.value === 'string') out.set(c.key, c.value);
          c.continue();
        };
        cursor.onerror = () => { db.close(); resolve(out); };
      };
    } catch {
      resolve(new Map());
    }
  });
}

/** Nodes the kernel accepts, parents before children, reachable from the root or the trash. */
function cleanNodes(raw) {
  const valid = (Array.isArray(raw) ? raw : []).filter(n => n && FRONT_ID.test(n.id) && n.id !== 'root' && n.id !== 'trash'
    && TYPES.has(n.type) && typeof n.name === 'string' && n.name && !n.name.includes('/') && typeof n.parent === 'string');
  const byParent = new Map();
  for (const n of valid) byParent.set(n.parent, [...(byParent.get(n.parent) ?? []), n]);
  const out = [], queue = ['root', 'trash'], seen = new Set();
  while (queue.length) {
    for (const n of byParent.get(queue.shift()) ?? []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      const now = Date.now();
      out.push({ ...n, created: Number.isFinite(n.created) ? n.created : now, modified: Number.isFinite(n.modified) ? n.modified : now });
      if (n.type === 'folder') queue.push(n.id);
    }
  }
  return out;
}

/** Sends everything to the kernel, then deletes it from the browser. */
export async function importLocalData(kernel) {
  const set = {};
  let nodes = [];
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(PREFIX)) continue;
    let value;
    try { value = JSON.parse(localStorage.getItem(k)); } catch { continue; }
    const key = k.slice(PREFIX.length);
    if (key === 'fs') nodes = cleanNodes(value);
    else if (KEY.test(key)) set[key] = value;
  }
  const entries = Object.entries(set);
  for (let i = 0; i < entries.length; i += 200) {
    await kernel.request('POST', '/storage', { set: Object.fromEntries(entries.slice(i, i + 200)) });
  }
  for (let i = 0; i < nodes.length; i += BATCH) {
    await kernel.request('POST', '/fs/sync', { put: nodes.slice(i, i + BATCH) });
  }
  const texts = await readContents();
  for (const n of nodes) {
    if (n.type === 'file' && texts.has(n.id)) await kernel.request('PUT', `/fs/content/${encodeURIComponent(n.id)}`, texts.get(n.id));
  }
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  await new Promise(resolve => {
    const req = indexedDB.deleteDatabase('lilos');
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
