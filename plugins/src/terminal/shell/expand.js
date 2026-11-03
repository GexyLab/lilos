import { fs } from '@lilos/sdk';
import { escapeGlob, hasGlob, matchPattern, patternSource, unescapeGlob } from './pattern.js';
import { glob } from './paths.js';
import { parseArithWord } from './parser.js';
import { ShellError } from './signals.js';
import { t } from '../i18n.js';

/**
 * Word expansion, in bash's order: braces, tilde, parameters / command substitution /
 * arithmetic, field splitting, pathname expansion (glob), quote removal.
 *
 * Inside, a word becomes pieces { text, quoted, split } plus BREAK between the fields of "$@";
 * quoted pieces are never split nor globbed.
 */
const BREAK = { brk: true };
const MAX_BRACES = 100_000;

/** Fields of a word (a command's arguments). */
export async function expandWords(shell, words) {
  const out = [];
  for (const word of words) out.push(...await expandWord(shell, word));
  return out;
}

export async function expandWord(shell, word, { split = !word.noSplit, braces = split } = {}) {
  const variants = braces ? braceExpand(word.parts) : [word.parts];
  const out = [];
  for (const parts of variants) {
    const pieces = await expandParts(shell, tilde(shell, parts), false);
    const fields = split ? splitFields(pieces, ifs(shell)) : [joinPieces(pieces)];
    for (const field of fields) {
      if (split && !shell.options.noglob) {
        const pattern = toPattern(field);
        if (hasGlob(pattern)) {
          const found = glob(shell.cwd, pattern);
          if (found.length) { out.push(...found); continue; }
        }
      }
      out.push(field.map(p => p.text).join(''));
    }
  }
  return out;
}

/** One string: no splitting, no glob (assignments, redirections, [[ ]], here-documents). */
export async function expandString(shell, word) {
  if (!word) return '';
  const pieces = await expandParts(shell, tilde(shell, word.parts), false);
  return joinPieces(pieces).map(p => p.text).join('');
}

/** A pattern: quoted parts are literal (case, [[ == ]], ${v#…}). */
export async function expandPattern(shell, word) {
  if (!word) return '';
  const pieces = await expandParts(shell, tilde(shell, word.parts), false);
  return toPattern(joinPieces(pieces));
}

