/**
 * The plane geometry blocks of Logic Studio, loaded by the engine in each user's worker (and read in
 * the kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js. 2D only: solids, 3D points, vectors, planes and coordinate systems are
 * in logicstudio-solid, angles and triangles in logicstudio-trig.
 *
 * Values: like logicstudio-solid, a point is a list [x, y] (port type 'list'); the blocks also accept
 * an object { x, y } and a list [x, y, z] (the z is ignored). A shape is an object (port type
 * 'object') with a `kind`; the points inside it are lists too:
 *   circle   { kind, center, radius }                  ellipse   { kind, center, rx, ry, rotation (rad) }
 *   polygon  { kind, points }                          rect      { kind, x, y, width, height, min, max }
 *   line     { kind, a, b, c, p1, p2 } (a x + b y + c = 0)
 *   parabola { kind, vertex, p, orientation }          hyperbola { kind, center, a, b, orientation }
 * A matrix is a list of three rows (3×3 homogeneous, column vectors: p' = M · p), like coll.mat*.
 *
 * Angles go in and out in the unit chosen in the block's settings (degrees by default). Every
 * number sent out is rounded to 12 significant digits and anything below 1e-12 becomes 0, so
 * cos(90°) is 0 and 0.1 + 0.2 is 0.3. Zero tests use a tolerance (ε, 1e-9 unless a setting says).
 */

const L = (en, it) => ({ en, it });
const EPS = 1e-9;
const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : Number(String(v ?? '').trim().replace(',', '.')));

const tidy = x => {
  if (typeof x !== 'number' || !Number.isFinite(x)) return x;
  return Math.abs(x) < 1e-12 ? 0 : Number(x.toPrecision(12));
};
const isXY = v => { const k = Object.keys(v); return k.length === 2 && k.includes('x') && k.includes('y'); };
/** Every number inside a value, rounded; a { x, y } point becomes the list [x, y]. */
const clean = v => (typeof v === 'number' ? tidy(v)
  : Array.isArray(v) ? v.map(clean)
    : v && typeof v === 'object' ? (isXY(v) ? [clean(v.x), clean(v.y)] : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])))
      : v);
const show = v => {
  let s;
  try { s = typeof v === 'string' ? v : JSON.stringify(v); } catch { s = String(v); }
  s = s ?? String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
};
const fmt = x => String(tidy(Math.round(x * 1e6) / 1e6));
const missing = (inputs, ...names) => names.some(n => inputs[n] === undefined);
const eps = b => { const e = Number(b.config?.epsilon); return Number.isFinite(e) && e >= 0 ? e : EPS; };

const number = (v, what) => {
  const n = num(v);
  if (!Number.isFinite(n)) throw new Error(`Non è un numero: «${what ?? show(v)}»`);
  return n;
};

// ---- Angles
const ANGLE = { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200 };
const angleOpt = [{ value: 'deg', label: L('Degrees (°)', 'Gradi (°)') }, { value: 'rad', label: L('Radians (rad)', 'Radianti (rad)') }, { value: 'grad', label: L('Gradians (gon)', 'Gradi centesimali (gon)') }];
const UNIT = { key: 'unit', type: 'select', default: 'deg', options: angleOpt, label: L('Angle unit', 'Unità degli angoli') };
const toRad = (v, b) => number(v) * (ANGLE[b.config.unit] ?? ANGLE.deg);
const fromRad = (r, b) => r / (ANGLE[b.config.unit] ?? ANGLE.deg);
const EPSILON = { key: 'epsilon', type: 'number', default: EPS, min: 0, label: L('Tolerance (ε)', 'Tolleranza (ε)') };

// ---- Points: inside the blocks { x, y }; on the ports the list [x, y]
function pt(v) {
  let x, y;
  if (Array.isArray(v) && (v.length === 2 || v.length === 3)) [x, y] = v;
  else if (v && typeof v === 'object' && !Array.isArray(v) && v.x !== undefined && v.y !== undefined) ({ x, y } = v);
  else throw new Error(`Non è un punto: «${show(v)}»`);
  const p = { x: num(x), y: num(y) };
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error(`Non è un punto: «${show(v)}»`);
  return p;
}
const pts = (v, min = 0) => {
  if (!Array.isArray(v)) throw new Error('Serve una lista di punti');
  const list = v.map(pt);
  if (list.length < min) throw new Error(min === 1 ? 'Serve almeno un punto' : `Servono almeno ${min} punti`);
  return list;
};
const cross2 = (a, b) => a.x * b.y - a.y * b.x;
const xy = p => ({ x: p.x, y: p.y });
// ---- Shapes
const circleShape = (c, r) => ({ kind: 'circle', center: xy(c), radius: r });
const polyShape = (points, kind = 'polygon') => ({ kind, points: points.map(xy) });
const rectShape = (x0, y0, x1, y1) => ({ kind: 'rect', x: x0, y: y0, width: x1 - x0, height: y1 - y0, min: { x: x0, y: y0 }, max: { x: x1, y: y1 } });
const lineShape = (a, b, c, p1, p2) => ({ kind: 'line', a, b, c, p1, p2 });

function lineFrom(p, q) {
  if (Math.hypot(q.x - p.x, q.y - p.y) < 1e-12) throw new Error('I due punti coincidono: non definiscono una retta');
  const a = q.y - p.y, b = p.x - q.x;
  return lineShape(a, b, -(a * p.x + b * p.y), xy(p), xy(q));
}
function lineABC(a, b, c) {
  const n = a * a + b * b;
  if (n === 0) throw new Error('Non è una retta: «a e b sono zero»');
  const p1 = { x: -a * c / n, y: -b * c / n };
  return lineShape(a, b, c, p1, { x: p1.x - b, y: p1.y + a });
}
/** The line through p with direction d (not zero). */
const lineDir = (p, d) => lineFrom(p, { x: p.x + d.x, y: p.y + d.y });
function toLine(v) {
  if (Array.isArray(v) && v.length === 2 && !v.some(n => typeof n === 'number')) return lineFrom(...v.map(pt));
  if (v && typeof v === 'object' && !Array.isArray(v) && (v.kind === undefined || v.kind === 'line')) {
    const a = num(v.a), b = num(v.b), c = num(v.c);
    if ([a, b, c].every(Number.isFinite)) {
      if (v.p1 && v.p2) { if (a === 0 && b === 0) throw new Error('Non è una retta: «a e b sono zero»'); return lineShape(a, b, c, xy(pt(v.p1)), xy(pt(v.p2))); }
      return lineABC(a, b, c);
    }
  }
  throw new Error(`Non è una retta: «${show(v)}»`);
}
function toCircle(v) {
  if (v && typeof v === 'object' && v.kind === 'circle') return { c: pt(v.center), r: number(v.radius, 'raggio') };
  throw new Error(`Non è un cerchio: «${show(v)}»`);
}
const isShape = v => v && typeof v === 'object' && !Array.isArray(v) && typeof v.kind === 'string';

