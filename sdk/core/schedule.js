import { Emitter } from './events.js';
import { kernel } from './kernel.js';
import { locale } from './locale.js';
import * as rules from './scheduleRules.js';

/**
 * The scheduler: operations at a date and time or repeated, done by the kernel also with lilOS
 * closed (its 'scheduler' module, required: every lilOS has it). Needs the kernel.
 *
 *   schedule.list({ owner?, app? }) → [task]           the user's (an admin: everybody's and the system's)
 *   schedule.tasks()  → [task + recurrence]            the same, with the rule as a calendar shows it
 *   schedule.get(id) / create(task) / update(id, task) / remove(id)
 *   schedule.enable(id, on) / run(id) → run / cancel(runId)
 *   schedule.move(id, { at, to, scope: 'this' | 'all' })  only when it runs: one time, or the whole rule
 *   schedule.history({ task?, owner?, state?, limit?, before? }) → [run]   newest first
 *   schedule.occurrences({ from, to, owner?, task? }) → { items, series }   ms; at most 62 days
 *       item    { task, name, at, end, state: 'planned' | 'ok' | 'error' | 'skipped' | 'waiting' | …, run, type, owner, app }
 *       series  { task, name, from, to, count, every (ms), type, owner, app }   the ones more often than every 30 min
 *   schedule.catalog() → { services, hosts, users, runtime }   what the editor offers
 *   schedule.pending() / claim(runId) / report(runId, outcome)  browser runs (the system does them)
 *
 *   task  { id, owner, app, name, enabled, when, what, options, next, last, created, modified, by, running }
 *   when  a rule of scheduleRules.js; what  see the kernel's schedule/what.js
 *
 * The rules, here in the page (no kernel needed): schedule.rules (checkWhen, nextAfter, between,
 * gap, toRrule, toCron, fromCron, moveWhen, localText…), describe(when, lang?) in words,
 * recurrence(task, lang?) → { text, rrule, exdate, rdate, tz, start, end, count } for calendars.
 *
 * Events: 'change' { ids } — operations changed (also in other pages, or by an admin);
 *         'run' { task, run, state } — a run started or ended; 'due' { task, run } — a browser
 *         run to do now (the system's runner takes it). The system tells it what the kernel streams
 *         (received(event, data)).
 *
 * forApp(id) gives an app's copy: it sees and changes only the operations it made (the kernel
 * checks it too); lilOS gives it to apps with the permission `schedule` (read: `schedule.read`,
 * move: `schedule.move`).
 */
const query = params => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

class Schedule extends Emitter {
  #app;
  rules = rules;

  constructor(app = null) {
    super();
    this.#app = app;
  }

  get available() { return kernel.connected; }

  #body(body = {}) { return this.#app ? { ...body, app: this.#app } : body; }
  #q(params = {}) { return query(this.#app ? { ...params, app: this.#app } : params); }

  async list({ owner, app } = {}) {
    return (await kernel.request('GET', `/schedule${this.#q({ owner, app })}`)).tasks;
  }

  /** The operations with `recurrence` (the rule in words and as RRULE), in the system's language. */
  async tasks(options) {
    return (await this.list(options)).map(t => ({ ...t, recurrence: this.recurrence(t) }));
  }

  /** { admin, tasks } in one request. */
  overview() { return kernel.request('GET', `/schedule${this.#q()}`); }

  get(id) { return kernel.request('GET', `/schedule/${encodeURIComponent(id)}${this.#q()}`); }

  async create(task) {
    const out = await kernel.request('POST', '/schedule', this.#body(task));
    this.emit('change', { ids: [out.id] });
    return out;
  }

  async update(id, task) {
    const out = await kernel.request('PUT', `/schedule/${encodeURIComponent(id)}`, this.#body(task));
    this.emit('change', { ids: [id] });
    return out;
  }

  async remove(id) {
    await kernel.request('DELETE', `/schedule/${encodeURIComponent(id)}${this.#q()}`);
    this.emit('change', { ids: [id] });
  }

  async enable(id, on) {
    const out = await kernel.request('POST', `/schedule/${encodeURIComponent(id)}/enable`, this.#body({ on: !!on }));
    this.emit('change', { ids: [id] });
    return out;
  }

  run(id) { return kernel.request('POST', `/schedule/${encodeURIComponent(id)}/run`, this.#body()); }

  async move(id, { at, to, scope = 'this' }) {
    const out = await kernel.request('POST', `/schedule/${encodeURIComponent(id)}/move`, this.#body({ at, to, scope }));
    this.emit('change', { ids: [id] });
    return out;
  }

  cancel(runId) { return kernel.request('POST', `/schedule-runs/${encodeURIComponent(runId)}/cancel`, {}); }

  history({ task, owner, state, limit, before } = {}) {
    return kernel.request('GET', `/schedule-history${this.#q({ task, owner, state, limit, before })}`);
  }

  occurrences({ from, to, owner, task } = {}) {
    return kernel.request('GET', `/schedule-occurrences${this.#q({ from: Math.floor(from), to: Math.ceil(to), owner, task })}`);
  }

  catalog() { return kernel.request('GET', '/schedule-catalog'); }

  pending() { return kernel.request('GET', '/schedule-pending'); }
  claim(runId) { return kernel.request('POST', `/schedule-runs/${encodeURIComponent(runId)}/claim`, {}); }
  report(runId, outcome) { return kernel.request('POST', `/schedule-runs/${encodeURIComponent(runId)}/result`, outcome); }

  /** The rule in words ('Ogni giorno alle 02:00'), in `lang` or the system's language. */
  describe(when, lang = locale.code) { return rules.describe(when, lang); }

  /** What a calendar needs of a task's rule. */
  recurrence(task, lang = locale.code) {
    const w = task.when;
    const ical = rules.toRrule(w);
    return {
      text: rules.describe(w, lang), rrule: ical.rrule, exdate: ical.exdate, rdate: ical.rdate,
      tz: w.tz, start: w.once ?? w.start, end: w.end ?? null, count: w.count ?? null,
    };
  }

  /** The kernel's stream, as the system passes it on. */
  received(event, data) {
    if (event === 'schedule.change') this.emit('change', { ids: Array.isArray(data?.ids) ? data.ids : [] });
    else if (event === 'schedule.run') this.emit('run', data ?? {});
    else if (event === 'schedule.due') this.emit('due', data ?? {});
  }

  /** The copy for an app: only its own operations (see the top). */
  forApp(id) {
    const scoped = new Schedule(id);
    const relay = name => e => scoped.emit(name, e);
    this.on('change', relay('change'));
    this.on('run', relay('run'));
    return scoped;
  }
}

export const schedule = new Schedule();
