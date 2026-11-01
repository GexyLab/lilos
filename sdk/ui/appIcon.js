import { h } from '../core/dom.js';
import { glyphMask } from './icons.js';

/**
 * App tile: a flat square in the app's color with the glyph cut out of it, so what is behind
 * shows through (components.css). Size comes from the context's CSS; className is added to
 * app-icon.
 */
export function appIcon(app, className = '') {
  const el = h('span', { class: className && className !== 'app-icon' ? `app-icon ${className}` : 'app-icon' });
  el.style.setProperty('--app-color', app?.color ?? '#5f6673');
  el.style.setProperty('--app-glyph', glyphMask(app?.glyph ?? 'help'));
  return el;
}
