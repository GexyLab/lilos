/**
 * The quantity and unit blocks of Logic Studio, loaded by the engine in each user's worker (and
 * read in the kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js.
 *
 * Each quantity has a base unit; every other unit is either a factor (value × factor = value in
 * the base unit) or a pair of functions (temperatures, fuel consumption). Symbols are unique
 * across all quantities, so a symbol alone tells the quantity (unit.convert, unit.parse); aliases
 * are other ways to write the same unit ('m2' for 'm²'). Results are rounded to 12 significant
 * digits, so 0.1 + 0.2 style leftovers do not show.
 */

const L = (en, it) => ({ en, it });
const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : Number(String(v ?? '').trim().replace(',', '.')));
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

const tidy = x => (Number.isFinite(x) ? Number(x.toPrecision(12)) : x);

// Exact definitions where they exist (inch, pound, gallon, calorie, BTU IT, eV…)
const IN = 0.0254, FT = 0.3048, YD = 0.9144, MI = 1609.344, LB = 0.45359237, GN = 9.80665;
const GAL_US = 3.785411784e-3, GAL_UK = 4.54609e-3, LBF = LB * GN, BTU = 1055.05585262, CAL = 4.184;

/** [symbol, factor or { to, from }, en name, it name, aliases?] */
const QUANTITIES = {
  length: {
    label: L('Length', 'Lunghezza'), icon: 'fit',
    units: [
      ['m', 1, 'metre', 'metro'],
      ['km', 1e3, 'kilometre', 'chilometro'],
      ['cm', 1e-2, 'centimetre', 'centimetro'],
      ['mm', 1e-3, 'millimetre', 'millimetro'],
      ['µm', 1e-6, 'micrometre', 'micrometro', ['um', 'μm']],
      ['nm', 1e-9, 'nanometre', 'nanometro'],
      ['in', IN, 'inch', 'pollice'],
      ['ft', FT, 'foot', 'piede'],
      ['yd', YD, 'yard', 'iarda'],
      ['mi', MI, 'mile', 'miglio'],
      ['nmi', 1852, 'nautical mile', 'miglio nautico', ['NM']],
    ],
  },
  area: {
    label: L('Area', 'Superficie'), icon: 'grid',
    units: [
      ['m²', 1, 'square metre', 'metro quadrato', ['m2', 'm^2', 'mq']],
      ['km²', 1e6, 'square kilometre', 'chilometro quadrato', ['km2', 'km^2']],
      ['cm²', 1e-4, 'square centimetre', 'centimetro quadrato', ['cm2', 'cm^2']],
      ['mm²', 1e-6, 'square millimetre', 'millimetro quadrato', ['mm2', 'mm^2']],
      ['ha', 1e4, 'hectare', 'ettaro'],
      ['a', 100, 'are', 'ara'],
      ['in²', IN * IN, 'square inch', 'pollice quadrato', ['in2', 'sq in']],
      ['ft²', FT * FT, 'square foot', 'piede quadrato', ['ft2', 'sq ft']],
      ['yd²', YD * YD, 'square yard', 'iarda quadrata', ['yd2', 'sq yd']],
      ['ac', 4046.8564224, 'acre', 'acro', ['acre']],
      ['mi²', MI * MI, 'square mile', 'miglio quadrato', ['mi2', 'sq mi']],
    ],
  },
  volume: {
    label: L('Volume', 'Volume'), icon: 'archive',
    units: [
      ['m³', 1, 'cubic metre', 'metro cubo', ['m3', 'm^3', 'mc']],
      ['L', 1e-3, 'litre', 'litro', ['l']],
      ['dL', 1e-4, 'decilitre', 'decilitro', ['dl']],
      ['cL', 1e-5, 'centilitre', 'centilitro', ['cl']],
      ['mL', 1e-6, 'millilitre', 'millilitro', ['ml']],
      ['cm³', 1e-6, 'cubic centimetre', 'centimetro cubo', ['cm3', 'cc']],
      ['in³', IN ** 3, 'cubic inch', 'pollice cubo', ['in3']],
      ['ft³', FT ** 3, 'cubic foot', 'piede cubo', ['ft3']],
      ['gal US', GAL_US, 'US gallon', 'gallone USA'],
      ['gal UK', GAL_UK, 'imperial gallon', 'gallone imperiale'],
      ['qt US', GAL_US / 4, 'US quart', 'quarto USA'],
      ['pt US', GAL_US / 8, 'US pint', 'pinta USA'],
      ['pt UK', GAL_UK / 8, 'imperial pint', 'pinta imperiale'],
      ['fl oz US', GAL_US / 128, 'US fluid ounce', 'oncia liquida USA'],
      ['fl oz UK', GAL_UK / 160, 'imperial fluid ounce', 'oncia liquida imperiale'],
    ],
  },
  mass: {
    label: L('Mass', 'Massa'), icon: 'press',
    units: [
      ['kg', 1, 'kilogram', 'chilogrammo'],
      ['t', 1e3, 'tonne', 'tonnellata'],
      ['g', 1e-3, 'gram', 'grammo'],
      ['mg', 1e-6, 'milligram', 'milligrammo'],
      ['µg', 1e-9, 'microgram', 'microgrammo', ['ug', 'μg', 'mcg']],
      ['lb', LB, 'pound', 'libbra', ['lbs']],
      ['oz', LB / 16, 'ounce', 'oncia'],
      ['st', LB * 14, 'stone', 'stone', ['stone']],
      ['ct', 2e-4, 'carat', 'carato'],
    ],
  },
  temperature: {
    label: L('Temperature', 'Temperatura'), icon: 'gauge',
    units: [
      ['°C', { to: x => x + 273.15, from: k => k - 273.15 }, 'degree Celsius', 'grado Celsius', ['C', 'degC', '℃']],
      ['°F', { to: x => (x + 459.67) * 5 / 9, from: k => k * 9 / 5 - 459.67 }, 'degree Fahrenheit', 'grado Fahrenheit', ['F', 'degF', '℉']],
      ['K', 1, 'kelvin', 'kelvin'],
      ['°R', 5 / 9, 'degree Rankine', 'grado Rankine', ['R', 'degR']],
    ],
  },
  time: {
    label: L('Time', 'Tempo'), icon: 'clock',
    units: [
      ['s', 1, 'second', 'secondo'],
      ['ms', 1e-3, 'millisecond', 'millisecondo'],
      ['µs', 1e-6, 'microsecond', 'microsecondo', ['us', 'μs']],
      ['ns', 1e-9, 'nanosecond', 'nanosecondo'],
      ['min', 60, 'minute', 'minuto'],
      ['h', 3600, 'hour', 'ora'],
      ['d', 86400, 'day', 'giorno'],
      ['wk', 604800, 'week', 'settimana'],
      ['yr', 365.25 * 86400, 'year (365.25 days)', 'anno (365,25 giorni)'],
    ],
  },
  speed: {
    label: L('Speed', 'Velocità'), icon: 'transfer',
    units: [
      ['m/s', 1, 'metre per second', 'metro al secondo'],
      ['km/h', 1 / 3.6, 'kilometre per hour', 'chilometro orario', ['kmh', 'kph']],
      ['mph', MI / 3600, 'mile per hour', 'miglio orario'],
      ['kn', 1852 / 3600, 'knot', 'nodo', ['kt']],
      ['ft/s', FT, 'foot per second', 'piede al secondo', ['fps']],
    ],
  },
  acceleration: {
    label: L('Acceleration', 'Accelerazione'), icon: 'bolt',
    units: [
      ['m/s²', 1, 'metre per second squared', 'metro al secondo quadrato', ['m/s2', 'm/s^2']],
      ['gn', GN, 'standard gravity', 'accelerazione di gravità standard', ['g0']],
      ['ft/s²', FT, 'foot per second squared', 'piede al secondo quadrato', ['ft/s2', 'ft/s^2']],
      ['Gal', 0.01, 'gal (cm/s²)', 'gal (cm/s²)'],
    ],
  },
  force: {
    label: L('Force', 'Forza'), icon: 'press',
    units: [
      ['N', 1, 'newton', 'newton'],
      ['kN', 1e3, 'kilonewton', 'kilonewton'],
      ['dyn', 1e-5, 'dyne', 'dina'],
      ['kgf', GN, 'kilogram-force', 'chilogrammo forza', ['kp']],
      ['lbf', LBF, 'pound-force', 'libbra forza'],
    ],
  },
  pressure: {
    label: L('Pressure', 'Pressione'), icon: 'gauge',
    units: [
      ['Pa', 1, 'pascal', 'pascal'],
      ['hPa', 100, 'hectopascal', 'ettopascal'],
      ['kPa', 1e3, 'kilopascal', 'kilopascal'],
      ['MPa', 1e6, 'megapascal', 'megapascal'],
      ['bar', 1e5, 'bar', 'bar'],
      ['mbar', 100, 'millibar', 'millibar'],
      ['atm', 101325, 'standard atmosphere', 'atmosfera standard'],
      ['psi', LBF / (IN * IN), 'pound per square inch', 'libbra per pollice quadrato'],
      ['mmHg', 133.322387415, 'millimetre of mercury', 'millimetro di mercurio'],
      ['Torr', 101325 / 760, 'torr', 'torr', ['torr']],
      ['inHg', 3386.389, 'inch of mercury', 'pollice di mercurio'],
      ['mH₂O', GN * 1000, 'metre of water', 'metro d\'acqua', ['mH2O']],
    ],
  },
  energy: {
    label: L('Energy', 'Energia'), icon: 'bolt',
    units: [
      ['J', 1, 'joule', 'joule'],
      ['kJ', 1e3, 'kilojoule', 'kilojoule'],
      ['MJ', 1e6, 'megajoule', 'megajoule'],
      ['Wh', 3600, 'watt-hour', 'wattora'],
      ['kWh', 3.6e6, 'kilowatt-hour', 'chilowattora'],
      ['cal', CAL, 'calorie', 'caloria'],
      ['kcal', CAL * 1e3, 'kilocalorie', 'chilocaloria', ['Cal']],
      ['BTU', BTU, 'British thermal unit', 'unità termica britannica', ['Btu']],
      ['eV', 1.602176634e-19, 'electronvolt', 'elettronvolt'],
    ],
  },
  power: {
    label: L('Power', 'Potenza'), icon: 'power',
    units: [
      ['W', 1, 'watt', 'watt'],
      ['kW', 1e3, 'kilowatt', 'chilowatt'],
      ['MW', 1e6, 'megawatt', 'megawatt'],
      ['CV', 735.49875, 'metric horsepower', 'cavallo vapore', ['PS']],
      ['hp', 745.69987158227022, 'horsepower', 'cavallo vapore britannico'],
      ['BTU/h', BTU / 3600, 'BTU per hour', 'BTU all\'ora', ['Btu/h']],
      ['kcal/h', CAL * 1e3 / 3600, 'kilocalorie per hour', 'chilocaloria all\'ora'],
    ],
  },
  angle: {
    label: L('Angle', 'Angolo'), icon: 'sync',
    units: [
      ['rad', 1, 'radian', 'radiante'],
      ['°', Math.PI / 180, 'degree', 'grado', ['deg']],
      ['′', Math.PI / 10800, 'arcminute', 'primo', ['\'', 'arcmin']],
      ['″', Math.PI / 648000, 'arcsecond', 'secondo d\'arco', ['"', 'arcsec']],
      ['gon', Math.PI / 200, 'gradian', 'gradiente centesimale', ['grad']],
      ['rev', 2 * Math.PI, 'turn', 'giro', ['turn']],
    ],
  },
  frequency: {
    label: L('Frequency', 'Frequenza'), icon: 'chart',
    units: [
      ['Hz', 1, 'hertz', 'hertz'],
      ['kHz', 1e3, 'kilohertz', 'kilohertz'],
      ['MHz', 1e6, 'megahertz', 'megahertz'],
      ['GHz', 1e9, 'gigahertz', 'gigahertz'],
      ['rpm', 1 / 60, 'revolutions per minute', 'giri al minuto', ['giri/min']],
      ['rad/s', 1 / (2 * Math.PI), 'radian per second', 'radiante al secondo'],
    ],
  },
  data: {
    label: L('Data', 'Dati'), icon: 'disk',
    units: [
      ['bit', 1, 'bit', 'bit'],
      ['B', 8, 'byte', 'byte', ['byte']],
      ['kB', 8e3, 'kilobyte (1000 B)', 'kilobyte (1000 B)'],
      ['MB', 8e6, 'megabyte (1000 kB)', 'megabyte (1000 kB)'],
      ['GB', 8e9, 'gigabyte (1000 MB)', 'gigabyte (1000 MB)'],
      ['TB', 8e12, 'terabyte (1000 GB)', 'terabyte (1000 GB)'],
      ['KiB', 8 * 1024, 'kibibyte (1024 B)', 'kibibyte (1024 B)'],
      ['MiB', 8 * 1024 ** 2, 'mebibyte (1024 KiB)', 'mebibyte (1024 KiB)'],
      ['GiB', 8 * 1024 ** 3, 'gibibyte (1024 MiB)', 'gibibyte (1024 MiB)'],
      ['TiB', 8 * 1024 ** 4, 'tebibyte (1024 GiB)', 'tebibyte (1024 GiB)'],
      ['kbit', 1e3, 'kilobit', 'kilobit', ['kb']],
      ['Mbit', 1e6, 'megabit', 'megabit', ['Mb']],
      ['Gbit', 1e9, 'gigabit', 'gigabit', ['Gb']],
    ],
  },
  dataRate: {
    label: L('Data rate', 'Velocità dei dati'), icon: 'transfer',
    units: [
      ['bit/s', 1, 'bit per second', 'bit al secondo', ['bps']],
      ['kbit/s', 1e3, 'kilobit per second', 'kilobit al secondo', ['kbps', 'kb/s']],
      ['Mbit/s', 1e6, 'megabit per second', 'megabit al secondo', ['Mbps', 'Mb/s']],
      ['Gbit/s', 1e9, 'gigabit per second', 'gigabit al secondo', ['Gbps', 'Gb/s']],
      ['B/s', 8, 'byte per second', 'byte al secondo'],
      ['kB/s', 8e3, 'kilobyte per second', 'kilobyte al secondo'],
      ['MB/s', 8e6, 'megabyte per second', 'megabyte al secondo'],
      ['GB/s', 8e9, 'gigabyte per second', 'gigabyte al secondo'],
      ['MiB/s', 8 * 1024 ** 2, 'mebibyte per second', 'mebibyte al secondo'],
    ],
  },
  flow: {
    label: L('Flow rate', 'Portata'), icon: 'download',
    units: [
      ['m³/s', 1, 'cubic metre per second', 'metro cubo al secondo', ['m3/s']],
      ['m³/h', 1 / 3600, 'cubic metre per hour', 'metro cubo all\'ora', ['m3/h']],
      ['L/s', 1e-3, 'litre per second', 'litro al secondo', ['l/s']],
      ['L/min', 1e-3 / 60, 'litre per minute', 'litro al minuto', ['l/min', 'lpm']],
      ['L/h', 1e-3 / 3600, 'litre per hour', 'litro all\'ora', ['l/h']],
      ['gal/min', GAL_US / 60, 'US gallon per minute', 'gallone USA al minuto', ['gpm']],
    ],
  },
  density: {
    label: L('Density', 'Densità'), icon: 'matrix',
    units: [
      ['kg/m³', 1, 'kilogram per cubic metre', 'chilogrammo al metro cubo', ['kg/m3']],
      ['g/cm³', 1e3, 'gram per cubic centimetre', 'grammo al centimetro cubo', ['g/cm3', 'g/cc']],
      ['kg/L', 1e3, 'kilogram per litre', 'chilogrammo al litro', ['kg/l']],
      ['g/L', 1, 'gram per litre', 'grammo al litro', ['g/l']],
      ['lb/ft³', LB / FT ** 3, 'pound per cubic foot', 'libbra al piede cubo', ['lb/ft3']],
    ],
  },
  torque: {
    label: L('Torque', 'Coppia'), icon: 'restart',
    units: [
      ['N·m', 1, 'newton metre', 'newton metro', ['Nm', 'N*m', 'N m', 'N.m']],
      ['kgf·m', GN, 'kilogram-force metre', 'chilogrammo forza metro', ['kgfm', 'kgf*m', 'kgm']],
      ['lbf·ft', LBF * FT, 'pound-force foot', 'libbra forza piede', ['lbft', 'lb·ft', 'ft·lbf', 'lbf*ft']],
      ['lbf·in', LBF * IN, 'pound-force inch', 'libbra forza pollice', ['lbin', 'lb·in', 'in·lbf', 'lbf*in']],
    ],
  },
  fuel: {
    label: L('Fuel consumption', 'Consumo di carburante'), icon: 'progress',
    units: [
      ['L/100km', 1, 'litres per 100 km', 'litri per 100 km', ['l/100km', 'L/100 km', 'l/100 km']],
      ['km/L', inverse(100), 'kilometres per litre', 'chilometri al litro', ['km/l']],
      ['mpg US', inverse(100 * GAL_US * 1e3 / (MI / 1e3)), 'miles per US gallon', 'miglia per gallone USA', ['mpg']],
      ['mpg UK', inverse(100 * GAL_UK * 1e3 / (MI / 1e3)), 'miles per imperial gallon', 'miglia per gallone imperiale'],
    ],
  },
};

