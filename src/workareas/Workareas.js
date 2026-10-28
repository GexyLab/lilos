import { Emitter, trackDrag, openMenu, toast } from '@lilos/sdk';
import { setLaunchScope } from '../apps/launcher.js';
import { DesktopItem } from '../desktop/DesktopItem.js';
import { WorkareaFrame, HEADER } from './WorkareaFrame.js';
import { openProperties } from './properties.js';
import { loadWorkareas, saveWorkareas, newWorkarea, cleanTitle, cleanMeta, cleanSavedWindow, MIN_SIZE, LIMITS } from './store.js';

const DEFAULT_SIZE = { w: 720, h: 460 };
const PAD = 24;           // around the selection, when a workarea is made from it
const GAP = 40;           // between areas, when one has to make room
const SAVE_DELAY = 400;
const ICON_PREFIX = 'wa:';

const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const contains = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Workareas: areas of the desk that keep what is inside them — desk items and windows, in the
 * state they are in. Membership is geometric: an item or a window belongs to the open area that
 * contains its center, so moving it in or out (or resizing the area) includes or excludes it.
 * Open areas never overlap.
 *
 * Reduced to an icon, a workarea hides its items, closes its windows saving their state
 * (Window.getState) and leaves an icon on the desk; opening the icon brings everything back and
 * frames the area. Windows of open workareas are saved too and come back after a reload.
 *
 * The current workarea is the one the user is working in (last click on the desk, an item or a
 * window inside an area): the desk's requests act only on it — select all, arrange, show all,
 * rectangle selection started inside it, apps launched (their window opens there, and an app
 * window outside does not count as already open).
 *
 * Creating, renaming, moving, resizing and deleting go into the desk's undo history
 * (desktop.history); reducing to an icon and opening do not.
 *
 * Every workspace has its own workareas (saved under `key`): changing workspace calls load().
 *
 * Events: 'change' (id) — a workarea changed or was removed · 'current' (id | null)
 */
export class Workareas extends Emitter {
  #list = [];
  #areas = new Map();     // id → WorkareaFrame (open workareas)
  #icons = new Map();     // id → DesktopItem (reduced workareas)
  #current = null;
  #restoring = 0;         // windows being reopened: do not save the window lists meanwhile
  #saveTimer = 0;
  #key;

