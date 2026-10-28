import { h } from '../core/dom.js';
import { icon } from '../ui/icons.js';

/** App tile: colored square + glyph. Size comes from the context's CSS. */
export function appIcon(app, className = 'app-icon') {
  return h('span', { class: className, style: { backgroundColor: app?.color ?? '#5f6673' } }, icon(app?.glyph ?? 'help'));
}
