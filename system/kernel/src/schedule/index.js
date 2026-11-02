import { fail } from '../errors.js';
import { logger } from '../log.js';
import { readUserKey } from '../api/home.js';
import * as rules from '../../../../sdk/core/scheduleRules.js';
import { checkWhat, publicWhat } from './what.js';
import { runNotify } from './notify.js';
import { runCopy } from './copy.js';
import { runWeb } from './web.js';
import { runCommand } from './command.js';

/**
 * What the operations of the 'scheduler' service do, and who may ask for what (api/schedule.js).
 * The module keeps the operations and their clock; here the kernel checks `what` before it is
 * saved (what.js), does it when the clock says (host.run), tells the owner how it went and tells
 * the pages what changed.
 *
 * Where each action runs:
 *   kernel    notify (a notification), service (an app's service), copy (a folder: copy.js),
 *             web (a web request: web.js), command (a line for the Terminal's shell, or for a
 *             saved SSH host: command.js). Also with lilOS closed.
 *   browser   open (an app or a file), automation (an Automata file): the kernel tells the owner's
 *             pages ('schedule.due' { run, task }); the first that claims the run does it and
 *             says how it went. With no page open the run waits (state 'waiting') until lilOS is
 *             opened again (pending()), within the module's catchUpHours.
 *
 * Events for the pages (of the owner, and of every admin, who sees everything):
 *   'schedule.change' { ids }               operations saved, removed, turned on or off, moved
 *   'schedule.run'    { task, run, state }  a run started, waits, ended
 *   'schedule.due'    { task, run }         a browser run to do now (owner only)
 */
const log = logger('pianificazione');
const SCHEDULER_APP = 'scheduler';
const CLAIM_WAIT = 90_000;
const BROWSER = new Set(['open', 'automation']);

const TEXTS = {
  it: {
    ok: name => `«${name}» è riuscita`,
    error: (name, why) => `«${name}» non è riuscita: ${why}`,
    admin: (who, name, what) => `${who}, amministratore, ${what} la tua operazione «${name}»`,
    did: { save: 'ha modificato', create: 'ha creato per te', remove: 'ha eliminato', on: 'ha riattivato', off: 'ha messo in pausa', run: 'ha eseguito', move: 'ha spostato' },
  },
  en: {
    ok: name => `«${name}» succeeded`,
    error: (name, why) => `«${name}» failed: ${why}`,
    admin: (who, name, what) => `${who}, an administrator, ${what} your operation «${name}»`,
    did: { save: 'changed', create: 'created for you', remove: 'deleted', on: 'turned on again', off: 'paused', run: 'ran', move: 'moved' },
  },
};

export class Schedules {
  #kernel;
  #claims = new Map();      // run id → { owner, resolve, claimed }
  #online = new Map();      // user id → open pages