/** A unit that is the inverse of the base one (k / x both ways), defined only above zero. */
function inverse(k) {
  const f = x => {
    if (!(x > 0)) throw new Error('Il consumo deve essere maggiore di zero');
    return k / x;
  };
  return { to: f, from: f };
}

// ---- The tables, built once at import (plain data: no side effects)

const UNITS = new Map();     // symbol → unit
const ALIASES = new Map();   // alias → symbol
for (const [qid, q] of Object.entries(QUANTITIES)) {
  q.id = qid;
  q.list = q.units.map(([symbol, def, en, it, aliases = []]) => {
    const u = { symbol, quantity: qid, name: L(en, it), aliases };
    if (typeof def === 'number') { u.factor = def; } else { u.to = def.to; u.from = def.from; }
    UNITS.set(symbol, u);
    return u;
  });
}
for (const u of UNITS.values()) for (const a of u.aliases) if (!UNITS.has(a)) ALIASES.set(a, u.symbol);

/** The unit written as `s` (symbol, then alias, spaces around ignored), or null. */
function findUnit(s) {
  const key = text(s).trim();
  return UNITS.get(key) ?? UNITS.get(ALIASES.get(key)) ?? null;
}

function unitOrThrow(s) {
  const u = findUnit(s);
  if (!u) throw new Error(`Unità sconosciuta: «${text(s).trim()}»`);
  return u;
}

