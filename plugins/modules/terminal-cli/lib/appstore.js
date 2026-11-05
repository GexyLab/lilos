import { ShellError } from '../../../src/terminal/shell/signals.js';
import { ApiError, Unreachable } from './client.js';
import { confirm } from './ask.js';
import { t } from './strings.js';

/**
 * appstore: the AppStore of lilOS for the command line, only for the kernel's modules and the
 * language packs (apps need lilOS's page: they are refused). Through the same API as the AppStore:
 * the repositories and their catalogs, the plan of what a module needs (/api/packages/plan), the
 * install with the answers to it, the removal with what is left unneeded, the language packs
 * (/api/languages, only from the official repository) and lilOS itself (/api/system).
 * Modules and repositories are for administrators; any user installs a language, for everyone.
 * A language is written lang:<tag> (lang:de, lang:pt-BR); a bare name is a module.
 */
const COMMUNITY_URL = 'https://github.com/GexyLab/lilos-plugins-community';
const LANG = /^lang:(.+)$/;
const RESTART_WAIT_MS = 180_000;

const norm = url => String(url ?? '').trim().replace(/\.git$/i, '').replace(/\/+$/, '').toLowerCase();

function compare(a, b) {
  const pa = String(a).split(/[.-]/).map(n => (/^\d+$/.test(n) ? Number(n) : n));
  const pb = String(b).split(/[.-]/).map(n => (/^\d+$/.test(n) ? Number(n) : n));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

/** Columns padded to the widest cell (the escape codes of colors do not count). */
function table(rows) {
  const plain = s => String(s).replace(/\x1b\[[0-9;]*m/g, '');
  const widths = [];
  for (const row of rows) row.forEach((c, i) => { widths[i] = Math.max(widths[i] ?? 0, plain(c).length); });
  return rows.map(row => row.map((c, i) => (i === row.length - 1 ? String(c) : String(c) + ' '.repeat(widths[i] - plain(c).length))).join('  ').trimEnd()).join('\n') + '\n';
}

/** Colors only on the terminal (not into a file of lilOS or a pipe of the shell). */
const color = (ctx, code, s) => (ctx.stdout === ctx.shell.host.stdout ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (ctx, s) => color(ctx, '1', s);
const dim = (ctx, s) => color(ctx, '2', s);

/** Options: -y, --allow-unsigned, --name N, --repo ID, the --installed… switches; the rest are words. */
function parse(args) {
  const opts = { yes: false, allowUnsigned: false, name: null, repo: null, installed: false, updates: false, modules: false, languages: false };
  const words = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-y' || a === '--yes') opts.yes = true;
    else if (a === '--allow-unsigned') opts.allowUnsigned = true;
    else if (a === '--name') opts.name = args[++i] ?? null;
    else if (a === '--repo') opts.repo = args[++i] ?? null;
    else if (a === '--installed') opts.installed = true;
    else if (a === '--updates') opts.updates = true;
    else if (a === '--modules') opts.modules = true;
    else if (a === '--languages') opts.languages = true;
    else if (a.startsWith('-') && a.length > 1) throw new ShellError(t('appstore.badOption', { option: a }), 2);
    else words.push(a);
  }
  return { opts, words };
}

/** What the kernel offers and has: repositories, their catalogs, the modules and languages installed. */
class Store {
  constructor(ctx) {
    this.ctx = ctx;
    this.client = ctx.shell.client;
    this.admin = this.client.user?.role === 'admin' || this.client.mode === 'single';
  }

  async load() {
    const c = this.client;
    this.repos = await c.get('/api/repos');
    const catalogs = await Promise.all(this.repos.map(r => c.get(`/api/repos/${encodeURIComponent(r.id)}/catalog`).then(cat => ({ repo: r, cat }), err => ({ repo: r, err }))));
    this.catalogs = [];
    for (const { repo, cat, err } of catalogs) {
      if (err) await this.ctx.err(`appstore: ${t('appstore.repoUnreadable', { repo: repo.name, message: err.message })}\n`);
      else this.catalogs.push({ repo, cat });
    }
    this.installedModules = this.admin ? await c.get('/api/modules') : [];
    this.installedLanguages = await c.get('/api/languages');
    return this;
  }

  /** The repository a user names: its id, its name, or `official` / `community`. */
  repo(name) {
    const n = String(name).toLowerCase();
    return this.repos.find(r => r.id === name || String(r.name).toLowerCase() === n || (n === 'official' && r.official) || (n === 'community' && norm(r.url) === norm(COMMUNITY_URL))) ?? null;
  }

  /** Every module of every catalog: { name, version, description, repo, cat, entry }. */
  modules() {
    const out = [];
    for (const { repo, cat } of this.catalogs) {
      for (const entry of cat.modules ?? []) {
        if (!entry.module || entry.replacedBy) continue;
        out.push({ name: entry.module.name, version: entry.module.version, description: entry.module.description ?? '', repo, cat, entry });
      }
    }
    return out;
  }

  /** The language packs of the official repository: { name: 'lang:<tag>', tag, version, label, path }. */
  languages() {
    const official = this.catalogs.find(c => c.repo.official);
    return (official?.cat.languages ?? []).filter(e => e.language).map(e => ({
      name: `lang:${e.language.language}`, tag: e.language.language, version: e.language.version,
      label: e.language.name ?? e.language.language, english: e.language.englishName ?? null, repo: official.repo,
    }));
  }

  isApp(name) {
    return this.catalogs.some(({ cat }) => (cat.apps ?? []).some(a => a.manifest?.id === name));
  }

  installedModule(name) { return this.installedModules.find(m => m.name === name && m.enabled) ?? null; }
  installedLanguage(tag) { return this.installedLanguages.find(l => l.language === tag) ?? null; }

  /** The repository an installed module came from (its source.json), or null. */
  repoOf(mod) {
    const url = norm(mod?.source?.url);
    return url ? this.repos.find(r => norm(r.url) === url) ?? null : null;
  }

  /** The catalog entry of a module to install: the repository asked for, else the official one, else the first. */
  findModule(name, repoName) {
    const all = this.modules().filter(m => m.name === name);
    if (repoName) {
      const repo = this.repo(repoName) ?? fail(t('appstore.noRepo', { repo: repoName }));
      return all.find(m => m.repo.id === repo.id) ?? null;
    }
    return all.find(m => m.repo.official) ?? all[0] ?? null;
  }

  /** The newest version a module installed can update to (from its own repository), or null: one put in by hand is updated by hand. */
  updateFor(mod) {
    const repo = this.repoOf(mod);
    if (!repo) return null;
    const offers = this.modules().filter(m => m.name === mod.name && m.repo.id === repo.id);
    const best = offers.sort((a, b) => compare(b.version, a.version))[0];
    return best && compare(best.version, mod.enabled) > 0 ? best : null;
  }
}

function fail(message, code = 1) { throw new ShellError(message, code); }

const needAdmin = store => { if (!store.admin) fail(t('appstore.adminOnly')); };

/** Kernel errors as the shell's own (`appstore: <message>`). */
async function guard(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) throw new ShellError(err.message);
    if (err instanceof Unreachable) throw new ShellError(t('cli.unreachable', { url: err.url }), 3);
    throw err;
  }
}

