import { h, icon, avatar, session, kernel, settings, fs, openMenu, toast, LANGUAGES } from '@lilos/sdk';
import { version } from '../../package.json';
import { launch } from '../apps/registry.js';
import { running } from '../apps/packages/background.js';
import { startup } from '../apps/startup.js';
import { restartKernel, restartSystem, windowsMayClose } from '../apps/updates.js';
import { lockSession } from '../boot/boot.js';
import { workspaceManager } from '../workspaces/info.js';
import { isUserPageShown as shown } from './items.js';
import { choosePhoto, removePhoto, userPhoto } from './photo.js';

const ROLES = { admin: 'Amministratore' };
/** Settings shown on the page: when one changes (here or elsewhere) it is drawn again. */
const WATCHED = ['theme', 'language', 'userPhoto', 'userPageHidden', 'startupApps'];

/**
 * Signs out (more users) after asking the windows that may hold unsaved work, then lilOS starts
 * again from the sign-in. One user only: lilOS loads again.
 */
export async function signOut() {
  if (kernel.mode !== 'multi') return restartSystem();
  if (!(await windowsMayClose())) return;
  try {
    await kernel.logout();
  } catch (err) {
    toast(`Uscita non riuscita: ${err.message}`);
    return;
  }
  location.reload();
}

/**
 * The user's page, over the desk and the windows (the taskbar stays visible), opened from the
 * user's name in the taskbar or in the menu: name and photo, what ends or locks the session or
 * restarts the system, a few account settings and facts about this session. Control Panel → Pagina
 * utente chooses what it shows (items.js). Drawn again at every opening, so what it says is current.
 */
export class UserPage {
  #taskbar;
  #wm;
  #confirming = false;   // asking whether to restart the system
  #offs = [];

  constructor({ taskbar, wm }) {
    this.#taskbar = taskbar;
    this.#wm = wm;
    this.el = h('section', { class: 'user-page', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'up-name', hidden: true });
    this.el.addEventListener('keydown', e => this.#onKey(e));
    document.body.append(this.el);

    taskbar.startMenu.onUser = () => this.open();
    taskbar.startMenu.onOpen = () => this.close();
    // Something else comes to the front: a window opens, the taskbar is used
    wm.on('open', () => this.close());
    taskbar.el.addEventListener('pointerdown', () => this.close(), true);
  }

  get isOpen() {
    return !this.el.hidden;
  }

  open() {
    if (this.isOpen) return;
    this.#confirming = false;
    this.#render();
    this.el.hidden = false;
    this.#offs = WATCHED.map(key => settings.on(`change:${key}`, () => this.#render()));
    this.el.querySelector('.up-close').focus();
  }

  close() {
    if (!this.isOpen) return;
    const hadFocus = this.el.contains(document.activeElement);
    this.el.hidden = true;
    this.#offs.forEach(off => off());
    this.#offs = [];
    // Back to the start button: the page is opened from the start menu
    if (hadFocus) this.#taskbar.startButton.focus();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  #render() {
    // The control that had the keyboard gets it back after drawing again
    const focused = this.el.contains(document.activeElement) ? document.activeElement.closest('[data-key]')?.dataset.key : null;
    const user = kernel.data?.user ?? session.user;
    this.el.replaceChildren(
      h('button', { class: 'up-close', dataset: { key: 'close' }, title: 'Chiudi (Esc)', 'aria-label': 'Chiudi la pagina utente', onclick: () => this.close() },
        h('kbd', {}, 'Esc'), icon('x')),
      h('div', { class: 'up-col' },
        this.#header(user),
        this.#confirming ? this.#confirmRestart() : this.#actions(user),
        this.#cards(),
        shown('about') && h('footer', { class: 'up-foot' }, `lilOS ${version} · ${location.host}`),
      ),
    );
    const again = focused && this.el.querySelector(`[data-key="${focused}"]`);
    if (again) again.focus();
    else if (focused) this.el.querySelector('.up-close').focus();
  }

  #header(user) {
    const editable = shown('photo');
    return h('header', { class: 'up-who' },
      h('div', { class: 'up-photo' },
        avatar(user, 'avatar user-avatar'),
        editable && h('button', {
          class: 'up-photo-edit', dataset: { key: 'photo-edit' }, title: 'Foto profilo', 'aria-label': 'Foto profilo',
          'aria-haspopup': 'menu', onclick: e => this.#photoMenu(e.currentTarget),
        }, icon('camera'))),
      h('h1', { class: 'up-name', id: 'up-name' }, user.name),
      shown('details') && h('div', { class: 'up-meta' },
        h('span', {}, user.username),
        h('span', { class: 'up-chip' }, ROLES[user.role] ?? 'Utente')),
    );
  }

