import { fs } from '@lilos/sdk';
import { options, int } from './options.js';
import { compile } from './regex.js';
import { ShellError } from '../shell/signals.js';
import { EmptyReader } from '../shell/streams.js';
import { byName } from '../shell/paths.js';
import { t } from '../i18n.js';

/** Text tools for pipes: head, tail, wc, grep, sort, uniq, tee, cut, tr, rev, nl, seq, yes, xargs. */
const toTerminal = ctx => ctx.stdout === ctx.shell.host.stdout;
const utf8 = s => new TextEncoder().encode(s).length;

/** Lines of a text; `last` tells if it ended with a newline. */
function linesOf(text) {
  const lines = text.split('\n');
  const ended = text.endsWith('\n');
  if (ended || text === '') lines.pop();
  return { lines, ended };
}

async function head(ctx) {
  const { opts, args } = options(ctx, { flags: 'qv', values: 'nc', long: { lines: 'n', bytes: 'c', quiet: 'q' }, number: true });
  const n = opts.n != null ? int(opts.n) : 10;
  const files = args.length ? args : ['-'];
  let first = true;
  for (const file of files) {
    if (files.length > 1 && !opts.q) { await ctx.out(`${first ? '' : '\n'}==> ${file === '-' ? 'standard input' : file} <==\n`); }
    first = false;
    if (file === '-' && opts.c == null && n >= 0) {
      // From a pipe: stop reading as soon as there are enough lines (yes | head)
      let count = 0;
      while (count < n) {
        const line = await ctx.stdin.readLine();
        if (line == null) break;
        await ctx.out(line + '\n');
        count++;
      }
      ctx.stdin.close();
      continue;
    }
    for await (const { text } of ctx.inputs([file])) {
      if (opts.c != null) {
        const c = int(opts.c);
        await ctx.out(c >= 0 ? text.slice(0, c) : text.slice(0, Math.max(0, text.length + c)));
        continue;
      }
      const { lines, ended } = linesOf(text);
      const kept = n >= 0 ? lines.slice(0, n) : lines.slice(0, Math.max(0, lines.length + n));
      const out = kept.map(l => l + '\n').join('');
      await ctx.out(!ended && kept.length && kept.length === lines.length ? out.slice(0, -1) : out);
    }
  }
  return ctx.failed ? 1 : 0;
}

async function tail(ctx) {
  const { opts, args } = options(ctx, { flags: 'qvf', values: 'nc', long: { lines: 'n', bytes: 'c', quiet: 'q' }, number: true });
  const files = args.length ? args : ['-'];
  let first = true;
  for await (const { name, text } of ctx.inputs(files)) {
    if (files.length > 1 && !opts.q) await ctx.out(`${first ? '' : '\n'}==> ${name === '-' ? 'standard input' : name} <==\n`);
    first = false;
    if (opts.c != null) {
      const spec = String(opts.c);
      const c = int(spec.replace(/^[+-]/, ''));
      await ctx.out(spec.startsWith('+') ? text.slice(Math.max(0, c - 1)) : text.slice(Math.max(0, text.length - c)));
      continue;
    }
    const spec = String(opts.n ?? '10');
    const { lines, ended } = linesOf(text);
    const n = int(spec.replace(/^[+-]/, ''));
    const kept = spec.startsWith('+') ? lines.slice(Math.max(0, n - 1)) : n === 0 ? [] : lines.slice(-n);
    const out = kept.map(l => l + '\n').join('');
    await ctx.out(!ended && kept.length ? out.slice(0, -1) : out);
  }
  return ctx.failed ? 1 : 0;
}

