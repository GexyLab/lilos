import { fs, settings, locale } from '@lilos/sdk';
import { launch } from '../apps/registry.js';
import { removeNodes } from '../items/fsHistory.js';
import { dropZone, markItem } from '../items/itemDrag.js';
import { DESK_NAME } from '../systemFs.js';
import { workspaceManager } from '../workspaces/info.js';
import { notify } from '../notifications/notify.js';

const PREFIX = 'fixed:';

const { t } = locale.define('lilos:deskFixed', {
  en: { strings: {
    'home.description': 'The main folder, with all the others',
    'folder.description': 'The {name} folder, shared by all workspaces',
    'files.description': 'Opens the File Manager',
    trash: 'Trash', 'trash.description': 'Opens the trash; files and folders can be dragged onto it',
    noDesk: 'The desktop is not there',
    folderGone: 'The {name} folder is no longer there',
    trashedOne: 'Moved to the trash', trashedMany: { one: '{n} item moved to the trash', other: '{n} items moved to the trash' },
  } },
});

/**
 * Items on the desks, in this order (listed in Control Panel → Workspace, where each one is turned on
 * or off for one workspace or for all of them). Each workspace keeps the keys turned off on its
 * desk (its `hidden`); the 'deskHidden' setting holds those of "all", for the workspaces that never
 * chose (new ones, or saved before this). They are not files: they point at a place (Home, a
 * shared system folder, the trash) or an app, cannot be renamed or deleted, and keep their
 * position in the desk's layout like any other item (under 'fixed:<key>'), also while turned
 * off. Some fields are for Control Panel, which reads this list.
 *   key          stable id
 *   name         label on the desk (a system folder's: its name on disk)
 *   kind         'home' | 'folder' (a system folder, by name) | 'app' | 'trash'
 *   glyph        SDK icon for the list in Control Panel (and the badge on folders)
 *   description  what it opens
 * name (the trash) and description are in the system's language: getters, read them when drawing.
 */
export const FIXED_ITEMS = Object.freeze([
  { key: 'home', name: 'Home', kind: 'home', glyph: 'home', get description() { return t('home.description'); } },
  { key: 'documents', name: 'Documenti', kind: 'folder', glyph: 'file', get description() { return t('folder.description', { name: this.name }); } },
  { key: 'images', name: 'Immagini', kind: 'folder', glyph: 'image', get description() { return t('folder.description', { name: this.name }); } },
  { key: 'files', name: 'File Manager', kind: 'app', app: 'files', glyph: 'folder', get description() { return t('files.description'); } },
  { key: 'downloads', name: 'Download', kind: 'folder', glyph: 'download', get description() { return t('folder.description', { name: this.name }); } },
  { key: 'trash', get name() { return t('trash'); }, kind: 'trash', glyph: 'trash', get description() { return t('trash.description'); } },
].map(Object.freeze));

const known = key => FIXED_ITEMS.some(f => f.key === key);
/** Keys of fixed items in a saved list (untrusted). */
const cleanKeys = saved => (Array.isArray(saved) ? [...new Set(saved.filter(known))] : []);
const withKey = (keys, key, shown) => (shown ? keys.filter(k => k !== key) : [...keys.filter(k => k !== key), key]);

/** Keys turned off on a workspace's desk (the current one by default); before workspaces, those of all. */
function hiddenKeys(workspace) {
  const manager = workspaceManager();
  const ws = manager?.get(workspace ?? manager.currentId);
  return cleanKeys(ws?.hidden ?? settings.get('deskHidden'));
}

/** True if the fixed item `key` is on the desk of a workspace (the current one by default). */
export const isFixedShown = (key, workspace) => !hiddenKeys(workspace).includes(key);

/** Puts the fixed item `key` on the desk of a workspace (the current one by default), or takes it off. */
export function setFixedShown(key, shown, workspace) {
  if (!known(key)) return;
  const manager = workspaceManager();
  if (!manager) return settings.set('deskHidden', withKey(hiddenKeys(), key, shown));
  const id = workspace ?? manager.currentId;
  manager.setHiddenFixed({ [id]: withKey(hiddenKeys(id), key, shown) });
}

/** Puts the fixed item `key` on every desk, or takes it off everywhere: new workspaces get the same. */
export function setFixedShownEverywhere(key, shown) {
  if (!known(key)) return;
  const manager = workspaceManager();
  manager?.setHiddenFixed(Object.fromEntries(manager.list().map(w => [w.id, withKey(hiddenKeys(w.id), key, shown)])));
  settings.set('deskHidden', withKey(cleanKeys(settings.get('deskHidden')), key, shown));
}

/** The desk folder of the current workspace, or null. */
const deskFolder = () => fs.children(fs.root).find(n => n.system && n.type === 'folder' && n.name === DESK_NAME)?.id ?? null;
const fixedApp = appId => FIXED_ITEMS.find(f => f.kind === 'app' && f.app === appId);

/** True if an app has an icon on the desk of the current workspace: its own, or the fixed item that opens it. */
export function isAppOnDesk(appId) {
  const fixed = fixedApp(appId);
  if (fixed && isFixedShown(fixed.key)) return true;
  const desk = deskFolder();
  return !!desk && fs.children(desk).some(n => n.type === 'app' && n.app === appId);
}

/**
 * Puts an app's icon back on the desk of the current workspace ("Mostra sul desktop" in the start
 * menu): the fixed item that opens it turned on again, or a new desk item.
 */
export function showAppOnDesk(app) {
  if (isAppOnDesk(app.id)) return;
  const fixed = fixedApp(app.id);
  if (fixed) return setFixedShown(fixed.key, true);
  const desk = deskFolder();
  if (!desk) throw new Error(t('noDesk'));
  fs.create(desk, { type: 'app', name: app.name, app: app.id });
}

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

/** `newWindow` (Ctrl + double click): its folder, or the trash, in a File Manager window of its own. */
export function openFixed(item, { newWindow = false } = {}) {
  if (item.kind === 'app') return launch(item.app);
  if (item.kind === 'trash') return launch('files', { trash: true }, 'main', { newWindow });
  const folder = fixedFolder(item);
  if (folder) launch('files', { folder }, 'main', { newWindow });
  else notify(t('folderGone', { name: item.name }), { level: 'warning' });
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
        notify(n === 1 ? t('trashedOne') : t('trashedMany', { n }), { level: 'success' });
      },
    });
  }
}