const LOW = 1e-300;
function checkTemperature(u, value) {
  if (u.quantity !== 'temperature') return;
  const k = u.factor !== undefined ? value * u.factor : u.to(value);
  if (k < -1e-9) throw new Error('Temperatura sotto lo zero assoluto');
}

/** value from unit a to unit b (same quantity), rounded to 12 significant digits. */
function convertValue(value, a, b) {
  if (a.quantity !== b.quantity) {
    throw new Error(`Unità incompatibili: «${a.symbol}» (${QUANTITIES[a.quantity].label.it.toLowerCase()}) e «${b.symbol}» (${QUANTITIES[b.quantity].label.it.toLowerCase()})`);
  }
  checkTemperature(a, value);
  if (a === b) return tidy(value);
  if (a.factor !== undefined && b.factor !== undefined) return tidy(value * (a.factor / b.factor));
  const base = a.factor !== undefined ? value * a.factor : a.to(value);
  return tidy(b.factor !== undefined ? base / b.factor : b.from(base));
}

function number(v) {
  const n = num(v);
  if (!Number.isFinite(n)) throw new Error('Serve un numero');
  return n;
}

/** Rounds to `decimals` when the «Arrotonda» box is on (as core.math does). */
function rounded(x, b) {
  if (!b.config.round) return x;
  const f = 10 ** Math.max(0, Math.min(10, Math.trunc(b.config.decimals ?? 2)));
  return Math.round(x * f) / f;
}

