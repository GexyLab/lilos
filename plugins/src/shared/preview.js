/**
 * What every app's `filePreview` entry point shares (see lilOS's apps/filePreview.js): lilOS asks
 * it for the File Manager's preview panel and for the thumbnails of the icons, with the file and
 * `size`, the longest side it wants in pixels. No SDK here: it runs in the app's background.
 *
 *   export function filePreview({ lilos }) {
 *     previewHandler(lilos, async (file, size) => {
 *       const canvas = …;                                   // drawn `size` pixels on its longest side
 *       return { image: await canvasToImage(canvas), note: '…' };   // or null: lilOS shows its own
 *     }, { size: 512 });
 *   }
 */

/** The limits of the size lilOS may ask for. */
export const PREVIEW_MIN = 16;
export const PREVIEW_MAX = 2048;
/** The size when lilOS does not say. */
export const PREVIEW_SIZE = 1024;

/** The size asked for, rounded and kept within the limits; `fallback` when it is not a number. */
export const clampSize = (size, fallback = PREVIEW_SIZE) => (Number.isFinite(size) ? Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, Math.round(size))) : fallback);

/**
 * Answers lilOS's calls: render(file, size) for each one with a file (a string id), null for any
 * other call. render resolves { image: Blob, note? } or null (lilOS then shows its own preview).
 *   size   the longest side when lilOS does not say (default 1024)
 */
export function previewHandler(lilos, render, { size = PREVIEW_SIZE } = {}) {
  lilos.handle(async data => {
    if (typeof data?.file !== 'string') return null;
    return render(data.file, clampSize(data.size, size));
  });
}

/**
 * A canvas (or an image, an ImageBitmap: drawn on a canvas first) as a WebP image, or a PNG where
 * the browser cannot write WebP.
 */
export async function canvasToImage(source, quality = 0.85) {
  let canvas = source;
  if (typeof canvas?.toBlob !== 'function') {
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, source.width);
    canvas.height = Math.max(1, source.height);
    canvas.getContext('2d').drawImage(source, 0, 0);
  }
  const encode = type => new Promise(resolve => canvas.toBlob(resolve, type, quality));
  const webp = await encode('image/webp');
  return webp?.type === 'image/webp' ? webp : encode('image/png');
}
