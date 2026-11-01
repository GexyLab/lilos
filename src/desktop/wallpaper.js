import { Emitter, fs, settings, splitName, h } from '@lilos/sdk';
import { notify } from '../notifications/notify.js';
import { SYSTEM_NAME, sharedFolder } from '../systemFs.js';

/**
 * The desk's background image (setting 'wallpaper': the id of an image file, '' for none). It has
 * its own layer behind the world: it is exactly as tall as the desk, with its own proportions (never
 * stretched, never cut at the top or bottom; wider than the desk, it is cut equally at the sides) and
 * it does not move or zoom with the camera. The desk color (setting deskColor, systemSettings.js)
 * shows at the sides of a narrower image and through transparent ones. Over an image the
 * labels on the desk are light with a strong shadow, to read on any color (canvas.css, .has-wallpaper).
 *
 * The wallpaper is a copy of the image chosen, in the shared system folder Sistema (systemFs.js):
 * deleting or changing the original does nothing to it. Sistema keeps only the copy in use: a new
 * wallpaper, or none, deletes the one before. Deleting the copy itself (trashed included) leaves no
 * wallpaper; its content rewritten, it is read again. A wallpaper saved before the copies (lilOS
 * 1.9.0 to 1.9.3: the id of the original) is copied at start-up, while fs still shows every
 * workspace (preloadWallpaper): the original may be on another workspace's desk.
 *
 * Events of `wallpaper`: 'change' { id, name } | null, once the new image is shown.
 */
export const WALLPAPER_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'];

export const wallpaper = new Emitter();

let layer = null;
let host = null;      // the canvas element
let shown = null;     // { id, name, url, stamp } of the image on screen (stamp: the content it shows)
let pending = null;   // the reading (and copying) started by preloadWallpaper
let turn = 0;         // the last reading asked: older ones that end later are dropped

/** True for an image file that can be the wallpaper. */
export function isWallpaperImage(node) {
  return node?.type === 'file' && WALLPAPER_EXTS.includes(splitName(node.name)[1].toLowerCase());
}

/** The wallpaper on screen: { id, name }, or null. */
export function wallpaperInfo() {
  return shown && { id: shown.id, name: shown.name };
}

/** Reads the file and checks that it opens as an image: its object URL. fs checks visibility now, before any await. */
function read(id) {
  const blob = fs.readBlob(id, { caller: { system: true } });
  return blob.then(async b => {
    const url = URL.createObjectURL(b);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return url;
    } catch {
      URL.revokeObjectURL(url);
      throw new Error('not an image');
    }
  });
}

function show(next) {
  if (shown?.url && shown.url !== next?.url) URL.revokeObjectURL(shown.url);
  shown = next;
  if (layer) {
    // Object URLs only (blob:…): nothing from storage reaches the stylesheet
    layer.style.backgroundImage = next ? `url("${next.url}")` : '';
    layer.hidden = !next;
    host.classList.toggle('has-wallpaper', !!next);
  }
  wallpaper.emit('change', wallpaperInfo());
}

const stampOf = node => `${node.modified}:${node.size ?? 0}`;

/** True for a file in Sistema: a copy made for the wallpaper. */
const isCopy = node => !!node && node.parent === sharedFolder(SYSTEM_NAME);

/** A copy of the image in Sistema, or the image itself when it is already there. fs checks the file now, before any await. */
function copyOf(node) {
  if (isCopy(node)) return Promise.resolve(node);
  const folder = sharedFolder(SYSTEM_NAME);
  return folder ? fs.copy(node.id, folder) : Promise.reject(new Error(`manca la cartella ${SYSTEM_NAME}`));
}

/** Deletes for good a copy made for the wallpaper (never a file elsewhere). */
function dropCopy(id) {
  const node = id ? fs.get(id) : null;
  if (!isCopy(node) || node.system) return;
  try {
    fs.remove(id);
  } catch (err) {
    console.warn('[lilos] sfondo:', err.message);
  }
}

/**
 * Shows the image of the file `node` once read (a reading already started can be given); errors
 * are the caller's, and leave the image on screen as it was.
 */
async function load(node, reading = read(node.id)) {
  const mine = ++turn;
  const url = await reading;
  if (mine !== turn) return URL.revokeObjectURL(url);
  show({ id: node.id, name: node.name, url, stamp: stampOf(node) });
}

