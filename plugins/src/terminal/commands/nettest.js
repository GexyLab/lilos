import * as sdk from '@lilos/sdk';   // `calls`: missing in older lilOS, so not imported by name
import { ShellError } from '../shell/signals.js';
import { resolve } from '../shell/paths.js';
import { options, int } from './options.js';
import { t } from '../i18n.js';

/**
 * nettest: the requests of a NetTest collection (.nettest) from the command line, sent by the
 * kernel with the same engine as NetTest's Esegui (the SDK's calls):
 *   nettest run FILE [-e ENV] [-f FOLDER] [-n N] [-d DATA.csv|json] [--bail] [-v]
 *       every request (or a folder's), a line each: ✓ / ✗ / ·, status, time, what failed;
 *       exit status 0 when all passed, 1 otherwise
 *   nettest send FILE REQUEST [-e ENV] [-i]
 *       one request by name: the body of the response on stdout (-i: status and headers first)
 *   nettest list FILE      the folders and requests, with their protocol
 * The environment is one of the file's, by name; its secret values are the file's (sealed for this
 * user on this lilOS).
 */
const parse = text => {
  let c;
  try { c = JSON.parse(text); } catch { c = null; }
  if (c?.format !== 'nettest' || !Array.isArray(c.items)) throw new ShellError(t('nettest.notCollection'));
  return c;
};

async function load(ctx, path) {
  const node = resolve(ctx.cwd, path);
  if (!node || node.type !== 'file') throw new ShellError(t('nettest.noFile', { path }));
  return parse(await sdk.fs.read(node.id));
}

const rowsOf = env => (Array.isArray(env?.variables) ? env.variables.filter(v => v && v.enabled !== false && v.key) : []);
function environment(c, name) {
  if (!name) return { values: {}, secrets: {} };
  const env = (c.environments ?? []).find(e => e.id === name || String(e.name).toLowerCase() === String(name).toLowerCase());
  if (!env) throw new ShellError(t('nettest.noEnv', { name, list: (c.environments ?? []).map(e => e.name).join(', ') || '—' }));
  const rows = rowsOf(env);
  return { values: Object.fromEntries(rows.filter(v => !v.secret).map(v => [v.key, String(v.value ?? '')])), secrets: Object.fromEntries(rows.filter(v => v.secret && v.sealed).map(v => [v.key, v.sealed])) };
}
const varsOf = rows => Object.fromEntries((rows ?? []).filter(v => v && v.enabled !== false && v.key && !v.secret).map(v => [v.key, String(v.value ?? '')]));

/** [{ item, path: 'Folder/Sub', chain }] */
function flatten(c) {
  const out = [];
  const walk = (items, path, chain) => {
    for (const it of items ?? []) {
      if (it.type === 'folder') walk(it.items, [...path, it.name], [...chain, { auth: it.auth ?? { type: 'inherit' }, scripts: it.scripts ?? {} }]);
      else out.push({ item: it, path: path.join('/'), chain });
    }
  };
  walk(c.items, [], [{ auth: c.auth ?? { type: 'none' }, scripts: c.scripts ?? {} }]);
  return out;
}

