/**
 * Screens shown before lilOS starts (sign-in, license, start-up, messages), and the sign-in over a
 * running lilOS (locked, session expired). Plain DOM: the SDK cannot be imported yet (it reads the
 * user's data as soon as it loads), only its kernel client and styles.
 *
 * Every screen has two halves: on the left the lilOS panel (logo, headline or the time, connection
 * to the kernel, version), on the right what to do. Dark unless the user chose light with the
 * button at the top right (remembered in this browser).
 */
import { kernel } from '@lilos/sdk/kernel';
import { version } from '../../package.json';
import { markdown } from './markdown.js';
import { bootStrings } from './strings.js';

const i18n = bootStrings('lilos:bootScreens', { en: { strings: {
  'hero.title1': 'Your desktop.',
  'hero.title2': 'Wherever you are.',
  'hero.lead': 'Your lilOS windows, files and apps from any computer, just as you left them.',
  'hero.files': 'Your files in your home',
  'hero.workspaces': 'A workspace for every project',
  'hero.apps': 'Apps always up to date',
  'connection.checking': 'Connecting…',
  'connection.on': 'Connected to {host} · {ms} ms',
  'connection.onHost': 'Connected to {host}',
  'connection.off': 'Kernel unreachable',
  'theme.light': 'Light theme',
  'theme.dark': 'Dark theme',
  'password.show': 'Show password',
  'password.hide': 'Hide password',
  'password.caps': 'Caps Lock is on',
  seconds: '{n} s',
  'login.title': 'Sign in to lilOS',
  'login.text': 'Welcome back. Enter your details to continue.',
  'login.submit': 'Sign in',
  'login.username': 'User name',
  'login.password': 'Password',
  'login.remember': 'Stay signed in',
  'login.forgot': 'Forgot your password?',
  'login.noAccount': "No account yet? A lilOS administrator creates it.",
  'login.retryIn': 'Try again in {time}',
  'login.windowsStay': 'Your windows stay open',
  'login.pendingSaved': 'Pending changes are saved',
  'forgot.title': 'Forgotten password',
  'forgot.text': "A lilOS administrator changes passwords: ask them to choose a new one for your user name. It cannot be reset from here.",
  'forgot.back': 'Back to sign-in',
  'error.invalidCredentials': 'Incorrect user name or password',
  'error.rateLimited': 'Too many attempts: try again shortly',
  'error.unauthorized': 'Sign-in required',
  'error.offline': 'The lilOS kernel is not answering',
  'message.retryIn': 'Trying again in {time}',
  'license.document': 'License text',
  'license.remote': 'Text read from {source}.',
  'license.local': '{source} is not answering: this is the copy included in lilOS. When it can be reached again, lilOS will ask again if the text has changed.',
  'license.accept': 'Accept and continue',
  'license.heroTitle1': 'Welcome',
  'license.heroTitle2': 'to lilOS.',
  'license.heroLead': 'One last thing before you start: the license applies to this whole installation.',
  'license.heroAdmin': 'An administrator accepts it, once',
  'license.heroOfficial': 'The text comes from the official repository',
  'license.title': 'lilOS license',
  'license.text': 'Before using lilOS, read its license.',
  'license.agree': 'I have read and accept the license',
  'license.exit': 'Exit',
  'start.hello': 'Hi, {name}',
  'start.text': 'Getting your lilOS ready…',
} } });
const { t } = i18n;

/**
 * The text of a known error of signing in (the auth module answers in its own language), else the
 * message the error has.
 */
export function errorText(err) {
  const known = {
    invalid_credentials: 'error.invalidCredentials', rate_limited: 'error.rateLimited',
    unauthorized: 'error.unauthorized', offline: 'error.offline',
  }[err?.code];
  return known ? t(known) : String(err?.message ?? err);
}

/** A translated text with an element where its {placeholder} is (the word order is the language's). */
function withNode(key, name, node) {
  const mark = '\u0000';
  const [before, ...rest] = t(key, { [name]: mark }).split(mark);
  return [before || null, node, rest.join('') || null];
}

const THEME_KEY = 'lilos.boot.theme';
const REMEMBER_KEY = 'lilos.boot.remember';
const PING_EVERY = 15_000;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.filter(c => c != null && c !== false));
  return node;
}

