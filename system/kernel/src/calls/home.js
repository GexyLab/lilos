import { extname } from 'node:path';
import { fail } from '../errors.js';
import { openHome } from '../api/home.js';
import { defineStrings } from '../strings.js';

const { t } = defineStrings('lilos:kernel.calls.home', { en: { strings: {
  path: 'Path not valid: {path}',
  notFound: 'Not found: {path}',
  gone: 'The file is no longer there',
  notFile: 'Not a file: {path}',
  tooBig: 'File too large (50 MB at most): {path}',
} } });

/**
 * Files of the user's home that a NetTest request sends (a body, a field of a form, a client
 * certificate) and collection files the kernel runs on its own (Pianificazione, the Terminal), by
 * path ('~/Documenti/foto.png'): a path still means something in a .nettest file passed to someone
 * else, an id would not. The fs service checks what the user may read.
 */
const MAX_FILE = 50 << 20;
const TYPES = {
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.csv': 'text/csv', '.html': 'text/html',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.gz': 'application/gzip', '.proto': 'text/plain', '.pem': 'application/x-pem-file',
};

export const typeOf = name => TYPES[extname(String(name)).toLowerCase()] ?? 'application/octet-stream';

/** The node at a path of the home, with the view it was found in. */
export async function homeNode(ctx, path) {
  // Not the hidden ones (lilOS's .config, .trash): a collection passed by someone else could name them
  if (typeof path !== 'string' || !/^~(\/[^/\0]{1,255}){1,32}$/.test(path) || path.split('/').slice(1).some(p => p.startsWith('.'))) fail('invalid', t('path', { path: String(path).slice(0, 100) }));
  const view = await openHome(ctx.kernel, ctx.principal);
  let node = { id: view.homeId, type: 'folder' };
  for (const name of path.split('/').slice(1)) {
    if (node.type !== 'folder') fail('not_found', t('notFound', { path }));
    const children = await view.fs.list(ctx.principal, node.id);
    node = children.find(n => n.name === name) ?? children.find(n => n.name.toLowerCase() === name.toLowerCase());
    if (!node) fail('not_found', t('notFound', { path }));
  }
  return { view, node };
}

/** The node of an id as lilOS's page knows it (FRONT_ID; the scheduler keeps those). */
export async function frontNode(kernel, principal, id) {
  const view = await openHome(kernel, principal);
  const node = await view.fs.stat(principal, view.toBack(String(id ?? ''), { parent: true }));
  if (!node) fail('not_found', t('gone'));
  return { view, node };
}

/** { name, type, data } of a file of the home. */
export async function readHomeFile(ctx, path) {
  const { view, node } = await homeNode(ctx, path);
  if (node.type !== 'file') fail('invalid', t('notFile', { path }));
  if (node.size > MAX_FILE) fail('too_large', t('tooBig', { path }));
  const data = await view.fs.read(ctx.principal, node.id);
  return { name: node.name, type: typeOf(node.name), data };
}
