import { Window, h, icon, schedule, session, messageBox } from '@lilos/sdk';
import { t } from './i18n.js';
import { kindOf, STATE_GLYPH, whatText, when, duration, ruleText, nextTimes } from './model.js';
import { openEditor } from './editor.js';

/** replaceChildren without the nulls and falses (h() skips them, the DOM would write them). */
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));

/**
 * The Scheduler's main window. Elenco: the operations (a user's own; an admin's grouped as Sistema
 * and one group per user), filters on the left, the chosen one on the right with its next times
 * and its last runs. Storico: every run, newest first; a row opens what the action wrote.
 * Everything follows the kernel live (schedule 'change' and 'run').
 *
 *   args: { tab?: 'list' | 'history', task?, run? }   (the 'history' entry point and the
 *         notifications open it on a run)
 */
const RELOAD_MS = 250;

export function createMain({ args = {}, openWindow } = {}) {
  const win = new Window({ title: t('app.name'), icon: 'clock', width: 1120, height: 620, minWidth: 760, minHeight: 420 });
  const state = {
    admin: false, tasks: [], catalog: null, filter: 'all', group: null, search: '',
    tab: args?.tab === 'history' || args?.run ? 'history' : 'list',
    selected: typeof args?.task === 'string' ? args.task : null,
    runs: [], runFilter: { task: typeof args?.task === 'string' && (args?.tab === 'history' || args?.run) ? args.task : '', state: '' },
    openRun: typeof args?.run === 'string' ? args.run : null,
    lastRuns: new Map(), error: '',
  };
  const me = () => session.user?.id ?? 'local';

  const toolbar = h('div', { class: 'sc-tools' });
  const side = h('nav', { class: 'sc-side', 'aria-label': t('side.label') });
  const main = h('div', { class: 'sc-main' });
  const detail = h('aside', { class: 'sc-detail', 'aria-label': t('detail.label') });
  const status = h('div', { class: 'sc-status' });
  const body = h('div', { class: 'sc-body' }, side, main, detail);
  win.body.append(h('div', { class: 'sc' }, toolbar, body, status));

  if (!schedule?.available) {
    fill(body, h('p', { class: 'sc-empty' }, t('needsKernel')));
    return win;
  }

  // ---------- Data ----------

  let timer = 0;
  const reload = () => { clearTimeout(timer); timer = setTimeout(() => load().catch(() => {}), RELOAD_MS); };
  async function load() {
    try {
      const [overview, catalog] = await Promise.all([schedule.overview(), state.catalog ? state.catalog : schedule.catalog()]);
      state.admin = overview.admin;
      state.tasks = overview.tasks;
      state.catalog = catalog;
      state.error = '';
      if (state.selected && !state.tasks.some(x => x.id === state.selected)) state.selected = null;
      if (state.tab === 'history') state.runs = await schedule.history({ task: state.runFilter.task || undefined, state: state.runFilter.state || undefined, limit: 200 });
      if (state.selected) state.lastRuns.set(state.selected, await schedule.history({ task: state.selected, limit: 14 }));
    } catch (err) {
      state.error = err.message;
    }
    draw();
  }
  const offs = [schedule.on('change', reload), schedule.on('run', reload)];
  win.on('destroy', () => { clearTimeout(timer); offs.forEach(off => off?.()); });
  win.on('launch', a => {
    if (a?.task) state.selected = a.task;
    if (a?.tab === 'history' || a?.run) { state.tab = 'history'; state.openRun = a.run ?? null; state.runFilter.task = a.task ?? ''; }
    load();
  });

  // ---------- What is shown ----------

  const ownerName = owner => {
    if (owner === '*') return t('owner.system');
    if (owner === me()) return t('owner.me');
    return state.catalog?.users?.find(u => u.id === owner)?.name ?? owner;
  };
  const where = type => kindOf(type).where;
  const visible = () => state.tasks.filter(task => {
    const f = state.filter;
    if (f === 'active' && !task.enabled) return false;
    if (f === 'paused' && task.enabled) return false;
    if (f === 'failed' && task.last?.state !== 'error') return false;
    if (f === 'mine' && (task.owner !== me() || task.app)) return false;
    if (f === 'apps' && !task.app) return false;
    if (f === 'kernel' && where(task.what.type) !== 'kernel') return false;
    if (f === 'browser' && where(task.what.type) !== 'browser') return false;
    if (state.group !== null && task.owner !== state.group) return false;
    const q = state.search.trim().toLowerCase();
    if (q && !`${task.name} ${whatText(task.what, state.catalog)}`.toLowerCase().includes(q)) return false;
    return true;
  });

  function draw() {
    drawTools();
    drawSide();
    if (state.tab === 'history') drawHistory(); else drawList();
    drawDetail();
    const active = state.tasks.filter(x => x.enabled).length;
    fill(status, 
      h('span', {}, h('i', { class: 'sc-dot on' }), t('status.module')),
      h('span', {}, t('status.count', { n: state.tasks.length, active })),
      state.error ? h('span', { class: 'sc-err', role: 'alert' }, state.error) : null);
  }

  function drawTools() {
    const sel = state.tasks.find(x => x.id === state.selected);
    const tab = (id, glyph, label) => h('button', { type: 'button', 'aria-pressed': String(state.tab === id), onclick: () => { state.tab = id; load(); } }, icon(glyph), label);
    const search = h('input', { class: 'ctl-text sc-search', type: 'search', placeholder: t('tools.search'), value: state.search, 'aria-label': t('tools.search') });
    search.addEventListener('input', () => { state.search = search.value; drawList(); });
    fill(toolbar, 
      h('button', { class: 'ctl-btn vio', type: 'button', onclick: () => openEditor(openWindow, {}) }, icon('plus'), t('tools.new')),
      h('button', { class: 'ctl-btn', type: 'button', disabled: !sel, onclick: () => runNow(sel) }, icon('play'), t('tools.run')),
      h('button', { class: 'ctl-btn', type: 'button', disabled: !sel, onclick: () => toggle(sel) }, icon(sel?.enabled === false ? 'play' : 'pause'), sel?.enabled === false ? t('tools.resume') : t('tools.pause')),
      h('span', { class: 'sc-grow' }),
      h('div', { class: 'sc-tabs', role: 'group' }, tab('list', 'list', t('tabs.list')), tab('history', 'restart', t('tabs.history'))),
      state.tab === 'list' ? search : null);
  }

  function drawSide() {
    const count = fn => state.tasks.filter(fn).length;
    const item = (id, glyph, label, n, { err = false, group = undefined } = {}) => h('button', {
      class: 'sc-flt', type: 'button',
      'aria-current': String(group === undefined ? state.filter === id && state.group === null : state.group === group && state.filter === 'all'),
      onclick: () => { state.filter = group === undefined ? id : 'all'; state.group = group === undefined ? null : group; state.tab = 'list'; draw(); },
    }, icon(glyph), h('span', {}, label), h('span', { class: `sc-n${err && n ? ' err' : ''}` }, String(n)));
    const parts = [
      h('h6', {}, t('side.operations')),
      item('all', 'list', t('side.all'), state.tasks.length),
      item('active', 'play', t('side.active'), count(x => x.enabled)),
      item('paused', 'pause', t('side.paused'), count(x => !x.enabled)),
      item('failed', 'error', t('side.failed'), count(x => x.last?.state === 'error'), { err: true }),
    ];
    if (state.admin) {
      parts.push(h('h6', {}, t('side.system')), item('', 'monitor', t('owner.system'), count(x => x.owner === '*'), { group: '*' }));
      const owners = [...new Set(state.tasks.map(x => x.owner).filter(o => o !== '*'))];
      for (const u of state.catalog?.users ?? []) if (!owners.includes(u.id)) owners.push(u.id);
      parts.push(h('h6', {}, t('side.users')));
      for (const o of owners.sort((a, b) => (a === me() ? -1 : b === me() ? 1 : ownerName(a).localeCompare(ownerName(b))))) {
        parts.push(item('', 'user', o === me() ? t('owner.meNamed', { name: session.user?.name ?? '' }) : ownerName(o), count(x => x.owner === o), { group: o }));
      }
    } else {
      parts.push(h('h6', {}, t('side.madeBy')),
        item('mine', 'user', t('side.mine'), count(x => !x.app)),
        item('apps', 'grid', t('side.apps'), count(x => !!x.app)));
    }
    parts.push(h('h6', {}, t('side.where')),
      item('kernel', 'monitor', t('where.kernel'), count(x => where(x.what.type) === 'kernel')),
      item('browser', 'window', t('where.browser'), count(x => where(x.what.type) === 'browser')));
    fill(side, ...parts);
  }

  const kico = type => h('span', { class: `sc-kico k-${type}` }, icon(kindOf(type).glyph));
  const lastCell = task => {
    if (!task.enabled && !task.last) return h('span', { class: 'sc-st pause' }, icon('pause'), t('state.paused'));
    if (!task.last) return h('span', { class: 'sc-m' }, '—');
    const s = task.last.state;
    return h('span', { class: `sc-st ${s}` }, icon(STATE_GLYPH[s] ?? 'info'), s === 'error' ? t('last.failed', { when: when(task.last.at) }) : when(task.last.at));
  };

  function row(task) {
    const nextText = task.enabled ? (task.next ? when(task.next) : t('next.done')) : t('state.paused');
    return h('div', {
      class: `sc-row${task.id === state.selected ? ' sel' : ''}${task.enabled ? '' : ' off'}`, role: 'row', tabindex: '0',
      'aria-selected': String(task.id === state.selected),
      onclick: () => select(task.id), ondblclick: () => openEditor(openWindow, { id: task.id }),
      onkeydown: e => { if (e.key === 'Enter') openEditor(openWindow, { id: task.id }); },
    },
    kico(task.what.type),
    h('span', { class: 'sc-nm' }, h('b', {}, task.name), h('small', {},
      h('span', { class: `sc-where${where(task.what.type) === 'browser' ? ' br' : ''}` }, t(`where.${where(task.what.type)}`)),
      task.app ? h('span', { class: 'sc-from' }, t('row.byApp', { app: task.app })) : null,
      h('span', {}, whatText(task.what, state.catalog)))),
    h('span', { class: 'sc-m' }, ruleText(task.when)),
    h('span', { class: 'sc-m' }, h('b', {}, nextText)),
    lastCell(task));
  }

  function drawList() {
    if (state.tab !== 'list') return;
    const list = visible();
    const head = h('div', { class: 'sc-row head', role: 'row' }, h('span'), h('span', {}, t('col.name')), h('span', {}, t('col.when')), h('span', {}, t('col.next')), h('span', {}, t('col.last')));
    const rows = [];
    if (state.admin && state.group === null && state.filter === 'all') {
      const owners = [...new Set(list.map(x => x.owner))].sort((a, b) => (a === '*' ? -1 : b === '*' ? 1 : a === me() ? -1 : b === me() ? 1 : 0));
      for (const o of owners) {
        rows.push(h('div', { class: 'sc-grp' }, icon(o === '*' ? 'monitor' : 'user'), o === me() ? t('owner.meNamed', { name: session.user?.name ?? '' }) : ownerName(o), h('small', {}, o === '*' ? t('grp.system') : t('grp.count', { n: list.filter(x => x.owner === o).length }))));
        rows.push(...list.filter(x => x.owner === o).map(row));
      }
    } else rows.push(...list.map(row));
    fill(main, head, h('div', { class: 'sc-rows', role: 'rowgroup' }, rows.length ? rows : h('div', { class: 'sc-empty' },
      state.tasks.length ? t('list.noneHere') : h('div', { class: 'sc-welcome' }, icon('clock'), h('h2', {}, t('welcome.title')), h('p', {}, t('welcome.text')),
        h('button', { class: 'ctl-btn vio', type: 'button', onclick: () => openEditor(openWindow, {}) }, icon('plus'), t('tools.new'))))));
  }

  function drawHistory() {
    const taskSel = h('select', { class: 'ctl-select', 'aria-label': t('history.task') },
      h('option', { value: '' }, t('history.allTasks')),
      state.tasks.map(x => h('option', { value: x.id, selected: x.id === state.runFilter.task }, x.name)));
    taskSel.addEventListener('change', () => { state.runFilter.task = taskSel.value; load(); });
    const stateSel = h('select', { class: 'ctl-select', 'aria-label': t('history.state') },
      h('option', { value: '' }, t('history.allStates')),
      ['ok', 'error', 'skipped', 'waiting', 'cancelled'].map(s => h('option', { value: s, selected: s === state.runFilter.state }, t(`state.${s}`))));
    stateSel.addEventListener('change', () => { state.runFilter.state = stateSel.value; load(); });
    const rows = state.runs.map(r => {
      const open = r.id === state.openRun;
      const reason = { time: t('reason.time'), catchup: t('reason.catchup'), manual: t('reason.manual'), retry: t('reason.retry', { n: r.attempt }) }[r.reason] ?? r.reason;
      const line = h('div', {
        class: `sc-hrow${open ? ' sel' : ''}${r.state === 'error' ? ' err' : ''}`, tabindex: '0', role: 'row',
        onclick: () => { state.openRun = open ? null : r.id; drawHistory(); },
        onkeydown: e => { if (e.key === 'Enter') { state.openRun = open ? null : r.id; drawHistory(); } },
      },
      h('span', { class: `sc-st ${r.state}` }, icon(STATE_GLYPH[r.state] ?? 'info')),
      h('span', { class: 'sc-t' }, when(r.at ?? r.due)),
      h('span', { class: 'sc-w' }, h('b', {}, `${r.name}${r.state === 'ok' ? '' : ` · ${t(`state.${r.state}`)}`}`),
        h('small', {}, r.reason === 'catchup' ? t('history.catchup', { due: when(r.due), text: r.text || '' }) : r.text || '')),
      h('span', { class: 'sc-t' }, r.end && r.at ? duration(r.end - r.at) : '—'),
      h('span', { class: 'sc-t' }, reason));
      return open && r.log ? [line, h('pre', { class: 'sc-log' }, r.log)] : [line];
    }).flat();
    fill(main, 
      h('div', { class: 'sc-hfilters' }, taskSel, stateSel),
      h('div', { class: 'sc-hrow head', role: 'row' }, h('span'), h('span', {}, t('col.when')), h('span', {}, t('history.what')), h('span', {}, t('history.took')), h('span', {}, t('history.how'))),
      h('div', { class: 'sc-rows' }, rows.length ? rows : h('div', { class: 'sc-empty' }, t('history.none'))));
    const sel = main.querySelector('.sc-hrow.sel');
    sel?.scrollIntoView({ block: 'nearest' });
  }

  function drawDetail() {
    const task = state.tasks.find(x => x.id === state.selected);
    detail.hidden = state.tab === 'history' || !task;
    if (!task) return fill(detail, );
    const runs = state.lastRuns.get(task.id) ?? [];
    const times = nextTimes(task);
    const editable = true;
    fill(detail, 
      h('h4', {}, kico(task.what.type), h('span', {}, task.name)),
      h('dl', { class: 'sc-kv' },
        h('dt', {}, t('detail.when')), h('dd', {}, ruleText(task.when), h('br'), h('span', { class: 'sc-tz' }, task.when.tz)),
        h('dt', {}, t('detail.what')), h('dd', {}, whatText(task.what, state.catalog)),
        h('dt', {}, t('detail.runs')), h('dd', {}, where(task.what.type) === 'kernel' ? t('detail.inKernel', { who: ownerName(task.owner) }) : t('detail.inBrowser', { who: ownerName(task.owner) })),
        h('dt', {}, t('detail.missed')), h('dd', {}, task.options.missed === 'once' ? t('detail.missedOnce') : t('detail.missedSkip')),
        task.by && task.by.id !== task.owner ? [h('dt', {}, t('detail.by')), h('dd', {}, task.by.name)] : null),
      h('div', {}, h('div', { class: 'sc-sub' }, t('detail.next')),
        times.length ? h('div', { class: 'sc-nexts' }, times.map(ms => h('span', {}, h('b', {}, when(ms))))) : h('p', { class: 'sc-hint' }, task.enabled ? t('next.done') : t('state.paused'))),
      h('div', {}, h('div', { class: 'sc-sub' }, t('detail.last', { n: runs.length })),
        h('div', { class: 'sc-dots' }, runs.slice().reverse().map(r => h('i', { class: `d-${r.state}`, title: `${when(r.at ?? r.due)} · ${t(`state.${r.state}`)}` }))),
        runs[0] ? h('p', { class: 'sc-hint' }, `${when(runs[0].at ?? runs[0].due)} · ${runs[0].text || t(`state.${runs[0].state}`)}`) : null),
      h('div', { class: 'sc-acts' },
        h('button', { class: 'ctl-btn', type: 'button', onclick: () => runNow(task) }, icon('play'), t('tools.run')),
        h('button', { class: 'ctl-btn', type: 'button', disabled: !editable, onclick: () => openEditor(openWindow, { id: task.id }) }, icon('pencil'), t('detail.edit')),
        h('button', { class: 'ctl-btn', type: 'button', onclick: () => toggle(task) }, icon(task.enabled ? 'pause' : 'play'), task.enabled ? t('tools.pause') : t('tools.resume')),
        h('button', { class: 'ctl-btn', type: 'button', onclick: () => openEditor(openWindow, { copy: task.id }) }, icon('filePlus'), t('detail.duplicate')),
        h('button', { class: 'ctl-btn danger', type: 'button', onclick: () => remove(task) }, icon('trash'), t('detail.delete')),
        h('button', { class: 'ctl-btn', type: 'button', onclick: () => { state.tab = 'history'; state.runFilter.task = task.id; load(); } }, icon('restart'), t('tabs.history'))),
      task.owner !== me() && task.owner !== '*' ? h('p', { class: 'sc-warn' }, icon('lock'), t('detail.othersNote', { who: ownerName(task.owner) })) : null);
  }

  // ---------- Doing ----------

  async function select(id) {
    state.selected = id;
    draw();
    state.lastRuns.set(id, await schedule.history({ task: id, limit: 14 }).catch(() => []));
    drawDetail();
  }

  const act = async fn => {
    try { await fn(); } catch (err) { await messageBox(win, { icon: 'error', title: t('error.title'), text: err.message }); }
    load();
  };
  const runNow = task => task && act(() => schedule.run(task.id));
  const toggle = task => task && act(() => schedule.enable(task.id, !task.enabled));
  async function remove(task) {
    const answer = await messageBox(win, { icon: 'warning', title: t('delete.title', { name: task.name }), text: t('delete.text'), buttons: ['continue', 'cancel'] });
    if (answer !== 'continue') return;
    await act(() => schedule.remove(task.id));
  }

  load();
  return win;
}

