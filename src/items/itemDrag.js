import { h, fs, net, uid } from '@lilos/sdk';
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
 *
 * Files and folders of the computer (dragged from Explorer, Finder, Nautilus… into the page) are
 * copied into the folder under the pointer: a folder's element, or the zone's folder
 * (zone.files?(hit) first, for zones that decide with `target`). zone.importFiles(entries, ev)
 * takes them over (the desk puts them where they were dropped). connectFileDrops() starts it.
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

/** Ids for new nodes, made before creating them (the desk places them where they were dropped). */
export const newIds = n => Array.from({ length: n }, () => uid());

// ---------- Files of the computer ----------

const MAX_IMPORT = 2000;

/** The folder under (x, y) for files of the computer: { el (lit), folder, zone } or null. */
function fileTargetAt(x, y) {
  const hit = document.elementFromPoint(x, y);
  for (let el = hit; el && el !== document.documentElement; el = el.parentElement) {
    const zone = zones.get(el);
    if (zone) {
      const folder = zone.files?.(hit) ?? zone.folder?.(hit) ?? null;
      if (!folder || fs.get(folder)?.type !== 'folder' || fs.isTrashed(folder)) return null;
      return { el: zone.highlight ? zone.highlight(folder) : el, folder, zone };
    }
    const id = el.dataset?.node;
    if (id && fs.get(id)?.type === 'folder' && !fs.isTrashed(id)) return { el, folder: id, zone: null };
    if (el.classList.contains('window')) return null;
  }
  return null;
}

/** What was dropped: [{ file, path: ['sub', 'folder'] }], folders read whole (up to MAX_IMPORT files). */
async function droppedEntries(dt) {
  const roots = [...(dt.items ?? [])].map(i => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!roots.length) return [...dt.files].map(file => ({ file, path: [] }));
  const out = [];
  const readAll = dir => new Promise(resolve => {
    const reader = dir.createReader(), all = [];
    const next = () => reader.readEntries(batch => (batch.length ? (all.push(...batch), next()) : resolve(all)), () => resolve(all));
    next();
  });
  const walk = async (entry, path) => {
    if (out.length >= MAX_IMPORT) return;
    if (entry.isFile) {
      const file = await new Promise(r => entry.file(r, () => r(null)));
      if (file) out.push({ file, path });
    } else if (entry.isDirectory) {
      const children = await readAll(entry);
      if (!children.length) out.push({ file: null, path: [...path, entry.name] });
      for (const child of children) await walk(child, [...path, entry.name]);
    }
  };
  for (const root of roots) await walk(root, []);
  return out;
}

/** A folder named `name` inside `parentId` (the one already there, or a new one). */
function folderIn(parentId, name) {
  const existing = fs.children(parentId).find(n => n.type === 'folder' && n.name.toLowerCase() === name.toLowerCase());
  return existing?.id ?? fs.create(parentId, { type: 'folder', name }).id;
}

/**
 * Copies files of the computer into a folder of lilOS (sub-folders as they were): entries from
 * droppedEntries. ids: ids for the top-level items, in order (the desk places them before they
 * exist). Returns the ids of the top-level items made, and says what happened.
 */
export async function importFiles(entries, folderId, { ids = [] } = {}) {
  if (fs.isRemote(folderId)) {
    notify('I file del computer si copiano in una cartella di lilOS: da lì, trascinali sul server', { level: 'warning' });
    return [];
  }
  const top = new Map();   // top-level item ('d:' folder name, 'f:' entry number) → id made
  const topId = () => ids[top.size] ?? undefined;
  let copied = 0, failed = 0;
  for (const [n, { file, path }] of entries.entries()) {
    try {
      let parent = folderId;
      if (path.length) {
        const key = `d:${path[0]}`;
        if (!top.has(key)) {
          const free = !fs.children(folderId).some(c => c.name.toLowerCase() === path[0].toLowerCase());
          top.set(key, free ? fs.create(folderId, { type: 'folder', name: path[0], id: topId() }).id : folderIn(folderId, path[0]));
        }
        parent = top.get(key);
        for (const part of path.slice(1)) parent = folderIn(parent, part);
      }
      if (!file) continue;
      const node = fs.create(parent, { type: 'file', name: file.name, size: file.size, id: path.length ? undefined : topId() });
      if (!path.length) top.set(`f:${n}`, node.id);
      await fs.write(node.id, file);
      copied++;
    } catch (err) {
      failed++;
      console.warn('[lilos] file non copiato:', file?.name, err.message);
    }
  }
  const where = folderId === fs.root ? 'Home' : fs.path(folderId);
  if (copied) notify(copied === 1 ? `Copiato 1 file dal computer in ${where}` : `Copiati ${copied} file dal computer in ${where}`, { level: 'success' });
  if (failed) notify(failed === 1 ? '1 file non è stato copiato' : `${failed} file non sono stati copiati`, { level: 'error' });
  if (entries.length >= MAX_IMPORT) notify(`Copiati solo i primi ${MAX_IMPORT} file`, { level: 'warning' });
  return [...top.values()];
}

/** How many top-level items `entries` makes (one per file at the top, one per top folder). */
export function topCount(entries) {
  return new Set(entries.map((e, n) => (e.path.length ? `d:${e.path[0]}` : `f:${n}`))).size;
}

let fileDrops = false;

/** Starts accepting files of the computer dropped on the page (once). */
export function connectFileDrops() {
  if (fileDrops) return;
  fileDrops = true;
  let lit = null;
  const light = el => {
    if (lit === el) return;
    lit?.classList.remove('drop-target');
    lit = el;
    el?.classList.add('drop-target');
  };
  const hasFiles = e => [...(e.dataTransfer?.types ?? [])].includes('Files');
  document.addEventListener('dragover', e => {
    if (!hasFiles(e)) return;
    // Always taken: a file dropped where it cannot go must not make the browser open it
    e.preventDefault();
    const target = fileTargetAt(e.clientX, e.clientY);
    e.dataTransfer.dropEffect = target ? 'copy' : 'none';
    light(target?.el ?? null);
  });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) light(null); });
  document.addEventListener('drop', async e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    light(null);
    const target = fileTargetAt(e.clientX, e.clientY);
    if (!target) return;
    const entries = await droppedEntries(e.dataTransfer);
    if (!entries.length) return;
    if (target.zone?.importFiles) target.zone.importFiles(entries, e);
    else importFiles(entries, target.folder);
  });
}