// ---------- list, search, info ----------

async function list(ctx, opts) {
  const store = await new Store(ctx).load();
  const rows = [[bold(ctx, t('appstore.col.name')), bold(ctx, t('appstore.col.version')), bold(ctx, t('appstore.col.installed')), bold(ctx, t('appstore.col.repo')), bold(ctx, t('appstore.col.notes'))]];
  const repo = opts.repo ? store.repo(opts.repo) ?? fail(t('appstore.noRepo', { repo: opts.repo })) : null;
  const both = !opts.modules && !opts.languages;
  let modules = 0, languages = 0;
  if (opts.modules || both) {
    const seen = new Set();
    const items = store.modules().filter(m => !repo || m.repo.id === repo.id);
    // Installed modules no catalog has (by hand, a repository removed) are listed too
    for (const mod of store.installedModules.filter(m => m.enabled && !items.some(i => i.name === m.name))) {
      if (!repo || store.repoOf(mod)?.id === repo.id) items.push({ name: mod.name, version: mod.enabled, repo: store.repoOf(mod), local: true });
    }
    for (const m of items.sort((a, b) => a.name.localeCompare(b.name))) {
      const inst = store.installedModule(m.name);
      const update = inst && !m.local && m.repo && compare(m.version, inst.enabled) > 0 && store.repoOf(inst)?.id === m.repo.id;
      if (opts.installed && !inst) continue;
      if (opts.updates && !update) continue;
      const key = `${m.name}@${m.repo?.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const notes = [inst?.required && t('appstore.note.required'), update && t('appstore.note.update'), m.local && t('appstore.note.local')].filter(Boolean).join(', ');
      rows.push([m.name, m.version, inst ? inst.enabled : '—', m.repo?.name ?? '—', notes]);
      modules++;
    }
  }
  if ((opts.languages || both) && (!repo || repo.official)) {
    for (const l of store.languages()) {
      const inst = store.installedLanguage(l.tag);
      const update = inst && compare(l.version, inst.version) > 0;
      if (opts.installed && !inst) continue;
      if (opts.updates && !update) continue;
      rows.push([l.name, l.version, inst ? inst.version : '—', l.repo.name, [l.label, update && t('appstore.note.update')].filter(Boolean).join(', ')]);
      languages++;
    }
  }
  if (!store.admin && (opts.modules || both)) await ctx.out(dim(ctx, `${t('appstore.notAdminList')}\n`));
  if (rows.length === 1) {
    await ctx.out(`${t('appstore.nothing')}\n`);
    return 0;
  }
  await ctx.out(table(rows));
  await ctx.out(dim(ctx, `${t('appstore.counts', { modules, languages })}\n`));
  return 0;
}

async function search(ctx, words) {
  const text = words.join(' ').toLowerCase();
  if (!text) fail(t('appstore.usage.search'), 2);
  const store = await new Store(ctx).load();
  const hits = [
    ...store.modules().filter(m => m.name.toLowerCase().includes(text) || m.description.toLowerCase().includes(text)).map(m => [m.name, m.description]),
    ...store.languages().filter(l => [l.name, l.label, l.english ?? ''].some(s => s.toLowerCase().includes(text))).map(l => [l.name, l.english ? `${l.label} (${l.english})` : l.label]),
  ];
  const unique = [...new Map(hits.map(h => [h[0], h])).values()];
  if (!unique.length) {
    await ctx.out(`${t('appstore.noResults', { text })}\n`);
    return 1;
  }
  await ctx.out(table(unique));
  return 0;
}

async function info(ctx, [name]) {
  if (!name) fail(t('appstore.usage.info'), 2);
  const store = await new Store(ctx).load();
  const lang = LANG.exec(name);
  if (lang) {
    const l = store.languages().find(x => x.tag === lang[1]) ?? fail(t('appstore.noLanguage', { name }));
    const inst = store.installedLanguage(l.tag);
    await ctx.out(`${bold(ctx, `${l.name} ${l.version}`)} · ${t('appstore.kind.language')} · ${l.repo.name}\n${l.label}${l.english ? ` (${l.english})` : ''}\n`);
    await ctx.out(`${t('appstore.info.state')}  ${inst ? t('appstore.info.installedLanguage', { version: inst.version, by: inst.installedBy?.username ?? '—' }) : t('appstore.info.notInstalled', { name })}\n`);
    return 0;
  }
  const m = store.findModule(name);
  const inst = store.installedModule(name);
  if (!m && !inst) fail(store.isApp(name) ? t('appstore.isApp', { name }) : t('appstore.noModule', { name }));
  const manifest = m?.entry.module ?? inst;
  await ctx.out(`${bold(ctx, `${name} ${m?.version ?? inst.enabled}`)} · ${t('appstore.kind.module')} · ${m?.repo.name ?? store.repoOf(inst)?.name ?? '—'}\n${manifest.description ?? ''}\n`);
  const deps = (manifest.dependencies ?? []).map(d => `${d.module ?? d.app}${d.optional ? ` (${t('appstore.optional')})` : ''}`);
  const rows = [
    [t('appstore.info.provides'), (manifest.provides ?? []).join(', ') || '—'],
    [t('appstore.info.requires'), [...(manifest.requires ?? []), ...deps].join(', ') || '—'],
  ];
  if (inst) {
    const removal = await store.client.get(`/api/packages/removal?kind=module&id=${encodeURIComponent(name)}`).catch(() => null);
    if (removal?.blockedBy?.length) rows.push([t('appstore.info.usedBy'), removal.blockedBy.map(b => b.name ?? b.id).join(', ')]);
    rows.push([t('appstore.info.state'), [t('appstore.info.installed', { version: inst.enabled }), inst.required && t('appstore.note.required'), m && compare(m.version, inst.enabled) > 0 && t('appstore.info.updateTo', { version: m.version })].filter(Boolean).join(' · ')]);
  } else {
    rows.push([t('appstore.info.state'), t('appstore.info.notInstalled', { name })]);
  }
  await ctx.out(table(rows));
  return 0;
}

// ---------- install, remove, update ----------

/** A step of a plan: the kind, name and version, the repository by its name (as appstore list says it). */
function stepLine(ctx, store, s, sign) {
  const repo = store.repos.find(r => norm(r.url) === norm(s.repo?.url)) ?? (s.repo?.official ? store.repos.find(r => r.official) : null);
  const where = repo?.name ?? s.repo?.url ?? '';
  const version = s.from ? `${s.from} → ${s.version}` : s.version;
  return `  ${sign} ${s.kind === 'module' ? t('appstore.kind.module') : t('appstore.kind.app')}  ${s.name ?? s.id} ${version}  ${where}${s.verified === false ? `  ${t('appstore.note.unsigned')}` : ''}`;
}

/** The plan of a module (install or update target), shown; null when it cannot be done. */
async function planOf(ctx, store, target) {
  const plan = await store.client.post('/api/packages/plan', target);
  const required = plan.problems.filter(p => !p.optional);
  if (required.length) {
    for (const p of required) await ctx.err(`appstore: ${p.message}\n`);
    return null;
  }
  return plan;
}

/** Asks once for the unsigned packages of a plan (always no without --allow-unsigned when nobody answers). */
async function unsignedOk(ctx, opts, plan) {
  const unsigned = [plan.root, ...plan.steps.filter(s => !s.optional)].filter(s => s.verified === false);
  if (!unsigned.length || opts.allowUnsigned) return true;
  for (const s of unsigned) {
    if (!await confirm(ctx, t('appstore.unsignedAsk', { name: s.name ?? s.id, repo: s.repo?.url ?? '' }), { yes: false })) return false;
  }
  return true;
}

async function installPlan(ctx, store, target, plan, opts) {
  const answer = { grant: [], allowUnsigned: true };
  const steps = Object.fromEntries(plan.steps.filter(s => !s.optional).map(s => [s.key, answer]));
  const out = await store.client.post('/api/packages/install', { ...target, root: answer, steps });
  const done = [...out.installed ?? []];
  // The package asked for is the plan's root: said last, after what it needed
  if (!done.some(s => s.key === plan.root.key)) done.push({ key: plan.root.key, kind: plan.root.kind, id: plan.root.id ?? plan.root.name, version: plan.root.version, action: plan.root.action });
  for (const s of done) {
    await ctx.out(`  ${color(ctx, '32', '✓')} ${t(s.action === 'update' ? 'appstore.updated' : 'appstore.installed', { name: s.id, version: s.version })}${s.kind === 'module' ? ` ${dim(ctx, t('appstore.afterRestart'))}` : ''}\n`);
  }
  const skipped = plan.steps.filter(s => s.optional);
  if (skipped.length) await ctx.out(dim(ctx, `  ${t('appstore.optionalSkipped', { names: skipped.map(s => s.name ?? s.id).join(', ') })}\n`));
  return !!out.restartRequired;
}

async function install(ctx, words, opts) {
  if (!words.length) fail(t('appstore.usage.install'), 2);
  const store = await new Store(ctx).load();
  const work = [];
  for (const name of words) {
    const lang = LANG.exec(name);
    if (lang) {
      const l = store.languages().find(x => x.tag === lang[1]) ?? fail(t('appstore.noLanguage', { name }));
      if (store.installedLanguage(l.tag)?.version === l.version) { await ctx.out(`${t('appstore.already', { name })}\n`); continue; }
      work.push({ language: l });
      continue;
    }
    if (!store.modules().some(m => m.name === name) && store.isApp(name)) fail(t('appstore.isApp', { name }));
    needAdmin(store);
    if (store.installedModule(name)) { await ctx.out(`${t('appstore.alreadyModule', { name })}\n`); continue; }
    const m = store.findModule(name, opts.repo) ?? fail(t('appstore.noModule', { name }));
    const target = { install: { kind: 'module', source: { type: 'git', url: m.cat.repo.url, ref: m.cat.ref, path: m.entry.path } } };
    const plan = await planOf(ctx, store, target);
    if (!plan) return 1;
    work.push({ target, plan, repo: m.repo });
  }
  if (!work.length) return 0;
  await ctx.out(`${t('appstore.toInstall')}\n`);
  for (const w of work) {
    if (w.language) await ctx.out(`  ${color(ctx, '32', '+')} ${t('appstore.kind.language')}  ${w.language.tag} · ${w.language.label} ${w.language.version}  ${w.language.repo.name}\n`);
    else for (const s of [...w.plan.steps.filter(x => !x.optional), w.plan.root]) await ctx.out(`${stepLine(ctx, store, s, color(ctx, '32', '+'))}\n`);
  }
  if (!opts.yes && !await confirm(ctx, t('appstore.proceed'))) return 1;
  let restart = false;
  for (const w of work) {
    if (w.language) {
      await store.client.post('/api/languages', { language: w.language.tag });
      await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.languageInstalled', { tag: w.language.tag })}\n`);
      continue;
    }
    if (!await unsignedOk(ctx, opts, w.plan)) { await ctx.out(`  ${t('appstore.skipped', { name: w.plan.root.name ?? w.plan.root.id })}\n`); continue; }
    if (await installPlan(ctx, store, w.target, w.plan, opts)) restart = true;
  }
  return restart ? offerRestart(ctx, store, opts) : 0;
}

