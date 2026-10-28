import { Emitter, h, icon, trackDrag, shortcuts } from '@lilos/sdk';

const CASCADE = 24;
const Z_BASE = 100;

/** World rect from the inline position and size (also right for hidden windows). */
const styleRect = el => ({
  x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0,
  w: parseFloat(el.style.width) || el.offsetWidth, h: parseFloat(el.style.height) || el.offsetHeight,
});

/**
 * Hosts SDK Windows on the canvas: placement, focus and stacking, drag, resize from any enabled edge,
 * maximize (window as big as the screen, camera at 100% on it), minimize, close,
 * and one taskbar button per window. Controls a window has turned off are respected everywhere
 * (taskbar button, title bar double click, shortcuts).
 *
 * Workspaces: every window belongs to the workspace that was current when it opened. Only the
 * windows of the current workspace are shown, with their taskbar buttons, and only they count for
 * `windows`, get(key), focus and cycling; the others stay alive, hidden, as they were.
 *
 * Events: 'focus' (window | null) — null when the desk itself gets the focus; 'open' and 'close' (window).
 */
export class WindowManager extends Emitter {
  #order = [];          // bottom → top, every workspace
  #entries = new Map(); // window → { key, app, task, restore, workspace }
  #opened = 0;
  #workspace = null;
  #lastActive = new Map();   // workspace → its window that had the focus when the user left it
  active = null;

  constructor(canvas, taskbar) {
    super();
    this.canvas = canvas;
    this.taskbar = taskbar;
    // Pointer down anywhere on the desk outside a window: the desk takes the focus
    canvas.el.addEventListener('pointerdown', e => { if (!e.target.closest('.window')) this.focus(null); }, true);

    const group = 'Finestre';
    shortcuts.register({ id: 'windows.close', label: 'Chiudi la finestra attiva', group, keys: ['Alt+W'], whenEditing: true, when: () => !!this.active?.controls.close, run: () => this.requestClose(this.active) });
    shortcuts.register({ id: 'windows.next', label: 'Passa alla finestra successiva', group, keys: ['Alt+N'], whenEditing: true, when: () => this.windows.length > 0, run: () => this.cycle() });
  }

  /** Brings the bottom-most window to the front (restoring it if minimized): repeated, it visits them all. */
  cycle() {
    const order = this.windows;
    const next = order.length > 1 || this.#hidden(order[0]) || this.active !== order[0] ? order[0] : null;
    if (next) this.show(next);
  }

