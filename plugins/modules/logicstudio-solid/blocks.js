/**
 * The solid geometry blocks of Logic Studio, loaded by the engine in each user's worker (and read
 * in the kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js.
 *
 * Solids: the dimensions come in on the inputs, every measure goes out; a block waits until all
 * its dimensions have arrived. No units: lengths in any unit, areas in its square, volumes in its
 * cube. Analytic geometry: a point or a vector is a list [x, y, z] (an object { x, y, z } is
 * accepted too), so it works with the blocks of Liste e matrici. Results have 15 significant digits.
 */

const L = (en, it) => ({ en, it });
const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : v === null || v === undefined || v === '' ? NaN : Number(String(v).trim().replace(',', '.')));
const tidy = x => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toPrecision(15)) : x);
const tidyAll = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.map(tidy) : tidy(v)]));
const { PI, sqrt, cbrt, tan, sin, cos } = Math;
const SQ5 = sqrt(5);

const UNITS = { deg: PI / 180, rad: 1, grad: PI / 200, turn: 2 * PI };
const unitField = (label = L('Angle unit', 'Unità degli angoli')) => ({
  key: 'unit', type: 'select', default: 'deg', label,
  options: [
    { value: 'deg', label: L('Degrees (°)', 'Gradi (°)') }, { value: 'rad', label: L('Radians (rad)', 'Radianti (rad)') },
    { value: 'grad', label: L('Gradians (gon)', 'Gradi centesimali (gon)') }, { value: 'turn', label: L('Turns', 'Giri') },
  ],
});
const toRad = (v, b) => v * (UNITS[b.config.unit] ?? UNITS.deg);
const fromRad = (r, b) => r / (UNITS[b.config.unit] ?? UNITS.deg);

/** A port: [name, en, it, extra?] → { name, type: 'number', label }. */
const P = ([name, en, it, extra = {}]) => ({ name, type: 'number', label: L(en, it), ...extra });

