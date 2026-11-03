/**
 * Images as canvases: reading a file, the formats a browser can write, resizing, cropping.
 */
import { t } from './i18n.js';
import { contributes } from './app.json';

/** Formats Photo writes. JPEG has no transparency: what is transparent becomes white. note: a sentence about it, in the system's language. */
export const FORMATS = [
  { id: 'png', label: 'PNG', type: 'image/png', ext: 'png', lossy: false, get note() { return t('format.png.note'); } },
  { id: 'jpeg', label: 'JPEG', type: 'image/jpeg', ext: 'jpg', lossy: true, get note() { return t('format.jpeg.note'); } },
  { id: 'webp', label: 'WebP', type: 'image/webp', ext: 'webp', lossy: true, get note() { return t('format.webp.note'); } },
];

/** Extensions Photo opens (its manifest's file types); only some of them it can also write (formatOf). */
export const OPENS = contributes.fileTypes;

const BY_EXT = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp' };
const LABELS = { png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', gif: 'GIF', webp: 'WebP', bmp: 'BMP', avif: 'AVIF', ico: 'ICO', svg: 'SVG' };

export const extOf = name => (/\.([^.]+)$/.exec(name)?.[1] ?? '').toLowerCase();
export const labelOf = name => LABELS[extOf(name)] ?? (extOf(name).toUpperCase() || t('format.generic'));

/** The format to save a file with that name in, or null when it cannot be written back (GIF, SVG…). */
export function formatOf(name) {
  const f = FORMATS.find(x => x.id === BY_EXT[extOf(name)]);
  return f && supported(f) ? f : null;
}

const support = new Map();
/** Can this browser write the format? (Asking for one it cannot write gives a PNG.) */
export function supported(format) {
  if (!support.has(format.id)) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    support.set(format.id, c.toDataURL(format.type).startsWith(`data:${format.type}`));
  }
  return support.get(format.id);
}

export function canvasOf(width, height) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function copyOf(source) {
  const c = canvasOf(source.width, source.height);
  c.getContext('2d').drawImage(source, 0, 0);
  return c;
}

/** Draws an image file (a Blob) on a new canvas. Throws if the browser cannot decode it. */
export async function decode(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // An SVG without a size has none: use the browser's default for replaced elements
    const width = img.naturalWidth || 300, height = img.naturalHeight || 150;
    const c = canvasOf(width, height);
    c.getContext('2d').drawImage(img, 0, 0, width, height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The canvas as a file of `format`; quality 0–1 for JPEG and WebP. */
export function encode(canvas, format, quality = 0.92) {
  let source = canvas;
  if (format.id === 'jpeg') {
    source = canvasOf(canvas.width, canvas.height);
    const ctx = source.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, source.width, source.height);
    ctx.drawImage(canvas, 0, 0);
  }
  return new Promise((resolve, reject) => {
    source.toBlob(blob => (blob ? resolve(blob) : reject(new Error(t('error.tooLarge')))), format.type, format.lossy ? quality : undefined);
  });
}

/**
 * The canvas at a new size. quality: 'high' (halving steps when shrinking a lot, so details do
 * not alias), 'medium', or 'pixel' (no smoothing: crisp pixels, for icons and pixel art).
 */
export function resample(source, width, height, quality = 'high') {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  let current = source;
  if (quality === 'high') {
    while (current.width / 2 >= width && current.height / 2 >= height) {
      const half = canvasOf(current.width / 2, current.height / 2);
      const ctx = half.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(current, 0, 0, half.width, half.height);
      current = half;
    }
  }
  const out = canvasOf(width, height);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = quality !== 'pixel';
  if (quality !== 'pixel') ctx.imageSmoothingQuality = quality === 'high' ? 'high' : 'medium';
  ctx.drawImage(current, 0, 0, width, height);
  return out;
}

/** The part { x, y, width, height } of the canvas. */
export function cropped(source, { x, y, width, height }) {
  const out = canvasOf(width, height);
  out.getContext('2d').drawImage(source, Math.round(x), Math.round(y), out.width, out.height, 0, 0, out.width, out.height);
  return out;
}
