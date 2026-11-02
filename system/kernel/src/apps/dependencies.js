import { fail } from '../errors.js';
import { KERNEL } from '../services.js';
import { logger } from '../log.js';
import { SYSTEM_VERSION } from '../config.js';
import { dependencyKey, inRange } from './manifest.js';
import { checkModule } from './modulePackage.js';
import { needsGrant } from './permissions.js';
import { cleanSource, fetchPackage, isOfficial, openSource } from './sources.js';

/**
 * Dependencies between packages: an app needs kernel modules and other apps, a module needs
 * modules (manifest.js checkDependencies: { module | app, version?, repo?, optional?, reason? }).
 *
 * Installing (or updating) a package is planned first: what it needs that is missing, or installed
 * at a version outside the range it asks for, is found in the repository the dependency names (the
 * official one when it names none), and so on for what those need. The admin sees the plan (what
 * gets installed or updated, from where, verified or not, the permissions of the apps, which ones
 * are optional) and says yes; then the packages go in, each after what it needs, the one asked for
 * last. If one fails, those installed by this run are removed again.
 *
 *   Plan: { root: step, steps: [step] (each after what it needs), problems: [problem], restartRequired }
 *   Step: { key: 'module:arduino' | 'app:acme.notes', kind, id, name, version, action: 'install' | 'update' | 'reinstall',
 *           from: installed version | null, optional, choice, needs: [keys], neededBy: [{ key, name, optional, reason }],
 *           repo: { url, official }, verified, permissions: [what needs consent], description, icon,
 *           manifest + locales (apps) }
 *       optional: only optional packages need it; choice: the admin may tick it (an optional
 *       package needs it); the others come with the ones that need them
 *   Problem: { key, kind, id, optional, message }   a dependency that cannot be had (not in its
 *       repository, no version in its range, repository unreachable): a required one stops the install
 *
 * The packages installed only because something needed them are marked (app state and module
 * source.json `dependency: true`): removing what needed them offers to remove them too, when nothing
 * else needs them. A package another installed one needs (not optionally) is not removed, and is
 * not updated outside the versions it asks for. These checks are the installer's and ModuleAdmin's
 * `guard`, so that no path around the plan skips them.
 *
 * Merged modules (module.json `replaces`, modulePackage.js takeOver): a dependency on a module that
 * another one replaces (an app that still asks for term-ssh, now part of ssh) is a dependency on
 * the one that replaces it: met by it when it is turned on (whatever its version: the range was
 * about the old module), planned as it when it is missing (a replaced module is never installed),
 * and the module that replaces it is what removals and guards count.
 */
const log = logger('packages');

const requireAdmin = p => (p?.kind === 'kernel' || p?.role === 'admin' ? p : fail('forbidden', 'Solo un amministratore installa o rimuove pacchetti'));
const kindOf = d => (d.module !== undefined ? 'module' : 'app');
const idOf = d => d.module ?? d.app;
const label = (kind, id) => (kind === 'module' ? `il modulo ${id}` : `l’app ${id}`);

/** The key a dependency counts as: the module turned on that replaces it (installed.aliases), or its own. */
const canon = (installed, key) => installed.aliases?.get(key) ?? key;
/** What is installed for a dependency key: { have, alias } (alias: met by the module that replaces it). */
const found = (installed, key) => {
  const to = canon(installed, key);
  return { have: installed.get(to), alias: to !== key };
};

export class Dependencies {
  #kernel;
  /** Installs and removals run one at a time: two at once would both find a package missing (and one's rollback would undo the other's work) */
  #queue = Promise.resolve();