/** A number greater than 0, or an error naming the input. */
function positive(v, what) {
  const n = num(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${what}: serve un numero maggiore di 0${v === undefined ? '' : ` (arrivato: ${typeof v === 'object' ? JSON.stringify(v) : v})`}`);
  return n;
}
function finite(v, what) {
  const n = num(v);
  if (!Number.isFinite(n)) throw new Error(`${what}: serve un numero`);
  return n;
}
function sidesOf(v) {
  const n = num(v);
  if (!Number.isInteger(n) || n < 3 || n > 1000) throw new Error('Il numero di lati deve essere un intero da 3 a 1000');
  return n;
}

/**
 * A solid: inputs [[name, en, it]], outputs [[name, en, it, extra?]], compute(values, b) → { … }.
 * The block waits until every input has a value; each must be a number greater than 0 (`n`, the
 * number of sides, an integer from 3).
 */
const solid = (type, icon, label, ins, outs, compute, config = []) => ({
  type, version: 1, category: 'geometry', icon, label,
  inputs: ins.map(P),
  outputs: outs.map(P),
  config,
  run(inputs, b) {
    const v = {};
    for (const [name, , it] of ins) {
      if (inputs[name] === undefined) return undefined;
      v[name] = name === 'n' ? sidesOf(inputs[name]) : positive(inputs[name], it);
    }
    return tidyAll(compute(v, b));
  },
});

/** A regular polygon of n sides s: area, apothem, circumradius. */
const polygon = (n, s) => ({ area: n * s * s / (4 * tan(PI / n)), apothem: s / (2 * tan(PI / n)), radius: s / (2 * sin(PI / n)) });

const V = ['volume', 'volume', 'volume'], A = ['area', 'total area', 'area totale'], AL = ['lateral', 'lateral area', 'area laterale'];
const AB = ['base', 'base area', 'area di base', { hidden: true }];

// ---------------------------------------------------------------- regular polyhedra

const POLYHEDRA = {
  tetrahedron: { label: L('Tetrahedron (4 faces)', 'Tetraedro (4 facce)'), V: 1 / (6 * sqrt(2)), A: sqrt(3), rin: 1 / (2 * sqrt(6)), rmid: 1 / (2 * sqrt(2)), R: sqrt(6) / 4, dihedral: Math.acos(1 / 3), f: 4, e: 6, v: 4 },
  cube: { label: L('Cube (6 faces)', 'Cubo (6 facce)'), V: 1, A: 6, rin: 0.5, rmid: 1 / sqrt(2), R: sqrt(3) / 2, dihedral: PI / 2, f: 6, e: 12, v: 8 },
  octahedron: { label: L('Octahedron (8 faces)', 'Ottaedro (8 facce)'), V: sqrt(2) / 3, A: 2 * sqrt(3), rin: 1 / sqrt(6), rmid: 0.5, R: 1 / sqrt(2), dihedral: Math.acos(-1 / 3), f: 8, e: 12, v: 6 },
  dodecahedron: { label: L('Dodecahedron (12 faces)', 'Dodecaedro (12 facce)'), V: (15 + 7 * SQ5) / 4, A: 3 * sqrt(25 + 10 * SQ5), rin: sqrt((25 + 11 * SQ5) / 10) / 2, rmid: (3 + SQ5) / 4, R: sqrt(3) * (1 + SQ5) / 4, dihedral: Math.acos(-1 / SQ5), f: 12, e: 30, v: 20 },
  icosahedron: { label: L('Icosahedron (20 faces)', 'Icosaedro (20 facce)'), V: 5 * (3 + SQ5) / 12, A: 5 * sqrt(3), rin: sqrt(3) * (3 + SQ5) / 12, rmid: (1 + SQ5) / 4, R: sqrt(10 + 2 * SQ5) / 4, dihedral: Math.acos(-SQ5 / 3), f: 20, e: 30, v: 12 },
};

// ---------------------------------------------------------------- from a measure

const FROM_MEASURE = {
  cubeV: [L('Cube: side from the volume', 'Cubo: lato dal volume'), m => cbrt(m)],
  cubeA: [L('Cube: side from the total area', 'Cubo: lato dall\'area totale'), m => sqrt(m / 6)],
  sphereV: [L('Sphere: radius from the volume', 'Sfera: raggio dal volume'), m => cbrt(3 * m / (4 * PI))],
  sphereA: [L('Sphere: radius from the area', 'Sfera: raggio dalla superficie'), m => sqrt(m / (4 * PI))],
  cylinderR: [L('Cylinder: radius from the volume and the height', 'Cilindro: raggio dal volume e dall\'altezza'), (m, k) => sqrt(m / (PI * k)), true],
  cylinderH: [L('Cylinder: height from the volume and the radius', 'Cilindro: altezza dal volume e dal raggio'), (m, k) => m / (PI * k * k), true],
  coneR: [L('Cone: radius from the volume and the height', 'Cono: raggio dal volume e dall\'altezza'), (m, k) => sqrt(3 * m / (PI * k)), true],
  coneH: [L('Cone: height from the volume and the radius', 'Cono: altezza dal volume e dal raggio'), (m, k) => 3 * m / (PI * k * k), true],
};

// ---------------------------------------------------------------- materials (kg/m³, typical values)

const MATERIALS = {
  water: [L('Water (4 °C)', 'Acqua (4 °C)'), 1000], seawater: [L('Sea water', 'Acqua di mare'), 1025], ice: [L('Ice', 'Ghiaccio'), 917],
  air: [L('Air (20 °C, 1 atm)', 'Aria (20 °C, 1 atm)'), 1.204],
  steel: [L('Steel', 'Acciaio'), 7850], stainless: [L('Stainless steel', 'Acciaio inox'), 8000], iron: [L('Iron', 'Ferro'), 7874], castIron: [L('Cast iron', 'Ghisa'), 7200],
  aluminium: [L('Aluminium', 'Alluminio'), 2700], copper: [L('Copper', 'Rame'), 8960], brass: [L('Brass', 'Ottone'), 8500], bronze: [L('Bronze', 'Bronzo'), 8800],
  lead: [L('Lead', 'Piombo'), 11340], zinc: [L('Zinc', 'Zinco'), 7140], titanium: [L('Titanium', 'Titanio'), 4506], gold: [L('Gold', 'Oro'), 19320], silver: [L('Silver', 'Argento'), 10490],
  concrete: [L('Concrete', 'Calcestruzzo'), 2400], brick: [L('Brick', 'Mattone'), 1800], glass: [L('Glass', 'Vetro'), 2500], marble: [L('Marble', 'Marmo'), 2700], granite: [L('Granite', 'Granito'), 2750],
  oak: [L('Oak wood', 'Legno di quercia'), 750], pine: [L('Pine wood', 'Legno di pino'), 500],
  pla: [L('PLA (3D printing)', 'PLA (stampa 3D)'), 1240], abs: [L('ABS', 'ABS'), 1050], pvc: [L('PVC', 'PVC'), 1380], rubber: [L('Rubber', 'Gomma'), 1100],
};
const VOLUME_UNITS = { m3: [L('m³', 'm³'), 1], L: [L('L (dm³)', 'L (dm³)'), 1e-3], cm3: [L('cm³ (mL)', 'cm³ (mL)'), 1e-6], mm3: [L('mm³', 'mm³'), 1e-9] };

// ---------------------------------------------------------------- points and vectors

/** [x, y, z] from a list (2 values: z = 0) or an object { x, y, z }. */
function vec(v, what) {
  let p = v;
  if (p && typeof p === 'object' && !Array.isArray(p)) p = [p.x, p.y, p.z ?? 0];
  if (Array.isArray(p) && p.length === 2) p = [p[0], p[1], 0];
  if (!Array.isArray(p) || p.length !== 3) throw new Error(`${what}: serve un punto o un vettore [x, y, z]`);
  const out = p.map(num);
  if (out.some(n => !Number.isFinite(n))) throw new Error(`${what}: le coordinate devono essere numeri`);
  return out;
}
const vAdd = (u, v) => u.map((x, i) => x + v[i]);
const vSub = (u, v) => u.map((x, i) => x - v[i]);
const vScale = (u, k) => u.map(x => x * k);
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const norm = u => Math.hypot(...u);
const unit = (u, what) => { const n = norm(u); if (n === 0) throw new Error(`${what}: il vettore nullo non ha una direzione`); return vScale(u, 1 / n); };
const angleBetween = (u, v) => {
  const n = norm(u) * norm(v);
  if (n === 0) throw new Error('L\'angolo con il vettore nullo non è definito');
  return Math.acos(Math.min(1, Math.max(-1, dot(u, v) / n)));
};

/** A plane { a, b, c, d } (a x + b y + c z + d = 0) from an object or a list [a, b, c, d]. */
function planeOf(v) {
  const p = Array.isArray(v) ? { a: v[0], b: v[1], c: v[2], d: v[3] } : v && typeof v === 'object' ? v : null;
  if (!p) throw new Error('piano: serve un oggetto { a, b, c, d } o una lista [a, b, c, d]');
  const out = { a: num(p.a), b: num(p.b), c: num(p.c), d: num(p.d) };
  if (Object.values(out).some(n => !Number.isFinite(n))) throw new Error('piano: a, b, c e d devono essere numeri');
  if (out.a === 0 && out.b === 0 && out.c === 0) throw new Error('piano: a, b e c non possono essere tutti 0');
  return out;
}

/** Rotation of p about the unit axis k by θ (Rodrigues). */
const rotate = (p, k, th) => {
  const c = cos(th), s = sin(th);
  return vAdd(vAdd(vScale(p, c), vScale(cross(k, p), s)), vScale(k, dot(k, p) * (1 - c)));
};

const signed = v => (v === 0 ? '' : v > 0 ? ` + ${tidy(v)}` : ` - ${tidy(-v)}`);
const term = (c, name, first) => {
  if (c === 0) return '';
  const abs = Math.abs(c) === 1 ? '' : String(tidy(Math.abs(c)));
  return first ? `${c < 0 ? '-' : ''}${abs}${name}` : ` ${c < 0 ? '-' : '+'} ${abs}${name}`;
};
const equationOf = ({ a, b, c, d }) => {
  let s = '';
  for (const [k, n] of [[a, 'x'], [b, 'y'], [c, 'z']]) s += term(k, n, s === '');
  return `${s}${signed(d)} = 0`;
};

const POINT_OUT = { name: 'point', type: 'list', label: L('point', 'punto') };
const listIn = (name, en, it, extra = {}) => ({ name, type: 'list', label: L(en, it), ...extra });

const COORDS = [
  { value: 'cartesian', label: L('Cartesian [x, y, z]', 'Cartesiane [x, y, z]') },
  { value: 'cylindrical', label: L('Cylindrical [ρ, φ, z]', 'Cilindriche [ρ, φ, z]') },
  { value: 'spherical', label: L('Spherical [r, θ, φ] (θ from the z axis)', 'Sferiche [r, θ, φ] (θ dall\'asse z)') },
];

const VECTOR_OPS = {
  add: [L('u + v (sum)', 'u + v (somma)'), (u, v) => vAdd(u, v)],
  sub: [L('u − v (difference)', 'u − v (differenza)'), (u, v) => vSub(u, v)],
  scale: [L('k · u (scale)', 'k · u (per un numero)'), (u, v, w, k) => vScale(u, k)],
  dot: [L('u · v (dot product)', 'u · v (prodotto scalare)'), (u, v) => dot(u, v)],
  cross: [L('u × v (cross product)', 'u × v (prodotto vettoriale)'), (u, v) => cross(u, v)],
  norm: [L('|u| (length)', '|u| (modulo)'), u => norm(u)],
  normalize: [L('u / |u| (unit vector)', 'u / |u| (versore)'), u => unit(u, 'u')],
  angle: [L('Angle between u and v', 'Angolo tra u e v'), (u, v, w, k, b) => fromRad(angleBetween(u, v), b)],
  triple: [L('u · (v × w) (triple product)', 'u · (v × w) (prodotto misto)'), (u, v, w) => dot(u, cross(v, w))],
  project: [L('Projection of u on v', 'Proiezione di u su v'), (u, v) => { const n = dot(v, v); if (n === 0) throw new Error('v: il vettore nullo non ha una direzione'); return vScale(v, dot(u, v) / n); }],
};
const NEEDS = { add: 'uv', sub: 'uv', scale: 'uk', dot: 'uv', cross: 'uv', norm: 'u', normalize: 'u', angle: 'uv', triple: 'uvw', project: 'uv' };

const TRANSFORMS = {
  translate: L('Translate by the vector', 'Trasla del vettore'),
  scale: L('Scale by the factors [kx, ky, kz] from the centre', 'Scala dei fattori [kx, ky, kz] dal centro'),
  rotateX: L('Rotate about the x axis through the centre', 'Ruota attorno all\'asse x per il centro'),
  rotateY: L('Rotate about the y axis through the centre', 'Ruota attorno all\'asse y per il centro'),
  rotateZ: L('Rotate about the z axis through the centre', 'Ruota attorno all\'asse z per il centro'),
  rotateAxis: L('Rotate about the vector through the centre', 'Ruota attorno al vettore per il centro'),
};

// ---------------------------------------------------------------- blocks

export const blocks = [
  solid('solid.cube', 'cube', L('Cube', 'Cubo'),
    [['side', 'side', 'lato']],
    [V, A, AL, ['faceDiagonal', 'face diagonal', 'diagonale della faccia', { hidden: true }], ['diagonal', 'diagonal', 'diagonale'], ['inradius', 'inscribed sphere radius', 'raggio della sfera inscritta', { hidden: true }], ['circumradius', 'circumscribed sphere radius', 'raggio della sfera circoscritta', { hidden: true }]],
    ({ side: s }) => ({ volume: s ** 3, area: 6 * s * s, lateral: 4 * s * s, faceDiagonal: s * sqrt(2), diagonal: s * sqrt(3), inradius: s / 2, circumradius: s * sqrt(3) / 2 })),
  solid('solid.cuboid', 'cube', L('Cuboid (rectangular box)', 'Parallelepipedo rettangolo'),
    [['a', 'length a', 'lunghezza a'], ['b', 'width b', 'larghezza b'], ['c', 'height c', 'altezza c']],
    [V, A, AL, AB, ['diagonal', 'diagonal', 'diagonale']],
    ({ a, b, c }) => ({ volume: a * b * c, area: 2 * (a * b + b * c + c * a), lateral: 2 * c * (a + b), base: a * b, diagonal: Math.hypot(a, b, c) })),
  solid('solid.prism', 'cube', L('Regular right prism', 'Prisma retto regolare'),
    [['n', 'sides of the base', 'lati della base'], ['side', 'side', 'lato'], ['h', 'height', 'altezza']],
    [V, A, AL, AB, ['perimeter', 'base perimeter', 'perimetro di base', { hidden: true }], ['apothem', 'base apothem', 'apotema di base', { hidden: true }]],
    ({ n, side, h }) => { const p = polygon(n, side); return { volume: p.area * h, area: n * side * h + 2 * p.area, lateral: n * side * h, base: p.area, perimeter: n * side, apothem: p.apothem }; }),
  solid('solid.prismGeneric', 'cube', L('Right prism (any base)', 'Prisma retto (base qualsiasi)'),
    [['base', 'base area', 'area di base'], ['perimeter', 'base perimeter', 'perimetro di base'], ['h', 'height', 'altezza']],
    [V, A, AL],
    ({ base, perimeter, h }) => ({ volume: base * h, area: perimeter * h + 2 * base, lateral: perimeter * h })),
  solid('solid.pyramid', 'triangle', L('Regular right pyramid', 'Piramide retta regolare'),
    [['n', 'sides of the base', 'lati della base'], ['side', 'side', 'lato'], ['h', 'height', 'altezza']],
    [V, A, AL, AB, ['slant', 'apothem (slant height)', 'apotema'], ['edge', 'lateral edge', 'spigolo laterale', { hidden: true }]],
    ({ n, side, h }) => {
      const p = polygon(n, side), slant = Math.hypot(h, p.apothem);
      return { volume: p.area * h / 3, area: p.area + n * side * slant / 2, lateral: n * side * slant / 2, base: p.area, slant, edge: Math.hypot(h, p.radius) };
    }),
  solid('solid.frustumPyramid', 'triangle', L('Frustum of a regular pyramid', 'Tronco di piramide regolare'),
    [['n', 'sides of the bases', 'lati delle basi'], ['L', 'big base side', 'lato della base maggiore'], ['l', 'small base side', 'lato della base minore'], ['h', 'height', 'altezza']],
    [V, A, AL, ['slant', 'apothem (slant height)', 'apotema'], ['edge', 'lateral edge', 'spigolo laterale', { hidden: true }], ['base', 'big base area', 'area della base maggiore', { hidden: true }], ['top', 'small base area', 'area della base minore', { hidden: true }]],
    ({ n, L: big, l, h }) => {
      if (l > big) throw new Error('Il lato della base minore non può superare quello della base maggiore');
      const p = polygon(n, big), q = polygon(n, l);
      const slant = Math.hypot(h, p.apothem - q.apothem), lateral = n * (big + l) * slant / 2;
      return { volume: h / 3 * (p.area + q.area + sqrt(p.area * q.area)), area: lateral + p.area + q.area, lateral, slant, edge: Math.hypot(h, p.radius - q.radius), base: p.area, top: q.area };
    }),
  solid('solid.cylinder', 'cube', L('Cylinder', 'Cilindro'),
    [['r', 'radius', 'raggio'], ['h', 'height', 'altezza']],
    [V, A, AL, AB],
    ({ r, h }) => ({ volume: PI * r * r * h, area: 2 * PI * r * (r + h), lateral: 2 * PI * r * h, base: PI * r * r })),
  solid('solid.cone', 'triangle', L('Cone', 'Cono'),
    [['r', 'radius', 'raggio'], ['h', 'height', 'altezza']],
    [V, A, AL, AB, ['slant', 'apothem (slant height)', 'apotema'], ['angle', 'opening angle', 'angolo di apertura', { hidden: true }]],
    ({ r, h }, b) => { const s = Math.hypot(r, h); return { volume: PI * r * r * h / 3, area: PI * r * (r + s), lateral: PI * r * s, base: PI * r * r, slant: s, angle: fromRad(2 * Math.atan(r / h), b) }; },
    [unitField()]),
  solid('solid.frustum', 'triangle', L('Frustum of a cone', 'Tronco di cono'),
    [['R', 'big radius', 'raggio maggiore'], ['r', 'small radius', 'raggio minore'], ['h', 'height', 'altezza']],
    [V, A, AL, ['slant', 'apothem (slant height)', 'apotema']],
    ({ R, r, h }) => {
      if (r > R) throw new Error('Il raggio minore non può superare il raggio maggiore');
      const s = Math.hypot(h, R - r), lateral = PI * (R + r) * s;
      return { volume: PI * h * (R * R + R * r + r * r) / 3, area: lateral + PI * (R * R + r * r), lateral, slant: s };
    }),
  solid('solid.sphere', 'sphere', L('Sphere', 'Sfera'),
    [['r', 'radius', 'raggio']],
    [V, ['area', 'surface', 'superficie'], ['diameter', 'diameter', 'diametro', { hidden: true }], ['circumference', 'great circle length', 'circonferenza massima', { hidden: true }], ['greatCircle', 'great circle area', 'area del cerchio massimo', { hidden: true }]],
    ({ r }) => ({ volume: 4 / 3 * PI * r ** 3, area: 4 * PI * r * r, diameter: 2 * r, circumference: 2 * PI * r, greatCircle: PI * r * r })),
  {
    type: 'solid.spherePart', version: 1, category: 'geometry', icon: 'sphere', label: L('Parts of a sphere (cap, sector, zone, wedge)', 'Parti della sfera (calotta, settore, zona, spicchio)'),
    inputs: [P(['r', 'radius', 'raggio']), P(['h', 'height', 'altezza']), P(['d1', 'plane 1 from the centre', 'piano 1 dal centro', { hidden: true }]), P(['d2', 'plane 2 from the centre', 'piano 2 dal centro', { hidden: true }]), P(['angle', 'angle', 'angolo', { hidden: true }])],
    outputs: [P(V), P(A), P(['curved', 'curved surface', 'superficie curva']), P(['baseRadius', 'base radius', 'raggio di base', { hidden: true }]), P(['baseRadius2', 'second base radius', 'raggio della seconda base', { hidden: true }])],
    config: [
      {
        key: 'part', type: 'select', default: 'cap', label: L('Part', 'Parte'), options: [
          { value: 'cap', label: L('Cap and segment with one base (r, h)', 'Calotta e segmento a una base (r, h)') },
          { value: 'sector', label: L('Spherical sector (r, h of its cap)', 'Settore sferico (r, h della sua calotta)') },
          { value: 'zone', label: L('Zone and segment with two bases (r, d1, d2)', 'Zona e segmento a due basi (r, d1, d2)') },
          { value: 'wedge', label: L('Lune and wedge (r, angle)', 'Fuso e spicchio (r, angolo)') },
        ],
      },
      unitField(),
    ],
    run(inputs, b) {
      const part = b.config.part ?? 'cap';
      const needs = { cap: ['r', 'h'], sector: ['r', 'h'], zone: ['r', 'd1', 'd2'], wedge: ['r', 'angle'] }[part] ?? ['r', 'h'];
      if (needs.some(k => inputs[k] === undefined)) return undefined;
      const r = positive(inputs.r, 'raggio');
      if (part === 'cap' || part === 'sector') {
        const h = positive(inputs.h, 'altezza');
        if (h > 2 * r) throw new Error('L\'altezza della calotta non può superare il diametro');
        const a = sqrt(h * (2 * r - h)), curved = 2 * PI * r * h;
        if (part === 'cap') return tidyAll({ volume: PI * h * h * (3 * r - h) / 3, area: curved + PI * a * a, curved, baseRadius: a });
        return tidyAll({ volume: 2 * PI * r * r * h / 3, area: curved + PI * r * a, curved, baseRadius: a });
      }
      if (part === 'zone') {
        let d1 = finite(inputs.d1, 'piano 1'), d2 = finite(inputs.d2, 'piano 2');
        if (d1 > d2) [d1, d2] = [d2, d1];
        if (d1 < -r || d2 > r) throw new Error('I piani devono tagliare la sfera: distanze dal centro tra −r e r');
        if (d1 === d2) throw new Error('I due piani coincidono');
        const h = d2 - d1, a1 = sqrt(r * r - d1 * d1), a2 = sqrt(r * r - d2 * d2), curved = 2 * PI * r * h;
        return tidyAll({ volume: PI * h * (3 * a1 * a1 + 3 * a2 * a2 + h * h) / 6, area: curved + PI * (a1 * a1 + a2 * a2), curved, baseRadius: a1, baseRadius2: a2 });
      }
      const th = toRad(positive(inputs.angle, 'angolo'), b);
      if (th > 2 * PI + 1e-12) throw new Error('L\'angolo dello spicchio non può superare un giro');
      return tidyAll({ volume: 2 * r ** 3 * th / 3, area: 2 * r * r * th + PI * r * r, curved: 2 * r * r * th });
    },
  },
  solid('solid.ellipsoid', 'sphere', L('Ellipsoid', 'Ellissoide'),
    [['a', 'semi-axis a', 'semiasse a'], ['b', 'semi-axis b', 'semiasse b'], ['c', 'semi-axis c', 'semiasse c']],
    [V, ['area', 'surface (≈, error < 1.1%)', 'superficie (≈, errore < 1,1%)']],
    ({ a, b, c }) => {
      const p = 1.6075;   // Knud Thomsen's approximation
      return { volume: 4 / 3 * PI * a * b * c, area: 4 * PI * (((a * b) ** p + (a * c) ** p + (b * c) ** p) / 3) ** (1 / p) };
    }),
  solid('solid.torus', 'sphere', L('Torus', 'Toro'),
    [['R', 'major radius (centre to tube)', 'raggio maggiore (centro–tubo)'], ['r', 'tube radius', 'raggio del tubo']],
    [V, ['area', 'surface', 'superficie']],
    ({ R, r }) => {
      if (r > R) throw new Error('Il raggio del tubo non può superare il raggio maggiore');
      return { volume: 2 * PI * PI * R * r * r, area: 4 * PI * PI * R * r };
    }),
  {
    type: 'solid.polyhedron', version: 1, category: 'geometry', icon: 'cube', label: L('Regular polyhedra', 'Poliedri regolari'),
    inputs: [P(['edge', 'edge', 'spigolo'])],
    outputs: [
      P(V), P(A), P(['inradius', 'inscribed sphere radius', 'raggio della sfera inscritta']), P(['midradius', 'midsphere radius', 'raggio della sfera tangente agli spigoli', { hidden: true }]),
      P(['circumradius', 'circumscribed sphere radius', 'raggio della sfera circoscritta']), P(['dihedral', 'dihedral angle', 'angolo diedro', { hidden: true }]),
      P(['faces', 'faces', 'facce', { hidden: true }]), P(['edges', 'edges', 'spigoli', { hidden: true }]), P(['vertices', 'vertices', 'vertici', { hidden: true }]),
    ],
    config: [
      { key: 'kind', type: 'select', default: 'tetrahedron', options: Object.entries(POLYHEDRA).map(([value, p]) => ({ value, label: p.label })), label: L('Polyhedron', 'Poliedro') },
      unitField(),
    ],
    run({ edge }, b) {
      if (edge === undefined) return undefined;
      const a = positive(edge, 'spigolo');
      const p = POLYHEDRA[b.config.kind] ?? POLYHEDRA.tetrahedron;
      return tidyAll({ volume: p.V * a ** 3, area: p.A * a * a, inradius: p.rin * a, midradius: p.rmid * a, circumradius: p.R * a, dihedral: fromRad(p.dihedral, b), faces: p.f, edges: p.e, vertices: p.v });
    },
  },
  {
    type: 'solid.fromMeasure', version: 1, category: 'geometry', icon: 'fit', label: L('From a measure to a dimension', 'Dalla misura alla dimensione'),
    inputs: [P(['measure', 'volume or area', 'volume o area']), P(['known', 'height or radius (cylinder, cone)', 'altezza o raggio (cilindro, cono)'])],
    outputs: [P(['result', 'dimension', 'dimensione'])],
    config: [{ key: 'what', type: 'select', default: 'sphereV', options: Object.entries(FROM_MEASURE).map(([value, [label]]) => ({ value, label })), label: L('Find', 'Trova') }],
    run({ measure, known }, b) {
      const [, f, needsKnown] = FROM_MEASURE[b.config.what] ?? FROM_MEASURE.sphereV;
      if (measure === undefined || needsKnown && known === undefined) return undefined;
      return { result: tidy(f(positive(measure, 'misura'), needsKnown ? positive(known, 'altezza o raggio') : 0)) };
    },
  },
  {
    type: 'solid.mass', version: 1, category: 'geometry', icon: 'press', label: L('Mass from volume and material', 'Massa da volume e materiale'),
    inputs: [P(['volume', 'volume', 'volume']), P(['density', 'density (kg/m³)', 'densità (kg/m³)', { hidden: true }])],
    outputs: [P(['mass', 'mass (kg)', 'massa (kg)']), P(['weight', 'weight (N)', 'peso (N)', { hidden: true }]), P(['density', 'density (kg/m³)', 'densità (kg/m³)', { hidden: true }])],
    config: [
      { key: 'material', type: 'select', default: 'steel', options: [...Object.entries(MATERIALS).map(([value, [label, rho]]) => ({ value, label: L(`${label.en} · ${rho} kg/m³`, `${label.it} · ${String(rho).replace('.', ',')} kg/m³`) })), { value: 'custom', label: L('Other: the «density» input', 'Altro: l\'ingresso «densità»') }], label: L('Material', 'Materiale') },
      { key: 'volumeUnit', type: 'select', default: 'm3', options: Object.entries(VOLUME_UNITS).map(([value, [label]]) => ({ value, label })), label: L('Volume unit', 'Unità del volume') },
    ],
    run({ volume, density }, b) {
      if (volume === undefined) return undefined;
      const custom = b.config.material === 'custom';
      if (custom && density === undefined) return undefined;
      const rho = custom ? positive(density, 'densità') : (MATERIALS[b.config.material] ?? MATERIALS.steel)[1];
      const v = num(volume);
      if (!Number.isFinite(v) || v < 0) throw new Error('volume: serve un numero maggiore o uguale a 0');
      const m = v * (VOLUME_UNITS[b.config.volumeUnit] ?? VOLUME_UNITS.m3)[1] * rho;
      return tidyAll({ mass: m, weight: m * 9.80665, density: rho });
    },
  },

  // ---- analytic geometry in space
  {
    type: 'solid.point', version: 1, category: 'geometry', icon: 'plus', label: L('3D point [x, y, z]', 'Punto 3D [x, y, z]'),
    inputs: [P(['x', 'x', 'x']), P(['y', 'y', 'y']), P(['z', 'z', 'z'])],
    outputs: [POINT_OUT],
    config: [],
    run(inputs, b) {
      const out = [];
      for (const k of ['x', 'y', 'z']) {
        // an input with nothing linked counts as 0
        if (inputs[k] === undefined) { if (b.linked(k)) return undefined; out.push(0); } else out.push(finite(inputs[k], k));
      }
      return { point: out };
    },
  },
  {
    type: 'solid.pointXYZ', version: 1, category: 'geometry', icon: 'split', label: L('Coordinates of a point', 'Coordinate di un punto'),
    inputs: [listIn('point', 'point', 'punto')],
    outputs: [P(['x', 'x', 'x']), P(['y', 'y', 'y']), P(['z', 'z', 'z'])],
    config: [],
    run({ point }) {
      if (point === undefined) return undefined;
      const [x, y, z] = vec(point, 'punto');
      return { x, y, z };
    },
  },
  {
    type: 'solid.distance', version: 1, category: 'geometry', icon: 'fit', label: L('Distance and midpoint', 'Distanza e punto medio'),
    inputs: [listIn('p', 'point P', 'punto P'), listIn('q', 'point Q', 'punto Q')],
    outputs: [P(['distance', 'distance', 'distanza']), { ...POINT_OUT, name: 'midpoint', label: L('midpoint', 'punto medio') }, { ...POINT_OUT, name: 'vector', label: L('vector P→Q', 'vettore P→Q'), hidden: true }],
    config: [],
    run({ p, q }) {
      if (p === undefined || q === undefined) return undefined;
      const P1 = vec(p, 'P'), Q = vec(q, 'Q'), d = vSub(Q, P1);
      return tidyAll({ distance: norm(d), midpoint: vScale(vAdd(P1, Q), 0.5), vector: d });
    },
  },
  {
    type: 'solid.vector', version: 1, category: 'geometry', icon: 'arrowRight', label: L('3D vectors (dot, cross…)', 'Vettori 3D (scalare, vettoriale…)'),
    inputs: [listIn('u', 'u', 'u'), listIn('v', 'v', 'v'), listIn('w', 'w (triple product)', 'w (prodotto misto)', { hidden: true }), P(['k', 'k (number)', 'k (numero)', { hidden: true }])],
    outputs: [{ name: 'result', type: 'any', label: L('result', 'risultato') }],
    config: [{ key: 'op', type: 'select', default: 'dot', options: Object.entries(VECTOR_OPS).map(([value, [label]]) => ({ value, label })), label: L('Operation', 'Operazione') }, unitField()],
    run(inputs, b) {
      const op = VECTOR_OPS[b.config.op] ? b.config.op : 'dot';
      const need = NEEDS[op];
      for (const k of need) if (inputs[k] === undefined) return undefined;
      const u = vec(inputs.u, 'u');
      const v = need.includes('v') ? vec(inputs.v, 'v') : null;
      const w = need.includes('w') ? vec(inputs.w, 'w') : null;
      const k = need.includes('k') ? finite(inputs.k, 'k') : null;
      const r = VECTOR_OPS[op][1](u, v, w, k, b);
      return { result: Array.isArray(r) ? r.map(tidy) : tidy(r) };
    },
  },
  {
    type: 'solid.plane', version: 1, category: 'geometry', icon: 'grid', label: L('Plane through 3 points', 'Piano per 3 punti'),
    inputs: [listIn('p1', 'point 1', 'punto 1'), listIn('p2', 'point 2', 'punto 2'), listIn('p3', 'point 3', 'punto 3')],
    outputs: [
      { name: 'plane', type: 'object', label: L('plane {a, b, c, d}', 'piano {a, b, c, d}') },
      { name: 'normal', type: 'list', label: L('normal (unit)', 'normale (versore)') },
      { name: 'equation', type: 'text', label: L('equation', 'equazione') },
      P(['area', 'triangle area', 'area del triangolo', { hidden: true }]),
    ],
    config: [],
    run({ p1, p2, p3 }) {
      if (p1 === undefined || p2 === undefined || p3 === undefined) return undefined;
      const A1 = vec(p1, 'punto 1'), B = vec(p2, 'punto 2'), C = vec(p3, 'punto 3');
      const n = cross(vSub(B, A1), vSub(C, A1));
      const len = norm(n);
      if (len < 1e-12 * Math.max(1, norm(vSub(B, A1)) * norm(vSub(C, A1)))) throw new Error('I tre punti sono allineati: non individuano un piano');
      const plane = { a: tidy(n[0]), b: tidy(n[1]), c: tidy(n[2]), d: tidy(-dot(n, A1)) };
      return { plane, normal: vScale(n, 1 / len).map(tidy), equation: equationOf(plane), area: tidy(len / 2) };
    },
  },
  {
    type: 'solid.planeDistance', version: 1, category: 'geometry', icon: 'fit', label: L('Point–plane distance', 'Distanza punto–piano'),
    inputs: [{ name: 'plane', type: 'any', label: L('plane', 'piano') }, listIn('point', 'point', 'punto')],
    outputs: [P(['distance', 'distance', 'distanza']), P(['signed', 'signed distance', 'distanza con segno', { hidden: true }]), { ...POINT_OUT, name: 'projection', label: L('projection on the plane', 'proiezione sul piano') }],
    config: [],
    run({ plane, point }) {
      if (plane === undefined || point === undefined) return undefined;
      const { a, b, c, d } = planeOf(plane), p = vec(point, 'punto');
      const n = [a, b, c], len = norm(n), s = (dot(n, p) + d) / len;
      return tidyAll({ distance: Math.abs(s), signed: s, projection: vSub(p, vScale(n, s / len)) });
    },
  },
  {
    type: 'solid.linePlane', version: 1, category: 'geometry', icon: 'merge', label: L('Line–plane intersection', 'Intersezione retta–piano'),
    inputs: [{ name: 'plane', type: 'any', label: L('plane', 'piano') }, listIn('point', 'point of the line', 'punto della retta'), listIn('direction', 'direction of the line', 'direzione della retta')],
    outputs: [POINT_OUT, P(['t', 't (point + t·direction)', 't (punto + t·direzione)', { hidden: true }]), { name: 'parallel', type: 'bool', label: L('parallel', 'parallela') }],
    config: [],
    run({ plane, point, direction }) {
      if (plane === undefined || point === undefined || direction === undefined) return undefined;
      const { a, b, c, d } = planeOf(plane), p = vec(point, 'punto'), v = vec(direction, 'direzione');
      if (norm(v) === 0) throw new Error('direzione: il vettore nullo non individua una retta');
      const n = [a, b, c], den = dot(n, v);
      if (Math.abs(den) < 1e-12 * norm(n) * norm(v)) return { parallel: true };
      const t = -(dot(n, p) + d) / den;
      return { point: vAdd(p, vScale(v, t)).map(tidy), t: tidy(t), parallel: false };
    },
  },
  {
    type: 'solid.coords', version: 1, category: 'geometry', icon: 'sync', label: L('Cartesian, cylindrical, spherical coordinates', 'Coordinate cartesiane, cilindriche, sferiche'),
    inputs: [listIn('point', 'point', 'punto')],
    outputs: [POINT_OUT],
    config: [
      { key: 'from', type: 'select', default: 'cartesian', options: COORDS, label: L('From', 'Da') },
      { key: 'to', type: 'select', default: 'spherical', options: COORDS, label: L('To', 'A') },
      unitField(),
    ],
    run({ point }, b) {
      if (point === undefined) return undefined;
      const p = vec(point, 'punto');
      let xyz;
      if (b.config.from === 'cylindrical') { const [rho, phi, z] = p; const t = toRad(phi, b); xyz = [rho * cos(t), rho * sin(t), z]; }
      else if (b.config.from === 'spherical') { const [r, th, ph] = p; const t = toRad(th, b), f = toRad(ph, b); xyz = [r * sin(t) * cos(f), r * sin(t) * sin(f), r * cos(t)]; }
      else xyz = p;
      const [x, y, z] = xyz;
      let out = xyz;
      if (b.config.to === 'cylindrical') out = [Math.hypot(x, y), fromRad(Math.atan2(y, x), b), z];
      else if (b.config.to === 'spherical') { const r = Math.hypot(x, y, z); out = [r, r === 0 ? 0 : fromRad(Math.acos(z / r), b), fromRad(Math.atan2(y, x), b)]; }
      return { point: out.map(v => (Math.abs(v) < 1e-14 ? 0 : tidy(v))) };
    },
  },
  {
    type: 'solid.transform', version: 1, category: 'geometry', icon: 'restart', label: L('Transform points (move, scale, rotate)', 'Trasforma punti (sposta, scala, ruota)'),
    inputs: [{ name: 'point', type: 'list', label: L('point or list of points', 'punto o lista di punti') }, listIn('vector', 'vector (offset, factors, axis)', 'vettore (spostamento, fattori, asse)'), P(['angle', 'angle', 'angolo']), listIn('centre', 'centre', 'centro', { hidden: true })],
    outputs: [{ name: 'point', type: 'list', label: L('point or list of points', 'punto o lista di punti') }],
    config: [{ key: 'op', type: 'select', default: 'rotateZ', options: Object.entries(TRANSFORMS).map(([value, label]) => ({ value, label })), label: L('Transform', 'Trasformazione') }, unitField()],
    run(inputs, b) {
      const op = TRANSFORMS[b.config.op] ? b.config.op : 'rotateZ';
      const needs = { translate: ['point', 'vector'], scale: ['point', 'vector'], rotateAxis: ['point', 'vector', 'angle'] }[op] ?? ['point', 'angle'];
      if (needs.some(k => inputs[k] === undefined)) return undefined;
      if (inputs.centre === undefined && b.linked('centre')) return undefined;
      const c = inputs.centre === undefined ? [0, 0, 0] : vec(inputs.centre, 'centro');
      // two scale factors [kx, ky]: z stays as it is (factor 1), not flattened
      const raw = op === 'scale' && Array.isArray(inputs.vector) && inputs.vector.length === 2 ? [...inputs.vector, 1] : inputs.vector;
      const v = needs.includes('vector') ? vec(raw, 'vettore') : null;
      const th = needs.includes('angle') ? toRad(finite(inputs.angle, 'angolo'), b) : 0;
      const axis = { rotateX: [1, 0, 0], rotateY: [0, 1, 0], rotateZ: [0, 0, 1] }[op] ?? (op === 'rotateAxis' ? unit(v, 'asse') : null);
      const one = q => {
        const p = vec(q, 'punto');
        if (op === 'translate') return vAdd(p, v);
        const rel = vSub(p, c);
        if (op === 'scale') return vAdd(c, rel.map((x, i) => x * v[i]));
        return vAdd(c, rotate(rel, axis, th));
      };
      const pts = inputs.point;
      const many = Array.isArray(pts) && pts.length > 0 && (Array.isArray(pts[0]) || pts[0] && typeof pts[0] === 'object');
      if (many && pts.length > 10_000) throw new Error('Al massimo 10000 punti');
      const clean = p => p.map(x => (Math.abs(x) < 1e-14 ? 0 : tidy(x)));
      return { point: many ? pts.map(q => clean(one(q))) : clean(one(pts)) };
    },
  },
];

/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
const SUBCATEGORIES = [
  ['solids', L('Solids', 'Solidi'), ['solid.cube', 'solid.cuboid', 'solid.prism', 'solid.prismGeneric', 'solid.pyramid', 'solid.frustumPyramid', 'solid.cylinder', 'solid.cone', 'solid.frustum', 'solid.sphere', 'solid.spherePart', 'solid.ellipsoid', 'solid.torus', 'solid.polyhedron', 'solid.fromMeasure', 'solid.mass']],
  ['space', L('Space: points, vectors and planes', 'Spazio: punti, vettori e piani'), ['solid.point', 'solid.pointXYZ', 'solid.distance', 'solid.vector', 'solid.plane', 'solid.planeDistance', 'solid.linePlane', 'solid.coords', 'solid.transform']],
];
SUBCATEGORIES.forEach(([id, label, types], i) => {
  for (const b of blocks) if (types.includes(b.type)) b.subcategory = { id, label, order: 3 + i };
});
