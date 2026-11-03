import { fs } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t } from './i18n.js';
import { engine, library, load } from './store.js';
import { actionLabel } from './describe.js';

/**
 * The Terminal's `automata` command (manifest contributes.shell, entry point `cli`):
 *
 *   automata list                         the automations, with their command and what they ask
 *   automata run <name> [file…] [--field=value…] [--yes]
 *
 * <name>: the command chosen in Avvio, the automation's name, or the path of its .automata file.
 * Files are relative to the Terminal's folder. --field=value answers a value the steps ask
 * (by the param's name). With --yes it runs here, in the Terminal: confirmations are given and
 * what is asked takes the recorded value (or the one given); without it, an automation that asks
 * something opens in Automata's window.
 */
export function cli({ lilos }) {
  lilos.handle(async ({ args = [], cwd = '~' } = {}) => {
    if (!engine()) return { stderr: `${t('needsNewer')}\n`, code: 1 };
    await library().ready();
    const [sub, ...rest] = args;
    if (!sub || sub === 'help' || sub === '--help' || sub === '-h') return { stdout: `${t('cli.usage')}\n` };
    if (sub === 'list' || sub === 'ls') return list();
    if (sub === 'run') return run(rest, cwd);
    return { stderr: `${t('cli.unknown', { sub })}\n${t('cli.usage')}\n`, code: 2 };
  });
}

function list() {
  const all = library().list();
  if (!all.length) return { stdout: `${t('cli.none')}\n` };
  const width = Math.max(...all.map(e => (e.launch.command || '-').length), 4);
  return {
    stdout: all.map(e => `${(e.launch.command || '-').padEnd(width)}  ${e.name}${e.input !== 'none' ? `  (${t(`input.${e.input}`)})` : ''}`).join('\n') + '\n',
  };
}

const resolvePath = (path, cwd) => {
  if (path.startsWith('/') || path.startsWith('~')) return fs.resolve(path);
  return fs.resolve(`${cwd.replace(/\/+$/, '')}/${path}`);
};

async function run(args, cwd) {
  const [name, ...rest] = args;
  if (!name) return { stderr: `${t('cli.usage')}\n`, code: 2 };
  const entry = library().get(name) ?? (resolvePath(name, cwd) ? library().get(resolvePath(name, cwd).id) : null);
  if (!entry) return { stderr: `${t('cli.notFound', { name })}\n`, code: 1 };
  const values = {};
  const items = [];
  let yes = false;
  for (const a of rest) {
    if (a === '--yes' || a === '-y') { yes = true; continue; }
    const m = /^--([a-zA-Z][\w]*)=(.*)$/s.exec(a);
    if (m) { values[m[1]] = m[2]; continue; }
    const node = resolvePath(a, cwd);
    if (!node) return { stderr: `${t('cli.noFile', { path: a })}\n`, code: 1 };
    items.push(node.id);
  }
  const doc = await load(entry.id);
  if (doc.input !== 'none' && !items.length) return { stderr: `${t('cli.needItems')}\n`, code: 2 };
  const interactive = doc.steps.some(s => s.enabled && (s.confirm || Object.entries(s.fields).some(([n, f]) => f.mode === 'ask' && !Object.hasOwn(values, n))));
  if (interactive && !yes) {
    system.launch('automata', { automation: entry.id, items, values }, 'run');
    return { stdout: `${t('cli.opened', { name: doc.name })}\n` };
  }
  const lines = [];
  let pass = 0, total = 1;
  const result = await engine().run(doc, {
    items, values,
    ui: {
      progress: e => {
        if (e.type === 'item') { pass = e.index + 1; total = e.total; if (e.total > 1) lines.push(`[${pass}/${total}] ${e.item ? fs.get(e.item)?.name ?? '' : ''}`); }
        if (e.type === 'failed') lines.push(`  ${t('cli.failed', { step: actionLabel(doc.steps[e.index].action), error: e.error })}`);
      },
    },
  }).catch(err => ({ error: err.message }));
  if (result.error) return { stdout: lines.length ? `${lines.join('\n')}\n` : '', stderr: `${result.error}\n`, code: 1 };
  lines.push(t('cli.done', { name: doc.name, n: result.items }));
  return { stdout: `${lines.join('\n')}\n` };
}

