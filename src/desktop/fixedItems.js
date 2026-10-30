import { fs, toast } from '@lilos/sdk';
import { launch } from '../apps/registry.js';
import { removeNodes } from '../items/fsHistory.js';
import { dropZone, markItem } from '../items/itemDrag.js';
import { DESK_NAME } from '../systemFs.js';

const PREFIX = 'fixed:';

/**
 * Items always on every desk, in this order (listed in Sistema → Scrivania → Elementi). They are
 * not files: they point at a place (Home, a shared system folder, the trash) or an app, cannot be
 * renamed or deleted, and keep their position in the desk's layout like any other item
 * (under 'fixed:<key>'). Some fields are for Sistema, which reads this list.
 *   key          stable id
 *   name         label on the desk
 *   kind         'home' | 'folder' (a system folder, by name) | 'app' | 'trash'
 *   glyph        SDK icon for the list in Sistema (and the badge on folders)
 *   description  what it opens
 */
export const FIXED_ITEMS = Object.freeze([
  { key: 'home', name: 'Home', kind: 'home', glyph: 'home', description: 'La cartella principale, con tutte le altre' },
  { key: 'documents', name: 'Documenti', kind: 'folder', glyph: 'file', description: 'La cartella Documenti, condivisa da tutti i workspace' },
  { key: 'images', name: 'Immagini', kind: 'folder', glyph: 'image', description: 'La cartella Immagini, condivisa da tutti i workspace' },
  { key: 'files', name: 'File Manager', kind: 'app', app: 'files', glyph: 'folder', description: 'Apre il File Manager' },
  { key: 'downloads', name: 'Download', kind: 'folder', glyph: 'download', description: 'La cartella Download, condivisa da tutti i workspace' },
  { key: 'trash', name: 'Cestino', kind: 'trash', glyph: 'trash', description: 'Apre il cestino; ci si possono trascinare file e cartelle' },
].map(Object.freeze));

/** Desk item id of a fixed item, and back (null for any other id). */
export const fixedId = key => PREFIX + key;
export const fixedOf = id => (typeof id === 'string' && id.startsWith(PREFIX) ? FIXED_ITEMS.find(f => PREFIX + f.key === id) ?? null : null);

/** Position of a fixed item in the list (for "Riordina icone"). */
export const fixedRank = id => FIXED_ITEMS.indexOf(fixedOf(id));

/** The folder a fixed item opens (Home, Documenti…), or null (app, trash, folder not found). */
export function fixedFolder(item) {
  if (item.kind === 'home') return fs.root;
  if (item.kind !== 'folder') return null;
  return fs.children(fs.root).find(n => n.type === 'folder' && n.system && !n.private && n.name === item.name && n.name !== DESK_NAME)?.id ?? null;
}

export function openFixed(item) {
  if (item.kind === 'app') return launch(item.app);
  if (item.kind === 'trash') return launch('files', { trash: true });
  const folder = fixedFolder(item);
  if (folder) launch('files', { folder });
  else toast(`La cartella ${item.name} non c’è più`);
}

/**
 * Desk item data for DesktopItem: { id, type, name, fixed, … }. The type gives the icon (see
 * itemIcon: a folder with the place's glyph, the app's icon, the trash full or empty).
 */
export function fixedData(item) {
  const base = { id: fixedId(item.key), name: item.name, fixed: item.key };
  if (item.kind === 'app') return { ...base, type: 'app', app: item.app };
  if (item.kind === 'trash') return { ...base, type: 'trash', full: fs.trashed().length > 0 };
  return { ...base, type: 'folder', glyph: item.glyph };
}

/**
 * Makes a fixed item's element accept drops: folders like any folder on the desk (the items move
 * into them), the trash takes files and folders into the trash.
 */
export function acceptDrops(el, item) {
  if (item.kind === 'home' || item.kind === 'folder') {
    const folder = fixedFolder(item);
    if (folder) markItem(el, { id: folder });
  } else if (item.kind === 'trash') {
    const deletable = ids => ids.filter(id => fs.exists(id) && !fs.get(id).system);
    dropZone(el, {
      accepts: ids => deletable(ids).length > 0,
      drop: async (ids, ev, stack) => {
        const n = deletable(ids).length;
        await removeNodes(stack, ids);
        toast(n === 1 ? 'Spostato nel cestino' : `${n} elementi spostati nel cestino`);
      },
    });
  }
}
