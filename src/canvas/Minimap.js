import { h } from '../core/dom.js';
import { union } from './Canvas.js';

const PAD = 8;

/** Overview of the desk: one block per object (styled by its data-kind) plus the visible area. */
export class Minimap {
  #map = null;
  #dragging = false;
  #raf = 0;

  constructor(canvas) {
    this.canvas = canvas;
    this.el = h('div', { class: 'minimap', title: 'Clicca o trascina per spostarti' });
    canvas.on('change', () => this.#schedule());
    this.el.addEventListener('pointerdown', e => this.#startNavigate(e));
    this.#schedule();
  }

  #schedule() {
    if (!this.#raf) this.#raf = requestAnimationFrame(() => { this.#raf = 0; this.draw(); });
  }

  draw() {
    const { canvas } = this;
    const objects = canvas.objects();
    const rects = objects.map(el => canvas.rectOf(el));
    const view = canvas.viewRect();

    // Keep the scale frozen while dragging, otherwise the map shifts under the pointer
    if (!this.#dragging || !this.#map) {
      const b = union([...rects, view]);
      const w = this.el.clientWidth - PAD * 2, hgt = this.el.clientHeight - PAD * 2;
      const k = Math.min(w / b.w, hgt / b.h);
      this.#map = { k, ox: PAD + (w - b.w * k) / 2 - b.x * k, oy: PAD + (hgt - b.h * k) / 2 - b.y * k };
    }

    const { k, ox, oy } = this.#map;
    const block = (r, kind) => h('i', {
      class: `mm-${kind}`,
      style: { left: `${ox + r.x * k}px`, top: `${oy + r.y * k}px`, width: `${r.w * k}px`, height: `${r.h * k}px` },
    });
    this.el.replaceChildren(...objects.map((el, i) => block(rects[i], el.dataset.kind || 'obj')), block(view, 'view'));
  }

  #startNavigate(e) {
    this.#dragging = true;
    this.el.setPointerCapture(e.pointerId);
    const go = ev => {
      const r = this.el.getBoundingClientRect();
      const { k, ox, oy } = this.#map;
      const { canvas } = this;
      const wx = (ev.clientX - r.left - ox) / k, wy = (ev.clientY - r.top - oy) / k;
      canvas.setCamera(canvas.width / 2 - wx * canvas.cam.s, canvas.height / 2 - wy * canvas.cam.s);
    };
    const end = () => {
      this.#dragging = false;
      this.el.removeEventListener('pointermove', go);
      this.el.removeEventListener('pointerup', end);
      this.el.removeEventListener('pointercancel', end);
      this.#schedule();
    };
    go(e);
    this.el.addEventListener('pointermove', go);
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
  }
}
