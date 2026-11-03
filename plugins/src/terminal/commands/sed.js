import { fs } from '@lilos/sdk';
import { options } from './options.js';
import { compile } from './regex.js';
import { ShellError } from '../shell/signals.js';
import { t } from '../i18n.js';

/**
 * sed, the stream editor: addresses (n, $, /re/, a,b, a,+n, !), blocks { }, and the commands
 * s y d D p P q Q a i c = n N h H g G x b t T : — like GNU sed, with JavaScript regular
 * expressions underneath (see regex.js).
 */
function parseScript(text, extended) {
  const cmds = [];
  const stack = [];
  let pos = 0;
  const ch = () => text[pos];
  const skip = () => { while (pos < text.length && /[ \t]/.test(text[pos])) pos++; };
  const fail = msg => { throw new ShellError(t('sed.at', { pos, message: msg })); };

  /** Text up to an unescaped delimiter; \delim becomes delim, \n a newline (in regexes it stays \n). */
  const until = (delim, regex) => {
    let out = '';
    for (;;) {
      if (pos >= text.length) fail(t('sed.unterminated'));
      const c = text[pos++];
      if (c === delim) return out;
      if (c === '\\') {
        const n = text[pos++];
        if (n === delim) out += delim === '&' && !regex ? '\\&' : delim;
        else if (n === 'n' && !regex) out += '\n';
        else out += '\\' + (n ?? '');
        continue;
      }
      if (c === '\n' && !regex) { out += '\n'; continue; }
      out += c;
    }
  };
  const regexAddr = delim => {
    const source = until(delim, true);
    let flags = '';
    while (text[pos] === 'I' || text[pos] === 'M') flags += text[pos++];
    return { re: source, ignoreCase: flags.includes('I') };
  };
  const address = () => {
    skip();
    const c = ch();
    if (/\d/.test(c ?? '')) {
      const m = /^\d+/.exec(text.slice(pos));
      pos += m[0].length;
      if (text[pos] === '~') {
        pos++;
        const s = /^\d+/.exec(text.slice(pos))?.[0] ?? '0';
        pos += s.length;
        return { step: [Number(m[0]), Number(s)] };
      }
      return { line: Number(m[0]) };
    }
    if (c === '$') { pos++; return { last: true }; }
    if (c === '/') { pos++; return regexAddr('/'); }
    if (c === '\\') { pos++; const d = text[pos++]; return regexAddr(d); }
    return null;
  };
  const label = () => {
    skip();
    const m = /^[^;\n}]*/.exec(text.slice(pos));
    pos += m[0].length;
    return m[0].trim();
  };
  const textArg = () => {
    skip();
    if (ch() === '\\') { pos++; if (ch() === '\n') pos++; }
    let out = '';
    while (pos < text.length && text[pos] !== '\n') {
      if (text[pos] === '\\' && pos + 1 < text.length) { out += text[pos + 1] === 'n' ? '\n' : text[pos + 1]; pos += 2; continue; }
      out += text[pos++];
    }
    return out;
  };

  while (pos < text.length) {
    while (pos < text.length && /[\s;]/.test(text[pos])) pos++;
    if (pos >= text.length) break;
    if (ch() === '#') { while (pos < text.length && text[pos] !== '\n') pos++; continue; }
    const cmd = { a1: address(), a2: null, neg: false, active: false };
    if (cmd.a1) {
      skip();
      if (ch() === ',') {
        pos++;
        skip();
        if (ch() === '+') {
          pos++;
          const m = /^\d+/.exec(text.slice(pos));
          if (!m) fail(t('sed.badAddress'));
          pos += m[0].length;
          cmd.a2 = { plus: Number(m[0]) };
        } else {
          cmd.a2 = address();
          if (!cmd.a2) fail(t('sed.missingAddress'));
        }
      }
    }
    skip();
    while (ch() === '!') { cmd.neg = !cmd.neg; pos++; skip(); }
    const c = text[pos++];
    if (c == null) fail(t('sed.missingCommand'));
    cmd.type = c;
    switch (c) {
      case '{': stack.push(cmds.length); break;
      case '}':
        if (!stack.length) fail(t('sed.unexpectedBrace'));
        cmds[stack.pop()].end = cmds.length;
        break;
      case 's': {
        const delim = text[pos++];
        if (!delim || delim === '\n' || delim === '\\') fail(t('sed.badDelimiter'));
        cmd.re = until(delim, true);
        cmd.rep = until(delim, false);
        const m = /^[gGiIpPe0-9mM]*/.exec(text.slice(pos));
        pos += m[0].length;
        cmd.global = /g/i.test(m[0]);
        cmd.print = /p/i.test(m[0]);
        cmd.ignoreCase = /i/i.test(m[0]);
        cmd.nth = Number(/\d+/.exec(m[0])?.[0] ?? 1);
        break;
      }
      case 'y': {
        const delim = text[pos++];
        const from = [...until(delim, false)], to = [...until(delim, false)];
        if (from.length !== to.length) fail(t('sed.yLengths'));
        cmd.map = new Map(from.map((f, i) => [f, to[i]]));
        break;
      }
      case 'a': case 'i': case 'c': cmd.text = textArg(); break;
      case ':': cmd.label = label(); if (!cmd.label) fail(t('sed.noLabel')); break;
      case 'b': case 't': case 'T': cmd.label = label(); break;
      case 'q': case 'Q': { skip(); const m = /^\d+/.exec(text.slice(pos)); cmd.code = m ? Number(m[0]) : 0; if (m) pos += m[0].length; break; }
      case 'r': case 'w': cmd.file = textArg(); break;
      case 'd': case 'D': case 'p': case 'P': case '=': case 'n': case 'N': case 'h': case 'H': case 'g': case 'G': case 'x': case 'l': case 'z': break;
      default: fail(t('sed.unknownCommand', { cmd: c }));
    }
    cmds.push(cmd);
  }
  if (stack.length) fail(t('sed.unmatchedBrace'));
  const labels = new Map(cmds.map((c, i) => [c, i]).filter(([c]) => c.type === ':').map(([c, i]) => [c.label, i]));
  for (const c of cmds) {
    if ((c.type === 'b' || c.type === 't' || c.type === 'T') && c.label && !labels.has(c.label)) throw new ShellError(t('sed.noSuchLabel', { label: c.label }));
    for (const a of [c.a1, c.a2]) if (a?.re != null) a.compiled = a.re === '' ? null : compile(a.re, { extended, ignoreCase: a.ignoreCase });
    if (c.type === 's') c.compiled = c.re === '' ? null : compile(c.re, { extended, ignoreCase: c.ignoreCase, global: true });
  }
  return { cmds, labels };
}

