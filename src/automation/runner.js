import { automation, fs, splitName, locale } from '@lilos/sdk';
import { launch, isInstalled, getApp } from '../apps/registry.js';
import { callEntrypoint, entrypointsOf } from '../apps/entrypoints.js';

/**
 * Runs an automation (document.js) again. The steps run once per item it works on (input
 * 'files'), or once (a folder, or nothing). For each step: its values (the recorded ones, a
 * template, or asked), a confirmation if it wants one, then the action:
 *
 *   lilOS's own        its run() (actions.js)
 *   target 'window'    the window of the app that shows the step's file (opened if needed)
 *   entry              the app's entry point, called with { automation: { action, params }, files }
 *
 * The page that shows the run (Automata) answers through `ui`; every function may be missing:
 *   ask({ step, index, item, fields: [{ name, param, value, question }] })
 *         → { values, remember? } | 'skip' | 'stop'      remember: the same for the next items
 *   confirm({ step, index, item, label, params }) → 'run' | 'skip' | 'stop'
 *   failed({ step, index, item, error }) → 'retry' | 'skip' | 'stop'   (steps with onError 'ask')
 *   progress({ type: 'item' | 'step' | 'done' | 'skipped' | 'failed' | 'end', … })
 * Without ask, the recorded values are used (and `values`, given by name: { width: 1200 });
 * without confirm, steps that want one are done (the Terminal with --yes).
 *
 * from / only: start at that step (the ones before do not run: what they made is missing), or
 * run only that one. Returns { items, done, skipped, failed, stopped } (counts). Nothing is recorded meanwhile.
 */
const { t } = locale.define('lilos:automation.runner', {
  en: { strings: {
    stopped: 'Automation stopped', chooseItems: 'Choose what to work on', appMissing: 'The app of this step is not installed',
    password: 'This step asks for a password', stepFailedLabel: 'Step {n} ({label}): {message}', stepFailed: 'Step {n}: {message}',
    cannotRedo: 'This action cannot be done again',
  } },
});

export class RunStopped extends Error {
  constructor() { super(t('stopped')); this.name = 'RunStopped'; }
}

const listOf = v => (Array.isArray(v) ? v : v == null ? [] : [v]);
const pad = n => String(n).padStart(2, '0');

