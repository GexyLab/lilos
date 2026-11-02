/**
 * When the operations of the scheduler run: the rules, checked, worked out in a time zone, told in
 * words and as iCalendar RRULEs. No imports, so the same code runs in lilOS's page, in the
 * kernel (the 'scheduler' module gets it from the kernel) and in the apps' sandboxes.
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
 *   checkWhen(raw) → when                 throws RuleError with a message for people
 *   nextAfter(when, ms) → ms | null       the first time after `ms` (count not considered: the caller counts)
 *   between(when, from, to, limit) → [ms] the times in [from, to)
 *   gap(when) → ms                        the shortest time between two runs (to refuse rules too thick)
 *   toRrule(when) → { rrule, exdate, rdate } | null   rrule null when the rule has no exact RRULE
 *   describe(when, lang) → 'Ogni giorno alle 02:00'
 *   toCron(when) → '0 2 * * *' | null     fromCron(text, base) → when | null   for the editor
 */
export class RuleError extends Error {}

const UNITS = ['minute', 'hour', 'day', 'week', 'month', 'year'];
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;
const MAX_TIMES = 48;
const MAX_MARKS = 500;
const SEARCH_DAYS = 366 * 12;

const bad = message => { throw new RuleError(message); };
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
  if (typeof text !== 'string' || text.length > 200) bad('Espressione cron non valida');
  const parts = text.trim().toLowerCase().split(/\s+/);
  if (parts.length !== 5) bad('Un’espressione cron ha 5 campi: minuto ora giorno mese giorno-della-settimana');
  const out = { lastDom: false, nth: [], lastDow: new Set() };
  CRON_FIELDS.forEach((f, i) => {
    const set = new Set();
    const field = parts[i];
    out[`${f.key}Any`] = field === '*' || field === '?';
    for (const item of field.split(',')) {
      if (!item) bad(`Campo ${i + 1} non valido`);
      if (f.key === 'dom' && item === 'l') { out.lastDom = true; continue; }
      if (f.key === 'dow' && /^[0-7]l$/.test(item)) { out.lastDow.add(Number(item[0]) % 7); continue; }
      if (f.key === 'dow' && /^[0-7]#[1-5]$/.test(item)) { out.nth.push([Number(item[0]) % 7, Number(item[2])]); continue; }
      const [range, stepText] = item.split('/');
      const step = stepText === undefined ? 1 : Number(stepText);
      if (!Number.isInteger(step) || step < 1 || step > f.max) bad(`Passo non valido nel campo ${i + 1}`);
      const value = v => {
        const n = f.names?.indexOf(v);
        const x = n >= 0 ? n + f.base : /^\d+$/.test(v) ? Number(v) : NaN;
        if (!Number.isInteger(x) || x < f.min || x > f.max) bad(`Valore «${v}» non valido nel campo ${i + 1}`);
        return x;
      };
      let lo, hi;
      if (range === '*' || range === '?') { lo = f.min; hi = f.key === 'dow' ? 6 : f.max; }
      else if (range.includes('-')) { [lo, hi] = range.split('-').map(value); if (hi < lo) bad(`Intervallo al contrario nel campo ${i + 1}`); }
      else { lo = value(range); hi = stepText === undefined ? lo : f.key === 'dow' ? 6 : f.max; }
      for (let x = lo; x <= hi; x += step) set.add(f.key === 'dow' ? x % 7 : x);
    }
    out[f.key] = set;
  });
  if (!out.minute.size || !out.hour.size) bad('Espressione cron non valida');
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
  if (!Array.isArray(v) || !v.length || v.length > MAX_TIMES || v.some(t => typeof t !== 'string' || !TIME.test(t))) bad('Orari non validi');
  return [...new Set(v)].sort();
};
const marks = v => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > MAX_MARKS || v.some(t => !Number.isSafeInteger(t))) bad('Eccezioni non valide');
  return [...new Set(v)].sort((a, b) => a - b);
};

