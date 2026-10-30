/**
 * `lilos`: what an installed app has of lilOS, the same object however the app runs
 * (see host.js and background.js):
 *
 *   in lilOS's page        a window of an app that is not isolated: lilosApi() called directly
 *   in a Web Worker        a background entry point of an app that is not isolated
 *   in a sandbox           an isolated app: an iframe without an origin of its own; its window, or
 *                          (hidden) its background entry point
 *
 * Every call is a request that lilOS checks against the app's permissions. Everything is asynchronous.
 *
 *   lilos.app                            { id, version, entry, args }
 *   lilos.app.call(entry, data) → result       starts one of the app's own entry points
 *   lilos.app.connect(entry) → MessagePort     a channel with one of its background entry points
 *   lilos.app.keepAlive(on)                    background: stay running (lilOS shows it in the taskbar)
 *   lilos.apps.call(appId, entry, data) → result   another app's entry point (permission apps.call:<appId>)
 *   lilos.handle(fn)                           background: answers calls, fn(data, { from }) → result
 *   lilos.on(event, fn) → off            'launch' (args), 'command' (id), 'theme', 'connect' (port, background)
 *   lilos.window.setTitle(text)          windows only
 *   lilos.ui.toast(text)
 *   lilos.files.read(ref) → text         ref: '~/Documenti/a.txt' or the id of a file opened with the app
 *   lilos.files.write(ref, text)         creates the file if its folder exists
 *   lilos.files.list(path) → [{ name, type, size, modified }]
 *   lilos.files.mkdir(path)
 *   lilos.storage.get(key) / set(key, value)    the app's own data, for the signed-in user
 *   lilos.clipboard.write(text)
 *
 * Apps with sdk '2' export one function per entry point: main({ lilos, root, args }) for windows
 * (root: where to draw; it may return a function lilOS calls when the window closes),
 * name({ lilos, args }) for background entry points. Apps with sdk '1' run at the top of their
 * module, with `lilos` as a global, and only in a sandbox.
 */

/**
 * Builds `lilos` around `call(method, ...params) → Promise`. Serialized (toString) into the code
 * lilOS puts in a sandbox or a worker: it must not use anything from outside itself.
 * Returns { api, emit(event, data), answer(data, from) → result of the lilos.handle() function }.
 */
export function lilosApi(call, info) {
  const listeners = new Map();
  let handler = null;
  const emit = (event, data) => {
    for (const fn of listeners.get(event) || []) {
      try { fn(data); } catch (err) { console.error(err); }
    }
  };
  const api = Object.freeze({
    app: Object.freeze({
      id: info.id, version: info.version, entry: info.entry, args: info.args,
      call: (entry, data) => call('app.call', String(entry), data ?? null),
      connect: entry => call('app.connect', String(entry)),
      keepAlive: on => call('app.keepAlive', on !== false),
    }),
    apps: Object.freeze({ call: (app, entry, data) => call('apps.call', String(app), String(entry), data ?? null) }),
    handle(fn) { handler = typeof fn === 'function' ? fn : null; },
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
      return () => listeners.set(event, listeners.get(event).filter(f => f !== fn));
    },
    window: Object.freeze({ setTitle: text => call('window.setTitle', String(text)) }),
    ui: Object.freeze({ toast: text => call('ui.toast', String(text)) }),
    files: Object.freeze({
      read: ref => call('files.read', ref),
      write: (ref, text) => call('files.write', ref, String(text)),
      list: path => call('files.list', path),
      mkdir: path => call('files.mkdir', path),
    }),
    storage: Object.freeze({
      get: key => call('storage.get', key),
      set: (key, value) => call('storage.set', key, value),
    }),
    clipboard: Object.freeze({ write: text => call('clipboard.write', String(text)) }),
  });
  const answer = async (data, from) => {
    if (!handler) throw new Error(`${info.id}: ${info.entry} non risponde alle chiamate (manca lilos.handle)`);
    return handler(data, { from });
  };
  return { api, emit, answer };
}

/**
 * Runs a background entry point once lilOS sends `init` ({ port, info, libs: [text], code }):
 * requests go through the port, the libraries load as classic scripts, then the entry point's
 * export is called. Text, not a function: Vite rewrites the import() of the source it serves.
 */
