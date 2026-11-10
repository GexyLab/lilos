/**
 * The list and matrix blocks of Logic Studio, loaded by the engine in each user's worker (and read
 * in the kernel's main thread for the catalog: nothing here runs at import). Same format as
 * logicstudio-core/blocks.js. A list is a JSON array, a matrix an array of equal-length rows.
 * Blocks never change their input: they send a copy. Indexes start at 0, negative ones count from
 * the end. A block whose required inputs have not all arrived yet simply waits.
 */

const L = (en, it) => ({ en, it });
const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : Number(String(v ?? '').replace(',', '.')));
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const PULSE = true;
const MAX_ITEMS = 100000;
const MAX_DET = 10;

const RESULT = { name: 'result', type: 'list', label: L('result', 'risultato') };
const LIST_IN = { name: 'list', type: 'list', label: L('list', 'lista') };
const INDEX_IN = { name: 'index', type: 'number', label: L('index', 'indice') };
const VALUE_IN = { name: 'value', type: 'any', label: L('value', 'valore') };
const MATRIX_IN = { name: 'matrix', type: 'matrix', label: L('matrix', 'matrice') };
const FIELD = { key: 'field', type: 'text', default: '', label: L('Field (optional, e.g. a.b)', 'Campo (facoltativo, es. a.b)') };

function getPath(obj, path) {
  let cur = obj;
  for (const key of String(path ?? '').split('.').filter(Boolean)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = Array.isArray(cur) && /^\d+$/.test(key) ? cur[Number(key)] : cur[key];
  }
  return cur;
}

const missing = (inputs, ...names) => names.some(n => inputs[n] === undefined);

function asList(v) {
  if (!Array.isArray(v)) throw new Error('Serve una lista');
  return v;
}

/** The result must stay small enough. */
function bounded(arr) {
  if (arr.length > MAX_ITEMS) throw new Error(`Lista troppo grande (massimo ${MAX_ITEMS} elementi)`);
  return arr;
}

function int(v, what = 'Indice') {
  const n = num(v);
  if (!Number.isInteger(n)) throw new Error(`${what}: serve un numero intero`);
  return n;
}

/** An index in 0..len-1 (or 0..len when `end`), negative from the end. */
function indexIn(v, len, end = false) {
  const n = int(v);
  const i = n < 0 ? len + n : n;
  if (i < 0 || i > (end ? len : len - 1)) throw new Error('Indice fuori dalla lista');
  return i;
}

const same = (a, b) => a === b || (a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));

const asNumber = x => (typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' ? Number(x.replace(',', '.')) : NaN);

function compareValues(op, x, y) {
  if (op === 'contains') return Array.isArray(x) ? x.some(i => same(i, y)) : text(x).includes(text(y));
  const a = asNumber(x), c = asNumber(y);
  const [p, q] = Number.isFinite(a) && Number.isFinite(c) ? [a, c] : [text(x), text(y)];
  switch (op) {
    case 'ne': return !(typeof x === 'object' && typeof y === 'object' ? same(x, y) : p === q);
    case 'gt': return p > q;
    case 'ge': return p >= q;
    case 'lt': return p < q;
    case 'le': return p <= q;
    default: return typeof x === 'object' && typeof y === 'object' && x !== null ? same(x, y) : p === q;
  }
}

/** The numbers of a list (or of a field of its objects). */
function numbers(list, field) {
  return list.map(x => {
    const n = asNumber(field ? getPath(x, field) : x);
    if (!Number.isFinite(n)) throw new Error('Serve un numero in ogni elemento');
    return n;
  });
}

function unescapeSep(s) {
  return String(s ?? '').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
}

// ---- Matrices

function asMatrix(v, what = 'Serve una matrice') {
  if (!Array.isArray(v) || !v.length || !v.every(r => Array.isArray(r))) throw new Error(what);
  const cols = v[0].length;
  if (!cols || v.some(r => r.length !== cols)) throw new Error('Le righe della matrice devono avere tutte la stessa lunghezza');
  return v;
}

function numMatrix(v) {
  asMatrix(v);
  return v.map(r => r.map(x => {
    if (!isNum(x)) throw new Error('La matrice deve contenere solo numeri');
    return x;
  }));
}

const dims = m => [m.length, m[0].length];
const copyMatrix = m => m.map(r => r.slice());

function checkSize(rows, cols) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) throw new Error('Righe e colonne devono essere interi maggiori di zero');
  if (rows * cols > MAX_ITEMS) throw new Error(`Matrice troppo grande (massimo ${MAX_ITEMS} celle)`);
}

