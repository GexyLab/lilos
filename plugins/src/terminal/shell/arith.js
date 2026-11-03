import { ShellError } from './signals.js';
import { i18n } from '../i18n.js';

/**
 * Integer arithmetic of `$((…))`, `((…))`, `let` and array subscripts: 64-bit signed integers
 * (BigInt wrapped like bash), C operators with their precedence, assignments to variables.
 * `vars` gives { get(name, index) → string, set(name, index, string) }.
 */
const OPS = ['**=', '<<=', '>>=', '**', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=',
  '+', '-', '*', '/', '%', '<', '>', '=', '!', '~', '&', '^', '|', '?', ':', '(', ')', ','];
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|=', '**=']);
const BINARY = [
  ['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '<=', '>', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%'],
];
const wrap = v => BigInt.asIntN(64, v);
const MAX_DEPTH = 32;

export function evaluate(text, vars, depth = 0) {
  if (depth > MAX_DEPTH) throw new ShellError(i18n.t('arith.tooDeep'));
  const tokens = tokenize(String(text));
  if (!tokens.length) return 0n;
  const p = { tokens, i: 0, text };
  const ast = parseComma(p);
  if (p.i < tokens.length) throw syntax(p);
  return run(ast, vars, depth);
}

const syntax = p => new ShellError(i18n.t('arith.syntax', { expr: String(p.text).trim(), token: p.tokens[p.i]?.v ?? i18n.t('arith.end') }));

function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    let m;
    const rest = s.slice(i);
    if ((m = /^(?:0[xX][0-9a-fA-F]+|\d+#[0-9a-zA-Z@_]+|\d+)/.exec(rest))) {
      out.push({ t: 'num', v: m[0] });
      i += m[0].length;
      continue;
    }
    if ((m = /^[A-Za-z_]\w*/.exec(rest))) {
      i += m[0].length;
      let index = null;
      if (s[i] === '[') {
        let depth = 0, j = i;
        for (; j < s.length; j++) {
          if (s[j] === '[') depth++;
          else if (s[j] === ']' && --depth === 0) break;
        }
        if (j >= s.length) throw new ShellError(i18n.t('arith.missingBracket', { expr: s.trim() }));
        index = s.slice(i + 1, j);
        i = j + 1;
      }
      out.push({ t: 'var', v: m[0], index });
      continue;
    }
    const op = OPS.find(o => s.startsWith(o, i));
    if (!op) throw new ShellError(i18n.t('arith.syntax', { expr: s.trim(), token: c }));
    out.push({ t: 'op', v: op });
    i += op.length;
  }
  return out;
}

const peek = p => p.tokens[p.i];
const isOp = (p, ...ops) => peek(p)?.t === 'op' && ops.includes(peek(p).v);
const take = p => p.tokens[p.i++];

function parseComma(p) {
  let node = parseAssign(p);
  while (isOp(p, ',')) {
    take(p);
    node = { k: 'comma', a: node, b: parseAssign(p) };
  }
  return node;
}

function parseAssign(p) {
  const start = p.i;
  const t = peek(p);
  if (t?.t === 'var' && p.tokens[p.i + 1]?.t === 'op' && ASSIGN_OPS.has(p.tokens[p.i + 1].v)) {
    p.i += 2;
    return { k: 'assign', name: t.v, index: t.index, op: p.tokens[start + 1].v, value: parseAssign(p) };
  }
  return parseTernary(p);
}

function parseTernary(p) {
  const cond = parseBinary(p, 0);
  if (!isOp(p, '?')) return cond;
  take(p);
  const yes = parseAssign(p);
  if (!isOp(p, ':')) throw syntax(p);
  take(p);
  return { k: 'ternary', cond, yes, no: parseAssign(p) };
}

function parseBinary(p, level) {
  if (level >= BINARY.length) return parsePower(p);
  let node = parseBinary(p, level + 1);
  while (isOp(p, ...BINARY[level])) {
    const op = take(p).v;
    node = { k: 'bin', op, a: node, b: parseBinary(p, level + 1) };
  }
  return node;
}

function parsePower(p) {
  const base = parseUnary(p);
  if (!isOp(p, '**')) return base;
  take(p);
  return { k: 'bin', op: '**', a: base, b: parsePower(p) };
}

function parseUnary(p) {
  if (isOp(p, '!', '~', '+', '-')) return { k: 'unary', op: take(p).v, a: parseUnary(p) };
  if (isOp(p, '++', '--')) {
    const op = take(p).v;
    const t = take(p);
    if (t?.t !== 'var') throw syntax(p);
    return { k: 'pre', op, name: t.v, index: t.index };
  }
  return parsePostfix(p);
}

