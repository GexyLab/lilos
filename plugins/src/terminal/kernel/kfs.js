/**
 * The file system the Terminal's shell sees when it runs in the kernel (the scheduler's «Comando
 * del Terminale»): the same methods as the SDK's fs that the shell and its commands use, over the
 * user's home as the kernel keeps it. The tree is loaded once (lilos.home.load); changes of the
 * tree are sent in batches (home.sync) before a content is read or written and at the end of a
 * run; contents go one by one (home.read / home.write, base64). No pipes and no apps here: a file
 * an app protects (an encrypted one) cannot be read or written, and the kernel says why.
 * Without workspaces: private folders of a workspace are not seen.
 *
 * There is no Blob in the kernel's isolate: readBlob() gives { size, type, base64, text() }, and
 * write() takes it back as it is.
 */
const ROOT = 'root';
const TRASH = 'trash';
const MAX_NAME = 255;
const TAG_ID = /^[\w-]{1,40}$/;

const splitName = name => { const dot = name.lastIndexOf('.'); return dot > 0 ? [name.slice(0, dot), name.slice(dot + 1)] : [name, '']; };
const copy = n => JSON.parse(JSON.stringify(n));
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const utf8Length = s => { let n = 0; for (const ch of String(s)) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; } return n; };

/** base64 ⇄ text (UTF-8), without TextEncoder, Buffer or atob (none in the isolate). */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bytesOf(text) {
  const out = [];
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
export function toBase64(text) {
  const b = bytesOf(text);
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return s;
}
export function fromBase64(s) {
  const clean = String(s).replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    bytes.push((n >> 16) & 255);
    if (clean[i + 2] !== undefined) bytes.push((n >> 8) & 255);
    if (clean[i + 3] !== undefined) bytes.push(n & 255);
  }
  let out = '';
  for (let i = 0; i < bytes.length;) {
    const c = bytes[i];
    let cp, len;
    if (c < 0x80) { cp = c; len = 1; }
    else if (c >> 5 === 6) { cp = ((c & 31) << 6) | (bytes[i + 1] & 63); len = 2; }
    else if (c >> 4 === 14) { cp = ((c & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); len = 3; }
    else { cp = ((c & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); len = 4; }
    out += String.fromCodePoint(cp);
    i += len;
  }
  return out;
}
const sizeOf64 = s => Math.floor((String(s).replace(/=+$/, '').length * 3) / 4);

export function kernelFs(lilos) {
  const nodes = new Map();
  let home = '/home';
  const dirty = new Set();
  const gone = new Set();

  const find = id => {
    const n = nodes.get(id);
    if (!n || id === TRASH) return null;
    for (let p = n; p; p = nodes.get(p.parent)) { if (p.parent === TRASH || p.private) return null; if (p.id === ROOT) return n; }
    return null;
  };
  const touched = n => { dirty.add(n.id); gone.delete(n.id); };
  const descendants = id => [...nodes.values()].filter(n => n.parent === id).flatMap(c => [c.id, ...descendants(c.id)]);
  const unique = (parentId, name, exceptId) => {
    const taken = new Set([...nodes.values()].filter(n => n.parent === parentId && n.id !== exceptId).map(n => n.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    const [base, ext] = splitName(name);
    for (let i = 2; ; i++) { const c = ext ? `${base} ${i}.${ext}` : `${base} ${i}`; if (!taken.has(c.toLowerCase())) return c; }
  };
  const checkName = name => {
    const v = String(name ?? '').trim();
    if (!v || v.length > MAX_NAME || v.includes('/') || v === '.' || v === '..') throw new Error(`Nome non valido: ${v.slice(0, 40)}`);
    return v;
  };
  const editable = id => {
    const n = find(id);
    if (!n) throw new Error('Elemento inesistente');
    if (n.system || id === ROOT) throw new Error('Gli elementi di sistema non si possono modificare');
    return n;
  };
  const file = id => { const n = find(id); if (!n || n.type !== 'file') throw new Error('Il file non esiste'); return n; };
  const touch = (id, time) => { const n = nodes.get(id); if (n && id !== ROOT && id !== TRASH) { n.modified = time; touched(n); } };

  const fs = {
    get root() { return ROOT; },
    get trashRoot() { return TRASH; },
    get workspace() { return null; },
    get home() { return home; },
    loaded: true,

    async load() {
      const data = await lilos.home.load();
      home = String(data.home || '/home').replace(/\/+$/, '');
      nodes.clear();
      nodes.set(ROOT, { id: ROOT, type: 'folder', name: '', parent: null, created: 0, modified: 0 });
      nodes.set(TRASH, { id: TRASH, type: 'folder', name: '', parent: null, created: 0, modified: 0 });
      for (const n of data.nodes ?? []) nodes.set(n.id, n);
      return data;
    },

    /** The changes of the tree, to the kernel (before contents, and at the end). */
    async flush() {
      if (!dirty.size && !gone.size) return;
      const put = [...dirty].map(id => nodes.get(id)).filter(Boolean).map(copy);
      const remove = [...gone];
      dirty.clear();
      gone.clear();
      await lilos.home.sync({ put, remove });
    },

    get: id => { const n = find(id); return n ? copy(n) : null; },
    exists: id => !!find(id),
    children(id) {
      if (!find(id)) return [];
      return [...nodes.values()].filter(n => n.parent === id && find(n.id)).map(copy);
    },
    ancestors(id) {
      const chain = [];
      if (!find(id)) return chain;
      for (let n = nodes.get(id); n; n = nodes.get(n.parent)) chain.unshift(copy(n));
      return chain;
    },
    path(id) { return [home, ...fs.ancestors(id).slice(1).map(n => n.name)].join('/'); },
    resolve(path) {
      path = String(path);
      const lower = path.toLowerCase(), h = home.toLowerCase();
      if (lower === h || lower.startsWith(`${h}/`)) path = path.slice(home.length);
      else if (path === '~' || path.startsWith('~/')) path = path.slice(1);
      let node = nodes.get(ROOT);
      for (const part of path.split('/').filter(Boolean)) {
        node = [...nodes.values()].find(n => n.parent === node.id && n.name.toLowerCase() === part.toLowerCase() && find(n.id));
        if (!node) return null;
      }
      return copy(node);
    },
    isInside: (id, ancestorId) => fs.ancestors(id).some(n => n.id === ancestorId),
    count(id) { let total = 0; for (const c of fs.children(id)) total += 1 + (c.type === 'folder' ? fs.count(c.id) : 0); return total; },
    uniqueName: (parentId, name, exceptId = null) => unique(parentId, name, exceptId),
    isRemote: () => false,
    netRef: () => null,
    isTrashed: id => nodes.get(id)?.parent === TRASH,

    create(parentId, { type, name, color, size } = {}) {
      const parent = find(parentId);
      if (!parent || parent.type !== 'folder') throw new Error('La cartella di destinazione non esiste');
      if (type !== 'file' && type !== 'folder') throw new Error(`Tipo non valido nel kernel: ${type}`);
      const now = Date.now();
      const node = {
        id: uid(), type, name: '', parent: parentId, created: now, modified: now,
        ...(type === 'file' && { size: Number.isFinite(size) && size >= 0 ? size : 0 }),
        ...(type === 'folder' && typeof color === 'string' && { color }),
      };
      node.name = unique(parentId, checkName(name), null);
      nodes.set(node.id, node);
      touched(node);
      touch(parentId, now);
      return copy(node);
    },
    rename(id, name) {
      const n = editable(id);
      const u = unique(n.parent, checkName(name), id);
      if (u === n.name) return u;
      n.name = u;
      n.modified = Date.now();
      touched(n);
      return u;
    },
    update(id, { color } = {}) {
      const n = find(id);
      if (!n) throw new Error('Elemento inesistente');
      if (n.type === 'folder' && typeof color === 'string') { n.color = color; touched(n); }
    },
    move(id, parentId) {
      const n = editable(id);
      const target = find(parentId);
      if (!target || target.type !== 'folder') throw new Error('La cartella di destinazione non esiste');
      if (fs.isInside(parentId, id)) throw new Error('Una cartella non può andare dentro se stessa');
      if (n.parent === parentId) return n.name;
      const from = n.parent;
      n.name = unique(parentId, n.name, id);
      n.parent = parentId;
      touched(n);
      const now = Date.now();
      touch(from, now);
      touch(parentId, now);
      return n.name;
    },
    remove(id) {
      const n = editable(id);
      const ids = [id, ...descendants(id)];
      if (ids.some(i => nodes.get(i).system)) throw new Error('Contiene cartelle di sistema');
      for (const i of ids) { nodes.delete(i); dirty.delete(i); gone.add(i); }
      touch(n.parent, Date.now());
    },
    trash(ids) {
      const done = [];
      const at = Date.now();
      for (const id of ids) {
        const n = find(id);
        if (!n || n.system || done.includes(id) || descendants(id).some(i => nodes.get(i).system)) continue;
        const from = n.parent;
        n.parent = TRASH;
        n.trashed = { at, from };
        touched(n);
        touch(from, at);
        done.push(id);
      }
      return done;
    },
    trashed() {
      return [...nodes.values()].filter(n => n.parent === TRASH).map(n => {
        const inside = descendants(n.id).map(i => nodes.get(i));
        return { ...copy(n), inside: inside.length, bytes: [n, ...inside].reduce((s, x) => s + (x.size ?? 0), 0) };
      }).sort((a, b) => b.trashed.at - a.trashed.at);
    },
    untrash(ids, parentId = null) {
      const into = parentId == null ? null : find(parentId);
      if (parentId != null && into?.type !== 'folder') return [];
      const out = [];
      for (const id of ids) {
        const n = nodes.get(id);
        if (n?.parent !== TRASH) continue;
        const back = into ?? find(n.trashed?.from);
        const parent = back?.type === 'folder' ? back.id : ROOT;
        delete n.trashed;
        n.parent = parent;
        n.name = unique(parent, n.name, id);
        touched(n);
        out.push({ id, parent });
      }
      return out;
    },
    purge(ids) {
      const list = ids.filter(id => nodes.get(id)?.parent === TRASH);
      for (const id of list) for (const i of [id, ...descendants(id)]) { nodes.delete(i); dirty.delete(i); gone.add(i); }
      return list.length;
    },
    purgeTrash(time = null) {
      return fs.purge([...nodes.values()].filter(n => n.parent === TRASH && (time == null || (n.trashed?.at ?? 0) < time)).map(n => n.id));
    },
    setTags(id, tagIds) {
      const n = editable(id);
      const clean = [...new Set((Array.isArray(tagIds) ? tagIds : []).filter(t => typeof t === 'string' && TAG_ID.test(t)))].slice(0, 30);
      if (clean.join() === (n.tags ?? []).join()) return;
      if (clean.length) n.tags = clean; else delete n.tags;
      touched(n);
    },
    tagged: tagId => [...nodes.values()].filter(n => n.tags?.includes(tagId) && find(n.id)).map(copy),

    async read(id) {
      file(id);
      await fs.flush();
      return fromBase64((await lilos.home.read(id)).base64);
    },
    async readBlob(id, { type = '' } = {}) {
      const n = file(id);
      await fs.flush();
      const base64 = (await lilos.home.read(id)).base64;
      return { size: sizeOf64(base64), type, base64, text: async () => fromBase64(base64), name: n.name };
    },
    async write(id, data) {
      const n = file(id);
      await fs.flush();
      const base64 = data && typeof data === 'object' && typeof data.base64 === 'string' ? data.base64 : toBase64(String(data ?? ''));
      await lilos.home.write(id, { base64 });
      n.size = data && typeof data === 'object' && typeof data.base64 === 'string' ? sizeOf64(base64) : utf8Length(String(data ?? ''));
      n.modified = Date.now();
      touch(n.parent, n.modified);
    },
    async copy(id, parentId, { name } = {}) {
      const source = file(id);
      const blob = await fs.readBlob(id);
      const created = fs.create(parentId, { type: 'file', name: name ?? source.name, size: blob.size });
      const n = nodes.get(created.id);
      if (source.apps) n.apps = copy(source.apps);
      await fs.write(n.id, blob);
      return copy(n);
    },
    async copyContent(fromId, toId) {
      const source = file(fromId);
      const target = file(toId);
      await fs.write(toId, await fs.readBlob(fromId));
      if (source.apps) target.apps = copy(source.apps); else delete target.apps;
      touched(target);
    },
    appMeta: (id, appId) => { const v = find(id)?.apps?.[appId]; return v ? copy(v) : null; },
    on: () => () => {},
  };
  return fs;
}
