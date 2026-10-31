import { bus, fs, storage, settings, openMenu, shortcuts, selectionGesture, menus, UndoStack, tags, toast } from '@lilos/sdk';
import { launch } from '../apps/registry.js';
import { openFile } from '../apps/open.js';
import { addTarget } from '../items/targets.js';
import { confirmRemove, deleteNodes, deleteLabel } from '../items/confirmRemove.js';
import { recordCreated, renameNode } from '../items/fsHistory.js';
import { dragItems, dropZone, moveInto } from '../items/itemDrag.js';
import { linkEntry } from '../items/links.js';
import { showProperties } from '../items/properties.js';
import { selectionMode } from '../systemSettings.js';
import { BACKGROUND_MENU, registerDesktopMenu, initialContent } from './menu.js';
import { DesktopItem } from './DesktopItem.js';
import { FIXED_ITEMS, fixedData, fixedId, fixedOf, fixedRank, openFixed, acceptDrops, isFixedShown, setFixedShown } from './fixedItems.js';
import { tagSubmenu } from '../tags/tagUi.js';
import { HEADER as AREA_HEADER } from '../workareas/WorkareaFrame.js';

const LAYOUT_KEY = 'desktop-layout';
const SNAP = 8;
const CELL = { w: 92, h: 84 };
const MARGIN = 16;
const ROWS = 8;
const TYPE_ORDER = { folder: 0, file: 1, app: 2 };

const snap = v => Math.round(v / SNAP) * SNAP;

/**
 * The desk as a view of a folder of the file system (/Scrivania of the current workspace): one
 * DesktopItem per node, free positions saved apart (the layout key, { id: [x, y] }; per workspace
 * 'lilos:ws:<id>:desktop-layout'). Changing workspace calls load() with the other desk.
 * Creating, renaming and removing go through `fs`; the view follows its 'change' events,
 * so changes made elsewhere (File Manager) show up here too.
 * Opening an item launches apps and emits 'item:open' for folders and files.
 *
 * Every desk also shows the fixed items (fixedItems.js: Home, Documenti, the trash…) that are
 * turned on: not in the file system, they cannot be renamed or deleted; their positions are saved
 * with the others, and kept while they are off.
 *
 * With workareas (src/workareas/), the desk also shows the icons of reduced workareas (items with
 * a `workarea` id, not in the file system), and the requests made inside an area — select all,
 * arrange, rectangle selection, the background menu — act only on what the area contains.
 *
 * `history` is the desk's undo history (Ctrl Z while no window is active): creating, renaming,
 * deleting, moving and arranging items, and what is done to workareas.
 */
export class Desktop {
  /** False while something else (a window) has the keyboard. */
  keyboard = true;
  /** Align items to the grid when dropped. */
  snapToGrid = true;
  /** Set by Workareas when they are in use. */
  workareas = null;
  /** Undo history of the desk (the system makes it the root of `history`). */
  history = new UndoStack();

  #layout;
  #layoutKey;
  #placeNext = null; // world position for the next node created by this view
  #dropAt = new Map(); // id → world position, for nodes dropped here from another view

