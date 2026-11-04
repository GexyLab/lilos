import { h, Emitter, kernel, locale, bus, fs } from '@lilos/sdk';
import { lilosApi, bridgeTexts, WORKER_SOURCE, SANDBOX_RUNTIME_SOURCE } from './bridge.js';
import { appCode, librariesCode, entrypoints, inline, escapeAttr, netOrigins } from './code.js';
import { isIsolated } from './isolation.js';
import { hostMethods, invoke, transferOf } from './methods.js';
import { registry } from '../registry.js';
import { pipeTarget } from '../pipes.js';
import { notify } from '../../notifications/notify.js';

/**
 * Background entry points of installed apps: started when someone calls them (the system, the
 * app itself, another app) and stopped after a while without calls, unless they asked to stay
 * (lilos.app.keepAlive): those show in the taskbar, where the user can stop them.
 *
 *   isolated       a hidden iframe sandbox (no origin of its own: it reaches nothing but `lilos`).
 *                  Not a worker inside it: a worker there is not a secure context (no crypto.subtle).
 *                  Chrome runs a sandbox in a process of its own, so it does not slow lilOS down.
 *   not isolated   a Web Worker with lilOS's origin
 *   system apps    their export, in lilOS's page
 *
 * Each runs once per app and entry point, for the whole session (not per workspace).
 */
const { t } = locale.define('lilos:apps.background', {
  en: { strings: {
    notStarted: '{app} did not start: {message}', noExport: 'The code does not export {entry}',
    codeError: 'error in the code', stopped: '{app} has stopped',
  } },
});

const IDLE = 5 * 60_000;
const instances = new Map();   // 'appId#entry' → Instance

/** Events: 'change' — background entry points started, stopped or changed keepAlive. */
export const backgroundApps = new Emitter();

