import { h, Window, notifications, actionButton, locale, toast } from '@lilos/sdk';
import { notificationCard, runAction } from './card.js';

const KEY = 'notifications';

const dayOf = at => { const d = new Date(at); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** 'Oggi', 'Ieri' or the date ('venerdì 30 ottobre'; with the year when it is another one). */
function dayLabel(at) {
  const days = Math.round((dayOf(Date.now()) - dayOf(at)) / 86_400_000);
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  const sameYear = new Date(at).getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(locale.code, { weekday: 'long', day: 'numeric', month: 'long', ...(!sameYear && { year: 'numeric' }) }).format(at);
}

/**
 * The Notifiche window (one per workspace): every notification kept, newest first, by day.
 * Opening it marks them read; those that were new keep their dot until it closes, and so do the
 * ones that arrive while it is open. A click runs a notification's action; its × deletes it.
 */
export function showNotifications(wm) {
  const open = wm.get(KEY);
  if (open) {
    wm.show(open);
    return open;
  }
  const win = new Window({ title: 'Notifiche', icon: 'bell', width: 480, height: 480, minWidth: 320, minHeight: 240 });
  const fresh = new Set(notifications.list().filter(n => !n.read).map(n => n.id));
  const count = h('span', { class: 'nt-count' });
  const markAll = actionButton({ label: 'Segna tutte come lette', onClick: () => markRead() });
  const clear = actionButton({ label: 'Cancella tutte', onClick: () => notifications.clear().catch(err => toast(`Notifiche non cancellate: ${err.message}`)) });
  const list = h('div', { class: 'nt-list', role: 'list' });
  win.body.append(h('div', { class: 'nt-window' }, h('div', { class: 'nt-toolbar' }, count, markAll, clear), list));

  const markRead = () => {
    fresh.clear();
    render();
    notifications.markRead().catch(() => {});
  };

  const render = () => {
    const items = notifications.list();
    const kept = `${items.length} di ${notifications.keep} conservate`;
    count.textContent = fresh.size ? `${kept} · ${fresh.size} nuove` : kept;
    markAll.disabled = !fresh.size && !notifications.unread;
    clear.disabled = !items.length;
    if (!items.length) {
      list.replaceChildren(h('p', { class: 'nt-empty' }, 'Nessuna notifica'));
      return;
    }
    const rows = [];
    let day = null;
    for (const n of items) {
      if (dayOf(n.at) !== day) {
        day = dayOf(n.at);
        rows.push(h('h3', { class: 'nt-day' }, dayLabel(n.at)));
      }
      const card = notificationCard(n, {
        className: fresh.has(n.id) ? 'nt-unread' : '',
        closeLabel: 'Cancella',
        onOpen: () => runAction(n),
        onClose: () => notifications.remove([n.id]).catch(err => toast(`Notifica non cancellata: ${err.message}`)),
      });
      card.setAttribute('role', 'listitem');
      rows.push(card);
    }
    list.replaceChildren(...rows);
  };

  const offs = [
    notifications.on('new', n => {
      fresh.add(n.id);
      notifications.markRead([n.id]).catch(() => {});
    }),
    notifications.on('change', render),
  ];
  win.on('destroy', () => offs.forEach(off => off()));
  render();
  if (notifications.unread) notifications.markRead().catch(() => {});
  return wm.open(win, { key: KEY });
}

/** True when the Notifiche window of this workspace is open and not minimized: it shows what arrives. */
export const notificationsShown = wm => {
  const win = wm.get(KEY);
  return !!win && !win.el.hidden;
};