const dim = s => `\x1b[2m${s}\x1b[0m`;
const ms = n => (n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(2)} s`);

async function run(ctx) {
  if (!sdk.calls?.available) throw new ShellError(t('nettest.unavailable'));
  const { opts, args } = options(ctx, { flags: 'bv', values: 'efnd', long: { env: 'e', folder: 'f', iterations: 'n', data: 'd', bail: 'b', verbose: 'v' } });
  const [sub, file, name] = args;
  if (!sub || !file) throw new ShellError(t('help.usageShort', { usage: ctx.cmd.usage }), 2);
  const c = await load(ctx, file);
  if (sub === 'list') {
    for (const { item, path } of flatten(c)) await ctx.out(`${(item.protocol === 'http' ? item.method : String(item.protocol).toUpperCase()).padEnd(7)} ${path ? dim(`${path}/`) : ''}${item.name}\n`);
    return 0;
  }
  const env = environment(c, opts.e);
  if (sub === 'send') {
    if (!name) throw new ShellError(t('help.usageShort', { usage: ctx.cmd.usage }), 2);
    const found = flatten(c).find(x => x.item.name.toLowerCase() === name.toLowerCase() || x.item.id === name);
    if (!found) throw new ShellError(t('nettest.noRequest', { name }));
    const { result } = await sdk.calls.send({ request: found.item, chain: found.chain, environment: env, collection: { values: varsOf(c.variables) }, globals: { values: {} } });
    if (result.error) throw new ShellError(result.error.message);
    const r = result.response;
    if (opts.v) {
      await ctx.err(`${r.status} ${r.statusText ?? ''} · ${ms(r.timings?.total ?? result.ms)}\n`);
      for (const [k, v] of r.headers) await ctx.err(`${k}: ${v}\n`);
      await ctx.err('\n');
    }
    await ctx.out(new TextDecoder().decode(Uint8Array.from(atob(r.body ?? ''), ch => ch.charCodeAt(0))));
    return r.status >= 400 || !result.ok ? 1 : 0;
  }
  if (sub !== 'run') throw new ShellError(t('help.usageShort', { usage: ctx.cmd.usage }), 2);
  let only = null;
  if (opts.f) {
    let folder = null;
    const find = items => { for (const it of items ?? []) { if (it.type === 'folder') { if (it.name.toLowerCase() === opts.f.toLowerCase()) folder = it; else find(it.items); } } };
    find(c.items);
    if (!folder) throw new ShellError(t('nettest.noFolder', { name: opts.f }));
    only = [folder.id];
  }
  let data = null;
  if (opts.d) {
    const node = resolve(ctx.cwd, opts.d);
    if (!node || node.type !== 'file') throw new ShellError(t('nettest.noFile', { path: opts.d }));
    const text = await sdk.fs.read(node.id);
    try {
      data = /\.json$/i.test(node.name) ? JSON.parse(text) : csv(text);
    } catch { throw new ShellError(t('nettest.badData')); }
  }
  const { id } = await sdk.calls.run({
    collection: c, only, environment: env, globals: { values: {} }, data, iterations: opts.n ? int(opts.n) : 1, stopOnError: !!opts.b,
  });
  const stop = () => sdk.calls.cancelRun(id).catch(() => {});
  ctx.signal?.addEventListener?.('abort', stop, { once: true });
  let summary;
  for (let after = 0; ;) {
    const p = await sdk.calls.progress(id, { after, wait: true });
    for (const r of p.results) {
      const mark = r.skipped ? dim('·') : r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      const status = r.response ? String(r.response.status) : r.error ? '!' : '';
      await ctx.out(`${mark} ${r.name || r.id} ${dim(`${status} · ${ms(r.ms)}${r.iteration ? ` · #${r.iteration + 1}` : ''}`)}\n`);
      if (r.error) await ctx.out(`    ${r.error.message}\n`);
      for (const k of r.checks.filter(x => !x.ok)) await ctx.out(`    ${t('nettest.check')}: ${k.label || k.id || ''} (${k.actual})\n`);
      for (const x of r.tests.filter(x => x.ok === false)) await ctx.out(`    ${t('nettest.test')} «${x.name}»: ${x.error ?? ''}\n`);
      if (opts.v) for (const l of r.logs) await ctx.out(dim(`    ${l.text}\n`));
    }
    after = p.next;
    if (p.done) { summary = p.summary; break; }
  }
  await ctx.out(`\n${t('nettest.summary', { passed: summary.passed, failed: summary.failed, skipped: summary.skipped, time: ms(summary.ms) })}\n`);
  return summary.failed || summary.cancelled ? 1 : 0;
}

/** A CSV with a header row → [{ column: value }] (commas or semicolons, quotes as Excel writes them). */
function csv(text) {
  const s = String(text).replace(/^﻿/, '');
  const head = s.slice(0, s.search(/\r?\n|$/));
  const sep = head.includes(';') && !head.includes(',') ? ';' : ',';
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"' && !field) quoted = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(x => x)) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(x => x)) rows.push(row);
  const [cols, ...body] = rows;
  return (body ?? []).map(r => Object.fromEntries((cols ?? []).map((k, i) => [k.trim(), r[i] ?? ''])));
}

export const nettestCommands = [
  { name: 'nettest', get usage() { return t('help.nettest.usage'); }, get summary() { return t('help.nettest.summary'); }, run },
];