const tidy = x => Number(x.toPrecision(12));

function determinant(m) {
  const n = m.length;
  if (n !== m[0].length) throw new Error('La matrice deve essere quadrata');
  if (n > MAX_DET) throw new Error(`Determinante: al massimo ${MAX_DET}×${MAX_DET}`);
  const a = copyMatrix(m);
  let det = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (a[p][c] === 0) return 0;
    if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; det = -det; }
    det *= a[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return tidy(det);
}

const matrixOp = (type, label, icon, fn) => ({
  type, version: 1, category: 'matrix', icon, label,
  inputs: [{ name: 'a', type: 'matrix' }, { name: 'b', type: 'matrix' }],
  outputs: [{ name: 'result', type: 'matrix', label: L('result', 'risultato') }],
  run(inputs) {
    if (missing(inputs, 'a', 'b')) return undefined;
    const a = numMatrix(inputs.a), b = numMatrix(inputs.b);
    return { result: fn(a, b) };
  },
});

function sameSize(a, b) {
  const [ar, ac] = dims(a), [br, bc] = dims(b);
  if (ar !== br || ac !== bc) throw new Error(`Le matrici devono avere le stesse dimensioni (${ar}×${ac} e ${br}×${bc})`);
}

const listOne = (type, label, icon, run, extra = {}) => ({
  type, version: 1, category: 'list', icon, label,
  inputs: [LIST_IN], outputs: [RESULT], ...extra,
  run(inputs, b) {
    if (missing(inputs, 'list')) return undefined;
    return run(asList(inputs.list), inputs, b);
  },
});

