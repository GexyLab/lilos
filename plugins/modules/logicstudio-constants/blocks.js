/**
 * The constant blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js.
 *
 * One block per constant (const.<key>), in three categories: constMath, constPhysics, constAstro
 * (version 1.1.0; until 1.0.0 there were three blocks with the constant chosen in a menu: they stay,
 * obsolete, so that saved schemas still run). Like core.value, the value goes out at the start of the
 * schema, or at each pulse on «send» when that input is linked. Physical values are CODATA 2022; astronomical
 * ones are the IAU nominal values (2012, 2015). `u` is the standard uncertainty in the same unit
 * (0 = exact by definition).
 */

const L = (en, it) => ({ en, it });

/** [key, symbol, value, uncertainty, unit, label]; the key is also the block's type: const.<key> */
const C = (key, symbol, value, u, unit, label) => ({ key, symbol, value, u, unit, label });

const PI = Math.PI;
const h = 6.62607015e-34, qe = 1.602176634e-19, kB = 1.380649e-23, NA = 6.02214076e23, c = 299792458;
const eps0 = 8.8541878188e-12;
const R = NA * kB, Vm = R * 273.15 / 101325;
const G = 6.6743e-11;
const GMsun = 1.3271244e20, GMearth = 3.986004e14;

export const MATH = [
  C('pi', 'π', PI, 0, '', L('Pi (Math.PI)', 'Pi greco (Math.PI)')),
  C('tau', 'τ', 2 * PI, 0, '', L('Tau (2π)', 'Tau (2π)')),
  C('e', 'e', Math.E, 0, '', L("Euler's number (Math.E)", 'Numero di Nepero (Math.E)')),
  C('phi', 'φ', (1 + Math.sqrt(5)) / 2, 0, '', L('Golden ratio', 'Sezione aurea')),
  C('silver', 'δS', 1 + Math.SQRT2, 0, '', L('Silver ratio (1 + √2)', 'Rapporto argenteo (1 + √2)')),
  C('plastic', 'ρ', 1.324717957244746, 0, '', L('Plastic number', 'Numero plastico')),
  C('sqrt2', '√2', Math.SQRT2, 0, '', L('Square root of 2 (Math.SQRT2)', 'Radice di 2 (Math.SQRT2)')),
  { ...C('sqrtHalf', '√½', Math.SQRT1_2, 0, '', L('Square root of 1/2 (Math.SQRT1_2)', 'Radice di 1/2 (Math.SQRT1_2)')), old: 'sqrt1_2' },
  C('sqrt3', '√3', Math.sqrt(3), 0, '', L('Square root of 3', 'Radice di 3')),
  C('ln2', 'ln 2', Math.LN2, 0, '', L('Natural log of 2 (Math.LN2)', 'Logaritmo naturale di 2 (Math.LN2)')),
  C('ln10', 'ln 10', Math.LN10, 0, '', L('Natural log of 10 (Math.LN10)', 'Logaritmo naturale di 10 (Math.LN10)')),
  C('log2e', 'log₂ e', Math.LOG2E, 0, '', L('Base-2 log of e (Math.LOG2E)', 'Logaritmo in base 2 di e (Math.LOG2E)')),
  C('log10e', 'log₁₀ e', Math.LOG10E, 0, '', L('Base-10 log of e (Math.LOG10E)', 'Logaritmo in base 10 di e (Math.LOG10E)')),
  C('deg', '°', PI / 180, 0, 'rad', L('One degree in radians (π/180)', 'Un grado in radianti (π/180)')),
  C('gamma', 'γ', 0.5772156649015329, 0, '', L('Euler–Mascheroni constant', 'Costante di Eulero-Mascheroni')),
  C('catalan', 'G', 0.915965594177219, 0, '', L("Catalan's constant", 'Costante di Catalan')),
  C('apery', 'ζ(3)', 1.2020569031595942, 0, '', L("Apéry's constant", 'Costante di Apéry')),
  C('omega', 'Ω', 0.5671432904097838, 0, '', L('Omega constant', 'Costante omega')),
  C('khinchin', 'K₀', 2.6854520010653064, 0, '', L("Khinchin's constant", 'Costante di Khinchin')),
  C('feigenbaumDelta', 'δ', 4.66920160910299, 0, '', L('Feigenbaum constant δ', 'Costante di Feigenbaum δ')),
  C('feigenbaumAlpha', 'α', 2.5029078750958928, 0, '', L('Feigenbaum constant α', 'Costante di Feigenbaum α')),
  C('epsilon', 'ε', Number.EPSILON, 0, '', L('Machine epsilon (Number.EPSILON)', 'Epsilon di macchina (Number.EPSILON)')),
  C('maxSafe', '2⁵³ − 1', Number.MAX_SAFE_INTEGER, 0, '', L('Largest safe integer (Number.MAX_SAFE_INTEGER)', 'Intero sicuro più grande (Number.MAX_SAFE_INTEGER)')),
  C('maxValue', 'max', Number.MAX_VALUE, 0, '', L('Largest number (Number.MAX_VALUE)', 'Numero più grande (Number.MAX_VALUE)')),
  C('minValue', 'min', Number.MIN_VALUE, 0, '', L('Smallest positive number (Number.MIN_VALUE)', 'Numero positivo più piccolo (Number.MIN_VALUE)')),
];

