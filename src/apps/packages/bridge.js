import { locale } from '@lilos/sdk';

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
 *   lilos.locale                         { code, i18n: { t(key, params), lang, date(), number() } }: the system's
 *                                        locale and the app's strings for it (see the SDK's i18n.js); synchronous
 *   lilos.app.call(entry, data) → result       starts one of the app's own entry points
 *   lilos.app.connect(entry) → MessagePort     a channel with one of its background entry points
 *   lilos.app.keepAlive(on)                    background: stay running (lilOS shows it in the taskbar)
 *   lilos.apps.call(appId, entry, data) → result   another app's entry point (permission apps.call:<appId>)
 *   lilos.handle(fn)                           background: answers calls, fn(data, { from }) → result
 *   lilos.on(event, fn) → off            'launch' (args), 'command' (id), 'theme', 'connect' (port, background),
 *                                        'locale' ({ code, lang }: lilos.locale already has the new strings)
 *   lilos.window.setTitle(text)          windows only
 *   lilos.window.close()                 the window closes, as with its close button
 *   lilos.ui.notify(text | { text, level, action })   a notification in the notification area, kept
 *                                        in the Notifiche window. level: 'info' | 'success' | 'warning' |
 *                                        'error'; action { entry?, args? }: a click opens the app there
 *   lilos.ui.toast(text)                 old name of lilos.ui.notify(text)
 *   lilos.files.read(ref, { bytes? }) → text | Blob   ref: '~/Documenti/a.txt' or the id of a file opened with the app
 *   lilos.files.write(ref, data, { mark? })   text or bytes; creates the file if its folder exists.
 *                                        mark: the app's own data on the file, saved with it (null: none)
 *   lilos.files.info(ref) → { id, name, type, size, modified, path, meta }   meta: the app's data on it
 *   lilos.files.setMeta(ref, value)      the app's own data on the file (null takes it away)
 *   lilos.files.open(id)                 opens a file the app was handed, with its app
 *   lilos.files.locked(ids)              files the app locked again: lilOS closes the windows showing them
 *   lilos.files.shown(ids) → ids         which of these files a window shows now
 *   lilos.files.list(path) → [{ name, type, size, modified }]
 *   lilos.files.mkdir(path)
 *   lilos.pipes.subscribe(event, { stage, position, where }, fn) → off   fn(data, ctx) → { data } | { stop } | nothing
 *                                        (the SDK's pipes.js; permission pipe:<event> or pipe.own:<event>)
 *   lilos.pipes.define(name, { label, edit, stop })   an event of the app's own: '<app id>.<name>'
 *   lilos.pipes.run(name, data) → data   runs it through its handlers
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
 * lilOS puts in a sandbox or a worker: it must not use anything from outside itself; the
 * translations engine comes as `i18nApi` (the SDK's locale.engine), and info.locale are the
 * resolved strings ({ code, lang, strings }). A 'locale' event brings new ones.
 * Returns { api, emit(event, data), answer(data, from) → result of the lilos.handle() function,
 * pipe(sub, data, ctx) → result of a lilos.pipes.subscribe() function }.
 */
export function lilosApi(call, info, i18nApi) {
  const listeners = new Map();
  const subs = new Map();
  let handler = null;
  const locale = i18nApi(info.locale);
  const emit = (event, data) => {
    if (event === 'locale') {
      locale.set(data);
      data = { code: locale.locale.code, lang: locale.locale.i18n.lang };
    }
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
    locale: locale.locale,
    apps: Object.freeze({ call: (app, entry, data) => call('apps.call', String(app), String(entry), data ?? null) }),
    handle(fn) { handler = typeof fn === 'function' ? fn : null; },
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
      return () => listeners.set(event, listeners.get(event).filter(f => f !== fn));
    },
    window: Object.freeze({ setTitle: text => call('window.setTitle', String(text)), close: () => call('window.close') }),
    ui: Object.freeze({
      toast: text => call('ui.toast', String(text)),
      notify: value => call('ui.notify', value !== null && typeof value === 'object' ? value : String(value ?? '')),
    }),
    files: Object.freeze({
      read: (ref, options) => call('files.read', ref, options ?? null),
      write: (ref, data, options) => call('files.write', ref, data instanceof Blob || data instanceof ArrayBuffer || ArrayBuffer.isView(data) ? data : String(data), options ?? null),
      info: ref => call('files.info', ref),
      setMeta: (ref, value) => call('files.setMeta', ref, value ?? null),
      open: ref => call('files.open', ref),
      locked: ids => call('files.locked', ids),
      shown: ids => call('files.shown', ids),
      list: path => call('files.list', path),
      mkdir: path => call('files.mkdir', path),
    }),
    pipes: Object.freeze({
      async subscribe(event, options, fn) {
        if (typeof fn !== 'function') throw new Error('Manca la funzione della pipe');
        const sub = await call('pipes.subscribe', String(event), options ?? null);
        subs.set(sub, fn);
        return () => {
          subs.delete(sub);
          return call('pipes.unsubscribe', sub);
        };
      },
      define: (name, def) => call('pipes.define', String(name), def ?? null),
      run: (name, data) => call('pipes.run', String(name), data ?? null),
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
  const pipe = async (sub, data, ctx) => {
    const fn = subs.get(sub);
    if (!fn) throw new Error(`${info.id}: nessuna funzione per questa pipe`);
    return (await fn(data, ctx)) ?? null;
  };
  return { api, emit, answer, pipe };
}

/**
 * Runs a background entry point once lilOS sends `init` ({ port, info, libs: [text], code }):
 * requests go through the port, the libraries load as classic scripts, then the entry point's
 * export is called. Text, not a function: Vite rewrites the import() of the source it serves.
 */
const RUNTIME = `function runtime(lilosApi, i18nApi, init) {
  const { port, info, libs, code } = init;
  const pending = new Map();
  let next = 1;
  const call = (method, ...params) => new Promise((resolve, reject) => {
    const id = next++;
    pending.set(id, { resolve, reject });
    port.postMessage({ lilos: 1, id, method, params });
  });
  const { api, emit, answer, pipe } = lilosApi(call, info, i18nApi);
  let started = null;   // calls and channels wait for the entry point to be running
  port.onmessage = async e => {
    const m = e.data;
    if (!m || m.lilos !== 1) return;
    if (m.request) {
      try {
        await started;
        const result = m.pipe ? await pipe(m.pipe, m.data, m.ctx) : await answer(m.data, m.from);
        port.postMessage({ lilos: 1, reply: m.request, result: result ?? null });
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
const i18nApi = ${locale.engine.toString()};
const runtime = ${RUNTIME};
onmessage = e => { onmessage = null; runtime(lilosApi, i18nApi, e.data); };`;

/** The script of the hidden sandbox that runs a background entry point (isolated). */
export const SANDBOX_RUNTIME_SOURCE = `(() => {
  'use strict';
  const lilosApi = ${lilosApi.toString()};
  const i18nApi = ${locale.engine.toString()};
  const runtime = ${RUNTIME};
  addEventListener('message', function start(e) {
    if (e.source !== parent || !e.data || e.data.lilos !== 1 || !e.data.init) return;
    removeEventListener('message', start);
    runtime(lilosApi, i18nApi, e.data.init);
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
  const i18nApi = ${locale.engine.toString()};
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
  const { api, emit, pipe } = lilosApi(call, info, i18nApi);
  addEventListener('message', async e => {
    if (e.source !== parent) return;
    const m = e.data;
    if (!m || m.lilos !== 1) return;
    // lilOS calls one of the window's pipe functions
    if (m.request && m.pipe) {
      try {
        parent.postMessage({ lilos: 1, reply: m.request, result: (await pipe(m.pipe, m.data, m.ctx)) ?? null }, '*');
      } catch (err) {
        parent.postMessage({ lilos: 1, reply: m.request, error: String(err && err.message || err) }, '*');
      }
      return;
    }
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
