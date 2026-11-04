import { h, icon, net, locale } from '@lilos/sdk';
import { bytes } from './TransfersWindow.js';

const { t } = locale.define('lilos:transfersButton', {
  en: { strings: {
    title: 'Data transfer',
    sent: '↑ {done} of {total}', received: '↓ {done} of {total}', rate: '{line} · {bytes}/s',
    conflict: 'A file already exists: choose what to do',
    failed: 'Some files were not transferred',
  } },
});

const SVG_NS = 'http://www.w3.org/2000/svg';
const R = 15, LENGTH = 2 * Math.PI * R;

const circle = cls => {
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', '18');
  c.setAttribute('cy', '18');
  c.setAttribute('r', String(R));
  c.setAttribute('class', cls);
  return c;
};

/**
 * The transfers' button in the notification area of the taskbar: there while the kernel has
 * transfers (running, or failed ones to look at), with a ring that fills as they go and their
 * summary in its title. A click opens the Trasferimento dati window (onOpen, set by connectNet).
 */
export class TransfersButton {
  /** () => void: opens the Trasferimento dati window. */
  onOpen = null;

  constructor() {
    const ring = document.createElementNS(SVG_NS, 'svg');
    ring.setAttribute('viewBox', '0 0 36 36');
    ring.setAttribute('class', 'tb-ring');
    ring.setAttribute('aria-hidden', 'true');
    this.fill = circle('tb-ring-fill');
    this.fill.setAttribute('stroke-dasharray', `0 ${LENGTH}`);
    ring.append(circle('tb-ring-track'), this.fill);
    this.button = h('button', { class: 'tb-bg tb-transfers', type: 'button', hidden: true, 'aria-haspopup': 'dialog' },
      h('span', { class: 'tb-ring-box' }, ring, icon('transfer')));
    this.button.addEventListener('click', () => this.onOpen?.());
    net.on('transfers', s => this.#update(s));
    this.#update(net.transfers);
  }

  #update(s) {
    this.button.hidden = !s.queues.length;
    const total = s.sent.total + s.received.total, done = s.sent.done + s.received.done;
    const share = total > 0 ? Math.min(1, done / total) : 0;
    this.fill.setAttribute('stroke-dasharray', `${share * LENGTH} ${LENGTH}`);
    const conflict = s.queues.some(q => q.conflict), failed = !s.active && s.queues.length > 0;
    this.button.classList.toggle('attention', conflict || failed);
    const lines = [t('title')];
    const line = (key, m) => {
      const text = t(key, { done: bytes(m.done), total: bytes(m.total) });
      return m.rate ? t('rate', { line: text, bytes: bytes(m.rate) }) : text;
    };
    if (s.sent.total) lines.push(line('sent', s.sent));
    if (s.received.total) lines.push(line('received', s.received));
    if (conflict) lines.push(t('conflict'));
    else if (failed) lines.push(t('failed'));
    this.button.title = lines.join('\n');
    this.button.setAttribute('aria-label', lines.join('. '));
  }
}