export const PHYSICS = [
  // the seven defining constants of the SI (exact)
  C('c', 'c', c, 0, 'm/s', L('Speed of light in vacuum', 'Velocità della luce nel vuoto')),
  C('h', 'h', h, 0, 'J·s', L('Planck constant', 'Costante di Planck')),
  C('hbar', 'ħ', h / (2 * PI), 0, 'J·s', L('Reduced Planck constant (h/2π)', 'Costante di Planck ridotta (h/2π)')),
  { ...C('qe', 'e', qe, 0, 'C', L('Elementary charge', 'Carica elementare')), old: 'e' },
  C('kB', 'k', kB, 0, 'J/K', L('Boltzmann constant', 'Costante di Boltzmann')),
  C('NA', 'Nᴀ', NA, 0, 'mol⁻¹', L('Avogadro constant', 'Costante di Avogadro')),
  C('dnuCs', 'ΔνCs', 9192631770, 0, 'Hz', L('Caesium hyperfine frequency', 'Frequenza iperfine del cesio')),
  C('Kcd', 'Kcd', 683, 0, 'lm/W', L('Luminous efficacy (540 THz)', 'Efficacia luminosa (540 THz)')),
  // universal
  C('G', 'G', G, 1.5e-15, 'm³/(kg·s²)', L('Newtonian constant of gravitation', 'Costante di gravitazione universale')),
  C('planckLength', 'lP', 1.616255e-35, 1.8e-40, 'm', L('Planck length', 'Lunghezza di Planck')),
  C('planckMass', 'mP', 2.176434e-8, 2.4e-13, 'kg', L('Planck mass', 'Massa di Planck')),
  C('planckTime', 'tP', 5.391247e-44, 6.0e-49, 's', L('Planck time', 'Tempo di Planck')),
  C('planckTemp', 'TP', 1.416784e32, 1.6e27, 'K', L('Planck temperature', 'Temperatura di Planck')),
  // electromagnetic
  C('mu0', 'μ₀', 1.25663706127e-6, 2.0e-16, 'N/A²', L('Vacuum magnetic permeability', 'Permeabilità magnetica del vuoto')),
  C('eps0', 'ε₀', eps0, 1.4e-21, 'F/m', L('Vacuum electric permittivity', 'Permittività elettrica del vuoto')),
  C('ke', 'kₑ', 1 / (4 * PI * eps0), 1.4, 'N·m²/C²', L('Coulomb constant (1/4πε₀)', 'Costante di Coulomb (1/4πε₀)')),
  C('Z0', 'Z₀', 376.730313412, 5.9e-8, 'Ω', L('Characteristic impedance of vacuum', 'Impedenza caratteristica del vuoto')),
  C('Phi0', 'Φ₀', h / (2 * qe), 0, 'Wb', L('Magnetic flux quantum (h/2e)', 'Quanto di flusso magnetico (h/2e)')),
  C('G0', 'G₀', 2 * qe * qe / h, 0, 'S', L('Conductance quantum (2e²/h)', 'Quanto di conduttanza (2e²/h)')),
  C('KJ', 'Kᴊ', 2 * qe / h, 0, 'Hz/V', L('Josephson constant (2e/h)', 'Costante di Josephson (2e/h)')),
  C('RK', 'Rᴋ', h / (qe * qe), 0, 'Ω', L('von Klitzing constant (h/e²)', 'Costante di von Klitzing (h/e²)')),
  C('muB', 'μB', 9.2740100657e-24, 2.9e-33, 'J/T', L('Bohr magneton', 'Magnetone di Bohr')),
  C('muN', 'μN', 5.0507837393e-27, 1.6e-36, 'J/T', L('Nuclear magneton', 'Magnetone nucleare')),
  // atomic and nuclear
  C('alpha', 'α', 7.2973525643e-3, 1.1e-12, '', L('Fine-structure constant', 'Costante di struttura fine')),
  C('alphaInv', '1/α', 137.035999177, 2.1e-8, '', L('Inverse fine-structure constant', 'Inverso della costante di struttura fine')),
  C('Rinf', 'R∞', 10973731.568157, 1.2e-5, 'm⁻¹', L('Rydberg constant', 'Costante di Rydberg')),
  C('a0', 'a₀', 5.29177210544e-11, 8.2e-21, 'm', L('Bohr radius', 'Raggio di Bohr')),
  C('Eh', 'Eh', 4.359744722206e-18, 4.8e-30, 'J', L('Hartree energy', 'Energia di Hartree')),
  C('me', 'mₑ', 9.1093837139e-31, 2.8e-40, 'kg', L('Electron mass', "Massa dell'elettrone")),
  C('mp', 'mₚ', 1.67262192595e-27, 5.2e-37, 'kg', L('Proton mass', 'Massa del protone')),
  C('mn', 'mₙ', 1.67492750056e-27, 8.5e-37, 'kg', L('Neutron mass', 'Massa del neutrone')),
  C('mmu', 'mμ', 1.883531627e-28, 4.2e-36, 'kg', L('Muon mass', 'Massa del muone')),
  C('mpme', 'mₚ/mₑ', 1836.152673426, 3.2e-8, '', L('Proton-electron mass ratio', 'Rapporto tra massa del protone e dell\'elettrone')),
  C('u', 'u', 1.66053906892e-27, 5.2e-37, 'kg', L('Atomic mass constant (dalton)', 'Unità di massa atomica (dalton)')),
  C('re', 'rₑ', 2.8179403205e-15, 1.3e-24, 'm', L('Classical electron radius', "Raggio classico dell'elettrone")),
  C('lambdaC', 'λC', 2.42631023538e-12, 7.6e-22, 'm', L('Compton wavelength', 'Lunghezza d\'onda Compton')),
  C('eV', 'eV', qe, 0, 'J', L('Electronvolt', 'Elettronvolt')),
  // physico-chemical
  C('R', 'R', R, 0, 'J/(mol·K)', L('Molar gas constant', 'Costante dei gas')),
  C('F', 'F', NA * qe, 0, 'C/mol', L('Faraday constant', 'Costante di Faraday')),
  C('sigma', 'σ', 2 * PI ** 5 * kB ** 4 / (15 * h ** 3 * c ** 2), 0, 'W/(m²·K⁴)', L('Stefan–Boltzmann constant', 'Costante di Stefan-Boltzmann')),
  C('b', 'b', 2.897771955e-3, 0, 'm·K', L('Wien wavelength displacement constant', 'Costante di spostamento di Wien')),
  C('Vm', 'Vm', Vm, 0, 'm³/mol', L('Molar volume of ideal gas (0 °C, 1 atm)', 'Volume molare del gas ideale (0 °C, 1 atm)')),
  C('n0', 'n₀', NA / Vm, 0, 'm⁻³', L('Loschmidt constant (0 °C, 1 atm)', 'Costante di Loschmidt (0 °C, 1 atm)')),
  C('atm', 'atm', 101325, 0, 'Pa', L('Standard atmosphere', 'Atmosfera standard')),
  C('T0', 'T₀', 273.15, 0, 'K', L('Zero Celsius in kelvin', 'Zero Celsius in kelvin')),
];