/** Replacement of s: & the match, \1…\9 the groups, \n a newline, \& a plain &. */
function substitute(rep, m) {
  let out = '';
  for (let i = 0; i < rep.length; i++) {
    const c = rep[i];
    if (c === '&') { out += m[0]; continue; }
    if (c === '\\' && i + 1 < rep.length) {
      const n = rep[++i];
      if (/\d/.test(n)) out += m[Number(n)] ?? '';
      else if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else out += n;
      continue;
    }
    out += c;
  }
  return out;
}

async function run(ctx, program, lines, { quiet, write }) {
  const { cmds, labels } = program;
  let hold = '', lastRe = null, i = 0, code = 0, quit = false;
  for (const c of cmds) c.active = false;
  const last = () => i >= lines.length;
  const test = (a, ps, n) => {
    if (a.line != null) return n === a.line;
    if (a.last) return last();
    if (a.step) return a.step[1] > 0 ? n >= a.step[0] && (n - a.step[0]) % a.step[1] === 0 : n === a.step[0];
    const re = a.compiled ?? lastRe;
    if (!re) throw new ShellError(t('sed.noPreviousRegex'));
    lastRe = re;
    return re.test(ps);
  };
  const matches = (c, ps, n) => {
    let hit;
    if (!c.a1) hit = true;
    else if (!c.a2) hit = test(c.a1, ps, n);
    else if (c.active) {
      hit = true;
      if (c.a2.line != null ? n >= c.a2.line : c.a2.plus != null ? n >= c.end2 : test(c.a2, ps, n)) c.active = false;
    } else if (test(c.a1, ps, n)) {
      hit = true;
      c.active = true;
      if (c.a2.line != null && c.a2.line <= n) c.active = false;
      if (c.a2.plus != null) { c.end2 = n + c.a2.plus; if (c.a2.plus === 0) c.active = false; }
    } else hit = false;
    return c.neg ? !hit : hit;
  };
  let n = 0;
  while (!quit && i < lines.length) {
    let ps = lines[i++];
    n++;
    let appended = '', tflag = false, autoprint = !quiet, restart = false;
    await ctx.tick();
    cycle: for (;;) {
      for (let pc = 0; pc < cmds.length; pc++) {
        const c = cmds[pc];
        if (c.type === '}' || c.type === ':') continue;
        if (!matches(c, ps, n)) {
          if (c.type === '{') pc = c.end;
          continue;
        }
        switch (c.type) {
          case '{': break;
          case 's': {
            const re = c.compiled ?? lastRe;
            if (!re) throw new ShellError(t('sed.noPreviousRegex'));
            lastRe = re;
            let count = 0, done = false;
            const out = ps.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), (...args) => {
              // (match, groups…, offset, string[, named groups])
              const named = typeof args.at(-1) === 'object' && args.at(-1) !== null;
              const groups = args.slice(0, named ? -3 : -2);
              count++;
              if (count < c.nth || (done && !c.global)) return groups[0];
              done = true;
              return substitute(c.rep, groups);
            });
            if (done) {
              ps = out;
              tflag = true;
              if (c.print) await ctx.out(ps + '\n');
            }
            break;
          }
          case 'y': ps = [...ps].map(x => c.map.get(x) ?? x).join(''); break;
          case 'd': autoprint = false; break cycle;
          case 'D':
            if (!ps.includes('\n')) { autoprint = false; break cycle; }
            ps = ps.slice(ps.indexOf('\n') + 1);
            restart = true;
            autoprint = false;
            break cycle;
          case 'p': await ctx.out(ps + '\n'); break;
          case 'P': await ctx.out(ps.split('\n')[0] + '\n'); break;
          case '=': await ctx.out(n + '\n'); break;
          case 'l': await ctx.out(JSON.stringify(ps).slice(1, -1) + '$\n'); break;
          case 'z': ps = ''; break;
          case 'a': appended += c.text + '\n'; break;
          case 'i': await ctx.out(c.text + '\n'); break;
          case 'c':
            if (!c.a2 || !c.active) await ctx.out(c.text + '\n');
            autoprint = false;
            break cycle;
          case 'q': quit = true; code = c.code; break cycle;
          case 'Q': quit = true; code = c.code; autoprint = false; break cycle;
          case 'n':
            if (!quiet) await ctx.out(ps + '\n');
            if (appended) { await ctx.out(appended); appended = ''; }
            if (last()) { autoprint = false; quit = true; break cycle; }
            ps = lines[i++];
            n++;
            break;
          case 'N':
            if (last()) { quit = true; break cycle; }
            ps += '\n' + lines[i++];
            n++;
            break;
          case 'h': hold = ps; break;
          case 'H': hold += '\n' + ps; break;
          case 'g': ps = hold; break;
          case 'G': ps += '\n' + hold; break;
          case 'x': [ps, hold] = [hold, ps]; break;
          case 'b':
            if (!c.label) break cycle;
            pc = labels.get(c.label);
            break;
          case 't': case 'T':
            if (tflag === (c.type === 't')) {
              tflag = false;
              if (!c.label) break cycle;
              pc = labels.get(c.label);
            }
            break;
          case 'r': {
            const node = ctx.resolve(c.file);
            if (node?.type === 'file') appended += await fs.read(node.id);
            break;
          }
          case 'w': write(c.file, ps + '\n'); break;
        }
      }
      break;
    }
    if (autoprint) await ctx.out(ps + '\n');
    if (appended) await ctx.out(appended);
    if (restart && !quit) { lines.splice(i, 0, ps); n--; }
  }
  return code;
}