async function wc(ctx) {
  const { opts, args } = options(ctx, { flags: 'lwcmL', long: { lines: 'l', words: 'w', bytes: 'c', chars: 'm' } });
  const show = opts.l || opts.w || opts.c || opts.m || opts.L ? opts : { l: true, w: true, c: true };
  const rows = [];
  for await (const { name, text } of ctx.inputs(args)) {
    rows.push({
      name: name === '-' && !args.length ? '' : name,
      l: (text.match(/\n/g) ?? []).length,
      w: (text.match(/\S+/g) ?? []).length,
      c: utf8(text),
      m: [...text].length,
      L: Math.max(0, ...text.split('\n').map(l => l.length)),
    });
  }
  if (rows.length > 1) rows.push({ name: t('wc.total'), ...Object.fromEntries(['l', 'w', 'c', 'm'].map(k => [k, rows.reduce((s, r) => s + r[k], 0)])), L: Math.max(...rows.map(r => r.L)) });
  const keys = ['l', 'w', 'm', 'c', 'L'].filter(k => show[k]);
  const width = keys.length === 1 && rows.length === 1 ? 0 : Math.max(...rows.flatMap(r => keys.map(k => String(r[k]).length)));
  for (const r of rows) await ctx.out(keys.map(k => String(r[k]).padStart(width)).join(' ') + (r.name ? ` ${r.name}` : '') + '\n');
  return ctx.failed ? 1 : 0;
}

async function grep(ctx) {
  const { opts, args } = options(ctx, {
    flags: 'ivnclLrRwxEFoqsHhGPz', values: 'mABC', multi: 'ef',
    long: {
      'ignore-case': 'i', 'invert-match': 'v', 'line-number': 'n', count: 'c', 'files-with-matches': 'l', 'files-without-match': 'L',
      recursive: 'r', 'word-regexp': 'w', 'line-regexp': 'x', 'extended-regexp': 'E', 'fixed-strings': 'F', 'only-matching': 'o',
      quiet: 'q', silent: 'q', 'no-messages': 's', 'with-filename': 'H', 'no-filename': 'h', regexp: 'e', file: 'f', 'max-count': 'm',
      'after-context': 'A', 'before-context': 'B', context: 'C', color: 'K', colour: 'K',
    },
  });
  const rest = [...args];
  let patterns = opts.e ?? [];
  for (const f of opts.f ?? []) {
    const node = ctx.resolve(f);
    if (node?.type !== 'file') throw new ShellError(t('err.noSuchFile', { path: f }), 2);
    patterns.push(...(await fs.read(node.id)).split('\n').filter(Boolean));
  }
  if (!patterns.length) {
    if (!rest.length) throw new ShellError(t('grep.noPattern'), 2);
    patterns = [rest.shift()];
  }
  const settings = { extended: opts.E || opts.P, fixed: opts.F, ignoreCase: opts.i, word: opts.w, line: opts.x };
  const res = patterns.map(p => compile(p, settings));
  const highlight = patterns.map(p => compile(p, { ...settings, global: true }));
  const color = toTerminal(ctx);
  const recursive = opts.r || opts.R;
  // Files to search: with -r, folders are walked
  const targets = [];
  const walk = (node, path) => {
    if (node.type === 'file') targets.push(path);
    else if (node.type === 'folder') for (const c of [...fs.children(node.id)].sort((a, b) => byName(a.name, b.name))) walk(c, path.endsWith('/') ? path + c.name : `${path}/${c.name}`);
  };
  if (recursive) {
    for (const p of rest.length ? rest : ['.']) {
      const node = ctx.resolve(p);
      if (!node) { if (!opts.s) await ctx.error(t('err.noSuchFile', { path: p })); ctx.failed = true; continue; }
      walk(node, p);
    }
  } else targets.push(...rest);
  const names = opts.H || ((targets.length > 1 || recursive) && !opts.h);
  const after = int(opts.A ?? opts.C ?? 0), before = int(opts.B ?? opts.C ?? 0);
  const max = opts.m != null ? int(opts.m) : Infinity;
  let matched = false;
  const paint = s => (color ? `\x1b[1;31m${s}\x1b[0m` : s);
  const label = (name, n, sep) => (names ? (color ? `\x1b[35m${name}\x1b[0m${sep}` : name + sep) : '') + (opts.n ? (color ? `\x1b[32m${n}\x1b[0m${sep}` : n + sep) : '');
  const search = async (name, text) => {
    const { lines } = linesOf(text);
    let count = 0, lastPrinted = -1, afterLeft = 0;
    for (let i = 0; i < lines.length && count < max; i++) {
      if (i % 2000 === 0) await ctx.tick();
      const line = lines[i];
      const hit = res.some(re => re.test(line)) !== !!opts.v;
      if (!hit) {
        if (afterLeft > 0 && !opts.c && !opts.l && !opts.L && !opts.q) { await ctx.out(label(name, i + 1, '-') + line + '\n'); lastPrinted = i; afterLeft--; }
        continue;
      }
      count++;
      matched = true;
      if (opts.q) return count;
      if (opts.c || opts.l || opts.L) continue;
      if ((before || after) && lastPrinted >= 0 && i - before > lastPrinted + 1) await ctx.out(color ? '\x1b[36m--\x1b[0m\n' : '--\n');
      for (let j = Math.max(lastPrinted + 1, i - before); j < i; j++) await ctx.out(label(name, j + 1, '-') + lines[j] + '\n');
      if (opts.o && !opts.v) {
        for (const re of highlight) for (const m of line.matchAll(re)) if (m[0]) await ctx.out(label(name, i + 1, ':') + paint(m[0]) + '\n');
      } else {
        let shown = line;
        if (color && !opts.v) for (const re of highlight) shown = shown.replace(re, m => (m ? paint(m) : m));
        await ctx.out(label(name, i + 1, ':') + shown + '\n');
      }
      lastPrinted = i;
      afterLeft = after;
    }
    return count;
  };
  const inputs = targets.length ? targets : ['-'];
  for (const target of inputs) {
    let text, name = target === '-' ? '(standard input)' : target;
    if (target === '-') text = await ctx.stdin.readAll();
    else {
      const node = ctx.resolve(target);
      if (!node) { if (!opts.s) await ctx.error(t('err.noSuchFile', { path: target })); ctx.failed = true; continue; }
      if (node.type === 'folder') { if (!opts.s) await ctx.error(t('err.isADirectory', { path: target })); continue; }
      if (node.type !== 'file') continue;
      text = await fs.read(node.id);
    }
    const count = await search(name, text);
    if (opts.q && matched) return 0;
    if (opts.c) await ctx.out((names ? `${name}:` : '') + count + '\n');
    if (opts.l && count) await ctx.out(name + '\n');
    if (opts.L && !count) await ctx.out(name + '\n');
  }
  if (ctx.failed && !opts.q) return 2;
  return matched ? 0 : 1;
}

