/**
 * Inside a lilOS window when lilOS is not there yet: the local one starting (with what it is
 * doing), or failed, or a server that does not answer, or the page that crashed.
 */
const shell = window.lilosShell;
const params = new URLSearchParams(location.search);
const profileId = params.get('profile');
let state = params.get('state');
const $ = id => document.getElementById(id);
document.documentElement.lang = params.get('lang') || 'it';

const T = await shell.call('texts', 'status');
const tr = (key, vars = {}) => (T[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
for (const el of document.querySelectorAll('[data-t]')) el.textContent = tr(el.dataset.t);

function render(info) {
  const local = info.profile?.kind === 'local';
  const name = info.profile?.url ?? '';
  $('spinner').hidden = state !== 'starting';
  $('title').textContent = tr(`${state}.title`);
  $('text').textContent = tr(`${state}.text`, { url: name });
  $('error').hidden = !(state === 'failed' && info.error);
  $('error').textContent = info.error ?? '';
  $('log').hidden = !local || !info.lines.length;
  $('actions').hidden = state === 'starting';
  $('logs').hidden = !local;
}

function log(line) {
  const el = $('log');
  el.hidden = false;
  el.textContent += `${line}\n`;
  el.scrollTop = el.scrollHeight;
}

const info = await shell.call('status.info', profileId);
$('log').textContent = info.lines.length ? `${info.lines.join('\n')}\n` : '';
render(info);

shell.on('progress', log);
shell.on('status', ({ status, error }) => {
  if (status === 'failed') {
    state = 'failed';
    render({ ...info, error, lines: [1] });
  }
});
$('retry').addEventListener('click', () => {
  state = 'starting';
  render({ ...info, error: null });
  shell.call('status.retry', profileId);
});
$('servers').addEventListener('click', () => shell.call('status.servers'));
$('logs').addEventListener('click', () => shell.call('status.logs'));
