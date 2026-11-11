/**
 * The drawings of Logic Studio (the blocks Testo and Forma of the base package, role 'drawing'):
 * what LogicCanvas draws for them. The UI components Testo formattato and Forma
 * (logicstudio-core/components.js) draw the same, with their own copy of this code: a package's
 * components.js imports nothing.
 *
 *   drawShape({ shape, w, h, direction, arrows, radius, stroke, strokeWidth, dash, fill }) → <svg>
 *   drawColor(v) → a CSS colour from data, or null (the theme's)
 *   drawTextStyle({ size, bold, italic, underline }, color) → the style of a text
 */

const NS = 'http://www.w3.org/2000/svg';
const CLOSED = ['rect', 'rounded', 'ellipse', 'diamond', 'triangle'];
const num = (v, d) => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, num(v, d)));

/** A CSS colour from data: #rgb/#rrggbb(aa), rgb()/hsl() with numbers, or a plain colour name; else null. */
export function drawColor(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) || /^(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/-]+\)$/.test(s) || /^[a-zA-Z]{3,24}$/.test(s) ? s : null;
}

/** The style of a text: its size (8–96 px), bold, italic, underlined, its colour. */
export function drawTextStyle(o, color = null) {
  return [
    `font-size:${clamp(o.size, 8, 96, 14)}px`,
    o.bold ? 'font-weight:700' : '', o.italic ? 'font-style:italic' : '', o.underline ? 'text-decoration:underline' : '',
    color ? `color:${color}` : '',
  ].filter(Boolean).join(';');
}

/** The SVG of a shape, w × h (4–4000 px); the line in the theme's colour (currentColor) unless given. */
export function drawShape(o) {
  const make = (tag, attrs) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };
  const w = clamp(o.w, 4, 4000, 200), hh = clamp(o.h, 4, 4000, 120), sw = clamp(o.strokeWidth, 0, 40, 2);
  const svg = make('svg', { width: w, height: hh, viewBox: `0 0 ${w} ${hh}`, overflow: 'visible', 'aria-hidden': 'true' });
  const stroke = drawColor(o.stroke) ?? 'currentColor';
  const paint = { stroke: sw ? stroke : 'none', 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': o.dash === 'dotted' ? 'round' : 'butt' };
  if (sw && o.dash === 'dashed') paint['stroke-dasharray'] = `${sw * 4} ${sw * 2.5}`;
  if (sw && o.dash === 'dotted') paint['stroke-dasharray'] = `0 ${sw * 2.2}`;
  const fill = CLOSED.includes(o.shape) ? drawColor(o.fill) ?? 'none' : 'none';
  const p = sw / 2;
  switch (o.shape) {
    case 'line': {
      const ends = { horizontal: [0, hh / 2, w, hh / 2], vertical: [w / 2, 0, w / 2, hh], down: [0, 0, w, hh], up: [0, hh, w, 0] }[o.direction] ?? [0, hh / 2, w, hh / 2];
      let [x0, y0, x1, y1] = ends;
      const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const head = Math.max(8, sw * 3.5);
      const atEnd = o.arrows === 'end' || o.arrows === 'both', atStart = o.arrows === 'start' || o.arrows === 'both';
      const tip = (x, y, dx, dy) => make('path', { d: `M${x} ${y} L${x - dx * head - dy * head * 0.45} ${y - dy * head + dx * head * 0.45} L${x - dx * head + dy * head * 0.45} ${y - dy * head - dx * head * 0.45}Z`, fill: stroke, stroke: 'none', class: 'head' });
      const heads = [];
      if (atEnd) { heads.push(tip(x1, y1, ux, uy)); x1 -= ux * head * 0.8; y1 -= uy * head * 0.8; }
      if (atStart) { heads.push(tip(x0, y0, -ux, -uy)); x0 += ux * head * 0.8; y0 += uy * head * 0.8; }
      svg.append(make('line', { x1: x0, y1: y0, x2: x1, y2: y1, ...paint, fill: 'none' }), ...heads);
      break;
    }
    case 'ellipse': svg.append(make('ellipse', { cx: w / 2, cy: hh / 2, rx: Math.max(0.5, w / 2 - p), ry: Math.max(0.5, hh / 2 - p), fill, ...paint })); break;
    case 'diamond': svg.append(make('polygon', { points: `${w / 2},${p} ${w - p},${hh / 2} ${w / 2},${hh - p} ${p},${hh / 2}`, fill, ...paint })); break;
    case 'triangle': svg.append(make('polygon', { points: `${w / 2},${p} ${w - p},${hh - p} ${p},${hh - p}`, fill, ...paint })); break;
    default: {
      const r = o.shape === 'rounded' ? Math.min(clamp(o.radius, 0, 400, 12), w / 2, hh / 2) : 0;
      svg.append(make('rect', { x: p, y: p, width: Math.max(0.5, w - sw), height: Math.max(0.5, hh - sw), rx: r, ry: r, fill, ...paint }));
    }
  }
  return svg;
}
