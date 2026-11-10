import { Emitter, fs, notifications } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * Files downloaded by the pages of every NetWave window. The program keeps a download in a folder of
 * its own while it arrives; once complete NetWave takes it into the user's Download folder (a name
 * made unique) and tells it with a notification. The last 30 are listed (the toolbar's button).
 *   d: { id, page, name, state: 'progressing' | 'saving' | 'saved' | 'cancelled' | 'failed', received, total, node }
 * Events: 'change'
 */
const MAX = 30;
const NAME_MAX = 150;

/** A name for the Download folder: clean, and not too long (the extension stays). */
function fileName(raw) {
  const name = fs.cleanName(raw) || 'download';
  if (name.length <= NAME_MAX) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 && name.length - dot <= 12 ? name.slice(dot) : '';
  return name.slice(0, NAME_MAX - ext.length) + ext;
}

class Downloads extends Emitter {
  #list = [];
  #unseen = false;
  // One download is saved at a time: a few large ones never sit in memory together
  #queue = Promise.resolve();

  get busy() { return this.#list.some(d => d.state === 'progressing' || d.state === 'saving'); }
  get unseen() { return this.#unseen; }
  seen() { if (this.#unseen) { this.#unseen = false; this.emit('change'); } }
  list() { return this.#list.map(d => ({ ...d })); }

  /** An event 'download' of a page. */
  update(page, e) {
    let d = this.#list.find(x => x.id === e.downloadId);
    if (!d) {
      d = { id: e.downloadId, page, name: e.name || 'download', state: 'progressing', received: 0, total: 0, node: null };
      this.#list.unshift(d);
      this.#list.length = Math.min(this.#list.length, MAX);
    }
    if (d.state !== 'progressing') return;
    d.received = e.received;
    d.total = e.total;
    if (e.state === 'completed') {
      d.state = 'saving';
      this.#queue = this.#queue.then(() => this.#save(d));
    } else if (e.state === 'cancelled') {
      // Not by the user (cancel() marks it first): the program stopped it, or its tab or window closed
      d.state = 'cancelled';
      const why = e.reason === 'tooBig' ? 'download.tooBig' : e.reason === 'busy' ? 'download.busy' : 'download.stopped';
      notifications.send({ text: t(why, { name: d.name }), level: 'warning' });
    } else if (e.state === 'interrupted') {
      d.state = 'failed';
      notifications.send({ text: t('download.failedText', { name: d.name }), level: 'error' });
    }
    this.emit('change');
  }

  async #save(d) {
    try {
      const data = await d.page.download.read(d.id);   // a Blob (an ArrayBuffer with an SDK before 0.23.1)
      const folder = fs.resolve('~/Download') ?? fs.get(fs.root);
      const name = fs.uniqueName(folder.id, fileName(d.name));
      const node = fs.create(folder.id, { type: 'file', name });
      await fs.write(node.id, data instanceof Blob ? data : new Blob([data]));
      Object.assign(d, { node: node.id, name, state: 'saved' });
      this.#unseen = true;
      notifications.send({ text: t('download.done', { name, path: fs.tildePath(folder.id) }), level: 'success' });
    } catch (err) {
      d.state = 'failed';
      notifications.send({ text: t('download.failedText', { name: d.name }) + (err?.message ? ` (${err.message})` : ''), level: 'error' });
    } finally {
      d.page.download.done(d.id).catch(() => {});
      this.emit('change');
    }
  }

  cancel(id) {
    const d = this.#list.find(x => x.id === id);
    if (!d || d.state !== 'progressing') return;
    d.state = 'cancelled';
    d.page.download.cancel(id).catch(() => {});
    this.emit('change');
  }
}

export const downloads = new Downloads();