/** Key of a line for sort -k (fields counted from 1, split on -t or on blanks). */
function sortKey(line, key, sep) {
  if (!key) return line;
  const fields = sep != null ? line.split(sep) : line.trim().split(/\s+/);
  const end = key.end ?? fields.length;
  return fields.slice(key.start - 1, end).join(sep ?? ' ');
}

const HUMAN = { K: 1e3, M: 1e6, G: 1e9, T: 1e12, k: 1e3 };
const numeric = s => {
  const m = /^\s*([+-]?\d*[.,]?\d+)/.exec(s);
  return m ? Number(m[1].replace(',', '.')) : 0;
};

async function sort(ctx) {
  const { opts, args } = options(ctx, { flags: 'rnufhbVsc', values: 'kto', long: { reverse: 'r', 'numeric-sort': 'n', unique: 'u', 'ignore-case': 'f', 'human-numeric-sort': 'h', key: 'k', 'field-separator': 't', output: 'o' } });
  let lines = [];
  for await (const { text } of ctx.inputs(args)) lines.push(...linesOf(text).lines);
  let key = null;
  if (opts.k) {
    const m = /^(\d+)(?:\.\d+)?[a-zA-Z]*(?:,(\d+)(?:\.\d+)?[a-zA-Z]*)?$/.exec(opts.k);
    if (!m) throw new ShellError(t('sort.badKey', { key: opts.k }), 2);
    key = { start: Number(m[1]), end: m[2] ? Number(m[2]) : null };
    if (/n/.test(opts.k)) opts.n = true;
    if (/r/.test(opts.k)) opts.r = true;
  }
  const value = line => {
    let k = sortKey(line, key, opts.t);
    if (opts.b) k = k.trim();
    if (opts.f) k = k.toLowerCase();
    return k;
  };
  const cmp = (a, b) => {
    const ka = value(a), kb = value(b);
    if (opts.n) return numeric(ka) - numeric(kb) || byName(a, b);
    if (opts.h) {
      const h = s => { const m = /^\s*([+-]?\d*\.?\d+)([KMGTk]?)/.exec(s); return m ? Number(m[1]) * (HUMAN[m[2]] ?? 1) : 0; };
      return h(ka) - h(kb) || byName(a, b);
    }
    if (opts.V) return ka.localeCompare(kb, undefined, { numeric: true });
    return byName(ka, kb) || (ka < kb ? -1 : ka > kb ? 1 : 0);
  };
  if (opts.c) {
    for (let i = 1; i < lines.length; i++) {
      if (cmp(lines[i - 1], lines[i]) > 0) { await ctx.error(t('sort.disorder', { n: i + 1, line: lines[i] })); return 1; }
    }
    return 0;
  }
  lines.sort(opts.r ? (a, b) => cmp(b, a) : cmp);
  if (opts.u) lines = lines.filter((l, i) => i === 0 || cmp(lines[i - 1], l) !== 0);
  const out = lines.map(l => l + '\n').join('');
  if (opts.o) {
    const id = ctx.shell.fileFor(opts.o).id;
    await fs.write(id, out);
  } else await ctx.out(out);
  return ctx.failed ? 2 : 0;
}

