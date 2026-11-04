import { Emitter } from './events.js';
import { locale } from './locale.js';

const { t } = locale.define('lilos:sdk.automation', {
  en: { strings: {
    badAction: 'Invalid action: {id}', noFunction: 'The action’s function is missing', timeout: 'The app did not open the file in time',
  } },
});

/**
 * Automation: what the user does, recorded as steps that can be done again (the Automata app).
 * Not clicks and keys: operations with a meaning, each an *action* with its params.
 *
 *   automation.define('photo.resize', {
 *     label: 'Ridimensiona', app: 'photo', target: 'window',
 *     params: { width: { type: 'number', label: 'Larghezza', min: 1 }, keepRatio: { type: 'boolean', label: '…' } },
 *   })
 *
 * lilOS defines its own actions (lilos.move, lilos.rename…); an app's come from its manifest
 * (contributes.automation). An app tells what the user did, after doing it:
 *
 *   automation.record('photo.resize', {
 *     params: { width: 1600, height: 1067, keepRatio: true },
 *     defaults: { width: 4000, height: 2667, keepRatio: true },   what its dialog proposed
 *     file: imageId,                                              the file it worked on (target 'window')
 *   })
 *
 * Something the user did that the app cannot record (a brush stroke) is told with
 * automation.missed('photo', 'Pennello'): the recorder shows it, struck out, and leaves it out.
 *
 * It does nothing while nobody records. The params that differ from `defaults` are the *changed*
 * ones (all of them without defaults): Automata shows them first, to ask for them when it runs.
 * `result`: the id (or ids) of what the action made, so later steps may use it; a step of lilOS
 * that created the same node just before (the file the app saved) is merged into this one.
 *
 * Doing it again: actions with target 'window' are done by a window of the app, which says it can:
 *
 *   const off = automation.handle('photo.resize', async params => { … }, { window: win, file: () => currentId });
 *
 * The runner (lilOS) picks the window that shows the step's file, or opens the file with the app
 * and waits for its window (waitForHandler). Other actions run their `run(params)` (lilOS's own)
 * or the app's entry point (manifest `entry`).
 *
 * Param types: 'text' 'number' 'boolean' 'choice' (options) 'file' 'files' 'folder' (node ids) and
 * 'secret' (never recorded: always asked when the step runs). lilOS's own actions also use
 * 'value' (any JSON), 'tags' and 'places'. `subject: true` marks the param with what the step works on.
 *
 * Recording (lilOS and Automata): start() · pause(on) · stop() → steps · steps(). Ctrl Z while
 * recording takes back the steps it undoes (retract; UndoStack does it) and Ctrl Y brings them back.
 * Nothing is recorded while lilOS replays steps or an undo runs (quiet).
 *
 * Events: 'change' (recording started, paused, stopped) · 'step' (step) · 'retract' ({ tokens, reason })
 *         · 'restore' ({ tokens }) · 'actions' (the catalog changed) · 'handlers' ({ id, app }: a window can do an action)
 */
const ID = /^[a-z0-9][a-z0-9.-]{0,63}\.[a-zA-Z][a-zA-Z0-9]{0,40}$/;
const PARAM = /^(?!__proto__$|constructor$|prototype$)[a-zA-Z][a-zA-Z0-9_]{0,30}$/;
export const PARAM_TYPES = ['text', 'number', 'boolean', 'choice', 'file', 'files', 'folder', 'secret', 'value', 'tags', 'places'];
/** Types the user may be asked for when a step runs. */
export const ASKABLE = ['text', 'number', 'boolean', 'choice', 'file', 'files', 'folder', 'secret'];
const MAX_STEPS = 500;
const MAX_JSON = 64 << 10;
const MERGE_WITHIN = 5000;

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const ids = v => (Array.isArray(v) ? v : v == null ? [] : [v]).filter(x => typeof x === 'string');