export const blocks = [
  // ---- Lists
  {
    type: 'coll.length', version: 1, category: 'list', icon: 'hash', label: L('Length', 'Lunghezza'),
    inputs: [LIST_IN], outputs: [{ name: 'length', type: 'number', label: L('length', 'lunghezza') }],
    run(inputs) {
      if (missing(inputs, 'list')) return undefined;
      return { length: asList(inputs.list).length };
    },
  },
  {
    type: 'coll.get', version: 1, category: 'list', icon: 'list', label: L('Get item', 'Elemento'),
    inputs: [LIST_IN, INDEX_IN], outputs: [{ name: 'item', type: 'any', label: L('item', 'elemento') }],
    run(inputs) {
      if (missing(inputs, 'list', 'index')) return undefined;
      const list = asList(inputs.list);
      return { item: list[indexIn(inputs.index, list.length)] };
    },
  },
  {
    type: 'coll.set', version: 1, category: 'list', icon: 'list', label: L('Set item', 'Imposta elemento'),
    inputs: [LIST_IN, INDEX_IN, VALUE_IN], outputs: [RESULT],
    run(inputs) {
      if (missing(inputs, 'list', 'index', 'value')) return undefined;
      const list = asList(inputs.list).slice();
      list[indexIn(inputs.index, list.length)] = inputs.value;
      return { result: list };
    },
  },
  {
    type: 'coll.add', version: 1, category: 'list', icon: 'list', label: L('Add item', 'Aggiungi elemento'),
    inputs: [LIST_IN, VALUE_IN], outputs: [RESULT],
    config: [{ key: 'where', type: 'select', default: 'end', options: ['end', 'start'], label: L('Where', 'Dove') }],
    run(inputs, b) {
      if (missing(inputs, 'list', 'value')) return undefined;
      const list = asList(inputs.list);
      return { result: bounded(b.config.where === 'start' ? [inputs.value, ...list] : [...list, inputs.value]) };
    },
  },
  {
    type: 'coll.insert', version: 1, category: 'list', icon: 'list', label: L('Insert at', 'Inserisci in posizione'),
    inputs: [LIST_IN, INDEX_IN, VALUE_IN], outputs: [RESULT],
    run(inputs) {
      if (missing(inputs, 'list', 'index', 'value')) return undefined;
      const list = asList(inputs.list).slice();
      list.splice(indexIn(inputs.index, list.length, true), 0, inputs.value);
      return { result: bounded(list) };
    },
  },
  {
    type: 'coll.removeAt', version: 1, category: 'list', icon: 'list', label: L('Remove at', 'Rimuovi in posizione'),
    inputs: [LIST_IN, INDEX_IN],
    outputs: [RESULT, { name: 'removed', type: 'any', label: L('removed', 'rimosso') }],
    run(inputs) {
      if (missing(inputs, 'list', 'index')) return undefined;
      const list = asList(inputs.list).slice();
      const [removed] = list.splice(indexIn(inputs.index, list.length), 1);
      return { result: list, removed };
    },
  },
  {
    type: 'coll.slice', version: 1, category: 'list', icon: 'split', label: L('Slice', 'Porzione'),
    inputs: [LIST_IN, { name: 'from', type: 'number', label: L('from', 'da') }, { name: 'to', type: 'number', label: L('to (excluded)', 'a (escluso)') }],
    outputs: [RESULT],
    run(inputs) {
      if (missing(inputs, 'list')) return undefined;
      const list = asList(inputs.list);
      const from = inputs.from === undefined ? 0 : int(inputs.from, 'Da');
      const to = inputs.to === undefined ? list.length : int(inputs.to, 'A');
      return { result: list.slice(from, to) };
    },
  },
  {
    type: 'coll.concat', version: 1, category: 'list', icon: 'merge', label: L('Concatenate lists', 'Unisci liste'),
    inputs: [{ name: 'a', type: 'list' }, { name: 'b', type: 'list' }], outputs: [RESULT],
    grow: { inputs: { type: 'list', max: 16, name: 'letter' } },
    run(inputs, b) {
      const parts = [inputs.a, inputs.b, ...b.added.inputs.map(p => p.value)].filter(v => v !== undefined);
      if (!parts.length) return undefined;
      return { result: bounded(parts.flatMap(asList)) };
    },
  },
  {
    type: 'coll.contains', version: 1, category: 'list', icon: 'list', label: L('Contains · Index of', 'Contiene · Posizione'),
    inputs: [LIST_IN, VALUE_IN],
    outputs: [
      { name: 'found', type: 'bool', label: L('found', 'trovato') },
      { name: 'index', type: 'number', label: L('index (-1 if none)', 'posizione (-1 se manca)') },
    ],
    run(inputs) {
      if (missing(inputs, 'list', 'value')) return undefined;
      const index = asList(inputs.list).findIndex(x => same(x, inputs.value));
      return { found: index >= 0, index };
    },
  },
  listOne('coll.reverse', L('Reverse', 'Inverti'), 'sync', list => ({ result: list.slice().reverse() })),
  listOne('coll.sort', L('Sort', 'Ordina'), 'list', (list, inputs, b) => {
    const { order, kind, field } = b.config;
    const key = x => (field ? getPath(x, field) : x);
    const numeric = kind === 'number' || (kind !== 'text' && list.every(x => Number.isFinite(asNumber(key(x)))));
    if (numeric && list.some(x => !Number.isFinite(asNumber(key(x))))) throw new Error('Serve un numero in ogni elemento');
    const cmp = numeric ? (x, y) => asNumber(key(x)) - asNumber(key(y)) : (x, y) => text(key(x)).localeCompare(text(key(y)));
    const out = list.slice().sort(cmp);
    return { result: order === 'desc' ? out.reverse() : out };
  }, {
    config: [
      { key: 'order', type: 'select', default: 'asc', options: ['asc', 'desc'], label: L('Order', 'Ordine') },
      { key: 'kind', type: 'select', default: 'auto', options: ['auto', 'number', 'text'], label: L('Compare as', 'Confronta come') },
      FIELD,
    ],
  }),
  listOne('coll.unique', L('Unique', 'Unici'), 'list', (list, inputs, b) => {
    const seen = new Set();
    const result = list.filter(x => {
      const v = b.config.field ? getPath(x, b.config.field) : x;
      const k = `${typeof v}:${typeof v === 'object' ? JSON.stringify(v) : String(v)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return { result };
  }, { config: [FIELD] }),
  {
    type: 'coll.filter', version: 1, category: 'list', icon: 'list', label: L('Filter', 'Filtra'),
    inputs: [LIST_IN, { name: 'value', type: 'any', label: L('value (optional)', 'valore (facoltativo)') }],
    outputs: [RESULT, { name: 'rest', type: 'list', label: L('rejected', 'scartati') }],
    config: [
      { key: 'op', type: 'select', default: 'eq', options: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'contains'], label: L('Keep items that are', 'Tieni gli elementi') },
      { key: 'value', type: 'text', default: '', label: L('Value', 'Valore') },
      FIELD,
    ],
    run(inputs, b) {
      if (missing(inputs, 'list')) return undefined;
      const list = asList(inputs.list);
      const wanted = inputs.value !== undefined ? inputs.value : b.config.value;
      const result = [], rest = [];
      for (const x of list) (compareValues(b.config.op, b.config.field ? getPath(x, b.config.field) : x, wanted) ? result : rest).push(x);
      return { result, rest };
    },
  },
  listOne('coll.pluck', L('Map field', 'Estrai campo'), 'braces', (list, inputs, b) => {
    if (!b.config.field) throw new Error('Indica il campo da estrarre');
    return { result: list.map(x => getPath(x, b.config.field) ?? null) };
  }, { config: [{ ...FIELD, default: '', label: L('Field (e.g. a.b)', 'Campo (es. a.b)') }] }),
  {
    type: 'coll.stat', version: 1, category: 'list', icon: 'chart', label: L('Sum · Min · Max · Average', 'Somma · Minimo · Massimo · Media'),
    inputs: [LIST_IN], outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [{ key: 'op', type: 'select', default: 'sum', options: ['sum', 'min', 'max', 'avg'], label: L('Operation', 'Operazione') }, FIELD],
    run(inputs, b) {
      if (missing(inputs, 'list')) return undefined;
      const ns = numbers(asList(inputs.list), b.config.field);
      const op = b.config.op;
      if (op === 'sum') return { result: ns.reduce((s, n) => s + n, 0) };
      if (!ns.length) throw new Error('Lista vuota');
      if (op === 'min') return { result: ns.reduce((s, n) => Math.min(s, n)) };
      if (op === 'max') return { result: ns.reduce((s, n) => Math.max(s, n)) };
      return { result: ns.reduce((s, n) => s + n, 0) / ns.length };
    },
  },
  {
    type: 'coll.range', version: 1, category: 'list', icon: 'list', label: L('Range', 'Intervallo'),
    inputs: [
      { name: 'from', type: 'number', label: L('from', 'da') }, { name: 'to', type: 'number', label: L('to', 'a') },
      { name: 'step', type: 'number', label: L('step', 'passo') },
    ],
    outputs: [RESULT],
    config: [{ key: 'inclusive', type: 'checkbox', default: true, label: L('Include the last value', 'Includi l\'ultimo valore') }],
    run(inputs, b) {
      if (missing(inputs, 'to')) return undefined;
      const from = inputs.from === undefined ? 0 : num(inputs.from);
      const to = num(inputs.to);
      const step = inputs.step === undefined ? 1 : num(inputs.step);
      if (![from, to, step].every(Number.isFinite)) throw new Error('Serve un numero');
      if (step === 0) throw new Error('Il passo non può essere zero');
      const span = (to - from) / step;
      if (span < 0) return { result: [] };
      const whole = Math.round(span), exact = Math.abs(span - whole) < 1e-9;
      const count = exact ? whole + (b.config.inclusive ? 1 : 0) : Math.floor(span) + 1;
      if (count > MAX_ITEMS) throw new Error(`Lista troppo grande (massimo ${MAX_ITEMS} elementi)`);
      return { result: Array.from({ length: count }, (_, i) => tidy(from + i * step)) };
    },
  },
  {
    type: 'coll.split', version: 1, category: 'list', icon: 'text', label: L('Split text', 'Dividi testo'),
    inputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }], outputs: [RESULT],
    config: [
      { key: 'separator', type: 'text', default: ',', label: L('Separator (\\n = new line)', 'Separatore (\\n = a capo)') },
      { key: 'trim', type: 'checkbox', default: true, label: L('Trim spaces', 'Togli gli spazi ai lati') },
    ],
    run(inputs, b) {
      if (missing(inputs, 'text')) return undefined;
      let parts = text(inputs.text).split(unescapeSep(b.config.separator));
      if (b.config.trim) parts = parts.map(s => s.trim());
      return { result: bounded(parts) };
    },
  },
  {
    type: 'coll.join', version: 1, category: 'list', icon: 'text', label: L('Join into text', 'Unisci in testo'),
    inputs: [LIST_IN], outputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    config: [{ key: 'separator', type: 'text', default: ', ', label: L('Separator (\\n = new line)', 'Separatore (\\n = a capo)') }],
    run(inputs, b) {
      if (missing(inputs, 'list')) return undefined;
      return { text: asList(inputs.list).map(text).join(unescapeSep(b.config.separator)) };
    },
  },
  {
    type: 'coll.forEach', version: 1, category: 'list', icon: 'sync', label: L('For each', 'Per ogni elemento'),
    inputs: [LIST_IN, { name: 'start', type: 'pulse', label: L('start', 'avvia') }],
    outputs: [
      { name: 'item', type: 'any', label: L('item', 'elemento') },
      { name: 'index', type: 'number', label: L('index', 'indice') },
      { name: 'done', type: 'pulse', label: L('done', 'fatto') },
    ],
    run(inputs, b) {
      if (b.trigger !== 'start') return undefined;
      if (missing(inputs, 'list')) throw new Error('Manca la lista');
      const list = asList(inputs.list).slice();
      list.forEach((item, i) => { b.send('item', item); b.send('index', i); });
      return { done: PULSE };
    },
  },
  {
    type: 'coll.accumulate', version: 1, category: 'list', icon: 'list', label: L('Accumulate', 'Accumula'),
    inputs: [{ name: 'add', type: 'any', label: L('add', 'aggiungi') }, { name: 'clear', type: 'pulse', label: L('clear', 'svuota') }],
    outputs: [{ name: 'list', type: 'list', label: L('list', 'lista') }, { name: 'count', type: 'number', label: L('count', 'quanti') }],
    config: [{ key: 'max', type: 'number', default: 100, min: 1, max: MAX_ITEMS, label: L('Max length (oldest dropped)', 'Lunghezza massima (via i più vecchi)') }],
    run(inputs, b) {
      const m = b.memory();
      m.items ??= [];
      if (b.trigger === 'clear') m.items = [];
      else if (b.trigger === 'add') {
        m.items.push(inputs.add);
        const max = Math.min(MAX_ITEMS, Math.max(1, Math.trunc(Number(b.config.max)) || 100));
        if (m.items.length > max) m.items.splice(0, m.items.length - max);
      } else return undefined;
      return { list: m.items.slice(), count: m.items.length };
    },
  },
  {
    type: 'coll.random', version: 1, category: 'list', icon: 'list', label: L('Random item', 'Elemento a caso'),
    inputs: [LIST_IN, { name: 'pick', type: 'pulse', label: L('pick', 'estrai') }],
    outputs: [{ name: 'item', type: 'any', label: L('item', 'elemento') }, { name: 'index', type: 'number', label: L('index', 'indice') }],
    run(inputs) {
      if (missing(inputs, 'list')) return undefined;
      const list = asList(inputs.list);
      if (!list.length) throw new Error('Lista vuota');
      const index = Math.floor(Math.random() * list.length);
      return { item: list[index], index };
    },
  },

  // ---- Matrices
  {
    type: 'coll.matNew', version: 1, category: 'matrix', icon: 'grid', label: L('Create matrix', 'Crea matrice'),
    inputs: [{ name: 'rows', type: 'number', label: L('rows', 'righe') }, { name: 'cols', type: 'number', label: L('columns', 'colonne') }, { name: 'fill', type: 'any', label: L('fill', 'riempimento') }],
    outputs: [{ name: 'matrix', type: 'matrix', label: L('matrix', 'matrice') }],
    config: [{ key: 'fill', type: 'number', default: 0, label: L('Fill value', 'Valore di riempimento') }],
    run(inputs, b) {
      if (missing(inputs, 'rows', 'cols')) return undefined;
      const rows = int(inputs.rows, 'Righe'), cols = int(inputs.cols, 'Colonne');
      checkSize(rows, cols);
      const fill = inputs.fill !== undefined ? inputs.fill : Number(b.config.fill) || 0;
      return { matrix: Array.from({ length: rows }, () => new Array(cols).fill(fill)) };
    },
  },
  {
    type: 'coll.matSize', version: 1, category: 'matrix', icon: 'grid', label: L('Size', 'Dimensioni'),
    inputs: [MATRIX_IN],
    outputs: [{ name: 'rows', type: 'number', label: L('rows', 'righe') }, { name: 'cols', type: 'number', label: L('columns', 'colonne') }],
    run(inputs) {
      if (missing(inputs, 'matrix')) return undefined;
      const [rows, cols] = dims(asMatrix(inputs.matrix));
      return { rows, cols };
    },
  },
  {
    type: 'coll.matGet', version: 1, category: 'matrix', icon: 'grid', label: L('Get cell', 'Leggi cella'),
    inputs: [MATRIX_IN, { name: 'row', type: 'number', label: L('row', 'riga') }, { name: 'col', type: 'number', label: L('column', 'colonna') }],
    outputs: [{ name: 'value', type: 'any', label: L('value', 'valore') }],
    run(inputs) {
      if (missing(inputs, 'matrix', 'row', 'col')) return undefined;
      const m = asMatrix(inputs.matrix), [rows, cols] = dims(m);
      return { value: m[indexIn(inputs.row, rows)][indexIn(inputs.col, cols)] };
    },
  },
  {
    type: 'coll.matSet', version: 1, category: 'matrix', icon: 'grid', label: L('Set cell', 'Imposta cella'),
    inputs: [MATRIX_IN, { name: 'row', type: 'number', label: L('row', 'riga') }, { name: 'col', type: 'number', label: L('column', 'colonna') }, VALUE_IN],
    outputs: [{ name: 'matrix', type: 'matrix', label: L('matrix', 'matrice') }],
    run(inputs) {
      if (missing(inputs, 'matrix', 'row', 'col', 'value')) return undefined;
      const m = copyMatrix(asMatrix(inputs.matrix)), [rows, cols] = dims(m);
      m[indexIn(inputs.row, rows)][indexIn(inputs.col, cols)] = inputs.value;
      return { matrix: m };
    },
  },
  {
    type: 'coll.matRow', version: 1, category: 'matrix', icon: 'grid', label: L('Get row', 'Leggi riga'),
    inputs: [MATRIX_IN, { name: 'row', type: 'number', label: L('row', 'riga') }], outputs: [{ name: 'row', type: 'list', label: L('row', 'riga') }],
    run(inputs) {
      if (missing(inputs, 'matrix', 'row')) return undefined;
      const m = asMatrix(inputs.matrix);
      return { row: m[indexIn(inputs.row, m.length)].slice() };
    },
  },
  {
    type: 'coll.matCol', version: 1, category: 'matrix', icon: 'grid', label: L('Get column', 'Leggi colonna'),
    inputs: [MATRIX_IN, { name: 'col', type: 'number', label: L('column', 'colonna') }], outputs: [{ name: 'col', type: 'list', label: L('column', 'colonna') }],
    run(inputs) {
      if (missing(inputs, 'matrix', 'col')) return undefined;
      const m = asMatrix(inputs.matrix), c = indexIn(inputs.col, m[0].length);
      return { col: m.map(r => r[c]) };
    },
  },
  {
    type: 'coll.matTranspose', version: 1, category: 'matrix', icon: 'sync', label: L('Transpose', 'Trasposta'),
    inputs: [MATRIX_IN], outputs: [{ name: 'matrix', type: 'matrix', label: L('matrix', 'matrice') }],
    run(inputs) {
      if (missing(inputs, 'matrix')) return undefined;
      const m = asMatrix(inputs.matrix);
      return { matrix: m[0].map((_, c) => m.map(r => r[c])) };
    },
  },
  matrixOp('coll.matAdd', L('Add matrices', 'Somma matrici'), 'calculator', (a, b) => {
    sameSize(a, b);
    return a.map((r, i) => r.map((x, j) => x + b[i][j]));
  }),
  matrixOp('coll.matSubtract', L('Subtract matrices', 'Sottrai matrici'), 'calculator', (a, b) => {
    sameSize(a, b);
    return a.map((r, i) => r.map((x, j) => x - b[i][j]));
  }),
  matrixOp('coll.matMultiply', L('Multiply matrices', 'Moltiplica matrici'), 'calculator', (a, b) => {
    const [ar, ac] = dims(a), [br, bc] = dims(b);
    if (ac !== br) throw new Error(`Prodotto impossibile: le colonne di A (${ac}) devono essere quante le righe di B (${br})`);
    checkSize(ar, bc);
    return Array.from({ length: ar }, (_, i) => Array.from({ length: bc }, (_, j) => {
      let s = 0;
      for (let k = 0; k < ac; k++) s += a[i][k] * b[k][j];
      return s;
    }));
  }),
  {
    type: 'coll.matScale', version: 1, category: 'matrix', icon: 'calculator', label: L('Scale', 'Scala'),
    inputs: [MATRIX_IN, { name: 'factor', type: 'number', label: L('factor', 'fattore') }], outputs: [{ name: 'matrix', type: 'matrix', label: L('matrix', 'matrice') }],
    run(inputs) {
      if (missing(inputs, 'matrix', 'factor')) return undefined;
      const f = num(inputs.factor);
      if (!Number.isFinite(f)) throw new Error('Serve un numero');
      return { matrix: numMatrix(inputs.matrix).map(r => r.map(x => x * f)) };
    },
  },
  {
    type: 'coll.matIdentity', version: 1, category: 'matrix', icon: 'grid', label: L('Identity', 'Identità'),
    inputs: [{ name: 'n', type: 'number', label: L('size', 'dimensione') }], outputs: [{ name: 'matrix', type: 'matrix', label: L('matrix', 'matrice') }],
    run(inputs) {
      if (missing(inputs, 'n')) return undefined;
      const n = int(inputs.n, 'Dimensione');
      checkSize(n, n);
      return { matrix: Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))) };
    },
  },
  {
    type: 'coll.matDet', version: 1, category: 'matrix', icon: 'calculator', label: L('Determinant', 'Determinante'),
    inputs: [MATRIX_IN], outputs: [{ name: 'det', type: 'number', label: L('determinant', 'determinante') }],
    run(inputs) {
      if (missing(inputs, 'matrix')) return undefined;
      return { det: determinant(numMatrix(inputs.matrix)) };
    },
  },
  {
    type: 'coll.matFromList', version: 1, category: 'matrix', icon: 'grid', label: L('Matrix from list', 'Matrice da lista'),
    inputs: [LIST_IN, { name: 'cols', type: 'number', label: L('columns', 'colonne') }], outputs: [{ name: 'matrix', type: 'matrix', label: L('matrix', 'matrice') }],
    run(inputs) {
      if (missing(inputs, 'list', 'cols')) return undefined;
      const list = asList(inputs.list), cols = int(inputs.cols, 'Colonne');
      if (cols < 1) throw new Error('Righe e colonne devono essere interi maggiori di zero');
      if (!list.length || list.length % cols !== 0) throw new Error(`La lista (${list.length} elementi) non si divide in righe di ${cols}`);
      checkSize(list.length / cols, cols);
      return { matrix: Array.from({ length: list.length / cols }, (_, i) => list.slice(i * cols, (i + 1) * cols)) };
    },
  },
  {
    type: 'coll.matFlatten', version: 1, category: 'matrix', icon: 'list', label: L('Flatten', 'Appiattisci'),
    inputs: [MATRIX_IN], outputs: [RESULT],
    run(inputs) {
      if (missing(inputs, 'matrix')) return undefined;
      return { result: asMatrix(inputs.matrix).flat() };
    },
  },
];
