/**
 * When the operations of the scheduler run: the rules, checked, worked out in a time zone, told in
 * words and as iCalendar RRULEs. It imports only its texts (strings.js, which needs nothing of the
 * page), so the same code runs in lilOS's page and in the kernel (the 'scheduler' module gets it
 * from the kernel).
 *
 * A rule (`when`), times as written on a clock of its time zone ('YYYY-MM-DDTHH:mm'):
 *
 *   { once: '2026-12-15T10:00', tz }                         one time
 *   { every: { n, unit }, start, tz, …the rest }             repeated; unit:
 *       'minute' | 'hour'      every n from `start`; between: ['09:00', '18:00'] counts them on each
 *                              day from the first time to the last instead; days: [1…7] only those days
 *       'day'                  every n days from `start`, at `times` (['08:00', '18:30'], default: the time of start)
 *       'week'                 every n weeks, on `days` (ISO: 1 Monday … 7 Sunday; default: the day of start), at `times`
 *       'month'                every n months, on `monthly`: { day: 1…31 | -1 (the last) } or
 *                              { nth: 1…5 | -1 (the last), weekday: 1…7 } (default: the day of start), at `times`
 *       'year'                 every n years, in `month` (1…12, default: the month of start), on `monthly`, at `times`
 *   { cron: '55 8 * * 1-5', start, tz }                      minute hour day month weekday; names (jan, mon),
 *                                                            lists, ranges, steps, 'L' (last day), '1#2' (second
 *                                                            Monday), '5L' (last Friday); 0 and 7 are Sunday
 *   and for all: end?: 'YYYY-MM-DD' (the last day, included), count?: how many times in all,
 *   skip?: [ms] times taken out, extra?: [ms] times added (an occurrence moved: one out, one in).
 *
 * Clocks and summer time: a time that does not exist (02:30 when the clocks go forward) runs when
 * they have gone forward (03:00); one that happens twice (when they go back) runs the first time.
 * Intervals of minutes and hours without `between` count real time (60 minutes are 60 minutes).
 *
 *   checkWhen(raw) → when                 throws RuleError with a message for people (in the
 *                                         system's language; in the kernel `text` may hold its Text)
 *   nextAfter(when, ms) → ms | null       the first time after `ms` (count not considered: the caller counts)
 *   between(when, from, to, limit) → [ms] the times in [from, to)
 *   gap(when) → ms                        the shortest time between two runs (to refuse rules too thick)
 *   toRrule(when) → { rrule, exdate, rdate } | null   rrule null when the rule has no exact RRULE
 *   describe(when, lang) → 'Every day at 02:00'   (in the language of lilOS's texts; lang: dates)
 *   toCron(when) → '0 2 * * *' | null     fromCron(text, base) → when | null   for the editor
 */
import { defineLater } from './strings.js';

export class RuleError extends Error {
  constructor(message) {
    super(String(message));
    // A translator that gives objects (the kernel's Texts): kept, to answer in the user's language
    if (message && typeof message === 'object') this.text = message;
  }
}

const S = defineLater('lilos:sdk.scheduleRules', {
  en: { strings: {
    'error.dateTime': 'Invalid date and time',
    'error.cron': 'Invalid cron expression',
    'error.cronFields': 'A cron expression has 5 fields: minute hour day month day-of-week',
    'error.cronField': 'Field {field} is not valid',
    'error.cronStep': 'Invalid step in field {field}',
    'error.cronValue': 'Invalid value “{value}” in field {field}',
    'error.cronRange': 'Reversed range in field {field}',
    'error.times': 'Invalid times',
    'error.exceptions': 'Invalid exceptions',
    'error.rule': 'Invalid rule',
    'error.zone': 'Unknown time zone',
    'error.kind': 'A rule is “once”, “repeat” or “cron”',
    'error.start': 'Invalid start date and time',
    'error.every': 'How often: invalid number or unit',
    'error.days': 'Invalid days of the week',
    'error.daysUnit': 'Days of the week apply to minutes, hours and weeks',
    'error.between': 'Invalid time range',
    'error.monthDay': 'Invalid day of the month',
    'error.month': 'Invalid month',
    'error.end': 'Invalid end date',
    'error.endBeforeStart': 'The end comes before the start',
    'error.count': 'Invalid number of times',
    'error.scope': 'scope must be this or all',
    'error.cronMove': 'A cron rule moves one time at a time',
    'error.betweenMidnight': 'The time range would go past midnight',
    'error.monthDayOut': 'The day of the month would fall outside the month',
    once: 'Once: {date} at {time}',
    timed: '{what} at {times}',
    at: 'at {times}',
    join: '{a}, {b}',
    'every.minute': { one: 'Every minute', other: 'Every {n} minutes' },
    'every.hour': { one: 'Every hour', other: 'Every {n} hours' },
    'every.day': { one: 'Every day', other: 'Every {n} days' },
    'every.week': { one: 'Every week', other: 'Every {n} weeks' },
    'every.month': { one: 'every month', other: 'every {n} months' },
    'every.year': { one: 'Every year', other: 'Every {n} years' },
    between: 'from {from} to {to}',
    'weekday.1': 'Monday', 'weekday.2': 'Tuesday', 'weekday.3': 'Wednesday', 'weekday.4': 'Thursday',
    'weekday.5': 'Friday', 'weekday.6': 'Saturday', 'weekday.7': 'Sunday',
    'days.list': 'on {days}',
    'days.weekdays': 'Monday to Friday',
    'days.weekend': 'on Saturday and Sunday',
    'days.all': 'every day',
    eachWeekday: 'Every {day}',
    workweek: 'Monday to Friday',
    monthDay: 'On day {day} of {period}',
    monthLast: 'On the last day of {period}',
    'nth.1': 'On the first {weekday} of {period}',
    'nth.2': 'On the second {weekday} of {period}',
    'nth.3': 'On the third {weekday} of {period}',
    'nth.4': 'On the fourth {weekday} of {period}',
    'nth.5': 'On the fifth {weekday} of {period}',
    'nth.last': 'On the last {weekday} of {period}',
    yearDay: '{every} on {date}',
    yearLast: '{every} on the last day of {month}',
    yearNth: '{every}: {what}',
    until: 'until {date}',
    count: { one: 'once', other: '{n} times' },
    cron: 'Cron: {cron}',
  } },
});
const { t } = S;

