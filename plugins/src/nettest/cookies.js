import { store } from './store.js';

/**
 * Cookies, as a browser would keep them for the requests NetTest sends (the kernel keeps none):
 * what a response sets (Set-Cookie) goes in the jar of its server, and the next request to the same
 * server and path carries it (Cookie), unless the request has a Cookie header of its own or the
 * request's settings say not to (settings.cookies === false). The jar is the app's (store.cookies).
 *
 *   jar: { domain: { 'name|path': { name, value, path, expires, secure, hostOnly } } }
 */
const MAX_PER_HOST = 100;

/** One Set-Cookie header as { name, value, domain?, path?, expires?, secure, httpOnly, sameSite? }, or null. */
export function parseSetCookie(text) {
  const [pair, ...attrs] = String(text).split(';');
  const i = pair.indexOf('=');
  if (i < 1) return null;
  const c = { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim(), secure: false, httpOnly: false };
  for (const a of attrs) {
    const [k, ...rest] = a.split('=');
    const key = k.trim().toLowerCase(), value = rest.join('=').trim();
    if (key === 'domain' && value) c.domain = value.replace(/^\./, '').toLowerCase();
    else if (key === 'path' && value.startsWith('/')) c.path = value;
    else if (key === 'expires') { const at = Date.parse(value); if (!Number.isNaN(at)) c.expires ??= at; }
    else if (key === 'max-age' && /^-?\d+$/.test(value)) c.expires = Date.now() + Number(value) * 1000;
    else if (key === 'secure') c.secure = true;
    else if (key === 'httponly') c.httpOnly = true;
    else if (key === 'samesite') c.sameSite = value;
  }
  return c;
}

const defaultPath = url => {
  const p = url.pathname || '/';
  const last = p.lastIndexOf('/');
  return last <= 0 ? '/' : p.slice(0, last);
};
const domainMatch = (host, domain) => host === domain || host.endsWith(`.${domain}`);
const pathMatch = (path, cookiePath) => path === cookiePath || path.startsWith(cookiePath.endsWith('/') ? cookiePath : `${cookiePath}/`);

/** What a response set, into the jar. url: where it came from (the response's own after redirects). */
export function keepCookies(url, headers) {
  let u;
  try { u = new URL(url); } catch { return; }
  const sets = (headers ?? []).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => parseSetCookie(v)).filter(Boolean);
  if (!sets.length) return;
  const jar = store.cookies;
  const host = u.hostname.toLowerCase();
  for (const c of sets) {
    // A cookie for another site than the one that set it is not kept (as browsers do)
    // A cookie for a whole top-level domain (Domain=com) is kept only for its host
    const domain = c.domain && c.domain.includes('.') && domainMatch(host, c.domain) ? c.domain : host;
    if (domain === '__proto__' || domain === 'constructor' || domain === 'prototype') continue;
    const list = Object.hasOwn(jar, domain) ? jar[domain] : {};
    const key = `${c.name}|${c.path ?? defaultPath(u)}`;
    if (c.expires !== undefined && c.expires <= Date.now()) delete list[key];
    else list[key] = { name: c.name, value: c.value, path: c.path ?? defaultPath(u), expires: c.expires ?? null, secure: c.secure, hostOnly: !c.domain };
    const keys = Object.keys(list);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_PER_HOST))) delete list[k];
    if (Object.keys(list).length) jar[domain] = list; else delete jar[domain];
  }
  store.setCookies(jar);
}

/** The Cookie header for a request to url, or ''. */
export function cookieHeader(url) {
  let u;
  try { u = new URL(url); } catch { return ''; }
  const host = u.hostname.toLowerCase(), now = Date.now();
  const out = [];
  for (const [domain, list] of Object.entries(store.cookies)) {
    if (!domainMatch(host, domain)) continue;
    for (const c of Object.values(list)) {
      if (c.hostOnly && host !== domain) continue;
      if (c.expires && c.expires <= now) continue;
      if (c.secure && u.protocol !== 'https:') continue;
      if (!pathMatch(u.pathname || '/', c.path)) continue;
      out.push(`${c.name}=${c.value}`);
    }
  }
  return out.join('; ');
}

/** The jar as rows for the Cookie window: [{ domain, name, value, path, expires }]. */
export const cookieRows = () => Object.entries(store.cookies).flatMap(([domain, list]) => Object.entries(list).map(([key, c]) => ({ domain, key, ...c })));

export function removeCookie(domain, key) {
  const jar = store.cookies;
  if (!jar[domain]) return;
  if (key) delete jar[domain][key]; else delete jar[domain];
  if (jar[domain] && !Object.keys(jar[domain]).length) delete jar[domain];
  store.setCookies(jar);
}
