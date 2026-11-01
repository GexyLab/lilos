import { h, icon, logo, appIcon, locale } from '@lilos/sdk';
import { getApp, launch } from '../apps/registry.js';
import { notify } from './notify.js';

const LEVELS = { error: 'Errore', warning: 'Avviso', success: 'Fatto' };

/**
 * What lilOS's own notifications can do on a click: action.entry → fn(args). The kernel's
 * transfers send { entry: 'transfers' } (the transfer window opens).
 */
export const systemActions = new Map();

/** Who sent it, as lilOS shows them: an installed app with its (translated) name and icon, or lilOS. */
export function senderOf(n) {
  if (!n.from?.app) return { name: 'lilOS', tile: () => h('span', { class: 'app-icon nt-lilos' }, logo()) };
  const app = getApp(n.from.app);
  return {
    name: app?.name ?? n.from.name ?? n.from.app,
    tile: () => appIcon(app ?? { glyph: 'window' }),
  };
}

/** '1 nov 2026, 14:32', in the system's language. */
export const formatTime = at => new Intl.DateTimeFormat(locale.code, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(at);

/**
 * One notification, as the notification bar and the Notifiche window show it: sender, date and
 * time, level, text; a button that runs its action (when it has one) and one that closes it.
 *   onOpen()    clicked (only with an action)
 *   onClose()   its × (closeLabel says what it does)
 */
export function notificationCard(n, { className = '', onOpen, onClose, closeLabel }) {
  const from = senderOf(n);
  const head = h('div', { class: 'nt-head' },
    h('span', { class: 'nt-from' }, from.name),
    LEVELS[n.level] ? h('span', { class: `nt-level nt-${n.level}` }, LEVELS[n.level]) : null,
    h('time', { class: 'nt-time', datetime: new Date(n.at).toISOString() }, formatTime(n.at)));
  const body = [from.tile(), h('div', { class: 'nt-body' }, head, h('p', { class: 'nt-text' }, n.text))];
  const actionable = !!(n.action && (n.from?.app || (n.from?.system && systemActions.has(n.action.entry))));
  const main = actionable
    ? h('button', { class: 'nt-main', type: 'button', title: n.from?.system ? "Apri" : `Apri ${from.name}`, onclick: onOpen }, ...body)
    : h('div', { class: 'nt-main' }, ...body);
  return h('div', { class: `nt-card ${className}`, dataset: { id: n.id, level: n.level } },
    main,
    h('button', { class: 'nt-close', type: 'button', title: closeLabel, 'aria-label': closeLabel, onclick: onClose }, icon('x')));
}

/**
 * What a click on a notification does: its app opens at the entry point it asked, with its args.
 * Never with `file` or `files`: a launch with them hands the app those files, and only the user does that.
 */
export function runAction(n) {
  if (n.action && n.from?.system) return systemActions.get(n.action.entry)?.(n.action.args ?? null);
  if (!n.action || !n.from?.app) return;
  if (!getApp(n.from.app)) return notify(`${n.from.name ?? n.from.app} non è più installata`, { level: 'warning' });
  let args = n.action.args ?? undefined;
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    const { file, files, ...rest } = args;
    args = rest;
  }
  launch(n.from.app, args, n.action.entry ?? 'main');
}
