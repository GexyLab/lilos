import * as sdk from '@lilos/sdk';   // `term` and `net`: missing in older lilOS, so not imported by name
import { handleCommand, pickFile } from '@lilos/system';
import { RemoteTab, badge } from './remote/RemoteTab.js';
import { hostDialog } from './remote/dialogs.js';
import { Grid, Group } from './grid.js';
import { dragTab, groupAt } from './drag.js';
import { COMMANDS, keysOf } from './keys.js';
import { openTermFile, saveTermDialog, addTermToDesk, canSaveTerm } from './termFile.js';
import { openOptions } from './options.js';
import { i18n, t } from './i18n.js';

const { h, icon, fs, storage } = sdk;
const SIDE_KEY = 'terminal.side';
const HERE = 'terminal.sshHere';
const SIDES = { focusLeft: 'left', focusRight: 'right', focusUp: 'up', focusDown: 'down', moveLeft: 'left', moveRight: 'right', moveUp: 'up', moveDown: 'down' };

/** Every Terminal window open in the page: tabs move from one to another. */
export const windows = new Set();

/** A tab's key in the TabBar of its pane: the same in every pane and window it moves to. */
const keys = new WeakMap();
let lastKey = 0;
const keyOf = tab => {
  if (!keys.has(tab)) keys.set(tab, `tab-${++lastKey}`);
  return keys.get(tab);
};

/** The protocol's badge of a remote tab, made once (the TabBar draws an icon again only when it changes). */
const badges = new WeakMap();
function badgeOf(tab) {
  const protocol = tab.session.protocol;
  if (badges.get(tab)?.protocol !== protocol) badges.set(tab, { protocol, el: badge(protocol) });
  return badges.get(tab).el;
}

/**
 * One Terminal window: its tabs (shells and remote sessions) in a grid of panes, each pane with its
 * own tab bar (grid.js), and the side panel of the saved hosts and of the remote sessions still
 * running in the kernel. Tabs move between panes and between windows (the tab's menu, dragging,
 * the shortcuts of keys.js); a tab dragged out of the window becomes a window of its own. With
 * «send input to all panes» on, what is typed in the tab shown in a pane goes to the tabs shown in
 * the others too. The shells' commands reach the window as host.remote (commands/remote.js):
 * open(spec), resume(session), data().
 *
 *   new TerminalWindow(win, args, { makeShell, makeWindow, openWindow })
 *     makeShell(owner, args) → a shell tab (TerminalApp.js); makeWindow(args, at?) → a new
 *     TerminalWindow in a window of its own (opened as a main window of the app: saved and restored)
 *     args: { cwd } | { file } (a .term file) | { layout } (state(): a window coming back) | { empty }
 *   tab interface: el, name, subtitle, title?, closed, activity, remote, owner, show(), hide(),
 *     focus(), dispose(), receive(data), state(), reflow()
 */
export class TerminalWindow {
  data = { protocols: [], encodings: [], hosts: [], sessions: [] };
  active = null;          // the pane (Group) with the keyboard
  broadcast = false;
  #makeShell;
  #makeWindow;
  #offs = [];
  #loading = null;

