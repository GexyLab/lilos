import { h, icon, Window, messageBox, LogicConsoleView } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * The panel under the editors: a tab for each console of the project (the main one first, ★),
 * + to make another, and Problemi. While a test runs, the consoles show what its blocks write,
 * and the one with a question waiting has ⌨ and the line to answer.
 */
export class BottomPanel {
  el; #tabs; #body;
  #studio;
  #active = 'main';
  #views = new Map();        // console id → LogicConsoleView (of the running test)
  #problems = [];
  #collapsed = false;

  constructor(studio) {
    this.#studio = studio;
    this.#tabs = h('div', { class: 'ls-btabs', role: 'tablist' });
    this.#body = h('div', { class: 'ls-bbody' });
    this.el = h('div', { class: 'ls-bottom' }, this.#tabs, this.#body);
  }

  /** The consoles to show: the running program's, else the project's (or the schema alone's). */
  #consoles() {
    const store = this.#studio.runner.consoles;
    if (store) return store.list().map(c => ({ id: c.id, name: c.name, color: c.color, main: c.main, ask: !!c.ask }));
    const ws = this.#studio.ws;
    const list = ws?.project?.data.consoles.list ?? [{ id: 'main', name: t('console.main') }];
    return list.map(c => ({ id: c.id, name: c.id === 'main' ? c.name || t('console.main') : c.name, color: c.color ?? null, main: c.id === 'main', ask: false }));
  }

  /** A test started or stopped: views on its consoles, or none. */
  attach(store) {
    for (const v of this.#views.values()) v.destroy();
    this.#views.clear();
    if (store) {
      store.on('change', () => this.render());
      store.on('ask', ({ console }) => { this.#active = console; this.#collapsed = false; this.render(); this.#views.get(console)?.focus(); });
      store.on('done', () => this.render());
    }
    this.render();
  }

  setProblems(list) {
    this.#problems = list;
    if (list.length) { this.#active = 'problems'; this.#collapsed = false; }
    this.render();
  }

  render() {
    const consoles = this.#consoles();
    if (this.#active !== 'problems' && !consoles.some(c => c.id === this.#active)) this.#active = 'main';
    const tab = (key, label, extra = []) => h('button', {
      type: 'button', role: 'tab', class: this.#active === key ? 'on' : '', 'aria-selected': String(this.#active === key),
      onclick: () => { this.#active = key; this.#collapsed = false; this.render(); },
    }, ...extra, label);
    const tabs = consoles.map(c => tab(c.id, c.name, [
      h('i', { class: 'cdot', style: `background:${c.color || '#6b7280'}` }),
      ...(c.main ? [h('b', { class: 'star', title: t('console.mainHint') }, '★')] : []),
    ]));
    for (const [i, c] of consoles.entries()) if (c.ask) tabs[i].append(h('b', { class: 'kb', title: t('console.asking') }, '⌨'));
    const ws = this.#studio.ws;
    const right = [h('span', { class: 'sp' })];
    if (this.#active !== 'problems' && this.#studio.runner.consoles) {
      right.push(h('button', { type: 'button', class: 'act', onclick: () => this.#detach(this.#active) }, t('console.detach')));
    }
    right.push(h('button', { type: 'button', class: 'act', title: t(this.#collapsed ? 'console.expand' : 'console.collapse'), onclick: () => { this.#collapsed = !this.#collapsed; this.render(); } }, icon(this.#collapsed ? 'arrowUp' : 'arrowDown')));
    this.#tabs.replaceChildren(...tabs,
      ws?.project ? h('button', { type: 'button', class: 'add', title: t('console.add'), onclick: () => this.#add() }, '+') : null,
      h('span', { class: 'bsep' }),
      tab('problems', t('problems.title'), this.#problems.length ? [h('span', { class: 'n' }, String(this.#problems.length))] : []),
      ...right);
    this.el.classList.toggle('collapsed', this.#collapsed);
    if (this.#collapsed) { this.#body.replaceChildren(); return; }
    if (this.#active === 'problems') { this.#body.replaceChildren(this.#problemList()); return; }
    const store = this.#studio.runner.consoles;
    if (!store) { this.#body.replaceChildren(h('p', { class: 'ls-empty' }, t('console.idle'))); return; }
    let view = this.#views.get(this.#active);
    if (!view) {
      view = new LogicConsoleView(store, { console: this.#active, labels: { hint: t('console.hint'), kinds: { text: t('kind.text'), number: t('kind.number'), bool: t('kind.bool'), key: t('kind.key') } } });
      this.#views.set(this.#active, view);
    }
    this.#body.replaceChildren(view.el);
  }

  #problemList() {
    if (!this.#problems.length) return h('p', { class: 'ls-empty' }, t('problems.none'));
    return h('ul', { class: 'ls-problems' }, ...this.#problems.map(p => h('li', {
      class: p.level ?? 'error', tabIndex: 0,
      onclick: () => this.#goTo(p.where),
      onkeydown: e => { if (e.key === 'Enter') this.#goTo(p.where); },
    }, icon(p.level === 'warning' ? 'warning' : 'error'), h('span', {}, p.message), p.where?.schema ? h('em', {}, p.where.schema) : p.where?.window ? h('em', {}, p.where.window) : null)));
  }

  async #goTo(where) {
    const studio = this.#studio;
    if (!where || !studio.ws) return;
    if (where.schema) {
      const path = studio.ws.project?.data.schemas[where.schema] ?? (studio.ws.single ? [...studio.tabs].find(x => x.kind === 'schema')?.path : null);
      if (!path) return;
      await studio.openElement('schemas', path);
      if (where.block) { studio.current?.view.canvas.select([where.block]); studio.current?.view.canvas.fit([where.block]); }
    } else if (where.window) {
      const path = studio.ws.project?.data.windows[where.window];
      if (path) studio.openElement('windows', path);
    }
  }

  async #add() {
    const project = this.#studio.ws?.project;
    if (!project) return;
    const res = await messageBox(this.#studio.win, {
      icon: 'terminal', title: t('console.add'),
      fields: [{ name: 'name', label: t('explorer.name'), value: '', required: true, maxLength: 60 }],
      buttons: ['cancel', { value: 'ok', label: t('common.create'), primary: true }],
    });
    if (res?.button !== 'ok') return;
    this.#active = project.addConsole(res.values.name.trim());
    this.render();
  }

  /** A console of the running test in a window of its own (two screens). */
  #detach(id) {
    const store = this.#studio.runner.consoles;
    const c = store?.get(id);
    if (!c) return;
    const win = new Window({ title: t('console.windowTitle', { name: c.name }), subtitle: this.#studio.ws?.name ?? '', icon: 'terminal', width: 560, height: 340 });
    const view = new LogicConsoleView(store, { console: id, labels: { hint: t('console.hint') } });
    win.body.append(view.el);
    win.on('destroy', () => view.destroy());
    this.#studio.openWindow(win, `console-${id}`);
  }
}
