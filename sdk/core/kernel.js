import { Emitter } from './events.js';
import { defineLater } from './strings.js';

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

// defineLater, not locale.define: locale.js imports this file (see strings.js)
const { t } = defineLater('lilos:sdk.kernel', {
  en: { strings: {
    canceled: 'Canceled', offline: 'The lilOS kernel is not responding', status: 'Error {status}',
    badModule: 'Invalid module', badPath: 'Invalid path',
  } },
});

export class KernelError extends Error {
  /**
   * details: what the kernel adds to some errors (the fingerprint of a server to confirm…).
   * retryAfter: seconds to wait before trying again ('rate_limited'), when the kernel says.
   */
  constructor(status, code, message, details, retryAfter) {
    super(message);
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
    if (retryAfter > 0) this.retryAfter = retryAfter;
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
  /** The language lilOS is in ('it-IT'), sent with each request: the kernel answers in it (locale.js sets it). */
  locale = null;
  #trackers = new Map();
  #onLogout = [];

  /**
   * One request; JSON in and out (`text` for raw text, `blob` for bytes). A string body goes as
   * text, a Blob, ArrayBuffer or typed array as bytes, anything else as JSON. Throws KernelError
   * ('canceled' when `signal` aborts it).
   */
  async request(method, path, body, { text = false, blob = false, keepalive = false, signal } = {}) {
    const bytes = body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body);
    let res;
    try {
      res = await fetch(API + path, {
        method,
        credentials: 'same-origin',
        keepalive,
        signal,
        headers: {
          'X-Lilos': '1',
          ...(this.locale && { 'X-Lilos-Locale': this.locale }),
          ...(body !== undefined && { 'Content-Type': bytes ? 'application/octet-stream' : typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json' }),
        },
        body: body === undefined ? undefined : bytes || typeof body === 'string' ? body : JSON.stringify(body),
      });
    } catch {
      if (signal?.aborted) throw new KernelError(0, 'canceled', t('canceled'));
      throw new KernelError(0, 'offline', t('offline'));
    }
    if (res.status === 401 && this.connected && this.mode === 'multi') this.emit('signedout');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new KernelError(res.status, err.error ?? 'internal', err.message ?? t('status', { status: res.status }), err.details, Number(res.headers.get('Retry-After')) || undefined);
    }
    if (res.status === 204) return undefined;
    return blob ? res.blob() : text ? res.text() : res.json();
  }

  /**
   * A live channel with the kernel: a WebSocket to /api<path> behind a MessagePort. Strings
   * (up to `maxText` characters) and bytes (ArrayBuffer or typed array, up to `maxBytes`) go both
   * ways as they are; when the socket closes the port gets the string '{"t":"gone","code":…}' and
   * closes. port.detach() closes the socket (for lilOS: the window that held it closed).
   */
  channel(path, { maxText = 1 << 20, maxBytes = 1 << 20 } = {}) {
    const url = new URL(API + path, location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    const { port1, port2 } = new MessageChannel();
    const waiting = [];
    socket.onopen = () => waiting.splice(0).forEach(m => socket.send(m));
    socket.onmessage = e => port1.postMessage(e.data);
    socket.onclose = e => {
      port1.postMessage(JSON.stringify({ t: 'gone', code: e.code }));
      port1.close();
    };
    port1.onmessage = e => {
      const data = e.data;
      if (typeof data === 'string') { if (data.length > maxText) return; }
      else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) { if (data.byteLength > maxBytes) return; }
      else return;
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
      else if (socket.readyState === WebSocket.CONNECTING) waiting.push(data);
    };
    port2.detach = () => socket.close(1000);
    return port2;
  }

  /**
   * The API of a kernel module (its ctx.route and ctx.socket): request(method, path, body) is
   * request() on /modules/<name><path>, channel(path) a channel() there, with messages up to
   * 16 MiB (the module sets its own limit when it accepts the socket).
   */
  module(name) {
    if (!/^[a-z][a-z0-9-]{0,40}$/.test(String(name))) throw new Error(t('badModule'));
    const base = `/modules/${name}`;
    // The same paths a module may declare (modules.js): no dots, so no '..' either; /update and
    // /settings are the kernel's (an admin's management of the module), never the module's
    const checked = path => {
      const p = String(path);
      if (!/^(\/[\w:-]+)+$/.test(p) || /^\/(update|settings)(\/|$)/i.test(p)) throw new Error(t('badPath'));
      return base + p;
    };
    return Object.freeze({
      request: (method, path, body) => this.request(String(method).toUpperCase(), checked(path), body),
      channel: path => this.channel(checked(path), { maxText: 16 << 20, maxBytes: 16 << 20 }),
    });
  }

  /** { mode, user }: who is signed in (user null if nobody). */
  async session() {
    const s = await this.request('GET', '/session');
    this.mode = s.mode;
    this.user = s.user;
    return s;
  }

  /** Signs in; with `remember` false the session ends when the browser closes. */
  async login(username, password, { remember = true } = {}) {
    const { user } = await this.request('POST', '/session', { username, password, remember });
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

  /** These entries ([key, value]) are what the kernel has already (it made them): not to send. */
  accept(entries) {
    for (const [k, v] of entries) this.#sent.set(k, JSON.stringify(v));
  }

  /** These keys the kernel removed itself: nothing to send for them. */
  forget(keys) {
    for (const k of keys) this.#sent.delete(k);
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
