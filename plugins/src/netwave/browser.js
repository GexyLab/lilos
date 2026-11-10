import { Window, h, icon, fs, host, messageBox, openMenu, notifications, uid, comboFromEvent } from '@lilos/sdk';
import { launch, openFile, pickFile } from '@lilos/system';
import { TabBar } from '../shared/TabBar.js';
import { FindBar } from '../shared/FindBar.js';
import { LiveView } from './live.js';
import { history, tabsOf } from './history.js';
import { options, addressOf, refusedScheme } from './options.js';
import { EXT, readSession, writeSession, createSession, defaultFolder, nameOfFile } from './sessionFile.js';
import { startPage, problemPage } from './pages.js';
import { downloads } from './downloads.js';
import { t } from './i18n.js';

/**
 * A NetWave window: tabs of web pages shown by the program (host.web, one isolated page per tab,
 * made when the tab is first shown), the address bar, the session the window is tied to, the
 * history. Every window is a main window of the app (lilOS reopens it from getState()).
 *
 *   args: { url } | { file } (a .nwsession) | { private: true } | state(): { tabs, active, session?, private? }
 */
const KEYS = {
  'Ctrl+T': 'newTab', 'Ctrl+W': 'closeTab', 'Ctrl+F4': 'closeTab', 'Ctrl+Shift+T': 'reopenTab', 'Ctrl+N': 'newWindow', 'Ctrl+Shift+N': 'newPrivate',
  'Ctrl+L': 'focusAddress', 'Alt+D': 'focusAddress', 'F6': 'focusAddress', 'F5': 'reload', 'Ctrl+R': 'reload', 'Ctrl+Shift+R': 'hardReload', 'Ctrl+F5': 'hardReload',
  'Alt+ArrowLeft': 'back', 'Alt+ArrowRight': 'forward', 'Alt+Home': 'home', 'Ctrl+Tab': 'nextTab', 'Ctrl+Shift+Tab': 'prevTab', 'Ctrl+PageDown': 'nextTab', 'Ctrl+PageUp': 'prevTab',
  'Ctrl+1': 'tab1', 'Ctrl+2': 'tab2', 'Ctrl+3': 'tab3', 'Ctrl+4': 'tab4', 'Ctrl+5': 'tab5', 'Ctrl+6': 'tab6', 'Ctrl+7': 'tab7', 'Ctrl+8': 'tab8', 'Ctrl+9': 'lastTab',
  'Ctrl+H': 'history', 'Ctrl+J': 'downloads', 'Ctrl+S': 'save', 'Ctrl+Shift+S': 'saveAs', 'Ctrl+O': 'openSession', 'Ctrl+F': 'find', 'F3': 'findNext',
  'Ctrl+Equal': 'zoomIn', 'Ctrl+Plus': 'zoomIn', 'Ctrl+Minus': 'zoomOut', 'Ctrl+0': 'zoomReset',
};
const ZOOMS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

/** Every NetWave window of this page: sessions open, the last active one. */
export const windows = new Set();
let lastActive = null;
let engineCheck = null;
const engineReady = () => (engineCheck ??= host.web?.available?.() ?? Promise.resolve(false));

const blank = url => !url || url === 'about:blank';
const originOf = url => { try { return new URL(url).origin; } catch { return ''; } };
const hostOf = url => { try { return new URL(url).host; } catch { return url; } };
const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join('');
const tabLabel = tab => tab.title || (blank(tab.url) ? t('tabs.newTab') : hostOf(tab.url));
const noHash = url => String(url ?? '').split('#')[0];
/** Text a site chose (title, realm), as lilOS shows it: no control or direction characters, one line, short. */
const plain = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
/** The permissions a request is remembered as: camera and microphone apart. */
const MEDIA_KINDS = { video: 'camera', audio: 'microphone' };
const permissionsOf = ask => {
  if (ask.permission !== 'media') return [ask.permission];
  const kinds = [...new Set((ask.media ?? []).map(m => MEDIA_KINDS[m]).filter(Boolean))];
  return kinds.length ? kinds : ['camera', 'microphone'];
};
// Warnings of addresses a page tried to open: one every BLOCKED_GAP per tab
const BLOCKED_GAP = 20_000;
// New tabs a page asks for, kept waiting for the user's answer
const TABS_ASKED_MAX = 20;

/** The window the history or a link should use: the last active normal one. */
export const lastWindow = () => (lastActive && windows.has(lastActive) && !lastActive.private ? lastActive : [...windows].reverse().find(w => !w.private) ?? null);

export function makeWindow(args, openWindow) {
  return new NetWaveWindow(args ?? {}, openWindow).win;
}

export class NetWaveWindow {
  tabs = [];
  active = null;
  session = null;         // { id, name, file, autosave, sig }
  engine = null;          // true / false once known
  #saveTimer = 0;
  #addressEditing = false;

