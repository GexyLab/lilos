import { fs, storage } from '@lilos/sdk';
import { APP_ID, COLOR_NAMES, metaOf, packMeta, summary, nameFor } from './note.js';
import { t } from './i18n.js';

/**
 * Reading and saving notes: the text in the file, the rest in the app's data on it (note.js).
 * Saving also renames the file after the title, as long as the user did not rename it: the name
 * the app gave is kept in the data (`named`), so a name that differs is the user's.
 */
const COLOR_KEY = `app:${APP_ID}:color`;
const renaming = new Set();   // notes the app is renaming now (their changes are its own)

/** The color of new notes (the window's setting). */
export const newColor = () => (COLOR_NAMES.includes(storage.get(COLOR_KEY)) ? storage.get(COLOR_KEY) : 'yellow');
export const setNewColor = color => { if (COLOR_NAMES.includes(color)) storage.set(COLOR_KEY, color); };

/** The note's data, with the color of new notes for one that has none yet. */
export const noteMeta = node => metaOf(node, { color: newColor() });

export async function readNote(id) {
  try {
    return await fs.read(id);
  } catch {
    return null;
  }
}

/** Changes some of the data (not the text). */
export function setMeta(id, patch) {
  const node = fs.get(id);
  if (!node) return;
  fs.setAppMeta(id, APP_ID, packMeta({ ...noteMeta(node), ...patch }));
}

/** Saves the text, its summary in the data, and the name after the title. */
export async function saveNote(id, text) {
  const node = fs.get(id);
  if (!node) return;
  const { title, excerpt, checks } = summary(text);
  const meta = packMeta({ ...noteMeta(node), title, excerpt, checks });
  await fs.write(id, text, { mark: { app: APP_ID, value: meta } });
  followTitle(id);
}

/** The file gets the title's name, unless the user named it. */
export function followTitle(id) {
  const node = fs.get(id);
  if (!node) return;
  const m = noteMeta(node);
  // Renamed by the user where no view saw it (the File Manager): the name stays theirs
  if (m.auto && m.named && m.named !== node.name) {
    fs.setAppMeta(id, APP_ID, packMeta({ ...m, auto: false }));
    return;
  }
  if (!m.auto || !m.title) return;
  const want = fs.uniqueName(node.parent, nameFor(m.title, t('note.untitled')), id);
  if (want === node.name) return;
  renaming.add(id);
  try {
    fs.setAppMeta(id, APP_ID, packMeta({ ...m, named: want }));
    fs.rename(id, want);
  } catch (err) {
    console.warn('[stickynotes] nome non cambiato:', err.message);
  } finally {
    renaming.delete(id);
  }
}

/**
 * A change of the note seen by a view: when its name is not the one the app gave, the user
 * renamed it, and the name stops following the title.
 */
export function noticeRename(node) {
  if (renaming.has(node.id)) return;
  const m = noteMeta(node);
  if (m.auto && m.named && node.name !== m.named) {
    try { setMeta(node.id, { auto: false }); } catch { /* not ours to change any more */ }
  }
}