const SVG = 'http://www.w3.org/2000/svg';
const ICONS = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
  eyeOff: 'M3 3l18 18M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.6A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a2.8 2.8 0 0 0 4.2 4.2',
  alert: 'M12 3.5 2.5 20h19L12 3.5zM12 10v4.5M12 17.2h.01',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  lock: 'M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 10.5V7.5a4 4 0 0 1 8 0v3',
  key: 'M8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  power: 'M12 3v8M7 6.3a7.5 7.5 0 1 0 10 0',
};

function svgIcon(name) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'boot-ico');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

// lilOS's logo (public/favicon.svg), white on the panel
function logo() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('d', 'M4 0h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4zm2 5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z');
  svg.append(path);
  return el('span', { class: 'boot-logo' }, svg);
}

// Browser storage may be blocked or empty: the screens work the same without it
function load(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* not remembered */ }
}

const savedTheme = () => (load(THEME_KEY) === 'light' ? 'light' : 'dark');

/** Whether the last sign-in asked to stay signed in (the default). */
export const rememberSignIn = () => load(REMEMBER_KEY) !== '0';

// ---------- The left panel ----------

const heroPoints = () => [t('hero.files'), t('hero.workspaces'), t('hero.apps')];

function heroText({ title = [t('hero.title1'), t('hero.title2')], lead = t('hero.lead'), points = heroPoints() } = {}) {
  return [
    el('h2', { class: 'boot-headline' }, ...title.flatMap((line, i) => (i ? [el('br'), line] : [line]))),
    el('p', { class: 'boot-lead' }, lead),
    points.length ? el('ul', { class: 'boot-points' }, ...points.map(p => el('li', {}, p))) : null,
  ];
}

/** The time and date, kept current while the screen is shown. */
function heroClock(points = []) {
  const time = el('div', { class: 'boot-clock' });
  const date = el('div', { class: 'boot-date' });
  const tick = () => {
    const now = new Date();
    time.textContent = i18n.date(now, { hour: '2-digit', minute: '2-digit' });
    date.textContent = i18n.date(now, { weekday: 'long', day: 'numeric', month: 'long' });
  };
  tick();
  const timer = setInterval(() => (time.isConnected ? tick() : clearInterval(timer)), 10_000);
  return [time, date, points.length ? el('ul', { class: 'boot-points' }, ...points.map(p => el('li', {}, p))) : null];
}

/** Whether the kernel answers, and how fast; asked again every few seconds while it is shown. */
function connection() {
  const label = el('span', {}, t('connection.checking'));
  const pill = el('span', { class: 'boot-pill', role: 'status' }, el('i', { 'aria-hidden': 'true' }), label);
  const ping = async () => {
    if (!pill.isConnected && pill.dataset.state) return;
    const start = performance.now();
    try {
      await kernel.request('GET', '/session');
      pill.dataset.state = 'on';
      label.textContent = t('connection.on', { host: location.host, ms: Math.max(1, Math.round(performance.now() - start)) });
    } catch (err) {
      pill.dataset.state = err.code === 'offline' ? 'off' : 'on';
      label.textContent = err.code === 'offline' ? t('connection.off') : t('connection.onHost', { host: location.host });
    }
    setTimeout(ping, PING_EVERY);
  };
  ping();
  return pill;
}

// ---------- The frame ----------

/**
 * Both halves into `root` (replaced) or, with `onto`, over it. `hero`: what the left panel shows
 * (elements); `side`: the right half's content. Returns { screen, side }.
 */
function frame(root, { hero, side, onto = null }) {
  const themeButton = el('button', { class: 'boot-tool', type: 'button' });
  const screen = el('div', { class: 'boot', 'data-theme': savedTheme() },
    el('aside', { class: 'boot-hero' },
      el('div', { class: 'boot-brand' }, logo(), 'lilOS'),
      el('div', { class: 'boot-hero-body' }, ...hero),
      el('div', { class: 'boot-hero-foot' }, connection(), el('span', { class: 'boot-sp' }), `lilOS ${version}`)),
    el('main', { class: 'boot-side' },
      el('div', { class: 'boot-tools' }, themeButton),
      el('div', { class: 'boot-form' }, ...side)));
  const showTheme = () => {
    const dark = screen.dataset.theme === 'dark';
    themeButton.replaceChildren(svgIcon(dark ? 'sun' : 'moon'));
    themeButton.title = dark ? t('theme.light') : t('theme.dark');
    themeButton.setAttribute('aria-label', themeButton.title);
  };
  themeButton.addEventListener('click', () => {
    screen.dataset.theme = screen.dataset.theme === 'dark' ? 'light' : 'dark';
    save(THEME_KEY, screen.dataset.theme);
    showTheme();
  });
  showTheme();
  if (onto) {
    screen.classList.add('overlay');
    onto.append(screen);
  } else {
    root.replaceChildren(screen);
  }
  return { screen, side: screen.querySelector('.boot-form') };
}

