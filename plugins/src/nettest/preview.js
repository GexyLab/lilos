/**
 * The preview of a .nettest file for lilOS (the `filePreview` entry point, see lilOS's
 * apps/filePreview.js): the app's tile with the number of requests, and as the note the
 * collection's name and its protocols. Thumbnails (desk, File Manager) ask for small ones with `size`.
 */
import { previewHandler, canvasToImage } from '../shared/preview.js';
import { parseCollection, walk, protocolOf } from './model.js';

const TILE = '#c2410c';

export function filePreview({ lilos }) {
  previewHandler(lilos, async (file, size) => {
    let c;
    try { c = parseCollection(await lilos.files.read(file)); } catch { return null; }
    let n = 0;
    const protocols = new Set();
    walk(c.items, x => { if (x.type === 'request') { n++; protocols.add(protocolOf(x.protocol).label); } });
    return { image: await canvasToImage(draw(n, size), 0.9), note: [c.name, [...protocols].join(' · ')].filter(Boolean).join(' — ') };
  }, { size: 512 });
}

function draw(n, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const s = size / 100;
  ctx.fillStyle = TILE;
  ctx.fillRect(14 * s, 10 * s, 72 * s, 72 * s);
  // Two arrows, out and back: a request and its answer
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(30 * s, 36 * s); ctx.lineTo(66 * s, 36 * s); ctx.moveTo(56 * s, 26 * s); ctx.lineTo(66 * s, 36 * s); ctx.lineTo(56 * s, 46 * s);
  ctx.moveTo(70 * s, 58 * s); ctx.lineTo(34 * s, 58 * s); ctx.moveTo(44 * s, 48 * s); ctx.lineTo(34 * s, 58 * s); ctx.lineTo(44 * s, 68 * s);
  ctx.stroke();
  const text = String(n);
  ctx.font = `700 ${13 * s}px system-ui, "Segoe UI", sans-serif`;
  const w = ctx.measureText(text).width + 10 * s;
  const x = 86 * s - w / 2, y = 74 * s, hgt = 19 * s;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 1.5 * s, y - 1.5 * s, w + 3 * s, hgt + 3 * s);
  ctx.fillStyle = '#fde3d3';
  ctx.fillRect(x, y, w, hgt);
  ctx.fillStyle = '#9a3412';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 5 * s, y + hgt / 2 + 0.5 * s);
  return canvas;
}
