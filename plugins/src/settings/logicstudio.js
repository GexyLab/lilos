import { h, kernel, kernelModules, actionButton } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // logic, kernelSettings: missing in older lilOS
import { settingRows } from '../shared/fieldsForm.js';
import { t, i18n } from './i18n.js';

/**
 * Control Panel → Logic Studio (only while its engine, the kernel module logicstudio-engine, runs):
 *   Il mio uso      what my programs use of my quota, and my programs
 *   Limiti          (admins) the limits for everybody (the module's settings)
 *   Quote           (admins) the default quotas, and a user's own
 *   In esecuzione   (admins) every user's programs, to stop them
 *   Hardware        (admins) who may use which devices (module logicstudio-hardware)
 *   Pacchetti       the packages of blocks and components installed
 */
const MODULE = 'logicstudio-engine';
const QUOTA_KEYS = ['maxActive', 'maxTests', 'cpuPercent', 'memoryMb', 'netPerMinute', 'logMb'];
const state = { status: null, programs: null, all: null, users: null, overrides: null, settings: null, catalog: null, error: '', loading: false };
const isAdmin = () => kernel.user?.role === 'admin';
const logic = () => sdk.logic;

export function reloadLogicStudio() {
  Object.assign(state, { status: null, programs: null, all: null, users: null, overrides: null, settings: null, catalog: null, error: '' });
  Object.assign(hw, { policy: null, status: null, error: '', missing: false });
}

function load(rerender) {
  if (state.loading) return;
  state.loading = true;
  const admin = isAdmin();
  Promise.all([
    logic().status(), logic().programs(), logic().catalog({ fresh: true }),
    admin ? logic().programs({ all: true }) : null,
    admin ? logic().admin.users() : null,
    admin ? kernelModules.settings(MODULE) : null,
    admin && sdk.kernelSettings?.users ? sdk.kernelSettings.users().catch(() => null) : null,
  ]).then(([status, programs, catalog, all, overrides, settings, users]) => {
    Object.assign(state, { status, programs, catalog, all, overrides, settings, users, error: '' });
  }, err => { state.error = err.message; }).finally(() => { state.loading = false; rerender(); });
}

const ready = rerender => {
  if (!state.status && !state.error) load(rerender);
  return !!state.status;
};

const waiting = () => [{ rows: [{ label: state.error ? t('logic.noEngine') : t('logic.loading'), description: state.error || undefined }] }];

function bar(used, max, text = `${used} / ${max}`) {
  return h('span', { class: 'ls-cp-bar' }, h('b', {}, text), h('i', {}, h('i', { style: `width:${max ? Math.min(100, (used / max) * 100) : 0}%` })));
}

function programTable(list, rerender, { owner = false } = {}) {
  if (!list.length) return h('p', { class: 'ls-cp-empty' }, t('logic.noPrograms'));
  return h('table', { class: 'ls-cp-table' },
    h('tr', {}, h('th', {}, t('logic.program')), owner ? h('th', {}, t('logic.user')) : null, h('th', {}, t('logic.kind')), h('th', {}, t('logic.state')), h('th', {}, t('logic.since')), h('th', {})),
    ...list.map(p => h('tr', {},
      h('td', {}, h('b', {}, p.name), p.source?.path ? h('small', {}, p.source.path) : null, p.error ? h('small', { class: 'err' }, p.error) : null),
      owner ? h('td', {}, p.user?.name ?? p.owner) : null,
      h('td', {}, t(`logic.kind.${p.kind}`)),
      h('td', {}, t(`logic.state.${p.status}`)),
      h('td', {}, p.started ? i18n.date(p.started, { dateStyle: 'short', timeStyle: 'short' }) : '—'),
      h('td', {}, p.status === 'running' || p.status === 'starting'
        ? actionButton({ label: t('logic.stop'), danger: true, confirm: t('logic.stopConfirm'), onClick: () => logic().stop(p.id).then(() => { reloadLogicStudio(); rerender(); }) })
        : actionButton({ label: t('logic.forget'), onClick: () => logic().forget(p.id).then(() => { reloadLogicStudio(); rerender(); }) })))));
}