export const ASTRO = [
  C('au', 'au', 149597870700, 0, 'm', L('Astronomical unit', 'Unità astronomica')),
  C('ly', 'ly', 9460730472580800, 0, 'm', L('Light-year', 'Anno luce')),
  C('pc', 'pc', 648000 / PI * 149597870700, 0, 'm', L('Parsec', 'Parsec')),
  C('year', 'a', 31557600, 0, 's', L('Julian year', 'Anno giuliano')),
  C('GMsun', 'GM☉', GMsun, 0, 'm³/s²', L('Solar mass parameter', 'Parametro gravitazionale del Sole')),
  C('Msun', 'M☉', 1.98841e30, 4.5e25, 'kg', L('Solar mass', 'Massa del Sole')),
  C('Rsun', 'R☉', 6.957e8, 0, 'm', L('Solar radius', 'Raggio del Sole')),
  C('Lsun', 'L☉', 3.828e26, 0, 'W', L('Solar luminosity', 'Luminosità del Sole')),
  C('Tsun', 'T☉', 5772, 0, 'K', L('Solar effective temperature', 'Temperatura efficace del Sole')),
  C('S', 'S☉', 1361, 0, 'W/m²', L('Solar constant (irradiance at 1 au)', 'Costante solare (irraggiamento a 1 au)')),
  C('GMearth', 'GM⊕', GMearth, 0, 'm³/s²', L('Earth mass parameter', 'Parametro gravitazionale della Terra')),
  C('Mearth', 'M⊕', 5.97217e24, 1.3e20, 'kg', L('Earth mass', 'Massa della Terra')),
  C('ReEarth', 'Rₑ⊕', 6.3781e6, 0, 'm', L('Earth equatorial radius', 'Raggio equatoriale della Terra')),
  C('RpEarth', 'Rₚ⊕', 6.3568e6, 0, 'm', L('Earth polar radius', 'Raggio polare della Terra')),
  C('RmEarth', 'R⊕', 6371008.7714, 0, 'm', L('Earth mean radius', 'Raggio medio della Terra')),
  C('omegaEarth', 'ω⊕', 7.292115e-5, 0, 'rad/s', L('Earth rotation rate', 'Velocità angolare della Terra')),
  C('gn', 'gₙ', 9.80665, 0, 'm/s²', L('Standard acceleration of gravity', 'Accelerazione di gravità standard')),
];

