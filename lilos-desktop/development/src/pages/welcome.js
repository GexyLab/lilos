/**
 * The first start (and "add a server"): where lilOS runs, then for this computer the first
 * administrator, then the progress while the program installs and starts it. After a new
 * installation of the program over an earlier one (previous=1), first: use it or start from zero.
 * «Senza UI» (noui) has four steps: where, the license (no page of lilOS will ask it later), the
 * administrator, ready; at the end lilOS's window does not open, the page says how to use lilos.
 * lilos-install.json can choose «Senza UI» with its administrator (fromFile): then only the license
 * is asked, or nothing when the file accepts it too (auto=1: straight to «Pronto»).
 */
const shell = window.lilosShell;
const params = new URLSearchParams(location.search);
const adding = params.get('add') === '1';
const previous = params.get('previous') === '1';
const auto = params.get('auto') === '1';
const $ = id => document.getElementById(id);
document.documentElement.lang = params.get('lang') || 'it';

const T = await shell.call('texts', 'welcome');
const tr = (key, vars = {}) => (T[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
for (const el of document.querySelectorAll('[data-t]')) el.textContent = tr(el.dataset.t);
document.querySelector('.steps').setAttribute('aria-label', tr('steps'));
$('license-text').setAttribute('aria-label', tr('license.title'));
if (adding) {
  $('where').closest('main').querySelector('h1').textContent = tr('addTitle');
  $('where').closest('main').querySelector('.head p').textContent = tr('addSubtitle');
}
if (previous) {
  document.querySelector('h1').textContent = tr('previousTitle');
  document.querySelector('.head p').textContent = tr('previousSubtitle');
}
const heading = [document.querySelector('h1').textContent, document.querySelector('.head p').textContent];

let step = 'where';
let busy = false;
/** «Senza UI» as lilos-install.json says, with its administrator: no «Dove», no administrator to type. */
let fromFile = false;
/** The license shown ({ text, source, page }), read once. */
let license = null;
let info = null;

const choice = () => document.querySelector('input[name=where]:checked')?.value ?? null;
const noUiMode = () => fromFile || choice() === 'noui';

/** The steps of the chosen way. */
function order() {
  if (fromFile) return info?.file?.acceptLicense ? ['ready'] : ['license', 'ready'];
  return noUiMode() ? ['where', 'license', 'user', 'ready'] : ['where', 'user', 'ready'];
}

function show(name) {
  step = name;
  for (const id of ['previous', 'where', 'license', 'user', 'ready']) $(id).hidden = id !== name;
  const steps = order();
  const list = document.querySelector('.steps');
  list.hidden = name === 'previous' || steps.length < 2;
  for (const li of list.querySelectorAll('li')) {
    const i = steps.indexOf(li.dataset.step);
    li.hidden = i < 0;
    li.querySelector('i').textContent = String(i + 1);
    if (li.dataset.step === name) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
    li.classList.toggle('done', i >= 0 && i < steps.indexOf(name));
  }
  $('step-user').textContent = tr(noUiMode() ? 'step.admin' : 'step.user');
  // The license has its own title over the page
  const [title, subtitle] = name === 'license' ? [tr('license.title'), tr('license.text')] : heading;
  document.querySelector('h1').textContent = title;
  document.querySelector('.head p').textContent = subtitle;
  $('back').hidden = !(name === 'user' || (name === 'license' && !fromFile));
  $('next').hidden = name === 'ready';
  $('next').textContent = name === 'user' || (name === 'license' && fromFile) ? tr('install') : name === 'previous' ? tr('continue') : tr('next');
  $('next').disabled = name === 'license' && !$('license-accept').checked;
  if (name === 'ready') {
    $('work-spinner').hidden = false;
    $('work-ok').hidden = true;
    $('noui-info').hidden = true;
  }
  $('close').hidden = $('terminal').hidden = true;
  if (name === 'license') loadLicense();
  error(null);
}

function error(message) {
  $('error').hidden = !message;
  $('error').textContent = message ?? '';
}

const cleanError = err => String(err.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function log(line) {
  const el = $('log');
  el.textContent += `${line}\n`;
  el.scrollTop = el.scrollHeight;
}

/** A text with `commands` between backticks: those become <code>. */
function withCode(el, text) {
  text.split('`').forEach((part, i) => el.append(i % 2 ? Object.assign(document.createElement('code'), { className: 'cmd', textContent: part }) : part));
  return el;
}

/**
 * Inline markdown of the license: **bold**, *italic*, `code`, [text](address) (only the text: the
 * page opens nothing, «Apri nel browser» does). Built as elements, never as HTML.
 */
function inline(el, text) {
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\([^)]*\)|\*([^*\s][^*]*)\*/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > at) el.append(text.slice(at, m.index));
    if (m[1] != null) el.append(inline(document.createElement('b'), m[1]));
    else if (m[2] != null) el.append(Object.assign(document.createElement('code'), { textContent: m[2] }));
    else if (m[3] != null) el.append(inline(document.createElement('u'), m[3]));
    else el.append(inline(document.createElement('i'), m[4]));
    at = m.index + m[0].length;
  }
  if (at < text.length) el.append(text.slice(at));
  return el;
}

