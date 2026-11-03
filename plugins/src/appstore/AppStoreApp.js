import { Window, h, icon, appIcon, apps, repositories, kernelModules, packages, kernel, fs, settings, storage, toast, actionButton, busyButton, messageBox, textField, toggle } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `locale`: missing in older lilOS, so not imported by name
import { describePermission, launch, needsGrant, compareVersions } from '@lilos/system';
// Namespace import: lilOS versions without services (before the kernel's services) still load the AppStore
import * as system from '@lilos/system';
import { renderMarkdown } from './markdown.js';
import { t } from './i18n.js';
import './appstore.css';

/**
 * AppStore: the apps and kernel modules offered by the repositories (the official one and those
 * an admin added), to install, update and remove. Everything is done by the kernel: this only
 * shows and asks. Non-admins can look, not change; kernel modules are only for admins.
 *
 * One window: a search box over the tabs (Installed, Updates, then a tab per category with
 * the items of every repository), cards that open the details with the README, and "Options"
 * (preferences and repositories) at the bottom right. A README the kernel cut (past 64 KB) can be
 * saved whole in the Download folder.
 *
 * Each user can switch repositories off, the official one too: an inactive one is not read, and
 * nothing of it is listed or offered as an update (lilOS's own neither, when it is the official
 * one); what was installed from it stays in Installed. The list is the app's data
 * (app:appstore:repos.disabled, [{ id, name }]), so the Updates service skips them as well.
 *
 * lilOS itself is an item too (kind 'system', with a lilOS that has sdk.systemReleases): its version,
 * the newer one in the official repository with README and changelog, the versions kept on disk.
 * A new version starts with the kernel's restart; a copy of the repository (development) is
 * updated with git, not here.
 */
const categories = () => [
  { id: 'system', label: t('category.system') },
  { id: 'productivity', label: t('category.productivity') },
  { id: 'media', label: t('category.media') },
  { id: 'development', label: t('category.development') },
  { id: 'other', label: t('category.other') },
  { id: 'kernel', label: t('category.kernel') },
];
const APP_CATEGORIES = new Set(['system', 'productivity', 'media', 'development', 'other']);
const MODULE_ICON = { glyph: 'monitor', color: '#5f6673' };
const APP_ICON = { glyph: 'help', color: '#5f6673' };
const SYSTEM_ICON = { glyph: 'window', color: '#3b6ef5' };
/** lilOS's own versions: missing in older lilOS */
const releases = sdk.systemReleases ?? null;

settings.define({ 'appstore.showUnofficial': true });

/** Repositories this user switched off: [{ id, name }] (the name for the Updates service, which only gets names). */
const DISABLED_KEY = 'app:appstore:repos.disabled';
const readDisabled = () => {
  const raw = storage.get(DISABLED_KEY, []);
  return (Array.isArray(raw) ? raw : []).filter(r => typeof r?.id === 'string' && typeof r.name === 'string');
};

const cleanUrl = url => url.replace(/\.git$/i, '').replace(/\/+$/, '');
const sameRepo = (source, repo) => !!source?.url && cleanUrl(source.url).toLowerCase() === cleanUrl(repo.url).toLowerCase();
/** The repository's own name, without its path: the last part of its address. */
const repoName = repo => cleanUrl(repo.url).split(/[/\\]/).pop() || repo.name;

