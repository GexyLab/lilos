import { createServer } from 'node:http';
import { loadConfig, MODULES_DIR } from './config.js';
import { resolveModules, startModule } from './modules.js';
import { Router, send, readJson, cookies, checkOrigin, checkHost } from './http.js';
import { KernelError, fail } from './errors.js';
import { logger } from './log.js';
import { sessionRoutes, SESSION_COOKIE } from './api/session.js';
import { homeRoutes } from './api/home.js';
import { appRoutes } from './api/apps.js';
import { Installer } from './apps/installer.js';
import { Repos } from './apps/repos.js';
import { ModuleAdmin } from './apps/modulePackage.js';
import { storeRoutes } from './api/store.js';
import { KERNEL } from './services.js';

const log = logger('kernel');
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

/** Without an 'auth' module lilOS has one user, and the kernel only listens on this machine. */
const LOCAL_USER = Object.freeze({ id: 'local', username: 'utente', name: 'Utente', role: 'admin' });

/**
 * The kernel: loads the modules named in the configuration, collects the services they provide
 * and serves lilOS's API. Everything that touches a resource (users, files, databases) is done by
 * a module behind a service; the kernel only routes, checks who is asking and passes it on.
 */
export class Kernel {
  services = new Map();
  modules = [];
  router = new Router();
  #server = null;

  static async start() {
    const kernel = new Kernel();
    await kernel.#start(await loadConfig());
    return kernel;
  }

  get multiUser() { return this.services.has('auth'); }

  service(name) {
    return this.services.get(name) ?? fail('unavailable', `Servizio non disponibile: ${name}`);
  }

  async #start(config) {
    this.config = config;
    if (!config.modules.some(m => m)) log.warn('Nessun modulo nella configurazione');
    const route = (method, path, handler) => this.router.add(method, path, ctx => handler({ ...ctx, principal: ctx.principal ?? fail('unauthorized', 'Accesso richiesto') }));
    for (const mod of await resolveModules(MODULES_DIR, config.modules)) {
      this.modules.push(await startModule(mod, this.services, { route }));
      log.info(`Modulo avviato: ${mod.name} ${mod.version} (${mod.provides.join(', ') || 'nessun servizio'})`);
    }
    if (!this.services.has('fs')) throw new Error('Nessun modulo fornisce il servizio "fs": lilOS non ha un file system');
    if (!this.multiUser && !LOOPBACK_HOSTS.has(config.host)) {
      throw new Error('Senza un modulo di autenticazione il kernel ascolta solo su questo computer (host 127.0.0.1)');
    }
    this.installer = new Installer(this.services.get('fs'), config);
    this.repos = new Repos(config);
    this.moduleAdmin = new ModuleAdmin(this, config);
    sessionRoutes(this);
    homeRoutes(this);
    appRoutes(this);
    storeRoutes(this);
    await this.#bootstrapApps(config.bootstrapApps);

    this.#server = createServer((req, res) => this.#handle(req, res));
    await new Promise((resolve, reject) => {
      this.#server.once('error', reject);
      this.#server.listen(config.port, config.host, resolve);
    });
    log.info(`In ascolto su http://${config.host}:${config.port} (${this.multiUser ? 'multiutente' : 'utente singolo'})`);
  }

  /**
   * The system apps lilOS needs (configuration apps.bootstrap) come from the official repository:
   * on the first start all of them, later the required ones that are missing, before lilOS is served. Without the repository (no network,
   * no credentials) lilOS starts without them and says why in the log.
   */
  async #bootstrapApps(ids) {
    const missing = [];
    for (const id of ids) if (!await this.installer.state(id)) missing.push(id);
    if (!missing.length) return;
    // After the first start only the required ones come back: an app an admin removed stays removed
    const firstStart = !(await this.installer.list()).length;
    try {
      const catalog = await this.repos.catalog('official');
      for (const id of missing) {
        const entry = catalog.apps.find(a => a.manifest?.id === id);
        if (!entry) { log.warn(`App di sistema ${id} non presente nel repository ufficiale`); continue; }
        if (!firstStart && !entry.manifest.required) continue;
        await this.installer.install(KERNEL, {
          source: { type: 'git', url: catalog.repo.url, ref: catalog.ref, path: entry.path },
          grant: entry.manifest.permissions ?? [],
        });
      }
    } catch (err) {
      log.warn(`App di sistema non installate (${missing.join(', ')}): ${err.message}`);
    }
  }

  /** The principal of a request: the signed-in user, the only user without auth, or null. */
  async principalOf(req) {
    if (!this.multiUser) return { kind: 'user', ...LOCAL_USER };
    const token = cookies(req)[SESSION_COOKIE];
    if (!token) return null;
    const user = await this.service('auth').session(token);
    return user ? { kind: 'user', id: user.id, username: user.username, name: user.name, role: user.role } : null;
  }

  async #handle(req, res) {
    try {
      checkHost(req, this.config);
      const url = new URL(req.url, 'http://kernel');
      const found = this.router.match(req.method, url.pathname);
      if (!found) return send(res, 404, { error: 'not_found', message: 'Risorsa inesistente' });
      if (!found.handler) return send(res, 405, { error: 'invalid', message: 'Metodo non permesso' }, { Allow: found.allowed.join(', ') });
      checkOrigin(req, this.config);
      const result = await found.handler({
        req, res, params: found.params, query: url.searchParams,
        principal: await this.principalOf(req),
        json: (limit = 1 << 20) => readJson(req, limit),
      });
      if (!res.headersSent) send(res, result === undefined ? 204 : 200, result);
    } catch (err) {
      if (res.headersSent) return res.destroy();
      if (err instanceof KernelError) {
        return send(res, err.status, { error: err.code, message: err.message }, err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : {});
      }
      log.error(`${req.method} ${req.url}`, err);
      send(res, 500, { error: 'internal', message: 'Errore interno del kernel' });
    }
  }

  async stop() {
    await new Promise(resolve => (this.#server ? this.#server.close(resolve) : resolve()));
    for (const mod of [...this.modules].reverse()) {
      try { await mod.impl.stop?.(); } catch (err) { log.error(`Arresto di ${mod.name}`, err); }
    }
  }
}