const optionsOf = list => list.map(k => ({ value: k.old ?? k.key, label: L(`${k.symbol} · ${k.label.en}`, `${k.symbol} · ${k.label.it}`) }));

const OUT_VALUE = { name: 'value', type: 'number', label: L('value', 'valore') };
const OUT_SYMBOL = { name: 'symbol', type: 'text', label: L('symbol', 'simbolo'), hidden: true };
const OUT_UNIT = { name: 'unit', type: 'text', label: L('unit', 'unità'), hidden: true };
const OUT_U = { name: 'uncertainty', type: 'number', label: L('uncertainty', 'incertezza'), hidden: true };

const sendAll = (b, out) => { for (const [port, v] of Object.entries(out)) b.send(port, v); };
const outputsOf = (k, withUnits) => (withUnits ? { value: k.value, symbol: k.symbol, unit: k.unit, uncertainty: k.u } : { value: k.value, symbol: k.symbol });

/** The block of one constant: const.<key>, its name and symbol as the label. */
const oneConstant = (k, category, icon, withUnits) => ({
  type: `const.${k.key}`, version: 1, category, icon,
  label: L(`${k.label.en} · ${k.symbol}`, `${k.label.it} · ${k.symbol}`),
  inputs: [{ name: 'send', type: 'pulse', label: L('send', 'invia'), hidden: true }],
  outputs: withUnits ? [OUT_VALUE, OUT_SYMBOL, OUT_UNIT, OUT_U] : [OUT_VALUE, OUT_SYMBOL],
  start(b) { if (!b.linked('send')) sendAll(b, outputsOf(k, withUnits)); },
  run() { return outputsOf(k, withUnits); },
});

const REPLACED = L('Replaced by one block per constant, in the categories Math constants, Physical constants and Astronomical constants.',
  'Sostituito da un blocco per ogni costante, nelle categorie Costanti matematiche, Costanti fisiche e Costanti astronomiche.');

/** Obsolete (1.0.0): the constant chosen in a menu. Saved schemas still run it; the palette no longer shows it. */
const constantBlock = (type, icon, label, list, withUnits) => {
  const byKey = new Map(list.map(k => [k.old ?? k.key, k]));
  const pick = b => {
    const k = byKey.get(b.config.constant);
    if (!k) throw new Error(`Costante sconosciuta: ${b.config.constant}`);
    return outputsOf(k, withUnits);
  };
  return {
    type, version: 1, category: 'value', icon, label, obsolete: REPLACED,
    inputs: [{ name: 'send', type: 'pulse', label: L('send', 'invia'), hidden: true }],
    outputs: withUnits ? [OUT_VALUE, OUT_SYMBOL, OUT_UNIT, OUT_U] : [OUT_VALUE, OUT_SYMBOL],
    config: [{ key: 'constant', type: 'select', default: list[0].key, options: optionsOf(list), label: L('Constant', 'Costante') }],
    start(b) { if (!b.linked('send')) sendAll(b, pick(b)); },
    run(_inputs, b) { return pick(b); },
  };
};

