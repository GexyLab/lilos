/**
 * Helpers for the blocks of the Logic Studio math packages (logicstudio-functions,
 * logicstudio-integrals): the function of a block (input «f» or the setting «Funzione»), values
 * from an input or from a setting, interval ends with ∞ and pi, starting at the start of the schema.
 */
import { parse, symbols, compile, constValue, CONSTANTS } from './mathexpr.js';

export const L = (en, it) => ({ en, it });

/** A number from a value: 2, '2', '2,5'; else NaN. */
export const num = v => (typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : v === null || v === undefined || v === '' ? NaN : Number(String(v).trim().replace(',', '.')));

/** 15 significant digits: 0.1 + 0.2 leftovers do not show. */
export const tidy = x => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toPrecision(15)) : x);

/** The input f, or the setting «Funzione» (config.expr) when nothing is linked to f. */
export const F_IN = { name: 'f', type: 'text', label: L('f (function)', 'f (funzione)') };

/** The setting with the expression and the one with the variable's name. */
export const exprField = (def = 'x^2') => ({ key: 'expr', type: 'text', default: def, label: L('Function (when f is not linked)', 'Funzione (se f non è collegato)') });
export const varField = { key: 'variable', type: 'text', default: 'x', label: L('Variable', 'Variabile') };

/**
 * The value that reached an input (a link or the input's start value), else the setting `key`
 * when nothing is linked to it; `undefined` when the input is linked but nothing has arrived yet
 * (the block waits).
 */
export const pick = (inputs, b, port, key = port) => (inputs[port] !== undefined ? inputs[port] : b.linked(port) ? undefined : b.config[key]);

/** The variable's name from the settings, checked. */
export function variableOf(b, fallback = 'x') {
  const v = String(b.config.variable ?? fallback).trim() || fallback;
  if (!/^[A-Za-z_][A-Za-z0-9_]*'*$/.test(v)) throw new Error(`Nome di variabile non valido: «${v}»`);
  if (v in CONSTANTS) throw new Error(`«${v}» è una costante, non può essere la variabile`);
  return v;
}

/** The parsed function of a block, cached in its memory; undefined while f is linked and empty. */
export function treeOf(inputs, b, port = 'f', key = 'expr') {
  const src = pick(inputs, b, port, key);
  if (src === undefined) return undefined;
  if (typeof src !== 'string' && typeof src !== 'number') throw new Error('f deve essere un\'espressione di testo, come «x^2 + 1»');
  const m = b.memory();
  m.trees ??= {};
  const text = String(src);
  if (m.trees[port]?.text !== text) m.trees[port] = { text, tree: parse(text) };
  return m.trees[port].tree;
}

/** A function of the variables `vars`, after checking that no other name is left. */
export function functionOf(tree, vars) {
  const extra = [...symbols(tree)].filter(n => !vars.includes(n));
  if (extra.length) {
    throw new Error(`${extra.length === 1 ? 'Parametro senza valore' : 'Parametri senza valore'}: ${extra.join(', ')} (dagli un valore con il blocco Funzione f(x); ${vars.length === 1 ? `la variabile è ${vars[0]}` : `le variabili sono ${vars.join(', ')}`})`);
  }
  return compile(tree, vars);
}

/**
 * A number for an interval end or a bound: 2, '2,5', 'pi/2', 'inf', '-∞'. `allowInfinite`: ±∞
 * accepted. `what` names the value in the error.
 */
export function bound(v, what, allowInfinite = false) {
  if (typeof v === 'number') {
    if (Number.isNaN(v) || !allowInfinite && !Number.isFinite(v)) throw new Error(`${what}: serve un numero`);
    return v;
  }
  const s = String(v ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!s) throw new Error(`${what}: serve un numero`);
  const inf = { inf: Infinity, '+inf': Infinity, infinity: Infinity, '∞': Infinity, '+∞': Infinity, '-inf': -Infinity, '-infinity': -Infinity, '-∞': -Infinity, '−∞': -Infinity };
  if (s in inf) {
    if (!allowInfinite) throw new Error(`${what}: l'infinito non è ammesso qui`);
    return inf[s];
  }
  const n = num(s);
  if (Number.isFinite(n)) return n;
  let value = null;
  try { value = constValue(parse(String(v))); } catch { value = null; }
  if (value === null || !Number.isFinite(value)) throw new Error(`${what}: serve un numero (o un'espressione come pi/2), non «${v}»`);
  return value;
}

/** A finite number from a value, or an error naming it. */
export function need(v, what) {
  const n = num(v);
  if (!Number.isFinite(n)) throw new Error(`${what}: serve un numero`);
  return n;
}

/**
 * start(b) for a block whose inputs can all come from its settings: when nothing is linked, it
 * runs once at the start of the schema.
 */
export function startWhenFree(def) {
  return {
    ...def,
    start(b) {
      const inputs = (def.inputs ?? []).filter(p => p.type !== 'pulse');
      if (inputs.some(p => b.linked(p.name))) return;
      if ((b.added?.inputs ?? []).some(p => b.linked(p.id))) return;
      const out = def.run({}, b);
      if (out && typeof out === 'object') for (const [port, value] of Object.entries(out)) if (value !== undefined) b.send(port, value);
    },
  };
}

/** Up to 10 000 elements: a list from a schema cannot hang the worker. */
export function checkList(list, what = 'La lista') {
  if (!Array.isArray(list)) throw new Error(`${what} deve essere una lista`);
  if (list.length > 10_000) throw new Error(`${what} ha più di 10000 elementi`);
  return list;
}
