import { h } from '../core/dom.js';

let el = null;
let timer = 0;

/**
 * Short message at the bottom of the screen ("Annullato: Rinomina", "Le aree non possono
 * sovrapporsi"). One at a time: a new one replaces the current. Read by screen readers.
 *
 *   toast('Elemento eliminato', { timeout: 4000 })
 */
export function toast(text, { timeout = 3500 } = {}) {
  if (!el) {
    el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = String(text);
  el.classList.add('on');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('on'), timeout);
}
