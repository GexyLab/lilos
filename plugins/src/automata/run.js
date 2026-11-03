import { Window, h, icon, fs, automation, notifications, checkbox } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t } from './i18n.js';
import { paramControl } from '../shared/paramsForm.js';
import { engine, load } from './store.js';
import { actionLabel, paramLabel, appColor, appGlyph, valueText, homePath } from './describe.js';

/**
 * Runs an automation: its steps with how each one went, and — inside this window — the values
 * a step asks for and the confirmations it wants. Pausa waits before the next step, Ferma stops.
 * At the end a notification says how it went.
 *
 *   args: { automation: fileId, items?: [ids], from?, only?, values? }
 */
export function createRun({ args, openWindow } = {}) {
  const win = new Window({ title: t('run.title'), icon: 'automation', width: 460, height: 520, minWidth: 380, minHeight: 320, maximizable: false });
  const eng = engine();
  if (!eng) {
    win.body.append(h('p', { class: 'au-empty' }, t('needsNewer')));
    return win;
  }
  let running = false;
  let control = null;
  let resume = null;

  const top = h('div', { class: 'rn-top' });
  const list = h('div', { class: 'rn-list', role: 'list' });
  const panel = h('div', { class: 'rn-panel', hidden: true });
  const pause = h('button', { class: 'ctl-btn', type: 'button' });
  const stop = h('button', { class: 'ctl-btn danger', type: 'button' }, icon('stop'), t('run.stop'));
  const foot = h('div', { class: 'rn-foot' }, pause, h('span', { class: 'au-grow' }), stop);
  const root = h('div', { class: 'rn' }, top, list, panel, foot);
  win.body.append(root);

  pause.addEventListener('click', () => {
    if (!control) return;
    if (control.paused) { resume?.(); control.paused = null; }
    else control.paused = new Promise(r => { resume = r; });
    drawPause();
  });
  stop.addEventListener('click', () => {
    if (!running) return win.emit('close');
    control.stopped = true;
    resume?.();
    answer?.('stop');
  });
  const drawPause = () => pause.replaceChildren(icon(control?.paused ? 'play' : 'pause'), control?.paused ? t('run.resume') : t('run.pause'));

  // The panel inside the window for a question; answer() closes it with the reply
  let answer = null;
  const askPanel = (content, buttons) => new Promise(resolve => {
    answer = value => { answer = null; panel.hidden = true; panel.replaceChildren(); resolve(value); };
    panel.replaceChildren(...content, h('div', { class: 'rn-actions' }, buttons));
    panel.hidden = false;
    (panel.querySelector('input, select, button.primary') ?? panel.querySelector('button'))?.focus();
  });

  const stepHead = (kind, title, sub) => h('div', { class: 'rn-ask-head' }, h('span', { class: `rn-bub ${kind}` }, icon(kind === 'ak' ? 'pencil' : 'help')), h('div', {}, h('b', {}, title), h('small', {}, sub)));
  const itemName = id => (id && fs.exists(id) ? fs.get(id).name : '');

  /**
   * A control for a value asked, by the type of the param (the shared paramControl). Several
   * files and numbers are always needed, as before; a choice has no empty entry.
   */
  const inputFor = (p, value, label) => paramControl(
    p.type === 'files' || p.type === 'number' ? { ...p, required: true } : p,
    (p.type === 'file' || p.type === 'folder') && Array.isArray(value) ? value[0] : value,
    { t, label, empty: false, pickFile: options => system.pickFile?.(openWindow, options) ?? null },
  );

  const ui = {
    ask: ({ step, index, item, fields }) => {
      const inputs = fields.map(f => ({ f, ...inputFor(f.param, f.value, f.question) }));
      let remember = false;
      const many = (control.items ?? 0) > 1;
      const fail = h('p', { class: 'au-error', role: 'alert' });
      const go = h('button', { class: 'ctl-btn primary', type: 'button' }, t('run.continue'));
      go.addEventListener('click', () => {
        const problem = inputs.map(i => i.check()).find(Boolean);
        if (problem) return void (fail.textContent = problem);
        answer({ values: Object.fromEntries(inputs.map(i => [i.f.name, i.get()])), remember });
      });
      panel.onkeydown = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') go.click(); };
      return askPanel([
        stepHead('ak', actionLabel(step.action), [t('run.stepOf', { n: index + 1, total: control.total }), itemName(item)].filter(Boolean).join(' · ')),
        ...inputs.map(i => h('div', { class: 'au-q' }, h('span', {}, i.f.question), i.el,
          i.f.param.type !== 'secret' && i.f.value != null ? h('small', { class: 'au-hint' }, t('run.recorded', { value: valueText(step.action, i.f.name, i.f.param, i.f.value) })) : null)),
        many && !fields.some(f => f.param.type === 'secret') ? checkbox({ value: false, label: t('run.remember'), onChange: v => { remember = v; } }) : null,
        fail,
      ].filter(Boolean), [
        h('button', { class: 'ctl-btn danger', type: 'button', onclick: () => answer('stop') }, t('run.stop')),
        h('span', { class: 'au-grow' }),
        h('button', { class: 'ctl-btn', type: 'button', onclick: () => answer('skip') }, t('run.skip')),
        go,
      ]);
    },
    confirm: ({ step, index, item, params, file }) => {
      const def = automation.describe(step.action);
      const lines = Object.entries(def?.params ?? {}).filter(([name]) => params[name] !== undefined && params[name] !== null && !(Array.isArray(params[name]) && !params[name].length))
        .map(([name, p]) => h('div', { class: 'rn-line' }, h('span', {}, paramLabel(step.action, name, p)), h('code', {}, shown(step.action, name, p, params[name]))));
      if (file) lines.unshift(h('div', { class: 'rn-line' }, h('span', {}, t('field.file')), h('code', {}, homePath(file))));
      return askPanel([
        stepHead('cf', t('run.confirm', { step: actionLabel(step.action) }), [t('run.stepOf', { n: index + 1, total: control.total }), itemName(item)].filter(Boolean).join(' · ')),
        h('div', { class: 'rn-preview' }, lines),
      ], [
        h('button', { class: 'ctl-btn danger', type: 'button', onclick: () => answer('stop') }, t('run.stopAll')),
        h('span', { class: 'au-grow' }),
        h('button', { class: 'ctl-btn', type: 'button', onclick: () => answer('skip') }, t('run.skip')),
        h('button', { class: 'ctl-btn primary', type: 'button', onclick: () => answer('run') }, icon('play'), t('run.run')),
      ]);
    },
    failed: ({ step, index, error }) => askPanel([
      stepHead('cf', t('run.failed', { step: actionLabel(step.action) }), t('run.stepOf', { n: index + 1, total: control.total })),
      h('p', { class: 'au-error' }, error.message),
    ], [
      h('button', { class: 'ctl-btn danger', type: 'button', onclick: () => answer('stop') }, t('run.stop')),
      h('span', { class: 'au-grow' }),
      h('button', { class: 'ctl-btn', type: 'button', onclick: () => answer('skip') }, t('run.skip')),
      h('button', { class: 'ctl-btn primary', type: 'button', onclick: () => answer('retry') }, t('run.retry')),
    ]),
    progress: e => progress(e),
  };

  /** A value of the confirmation, with node ids as their paths. */
  function shown(action, name, p, v) {
    const where = id => homePath(id) || (fs.isTrashed(id) ? t('value.inTrash', { name: fs.trashed().find(n => n.id === id)?.name ?? '' }) : t('value.gone'));
    if (p.type === 'file' || p.type === 'folder') return where(v);
    if (p.type === 'files') return v.length > 3 ? t('value.items', { n: v.length }) : v.map(where).join(', ');
    if (p.type === 'places') return t('value.places', { n: v.length });
    return valueText(action, name, p, v);
  }

  // ---------- Progress ----------

  let doc = null, rows = [], bar = null, label = null, itemLine = null;
  function drawTop(name) {
    bar = h('i');
    label = h('span', { class: 'r' });
    itemLine = h('div', { class: 'rn-item' });
    top.replaceChildren(h('div', { class: 'rn-l1' }, h('b', {}, name), label), h('div', { class: 'rn-bar' }, bar), itemLine);
  }
  function drawSteps(from, last) {
    rows = doc.steps.map((s, i) => {
      const def = automation.describe(s.action);
      const b = h('span', { class: 'au-badge' }, icon(appGlyph(def?.app, s.action)));
      b.style.background = appColor(def?.app);
      const st = h('span', { class: 'st' });
      const mark = h('span', { class: 'mk todo' }, icon('check'));
      const row = h('div', { class: `rn-row${s.enabled && i >= from && i < last ? '' : ' dim'}`, role: 'listitem' }, mark, b, h('span', { class: 'nm' }, actionLabel(s.action)), st);
      if (!s.enabled) st.textContent = t('run.off');
      return { row, st, mark };
    });
    list.replaceChildren(...rows.map(r => r.row));
  }
  const setRow = (i, cls, text, glyph = 'check') => {
    const r = rows[i];
    if (!r) return;
    r.row.classList.remove('cur');
    if (cls === 'cur') r.row.classList.add('cur');
    r.mark.className = `mk ${cls}`;
    r.mark.replaceChildren(cls === 'cur' ? h('span', { class: 'spin' }) : icon(glyph));
    r.st.textContent = text;
  };
  function progress(e) {
    if (e.type === 'item') {
      control.done = e.index;
      label.textContent = e.total > 1 ? t('run.itemOf', { n: e.index + 1, total: e.total }) : '';
      bar.style.width = `${Math.round((e.index / e.total) * 100)}%`;
      itemLine.textContent = e.item ? homePath(e.item) : '';
      rows.forEach((r, i) => { if (doc.steps[i].enabled) setRow(i, 'todo', ''); });
    } else if (e.type === 'step') setRow(e.index, 'cur', '');
    else if (e.type === 'done') setRow(e.index, 'ok', '');
    else if (e.type === 'skipped') { if (e.reason === 'user') setRow(e.index, 'skip', t('run.skipped'), 'arrowRight'); }
    else if (e.type === 'failed') setRow(e.index, 'err', e.error ?? '', 'warning');
    else if (e.type === 'end') bar.style.width = '100%';
  }

  // ---------- Start ----------

  async function start(a) {
    if (running) return void notifications.send({ app: 'automata', text: t('run.busy'), level: 'warning' }).catch(() => {});
    const id = a?.automation;
    if (!id || !fs.exists(id)) return void list.replaceChildren(h('p', { class: 'au-error' }, t('run.missing')));
    try {
      doc = await load(id);
    } catch (err) {
      return void list.replaceChildren(h('p', { class: 'au-error' }, t('error.open', { error: err.message })));
    }
    win.setTitle(`${t('run.title')} — ${doc.name}`);
    drawTop(doc.name);
    const from = Number.isInteger(a.from) ? a.from : 0;
    const last = a.only ? from + 1 : doc.steps.length;
    drawSteps(from, last);
    let items = (Array.isArray(a.items) ? a.items : []).filter(x => fs.exists(x));
    if (doc.input !== 'none' && !items.length) {
      items = await chooseItems();
      if (!items) return win.emit('close');
    }
    running = true;
    control = { stopped: false, paused: null, items: doc.input === 'files' ? items.length : 1, total: doc.steps.length };
    drawPause();
    stop.replaceChildren(icon('stop'), t('run.stop'));
    let result;
    try {
      result = await eng.run(doc, { items, values: a.values ?? {}, ui, control, from, only: !!a.only });
    } catch (err) {
      result = { error: err.message };
    }
    running = false;
    answer = null;
    panel.hidden = true;
    pause.hidden = true;
    stop.replaceChildren(t('action.close'));
    stop.classList.remove('danger');
    const text = result.error ? t('run.endError', { name: doc.name, error: result.error })
      : result.stopped ? t('run.endStopped', { name: doc.name })
        : t('run.end', { name: doc.name, n: result.items, skipped: result.skipped + result.failed });
    itemLine.textContent = text;
    itemLine.classList.toggle('bad', !!result.error);
    notifications.send({ app: 'automata', text, level: result.error ? 'error' : result.stopped ? 'warning' : 'success' }).catch(() => {});
  }

  /** The files (or the folder) to work on, when none was given. Resolves with ids, or null. */
  function chooseItems() {
    const chosen = [];
    const names = h('div', { class: 'rn-chosen' });
    const go = h('button', { class: 'ctl-btn primary', type: 'button', disabled: true }, icon('play'), t('run.start'));
    const add = h('button', { class: 'ctl-btn', type: 'button' }, icon('plus'), doc.input === 'folder' ? t('run.chooseFolder') : t('run.addFile'));
    const redraw = () => {
      names.replaceChildren(...chosen.map(id => h('div', { class: 'rn-line' }, icon(doc.input === 'folder' ? 'folder' : 'file'), h('code', {}, homePath(id)))));
      go.disabled = !chosen.length;
      add.hidden = doc.input === 'folder' && chosen.length > 0;
    };
    add.addEventListener('click', async () => {
      const node = await system.pickFile?.(openWindow, { kind: doc.input === 'folder' ? 'folder' : 'file', exts: doc.launch.ext.length ? doc.launch.ext : null, title: t('run.chooseTitle') });
      if (node && !chosen.includes(node.id)) chosen.push(node.id);
      redraw();
    });
    redraw();
    return new Promise(resolve => {
      answer = v => { answer = null; panel.hidden = true; panel.replaceChildren(); resolve(v); };
      go.addEventListener('click', () => answer([...chosen]));
      panel.replaceChildren(h('p', {}, doc.input === 'folder' ? t('run.needFolder') : t('run.needFiles')), names,
        h('div', { class: 'rn-actions' }, add, h('span', { class: 'au-grow' }), h('button', { class: 'ctl-btn', type: 'button', onclick: () => answer(null) }, t('action.cancel')), go));
      panel.hidden = false;
      add.focus();
    });
  }

  win.on('launch', start);
  // Not opened again by itself (a workarea, the next login): it would run the automation again
  win.getState = () => ({ restored: true });
  if (args?.restored) {
    setTimeout(() => win.emit('close'), 0);
    return win;
  }
  // Closed while running (by the user, or by lilOS): the run stops at the next step
  const halt = () => {
    if (!running) return true;
    control.stopped = true;
    resume?.();
    answer?.('stop');
    return true;
  };
  win.canClose = halt;
  win.on('destroy', halt);
  start(args);
  return win;
}