  // ---------- Actions ----------

  #actions(user) {
    const multi = kernel.mode === 'multi';
    const tiles = [
      multi && shown('lock') && tile('lock', 'lock', 'Blocca', 'Le app restano aperte; per tornare serve la password', () => {
        this.close();
        lockSession().catch(err => toast(`lilOS non si blocca: ${err.message}`, { timeout: 7000 }));
      }),
      shown('logout') && (multi
        ? tile('logout', 'logout', 'Chiudi sessione', 'Salva, chiude le app e torna all’accesso', () => { this.close(); signOut(); })
        : tile('logout', 'power', 'Riavvia sessione', 'Ricarica lilOS: le finestre tornano come sono', () => { this.close(); signOut(); })),
      user.role === 'admin' && shown('restart') && tile('restart', 'restart', 'Riavvia il sistema', 'Riavvia il kernel: chi è collegato aspetta qualche secondo', () => {
        this.#confirming = true;
        this.#render();
        this.el.querySelector('[data-key="restart-cancel"]').focus();
      }, 'danger'),
    ].filter(Boolean);
    return tiles.length ? h('div', { class: 'up-actions' }, ...tiles) : null;
  }

  #confirmRestart() {
    const cancel = () => {
      this.#confirming = false;
      this.#render();
      this.el.querySelector('[data-key="restart"]')?.focus();
    };
    return h('div', { class: 'up-confirm', role: 'group', 'aria-labelledby': 'up-confirm-title' },
      h('h2', { id: 'up-confirm-title' }, 'Riavviare il sistema?'),
      h('p', {}, 'Il kernel di lilOS si ferma e riparte. Prima le finestre aperte possono salvare, poi lilOS si ricarica. Chi è collegato perde la connessione per qualche secondo.'),
      h('div', { class: 'up-confirm-buttons' },
        h('button', { class: 'up-btn', dataset: { key: 'restart-cancel' }, onclick: cancel }, 'Annulla'),
        h('button', {
          class: 'up-btn danger', dataset: { key: 'restart-now' },
          onclick: () => {
            // The windows may ask to save: they must be in view
            this.close();
            restartKernel().catch(err => toast(`Il sistema non si riavvia: ${err.message}`, { timeout: 8000 }));
          },
        }, 'Riavvia ora')),
    );
  }

  // ---------- Account and session ----------

  #cards() {
    const account = [
      shown('photo') && row('photo', 'camera', 'Foto profilo', userPhoto() ? 'Cambia o togli' : 'Nessuna', e => this.#photoMenu(e.currentTarget)),
      shown('theme') && controlRow('theme', 'palette', 'Tema', themeChoice()),
      shown('language') && controlRow('language', 'globe', 'Lingua', languageChoice()),
      shown('settings') && row('settings', 'gear', 'Tutte le impostazioni', null, () => this.#openSettings()),
    ].filter(Boolean);
    const sessionRows = [
      shown('workspace') && this.#workspaceRow(),
      shown('windows') && controlRow('windows', 'window', 'Finestre aperte', h('span', { class: 'up-value' }, this.#windowsText())),
      shown('startup') && row('startup', 'power', 'All’avvio', startupText(), () => this.#openSettings({ tab: 'startup', subtab: 'apps' })),
      shown('storage') && row('storage', 'disk', 'Spazio usato', formatBytes(contentsSize(fs.root)), () => this.#openSettings({ tab: 'storage' })),
    ].filter(Boolean);
    const cards = [
      account.length && card('Account', account),
      sessionRows.length && card('Questa sessione', sessionRows),
    ].filter(Boolean);
    return cards.length ? h('div', { class: `up-cards${cards.length === 1 ? ' single' : ''}` }, ...cards) : null;
  }

  #workspaceRow() {
    const manager = workspaceManager();
    if (!manager) return null;
    const list = manager.list();
    const index = list.findIndex(w => w.id === manager.currentId);
    const name = manager.describe(manager.currentId)?.name ?? '';
    const value = list.length > 1 ? `${name} (${index + 1} di ${list.length})` : name;
    return row('workspace', 'workspace', 'Workspace', value, () => this.#openSettings({ tab: 'workspaces' }));
  }

  #windowsText() {
    const windows = this.#wm.all().length;
    const background = running().length;
    const text = windows ? `${windows} ${windows === 1 ? 'finestra' : 'finestre'}` : 'Nessuna finestra';
    return background ? `${text}, ${background} app in background` : text;
  }

  #openSettings(args) {
    this.close();
    launch('settings', args);
  }

  #photoMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    if (!userPhoto()) return choosePhoto();
    openMenu(r.left, r.bottom + 4, [
      { label: 'Cambia foto…', icon: 'camera', action: choosePhoto },
      { label: 'Togli foto', icon: 'trash', action: removePhoto },
    ]);
  }

  #onKey(e) {
    // The page owns the keyboard: desk and canvas shortcuts must not fire underneath
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.#confirming) {
        this.#confirming = false;
        this.#render();
        this.el.querySelector('[data-key="restart"]')?.focus();
      } else {
        this.close();
      }
    } else if (e.key === 'Tab') {
      // Focus stays on the page
      const all = [...this.el.querySelectorAll('button, select')].filter(el => !el.disabled);
      const i = all.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); all.at(-1)?.focus(); }
      else if (!e.shiftKey && i === all.length - 1) { e.preventDefault(); all[0]?.focus(); }
    }
  }
}

