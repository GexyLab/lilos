import { Emitter } from './events.js';
import { kernel } from './kernel.js';

/**
 * Installed apps (packages in /system/app, for every user and workspace) and their installation.
 * install / update / uninstall need an administrator, and only the system and system apps reach
 * them: apps in a sandbox see only what their bridge gives them.
 *
 *   apps.list() → [{ id, version, kind, system, signed, publisher, granted, source, manifest, unmet?, dependency?, … }]
 *       unmet: [{ key, kind: 'module' | 'app', id, version, why: 'restart' | 'missing' }], the required
 *       dependencies (manifest `dependencies`) not there now: 'restart', installed and running after the
 *       kernel's restart. dependency: installed only because another package needed it (see packages)
 *   apps.get(id)
 *   await apps.install(source, { grant, allowUnsigned })
 *       source: { type: 'git', url, ref?, path? } | { type: 'github', repo: 'owner/name', ref?, path? }
 *               | { type: 'local', dir } (development)
 *       grant: the permissions of the manifest that need consent (all but the implicit ones)
 *       allowUnsigned: the user accepted the warning for an app that cannot be verified
 *   await apps.update(id, { ref, reinstall, grant, allowUnsigned })
 *       newest version from the app's source (or `ref`); `reinstall` writes the same version again
 *       without deleting anything
 *   await apps.uninstall(id)
 *
 * How apps run (admins change it; lilOS reads it when an app starts):
 *   apps.security() → { isolated }               the general rule (isolated unless an admin chose otherwise)
 *   await apps.setSecurity({ isolated })
 *   await apps.setAppSecurity(id, isolated)      true | false, or null for the general rule (app state: `isolated`)
 *
 * Events: 'change' { id, app | null }: an app was installed, updated or removed (null);
 * 'security' { isolated }: the general rule changed.
 */
class Apps extends Emitter {
  #list = [];
  #security = { isolated: true };

  constructor() {
    super();
    if (kernel.connected) {
      this.#list = Array.isArray(kernel.data.apps) ? kernel.data.apps : [];
      this.#security = { isolated: kernel.data.appSecurity?.isolated !== false };
    }
  }

