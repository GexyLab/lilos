import { randomBytes } from 'node:crypto';
import { needKernel } from './lib/shared/kernel.js';

/**
 * The 'scheduler' service (see the kernel's services.js): the operations of the users and of the
 * system, the clock that starts them and their history. A required module: the kernel does not
 * start without it, and puts it back when it is missing.
 *
 * What an operation does (`what`) is the kernel's: it checks it before save() and runs it when
 * host.run() is called; here it is kept as it comes. When (`when`) is worked out with the rules the
 * kernel gives in start(host) (the SDK's scheduleRules.js).
 *
 *   scheduler.json  { version: 1, tasks: [task] }
 *   history.json    { version: 1, runs: [run] }         newest first, `historyPerTask` per operation
 *
 *   task  { id, owner: <user id> | '*' (the system), app: <app id> | null (made by that app), name,
 *           enabled, when, what, options, created, modified, by: { id, name } | null (who saved it last),
 *           cursor (ms: the times up to here are dealt with), fired (how many times it ran by the clock),
 *           next (ms | null), last: { run, at, state } | null, retry: { at, attempt, due } | null }
 *   options  { missed: 'once' | 'skip', overlap: 'skip' | 'queue' | 'parallel', timeoutMin, retries,
 *              retryMin, notify: 'error' | 'always' | 'never', ask (browser operations: ask before
 *              running one that waited for lilOS to be open) }
 *   run   { id, task, owner, app, name, type, due, at, end, reason: 'time' | 'catchup' | 'manual' | 'retry',
 *           attempt, by, state: 'queued' | 'running' | 'waiting' | 'ok' | 'error' | 'skipped' | 'cancelled',
 *           text, log, expires (waiting ones) }
 *
 * Who: a user sees and changes their own operations; an admin those of everybody and the system's
 * (the kernel tells the owner); the kernel (principal { kind: 'kernel' }) everything.
 *
 * The clock: one timer for the nearest time, and a look every 30 s at the real time (the computer
 * slept, the time was changed). A time missed while the kernel was off (or the computer asleep) runs
 * once when it comes back, within `catchUpHours`, unless the operation says 'skip'; never more than once.
 */
const ID = /^[\w-]{1,64}$/;
const APP = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const TYPE = /^[a-z][a-z-]{1,30}$/;
const TICK = 30_000;
const LATE = 120_000;
const MAX_NAME = 120;
const MAX_WHAT = 32 << 10;
const MAX_TEXT = 500;
const MAX_IDS = 500;
const MAX_RANGE = 62 * 86_400_000;
const MAX_ITEMS = 5000;
const DENSE = 30 * 60_000;
const DENSE_COUNT = 2000;
const SAVE_HISTORY = 2000;
const OPTION_DEFAULTS = { missed: 'once', overlap: 'skip', timeoutMin: 60, retries: 0, retryMin: 5, notify: 'error', ask: true };

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const newId = () => randomBytes(9).toString('base64url');
const isAdmin = p => p?.kind === 'kernel' || (p?.kind === 'user' && p.role === 'admin');
const num = (v, min, max, fallback) => (Number.isInteger(v) && v >= min && v <= max ? v : fallback);
const clip = (text, n) => (typeof text === 'string' ? text.slice(0, n) : '');

function cleanOptions(raw = {}) {
  const o = plain(raw) ? raw : {};
  return {
    missed: o.missed === 'skip' ? 'skip' : 'once',
    overlap: ['skip', 'queue', 'parallel'].includes(o.overlap) ? o.overlap : OPTION_DEFAULTS.overlap,
    timeoutMin: num(o.timeoutMin, 1, 1440, OPTION_DEFAULTS.timeoutMin),
    retries: num(o.retries, 0, 5, OPTION_DEFAULTS.retries),
    retryMin: num(o.retryMin, 1, 1440, OPTION_DEFAULTS.retryMin),
    notify: ['error', 'always', 'never'].includes(o.notify) ? o.notify : OPTION_DEFAULTS.notify,
    ask: o.ask !== false,
  };
}

