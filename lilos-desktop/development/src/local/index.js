import { EventEmitter } from 'node:events';
import { existsSync, renameSync, rmSync } from 'node:fs';
import { sep } from 'node:path';
import { t } from '../i18n.js';
import { forgetPasswords, installSettings } from '../installFile.js';
import { LILOS_DIR, PG_DIR, useLilosDir } from '../runtime.js';
import { settings, update } from '../store.js';
import * as pg from './postgres.js';
import { Kernel, LICENSE_REFUSED, addAdmin, configure, createDatabase, currentVersion, install, installed, setUi, waitReady } from './kernel.js';
import { freePort, portFree } from './proc.js';

const KERNEL_PORT = 8790;
const PG_PORT = 5433;

// Where the installation settings put lilOS, once it was chosen (installer.dir)
if (settings().local.dir) useLilosDir(settings().local.dir);

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
      this.#error = code === LICENSE_REFUSED ? t('local.error.license') : `Il kernel si è fermato (codice ${code})`;
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

  /** A line of what is being done, from who drives the setup (noui.js: license, PATH, …). */
  note(text) {
    this.#say(text);
  }

  /** Ports still free, or new ones (another program took them): the kernel's config follows. */
  async #ports() {
    const local = settings().local;
    const pgPort = local.pgPort && await portFree(local.pgPort) ? local.pgPort : await freePort(PG_PORT);
    const port = local.port && await portFree(local.port) ? local.port : await freePort(KERNEL_PORT);
    update(d => { d.local.pgPort = pgPort; d.local.port = port; });
    return { pgPort, port };
  }

  /**
   * First start: database, lilOS from the carried release (or as the installation settings say),
   * the first administrator (none with an image that has its users), then on.
   *   noUi            lilOS without UI (install.js --no-ui; "ui": false stays in config.json)
   *   acceptLicense   accepted in the program: install.js --accept-license
   */
  setup({ username = null, password = null, noUi = false, acceptLicense = false } = {}) {
    return this.#run(async () => {
      const file = installSettings();
      if (!installed() && !settings().local.dir && file?.dir) {
        update(d => { d.local.dir = file.dir; });
        useLilosDir(file.dir);
      }
      if (!settings().local.pgPassword) update(d => { d.local.pgPassword = pg.newPassword(); });
      this.#say('Preparo il database…');
      await pg.init(settings().local.pgPassword);
      const { pgPort, port } = await this.#ports();
      await pg.start(pgPort);
      if (!installed()) {
        this.#say(file?.image ? 'Installo l’immagine del sistema…' : 'Installo lilOS e i moduli del kernel…');
        await install(line => this.#say(line), file?.file ?? null, { noUi, acceptLicense });
      }
      // Also when an earlier, unfinished attempt installed it the other way
      setUi(!noUi);
      const local = settings().local;
      await createDatabase(pg.url({ ...local, pgPort }).replace(/\/lilos$/, '/postgres'), pg.DATABASE);
      configure({ port, databaseUrl: pg.url({ ...local, pgPort }) });
      if (username) {
        this.#say('Creo il primo utente…');
        await addAdmin(username, password);
      }
      update(d => { d.local.installed = true; });
      await this.#startKernel(port, noUi ? 'noUi' : 'first');
      forgetPasswords();
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
      await this.#startKernel(port);
    });
  }

  /** how: 'first' (installs the system apps), 'noUi' (first start without UI: no apps), else a usual start. */
  async #startKernel(port, how = null) {
    this.#say(how === 'first' ? 'Avvio il kernel e installo le app di sistema (la prima volta ci vuole qualche minuto)…' : how === 'noUi' ? t('local.startNoUi') : 'Avvio il kernel…');
    this.#kernel.start();
    try {
      await waitReady(port, { isAlive: () => this.#kernel.running });
    } catch (err) {
      // Said plainly: the kernel stopped because nobody accepted the license
      if (this.#kernel.lastExit === LICENSE_REFUSED) throw new Error(t('local.error.license'));
      throw err;
    }
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

  /**
   * Starting from zero: lilOS and its database stop, then their folders are put aside
   * (<folder>.old-<date and time>, next to them) or, with `erase`, deleted. The next lilOS goes
   * where a new installation puts it.
   */
  async discard({ erase = false } = {}) {
    await this.stop().catch(() => {});
    // AAAAMMGGhhmm in the computer's time
    const now = new Date();
    const stamp = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()].map(n => String(n).padStart(2, '0')).join('');
    for (const dir of [LILOS_DIR, PG_DIR]) {
      // The database inside lilOS's folder (installer.dir) goes with it
      if (!existsSync(dir) || (dir !== LILOS_DIR && dir.startsWith(LILOS_DIR + sep))) continue;
      if (erase) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
      else renameSync(dir, `${dir}.old-${stamp}`);
    }
    useLilosDir();
  }

  /** Restarts the kernel (not the database): the button after a failure, the tray's «Riavvia il kernel». */
  async restart() {
    this.#stopping = true;
    await this.#kernel.stop();
    // Running until now: start() would think it still is
    if (this.#status === 'running') this.#set('stopped');
    return this.start();
  }
}

export const local = new LocalLilos();
