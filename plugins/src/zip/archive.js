import { zipSync, unzipSync } from 'fflate';

/**
 * Making and opening .zip archives with lilOS's files (only `lilos`, no DOM: it also runs in a
 * Web Worker). The app works with paths ('~/Documenti/a.txt', permission fs.write:~): an item it
 * is handed is known by id, what is inside a folder and next to it only by path.
 *
 * Errors are Error(code) with a `detail` (a name, a size): the windows and the notifications put
 * them in words (locales.json, error.<code>).
 */
export const MAX_FILE = 10 << 20;      // lilOS saves files up to 10 MB (methods.js MAX_BYTES)
export const MAX_TOTAL = 256 << 20;    // what is read or unpacked at once, in memory
export const MAX_ENTRIES = 10000;

// Already compressed: stored as they are, packing them again only takes time
const STORED = new Set(['zip', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'mp3', 'm4a', 'aac', 'ogg', 'opus', 'flac', 'mp4', 'm4v', 'mov', 'webm', 'mkv', 'woff', 'woff2', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'epub']);
// What other systems put in archives and nobody wants back
const JUNK = /^(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)$/i;

const fail = (code, detail) => Object.assign(new Error(code), { detail });

const extOf = name => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : '';
};
const baseOf = name => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
};

/** A name as lilOS keeps it (fs.js checkName): spaces in one, no '/'. '' when nothing is left. */
const cleanName = name => String(name).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 255);

/**
 * `name`, or `name 2.ext`, `name 3.ext`… if `taken` (lower-case names) has it, like lilOS's
 * fs.uniqueName: for names inside an archive (lilOS gives the free names of what is saved,
 * files.write and files.mkdir with `unique`). The name it gives back is added to `taken`.
 */
function unique(name, taken, { folder = false } = {}) {
  const ext = folder ? '' : extOf(name);
  const base = ext ? name.slice(0, -(ext.length + 1)) : name;
  let out = name;
  for (let n = 2; taken.has(out.toLowerCase()); n++) out = `${base} ${n}${ext ? `.${ext}` : ''}`;
  taken.add(out.toLowerCase());
  return out;
}

/** The '~' path of an item (files.info gives it: what the files.* calls take). */
const refOf = info => info.ref ?? fail('outside', info.path);
/** The folder of a '~' path. */
const parent = ref => ref.slice(0, ref.lastIndexOf('/')) || '~';

const bytes = async (lilos, ref) => new Uint8Array(await (await lilos.files.read(ref, { bytes: true })).arrayBuffer());

/** Zip dates go from 1980 to 2099 (fflate). */
const mtime = ms => new Date(Math.min(Math.max(Number.isFinite(ms) ? ms : Date.now(), Date.UTC(1980, 0, 2)), Date.UTC(2099, 11, 30)));

/**
 * Packs these items (ids of files and folders, in one folder) into a new .zip next to the first:
 * '<name>.zip' for one item, '<archiveName>.zip' for more (with a number if the name is taken).
 * → { name, ref, id, count, size }
 */
export async function pack(lilos, ids, { archiveName = 'Archive', onProgress } = {}) {
  const top = (await Promise.all(ids.map(id => lilos.files.info(id)))).map(i => ({ ...i, ref: refOf(i) }));
  if (!top.length) throw fail('nothing');
  const dir = parent(top[0].ref);

  const tree = {};   // fflate's: { name: [bytes, options] } for a file, { … } for a folder
  let total = 0, count = 0;
  const add = async (node, name, item, ref) => {
    if (item.type === 'folder') {
      const box = (node[name] = {});
      for (const child of await lilos.files.list(ref)) {
        if (child.type === 'file' || child.type === 'folder') await add(box, child.name, child, `${ref}/${child.name}`);
      }
      return;
    }
    if (item.type !== 'file') return;
    if (++count > MAX_ENTRIES) throw fail('tooMany', MAX_ENTRIES);
    total += item.size ?? 0;
    if (total > MAX_TOTAL) throw fail('tooBig', MAX_TOTAL);
    onProgress?.({ count, name });
    const data = await bytes(lilos, ref).catch(err => { throw fail('read', `${name}: ${err?.message ?? err}`); });
    node[name] = [data, { mtime: mtime(item.modified), level: STORED.has(extOf(name).toLowerCase()) ? 0 : 6 }];
  };
  // Items of different folders (a selection in a tree) may have the same name
  const topNames = new Set();
  for (const item of top) await add(tree, unique(item.name, topNames, { folder: item.type === 'folder' }), item, item.ref);

  const zipped = zipSync(tree);
  if (zipped.byteLength > MAX_FILE) throw fail('resultTooBig', zipped.byteLength);
  const first = top[0];
  const wanted = top.length === 1 ? (first.type === 'folder' ? first.name : baseOf(first.name)) : archiveName;
  const made = await lilos.files.write(`${dir}/${wanted}.zip`, zipped, { unique: true });
  return { name: made.name, ref: made.ref, id: made.id, count, size: zipped.byteLength };
}

/** 'a//b\\c.txt' → ['a', 'b', 'c.txt'] (names as lilOS keeps them), null if unsafe. */
function safePath(raw) {
  const parts = raw.split(/[/\\]+/).filter(p => p !== '' && p !== '.');
  if (parts.includes('..')) return null;
  const path = parts.map(cleanName);
  return path.some(p => !p) ? null : path;
}

