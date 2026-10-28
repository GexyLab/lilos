import { isEditing, trackDrag } from '../core/dom.js';
import { bus } from '../core/events.js';
import { storage, uid } from '../core/storage.js';
import { launch } from '../apps/registry.js';
import { openMenu } from '../ui/ContextMenu.js';
import { DesktopItem } from './DesktopItem.js';
import { splitName } from './fileTypes.js';
import { seedItems } from './seed.js';

const STORAGE_KEY = 'desktop';
const SNAP = 8;
const CELL = { w: 92, h: 84 };
const MARGIN = 16;
const TYPE_ORDER = { folder: 0, file: 1, app: 2 };

const snap = v => Math.round(v / SNAP) * SNAP;

/** Places items in columns, top to bottom, starting at (x, y). Mutates and returns the items. */
function layoutColumns(items, { x = MARGIN, y = MARGIN, rows = 8 } = {}) {
  items.forEach((it, i) => {
    it.x = x + Math.floor(i / rows) * CELL.w;
    it.y = y + (i % rows) * CELL.h;
  });
  return items;
}

/**
 * Desktop items on the canvas: selection, drag, rename, delete, context menus, persistence.
 * Opening an item emits 'app:launch' (apps) or 'item:open' (folders/files) on the bus.
 */
export class Desktop {
  constructor(canvas) {
    this.canvas = canvas;
    this.items = new Map();
    this.selection = new Set();

    const saved = storage.get(STORAGE_KEY);
    const data = Array.isArray(saved) ? saved : layoutColumns(seedItems.map(d => ({ id: uid(), ...d })));
    data.forEach(d => this.#mount(d));
    if (!Array.isArray(saved)) this.save();

    canvas.on('background:click', () => this.select([]));
    canvas.on('background:contextmenu', e => this.#backgroundMenu(e));
    addEventListener('keydown', e => this.#onKey(e));
  }

  save() {
    storage.set(STORAGE_KEY, [...this.items.values()].map(it => it.data));
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
    else bus.emit('item:open', { ...item.data });
  }

  /** New folder or text file centered on a world point, then straight into rename. */
  create(type, at) {
    const name = this.#uniqueName(type === 'folder' ? 'Nuova cartella' : 'Nuovo file.txt');
    const item = this.#mount({ id: uid(), type, name, x: snap(at.x - CELL.w / 2), y: snap(at.y - 24) });
    this.save();
    this.select([item]);
    this.rename(item);
  }

  async rename(item) {
    const name = await item.editName();
    if (!name) return;
    item.setName(this.#uniqueName(name, item));
    this.save();
  }

  remove(items) {
    for (const item of items) {
      item.el.remove();
      this.items.delete(item.id);
      this.selection.delete(item);
    }
    this.canvas.changed();
    this.save();
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

  #mount(data) {
    const item = new DesktopItem(data);
    this.items.set(item.id, item);
    this.#bind(item);
    this.canvas.add(item.el);
    return item;
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
          it.moveTo(snap(it.data.x), snap(it.data.y));
        }
        this.canvas.changed();
        this.save();
      },
    });
  }

  #uniqueName(name, except) {
    const taken = new Set([...this.items.values()].filter(it => it !== except).map(it => it.data.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    const [base, ext] = splitName(name);
    for (let n = 2; ; n++) {
      const candidate = ext ? `${base} ${n}.${ext}` : `${base} ${n}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  #backgroundMenu(e) {
    const at = this.canvas.toWorld(e.clientX, e.clientY);
    openMenu(e.clientX, e.clientY, [
      { label: 'Nuova cartella', icon: 'folderPlus', action: () => this.create('folder', at) },
      { label: 'Nuovo file di testo', icon: 'filePlus', action: () => this.create('file', at) },
      '-',
      { label: 'Riordina icone', icon: 'grid', action: () => this.arrange() },
      { label: 'Mostra tutto', icon: 'fit', shortcut: 'Shift 1', action: () => this.canvas.fit() },
      { label: 'Zoom al 100%', icon: 'zoom', shortcut: 'Ctrl 0', action: () => this.canvas.resetZoom() },
    ]);
  }

  #itemMenu(e, item) {
    const selected = [...this.selection];
    const many = selected.length > 1;
    openMenu(e.clientX, e.clientY, [
      { label: many ? `Apri ${selected.length} elementi` : 'Apri', icon: 'open', shortcut: 'Invio', action: () => selected.forEach(it => this.open(it)) },
      { label: 'Rinomina', icon: 'pencil', shortcut: 'F2', disabled: many, action: () => this.rename(item) },
      '-',
      { label: many ? `Elimina ${selected.length} elementi` : 'Elimina', icon: 'trash', shortcut: 'Canc', danger: true, action: () => this.remove(selected) },
    ]);
  }

  #onKey(e) {
    if (isEditing()) return;
    const selected = [...this.selection];
    if (e.key === 'F2' && selected.length === 1) {
      e.preventDefault();
      this.rename(selected[0]);
    } else if (e.key === 'Enter' && selected.length) {
      selected.forEach(it => this.open(it));
    } else if (e.key === 'Delete' && selected.length) {
      this.remove(selected);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      this.select([...this.items.values()]);
    } else if (e.key === 'Escape') {
      this.select([]);
    }
  }
}