/** A regular expression for =~: quoted parts are literal. */
export async function expandRegex(shell, word) {
  const pieces = await expandParts(shell, word.parts, false);
  return joinPieces(pieces).map(p => (p.quoted ? p.text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') : p.text)).join('');
}

const ifs = shell => shell.getVar('IFS') ?? ' \t\n';
const toPattern = field => field.map(p => (p.quoted ? escapeGlob(p.text) : p.text)).join('');

function joinPieces(pieces) {
  return pieces.map(p => (p.brk ? { text: ' ', quoted: true } : p));
}

function splitFields(pieces, separators) {
  const fields = [];
  let cur = [], has = false;
  const end = () => { fields.push(cur); cur = []; has = false; };
  for (const piece of pieces) {
    if (piece.brk) { end(); continue; }
    if (piece.quoted || !piece.split) {
      cur.push(piece);
      has ||= piece.quoted || piece.text.length > 0;
      continue;
    }
    let text = '';
    for (const c of piece.text) {
      if (!separators.includes(c)) { text += c; continue; }
      if (text) { cur.push({ text, quoted: false }); has = true; text = ''; }
      if (/\s/.test(c)) { if (has) end(); } else end();
    }
    if (text) { cur.push({ text, quoted: false }); has = true; }
  }
  if (has) end();
  return fields;
}

// ---------- Braces ----------

/** {a,b}c → ac bc; {1..5}, {a..e}, {01..10..2}. Only unquoted braces count. */
export function braceExpand(parts) {
  if (!parts.some(p => p.type === 'lit' && p.value.includes('{'))) return [parts];
  const atoms = parts.flatMap(p => (p.type === 'lit' ? [...p.value].map(c => ({ c })) : [{ part: p }]));
  const results = [];
  expandAtoms(atoms, results);
  return results.map(regroup);
}

function expandAtoms(atoms, out) {
  if (out.length > MAX_BRACES) throw new ShellError(t('expand.braceTooLarge'));
  for (let i = 0; i < atoms.length; i++) {
    if (atoms[i].c !== '{') continue;
    let depth = 0, j = i;
    const commas = [];
    for (; j < atoms.length; j++) {
      const c = atoms[j].c;
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) break;
      else if (c === ',' && depth === 1) commas.push(j);
    }
    if (j >= atoms.length) return void out.push(atoms);
    const pre = atoms.slice(0, i), post = atoms.slice(j + 1);
    if (commas.length) {
      const bounds = [i, ...commas, j];
      for (let k = 0; k < bounds.length - 1; k++) expandAtoms([...pre, ...atoms.slice(bounds[k] + 1, bounds[k + 1]), ...post], out);
      return;
    }
    const inner = atoms.slice(i + 1, j);
    const items = inner.every(a => a.c != null) ? sequence(inner.map(a => a.c).join('')) : null;
    if (items) {
      for (const item of items) expandAtoms([...pre, ...[...item].map(c => ({ c })), ...post], out);
      return;
    }
  }
  out.push(atoms);
}

function sequence(text) {
  let m = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(text);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const step = Math.abs(Number(m[3] ?? 1)) || 1;
    const width = /^-?0\d/.test(m[1]) || /^-?0\d/.test(m[2]) ? Math.max(m[1].length, m[2].length) : 0;
    if (Math.abs(b - a) / step > MAX_BRACES) throw new ShellError(t('expand.braceTooLarge'));
    const out = [];
    for (let v = a; a <= b ? v <= b : v >= b; v += a <= b ? step : -step) {
      const s = String(Math.abs(v)).padStart(width - (v < 0 ? 1 : 0), '0');
      out.push(v < 0 ? '-' + s : s);
    }
    return out;
  }
  m = /^([a-zA-Z])\.\.([a-zA-Z])(?:\.\.(-?\d+))?$/.exec(text);
  if (m) {
    const [a, b] = [m[1].charCodeAt(0), m[2].charCodeAt(0)];
    const step = Math.abs(Number(m[3] ?? 1)) || 1;
    const out = [];
    for (let v = a; a <= b ? v <= b : v >= b; v += a <= b ? step : -step) out.push(String.fromCharCode(v));
    return out;
  }
  return null;
}

function regroup(atoms) {
  const parts = [];
  for (const a of atoms) {
    if (a.part) parts.push(a.part);
    else if (parts.at(-1)?.type === 'lit' && parts.at(-1).fresh) parts.at(-1).value += a.c;
    else parts.push({ type: 'lit', value: a.c, fresh: true });
  }
  return parts;
}

// ---------- Tilde ----------

function tilde(shell, parts) {
  const first = parts[0];
  if (first?.type !== 'lit' || !first.value.startsWith('~')) return parts;
  const slash = first.value.indexOf('/');
  const prefix = slash < 0 ? first.value : first.value.slice(0, slash);
  const rest = slash < 0 ? '' : first.value.slice(slash);
  let dir = null;
  if (prefix === '~') dir = shell.getVar('HOME') ?? fs.home;
  else if (prefix === '~+') dir = shell.getVar('PWD');
  else if (prefix === '~-') dir = shell.getVar('OLDPWD');
  else if (prefix.slice(1) === shell.getVar('USER')) dir = fs.home;
  if (dir == null || (slash < 0 && parts.length > 1 && parts[1].type !== 'lit')) return parts;
  return [{ type: 'sq', value: dir }, ...(rest ? [{ type: 'lit', value: rest }] : []), ...parts.slice(1)];
}

