import { h } from '../core/dom.js';
import { initials } from '../core/session.js';

export function avatar(user, className = 'avatar') {
  return h('span', { class: className, 'aria-hidden': 'true' }, initials(user.name));
}
