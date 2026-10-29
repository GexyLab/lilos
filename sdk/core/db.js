import { kernel } from './kernel.js';

/**
 * File contents (text), by node id. Connected to the kernel they live in the user's home and
 * IndexedDB keeps a copy of what was read or written (database 'lilos:<user id>'), used when the
 * kernel does not answer. Without the kernel IndexedDB ('lilos') is where they live.
 * Asynchronous; never throws for the local part: without IndexedDB (some private modes) memory
 * is used, and `persistent` tells which one is in use. Reading or writing through the kernel
 * throws its errors (KernelError).
 */
const VERSION = 1;

let opening = null;
const memory = new Map();

const dbName = () => (kernel.connected ? `lilos:${kernel.user.id}` : 'lilos');

kernel.onLogout(() => contents.forget());

function open() {
  opening ??= new Promise(resolve => {
    try {
      const req = indexedDB.open(dbName(), VERSION);
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

const local = {
  get: key => run('readonly', s => s.get(key), () => memory.get(key)),
  set: (key, value) => run('readwrite', s => s.put(value, key), () => void memory.set(key, value)),
  delete: key => run('readwrite', s => s.delete(key), () => void memory.delete(key)),
  keys: () => run('readonly', s => s.getAllKeys(), () => [...memory.keys()]),
};

const path = key => `/fs/content/${encodeURIComponent(key)}`;

export const contents = {
  async get(key) {
    if (!kernel.connected) return local.get(key);
    try {
      const text = await kernel.request('GET', path(key), undefined, { text: true });
      local.set(key, text);
      return text;
    } catch (err) {
      if (err.code !== 'offline') throw err;
      const cached = await local.get(key);
      if (typeof cached === 'string') return cached;
      throw err;
    }
  },
  async set(key, value) {
    if (kernel.connected) await kernel.request('PUT', path(key), String(value));
    await local.set(key, value);
  },
  /** Connected, the kernel removes a file's content with its node: only the local copy goes. */
  delete: key => local.delete(key),
  keys: () => local.keys(),
  /** True when data survives a reload (the kernel, or IndexedDB). */
  persistent: async () => kernel.connected || !!(await open()),
  /** Deletes the local copies (signing out). */
  async forget() {
    const db = await open();
    db?.close();
    opening = null;
    memory.clear();
    await new Promise(resolve => {
      try {
        const req = indexedDB.deleteDatabase(dbName());
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      } catch {
        resolve();
      }
    });
  },
};