// ---------- Parameters, substitutions ----------

async function expandParts(shell, parts, quoted) {
  const pieces = [];
  for (const part of parts) {
    switch (part.type) {
      case 'lit':
        pieces.push({ text: part.value, quoted, split: false });
        break;
      case 'sq':
        pieces.push({ text: part.value, quoted: true });
        break;
      case 'dq': {
        const inner = await expandParts(shell, part.parts, true);
        const emptyAt = part.parts.length > 0 && part.parts.every(p => p.type === 'param' && isMulti(p));
        if (!inner.length && !emptyAt) pieces.push({ text: '', quoted: true });
        pieces.push(...inner);
        break;
      }
      case 'cmdsub': {
        const text = (await shell.substitute(part.body)).replace(/\n+$/, '');
        pieces.push({ text, quoted, split: !quoted });
        break;
      }
      case 'arith': {
        const text = await expandString(shell, part.word);
        pieces.push({ text: String(shell.arith(text)), quoted, split: !quoted });
        break;
      }
      case 'param':
        pieces.push(...await paramPieces(shell, part, quoted));
        break;
    }
  }
  return pieces;
}

const isMulti = p => !p.length && !p.op && (p.name === '@' || p.index === '@');

async function paramPieces(shell, part, quoted) {
  const { values, multi, star } = await paramValues(shell, part);
  if (multi || star) {
    if (star && quoted) return [{ text: values.join((ifs(shell) || '')[0] ?? ''), quoted: true }];
    const out = [];
    values.forEach((v, i) => {
      if (i) out.push(BREAK);
      out.push({ text: v, quoted, split: !quoted });
    });
    return out;
  }
  return [{ text: values[0] ?? '', quoted, split: !quoted }];
}

