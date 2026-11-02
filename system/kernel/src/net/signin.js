import { createHash, randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { logger } from '../log.js';
import { checkFields, signInFields, netFail, notReady, onlyManual } from './drivers.js';

const log = logger('rete');
const LIFE = 10 * 60_000;     // a sign-in not finished by then is dropped
const PER_USER = 5;           // sign-ins of a user at once
const WAIT = 25_000;          // longest wait of one status request
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

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
  #flows = new Map();     // id → flow
  #byState = new Map();   // state → flow (until the provider sent the window back)

  constructor(drivers) {
    this.#drivers = drivers;
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
    return flow && flow.owner === principal.id ? flow : fail('not_found', 'Accesso scaduto o già usato: riprova');
  }

  /**
   * A new sign-in: { protocol, values, redirectUri } (values: the other fields of the connection,
   * which may change what the provider is asked). `origin`: the page's, from the request. → { id, url }
   */
  async start(principal, body, origin) {
    this.#prune();
    const driver = this.#drivers.get(body?.protocol) ?? fail('unavailable', `Protocollo non disponibile: ${body?.protocol}`);
    const field = signInFields(driver)[0] ?? fail('invalid', 'Questo protocollo non ha un accesso con account');
    const why = notReady(driver);
    if (why) fail('unavailable', typeof why === 'string' ? why : why.it ?? why.en ?? 'Protocollo non pronto');
    if ([...this.#flows.values()].filter(f => f.owner === principal.id).length >= PER_USER) fail('rate_limited', 'Troppi accessi in corso');
    const manual = body.manual === true || onlyManual(driver);
    if (manual && driver.signIn.manual !== true) fail('invalid', 'Questo protocollo non ha l’accesso incollando l’indirizzo');
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
      url = String(await driver.signIn.start({ values, redirectUri, state: flow.state, challenge }));
    } catch (err) {
      return netFail(err);
    }
    if (!isProviderPage(url)) fail('invalid', 'Indirizzo di accesso non valido');
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
    if (!flow.manual) fail('invalid', 'Questo accesso non si fa incollando l’indirizzo');
    let url;
    try { url = new URL(String(raw ?? '').trim().slice(0, 8192)); } catch { fail('invalid', 'Indirizzo non valido: copia tutto l’indirizzo della pagina che non si apre'); }
    const expected = new URL(MANUAL_REDIRECT);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname) fail('invalid', `L’indirizzo deve cominciare con ${MANUAL_REDIRECT}`);
    if (url.searchParams.get('state') !== flow.state) fail('invalid', 'Questo indirizzo è di un altro accesso: incolla quello dell’ultima pagina aperta');
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
    if (!flow) return { ok: false, text: 'Accesso scaduto o già usato: chiudi questa finestra e riprova.' };
    this.#byState.delete(flow.state);
    const code = query.get('code');
    if (!code) {
      const said = query.get('error_description') || query.get('error') || 'accesso non riuscito';
      flow.status = 'error';
      flow.error = String(said).split(/\r?\n/)[0].slice(0, 300);
      this.#settle(flow);
      return { ok: false, text: `Accesso non riuscito: ${flow.error}` };
    }
    try {
      const driver = this.#drivers.get(flow.protocol) ?? fail('unavailable', 'Protocollo non più disponibile');
      const result = await driver.signIn.finish({ values: flow.values, code: code.slice(0, 4096), redirectUri: flow.redirectUri, verifier: flow.verifier });
      const account = typeof result?.account === 'string' ? result.account.trim().slice(0, 200) : '';
      if (!account || result.secret === undefined) throw new Error('Il fornitore non ha dato un account');
      flow.result = { account, secret: result.secret };
      flow.status = 'done';
      return { ok: true, text: `Accesso eseguito come ${account}. Puoi chiudere questa finestra.` };
    } catch (err) {
      flow.status = 'error';
      flow.error = String(err?.message ?? err).slice(0, 300);
      log.warn(`Accesso a ${flow.protocol} non riuscito: ${flow.error}`);
      return { ok: false, text: `Accesso non riuscito: ${flow.error}` };
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
    if (flow.protocol !== protocol) fail('invalid', 'Accesso fatto per un altro protocollo');
    if (flow.status !== 'done') fail('invalid', flow.status === 'error' ? `Accesso non riuscito: ${flow.error}` : 'Accesso non ancora completato');
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
  try { url = new URL(String(raw ?? '')); } catch { fail('invalid', 'Indirizzo di ritorno non valido'); }
  if (url.pathname !== CALLBACK_PATH || url.search || url.hash || url.username || url.password) fail('invalid', 'Indirizzo di ritorno non valido');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK.has(url.hostname))) {
    fail('invalid', 'L’accesso con account funziona solo con lilOS su https, o su http da questo computer (localhost)');
  }
  if (origin && url.origin !== origin) fail('invalid', 'Indirizzo di ritorno non valido');
  return url.href;
}

/** The small page the sign-in window shows at the end (no script: lilOS closes the window itself). */
export function callbackPage({ ok, text }) {
  const escape = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>lilOS</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f5f7;color:#1f2328}main{max-width:420px;padding:24px;text-align:center}b{display:block;font-size:17px;margin-bottom:6px;color:${ok ? '#1e7a46' : '#c4373c'}}</style></head>
<body><main><b>${ok ? 'Fatto' : 'Accesso non riuscito'}</b>${escape(text)}</main></body></html>`;
}
