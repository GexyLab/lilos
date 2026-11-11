// Copy of modules/_shared/mathexpr.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
/**
 * Math expressions for the Logic Studio packages (logicstudio-functions, logicstudio-integrals):
 * a parser of our own (no eval, no libraries), compiled evaluation, symbolic derivatives with a
 * simplifier, a table of antiderivatives checked numerically, numeric integration, roots and
 * differential equations.
 *
 * Syntax: numbers with a dot (2.5, 1e-3); + − * / ^ (also ** · × ÷ − ² ³); implicit products
 * (3x, 2(x+1), x sin(x), (x+1)(x−1)); a function name followed by a factor without parentheses
 * (sin x = sin(x), sin x^2 = sin(x^2)); names are letters, digits, _ and a final ' (y' is a name);
 * pi (π) and e are constants. Angles are always radians here. log(x) = base 10, ln(x) = natural,
 * log(b, x) = base b.
 *
 * Tree: { t: 'num', v } | { t: 'sym', n } | { t: 'add', args } | { t: 'mul', args } |
 * { t: 'pow', a, b } | { t: 'fn', n, args }. Subtraction is add(a, mul(−1, b)); division is
 * mul(a, pow(b, −1)); negation is mul(−1, a).
 *
 * Errors are Error objects with Italian messages (the engine shows them on the Exception port).
 */

// ---------------------------------------------------------------- functions

const sec = x => 1 / Math.cos(x), csc = x => 1 / Math.sin(x), cot = x => 1 / Math.tan(x);

/** name → [min args, max args, evaluate] */
export const FUNCTIONS = {
  sin: [1, 1, Math.sin], cos: [1, 1, Math.cos], tan: [1, 1, Math.tan], cot: [1, 1, cot], sec: [1, 1, sec], csc: [1, 1, csc],
  asin: [1, 1, Math.asin], acos: [1, 1, Math.acos], atan: [1, 1, Math.atan],
  acot: [1, 1, x => Math.atan(1 / x)], asec: [1, 1, x => Math.acos(1 / x)], acsc: [1, 1, x => Math.asin(1 / x)],
  sinh: [1, 1, Math.sinh], cosh: [1, 1, Math.cosh], tanh: [1, 1, Math.tanh],
  coth: [1, 1, x => 1 / Math.tanh(x)], sech: [1, 1, x => 1 / Math.cosh(x)], csch: [1, 1, x => 1 / Math.sinh(x)],
  asinh: [1, 1, Math.asinh], acosh: [1, 1, Math.acosh], atanh: [1, 1, Math.atanh],
  exp: [1, 1, Math.exp], ln: [1, 1, Math.log], log: [1, 2, (a, b) => (b === undefined ? Math.log10(a) : Math.log(b) / Math.log(a))],
  log2: [1, 1, Math.log2], log10: [1, 1, Math.log10],
  sqrt: [1, 1, Math.sqrt], cbrt: [1, 1, Math.cbrt], root: [2, 2, (n, x) => (x < 0 && Math.abs(n % 2) === 1 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n))],
  abs: [1, 1, Math.abs], sign: [1, 1, Math.sign], floor: [1, 1, Math.floor], ceil: [1, 1, Math.ceil], round: [1, 1, Math.round],
  min: [1, 16, Math.min], max: [1, 16, Math.max], atan2: [2, 2, Math.atan2], pow: [2, 2, Math.pow], hypot: [1, 16, Math.hypot],
};

export const CONSTANTS = { pi: Math.PI, e: Math.E };

const num = v => ({ t: 'num', v });
const sym = n => ({ t: 'sym', n });
const fn = (n, ...args) => ({ t: 'fn', n, args });
const pow = (a, b) => ({ t: 'pow', a, b });
const add = (...args) => ({ t: 'add', args });
const mul = (...args) => ({ t: 'mul', args });
const neg = a => mul(num(-1), a);
const sub = (a, b) => add(a, neg(b));
const div = (a, b) => mul(a, pow(b, num(-1)));
const ZERO = num(0), ONE = num(1);

// ---------------------------------------------------------------- parser

const OPS = { '+': '+', '-': '-', '−': '-', '*': '*', '·': '*', '×': '*', '/': '/', '÷': '/', '^': '^', '(': '(', ')': ')', ',': ',' };

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new Error(`Espressione non valida al carattere ${i + 1}: numero scritto male`);
      out.push({ k: 'num', v: Number(m[0]), s: m[0], at: i });
      i += m[0].length;
      continue;
    }
    if (c === 'π') { out.push({ k: 'name', v: 'pi', at: i }); i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*'*/.exec(src.slice(i));
      out.push({ k: 'name', v: m[0], at: i });
      i += m[0].length;
      continue;
    }
    if (c === '*' && src[i + 1] === '*') { out.push({ k: 'op', v: '^', at: i }); i += 2; continue; }
    if (c === '²' || c === '³') { out.push({ k: 'op', v: '^', at: i }, { k: 'num', v: c === '²' ? 2 : 3, at: i }); i++; continue; }
    if (OPS[c]) { out.push({ k: 'op', v: OPS[c], at: i }); i++; continue; }
    throw new Error(`Espressione non valida al carattere ${i + 1}: «${c}» non è ammesso`);
  }
  return out;
}

/** The tree of an expression; throws «Espressione non valida al carattere N: …». */
export function parse(src) {
  const text = String(src ?? '').trim();
  if (!text) throw new Error('Espressione vuota');
  if (text.length > 2000) throw new Error('Espressione troppo lunga (al massimo 2000 caratteri)');
  const toks = tokenize(text);
  let p = 0;
  const peek = () => toks[p];
  const at = () => (toks[p] ? toks[p].at + 1 : text.length + 1);
  const fail = what => { throw new Error(`Espressione non valida al carattere ${at()}: ${what}`); };
  const isOp = v => peek()?.k === 'op' && peek().v === v;
  const eat = v => { if (!isOp(v)) fail(v === ')' ? 'manca una parentesi chiusa' : `serve «${v}»`); p++; };
  let depth = 0;

  function expr() {
    if (++depth > 200) fail('troppe parentesi annidate');
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v;
      const right = term();
      left = op === '+' ? add(left, right) : sub(left, right);
    }
    depth--;
    return left;
  }
  function term() {
    let left = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = toks[p++].v;
        const right = unary();
        left = op === '*' ? mul(left, right) : div(left, right);
      } else if (peek() && (peek().k === 'name' || isOp('('))) {
        left = mul(left, power());   // implicit product: 3x, 2(x+1), x sin x
      } else if (peek()?.k === 'num' && toks[p - 1] && (toks[p - 1].v === ')' || toks[p - 1].k === 'name')) {
        fail('manca un operatore prima del numero');
      } else return left;
    }
  }
  function unary() {
    if (isOp('-')) { p++; const a = unary(); return a.t === 'num' ? num(-a.v) : neg(a); }
    if (isOp('+')) { p++; return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (isOp('^')) { p++; return pow(base, unary()); }
    return base;
  }
  function primary() {
    const tk = peek();
    if (!tk) fail('l\'espressione finisce troppo presto');
    if (tk.k === 'num') { p++; return num(tk.v); }
    if (isOp('(')) { p++; const e = expr(); eat(')'); return e; }
    if (tk.k === 'name') {
      p++;
      const name = tk.v;
      const f = FUNCTIONS[name];
      if (f) {
        let args;
        if (isOp('(')) {
          p++;
          if (isOp(')')) fail(`${name} vuole un argomento`);
          args = [expr()];
          while (isOp(',')) { p++; args.push(expr()); }
          eat(')');
        } else {
          if (!peek() || peek().k === 'op' && !['(', '-'].includes(peek().v)) fail(`${name} vuole un argomento`);
          args = [isOp('-') ? unary() : power()];
        }
        if (args.length < f[0] || args.length > f[1]) {
          throw new Error(`Espressione non valida: ${name} vuole ${f[0] === f[1] ? f[0] : `da ${f[0]} a ${f[1]}`} argomenti, ne ha ${args.length}`);
        }
        return normalizeFn(name, args);
      }
      if (name in CONSTANTS) return sym(name);
      if (isOp('(')) fail(`«${name}» non è una funzione conosciuta`);
      return sym(name);
    }
    fail(tk.v === ')' ? 'parentesi chiusa in più' : `«${tk.s ?? tk.v}» fuori posto`);
  }

  const tree = expr();
  if (p < toks.length) fail(toks[p].v === ')' ? 'parentesi chiusa in più' : `«${toks[p].s ?? toks[p].v}» fuori posto`);
  return tree;
}