let ctx, tasks, history, host = null, rules = null;
let timer = null, ticker = null, historyTimer = null, stopped = false;
const running = new Map();     // run id → { run, controller }
const queued = [];             // runs waiting for a free place (maxParallel) or for the one before (overlap 'queue')

const limits = () => ({
  maxTasksPerUser: num(Number(ctx.config.maxTasksPerUser), 1, 1000, 100),
  minIntervalMinutes: num(Number(ctx.config.minIntervalMinutes), 1, 1440, 1),
  maxParallel: num(Number(ctx.config.maxParallel), 1, 32, 4),
  historyPerTask: num(Number(ctx.config.historyPerTask), 5, 500, 50),
  catchUpHours: num(Number(ctx.config.catchUpHours), 1, 168, 12),
  outputKb: num(Number(ctx.config.outputKb), 1, 256, 16),
  maxParallelPerUser: num(Number(ctx.config.maxParallelPerUser), 1, 32, 2),
  maxQueued: 200,
  historyMb: num(Number(ctx.config.historyMb), 1, 1024, 64),
  maxTasksPerApp: 20,
  appMinIntervalMinutes: 15,
  maxExtra: 50,
});

// ---------- Who sees what ----------

const sees = (principal, task) => isAdmin(principal) || (principal?.kind === 'user' && task.owner === principal.id);
const who = principal => (principal?.kind === 'user' ? { id: principal.id, name: String(principal.name ?? principal.username ?? principal.id).slice(0, 80) } : null);
const signedIn = principal => (principal?.kind === 'user' || principal?.kind === 'kernel' ? principal : ctx.fail('unauthorized', 'Accesso richiesto'));

async function find(principal, id) {
  if (typeof id !== 'string' || !ID.test(id)) ctx.fail('invalid', 'Operazione non valida');
  const task = (await tasks.read()).tasks.find(t => t.id === id);
  if (!task || !sees(principal, task)) ctx.fail('not_found', 'Operazione inesistente');
  return task;
}

const view = task => {
  const { cursor, ...rest } = task;
  return JSON.parse(JSON.stringify({ ...rest, running: [...running.values()].filter(r => r.run.task === task.id).length }));
};
const runView = run => JSON.parse(JSON.stringify(run));

// ---------- The clock ----------

/** The next time of a task after `after`, or null (finished, or its count reached). */
function nextOf(task, after) {
  if (task.when.count && task.fired >= task.when.count) return null;
  try {
    return rules.nextAfter(task.when, after);
  } catch (err) {
    ctx.log.warn(`${task.id}: regola non calcolabile (${err.message})`);
    return null;
  }
}

function arm() {
  clearTimeout(timer);
  if (stopped || !host) return;
  let soonest = Infinity;
  for (const t of tasks.current?.tasks ?? []) {
    if (!t.enabled) continue;
    if (Number.isSafeInteger(t.next)) soonest = Math.min(soonest, t.next);
    if (t.retry) soonest = Math.min(soonest, t.retry.at);
  }
  const wait = Number.isFinite(soonest) ? Math.max(0, Math.min(soonest - Date.now(), TICK)) : TICK;
  timer = setTimeout(() => tick().catch(err => ctx.log.error('Pianificazione', err)), wait);
}

/** Every time due: the clock's, the retries'; the waiting runs that expired. */
async function tick() {
  if (stopped || !host) return;
  const now = Date.now();
  const data = await tasks.read();
  const { catchUpHours } = limits();
  let changed = false;
  for (const task of data.tasks) {
    if (task.retry && task.retry.at <= now && task.enabled) {
      const { attempt, due } = task.retry;
      task.retry = null;
      changed = true;
      start(task, { due, reason: 'retry', attempt });
    }
    if (!task.enabled || task.next === null || task.next > now) continue;
    const due = task.next;
    const late = now - due > LATE;
    task.cursor = due;
    task.fired += 1;
    task.next = nextOf(task, Math.max(due, now));
    changed = true;
    if (!late) start(task, { due, reason: 'time' });
    else if (task.options.missed === 'once' && now - due <= catchUpHours * 3600_000) start(task, { due, reason: 'catchup' });
    else ctx.log.info(`${task.id}: volta delle ${new Date(due).toISOString()} saltata (kernel spento)`);
  }
  for (const r of history.peekWaiting()) {
    if (r.expires <= now) {
      Object.assign(r, { state: 'skipped', end: now, text: 'lilOS non era aperto' });
      changed = true;
      host.ran(r);
      history.touch();
    }
  }
  if (changed) await tasks.save();
  arm();
}

