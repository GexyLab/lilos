import { automation, fs } from '@lilos/sdk';
import { recordedPath } from './recorder.js';

/**
 * An automation, as saved in its .automata file (JSON):
 *
 *   {
 *     format: 'lilos.automation', version: 1,
 *     name: 'Prepara foto per il web', description: '',
 *     input: 'none' | 'files' | 'folder',      what it works on: nothing, the files chosen when it
 *                                              starts (the steps run once per file), or a folder
 *     launch: { menu: true, ext: ['jpg'], shortcut: 'Ctrl+Alt+W', command: 'web', triggers: [trigger] },
 *     steps: [{
 *       action: 'photo.resize', enabled: true, confirm: false, onError: 'stop' | 'skip' | 'ask',
 *       params: { width: 1600, … },            file params hold references (below)
 *       file?: ref,                            the file a window works on (actions with target 'window')
 *       defaults?: { … }, changed: ['width'],  what the dialog proposed; the params the user changed
 *       fields: { width: { mode: 'use' | 'ask' | 'template', question?, template? } },
 *       note?: ''
 *     }]
 *   }
 *
 * Triggers: when it starts by itself, while lilOS is open (triggers.js), at most 10:
 *   { type: 'time', at: '08:30', days: [1, 2, 3, 4, 5], catchUp: true }   days 1 (Monday) … 7; none: every
 *                                                         day; catchUp: missed while lilOS was closed → at login
 *   { type: 'every', minutes: 30 }                        5 … 1440
 *   { type: 'login' }                                     when the user comes in
 *   { type: 'folder', folder: ref }                       files arriving in a folder (made, moved or copied
 *                                                         there; launch.ext filters them): they are the items
 *
 * References to nodes: { input: true } (the item the automation works on now; with parent: true,
 * the folder it is in), { step: 2, index? }
 * (what step 2 made), { path: '~/Documenti/a.txt', id } (a fixed node: by id, else by path).
 * Places on the desk: [{ ref, x, y }].
 */
export const FORMAT = 'lilos.automation';
export const INPUTS = ['none', 'files', 'folder'];
export const ON_ERROR = ['stop', 'skip', 'ask'];
export const MODES = ['use', 'ask', 'template'];
const MAX_STEPS = 500;
const MAX_TEXT = 300;
const EXT = /^[a-z0-9]{0,10}$/;
const COMMAND = /^[a-z][\w.-]{0,39}$/;

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '');
const NODE_TYPES = ['file', 'files', 'folder'];
const cleanValue = (p, v) => automation.cleanValue(p, v);
const ASKABLE = automation.askable;

/** A reference, checked; null if not valid. */
function cleanRef(r) {
  if (!plain(r)) return typeof r === 'string' ? { path: '', id: r.slice(0, 100) } : null;
  if (r.input === true) return r.parent === true ? { input: true, parent: true } : { input: true };
  if (Number.isInteger(r.step) && r.step >= 0 && r.step < MAX_STEPS) return { step: r.step, ...(Number.isInteger(r.index) && r.index >= 0 && { index: r.index }) };
  if (typeof r.path === 'string' || typeof r.id === 'string') return { path: text(r.path, 4096), ...(typeof r.id === 'string' && { id: r.id.slice(0, 100) }) };
  return null;
}

/** A param's value as saved: references for nodes, the rest as the action wants it. */
function cleanSaved(p, v) {
  if (p.type === 'file' || p.type === 'folder') return v == null ? null : cleanRef(v);
  if (p.type === 'files') return (Array.isArray(v) ? v : [v]).map(cleanRef).filter(Boolean).slice(0, 200);
  if (p.type === 'places') return (Array.isArray(v) ? v : []).filter(x => plain(x) && Number.isFinite(x.x) && Number.isFinite(x.y)).map(x => ({ ref: cleanRef(x.ref), x: x.x, y: x.y })).filter(x => x.ref).slice(0, 200);
  return cleanValue(p, v);
}

