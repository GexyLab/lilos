import { createHash, randomBytes } from 'node:crypto';
import { KernelError, fail } from '../errors.js';
import { logger } from '../log.js';
import { Text, defineStrings, localize } from '../strings.js';
import { checkFields, signInFields, netFail, notReady, onlyManual } from './drivers.js';

const log = logger('rete');
const LIFE = 10 * 60_000;     // a sign-in not finished by then is dropped
const PER_USER = 5;           // sign-ins of a user at once
const WAIT = 25_000;          // longest wait of one status request
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

const { t } = defineStrings('lilos:kernel.net.signin', { en: { strings: {
  expired: 'Sign-in expired or already used: try again',
  noProtocol: 'Protocol not available: {protocol}',
  noAccounts: 'This protocol has no sign-in with an account',
  notReady: 'Protocol not ready',
  tooMany: 'Too many sign-ins in progress',
  noManual: 'This protocol has no sign-in by pasting the address',
  url: 'Sign-in address not valid',
  notManual: 'This sign-in is not done by pasting the address',
  pasteInvalid: 'Address not valid: copy the whole address of the page that does not open',
  pasteStart: 'The address must start with {url}',
  pasteOther: 'This address belongs to another sign-in: paste the one of the last page opened',
  windowExpired: 'Sign-in expired or already used: close this window and try again.',
  failedLower: 'sign-in failed',
  failed: 'Sign-in failed: {message}',
  failedUnknown: 'Sign-in failed: the provider did not say why',
  protocolGone: 'Protocol no longer available',
  noAccount: 'The provider did not give an account',
  done: 'Signed in as {account}. You can close this window.',
  otherProtocol: 'Sign-in made for another protocol',
  notDone: 'Sign-in not completed yet',
  redirect: 'Return address not valid',
  redirectHttps: 'Signing in with an account works only with lilOS on https, or on http from this computer (localhost)',
  pageDone: 'Done',
  pageFailed: 'Sign-in failed',
} } });

/** Where the provider sends the sign-in window back. */
export const CALLBACK_PATH = '/api/net/signin/callback';

/**
 * Where the provider sends the window back in a sign-in by hand (drivers with signIn.manual): a
 * page of the user's own computer that does not open; the user copies its address into lilOS
 * (paste). For lilOS opened at an address the provider does not accept (http on the local network).
 */
export const MANUAL_REDIRECT = 'http://127.0.0.1:53682/';

const token = () => randomBytes(32).toString('base64url');

/**
 * Signing in to an account on the provider's page (OAuth 2.0, authorization code with PKCE), for
 * the protocols with a 'signin' field (drivers.js). The page opens a window and asks the kernel
 * for the address of the provider's page (start); the provider sends that window back to lilOS at
 * CALLBACK_PATH (callback: without lilOS's session there, as the browser does not send its cookie
 * when another site sends it back, so the random `state` names the sign-in), and the kernel asks
 * the provider for the tokens with the code it got and the PKCE verifier it kept. The page waits
 * meanwhile (status); then it makes or reconnects a connection with the sign-in's id (take): the
 * page never sees the tokens. A sign-in lasts 10 minutes and is used once.
 *
 * The address the provider sends back to must be lilOS's own (the page's origin) on https, or on
 * http only on this computer (localhost): providers accept nothing else, and it is the address
 * registered with them. By hand (`manual`, protocols that allow it): the provider sends the window
 * to MANUAL_REDIRECT, a page that does not open; the user pastes its address in lilOS (paste),
 * which carries the code and the state, and the sign-in ends as with the callback.
 *
 *   flow: { id, owner, protocol, values, field, state, verifier, redirectUri, manual, created,
 *           status: 'pending' | 'done' | 'error', error, result: { account, secret }, waiters }
 */
export class SignIns {
  #drivers;
  #lookup;
  #flows = new Map();     // id → flow
  #byState = new Map();   // state → flow (until the provider sent the window back)

  /** lookup: the guard's (guard.js), for the drivers that talk to the provider themselves. */
  constructor(drivers, lookup = undefined) {
    this.#drivers = drivers;
    this.#lookup = lookup;
  }