function parsePostfix(p) {
  const t = take(p);
  if (!t) throw new ShellError(i18n.t('arith.operandExpected', { expr: String(p.text).trim() }));
  if (t.t === 'num') return { k: 'num', v: t.v };
  if (t.t === 'var') {
    if (isOp(p, '++', '--')) return { k: 'post', op: take(p).v, name: t.v, index: t.index };
    return { k: 'var', name: t.v, index: t.index };
  }
  if (t.v === '(') {
    const node = parseComma(p);
    if (!isOp(p, ')')) throw syntax(p);
    take(p);
    return node;
  }
  p.i--;
  throw syntax(p);
}

function number(text) {
  const s = String(text);
  if (/^0[xX]/.test(s)) return BigInt(s);
  const based = /^(\d+)#(.+)$/.exec(s);
  if (based) {
    const base = Number(based[1]);
    if (base < 2 || base > 64) throw new ShellError(i18n.t('arith.badBase', { value: s }));
    let v = 0n;
    for (const ch of based[2]) {
      const d = /\d/.test(ch) ? +ch : /[a-z]/.test(ch) ? ch.charCodeAt(0) - 87 : /[A-Z]/.test(ch) ? (base <= 36 ? ch.charCodeAt(0) - 55 : ch.charCodeAt(0) - 29) : ch === '@' ? 62 : 63;
      if (d >= base) throw new ShellError(i18n.t('arith.tooGreatForBase', { value: s }));
      v = v * BigInt(base) + BigInt(d);
    }
    return wrap(v);
  }
  if (/^0[0-7]+$/.test(s)) return wrap(BigInt('0o' + s.slice(1)));
  if (/^0\d+$/.test(s)) throw new ShellError(i18n.t('arith.tooGreatForBase', { value: s }));
  return wrap(BigInt(s));
}

function readVar(vars, name, index, depth) {
  const raw = String(vars.get(name, index == null ? null : String(evaluate(index, vars, depth + 1))) ?? '').trim();
  if (!raw) return 0n;
  if (/^-?\d+$/.test(raw)) return wrap(BigInt(raw));
  return evaluate(raw, vars, depth + 1);
}

function run(node, vars, depth) {
  const ev = n => run(n, vars, depth);
  const indexOf = n => (n.index == null ? null : String(evaluate(n.index, vars, depth + 1)));
  switch (node.k) {
    case 'num': return number(node.v);
    case 'var': return readVar(vars, node.name, node.index, depth);
    case 'comma': ev(node.a); return ev(node.b);
    case 'ternary': return ev(node.cond) !== 0n ? ev(node.yes) : ev(node.no);
    case 'unary': {
      const a = ev(node.a);
      if (node.op === '!') return a === 0n ? 1n : 0n;
      if (node.op === '~') return wrap(~a);
      return node.op === '-' ? wrap(-a) : a;
    }
    case 'pre':
    case 'post': {
      const index = indexOf(node);
      const old = readVar(vars, node.name, index == null ? null : index, depth);
      const next = wrap(node.op === '++' ? old + 1n : old - 1n);
      vars.set(node.name, index, String(next));
      return node.k === 'pre' ? next : old;
    }
    case 'assign': {
      const index = indexOf(node);
      let value = ev(node.value);
      if (node.op !== '=') value = binary(node.op.slice(0, -1), readVar(vars, node.name, index, depth), value);
      vars.set(node.name, index, String(value));
      return value;
    }
    case 'bin': {
      if (node.op === '&&') return ev(node.a) !== 0n && ev(node.b) !== 0n ? 1n : 0n;
      if (node.op === '||') return ev(node.a) !== 0n || ev(node.b) !== 0n ? 1n : 0n;
      return binary(node.op, ev(node.a), ev(node.b));
    }
  }
  throw new ShellError(i18n.t('arith.invalid'));
}

function binary(op, a, b) {
  switch (op) {
    case '+': return wrap(a + b);
    case '-': return wrap(a - b);
    case '*': return wrap(a * b);
    case '/':
    case '%':
      if (b === 0n) throw new ShellError(i18n.t('arith.divisionByZero'));
      return wrap(op === '/' ? a / b : a % b);
    case '**':
      if (b < 0n) throw new ShellError(i18n.t('arith.negativeExponent'));
      // By squaring, wrapped at every step: 64-bit like bash, never a huge BigInt
      for (var result = 1n; b > 0n; b >>= 1n, a = wrap(a * a)) if (b & 1n) result = wrap(result * a);
      return result;
    case '<<': return wrap(a << (b & 63n));
    case '>>': return wrap(a >> (b & 63n));
    case '&': return wrap(a & b);
    case '|': return wrap(a | b);
    case '^': return wrap(a ^ b);
    case '<': return a < b ? 1n : 0n;
    case '<=': return a <= b ? 1n : 0n;
    case '>': return a > b ? 1n : 0n;
    case '>=': return a >= b ? 1n : 0n;
    case '==': return a === b ? 1n : 0n;
    case '!=': return a !== b ? 1n : 0n;
  }
  throw new ShellError(i18n.t('arith.unknownOperator', { op }));
}