const ROUND = [
  { key: 'round', type: 'checkbox', default: false, label: L('Round', 'Arrotonda') },
  { key: 'decimals', type: 'number', default: 2, min: 0, max: 10, label: L('Decimals', 'Decimali'), when: { round: true } },
];

const unitOptions = q => q.list.map(u => ({ value: u.symbol, label: L(`${u.symbol} — ${u.name.en}`, `${u.symbol} — ${u.name.it}`) }));

/** One converter block per quantity: unit.<quantity>. */
function converter(q, from, to) {
  return {
    type: `unit.${q.id}`, version: 1, category: 'units', icon: q.icon, label: q.label,
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [
      { key: 'from', type: 'select', default: from, options: unitOptions(q), label: L('From', 'Da') },
      { key: 'to', type: 'select', default: to, options: unitOptions(q), label: L('To', 'A') },
      ...ROUND,
    ],
    run({ value }, b) {
      if (value === undefined) return undefined;
      const a = unitOrThrow(b.config.from), c = unitOrThrow(b.config.to);
      return { result: rounded(convertValue(number(value), a, c), b) };
    },
  };
}

// ---- SI prefixes

const PREFIXES = [
  ['p', 1e-12, 'pico'], ['n', 1e-9, 'nano'], ['µ', 1e-6, 'micro'], ['m', 1e-3, 'milli'],
  ['c', 1e-2, 'centi'], ['d', 1e-1, 'deci'], ['none', 1, null], ['da', 1e1, 'deca'], ['h', 1e2, 'etto'],
  ['k', 1e3, 'kilo'], ['M', 1e6, 'mega'], ['G', 1e9, 'giga'], ['T', 1e12, 'tera'],
];
const PREFIX = new Map(PREFIXES.map(([p, f]) => [p, f]));
const prefixOptions = PREFIXES.map(([p, f, name]) => ({
  value: p,
  label: p === 'none' ? L('(none) — ×1', '(nessuno) — ×1') : L(`${p} — ${name === 'etto' ? 'hecto' : name} (×${f})`, `${p} — ${name} (×${f})`),
}));

