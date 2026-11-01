import { h, fs, net } from '@lilos/sdk';
import { itemIcon } from '../desktop/itemIcons.js';
import { moveNodes, restoreNodes } from './fsHistory.js';
import { notify } from '../notifications/notify.js';

/**
 * Dragging files and folders, the same in every view that shows them: the desk, the File
 * Manager (list, grid, path, sidebar), the Editor's folder panel and any other app.
 *
 * A view does three things:
 *   markItem(el, node)     the element shows that node. A folder's element accepts drops (the
 *                          items move into it); a file's lets the drop fall to what is around it.
 *   dropZone(el, zone)     an area that accepts drops: the folder it shows (the File Manager's
 *                          list, the desk) or something else (the sidebar's links, the trash).
 *   dragItems(e, options)  on pointerdown on its items: drags `ids` and, once released on a
 *                          target, does what the target says.
 *
 *   zone: { folder?(hit) → folder id | null   dropping moves the items into it
 *           drop?(ids, ev, stack)            instead of moving into `folder` (still checked first)
 *           accepts?(ids) → boolean           for zones without a folder
 *           highlight?(folder) → element | null   what lights up (default: the zone)
 *           target?(hit, x, y, ids) → { el, run(ev, stack) } | null   decides everything itself
 *                                            (e.g. by where in the zone the pointer is) }
 *
 * The move is recorded once, in the undo history of the view the drag started from (`stack`).
 * Between the home and a network connection (or two connections) nothing moves: the items are
 * copied by a transfer of the kernel (net.transfer), and the transfer window follows it.
 * A window hides what is behind it: a drop over a window never reaches the desk below.
 *
 * Items of the trash (the File Manager's trash view) are dragged the same way: dropped into a
 * folder, they are put back there (fs.untrash with the folder), not where they came from.
 */
const zones = new WeakMap();

/** Marks an element as showing a node (see above). Returns the element. */
export function markItem(el, node) {
  el.dataset.node = node.id;
  return el;
}

/** Makes `el` accept drops. Returns the function that stops it. */
export function dropZone(el, zone) {
  zones.set(el, zone);
  return () => zones.delete(el);
}

/**
 * The ids among `ids` that can go into `folderId`, or null if the drop is not possible there
 * (not a folder, a dragged folder is the target or holds it, nothing would change). Items of the
 * trash can go into any folder.
 */
export function movableInto(ids, folderId) {
  const folder = folderId && fs.get(folderId);
  if (folder?.type !== 'folder') return null;
  const trashed = ids.filter(id => fs.isTrashed(id));
  if (trashed.length) return trashed;
  const nodes = ids.map(id => fs.get(id)).filter(n => n && !n.system);
  if (nodes.some(n => fs.isInside(folderId, n.id))) return null;
  const movable = nodes.filter(n => n.parent !== folderId).map(n => n.id);
  return movable.length ? movable : null;
}

/** What is under (x, y) for these ids: { el, run(ev, stack) } or null. */
function targetAt(x, y, ids) {
  for (let el = document.elementFromPoint(x, y); el && el !== document.documentElement; el = el.parentElement) {
    const zone = zones.get(el);
    if (zone) return zoneTarget(el, zone, ids, x, y);
    const id = el.dataset?.node;
    if (id && fs.get(id)?.type === 'folder') {
      const movable = movableInto(ids, id);
      return movable && { el, run: (ev, stack) => moveInto(stack, movable, id) };
    }
    if (el.classList.contains('window')) return null;
  }
  return null;
}

function zoneTarget(el, zone, ids, x, y) {
  const hit = document.elementFromPoint(x, y);
  if (zone.target) return ids.length ? zone.target(hit, x, y, ids) : null;
  if (zone.folder) {
    const folder = zone.folder(hit);
    const movable = movableInto(ids, folder);
    if (!movable) return null;
    const lit = zone.highlight ? zone.highlight(folder) : el;
    return { el: lit, run: (ev, stack) => (zone.drop ? zone.drop(movable, ev, stack) : moveInto(stack, movable, folder)) };
  }
  if (!zone.drop || !ids.length || zone.accepts?.(ids) === false) return null;
  return { el: zone.highlight ? zone.highlight(null) : el, run: (ev, stack) => zone.drop(ids, ev, stack) };
}

