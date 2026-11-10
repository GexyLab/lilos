/**
 * The preview of a .nwsession file for lilOS (the `filePreview` entry point, see lilOS's
 * apps/filePreview.js): a tile with the number of tabs, and as the note the session's name and
 * the sites of its first tabs. Runs in the app's background, without the SDK.
 */
import { previewHandler, canvasToImage } from '../shared/preview.js';

const TILE = '#1f8fbf';

function parse(text) {
  const raw = JSON.parse(String(text).slice(0, 2 << 20));
  if (raw?.format !== 'netwave-session' || !Array.isArray(raw.tabs)) throw new Error('not a session');
  return raw;
}

const hostOf = url => { try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; } };

export function filePreview({ lilos }) {
  previewHandler(lilos, async (file, size) => {
    let s;
    try { s = parse(await lilos.files.read(file)); } catch { return null; }
    const hosts = [...new Set(s.tabs.map(x => hostOf(x?.url)).filter(Boolean))];
    const sites = hosts.slice(0, 4).join(' · ') + (hosts.length > 4 ? ' …' : '');
    return { image: await canvasToImage(draw(s.tabs.length, size), 0.9), note: [typeof s.name === 'string' ? s.name.slice(0, 120) : '', sites].filter(Boolean).join(' — ') };
  }, { size: 512 });
}

function draw(n, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const s = size / 100;
  ctx.fillStyle = TILE;
  ctx.fillRect(14 * s, 10 * s, 72 * s, 72 * s);
  // Three tabs over a window: a session
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.55;
  ctx.fillRect(24 * s, 24 * s, 14 * s, 7 * s);
  ctx.fillRect(40 * s, 24 * s, 14 * s, 7 * s);
  ctx.globalAlpha = 1;
  ctx.fillRect(56 * s, 24 * s, 20 * s, 7 * s);
  ctx.fillRect(24 * s, 31 * s, 52 * s, 36 * s);
  ctx.strokeStyle = TILE;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // A wave across the page
  ctx.moveTo(30 * s, 52 * s);
  ctx.bezierCurveTo(38 * s, 40 * s, 44 * s, 64 * s, 50 * s, 52 * s);
  ctx.bezierCurveTo(56 * s, 40 * s, 62 * s, 64 * s, 70 * s, 52 * s);
  ctx.stroke();
  const text = String(n);
  ctx.font = `700 ${13 * s}px system-ui, "Segoe UI", sans-serif`;
  const w = ctx.measureText(text).width + 10 * s;
  const x = 86 * s - w / 2, y = 74 * s, hgt = 19 * s;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 1.5 * s, y - 1.5 * s, w + 3 * s, hgt + 3 * s);
  ctx.fillStyle = '#d6eef8';
  ctx.fillRect(x, y, w, hgt);
  ctx.fillStyle = '#0f5f80';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 5 * s, y + hgt / 2 + 0.5 * s);
  return canvas;
}
