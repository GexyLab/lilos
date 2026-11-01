import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';

/**
 * The page of lilOS, in an installed lilOS: the files of web/ of the release (what Vite builds),
 * for GET and HEAD outside /api. In a copy of the repository Vite serves it instead.
 * Files under assets/ have their hash in the name: kept for good; the rest is asked again each time.
 */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json',
};

export function webFiles(dir) {
  const root = dir.endsWith(sep) ? dir : dir + sep;

  async function find(pathname) {
    let rel;
    try { rel = decodeURIComponent(pathname); } catch { return null; }
    if (rel.includes('\0') || rel.includes('\\') || rel.split('/').some(p => p === '..' || p.startsWith('.') && p.length > 1)) return null;
    if (rel.endsWith('/')) rel += 'index.html';
    const full = join(root, ...rel.split('/').filter(Boolean));
    if (!full.startsWith(root)) return null;
    const s = await stat(full).catch(() => null);
    if (s?.isFile()) return { full, size: s.size, rel };
    // An address of the page that is not a file (no extension): the page
    if (!extname(rel)) {
      const index = join(root, 'index.html');
      const si = await stat(index).catch(() => null);
      return si?.isFile() ? { full: index, size: si.size, rel: '/index.html' } : null;
    }
    return null;
  }

  /** Answers the request when it is for one of the files: false otherwise (the kernel says 404). */
  return async (req, res, pathname) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const file = await find(pathname);
    if (!file) return false;
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file.full).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': String(file.size),
      'Cache-Control': file.rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'no-referrer',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file.full).on('error', () => res.destroy()).pipe(res);
    return true;
  };
}
