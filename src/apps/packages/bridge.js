/**
 * The script that runs first inside the sandbox of a local app and gives it `window.lilos`, the
 * only way it has to reach lilOS: every call is a message that lilOS checks against the app's
 * permissions (see host.js). Everything is asynchronous.
 *
 *   lilos.app                            { id, version, args }
 *   lilos.on(event, fn) → off            'launch' (args), 'command' (id), 'theme'
 *   lilos.window.setTitle(text)
 *   lilos.ui.toast(text)
 *   lilos.files.read(ref) → text         ref: '~/Documenti/a.txt' or the id of a file opened with the app
 *   lilos.files.write(ref, text)         creates the file if its folder exists
 *   lilos.files.list(path) → [{ name, type, size, modified }]
 *   lilos.files.mkdir(path)
 *   lilos.storage.get(key) / set(key, value)    the app's own data, for the signed-in user
 *   lilos.clipboard.write(text)
 *
 * Shortcuts of the app's commands (manifest contributes.commands) arrive as 'command' events,
 * with the keys the user chose in Settings.
 */
export const BRIDGE_SOURCE = `(() => {
  'use strict';
  const pending = new Map();
  const listeners = new Map();
  let next = 1;
  let keys = {};
  const info = JSON.parse(document.currentScript.dataset.info);
  keys = info.keys || {};
  delete info.keys;
  const call = (method, ...params) => new Promise((resolve, reject) => {
    const id = next++;
    pending.set(id, { resolve, reject });
    parent.postMessage({ lilos: 1, id, method, params }, '*');
  });
  const emit = (event, data) => (listeners.get(event) || []).forEach(fn => { try { fn(data); } catch (err) { console.error(err); } });
  const applyTheme = vars => { for (const [k, v] of Object.entries(vars || {})) document.documentElement.style.setProperty(k, v); };
  applyTheme(info.theme);
  delete info.theme;
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
  window.lilos = Object.freeze({
    app: Object.freeze(info),
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
})();`;
