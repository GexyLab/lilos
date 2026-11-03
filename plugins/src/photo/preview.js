/**
 * The preview of an image for lilOS (the `filePreview` entry point, see lilOS's
 * apps/filePreview.js): the image itself, made smaller, as a WebP (PNG where the browser cannot
 * write WebP). lilOS asks it for the File Manager's preview panel and for the thumbnails of the
 * icons; `size` is the longest side it wants, in pixels.
 */
import { previewHandler, canvasToImage } from '../shared/preview.js';
import { OPENS, extOf, decode, resample } from './image.js';

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', ico: 'image/x-icon', svg: 'image/svg+xml' };

export function filePreview({ lilos }) {
  previewHandler(lilos, async (file, size) => {
    const info = await lilos.files.info(file);
    const ext = extOf(info.name);
    if (!OPENS.includes(ext) || !info.size) return null;
    const bytes = await lilos.files.read(file, { bytes: true });
    let image;
    try {
      // The type by the extension: an SVG without it is not drawn as an image
      image = await decode(new Blob([bytes], { type: MIME[ext] }));
    } catch {
      return null;   // not an image the browser can read: the File Manager shows its own preview
    }
    const scale = Math.min(1, size / Math.max(image.width, image.height));
    const small = scale < 1 ? resample(image, image.width * scale, image.height * scale) : image;
    return { image: await canvasToImage(small) };
  });
}