/** The markdown of the license, simply: headings, paragraphs, lists, rules. */
function markdown(box, text) {
  box.replaceChildren();
  let list = null, para = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    let m;
    if (!line) { list = para = null; continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
      list = para = null;
      box.append(inline(document.createElement(m[1].length === 1 ? 'h2' : 'h3'), m[2]));
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      list = para = null;
      box.append(document.createElement('hr'));
    } else if ((m = /^(?:[-*+]|(\d+)[.)])\s+(.*)$/.exec(line))) {
      para = null;
      if (!list) box.append(list = document.createElement(m[1] ? 'ol' : 'ul'));
      list.append(inline(document.createElement('li'), m[2]));
    } else if (list && /^\s{2,}/.test(raw)) {
      list.lastChild.append(' ');
      inline(list.lastChild, line);
    } else {
      list = null;
      if (para) para.append(' ');
      else box.append(para = document.createElement('p'));
      inline(para, line);
    }
  }
}

async function loadLicense() {
  if (license) return;
  const box = $('license-text');
  box.textContent = tr('license.loading');
  $('license-source').textContent = '';
  $('license-dot').hidden = true;
  try {
    license = await shell.call('welcome.license');
    markdown(box, license.text);
    box.scrollTop = 0;
    $('license-source').textContent = tr(license.source === 'remote' ? 'license.remote' : 'license.bundled');
    $('license-dot').hidden = false;
    $('license-accept').disabled = false;
  } catch (err) {
    box.textContent = '';
    if (step === 'license') error(cleanError(err));
  }
}

shell.on('progress', line => log(line));

info = await shell.call('welcome.detect');
const platform = ['win32', 'darwin'].includes(info.platform) ? info.platform : 'linux';
$('version').textContent = info.release ? tr('version', { version: info.release.version }) : '';
$('local-text').innerHTML = '';
$('local-text').append(tr('local.text'), ' ', Object.assign(document.createElement('code'), { textContent: info.dataDir }));
if (!info.runtime || info.localExists) {
  const local = $('choice-local');
  local.classList.add('off');
  local.querySelector('input').disabled = true;
  $('local-text').textContent = info.localExists ? tr('local.exists') : tr('local.noRuntime');
}
withCode($('noui-text'), tr('noui.text'));
// Adding a server later is never lilOS without UI; nor a copy whose lilOS is too old for it
if (adding || !info.runtime || info.localExists || !info.noUi.ok) {
  const noui = $('choice-noui');
  noui.classList.add('off');
  noui.querySelector('input').disabled = true;
  $('noui-text').textContent = info.localExists ? tr('local.exists') : !info.runtime ? tr('local.noRuntime') : tr('noui.old', { version: info.noUi.version ?? '?', min: info.noUi.min });
  if (adding) noui.hidden = true;
}
for (const found of info.installed) {
  const label = document.createElement('label');
  label.className = 'choice';
  label.innerHTML = `<input type="radio" name="where" value="existing"><span class="ci found"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span><span class="body"><b><span></span> <em class="pill grey"></em></b><span class="text"></span></span>`;
  label.querySelector('input').dataset.url = found.url;
  label.querySelector('b span').textContent = tr('existing.title');
  label.querySelector('em').textContent = tr('existing.found');
  label.querySelector('.text').textContent = found.version
    ? tr('existing.textVersion', { version: found.version, dir: found.dir, url: found.url })
    : tr('existing.text', { url: found.url });
  $('installed').append(label);
}
// lilos-install.json chose «Senza UI»: chosen here too; else the first choice that can be made
const fileNoUi = !adding && !previous && info.file?.noUi && !$('choice-noui').querySelector('input').disabled;
(fileNoUi ? $('choice-noui').querySelector('input') : document.querySelector('input[name=where]:not(:disabled)'))?.click();
fromFile = !!(fileNoUi && info.file.admin);

const moreBoxes = () => {
  $('remote-more').hidden = choice() !== 'remote';
  $('noui-more').hidden = choice() !== 'noui';
};
document.addEventListener('change', e => {
  if (e.target.name === 'previous') $('fresh-more').hidden = e.target.value !== 'fresh';
  if (e.target.name === 'where') {
    moreBoxes();
    // The steps follow the choice (four for «Senza UI»)
    show('where');
    if (choice() === 'remote') $('remote-url').focus();
  }
  if (e.target.id === 'license-accept') $('next').disabled = !e.target.checked;
});
moreBoxes();

