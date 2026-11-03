import { fs } from '@lilos/sdk';
import { installedApps, callEntrypoint } from '@lilos/system';
import { builtins } from './builtins.js';
import { fileCommands } from './files.js';
import { textCommands } from './text.js';
import { sedCommands } from './sed.js';
import { diffCommands } from './diff.js';
import { lilosCommands } from './lilos.js';
import { remoteCommands } from './remote.js';
import { ShellError } from '../shell/signals.js';
import { t } from '../i18n.js';

/**
 * Every command the terminal knows: its own, plus the ones installed apps add in their manifest
 *
 *   "contributes": { "shell": [{ "name": "convert", "entry": "cli", "summary": "…", "usage": "…" }] }
 *
 * `entry` is one of the app's background entry points: it is called with
 *   { command, args, stdin, cwd, env }   stdin: the input text, or null when it is the keyboard
 * and answers with a string (the output) or { stdout?, stderr?, code? }. The terminal's own
 * commands win over an app's with the same name.
 */
const NAME = /^[a-z][\w.-]{0,39}$/;
const own = new Map();
// Marked in place: a copy would read the texts (getters, in the language of the moment) only once
for (const cmd of builtins) own.set(cmd.name, Object.assign(cmd, { builtin: true }));
for (const cmd of [...fileCommands, ...textCommands, ...sedCommands, ...diffCommands, ...lilosCommands, ...remoteCommands]) own.set(cmd.name, cmd);

function appCommands() {
  const found = new Map();
  for (const app of installedApps()) {
    const list = app.package?.manifest?.contributes?.shell;
    if (!Array.isArray(list)) continue;
    for (const c of list.slice(0, 50)) {
      if (!c || !NAME.test(c.name ?? '') || typeof c.entry !== 'string' || own.has(c.name) || found.has(c.name)) continue;
      found.set(c.name, {
        name: c.name,
        app: app.name,
        summary: typeof c.summary === 'string' ? c.summary.slice(0, 120) : t('appCmd.summary', { app: app.name }),
        usage: typeof c.usage === 'string' ? c.usage.slice(0, 200) : t('appCmd.usage', { name: c.name }),
        ownHelp: c.help === true,
        run: ctx => runApp(ctx, app.id, c.entry),
      });
    }
  }
  return found;
}

async function runApp(ctx, appId, entry) {
  const shell = ctx.shell;
  const stdin = ctx.stdin === shell.host.stdin ? null : await ctx.stdin.readAll();
  let answer;
  try {
    answer = await callEntrypoint(appId, entry, { command: ctx.name, args: ctx.args, stdin, cwd: fs.path(ctx.cwd), env: shell.environment() }, { from: 'terminal' });
  } catch (err) {
    throw new ShellError(err?.message ?? String(err));
  }
  if (answer == null) return 0;
  if (typeof answer === 'string') { await ctx.out(answer); return 0; }
  if (typeof answer.stdout === 'string') await ctx.out(answer.stdout);
  if (typeof answer.stderr === 'string') await ctx.err(answer.stderr);
  return Number.isInteger(answer.code) ? ((answer.code % 256) + 256) % 256 : 0;
}

/** get(name), has(name), names(), values(): the terminal's commands and the apps' ones. */
export const commands = {
  get: name => own.get(name) ?? appCommands().get(name) ?? null,
  has: name => own.has(name) || appCommands().has(name),
  names: () => [...own.keys(), ...appCommands().keys()],
  values: () => [...own.values(), ...appCommands().values()],
};
