import { fs } from '@lilos/sdk';

/**
 * Finding an item of a desk from elsewhere, for system apps (in '@lilos/system'): Note adesive
 * lists the notes of every desk, shows one («Mostra») or brings it where the user is looking
 * («Porta qui»). Connected by the system at start-up.
 */
let ctx = null;

export function connectReveal({ desktop, workspaces, workareas, canvas }) {
  ctx = { desktop, workspaces, workareas, canvas };
}

/** The node, wherever it is (also on another workspace's desk), with its `scope` (fs.everywhere). */
const locate = id => (typeof id === 'string' ? fs.everywhere(n => n.id === id)[0] ?? null : null);

/** A top-left corner near (x, y) where no other item starts: things brought one after the other do not pile up. */
function freeSpot(x, y, except) {
  const step = 24;
  let p = { x: Math.round(x / 8) * 8, y: Math.round(y / 8) * 8 };
  const taken = it => it.id !== except && !it.el.hidden && Math.abs(it.data.x - p.x) < step && Math.abs(it.data.y - p.y) < step;
  for (let i = 0; i < 50 && [...ctx.desktop.items.values()].some(taken); i++) p = { x: p.x + step, y: p.y + step };
  return p;
}

/** Opens the reduced workarea that hides the item, if any (without moving the view). */
async function unhide(id) {
  const { desktop, workareas } = ctx;
  if (!desktop.items.get(id)?.el.hidden) return;
  const area = workareas.list().find(w => w.collapsed && w.items?.includes(id));
  if (area) await workareas.expand(area.id, { frame: false });
}

/**
 * Shows an item of a desk: the workspace it is in becomes the current one, the reduced workarea
 * that hides it opens, the view goes to it (at 100% at most) and it is selected alone.
 * Resolves false when it is not on a desk (in another folder, or gone).
 */
export async function revealOnDesk(id) {
  const found = ctx && locate(id);
  if (!found) return false;
  const { desktop, workspaces, canvas } = ctx;
  if (found.scope && found.scope !== workspaces.currentId) await workspaces.switchTo(found.scope);
  if (!desktop.items.has(id)) return false;
  await unhide(id);
  const item = desktop.items.get(id);
  if (!item) return false;
  desktop.select([item]);
  canvas.frame({ x: item.data.x, y: item.data.y, w: item.el.offsetWidth || 86, h: item.el.offsetHeight || 64 }, 120, 1);
  return true;
}

/**
 * Brings an item to the middle of the view on the current desk: from where it is on this desk,
 * from another folder, or from another workspace's desk. size: { w, h } of the item, to center
 * it when it is not on this desk yet. Selects it. Resolves false if it is gone.
 */
export async function bringToDesk(id, { w = 86, h = 64 } = {}) {
  const found = ctx && locate(id);
  if (!found) return false;
  const { desktop, canvas } = ctx;
  const v = canvas.viewRect();
  if (desktop.items.has(id)) {
    await unhide(id);
    const item = desktop.items.get(id);
    desktop.place([{ id, ...freeSpot(v.x + v.w / 2 - item.el.offsetWidth / 2, v.y + v.h / 2 - item.el.offsetHeight / 2, id) }]);
    desktop.select([item]);
    return true;
  }
  desktop.placeNext(freeSpot(v.x + v.w / 2 - w / 2, v.y + v.h / 2 - h / 2, id));
  try {
    fs.bring(id, desktop.folder);
  } finally {
    desktop.placeNext(null);
  }
  const item = desktop.items.get(id);
  if (item) desktop.select([item]);
  return !!item;
}

/**
 * A new file shown by an app's widget, in the middle of the view of the current desk, opened at
 * once (the window of Note adesive: «Nuova nota»). Resolves true if it was made.
 */
export function newWidgetOnDesk(appId, widgetId) {
  return !!ctx?.desktop.createWidget(appId, widgetId);
}