// ---------- Runs ----------

function newRun(task, { due, reason, attempt = 1, by = null }) {
  return {
    id: newId(), task: task.id, owner: task.owner, app: task.app, name: task.name, type: task.what?.type ?? null,
    due: due ?? Date.now(), at: null, end: null, reason, attempt, by, state: 'queued', text: '', log: '', expires: null,
  };
}

function start(task, spec) {
  const run = newRun(task, spec);
  const mine = [...running.values()].filter(r => r.run.task === task.id);
  if (mine.length && spec.reason !== 'manual') {
    if (task.options.overlap === 'skip') return record(task, Object.assign(run, { state: 'skipped', at: Date.now(), end: Date.now(), text: 'La volta prima era ancora in corso' }));
    if (task.options.overlap === 'queue') { queued.push(run); history.add(run); host.ran(run); return run; }
  }
  if (!hasSlot(task)) {
    if (queued.length >= limits().maxQueued) return record(task, Object.assign(run, { state: 'skipped', at: Date.now(), end: Date.now(), text: 'Troppe operazioni in attesa di partire' }));
    queued.push(run);
    history.add(run);
    host.ran(run);
    return run;
  }
  launch(task, run);
  return run;
}

/** A free place: under maxParallel in all, and under maxParallelPerUser for its owner (the system counts as one). */
function hasSlot(task) {
  const { maxParallel, maxParallelPerUser } = limits();
  if (running.size >= maxParallel) return false;
  return [...running.values()].filter(r => r.run.owner === task.owner).length < maxParallelPerUser;
}

function launch(task, run) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), task.options.timeoutMin * 60_000);
  running.set(run.id, { run, controller });
  Object.assign(run, { state: 'running', at: Date.now() });
  if (!history.has(run.id)) history.add(run);
  host.ran(run);
  task.last = { run: run.id, at: run.at, state: 'running' };
  const { outputKb } = limits();
  // A run that never answers still ends at its time limit (or when cancelled): its place is freed
  const aborted = new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason ?? new Error('timeout')), { once: true }));
  Promise.race([Promise.resolve().then(() => host.run(JSON.parse(JSON.stringify(task)), runView(run), controller.signal)), aborted])
    .then(result => {
      const r = plain(result) ? result : {};
      const state = ['ok', 'error', 'waiting', 'skipped'].includes(r.state) ? r.state : 'ok';
      return { state, text: clip(r.text, MAX_TEXT), log: clip(r.log, outputKb << 10) };
    }, err => {
      const aborted = controller.signal.aborted;
      const why = aborted ? controller.signal.reason : err;
      if (aborted && why?.message === 'cancelled') return { state: 'cancelled', text: 'Annullata', log: '' };
      if (aborted) return { state: 'error', text: `Tempo scaduto: più di ${task.options.timeoutMin} minuti`, log: '' };
      return { state: 'error', text: clip(String(err?.message ?? err), MAX_TEXT), log: clip(err?.log, outputKb << 10) };
    })
    .then(async outcome => {
      clearTimeout(timeout);
      running.delete(run.id);
      Object.assign(run, outcome, { end: outcome.state === 'waiting' ? null : Date.now() });
      if (outcome.state === 'waiting') run.expires = run.due + limits().catchUpHours * 3600_000;
      await finished(run);
      drain();
    })
    .catch(err => ctx.log.error('Fine della corsa', err));
}

