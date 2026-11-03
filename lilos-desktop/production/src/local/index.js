import { EventEmitter } from 'node:events';
import { settings, update } from '../store.js';
import * as pg from './postgres.js';
import { Kernel, addAdmin, configure, createDatabase, currentVersion, install, installed, waitReady } from './kernel.js';
import { freePort, portFree } from './proc.js';

const KERNEL_PORT = 8790;
const PG_PORT = 5433;

/**
 * The lilOS the program runs on this computer: PostgreSQL, then the kernel. Status: 'stopped',
 * 'starting', 'running', 'failed' (event 'status'); what it is doing (event 'progress', a line).
 */
class LocalLilos extends EventEmitter {
  #kernel = new Kernel();
  #status = 'stopped';
  #error = null;
  #starting = null;
  #stopping = false;

  constructor() {
    super();
    this.#kernel.on('line', line => this.emit('progress', line));
    this.#kernel.on('exit', code => {
      if (this.#stopping) return;
      this.#error = `Il kernel si è fermato (codice ${code})`;
      this.#set('failed');
    });
  }

  get status() { return this.#status; }
  get error() { return this.#error; }
  get installed() { return installed() && settings().local.installed; }
  get version() { return currentVersion(); }
  get url() { return settings().local.port ? `http://127.0.0.1:${settings().local.port}` : null; }

  #set(status) {
    this.#status = status;
    this.emit('status', status);
  }

  #say(text) {
    this.emit('progress', text);
  }

  /** Ports still free, or new ones (another program took them): the kernel's config follows. */
  async #ports() {
    const local = settings().local;
    const pgPort = local.pgPort && await portFree(local.pgPort) ? local.pgPort : await freePort(PG_PORT);
    const port = local.port && await portFree(local.port) ? local.port : await freePort(KERNEL_PORT);
    update(d => { d.local.pgPort = pgPort; d.local.port = port; });
    return { pgPort, port };
  }

  /** First start: database, lilOS from the carried release, the first administrator, then on. */
  setup({ username, password }) {
    return this.#run(async () => {
      if (!settings().local.pgPassword) update(d => { d.local.pgPassword = pg.newPassword(); });
      this.#say('Preparo il database…');
      await pg.init(settings().local.pgPassword);
      const { pgPort, port } = await this.#ports();
      await pg.start(pgPort);
      if (!installed()) {
        this.#say('Installo lilOS e i moduli del kernel…');
        await install(line => this.#say(line));
      }
      const local = settings().local;
      await createDatabase(pg.url({ ...local, pgPort }).replace(/\/lilos$/, '/postgres'), pg.DATABASE);
      configure({ port, databaseUrl: pg.url({ ...local, pgPort }) });
      this.#say('Creo il primo utente…');
      await addAdmin(username, password);
      update(d => { d.local.installed = true; });
      await this.#startKernel(port, true);
    });
  }

  /** Starts what is installed. */
  start() {
    if (this.#status === 'running') return Promise.resolve();
    return this.#run(async () => {
      if (!this.installed) throw new Error('lilOS non è installato su questo computer');
      const { pgPort, port } = await this.#ports();
      this.#say('Avvio il database…');
      if (!await pg.running()) await pg.start(pgPort);
      configure({ port, databaseUrl: pg.url({ ...settings().local, pgPort }) });
      await this.#startKernel(port, false);
    });
  }

  async #startKernel(port, first) {
    this.#say(first ? 'Avvio il kernel e installo le app di sistema (la prima volta ci vuole qualche minuto)…' : 'Avvio il kernel…');
    this.#kernel.start();
    await waitReady(port, { isAlive: () => this.#kernel.running });
  }

  #run(fn) {
    if (this.#starting) return this.#starting;
    this.#error = null;
    this.#stopping = false;
    this.#set('starting');
    this.#starting = (async () => {
      try {
        await fn();
        this.#set('running');
      } catch (err) {
        this.#error = err.message;
        this.#stopping = true;
        await this.#kernel.stop().catch(() => {});
        this.#set('failed');
        throw err;
      } finally {
        this.#starting = null;
      }
    })();
    return this.#starting;
  }

  async stop() {
    this.#stopping = true;
    await this.#kernel.stop();
    await pg.stop().catch(() => {});
    this.#set('stopped');
  }

  /** Restarts the kernel (not the database): the button after a failure. */
  async restart() {
    this.#stopping = true;
    await this.#kernel.stop();
    return this.start();
  }
}

export const local = new LocalLilos();
