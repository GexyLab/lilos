import { h, session, avatar, logo, shortcuts } from '@lilos/sdk';
import { createClock } from './Clock.js';
import { createBackgroundApps } from './BackgroundApps.js';
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

    this.el = h('nav', { class: 'taskbar' },
      this.startButton,
      this.tasks,
      h('div', { class: 'tb-tray' },
        createBackgroundApps(),
        h('div', { class: 'tb-user', title: session.user.name }, avatar(session.user), h('span', {}, session.user.name)),
        createClock(),
      ),
    );
    parent.append(this.el);
  }
}