/** A param definition, checked (from a manifest or from lilOS). */
function cleanParam(def) {
  if (!plain(def) || !PARAM_TYPES.includes(def.type)) return null;
  const p = { type: def.type, label: String(def.label ?? '').slice(0, 60) };
  if (def.description) p.description = String(def.description).slice(0, 200);
  if (def.subject === true) p.subject = true;
  if (def.type === 'number') {
    if (Number.isFinite(def.min)) p.min = def.min;
    if (Number.isFinite(def.max)) p.max = def.max;
  }
  if (def.type === 'text' && Number.isInteger(def.maxLength)) p.maxLength = def.maxLength;
  if (def.type === 'choice') {
    p.options = (Array.isArray(def.options) ? def.options : [])
      .filter(o => plain(o) && (typeof o.value === 'string' || Number.isFinite(o.value)))
      .slice(0, 50).map(o => ({ value: o.value, label: String(o.label ?? o.value).slice(0, 60) }));
  }
  return p;
}

/** A value fit for a param of this type, or undefined. */
export function cleanValue(p, v) {
  switch (p.type) {
    case 'text': return typeof v === 'string' ? v.slice(0, p.maxLength ?? 4000) : undefined;
    case 'number': return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    case 'boolean': return typeof v === 'boolean' ? v : undefined;
    case 'choice': return p.options.some(o => o.value === v) ? v : undefined;
    case 'file': case 'folder': return typeof v === 'string' ? v : undefined;
    case 'files': return Array.isArray(v) ? ids(v).slice(0, 200) : typeof v === 'string' ? [v] : undefined;
    case 'secret': return undefined;   // never kept
    default: {
      const text = JSON.stringify(v);
      return text !== undefined && text.length <= MAX_JSON ? JSON.parse(text) : undefined;
    }
  }
}

class Automation extends Emitter {
  #actions = new Map();     // id → definition
  #handlers = new Map();    // id → Set<{ fn, window, file, app, at }>
  #steps = [];
  #state = 'off';           // 'off' | 'on' | 'paused'
  #quiet = 0;
  #seq = 0;

  /** Types the user may be asked for, and the check of a value (for the runner and the editor). */
  get askable() { return [...ASKABLE]; }
  cleanValue(param, value) { return cleanValue(param, value); }

  // ---------- Catalog ----------

