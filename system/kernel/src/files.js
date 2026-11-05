import { PassThrough, Readable } from 'node:stream';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { KernelError, fail } from './errors.js';
import { KERNEL } from './services.js';
import { logger } from './log.js';
import { defineStrings, bytes, localize } from './strings.js';

const log = logger('files');
const { t } = defineStrings('lilos:kernel.files', { en: { strings: {
  tooBig: 'File too large ({size}): lilOS saves files up to {max}',
  quota: 'Not enough space: {free} of your space is left',
  quotaNear: 'You have used {percent}% of your space ({used} of {quota})',
  readWhole: 'File too large to read at once ({size}, at most {max})',
  text: 'Text too long ({size}, at most {max})',
  noUpload: 'Upload not found: it ended, or it was idle for too long',
  offset: 'The upload is at byte {received}', uploadSize: 'Size of the upload not valid',
  tooMany: 'Too many uploads at once', notFile: 'Not a file', ended: 'Upload interrupted',
  sizeDiffers: 'More bytes than the size of the upload',
} } });

const isUser = p => p?.kind === 'user' && typeof p.id === 'string';
const UPLOAD_IDLE = 10 * 60_000;
const MAX_UPLOADS = 8;          // per user, at once
const WARN_AT = 0.9;            // a notification when a user passes 90% of their space
const WARN_AGAIN = 0.85;        // … and again once they went back under 85%

/**
 * The kernel's limits on the files of the homes (D85): every write of a user goes through here,
 * whoever makes it (the page, the apps and their services, transfers, scheduled operations).
 *
 *   files.maxFileSize   a file bigger is refused ('too_large')
 *   files.quota         the space of a user (all of their home, trash included): a write that would
 *                       pass it is refused ('quota'); writes that do not grow, and removals, always go
 *
 * The fs service of the module is wrapped: kernel.services 'fs' becomes the guarded one, so every
 * kernel part and module that asks for it later gets it; kernel.fsBase is the module's own (lilOS's
 * own data in ~/.config, the kernel's writes). Writes by streams are counted while they come; the
 * writes of a user in progress add up, so two uploads at once do not both pass the quota.
 * Quotas need fs.usage(principal, userId) (fs-postgres 1.2.0): without it there are none.
 */
export class FileLimits {
  #kernel; #base;
  #pending = new Map();   // user id → Set of { bytes } being written
  #warned = new Set();    // users told they are near the end of their space

  constructor(kernel, base) {
    this.#kernel = kernel;
    this.#base = base;
  }

  get #settings() { return this.#kernel.settings; }

