/**
 * The Componenti UI of the base package: a text and a shape to draw in the windows of a project
 * (the same choices as the drawing blocks Testo and Forma of the schemas, in blocks.js). The
 * browser loads this file (served by the engine) in lilOS and in the IDE; the kernel imports it
 * only to read the definitions. It imports nothing: render(el, c) gets the SDK's h in `c`, the
 * component's props, and on() for what the schemas send (see the SDK's LogicUI).
 *
 * Colours come from data (a shared .lsui, a schema): only #rgb/#rrggbb(aa), rgb()/hsl() with
 * numbers and plain colour names get into a style; anything else is the theme's colour.
 */

const L = (en, it) => ({ en, it });
const O = (value, en, it) => ({ value, label: L(en, it) });
const P = (key, type, en, it, extra = {}) => ({ key, type, label: L(en, it), ...extra });
const COMMON = [{ name: 'enabled', type: 'bool', label: L('enabled', 'abilitato') }, { name: 'visible', type: 'bool', label: L('visible', 'visibile') }];
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const num = (v, d) => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, num(v, d)));

/** A CSS colour from data, or null (the theme's). */
function colorOf(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) || /^(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/-]+\)$/.test(s) || /^[a-zA-Z]{3,24}$/.test(s) ? s : null;
}

/** The components' styles (CSS text): the SDK's logic.components() puts them in the page once. */
export const styles = `
.lui-draw-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.35; max-width: 100%; }
.lui-draw-shape { position: relative; flex: none; max-width: 100%; }
.lui-draw-shape > svg { position: absolute; left: 0; top: 0; }
.lui-draw-shape > .lui-draw-in { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 4px; white-space: pre-wrap; overflow: hidden; }
.lui-draw-shape > .lui-draw-in[hidden] { display: none; }
`;

const ALIGN = [O('start', 'Left', 'A sinistra'), O('center', 'Centre', 'Al centro'), O('end', 'Right', 'A destra')];
const SHAPES = [O('rect', 'Rectangle', 'Rettangolo'), O('rounded', 'Rounded rectangle', 'Rettangolo arrotondato'), O('ellipse', 'Ellipse · circle', 'Ellisse · cerchio'), O('diamond', 'Diamond', 'Rombo'), O('triangle', 'Triangle', 'Triangolo'), O('line', 'Line · arrow', 'Linea · freccia')];
const DIRECTIONS = [O('horizontal', 'Horizontal', 'Orizzontale'), O('vertical', 'Vertical', 'Verticale'), O('down', 'Diagonal ↘', 'Diagonale ↘'), O('up', 'Diagonal ↗', 'Diagonale ↗')];
const ARROWS = [O('none', 'None', 'Nessuna'), O('end', 'At the end', 'Alla fine'), O('start', 'At the start', 'All\'inizio'), O('both', 'At both ends', 'A entrambi i capi')];
const DASHES = [O('solid', 'Solid', 'Continua'), O('dashed', 'Dashed', 'Tratteggiata'), O('dotted', 'Dotted', 'Punteggiata')];
const CLOSED = ['rect', 'rounded', 'ellipse', 'diamond', 'triangle'];

/**
 * The SVG of a shape (the same drawing as the SDK's LogicCanvas for the block Forma): o = { shape,
 * w, h, direction, arrows, radius, stroke, strokeWidth, dash, fill }.
 */