let workerUrl = null;
const workerSource = () => (workerUrl ??= URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' })));

function sandboxDocument(manifest) {
  const net = netOrigins(manifest);
  const csp = [
    "default-src 'none'", "script-src 'unsafe-inline' blob: 'wasm-unsafe-eval'", 'worker-src blob:',
    `connect-src ${net.length ? net.join(' ') : "'none'"}`, 'img-src data: blob:', "form-action 'none'", "base-uri 'none'",
  ].join('; ');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${escapeAttr(csp)}">
<script>${inline(SANDBOX_RUNTIME_SOURCE)}</script></head><body></body></html>`;
}

class Instance {
  #requests = new Map();
  #next = 1;
  #halt = () => {};
  #answer = null;    // system apps: lilos.handle() of the module, called directly
  #pipe = null;      // system apps: its lilos.pipes functions, called directly
  #emit = null;
  #offLocale = () => {};
  port = null;
  keepAlive = false;
  used = Date.now();

  constructor(app, entry) {
    this.app = app;
    this.pkg = app.package;
    this.entry = entry;
    this.key = `${app.id}#${entry}`;
    this.handles = new Set();
    this.readOnly = new Map();   // file id → calls in progress that handed it to read
    // lilOS calls its lilos.pipes functions like a call, marked with the subscription
    this.pipes = pipeTarget({ key: this.key, pkg: this.pkg, entry, handles: this.handles, deliver: (sub, data, ctx) => this.#call({ pipe: sub, data, ctx }) });
    this.methods = hostMethods({ pkg: this.pkg, handles: this.handles, readOnly: this.readOnly, instance: this, pipe: this.pipes });
    // The system's language changed: the entry point gets its strings again
    this.#offLocale = locale.on('change', () => {
      const data = locale.strings(this.pkg.id);
      if (this.#emit) this.#emit('locale', data);
      else this.port?.postMessage({ lilos: 1, event: 'locale', data });
    });
    this.ready = this.#start();
    this.ready.catch(err => {
      console.error(`[lilos] ${this.key}:`, err);
      notify(t('notStarted', { app: app.name, message: err.message }), { level: 'error' });
      this.stop();
    });
  }

  get label() {
    return entrypoints(locale.manifest(this.pkg.manifest))[this.entry]?.label ?? this.app.name;
  }

  async #start() {
    const { pkg, entry } = this;
    const ep = entrypoints(pkg.manifest)[entry];
    const info = { id: pkg.id, version: pkg.version, entry, args: null, locale: locale.strings(pkg.id), texts: bridgeTexts() };
    if (pkg.system) {
      const mod = await this.app.load();
      if (typeof mod[entry] !== 'function') throw new Error(t('noExport', { entry }));
      const { api, emit, answer, pipe } = lilosApi((method, ...params) => Promise.resolve().then(() => invoke(this.methods, method, params)), info, locale.engine);
      this.#answer = answer;
      this.#pipe = pipe;
      this.#emit = emit;
      await mod[entry]({ lilos: api, args: null });
      return;
    }
    const [code, libs] = await Promise.all([appCode(pkg, ep.file ?? pkg.manifest.entry), librariesCode(pkg.manifest)]);
    const channel = new MessageChannel();
    this.port = channel.port1;
    this.port.onmessage = e => this.#onMessage(e.data);
    const init = { port: channel.port2, info, libs, code };
    if (isIsolated(pkg)) {
      const frame = h('iframe', { class: 'pkg-background', sandbox: 'allow-scripts', referrerpolicy: 'no-referrer', allow: '', tabindex: '-1', 'aria-hidden': 'true' });
      frame.srcdoc = sandboxDocument(pkg.manifest);
      const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
      document.body.append(frame);
      this.#halt = () => frame.remove();
      await loaded;
      // Its origin is opaque: '*' is the only way to reach it
      frame.contentWindow.postMessage({ lilos: 1, init }, '*', [channel.port2]);
    } else {
      const worker = new Worker(workerSource(), { name: this.key });
      worker.onerror = e => {
        e.preventDefault();
        this.methods['app.failed'](e.message || t('codeError'));
      };
      this.#halt = () => worker.terminate();
      worker.postMessage(init, [channel.port2]);
    }
  }

  async #onMessage(m) {
    if (!m || m.lilos !== 1) return;
    if (m.reply) {
      const r = this.#requests.get(m.reply);
      if (!r) return;
      this.#requests.delete(m.reply);
      this.used = Date.now();
      if (m.error) r.reject(new Error(m.error)); else r.resolve(m.result);
      return;
    }
    try {
      const result = (await invoke(this.methods, m.method, m.params)) ?? null;
      this.port?.postMessage({ lilos: 1, id: m.id, result }, transferOf(result));
    } catch (err) {
      this.port?.postMessage({ lilos: 1, id: m.id, error: err.message });
    }
  }

  /**
   * A call to the entry point: what its lilos.handle() function returns. The files in `data`
   * (file, files) are handed to it; with readOnly only to read, and only until it answers.
   */
  async request(data, from, { readOnly = false } = {}) {
    const ids = [];
    if (data && typeof data === 'object') {
      if (typeof data.file === 'string') ids.push(data.file);
      if (Array.isArray(data.files)) ids.push(...data.files.filter(f => typeof f === 'string'));
    }
    if (!readOnly) {
      ids.forEach(id => this.handles.add(id));
      return this.#call({ data, from });
    }
    // Counted: two calls at once may hand the same file
    ids.forEach(id => this.readOnly.set(id, (this.readOnly.get(id) ?? 0) + 1));
    try {
      return await this.#call({ data, from });
    } finally {
      ids.forEach(id => (this.readOnly.get(id) > 1 ? this.readOnly.set(id, this.readOnly.get(id) - 1) : this.readOnly.delete(id)));
    }
  }

  async #call(message) {
    await this.ready;
    this.used = Date.now();
    if (message.pipe && this.#pipe) return this.#pipe(message.pipe, message.data, message.ctx);
    if (!message.pipe && this.#answer) return this.#answer(message.data, message.from);
    if (!this.port) throw new Error(t('stopped', { app: this.app.name }));
    return new Promise((resolve, reject) => {
      const id = this.#next++;
      this.#requests.set(id, { resolve, reject });
      if (message.pipe) setTimeout(() => this.#requests.delete(id), 60_000);   // the pipe gave up already
      this.port.postMessage({ lilos: 1, request: id, ...message });
    });
  }

  /** A channel with the entry point: it gets the other end as a 'connect' event. */
  async connect() {
    await this.ready;
    this.used = Date.now();
    const channel = new MessageChannel();
    if (this.#emit) this.#emit('connect', channel.port2);
    else this.port.postMessage({ lilos: 1, event: 'connect' }, [channel.port2]);
    return channel.port1;
  }

  setKeepAlive(on) {
    this.keepAlive = on;
    this.used = Date.now();
    backgroundApps.emit('change');
  }

  stop() {
    if (instances.get(this.key) !== this) return;
    instances.delete(this.key);
    this.pipes.close();
    // What it held in memory is gone (an encryption app's keys): the windows of the files whose
    // content is its own close, as when it locks them
    const own = [...this.handles].filter(id => fs.appMeta(id, this.app.id)?.content === true);
    if (own.length) bus.emit('files:locked', own);
    this.#offLocale();
    this.#halt();
    this.port?.close();
    this.port = null;
    for (const r of this.#requests.values()) r.reject(new Error(t('stopped', { app: this.app.name })));
    this.#requests.clear();
    backgroundApps.emit('change');
  }
}

let sweeping = 0;
function sweep() {
  const now = Date.now();
  for (const inst of [...instances.values()]) if (!inst.keepAlive && now - inst.used > IDLE) inst.stop();
  if (!instances.size) {
    clearInterval(sweeping);
    sweeping = 0;
  }
}

function instanceOf(app, entry) {
  const key = `${app.id}#${entry}`;
  let inst = instances.get(key);
  if (!inst) {
    inst = new Instance(app, entry);
    instances.set(key, inst);
    sweeping ||= setInterval(sweep, 30_000);
    backgroundApps.emit('change');
  }
  return inst;
}

/** Calls a background entry point (starting it if needed). options: { readOnly } (see request). */
export const call = (app, entry, data, from, options) => instanceOf(app, entry).request(data ?? null, from ?? null, options);

/** Starts a background entry point if it is not running; resolves once its code ran. */
export const start = (app, entry) => instanceOf(app, entry).ready;

/** A MessagePort to a background entry point (starting it if needed). */
export const connect = (app, entry) => instanceOf(app, entry).connect();

/** Running entry points: [{ key, appId, name, label, glyph, keepAlive }]. */
export const running = () => [...instances.values()].map(i => ({
  key: i.key, appId: i.app.id, name: i.app.name, label: i.label, glyph: i.app.glyph, keepAlive: i.keepAlive,
}));

export const stop = key => instances.get(key)?.stop();
export const stopApp = id => [...instances.values()].filter(i => i.app.id === id).forEach(i => i.stop());

// A new version, or the app gone: what runs is the old code
registry.on('change', ({ id }) => stopApp(id));
kernel.onLogout(() => [...instances.values()].forEach(i => i.stop()));