/** The equation y = m x + q (or x = k) as text. */
function equationOf(l) {
  const { a, b, c } = l;
  if (Math.abs(b) < 1e-12) return `x = ${fmt(-c / a)}`;
  const m = -a / b, q = -c / b;
  const mt = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '-x' : `${fmt(m)}x`;
  if (!mt) return `y = ${fmt(q)}`;
  if (Math.abs(q) < 1e-12) return `y = ${mt}`;
  return `y = ${mt} ${q < 0 ? '-' : '+'} ${fmt(Math.abs(q))}`;
}
const lineOut = l => ({
  line: l, a: l.a, b: l.b, c: l.c, equation: equationOf(l),
});
// ---- The ports used again and again
const P = (name, type, en, it, extra) => ({ name, type, label: L(en, it ?? en), ...extra });
const POINT_OUT = P('point', 'list', 'point [x, y]', 'punto [x, y]');
const block = d => ({
  version: 1, category: 'geometry', ...d,
  run(inputs, b) {
    const r = d.run(inputs, b);
    return r === undefined ? r : Object.fromEntries(Object.entries(r).map(([k, v]) => [k, clean(v)]));
  },
});

// ---- Transformations (3×3 homogeneous matrices)
const I3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mul3 = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _x, k) => s + A[i][k] * B[k][j], 0)));
const trans3 = (tx, ty) => [[1, 0, tx], [0, 1, ty], [0, 0, 1]];
const scale3 = (sx, sy) => [[sx, 0, 0], [0, sy, 0], [0, 0, 1]];
const about = (c, M) => mul3(trans3(c.x, c.y), mul3(M, trans3(-c.x, -c.y)));
function reflect3(l) {
  const n = Math.hypot(l.a, l.b), nx = l.a / n, ny = l.b / n, d = l.c / n;
  return [[1 - 2 * nx * nx, -2 * nx * ny, -2 * d * nx], [-2 * nx * ny, 1 - 2 * ny * ny, -2 * d * ny], [0, 0, 1]];
}
const OPS = [
  { value: 'translate', label: L('Translate', 'Traslazione') },
  { value: 'rotate', label: L('Rotate', 'Rotazione') },
  { value: 'scale', label: L('Scale', 'Scala') },
  { value: 'reflectLine', label: L('Reflect on a line', 'Riflessione su una retta') },
  { value: 'reflectPoint', label: L('Reflect through a point', 'Riflessione rispetto a un punto') },
  { value: 'shear', label: L('Shear', 'Taglio (shear)') },
];
const TRANSFORM_INPUTS = [
  P('vector', 'list', 'vector [x, y]', 'vettore [x, y]'),
  P('center', 'list', 'center [x, y]', 'centro [x, y]'),
  P('angle', 'number', 'angle', 'angolo'),
  P('factor', 'number', 'factor', 'fattore'),
  P('line', 'object', 'line', 'retta'),
];
const TRANSFORM_CONFIG = [
  { key: 'op', type: 'select', default: 'rotate', options: OPS, label: L('Transformation', 'Trasformazione') },
  { key: 'angle', type: 'number', default: 90, label: L('Angle (if not linked)', 'Angolo (se non collegato)'), when: { op: 'rotate' } },
  { key: 'factor', type: 'number', default: 2, label: L('Factor (if not linked)', 'Fattore (se non collegato)'), when: { op: 'scale' } },
  UNIT,
];
/** The 3×3 matrix of the transformation chosen in the settings, with the values linked to the ports. */
function opMatrix(op, inputs, b) {
  const c = inputs.center === undefined ? { x: 0, y: 0 } : pt(inputs.center);
  const vector = inputs.vector === undefined ? null : pt(inputs.vector);
  switch (op) {
    case 'identity': return I3();
    case 'translate':
      if (!vector) throw new Error('Manca il vettore');
      return trans3(vector.x, vector.y);
    case 'rotate': {
      const th = toRad(inputs.angle ?? b.config.angle ?? 90, b), cs = Math.cos(th), sn = Math.sin(th);
      return about(c, [[cs, -sn, 0], [sn, cs, 0], [0, 0, 1]]);
    }
    case 'scale': {
      let s;
      if (vector) s = [vector.x, vector.y];
      else { const f = number(inputs.factor ?? b.config.factor ?? 2, 'fattore'); s = [f, f]; }
      return about(c, scale3(s[0], s[1]));
    }
    case 'reflectLine':
      if (inputs.line === undefined) throw new Error('Manca la retta di simmetria');
      return reflect3(toLine(inputs.line));
    case 'reflectPoint': return about(c, scale3(-1, -1));
    case 'shear': {
      if (!vector) throw new Error('Manca il vettore');
      return about(c, [[1, vector.x, 0], [vector.y, 1, 0], [0, 0, 1]]);
    }
    default: throw new Error(`Trasformazione sconosciuta: «${op}»`);
  }
}
function toM(M) {
  const ok = Array.isArray(M) && M.length === 3 && M.every(r => Array.isArray(r) && r.length === 3 && r.every(x => Number.isFinite(num(x))));
  if (!ok) throw new Error('Non è una matrice di trasformazione 3×3');
  return M.map(r => r.map(num));
}
function mapPoint(M, p) {
  const r = M.map(row => row[0] * p.x + row[1] * p.y + row[2]);
  if (Math.abs(r[2] - 1) > 1e-12) {
    if (Math.abs(r[2]) < 1e-12) throw new Error('La matrice manda un punto all\'infinito');
    r[0] /= r[2]; r[1] /= r[2];
  }
  return { x: r[0], y: r[1] };
}
/** How the matrix acts on the plane: { s: scale, rot: angle of the x axis, ok: a similarity }. */
function similarity(M) {
  const [a, b, c, d] = [M[0][0], M[0][1], M[1][0], M[1][1]];
  const s = Math.sqrt(Math.abs(a * d - b * c));
  const ok = s > 0 && Math.abs(a * a + c * c - b * b - d * d) <= 1e-9 * s * s && Math.abs(a * b + c * d) <= 1e-9 * s * s
    && Math.abs(M[2][0]) < 1e-12 && Math.abs(M[2][1]) < 1e-12 && Math.abs(M[2][2] - 1) < 1e-12;
  return { s, rot: Math.atan2(c, a), ok };
}
const rectBounds = s => {
  if (s.min && s.max) { const a = pt(s.min), b = pt(s.max); return [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)]; }
  const x = number(s.x), y = number(s.y), w = number(s.width), h = number(s.height);
  return [Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h)];
};
function mapShape(s, M) {
  switch (s.kind) {
    case 'circle': {
      const sim = similarity(M);
      if (!sim.ok) throw new Error('Questa trasformazione deforma il cerchio: non resta un cerchio');
      return circleShape(mapPoint(M, pt(s.center)), number(s.radius) * sim.s);
    }
    case 'ellipse': {
      const sim = similarity(M);
      if (!sim.ok) throw new Error('Questa trasformazione deforma l\'ellisse: serve una traslazione, una rotazione, una riflessione o una scala uniforme');
      return { kind: 'ellipse', center: xy(mapPoint(M, pt(s.center))), rx: number(s.rx) * sim.s, ry: number(s.ry) * sim.s, rotation: (number(s.rotation ?? 0) + sim.rot) };
    }
    case 'polygon': return polyShape(pts(s.points).map(p => mapPoint(M, p)), s.kind);
    case 'line': {
      const p = mapPoint(M, pt(s.p1)), q = mapPoint(M, pt(s.p2));
      return lineFrom(p, q);
    }
    case 'rect': {
      const [x0, y0, x1, y1] = rectBounds(s);
      const corners = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }].map(p => mapPoint(M, p));
      if (Math.abs(M[0][1]) < 1e-12 && Math.abs(M[1][0]) < 1e-12) {
        const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
        return rectShape(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      }
      return polyShape(corners);
    }
    default: throw new Error(`Questa figura non si può trasformare: «${s.kind}»`);
  }
}
const isPointArr = a => Array.isArray(a) && (a.length === 2 || a.length === 3) && a.every(n => typeof n === 'number');
const isPointLike = v => isPointArr(v) || (v && typeof v === 'object' && !Array.isArray(v) && v.kind === undefined && v.x !== undefined && v.y !== undefined);
function applyTo(v, M) {
  if (Array.isArray(v) && !isPointArr(v)) return v.map(x => applyTo(x, M));
  if (isPointLike(v)) return mapPoint(M, pt(v));
  if (isShape(v)) return mapShape(v, M);
  throw new Error(`Non è un punto né una figura: «${show(v)}»`);
}