async function remove(ctx, words, opts) {
  if (!words.length) fail(t('appstore.usage.remove'), 2);
  const store = await new Store(ctx).load();
  let restart = false;
  let declined = false;
  for (const name of words) {
    const lang = LANG.exec(name);
    if (lang) {
      const inst = store.installedLanguage(lang[1]) ?? fail(t('appstore.languageNotInstalled', { name }));
      if (inst.canRemove === false) fail(t('appstore.languageNotYours', { name }));
      if (!opts.yes && !await confirm(ctx, t('appstore.removeLanguageAsk', { name: inst.name ?? lang[1] }), { yes: false })) { declined = true; continue; }
      await store.client.delete(`/api/languages/${encodeURIComponent(lang[1])}`);
      await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.languageRemoved', { tag: lang[1] })}\n`);
      continue;
    }
    needAdmin(store);
    const inst = store.installedModule(name) ?? fail(store.isApp(name) ? t('appstore.isApp', { name }) : t('appstore.notInstalled', { name }));
    if (inst.required) fail(t('appstore.required', { name }));
    // The kernel does not start without a file system: the last module giving it stays
    if (inst.provides?.includes('fs') && !store.installedModules.some(m => m.enabled && m.name !== name && m.provides?.includes('fs'))) fail(t('appstore.lastFs', { name }));
    const removal = await store.client.get(`/api/packages/removal?kind=module&id=${encodeURIComponent(name)}`);
    if (removal.blockedBy?.length) fail(t('appstore.blocked', { name, by: removal.blockedBy.map(b => b.name ?? b.id).join(', ') }));
    if (!opts.yes && !await confirm(ctx, t('appstore.removeAsk', { name }), { yes: false })) { declined = true; continue; }
    let also = [];
    if (removal.unneeded?.length) {
      const names = removal.unneeded.map(u => `${u.name ?? u.id} ${u.version ?? ''}`.trim()).join(', ');
      if (opts.yes || await confirm(ctx, t('appstore.unneededAsk', { names }))) also = removal.unneeded.map(u => u.key);
    }
    const out = await store.client.post('/api/packages/remove', { kind: 'module', id: name, also });
    for (const key of out.removed ?? []) await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.removed', { name: key.replace(/^\w+:/, '') })} ${dim(ctx, t('appstore.afterRestart'))}\n`);
    if (out.restartRequired) restart = true;
  }
  const code = restart ? await offerRestart(ctx, store, opts) : 0;
  return declined ? 1 : code;
}

