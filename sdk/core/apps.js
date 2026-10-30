import { Emitter } from './events.js';
import { kernel } from './kernel.js';

/**
 * Installed apps (packages in /system/app, for every user and workspace) and their installation.
 * install / update / uninstall need an administrator, and only the system and system apps reach
 * them: apps in a sandbox see only what their bridge gives them.
 *
 *   apps.list() → [{ id, version, kind, system, signed, publisher, granted, source, manifest, … }]
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
    const next = await kernel.request('PUT', '/apps-security', { isolated: isolated === true });
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
 *   repositories.catalog(id) → { repo, name, ref, commit, apps: [{ path, manifest } | { path, error }],
 *                                modules: [{ path, module } | { path, error }] }
 * To install from a catalog: apps.install({ type: 'git', url: repo.url, path }) (the latest version).
 */
export const repositories = {
  list: () => kernel.request('GET', '/repos'),
  add: (url, name) => kernel.request('POST', '/repos', { url, ...(name && { name }) }),
  remove: id => kernel.request('DELETE', `/repos/${encodeURIComponent(id)}`),
  catalog: id => kernel.request('GET', `/repos/${encodeURIComponent(id)}/catalog`),
};

/**
 * Kernel modules (admins). They run inside the kernel: any change takes effect after restart().
 *   kernelModules.list() → [{ name, version, description, provides, requires, enabled, running, versions, source }]
 *   kernelModules.install(source, { allowUnsigned })  → { name, version, restartRequired }
 *   kernelModules.update(name, { ref, allowUnsigned })
 *   kernelModules.remove(name)                        → { kept: [folders kept for their data] }
 *   kernelModules.restart()                           the kernel starts again (lilOS reconnects)
 */
export const kernelModules = {
  list: () => kernel.request('GET', '/modules'),
  install: (source, { allowUnsigned = false } = {}) => kernel.request('POST', '/modules', { source, allowUnsigned }),
  update: (name, { ref, allowUnsigned = false } = {}) => kernel.request('POST', `/modules/${encodeURIComponent(name)}/update`, { ref, allowUnsigned }),
  remove: name => kernel.request('DELETE', `/modules/${encodeURIComponent(name)}`),
  restart: () => kernel.request('POST', '/kernel/restart', {}),
};