/** The units format() may change the prefix of, and the prefixes each accepts (in order). */
const ALL = ['p', 'n', 'µ', 'm', '', 'k', 'M', 'G', 'T'];
const PREFIXABLE = {
  m: ['n', 'µ', 'm', '', 'k'], g: ['µ', 'm', '', 'k'], s: ['n', 'µ', 'm', ''], L: ['µ', 'm', ''],
  B: ['', 'k', 'M', 'G', 'T'], bit: ['', 'k', 'M', 'G', 'T'],
  W: ALL, J: ALL, N: ALL, Pa: ALL, Hz: ALL, V: ALL, A: ALL, Ω: ALL, F: ALL, H: ALL, Wh: ALL, eV: ALL,
};
const factorOf = p => (p === '' ? 1 : PREFIX.get(p));

/** 'km' → { prefix: 'k', base: 'm' } when the unit takes SI prefixes, else null. */
function splitPrefix(unit) {
  if (PREFIXABLE[unit]) return { prefix: '', base: unit };
  for (const [p] of PREFIXES) {
    if (p === 'none' || !unit.startsWith(p)) continue;
    const base = unit.slice(p.length), allowed = PREFIXABLE[base];
    // c, d, da, h only in front of m, L and g (cm, dL…): 'dB' is not a tenth of a byte
    if (allowed && (allowed.includes(p) || ['m', 'L', 'g'].includes(base))) return { prefix: p, base };
  }
  if (unit.startsWith('μ')) return splitPrefix(`µ${unit.slice(1)}`);   // Greek mu → micro sign
  return null;
}

