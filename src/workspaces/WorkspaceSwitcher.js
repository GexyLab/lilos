import { h, icon, openMenu, settings, shortcuts } from '@lilos/sdk';
import { launch } from '../apps/registry.js';

/**
 * Taskbar workspaces, right of the logo. With the setting taskbarWorkspaces 'current' (default)
 * one button shows the current workspace (color and name); with 'all' every workspace has its own
 * button, in order, and a click changes to it. The menu (the button, the arrow after the list, or a
 * right click on any of them) lists the workspaces to change to, makes a new one and opens
 * Control Panel → Workspace.
 */
export class WorkspaceSwitcher {
  /** Id of the workspace whose button gets the focus at the next render (a change started from the row). */
  #refocus = null;

  constructor(taskbar, workspaces) {
    this.workspaces = workspaces;
    this.el = h('div', { class: 'tb-ws-area', role: 'group', 'aria-label': 'Workspace' });
    this.el.addEventListener('contextmenu', e => { e.preventDefault(); this.open(); });
    taskbar.startButton.after(this.el);

    const render = () => this.render();
    workspaces.on('change', render);
    workspaces.on('switch', render);
    shortcuts.on('change', render);
    settings.on('change:taskbarWorkspaces', render);
    render();
  }

  get all() { return settings.get('taskbarWorkspaces') === 'all'; }

  render() {
    const ws = this.workspaces.current;
    if (!ws) return;
    const keys = [shortcuts.label('workspaces.previous'), shortcuts.label('workspaces.next')].filter(Boolean).join(' / ');
    // Keep the focus on the button that had it (Tab, then Enter on a workspace). Changing workspace
    // blurs everything first (Workspaces.#switch), so a change started from the row says where it goes
    const focused = this.#refocus ?? (this.el.contains(document.activeElement) ? document.activeElement.dataset.ws : null);
    this.#refocus = null;
    this.el.classList.toggle('all', this.all);
    if (this.all) {
      const buttons = this.workspaces.list().map(w => {
        const current = w.id === ws.id;
        const tip = [w.name, w.description, current && keys ? `${keys} per cambiare` : ''].filter(Boolean).join('\n');
        return h('button', {
          class: current ? 'tb-ws on' : 'tb-ws', type: 'button', title: tip, 'data-ws': w.id,
          'aria-current': current ? 'true' : null,
          onclick: () => {
            if (current) return;
            if (this.el.contains(document.activeElement)) this.#refocus = w.id;
            this.workspaces.switchTo(w.id);
          },
        }, dot(w.color), h('span', { class: 'tb-ws-name' }, w.name));
      });
      const more = h('button', {
        class: 'tb-ws-more', type: 'button', title: 'Workspace…', 'aria-label': 'Menu dei workspace', 'aria-haspopup': 'menu', 'data-ws': 'menu',
        onclick: () => this.open(more),
      }, icon('arrowUp'));
      this.el.replaceChildren(...buttons, more);
    } else {
      const button = h('button', {
        class: 'tb-ws', type: 'button', 'aria-haspopup': 'menu', 'data-ws': 'menu',
        title: keys ? `Workspace: ${ws.name} (${keys} per cambiare)` : `Workspace: ${ws.name}`,
        'aria-label': `Workspace ${ws.name}: cambia workspace`,
        onclick: () => this.open(button),
      }, dot(ws.color), h('span', { class: 'tb-ws-name' }, ws.name), icon('arrowUp'));
      this.el.replaceChildren(button);
    }
    if (focused) (this.el.querySelector(`[data-ws="${CSS.escape(focused)}"]`) ?? this.el.querySelector('[aria-current], .tb-ws'))?.focus();
  }

  open(anchor = this.el) {
    const { workspaces } = this;
    const current = workspaces.currentId;
    const list = workspaces.list();
    const r = anchor.getBoundingClientRect();
    openMenu(r.left, r.top - 4, [
      { label: 'Workspace', icon: 'workspace', disabled: true },
      ...list.map(w => ({
        label: w.name, icon: w.id === current ? 'check' : null,
        action: () => workspaces.switchTo(w.id),
      })),
      '-',
      { label: 'Successivo', icon: 'arrowRight', shortcut: shortcuts.label('workspaces.next'), disabled: list.length < 2, action: () => workspaces.step(1) },
      { label: 'Precedente', icon: 'arrowLeft', shortcut: shortcuts.label('workspaces.previous'), disabled: list.length < 2, action: () => workspaces.step(-1) },
      '-',
      { label: 'Nuovo workspace', icon: 'plus', action: () => { const id = workspaces.create(); if (id) workspaces.switchTo(id); } },
      {
        label: this.all ? 'Mostra solo il workspace attuale' : 'Mostra tutti i workspace', icon: 'workspace',
        action: () => settings.set('taskbarWorkspaces', this.all ? 'current' : 'all'),
      },
      { label: 'Gestisci i workspace…', icon: 'gear', action: () => launch('settings', { tab: 'workspaces' }) },
    ], { placement: 'above' });
  }
}

/** The workspace's color (a validated hex color, store.js). */
function dot(color) {
  const el = h('span', { class: 'tb-ws-dot', 'aria-hidden': 'true' });
  el.style.background = color;
  return el;
}
