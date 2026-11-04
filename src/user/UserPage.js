import { h, icon, avatar, session, kernel, settings, fs, openMenu, LANGUAGES, formatBytes, locale } from '@lilos/sdk';
import { version } from '../../package.json';
import { launch } from '../apps/registry.js';
import { running } from '../apps/packages/background.js';
import { startup } from '../apps/startup.js';
import { restartKernel, restartSystem, shutdownSystem, windowsMayClose } from '../apps/updates.js';
import { lockSession } from '../boot/boot.js';
import { workspaceManager } from '../workspaces/info.js';
import { isUserPageShown as shown } from './items.js';
import { choosePhoto, removePhoto, userPhoto } from './photo.js';
import { notify } from '../notifications/notify.js';

const { t } = locale.define('lilos:userPage', {
  en: { strings: {
    'role.admin': 'Administrator', 'role.user': 'User',
    signOutFailed: 'Could not sign out: {message}',
    close: 'Close (Esc)', closeLabel: 'Close the user page',
    photo: 'Profile photo', 'photo.change': 'Change or remove', 'photo.none': 'None',
    'photo.choose': 'Change photo…', 'photo.remove': 'Remove photo',
    'lock.title': 'Lock', 'lock.text': 'Your apps stay open; you need your password to come back',
    lockFailed: 'lilOS could not lock: {message}',
    'logout.title': 'Sign out', 'logout.text': 'Saves, closes the apps and goes back to the sign-in',
    'reload.title': 'Restart session', 'reload.text': 'Reloads lilOS: the windows come back as they are',
    'restart.title': 'Restart the system', 'restart.text': 'Restarts the kernel: whoever is connected waits a few seconds',
    'shutdown.title': 'Shut down', 'shutdown.text': 'Stops lilOS for everyone: it only starts again by hand',
    cancel: 'Cancel', failed: '{what}: {message}',
    'confirm.restart.title': 'Restart the system?',
    'confirm.restart.text': 'The lilOS kernel stops and starts again. First the open windows can save, then lilOS reloads. Whoever is connected loses the connection for a few seconds.',
    'confirm.restart.button': 'Restart now', 'confirm.restart.failed': 'The system did not restart',
    'confirm.shutdown.title': 'Shut down lilOS?',
    'confirm.shutdown.text': 'First the open windows can save, then the lilOS kernel stops for all users and does not start again by itself. In the lilOS program, the program closes too, with its database.',
    'confirm.shutdown.button': 'Shut down now', 'confirm.shutdown.failed': 'lilOS did not shut down',
    theme: 'Theme', 'theme.light': 'Light', 'theme.dark': 'Dark',
    language: 'Language', 'language.auto': 'Automatic ({name})',
    settings: 'All settings', windows: 'Open windows', startup: 'At startup', storage: 'Space used',
    account: 'Account', session: 'This session', workspace: 'Workspace',
    workspaceOf: '{name} ({index} of {count})',
    'windows.count': { one: '{n} window', other: '{n} windows' }, 'windows.none': 'No windows',
    'windows.background': { one: '{windows}, {n} app in the background', other: '{windows}, {n} apps in the background' },
    'startup.off': 'Off', 'startup.apps': { one: '{n} app', other: '{n} apps' }, 'startup.none': 'No apps',
  } },
});