// ---------- Parts ----------

function tile(key, glyph, title, text, onclick, kind = '') {
  return h('button', { class: `up-tile${kind ? ` ${kind}` : ''}`, dataset: { key }, onclick },
    icon(glyph), h('strong', {}, title), h('small', {}, text));
}

const card = (title, rows) => h('section', { class: 'up-card' }, h('h2', {}, title), ...rows);

/** A row that does something when clicked: icon, label, value (optional). */
function row(key, glyph, label, value, onclick) {
  return h('button', { class: 'up-row', dataset: { key }, onclick },
    icon(glyph), h('span', { class: 'up-label' }, label),
    value != null && h('span', { class: 'up-value' }, value),
    icon('arrowRight'));
}

/** A row with its own control (or a value that is only read). */
function controlRow(key, glyph, label, control) {
  return h('div', { class: 'up-row static' }, icon(glyph), h('span', { class: 'up-label', id: `up-${key}` }, label), control);
}

function themeChoice() {
  const value = settings.get('theme');
  const group = h('div', { class: 'up-seg', role: 'group', 'aria-labelledby': 'up-theme' });
  for (const [theme, label] of [['light', 'Chiaro'], ['dark', 'Scuro']]) {
    group.append(h('button', {
      dataset: { key: `theme-${theme}` }, 'aria-pressed': String(value === theme),
      onclick: () => settings.set('theme', theme),
    }, label));
  }
  return group;
}

/** 'auto' (the browser's) or one of lilOS's languages, each named in its own language. */
function languageChoice() {
  const value = settings.get('language');
  const codes = [...LANGUAGES];
  if (value !== 'auto' && !codes.includes(value)) codes.push(value);
  const capital = name => name.charAt(0).toUpperCase() + name.slice(1);
  const select = h('select', { class: 'up-select', dataset: { key: 'language' }, 'aria-labelledby': 'up-language' },
    h('option', { value: 'auto', selected: value === 'auto' }, `Automatica (${capital(languageName(navigator.language || 'en', 'it'))})`),
    ...codes.map(code => h('option', { value: code, selected: value === code }, capital(languageName(code, code)))));
  select.addEventListener('change', () => settings.set('language', select.value));
  return select;
}

function languageName(code, lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function startupText() {
  if (!settings.get('startupApps')) return 'Spento';
  const n = startup.apps().length;
  return n ? `${n} app` : 'Nessuna app';
}

/** Bytes of the files in a folder and in those inside it. */
const contentsSize = id => fs.children(id).reduce((sum, n) => sum + (n.type === 'folder' ? contentsSize(n.id) : n.size ?? 0), 0);

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toLocaleString('it-IT', { maximumFractionDigits: i ? 1 : 0 })} ${units[i]}`;
}
