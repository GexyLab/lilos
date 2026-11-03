import { Window, h, icon, fs, automation, messageBox } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t } from './i18n.js';
import { engine, load, save, create, tell } from './store.js';
import { actionLabel, appColor, appGlyph, appName, recordedText } from './describe.js';

/**
 * The recorder: a small window above the others that never takes the focus (the user goes on
 * working where they are), with the steps as they come. Pausa leaves out what happens meanwhile,
 * Scarta forgets it all, Fine makes the automation (or adds the steps to the one being extended:
 * args.append) and opens it in Automata's main window.
 *
 *   args: { items?: [ids] }   start from these items (they become what the automation works on)
 *         { append: fileId }  add the steps to that automation
 */
let appendTo = null;   // the automation being extended by the recording in progress

export function createRecorder({ args } = {}) {
  const win = new Window({
    title: t('rec.title'), icon: 'record', width: 300, height: 380, minWidth: 260, minHeight: 220,
    maximizable: false, focusable: false, onTop: true,
  });
  const eng = engine();
  if (!eng) {
    win.body.append(h('p', { class: 'au-empty' }, t('needsNewer')));
    return win;
  }

  const begin = a => {
    if (automation.recording || a?.restored) return;
    appendTo = typeof a?.append === 'string' && fs.exists(a.append) ? a.append : null;
    eng.startRecording({ items: Array.isArray(a?.items) ? a.items : [] });
  };
  begin(args);
  win.on('launch', begin);
  // Reopened by itself (a workarea, the next login) with nothing being recorded: it goes away
  win.getState = () => ({ restored: true });
  if (args?.restored && !automation.recording) {
    setTimeout(() => win.emit('close'), 0);
    return win;
  }

  const started = Date.now();
  const time = h('span', { class: 'rc-time' }, '00:00');
  const head = h('div', { class: 'rc-head' }, h('span', { class: 'rc-dot' }), h('b', {}, t('rec.recording')), time);
  const list = h('div', { class: 'rc-list', role: 'log', 'aria-live': 'polite', 'aria-label': t('rec.steps') });
  const pause = h('button', { class: 'ctl-btn', type: 'button' });
  const discard = h('button', { class: 'ctl-btn', type: 'button' }, icon('x'), t('rec.discard'));
  const finish = h('button', { class: 'ctl-btn stop', type: 'button' }, icon('stop'), t('rec.finish'));
  const root = h('div', { class: 'rc' }, head, list, h('div', { class: 'rc-foot' }, pause, discard, finish));
  win.body.append(root);

  const tick = setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    time.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);

  function draw() {
    const steps = automation.steps().filter(s => s.retracted !== 'merged');
    head.classList.toggle('paused', automation.paused);
    head.querySelector('b').textContent = automation.paused ? t('rec.paused') : t('rec.recording');
    pause.replaceChildren(icon(automation.paused ? 'record' : 'pause'), automation.paused ? t('rec.resume') : t('rec.pause'));
    finish.disabled = !steps.some(s => !s.retracted && !s.missed);
    if (!steps.length) {
      list.replaceChildren(h('p', { class: 'rc-empty' }, appendTo ? t('rec.emptyAppend') : t('rec.empty')));
      return;
    }
    list.replaceChildren(...steps.map((s, i) => {
      if (s.missed) {
        return h('div', { class: 'rc-step undone' }, h('span', { class: 'au-badge', style: 'background:#3a3f48' }, icon('x')),
          h('div', {}, h('span', {}, s.missed), h('small', {}, t('rec.missed', { app: appName(s.app) }))));
      }
      const def = automation.describe(s.action);
      const b = h('span', { class: 'au-badge' }, icon(appGlyph(def?.app, s.action)));
      b.style.background = s.retracted ? '#3a3f48' : appColor(def?.app);
      return h('div', { class: `rc-step${s.retracted ? ' undone' : ''}${i === steps.length - 1 && !s.retracted ? ' new' : ''}` }, b,
        h('div', {}, h('span', {}, actionLabel(s.action)),
          h('small', {}, s.retracted ? t('rec.undone') : recordedText(s).map((p, k) => [k ? ' · ' : '', p.changed ? h('i', {}, p.text) : p.text]).flat())));
    }));
    list.scrollTop = list.scrollHeight;
  }

  const offs = ['change', 'step', 'retract', 'restore'].map(e => automation.on(e, draw));
  draw();

  pause.addEventListener('click', () => eng.pauseRecording(!automation.paused));
  discard.addEventListener('click', async () => {
    const n = automation.steps().filter(s => !s.retracted && !s.missed).length;
    if (n && await messageBox(win, { icon: 'warning', text: t('rec.discardAsk', { n }), buttons: ['continue', 'cancel'] }) !== 'continue') return;
    eng.discardRecording();
    appendTo = null;
    win.emit('close');
  });
  finish.addEventListener('click', async () => {
    finish.disabled = true;
    try {
      const id = await finishRecording();
      win.emit('close');
      if (id) system.launch('automata', { file: id });
    } catch (err) {
      finish.disabled = false;
      tell(t('error.save', { error: err.message }), 'error');
    }
  });

  // Closing it while recording: the recording goes on only with the window (it would be invisible)
  win.canClose = async () => {
    if (!automation.recording) return true;
    const n = automation.steps().filter(s => !s.retracted && !s.missed).length;
    if (!n) { eng.discardRecording(); return true; }
    const answer = await messageBox(win, { icon: 'warning', text: t('rec.closeAsk', { n }), buttons: ['continue', 'cancel'] });
    if (answer !== 'continue') return false;
    eng.discardRecording();
    return true;
  };
  win.on('destroy', () => {
    clearInterval(tick);
    offs.forEach(off => off());
  });
  return win;
}

/** Ends the recording: a new automation, or the steps added to the one extended. Resolves with its file id. */
async function finishRecording() {
  const eng = engine();
  const { steps, inputs } = eng.stopRecording();
  const target = appendTo;
  appendTo = null;
  if (!steps.length) return null;
  const made = eng.fromRecording(steps, { name: t('newNameAt', { date: new Date().toLocaleDateString() }), inputs });
  if (!target) return create(made);
  const doc = await load(target);
  const offset = doc.steps.length;
  const shift = v => {
    if (Array.isArray(v)) return v.map(shift);
    if (!v || typeof v !== 'object') return v;
    if (Number.isInteger(v.step)) return { ...v, step: v.step + offset };
    if (v.ref) return { ...v, ref: shift(v.ref) };
    return v;
  };
  for (const s of made.steps) {
    for (const k of Object.keys(s.params)) s.params[k] = shift(s.params[k]);
    if (s.file) s.file = shift(s.file);
  }
  // What the new steps worked on: the automation's input if it has one, otherwise as recorded
  if (doc.input === 'none' && made.input !== 'none') doc.input = made.input;
  doc.steps.push(...made.steps);
  await save(target, doc);
  return target;
}
