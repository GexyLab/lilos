import { fs } from '@lilos/sdk';
import { ShellError, Interrupt } from '../../../src/terminal/shell/signals.js';
import { ApiError } from './client.js';
import { t, i18n } from './strings.js';

/**
 * logic: Logic Studio programs from the command line, through the engine's HTTP API
 * (logicstudio-engine, /api/modules/logicstudio-engine/…).
 *
 *   logic run [-q] [--active] [--name NAME] FILE [ARGUMENTS…]
 *       FILE: a project (.lsproj), a schema alone (.lsch) or an app made with «Crea app» (.lsapp),
 *       in lilOS's files. Everything after FILE goes to the program as it is (the blocks
 *       Argomenti and Opzione read it). The command waits: the lines of the consoles go to the
 *       output (warnings and errors to the error output, consoles other than the main one with
 *       their name), questions are asked here, Ctrl+C stops the program. When a block closes it
 *       (Exit) with a whole number from 0 to 255 that is the exit code; another value is written
 *       (texts as they are, the rest as JSON) and the code is 0; -q writes nothing. A program that
 *       fails gives 1, one stopped from elsewhere 1 too.
 *       --active: an active program (it goes on with the arguments, also after a restart of
 *       lilOS): started and left running, its id written.
 *   logic list [--all]     the programs (an administrator: everyone's with --all)
 *   logic stop ID          stops a program
 *
 * The engine stops a run from the command line nobody asks about for a minute (kind 'cli'):
 * here it is asked about every 400 ms, and every 15 s while a question waits for an answer.
 */
const ENGINE = '/api/modules/logicstudio-engine';
const POLL_MS = 400;
const KEEP_ALIVE_MS = 15_000;
const KINDS = { lsproj: 'project', lsch: 'schema', lsapp: 'app' };

const fail = (message, code = 1) => { throw new ShellError(message, code); };

/** The engine answers, or says plainly that it is not there. */
async function api(ctx, method, path, json) {
  try {
    return await ctx.shell.client.request(method, `${ENGINE}${path}`, json === undefined ? {} : { json });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404 && /^\/programs$|^\/status$/.test(path)) fail(t('logic.noEngine'), 3);
    throw err;
  }
}

function parseRun(args) {
  const opts = { quiet: false, active: false, name: null };
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    if (a === '-q' || a === '--quiet') opts.quiet = true;
    else if (a === '--active') opts.active = true;
    else if (a === '--name') { if (i + 1 >= args.length) fail(t('logic.usage'), 2); opts.name = args[++i]; }
    else if (a.startsWith('--name=')) opts.name = a.slice(7);
    else if (a === '--') { i++; break; }
    else if (a.startsWith('-') && a !== '-') fail(t('logic.badOption', { option: a }), 2);
    else break;
  }
  if (i >= args.length) fail(t('logic.usage'), 2);
  return { opts, file: args[i], rest: args.slice(i + 1) };
}

/** A file of lilOS as JSON, by a path relative to the shell's folder. */
async function readJson(ctx, path) {
  const node = ctx.resolve(path);
  if (!node) fail(t('logic.noFile', { path }));
  if (node.type !== 'file') fail(t('logic.notFile', { path }));
  try {
    return JSON.parse(await fs.read(node.id));
  } catch {
    return fail(t('logic.badFile', { path }));
  }
}

const dirOf = path => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) || '/' : '.');
const join = (dir, rel) => `${dir === '/' ? '' : dir}/${String(rel).replace(/^\.\//, '')}`;

/** What the engine runs: { project, schemas, windows }, and the program's name and source. */
async function documentsOf(ctx, file) {
  const ext = file.split('.').pop().toLowerCase();
  const kind = KINDS[ext];
  if (!kind) fail(t('logic.notProgram', { path: file }));
  const node = ctx.resolve(file);
  const source = node ? { path: fs.path(node.id) } : null;
  if (kind === 'schema') {
    const doc = await readJson(ctx, file);
    const name = String(doc?.name || file.split('/').pop().replace(/\.lsch$/i, ''));
    return { documents: { project: null, schemas: { [name]: doc }, windows: {} }, name, source };
  }
  let projFile = file;
  if (kind === 'app') {
    const marker = await readJson(ctx, file);
    if (marker?.format !== 'lilos-lsapp/1' || typeof marker.project !== 'string') fail(t('logic.badFile', { path: file }));
    projFile = join(dirOf(file), marker.project);
  }
  const project = await readJson(ctx, projFile);
  const base = dirOf(projFile);
  const read = async map => {
    const out = {};
    for (const [name, rel] of Object.entries(map ?? {})) out[name] = await readJson(ctx, join(base, rel));
    return out;
  };
  const documents = { project, schemas: await read(project?.schemas), windows: await read(project?.windows) };
  return { documents, name: String(project?.name || projFile.split('/').pop().replace(/\.lsproj$/i, '')), source: { path: fs.path(ctx.resolve(projFile).id) } };
}

/** The new lines of every console since the last call: written, the main console's plain. */
function linePrinter(ctx) {
  const seen = new Map();   // console id → { n, last }
  const key = l => `${l.at}|${l.level}|${l.text}`;
  return async consoles => {
    for (const c of consoles) {
      const s = seen.get(c.id) ?? { n: 0, last: null };
      let from = s.n;
      // the oldest lines went (a console keeps a few hundred KB): go on after the last one written
      if (s.last !== null && (c.lines.length < s.n || key(c.lines[s.n - 1] ?? {}) !== s.last)) {
        const at = c.lines.map(key).lastIndexOf(s.last);
        from = at + 1;
      }
      for (const line of c.lines.slice(from)) {
        const text = `${c.main ? '' : `[${c.name}] `}${line.text}\n`;
        if (line.level === 'warning' || line.level === 'error') await ctx.err(text);
        else await ctx.out(text);
      }
      if (c.lines.length) seen.set(c.id, { n: c.lines.length, last: key(c.lines.at(-1)) });
    }
  };
}