  constructor(args, openWindow) {
    this.openWindow = openWindow;
    this.private = args.private === true;
    this.privateKey = this.private ? randomKey() : null;
    // A private window kept by lilOS (the page reloaded): its tabs and data are gone, so it goes too
    const ended = this.private && args.ended === true;
    this.key = `netwave:${uid()}`;
    const size = args.size;
    const win = this.win = new Window({ title: t('app.name'), icon: 'globe', width: size?.w ?? 1100, height: size?.h ?? 720, minWidth: 460, minHeight: 280 });
    win.netwave = this;
    win.el.classList.add('nw-window');
    win.el.classList.toggle('nw-private', this.private);
    const { signal } = win;
    windows.add(this);
    lastActive = this;

    // Tabs
    this.bar = new TabBar({ t, signal, label: t('tabs.label'), newLabel: t('tabs.newKeys') });
    this.bar.on('select', key => this.select(this.#tab(key)));
    this.bar.on('close', key => this.closeTab(this.#tab(key)));
    this.bar.on('new', () => this.newTab());
    this.bar.on('move', ({ key, index }) => this.#move(this.#tab(key), index));
    this.bar.on('menu', ({ key, x, y }) => this.#tabMenu(this.#tab(key), x, y));
    if (this.private) this.bar.setSlots({ end: h('span', { class: 'nw-privtag', title: t('private.text') }, icon('eyeOff'), t('private.tag')) });

    // Toolbar
    const button = (glyph, label, action, cls = '') => h('button', { type: 'button', class: `nw-tbtn ${cls}`.trim(), title: label, 'aria-label': label, onclick: action }, icon(glyph));
    this.backBtn = button('arrowLeft', t('nav.back'), () => this.run('back'), 'nw-dir');
    this.forwardBtn = button('arrowRight', t('nav.forward'), () => this.run('forward'), 'nw-dir');
    this.reloadBtn = button('restart', t('nav.reload'), () => (this.active?.loading ? this.active.page?.stop() : this.run('reload')));
    this.homeBtn = button('home', t('nav.home'), () => this.run('home'));
    this.address = h('input', { class: 'nw-address-input', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': t('address.label'), placeholder: t('address.placeholder') });
    this.lock = h('span', { class: 'nw-lock', 'aria-hidden': 'true' });
    this.zoomChip = h('button', { type: 'button', class: 'nw-zoomchip', hidden: true, title: t('zoom.reset'), onclick: () => this.run('zoomReset') });
    this.engineChip = h('button', { type: 'button', class: 'nw-engine', onclick: e => this.#siteMenu(e.currentTarget) }, icon('shield'), h('span'));
    this.addressBox = h('form', { class: 'nw-address', onsubmit: e => { e.preventDefault(); this.go(this.address.value); } }, this.lock, this.address, this.zoomChip, this.engineChip);
    this.sessionChip = h('button', { type: 'button', class: 'nw-session', onclick: e => this.#sessionMenu(e.currentTarget) });
    this.historyBtn = button('clock', t('history.open'), () => this.run('history'));
    this.downloadBtn = button('download', t('download.open'), e => this.#downloadsMenu(e.currentTarget), 'nw-dl');
    this.menuBtn = button('list', t('menu.open'), e => this.#mainMenu(e.currentTarget));
    this.toolbar = h('div', { class: 'nw-toolbar', role: 'toolbar', 'aria-label': t('nav.label') },
      this.backBtn, this.forwardBtn, this.reloadBtn, this.homeBtn, this.addressBox, this.sessionChip,
      h('span', { class: 'nw-sep' }), this.historyBtn, this.downloadBtn, this.menuBtn);

    this.address.addEventListener('focus', () => { this.#addressEditing = true; this.address.select(); }, { signal });
    this.address.addEventListener('blur', () => { this.#addressEditing = false; this.#drawAddress(); }, { signal });
    this.address.addEventListener('keydown', e => { if (e.key === 'Escape') { this.#addressEditing = false; this.#drawAddress(); this.address.blur(); this.active?.page?.focus(); } }, { signal });

    // Find in page
    this.find = new FindBar({ t, signal, replace: false, options: false, className: 'nw-find' });
    this.find.el.hidden = true;
    let lastFind = '';
    this.find.on('query', () => {
      const text = this.find.query.find;
      if (!text) { this.active?.page?.stopFind(); this.find.setStatus(''); lastFind = ''; return; }
      this.active?.page?.find(text, { forward: true, next: false });
      lastFind = text;
    });
    this.find.on('next', () => lastFind && this.active?.page?.find(lastFind, { forward: true, next: true }));
    this.find.on('previous', () => lastFind && this.active?.page?.find(lastFind, { forward: false, next: true }));
    this.find.on('close', () => this.#closeFind());

    // The bar of a site's request (position, camera…), drawn by NetWave above the page
    this.askBar = h('div', { class: 'nw-ask', role: 'alertdialog', hidden: true });

    // Where the page goes, and NetWave's own pages (start, problems)
    this.overlay = h('div', { class: 'nw-overlay', hidden: true });
    this.slot = h('div', { class: 'nw-slot', tabindex: '-1' }, this.overlay);
    this.live = new LiveView(this.slot, { win });

    win.body.append(h('div', { class: 'nw-root' }, h('div', { class: 'nw-tabs' }, this.bar.el), this.toolbar, this.find.el, this.askBar, this.slot));

    win.el.addEventListener('keydown', e => this.#onKey(e), { capture: true, signal });
    win.el.addEventListener('focusin', () => { lastActive = this; }, { signal });
    win.getState = () => this.state();
    win.canClose = () => this.#canClose();
    win.on('dismiss', () => this.#dismissed());
    win.on('destroy', () => this.#dispose());
    win.on('launch', a => this.launched(a));
    const offs = [
      options.on('grants', () => this.#sendGrants()),
      history.on('change', () => { if (blank(this.active?.url)) this.#drawOverlay(); }),
      downloads.on('change', () => this.#drawDownloads()),
    ];
    signal.addEventListener('abort', () => offs.forEach(off => off()));

    engineReady().then(ok => {
      this.engine = ok;
      this.engineChip.lastChild.textContent = t(ok ? 'engine.native' : 'engine.none');
      this.engineChip.classList.toggle('off', !ok);
      this.#ensurePage(this.active);
      this.draw();
    });
    this.#start(ended ? {} : args);
    if (ended) setTimeout(() => this.win.emit('close'), 0);
  }

  // ---------- Opening ----------

  #start(args) {
    if (Array.isArray(args.tabs) && args.tabs.length) {
      for (const x of tabsOf(args.tabs)) this.tabs.push(this.#newTab(x));
      if (args.session?.id && !this.private) {
        const s = args.session;
        this.session = { id: s.id, name: String(s.name ?? ''), file: s.file && fs.exists(s.file) ? s.file : null, autosave: !!s.autosave, sig: typeof s.sig === 'string' ? s.sig : '' };
      }
      this.select(this.tabs[Math.min(Math.max(0, args.active | 0), this.tabs.length - 1)]);
      return;
    }
    if (typeof args.file === 'string') {
      this.select(this.#add(this.#newTab({})));
      this.openSessionFile(args.file, { here: true });
      return;
    }
    const url = typeof args.url === 'string' ? addressOf(args.url) : options.get('home') || '';
    this.select(this.#add(this.#newTab({ url })));
  }

  /** lilOS launched NetWave again while this window was open (a link, a file): a tab, or the session. */
  launched(args) {
    if (typeof args?.file === 'string') return this.openSessionFile(args.file);
    if (typeof args?.url === 'string') return this.newTab(args.url);
    return null;
  }

  // ---------- Tabs ----------

  #newTab({ url = '', title = '', pinned = false } = {}) {
    return { key: uid(), url: url || '', title: title || '', pinned: !!pinned, icon: null, page: null, opening: null, loading: false, canBack: false, canForward: false, error: null, audible: false, muted: false, zoom: 1, asks: [], found: null };
  }

  #tab(key) { return this.tabs.find(x => x.key === key) ?? null; }

  /** Puts a tab in the list (after `after`, or at the end; pinned tabs stay first). */
  #add(tab, after = null) {
    let i = after ? this.tabs.indexOf(after) + 1 : this.tabs.length;
    const pinnedEnd = this.tabs.filter(x => x.pinned).length;
    if (!tab.pinned && i < pinnedEnd) i = pinnedEnd;
    this.tabs.splice(i, 0, tab);
    this.#changed();
    return tab;
  }

  newTab(url = null, { after = null, select = true } = {}) {
    const address = url ? addressOf(url) : options.get('home') || '';
    const tab = this.#add(this.#newTab({ url: address }), after);
    if (select) {
      this.select(tab);
      if (!address) setTimeout(() => this.overlay.querySelector('input')?.focus(), 0);
    } else {
      this.draw();
    }
    return tab;
  }

  select(tab) {
    if (!tab) return;
    this.active = tab;
    this.#ensurePage(tab);
    if (!this.find.el.hidden) this.#closeFind();
    this.draw();
  }

  closeTab(tab = this.active, { record = true } = {}) {
    if (!tab) return;
    const i = this.tabs.indexOf(tab);
    if (i < 0) return;
    if (record && !this.private && !blank(tab.url)) history.addClosed('tab', [tab], this.#sessionRef());
    this.tabs.splice(i, 1);
    tab.page?.close();
    tab.page = null;
    if (!this.tabs.length) {
      // The last tab closed closes the window, as in every browser (a new tab stays if it does not close)
      this.tabs.push(this.#newTab({}));
      this.select(this.tabs[0]);
      this.win.emit('close');
      return;
    }
    if (this.active === tab) this.select(this.tabs[Math.min(i, this.tabs.length - 1)]);
    this.#changed();
    this.draw();
  }

  #move(tab, index) {
    if (!tab) return;
    const pinnedCount = this.tabs.filter(x => x.pinned && x !== tab).length;
    const to = tab.pinned ? Math.min(index, pinnedCount) : Math.max(index, pinnedCount);
    this.tabs.splice(this.tabs.indexOf(tab), 1);
    this.tabs.splice(Math.min(to, this.tabs.length), 0, tab);
    this.#changed();
    this.draw();
  }

  #pin(tab, pinned) {
    tab.pinned = pinned;
    this.tabs.splice(this.tabs.indexOf(tab), 1);
    const end = this.tabs.filter(x => x.pinned).length;
    this.tabs.splice(end, 0, tab);
    this.#changed();
    this.draw();
  }

  /** A tab into a window of its own. */
  detach(tab) {
    if (!tab || this.tabs.length < 2) return;
    const other = this.newWindow({ tabs: tabsOf([tab]), active: 0, ...(this.private && { private: true }) });
    if (!other) return;
    this.closeTab(tab, { record: false });
  }

  // ---------- The page of a tab ----------

  /** The program's page for a tab with an address, made the first time it is shown. */
  async #ensurePage(tab) {
    if (!tab || tab.page || tab.opening || !this.engine || blank(tab.url) || tab.error?.code === 'gone') return;
    tab.opening = (async () => {
      try {
        const page = await host.web.open({ private: this.privateKey ?? undefined, keys: Object.keys(KEYS) });
        if (!this.tabs.includes(tab)) { page.close(); return; }
        tab.page = page;
        this.#wire(tab, page);
        if (!this.private) page.grants(options.grants());
        if (tab.zoom !== 1) page.zoom(tab.zoom);
        await page.navigate(tab.url);
      } catch (err) {
        tab.error = { code: String(err?.message ?? '').includes('signedOut') ? 'signedOut' : 'engine', description: err?.message ?? '' };
      } finally {
        tab.opening = null;
        this.draw();
      }
    })();
  }

  #wire(tab, page) {
    const shown = () => this.active === tab;
    let lastBlocked = 0;
    page.on('title', e => {
      tab.title = plain(e.title, 300);
      if (!this.private && !blank(tab.url)) history.retitle(tab.url, tab.title);
      this.draw();
    });
    page.on('favicon', e => { tab.icon = e.icon; this.draw(); });
    page.on('loading', e => {
      tab.loading = e.loading;
      if (e.loading) tab.error = null;
      this.draw();
    });
    page.on('nav', e => {
      const changed = e.url !== tab.url;
      // Another document: its title comes with it, if it has one (a JSON or an image has none)
      if (noHash(e.url) !== noHash(tab.url)) tab.title = '';
      tab.url = e.url;
      tab.canBack = e.canGoBack;
      tab.canForward = e.canGoForward;
      if (changed) {
        tab.asks = tab.asks.filter(a => a.origin === originOf(e.url));
        this.#changed();
      }
      // A page the tab had not shown yet (the first one has the address the tab already had)
      if (e.url !== tab.visited) {
        tab.visited = e.url;
        if (!this.private) history.visit(e.url, tab.title, this.#sessionRef());
      }
      this.draw();
    });
    page.on('error', e => { tab.error = { code: e.code, description: e.description, url: e.url }; tab.loading = false; this.draw(); });
    // A page can try addresses in a loop: one warning every 20 s, with what NetWave refused (scheme
    // and host), never the rest of the text the page chose
    page.on('blocked', e => {
      if (Date.now() - lastBlocked < BLOCKED_GAP) return;
      lastBlocked = Date.now();
      let shown = '';
      try { const u = new URL(e.url); shown = u.host ? `${u.protocol}//${u.host}` : u.protocol; } catch { /* nothing to show */ }
      notifications.send({ text: t('blocked', { url: shown.slice(0, 80) }), level: 'warning' });
    });
    page.on('open', e => this.#pageOpens(tab, e));
    page.on('popupsDropped', e => this.#pageOpens(tab, { ...e, dropped: true }));
    page.on('expired', e => {
      // No answer in time: the program said no, the question goes
      tab.asks = tab.asks.filter(a => a.requestId !== e.requestId);
      this.draw();
    });
    page.on('focus', () => this.#focusWindow());
    page.on('key', e => this.run(KEYS[e.combo]));
    page.on('menu', e => this.#pageMenu(tab, e));
    page.on('audio', e => { tab.audible = e.audible; this.draw(); });
    page.on('found', e => {
      if (shown()) this.find.setStatus(e.matches ? t('find.count', { active: e.active, n: e.matches }) : t('find.none'), { error: !e.matches });
    });
    page.on('permission', e => { tab.asks.push(e); this.draw(); });
    page.on('auth', e => this.#auth(tab, e));
    page.on('download', e => downloads.update(page, e, this.#sessionRef()));
    page.on('gone', e => {
      tab.error = { code: 'gone', description: e.reason };
      tab.page = null;
      page.close();
      this.draw();
    });
  }

  /**
   * A page asks for a new tab (window.open, a link to a new window). The user's choice of a
   * background tab (Ctrl or middle click) opens it; otherwise NetWave asks, unless the user turned
   * the question off or answered for the site for good. Requests of the same site wait together.
   */
  #pageOpens(tab, e) {
    const origin = e.origin || originOf(tab.url);
    const open = () => { if (e.url) this.newTab(e.url, { after: tab, select: e.disposition !== 'background-tab' }); };
    if (e.disposition === 'background-tab' || !options.get('askTabs')) return open();
    const remembered = this.private ? undefined : options.grant(origin, 'tabs');
    if (remembered === true) return open();
    if (remembered === false) return;
    let ask = tab.asks.find(a => a.kind === 'tabs' && a.origin === origin);
    if (!ask) {
      ask = { kind: 'tabs', origin, urls: [], dropped: false };
      tab.asks.push(ask);
    }
    if (e.dropped) ask.dropped = true;
    else if (ask.urls.length < TABS_ASKED_MAX) ask.urls.push(e.url);
    if (ask.urls.length) this.draw();
    else tab.asks = tab.asks.filter(a => a !== ask);
  }

  go(text) {
    const tab = this.active ?? this.newTab();
    const refused = refusedScheme(text);
    if (refused) {
      // Not a search either: what was typed (a path of the computer, a script) does not leave lilOS
      this.#addressEditing = false;
      this.address.blur();
      tab.error = { code: 'scheme', description: refused, url: String(text).trim().slice(0, 200) };
      this.draw();
      this.slot.focus();
      return;
    }
    const url = addressOf(text);
    if (!url) return;
    tab.url = url;
    tab.error = null;
    this.#addressEditing = false;
    this.address.blur();
    if (tab.page) tab.page.navigate(url).catch(err => { tab.error = { code: 'blocked', description: err.message, url }; this.draw(); });
    else this.#ensurePage(tab);
    this.#changed();
    this.draw();
    // The keys of NetWave keep working when there is no page to take the focus (no engine yet)
    if (tab.page) tab.page.focus();
    else this.slot.focus();
  }

  // ---------- Commands (keys, menus) ----------

  run(command) {
    const tab = this.active;
    const page = tab?.page;
    const nth = /^tab(\d)$/.exec(command ?? '');
    if (nth) return this.select(this.tabs[Number(nth[1]) - 1]);
    switch (command) {
      case 'newTab': return this.newTab();
      case 'closeTab': return this.closeTab();
      case 'reopenTab': return this.reopenClosed();
      case 'newWindow': return this.newWindow({});
      case 'newPrivate': return this.newWindow({ private: true });
      case 'focusAddress': this.address.focus(); this.address.select(); return null;
      case 'reload':
        if (tab?.error) { tab.error = null; if (!page) return this.#ensurePage(tab).then(() => this.draw()); }
        return page?.reload();
      case 'hardReload': return page?.reload(true);
      case 'back': return page?.back();
      case 'forward': return page?.forward();
      case 'home': return this.go(options.get('home') || 'about:blank');
      case 'nextTab': return this.select(this.tabs[(this.tabs.indexOf(tab) + 1) % this.tabs.length]);
      case 'prevTab': return this.select(this.tabs[(this.tabs.indexOf(tab) - 1 + this.tabs.length) % this.tabs.length]);
      case 'lastTab': return this.select(this.tabs.at(-1));
      case 'history': return openHistory(this.openWindow);
      case 'downloads': return this.#downloadsMenu(this.downloadBtn);
      case 'save': return this.saveSession();
      case 'saveAs': return this.saveSessionAs();
      case 'openSession': return this.pickSession();
      case 'find': return this.#openFind();
      case 'findNext': return this.find.el.hidden ? this.#openFind() : this.find.emit('next');
      case 'zoomIn': return this.#zoom(1);
      case 'zoomOut': return this.#zoom(-1);
      case 'zoomReset': return this.#zoom(0);
      default: return null;
    }
  }

  #onKey(e) {
    const combo = comboFromEvent(e);
    const command = combo && KEYS[combo];
    if (!command) return;
    // In a field of NetWave the keys of text editing stay with the field
    if (e.target.closest?.('input, textarea') && /^(Ctrl\+(Z|Y|A|C|V|X)|Alt\+Arrow)/.test(combo)) return;
    e.preventDefault();
    e.stopPropagation();
    this.run(command);
  }

  #zoom(step) {
    const tab = this.active;
    if (!tab) return;
    const i = ZOOMS.indexOf(ZOOMS.reduce((a, b) => (Math.abs(b - tab.zoom) < Math.abs(a - tab.zoom) ? b : a)));
    tab.zoom = step === 0 ? 1 : ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + step))];
    tab.page?.zoom(tab.zoom);
    this.draw();
  }

  #openFind() {
    if (!this.active?.page) return;
    this.find.el.hidden = false;
    this.find.open({ text: this.find.query.find });
    this.find.focus();
    this.live.refresh();
  }

  #closeFind() {
    this.find.close();
    this.find.el.hidden = true;
    this.active?.page?.stopFind();
    this.live.refresh();
    this.active?.page?.focus();
  }

  /** Brings this window forward (a click in its page: the program tells it). */
  #focusWindow() {
    lastActive = this;
    if (!this.win.active) this.win.el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  }

  /** Brings this window forward from elsewhere (the history, a session opened again). */
  show() {
    if (this.win.el.hidden) this.openWindow(this.win, this.key);
    this.#focusWindow();
  }

  newWindow(args) {
    if (args.private) args = { ...args, private: true };
    const other = new NetWaveWindow(args, this.openWindow);
    this.openWindow(other.win, other.key, { main: true });
    return other;
  }

  reopenClosed(id = null) {
    const entry = history.takeClosed(id);
    if (!entry) return;
    if (entry.kind === 'window') return this.newWindow({ tabs: entry.tabs, active: 0 });
    let last = null;
    for (const x of entry.tabs) last = this.#add(this.#newTab(x));
    this.select(last);
  }

  // ---------- Sessions ----------

  #sessionRef() { return this.session && !this.private ? { id: this.session.id, name: this.session.name } : null; }

  /** What the window has, as a session file keeps it. */
  #sessionData() {
    const tabs = tabsOf(this.tabs);
    const active = Math.max(0, tabs.findIndex(x => x.url === this.active?.url));
    return { id: this.session?.id ?? uid(), name: this.session?.name ?? '', autosave: !!this.session?.autosave, active, tabs };
  }

  #signature() { return JSON.stringify(tabsOf(this.tabs).map(x => [x.url, !!x.pinned])); }

  get dirty() { return !!this.session && this.session.sig !== this.#signature(); }

  /** Tabs changed: the title and, for a session saved by itself, the file a moment later. */
  #changed() {
    if (!this.session?.autosave || !this.session.file) return;
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => { if (this.dirty) this.saveSession({ quiet: true }); }, 1500);
  }

  async saveSession({ quiet = false } = {}) {
    if (this.private) return;
    if (!this.session?.file || !fs.exists(this.session.file)) return this.saveSessionAs();
    const data = this.#sessionData();
    try {
      await writeSession(this.session.file, data);
      this.session.sig = this.#signature();
      history.session({ ...this.session, path: fs.tildePath(this.session.file), event: 'save', tabs: data.tabs });
    } catch (err) {
      if (!quiet) messageBox(this.win, { icon: 'error', title: t('session.saveFailed'), text: err.message });
    }
    this.draw();
  }

  async saveSessionAs() {
    if (this.private) return;
    const answer = await saveDialog(this);
    if (!answer) return;
    const data = { ...this.#sessionData(), id: uid(), name: answer.name, autosave: answer.autosave, tabs: answer.tabs };
    try {
      const node = await createSession(answer.folder, data);
      this.session = { id: data.id, name: answer.name, file: node.id, autosave: answer.autosave, sig: JSON.stringify(answer.tabs.map(x => [x.url, !!x.pinned])) };
      history.session({ ...this.session, path: fs.tildePath(node.id), event: 'save', tabs: data.tabs });
      notifications.send({ text: t('session.saved', { name: answer.name, path: fs.tildePath(node.id) }), level: 'success' });
    } catch (err) {
      messageBox(this.win, { icon: 'error', title: t('session.saveFailed'), text: err.message });
    }
    this.draw();
  }

  async pickSession() {
    const node = await pickFile(this.openWindow, { title: t('session.openTitle'), exts: [EXT] });
    if (node) this.openSessionFile(node.id);
  }

  /**
   * Opens a .nwsession: in a new window, or in this one when it is empty; a session already open
   * in a window brings that window forward instead.
   */
  async openSessionFile(id, { here = false } = {}) {
    const open = [...windows].find(w => w.session?.file === id);
    if (open && open !== this) { open.show(); if (here) this.win.emit('close'); return; }
    let s;
    try { s = await readSession(id); } catch (err) {
      messageBox(this.win, { icon: 'error', title: t('session.openFailed'), text: err.message });
      return;
    }
    const empty = this.tabs.every(x => blank(x.url)) && !this.session && !this.private;
    if (!here && !empty) {
      const other = this.newWindow({});
      return other.#load(s, id);
    }
    this.#load(s, id);
  }

  #load(s, fileId) {
    for (const tab of this.tabs) tab.page?.close();
    this.tabs = s.tabs.map(x => this.#newTab(x));
    if (!this.tabs.length) this.tabs.push(this.#newTab({}));
    this.session = { id: s.id, name: s.name || nameOfFile(fs.get(fileId)), file: fileId, autosave: s.autosave, sig: '' };
    this.session.sig = this.#signature();
    history.session({ ...this.session, path: fs.tildePath(fileId), event: 'open', tabs: s.tabs });
    this.select(this.tabs[Math.min(s.active, this.tabs.length - 1)]);
  }

  /** Opens a session as history kept it (its file gone, or as it was then): tied to no file. */
  openSnapshot(entry) {
    const target = this.tabs.every(x => blank(x.url)) && !this.session && !this.private ? this : this.newWindow({});
    for (const tab of target.tabs) tab.page?.close();
    target.tabs = entry.tabs.map(x => target.#newTab(x));
    if (!target.tabs.length) target.tabs.push(target.#newTab({}));
    target.select(target.tabs[0]);
    return target;
  }

  async revertSession() {
    if (!this.session?.file) return;
    try { this.#load(await readSession(this.session.file), this.session.file); } catch (err) {
      messageBox(this.win, { icon: 'error', title: t('session.openFailed'), text: err.message });
    }
  }

  async renameSession() {
    const s = this.session;
    if (!s?.file) return;
    const r = await messageBox(this.win, { title: t('session.rename'), fields: [{ name: 'name', label: t('session.name'), value: s.name, required: true, maxLength: 120 }], buttons: ['cancel', 'ok'] });
    const name = r?.button === 'ok' ? String(r.values.name).trim() : '';
    if (!name || name === s.name) return;
    try {
      const node = fs.get(s.file);
      const file = fs.uniqueName(node.parent, `${fs.cleanName(name, { portable: true }) || t('session.untitled')}.${EXT}`, node.id);
      fs.rename(s.file, file);
      s.name = name;
      await this.saveSession({ quiet: true });
    } catch (err) {
      messageBox(this.win, { icon: 'error', title: t('session.saveFailed'), text: err.message });
    }
  }

  unlinkSession() {
    if (!this.session) return;
    this.session = null;
    this.draw();
  }

  // ---------- Closing ----------

  async #canClose() {
    if (!this.dirty || this.session.autosave) return true;
    this.live.refresh();
    const answer = await messageBox(this.win, {
      icon: 'warning', title: t('session.unsavedTitle', { name: this.session.name }), text: t('session.unsavedText'),
      buttons: ['cancel', { value: 'discard', label: t('session.discard'), danger: true }, { value: 'save', label: t('session.save'), primary: true }],
    });
    if (answer === 'save') { await this.saveSession(); return !this.dirty; }
    return answer === 'discard';
  }

  /** Closed for good by the user: history keeps the session, or the window's tabs. */
  #dismissed() {
    if (this.private) return;
    clearTimeout(this.#saveTimer);
    if (this.session) {
      if (this.session.autosave && this.dirty && this.session.file) this.saveSession({ quiet: true });
      history.session({ ...this.session, path: this.session.file ? fs.tildePath(this.session.file) : null, event: 'close', tabs: tabsOf(this.tabs) });
    } else if (this.tabs.some(x => !blank(x.url))) {
      history.addClosed('window', this.tabs);
    }
  }

  #dispose() {
    clearTimeout(this.#saveTimer);
    for (const tab of this.tabs) tab.page?.close();
    this.live.dispose();
    windows.delete(this);
    if (lastActive === this) lastActive = null;
  }

  state() {
    if (this.private) return { private: true, ended: true };
    const tabs = tabsOf(this.tabs);
    return {
      tabs, active: Math.max(0, this.tabs.indexOf(this.active)),
      ...(this.session && { session: { id: this.session.id, name: this.session.name, file: this.session.file, autosave: this.session.autosave, sig: this.session.sig } }),
    };
  }

  // ---------- Requests of sites ----------

  #sendGrants() {
    if (this.private) return;
    for (const tab of this.tabs) tab.page?.grants(options.grants());
  }

  #answer(tab, ask, allow, remember) {
    tab.asks = tab.asks.filter(a => a !== ask);
    remember = remember && !this.private;
    if (ask.kind === 'tabs') {
      if (remember) options.setGrant(ask.origin, 'tabs', allow);
      if (allow) {
        let after = tab;
        for (const url of ask.urls) after = this.newTab(url, { after, select: url === ask.urls.at(-1) });
      }
      this.draw();
      return;
    }
    tab.page?.permission(ask.requestId, allow, remember);
    if (remember) for (const permission of permissionsOf(ask)) options.setGrant(ask.origin, permission, allow);
    this.draw();
  }

  async #auth(tab, e) {
    if (this.active !== tab) this.select(tab);
    this.live.refresh();
    const r = await messageBox(this.win, {
      icon: 'lock', title: t('auth.title', { host: plain(e.host, 100) }), text: e.realm ? t('auth.realm', { realm: plain(e.realm, 80) }) : t('auth.text'),
      fields: [{ name: 'user', label: t('auth.user'), required: true, maxLength: 200 }, { name: 'password', type: 'password', label: t('auth.password'), maxLength: 500 }],
      buttons: ['cancel', 'ok'],
    });
    if (r?.button === 'ok') tab.page?.auth(e.requestId, r.values.user, r.values.password);
    else tab.page?.auth(e.requestId, null);
  }

  // ---------- Menus ----------

  #tabMenu(tab, x, y) {
    if (!tab) return;
    const i = this.tabs.indexOf(tab);
    openMenu(x, y, [
      { label: t('tabs.reload'), icon: 'restart', disabled: !tab.page, action: () => tab.page?.reload() },
      { label: t('tabs.duplicate'), icon: 'plus', disabled: blank(tab.url), action: () => this.newTab(tab.url, { after: tab }) },
      { label: t(tab.pinned ? 'tabs.unpin' : 'tabs.pin'), icon: 'grip', action: () => this.#pin(tab, !tab.pinned) },
      { label: t(tab.muted ? 'tabs.unmute' : 'tabs.mute'), icon: 'music', disabled: !tab.page, action: () => { tab.muted = !tab.muted; tab.page?.mute(tab.muted); this.draw(); } },
      { label: t('tabs.detach'), icon: 'window', disabled: this.tabs.length < 2, action: () => this.detach(tab) },
      '-',
      { label: t('tabs.close'), icon: 'x', action: () => this.closeTab(tab) },
      { label: t('tabs.closeOthers'), disabled: this.tabs.length < 2, action: () => { for (const x of this.tabs.filter(o => o !== tab && !o.pinned)) this.closeTab(x); } },
      { label: t('tabs.closeRight'), disabled: i === this.tabs.length - 1, action: () => { for (const x of this.tabs.slice(i + 1).filter(o => !o.pinned)) this.closeTab(x); } },
    ]);
  }

  #pageMenu(tab, e) {
    const r = this.slot.getBoundingClientRect();
    const x = r.left + e.x, y = r.top + e.y;
    const page = tab.page;
    const copy = text => navigator.clipboard?.writeText(text).catch(() => {});
    const items = [];
    if (e.link) {
      items.push(
        { label: t('page.openLinkTab'), icon: 'plus', action: () => this.newTab(e.link, { after: tab, select: false }) },
        { label: t('page.openLinkWindow'), icon: 'window', action: () => this.newWindow({ url: e.link, ...(this.private && { private: true }) }) },
        ...(this.private ? [] : [{ label: t('page.openLinkPrivate'), icon: 'eyeOff', action: () => this.newWindow({ url: e.link, private: true }) }]),
        { label: t('page.copyLink'), icon: 'link', action: () => copy(e.link) },
        '-',
      );
    }
    if (e.image) items.push({ label: t('page.openImage'), icon: 'image', action: () => this.newTab(e.image, { after: tab }) }, { label: t('page.copyImageLink'), icon: 'link', action: () => copy(e.image) }, '-');
    if (e.editable) {
      items.push(
        { label: t('page.cut'), disabled: !e.flags.canCut, action: () => page?.edit('cut') },
        { label: t('page.copy'), disabled: !e.flags.canCopy, action: () => page?.edit('copy') },
        { label: t('page.paste'), disabled: !e.flags.canPaste, action: () => page?.edit('paste') },
        { label: t('page.selectAll'), action: () => page?.edit('selectAll') },
        '-',
      );
    } else if (e.selection) {
      const words = e.selection.trim().replace(/\s+/g, ' ');
      items.push(
        { label: t('page.copy'), action: () => page?.edit('copy') },
        { label: t('page.search', { text: words.length > 30 ? `${words.slice(0, 30)}…` : words }), icon: 'search', action: () => this.newTab(options.searchUrl(words), { after: tab }) },
        '-',
      );
    }
    items.push(
      { label: t('nav.back'), icon: 'arrowLeft', disabled: !tab.canBack, action: () => page?.back() },
      { label: t('nav.forward'), icon: 'arrowRight', disabled: !tab.canForward, action: () => page?.forward() },
      { label: t('nav.reload'), icon: 'restart', action: () => page?.reload() },
      { label: t('page.copyAddress'), icon: 'link', disabled: blank(tab.url), action: () => copy(tab.url) },
    );
    openMenu(x, y, items);
  }

  #siteMenu(anchor) {
    const tab = this.active;
    const r = anchor.getBoundingClientRect();
    const origin = originOf(tab?.url);
    const secure = /^https:/.test(tab?.url ?? '');
    const granted = origin && !this.private ? options.grants().filter(g => g.origin === origin) : [];
    openMenu(r.left, r.bottom + 4, [
      { label: this.engine ? t('site.isolated') : t('engine.missingTitle'), icon: 'shield', disabled: true, action: () => {} },
      ...(origin ? [{ label: secure ? t('site.secure', { host: hostOf(tab.url) }) : t('site.insecure', { host: hostOf(tab.url) }), icon: secure ? 'lock' : 'lockOpen', disabled: true, action: () => {} }] : []),
      ...(granted.length ? ['-', ...granted.map(g => ({
        label: t(g.allow ? 'site.allowed' : 'site.blocked', { what: t(`perm.${g.permission}`) }), icon: g.allow ? 'check' : 'x',
        items: [{ label: t('site.forget'), action: () => options.setGrant(g.origin, g.permission, null) }],
      }))] : []),
      '-',
      { label: t('site.reload'), icon: 'restart', disabled: !tab?.page, action: () => tab?.page?.reload() },
    ], 'below');
  }

  #sessionMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    const s = this.session;
    if (this.private) {
      openMenu(r.left, r.bottom + 4, [{ label: t('private.noSession'), icon: 'eyeOff', disabled: true, action: () => {} }], 'below');
      return;
    }
    if (!s) {
      openMenu(r.left, r.bottom + 4, [
        { label: t('session.saveNew'), icon: 'save', shortcut: 'Ctrl+S', action: () => this.saveSessionAs() },
        { label: t('session.open'), icon: 'folderOpen', shortcut: 'Ctrl+O', action: () => this.pickSession() },
      ], 'below');
      return;
    }
    const where = s.file && fs.exists(s.file) ? fs.tildePath(s.file) : t('session.noFile');
    openMenu(r.left, r.bottom + 4, [
      { label: where, icon: 'file', disabled: true, action: () => {} },
      ...(this.dirty ? [{ label: t('session.changed'), icon: 'warning', disabled: true, action: () => {} }] : []),
      '-',
      { label: t('session.save'), icon: 'save', shortcut: 'Ctrl+S', action: () => this.saveSession() },
      { label: t('session.saveAsNew'), icon: 'filePlus', shortcut: 'Ctrl+Shift+S', action: () => this.saveSessionAs() },
      { label: t('session.revert'), icon: 'undo', disabled: !this.dirty || !s.file, action: () => this.revertSession() },
      { label: t('session.rename'), icon: 'pencil', disabled: !s.file, action: () => this.renameSession() },
      '-',
      { label: t('session.autosave'), icon: s.autosave ? 'check' : null, disabled: !s.file, action: () => { s.autosave = !s.autosave; this.saveSession({ quiet: true }); } },
      { label: t('session.reveal'), icon: 'folder', disabled: !s.file || !fs.exists(s.file), action: () => launch('files', { folder: fs.get(s.file).parent }) },
      { label: t('session.unlink'), icon: 'link', action: () => this.unlinkSession() },
    ], 'below');
  }

  #mainMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    const tab = this.active;
    openMenu(r.right - 240, r.bottom + 4, [
      { label: t('menu.newTab'), icon: 'plus', shortcut: 'Ctrl+T', action: () => this.newTab() },
      { label: t('menu.newWindow'), icon: 'window', shortcut: 'Ctrl+N', action: () => this.newWindow({}) },
      { label: t('menu.newPrivate'), icon: 'eyeOff', shortcut: 'Ctrl+Shift+N', action: () => this.newWindow({ private: true }) },
      '-',
      { label: t('session.saveNew'), icon: 'save', shortcut: 'Ctrl+Shift+S', disabled: this.private, action: () => this.saveSessionAs() },
      { label: t('session.open'), icon: 'folderOpen', shortcut: 'Ctrl+O', action: () => this.pickSession() },
      { label: t('menu.reopenTab'), icon: 'undo', shortcut: 'Ctrl+Shift+T', disabled: !history.closed().length, action: () => this.reopenClosed() },
      '-',
      { label: t('history.open'), icon: 'clock', shortcut: 'Ctrl+H', action: () => openHistory(this.openWindow) },
      { label: t('download.folder'), icon: 'download', action: () => { const d = fs.resolve('~/Download'); if (d) launch('files', { folder: d.id }); } },
      '-',
      { label: t('menu.find'), icon: 'search', shortcut: 'Ctrl+F', disabled: !tab?.page, action: () => this.#openFind() },
      { label: t('menu.zoom', { n: Math.round((tab?.zoom ?? 1) * 100) }), icon: 'zoom', items: [
        { label: t('zoom.in'), icon: 'plus', shortcut: 'Ctrl+=', action: () => this.#zoom(1) },
        { label: t('zoom.out'), icon: 'minus', shortcut: 'Ctrl+-', action: () => this.#zoom(-1) },
        { label: t('zoom.reset'), shortcut: 'Ctrl+0', action: () => this.#zoom(0) },
      ] },
      '-',
      { label: t('menu.options'), icon: 'gear', action: () => openOptions(this.openWindow) },
    ], 'below');
  }

  #downloadsMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    const list = downloads.list();
    const items = list.length ? list.map(d => ({
      label: d.state === 'progressing' ? t('download.progress', { name: d.name, pct: d.total ? Math.round((d.received / d.total) * 100) : '…' }) : d.state === 'saved' ? d.name : t(`download.${d.state}`, { name: d.name }),
      icon: d.state === 'saved' ? 'file' : d.state === 'progressing' ? 'download' : 'warning',
      disabled: d.state !== 'saved' && d.state !== 'progressing',
      action: () => {
        if (d.state === 'saved' && d.node && fs.exists(d.node)) openFile(fs.get(d.node));
        else if (d.state === 'progressing') downloads.cancel(d.id);
      },
    })) : [{ label: t('download.none'), disabled: true, action: () => {} }];
    downloads.seen();
    openMenu(r.right - 280, r.bottom + 4, [
      ...items, '-',
      { label: t('download.folder'), icon: 'folder', action: () => { const d = fs.resolve('~/Download'); if (d) launch('files', { folder: d.id }); } },
    ], 'below');
  }

  // ---------- Drawing ----------

  draw() {
    const tab = this.active;
    this.bar.render(this.tabs.map(x => ({
      key: x.key,
      label: x.pinned ? '' : tabLabel(x),
      title: blank(x.url) ? tabLabel(x) : `${tabLabel(x)}\n${x.url}`,
      icon: x.loading ? h('span', { class: 'nw-spin', 'aria-hidden': 'true' }) : x.icon ? h('img', { class: 'nw-fav', src: x.icon, alt: '' }) : 'globe',
      activity: x.audible && !x.muted ? t('tabs.playing') : false,
      class: [x.pinned && 'nw-pinned', x.muted && 'nw-muted', x.asks.length && 'nw-asking'].filter(Boolean).join(' ') || undefined,
    })), tab?.key ?? null);

    this.backBtn.disabled = !tab?.canBack;
    this.forwardBtn.disabled = !tab?.canForward;
    this.reloadBtn.replaceChildren(icon(tab?.loading ? 'x' : 'restart'));
    this.reloadBtn.title = this.reloadBtn.ariaLabel = t(tab?.loading ? 'nav.stop' : 'nav.reload');
    this.#drawAddress();
    this.zoomChip.hidden = !tab || tab.zoom === 1;
    this.zoomChip.textContent = tab ? `${Math.round(tab.zoom * 100)}%` : '';
    this.#drawSession();
    this.#drawAsk();
    this.#drawOverlay();
    this.#drawDownloads();
    // The window's title never carries the page's own: a site could write a message of lilOS there
    const subtitle = this.session ? `${this.session.name}${this.dirty ? ' •' : ''}` : this.private ? t('private.title') : tab && !blank(tab.url) ? hostOf(tab.url) : '';
    this.win.setTitle(t('app.name'), subtitle);
  }

  #drawAddress() {
    const tab = this.active;
    if (!this.#addressEditing) this.address.value = blank(tab?.url) ? '' : tab.url;
    const secure = /^https:/.test(tab?.url ?? '');
    this.lock.replaceChildren(blank(tab?.url) ? icon('search') : icon(secure ? 'lock' : 'lockOpen'));
    this.lock.className = `nw-lock ${blank(tab?.url) ? '' : secure ? 'ok' : 'warn'}`;
    this.lock.title = blank(tab?.url) ? '' : t(secure ? 'site.secureShort' : 'site.insecureShort');
  }

  #drawSession() {
    const s = this.session;
    const chip = this.sessionChip;
    chip.classList.toggle('none', !s);
    chip.classList.toggle('dirty', this.dirty);
    chip.hidden = this.private;
    chip.replaceChildren(icon('workarea'), h('span', { class: 'nw-session-name' }, s ? s.name : t('session.none')), ...(this.dirty ? [h('span', { class: 'nw-dot', title: t('session.changed') })] : []), icon('arrowDown'));
    chip.title = s ? t('session.chipTitle', { name: s.name }) : t('session.noneTitle');
  }

  #drawAsk() {
    const tab = this.active;
    const ask = tab?.asks[0];
    this.askBar.hidden = !ask;
    if (!ask) { this.live.refresh(); return; }
    let glyph, text;
    if (ask.kind === 'tabs') {
      glyph = 'plus';
      text = ask.urls.length > 1 ? t('ask.tabsMany', { n: ask.urls.length }) : t('ask.tabs', { host: hostOf(ask.urls[0]) });
      if (ask.dropped) text += ` ${t('ask.tabsDropped')}`;
    } else {
      const kinds = permissionsOf(ask);
      const what = ask.permission === 'media' ? t(kinds.length > 1 ? 'perm.media' : `perm.${kinds[0]}`) : t(`perm.${ask.permission}`);
      glyph = ask.permission === 'geolocation' ? 'home' : ask.permission === 'media' ? 'camera' : ask.permission === 'notifications' ? 'bell' : 'shield';
      text = t('ask.wants', { what });
    }
    // Yes or no for this time; the box remembers the answer for the site (not in a private window)
    // (kept on the question: the bar is drawn again whenever the window changes)
    const remember = h('input', { type: 'checkbox', checked: !!ask.remember, onchange: e => { ask.remember = e.currentTarget.checked; } });
    this.askBar.replaceChildren(
      icon(glyph),
      h('div', { class: 'nw-ask-text' }, h('b', {}, hostOf(ask.origin)), ` ${text}`, h('small', {}, t(this.private ? 'ask.hintPrivate' : ask.kind === 'tabs' ? 'ask.hintTabs' : 'ask.hint'))),
      ...(this.private ? [] : [h('label', { class: 'nw-ask-remember' }, remember, t('ask.remember'))]),
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.#answer(tab, ask, false, remember.checked) }, t('ask.deny')),
      h('button', { type: 'button', class: 'ctl-btn primary', onclick: () => this.#answer(tab, ask, true, remember.checked) }, t(ask.kind === 'tabs' ? 'ask.open' : 'ask.allow')),
    );
    this.live.refresh();
  }

  #drawOverlay() {
    const tab = this.active;
    let content = null;
    if (!tab) content = null;
    else if (tab.error) content = problemPage(this, tab);
    else if (blank(tab.url)) content = startPage(this);
    else if (this.engine === false) content = problemPage(this, tab, 'engine');
    this.overlay.hidden = !content;
    if (content) this.overlay.replaceChildren(content);
    else this.overlay.replaceChildren();
    this.live.hold = !!content;
    this.live.attach(content ? null : tab?.page ?? null);
    this.live.refresh();
  }

  #drawDownloads() {
    this.downloadBtn.classList.toggle('busy', downloads.busy);
    this.downloadBtn.classList.toggle('fresh', downloads.unseen);
  }
}

/** The save dialog of a session: name, folder, tabs, saving by itself. */
async function saveDialog(w) {
  let folder = defaultFolder();
  const folderLabel = h('span', { class: 'nw-folder-path' }, folder ? fs.tildePath(folder.id) : t('session.chooseFolder'));
  const chooser = h('button', { type: 'button', class: 'ctl-btn', onclick: async () => {
    const node = await pickFile(w.openWindow, { kind: 'folder', title: t('session.whereTo') });
    if (node) { folder = node; folderLabel.textContent = fs.tildePath(node.id); }
  } }, t('session.change'));
  const rows = w.tabs.filter(x => !blank(x.url)).map(x => {
    const box = h('input', { type: 'checkbox', checked: true });
    return { tab: x, box, el: h('label', { class: 'nw-save-row' }, box, x.icon ? h('img', { class: 'nw-fav', src: x.icon, alt: '' }) : icon('globe'), h('span', { class: 'nw-save-title' }, tabLabel(x)), h('span', { class: 'nw-save-url' }, hostOf(x.url))) };
  });
  const content = h('div', { class: 'nw-save' },
    h('div', { class: 'nw-save-folder' }, icon('folder'), folderLabel, chooser),
    h('div', { class: 'nw-save-label' }, t('session.tabsCount', { n: rows.length })),
    h('div', { class: 'nw-save-list' }, ...rows.map(r => r.el)),
    h('p', { class: 'nw-save-note' }, icon('shield'), t('session.privacy')));
  w.live.refresh();
  const r = await messageBox(w.win, {
    title: t('session.saveTitle'), content, width: 520,
    fields: [
      { name: 'name', label: t('session.name'), value: w.session?.name || (w.active ? tabLabel(w.active) : ''), required: true, maxLength: 120 },
      { name: 'autosave', type: 'checkbox', label: t('session.autosaveLong'), value: false },
    ],
    validate: () => (folder ? true : t('session.chooseFolder')),
    buttons: ['cancel', { value: 'save', label: t('session.save'), primary: true }],
  });
  if (r?.button !== 'save') return null;
  const tabs = tabsOf(rows.filter(x => x.box.checked).map(x => x.tab));
  return { name: String(r.values.name).trim(), autosave: !!r.values.autosave, folder: folder.id, tabs };
}

let historyModule = null;
function openHistory(openWindow) {
  historyModule ??= import('./historyWindow.js');
  historyModule.then(m => m.openHistory(openWindow));
}

let optionsModule = null;
function openOptions(openWindow) {
  optionsModule ??= import('./optionsWindow.js');
  optionsModule.then(m => m.openOptions(openWindow));
}

