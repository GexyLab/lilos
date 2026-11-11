/**
 * The base blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import).
 *
 * A block: { type, version, category, icon, label{en,it}, inputs, outputs, config, grow?, role?,
 * execution?, start?, run?, step?, stop?, upgrade? }. Ports: { name, type, label?, hidden? }; types
 * are number, bool, text, object, list, any, pulse; `hidden: true` = not drawn until the user shows
 * it (the eye in Proprietà); b.linked(port) tells whether an input is used. Every block also has
 * the output «error». b.args: the program's arguments (from the command line); b.exit(value)
 * closes the whole program with a value (engine 1.6.0).
 * grow: what can be added in the properties sidebar (never on the block): { inputs|outputs: { type,
 * max, name: 'letter'|'number'|'user', label } }; added ports have ids x1, x2… and a name.
 */

const L = (en, it) => ({ en, it });
const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : Number(String(v ?? '').replace(',', '.')));
const bool = v => (typeof v === 'string' ? !['', '0', 'false', 'no', 'off'].includes(v.trim().toLowerCase()) : Boolean(v));
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const addedValues = b => b.added.inputs.map(p => p.value);
const PULSE = true;
const toNumber = v => { const n = num(v); if (Number.isNaN(n)) throw new Error('Non è un numero'); return n; };

/** A Cast block: the value that arrives, converted, on «risultato». */
const cast = (type, label, to, fn) => ({
  type, version: 1, category: 'value', icon: 'sync', label,
  inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
  outputs: [{ name: 'result', type: to, label: L('result', 'risultato') }],
  run: ({ value }) => ({ result: fn(value) }),
});

/** a, b and the added inputs, the ones that have a value. */
const operands = (inputs, b) => [inputs.a, inputs.b, ...addedValues(b)].filter(v => v !== undefined);

const logic = (type, label, icon, fn) => ({
  type, version: 1, category: 'logic', icon, label,
  inputs: [{ name: 'a', type: 'bool' }, { name: 'b', type: 'bool' }],
  outputs: [{ name: 'result', type: 'bool', label: L('result', 'risultato') }],
  grow: { inputs: { type: 'bool', max: 16, name: 'letter' } },
  run(inputs, b) { return { result: fn(operands(inputs, b).map(bool)) }; },
});

const math = (type, label, icon, fn) => ({
  type, version: 1, category: 'math', icon, label,
  inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
  outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
  grow: { inputs: { type: 'number', max: 16, name: 'letter' } },
  run(inputs, b) {
    const ns = operands(inputs, b).map(num);
    if (ns.some(n => Number.isNaN(n))) throw new Error('Serve un numero');
    return { result: fn(ns) };
  },
});

const COMPARE = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, ge: (a, b) => a >= b, lt: (a, b) => a < b, le: (a, b) => a <= b };
const UNARY = {
  abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt, neg: x => -x,
  sin: Math.sin, cos: Math.cos, log: Math.log, exp: Math.exp,
};

function getPath(obj, path) {
  let cur = obj;
  for (const key of String(path ?? '').split('.').filter(Boolean)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = Array.isArray(cur) && /^\d+$/.test(key) ? cur[Number(key)] : cur[key];
  }
  return cur;
}

const consoleField = { key: 'console', type: 'console', default: 'main', label: L('Console', 'Console') };

// The choices of the drawing blocks (Testo, Forma): the same as the UI components Testo and Forma in components.js
const O = (value, en, it) => ({ value, label: L(en, it) });
const ALIGN = [O('start', 'Left', 'A sinistra'), O('center', 'Centre', 'Al centro'), O('end', 'Right', 'A destra')];
const SHAPES = [O('rect', 'Rectangle', 'Rettangolo'), O('rounded', 'Rounded rectangle', 'Rettangolo arrotondato'), O('ellipse', 'Ellipse · circle', 'Ellisse · cerchio'), O('diamond', 'Diamond', 'Rombo'), O('triangle', 'Triangle', 'Triangolo'), O('line', 'Line · arrow', 'Linea · freccia')];
const DIRECTIONS = [O('horizontal', 'Horizontal', 'Orizzontale'), O('vertical', 'Vertical', 'Verticale'), O('down', 'Diagonal ↘', 'Diagonale ↘'), O('up', 'Diagonal ↗', 'Diagonale ↗')];
const ARROWS = [O('none', 'None', 'Nessuna'), O('end', 'At the end', 'Alla fine'), O('start', 'At the start', 'All\'inizio'), O('both', 'At both ends', 'A entrambi i capi')];
const DASHES = [O('solid', 'Solid', 'Continua'), O('dashed', 'Dashed', 'Tratteggiata'), O('dotted', 'Dotted', 'Punteggiata')];
// The choices of Opzione (-x · --nome)
const OPTION_KINDS = [O('flag', 'Flag, yes/no (-v, --verbose)', 'Interruttore, sì/no (-v, --verbose)'), O('value', 'With a value (-o FILE, --output=FILE)', 'Con un valore (-o FILE, --output=FILE)'), O('list', 'Repeatable, a list (-I a -I b)', 'Ripetibile, una lista (-I a -I b)')];
const OPTION_TYPES = [O('text', 'Text', 'Testo'), O('number', 'Number', 'Numero'), O('bool', 'Yes/no', 'Sì/no')];

