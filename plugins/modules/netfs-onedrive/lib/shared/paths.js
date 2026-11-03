// Copy of modules/_shared/paths.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import { netError } from './errors.js';

/**
 * The parts of a folder as the user writes it in a connection's field ('Lavoro/2026/',
 * '\\Lavoro\\2026', ' /a//b '): trimmed, no empty ones. '.', '..' and parts with a character of
 * `bad` (control characters by default) throw 'invalid' with `message`.
 */
export function folderParts(raw, message, bad = /[\0-\x1f]/) {
  const parts = String(raw ?? '').split(/[/\\]+/).map(p => p.trim()).filter(Boolean);
  if (parts.some(p => p === '.' || p === '..' || bad.test(p))) throw netError('invalid', message);
  return parts;
}

/** A path of a connection under its root folder on the server ('/www' + '/a/b' → '/www/a/b'; '/' is the root itself). */
export const under = (root, path) => (root === '/' ? path : path === '/' ? root : `${root}${path}`);
