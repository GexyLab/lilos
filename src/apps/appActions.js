import { fs, splitName } from '@lilos/sdk';
import { installedApps, launch } from './registry.js';
import { callEntrypoint, entrypointsOf } from './entrypoints.js';
import { notify } from '../notifications/notify.js';

/**
 * What installed apps add to the menu of files and folders (manifest contributes.actions, with the
 * permission ui.menus); their signs on icons are in desktop/itemIcons.js. An action starts one of the app's
 * entry points with { files: [ids], action: id }; the app may read and write those files.
 *
 *   { id, label, entry, on: 'file' | 'folder' | 'item', glyph?, when?: { meta?: 'own' | 'none', ext? }, many? }
 */
const actionsOf = app => {
  const pkg = app?.package;
  if (!pkg || !(pkg.manifest.permissions ?? []).includes('ui.menus')) return [];
  const list = app.text?.contributes?.actions;
  return Array.isArray(list) ? list : [];
};

function fits(action, appId, node) {
  if (!node || node.type === 'app') return false;
  if (action.on !== 'item' && node.type !== action.on) return false;
  const marked = !!node.apps && Object.hasOwn(node.apps, appId);
  if (action.when?.meta === 'own' && !marked) return false;
  if (action.when?.meta === 'none' && marked) return false;
  if (action.when?.ext && !(node.type === 'file' && action.when.ext.includes(splitName(node.name)[1].toLowerCase()))) return false;
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
    for (const action of actionsOf(app)) {
      if (nodes.length > 1 && !action.many) continue;
      if (!nodes.every(n => fits(action, app.id, n))) continue;
      out.push({ label: action.label, icon: action.glyph ?? app.glyph, action: () => run(app, action, nodes.map(n => n.id)) });
    }
  }
  return separator && out.length ? ['-', ...out] : out;
}
