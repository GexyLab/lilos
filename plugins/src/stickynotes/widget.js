import { h, fs, icon } from '@lilos/sdk';
import * as system from '@lilos/system';
import { COLORS, COLOR_NAMES, SIZES, MIN, MAX, parse, inline, toggleLine, summary } from './note.js';
import { noteMeta, setMeta, saveNote, readNote, noticeRename } from './store.js';
import { canRemind, openReminder, pendingReminder, whenText } from './remind.js';
import { noteEditor } from './editor.js';
import { t } from './i18n.js';

/** Below this zoom the text is too small to read: only the title, bigger. Below FAR, the paper. */
const MID = 0.6;
const FAR = 0.25;

/**
 * A note on the desk (lilOS's desk widget, see its desktop/widgets.js): the paper with the text
 * drawn (title, lines, boxes to tick), written in place when opened. The desk selects, drags,
 * deletes and renames it; here: the text, the color, the size (the corner), the reminder.
 */
export function noteWidget({ el, node, host }) {
  let id = node.id;
  let text = null;           // the content, once read
  let modified = node.modified;
  let editor = null;
  let scale = host.scale;
  let createdEmpty = false;  // made just now, never written: left empty, it goes for good

  const view = h('div', { class: 'sn-view' });
  const foot = h('div', { class: 'sn-foot' });
  const grip = h('div', { class: 'sn-grip', title: t('note.resize') });
  const paper = h('div', { class: 'sn', role: 'note' }, view, foot, grip);
  el.append(paper);

  const meta = () => noteMeta(fs.get(id) ?? node);

  function paint() {
    const m = meta();
    paper.style.setProperty('--sn-c', COLORS[m.color]);
    host.setColor(COLORS[m.color]);
    host.setSize(m.w, m.h);
    if (editor) return;
    const { title, body, checks } = parse(text ?? (m.title ? `${m.title}\n${m.excerpt}` : ''));
    const lines = body.map(l => {
      if (l.kind === 'check') {
        return h('div', { class: `sn-li${l.done ? ' done' : ''}` },
          h('button', { class: `sn-cb${l.done ? ' on' : ''}`, type: 'button', role: 'checkbox', 'aria-checked': String(l.done), 'aria-label': l.text, onclick: e => { e.stopPropagation(); tick(l.line); } }),
          h('span', {}, inline(l.text)));
      }
      if (l.kind === 'bullet') return h('div', { class: 'sn-bul' }, inline(l.text));
      return h('div', { class: 'sn-p' }, l.text ? inline(l.text) : ' ');
    });
    paper.setAttribute('aria-label', title || t('note.untitled'));
    view.replaceChildren(h('div', { class: 'sn-t' }, title || h('span', { class: 'sn-ph' }, text === '' ? t('note.empty') : '')), ...lines);
    const remind = pendingReminder(fs.get(id) ?? node);
    foot.replaceChildren(
      remind ? h('span', { class: 'sn-when', title: t('note.reminderAt', { when: whenText(remind) }) }, icon('bell'), whenText(remind)) : '',
      checks ? h('span', { class: 'sn-count' }, t('note.checks', { done: checks[0], n: checks[1] })) : '');
    paper.classList.toggle('has-foot', !!(remind || checks));
    zoom(scale);
  }

  async function load() {
    const v = await readNote(id);
    if (v == null) return;
    text = v;
    if (text === '' && Date.now() - (fs.get(id)?.created ?? 0) < 5000) createdEmpty = true;
    // Written by another app (the Editor): what the window lists follows
    const s = summary(text), m = meta();
    if (fs.exists(id) && (s.title !== m.title || s.excerpt !== m.excerpt || String(s.checks) !== String(m.checks))) {
      try { setMeta(id, { title: s.title, excerpt: s.excerpt, checks: s.checks }); } catch { /* not ours to change */ }
    }
    paint();
  }

  async function tick(line) {
    // What the file holds now (another tab or the Editor may have changed it)
    const fresh = await readNote(id);
    if (fresh != null) text = fresh;
    if (text == null) return;
    text = toggleLine(text, line);
    paint();
    await saveNote(id, text).catch(err => console.error('[stickynotes]', err));
  }

  /** The zoom of the desk: the text, only the title (bigger), or the paper with the title if it fits. */
  function zoom(s) {
    scale = s;
    const level = s < FAR ? 'far' : s < MID ? 'mid' : 'near';
    paper.dataset.lod = level;
    const title = view.querySelector('.sn-t');
    if (title) title.style.fontSize = level === 'near' ? '' : `${Math.min(13.5 * (MID / s), 34)}px`;
  }

  function open() {
    if (editor || !fs.exists(id)) return;
    // Written at a size the eye can read
    if (scale < 0.9) system.revealOnDesk(id);
    editor = noteEditor({
      id, text, endOnBlur: true,
      onColor: () => paint(),
      onEnd: value => close(value),
    });
    host.setEditing(true);
    paper.classList.add('editing');
    view.replaceWith(editor.area);
    el.append(editor.bar);
    requestAnimationFrame(() => editor?.focus());
  }

  async function close(value) {
    if (!editor) return;
    const ed = editor;
    editor = null;
    host.setEditing(false);
    paper.classList.remove('editing');
    ed.area.replaceWith(view);
    ed.bar.remove();
    text = value;
    // A note left empty: a new one goes for good, an old one to the trash
    if (!value.trim() && fs.exists(id)) {
      try {
        if (createdEmpty) fs.remove(id);
        else fs.trash([id]);
      } catch (err) { console.warn('[stickynotes]', err.message); }
      return;
    }
    createdEmpty = false;
    paint();
  }

  // The corner: the size, in desk pixels (what the pointer moves divided by the zoom)
  grip.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    host.select();
    const m = meta(), x0 = e.clientX, y0 = e.clientY;
    let w = m.w, hh = m.h;
    grip.setPointerCapture(e.pointerId);
    const move = ev => {
      w = Math.round(Math.min(MAX.w, Math.max(MIN.w, m.w + (ev.clientX - x0) / scale)));
      hh = Math.round(Math.min(MAX.h, Math.max(MIN.h, m.h + (ev.clientY - y0) / scale)));
      host.setSize(w, hh);
    };
    const end = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      if (w !== m.w || hh !== m.h) setMeta(id, { w, h: hh });
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });

  const sizeEntry = (key, [w, hh]) => ({ label: t(`size.${key}`), icon: meta().w === w && meta().h === hh ? 'check' : undefined, action: () => setMeta(id, { w, h: hh }) });

  paint();
  load();

  return {
    update(next) {
      id = next.id;
      noticeRename(next);
      if (next.modified !== modified && !editor) {
        modified = next.modified;
        load();
      } else {
        paint();
      }
    },
    zoom,
    open,
    selected(on) { paper.classList.toggle('sel', on); },
    menu() {
      const m = meta();
      const remind = pendingReminder(fs.get(id) ?? node);
      return [
        { label: t('menu.write'), icon: 'pencil', action: open },
        { label: t('menu.color'), icon: 'palette', items: COLOR_NAMES.map(name => ({ label: t(`color.${name}`), swatch: COLORS[name], icon: m.color === name ? 'check' : undefined, action: () => setMeta(id, { color: name }) })) },
        { label: t('menu.size'), icon: 'max', items: Object.entries(SIZES).map(([key, size]) => sizeEntry(key, size)) },
        canRemind() && { label: remind ? t('menu.reminderAt', { when: whenText(remind) }) : t('menu.reminder'), icon: 'bell', action: () => {
          const r = paper.getBoundingClientRect();
          openReminder(id, { x: r.right + 8, y: r.top });
        } },
        { label: t('menu.copy'), icon: 'file', action: async () => {
          const v = text ?? await readNote(id);
          if (v != null) await navigator.clipboard?.writeText(v).catch(() => {});
        } },
      ].filter(Boolean);
    },
    destroy() {
      if (editor) editor.save();
      editor?.bar.remove();
      editor = null;
      document.querySelector('.sn-pop')?.remove();
    },
  };
}