export default function AppStore() {
  const isAdmin = kernel.user?.role === 'admin';
  const state = {
    repos: [], catalogs: new Map(), errors: new Map(), modules: [], system: null, loading: true, busy: null, pressed: null,
    tab: 'installed', query: {}, view: 'list', key: null, newRepo: { url: '', name: '' }, updates: null,
  };

  const win = new Window({ title: 'AppStore', icon: 'download', width: 960, height: 640, minWidth: 560, minHeight: 420 });
  win.el.classList.add('appstore');

  /** Runs one change at a time; buttons are off meanwhile. */
  async function act(label, fn, done) {
    if (state.busy) return undefined;
    state.busy = label;
    render();
    let result;
    try {
      result = await fn();
      const text = typeof done === 'function' ? done(result) : done;
      if (text) toast(text, { timeout: 5000 });
      await load({ quiet: true });
    } catch (err) {
      toast(err.message, { timeout: 7000 });
    } finally {
      state.busy = null;
      render();
    }
    return result;
  }

  /** The AppStore's own service (Updates), as Control Panel → Startup → Services shows it, or null without services. */
  async function loadUpdatesService() {
    const list = await system.services?.list().catch(() => null);
    state.updates = list?.available ? list.services.find(s => s.app === 'appstore' && s.entry === 'updates') ?? null : null;
  }

  // ---------- «Controlla aggiornamenti» as an operation of the scheduler (lilOS ≥ 1.19.0) ----------

  const planner = sdk.schedule?.available && typeof sdk.schedule.forApp === 'function' ? sdk.schedule.forApp('appstore') : null;
  const UPDATE_WHEN = {
    daily: () => ({ every: { n: 1, unit: 'day' }, times: ['09:00'] }),
    weekly: () => ({ every: { n: 1, unit: 'week' }, days: [1], times: ['09:00'] }),
  };
  const today = () => { const d = new Date(); const p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`; };
  const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  /** The AppStore's operation, if there is one (state.updateTask), and the old start-up choice moved into it. */
  async function loadUpdateTask() {
    if (!planner) return;
    state.updateTask = (await planner.list().catch(() => [])).find(task => task.what?.type === 'service' && task.what.app === 'appstore' && task.what.entry === 'updates') ?? null;
    // Before: «at start-up» (the service at sign-in). Now an operation, every day: the choice carries over once
    if (!state.updateTask && state.updates?.startup === 'login') {
      state.updateTask = await saveUpdateTask({ on: true, every: 'daily' }).catch(() => null);
      await system.services.setStartup('appstore', 'updates', 'none').catch(() => {});
      await loadUpdatesService();
    }
  }

  async function saveUpdateTask({ on, every }) {
    const old = state.updateTask;
    const kind = every ?? updateEvery(old) ?? 'daily';
    const task = {
      name: t('updates.taskName'), enabled: on,
      when: old && !every ? old.when : { ...UPDATE_WHEN[kind](), start: old?.when?.start ?? today(), tz: old?.when?.tz ?? zone() },
      what: { type: 'service', app: 'appstore', entry: 'updates', params: {} },
      options: { ...(old?.options ?? {}), notify: 'error' },
    };
    return old ? planner.update(old.id, task) : planner.create(task);
  }

  const updateEvery = task => (!task?.when?.every ? null : task.when.every.unit === 'week' ? 'weekly' : task.when.every.unit === 'day' ? 'daily' : 'other');

  async function changeUpdateTask(change) {
    try {
      state.updateTask = await saveUpdateTask({ on: state.updateTask?.enabled ?? false, ...change });
    } catch (err) {
      toast(err.message, { timeout: 7000 });
    }
    render();
  }

  async function setUpdatesAtStart(on) {
    try {
      await system.services.setStartup('appstore', 'updates', on ? 'login' : 'none');
      await system.services[on ? 'start' : 'stop']('appstore', 'updates');
      toast(on ? t('updates.atStartOn') : t('updates.atStartOff'));
    } catch (err) {
      toast(err.message, { timeout: 7000 });
    }
    await loadUpdatesService();
    render();
  }

  async function readCatalog(repo) {
    try {
      state.catalogs.set(repo.id, await repositories.catalog(repo.id));
      state.errors.delete(repo.id);
    } catch (err) {
      state.catalogs.delete(repo.id);
      state.errors.set(repo.id, err.message);
    }
  }

  async function load({ quiet = false } = {}) {
    if (!quiet) { state.loading = true; render(); }
    try {
      state.repos = await repositories.list();
      // A removed repository leaves the list of the inactive ones
      const disabled = readDisabled();
      if (disabled.some(d => !state.repos.some(r => r.id === d.id))) storage.set(DISABLED_KEY, disabled.filter(d => state.repos.some(r => r.id === d.id)));
      await Promise.all(state.repos.filter(isEnabled).map(readCatalog));
      state.modules = isAdmin ? await kernelModules.list().catch(() => []) : [];
      state.system = releases ? await releases.info().catch(() => null) : null;
      await loadUpdatesService();
      await loadUpdateTask();
      await apps.refresh();
    } catch (err) {
      toast(err.message, { timeout: 7000 });
    }
    state.loading = false;
    render();
  }

  // ---------- Items: apps and modules of every repository, and what is installed ----------

  const isEnabled = repo => !readDisabled().some(d => d.id === repo.id);
  const visibleRepos = () => state.repos.filter(r => isEnabled(r) && (r.official || settings.get('appstore.showUnofficial')));

  /** Switches a repository on (its catalog is read now) or off, for this user. */
  async function setEnabled(repo, on) {
    const others = readDisabled().filter(d => d.id !== repo.id);
    storage.set(DISABLED_KEY, on ? others : [...others, { id: repo.id, name: repo.name }]);
    // The view is drawn again: the focus stays on the switch
    const redraw = () => { render(); win.body.querySelector(`#as-repo-${repo.id}`)?.focus(); };
    redraw();
    if (on && !state.catalogs.has(repo.id)) {
      await readCatalog(repo);
      redraw();
    }
  }

  function appItem(repo, entry, have) {
    const manifest = entry?.manifest ?? have.manifest;
    // Name and description in the user's language: the catalog's translations, or the installed app's
    const shown = (entry ? entry.locales && sdk.locale?.manifest(entry.manifest, entry.locales) : sdk.locale?.manifest(have.manifest)) || manifest;
    const offered = entry?.manifest.version ?? null;
    const here = !!have && (!entry || sameRepo(have.source, repo));
    return {
      key: `app:${repo?.id ?? '-'}:${manifest.id}`, kind: 'app', id: manifest.id, name: shown.name, shown,
      description: shown.description ?? '', icon: manifest.icon ?? APP_ICON, publisher: manifest.publisher?.name ?? '',
      category: APP_CATEGORIES.has(manifest.category) ? manifest.category : 'other',
      repo, entry, have, manifest, readme: entry?.readme ?? null, readmeTruncated: !!entry?.readmeTruncated,
      offered, installed: have?.version ?? null, here, elsewhere: !!have && !here,
      update: here && offered && compareVersions(offered, have.version) > 0 ? offered : null,
      required: !!manifest.required,
      verified: !!have?.signed || !!repo?.official,
    };
  }

  function moduleItem(repo, entry, have) {
    const module = entry?.module ?? have;
    const offered = entry?.module.version ?? null;
    const here = !!have && (!entry || sameRepo(have.source, repo));
    return {
      key: `module:${repo?.id ?? '-'}:${module.name}`, kind: 'module', id: module.name, name: module.name,
      description: module.description ?? '', icon: entry?.module.icon ?? have?.icon ?? MODULE_ICON, publisher: '',
      category: 'kernel', repo, entry, have, module, readme: entry?.readme ?? null, readmeTruncated: !!entry?.readmeTruncated,
      offered, installed: have ? have.enabled ?? have.running : null, here, elsewhere: !!have && !here,
      update: here && have.enabled && offered && compareVersions(offered, have.enabled) > 0 ? offered : null,
      provides: module.provides ?? [], verified: !!repo?.official,
      // A module lilOS cannot do without (the scheduler): updated, never removed
      required: !!have?.required || !!entry?.module?.required,
    };
  }

  /** lilOS: what runs (state.system) and what the official repository offers (its catalog's `system`). */
  function systemItem() {
    const info = state.system;
    if (!info) return null;
    const repo = state.repos.find(r => r.official) ?? null;
    // The official repository switched off: no newer lilOS offered
    const entry = repo && isEnabled(repo) && state.catalogs.get(repo.id)?.system?.system ? state.catalogs.get(repo.id).system : null;
    const offered = entry?.system.version ?? null;
    const installed = info.mode === 'installed';
    return {
      key: 'system:lilos', kind: 'system', id: 'lilos', name: 'lilOS', description: t('system.description'),
      icon: SYSTEM_ICON, publisher: 'lilOS', category: 'system', repo, entry, have: info,
      readme: entry?.readme ?? null, readmeTruncated: !!entry?.readmeTruncated,
      changelog: entry?.changelog ?? null, changelogTruncated: !!entry?.changelogTruncated,
      offered, installed: info.version, here: true, elsewhere: false,
      // Already put next to this one, waiting for the restart: nothing to update
      update: installed && offered && compareVersions(offered, info.version) > 0 && offered !== info.next ? offered : null,
      required: true, verified: true,
    };
  }

  function allItems() {
    const installed = apps.list();
    const modules = state.modules.filter(m => m.enabled || m.running);
    const out = [];
    for (const repo of visibleRepos()) {
      const catalog = state.catalogs.get(repo.id);
      for (const entry of catalog?.apps ?? []) if (entry.manifest) out.push(appItem(repo, entry, installed.find(a => a.id === entry.manifest.id)));
      if (isAdmin) for (const entry of catalog?.modules ?? []) if (entry.module && !entry.replacedBy) out.push(moduleItem(repo, entry, modules.find(m => m.name === entry.module.name)));
    }
    // Installed, but not offered by a repository shown here (or not read yet)
    for (const app of installed) {
      if (!out.some(i => i.kind === 'app' && i.here && i.id === app.id)) out.push(appItem(state.repos.find(r => sameRepo(app.source, r)) ?? null, null, app));
    }
    for (const m of modules) {
      if (!out.some(i => i.kind === 'module' && i.here && i.id === m.name)) out.push(moduleItem(state.repos.find(r => sameRepo(m.source, r)) ?? null, null, m));
    }
    // Installed modules that a module of a catalog takes the place of (its module.json `replaces`):
    // installing that one replaces them (the kernel moves their settings and removes them)
    const replacers = out.filter(i => i.kind === 'module' && i.entry && !i.have && i.module.replaces?.length);
    for (const item of out) {
      if (item.kind !== 'module' || !item.here || !item.have.enabled || item.have.replacedBy) continue;
      item.replacedBy = replacers.find(r => r.module.replaces.includes(item.id)) ?? null;
    }
    const system = systemItem();
    return system ? [system, ...out] : out;
  }

  function tabs(items) {
    const present = new Set(items.filter(i => !i.repo || isEnabled(i.repo)).map(i => i.category));
    return [
      { id: 'installed', label: t('tab.installed'), filter: i => i.here },
      { id: 'updates', label: t('tab.updates'), filter: pending, badge: true },
      // What came from a repository switched off is only in Installed
      ...categories().filter(c => present.has(c.id) || (c.id === 'kernel' && isAdmin)).map(c => ({ ...c, category: true, filter: i => i.category === c.id && (!i.repo || isEnabled(i.repo)) })),
    ];
  }

  /** Something newer to take: an update, or the module that replaces an installed one. */
  const pending = item => !!item.update || !!item.replacedBy;

  const matches = (item, query) => !query || [item.name, item.id, item.description, item.publisher, item.repo ? repoName(item.repo) : '']
    .some(text => text.toLowerCase().includes(query));

  const restartNeeded = () => isAdmin && state.modules.some(m => (m.enabled ?? null) !== (m.running ?? null));
  /** The version of lilOS that starts with the next restart of the kernel, when it is not the one running. */
  const systemNext = () => (isAdmin ? state.system?.next ?? null : null);

  // ---------- Actions ----------

  /**
   * A question over the window, with Cancel and one button that confirms: true when it is pressed.
   * Without `confirm` only one button, labelled `cancel`. text: lines; content: what the app adds
   * under them (lists, ticks). A destructive answer is not the one of Enter.
   */
  async function ask({ title, text, content = null, confirm = null, cancel = null, kind = null, width = 440 }) {
    const buttons = confirm
      ? [cancel ? { value: 'cancel', label: cancel } : 'cancel', { value: 'yes', label: confirm.label, primary: confirm.primary, danger: confirm.danger }]
      : [{ value: 'cancel', label: cancel, primary: true }];
    const answer = await messageBox(win, {
      icon: kind ?? (confirm?.danger ? 'warning' : null), title, text: text.join('\n\n'), content, width, buttons,
      default: confirm && !confirm.danger ? 'yes' : 'cancel',
    });
    return answer === 'yes';
  }

  /** The installed modules a module takes the place of (module.json `replaces`): they go when it comes in. */
  const takesPlaceOf = item => (item.kind === 'module' ? (item.module.replaces ?? []).filter(n => state.modules.some(m => m.name === n)) : []);
  const replacing = (name, replaces) => (replaces.length ? [t('confirm.replaces', { name, names: replaces.join(', ') })] : []);

  /** Asks before installing: what the package may do and, when it is not official, the warning. null when the user said no. */
  async function confirmInstall({ title, name, permissions = [], official, kernelModule = false, replaces = [] }) {
    const asked = needsGrant(permissions);
    const what = kernelModule ? null : asked.length ? h('ul', {}, ...asked.map(p => h('li', {}, describePermission(p)))) : h('p', {}, t('permissions.none'));
    const ok = await ask({
      title,
      text: [kernelModule ? t('confirm.kernelModule', { name }) : t('confirm.mayDo', { name }), ...replacing(name, replaces)],
      content: what || !official ? h('div', { class: 'as-ask' }, what, official ? null : h('p', { class: 'as-warning' }, t('confirm.unverified'))) : null,
      confirm: { label: official ? t('action.install') : t('action.installAnyway'), primary: official, danger: !official },
    });
    return ok ? { grant: asked, allowUnsigned: !official } : null;
  }

  /** What installing or updating a module did, and the modules it took the place of (result.replaced). */
  const moduleDone = (result, text) => (result?.replaced?.length ? `${text} ${t('done.moduleReplaced', { names: result.replaced.join(', ') })}` : text);

  /** Where a package of a catalog is installed from. */
  const sourceOf = ({ repo, entry }) => ({ type: 'git', url: repo.url, path: entry.path, ref: state.catalogs.get(repo.id)?.ref });

  // ---------- Dependencies: what a package needs comes with it (packages) ----------

  const depKey = d => (d.module !== undefined ? `module:${d.module}` : `app:${d.app}`);
  /** An app's manifest in the user's language (with its translations, when there are some). */
  const localized = (manifest, locales) => (locales ? sdk.locale?.manifest(manifest, locales) : sdk.locale?.manifest(manifest)) || manifest;
  const installedAppName = id => { const app = apps.get(id); return app ? localized(app.manifest).name : id; };
  const stepName = step => (step.kind === 'app' && step.manifest ? localized(step.manifest, step.locales).name : step.name);
  const stepAction = step => (step.action === 'install' ? t('deps.install', { version: step.version }) : t('deps.update', { from: step.from, version: step.version }));
  const kindWord = kind => (kind === 'module' ? t('deps.kindModule') : t('deps.kindApp'));
  const repoText = url => { const repo = state.repos.find(r => sameRepo({ url }, r)); return repo ? repoName(repo) : url; };

  /**
   * Asks before installing (or updating) a package that needs others: what it may do, what comes with
   * it, what may come with it (optional: the admin ticks it), what cannot be had (then it cannot go
   * in). Resolves with packages.install's answers ({ root, steps }), or null.
   */
  async function confirmPlan({ title, name, plan, official, kernelModule = false, permissions = [], rootDeps = null, replaces = [] }) {
    const asked = needsGrant(permissions);
    const required = plan.steps.filter(s => !s.optional);
    const choices = plan.steps.filter(s => s.choice);
    const blocking = plan.problems.filter(p => !p.optional);
    const unavailable = plan.problems.filter(p => p.optional);
    const ticked = new Set();
    const byKey = new Map(plan.steps.map(s => [s.key, s]));
    // What an optional choice brings with it (needed only through optional dependencies)
    const brings = step => {
      const out = [];
      const walk = s => s.needs.forEach(key => {
        const next = byKey.get(key);
        if (next && next.optional && !next.choice && !out.includes(next)) { out.push(next); walk(next); }
      });
      walk(step);
      return out;
    };
    // The reasons, in the user's language: from the manifest of the package that needs it
    const deps = new Map([[plan.root.key, rootDeps ?? plan.root.manifest?.dependencies ?? []],
      ...plan.steps.filter(s => s.manifest).map(s => [s.key, localized(s.manifest, s.locales).dependencies ?? []])]);
    const reasons = step => step.neededBy.map(by => {
      const reason = (deps.get(by.key) ?? []).find(d => depKey(d) === step.key)?.reason ?? by.reason;
      const who = by.key === plan.root.key ? name : stepName(byKey.get(by.key) ?? by);
      return h('span', { class: 'as-dep-why' }, reason ? t('deps.whyReason', { name: who, reason }) : t('deps.why', { name: who }));
    });
    const row = (step, control = null) => h('li', { class: 'as-dep' },
      control,
      appIcon(step.icon ?? (step.kind === 'module' ? MODULE_ICON : APP_ICON)),
      h('div', { class: 'as-dep-text' },
        h('b', {}, stepName(step), ' ', h('span', { class: 'as-dep-action' }, stepAction(step))),
        h('span', { class: 'as-dep-sub' }, [kindWord(step.kind), repoText(step.repo.url)].join(' · ')),
        ...reasons(step),
        step.permissions.length ? h('ul', {}, ...step.permissions.map(p => h('li', {}, describePermission(p)))) : null,
        step.verified ? null : h('span', { class: 'as-dep-warning' }, step.kind === 'module' ? t('deps.unverifiedModule') : t('deps.unverifiedApp')),
        ...(control ? brings(step).map(s => h('span', { class: 'as-dep-sub' }, t('deps.brings', { name: stepName(s), kind: kindWord(s.kind) }))) : [])));
    const tick = step => {
      const box = h('input', { type: 'checkbox', 'aria-label': t('deps.tick', { name: stepName(step) }) });
      box.addEventListener('change', () => (box.checked ? ticked.add(step.key) : ticked.delete(step.key)));
      return box;
    };
    const steps = () => {
      const out = {};
      const add = s => { out[s.key] = { grant: s.permissions, allowUnsigned: !s.verified }; };
      required.forEach(add);
      for (const s of choices) if (ticked.has(s.key)) [s, ...brings(s)].forEach(add);
      return out;
    };
    const unverified = !official || required.some(s => !s.verified);
    const ok = await ask({
      title, width: 520,
      text: [kernelModule ? t('confirm.kernelModule', { name }) : t('confirm.mayDo', { name }), ...replacing(name, replaces)],
      content: h('div', { class: 'as-ask' },
        !kernelModule && asked.length ? h('ul', {}, ...asked.map(p => h('li', {}, describePermission(p)))) : null,
        !kernelModule && !asked.length ? h('p', {}, t('permissions.none')) : null,
        official ? null : h('p', { class: 'as-warning' }, t('confirm.unverified')),
        blocking.length ? h('div', { class: 'as-dep-blocked', role: 'alert' }, h('b', {}, t('deps.cannot', { name })), h('ul', {}, ...blocking.map(p => h('li', {}, p.message)))) : null,
        required.length ? h('h3', { class: 'as-dep-title' }, t('deps.required')) : null,
        required.length ? h('ul', { class: 'as-deps' }, ...required.map(s => row(s))) : null,
        choices.length ? h('h3', { class: 'as-dep-title' }, t('deps.optional')) : null,
        choices.length ? h('ul', { class: 'as-deps' }, ...choices.map(s => row(s, tick(s)))) : null,
        unavailable.length ? h('p', { class: 'as-dep-sub', title: unavailable.map(p => p.message).join('\n') }, t('deps.unavailable', { list: unavailable.map(p => p.id).join(', ') })) : null,
        plan.restartRequired ? h('p', { class: 'as-dep-sub' }, t('deps.restartNote')) : null),
      cancel: blocking.length ? t('action.close') : null,
      confirm: blocking.length ? null : { label: unverified ? t('action.installAnyway') : t('action.install'), primary: !unverified, danger: unverified },
    });
    return ok ? { root: { grant: asked, allowUnsigned: !official }, steps: steps() } : null;
  }

  /** After modules were installed (or removed): they start (or stop) with the kernel's restart, now or later. */
  async function offerRestart(name, { removed = false } = {}) {
    if (!isAdmin) return;
    const now = await ask({
      title: t('restart.askTitle'),
      text: [removed ? t('restart.askRemovedLead', { name }) : t('restart.askLead', { name }), t('restart.askHint')],
      confirm: { label: t('action.restartNow'), primary: true }, cancel: t('action.later'),
    });
    if (now) restartKernel();
  }

  /** Runs fn with the buttons off (the one pressed spinning) and nothing reloaded after: its result, or null after saying what went wrong. */
  async function busy(fn) {
    if (state.busy) return null;
    state.busy = 'plan';
    render();
    try {
      return await fn();
    } catch (err) {
      toast(err.message, { timeout: 7000 });
      return null;
    } finally {
      state.busy = null;
      render();
    }
  }

  /** The plan of an install or update (packages.plan), or null after saying why it could not be made. */
  async function planFor(target) {
    try {
      return await packages.plan(target);
    } catch (err) {
      toast(err.message, { timeout: 7000 });
      return null;
    }
  }

  /**
   * What installing a package from a catalog needs from the admin: its plan with what comes with it,
   * or (nothing comes with it) the usual question. { target, answer } | { source, answer }, or null.
   * inAct: already inside act() (Update all): the plan is read without busy(). trusted: an official
   * package with nothing coming with it goes in without asking (as official updates do).
   */
  async function askInstall(item, { inAct = false, trusted = false } = {}) {
    const { repo } = item;
    const source = sourceOf(item);
    const isModule = item.kind === 'module';
    const target = { install: { kind: item.kind, source } };
    const plan = inAct ? await planFor(target) : await busy(() => planFor(target));
    if (!plan) return null;
    if (plan.steps.length || plan.problems.length) {
      const answer = await confirmPlan({
        title: t('confirm.installTitle', { name: item.name }), name: item.name, plan, official: repo.official, kernelModule: isModule,
        permissions: item.manifest?.permissions, rootDeps: item.shown?.dependencies, replaces: takesPlaceOf(item),
      });
      return answer && { target, answer };
    }
    if (trusted && repo.official) return { source, answer: { grant: needsGrant(item.manifest?.permissions), allowUnsigned: false } };
    const answer = await confirmInstall({
      title: t('confirm.installTitle', { name: item.name }), name: item.name, official: repo.official,
      ...(isModule ? { kernelModule: true, replaces: takesPlaceOf(item) } : { permissions: item.manifest.permissions }),
    });
    return answer && { source, answer };
  }

  /** Installs what askInstall agreed: the package's own result, with restartRequired and what came with it. */
  const runInstall = (item, how) => (how.target
    ? packages.install(how.target, how.answer).then(out => ({ ...out.result, installed: out.installed, restartRequired: out.restartRequired }))
    : item.kind === 'module' ? kernelModules.install(how.source, { allowUnsigned: how.answer.allowUnsigned }) : apps.install(how.source, how.answer));

  async function install(item) {
    const how = await askInstall(item);
    if (!how) return;
    const name = item.name;
    const r = await act('install', () => runInstall(item, how), out => (how.target ? moduleDone(out, t('deps.installed', { name, n: out.installed.length }))
      : item.kind === 'module' ? moduleDone(out, t('done.moduleInstalled', { name })) : t('done.appInstalled', { name })));
    if (r?.restartRequired) offerRestart(name);
  }

  /** What updating needs from the user (what comes with it, new permissions, the warning): null when they said no. */
  async function askUpdate(item) {
    const official = !!item.repo?.official;
    // What the new version needs and is missing comes with it
    if (item.kind === 'app' || item.kind === 'module') {
      const target = { update: { kind: item.kind, id: item.id } };
      const plan = await planFor(target);
      if (!plan) return null;
      if (plan.steps.length || plan.problems.length) {
        const answers = await confirmPlan({
          title: t('confirm.updateTitle', { name: item.name }), name: item.name, plan, official, kernelModule: item.kind === 'module',
          permissions: plan.root.permissions, rootDeps: item.entry?.locales ? localized(plan.root.manifest ?? item.manifest, item.entry.locales).dependencies : null,
        });
        return answers && { plan: target, answers };
      }
    }
    if (item.kind === 'module') {
      return official || await confirmInstall({ title: t('confirm.updateTitle', { name: item.name }), name: item.name, official, kernelModule: true }) ? { allowUnsigned: !official } : null;
    }
    const added = needsGrant(item.entry?.manifest.permissions).filter(p => !item.have.granted.includes(p));
    if (!added.length && official) return { grant: [], allowUnsigned: false };
    return confirmInstall({ title: t('confirm.updateTitle', { name: item.name }), name: item.name, permissions: added, official });
  }

  const runUpdate = (item, answer) => (answer.plan
    ? packages.install(answer.plan, answer.answers).then(out => ({ ...out.result, restartRequired: out.restartRequired }))
    : item.kind === 'module' ? kernelModules.update(item.id, answer) : apps.update(item.id, answer));

  /**
   * Updates apps through lilOS (updateApps): it says what will close, lets the windows save, puts
   * the new version in place and asks to restart when needed. The AppStore closes too when it is
   * among them, and opens again. An older lilOS: straight to the kernel.
   * jobs: [{ item, run }] → [{ item, result } | { item, error }], or null when the user went back.
   */
  async function updateThroughSystem(jobs, { reinstall = false } = {}) {
    if (!system.updateApps) {
      const out = [];
      for (const job of jobs) out.push(await job.run().then(result => ({ item: job.item, result }), error => ({ item: job.item, error })));
      return out;
    }
    const out = await system.updateApps(jobs.map(({ item, run }) => ({ id: item.id, run, restartOnUpdate: item.entry?.manifest.restartOnUpdate })), { from: 'appstore', reinstall });
    return out && out.map((r, i) => ({ ...r, item: jobs[i].item }));
  }

  /** One app through lilOS: its result (null when the user went back), or its error thrown. */
  async function updateOne(item, run, options) {
    const [out] = await updateThroughSystem([{ item, run }], options) ?? [null];
    if (out?.error) throw out.error;
    return out ? out.result : null;
  }

  async function update(item) {
    const isModule = item.kind === 'module', name = item.name;
    const r = await act('update', async () => {
      const answer = await askUpdate(item);
      if (!answer) return null;
      return isModule ? runUpdate(item, answer) : updateOne(item, () => runUpdate(item, answer));
    }, r => (!r ? null : r.unchanged ? (isModule ? t('done.moduleUpToDate', { name }) : t('done.appUpToDate', { name }))
      : isModule ? moduleDone(r, t('done.moduleUpdated', { name, version: r.version })) : t('done.appUpdated', { name, version: r.version })));
    // Only when this update brought modules with it (a module's own update: the banner)
    if (r?.restartRequired && !isModule) offerRestart(name);
  }

  /** lilOS goes last, with its own question: it is not an app (no manifest) and starts after the restart. */
  function updateAll(items) {
    act('update', async () => {
      let done = 0;
      const jobs = [];
      const lilos = items.find(i => i.kind === 'system');
      const replacing = new Set();
      for (const item of items) {
        if (item === lilos) continue;
        if (item.replacedBy) {
          // The module that takes its place (with what it needs), installed once even when it replaces several
          const by = item.replacedBy;
          if (replacing.has(by.name)) continue;
          replacing.add(by.name);
          const how = await askInstall(by, { inAct: true, trusted: true });
          if (!how) continue;
          try {
            await runInstall(by, how);
            done++;
          } catch (err) {
            toast(`${by.name}: ${err.message}`, { timeout: 7000 });
          }
          continue;
        }
        const answer = await askUpdate(item);
        if (!answer) continue;
        if (item.kind !== 'module') {
          jobs.push({ item, run: () => runUpdate(item, answer) });
          continue;
        }
        try {
          await runUpdate(item, answer);
          done++;
        } catch (err) {
          toast(`${item.name}: ${err.message}`, { timeout: 7000 });
        }
      }
      for (const r of (jobs.length && await updateThroughSystem(jobs)) || []) {
        if (r.error) toast(`${r.item.name}: ${r.error.message}`, { timeout: 7000 });
        else done++;
      }
      if (lilos && await confirmSystemUpdate(lilos)) {
        try {
          if (!(await releases.update()).unchanged) done++;
        } catch (err) {
          toast(`${lilos.name}: ${err.message}`, { timeout: 7000 });
        }
      }
      return done;
    }, done => t('done.updatedCount', { n: done }));
  }

  /**
   * Asks before removing a package; an app goes for every user, with its settings and data. Packages
   * installed only for it that nothing else needs are listed, ticked, and go with it.
   * Resolves with { also: [keys] }, or null.
   */
  async function confirmRemoval(item, unneeded) {
    const isModule = item.kind === 'module';
    const also = new Set(unneeded.map(u => u.key));
    const row = u => {
      const label = u.kind === 'app' ? installedAppName(u.id) : u.name;
      const box = h('input', { type: 'checkbox', 'aria-label': t('deps.alsoRemove', { name: label }) });
      box.checked = true;
      box.addEventListener('change', () => (box.checked ? also.add(u.key) : also.delete(u.key)));
      return h('li', { class: 'as-dep' }, box, h('div', { class: 'as-dep-text' },
        h('b', {}, label, ' ', h('span', { class: 'as-dep-action' }, u.version)),
        h('span', { class: 'as-dep-sub' }, kindWord(u.kind))));
    };
    const ok = await ask({
      title: isModule ? t('confirm.removeTitle', { name: item.name }) : t('confirm.uninstallTitle', { name: item.name }), width: unneeded.length ? 480 : 440,
      text: isModule ? [t('confirm.removeModule', { name: item.name })] : [t('confirm.uninstall', { name: item.name }), t('confirm.uninstallFiles')],
      content: unneeded.length ? h('div', { class: 'as-ask' },
        h('h3', { class: 'as-dep-title' }, t('deps.unneededTitle')),
        h('p', { class: 'as-dep-sub' }, t('deps.unneededHint')),
        h('ul', { class: 'as-deps' }, ...unneeded.map(row))) : null,
      confirm: { label: isModule ? t('action.remove') : t('action.uninstall'), danger: true },
    });
    return ok ? { also: [...also] } : null;
  }

  async function remove(item) {
    const name = item.name, isModule = item.kind === 'module';
    const info = await busy(() => packages.removal(item.kind, item.id));
    if (!info) return;
    // Another installed package needs it: it stays until that one goes
    if (info.blockedBy.length) {
      const list = info.blockedBy.map(b => (b.kind === 'app' ? installedAppName(b.id) : b.name)).join(', ');
      await ask({
        title: isModule ? t('confirm.removeTitle', { name }) : t('confirm.uninstallTitle', { name }), kind: 'info',
        text: [t('deps.blocked', { name, list }), t('deps.blockedHint', { n: info.blockedBy.length })],
        cancel: t('action.close'),
      });
      return;
    }
    // A module that leaves nothing behind goes without a question (as before dependencies)
    if (isModule && !info.unneeded.length) {
      act('remove', () => kernelModules.remove(item.id), r => (r.kept.length ? t('done.moduleRemovedDataKept', { name }) : t('done.moduleRemoved', { name })));
      return;
    }
    const answer = await confirmRemoval(item, info.unneeded);
    if (!answer) return;
    const r = await act('remove', () => packages.remove(item.kind, item.id, answer), out => (out.removed.length > 1
      ? t(isModule ? 'deps.moduleRemovedWith' : 'deps.appRemovedWith', { name, n: out.removed.length - 1 })
      : isModule ? t('done.moduleRemoved', { name }) : t('done.appRemoved', { name })));
    // Modules taken away stop with the kernel's restart: as after installing, now or later
    if (r?.restartRequired) offerRestart(name, { removed: true });
  }

  /** Apps an administrator can take away: installed from here, and not needed by lilOS. */
  const canUninstall = item => isAdmin && item.kind === 'app' && item.here && !item.required;

  const reinstall = item => act('reinstall', () => updateOne(item, () => apps.update(item.id, { reinstall: true, allowUnsigned: !item.verified }), { reinstall: true }),
    r => (r ? t('done.appReinstalled', { name: item.name }) : null));

  /** Saves a whole text the kernel cut (a README, lilOS's changelog) in the Download folder; the link waits meanwhile. */
  const saveWhole = (link, name, read) => busyButton(link, async () => {
    try {
      const text = await read();
      const folder = fs.children(fs.root).find(n => n.type === 'folder' && n.system && n.name === 'Download');
      if (!folder) throw new Error(t('error.noDownloadFolder'));
      const file = fs.create(folder.id, { type: 'file', name });
      await fs.write(file.id, text);
      toast(t('readme.saved', { file: file.name }), { timeout: 6000 });
    } catch (err) {
      toast(err.message, { timeout: 7000 });
    }
  });
  const downloadReadme = (item, link) => saveWhole(link, `${item.name} - README.md`, () => repositories.readme(item.repo.id, item.entry.path));
  const downloadChangelog = (item, link) => saveWhole(link, 'lilOS - CHANGELOG.md', () => repositories.readme(item.repo.id, item.entry.path, 'CHANGELOG.md'));

  // ---------- lilOS ----------

  /** Asks before updating lilOS: it starts after the restart, and goes back by itself if it does not. */
  const confirmSystemUpdate = item => ask({
    title: t('system.confirmTitle', { version: item.update }),
    text: [t('system.confirmLead', { version: item.update, current: item.installed }), t('system.confirmRestart'), t('system.confirmRollback', { current: item.installed })],
    confirm: { label: t('action.update'), primary: true },
  });

  /** Puts the newer version of lilOS next to this one: it runs after the restart (or lilOS goes back by itself). */
  async function updateSystem(item) {
    if (await confirmSystemUpdate(item)) act('update', () => releases.update(), r => (r.unchanged ? t('system.upToDate') : t('system.ready', { version: r.version })));
  }

  /** Another version kept on disk: it runs after the restart, on trial as an update. */
  const useRelease = version => act('system', () => releases.use(version),
    r => (r.restartRequired ? t('system.ready', { version }) : t('system.nextCancelled')));

  async function removeRelease(version) {
    const ok = await ask({
      title: t('system.removeTitle', { version }),
      text: [t('system.removeLead', { version })],
      confirm: { label: t('action.delete'), danger: true },
    });
    if (ok) act('system', () => releases.remove(version), t('system.removed', { version }));
  }

  const restartKernel = () => act('restart', async () => {
    const modules = restartNeeded();
    await kernelModules.restart();
    await new Promise(r => setTimeout(r, 2500));
    // lilOS too, so that it is coherent with the kernel's new modules (it asks the user: not awaited).
    // A new version of lilOS: lilOS asks by itself once the kernel is back with it
    if (modules) system.requestRestart?.(t('restart.kernelReason'), 'kernel-modules');
  }, t('done.kernelRestarted'));

  // ---------- Views ----------

  /** key: tells apart buttons with the same label, so the one pressed shows the spinner while its change runs. */
  const button = (label, onClick, { key = '', ...opts } = {}) => {
    const id = `${label}|${key}`;
    const b = actionButton({ label, onClick: () => { state.pressed = id; return onClick(); }, ...opts });
    b.disabled = !!state.busy;
    if (state.busy && state.pressed === id) b.setAttribute('aria-busy', 'true');
    return b;
  };
  const status = (text, ok = false) => h('span', { class: 'as-state' }, ok ? icon('check') : null, text);
  const repoLabel = item => (item.repo
    ? h('span', { class: 'as-repo', title: item.repo.url }, icon('link'), h('span', {}, repoName(item.repo)))
    : h('span', { class: 'as-repo' }, icon('folder'), h('span', {}, item.kind === 'module' ? t('repo.manual') : t('repo.localFolder'))));
  const unofficial = item => (item.repo && !item.repo.official ? h('span', { class: 'as-unofficial' }, t('repo.unofficial')) : null);
  const installedWord = item => (item.kind === 'system' ? t('system.inUse') : item.kind === 'module' ? t('status.installedModule') : t('status.installedApp'));
  const section = (title, ...extra) => h('div', { class: 'as-section-title' }, title, ...extra);
  const fact = (label, value) => h('div', { class: 'as-fact' }, h('b', {}, label), String(value));
  const backButton = label => h('button', { class: 'as-back', onclick: () => show('list') }, icon('arrowLeft'), label);

  function cardControl(item) {
    if (item.kind === 'system') {
      if (item.update) return isAdmin ? button(t('action.update'), () => updateSystem(item), { primary: true, key: item.key }) : status(t('status.updateAvailable', { version: item.update }));
      return systemNext() ? status(t('system.nextShort', { version: systemNext() })) : status(t('system.inUse'), true);
    }
    if (item.replacedBy) return isAdmin ? button(t('action.installName', { name: item.replacedBy.name }), () => install(item.replacedBy), { primary: true, key: item.key }) : status(t('status.replacedBy', { name: item.replacedBy.name }));
    if (item.update) return isAdmin ? button(t('action.update'), () => update(item), { primary: true, key: item.key }) : status(t('status.updateAvailable', { version: item.update }));
    if (item.here) return status(item.kind === 'module' && !item.have.enabled ? t('status.removed') : installedWord(item), true);
    if (item.elsewhere) return status(t('status.otherRepo'));
    return isAdmin ? button(t('action.install'), () => install(item), { key: item.key }) : status(t('status.available'));
  }

  /** uninstall: the Installed tab, where each app that can go has its own button. */
  function card(item, { uninstall = false } = {}) {
    const version = item.replacedBy ? `${item.installed} → ${t('status.replacedBy', { name: item.replacedBy.name })}`
      : item.update ? `${item.installed} → ${item.update}` : item.here ? item.installed : item.offered;
    const uninstallButton = uninstall && canUninstall(item) ? button(t('action.uninstall'), () => remove(item), { danger: true, key: item.key }) : null;
    return h('div', { class: 'as-card' },
      h('div', { class: 'as-card-top' },
        appIcon(item.icon),
        h('div', { class: 'as-card-head' },
          h('button', { class: 'as-card-open', onclick: () => show('detail', item.key) }, item.name, h('span', { class: 'as-ver' }, version)),
          h('div', { class: 'as-card-desc' }, item.description))),
      h('div', { class: 'as-card-foot' }, repoLabel(item), unofficial(item), h('span', { class: 'as-spacer' }),
        // The button says it is installed: no "Installed" next to it
        uninstallButton && !item.update ? null : cardControl(item), uninstallButton));
  }

  const grid = (list, options) => h('div', { class: 'as-grid' }, ...list.map(item => card(item, options)));

  function banners() {
    const out = [];
    if (systemNext() && ['installed', 'updates', 'system'].includes(state.tab)) {
      out.push(h('div', { class: 'as-banner' }, icon('info'), h('span', {}, t('banner.systemRestart', { version: systemNext() })), button(t('action.restartKernel'), restartKernel, { primary: true, key: 'system' })));
    }
    if (restartNeeded() && ['installed', 'updates', 'kernel'].includes(state.tab)) {
      out.push(h('div', { class: 'as-banner' }, icon('info'), h('span', {}, t('banner.restartNeeded')), button(t('action.restartKernel'), restartKernel, { primary: true })));
    }
    const failed = visibleRepos().filter(r => state.errors.has(r.id));
    if (failed.length) {
      out.push(h('div', { class: 'as-banner' }, icon('info'),
        h('span', {}, failed.length === 1 ? t('banner.repoUnreachable', { name: repoName(failed[0]) }) : t('banner.reposUnreachable', { n: failed.length })),
        h('button', { class: 'as-link', onclick: () => show('options') }, t('action.details'))));
    }
    const off = state.repos.filter(r => !isEnabled(r));
    if (off.length && state.tab !== 'installed') {
      out.push(h('div', { class: 'as-banner' }, icon('info'),
        h('span', {}, off.some(r => r.official) ? t('banner.officialDisabled') : t('banner.reposDisabled', { n: off.length })),
        h('button', { class: 'as-link', onclick: () => show('options') }, t('options.title'))));
    }
    return out;
  }

  function listView(items, tab) {
    const query = (state.query[tab.id] ?? '').trim().toLowerCase();
    const list = items.filter(tab.filter).filter(i => matches(i, query));
    footerText.textContent = state.loading ? t('list.reading') : `${t('list.items', { n: list.length })} · ${t('list.repos', { n: visibleRepos().length })}`;
    if (!list.length) {
      const empty = state.loading && tab.id !== 'installed' ? t('list.reading')
        : query ? t('list.noResults', { query, tab: tab.label })
          : tab.id === 'updates' ? t('list.upToDate') : tab.id === 'installed' ? t('list.nothingInstalled') : t('list.emptyCategory');
      return [...banners(), h('div', { class: 'as-empty' }, empty)];
    }
    if (tab.id === 'installed') {
      const appsHere = list.filter(i => i.kind === 'app'), modulesHere = list.filter(i => i.kind === 'module');
      const system = list.filter(i => i.kind === 'system');
      return [
        ...banners(),
        system.length ? [section('lilOS'), grid(system)] : null,
        appsHere.length ? [section(t('list.apps')), grid(appsHere, { uninstall: true })] : null,
        modulesHere.length ? [section(t('list.modules')), grid(modulesHere)] : null,
      ];
    }
    if (tab.id === 'updates') {
      return [
        ...banners(),
        section(t('list.updates', { n: list.length }),
          isAdmin && list.length > 1 ? h('span', { class: 'as-bulk' }, button(t('action.updateAll'), () => updateAll(list), { primary: true })) : null),
        grid(list),
      ];
    }
    // What can be installed first, then what already is
    const installed = i => Number(i.here || i.elsewhere);
    return [...banners(), grid([...list].sort((a, b) => installed(a) - installed(b) || a.name.localeCompare(b.name)))];
  }

  /** lilOS: versions, what changed, what is kept on disk. */
  function systemDetailView(item, tab) {
    const info = item.have;
    const installed = info.mode === 'installed';
    const next = systemNext();
    const actions = [];
    if (isAdmin && item.update) actions.push(button(t('action.updateTo', { version: item.update }), () => updateSystem(item), { primary: true, key: item.key }));
    const kept = isAdmin && installed ? (info.releases ?? []).filter(v => v !== info.version) : [];
    const keptRow = v => h('div', { class: 'as-row' },
      h('div', { class: 'as-row-text' }, h('b', {}, `lilOS ${v}`),
        h('span', {}, v === next ? t('system.next', { version: v }) : v === info.failed?.version ? t('system.keptFailed') : t('system.keptHint'))),
      v === next ? button(t('system.cancelNext'), () => useRelease(info.version), { key: v }) : button(t('system.use'), () => useRelease(v), { key: v }),
      v === next ? null : button(t('action.delete'), () => removeRelease(v), { danger: true, key: v }));
    footerText.textContent = `lilOS ${info.version}`;
    return h('div', { class: 'as-detail' },
      backButton(tab.label),
      h('div', { class: 'as-detail-head' },
        appIcon(item.icon),
        h('div', { class: 'as-detail-title' },
          h('h1', {}, 'lilOS'),
          h('div', { class: 'as-sub' }, t('detail.kindSystem')),
          h('div', { class: 'as-meta' }, repoLabel(item), h('span', { class: 'as-state' }, icon('shield'), t('detail.verified')), h('span', { class: 'as-state' }, t('detail.required'))),
          actions.length ? h('div', { class: 'as-detail-actions' }, ...actions) : null)),
      next ? h('div', { class: 'as-banner' }, icon('info'), h('span', {}, t('banner.systemRestart', { version: next })), button(t('action.restartKernel'), restartKernel, { primary: true, key: 'system' })) : null,
      isAdmin && info.failed ? h('div', { class: 'as-banner' }, icon('warning'), h('span', {}, t('system.failed', { version: info.failed.version, reason: info.failed.reason, current: info.version }))) : null,
      installed ? null : h('div', { class: 'as-banner' }, icon('info'), h('span', {}, t('system.development'))),
      h('div', { class: 'as-facts' },
        fact(t('system.inUse'), info.version),
        fact(t('detail.version'), item.offered ?? '—'),
        fact(t('detail.repository'), item.repo ? repoName(item.repo) : '—'),
        fact(t('detail.state'), next ? t('system.next', { version: next }) : installed ? t('system.installedMode') : t('system.developmentMode'))),
      kept.length ? [section(t('system.kept')), h('div', { class: 'as-group' }, ...kept.map(keptRow))] : null,
      h('div', { class: 'as-perm' }, h('h3', {}, icon('info'), t('detail.warning')), h('p', {}, t('system.warning'))),
      item.changelog ? [h('div', { class: 'as-readme-title' }, icon('file'), 'CHANGELOG.md'), h('article', { class: 'as-readme' }, ...renderMarkdown(item.changelog))] : null,
      item.changelog && item.changelogTruncated ? h('p', { class: 'as-readme-cut' }, t('readme.truncated'), ' ',
        h('button', { class: 'as-link', onclick: e => downloadChangelog(item, e.currentTarget) }, icon('download'), t('readme.download'))) : null,
      h('div', { class: 'as-readme-title' }, icon('file'), 'README.md'),
      item.readme ? h('article', { class: 'as-readme' }, ...renderMarkdown(item.readme)) : h('p', { class: 'as-muted' }, item.repo ? t('readme.none') : t('readme.notFromRepo')),
      item.readme && item.readmeTruncated ? h('p', { class: 'as-readme-cut' }, t('readme.truncated'), ' ',
        h('button', { class: 'as-link', onclick: e => downloadReadme(item, e.currentTarget) }, icon('download'), t('readme.download'))) : null);
  }

  function detailView(item, tab) {
    if (item.kind === 'system') return systemDetailView(item, tab);
    const isModule = item.kind === 'module';
    const actions = [];
    if (item.here && !isModule) actions.push(button(t('action.open'), () => launch(item.id), { primary: !item.update || !isAdmin }));
    if (isAdmin) {
      if (item.replacedBy) actions.push(button(t('action.installName', { name: item.replacedBy.name }), () => install(item.replacedBy), { primary: true, key: item.key }));
      else if (item.update) actions.push(button(t('action.updateTo', { version: item.update }), () => update(item), { primary: true, key: item.key }));
      if (item.here && (!isModule || item.have.enabled)) {
        if (!pending(item) && item.have.source) actions.push(button(t('action.checkUpdates'), () => update(item), { key: item.key }));
        if (!isModule) actions.push(button(t('action.reinstall'), () => reinstall(item), { key: item.key }));
        if (!item.required) actions.push(button(isModule ? t('action.remove') : t('action.uninstall'), () => remove(item), { danger: true, key: item.key }));
      }
      if (!item.here && !item.elsewhere && item.entry) actions.push(button(item.repo.official ? t('action.install') : t('action.installAnyway'), () => install(item), { primary: true, danger: !item.repo.official, key: item.key }));
    }
    const moduleState = isModule && item.have
      ? (item.replacedBy ? t('status.replacedBy', { name: item.replacedBy.name }) : !item.have.enabled ? t('moduleState.removed') : item.have.running !== item.have.enabled ? (item.have.running ? t('moduleState.oldUntilRestart', { version: item.have.running }) : t('moduleState.nextStart')) : t('moduleState.inUse'))
      : null;
    const permissions = needsGrant(item.manifest?.permissions);
    const dependencies = (isModule ? item.module?.dependencies : item.shown?.dependencies ?? item.manifest?.dependencies) ?? [];
    const unmet = item.here && !isModule ? apps.get(item.id)?.unmet ?? [] : [];
    footerText.textContent = `${item.name} ${item.offered ?? item.installed}`;
    return h('div', { class: 'as-detail' },
      backButton(tab.label),
      h('div', { class: 'as-detail-head' },
        appIcon(item.icon),
        h('div', { class: 'as-detail-title' },
          h('h1', {}, item.name),
          h('div', { class: 'as-sub' }, [item.publisher, isModule ? t('detail.kindModule') : t('detail.kindApp'), categories().find(c => c.id === item.category)?.label].filter(Boolean).join(' · ')),
          h('div', { class: 'as-meta' },
            repoLabel(item),
            item.verified ? h('span', { class: 'as-state' }, icon('shield'), t('detail.verified')) : item.repo ? h('span', { class: 'as-unofficial' }, t('detail.unverified')) : null,
            item.required ? h('span', { class: 'as-state' }, t('detail.required')) : null,
            item.elsewhere ? h('span', { class: 'as-state' }, isModule ? t('status.installedElsewhereModule') : t('status.installedElsewhereApp')) : null),
          actions.length ? h('div', { class: 'as-detail-actions' }, ...actions) : null)),
      item.repo && !item.repo.official && !item.here ? h('div', { class: 'as-banner' }, icon('info'), h('span', {}, t('detail.unofficialWarning'))) : null,
      unmet.length ? h('div', { class: 'as-banner' }, icon('warning'),
        h('span', {}, unmet.every(u => u.why === 'restart') ? t('deps.unmetRestart', { name: item.name, list: unmet.map(u => u.id).join(', ') }) : t('deps.unmetMissing', { name: item.name, list: unmet.map(u => u.id).join(', ') })),
        isAdmin && unmet.some(u => u.why === 'restart') ? button(t('action.restartKernel'), restartKernel, { primary: true, key: 'unmet' }) : null) : null,
      h('div', { class: 'as-facts' },
        fact(t('detail.version'), item.offered ?? item.installed),
        fact(installedWord(item), item.installed ?? '—'),
        fact(t('detail.repository'), item.repo ? repoName(item.repo) : '—'),
        isModule ? fact(t('detail.provides'), item.provides.join(', ') || '—') : fact(t('detail.id'), item.id),
        moduleState ? fact(t('detail.state'), moduleState) : null),
      isModule
        ? h('div', { class: 'as-perm' }, h('h3', {}, icon('info'), t('detail.warning')), h('p', {}, t('detail.moduleWarning')))
        : h('div', { class: 'as-perm' }, h('h3', {}, icon('shield'), t('detail.mayDo')),
          permissions.length ? h('ul', {}, ...permissions.map(p => h('li', {}, icon('check'), describePermission(p)))) : h('p', { class: 'as-muted' }, t('permissions.none'))),
      dependencies.length ? dependencyList(dependencies) : null,
      h('div', { class: 'as-readme-title' }, icon('file'), 'README.md'),
      item.readme ? h('article', { class: 'as-readme' }, ...renderMarkdown(item.readme)) : null,
      item.readme && item.readmeTruncated ? h('p', { class: 'as-readme-cut' }, t('readme.truncated'), ' ',
        h('button', { class: 'as-link', onclick: e => downloadReadme(item, e.currentTarget) }, icon('download'), t('readme.download'))) : null,
      item.readme ? null
        : h('p', { class: 'as-muted' }, item.repo ? t('readme.none') : t('readme.notFromRepo')));
  }

  /** «Needs»: the dependencies of a package, and whether they are there (modules: for admins). */
  function dependencyList(dependencies) {
    const status = d => {
      if (d.app !== undefined) {
        const app = apps.get(d.app);
        return app ? { ok: true, text: t('deps.stateInstalled', { version: app.version }) } : { ok: false, text: t('deps.stateMissing') };
      }
      if (!isAdmin) return null;
      const m = state.modules.find(x => x.name === d.module && x.enabled);
      return !m ? { ok: false, text: t('deps.stateMissing') }
        : { ok: true, text: m.running === m.enabled ? t('deps.stateInstalled', { version: m.enabled }) : t('deps.stateRestart') };
    };
    return h('div', { class: 'as-perm' }, h('h3', {}, icon('link'), t('deps.title')),
      h('ul', {}, ...dependencies.map(d => {
        const now = status(d);
        return h('li', {}, icon(now && !now.ok ? 'info' : 'check'),
          h('span', {}, h('b', {}, d.app !== undefined ? installedAppName(d.app) : d.module),
            d.version ? ` ${d.version}` : '', ` · ${kindWord(d.module !== undefined ? 'module' : 'app')}`,
            d.optional ? ` · ${t('deps.optionalTag')}` : '',
            d.reason ? h('span', { class: 'as-muted' }, ` — ${d.reason}`) : null,
            now ? h('span', { class: 'as-muted' }, ` (${now.text})`) : null));
      })));
  }

  /** «Controlla gli aggiornamenti»: the AppStore's operation in the scheduler (with lilOS ≥ 1.19.0). */
  function updatesTaskRow() {
    const task = state.updateTask;
    const every = updateEvery(task) ?? 'daily';
    const control = toggle({ value: !!task?.enabled, label: t('updates.check'), onChange: on => changeUpdateTask({ on }) });
    const options = [{ value: 'daily', label: t('updates.daily') }, { value: 'weekly', label: t('updates.weekly') }, ...(every === 'other' ? [{ value: 'other', label: t('updates.other') }] : [])];
    const select = h('select', { class: 'ctl-select', 'aria-label': t('updates.when') }, options.map(o => h('option', { value: o.value, selected: o.value === every }, o.label)));
    select.disabled = !task?.enabled;
    select.addEventListener('change', () => { if (select.value !== 'other') changeUpdateTask({ every: select.value }); });
    const edit = h('button', { class: 'as-link', type: 'button', style: 'background:none;border:0;padding:0;cursor:pointer;width:max-content', onclick: () => launch('scheduler', { task: task?.id }, 'main') }, t('updates.inScheduler'));
    return h('div', { class: 'as-row' },
      h('div', { class: 'as-row-text' }, h('b', {}, t('updates.check')), h('span', {}, t('updates.taskHint')), task ? edit : null),
      select, control);
  }

  /** "Check for updates at startup": the AppStore's service, started when the user comes in. */
  function updatesRow() {
    if (planner && state.updates) return updatesTaskRow();
    const svc = state.updates;
    const locked = !svc || (svc.system && !svc.canControl);
    const text = !svc ? t('updates.needsEngine')
      : svc.system ? t('updates.bySystem')
        : t('updates.description');
    const control = toggle({ value: !!svc && svc.startup !== 'none', label: t('updates.atStart'), onChange: setUpdatesAtStart });
    control.disabled = locked;
    return h('div', { class: 'as-row' }, h('div', { class: 'as-row-text' }, h('b', {}, t('updates.atStart')), h('span', {}, text)), control);
  }

  function optionsView(tab) {
    const draft = state.newRepo;
    footerText.textContent = t('options.title');
    const repoRow = repo => {
      const on = isEnabled(repo);
      const catalog = state.catalogs.get(repo.id);
      const valid = list => (list ?? []).filter(e => !e.error).length;
      const invalid = [...catalog?.apps ?? [], ...catalog?.modules ?? []].filter(e => e.error);
      const what = !on ? t('options.disabled')
        : state.errors.has(repo.id) ? t('options.unreachable', { error: state.errors.get(repo.id) })
          : catalog ? [t('options.apps', { n: valid(catalog.apps) }), t('options.modules', { n: valid(catalog.modules) }),
            invalid.length ? t('options.invalid', { n: invalid.length }) : null].filter(Boolean).join(' · ')
            : t('options.reading');
      return h('div', { class: on ? 'as-row' : 'as-row as-row-off' },
        appIcon(repo.official ? { glyph: 'shield', color: '#30a46c' } : { glyph: 'link', color: '#8a909b' }),
        h('div', { class: 'as-row-text' },
          h('b', {}, repoName(repo), h('span', { class: 'as-muted' }, ` · ${repo.name}`)),
          h('span', {}, repo.url),
          h('span', { class: on && state.errors.has(repo.id) ? 'as-error' : null, title: (on && invalid.map(e => `${e.path}: ${e.error}`).join('\n')) || null }, what)),
        repo.official ? h('span', { class: 'as-muted' }, t('options.alwaysThere')) : isAdmin ? button(t('action.remove'), () => act('repo', () => repositories.remove(repo.id), t('done.repoRemoved', { name: repoName(repo) })), { danger: true, key: repo.id }) : null,
        Object.assign(toggle({ value: on, label: t('options.active', { name: repoName(repo) }), onChange: v => setEnabled(repo, v) }), { id: `as-repo-${repo.id}` }));
    };
    return h('div', { class: 'as-options' },
      backButton(tab.label),
      h('h2', {}, t('options.title')),
      h('p', { class: 'as-lead' }, t('options.lead')),
      section('AppStore'),
      h('div', { class: 'as-group' },
        h('div', { class: 'as-row' },
          h('div', { class: 'as-row-text' }, h('b', {}, t('options.showUnofficial')), h('span', {}, t('options.showUnofficialHint'))),
          toggle({ value: settings.get('appstore.showUnofficial'), label: t('options.showUnofficial'), onChange: v => settings.set('appstore.showUnofficial', v) })),
        updatesRow()),
      section(t('options.repositories'), h('span', { class: 'as-bulk' }, button(t('action.reload'), () => load()))),
      h('div', { class: 'as-group' }, ...state.repos.map(repoRow)),
      section(t('options.addRepo')),
      isAdmin
        ? h('div', { class: 'as-group' },
          h('div', { class: 'as-row' }, h('div', { class: 'as-row-text' }, h('b', {}, t('options.address')), h('span', {}, t('options.addressHint'))),
            textField({ value: draft.url, placeholder: 'https://…', label: t('options.addressLabel'), onInput: v => { draft.url = v; } })),
          h('div', { class: 'as-row' }, h('div', { class: 'as-row-text' }, h('b', {}, t('options.name')), h('span', {}, t('options.nameHint'))),
            textField({ value: draft.name, placeholder: t('options.name'), label: t('options.nameLabel'), onInput: v => { draft.name = v; } })),
          h('div', { class: 'as-row as-row-end' }, button(t('action.add'), () => act('repo', async () => {
            const repo = await repositories.add(draft.url.trim(), draft.name.trim() || undefined);
            state.newRepo = { url: '', name: '' };
            return repo;
          }, r => t('done.repoAdded', { name: repoName(r) })), { primary: true })))
        : h('p', { class: 'as-muted' }, t('options.adminOnly')));
  }

  // ---------- Window ----------

  const search = h('input', { type: 'search', autocomplete: 'off', spellcheck: 'false', 'aria-label': t('search.label') });
  const tabBar = h('div', { class: 'as-tabs', role: 'tablist' });
  const main = h('main', { class: 'as-main' });
  const footerText = h('span', { class: 'as-foot-text' });
  win.body.append(
    h('div', { class: 'as-head' }, h('label', { class: 'as-search' }, icon('search'), search), tabBar),
    main,
    h('footer', { class: 'as-foot' }, footerText, h('span', { class: 'as-spacer' }),
      h('button', { class: 'as-link', onclick: () => show('options') }, icon('gear'), t('options.title'))));

  function show(view, key = null) {
    state.view = view;
    state.key = key;
    render();
    main.scrollTop = 0;
  }

  function selectTab(id) {
    state.tab = id;
    show('list');
  }

  search.addEventListener('input', () => {
    state.query[state.tab] = search.value;
    state.view = 'list';
    render();
  });
  search.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !search.value) return;
    e.stopPropagation();
    search.value = '';
    search.dispatchEvent(new Event('input'));
  });
  tabBar.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const all = [...tabBar.querySelectorAll('[role=tab]')];
    const next = all[(all.indexOf(document.activeElement) + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    next.click();
    tabBar.querySelector('[tabindex="0"]')?.focus();
  });

  function render() {
    const items = allItems();
    const list = tabs(items);
    if (!list.some(tb => tb.id === state.tab)) state.tab = 'installed';
    const tab = list.find(tb => tb.id === state.tab);
    const updates = items.filter(pending).length;
    tabBar.replaceChildren(...list.flatMap((tb, n) => [
      tb.category && !list[n - 1].category ? h('span', { class: 'as-tab-sep' }) : null,
      h('button', { class: 'as-tab', role: 'tab', 'aria-selected': String(state.view === 'list' && tb.id === state.tab), tabindex: tb.id === state.tab ? '0' : '-1', onclick: () => selectTab(tb.id) },
        tb.label, tb.badge && updates ? h('span', { class: 'as-count' }, String(updates)) : null),
    ].filter(Boolean)));
    search.placeholder = t('search.placeholder', { tab: tab.label });
    if (search.value !== (state.query[state.tab] ?? '')) search.value = state.query[state.tab] ?? '';
    const item = state.view === 'detail' ? items.find(i => i.key === state.key) : null;
    if (state.view === 'detail' && !item) state.view = 'list';
    const view = state.view === 'options' ? optionsView(tab) : item ? detailView(item, tab) : listView(items, tab);
    main.replaceChildren(...[view].flat(3).filter(Boolean));
  }

  win.on('launch', args => {
    const tab = { apps: 'installed', modules: 'kernel' }[args?.tab] ?? args?.tab;
    if (tab === 'repos' || tab === 'options') show('options');
    else if (typeof tab === 'string') selectTab(tab);
  });
  const offApps = apps.on('change', () => render());
  const offSetting = settings.on('change:appstore.showUnofficial', () => render());
  const offServices = system.services?.on('change', e => { if (e.app === 'appstore') loadUpdatesService().then(render); });
  win.on('destroy', () => { offApps(); offSetting(); offServices?.(); });
  render();
  load();
  return win;
}