/**
 * Moves the nodes into a folder (one undo step in `stack`) and says where they went. Items of the
 * trash are put back into it instead. Returns the ids moved or put back.
 */
export function moveInto(stack, ids, folderId) {
  const where = folderId === fs.root ? 'Home' : fs.path(folderId);
  const what = done => (done.length === 1 ? `«${fs.get(done[0]).name}»` : `${done.length} elementi`);
  const ending = done => (done.length === 1 ? 'o' : 'i');
  if (ids.some(id => fs.isTrashed(id))) {
    if (fs.isRemote(folderId)) {
      notify('Quello che è nel cestino torna in una cartella di lilOS, non su un server', { level: 'error' });
      return [];
    }
    const restored = restoreNodes(stack, ids, folderId).map(r => r.id);
    if (restored.length) notify(`Ripristinat${ending(restored)} ${what(restored)} in ${where}`, { level: 'success' });
    return restored;
  }
  const place = id => fs.get(id)?.net ?? 'home';
  const across = ids.filter(id => place(id) !== place(folderId));
  if (across.length) {
    net.transfer(across, folderId).catch(err => notify(`Trasferimento non avviato: ${err.message}`, { level: 'error' }));
    ids = ids.filter(id => !across.includes(id));
    if (!ids.length) return [];
  }
  try {
    const moved = moveNodes(stack, ids, folderId);
    if (!moved.length) return [];
    notify(`Spostat${ending(moved)} ${what(moved)} in ${where}`, { level: 'success' });
    return moved;
  } catch (err) {
    notify(`Non si può spostare: ${err.message}`, { level: 'error' });
    return [];
  }
}

function ghostFor(ids) {
  const node = ids.length === 1 && (fs.get(ids[0]) ?? fs.trashed().find(n => n.id === ids[0]));
  return h('div', { class: 'item-ghost', 'aria-hidden': 'true' },
    node ? h('span', { class: 'item-ghost-icon' }, itemIcon(node)) : null,
    h('span', {}, node ? node.name : `${ids.length} elementi`));
}

/**
 * Drags the nodes `ids` from a pointerdown. Options:
 *   stack       the undo history of the view it starts from (the move is recorded there)
 *   ghost       show a label with the items next to the pointer (false: the view moves its own)
 *   threshold   pixels before it counts as a drag
 *   onMove(dx, dy, ev, target)
 *   onEnd({ moved, target, cancelled, hit, ev }) → true if the view handled the drop itself
 * Esc cancels. With no ids (e.g. only workarea icons) it still tracks the pointer, with no targets.
 */
export function dragItems(e, { ids, stack = null, ghost = true, threshold = 5, onMove, onEnd } = {}) {
  const sx = e.clientX, sy = e.clientY;
  let moved = false, cancelled = false, target = null, ghostEl = null;
  const light = el => {
    if (target?.el === el) return;
    target?.el?.classList.remove('drop-target');
    el?.classList.add('drop-target');
  };
  const move = ev => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < threshold) return;
    if (!moved) {
      moved = true;
      document.body.classList.add('items-dragging');
      if (ghost && ids.length) document.body.append(ghostEl = ghostFor(ids));
    }
    if (ghostEl) ghostEl.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 10}px)`;
    const next = cancelled || !ids.length ? null : targetAt(ev.clientX, ev.clientY, ids);
    light(next?.el ?? null);
    target = next;
    onMove?.(ev.clientX - sx, ev.clientY - sy, ev, target);
  };
  const key = ev => {
    if (ev.key !== 'Escape' || !moved) return;
    ev.preventDefault();
    ev.stopPropagation();
    cancelled = true;
    light(null);
    target = null;
  };
  const end = ev => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', end);
    removeEventListener('pointercancel', end);
    removeEventListener('keydown', key, true);
    document.body.classList.remove('items-dragging');
    ghostEl?.remove();
    light(null);
    const drop = ev.type === 'pointerup' && !cancelled ? target : null;
    const hit = moved ? document.elementFromPoint(ev.clientX, ev.clientY) : null;
    const handled = onEnd?.({ moved, target: drop, cancelled: cancelled || ev.type === 'pointercancel', hit, ev });
    if (moved && drop && !handled) drop.run(ev, stack);
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  addEventListener('keydown', key, true);
}