  constructor(kernel) {
    this.#kernel = kernel;
    kernel.installer.onChange(id => this.#appChanged(id).catch(err => log.error(`Operazioni di ${id}`, err)));
  }

  get service() {
    return this.#kernel.service('scheduler');
  }

  /** The kernel is up: users that are gone lose their operations, then the clock starts. */
  async start() {
    const service = this.service;
    if (this.#kernel.multiUser) {
      const users = new Set((await this.#kernel.services.get('users')?.list() ?? []).map(u => u.id));
      const owners = new Set((await service.list({ kind: 'kernel' })).map(t => t.owner));
      for (const owner of owners) if (owner !== '*' && !users.has(owner)) await service.dropOwner(owner);
    }
    await service.start({
      rules,
      run: (task, run, signal) => this.#run(task, run, signal),
      notify: (task, run) => this.#notifyResult(task, run),
      changed: (owner, ids) => this.#tell(owner, 'schedule.change', { ids }),
      ran: run => this.#tell(run.owner, 'schedule.run', { task: run.task, run: run.id, state: run.state }),
    });
  }

  // ---------- Pages ----------

  /** An event stream of a user opened or closed (api/services.js): browser runs need one. */
  pageOpened(userId) { this.#online.set(userId, (this.#online.get(userId) ?? 0) + 1); }
  pageClosed(userId) {
    const n = (this.#online.get(userId) ?? 1) - 1;
    if (n > 0) this.#online.set(userId, n); else this.#online.delete(userId);
  }

  async #tell(owner, event, data) {
    const to = new Set(await this.#kernel.adminIds());
    if (owner !== '*') to.add(owner);
    for (const id of to) this.#kernel.events.emit('user', { owner: id, event, data });
  }

  // ---------- Checking and showing ----------

  /** The principal an operation runs as: its user, null for the system; throws when the user is gone. */
  async ownerPrincipal(owner) {
    if (owner === '*') return null;
    return await this.#kernel.userPrincipal(owner) ?? fail('not_found', 'L’utente di questa operazione non esiste più');
  }

  /** A task as it is saved, with `what` checked (secrets sealed); `old`: the task it replaces. */
  async prepare(principal, raw, old = null) {
    if (!raw || typeof raw !== 'object') fail('invalid', 'Operazione non valida');
    const owner = old?.owner ?? raw.owner ?? principal.id;
    const app = old ? old.app : raw.app ?? null;
    const what = await checkWhat(this.#kernel, {
      what: raw.what, old: old?.what ?? null, owner, app,
      ownerPrincipal: owner === '*' ? null : await this.ownerPrincipal(owner),
    });
    return { ...raw, owner, app, what };
  }

  /** A task as the pages see it: no secrets. */
  view(task) {
    return task && { ...task, what: publicWhat(task.what) };
  }

  /** Who did what to someone else's operation: they hear it from lilOS. */
  async tellOwner(principal, task, action) {
    if (principal?.kind !== 'user' || !task || task.owner === '*' || task.owner === principal.id) return;
    const target = await this.#kernel.userPrincipal(task.owner);
    if (!target) return;
    const t = await this.#texts(target);
    await this.#send(task.owner, { level: 'info', text: t.admin(principal.name || principal.username, task.name, t.did[action]), action: { entry: 'main', args: { task: task.id } } })
      .catch(err => log.warn(`Avviso al proprietario non mandato: ${err.message}`));
  }

  // ---------- Running ----------

  async #run(task, run, signal) {
    let principal;
    try {
      principal = await this.ownerPrincipal(task.owner);
    } catch (err) {
      // The user was removed: their operations go (not at the next restart)
      if (err?.code === 'not_found') this.service.dropOwner(task.owner).catch(e => log.warn(`Operazioni di un utente rimosso: ${e.message}`));
      throw err;
    }
    const what = task.what;
    const context = { kernel: this.#kernel, task, run, principal, signal, sender: () => this.#sender(task) };
    switch (what.type) {
      case 'notify': return runNotify(context);
      case 'service': return this.#runService(context);
      case 'copy': return runCopy(context);
      case 'web': return runWeb(context);
      case 'command': return runCommand(context);
      case 'open':
      case 'automation': return this.#dispatch(task, run, signal);
      default: fail('invalid', `Azione sconosciuta: ${what.type}`);
    }
  }

  async #runService({ task, run, principal, signal }) {
    const { app, entry, params } = task.what;
    const result = await this.#kernel.appServices.runScheduled(principal, app, entry, params ?? {}, { task, run, signal });
    if (typeof result === 'string') return { state: 'ok', text: result };
    if (result && typeof result === 'object') {
      const failed = result.ok === false || result.error;
      return { state: failed ? 'error' : 'ok', text: String(result.text ?? result.error ?? ''), log: typeof result.log === 'string' ? result.log : JSON.stringify(result, null, 2) };
    }
    return { state: 'ok', text: '' };
  }

  /** A browser run: to the owner's pages, or waiting when none is open (or none takes it in time). */
  #dispatch(task, run, signal) {
    if (task.owner === '*') fail('invalid', 'Il sistema non apre app: serve un utente');
    if (!this.#online.get(task.owner)) return { state: 'waiting', text: 'Aspetta che si apra lilOS' };
    return new Promise(resolve => {
      const claim = { owner: task.owner, claimed: false, resolve };
      const timer = setTimeout(() => {
        if (claim.claimed) return;
        this.#claims.delete(run.id);
        resolve({ state: 'waiting', text: 'Nessuna pagina di lilOS ha risposto' });
      }, CLAIM_WAIT);
      claim.done = outcome => { clearTimeout(timer); this.#claims.delete(run.id); resolve(outcome); };
      signal.addEventListener('abort', () => claim.done({ state: 'error', text: 'Annullata o tempo scaduto' }), { once: true });
      this.#claims.set(run.id, claim);
      this.#kernel.events.emit('user', { owner: task.owner, event: 'schedule.due', data: { task: task.id, run: run.id } });
    });
  }

  /**
   * A page takes a browser run (one only does it): the run being dispatched now, or one that
   * waited for lilOS. → { task, run, what } (what to do), or 'conflict' when another page has it.
   */
  async claim(principal, runId) {
    const live = this.#claims.get(runId);
    if (live) {
      if (live.owner !== principal.id) fail('not_found', 'Corsa inesistente');
      if (live.claimed) fail('conflict', 'Un’altra pagina la sta facendo');
      live.claimed = true;
    } else {
      const waiting = (await this.service.pending(principal)).find(r => r.id === runId);
      if (!waiting) fail('conflict', 'Corsa già fatta o scaduta');
      if (this.#claims.has(`w:${runId}`)) fail('conflict', 'Un’altra pagina la sta facendo');
      this.#claims.set(`w:${runId}`, { owner: principal.id, at: Date.now() });
      setTimeout(() => this.#claims.delete(`w:${runId}`), 10 * 60_000).unref?.();
    }
    const runs = await this.service.history(principal, { limit: 500 });
    const run = runs.find(r => r.id === runId) ?? fail('not_found', 'Corsa inesistente');
    const task = await this.service.get(principal, run.task) ?? fail('not_found', 'Operazione inesistente');
    return { task: this.view(task), run };
  }

  /** How a browser run went, from the page that did it (or the user skipped it). */
  async report(principal, runId, outcome) {
    const live = this.#claims.get(runId);
    if (live) {
      if (live.owner !== principal.id) fail('not_found', 'Corsa inesistente');
      live.done?.(outcome);
      return { ok: true };
    }
    this.#claims.delete(`w:${runId}`);
    return this.service.resolve(principal, runId, outcome);
  }

  // ---------- Telling the owner ----------

  async #texts(principal) {
    const code = principal ? await readUserKey(this.#kernel, principal, 'locale', 'it').catch(() => 'it') : 'it';
    return TEXTS[String(code).toLowerCase().startsWith('it') ? 'it' : 'en'];
  }

  /** Who a notification about an operation comes from: its app, the Pianificazione app, or lilOS. */
  async #sender(task) {
    const id = task.app ?? SCHEDULER_APP;
    if (await this.#kernel.installer.state(id)) {
      const pkg = (await this.#kernel.installer.list()).find(p => p.id === id);
      return { app: id, name: pkg?.manifest?.name ?? id };
    }
    return { system: true };
  }

  async #send(owner, notification, from = null) {
    if (!this.#kernel.services.has('notifications')) return;
    const sender = from ?? (await this.#sender({ app: null }));
    const to = owner === '*' ? await this.#kernel.adminIds() : [owner];
    // The click opens the Pianificazione app; from lilOS itself (no app) there is nothing to open
    const n = sender.system ? { ...notification, action: null } : notification;
    for (const id of to) await this.#kernel.service('notifications').send(id, { from: sender, ...n });
  }

  async #notifyResult(task, run) {
    if (!['ok', 'error'].includes(run.state)) return;
    const owner = task.owner === '*' ? null : await this.#kernel.userPrincipal(task.owner);
    const t = await this.#texts(owner);
    const text = run.state === 'ok' ? t.ok(task.name) : t.error(task.name, run.text || '—');
    // A reminder is the notification itself: «it succeeded» would only repeat it
    if (task.what.type === 'notify' && run.state === 'ok') return;
    await this.#send(task.owner, { level: run.state === 'ok' ? 'success' : 'error', text: text.slice(0, 300), action: { entry: 'main', args: { task: task.id, run: run.id } } }, await this.#sender({ app: null }));
  }

  // ---------- Apps ----------

  async #appChanged(id) {
    if (!id || await this.#kernel.installer.state(id)) return;
    const gone = await this.service.dropApp(id);
    if (gone.length) log.info(`${gone.length} operazioni di ${id} eliminate con l’app`);
  }
}