  security() {
    return { ...this.#security };
  }

  async setSecurity({ isolated }) {
    const next = await kernel.request('PUT', '/apps-security', { isolated });
    this.#security = { isolated: next.isolated !== false };
    this.emit('security', this.security());
  }

  async setAppSecurity(id, isolated) {
    await kernel.request('PUT', `/apps/${encodeURIComponent(id)}/security`, { isolated: typeof isolated === 'boolean' ? isolated : null });
    await this.refresh();
  }

  list() {
    return this.#list.map(a => structuredClone(a));
  }

  get(id) {
    const app = this.#list.find(a => a.id === id);
    return app ? structuredClone(app) : null;
  }

  /** Reads the list again from the kernel, emitting 'change' for what differs. */
  async refresh() {
    const next = await kernel.request('GET', '/apps');
    const before = new Map(this.#list.map(a => [a.id, JSON.stringify(a)]));
    this.#list = next;
    for (const app of next) if (before.get(app.id) !== JSON.stringify(app)) this.emit('change', { id: app.id, app: structuredClone(app) });
    for (const id of before.keys()) if (!next.some(a => a.id === id)) this.emit('change', { id, app: null });
    const security = await kernel.request('GET', '/apps-security').catch(() => null);
    if (security && (security.isolated !== false) !== this.#security.isolated) {
      this.#security = { isolated: security.isolated !== false };
      this.emit('security', this.security());
    }
  }

  async install(source, { grant = [], allowUnsigned = false } = {}) {
    const state = await kernel.request('POST', '/apps', { source, grant, allowUnsigned });
    await this.refresh();
    return this.get(state.id);
  }

  async update(id, { ref, reinstall = false, grant = [], allowUnsigned = false } = {}) {
    const state = await kernel.request('POST', `/apps/${encodeURIComponent(id)}/update`, { ref, reinstall, grant, allowUnsigned });
    await this.refresh();
    return { ...this.get(id), unchanged: !!state.unchanged };
  }

  async uninstall(id) {
    await kernel.request('DELETE', `/apps/${encodeURIComponent(id)}`);
    await this.refresh();
  }

  /** The text of a file of an installed app (its code). */
  file(id, path) {
    return kernel.request('GET', `/apps/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}`, undefined, { text: true });
  }

  /** The text of a library cached in /system/commons. */
  library(name, version) {
    return kernel.request('GET', `/commons/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, undefined, { text: true });
  }
}

export const apps = new Apps();

/**
 * Repositories apps and kernel modules come from (the official one and those an admin added).
 *   repositories.list() → [{ id, name, url, official }]
 *   repositories.add(url, name?)  /  remove(id)            admins
 *   repositories.catalog(id) → { repo, name, ref, commit, apps: [{ path, manifest, readme } | { path, error }],
 *                                modules: [{ path, module, readme } | { path, error }],
 *                                system: { path, system, readme, changelog } | { path, error } | null }
 *       system: lilOS itself, only in the official repository (see systemReleases below)
 *       readme: README.md of the package folder (Markdown) or null; past 64 KB it is cut and
 *       readmeTruncated is true
 *   repositories.readme(id, path, file?) → the whole README.md of a package of the catalog (text);
 *       file 'CHANGELOG.md' for lilOS (catalog `system`)
 * To install from a catalog: apps.install({ type: 'git', url: repo.url, path }) (the latest version).
 */
export const repositories = {
  list: () => kernel.request('GET', '/repos'),
  add: (url, name) => kernel.request('POST', '/repos', { url, ...(name && { name }) }),
  remove: id => kernel.request('DELETE', `/repos/${encodeURIComponent(id)}`),
  catalog: id => kernel.request('GET', `/repos/${encodeURIComponent(id)}/catalog`),
  readme: (id, path, file) => kernel.request('GET', `/repos/${encodeURIComponent(id)}/readme?path=${encodeURIComponent(path)}${file ? `&file=${encodeURIComponent(file)}` : ''}`, undefined, { text: true }),
};

/**
 * Kernel modules (admins). They run inside the kernel: any change takes effect after restart().
 *   kernelModules.list() → [{ name, version, description, icon, provides, requires, enabled, running, versions, source }]
 *   kernelModules.install(source, { allowUnsigned })  → { name, version, restartRequired }
 *   kernelModules.update(name, { ref, allowUnsigned })
 *   kernelModules.remove(name)                        → { kept: [folders kept for their data] }
 *   kernelModules.restart()                           the kernel starts again (lilOS reconnects)
 *   kernelModules.settings(name) → { fields, values, live }   a running module's settings (module.json
 *                                                     `settings`, fields as a network protocol's)
 *   kernelModules.saveSettings(name, values) → the same    live: they count at once (no restart)
 */
export const kernelModules = {
  list: () => kernel.request('GET', '/modules'),
  install: (source, { allowUnsigned = false } = {}) => kernel.request('POST', '/modules', { source, allowUnsigned }),
  update: (name, { ref, allowUnsigned = false } = {}) => kernel.request('POST', `/modules/${encodeURIComponent(name)}/update`, { ref, allowUnsigned }),
  remove: name => kernel.request('DELETE', `/modules/${encodeURIComponent(name)}`),
  restart: () => kernel.request('POST', '/kernel/restart', {}),
  settings: name => kernel.request('GET', `/modules/${encodeURIComponent(name)}/settings`),
  saveSettings: (name, values) => kernel.request('PUT', `/modules/${encodeURIComponent(name)}/settings`, { values }),
};

/**
 * Apps and kernel modules installed together with what they need (manifest and module.json
 * `dependencies`), admins: first the plan, to show; then the install, with the admin's answers.
 *   packages.plan(target) → { root, steps, problems, restartRequired }
 *       target: { install: { kind: 'app' | 'module', source } } | { update: { kind, id, ref?, reinstall? } }
 *       steps: what gets installed or updated with it, each after what it needs:
 *         { key: 'module:arduino', kind, id, name, version, action: 'install' | 'update', from, optional, choice,
 *           needs: [keys], neededBy: [{ key, name, optional, reason }], repo: { url, official }, verified,
 *           permissions, description, icon, manifest?, locales? }
 *         optional: only optional dependencies lead to it; choice: the admin may tick it (the others
 *         go in with what needs them)
 *       problems: [{ key, kind, id, optional, message }] what cannot be had (a required one stops the install)
 *   packages.install(target, { root: { grant, allowUnsigned }, steps: { [key]: { grant, allowUnsigned } } })
 *       → { result, installed: [{ key, kind, id, version, action }], restartRequired }
 *       every required step must be in `steps`, an optional one goes in when it is; if the plan has
 *       changed meanwhile nothing is done; if one fails, what this call installed is removed again
 *   packages.removal(kind, id) → { blockedBy: [{ key, kind, id, name }], unneeded: [{ key, kind, id, name, version }], restartRequired }
 *       blockedBy: installed packages that need it (it is not removed while they are there);
 *       unneeded: packages installed only for it that nothing else needs
 *   packages.remove(kind, id, { also: [keys of unneeded] }) → { removed: [keys], restartRequired }
 */
export const packages = {
  plan: target => kernel.request('POST', '/packages/plan', target),
  async install(target, { root = {}, steps = {} } = {}) {
    const out = await kernel.request('POST', '/packages/install', { ...target, root, steps });
    await apps.refresh();
    return out;
  },
  removal: (kind, id) => kernel.request('GET', `/packages/removal?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`),
  async remove(kind, id, { also = [] } = {}) {
    const out = await kernel.request('POST', '/packages/remove', { kind, id, also });
    await apps.refresh();
    return out;
  },
};

/**
 * lilOS itself: the version running and, for admins, its versions from the official repository
 * (catalog `system`: repositories.catalog('official').system). A new version runs after
 * kernelModules.restart(); if it does not come up the kernel goes back to the one before by itself.
 *   systemReleases.info() → { version, mode: 'installed' | 'development' }, for admins also
 *       { kernel, sdk, releases: [versions kept], next: version starting at the restart | null,
 *         previous, updated: { from, at } | null, failed: { version, at, reason, log } | null }
 *   systemReleases.update({ ref }) → { version, previous, restartRequired } | { version, unchanged }
 *   systemReleases.use(version)     → { version, restartRequired }   another version kept
 *   systemReleases.remove(version)  deletes a version kept (not the one running or starting)
 *   systemReleases.acknowledge('updated' | 'failed')   the notice was seen ('updated': the one before stays)
 * In development (a copy of the repository) only info() works: git updates it.
 */
export const systemReleases = {
  info: () => kernel.request('GET', '/system'),
  update: ({ ref } = {}) => kernel.request('POST', '/system/update', { ...(ref && { ref }) }),
  use: version => kernel.request('POST', '/system/use', { version }),
  remove: version => kernel.request('DELETE', `/system/releases/${encodeURIComponent(version)}`),
  acknowledge: notice => kernel.request('POST', '/system/acknowledge', { notice }),
};