const heading = (title, text) => [el('h1', {}, title), text ? el('p', { class: 'boot-text' }, text) : null];

function errorBox() {
  const text = el('span');
  const box = el('div', { class: 'boot-error', role: 'alert', hidden: true }, svgIcon('alert'), text);
  return {
    box,
    show(message) {
      text.textContent = message;
      box.hidden = !message;
    },
  };
}

/** A password field with the button that shows it and the Caps Lock warning. */
function passwordField(attrs) {
  const input = el('input', { class: 'boot-input', type: 'password', ...attrs });
  const eye = el('button', { class: 'boot-eye', type: 'button', 'aria-pressed': 'false', title: t('password.show'), 'aria-label': t('password.show') }, svgIcon('eye'));
  const caps = el('span', { class: 'boot-caps', hidden: true }, svgIcon('alert'), t('password.caps'));
  eye.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', String(show));
    eye.title = show ? t('password.hide') : t('password.show');
    eye.setAttribute('aria-label', eye.title);
    eye.replaceChildren(svgIcon(show ? 'eyeOff' : 'eye'));
    input.focus();
  });
  const checkCaps = e => { if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock'); };
  input.addEventListener('keydown', checkCaps);
  input.addEventListener('keyup', checkCaps);
  input.addEventListener('blur', () => { caps.hidden = true; });
  return { input, caps, wrap: el('div', { class: 'boot-field-box' }, input, eye) };
}

function primaryButton(label, { type = 'button', arrow = true, glyph = null } = {}) {
  const text = el('span', {}, label);
  const button = el('button', { class: 'boot-go', type }, glyph ? svgIcon(glyph) : null, text, arrow ? svgIcon('arrow') : null);
  button.label = value => { text.textContent = value; };
  return button;
}

/** The two initials of a name, for the avatar (a photo instead when lilOS has one: --user-photo). */
const initials = name => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

// ---------- Screens ----------

/**
 * Sign-in form: resolves once `login(username, password, { remember })` succeeds; its errors are
 * shown, and after too many tries (error 'rate_limited' with retryAfter) the button counts down.
 * `onto`: an element to cover (signing in again over a running lilOS) instead of replacing root.
 * `username`: asks only the password of this user (`name`: shown with the avatar; the time on the
 * left). `other`: { label, onClick, lead } of a second action. `submit`: the button's label.
 * `opaque` is kept for the callers: every screen covers what is under it.
 */