/** Text with {nome} {est} {data} {ora} {n} {cartella} (and their English names) filled in. */
export function fillTemplate(template, { node = null, n = 1, now = new Date() } = {}) {
  const [base, ext] = node ? splitName(node.name) : ['', ''];
  const parent = node?.parent ? fs.get(node.parent) : null;
  const values = {
    nome: base, name: base, est: ext, ext,
    data: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`, date: '',
    ora: `${pad(now.getHours())}.${pad(now.getMinutes())}`, time: '',
    n: String(n), cartella: parent?.name ?? '', folder: parent?.name ?? '',
  };
  values.date = values.data;
  values.time = values.ora;
  return String(template).replace(/\{(\w+)\}/g, (all, key) => (Object.hasOwn(values, key) ? values[key] : all)).replace(/\.$/, '');
}

/** A node id from a reference, or null. */
function resolveRef(ref, env) {
  if (!ref) return null;
  if (ref.input) return ref.parent ? (env.item ? fs.get(env.item)?.parent ?? null : null) : env.item;
  if (Number.isInteger(ref.step)) {
    const made = listOf(env.results[ref.step]);
    return Number.isInteger(ref.index) ? made[ref.index] ?? null : made[0] ?? null;
  }
  if (ref.id && (fs.exists(ref.id) || fs.isTrashed(ref.id))) return ref.id;
  return ref.path ? fs.resolve(ref.path)?.id ?? null : null;
}

/** Every node id from a list of references (a step's result counts with all it made). */
function resolveRefs(refs, env) {
  return listOf(refs).flatMap(ref => (Number.isInteger(ref?.step) && !Number.isInteger(ref.index) ? listOf(env.results[ref.step]) : [resolveRef(ref, env)])).filter(Boolean);
}

/** The value of a param with its references resolved. */
function resolveParam(p, v, env) {
  if (p.type === 'file' || p.type === 'folder') return resolveRef(v, env);
  if (p.type === 'files') return resolveRefs(v, env);
  if (p.type === 'places') return listOf(v).map(x => ({ id: resolveRef(x.ref, env), x: x.x, y: x.y })).filter(x => x.id);
  return v;
}

export async function runAutomation(doc, { items = [], values = {}, ui = {}, control = { stopped: false, paused: null }, from = 0, only = false } = {}) {
  const first = Math.max(0, Math.min(from, doc.steps.length));
  const last = only ? first + 1 : doc.steps.length;
  const passes = doc.input === 'files' ? items.map(id => [id]) : [[doc.input === 'folder' ? items[0] ?? null : null]];
  if (doc.input !== 'none' && !items.length) throw new Error(t('chooseItems'));
  const remembered = new Map();   // step index → values asked once for every item
  const count = { items: passes.length, done: 0, skipped: 0, failed: 0, stopped: false };

  const checkpoint = async () => {
    if (control.stopped) throw new RunStopped();
    if (control.paused) await control.paused;
    if (control.stopped) throw new RunStopped();
  };

  return automation.quiet(async () => {
    try {
      for (let pass = 0; pass < passes.length; pass++) {
        const item = passes[pass][0];
        const env = { item, results: [], n: pass + 1 };
        ui.progress?.({ type: 'item', item, index: pass, total: passes.length });
        for (let i = first; i < Math.min(last, doc.steps.length); i++) {
          await checkpoint();
          const step = doc.steps[i];
          if (!step.enabled) { ui.progress?.({ type: 'skipped', index: i, item, reason: 'off' }); continue; }
          const outcome = await runStep(doc, step, i, env, { ui, values, remembered, checkpoint });
          if (outcome === 'stop') throw new RunStopped();
          count[outcome === 'skip' ? 'skipped' : outcome === 'failed' ? 'failed' : 'done']++;
        }
      }
    } catch (err) {
      if (!(err instanceof RunStopped)) throw err;
      count.stopped = true;
    }
    ui.progress?.({ type: 'end', ...count });
    return count;
  });
}

async function runStep(doc, step, i, env, { ui, values, remembered, checkpoint }) {
  const def = automation.describe(step.action);
  if (!def || step.missing) return fail(new Error(t('appMissing')));
  const params = {};
  for (const [name, p] of Object.entries(def.params)) {
    if (name in step.params) params[name] = resolveParam(p, step.params[name], env);
  }
  const file = step.file ? resolveRef(step.file, env) : null;
  const subject = Object.entries(def.params).find(([, p]) => p.subject)?.[0];
  const subjectNode = () => fs.get(listOf(params[subject] ?? file)[0]);

  // Templates, then what is asked (with the recorded value, or the template's, as the proposal)
  for (const [name, f] of Object.entries(step.fields ?? {})) {
    if (f.mode === 'template' && def.params[name]?.type === 'text') params[name] = fillTemplate(f.template ?? '', { node: subjectNode(), n: env.n });
    if (Object.hasOwn(values, name) && def.params[name]) {
      const v = coerce(def.params[name], values[name]);
      if (v !== undefined) params[name] = v;
    }
  }
  const asked = Object.entries(step.fields ?? {}).filter(([name, f]) => f.mode === 'ask' && def.params[name] && !Object.hasOwn(values, name));
  if (asked.length) {
    let answer = remembered.get(i);
    if (!answer) {
      if (!ui.ask) {
        if (asked.some(([name]) => def.params[name].type === 'secret')) return fail(new Error(t('password')));
      } else {
        const reply = await ui.ask({
          step, index: i, item: env.item, label: def.label,
          fields: asked.map(([name, f]) => ({ name, param: def.params[name], value: params[name] ?? null, question: f.question || def.params[name].label })),
        });
        if (reply === 'stop') return 'stop';
        if (reply === 'skip') { ui.progress?.({ type: 'skipped', index: i, item: env.item, reason: 'user' }); return 'skip'; }
        answer = reply?.values ?? {};
        if (reply?.remember) remembered.set(i, answer);
      }
    }
    for (const [name] of asked) if (answer && Object.hasOwn(answer, name)) params[name] = answer[name];
  }
  await checkpoint();

  if (step.confirm && ui.confirm) {
    const reply = await ui.confirm({ step, index: i, item: env.item, label: def.label, params, file });
    if (reply === 'stop') return 'stop';
    if (reply === 'skip') { ui.progress?.({ type: 'skipped', index: i, item: env.item, reason: 'user' }); return 'skip'; }
  }

  for (;;) {
    ui.progress?.({ type: 'step', index: i, item: env.item, label: def.label });
    try {
      const result = await perform(def, step, params, file);
      env.results[i] = result ?? (subject ? params[subject] : null) ?? null;
      ui.progress?.({ type: 'done', index: i, item: env.item });
      return 'done';
    } catch (err) {
      if (step.onError === 'skip') { ui.progress?.({ type: 'failed', index: i, item: env.item, error: err.message }); return 'failed'; }
      if (step.onError === 'ask' && ui.failed) {
        const reply = await ui.failed({ step, index: i, item: env.item, error: err });
        if (reply === 'retry') continue;
        if (reply === 'skip') { ui.progress?.({ type: 'failed', index: i, item: env.item, error: err.message }); return 'failed'; }
        return 'stop';
      }
      throw new Error(t('stepFailedLabel', { n: i + 1, label: def.label, message: err.message }));
    }
  }

  function fail(err) {
    if (step.onError === 'skip') { ui.progress?.({ type: 'failed', index: i, item: env.item, error: err.message }); return 'failed'; }
    throw new Error(t('stepFailed', { n: i + 1, message: err.message }));
  }
}

/** A value given as text (the Terminal: --width=1200) for a param of this type. */
function coerce(p, v) {
  if (typeof v !== 'string') return automation.cleanValue(p, v);
  if (p.type === 'number') return Number.isFinite(Number(v)) ? Number(v) : undefined;
  if (p.type === 'boolean') return ['1', 'true', 'si', 'sì', 'yes', 'on'].includes(v.toLowerCase()) ? true : ['0', 'false', 'no', 'off'].includes(v.toLowerCase()) ? false : undefined;
  if (p.type === 'choice') return p.options.find(o => String(o.value) === v)?.value;
  if (p.type === 'file' || p.type === 'folder') return fs.resolve(v)?.id;
  if (p.type === 'files') return v.split(',').map(x => fs.resolve(x.trim())?.id).filter(Boolean);
  return automation.cleanValue(p, v) ?? (p.type === 'secret' ? v : undefined);
}

/** Does the action: lilOS's own, a window of the app, or the app's entry point. */
async function perform(def, step, params, file) {
  const run = automation.runner(def.id);
  if (run) return run(params, { file });
  if (!def.app || !isInstalled(def.app)) throw new Error(t('appMissing'));
  if (def.target === 'window') {
    let handler = automation.handlerFor(def.id, file);
    if (!handler) {
      launch(def.app, file ? { file } : undefined);
      handler = await automation.waitForHandler(def.id, file);
    }
    return handler.fn(params, { file });
  }
  if (def.entry) {
    const files = Object.entries(def.params).flatMap(([name, p]) => (['file', 'files', 'folder'].includes(p.type) ? listOf(params[name]) : []));
    if (file) files.unshift(file);
    const data = { automation: { action: def.id, params }, files: [...new Set(files)] };
    // A window gets the files as the menu of files hands them (it may read and write them)
    if (entrypointsOf(getApp(def.app))[def.entry]?.kind === 'window') return void launch(def.app, data, def.entry, { files: data.files });
    return callEntrypoint(def.app, def.entry, data, { from: 'automata' });
  }
  throw new Error(t('cannotRedo'));
}