async function update(ctx, words, opts) {
  const store = await new Store(ctx).load();
  const wanted = name => !words.length || words.includes(name);
  const modules = store.installedModules.filter(m => m.enabled && wanted(m.name)).map(m => ({ mod: m, to: store.updateFor(m) })).filter(x => x.to);
  const languages = store.installedLanguages.filter(l => wanted(`lang:${l.language}`))
    .map(l => ({ inst: l, to: store.languages().find(x => x.tag === l.language) })).filter(x => x.to && compare(x.to.version, x.inst.version) > 0);
  for (const name of words) {
    if (!modules.some(x => x.mod.name === name) && !languages.some(x => `lang:${x.inst.language}` === name)) await ctx.out(`${t('appstore.noUpdate', { name })}\n`);
  }
  if (!modules.length && !languages.length) {
    if (!words.length) await ctx.out(`${t('appstore.upToDate')}\n`);
    return 0;
  }
  await ctx.out(`${t('appstore.updates')}\n`);
  for (const { mod, to } of modules) await ctx.out(`  ${color(ctx, '36', '↑')} ${mod.name} ${mod.enabled} → ${to.version}   ${to.repo.name}\n`);
  for (const { inst, to } of languages) await ctx.out(`  ${color(ctx, '36', '↑')} lang:${inst.language} ${inst.version} → ${to.version}   ${to.repo.name}\n`);
  if (!opts.yes && !await confirm(ctx, t('appstore.updateAsk'))) return 1;
  let restart = false;
  for (const { mod } of modules) {
    const target = { update: { kind: 'module', id: mod.name } };
    const plan = await planOf(ctx, store, target);
    if (!plan || !await unsignedOk(ctx, opts, plan)) continue;
    if (await installPlan(ctx, store, target, plan, opts)) restart = true;
  }
  for (const { inst } of languages) {
    await store.client.post('/api/languages', { language: inst.language });
    await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.languageInstalled', { tag: inst.language })}\n`);
  }
  return restart ? offerRestart(ctx, store, opts) : 0;
}