/** Functions written another way: pow → ^, root → ^(1/n), log(b, x) → ln(x)/ln(b), exp(x) stays. */
function normalizeFn(name, args) {
  if (name === 'pow') return pow(args[0], args[1]);
  if (name === 'log' && args.length === 2) return div(fn('ln', args[1]), fn('ln', args[0]));
  if (name === 'log' && args.length === 1) return fn('log10', args[0]);
  return fn(name, ...args);
}

// ---------------------------------------------------------------- inspection

/** The names used in a tree that are not constants: Set. */
export function symbols(node, out = new Set()) {
  if (node.t === 'sym') { if (!(node.n in CONSTANTS)) out.add(node.n); }
  else if (node.t === 'pow') { symbols(node.a, out); symbols(node.b, out); }
  else if (node.args) for (const a of node.args) symbols(a, out);
  return out;
}

export const has = (node, name) => symbols(node).has(name);

/** Replaces names with trees or numbers: { name: tree | number }. */
export function substitute(node, values) {
  switch (node.t) {
    case 'num': return node;
    case 'sym': {
      if (!(node.n in values) || node.n in CONSTANTS) return node;
      const v = values[node.n];
      return typeof v === 'number' ? num(v) : v;
    }
    case 'pow': return pow(substitute(node.a, values), substitute(node.b, values));
    default: return { ...node, args: node.args.map(a => substitute(a, values)) };
  }
}

// ---------------------------------------------------------------- evaluation

/**
 * A function of the variables `vars` (names, in order): (...values) → number. Names not in `vars`
 * must be given in `params`; else «Parametro senza valore: a».
 */
export function compile(node, vars = ['x'], params = {}) {
  const index = new Map(vars.map((v, i) => [v, i]));
  const missing = [...symbols(node)].filter(n => !index.has(n) && typeof params[n] !== 'number');
  if (missing.length) throw new Error(`${missing.length === 1 ? 'Parametro senza valore' : 'Parametri senza valore'}: ${missing.join(', ')}`);
  const build = n => {
    switch (n.t) {
      case 'num': { const v = n.v; return () => v; }
      case 'sym': {
        if (n.n in CONSTANTS) { const v = CONSTANTS[n.n]; return () => v; }
        if (index.has(n.n)) { const i = index.get(n.n); return s => s[i]; }
        const v = params[n.n];
        return () => v;
      }
      case 'add': { const fs = n.args.map(build); return s => { let r = 0; for (const f of fs) r += f(s); return r; }; }
      case 'mul': { const fs = n.args.map(build); return s => { let r = 1; for (const f of fs) r *= f(s); return r; }; }
      case 'pow': {
        const a = build(n.a), b = build(n.b);
        // a negative base with an odd root (x^(1/3)) stays real
        const odd = n.b.t === 'mul' || n.b.t === 'num' ? oddRoot(n.b) : null;
        if (odd === 'odd') return s => { const x = a(s); return x < 0 ? -Math.pow(-x, b(s)) : Math.pow(x, b(s)); };
        if (odd === 'even') return s => Math.pow(Math.abs(a(s)), b(s));
        return s => Math.pow(a(s), b(s));
      }
      case 'fn': {
        const f = FUNCTIONS[n.n][2];
        const fs = n.args.map(build);
        if (fs.length === 1) { const [g] = fs; return s => f(g(s)); }
        return s => f(...fs.map(g => g(s)));
      }
      default: throw new Error('Espressione non valida');
    }
  };
  const run = build(node);
  return (...values) => run(values);
}

/** p/q with q odd (1/3, 2/3, 1/5…): x^(1/3) of a negative x is real; 'odd' | 'even' (p) | null. */
function oddRoot(b) {
  const v = constValue(b);
  if (v === null || Number.isInteger(v)) return null;
  for (const q of [3, 5, 7, 9]) {
    const p = v * q;
    if (Math.abs(p - Math.round(p)) < 1e-12) return Math.round(p) % 2 === 0 ? 'even' : 'odd';
  }
  return null;
}

/** The value of a tree with no names (constants allowed), else null. */
export function constValue(node) {
  if (symbols(node).size) return null;
  try { return compile(node, [])(); } catch { return null; }
}

// ---------------------------------------------------------------- printing

const fmt = v => {
  if (Number.isInteger(v)) return String(v);
  const s = String(Number(v.toPrecision(12)));
  return s.includes('e') ? s.replace('e+', 'e') : s;
};

/** p/q for a number that is a simple fraction (q ≤ 64), else null: 0.5 → [1, 2]. */
const frac = v => {
  if (Number.isInteger(v) || !Number.isFinite(v)) return null;
  for (let q = 2; q <= 64; q++) { const p = v * q; if (Math.abs(p - Math.round(p)) < 1e-9 * q) return [Math.round(p), q]; }
  return null;
};
/** A number as text, fractions as p/q; `atom`: in parentheses when it is not a plain number. */
const numText = (v, atom = false) => {
  const f = frac(v);
  if (f) return atom ? `(${f[0]}/${f[1]})` : `${f[0]}/${f[1]}`;
  return atom && v < 0 ? `(${fmt(v)})` : fmt(v);
};

/** Text of a tree, readable and parseable again: 3x^2 - 2sin(x) + 1, x^3/3. */
export function print(node) {
  return printAdd(node);
}

function printAdd(node) {
  if (node.t !== 'add') return printMul(node);
  let out = '';
  node.args.forEach((term, i) => {
    const [neg, rest] = splitSign(term);
    const s = printMul(rest);
    out += i === 0 ? (neg ? `-${s}` : s) : neg ? ` - ${s}` : ` + ${s}`;
  });
  return out;
}

/** A term with a negative coefficient → [true, the term without the sign]. */
function splitSign(term) {
  if (term.t === 'num' && term.v < 0) return [true, num(-term.v)];
  if (term.t === 'mul' && term.args[0].t === 'num' && term.args[0].v < 0) {
    const c = -term.args[0].v;
    const rest = c === 1 ? term.args.slice(1) : [num(c), ...term.args.slice(1)];
    return [true, rest.length === 1 ? rest[0] : mul(...rest)];
  }
  return [false, term];
}

