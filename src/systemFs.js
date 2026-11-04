import { fs, net, storage, locale } from '@lilos/sdk';
import { seedItems } from './desktop/seed.js';

// The text of the welcome file the seed puts on the first desk (written in the system's language then)
const { t } = locale.define('lilos:systemFs', {
  en: { strings: {
    welcome: `Welcome to lilOS!

This is an endless desk: hold Space and drag to move around,
use the wheel to zoom, drag on the background to select.

- Double-click a folder: it opens in the File Manager.
- Double-click a text file: it opens in the Editor (like this one).
- Ctrl K opens the start menu, Ctrl S saves in the Editor.
- The button next to the logo changes workspace: each one has its own desk,
  its own windows and its own apps. Documenti, Immagini and Download belong to everyone.

Shortcuts and the apps that open files can be changed in
Control Panel → Usability.
`,
  } },
});

/** Name of every workspace's desk folder (private: each workspace sees only its own). */
export const DESK_NAME = 'Scrivania';
/**
 * Name of the folder of what lilOS keeps for itself (the copy of the wallpaper: desktop/wallpaper.js).
 * Hidden (fs.setHiddenNodes): not in the root's lists nor in the sidebar, found only by its path.
 */
export const SYSTEM_NAME = 'Sistema';

/**
 * System folders under the root, in sidebar order. They cannot be renamed or removed.
 * Scrivania is the desk of the current workspace (see workspaces/setup.js); the others are shared.
 */
export const SYSTEM_FOLDERS = [
  { name: DESK_NAME, icon: 'monitor' },
  { name: 'Documenti', icon: 'file' },
  { name: 'Immagini', icon: 'image' },
  { name: 'Download', icon: 'download' },
];

/** Name of the folder with the network connections (made when the kernel has a protocol: net.available). */
export const NETWORK_NAME = 'Rete';

/** Id of a shared folder in the root (Documenti, Sistema…, hidden included), null if there is none. */
export function sharedFolder(name) {
  if (name === NETWORK_NAME) return networkFolder();
  const node = fs.resolve(`/${name}`);
  return node?.type === 'folder' && node.parent === fs.root && !node.private ? node.id : null;
}

/** The system folder Rete ('Rete 2' if the user had a folder of their own called Rete), or null. */
function networkFolder() {
  return fs.children(fs.root).find(n => n.type === 'folder' && n.system && /^Rete( \d+)?$/.test(n.name))?.id ?? null;
}

/**
 * Makes sure the shared system folders exist, Sistema included, and hides Sistema. Call before any
 * workspace is set (everything visible). Returns { firstStart }: true when nothing was stored yet.
 */
export function setupFileSystem() {
  const firstStart = !fs.loaded;
  for (const name of [...SYSTEM_FOLDERS.map(f => f.name), SYSTEM_NAME]) {
    if (name === DESK_NAME) continue;
    if (!sharedFolder(name)) fs.create(fs.root, { type: 'folder', name, system: true });
  }
  if (net.available && !networkFolder()) fs.create(fs.root, { type: 'folder', name: NETWORK_NAME, system: true });
  fs.setHiddenNodes([sharedFolder(SYSTEM_NAME)]);
  return { firstStart };
}

/**
 * First start: fills a desk with the items of the old flat desktop ('lilos:desktop', before the
 * file system existed) or with the seed, and writes their positions under `layoutKey`.
 */
export function fillDesk(deskId, layoutKey) {
  const legacy = storage.get('desktop');
  const layout = {};
  if (Array.isArray(legacy)) {
    for (const item of legacy) {
      try {
        const node = fs.create(deskId, { type: item.type, name: item.name, color: item.color, app: item.app });
        if (Number.isFinite(item.x) && Number.isFinite(item.y)) layout[node.id] = [item.x, item.y];
      } catch {
        /* malformed legacy item: skipped */
      }
    }
    storage.remove('desktop');
  } else {
    for (const { welcome, ...item } of seedItems()) {
      const node = fs.create(deskId, item);
      if (welcome) fs.write(node.id, t('welcome'));
    }
  }
  storage.set(layoutKey, layout);
}
