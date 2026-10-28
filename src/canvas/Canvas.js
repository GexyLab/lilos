import { Emitter, h, isEditing, trackDrag, storage, shortcuts } from '@lilos/sdk';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const GRID = 24;

const reducedMotion = () =>
  document.documentElement.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;

const clampZoom = s => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s));

export function union(rects) {
  const x = Math.min(...rects.map(r => r.x));
  const y = Math.min(...rects.map(r => r.y));
  return {
    x, y,
    w: Math.max(...rects.map(r => r.x + r.w)) - x,
    h: Math.max(...rects.map(r => r.y + r.h)) - y,
  };
}

/**
 * Infinite desk. Objects live in world coordinates inside `world`; the camera
 * (x, y = screen translation in px, s = zoom) decides what is visible.
 *
 * Input: wheel = zoom at cursor (Ctrl/pinch zooms even over [data-wheel="native"] elements),
 * middle button / Space+drag (one finger on touch screens) = pan; left button on empty space is
 * left to listeners ('background:press'), e.g. for selection.
 *
 * Events:
 *   'camera'                   camera moved or zoomed
 *   'change'                   camera or objects changed (minimap redraw)
 *   'background:press'         left button pressed on empty space (PointerEvent), not panning
 *   'background:click'         click on empty space without moving (PointerEvent)
 *   'background:contextmenu'   right click on empty space (MouseEvent)
 */
export class Canvas extends Emitter {
  #anim = 0;
  #saveTimer = 0;
  #space = false;
  #key;

