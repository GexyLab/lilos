import { h, icon, openMenu, shortcuts } from '@lilos/sdk';
import { launch } from '../apps/registry.js';

/**
 * Taskbar button right of the logo: the current workspace (color and name). Its menu lists the
 * workspaces to change to, makes a new one and opens Settings → Workspace.
 */
export class WorkspaceSwitcher {
  constructor(taskbar, workspaces) {
    this.workspaces = workspaces;
    this.dot = h('span', { class: 'tb-ws-dot', 'aria-hidden': 'true' });
    this.label = h('span', { class: 'tb-ws-name' });
    this.el = h('button', {
      class: 'tb-ws', type: 'button', 'aria-haspopup': 'menu',
      onclick: () => this.open(),
    }, this.dot, this.label, icon('arrowUp'));
    taskbar.startButton.after(this.el);

    const render = () => this.render();
    workspaces.on('change', render);
    workspaces.on('switch', render);
    shortcuts.on('change', render);
    render();
  }

  render() {
    const ws = this.workspaces.current;
    if (!ws) return;
    this.label.textContent = ws.name;
    this.dot.style.background = ws.color;   // validated hex color (store.js)
    const keys = [shortcuts.label('workspaces.previous'), shortcuts.label('workspaces.next')].filter(Boolean).join(' / ');
    this.el.title = keys ? `Workspace: ${ws.name} (${keys} per cambiare)` : `Workspace: ${ws.name}`;
    this.el.setAttribute('aria-label', `Workspace ${ws.name}: cambia workspace`);
  }

  open() {
    const { workspaces } = this;
    const current = workspaces.currentId;
    const list = workspaces.list();
    const r = this.el.getBoundingClientRect();
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
      { label: 'Gestisci i workspace…', icon: 'gear', action: () => launch('settings', { tab: 'workspaces' }) },
    ], { placement: 'above' });
  }
}