  constructor({ canvas, desktop, wm, launcher, key = 'workareas' }) {
    super();
    Object.assign(this, { canvas, desktop, wm, launcher });
    this.#key = key;
    desktop.workareas = this;
    canvas.fitScope = () => (this.#current && this.#areas.has(this.#current) ? this.get(this.#current).rect : null);
    setLaunchScope({
      includes: win => this.windowWorkarea(win) === this.#current,
      center: win => (this.#current ? this.centerOf(this.#current) : this.freeCenter(win)),
      bounds: () => (this.#current ? this.boundsOf(this.#current) : null),
    });

    this.#mountAll(true);

    this.#bindCurrent();
    canvas.on('change', () => this.#saveSoon());
    wm.on('open', () => this.#saveSoon());
    wm.on('close', () => this.#saveSoon());
    addEventListener('pagehide', () => this.#saveWindows());
  }

  /**
   * Takes the workareas of another workspace (saved under `key`): the current areas and icons go
   * away (call flush() first), the new ones are put on the desk — after Desktop.load(), which
   * brings their items. With reopen, the windows saved in the open areas are reopened (the first
   * time the workspace is shown); otherwise they are still open, hidden by the window manager.
   * Resolves when the windows are back.
   */
  async load(key, { reopen = true } = {}) {
    clearTimeout(this.#saveTimer);
    this.#areas.forEach(area => area.el.remove());
    this.#areas.clear();
    [...this.#icons.keys()].forEach(id => this.#hideIcon(id));
    this.setCurrent(null);
    this.#key = key;
    await Promise.all(this.#mountAll(reopen));
  }

  /** Saves the windows of the open areas now (before leaving the workspace). */
  flush() {
    clearTimeout(this.#saveTimer);
    this.#saveWindows();
  }

  /** Puts the saved workareas on the desk; returns the reopening of their windows. */
  #mountAll(reopen) {
    this.#list = loadWorkareas(this.#key);
    const reopening = [];
    for (const ws of this.#list) {
      if (ws.collapsed) {
        ws.items.forEach(id => this.desktop.items.get(id)?.el.setAttribute('hidden', ''));
        this.#showIcon(ws);
      } else {
        this.#mountArea(ws);
        if (reopen) reopening.push(this.#reopenWindows(ws));
        else ws.windows = [];   // still open, hidden: what is saved is refreshed from them
      }
    }
    this.canvas.changed();
    return reopening;
  }

  // ---------- Queries ----------

  get(id) {
    return this.#list.find(w => w.id === id) ?? null;
  }

  /** All workareas (copies). */
  list() {
    return structuredClone(this.#list);
  }

  get current() { return this.#current; }

  /** The open workarea whose area contains the world point, or null. */
  at(point) {
    return this.#list.find(w => !w.collapsed && contains(w.rect, point))?.id ?? null;
  }

  /** Desk items inside an open workarea (workarea icons excluded). */
  itemsIn(id) {
    const ws = this.get(id);
    if (!ws || ws.collapsed) return [];
    return this.desktop.visibleItems().filter(it => !it.workarea && contains(ws.rect, center(this.#itemRect(it))));
  }

  /** Windows inside an open workarea (minimized ones too). */
  windowsIn(id) {
    const ws = this.get(id);
    if (!ws || ws.collapsed) return [];
    return this.wm.windows.filter(win => contains(ws.rect, center(this.wm.geometry(win))));
  }

  /** The open workarea a window is in, or null. */
  windowWorkarea(win) {
    return this.at(center(this.wm.geometry(win)));
  }

  /** The open workarea a desk item is in, or null. */
  itemWorkarea(item) {
    return item.workarea ? null : this.at(center(this.#itemRect(item)));
  }

  /** { items, windows }: how much a workarea holds (app windows only). */
  contentOf(id) {
    const ws = this.get(id);
    if (!ws) return { items: 0, windows: 0 };
    if (ws.collapsed) return { items: ws.items.filter(i => this.desktop.items.has(i)).length, windows: ws.windows.length };
    return { items: this.itemsIn(id).length, windows: this.windowsIn(id).filter(w => this.wm.appOf(w)).length };
  }

  /**
   * Where a window opened outside every workarea goes: the middle of the view if no open area is
   * there, otherwise the nearest free place in the view, otherwise to the right of the areas.
   * null means "the middle of the view".
   */
  freeCenter(win) {
    const w = parseFloat(win?.el.style.width) || 640, hgt = parseFloat(win?.el.style.height) || 440;
    const v = this.canvas.viewRect();
    const c = center(v);
    const free = p => !this.#blocked({ x: p.x - w / 2 - 8, y: p.y - hgt / 2 - 8, w: w + 16, h: hgt + 16 });
    if (free(c)) return null;
    let best = null, dist = Infinity;
    for (let x = v.x + w / 2; x <= v.x + v.w - w / 2; x += 40) {
      for (let y = v.y + hgt / 2; y <= v.y + v.h - hgt / 2; y += 40) {
        const d = Math.hypot(x - c.x, y - c.y);
        if (d < dist && free({ x, y })) { best = { x, y }; dist = d; }
      }
    }
    if (best) return best;
    const right = Math.max(...this.#list.filter(a => !a.collapsed).map(a => a.rect.x + a.rect.w));
    return { x: right + GAP + w / 2, y: c.y };
  }

  /** The space for windows inside an open area: below its title bar, a little in from the edges. */
  boundsOf(id) {
    const ws = this.get(id);
    if (!ws || ws.collapsed) return null;
    const { x, y, w, h: hgt } = ws.rect;
    return { x: x + 8, y: y + HEADER + 8, w: w - 16, h: hgt - HEADER - 16 };
  }

  /** Where new windows of a workarea go: the middle of its visible part (or of the area). */
  centerOf(id) {
    const ws = this.get(id);
    if (!ws) return null;
    const r = ws.rect, v = this.canvas.viewRect();
    const x0 = Math.max(r.x, v.x), y0 = Math.max(r.y + HEADER, v.y), x1 = Math.min(r.x + r.w, v.x + v.w), y1 = Math.min(r.y + r.h, v.y + v.h);
    return x1 - x0 > 200 && y1 - y0 > 150 ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } : { x: r.x + r.w / 2, y: r.y + HEADER + (r.h - HEADER) / 2 };
  }

  // ---------- Creating and editing ----------

  /** New workarea with its area at `rect`; null (and a message) if it would cover another one. */
  create(rect, { title, rename = true } = {}) {
    if (this.#list.length >= LIMITS.MAX_WORKAREAS) return this.#say(`Al massimo ${LIMITS.MAX_WORKAREAS} workarea`), null;
    const r = { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(Math.max(MIN_SIZE.w, rect.w)), h: Math.round(Math.max(MIN_SIZE.h, rect.h)) };
    if (this.#blocked(r)) return this.#say('Lì c’è già un’altra workarea: le aree non possono sovrapporsi'), null;
    const ws = newWorkarea(r, title);
    this.#list.push(ws);
    this.#mountArea(ws);
    this.#save(ws.id);
    this.setCurrent(ws.id);
    this.canvas.bringIntoView(ws.rect);
    // Creating and naming are one step for undo
    if (rename) this.renameInPlace(ws.id, { record: false }).then(() => this.#recordCreated(ws.id));
    else this.#recordCreated(ws.id);
    return ws.id;
  }

  #recordCreated(id) {
    if (!this.get(id)) return;
    let copy = null;
    this.desktop.history.push({
      label: `Crea la workarea «${this.get(id).title}»`,
      undo: async () => {
        if (!this.get(id)) throw new Error('La workarea non esiste più');
        copy = await this.remove(id, { record: false });
      },
      redo: () => this.#putBack(copy),
    });
  }

  /** Brings back a deleted workarea (undo), open in the same place: what lies inside it belongs to it again. */
  #putBack(copy) {
    if (!copy || this.get(copy.id)) throw new Error('La workarea c’è già');
    if (this.#blocked(copy.rect)) throw new Error('Lì ora c’è un’altra workarea');
    const ws = structuredClone(copy);
    this.#list.push(ws);
    this.#mountArea(ws);
    this.setCurrent(ws.id);
    this.#save(ws.id);
    this.canvas.changed();
  }

  /** New workarea of the default size centered on a world point (menu "Nuovo → Workarea"). */
  createAt(point) {
    return this.create({ x: point.x - DEFAULT_SIZE.w / 2, y: point.y - HEADER, ...DEFAULT_SIZE });
  }

  /** New workarea around desk items (and nothing else outside them). */
  createAround(items) {
    if (!items.length) return null;
    const rects = items.map(it => this.#itemRect(it));
    const x = Math.min(...rects.map(r => r.x)) - PAD, y = Math.min(...rects.map(r => r.y)) - PAD - HEADER;
    const w = Math.max(...rects.map(r => r.x + r.w)) + PAD - x, hgt = Math.max(...rects.map(r => r.y + r.h)) + PAD - y;
    return this.create({ x, y, w, h: hgt });
  }

  /** record: also into the desk's undo history (renaming from the title bar or the icon). */
  rename(id, title, { record = false } = {}) {
    const ws = this.get(id);
    const clean = cleanTitle(title);
    if (!ws || !clean || clean === ws.title) return;
    const before = ws.title;
    ws.title = clean;
    this.#touch(ws);
    if (!record) return;
    const set = value => {
      const w = this.get(id);
      if (!w) throw new Error('La workarea non esiste più');
      w.title = value;
      this.#touch(w);
    };
    this.desktop.history.push({ label: `Rinomina la workarea «${before}» in «${clean}»`, undo: () => set(before), redo: () => set(clean) });
  }

  /** Description and custom metadata. */
  update(id, { description, meta } = {}) {
    const ws = this.get(id);
    if (!ws) return;
    if (typeof description === 'string') ws.description = description.slice(0, LIMITS.MAX_DESCRIPTION);
    if (meta) ws.meta = cleanMeta(meta);
    this.#touch(ws);
  }

  async renameInPlace(id, { record = true } = {}) {
    const area = this.#areas.get(id);
    if (!area) return;
    const title = await area.editTitle();
    if (title) this.rename(id, title, { record });
  }

  properties(id) {
    openProperties(this.wm, this, id);
  }

  // ---------- Reduce to an icon / open ----------

  /**
   * Hides the items, closes the windows (asking first those with unsaved changes) and leaves an
   * icon. Resolves false if a window did not want to close.
   */
  async collapse(id) {
    const ws = this.get(id);
    if (!ws || ws.collapsed) return false;
    const windows = this.windowsIn(id);
    for (const win of windows) {
      if (win.canClose && !(await win.canClose())) return false;
    }
    if (ws.collapsed || !this.get(id)) return false;   // changed while asking
    ws.windows = windows.filter(win => this.wm.appOf(win)).map(win => this.#savedWindow(win)).filter(Boolean);
    windows.forEach(win => this.wm.close(win));
    const items = this.itemsIn(id);
    ws.items = items.map(it => it.id);
    this.desktop.select([...this.desktop.selection].filter(it => !items.includes(it)));
    items.forEach(it => { it.el.hidden = true; });
    ws.collapsed = true;
    this.#areas.get(id)?.el.remove();
    this.#areas.delete(id);
    this.#showIcon(ws);
    if (this.#current === id) this.setCurrent(null);
    this.#save(id);
    this.canvas.changed();
    return true;
  }

  /** Brings the area back with its items and windows and frames it. */
  async expand(id, { frame = true } = {}) {
    const ws = this.get(id);
    if (!ws || !ws.collapsed) return;
    this.#makeRoom(ws);
    this.#hideIcon(id);
    ws.items.forEach(i => { const it = this.desktop.items.get(i); if (it) it.el.hidden = false; });
    ws.items = [];
    ws.collapsed = false;
    this.#mountArea(ws);
    this.setCurrent(id);
    if (frame) this.canvas.frame(ws.rect, 40, 1);
    this.#save(id);
    this.canvas.changed();
    await this.#reopenWindows(ws);
  }

  /**
   * Deletes the workarea only: its items and windows stay on the desk. Resolves with a copy of it
   * as it was (open) when deleted. record: into the desk's undo history (undo brings it back).
   */
  async remove(id, { record = true } = {}) {
    const ws = this.get(id);
    if (!ws) return null;
    if (ws.collapsed) await this.expand(id, { frame: false });
    if (!this.get(id)) return null;
    const copy = { ...structuredClone(ws), windows: [], items: [] };
    this.#areas.get(id)?.el.remove();
    this.#areas.delete(id);
    this.#list = this.#list.filter(w => w.id !== id);
    if (this.#current === id) this.setCurrent(null);
    saveWorkareas(this.#list, this.#key);
    this.emit('change', id);
    this.canvas.changed();
    if (record) {
      this.desktop.history.push({
        label: `Elimina la workarea «${copy.title}»`,
        undo: () => this.#putBack(copy),
        redo: () => { if (!this.get(id)) throw new Error('La workarea non esiste più'); return this.remove(id, { record: false }); },
      });
    }
    return copy;
  }

  /** Asks (with a small menu at x, y) before deleting workareas. */
  confirmRemove(ids, x, y) {
    const list = ids.map(id => this.get(id)).filter(Boolean);
    if (!list.length) return;
    const what = list.length === 1 ? `la workarea «${list[0].title}»` : `${list.length} workarea`;
    openMenu(x, y, [
      { label: `Elimina ${what} (il contenuto resta sulla scrivania)`, icon: 'trash', danger: true, action: () => list.forEach(w => this.remove(w.id)) },
      { label: 'Annulla', icon: 'x', action: () => {} },
    ]);
  }

  setCurrent(id) {
    if (id === this.#current) return;
    this.#current = id;
    for (const [aid, area] of this.#areas) area.setCurrent(aid === id);
    this.emit('current', id);
  }

  // ---------- Moving ----------

  /** Moves an open workarea with everything inside it (title bar dragged). */
  #drag(e, id) {
    const ws = this.get(id);
    this.setCurrent(id);
    const start = { ...ws.rect };
    const items = this.itemsIn(id).map(it => ({ it, x: it.data.x, y: it.data.y }));
    const windows = this.windowsIn(id).map(win => ({ win, ...this.wm.geometry(win) }));
    const area = this.#areas.get(id);
    let applied = { dx: 0, dy: 0 };
    area.el.classList.add('moving');
    trackDrag(e, {
      threshold: 3,
      onMove: (mx, my) => {
        const s = this.canvas.cam.s;
        const dx = Math.round(mx / s), dy = Math.round(my / s);
        const rect = { ...start, x: start.x + dx, y: start.y + dy };
        if (this.#blocked(rect, id)) return;   // would cover another area: stay at the last good place
        applied = { dx, dy };
        ws.rect = rect;
        area.setRect(rect);
        items.forEach(g => g.it.moveTo(g.x + dx, g.y + dy));
        windows.forEach(g => g.win.moveTo(g.x + dx, g.y + dy));
        this.canvas.changed();
      },
      onEnd: moved => {
        area.el.classList.remove('moving');
        if (!moved || (!applied.dx && !applied.dy)) return;
        this.desktop.save();
        this.#touch(ws);
        const { dx, dy } = applied;
        const at = (rect, k) => ({
          rect: { ...rect, x: start.x + dx * k, y: start.y + dy * k },
          items: items.map(g => [g.it.id, g.x + dx * k, g.y + dy * k]),
          windows: windows.map(g => [g.win, g.x + dx * k, g.y + dy * k]),
        });
        this.#recordPlace(id, `Sposta la workarea «${ws.title}»`, at(start, 0), at(start, 1));
      },
    });
  }

  /** Resizes an open workarea from an edge; what ends up outside leaves it. */
  #resize(e, id, edge) {
    e.preventDefault();
    e.stopPropagation();
    const ws = this.get(id);
    this.setCurrent(id);
    const r0 = { ...ws.rect };
    const area = this.#areas.get(id);
    area.el.classList.add('resizing');
    trackDrag(e, {
      threshold: 0,
      onMove: (mx, my) => {
        const s = this.canvas.cam.s;
        const dx = mx / s, dy = my / s;
        let { x, y, w, h: hgt } = r0;
        if (edge.includes('e')) w = Math.max(MIN_SIZE.w, r0.w + dx);
        if (edge.includes('s')) hgt = Math.max(MIN_SIZE.h, r0.h + dy);
        if (edge.includes('w')) { w = Math.max(MIN_SIZE.w, r0.w - dx); x = r0.x + r0.w - w; }
        if (edge.includes('n')) { hgt = Math.max(MIN_SIZE.h, r0.h - dy); y = r0.y + r0.h - hgt; }
        const rect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hgt) };
        if (this.#blocked(rect, id)) return;
        ws.rect = rect;
        area.setRect(rect);
        this.canvas.changed();
      },
      onEnd: () => {
        area.el.classList.remove('resizing');
        this.#touch(ws);
        if (JSON.stringify(r0) !== JSON.stringify(ws.rect)) {
          this.#recordPlace(id, `Ridimensiona la workarea «${ws.title}»`, { rect: r0 }, { rect: { ...ws.rect } });
        }
      },
    });
  }

  /**
   * Undo entry for moving or resizing an open area: each side is { rect, items?: [[id, x, y]],
   * windows?: [[win, x, y]] }; items and windows no longer there are skipped.
   */
  #recordPlace(id, label, before, after) {
    const apply = place => {
      const ws = this.get(id);
      if (!ws || ws.collapsed) throw new Error('La workarea non è aperta');
      if (this.#blocked(place.rect, id)) throw new Error('Lì ora c’è un’altra workarea');
      ws.rect = { ...place.rect };
      this.#areas.get(id)?.setRect(ws.rect);
      for (const [itemId, x, y] of place.items ?? []) this.desktop.items.get(itemId)?.moveTo(x, y);
      for (const [win, x, y] of place.windows ?? []) if (this.wm.windows.includes(win)) win.moveTo(x, y);
      this.desktop.save();
      this.#touch(ws);
      this.canvas.changed();
    };
    this.desktop.history.push({ label, undo: () => apply(before), redo: () => apply(after) });
  }

  /** A workarea icon was dropped somewhere: the (hidden) area and its content follow it. */
  iconMoved(item) {
    const ws = this.get(item.workarea);
    if (!ws) return;
    const dx = item.data.x - ws.rect.x, dy = item.data.y - ws.rect.y;
    if (!dx && !dy) return;
    this.#shift(ws, dx, dy);
    this.#save(ws.id);
  }

  // ---------- Menus ----------

  /** Entries for the menu of the area's background and title bar. */
  menuEntries(id) {
    const ws = this.get(id);
    return [
      { label: `Workarea «${ws.title}»`, icon: 'workarea', disabled: true },
      { label: 'Rinomina la workarea', icon: 'pencil', action: () => this.renameInPlace(id) },
      { label: 'Proprietà…', icon: 'info', action: () => this.properties(id) },
      { label: 'Riduci a icona', icon: 'minus', action: () => this.collapse(id) },
      { label: 'Elimina la workarea…', icon: 'trash', danger: true, action: () => {
        const r = this.#areas.get(id)?.head.getBoundingClientRect();
        this.confirmRemove([id], r ? r.left + 40 : innerWidth / 2, r ? r.bottom : innerHeight / 2);
      } },
    ];
  }

  // ---------- Internals ----------

  #mountArea(ws) {
    const area = new WorkareaFrame(ws, {
      onMove: e => this.#drag(e, ws.id),
      onResize: (e, edge) => this.#resize(e, ws.id, edge),
      onCollapse: () => this.collapse(ws.id),
      onProperties: () => this.properties(ws.id),
      onRename: () => this.renameInPlace(ws.id),
      onMenu: e => { this.setCurrent(ws.id); openMenu(e.clientX, e.clientY, this.menuEntries(ws.id)); },
    });
    this.#areas.set(ws.id, area);
    // Under everything else on the desk
    this.canvas.world.prepend(area.el);
    area.el.classList.add('obj');
    area.setCurrent(this.#current === ws.id);
  }

  #showIcon(ws) {
    const item = new DesktopItem({ id: ICON_PREFIX + ws.id, type: 'workarea', name: ws.title, x: ws.rect.x, y: ws.rect.y });
    item.workarea = ws.id;
    item.el.title = ws.description ? `${ws.title}\n${ws.description}` : ws.title;
    this.#icons.set(ws.id, item);
    this.desktop.addItem(item);
  }

  #hideIcon(id) {
    const item = this.#icons.get(id);
    if (!item) return;
    this.desktop.removeItem(item.id);
    this.#icons.delete(id);
  }

  /** Reopens the saved windows of an open workarea, one after the other, in their place. */
  async #reopenWindows(ws) {
    const saved = ws.windows;
    if (!saved.length) return;
    this.#restoring++;
    try {
      for (const w of saved) await this.launcher.restore(w);
    } finally {
      this.#restoring--;
      ws.windows = [];
      this.#saveSoon();
    }
  }

  #savedWindow(win) {
    let state = null;
    try { state = win.getState?.() ?? null; } catch (err) { console.warn('[lilos] stato della finestra non salvato:', err); }
    const g = this.wm.geometry(win);
    return cleanSavedWindow({ app: this.wm.appOf(win), state, rect: { x: g.x, y: g.y, w: g.w, h: g.h, minimized: g.minimized } });
  }

  /** The window lists of the open workareas, as they are now. */
  #saveWindows() {
    if (this.#restoring) return;
    let changed = false;
    for (const ws of this.#list) {
      if (ws.collapsed) continue;
      const windows = this.windowsIn(ws.id).filter(win => this.wm.appOf(win)).map(win => this.#savedWindow(win)).filter(Boolean);
      if (JSON.stringify(windows) !== JSON.stringify(ws.windows)) { ws.windows = windows; changed = true; }
    }
    if (changed) saveWorkareas(this.#list, this.#key);
  }

  #saveSoon() {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => this.#saveWindows(), SAVE_DELAY);
  }

  #save(id) {
    saveWorkareas(this.#list, this.#key);
    this.emit('change', id);
  }

  #touch(ws) {
    ws.modified = Date.now();
    this.#areas.get(ws.id)?.update(ws);
    const icon = this.#icons.get(ws.id);
    if (icon) {
      icon.setData({ name: ws.title });
      icon.el.title = ws.description ? `${ws.title}\n${ws.description}` : ws.title;
    }
    this.#save(ws.id);
  }

  /** True if the rect would cover an open area (other than `except`). */
  #blocked(rect, except = null) {
    return this.#list.some(w => w.id !== except && !w.collapsed && overlaps(w.rect, rect));
  }

  /** Before opening: if the area would cover an open one, move it (with its content) to the right. */
  #makeRoom(ws) {
    let guard = 0;
    while (this.#blocked(ws.rect, ws.id) && guard++ < LIMITS.MAX_WORKAREAS) {
      const right = Math.max(...this.#list.filter(w => w.id !== ws.id && !w.collapsed && overlaps(w.rect, ws.rect)).map(w => w.rect.x + w.rect.w));
      this.#shift(ws, right + GAP - ws.rect.x, 0);
    }
  }

  /** Moves a reduced workarea: area, hidden items, saved windows, icon. */
  #shift(ws, dx, dy) {
    ws.rect = { ...ws.rect, x: ws.rect.x + dx, y: ws.rect.y + dy };
    for (const id of ws.items) {
      const it = this.desktop.items.get(id);
      if (it) it.moveTo(it.data.x + dx, it.data.y + dy);
    }
    ws.windows = ws.windows.map(w => ({ ...w, rect: { ...w.rect, x: w.rect.x + dx, y: w.rect.y + dy } }));
    this.#icons.get(ws.id)?.moveTo(ws.rect.x, ws.rect.y);
    this.desktop.save();
  }

  #itemRect(item) {
    return { x: item.data.x, y: item.data.y, w: item.el.offsetWidth || 86, h: item.el.offsetHeight || 64 };
  }

  /** The workarea being worked in follows the pointer: desk, items, title bars and windows. */
  #bindCurrent() {
    this.canvas.el.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      if (e.target.closest('.window')) return;   // windows: see 'focus'
      const area = e.target.closest('.wa-area');
      this.setCurrent(area ? area.dataset.id : this.at(this.canvas.toWorld(e.clientX, e.clientY)));
    }, true);
    this.wm.on('focus', win => { if (win) this.setCurrent(this.windowWorkarea(win)); });
  }

  #say(text) {
    toast(text);
  }
}