function mineSections(rerender) {
  if (!ready(rerender)) return waiting();
  const s = state.status, q = s.quota;
  return [
    {
      title: t('logic.mine.usage'),
      rows: [
        { label: t('logic.active'), description: t('logic.activeHint'), control: bar(s.active, q.maxActive) },
        { label: t('logic.tests'), description: t('logic.testsHint', { min: s.limits.testMinutes }), control: bar(s.tests, q.maxTests) },
        { label: t('logic.net'), control: bar(s.net, q.netPerMinute) },
        { label: t('logic.log'), control: bar(s.log, q.logMb * 1024 * 1024, `${Math.round(s.log / 1024)} KB / ${q.logMb} MB`) },
        { label: t('logic.cpuMem'), control: t('logic.cpuMemValue', { cpu: q.cpuPercent, mem: q.memoryMb }) },
      ],
    },
    { title: t('logic.mine.programs'), content: () => programTable(state.programs ?? [], rerender) },
  ];
}

async function saveSetting(f, value, rerender) {
  try {
    state.settings = await kernelModules.saveSettings(MODULE, { ...state.settings.values, [f.key]: value });
  } catch (err) {
    state.error = err.message;
  }
  state.status = null;
  rerender();
}

function limitSections(rerender) {
  if (!ready(rerender)) return waiting();
  if (!state.settings) return [{ rows: [{ label: t('logic.noSettings') }] }];
  const fields = state.settings.fields.filter(f => !f.key.startsWith('quota'));
  const group = keys => fields.filter(f => keys.includes(f.key));
  const save = (f, v) => saveSetting(f, v, rerender);
  return [
    { title: t('logic.limits.all'), rows: settingRows(group(['totalActive', 'totalMemoryMb', 'runsPer10s', 'blockSeconds', 'testMinutes', 'maxThreads']), state.settings.values, { t, save }) },
    { title: t('logic.limits.schemas'), rows: settingRows(group(['maxBlocks', 'maxLinks', 'maxAddedPorts']), state.settings.values, { t, save }) },
    { title: t('logic.limits.projects'), rows: settingRows(group(['maxSchemas', 'maxWindows', 'maxComponents', 'maxProjectLinks', 'maxConsoles', 'consoleLinesPerSecond', 'chartPoints', 'signalSamples']), state.settings.values, { t, save }) },
    { rows: [{ label: t('logic.limits.when'), description: t('logic.limits.whenHint') }] },
  ];
}

function quotaSections(rerender) {
  if (!ready(rerender)) return waiting();
  if (!state.settings) return [{ rows: [{ label: t('logic.noSettings') }] }];
  const defaults = state.settings.fields.filter(f => f.key.startsWith('quota'));
  const save = (f, v) => saveSetting(f, v, rerender);
  const overrides = new Map((state.overrides ?? []).map(u => [u.id, u]));
  const users = (state.users ?? []).length ? state.users : (state.overrides ?? []).map(u => ({ id: u.id, username: u.id, name: u.id }));
  const table = () => h('table', { class: 'ls-cp-table quotas' },
    h('tr', {}, h('th', {}, t('logic.user')), ...QUOTA_KEYS.map(k => h('th', {}, t(`logic.quota.${k}`))), h('th', {})),
    ...users.map(u => {
      const own = overrides.get(u.id)?.overrides ?? null;
      const values = { ...(overrides.get(u.id)?.quota ?? {}) };
      const inputs = QUOTA_KEYS.map(k => {
        const input = h('input', { class: `ctl-text ls-cp-num${own?.[k] !== undefined ? ' own' : ''}`, type: 'number', min: '0', value: String(own?.[k] ?? ''), placeholder: String(values[k] ?? ''), 'aria-label': `${u.name} · ${t(`logic.quota.${k}`)}` });
        input.addEventListener('change', async () => {
          const next = { ...(own ?? {}) };
          if (input.value === '') delete next[k]; else next[k] = Number(input.value);
          await logic().admin.setQuota(u.id, Object.keys(next).length ? next : null).catch(err => { state.error = err.message; });
          reloadLogicStudio();
          rerender();
        });
        return h('td', {}, input);
      });
      return h('tr', {}, h('td', {}, h('b', {}, u.name ?? u.username), h('small', {}, u.username)), ...inputs,
        h('td', {}, own ? actionButton({ label: t('logic.reset'), onClick: () => logic().admin.setQuota(u.id, null).then(() => { reloadLogicStudio(); rerender(); }) }) : null));
    }));
  return [
    { title: t('logic.quota.defaults'), rows: settingRows(defaults, state.settings.values, { t, save }) },
    { title: t('logic.quota.users'), content: () => h('div', {}, h('p', { class: 'ls-cp-hint' }, t('logic.quota.usersHint')), table()) },
  ];
}

