import { automation, fs, h, locale } from '@lilos/sdk';
import { launch, isInstalled } from '../apps/registry.js';
import { defineSystemActions } from './actions.js';
import { connectAppActions } from './apps.js';
import { connectRecorder, flushRecorder, nodesOf, AUTOMATIONS } from './recorder.js';
import { checkDocument, fromRecording, FORMAT, INPUTS, ON_ERROR, MODES, TRIGGERS } from './document.js';
import { runAutomation, fillTemplate, RunStopped } from './runner.js';
import { library, AUTOMATA, EXT } from './library.js';
import { connectTriggers } from './triggers.js';

/**
 * Automations in lilOS: recording what the user does, the .automata files, running them again.
 * The SDK's automation.js has the actions and the steps; here is what needs the system (the
 * recorder of its own events, the runner, the library of the user's automations, the REC
 * button in the taskbar). The Automata app shows it all, through `automations` (@lilos/system).
 */
let inputs = [];

const { t } = locale.define('lilos:automation.index', {
  en: { strings: {
    recording: { one: 'Recording ({n} step)', other: 'Recording ({n} steps)' },
    paused: { one: 'Recording paused ({n} step)', other: 'Recording paused ({n} steps)' },
  } },
});

export const automations = Object.freeze({
  FORMAT, INPUTS, ON_ERROR, MODES, TRIGGERS, EXT, FOLDER: AUTOMATIONS,

  /** Starts recording; items: what it starts from (they become what the automation works on). */
  startRecording({ items = [] } = {}) {
    inputs = items.filter(id => fs.exists(id));
    automation.start();
  },
  pauseRecording: (on = true) => automation.pause(on),
  /** Ends the recording: { steps, inputs } (steps without the ones taken back). */
  stopRecording() {
    flushRecorder();
    const steps = automation.stop();
    const out = { steps, inputs };
    inputs = [];
    return out;
  },
  /** Ends the recording and forgets it. */
  discardRecording() {
    inputs = [];
    automation.stop();
  },
  recordingInputs: () => [...inputs],

  /** A new automation from recorded steps (see document.js). */
  fromRecording: (steps, options) => fromRecording(steps, options),
  /** Checks an automation read from a file; throws if it is not one. */
  check: raw => checkDocument(raw),
  nodesOf,
  fillTemplate,
  run: (doc, options) => runAutomation(doc, options),
  RunStopped,

  /** The folder of the automations (made the first time). */
  folder() {
    const found = fs.resolve(AUTOMATIONS);
    if (found) return found;
    return fs.create(fs.root, { type: 'folder', name: AUTOMATIONS.slice(2) });
  },
  library,
});

/** The REC button in the taskbar: shows the recorder; hidden while nobody records. */
function recButton() {
  const count = h('span', { class: 'tb-rec-count' });
  const button = h('button', { class: 'tb-rec', type: 'button', hidden: true }, h('span', { class: 'tb-rec-dot' }), 'REC', count);
  const update = () => {
    button.hidden = !automation.recording;
    button.classList.toggle('paused', automation.paused);
    const n = automation.steps().filter(s => !s.retracted && !s.missed).length;
    count.textContent = n ? ` · ${n}` : '';
    const label = t(automation.paused ? 'paused' : 'recording', { n });
    button.title = label;
    button.setAttribute('aria-label', label);
  };
  button.addEventListener('click', () => { if (isInstalled(AUTOMATA)) launch(AUTOMATA, undefined, 'recorder'); });
  for (const e of ['change', 'step', 'retract', 'restore']) automation.on(e, update);
  update();
  return button;
}

/** ctx: { wm, desktop, workspaces, taskbar } */
export function connectAutomation({ wm, desktop, workspaces, taskbar }) {
  defineSystemActions({ wm, desktop, workspaces });
  connectAppActions();
  connectRecorder({ wm });
  // What a shortcut works on: the selection of the active window (one that tells it, Window.selection),
  // or of the desk when no window is active
  library.connect({
    selection: () => {
      const win = wm.active;
      const ids = win ? (typeof win.selection === 'function' ? win.selection() : []) : [...desktop.selection].map(it => it.id);
      return (Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string' && fs.exists(id));
    },
  });
  connectTriggers();
  taskbar.el.querySelector('.tb-notify-area')?.prepend(recButton());
  // Reloading the page while recording: the recording is lost (it lived in the page)
  addEventListener('beforeunload', e => { if (automation.recording && automation.steps().length) e.preventDefault(); });
}

export { library };