  /** True when the fs module can say how much a user uses (quotas work). */
  get quotas() { return typeof this.#base.usage === 'function'; }

  /** The bytes of a user's home, or null when the fs module cannot say. */
  async used(userId) {
    if (!this.quotas) return null;
    return Number(await this.#base.usage(KERNEL, userId)) || 0;
  }

  /**
   * What a user's write of `id` may add: { maxFile, old, free(self) } (Infinity: no limit). old: the
   * file's size now (a write up to it does not grow the space: it always goes, even past the quota).
   */
  async #room(principal, id) {
    const maxFile = this.#settings.limit('files.maxFileSize');
    const quota = this.#settings.limit('files.quota', principal.id);
    if (quota === Infinity || !this.quotas) return { maxFile, old: 0, free: () => Infinity };
    const [used, old] = await Promise.all([this.used(principal.id), this.#base.stat(principal, id).then(n => n?.size ?? 0, () => 0)]);
    const base = quota - used + old;
    const mine = this.#pending.get(principal.id);
    return { maxFile, old, free: self => base - [...(mine ?? [])].reduce((sum, e) => sum + (e === self ? 0 : e.bytes), 0) };
  }

  /** Throws when `size` bytes do not fit. */
  #check(size, room, self) {
    if (size > room.maxFile) fail('too_large', t('tooBig', { size: bytes(size), max: bytes(room.maxFile) }));
    if (size <= room.old) return;
    const free = room.free(self);
    if (size > free) fail('quota', t('quota', { free: bytes(Math.max(0, free)) }));
  }

  /** Before an upload starts: fails at once when its declared size cannot fit. */
  async precheck(principal, id, size) {
    if (!isUser(principal)) return;
    this.#check(size, await this.#room(principal, id), null);
  }

  /** The guarded fs service: the module's, with write() and writeFrom() checked for users. */
  guarded() {
    const base = this.#base;
    const out = {};
    for (const [name, fn] of Object.entries(base)) if (typeof fn === 'function') out[name] = fn.bind(base);
    out.write = async (principal, id, data) => {
      if (isUser(principal)) this.#check(data?.length ?? 0, await this.#room(principal, id), null);
      await base.write(principal, id, data);
      if (isUser(principal)) this.#after(principal);
    };
    // Always there: without the module's own, the content is gathered and written whole
    out.writeFrom = (principal, id, source, options = {}) => this.writeFrom(principal, id, source, options);
    return Object.freeze(out);
  }

  async writeFrom(principal, id, source, options = {}) {
    const base = this.#base;
    const write = stream => (typeof base.writeFrom === 'function'
      ? base.writeFrom(principal, id, stream, options)
      : gather(stream, this.#settings.limit('files.maxReadWhole')).then(data => base.write(principal, id, data)));
    if (!isUser(principal)) return write(source);
    const room = await this.#room(principal, id);
    if (Number.isSafeInteger(options.size) && options.size >= 0) this.#check(options.size, room, null);
    const entry = { bytes: 0 };
    const mine = this.#pending.get(principal.id) ?? new Set();
    this.#pending.set(principal.id, mine.add(entry));
    const check = size => this.#check(size, room, entry);
    async function* counted() {
      for await (const chunk of source) {
        const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        entry.bytes += piece.length;
        check(entry.bytes);
        yield piece;
      }
    }
    try {
      return await write(Readable.from(counted(), { objectMode: false }));
    } finally {
      mine.delete(entry);
      if (!mine.size) this.#pending.delete(principal.id);
      this.#after(principal);
    }
  }

  /** After a user's write: a notification when they passed 90% of their space (once each time). */
  #after(principal) {
    const quota = this.#settings.limit('files.quota', principal.id);
    if (quota === Infinity || !this.quotas) { this.#warned.delete(principal.id); return; }
    this.used(principal.id).then(async used => {
      const ratio = used / quota;
      if (ratio < WARN_AGAIN) { this.#warned.delete(principal.id); return; }
      if (ratio < WARN_AT || this.#warned.has(principal.id)) return;
      this.#warned.add(principal.id);
      const service = this.#kernel.services.get('notifications');
      if (!service) return;
      const code = await this.#kernel.userLocale(principal.id).catch(() => 'en');
      const text = localize(t('quotaNear', { percent: Math.min(100, Math.floor(ratio * 100)), used: bytes(used), quota: bytes(quota) }), code);
      await service.send(principal.id, { from: { system: true }, level: 'warning', text, action: { entry: 'storage', args: null } });
    }).catch(err => log.warn(`Spazio di ${principal.id}: ${err.message}`));
  }

  /** What GET /api/fs/limits gives a user: the limits that count for them, their quota and space used. */
  async limitsFor(principal) {
    const s = this.#settings;
    const used = isUser(principal) ? await this.used(principal.id).catch(() => null) : null;
    return {
      maxFileSize: s.get('files.maxFileSize'), maxReadWhole: s.get('files.maxReadWhole'), maxText: s.get('files.maxText'),
      uploadPiece: s.get('files.uploadPiece'), cacheMax: s.get('files.cacheMax'),
      quota: this.quotas ? s.get('files.quota', principal?.id) : null, used,
    };
  }

  /** A text read whole (GET /api/fs/content without raw): at most files.maxText. */
  checkText(size) {
    const max = this.#settings.limit('files.maxText');
    if (size > max) fail('too_large', t('text', { size: bytes(size), max: bytes(max) }));
  }
}

/** A stream gathered in memory, at most `max` bytes. */
async function gather(stream, max) {
  const parts = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > max) fail('too_large', t('readWhole', { size: bytes(size), max: bytes(max) }));
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}

/**
 * Uploads in pieces (files.uploadPiece): the page sends a big file with several requests, and one
 * interrupted goes on from the byte the kernel has. The pieces go straight into the stream of
 * fs.writeFrom (no temporary file): the file becomes the new content only when all of it arrived.
 * An upload with no piece for 10 minutes is dropped, and so are all of them when the kernel stops.
 */
export class Uploads {
  #kernel;
  #all = new Map();   // upload id → upload

  constructor(kernel) {
    this.#kernel = kernel;
  }

  /** Starts one: { upload, received: 0, piece }. */
  async start(principal, fs, id, size) {
    if (!Number.isSafeInteger(size) || size < 0) fail('invalid', t('uploadSize'));
    const node = await fs.stat(principal, id) ?? fail('not_found', t('notFile'));
    if (node.type !== 'file') fail('invalid', t('notFile'));
    if ([...this.#all.values()].filter(u => u.owner === principal.id).length >= MAX_UPLOADS) fail('rate_limited', t('tooMany'));
    await this.#kernel.fileLimits.precheck(principal, id, size);
    const controller = new AbortController();
    const stream = new PassThrough({ highWaterMark: 1 << 20 });
    stream.on('error', () => {});   // the fs module gets it while it reads; nobody else must

    const upload = { id: randomUUID(), owner: principal.id, node: id, size, received: 0, stream, controller, timer: null, error: null, busy: false };
    upload.done = fs.writeFrom(principal, id, stream, { signal: controller.signal, size });
    upload.done.catch(err => { upload.error = err; });
    this.#all.set(upload.id, upload);
    this.#idle(upload);
    return { upload: upload.id, received: 0, piece: this.#kernel.settings.get('files.uploadPiece') };
  }

  #idle(upload) {
    clearTimeout(upload.timer);
    upload.timer = setTimeout(() => this.#drop(upload, new KernelError('not_found', t('noUpload'))), UPLOAD_IDLE);
    upload.timer.unref?.();
  }

  #drop(upload, err) {
    clearTimeout(upload.timer);
    this.#all.delete(upload.id);
    upload.controller.abort();
    upload.stream.destroy(err);
  }

  #get(principal, uploadId) {
    const upload = this.#all.get(uploadId);
    if (!upload || upload.owner !== principal?.id) fail('not_found', t('noUpload'));
    return upload;
  }

  /** Where it is: { received, size }. */
  status(principal, uploadId) {
    const u = this.#get(principal, uploadId);
    if (u.error) { this.#drop(u, u.error); throw u.error; }
    return { received: u.received, size: u.size };
  }

  /**
   * A piece from byte `offset` (the bytes the kernel has: another offset fails with 'conflict' and
   * details { received }). The last one waits for the file to be saved: { received, done: true }.
   */
  async piece(principal, uploadId, offset, req) {
    const u = this.#get(principal, uploadId);
    if (u.error) { this.#drop(u, u.error); throw u.error; }
    if (u.busy || offset !== u.received) fail('conflict', t('offset', { received: u.received }), { details: { received: u.received } });
    u.busy = true;
    this.#idle(u);
    const failed = u.done.then(() => null, err => err);
    try {
      for await (const chunk of req) {
        if (u.received + chunk.length > u.size) fail('invalid', t('sizeDiffers'));
        u.received += chunk.length;
        if (!u.stream.write(chunk)) {
          // The fs module reads slower: wait for it, or for its error
          const err = await Promise.race([once(u.stream, 'drain').then(() => null, e => e), failed]);
          if (err) throw err;
        }
        if (u.error) throw u.error;
      }
    } catch (err) {
      u.busy = false;
      // The kernel's refusal (too big, no space, the fs module's error): the upload ends. A request
      // cut off instead keeps the bytes that came: the page asks where it is and goes on
      const fatal = u.error ?? (err instanceof KernelError ? err : null);
      if (fatal) { this.#drop(u, fatal); throw fatal; }
      throw new KernelError('invalid', t('ended'));
    }
    u.busy = false;
    if (u.received < u.size) return { received: u.received };
    clearTimeout(u.timer);
    u.stream.end();
    try {
      await u.done;
    } finally {
      this.#all.delete(u.id);
    }
    return { received: u.received, done: true };
  }

  /** Cancelled by the page. */
  cancel(principal, uploadId) {
    const u = this.#get(principal, uploadId);
    this.#drop(u, new KernelError('invalid', t('ended')));
    u.done.catch(() => {});
  }

  stop() {
    for (const u of [...this.#all.values()]) this.#drop(u, new KernelError('unavailable', t('ended')));
  }
}
