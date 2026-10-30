import { fs, toast, storage } from '@lilos/sdk';
import { coversPath } from './permissions.js';
import { callEntrypoint, connectEntrypoint } from '../entrypoints.js';

/**
 * What an installed app may ask of lilOS through `lilos` (see bridge.js), each request checked
 * against the app's permissions. The same for every way the app runs; an app that is not
 * isolated could go around them, an isolated one cannot.
 */
const MAX_TEXT = 10 << 20;
const STORAGE_KEY = /^[\w.-]{1,64}$/;

/** '~/Documenti/a.txt' → the node, if visible from the current workspace. */
const resolveHome = path => (typeof path === 'string' && /^~(\/[^/]+)*$/.test(path) ? fs.resolve(path) : null);
const splitPath = path => [path.slice(0, path.lastIndexOf('/')) || '~', path.slice(path.lastIndexOf('/') + 1)];
const fail = msg => { throw new Error(msg); };

/**
 * ctx: { pkg, win?, handles, instance? }
 *   win        the app's window (null in the background)
 *   handles    ids of the files the app was opened with or handed: it may read and write them
 *   instance   the background entry point (background.js), for keepAlive
 */
export function hostMethods({ pkg, win = null, handles, instance = null }) {
  const perms = pkg.manifest.permissions ?? [];
  const target = (ref, write) => {
    if (handles.has(ref)) return fs.get(ref) ?? fail('Il file non esiste più');
    if (!coversPath(perms, ref, { write })) fail(`Permesso negato: ${ref}`);
    return resolveHome(ref);
  };
  // An app hands another one only files it may use itself
  const handed = data => {
    if (data && typeof data === 'object' && 'file' in data && !handles.has(data.file)) fail('Si può passare solo un file aperto con l’app');
    return data;
  };
  return {
    'window.setTitle': text => (win ? win.setTitle(String(text).slice(0, 100)) : fail('Solo una finestra ha un titolo')),
    'ui.toast': text => toast(String(text).slice(0, 200)),
    'clipboard.write': text => navigator.clipboard.writeText(String(text).slice(0, MAX_TEXT)),
    'files.read': async ref => {
      const node = target(ref, false) ?? fail('Il file non esiste');
      if (node.type !== 'file') fail('Non è un file');
      return fs.read(node.id);
    },
    'files.write': async (ref, text) => {
      if (String(text).length > MAX_TEXT) fail('Testo troppo lungo');
      let node = target(ref, true);
      if (!node) {
        const [dir, name] = splitPath(ref);
        const parent = resolveHome(dir) ?? fail('La cartella non esiste');
        node = fs.create(parent.id, { type: 'file', name });
      }
      if (node.type !== 'file') fail('Non è un file');
      await fs.write(node.id, String(text));
    },
    'files.list': path => {
      if (!coversPath(perms, path, { write: false })) fail(`Permesso negato: ${path}`);
      const node = resolveHome(path) ?? fail('La cartella non esiste');
      return fs.children(node.id).map(n => ({ name: n.name, type: n.type, size: n.size ?? 0, modified: n.modified }));
    },
    'files.mkdir': path => {
      if (!coversPath(perms, path, { write: true })) fail(`Permesso negato: ${path}`);
      if (resolveHome(path)) return;
      const [dir, name] = splitPath(path);
      fs.create((resolveHome(dir) ?? fail('La cartella non esiste')).id, { type: 'folder', name });
    },
    'storage.get': key => (STORAGE_KEY.test(key) ? storage.get(`app:${pkg.id}:${key}`, null) : fail('Chiave non valida')),
    'storage.set': (key, value) => {
      if (!STORAGE_KEY.test(key)) fail('Chiave non valida');
      if ((JSON.stringify(value) ?? '').length > 256 << 10) fail('Valore troppo grande');
      storage.set(`app:${pkg.id}:${key}`, value);
    },
    'app.call': (entry, data) => callEntrypoint(pkg.id, entry, handed(data), { from: pkg.id }),
    'app.connect': entry => connectEntrypoint(pkg.id, entry),
    'app.keepAlive': on => (instance ? instance.setKeepAlive(on === true) : fail('Solo un punto d’ingresso in background resta attivo')),
    'app.failed': message => {
      console.error(`[lilos] ${pkg.id}:`, message);
      toast(`${pkg.manifest.name} non è partita: ${String(message).slice(0, 200)}`, { timeout: 6000 });
      instance?.stop();
    },
    'apps.call': (app, entry, data) => {
      if (!perms.includes(`apps.call:${app}`)) fail(`Permesso negato: apps.call:${app}`);
      return callEntrypoint(app, entry, handed(data), { from: pkg.id });
    },
  };
}

/** Runs one request of the app. */
export function invoke(methods, method, params) {
  const run = typeof method === 'string' && Object.hasOwn(methods, method) ? methods[method] : null;
  if (!run) fail(`Funzione sconosciuta: ${method}`);
  return run(...(Array.isArray(params) ? params : []));
}

/** What to transfer with a result (a channel opened by app.connect). */
export const transferOf = result => (result instanceof MessagePort ? [result] : []);