const UNITS = ['minute', 'hour', 'day', 'week', 'month', 'year'];
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;
const MAX_TIMES = 48;
const MAX_MARKS = 500;
const SEARCH_DAYS = 366 * 12;

const bad = (key, params) => { throw new RuleError(t(`error.${key}`, params)); };
const crons = new Map();
/** A cron expression parsed once (the rules are plain JSON: nothing is kept on them). */
const cronOf = text => {
  let c = crons.get(text);
  if (!c) {
    c = parseCron(text);
    if (crons.size > 500) crons.clear();
    crons.set(text, c);
  }
  return c;
};
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const pad = n => String(n).padStart(2, '0');

// ---------- Time zones ----------

const formats = new Map();
function formatter(tz) {
  let f = formats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    formats.set(tz, f);
  }
  return f;
}

export function validZone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try { formatter(tz); return true; } catch { return false; }
}

/** The clock of `tz` at the instant `ms`: { y, m, d, hh, mm, ss, wd } (wd: 1 Monday … 7 Sunday). */
export function clockAt(ms, tz) {
  const p = {};
  for (const { type, value } of formatter(tz).formatToParts(new Date(ms))) p[type] = Number(value);
  const wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() || 7;
  return { y: p.year, m: p.month, d: p.day, hh: p.hour % 24, mm: p.minute, ss: p.second, wd };
}

/** How far `tz` is ahead of UTC at the instant `ms`, in ms. */
function offsetAt(ms, tz) {
  const c = clockAt(ms, tz);
  return Date.UTC(c.y, c.m - 1, c.d, c.hh, c.mm, c.ss) - Math.floor(ms / 1000) * 1000;
}

/** The instant a clock of `tz` shows y-m-d hh:mm (see the summer time rules above). */
export function instantOf(y, m, d, hh, mm, tz) {
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const tries = [...new Set([offsetAt(naive - 12 * 3600_000, tz), offsetAt(naive + 12 * 3600_000, tz), offsetAt(naive, tz)])].map(o => naive - o);
  const valid = tries.filter(t => offsetAt(t, tz) === naive - t);
  if (valid.length) return Math.min(...valid);
  // In the gap: the instant the clocks went forward
  let lo = Math.min(...tries), hi = Math.max(...tries);
  const before = offsetAt(lo, tz);
  while (hi - lo > 60_000) {
    const mid = Math.floor((lo + hi) / 2 / 60_000) * 60_000;
    if (offsetAt(mid, tz) === before) lo = mid; else hi = mid;
  }
  return hi;
}