export const blocks = [
  // ---- Valori
  {
    // A constant, or a variable when something is linked to «imposta». Both ports are hidden by
    // default: without a link to «invia» the value goes out at the start of the schema.
    type: 'core.value', version: 2, category: 'value', icon: 'hash', label: L('Constant · Variable', 'Costante · Variabile'),
    inputs: [
      { name: 'send', type: 'pulse', label: L('send', 'invia'), hidden: true },
      { name: 'set', type: 'any', label: L('set', 'imposta'), hidden: true },
    ],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    config: [
      { key: 'kind', type: 'select', default: 'number', options: ['number', 'text', 'bool', 'json'], label: L('Kind', 'Tipo') },
      { key: 'value', type: 'text', default: '0', label: L('Value (the starting one, for a variable)', 'Valore (quello iniziale, per una variabile)') },
    ],
    start(b) {
      b.memory().value = valueOf(b.config);
      if (!b.linked('send')) b.send('value', b.memory().value);
    },
    run(inputs, b) {
      const m = b.memory();
      if (b.trigger === 'set') {
        m.value = castTo(b.config.kind, inputs.set);
        return b.linked('send') ? undefined : { value: m.value };
      }
      return { value: m.value };
    },
    // v1 had «Invia all'avvio»: now it sends at the start when nothing is linked to «invia»
    upgrade(config) { const { atStart, ...rest } = config; return rest; },
  },
  {
    type: 'core.store', version: 1, category: 'value', icon: 'copy', label: L('Store (set · get)', 'Memoria (set · get)'),
    inputs: [{ name: 'set', type: 'any', label: L('set', 'imposta') }, { name: 'get', type: 'pulse', label: L('read', 'leggi') }, { name: 'clear', type: 'pulse', label: L('clear', 'svuota') }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    config: [{ key: 'echo', type: 'checkbox', default: false, label: L('Send when set', 'Invia quando cambia') }],
    run(inputs, b) {
      const m = b.memory();
      if (b.trigger === 'set') { m.value = inputs.set; return b.config.echo ? { value: m.value } : undefined; }
      if (b.trigger === 'clear') { m.value = undefined; return undefined; }
      return { value: m.value ?? null };
    },
  },
  // ---- Cast: one block per conversion
  cast('core.toNumber', L('Cast to number (Number())', 'Cast in numero (Number())'), 'number', toNumber),
  cast('core.toText', L('Cast to text (String())', 'Cast in testo (String())'), 'text', text),
  cast('core.toBool', L('Cast to yes/no (Boolean())', 'Cast in sì/no (Boolean())'), 'bool', bool),
  cast('core.toJson', L('Cast to JSON text (JSON.stringify)', 'Cast in testo JSON (JSON.stringify)'), 'text', v => JSON.stringify(v)),
  cast('core.parseJson', L('Cast from JSON text (JSON.parse)', 'Cast da testo JSON (JSON.parse)'), 'any', v => JSON.parse(text(v))),
  {
    // Obsolete (core 1.6.0): replaced by the five Cast blocks above. Kept so that saved schemas still run;
    // the palette no longer shows it.
    type: 'core.convert', version: 1, category: 'value', icon: 'sync', label: L('Type cast', 'Cast (converti tipo)'),
    obsolete: L('Replaced by one block per conversion: Cast to number, to text, to yes/no, to JSON text and from JSON text.', 'Sostituito da un blocco per ogni conversione: Cast in numero, in testo, in sì/no, in testo JSON e da testo JSON.'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [{ name: 'result', type: 'any', label: L('result', 'risultato') }],
    config: [{ key: 'to', type: 'select', default: 'number', options: ['number', 'text', 'bool', 'json', 'parse'], label: L('To', 'In') }],
    run({ value }, b) {
      switch (b.config.to) {
        case 'number': return { result: toNumber(value) };
        case 'text': return { result: text(value) };
        case 'bool': return { result: bool(value) };
        case 'json': return { result: JSON.stringify(value) };
        default: return { result: JSON.parse(text(value)) };
      }
    },
  },

  // ---- Logica
  logic('core.and', L('AND', 'AND'), 'logic', vs => vs.length > 0 && vs.every(Boolean)),
  logic('core.or', L('OR', 'OR'), 'logic', vs => vs.some(Boolean)),
  logic('core.xor', L('XOR', 'XOR'), 'logic', vs => vs.filter(Boolean).length % 2 === 1),
  {
    type: 'core.not', version: 1, category: 'logic', icon: 'not', label: L('NOT', 'NOT'),
    inputs: [{ name: 'value', type: 'bool', label: L('value', 'valore') }],
    outputs: [{ name: 'result', type: 'bool', label: L('result', 'risultato') }],
    run: ({ value }) => ({ result: !bool(value) }),
  },
  {
    type: 'core.compare', version: 1, category: 'logic', icon: 'compare', label: L('Compare (== != < >)', 'Confronto (== ≠ < >)'),
    inputs: [{ name: 'a', type: 'any' }, { name: 'b', type: 'any' }],
    outputs: [
      { name: 'result', type: 'bool', label: L('result', 'risultato') },
      { name: 'true', type: 'pulse', label: L('if true', 'se vero') },
      { name: 'false', type: 'pulse', label: L('if false', 'se falso') },
    ],
    config: [{ key: 'op', type: 'select', default: 'gt', options: Object.keys(COMPARE), label: L('Operation', 'Operazione') }],
    run({ a, b: second }, b) {
      const both = isNum(a) || isNum(second) ? [num(a), num(second)] : [text(a), text(second)];
      const result = (COMPARE[b.config.op] ?? COMPARE.eq)(...both);
      return { result, [result ? 'true' : 'false']: PULSE };
    },
  },
  {
    type: 'core.if', version: 1, category: 'logic', icon: 'branch', label: L('If · Else', 'If · Else'),
    inputs: [{ name: 'condition', type: 'bool', label: L('condition', 'condizione') }, { name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [{ name: 'then', type: 'any', label: L('then', 'allora') }, { name: 'else', type: 'any', label: L('else', 'altrimenti') }],
    run({ condition, value }) { return bool(condition) ? { then: value ?? PULSE } : { else: value ?? PULSE }; },
  },
  {
    type: 'core.switch', version: 1, category: 'logic', icon: 'split', label: L('Switch · Case', 'Switch · Case'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [{ name: 'else', type: 'pulse', label: L('otherwise', 'altrimenti') }],
    grow: { outputs: { type: 'pulse', max: 32, name: 'user', label: L('case', 'caso') } },
    run({ value }, b) {
      const hit = b.added.outputs.find(p => text(p.name) === text(value));
      return hit ? { [hit.id]: PULSE } : { else: PULSE };
    },
  },
  {
    type: 'core.select', version: 1, category: 'logic', icon: 'list', label: L('Pick by index (MUX)', 'Scegli per indice (MUX)'),
    inputs: [{ name: 'which', type: 'number', label: L('which', 'quale') }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    grow: { inputs: { type: 'any', max: 16, name: 'number' } },
    run(inputs, b) {
      const i = Math.trunc(num(inputs.which));
      const port = b.added.inputs[i - 1];
      if (!port) throw new Error(`Non c'è l'ingresso ${inputs.which}`);
      return { value: port.value };
    },
  },
  {
    type: 'core.route', version: 1, category: 'logic', icon: 'split', label: L('Route by index (DEMUX)', 'Instrada per indice (DEMUX)'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }, { name: 'which', type: 'number', label: L('which', 'quale') }],
    outputs: [],
    grow: { outputs: { type: 'any', max: 16, name: 'number' } },
    run(inputs, b) {
      if (b.trigger !== 'value') return undefined;
      const port = b.added.outputs[Math.trunc(num(inputs.which)) - 1];
      if (!port) throw new Error(`Non c'è l'uscita ${inputs.which}`);
      return { [port.id]: inputs.value };
    },
  },
  {
    type: 'core.merge', version: 1, category: 'logic', icon: 'merge', label: L('Merge', 'Merge (unisci flussi)'),
    inputs: [],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    grow: { inputs: { type: 'any', max: 16, name: 'letter' } },
    run(inputs, b) { return { value: inputs[b.trigger] }; },
  },
  {
    type: 'core.join', version: 1, category: 'logic', icon: 'merge', label: L('Await all (join)', 'Attendi tutti (join)'),
    inputs: [{ name: 'reset', type: 'pulse', label: L('reset', 'azzera') }],
    outputs: [{ name: 'ready', type: 'pulse', label: L('ready', 'pronto') }],
    grow: { inputs: { type: 'pulse', max: 16, name: 'letter' } },
    run(inputs, b) {
      const m = b.memory();
      m.seen ??= new Set();
      if (b.trigger === 'reset') { m.seen.clear(); return undefined; }
      m.seen.add(b.trigger);
      if (b.added.inputs.length && b.added.inputs.every(p => m.seen.has(p.id))) { m.seen.clear(); return { ready: PULSE }; }
      return undefined;
    },
  },
  {
    type: 'core.sequence', version: 1, category: 'logic', icon: 'list', label: L('Sequence (then)', 'Sequenza (then)'),
    inputs: [{ name: 'start', type: 'pulse', label: L('start', 'avvia') }],
    outputs: [],
    grow: { outputs: { type: 'pulse', max: 16, name: 'number', label: L('step', 'passo') } },
    run(inputs, b) { for (const p of b.added.outputs) b.send(p.id, PULSE); },
  },
  {
    type: 'core.edge', version: 1, category: 'logic', icon: 'bolt', label: L('On change (edge)', 'Al cambio (fronte ↑↓)'),
    inputs: [{ name: 'value', type: 'bool', label: L('value', 'valore') }],
    outputs: [{ name: 'rise', type: 'pulse', label: L('becomes true', 'diventa vero') }, { name: 'fall', type: 'pulse', label: L('becomes false', 'diventa falso') }],
    run({ value }, b) {
      const m = b.memory();
      const now = bool(value), before = m.last;
      m.last = now;
      if (before === undefined || before === now) return undefined;
      return now ? { rise: PULSE } : { fall: PULSE };
    },
  },

  // ---- Matematica
  math('core.add', L('Add (+)', 'Somma (+)'), 'calculator', ns => ns.reduce((s, n) => s + n, 0)),
  math('core.multiply', L('Multiply (×)', 'Moltiplicazione (×)'), 'calculator', ns => ns.reduce((s, n) => s * n, 1)),
  {
    type: 'core.subtract', version: 1, category: 'math', icon: 'calculator', label: L('Subtract (−)', 'Sottrazione (−)'),
    inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    run: ({ a, b }) => ({ result: num(a ?? 0) - num(b ?? 0) }),
  },
  {
    type: 'core.divide', version: 1, category: 'math', icon: 'calculator', label: L('Divide (÷ %)', 'Divisione (÷ %)'),
    inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }, { name: 'rest', type: 'number', label: L('remainder', 'resto') }],
    run({ a, b }) {
      if (num(b) === 0) throw new Error('Divisione per zero');
      return { result: num(a) / num(b), rest: num(a) % num(b) };
    },
  },
  {
    type: 'core.stat', version: 1, category: 'math', icon: 'chart', label: L('Min · Max · Avg', 'Min · Max · Avg'),
    inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [{ key: 'op', type: 'select', default: 'avg', options: ['min', 'max', 'avg'], label: L('Operation', 'Operazione') }],
    grow: { inputs: { type: 'number', max: 16, name: 'letter' } },
    run(inputs, b) {
      const ns = operands(inputs, b).map(num).filter(n => !Number.isNaN(n));
      if (!ns.length) return undefined;
      const op = b.config.op;
      return { result: op === 'min' ? Math.min(...ns) : op === 'max' ? Math.max(...ns) : ns.reduce((s, n) => s + n, 0) / ns.length };
    },
  },
  {
    type: 'core.math', version: 1, category: 'math', icon: 'calculator', label: L('Math functions', 'Funzioni Math'),
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [
      { key: 'op', type: 'select', default: 'round', options: Object.keys(UNARY), label: L('Operation', 'Operazione') },
      { key: 'decimals', type: 'number', default: 0, min: 0, max: 10, label: L('Decimals (round)', 'Decimali (arrotonda)'), when: { op: 'round' } },
    ],
    run({ value }, b) {
      const n = num(value);
      if (b.config.op === 'round') { const f = 10 ** (b.config.decimals ?? 0); return { result: Math.round(n * f) / f }; }
      return { result: (UNARY[b.config.op] ?? Math.round)(n) };
    },
  },
  {
    type: 'core.clamp', version: 1, category: 'math', icon: 'slider', label: L('Clamp', 'Clamp (limita)'),
    inputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [{ key: 'min', type: 'number', default: 0, label: L('Minimum', 'Minimo') }, { key: 'max', type: 'number', default: 100, label: L('Maximum', 'Massimo') }],
    run: ({ value }, b) => ({ result: Math.min(b.config.max, Math.max(b.config.min, num(value))) }),
  },
  {
    type: 'core.counter', version: 1, category: 'math', icon: 'hash', label: L('Counter (++ −−)', 'Contatore (++ −−)'),
    inputs: [{ name: 'up', type: 'pulse', label: L('up', 'più') }, { name: 'down', type: 'pulse', label: L('down', 'meno') }, { name: 'reset', type: 'pulse', label: L('reset', 'azzera') }],
    outputs: [{ name: 'count', type: 'number', label: L('count', 'conteggio') }],
    config: [{ key: 'step', type: 'number', default: 1, label: L('Step', 'Passo') }, { key: 'from', type: 'number', default: 0, label: L('Start from', 'Parte da') }],
    start(b) { b.memory().n = b.config.from; },
    run(inputs, b) {
      const m = b.memory();
      m.n = b.trigger === 'reset' ? b.config.from : m.n + (b.trigger === 'down' ? -1 : 1) * b.config.step;
      return { count: m.n };
    },
  },

  // ---- Testo
  {
    type: 'core.format', version: 1, category: 'text', icon: 'text', label: L('Template string', 'Template (formatta)'),
    inputs: [],
    outputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    config: [{ key: 'template', type: 'text', default: '{a}', label: L('Template', 'Modello') }],
    grow: { inputs: { type: 'any', max: 16, name: 'user', label: L('placeholder', 'segnaposto') } },
    run(inputs, b) {
      const byName = new Map(b.added.inputs.map(p => [p.name, p.value]));
      return { text: String(b.config.template ?? '').replace(/\{([^{}]+)\}/g, (all, name) => (byName.has(name) ? text(byName.get(name)) : all)) };
    },
  },
  {
    type: 'core.concat', version: 1, category: 'text', icon: 'text', label: L('Concat text', 'Concat testo'),
    inputs: [{ name: 'a', type: 'text' }, { name: 'b', type: 'text' }],
    outputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    config: [{ key: 'separator', type: 'text', default: '', label: L('Separator', 'Separatore') }],
    grow: { inputs: { type: 'text', max: 16, name: 'letter' } },
    run: (inputs, b) => ({ text: operands(inputs, b).map(text).join(b.config.separator ?? '') }),
  },
  {
    type: 'core.text', version: 1, category: 'text', icon: 'text', label: L('String functions', 'Funzioni stringa'),
    inputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    outputs: [{ name: 'result', type: 'any', label: L('result', 'risultato') }],
    config: [
      { key: 'op', type: 'select', default: 'upper', options: ['upper', 'lower', 'trim', 'length', 'contains', 'replace'], label: L('Operation', 'Operazione') },
      { key: 'find', type: 'text', default: '', label: L('Find', 'Cerca'), when: { op: ['contains', 'replace'] } },
      { key: 'with', type: 'text', default: '', label: L('Replace with', 'Sostituisci con'), when: { op: 'replace' } },
    ],
    run({ text: t }, b) {
      const s = text(t), c = b.config;
      const ops = { upper: () => s.toUpperCase(), lower: () => s.toLowerCase(), trim: () => s.trim(), length: () => s.length, contains: () => s.includes(c.find), replace: () => s.split(c.find).join(c.with) };
      return { result: (ops[c.op] ?? ops.trim)() };
    },
  },

  // ---- Oggetti e liste
  {
    type: 'core.get', version: 1, category: 'object', icon: 'braces', label: L('Get property', 'Get proprietà (obj.campo)'),
    inputs: [{ name: 'object', type: 'object', label: L('object', 'oggetto') }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    config: [{ key: 'path', type: 'text', default: '', label: L('Field (a.b.0)', 'Campo (a.b.0)') }],
    run({ object }, b) {
      const v = getPath(object, b.config.path);
      if (v === undefined) throw new Error(`Il campo «${b.config.path}» non esiste`);
      return { value: v };
    },
  },
  {
    type: 'core.compose', version: 1, category: 'object', icon: 'braces', label: L('Object literal { }', 'Oggetto { }'),
    inputs: [],
    outputs: [{ name: 'object', type: 'object', label: L('object', 'oggetto') }],
    grow: { inputs: { type: 'any', max: 32, name: 'user', label: L('field', 'campo') } },
    run: (inputs, b) => ({ object: Object.fromEntries(b.added.inputs.filter(p => p.value !== undefined).map(p => [p.name, p.value])) }),
  },
  {
    type: 'core.decompose', version: 1, category: 'object', icon: 'braces', label: L('Destructure object', 'Destruttura oggetto'),
    inputs: [{ name: 'object', type: 'object', label: L('object', 'oggetto') }],
    outputs: [],
    grow: { outputs: { type: 'any', max: 32, name: 'user', label: L('field', 'campo') } },
    run({ object }, b) {
      const out = {};
      for (const p of b.added.outputs) { const v = getPath(object, p.name); if (v !== undefined) out[p.id] = v; }
      return out;
    },
  },
  {
    type: 'core.list', version: 1, category: 'object', icon: 'list', label: L('Array literal [ ]', 'Lista [ ]'),
    inputs: [],
    outputs: [{ name: 'list', type: 'list', label: L('list', 'lista') }],
    grow: { inputs: { type: 'any', max: 32, name: 'number' } },
    run: (inputs, b) => ({ list: b.added.inputs.map(p => p.value ?? null) }),
  },

  // ---- Tempo
  {
    type: 'core.onStart', version: 1, category: 'time', icon: 'play', label: L('On start (main)', 'All\'avvio (main)'),
    inputs: [], outputs: [{ name: 'pulse', type: 'pulse', label: L('pulse', 'impulso') }],
    start(b) { b.send('pulse', PULSE); },
  },
  {
    type: 'core.every', version: 1, category: 'time', icon: 'clock', label: L('Interval (setInterval)', 'Intervallo (setInterval)'),
    inputs: [{ name: 'on', type: 'bool', label: L('on', 'acceso') }],
    outputs: [{ name: 'tick', type: 'pulse', label: L('pulse', 'impulso') }],
    config: [
      { key: 'seconds', type: 'number', default: 30, min: 0.05, max: 86400, label: L('Every (seconds)', 'Ogni (secondi)') },
      { key: 'atStart', type: 'checkbox', default: true, label: L('Starts on its own', 'Parte da solo') },
    ],
    start(b) { if (b.config.atStart) startTicks(b); },
    run({ on }, b) { if (bool(on)) startTicks(b); else stopTicks(b); },
  },
  {
    type: 'core.delay', version: 1, category: 'time', icon: 'wait', label: L('Delay (setTimeout)', 'Ritardo (setTimeout)'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    config: [{ key: 'seconds', type: 'number', default: 1, min: 0, max: 86400, label: L('Seconds', 'Secondi') }],
    run({ value }, b) { b.setTimeout(() => b.send('value', value), b.config.seconds * 1000); },
  },
  {
    type: 'core.debounce', version: 1, category: 'time', icon: 'wait', label: L('Debounce', 'Debounce'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    config: [{ key: 'seconds', type: 'number', default: 0.5, min: 0, max: 3600, label: L('Quiet for (seconds)', 'Fermo per (secondi)') }],
    run({ value }, b) {
      const m = b.memory();
      b.clearTimer(m.t);
      m.t = b.setTimeout(() => b.send('value', value), b.config.seconds * 1000);
    },
  },
  {
    type: 'core.throttle', version: 1, category: 'time', icon: 'wait', label: L('Throttle', 'Throttle'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    config: [{ key: 'seconds', type: 'number', default: 1, min: 0, max: 3600, label: L('Seconds', 'Secondi') }],
    run({ value }, b) {
      const m = b.memory(), now = b.now();
      if (m.last && now - m.last < b.config.seconds * 1000) return undefined;
      m.last = now;
      return { value };
    },
  },
  {
    type: 'core.now', version: 1, category: 'time', icon: 'calendar', label: L('Now (date and time)', 'Now (data e ora)'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }],
    outputs: [{ name: 'iso', type: 'text', label: L('ISO', 'ISO') }, { name: 'ms', type: 'number', label: L('milliseconds', 'millisecondi') }, { name: 'parts', type: 'object', label: L('parts', 'parti') }],
    run(inputs, b) {
      const d = new Date(b.now());
      return { iso: d.toISOString(), ms: d.getTime(), parts: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds(), weekday: d.getDay() } };
    },
  },

  // ---- Console
  {
    type: 'core.consoleWrite', version: 1, category: 'console', icon: 'terminal', label: L('Print (console.log)', 'Print (console.log)'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }, { name: 'clear', type: 'pulse', label: L('clear', 'pulisci') }],
    outputs: [{ name: 'written', type: 'pulse', label: L('written', 'scritto') }],
    config: [
      consoleField,
      { key: 'level', type: 'select', default: 'normal', options: ['normal', 'info', 'warning', 'error'], label: L('Level', 'Livello') },
      { key: 'format', type: 'select', default: 'text', options: ['text', 'json'], label: L('Format', 'Formato') },
    ],
    grow: { inputs: { type: 'any', max: 16, name: 'user' } },
    async run(inputs, b) {
      if (b.trigger === 'clear') { await b.console.clear(b.config.console); return undefined; }
      if (b.trigger !== 'value') return undefined;   // the added inputs only keep their value
      const show = v => (b.config.format === 'json' && v && typeof v === 'object' ? JSON.stringify(v, null, 2) : text(v));
      const extra = b.added.inputs.filter(p => p.value !== undefined).map(p => `${p.name}=${show(p.value)}`);
      await b.console.write(b.config.console, [show(inputs.value), ...extra].join('  '), b.config.level);
      return { written: PULSE };
    },
  },
  {
    type: 'core.consoleRead', version: 1, category: 'console', icon: 'keyboard', label: L('Input (readline)', 'Input (readline)'),
    inputs: [{ name: 'ask', type: 'pulse', label: L('ask', 'chiedi') }, { name: 'question', type: 'text', label: L('question', 'domanda'), trigger: false }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }, { name: 'cancelled', type: 'pulse', label: L('cancelled', 'annullato') }],
    config: [
      consoleField,
      { key: 'question', type: 'text', default: '', label: L('Question', 'Domanda') },
      { key: 'kind', type: 'select', default: 'text', options: ['text', 'number', 'bool', 'key'], label: L('Kind of answer', 'Tipo di dato') },
      { key: 'fallback', type: 'text', default: '', label: L('Default value', 'Valore predefinito') },
      { key: 'timeout', type: 'number', default: 0, min: 0, max: 86400, label: L('Time limit (seconds, 0 = none)', 'Tempo massimo (secondi, 0 = nessuno)') },
      { key: 'retry', type: 'checkbox', default: true, label: L('Ask again if the answer is not valid', 'Richiedi se il dato non va bene') },
      { key: 'secret', type: 'checkbox', default: false, label: L('Hide what is typed', 'Nascondi quello che si scrive') },
    ],
    async run(inputs, b) {
      const m = b.memory();
      if (m.waiting) return undefined;   // already asking: a second «ask» is ignored
      m.waiting = true;
      try {
        const c = b.config;
        const answer = await b.console.read(c.console, {
          prompt: text(inputs.question ?? c.question), kind: c.kind, secret: !!c.secret, retry: c.retry !== false,
          fallback: c.fallback === '' ? null : c.fallback, timeoutMs: (Number(c.timeout) || 0) * 1000,
        });
        return answer?.cancelled ? { cancelled: PULSE } : { value: answer.value };
      } finally {
        m.waiting = false;
      }
    },
  },

  // ---- Eccezioni (Exception: { message, block, type, schema, at })
  {
    type: 'core.throw', version: 1, category: 'exception', icon: 'bolt', label: L('Throw', 'Throw (lancia Exception)'),
    showError: true,   // its only output: shown on the drawing from the start
    inputs: [{ name: 'value', type: 'any', label: L('throw', 'lancia') }],
    outputs: [],
    config: [{ key: 'message', type: 'text', default: '', label: L('Message ({value} = what arrives; empty = the value itself)', 'Messaggio ({value} = ciò che arriva; vuoto = il valore stesso)') }],
    run({ value }, b) {
      // an exception that arrives (from a Catch, a Global catch…) goes on as it is: rethrow
      if (isException(value) && !b.config.message) { b.send('error', value); return undefined; }
      const shown = isException(value) ? value.message : text(value);
      const msg = b.config.message ? String(b.config.message).replace(/\{value\}/g, shown) : shown;
      throw new Error(msg || 'Errore');
    },
  },
  {
    type: 'core.catch', version: 1, category: 'exception', icon: 'shield', label: L('Catch', 'Catch (cattura)'),
    inputs: [{ name: 'exception', type: 'object', label: L('exception', 'exception') }],
    outputs: [
      { name: 'caught', type: 'object', label: L('caught', 'catturata') },
      { name: 'message', type: 'text', label: L('message', 'messaggio') },
      { name: 'else', type: 'object', label: L('not caught', 'non catturata') },
    ],
    config: [
      { key: 'match', type: 'select', default: 'all', options: ['all', 'contains', 'regex', 'block', 'type'], label: L('Catch', 'Cattura') },
      { key: 'pattern', type: 'text', default: '', label: L('Text, expression, block id or block type', 'Testo, espressione, id o tipo del blocco'), when: { match: ['contains', 'regex', 'block', 'type'] } },
    ],
    grow: { inputs: { type: 'object', max: 16, name: 'letter' } },
    run(inputs, b) {
      const e = asException(inputs[b.trigger]);
      if (!e) return undefined;
      const p = String(b.config.pattern ?? '');
      let hit;
      switch (b.config.match) {
        case 'contains': hit = e.message.toLowerCase().includes(p.toLowerCase()); break;
        case 'regex': {
          let re;
          try { re = new RegExp(p, 'i'); } catch { throw new Error(`Espressione non valida: ${p}`); }
          hit = re.test(e.message); break;
        }
        case 'block': hit = e.block === p; break;
        case 'type': hit = e.type === p; break;
        default: hit = true;
      }
      return hit ? { caught: e, message: e.message } : { else: e };
    },
  },
  {
    type: 'core.errorInfo', version: 1, category: 'exception', icon: 'info', label: L('Exception data (e.message…)', 'Dati di Exception (e.message…)'),
    inputs: [{ name: 'exception', type: 'object', label: L('exception', 'exception') }],
    outputs: [
      { name: 'message', type: 'text', label: L('message', 'messaggio') },
      { name: 'block', type: 'text', label: L('block', 'blocco') },
      { name: 'type', type: 'text', label: L('block type', 'tipo di blocco') },
      { name: 'schema', type: 'text', label: L('schema', 'schema') },
      { name: 'at', type: 'number', label: L('when (ms)', 'quando (ms)') },
      { name: 'time', type: 'text', label: L('when (ISO)', 'quando (ISO)') },
    ],
    run({ exception }) {
      const e = asException(exception);
      if (!e) return undefined;
      const at = isNum(e.at) ? e.at : undefined;
      return { message: e.message, block: e.block ?? '', type: e.type ?? '', schema: e.schema ?? '', at, time: at === undefined ? undefined : new Date(at).toISOString() };
    },
  },
  {
    // Gets the exceptions that nobody linked (the engine delivers them: role 'catchAll')
    type: 'core.onError', version: 1, category: 'exception', icon: 'warning', label: L('Global catch (onerror)', 'Catch globale (onerror)'), role: 'catchAll',
    inputs: [],
    outputs: [{ name: 'exception', type: 'object', label: L('exception', 'exception') }, { name: 'message', type: 'text', label: L('message', 'messaggio') }],
    config: [
      { key: 'scope', type: 'select', default: 'schema', options: ['schema', 'program'], label: L('Catches the exceptions of', 'Cattura le exception di') },
      { key: 'console', type: 'checkbox', default: false, label: L('Write them in the main console too', 'Scrivile anche nella console principale') },
    ],
  },

  // ---- Porte di schema e componenti
  {
    type: 'core.schemaIn', version: 1, category: 'schema', icon: 'portIn', label: L('Parameter (schema input)', 'Parametro (ingresso di schema)'), role: 'schemaIn',
    inputs: [],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    config: [
      { key: 'port', type: 'text', default: 'ingresso', label: L('Port name', 'Nome della porta') },
      { key: 'type', type: 'select', default: 'any', options: ['any', 'number', 'bool', 'text', 'object', 'list', 'pulse'], label: L('Type', 'Tipo') },
      { key: 'description', type: 'text', default: '', label: L('Description', 'Descrizione') },
    ],
  },
  {
    type: 'core.schemaOut', version: 1, category: 'schema', icon: 'portOut', label: L('Return (schema output)', 'Return (uscita di schema)'), role: 'schemaOut',
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [],
    config: [
      { key: 'port', type: 'text', default: 'uscita', label: L('Port name', 'Nome della porta') },
      { key: 'type', type: 'select', default: 'any', options: ['any', 'number', 'bool', 'text', 'object', 'list', 'pulse'], label: L('Type', 'Tipo') },
      { key: 'description', type: 'text', default: '', label: L('Description', 'Descrizione') },
    ],
    run({ value }, b) { b.exportPort(b.config.port, value); },
  },
  {
    // The object a Componente UI has in a schema: its ports are the component's (the engine fills
    // them from the component's definition); the other blocks link to this, never to the window.
    type: 'core.component', version: 1, category: 'ui', icon: 'window', label: L('UI component', 'Componente UI'), role: 'component',
    inputs: [], outputs: [],
    config: [
      { key: 'window', type: 'text', default: '', label: L('Window', 'Finestra') },
      { key: 'component', type: 'text', default: '', label: L('Component', 'Componente') },
    ],
  },

  // ---- Programma: gli argomenti della riga di comando (lilos logic run FILE ARGOMENTI…) e la chiusura
  {
    // Every argument as it came, and a first reading: -a, -abc, --name, --name=value, --no-name, «--»
    type: 'core.args', version: 1, category: 'program', icon: 'terminal', label: L('Arguments (argv)', 'Argomenti (argv)'),
    inputs: [{ name: 'send', type: 'pulse', label: L('send', 'invia'), hidden: true }],
    outputs: [
      { name: 'all', type: 'list', label: L('all', 'tutti') },
      { name: 'options', type: 'object', label: L('options', 'opzioni') },
      { name: 'positional', type: 'list', label: L('positional', 'posizionali') },
      { name: 'count', type: 'number', label: L('count', 'quanti'), hidden: true },
    ],
    config: [
      { key: 'flags', type: 'text', default: '', label: L('Options without a value (comma separated: v, verbose…)', 'Opzioni senza valore (separate da virgola: v, verbose…)') },
      { key: 'numbers', type: 'checkbox', default: true, label: L('Numbers as numbers', 'I numeri come numeri') },
    ],
    start(b) { if (!b.linked('send')) sendArgs(b); },
    run(inputs, b) { return readArgs(b); },
  },
  {
    // One option, read exactly: -o, -o VALUE, -oVALUE, --output VALUE, --output=VALUE, --no-output
    type: 'core.option', version: 1, category: 'program', icon: 'tag', label: L('Option (-x · --name)', 'Opzione (-x · --nome)'),
    inputs: [{ name: 'send', type: 'pulse', label: L('send', 'invia'), hidden: true }],
    outputs: [
      { name: 'value', type: 'any', label: L('value', 'valore') },
      { name: 'present', type: 'bool', label: L('given', 'data') },
    ],
    config: [
      { key: 'short', type: 'text', default: '', label: L('Short name (one letter: -o)', 'Nome corto (una lettera: -o)') },
      { key: 'long', type: 'text', default: 'output', label: L('Long name (--output)', 'Nome lungo (--output)') },
      { key: 'kind', type: 'select', default: 'value', options: OPTION_KINDS, label: L('Kind', 'Tipo') },
      { key: 'type', type: 'select', default: 'text', options: OPTION_TYPES, label: L('Value', 'Valore'), when: { kind: ['value', 'list'] } },
      { key: 'default', type: 'text', default: '', label: L('When it is not given', 'Quando non c\'è') },
      { key: 'required', type: 'checkbox', default: false, label: L('Required (an Exception when missing)', 'Obbligatoria (Exception se manca)') },
    ],
    start(b) { if (!b.linked('send')) sendOption(b); },
    run(inputs, b) { return readOption(b); },
  },
  {
    // exit(value) / return: closes the whole program; a whole number from 0 to 255 becomes the exit code of lilos logic run
    type: 'core.exit', version: 1, category: 'program', icon: 'power', label: L('Exit (close the program · return)', 'Exit (chiudi il programma · return)'),
    inputs: [
      { name: 'value', type: 'any', label: L('value', 'valore') },
      { name: 'close', type: 'pulse', label: L('close', 'chiudi'), hidden: true },
    ],
    outputs: [],
    config: [
      { key: 'kind', type: 'select', default: 'number', options: ['number', 'text', 'bool', 'json'], label: L('Kind', 'Tipo') },
      { key: 'value', type: 'text', default: '0', label: L('Value when none arrives', 'Valore se non ne arriva nessuno') },
    ],
    run(inputs, b) {
      // «chiudi» linked: a value only waits; else the value that arrives closes
      if (b.linked('close') && b.trigger !== 'close') return undefined;
      const v = inputs.value !== undefined && inputs.value !== null && b.linked('value') ? inputs.value : valueOf(b.config);
      b.exit(v);
      return undefined;
    },
  },

  // ---- Disegno: testi e forme sul foglio dello schema (role 'drawing'). Nessuna porta, il
  // motore non li esegue: il canvas (SDK LogicCanvas) li disegna sotto i collegamenti e i blocchi.
  {
    type: 'core.drawText', version: 1, category: 'draw', icon: 'text', label: L('Text · Comment (// note)', 'Testo · Commento (// nota)'), role: 'drawing',
    inputs: [], outputs: [],
    config: [
      { key: 'text', type: 'textarea', default: 'Testo', label: L('Text', 'Testo') },
      { key: 'size', type: 'number', default: 14, min: 8, max: 96, label: L('Size (px)', 'Dimensione (px)') },
      { key: 'color', type: 'color', default: '', label: L('Colour (empty: the theme\'s)', 'Colore (vuoto: quello del tema)') },
      { key: 'background', type: 'color', default: '', label: L('Background (empty: none)', 'Sfondo (vuoto: nessuno)') },
      { key: 'bold', type: 'checkbox', default: false, label: L('Bold', 'Grassetto') },
      { key: 'italic', type: 'checkbox', default: false, label: L('Italic', 'Corsivo') },
      { key: 'underline', type: 'checkbox', default: false, label: L('Underlined', 'Sottolineato') },
      { key: 'align', type: 'select', default: 'start', options: ALIGN, label: L('Alignment', 'Allineamento') },
      { key: 'w', type: 'number', default: 0, min: 0, max: 4000, label: L('Width (px, 0: as long as the text)', 'Larghezza (px, 0: quanto il testo)') },
    ],
  },
  {
    type: 'core.drawShape', version: 1, category: 'draw', icon: 'shapes', label: L('Shape', 'Forma'), role: 'drawing',
    inputs: [], outputs: [],
    config: [
      { key: 'shape', type: 'select', default: 'rect', options: SHAPES, label: L('Shape', 'Forma') },
      { key: 'w', type: 'number', default: 200, min: 4, max: 4000, label: L('Width (px)', 'Larghezza (px)') },
      { key: 'h', type: 'number', default: 120, min: 4, max: 4000, label: L('Height (px)', 'Altezza (px)') },
      { key: 'direction', type: 'select', default: 'horizontal', options: DIRECTIONS, label: L('Direction', 'Direzione'), when: { shape: 'line' } },
      { key: 'arrows', type: 'select', default: 'none', options: ARROWS, label: L('Arrows', 'Frecce'), when: { shape: 'line' } },
      { key: 'radius', type: 'number', default: 12, min: 0, max: 400, label: L('Corner radius (px)', 'Raggio degli angoli (px)'), when: { shape: 'rounded' } },
      { key: 'stroke', type: 'color', default: '', label: L('Line colour (empty: the theme\'s)', 'Colore della linea (vuoto: quello del tema)') },
      { key: 'strokeWidth', type: 'number', default: 2, min: 0, max: 40, label: L('Line width (px, 0: no line)', 'Spessore della linea (px, 0: senza linea)') },
      { key: 'dash', type: 'select', default: 'solid', options: DASHES, label: L('Line', 'Linea') },
      { key: 'fill', type: 'color', default: '', label: L('Fill (empty: none)', 'Riempimento (vuoto: nessuno)'), when: { shape: ['rect', 'rounded', 'ellipse', 'diamond', 'triangle'] } },
      { key: 'text', type: 'textarea', default: '', label: L('Text inside', 'Testo dentro') },
      { key: 'textSize', type: 'number', default: 13, min: 8, max: 96, label: L('Text size (px)', 'Dimensione del testo (px)') },
    ],
  },
];

function valueOf(config) {
  const v = config.value;
  switch (config.kind) {
    case 'number': return num(v);
    case 'bool': return bool(v);
    case 'json': return JSON.parse(text(v) || 'null');
    default: return text(v);
  }
}

/** An exception of the engine: { message, block?, type?, schema?, at? }. */
function isException(v) { return !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.message === 'string'; }

/** What arrives as an exception: the object itself, or a text / an Error made into one. */
function asException(v) {
  if (v === undefined || v === null) return null;
  if (isException(v)) return v;
  return { message: v instanceof Error ? v.message : text(v) };
}

/** A value arriving on «imposta», as the kind of the block (json: as it is). */
function castTo(kind, v) {
  switch (kind) {
    case 'number': { const n = num(v); if (Number.isNaN(n)) throw new Error('Non è un numero'); return n; }
    case 'bool': return bool(v);
    case 'text': return text(v);
    default: return v === undefined ? null : v;
  }
}

function startTicks(b) {
  const m = b.memory();
  if (m.timer) return;
  m.timer = b.setInterval(() => b.send('tick', PULSE), Math.max(50, b.config.seconds * 1000));
}

function stopTicks(b) {
  const m = b.memory();
  b.clearTimer(m.timer);
  m.timer = null;
}

// ---- The arguments of the program (b.args: the command line's), for Argomenti and Opzione

const isNegNum = s => /^-(\d|\.\d)/.test(s);
const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const BAD_KEY = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * A first reading of the arguments, as most programs do: --name=value, --name value (unless name
 * is in `flags` or the next one is an option), --no-name (false), -abc (a, b, c true; the last one
 * takes the next argument as its value unless it is in `flags`), -n5 and -n=5, «--» (all the rest
 * positional). An option given more than once becomes a list.
 */
function parseArgs(argv, flags, numbers) {
  const options = {}, positional = [];
  const conv = v => (numbers && typeof v === 'string' && NUMBER.test(v.trim()) ? Number(v) : v);
  const set = (k, v) => {
    if (!k || BAD_KEY.has(k)) return;
    options[k] = Object.hasOwn(options, k) ? [].concat(options[k], v) : v;
  };
  const takesNext = (name, i) => !flags.has(name) && i + 1 < argv.length && (!argv[i + 1].startsWith('-') || isNegNum(argv[i + 1]));
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { positional.push(...argv.slice(i + 1).map(conv)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 2) { set(a.slice(2, eq), conv(a.slice(eq + 1))); continue; }
      const name = a.slice(2);
      if (name.startsWith('no-') && name.length > 3) { set(name.slice(3), false); continue; }
      if (takesNext(name, i)) { set(name, conv(argv[i + 1])); i++; } else set(name, true);
      continue;
    }
    if (a.startsWith('-') && a.length > 1 && !isNegNum(a)) {
      const letters = [...a.slice(1)];
      for (let j = 0; j < letters.length; j++) {
        const c = letters[j], rest = letters.slice(j + 1).join('');
        if (rest.startsWith('=')) { set(c, conv(rest.slice(1))); break; }
        if (rest && /^-?\d/.test(rest) && !flags.has(c)) { set(c, conv(rest)); break; }
        if (j < letters.length - 1) { set(c, true); continue; }
        if (takesNext(c, i)) { set(c, conv(argv[i + 1])); i++; } else set(c, true);
      }
      continue;
    }
    positional.push(conv(a));
  }
  return { options, positional };
}

function readArgs(b) {
  const flags = new Set(String(b.config.flags ?? '').split(',').map(s => s.trim().replace(/^-+/, '')).filter(Boolean));
  const all = [...(b.args ?? [])];
  const { options, positional } = parseArgs(all, flags, b.config.numbers !== false);
  return { all, options, positional, count: all.length };
}

function sendArgs(b) {
  for (const [port, value] of Object.entries(readArgs(b))) b.send(port, value);
}

/** One option, read exactly as the block says (its names, whether it takes a value): { value, present }. */
function readOption(b) {
  const c = b.config;
  const short = String(c.short ?? '').trim().replace(/^-+/, '');
  const long = String(c.long ?? '').trim().replace(/^-+/, '');
  if (!short && !long) throw new Error('Dai all\'opzione un nome corto o un nome lungo');
  if ([...short].length > 1) throw new Error('Il nome corto è una lettera sola, come -o');
  const shown = long ? `--${long}` : `-${short}`;
  const kind = ['flag', 'value', 'list'].includes(c.kind) ? c.kind : 'value';
  const argv = b.args ?? [];
  const found = [];          // the values given (as texts)
  let present = false, flag = null;
  const valueAt = i => {
    if (i < argv.length && argv[i] !== '--') return argv[i];
    throw new Error(`L'opzione ${shown} vuole un valore`);
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') break;
    if (a.startsWith('--')) {
      if (!long) continue;
      const body = a.slice(2), eq = body.indexOf('=');
      const name = eq >= 0 ? body.slice(0, eq) : body;
      if (name === long) {
        present = true;
        if (kind === 'flag') flag = eq >= 0 ? bool(body.slice(eq + 1)) : true;
        else if (eq >= 0) found.push(body.slice(eq + 1));
        else found.push(valueAt(++i));
      } else if (kind === 'flag' && eq < 0 && name === `no-${long}`) {
        present = true;
        flag = false;
      }
      continue;
    }
    if (!short || !a.startsWith('-') || a.length < 2 || isNegNum(a)) continue;
    const letters = [...a.slice(1)];
    const k = letters.indexOf(short);
    if (k < 0) continue;
    present = true;
    if (kind === 'flag') { flag = true; continue; }
    const rest = letters.slice(k + 1).join('').replace(/^=/, '');
    if (rest) found.push(rest);
    else found.push(valueAt(++i));
  }
  if (c.required && !present) throw new Error(`Manca l'opzione obbligatoria ${shown}`);
  const fallback = String(c.default ?? '');
  if (kind === 'flag') return { value: flag ?? (fallback ? bool(fallback) : false), present };
  const cast = v => {
    if (c.type === 'number') { const n = num(v); if (Number.isNaN(n) || String(v).trim() === '') throw new Error(`${shown}: «${v}» non è un numero`); return n; }
    if (c.type === 'bool') return bool(v);
    return String(v);
  };
  if (kind === 'list') {
    const list = found.length ? found : fallback ? fallback.split(',').map(s => s.trim()).filter(Boolean) : [];
    return { value: list.map(cast), present };
  }
  if (found.length) return { value: cast(found.at(-1)), present };
  return { value: fallback ? cast(fallback) : null, present };
}

function sendOption(b) {
  const { value, present } = readOption(b);
  b.send('value', value);
  b.send('present', present);
}
