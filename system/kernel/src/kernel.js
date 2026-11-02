import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { loadConfig, DATA_DIR, MODULES_DIR, RELEASE_DIR, SYSTEM_VERSION } from './config.js';
import { resolveModules, startModule, openSecretSettings, REQUIRED_MODULES } from './modules.js';
import { Secrets } from './net/secrets.js';
import { Router, send, readJson, cookies, checkOrigin, checkHost, checkSocketOrigin } from './http.js';
import { KernelError, fail } from './errors.js';
import { logger } from './log.js';
import { sessionRoutes, SESSION_COOKIE } from './api/session.js';
import { homeRoutes } from './api/home.js';
import { appRoutes } from './api/apps.js';
import { Installer } from './apps/installer.js';
import { Repos } from './apps/repos.js';
import { ModuleAdmin, ensureRequiredModules, applyReplacements } from './apps/modulePackage.js';
import { storeRoutes } from './api/store.js';
import { serviceRoutes } from './api/services.js';
import { notificationRoutes } from './api/notifications.js';
import { systemRoutes } from './api/system.js';
import { netRoutes } from './api/net.js';
import { termRoutes } from './api/term.js';
import { scheduleRoutes } from './api/schedule.js';
import { Schedules } from './schedule/index.js';
import { Network } from './net/network.js';
import { OAuthApps, migrateOAuthSettings } from './net/oauth.js';
import { KnownHosts } from './net/knownHosts.js';
import { Transfers } from './net/transfers.js';
import { Terminals } from './term/terminals.js';
import { acceptSocket, refuseUpgrade } from './ws.js';
import { SystemReleases } from './apps/systemPackage.js';
import { webFiles } from './web.js';
import { AppServices } from './apps/appServices.js';
import { KERNEL } from './services.js';

const log = logger('kernel');
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
/** The usual ports of the terminal protocols, for the server keys saved without one when the module is not there. */
const TERM_PORTS = { ssh: 22, telnet: 23, rlogin: 513, supdup: 95 };

/** Without an 'auth' module lilOS has one user, and the kernel only listens on this machine. */
const LOCAL_USER = Object.freeze({ id: 'local', username: 'utente', name: 'Utente', role: 'admin' });

/**
 * The kernel: loads the modules named in the configuration, collects the services they provide
 * and serves lilOS's API. Everything that touches a resource (users, files, databases) is done by
 * a module behind a service; the kernel only routes, checks who is asking and passes it on.
 * In an installed lilOS it also serves the page (web.js).
 */
export class Kernel {
  services = new Map();
  modules = [];
  router = new Router();
  /** Routes of the WebSockets (an 'upgrade' request): handlers get { req, socket, head, params, query, principal } */
  sockets = new Router();
  /** 'user' { owner, event, data }: for that user's open lilOS pages (api/services.js streams them) */
  events = new EventEmitter().setMaxListeners(0);   // one listener per open page
  #server = null;
  #web = RELEASE_DIR ? webFiles(join(RELEASE_DIR, 'web')) : null;

  static async start() {
    const kernel = new Kernel();
    await kernel.#start(await loadConfig());
    return kernel;
  }

  get multiUser() { return this.services.has('auth'); }

  service(name) {
    return this.services.get(name) ?? fail('unavailable', `Servizio non disponibile: ${name}`);
  }

  /** The principal of a user by id ({ kind: 'user', id, username, name, role }), or null when there is none. */
  async userPrincipal(id) {
    if (!this.multiUser) return id === LOCAL_USER.id ? { kind: 'user', ...LOCAL_USER } : null;
    const user = await this.services.get('users')?.get(id).catch(() => null);
    return user ? { kind: 'user', id: user.id, username: user.username, name: user.name, role: user.role } : null;
  }

  /** Ids of the users who hear what the system says (the notifications of its services): the admins. */
  async adminIds() {
    if (!this.multiUser) return [LOCAL_USER.id];
    return (await this.services.get('users')?.list() ?? []).filter(u => u.role === 'admin').map(u => u.id);
  }

