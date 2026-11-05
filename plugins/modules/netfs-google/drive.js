import { Readable } from 'node:stream';
import { netError } from './lib/shared/errors.js';
import { bearerCall } from './lib/shared/cloud.js';
import { chunks, skipFirst } from './lib/shared/streams.js';
import { folderParts } from './lib/shared/paths.js';
import { sleep } from './lib/shared/time.js';
import { config, pathsOf, tokensOf, label, timedFetch, googleName, named } from './google.js';

/**
 * Google Drive for the Rete folder: service 'netfs.gdrive', see the kernel's net/drivers.js. The
 * user's My Drive, or a shared drive of their organization, through the Drive API v3. Sign-in: the
 * kernel's, with the Google project of Control Panel (google.js).
 *
 * Drive is not a tree of names: items have ids, a folder may hold two items with the same name, a
 * name may have '/'. A folder is read whole and its names made unique for lilOS: the second
 * 'Preventivo.pdf' is 'Preventivo (2).pdf' (with a badge), a '/' is shown as '／'; paths go back
 * to ids through those listings (kept a few seconds). Google's own documents (Docs, Sheets,
 * Slides, Drawings) have no bytes: they are entries with `web` (they open on Google) and `export`
 * (copied as .docx/.xlsx/.pptx, or OpenDocument or PDF as the settings say; Google exports up to
 * 10 MB); Forms, Sites, Maps only open on the web. Shortcuts are followed (shown as links, so
 * copies do not walk into them). With the setting on, «Condivisi con me» at the top lists what
 * others shared. Removing goes to Drive's trash. Uploads go in 8 MB pieces (resumable upload), a
 * piece tried again on its own; downloads resume (Range).
 *
 * Settings of Drive: shared, exportFormat ('office' | 'odf' | 'pdf'). For tests only: apiUrl
 * replaces Google's address.
 */
const RETRIES = 4;
const MAX_PAGES = 100;               // 100 × 1000 items in a folder at most
/** Pieces of a resumable upload (pieceMb, lilOS 1.33.0): a whole number of MB, so a multiple of 256 KiB. */
const piece = () => {
  const n = Math.round(Number(config()?.pieceMb));
  return (Number.isFinite(n) && n >= 1 && n <= 1024 ? n : 8) * (1 << 20);
};
const LISTING_LIFE = 10_000;         // a folder read is used for paths this long
const SHARED_NAME = 'Condivisi con me';
const FOLDER = 'application/vnd.google-apps.folder';
const SHORTCUT = 'application/vnd.google-apps.shortcut';
const FIELDS = 'id,name,mimeType,size,modifiedTime,createdTime,shortcutDetails(targetId,targetMimeType),capabilities(canRename,canTrash)';

const apiBase = () => String(config().apiUrl || 'https://www.googleapis.com').replace(/\/+$/, '');
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

/** Google's own documents: what they are, and what they are copied as (per export format). */
const DOCS = {
  'application/vnd.google-apps.document': {
    label: label('Google document', 'Documento Google'),
    office: ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    odf: ['odt', 'application/vnd.oasis.opendocument.text'],
  },
  'application/vnd.google-apps.spreadsheet': {
    label: label('Google spreadsheet', 'Foglio Google'),
    office: ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    odf: ['ods', 'application/vnd.oasis.opendocument.spreadsheet'],
  },
  'application/vnd.google-apps.presentation': {
    label: label('Google presentation', 'Presentazione Google'),
    office: ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    odf: ['odp', 'application/vnd.oasis.opendocument.presentation'],
  },
  'application/vnd.google-apps.drawing': {
    label: label('Google drawing', 'Disegno Google'),
    office: ['pdf', 'application/pdf'],
    odf: ['pdf', 'application/pdf'],
  },
  'application/vnd.google-apps.form': { label: label('Google form', 'Modulo Google') },
  'application/vnd.google-apps.site': { label: label('Google site', 'Sito Google') },
  'application/vnd.google-apps.map': { label: label('Google map', 'Mappa Google') },
  'application/vnd.google-apps.jam': { label: label('Jamboard', 'Jamboard') },
};
const PDF = ['pdf', 'application/pdf'];

