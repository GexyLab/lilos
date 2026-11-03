import { fs } from '@lilos/sdk';
import { hasGlob, matchPattern, unescapeGlob } from './pattern.js';

/**
 * Paths of the shell over lilOS's file system. The root of lilOS is the user's home: '/home/<user>'
 * connected to the kernel ('~' without), so '/home/eugenio/Documenti', '~/Documenti' and
 * '/Documenti' are the same folder. '.', '..' and relative paths are resolved here (fs.resolve
 * knows only absolute ones); names are case-insensitive like in lilOS.
 */

/** Names from the root to the path ('..' above the root stays at the root). */
export function segments(cwd, path) {
  path = String(path);
  const home = fs.home;
  let rest;
  if (path === '~' || path.startsWith('~/')) rest = path.slice(1);
  else if (path.startsWith('/')) {
    const lower = path.toLowerCase(), h = home.toLowerCase();
    rest = lower === h || lower.startsWith(h + '/') ? path.slice(home.length) : path;
  } else rest = fs.ancestors(cwd).slice(1).map(n => n.name).join('/') + '/' + path;
  const out = [];
  for (const part of rest.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out;
}

/** The node at the path, or null. */
export function resolve(cwd, path) {
  if (path === '') return null;
  return fs.resolve('~/' + segments(cwd, path).join('/'));
}

/** Where a new item would go: { parent (node or null), name }. */
export function locate(cwd, path) {
  const parts = segments(cwd, path);
  const name = parts.pop() ?? '';
  return { parent: fs.resolve('~/' + parts.join('/')), name };
}

const join = (base, name) => (base === '' ? name : base.endsWith('/') ? base + name : `${base}/${name}`);

/**
 * Pathname expansion: the paths matching a pattern (backslash-quoted chars are literal), sorted,
 * written the way the pattern was ('*.txt' gives 'a.txt', '~/D*' gives '/home/eugenio/Documenti').
 * Names starting with '.' match only a pattern part starting with '.'. Empty if nothing matches.
 */
export function glob(cwd, pattern) {
  const absolute = pattern.startsWith('/');
  const parts = pattern.split('/');
  let found = [absolute ? '/' : ''];
  if (absolute) parts.shift();
  let globbed = false;
  parts.forEach(part => {
    if (part === '') return;
    if (!hasGlob(part)) {
      found = found.map(base => join(base, unescapeGlob(part)));
      return;
    }
    globbed = true;
    const next = [];
    for (const base of found) {
      const dir = resolve(cwd, base || '.');
      if (dir?.type !== 'folder') continue;
      const names = fs.children(dir.id).map(n => n.name).filter(name => (name.startsWith('.') ? part.startsWith('.') || part.startsWith('\\.') : true) && matchPattern(part, name));
      names.sort(byName).forEach(name => next.push(join(base, name)));
    }
    found = next;
  });
  if (!globbed) return [];
  if (pattern.endsWith('/')) found = found.filter(p => resolve(cwd, p)?.type === 'folder').map(p => p + '/');
  return found.filter(p => resolve(cwd, p));
}

export const byName = (a, b) => a.localeCompare(b);