function printMul(node) {
  if (node.t === 'pow' && node.b.t === 'num' && node.b.v < 0) return printMul(mul(node));
  if (node.t !== 'mul') {
    const [neg, rest] = splitSign(node);
    if (neg) return `-${printMul(rest)}`;
    return printPow(node);
  }
  const top = [], bottom = [];
  let coeff = 1;
  for (const f of node.args) {
    if (f.t === 'num') coeff *= f.v;
    else if (f.t === 'pow' && f.a.t === 'num' && f.b.t === 'num' && Number.isFinite(f.a.v ** f.b.v) && (Number.isInteger(f.b.v) || f.a.v > 0 && frac(f.a.v ** f.b.v))) coeff *= f.a.v ** f.b.v;   // x/0.5 = 2x
    else if (f.t === 'pow' && f.b.t === 'num' && f.b.v < 0) bottom.push(f.b.v === -1 ? f.a : pow(f.a, num(-f.b.v)));
    else top.push(f);
  }
  const factors = list => list.map(f => (f.t === 'add' || f.t === 'mul' ? `(${print(f)})` : printPow(f)));
  // a fractional coefficient: its numerator in front, its denominator below (x^3/3, -cos(3x)/3)
  const fr = frac(coeff);
  const [cTop, cBottom] = fr ? fr : [coeff, 1];
  const join = (lead, list) => list.reduce((acc, f, i) => {
    // 3x, 2sin(x), 2(x+1); between names a *: x*y
    const glue = i === 0 && acc && acc !== '-' ? (/^[A-Za-z(]/.test(f) ? '' : '*') : i > 0 ? '*' : '';
    return acc + glue + f;
  }, lead);
  const tops = factors(top);
  const lead = cTop === -1 && tops.length ? '-' : cTop !== 1 || !tops.length ? fmt(cTop) : '';
  const s = join(lead, tops);
  if (!bottom.length && cBottom === 1) return s;
  const parts = factors(bottom);
  const den = join(cBottom !== 1 ? String(cBottom) : '', parts);
  const simple = parts.length + (cBottom !== 1 ? 1 : 0) === 1;   // a sum or product is already in parentheses
  return `${s === '-' ? '-1' : s || '1'}/${simple ? den : `(${den})`}`;
}

function printPow(node) {
  switch (node.t) {
    case 'num': return numText(node.v, node.v < 0);
    case 'sym': return node.n;
    case 'fn': return `${node.n}(${node.args.map(print).join(', ')})`;
    case 'pow': {
      if (node.b.t === 'num' && node.b.v === 0.5) return `sqrt(${print(node.a)})`;
      const base = node.a.t === 'num' ? numText(node.a.v, true) : ['sym', 'fn'].includes(node.a.t) ? printPow(node.a) : `(${print(node.a)})`;
      const exp = node.b.t === 'num' ? numText(node.b.v, true) : node.b.t === 'sym' || node.b.t === 'fn' ? printPow(node.b) : `(${print(node.b)})`;
      return `${base}^${exp}`;
    }
    default: return `(${print(node)})`;
  }
}

// ---------------------------------------------------------------- simplifying

const key = node => print(node);
const isNum = (node, v) => node.t === 'num' && (v === undefined || node.v === v);
const intLike = v => Number.isInteger(v) && Math.abs(v) < 1e15;

/** Exact-looking folds only: sin(0) = 0, sqrt(4) = 2, but ln(2) stays ln(2). */
function foldFn(name, args) {
  if (!args.every(a => a.t === 'num')) return null;
  const v = FUNCTIONS[name][2](...args.map(a => a.v));
  return Number.isFinite(v) && intLike(v) ? num(v) : null;
}

/** Degree of a term in its names, to order a sum: x^3 before x^2 before x before numbers. */
function degree(node) {
  switch (node.t) {
    case 'sym': return node.n in CONSTANTS ? 0 : 1;
    case 'pow': return node.b.t === 'num' ? node.b.v * degree(node.a) : 0.5;
    case 'mul': return node.args.reduce((s, a) => s + degree(a), 0);
    case 'fn': return 0.5;
    case 'num': return 0;
    default: return 0;
  }
}

/** A simpler equal tree: numbers folded, like terms and like factors gathered. */
export function simplify(node) {
  let cur = node, prev = '';
  for (let i = 0; i < 8; i++) {
    cur = simp(cur);
    const k = key(cur);
    if (k === prev) break;
    prev = k;
  }
  return cur;
}

function simp(node) {
  switch (node.t) {
    case 'num': case 'sym': return node;
    case 'fn': {
      const args = node.args.map(simp);
      const folded = foldFn(node.n, args);
      if (folded) return folded;
      if (node.n === 'exp') return pow(sym('e'), args[0]);
      if (node.n === 'sqrt') return simp(pow(args[0], num(0.5)));
      if (node.n === 'ln' && args[0].t === 'sym' && args[0].n === 'e') return ONE;
      if (node.n === 'ln' && args[0].t === 'pow' && args[0].a.t === 'sym' && args[0].a.n === 'e') return args[0].b;
      return fn(node.n, ...args);
    }
    case 'pow': {
      const a = simp(node.a), b = simp(node.b);
      if (isNum(b, 0)) return ONE;
      if (isNum(b, 1)) return a;
      if (isNum(a, 1)) return ONE;
      if (isNum(a, 0) && b.t === 'num' && b.v > 0) return ZERO;
      if (a.t === 'num' && b.t === 'num') {
        const v = Math.pow(a.v, b.v);
        if (Number.isFinite(v) && v !== 0 && (intLike(v) || Number.isInteger(b.v) && Math.abs(b.v) < 64)) return num(v);
      }
      // (a^m)^n = a^(m·n) with n an integer
      if (a.t === 'pow' && b.t === 'num' && Number.isInteger(b.v)) return pow(a.a, simp(mul(a.b, b)));
      // (2x)^2 = 4x^2 with an integer exponent
      if (a.t === 'mul' && b.t === 'num' && Number.isInteger(b.v)) return simp(mul(...a.args.map(f => pow(f, b))));
      // e^(ln u) = u
      if (a.t === 'sym' && a.n === 'e' && b.t === 'fn' && b.n === 'ln') return b.args[0];
      return pow(a, b);
    }
    case 'mul': {
      const flat = [];
      for (const f of node.args.map(simp)) { if (f.t === 'mul') flat.push(...f.args); else flat.push(f); }
      let c = 1;
      const groups = new Map();   // base key → { base, exps: [] }
      for (const f of flat) {
        if (f.t === 'num') { c *= f.v; continue; }
        const [base, exp] = f.t === 'pow' ? [f.a, f.b] : [f, ONE];
        const k = key(base);
        if (!groups.has(k)) groups.set(k, { base, exps: [] });
        groups.get(k).exps.push(exp);
      }
      if (c === 0) return ZERO;
      const factors = [];
      for (const { base, exps } of groups.values()) {
        const e = exps.length === 1 ? exps[0] : simp(add(...exps));
        if (isNum(e, 0)) continue;
        const f = isNum(e, 1) ? base : simp(pow(base, e));
        if (f.t === 'num') c *= f.v; else if (f.t === 'mul') { for (const g of f.args) { if (g.t === 'num') c *= g.v; else factors.push(g); } } else factors.push(f);
      }
      if (c === 0) return ZERO;
      factors.sort((x, y) => order(x) - order(y));
      if (c !== 1) factors.unshift(num(c));
      if (!factors.length) return ONE;
      if (factors.length === 1) return factors[0];
      // c·(a + b) with a number c: spread over the sum, so like terms meet
      if (factors.length === 2 && factors[0].t === 'num' && factors[1].t === 'add') return simp(add(...factors[1].args.map(t => mul(factors[0], t))));
      return mul(...factors);
    }
    case 'add': {
      const flat = [];
      for (const t of node.args.map(simp)) { if (t.t === 'add') flat.push(...t.args); else flat.push(t); }
      let c = 0;
      const terms = new Map();   // rest key → { rest, coeff }
      for (const t of flat) {
        if (t.t === 'num') { c += t.v; continue; }
        let coeff = 1, rest = t;
        if (t.t === 'mul' && t.args[0].t === 'num') {
          coeff = t.args[0].v;
          rest = t.args.length === 2 ? t.args[1] : mul(...t.args.slice(1));
        }
        const k = key(rest);
        if (!terms.has(k)) terms.set(k, { rest, coeff: 0 });
        terms.get(k).coeff += coeff;
      }
      const out = [];
      for (const { rest, coeff } of terms.values()) {
        const cf = Math.abs(coeff) < 1e-14 ? 0 : Number(coeff.toPrecision(15));
        if (cf === 0) continue;
        out.push(cf === 1 ? rest : simp(mul(num(cf), rest)));
      }
      out.sort((x, y) => degree(y) - degree(x));
      const cc = Math.abs(c) < 1e-14 ? 0 : Number(c.toPrecision(15));
      if (cc !== 0) out.push(num(cc));
      if (!out.length) return ZERO;
      return out.length === 1 ? out[0] : add(...out);
    }
    default: return node;
  }
}

const order = f => (f.t === 'sym' ? (f.n in CONSTANTS ? 0 : 1) : f.t === 'pow' ? (f.a.t === 'sym' ? 2 : 4) : f.t === 'fn' ? 3 : 5);

// ---------------------------------------------------------------- derivatives

/** d(node)/d(v), simplified. Throws for functions without a derivative (min, max, round…). */
export function derive(node, v = 'x') {
  return simplify(d(node, v));
}

function d(node, v) {
  if (!has(node, v)) return ZERO;
  switch (node.t) {
    case 'sym': return node.n === v ? ONE : ZERO;
    case 'add': return add(...node.args.map(a => d(a, v)));
    case 'mul': {
      // product rule over n factors
      const terms = node.args.map((f, i) => (has(f, v) ? mul(...node.args.map((g, j) => (i === j ? d(g, v) : g))) : null)).filter(Boolean);
      return add(...terms);
    }
    case 'pow': {
      const { a, b } = node;
      if (!has(b, v)) return mul(b, pow(a, add(b, num(-1))), d(a, v));
      if (!has(a, v)) return mul(node, fn('ln', a), d(b, v));
      // u^w = e^(w ln u)
      return mul(node, add(mul(d(b, v), fn('ln', a)), mul(b, d(a, v), pow(a, num(-1)))));
    }
    case 'fn': {
      const u = node.args[0];
      const du = node.args.length === 1 ? d(u, v) : null;
      const sq = x => pow(x, num(2));
      const chain = outer => mul(outer, du);
      switch (node.n) {
        case 'sin': return chain(fn('cos', u));
        case 'cos': return chain(neg(fn('sin', u)));
        case 'tan': return chain(pow(fn('cos', u), num(-2)));
        case 'cot': return chain(neg(pow(fn('sin', u), num(-2))));
        case 'sec': return chain(mul(fn('sec', u), fn('tan', u)));
        case 'csc': return chain(neg(mul(fn('csc', u), fn('cot', u))));
        case 'asin': return chain(pow(sub(ONE, sq(u)), num(-0.5)));
        case 'acos': return chain(neg(pow(sub(ONE, sq(u)), num(-0.5))));
        case 'atan': return chain(pow(add(ONE, sq(u)), num(-1)));
        case 'acot': return chain(neg(pow(add(ONE, sq(u)), num(-1))));
        case 'asec': return chain(pow(mul(fn('abs', u), pow(sub(sq(u), ONE), num(0.5))), num(-1)));
        case 'acsc': return chain(neg(pow(mul(fn('abs', u), pow(sub(sq(u), ONE), num(0.5))), num(-1))));
        case 'sinh': return chain(fn('cosh', u));
        case 'cosh': return chain(fn('sinh', u));
        case 'tanh': return chain(pow(fn('cosh', u), num(-2)));
        case 'coth': return chain(neg(pow(fn('sinh', u), num(-2))));
        case 'sech': return chain(neg(mul(fn('sech', u), fn('tanh', u))));
        case 'csch': return chain(neg(mul(fn('csch', u), fn('coth', u))));
        case 'asinh': return chain(pow(add(sq(u), ONE), num(-0.5)));
        case 'acosh': return chain(pow(sub(sq(u), ONE), num(-0.5)));
        case 'atanh': return chain(pow(sub(ONE, sq(u)), num(-1)));
        case 'exp': return chain(node);
        case 'ln': return chain(pow(u, num(-1)));
        case 'log10': return chain(pow(mul(u, fn('ln', num(10))), num(-1)));
        case 'log2': return chain(pow(mul(u, fn('ln', num(2))), num(-1)));
        case 'sqrt': return chain(mul(num(0.5), pow(u, num(-0.5))));
        case 'cbrt': return chain(mul(num(1 / 3), pow(fn('cbrt', u), num(-2))));
        case 'abs': return chain(fn('sign', u));
        case 'sign': case 'floor': case 'ceil': case 'round': return ZERO;
        case 'root': {
          const [n, x] = node.args;
          if (has(n, v)) break;
          return d(pow(x, pow(n, num(-1))), v);
        }
        case 'atan2': {
          const [y, x] = node.args;
          return mul(sub(mul(x, d(y, v)), mul(y, d(x, v))), pow(add(sq(x), sq(y)), num(-1)));
        }
        case 'hypot': return d(pow(add(...node.args.map(sq)), num(0.5)), v);
        default: break;
      }
      throw new Error(`Derivata simbolica non disponibile per ${node.n}()`);
    }
    default: return ZERO;
  }
}

// ---------------------------------------------------------------- polynomials

/** Coefficients [c0, c1, c2…] of a polynomial in v with number coefficients, else null. */
export function polyCoeffs(node, v = 'x', maxDegree = 20) {
  const plus = (p, q) => Array.from({ length: Math.max(p.length, q.length) }, (_, i) => (p[i] ?? 0) + (q[i] ?? 0));
  const times = (p, q) => {
    if (p.length + q.length - 2 > maxDegree) return null;
    const r = new Array(p.length + q.length - 1).fill(0);
    p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; }));
    return r;
  };
  const go = n => {
    if (!has(n, v)) { const c = constValue(n); return c === null || !Number.isFinite(c) ? null : [c]; }
    switch (n.t) {
      case 'sym': return n.n === v ? [0, 1] : null;
      case 'add': { let r = [0]; for (const a of n.args) { const q = go(a); if (!q) return null; r = plus(r, q); } return r; }
      case 'mul': { let r = [1]; for (const a of n.args) { const q = go(a); if (!q) return null; r = times(r, q); if (!r) return null; } return r; }
      case 'pow': {
        if (n.b.t !== 'num' || !Number.isInteger(n.b.v) || n.b.v < 0 || n.b.v > maxDegree) return null;
        const base = go(n.a);
        if (!base) return null;
        let r = [1];
        for (let i = 0; i < n.b.v; i++) { r = times(r, base); if (!r) return null; }
        return r;
      }
      default: return null;
    }
  };
  const r = go(node);
  if (!r) return null;
  while (r.length > 1 && Math.abs(r[r.length - 1]) < 1e-15) r.pop();
  return r;
}

