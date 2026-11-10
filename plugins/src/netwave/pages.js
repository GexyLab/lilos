import { h, icon, fs } from '@lilos/sdk';
import { history } from './history.js';
import { t, i18n } from './i18n.js';

/**
 * NetWave's own pages, drawn by NetWave in the place of a web page (never by the engine): the start
 * page of a new tab, and what went wrong when a page could not be shown.
 */
const hostOf = url => { try { return new URL(url).host; } catch { return url; } };
const when = at => i18n.date(at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function startPage(w) {
  const input = h('input', { class: 'nw-start-input', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': t('address.placeholder'), placeholder: t('address.placeholder') });
  const form = h('form', { class: 'nw-start-search', onsubmit: e => { e.preventDefault(); w.go(input.value); } }, icon('search'), input);
  const parts = [
    h('div', { class: 'nw-start-logo' }, icon(w.private ? 'eyeOff' : 'globe')),
    h('h2', {}, w.private ? t('private.title') : t('start.title')),
  ];
  if (w.private) parts.push(h('p', { class: 'nw-start-note' }, t('private.text')));
  parts.push(form);
  if (w.engine === false) parts.push(h('p', { class: 'nw-start-warn' }, icon('warning'), t('engine.missingShort')));

  if (!w.private) {
    const frequent = history.frequent(8);
    if (frequent.length) {
      parts.push(h('div', { class: 'nw-start-tiles' }, ...frequent.map(f => h('button', { type: 'button', class: 'nw-tile', title: f.url, onclick: () => w.go(f.url) },
        h('span', { class: 'nw-tile-letter' }, (hostOf(f.url).replace(/^www\./, '')[0] ?? '?').toUpperCase()),
        h('span', { class: 'nw-tile-name' }, f.title || hostOf(f.url))))));
    }
    const sessions = history.sessions().slice(0, 4);
    const closed = history.closed().filter(c => c.kind === 'window').slice(0, 3);
    if (sessions.length || closed.length) {
      const rows = [
        ...sessions.map(s => h('button', { type: 'button', class: 'nw-start-row', onclick: () => reopenSession(w, s) },
          icon('workarea'), h('span', { class: 'nw-start-row-name' }, s.name), h('span', { class: 'nw-start-row-meta' }, t('start.sessionMeta', { n: s.tabs.length, when: when(s.at) })))),
        ...closed.map(c => h('button', { type: 'button', class: 'nw-start-row', onclick: () => w.reopenClosed(c.id) },
          icon('window'), h('span', { class: 'nw-start-row-name' }, t('start.closedWindow')), h('span', { class: 'nw-start-row-meta' }, t('start.sessionMeta', { n: c.tabs.length, when: when(c.at) })))),
      ];
      parts.push(h('div', { class: 'nw-start-list' }, h('h3', {}, t('start.recent')), ...rows));
    }
  }
  return h('div', { class: 'nw-start' }, ...parts);
}

/** Opens a session of history: from its file when it is still there, else as history keeps it. */
export function reopenSession(w, s) {
  if (s.file && fs.exists(s.file)) return w.openSessionFile(s.file);
  return w.openSnapshot(s);
}

const PROBLEMS = [
  [c => c === 'signedOut', 'signedOut'],
  [c => c === 'engine', 'engine'],
  [c => c === 'gone', 'gone'],
  [c => c === 'blocked' || c === -20 || c === -301, 'blocked'],
  [c => c === -105 || c === -137, 'notFound'],
  [c => c === -106, 'offline'],
  [c => c === -102 || c === -109 || c === -104, 'refused'],
  [c => c === -7 || c === -118, 'timeout'],
  [c => typeof c === 'number' && c <= -200 && c > -300, 'certificate'],
  [c => c === -310, 'redirects'],
];

export function problemPage(w, tab, kind = null) {
  if (kind === 'engine') {
    return h('div', { class: 'nw-problem' },
      h('div', { class: 'nw-problem-icon' }, icon('monitor')),
      h('h2', {}, t('engine.missingTitle')),
      h('p', {}, t('engine.missingText')),
      h('p', { class: 'nw-problem-url' }, tab.url),
      h('div', { class: 'nw-problem-actions' },
        h('button', { type: 'button', class: 'ctl-btn primary', onclick: () => window.open(tab.url, '_blank', 'noopener,noreferrer') }, icon('open'), t('engine.openOutside'))));
  }
  const code = tab.error?.code;
  const key = PROBLEMS.find(([test]) => test(code))?.[1] ?? 'generic';
  return h('div', { class: 'nw-problem' },
    h('div', { class: 'nw-problem-icon' }, icon(key === 'certificate' || key === 'blocked' ? 'shield' : 'warning')),
    h('h2', {}, t(`error.${key}.title`)),
    h('p', {}, t(`error.${key}.text`, { host: hostOf(tab.error?.url || tab.url) })),
    h('p', { class: 'nw-problem-url' }, tab.error?.url || tab.url),
    typeof code === 'number' || tab.error?.description ? h('p', { class: 'nw-problem-code' }, [tab.error?.description, typeof code === 'number' ? `(${code})` : ''].filter(Boolean).join(' ')) : null,
    h('div', { class: 'nw-problem-actions' },
      ...(tab.canBack ? [h('button', { type: 'button', class: 'ctl-btn', onclick: () => { tab.error = null; w.run('back'); } }, icon('arrowLeft'), t('nav.back'))] : []),
      ...(key === 'certificate' || key === 'blocked' ? [] : [h('button', { type: 'button', class: 'ctl-btn primary', onclick: () => w.run('reload') }, icon('restart'), t('error.retry'))])));
}
