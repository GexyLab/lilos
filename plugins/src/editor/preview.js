/**
 * The preview of a text file for lilOS (the `filePreview` entry point, see lilOS's
 * apps/filePreview.js): a sheet with the first lines of the file, colored like in the editor
 * (the simple highlighter), as a WebP image (PNG where the browser cannot write WebP). It only has
 * to say what kind of content the file has: lines that do not fit are cut. `size` is the longest
 * side lilOS wants, in pixels.
 */
import { previewHandler, canvasToImage } from '../shared/preview.js';
import { tokenize } from '../shared/highlight.js';
import { getLanguage, languageForName } from './lang/languages.js';

/** Bytes read from the start of the file: more than any sheet shows. */
const READ = 64 << 10;
/** The sheet is 4:5 (width : height); about this many columns fit in its width (fewer on a small one, so lines still show). */
const RATIO = 0.8;
const columnsFor = height => Math.round(Math.min(56, Math.max(24, height / 4)));
const FONT = '"JetBrains Mono", ui-monospace, Consolas, monospace';
// The light theme of the editor (--code, --syn-* in lilOS's tokens): the sheet is always paper
const PAPER = '#ffffff', EDGE = '#d0d7de', TEXT = '#2b3038';
const COLORS = { kw: '#cf222e', st: '#0a3069', nu: '#0550ae', cm: '#6e7781', fn: '#8250df', pr: '#116329', pu: '#953800', ty: '#953800', hd: '#0550ae' };
const STYLES = { cm: 'italic ', it: 'italic ', hd: 'bold ', bd: 'bold ' };

export function filePreview({ lilos }) {
  previewHandler(lilos, async (file, height) => {
    const info = await lilos.files.info(file);
    if (!info.size) return null;   // empty: the File Manager says so itself
    const bytes = await lilos.files.read(file, { bytes: true });
    const head = new Blob([bytes]).slice(0, READ);
    const text = new TextDecoder().decode(await head.arrayBuffer());
    if (text.includes('\0')) return null;   // not text
    // Colored by the simple highlighter, as the Editor colors the file's language with it
    const lang = getLanguage(languageForName(info.name)).simple ?? 'text';
    return { image: await canvasToImage(sheet(text, lang, height)) };
  });
}

/** The lines of the text as [[class | null, text], …] each (tokens split at the line ends). */
function lines(text, lang) {
  const out = [[]];
  for (const [cls, part] of tokenize(text, lang)) {
    part.replace(/\t/g, '    ').split(/\r?\n/).forEach((piece, i) => {
      if (i > 0) out.push([]);
      if (piece) out.at(-1).push([cls, piece]);
    });
  }
  return out;
}

function sheet(text, lang, height) {
  const width = Math.max(1, Math.round(height * RATIO));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const pad = Math.max(1, Math.round(width * 0.06));
  const columns = columnsFor(height);
  const font = Math.max(1, (width - 2 * pad) / (columns * 0.6));
  const step = font * 1.45;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = Math.max(1, width / 256);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);

  ctx.save();
  ctx.beginPath();
  ctx.rect(pad, pad, width - 2 * pad, height - 2 * pad);
  ctx.clip();
  ctx.textBaseline = 'top';
  const rows = Math.ceil((height - 2 * pad) / step);
  lines(text, lang).slice(0, rows).forEach((tokens, row) => {
    let x = pad;
    const y = pad + row * step;
    for (const [cls, part] of tokens) {
      if (x > width - pad) break;
      ctx.font = `${STYLES[cls] ?? ''}${font}px ${FONT}`;
      ctx.fillStyle = COLORS[cls] ?? TEXT;
      const shown = part.slice(0, columns * 2);   // a long line (minified code) is cut anyway
      ctx.fillText(shown, x, y);
      x += ctx.measureText(shown).width;
    }
  });
  ctx.restore();
  return canvas;
}
