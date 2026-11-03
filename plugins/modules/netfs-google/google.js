import { fetcher } from './lib/shared/cloud.js';
import { netError } from './lib/shared/errors.js';
import { needPaths, needKernel } from './lib/shared/kernel.js';

/**
 * What Google Drive and Google Photos share: the module's settings and the names of Google's items
 * as lilOS shows them.
 *
 * Sign-in: the kernel's (`oauth` of each driver, net/oauth.js), with the project each lilOS
 * installation makes on Google Cloud, set once in Control Panel → Google project (client ID,
 * client secret, client type). The refresh token is the connection's secret; connect() and
 * shares() get the access token from ctx.tokens, which the kernel renews.
 */
let conf = {};
let moduleCtx = null;

/** The module's ctx (init): its configuration, kept up to date when an admin changes it. */
export function bind(ctx) {
  moduleCtx = ctx;
  conf = ctx.config;
  ctx.onConfig?.(config => { conf = config; });
}

export const config = () => conf;
/** The kernel's path helpers (ctx.paths), from connect()'s ctx or the module's. */
export const pathsOf = ctx => needPaths(ctx, moduleCtx);

/** The access token of a connection (ctx.tokens of connect() and shares(): the kernel renews it). */
export function tokensOf(ctx) {
  const { tokens } = needKernel(ctx, 'tokens');
  if (!tokens) throw netError('auth', 'Serve un nuovo accesso');
  return tokens;
}

export const label = (en, it) => ({ en, it });
export const timedFetch = fetcher('Google');

// ---------- Names ----------

/** A name of Google as lilOS shows it: no '/' (shown as the full-width solidus), no control characters. */
export const shownName = name => String(name ?? '').replace(/\//g, '／').replace(/[\0-\x1f\x7f]/g, '').trim() || '(senza nome)';
/** A name lilOS gives, for Google: the full-width solidus goes back to '/'. */
export const googleName = name => name.replace(/／/g, '/');

/** 'Preventivo.pdf', 2 → 'Preventivo (2).pdf' */
function numbered(name, n) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
}

/**
 * Unique names for lilOS (Google allows two items with the same name): [{ ...item, shown, twin }]
 * in the same order, the second 'Preventivo.pdf' being 'Preventivo (2).pdf' (twin). `taken`: names
 * already in use (lower case), added to.
 */
export function named(items, nameOf, taken = new Set()) {
  return items.map(it => {
    const base = shownName(nameOf(it));
    let shown = base, n = 1;
    while (taken.has(shown.toLowerCase())) shown = numbered(base, ++n);
    taken.add(shown.toLowerCase());
    return { ...it, shown, twin: n > 1 };
  });
}
