import { fs } from '@lilos/sdk';
import { options, int } from './options.js';
import { ShellError } from '../shell/signals.js';
import { t } from '../i18n.js';

/** diff: differences between two files, in the normal format or unified (-u). */

/**
 * Myers' algorithm: the shortest edit script between two lists of lines, as hunks
 * { a, b, del, ins } (from line a of the first list, del lines removed; from b of the second, ins added).
 */
export function diffLines(a, b, same = (x, y) => x === y) {
  // The common start and end need no search
  let head = 0, tail = 0;
  while (head < a.length && head < b.length && same(a[head], b[head])) head++;
  while (tail < a.length - head && tail < b.length - head && same(a[a.length - 1 - tail], b[b.length - 1 - tail])) tail++;
  const hunks = myers(a.slice(head, a.length - tail), b.slice(head, b.length - tail), same);
  for (const h of hunks) { h.a += head; h.b += head; }
  return hunks;
}

const MAX_TRACE = 40_000_000;

function myers(a, b, same) {
  const n = a.length, m = b.length, max = n + m;
  const v = new Int32Array(2 * max + 2);
  const trace = [];
  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    if ((d + 1) * v.length > MAX_TRACE) throw new ShellError(t('diff.tooBig'), 2);
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[max + k - 1] < v[max + k + 1]) ? v[max + k + 1] : v[max + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && same(a[x], b[y])) { x++; y++; }
      v[max + k] = x;
      if (x >= n && y >= m) { found = true; break; }
    }
  }
  // Walk back through the trace collecting the moves
  const moves = [];
  let x = n, y = m;
  for (let d = trace.length - 1; d > 0; d--) {
    const vd = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && vd[max + k - 1] < vd[max + k + 1]) ? k + 1 : k - 1;
    const px = vd[max + prevK], py = px - prevK;
    while (x > px && y > py) { x--; y--; }
    moves.push(x === px ? { op: 'ins', a: x, b: py } : { op: 'del', a: px, b: y });
    x = px;
    y = py;
  }
  moves.reverse();
  const hunks = [];
  for (const mv of moves) {
    const h = hunks.at(-1);
    if (mv.op === 'del') {
      if (h && h.a + h.del === mv.a && h.b + h.ins === mv.b) h.del++;
      else hunks.push({ a: mv.a, b: mv.b, del: 1, ins: 0 });
    } else if (h && h.a + h.del === mv.a && h.b + h.ins === mv.b) h.ins++;
    else hunks.push({ a: mv.a, b: mv.b, del: 0, ins: 1 });
  }
  return hunks;
}

const range = (start, count) => (count <= 1 ? String(start + (count ? 1 : 0)) : `${start + 1},${start + count}`);
const unifiedRange = (start, count) => (count === 1 ? String(start + 1) : `${count ? start + 1 : start},${count}`);

function normal(a, b, hunks) {
  let out = '';
  for (const h of hunks) {
    const op = h.del && h.ins ? 'c' : h.del ? 'd' : 'a';
    out += `${op === 'a' ? String(h.a) : range(h.a, h.del)}${op}${op === 'd' ? String(h.b) : range(h.b, h.ins)}\n`;
    for (let i = 0; i < h.del; i++) out += `< ${a[h.a + i]}\n`;
    if (op === 'c') out += '---\n';
    for (let i = 0; i < h.ins; i++) out += `> ${b[h.b + i]}\n`;
  }
  return out;
}

function unified(a, b, hunks, context) {
  let out = '';
  // Hunks closer than 2×context lines are shown together
  const groups = [];
  for (const h of hunks) {
    const g = groups.at(-1);
    if (g && h.a - (g.at(-1).a + g.at(-1).del) <= 2 * context) g.push(h);
    else groups.push([h]);
  }
  for (const g of groups) {
    const first = g[0], last = g.at(-1);
    const aStart = Math.max(0, first.a - context), bStart = Math.max(0, first.b - context);
    const aEnd = Math.min(a.length, last.a + last.del + context), bEnd = Math.min(b.length, last.b + last.ins + context);
    out += `@@ -${unifiedRange(aStart, aEnd - aStart)} +${unifiedRange(bStart, bEnd - bStart)} @@\n`;
    let i = aStart;
    for (const h of g) {
      for (; i < h.a; i++) out += ` ${a[i]}\n`;
      for (let k = 0; k < h.del; k++) out += `-${a[h.a + k]}\n`;
      for (let k = 0; k < h.ins; k++) out += `+${b[h.b + k]}\n`;
      i = h.a + h.del;
    }
    for (; i < aEnd; i++) out += ` ${a[i]}\n`;
  }
  return out;
}

const stamp = ms => {
  const d = new Date(ms);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

async function diff(ctx) {
  const { opts, args } = options(ctx, { flags: 'uqiwbBsN', values: 'U', long: { unified: 'u', brief: 'q', 'ignore-case': 'i', 'ignore-all-space': 'w', 'ignore-space-change': 'b', 'ignore-blank-lines': 'B', 'report-identical-files': 's' } });
  if (args.length !== 2) throw new ShellError(args.length < 2 ? t('diff.missingOperand', { arg: args[0] ?? 'diff' }) : t('diff.extraOperand', { arg: args[2] }), 2);
  const read = async path => {
    if (path === '-') return { text: await ctx.stdin.readAll(), time: Date.now() };
    const node = ctx.resolve(path);
    if (!node) throw new ShellError(t('err.noSuchFile', { path }), 2);
    if (node.type !== 'file') throw new ShellError(node.type === 'folder' ? t('err.isADirectory', { path }) : t('err.notAFile', { path }), 2);
    return { text: await fs.read(node.id), time: node.modified };
  };
  const [fa, fb] = [await read(args[0]), await read(args[1])];
  const lines = t => { const l = t.split('\n'); if (t.endsWith('\n') || t === '') l.pop(); return l; };
  let a = lines(fa.text), b = lines(fb.text);
  const norm = s => {
    if (opts.i) s = s.toLowerCase();
    if (opts.w) s = s.replace(/\s+/g, '');
    else if (opts.b) s = s.replace(/\s+/g, ' ').trimEnd();
    return s;
  };
  let hunks = diffLines(a, b, (x, y) => norm(x) === norm(y));
  if (opts.B) hunks = hunks.filter(h => !(a.slice(h.a, h.a + h.del).every(l => !l.trim()) && b.slice(h.b, h.b + h.ins).every(l => !l.trim())));
  if (!hunks.length) {
    if (opts.s) await ctx.out(`${t('diff.identical', { a: args[0], b: args[1] })}\n`);
    return 0;
  }
  if (opts.q) {
    await ctx.out(`${t('diff.differ', { a: args[0], b: args[1] })}\n`);
    return 1;
  }
  if (opts.u || opts.U != null) {
    const context = opts.U != null ? int(opts.U) : 3;
    await ctx.out(`--- ${args[0]}\t${stamp(fa.time)}\n+++ ${args[1]}\t${stamp(fb.time)}\n` + unified(a, b, hunks, context));
  } else await ctx.out(normal(a, b, hunks));
  return 1;
}

export const diffCommands = [
  {
    name: 'diff', usage: 'diff [-uqiwB] file1 file2', get summary() { return t('help.diff.summary'); }, run: diff,
    get help() { return t('help.diff.text'); },
  },
];
