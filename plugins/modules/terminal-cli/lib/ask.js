import { t } from './strings.js';

/**
 * A yes/no question of a command, answered on its standard input (the keyboard in the interactive
 * shell). `yes`: what Enter means ([S/n] or [s/N]). Without an answer (the input ended: lilos run
 * from a script) it is no, and the command says to give -y.
 */
export async function confirm(ctx, question, { yes = true } = {}) {
  await ctx.out(`${question} ${yes ? t('ask.yesDefault') : t('ask.noDefault')} `);
  const line = await ctx.stdin.readLine();
  if (line == null) {
    await ctx.out('\n');
    await ctx.err(`${ctx.name}: ${t('ask.noAnswer')}\n`);
    return false;
  }
  // Answered from a pipe or a file: the answer shown, as if typed
  if (!process.stdin.isTTY) await ctx.out(`${line}\n`);
  const a = line.trim().toLowerCase();
  if (!a) return yes;
  return ['s', 'si', 'sì', 'y', 'yes'].includes(a);
}
