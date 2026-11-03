/**
 * The first start (and "add a server"): where lilOS runs, then for this computer the first
 * administrator, then the progress while the program installs and starts it. After a new
 * installation of the program over an earlier one (previous=1), first: use it or start from zero.
 */
const shell = window.lilosShell;
const params = new URLSearchParams(location.search);
const adding = params.get('add') === '1';
const previous = params.get('previous') === '1';
const $ = id => document.getElementById(id);
document.documentElement.lang = params.get('lang') || 'it';

const T = await shell.call('texts', 'welcome');
const tr = (key, vars = {}) => (T[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
for (const el of document.querySelectorAll('[data-t]')) el.textContent = tr(el.dataset.t);
document.querySelector('.steps').setAttribute('aria-label', tr('steps'));
if (adding) {
  $('where').closest('main').querySelector('h1').textContent = tr('addTitle');
  $('where').closest('main').querySelector('.head p').textContent = tr('addSubtitle');
}
if (previous) {
  document.querySelector('h1').textContent = tr('previousTitle');
  document.querySelector('.head p').textContent = tr('previousSubtitle');
}

let step = 'where';
let busy = false;

function show(name) {
  step = name;
  for (const id of ['previous', 'where', 'user', 'ready']) $(id).hidden = id !== name;
  document.querySelector('.steps').hidden = name === 'previous';
  const order = ['where', 'user', 'ready'];
  for (const li of document.querySelectorAll('.steps li')) {
    const i = order.indexOf(li.dataset.step);
    li.toggleAttribute('aria-current', li.dataset.step === name);
    if (li.dataset.step === name) li.setAttribute('aria-current', 'step');
    li.classList.toggle('done', i < order.indexOf(name));
  }
  $('back').hidden = name !== 'user';
  $('next').hidden = name === 'ready';
  $('next').textContent = name === 'user' ? tr('install') : name === 'previous' ? tr('continue') : tr('next');
  error(null);
}

function error(message) {
  $('error').hidden = !message;
  $('error').textContent = message ?? '';
}

const choice = () => document.querySelector('input[name=where]:checked')?.value ?? null;

function log(line) {
  const el = $('log');
  el.textContent += `${line}\n`;
  el.scrollTop = el.scrollHeight;
}

shell.on('progress', line => log(line));

const info = await shell.call('welcome.detect');
$('version').textContent = info.release ? tr('version', { version: info.release.version }) : '';
$('local-text').innerHTML = '';
$('local-text').append(tr('local.text'), ' ', Object.assign(document.createElement('code'), { textContent: info.dataDir }));
if (!info.runtime || info.localExists) {
  const local = $('choice-local');
  local.classList.add('off');
  local.querySelector('input').disabled = true;
  $('local-text').textContent = info.localExists ? tr('local.exists') : tr('local.noRuntime');
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
// The first choice that can be made is already chosen
document.querySelector('input[name=where]:not(:disabled)')?.click();

document.addEventListener('change', e => {
  if (e.target.name === 'previous') $('fresh-more').hidden = e.target.value !== 'fresh';
  if (e.target.name === 'where') {
    $('remote-more').hidden = choice() !== 'remote';
    if (choice() === 'remote') $('remote-url').focus();
  }
});
$('remote-more').hidden = choice() !== 'remote';

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
    error(String(err.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
    if (step === 'ready') show(previous ? 'previous' : choice() === 'local' ? 'user' : 'where');
  } finally {
    busy = false;
    $('next').disabled = false;
  }
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
  if (step === 'user') {
    const username = $('username').value.trim().toLowerCase();
    const password = $('password').value;
    if (!/^[a-z0-9._-]{2,32}$/.test(username)) return error(tr('error.username')), $('username').focus();
    if (password.length < 8) return error(tr('error.password')), $('password').focus();
    if (password !== $('password2').value) return error(tr('error.repeat')), $('password2').focus();
    $('log').textContent = '';
    return go(() => shell.call('welcome.local', { username, password }), tr('work.local'));
  }
});
$('back').addEventListener('click', () => show('where'));
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
show(previous ? 'previous' : 'where');
