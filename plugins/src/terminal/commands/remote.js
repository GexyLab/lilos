import * as sdk from '@lilos/sdk';   // `term`: missing in older lilOS, so not imported by name
import { ShellError } from '../shell/signals.js';
import { parseQuick } from '../remote/quick.js';
import { i18n, t } from '../i18n.js';

/**
 * Remote sessions from the command line: ssh, telnet, rlogin and supdup open a new tab of the
 * window with the session (the window's tabs are host.remote, see TerminalApp.js); sessions lists
 * the ones still running in the kernel and shows one again. A saved host can be named instead
 * of an address: `ssh web-01`.
 */
const remoteOf = ctx => ctx.shell.host.remote ?? null;

async function connect(ctx) {
  const remote = remoteOf(ctx);
  if (!remote || !sdk.term?.available) throw new ShellError(t('remote.cmd.unavailable'));
  if (!ctx.args.length) throw new ShellError(t('help.usageShort', { usage: ctx.cmd.usage }), 2);
  const { hosts, protocols } = await remote.data();
  if (!protocols.some(p => p.id === protocol(ctx.name))) throw new ShellError(t('remote.cmd.noModule', { name: ctx.name, module: protocol(ctx.name) === 'ssh' ? 'ssh' : `term-${protocol(ctx.name)}` }));
  // One word that is the name of a saved host of that protocol
  if (ctx.args.length === 1) {
    const key = ctx.args[0].toLowerCase();
    const saved = hosts.find(x => x.protocol === protocol(ctx.name) && x.name.toLowerCase() === key);
    if (saved) {
      await remote.open({ host: saved.id });
      await ctx.out(`${t('remote.cmd.opened', { name: saved.name })}\n`);
      return 0;
    }
  }
  const line = [ctx.name, ...ctx.args.map(a => (/\s/.test(a) ? `'${a.replace(/'/g, '')}'` : a))].join(' ');
  const spec = parseQuick(line, protocols.map(p => p.id));
  if (!spec) throw new ShellError(t('help.usageShort', { usage: ctx.cmd.usage }), 2);
  if (spec.protocol === 'ssh' && !spec.values.user) throw new ShellError(t('remote.cmd.noUser'));
  const session = await remote.open(spec);
  await ctx.out(`${t('remote.cmd.opened', { name: session?.name ?? spec.values.host })}\n`);
  return 0;
}

const protocol = name => (name === 'telnets' ? 'telnet' : name);

async function sessions(ctx) {
  const remote = remoteOf(ctx);
  if (!remote || !sdk.term?.available) throw new ShellError(t('remote.cmd.unavailable'));
  const { sessions: list } = await remote.data();
  const running = list.filter(s => s.state !== 'closed');
  const pick = arg => running[Number(arg) - 1] ?? running.find(s => s.id === arg || s.name.toLowerCase() === String(arg).toLowerCase());
  if (ctx.args.length) {
    const s = pick(ctx.args[0]);
    if (!s) throw new ShellError(t('remote.cmd.noSession', { name: ctx.args[0] }));
    await remote.resume(s);
    await ctx.out(`${t('remote.cmd.shown', { name: s.name })}\n`);
    return 0;
  }
  if (!running.length) { await ctx.out(`${t('remote.cmd.none')}\n`); return 0; }
  for (const [i, s] of running.entries()) {
    const where = s.attached ? t('remote.cmd.shownNow') : s.closesAt ? t('remote.cmd.closesIn', { n: Math.max(1, Math.round((s.closesAt - Date.now()) / 60000)) }) : '';
    await ctx.out(`${String(i + 1).padStart(2)}  ${s.name}  \x1b[2m${s.address} · ${i18n.date(s.created, { timeStyle: 'short' })}${where ? ` · ${where}` : ''}${s.title ? ` · ${s.title}` : ''}\x1b[0m\n`);
  }
  await ctx.out(`\x1b[2m${t('remote.cmd.resumeHint')}\x1b[0m\n`);
  return 0;
}

export const remoteCommands = [
  { name: 'ssh', get usage() { return t('help.ssh.usage'); }, get summary() { return t('help.ssh.summary'); }, run: connect },
  { name: 'telnet', get usage() { return t('help.telnet.usage'); }, get summary() { return t('help.telnet.summary'); }, run: connect },
  { name: 'rlogin', get usage() { return t('help.rlogin.usage'); }, get summary() { return t('help.rlogin.summary'); }, run: connect },
  { name: 'supdup', get usage() { return t('help.supdup.usage'); }, get summary() { return t('help.supdup.summary'); }, run: connect },
  { name: 'sessions', get usage() { return t('help.sessions.usage'); }, get summary() { return t('help.sessions.summary'); }, run: sessions },
];