export const TRIGGERS = ['time', 'every', 'login', 'folder'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A trigger, checked; null if not valid. */
function cleanTrigger(t) {
  if (!plain(t) || !TRIGGERS.includes(t.type)) return null;
  if (t.type === 'time') {
    if (typeof t.at !== 'string' || !TIME.test(t.at)) return null;
    const days = [...new Set((Array.isArray(t.days) ? t.days : []).filter(d => Number.isInteger(d) && d >= 1 && d <= 7))].sort();
    return { type: 'time', at: t.at, days, catchUp: t.catchUp === true };
  }
  if (t.type === 'every') return Number.isInteger(t.minutes) && t.minutes >= 5 && t.minutes <= 1440 ? { type: 'every', minutes: t.minutes } : null;
  if (t.type === 'login') return { type: 'login' };
  const folder = cleanRef(t.folder);
  return folder && !folder.input && !Number.isInteger(folder.step) ? { type: 'folder', folder } : null;
}

/** A shortcut combo as the shortcuts keep them ('Ctrl+Alt+W'), or ''. */
const combo = v => (typeof v === 'string' && /^[\w+]{1,40}$/.test(v) ? v : '');

/** Checks an automation read from a file (untrusted). Throws if it is not one. */
export function checkDocument(raw) {
  const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!plain(d) || d.format !== FORMAT) throw new Error('Non è un’automazione di lilOS');
  const launch = plain(d.launch) ? d.launch : {};
  const doc = {
    format: FORMAT, version: 1,
    name: text(d.name, 80) || 'Automazione',
    description: text(d.description, 500),
    input: INPUTS.includes(d.input) ? d.input : 'none',
    launch: {
      menu: launch.menu === true,
      ext: (Array.isArray(launch.ext) ? launch.ext : []).filter(e => typeof e === 'string' && EXT.test(e)).slice(0, 30),
      shortcut: combo(launch.shortcut),
      command: typeof launch.command === 'string' && COMMAND.test(launch.command) ? launch.command : '',
      triggers: (Array.isArray(launch.triggers) ? launch.triggers : []).slice(0, 10).map(cleanTrigger).filter(Boolean),
    },
    steps: [],
  };
  for (const s of (Array.isArray(d.steps) ? d.steps : []).slice(0, MAX_STEPS)) {
    if (!plain(s) || typeof s.action !== 'string' || s.action.length > 120) continue;
    const def = automation.describe(s.action);
    const step = {
      action: s.action,
      enabled: s.enabled !== false,
      confirm: s.confirm === true,
      onError: ON_ERROR.includes(s.onError) ? s.onError : 'stop',
      params: {}, changed: [], fields: {},
      ...(s.file != null && { file: cleanRef(s.file) }),
      ...(typeof s.note === 'string' && s.note && { note: text(s.note, 500) }),
    };
    // An action of an app that is not installed now: kept as it is, it cannot run
    if (!def) {
      step.params = plain(s.params) ? JSON.parse(JSON.stringify(s.params).slice(0, 64 << 10)) : {};
      step.missing = true;
    } else {
      for (const [name, p] of Object.entries(def.params)) {
        const v = plain(s.params) && name in s.params ? cleanSaved(p, s.params[name]) : undefined;
        if (v !== undefined && v !== null) step.params[name] = v;
        const f = plain(s.fields) && plain(s.fields[name]) ? s.fields[name] : {};
        const mode = p.type === 'secret' ? 'ask' : MODES.includes(f.mode) && (f.mode !== 'ask' || ASKABLE.includes(p.type)) && (f.mode !== 'template' || p.type === 'text') ? f.mode : 'use';
        step.fields[name] = { mode, ...(f.question && { question: text(f.question, 200) }), ...(mode === 'template' && { template: text(f.template, 255) }) };
      }
      if (plain(s.defaults)) {
        step.defaults = {};
        for (const [name, p] of Object.entries(def.params)) {
          const v = name in s.defaults ? cleanValue(p, s.defaults[name]) : undefined;
          if (v !== undefined && !NODE_TYPES.includes(p.type)) step.defaults[name] = v;
        }
      }
      step.changed = (Array.isArray(s.changed) ? s.changed : []).filter(n => Object.hasOwn(def.params, n));
    }
    doc.steps.push(step);
  }
  return doc;
}

/**
 * A new automation from the steps of a recording. `inputs`: ids of the items the recording
 * started from («Registra partendo da questi file»); without them the first items a step works
 * on become what the automation works on.
 */
export function fromRecording(steps, { name = '', inputs = [] } = {}) {
  const made = new Map();   // node id → { step, index? }
  const input = new Set(inputs);
  let guessed = !!input.size;
  const doc = { format: FORMAT, version: 1, name: name || 'Nuova automazione', description: '', input: 'none', launch: { menu: false, ext: [], shortcut: '', command: '', triggers: [] }, steps: [] };

  const ref = id => {
    if (input.has(id)) return { input: true };
    if (made.has(id)) return { ...made.get(id) };
    return { path: recordedPath(id) ?? (fs.exists(id) ? fs.path(id) : ''), id };
  };

  steps.forEach((s, i) => {
    const def = automation.describe(s.action);
    if (!def) return;
    // The first things a step works on, if nothing else was said: the automation's input
    if (!guessed) {
      const subject = Object.entries(def.params).find(([, p]) => p.subject);
      const v = subject ? s.params[subject[0]] : s.file;
      const list = (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []).filter(id => !made.has(id) && fs.exists(id));
      if (list.length) {
        list.forEach(id => input.add(id));
        guessed = true;
      }
    }
    const params = {};
    for (const [nm, p] of Object.entries(def.params)) {
      if (!(nm in s.params)) continue;
      const v = s.params[nm];
      if (p.type === 'file' || p.type === 'folder') params[nm] = ref(v);
      else if (p.type === 'files') params[nm] = dedupe(v.map(ref));
      else if (p.type === 'places') params[nm] = v.map(x => ({ ref: ref(x.id), x: x.x, y: x.y }));
      else params[nm] = v;
    }
    const fields = {};
    for (const [nm, p] of Object.entries(def.params)) fields[nm] = { mode: p.type === 'secret' ? 'ask' : 'use' };
    doc.steps.push({
      action: s.action, enabled: true, confirm: def.confirm, onError: 'stop',
      params, ...(s.file && { file: ref(s.file) }),
      ...(s.defaults && { defaults: Object.fromEntries(Object.entries(s.defaults).filter(([nm]) => !NODE_TYPES.includes(def.params[nm]?.type))) }),
      changed: s.changed ?? [], fields,
    });
    const index = doc.steps.length - 1;
    const result = Array.isArray(s.result) ? s.result : s.result ? [s.result] : [];
    result.forEach((id, k) => made.set(id, result.length > 1 ? { step: index, index: k } : { step: index }));
  });
  // A folder alone is worked on as a folder; files one by one
  if (input.size) doc.input = [...input].every(id => fs.get(id)?.type === 'folder') && input.size === 1 ? 'folder' : 'files';
  return checkDocument(doc);
}

const dedupe = refs => refs.filter((r, i) => !r.input || refs.findIndex(x => x.input) === i);