/** Value of a parameter expansion: { values, multi ("$@"-like), star ("$*"-like) }. */
async function paramValues(shell, part) {
  let name = part.name, index = part.index ?? null;
  if (part.indirect && (index === '@' || index === '*')) {
    // ${!a[@]}: the indices that are set
    return { values: shell.arrayKeys(name), multi: index === '@', star: index === '*' };
  }
  if (part.indirect) {
    const target = lookup(shell, name, index).values[0] ?? '';
    const m = /^([A-Za-z_]\w*|[0-9]+|[@*#?$!-])(?:\[(.*)\])?$/.exec(target);
    if (!m) throw new ShellError(t('expand.badSubstitution', { name: target }));
    [, name, index = null] = m;
  }
  let { values, set, multi, star } = lookup(shell, name, index);
  if (part.length) {
    if (multi || star) return { values: [String(values.length)] };
    return { values: [String([...(values[0] ?? '')].length)] };
  }
  const op = part.op;
  if (!op) {
    if (!set && shell.options.nounset && !(multi || star)) throw new ShellError(t('expand.unbound', { name }));
    return { values, multi, star };
  }
  const empty = !set || (values.length === 0 || (values.length === 1 && values[0] === '' && !(multi || star)));
  const missing = op.startsWith(':') ? empty : !set;
  switch (op) {
    case '-': case ':-':
      return missing ? { values: [await expandString(shell, part.arg)] } : { values, multi, star };
    case '=': case ':=':
      if (!missing) return { values, multi, star };
      if (!/^[A-Za-z_]\w*$/.test(name)) throw new ShellError(t('expand.cannotAssign', { name }));
      shell.setVar(name, await expandString(shell, part.arg), index);
      return { values: [shell.getVar(name, index) ?? ''] };
    case '?': case ':?':
      if (!missing) return { values, multi, star };
      throw new ShellError(`${name}: ${(await expandString(shell, part.arg)) || t('expand.nullOrNotSet')}`);
    case '+': case ':+':
      return missing ? { values: [] } : { values: [await expandString(shell, part.arg)] };
  }
  const each = async fn => ({ values: await Promise.all(values.map(fn)), multi, star });
  switch (op) {
    case '#': case '##': case '%': case '%%': {
      const pattern = await expandPattern(shell, part.arg);
      return each(v => strip(v, pattern, op));
    }
    case '/': case '//': case '/#': case '/%': {
      const pattern = await expandPattern(shell, part.arg);
      const replacement = await expandString(shell, part.replace);
      return each(v => replace(v, pattern, replacement, op));
    }
    case '^': case '^^': case ',': case ',,': {
      const pattern = part.arg?.parts.length ? await expandPattern(shell, part.arg) : '?';
      const upper = op[0] === '^';
      return each(v => [...v].map((c, i) => ((op.length === 2 || i === 0) && matchPattern(pattern, c) ? (upper ? c.toUpperCase() : c.toLowerCase()) : c)).join(''));
    }
    case 'substr': {
      const offset = Number(shell.arith(await expandString(shell, part.offset)));
      const count = part.count ? Number(shell.arith(await expandString(shell, part.count))) : null;
      const cut = list => {
        const start = offset < 0 ? Math.max(0, list.length + offset) : Math.min(offset, list.length);
        if (count == null) return list.slice(start);
        if (count < 0) {
          if (multi || star) throw new ShellError(t('expand.negativeSubstring', { count }));
          return list.slice(start, Math.max(start, list.length + count));
        }
        return list.slice(start, start + count);
      };
      if (multi || star) {
        // "${@:1}" counts from $0, like bash
        const list = name === '@' || name === '*' ? [shell.getVar('0') ?? 'bash', ...values] : values;
        return { values: cut(list), multi, star };
      }
      return { values: [cut([...(values[0] ?? '')]).join('')] };
    }
  }
  throw new ShellError(t('expand.badSubstitution', { name }));
}

/** { values, set, multi, star } of a name (and subscript). */
function lookup(shell, name, index) {
  if (name === '@' || name === '*') {
    const values = shell.positional;
    return { values, set: true, multi: name === '@', star: name === '*' };
  }
  if (/^\d+$/.test(name)) {
    const v = name === '0' ? shell.getVar('0') : shell.positional[Number(name) - 1];
    return { values: v == null ? [] : [v], set: v != null };
  }
  if (name === '#') return { values: [String(shell.positional.length)], set: true };
  if (/^[?$!-]$/.test(name)) {
    const v = shell.special(name);
    return { values: v == null ? [] : [v], set: v != null };
  }
  if (index === '@' || index === '*') {
    const values = shell.getArray(name) ?? [];
    return { values, set: values.length > 0, multi: index === '@', star: index === '*' };
  }
  const v = shell.getVar(name, index == null ? null : shell.arrayIndex(index));
  return { values: v == null ? [] : [v], set: v != null };
}

function strip(value, pattern, op) {
  const longest = op.length === 2;
  if (op[0] === '#') {
    const lengths = [...Array(value.length + 1).keys()];
    if (longest) lengths.reverse();
    for (const n of lengths) if (matchPattern(pattern, value.slice(0, n))) return value.slice(n);
  } else {
    const starts = [...Array(value.length + 1).keys()];
    if (!longest) starts.reverse();
    for (const n of starts) if (matchPattern(pattern, value.slice(n))) return value.slice(0, n);
  }
  return value;
}

function replace(value, pattern, replacement, op) {
  if (!pattern) return value;
  const source = patternSource(pattern);
  // Longest match at each position, like bash: greedy regex, anchored where asked
  if (op === '/#') return value.replace(new RegExp(`^(?:${source})`), () => replacement);
  if (op === '/%') {
    for (let n = 0; n <= value.length; n++) if (matchPattern(pattern, value.slice(n))) return value.slice(0, n) + replacement;
    return value;
  }
  const re = new RegExp(source, op === '//' ? 'g' : '');
  return value.replace(re, m => (m === '' ? m : replacement));
}

export { parseArithWord, unescapeGlob };