/** 1500 'm' → [1.5, 'km']: the prefix that keeps the number between 1 and 1000. */
function autoPrefix(value, unit) {
  const split = splitPrefix(unit);
  if (!split || value === 0 || !Number.isFinite(value)) return [value, unit];
  const allowed = PREFIXABLE[split.base];
  const base = value * factorOf(split.prefix);
  let pick = allowed[0];
  for (const p of allowed) if (Math.abs(base) / factorOf(p) >= 1 - 1e-12) pick = p;
  return [tidy(base / factorOf(pick)), pick + split.base];
}

// ---- Reading and writing measures

/** '12,5 km' → { value: 12.5, unit: 'km' }, or null when it does not start with a number (or is too long). */
const MAX_MEASURE = 200;   // longer texts are not a measure (and would make the pattern slow)
function parseMeasure(s) {
  if (text(s).length > MAX_MEASURE) return null;
  const m = /^\s*([+\-−]?(?:\d[\d.,' ]*\d|\d)?(?:[.,]\d+)?(?:[eE][+-]?\d+)?)\s*(.*?)\s*$/.exec(text(s));
  if (!m || !/\d/.test(m[1])) return null;
  let digits = m[1].replace('−', '-').replace(/[' ]/g, '');
  const dot = digits.lastIndexOf('.'), comma = digits.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) {
    // both: the last one is the decimal separator, the other groups thousands
    digits = dot > comma ? digits.replace(/,/g, '') : digits.replace(/\./g, '').replace(',', '.');
  } else if (comma >= 0) {
    digits = (digits.match(/,/g).length > 1 ? digits.replace(/,/g, '') : digits.replace(',', '.'));
  } else if ((digits.match(/\./g) ?? []).length > 1) {
    digits = digits.replace(/\./g, '');
  }
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  return { value, unit: m[2] };
}

const NO_SPACE = new Set(['°', '′', '″', '%']);

function formatMeasure(value, unit, b) {
  const d = Math.max(0, Math.min(10, Math.trunc(b.config.decimals ?? 2)));
  let s = value.toFixed(d);
  if (b.config.trim !== false && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);   // never «-0»
  if (b.config.separator === ',') s = s.replace('.', ',');
  if (!unit) return s;
  return NO_SPACE.has(unit) ? s + unit : `${s} ${unit}`;
}

const QUANTITY_OPTIONS = Object.values(QUANTITIES).map(q => ({ value: q.id, label: q.label }));

function unitList(qid, b) {
  const q = QUANTITIES[text(qid).trim()];
  if (!q) throw new Error(`Grandezza sconosciuta: «${text(qid).trim()}»`);
  if (b.config.labels === 'symbol') return q.list.map(u => u.symbol);
  return q.list.map(u => ({ value: u.symbol, label: `${u.symbol} — ${u.name[b.lang] ?? u.name.en}` }));
}

const DEFAULTS = {
  length: ['m', 'ft'], area: ['m²', 'ft²'], volume: ['L', 'gal US'], mass: ['kg', 'lb'], temperature: ['°C', '°F'],
  time: ['s', 'min'], speed: ['km/h', 'm/s'], acceleration: ['m/s²', 'gn'], force: ['N', 'kgf'], pressure: ['bar', 'psi'],
  energy: ['kWh', 'MJ'], power: ['kW', 'CV'], angle: ['°', 'rad'], frequency: ['Hz', 'rpm'], data: ['MB', 'MiB'],
  dataRate: ['Mbit/s', 'MB/s'], flow: ['L/min', 'm³/h'], density: ['kg/m³', 'g/cm³'], torque: ['N·m', 'lbf·ft'],
  fuel: ['L/100km', 'km/L'],
};

export const blocks = [
  ...Object.values(QUANTITIES).map(q => converter(q, ...DEFAULTS[q.id])),

  {
    type: 'unit.convert', version: 1, category: 'units', icon: 'sync', label: L('Convert (from · to)', 'Converti (da · a)'),
    inputs: [
      { name: 'value', type: 'number', label: L('value', 'valore') },
      { name: 'from', type: 'text', label: L('from', 'da') },
      { name: 'to', type: 'text', label: L('to', 'a') },
    ],
    outputs: [
      { name: 'result', type: 'number', label: L('result', 'risultato') },
      { name: 'quantity', type: 'text', label: L('quantity', 'grandezza') },
    ],
    config: ROUND,
    run({ value, from, to }, b) {
      if (value === undefined || from === undefined || to === undefined) return undefined;
      const a = unitOrThrow(from), c = unitOrThrow(to);
      return { result: rounded(convertValue(number(value), a, c), b), quantity: a.quantity };
    },
  },

  {
    type: 'unit.prefix', version: 1, category: 'units', icon: 'calculator', label: L('SI prefixes (k, M, m, µ…)', 'Prefissi SI (k, M, m, µ…)'),
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [
      { key: 'from', type: 'select', default: 'none', options: prefixOptions, label: L('From', 'Da') },
      { key: 'to', type: 'select', default: 'k', options: prefixOptions, label: L('To', 'A') },
      ...ROUND,
    ],
    run({ value }, b) {
      if (value === undefined) return undefined;
      const fa = PREFIX.get(b.config.from), fb = PREFIX.get(b.config.to);
      if (fa === undefined || fb === undefined) throw new Error('Prefisso sconosciuto');
      return { result: rounded(tidy(number(value) * (fa / fb)), b) };
    },
  },

  {
    type: 'unit.parse', version: 1, category: 'units', icon: 'text', label: L('Parse measure', 'Leggi misura (parse)'),
    inputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    outputs: [
      { name: 'value', type: 'number', label: L('value', 'valore') },
      { name: 'unit', type: 'text', label: L('unit', 'unità') },
      { name: 'quantity', type: 'text', label: L('quantity', 'grandezza') },
    ],
    config: [
      { key: 'to', type: 'text', default: '', label: L('Convert to (optional, e.g. m)', 'Converti in (facoltativo, es. m)') },
      { key: 'need', type: 'checkbox', default: true, label: L('The unit is required', 'L\'unità è obbligatoria') },
    ],
    run({ text: s }, b) {
      if (s === undefined) return undefined;
      const m = parseMeasure(s);
      if (!m) throw new Error(`Non è una misura: «${text(s).slice(0, 60)}»`);
      if (!m.unit && b.config.need !== false) throw new Error('Manca l\'unità di misura');
      const target = text(b.config.to).trim();
      const u = m.unit ? findUnit(m.unit) : null;
      if (target) {
        if (!m.unit) throw new Error('Manca l\'unità di misura');
        const a = unitOrThrow(m.unit), c = unitOrThrow(target);
        return { value: convertValue(m.value, a, c), unit: c.symbol, quantity: c.quantity };
      }
      return { value: m.value, unit: u?.symbol ?? m.unit, quantity: u?.quantity ?? '' };
    },
  },

  {
    type: 'unit.format', version: 1, category: 'units', icon: 'type', label: L('Format measure', 'Scrivi misura (format)'),
    inputs: [
      { name: 'value', type: 'number', label: L('value', 'valore') },
      { name: 'unit', type: 'text', label: L('unit', 'unità') },
    ],
    outputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    config: [
      { key: 'decimals', type: 'number', default: 2, min: 0, max: 10, label: L('Decimals', 'Decimali') },
      { key: 'trim', type: 'checkbox', default: true, label: L('Drop trailing zeros', 'Togli gli zeri finali') },
      { key: 'separator', type: 'select', default: '.', options: [{ value: '.', label: L('. (12.5)', '. (12.5)') }, { value: ',', label: L(', (12,5)', ', (12,5)') }], label: L('Decimal separator', 'Separatore decimale') },
      { key: 'auto', type: 'checkbox', default: false, label: L('Choose the prefix (1500 m → 1.5 km)', 'Scegli il prefisso (1500 m → 1,5 km)') },
    ],
    run({ value, unit }, b) {
      if (value === undefined) return undefined;
      // the unit is written as it comes (any unit, also V or Ω): aliases are not applied here
      let n = number(value), u = text(unit).trim();
      if (b.config.auto && u) [n, u] = autoPrefix(n, u);
      return { text: formatMeasure(n, u, b) };
    },
  },

  {
    type: 'unit.list', version: 1, category: 'units', icon: 'list', label: L('Units of a quantity', 'Unità di una grandezza'),
    inputs: [
      { name: 'send', type: 'pulse', label: L('send', 'invia'), hidden: true },
      { name: 'quantity', type: 'text', label: L('quantity', 'grandezza'), hidden: true },
    ],
    outputs: [{ name: 'units', type: 'list', label: L('units', 'unità') }],
    config: [
      { key: 'quantity', type: 'select', default: 'length', options: QUANTITY_OPTIONS, label: L('Quantity', 'Grandezza') },
      { key: 'labels', type: 'select', default: 'name', options: [{ value: 'name', label: L('Symbol and name (for a Selection)', 'Simbolo e nome (per una Selezione)') }, { value: 'symbol', label: L('Symbols only', 'Solo i simboli') }], label: L('List of', 'Lista di') },
    ],
    start(b) {
      if (!b.linked('send') && !b.linked('quantity')) b.send('units', unitList(b.config.quantity, b));
    },
    run({ quantity }, b) {
      return { units: unitList(b.trigger === 'quantity' ? quantity : (quantity ?? b.config.quantity), b) };
    },
  },
];

/** For the tests and the documentation generator: the tables (not used by the engine). */
export const tables = { QUANTITIES, UNITS, ALIASES, PREFIXES, PREFIXABLE };
