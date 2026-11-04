import { h, fs, icon } from '@lilos/sdk';
import { COLORS, COLOR_NAMES } from './note.js';
import { noteMeta, setMeta, saveNote, readNote } from './store.js';
import { canRemind, openReminder } from './remind.js';
import { t } from './i18n.js';

const SAVE_DELAY = 600;

/** Toggles a mark at the start of the selected lines ('- ' or '- [ ] '). */
function toggleLines(area, mark) {
  const { value, selectionStart: a, selectionEnd: b } = area;
  const start = value.lastIndexOf('\n', a - 1) + 1;
  const endNl = value.indexOf('\n', b);
  const end = endNl === -1 ? value.length : endNl;
  const lines = value.slice(start, end).split('\n');
  const marked = /^\s*[-*]\s+(\[( |x|X)\]\s?)?/;
  const has = l => (mark === '- ' ? /^\s*[-*]\s+(?!\[[ xX]\])/.test(l) : /^\s*[-*]\s+\[[ xX]\]/.test(l));
  const all = lines.every(has);
  const next = lines.map(l => (all ? l.replace(marked, '') : mark + l.replace(marked, ''))).join('\n');
  area.setRangeText(next, start, end, 'select');
  area.dispatchEvent(new Event('input'));
}

/** Puts ** around the selection (or takes them away). */
function toggleBold(area) {
  const { value, selectionStart: a, selectionEnd: b } = area;
  const inside = value.slice(a, b);
  if (value.slice(a - 2, a) === '**' && value.slice(b, b + 2) === '**') {
    area.setRangeText(inside, a - 2, b + 2, 'select');
  } else {
    area.setRangeText(`**${inside}**`, a, b, 'end');
    if (!inside) area.setSelectionRange(a + 2, a + 2);
  }
  area.dispatchEvent(new Event('input'));
}

/**
 * Writing a note: the text as it is in the file (a textarea) and a bar with the colors, bold,
 * the lists and the reminder. Saves a moment after each change and when it ends.
 *   id         the note's file
 *   text       its content (already read), or null to read it
 *   onColor    the color changed (the view shows it at once)
 *   onEnd      finish() was called: (text) after the last save
 *   endOnBlur  finish when the text loses the focus (on the desk: a click elsewhere)
 * Keys stay here: the desk does not see them (Delete, Ctrl A…). Esc ends, Ctrl B bold.
 */
export function noteEditor({ id, text = null, onColor = () => {}, onEnd = () => {}, endOnBlur = false }) {
  let timer = 0, ended = false, last = text;
  const area = h('textarea', { class: 'sn-text', spellcheck: 'true', 'aria-label': t('editor.label'), placeholder: t('editor.placeholder') });
  area.value = text ?? '';
  if (text == null) readNote(id).then(v => { if (!ended && v != null) { area.value = v; last = v; } });

  const save = async () => {
    clearTimeout(timer);
    if (area.value === last || !fs.exists(id)) return;
    last = area.value;
    try {
      await saveNote(id, last);
    } catch (err) {
      console.error('[stickynotes] nota non salvata:', err);
    }
  };
  area.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY);
  });
  area.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleBold(area); }
  });
  // Another tab or program taking the focus is not the end
  if (endOnBlur) area.addEventListener('blur', () => setTimeout(() => { if (document.hasFocus() && document.activeElement !== area) finish(); }));
  // The desk must not take the pointer or the menu while writing
  for (const type of ['pointerdown', 'dblclick', 'contextmenu', 'wheel']) {
    area.addEventListener(type, e => { if (type !== 'wheel' || area.scrollHeight > area.clientHeight) e.stopPropagation(); });
  }

  const swatch = name => h('button', {
    class: 'sn-sw', type: 'button', title: t(`color.${name}`), 'aria-label': t(`color.${name}`),
    style: { background: COLORS[name] },
    onclick: () => {
      setMeta(id, { color: name });
      bar.querySelectorAll('.sn-sw').forEach(b => b.classList.toggle('on', b === bar.querySelector(`[data-color="${name}"]`)));
      onColor(name);
      area.focus();
    },
    dataset: { color: name },
  });
  const tool = (glyph, label, fn) => h('button', { class: 'sn-tool', type: 'button', title: label, 'aria-label': label, onclick: () => { fn(); area.focus(); } }, glyph);
  const bar = h('div', { class: 'sn-bar', role: 'toolbar', 'aria-label': t('editor.toolbar') },
    COLOR_NAMES.map(swatch),
    h('span', { class: 'sn-sep' }),
    tool(h('b', {}, 'B'), t('editor.bold'), () => toggleBold(area)),
    tool(icon('list'), t('editor.bullets'), () => toggleLines(area, '- ')),
    tool(icon('check'), t('editor.checks'), () => toggleLines(area, '- [ ] ')),
    canRemind() && h('span', { class: 'sn-sep' }),
    canRemind() && tool(icon('bell'), t('editor.remind'), () => {
      const r = bar.getBoundingClientRect();
      save().then(() => openReminder(id, { x: r.left, y: r.bottom + 6 }));
    }),
    h('span', { class: 'sn-sep' }),
    h('button', { class: 'sn-tool sn-done', type: 'button', title: t('editor.doneHint'), onclick: () => finish() }, t('editor.done')));
  bar.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target.closest('button')) e.preventDefault(); });
  bar.addEventListener('dblclick', e => e.stopPropagation());
  const color = noteMeta(fs.get(id)).color;
  bar.querySelector(`[data-color="${color}"]`)?.classList.add('on');

  async function finish() {
    if (ended) return;
    ended = true;
    await save();
    onEnd(area.value);
  }

  return {
    area, bar, save, finish,
    get ended() { return ended; },
    focus() { area.focus(); area.setSelectionRange(area.value.length, area.value.length); },
  };
}