async function go(fn, title) {
  if (busy) return;
  busy = true;
  $('next').disabled = true;
  error(null);
  try {
    if (title) {
      show('ready');
      $('work-title').textContent = title;
    }
    await fn();
  } catch (err) {
    if (step === 'ready') {
      const back = previous ? 'previous' : fromFile ? (order()[0] === 'ready' ? null : 'license') : choice() === 'local' || choice() === 'noui' ? 'user' : 'where';
      if (back) show(back);
      else {
        // Installed by itself (auto): nothing to go back to, the same again
        $('work-spinner').hidden = true;
        $('next').hidden = false;
        $('next').textContent = tr('retry');
      }
    }
    // After show(), which clears the message
    error(cleanError(err));
  } finally {
    busy = false;
    $('next').disabled = false;
  }
}

/** «Pronto» of lilOS without UI: done, and how to use it. */
function readyNoUi(r) {
  $('work-spinner').hidden = true;
  $('work-ok').hidden = false;
  $('work-title').textContent = tr('noui.done');
  const box = $('noui-info');
  box.replaceChildren(withCode(document.createElement('p'), r.onPath ? tr(`noui.info.${platform}`) : tr('noui.infoNoPath', { command: r.command })));
  if (r.localBinMissing) box.append(withCode(document.createElement('p'), tr('noui.localBin', { command: r.launcher })));
  if (r.pathError) box.append(withCode(document.createElement('p'), tr('noui.pathFailed', { error: r.pathError, command: r.command })));
  box.hidden = false;
  $('next').hidden = $('back').hidden = true;
  $('close').hidden = $('terminal').hidden = false;
  $('terminal').focus();
}

function startNoUi(admin = {}) {
  $('log').textContent = '';
  const args = fromFile ? { fromFile: true } : { ...admin, autostart: $('noui-autostart').checked, path: $('noui-path').checked };
  return go(async () => readyNoUi(await shell.call('welcome.noui', args)), tr('work.noui'));
}

$('next').addEventListener('click', () => {
  if (step === 'previous') {
    if (document.querySelector('input[name=previous]:checked').value === 'keep') return go(() => shell.call('welcome.keep'), tr('work.keep'));
    const erase = $('fresh-erase').checked;
    if (erase && !confirm(tr('previous.fresh.confirm', { dir: before.local.dir }))) return;
    return go(() => shell.call('welcome.fresh', { erase }), tr('work.fresh'));
  }
  if (step === 'where') {
    const where = choice();
    if (where === 'local') return show('user'), $('username').focus();
    if (where === 'noui') return show('license');
    if (where === 'remote') {
      const url = $('remote-url').value.trim();
      if (!url) return error(tr('error.url')), $('remote-url').focus();
      return go(() => shell.call('welcome.remote', { url, trusted: $('remote-trusted').checked }), tr('work.remote'));
    }
    if (where === 'existing') {
      const url = document.querySelector('input[name=where]:checked').dataset.url;
      return go(() => shell.call('welcome.existing', { url }), tr('work.remote'));
    }
    return error(tr('error.choose'));
  }
  if (step === 'license') {
    if (!$('license-accept').checked) return error(tr('error.acceptLicense'));
    if (fromFile) return startNoUi();
    return show('user'), $('username').focus();
  }
  if (step === 'user') {
    const username = $('username').value.trim().toLowerCase();
    const password = $('password').value;
    if (!/^[a-z0-9._-]{2,32}$/.test(username)) return error(tr('error.username')), $('username').focus();
    if (password.length < 8) return error(tr('error.password')), $('password').focus();
    if (password !== $('password2').value) return error(tr('error.repeat')), $('password2').focus();
    if (noUiMode()) return startNoUi({ username, password });
    $('log').textContent = '';
    return go(() => shell.call('welcome.local', { username, password }), tr('work.local'));
  }
  // «Riprova» after lilOS without UI installed by itself failed
  if (step === 'ready' && fromFile) return startNoUi();
});
$('back').addEventListener('click', () => show(step === 'user' && noUiMode() ? 'license' : 'where'));
$('license-open').addEventListener('click', () => shell.call('welcome.licensePage'));
$('close').addEventListener('click', () => shell.call('welcome.close'));
$('terminal').addEventListener('click', () => shell.call('welcome.terminal'));
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.isComposing && e.target.tagName === 'INPUT') $('next').click();
});
// The earlier installation: its servers, and where the lilOS of this computer is
const before = previous ? await shell.call('welcome.previous') : null;
if (before) {
  const names = before.profiles.map(p => (p.kind === 'local' && before.local ? tr('previous.local', { name: p.name, version: before.local.version ?? '?', dir: before.local.dir }) : p.url ? `${p.name} (${p.url})` : p.name));
  $('previous-keep').textContent = tr('previous.keep.text', { servers: names.join(', ') });
  $('previous-fresh').textContent = before.local ? `${tr('previous.fresh.text')} ${tr('previous.fresh.local')}` : tr('previous.fresh.text');
  $('fresh-erase').closest('.check').hidden = !before.local;
}
if (previous) show('previous');
else if (fromFile && (auto || info.file.acceptLicense)) startNoUi();
else show(fromFile ? 'license' : 'where');