const RUNTIME = `function runtime(lilosApi, init) {
  const { port, info, libs, code } = init;
  const pending = new Map();
  let next = 1;
  const call = (method, ...params) => new Promise((resolve, reject) => {
    const id = next++;
    pending.set(id, { resolve, reject });
    port.postMessage({ lilos: 1, id, method, params });
  });
  const { api, emit, answer } = lilosApi(call, info);
  let started = null;   // calls and channels wait for the entry point to be running
  port.onmessage = async e => {
    const m = e.data;
    if (!m || m.lilos !== 1) return;
    if (m.request) {
      try {
        await started;
        port.postMessage({ lilos: 1, reply: m.request, result: (await answer(m.data, m.from)) ?? null });
      } catch (err) {
        port.postMessage({ lilos: 1, reply: m.request, error: String(err?.message ?? err) });
      }
      return;
    }
    if (m.event) {
      const data = m.event === 'connect' ? e.ports[0] : m.data;
      await started.catch(() => {});
      return emit(m.event, data);
    }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error)); else p.resolve(m.result);
  };
  const blob = text => URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
  // A worker has importScripts; a page (the sandbox) loads <script> elements
  const load = typeof importScripts === 'function'
    ? async text => importScripts(blob(text))
    : text => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = blob(text);
      s.onload = resolve;
      s.onerror = () => reject(new Error('Libreria non caricata'));
      document.head.append(s);
    });
  started = (async () => {
    for (const text of libs) await load(text);
    const mod = await import(blob(code));
    const run = mod[info.entry];
    if (typeof run !== 'function') throw new Error('Il codice non esporta ' + info.entry);
    await run({ lilos: api, args: info.args });
  })();
  started.catch(err => call('app.failed', String(err?.message ?? err)));
}`;

/** The script of a Web Worker that runs a background entry point (not isolated). */
export const WORKER_SOURCE = `'use strict';
const lilosApi = ${lilosApi.toString()};
const runtime = ${RUNTIME};
onmessage = e => { onmessage = null; runtime(lilosApi, e.data); };`;

/** The script of the hidden sandbox that runs a background entry point (isolated). */
export const SANDBOX_RUNTIME_SOURCE = `(() => {
  'use strict';
  const lilosApi = ${lilosApi.toString()};
  const runtime = ${RUNTIME};
  addEventListener('message', function start(e) {
    if (e.source !== parent || !e.data || e.data.lilos !== 1 || !e.data.init) return;
    removeEventListener('message', start);
    runtime(lilosApi, e.data.init);
  });
})();`;

/**
 * The script that runs first in the sandbox of an isolated window: window.lilos, through
 * messages to the parent page. App shortcuts are caught here (the keyboard focus is in the
 * sandbox) and arrive as 'command' events, with the keys the user chose in Settings.
 */
export const BRIDGE_SOURCE = `(() => {
  'use strict';
  const lilosApi = ${lilosApi.toString()};
  const pending = new Map();
  let next = 1;
  const info = JSON.parse(document.currentScript.dataset.info);
  let keys = info.keys || {};
  delete info.keys;
  const call = (method, ...params) => new Promise((resolve, reject) => {
    const id = next++;
    pending.set(id, { resolve, reject });
    parent.postMessage({ lilos: 1, id, method, params }, '*');
  });
  const applyTheme = vars => { for (const [k, v] of Object.entries(vars || {})) document.documentElement.style.setProperty(k, v); };
  applyTheme(info.theme);
  delete info.theme;
  const { api, emit } = lilosApi(call, info);
  addEventListener('message', e => {
    if (e.source !== parent) return;
    const m = e.data;
    if (!m || m.lilos !== 1) return;
    if (m.event === 'keys') { keys = m.data || {}; return; }
    if (m.event === 'theme') applyTheme(m.data);
    if (m.event) return emit(m.event, m.data);
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error)); else p.resolve(m.result);
  });
  const NAMED = new Set(['Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
  addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey || e.altKey)) return;
    let key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (!NAMED.has(key) && key.length !== 1 && !/^F\\d{1,2}$/.test(key)) return;
    const mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey && (NAMED.has(key) || /^[A-Z0-9]$/.test(key) || /^F\\d/.test(key))) mods.push('Shift');
    const id = keys[[...mods, key].join('+')];
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    emit('command', id);
  }, true);
  window.lilos = api;
})();`;
