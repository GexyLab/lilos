import { h, kernel, toast, actionButton, formatBytes } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // kernelSettings: missing in lilOS before 1.33.0
import { t } from './i18n.js';

/**
 * Control Panel → Spazio di archiviazione (lilOS 1.33.0, D85; design/limiti-file.html):
 *   Il mio spazio   what lilOS keeps for the user, and with the kernel their space (quota) and
 *                   the biggest file they may save
 *   Limiti          (admins) the kernel's limits of the files and the sizes of the pieces
 *   Utenti          (admins) the default quota and every user's space and quota
 * Each value of the kernel says where it comes from (lilOS's default, changed here, a user's own)
 * and goes back to the default with «Ripristina». Saved in the kernel's config.json, valid at once.
 */
const KB = 1024, MB = KB * 1024, GB = MB * 1024, TB = GB * 1024;
const UNITS = [['KB', KB], ['MB', MB], ['GB', GB], ['TB', TB]];
const LIMITS = ['files.maxFileSize', 'files.maxReadWhole', 'files.maxText'];
const PIECES = ['files.uploadPiece', 'files.inlineMax', 'files.dbChunk', 'files.cacheMax'];

const state = { items: null, quotas: true, users: null, limits: null, error: '', loading: false };
const isAdmin = () => kernel.user?.role === 'admin';
const hasKernelSettings = () => kernel.connected && typeof sdk.kernelSettings?.list === 'function';
const nameOf = key => key.slice(key.indexOf('.') + 1);

/** Everything read again (a change made here, by another admin, or the tab shown again). */
export function reloadStorage() {
  state.items = state.users = state.limits = null;
  state.error = '';
}

function load(rerender) {
  if (state.loading) return;
  state.loading = true;
  const ks = sdk.kernelSettings;
  const admin = isAdmin();
  Promise.all([
    ks.limits({ fresh: true }),
    admin ? ks.list() : null,
    admin ? ks.users() : null,
  ]).then(([limits, list, users]) => {
    state.limits = limits;
    if (list) { state.items = list.items; state.quotas = list.quotas !== false; }
    state.users = users;
    state.error = '';
  }, err => { state.error = err.message; }).finally(() => { state.loading = false; rerender(); });
}

const ready = rerender => {
  if (!state.limits && !state.error) load(rerender);
  return !!state.limits;
};

async function save(change, rerender) {
  try {
    const out = await sdk.kernelSettings.update(change);
    if (!change.user) state.items = out.items;
    state.users = null;
    state.limits = null;
  } catch (err) {
    toast(err.message, { level: 'error' });
  }
  load(rerender);
}

/** The unit a value is shown in: the biggest one it is a whole number of, else the biggest under it. */
function unitOf(value, fallback = MB) {
  if (!value) return fallback;
  const whole = [...UNITS].reverse().find(([, u]) => value >= u && value % u === 0);
  return whole?.[1] ?? [...UNITS].reverse().find(([, u]) => value >= u)?.[1] ?? KB;
}

// No grouping: what is shown can be typed back as it is ('1,5' or '1.5')
const number = v => new Intl.NumberFormat(sdk.locale?.code || undefined, { maximumFractionDigits: 2, useGrouping: false }).format(v);

/**
 * A size: a number (decimals with comma or dot) and its unit; onChange(bytes) after a change. With
 * `item` (a setting of the kernel) its range is checked here first, saying the row's name.
 */