const parseLocal = text => {
  const m = LOCAL.exec(text ?? '');
  if (!m) return null;
  const [y, mo, d, hh, mm] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo) || hh > 23 || mm > 59) return null;
  return { y, m: mo, d, hh, mm };
};
const parseDate = text => {
  const m = DATE.exec(text ?? '');
  if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysIn(y, mo) ? { y, m: mo, d } : null;
};
const minutesOf = t => { const m = TIME.exec(t); return Number(m[1]) * 60 + Number(m[2]); };
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayNumber = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
const weekdayOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
const dateOfNumber = n => { const t = new Date(n * DAY_MS); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
/** 'YYYY-MM-DDTHH:mm' of an instant, on the clock of tz. */
export function localText(ms, tz) {
  const c = clockAt(ms, tz);
  if (!(c.y >= 1970 && c.y <= 9999)) bad('dateTime');
  return `${c.y}-${pad(c.m)}-${pad(c.d)}T${pad(c.hh)}:${pad(c.mm)}`;
}

// ---------- Cron ----------

const CRON_NAMES = {
  month: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  dow: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
};
const CRON_FIELDS = [
  { key: 'minute', min: 0, max: 59 }, { key: 'hour', min: 0, max: 23 }, { key: 'dom', min: 1, max: 31 },
  { key: 'month', min: 1, max: 12, names: CRON_NAMES.month, base: 1 }, { key: 'dow', min: 0, max: 7, names: CRON_NAMES.dow, base: 0 },
];

/** A cron expression → { minute: Set, hour: Set, dom: Set, month: Set, dow: Set, domAny, dowAny, lastDom, nth: [[wd, k]], lastDow: Set }. */
export function parseCron(text) {
  if (typeof text !== 'string' || text.length > 200) bad('cron');
  const parts = text.trim().toLowerCase().split(/\s+/);
  if (parts.length !== 5) bad('cronFields');
  const out = { lastDom: false, nth: [], lastDow: new Set() };
  CRON_FIELDS.forEach((f, i) => {
    const set = new Set();
    const field = parts[i];
    out[`${f.key}Any`] = field === '*' || field === '?';
    for (const item of field.split(',')) {
      if (!item) bad('cronField', { field: i + 1 });
      if (f.key === 'dom' && item === 'l') { out.lastDom = true; continue; }
      if (f.key === 'dow' && /^[0-7]l$/.test(item)) { out.lastDow.add(Number(item[0]) % 7); continue; }
      if (f.key === 'dow' && /^[0-7]#[1-5]$/.test(item)) { out.nth.push([Number(item[0]) % 7, Number(item[2])]); continue; }
      const [range, stepText] = item.split('/');
      const step = stepText === undefined ? 1 : Number(stepText);
      if (!Number.isInteger(step) || step < 1 || step > f.max) bad('cronStep', { field: i + 1 });
      const value = v => {
        const n = f.names?.indexOf(v);
        const x = n >= 0 ? n + f.base : /^\d+$/.test(v) ? Number(v) : NaN;
        if (!Number.isInteger(x) || x < f.min || x > f.max) bad('cronValue', { value: v, field: i + 1 });
        return x;
      };
      let lo, hi;
      if (range === '*' || range === '?') { lo = f.min; hi = f.key === 'dow' ? 6 : f.max; }
      else if (range.includes('-')) { [lo, hi] = range.split('-').map(value); if (hi < lo) bad('cronRange', { field: i + 1 }); }
      else { lo = value(range); hi = stepText === undefined ? lo : f.key === 'dow' ? 6 : f.max; }
      for (let x = lo; x <= hi; x += step) set.add(f.key === 'dow' ? x % 7 : x);
    }
    out[f.key] = set;
  });
  if (!out.minute.size || !out.hour.size) bad('cron');
  return out;
}

function cronDay(c, y, m, d) {
  if (!c.month.has(m)) return false;
  const wd = weekdayOf(y, m, d) % 7;
  const last = daysIn(y, m);
  const domHit = c.dom.has(d) || (c.lastDom && d === last);
  const dowHit = c.dow.has(wd) || c.nth.some(([w, k]) => w === wd && Math.ceil(d / 7) === k) || (c.lastDow.has(wd) && d + 7 > last);
  const domSet = !c.domAny || c.lastDom, dowSet = !c.dowAny || c.nth.length || c.lastDow.size;
  if (domSet && dowSet) return domHit || dowHit;
  if (domSet) return domHit;
  if (dowSet) return dowHit;
  return true;
}

// ---------- Checking ----------

const timeList = (v, fallback) => {
  if (v === undefined) return [fallback];
  if (!Array.isArray(v) || !v.length || v.length > MAX_TIMES || v.some(t => typeof t !== 'string' || !TIME.test(t))) bad('times');
  return [...new Set(v)].sort();
};
const marks = v => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > MAX_MARKS || v.some(t => !Number.isSafeInteger(t))) bad('exceptions');
  return [...new Set(v)].sort((a, b) => a - b);
};

