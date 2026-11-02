import { fs, net, splitName } from '@lilos/sdk';
import { installedApps, launch } from './registry.js';
import { callEntrypoint, entrypointsOf } from './entrypoints.js';
import { notify } from '../notifications/notify.js';

/**
 * What installed apps add to the menu of files and folders (manifest contributes.actions, with the
 * permission ui.menus); their signs on icons are in desktop/itemIcons.js. An action starts one of the app's
 * entry points with { files: [ids], action: id }; the app may read and write those files.
 *
 *   { id, label, entry, on: 'file' | 'folder' | 'item', glyph?, when?: { meta?: 'own' | 'none', ext?, notExt? }, many?, menu? }
 *
 * Actions with `menu` go in that submenu of the app (contributes.menus: [{ id, label, glyph? }]),
 * shown only when some of them are for these nodes.
 */
const allowed = app => {
  const pkg = app?.package;
  return !!pkg && (pkg.manifest.permissions ?? []).includes('ui.menus');
};
const listOf = (app, key) => {
  const list = allowed(app) ? app.text?.contributes?.[key] : null;
  return Array.isArray(list) ? list : [];
};

function fits(action, appId, node) {
  if (!node || node.type === 'app') return false;
  if (action.on !== 'item' && node.type !== action.on) return false;
  const marked = !!node.apps && Object.hasOwn(node.apps, appId);
  if (action.when?.meta === 'own' && !marked) return false;
  if (action.when?.meta === 'none' && marked) return false;
  const ext = node.type === 'file' ? splitName(node.name)[1].toLowerCase() : null;
  if (action.when?.ext && !(ext !== null && action.when.ext.includes(ext))) return false;
  if (action.when?.notExt && ext !== null && action.when.notExt.includes(ext)) return false;
  // Only inside a network connection (the Rete folder) of these protocols
  if (action.when?.net && !action.when.net.includes(node.net ? net.mount(node.net)?.protocol : null)) return false;
  return true;
}

/** Runs an app's action on these nodes. */
async function run(app, action, ids) {
  try {
    const kind = entrypointsOf(app)[action.entry]?.kind;
    if (kind === 'window') launch(app.id, { files: ids, action: action.id }, action.entry, { files: ids });
    else await callEntrypoint(app.id, action.entry, { files: ids, action: action.id });
  } catch (err) {
    notify(`${app.name}: ${err.message}`, { level: 'error' });
  }
}

/**
 * Menu entries (openMenu items) the installed apps offer for these node ids; [] when none.
 * separator: a '-' before them, when there are some.
 */
export function appActionEntries(ids, { separator = false } = {}) {
  const nodes = ids.map(id => fs.get(id)).filter(Boolean);
  if (!nodes.length) return [];
  const out = [];
  for (const app of installedApps()) {
    const menus = new Map(listOf(app, 'menus').map(m => [m?.id, m]));
    const submenus = new Map();   // menu id → its entry, at the place of its first action
    for (const action of listOf(app, 'actions')) {
      if (nodes.length > 1 && !action.many) continue;
      if (!nodes.every(n => fits(action, app.id, n))) continue;
      const entry = { label: action.label, icon: action.glyph ?? app.glyph, action: () => run(app, action, nodes.map(n => n.id)) };
      const menu = menus.get(action.menu);
      if (!menu) { out.push(entry); continue; }
      if (!submenus.has(menu.id)) {
        submenus.set(menu.id, { label: menu.label, icon: menu.glyph ?? app.glyph, items: [] });
        out.push(submenus.get(menu.id));
      }
      submenus.get(menu.id).items.push(entry);
    }
  }
  return separator && out.length ? ['-', ...out] : out;
}