/** A run that will not start: kept in the history as it is. */
function record(task, run) {
  history.add(run);
  task.last = { run: run.id, at: run.at, state: run.state };
  host.ran(run);
  tasks.save().catch(() => {});
  return run;
}

/** After a run: its task's last, a retry, the notification. */
async function finished(run) {
  const data = await tasks.read();
  const task = data.tasks.find(t => t.id === run.task);
  history.touch();
  host.ran(run);
  if (!task) return;
  task.last = { run: run.id, at: run.at, state: run.state };
  const retry = run.state === 'error' && run.attempt <= task.options.retries && task.enabled;
  if (retry) task.retry = { at: Date.now() + task.options.retryMin * 60_000, attempt: run.attempt + 1, due: run.due };
  await tasks.save();
  host.changed(task.owner, [task.id]);
  const tell = task.options.notify === 'always' ? ['ok', 'error'].includes(run.state)
    : task.options.notify === 'error' ? run.state === 'error' && !retry : false;
  if (tell) await Promise.resolve(host.notify(view(task), runView(run))).catch(err => ctx.log.warn(`Notifica non mandata: ${err.message}`));
  arm();
}

/** Starts what was waiting for a free place. */
function drain() {
  const list = tasks.current?.tasks ?? [];
  for (;;) {
    if (running.size >= limits().maxParallel) return;
    const at = queued.findIndex(run => {
      const task = list.find(t => t.id === run.task);
      if (!task) return true;   // gone: dropped below
      if (task.options.overlap === 'queue' && [...running.values()].some(r => r.run.task === task.id)) return false;
      return hasSlot(task);
    });
    if (at < 0) return;
    const [run] = queued.splice(at, 1);
    const task = list.find(t => t.id === run.task);
    if (task) launch(task, run);
  }
}

// ---------- History ----------

function historyStore(file) {
  const store = ctx.jsonStore(file, { invalid: 'empty', clean: raw => ({ version: 1, runs: (Array.isArray(raw?.runs) ? raw.runs : []).filter(r => plain(r) && ID.test(r.id ?? '') && ID.test(r.task ?? '')) }) });
  let index = null;
  const trim = data => {
    const per = new Map();
    const { historyPerTask } = limits();
    data.runs = data.runs.filter(r => {
      const n = (per.get(r.task) ?? 0) + 1;
      per.set(r.task, n);
      return n <= historyPerTask || r.state === 'running' || r.state === 'waiting' || r.state === 'queued';
    });
    // The outputs together stay under historyMb: the oldest lose theirs first (newest come first)
    let total = 0;
    const cap = limits().historyMb << 20;
    for (const r of data.runs) {
      total += r.log?.length ?? 0;
      if (total > cap && r.log) r.log = '';
    }
    index = new Map(data.runs.map(r => [r.id, r]));
  };
  const api = {
    data: null,
    async load() {
      api.data = await store.read();
      // A run the kernel was doing when it stopped did not end
      for (const r of api.data.runs) if (r.state === 'running' || r.state === 'queued') Object.assign(r, { state: 'error', end: r.end ?? Date.now(), text: 'Il kernel si è fermato durante la corsa' });
      trim(api.data);
    },
    has: id => index.has(id),
    get: id => index.get(id) ?? null,
    add(run) {
      api.data.runs.unshift(run);
      index.set(run.id, run);
      api.touch();
    },
    peekWaiting: () => api.data.runs.filter(r => r.state === 'waiting'),
    touch() {
      if (historyTimer) return;
      historyTimer = setTimeout(() => {
        historyTimer = null;
        trim(api.data);
        store.save().catch(err => ctx.log.error('Storico non salvato', err));
      }, SAVE_HISTORY);
    },
    flush() {
      clearTimeout(historyTimer);
      historyTimer = null;
      trim(api.data);
      return store.save();
    },
    removeTasks(ids) {
      api.data.runs = api.data.runs.filter(r => !ids.has(r.task));
      trim(api.data);
      api.touch();
    },
  };
  return api;
}

