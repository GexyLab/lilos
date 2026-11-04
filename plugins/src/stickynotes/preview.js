import { previewHandler, canvasToImage } from '../shared/preview.js';
import { COLORS, INK, parse, plain } from './note.js';

/**
 * The preview of a note for lilOS (the `filePreview` entry point): the paper in its color with the
 * title and the first lines, as an image `size` pixels on its longest side (square, like the
 * notes). The File Manager shows it in its preview panel and as the file's icon.
 */
const READ = 16 << 10;

export function filePreview({ lilos }) {
  previewHandler(lilos, async (file, size) => {
    const info = await lilos.files.info(file);
    const text = info.size ? new TextDecoder().decode(await new Blob([await lilos.files.read(file, { bytes: true })]).slice(0, READ).arrayBuffer()) : '';
    if (text.includes('\0')) return null;
    const color = COLORS[info.meta?.color] ?? COLORS.yellow;
    return { image: await canvasToImage(paper(parse(text), color, size)) };
  }, { size: 512 });
}

function paper({ title, body }, color, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const pad = Math.round(size * 0.08);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';
  const font = Math.max(6, size / 13);
  const step = font * 1.35;
  const width = size - pad * 2;
  let y = pad;
  const line = (text, { bold = false, mark = '' } = {}) => {
    if (y + step > size - pad / 2) return;
    ctx.font = `${bold ? 700 : 400} ${bold ? font * 1.08 : font}px Manrope, system-ui, sans-serif`;
    let s = mark + plain(text);
    while (s && ctx.measureText(s).width > width) s = s.slice(0, -2) + '…';
    ctx.globalAlpha = mark === '☑ ' ? 0.6 : 1;
    ctx.fillText(s, pad, y);
    ctx.globalAlpha = 1;
    y += step;
  };
  if (title) line(title, { bold: true });
  for (const l of body) line(l.text, { mark: l.kind === 'check' ? (l.done ? '☑ ' : '☐ ') : l.kind === 'bullet' ? '• ' : '' });
  return canvas;
}

