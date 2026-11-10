import { Window, h, icon, fs, schedule, session, messageBox, textField, checkbox, selectField, segmented, radios } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t, i18n } from './i18n.js';
import { paramsForm } from '../shared/paramsForm.js';
import { KINDS, kindOf, whatText, nodeLabel, placeOf, browserZone, localNow, when as whenText } from './model.js';

/** replaceChildren without the nulls and falses (h() skips them, the DOM would write them). */
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));

/**
 * A new operation, or one to change, in three steps: Cosa (the action and its values), Quando
 * (one time, repeated, or cron), Opzioni (missed times, overlaps, time limit, retries, when to
 * tell, and for admins who it runs as). On the right, always: the rule in words, the next times
 * and the rule as cron. Saving checks everything again in the kernel.
 *
 *   openEditor(openWindow, { id?, copy?, prefill? })        from the Scheduler's windows
 *   createEditorWindow({ args, openWindow })                the 'edit' and 'create' entry points:
 *     args { id }                                           an operation to change
 *     args { files: [id], action }                          from the menu of a file or folder (Pianifica…)
 *     args { when: { once } | rule, what?, name? }          from another app (a calendar's free slot;
 *                                                           Automata: what { type: 'automation', file }; NetTest: what
 *                                                           { type: 'collection', file, environment, only? })
 */
const UNITS = ['minute', 'hour', 'day', 'week', 'month', 'year'];
const DAYS = [1, 2, 3, 4, 5, 6, 7];
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = v => JSON.parse(JSON.stringify(v));

export function openEditor(openWindow, options = {}) {
  openWindow(editorWindow(options, openWindow));
}

export function createEditorWindow({ args = {}, openWindow } = {}) {
  const a = plain(args) ? args : {};
  if (typeof a.id === 'string') return editorWindow({ id: a.id }, openWindow);
  return editorWindow({ prefill: prefillFrom(a) }, openWindow);
}

/** What the menu of a file or folder, or another app, asks for. */
function prefillFrom(a) {
  const node = Array.isArray(a.files) && a.files.length ? fs.get(a.files[0]) : null;
  const out = {};
  if (node) {
    const label = nodeLabel(node.id);
    if (a.action === 'scheduler.copyFolder') out.what = { type: 'copy', from: placeOf(node.id), to: null, mode: 'versions', keep: 7, exclude: [] };
    else if (a.action === 'scheduler.commandHere') out.what = { type: 'command', lines: '', cwd: node.id, cwdLabel: label, host: null, saveTo: null };
    else if (a.action === 'scheduler.runAutomation') out.what = { type: 'automation', file: node.id, label };
    else if (a.action === 'scheduler.remind') out.what = { type: 'notify', text: node.name, level: 'info', open: { file: node.id, label } };
    else out.what = { type: 'open', file: node.id, label };
    out.name = node.name;
  }
  // Another app's proposal (Automata: { type: 'automation', file, label }); the kernel checks it again
  if (plain(a.what) && KINDS.some(k => k.type === a.what.type)) {
    out.what = a.what;
    if ((a.what.type === 'automation' || a.what.type === 'collection') && typeof a.what.file === 'string' && !a.what.label) out.what = { ...a.what, label: nodeLabel(a.what.file) };
  }
  if (typeof a.name === 'string') out.name = a.name;
  if (typeof a.from === 'string') out.from = a.from;
  if (plain(a.when)) out.when = a.when;
  return out;
}

const defaultWhat = type => ({
  notify: { type, text: '', level: 'info', open: null },
  service: { type, app: '', entry: '', params: {} },
  copy: { type, from: null, to: null, mode: 'versions', keep: 7, exclude: [] },
  command: { type, lines: '', cwd: null, cwdLabel: '', host: null, hostLabel: '', saveTo: null },
  web: { type, method: 'GET', url: 'https://', headers: [], body: { kind: 'none' }, expect: { status: '2xx', contains: null }, timeoutS: 30, saveTo: null },
  open: { type, app: '', entry: 'main', args: null },
  automation: { type, file: null, label: '' },
  collection: { type, file: null, label: '', environment: null, environmentLabel: '', only: null },
}[type]);

/** The «Quando» form from a rule (and back: ruleOf). */
function formOf(rule) {
  const tz = rule?.tz ?? browserZone();
  const f = {
    mode: 'repeat', tz, once: localNow(60), start: localNow(), every: { n: 1, unit: 'day' }, days: [new Date().getDay() || 7],
    times: [localNow().slice(11)], between: null, monthly: { kind: 'day', day: new Date().getDate(), nth: 1, weekday: 1 }, month: new Date().getMonth() + 1,
    endKind: 'never', end: '', count: 10, cron: '0 9 * * 1-5', skip: [], extra: [],
  };
  if (!rule) return f;
  if (rule.once) return { ...f, mode: 'once', once: rule.once };
  Object.assign(f, { start: rule.start, skip: rule.skip ?? [], extra: rule.extra ?? [] });
  if (rule.end) Object.assign(f, { endKind: 'date', end: rule.end });
  else if (rule.count) Object.assign(f, { endKind: 'count', count: rule.count });
  if (rule.cron) return { ...f, mode: 'cron', cron: rule.cron };
  f.every = { ...rule.every };
  if (rule.days) f.days = [...rule.days];
  if (rule.times) f.times = [...rule.times];
  if (rule.between) f.between = [...rule.between];
  if (rule.monthly) f.monthly = rule.monthly.day === -1 ? { ...f.monthly, kind: 'last' } : rule.monthly.day !== undefined ? { ...f.monthly, kind: 'day', day: rule.monthly.day } : { ...f.monthly, kind: 'nth', nth: rule.monthly.nth, weekday: rule.monthly.weekday };
  if (rule.month) f.month = rule.month;
  return f;
}

