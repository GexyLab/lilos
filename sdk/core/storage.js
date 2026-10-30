import { kernel } from './kernel.js';

const PREFIX = 'lilos:';

/**
 * Where values live. Connected to the kernel: in memory, loaded at start-up from the user's home
 * (.config) and sent back a moment after each change. Otherwise: localStorage under 'lilos:'.
 */
let memory = null;
let tracker = null;

function connected() {
  if (memory) return true;
  if (!kernel.connected) return false;
  memory = new Map(Object.entries(kernel.data?.storage ?? {}));
  tracker = kernel.track('storage', {
    base: memory,
    read: () => memory,
    send: async (set, remove, { keepalive } = {}) => {
      // In batches the kernel accepts: at most 500 keys and a few MB per request
      const batches = [];
      let current = { set: {}, remove: [] }, size = 0, count = 0;
      const next = () => { batches.push(current); current = { set: {}, remove: [] }; size = 0; count = 0; };
      for (const [key, value] of set) {
        const bytes = (JSON.stringify(value) ?? '').length;
        if (count && (count >= 200 || size + bytes > 4 << 20)) next();
        current.set[key] = value;
        size += bytes;
        count++;
      }
      for (const key of remove) {
        if (count >= 200) next();
        current.remove.push(key);
        count++;
      }
      if (count) next();
      for (const body of batches) await kernel.request('POST', '/storage', body, { keepalive: keepalive && batches.length === 1 });
    },
  });
  return true;
}

/** JSON key/value persistence. Never throws: storage can be blocked or full. */
export const storage = {
  get(key, fallback) {
    if (connected()) return memory.has(key) ? structuredClone(memory.get(key)) : fallback;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    if (connected()) {
      // Through JSON, as in localStorage: what is read back has no functions, undefined, Dates…
      memory.set(key, JSON.parse(JSON.stringify(value) ?? 'null'));
      tracker.schedule();
      return;
    }
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* not persisted — the session keeps working in memory */
    }
  },
  remove(key) {
    if (connected()) {
      if (memory.delete(key)) tracker.schedule();
      return;
    }
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },
  /** Every key stored (without the prefix). */
  keys() {
    if (connected()) return [...memory.keys()];
    try {
      return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length));
    } catch {
      return [];
    }
  },
  /** Approximate size of the stored data, in bytes (JSON text). */
  bytes() {
    let total = 0;
    for (const key of this.keys()) total += key.length + (JSON.stringify(this.get(key)) ?? '').length;
    return total;
  },
};

let counter = 0;
export const uid = () => Date.now().toString(36) + (counter++).toString(36) + Math.random().toString(36).slice(2, 6);
