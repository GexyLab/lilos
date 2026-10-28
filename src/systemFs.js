import { fs, storage } from '@lilos/sdk';
import { seedItems } from './desktop/seed.js';

const WELCOME = `Benvenuto in lilOS!

Questa è una scrivania infinita: tieni premuto Spazio e trascina per spostarti,
usa la rotella per lo zoom, trascina sullo sfondo per selezionare.

- Doppio clic su una cartella: si apre nell'app File.
- Doppio clic su un file di testo: si apre nell'Editor (come questo).
- Ctrl K apre il menu di avvio, Ctrl S salva nell'Editor.

Le scorciatoie e le app che aprono i file si cambiano in
Impostazioni → Usabilità.
`;

/** System folders under the root, in sidebar order. They cannot be renamed or removed. */
export const SYSTEM_FOLDERS = [
  { name: 'Scrivania', icon: 'monitor' },
  { name: 'Documenti', icon: 'file' },
  { name: 'Immagini', icon: 'image' },
  { name: 'Download', icon: 'download' },
];

/**
 * Makes sure the system folders exist and, on first start, fills the desk: with the items of
 * the old flat desktop ('lilos:desktop', before the file system existed) or with the seed.
 * Returns the id of the desk folder.
 */
export function setupFileSystem() {
  const firstStart = !fs.loaded;
  for (const { name } of SYSTEM_FOLDERS) {
    const found = fs.children(fs.root).find(n => n.name === name);
    if (!found) fs.create(fs.root, { type: 'folder', name, system: true });
  }
  const desk = fs.children(fs.root).find(n => n.name === 'Scrivania');
  if (firstStart) fillDesk(desk.id);
  return desk.id;
}

function fillDesk(deskId) {
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
  storage.set('desktop-layout', layout);
}
