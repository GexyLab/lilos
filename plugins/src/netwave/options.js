import { Emitter, storage } from '@lilos/sdk';

/**
 * NetWave's options, per lilOS user:
 *   home       the page of the Home button and of new windows ('' = the start page)
 *   search     the address of searches, %s = the words typed
 *   keepDays   days of history kept (0 = for ever)
 *   restore    reopen the windows of the last time (lilOS does it with its workspaces)
 * Site permissions remembered ('Always'): netwave.grants, [{ origin, permission, allow }].
 */
const KEY = 'netwave.options';
const GRANTS = 'netwave.grants';
const GRANTS_MAX = 500;

export const SEARCH_ENGINES = [
  { id: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  { id: 'startpage', label: 'Startpage', url: 'https://www.startpage.com/do/search?q=%s' },
  { id: 'bing', label: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  { id: 'google', label: 'Google', url: 'https://www.google.com/search?q=%s' },
  { id: 'ecosia', label: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s' },
];

const DEFAULTS = { home: '', search: 'duckduckgo', keepDays: 90 };
export const KEEP_DAYS = [7, 30, 90, 365, 0];

class Options extends Emitter {
  get(name) {
    const all = { ...DEFAULTS, ...storage.get(KEY, {}) };
    if (name === 'keepDays' && !KEEP_DAYS.includes(all.keepDays)) return DEFAULTS.keepDays;
    if (name === 'search' && !SEARCH_ENGINES.some(e => e.id === all.search)) return DEFAULTS.search;
    return all[name];
  }

  set(name, value) {
    storage.set(KEY, { ...storage.get(KEY, {}), [name]: value });
    this.emit('change', { name, value });
  }

  searchUrl(words) {
    const engine = SEARCH_ENGINES.find(e => e.id === this.get('search')) ?? SEARCH_ENGINES[0];
    return engine.url.replace('%s', encodeURIComponent(words));
  }

  grants() {
    const list = storage.get(GRANTS, []);
    return Array.isArray(list) ? list.filter(g => typeof g?.origin === 'string' && typeof g.permission === 'string') : [];
  }

  setGrant(origin, permission, allow) {
    const list = this.grants().filter(g => !(g.origin === origin && g.permission === permission));
    if (allow !== null) list.push({ origin, permission, allow: !!allow });
    storage.set(GRANTS, list.slice(-GRANTS_MAX));
    this.emit('grants', { origin, permission, allow });
  }
}

export const options = new Options();

/**
 * What the user typed in the address bar → an address: a full address as it is; something that
 * looks like a site (a dot and no spaces, localhost, an IP) with https:// (http:// for
 * localhost and IPs); anything else, a search.
 */
export function addressOf(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try { return new URL(s).href; } catch { return options.searchUrl(s); }
  }
  if (/^about:blank$/i.test(s)) return 'about:blank';
  if (/\s/.test(s)) return options.searchUrl(s);
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(s);
  if (local || /^[^/?#]+\.[a-z]{2,}(:\d+)?([/?#]|$)/i.test(s)) {
    try { return new URL(`${local ? 'http' : 'https'}://${s}`).href; } catch { /* a search */ }
  }
  return options.searchUrl(s);
}
