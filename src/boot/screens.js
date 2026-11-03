/**
 * Screens shown before lilOS starts (sign-in, messages). Plain DOM: the SDK cannot be imported
 * yet (it reads the user's data as soon as it loads), only its kernel client and styles.
 */
import { markdown } from './markdown.js';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter(c => c != null));
  return node;
}

function card(root, ...children) {
  const box = el('div', { class: 'boot-card' }, el('img', { class: 'boot-logo', src: '/favicon.svg', alt: '' }), ...children);
  const screen = el('div', { class: 'boot' }, box);
  root.replaceChildren(screen);
  return { screen, box };
}

/**
 * Sign-in form: resolves once `login(username, password)` succeeds; its errors are shown.
 * `onto`: an element to cover (signing in again over a running lilOS) instead of replacing root.
 * `username`: asks only the password of this user. `other`: { label, onClick } of a second button.
 * `opaque`: what is under it does not show through.
 */
export function loginScreen(root, login, { title = 'Accedi a lilOS', text, onto = null, username = null, other = null, opaque = false } = {}) {
  return new Promise(resolve => {
    const user = el('input', { class: 'ctl-text', type: 'text', name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: '' });
    const pass = el('input', { class: 'ctl-text', type: 'password', name: 'password', autocomplete: 'current-password', required: '' });
    const error = el('p', { class: 'boot-error', role: 'alert' });
    const submit = el('button', { class: 'ctl-btn primary', type: 'submit' }, 'Accedi');
    const form = el('form', { class: 'boot-form' },
      el('label', {}, el('span', {}, 'Nome utente'), user),
      el('label', {}, el('span', {}, 'Password'), pass),
      error, submit,
      other ? el('button', { class: 'ctl-btn', type: 'button', onclick: other.onClick }, other.label) : null);
    const host = onto ? el('div') : root;
    const { screen } = card(host, el('h1', {}, title), text ? el('p', { class: 'boot-text' }, text) : null, form);
    if (onto) {
      screen.classList.add('overlay');
      screen.classList.toggle('opaque', opaque);
      onto.append(screen);
    }
    form.addEventListener('submit', async e => {
      e.preventDefault();
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      error.textContent = '';
      try {
        await login(user.value.trim(), pass.value);
        if (onto) screen.remove();
        resolve();
      } catch (err) {
        error.textContent = err.message;
        pass.select();
      } finally {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
      }
    });
    if (username) {
      user.value = username;
      user.readOnly = true;
      pass.focus();
    } else {
      user.focus();
    }
  });
}

/** A message with buttons: resolves with the value of the button pressed. */
export function messageScreen(root, { title, text, buttons }) {
  return new Promise(resolve => {
    const row = el('div', { class: 'boot-buttons' }, ...buttons.map(b =>
      el('button', { class: `ctl-btn${b.primary ? ' primary' : ''}`, type: 'button', onclick: () => resolve(b.value) }, b.label)));
    card(root, el('h1', {}, title), text ? el('p', { class: 'boot-text' }, text) : null, row);
    row.querySelector('.primary')?.focus();
  });
}

/**
 * The license of lilOS to accept (GET /api/license: { text, source, url }). `accept()` sends the
 * acceptance; its errors are shown. Resolves 'accepted', 'exit', or 'changed' (the text changed
 * meanwhile: read it again).
 */
export function licenseScreen(root, { text, source, url }, accept) {
  return new Promise(resolve => {
    const doc = el('div', { class: 'boot-license', tabindex: '0', role: 'document', 'aria-label': 'Testo della licenza' }, ...markdown(text));
    const from = el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url.replace(/^https?:\/\//, '').split('/').slice(0, 3).join('/'));
    const note = el('p', { class: 'boot-note' }, ...(source === 'remote'
      ? ['Testo letto da ', from, '.']
      : [from, ' non risponde: questa è la copia inclusa in lilOS. Quando torna raggiungibile, se il testo è cambiato, lilOS lo chiederà di nuovo.']));
    const check = el('input', { type: 'checkbox' });
    const ok = el('button', { class: 'ctl-btn primary', type: 'button', disabled: '' }, 'Accetta');
    const error = el('p', { class: 'boot-error', role: 'alert' });
    check.addEventListener('change', () => { ok.disabled = !check.checked; });
    ok.addEventListener('click', async () => {
      ok.disabled = true;
      ok.setAttribute('aria-busy', 'true');
      error.textContent = '';
      try {
        await accept();
        resolve('accepted');
      } catch (err) {
        if (err.code === 'conflict') return resolve('changed');
        error.textContent = err.message;
        ok.disabled = !check.checked;
      } finally {
        ok.removeAttribute('aria-busy');
      }
    });
    const { box } = card(root,
      el('h1', {}, 'Licenza di lilOS'),
      el('p', { class: 'boot-text' }, "Prima di usare lilOS, leggi la sua licenza d'uso: vale per tutta questa installazione."),
      doc, note,
      el('label', { class: 'boot-check' }, check, el('span', {}, 'Ho letto la licenza e la accetto')),
      error,
      el('div', { class: 'boot-buttons' },
        el('button', { class: 'ctl-btn', type: 'button', onclick: () => resolve('exit') }, 'Esci'),
        ok));
    box.classList.add('wide');
    doc.focus();
  });
}

/** A message while something runs. */
export function progressScreen(root, title) {
  card(root, el('h1', {}, title), el('div', { class: 'boot-spinner', 'aria-hidden': 'true' }));
}
