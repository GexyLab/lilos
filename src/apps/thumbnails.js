import { h } from '@lilos/sdk';
import { filePreview, previewAppFor } from './filePreview.js';

/**
 * Thumbnails: the image a file's app makes of it (its `filePreview` entry point, see
 * filePreview.js), small, for the icons of the desk and of the File Manager. Only image answers
 * count; text and html ones, null and errors give no thumbnail (the icon stays).
 *
 * They are kept in memory as object URLs, by file content (id, modified, size), app (id and
 * version) and size: a file written, an app updated or another one chosen for the type make a new
 * one. Sizes are rounded up to a few steps so that icons of about the same size share them. Apps
 * are asked two at a time, and only for icons that are on screen (thumbnailIcon).
 */
const STEPS = [64, 128, 256, 512];
const KEEP = 400;        // thumbnails kept (the oldest go first)
const AT_ONCE = 2;       // apps asked at the same time

const cache = new Map();   // key → { promise, url }
const latest = new Map();  // `${id}:${step}` → key of the newest content: the older one goes when it comes
const queue = [];
let running = 0;

/** True if the node's content belongs to an app (an encrypted file): it gets no thumbnail. */
const appContent = n => !!n?.apps && Object.values(n.apps).some(v => v?.content === true);

/** True if an app may make a thumbnail of the node. */
export const canThumbnail = node => !appContent(node) && !!previewAppFor(node);

/** Runs `job` when fewer than AT_ONCE are running. */
function scheduled(job) {
  return new Promise((resolve, reject) => {
    queue.push(() => job().then(resolve, reject).finally(() => { running--; next(); }));
    next();
  });
}

function next() {
  while (running < AT_ONCE && queue.length) {
    running++;
    queue.shift()();
  }
}

function forget(key) {
  const entry = cache.get(key);
  if (!entry) return;
  cache.delete(key);
  if (entry.url) URL.revokeObjectURL(entry.url);
}

/** Drops the oldest thumbnails that are ready, past KEEP. */
function trim() {
  for (const [key, entry] of cache) {
    if (cache.size <= KEEP) return;
    if (entry.done) forget(key);
  }
}

/**
 * The thumbnail of a file, `size` pixels on its longest side or a bit more: an object URL (lilOS
 * revokes it when the thumbnail goes, so it is for an <img> shown now) or null.
 */
export function fileThumbnail(node, size = 128) {
  const app = canThumbnail(node) ? previewAppFor(node) : null;
  if (!app) return Promise.resolve(null);
  const step = STEPS.find(s => s >= size) ?? STEPS.at(-1);
  const key = `${node.id}:${node.modified}:${node.size ?? 0}:${app.id}@${app.package?.version ?? ''}:${step}`;
  const hit = cache.get(key);
  if (hit) {
    // Used again: it becomes the newest
    cache.delete(key);
    cache.set(key, hit);
    return hit.promise;
  }
  const slot = `${node.id}:${step}`;
  if (latest.get(slot) !== key) forget(latest.get(slot));
  latest.set(slot, key);
  const entry = { url: null, done: false };
  entry.promise = scheduled(() => filePreview(node, { size: step }))
    .then(preview => (preview?.image ? URL.createObjectURL(preview.image) : null), err => {
      console.warn(`Miniatura di ${node.name}:`, err?.message ?? err);
      return null;
    })
    .then(url => {
      entry.done = true;
      // Forgotten while it was being made (the file changed): nobody will revoke it later
      if (cache.get(key) !== entry) {
        if (url) URL.revokeObjectURL(url);
        return null;
      }
      entry.url = url;
      return url;
    });
  cache.set(key, entry);
  trim();
  return entry.promise;
}

const waiting = new WeakMap();   // element → what to do when it shows up
let observer = null;

/** Calls `run` once `el` is on screen. */
function whenShown(el, run) {
  observer ??= new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    observer.unobserve(e.target);
    waiting.get(e.target)?.();
    waiting.delete(e.target);
  }), { rootMargin: '200px' });
  waiting.set(el, run);
  observer.observe(el);
}

/**
 * An icon that becomes the file's thumbnail: `fallback` (the usual icon) until the thumbnail is
 * ready, and for good if there is none. `size` is in CSS pixels; the thumbnail is made for the
 * screen's pixel density. Asks only once the icon is on screen.
 */
export function thumbnailIcon(node, { size, fallback }) {
  if (!canThumbnail(node)) return fallback;
  const box = h('span', { class: 'icon-thumb-box' }, fallback);
  whenShown(box, () => fileThumbnail(node, size * (window.devicePixelRatio || 1)).then(url => {
    if (!url || !box.isConnected) return;
    const img = h('img', { class: 'icon-thumb', src: url, alt: '', draggable: 'false' });
    img.decode().then(() => {
      box.replaceChildren(img);
      box.classList.add('shown');
    }, () => {});
  }));
  return box;
}