function runningSections(rerender) {
  if (!ready(rerender)) return waiting();
  return [{ title: t('logic.running.title'), content: () => programTable(state.all ?? [], rerender, { owner: true }) }];
}

function packageSections(rerender) {
  if (!ready(rerender)) return waiting();
  const lang = i18n.lang;
  const label = l => (l && typeof l === 'object' ? l[lang] ?? l.en : String(l ?? ''));
  return [{
    title: t('logic.packages.title'),
    rows: (state.catalog?.packages ?? []).map(p => ({
      label: `${label(p.label)} · ${p.name} ${p.version}`,
      description: t('logic.packages.counts', { blocks: p.blocks.length, components: p.components.length }),
    })),
  }, { rows: [{ label: t('logic.packages.more'), description: t('logic.packages.moreHint') }] }];
}

/**
 * Hardware (admins): who may use which kind of device through the blocks of logicstudio-hardware
 * (its routes GET/PUT /admin/policy and GET /status). Administrators may always; the others only
 * what is allowed to everybody or to them.
 */
const HW_MODULE = 'logicstudio-hardware';
const HW_CLASSES = ['serial', 'usb', 'hid', 'camera', 'audio', 'midi', 'system', 'gpio'];
const hw = { policy: null, status: null, error: '', loading: false, missing: false };

function loadHardware(rerender) {
  if (hw.loading) return;
  hw.loading = true;
  const api = kernel.module(HW_MODULE);
  Promise.all([api.request('GET', '/admin/policy'), api.request('GET', '/status')])
    .then(([policy, status]) => Object.assign(hw, { policy, status, error: '', missing: false }),
      err => Object.assign(hw, { error: err.message, missing: err.status === 404 || err.code === 'not_found' }))
    .finally(() => { hw.loading = false; rerender(); });
}

async function saveHardware(next, rerender) {
  try {
    hw.policy = await kernel.module(HW_MODULE).request('PUT', '/admin/policy', next);
    hw.error = '';
  } catch (err) {
    hw.error = err.message;
  }
  rerender();
}

