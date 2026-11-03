import { Window, h, icon, appIcon, toggle, selectField, actionButton, toast, session } from '@lilos/sdk';
import { pickFile } from '@lilos/system';
import { paramsForm } from '../shared/paramsForm.js';
// Namespace import: lilOS versions without services still load Control Panel
import * as system from '@lilos/system';
import { t, i18n } from './i18n.js';

/**
 * Control Panel → Avvio → Servizi: the services of installed apps (entry points of kind 'service'),
 * which run in lilOS's kernel, also with lilOS closed (lilOS's apps/services.js). For each one:
 * how it is now, when it starts by itself (never, when the user comes in, when the system starts:
 * for everyone, admins only), its params, and buttons to start, stop, restart and read its log.
 * The list comes from the kernel and is read again when a service changes (its event stream).
 */
let state = null;     // the last services.list(), { error }, or null before the first one
let loading = null;

/** Reads the list again; `rerender` draws it. */
export function loadServices(rerender) {
  if (!system.services) {
    state = { get error() { return t('services.unsupported'); } };   // a getter: kept, and drawn in the language of the moment
    return;
  }
  loading ??= system.services.list()
    .then(list => { state = list; }, err => { state = { error: err.message }; })
    .finally(() => { loading = null; rerender(); });
}

/** Follows the changes of the services while Control Panel is open; returns the function that stops. */
export function watchServices(rerender) {
  return system.services?.on('change', () => loadServices(rerender)) ?? null;
}

/** "On for 5 minutes", "On since 03/10/2026". */
function onSince(time) {
  const min = Math.round((Date.now() - time) / 60_000);
  if (min < 1) return t('services.status.onNow');
  if (min < 60) return t('services.status.onMinutes', { n: min });
  const hours = Math.round(min / 60);
  return hours < 48 ? t('services.status.onHours', { n: hours }) : t('services.status.onSince', { date: i18n.date(time) });
}

function statusText(s) {
  if (s.status === 'on') return onSince(s.since);
  if (s.status === 'starting' && s.error) return t('services.status.restarting', { error: s.error });
  if (s.status === 'error') return t('services.status.error', { error: s.error ?? t('services.status.unknownError') });
  if (s.status === 'off') return t('services.status.off');
  if (s.status === 'starting') return t('services.status.starting');
  return s.status;
}

const run = async (work, rerender) => {
  try {
    await work();
  } catch (err) {
    toast(err.message, { timeout: 7000 });
  }
  loadServices(rerender);
};

/** Opzioni → "Avvia i servizi automaticamente" (the user's own; the ones for everyone always start). */
export function servicesOptionRow(rerender) {
  if (!state) loadServices(rerender);
  const ready = state && !state.error && state.available;
  const control = toggle({
    value: ready ? state.enabled : false, label: t('services.auto.label'),
    onChange: v => run(() => system.services.setEnabled(v), rerender),
  });
  control.disabled = !ready;
  return {
    label: t('services.auto.label'),
    description: !state ? t('common.loading') : state.error ? state.error : !state.available ? t('services.auto.noEngine')
      : t('services.auto.description'),
    keywords: t('services.auto.keywords'),
    control,
  };
}

/** ctx: { openWindow, rerender } */
export function servicesSections(ctx) {
  if (!state) loadServices(ctx.rerender);
  const note = text => [{ title: t('services.title'), rows: [{ label: text }] }];
  if (!state) return note(t('common.loading'));
  if (state.error) return note(state.error);
  if (!state.available) return note(t('services.noEngine'));
  if (!state.services.length) return note(t('services.none'));
  return [{
    title: t('services.title'),
    content: () => h('div', { class: 'su-apps' },
      h('p', { class: 'su-hint' }, t('services.hint')),
      h('div', { class: 'st-card su-app' }, state.services.flatMap(s => serviceRows(s, ctx)))),
  }];
}

function serviceRows(s, ctx) {
  const { rerender } = ctx;
  const name = `${s.name} · ${s.label}`;
  const options = [
    { value: 'none', label: t('services.startup.none') },
    { value: 'login', label: t('services.startup.login') },
    ...(state.admin || s.startup === 'system' ? [{ value: 'system', label: t('services.startup.system') }] : []),
  ];
  const when = selectField({ value: s.startup, options, label: t('services.startup.field', { name }), onChange: v => run(() => system.services.setStartup(s.app, s.entry, v), rerender) });
  when.disabled = s.system && !state.admin;
  const on = s.status === 'on' || s.status === 'starting';
  const restart = h('button', { class: 'ctl-btn su-clear', type: 'button', title: t('services.restart'), 'aria-label': t('services.restartOf', { name }) }, icon('redo'));
  restart.disabled = !s.canControl || !on;
  restart.addEventListener('click', () => run(() => system.services.restart(s.app, s.entry), rerender));
  const power = actionButton({ label: on ? t('services.stop') : t('services.start'), spinner: true, onClick: () => run(() => system.services[on ? 'stop' : 'start'](s.app, s.entry), rerender) });
  power.disabled = !s.canControl;
  power.classList.add('su-power');
  const logButton = actionButton({ label: t('services.log.label'), onClick: () => showLog(s, ctx) });
  logButton.disabled = s.system && !state.admin;

  const row = h('div', { class: 'st-row su-service' },
    appIcon(s, 'su-icon'),
    h('div', { class: 'st-label' }, h('b', {}, name),
      h('small', {}, h('span', { class: `su-state ${s.status}` }, statusText(s)), ' · ', h('code', {}, s.entry), s.system && !state.admin ? ` · ${t('services.byAdmin')}` : '')),
    when, restart, power, logButton);
  return s.params && s.startup !== 'none' ? [row, serviceParams(s, ctx)] : [row];
}

/** The params of a service that starts by itself; saved with its choice, used from its next start. Services work with paths ('~/Documenti/…'). */
function serviceParams(s, { openWindow, rerender }) {
  const form = paramsForm(s.params, s.values, {
    t, pathAs: 'tilde', locked: s.system && !state.admin, context: `${s.name} · ${s.label}`,
    pickFile: options => pickFile(openWindow, options),
    onChange: next => run(() => system.services.setStartup(s.app, s.entry, s.startup, next), rerender),
  });
  return h('div', { class: 'su-params' }, form.el);
}

/** The last lines the service wrote (console.*), and when it started and stopped. */
async function showLog(s, { openWindow }) {
  let lines;
  try {
    lines = await system.services.log(s.app, s.entry);
  } catch (err) {
    return toast(err.message, { timeout: 7000 });
  }
  const win = new Window({ title: t('services.log.title', { name: `${s.name} · ${s.label}` }), icon: 'list', width: 620, height: 380 });
  const time = at => new Date(at).toLocaleTimeString(session.locale);
  win.body.append(h('div', { class: 'su-log', tabindex: '0', 'aria-label': t('services.log.label') },
    lines.length ? lines.map(l => h('div', { class: `su-line ${l.level}` }, h('span', {}, time(l.at)), ` ${l.text}`)) : h('p', { class: 'su-empty' }, t('services.log.empty'))));
  openWindow(win);
}
