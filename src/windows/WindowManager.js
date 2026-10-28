import { Emitter, h, icon, trackDrag, shortcuts } from '@lilos/sdk';

const CASCADE = 24;
const Z_BASE = 100;

/**
 * Hosts SDK Windows on the canvas: placement, focus and stacking, drag, resize from any enabled edge,
 * maximize (window as big as the screen, camera at 100% on it), minimize, close,
 * and one taskbar button per window. Controls a window has turned off are respected everywhere
 * (taskbar button, title bar double click, shortcuts).
 *
 * Events: 'focus' (window | null) — null when the desk itself gets the focus.
 */
export class WindowManager extends Emitter {
  #order = [];          // bottom → top
  #entries = new Map(); // window → { key, task, restore }
  #opened = 0;
  active = null;

  constructor(canvas, taskbar) {
    super();
    this.canvas = canvas;
    this.taskbar = taskbar;
    // Pointer down anywhere on the desk outside a window: the desk takes the focus
    canvas.el.addEventListener('pointerdown', e => { if (!e.target.closest('.window')) this.focus(null); }, true);

    const group = 'Finestre';
    shortcuts.register({ id: 'windows.close', label: 'Chiudi la finestra attiva', group, keys: ['Alt+W'], whenEditing: true, when: () => !!this.active?.controls.close, run: () => this.requestClose(this.active) });
    shortcuts.register({ id: 'windows.next', label: 'Passa alla finestra successiva', group, keys: ['Alt+N'], whenEditing: true, when: () => this.#order.length > 0, run: () => this.cycle() });
  }

  /** Brings the bottom-most window to the front (restoring it if minimized): repeated, it visits them all. */
  cycle() {
    const next = this.#order.length > 1 || this.#hidden(this.#order[0]) || this.active !== this.#order[0] ? this.#order[0] : null;
    if (next) this.show(next);
  }

  /** The open window registered under `key`, if any. */
  get(key) {
    return [...this.#entries].find(([, e]) => e.key === key)?.[0] ?? null;
  }

  get windows() {
    return [...this.#order];
  }

  /** Places a new window at the center of the view (cascading) and focuses it. */
  open(win, { key = null } = {}) {
    const v = this.canvas.viewRect();
    const w = win.el.offsetWidth || parseFloat(win.el.style.width);
    const hgt = win.el.offsetHeight || parseFloat(win.el.style.height);
    const shift = (this.#opened++ % 6) * CASCADE;
    win.moveTo(v.x + (v.w - w) / 2 + shift, v.y + (v.h - hgt) / 2 + shift);

    const task = h('button', {
      class: 'tb-task', type: 'button',
      // The active window's button minimizes it (if it can be minimized); otherwise it shows the window
      onclick: () => (this.active === win && !this.#hidden(win) && win.controls.minimize ? this.minimize(win) : this.show(win)),
    }, icon(win.glyph), h('span', {}, win.title));
    this.taskbar.tasks.append(task);

    this.#entries.set(win, { key, task, restore: null });
    this.#order.push(win);
    this.canvas.add(win.el);
    this.#bind(win, task);
    this.show(win);
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
    if (win && !this.#entries.has(win)) return;
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
  }

  // ---------- Internals ----------

  #hidden(win) {
    return win.el.hidden;
  }

  #topVisible() {
    return [...this.#order].reverse().find(w => !this.#hidden(w)) ?? null;
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