/** What a Google document is copied as: [extension, MIME type] or null (web only). */
function exportOf(mime) {
  const doc = DOCS[mime];
  if (!doc?.office) return null;
  if (config().exportFormat === 'pdf') return PDF;
  return config().exportFormat === 'odf' ? doc.odf : doc.office;
}

const isGoogleType = mime => typeof mime === 'string' && mime.startsWith('application/vnd.google-apps.') && mime !== FOLDER && mime !== SHORTCUT;

/** A folder of Drive as the user writes it ('Lavoro/2026/') → ['Lavoro', '2026']. Throws 'invalid'. */
export const cleanRoot = raw => folderParts(raw, 'Cartella di Drive non valida');

// ---------- HTTP ----------

/** A Drive API error → an error with `net`. */
async function apiError(res) {
  const body = await res.json().catch(() => null);
  const reason = String(body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? '');
  const said = String(body?.error?.message ?? '').split(/\r?\n/)[0].slice(0, 240) || `errore ${res.status}`;
  if (res.status === 401) return netError('auth', `Accesso a Google non più valido (${said})`);
  if (reason === 'storageQuotaExceeded' || reason === 'quotaExceeded') return netError('denied', 'Spazio esaurito su Google Drive');
  if (reason === 'exportSizeLimitExceeded') return netError('unsupported', 'Documento troppo grande da esportare (oltre 10 MB): scaricalo da Google');
  if (reason === 'cannotDownloadAbusiveFile') return netError('denied', 'Google blocca il download di questo file');
  if (res.status === 404) return netError('not_found', 'Non esiste su Google Drive');
  if (res.status === 403) return netError('denied', said);
  if (res.status === 409) return netError('exists', said);
  if (res.status === 429 || res.status >= 500) return netError('unreachable', said);
  return netError('invalid', said);
}

const throttled = async res => {
  if (res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) return true;
  if (res.status !== 403) return false;
  const body = await res.clone().json().catch(() => null);
  return ['userRateLimitExceeded', 'rateLimitExceeded'].includes(body?.error?.errors?.[0]?.reason);
};

/** Calls the Drive API with a session's tokens: renews once on 401, waits and tries again when throttled. */
function call(tokens, method, path, { query = {}, body, headers = {}, signal, raw = false, upload = false } = {}) {
  const url = /^https?:\/\//.test(path) ? new URL(path) : new URL(`${apiBase()}${upload ? '/upload' : ''}/drive/v3${path}`);
  if (url.origin !== new URL(apiBase()).origin) throw netError('invalid', 'Indirizzo di Google inatteso');
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  return bearerCall(url, { method, body, headers, signal, raw, accept: raw ? [308] : [] }, { tokens, fetch: timedFetch, error: apiError, retryable: throttled, retries: RETRIES });
}

// ---------- The session ----------

class Session {
  resume = { read: true, write: false };
  #tokens; #driveId; #rootId; #paths; #listings = new Map();   // folder id → { at, byName: Map }

  constructor(tokens, driveId, rootId, paths) {
    this.#tokens = tokens;
    this.#driveId = driveId;
    this.#rootId = rootId;
    this.#paths = paths;
  }

  #api(method, path, opts = {}) {
    return call(this.#tokens, method, path, { ...opts, query: { supportsAllDrives: true, ...opts.query } });
  }

