import { trackDrag } from '../core/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Drag-to-select from a pointerdown: a rectangle ('rect') or a free closed path that follows
 * the pointer ('lasso'), drawn over `container`. Everything is in client (screen) coordinates.
 *
 *   onUpdate(hit)  while dragging
 *   onEnd(hit)     on release; hit is null if the pointer never moved past the threshold
 *
 * hit(rect) tells whether a DOMRect is selected: the rectangle selects what it touches,
 * the lasso what has its center inside the path.
 */
export function selectionGesture(startEvent, { container, mode = 'rect', threshold = 3, onUpdate, onEnd }) {
  const box = container.getBoundingClientRect();
  const points = [[startEvent.clientX, startEvent.clientY]];
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.setAttribute('class', `sel-overlay ${mode}`);
  overlay.setAttribute('aria-hidden', 'true');
  const shape = document.createElementNS(SVG_NS, mode === 'lasso' ? 'path' : 'rect');
  overlay.append(shape);

  const bounds = () => {
    const [x0, y0] = points[0], [x1, y1] = points[points.length - 1];
    return { left: Math.min(x0, x1), top: Math.min(y0, y1), right: Math.max(x0, x1), bottom: Math.max(y0, y1) };
  };

  const hit = mode === 'lasso'
    ? r => insidePolygon(r.left + r.width / 2, r.top + r.height / 2, points)
    : r => { const b = bounds(); return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; };

  const draw = () => {
    if (mode === 'lasso') {
      shape.setAttribute('d', 'M' + points.map(([x, y]) => `${x - box.left},${y - box.top}`).join('L') + 'Z');
    } else {
      const b = bounds();
      shape.setAttribute('x', b.left - box.left);
      shape.setAttribute('y', b.top - box.top);
      shape.setAttribute('width', b.right - b.left);
      shape.setAttribute('height', b.bottom - b.top);
    }
  };

  trackDrag(startEvent, {
    threshold,
    onMove: (dx, dy, ev) => {
      if (!overlay.isConnected) container.append(overlay);
      const [lx, ly] = points[points.length - 1];
      const p = [ev.clientX, ev.clientY];
      if (mode !== 'lasso') points[1] = p;
      else if (Math.hypot(p[0] - lx, p[1] - ly) >= 2) points.push(p);
      draw();
      onUpdate?.(hit);
    },
    onEnd: moved => {
      overlay.remove();
      onEnd?.(moved ? hit : null);
    },
  });
}

/** Ray casting: is (x, y) inside the closed polygon? */
function insidePolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
