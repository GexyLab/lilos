/**
 * Key/value store on IndexedDB ('lilos' database), for data too big for localStorage
 * (file contents). Asynchronous; never throws: if IndexedDB is not available (some private
 * modes) it falls back to memory, and `persistent` tells which one is in use.
 */
const DB_NAME = 'lilos';
const VERSION = 1;

let opening = null;
const memory = new Map();

function open() {
  opening ??= new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore('contents');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

/** Runs one request on the 'contents' store; null db or errors fall back to `fallback()`. */
async function run(mode, makeRequest, fallback) {
  const db = await open();
  if (!db) return fallback();
  return new Promise(resolve => {
    try {
      const req = makeRequest(db.transaction('contents', mode).objectStore('contents'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(fallback());
    } catch {
      resolve(fallback());
    }
  });
}

export const contents = {
  get: key => run('readonly', s => s.get(key), () => memory.get(key)),
  set: (key, value) => run('readwrite', s => s.put(value, key), () => void memory.set(key, value)),
  delete: key => run('readwrite', s => s.delete(key), () => void memory.delete(key)),
  keys: () => run('readonly', s => s.getAllKeys(), () => [...memory.keys()]),
  /** True when data survives a reload (IndexedDB works). */
  persistent: async () => !!(await open()),
};
