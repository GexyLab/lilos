import { h, session, avatar, logo, shortcuts } from '@lilos/sdk';
import { createClock } from './Clock.js';
import { createBackgroundApps } from './BackgroundApps.js';
import { createPendingUpdates } from './PendingUpdates.js';
import { StartMenu } from './StartMenu.js';

/** Bottom bar: start button · task area (window buttons, later) · user and clock. */
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

    this.el = h('nav', { class: 'taskbar' },
      this.startButton,
      this.tasks,
      h('div', { class: 'tb-tray' },
        createPendingUpdates(),
        createBackgroundApps(),
        this.userButton,
        createClock(),
      ),
    );
    parent.append(this.el);
  }
}
