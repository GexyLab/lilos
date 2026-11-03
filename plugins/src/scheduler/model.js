import { fs, schedule } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t, i18n } from './i18n.js';

/**
 * What the Scheduler's windows share: the kinds of action, an operation told in one line, times
 * as people say them, places in lilOS and in Rete.
 */
export const KINDS = [
  { type: 'notify', glyph: 'bell', where: 'kernel' },
  { type: 'service', glyph: 'gear', where: 'kernel' },
  { type: 'copy', glyph: 'transfer', where: 'kernel' },
  { type: 'command', glyph: 'terminal', where: 'kernel' },
  { type: 'web', glyph: 'globe', where: 'kernel' },
  { type: 'open', glyph: 'window', where: 'browser' },
  { type: 'automation', glyph: 'automation', where: 'browser' },
];
export const kindOf = type => KINDS.find(k => k.type === type) ?? KINDS[0];
export const STATES = ['ok', 'error', 'skipped', 'waiting', 'running', 'queued', 'cancelled'];
export const STATE_GLYPH = { ok: 'check', error: 'error', skipped: 'arrowRight', waiting: 'clock', running: 'play', queued: 'list', cancelled: 'x' };

/** The tz of this browser: new operations follow it. */
export const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** '~/Documenti' for a node ('root': the home), '' if it is gone. */
export const nodeLabel = id => (id === 'root' ? '~' : fs.tildePath(id) ?? '');

/** A folder as an operation keeps it: { home, label } or { mount, path, label }. */
export function placeOf(id) {
  if (fs.isRemote?.(id)) {
    const ref = fs.netRef(id);
    return { mount: ref.mount, path: ref.path || '/', label: nodeLabel(id) };
  }
  return { home: id === fs.root ? 'root' : id, label: nodeLabel(id) };
}

const appName = id => system.getApp(id)?.name ?? id;

/** One line about what an operation does. */
export function whatText(what, catalog = null) {
  switch (what?.type) {
    case 'notify': return t('what.notify', { text: what.text });
    case 'service': {
      const s = catalog?.services?.find(x => x.app === what.app && x.entry === what.entry);
      return t('what.service', { app: s?.name ?? appName(what.app), label: s?.label ?? what.entry });
    }
    case 'copy': return t(`what.copy.${what.mode}`, { from: what.from?.label || '?', to: what.to?.label || '?' });
    case 'command': {
      const line = String(what.lines ?? '').split('\n').find(l => l.trim() && !l.trim().startsWith('#'))?.trim() ?? '';
      return what.host ? t('what.commandSsh', { host: what.hostLabel || what.host, line }) : t('what.command', { line });
    }
    case 'web': return `${what.method} ${what.url}`;
    case 'open': return what.file !== undefined ? t('what.openFile', { file: what.label || nodeLabel(what.file) }) : t('what.openApp', { app: what.label || appName(what.app) });
    case 'automation': return t('what.automation', { file: what.label || nodeLabel(what.file) });
    default: return '';
  }
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** 'oggi 09:00', 'domani 02:00', 'ven 6 nov 18:00', '15 dic 2027 10:00'. */
export function when(ms) {
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms), now = new Date();
  const time = i18n.date(ms, { hour: '2-digit', minute: '2-digit' });
  const day = n => { const x = new Date(now); x.setDate(x.getDate() + n); return x; };
  if (sameDay(d, now)) return t('time.today', { time });
  if (sameDay(d, day(1))) return t('time.tomorrow', { time });
  if (sameDay(d, day(-1))) return t('time.yesterday', { time });
  const far = Math.abs(ms - Date.now()) > 300 * 86400_000;
  return `${i18n.date(ms, { weekday: 'short', day: 'numeric', month: 'short', ...(far && { year: 'numeric' }) })} ${time}`;
}

/** '4 min 12 s', '2 h 3 min'. */
export function duration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return t('dur.s', { s });
  const m = Math.floor(s / 60);
  if (m < 60) return t('dur.ms', { m, s: s % 60 });
  return t('dur.hm', { h: Math.floor(m / 60), m: m % 60 });
}

/** The rule in words, or why it cannot be told. */
export function ruleText(whenRule) {
  try { return schedule.describe(whenRule); } catch { return '—'; }
}

/** The next `n` times of an operation, from its next one. */
export function nextTimes(task, n = 5) {
  const out = [];
  let at = task.next;
  let left = task.when?.count ? task.when.count - (task.fired ?? 0) : Infinity;
  while (Number.isFinite(at) && out.length < n && left > 0) {
    out.push(at);
    left--;
    try { at = schedule.rules.nextAfter(task.when, at); } catch { break; }
  }
  return out;
}

/** 'YYYY-MM-DDTHH:mm' of now (+ minutes), on this browser's clock. */
export function localNow(plusMinutes = 0) {
  const d = new Date(Date.now() + plusMinutes * 60_000);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
