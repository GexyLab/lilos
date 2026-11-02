import { fs, storage, pipes, bus, notifications, net, term, automation } from '@lilos/sdk';
import { coversPath } from './permissions.js';
import { callEntrypoint, connectEntrypoint } from '../entrypoints.js';
import { openFile } from '../open.js';
import { filePreview } from '../filePreview.js';
import { notify } from '../../notifications/notify.js';

/**
 * What an installed app may ask of lilOS through `lilos` (see bridge.js), each request checked
 * against the app's permissions. The same for every way the app runs; an app that is not
 * isolated could go around them, an isolated one cannot.
 */
const MAX_TEXT = 10 << 20;
const MAX_BYTES = 10 << 20;
const STORAGE_KEY = /^[\w.-]{1,64}$/;
const STAGES = ['before', 'after'];
const MAX_EVENTS = 20;   // events an app defines
const POSITIONS = ['first', 'middle', 'last'];

/** '~/Documenti/a.txt' → the node, if visible from the current workspace. */
const resolveHome = path => (typeof path === 'string' && /^~(\/[^/]+)*$/.test(path) ? fs.resolve(path) : null);
const splitPath = path => [path.slice(0, path.lastIndexOf('/')) || '~', path.slice(path.lastIndexOf('/') + 1)];
const fail = msg => { throw new Error(msg); };

/** The contents an app writes: text, or bytes (a Blob, an ArrayBuffer, a typed array). */
function content(data) {
  if (data instanceof Blob) return data.size <= MAX_BYTES ? data : fail('File troppo grande');
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return data.byteLength <= MAX_BYTES ? new Blob([data]) : fail('File troppo grande');
  const text = String(data);
  return text.length <= MAX_TEXT ? text : fail('Testo troppo lungo');
}

/**
 * ctx: { pkg, win?, handles, readOnly?, instance?, pipe? }
 *   win        the app's window (null in the background)
 *   handles    ids of the files the app was opened with or handed: it may read and write them
 *   readOnly   ids of the files handed to it only to read, while a call lasts (a preview, see
 *              filePreview.js): anything with has(id)
 *   instance   the background entry point (background.js), for keepAlive
 *   pipe       its place in the pipes (pipes.js pipeTarget), for lilos.pipes
 */
