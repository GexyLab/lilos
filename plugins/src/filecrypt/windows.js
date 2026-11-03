import { h, select, vaultChannel, STYLE } from './ui.js';
import { strength } from './crypto.js';
import { ALGORITHMS } from './format.js';
import { readSettings, explain, SETTINGS_KEY } from './vault.js';
import { fileFromArgs, recordStep, frame as sandboxFrame } from '../shared/sandbox/app.js';

/**
 * FileCrypt's windows:
 *   main      the files unlocked now (each one can be locked), and the settings
 *   unlock    the password of a file: unlocks it and opens it with its app, or (action
 *             filecrypt.decrypt) takes its encryption away
 *   encrypt   "Encrypt…" from the menu of a file: a password written twice, the algorithms
 * Passwords go to the vault over a channel; the windows never keep them.
 */
const KDF_OPTIONS = t => [['argon2id', t('kdf.argon2id')], ['pbkdf2', t('kdf.pbkdf2')]];
const ALG_OPTIONS = () => ALGORITHMS.map(a => [a, a]);
const LOCK_OPTIONS = t => [5, 15, 30, 60, 0].map(m => [String(m), m ? t('settings.minutes', { n: m }) : t('settings.never')]);

/** The window's root: its style and a box to draw in. Redraws when the language changes. */
const frame = (lilos, root, draw) => sandboxFrame(lilos, root, { style: STYLE, className: 'fc' }, draw);

function busy(button, on) {
  button.disabled = on;
  button.setAttribute('aria-busy', on ? 'true' : 'false');
}

/**
 * A form that sends with its button or Enter in a field. Not a <form>: a sandbox without
 * allow-forms blocks submitting, and its submit event never comes.
 */
function form(send, ...children) {
  const box = h('div', { class: 'fc-form', role: 'form' }, ...children);
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      send();
    }
  });
  return box;
}

// ---------- Main ----------

export async function main({ lilos, root }) {
  const t = (k, p) => lilos.locale.i18n.t(k, p);
  const vault = await vaultChannel(lilos);
  let list = [];
  let settings = await readSettings(lilos);

  const { redraw, off } = frame(lilos, root, box => {
    const save = async patch => {
      settings = { ...settings, ...patch };
      await lilos.storage.set(SETTINGS_KEY, settings);
      await vault.ask({ op: 'settings' });
    };
    const since = time => lilos.locale.i18n.date(time, { hour: '2-digit', minute: '2-digit' });
    box.replaceChildren(
      h('h1', {}, t('main.title')),
      h('p', {}, t('main.intro')),
      h('h2', {}, t('main.unlocked')),
      list.length
        ? h('ul', {}, ...list.map(f => h('li', {},
          h('span', { class: 'name', title: f.name }, f.name),
          h('span', { class: 'when' }, t('main.since', { time: since(f.since) })),
          h('button', { type: 'button', onclick: () => vault.ask({ op: 'lock', files: [f.id] }) }, t('main.lock')))))
        : h('div', { class: 'empty' }, t('main.none')),
      list.length > 1 && h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => vault.ask({ op: 'lock' }) }, t('main.lockAll'))),
      h('h2', {}, t('settings.title')),
      h('div', { class: 'settings' },
        h('label', {}, t('settings.alg'), select(ALG_OPTIONS(), settings.alg, v => save({ alg: v }))),
        h('label', {}, t('settings.kdf'), select(KDF_OPTIONS(t), settings.kdf, v => save({ kdf: v }))),
        h('label', {}, t('settings.lockAfter'), select(LOCK_OPTIONS(t), settings.lockAfter, v => save({ lockAfter: Number(v) })))),
      h('p', { class: 'hint' }, t('main.limits')),
    );
  });
  vault.onStatus(next => { list = next; redraw(); });
  ({ status: list } = await vault.ask({ op: 'follow' }));
  redraw();
  return () => { off(); vault.close(); };
}

// ---------- Unlock (and remove the encryption) ----------