// ---------- Checking what comes in ----------

function checkTask(principal, raw, old) {
  if (!plain(raw)) ctx.fail('invalid', 'Operazione non valida');
  const name = typeof raw.name === 'string' ? raw.name.replace(/\s+/g, ' ').trim() : '';
  if (!name) ctx.fail('invalid', 'L’operazione non ha un nome');
  let owner = old?.owner ?? (raw.owner ?? (principal.kind === 'user' ? principal.id : '*'));
  if (raw.owner !== undefined && old && raw.owner !== old.owner) ctx.fail('invalid', 'Il proprietario di un’operazione non cambia');
  if (owner !== '*' && !ID.test(owner)) ctx.fail('invalid', 'Proprietario non valido');
  if (!isAdmin(principal) && owner !== principal.id) ctx.fail('forbidden', 'Solo un amministratore pianifica per altri o per il sistema');
  const app = old ? old.app : raw.app ?? null;
  if (app !== null && !APP.test(app)) ctx.fail('invalid', 'App non valida');
  let when;
  try {
    when = rules.checkWhen(raw.when);
  } catch (err) {
    ctx.fail('invalid', err instanceof rules.RuleError ? err.message : 'Regola non valida');
  }
  const { minIntervalMinutes: least, appMinIntervalMinutes, maxExtra } = limits();
  // An app's operations: not more often than every 15 minutes
  const minIntervalMinutes = app ? Math.max(least, appMinIntervalMinutes) : least;
  if (rules.gap(when) < minIntervalMinutes * 60_000) ctx.fail('invalid', `Troppo spesso: al massimo una volta ogni ${minIntervalMinutes === 1 ? 'minuto' : `${minIntervalMinutes} minuti`}`);
  // Times added by hand (moved occurrences) follow the same rule, and are few
  const extra = when.extra ?? [];
  if (extra.length > maxExtra) ctx.fail('invalid', `Troppi orari spostati (al massimo ${maxExtra})`);
  for (let i = 1; i < extra.length; i++) if (extra[i] - extra[i - 1] < minIntervalMinutes * 60_000) ctx.fail('invalid', 'Orari spostati troppo vicini tra loro');
  if (!plain(raw.what) || !TYPE.test(raw.what.type ?? '')) ctx.fail('invalid', 'Azione non valida');
  const what = JSON.parse(JSON.stringify(raw.what));
  if (JSON.stringify(what).length > MAX_WHAT) ctx.fail('too_large', 'Azione troppo grande');
  return { name: name.slice(0, MAX_NAME), owner, app, enabled: raw.enabled !== false, when, what, options: cleanOptions(raw.options) };
}

const sameWhen = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- The service ----------

