import { h, textField } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * Fields of Proprietà the SDK has no control for, used by the settings of blocks (inspector.js)
 * and the props of components (windowEditor.js):
 *   textarea  text on several lines (onChange when it loses the focus)
 *   color     a colour: the picker, or written (#rgb, #rrggbb, rgb()…, a name); empty = the theme's
 */
export function textareaField({ value = '', onChange, rows = 3, maxLength = 2000 } = {}) {
  const el = h('textarea', { class: 'ctl-text', rows, spellcheck: 'false', maxlength: maxLength });
  el.value = String(value ?? '');
  el.addEventListener('change', () => onChange?.(el.value));
  return el;
}

export function colorField({ value = '', onChange } = {}) {
  const v = String(value ?? '');
  const hex = /^#[0-9a-f]{6}$/i.test(v) ? v : /^#[0-9a-f]{3}$/i.test(v) ? `#${[...v.slice(1)].map(c => c + c).join('')}` : '#808080';
  const pick = h('input', { type: 'color', class: 'ls-color-pick', title: t('field.pickColor'), 'aria-label': t('field.pickColor') });
  pick.value = hex;
  const text = textField({ value: v, placeholder: t('field.themeColor'), maxLength: 60, onChange: x => onChange?.(x.trim()) });
  pick.addEventListener('change', () => { text.value = pick.value; onChange?.(pick.value); });
  return h('div', { class: 'ls-color' }, pick, text);
}
