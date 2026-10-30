import { bus, Emitter, fs, kernel, settings, storage, toast } from '@lilos/sdk';
import { getApp, isInstalled, launch, registry } from './registry.js';
import { entrypointsOf } from './entrypoints.js';

/**
 * What starts by itself (Sistema → Avvio). Two events of the bus mark the moments (system.js):
 *   'system:ready'  lilOS is up
 *   'user:login'    right after, the user is in: their apps open
 *
 * Apps are saved per user under 'startup-apps', in the order they open, each with the window
 * entry points chosen and their params:
 *   [{ app: 'files', entries: [{ entry: 'main', params: { folder: '<node id>' } }] }]
 * They open in the workspace that is current, only in the user's first tab in this browser
 * (Web Locks: the others open clean), unless the setting `startupApps` is off or the address
 * has ?avvio=no. An app hidden in that workspace, or gone, is skipped.
 *
 * Params become the args of the window. When the entry point declares them (manifest `params`,
 * see the kernel's manifest.js) each is checked against its type, and missing ones take their
 * default; a file is handed to the app (it may read and write it), a folder arrives as its id to
 * lilOS's own apps and as its path ('~/Documenti') to installed ones. When it declares none,
 * params are any JSON object of at most 4 KB, passed as they are.
 */
const KEY = 'startup-apps';
const MAX_APPS = 50;
const MAX_JSON = 4096;
const ENTRY = /^[a-z][a-zA-Z0-9]{0,30}$/;

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
/** ?avvio=no: this time nothing starts by itself (a way out when something at start-up goes wrong). */
const skipped = new URLSearchParams(location.search).get('avvio') === 'no';

/** The saved list, checked (it is untrusted). */
function read() {
  const raw = storage.get(KEY, []);
  const list = [];
  for (const a of Array.isArray(raw) ? raw.slice(0, MAX_APPS) : []) {
    if (!plain(a) || typeof a.app !== 'string' || list.some(x => x.app === a.app)) continue;
    const entries = [];
    for (const e of Array.isArray(a.entries) ? a.entries.slice(0, 20) : []) {
      if (!plain(e) || !ENTRY.test(e.entry ?? '') || entries.some(x => x.entry === e.entry)) continue;
      entries.push({ entry: e.entry, params: plain(e.params) ? e.params : {} });
    }
    if (entries.length) list.push({ app: a.app, entries });
  }
  return list;
}

/** Window entry points of an app: [{ entry, label, params: { name: param } | null }], main first. */
function windowEntries(appId) {
  const app = getApp(appId);
  if (!app) return [];
  return Object.entries(entrypointsOf(app))
    .filter(([, ep]) => ep?.kind === 'window')
    .map(([entry, ep]) => ({
      entry,
      label: entry === 'main' ? 'Finestra principale' : ep.label ?? entry,
      params: plain(ep.params) && Object.keys(ep.params).length ? ep.params : null,
    }));
}

/** The params as they are saved: checked against `schema` (or any small JSON object without one). Throws a readable message. */
function checkParams(schema, values) {
  const given = values ?? {};
  if (!plain(given)) throw new Error('I parametri devono essere un oggetto JSON, tra { }');
  if (!schema) {
    const text = JSON.stringify(given);
    if (text.length > MAX_JSON) throw new Error('Parametri troppo lunghi (al massimo 4 KB)');
    return JSON.parse(text);
  }
  const out = {};
  for (const [name, p] of Object.entries(schema)) {
    const v = given[name];
    if (!Object.hasOwn(given, name) || v === '' || v == null) continue;
    const ok = {
      text: () => typeof v === 'string' && v.length <= (p.maxLength ?? 2000),
      number: () => typeof v === 'number' && Number.isFinite(v) && !(p.min > v) && !(p.max < v),
      boolean: () => typeof v === 'boolean',
      choice: () => (p.options ?? []).some(o => o.value === v),
      file: () => typeof v === 'string' && v.length <= 100,
      folder: () => typeof v === 'string' && v.length <= 100,
    }[p.type];
    if (!ok) continue;
    if (!ok()) throw new Error(`${p.label}: valore non valido`);
    out[name] = v;
  }
  return out;
}

const homePath = id => `~${fs.path(id).slice(fs.home.length)}`;

