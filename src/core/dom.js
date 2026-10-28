/**
 * Minimal element factory.
 *   h('button', { class: 'x', onclick: fn, dataset: { id: 1 } }, 'Testo', childEl)
 * Strings become text nodes (never HTML), null/false children and props are skipped.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** SVG element from trusted, static markup (icon definitions only — never user input). */
export function svg(viewBox, className, markup) {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', viewBox);
  if (className) el.setAttribute('class', className);
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = markup;
  return el;
}

/** True while the user is typing somewhere (inputs, contenteditable). Global shortcuts should yield. */
export function isEditing() {
  const el = document.activeElement;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/** Pointer drag helper: calls onMove(dx, dy, ev) after a small threshold, onEnd(moved, ev) on release. */
export function trackDrag(startEvent, { onMove, onEnd, threshold = 3 }) {
  const sx = startEvent.clientX, sy = startEvent.clientY;
  let moved = false;
  const move = ev => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < threshold) return;
    moved = true;
    onMove?.(ev.clientX - sx, ev.clientY - sy, ev);
  };
  const end = ev => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', end);
    removeEventListener('pointercancel', end);
    onEnd?.(moved, ev);
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
}