/** A polynomial's tree from coefficients [c0, c1…]. */
export function polyTree(coeffs, v = 'x') {
  const terms = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    if (!c) continue;
    terms.push(i === 0 ? num(c) : mul(num(c), i === 1 ? sym(v) : pow(sym(v), num(i))));
  }
  return simplify(terms.length ? add(...terms) : ZERO);
}

/** All roots (complex) of [c0, c1, …, cn]: [{ re, im }], by Aberth–Ehrlich, polished. */
export function polyRoots(coeffs) {
  const c = [...coeffs];
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-300) c.pop();
  const n = c.length - 1;
  if (n < 1) return [];
  const clean = z => ({ re: Math.abs(z.re) < 1e-13 ? 0 : tidy(z.re), im: Math.abs(z.im) < 1e-10 * Math.max(1, Math.abs(z.re)) ? 0 : tidy(z.im) });
  if (n === 1) return [clean({ re: -c[0] / c[1], im: 0 })];
  if (n === 2) return quadRoots(c[2], c[1], c[0]).map(clean);
  const a = c.map(x => x / c[n]);   // monic
  const cx = {
    add: (p, q) => ({ re: p.re + q.re, im: p.im + q.im }), sub: (p, q) => ({ re: p.re - q.re, im: p.im - q.im }),
    mul: (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re }),
    div: (p, q) => { const dd = q.re * q.re + q.im * q.im; return { re: (p.re * q.re + p.im * q.im) / dd, im: (p.im * q.re - p.re * q.im) / dd }; },
  };
  const evalP = z => { let p = { re: 1, im: 0 }, dp = { re: 0, im: 0 }; for (let i = n - 1; i >= 0; i--) { dp = cx.add(cx.mul(dp, z), p); p = cx.add(cx.mul(p, z), { re: a[i], im: 0 }); } return [p, dp]; };
  const radius = 1 + Math.max(...a.slice(0, n).map(Math.abs));
  let z = Array.from({ length: n }, (_, k) => ({ re: radius * 0.5 * Math.cos(2 * Math.PI * k / n + 0.4), im: radius * 0.5 * Math.sin(2 * Math.PI * k / n + 0.4) }));
  for (let it = 0; it < 500; it++) {
    let moved = 0;
    z = z.map((zk, k) => {
      const [p, dp] = evalP(zk);
      if (p.re === 0 && p.im === 0) return zk;
      const ratio = cx.div(p, dp);
      let sum = { re: 0, im: 0 };
      z.forEach((zj, j) => { if (j !== k) sum = cx.add(sum, cx.div({ re: 1, im: 0 }, cx.sub(zk, zj))); });
      const w = cx.div(ratio, cx.sub({ re: 1, im: 0 }, cx.mul(ratio, sum)));
      moved = Math.max(moved, Math.hypot(w.re, w.im) / Math.max(1, Math.hypot(zk.re, zk.im)));
      return cx.sub(zk, w);
    });
    if (moved < 1e-15) break;
  }
  return z.map(clean).sort((p, q) => p.re - q.re || p.im - q.im);
}