  #serial(fn) {
    const run = this.#queue.then(fn, fn);
    this.#queue = run.catch(() => {});
    return run;
  }

  constructor(kernel) {
    this.#kernel = kernel;
  }

  get #allowLocal() { return this.#kernel.config.allowLocalSources; }

  /**
   * What is installed: apps (installer state + manifest) and the modules turned on, by key. Its
   * `aliases`: key of a module replaced by one turned on → the key of that one.
   */
  async #installed() {
    const out = new Map();
    out.aliases = new Map();
    for (const a of await this.#kernel.installer.list()) {
      out.set(`app:${a.id}`, {
        kind: 'app', id: a.id, name: a.manifest.name, version: a.version, deps: a.manifest.dependencies ?? [],
        dependency: a.dependency === true, required: a.required === true, state: a,
      });
    }
    for (const m of await this.#kernel.moduleAdmin.list()) {
      if (!m.enabled) continue;
      out.set(`module:${m.name}`, {
        kind: 'module', id: m.name, name: m.name, version: m.enabled, deps: m.dependencies ?? [],
        dependency: m.dependency === true, required: m.required === true, source: m.source,
      });
      for (const old of m.replaces ?? []) out.aliases.set(`module:${old}`, `module:${m.name}`);
    }
    for (const key of out.keys()) out.aliases.delete(key);   // turned on itself (until the restart takes it away): it counts as itself
    return out;
  }

  async #officialUrl() {
    return (await this.#kernel.repos.list()).find(r => r.official).url;
  }

  // ---------- Steps ----------

  #appStep(manifest, source, locales, { action, from = null, granted = [] }) {
    if (manifest.lilos && !inRange(manifest.lilos, SYSTEM_VERSION)) fail('conflict', `${manifest.name} ${manifest.version} richiede lilOS ${manifest.lilos} (questo è il ${SYSTEM_VERSION})`);
    return {
      key: `app:${manifest.id}`, kind: 'app', id: manifest.id, name: manifest.name, version: manifest.version, action, from,
      repo: { url: source.url ?? null, official: isOfficial(source) }, verified: this.#kernel.installer.verified(manifest, source),
      permissions: needsGrant(manifest.permissions ?? []).filter(p => !granted.includes(p)),
      description: manifest.description ?? '', icon: manifest.icon ?? null, manifest, locales: locales ?? null,
      source, deps: manifest.dependencies ?? [],
    };
  }

  #moduleStep(module, source, { action, from = null }) {
    return {
      key: `module:${module.name}`, kind: 'module', id: module.name, name: module.name, version: module.version, action, from,
      repo: { url: source.url ?? null, official: isOfficial(source) }, verified: isOfficial(source), permissions: [],
      description: module.description ?? '', icon: module.icon ?? null, source, deps: module.dependencies ?? [],
    };
  }

  async #openModule(source) {
    const opened = await openSource(source);
    let raw;
    try {
      raw = JSON.parse((await opened.read('module.json')).toString('utf8'));
    } catch (err) {
      if (err.code) throw err;
      fail('invalid', 'module.json non è JSON valido');
    }
    return { module: checkModule(raw), source: opened.source };
  }

  /** Where a module installed from a repository updates from (its source.json, at the newest version or `ref`). */
  #moduleUpdateSource(have, ref) {
    if (!have.source) fail('conflict', `${have.id} è stato messo a mano: si aggiorna a mano`);
    const { commit, installed, dependency, ref: old, ...rest } = have.source;
    return cleanSource({ ...rest, ...(ref && { ref }) }, { allowLocal: this.#allowLocal });
  }

  /** The package asked for. */
  async #root(target, installed) {
    if (target.install) {
      const { kind, source: raw } = target.install;
      const source = cleanSource(raw, { allowLocal: this.#allowLocal });
      if (kind === 'app') {
        const pkg = await fetchPackage(source);
        if (installed.has(`app:${pkg.manifest.id}`)) fail('conflict', `${pkg.manifest.name} è già installata: per una nuova versione usa l'aggiornamento`);
        return this.#appStep(pkg.manifest, pkg.source, null, { action: 'install' });
      }
      const { module, source: resolved } = await this.#openModule(source);
      if (installed.has(`module:${module.name}`)) fail('conflict', `${module.name} è già installato: per una nuova versione usa l'aggiornamento`);
      if (installed.aliases.has(`module:${module.name}`)) fail('conflict', `${module.name} è stato sostituito da ${installed.aliases.get(`module:${module.name}`).slice(7)}: non si installa più`);
      return this.#moduleStep(module, resolved, { action: 'install' });
    }
    const { kind, id, ref, reinstall = false } = target.update;
    const have = installed.get(`${kind}:${id}`) ?? fail('not_found', kind === 'app' ? 'App non installata' : 'Modulo non attivo');
    if (kind === 'app') {
      const pkg = await fetchPackage(this.#kernel.installer.updateSource(have.state, { ref, reinstall }));
      if (pkg.manifest.id !== id) fail('invalid', `Il pacchetto è dell'app ${pkg.manifest.id}, non di ${id}`);
      return this.#appStep(pkg.manifest, pkg.source, null, { action: reinstall ? 'reinstall' : 'update', from: have.version, granted: have.state.granted });
    }
    const { module, source } = await this.#openModule(this.#moduleUpdateSource(have, ref));
    if (module.name !== id) fail('invalid', `Il pacchetto è del modulo ${module.name}, non di ${id}`);
    return this.#moduleStep(module, source, { action: 'update', from: have.version });
  }

  /** What satisfies one dependency: null when what is installed does, else the step that gets it. */
  async #resolve(dep, installed, catalogs) {
    const kind = kindOf(dep), id = idOf(dep);
    const { have, alias } = found(installed, `${kind}:${id}`);
    if (have) {
      if (alias || !dep.version || inRange(dep.version, have.version)) return null;
      const newer = kind === 'app'
        ? await fetchPackage(this.#kernel.installer.updateSource(have.state)).then(pkg => this.#appStep(pkg.manifest, pkg.source, null, { action: 'update', from: have.version, granted: have.state.granted }))
        : await this.#openModule(this.#moduleUpdateSource(have)).then(m => this.#moduleStep(m.module, m.source, { action: 'update', from: have.version }));
      if (!inRange(dep.version, newer.version)) fail('conflict', `Serve ${label(kind, id)} ${dep.version}: è installata la ${have.version} e la più nuova è la ${newer.version}`);
      return newer;
    }
    const url = dep.repo ?? await this.#officialUrl();
    if (!catalogs.has(url)) catalogs.set(url, this.#kernel.repos.packages(url));
    const repo = await catalogs.get(url).catch(err => fail('unavailable', `Il repository ${url} non si legge: ${err.message}`));
    // A module the repository has merged into another one comes as that one (never the old one, even if still listed)
    const merged = kind === 'module' ? repo.modules.find(m => m.module.name !== id && (m.module.replaces ?? []).includes(id)) : null;
    const entry = merged ?? (kind === 'app' ? repo.apps.find(a => a.manifest.id === id) : repo.modules.find(m => m.module.name === id));
    if (!entry) fail('not_found', `Nel repository ${url} non c'è ${label(kind, id)}`);
    if (merged && installed.has(`module:${merged.module.name}`)) return null;   // turned on already (an older version that did not replace it yet)
    const version = kind === 'app' ? entry.manifest.version : entry.module.version;
    if (!merged && dep.version && !inRange(dep.version, version)) fail('conflict', `Serve ${label(kind, id)} ${dep.version}: il repository ha la ${version}`);
    const source = { type: 'git', url, ref: repo.ref, path: entry.path };
    return kind === 'app'
      ? this.#appStep(entry.manifest, source, entry.locales, { action: 'install' })
      : this.#moduleStep(entry.module, source, { action: 'install' });
  }

  /**
   * target: { install: { kind: 'app' | 'module', source } } | { update: { kind, id, ref?, reinstall? } }
   * Returns the plan (see above), plus `edges` (key → [{ to, optional }]) for apply().
   */
  async #plan(target) {
    const installed = await this.#installed();
    const root = await this.#root(target, installed);
    // An update offers only the optional dependencies the installed version did not have: the others the admin already chose about
    const decided = new Set(target.update ? (installed.get(root.key)?.deps ?? []).filter(d => d.optional).map(dependencyKey) : []);
    const steps = new Map(), problems = new Map(), edges = new Map(), catalogs = new Map();
    const planAliases = new Map();   // key of a replaced module → the step of the module that replaces it
    const queue = [root];
    while (queue.length) {
      const node = queue.shift();
      const out = [];
      for (const dep of node.deps) {
        if (node === root && dep.optional && decided.has(dependencyKey(dep))) continue;
        // A replaced module counts as the one that replaces it (installed, or planned for an earlier dependency)
        let key = canon(installed, dependencyKey(dep));
        const alias = key !== dependencyKey(dep) || planAliases.has(key);
        key = planAliases.get(key) ?? key;
        if (node === root && dep.optional && decided.has(key)) continue;
        if (problems.has(key)) {
          out.push({ to: key, optional: dep.optional === true, reason: dep.reason ?? null });
          continue;
        }
        const planned = key === root.key ? root : steps.get(key);
        if (planned) {
          out.push({ to: key, optional: dep.optional === true, reason: dep.reason ?? null });
          if (!alias && dep.version && !inRange(dep.version, planned.version)) {
            problems.set(key, { key, kind: kindOf(dep), id: idOf(dep), message: `${node.name} ha bisogno di ${label(kindOf(dep), idOf(dep))} ${dep.version}, ma si installa la ${planned.version}` });
          }
          continue;
        }
        try {
          const step = await this.#resolve(dep, installed, catalogs);
          if (step && step.key !== key) planAliases.set(key, step.key);   // planned as the module that replaces it
          if (step && !steps.has(step.key) && step.key !== root.key) {
            steps.set(step.key, step);
            queue.push(step);
          }
          out.push({ to: step?.key ?? key, optional: dep.optional === true, reason: dep.reason ?? null });
        } catch (err) {
          if (!err.code) throw err;
          problems.set(key, { key, kind: kindOf(dep), id: idOf(dep), message: err.message });
          out.push({ to: key, optional: dep.optional === true, reason: dep.reason ?? null });
        }
      }
      edges.set(node.key, out);
    }

    // Required: what the package asked for needs, not through an optional dependency
    const required = new Set();
    const walk = key => {
      for (const e of edges.get(key) ?? []) {
        if (e.optional || required.has(e.to)) continue;
        required.add(e.to);
        walk(e.to);
      }
    };
    walk(root.key);
    // Each step after what it requires (an optional one has no order: the guards ignore it). A circle
    // of required ones (A needs B, B needs A, or back to the package asked for) has no order: it cannot go in
    const ordered = [], state = new Map();
    const name = k => (k === root.key ? root.name : steps.get(k)?.name ?? k);
    const visit = (key, from) => {
      if (state.get(key) === 'visiting') {
        if (!problems.has(key)) problems.set(key, { key, kind: key.slice(0, key.indexOf(':')), id: key.slice(key.indexOf(':') + 1), message: `Dipendenza circolare tra ${name(from)} e ${name(key)}: nessuno dei due si installa prima dell’altro` });
        return;
      }
      if (state.has(key)) return;
      state.set(key, 'visiting');
      const out = edges.get(key) ?? [];
      for (const e of out) if (!e.optional && (steps.has(e.to) || e.to === root.key)) visit(e.to, key);
      state.set(key, 'done');
      if (steps.has(key)) ordered.push(steps.get(key));
      for (const e of out) if (e.optional && steps.has(e.to) && !state.has(e.to)) visit(e.to, key);
    };
    visit(root.key, null);

    const view = ({ deps, source, ...step }) => ({
      ...step,
      needs: (edges.get(step.key) ?? []).filter(e => !e.optional).map(e => e.to),
    });
    const all = [root, ...steps.values()];
    return {
      edges,
      root: view(root),
      steps: ordered.map(step => ({
        ...view(step), source: step.source,
        optional: !required.has(step.key),
        choice: !required.has(step.key) && all.some(n => (edges.get(n.key) ?? []).some(e => e.to === step.key && e.optional)),
        neededBy: all.flatMap(n => (edges.get(n.key) ?? []).filter(e => e.to === step.key).map(e => ({ key: n.key, name: n.name, optional: e.optional, reason: e.reason }))),
      })),
      problems: [...problems.values()].map(p => ({ ...p, optional: !required.has(p.key) })),
      restartRequired: root.kind === 'module' || ordered.some(s => s.kind === 'module'),
      rootSource: root.source,
    };
  }

  async plan(principal, target) {
    requireAdmin(principal);
    const { edges, rootSource, steps, ...plan } = await this.#plan(target);
    return { ...plan, steps: steps.map(({ source, ...s }) => s) };
  }

  /**
   * Installs (or updates) the package with what it needs. answers:
   *   { root: { grant, allowUnsigned }, steps: { [key]: { grant, allowUnsigned } } }
   * Every required step must be in `steps` (the admin saw it); an optional one goes in when it is
   * there. The plan is made again: if it changed since the admin saw it, nothing is done.
   * Returns { result (of the package asked for), installed: [{ key, kind, id, version, action }], restartRequired }.
   */
  apply(principal, target, answers = {}) {
    requireAdmin(principal);
    return this.#serial(() => this.#apply(principal, target, answers));
  }

  async #apply(principal, target, { root: rootAnswer = {}, steps: answers = {} } = {}) {
    const plan = await this.#plan(target);
    const byKey = new Map(plan.steps.map(s => [s.key, s]));
    const chosen = new Set();
    const add = key => {
      if (chosen.has(key) || !byKey.has(key)) return;
      chosen.add(key);
      for (const e of plan.edges.get(key) ?? []) if (!e.optional) add(e.to);
    };
    for (const s of plan.steps) if (!s.optional) add(s.key);
    for (const key of Object.keys(answers)) if (byKey.get(key)?.optional) add(key);
    // What goes in may need nothing that cannot be had
    const problems = new Map(plan.problems.map(p => [p.key, p]));
    for (const key of [plan.root.key, ...chosen]) {
      for (const e of plan.edges.get(key) ?? []) if (!e.optional && problems.has(e.to)) fail('conflict', problems.get(e.to).message);
    }
    // Each one the admin saw and said yes to (an optional choice brings what it needs: those too)
    const unanswered = [...chosen].filter(key => !answers[key]);
    if (unanswered.length) fail('conflict', `Manca il consenso per ${unanswered.join(', ')}: guarda di nuovo cosa si installa`, { details: { unanswered } });

    const { installer, moduleAdmin } = this.#kernel;
    const done = [];
    const answer = key => ({ grant: strings(answers[key]?.grant), allowUnsigned: answers[key]?.allowUnsigned === true });
    let result;
    try {
      for (const step of plan.steps.filter(s => chosen.has(s.key))) {
        const { grant, allowUnsigned } = answer(step.key);
        if (step.kind === 'module') {
          if (step.action === 'install') await moduleAdmin.install(principal, { source: step.source, allowUnsigned, dependency: true });
          else await moduleAdmin.update(principal, step.id, { allowUnsigned });
        } else if (step.action === 'install') {
          await installer.install(principal, { source: step.source, grant, allowUnsigned, dependency: true });
        } else {
          await installer.update(principal, step.id, { grant, allowUnsigned });
        }
        done.push(step);
        log.info(`${step.action === 'install' ? 'Installato' : 'Aggiornato'} ${step.key} ${step.version}, serve a ${plan.root.key}`);
      }
      const { grant, allowUnsigned } = { grant: strings(rootAnswer.grant), allowUnsigned: rootAnswer.allowUnsigned === true };
      const { root } = plan;
      if (root.kind === 'module') {
        result = root.action === 'install'
          ? await moduleAdmin.install(principal, { source: plan.rootSource, allowUnsigned })
          : await moduleAdmin.update(principal, root.id, { ref: target.update?.ref, allowUnsigned });
      } else {
        result = root.action === 'install'
          ? await installer.install(principal, { source: plan.rootSource, grant, allowUnsigned })
          : await installer.update(principal, root.id, { ref: target.update?.ref, reinstall: root.action === 'reinstall', grant, allowUnsigned });
      }
    } catch (err) {
      // What this run installed goes away again (the last one first); updates stay
      for (const step of done.filter(s => s.action === 'install').reverse()) {
        try {
          if (step.kind === 'module') await moduleAdmin.remove(KERNEL, step.id);
          else await installer.uninstall(KERNEL, step.id);
        } catch (undo) {
          log.error(`${step.key} non rimosso dopo l’installazione fallita`, undo);
        }
      }
      throw err;
    }
    return {
      result,
      installed: done.map(s => ({ key: s.key, kind: s.kind, id: s.id, version: s.version, action: s.action })),
      restartRequired: plan.restartRequired,
    };
  }

  /**
   * The kernel installing a system app by itself (first start): with the required dependencies
   * from the official repository, never one that would need a warning accepted.
   */
  async installAuto(target) {
    const plan = await this.#plan(target);
    const steps = {};
    for (const s of plan.steps) if (!s.optional) steps[s.key] = { grant: s.permissions, allowUnsigned: false };
    return this.apply(KERNEL, target, { root: { grant: plan.root.permissions }, steps });
  }

  // ---------- Guards (installer and ModuleAdmin) ----------

  /** Refuses a package whose required dependencies are not installed at a version in their range. */
  async checkMet(kind, manifest) {
    const installed = await this.#installed();
    const self = kind === 'app' ? `app:${manifest.id}` : `module:${manifest.name}`;
    const missing = [];
    for (const d of manifest.dependencies ?? []) {
      const key = dependencyKey(d);
      if (d.optional || key === self) continue;
      const { have, alias } = found(installed, key);
      if (!have) missing.push(d.version ? `${idOf(d)} ${d.version}` : idOf(d));
      else if (!alias && d.version && !inRange(d.version, have.version)) missing.push(`${idOf(d)} ${d.version} (c'è la ${have.version})`);
    }
    if (missing.length) fail('conflict', `${manifest.name} ha bisogno di: ${missing.join(', ')}. Installalo dall’AppStore, che installa anche quello che serve.`, { details: { missing } });
  }

  /**
   * The installed packages that declare a dependency on `key` (or on a module it replaces):
   * [{ key, kind, id, name, optional, version }] (version: null for a module it replaces, whose range was about the old one)
   */
  async dependents(key, installed = null) {
    installed ??= await this.#installed();
    const out = [];
    for (const p of installed.values()) {
      const d = p.deps.find(x => canon(installed, dependencyKey(x)) === key);
      const alias = d && dependencyKey(d) !== key;
      if (d && `${p.kind}:${p.id}` !== key) out.push({ key: `${p.kind}:${p.id}`, kind: p.kind, id: p.id, name: p.name, optional: d.optional === true, version: alias ? null : d.version ?? null });
    }
    return out;
  }

  /** Refuses removing a package another installed one needs (not optionally). */
  async checkRemovable(kind, id) {
    const needed = (await this.dependents(`${kind}:${id}`)).filter(d => !d.optional);
    if (needed.length) {
      const names = needed.map(d => d.name).join(', ');
      fail('conflict', `${kind === 'app' ? 'L’app' : 'Il modulo'} ${id} serve a ${names}: rimuovi prima ${needed.length > 1 ? 'quelle' : 'quella'}`, { details: { dependents: needed } });
    }
  }

  /** Refuses a version outside the range an installed package asks for. */
  async checkVersion(kind, id, version) {
    const against = (await this.dependents(`${kind}:${id}`)).filter(d => d.version && !inRange(d.version, version));
    if (against.length) {
      fail('conflict', `${against.map(d => `${d.name} vuole ${id} ${d.version}`).join('; ')}: la ${version} non va bene`, { details: { dependents: against } });
    }
  }

  // ---------- Removal ----------

  /**
   * What removing a package means: blockedBy, the installed packages that need it (it is not
   * removed while they are there); unneeded, the packages installed only for it (or for those)
   * that nothing else needs any more, in the order they can go.
   *   { blockedBy: [{ key, kind, id, name }], unneeded: [{ key, kind, id, name, version }], restartRequired }
   */
  async removal(principal, kind, id) {
    requireAdmin(principal);
    const installed = await this.#installed();
    const key = `${kind}:${id}`;
    if (!installed.has(key)) fail('not_found', kind === 'app' ? 'App non installata' : 'Modulo non attivo');
    const blockedBy = (await this.dependents(key, installed)).filter(d => !d.optional).map(({ key: k, kind: t, id: i, name }) => ({ key: k, kind: t, id: i, name }));
    const removed = new Set([key]), unneeded = [];
    const needs = (p, k) => p.deps.some(d => canon(installed, dependencyKey(d)) === k);
    for (let changed = true; changed;) {
      changed = false;
      for (const [k, p] of installed) {
        if (removed.has(k) || !p.dependency || p.required) continue;
        const wasNeeded = [...removed].some(r => needs(installed.get(r), k));
        const stillNeeded = [...installed].some(([o, q]) => o !== k && !removed.has(o) && needs(q, k));
        if (wasNeeded && !stillNeeded) {
          removed.add(k);
          unneeded.push({ key: k, kind: p.kind, id: p.id, name: p.name, version: p.version });
          changed = true;
        }
      }
    }
    return { blockedBy, unneeded, restartRequired: kind === 'module' || unneeded.some(u => u.kind === 'module') };
  }

  /**
   * Removes the package and, of its `unneeded` ones (removal()), those in `also` (keys).
   * Returns { removed: [keys], restartRequired }.
   */
  remove(principal, kind, id, options = {}) {
    requireAdmin(principal);
    return this.#serial(() => this.#remove(principal, kind, id, options));
  }

  async #remove(principal, kind, id, { also = [] } = {}) {
    const plan = await this.removal(principal, kind, id);
    const extra = plan.unneeded.filter(u => also.includes(u.key));
    const { installer, moduleAdmin } = this.#kernel;
    const removed = [];
    for (const p of [{ key: `${kind}:${id}`, kind, id }, ...extra]) {
      if (p.kind === 'app') await installer.uninstall(principal, p.id);
      else await moduleAdmin.remove(principal, p.id);
      removed.push(p.key);
    }
    return { removed, restartRequired: [{ kind }, ...extra].some(p => p.kind === 'module') };
  }

  // ---------- At run time ----------

  /**
   * The apps of installer.list() with `unmet`: their required dependencies that are not there now,
   *   [{ key, kind, id, version, why: 'restart' | 'missing' }]   restart: installed, it runs after
   *   the kernel's restart (or the one running is outside the range)
   */
  async withUnmet(apps) {
    const running = new Map(this.#kernel.modules.map(m => [m.name, m.version]));
    // A module replaced by one that runs is there, at any version
    const replacedBy = new Map(this.#kernel.modules.flatMap(m => (m.replaces ?? []).filter(old => !running.has(old)).map(old => [old, m.name])));
    let enabled = null;
    const enabledModules = async () => {
      enabled ??= new Map((await this.#kernel.moduleAdmin.list()).filter(m => m.enabled).map(m => [m.name, m.enabled]));
      return enabled;
    };
    const versions = new Map(apps.map(a => [a.id, a.version]));
    const out = [];
    for (const app of apps) {
      const unmet = [];
      for (const d of app.manifest?.dependencies ?? []) {
        if (d.optional) continue;
        const id = idOf(d), ok = v => !!v && (!d.version || inRange(d.version, v));
        if (d.app !== undefined) {
          if (!ok(versions.get(id))) unmet.push({ key: `app:${id}`, kind: 'app', id, version: d.version ?? null, why: 'missing' });
        } else if (replacedBy.has(id)) {
          continue;
        } else if (!ok(running.get(id))) {
          unmet.push({ key: `module:${id}`, kind: 'module', id, version: d.version ?? null, why: ok((await enabledModules()).get(id)) ? 'restart' : 'missing' });
        }
      }
      out.push(unmet.length ? { ...app, unmet } : app);
    }
    return out;
  }
}

const strings = v => (Array.isArray(v) ? v.filter(s => typeof s === 'string').slice(0, 100) : []);
