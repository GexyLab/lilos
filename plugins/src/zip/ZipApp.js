import { pack, unpack, read, MAX_FILE } from './archive.js';
import { STYLE } from './ui.js';
import { h } from '../shared/sandbox/dom.js';
import { fileFromArgs, recordStep, frame, explain as explainCode, background } from '../shared/sandbox/app.js';

/**
 * Zip: makes and opens .zip archives. An installable app (sdk 2), not part of lilOS. Its entry
 * points are the exports here (see the manifest, app.json):
 *   main   a .zip opened with the app: what is inside, and Extract here
 *   work   the actions of the menu of files and folders (Compress → Zip / Unzip), in the background;
 *          the result is a notification. Also does them again for an automation (Automata):
 *          { automation: { action: 'zip.zip' | 'zip.unzip', params }, files } → the id of what it made
 */
const SHOWN = 500;   // entries listed in the window
const KNOWN = ['nothing', 'tooMany', 'tooBig', 'resultTooBig', 'read', 'corrupt', 'empty', 'skippedAll', 'notZip', 'outside'];

/** An error of archive.js, in words: sizes as the system writes them. */
function explain(lilos, err) {
  const t = (k, p) => lilos.locale.i18n.t(k, p);
  const size = n => lilos.locale.formatBytes(n);
  return explainCode(t, err, KNOWN, { ...(typeof err?.detail === 'number' && { detail: size(err.detail) }), limit: size(MAX_FILE), max: err?.detail });
}

/** What was left out of an archive, in a sentence ('' when nothing). */
function skippedText(t, skipped) {
  if (!skipped.length) return '';
  const names = skipped.slice(0, 3).map(s => s.name).join(', ');
  return t('skipped', { n: skipped.length, names: skipped.length > 3 ? `${names}, …` : names });
}

// ---------- Main: a .zip opened with the app ----------

export async function main({ lilos, root, args }) {
  const t = (k, p) => lilos.locale.i18n.t(k, p);
  const size = n => lilos.locale.formatBytes(n);
  const { box, off } = frame(lilos, root, { style: STYLE, className: 'zp' }, () => draw());

  let file = null, info = null, content = null, error = '', done = null, working = false;
  const take = a => {
    file = fileFromArgs(a);
    info = content = done = null;
    error = '';
  };

  const draw = () => {
    if (!file) {
      lilos.window.setTitle('Zip');
      return box.replaceChildren(h('h1', {}, 'Zip'), h('p', {}, t('main.intro')), h('p', { class: 'hint' }, t('main.limits', { limit: size(MAX_FILE) })));
    }
    lilos.window.setTitle(info?.name ?? 'Zip');
    if (error) return box.replaceChildren(h('h1', {}, info?.name ?? ''), h('div', { class: 'error', role: 'alert' }, error));
    if (!content) return box.replaceChildren(h('p', { class: 'hint', 'aria-busy': 'true' }, t('main.reading')));
    const files = content.entries.filter(e => !e.folder);
    const total = files.reduce((s, e) => s + e.size, 0);
    const go = h('button', { type: 'button', class: 'primary', disabled: working || !content.entries.length, 'aria-busy': working ? 'true' : 'false', onclick: extract }, t(working ? 'main.extracting' : 'main.extract'));
    box.replaceChildren(...[
      h('h1', {}, info.name),
      h('p', {}, t('main.summary', { n: files.length, size: size(total), packed: size(info.size) })),
      content.entries.length
        ? h('ul', { class: 'list', 'aria-label': t('main.content') }, ...content.entries.slice(0, SHOWN).map(e => h('li', { class: e.folder ? 'folder' : '' },
          h('span', { class: 'name', title: e.path.join('/') }, e.path.join('/') + (e.folder ? '/' : '')),
          h('span', { class: 'size' }, e.folder ? '' : size(e.size)))),
        content.entries.length > SHOWN && h('li', { class: 'more' }, t('main.more', { n: content.entries.length - SHOWN })))
        : h('div', { class: 'empty' }, t('main.empty')),
      content.skipped.length > 0 && h('p', { class: 'warn' }, skippedText(t, content.skipped)),
      done && h('p', { class: 'ok', role: 'status' }, done),
      h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => lilos.window.close() }, t('common.close')), go),
    ].filter(Boolean));
  };

  async function extract() {
    if (working) return;
    working = true;
    done = null;
    draw();
    try {
      const result = await unpack(lilos, file);
      done = [t('done.unzip', { name: result.name, n: result.count }), skippedText(t, result.skipped)].filter(Boolean).join(' ');
      lilos.ui.notify({ text: done, level: 'success' });
      await recordStep(lilos, 'zip.unzip', { params: { file }, result: result.id });
    } catch (err) {
      error = explain(lilos, err);
    }
    working = false;
    draw();
  }

  const load = async () => {
    draw();
    if (!file) return;
    try {
      info = await lilos.files.info(file);
      content = read(new Uint8Array(await (await lilos.files.read(file, { bytes: true })).arrayBuffer()));
    } catch (err) {
      error = explain(lilos, err);
    }
    draw();
  };
  take(args);
  // Asked again (another archive) while open
  const offLaunch = lilos.on('launch', a => { take(a); load(); });
  await load();
  return () => { offLaunch(); off(); };
}

// ---------- Work: Compress → Zip / Unzip ----------

export async function work({ lilos }) {
  const t = (k, p) => lilos.locale.i18n.t(k, p);
  const size = n => lilos.locale.formatBytes(n);
  const zip = ids => pack(lilos, ids, { archiveName: t('archive.name') });

  background(lilos, {
    // A step of an automation, done again without asking anything: the id of what it made
    automation: {
      'zip.zip': async params => (await zip(Array.isArray(params.items) ? params.items : [])).id,
      'zip.unzip': async params => {
        if (typeof params.file !== 'string') throw new Error('unknown');
        return (await unpack(lilos, params.file)).id;
      },
    },
    actions: {
      'zip.zip': async ids => {
        const result = await zip(ids);
        await lilos.ui.notify({ text: t('done.zip', { name: result.name, n: result.count, size: size(result.size) }), level: 'success' });
        await recordStep(lilos, 'zip.zip', { params: { items: ids }, result: result.id });
        return { name: result.name };
      },
      'zip.unzip': async ids => {
        const names = [];
        for (const id of ids) {
          const result = await unpack(lilos, id);
          names.push(result.name);
          await lilos.ui.notify({ text: [t('done.unzip', { name: result.name, n: result.count }), skippedText(t, result.skipped)].filter(Boolean).join(' '), level: result.skipped.length ? 'warning' : 'success' });
          // One step for each archive: it is what the action does again
          await recordStep(lilos, 'zip.unzip', { params: { file: id }, result: result.id });
        }
        return { names };
      },
    },
    onError: async err => {
      await lilos.ui.notify({ text: explain(lilos, err), level: 'error' });
      return { error: err?.message ?? String(err) };
    },
    explainError: err => explain(lilos, err),
  });
}