function quadRoots(a, b, c) {
  const disc = b * b - 4 * a * c;
  if (disc >= 0) {
    // stable form: no cancellation
    const q = -0.5 * (b + Math.sign(b || 1) * Math.sqrt(disc));
    const r1 = q / a, r2 = q !== 0 ? c / q : -b / (2 * a);
    return [{ re: Math.min(r1, r2), im: 0 }, { re: Math.max(r1, r2), im: 0 }];
  }
  const re = -b / (2 * a), im = Math.sqrt(-disc) / (2 * Math.abs(a));
  return [{ re, im: -im }, { re, im }];
}

export const tidy = x => (Number.isFinite(x) ? Number(x.toPrecision(14)) : x);

// ---------------------------------------------------------------- antiderivatives

/**
 * An antiderivative of node in v (no constant), simplified, or throws «Primitiva non trovata in
 * forma chiusa». Every result is checked: its derivative must equal node at sample points.
 */
export function integrate(node, v = 'x') {
  const f = simplify(node);
  const F = prim(f, v);
  if (!F) throw new Error('Primitiva non trovata in forma chiusa: usa l\'integrale definito numerico');
  const out = simplify(F);
  if (!sameFunction(derive(out, v), f, v)) throw new Error('Primitiva non trovata in forma chiusa: usa l\'integrale definito numerico');
  return out;
}

/** Whether two trees in v are the same function (numbers compared at sample points). */
export function sameFunction(p, q, v = 'x') {
  const others = [...new Set([...symbols(p), ...symbols(q)])].filter(n => n !== v);
  const vars = [v, ...others];
  let fp, fq;
  try { fp = compile(p, vars); fq = compile(q, vars); } catch { return false; }
  let checked = 0;
  for (const x of [0.37, 0.71, 1.13, 1.57, 2.31, -0.43, -1.29, 3.7]) {
    const rest = others.map((_, i) => 0.6 + 0.37 * i);
    const a = fp(x, ...rest), b = fq(x, ...rest);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(a), Math.abs(b))) return false;
    checked++;
  }
  return checked >= 3;
}

/** [a, b] when node is a·v + b with numbers a ≠ 0 and b, else null. */
function linear(node, v) {
  const c = polyCoeffs(node, v, 1);
  return c && c.length === 2 && c[1] !== 0 ? [c[1], c[0]] : null;
}

function prim(f, v) {
  if (!has(f, v)) return mul(f, sym(v));
  const pc = polyCoeffs(f, v, 40);
  if (pc) return polyTree([0, ...pc.map((c, i) => c / (i + 1))], v);
  switch (f.t) {
    case 'sym': return mul(num(0.5), pow(f, num(2)));
    case 'add': {
      const parts = f.args.map(t => prim(t, v));
      return parts.every(Boolean) ? add(...parts) : null;
    }
    case 'mul': {
      const consts = f.args.filter(a => !has(a, v));
      const rest = f.args.filter(a => has(a, v));
      if (consts.length) {
        const r = prim(rest.length === 1 ? rest[0] : mul(...rest), v);
        return r ? mul(...consts, r) : null;
      }
      return primProduct(f, v);
    }
    case 'pow': return primPow(f, v) ?? bySubstitution(f, v);
    case 'fn': return primFn(f, v) ?? bySubstitution(f, v);
    default: return null;
  }
}

/** ∫ g(a·v + b) for the functions of the table. */
function primFn(f, v) {
  if (f.args.length !== 1) return null;
  const u = f.args[0];
  const lin = linear(u, v);
  if (!lin) return null;
  const k = num(1 / lin[0]);
  const ln = x => fn('ln', x), abs = x => fn('abs', x);
  const table = {
    sin: () => neg(fn('cos', u)),
    cos: () => fn('sin', u),
    tan: () => neg(ln(abs(fn('cos', u)))),
    cot: () => ln(abs(fn('sin', u))),
    sec: () => ln(abs(add(fn('sec', u), fn('tan', u)))),
    csc: () => neg(ln(abs(add(fn('csc', u), fn('cot', u))))),
    sinh: () => fn('cosh', u),
    cosh: () => fn('sinh', u),
    tanh: () => ln(fn('cosh', u)),
    exp: () => fn('exp', u),
    ln: () => sub(mul(u, ln(u)), u),
    log10: () => div(sub(mul(u, ln(u)), u), ln(num(10))),
    log2: () => div(sub(mul(u, ln(u)), u), ln(num(2))),
    sqrt: () => mul(num(2 / 3), pow(u, num(1.5))),
    cbrt: () => mul(num(0.75), pow(u, num(4 / 3))),
    asin: () => add(mul(u, fn('asin', u)), pow(sub(ONE, pow(u, num(2))), num(0.5))),
    acos: () => sub(mul(u, fn('acos', u)), pow(sub(ONE, pow(u, num(2))), num(0.5))),
    atan: () => sub(mul(u, fn('atan', u)), mul(num(0.5), ln(add(ONE, pow(u, num(2)))))),
    abs: () => mul(num(0.5), u, abs(u)),
  };
  const g = table[f.n];
  return g ? mul(k, g()) : null;
}