function shapeSvg(o) {
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };
  const w = clamp(o.w, 4, 4000, 200), hh = clamp(o.h, 4, 4000, 120), sw = clamp(o.strokeWidth, 0, 40, 2);
  const svg = make('svg', { width: w, height: hh, viewBox: `0 0 ${w} ${hh}`, overflow: 'visible', 'aria-hidden': 'true' });
  const stroke = colorOf(o.stroke) ?? 'currentColor';
  const paint = { stroke: sw ? stroke : 'none', 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': o.dash === 'dotted' ? 'round' : 'butt' };
  if (sw && o.dash === 'dashed') paint['stroke-dasharray'] = `${sw * 4} ${sw * 2.5}`;
  if (sw && o.dash === 'dotted') paint['stroke-dasharray'] = `0 ${sw * 2.2}`;
  const fill = CLOSED.includes(o.shape) ? colorOf(o.fill) ?? 'none' : 'none';
  const p = sw / 2;
  switch (o.shape) {
    case 'line': {
      const ends = { horizontal: [0, hh / 2, w, hh / 2], vertical: [w / 2, 0, w / 2, hh], down: [0, 0, w, hh], up: [0, hh, w, 0] }[o.direction] ?? [0, hh / 2, w, hh / 2];
      let [x0, y0, x1, y1] = ends;
      const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const head = Math.max(8, sw * 3.5);
      const atEnd = o.arrows === 'end' || o.arrows === 'both', atStart = o.arrows === 'start' || o.arrows === 'both';
      const tip = (x, y, dx, dy) => make('path', { d: `M${x} ${y} L${x - dx * head - dy * head * 0.45} ${y - dy * head + dx * head * 0.45} L${x - dx * head + dy * head * 0.45} ${y - dy * head - dx * head * 0.45}Z`, fill: stroke, stroke: 'none' });
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

/** Bold, italic… of a text, as a style. */
function textStyle(props, color) {
  return [
    `font-size:${clamp(props.size ?? props.textSize, 8, 96, 14)}px`,
    props.bold ? 'font-weight:700' : '', props.italic ? 'font-style:italic' : '', props.underline ? 'text-decoration:underline' : '',
    color ? `color:${color}` : '',
  ].filter(Boolean).join(';');
}

function def(type, icon, label, spec, render) {
  return { type, version: 1, category: 'draw', icon, label, inputs: [...spec.inputs, ...COMMON], outputs: [], props: spec.props, render };
}

export const components = [
  def('core.uiText', 'text', L('Styled text', 'Testo formattato'), {
    inputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }, { name: 'color', type: 'text', label: L('colour', 'colore') }],
    props: [
      P('text', 'textarea', 'Text', 'Testo', { default: 'Testo', translate: true }),
      P('size', 'number', 'Size (px)', 'Dimensione (px)', { default: 14, min: 8, max: 96 }),
      P('color', 'color', 'Colour (empty: the theme\'s)', 'Colore (vuoto: quello del tema)', { default: '' }),
      P('background', 'color', 'Background (empty: none)', 'Sfondo (vuoto: nessuno)', { default: '' }),
      P('bold', 'checkbox', 'Bold', 'Grassetto', { default: false }),
      P('italic', 'checkbox', 'Italic', 'Corsivo', { default: false }),
      P('underline', 'checkbox', 'Underlined', 'Sottolineato', { default: false }),
      P('align', 'select', 'Alignment', 'Allineamento', { default: 'start', options: ALIGN }),
      P('width', 'number', 'Width (px, 0: all there is)', 'Larghezza (px, 0: tutta quella che c\'è)', { default: 0, min: 0, max: 4000 }),
    ],
  }, (el, c) => {
    const p = c.props;
    const bg = colorOf(p.background);
    const box = c.h('div', { class: 'lui-draw-text', style: `${textStyle(p, colorOf(p.color))};text-align:${['start', 'center', 'end'].includes(p.align) ? p.align : 'start'};${bg ? `background:${bg};padding:4px 8px;border-radius:4px;` : ''}${p.width ? `width:${clamp(p.width, 0, 4000, 0)}px;` : ''}` }, c.t(p.text ?? ''));
    el.append(box);
    c.on('text', v => { box.textContent = text(v); });
    c.on('color', v => { box.style.color = colorOf(text(v)) ?? ''; });
  }),

  def('core.uiShape', 'shapes', L('Shape', 'Forma'), {
    inputs: [
      { name: 'fill', type: 'text', label: L('fill', 'riempimento') },
      { name: 'stroke', type: 'text', label: L('line colour', 'colore della linea') },
      { name: 'text', type: 'text', label: L('text', 'testo') },
    ],
    props: [
      P('shape', 'select', 'Shape', 'Forma', { default: 'rect', options: SHAPES }),
      P('w', 'number', 'Width (px)', 'Larghezza (px)', { default: 120, min: 4, max: 4000 }),
      P('h', 'number', 'Height (px)', 'Altezza (px)', { default: 80, min: 4, max: 4000 }),
      P('direction', 'select', 'Direction (line)', 'Direzione (linea)', { default: 'horizontal', options: DIRECTIONS }),
      P('arrows', 'select', 'Arrows (line)', 'Frecce (linea)', { default: 'none', options: ARROWS }),
      P('radius', 'number', 'Corner radius (px)', 'Raggio degli angoli (px)', { default: 12, min: 0, max: 400 }),
      P('stroke', 'color', 'Line colour (empty: the theme\'s)', 'Colore della linea (vuoto: quello del tema)', { default: '' }),
      P('strokeWidth', 'number', 'Line width (px, 0: no line)', 'Spessore della linea (px, 0: senza linea)', { default: 2, min: 0, max: 40 }),
      P('dash', 'select', 'Line', 'Linea', { default: 'solid', options: DASHES }),
      P('fill', 'color', 'Fill (empty: none)', 'Riempimento (vuoto: nessuno)', { default: '' }),
      P('text', 'textarea', 'Text inside', 'Testo dentro', { default: '', translate: true }),
      P('textSize', 'number', 'Text size (px)', 'Dimensione del testo (px)', { default: 13, min: 8, max: 96 }),
    ],
  }, (el, c) => {
    const p = c.props;
    const state = { ...p };
    el.classList.add('lui-draw-shape');
    const label = c.h('div', { class: 'lui-draw-in', style: textStyle({ size: p.textSize }) }, c.t(p.text ?? ''));
    const draw = () => {
      el.style.width = `${clamp(state.w, 4, 4000, 120)}px`;
      el.style.height = `${clamp(state.h, 4, 4000, 80)}px`;
      el.replaceChildren(shapeSvg(state), label);
      label.hidden = !label.textContent;
    };
    draw();
    c.on('fill', v => { state.fill = text(v); draw(); });
    c.on('stroke', v => { state.stroke = text(v); draw(); });
    c.on('text', v => { label.textContent = text(v); label.hidden = !label.textContent; });
  }),
];
