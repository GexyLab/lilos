import { encrypt, unlock, decrypt, reseal } from './crypto.js';
import { looksEncrypted, ALGORITHMS, KDFS } from './format.js';
import { recordStep, explain as explainCode, background } from '../shared/sandbox/app.js';

/**
 * The vault: FileCrypt's background entry point. It holds the keys of the unlocked files, only in
 * its memory (stopping it locks everything), and handles the pipes of the files FileCrypt marked:
 *
 *   file.open  (before, first)  a locked file: the Unlock window instead of its app
 *   file.read  (after, last: it runs first)  decrypts, for lilOS and the app the file was opened with
 *   file.write (before, last)   encrypts again what is saved, with a new nonce
 *
 * Its own windows talk to it over a channel (lilos.app.connect): passwords go from them to it
 * directly, not through lilOS. They first hand it the file with a call ({ op: 'prepare', file }).
 * Menu actions and calls: { action: 'filecrypt.lock', files } locks; { op: 'status' } lists.
 * Automations (Automata) do encrypt, decrypt and lock again here, without a window:
 * { automation: { action, params }, files }, the password in params (never kept, never recorded).
 * Files lock again after the minutes of inactivity of the settings (not while a window shows
 * them), and when lilOS signs out. A locked file's key is wiped from memory.
 */
export const MARK = { content: true, v: 1 };
export const SETTINGS_KEY = 'settings';
export const DEFAULTS = { alg: 'AES-256-GCM', kdf: 'argon2id', lockAfter: 15 };   // lockAfter: minutes, 0 never

/** The settings, each one checked (they are stored data: a bad value must not turn locking off). */
export async function readSettings(lilos) {
  const saved = await lilos.storage.get(SETTINGS_KEY);
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    alg: ALGORITHMS.includes(s.alg) ? s.alg : DEFAULTS.alg,
    kdf: KDFS.includes(s.kdf) ? s.kdf : DEFAULTS.kdf,
    lockAfter: Number.isInteger(s.lockAfter) && s.lockAfter >= 0 && s.lockAfter <= 1440 ? s.lockAfter : DEFAULTS.lockAfter,
  };
}

/** The codes of the vault's errors and their texts. */
const KNOWN = { wrong: 'error.wrong', corrupt: 'error.corrupt', short: 'encrypt.tooShort', already: 'error.already', 'not-encrypted': 'error.notEncrypted', 'bad-header': 'error.badHeader', 'no-argon2': 'error.noArgon2' };

/** Errors of the vault, in words. */
export const explain = (t, err) => explainCode(t, err, KNOWN);

const MIN_PASSWORD = 8;

const bytesOf = async blob => new Uint8Array(await blob.arrayBuffer());

