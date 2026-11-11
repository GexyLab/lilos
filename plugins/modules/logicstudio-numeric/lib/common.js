/**
 * What the blocks of logicstudio-numeric share: labels, conversions, the way a block finds its
 * function (input «f» or the setting «Funzione», the syntax of lib/shared/mathexpr.js, the same as
 * the fn.* blocks) and the wrapper of the blocks that only compute (they wait for the inputs that
 * are linked, and with nothing linked they compute once at the start).
 */
import { print, compile, symbols, CONSTANTS, FUNCTIONS } from './shared/mathexpr.js';
import { L, num, tidy, F_IN, exprField, varField, pick, variableOf, treeOf, functionOf, bound, need, checkList } from './shared/mathblocks.js';

export { L, num, tidy, F_IN, exprField, varField, pick, variableOf, treeOf, functionOf, bound, need, checkList, print, compile, symbols };

export const category = 'analysis';
export const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
export const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** A whole number from a setting or an input, inside [min, max]; else the error names it. */
export function intIn(v, min, max, what) {
  const n = num(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${what}: da ${min} a ${max}`);
  return n;
}

/** A finite number (also written as pi/2). */
export const real = (v, what) => bound(v, what, false);

/** A list of numbers from a list or from a text such as "1, 0, -2" (commas, semicolons or spaces). */
export function numbersOf(v, what) {
  if (Array.isArray(v)) return checkList(v, what).map((x, i) => real(x, `${what}, elemento ${i + 1}`));
  const parts = text(v).split(/[\s,;]+/).filter(Boolean);
  if (parts.length > 10_000) throw new Error(`${what}: più di 10000 valori`);
  return parts.map(x => real(x, what));
}

/** A name for a variable that is not a function, a constant or a name with an apostrophe. */
export const goodName = n => typeof n === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,15}$/.test(n) && !(n in CONSTANTS) && !(n in FUNCTIONS) && !n.startsWith('__');

/** A list of variable names from a text such as "x, y": checked, no repeats. */
export function namesOf(src, what, max) {
  const names = text(src).split(/[\s,;]+/).filter(Boolean);
  if (!names.length || names.length > max) throw new Error(`${what}: da 1 a ${max} nomi`);
  for (const v of names) if (!goodName(v)) throw new Error(`Nome di variabile non valido: «${v}»`);
  if (new Set(names).size !== names.length) throw new Error(`${what}: due nomi sono uguali`);
  return names;
}

/** Inputs of a block that are linked and have no value yet: the block waits. */
export function waiting(inputs, c, names) {
  if (names.some(n => c.linked(n) && inputs[n] === undefined)) return true;
  return (c.added?.inputs ?? []).some(p => c.linked(p.id) && p.value === undefined);
}

/**
 * A block that only computes: compute(inputs, c) → outputs. It waits for the linked inputs, and
 * with no input linked it computes once at the start of the program.
 */
export function pure(def) {
  const { compute, autostart, ...rest } = def;
  const names = (def.inputs ?? []).map(p => p.name);
  const anyLinked = c => names.some(n => c.linked(n)) || (c.added?.inputs ?? []).some(p => c.linked(p.id));
  return {
    version: 1, category, ...rest,
    run(inputs, c) { return waiting(inputs, c, names) ? undefined : compute(inputs, c); },
    start(c) {
      if (autostart === false || anyLinked(c)) return;
      const out = compute({}, c);
      for (const [k, v] of Object.entries(out ?? {})) if (v !== undefined) c.send(k, v);
    },
  };
}

/** The function of a block and its variable: { tree, v, f }. */
export function fnOf(inputs, c, vars) {
  const tree = treeOf(inputs, c);
  const v = variableOf(c);
  return { tree, v, f: functionOf(tree, vars ?? [v]) };
}

/** A line y = m x + q as a formula text. */
export function lineText(m, q, v = 'x') {
  const f = x => String(Number(x.toPrecision(12)));
  if (m === 0) return f(q);
  const first = m === 1 ? v : m === -1 ? `-${v}` : `${f(m)} * ${v}`;
  if (q === 0) return first;
  return `${first} ${q < 0 ? '-' : '+'} ${f(Math.abs(q))}`;
}

/** The text of a polynomial from coefficients in ascending powers of (v - x0). */
export function polyText(coefs, v = 'x', x0 = 0) {
  const f = x => String(Number(x.toPrecision(12)));
  const base = x0 === 0 ? v : `(${v} ${x0 < 0 ? '+' : '-'} ${f(Math.abs(x0))})`;
  const parts = [];
  coefs.forEach((c, k) => {
    if (!c) return;
    const mag = Math.abs(c);
    let t;
    if (k === 0) t = f(mag);
    else {
      const pow = k === 1 ? base : `${base}^${k}`;
      t = mag === 1 ? pow : `${f(mag)} * ${pow}`;
    }
    parts.push({ neg: c < 0, t });
  });
  if (!parts.length) return '0';
  return parts.map((p, i) => (i === 0 ? (p.neg ? `-${p.t}` : p.t) : `${p.neg ? '-' : '+'} ${p.t}`)).join(' ');
}
