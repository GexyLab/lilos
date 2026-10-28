import { h, session } from '@lilos/sdk';

/** Date + time, refreshed on the minute. */
export function createClock() {
  const date = h('span', { class: 'clock-date' });
  const time = h('span', { class: 'clock-time' });
  const el = h('div', { class: 'clock' }, date, time);

  const tick = () => {
    const now = new Date();
    date.textContent = now.toLocaleDateString(session.locale, { weekday: 'short', day: 'numeric', month: 'short' });
    time.textContent = now.toLocaleTimeString(session.locale, { hour: '2-digit', minute: '2-digit' });
    el.title = now.toLocaleDateString(session.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60_000); }, 60_000 - (Date.now() % 60_000));
  return el;
}