  /** `layoutKey`: where the positions are saved (every workspace has its own desk and key). */
  constructor(canvas, folderId, layoutKey = LAYOUT_KEY) {
    this.canvas = canvas;
    this.folder = folderId;
    this.items = new Map();
    this.selection = new Set();

    this.#layoutKey = layoutKey;
    this.#layout = this.#readLayout();
    this.#mountAll();
    this.save();

    fs.on('change', e => this.#sync(e));
    // Files and folders dragged here from a window (File Manager, Editor…): onto the desk, where dropped
    dropZone(canvas.el, { folder: () => this.folder, highlight: () => null, drop: (ids, ev, stack) => this.#dropHere(ids, ev, stack) });
    // A tag made invisible or visible again: items leave or come back. Tag colors: redraw the dots
    fs.on('scope', () => this.#reconcile());
    // The trash on the desk looks full or empty
    fs.on('trash', () => {
      const trash = this.items.get(fixedId('trash'));
      if (!trash) return;
      trash.data.full = fs.trashed().length > 0;
      trash.setData(trash.data);
    });
    // Fixed items turned on or off in Sistema → Scrivania → Elementi
    settings.on('change:deskHidden', () => this.#syncFixed());
    tags.on('change', () => this.items.forEach(it => { if (!it.workarea && !it.fixed && fs.exists(it.id)) it.setData(fs.get(it.id)); }));
    canvas.on('background:press', e => this.#selectByDrag(e));
    canvas.on('background:click', e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) this.select([]); });
    canvas.on('background:contextmenu', e => this.#backgroundMenu(e));
    registerDesktopMenu(this);
    addTarget({
      isActive: () => this.keyboard,
      selectionSize: () => this.selection.size,
      open: () => [...this.selection].forEach(it => this.open(it)),
      rename: () => this.rename([...this.selection][0]),
      remove: () => this.remove([...this.selection]),
      selectAll: () => this.select(this.scopeItems()),
      deselect: () => this.select([]),
    });
  }

  /** Saves the positions (of file system items; workarea icons are saved with their workarea). */
  save() {
    const positions = Object.fromEntries([...this.items].filter(([, it]) => !it.workarea).map(([id, it]) => [id, [it.data.x, it.data.y]]));
    // Items hidden by an invisible tag, in the trash or turned off (fixed) keep their place for when they come back
    const trashed = new Set(fs.trashed().filter(n => n.trashed.from === this.folder).map(n => n.id));
    for (const [id, p] of Object.entries(this.#layout)) {
      if (!positions[id] && ((fs.get(id)?.parent === this.folder && fs.isHidden(id)) || trashed.has(id) || fixedOf(id))) positions[id] = p;
    }
    storage.set(this.#layoutKey, positions);
  }

  /**
   * Shows another folder as the desk (another workspace's): the items go away, the new ones take
   * their positions from `layoutKey`, the selection and the undo history start over.
   * Save the current positions first (save()). Workarea icons come back with Workareas.load().
   */
  load(folderId, layoutKey) {
    this.select([]);
    this.#unmount([...this.items.keys()]);
    this.history.clear();
    this.folder = folderId;
    this.#layoutKey = layoutKey;
    this.#layout = this.#readLayout();
    this.#mountAll();
    this.save();
    this.canvas.changed();
  }

  #readLayout() {
    const saved = storage.get(this.#layoutKey, {});
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  }

  /** Items on view (not hidden inside a reduced workarea). */
  visibleItems() {
    return [...this.items.values()].filter(it => !it.el.hidden);
  }

  /** What the desk's requests act on: the items of the current workarea, or every visible item. */
  scopeItems() {
    const current = this.workareas?.current;
    return current ? this.workareas.itemsIn(current) : this.visibleItems();
  }

  /** Puts an item that is not a file system node on the desk (workarea icons). */
  addItem(item) {
    this.items.set(item.id, item);
    this.#bind(item);
    this.canvas.add(item.el);
    this.canvas.changed();
  }

  removeItem(id) {
    this.#unmount([id]);
    this.canvas.changed();
  }

  // ---------- Selection ----------

  select(items) {
    this.selection.forEach(it => it.setSelected(false));
    this.selection = new Set([...items].filter(it => !it.el.hidden));
    this.selection.forEach(it => it.setSelected(true));
  }

  toggle(item) {
    const on = !this.selection.has(item);
    if (on) this.selection.add(item);
    else this.selection.delete(item);
    item.setSelected(on);
  }

  // ---------- Actions ----------

  open(item) {
    if (item.workarea) this.workareas?.expand(item.workarea);
    else if (item.fixed) openFixed(item.fixed);
    else if (item.data.type === 'app') launch(item.data.app);
    else bus.emit('item:open', fs.get(item.id));
  }

/**
   * New folder or file centered on a world point, then straight into rename. A file can start with
   * some text (content) or with a copy of a template file.
   */
  async create(type, at, { name, content, template } = {}) {
    this.#placeNext = { x: snap(at.x - CELL.w / 2), y: snap(at.y - 24) };
    const node = fs.create(this.folder, { type, name: name ?? (type === 'folder' ? 'Nuova cartella' : 'Nuovo documento.txt') });
    const item = this.items.get(node.id);
    this.select([item]);
    // Creating and naming are one step for undo
    const named = this.rename(item, false).then(() => recordCreated(this.history, node.id));
    if (type === 'file' && (content || template)) await fs.write(node.id, await initialContent({ content, template }));
    return named;
  }

  async rename(item, record = true) {
    if (item.fixed) return;
    const name = await item.editName();
    if (!name) return;
    if (item.workarea) this.workareas?.rename(item.workarea, name, { record });
    else if (fs.exists(item.id)) {
      try { renameNode(record ? this.history : null, item.id, name); } catch (err) { console.warn('[lilos]', err.message); }
    }
  }

  /**
   * Files and folders: into the trash or for good, asking first or not (see confirmRemove).
   * Workarea icons: only the workarea goes, its content comes back on the desk (asks first).
   * Fixed items stay: alone, a message says they cannot be deleted.
   */
  remove(selected) {
    const items = selected.filter(it => !it.fixed);
    if (!items.length) {
      if (selected.length) toast(selected.length === 1 ? `«${selected[0].data.name}» è un elemento fisso della scrivania: non si può eliminare` : 'Gli elementi fissi della scrivania non si possono eliminare');
      return;
    }
    if (items.length < selected.length) toast('Gli elementi fissi della scrivania restano: si elimina solo il resto');
    const r = items[0].el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.bottom;
    const areas = items.filter(it => it.workarea).map(it => it.workarea);
    const nodes = items.filter(it => !it.workarea).map(it => it.id);
    if (!areas.length) return confirmRemove(nodes, x, y, this.history);
    if (!nodes.length) return this.workareas?.confirmRemove(areas, x, y);
    const count = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
    const files = nodes.map(id => fs.get(id)).filter(n => n && !n.system);
    openMenu(x, y, [
      { label: `${deleteLabel(files)} ed elimina ${count(areas.length, 'workarea', 'workarea')}`, icon: 'trash', danger: true, action: () => {
        deleteNodes(this.history, nodes);
        areas.forEach(id => this.workareas?.remove(id));
      } },
      { label: 'Annulla', icon: 'x', action: () => {} },
    ]);
  }

  /**
   * Sort (the fixed items in their order, then folders, files, apps — then by name) and line up:
   * inside the current workarea, its items in its area; elsewhere, the items outside every
   * workarea, in the visible part of the desk (skipping the places covered by an area, so nothing
   * ends up inside one).
   */
  arrange() {
    const current = this.workareas?.current;
    const rect = current && this.workareas.get(current).rect;
    const items = current ? this.workareas.itemsIn(current) : this.visibleItems().filter(it => !this.workareas?.itemWorkarea(it));
    const rank = it => (it.fixed ? fixedRank(it.id) - FIXED_ITEMS.length : TYPE_ORDER[it.data.type] ?? 3);
    const sorted = items.sort((a, b) => rank(a) - rank(b) || a.data.name.localeCompare(b.data.name, 'it', { numeric: true }));
    const v = this.canvas.viewRect();
    const box = rect
      ? { x: rect.x + MARGIN, y: rect.y + AREA_HEADER + MARGIN, h: rect.h - AREA_HEADER - MARGIN * 2 }
      : { x: v.x + MARGIN, y: v.y + MARGIN, h: v.h - MARGIN * 2 };
    const rows = Math.max(1, Math.floor(box.h / CELL.h));
    const slots = this.#slots(sorted.length, { x: snap(box.x), y: snap(box.y), rows }, !current);
    const before = this.#positions(sorted);
    sorted.forEach((item, i) => {
      item.moveTo(slots[i].x, slots[i].y);
      if (item.workarea) this.workareas.iconMoved(item);
    });
    this.canvas.changed();
    this.save();
    this.#recordMoves('Riordina icone', before);
  }

  /** { id: [x, y] } of some items. */
  #positions(items) {
    return new Map(items.map(it => [it.id, [it.data.x, it.data.y]]));
  }

  /** Records that items moved from `before` to where they are now (undo puts them back). */
  #recordMoves(label, before) {
    const after = this.#positions([...before.keys()].map(id => this.items.get(id)).filter(Boolean));
    if ([...after].every(([id, [x, y]]) => before.get(id)[0] === x && before.get(id)[1] === y)) return;
    const apply = positions => {
      const present = [...positions].filter(([id]) => this.items.has(id));
      if (!present.length) throw new Error('Gli elementi non ci sono più');
      for (const [id, [x, y]] of present) {
        const item = this.items.get(id);
        item.moveTo(x, y);
        if (item.workarea) this.workareas?.iconMoved(item);
      }
      this.canvas.changed();
      this.save();
    };
    this.history.push({ label, undo: () => apply(before), redo: () => apply(after) });
  }

  // ---------- Internals ----------

  #sync(e) {
    // Items with an invisible tag are not on the desk (fs.children leaves them out too)
    const hidden = e.node && fs.isHidden(e.node.id);
    if (e.type === 'create' && e.parent === this.folder) {
      if (hidden) return;
      this.#mount(e.node);
      this.save();
    } else if (e.type === 'move' && (e.parent === this.folder) !== (e.from === this.folder)) {
      // Moved onto the desk (new slot) or away from it
      if (e.parent === this.folder && !hidden) this.#mount(e.node);
      else this.#unmount([e.node.id]);
      this.canvas.changed();
      this.save();
    } else if (e.type === 'update' && e.parent === this.folder && hidden !== !this.items.has(e.node.id)) {
      // Tagged with an invisible tag (goes away), or no longer (comes back)
      if (hidden) {
        this.select([...this.selection].filter(it => it.id !== e.node.id));
        this.#unmount([e.node.id]);
      } else {
        this.#mount(e.node);
      }
      this.canvas.changed();
      this.save();
    } else if (e.type === 'move' && this.items.has(e.node.id)) {
      this.items.get(e.node.id).setData(e.node);
    } else if ((e.type === 'rename' || e.type === 'update') && this.items.has(e.node.id)) {
      this.items.get(e.node.id).setData(e.node);
    } else if (e.type === 'remove') {
      const gone = e.ids.filter(id => this.items.has(id));
      if (!gone.length) return;
      this.#unmount(gone);
      this.canvas.changed();
      this.save();
    }
  }

  /** Items in step with the desk folder as fs shows it now (after hidden tags changed). */
  #reconcile() {
    // Changing workspace: the old desk cannot be seen any more, load() will take the new one
    if (!fs.exists(this.folder)) return;
    const nodes = fs.children(this.folder);
    const ids = new Set(nodes.map(n => n.id));
    const gone = [...this.items.values()].filter(it => !it.workarea && !it.fixed && !ids.has(it.id)).map(it => it.id);
    const added = nodes.filter(n => !this.items.has(n.id));
    if (!gone.length && !added.length) return;
    this.select([...this.selection].filter(it => !gone.includes(it.id)));
    this.#unmount(gone);
    added.forEach(n => this.#mount(n));
    this.canvas.changed();
    this.save();
  }

  #unmount(ids) {
    for (const id of ids) {
      const item = this.items.get(id);
      if (!item) continue;
      // Remembered for this session: an item put back (undo) returns to its place
      if (!item.workarea) this.#layout[id] = [item.data.x, item.data.y];
      item.el.remove();
      this.items.delete(id);
      this.selection.delete(item);
    }
  }

  /**
   * The desk folder's items and the fixed ones. Items with a saved place go first, so that the
   * others (a fixed item on a desk that never had it, the seed on first start) take free slots.
   */
  #mountAll() {
    const nodes = fs.children(this.folder);
    const placed = nodes.filter(n => this.#savedPosition(n.id));
    placed.forEach(n => this.#mount(n));
    FIXED_ITEMS.filter(f => isFixedShown(f.key)).forEach(f => this.#mountFixed(f));
    nodes.filter(n => !placed.includes(n)).forEach(n => this.#mount(n));
  }

  #mountFixed(fixed) {
    const item = this.#mount(fixedData(fixed));
    item.fixed = fixed;
    acceptDrops(item.el, fixed);
  }

  /** Fixed items in step with the setting: those turned off go (keeping their place), the others come. */
  #syncFixed() {
    const off = FIXED_ITEMS.filter(f => !isFixedShown(f.key) && this.items.has(fixedId(f.key)));
    const on = FIXED_ITEMS.filter(f => isFixedShown(f.key) && !this.items.has(fixedId(f.key)));
    if (!off.length && !on.length) return;
    this.select([...this.selection].filter(it => !off.includes(it.fixed)));
    this.#unmount(off.map(f => fixedId(f.key)));
    on.forEach(f => this.#mountFixed(f));
    this.canvas.changed();
    this.save();
  }

  #mount(node) {
    const pos = this.#placeNext ?? this.#dropAt.get(node.id) ?? this.#savedPosition(node.id) ?? this.#freeSlot();
    this.#placeNext = null;
    const item = new DesktopItem({ ...node, x: pos.x, y: pos.y });
    this.items.set(item.id, item);
    this.#bind(item);
    this.canvas.add(item.el);
    return item;
  }

  #savedPosition(id) {
    const p = this.#layout[id];
    return Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? { x: p[0], y: p[1] } : null;
  }

  /** First grid slot from the top-left corner of the desk that no item occupies (and no area covers). */
  #freeSlot() {
    const taken = new Set([...this.items.values()].map(it => `${it.data.x},${it.data.y}`));
    for (let i = 0; ; i++) {
      const slot = { x: MARGIN + Math.floor(i / ROWS) * CELL.w, y: MARGIN + (i % ROWS) * CELL.h };
      if (!taken.has(`${slot.x},${slot.y}`) && !this.#inArea(slot)) return slot;
    }
  }

  /** `count` slots in columns from the origin; with avoidAreas, slots inside an open workarea are skipped. */
  #slots(count, { x, y, rows }, avoidAreas) {
    const out = [];
    for (let i = 0; out.length < count && i < count + 5000; i++) {
      const slot = { x: x + Math.floor(i / rows) * CELL.w, y: y + (i % rows) * CELL.h };
      if (!avoidAreas || !this.#inArea(slot)) out.push(slot);
    }
    while (out.length < count) out.push({ x, y });
    return out;
  }

  #inArea(slot) {
    return !!this.workareas?.at({ x: slot.x + CELL.w / 2, y: slot.y + 32 });
  }

  #bind(item) {
    item.el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || item.editing) return;
      const additive = e.ctrlKey || e.metaKey || e.shiftKey;
      const wasSelected = this.selection.has(item);
      if (additive) {
        this.toggle(item);
        if (wasSelected) return;
      } else if (!wasSelected) {
        this.select([item]);
      }
      this.#drag(e, item, wasSelected && !additive);
    });
    item.el.addEventListener('dblclick', () => { if (!item.editing) this.open(item); });
    item.el.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!this.selection.has(item)) this.select([item]);
      this.#itemMenu(e, item);
    });
  }

  /** Rectangle or lasso drawn from the background (see selectionMode); Ctrl/Shift add to the selection. */
  #selectByDrag(e) {
    const { mode, additive } = selectionMode(e);
    const base = additive ? [...this.selection] : [];
    // Started inside a workarea: only its items can be selected
    const area = this.workareas?.at(this.canvas.toWorld(e.clientX, e.clientY));
    const candidates = area ? this.workareas.itemsIn(area) : this.visibleItems();
    const rects = candidates.map(it => [it, it.el.getBoundingClientRect()]);
    selectionGesture(e, {
      container: this.canvas.el,
      mode,
      onUpdate: hit => this.select(new Set([...base, ...rects.filter(([, r]) => hit(r)).map(([it]) => it)])),
    });
  }

  /**
   * Drags the whole selection. A plain click on an already selected item narrows the selection to it.
   * Released on the desk, the icons stay where they are; on a folder (on the desk, or in a window:
   * File Manager, Editor…) its files and folders move into it (see itemDrag.js) and the icons go
   * back to their place first, so that undo puts them there. Over a window with nowhere to drop,
   * or with Esc, everything goes back.
   */
  #drag(e, item, narrowOnClick) {
    const group = [...this.selection].map(it => ({ it, x: it.data.x, y: it.data.y }));
    const back = () => {
      for (const g of group) {
        g.it.moveTo(g.x, g.y);
        if (g.it.workarea) this.workareas?.iconMoved(g.it);
      }
      this.canvas.changed();
    };
    dragItems(e, {
      ids: group.filter(g => !g.it.workarea && !g.it.fixed).map(g => g.it.id),
      stack: this.history,
      ghost: false,
      threshold: 4,
      onMove: (dx, dy) => {
        const s = this.canvas.cam.s;
        for (const g of group) {
          g.it.el.classList.add('dragging');
          g.it.moveTo(g.x + dx / s, g.y + dy / s);
        }
        this.canvas.changed();
      },
      onEnd: ({ moved, target, cancelled, hit }) => {
        if (!moved) {
          if (narrowOnClick) this.select([item]);
          return;
        }
        group.forEach(g => g.it.el.classList.remove('dragging'));
        const onDesk = hit && this.canvas.el.contains(hit) && !hit.closest('.window');
        if (target || cancelled || !onDesk) return back();
        for (const { it } of group) {
          if (this.snapToGrid) it.moveTo(snap(it.data.x), snap(it.data.y));
          if (it.workarea) this.workareas?.iconMoved(it);
        }
        this.canvas.changed();
        this.save();
        const before = new Map(group.map(g => [g.it.id, [g.x, g.y]]));
        this.#recordMoves(group.length === 1 ? `Sposta «${group[0].it.data.name}»` : `Sposta ${group.length} elementi`, before);
      },
    });
  }

  /** Nodes dragged from another view: moved into the desk folder, lined up from the drop point. */
  #dropHere(ids, ev, stack) {
    const at = this.canvas.toWorld(ev.clientX, ev.clientY);
    const slots = this.#slots(ids.length, { x: snap(at.x - CELL.w / 2), y: snap(at.y - 24), rows: ROWS }, false);
    ids.forEach((id, i) => this.#dropAt.set(id, slots[i]));
    try {
      moveInto(stack, ids, this.folder);
    } finally {
      this.#dropAt.clear();
    }
  }

  #backgroundMenu(e) {
    const at = this.canvas.toWorld(e.clientX, e.clientY);
    // Items and order come from the menu registry: the user arranges them in the settings.
    // Inside a workarea its own entries come first, and the others act on it (see scopeItems)
    const area = this.workareas?.at(at);
    const items = menus.build(BACKGROUND_MENU, { at, workarea: area });
    openMenu(e.clientX, e.clientY, area ? [...this.workareas.menuEntries(area), '-', ...items] : items);
  }

  #itemMenu(e, item) {
    const selected = [...this.selection];
    const many = selected.length > 1;
    if (!many && item.workarea) {
      return openMenu(e.clientX, e.clientY, [
        { label: 'Apri la workarea', icon: 'open', shortcut: shortcuts.label('items.open'), action: () => this.open(item) },
        { label: 'Rinomina', icon: 'pencil', shortcut: shortcuts.label('items.rename'), action: () => this.rename(item) },
        { label: 'Proprietà…', icon: 'info', action: () => this.workareas.properties(item.workarea) },
        '-',
        { label: 'Elimina la workarea…', icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, action: () => this.remove([item]) },
      ]);
    }
    if (!many && item.fixed) {
      return openMenu(e.clientX, e.clientY, [
        { label: 'Apri', icon: 'open', shortcut: shortcuts.label('items.open'), action: () => this.open(item) },
        { label: 'Togli dalla scrivania', icon: 'eyeOff', action: () => {
          setFixedShown(item.fixed.key, false);
          toast(`«${item.data.name}» si rimette in Sistema → Scrivania → Elementi`);
        } },
        { label: 'Elementi fissi della scrivania…', icon: 'info', action: () => launch('settings', { tab: 'desk' }) },
      ]);
    }
    // Fixed items are not files: no tags, links or deleting
    const nodes = selected.filter(it => !it.workarea && !it.fixed).map(it => it.id);
    const deletable = selected.filter(it => !it.fixed);
    // Items outside every workarea can become a new one
    const free = this.workareas && selected.every(it => !it.workarea && !this.workareas.itemWorkarea(it));
    openMenu(e.clientX, e.clientY, [
      { label: many ? `Apri ${selected.length} elementi` : 'Apri', icon: 'open', shortcut: shortcuts.label('items.open'), action: () => selected.forEach(it => this.open(it)) },
      !many && item.data.type === 'file' && { label: 'Apri con…', icon: 'open', action: () => openFile(fs.get(item.id), { choose: true }) },
      { label: 'Rinomina', icon: 'pencil', shortcut: shortcuts.label('items.rename'), disabled: many, action: () => this.rename(item) },
      nodes.length && tagSubmenu(nodes),
      nodes.length && linkEntry(nodes),
      free && { label: 'Crea una workarea con la selezione', icon: 'workarea', action: () => this.workareas.createAround(selected) },
      !many && { label: 'Proprietà…', icon: 'info', action: () => showProperties(item.id) },
      '-',
      deletable.length
        ? { label: deletable.length > 1 ? `Elimina ${deletable.length} elementi` : 'Elimina', icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, action: () => this.remove(deletable) }
        : { label: 'Elimina', icon: 'trash', disabled: true },
    ].filter(Boolean));
  }
}
