import { Window } from './Window.js';
import { SettingsView } from './SettingsView.js';

/**
 * Base of every window that edits settings: a Window whose body is a SettingsView.
 * The subtitle follows the selected main tab ("Sistema — Aspetto").
 *
 *   new SettingsWindow({ title, icon, tabs, footer?, search?, width?, height? })
 *
 * Without `footer` changes are meant to apply immediately; pass footer.buttons
 * (e.g. Annulla / Applica / OK) for windows that apply on confirm.
 */
export class SettingsWindow extends Window {
  constructor({ tabs, footer = null, search = true, width = 800, height = 560, minWidth = 560, minHeight = 360, ...options } = {}) {
    super({ width, height, minWidth, minHeight, ...options });
    this.el.classList.add('settings-window');
    this.view = new SettingsView({ tabs, footer, search });
    this.body.append(this.view.el);

    const title = options.title ?? '';
    const follow = () => this.setTitle(title, this.view.tab?.label ?? '');
    this.view.on('select', follow);
    follow();
  }
}