async function uniq(ctx) {
  const { opts, args } = options(ctx, { flags: 'cdui', values: 'fs', long: { count: 'c', repeated: 'd', unique: 'u', 'ignore-case': 'i', 'skip-fields': 'f', 'skip-chars': 's' } });
  const [input, output] = args;
  let lines = [];
  for await (const { text } of ctx.inputs(input ? [input] : [])) lines = linesOf(text).lines;
  const key = l => {
    let k = l;
    if (opts.f) k = k.replace(new RegExp(`^(\\s*\\S+){${int(opts.f)}}`), '');
    if (opts.s) k = k.slice(int(opts.s));
    return opts.i ? k.toLowerCase() : k;
  };
  let out = '';
  for (let i = 0; i < lines.length;) {
    let j = i + 1;
    while (j < lines.length && key(lines[j]) === key(lines[i])) j++;
    const n = j - i;
    if ((!opts.d || n > 1) && (!opts.u || n === 1)) out += (opts.c ? `${String(n).padStart(7)} ` : '') + lines[i] + '\n';
    i = j;
  }
  if (output) await fs.write(ctx.shell.fileFor(output).id, out);
  else await ctx.out(out);
  return ctx.failed ? 1 : 0;
}

async function tee(ctx) {
  const { opts, args } = options(ctx, { flags: 'ai', long: { append: 'a' } });
  const files = args.map(path => ({ path, id: ctx.shell.fileFor(path).id }));
  let text = '';
  for (let chunk; (chunk = await ctx.stdin.read()) != null;) {
    text += chunk;
    await ctx.out(chunk);
  }
  for (const f of files) {
    const before = opts.a ? await fs.read(f.id) : '';
    await fs.write(f.id, before + text);
  }
}

/** '1,3-5,7-' → (n) => boolean, fields/chars counted from 1. */
function ranges(spec) {
  const parts = String(spec).split(',').map(p => {
    const m = /^(\d*)(-?)(\d*)$/.exec(p);
    if (!m || (!m[1] && !m[3])) throw new ShellError(t('cut.badList', { spec }), 2);
    const a = m[1] ? Number(m[1]) : 1, b = m[2] ? (m[3] ? Number(m[3]) : Infinity) : a;
    return [a, b];
  });
  return n => parts.some(([a, b]) => n >= a && n <= b);
}