export function loginScreen(root, login, {
  title = t('login.title'), text = t('login.text'),
  onto = null, username = null, name = null, other = null, submit: submitLabel = t('login.submit'),
} = {}) {
  return new Promise(resolve => {
    const user = el('input', { class: 'boot-input', type: 'text', name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true });
    const pass = passwordField({ name: 'password', autocomplete: 'current-password', required: true });
    const remember = el('input', { type: 'checkbox' });
    remember.checked = rememberSignIn();
    const error = errorBox();
    const submit = primaryButton(submitLabel, { type: 'submit', arrow: !username, glyph: username ? 'lock' : null });
    let waitTimer = null;

    const fields = username
      ? [el('input', { type: 'text', name: 'username', autocomplete: 'username', value: username, hidden: true, readonly: true }),
        el('label', { class: 'boot-field' }, el('span', {}, t('login.password')), pass.wrap, pass.caps)]
      : [el('label', { class: 'boot-field' }, el('span', {}, t('login.username')), user),
        el('label', { class: 'boot-field' }, el('span', {}, t('login.password')), pass.wrap, pass.caps),
        el('div', { class: 'boot-row' },
          el('label', { class: 'boot-check' }, remember, el('span', {}, t('login.remember'))),
          el('button', { class: 'boot-link', type: 'button', onclick: () => forgot() }, t('login.forgot')))];
    const form = el('form', { class: 'boot-fields', novalidate: true }, ...fields, submit);
    const sideContent = [
      username ? el('div', { class: 'boot-avatar', 'aria-hidden': 'true' }, initials(name ?? username)) : null,
      ...heading(title, text), error.box, form,
      other
        ? el('p', { class: 'boot-alt' }, other.lead ? `${other.lead} ` : null, el('button', { class: 'boot-link', type: 'button', onclick: other.onClick }, other.label))
        : username ? null : el('p', { class: 'boot-alt' }, t('login.noAccount')),
    ];
    const hero = username ? heroClock([t('login.windowsStay'), t('login.pendingSaved')]) : heroText();
    const { screen, side } = frame(root, { hero, side: sideContent, onto });

    const forgot = () => {
      const back = primaryButton(t('forgot.back'), { arrow: false });
      side.replaceChildren(
        el('div', { class: 'boot-avatar icon' }, svgIcon('key')),
        ...heading(t('forgot.title'), t('forgot.text')),
        back);
      back.addEventListener('click', () => {
        side.replaceChildren(...sideContent);
        user.focus();
      });
      back.focus();
    };

    const countdown = seconds => {
      clearInterval(waitTimer);
      const end = Date.now() + seconds * 1000;
      submit.disabled = true;
      const tick = () => {
        const left = Math.ceil((end - Date.now()) / 1000);
        if (left > 0 && screen.isConnected) return submit.label(t('login.retryIn', { time: t('seconds', { n: left }) }));
        clearInterval(waitTimer);
        submit.disabled = false;
        submit.label(submitLabel);
      };
      tick();
      waitTimer = setInterval(tick, 500);
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (submit.disabled) return;
      const name = username ?? user.value.trim();
      if (!name) return user.focus();
      if (!pass.input.value) return pass.input.focus();
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      error.show('');
      let wait = 0;
      try {
        if (!username) save(REMEMBER_KEY, remember.checked ? '1' : '0');
        await login(name, pass.input.value, { remember: username ? rememberSignIn() : remember.checked });
        clearInterval(waitTimer);
        if (onto) screen.remove();
        resolve();
        return;
      } catch (err) {
        error.show(errorText(err));
        if (err.code === 'rate_limited' && err.retryAfter) wait = err.retryAfter;
        pass.input.select();
      } finally {
        submit.removeAttribute('aria-busy');
      }
      if (wait) countdown(wait);
      else submit.disabled = false;
    });
    // Enter in the user name goes on to the password
    user.addEventListener('keydown', e => {
      if (e.key === 'Enter' && user.value.trim() && !pass.input.value) {
        e.preventDefault();
        pass.input.focus();
      }
    });
    (username ? pass.input : user).focus();
  });
}

/**
 * A message with buttons: resolves with the value of the button pressed. `tone: 'danger'` shows
 * the warning sign. `auto: { seconds, value }` resolves by itself with `value` when the seconds
 * are over, counting down under the text.
 */
export function messageScreen(root, { title, text, buttons, tone = null, auto = null }) {
  return new Promise(resolve => {
    let timer = null;
    const done = value => {
      clearInterval(timer);
      resolve(value);
    };
    const row = el('div', { class: 'boot-buttons' }, ...buttons.map(b => {
      const button = b.primary ? primaryButton(b.label) : el('button', { class: 'boot-second', type: 'button' }, b.label);
      button.addEventListener('click', () => done(b.value));
      return button;
    }));
    const left = el('b');
    const wait = auto ? el('div', { class: 'boot-note-box' }, el('span', { class: 'boot-spin', 'aria-hidden': 'true' }), el('span', {}, ...withNode('message.retryIn', 'time', left))) : null;
    frame(root, {
      hero: heroText(),
      side: [tone === 'danger' ? el('div', { class: 'boot-avatar icon danger' }, svgIcon('alert')) : null, ...heading(title, text), wait, row],
    });
    if (auto) {
      const end = Date.now() + auto.seconds * 1000;
      const tick = () => {
        const s = Math.ceil((end - Date.now()) / 1000);
        if (s <= 0) return done(auto.value);
        left.textContent = t('seconds', { n: s });
      };
      tick();
      timer = setInterval(tick, 250);
    }
    row.querySelector('.boot-go')?.focus();
  });
}

