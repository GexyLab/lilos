import { h, session, appIcon, avatar, closeMenu, openMenu, icon, shortcuts, kernel, fs } from '@lilos/sdk';
import { installedApps, isInstalled, getApp, launch, registry, CATEGORIES } from '../apps/registry.js';
import { showAppProperties } from '../apps/appProperties.js';
import { openFile } from '../apps/open.js';
import { fileIcon } from '../desktop/itemIcons.js';
import { signOut } from '../user/UserPage.js';
import { usage } from './usage.js';

const CATEGORY_LABELS = { system: 'Sistema', productivity: 'Produttività', media: 'Media', development: 'Sviluppo', other: 'Altro' };
const RECENT_APPS = 6;
const FREQUENT_APPS = 12;
const RECENT_FILES = 8;
const FREQUENT_FILES = 8;
const ARROWS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
const DRAG_TYPE = 'application/x-lilos-app';

/** Lowercase without accents, for search. */
const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const times = n => (n === 1 ? '1 volta' : `${n} volte`);
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** '3 minuti fa', 'ieri', '12 ott'. */
function ago(time) {
  if (!Number.isFinite(time)) return '';
  const rtf = new Intl.RelativeTimeFormat(session.locale, { numeric: 'auto' });
  const min = Math.round((Date.now() - time) / 60_000);
  if (min < 1) return rtf.format(0, 'second');
  if (min < 60) return rtf.format(-min, 'minute');
  if (min < 24 * 60) return rtf.format(-Math.round(min / 60), 'hour');
  if (min < 7 * 24 * 60) return rtf.format(-Math.round(min / (24 * 60)), 'day');
  return new Date(time).toLocaleDateString(session.locale, { day: 'numeric', month: 'short' });
}

/** Where a file is, from the home: 'Documenti/Clienti' ('Home' at the top). */
const folderOf = id => fs.ancestors(id).slice(1, -1).map(n => n.name).join('/') || 'Home';

const withColor = (el, color) => { el.style.setProperty('--ws', color); return el; };

/**
 * The start menu, opened by the logo button (or Ctrl+K): a page over the desk and the windows
 * (the taskbar stays visible). Search at the top; three columns: favourite apps (pinned with the
 * star, in the user's order) · every app of the workspace in tabs (recent and frequent, the
 * workareas, one per category) · files opened recently and most often; at the bottom a button per
 * workspace. Favourites and history are per workspace (usage.js), so everything follows the
 * workspace shown; changing it from here keeps the menu open.
 */
export class StartMenu {
  /** Set by the user page: called when the user's name is clicked, and when the menu opens. */
  onUser = null;
  onOpen = null;
  #tab = 'recent';
  #offs = [];
  #ctx = null;          // { workspaces, workareas } once connected
  #focusKey = null;     // control to focus after the next drawing (the workspace button just used)
  #dragging = null;     // app id being dragged to the favourites