  /** The shared-with-me folder is shown (setting on, My Drive, connection on its top). */
  get #sharedShown() {
    return config().shared !== false && !this.#driveId && this.#rootId === 'root';
  }

  /** Everything in a folder: Drive's items (q: the query), all pages. */
  async #items(q) {
    const out = [];
    let pageToken;
    for (let page = 0; page < MAX_PAGES; page++) {
      const body = await this.#api('GET', '/files', {
        query: {
          q, pageSize: 1000, fields: `nextPageToken,files(${FIELDS})`, orderBy: 'createdTime', pageToken,
          includeItemsFromAllDrives: true, ...(this.#driveId && { corpora: 'drive', driveId: this.#driveId }),
        },
      });
      out.push(...(Array.isArray(body?.files) ? body.files : []));
      pageToken = body?.nextPageToken;
      if (!pageToken) return out;
    }
    throw netError('invalid', 'Cartella troppo grande');
  }

  /**
   * A folder read and named for lilOS: Map shown name → item ({ id, name, mimeType, …, shown,
   * twin }), kept a few seconds. id SHARED: the shared-with-me folder.
   */
  async #listing(folderId, { fresh = false } = {}) {
    const held = this.#listings.get(folderId);
    if (held && !fresh && Date.now() - held.at < LISTING_LIFE) return held.byName;
    const items = folderId === SHARED
      ? await this.#items('sharedWithMe = true and trashed = false')
      : await this.#items(`'${folderId.replace(/['\\]/g, '\\$&')}' in parents and trashed = false`);
    const byName = new Map(), taken = new Set();
    if (folderId === this.#rootId && this.#sharedShown) {
      byName.set(SHARED_NAME, { id: SHARED, mimeType: FOLDER, shown: SHARED_NAME, virtual: true });
      taken.add(SHARED_NAME.toLowerCase());
    }
    for (const it of named(items.filter(i => typeof i?.id === 'string'), i => i.name, taken)) byName.set(it.shown, it);
    this.#listings.set(folderId, { at: Date.now(), byName });
    if (this.#listings.size > 200) this.#listings.delete(this.#listings.keys().next().value);
    return byName;
  }

  #forget(...folderIds) {
    for (const id of folderIds) this.#listings.delete(id);
  }

  /** The item at a path: { id, mimeType, … } (the top: the connection's root), or null. Shortcuts are followed. */
  async #resolve(path) {
    let at = { id: this.#rootId, mimeType: FOLDER, root: true };
    for (const part of path.split('/').filter(Boolean)) {
      const folderId = folderOf(at);
      if (!folderId) return null;
      const hit = (await this.#listing(folderId)).get(part);
      if (!hit) return null;
      at = { ...hit, parentId: folderId };
    }
    return at;
  }

  async #need(path) {
    return await this.#resolve(path) ?? (() => { throw netError('not_found', 'Non esiste su Google Drive'); })();
  }

  #entry(it) {
    const folder = folderOf(it) !== null;
    const e = {
      name: it.shown, type: folder ? 'folder' : 'file',
      size: folder || isGoogleType(it.mimeType) ? 0 : Number(it.size) || 0,
      modified: Date.parse(it.modifiedTime) || 0,
    };
    if (it.mimeType === SHORTCUT && folder) e.link = true;
    const google = isGoogleType(it.mimeType) ? it.mimeType : it.mimeType === SHORTCUT && isGoogleType(it.shortcutDetails?.targetMimeType) ? it.shortcutDetails.targetMimeType : null;
    if (google) {
      e.web = DOCS[google]?.label ?? label('Google file', 'File Google');
      const ex = exportOf(google);
      if (ex) e.export = ex[0];
    }
    if (it.twin) e.badge = label('same name on Drive', 'stesso nome su Drive');
    if (it.virtual) { e.badge = label('shared with me', 'da altri'); e.can = { rename: false, remove: false }; }
    else if (it.capabilities) {
      const can = {};
      if (it.capabilities.canRename === false) can.rename = false;
      if (it.capabilities.canTrash === false) can.remove = false;
      if (Object.keys(can).length) e.can = can;
    }
    return e;
  }

  // ---------- The driver's session ----------

  async list(path) {
    const at = await this.#need(path);
    const folderId = folderOf(at) ?? (() => { throw netError('invalid', 'Non è una cartella'); })();
    return [...(await this.#listing(folderId, { fresh: true })).values()].map(it => this.#entry(it));
  }

  async stat(path) {
    const at = await this.#resolve(path);
    if (!at) return null;
    if (at.root) return { name: '', type: 'folder', size: 0, modified: 0 };
    return this.#entry(at);
  }

  async read(path, { start = 0, signal, format } = {}) {
    const at = await this.#need(path);
    const id = at.mimeType === SHORTCUT ? at.shortcutDetails?.targetId : at.id;
    const mime = at.mimeType === SHORTCUT ? at.shortcutDetails?.targetMimeType : at.mimeType;
    if (folderOf(at)) throw netError('invalid', 'Non è un file');
    if (isGoogleType(mime)) {
      const ex = exportOf(mime);
      if (!ex || (format && format !== ex[0])) throw netError('unsupported', 'Questo documento si apre solo sul web');
      const res = await this.#api('GET', `/files/${encodeURIComponent(id)}/export`, { query: { mimeType: ex[1] }, raw: true, signal });
      return Readable.fromWeb(res.body);
    }
    const res = await this.#api('GET', `/files/${encodeURIComponent(id)}`, { query: { alt: 'media' }, raw: true, signal, headers: start > 0 ? { Range: `bytes=${start}-` } : {} });
    const stream = Readable.fromWeb(res.body);
    return start > 0 && res.status === 200 ? stream.pipe(skipFirst(start)) : stream;
  }

  /** A file from a stream: a new one, or new content for the one with that name (resumable upload in pieces). */
  async write(path, source, { start = 0, signal, size } = {}) {
    if (start > 0) throw netError('unsupported', 'Google Drive non riprende un invio a metà');
    const { parentId, name } = await this.#parentOf(path);
    const existing = (await this.#listing(parentId, { fresh: true })).get(name);
    if (existing && (folderOf(existing) || isGoogleType(existing.mimeType) || existing.mimeType === SHORTCUT)) throw netError('exists', 'C’è già un elemento con questo nome');
    const known = Number.isSafeInteger(size) ? size : null;
    const init = existing
      ? await this.#api('PATCH', `/files/${encodeURIComponent(existing.id)}`, { upload: true, query: { uploadType: 'resumable' }, body: {}, raw: true, signal, headers: known !== null ? { 'X-Upload-Content-Length': String(known) } : {} })
      : await this.#api('POST', '/files', { upload: true, query: { uploadType: 'resumable' }, body: { name: googleName(name), parents: [parentId] }, raw: true, signal, headers: known !== null ? { 'X-Upload-Content-Length': String(known) } : {} });
    await init.body?.cancel().catch(() => {});
    const session = init.headers.get('location');
    if (!session || !/^https?:\/\//.test(session)) throw netError('invalid', 'Google non ha aperto il caricamento');
    try {
      let offset = 0, done = false;
      const it = chunks(source, piece());
      let next = await it.next();
      while (!done) {
        const piece = next.done ? Buffer.alloc(0) : next.value;
        const after = next.done ? { done: true } : await it.next();
        const last = after.done;
        const total = last ? offset + piece.length : '*';
        const range = piece.length ? `bytes ${offset}-${offset + piece.length - 1}/${total}` : `bytes */${total}`;
        for (let attempt = 0; ; attempt++) {
          const res = await call(this.#tokens, 'PUT', session, { body: piece, headers: { 'Content-Range': range }, raw: true, signal }).catch(err => {
            if (attempt < RETRIES && (err.net === 'unreachable' || err.net === 'lost')) return null;
            throw err;
          });
          if (res) {
            await res.body?.cancel().catch(() => {});
            if (res.status === 308 && !last) break;
            if (res.ok && last) { done = true; break; }
            if (res.status === 308 && last) throw netError('lost', 'Google non ha ricevuto tutto il file');
          }
          if (attempt >= RETRIES) throw netError('unreachable', 'Invio interrotto');
          await sleep(2000 * (attempt + 1), signal);
        }
        offset += piece.length;
        next = after;
      }
    } catch (err) {
      timedFetch(session, { method: 'DELETE' }).then(r => r.body?.cancel(), () => {});
      throw err;
    }
    this.#forget(parentId);
  }

  async #parentOf(path) {
    const at = await this.#need(this.#paths.parentOf(path));
    const parentId = folderOf(at);
    if (!parentId) throw netError('invalid', 'Non è una cartella');
    if (parentId === SHARED) throw netError('unsupported', 'In «Condivisi con me» non si crea niente: entra in una cartella condivisa');
    return { parentId, name: this.#paths.baseName(path) };
  }

  async mkdir(path) {
    const { parentId, name } = await this.#parentOf(path);
    if ((await this.#listing(parentId, { fresh: true })).has(name)) throw netError('exists', 'Esiste già su Google Drive');
    await this.#api('POST', '/files', { body: { name: googleName(name), mimeType: FOLDER, parents: [parentId] }, query: { fields: 'id' } });
    this.#forget(parentId);
  }

  async rename(from, to) {
    const it = await this.#need(from);
    if (it.root || it.virtual) throw netError('denied', 'Questa cartella non si rinomina');
    const { parentId, name } = await this.#parentOf(to);
    if ((await this.#listing(parentId, { fresh: true })).has(name)) throw netError('exists', 'Esiste già su Google Drive');
    const query = { fields: 'id' };
    if (parentId !== it.parentId) {
      if (it.parentId === SHARED) throw netError('unsupported', 'Ciò che è condiviso con te non si sposta: copialo');
      Object.assign(query, { addParents: parentId, removeParents: it.parentId });
    }
    await this.#api('PATCH', `/files/${encodeURIComponent(it.id)}`, { query, body: { name: googleName(name) } });
    this.#forget(parentId, it.parentId, it.id);
  }

  /** To Drive's trash (the item itself: a shortcut, not what it points to). */
  async remove(path) {
    const it = await this.#need(path);
    if (it.root || it.virtual) throw netError('denied', 'Questa cartella non si elimina');
    if (it.parentId === SHARED) throw netError('denied', 'Ciò che è condiviso con te non si elimina da qui (si toglie da Condivisi con me sul sito di Google)');
    await this.#api('PATCH', `/files/${encodeURIComponent(it.id)}`, { body: { trashed: true }, query: { fields: 'id' } });
    this.#forget(it.parentId, it.id);
  }

  removeTree(path) {
    return this.remove(path);
  }

  async link(path) {
    const it = await this.#need(path);
    if (it.virtual) return 'https://drive.google.com/drive/shared-with-me';
    if (it.root) return this.#driveId ? `https://drive.google.com/drive/folders/${encodeURIComponent(this.#driveId)}` : 'https://drive.google.com/drive/my-drive';
    const body = await this.#api('GET', `/files/${encodeURIComponent(it.id)}`, { query: { fields: 'webViewLink' } });
    return body?.webViewLink;
  }

  async space() {
    const body = await this.#api('GET', '/about', { query: { fields: 'storageQuota' } });
    return { used: Number(body?.storageQuota?.usage) || 0, total: Number(body?.storageQuota?.limit) || 0 };
  }

  /** The id of the folder at a path (the top of a connection on a folder), or null. */
  async folderIdAt(path) {
    const at = await this.#resolve(path);
    return at ? folderOf(at) : null;
  }

  close() {
    this.#listings.clear();
  }
}

const SHARED = '\u0000shared';
const folderOf = it => (it.mimeType === FOLDER ? it.id : it.mimeType === SHORTCUT && it.shortcutDetails?.targetMimeType === FOLDER ? it.shortcutDetails.targetId : null);

/** The account's shared drives: [{ id, name }]. */
async function sharedDrives(tokens) {
  const out = [];
  let pageToken;
  for (let page = 0; page < 20; page++) {
    const body = await call(tokens, 'GET', '/drives', { query: { pageSize: 100, fields: 'nextPageToken,drives(id,name)', pageToken } });
    out.push(...(Array.isArray(body?.drives) ? body.drives : []).filter(d => typeof d?.id === 'string' && typeof d.name === 'string'));
    pageToken = body?.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

const MY_DRIVE = ['', 'il mio drive', 'my drive'];
const isMyDrive = v => MY_DRIVE.includes(String(v ?? '').trim().toLowerCase());

// ---------- The driver ----------

export const drive = {
  label: label('Google Drive', 'Google Drive'),
  order: 62,
  group: 'cloud',
  links: {},
  recycles: true,
  space: true,
  fields: [
    {
      key: 'account', type: 'signin', label: label('Google account', 'Account Google'), required: true,
      button: label('Sign in with Google', 'Accedi con Google'),
    },
    {
      key: 'share', type: 'text', label: label('Drive', 'Drive'), placeholder: 'Il mio Drive',
      hint: label('Empty: My Drive. Or a shared drive of your organization (List)', 'Vuoto: Il mio Drive. Oppure un Drive condiviso dell’organizzazione (Elenca)'),
    },
    {
      key: 'root', type: 'text', label: label('Folder', 'Cartella'), placeholder: '/',
      hint: label('Optional: only this folder, for example /Work/2026', 'Facoltativo: solo questa cartella, per esempio /Lavoro/2026'),
    },
  ],

  check(v) {
    cleanRoot(v.root);
    if (v.share !== undefined && String(v.share).length > 200) throw netError('invalid', 'Nome del Drive troppo lungo');
  },

  address(v) {
    const root = (() => { try { return cleanRoot(v.root); } catch { return []; } })();
    const drive = isMyDrive(v.share) ? '' : `/${v.share}`;
    return `gdrive://${v.account ?? ''}${drive}${root.length ? `/${root.join('/')}` : ''}`;
  },

  oauth: {
    provider: 'google',
    scopes: [DRIVE_SCOPE],
    /** The account's address; Drive must have been granted whole (Google lets the user untick it). */
    async account({ tokens, granted }) {
      if (granted && !granted.includes(DRIVE_SCOPE)) throw netError('invalid', 'Serve il permesso su tutto Google Drive: riprova e lascia la casella del permesso selezionata');
      const about = await call(tokens, 'GET', '/about', { query: { fields: 'user(emailAddress)' } });
      return String(about?.user?.emailAddress ?? '').trim();
    },
  },

  /** The drives the account can open: My Drive, then its shared drives. */
  async shares(values, ctx = {}) {
    const tokens = tokensOf(ctx);
    return ['Il mio Drive', ...(await sharedDrives(tokens)).map(d => d.name)];
  },

  async connect(values, ctx = {}) {
    const tokens = tokensOf(ctx);
    const paths = pathsOf(ctx);
    await tokens.get();
    let driveId = null;
    if (!isMyDrive(values.share)) {
      const drive = (await sharedDrives(tokens)).find(d => d.name === values.share || d.id === values.share);
      if (!drive) throw netError('not_found', `Drive condiviso «${values.share}» non trovato per questo account`);
      driveId = drive.id;
    }
    let session = new Session(tokens, driveId, driveId ?? 'root', paths);
    const root = cleanRoot(values.root);
    if (root.length) {
      // The folder's id becomes the connection's top
      const id = await session.folderIdAt(`/${root.join('/')}`);
      if (!id || id === SHARED) throw netError('not_found', `La cartella /${root.join('/')} non esiste su Google Drive`);
      session = new Session(tokens, driveId, id, paths);
    }
    await session.list('/');
    return session;
  },
};