// ---- Points of a shape, to know how big it is
const ELLIPSE_STEPS = 48;
function curvePoints(s) {
  const out = [];
  if (s.kind === 'parabola') {
    const v = pt(s.vertex), p = number(s.p), h = s.orientation === 'vertical';
    for (let i = 0; i <= 40; i++) { const t = -4 + i * 0.2; out.push(h ? { x: v.x + 2 * p * t, y: v.y + p * t * t } : { x: v.x + p * t * t, y: v.y + 2 * p * t }); }
    return [out];
  }
  const c = pt(s.center), a = number(s.a), b = number(s.b), vert = s.orientation === 'vertical';
  const left = [], right = [];
  for (let i = 0; i <= 40; i++) {
    const t = -2 + i * 0.1, u = a * Math.cosh(t), w = b * Math.sinh(t);
    right.push(vert ? { x: c.x + w, y: c.y + u } : { x: c.x + u, y: c.y + w });
    left.push(vert ? { x: c.x + w, y: c.y - u } : { x: c.x - u, y: c.y + w });
  }
  return [right, left];
}
function ellipsePoints(s) {
  const c = pt(s.center), rx = number(s.rx), ry = number(s.ry), th = number(s.rotation ?? 0);
  const out = [];
  for (let i = 0; i < ELLIPSE_STEPS; i++) {
    const t = i * 2 * Math.PI / ELLIPSE_STEPS, x = rx * Math.cos(t), y = ry * Math.sin(t);
    out.push({ x: c.x + x * Math.cos(th) - y * Math.sin(th), y: c.y + x * Math.sin(th) + y * Math.cos(th) });
  }
  return out;
}
/** The points that tell where a point or a shape is. */
function extentOf(v) {
  if (isPointLike(v)) return [pt(v)];
  if (!isShape(v)) throw new Error(`Non è un punto né una figura: «${show(v)}»`);
  switch (v.kind) {
    case 'circle': { const { c, r } = toCircle(v); return [{ x: c.x - r, y: c.y - r }, { x: c.x + r, y: c.y + r }]; }
    case 'ellipse': {
      const c = pt(v.center), rx = number(v.rx), ry = number(v.ry), th = number(v.rotation ?? 0);
      const hw = Math.hypot(rx * Math.cos(th), ry * Math.sin(th)), hh = Math.hypot(rx * Math.sin(th), ry * Math.cos(th));
      return [{ x: c.x - hw, y: c.y - hh }, { x: c.x + hw, y: c.y + hh }];
    }
    case 'polygon': return pts(v.points);
    case 'line': return [pt(v.p1), pt(v.p2)];
    case 'rect': { const [x0, y0, x1, y1] = rectBounds(v); return [{ x: x0, y: y0 }, { x: x1, y: y1 }]; }
    case 'parabola': case 'hyperbola': return curvePoints(v).flat();
    default: throw new Error(`Figura sconosciuta: «${v.kind}»`);
  }
}
const extentOfAll = v => (isPointLike(v) || isShape(v) ? extentOf(v) : Array.isArray(v) ? v.flatMap(extentOfAll) : extentOf(v));

