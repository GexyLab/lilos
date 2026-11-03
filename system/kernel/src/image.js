import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { KERNEL } from './services.js';

/**
 * A system image: a lilOS already installed and set up (tools/image.js makes it), to install
 * instead of the official release (lilos-install.json "image"):
 *
 *   image.json            { format: 1, name, description, lilos: version, created, users, nodes, files,
 *                           bytes, settings }   settings: the starting settings of new users there
 *   lilos/                the installed folder: releases/, current.json, config.json, repos.json,
 *                         modules/ (with their data, without node_modules and without sessions), …
 *   fs/nodes.jsonl        the file system, one node a line, parents first:
 *                         { home: userId, id }                       a user's home
 *                         { id, parent, name, type, meta, created, modified, content? }   content: the
 *                         file's name in fs/content
 *   fs/content/<n>        the contents of the files
 *
 * In the file system: the installed apps and the shared libraries (/system/app, /system/commons)
 * and every user's home (files, trash, settings). /system/tmp stays out. tools/install.js puts fs/
 * in <installed folder>/.image, the kernel loads it at its next start (importImage) and deletes it.
 */
export const IMAGE_FORMAT = 1;
export const IMAGE_DIR = '.image';
const ROOTS = ['fs:app', 'fs:commons'];
const BATCH = 200;

const userPrincipal = u => ({ kind: 'user', id: u.id, username: u.username, name: u.name, role: u.role });

/** Writes the file system of `fs` in <out>/fs: { nodes, files, bytes }. users: [{ id, username, name, role }]. */
export async function exportFs(fs, users, out) {
  const dir = join(out, 'fs');
  await mkdir(join(dir, 'content'), { recursive: true });
  const lines = createWriteStream(join(dir, 'nodes.jsonl'));
  const count = { nodes: 0, files: 0, bytes: 0 };
  const put = async (node, skip) => {
    if (skip) return;
    const line = { id: node.id, parent: node.parent, name: node.name, type: node.type, meta: node.meta ?? {}, created: node.created, modified: node.modified };
    if (node.type === 'file') {
      line.content = String(count.files++);
      const source = typeof fs.readStream === 'function' ? await fs.readStream(KERNEL, node.id) : Readable.from([await fs.read(KERNEL, node.id)]);
      await pipeline(source, createWriteStream(join(dir, 'content', line.content)));
      count.bytes += (await stat(join(dir, 'content', line.content))).size;
    }
    count.nodes++;
    if (!lines.write(`${JSON.stringify(line)}\n`)) await new Promise(r => lines.once('drain', r));
  };
  for (const root of ROOTS) {
    for (const node of await fs.tree(KERNEL, root)) await put(node, node.id === root);
  }
  for (const user of users) {
    const home = await fs.home(userPrincipal(user));
    lines.write(`${JSON.stringify({ home: user.id, id: home.id })}\n`);
    for (const node of await fs.tree(KERNEL, home.id)) await put(node, node.id === home.id);
  }
  await new Promise((resolve, reject) => lines.end(err => (err ? reject(err) : resolve())));
  return count;
}

/**
 * Loads <dir>/nodes.jsonl into `fs` (kernel start, after tools/install.js put an image there):
 * homes made again for their users (a home with another id moves its nodes' ids with it), nodes
 * already there written over. users: the users that exist now. { nodes, files, skipped }.
 */
export async function importFs(fs, users, dir, log) {
  const byId = new Map(users.map(u => [u.id, u]));
  const moved = [];   // [old home id + '/', new home id + '/']
  const homes = new Map();   // old home id → new
  const skippedHomes = new Set();
  const count = { nodes: 0, files: 0, skipped: 0 };
  let batch = [], files = [];
  const rename = id => {
    if (homes.has(id)) return homes.get(id);
    const m = moved.find(([from]) => id.startsWith(from));
    return m ? m[1] + id.slice(m[0].length) : id;
  };
  const flush = async () => {
    if (batch.length) await fs.apply(KERNEL, { put: batch });
    for (const { id, file } of files) {
      if (typeof fs.writeFrom === 'function') await fs.writeFrom(KERNEL, id, createReadStream(file));
      else await fs.write(KERNEL, id, await readFile(file));
    }
    count.nodes += batch.length;
    count.files += files.length;
    batch = [];
    files = [];
  };
  const text = await readFile(join(dir, 'nodes.jsonl'), 'utf8');
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const line = JSON.parse(raw);
    if (line.home !== undefined) {
      await flush();
      const user = byId.get(line.home);
      if (!user) {
        skippedHomes.add(line.id);
        log.warn(`Immagine: la home di un utente che non c'è (${line.home}) resta fuori`);
        continue;
      }
      const home = await fs.home(userPrincipal(user));
      homes.set(line.id, home.id);
      if (home.id !== line.id) moved.push([`${line.id}/`, `${home.id}/`]);
      continue;
    }
    if (skippedHomes.has(line.parent) || [...skippedHomes].some(h => line.id.startsWith(`${h}/`))) {
      count.skipped++;
      continue;
    }
    const node = { id: rename(line.id), parent: rename(line.parent), name: line.name, type: line.type, meta: line.meta ?? {}, created: line.created, modified: line.modified };
    batch.push(node);
    if (line.content !== undefined) files.push({ id: node.id, file: join(dir, 'content', String(line.content)) });
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  return count;
}

/** The image of a lilOS waiting in <data>/.image (tools/install.js), loaded and deleted: null when there is none. */
export async function importImage(fs, users, dataDir, log) {
  const dir = join(dataDir, IMAGE_DIR, 'fs');
  if (!(await stat(join(dir, 'nodes.jsonl')).catch(() => null))) return null;
  log.info('Immagine del sistema: carico file, app e home degli utenti…');
  const count = await importFs(fs, users, dir, log);
  await rm(join(dataDir, IMAGE_DIR), { recursive: true, force: true });
  log.info(`Immagine del sistema caricata: ${count.nodes} elementi, ${count.files} file${count.skipped ? ` (${count.skipped} fuori: utenti che non ci sono)` : ''}`);
  return count;
}

/** image.json of an image folder, checked. */
export async function readImage(dir) {
  let info;
  try {
    info = JSON.parse(await readFile(join(dir, 'image.json'), 'utf8'));
  } catch {
    throw new Error(`${dir}: non è un'immagine di lilOS (manca image.json)`);
  }
  if (info?.format !== IMAGE_FORMAT) throw new Error(`${dir}: immagine nel formato ${info?.format}, questa versione legge il formato ${IMAGE_FORMAT}`);
  if (!(await stat(join(dir, 'lilos', 'current.json')).catch(() => null))) throw new Error(`${dir}: nell'immagine manca lilos/current.json`);
  return info;
}

export const writeImageInfo = (out, info) => writeFile(join(out, 'image.json'), `${JSON.stringify({ format: IMAGE_FORMAT, ...info }, null, 2)}\n`);