export function hostMethods({ pkg, win = null, handles, readOnly = new Set(), instance = null, pipe = null }) {
  const perms = pkg.manifest.permissions ?? [];
  // The channels of remote terminals this window holds: they close with it (the sessions go on)
  const channels = new Set();
  win?.on('destroy', () => channels.forEach(port => port.detach()));
  const terminal = () => (perms.includes('term') ? term : fail('Permesso negato: term'));
  const target = (ref, write) => {
    if (handles.has(ref)) return fs.get(ref) ?? fail('Il file non esiste più');
    if (readOnly.has(ref)) return write ? fail('Il file è stato passato solo da leggere') : fs.get(ref) ?? fail('Il file non esiste più');
    if (!coversPath(perms, ref, { write })) fail(`Permesso negato: ${ref}`);
    return resolveHome(ref);
  };
  const fileOf = (ref, write) => {
    const node = target(ref, write) ?? fail('Il file non esiste');
    return node.type === 'file' ? node : fail('Non è un file');
  };
  // Who asks, for the handlers of the pipes: its own handlers are skipped
  const caller = node => ({ app: pkg.id, opened: handles.has(node.id) || readOnly.has(node.id), ...(pkg.system && { system: true }) });
  const ownEvent = name => {
    const def = typeof name === 'string' ? pipes.describe(name) : null;
    return def?.owner === pkg.id ? name : fail(`L’evento ${String(name).slice(0, 60)} non è di ${pkg.manifest.name}`);
  };
  // An app hands another one (or another part of itself) only files it may use itself
  const handed = data => {
    if (!data || typeof data !== 'object') return data;
    const ids = [...('file' in data ? [data.file] : []), ...('files' in data ? (Array.isArray(data.files) ? data.files : [null]) : [])];
    if (ids.length > 100 || ids.some(id => typeof id !== 'string' || !handles.has(id))) fail('Si possono passare solo file aperti con l’app');
    return data;
  };
  // content: true says lilOS must not read the file without the app: only for an app that reads
  // and writes its contents through the pipes (it would lock the user out of their files otherwise)
  const ownsContent = ['file.read', 'file.write'].every(e => perms.includes(`pipe:${e}`) || perms.includes(`pipe.own:${e}`));
  const claim = value => {
    if (value && typeof value === 'object' && value.content === true && !ownsContent) fail('Permesso negato: solo un’app con le pipe file.read e file.write segna un contenuto come suo');
    return value;
  };
  return {
    'window.setTitle': text => (win ? win.setTitle(String(text).slice(0, 100)) : fail('Solo una finestra ha un titolo')),
    // As the close button: the window manager closes it
    'window.close': () => (win ? win.emit('close') : fail('Solo una finestra si chiude')),
    // A notification (permission ui.notify, which every app has): lilOS signs it with the app, never the app itself.
    // ui.toast is its old name: there is no message at the bottom of the screen any more
    'ui.toast': async text => { await notifications.send({ app: pkg.id, text: String(text) }); },
    'ui.notify': async value => {
      const n = value !== null && typeof value === 'object' ? value : { text: String(value ?? '') };
      await notifications.send({ app: pkg.id, text: n.text, level: n.level, action: n.action ?? null });
    },
    'clipboard.write': text => navigator.clipboard.writeText(String(text).slice(0, MAX_TEXT)),
    'files.read': async (ref, options) => {
      const node = fileOf(ref, false);
      return options?.bytes === true ? fs.readBlob(node.id, { caller: caller(node) }) : fs.read(node.id, { caller: caller(node) });
    },
    // options.mark: the app's own data on the file, saved with the content (null takes it away)
    'files.write': async (ref, data, options) => {
      const value = content(data);
      let node = target(ref, true);
      if (!node) {
        const [dir, name] = splitPath(ref);
        const parent = resolveHome(dir) ?? fail('La cartella non esiste');
        node = fs.create(parent.id, { type: 'file', name });
      }
      if (node.type !== 'file') fail('Non è un file');
      const mark = options && typeof options === 'object' && 'mark' in options ? { app: pkg.id, value: claim(options.mark ?? null) } : null;
      await fs.write(node.id, value, { caller: caller(node), mark });
    },
    // A file the app may use: its name and the app's own data on it
    'files.info': ref => {
      const node = target(ref, false) ?? fail('Il file non esiste');
      return { id: node.id, name: node.name, type: node.type, size: node.size ?? 0, modified: node.modified, path: fs.path(node.id), meta: fs.appMeta(node.id, pkg.id) };
    },
    'files.setMeta': (ref, value) => {
      const node = target(ref, true) ?? fail('Il file non esiste');
      fs.setAppMeta(node.id, pkg.id, claim(value ?? null));
    },
    // Opens one of its files with its app (the file.open pipe again: after unlocking it, for one)
    'files.open': ref => {
      if (!handles.has(ref)) fail('Si apre solo un file aperto con l’app o che le è stato passato');
      openFile(fs.get(ref) ?? fail('Il file non esiste più'));
    },
    // Files the app has locked again: lilOS closes the windows that show them
    'files.locked': ids => {
      const list = (Array.isArray(ids) ? ids : []).filter(id => handles.has(id) && fs.appMeta(id, pkg.id));
      if (list.length) bus.emit('files:locked', list);
      return list.length;
    },
    // Which of its files are shown in a window now (they are in use: not locked for inactivity)
    'files.shown': ids => {
      const list = (Array.isArray(ids) ? ids : []).filter(id => handles.has(id));
      const shown = [];
      bus.emit('files:shown', { ids: list, answer: id => shown.push(id) });
      return [...new Set(shown)];
    },
    'pipes.subscribe': (event, opts) => {
      if (!pipe) fail('Questa parte dell’app non si iscrive alle pipe');
      const o = opts && typeof opts === 'object' ? opts : {};
      if (o.stage !== undefined && !STAGES.includes(o.stage)) fail('stage deve essere "before" o "after"');
      if (o.position !== undefined && !POSITIONS.includes(o.position)) fail('position non valida');
      return pipe.subscribe(String(event), { stage: o.stage ?? 'after', position: o.position ?? 'middle', where: o.where ?? null });
    },
    'pipes.unsubscribe': sub => pipe?.unsubscribe(String(sub)),
    // Its own events ('<app id>.<name>'): defined, then run (the result after every handler)
    'pipes.define': (name, def) => {
      const d = def && typeof def === 'object' ? def : {};
      const fields = v => (Array.isArray(v) ? v.filter(f => typeof f === 'string' && /^(?!__proto__$|constructor$|prototype$)\w{1,40}$/.test(f)).slice(0, 20) : []);
      if (!pipes.has(String(name)) && pipes.catalog().filter(e => e.owner === pkg.id).length >= MAX_EVENTS) fail(`Al massimo ${MAX_EVENTS} eventi per app`);
      pipes.define(String(name), {
        label: typeof d.label === 'string' ? d.label : String(name), description: typeof d.description === 'string' ? d.description : '',
        edit: { before: fields(d.edit?.before), after: fields(d.edit?.after) }, stop: d.stop === true, owner: pkg.id,
      });
    },
    'pipes.run': (name, data) => pipes.run(ownEvent(name), data && typeof data === 'object' ? data : { value: data ?? null }, { caller: { app: pkg.id } }),
    // What the user did, for an automation being recorded (an action of its manifest); the files it
    // names must be ones it was given, and what it made one it may write
    'automation.recording': () => automation.recording && !automation.paused,
    'automation.record': (id, data) => {
      const def = typeof id === 'string' && id.startsWith(`${pkg.id}.`) ? automation.describe(id) : null;
      if (!def || def.app !== pkg.id) fail(`L’azione ${String(id).slice(0, 60)} non è di ${pkg.manifest.name}`);
      const d = plainObject(data);
      const params = plainObject(d.params);
      for (const [name, p] of Object.entries(def.params)) {
        if (!['file', 'files', 'folder'].includes(p.type) || !(name in params)) continue;
        if ([params[name]].flat().some(ref => typeof ref !== 'string' || !handles.has(ref))) fail('Si possono nominare solo file aperti con l’app');
      }
      if (d.file != null && !handles.has(d.file)) fail('Si possono nominare solo file aperti con l’app');
      const made = [d.result ?? []].flat().filter(ref => typeof ref === 'string' && (handles.has(ref) || coversPath(perms, homeRef(ref), { write: true })));
      return automation.record(id, { params, defaults: d.defaults ?? null, file: d.file ?? null, result: made.length ? made : null }) !== null;
    },
    // The preview of a file it may read, made by the app that opens it (see filePreview.js)
    'files.preview': (ref, options) => {
      if (!perms.includes('fs.preview')) fail('Permesso negato: fs.preview');
      const size = typeof options?.size === 'number' ? Math.min(options.size, 4096) : undefined;
      return filePreview(fileOf(ref, false), { size, from: pkg.id });
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
    'term.load': () => terminal().load(),
    'term.saveHost': (id, config, secret) => terminal().saveHost(id === null ? null : String(id), plainObject(config), plainObject(secret)),
    'term.removeHost': id => terminal().removeHost(String(id)),
    'term.open': spec => {
      const { host, protocol, values, secret, sealed, settings, name, cwd } = plainObject(spec);
      const at = typeof cwd === 'string' ? { cwd } : {};
      return terminal().open(typeof host === 'string' ? { host, ...at }
        : { protocol, values, settings, ...(secret && { secret: plainObject(secret) }), ...(typeof sealed === 'string' && { sealed }), ...(typeof name === 'string' && { name }), ...at });
    },
    'term.seal': spec => {
      const { host, protocol, values, secret } = plainObject(spec);
      return terminal().seal(typeof host === 'string' ? { host } : { protocol, values, secret: plainObject(secret) });
    },
    // SSH to the server of the SFTP connection a handed file or folder is in, in that folder
    'term.openHere': id => {
      terminal();
      if (!handles.has(id)) fail('Si possono usare solo file aperti con l’app');
      const node = fs.get(id) ?? fail('Il file non esiste più');
      const folder = node.type === 'folder' ? node.id : node.parent;
      const ref = fs.isRemote(folder) ? fs.netRef(folder) : fail('Non è in una connessione di rete');
      if (net.mount(ref.mount)?.protocol !== 'sftp') fail('Il terminale si apre solo sulle connessioni SFTP');
      return term.open({ mount: ref.mount, path: ref.path });
    },
    'term.close': id => terminal().close(String(id)),
    'term.attach': (id, size) => {
      terminal();
      if (!win) fail('Solo una finestra mostra un terminale');
      const port = term.attach(String(id), plainObject(size));
      channels.add(port);
      return port;
    },
    'app.call': (entry, data) => callEntrypoint(pkg.id, entry, handed(data), { from: pkg.id }),
    'app.connect': entry => connectEntrypoint(pkg.id, entry),
    'app.keepAlive': on => (instance ? instance.setKeepAlive(on === true) : fail('Solo un punto d’ingresso in background resta attivo')),
    'app.failed': message => {
      console.error(`[lilos] ${pkg.id}:`, message);
      notify(`${pkg.manifest.name} non è partita: ${String(message).slice(0, 200)}`, { level: 'error' });
      instance?.stop();
    },
    'apps.call': (app, entry, data) => {
      if (!perms.includes(`apps.call:${app}`)) fail(`Permesso negato: apps.call:${app}`);
      return callEntrypoint(app, entry, handed(data), { from: pkg.id });
    },
  };
}

const plainObject = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** '~/Documenti/a.zip' for a node of the user's home ('' if it is not there). */
function homeRef(id) {
  if (!fs.exists(id)) return '';
  const path = fs.path(id);
  const home = fs.path(fs.root);
  return path === home ? '~' : path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : '';
}

/** Runs one request of the app. */
export function invoke(methods, method, params) {
  const run = typeof method === 'string' && Object.hasOwn(methods, method) ? methods[method] : null;
  if (!run) fail(`Funzione sconosciuta: ${method}`);
  return run(...(Array.isArray(params) ? params : []));
}

/** What to transfer with a result (a channel opened by app.connect). */
export const transferOf = result => (result instanceof MessagePort ? [result] : []);