/**
 * Makes a copy of an image file, in Sistema, the wallpaper (the copy before is deleted). Resolves to
 * true once it is on screen; false (with a notification) when it is not an image that opens or
 * cannot be copied.
 */
export async function setWallpaper(id) {
  const node = fs.get(id);
  if (!isWallpaperImage(node)) {
    notify(node ? `«${node.name}» non è un'immagine` : 'Questa immagine non c\'è più', { level: 'error' });
    return false;
  }
  let copy;
  try {
    copy = await copyOf(node);
  } catch (err) {
    notify(`«${node.name}» non si copia nella cartella ${SYSTEM_NAME}: ${err.message}`, { level: 'error' });
    return false;
  }
  try {
    await load(copy);
  } catch {
    if (copy.id !== node.id) dropCopy(copy.id);
    notify(`«${node.name}» non si apre come immagine`, { level: 'error' });
    return false;
  }
  const before = settings.get('wallpaper');
  settings.set('wallpaper', copy.id);
  if (before && before !== copy.id) dropCopy(before);
  // The copy takes the original's name once the one before is gone (fs numbered it if the name was taken)
  if (copy.name !== node.name && fs.exists(copy.id)) {
    try { fs.rename(copy.id, node.name); } catch { /* the name stays as it is */ }
  }
  return true;
}

/** No image behind the desk any more: only its color (the copy in Sistema is deleted). */
export function clearWallpaper() {
  settings.set('wallpaper', '');
}

/** At start-up, before any workspace is set: starts reading the saved wallpaper. */
export function preloadWallpaper() {
  const id = settings.get('wallpaper');
  if (!id) return;
  const node = fs.get(id);
  // Gone while lilOS was closed (or never a file): forgotten
  if (!isWallpaperImage(node)) return settings.set('wallpaper', '');
  // Saved before the copies: the original, copied into Sistema now
  const copying = isCopy(node) ? null : copyOf(node);
  copying?.catch(err => console.warn('[lilos] sfondo:', err.message));
  pending = { node, reading: read(id), copying };
}

/** The copy made at start-up takes the place of the original, on screen and in the setting. */
function adopt(copy) {
  if (!shown || !fs.exists(copy.id)) return;
  shown = { ...shown, id: copy.id, name: copy.name, stamp: stampOf(copy) };
  settings.set('wallpaper', copy.id);
  wallpaper.emit('change', wallpaperInfo());
}

/** Puts the wallpaper layer at the bottom of the desk and keeps it in step with the setting and the file. */
export function connectWallpaper(canvas) {
  layer = h('div', { class: 'canvas-wallpaper', hidden: true, 'aria-hidden': 'true' });
  host = canvas.el;
  host.prepend(layer);
  if (pending) {
    const { node, reading, copying } = pending;
    pending = null;
    load(node, reading)
      .then(() => copying?.then(copy => (shown?.id === node.id ? adopt(copy) : dropCopy(copy.id))))
      .catch(err => console.warn('[lilos] sfondo:', err.message));
  }
  settings.on('change:wallpaper', id => {
    if (id === (shown?.id ?? '')) return;
    if (!id) {
      // Removed (Togli, Ripristina, the copy deleted): the copy goes too
      const before = shown?.id;
      turn++;
      show(null);
      return dropCopy(before);
    }
    // Set elsewhere (another tab, Control Panel by hand): shown if it is an image that can be read here
    const node = fs.get(id);
    if (isWallpaperImage(node)) load(node).catch(err => console.warn('[lilos] sfondo:', err.message));
  });
  fs.on('change', e => {
    const id = settings.get('wallpaper');
    if (!id) return;
    if (e.type === 'remove' && e.ids?.includes(id)) clearWallpaper();
    // 'update' also comes for tags, color and apps' data: read again only for a new content
    else if (e.type === 'update' && e.node?.id === id && stampOf(e.node) !== shown?.stamp) load(e.node).catch(err => console.warn('[lilos] sfondo:', err.message));
    else if (e.type === 'rename' && e.node?.id === id && shown) {
      // Renamed into something that is not an image any more: no wallpaper
      if (!isWallpaperImage(e.node)) clearWallpaper();
      else show({ ...shown, name: e.node.name });
    }
  });
}