  constructor(win, args, { makeShell, makeWindow, openWindow }) {
    this.win = win;
    this.openWindow = openWindow;
    this.#makeShell = makeShell;
    this.#makeWindow = makeWindow;
    this.remote = {
      data: () => this.load(),
      open: spec => this.openRemote(spec),
      resume: session => this.resume(session),
    };
    this.side = h('aside', { class: 'tm-side', 'aria-label': t('remote.side.label') });
    // The buttons of the tab bars: the side panel's and the window's menu in the first pane's bar
    this.sideButton = h('button', { type: 'button', class: 'tm-iconbtn', title: t('remote.side.toggle'), 'aria-label': t('remote.side.toggle'), onclick: () => this.toggleSide() }, icon('sidebar'));
    this.menuButton = h('button', {
      type: 'button', class: 'tm-iconbtn', title: t('menu.title'), 'aria-label': t('menu.title'), 'aria-haspopup': 'menu',
      onclick: e => { const r = e.currentTarget.getBoundingClientRect(); this.#appMenu(r.right - 220, r.bottom); },
    }, icon('list'));
    this.grid = new Grid(() => this.#layoutChanged());
    win.body.classList.add('tm');
    win.body.append(h('div', { class: 'tm-layout' }, this.side, this.grid.el));
    this.side.hidden = storage.get(SIDE_KEY, false) !== true;
    windows.add(this);

    const term = sdk.term;
    if (term) {
      this.#offs.push(term.on('hosts', () => this.load()), term.on('sessions', () => this.load()));
      this.load();
    }
    this.#offs.push(...COMMANDS.map(id => handleCommand(id, { isActive: () => win.active, run: () => this.command(id) })));
    win.on('destroy', () => {
      windows.delete(this);
      this.#offs.forEach(off => off?.());
      for (const tab of this.tabs) tab.dispose();   // the remote sessions stay in the kernel (10 minutes)
      for (const group of this.grid.groups()) group.dispose();
    });

    if (!(args?.layout && this.#restore(args.layout))) {
      this.grid.root = this.#newGroup();
      this.grid.render();
      this.active = this.grid.root;
      if (!args?.empty && !args?.file) this.add(this.#makeShell(this, args));
    }
    if (args?.file) this.#openFile(args.file, true);
    else if (args?.action) this.launched(args);
  }

  /** A new shell tab for this window (not added yet). */
  makeShell(args = {}) { return this.#makeShell(this, args); }

  get tabs() { return this.grid.groups().flatMap(g => g.tabs); }
  get current() { return this.active?.current ?? null; }
  groupOf(tab) { return this.grid.groups().find(g => g.tabs.includes(tab)) ?? null; }
  firstLocal() { return this.tabs.find(tab => !tab.remote) ?? null; }
  nameOf(tab) { return tab.customName || tab.name; }

  /** How other windows' menus name this one: 'web-01 · 3 tabs'. */
  label() {
    const n = this.tabs.length;
    return `${this.current ? this.nameOf(this.current) : t('ui.title')} · ${t('tabs.count', { n })}`;
  }

  error(err) {
    sdk.notifications?.send?.({ text: `${t('ui.title')}: ${err?.message ?? err}`, level: 'error' });
  }

  /** Opened again: a .term file, a folder (go there), or the menu of a folder of an SFTP connection. */
  launched(args) {
    if (args?.file) return this.#openFile(args.file, false);
    if (args?.action === HERE && Array.isArray(args.files) && args.files[0]) return this.openHere(args.files[0]);
    if (args?.cwd && fs.get(args.cwd)?.type === 'folder') {
      const shell = this.current && !this.current.remote ? this.current : this.firstLocal() ?? this.add(this.#makeShell(this, {}));
      this.select(shell);
      shell.changeDir(args.cwd);
    }
  }

  /** A .term file; fresh: this window was opened for it (no other window is needed). */
  #openFile(id, fresh) {
    openTermFile(this, id, { fresh }).catch(err => this.error(err)).finally(() => {
      if (fresh && !this.tabs.length) this.add(this.#makeShell(this, {}));
    });
  }

  /** A new Terminal window (empty unless args say otherwise), as big as this one; at: a point of the screen. */
  newWindow(args = { empty: true }, at = null) {
    const r = this.win.el;
    return this.#makeWindow({ ...args, size: { w: parseFloat(r.style.width) || r.offsetWidth, h: parseFloat(r.style.height) || r.offsetHeight } }, at);
  }

  // ---------- Data ----------

  async load() {
    if (!sdk.term) return this.data;
    this.#loading ??= sdk.term.load().then(data => { this.data = data; }, err => { this.data = { ...this.data, error: err.message }; })
      .finally(() => { this.#loading = null; this.drawSide(); this.drawTabs(); });
    await this.#loading;
    return this.data;
  }

  // ---------- Panes and tabs ----------

  #newGroup() {
    const tabOf = key => group.tabs.find(tab => keyOf(tab) === key) ?? null;
    const group = new Group({ dragStart: (e, key) => { const tab = tabOf(key); if (tab) dragTab(e, tab, this); } });
    groupAt.set(group.el, { owner: this, group });
    group.el.addEventListener('pointerdown', () => this.#activate(group), true);
    group.el.addEventListener('focusin', () => this.#activate(group));
    const bar = group.tabBar;
    // Chosen with the keys (← →): the focus stays on the bar, where show() would take it away
    let byKeys = false;
    bar.list.addEventListener('keydown', () => { byKeys = true; setTimeout(() => { byKeys = false; }); }, true);
    bar.on('select', key => {
      const tab = tabOf(key);
      if (!tab || group.current === tab) return;
      this.select(tab);
      if (byKeys) requestAnimationFrame(() => bar.focus());
    });
    bar.on('close', key => { const tab = tabOf(key); if (tab) this.closeTab(tab); });
    bar.on('new', () => this.add(this.#makeShell(this, { cwd: this.#cwdNear(group) }), group));
    bar.on('menu', ({ key, x, y }) => { const tab = tabOf(key); if (tab) { this.select(tab); this.tabMenu(tab, x, y); } });
    // The free part of the bar: the window's menu
    bar.el.addEventListener('contextmenu', e => { if (e.target === bar.el || e.target === bar.list) { e.preventDefault(); this.#appMenu(e.clientX, e.clientY); } });
    return group;
  }

  #activate(group) {
    if (this.active === group) return;
    this.active = group;
    this.#markActive();
    if (group.current) this.win.setTitle(t('ui.title'), group.current.subtitle);
  }

  #markActive() {
    for (const g of this.grid.groups()) g.el.classList.toggle('active', g === this.active);
  }

  /** The folder of the shell shown in a pane (or of any shell of the window), for a new shell. */
  #cwdNear(group) {
    const tab = group?.current && !group.current.remote ? group.current : this.firstLocal();
    return tab?.shell.cwd;
  }

  /** Puts a tab in a pane (the active one by default) at index (the end by default) and shows it. */
  add(tab, group = this.active ?? this.grid.groups()[0], index = group.tabs.length) {
    tab.owner = this;
    group.tabs.splice(Math.max(0, Math.min(index, group.tabs.length)), 0, tab);
    group.panes.append(tab.el);
    this.select(tab);
    return tab;
  }

  select(tab) {
    const group = this.groupOf(tab);
    if (!group) return;
    group.current = tab;
    for (const x of group.tabs) if (x !== tab) x.hide();
    tab.show();
    tab.activity = false;
    this.active = group;
    this.#markActive();
    this.win.setTitle(t('ui.title'), tab.subtitle);
    this.drawTabs(group);
  }

  tabChanged(tab) {
    if (tab === this.current) this.win.setTitle(t('ui.title'), tab.subtitle);
    const group = this.groupOf(tab);
    if (group) this.drawTabs(group);
  }

  /** Takes a tab out of its pane without stopping it (to move it); a pane left empty goes, unless it is the last. */
  #take(tab) {
    const group = this.groupOf(tab);
    if (!group) return;
    const i = group.tabs.indexOf(tab);
    group.tabs.splice(i, 1);
    tab.el.remove();
    if (group.current === tab) {
      group.current = group.tabs[Math.min(i, group.tabs.length - 1)] ?? null;
      group.current?.show();
    }
    if (!group.tabs.length && this.grid.groups().length > 1) {
      this.grid.remove(group);
      group.dispose();
      if (this.active === group) this.active = this.grid.groups()[0];
      this.#markActive();
    } else this.drawTabs(group);
  }

  closeTab(tab) {
    if (!this.groupOf(tab)) return;
    if (tab.remote && !tab.closed) this.closeSession(tab);
    this.#take(tab);
    tab.dispose();
    if (!this.tabs.length) return this.win.emit('close');
    if (this.current) this.select(this.current);
  }

  /**
   * Moves a tab to a pane of a window (this one or another): at index of its bar, or (side) into a
   * new pane on that side of the pane. The window it leaves closes when it has no tabs left.
   */
  move(tab, to, group, { index, side } = {}) {
    const from = this.groupOf(tab);
    if (!from || !to.grid.groups().includes(group)) return;
    if (to === this && group === from && !side) {
      // Another place in the same bar
      const i = from.tabs.indexOf(tab);
      let j = index ?? from.tabs.length;
      if (j > i) j--;
      from.tabs.splice(i, 1);
      from.tabs.splice(j, 0, tab);
      return this.select(tab);
    }
    // Alone in its pane, it cannot make a new pane next to it
    if (side && group === from && from.tabs.length === 1) return;
    this.#take(tab);
    let target = group;
    if (side) {
      target = to.#newGroup();
      to.grid.split(group, side, target);
    }
    to.add(tab, target, index);
    if (to !== this && !this.tabs.length) this.win.emit('close');
  }

  /**
   * «Split right / down» of a tab: it moves into a new pane on that side; alone in its pane, a new
   * shell opens there instead (in the same folder, for a shell).
   */
  splitTab(tab, side) {
    const group = this.groupOf(tab);
    if (!group) return;
    if (group.tabs.length > 1) return this.move(tab, this, group, { side });
    const fresh = this.#newGroup();
    this.grid.split(group, side, fresh);
    this.add(this.#makeShell(this, { cwd: tab.remote ? this.#cwdNear(group) : tab.shell.cwd }), fresh);
  }

  /** The tab in a window of its own; at: where (a point of the screen) its top-left corner goes. */
  detach(tab, at = null) {
    if (this.tabs.length < 2 || !this.groupOf(tab)) return;
    const other = this.newWindow({ empty: true }, at);
    this.move(tab, other, other.grid.groups()[0]);
  }

  /** Where a dragged tab was dropped (drag.js). */
  drop(tab, target, ev) {
    if (target.kind === 'window') {
      if (this.tabs.length > 1) return this.detach(tab, { x: ev.clientX - 60, y: ev.clientY - 14 });
      // Alone in its window: the window follows it
      const el = this.win.el;
      const scale = el.getBoundingClientRect().width / (el.offsetWidth || 1) || 1;
      return this.win.moveTo((parseFloat(el.style.left) || 0) + target.dx / scale, (parseFloat(el.style.top) || 0) + target.dy / scale);
    }
    if (target.kind === 'bar') return this.move(tab, target.owner, target.group, { index: target.index });
    if (target.kind === 'split') return this.move(tab, target.owner, target.group, { side: target.side });
    if (target.kind === 'pane') return this.move(tab, target.owner, target.group);
  }

  #layoutChanged() {
    for (const g of this.grid.groups()) {
      g.current?.reflow?.();
      this.drawTabs(g);
    }
    this.#markActive();
  }

  // ---------- Shortcuts ----------

  command(id) {
    const name = id.slice('terminal.'.length);
    const tab = this.current;
    if (name === 'newShell') return this.add(this.#makeShell(this, { cwd: this.#cwdNear(this.active) }));
    if (name === 'broadcast') return this.toggleBroadcast();
    if (!tab) return;
    if (name === 'splitRight') return this.splitTab(tab, 'right');
    if (name === 'splitDown') return this.splitTab(tab, 'down');
    if (name === 'detach') return this.detach(tab);
    if (name === 'previousTab' || name === 'nextTab') {
      const list = this.active.tabs;
      const next = list[(list.indexOf(tab) + (name === 'nextTab' ? 1 : -1) + list.length) % list.length];
      return this.select(next);
    }
    const side = SIDES[name];
    if (!side) return;
    const near = this.grid.neighbor(this.active, side);
    if (name.startsWith('focus')) return near?.current && this.select(near.current);
    // move: into the pane on that side, or a new pane there
    if (near) this.move(tab, this, near);
    else if (this.active.tabs.length > 1) this.move(tab, this, this.active, { side });
  }

  // ---------- Input to all panes ----------

  toggleBroadcast(on = !this.broadcast) {
    this.broadcast = on;
    this.grid.el.classList.toggle('tm-cast-on', on);
    this.drawTabs();
    this.current?.focus();
  }

  /** What the user typed in a tab: with broadcast on, it goes to the tabs shown in the other panes too. */
  typed(tab, data) {
    if (!this.broadcast) return;
    const from = this.groupOf(tab);
    if (!from || from.current !== tab) return;
    for (const g of this.grid.groups()) {
      if (g !== from && g.current && !g.current.closed) g.current.receive(data);
    }
  }

  // ---------- Saved state ----------

  /** For lilOS (workareas, workspaces, updates): the panes, their tabs, the side panel. */
  state() {
    return {
      layout: this.grid.toJSON(tab => ({ ...tab.state(), ...(tab.customName && { label: tab.customName }) })),
      cwd: this.firstLocal()?.shell.cwd,
    };
  }

  /** The panes as state() saved them: shells in the same folders, remote sessions attached again if still there. */
  #restore(layout) {
    const remote = [];
    const make = json => {
      const tabs = (Array.isArray(json?.tabs) ? json.tabs : []).slice(0, 50).map(s => {
        let tab = null;
        if (s?.kind === 'local') tab = this.#makeShell(this, { cwd: typeof s.cwd === 'string' ? s.cwd : undefined, quiet: true });
        else if (s?.kind === 'remote' && sdk.term && /^[a-f0-9]{16}$/.test(String(s.session))) {
          tab = RemoteTab.restore(this, s);
          remote.push(tab);
        }
        if (tab && typeof s.label === 'string') tab.customName = s.label.slice(0, 60);
        return tab;
      }).filter(Boolean);
      if (!tabs.length) return null;
      const group = this.#newGroup();
      for (const tab of tabs) { tab.owner = this; group.tabs.push(tab); group.panes.append(tab.el); tab.hide(); }
      group.current = tabs[Math.min(Math.max(0, Number(json.current) || 0), tabs.length - 1)];
      return group;
    };
    if (!this.grid.load(layout, make)) return false;
    for (const g of this.grid.groups()) g.current.show();
    this.active = this.grid.groups()[0];
    this.select(this.active.current);
    if (remote.length) {
      this.load().then(({ sessions }) => {
        const alive = new Set((sessions ?? []).filter(s => s.state !== 'closed').map(s => s.id));
        for (const tab of remote) {
          if (alive.has(tab.session.id)) tab.attach().catch(err => this.error(err));
          else tab.lost();
        }
      });
    }
    return true;
  }

  // ---------- Drawing ----------

  /** The tab bar of a pane (all of them without one). */
  drawTabs(only = null) {
    const groups = this.grid.groups();
    const first = groups[0];
    const many = groups.length > 1;
    this.sideButton.setAttribute('aria-pressed', String(!this.side.hidden));
    for (const group of only ? [only] : groups) {
      group.tabBar.render(group.tabs.map(tab => {
        const name = this.nameOf(tab);
        return {
          key: keyOf(tab), label: name, title: [name, tab.title].filter(Boolean).join(' — '),
          icon: tab.remote ? badgeOf(tab) : 'terminal',
          activity: tab.activity ? t('remote.activity') : false,
          class: [tab.closed && 'lost', tab.remote && 'remote'].filter(Boolean).join(' '),
          closeLabel: t('remote.closeNamed', { name }), closeTitle: t(tab.remote ? 'remote.closeSession' : 'remote.closeTab'),
        };
      }), group.current ? keyOf(group.current) : null);
      group.tabBar.setSlots({
        start: group === first ? this.sideButton : null,
        end: [
          this.broadcast && many && h('button', { type: 'button', class: 'tm-cast', title: t('grid.broadcastOff'), onclick: () => this.toggleBroadcast(false) }, icon('keyboard'), t('grid.broadcastOn')),
          group === first && this.menuButton,
        ],
      });
    }
  }

  /** The menu of a tab (right click, Shift+F10 or the Menu key). */
  tabMenu(tab, x, y) {
    const group = this.groupOf(tab);
    if (!group) return;
    const groups = this.grid.groups();
    const others = [...windows].filter(w => w !== this && w.win.el.isConnected && !w.win.el.classList.contains('ws-away'));   // in this workspace
    const alone = this.tabs.length < 2;
    const where = (g, k) => t('tabs.pane', { n: k + 1, name: g.current ? this.nameOf(g.current) : '' });
    sdk.openMenu(x, y, [
      { label: t('tabs.rename'), icon: 'pencil', action: () => this.rename(tab) },
      { label: t('tabs.duplicate'), disabled: tab.remote && !tab.spec, action: () => this.duplicate(tab) },
      '-',
      { label: t('tabs.splitRight'), shortcut: keysOf('terminal.splitRight'), action: () => this.splitTab(tab, 'right') },
      { label: t('tabs.splitDown'), shortcut: keysOf('terminal.splitDown'), action: () => this.splitTab(tab, 'down') },
      { label: t('tabs.moveToPane'), items: groups.map((g, k) => (g === group ? null : { label: where(g, k), action: () => this.move(tab, this, g) })).filter(Boolean) },
      { label: t('tabs.detach'), icon: 'window', shortcut: keysOf('terminal.detach'), disabled: alone, action: () => this.detach(tab) },
      { label: t('tabs.moveToWindow'), items: [
        ...others.map(w => ({ label: w.label(), action: () => this.move(tab, w, w.active ?? w.grid.groups()[0]) })),
        ...(others.length ? ['-'] : []),
        { label: t('tabs.newWindow'), disabled: alone, action: () => this.detach(tab) },
      ] },
      '-',
      { label: t('tabs.saveTerm'), icon: 'save', disabled: !canSaveTerm(this, tab), action: () => saveTermDialog(this, { tab }) },
      { label: t('tabs.addToDesk'), icon: 'link', disabled: !canSaveTerm(this, tab), action: () => addTermToDesk(this, { tab }).catch(err => this.error(err)) },
      ...(tab.remote ? [
        '-',
        { label: t('remote.reconnect'), icon: 'restart', disabled: !tab.spec, action: () => this.reconnect(tab) },
        { label: t('tabs.copyAddress'), action: () => navigator.clipboard?.writeText(tab.session.address).catch(() => {}) },
      ] : []),
      '-',
      { label: t('grid.broadcast'), icon: this.broadcast ? 'check' : null, shortcut: keysOf('terminal.broadcast'), disabled: groups.length < 2 && !this.broadcast, action: () => this.toggleBroadcast() },
      '-',
      { label: t(tab.remote ? 'remote.closeSession' : 'remote.closeTab'), icon: 'x', action: () => this.closeTab(tab) },
      { label: t('tabs.closeOthers'), disabled: group.tabs.length < 2, action: () => group.tabs.filter(x => x !== tab).forEach(x => this.closeTab(x)) },
      { label: t('tabs.closeRight'), disabled: group.tabs.indexOf(tab) === group.tabs.length - 1, action: () => group.tabs.slice(group.tabs.indexOf(tab) + 1).forEach(x => this.closeTab(x)) },
    ]);
  }

  /** The window's menu (the button at the end of the first bar). */
  #appMenu(x, y) {
    const tab = this.current;
    sdk.openMenu(x, y, [
      { label: t('remote.newShell'), icon: 'terminal', shortcut: keysOf('terminal.newShell'), action: () => this.command('terminal.newShell') },
      { label: t('remote.host.newTitle'), icon: 'globe', disabled: !sdk.term?.available, action: () => this.editHost() },
      { label: t('menu.openTerm'), icon: 'open', action: () => this.pickTermFile() },
      { label: t('tabs.newWindow'), icon: 'window', action: () => this.newWindow({ cwd: this.#cwdNear(this.active) }) },
      '-',
      { label: t('tabs.splitRight'), shortcut: keysOf('terminal.splitRight'), disabled: !tab, action: () => this.splitTab(tab, 'right') },
      { label: t('tabs.splitDown'), shortcut: keysOf('terminal.splitDown'), disabled: !tab, action: () => this.splitTab(tab, 'down') },
      { label: t('grid.broadcast'), icon: this.broadcast ? 'check' : null, shortcut: keysOf('terminal.broadcast'), disabled: this.grid.groups().length < 2 && !this.broadcast, action: () => this.toggleBroadcast() },
      '-',
      { label: t('options.open'), icon: 'gear', action: () => openOptions(this.openWindow) },
    ]);
  }

  async pickTermFile() {
    const node = await pickFile(this.openWindow, { title: t('menu.openTermTitle'), exts: ['term'] });
    if (node) openTermFile(this, node.id, { fresh: false }).catch(err => this.error(err));
  }

  async rename(tab) {
    const { button, values } = await sdk.messageBox(this.win, {
      title: t('tabs.rename'),
      fields: [{ name: 'name', label: t('tabs.renameLabel'), value: this.nameOf(tab), maxLength: 60, hint: t('tabs.renameHint') }],
      buttons: ['cancel', { value: 'rename', label: t('tabs.renameOk'), primary: true }],
    });
    if (button === 'rename') tab.customName = values.name.replace(/\s+/g, ' ').trim() || null;
    this.tabChanged(tab);
    tab.focus();
  }

  /** The same again in a new tab next to it: a shell in the same folder, a new session to the same server. */
  duplicate(tab) {
    const group = this.groupOf(tab);
    const index = group.tabs.indexOf(tab) + 1;
    if (!tab.remote) return this.add(this.#makeShell(this, { cwd: tab.shell.cwd }), group, index);
    if (tab.spec) this.openRemote(tab.spec, { group, index }).catch(err => this.error(err));
  }

  toggleSide() {
    this.side.hidden = !this.side.hidden;
    storage.set(SIDE_KEY, !this.side.hidden);
    if (!this.side.hidden) this.load();
    this.sideButton.setAttribute('aria-pressed', String(!this.side.hidden));
  }

  // ---------- Remote sessions ----------

  /** A new tab with a remote session: spec { host } | { protocol, values } (see the SDK's term.open). */
  async openRemote(spec, { group, index, name } = {}) {
    const session = await sdk.term.open(spec);
    const keep = { ...spec };
    delete keep.sealed;   // Riconnetti asks the password, or uses a saved one
    await this.#addRemote(session, keep, { group, index, name });
    return session;
  }

  async #addRemote(session, spec, { group, index, name } = {}) {
    const tab = new RemoteTab(this, session, spec);
    if (name) tab.customName = name;
    this.add(tab, group && this.grid.groups().includes(group) ? group : undefined, index);
    try {
      await tab.attach();
    } catch (err) {
      this.error(err);
    }
    return tab;
  }

  /** SSH where a folder of an SFTP connection is (the action of the File Manager's menu). */
  async openHere(id) {
    try {
      const node = fs.get(id);
      const folder = node?.type === 'folder' ? node.id : node?.parent;
      if (!folder || !fs.isRemote?.(folder)) throw new Error(t('remote.notRemote'));
      const ref = fs.netRef(folder);
      if (sdk.net?.mount(ref.mount)?.protocol !== 'sftp') throw new Error(t('remote.notSftp'));
      await this.#addRemote(await sdk.term.open({ mount: ref.mount, path: ref.path }), null);
    } catch (err) {
      this.error(err);
    }
  }

  /** A session running in the kernel: its tab (in any window), or a new tab attached to it. */
  async resume(session) {
    for (const w of windows) {
      const there = w.tabs.find(x => x.remote && x.session.id === session.id);
      if (there) {
        w.select(there);
        return there.attach();
      }
    }
    return this.#addRemote(session, session.host ? { host: session.host } : null);
  }

  async reconnect(tab) {
    if (!tab.spec) return this.error(t('remote.cannotReconnect'));
    try {
      await tab.replace(await sdk.term.open(tab.spec));
      this.tabChanged(tab);
    } catch (err) {
      this.error(err);
    }
  }

  async closeSession(tab) {
    try { await sdk.term.close(tab.session.id); } catch { /* gone already */ }
  }

  async editHost(host = null, prefill = null) {
    await this.load();
    const result = await hostDialog(this, host, prefill);
    await this.load();
    if (result?.action === 'connect') this.openRemote({ host: result.host.id }).catch(err => this.error(err));
  }

  // ---------- Side panel ----------

  drawSide() {
    if (this.side.hidden && this.side.childElementCount) return;
    const { hosts, sessions, protocols } = this.data;
    if (!sdk.term?.available || !protocols.length) {
      return this.side.replaceChildren(h('h2', {}, h('span', {}, t('remote.side.hosts'))), h('p', { class: 'tm-empty' }, this.data.error ? t('remote.unavailable', { error: this.data.error }) : t('remote.noProtocols')));
    }
    const live = new Set(sessions.filter(s => s.state !== 'closed').map(s => s.host).filter(Boolean));
    const groups = new Map();
    for (const host of [...hosts].sort((a, b) => a.name.localeCompare(b.name))) {
      if (!groups.has(host.folder)) groups.set(host.folder, []);
      groups.get(host.folder).push(host);
    }
    const open = host => this.openRemote({ host: host.id }).catch(err => this.error(err));
    const place = host => h('button', {
      type: 'button', class: 'tm-place', title: host.address, onclick: () => open(host),
      oncontextmenu: e => {
        e.preventDefault();
        sdk.openMenu(e.clientX, e.clientY, [
          { label: t('remote.side.connect'), action: () => open(host) },
          { label: t('remote.host.editTitle'), action: () => this.editHost(host) },
          '-',
          { label: t('tabs.saveTerm'), icon: 'save', action: () => saveTermDialog(this, { host }) },
          { label: t('tabs.addToDesk'), icon: 'link', action: () => addTermToDesk(this, { host }).catch(err => this.error(err)) },
        ]);
      },
    }, h('span', { class: `tm-dot${live.has(host.id) ? ' on' : ''}`, title: live.has(host.id) ? t('remote.side.open') : '' }), h('span', { class: 'tm-place-name' }, host.name), badge(host.protocol));
    const mine = new Set([...windows].flatMap(w => w.tabs.filter(x => x.remote).map(x => x.session.id)));
    const running = sessions.filter(s => s.state !== 'closed' && !mine.has(s.id));
    this.side.replaceChildren(
      h('h2', {}, h('span', {}, t('remote.side.hosts')), h('button', { type: 'button', class: 'tm-iconbtn', title: t('remote.host.newTitle'), 'aria-label': t('remote.host.newTitle'), onclick: () => this.editHost() }, icon('plus'))),
      ...(groups.get('') ?? []).map(place),
      ...[...groups].filter(([f]) => f).sort(([a], [b]) => a.localeCompare(b)).flatMap(([f, list]) => [h('h3', {}, f), ...list.map(place)]),
      ...(hosts.length ? [] : [h('p', { class: 'tm-empty' }, t('remote.side.none'))]),
      ...(running.length ? [
        h('h2', {}, h('span', {}, t('remote.side.running'))),
        ...running.map(s => h('div', { class: 'tm-live' },
          h('div', { class: 'tm-live-name', title: s.address }, badge(s.protocol), h('span', {}, s.name)),
          h('div', { class: 'tm-live-when' }, [s.title, s.attached ? t('remote.side.elsewhere') : s.closesAt ? t('remote.side.closesIn', { n: Math.max(1, Math.round((s.closesAt - Date.now()) / 60000)) }) : '', i18n.date(s.created, { timeStyle: 'short' })].filter(Boolean).join(' · ')),
          h('button', { type: 'button', class: 'ctl-btn primary', onclick: () => this.resume(s).catch(err => this.error(err)) }, t('remote.side.resume')))),
      ] : []),
    );
  }
}