/**
 * Names of the entries protected by a password (flag bit 0, ZipCrypto or AES): fflate does not
 * look at it, and would give their encrypted bytes as content. Names decoded as fflate does.
 */
function encrypted(data) {
  const out = new Set();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = data.length - 22;
  while (end >= 0 && data.length - end <= 65557 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0 || data.length - end > 65557) return out;
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < count && at + 46 <= data.length && view.getUint32(at, true) === 0x02014b50; i++) {
    const flags = view.getUint16(at + 8, true), name = view.getUint16(at + 28, true);
    if (flags & 1) {
      const bytes = data.subarray(at + 46, at + 46 + name);
      out.add(flags & 0x800 ? new TextDecoder().decode(bytes) : String.fromCharCode(...bytes));
    }
    at += 46 + name + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return out;
}

/**
 * What is in an archive (the bytes of a .zip), without unpacking it:
 * → { entries: [{ raw, path: ['a', 'b.txt'], folder, size }], skipped: [{ name, why }] }
 * Paths are made safe: no '..', no absolute paths. raw: the name in the archive.
 */
export function read(data) {
  const entries = [], skipped = [];
  let total = 0;
  try {
    const locked = encrypted(data);
    unzipSync(data, {
      filter: f => {
        const folder = /[/\\]$/.test(f.name);
        const path = safePath(f.name);
        if (!path) { skipped.push({ name: f.name, why: 'unsafe' }); return false; }
        if (!path.length || path.some(p => JUNK.test(p))) return false;
        if (locked.has(f.name)) { skipped.push({ name: f.name, why: 'encrypted' }); return false; }
        if (f.compression !== 0 && f.compression !== 8) { skipped.push({ name: f.name, why: 'method' }); return false; }
        if (!folder && f.originalSize > MAX_FILE) { skipped.push({ name: f.name, why: 'big' }); return false; }
        if (entries.length >= MAX_ENTRIES) throw fail('tooMany', MAX_ENTRIES);
        total += folder ? 0 : f.originalSize;
        if (total > MAX_TOTAL) throw fail('tooBig', MAX_TOTAL);
        entries.push({ raw: f.name, path, folder, size: folder ? 0 : f.originalSize });
        return false;   // only looking
      },
    });
  } catch (err) {
    if (err?.detail !== undefined) throw err;
    throw fail('corrupt', err?.message ?? String(err));
  }
  return { entries, skipped };
}

/**
 * Unpacks a .zip (a file id or a '~' path) next to it. An archive with a single folder at the top
 * gives that folder; otherwise a new folder named as the archive holds everything. Names already
 * taken get a number: nothing is ever overwritten.
 * → { name, ref, id, count, skipped: [{ name, why }] }
 */
export async function unpack(lilos, file, { onProgress } = {}) {
  const info = await lilos.files.info(file);
  if (info.type !== 'file') throw fail('notZip', info.name);
  const data = await bytes(lilos, file).catch(err => { throw fail('read', `${info.name}: ${err?.message ?? err}`); });
  const { entries, skipped } = read(data);
  if (!entries.length) throw fail(skipped.length ? 'skippedAll' : 'empty', info.name);

  const single = new Set(entries.map(e => e.path[0].toLowerCase())).size === 1 && entries.every(e => e.path.length > 1 || e.folder);
  const dir = parent(refOf(info));
  const made = await lilos.files.mkdir(`${dir}/${cleanName(single ? entries[0].path[0] : baseOf(info.name)) || 'Archive'}`, { unique: true });
  const root = made.ref;

  // Where each folder of the archive goes, chosen once; names that differ only by case (lilOS
  // does not tell them apart) get a number
  const folders = new Map();   // archive folder, lower case → its path
  const names = new Map();     // path of a folder → lower-case names taken in it
  const taken = at => names.get(at) ?? names.set(at, new Set()).get(at);
  const folderAt = parts => {
    let at = root;
    for (let i = 0; i < parts.length; i++) {
      const key = parts.slice(0, i + 1).join('/').toLowerCase();
      if (!folders.has(key)) folders.set(key, `${at}/${unique(parts[i], taken(at), { folder: true })}`);
      at = folders.get(key);
    }
    return at;
  };
  const targets = new Map();   // raw name in the archive → path of the file
  for (const e of entries) {
    const inner = single ? e.path.slice(1) : e.path;
    if (e.folder) folderAt(inner);
    else {
      const at = folderAt(inner.slice(0, -1));
      targets.set(e.raw, `${at}/${unique(inner.at(-1), taken(at))}`);
    }
  }
  // A parent always comes before its folders in the map
  for (const d of folders.values()) await lilos.files.mkdir(d);

  let count = 0;
  const contents = unzipSync(data, { filter: f => targets.has(f.name) });
  for (const [raw, content] of Object.entries(contents)) {
    const target = targets.get(raw);
    onProgress?.({ count: count + 1, name: target.slice(target.lastIndexOf('/') + 1) });
    await lilos.files.write(target, content);
    count++;
  }
  return { name: made.name, ref: root, id: made.id, count, skipped };
}