/** A question of a «Input (readline)» block, asked here; the program goes on being asked about meanwhile. */
async function ask(ctx, id, c) {
  const q = c.ask;
  const hint = q.kind === 'bool' ? ` ${t('logic.yesNo')}` : '';
  await ctx.out(`${c.main ? '' : `[${c.name}] `}${q.prompt || t('logic.answer')}${hint}${q.secret ? ` ${t('logic.visible')}` : ''} `);
  const alive = setInterval(() => { api(ctx, 'GET', `/programs/${encodeURIComponent(id)}`).catch(() => {}); }, KEEP_ALIVE_MS);
  let line;
  try {
    line = await ctx.stdin.readLine();
  } finally {
    clearInterval(alive);
  }
  if (line == null) {
    await ctx.out('\n');
    await api(ctx, 'POST', `/programs/${encodeURIComponent(id)}/cancel`, { console: c.id, ask: q.id }).catch(() => {});
    return false;
  }
  if (!process.stdin.isTTY) await ctx.out(`${q.secret ? '•••' : line}\n`);
  await api(ctx, 'POST', `/programs/${encodeURIComponent(id)}/answer`, { console: c.id, ask: q.id, value: line }).catch(() => {});
  return true;
}

/** The exit code for the value a program closed with; the value written unless it is the code. */
async function finish(ctx, value, quiet) {
  if (Number.isInteger(value) && value >= 0 && value <= 255) return value;
  if (value === true || value === null || value === undefined) return 0;
  if (value === false) return 1;
  if (!quiet) await ctx.out(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
  return 0;
}

async function run(ctx, args) {
  const { opts, file, rest } = parseRun(args);
  const { documents, name, source } = await documentsOf(ctx, file);
  const body = { kind: opts.active ? 'active' : 'cli', name: opts.name ?? name, documents, source, lang: i18n.code, args: rest };
  let program;
  try {
    program = await api(ctx, 'POST', '/programs', body);
  } catch (err) {
    if (err instanceof ApiError) fail(t('logic.notStarted', { error: err.message }));
    throw err;
  }
  if (opts.active) {
    await ctx.out(`${t('logic.active', { name: program.name, id: program.id })}\n`);
    return 0;
  }
  const id = encodeURIComponent(program.id);
  const print = linePrinter(ctx);
  const asked = new Set();
  try {
    for (;;) {
      const [p, consoles] = await Promise.all([api(ctx, 'GET', `/programs/${id}`), api(ctx, 'GET', `/programs/${id}/consoles`).catch(() => [])]);
      await print(consoles);
      if (p.status === 'stopped' || p.status === 'failed') {
        if (p.status === 'failed') { await ctx.error(t('logic.failed', { error: p.error ?? '' })); return 1; }
        if (p.result) return finish(ctx, p.result.value, opts.quiet);
        await ctx.error(t('logic.stopped'));
        return 1;
      }
      const question = consoles.find(c => c.ask && !asked.has(`${c.id}:${c.ask.id}`));
      if (question) {
        asked.add(`${question.id}:${question.ask.id}`);
        await ask(ctx, program.id, question);
        continue;
      }
      await ctx.shell.sleep(POLL_MS);
    }
  } catch (err) {
    // Ctrl+C (or the kernel gone): the program stops too
    if (err instanceof Interrupt) await api(ctx, 'DELETE', `/programs/${id}`).catch(() => {});
    throw err;
  }
}

async function list(ctx, args) {
  const all = args.includes('--all');
  const programs = await api(ctx, 'GET', `/programs${all ? '?all=1' : ''}`);
  if (!programs.length) { await ctx.out(`${t('logic.none')}\n`); return 0; }
  const rows = programs.map(p => [p.id, t(`logic.kind.${p.kind}`), t(`logic.state.${p.status}`), p.name, all ? (p.user?.username ?? '') : null].filter(v => v !== null));
  const widths = rows[0].map((_, i) => Math.max(...rows.map(r => String(r[i]).length)));
  for (const r of rows) await ctx.out(`${r.map((v, i) => (i < r.length - 1 ? String(v).padEnd(widths[i]) : v)).join('  ')}\n`);
  return 0;
}

async function stop(ctx, args) {
  if (args.length !== 1) fail(t('logic.usage'), 2);
  try {
    await api(ctx, 'DELETE', `/programs/${encodeURIComponent(args[0])}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) fail(t('logic.unknown', { id: args[0] }));
    throw err;
  }
  return 0;
}

export const logicCommand = {
  name: 'logic',
  usage: 'logic run [-q] [--active] [--name NAME] FILE [ARGUMENTS…] | list [--all] | stop ID',
  get summary() { return t('logic.summary'); },
  get help() { return t('logic.help'); },
  async run(ctx) {
    const [sub, ...args] = ctx.args;
    switch (sub) {
      case 'run': return run(ctx, args);
      case 'list': return list(ctx, args);
      case 'stop': return stop(ctx, args);
      case undefined: case 'help': await ctx.out(`${t('logic.help')}\n`); return sub ? 0 : 2;
      default: return fail(t('logic.usage'), 2);
    }
  },
};