function sizeField({ value, onChange, label, disabled = false, fallbackUnit = MB, item = null }) {
  let unit = unitOf(value, fallbackUnit);
  const input = h('input', { class: 'ctl-text set-size-n', type: 'text', inputmode: 'decimal', 'aria-label': label, disabled });
  input.value = number(value / unit);
  const select = h('select', { class: 'ctl-select set-size-u', 'aria-label': t('storage.size.unit', { name: label }), disabled },
    UNITS.map(([name, u]) => h('option', { value: String(u), selected: u === unit }, name)));
  const refuse = text => {
    toast(text, { level: 'error' });
    // The unit first: the menu may have just changed it
    unit = unitOf(value, fallbackUnit);
    select.value = String(unit);
    input.value = number(value / unit);
  };
  const commit = () => {
    const raw = String(input.value).trim().replace(/\s/g, '').replace(',', '.');
    const n = Number(raw);
    // Empty is not 0: a limit must not go away by mistake
    if (!raw || !Number.isFinite(n) || n < 0) return refuse(t('storage.size.invalid'));
    const bytes = Math.round(n * unit);
    if (item) {
      if (bytes === 0 && !item.zero) return refuse(t('storage.size.noZero', { name: label }));
      if (bytes > 0 && item.min != null && bytes < item.min) return refuse(t('storage.size.min', { name: label, min: formatBytes(item.min) }));
      if (bytes > 0 && item.max != null && bytes > item.max) return refuse(t('storage.size.max', { name: label, max: formatBytes(item.max) }));
    }
    if (bytes !== value) onChange(bytes);
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  select.addEventListener('change', () => { unit = Number(select.value); commit(); });
  return h('span', { class: 'set-size' }, [input, select]);
}

const badge = source => h('span', { class: `set-badge set-badge-${source}` }, t(`storage.source.${source}`));

/** A row of one of the kernel's settings: what it does, where its value comes from, the field and «Ripristina». */
function settingRow(item, rerender, { user = null, label, description } = {}) {
  const name = nameOf(item.key);
  label ??= t(`storage.setting.${name}.label`);
  return {
    label,
    description: description ?? t(`storage.setting.${name}.description`),
    keywords: t('storage.limits.keywords'),
    control: () => h('span', { class: 'set-size-row' }, [
      item.source !== 'default' && !item.locked
        ? actionButton({ label: t('storage.reset'), onClick: () => save({ reset: [item.key], ...(user && { user }) }, rerender) })
        : null,
      item.value === 0 && item.zero === 'unlimited' ? h('span', { class: 'set-size-hint' }, t('storage.unlimited')) : null,
      badge(item.locked ? 'locked' : item.source),
      sizeField({
        value: item.value, label, item, disabled: item.locked, fallbackUnit: name === 'quota' ? GB : MB,
        onChange: v => save({ set: { [item.key]: v }, ...(user && { user }) }, rerender),
      }),
    ]),
  };
}

/** '3,2 GB di 10 GB' with a bar, or just what is used when there is no quota. */
function usage(used, quota) {
  if (used == null) return t('common.unavailable');
  if (!quota) return h('span', { class: 'set-quota' }, [h('span', {}, t('storage.quota.noLimit', { used: formatBytes(used) }))]);
  const ratio = Math.min(1, used / quota);
  const level = ratio >= 1 ? 'full' : ratio >= 0.9 ? 'warn' : '';
  return h('span', { class: 'set-quota' }, [
    h('span', {}, t('storage.quota.of', { used: formatBytes(used), quota: formatBytes(quota) })),
    h('span', { class: `set-bar ${level}`, role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(ratio * 100)), 'aria-label': t('storage.quota.label') },
      h('i', { style: `width:${Math.round(ratio * 100)}%` })),
  ]);
}

const status = rerender => {
  if (state.error) return [{ title: '', rows: [{ label: t('storage.error'), description: state.error, control: actionButton({ label: t('storage.retry'), onClick: () => { reloadStorage(); load(rerender); } }) }] }];
  return [{ title: '', rows: [{ label: t('storage.loading'), control: '' }] }];
};