  async #start(loaded) {
    // The modules lilOS cannot do without, put back before anything starts; modules merged into
    // another one turned on give it their place (module.json `replaces`)
    const required = await ensureRequiredModules();
    const replaced = await applyReplacements();
    const config = required.length || replaced.length ? await loadConfig() : loaded;
    this.config = config;
    if (!config.modules.some(m => m)) log.warn('Nessun modulo nella configurazione');
    const route = (method, path, handler) => this.router.add(method, path, ctx => handler({ ...ctx, principal: ctx.principal ?? fail('unauthorized', 'Accesso richiesto') }));
    const emit = (owner, event, data) => this.events.emit('user', { owner, event, data });
    // A module's WebSocket: signed-in users only; the module takes the connection with accept()
    const socket = (path, handler) => this.sockets.add('GET', path, async ({ req, socket: raw, head, params, query, principal }) => {
      if (!principal) fail('unauthorized', 'Accesso richiesto');
      let ws = null;
      const accept = ({ maxMessage = 1 << 20 } = {}) => {
        if (ws) return ws;
        ws = acceptSocket(req, raw, head, { maxMessage }) ?? fail('invalid', 'Serve un WebSocket');
        return ws;
      };
      await handler({ principal, params, query, accept });
      if (!ws) fail('forbidden', 'Connessione rifiutata');
    });
    this.settingSecrets = new Secrets(join(DATA_DIR, 'net'));
    const mods = await resolveModules(MODULES_DIR, config.modules);
    // The apps registered with the providers, once in the settings of each module (net/oauth.js)
    await migrateOAuthSettings(config, mods, log);
    this.oauth = new OAuthApps(config.oauth, { secrets: this.settingSecrets });
    await this.oauth.open(log);
    for (const mod of mods) {
      await openSecretSettings(mod, this.settingSecrets, log);
      this.modules.push(await startModule(mod, this.services, { route, emit, socket, dataDir: join(DATA_DIR, 'modules-data') }));
      log.info(`Modulo avviato: ${mod.name} ${mod.version} (${mod.provides.join(', ') || 'nessun servizio'})`);
    }
    if (!this.services.has('fs')) throw new Error('Nessun modulo fornisce il servizio "fs": lilOS non ha un file system');
    for (const [name, service] of Object.entries(REQUIRED_MODULES)) {
      if (!this.services.has(service)) throw new Error(`Il modulo obbligatorio ${name} non fornisce il servizio "${service}"`);
    }
    if (!this.multiUser && !LOOPBACK_HOSTS.has(config.host)) {
      throw new Error('Senza un modulo di autenticazione il kernel ascolta solo su questo computer (host 127.0.0.1)');
    }
    this.installer = new Installer(this.services.get('fs'), config);
    this.repos = new Repos(config);
    this.moduleAdmin = new ModuleAdmin(this, config);
    this.appServices = new AppServices(this);
    this.system = new SystemReleases(this);
    this.network = new Network(this);
    this.transfers = new Transfers(this, this.network);
    this.terminals = new Terminals(this);
    // The server keys the Rete folder and the Terminal kept apart before lilOS 1.21.0, in one place
    const termPorts = new Map([...this.terminals.drivers].map(([id, d]) => [id, d.port]));
    const moved = await KnownHosts.migrate({ netDir: this.network.dir, termDir: this.terminals.dir, termPort: id => termPorts.get(id) ?? TERM_PORTS[id] ?? null });
    if (moved) log.info(`Chiavi dei server confermate riunite per ${moved} utenti`);
    this.schedules = new Schedules(this);
    sessionRoutes(this);
    homeRoutes(this);
    appRoutes(this);
    storeRoutes(this);
    serviceRoutes(this);
    notificationRoutes(this);
    systemRoutes(this);
    netRoutes(this);
    termRoutes(this);
    scheduleRoutes(this);
    await this.#bootstrapApps(config.bootstrapApps);