/** The args and the handed files of one entry point, from its saved params. Throws when a file or folder is gone. */
function argsFor(app, schema, params) {
  if (!schema) return { args: Object.keys(params).length ? params : undefined, files: [] };
  const args = {}, files = [];
  for (const [name, p] of Object.entries(schema)) {
    const v = Object.hasOwn(params, name) ? params[name] : p.default;
    if (v === undefined) continue;
    if (p.type === 'file' || p.type === 'folder') {
      const node = fs.get(v);
      if (node?.type !== p.type) throw new Error(`${p.label}: ${p.type === 'file' ? 'il file non c’è più' : 'la cartella non c’è più'}`);
      if (p.type === 'file') files.push(node.id);
      args[name] = p.type === 'folder' && !app.trusted ? homePath(node.id) : node.id;
    } else {
      args[name] = v;
    }
  }
  return { args: Object.keys(args).length ? args : undefined, files };
}

function openApps() {
  for (const { app: id, entries } of read()) {
    const app = getApp(id);
    if (!app?.load || !isInstalled(id)) continue;
    const windows = windowEntries(id);
    for (const { entry, params } of entries) {
      const ep = windows.find(w => w.entry === entry);
      if (!ep) continue;
      try {
        const { args, files } = argsFor(app, ep.params, params);
        launch(id, args, entry, { files });
      } catch (err) {
        toast(`${app.name} non si è aperta da sola. ${err.message}`, { timeout: 7000 });
      }
    }
  }
}

/** Runs `fn` only in the user's first tab of lilOS in this browser; the lock stays with it while it is open. */
function inFirstTab(fn) {
  if (!navigator.locks) return fn();
  const user = kernel.data?.user?.id ?? 'local';
  navigator.locks.request(`lilos:avvio:${user}`, { ifAvailable: true }, lock => {
    if (!lock) return null;
    fn();
    return new Promise(() => {});
  }).catch(err => console.error('[lilos] avvio:', err));
}

class Startup extends Emitter {
  /** True when the address has ?avvio=no. */
  get skipped() {
    return skipped;
  }

  /** The apps that open when the user comes in, in order: [{ app, entries: [{ entry, params }] }]. */
  apps() {
    return read();
  }

  windowEntries(appId) {
    return windowEntries(appId);
  }

  checkParams(schema, values) {
    return checkParams(schema, values);
  }

  /** Adds an app at the end of the list, with its main window. */
  addApp(appId) {
    if (!windowEntries(appId).length) throw new Error('App non installata');
    const list = read();
    if (list.some(a => a.app === appId)) return;
    if (list.length >= MAX_APPS) throw new Error(`Al massimo ${MAX_APPS} app all’avvio`);
    list.push({ app: appId, entries: [{ entry: 'main', params: {} }] });
    this.#write(list);
  }

  removeApp(appId) {
    const list = read();
    if (list.some(a => a.app === appId)) this.#write(list.filter(a => a.app !== appId));
  }

  /** Turns one window entry point on or off; the app leaves the list when none is left. */
  setEntry(appId, entry, on) {
    const list = read();
    let item = list.find(a => a.app === appId);
    if (on) {
      const order = windowEntries(appId).map(w => w.entry);
      if (!order.includes(entry)) throw new Error('Punto d’ingresso sconosciuto');
      if (!item) {
        if (list.length >= MAX_APPS) throw new Error(`Al massimo ${MAX_APPS} app all’avvio`);
        list.push(item = { app: appId, entries: [] });
      }
      if (item.entries.some(e => e.entry === entry)) return;
      item.entries.push({ entry, params: {} });
      item.entries.sort((a, b) => order.indexOf(a.entry) - order.indexOf(b.entry));
    } else {
      if (!item?.entries.some(e => e.entry === entry)) return;
      item.entries = item.entries.filter(e => e.entry !== entry);
      if (!item.entries.length) list.splice(list.indexOf(item), 1);
    }
    this.#write(list);
  }

  /** Saves the params of an enabled entry point; throws (nothing saved) when they are not valid. */
  setParams(appId, entry, params) {
    const list = read();
    const target = list.find(a => a.app === appId)?.entries.find(e => e.entry === entry);
    if (!target) throw new Error('Il punto d’ingresso non è all’avvio');
    const ep = windowEntries(appId).find(w => w.entry === entry);
    target.params = checkParams(ep?.params ?? null, params);
    this.#write(list);
  }

  #write(list) {
    storage.set(KEY, list);
    this.emit('change');
  }
}

/** Events: 'change' — the list of apps changed. */
export const startup = new Startup();

/** Opens the user's apps on 'user:login'; forgets an app when it is removed. */
export function connectStartup() {
  bus.on('user:login', () => inFirstTab(() => {
    if (skipped) toast('Avvio senza app: l’indirizzo contiene ?avvio=no', { timeout: 5000 });
    else if (settings.get('startupApps')) openApps();
  }));
  registry.on('change', ({ id, app }) => { if (!app) startup.removeApp(id); });
}