export async function vault({ lilos }) {
  const t = (key, params) => lilos.locale.i18n.t(key, params);
  const open = new Map();     // file id → { state, name, since, used }
  const ports = new Set();    // windows that follow the list of unlocked files
  let settings = await readSettings(lilos);

  const status = () => [...open].map(([id, f]) => ({ id, name: f.name, since: f.since }));
  const changed = () => {
    lilos.app.keepAlive(open.size > 0);
    const list = status();
    for (const port of ports) port.postMessage({ status: list });
  };

  async function lock(ids, { quiet = false } = {}) {
    const done = ids.filter(id => {
      open.get(id)?.state.key.fill(0);
      return open.delete(id);
    });
    if (!done.length) return 0;
    await lilos.files.locked(done);
    if (!quiet) lilos.ui.toast(t('toast.locked', { n: done.length }));
    changed();
    return done.length;
  }

  // Inactivity: each file locks again on its own, unless a window shows it (the user may be typing)
  setInterval(async () => {
    if (!settings.lockAfter) return;
    const limit = Date.now() - settings.lockAfter * 60_000;
    const idle = [...open].filter(([, f]) => f.used < limit).map(([id]) => id);
    if (!idle.length) return;
    const shown = new Set(await lilos.files.shown(idle));
    for (const id of shown) open.get(id).used = Date.now();
    const go = idle.filter(id => !shown.has(id));
    if (go.length) lock(go);
  }, 30_000);

  const own = { where: { meta: 'own' } };
  await lilos.pipes.subscribe('file.open', { stage: 'before', position: 'first', ...own }, async ({ node }) => {
    const file = open.get(node.id);
    if (file) {
      file.used = Date.now();
      return null;
    }
    await lilos.app.call('unlock', { file: node.id });
    return { stop: { silent: true } };
  });

  await lilos.pipes.subscribe('file.read', { stage: 'after', position: 'last', ...own }, async ({ node, content }, ctx) => {
    const file = open.get(node.id);
    if (!file) return { stop: { error: t('error.locked', { name: node.name }) } };
    // Other apps get the content in clear only if the file was opened with them
    const caller = ctx.caller;
    if (caller && !caller.system && !caller.opened) return { stop: { error: t('error.otherApp', { name: node.name }) } };
    const bytes = await bytesOf(content);
    if (!looksEncrypted(bytes)) return { stop: { error: t('error.broken', { name: node.name }) } };
    try {
      const plain = await decrypt(bytes, file.state);
      file.used = Date.now();
      return { data: { content: new Blob([plain]) } };
    } catch {
      return { stop: { error: t('error.broken', { name: node.name }) } };
    }
  });

  await lilos.pipes.subscribe('file.write', { stage: 'before', position: 'last', ...own }, async ({ node, content }) => {
    const file = open.get(node.id);
    if (!file) return { stop: { error: t('error.writeLocked', { name: node.name }) } };
    file.used = Date.now();
    return { data: { content: new Blob([await reseal(await bytesOf(content), file.state)]) } };
  });

  /** What the windows ask over their channel: { id, op, file?, password?, alg?, kdf?, files? }. */
  async function answer(m) {
    switch (m.op) {
      case 'follow':
        return { status: status() };
      case 'settings':
        settings = await readSettings(lilos);
        return {};
      case 'lock': {
        // The Lock buttons of the main window
        const ids = Array.isArray(m.files) ? m.files : [...open.keys()];
        const locked = await lock(ids);
        await recordStep(lilos, 'filecrypt.lock', { params: { files: ids } });
        return { locked };
      }
      case 'unlock': {
        const info = await lilos.files.info(m.file);
        const { state } = await unlock(await bytesOf(await lilos.files.read(m.file, { bytes: true })), String(m.password));
        open.set(m.file, { state, name: info.name, since: Date.now(), used: Date.now() });
        changed();
        return {};
      }
      case 'encrypt': {
        const info = await lilos.files.info(m.file);
        if (info.meta) throw new Error('already');
        if (String(m.password ?? '').length < MIN_PASSWORD) throw new Error('short');
        const plain = await bytesOf(await lilos.files.read(m.file, { bytes: true }));
        const { bytes, state } = await encrypt(plain, { password: String(m.password), alg: m.alg ?? settings.alg, kdf: m.kdf ?? settings.kdf });
        await lilos.files.write(m.file, bytes, { mark: MARK });
        // Just encrypted with the password the user typed: it stays unlocked, its windows keep working
        open.set(m.file, { state, name: info.name, since: Date.now(), used: Date.now() });
        changed();
        return {};
      }
      case 'decrypt': {
        const { plain } = await unlock(await bytesOf(await lilos.files.read(m.file, { bytes: true })), String(m.password));
        await lilos.files.write(m.file, new Blob([plain]), { mark: null });
        open.get(m.file)?.state.key.fill(0);
        open.delete(m.file);
        changed();
        return {};
      }
      default:
        throw new Error('unknown');
    }
  }

  lilos.on('connect', port => {
    port.onmessage = async e => {
      const m = e.data ?? {};
      try {
        port.postMessage({ id: m.id, ...(await answer(m)) });
        if (m.op === 'follow') ports.add(port);
      } catch (err) {
        port.postMessage({ id: m.id, error: err?.message ?? String(err) });
      }
    };
  });

  background(lilos, {
    // A step of an automation, done again without asking anything (its files are handed with it):
    // what the windows ask over their channel, with the password Automata asked for
    automation: {
      // A choice this version does not know: the settings' one
      'filecrypt.encrypt': async p => { await answer({ op: 'encrypt', file: p.file, password: p.password, alg: ALGORITHMS.includes(p.alg) ? p.alg : undefined, kdf: KDFS.includes(p.kdf) ? p.kdf : undefined }); },
      'filecrypt.decrypt': async p => { await answer({ op: 'decrypt', file: p.file, password: p.password }); },
      'filecrypt.lock': async p => { await lock(Array.isArray(p.files) ? p.files : [], { quiet: true }); },
    },
    actions: {
      'filecrypt.lock': async files => {
        const locked = await lock(files);
        await recordStep(lilos, 'filecrypt.lock', { params: { files } });
        return { locked };
      },
    },
    other: async data => {
      // A window hands it a file (the call gives it to the vault), before the password comes over the channel
      if (data?.op === 'prepare') {
        const info = await lilos.files.info(data.file);
        return { name: info.name, encrypted: !!info.meta, unlocked: open.has(data.file) };
      }
      if (data?.op === 'status') return status();
      throw new Error('unknown');
    },
    explainError: err => explain(t, err),
  });
}