    this.#server = createServer((req, res) => this.#handle(req, res));
    this.#server.on('upgrade', (req, socket, head) => this.#upgrade(req, socket, head));
    await new Promise((resolve, reject) => {
      this.#server.once('error', reject);
      this.#server.listen(config.port, config.host, resolve);
    });
    log.info(`lilOS ${SYSTEM_VERSION}${RELEASE_DIR ? '' : ' (copia di sviluppo)'} in ascolto su http://${config.host}:${config.port} (${this.multiUser ? 'multiutente' : 'utente singolo'})`);
    // Connections of users that are gone, then the transfers that were running when the kernel stopped
    await this.network.prune().catch(err => log.error('Pulizia delle connessioni di rete', err));
    await this.terminals.prune().catch(err => log.error('Pulizia degli host dei terminali', err));
    this.transfers.start().catch(err => log.error('Trasferimenti all’avvio', err));
    // system:ready — the services an admin chose for everyone
    this.appServices.systemReady().catch(err => log.error('Servizi all’avvio', err));
    // The scheduler's clock: what was missed while the kernel was off runs now (once)
    this.schedules.start().catch(err => log.error('Pianificazione all’avvio', err));
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

  /**
   * The principal of a request: the signed-in user, the only user without auth, or null.
   * The first request of a user in this run is their user:login (their services start).
   */
  async principalOf(req) {
    let principal = null;
    if (!this.multiUser) principal = { kind: 'user', ...LOCAL_USER };
    else {
      const token = cookies(req)[SESSION_COOKIE];
      const user = token ? await this.service('auth').session(token) : null;
      if (user) principal = { kind: 'user', id: user.id, username: user.username, name: user.name, role: user.role };
    }
    if (principal) {
      this.appServices?.userSeen(principal);
      this.network?.userSeen(principal);
    }
    return principal;
  }

  async #handle(req, res) {
    try {
      checkHost(req, this.config);
      const url = new URL(req.url, 'http://kernel');
      const found = this.router.match(req.method, url.pathname);
      if (!found && this.#web && !url.pathname.startsWith('/api/') && await this.#web(req, res, url.pathname)) return;
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
        return send(res, err.status, { error: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) }, err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : {});
      }
      log.error(`${req.method} ${req.url}`, err);
      send(res, 500, { error: 'internal', message: 'Errore interno del kernel' });
    }
  }

  /** A WebSocket: same checks as a request, then the route takes the socket. */
  async #upgrade(req, socket, head) {
    socket.on('error', () => {});
    try {
      checkHost(req, this.config);
      checkSocketOrigin(req, this.config);
      const url = new URL(req.url, 'http://kernel');
      const found = this.sockets.match(req.method, url.pathname);
      if (!found?.handler) return refuseUpgrade(socket, 404, 'Not Found');
      await found.handler({ req, socket, head, params: found.params, query: url.searchParams, principal: await this.principalOf(req) });
    } catch (err) {
      if (err instanceof KernelError) return refuseUpgrade(socket, err.status, err.code);
      log.error(`Upgrade ${req.url}`, err);
      refuseUpgrade(socket, 500, 'internal');
    }
  }

  async stop() {
    await this.terminals?.stop().catch(err => log.error('Arresto dei terminali', err));
    await this.appServices?.stopAll();
    await this.transfers?.stop().catch(err => log.error('Arresto dei trasferimenti', err));
    await this.network?.stop().catch(err => log.error('Arresto delle connessioni di rete', err));
    // Event streams (/api/services-events) stay open: close them, or close() waits for ever
    await new Promise(resolve => {
      if (!this.#server) return resolve();
      this.#server.close(resolve);
      this.#server.closeAllConnections();
    });
    for (const mod of [...this.modules].reverse()) {
      try { await mod.impl.stop?.(); } catch (err) { log.error(`Arresto di ${mod.name}`, err); }
    }
  }
}