async function cut(ctx) {
  const { opts, args } = options(ctx, { flags: 's', values: 'dfcb', long: { delimiter: 'd', fields: 'f', characters: 'c', bytes: 'b', 'only-delimited': 's', 'output-delimiter': 'O' } });
  if (!opts.f && !opts.c && !opts.b) throw new ShellError(t('cut.noList'), 2);
  const sep = opts.d ?? '\t';
  if (sep.length !== 1) throw new ShellError(t('cut.badDelimiter'), 2);
  const outSep = opts.O ?? sep;
  let out = '';
  for await (const { text } of ctx.inputs(args)) {
    for (const line of linesOf(text).lines) {
      if (opts.f) {
        if (!line.includes(sep)) { if (!opts.s) out += line + '\n'; continue; }
        const keep = ranges(opts.f);
        out += line.split(sep).filter((_, i) => keep(i + 1)).join(outSep) + '\n';
      } else {
        const keep = ranges(opts.c ?? opts.b);
        out += [...line].filter((_, i) => keep(i + 1)).join('') + '\n';
      }
    }
  }
  await ctx.out(out);
  return ctx.failed ? 1 : 0;
}

const TR_CLASSES = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', digit: '0123456789',
  space: ' \t\n\r\f\v', blank: ' \t', punct: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
};
TR_CLASSES.alpha = TR_CLASSES.upper + TR_CLASSES.lower;
TR_CLASSES.alnum = TR_CLASSES.alpha + TR_CLASSES.digit;
TR_CLASSES.xdigit = '0123456789ABCDEFabcdef';

/** The characters of a tr set: ranges a-z, classes [:upper:], escapes \n. */
function trSet(spec) {
  const out = [];
  const chars = [];
  for (let i = 0; i < spec.length; i++) {
    if (spec[i] === '[' && spec[i + 1] === ':') {
      const end = spec.indexOf(':]', i + 2);
      const cls = TR_CLASSES[spec.slice(i + 2, end)];
      if (end > 0 && cls) { chars.push(...[...cls].map(c => ({ c, cls: true }))); i = end + 1; continue; }
    }
    if (spec[i] === '\\' && i + 1 < spec.length) {
      const n = spec[++i];
      const esc = { n: '\n', t: '\t', r: '\r', '\\': '\\', a: '\x07', b: '\b', f: '\f', v: '\v' }[n];
      if (esc) { chars.push({ c: esc }); continue; }
      const m = /^[0-7]{1,3}/.exec(spec.slice(i));
      if (m) { chars.push({ c: String.fromCharCode(parseInt(m[0], 8)) }); i += m[0].length - 1; continue; }
      chars.push({ c: n });
      continue;
    }
    chars.push({ c: spec[i] });
  }
  for (let i = 0; i < chars.length; i++) {
    if (chars[i + 1]?.c === '-' && chars[i + 2] && !chars[i].cls && !chars[i + 1].cls) {
      const a = chars[i].c.codePointAt(0), b = chars[i + 2].c.codePointAt(0);
      if (a > b) throw new ShellError(t('tr.reverseRange', { range: `${chars[i].c}-${chars[i + 2].c}` }));
      for (let x = a; x <= b; x++) out.push(String.fromCodePoint(x));
      i += 2;
    } else out.push(chars[i].c);
  }
  return out;
}

async function tr(ctx) {
  const { opts, args } = options(ctx, { flags: 'dscC', long: { delete: 'd', 'squeeze-repeats': 's', complement: 'c' } });
  if (!args.length) throw new ShellError(t('err.missingOperand'), 2);
  const set1 = trSet(args[0]);
  const set2 = args[1] != null ? trSet(args[1]) : null;
  if (!opts.d && !opts.s && !set2) throw new ShellError(t('tr.missingSet2', { set: args[0] }), 2);
  const complement = opts.c || opts.C;
  const in1 = complement ? c => !set1.includes(c) : c => set1.includes(c);
  const text = await ctx.stdin.readAll();
  let out = '';
  const map = new Map();
  if (set2 && !opts.d && !complement) set1.forEach((c, i) => map.set(c, set2[Math.min(i, set2.length - 1)]));
  const squeeze = opts.s ? new Set(set2 && !opts.d ? set2 : set2 ?? set1) : null;
  let prev = null;
  for (const c of text) {
    if (opts.d && in1(c)) continue;
    let o = c;
    if (!opts.d && set2) o = complement ? (in1(c) ? set2.at(-1) : c) : map.get(c) ?? c;
    if (squeeze && o === prev && (opts.d || set2 ? squeeze.has(o) : in1(o))) continue;
    out += o;
    prev = o;
  }
  await ctx.out(out);
}