  constructor(anchor) {
    this.anchor = anchor;
    this.input = h('input', { type: 'text', placeholder: 'Cerca app e file', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Cerca app, work area e file' });
    this.keyHint = h('kbd');
    this.wsLabel = h('div', { class: 'sm-ws' });
    this.tabs = h('div', { class: 'sm-tabs', role: 'tablist', 'aria-label': 'App' });
    this.panel = h('div', { class: 'sm-body sm-panel', id: 'sm-panel', role: 'tabpanel' });
    this.favs = h('div', { class: 'sm-body sm-favs' });
    this.favHint = h('span', { class: 'sm-hint' }, 'trascina per riordinare');
    this.files = h('div', { class: 'sm-body' });
    this.clearFiles = h('button', {
      class: 'sm-link', type: 'button', title: 'Svuota gli elenchi dei file di questo workspace (i file restano dove sono)',
      onclick: () => { usage.clearFiles(); this.input.focus(); },
    }, 'Cancella elenco');
    this.wsBar = h('nav', { class: 'sm-wsbar', 'aria-label': 'Workspace' });

    this.el = h('section', { class: 'start-menu', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu applicazioni', hidden: true },
      h('header', { class: 'sm-top' },
        this.wsLabel,
        h('label', { class: 'sm-search' }, icon('search'), this.input, this.keyHint),
        h('div', { class: 'sm-actions' },
          h('button', { class: 'sm-user', type: 'button', title: 'Pagina utente', onclick: () => { this.close(); this.onUser?.(); } },
            avatar(session.user, 'avatar user-avatar'), h('span', {}, session.user.name)),
          h('button', { class: 'sm-btn', type: 'button', title: 'Pannello di controllo', 'aria-label': 'Pannello di controllo', onclick: () => this.#launch('settings') }, icon('gear')),
          kernel.mode === 'multi'
            ? h('button', { class: 'sm-btn', type: 'button', title: 'Esci', 'aria-label': 'Esci', onclick: () => { this.close(); signOut(); } }, icon('power'))
            : h('button', { class: 'sm-btn', type: 'button', title: 'Riavvia sessione', 'aria-label': 'Riavvia sessione', onclick: () => { this.close(); signOut(); } }, icon('power')),
          h('button', { class: 'sm-close', type: 'button', title: 'Chiudi (Esc)', 'aria-label': 'Chiudi il menu', onclick: () => this.close({ focus: true }) },
            h('span', {}, 'Chiudi'), h('kbd', {}, 'Esc')),
        ),
      ),
      h('div', { class: 'sm-cols' },
        h('section', { class: 'sm-col sm-left', 'aria-labelledby': 'sm-favs-title' },
          h('div', { class: 'sm-head' }, h('h2', { id: 'sm-favs-title' }, 'Preferite'), this.favHint),
          this.favs),
        h('section', { class: 'sm-col sm-center', 'aria-label': 'App' }, this.tabs, this.panel),
        h('section', { class: 'sm-col sm-right', 'aria-labelledby': 'sm-files-title' },
          h('div', { class: 'sm-head' }, h('h2', { id: 'sm-files-title' }, 'File'), this.clearFiles),
          this.files),
      ),
      this.wsBar,
    );
    document.body.append(this.el);

    this.input.addEventListener('input', () => { this.#renderCenter(); this.#renderFiles(); });
    this.el.addEventListener('keydown', e => this.#onKey(e));
    this.#bindFavouriteDrop();
    // Another part of the taskbar is used: the menu gives way
    addEventListener('pointerdown', e => {
      if (this.isOpen && e.target.closest?.('.taskbar') && !anchor.contains(e.target)) this.close();
    }, true);
    shortcuts.register({ id: 'system.startMenu', label: 'Apri o chiudi il menu di avvio', group: 'Generale', keys: ['Ctrl+K'], whenEditing: true, run: () => this.toggle() });
  }

  /** The workspaces and the workareas (made after the taskbar): their tab and buttons. */
  connect({ workspaces, workareas }) {
    this.#ctx = { workspaces, workareas };
  }

  get isOpen() {
    return !this.el.hidden;
  }

  open() {
    if (this.isOpen) return;
    closeMenu();
    this.onOpen?.();
    this.input.value = '';
    this.#tab = 'recent';   // or the first tab there is
    this.#render();
    this.el.hidden = false;
    this.anchor.classList.add('active');
    this.anchor.setAttribute('aria-expanded', 'true');
    const redraw = () => { if (this.isOpen) this.#render(); };
    const { workspaces, workareas } = this.#ctx ?? {};
    this.#offs = [
      usage.on('change', redraw), registry.on('change', redraw),
      workspaces?.on('change', redraw), workspaces?.on('switch', redraw), workareas?.on('change', redraw),
    ].filter(Boolean);
    this.panel.scrollTop = 0;
    this.input.focus();
  }

  /** focus: give the keyboard back to the start button (Esc). */
  close({ focus = false } = {}) {
    if (!this.isOpen) return;
    const hadFocus = this.el.contains(document.activeElement);
    closeMenu();
    this.el.hidden = true;
    this.#offs.forEach(off => off());
    this.#offs = [];
    this.anchor.classList.remove('active');
    this.anchor.setAttribute('aria-expanded', 'false');
    if (hadFocus && focus) this.anchor.focus();
  }

  toggle() {
    if (this.isOpen) this.close({ focus: this.el.contains(document.activeElement) });
    else this.open();
  }

  // ---------- Drawing ----------

  #render() {
    // The control that had the keyboard gets it back after drawing again
    const active = this.el.contains(document.activeElement) ? document.activeElement : null;
    const key = this.#focusKey ?? active?.closest('[data-key]')?.dataset.key ?? null;
    this.#focusKey = null;
    this.#renderTop();
    this.#renderFavs();
    this.#renderCenter();
    this.#renderFiles();
    this.#renderWorkspaces();
    if (active === this.input) return;
    const again = key && [...this.el.querySelectorAll('[data-key]')].find(el => el.dataset.key === key);
    if (again) again.focus();
    else if (key || (this.isOpen && !this.el.contains(document.activeElement))) this.input.focus();
  }

  #renderTop() {
    const ws = this.#ctx?.workspaces.current;
    this.wsLabel.replaceChildren(...(ws ? [withColor(h('span', { class: 'sm-dot' }), ws.color), 'Workspace ', h('b', {}, ws.name)] : []));
    const keys = shortcuts.label('system.startMenu');
    this.keyHint.textContent = keys ?? '';
    this.keyHint.hidden = !keys;
  }

  #renderFavs() {
    const pinned = usage.pinned().map(getApp).filter(app => app && isInstalled(app.id));
    this.favHint.hidden = pinned.length < 2;
    this.favs.replaceChildren(...(pinned.length
      ? pinned.map(app => h('button', {
        class: 'sm-fav', type: 'button', draggable: 'true', dataset: { nav: '', key: `fav:${app.id}`, app: app.id },
        onclick: () => this.#launch(app.id),
        oncontextmenu: e => this.#appMenu(e, app, { favourite: true }),
        ondragstart: e => this.#dragStart(e, app.id),
        ondragend: () => this.#dragEnd(),
      }, appIcon(app), h('span', { class: 'sm-label' }, app.name), icon('grip', 'ico sm-grip')))
      : [h('p', { class: 'sm-empty' }, 'Nessuna preferita in questo workspace. Usa la stella su un’app, o trascinala qui, per fissarla.')]));
  }

  #renderCenter() {
    const query = fold(this.input.value.trim());
    const apps = installedApps();
    const areas = this.#workareas();
    if (query) {
      this.tabs.replaceChildren(h('span', { class: 'sm-tab', role: 'tab', 'aria-selected': 'true' }, 'Risultati'));
      const hits = apps.filter(app => fold(app.name).includes(query) || fold(app.text?.description).includes(query));
      const areaHits = areas.filter(a => fold(`${a.title} ${a.description}`).includes(query));
      this.panel.replaceChildren(...(hits.length || areaHits.length
        ? [
          hits.length > 0 && this.#section('App', this.#grid(hits.map(app => this.#tile(app, `res:${app.id}`)))),
          areaHits.length > 0 && this.#section('Work Area', this.#areaGrid(areaHits)),
        ]
        : [h('p', { class: 'sm-empty' }, `Nessuna app o work area per «${this.input.value.trim()}»`)]));
      return;
    }

    // Only the tabs with something in them
    const used = this.#usedApps();
    const tabs = [
      (used.recent.length > 0 || used.frequent.length > 0) && ['recent', 'Recenti e frequenti', null],
      areas.length > 0 && ['areas', 'Work Area', areas.length],
      ...CATEGORIES.map(c => [c, CATEGORY_LABELS[c], apps.filter(app => app.category === c).length]).filter(([, , n]) => n > 0),
    ].filter(Boolean);
    if (!tabs.length) {
      this.tabs.replaceChildren();
      this.panel.replaceChildren(h('p', { class: 'sm-empty' }, 'Nessuna app in questo workspace.'));
      return;
    }
    if (!tabs.some(([id]) => id === this.#tab)) this.#tab = tabs[0][0];
    this.tabs.replaceChildren(...tabs.map(([id, label, n]) => h('button', {
      class: 'sm-tab', type: 'button', role: 'tab', id: `sm-tab-${id}`, 'aria-selected': String(id === this.#tab), 'aria-controls': 'sm-panel',
      tabindex: id === this.#tab ? '0' : '-1', dataset: { nav: '', key: `tab:${id}`, tab: id },
      onclick: () => this.#selectTab(id),
    }, label, n != null && h('span', { class: 'sm-count' }, String(n)))));
    this.panel.setAttribute('aria-labelledby', `sm-tab-${this.#tab}`);

    if (this.#tab === 'recent') this.panel.replaceChildren(...this.#recentApps(used));
    else if (this.#tab === 'areas') this.panel.replaceChildren(this.#areaGrid(areas));
    else {
      const list = apps.filter(app => app.category === this.#tab).sort((a, b) => a.name.localeCompare(b.name, session.locale));
      this.panel.replaceChildren(this.#grid(list.map(app => this.#tile(app, `cat:${app.id}`))));
    }
  }

  /** { recent, frequent }: the apps of the workspace used lately, and most (apart from those already recent). */
  #usedApps() {
    const keep = id => isInstalled(id);
    const recent = usage.recentApps(keep).slice(0, RECENT_APPS);
    const shown = new Set(recent.map(r => r.id));
    const frequent = usage.frequentApps(id => keep(id) && !shown.has(id)).slice(0, FREQUENT_APPS);
    return { recent, frequent };
  }

  #recentApps({ recent, frequent }) {
    return [
      recent.length > 0 && this.#section('Usate di recente', this.#grid(recent.map(r => this.#tile(getApp(r.id), `rec:${r.id}`, ago(r.last))))),
      frequent.length > 0 && this.#section(['Usate più spesso', h('span', {}, ' · ultimi 30 giorni')], this.#grid(frequent.map(f => this.#tile(getApp(f.id), `freq:${f.id}`, times(f.count))))),
    ].filter(Boolean);
  }

  #renderFiles() {
    const query = fold(this.input.value.trim());
    const exists = id => { const n = fs.get(id); return n?.type === 'file' && !fs.isHidden(id); };
    const keep = id => exists(id) && (!query || fold(fs.get(id).name).includes(query));
    const recent = usage.recentFiles(keep).slice(0, RECENT_FILES);
    // Opened at least twice: once is not "often"
    const frequent = usage.frequentFiles(keep).filter(f => f.count > 1).slice(0, FREQUENT_FILES);
    this.clearFiles.hidden = !usage.recentFiles(exists).length;
    if (!recent.length && !frequent.length) {
      this.files.replaceChildren(h('p', { class: 'sm-empty' }, query
        ? `Nessun file per «${this.input.value.trim()}»`
        : 'I file che apri in questo workspace compariranno qui.'));
      return;
    }
    const none = h('p', { class: 'sm-empty sm-small' }, 'Nessuno');
    this.files.replaceChildren(
      this.#section('Aperti di recente', recent.length ? recent.map(r => this.#fileRow(fs.get(r.id), `frec:${r.id}`, ago(r.last))) : none),
      h('div', { class: 'sm-divider' }),
      this.#section(['Aperti più spesso', h('span', {}, ' · ultimi 30 giorni')],
        frequent.length ? frequent.map(f => this.#fileRow(fs.get(f.id), `ffreq:${f.id}`, times(f.count))) : none.cloneNode(true)),
    );
  }

  #renderWorkspaces() {
    const workspaces = this.#ctx?.workspaces;
    this.wsBar.hidden = !workspaces;
    if (!workspaces) return;
    const current = workspaces.currentId;
    this.wsBar.replaceChildren(...workspaces.list().map(w => {
      const here = w.id === current;
      return withColor(h('button', {
        class: 'sm-wsb', type: 'button', 'aria-pressed': String(here), dataset: { nav: '', key: `ws:${w.id}` },
        title: w.description ? `${w.name}\n${w.description}` : w.name,
        onclick: () => this.#switchTo(w.id),
        oncontextmenu: e => {
          e.preventDefault();
          const { x, y } = menuPoint(e);
          openMenu(x, y, [
            { label: 'Vai a questo workspace', icon: 'workspace', disabled: here, action: () => this.#switchTo(w.id) },
            { label: 'Gestisci i workspace…', icon: 'gear', action: () => this.#launch('settings', { tab: 'workspaces' }) },
          ]);
        },
      },
      h('span', { class: 'sm-wsb-name' }, h('span', { class: 'sm-dot' }), h('b', {}, w.name), here && h('span', { class: 'sm-here' }, 'attuale')),
      w.description && h('span', { class: 'sm-wsb-desc' }, w.description)), w.color);
    }));
  }

  // ---------- Pieces ----------

  #section(title, content) {
    return h('div', { class: 'sm-section' }, h('h3', { class: 'sm-sub' }, title), content);
  }

  #grid(tiles) {
    return h('div', { class: 'sm-grid' }, tiles);
  }

  #tile(app, key, meta = '') {
    const pinned = usage.isPinned(app.id);
    return h('button', {
      class: 'sm-tile', type: 'button', draggable: 'true', dataset: { nav: '', key },
      title: app.text?.description || app.name,
      onclick: () => this.#launch(app.id),
      oncontextmenu: e => this.#appMenu(e, app),
      ondragstart: e => this.#dragStart(e, app.id),
      ondragend: () => this.#dragEnd(),
    },
    h('span', {
      class: pinned ? 'sm-pin on' : 'sm-pin', 'aria-hidden': 'true',
      title: pinned ? 'Togli dalle preferite' : 'Aggiungi alle preferite',
      onclick: e => { e.stopPropagation(); usage.setPinned(app.id, !pinned); },
    }, icon('star')),
    appIcon(app),
    h('span', { class: 'sm-label' }, app.name),
    meta && h('span', { class: 'sm-meta' }, meta));
  }

  #fileRow(node, key, info) {
    return h('button', {
      class: 'sm-file', type: 'button', dataset: { nav: '', key }, title: fs.path(node.id),
      onclick: () => { this.close(); openFile(node); },
      oncontextmenu: e => {
        e.preventDefault();
        const { x, y } = menuPoint(e);
        openMenu(x, y, [
          { label: 'Apri', icon: 'open', action: () => { this.close(); openFile(node); } },
          { label: 'Apri con…', icon: 'open', action: () => { this.close(); openFile(node, { choose: true }); } },
          { label: 'Mostra nella cartella', icon: 'folderOpen', action: () => this.#launch('files', { folder: node.parent }) },
          '-',
          { label: 'Togli dall’elenco', icon: 'x', action: () => usage.forgetFile(node.id) },
        ]);
      },
    },
    h('span', { class: 'sm-ficon' }, fileIcon(node.name)),
    h('span', { class: 'sm-ftext' }, h('span', { class: 'sm-fname' }, node.name), h('span', { class: 'sm-fpath' }, folderOf(node.id))),
    h('span', { class: 'sm-when' }, info));
  }

  /** The workareas of the workspace, the last changed first. */
  #workareas() {
    const list = this.#ctx?.workareas.list() ?? [];
    return list.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
  }

  #areaGrid(areas) {
    const workareas = this.#ctx.workareas;
    return h('div', { class: 'sm-areas' }, areas.map(a => {
      const { items, windows } = workareas.contentOf(a.id);
      return h('button', {
        class: 'sm-area', type: 'button', dataset: { nav: '', key: `area:${a.id}` }, title: 'Vai alla workarea',
        onclick: () => this.#showArea(a.id),
        oncontextmenu: e => {
          e.preventDefault();
          const { x, y } = menuPoint(e);
          openMenu(x, y, [
            { label: 'Vai alla workarea', icon: 'workarea', action: () => this.#showArea(a.id) },
            { label: 'Proprietà…', icon: 'info', action: () => { this.close(); workareas.properties(a.id); } },
          ]);
        },
      },
      h('span', { class: 'sm-area-title' }, icon('workarea'), h('span', {}, a.title)),
      h('span', { class: a.description ? 'sm-area-desc' : 'sm-area-desc none' }, a.description || 'Nessuna descrizione'),
      h('span', { class: 'sm-area-foot' },
        h('span', { class: 'sm-area-count' }, `${count(windows, 'finestra', 'finestre')} · ${count(items, 'elemento', 'elementi')}`),
        h('span', { class: 'sm-badge' }, a.collapsed ? 'Ridotta a icona' : `modificata ${ago(a.modified)}`)));
    }));
  }

  #appMenu(e, app, { favourite = false } = {}) {
    e.preventDefault();
    const { x, y } = menuPoint(e);
    const pinned = usage.isPinned(app.id);
    const order = usage.pinned();
    const at = order.indexOf(app.id);
    openMenu(x, y, [
      { label: 'Apri', icon: 'open', action: () => this.#launch(app.id) },
      { label: pinned ? 'Togli dalle preferite' : 'Aggiungi alle preferite', icon: 'star', action: () => usage.setPinned(app.id, !pinned) },
      favourite && { label: 'Sposta su', icon: 'arrowUp', disabled: at <= 0, action: () => this.#movePinned(app.id, at - 1) },
      favourite && { label: 'Sposta giù', icon: 'arrowDown', disabled: at >= order.length - 1, action: () => this.#movePinned(app.id, at + 1) },
      '-',
      { label: 'Proprietà…', icon: 'info', action: () => { this.close(); showAppProperties(app.id); } },
    ].filter(Boolean));
  }

  // ---------- Actions ----------

  #selectTab(id) {
    if (id === this.#tab) return;
    this.#tab = id;
    this.#focusKey = `tab:${id}`;
    this.#render();
    this.panel.scrollTop = 0;
  }

  #movePinned(id, index) {
    this.#focusKey = `fav:${id}`;
    usage.setPinned(id, true, index);
  }

  #switchTo(id) {
    const workspaces = this.#ctx?.workspaces;
    if (!workspaces || id === workspaces.currentId) return;
    // Changing workspace takes the keyboard away: it comes back to the same button
    this.#focusKey = `ws:${id}`;
    workspaces.switchTo(id);
  }

  #showArea(id) {
    this.close();
    this.#ctx?.workareas.show(id);
  }

  #launch(id, args) {
    this.close();
    launch(id, args);
  }

  // ---------- Favourites by dragging ----------

  #dragStart(e, id) {
    this.#dragging = id;
    e.dataTransfer.setData(DRAG_TYPE, id);
    e.dataTransfer.effectAllowed = 'copyMove';
  }

  #dragEnd() {
    this.#dragging = null;
    this.#dropMark(null);
  }

  /** Dropped on the favourites column: pinned (or moved) where the pointer is. */
  #bindFavouriteDrop() {
    const column = this.favs;
    const indexAt = y => {
      const rows = [...column.querySelectorAll('.sm-fav')].filter(r => r.dataset.app !== this.#dragging);
      const i = rows.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
      return { rows, index: i < 0 ? rows.length : i };
    };
    column.addEventListener('dragover', e => {
      if (!this.#dragging) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = usage.isPinned(this.#dragging) ? 'move' : 'copy';
      const { rows, index } = indexAt(e.clientY);
      this.#dropMark(rows[index] ?? column);
    });
    column.addEventListener('dragleave', e => { if (!column.contains(e.relatedTarget)) this.#dropMark(null); });
    column.addEventListener('drop', e => {
      if (!this.#dragging) return;
      e.preventDefault();
      const id = this.#dragging;
      const { index } = indexAt(e.clientY);
      this.#dragEnd();
      this.#focusKey = `fav:${id}`;
      usage.setPinned(id, true, index);
    });
  }

  /** Shows where a dragged app would go: before a row, or at the end of the column. */
  #dropMark(target) {
    this.favs.querySelectorAll('.drop-before').forEach(el => el.classList.remove('drop-before'));
    this.favs.classList.toggle('drop-end', target === this.favs);
    this.favs.classList.toggle('dropping', !!target);
    if (target && target !== this.favs) target.classList.add('drop-before');
  }

  // ---------- Keyboard ----------

  #onKey(e) {
    // The menu owns the keyboard while focused: desktop/canvas shortcuts must not fire underneath
    e.stopPropagation();
    const target = e.target;
    if (e.key === 'Escape' || shortcuts.matches(e, 'system.startMenu')) {
      e.preventDefault();
      // Esc first empties the search
      if (e.key === 'Escape' && target === this.input && this.input.value) {
        this.input.value = '';
        this.#renderCenter();
        this.#renderFiles();
      } else {
        this.close({ focus: true });
      }
      return;
    }
    if (e.key === 'Tab') return this.#trapTab(e);
    if (target === this.input) {
      const first = this.panel.querySelector('[data-nav]');
      if (e.key === 'Enter' && first) {
        e.preventDefault();
        first.click();
      } else if (e.key === 'ArrowDown' && first) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (target.getAttribute?.('role') === 'tab' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')) {
      e.preventDefault();
      const tabs = [...this.tabs.querySelectorAll('[role="tab"]')];
      const i = tabs.indexOf(target);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      this.#selectTab(tabs[next].dataset.tab);
      return;
    }
    if (ARROWS[e.key] && target.dataset?.nav !== undefined) {
      e.preventDefault();
      const next = nearest(this.el, target, ARROWS[e.key]);
      if (next) next.focus();
      else if (e.key === 'ArrowUp') this.input.focus();
      return;
    }
    // Typing anywhere in the menu searches
    if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey && target !== this.input) this.input.focus();
  }

  /** Tab and Shift+Tab go round the menu instead of leaving it. */
  #trapTab(e) {
    const all = [...this.el.querySelectorAll('button, input, [tabindex]')].filter(el => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length);
    const first = all[0], last = all[all.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

/** The menu point for a context menu: the pointer, or the element's corner when opened from the keyboard. */
function menuPoint(e) {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + 12, y: r.top + r.height / 2 };
}

/**
 * The [data-nav] element closest to `from` in a direction (arrow keys): those in line with it
 * (same row for ← →, same column for ↑ ↓) first, then the nearest along the direction.
 */
function nearest(root, from, [dx, dy]) {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of root.querySelectorAll('[data-nav]')) {
    if (el === from || !el.getClientRects().length) continue;
    const b = el.getBoundingClientRect();
    const x = b.left + b.width / 2 - ax, y = b.top + b.height / 2 - ay;
    const along = x * dx + y * dy;
    if (along <= 1) continue;
    const inLine = dx ? b.top < a.bottom && b.bottom > a.top : b.left < a.right && b.right > a.left;
    const score = (inLine ? 0 : 1e5) + along + Math.abs(x * dy + y * dx) * 2;
    if (score < bestScore) { best = el; bestScore = score; }
  }
  return best;
}
