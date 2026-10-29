import { Emitter } from './events.js';

/**
 * Client of lilOS's kernel (the backend, system/kernel): the system connects it before anything
 * else starts (see connect()), then storage, fs and the file contents live there instead of in
 * the browser. Without a connection the SDK keeps everything in the browser, as before.
 *
 * Changes are sent a moment after they happen, a few at a time (trackers below), and once more
 * when the page is hidden. Events:
 *   'status'    { saving, error }   error: message while changes cannot be saved (retried)
 *   'signedout'                     the session ended: changes wait until the user signs in again
 */
const API = '/api';
const DELAY = 300;
const MAX_RETRY = 30_000;

export class KernelError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class Kernel extends Emitter {
  /** True once connect() loaded the user's data. */
  connected = false;
  /** 'multi' (users sign in) or 'single' (one user, no sign-in). */
  mode = null;
  user = null;
  /** What /api/boot returned: { user, fresh, nodes, storage }. Read by storage and fs at start-up. */
  data = null;
  #trackers = new Map();
  #onLogout = [];

  /** One request; JSON in and out (`text` for raw text). Throws KernelError. */
  async request(method, path, body, { text = false, keepalive = false } = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        credentials: 'same-origin',
        keepalive,
        headers: {
          'X-Lilos': '1',
          ...(body !== undefined && { 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json' }),
        },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      });
    } catch {
      throw new KernelError(0, 'offline', 'Il kernel di lilOS non risponde');
    }
    if (res.status === 401 && this.connected && this.mode === 'multi') this.emit('signedout');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new KernelError(res.status, err.error ?? 'internal', err.message ?? `Errore ${res.status}`);
    }
    if (res.status === 204) return undefined;
    return text ? res.text() : res.json();
  }

  /** { mode, user }: who is signed in (user null if nobody). */
  async session() {
    const s = await this.request('GET', '/session');
    this.mode = s.mode;
    this.user = s.user;
    return s;
  }

  async login(username, password) {
    const { user } = await this.request('POST', '/session', { username, password });
    this.user = user;
    return user;
  }

  /** Signs out after saving what is pending, then runs the onLogout() cleanups (local copies). */
  async logout() {
    await this.flush().catch(() => {});
    await this.request('DELETE', '/session');
    for (const fn of this.#onLogout) await Promise.resolve().then(fn).catch(() => {});
    this.user = null;
  }

  /** fn() runs when the user signs out (it may return a promise). */
  onLogout(fn) {
    this.#onLogout.push(fn);
  }

  /** Loads the user's data: call once, after signing in, before the SDK is used. */
  async connect() {
    this.data = await this.request('GET', '/boot');
    this.user = this.data.user;
    this.connected = true;
    const flushHidden = () => { if (document.visibilityState === 'hidden') this.flush({ keepalive: true }).catch(() => {}); };
    addEventListener('visibilitychange', flushHidden);
    addEventListener('pagehide', () => this.flush({ keepalive: true }).catch(() => {}));
    return this.data;
  }

  /**
   * Keeps something in sync with the kernel by differences: `read()` returns a Map key → value
   * of how it is now; `send(set, remove, options)` sends what changed (set: [[key, value]],
   * remove: [key]). `base` is what the kernel already has. Returns { schedule, flush }.
   */
  track(name, { read, send, base = new Map() }) {
    const tracker = new Tracker(this, read, send, base);
    this.#trackers.set(name, tracker);
    return tracker;
  }

  /** Waits until the changes of a tracker (or of all) reached the kernel. */
  async flush(options = {}) {
    if (typeof options === 'string') return this.#trackers.get(options)?.flush();
    await Promise.all([...this.#trackers.values()].map(t => t.flush(options)));
  }

  /** Changes waiting to be sent (for the 'beforeunload' warning). */
  get pending() {
    return [...this.#trackers.values()].some(t => t.dirty);
  }

  /** After signing in again: send what was waiting. */
  resume() {
    this.#trackers.forEach(t => t.schedule(0));
  }
}

class Tracker {
  #kernel; #read; #send;
  #sent;           // key → JSON the kernel has
  #timer = null;
  #running = null;
  #retry = 0;
  dirty = false;

  constructor(kernel, read, send, base) {
    this.#kernel = kernel;
    this.#read = read;
    this.#send = send;
    this.#sent = new Map([...base].map(([k, v]) => [k, JSON.stringify(v)]));
  }

  /** Sets what the kernel has to the current state (nothing to send). */
  reset() {
    this.#sent = new Map([...this.#read()].map(([k, v]) => [k, JSON.stringify(v)]));
    this.dirty = false;
  }

  schedule(delay = DELAY) {
    this.dirty = true;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.flush().catch(() => {});
    }, delay);
  }

  /** Sends the differences now; resolves when the kernel has everything. */
  async flush(options = {}) {
    clearTimeout(this.#timer);
    this.#timer = null;
    while (this.#running) await this.#running.catch(() => {});
    const now = this.#read();
    const set = [], json = new Map();
    for (const [k, v] of now) {
      const s = JSON.stringify(v);
      json.set(k, s);
      if (this.#sent.get(k) !== s) set.push([k, v]);
    }
    const remove = [...this.#sent.keys()].filter(k => !now.has(k));
    if (!set.length && !remove.length) {
      this.dirty = this.#timer !== null;
      return;
    }
    this.#running = (async () => {
      try {
        this.#kernel.emit('status', { saving: true, error: null });
        await this.#send(set, remove, options);
        set.forEach(([k]) => this.#sent.set(k, json.get(k)));
        remove.forEach(k => this.#sent.delete(k));
        this.#retry = 0;
        this.dirty = this.#timer !== null;   // changed again meanwhile: still waiting
        this.#kernel.emit('status', { saving: false, error: null });
      } catch (err) {
        this.#kernel.emit('status', { saving: false, error: err.message });
        // Session over: wait for resume(); otherwise try again, waiting longer each time
        if (err.status !== 401) {
          this.#retry = Math.min(MAX_RETRY, (this.#retry || 500) * 2);
          this.schedule(this.#retry);
        }
        throw err;
      }
    })();
    try {
      await this.#running;
    } finally {
      this.#running = null;
    }
  }
}

export const kernel = new Kernel();