// ---------- repositories ----------

async function repo(ctx, [sub = 'list', ...rest], opts) {
  const client = ctx.shell.client;
  if (sub === 'list') {
    const repos = await client.get('/api/repos');
    await ctx.out(table([[bold(ctx, t('appstore.col.id')), bold(ctx, t('appstore.col.repoName')), bold(ctx, t('appstore.col.url'))], ...repos.map(r => [r.id, r.name, r.url.replace(/^https?:\/\//, '')])]));
    return 0;
  }
  const store = new Store(ctx);
  needAdmin(store);
  if (sub === 'add') {
    let [url] = rest;
    if (!url) fail(t('appstore.usage.repoAdd'), 2);
    let name = opts.name;
    if (url === 'community') { url = COMMUNITY_URL; name ??= 'lilOS community'; }
    const repos = await client.get('/api/repos');
    const there = repos.find(r => norm(r.url) === norm(url));
    if (there) { await ctx.out(`${t('appstore.repoThere', { name: there.name })}\n`); return 0; }
    await ctx.out(`${t('appstore.reading')}\n`);
    const added = await client.post('/api/repos', { url, ...(name && { name }) });
    const cat = await client.get(`/api/repos/${encodeURIComponent(added.id)}/catalog`).catch(() => null);
    if (cat) await ctx.out(`${t('appstore.repoCounts', { modules: cat.modules?.length ?? 0, languages: cat.languages?.length ?? 0, apps: cat.apps?.length ?? 0 })}\n`);
    await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.repoAdded', { name: added.name, id: added.id })}\n`);
    return 0;
  }
  if (sub === 'remove') {
    const [id] = rest;
    if (!id) fail(t('appstore.usage.repoRemove'), 2);
    store.repos = await client.get('/api/repos');
    const r = store.repo(id) ?? fail(t('appstore.noRepo', { repo: id }));
    if (r.official) fail(t('appstore.officialStays'));
    if (!opts.yes && !await confirm(ctx, t('appstore.repoRemoveAsk', { name: r.name }), { yes: false })) return 1;
    await client.delete(`/api/repos/${encodeURIComponent(r.id)}`);
    await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.repoRemoved', { name: r.name })}\n`);
    return 0;
  }
  fail(t('appstore.usage.repo'), 2);
}

// ---------- lilOS itself, restart ----------

async function system(ctx, [sub = 'status', version], opts) {
  const client = ctx.shell.client;
  const store = new Store(ctx);
  const info = await client.get('/api/system');
  if (sub === 'status') {
    await ctx.out(`${bold(ctx, `lilOS ${info.version}`)}${info.mode === 'development' ? ` ${dim(ctx, t('appstore.system.development'))}` : ''}\n`);
    if (!store.admin) return 0;
    const official = await client.get('/api/repos/official/catalog').catch(() => null);
    const newest = official?.system?.system?.version ?? null;
    const rows = [];
    if (newest) rows.push([t('appstore.system.available'), compare(newest, info.version) > 0 ? `${newest} · appstore system update` : t('appstore.system.newest')]);
    if (info.next) rows.push([t('appstore.system.next'), info.next]);
    if (info.releases?.length) rows.push([t('appstore.system.kept'), info.releases.join(', ')]);
    if (info.failed) rows.push([t('appstore.system.failed'), `${info.failed.version}: ${info.failed.reason}`]);
    if (rows.length) await ctx.out(table(rows));
    return 0;
  }
  needAdmin(store);
  if (sub === 'update') {
    if (!opts.yes && !await confirm(ctx, t('appstore.system.updateAsk'))) return 1;
    const out = await client.post('/api/system/update', {});
    if (out.unchanged) { await ctx.out(`${t('appstore.system.unchanged', { version: out.version })}\n`); return 0; }
    await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.system.installed', { version: out.version, previous: out.previous ?? '—' })}\n`);
    return out.restartRequired ? offerRestart(ctx, store, opts) : 0;
  }
  if (sub === 'use') {
    if (!version) fail(t('appstore.usage.system'), 2);
    const out = await client.post('/api/system/use', { version });
    await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.system.use', { version: out.version })}\n`);
    return out.restartRequired ? offerRestart(ctx, store, opts) : 0;
  }
  if (sub === 'remove') {
    if (!version) fail(t('appstore.usage.system'), 2);
    if (!opts.yes && !await confirm(ctx, t('appstore.system.removeAsk', { version }), { yes: false })) return 1;
    await client.delete(`/api/system/releases/${encodeURIComponent(version)}`);
    await ctx.out(`  ${color(ctx, '32', '✓')} ${t('appstore.system.removed', { version })}\n`);
    return 0;
  }
  fail(t('appstore.usage.system'), 2);
}

/** After installing modules: the kernel restarted now (asked; -y does not restart, appstore restart does). */
async function offerRestart(ctx, store, opts) {
  if (!store.admin) return 0;
  if (opts.yes) { await ctx.out(`${t('appstore.restartLater')}\n`); return 0; }
  if (!await confirm(ctx, t('appstore.restartAsk'))) return 0;
  return restart(ctx);
}

async function restart(ctx) {
  const client = ctx.shell.client;
  const started = Date.now();
  await client.post('/api/kernel/restart', {});
  await ctx.out(`${t('appstore.restarting')}`);
  // It stops a moment after answering: first it goes (or 10 s pass), then it comes back
  const answers = () => client.get('/api/session', { timeout: 3000 }).then(() => true, () => false);
  while (Date.now() - started < 10_000 && await answers()) await ctx.shell.sleep(200);
  for (;;) {
    await ctx.tick();
    const up = await client.get('/api/session', { timeout: 3000 }).then(() => true, () => false);
    if (up) break;
    if (Date.now() - started > RESTART_WAIT_MS) {
      await ctx.out('\n');
      fail(t('appstore.restartTimeout'), 3);
    }
    await ctx.shell.sleep(1000);
  }
  await ctx.out(` ${t('appstore.restarted', { s: Math.round((Date.now() - started) / 1000) })}\n`);
  return 0;
}

export const appstoreCommand = {
  name: 'appstore',
  usage: 'appstore list|search|info|install|remove|update|repo|system|restart …',
  get summary() { return t('appstore.summary'); },
  get help() { return t('appstore.help'); },
  async run(ctx) {
    const [sub, ...args] = ctx.args;
    const { opts, words } = parse(args);
    return guard(async () => {
      switch (sub) {
        case 'list': return list(ctx, opts);
        case 'search': return search(ctx, words);
        case 'info': return info(ctx, words);
        case 'install': return install(ctx, words, opts);
        case 'remove': return remove(ctx, words, opts);
        case 'update': return update(ctx, words, opts);
        case 'repo': return repo(ctx, words, opts);
        case 'system': return system(ctx, words, opts);
        case 'restart': needAdmin(new Store(ctx)); return restart(ctx);
        case undefined: case 'help': await ctx.out(`${t('appstore.help')}\n`); return sub ? 0 : 2;
        default: fail(t('appstore.unknown', { sub }), 2);
      }
    });
  },
};