/** ∫ base^exp: powers of a linear base, exponentials, quadratics under 1/… and 1/sqrt(…). */
function primPow(f, v) {
  const { a, b } = f;
  if (!has(b, v)) {
    const n = constValue(b);
    const lin = linear(a, v);
    if (lin && n !== null) {
      const k = num(1 / lin[0]);
      if (Math.abs(n + 1) < 1e-15) return mul(k, fn('ln', fn('abs', a)));
      return mul(k, num(1 / (n + 1)), pow(a, num(n + 1)));
    }
    // sin², cos², sec², csc² of a linear argument
    if (a.t === 'fn' && a.args.length === 1 && n !== null) {
      const u = a.args[0], l = linear(u, v);
      if (l) {
        const k = num(1 / l[0]);
        if (n === 2 && a.n === 'sin') return mul(k, sub(mul(num(0.5), u), mul(num(0.25), fn('sin', mul(num(2), u)))));
        if (n === 2 && a.n === 'cos') return mul(k, add(mul(num(0.5), u), mul(num(0.25), fn('sin', mul(num(2), u)))));
        if (n === 2 && a.n === 'sec' || n === -2 && a.n === 'cos') return mul(k, fn('tan', u));
        if (n === 2 && a.n === 'csc' || n === -2 && a.n === 'sin') return mul(k, neg(fn('cot', u)));
        if (n === 2 && a.n === 'tan') return mul(k, sub(fn('tan', u), u));
      }
    }
    // 1/(p v² + q v + r) and 1/sqrt(r − p v²), 1/sqrt(v² + c)
    const c = polyCoeffs(a, v, 2);
    if (c && c.length === 3 && n !== null) {
      const [r, q, p] = c;
      // complete the square: p (v + h)² + m, with t = v + h
      const h = q / (2 * p), m = r - q * q / (4 * p);
      const t = h === 0 ? sym(v) : add(sym(v), num(h));
      if (n === -1) {
        if (Math.abs(m) < 1e-15) return mul(num(-1 / p), pow(t, num(-1)));
        if (p * m > 0) { const s = Math.sqrt(m / p); return mul(num(1 / (p * s)), fn('atan', mul(num(1 / s), t))); }
        const s = Math.sqrt(-m / p);   // p (t − s)(t + s)
        return mul(num(1 / (2 * p * s)), fn('ln', fn('abs', mul(sub(t, num(s)), pow(add(t, num(s)), num(-1))))));
      }
      if (n === -0.5) {
        if (p < 0 && m > 0) { const s = Math.sqrt(-m / p); return mul(num(1 / Math.sqrt(-p)), fn('asin', mul(num(1 / s), t))); }
        if (p > 0) return mul(num(1 / Math.sqrt(p)), fn('ln', fn('abs', add(t, pow(add(pow(t, num(2)), num(m / p)), num(0.5))))));
      }
    }
    return null;
  }
  // c^(a v + b)
  if (!has(a, v)) {
    const lin = linear(b, v);
    if (!lin) return null;
    return mul(f, pow(mul(num(lin[0]), fn('ln', a)), num(-1)));
  }
  return null;
}

/**
 * Products: v^n·g(linear) with g = e^, sin, cos, sinh, cosh (by parts, tabular); v^n·ln(v);
 * else a substitution u'·h(u).
 */
function primProduct(f, v) {
  const factors = f.args;
  if (factors.length === 2) {
    for (const [P, G] of [[factors[0], factors[1]], [factors[1], factors[0]]]) {
      const pc = polyCoeffs(P, v, 8);
      if (!pc) continue;
      const g = growthKind(G, v);
      if (g) {
        // ∫ P·G = Σ (−1)^k P^(k) G_(k+1)
        const terms = [];
        let dP = P;
        for (let k = 0; k <= pc.length; k++) {
          if (isNum(simplify(dP), 0)) break;
          terms.push(mul(num(k % 2 ? -1 : 1), dP, g(k + 1)));
          dP = derive(dP, v);
        }
        return add(...terms);
      }
      // v^n·ln(v)
      if (G.t === 'fn' && G.n === 'ln' && G.args[0].t === 'sym' && G.args[0].n === v && pc.length) {
        const mono = pc.map((c, i) => [c, i]).filter(([c]) => c !== 0);
        return add(...mono.map(([c, i]) => mul(num(c / (i + 1)), pow(sym(v), num(i + 1)), sub(fn('ln', sym(v)), num(1 / (i + 1))))));
      }
    }
    // ln(v)/v and v^n·ln(v) with a negative n
    const lnF = factors.find(x => x.t === 'fn' && x.n === 'ln' && x.args[0].t === 'sym' && x.args[0].n === v);
    const pw = factors.find(x => x !== lnF && x.t === 'pow' && x.a.t === 'sym' && x.a.n === v && x.b.t === 'num');
    if (lnF && pw) {
      const n = pw.b.v;
      if (n === -1) return mul(num(0.5), pow(lnF, num(2)));
      return mul(num(1 / (n + 1)), pow(sym(v), num(n + 1)), sub(lnF, num(1 / (n + 1))));
    }
  }
  return bySubstitution(f, v);
}

/** For G(a v + b) of the families e^, sin, cos, sinh, cosh: k → the k-th antiderivative. */
function growthKind(G, v) {
  if (G.t === 'pow' && !has(G.a, v)) {
    const lin = linear(G.b, v);
    if (!lin) return null;
    const lnA = G.a.t === 'sym' && G.a.n === 'e' ? 1 : constValue(fn('ln', G.a));
    if (!lnA) return null;
    return k => mul(num(1 / (lin[0] * lnA) ** k), G);
  }
  if (G.t === 'fn' && ['sin', 'cos', 'sinh', 'cosh', 'exp'].includes(G.n)) {
    const u = G.args[0], lin = linear(u, v);
    if (!lin) return null;
    const a = lin[0];
    if (G.n === 'exp') return k => mul(num(1 / a ** k), G);
    if (G.n === 'sinh' || G.n === 'cosh') return k => mul(num(1 / a ** k), fn(k % 2 ? (G.n === 'sinh' ? 'cosh' : 'sinh') : G.n, u));
    // sin → −cos → −sin → cos → sin
    const cycle = G.n === 'sin' ? [['sin', 1], ['cos', -1], ['sin', -1], ['cos', 1]] : [['cos', 1], ['sin', 1], ['cos', -1], ['sin', -1]];
    return k => { const [name, s] = cycle[k % 4]; return mul(num(s / a ** k), fn(name, u)); };
  }
  return null;
}

/**
 * ∫ c·u'·h(u): for each factor h(u) whose inside u is not linear, the other factors divided by u'
 * must be a number c (checked at sample points). h: u^n, 1/u, e^u, sin, cos, sec², 1/(1+u²),
 * 1/sqrt(1−u²).
 */
function bySubstitution(f, v) {
  const factors = f.t === 'mul' ? f.args : [f];
  for (let i = 0; i < factors.length; i++) {
    const h = factors[i];
    const others = factors.filter((_, j) => j !== i);
    const rest = others.length ? mul(...others) : ONE;
    // c·u·u' = c·u²/2 (sin·cos, ln(x)/x…)
    if (others.length && !linear(h, v)) {
      const c = constantRatio(rest, derive(h, v), v);
      if (c !== null) return mul(num(c / 2), pow(h, num(2)));
    }
    const inner = innerOf(h, v);
    if (!inner) continue;
    for (const u of inner) {
      if (linear(u, v)) continue;
      const du = derive(u, v);
      if (isNum(du, 0)) continue;
      const c = constantRatio(rest, du, v);
      if (c === null) continue;
      const H = prim(replaceInner(h, u), '\u0000u');
      if (!H) continue;
      return mul(num(c), substitute(H, { '\u0000u': u }));
    }
  }
  return null;
}