/** A rule as saved: only what it may hold, checked. Throws RuleError. */
export function checkWhen(raw) {
  if (!plain(raw)) bad('rule');
  const tz = raw.tz ?? 'UTC';
  if (!validZone(tz)) bad('zone');
  const kinds = ['once', 'every', 'cron'].filter(k => raw[k] !== undefined);
  if (kinds.length !== 1) bad('kind');
  const out = { tz };
  if (raw.once !== undefined) {
    if (!parseLocal(raw.once)) bad('dateTime');
    out.once = raw.once;
  } else {
    const start = parseLocal(raw.start) ?? bad('start');
    out.start = raw.start;
    if (raw.cron !== undefined) {
      parseCron(raw.cron);
      out.cron = raw.cron.trim().replace(/\s+/g, ' ');
    } else {
      const e = raw.every;
      if (!plain(e) || !UNITS.includes(e.unit) || !int(e.n, 1, e.unit === 'minute' ? 1440 : e.unit === 'hour' ? 168 : e.unit === 'year' ? 10 : 366)) bad('every');
      out.every = { n: e.n, unit: e.unit };
      const startTime = `${pad(start.hh)}:${pad(start.mm)}`;
      if (raw.days !== undefined) {
        if (!Array.isArray(raw.days) || !raw.days.length || raw.days.some(d => !int(d, 1, 7))) bad('days');
        if (!['minute', 'hour', 'week'].includes(e.unit)) bad('daysUnit');
        out.days = [...new Set(raw.days)].sort();
      } else if (e.unit === 'week') out.days = [weekdayOf(start.y, start.m, start.d)];
      if (e.unit === 'minute' || e.unit === 'hour') {
        if (raw.between !== undefined) {
          const b = raw.between;
          if (!Array.isArray(b) || b.length !== 2 || b.some(t => typeof t !== 'string' || !TIME.test(t)) || minutesOf(b[1]) < minutesOf(b[0])) bad('between');
          out.between = [b[0], b[1]];
        }
      } else {
        out.times = timeList(raw.times, startTime);
      }
      if (e.unit === 'month' || e.unit === 'year') {
        const mo = raw.monthly ?? { day: start.d };
        if (plain(mo) && mo.day !== undefined && (int(mo.day, 1, 31) || mo.day === -1)) out.monthly = { day: mo.day };
        else if (plain(mo) && (int(mo.nth, 1, 5) || mo.nth === -1) && int(mo.weekday, 1, 7)) out.monthly = { nth: mo.nth, weekday: mo.weekday };
        else bad('monthDay');
      }
      if (e.unit === 'year') {
        if (raw.month !== undefined && !int(raw.month, 1, 12)) bad('month');
        out.month = raw.month ?? start.m;
      }
    }
    if (raw.end !== undefined && raw.end !== null) {
      const end = parseDate(raw.end) ?? bad('end');
      if (dayNumber(end.y, end.m, end.d) < dayNumber(start.y, start.m, start.d)) bad('endBeforeStart');
      out.end = raw.end;
    }
    if (raw.count !== undefined && raw.count !== null) {
      if (!int(raw.count, 1, 100_000)) bad('count');
      out.count = raw.count;
    }
  }
  const skip = marks(raw.skip), extra = marks(raw.extra);
  if (skip.length) out.skip = skip;
  if (extra.length) out.extra = extra;
  return out;
}

// ---------- Working it out ----------

const startMs = w => { const s = parseLocal(w.start); return instantOf(s.y, s.m, s.d, s.hh, s.mm, w.tz); };
const endMs = w => {
  if (!w.end) return Infinity;
  const e = parseDate(w.end);
  const next = dateOfNumber(dayNumber(e.y, e.m, e.d) + 1);
  return instantOf(next.y, next.m, next.d, 0, 0, w.tz);
};

/** The minutes of the day (sorted) at which the rule runs on y-m-d, ignoring start and end. */
function dayTimes(w, y, m, d) {
  const s = parseLocal(w.start);
  if (w.cron) {
    const c = cronOf(w.cron);
    if (!cronDay(c, y, m, d)) return [];
    const out = [];
    for (const hh of [...c.hour].sort((a, b) => a - b)) for (const mm of [...c.minute].sort((a, b) => a - b)) out.push(hh * 60 + mm);
    return out;
  }
  const { n, unit } = w.every;
  const day = dayNumber(y, m, d), first = dayNumber(s.y, s.m, s.d);
  const times = () => w.times.map(minutesOf);
  const monthly = () => {
    const mo = w.monthly, last = daysIn(y, m);
    if (mo.day !== undefined) return mo.day === -1 ? d === last : d === mo.day;
    if (weekdayOf(y, m, d) !== mo.weekday) return false;
    return mo.nth === -1 ? d + 7 > last : Math.ceil(d / 7) === mo.nth;
  };
  if (unit === 'minute' || unit === 'hour') {
    if (w.days && !w.days.includes(weekdayOf(y, m, d))) return [];
    const step = unit === 'minute' ? n : n * 60;
    const out = [];
    for (let t = minutesOf(w.between[0]); t <= minutesOf(w.between[1]); t += step) out.push(t);
    return out;
  }
  if (unit === 'day') return day >= first && (day - first) % n === 0 ? times() : [];
  if (unit === 'week') {
    if (!w.days.includes(weekdayOf(y, m, d))) return [];
    const monday = x => x - (((x + 3) % 7) + 7) % 7;
    const weeks = Math.round((monday(day) - monday(first)) / 7);
    return weeks >= 0 && weeks % n === 0 ? times() : [];
  }
  if (unit === 'month') {
    const months = (y * 12 + m) - (s.y * 12 + s.m);
    return months >= 0 && months % n === 0 && monthly() ? times() : [];
  }
  const years = y - s.y;
  return years >= 0 && years % n === 0 && m === w.month && monthly() ? times() : [];
}

