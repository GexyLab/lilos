import { trackDrag, bus, fs, storage, openMenu, shortcuts, selectionGesture } from '@lilos/sdk';
import { launch } from '../apps/registry.js';
import { openFile } from '../apps/open.js';
import { addTarget } from '../items/targets.js';
import { confirmRemove } from '../items/confirmRemove.js';
import { selectionMode } from '../systemSettings.js';
import { DesktopItem } from './DesktopItem.js';

const LAYOUT_KEY = 'desktop-layout';
const SNAP = 8;
const CELL = { w: 92, h: 84 };
const MARGIN = 16;
const ROWS = 8;
const TYPE_ORDER = { folder: 0, file: 1, app: 2 };

const snap = v => Math.round(v / SNAP) * SNAP;

/** Places items in columns, top to bottom, starting at (x, y). Mutates and returns the items. */
function layoutColumns(items, { x = MARGIN, y = MARGIN, rows = ROWS } = {}) {
  items.forEach((it, i) => {
    it.x = x + Math.floor(i / rows) * CELL.w;
    it.y = y + (i % rows) * CELL.h;
  });
  return items;
}

/**
 * The desk as a view of a folder of the file system (/Scrivania): one DesktopItem per node,
 * free positions saved apart ('lilos:desktop-layout', { id: [x, y] }).
 * Creating, renaming and removing go through `fs`; the view follows its 'change' events,
 * so changes made elsewhere (File Manager) show up here too.
 * Opening an item launches apps and emits 'item:open' for folders and files.
 */
export class Desktop {
  /** False while something else (a window) has the keyboard. */
  keyboard = true;
  /** Align items to the grid when dropped. */
  snapToGrid = true;

  #layout;
  #placeNext = null; // world position for the next node created by this view

  constructor(canvas, folderId) {
    this.canvas = canvas;
    this.folder = folderId;
    this.items = new Map();
    this.selection = new Set();

    const saved = storage.get(LAYOUT_KEY, {});
    this.#layout = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    fs.children(folderId).forEach(node => this.#mount(node));
    this.save();

    fs.on('change', e => this.#sync(e));
    canvas.on('background:press', e => this.#selectByDrag(e));
    canvas.on('background:click', e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) this.select([]); });
    canvas.on('background:contextmenu', e => this.#backgroundMenu(e));
    addTarget({
      isActive: () => this.keyboard,
      selectionSize: () => this.selection.size,
      open: () => [...this.selection].forEach(it => this.open(it)),
      rename: () => this.rename([...this.selection][0]),
      remove: () => this.remove([...this.selection]),
      selectAll: () => this.select([...this.items.values()]),
      deselect: () => this.select([]),
    });
  }

  /** Saves the positions. */
  save() {
    storage.set(LAYOUT_KEY, Object.fromEntries([...this.items].map(([id, it]) => [id, [it.data.x, it.data.y]])));
  }

  // ---------- Selection ----------

  select(items) {
    this.selection.forEach(it => it.setSelected(false));
    this.selection = new Set(items);
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
    if (item.data.type === 'app') launch(item.data.app);
    else bus.emit('item:open', fs.get(item.id));
  }

  /** New folder or text file centered on a world point, then straight into rename. */
  create(type, at) {
    this.#placeNext = { x: snap(at.x - CELL.w / 2), y: snap(at.y - 24) };
    const node = fs.create(this.folder, { type, name: type === 'folder' ? 'Nuova cartella' : 'Nuovo file.txt' });
    const item = this.items.get(node.id);
    this.select([item]);
    this.rename(item);
  }

  async rename(item) {
    const name = await item.editName();
    if (name && fs.exists(item.id)) fs.rename(item.id, name);
  }

  /** Permanent; asks first when folders with something inside are involved. */
  remove(items) {
    const r = items[0]?.el.getBoundingClientRect();
    confirmRemove(items.map(it => it.id), r ? r.left + r.width / 2 : innerWidth / 2, r ? r.bottom : innerHeight / 2);
  }

  /** Sort (folders, files, apps — then by name) and line up in the visible area. */
  arrange() {
    const v = this.canvas.viewRect();
    const sorted = [...this.items.values()].sort((a, b) =>
      TYPE_ORDER[a.data.type] - TYPE_ORDER[b.data.type] || a.data.name.localeCompare(b.data.name, 'it', { numeric: true }));
    const slots = layoutColumns(sorted.map(() => ({})), {
      x: snap(v.x + MARGIN), y: snap(v.y + MARGIN),
      rows: Math.max(1, Math.floor((v.h - MARGIN * 2) / CELL.h)),
    });
    sorted.forEach((item, i) => item.moveTo(slots[i].x, slots[i].y));
    this.canvas.changed();
    this.save();
  }

  // ---------- Internals ----------

  #sync(e) {
    if (e.type === 'create' && e.parent === this.folder) {
      this.#mount(e.node);
      this.save();
    } else if ((e.type === 'rename' || e.type === 'update') && this.items.has(e.node.id)) {
      this.items.get(e.node.id).setData(e.node);
    } else if (e.type === 'remove') {
      const gone = e.ids.filter(id => this.items.has(id));
      if (!gone.length) return;
      for (const id of gone) {
        const item = this.items.get(id);
        item.el.remove();
        this.items.delete(id);
        this.selection.delete(item);
      }
      this.canvas.changed();
      this.save();
    }
  }

