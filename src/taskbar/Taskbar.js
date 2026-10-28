import { h } from '../core/dom.js';
import { session } from '../core/session.js';
import { avatar } from '../ui/avatar.js';
import { logo } from '../ui/icons.js';
import { createClock } from './Clock.js';
import { StartMenu } from './StartMenu.js';

/** Bottom bar: start button · task area (window buttons, later) · user and clock. */
export class Taskbar {
  constructor(parent) {
    this.startButton = h('button', {
      class: 'tb-start', title: 'Menu (Ctrl K)', 'aria-label': 'Menu lilOS', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    }, logo());
    this.startMenu = new StartMenu(this.startButton);
    this.startButton.addEventListener('click', () => this.startMenu.toggle());

    /** The window manager will mount one button per open window here. */
    this.tasks = h('div', { class: 'tb-tasks' });

    this.el = h('nav', { class: 'taskbar' },
      this.startButton,
      this.tasks,
      h('div', { class: 'tb-tray' },
        h('div', { class: 'tb-user', title: session.user.name }, avatar(session.user), h('span', {}, session.user.name)),
        createClock(),
      ),
    );
    parent.append(this.el);
  }
}