  #prune() {
    const now = Date.now();
    for (const flow of this.#flows.values()) if (now - flow.created > LIFE) this.#drop(flow);
  }

  #drop(flow) {
    this.#flows.delete(flow.id);
    this.#byState.delete(flow.state);
    this.#settle(flow);
  }

  #settle(flow) {
    for (const wake of flow.waiters) wake();
    flow.waiters.clear();
  }

  #mine(principal, id) {
    this.#prune();
    const flow = typeof id === 'string' ? this.#flows.get(id) : null;
    return flow && flow.owner === principal.id ? flow : fail('not_found', t('expired'));
  }

  /**
   * A new sign-in: { protocol, values, redirectUri } (values: the other fields of the connection,
   * which may change what the provider is asked). `origin`: the page's, from the request. → { id, url }
   */
  async start(principal, body, origin) {
    this.#prune();
    const driver = this.#drivers.get(body?.protocol) ?? fail('unavailable', t('noProtocol', { protocol: body?.protocol }));
    const field = signInFields(driver)[0] ?? fail('invalid', t('noAccounts'));
    const why = notReady(driver);
    if (why) fail('unavailable', typeof why === 'string' || why instanceof Text ? why : why.it ?? why.en ?? t('notReady'));
    if ([...this.#flows.values()].filter(f => f.owner === principal.id).length >= PER_USER) fail('rate_limited', t('tooMany'));
    const manual = body.manual === true || onlyManual(driver);
    if (manual && driver.signIn.manual !== true) fail('invalid', t('noManual'));
    const redirectUri = manual ? MANUAL_REDIRECT : cleanRedirect(body.redirectUri, origin);
    const { values } = checkFields(driver, body.values ?? {});
    const flow = {
      id: token().slice(0, 24), owner: principal.id, protocol: body.protocol, values, field: field.key,
      state: token(), verifier: token(), redirectUri, manual, created: Date.now(),
      status: 'pending', error: null, result: null, waiters: new Set(),
    };
    const challenge = createHash('sha256').update(flow.verifier).digest('base64url');
    let url;
    try {
      url = String(await driver.signIn.start({ values, redirectUri, state: flow.state, challenge, lookup: this.#lookup }));
    } catch (err) {
      return netFail(err);
    }
    if (!isProviderPage(url)) fail('invalid', t('url'));
    this.#flows.set(flow.id, flow);
    this.#byState.set(flow.state, flow);
    return { id: flow.id, url, manual };
  }

  /**
   * A sign-in by hand: the address of the page the provider sent the window to (MANUAL_REDIRECT
   * with ?code&state). → its status, as status() gives it.
   */
  async paste(principal, id, raw) {
    const flow = this.#mine(principal, id);
    if (!flow.manual) fail('invalid', t('notManual'));
    let url;
    try { url = new URL(String(raw ?? '').trim().slice(0, 8192)); } catch { fail('invalid', t('pasteInvalid')); }
    const expected = new URL(MANUAL_REDIRECT);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname) fail('invalid', t('pasteStart', { url: MANUAL_REDIRECT }));
    if (url.searchParams.get('state') !== flow.state) fail('invalid', t('pasteOther'));
    if (flow.status === 'pending') await this.callback(url.searchParams);
    return { status: flow.status, ...(flow.result && { account: flow.result.account }), ...(flow.error && { error: flow.error }) };
  }

  /**
   * The provider sent the window back: ?code&state, or ?error&error_description&state.
   * → { ok, text } for the page the window shows.
   */
  async callback(query) {
    this.#prune();
    const flow = this.#byState.get(query.get('state') ?? '');
    if (!flow) return { ok: false, text: t('windowExpired') };
    this.#byState.delete(flow.state);
    const code = query.get('code');
    if (!code) {
      const said = query.get('error_description') || query.get('error');
      flow.status = 'error';
      flow.error = said ? String(said).split(/\r?\n/)[0].slice(0, 300) : t('failedLower');
      this.#settle(flow);
      return { ok: false, text: failedText(flow) };
    }
    try {
      const driver = this.#drivers.get(flow.protocol) ?? fail('unavailable', t('protocolGone'));
      const result = await driver.signIn.finish({ values: flow.values, code: code.slice(0, 4096), redirectUri: flow.redirectUri, verifier: flow.verifier, lookup: this.#lookup });
      const account = typeof result?.account === 'string' ? result.account.trim().slice(0, 200) : '';
      if (!account || result.secret === undefined) throw new KernelError('invalid', t('noAccount'));
      flow.result = { account, secret: result.secret };
      flow.status = 'done';
      return { ok: true, text: t('done', { account }) };
    } catch (err) {
      flow.status = 'error';
      flow.error = err?.text instanceof Text ? err.text : String(err?.message ?? err).slice(0, 300);
      log.warn(`Accesso a ${flow.protocol} non riuscito: ${flow.error}`);
      return { ok: false, text: failedText(flow) };
    } finally {
      this.#settle(flow);
    }
  }

  /** How a sign-in is going: { status, account?, error? }; with `wait`, answers when it changes (25 s at most). */
  async status(principal, id, { wait = false } = {}) {
    const flow = this.#mine(principal, id);
    if (wait && flow.status === 'pending') {
      await new Promise(resolve => {
        const timer = setTimeout(done, WAIT);
        function done() { clearTimeout(timer); flow.waiters.delete(done); resolve(); }
        flow.waiters.add(done);
      });
    }
    return { status: flow.status, ...(flow.result && { account: flow.result.account }), ...(flow.error && { error: flow.error }) };
  }

  /**
   * What a finished sign-in gave, for a connection of `protocol`: { field, account, secret }.
   * `keep`: it stays usable (a test before saving), otherwise it is used up.
   */
  take(principal, id, protocol, { keep = false } = {}) {
    const flow = this.#mine(principal, id);
    if (flow.protocol !== protocol) fail('invalid', t('otherProtocol'));
    if (flow.status !== 'done') fail('invalid', flow.status === 'error' ? failedText(flow) : t('notDone'));
    if (!keep) this.#drop(flow);
    return { field: flow.field, account: flow.result.account, secret: flow.result.secret, flow };
  }

  /** A secret the provider renewed while the sign-in was in use (a test): the next use takes it. */
  renew(flow, secret) {
    if (flow.result) flow.result.secret = secret;
  }

  cancel(principal, id) {
    const flow = this.#flows.get(id);
    if (flow && flow.owner === principal.id) this.#drop(flow);
  }

  /** The user's sign-ins go (the user was deleted, or the kernel stops). */
  forget(userId) {
    for (const flow of this.#flows.values()) if (!userId || flow.owner === userId) this.#drop(flow);
  }
}

/** Why a sign-in failed, as the user reads it. */
const failedText = flow => (flow.error instanceof Text && flow.error.key === 'failedLower' ? t('failedUnknown') : t('failed', { message: flow.error }));

/** A provider's sign-in page: https, or http on this computer (a test provider). */
function isProviderPage(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK.has(url.hostname));
  } catch {
    return false;
  }
}

/** The address the provider sends back to: lilOS's own callback, on https or on this computer. Throws 'invalid'. */
export function cleanRedirect(raw, origin) {
  let url;
  try { url = new URL(String(raw ?? '')); } catch { fail('invalid', t('redirect')); }
  if (url.pathname !== CALLBACK_PATH || url.search || url.hash || url.username || url.password) fail('invalid', t('redirect'));
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK.has(url.hostname))) {
    fail('invalid', t('redirectHttps'));
  }
  if (origin && url.origin !== origin) fail('invalid', t('redirect'));
  return url.href;
}

/**
 * The small page the sign-in window shows at the end (no script: lilOS closes the window itself),
 * in the language `code` (the request's: strings.js localeOf).
 */
export function callbackPage({ ok, text }, code = 'en') {
  const escape = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const say = v => escape(localize(v, code));
  return `<!doctype html><html lang="${escape(code)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>lilOS</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f5f7;color:#1f2328}main{max-width:420px;padding:24px;text-align:center}b{display:block;font-size:17px;margin-bottom:6px;color:${ok ? '#1e7a46' : '#c4373c'}}</style></head>
<body><main><b>${say(ok ? t('pageDone') : t('pageFailed'))}</b>${say(text)}</main></body></html>`;
}
