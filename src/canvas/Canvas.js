import { Emitter } from '../core/events.js';
import { h, isEditing, trackDrag } from '../core/dom.js';
import { storage } from '../core/storage.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const GRID = 24;

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
 * drag on empty space / middle button / Space+drag = pan.
 *
 * Events:
 *   'camera'                   camera moved or zoomed
 *   'change'                   camera or objects changed (minimap redraw)
 *   'background:click'         click on empty space (PointerEvent)
 *   'background:contextmenu'   right click on empty space (MouseEvent)
 */
export class Canvas extends Emitter {
  #anim = 0;
  #saveTimer = 0;
  #space = false;

  constructor(parent) {
    super();
    const saved = storage.get('camera');
    this.cam = { x: 0, y: 0, s: 1 };
    if (saved && [saved.x, saved.y, saved.s].every(Number.isFinite)) this.cam = { x: saved.x, y: saved.y, s: clampZoom(saved.s) };

    this.world = h('div', { class: 'world' });
    this.el = h('div', { class: 'canvas' }, this.world);
    parent.append(this.el);

    this.#bindPointer();
    this.#bindWheel();
    this.#bindKeys();
    addEventListener('resize', () => this.#apply());
    this.#apply();
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

  /** Show every object; back to the origin when the desk is empty. */
  fit() {
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
    this.#saveTimer = setTimeout(() => storage.set('camera', this.cam), 300);
  }

  // ---------- Input ----------

  #bindPointer() {
    this.el.addEventListener('pointerdown', e => {
      const onBackground = !e.target.closest('.obj');
      if (!(e.button === 1 || this.#space || (e.button === 0 && onBackground))) return;
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
    const releaseSpace = () => { this.#space = false; this.el.classList.remove('space'); };
    addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === 'Space' && !isEditing()) {
        e.preventDefault();
        this.#space = true;
        this.el.classList.add('space');
      } else if (mod && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        this.zoomBy(1.2);
      } else if (mod && e.key === '-') {
        e.preventDefault();
        this.zoomBy(1 / 1.2);
      } else if (mod && e.key === '0') {
        e.preventDefault();
        this.resetZoom();
      } else if (e.shiftKey && e.code === 'Digit1' && !isEditing()) {
        e.preventDefault();
        this.fit();
      }
    });
    addEventListener('keyup', e => { if (e.code === 'Space') releaseSpace(); });
    addEventListener('blur', releaseSpace);
  }
}
