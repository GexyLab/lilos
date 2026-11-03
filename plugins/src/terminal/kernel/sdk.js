/**
 * '@lilos/sdk' for the Terminal's shell in the kernel (kernel/shell.js): what the shell and its
 * commands import, with what a service has. connect(lilos) is called first.
 *   fs       kfs.js, the user's home
 *   session  the user the service runs for
 *   tags     the user's tag definitions, to read (creating and changing tags needs lilOS's page)
 *   locale   the Terminal's strings, in the user's language (lilos.locale)
 *   term     null: remote sessions need the Terminal open in lilOS (commands/remote.js checks it)
 */
import { kernelFs } from './kfs.js';

const NO_PAGE = 'Non disponibile quando il comando gira nel kernel: serve il Terminale aperto in lilOS';

let api = null;
let fsImpl = null;
let tagList = [];
let strings = null;

/** Forwards to the real objects once connect() has them (the modules read them when they load). */
const forward = get => new Proxy({}, {
  get: (_, key) => { const target = get(); const v = target?.[key]; return typeof v === 'function' ? v.bind(target) : v; },
  has: (_, key) => key in (get() ?? {}),
});

export const fs = forward(() => fsImpl);

export const term = null;

export const session = {
  get user() { return api?.app?.user ?? null; },
  get locale() { return api?.locale?.code ?? 'en'; },
};

// A copy of lilOS's TAG_COLORS (sdk/core/tags.js): the kernel's isolate cannot import the SDK.
// Keep it the same when lilOS changes its colors.
export const TAG_COLORS = [
  { value: '#e5484d', label: 'Rosso' }, { value: '#d9822b', label: 'Arancione' }, { value: '#d4a72c', label: 'Giallo' },
  { value: '#30a46c', label: 'Verde' }, { value: '#0d9488', label: 'Verde acqua' }, { value: '#3b6ef5', label: 'Blu' },
  { value: '#7c5cdb', label: 'Viola' }, { value: '#8b8d98', label: 'Grigio' },
];

export const tags = {
  list: () => tagList.map(t => ({ ...t })),
  get: id => tagList.find(t => t.id === id) ?? null,
  byName: name => tagList.find(t => t.name.toLowerCase() === String(name).toLowerCase()) ?? null,
  create() { throw new Error(NO_PAGE); },
  rename() { throw new Error(NO_PAGE); },
  setColor() { throw new Error(NO_PAGE); },
  remove() { throw new Error(NO_PAGE); },
  on: () => () => {},
};

/** The Terminal's strings: the service's lilos.locale (the shared i18n.js asks for locale.forApp(id).i18n). */
export const locale = {
  get code() { return api?.locale?.code ?? 'en'; },
  forApp: () => ({
    i18n: {
      t: (key, params) => strings?.t(key, params) ?? key,
      date: (value, options) => strings?.date?.(value, options) ?? new Date(value).toISOString(),
      number: (value, options) => strings?.number?.(value, options) ?? String(value),
      get lang() { return strings?.lang ?? 'en'; },
      get code() { return api?.locale?.code ?? 'en'; },
    },
  }),
  on: () => () => {},
};

export async function connect(lilos) {
  api = lilos;
  strings = lilos.locale?.i18n ?? null;
  if (!lilos.home) throw new Error('Serve il modulo services-isolate 1.1.0 o più recente (AppStore → Kernel)');
  fsImpl = kernelFs(lilos);
  const data = await fsImpl.load();
  tagList = Array.isArray(data.tags) ? data.tags.filter(t => t && typeof t.id === 'string' && typeof t.name === 'string') : [];
  return fsImpl;
}

export { NO_PAGE };