export const blocks = [
  ...MATH.map(k => oneConstant(k, 'constMath', 'calculator', false)),
  ...PHYSICS.map(k => oneConstant(k, 'constPhysics', 'bolt', true)),
  ...ASTRO.map(k => oneConstant(k, 'constAstro', 'globe', true)),
  constantBlock('const.math', 'calculator', L('Math constants (Math.PI, Math.E…)', 'Costanti matematiche (Math.PI, Math.E…)'), MATH, false),
  constantBlock('const.physics', 'bolt', L('Physical constants (CODATA)', 'Costanti fisiche (CODATA)'), PHYSICS, true),
  constantBlock('const.astro', 'globe', L('Astronomical and Earth constants', 'Costanti astronomiche e della Terra'), ASTRO, true),
];


/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
const SUBCATEGORIES = {
  constMath: [
    ['classic', L('Classic constants', 'Costanti classiche'), ['const.pi', 'const.tau', 'const.e', 'const.phi', 'const.silver', 'const.plastic', 'const.sqrt2', 'const.sqrtHalf', 'const.sqrt3', 'const.ln2', 'const.ln10', 'const.log2e', 'const.log10e', 'const.deg']],
    ['analysis', L('Analysis and dynamical systems', 'Analisi e sistemi dinamici'), ['const.gamma', 'const.catalan', 'const.apery', 'const.omega', 'const.khinchin', 'const.feigenbaumDelta', 'const.feigenbaumAlpha']],
    ['limits', L('Number limits', 'I limiti dei numeri'), ['const.epsilon', 'const.maxSafe', 'const.maxValue', 'const.minValue']],
  ],
  constPhysics: [
    ['si', L('The SI defining constants, and ħ', 'Le costanti che definiscono il SI, e ħ'), ['const.c', 'const.h', 'const.hbar', 'const.qe', 'const.kB', 'const.NA', 'const.dnuCs', 'const.Kcd']],
    ['planck', L('Gravitation and Planck units', 'Gravitazione e unità di Planck'), ['const.G', 'const.planckLength', 'const.planckMass', 'const.planckTime', 'const.planckTemp']],
    ['em', L('Electromagnetic', 'Elettromagnetiche'), ['const.mu0', 'const.eps0', 'const.ke', 'const.Z0', 'const.Phi0', 'const.G0', 'const.KJ', 'const.RK', 'const.muB', 'const.muN']],
    ['atomic', L('Atomic and nuclear', 'Atomiche e nucleari'), ['const.alpha', 'const.alphaInv', 'const.Rinf', 'const.a0', 'const.Eh', 'const.me', 'const.mp', 'const.mn', 'const.mmu', 'const.mpme', 'const.u', 'const.re', 'const.lambdaC', 'const.eV']],
    ['chemistry', L('Physico-chemical', 'Fisico-chimiche'), ['const.R', 'const.F', 'const.sigma', 'const.b', 'const.Vm', 'const.n0', 'const.atm', 'const.T0']],
  ],
  constAstro: [
    ['distances', L('Distances and times', 'Distanze e tempi'), ['const.au', 'const.ly', 'const.pc', 'const.year']],
    ['sun', L('The Sun', 'Il Sole'), ['const.GMsun', 'const.Msun', 'const.Rsun', 'const.Lsun', 'const.Tsun', 'const.S']],
    ['earth', L('The Earth', 'La Terra'), ['const.GMearth', 'const.Mearth', 'const.ReEarth', 'const.RpEarth', 'const.RmEarth', 'const.omegaEarth', 'const.gn']],
  ],
};
for (const [category, subs] of Object.entries(SUBCATEGORIES)) {
  subs.forEach(([id, label, types], i) => {
    for (const b of blocks) if (b.category === category && types.includes(b.type)) b.subcategory = { id, label, order: i };
  });
}