  /** The open window of the current workspace registered under `key`, if any. */
  get(key) {
    return [...this.#entries].find(([, e]) => e.key === key && e.workspace === this.#workspace)?.[0] ?? null;
  }

  /** Windows of the current workspace, bottom → top. */
  get windows() {
    return this.windowsOf(this.#workspace);
  }

  /** Windows of a workspace, bottom → top. */
  windowsOf(workspace) {
    return this.#order.filter(w => this.#entries.get(w).workspace === workspace);
  }

  /** The current workspace (null when workspaces are not in use). */
  get workspace() { return this.#workspace; }

  /** Shows the windows of `id` (focusing the one that had the focus there) and hides all the others. */
  setWorkspace(id) {
    if (id === this.#workspace) return;
    this.#lastActive.set(this.#workspace, this.active);
    this.#workspace = id;
    for (const [win, e] of this.#entries) {
      const away = e.workspace !== id;
      win.el.classList.toggle('ws-away', away);
      e.task.classList.toggle('ws-away', away);
    }
    const last = this.#lastActive.get(id);
    this.focus(last && this.#entries.has(last) && !this.#hidden(last) ? last : null);
    this.canvas.changed();
  }

  /**
   * Moves every window of another workspace into the current one, cascading in the middle of the
   * view (a workspace being deleted: its windows, unsaved text included, are not lost).
   */
  adopt(workspace) {
    if (workspace === this.#workspace) return;
    const v = this.canvas.viewRect();
    for (const win of this.windowsOf(workspace)) {
      const entry = this.#entries.get(win);
      entry.workspace = this.#workspace;
      win.el.classList.remove('ws-away');
      entry.task.classList.remove('ws-away');
      const r = styleRect(win.el);
      const shift = (this.#opened++ % 6) * CASCADE;
      win.moveTo(v.x + v.w / 2 - r.w / 2 + shift, v.y + v.h / 2 - r.h / 2 + shift);
    }
    this.#lastActive.delete(workspace);
    this.canvas.changed();
  }

  /** The app a window belongs to (as given to open), or null for secondary windows. */
  appOf(win) {
    return this.#entries.get(win)?.app ?? null;
  }

  /**
   * Position and state of a window in world coordinates: { x, y, w, h, minimized, maximized }.
   * A maximized window reports the size it gets back when restored.
   */
  geometry(win) {
    const restore = this.#entries.get(win)?.restore;
    const r = restore?.rect ?? styleRect(win.el);
    return { ...r, minimized: this.#hidden(win), maximized: !!restore };
  }

  /**
   * Places a new window and focuses it. By default at the center of the view (cascading);
   * `center` is a world point to center it on instead, `bounds` a world rect to keep it inside
   * (its top-left corner wins when it is too big); `at` ({ x, y, w?, h?, minimized? }) puts it
   * back exactly there without moving the camera (windows restored by a workarea).
   * `workspace` (the current one by default): a window for another workspace opens hidden, without
   * taking the focus, and shows up when the user goes there.
   */
  open(win, { key = null, app = null, center = null, bounds = null, at = null, workspace = this.#workspace } = {}) {
    const w = win.el.offsetWidth || parseFloat(win.el.style.width);
    const hgt = win.el.offsetHeight || parseFloat(win.el.style.height);
    if (at) {
      if (at.w && at.h) win.resizeTo(at.w, at.h);
      win.moveTo(at.x, at.y);
    } else {
      const v = this.canvas.viewRect();
      const c = center ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 };
      const shift = (this.#opened++ % 6) * CASCADE;
      let x = c.x - w / 2 + shift, y = c.y - hgt / 2 + shift;
      if (bounds) {
        x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.w - w));
        y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.h - hgt));
      }
      win.moveTo(x, y);
    }

    const task = h('button', {
      class: 'tb-task', type: 'button',
      // The active window's button minimizes it (if it can be minimized); otherwise it shows the window
      onclick: () => (this.active === win && !this.#hidden(win) && win.controls.minimize ? this.minimize(win) : this.show(win)),
    }, icon(win.glyph), h('span', {}, win.title));
    this.taskbar.tasks.append(task);

    this.#entries.set(win, { key, app, task, restore: null, workspace });
    this.#order.push(win);
    this.canvas.add(win.el);
    this.#bind(win, task);
    const away = workspace !== this.#workspace;
    win.el.classList.toggle('ws-away', away);
    task.classList.toggle('ws-away', away);
    if (at?.minimized && win.controls.minimize) {
      win.el.hidden = true;
      task.classList.add('min');
      this.canvas.changed();
    } else if (away) {
      win.el.hidden = false;
      this.canvas.changed();
    } else if (at) {
      win.el.hidden = false;
      this.focus(win);
      this.canvas.changed();
    } else {
      this.show(win);
    }
    this.emit('open', win);
    return win;
  }

  /** Restores (if minimized), focuses and frames the window. */
  show(win) {
    win.el.hidden = false;
    this.#entries.get(win)?.task.classList.remove('min');
    this.focus(win);
    this.canvas.changed();
    this.canvas.bringIntoView(this.canvas.rectOf(win.el));
  }

  focus(win) {
    if (win && this.#entries.get(win)?.workspace !== this.#workspace) return;   // unknown, or in another workspace
    if (win) {
      this.#order = [...this.#order.filter(w => w !== win), win];
      this.#order.forEach((w, i) => { w.el.style.zIndex = String(Z_BASE + i); });
    }
    for (const [w, e] of this.#entries) {
      w.setActive(w === win);
      e.task.classList.toggle('on', w === win);
    }
    if (this.active === win) return;
    this.active = win;
    this.emit('focus', win);
  }

  minimize(win) {
    win.el.hidden = true;
    this.#entries.get(win)?.task.classList.add('min');
    if (this.active === win) this.focus(this.#topVisible());
    this.canvas.changed();
  }

  /** Window as big as the screen with the camera at 100% on it; again to restore both. */
  toggleMaximize(win) {
    const entry = this.#entries.get(win);
    // Restoring is always allowed, so a window can get its size back after maximize is turned off
    if (!entry || (!entry.restore && !win.controls.maximize)) return;
    const { canvas } = this;
    if (entry.restore) {
      const { rect, cam } = entry.restore;
      entry.restore = null;
      win.moveTo(rect.x, rect.y);
      win.resizeTo(rect.w, rect.h);
      win.setMaximized(false);
      canvas.animateTo(cam.x, cam.y, cam.s);
    } else {
      const rect = canvas.rectOf(win.el);
      entry.restore = { rect, cam: { ...canvas.cam } };
      win.resizeTo(canvas.width, canvas.height);
      win.setMaximized(true);
      canvas.animateTo(-rect.x, -rect.y, 1);
    }
    canvas.changed();
  }

  /** Closing asked by the user (button, shortcut): the window may refuse or ask first (canClose). */
  async requestClose(win) {
    if (!this.#entries.has(win)) return false;
    if (win.canClose && !(await win.canClose())) return false;
    this.close(win);
    return true;
  }

  /** Closes right away, without asking the window. */
  close(win) {
    const entry = this.#entries.get(win);
    if (!entry) return;
    entry.task.remove();
    this.#entries.delete(win);
    this.#order = this.#order.filter(w => w !== win);
    win.destroy();
    if (this.active === win) this.focus(this.#topVisible());
    this.canvas.changed();
    this.emit('close', win);
  }

  // ---------- Internals ----------

  #hidden(win) {
    return win.el.hidden;
  }

  #topVisible() {
    return this.windows.reverse().find(w => !this.#hidden(w)) ?? null;
  }

  #bind(win, task) {
    const { signal } = win;
    win.on('minimize', () => this.minimize(win));
    win.on('maximize', () => this.toggleMaximize(win));
    win.on('close', () => this.requestClose(win));
    win.on('title', ({ title, subtitle }) => {
      task.lastChild.textContent = title;
      task.title = subtitle ? `${title} — ${subtitle}` : title;
    });
    task.title = win.subtitle ? `${win.title} — ${win.subtitle}` : win.title;

    win.el.addEventListener('pointerdown', () => this.focus(win), { capture: true, signal });
    win.el.addEventListener('focusin', () => this.focus(win), { signal });

    win.titlebar.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      const x0 = win.el.offsetLeft, y0 = win.el.offsetTop;
      win.el.classList.add('dragging');
      trackDrag(e, {
        onMove: (dx, dy) => {
          win.moveTo(x0 + dx / this.canvas.cam.s, y0 + dy / this.canvas.cam.s);
          this.canvas.changed();
        },
        onEnd: () => win.el.classList.remove('dragging'),
      });
    }, { signal });

    // Delegated: the window can turn edges on and off at any time
    win.el.addEventListener('pointerdown', e => {
      const edge = e.button === 0 && e.target.closest?.('.win-edge')?.dataset.edge;
      if (edge) this.#resize(win, edge, e);
    }, { signal });

    // Maximize turned off while maximized: give the window its size back
    win.on('controls', ({ controls }) => {
      if (!controls.maximize && this.#entries.get(win)?.restore) this.toggleMaximize(win);
    });
  }

  /** Resize from an edge ('n', 'se'…): the opposite side stays put; sizes respect the window limits. */
  #resize(win, edge, e) {
    e.preventDefault();
    const x0 = win.el.offsetLeft, y0 = win.el.offsetTop, w0 = win.el.offsetWidth, h0 = win.el.offsetHeight;
    win.el.classList.add('resizing');
    trackDrag(e, {
      threshold: 0,
      onMove: (dx, dy) => {
        const s = this.canvas.cam.s;
        let w = w0, hgt = h0;
        if (edge.includes('e')) w = w0 + dx / s;
        if (edge.includes('w')) w = w0 - dx / s;
        if (edge.includes('s')) hgt = h0 + dy / s;
        if (edge.includes('n')) hgt = h0 - dy / s;
        const size = win.constrain(w, hgt);
        win.resizeTo(size.w, size.h);
        win.moveTo(edge.includes('w') ? x0 + w0 - size.w : x0, edge.includes('n') ? y0 + h0 - size.h : y0);
        this.canvas.changed();
      },
      onEnd: () => win.el.classList.remove('resizing'),
    });
  }
}
