import { Window, h, icon, fs, openMenu } from '@lilos/sdk';
import { launch } from '@lilos/system';
import { history } from './history.js';
import { NetWaveWindow, windows, lastWindow } from './browser.js';
import { reopenSession } from './pages.js';
import { clearHistory } from './optionsWindow.js';
import { t, i18n } from './i18n.js';

/**
 * The History window (one): pages visited (by day, searchable, filtered by session), the sessions
 * opened, saved and closed (each with the picture of its tabs), the tabs and windows closed lately.
 * It follows history's changes live.
 */
const WINDOW_KEY = 'netwave-history';
const DAY_MS = 86_400_000;
let current = null;

const hostOf = url => { try { return new URL(url).host; } catch { return url; } };
const time = at => i18n.date(at, { hour: '2-digit', minute: '2-digit' });
const dayStart = at => { const d = new Date(at); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function openHistory(openWindow) {
  if (current?.win.el.isConnected) return openWindow(current.win, WINDOW_KEY);
  current = new HistoryWindow(openWindow);
  return openWindow(current.win, WINDOW_KEY);
}

class HistoryWindow {
  view = 'pages';      // 'pages' | 'sessions' | 'closed'
  range = 'all';       // 'today' | 'yesterday' | 'week' | 'all'
  session = '';        // filter of pages: a session id
  text = '';

  constructor(openWindow) {
    this.openWindow = openWindow;
    const win = this.win = new Window({ title: t('history.title'), icon: 'clock', width: 900, height: 600, minWidth: 520, minHeight: 320 });
    win.el.classList.add('nw-history');
    this.side = h('nav', { class: 'nw-h-side', 'aria-label': t('history.title') });
    this.search = h('input', { class: 'nw-h-search', type: 'search', placeholder: t('history.search'), 'aria-label': t('history.search') });
    this.filter = h('select', { class: 'nw-h-filter', 'aria-label': t('history.bySession') });
    this.list = h('div', { class: 'nw-h-list', role: 'list' });
    win.body.append(h('div', { class: 'nw-h-root' }, this.side, h('div', { class: 'nw-h-main' }, h('div', { class: 'nw-h-tools' }, h('label', { class: 'nw-h-searchbox' }, icon('search'), this.search), this.filter), this.list)));
    this.search.addEventListener('input', () => { this.text = this.search.value; this.draw(); }, { signal: win.signal });
    this.filter.addEventListener('change', () => { this.session = this.filter.value; this.draw(); }, { signal: win.signal });
    const off = history.on('change', () => this.draw());
    win.on('destroy', () => { off(); if (current === this) current = null; });
    this.draw();
  }

  /** A page of history in a NetWave window: the last one used, or a new one. */
  openUrl(url, { newWindow = false, privately = false } = {}) {
    const w = lastWindow();
    if (!w || newWindow || privately) {
      const other = new NetWaveWindow({ url, ...(privately && { private: true }) }, this.openWindow);
      this.openWindow(other.win, other.key, { main: true });
      return;
    }
    w.newTab(url);
    w.show();
  }

  #target() {
    const w = lastWindow();
    if (w) return w;
    const other = new NetWaveWindow({}, this.openWindow);
    this.openWindow(other.win, other.key, { main: true });
    return other;
  }

  draw() {
    const counts = { pages: null, sessions: history.sessions().length, closed: history.closed().length };
    const place = (id, glyph, label) => h('button', {
      type: 'button', class: 'nw-h-place', 'aria-current': this.view === id ? 'page' : null,
      onclick: () => { this.view = id; this.draw(); },
    }, icon(glyph), h('span', {}, label), counts[id] != null ? h('span', { class: 'nw-h-count' }, String(counts[id])) : null);
    const range = (id, label) => h('button', {
      type: 'button', class: 'nw-h-place sub', 'aria-current': this.view === 'pages' && this.range === id ? 'page' : null,
      onclick: () => { this.view = 'pages'; this.range = id; this.draw(); },
    }, icon('calendar'), h('span', {}, label));
    this.side.replaceChildren(
      place('pages', 'globe', t('history.pages')),
      place('sessions', 'workarea', t('history.sessions')),
      place('closed', 'undo', t('history.closed')),
      h('hr'),
      range('all', t('history.all')), range('today', t('history.today')), range('yesterday', t('history.yesterday')), range('week', t('history.week')),
      h('hr'),
      h('button', { type: 'button', class: 'nw-h-place', onclick: () => clearHistory(this.win) }, icon('trash'), h('span', {}, t('history.clear'))),
    );
    this.filter.hidden = this.view !== 'pages';
    if (this.view === 'pages') {
      const sessions = history.sessions();
      this.filter.replaceChildren(h('option', { value: '' }, t('history.allSessions')), ...sessions.map(s => h('option', { value: s.id, selected: s.id === this.session }, s.name)));
      if (this.session && !sessions.some(s => s.id === this.session)) this.session = '';
    }
    this.search.placeholder = t(this.view === 'sessions' ? 'history.searchSessions' : 'history.search');
    if (this.view === 'pages') this.#pages();
    else if (this.view === 'sessions') this.#sessions();
    else this.#closed();
  }

  #pages() {
    const today = dayStart(Date.now());
    const bounds = {
      all: [0, Infinity], today: [today, Infinity], yesterday: [today - DAY_MS, today - 1], week: [today - 6 * DAY_MS, Infinity],
    }[this.range];
    const visits = history.visits({ from: bounds[0], to: bounds[1], text: this.text, session: this.session || null, limit: 2000 });
    if (!visits.length) return this.list.replaceChildren(h('p', { class: 'nw-h-empty' }, t('history.noPages')));
    const out = [];
    let day = null;
    for (const v of visits) {
      const d = dayStart(v.at);
      if (d !== day) {
        day = d;
        const label = d === today ? t('history.today') : d === today - DAY_MS ? t('history.yesterday') : '';
        out.push(h('div', { class: 'nw-h-day' }, [label, i18n.date(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')));
      }
      const row = h('div', { class: 'nw-h-row', role: 'listitem', tabindex: '0', title: v.url },
        h('span', { class: 'nw-h-time' }, time(v.at)),
        icon('globe'),
        h('span', { class: 'nw-h-name' }, v.title || hostOf(v.url), h('small', {}, hostOf(v.url))),
        v.session ? h('button', { type: 'button', class: 'nw-chip', title: t('history.onlySession'), onclick: e => { e.stopPropagation(); this.session = v.session.id; this.draw(); } }, icon('workarea'), v.session.name) : h('span', { class: 'nw-chip grey' }, t('session.none')),
        h('button', { type: 'button', class: 'nw-h-act', title: t('history.remove'), 'aria-label': t('history.remove'), onclick: e => { e.stopPropagation(); history.removeVisits([v]); } }, icon('x')));
      row.addEventListener('click', () => this.openUrl(v.url));
      row.addEventListener('keydown', e => { if (e.key === 'Enter') this.openUrl(v.url); });
      row.addEventListener('contextmenu', e => {
        e.preventDefault();
        openMenu(e.clientX, e.clientY, [
          { label: t('history.openTab'), icon: 'plus', action: () => this.openUrl(v.url) },
          { label: t('history.openWindow'), icon: 'window', action: () => this.openUrl(v.url, { newWindow: true }) },
          { label: t('page.openLinkPrivate'), icon: 'eyeOff', action: () => this.openUrl(v.url, { privately: true }) },
          { label: t('page.copyLink'), icon: 'link', action: () => navigator.clipboard?.writeText(v.url).catch(() => {}) },
          '-',
          { label: t('history.remove'), icon: 'trash', action: () => history.removeVisits([v]) },
          { label: t('history.removeSite', { host: hostOf(v.url) }), icon: 'trash', action: () => history.removeVisits(history.visits({ limit: 100000 }).filter(x => hostOf(x.url) === hostOf(v.url))) },
        ]);
      });
      out.push(row);
    }
    this.list.replaceChildren(...out);
  }

  #sessions() {
    const list = history.sessions({ text: this.text });
    if (!list.length) return this.list.replaceChildren(h('p', { class: 'nw-h-empty' }, t('history.noSessions')));
    this.list.replaceChildren(...list.map(s => {
      const open = [...windows].find(w => w.session?.id === s.id);
      const fileThere = s.file && fs.exists(s.file);
      const last = s.events.at(-1);
      const shown = s.tabs.slice(0, 6);
      return h('div', { class: `nw-h-card${open ? ' open' : ''}`, role: 'listitem' },
        h('div', { class: 'nw-h-card-top' }, icon('workarea'), h('b', {}, s.name),
          open ? h('span', { class: 'nw-chip ok' }, t('history.openNow')) : null,
          h('span', { class: 'nw-h-card-when' }, t(`history.event.${last.event}`, { when: i18n.date(last.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }), n: s.tabs.length }))),
        s.path ? h('div', { class: 'nw-h-card-path' }, s.path) : null,
        h('div', { class: 'nw-h-card-tabs' }, ...shown.map(x => h('span', { class: 'nw-h-pill', title: x.url }, icon('globe'), x.title || hostOf(x.url))), s.tabs.length > shown.length ? h('span', { class: 'nw-h-pill' }, `+${s.tabs.length - shown.length}`) : null),
        h('div', { class: 'nw-h-card-acts' },
          open
            ? h('button', { type: 'button', class: 'ctl-btn', onclick: () => open.show() }, icon('window'), t('history.goToWindow'))
            : h('button', { type: 'button', class: 'ctl-btn primary', onclick: () => reopenSession(this.#target(), s) }, t('history.reopen')),
          h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.#target().openSnapshot(s) }, t('history.reopenAsWas', { when: time(s.at) })),
          fileThere ? h('button', { type: 'button', class: 'ctl-btn', onclick: () => launch('files', { folder: fs.get(s.file).parent }) }, icon('folder'), t('history.showFile')) : null,
          !fileThere && s.file ? h('span', { class: 'nw-h-gone' }, icon('warning'), t('history.fileGone')) : null,
          h('button', { type: 'button', class: 'nw-h-act', title: t('history.removeSession'), 'aria-label': t('history.removeSession'), onclick: () => history.removeSession(s.id) }, icon('trash'))));
    }));
  }

  #closed() {
    const q = this.text.trim().toLowerCase();
    const list = history.closed().filter(c => !q || c.tabs.some(x => `${x.title} ${x.url}`.toLowerCase().includes(q)));
    if (!list.length) return this.list.replaceChildren(h('p', { class: 'nw-h-empty' }, t('history.noClosed')));
    this.list.replaceChildren(...list.map(c => h('div', { class: 'nw-h-card', role: 'listitem' },
      h('div', { class: 'nw-h-card-top' }, icon(c.kind === 'window' ? 'window' : 'globe'),
        h('b', {}, c.kind === 'window' ? t('history.closedWindow', { n: c.tabs.length }) : c.tabs[0].title || hostOf(c.tabs[0].url)),
        c.session ? h('span', { class: 'nw-chip' }, icon('workarea'), c.session.name) : null,
        h('span', { class: 'nw-h-card-when' }, i18n.date(c.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))),
      c.kind === 'window' ? h('div', { class: 'nw-h-card-tabs' }, ...c.tabs.slice(0, 6).map(x => h('span', { class: 'nw-h-pill', title: x.url }, icon('globe'), x.title || hostOf(x.url)))) : h('div', { class: 'nw-h-card-path' }, c.tabs[0].url),
      h('div', { class: 'nw-h-card-acts' },
        h('button', { type: 'button', class: 'ctl-btn primary', onclick: () => this.#target().reopenClosed(c.id) }, t('history.reopen')),
        c.kind === 'window' ? h('button', { type: 'button', class: 'ctl-btn', onclick: () => { const w = this.#target(); history.takeClosed(c.id); w.openSnapshot(c).saveSessionAs(); } }, icon('save'), t('history.saveAsSession')) : null))));
  }
}
