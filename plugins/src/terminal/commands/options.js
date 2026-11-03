import { ShellError } from '../shell/signals.js';
import { t } from '../i18n.js';

/**
 * Options of a command, GNU style: `-la`, `-n 5`, `-n5`, `--lines=5`, `--lines 5`, `--` ends them,
 * `-` alone is an argument; options may come after arguments.
 *
 *   const { opts, args } = options(ctx, { flags: 'lar', values: 'n', long: { all: 'a', lines: 'n' } });
 *   opts.l → true, opts.n → '5' (the last given), opts.e → ['a', 'b'] with multi: 'e'
 * `number: true` accepts `-5` as `-n 5` (head, tail). `stopAtArg: true` stops at the first argument.
 */
export function options(ctx, { flags = '', values = '', multi = '', long = {}, number = false, stopAtArg = false } = {}) {
  const opts = {}, args = [];
  const list = ctx.args;
  const set = (k, v) => {
    if (multi.includes(k)) (opts[k] ??= []).push(v);
    else opts[k] = v;
  };
  const bad = what => new ShellError(`${t('opt.invalid', { option: what })}${ctx.cmd.usage ? `\n${t('help.usageLine', { usage: ctx.cmd.usage })}` : ''}`, 2);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--') { args.push(...list.slice(i + 1)); break; }
    if (a.startsWith('--') && a.length > 2) {
      const [name, inline] = a.slice(2).split(/=(.*)/s);
      const key = long[name];
      if (key == null) throw bad(`--${name}`);
      if (values.includes(key) || multi.includes(key)) {
        const v = inline ?? list[++i];
        if (v == null) throw new ShellError(t('opt.longNeedsArgument', { name }), 2);
        set(key, v);
      } else opts[key] = true;
      continue;
    }
    if (a.startsWith('-') && a.length > 1) {
      if (number && /^-\d+$/.test(a)) { opts.n = a.slice(1); continue; }
      for (let j = 1; j < a.length; j++) {
        const c = a[j];
        if (values.includes(c) || multi.includes(c)) {
          const v = j + 1 < a.length ? a.slice(j + 1) : list[++i];
          if (v == null) throw new ShellError(t('opt.needsArgument', { option: c }), 2);
          set(c, v);
          break;
        }
        if (!flags.includes(c)) throw bad(c);
        opts[c] = true;
      }
      continue;
    }
    if (stopAtArg) { args.push(...list.slice(i)); break; }
    args.push(a);
  }
  return { opts, args };
}

/** A whole number option ('5', '+5', '-5'), or a usage error. */
export function int(value) {
  if (!/^[+-]?\d+$/.test(String(value))) throw new ShellError(t('opt.badNumber', { value }), 2);
  return Number(value);
}
