import { Emitter, fs, settings, splitName, h } from '@lilos/sdk';
import { notify } from '../notifications/notify.js';

/**
 * The desk's background image (setting 'wallpaper': the id of an image file, '' for none). It has
 * its own layer behind the world: it covers the whole desk keeping its proportions (the parts that
 * do not fit are cut, it is never stretched) and it does not move or zoom with the camera. The desk
 * color (setting deskColor, systemSettings.js) shows through transparent images. Over an image the
 * labels on the desk are light with a strong shadow, to read on any color (canvas.css, .has-wallpaper).
 *
 * The file is read at start-up while fs still shows every workspace (preloadWallpaper): an image on
 * a workspace's private desk is the wallpaper of the others too. Deleted (trashed included), it
 * stops being the wallpaper; its content rewritten, it is read again.
 *
 * Events of `wallpaper`: 'change' { id, name } | null, once the new image is shown.
 */
export const WALLPAPER_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'];

export const wallpaper = new Emitter();

let layer = null;
let host = null;      // the canvas element
let shown = null;     // { id, name, url, stamp } of the image on screen (stamp: the content it shows)
let pending = null;   // the reading started by preloadWallpaper
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
 * Makes an image file the wallpaper. Resolves to true once it is on screen; false (with a
 * notification) when it is not an image that opens.
 */
export async function setWallpaper(id) {
  const node = fs.get(id);
  if (!isWallpaperImage(node)) {
    notify(node ? `«${node.name}» non è un'immagine` : 'Questa immagine non c\'è più', { level: 'error' });
    return false;
  }
  try {
    await load(node);
  } catch {
    notify(`«${node.name}» non si apre come immagine`, { level: 'error' });
    return false;
  }
  settings.set('wallpaper', node.id);
  return true;
}

/** No image behind the desk any more: only its color. */
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
  pending = { node, reading: read(id) };
}

/** Puts the wallpaper layer at the bottom of the desk and keeps it in step with the setting and the file. */
export function connectWallpaper(canvas) {
  layer = h('div', { class: 'canvas-wallpaper', hidden: true, 'aria-hidden': 'true' });
  host = canvas.el;
  host.prepend(layer);
  if (pending) {
    const { node, reading } = pending;
    pending = null;
    load(node, reading).catch(err => console.warn('[lilos] sfondo:', err.message));
  }
  settings.on('change:wallpaper', id => {
    if (id === (shown?.id ?? '')) return;
    if (!id) {
      turn++;
      return show(null);
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
