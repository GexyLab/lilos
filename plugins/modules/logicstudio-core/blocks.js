/**
 * The base blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import).
 *
 * A block: { type, version, category, icon, label{en,it}, inputs, outputs, config, grow?, role?,
 * execution?, start?, run?, step?, stop?, upgrade? }. Ports: { name, type, label?, hidden? }; types
 * are number, bool, text, object, list, any, pulse; `hidden: true` = not drawn until the user shows
 * it (the eye in Proprietà); b.linked(port) tells whether an input is used. Every block also has
 * the output «error».
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
  {
    type: 'core.convert', version: 1, category: 'value', icon: 'sync', label: L('Type cast', 'Cast (converti tipo)'),
    inputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    outputs: [{ name: 'result', type: 'any', label: L('result', 'risultato') }],
    config: [{ key: 'to', type: 'select', default: 'number', options: ['number', 'text', 'bool', 'json', 'parse'], label: L('To', 'In') }],
    run({ value }, b) {
      switch (b.config.to) {
        case 'number': { const n = num(value); if (Number.isNaN(n)) throw new Error('Non è un numero'); return { result: n }; }
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