/** Il mio spazio: the user's space on the kernel (before what lilOS keeps, given by `own`). */
function mineSections(own, rerender) {
  if (!hasKernelSettings()) return own();
  if (!ready(rerender)) return [...(state.error ? status(rerender) : []), ...own()];
  const l = state.limits;
  return [
    {
      title: t('storage.mine.title'),
      rows: [
        { label: t('storage.mine.files'), description: l.quota ? t('storage.quota.description') : t('storage.quota.none'), keywords: t('storage.limits.keywords'), control: usage(l.used, l.quota) },
        { label: t('storage.maxFile.label'), description: t('storage.maxFile.description'), control: l.maxFileSize ? formatBytes(l.maxFileSize) : t('storage.unlimited') },
      ],
    },
    ...own(),
  ];
}

function limitSections(rerender) {
  if (!ready(rerender) || !state.items) return status(rerender);
  const byKey = new Map(state.items.map(i => [i.key, i]));
  const rows = keys => keys.filter(k => byKey.has(k)).map(k => settingRow(byKey.get(k), rerender));
  return [
    { title: t('storage.limits.title'), rows: rows(LIMITS) },
    { title: t('storage.pieces.title'), rows: rows(PIECES) },
    { title: '', rows: [{ label: '', description: t('storage.limits.saved'), control: h('span') }] },
  ];
}

function userSections(rerender) {
  if (!ready(rerender) || !state.items) return status(rerender);
  const quota = state.items.find(i => i.key === 'files.quota');
  if (!state.quotas || !quota) return [{ title: '', rows: [{ label: t('storage.users.unavailable'), description: t('storage.users.unavailableText'), control: '' }] }];
  const users = state.users ?? [];
  return [
    { title: t('storage.users.default.title'), rows: [settingRow(quota, rerender, { label: t('storage.setting.quota.label'), description: t('storage.setting.quota.description') })] },
    {
      title: t('storage.users.title'),
      rows: users.map(u => ({
        label: u.name || u.username,
        description: [u.username, u.role === 'admin' ? t('storage.users.admin') : null].filter(Boolean).join(' · '),
        keywords: `${u.username} ${u.name ?? ''}`,
        control: () => h('span', { class: 'set-user-quota' }, [
          usage(u.used, u.quota),
          u.own
            ? h('span', { class: 'set-size-row' }, [
              actionButton({ label: t('storage.users.useDefault'), onClick: () => save({ reset: ['files.quota'], user: u.id }, rerender) }),
              u.quota === 0 ? h('span', { class: 'set-size-hint' }, t('storage.unlimited')) : null,
              badge('user'),
              sizeField({ value: u.quota, label: t('storage.users.quotaOf', { name: u.name || u.username }), item: quota, fallbackUnit: GB, onChange: v => save({ set: { 'files.quota': v }, user: u.id }, rerender) }),
            ])
            : actionButton({ label: t('storage.users.custom'), onClick: () => save({ set: { 'files.quota': quota.value }, user: u.id }, rerender) }),
        ]),
      })),
    },
  ];
}

/**
 * The tab: `own()` gives the sections of what lilOS keeps (space used, reset), as before 1.33.0.
 * Without the kernel's settings (no kernel, an older one) only those.
 */
export function storageTab({ own, rerender }) {
  const subtabs = hasKernelSettings() ? [
    { id: 'mine', get label() { return t('storage.mine.label'); }, sections: () => mineSections(own, rerender) },
    ...(isAdmin() ? [
      { id: 'limits', get label() { return t('storage.limits.label'); }, sections: () => limitSections(rerender) },
      { id: 'users', get label() { return t('storage.users.label'); }, sections: () => userSections(rerender) },
    ] : []),
  ] : null;
  return {
    id: 'storage', icon: 'disk',
    get label() { return t('storage.label'); },
    get description() { return kernel.connected ? t('storage.description.kernel') : t('storage.description.browser'); },
    ...(subtabs ? { subtabs } : { sections: own }),
  };
}

/** Kernel settings changed elsewhere: fn() (to redraw). Returns the function that stops listening. */
export function watchStorage(fn) {
  if (!hasKernelSettings() || typeof sdk.kernelSettings.on !== 'function') return () => {};
  return sdk.kernelSettings.on('change', () => { reloadStorage(); fn(); });
}