/** The first time of the base rule (no skip, extra, end) strictly after `after`, from its start. */
function baseNext(w, after) {
  if (w.once) {
    const o = parseLocal(w.once);
    const at = instantOf(o.y, o.m, o.d, o.hh, o.mm, w.tz);
    return at > after ? at : null;
  }
  const begin = startMs(w);
  const from = Math.max(after, begin - 1);
  if ((w.every?.unit === 'minute' || w.every?.unit === 'hour') && !w.between) {
    const step = w.every.n * (w.every.unit === 'minute' ? 60_000 : 3600_000);
    let k = Math.max(0, Math.floor((from - begin) / step) + 1);
    for (let i = 0; i < 20_000; i++, k++) {
      const t = begin + k * step;
      if (!w.days || w.days.includes(clockAt(t, w.tz).wd)) return t;
    }
    return null;
  }
  const c = clockAt(from, w.tz);
  const today = dayNumber(c.y, c.m, c.d);
  for (let i = 0; i < SEARCH_DAYS; i++) {
    const { y, m, d } = dateOfNumber(today + i);
    const times = dayTimes(w, y, m, d);
    if (!times.length) continue;
    // A day with no clock change around it (almost every day): one offset for all its times, no
    // time-zone work per time (a cron of every minute is 1440 of them)
    const noon = Date.UTC(y, m - 1, d, 12);
    const offset = offsetAt(noon, w.tz);
    const flat = offsetAt(noon - 36 * 3600_000, w.tz) === offset && offsetAt(noon + 36 * 3600_000, w.tz) === offset;
    for (const t of times) {
      const at = flat ? Date.UTC(y, m - 1, d, Math.floor(t / 60), t % 60) - offset : instantOf(y, m, d, Math.floor(t / 60), t % 60, w.tz);
      if (at > from) return at;
    }
  }
  return null;
}

/** The first time after `after` (ms), skipped ones out, added ones in, within the end. */
export function nextAfter(when, after) {
  const w = when;
  const end = w.once ? Infinity : endMs(w);
  const skip = new Set(w.skip ?? []);
  let t = after;
  let base = null;
  for (let i = 0; i < 10_000; i++) {
    base = baseNext(w, t);
    if (base === null || base >= end || !skip.has(base)) break;
    t = base;
  }
  if (base !== null && base >= end) base = null;
  const extra = (w.extra ?? []).find(x => x > after && !skip.has(x)) ?? null;
  if (base === null) return extra;
  if (extra === null) return base;
  return Math.min(base, extra);
}

/** The times in [from, to), at most `limit`. */
export function between(when, from, to, limit = 1000) {
  const out = [];
  let t = from - 1;
  while (out.length < limit) {
    const next = nextAfter(when, t);
    if (next === null || next >= to) break;
    if (next !== out[out.length - 1]) out.push(next);
    t = next;
  }
  return out;
}

/** The shortest time between two runs (ms), looking at the first 200 from its start. Infinity for one time only. */
export function gap(when) {
  if (when.once) return Infinity;
  const { skip, extra, ...w } = when;
  if ((w.every?.unit === 'minute' || w.every?.unit === 'hour') && !w.between) return w.every.n * (w.every.unit === 'minute' ? 60_000 : 3600_000);
  const times = between(w, startMs(w), Infinity, 200);
  let least = Infinity;
  for (let i = 1; i < times.length; i++) least = Math.min(least, times[i] - times[i - 1]);
  return least;
}

/** The first time of the rule from its start (for the editor and the calendars). */
export const firstTime = when => nextAfter(when, when.once ? -Infinity : startMs(when) - 1);

// ---------- Moving an occurrence or the whole rule ----------

/**
 * The rule with one time moved: scope 'this' takes `at` out and puts `to` in; 'all' moves the rule
 * by the difference (start, the times of day, the day of the week or of the month follow). Throws
 * RuleError when the rule cannot move that way (a cron moves only one time).
 */