  /** `key`: where the camera is saved ('lilos:<key>'); every workspace has its own. */
  constructor(parent, { key = 'camera' } = {}) {
    super();
    this.#key = key;
    this.cam = this.#savedCamera();

    this.world = h('div', { class: 'world' });
    this.el = h('div', { class: 'canvas' }, this.world);
    parent.append(this.el);

    this.#bindPointer();
    this.#bindWheel();
    this.#bindKeys();
    addEventListener('resize', () => this.#apply());
    this.#apply();
  }

  /**
   * Saves the camera under the current key now, then takes the one saved under `key` (another
   * workspace's view), without animation.
   */
  useCamera(key) {
    this.flushCamera();
    this.#key = key;
    cancelAnimationFrame(this.#anim);
    this.cam = this.#savedCamera();
    this.#apply();
  }

  /** Writes the camera now instead of waiting for the delayed save. */
  flushCamera() {
    clearTimeout(this.#saveTimer);
    storage.set(this.#key, this.cam);
  }

  #savedCamera() {
    const saved = storage.get(this.#key);
    return saved && [saved.x, saved.y, saved.s].every(Number.isFinite) ? { x: saved.x, y: saved.y, s: clampZoom(saved.s) } : { x: 0, y: 0, s: 1 };
  }

  get width() { return this.el.clientWidth; }
  get height() { return this.el.clientHeight; }

  // ---------- Objects ----------

  add(el) {
    el.classList.add('obj');
    this.world.append(el);
    this.changed();
    return el;
  }

  remove(el) {
    el.remove();
    this.changed();
  }

  /** Visible objects on the desk (display:none ones are skipped). */
  objects() {
    return [...this.world.children].filter(el => el.offsetParent !== null);
  }

  rectOf(el) {
    return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  }

  /** Call after moving/resizing objects so dependants (minimap) refresh. */
  changed() {
    this.emit('change');
  }

  // ---------- Coordinates ----------

  toWorld(clientX, clientY) {
    const r = this.el.getBoundingClientRect();
    return { x: (clientX - r.left - this.cam.x) / this.cam.s, y: (clientY - r.top - this.cam.y) / this.cam.s };
  }

  /** The part of the world currently on screen. */
  viewRect() {
    const { x, y, s } = this.cam;
    return { x: -x / s, y: -y / s, w: this.width / s, h: this.height / s };
  }

  // ---------- Camera ----------

  setCamera(x, y, s = this.cam.s) {
    cancelAnimationFrame(this.#anim);
    this.cam = { x, y, s: clampZoom(s) };
    this.#apply();
  }

  /** Zoom keeping the screen point (cx, cy) — relative to the canvas — fixed. */
  zoomAt(cx, cy, factor) {
    const s = clampZoom(this.cam.s * factor);
    const k = s / this.cam.s;
    this.setCamera(cx - (cx - this.cam.x) * k, cy - (cy - this.cam.y) * k, s);
  }

  zoomBy(factor) {
    this.zoomAt(this.width / 2, this.height / 2, factor);
  }

  resetZoom() {
    this.zoomBy(1 / this.cam.s);
  }

  animateTo(x, y, s, duration = 280) {
    if (reducedMotion()) return this.setCamera(x, y, s);
    cancelAnimationFrame(this.#anim);
    const from = { ...this.cam };
    const to = { x, y, s: clampZoom(s) };
    const t0 = performance.now();
    const step = now => {
      const p = 1 - Math.pow(1 - Math.min(1, (now - t0) / duration), 3);
      this.cam = {
        x: from.x + (to.x - from.x) * p,
        y: from.y + (to.y - from.y) * p,
        s: from.s + (to.s - from.s) * p,
      };
      this.#apply();
      if (p < 1) this.#anim = requestAnimationFrame(step);
    };
    this.#anim = requestAnimationFrame(step);
  }

  /** Center a world rect on screen, zooming so it fits (never above maxZoom). */
  frame(rect, margin = 40, maxZoom = 1) {
    const s = clampZoom(Math.min((this.width - 2 * margin) / rect.w, (this.height - 2 * margin) / rect.h, maxZoom));
    this.animateTo((this.width - rect.w * s) / 2 - rect.x * s, (this.height - rect.h * s) / 2 - rect.y * s, s);
  }

  /**
   * Optional: () → world rect | null. When it returns a rect, fit() frames it instead of
   * everything (the workarea being worked in).
   */
  fitScope = null;

  /** Show every object (or the fitScope rect); back to the origin when the desk is empty. */
  fit() {
    const scoped = this.fitScope?.();
    if (scoped) return this.frame(scoped);
    const objects = this.objects();
    if (!objects.length) return this.animateTo(0, 0, 1);
    this.frame(union(objects.map(el => this.rectOf(el))));
  }

  /** Pan (and zoom out only if needed) until the rect is fully visible. */
  bringIntoView(rect) {
    const v = this.viewRect();
    if (rect.x >= v.x && rect.y >= v.y && rect.x + rect.w <= v.x + v.w && rect.y + rect.h <= v.y + v.h) return;
    if (rect.w <= v.w && rect.h <= v.h) {
      const { s } = this.cam;
      this.animateTo(this.width / 2 - (rect.x + rect.w / 2) * s, this.height / 2 - (rect.y + rect.h / 2) * s, s);
    } else {
      this.frame(rect, 24, this.cam.s);
    }
  }

  #apply() {
    const { x, y, s } = this.cam;
    this.world.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    let grid = GRID * s;
    while (grid < 12) grid *= 4;
    this.el.style.backgroundSize = `${grid}px ${grid}px`;
    this.el.style.backgroundPosition = `${x}px ${y}px`;
    this.emit('camera', this.cam);
    this.changed();
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => storage.set(this.#key, this.cam), 300);
  }

  // ---------- Input ----------

  #bindPointer() {
    this.el.addEventListener('pointerdown', e => {
      const onBackground = !e.target.closest('.obj');
      // Pan: middle button or Space anywhere; one finger on the background of a touch screen
      const pan = e.button === 1 || this.#space || (e.button === 0 && onBackground && e.pointerType === 'touch');
      if (!pan) {
        if (e.button !== 0 || !onBackground) return;
        // Left button on the background belongs to the listeners (selection); a click without moving is background:click
        e.preventDefault();
        document.activeElement?.blur?.();
        this.emit('background:press', e);
        trackDrag(e, { onEnd: (moved, ev) => { if (!moved) this.emit('background:click', ev); } });
        return;
      }
      // Capture phase: panning wins over whatever object is under the pointer
      e.preventDefault();
      e.stopPropagation();
      if (onBackground) document.activeElement?.blur?.();
      cancelAnimationFrame(this.#anim);

      const ox = this.cam.x, oy = this.cam.y;
      this.el.classList.add('panning');
      trackDrag(e, {
        onMove: (dx, dy) => this.setCamera(ox + dx, oy + dy),
        onEnd: (moved, ev) => {
          this.el.classList.remove('panning');
          if (!moved && onBackground && e.button === 0) this.emit('background:click', ev);
        },
      });
    }, true);

    this.el.addEventListener('contextmenu', e => {
      // Already handled by an object (its target may even have been re-rendered away)
      if (e.defaultPrevented) return;
      e.preventDefault();
      if (!e.target.closest('.obj')) this.emit('background:contextmenu', e);
    });
  }

  #bindWheel() {
    this.el.addEventListener('wheel', e => {
      if (!e.ctrlKey && e.target.closest('[data-wheel="native"]')) return;
      e.preventDefault();
      const r = this.el.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : 1;
      // Pinch gestures arrive as ctrl+wheel with small deltas: more sensitive
      const speed = e.ctrlKey ? 0.01 : 0.0015;
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * unit * speed));
    }, { passive: false });

    // Never let the browser zoom the page itself
    addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  }

  #bindKeys() {
    const group = 'Scrivania';
    shortcuts.register({ id: 'desk.zoomIn', label: 'Ingrandisci', group, keys: ['Ctrl+Plus', 'Ctrl+Equal'], whenEditing: true, repeat: true, run: () => this.zoomBy(1.2) });
    shortcuts.register({ id: 'desk.zoomOut', label: 'Riduci', group, keys: ['Ctrl+Minus'], whenEditing: true, repeat: true, run: () => this.zoomBy(1 / 1.2) });
    shortcuts.register({ id: 'desk.zoomReset', label: 'Zoom al 100%', group, keys: ['Ctrl+0'], whenEditing: true, run: () => this.resetZoom() });
    shortcuts.register({ id: 'desk.fit', label: 'Mostra tutto', group, keys: ['Shift+1'], run: () => this.fit() });

    // Hold Space to pan: a fixed key, not a command
    const releaseSpace = () => { this.#space = false; this.el.classList.remove('space'); };
    addEventListener('keydown', e => {
      // Space on a focused control (or inside a window) belongs to it, not to panning
      if (e.code === 'Space' && !isEditing() && !e.target.closest?.('.window, button, select, a[href]')) {
        e.preventDefault();
        this.#space = true;
        this.el.classList.add('space');
      }
    });
    addEventListener('keyup', e => { if (e.code === 'Space') releaseSpace(); });
    addEventListener('blur', releaseSpace);
  }
}
