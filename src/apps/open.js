import { fs, splitName, storage, fileTypeList } from '@lilos/sdk';
import { apps, launch } from './registry.js';

/**
 * Which app opens which file, by extension ('' = no extension).
 * Defaults come from the registry (`opens`); the user overrides them in Settings → Usabilità →
 * Tipi di file ('lilos:file-apps': { ext: appId | 'ask' }). With no app, or 'ask', opening a
 * file shows the "Apri con" window (openWith.js).
 */
const KEY = 'file-apps';
const ASK = 'ask';
const EXT = /^[a-z0-9]{0,10}$/;

let chooser = null;   // (node) => void, set by the system (main.js) to show the "Apri con" window

export const extensionOf = node => splitName(node.name)[1].toLowerCase();

/** Apps that can open files (they declare `opens` and are built). */
export const fileApps = () => apps.filter(app => app.load && Array.isArray(app.opens));

export const defaultAppFor = ext => fileApps().find(app => app.opens.includes(ext)) ?? null;

/** Stored choices; untrusted: only known extensions shapes and installed file apps survive. */
function overrides() {
  const saved = storage.get(KEY, {});
  const valid = {};
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    const ids = new Set(fileApps().map(a => a.id));
    for (const [ext, value] of Object.entries(saved)) {
      if (EXT.test(ext) && (value === ASK || ids.has(value))) valid[ext] = value;
    }
  }
  return valid;
}

/** The app that opens files with this extension, or null (ask). */
export function appFor(ext) {
  const choice = overrides()[ext];
  if (choice === ASK) return null;
  if (choice) return apps.find(a => a.id === choice) ?? null;
  return defaultAppFor(ext);
}

/** true if the user changed the default for this extension. */
export const isCustom = ext => Object.hasOwn(overrides(), ext);

/** appId, 'ask', or null to go back to the default. */
export function setAppFor(ext, value) {
  const all = overrides();
  const fallback = defaultAppFor(ext)?.id ?? ASK;
  if (value == null || value === fallback) delete all[ext];
  else all[ext] = value;
  storage.set(KEY, all);
}

export const resetAppsFor = () => storage.remove(KEY);

/** Extensions worth listing: known types, the ones apps open, the ones chosen, the ones in use. */
export function knownExtensions() {
  const set = new Set(fileTypeList().flatMap(t => t.exts));
  fileApps().forEach(a => a.opens.forEach(e => set.add(e)));
  Object.keys(overrides()).forEach(e => set.add(e));
  const walk = id => fs.children(id).forEach(n => {
    if (n.type === 'folder') walk(n.id);
    else if (n.type === 'file') set.add(extensionOf(n));
  });
  walk(fs.root);
  return [...set].filter(e => EXT.test(e));
}

export function setChooser(fn) {
  chooser = fn;
}

/** Opens a file with its app; without one (or with choose: true) shows the "Apri con" window. */
export function openFile(node, { choose = false } = {}) {
  const app = choose ? null : appFor(extensionOf(node));
  if (app) return launch(app.id, { file: node.id });
  chooser?.(node);
}
