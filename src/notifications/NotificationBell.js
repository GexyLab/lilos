import { h, icon, notifications, settings, locale } from '@lilos/sdk';
import { notificationCard, runAction, senderOf } from './card.js';

const { t } = locale.define('lilos:notificationBell', {
  en: { strings: {
    title: 'Notifications', unread: { one: 'Notifications: {n} to read', other: 'Notifications: {n} to read' },
    stack: 'New notifications', sender: '{name}: {text}', dismiss: 'Remove from the bar',
  } },
});

/**
 * The bell in the notification area of the taskbar, with the count of the notifications not read
 * yet. A click opens the Notifiche window (onOpen, set by connectNotifications).
 *
 * When one arrives (the SDK's notifications, event 'new') the notification bar shows it above the
 * notification area, newest on top. The bar grows with each arrival up to `notifyShown` (Control
 * Panel → Notifiche); past that the older ones of the bar are not shown. It goes away
 * `notifySeconds` after the last arrival; while the pointer or the keyboard is in it, it stays.
 * A click runs the notification's action and marks it read; its × only takes it off the bar.
 * While the Notifiche window shows them, they go there instead (shown(): onShown).
 */
export class NotificationBell {
  /** () => void: opens the Notifiche window. */
  onOpen = null;
  /** (notification) => boolean: true when the Notifiche window shows it now (no bar then). */
  onShown = null;
  #stack = [];      // the bar's notifications, newest first
  #timer = 0;
  #held = false;    // pointer or focus inside the bar

  constructor() {
    this.count = h('span', { class: 'tb-badge', hidden: true });
    this.button = h('button', { class: 'tb-bg tb-bell', type: 'button', 'aria-haspopup': 'dialog' }, icon('bell'), this.count);
    this.button.addEventListener('click', () => this.onOpen?.());

    this.cards = h('div', { class: 'nt-stack-cards' });
    this.bar = h('div', { class: 'nt-stack-timer' }, h('i'));
    this.stack = h('section', { class: 'nt-stack', 'aria-label': t('stack'), hidden: true }, this.cards, this.bar);
    // Read by screen readers as they arrive; errors interrupt
    this.live = h('div', { class: 'nt-live', role: 'status', 'aria-live': 'polite' });
    this.alert = h('div', { class: 'nt-live', role: 'alert', 'aria-live': 'assertive' });
    document.body.append(this.stack, this.live, this.alert);

    const hold = on => {
      this.#held = on;
      if (on) this.#pause();
      else if (!this.stack.hidden) this.#restart();
    };
    this.stack.addEventListener('pointerenter', () => hold(true));
    this.stack.addEventListener('pointerleave', () => hold(this.stack.contains(document.activeElement)));
    this.stack.addEventListener('focusin', () => hold(true));
    this.stack.addEventListener('focusout', e => { if (!this.stack.contains(e.relatedTarget) && !this.stack.matches(':hover')) hold(false); });
    this.stack.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.hide(); this.button.focus(); } });

    notifications.on('new', n => this.#arrived(n));
    notifications.on('change', () => this.#changed());
    settings.on('change:notifyShown', () => this.#render());
    this.#changed();
  }

  /** Takes the bar away now (the Notifiche window opened, or Esc). */
  hide() {
    clearTimeout(this.#timer);
    this.#stack = [];
    this.#held = false;
    this.#render();
  }

  #arrived(n) {
    if (this.onShown?.(n)) return;
    if (this.stack.hidden) this.#stack = [];
    this.#stack.unshift(n);
    this.#render(n.id);
    this.#restart();
    (n.level === 'error' ? this.alert : this.live).textContent = t('sender', { name: senderOf(n).name, text: n.text });
  }

  /** Read, removed or kept fewer elsewhere: the bar drops what is gone, the count follows. */
  #changed() {
    const unread = notifications.unread;
    this.count.hidden = !unread;
    this.count.textContent = unread > 9 ? '9+' : String(unread);
    const label = unread ? t('unread', { n: unread }) : t('title');
    this.button.title = label;
    this.button.setAttribute('aria-label', label);
    const before = this.#stack.length;
    this.#stack = this.#stack.filter(n => notifications.get(n.id));
    if (this.#stack.length !== before) this.#render();
  }

  #render(fresh = null) {
    const shown = this.#stack.slice(0, Math.max(1, settings.get('notifyShown')));
    this.cards.replaceChildren(...shown.map(n => notificationCard(n, {
      className: n.id === fresh ? 'nt-enter' : '',
      closeLabel: t('dismiss'),
      onOpen: () => this.#open(n),
      onClose: () => this.#drop(n.id),
    })));
    this.stack.hidden = !shown.length;
    if (!shown.length) clearTimeout(this.#timer);
  }

  #open(n) {
    runAction(n);
    notifications.markRead([n.id]).catch(() => {});
    this.#drop(n.id);
  }

  #drop(id) {
    const focused = this.stack.contains(document.activeElement);
    this.#stack = this.#stack.filter(n => n.id !== id);
    this.#render();
    if (this.stack.hidden) {
      this.#held = false;
      if (focused) this.button.focus();
    } else if (focused) {
      this.cards.querySelector('button')?.focus();
    }
  }

  /** The bar stays `notifySeconds` from now; the line under it shows the time left. */
  #restart() {
    clearTimeout(this.#timer);
    const seconds = Math.max(1, settings.get('notifySeconds'));
    const line = this.bar.firstChild;
    this.bar.classList.remove('run', 'paused');
    void line.offsetWidth;   // starts the animation again
    line.style.animationDuration = `${seconds}s`;
    this.bar.classList.add('run');
    if (this.#held) return this.#pause();
    this.#timer = setTimeout(() => this.hide(), seconds * 1000);
  }

  #pause() {
    clearTimeout(this.#timer);
    this.bar.classList.add('paused');
  }
}
