import { h, session, avatar, logo, shortcuts } from '@lilos/sdk';
import { createClock } from './Clock.js';
import { createBackgroundApps } from './BackgroundApps.js';
import { createPendingUpdates } from './PendingUpdates.js';
import { StartMenu } from './StartMenu.js';
import { NotificationBell } from '../notifications/NotificationBell.js';

/**
 * The taskbar (barra delle applicazioni), at the bottom: start button · a button per window ·
 * notification area (system tray: updates to finish, apps in the background, the notifications'
 * bell) · user and clock.
 */
export class Taskbar {
  constructor(parent) {
    this.startButton = h('button', {
      class: 'tb-start', 'aria-label': 'Menu lilOS', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    }, logo());
    this.startMenu = new StartMenu(this.startButton);
    this.startButton.addEventListener('click', () => this.startMenu.toggle());
    const title = () => { const k = shortcuts.label('system.startMenu'); this.startButton.title = k ? `Menu (${k})` : 'Menu'; };
    shortcuts.on('change', title);
    title();

    /** The window manager will mount one button per open window here. */
    this.tasks = h('div', { class: 'tb-tasks' });

    /** Opens the user page (connected by UserPage). */
    this.userButton = h('button', {
      class: 'tb-user', type: 'button', title: 'Pagina utente', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    }, avatar(session.user, 'avatar user-avatar'), h('span', {}, session.user.name));

    /** The notifications' bell and bar (connected by notifications/connect.js). */
    this.notificationBell = new NotificationBell();

    this.el = h('nav', { class: 'taskbar', 'aria-label': 'Barra delle applicazioni' },
      this.startButton,
      this.tasks,
      h('div', { class: 'tb-tray' },
        h('div', { class: 'tb-notify-area', role: 'group', 'aria-label': 'Area di notifica' },
          createPendingUpdates(),
          createBackgroundApps(),
          this.notificationBell.button),
        this.userButton,
        createClock(),
      ),
    );
    parent.append(this.el);
  }
}
