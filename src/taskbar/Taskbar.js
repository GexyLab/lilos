import { h, logo, shortcuts, locale } from '@lilos/sdk';
import { createClock } from './Clock.js';
import { createBackgroundApps } from './BackgroundApps.js';
import { createPendingUpdates } from './PendingUpdates.js';
import { StartMenu } from './StartMenu.js';
import { NotificationBell } from '../notifications/NotificationBell.js';
import { TransfersButton } from '../net/TransfersButton.js';

const { t } = locale.define('lilos:taskbar', {
  en: { strings: { start: 'lilOS menu', menu: 'Menu', menuKeys: 'Menu ({keys})', taskbar: 'Taskbar', tray: 'Notification area' } },
});

/**
 * The taskbar (barra delle applicazioni), at the bottom: start button · a button per window ·
 * notification area (system tray: updates to finish, apps in the background, the network transfers,
 * the notifications' bell) · clock. The user page opens from the start menu.
 */
export class Taskbar {
  constructor(parent) {
    this.startButton = h('button', {
      class: 'tb-start', 'aria-label': t('start'), 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    }, logo());
    this.startMenu = new StartMenu(this.startButton);
    this.startButton.addEventListener('click', () => this.startMenu.toggle());
    const title = () => { const k = shortcuts.label('system.startMenu'); this.startButton.title = k ? t('menuKeys', { keys: k }) : t('menu'); };
    shortcuts.on('change', title);
    title();

    /** The window manager will mount one button per open window here. */
    this.tasks = h('div', { class: 'tb-tasks' });

    /** The notifications' bell and bar (connected by notifications/connect.js). */
    this.notificationBell = new NotificationBell();
    /** The network transfers' button (connected by net/connect.js). */
    this.transfersButton = new TransfersButton();

    this.el = h('nav', { class: 'taskbar', 'aria-label': t('taskbar') },
      this.startButton,
      this.tasks,
      h('div', { class: 'tb-tray' },
        h('div', { class: 'tb-notify-area', role: 'group', 'aria-label': t('tray') },
          createPendingUpdates(),
          createBackgroundApps(),
          this.transfersButton.button,
          this.notificationBell.button),
        createClock(),
      ),
    );
    parent.append(this.el);
  }
}