  /**
   * Declares an action: { label, description?, app?, entry?, target?: 'none' | 'window',
   * result?: 'file', confirm?: true (ask before it runs, by default), params: { name: param },
   * run?(params, ctx) → result }  (run: lilOS's own actions)
   */
  define(id, def = {}) {
    if (!ID.test(id)) throw new Error(t('badAction', { id: String(id).slice(0, 60) }));
    const params = {};
    for (const [name, p] of Object.entries(plain(def.params) ? def.params : {}).slice(0, 20)) {
      const clean = PARAM.test(name) ? cleanParam(p) : null;
      if (clean) params[name] = clean;
    }
    this.#actions.set(id, {
      id,
      label: String(def.label ?? id).slice(0, 80),
      description: def.description ? String(def.description).slice(0, 300) : '',
      app: typeof def.app === 'string' ? def.app : null,
      entry: typeof def.entry === 'string' ? def.entry : null,
      target: def.target === 'window' ? 'window' : 'none',
      result: def.result === 'file' ? 'file' : null,
      confirm: def.confirm === true,
      params,
      run: typeof def.run === 'function' ? def.run : null,
    });
    this.emit('actions');
  }

  undefine(id) {
    if (this.#actions.delete(id)) this.emit('actions');
  }

  /** Takes away the actions of an app (removed, or updated: they are defined again). */
  forgetApp(appId) {
    let changed = false;
    for (const [id, a] of this.#actions) if (a.app === appId) changed = this.#actions.delete(id) || changed;
    if (changed) this.emit('actions');
  }

  /** The definition of an action (without its run function), or null. */
  describe(id) {
    const a = this.#actions.get(id);
    if (!a) return null;
    const { run, ...rest } = a;
    return structuredClone(rest);
  }

  actions() {
    return [...this.#actions.keys()].map(id => this.describe(id));
  }

  /** The run function of lilOS's own action (for the runner), or null. */
  runner(id) {
    return this.#actions.get(id)?.run ?? null;
  }

  // ---------- Recording ----------

  get recording() { return this.#state !== 'off'; }
  get paused() { return this.#state === 'paused'; }
  /** True while what happens must not be recorded (a replay, an undo). */
  get quietNow() { return this.#quiet > 0; }

  start() {
    this.#steps = [];
    this.#state = 'on';
    this.emit('change', { recording: true, paused: false });
  }

  pause(on = true) {
    if (this.#state === 'off') return;
    this.#state = on ? 'paused' : 'on';
    this.emit('change', { recording: true, paused: on });
  }

  /** Ends the recording; returns its steps (without the ones taken back or missed). */
  stop() {
    const steps = this.steps().filter(s => !s.retracted && !s.missed);
    this.#state = 'off';
    this.#steps = [];
    this.emit('change', { recording: false, paused: false });
    return steps;
  }

  /** Every step so far, also the ones taken back ({ retracted: 'undo' }). */
  steps() {
    return this.#steps.map(s => structuredClone(s));
  }

  /**
   * Tells that the user did an action. Returns the step's token, or null when nothing is
   * recorded (nobody records, paused, quiet, unknown action).
   */
  record(id, { params = {}, defaults = null, file = null, result = null } = {}) {
    if (this.#state !== 'on' || this.#quiet > 0 || this.#steps.length >= MAX_STEPS) return null;
    const def = this.#actions.get(id);
    if (!def) {
      console.warn(`[lilos] automation: azione sconosciuta ${String(id).slice(0, 60)}`);
      return null;
    }
    const clean = {}, given = {};
    for (const [name, p] of Object.entries(def.params)) {
      const v = plain(params) ? cleanValue(p, params[name]) : undefined;
      if (v !== undefined) clean[name] = v;
      const d = plain(defaults) ? cleanValue(p, defaults[name]) : undefined;
      if (d !== undefined) given[name] = d;
    }
    // Changed: what differs from what was proposed; without a proposal, every param but the subject
    const changed = Object.keys(def.params).filter(name => {
      if (def.params[name].type === 'secret' || !(name in clean)) return false;
      return plain(defaults) ? name in given && !same(clean[name], given[name]) : !def.params[name].subject;
    });
    const made = ids(result);
    // The node the app made was created by a step of lilOS just before (its save): one step only
    if (made.length) this.#merge(made);
    const step = {
      token: ++this.#seq, at: Date.now(), action: id, app: def.app, params: clean,
      ...(plain(defaults) && { defaults: given }), changed,
      file: typeof file === 'string' ? file : null, result: made.length ? (Array.isArray(result) ? made : made[0]) : null,
    };
    this.#steps.push(step);
    this.emit('step', structuredClone(step));
    return step.token;
  }

  /**
   * Tells that the user did something an app cannot record (shown by the recorder, never done
   * again). The same thing again right after is told once.
   */
  missed(app, label) {
    if (this.#state !== 'on' || this.#quiet > 0 || this.#steps.length >= MAX_STEPS) return;
    const last = this.#steps.at(-1);
    const text = String(label ?? '').slice(0, 80);
    if (last?.missed === text && last.app === app) return;
    const step = { token: ++this.#seq, at: Date.now(), action: null, app: typeof app === 'string' ? app : null, missed: text, params: {}, changed: [] };
    this.#steps.push(step);
    this.emit('step', structuredClone(step));
  }

  /** Steps that only made what an app's step made too: taken back, quietly. */
  #merge(made) {
    const now = Date.now();
    const tokens = this.#steps
      .filter(s => !s.retracted && now - s.at < MERGE_WITHIN && (s.action === 'lilos.create' || s.action === 'lilos.copy') && ids(s.result).some(id => made.includes(id)))
      .map(s => s.token);
    if (tokens.length) this.retract(tokens, 'merged');
  }

  /** Tokens of the steps recorded between two moments (an UndoStack entry: what it undoes). */
  stepsBetween(from, to) {
    return this.#steps.filter(s => !s.retracted && s.at >= from && s.at <= to).map(s => s.token);
  }

  retract(tokens, reason = 'undo') {
    const list = this.#steps.filter(s => tokens.includes(s.token) && !s.retracted);
    if (!list.length) return [];
    list.forEach(s => { s.retracted = reason; });
    this.emit('retract', { tokens: list.map(s => s.token), reason });
    return list.map(s => s.token);
  }

  restore(tokens) {
    const list = this.#steps.filter(s => tokens.includes(s.token) && s.retracted === 'undo');
    if (!list.length) return;
    list.forEach(s => { delete s.retracted; });
    this.emit('restore', { tokens: list.map(s => s.token) });
  }

  /**
   * Runs fn without recording what happens meanwhile. The quiet lasts until what fn started
   * has told its events (they come right after, in the same turn).
   */
  async quiet(fn) {
    this.#quiet++;
    try {
      return await fn();
    } finally {
      setTimeout(() => { this.#quiet--; }, 0);
    }
  }

  // ---------- Doing it again ----------

  /**
   * A window says it can do an action: fn(params, { file }) → result (a node id, ids, or nothing).
   * `file`: the id of the file it shows, or a function giving it (it changes). Returns off().
   */
  handle(id, fn, { window = null, file = null, app = null } = {}) {
    if (typeof fn !== 'function') throw new Error(t('noFunction'));
    if (!this.#handlers.has(id)) this.#handlers.set(id, new Set());
    const h = { fn, window, file, app: app ?? this.#actions.get(id)?.app ?? id.slice(0, id.lastIndexOf('.')), at: Date.now() };
    this.#handlers.get(id).add(h);
    // A moment later: who watches the window close still finds the file it showed
    window?.on?.('destroy', () => setTimeout(() => this.#handlers.get(id)?.delete(h), 0));
    this.emit('handlers', { id, app: h.app });
    return () => this.#handlers.get(id)?.delete(h);
  }

  /** The file a window's handler shows now (null: none). */
  #fileOf(h) {
    try {
      const f = typeof h.file === 'function' ? h.file() : h.file;
      return typeof f === 'string' ? f : null;
    } catch {
      return null;
    }
  }

  /** The handler for an action on a file (the one of the window showing it), or null. */
  handlerFor(id, file = null) {
    const list = [...(this.#handlers.get(id) ?? [])];
    if (file) return list.find(h => this.#fileOf(h) === file) ?? null;
    return list.at(-1) ?? null;
  }

  /** The window that shows a file in an app (from the handlers it registered), or null. */
  windowFor(app, file) {
    for (const set of this.#handlers.values()) {
      for (const h of set) if (h.app === app && h.window && this.#fileOf(h) === file) return h.window;
    }
    return null;
  }

  /** The file a window registered with (null: none, or no handlers). */
  fileOfWindow(win) {
    for (const set of this.#handlers.values()) {
      for (const h of set) if (h.window === win) return this.#fileOf(h);
    }
    return null;
  }

  /** Waits until a window can do the action on the file (it is opening it; the app may ask the user first). */
  waitForHandler(id, file = null, timeout = 90_000) {
    const found = this.handlerFor(id, file);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const check = () => {
        const h = this.handlerFor(id, file);
        if (!h) return;
        done();
        resolve(h);
      };
      // A window may register before it has its file: look again for a while
      const poll = setInterval(check, 200);
      const off = this.on('handlers', check);
      const timer = setTimeout(() => { done(); reject(new Error(t('timeout'))); }, timeout);
      const done = () => { off(); clearInterval(poll); clearTimeout(timer); };
    });
  }
}

export const automation = new Automation();
