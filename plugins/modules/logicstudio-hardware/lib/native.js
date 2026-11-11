import { oops } from './common.js';

/**
 * The npm libraries with native code, loaded only when a block needs them (never at the module's
 * start: a library that does not load on this computer must not stop the kernel). The kernel
 * installs them with --ignore-scripts, so only the prebuilt binaries inside the packages count.
 * A library that fails is said in /status and in the blocks that need it; it is tried again after
 * a minute (it may have been installed meanwhile).
 */

const LIBS = {
  serialport: { pkg: 'serialport', load: () => import('serialport') },
  usb: { pkg: 'usb', load: () => import('usb') },
  hid: { pkg: 'node-hid', load: () => import('node-hid') },
  midi: { pkg: '@julusian/midi', load: () => import('@julusian/midi') },
  si: { pkg: 'systeminformation', load: () => import('systeminformation') },
};

const RETRY_MS = 60_000;
const state = new Map();   // name → { mod, error, at, loading }

/** The library `name` (serialport, usb, hid, midi, si), or an Italian error. */
export async function lib(name) {
  const spec = LIBS[name];
  if (!spec) throw new Error(`libreria sconosciuta: ${name}`);
  const s = state.get(name);
  if (s?.mod) return s.mod;
  if (s?.loading) return s.loading;
  if (s?.error && Date.now() - s.at < RETRY_MS) throw oops(`La libreria ${spec.pkg} non funziona su questo computer: ${s.error}`);
  const loading = spec.load().then(mod => {
    // All of them are CommonJS: their exports are the default of the namespace
    const m = mod?.default && typeof mod.default === 'object' ? mod.default : mod;
    state.set(name, { mod: m, error: null, at: Date.now() });
    return m;
  }, err => {
    const error = String(err?.message ?? err).split('\n')[0].slice(0, 200);
    state.set(name, { mod: null, error, at: Date.now() });
    throw oops(`La libreria ${spec.pkg} non funziona su questo computer: ${error}`);
  });
  state.set(name, { loading });
  return loading;
}

/** For /status: { serialport: 'ok' | 'non caricata' | 'errore: …', … }. With `tryAll`, loads them first. */
export async function libsStatus(tryAll = false) {
  if (tryAll) await Promise.all(Object.keys(LIBS).map(n => lib(n).catch(() => null)));
  const out = {};
  for (const [name, spec] of Object.entries(LIBS)) {
    const s = state.get(name);
    out[spec.pkg] = s?.mod ? 'ok' : s?.error ? `errore: ${s.error}` : 'non caricata';
  }
  return out;
}

/** The tests: a fake library in place of the real one. */
export function fakeLib(name, mod) {
  state.set(name, mod ? { mod, error: null, at: Date.now() } : { mod: null, error: 'finta assente', at: Date.now() });
}
