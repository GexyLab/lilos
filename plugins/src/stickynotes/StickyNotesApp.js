import { Window, h, fs } from '@lilos/sdk';
import * as system from '@lilos/system';
import { COLORS, isNote } from './note.js';
import { noteMeta } from './store.js';
import { noteEditor } from './editor.js';
import { noteWidget } from './widget.js';
import { createListWindow } from './list.js';
import { t } from './i18n.js';
import './stickynotes.css';

/**
 * Note adesive («Sticky Notes»): notes on the desk. Each note is a .sticky text file (note.js)
 * that lilOS shows on the desk with this app's widget (lilOS's desktop/widgets.js). A system app;
 * its entry points are the exports here:
 *   default      the window with every note (list.js); with { file }, that note alone, to write
 *                (a note opened outside the desk: from the File Manager, or «Apri con»)
 *   reveal       { note }: shows the note on its desk (a reminder's notification); its window
 *                closes at once, unless the note is gone
 *   filePreview  the preview of a note (preview.js)
 *   widgets      { note }: the note on the desk (widget.js)
 */
export default function main({ args, openWindow } = {}) {
  const win = windowFor(args);
  // lilOS keeps one main window per app: launched again, the other kind opens beside it
  win.on('launch', next => {
    const other = windowFor(next, win);
    if (other) openWindow?.(other, other.key);
  });
  return win;
}

/** The window for these args: a note alone ({ file }) or the list; with `open`, null when that one is it. */
function windowFor(args, open = null) {
  const node = typeof args?.file === 'string' ? fs.get(args.file) : null;
  if (node && isNote(node)) return open?.noteId === node.id ? null : noteWindow(node);
  if (open && !open.noteId) return null;
  const list = createListWindow({ args });
  list.key = 'stickynotes:list';
  return list;
}

export const widgets = { note: noteWidget };
export { filePreview } from './preview.js';

export function reveal({ args } = {}) {
  const win = new Window({ title: t('app.name'), icon: 'note', width: 320, height: 140 });
  const id = typeof args?.note === 'string' ? args.note : null;
  const say = text => win.body.append(h('p', { class: 'sn-empty' }, text));
  // Only a step on the way: it goes as soon as it is open (unless it has something to say)
  system.revealOnDesk(id).then(shown => {
    if (shown) return win.emit('close');
    const node = id && fs.get(id);
    if (node) {
      system.launch('stickynotes', { file: node.id });
      return win.emit('close');
    }
    say(t('reveal.gone'));
  }, err => say(err.message));
  return win;
}

/** A note in a window: the same writing as on the desk. */
function noteWindow(node) {
  const m = noteMeta(node);
  const win = new Window({ title: m.title || node.name, icon: 'note', width: 360, height: 380, minWidth: 260, minHeight: 220 });
  const paper = h('div', { class: 'sn sn-alone editing' });
  paper.style.setProperty('--sn-c', COLORS[m.color]);
  const editor = noteEditor({
    id: node.id,
    onColor: color => paper.style.setProperty('--sn-c', COLORS[color]),
    onEnd: () => win.emit('close'),
  });
  paper.append(editor.area);
  win.body.append(h('div', { class: 'sn-single' }, editor.bar, paper));
  const off = fs.on('change', e => {
    if (e.node?.id !== node.id) return;
    if (e.type === 'remove') win.emit('close');
    else win.setTitle?.(noteMeta(fs.get(node.id) ?? e.node).title || e.node.name);
  });
  win.noteId = node.id;
  win.key = `stickynotes:note:${node.id}`;
  win.getState = () => ({ file: node.id });
  win.canClose = async () => { await editor.save(); return true; };
  win.on('destroy', () => { off(); editor.save(); });
  requestAnimationFrame(() => editor.focus());
  return win;
}
