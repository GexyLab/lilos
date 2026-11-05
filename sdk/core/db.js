import { kernel } from './kernel.js';
import { kernelSettings, limitOf } from './kernelSettings.js';

/**
 * File contents (text or bytes), by node id. Connected to the kernel they live in the user's home and
 * IndexedDB keeps a copy of what was read or written (database 'lilos:<user id>'), up to the kernel's
 * files.cacheMax, used when the kernel does not answer; big contents go to the kernel in pieces
 * (files.uploadPiece). Without the kernel IndexedDB ('lilos') is where they live.
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

/** A stored value as text, or as a Blob (undefined stays undefined: nothing stored). */
const asText = value => (value instanceof Blob ? value.text() : value);
const asBlob = value => (value instanceof Blob ? value : typeof value === 'string' ? new Blob([value]) : value);

const sizeOf = value => (value instanceof Blob ? value.size : String(value).length);

/**
 * The local copy of a content the kernel has: only up to files.cacheMax (0: all of them), so big
 * files do not fill the browser; a bigger one drops the old copy.
 */
async function keepCopy(key, value) {
  let max = Infinity;
  try { max = limitOf((await kernelSettings.limits()).cacheMax); } catch { /* the default: keep it */ }
  if (sizeOf(value) > max) await local.delete(key);
  else await local.set(key, value);
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Sends a content to the kernel: in one request up to files.uploadPiece (0: always one), bigger in
 * pieces of that size (an upload of the kernel, POST /fs/uploads). A piece that fails for the
 * network is sent again from the byte the kernel has, 3 times at most.
 */
async function upload(key, value) {
  const { uploadPiece: piece } = await kernelSettings.limits();
  if (!piece || sizeOf(value) <= piece) return kernel.request('PUT', path(key), value);
  const blob = value instanceof Blob ? value : new Blob([value]);
  const { upload: id } = await kernel.request('POST', '/fs/uploads', { id: key, size: blob.size });
  const at = `/fs/uploads/${encodeURIComponent(id)}`;
  let received = 0, tries = 0;
  try {
    while (received < blob.size) {
      try {
        ({ received } = await kernel.request('PUT', `${at}?offset=${received}`, blob.slice(received, Math.min(blob.size, received + piece))));
        tries = 0;
      } catch (err) {
        // Another offset: where the kernel is
        if (err.code === 'conflict' && Number.isSafeInteger(err.details?.received)) { received = err.details.received; continue; }
        if (err.code !== 'offline' || ++tries > 3) throw err;
        await wait(1000 * tries);
        try { ({ received } = await kernel.request('GET', at)); } catch (e) { if (e.code !== 'offline') throw e; }
      }
    }
  } catch (err) {
    kernel.request('DELETE', at).catch(() => {});
    throw err;
  }
}

/** From the kernel (text or bytes), keeping a local copy; offline, the local copy. */
async function fetchContent(key, blob) {
  if (!kernel.connected) return local.get(key);
  try {
    const value = blob
      ? await kernel.request('GET', `${path(key)}?raw=1`, undefined, { blob: true })
      : await kernel.request('GET', path(key), undefined, { text: true });
    keepCopy(key, value).catch(() => {});
    return value;
  } catch (err) {
    if (err.code !== 'offline') throw err;
    const cached = await local.get(key);
    if (typeof cached === 'string' || cached instanceof Blob) return cached;
    throw err;
  }
}

/**
 * Values are text (a string) or bytes (a Blob): get() always gives text, getBlob() always bytes,
 * whatever was stored.
 */
export const contents = {
  get: async key => asText(await fetchContent(key, false)),
  getBlob: async key => asBlob(await fetchContent(key, true)),
  /** value: a string or a Blob. */
  async set(key, value) {
    if (!(value instanceof Blob)) value = String(value);
    if (!kernel.connected) return local.set(key, value);
    await upload(key, value);
    await keepCopy(key, value);
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