/** A rule as saved: only what it may hold, checked. Throws RuleError. */
export function checkWhen(raw) {
  if (!plain(raw)) bad('Regola non valida');
  const tz = raw.tz ?? 'UTC';
  if (!validZone(tz)) bad('Fuso orario sconosciuto');
  const kinds = ['once', 'every', 'cron'].filter(k => raw[k] !== undefined);
  if (kinds.length !== 1) bad('Una regola è «una volta», «ripeti» o «cron»');
  const out = { tz };
  if (raw.once !== undefined) {
    if (!parseLocal(raw.once)) bad('Data e ora non valide');
    out.once = raw.once;
  } else {
    const start = parseLocal(raw.start) ?? bad('Data e ora d’inizio non valide');
    out.start = raw.start;
    if (raw.cron !== undefined) {
      parseCron(raw.cron);
      out.cron = raw.cron.trim().replace(/\s+/g, ' ');
    } else {
      const e = raw.every;
      if (!plain(e) || !UNITS.includes(e.unit) || !int(e.n, 1, e.unit === 'minute' ? 1440 : e.unit === 'hour' ? 168 : e.unit === 'year' ? 10 : 366)) bad('Ogni quanto: numero o unità non validi');
      out.every = { n: e.n, unit: e.unit };
      const startTime = `${pad(start.hh)}:${pad(start.mm)}`;
      if (raw.days !== undefined) {
        if (!Array.isArray(raw.days) || !raw.days.length || raw.days.some(d => !int(d, 1, 7))) bad('Giorni della settimana non validi');
        if (!['minute', 'hour', 'week'].includes(e.unit)) bad('I giorni della settimana valgono per minuti, ore e settimane');
        out.days = [...new Set(raw.days)].sort();
      } else if (e.unit === 'week') out.days = [weekdayOf(start.y, start.m, start.d)];
      if (e.unit === 'minute' || e.unit === 'hour') {
        if (raw.between !== undefined) {
          const b = raw.between;
          if (!Array.isArray(b) || b.length !== 2 || b.some(t => typeof t !== 'string' || !TIME.test(t)) || minutesOf(b[1]) < minutesOf(b[0])) bad('Fascia oraria non valida');
          out.between = [b[0], b[1]];
        }
      } else {
        out.times = timeList(raw.times, startTime);
      }
      if (e.unit === 'month' || e.unit === 'year') {
        const mo = raw.monthly ?? { day: start.d };
        if (plain(mo) && mo.day !== undefined && (int(mo.day, 1, 31) || mo.day === -1)) out.monthly = { day: mo.day };
        else if (plain(mo) && (int(mo.nth, 1, 5) || mo.nth === -1) && int(mo.weekday, 1, 7)) out.monthly = { nth: mo.nth, weekday: mo.weekday };
        else bad('Giorno del mese non valido');
      }
      if (e.unit === 'year') {
        if (raw.month !== undefined && !int(raw.month, 1, 12)) bad('Mese non valido');
        out.month = raw.month ?? start.m;
      }
    }
    if (raw.end !== undefined && raw.end !== null) {
      const end = parseDate(raw.end) ?? bad('Data di fine non valida');
      if (dayNumber(end.y, end.m, end.d) < dayNumber(start.y, start.m, start.d)) bad('La fine viene prima dell’inizio');
      out.end = raw.end;
    }
    if (raw.count !== undefined && raw.count !== null) {
      if (!int(raw.count, 1, 100_000)) bad('Numero di volte non valido');
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
    for (const t of dayTimes(w, y, m, d)) {
      const at = instantOf(y, m, d, Math.floor(t / 60), t % 60, w.tz);
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
  if (!Number.isSafeInteger(at) || !Number.isSafeInteger(to)) bad('Orari non validi');
  const w = { ...when };
  if (scope === 'this') {
    if (w.once) return { ...w, once: localText(to, w.tz) };
    if (w.extra?.includes(at)) w.extra = w.extra.filter(x => x !== at);
    else w.skip = [...(w.skip ?? []), at].sort((a, b) => a - b);
    if (to !== at) w.extra = [...new Set([...(w.extra ?? []), to])].sort((a, b) => a - b);
    return checkWhen(w);
  }
  if (scope !== 'all') bad('scope deve essere this o all');
  if (w.once) return { ...w, once: localText(to, w.tz) };
  if (w.cron) bad('Una regola cron si sposta una volta alla volta');
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
    if (minutesOf(y) < minutesOf(x)) bad('La fascia oraria passerebbe la mezzanotte');
    w.between = [x, y];
  }
  const dayShift = days + Math.floor(((a.hh * 60 + a.mm) + minutes) / 1440);
  if (w.days && dayShift % 7) w.days = [...new Set(w.days.map(d => ((d - 1 + dayShift) % 7 + 7) % 7 + 1))].sort();
  if (w.monthly?.day > 0 && dayShift) {
    const nd = w.monthly.day + dayShift;
    if (nd < 1 || nd > 31) bad('Il giorno del mese uscirebbe dal mese');
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

const WORDS = {
  it: {
    once: d => `Una volta: ${d}`, at: t => `alle ${t}`, and: ' e ',
    every: { minute: ['Ogni minuto', n => `Ogni ${n} minuti`], hour: ['Ogni ora', n => `Ogni ${n} ore`], day: ['Ogni giorno', n => `Ogni ${n} giorni`], week: ['Ogni settimana', n => `Ogni ${n} settimane`], month: ['ogni mese', n => `ogni ${n} mesi`], year: ['Ogni anno', n => `Ogni ${n} anni`] },
    between: (a, b) => `dalle ${a} alle ${b}`,
    weekdays: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
    onDays: list => `il ${list}`, weekdaysRange: 'dal lunedì al venerdì', weekend: 'il sabato e la domenica', everyDay: 'ogni giorno',
    eachWeekday: d => `Ogni ${d}`, workweek: 'Dal lunedì al venerdì',
    monthDay: (d, every) => `Il giorno ${d} di ${every}`, lastDay: every => `L’ultimo giorno di ${every}`,
    nth: (k, d, every) => `${['', 'Il primo', 'Il secondo', 'Il terzo', 'Il quarto', 'Il quinto'][k] ?? 'L’ultimo'} ${d} di ${every}`,
    lastNth: (d, every) => `L’ultimo ${d} di ${every}`,
    yearDay: (date, every) => `${every} il ${date}`, yearLast: (month, every) => `${every} l’ultimo giorno di ${month}`,
    until: d => `fino al ${d}`, times: n => (n === 1 ? 'una volta' : `${n} volte`), cron: t => `Cron: ${t}`,
  },
  en: {
    once: d => `Once: ${d}`, at: t => `at ${t}`, and: ' and ',
    every: { minute: ['Every minute', n => `Every ${n} minutes`], hour: ['Every hour', n => `Every ${n} hours`], day: ['Every day', n => `Every ${n} days`], week: ['Every week', n => `Every ${n} weeks`], month: ['every month', n => `every ${n} months`], year: ['Every year', n => `Every ${n} years`] },
    between: (a, b) => `from ${a} to ${b}`,
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    onDays: list => `on ${list}`, weekdaysRange: 'Monday to Friday', weekend: 'on Saturday and Sunday', everyDay: 'every day',
    eachWeekday: d => `Every ${d}`, workweek: 'Monday to Friday',
    monthDay: (d, every) => `On day ${d} of ${every}`, lastDay: every => `On the last day of ${every}`,
    nth: (k, d, every) => `On the ${['', 'first', 'second', 'third', 'fourth', 'fifth'][k] ?? 'last'} ${d} of ${every}`,
    lastNth: (d, every) => `On the last ${d} of ${every}`,
    yearDay: (date, every) => `${every} on ${date}`, yearLast: (month, every) => `${every} on the last day of ${month}`,
    until: d => `until ${d}`, times: n => (n === 1 ? 'once' : `${n} times`), cron: t => `Cron: ${t}`,
  },
};

const list = (items, and) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}`);

/** The rule in words, in Italian or English ('it-CH' → it, anything else → en). */
export function describe(when, lang = 'en') {
  const code = String(lang).toLowerCase().startsWith('it') ? 'it' : 'en';
  const W = WORDS[code];
  const dateFmt = (y, m, d, opts) => new Intl.DateTimeFormat(code, { timeZone: 'UTC', ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
  if (when.once) {
    const o = parseLocal(when.once);
    return W.once(`${dateFmt(o.y, o.m, o.d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${W.at(`${pad(o.hh)}:${pad(o.mm)}`)}`);
  }
  let w = when;
  if (w.cron) {
    const like = fromCron(w.cron, { tz: w.tz, start: w.start });
    if (!like) return W.cron(w.cron);
    w = { ...like, end: when.end, count: when.count };
  }
  const { n, unit } = w.every;
  const [one, many] = W.every[unit];
  const everyText = n === 1 ? one : many(n);
  const at = w.times ? W.at(list(w.times, W.and)) : '';
  const dayNames = ds => list(ds.map(d => W.weekdays[d - 1]), W.and);
  const daysText = ds => {
    if (!ds) return '';
    if (ds.length === 7) return W.everyDay;
    if (ds.join() === '1,2,3,4,5') return W.weekdaysRange;
    if (ds.join() === '6,7') return W.weekend;
    return W.onDays(dayNames(ds));
  };
  let text;
  if (unit === 'minute' || unit === 'hour') {
    text = [everyText, w.between && W.between(...w.between), w.days && daysText(w.days)].filter(Boolean).join(', ');
  } else if (unit === 'day') {
    text = `${everyText} ${at}`;
  } else if (unit === 'week') {
    if (n === 1 && w.days.length === 7) text = `${W.every.day[0]} ${at}`;
    else if (n === 1 && w.days.join() === '1,2,3,4,5') text = `${W.workweek} ${at}`;
    else if (n === 1 && w.days.length === 1) text = `${W.eachWeekday(W.weekdays[w.days[0] - 1])} ${at}`;
    else text = `${everyText}, ${daysText(w.days)}, ${at}`;
  } else if (unit === 'month') {
    const mo = w.monthly;
    const every = W.every.month[n === 1 ? 0 : 1];
    const everyM = n === 1 ? every : every(n);
    const head = mo.day === -1 ? W.lastDay(everyM) : mo.day !== undefined ? W.monthDay(mo.day, everyM)
      : mo.nth === -1 ? W.lastNth(W.weekdays[mo.weekday - 1], everyM) : W.nth(mo.nth, W.weekdays[mo.weekday - 1], everyM);
    text = `${head} ${at}`;
  } else {
    const mo = w.monthly;
    const monthName = dateFmt(2000, w.month, 1, { month: 'long' });
    if (mo.day === -1) text = `${W.yearLast(monthName, everyText)} ${at}`;
    else if (mo.day !== undefined) text = `${W.yearDay(dateFmt(2000, w.month, mo.day, { day: 'numeric', month: 'long' }), everyText)} ${at}`;
    else text = `${everyText}: ${(mo.nth === -1 ? W.lastNth(W.weekdays[mo.weekday - 1], monthName) : W.nth(mo.nth, W.weekdays[mo.weekday - 1], monthName))} ${at}`;
  }
  const tail = [];
  if (w.end) { const e = parseDate(w.end); tail.push(W.until(dateFmt(e.y, e.m, e.d, { day: 'numeric', month: 'long', year: 'numeric' }))); }
  if (w.count) tail.push(W.times(w.count));
  return [text.trim(), ...tail].join(', ');
}
