import { settings } from '@lilos/sdk';

/** System preferences and their defaults. Imported first by main.js, before anyone reads them. */
settings.define({
  accent: '#3b6ef5',   // main color
  motion: true,        // animations and transitions
  snap: true,          // desktop items snap to the grid when dropped
  minimap: true,       // minimap in the HUD
  lasso: 'Alt',        // modifiers that turn a drag on the desk into a free-form (lasso) selection
});

/** Modifier combinations that can start the lasso (a plain drag draws the rectangle). */
export const LASSO_OPTIONS = [
  { value: 'Alt', label: 'Alt + trascina' },
  { value: 'Ctrl+Alt', label: 'Ctrl + Alt + trascina' },
  { value: 'Alt+Shift', label: 'Alt + Shift + trascina' },
];

/**
 * How a drag on the desk background selects, from the modifiers held when it starts:
 * { mode: 'lasso' | 'rect', additive } — additive (keep the current selection) with Ctrl/Cmd or
 * Shift, unless that key is part of the lasso combination.
 */
export function selectionMode(e) {
  const stored = settings.get('lasso');
  const combo = (LASSO_OPTIONS.some(o => o.value === stored) ? stored : 'Alt').split('+');
  const held = { Ctrl: e.ctrlKey || e.metaKey, Alt: e.altKey, Shift: e.shiftKey };
  const lasso = combo.every(k => held[k]);
  const additive = (held.Ctrl && !(lasso && combo.includes('Ctrl'))) || (held.Shift && !(lasso && combo.includes('Shift')));
  return { mode: lasso ? 'lasso' : 'rect', additive };
}

export const ACCENTS = [
  { value: '#3b6ef5', label: 'Blu' },
  { value: '#7c5cdb', label: 'Viola' },
  { value: '#c2417a', label: 'Magenta' },
  { value: '#e5484d', label: 'Rosso' },
  { value: '#d9822b', label: 'Arancione' },
  { value: '#30a46c', label: 'Verde' },
  { value: '#0d9488', label: 'Verde acqua' },
  { value: '#5f6673', label: 'Grafite' },
];

const root = document.documentElement;

settings.watch('accent', color => {
  // Stored values are untrusted: only a plain hex color reaches the stylesheet
  if (/^#[0-9a-f]{6}$/i.test(color)) root.style.setProperty('--accent', color);
});
settings.watch('motion', on => {
  if (on) delete root.dataset.motion;
  else root.dataset.motion = 'off';
});