function ruleOf(f) {
  if (f.mode === 'once') return { once: f.once, tz: f.tz };
  const r = { tz: f.tz, start: f.start };
  if (f.endKind === 'date' && f.end) r.end = f.end;
  if (f.endKind === 'count') r.count = Number(f.count);
  if (f.skip?.length) r.skip = f.skip;
  if (f.extra?.length) r.extra = f.extra;
  if (f.mode === 'cron') return { ...r, cron: f.cron };
  const unit = f.every.unit;
  r.every = { n: Number(f.every.n), unit };
  if (unit === 'week' || ((unit === 'minute' || unit === 'hour') && f.days.length && f.days.length < 7)) r.days = [...f.days];
  if (unit === 'minute' || unit === 'hour') { if (f.between) r.between = f.between; } else r.times = [...f.times];
  if (unit === 'month' || unit === 'year') {
    const m = f.monthly;
    r.monthly = m.kind === 'last' ? { day: -1 } : m.kind === 'day' ? { day: Number(m.day) } : { nth: Number(m.nth), weekday: Number(m.weekday) };
  }
  if (unit === 'year') r.month = Number(f.month);
  return r;
}

function editorWindow({ id = null, copy = null, prefill = {} }, openWindow) {
  const editing = typeof id === 'string';
  const win = new Window({ title: editing ? t('editor.titleEdit') : t('editor.titleNew'), icon: 'clock', width: 880, height: 600, minWidth: 700, minHeight: 480 });
  const draft = {
    name: prefill.name ?? '', enabled: true, owner: null,
    what: prefill.what ? { ...defaultWhat(prefill.what.type), ...clone(prefill.what) } : defaultWhat('notify'),
    form: formOf(prefill.when ? (prefill.when.tz ? prefill.when : { ...prefill.when, tz: browserZone() }) : null),
    options: { missed: 'once', overlap: 'skip', timeoutMin: 60, retries: 0, retryMin: 5, notify: 'error', ask: true },
  };
  if (prefill.when?.once) draft.form.mode = 'once';
  let step = prefill.what ? 1 : 0;
  let catalog = { services: [], hosts: [], users: [], runtime: false };
  let admin = false;
  let loaded = !editing && !copy;
  let error = '';

  const steps = h('div', { class: 'sce-steps', role: 'tablist' });
  const mainEl = h('div', { class: 'sce-main' });
  const sideEl = h('aside', { class: 'sce-side', 'aria-live': 'polite' });
  const errEl = h('p', { class: 'sce-error', role: 'alert' });
  const foot = h('div', { class: 'sce-foot' });
  win.body.append(h('div', { class: 'sce' }, steps, h('div', { class: 'sce-body' }, mainEl, sideEl), errEl, foot));

  // ---------- Loading ----------

  (async () => {
    try {
      const [cat, overview] = await Promise.all([schedule.catalog(), schedule.overview()]);
      catalog = cat;
      admin = overview.admin;
      const source = editing ? id : copy;
      if (source) {
        const task = await schedule.get(source);
        draft.name = copy ? t('editor.copyOf', { name: task.name }) : task.name;
        draft.enabled = task.enabled;
        draft.owner = task.owner;
        draft.what = clone(task.what);
        draft.form = formOf(task.when);
        draft.options = { ...draft.options, ...task.options };
        draft.app = task.app;
      }
    } catch (err) {
      error = err.message;
    }
    loaded = true;
    draw();
  })();

  // ---------- Drawing ----------

  // A <label> only around one input: a group of buttons or radios inside one would take its clicks
  const field = (label, control, hint) => h(control?.matches?.('input, select, textarea') ? 'label' : 'div', { class: 'sce-field' },
    h('span', { class: 'sce-label' }, label), control, hint ? h('small', { class: 'sce-hint' }, hint) : null);
  // The SDK's controls; text fields change the draft at each key (the side follows)
  const input = (value, onChange, { small = false, ...options } = {}) => textField({ ...options, value: value ?? '', onInput: onChange, className: small ? 'sce-small' : '' });
  const area = (value, onChange, { rows, mono = false, placeholder = null, maxLength = null } = {}) => {
    const el = h('textarea', { class: `ctl-text${mono ? ' mono' : ''}`, rows, placeholder, maxlength: maxLength, spellcheck: 'false' });
    el.value = value ?? '';
    el.addEventListener('input', () => onChange(el.value));
    return el;
  };
  // aria: the name of a check box drawn without its label (the field's says it)
  const check = (value, onChange, label, aria = null) => {
    const el = checkbox({ value, onChange, label });
    if (aria) el.querySelector('input').setAttribute('aria-label', aria);
    return el;
  };
  const select = (value, options, onChange, label) => selectField({ value: String(value), options: options.map(o => ({ ...o, value: String(o.value) })), onChange, label });
  const seg = (value, options, onChange) => segmented({ value, options, onChange });
  const radio = (value, options, onChange) => radios({ value, options, onChange });
  const pick = async (kind, title, exts = null) => system.pickFile(openWindow, { kind, title, ...(exts && { exts }) });
  const placeButton = (place, title, onPick) => h('div', { class: 'sce-place' },
    h('span', { class: 'ctl-text sce-path' }, icon(place?.mount ? 'globe' : 'folder'), place?.label || h('span', { class: 'sce-ph' }, t('editor.choose'))),
    h('button', { class: 'ctl-btn', type: 'button', onclick: async () => { const node = await pick('folder', title); if (node) onPick(placeOf(node.id)); } }, t('editor.choose')));

  function draw() {
    const names = [t('step.what'), t('step.when'), t('step.options')];
    fill(steps, ...names.map((n, i) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(i === step), class: i < step ? 'done' : '',
      onclick: () => { step = i; draw(); },
    }, h('i', {}, i < step ? '✓' : String(i + 1)), n)));
    if (!loaded) { fill(mainEl, h('p', { class: 'sce-hint' }, t('editor.loading'))); return; }
    fill(mainEl, ...(prefill.from ? [h('p', { class: 'sce-warn' }, icon('info'), t('editor.proposedBy', { app: system.getApp(prefill.from)?.name ?? prefill.from }))] : []), ...[stepWhat, stepWhen, stepOptions][step]());
    drawSide();
    errEl.textContent = error;
    const back = h('button', { class: 'ctl-btn', type: 'button', disabled: step === 0, onclick: () => { step--; draw(); } }, t('editor.back'));
    const next = step < 2
      ? h('button', { class: 'ctl-btn vio', type: 'button', onclick: () => { if (step === 0 && !draft.name.trim()) draft.name = suggestName(); step++; draw(); } }, t('editor.next'))
      : h('button', { class: 'ctl-btn vio', type: 'button', onclick: save }, icon('check'), editing ? t('editor.save') : t('editor.create'));
    fill(foot, back, h('span', { class: 'sc-grow' }), h('button', { class: 'ctl-btn', type: 'button', onclick: () => win.emit('close') }, t('editor.cancel')), next);
  }

  const redraw = () => draw();
  const sideOnly = () => drawSide();

  function suggestName() {
    const w = draft.what;
    if (w.type === 'notify' && w.text) return w.text.slice(0, 60);
    if (w.type === 'copy' && w.from?.label) return t('editor.suggest.copy', { from: w.from.label.split('/').pop() || w.from.label });
    return whatText(w, catalog).slice(0, 60) || t(`kind.${w.type}.name`);
  }

  // ---------- Step 1: what ----------

  function stepWhat() {
    const automataThere = system.isInstalled('automata');
    const nettestThere = system.isInstalled('nettest');
    const types = h('div', { class: 'sce-types', role: 'radiogroup', 'aria-label': t('step.what') }, KINDS.map(k => {
      const off = (k.type === 'automation' && !automataThere) || (k.type === 'collection' && !nettestThere) || (k.type === 'service' && (!catalog.runtime || !catalog.services.length)) || (draft.app && !['notify', 'service', 'open'].includes(k.type));
      return h('button', {
        type: 'button', role: 'radio', class: `sce-type${draft.what.type === k.type ? ' on' : ''}`, 'aria-checked': String(draft.what.type === k.type), disabled: off || (editing && draft.what.type !== k.type && !!draft.app),
        onclick: () => { if (draft.what.type !== k.type) { draft.what = defaultWhat(k.type); redraw(); } },
      }, h('span', { class: `sc-kico k-${k.type}` }, icon(k.glyph)),
      h('b', {}, t(`kind.${k.type}.name`)),
      h('span', { class: `sc-where${k.where === 'browser' ? ' br' : ''}` }, t(`where.${k.where}`)),
      h('small', {}, off && (k.type === 'automation' || k.type === 'collection') ? t(`kind.${k.type}.missing`) : t(`kind.${k.type}.hint`)));
    }));
    return [h('div', { class: 'sce-what' }, types, h('div', { class: 'sce-form' }, ...formFor(draft.what)))];
  }

  function formFor(w) {
    if (w.type === 'notify') {
      const openKind = w.open?.file !== undefined ? 'file' : w.open?.app ? 'app' : 'none';
      const apps = system.installedApps().filter(a => a.id !== 'scheduler');
      return [
        field(t('notify.text'), area(w.text, v => { w.text = v; sideOnly(); }, { rows: 3, maxLength: 300 })),
        field(t('notify.level'), select(w.level, ['info', 'success', 'warning', 'error'].map(v => ({ value: v, label: t(`level.${v}`) })), v => { w.level = v; })),
        field(t('notify.open'), seg(openKind, [{ value: 'none', label: t('notify.openNone') }, { value: 'file', label: t('notify.openFile') }, { value: 'app', label: t('notify.openApp') }], v => {
          w.open = v === 'none' ? null : v === 'file' ? { file: undefined, label: '' } : { app: apps[0]?.id ?? '', entry: 'main', args: null };
          redraw();
        })),
        openKind === 'file' ? field(t('notify.file'), h('div', { class: 'sce-place' },
          h('span', { class: 'ctl-text sce-path' }, icon('file'), w.open.label || h('span', { class: 'sce-ph' }, t('editor.choose'))),
          h('button', { class: 'ctl-btn', type: 'button', onclick: async () => { const node = await pick('file', t('notify.file')); if (node) { w.open = { file: node.id, label: nodeLabel(node.id) }; redraw(); } } }, t('editor.choose')))) : null,
        openKind === 'app' ? field(t('notify.app'), select(w.open.app, apps.map(a => ({ value: a.id, label: a.name })), v => { w.open = { app: v, entry: 'main', args: null }; })) : null,
      ];
    }
    if (w.type === 'service') {
      const list = catalog.services.filter(s => !draft.app || s.app === draft.app);
      if (!w.app && list[0]) Object.assign(w, { app: list[0].app, entry: list[0].entry, params: {} });
      const service = list.find(s => s.app === w.app && s.entry === w.entry);
      return [
        field(t('service.which'), select(`${w.app}#${w.entry}`, list.map(s => ({ value: `${s.app}#${s.entry}`, label: `${s.name} · ${s.label}` })), v => {
          const [app, entry] = v.split('#');
          Object.assign(w, { app, entry, params: {} });
          redraw();
        })),
        service?.params && Object.keys(service.params).length
          ? paramsForm(service.params, w.params, { t, pathAs: 'tilde', live: true, pickFile: options => pick(options.kind, options.title), onChange: next => { w.params = next; } }).el
          : h('p', { class: 'sce-hint' }, t('service.noParams')),
        h('p', { class: 'sce-hint' }, t('service.hint')),
      ];
    }
    if (w.type === 'copy') {
      return [
        h('div', { class: 'sce-two' },
          field(t('copy.from'), placeButton(w.from, t('copy.from'), p => { w.from = p; redraw(); })),
          field(t('copy.to'), placeButton(w.to, t('copy.to'), p => { w.to = p; redraw(); }))),
        field(t('copy.how'), radio(w.mode, [
          { value: 'versions', label: t('copy.versions', { keep: w.keep }) },
          { value: 'update', label: t('copy.update') },
          { value: 'mirror', label: t('copy.mirror') },
        ], v => { w.mode = v; redraw(); })),
        w.mode === 'versions' ? field(t('copy.keep'), input(w.keep, v => { w.keep = Math.max(1, Math.min(100, Number(v) || 1)); }, { type: 'number', min: 1, max: 100 })) : null,
        field(t('copy.exclude'), input(w.exclude.join(', '), v => { w.exclude = v.split(',').map(x => x.trim()).filter(Boolean); }, { placeholder: '*.tmp, ~$*, .cache' }), t('copy.excludeHint')),
        h('p', { class: 'sce-hint' }, t('copy.hint')),
      ];
    }
    if (w.type === 'command') {
      const ssh = !!w.host || w._ssh;
      return [
        field(t('command.where'), seg(ssh ? 'ssh' : 'lilos', [{ value: 'lilos', label: t('command.inLilos') }, { value: 'ssh', label: t('command.onSsh'), disabled: !catalog.hosts.length }], v => {
          if (v === 'ssh') { w._ssh = true; w.host = catalog.hosts[0]?.id ?? null; w.hostLabel = catalog.hosts[0]?.name ?? ''; w.cwd = null; }
          else { w._ssh = false; w.host = null; w.hostLabel = ''; }
          redraw();
        })),
        ssh ? field(t('command.host'), select(w.host, catalog.hosts.map(x => ({ value: x.id, label: `${x.name} · ${x.address}` })), v => { w.host = v; w.hostLabel = catalog.hosts.find(x => x.id === v)?.name ?? ''; })) : null,
        field(t('command.lines'), area(w.lines, v => { w.lines = v; sideOnly(); }, { rows: 6, mono: true, placeholder: t('command.placeholder') }), ssh ? t('command.sshHint') : t('command.hint')),
        ssh ? null : field(t('command.cwd'), h('div', { class: 'sce-place' },
          h('span', { class: 'ctl-text sce-path' }, icon('folder'), w.cwdLabel || '~'),
          h('button', { class: 'ctl-btn', type: 'button', onclick: async () => { const node = await pick('folder', t('command.cwd')); if (node) { w.cwd = node.id; w.cwdLabel = nodeLabel(node.id); redraw(); } } }, t('editor.choose')))),
        saveToField(w, ['replace', 'append']),
      ];
    }
    if (w.type === 'web') {
      const headers = h('div', { class: 'sce-headers' }, w.headers.map((hd, i) => h('div', { class: 'sce-header' },
        input(hd.name, v => { hd.name = v; }, { placeholder: t('web.headerName'), label: t('web.headerName') }),
        hd.secret && hd.set && hd.value === undefined
          ? h('span', { class: 'ctl-text sce-secret' }, '••••••••', h('button', { class: 'sc-link', type: 'button', onclick: () => { hd.value = ''; hd.set = false; redraw(); } }, t('web.change')))
          : input(hd.value ?? '', v => { hd.value = v; }, { placeholder: t('web.headerValue'), label: t('web.headerValue'), type: hd.secret ? 'password' : 'text' }),
        Object.assign(check(hd.secret, v => { hd.secret = v; redraw(); }, [icon('lock'), t('web.secret')]), { title: t('web.secretHint') }),
        h('button', { class: 'sc-icon', type: 'button', title: t('web.removeHeader'), 'aria-label': t('web.removeHeader'), onclick: () => { w.headers.splice(i, 1); redraw(); } }, icon('x')))));
      const statusValue = typeof w.expect.status === 'number' ? 'n' : w.expect.status;
      return [
        h('div', { class: 'sce-url' },
          select(w.method, ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => ({ value: m, label: m })), v => { w.method = v; if (v === 'GET' || v === 'HEAD') w.body = { kind: 'none' }; redraw(); }, t('web.method')),
          input(w.url, v => { w.url = v.trim(); sideOnly(); }, { type: 'url', label: t('web.url'), placeholder: 'https://…' })),
        field(t('web.headers'), h('div', {}, headers, h('button', { class: 'ctl-btn', type: 'button', onclick: () => { w.headers.push({ name: '', value: '', secret: false }); redraw(); } }, icon('plus'), t('web.addHeader')))),
        w.method !== 'GET' && w.method !== 'HEAD' ? field(t('web.body'), h('div', {},
          select(w.body.kind, ['none', 'text', 'json', 'form'].map(k => ({ value: k, label: t(`web.body.${k}`) })), v => { w.body = v === 'none' ? { kind: 'none' } : { kind: v, text: w.body.text ?? '' }; redraw(); }, t('web.body')),
          w.body.kind !== 'none' ? area(w.body.text, v => { w.body.text = v; }, { rows: 4, mono: true }) : null)) : null,
        h('div', { class: 'sce-two' },
          field(t('web.status'), h('div', { class: 'sce-line' },
            select(statusValue, [{ value: '2xx', label: '200–299' }, { value: 'any', label: t('web.anyStatus') }, { value: 'n', label: t('web.exactStatus') }], v => { w.expect.status = v === 'n' ? 200 : v; redraw(); }, t('web.status')),
            statusValue === 'n' ? input(w.expect.status, v => { w.expect.status = Number(v) || 200; }, { type: 'number', min: 100, max: 599, small: true }) : null)),
          field(t('web.contains'), input(w.expect.contains ?? '', v => { w.expect.contains = v || null; }, { placeholder: t('web.containsPh') }))),
        field(t('web.timeout'), h('div', { class: 'sce-line' }, input(w.timeoutS, v => { w.timeoutS = Math.max(1, Math.min(300, Number(v) || 30)); }, { type: 'number', min: 1, max: 300, small: true }), h('span', {}, t('web.seconds')))),
        saveToField(w, ['replace', 'dated']),
        h('p', { class: 'sce-hint' }, t('web.hint')),
      ];
    }
    if (w.type === 'open') {
      const kind = w.file !== undefined && w.file !== null ? 'file' : 'app';
      const apps = system.installedApps().filter(a => a.id !== 'scheduler' && (!draft.app || a.id === draft.app));
      if (kind === 'app' && !w.app && apps[0]) { w.app = apps[0].id; w.label = apps[0].name; }
      return [
        field(t('open.what'), seg(kind, [{ value: 'app', label: t('open.app') }, { value: 'file', label: t('open.file'), disabled: !!draft.app }], v => {
          draft.what = v === 'file' ? { type: 'open', file: null, label: '' } : defaultWhat('open');
          redraw();
        })),
        kind === 'app'
          ? field(t('open.app'), select(w.app, apps.map(a => ({ value: a.id, label: a.name })), v => { w.app = v; w.label = apps.find(a => a.id === v)?.name ?? v; sideOnly(); }))
          : field(t('open.file'), h('div', { class: 'sce-place' },
            h('span', { class: 'ctl-text sce-path' }, icon('file'), w.label || h('span', { class: 'sce-ph' }, t('editor.choose'))),
            h('button', { class: 'ctl-btn', type: 'button', onclick: async () => { const node = await pick('file', t('open.file')); if (node) { w.file = node.id; w.label = nodeLabel(node.id); redraw(); } } }, t('editor.choose')))),
        h('p', { class: 'sce-warn' }, icon('window'), t('open.browserHint')),
      ];
    }
    if (w.type === 'collection') return collectionForm(w);
    // automation
    return [
      field(t('automation.file'), h('div', { class: 'sce-place' },
        h('span', { class: 'ctl-text sce-path' }, icon('automation'), w.label || h('span', { class: 'sce-ph' }, t('editor.choose'))),
        h('button', { class: 'ctl-btn', type: 'button', onclick: async () => { const node = await pick('file', t('automation.file'), ['automata']); if (node) { w.file = node.id; w.label = nodeLabel(node.id); redraw(); } } }, t('editor.choose')))),
      h('p', { class: 'sce-warn' }, icon('window'), t('automation.hint')),
    ];
  }

  /** A NetTest collection (.nettest) and the environment it runs with: the environments are the file's own. */
  function collectionForm(w) {
    const envs = h('select', { class: 'ctl-select', disabled: !w.file, onchange: e => { w.environment = e.target.value || null; w.environmentLabel = e.target.selectedOptions[0]?.dataset.name ?? ''; } },
      h('option', { value: '' }, t('collection.envNone')));
    if (w.file) {
      fs.read(w.file).then(text => {
        const list = JSON.parse(text)?.environments;
        for (const e of Array.isArray(list) ? list : []) {
          if (typeof e?.id === 'string') envs.append(h('option', { value: e.id, selected: e.id === w.environment, dataset: { name: String(e.name ?? '') } }, String(e.name ?? e.id)));
        }
      }).catch(() => {});
    }
    return [
      field(t('collection.file'), h('div', { class: 'sce-place' },
        h('span', { class: 'ctl-text sce-path' }, icon('bolt'), w.label || h('span', { class: 'sce-ph' }, t('editor.choose'))),
        h('button', { class: 'ctl-btn', type: 'button', onclick: async () => { const node = await pick('file', t('collection.file'), ['nettest']); if (node) { w.file = node.id; w.label = nodeLabel(node.id); w.environment = null; w.environmentLabel = ''; redraw(); } } }, t('editor.choose')))),
      field(t('collection.env'), envs),
      h('p', { class: 'sce-warn' }, icon('monitor'), t('collection.hint')),
    ];
  }

  function saveToField(w, modes) {
    const on = !!w.saveTo;
    return field(t('saveTo.title'), h('div', { class: 'sce-saveto' },
      check(on, v => { w.saveTo = v ? { folder: 'root', label: '~', name: w.type === 'web' ? 'risposta.txt' : 'output.txt', mode: modes[0] } : null; redraw(); }, t(w.type === 'web' ? 'saveTo.web' : 'saveTo.command')),
      on ? h('div', { class: 'sce-line' },
        h('button', { class: 'ctl-btn', type: 'button', onclick: async () => { const node = await pick('folder', t('saveTo.folder')); if (node && !fs.isRemote?.(node.id)) { w.saveTo.folder = node.id === fs.root ? 'root' : node.id; w.saveTo.label = nodeLabel(node.id); redraw(); } } }, icon('folder'), w.saveTo.label || '~'),
        input(w.saveTo.name, v => { w.saveTo.name = v.trim(); }, { label: t('saveTo.name') }),
        select(w.saveTo.mode, modes.map(m => ({ value: m, label: t(`saveTo.${m}`) })), v => { w.saveTo.mode = v; }, t('saveTo.mode'))) : null));
  }

  // ---------- Step 2: when ----------

  function stepWhen() {
    const f = draft.form;
    const parts = [seg(f.mode, [{ value: 'once', label: t('when.once') }, { value: 'repeat', label: t('when.repeat') }, { value: 'cron', label: t('when.cron') }], v => {
      // Ripeti ⇄ Avanzato: the rule goes along when it can
      if (v === 'cron' && f.mode === 'repeat') { const c = schedule.rules.toCron(safeRule()); if (c) f.cron = c; }
      if (v === 'repeat' && f.mode === 'cron') { const r = schedule.rules.fromCron(f.cron, { tz: f.tz, start: f.start }); if (r) Object.assign(f, formOf(r), { mode: 'repeat' }); }
      f.mode = v;
      redraw();
    })];
    if (f.mode === 'once') {
      parts.push(h('div', { class: 'sce-two' },
        field(t('when.date'), input(f.once.slice(0, 10), v => { f.once = `${v}T${f.once.slice(11)}`; sideOnly(); }, { type: 'date' })),
        field(t('when.time'), input(f.once.slice(11), v => { f.once = `${f.once.slice(0, 10)}T${v}`; sideOnly(); }, { type: 'time' }))));
    } else if (f.mode === 'cron') {
      parts.push(field(t('when.cronField'), input(f.cron, v => { f.cron = v; sideOnly(); }, { mono: true }), t('when.cronHint')));
    } else {
      const unit = f.every.unit;
      parts.push(field(t('when.every'), h('div', { class: 'sce-line' },
        input(f.every.n, v => { f.every.n = Math.max(1, Number(v) || 1); sideOnly(); }, { type: 'number', min: 1, small: true, label: t('when.n') }),
        select(unit, UNITS.map(u => ({ value: u, label: t(`unit.${u}`, { n: f.every.n }) })), v => { f.every.unit = v; redraw(); }, t('when.unit')))));
      if (unit === 'week' || unit === 'minute' || unit === 'hour') {
        parts.push(field(unit === 'week' ? t('when.on') : t('when.onlyDays'), h('div', { class: 'sce-days', role: 'group' }, DAYS.map(d => h('button', {
          type: 'button', 'aria-pressed': String(f.days.includes(d)), title: t(`day.${d}`),
          onclick: () => { f.days = f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort(); if (!f.days.length) f.days = [d]; redraw(); },
        }, t(`day.${d}.short`))))));
      }
      if (unit === 'minute' || unit === 'hour') {
        parts.push(field(t('when.between'), h('div', { class: 'sce-line' },
          check(!!f.between, v => { f.between = v ? ['09:00', '18:00'] : null; redraw(); }, null, t('when.between')),
          f.between ? input(f.between[0], v => { f.between[0] = v; sideOnly(); }, { type: 'time', label: t('when.from') }) : null,
          f.between ? h('span', {}, t('when.to')) : null,
          f.between ? input(f.between[1], v => { f.between[1] = v; sideOnly(); }, { type: 'time', label: t('when.until') }) : null)));
      } else {
        if (unit === 'month' || unit === 'year') {
          const m = f.monthly;
          parts.push(field(t('when.onDay'), h('div', { class: 'sce-line' },
            unit === 'year' ? select(f.month, Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: i18n.date(Date.UTC(2000, i, 1), { month: 'long', timeZone: 'UTC' }) })), v => { f.month = Number(v); sideOnly(); }, t('when.month')) : null,
            select(m.kind, [{ value: 'day', label: t('when.dayN') }, { value: 'last', label: t('when.lastDay') }, { value: 'nth', label: t('when.nthWeekday') }], v => { m.kind = v; redraw(); }, t('when.onDay')),
            m.kind === 'day' ? input(m.day, v => { m.day = Math.max(1, Math.min(31, Number(v) || 1)); sideOnly(); }, { type: 'number', min: 1, max: 31, small: true }) : null,
            m.kind === 'nth' ? select(m.nth, [1, 2, 3, 4, 5, -1].map(n => ({ value: n, label: t(`nth.${n}`) })), v => { m.nth = Number(v); sideOnly(); }, t('when.nth')) : null,
            m.kind === 'nth' ? select(m.weekday, DAYS.map(d => ({ value: d, label: t(`day.${d}`) })), v => { m.weekday = Number(v); sideOnly(); }, t('when.weekday')) : null)));
        }
        parts.push(field(t('when.at'), h('div', { class: 'sce-times' },
          f.times.map((time, i) => h('span', { class: 'sce-chip' },
            input(time, v => { f.times[i] = v; sideOnly(); }, { type: 'time', label: t('when.time') }),
            f.times.length > 1 ? h('button', { class: 'sc-icon', type: 'button', 'aria-label': t('when.removeTime'), onclick: () => { f.times.splice(i, 1); redraw(); } }, icon('x')) : null)),
          h('button', { class: 'ctl-btn', type: 'button', onclick: () => { f.times.push('12:00'); redraw(); } }, icon('plus'), t('when.addTime')))));
      }
    }
    if (f.mode !== 'once') {
      parts.push(h('div', { class: 'sce-two' },
        field(t('when.start'), input(f.start, v => { f.start = v; sideOnly(); }, { type: 'datetime-local' })),
        field(t('when.zone'), zoneSelect(f))));
      parts.push(field(t('when.end'), h('div', { class: 'sce-line' },
        radio(f.endKind, [{ value: 'never', label: t('when.never') }, { value: 'date', label: t('when.onDate') }, { value: 'count', label: t('when.after') }], v => { f.endKind = v; redraw(); }),
        f.endKind === 'date' ? input(f.end || f.start.slice(0, 10), v => { f.end = v; sideOnly(); }, { type: 'date', label: t('when.onDate') }) : null,
        f.endKind === 'count' ? input(f.count, v => { f.count = Math.max(1, Number(v) || 1); sideOnly(); }, { type: 'number', min: 1, small: true, label: t('when.after') }) : null,
        f.endKind === 'count' ? h('span', {}, t('when.times')) : null)));
    } else parts.push(field(t('when.zone'), zoneSelect(f)));
    return parts;
  }

  function zoneSelect(f) {
    let zones = [];
    try { zones = Intl.supportedValuesOf('timeZone'); } catch { zones = [f.tz]; }
    if (!zones.includes(f.tz)) zones.unshift(f.tz);
    const here = browserZone();
    return select(f.tz, zones.map(z => ({ value: z, label: z === here ? t('when.thisBrowser', { zone: z }) : z })), v => { f.tz = v; sideOnly(); }, t('when.zone'));
  }

  // ---------- Step 3: options ----------

  function stepOptions() {
    const o = draft.options;
    const browser = kindOf(draft.what.type).where === 'browser';
    const out = [
      field(t('opt.name'), input(draft.name, v => { draft.name = v; }, { maxLength: 120 })),
      field(t('opt.missed'), radio(o.missed, [{ value: 'once', label: t('opt.missedOnce') }, { value: 'skip', label: t('opt.missedSkip') }], v => { o.missed = v; })),
      browser ? field(t('opt.closed'), check(o.ask, v => { o.ask = v; }, t('opt.ask'))) : null,
      field(t('opt.overlap'), radio(o.overlap, [{ value: 'skip', label: t('opt.overlapSkip') }, { value: 'queue', label: t('opt.overlapQueue') }, { value: 'parallel', label: t('opt.overlapParallel') }], v => { o.overlap = v; })),
      h('div', { class: 'sce-two' },
        field(t('opt.timeout'), h('div', { class: 'sce-line' }, input(o.timeoutMin, v => { o.timeoutMin = Math.max(1, Math.min(1440, Number(v) || 60)); }, { type: 'number', min: 1, max: 1440, small: true }), h('span', {}, t('opt.minutes')))),
        field(t('opt.retries'), h('div', { class: 'sce-line' },
          input(o.retries, v => { o.retries = Math.max(0, Math.min(5, Number(v) || 0)); }, { type: 'number', min: 0, max: 5, small: true }), h('span', {}, t('opt.timesEvery')),
          input(o.retryMin, v => { o.retryMin = Math.max(1, Math.min(1440, Number(v) || 5)); }, { type: 'number', min: 1, max: 1440, small: true }), h('span', {}, t('opt.minutes'))))),
      field(t('opt.notify'), radio(o.notify, [{ value: 'error', label: t('opt.notifyError') }, { value: 'always', label: t('opt.notifyAlways') }, { value: 'never', label: t('opt.notifyNever') }], v => { o.notify = v; })),
    ];
    if (admin && !editing) {
      const users = catalog.users.filter(u => u.id !== session.user?.id);
      out.push(field(t('opt.runAs'), select(draft.owner ?? '', [
        { value: '', label: t('opt.me', { name: session.user?.name ?? '' }) },
        { value: '*', label: t('owner.system') },
        ...users.map(u => ({ value: u.id, label: u.name || u.username })),
      ], v => { draft.owner = v || null; redraw(); }, t('opt.runAs')), draft.owner === '*' ? t('opt.systemHint') : draft.owner ? t('opt.otherHint') : null));
    }
    out.push(check(draft.enabled, v => { draft.enabled = v; }, t('opt.enabled')));
    return out;
  }

  // ---------- The side: in words, the next times ----------

  function safeRule() {
    try { return schedule.rules.checkWhen(ruleOf(draft.form)); } catch { return null; }
  }

  function drawSide() {
    let rule = null, problem = '';
    try { rule = schedule.rules.checkWhen(ruleOf(draft.form)); } catch (err) { problem = err.message; }
    const items = [h('div', { class: 'sc-sub' }, t('side.words')), h('div', { class: 'sce-words' }, rule ? schedule.describe(rule) : '—')];
    if (rule) items.push(h('div', { class: 'sce-tz' }, rule.tz));
    if (problem) items.push(h('p', { class: 'sce-bad' }, problem));
    if (rule) {
      const times = schedule.rules.between(rule, Date.now(), Date.now() + 5 * 366 * 86400_000, 6);
      items.push(h('div', { class: 'sc-sub' }, t('side.next')),
        times.length ? h('div', { class: 'sc-nexts' }, times.map(ms => h('span', {}, h('b', {}, whenText(ms))))) : h('p', { class: 'sce-hint' }, t('side.noMore')));
      const cron = schedule.rules.toCron(rule);
      if (cron) items.push(h('div', { class: 'sc-sub' }, t('side.cron')), h('code', { class: 'sce-cron' }, cron));
    }
    items.push(h('div', { class: 'sc-sub' }, t('side.what')), h('div', { class: 'sce-summary' }, h('span', { class: `sc-kico k-${draft.what.type}` }, icon(kindOf(draft.what.type).glyph)), whatText(draft.what, catalog) || t(`kind.${draft.what.type}.name`)));
    if (kindOf(draft.what.type).where === 'browser') items.push(h('p', { class: 'sce-warn' }, icon('window'), t('side.browser')));
    fill(sideEl, ...items);
  }

  // ---------- Saving ----------

  function payload() {
    const what = clone(draft.what);
    delete what._ssh;
    if (what.type === 'web') what.headers = draft.what.headers.filter(hd => hd.name).map(hd => (hd.secret ? (hd.value ? { name: hd.name, secret: true, value: hd.value } : { name: hd.name, secret: true }) : { name: hd.name, value: hd.value ?? '' }));
    if (what.type === 'open' && what.file === null) delete what.file;
    return {
      name: draft.name.trim() || suggestName(), enabled: draft.enabled, when: ruleOf(draft.form), what, options: draft.options,
      ...(!editing && draft.owner && { owner: draft.owner }),
    };
  }

  async function save() {
    error = '';
    try {
      const body = payload();
      if (editing) await schedule.update(id, body);
      else await schedule.create(body);
      win.emit('close');
    } catch (err) {
      error = err.message;
      draw();
      await messageBox(win, { icon: 'error', title: t('error.save'), text: err.message });
    }
  }

  draw();
  return win;
}