export function moveWhen(when, { at, to, scope }) {
  if (!Number.isSafeInteger(at) || !Number.isSafeInteger(to) || to < 0 || to > 253402300799000) bad('times');
  const w = { ...when };
  if (scope === 'this') {
    if (w.once) return checkWhen({ ...w, once: localText(to, w.tz) });
    if (w.extra?.includes(at)) w.extra = w.extra.filter(x => x !== at);
    else w.skip = [...(w.skip ?? []), at].sort((a, b) => a - b);
    if (to !== at) w.extra = [...new Set([...(w.extra ?? []), to])].sort((a, b) => a - b);
    return checkWhen(w);
  }
  if (scope !== 'all') bad('scope');
  if (w.once) return checkWhen({ ...w, once: localText(to, w.tz) });
  if (w.cron) bad('cronMove');
  const a = clockAt(at, w.tz), b = clockAt(to, w.tz);
  const minutes = (b.hh * 60 + b.mm) - (a.hh * 60 + a.mm);
  const days = dayNumber(b.y, b.m, b.d) - dayNumber(a.y, a.m, a.d);
  const shiftTime = t => {
    const x = ((minutesOf(t) + minutes) % 1440 + 1440) % 1440;
    return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
  };
  const s = parseLocal(w.start);
  const moved = dateOfNumber(dayNumber(s.y, s.m, s.d) + days);
  const startMin = s.hh * 60 + s.mm + minutes;
  const extraDays = Math.floor(startMin / 1440);
  const sm = ((startMin % 1440) + 1440) % 1440;
  const sd = dateOfNumber(dayNumber(moved.y, moved.m, moved.d) + extraDays);
  w.start = `${sd.y}-${pad(sd.m)}-${pad(sd.d)}T${pad(Math.floor(sm / 60))}:${pad(sm % 60)}`;
  if (w.times) w.times = [...new Set(w.times.map(shiftTime))].sort();
  if (w.between) {
    const [x, y] = w.between.map(shiftTime);
    if (minutesOf(y) < minutesOf(x)) bad('betweenMidnight');
    w.between = [x, y];
  }
  const dayShift = days + Math.floor(((a.hh * 60 + a.mm) + minutes) / 1440);
  if (w.days && dayShift % 7) w.days = [...new Set(w.days.map(d => ((d - 1 + dayShift) % 7 + 7) % 7 + 1))].sort();
  if (w.monthly?.day > 0 && dayShift) {
    const nd = w.monthly.day + dayShift;
    if (nd < 1 || nd > 31) bad('monthDayOut');
    w.monthly = { day: nd };
  }
  if (w.monthly?.weekday && dayShift % 7) w.monthly = { ...w.monthly, weekday: ((w.monthly.weekday - 1 + dayShift) % 7 + 7) % 7 + 1 };
  if (w.month && b.m !== a.m) w.month = b.m;
  delete w.skip;
  delete w.extra;
  return checkWhen(w);
}

// ---------- iCalendar ----------

const ICAL_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const icalTime = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** BYHOUR/BYMINUTE for a set of minutes of the day, when it is exactly their product; else null. */
function byClock(minutes) {
  const hours = [...new Set(minutes.map(t => Math.floor(t / 60)))].sort((a, b) => a - b);
  const mins = [...new Set(minutes.map(t => t % 60))].sort((a, b) => a - b);
  if (hours.length * mins.length !== new Set(minutes).size) return null;
  return `BYHOUR=${hours.join(',')};BYMINUTE=${mins.join(',')}`;
}

/**
 * The rule as iCalendar (RFC 5545) parts, to be used with DTSTART (its first time, TZID: tz):
 * { rrule: 'FREQ=DAILY;BYHOUR=2;BYMINUTE=0' | null, exdate: [ms], rdate: [ms] }. rrule is null for
 * one time only and for rules an RRULE does not say exactly (the times then come one by one).
 */