async function sed(ctx) {
  const { opts, args } = options(ctx, {
    flags: 'nEris', values: 'I', multi: 'ef',
    long: { quiet: 'n', silent: 'n', expression: 'e', file: 'f', 'in-place': 'i', 'regexp-extended': 'E', separate: 's' },
  });
  const rest = [...args];
  const scripts = [...(opts.e ?? [])];
  for (const f of opts.f ?? []) {
    const node = ctx.resolve(f);
    if (node?.type !== 'file') throw new ShellError(t('sed.cannotRead', { path: f }));
    scripts.push(await fs.read(node.id));
  }
  if (!scripts.length) {
    if (!rest.length) throw new ShellError(t('sed.noScript'), 1);
    scripts.push(rest.shift());
  }
  const program = parseScript(scripts.join('\n'), opts.E || opts.r);
  const writes = new Map();
  const write = (file, text) => writes.set(file, (writes.get(file) ?? '') + text);
  let code = 0;
  if (opts.i || opts.I != null) {
    if (!rest.length) throw new ShellError(t('sed.noFiles'));
    for (const file of rest) {
      const node = ctx.resolve(file);
      if (node?.type !== 'file') { await ctx.error(t('sed.cannotRead', { path: file })); code = 2; continue; }
      const text = await fs.read(node.id);
      const { lines, ended } = split(text);
      let out = '';
      const capture = { ...ctx, out: t => { out += t; }, tick: () => ctx.tick(), resolve: p => ctx.resolve(p) };
      code = await run(capture, program, lines, { quiet: opts.n, write }) || code;
      await fs.write(node.id, ended || !out.endsWith('\n') ? out : out.slice(0, -1));
    }
  } else {
    const files = rest.length ? rest : ['-'];
    let lines = [], ended = true;
    for await (const { text } of ctx.inputs(files)) {
      const s = split(text);
      lines.push(...s.lines);
      ended = s.ended;
    }
    let out = '';
    const capture = { ...ctx, out: t => { out += t; }, tick: () => ctx.tick(), resolve: p => ctx.resolve(p) };
    code = await run(capture, program, lines, { quiet: opts.n, write });
    await ctx.out(ended || !out.endsWith('\n') ? out : out.slice(0, -1));
    if (ctx.failed) code = 2;
  }
  for (const [file, text] of writes) await fs.write(ctx.shell.fileFor(file).id, text);
  return code;
}

function split(text) {
  const lines = text.split('\n');
  const ended = text.endsWith('\n') || text === '';
  if (ended) lines.pop();
  return { lines, ended };
}

export const sedCommands = [
  {
    name: 'sed', usage: 'sed [-nEi] [-e script] [script] [file…]', get summary() { return t('help.sed.summary'); }, run: sed,
    get help() { return t('help.sed.text'); },
  },
];