async function rev(ctx) {
  let out = '';
  for await (const { text } of ctx.inputs(ctx.args)) {
    const { lines } = linesOf(text);
    out += lines.map(l => [...l].reverse().join('') + '\n').join('');
  }
  await ctx.out(out);
  return ctx.failed ? 1 : 0;
}

async function nl(ctx) {
  const { opts, args } = options(ctx, { values: 'bwsv' });
  const all = opts.b === 'a';
  const width = opts.w != null ? int(opts.w) : 6;
  const sep = opts.s ?? '\t';
  let n = opts.v != null ? int(opts.v) : 1, out = '';
  for await (const { text } of ctx.inputs(args)) {
    for (const line of linesOf(text).lines) {
      out += all || line.trim() ? `${String(n++).padStart(width)}${sep}${line}\n` : `${' '.repeat(width)}${sep}${line}\n`.replace(/^\s+\t\n$/, '\n');
    }
  }
  await ctx.out(out);
}

async function seq(ctx) {
  const { opts, args } = options(ctx, { flags: 'w', values: 'sf', long: { separator: 's', 'equal-width': 'w', format: 'f' } });
  const nums = args.map(a => {
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(a)) throw new ShellError(t('seq.badArgument', { value: a }), 2);
    return Number(a);
  });
  if (!nums.length || nums.length > 3) throw new ShellError(t('help.usageShort', { usage: t('help.seq.usage') }), 2);
  const [first, step, last] = nums.length === 1 ? [1, 1, nums[0]] : nums.length === 2 ? [nums[0], 1, nums[1]] : nums;
  if (step === 0) throw new ShellError(t('seq.zeroStep'), 2);
  const decimals = Math.max(...args.map(a => (a.split('.')[1] ?? '').length));
  const sep = opts.s ?? '\n';
  const fmt = v => {
    let s = v.toFixed(decimals);
    if (opts.w) {
      const width = Math.max(first.toFixed(decimals).length, last.toFixed(decimals).length);
      const neg = s.startsWith('-');
      s = (neg ? '-' : '') + s.replace('-', '').padStart(width - (neg ? 1 : 0), '0');
    }
    return s;
  };
  let out = '', count = 0;
  for (let i = 0; ; i++) {
    const v = first + i * step;
    if (step > 0 ? v > last + 1e-9 : v < last - 1e-9) break;
    out += (count++ ? sep : '') + fmt(v);
    if (out.length > 1 << 16) { await ctx.out(out); out = ''; await ctx.tick(); }
  }
  await ctx.out(out + (count ? '\n' : ''));
}

async function yes(ctx) {
  const line = (ctx.args.length ? ctx.args.join(' ') : 'y') + '\n';
  const chunk = line.repeat(Math.max(1, Math.floor(4096 / line.length)));
  for (;;) {
    await ctx.out(chunk);
    await ctx.tick();
  }
}

/** Words of xargs' input: blanks separate, quotes and backslashes keep them together. */
function xargsWords(text) {
  const words = [];
  let cur = '', has = false, quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    if (c === '\\' && i + 1 < text.length) { cur += text[++i]; has = true; continue; }
    if (/\s/.test(c)) { if (has) words.push(cur); cur = ''; has = false; continue; }
    cur += c;
    has = true;
  }
  if (quote) throw new ShellError(quote === '"' ? t('xargs.unmatchedDouble') : t('xargs.unmatchedSingle'));
  if (has) words.push(cur);
  return words;
}