export async function unlock({ lilos, root, args }) {
  const t = (k, p) => lilos.locale.i18n.t(k, p);
  let file = null, mode = 'unlock', name = '', error = '';
  let vault = null;
  const take = a => {
    file = fileFromArgs(a);
    mode = a?.action === 'filecrypt.decrypt' ? 'decrypt' : 'unlock';
    error = '';
  };
  take(args);

  const { redraw, off } = frame(lilos, root, box => {
    if (!file) return box.replaceChildren(h('p', {}, t('unlock.noFile')));
    const password = h('input', { type: 'password', autocomplete: 'current-password', 'aria-describedby': 'fc-error', required: true });
    const message = h('div', { class: 'error', id: 'fc-error', role: 'alert' }, error);
    const send = async () => {
      if (go.disabled) return;
      if (!password.value) return password.focus();
      busy(go, true);
      try {
        await lilos.app.call('vault', { op: 'prepare', file });
        vault ??= await vaultChannel(lilos);
        await vault.ask({ op: mode, file, password: password.value });
        password.value = '';
        if (mode === 'unlock') await lilos.files.open(file);
        else {
          lilos.ui.toast(t('toast.decrypted', { name }));
          await recordStep(lilos, 'filecrypt.decrypt', { params: { file } });
        }
        lilos.window.close();
      } catch (err) {
        error = explain(t, err);
        message.textContent = error;
        password.value = '';
        busy(go, false);
        password.focus();
      }
    };
    const go = h('button', { type: 'button', class: 'primary', onclick: send }, t(mode === 'decrypt' ? 'decrypt.button' : 'unlock.button'));
    box.replaceChildren(
      h('h1', {}, t(mode === 'decrypt' ? 'decrypt.title' : 'unlock.title', { name })),
      h('p', {}, t(mode === 'decrypt' ? 'decrypt.intro' : 'unlock.intro')),
      form(send,
        h('label', {}, t('unlock.password'), password),
        message,
        h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => lilos.window.close() }, t('common.cancel')), go)),
    );
    password.focus();
  });
  const load = async () => {
    name = file ? (await lilos.files.info(file)).name : '';
    lilos.window.setTitle(t(mode === 'decrypt' ? 'decrypt.windowTitle' : 'unlock.windowTitle'));
    redraw();
  };
  // Asked again (another file, or the same one) while open
  const offLaunch = lilos.on('launch', a => { take(a); load(); });
  await load();
  return () => { off(); offLaunch(); vault?.close(); };
}

// ---------- Encrypt ----------

export async function encrypt({ lilos, root, args }) {
  const t = (k, p) => lilos.locale.i18n.t(k, p);
  let file = fileFromArgs(args);
  let name = '';
  let vault = null;
  const settings = await readSettings(lilos);
  const levels = () => ['', t('strength.weak'), t('strength.fair'), t('strength.good'), t('strength.strong')];

  const { redraw, off } = frame(lilos, root, box => {
    if (!file) return box.replaceChildren(h('p', {}, t('unlock.noFile')));
    const first = h('input', { type: 'password', autocomplete: 'new-password', required: true, 'aria-describedby': 'fc-strength' });
    const second = h('input', { type: 'password', autocomplete: 'new-password', required: true });
    const meter = h('div', { class: 'meter', 'aria-hidden': 'true', 'data-level': '0' }, h('span'), h('span'), h('span'), h('span'));
    const level = h('span', { class: 'hint', id: 'fc-strength', 'aria-live': 'polite' }, t('strength.short'));
    const alg = select(ALG_OPTIONS(), settings.alg);
    const kdf = select(KDF_OPTIONS(t), settings.kdf);
    const message = h('div', { class: 'error', role: 'alert' });
    first.addEventListener('input', () => {
      const s = strength(first.value);
      meter.dataset.level = String(s);
      level.textContent = s ? levels()[s] : t('strength.short');
    });
    const send = async () => {
      if (go.disabled) return;
      message.textContent = '';
      if (strength(first.value) === 0) { message.textContent = t('encrypt.tooShort'); return first.focus(); }
      if (first.value !== second.value) { message.textContent = t('encrypt.mismatch'); return second.focus(); }
      busy(go, true);
      go.textContent = t('encrypt.working');
      try {
        await lilos.app.call('vault', { op: 'prepare', file });
        vault ??= await vaultChannel(lilos);
        await vault.ask({ op: 'encrypt', file, password: first.value, alg: alg.value, kdf: kdf.value });
        first.value = second.value = '';
        lilos.ui.toast(t('toast.encrypted', { name }));
        await recordStep(lilos, 'filecrypt.encrypt', { params: { file, alg: alg.value, kdf: kdf.value }, defaults: { alg: settings.alg, kdf: settings.kdf } });
        lilos.window.close();
      } catch (err) {
        message.textContent = explain(t, err);
        busy(go, false);
        go.textContent = t('encrypt.button');
      }
    };
    const go = h('button', { type: 'button', class: 'primary', onclick: send }, t('encrypt.button'));
    const body = form(send,
    h('label', {}, t('encrypt.password'), first, meter, level),
    h('label', {}, t('encrypt.repeat'), second),
    h('details', {}, h('summary', {}, t('encrypt.advanced')), h('div', {},
      h('label', {}, t('settings.alg'), alg),
      h('label', {}, t('settings.kdf'), kdf))),
    h('div', { class: 'warn' }, t('encrypt.warning')),
    message,
    h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => lilos.window.close() }, t('common.cancel')), go));
    box.replaceChildren(h('h1', {}, t('encrypt.title', { name })), h('p', {}, t('encrypt.intro')), body);
    first.focus();
  });
  const load = async () => {
    name = file ? (await lilos.files.info(file)).name : '';
    lilos.window.setTitle(t('encrypt.windowTitle'));
    redraw();
  };
  const offLaunch = lilos.on('launch', a => { file = fileFromArgs(a) ?? file; load(); });
  await load();
  return () => { off(); offLaunch(); vault?.close(); };
}
