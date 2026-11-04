import { appFor, extensionOf } from '../apps/open.js';
import { getApp, isInstalled } from '../apps/registry.js';

/**
 * Widgets of the desk (manifest contributes.widgets, permission desktop.widget). A widget with a
 * `fileType` shows the files of that type that are on the desk: in place of the icon, the app
 * draws the file there (Note adesive: a note is a .sticky file). It is the widget of the app that
 * opens that type (open.js: the user's choice), installed in the workspace.
 *
 * For now only system apps (official repository, run inside lilOS) have widgets on the desk: an
 * isolated app would need a sandbox for every widget. Their module exports them by id:
 *
 *   export const widgets = { note: ({ el, node, host }) => controller }
 *
 *   el      the element to draw in (the widget's own, inside the desk item)
 *   node    the file node (a copy)
 *   host    what lilOS offers the widget:
 *             setSize(w, h)     its size on the desk, in desk pixels (the manifest's at first)
 *             setEditing(on)    while on, the desk leaves pointer and keys to it (no dragging, no shortcuts)
 *             setColor(css)     its color in the minimap
 *             select()          selects it alone on the desk
 *             scale             the desk's zoom now
 *   controller (every part optional):
 *             update(node)      the file changed (name, content's size and date, apps' data)
 *             zoom(scale)       the desk's zoom changed
 *             open()            the user opened it (double click, Enter, Apri): editing in place
 *             selected(on)      selected on the desk, or no longer
 *             menu() → [entry]  openMenu entries put first in the item's menu
 *             destroy()         it leaves the desk (removed, moved away, another workspace)
 */

/** The widget that shows this file on the desk: { app, widget } or null. */
export function widgetFor(node) {
  if (node?.type !== 'file' || node.trashed) return null;
  const ext = extensionOf(node);
  if (!ext) return null;
  const app = appFor(ext);
  if (!app?.trusted || !app.load || !isInstalled(app.id)) return null;
  const manifest = app.package?.manifest;
  if (!manifest?.permissions?.includes('desktop.widget')) return null;
  const widget = (manifest.contributes?.widgets ?? []).find(w => w?.fileType === ext);
  return widget ? { app, widget } : null;
}

/** The function of the app's module that makes the widget. */
export async function loadWidget(app, widget) {
  const mod = await app.load();
  const make = mod.widgets?.[widget.id];
  if (typeof make !== 'function') throw new Error(`${app.name} non esporta il widget ${widget.id}`);
  return make;
}

/**
 * A widget of an app that makes new files on the desk (Nuovo → Nota adesiva): { app, widget, ext }
 * when its files would show as that widget now, else null (app missing, hidden, or another app
 * chosen for the type).
 */
export function fileWidget(appId, widgetId) {
  const ext = getApp(appId)?.package?.manifest?.contributes?.widgets?.find(w => w?.id === widgetId)?.fileType;
  const found = ext ? widgetFor({ type: 'file', name: `x.${ext}` }) : null;
  return found && found.app.id === appId && found.widget.id === widgetId ? { ...found, ext } : null;
}