export function toRrule(when) {
  const w = when;
  const tail = [];
  if (w.end) tail.push(`UNTIL=${icalTime(endMs(w) - 1000)}`);
  if (w.count) tail.push(`COUNT=${w.count}`);
  const out = { rrule: null, exdate: w.skip ?? [], rdate: w.extra ?? [] };
  if (w.once) return out;
  let rule = null;
  const days = w.days?.map(d => ICAL_DAYS[d - 1]).join(',');
  if (w.every) {
    const { n, unit } = w.every;
    const iv = n > 1 ? `;INTERVAL=${n}` : '';
    const clock = w.times ? byClock(w.times.map(minutesOf)) : null;
    const monthly = mo => (mo.day !== undefined ? `BYMONTHDAY=${mo.day}` : `BYDAY=${mo.nth}${ICAL_DAYS[mo.weekday - 1]}`);
    if ((unit === 'minute' || unit === 'hour') && !w.between) rule = `FREQ=${unit === 'minute' ? 'MINUTELY' : 'HOURLY'}${iv}${days ? `;BYDAY=${days}` : ''}`;
    else if (unit === 'minute' || unit === 'hour') {
      const c = byClock(dayTimes({ ...w, days: undefined }, 2000, 1, 3));
      rule = c && `FREQ=${days ? 'WEEKLY' : 'DAILY'}${days ? `;BYDAY=${days}` : ''};${c}`;
    } else if (clock) {
      if (unit === 'day') rule = `FREQ=DAILY${iv};${clock}`;
      if (unit === 'week') rule = `FREQ=WEEKLY${iv};WKST=MO;BYDAY=${days};${clock}`;
      if (unit === 'month') rule = `FREQ=MONTHLY${iv};${monthly(w.monthly)};${clock}`;
      if (unit === 'year') rule = `FREQ=YEARLY${iv};BYMONTH=${w.month};${monthly(w.monthly)};${clock}`;
    }
  } else {
    const c = cronOf(w.cron);
    const minutes = [];
    for (const hh of c.hour) for (const mm of c.minute) minutes.push(hh * 60 + mm);
    const clock = byClock(minutes);
    const plainDays = !c.nth.length && !c.lastDow.size;
    if (clock && plainDays) {
      const dow = [...c.dow].map(d => ICAL_DAYS[(d + 6) % 7]).join(',');
      const months = c.monthAny ? '' : `;BYMONTH=${[...c.month].sort((a, b) => a - b).join(',')}`;
      const doms = [...c.dom].sort((a, b) => a - b).concat(c.lastDom ? [-1] : []).join(',');
      if (c.domAny && !c.lastDom) rule = c.dowAny ? `FREQ=DAILY${months};${clock}` : `FREQ=WEEKLY;BYDAY=${dow}${months};${clock}`;
      else if (c.dowAny) rule = `FREQ=${months ? 'YEARLY' : 'MONTHLY'}${months};BYMONTHDAY=${doms};${clock}`;
    }
  }
  if (rule) out.rrule = [rule, ...tail].join(';');
  return out;
}

// ---------- For the editor ----------

/** The rule as cron, when it is one cron can say (start, end and count aside); else null. */
export function toCron(when) {
  const w = when.every ? when : null;
  if (when.cron) return when.cron;
  if (!w) return null;
  const { n, unit } = w.every;
  const dow = w.days ? w.days.map(d => d % 7).join(',') : '*';
  const clock = list => {
    const ms = list.map(minutesOf);
    const hours = [...new Set(ms.map(t => Math.floor(t / 60)))], mins = [...new Set(ms.map(t => t % 60))];
    return hours.length * mins.length === new Set(ms).size ? `${mins.join(',')} ${hours.join(',')}` : null;
  };
  if (unit === 'minute' && w.between && 60 % n === 0) {
    const [a, b] = w.between.map(minutesOf);
    if (a % 60 === 0 && b % 60 === 60 - n) return `*/${n} ${a / 60}-${(b - b % 60) / 60} * * ${dow}`;
    return null;
  }
  if (unit === 'minute' && !w.between && 60 % n === 0 && startMinuteAligned(w, n)) return `*/${n} * * * ${dow}`;
  if (unit === 'hour' && n === 1 && !w.between) return `${parseLocal(w.start).mm} * * * ${dow}`;
  if (unit === 'hour' && w.between && 24 % n === 0) {
    const [a, b] = w.between.map(minutesOf);
    if (a % 60 !== b % 60) return null;
    return `${a % 60} ${a / 60 | 0}-${b / 60 | 0}/${n} * * ${dow}`;
  }
  const c = w.times && clock(w.times);
  if (!c || n !== 1) return null;
  if (unit === 'day') return `${c} * * *`;
  if (unit === 'week') return `${c} * * ${dow}`;
  if (unit === 'month' && w.monthly.day !== undefined) return `${c} ${w.monthly.day === -1 ? 'L' : w.monthly.day} * *`;
  if (unit === 'month') return `${c} * * ${w.monthly.weekday % 7}${w.monthly.nth === -1 ? 'L' : `#${w.monthly.nth}`}`;
  if (unit === 'year' && w.monthly.day !== undefined) return `${c} ${w.monthly.day === -1 ? 'L' : w.monthly.day} ${w.month} *`;
  return null;
}
const startMinuteAligned = (w, n) => parseLocal(w.start).mm % n === 0;

/**
 * A cron expression as a «Ripeti» rule, when there is one that says the same (for the editor:
 * switching from Avanzato back to Ripeti); `base` gives start and tz. Else null.
 */
