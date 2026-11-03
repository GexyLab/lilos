import { fs } from '@lilos/sdk';
import { options, int } from './options.js';
import { quote, helpText } from '../shell/Shell.js';
import { parse } from '../shell/parser.js';
import {
  BreakSignal, ContinueSignal, ReturnSignal, ExitSignal, ShellError, ParseError, Incomplete,
} from '../shell/signals.js';
import { t } from '../i18n.js';

/**
 * Commands that change or read the state of the shell: they need ctx.shell. `builtin: true`
 * (type says "comando interno della shell").
 */
const KEYWORDS = ['if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while', 'until', 'do', 'done', 'in', 'function', '{', '}', '!', '[[', ']]'];
const OPTION_NAMES = { errexit: 'e', nounset: 'u', xtrace: 'x', noglob: 'f', pipefail: null };

const ESCAPES = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', v: '\v', '\\': '\\' };

/** Backslash escapes of echo -e, printf and %b. Returns { text, stop } (\c stops the output). */
export function unescape(s, { printf = false } = {}) {
  let text = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== '\\' || i === s.length - 1) { text += c; continue; }
    const n = s[++i];
    if (ESCAPES[n] != null) { text += ESCAPES[n]; continue; }
    if (n === 'c') return { text, stop: true };
    if (printf && n === '"') { text += '"'; continue; }
    let m;
    const rest = s.slice(i);
    if ((m = /^x([0-9a-fA-F]{1,2})/.exec(rest))) { text += String.fromCharCode(parseInt(m[1], 16)); i += m[0].length - 1; continue; }
    if ((m = /^u([0-9a-fA-F]{1,4})/.exec(rest)) || (m = /^U([0-9a-fA-F]{1,8})/.exec(rest))) { text += String.fromCodePoint(Math.min(parseInt(m[1], 16), 0x10ffff)); i += m[0].length - 1; continue; }
    if ((m = (printf ? /^([0-7]{1,3})/ : /^0([0-7]{0,3})/).exec(rest))) { text += String.fromCharCode(parseInt(m[1] || '0', 8)); i += m[0].length - 1; continue; }
    text += '\\' + n;
  }
  return { text, stop: false };
}