// ---- Geometry helpers
function distSeg(p, a, b) {
  const d = { x: b.x - a.x, y: b.y - a.y }, l2 = d.x * d.x + d.y * d.y;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / l2));
  return Math.hypot(p.x - a.x - t * d.x, p.y - a.y - t * d.y);
}
function signedArea(ps) {
  let s = 0;
  for (let i = 0; i < ps.length; i++) { const p = ps[i], q = ps[(i + 1) % ps.length]; s += p.x * q.y - q.x * p.y; }
  return s / 2;
}
const perimeterOf = ps => ps.reduce((s, p, i) => s + Math.hypot(ps[(i + 1) % ps.length].x - p.x, ps[(i + 1) % ps.length].y - p.y), 0);
function centroidOf(ps) {
  const A = signedArea(ps);
  if (Math.abs(A) < 1e-12) return { x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length };
  let cx = 0, cy = 0;
  for (let i = 0; i < ps.length; i++) { const p = ps[i], q = ps[(i + 1) % ps.length], f = p.x * q.y - q.x * p.y; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f; }
  return { x: cx / (6 * A), y: cy / (6 * A) };
}
function isConvex(ps, e) {
  let sign = 0, turn = 0;
  const n = ps.length;
  for (let i = 0; i < n; i++) {
    const a = ps[i], b = ps[(i + 1) % n], c = ps[(i + 2) % n];
    const u = { x: b.x - a.x, y: b.y - a.y }, w = { x: c.x - b.x, y: c.y - b.y };
    const cr = cross2(u, w), scale = Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y);
    if (scale === 0 || Math.abs(cr) <= e * scale) continue;
    const s = Math.sign(cr);
    if (sign !== 0 && s !== sign) return false;
    sign = s;
    turn += Math.atan2(cr, u.x * w.x + u.y * w.y);
  }
  return sign !== 0 && Math.abs(Math.abs(turn) - 2 * Math.PI) < 1e-6;
}
function hullOf(points, e) {
  const sorted = [...points].sort((p, q) => p.x - q.x || p.y - q.y)
    .filter((p, i, a) => i === 0 || p.x !== a[i - 1].x || p.y !== a[i - 1].y);
  if (sorted.length < 3) return sorted;
  const turn = (o, a, b) => {
    const cr = (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    return cr <= e * Math.hypot(a.x - o.x, a.y - o.y) * Math.hypot(b.x - o.x, b.y - o.y);
  };
  const half = list => {
    const h = [];
    for (const p of list) { while (h.length >= 2 && turn(h[h.length - 2], h[h.length - 1], p)) h.pop(); h.push(p); }
    h.pop();
    return h;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

export const blocks = [
  // ---- Points
  block({
    type: 'plane.point', icon: 'grid', label: L('2D point [x, y]', 'Punto 2D [x, y]'),
    inputs: [P('x', 'number', 'x'), P('y', 'number', 'y')],
    outputs: [POINT_OUT],
    run(inputs) {
      if (missing(inputs, 'x', 'y')) return undefined;
      return { point: { x: number(inputs.x, 'x'), y: number(inputs.y, 'y') } };
    },
  }),
  block({
    type: 'plane.split', icon: 'cols', label: L('Coordinates of a 2D point', 'Coordinate di un punto 2D'),
    inputs: [P('point', 'list', 'point [x, y]', 'punto [x, y]')],
    outputs: [P('x', 'number', 'x'), P('y', 'number', 'y')],
    run({ point }) {
      if (point === undefined) return undefined;
      const p = pt(point);
      return { x: p.x, y: p.y };
    },
  }),
  block({
    type: 'plane.distance', icon: 'fit', label: L('Distance (Math.hypot)', 'Distanza (Math.hypot)'),
    inputs: [P('p', 'list', 'point [x, y]', 'punto [x, y]'), P('a', 'list', 'a [x, y]'), P('b', 'list', 'b [x, y]')],
    outputs: [P('distance', 'number', 'distance', 'distanza'), P('closest', 'list', 'closest point', 'punto più vicino')],
    config: [{
      key: 'mode', type: 'select', default: 'points', label: L('Distance from the point to', 'Distanza del punto da'),
      options: [
        { value: 'points', label: L('another point (p, a)', 'un altro punto (p, a)') },
        { value: 'line', label: L('the line through a and b', 'la retta per a e b') },
        { value: 'segment', label: L('the segment a-b', 'il segmento a-b') },
      ],
    }],
    run(inputs, b) {
      const mode = b.config.mode;
      if (missing(inputs, ...(mode === 'points' ? ['p', 'a'] : ['p', 'a', 'b']))) return undefined;
      const p = pt(inputs.p), a = pt(inputs.a);
      if (mode === 'points') return { distance: Math.hypot(p.x - a.x, p.y - a.y) };
      const B = pt(inputs.b), d = { x: B.x - a.x, y: B.y - a.y }, dd = d.x * d.x + d.y * d.y;
      if (dd < 1e-24) {
        if (mode === 'line') throw new Error('I due punti coincidono: non definiscono una retta');
        return { distance: Math.hypot(p.x - a.x, p.y - a.y), closest: a };
      }
      let t = ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / dd;
      if (mode === 'segment') t = Math.max(0, Math.min(1, t));
      const q = { x: a.x + d.x * t, y: a.y + d.y * t };
      return { distance: Math.hypot(p.x - q.x, p.y - q.y), closest: q };
    },
  }),
  block({
    type: 'plane.midpoint', icon: 'split', label: L('Midpoint · Lerp (t)', 'Punto medio · Lerp (t)'),
    inputs: [P('a', 'list', 'a [x, y]'), P('b', 'list', 'b [x, y]'), P('t', 'number', 't')],
    outputs: [POINT_OUT],
    config: [{ key: 't', type: 'number', default: 0.5, label: L('t (if not linked)', 't (se non collegato)') }],
    run(inputs, b) {
      if (missing(inputs, 'a', 'b')) return undefined;
      const A = pt(inputs.a), B = pt(inputs.b), t = number(inputs.t ?? b.config.t ?? 0.5, 't');
      return { point: { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t } };
    },
  }),
  // ---- Lines
  block({
    type: 'plane.line', icon: 'link', label: L('Line through two points', 'Retta per due punti'),
    inputs: [P('p', 'list', 'point 1 [x, y]', 'punto 1 [x, y]'), P('q', 'list', 'point 2 [x, y]', 'punto 2 [x, y]')],
    outputs: [
      P('line', 'object', 'line', 'retta'), P('a', 'number', 'a'), P('b', 'number', 'b'), P('c', 'number', 'c'),
      P('slope', 'number', 'slope m', 'pendenza m'), P('intercept', 'number', 'intercept q', 'intercetta q'),
      P('vertical', 'bool', 'vertical', 'verticale'), P('equation', 'text', 'equation', 'equazione'),
    ],
    run(inputs) {
      if (missing(inputs, 'p', 'q')) return undefined;
      const l = lineFrom(pt(inputs.p), pt(inputs.q));
      const vertical = Math.abs(l.b) < 1e-12;
      return { ...lineOut(l), slope: vertical ? null : -l.a / l.b, intercept: vertical ? null : -l.c / l.b, vertical };
    },
  }),
  block({
    type: 'plane.parallel', icon: 'compare', label: L('Parallel · Perpendicular', 'Parallela · Perpendicolare'),
    inputs: [P('line', 'object', 'line', 'retta'), P('point', 'list', 'point [x, y]', 'punto [x, y]')],
    outputs: [P('line', 'object', 'new line', 'nuova retta'), P('a', 'number', 'a'), P('b', 'number', 'b'), P('c', 'number', 'c'), P('equation', 'text', 'equation', 'equazione'), P('foot', 'list', 'foot (perpendicular)', 'piede (perpendicolare)')],
    config: [{
      key: 'mode', type: 'select', default: 'parallel', label: L('The line is', 'La retta è'),
      options: [{ value: 'parallel', label: L('Parallel', 'Parallela') }, { value: 'perpendicular', label: L('Perpendicular', 'Perpendicolare') }],
    }],
    run(inputs, b) {
      if (missing(inputs, 'line', 'point')) return undefined;
      const l = toLine(inputs.line), p = pt(inputs.point);
      const perp = b.config.mode === 'perpendicular';
      const a = perp ? -l.b : l.a, bb = perp ? l.a : l.b;
      const n = l.a * l.a + l.b * l.b, k = (l.a * p.x + l.b * p.y + l.c) / n;
      return { ...lineOut(lineDir(p, { x: -bb, y: a })), foot: { x: p.x - l.a * k, y: p.y - l.b * k } };
    },
  }),
  block({
    type: 'plane.bisector', icon: 'branch', label: L('Bisector (axis of a segment · of an angle)', 'Asse · Bisettrice'),
    inputs: [P('a', 'list', 'a [x, y]'), P('b', 'list', 'b [x, y]'), P('vertex', 'list', 'vertex [x, y]', 'vertice [x, y]')],
    outputs: [P('line', 'object', 'line', 'retta'), P('equation', 'text', 'equation', 'equazione'), P('midpoint', 'list', 'midpoint', 'punto medio')],
    config: [{
      key: 'mode', type: 'select', default: 'segment', label: L('Of', 'Di'),
      options: [{ value: 'segment', label: L('Segment a-b (perpendicular bisector)', 'Segmento a-b (asse)') }, { value: 'angle', label: L('Angle a-vertex-b (bisector)', 'Angolo a-vertice-b (bisettrice)') }],
    }],
    run(inputs, b) {
      if (missing(inputs, 'a', 'b') || (b.config.mode === 'angle' && missing(inputs, 'vertex'))) return undefined;
      const A = pt(inputs.a), B = pt(inputs.b);
      if (b.config.mode === 'segment') {
        if (Math.hypot(B.x - A.x, B.y - A.y) < 1e-12) throw new Error('I due punti coincidono: non definiscono una retta');
        const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        return { ...lineOut(lineDir(m, { x: -(B.y - A.y), y: B.x - A.x })), midpoint: m };
      }
      const V = pt(inputs.vertex);
      const la = Math.hypot(A.x - V.x, A.y - V.y), lb = Math.hypot(B.x - V.x, B.y - V.y);
      if (la < 1e-12 || lb < 1e-12) throw new Error('Il vertice coincide con un punto');
      const u = { x: (A.x - V.x) / la, y: (A.y - V.y) / la }, w = { x: (B.x - V.x) / lb, y: (B.y - V.y) / lb };
      let d = { x: u.x + w.x, y: u.y + w.y };
      if (Math.hypot(d.x, d.y) < 1e-9) d = { x: -u.y, y: u.x };
      return lineOut(lineDir(V, d));
    },
  }),
  block({
    type: 'plane.intersect', icon: 'x', label: L('Intersection', 'Intersezione'),
    inputs: [P('a', 'any', 'a'), P('b', 'any', 'b')],
    outputs: [
      P('points', 'list', 'points [[x, y], …]', 'punti [[x, y], …]'), P('point', 'list', 'first point', 'primo punto'), P('count', 'number', 'count', 'quanti'),
      P('found', 'bool', 'found', 'trovato'), P('none', 'pulse', 'none', 'nessuna'),
    ],
    config: [
      {
        key: 'mode', type: 'select', default: 'lineLine', label: L('Between', 'Tra'),
        options: [
          { value: 'lineLine', label: L('Two lines', 'Due rette') }, { value: 'segSeg', label: L('Two segments', 'Due segmenti') },
          { value: 'lineCircle', label: L('A line and a circle', 'Una retta e un cerchio') }, { value: 'circleCircle', label: L('Two circles', 'Due cerchi') },
        ],
      },
      EPSILON,
    ],
    run(inputs, b) {
      if (missing(inputs, 'a', 'b')) return undefined;
      const e = eps(b), mode = b.config.mode;
      let found = [];
      if (mode === 'lineLine') {
        const l1 = toLine(inputs.a), l2 = toLine(inputs.b);
        const det = l1.a * l2.b - l2.a * l1.b;
        if (Math.abs(det) <= e * Math.hypot(l1.a, l1.b) * Math.hypot(l2.a, l2.b)) {
          const p = l2.p1, dist = Math.abs(l1.a * p.x + l1.b * p.y + l1.c) / Math.hypot(l1.a, l1.b);
          if (dist <= e) throw new Error('Le rette coincidono: i punti in comune sono infiniti');
        } else found = [{ x: (l1.b * l2.c - l2.b * l1.c) / det, y: (l1.c * l2.a - l2.c * l1.a) / det }];
      } else if (mode === 'segSeg') {
        const s1 = toLine(inputs.a), s2 = toLine(inputs.b);
        const r = { x: s1.p2.x - s1.p1.x, y: s1.p2.y - s1.p1.y }, s = { x: s2.p2.x - s2.p1.x, y: s2.p2.y - s2.p1.y };
        const lr = Math.hypot(r.x, r.y), ls = Math.hypot(s.x, s.y);
        const qp = { x: s2.p1.x - s1.p1.x, y: s2.p1.y - s1.p1.y }, rxs = cross2(r, s);
        if (Math.abs(rxs) <= e * lr * ls) {
          if (Math.abs(cross2(qp, r)) <= e * lr * Math.max(1, Math.hypot(qp.x, qp.y))) {
            const rr = r.x * r.x + r.y * r.y;
            const t0 = (qp.x * r.x + qp.y * r.y) / rr, t1 = t0 + (s.x * r.x + s.y * r.y) / rr;
            const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
            if (hi - lo > e) throw new Error('I segmenti si sovrappongono: i punti in comune sono infiniti');
            if (lo <= hi + e) found = [{ x: s1.p1.x + r.x * lo, y: s1.p1.y + r.y * lo }];
          }
        } else {
          const t = cross2(qp, s) / rxs, u = cross2(qp, r) / rxs;
          if (t >= -e && t <= 1 + e && u >= -e && u <= 1 + e) found = [{ x: s1.p1.x + r.x * t, y: s1.p1.y + r.y * t }];
        }
      } else if (mode === 'lineCircle') {
        const [lv, cv] = isShape(inputs.a) && inputs.a.kind === 'circle' ? [inputs.b, inputs.a] : [inputs.a, inputs.b];
        const l = toLine(lv), { c, r } = toCircle(cv), n = Math.hypot(l.a, l.b);
        const dist = (l.a * c.x + l.b * c.y + l.c) / n;
        const foot = { x: c.x - dist * l.a / n, y: c.y - dist * l.b / n }, dir = { x: -l.b / n, y: l.a / n };
        if (Math.abs(Math.abs(dist) - r) <= e) found = [foot];
        else if (Math.abs(dist) < r) {
          const h = Math.sqrt(r * r - dist * dist);
          found = [{ x: foot.x - dir.x * h, y: foot.y - dir.y * h }, { x: foot.x + dir.x * h, y: foot.y + dir.y * h }];
        }
      } else if (mode === 'circleCircle') {
        const c1 = toCircle(inputs.a), c2 = toCircle(inputs.b);
        const dx = c2.c.x - c1.c.x, dy = c2.c.y - c1.c.y, d = Math.hypot(dx, dy);
        if (d <= e && Math.abs(c1.r - c2.r) <= e) throw new Error('I cerchi coincidono: i punti in comune sono infiniti');
        if (d > e && d <= c1.r + c2.r + e && d >= Math.abs(c1.r - c2.r) - e) {
          const x = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d), h2 = c1.r * c1.r - x * x;
          const u = { x: dx / d, y: dy / d }, base = { x: c1.c.x + u.x * x, y: c1.c.y + u.y * x };
          if (h2 <= e * Math.max(1, c1.r * c1.r)) found = [base];
          else { const h = Math.sqrt(h2); found = [{ x: base.x - u.y * h, y: base.y + u.x * h }, { x: base.x + u.y * h, y: base.y - u.x * h }]; }
        }
      }
      const out = { points: found, count: found.length, found: found.length > 0 };
      if (found.length) out.point = found[0]; else out.none = true;
      return out;
    },
  }),
  // ---- Shapes
  block({
    type: 'plane.circle', icon: 'record', label: L('Circle', 'Cerchio'),
    inputs: [P('center', 'list', 'center [x, y]', 'centro [x, y]'), P('radius', 'number', 'radius', 'raggio'), P('p1', 'list', 'point 1 [x, y]', 'punto 1 [x, y]'), P('p2', 'list', 'point 2 [x, y]', 'punto 2 [x, y]'), P('p3', 'list', 'point 3 [x, y]', 'punto 3 [x, y]')],
    outputs: [P('circle', 'object', 'circle', 'cerchio'), P('center', 'list', 'center', 'centro'), P('radius', 'number', 'radius', 'raggio'), P('area', 'number', 'area'), P('circumference', 'number', 'circumference', 'circonferenza')],
    config: [{
      key: 'mode', type: 'select', default: 'radius', label: L('Defined by', 'Definito da'),
      options: [{ value: 'radius', label: L('Center and radius', 'Centro e raggio') }, { value: 'points', label: L('Three points', 'Tre punti') }],
    }],
    run(inputs, b) {
      let c, r;
      if (b.config.mode === 'points') {
        if (missing(inputs, 'p1', 'p2', 'p3')) return undefined;
        const [A, B, C] = [pt(inputs.p1), pt(inputs.p2), pt(inputs.p3)];
        const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
        const scale = Math.max(1, Math.hypot(B.x - A.x, B.y - A.y), Math.hypot(C.x - A.x, C.y - A.y));
        if (Math.abs(D) <= EPS * scale * scale) throw new Error('I tre punti sono allineati: non c\'è un cerchio');
        const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
        c = { x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / D, y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / D };
        r = Math.hypot(A.x - c.x, A.y - c.y);
      } else {
        if (missing(inputs, 'center', 'radius')) return undefined;
        c = pt(inputs.center); r = number(inputs.radius, 'raggio');
        if (r < 0) throw new Error('Il raggio non può essere negativo');
      }
      return { circle: circleShape(c, r), center: xy(c), radius: r, area: Math.PI * r * r, circumference: 2 * Math.PI * r };
    },
  }),
  block({
    type: 'plane.polygon', icon: 'rows', label: L('Polygon (area · perimeter)', 'Poligono (area · perimetro)'),
    inputs: [P('points', 'list', 'points [[x, y], …]', 'punti [[x, y], …]')],
    outputs: [
      P('polygon', 'object', 'polygon', 'poligono'), P('area', 'number', 'area'), P('perimeter', 'number', 'perimeter', 'perimetro'),
      P('centroid', 'list', 'centroid', 'baricentro'), P('convex', 'bool', 'convex', 'convesso'), P('orientation', 'text', 'orientation', 'orientamento'), P('count', 'number', 'vertices', 'vertici'),
    ],
    config: [EPSILON],
    run({ points }, b) {
      if (points === undefined) return undefined;
      const ps = pts(points, 3).map(xy), sa = signedArea(ps);
      return {
        polygon: polyShape(ps), area: Math.abs(sa), perimeter: perimeterOf(ps), centroid: centroidOf(ps),
        convex: isConvex(ps, eps(b)), orientation: Math.abs(sa) < 1e-12 ? 'none' : sa > 0 ? 'ccw' : 'cw', count: ps.length,
      };
    },
  }),
  block({
    type: 'plane.regular', icon: 'star', label: L('Regular polygon', 'Poligono regolare'),
    inputs: [P('n', 'number', 'sides', 'lati'), P('radius', 'number', 'radius', 'raggio'), P('center', 'list', 'center [x, y]', 'centro [x, y]'), P('rotation', 'number', 'rotation', 'rotazione')],
    outputs: [
      P('polygon', 'object', 'polygon', 'poligono'), P('vertices', 'list', 'vertices', 'vertici'), P('area', 'number', 'area'),
      P('apothem', 'number', 'apothem', 'apotema'), P('side', 'number', 'side', 'lato'), P('perimeter', 'number', 'perimeter', 'perimetro'), P('interior', 'number', 'interior angle', 'angolo interno'),
    ],
    config: [{ key: 'sides', type: 'number', default: 6, min: 3, max: 1000, label: L('Sides (if not linked)', 'Lati (se non collegato)') }, UNIT],
    run(inputs, b) {
      if (missing(inputs, 'radius')) return undefined;
      const n = number(inputs.n ?? b.config.sides, 'lati'), r = number(inputs.radius, 'raggio');
      if (!Number.isInteger(n) || n < 3 || n > 1000) throw new Error('I lati devono essere un intero da 3 a 1000');
      if (r < 0) throw new Error('Il raggio non può essere negativo');
      const c = inputs.center === undefined ? { x: 0, y: 0 } : pt(inputs.center), rot = inputs.rotation === undefined ? 0 : toRad(inputs.rotation, b);
      const vs = Array.from({ length: n }, (_, i) => ({ x: c.x + r * Math.cos(rot + 2 * Math.PI * i / n), y: c.y + r * Math.sin(rot + 2 * Math.PI * i / n) }));
      const side = 2 * r * Math.sin(Math.PI / n);
      return {
        polygon: polyShape(vs), vertices: vs, area: 0.5 * n * r * r * Math.sin(2 * Math.PI / n), apothem: r * Math.cos(Math.PI / n),
        side, perimeter: n * side, interior: fromRad(Math.PI * (n - 2) / n, b),
      };
    },
  }),
  block({
    type: 'plane.conic', icon: 'progress', label: L('Conic (ellipse · parabola · hyperbola)', 'Coniche (ellisse · parabola · iperbole)'),
    inputs: [P('center', 'list', 'center / vertex [x, y]', 'centro / vertice [x, y]'), P('a', 'number', 'a'), P('b', 'number', 'b'), P('p', 'number', 'p (parabola)')],
    outputs: [
      P('conic', 'object', 'conic', 'conica'), P('foci', 'list', 'foci', 'fuochi'), P('vertices', 'list', 'vertices', 'vertici'),
      P('eccentricity', 'number', 'eccentricity', 'eccentricità'), P('equation', 'text', 'equation', 'equazione'),
      P('directrix', 'text', 'directrix', 'direttrice'), P('area', 'number', 'area'),
    ],
    config: [
      {
        key: 'kind', type: 'select', default: 'ellipse', label: L('Conic', 'Conica'),
        options: [{ value: 'ellipse', label: L('Ellipse', 'Ellisse') }, { value: 'parabola', label: L('Parabola', 'Parabola') }, { value: 'hyperbola', label: L('Hyperbola', 'Iperbole') }],
      },
      {
        key: 'orientation', type: 'select', default: 'horizontal', label: L('Main axis', 'Asse principale'),
        options: [{ value: 'horizontal', label: L('Horizontal (x)', 'Orizzontale (x)') }, { value: 'vertical', label: L('Vertical (y)', 'Verticale (y)') }],
      },
    ],
    run(inputs, b) {
      const { kind, orientation } = b.config, vert = orientation === 'vertical';
      if (missing(inputs, 'center') || (kind === 'parabola' ? missing(inputs, 'p') : missing(inputs, 'a', 'b'))) return undefined;
      const C = xy(pt(inputs.center)), h = C.x, k = C.y;
      const sq = (v, n) => (v === 0 ? `${n}²` : `(${n} ${v < 0 ? '+' : '-'} ${fmt(Math.abs(v))})²`);
      const at = (x, y) => ({ x: h + x, y: k + y });
      if (kind === 'parabola') {
        const p = number(inputs.p, 'p');
        if (p === 0) throw new Error('Il parametro p non può essere zero');
        const f = vert ? at(0, p) : at(p, 0);
        const lin = (v, n) => (v === 0 ? n : `(${n} ${v < 0 ? '+' : '-'} ${fmt(Math.abs(v))})`);
        return {
          conic: { kind: 'parabola', vertex: C, p, orientation },
          foci: [f], vertices: [C], eccentricity: 1,
          equation: vert ? `${sq(h, 'x')} = ${fmt(4 * p)}${lin(k, 'y')}` : `${sq(k, 'y')} = ${fmt(4 * p)}${lin(h, 'x')}`,
          directrix: vert ? `y = ${fmt(k - p)}` : `x = ${fmt(h - p)}`,
        };
      }
      const a = number(inputs.a, 'a'), bb = number(inputs.b, 'b');
      if (!(a > 0 && bb > 0)) throw new Error('I semiassi devono essere maggiori di zero');
      if (kind === 'ellipse') {
        const rx = vert ? bb : a, ry = vert ? a : bb, c = Math.sqrt(Math.abs(rx * rx - ry * ry));
        return {
          conic: { kind: 'ellipse', center: C, rx, ry, rotation: 0 },
          foci: rx >= ry ? [at(-c, 0), at(c, 0)] : [at(0, -c), at(0, c)],
          vertices: [at(-rx, 0), at(rx, 0), at(0, -ry), at(0, ry)], eccentricity: c / Math.max(rx, ry),
          equation: `${sq(h, 'x')}/${fmt(rx * rx)} + ${sq(k, 'y')}/${fmt(ry * ry)} = 1`, area: Math.PI * rx * ry,
        };
      }
      const c = Math.sqrt(a * a + bb * bb);
      return {
        conic: { kind: 'hyperbola', center: C, a, b: bb, orientation },
        foci: vert ? [at(0, -c), at(0, c)] : [at(-c, 0), at(c, 0)], vertices: vert ? [at(0, -a), at(0, a)] : [at(-a, 0), at(a, 0)],
        eccentricity: c / a,
        equation: vert ? `${sq(k, 'y')}/${fmt(a * a)} - ${sq(h, 'x')}/${fmt(bb * bb)} = 1` : `${sq(h, 'x')}/${fmt(a * a)} - ${sq(k, 'y')}/${fmt(bb * bb)} = 1`,
      };
    },
  }),
  block({
    type: 'plane.inside', icon: 'lasso', label: L('Point inside shape', 'Punto dentro figura'),
    inputs: [P('shape', 'any', 'shape', 'figura'), P('point', 'list', 'point [x, y]', 'punto [x, y]')],
    outputs: [
      P('where', 'text', 'where', 'posizione'), P('inside', 'bool', 'inside', 'dentro'), P('edge', 'bool', 'on the edge', 'sul bordo'), P('outside', 'bool', 'outside', 'fuori'),
    ],
    config: [{ ...EPSILON, label: L('Tolerance for the edge', 'Tolleranza per il bordo') }],
    run(inputs, b) {
      if (missing(inputs, 'shape', 'point')) return undefined;
      const e = eps(b), p = pt(inputs.point), s = inputs.shape;
      let where;
      const kind = isShape(s) ? s.kind : Array.isArray(s) ? 'polygon' : null;
      if (kind === 'circle') {
        const { c, r } = toCircle(s), d = Math.hypot(p.x - c.x, p.y - c.y);
        where = Math.abs(d - r) <= e ? 'edge' : d < r ? 'inside' : 'outside';
      } else if (kind === 'rect') {
        const [x0, y0, x1, y1] = rectBounds(s);
        if (p.x < x0 - e || p.x > x1 + e || p.y < y0 - e || p.y > y1 + e) where = 'outside';
        else where = Math.min(p.x - x0, x1 - p.x, p.y - y0, y1 - p.y) <= e ? 'edge' : 'inside';
      } else if (kind === 'polygon') {
        const ps = pts(Array.isArray(s) ? s : s.points, 3);
        if (ps.some((q, i) => distSeg(p, q, ps[(i + 1) % ps.length]) <= e)) where = 'edge';
        else {
          let inside = false;
          for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
            const qi = ps[i], qj = ps[j];
            if ((qi.y > p.y) !== (qj.y > p.y) && p.x < (qj.x - qi.x) * (p.y - qi.y) / (qj.y - qi.y) + qi.x) inside = !inside;
          }
          where = inside ? 'inside' : 'outside';
        }
      } else throw new Error(`Figura non supportata: «${kind ?? show(s)}»`);
      return { where, inside: where === 'inside', edge: where === 'edge', outside: where === 'outside' };
    },
  }),
  block({
    type: 'plane.bounds', icon: 'max', label: L('Bounding box', 'Rettangolo di ingombro'),
    inputs: [P('points', 'any', 'points or shapes', 'punti o figure')],
    outputs: [
      P('rect', 'object', 'rectangle', 'rettangolo'), P('min', 'list', 'min'), P('max', 'list', 'max'), P('width', 'number', 'width', 'larghezza'),
      P('height', 'number', 'height', 'altezza'), P('center', 'list', 'center', 'centro'), P('area', 'number', 'area'),
    ],
    run({ points }) {
      if (points === undefined) return undefined;
      const ps = extentOfAll(points);
      if (!ps.length) throw new Error('Serve almeno un punto');
      const xs = ps.map(p => p.x), ys = ps.map(p => p.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      return {
        rect: rectShape(x0, y0, x1, y1), min: { x: x0, y: y0 }, max: { x: x1, y: y1 }, width: x1 - x0, height: y1 - y0,
        center: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, area: (x1 - x0) * (y1 - y0),
      };
    },
  }),
  block({
    type: 'plane.hull', icon: 'lasso', label: L('Convex hull', 'Inviluppo convesso'),
    inputs: [P('points', 'list', 'points [[x, y], …]', 'punti [[x, y], …]')],
    outputs: [P('hull', 'list', 'hull', 'inviluppo'), P('polygon', 'object', 'polygon', 'poligono'), P('count', 'number', 'count', 'quanti'), P('area', 'number', 'area')],
    config: [EPSILON],
    run({ points }, b) {
      if (points === undefined) return undefined;
      const h = hullOf(pts(points).map(xy), eps(b));
      return { hull: h, ...(h.length >= 3 && { polygon: polyShape(h) }), count: h.length, area: h.length >= 3 ? Math.abs(signedArea(h)) : 0 };
    },
  }),
  // ---- Transformations
  block({
    type: 'plane.transform', icon: 'free', label: L('Transform (translate · rotate · scale · reflect · shear)', 'Trasforma (trasla · ruota · scala · rifletti · taglia)'),
    inputs: [P('target', 'any', 'point, points or shape', 'punto, punti o figura'), ...TRANSFORM_INPUTS],
    outputs: [P('result', 'any', 'result', 'risultato')],
    config: TRANSFORM_CONFIG,
    run(inputs, b) {
      if (missing(inputs, 'target')) return undefined;
      return { result: applyTo(inputs.target, opMatrix(b.config.op, inputs, b)) };
    },
  }),
  block({
    type: 'plane.matrix', icon: 'matrix', label: L('Transformation matrix (3×3)', 'Matrice di trasformazione (3×3)'),
    inputs: [P('base', 'matrix', 'base matrix', 'matrice di base'), ...TRANSFORM_INPUTS],
    outputs: [P('matrix', 'matrix', 'matrix', 'matrice')],
    grow: { inputs: { type: 'matrix', max: 16, name: 'letter' } },
    config: TRANSFORM_CONFIG.map(f => (f.key === 'op' ? { ...f, default: 'identity', options: [{ value: 'identity', label: L('None (only compose)', 'Nessuna (solo compone)') }, ...OPS] } : f)),
    run(inputs, b) {
      let M = inputs.base === undefined ? I3() : toM(inputs.base);
      for (const p of b.added.inputs) if (p.value !== undefined) M = mul3(toM(p.value), M);
      if (b.config.op !== 'identity') M = mul3(opMatrix(b.config.op, inputs, b), M);
      return { matrix: M };
    },
  }),
  block({
    type: 'plane.apply', icon: 'play', label: L('Apply matrix', 'Applica matrice'),
    inputs: [P('target', 'any', 'point, points or shape', 'punto, punti o figura'), P('matrix', 'matrix', 'matrix', 'matrice')],
    outputs: [P('result', 'any', 'result', 'risultato')],
    run({ target, matrix }) {
      if (target === undefined || matrix === undefined) return undefined;
      return { result: applyTo(target, toM(matrix)) };
    },
  }),
  // ---- Drawing
  block({
    type: 'plane.svg', icon: 'image', label: L('Shape → SVG', 'Figura → SVG'),
    inputs: [P('shapes', 'any', 'shape, points or list', 'figura, punti o lista')],
    outputs: [P('svg', 'text', 'SVG')],
    config: [
      { key: 'stroke', type: 'text', default: '#222222', label: L('Stroke colour', 'Colore del contorno') },
      { key: 'fill', type: 'text', default: 'none', label: L('Fill colour', 'Colore di riempimento') },
      { key: 'strokeWidth', type: 'number', default: 1.5, min: 0, max: 50, label: L('Stroke width (pixels)', 'Spessore del contorno (pixel)') },
      { key: 'pointRadius', type: 'number', default: 3, min: 0, max: 50, label: L('Point radius (pixels)', 'Raggio dei punti (pixel)') },
      { key: 'padding', type: 'number', default: 10, min: 0, max: 1000, label: L('Margin (pixels)', 'Margine (pixel)') },
      { key: 'width', type: 'number', default: 400, min: 10, max: 4000, label: L('Width (pixels)', 'Larghezza (pixel)') },
      { key: 'flipY', type: 'checkbox', default: true, label: L('y goes up (as in maths)', 'La y va verso l\'alto (come in matematica)') },
    ],
    run({ shapes }, b) {
      if (shapes === undefined) return undefined;
      const colour = (v, what) => {
        const s = String(v ?? '').trim();
        if (!/^(none|currentColor|#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(rgb|rgba|hsl|hsla)\([0-9 ,.%]{1,40}\))$/.test(s)) throw new Error(`Colore non valido: «${what}»`);
        return s;
      };
      const stroke = colour(b.config.stroke, 'contorno'), fill = colour(b.config.fill, 'riempimento');
      const sw = Math.max(0, number(b.config.strokeWidth, 'spessore')), pr = Math.max(0, number(b.config.pointRadius, 'raggio dei punti'));
      const pad = Math.max(0, number(b.config.padding, 'margine')), width = Math.max(10, number(b.config.width, 'larghezza'));
      const flip = b.config.flipY !== false, fy = y => (flip ? -y : y);
      const items = [];
      const walk = v => { if (Array.isArray(v) && !isPointArr(v)) v.forEach(walk); else items.push(v); };
      walk(shapes);
      const ext = items.flatMap(extentOf);
      if (!ext.length) throw new Error('Non c\'è niente da disegnare');
      const xs = ext.map(p => p.x), ys = ext.map(p => fy(p.y));
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const w = Math.max(x1 - x0, 1e-9), h = Math.max(y1 - y0, 1e-9);
      // the margin is in pixels: it gives the scale, then the viewBox grows by the margin
      const scale = (width - 2 * pad) / w;
      const m = pad / Math.max(scale, 1e-12);
      const vb = [x0 - m, y0 - m, w + 2 * m, h + 2 * m];
      const height = Math.max(1, Math.round(width * vb[3] / vb[2]));
      const f = x => String(Number(Number(x).toFixed(4)));
      const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const px = width / vb[2];
      const attrs = `fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${f(sw)}" vector-effect="non-scaling-stroke"`;
      const poly = (ps, close) => `<${close ? 'polygon' : 'polyline'} points="${ps.map(p => `${f(p.x)},${f(fy(p.y))}`).join(' ')}" ${close ? attrs : `${attrs.replace(/fill="[^"]*"/, 'fill="none"')}`}/>`;
      const parts = items.map(it => {
        if (isPointLike(it)) { const p = pt(it); return `<circle cx="${f(p.x)}" cy="${f(fy(p.y))}" r="${f(pr / px)}" fill="${esc(stroke)}" stroke="none"/>`; }
        if (!isShape(it)) throw new Error(`Non è un punto né una figura: «${show(it)}»`);
        switch (it.kind) {
          case 'circle': { const { c, r } = toCircle(it); return `<circle cx="${f(c.x)}" cy="${f(fy(c.y))}" r="${f(r)}" ${attrs}/>`; }
          case 'ellipse': {
            const c = pt(it.center), deg = number(it.rotation ?? 0) * 180 / Math.PI;
            return `<ellipse cx="${f(c.x)}" cy="${f(fy(c.y))}" rx="${f(number(it.rx))}" ry="${f(number(it.ry))}" transform="rotate(${f(flip ? -deg : deg)} ${f(c.x)} ${f(fy(c.y))})" ${attrs}/>`;
          }
          case 'polygon': return poly(pts(it.points), true);
          case 'rect': { const [a0, b0, a1, b1] = rectBounds(it); return `<rect x="${f(a0)}" y="${f(flip ? -b1 : b0)}" width="${f(a1 - a0)}" height="${f(b1 - b0)}" ${attrs}/>`; }
          case 'line': { const p = pt(it.p1), q = pt(it.p2); return `<line x1="${f(p.x)}" y1="${f(fy(p.y))}" x2="${f(q.x)}" y2="${f(fy(q.y))}" ${attrs.replace(/fill="[^"]*"/, 'fill="none"')}/>`; }
          default: return curvePoints(it).map(c => poly(c, false)).join('');
        }
      });
      return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${vb.map(f).join(' ')}">${parts.join('')}</svg>` };
    },
  }),
];

/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
const SUBCATEGORIES = [
  ['planePoints', L('Plane: points and lines', 'Piano: punti e rette'), ['plane.point', 'plane.split', 'plane.distance', 'plane.midpoint', 'plane.line', 'plane.parallel', 'plane.bisector', 'plane.intersect']],
  ['planeShapes', L('Plane: shapes', 'Piano: figure'), ['plane.circle', 'plane.polygon', 'plane.regular', 'plane.conic', 'plane.inside', 'plane.bounds', 'plane.hull']],
  ['planeTransform', L('Plane: transformations and drawing', 'Piano: trasformazioni e disegno'), ['plane.transform', 'plane.matrix', 'plane.apply', 'plane.svg']],
];
SUBCATEGORIES.forEach(([id, label, types], i) => {
  for (const b of blocks) if (types.includes(b.type)) b.subcategory = { id, label, order: i };
});
