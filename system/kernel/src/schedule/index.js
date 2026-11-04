import { fail } from '../errors.js';
import { logger } from '../log.js';
import { Text, defineStrings, localize } from '../strings.js';
import * as rules from '../../../../sdk/core/scheduleRules.js';
import { checkWhat, publicWhat } from './what.js';
import { runNotify } from './notify.js';
import { runCopy } from './copy.js';
import { runWeb } from './web.js';
import { runCollectionTask } from './collection.js';
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

const ACTIONS = new Set(['save', 'create', 'remove', 'on', 'off', 'run', 'move']);

const { t } = defineStrings('lilos:kernel.schedule', { en: { strings: {
  ok: '«{name}» succeeded',
  error: '«{name}» failed: {why}',
  'admin.save': '{who}, an administrator, changed your operation «{name}»',
  'admin.create': '{who}, an administrator, created the operation «{name}» for you',
  'admin.remove': '{who}, an administrator, deleted your operation «{name}»',
  'admin.on': '{who}, an administrator, turned your operation «{name}» on again',
  'admin.off': '{who}, an administrator, paused your operation «{name}»',
  'admin.run': '{who}, an administrator, ran your operation «{name}»',
  'admin.move': '{who}, an administrator, moved your operation «{name}»',
  userGone: 'The user of this operation no longer exists',
  invalid: 'Operation not valid',
  unknownAction: 'Unknown action: {type}',
  systemNoApps: 'The system does not open apps: a user is needed',
  waiting: 'Waiting for lilOS to be opened',
  noPage: 'No page of lilOS answered',
  cancelled: 'Cancelled or timed out',
  runNotFound: 'Run not found',
  runTaken: 'Another page is doing it',
  runGone: 'Run already done or expired',
  taskNotFound: 'Operation not found',
} } });

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
    return await this.#kernel.userPrincipal(owner) ?? fail('not_found', t('userGone'));
  }

  /** A task as it is saved, with `what` checked (secrets sealed); `old`: the task it replaces. */
  async prepare(principal, raw, old = null) {
    if (!raw || typeof raw !== 'object') fail('invalid', t('invalid'));
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
    if (!target || !ACTIONS.has(action)) return;
    await this.#send(task.owner, { level: 'info', text: t(`admin.${action}`, { who: principal.name || principal.username, name: task.name }), action: { entry: 'main', args: { task: task.id } } })
      .catch(err => log.warn(`Avviso al proprietario non mandato: ${err.message}`));
  }

  // ---------- Running ----------

  /**
   * Runs an operation. What it says (its outcome, its log, why it failed) is kept in the history as
   * text: in the language of its owner (of the first admin, for the system's).
   */
  async #run(task, run, signal) {
    const locale = await this.#locale(task.owner);
    try {
      return await this.#runAs(task, run, signal, text => localize(text, locale));
    } catch (err) {
      if (err?.text instanceof Text) err.message = localize(err.text, locale);
      throw err;
    }
  }

  async #runAs(task, run, signal, say) {
    let principal;
    try {
      principal = await this.ownerPrincipal(task.owner);
    } catch (err) {
      // The user was removed: their operations go (not at the next restart)
      if (err?.code === 'not_found') this.service.dropOwner(task.owner).catch(e => log.warn(`Operazioni di un utente rimosso: ${e.message}`));
      throw err;
    }
    const what = task.what;
    const context = { kernel: this.#kernel, task, run, principal, signal, say, sender: () => this.#sender(task) };
    switch (what.type) {
      case 'notify': return runNotify(context);
      case 'service': return this.#runService(context);
      case 'copy': return runCopy(context);
      case 'web': return runWeb(context);
      case 'command': return runCommand(context);
      case 'collection': return runCollectionTask(context);
      case 'open':
      case 'automation': return this.#dispatch(task, run, signal, say);
      default: fail('invalid', t('unknownAction', { type: what.type }));
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
  #dispatch(task, run, signal, say) {
    if (task.owner === '*') fail('invalid', t('systemNoApps'));
    if (!this.#online.get(task.owner)) return { state: 'waiting', text: say(t('waiting')) };
    return new Promise(resolve => {
      const claim = { owner: task.owner, claimed: false, resolve };
      const timer = setTimeout(() => {
        if (claim.claimed) return;
        this.#claims.delete(run.id);
        resolve({ state: 'waiting', text: say(t('noPage')) });
      }, CLAIM_WAIT);
      claim.done = outcome => { clearTimeout(timer); this.#claims.delete(run.id); resolve(outcome); };
      signal.addEventListener('abort', () => claim.done({ state: 'error', text: say(t('cancelled')) }), { once: true });
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
      if (live.owner !== principal.id) fail('not_found', t('runNotFound'));
      if (live.claimed) fail('conflict', t('runTaken'));
      live.claimed = true;
    } else {
      const waiting = (await this.service.pending(principal)).find(r => r.id === runId);
      if (!waiting) fail('conflict', t('runGone'));
      if (this.#claims.has(`w:${runId}`)) fail('conflict', t('runTaken'));
      this.#claims.set(`w:${runId}`, { owner: principal.id, at: Date.now() });
      setTimeout(() => this.#claims.delete(`w:${runId}`), 10 * 60_000).unref?.();
    }
    const runs = await this.service.history(principal, { limit: 500 });
    const run = runs.find(r => r.id === runId) ?? fail('not_found', t('runNotFound'));
    const task = await this.service.get(principal, run.task) ?? fail('not_found', t('taskNotFound'));
    return { task: this.view(task), run };
  }

  /** How a browser run went, from the page that did it (or the user skipped it). */
  async report(principal, runId, outcome) {
    const live = this.#claims.get(runId);
    if (live) {
      if (live.owner !== principal.id) fail('not_found', t('runNotFound'));
      live.done?.(outcome);
      return { ok: true };
    }
    this.#claims.delete(`w:${runId}`);
    return this.service.resolve(principal, runId, outcome);
  }

  // ---------- Telling the owner ----------

  /** The language of an operation's owner; for the system's, the first admin's. */
  async #locale(owner) {
    const id = owner === '*' ? (await this.#kernel.adminIds().catch(() => []))[0] : owner;
    return id ? this.#kernel.userLocale(id).catch(() => 'en') : 'en';
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
    for (const id of to) {
      // The kernel's words in the language of each one who gets them
      const text = n.text instanceof Text ? localize(n.text, await this.#kernel.userLocale(id).catch(() => 'en')).slice(0, 300) : n.text;
      await this.#kernel.service('notifications').send(id, { from: sender, ...n, text });
    }
  }

  async #notifyResult(task, run) {
    if (!['ok', 'error'].includes(run.state)) return;
    const text = run.state === 'ok' ? t('ok', { name: task.name }) : t('error', { name: task.name, why: run.text || '—' });
    // A reminder is the notification itself: «it succeeded» would only repeat it
    if (task.what.type === 'notify' && run.state === 'ok') return;
    await this.#send(task.owner, { level: run.state === 'ok' ? 'success' : 'error', text, action: { entry: 'main', args: { task: task.id, run: run.id } } }, await this.#sender({ app: null }));
  }

  // ---------- Apps ----------

  async #appChanged(id) {
    if (!id || await this.#kernel.installer.state(id)) return;
    const gone = await this.service.dropApp(id);
    if (gone.length) log.info(`${gone.length} operazioni di ${id} eliminate con l’app`);
  }
}