const service = {
  /** The kernel is ready: the clock starts. host: see services.js. */
  async start(h) {
    host = h;
    rules = h.rules;
    const data = await tasks.read();
    const now = Date.now();
    for (const t of data.tasks) {
      // An old next time (kernel off): tick() decides whether it runs once
      if (t.enabled && t.next === null && !t.when.once) t.next = nextOf(t, Math.max(t.cursor, now));
    }
    await tasks.save();
    ticker = setInterval(() => tick().catch(err => ctx.log.error('Pianificazione', err)), TICK);
    await tick();
  },

  async list(principal, { owner = null, app = null } = {}) {
    signedIn(principal);
    return (await tasks.read()).tasks
      .filter(t => sees(principal, t) && (owner === null || t.owner === owner) && (app === null || t.app === app))
      .map(view);
  },

  async get(principal, id) {
    signedIn(principal);
    try { return view(await find(principal, id)); } catch (err) { if (err.code === 'not_found') return null; throw err; }
  },

  async save(principal, raw) {
    signedIn(principal);
    const data = await tasks.read();
    const old = raw?.id !== undefined && raw.id !== null ? await find(principal, raw.id) : null;
    const clean = checkTask(principal, raw, old);
    const now = Date.now();
    if (!old && clean.app && data.tasks.filter(t => t.owner === clean.owner && t.app === clean.app).length >= limits().maxTasksPerApp) {
      ctx.fail('invalid', `Al massimo ${limits().maxTasksPerApp} operazioni per ogni app`);
    }
    if (!old && data.tasks.filter(t => t.owner === clean.owner).length >= limits().maxTasksPerUser) {
      ctx.fail('invalid', `Al massimo ${limits().maxTasksPerUser} operazioni per utente`);
    }
    let task;
    if (old) {
      const fresh = !sameWhen(old.when, clean.when);
      task = Object.assign(old, clean, { modified: now, by: who(principal) });
      if (fresh) Object.assign(task, { cursor: now, fired: 0, retry: null });
      task.next = task.enabled ? nextOf(task, Math.max(task.cursor, now)) : null;
    } else {
      task = { id: newId(), ...clean, created: now, modified: now, by: who(principal), cursor: now, fired: 0, next: null, last: null, retry: null };
      task.next = task.enabled ? nextOf(task, now) : null;
      data.tasks.push(task);
    }
    await tasks.save();
    host?.changed(task.owner, [task.id]);
    arm();
    return view(task);
  },

  async remove(principal, ids) {
    signedIn(principal);
    if (!Array.isArray(ids) || !ids.length || ids.length > MAX_IDS) ctx.fail('invalid', 'Operazioni non valide');
    const gone = [];
    for (const id of ids) gone.push(await find(principal, id));
    const set = new Set(gone.map(t => t.id));
    await dropTasks(set);
    return gone.map(t => t.id);
  },

  async setEnabled(principal, id, on) {
    signedIn(principal);
    const task = await find(principal, id);
    if (typeof on !== 'boolean') ctx.fail('invalid', 'on deve essere true o false');
    const now = Date.now();
    task.enabled = on;
    task.modified = now;
    task.by = who(principal);
    // Back on: from now (what was missed while it was off is not made up)
    if (on) task.cursor = Math.max(task.cursor, now);
    task.next = on ? nextOf(task, task.cursor) : null;
    if (!on) task.retry = null;
    await tasks.save();
    host?.changed(task.owner, [task.id]);
    arm();
    return view(task);
  },

  async runNow(principal, id) {
    signedIn(principal);
    const task = await find(principal, id);
    if (queued.some(r => r.task === task.id && r.reason === 'manual')) ctx.fail('conflict', 'È già in attesa di partire');
    const run = start(task, { due: Date.now(), reason: 'manual', by: who(principal) });
    await tasks.save();
    return runView(run);
  },

  async cancel(principal, runId) {
    signedIn(principal);
    const run = history.get(runId);
    if (!run) ctx.fail('not_found', 'Corsa inesistente');
    await find(principal, run.task);
    const live = running.get(runId);
    if (live) live.controller.abort(new Error('cancelled'));
    else if (run.state === 'queued' || run.state === 'waiting') {
      const at = queued.indexOf(run);
      if (at >= 0) queued.splice(at, 1);
      Object.assign(run, { state: 'cancelled', end: Date.now(), text: 'Annullata' });
      history.touch();
      host.ran(run);
    }
    return runView(run);
  },

  async history(principal, { task = null, owner = null, limit = 100, before = null, state = null } = {}) {
    signedIn(principal);
    const visible = new Map((await tasks.read()).tasks.map(t => [t.id, t]));
    const n = num(limit, 1, 500, 100);
    const out = [];
    for (const r of history.data.runs) {
      if (task && r.task !== task) continue;
      if (owner && r.owner !== owner) continue;
      if (state && r.state !== state) continue;
      if (before && (r.at ?? r.due) >= before) continue;
      const t = visible.get(r.task);
      if (!(t ? sees(principal, t) : isAdmin(principal) || r.owner === principal.id)) continue;
      out.push(runView(r));
      if (out.length >= n) break;
    }
    return out;
  },

  /** The runs of `principal`'s browser operations that wait for lilOS to be open. */
  async pending(principal) {
    signedIn(principal);
    return history.peekWaiting().filter(r => r.owner === principal.id).map(runView);
  },

  /** The end of a browser run (lilOS did it, or the user skipped it): { state: 'ok' | 'error' | 'skipped', text, log }. */
  async resolve(principal, runId, outcome) {
    signedIn(principal);
    const run = history.get(runId) ?? ctx.fail('not_found', 'Corsa inesistente');
    if (principal.kind !== 'kernel' && run.owner !== principal.id) ctx.fail('not_found', 'Corsa inesistente');
    if (run.state !== 'waiting' && run.state !== 'running') ctx.fail('conflict', 'La corsa è già finita');
    if (!['open', 'automation'].includes(run.type)) ctx.fail('conflict', 'Solo le operazioni del browser si chiudono dalla pagina');
    const o = plain(outcome) ? outcome : {};
    const state = ['ok', 'error', 'skipped'].includes(o.state) ? o.state : ctx.fail('invalid', 'Esito non valido');
    Object.assign(run, { state, text: clip(o.text, MAX_TEXT), log: clip(o.log, limits().outputKb << 10), end: Date.now(), expires: null });
    if (!run.at) run.at = Date.now();
    await finished(run);
    return runView(run);
  },

  /** The times in [from, to): { items: [occurrence], series: [series] }, the planned ones and the ones done. */
  async occurrences(principal, { from, to, owner = null, task: only = null } = {}) {
    signedIn(principal);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || to <= from || to - from > MAX_RANGE) ctx.fail('invalid', 'Intervallo non valido (al massimo 62 giorni)');
    const now = Date.now();
    const items = [], series = [];
    const visible = (await tasks.read()).tasks.filter(t => sees(principal, t) && (owner === null || t.owner === owner) && (only === null || t.id === only));
    const ids = new Set(visible.map(t => t.id));
    const durations = new Map();
    for (const r of history.data.runs) {
      if (!ids.has(r.task)) continue;
      if (r.end && r.at && !durations.has(r.task)) durations.set(r.task, r.end - r.at);
      const at = r.at ?? r.due;
      if (at >= from && at < to && r.reason !== 'manual' && items.length < MAX_ITEMS) {
        items.push({ task: r.task, name: r.name, at, end: r.end, state: r.state, run: r.id, type: r.type, owner: r.owner, app: r.app });
      }
    }
    for (const t of visible) {
      if (!t.enabled || t.next === null) continue;
      const start = Math.max(from, now);
      if (start >= to) continue;
      const dense = rules.gap(t.when) < DENSE;
      const times = [];
      let left = t.when.count ? t.when.count - t.fired : Infinity;
      let cursor = start - 1;
      let capped = false;
      const deadline = Date.now() + 250;
      while (left > 0) {
        if (times.length >= (dense ? DENSE_COUNT : MAX_ITEMS)) { capped = true; break; }
        // Long work in steps: other requests and the clock go on meanwhile
        if ((times.length & 63) === 63) {
          if (Date.now() > deadline) { capped = true; break; }
          await new Promise(resolve => setImmediate(resolve));
        }
        const next = rules.nextAfter(t.when, cursor);
        if (next === null || next >= to) break;
        times.push(next);
        cursor = next;
        left--;
      }
      if (!times.length) continue;
      const took = durations.get(t.id) ?? null;
      if (dense) {
        const every = rules.gap(t.when);
        // Not all counted: up to the end of the range at the rule's pace (an estimate)
        const last = capped ? to - 1 : times[times.length - 1];
        const count = capped ? Math.min(left === Infinity ? Infinity : times.length + left, times.length + Math.floor((to - times[times.length - 1]) / every)) : times.length;
        series.push({ task: t.id, name: t.name, from: times[0], to: last, count, every, estimated: capped, type: t.what.type, owner: t.owner, app: t.app });
      } else {
        for (const at of times) {
          if (items.length >= MAX_ITEMS) break;
          items.push({ task: t.id, name: t.name, at, end: took === null ? null : at + took, state: 'planned', run: null, type: t.what.type, owner: t.owner, app: t.app });
        }
      }
    }
    items.sort((a, b) => a.at - b.at);
    return { items, series };
  },

  /** Moves a time ('this') or the whole rule ('all'); what it does stays. */
  async move(principal, id, { at, to, scope } = {}) {
    signedIn(principal);
    const task = await find(principal, id);
    let when;
    try {
      when = rules.moveWhen(task.when, { at, to, scope });
    } catch (err) {
      ctx.fail('invalid', err instanceof rules.RuleError ? err.message : 'Spostamento non valido');
    }
    const now = Date.now();
    const keepCount = scope === 'this';
    task.when = when;
    task.modified = now;
    task.by = who(principal);
    if (!keepCount) Object.assign(task, { cursor: now, fired: 0, retry: null });
    task.next = task.enabled ? nextOf(task, Math.max(task.cursor, now)) : null;
    await tasks.save();
    host?.changed(task.owner, [task.id]);
    arm();
    return view(task);
  },

  /** An app was uninstalled: its operations go. */
  async dropApp(appId) {
    const data = await tasks.read();
    const ids = new Set(data.tasks.filter(t => t.app === appId).map(t => t.id));
    if (ids.size) await dropTasks(ids);
    return [...ids];
  },

  /** A user was removed: their operations go. */
  async dropOwner(userId) {
    const data = await tasks.read();
    const ids = new Set(data.tasks.filter(t => t.owner === userId).map(t => t.id));
    if (ids.size) await dropTasks(ids);
    return [...ids];
  },
};