/** printf's format, applied again while arguments are left. */
export function format(fmt, args) {
  let out = '', k = 0, errors = [];
  const SPEC = /%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?([diouxXfFeEgGcsbq%])/y;
  const next = () => (k < args.length ? args[k++] : undefined);
  const num = v => {
    if (v == null || v === '') return 0;
    if (/^['"]./.test(v)) return v.codePointAt(1);
    const s = v.trim();
    if (/^[+-]?(0[xX][0-9a-fA-F]+|\d+)$/.test(s)) return Number(s.startsWith('-') ? -Number(s.slice(1)) : Number(s.replace(/^\+/, '')));
    if (/^[+-]?0[0-7]+$/.test(s)) return parseInt(s, 8);
    const f = Number(s);
    if (Number.isFinite(f)) return f;
    errors.push(t('printf.badNumber', { value: v }));
    return 0;
  };
  do {
    const start = k;
    for (let i = 0; i < fmt.length;) {
      const c = fmt[i];
      if (c === '\\') {
        const end = /^\\(x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{1,4}|[0-7]{1,3}|.)/s.exec(fmt.slice(i))[0];
        const { text, stop } = unescape(end, { printf: true });
        out += text;
        if (stop) return { text: out, errors };
        i += end.length;
        continue;
      }
      if (c !== '%') { out += c; i++; continue; }
      SPEC.lastIndex = i;
      const m = SPEC.exec(fmt);
      if (!m) { out += c; i++; continue; }
      i += m[0].length;
      let [, flags, width, precision, conv] = m;
      if (conv === '%') { out += '%'; continue; }
      if (width === '*') width = String(num(next()));
      if (precision === '*') precision = String(num(next()));
      const arg = next();
      let s;
      switch (conv) {
        case 's': s = arg ?? ''; if (precision) s = s.slice(0, Number(precision)); break;
        case 'b': { const r = unescape(arg ?? ''); s = r.text; break; }
        case 'q': s = quote(arg ?? ''); break;
        case 'c': s = (arg ?? '')[0] ?? ''; break;
        case 'd': case 'i': case 'u': {
          const n = Math.trunc(num(arg));
          s = String(Math.abs(n));
          if (precision) s = s.padStart(Number(precision), '0');
          s = (n < 0 ? '-' : flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '') + s;
          break;
        }
        case 'o': s = (flags.includes('#') ? '0' : '') + Math.trunc(num(arg)).toString(8); break;
        case 'x': s = (flags.includes('#') ? '0x' : '') + Math.trunc(num(arg)).toString(16); break;
        case 'X': s = (flags.includes('#') ? '0X' : '') + Math.trunc(num(arg)).toString(16).toUpperCase(); break;
        default: {
          const n = num(arg), p = precision === undefined || precision === '' ? 6 : Number(precision);
          s = conv === 'e' || conv === 'E' ? n.toExponential(p).replace(/e([+-])(\d)$/, 'e$10$2') : conv === 'g' || conv === 'G' ? String(Number(n.toPrecision(p || 1))) : n.toFixed(p);
          if (conv === 'E' || conv === 'G') s = s.toUpperCase();
          if (n >= 0 && flags.includes('+')) s = '+' + s;
        }
      }
      const w = Number(width ?? 0);
      if (s.length < w) {
        if (flags.includes('-')) s = s.padEnd(w);
        else if (flags.includes('0') && /[diouxXfFeEgG]/.test(conv)) {
          const sign = /^[+-]/.test(s) ? s[0] : '';
          s = sign + s.slice(sign.length).padStart(w - sign.length, '0');
        } else s = s.padStart(w);
      }
      out += s;
    }
    if (k === start) break;
  } while (k < args.length);
  return { text: out, errors };
}

/** Evaluates the arguments of test / [ . */
function test(shell, a) {
  let i = 0;
  const BIN = ['=', '==', '!=', '<', '>', '-eq', '-ne', '-lt', '-le', '-gt', '-ge', '-nt', '-ot', '-ef'];
  const UNARY = /^-[a-zA-Z]$/;
  if (a.length === 1) return a[0] !== '';
  const or = () => {
    let v = and();
    while (a[i] === '-o') { i++; const r = and(); v = v || r; }
    return v;
  };
  const and = () => {
    let v = not();
    while (a[i] === '-a') { i++; const r = not(); v = v && r; }
    return v;
  };
  const not = () => {
    if (a[i] === '!' && i + 1 < a.length) { i++; return !not(); }
    return primary();
  };
  const primary = () => {
    if (i >= a.length) throw new ShellError(t('test.argumentExpected'), 2);
    if (a[i] === '(' && i + 2 < a.length) {
      i++;
      const v = or();
      if (a[i] !== ')') throw new ShellError(t('err.missingParen'), 2);
      i++;
      return v;
    }
    if (i + 2 < a.length + 0 && BIN.includes(a[i + 1]) && i + 2 <= a.length - 1) {
      const v = shell.binaryTest(a[i + 1], a[i], a[i + 2]);
      i += 3;
      return v;
    }
    if (UNARY.test(a[i]) && i + 1 < a.length) {
      const v = shell.unaryTest(a[i], a[i + 1]);
      i += 2;
      return v;
    }
    return a[i++] !== '';
  };
  if (!a.length) return false;
  const v = or();
  if (i < a.length) throw new ShellError(t('test.unexpectedArgument', { arg: a[i] }), 2);
  return v;
}

function printVar(name, v) {
  const flags = (Array.isArray(v.value) ? 'a' : '') + (v.exported ? 'x' : '') + (v.readonly ? 'r' : '');
  const value = Array.isArray(v.value)
    ? `(${Object.keys(v.value).map(k => `[${k}]=${JSON.stringify(v.value[k])}`).join(' ')})`
    : JSON.stringify(v.value);
  return `declare -${flags || '-'} ${name}=${value}\n`;
}

/** Declares variables: local, declare, typeset, readonly, export share this. */
async function declare(ctx, { local = false, exported, readonly = false, flags = 'axrigpfFn' } = {}) {
  const shell = ctx.shell;
  const { opts, args } = options(ctx, { flags });
  if (opts.f || opts.F) {
    const names = args.length ? args : [...shell.functions.keys()].sort();
    let status = 0;
    for (const name of names) {
      const fn = shell.functions.get(name);
      if (!fn) { status = 1; continue; }
      await ctx.out(opts.F ? `declare -f ${name}\n` : `${fn.text}\n`);
    }
    return status;
  }
  const isLocal = local || (ctx.name !== 'export' && ctx.name !== 'readonly' && shell.funcDepth > 0 && !opts.g);
  if (!args.length || opts.p) {
    const vars = shell.variables().filter(([n, v]) => (!args.length || args.includes(n))
      && (!(opts.x || ctx.name === 'export') || v.exported) && (!(opts.r || ctx.name === 'readonly') || v.readonly) && (!opts.a || Array.isArray(v.value)));
    for (const [name, v] of vars) await ctx.out(printVar(name, v));
    return 0;
  }
  let status = 0;
  for (const arg of args) {
    const m = /^([A-Za-z_]\w*)(?:\[([^\]]*)\])?(\+?)(?:=(.*))?$/s.exec(arg);
    if (!m) { await ctx.error(t('err.badIdentifier', { name: arg })); status = 1; continue; }
    const [, name, index, append, value] = m;
    const exp = opts.n ? false : opts.x || exported ? true : undefined;
    if (value === undefined) {
      shell.setVar(name, opts.a && !shell.isSet(name) ? [] : undefined, null, { local: isLocal, exported: exp, readonly: readonly || opts.r });
      continue;
    }
    const arrayLiteral = /^\((.*)\)$/s.exec(value);
    const parsed = shell.declArrays?.get(name);
    if (arrayLiteral && (opts.a || parsed)) {
      shell.declArrays?.delete(name);
      let items = parsed ?? (arrayLiteral[1].trim() ? arrayLiteral[1].trim().split(/\s+/) : []);
      if (append) items = [...(shell.getArray(name) ?? []), ...items];
      shell.setVar(name, items, null, { local: isLocal, exported: exp, readonly: readonly || opts.r });
      continue;
    }
    const idx = index != null ? shell.arrayIndex(index) : null;
    const final = append ? (shell.getVar(name, idx) ?? '') + value : value;
    shell.setVar(name, opts.i ? String(shell.arith(final)) : final, idx, { local: isLocal, exported: exp, readonly: readonly || opts.r });
  }
  return status;
}

const exitCode = (ctx, value, fallback) => {
  if (value == null) return fallback;
  if (!/^-?\d+$/.test(value)) throw new ShellError(t('err.numericArgument', { value }), 2);
  return ((Number(value) % 256) + 256) % 256;
};

export const builtins = [
  {
    name: 'cd', get usage() { return t('help.cd.usage'); }, get summary() { return t('help.cd.summary'); },
    get help() { return t('help.cd.text'); },
    async run(ctx) {
      const shell = ctx.shell;
      const { args } = options(ctx, { flags: 'LPe' });
      let target = args[0] ?? shell.getVar('HOME') ?? '~';
      if (args.length > 1) throw new ShellError(t('err.tooManyArguments'));
      if (target === '-') {
        target = shell.getVar('OLDPWD');
        if (target == null) throw new ShellError(t('cd.oldpwdNotSet'));
        await ctx.out(target + '\n');
      }
      const node = ctx.resolve(target);
      if (!node) throw new ShellError(t('err.noSuchFile', { path: target }));
      if (node.type !== 'folder') throw new ShellError(t('err.notADirectory', { path: target }));
      shell.cwd = node.id;
    },
  },
  {
    name: 'pwd', usage: 'pwd', get summary() { return t('help.pwd.summary'); },
    async run(ctx) { await ctx.out(fs.path(ctx.cwd) + '\n'); },
  },
  {
    name: 'echo', ownHelp: true, get usage() { return t('help.echo.usage'); }, get summary() { return t('help.echo.summary'); },
    get help() { return t('help.echo.text'); },
    async run(ctx) {
      let args = ctx.args, newline = true, escapes = false;
      while (args.length && /^-[neE]+$/.test(args[0])) {
        for (const f of args[0].slice(1)) {
          if (f === 'n') newline = false;
          else escapes = f === 'e';
        }
        args = args.slice(1);
      }
      let text = args.join(' ');
      if (escapes) {
        const r = unescape(text);
        text = r.text;
        if (r.stop) newline = false;
      }
      await ctx.out(text + (newline ? '\n' : ''));
    },
  },
  {
    name: 'printf', ownHelp: true, get usage() { return t('help.printf.usage'); }, get summary() { return t('help.printf.summary'); },
    get help() { return t('help.printf.text'); },
    async run(ctx) {
      let args = ctx.args, target = null;
      if (args[0] === '-v') { target = args[1]; args = args.slice(2); }
      if (args[0] === '--') args = args.slice(1);
      if (!args.length) throw new ShellError(t('help.usageShort', { usage: this.usage }), 2);
      const { text, errors } = format(args[0], args.slice(1));
      for (const e of errors) await ctx.error(e);
      if (target) ctx.shell.setVar(target, text);
      else await ctx.out(text);
      return errors.length ? 1 : 0;
    },
  },
  {
    name: 'export', get usage() { return t('help.export.usage'); }, get summary() { return t('help.export.summary'); },
    get help() { return t('help.export.text'); },
    run: ctx => declare(ctx, { exported: true, flags: 'npf' }),
  },
  {
    name: 'readonly', get usage() { return t('help.readonly.usage'); }, get summary() { return t('help.readonly.summary'); },
    run: ctx => declare(ctx, { readonly: true, flags: 'ap' }),
  },
  {
    name: 'local', get usage() { return t('help.local.usage'); }, get summary() { return t('help.local.summary'); },
    run(ctx) {
      if (!ctx.shell.funcDepth) throw new ShellError(t('local.onlyInFunction'));
      return declare(ctx, { local: true, flags: 'axrin' });
    },
  },
  {
    name: 'declare', get usage() { return t('help.declare.usage'); }, get summary() { return t('help.declare.summary'); },
    get help() { return t('help.declare.text'); },
    run: ctx => declare(ctx),
  },
  { name: 'typeset', get usage() { return t('help.typeset.usage'); }, get summary() { return t('help.typeset.summary'); }, run: ctx => declare(ctx) },
  {
    name: 'unset', get usage() { return t('help.unset.usage'); }, get summary() { return t('help.unset.summary'); },
    async run(ctx) {
      const { opts, args } = options(ctx, { flags: 'fv' });
      for (const arg of args) {
        if (opts.f) { ctx.shell.functions.delete(arg); continue; }
        const m = /^([A-Za-z_]\w*)(?:\[(.*)\])?$/.exec(arg);
        if (!m) throw new ShellError(t('err.badIdentifier', { name: arg }));
        if (m[2] == null && !opts.v && !ctx.shell.isSet(m[1]) && ctx.shell.functions.has(m[1])) ctx.shell.functions.delete(m[1]);
        else ctx.shell.unsetVar(m[1], m[2] == null ? null : ctx.shell.arrayIndex(m[2]));
      }
    },
  },
  {
    name: 'env', get usage() { return t('help.env.usage'); }, get summary() { return t('help.env.summary'); },
    async run(ctx) {
      const args = [...ctx.args];
      const extra = new Map();
      while (args.length && /^[A-Za-z_]\w*=/.test(args[0])) {
        const [name, value] = args.shift().split(/=(.*)/s);
        extra.set(name, { value, exported: true });
      }
      if (!args.length) {
        const env = { ...ctx.shell.environment(), ...Object.fromEntries([...extra].map(([k, v]) => [k, v.value])) };
        for (const k of Object.keys(env).sort()) await ctx.out(`${k}=${env[k]}\n`);
        return 0;
      }
      ctx.shell.scopes.push(extra);
      try {
        return await ctx.shell.invoke(args, ctx.io, { functions: false });
      } finally {
        ctx.shell.scopes.splice(ctx.shell.scopes.indexOf(extra), 1);
      }
    },
  },
  {
    name: 'printenv', get usage() { return t('help.printenv.usage'); }, get summary() { return t('help.printenv.summary'); },
    async run(ctx) {
      const env = ctx.shell.environment();
      if (!ctx.args.length) {
        for (const k of Object.keys(env).sort()) await ctx.out(`${k}=${env[k]}\n`);
        return 0;
      }
      let status = 0;
      for (const name of ctx.args) {
        if (name in env) await ctx.out(env[name] + '\n');
        else status = 1;
      }
      return status;
    },
  },
  {
    name: 'set', ownHelp: true, get usage() { return t('help.set.usage'); }, get summary() { return t('help.set.summary'); },
    get help() { return t('help.set.text'); },
    async run(ctx) {
      const shell = ctx.shell;
      const args = ctx.args;
      if (!args.length) {
        for (const [name, v] of shell.variables()) await ctx.out(`${name}=${Array.isArray(v.value) ? `(${v.value.map(quote).join(' ')})` : quote(v.value)}\n`);
        return 0;
      }
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--') { shell.positional = args.slice(i + 1); return 0; }
        if (/^[-+]o$/.test(a)) {
          const name = args[++i];
          if (name == null) {
            for (const [o] of Object.entries(OPTION_NAMES)) await ctx.out(`${o.padEnd(15)}${shell.options[o] ? 'on' : 'off'}\n`);
            continue;
          }
          if (!(name in OPTION_NAMES)) throw new ShellError(t('set.badOptionName', { name }), 2);
          shell.options[name] = a[0] === '-';
          continue;
        }
        if (/^[-+][euxfv]+$/.test(a)) {
          for (const f of a.slice(1)) {
            const name = Object.keys(OPTION_NAMES).find(k => OPTION_NAMES[k] === f);
            if (name) shell.options[name] = a[0] === '-';
          }
          continue;
        }
        if (/^[-+]/.test(a) && a.length > 1) throw new ShellError(t('set.badOption', { option: a }), 2);
        shell.positional = args.slice(i);
        return 0;
      }
      return 0;
    },
  },
  {
    name: 'shift', usage: 'shift [n]', get summary() { return t('help.shift.summary'); },
    run(ctx) {
      const n = ctx.args[0] == null ? 1 : int(ctx.args[0]);
      if (n > ctx.shell.positional.length) return 1;
      ctx.shell.positional = ctx.shell.positional.slice(n);
      return 0;
    },
  },
  { name: 'true', ownHelp: true, usage: 'true', get summary() { return t('help.true.summary'); }, run: () => 0 },
  { name: 'false', ownHelp: true, usage: 'false', get summary() { return t('help.false.summary'); }, run: () => 1 },
  { name: ':', ownHelp: true, get usage() { return t('help.colon.usage'); }, get summary() { return t('help.colon.summary'); }, run: () => 0 },
  {
    name: 'test', ownHelp: true, get usage() { return t('help.test.usage'); }, get summary() { return t('help.test.summary'); },
    get help() { return t('help.test.text'); },
    run: ctx => (test(ctx.shell, ctx.args) ? 0 : 1),
  },
  {
    name: '[', ownHelp: true, get usage() { return t('help.bracket.usage'); }, get summary() { return t('help.bracket.summary'); },
    run(ctx) {
      if (ctx.args.at(-1) !== ']') throw new ShellError(t('test.missingBracket'), 2);
      return test(ctx.shell, ctx.args.slice(0, -1)) ? 0 : 1;
    },
  },
  {
    name: 'let', ownHelp: true, get usage() { return t('help.let.usage'); }, get summary() { return t('help.let.summary'); },
    run(ctx) {
      if (!ctx.args.length) throw new ShellError(t('let.noExpression'), 2);
      let v = 0n;
      for (const e of ctx.args) v = ctx.shell.arith(e);
      return v !== 0n ? 0 : 1;
    },
  },
  {
    name: 'exit', get usage() { return t('help.exit.usage'); }, get summary() { return t('help.exit.summary'); },
    run(ctx) { throw new ExitSignal(exitCode(ctx, ctx.args[0], ctx.shell.status)); },
  },
  {
    name: 'return', get usage() { return t('help.return.usage'); }, get summary() { return t('help.return.summary'); },
    run(ctx) {
      if (!ctx.shell.funcDepth && !ctx.shell.sourceDepth) throw new ShellError(t('return.onlyInFunction'));
      throw new ReturnSignal(exitCode(ctx, ctx.args[0], ctx.shell.status));
    },
  },
  {
    name: 'break', usage: 'break [n]', get summary() { return t('help.break.summary'); },
    async run(ctx) {
      if (!ctx.shell.loopDepth) { await ctx.error(t('loop.onlyInLoop')); return 0; }
      const n = ctx.args[0] == null ? 1 : int(ctx.args[0]);
      if (n < 1) throw new ShellError(t('loop.badCount', { n }));
      throw new BreakSignal(Math.min(n, ctx.shell.loopDepth));
    },
  },
  {
    name: 'continue', usage: 'continue [n]', get summary() { return t('help.continue.summary'); },
    async run(ctx) {
      if (!ctx.shell.loopDepth) { await ctx.error(t('loop.onlyInLoop')); return 0; }
      const n = ctx.args[0] == null ? 1 : int(ctx.args[0]);
      if (n < 1) throw new ShellError(t('loop.badCount', { n }));
      throw new ContinueSignal(Math.min(n, ctx.shell.loopDepth));
    },
  },
  {
    name: 'read', get usage() { return t('help.read.usage'); }, get summary() { return t('help.read.summary'); },
    get help() { return t('help.read.text'); },
    async run(ctx) {
      const shell = ctx.shell;
      const { opts, args } = options(ctx, { flags: 'rs', values: 'pad' });
      if (opts.p) await ctx.err(opts.p);
      const delim = opts.d === undefined ? '\n' : opts.d[0] ?? '\0';
      ctx.stdin.silent = !!opts.s;
      let line;
      try {
        line = await ctx.stdin.readLine(delim);
        if (line != null && !opts.r) {
          while (/(^|[^\\])(\\\\)*\\$/.test(line)) {
            const more = await ctx.stdin.readLine(delim);
            line = line.slice(0, -1) + (more ?? '');
            if (more == null) break;
          }
        }
      } finally {
        ctx.stdin.silent = false;
      }
      if (opts.s && ctx.stdin === shell.host.stdin) await ctx.err('\n');
      const eof = line == null;
      line ??= '';
      const raw = opts.r ? line : line.replace(/\\(.)/g, '$1');
      const ifs = shell.getVar('IFS') ?? ' \t\n';
      const ws = [...ifs].filter(c => /\s/.test(c)).join('');
      const trim = s => s.replace(new RegExp(`^[${escapeClass(ws)}]+|[${escapeClass(ws)}]+$`, 'g'), '');
      const split = s => (ifs ? trim(s).split(new RegExp(`[${escapeClass(ws)}]*[${escapeClass(ifs)}][${escapeClass(ws)}]*|[${escapeClass(ws)}]+`)).filter((x, i, all) => x !== '' || i < all.length - 1) : [s]);
      if (opts.a) {
        shell.setVar(opts.a, raw === '' ? [] : split(raw));
        return eof ? 1 : 0;
      }
      if (!args.length) {
        shell.setVar('REPLY', line);
        return eof && !line ? 1 : eof ? 1 : 0;
      }
      let rest = ifs ? trim(raw) : raw;
      args.forEach((name, i) => {
        if (i === args.length - 1) { shell.setVar(name, rest); return; }
        const m = ifs ? new RegExp(`^([^${escapeClass(ifs)}]*)(?:[${escapeClass(ws)}]*[${escapeClass(ifs)}][${escapeClass(ws)}]*|[${escapeClass(ws)}]+|$)`).exec(rest) : null;
        shell.setVar(name, m ? m[1] : rest);
        rest = m ? rest.slice(m[0].length) : '';
      });
      return eof ? 1 : 0;
    },
  },
  {
    name: 'source', get usage() { return t('help.source.usage'); }, get summary() { return t('help.source.summary'); },
    run: ctx => source(ctx),
  },
  { name: '.', get usage() { return t('help.dot.usage'); }, get summary() { return t('help.dot.summary'); }, run: ctx => source(ctx) },
  {
    name: 'eval', ownHelp: true, get usage() { return t('help.eval.usage'); }, get summary() { return t('help.eval.summary'); },
    async run(ctx) {
      try {
        return await ctx.shell.run(ctx.args.join(' '), ctx.io);
      } catch (err) {
        if (err instanceof ParseError || err instanceof Incomplete) throw new ShellError(err.message || t('parse.unexpectedEnd'), 2);
        throw err;
      }
    },
  },
  {
    name: 'alias', get usage() { return t('help.alias.usage'); }, get summary() { return t('help.alias.summary'); },
    get help() { return t('help.alias.text'); },
    async run(ctx) {
      const aliases = ctx.shell.aliases;
      const { args } = options(ctx, { flags: 'p' });
      if (!args.length) {
        for (const [k, v] of [...aliases].sort()) await ctx.out(`alias ${k}=${quote(v)}\n`);
        return 0;
      }
      let status = 0;
      for (const arg of args) {
        const eq = arg.indexOf('=');
        if (eq > 0) {
          const name = arg.slice(0, eq);
          if (/[\s/$`=|&;<>()'"\\]/.test(name)) { await ctx.error(t('alias.badName', { name })); status = 1; continue; }
          aliases.set(name, arg.slice(eq + 1));
        } else if (aliases.has(arg)) await ctx.out(`alias ${arg}=${quote(aliases.get(arg))}\n`);
        else { await ctx.error(t('err.notFound', { name: arg })); status = 1; }
      }
      return status;
    },
  },
  {
    name: 'unalias', get usage() { return t('help.unalias.usage'); }, get summary() { return t('help.unalias.summary'); },
    async run(ctx) {
      const { opts, args } = options(ctx, { flags: 'a' });
      if (opts.a) { ctx.shell.aliases.clear(); return 0; }
      let status = 0;
      for (const name of args) {
        if (!ctx.shell.aliases.delete(name)) { await ctx.error(t('err.notFound', { name })); status = 1; }
      }
      return status;
    },
  },
  {
    name: 'type', get usage() { return t('help.type.usage'); }, get summary() { return t('help.type.summary'); },
    async run(ctx) {
      const { opts, args } = options(ctx, { flags: 'ta' });
      let status = 0;
      for (const name of args) {
        const what = describe(ctx.shell, name);
        if (!what) { if (!opts.t) await ctx.error(t('err.notFound', { name })); status = 1; continue; }
        if (opts.t) { await ctx.out(what.kind + '\n'); continue; }
        await ctx.out(what.text + '\n');
      }
      return status;
    },
  },
  {
    name: 'command', get usage() { return t('help.command.usage'); }, get summary() { return t('help.command.summary'); },
    async run(ctx) {
      const { opts, args } = options(ctx, { flags: 'vVp', stopAtArg: true });
      if (!args.length) return 0;
      if (opts.v || opts.V) {
        let status = 0;
        for (const name of args) {
          const what = describe(ctx.shell, name);
          if (!what) { status = 1; continue; }
          await ctx.out((opts.V ? what.text : what.kind === 'alias' ? `alias ${name}=${quote(ctx.shell.aliases.get(name))}` : what.path ?? name) + '\n');
        }
        return status;
      }
      return ctx.shell.invoke(args, ctx.io, { functions: false });
    },
  },
  {
    name: 'which', get usage() { return t('help.which.usage'); }, get summary() { return t('help.which.summary'); },
    async run(ctx) {
      let status = 0;
      for (const name of ctx.args) {
        const what = describe(ctx.shell, name);
        if (!what || what.kind === 'alias' || what.kind === 'keyword' || what.kind === 'function') { status = 1; continue; }
        await ctx.out((what.path ?? t('which.builtIn', { name })) + '\n');
      }
      return status;
    },
  },
  {
    name: 'history', usage: 'history [-c] [n]', get summary() { return t('help.history.summary'); },
    async run(ctx) {
      const { opts, args } = options(ctx, { flags: 'c' });
      const history = ctx.shell.host.history;
      if (!history) return 0;
      if (opts.c) { history.clear(); return 0; }
      const list = history.list();
      const n = args[0] == null ? list.length : int(args[0]);
      const from = Math.max(0, list.length - n);
      for (let i = from; i < list.length; i++) await ctx.out(`${String(i + 1).padStart(5)}  ${list[i]}\n`);
    },
  },
  {
    name: 'help', get usage() { return t('help.help.usage'); }, get summary() { return t('help.help.summary'); },
    async run(ctx) {
      const commands = ctx.shell.commands;
      if (ctx.args.length) {
        let status = 0;
        for (const name of ctx.args) {
          const cmd = commands.get(name);
          if (cmd) await ctx.out(helpText(cmd));
          else if (findTopic(name)) await ctx.out(SYNTAX[findTopic(name)]().trim() + '\n');
          else { await ctx.error(t('help.noHelp', { name })); status = 1; }
        }
        return status;
      }
      const all = [...commands.values()].filter((c, i, list) => list.indexOf(c) === i && !c.hidden).sort((a, b) => a.name.localeCompare(b.name));
      const width = Math.max(...all.map(c => c.name.length)) + 2;
      await ctx.out(`${t('help.intro')}\n\n`);
      for (const c of all) await ctx.out(`  ${c.name.padEnd(width)}${c.summary ?? ''}${c.app ? ` (${c.app})` : ''}\n`);
      await ctx.out(`\n${t('help.syntaxList', { list: Object.keys(SYNTAX).map(topicName).join(', ') })}\n`);
    },
  },
  {
    name: 'clear', usage: 'clear', get summary() { return t('help.clear.summary'); },
    async run(ctx) { if (ctx.stdout === ctx.shell.host.stdout) ctx.shell.host.clear?.(); else await ctx.out('\x1b[2J\x1b[H'); },
  },
  {
    name: 'jobs', usage: 'jobs [-lp]', get summary() { return t('help.jobs.summary'); },
    async run(ctx) {
      const { opts } = options(ctx, { flags: 'lp' });
      const list = ctx.shell.jobs.list;
      for (const j of list) {
        const mark = j === list.at(-1) ? '+' : j === list.at(-2) ? '-' : ' ';
        if (opts.p) await ctx.out(`${j.pid}\n`);
        else await ctx.out(`[${j.id}]${mark} ${opts.l ? `${j.pid} ` : ''}${j.state === 'done' ? (j.code === 0 ? t('jobs.done') : t('jobs.exit', { code: j.code })) : t('jobs.running')}\t\t${j.text}\n`);
      }
    },
  },
  {
    name: 'wait', usage: 'wait [%job | pid…]', get summary() { return t('help.wait.summary'); },
    async run(ctx) {
      const shell = ctx.shell;
      if (!ctx.args.length) {
        let status = 0;
        for (const job of [...shell.jobs.list]) status = await shell.waitJob(job);
        return status;
      }
      let status = 0;
      for (const spec of ctx.args) {
        const job = shell.findJob(spec);
        if (!job) { await ctx.error(t('wait.notAJob', { spec })); status = 127; continue; }
        status = await shell.waitJob(job);
      }
      return status;
    },
  },
  {
    name: 'fg', usage: 'fg [%job]', get summary() { return t('help.fg.summary'); },
    async run(ctx) {
      const shell = ctx.shell;
      const job = shell.findJob(ctx.args[0]);
      if (!job) throw new ShellError(t('fg.noSuchJob', { job: ctx.args[0] ?? t('fg.current') }));
      await ctx.out(job.text + '\n');
      const code = await shell.waitJob(job, { forward: true });
      shell.jobs.list = shell.jobs.list.filter(j => j !== job);
      return code;
    },
  },
  {
    name: 'kill', get usage() { return t('help.kill.usage'); }, get summary() { return t('help.kill.summary'); },
    async run(ctx) {
      let args = ctx.args;
      if (args[0] === '-l') { await ctx.out('HUP INT QUIT KILL TERM\n'); return 0; }
      if (args[0] === '-s' || args[0] === '-n') args = args.slice(2);
      else if (/^-\w+$/.test(args[0] ?? '')) args = args.slice(1);
      if (!args.length) throw new ShellError(t('help.usageShort', { usage: this.usage }), 2);
      let status = 0;
      for (const spec of args) {
        const job = ctx.shell.findJob(spec);
        if (!job) { await ctx.error(t('kill.noSuchJob', { spec })); status = 1; continue; }
        job.token.abort();
      }
      return status;
    },
  },
  {
    name: 'sleep', get usage() { return t('help.sleep.usage'); }, get summary() { return t('help.sleep.summary'); },
    async run(ctx) {
      if (!ctx.args.length) throw new ShellError(t('sleep.missing'), 2);
      let ms = 0;
      for (const a of ctx.args) {
        const m = /^(\d+(?:\.\d*)?|\.\d+)([smhd]?)$/.exec(a);
        if (!m) throw new ShellError(t('sleep.badDuration', { value: a }), 2);
        ms += Number(m[1]) * { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2]] * 1000;
      }
      await ctx.shell.sleep(ms);
    },
  },
  {
    name: 'bash', get usage() { return t('help.bash.usage'); }, get summary() { return t('help.bash.summary'); },
    get help() { return t('help.bash.text'); },
    run: ctx => runBash(ctx),
  },
  { name: 'sh', get usage() { return t('help.sh.usage'); }, get summary() { return t('help.sh.summary'); }, run: ctx => runBash(ctx) },
];

async function source(ctx) {
  const shell = ctx.shell;
  const [file, ...args] = ctx.args;
  if (!file) throw new ShellError(t('source.noFile'), 2);
  let path = file;
  if (!file.includes('/') && !ctx.resolve(file)) {
    const dir = (shell.getVar('PATH') ?? '').split(':').find(d => d && ctx.resolve(`${d}/${file}`)?.type === 'file');
    if (dir) path = `${dir}/${file}`;
  }
  const text = await shell.readScript(path);
  try {
    parse(text, { aliases: shell.aliases });
  } catch (err) {
    if (err instanceof ParseError || err instanceof Incomplete) throw new ShellError(`${file}: ${err.message || t('parse.unexpectedEndOfFile')}`, 2);
    throw err;
  }
  const saved = shell.positional;
  if (args.length) shell.positional = args;
  shell.sourceDepth = (shell.sourceDepth ?? 0) + 1;
  try {
    return await shell.exec({ type: 'script', source: text }, ctx.io);
  } catch (err) {
    if (err instanceof ReturnSignal) return err.code;
    throw err;
  } finally {
    shell.sourceDepth--;
    if (args.length) shell.positional = saved;
  }
}

async function runBash(ctx) {
  const shell = ctx.shell;
  const args = [...ctx.args];
  const flags = { e: false, x: false, u: false };
  let command = null;
  while (args.length && /^-[cexu]+$/.test(args[0])) {
    for (const f of args.shift().slice(1)) {
      if (f === 'c') command = args.shift();
      else flags[f] = true;
    }
  }
  if (command == null && args[0] === '-c') throw new ShellError(t('bash.noCommand'), 2);
  const sub = shell.subshell({ script: true });
  Object.assign(sub.options, { errexit: flags.e, xtrace: flags.x, nounset: flags.u });
  if (command != null) {
    sub.setVar('0', args[0] ?? 'bash');
    sub.positional = args.slice(1);
    return sub.runSource(command, ctx.io, 'bash');
  }
  if (args.length) {
    sub.setVar('0', args[0]);
    sub.positional = args.slice(1);
    let text;
    try {
      text = await shell.readScript(args[0]);
    } catch (err) {
      if (err instanceof ShellError) throw new ShellError(err.message, err.code);
      throw err;
    }
    return sub.runSource(text, ctx.io, args[0]);
  }
  if (ctx.stdin === shell.host.stdin) {
    await ctx.err(`${t('bash.already')}\n`);
    return 0;
  }
  return sub.runSource(await ctx.stdin.readAll(), ctx.io, 'bash');
}

/** { kind, text, path? } for type, command -v and which; null if unknown. */
export function describe(shell, name) {
  if (shell.aliases.has(name)) return { kind: 'alias', text: t('type.alias', { name, value: shell.aliases.get(name) }) };
  if (KEYWORDS.includes(name)) return { kind: 'keyword', text: t('type.keyword', { name }) };
  if (shell.functions.has(name)) return { kind: 'function', text: `${t('type.function', { name })}\n${shell.functions.get(name).text}` };
  const cmd = shell.commands.get(name);
  if (cmd?.builtin) return { kind: 'builtin', text: t('type.builtin', { name }) };
  if (cmd?.app) return { kind: 'file', text: t('type.appCommand', { name, app: cmd.app }) };
  if (cmd) return { kind: 'file', text: t('type.command', { name }) };
  for (const dir of (shell.getVar('PATH') ?? '').split(':').filter(Boolean)) {
    for (const file of [name, `${name}.sh`]) {
      const node = shell.resolve(`${dir}/${file}`);
      if (node?.type === 'file') return { kind: 'file', text: t('type.file', { name, path: fs.path(node.id) }), path: fs.path(node.id) };
    }
  }
  if (name.includes('/') && shell.resolve(name)?.type === 'file') return { kind: 'file', text: t('type.file', { name, path: name }), path: name };
  return null;
}

const escapeClass = s => s.replace(/[\]\\^-]/g, '\\$&');

/** `help if`, `help for`…: the syntax, in the language of the moment. */
const SYNTAX = {
  if: () => t('syntax.if'),
  for: () => t('syntax.for'),
  while: () => t('syntax.while'),
  until: () => t('syntax.until'),
  case: () => t('syntax.case'),
  function: () => t('syntax.function'),
  '[[': () => t('syntax.cond'),
  '((': () => t('syntax.arith'),
  variables: () => t('syntax.variables'),
  redirections: () => t('syntax.redirections'),
};

/** The name of a topic as shown and typed: `help variabili` in Italian. */
const topicName = topic => ({ variables: t('syntax.topic.variables'), redirections: t('syntax.topic.redirections') })[topic] ?? topic;
const findTopic = name => Object.keys(SYNTAX).find(topic => topic === name || topicName(topic) === name);