async function xargs(ctx) {
  const { opts, args } = options(ctx, { flags: '0rtpx', values: 'nIdLP', long: { null: '0', 'no-run-if-empty': 'r', verbose: 't', 'max-args': 'n', replace: 'I', delimiter: 'd', 'max-lines': 'L' }, stopAtArg: true });
  const command = args.length ? args : ['echo'];
  const text = await ctx.stdin.readAll();
  let items;
  if (opts['0']) items = text.split('\0').filter((x, i, all) => x !== '' || i < all.length - 1);
  else if (opts.d != null) items = text.split(opts.d.replace(/\\n/, '\n').replace(/\\t/, '\t')).filter((x, i, all) => x !== '' || i < all.length - 1);
  else if (opts.I != null || opts.L != null) items = text.split('\n').map(l => l.trim()).filter(Boolean);
  else items = xargsWords(text);
  if (opts.d != null && items.at(-1)?.endsWith('\n')) items[items.length - 1] = items.at(-1).slice(0, -1);
  const runs = [];
  if (opts.I != null) for (const item of items) runs.push(command.map(a => a.replaceAll(opts.I, item)));
  else {
    const size = opts.n != null ? int(opts.n) : opts.L != null ? int(opts.L) : Infinity;
    if (size < 1) throw new ShellError(t('xargs.badCount'), 2);
    for (let i = 0; i < items.length; i += size === Infinity ? items.length : size) {
      const group = opts.L != null ? items.slice(i, i + size).flatMap(xargsWords) : items.slice(i, i + (size === Infinity ? items.length : size));
      runs.push([...command, ...group]);
    }
    if (!items.length && !opts.r) runs.push([...command]);
  }
  let status = 0;
  for (const argv of runs) {
    if (opts.t || opts.p) await ctx.err(argv.join(' ') + '\n');
    const code = await ctx.shell.invoke(argv, { stdin: new EmptyReader(), stdout: ctx.stdout, stderr: ctx.stderr });
    if (code === 127) return 127;
    if (code !== 0) status = 123;
  }
  return status;
}

export const textCommands = [
  { name: 'head', get usage() { return t('help.head.usage'); }, get summary() { return t('help.head.summary'); }, run: head, get help() { return t('help.head.text'); } },
  { name: 'tail', get usage() { return t('help.tail.usage'); }, get summary() { return t('help.tail.summary'); }, run: tail, get help() { return t('help.tail.text'); } },
  { name: 'wc', usage: 'wc [-lwcmL] [file…]', get summary() { return t('help.wc.summary'); }, run: wc, get help() { return t('help.wc.text'); } },
  { name: 'grep', get usage() { return t('help.grep.usage'); }, get summary() { return t('help.grep.summary'); }, run: grep,
    get help() { return t('help.grep.text'); } },
  { name: 'sort', get usage() { return t('help.sort.usage'); }, get summary() { return t('help.sort.summary'); }, run: sort,
    get help() { return t('help.sort.text'); } },
  { name: 'uniq', usage: 'uniq [-cdui] [input [output]]', get summary() { return t('help.uniq.summary'); }, run: uniq, get help() { return t('help.uniq.text'); } },
  { name: 'tee', usage: 'tee [-a] [file…]', get summary() { return t('help.tee.summary'); }, run: tee, get help() { return t('help.tee.text'); } },
  { name: 'cut', get usage() { return t('help.cut.usage'); }, get summary() { return t('help.cut.summary'); }, run: cut, get help() { return t('help.cut.text'); } },
  { name: 'tr', get usage() { return t('help.tr.usage'); }, get summary() { return t('help.tr.summary'); }, run: tr, get help() { return t('help.tr.text'); } },
  { name: 'rev', usage: 'rev [file…]', get summary() { return t('help.rev.summary'); }, run: rev },
  { name: 'nl', usage: 'nl [-b a] [file…]', get summary() { return t('help.nl.summary'); }, run: nl },
  { name: 'seq', get usage() { return t('help.seq.usage'); }, get summary() { return t('help.seq.summary'); }, run: seq, get help() { return t('help.seq.text'); } },
  { name: 'yes', get usage() { return t('help.yes.usage'); }, get summary() { return t('help.yes.summary'); }, run: yes },
  { name: 'xargs', get usage() { return t('help.xargs.usage'); }, get summary() { return t('help.xargs.summary'); }, run: xargs,
    get help() { return t('help.xargs.text'); } },
];