async function dropTasks(ids) {
  const data = await tasks.read();
  const gone = data.tasks.filter(t => ids.has(t.id));
  data.tasks = data.tasks.filter(t => !ids.has(t.id));
  for (const { run, controller } of running.values()) if (ids.has(run.task)) controller.abort(new Error('cancelled'));
  for (let i = queued.length - 1; i >= 0; i--) if (ids.has(queued[i].task)) queued.splice(i, 1);
  history.removeTasks(ids);
  await tasks.save();
  const owners = new Map();
  for (const t of gone) owners.set(t.owner, [...owners.get(t.owner) ?? [], t.id]);
  for (const [owner, list] of owners) host?.changed(owner, list);
  arm();
}

function cleanTasks(raw) {
  const out = [];
  for (const t of Array.isArray(raw?.tasks) ? raw.tasks : []) {
    if (!plain(t) || !ID.test(t.id ?? '') || (t.owner !== '*' && !ID.test(t.owner ?? '')) || !plain(t.when) || !plain(t.what)) continue;
    out.push({
      id: t.id, owner: t.owner, app: APP.test(t.app ?? '') ? t.app : null, name: clip(t.name, MAX_NAME) || t.id,
      enabled: t.enabled !== false, when: t.when, what: t.what, options: cleanOptions(t.options),
      created: Number(t.created) || Date.now(), modified: Number(t.modified) || Date.now(), by: plain(t.by) ? t.by : null,
      cursor: Number.isSafeInteger(t.cursor) ? t.cursor : Date.now(), fired: Number.isSafeInteger(t.fired) ? t.fired : 0,
      next: Number.isSafeInteger(t.next) ? t.next : null, last: plain(t.last) ? t.last : null,
      retry: plain(t.retry) && Number.isSafeInteger(t.retry.at) ? t.retry : null,
    });
  }
  return { version: 1, tasks: out };
}

export default {
  async init(context) {
    ctx = needKernel(context, 'jsonStore');
    stopped = false;
    tasks = ctx.jsonStore('scheduler.json', { clean: cleanTasks, invalid: 'empty' });
    await tasks.read();
    history = historyStore('history.json');
    await history.load();
    ctx.provide('scheduler', service);
  },

  async stop() {
    stopped = true;
    clearTimeout(timer);
    clearInterval(ticker);
    for (const { controller } of running.values()) controller.abort(new Error('cancelled'));
    await history?.flush().catch(() => {});
  },
};
