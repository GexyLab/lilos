import { h, trackDrag } from '../core/dom.js';

/**
 * The bar that resizes a panel (a side panel, a tree, a pane of a split), the same everywhere:
 * dragged with the mouse, double-clicked to go back to the default size, and from the keyboard
 * (it is a focusable role="separator": arrows by `step`, Shift three times as much, Home the
 * smallest, End the biggest). The caller keeps the size; the bar asks for it and tells it.
 *
 *   panel.append(resizeHandle({
 *     orientation: 'vertical',          // of the bar: 'vertical' changes a width, 'horizontal' a height
 *     get: () => panel.offsetWidth,     // the size now, in pixels
 *     set: (px, final) => { … },        // the size wanted, already within min and max; final: false while
 *                                       // dragging, true when it ends and for keys and reset (save then)
 *     min: 160, max: () => room(),      // numbers or functions (the room left changes with the window)
 *     reset: 260,                       // double click: this size (or a function doing it itself)
 *     invert: true,                     // the panel is after the bar (on its right, or below): dragging
 *                                       // left or up makes it bigger, and so do ← and ↑
 *     step: 16, label: 'Ridimensiona il pannello',
 *     host: panel,                      // gets the class 'resizing' while dragged
 *     className: 'at-start',            // on the panel's own edge (see below)
 *   }));
 *
 * CSS (controls.css): '.ctl-resize' is 7px to grab and a 1px line that lights up on hover, focus
 * and drag ('.on'); between two boxes in a flex row or column it takes no room. 'at-start' or
 * 'at-end' put it, absolutely positioned, on the left / right (top / bottom) edge of a positioned
 * parent instead. While dragged the whole page has the resize cursor and iframes ignore the mouse.
 */
export function resizeHandle({
  orientation = 'vertical', get, set, min = 0, max = Infinity, reset = null, invert = false,
  step = 16, label, host = null, className = '',
} = {}) {
  const vertical = orientation !== 'horizontal';
  const value = v => (typeof v === 'function' ? v() : v);
  const limits = () => {
    const lo = Number(value(min)) || 0;
    return [lo, Math.max(lo, Number(value(max)) || 0)];
  };
  const el = h('div', {
    class: ['ctl-resize', vertical ? 'vertical' : 'horizontal', className].filter(Boolean).join(' '),
    role: 'separator', tabindex: '0', 'aria-orientation': vertical ? 'vertical' : 'horizontal', 'aria-label': label,
  });
  const update = () => {
    const [lo, hi] = limits();
    el.setAttribute('aria-valuemin', Math.round(lo));
    if (Number.isFinite(hi)) el.setAttribute('aria-valuemax', Math.round(hi)); else el.removeAttribute('aria-valuemax');
    el.setAttribute('aria-valuenow', Math.round(get()));
  };
  const apply = (px, final) => {
    const [lo, hi] = limits();
    set(Math.round(Math.max(lo, Math.min(hi, px))), final);
    update();
  };

  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = get();
    const sign = invert ? -1 : 1;
    el.classList.add('on');
    host?.classList.add('resizing');
    document.documentElement.classList.add('ctl-resizing', vertical ? 'cols' : 'rows');
    trackDrag(e, {
      threshold: 0,
      onMove: (dx, dy) => apply(start + sign * (vertical ? dx : dy), false),
      onEnd: moved => {
        el.classList.remove('on');
        host?.classList.remove('resizing');
        document.documentElement.classList.remove('ctl-resizing', 'cols', 'rows');
        if (moved) apply(get(), true);
      },
    });
  });
  el.addEventListener('dblclick', () => {
    if (typeof reset === 'function') { reset(); update(); } else if (Number.isFinite(reset)) apply(reset, true);
  });
  el.addEventListener('keydown', e => {
    const keys = vertical ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
    const [lo, hi] = limits();
    let to;
    if (e.key in keys) to = get() + keys[e.key] * (invert ? -1 : 1) * step * (e.shiftKey ? 3 : 1);
    else if (e.key === 'Home') to = lo;
    else if (e.key === 'End') to = hi;
    else return;
    e.preventDefault();
    e.stopPropagation();
    if (Number.isFinite(to)) apply(to, true);
  });
  el.addEventListener('focus', update);
  el.addEventListener('pointerenter', update);
  return el;
}
