/**
 * Screens shown before lilOS starts (sign-in, messages). Plain DOM: the SDK cannot be imported
 * yet (it reads the user's data as soon as it loads), only its kernel client and styles.
 */
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
 */
export function loginScreen(root, login, { title = 'Accedi a lilOS', text, onto = null } = {}) {
  return new Promise(resolve => {
    const user = el('input', { class: 'ctl-text', type: 'text', name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: '' });
    const pass = el('input', { class: 'ctl-text', type: 'password', name: 'password', autocomplete: 'current-password', required: '' });
    const error = el('p', { class: 'boot-error', role: 'alert' });
    const submit = el('button', { class: 'ctl-btn primary', type: 'submit' }, 'Accedi');
    const form = el('form', { class: 'boot-form' },
      el('label', {}, el('span', {}, 'Nome utente'), user),
      el('label', {}, el('span', {}, 'Password'), pass),
      error, submit);
    const host = onto ? el('div') : root;
    const { screen } = card(host, el('h1', {}, title), text ? el('p', { class: 'boot-text' }, text) : null, form);
    if (onto) {
      screen.classList.add('overlay');
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
    user.focus();
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

/** A message while something runs. */
export function progressScreen(root, title) {
  card(root, el('h1', {}, title), el('div', { class: 'boot-spinner', 'aria-hidden': 'true' }));
}