export function fromCron(text, base) {
  let c;
  try { c = parseCron(text); } catch { return null; }
  if (c.nth.length || c.lastDow.size || !c.monthAny) return null;
  const minutes = [...c.minute].sort((a, b) => a - b), hours = [...c.hour].sort((a, b) => a - b);
  const times = [];
  for (const hh of hours) for (const mm of minutes) times.push(`${pad(hh)}:${pad(mm)}`);
  if (times.length > MAX_TIMES) return null;
  const days = c.dowAny ? null : [...new Set([...c.dow].map(d => d || 7))].sort();
  const w = { tz: base.tz, start: base.start };
  if ((c.domAny && !c.lastDom) && c.dowAny) Object.assign(w, { every: { n: 1, unit: 'day' }, times });
  else if (c.domAny && !c.lastDom) Object.assign(w, { every: { n: 1, unit: 'week' }, days, times });
  else if (c.dowAny && (c.dom.size === 1 || (c.lastDom && !c.dom.size))) Object.assign(w, { every: { n: 1, unit: 'month' }, monthly: { day: c.lastDom ? -1 : [...c.dom][0] }, times });
  else return null;
  try { return checkWhen(w); } catch { return null; }
}

// ---------- In words ----------

/** Items as a list in the language of the texts ('08:00, 12:00 and 18:30'). */
const list = items => {
  try { return new Intl.ListFormat(S.lang, { style: 'long', type: 'conjunction' }).format(items); } catch { return items.join(', '); }
};
const join = parts => parts.filter(Boolean).reduce((a, b) => t('join', { a, b }));
const intlTag = tag => { try { return Intl.getCanonicalLocales(tag)[0] ?? 'en'; } catch { return 'en'; } };

/**
 * The rule in words, in the language of lilOS's texts (the language pack in use, else English).
 * lang ('it-IT'): the locale of dates and month names, when it is that same language.
 */
export function describe(when, lang = 'en') {
  const words = intlTag(S.lang);
  const code = intlTag(lang).split('-')[0] === words.split('-')[0] ? intlTag(lang) : words;
  const dateFmt = (y, m, d, opts) => new Intl.DateTimeFormat(code, { timeZone: 'UTC', ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
  const weekday = d => t(`weekday.${d}`);
  if (when.once) {
    const o = parseLocal(when.once);
    return t('once', { date: dateFmt(o.y, o.m, o.d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), time: `${pad(o.hh)}:${pad(o.mm)}` });
  }
  let w = when;
  if (w.cron) {
    const like = fromCron(w.cron, { tz: w.tz, start: w.start });
    if (!like) return t('cron', { cron: w.cron });
    w = { ...like, end: when.end, count: when.count };
  }
  const { n, unit } = w.every;
  const everyText = t(`every.${unit}`, { n });
  const times = w.times ? list(w.times) : '';
  const timed = what => (times ? t('timed', { what, times }) : what);
  const daysText = ds => {
    if (!ds) return '';
    if (ds.length === 7) return t('days.all');
    if (ds.join() === '1,2,3,4,5') return t('days.weekdays');
    if (ds.join() === '6,7') return t('days.weekend');
    return t('days.list', { days: list(ds.map(weekday)) });
  };
  const nth = (mo, period) => t(mo.nth === -1 ? 'nth.last' : `nth.${mo.nth}`, { weekday: weekday(mo.weekday), period });
  let text;
  if (unit === 'minute' || unit === 'hour') {
    text = join([everyText, w.between && t('between', { from: w.between[0], to: w.between[1] }), w.days && daysText(w.days)]);
  } else if (unit === 'day') {
    text = timed(everyText);
  } else if (unit === 'week') {
    if (n === 1 && w.days.length === 7) text = timed(t('every.day', { n: 1 }));
    else if (n === 1 && w.days.join() === '1,2,3,4,5') text = timed(t('workweek'));
    else if (n === 1 && w.days.length === 1) text = timed(t('eachWeekday', { day: weekday(w.days[0]) }));
    else text = join([everyText, daysText(w.days), times && t('at', { times })]);
  } else if (unit === 'month') {
    const mo = w.monthly;
    const period = t('every.month', { n });
    text = timed(mo.day === -1 ? t('monthLast', { period }) : mo.day !== undefined ? t('monthDay', { day: mo.day, period }) : nth(mo, period));
  } else {
    const mo = w.monthly;
    const month = dateFmt(2000, w.month, 1, { month: 'long' });
    if (mo.day === -1) text = timed(t('yearLast', { every: everyText, month }));
    else if (mo.day !== undefined) text = timed(t('yearDay', { every: everyText, date: dateFmt(2000, w.month, mo.day, { day: 'numeric', month: 'long' }) }));
    else text = timed(t('yearNth', { every: everyText, what: nth(mo, month) }));
  }
  const tail = [];
  if (w.end) { const e = parseDate(w.end); tail.push(t('until', { date: dateFmt(e.y, e.m, e.d, { day: 'numeric', month: 'long', year: 'numeric' }) })); }
  if (w.count) tail.push(t('count', { n: w.count }));
  return join([text.trim(), ...tail]);
}