/** The inside of a factor that could be a substitution: [u]. */
function innerOf(h, v) {
  if (h.t === 'pow' && has(h.a, v) && !has(h.b, v)) return [h.a];
  if (h.t === 'pow' && !has(h.a, v)) return [h.b];
  if (h.t === 'fn' && h.args.length === 1) return [h.args[0]];
  if (h.t === 'pow' && h.a.t === 'fn' && h.a.args.length === 1) return [h.a.args[0]];
  return null;
}

/** h with u replaced by the fresh name \u0000u (u found by its printed text). */
function replaceInner(h, u) {
  const k = key(u);
  const go = n => {
    if (key(n) === k) return sym('\u0000u');
    if (n.t === 'pow') return pow(go(n.a), go(n.b));
    if (n.args) return { ...n, args: n.args.map(go) };
    return n;
  };
  return go(h);
}

/** p/q when it is the same number at sample points, else null. */
function constantRatio(p, q, v) {
  let fp, fq;
  try { fp = compile(p, [v]); fq = compile(q, [v]); } catch { return null; }
  let ratio = null, seen = 0;
  for (const x of [0.31, 0.77, 1.21, 1.9, 2.6, 0.13]) {
    const a = fp(x), b = fq(x);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) continue;
    const r = a / b;
    if (ratio === null) ratio = r;
    else if (Math.abs(r - ratio) > 1e-9 * Math.max(1, Math.abs(ratio))) return null;
    seen++;
  }
  return seen >= 3 ? tidy(ratio) : null;
}

// ---------------------------------------------------------------- numeric integration

/** Counts evaluations; past `max` it throws, so a schema cannot hang the worker. */
export function budget(max = 100_000) {
  let used = 0;
  return {
    wrap: f => x => { if (++used > max) throw new Error(`Troppe valutazioni della funzione (più di ${max})`); return f(x); },
    get used() { return used; },
  };
}

const GK = {
  // Gauss–Kronrod 7–15 nodes and weights on [−1, 1]
  x: [0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394, 0.586087235467691, 0.405845151377397, 0.207784955007898, 0],
  wk: [0.022935322010529, 0.063092092629979, 0.104790010322250, 0.140653259715525, 0.169004726639267, 0.190350578064785, 0.204432940075298, 0.209482141084728],
  wg: [0.129484966168870, 0.279705391489277, 0.381830050505119, 0.417959183673469],
};

function gk15(f, a, b) {
  const c = (a + b) / 2, h = (b - a) / 2;
  const fc = f(c);
  let k = fc * GK.wk[7], g = fc * GK.wg[3];
  for (let i = 0; i < 7; i++) {
    const dx = h * GK.x[i];
    const s = f(c - dx) + f(c + dx);
    k += GK.wk[i] * s;
    if (i % 2 === 1) g += GK.wg[(i - 1) / 2] * s;
  }
  return { value: k * h, error: Math.abs((k - g) * h) };
}

/** Maps an infinite interval onto a finite one: [f, a, b] to integrate instead. */
function finite(f, a, b) {
  if (Number.isFinite(a) && Number.isFinite(b)) return [f, a, b, 1];
  if (a === -Infinity && b === Infinity) return [t => { const x = t / (1 - t * t); return f(x) * (1 + t * t) / (1 - t * t) ** 2; }, -1, 1, 1];
  if (b === Infinity) return [t => f(a + t / (1 - t)) / (1 - t) ** 2, 0, 1, 1];
  if (a === -Infinity) return [t => f(b - (1 - t) / t) / (t * t), 0, 1, 1];
  throw new Error('Estremi non validi');
}

/**
 * ∫_a^b f numerically: { value, error, evaluations }. method: gk (adaptive Gauss–Kronrod 7–15),
 * simpson (adaptive), romberg, trapezoid, midpoint (with `n` intervals). Infinite ends: gk only.
 */
export function integrateNumeric(f0, a, b, { method = 'gk', tol = 1e-10, n = 1000, max = 100_000 } = {}) {
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Gli estremi devono essere numeri');
  if (a === b) return { value: 0, error: 0, evaluations: 0 };
  if (a > b) { const r = integrateNumeric(f0, b, a, { method, tol, n, max }); return { ...r, value: -r.value }; }
  const bud = budget(max);
  // a value that is not finite right at an end (0·∞ of sqrt(1 − x²)·1/sqrt(1 − x²)) is taken a hair inside
  const near = Number.isFinite(a) && Number.isFinite(b) ? 1e-9 * (b - a) : 0;
  const check = x => {
    let y = f0(x);
    if (!Number.isFinite(y) && near) {
      if (x - a < near) y = f0(Math.min(a + near, (a + b) / 2));
      else if (b - x < near) y = f0(Math.max(b - near, (a + b) / 2));
    }
    if (!Number.isFinite(y)) throw new Error(`La funzione non ha un valore finito in x = ${tidy(x)}`);
    return y;
  };
  let f = bud.wrap(check);
  if ((!Number.isFinite(a) || !Number.isFinite(b)) && method !== 'gk') throw new Error('Con estremi infiniti usa il metodo Gauss-Kronrod');
  const [g, lo, hi] = finite(f, a, b);
  f = g;
  let value, error;
  if (method === 'gk') {
    // adaptive: split the interval with the largest error until the total is below tol
    const parts = [{ a: lo, b: hi, ...gk15(f, lo, hi) }];
    for (let i = 0; i < 2000; i++) {
      const total = parts.reduce((s, p) => s + p.error, 0);
      const val = Math.abs(parts.reduce((s, p) => s + p.value, 0));
      if (total <= Math.max(tol, tol * val)) break;
      parts.sort((p, q) => q.error - p.error);
      const w = parts.shift();
      const m = (w.a + w.b) / 2;
      parts.push({ a: w.a, b: m, ...gk15(f, w.a, m) }, { a: m, b: w.b, ...gk15(f, m, w.b) });
    }
    value = parts.reduce((s, p) => s + p.value, 0);
    error = parts.reduce((s, p) => s + p.error, 0);
  } else if (method === 'simpson') {
    const simpson = (a1, b1, fa, fm, fb) => (b1 - a1) / 6 * (fa + 4 * fm + fb);
    const rec = (a1, b1, fa, fm, fb, whole, eps, depth) => {
      const m = (a1 + b1) / 2, lm = (a1 + m) / 2, rm = (m + b1) / 2;
      const flm = f(lm), frm = f(rm);
      const left = simpson(a1, m, fa, flm, fm), right = simpson(m, b1, fm, frm, fb);
      const diff = left + right - whole;
      if (depth <= 0 || Math.abs(diff) <= 15 * eps) { error += Math.abs(diff) / 15; return left + right + diff / 15; }
      return rec(a1, m, fa, flm, fm, left, eps / 2, depth - 1) + rec(m, b1, fm, frm, fb, right, eps / 2, depth - 1);
    };
    error = 0;
    const fa = f(lo), fb = f(hi), fm = f((lo + hi) / 2);
    value = rec(lo, hi, fa, fm, fb, simpson(lo, hi, fa, fm, fb), tol, 40);
  } else if (method === 'romberg') {
    const R = [[(hi - lo) / 2 * (f(lo) + f(hi))]];
    for (let i = 1; i < 20; i++) {
      const h = (hi - lo) / 2 ** i;
      let s = 0;
      for (let k = 1; k <= 2 ** (i - 1); k++) s += f(lo + (2 * k - 1) * h);
      R[i] = [R[i - 1][0] / 2 + h * s];
      for (let j = 1; j <= i; j++) R[i][j] = R[i][j - 1] + (R[i][j - 1] - R[i - 1][j - 1]) / (4 ** j - 1);
      error = Math.abs(R[i][i] - R[i - 1][i - 1]);
      value = R[i][i];
      if (i > 4 && error <= Math.max(tol, tol * Math.abs(value))) break;
    }
  } else {
    const N = Math.max(1, Math.min(Math.round(n), max - 1));
    const h = (hi - lo) / N;
    let s = 0;
    if (method === 'trapezoid') { s = (f(lo) + f(hi)) / 2; for (let i = 1; i < N; i++) s += f(lo + i * h); }
    else for (let i = 0; i < N; i++) s += f(lo + (i + 0.5) * h);
    value = s * h;
    error = null;
  }
  return { value: tidy(value), error: error === null ? null : Number(error.toPrecision(3)), evaluations: bud.used };
}

