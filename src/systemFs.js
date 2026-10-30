import { fs, storage } from '@lilos/sdk';
import { seedItems } from './desktop/seed.js';

const WELCOME = `Benvenuto in lilOS!

Questa è una scrivania infinita: tieni premuto Spazio e trascina per spostarti,
usa la rotella per lo zoom, trascina sullo sfondo per selezionare.

- Doppio clic su una cartella: si apre nel File Manager.
- Doppio clic su un file di testo: si apre nell'Editor (come questo).
- Ctrl K apre il menu di avvio, Ctrl S salva nell'Editor.
- Il pulsante accanto al logo cambia workspace: ognuno ha la sua scrivania,
  le sue finestre e le sue app. Documenti, Immagini e Download sono di tutti.

Le scorciatoie e le app che aprono i file si cambiano in
Impostazioni → Usabilità.
`;

/** Name of every workspace's desk folder (private: each workspace sees only its own). */
export const DESK_NAME = 'Scrivania';

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

/**
 * Makes sure the shared system folders exist. Call before any workspace is set (everything visible).
 * Returns { firstStart }: true when nothing was stored yet.
 */
export function setupFileSystem() {
  const firstStart = !fs.loaded;
  for (const { name } of SYSTEM_FOLDERS) {
    if (name === DESK_NAME) continue;
    const found = fs.children(fs.root).find(n => n.name === name && !n.private);
    if (!found) fs.create(fs.root, { type: 'folder', name, system: true });
  }
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
    for (const item of seedItems) {
      const node = fs.create(deskId, item);
      if (node.name === 'benvenuto.txt') fs.write(node.id, WELCOME);
    }
  }
  storage.set(layoutKey, layout);
}