const ROLES = { admin: 'role.admin' };
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
    notify(t('signOutFailed', { message: err.message }), { level: 'error' });
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
  #confirming = null;    // asking whether to 'restart' or 'shutdown' the system (a key of CONFIRM)
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
    this.#confirming = null;
    this.#render();
    this.el.hidden = false;
    this.#offs = WATCHED.map(key => settings.on(`change:${key}`, () => this.#render()));
    // The languages to choose from: those of the packs installed
    this.#offs.push(locale.on('languages', () => this.#render()));
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
      h('button', { class: 'up-close', dataset: { key: 'close' }, title: t('close'), 'aria-label': t('closeLabel'), onclick: () => this.close() },
        h('kbd', {}, 'Esc'), icon('x')),
      h('div', { class: 'up-col' },
        this.#header(user),
        this.#confirming ? this.#confirm(CONFIRM()[this.#confirming]) : this.#actions(user),
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
          class: 'up-photo-edit', dataset: { key: 'photo-edit' }, title: t('photo'), 'aria-label': t('photo'),
          'aria-haspopup': 'menu', onclick: e => this.#photoMenu(e.currentTarget),
        }, icon('camera'))),
      h('h1', { class: 'up-name', id: 'up-name' }, user.name),
      shown('details') && h('div', { class: 'up-meta' },
        h('span', {}, user.username),
        h('span', { class: 'up-chip' }, t(ROLES[user.role] ?? 'role.user'))),
    );
  }

  // ---------- Actions ----------

  #actions(user) {
    const multi = kernel.mode === 'multi';
    const tiles = [
      multi && shown('lock') && tile('lock', 'lock', t('lock.title'), t('lock.text'), () => {
        this.close();
        lockSession().catch(err => notify(t('lockFailed', { message: err.message }), { level: 'error' }));
      }),
      shown('logout') && (multi
        ? tile('logout', 'logout', t('logout.title'), t('logout.text'), () => { this.close(); signOut(); })
        : tile('logout', 'power', t('reload.title'), t('reload.text'), () => { this.close(); signOut(); })),
      user.role === 'admin' && shown('restart') && tile('restart', 'restart', t('restart.title'), t('restart.text'), () => this.#ask('restart'), 'danger'),
      user.role === 'admin' && shown('shutdown') && tile('shutdown', 'power', t('shutdown.title'), t('shutdown.text'), () => this.#ask('shutdown'), 'danger'),
    ].filter(Boolean);
    return tiles.length ? h('div', { class: 'up-actions' }, ...tiles) : null;
  }

  /** Asks whether to restart or stop the system (`what`: a key of CONFIRM), in place of the actions. */
  #ask(what) {
    this.#confirming = what;
    this.#render();
    this.el.querySelector('[data-key="confirm-cancel"]').focus();
  }

  /** Back to the actions, the keyboard on the tile that asked. */
  #cancelConfirm() {
    const tileKey = this.#confirming;
    this.#confirming = null;
    this.#render();
    this.el.querySelector(`[data-key="${tileKey}"]`)?.focus();
  }

  #confirm({ title, text, button, run, failed }) {
    return h('div', { class: 'up-confirm', role: 'group', 'aria-labelledby': 'up-confirm-title' },
      h('h2', { id: 'up-confirm-title' }, title),
      h('p', {}, text),
      h('div', { class: 'up-confirm-buttons' },
        h('button', { class: 'up-btn', dataset: { key: 'confirm-cancel' }, onclick: () => this.#cancelConfirm() }, t('cancel')),
        h('button', {
          class: 'up-btn danger', dataset: { key: 'confirm-now' },
          onclick: () => {
            // The windows may ask to save: they must be in view
            this.close();
            run().catch(err => notify(t('failed', { what: failed, message: err.message }), { level: 'error' }));
          },
        }, button)),
    );
  }

  // ---------- Account and session ----------

  #cards() {
    const account = [
      shown('photo') && row('photo', 'camera', t('photo'), userPhoto() ? t('photo.change') : t('photo.none'), e => this.#photoMenu(e.currentTarget)),
      shown('theme') && controlRow('theme', 'palette', t('theme'), themeChoice()),
      shown('language') && controlRow('language', 'globe', t('language'), languageChoice()),
      shown('settings') && row('settings', 'gear', t('settings'), null, () => this.#openSettings()),
    ].filter(Boolean);
    const sessionRows = [
      shown('workspace') && this.#workspaceRow(),
      shown('windows') && controlRow('windows', 'window', t('windows'), h('span', { class: 'up-value' }, this.#windowsText())),
      shown('startup') && row('startup', 'power', t('startup'), startupText(), () => this.#openSettings({ tab: 'startup', subtab: 'apps' })),
      shown('storage') && row('storage', 'disk', t('storage'), formatBytes(fs.usage(fs.root)?.bytes ?? 0), () => this.#openSettings({ tab: 'storage' })),
    ].filter(Boolean);
    const cards = [
      account.length && card(t('account'), account),
      sessionRows.length && card(t('session'), sessionRows),
    ].filter(Boolean);
    return cards.length ? h('div', { class: `up-cards${cards.length === 1 ? ' single' : ''}` }, ...cards) : null;
  }

  #workspaceRow() {
    const manager = workspaceManager();
    if (!manager) return null;
    const list = manager.list();
    const index = list.findIndex(w => w.id === manager.currentId);
    const name = manager.describe(manager.currentId)?.name ?? '';
    const value = list.length > 1 ? t('workspaceOf', { name, index: index + 1, count: list.length }) : name;
    return row('workspace', 'workspace', t('workspace'), value, () => this.#openSettings({ tab: 'workspaces' }));
  }

  #windowsText() {
    const windows = this.#wm.all().length;
    const background = running().length;
    const text = windows ? t('windows.count', { n: windows }) : t('windows.none');
    return background ? t('windows.background', { windows: text, n: background }) : text;
  }

  #openSettings(args) {
    this.close();
    launch('settings', args);
  }

  #photoMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    if (!userPhoto()) return choosePhoto();
    openMenu((document.documentElement.dir === 'rtl' ? r.right : r.left), r.bottom + 4, [
      { label: t('photo.choose'), icon: 'camera', action: choosePhoto },
      { label: t('photo.remove'), icon: 'trash', action: removePhoto },
    ]);
  }

  #onKey(e) {
    // The page owns the keyboard: desk and canvas shortcuts must not fire underneath
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.#confirming) {
        this.#cancelConfirm();
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

/** The questions before restarting or stopping the system. */
const CONFIRM = () => ({
  restart: {
    title: t('confirm.restart.title'),
    text: t('confirm.restart.text'),
    button: t('confirm.restart.button'),
    run: restartKernel,
    failed: t('confirm.restart.failed'),
  },
  shutdown: {
    title: t('confirm.shutdown.title'),
    text: t('confirm.shutdown.text'),
    button: t('confirm.shutdown.button'),
    run: shutdownSystem,
    failed: t('confirm.shutdown.failed'),
  },
});

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
  for (const [theme, label] of [['light', t('theme.light')], ['dark', t('theme.dark')]]) {
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
    h('option', { value: 'auto', selected: value === 'auto' }, t('language.auto', { name: capital(languageName(navigator.language || 'en', locale.code)) })),
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
  if (!settings.get('startupApps')) return t('startup.off');
  const n = startup.apps().length;
  return n ? t('startup.apps', { n }) : t('startup.none');
}
