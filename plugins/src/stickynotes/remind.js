import { h, fs, icon, schedule } from '@lilos/sdk';
import { APP_ID } from './note.js';
import { noteMeta, setMeta } from './store.js';
import { t, i18n } from './i18n.js';

/**
 * Reminders: a note can call the user at a date and time. The kernel's scheduler does it (a
 * one-time «reminder» operation of this app, also with lilOS closed): its notification, clicked,
 * shows the note (the entry point `reveal`). The note keeps the time and the operation's id in
 * its data, to show the bell and to change or take away the reminder.
 */
let scoped = null;
const tasks = () => (scoped ??= schedule.forApp(APP_ID));

export const canRemind = () => !!schedule?.available;

const pad = n => String(n).padStart(2, '0');
/** A time as the scheduler's local text 'YYYY-MM-DDTHH:mm'. */
const localText = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** When the note's reminder comes, if it is still to come. */
export function pendingReminder(node) {
  const { remind } = noteMeta(node);
  return remind && remind > Date.now() ? remind : null;
}

/** «domani 09:00», «lun 9 nov, 09:00»: short, for the note and the window. */
export function whenText(ms) {
  const d = new Date(ms), now = new Date();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const time = i18n.date(d, { hour: '2-digit', minute: '2-digit' });
  if (day === 0) return t('remind.today', { time });
  if (day === 86_400_000) return t('remind.tomorrow', { time });
  return t('remind.on', { date: i18n.date(d, { weekday: 'short', day: 'numeric', month: 'short' }), time });
}

/** Sets (or moves) the reminder of a note. */
export async function setReminder(id, at) {
  const node = fs.get(id);
  if (!node) return;
  const m = noteMeta(node);
  const title = m.title || t('note.untitled');
  const task = {
    name: t('remind.taskName', { title }).slice(0, 120),
    enabled: true,
    when: { once: localText(new Date(at)), tz: zone() },
    what: {
      type: 'notify', level: 'info',
      text: (m.excerpt ? `${title} — ${m.excerpt}` : title).slice(0, 300),
      open: { app: APP_ID, entry: 'reveal', args: { note: id } },
    },
  };
  let saved = null;
  if (m.task) saved = await tasks().update(m.task, task).catch(() => null);
  saved ??= await tasks().create(task);
  setMeta(id, { remind: at, task: saved.id });
}

/** Takes the reminder away. */
export async function clearReminder(id) {
  const node = fs.get(id);
  const m = node && noteMeta(node);
  if (!m) return;
  if (m.task) await tasks().remove(m.task).catch(() => {});
  setMeta(id, { remind: null, task: null });
}

/** The quick choices: [{ label, at }], only those still to come. */
function choices() {
  const now = new Date();
  const at = (days, hours, minutes = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hours, minutes).getTime();
  const monday = (8 - now.getDay()) % 7 || 7;
  const list = [
    { label: t('remind.inHour'), at: Date.now() + 3_600_000 },
    { label: t('remind.evening'), at: at(0, 18) },
    { label: t('remind.morning'), at: at(1, 9) },
    { label: t('remind.monday'), at: at(monday, 9) },
  ];
  return list.filter(c => c.at > Date.now() + 60_000);
}

/**
 * The «Ricordamelo» panel next to a point of the screen ({ x, y }): quick choices, or a date and
 * a time. Closes by itself (Esc, a click outside, a choice). onDone() after a change.
 */
export function openReminder(id, { x, y }, onDone = () => {}) {
  document.querySelector('.sn-pop')?.remove();
  const node = fs.get(id);
  if (!node) return;
  const current = pendingReminder(node);
  const start = new Date(current ?? Date.now() + 3_600_000);
  const date = h('input', { class: 'ctl-text', type: 'date', 'aria-label': t('remind.date') });
  const time = h('input', { class: 'ctl-text', type: 'time', 'aria-label': t('remind.time') });
  date.value = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  time.value = `${pad(start.getHours())}:${pad(current ? start.getMinutes() : 0)}`;
  const error = h('p', { class: 'sn-pop-error', hidden: true });
  const close = () => {
    pop.remove();
    removeEventListener('pointerdown', outside, true);
  };
  const fail = err => {
    error.textContent = t('remind.failed', { message: err.message });
    error.hidden = false;
  };
  const pick = async at => {
    try {
      await setReminder(id, at);
      close();
      onDone();
    } catch (err) { fail(err); }
  };
  const custom = () => {
    const [Y, M, D] = date.value.split('-').map(Number), [hh, mm] = time.value.split(':').map(Number);
    const at = new Date(Y, M - 1, D, hh, mm).getTime();
    if (!Number.isFinite(at)) return fail(new Error(t('remind.invalid')));
    if (at <= Date.now()) return fail(new Error(t('remind.past')));
    pick(at);
  };
  const pop = h('div', { class: 'sn-pop', role: 'dialog', 'aria-label': t('remind.title') },
    h('h5', {}, icon('bell'), t('remind.title')),
    h('div', { class: 'sn-quick' }, choices().map(c => h('button', { type: 'button', onclick: () => pick(c.at) },
      h('span', {}, c.label), h('small', {}, whenText(c.at))))),
    h('div', { class: 'sn-pop-row' }, date, time),
    h('p', { class: 'sn-pop-hint' }, t('remind.hint', { zone: zone() })),
    error,
    h('div', { class: 'sn-pop-foot' },
      current && h('button', { class: 'ctl-btn danger', type: 'button', onclick: async () => {
        try {
          await clearReminder(id);
          close();
          onDone();
        } catch (err) { fail(err); }
      } }, t('remind.remove')),
      h('span', { class: 'sn-grow' }),
      h('button', { class: 'ctl-btn', type: 'button', onclick: close }, t('common.cancel')),
      h('button', { class: 'ctl-btn primary', type: 'button', onclick: custom }, t('remind.save'))));
  pop.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && (e.target === date || e.target === time)) custom();
  });
  const outside = e => { if (!pop.contains(e.target)) close(); };
  document.body.append(pop);
  const r = pop.getBoundingClientRect();
  pop.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, x))}px`;
  pop.style.top = `${Math.max(8, Math.min(innerHeight - r.height - 8, y))}px`;
  setTimeout(() => addEventListener('pointerdown', outside, true));
  pop.querySelector('button')?.focus();
}