function hardwareSections(rerender) {
  if (!hw.policy && !hw.error) { loadHardware(rerender); return [{ rows: [{ label: t('logic.loading') }] }]; }
  if (!hw.policy) {
    return [{ rows: [{ label: hw.missing ? t('logic.hw.missing') : t('logic.hw.error'), description: hw.missing ? t('logic.hw.missingHint') : hw.error }] }];
  }
  const policy = { defaultAllow: { ...(hw.policy.defaultAllow ?? {}) }, users: { ...(hw.policy.users ?? {}) } };
  const everybody = HW_CLASSES.map(c => ({
    label: t(`logic.hw.class.${c}`), description: t(`logic.hw.classHint.${c}`),
    control: () => sdk.toggle({ value: policy.defaultAllow[c] === true, label: t(`logic.hw.class.${c}`), onChange: v => saveHardware({ ...policy, defaultAllow: { ...policy.defaultAllow, [c]: v } }, rerender) }),
  }));
  const users = (state.users ?? []).filter(u => u.role !== 'admin');
  const cell = (u, c) => {
    const own = policy.users[u.id]?.[c];
    const select = h('select', { class: 'ctl-select', 'aria-label': `${u.name ?? u.username} · ${t(`logic.hw.class.${c}`)}` },
      ...[['', t('logic.hw.asAll')], ['yes', t('logic.hw.yes')], ['no', t('logic.hw.no')]].map(([v, label]) =>
        h('option', { value: v, selected: (own === true ? 'yes' : own === false ? 'no' : '') === v }, label)));
    select.addEventListener('change', () => {
      const mine = { ...(policy.users[u.id] ?? {}) };
      if (select.value === '') delete mine[c]; else mine[c] = select.value === 'yes';
      const next = { ...policy.users };
      if (Object.keys(mine).length) next[u.id] = mine; else delete next[u.id];
      saveHardware({ ...policy, users: next }, rerender);
    });
    return h('td', {}, select);
  };
  const table = () => (users.length
    ? h('table', { class: 'ls-cp-table quotas' },
      h('tr', {}, h('th', {}, t('logic.user')), ...HW_CLASSES.map(c => h('th', {}, t(`logic.hw.class.${c}`)))),
      ...users.map(u => h('tr', {}, h('td', {}, h('b', {}, u.name ?? u.username), h('small', {}, u.username)), ...HW_CLASSES.map(c => cell(u, c)))))
    : h('p', { class: 'ls-cp-empty' }, t('logic.hw.noUsers')));
  // tools: { ffmpeg: true|false, … }; libraries: { serialport: 'ok' | 'non caricata' | 'errore: …' }
  const tools = Object.entries(hw.status?.tools ?? {});
  const libs = Object.entries(hw.status?.libraries ?? {});
  // kernel.module().request takes no ?query: the module's route through kernel.request
  const refresh = () => kernel.request('GET', `/modules/${HW_MODULE}/status?refresh=1`)
    .then(status => { hw.status = status; }, err => { hw.error = err.message; }).finally(rerender);
  return [
    { title: t('logic.hw.everybody'), rows: [{ label: t('logic.hw.admins'), description: t('logic.hw.adminsHint') }, ...everybody] },
    // eight columns: the table scrolls sideways instead of going past the window's edge
    { title: t('logic.hw.perUser'), content: () => h('div', {}, h('p', { class: 'ls-cp-hint' }, t('logic.hw.perUserHint')), h('div', { style: 'overflow-x: auto; max-width: 100%' }, table())) },
    {
      title: t('logic.hw.tools'),
      rows: [
        ...libs.map(([name, v]) => ({ label: name, description: t('logic.hw.library'), control: v === 'ok' ? t('logic.hw.found') : String(v) })),
        ...tools.map(([name, v]) => ({ label: name, description: t('logic.hw.tool'), control: v ? t('logic.hw.found') : t('logic.hw.notFound') })),
        { label: t('logic.hw.refresh'), description: t('logic.hw.refreshHint'), control: () => actionButton({ label: t('logic.hw.refreshButton'), onClick: refresh }) },
      ],
    },
    ...(hw.error ? [{ rows: [{ label: t('logic.hw.error'), description: hw.error }] }] : []),
  ];
}

export function logicStudioTab({ rerender }) {
  return {
    id: 'logicstudio', icon: 'blocks',
    get label() { return t('logic.label'); },
    get description() { return t('logic.description'); },
    subtabs: [
      { id: 'mine', get label() { return t('logic.mine.label'); }, sections: () => mineSections(rerender) },
      ...(isAdmin() ? [
        { id: 'limits', get label() { return t('logic.limits.label'); }, sections: () => limitSections(rerender) },
        { id: 'quotas', get label() { return t('logic.quota.label'); }, sections: () => quotaSections(rerender) },
        { id: 'running', get label() { return t('logic.running.label'); }, sections: () => runningSections(rerender) },
        { id: 'hardware', get label() { return t('logic.hw.label'); }, sections: () => hardwareSections(rerender) },
      ] : []),
      { id: 'packages', get label() { return t('logic.packages.label'); }, sections: () => packageSections(rerender) },
    ],
  };
}