// ---------------------------------------------------------------- roots

/** A root of f in [a, b] where f changes sign (Brent): { root, iterations }. */
export function brent(f, a, b, tol = 1e-13, maxIter = 200) {
  let fa = f(a), fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) throw new Error('La funzione non ha un valore finito agli estremi dell\'intervallo');
  if (fa === 0) return { root: a, iterations: 0 };
  if (fb === 0) return { root: b, iterations: 0 };
  if (fa * fb > 0) throw new Error('f(a) e f(b) hanno lo stesso segno: nessuna radice garantita nell\'intervallo');
  let c = a, fc = fa, d = b - a, e = d;
  for (let i = 1; i <= maxIter; i++) {
    if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol1 = 2 * Number.EPSILON * Math.abs(b) + tol / 2;
    const m = (c - b) / 2;
    if (Math.abs(m) <= tol1 || fb === 0) return { root: b, iterations: i };
    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p, q;
      if (a === c) { p = 2 * m * s; q = 1 - s; }
      else { const qq = fa / fc, r = fb / fc; p = s * (2 * m * qq * (qq - r) - (b - a) * (r - 1)); q = (qq - 1) * (r - 1) * (s - 1); }
      if (p > 0) q = -q; else p = -p;
      if (2 * p < Math.min(3 * m * q - Math.abs(tol1 * q), Math.abs(e * q))) { e = d; d = p / q; } else { d = m; e = d; }
    } else { d = m; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol1 ? d : (m > 0 ? tol1 : -tol1);
    fb = f(b);
  }
  throw new Error(`La radice non converge in ${maxIter} iterazioni`);
}

/** Newton from x0 with the derivative df: { root, iterations }. */
export function newton(f, df, x0, tol = 1e-13, maxIter = 100) {
  let x = x0;
  for (let i = 1; i <= maxIter; i++) {
    const y = f(x), dy = df(x);
    if (!Number.isFinite(y) || !Number.isFinite(dy)) throw new Error(`La funzione non ha un valore finito in x = ${tidy(x)}`);
    if (y === 0) return { root: x, iterations: i };
    if (dy === 0) throw new Error(`Derivata nulla in x = ${tidy(x)}: Newton non può continuare`);
    const next = x - y / dy;
    if (Math.abs(next - x) <= tol * Math.max(1, Math.abs(next))) return { root: next, iterations: i };
    x = next;
  }
  throw new Error(`Newton non converge in ${maxIter} iterazioni: prova un altro punto di partenza o un intervallo`);
}

/** Numeric derivative of order 1–4 by central differences with Richardson extrapolation. */
export function numericDerivative(f, x, order = 1) {
  const coeffs = { 1: [[-1, 1], [-0.5, 0.5]], 2: [[-1, 0, 1], [1, -2, 1]], 3: [[-2, -1, 1, 2], [-0.5, 1, -1, 0.5]], 4: [[-2, -1, 0, 1, 2], [1, -4, 6, -4, 1]] }[order];
  if (!coeffs) throw new Error('Ordine della derivata numerica: da 1 a 4');
  const [steps, w] = coeffs;
  const D = h => steps.reduce((s, k, i) => s + w[i] * f(x + k * h), 0) / h ** order;
  const h = Math.max(Math.abs(x), 1) * [1e-3, 1e-2, 2e-2, 5e-2][order - 1];
  // Richardson: D(h) and D(h/2), error ∝ h²
  const a = D(h), b = D(h / 2);
  const r = (4 * b - a) / 3;
  if (!Number.isFinite(r)) throw new Error(`La funzione non ha un valore finito vicino a x = ${tidy(x)}`);
  return r;
}

// ---------------------------------------------------------------- differential equations

/**
 * Solves y' = F(x, Y) (Y a vector) from x0 to x1: { x, y (vector), points: [{ x, y }] }.
 * method: euler | rk4 (fixed `steps`) | rk45 (Dormand–Prince, adaptive with `tol`).
 */
export function solveOde(F, x0, y0, x1, { method = 'rk45', steps = 1000, tol = 1e-8, maxPoints = 10_000 } = {}) {
  const dim = y0.length;
  const axpy = (y, k, h) => y.map((v, i) => v + h * k[i]);
  const points = [{ x: x0, y: [...y0] }];
  const push = (x, y) => { if (points.length < maxPoints) points.push({ x, y: [...y] }); };
  const finiteOr = (y, x) => { if (y.some(v => !Number.isFinite(v))) throw new Error(`La soluzione non è più finita in x = ${tidy(x)}`); return y; };
  if (x1 === x0) return { x: x0, y: [...y0], points };
  let x = x0, y = [...y0];
  if (method !== 'rk45') {
    const n = Math.max(1, Math.min(Math.round(steps), 1_000_000));
    const h = (x1 - x0) / n;
    const every = Math.ceil(n / (maxPoints - 1));
    for (let i = 1; i <= n; i++) {
      if (method === 'euler') y = axpy(y, F(x, y), h);
      else {
        const k1 = F(x, y), k2 = F(x + h / 2, axpy(y, k1, h / 2)), k3 = F(x + h / 2, axpy(y, k2, h / 2)), k4 = F(x + h, axpy(y, k3, h));
        y = y.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      }
      x = x0 + i * h;
      finiteOr(y, x);
      if (i % every === 0 || i === n) push(x, y);
    }
    return { x, y, points };
  }
  // Dormand–Prince 5(4)
  const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
  const A = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9], [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729], [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656], [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]];
  const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
  const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];
  const dir = Math.sign(x1 - x0);
  let h = (x1 - x0) / 100;
  for (let iter = 0; iter < 200_000; iter++) {
    if (dir * (x + h - x1) > 0) h = x1 - x;
    const k = [];
    for (let s = 0; s < 7; s++) {
      let ys = y;
      for (let j = 0; j < s; j++) ys = axpy(ys, k[j], h * A[s][j]);
      k.push(F(x + C[s] * h, ys));
    }
    const y5 = y.map((v, i) => v + h * B5.reduce((acc, b, s) => acc + b * k[s][i], 0));
    const y4 = y.map((v, i) => v + h * B4.reduce((acc, b, s) => acc + b * k[s][i], 0));
    let err = 0;
    for (let i = 0; i < dim; i++) err = Math.max(err, Math.abs(y5[i] - y4[i]) / (tol + tol * Math.max(Math.abs(y[i]), Math.abs(y5[i]))));
    if (!Number.isFinite(err)) throw new Error(`La soluzione non è più finita in x = ${tidy(x)}`);
    if (err <= 1) {
      x += h; y = y5;
      push(x, y);
      if (dir * (x - x1) >= 0) return { x: x1, y, points };
    }
    const factor = err === 0 ? 5 : Math.min(5, Math.max(0.2, 0.9 * err ** -0.2));
    h *= factor;
    if (Math.abs(h) < 1e-14 * Math.max(1, Math.abs(x))) throw new Error(`Passo troppo piccolo in x = ${tidy(x)}: l'equazione è rigida o la soluzione esplode`);
  }
  throw new Error('Troppi passi: allarga la tolleranza');
}