/**
 * The license of lilOS to accept (GET /api/license: { text, source, url }). `accept()` sends the
 * acceptance; its errors are shown. Resolves 'accepted', 'exit', or 'changed' (the text changed
 * meanwhile: read it again).
 */
export function licenseScreen(root, { text, source, url }, accept) {
  return new Promise(resolve => {
    const doc = el('div', { class: 'boot-license', tabindex: '0', role: 'document', 'aria-label': t('license.document') }, ...markdown(text));
    const from = el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url.replace(/^https?:\/\//, '').split('/').slice(0, 3).join('/'));
    const note = el('p', { class: 'boot-note' }, ...withNode(source === 'remote' ? 'license.remote' : 'license.local', 'source', from));
    const check = el('input', { type: 'checkbox' });
    const ok = primaryButton(t('license.accept'));
    ok.disabled = true;
    const error = errorBox();
    check.addEventListener('change', () => { ok.disabled = !check.checked; });
    ok.addEventListener('click', async () => {
      ok.disabled = true;
      ok.setAttribute('aria-busy', 'true');
      error.show('');
      try {
        await accept();
        resolve('accepted');
      } catch (err) {
        if (err.code === 'conflict') return resolve('changed');
        error.show(errorText(err));
        ok.disabled = !check.checked;
      } finally {
        ok.removeAttribute('aria-busy');
      }
    });
    const { screen } = frame(root, {
      hero: heroText({
        title: [t('license.heroTitle1'), t('license.heroTitle2')],
        lead: t('license.heroLead'),
        points: [t('license.heroAdmin'), t('license.heroOfficial')],
      }),
      side: [
        ...heading(t('license.title'), t('license.text')),
        doc, note,
        el('label', { class: 'boot-check' }, check, el('span', {}, t('license.agree'))),
        error.box, ok,
        el('p', { class: 'boot-alt' }, el('button', { class: 'boot-link', type: 'button', onclick: () => resolve('exit') }, t('license.exit'))),
      ],
    });
    screen.classList.add('wide');
    doc.focus();
  });
}

/** A message while something runs. */
export function progressScreen(root, title) {
  frame(root, { hero: heroText(), side: [el('h1', {}, title), el('div', { class: 'boot-spin big', 'aria-hidden': 'true' })] });
}

/**
 * The start-up after signing in: `steps` (labels) one under the other, ticked as they end.
 * Returns { step(i): the step i runs (those before it are done), done(): all done }.
 */
export function startScreen(root, { name, steps }) {
  const started = steps.map(() => 0);
  const rows = steps.map(label => el('li', { class: 'boot-step' }, el('span', { class: 'boot-step-mark', 'aria-hidden': 'true' }), el('span', {}, label), el('span', { class: 'boot-step-time' })));
  const bar = el('i');
  frame(root, {
    hero: heroText(),
    side: [
      el('div', { class: 'boot-avatar', 'aria-hidden': 'true' }, initials(name)),
      ...heading(t('start.hello', { name: String(name).split(/\s+/)[0] }), t('start.text')),
      el('div', { class: 'boot-bar', 'aria-hidden': 'true' }, bar),
      el('ol', { class: 'boot-steps', 'aria-live': 'polite' }, ...rows),
    ],
  });
  const show = current => {
    rows.forEach((row, i) => {
      const state = i < current ? 'done' : i === current ? 'now' : 'todo';
      if (row.dataset.state === 'now' && state === 'done') {
        const ms = performance.now() - started[i];
        row.lastChild.textContent = t('seconds', { n: i18n.number(ms / 1000, { maximumFractionDigits: 1 }) });
      }
      if (state === 'now' && row.dataset.state !== 'now') started[i] = performance.now();
      row.dataset.state = state;
      row.firstChild.replaceChildren(state === 'done' ? svgIcon('check') : '');
    });
    bar.style.width = `${Math.round((Math.min(current, rows.length) + 0.5) / (rows.length + 0.5) * 100)}%`;
  };
  show(0);
  return { step: show, done: () => show(rows.length) };
}