  #mount(node) {
    const pos = this.#placeNext ?? this.#savedPosition(node.id) ?? this.#freeSlot();
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

  /** First grid slot from the top-left corner of the desk that no item occupies. */
  #freeSlot() {
    const taken = new Set([...this.items.values()].map(it => `${it.data.x},${it.data.y}`));
    for (let i = 0; ; i++) {
      const slot = { x: MARGIN + Math.floor(i / ROWS) * CELL.w, y: MARGIN + (i % ROWS) * CELL.h };
      if (!taken.has(`${slot.x},${slot.y}`)) return slot;
    }
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
    const rects = [...this.items.values()].map(it => [it, it.el.getBoundingClientRect()]);
    selectionGesture(e, {
      container: this.canvas.el,
      mode,
      onUpdate: hit => this.select(new Set([...base, ...rects.filter(([, r]) => hit(r)).map(([it]) => it)])),
    });
  }

  /** Drags the whole selection. A plain click on an already selected item narrows the selection to it. */
  #drag(e, item, narrowOnClick) {
    const group = [...this.selection].map(it => ({ it, x: it.data.x, y: it.data.y }));
    trackDrag(e, {
      threshold: 4,
      onMove: (dx, dy) => {
        const s = this.canvas.cam.s;
        for (const g of group) {
          g.it.el.classList.add('dragging');
          g.it.moveTo(g.x + dx / s, g.y + dy / s);
        }
        this.canvas.changed();
      },
      onEnd: moved => {
        if (!moved) {
          if (narrowOnClick) this.select([item]);
          return;
        }
        for (const { it } of group) {
          it.el.classList.remove('dragging');
          if (this.snapToGrid) it.moveTo(snap(it.data.x), snap(it.data.y));
        }
        this.canvas.changed();
        this.save();
      },
    });
  }

  #backgroundMenu(e) {
    const at = this.canvas.toWorld(e.clientX, e.clientY);
    openMenu(e.clientX, e.clientY, [
      { label: 'Nuova cartella', icon: 'folderPlus', action: () => this.create('folder', at) },
      { label: 'Nuovo file di testo', icon: 'filePlus', action: () => this.create('file', at) },
      '-',
      { label: 'Apri la Scrivania in File', icon: 'folder', action: () => launch('files', { folder: this.folder }) },
      { label: 'Riordina icone', icon: 'grid', action: () => this.arrange() },
      { label: 'Mostra tutto', icon: 'fit', shortcut: shortcuts.label('desk.fit'), action: () => this.canvas.fit() },
      { label: 'Zoom al 100%', icon: 'zoom', shortcut: shortcuts.label('desk.zoomReset'), action: () => this.canvas.resetZoom() },
    ]);
  }

  #itemMenu(e, item) {
    const selected = [...this.selection];
    const many = selected.length > 1;
    openMenu(e.clientX, e.clientY, [
      { label: many ? `Apri ${selected.length} elementi` : 'Apri', icon: 'open', shortcut: shortcuts.label('items.open'), action: () => selected.forEach(it => this.open(it)) },
      !many && item.data.type === 'file' && { label: 'Apri con…', icon: 'open', action: () => openFile(fs.get(item.id), { choose: true }) },
      { label: 'Rinomina', icon: 'pencil', shortcut: shortcuts.label('items.rename'), disabled: many, action: () => this.rename(item) },
      '-',
      { label: many ? `Elimina ${selected.length} elementi` : 'Elimina', icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, action: () => this.remove(selected) },
    ].filter(Boolean));
  }
}
