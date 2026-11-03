import { createHash, randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { httpRequest, readBody } from '../net/http.js';
import { networkMessage } from '../net/connect.js';

/**
 * OAuth 2.0 for NetTest's requests, with the provider the user names (any one: the addresses and
 * the client are the request's), unlike net/oauth.js where the providers are lilOS's (Microsoft,
 * Google) and the app an admin's. The tokens never reach the page: what it keeps is sealed.
 *
 * Grants:
 *   client_credentials, password    the kernel asks for a token when a request needs one, and keeps it
 *                                   (in memory, per user and settings) until 1 minute before it ends
 *   authorization_code              the user signs in on the provider's page (start → the window →
 *                                   callback or paste → status): PKCE always, the client secret when given.
 *                                   The tokens come back sealed ({ sealed, expires, scope, preview }):
 *                                   the request keeps them and the kernel renews them with the refresh
 *                                   token when they end (the new sealed tokens come back with the response)
 *
 * The provider sends the window back to CALLBACK on lilOS's own address (https, or http on this
 * computer), or (manual) to an address the user registered with the provider, which may not even
 * open: the user pastes it here. A sign-in lasts 10 minutes and is used once.
 *
 *   settings: { tokenUrl, authorizeUrl?, clientId, clientSecret?, scope?, audience?, send: 'body' | 'basic',
 *               username?, password?, params? }
 */
export const CALLBACK = '/api/calls/oauth/callback';
const LIFE = 10 * 60_000;
const PER_USER = 5;
const WAIT = 25_000;
const EARLY = 60_000;
const SEALED = 'nettest-oauth';
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const str = v => (typeof v === 'string' ? v.trim() : '');
const token = () => randomBytes(32).toString('base64url');
const said = (body, status) => String(body?.error_description ?? body?.error ?? `errore ${status}`).split(/\r?\n/)[0].slice(0, 240);

function webUrl(raw, what, { loopbackHttp = true } = {}) {
  let url;
  try { url = new URL(str(raw)); } catch { fail('invalid', `${what}: indirizzo non valido`); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && (loopbackHttp || LOOPBACK.has(url.hostname)))) fail('invalid', `${what}: serve un indirizzo https`);
  return url;
}

export class CallsOAuth {
  #calls;
  #flows = new Map();       // id → flow
  #byState = new Map();     // state → flow
  #cache = new Map();       // key → { token, expires }

  constructor(calls) {
    this.#calls = calls;
  }

  /** A token request to the provider: form → its answer (JSON with access_token). */
  async #request(principal, s, form) {
    const url = webUrl(s.tokenUrl, 'Indirizzo del token');
    const body = new URLSearchParams(form);
    const headers = [['Content-Type', 'application/x-www-form-urlencoded'], ['Accept', 'application/json'], ['User-Agent', 'lilOS NetTest']];
    if (str(s.clientId)) {
      if (s.send === 'basic') headers.push(['Authorization', `Basic ${Buffer.from(`${encodeURIComponent(str(s.clientId))}:${encodeURIComponent(str(s.clientSecret))}`).toString('base64')}`]);
      else {
        body.set('client_id', str(s.clientId));
        if (str(s.clientSecret)) body.set('client_secret', str(s.clientSecret));
      }
    }
    await this.#calls.guard.check({ url: url.href });
    let res, data;
    try {
      res = await httpRequest(url, {
        method: 'POST', headers, body: body.toString(), lookup: this.#calls.guard.lookup, timeoutMs: 30_000,
        tls: { pinned: await this.#calls.pinned(principal, url) },
      });
      ({ data } = await readBody(res, { max: 1 << 20 }));
    } catch (err) {
      if (err?.code === 'untrusted' || err?.code === 'forbidden') throw err;
      fail('unavailable', `OAuth 2.0: ${networkMessage(err)}`);
    }
    let answer = null;
    try { answer = JSON.parse(data.toString('utf8')); } catch {
      // A few providers answer as a form (GitHub without Accept)
      answer = Object.fromEntries(new URLSearchParams(data.toString('utf8')));
    }
    if (res.status >= 400 || typeof answer?.access_token !== 'string') fail('invalid', `OAuth 2.0: il fornitore ha risposto ${res.status}: ${said(answer, res.status)}`);
    return answer;
  }

  /** The access token for a request's auth (applyAuth's `tokens`). Renewed tokens go to `renewed`. */
  async token(principal, auth, renewed) {
    if (auth.grant === 'authorization_code') return this.#signedIn(principal, auth, renewed);
    if (auth.grant !== 'client_credentials' && auth.grant !== 'password') fail('invalid', 'OAuth 2.0: tipo di concessione non valido');
    const key = createHash('sha256').update(JSON.stringify([principal.id, auth.grant, str(auth.tokenUrl), str(auth.clientId), str(auth.clientSecret), str(auth.scope), str(auth.audience), str(auth.username), str(auth.password)])).digest('hex');
    const kept = this.#cache.get(key);
    if (kept && kept.expires - EARLY > Date.now()) return kept.token;
    const form = { grant_type: auth.grant };
    if (str(auth.scope)) form.scope = str(auth.scope);
    if (str(auth.audience)) form.audience = str(auth.audience);
    if (auth.grant === 'password') Object.assign(form, { username: str(auth.username), password: typeof auth.password === 'string' ? auth.password : '' });
    const answer = await this.#request(principal, auth, form);
    const expires = Date.now() + (Number(answer.expires_in) > 0 ? Number(answer.expires_in) * 1000 : 3600_000);
    if (this.#cache.size > 500) this.#cache.clear();
    this.#cache.set(key, { token: answer.access_token, expires });
    return answer.access_token;
  }

  async #signedIn(principal, auth, renewed) {
    if (typeof auth.tokens !== 'string') fail('invalid', 'OAuth 2.0: nessun accesso fatto: premi «Accedi»');
    // Per user: the same sealed tokens in a file passed to someone else are not theirs to use
    const cacheKey = `${principal.id}|${auth.tokens}`;
    const fresh = this.#cache.get(cacheKey);
    if (fresh && fresh.expires - EARLY > Date.now()) return fresh.token;
    let data;
    try { data = await this.#calls.secrets.open(auth.tokens); } catch { /* another lilOS */ }
    if (data?.kind !== SEALED || data.user !== principal.id) fail('forbidden', 'OAuth 2.0: l’accesso salvato vale solo per chi l’ha fatto, su questo lilOS: accedi di nuovo');
    if (data.expires - EARLY > Date.now() || !data.refresh) {
      if (data.expires < Date.now() && !data.refresh) fail('invalid', 'OAuth 2.0: il token è scaduto: accedi di nuovo');
      return data.access;
    }
    const answer = await this.#request(principal, data.settings, { grant_type: 'refresh_token', refresh_token: data.refresh, ...(data.settings.scope && { scope: data.settings.scope }) });
    const sealed = await this.#seal(principal, data.settings, answer, data.refresh);
    if (this.#cache.size > 500) this.#cache.clear();
    this.#cache.set(cacheKey, { token: answer.access_token, expires: sealed.expires });
    renewed?.(auth.tokens, sealed);
    return answer.access_token;
  }

  async #seal(principal, settings, answer, oldRefresh = null) {
    const expires = Date.now() + (Number(answer.expires_in) > 0 ? Number(answer.expires_in) * 1000 : 3600_000);
    const keep = { tokenUrl: str(settings.tokenUrl), clientId: str(settings.clientId), clientSecret: str(settings.clientSecret), scope: str(settings.scope), send: settings.send === 'basic' ? 'basic' : 'body' };
    const sealed = await this.#calls.secrets.seal({ kind: SEALED, user: principal.id, access: answer.access_token, refresh: answer.refresh_token ?? oldRefresh, expires, settings: keep });
    const t = answer.access_token;
    return { sealed, expires, scope: typeof answer.scope === 'string' ? answer.scope.slice(0, 500) : str(settings.scope), tokenType: str(answer.token_type) || 'Bearer', preview: t.length >= 40 ? `${t.slice(0, 4)}…` : '…', refresh: !!(answer.refresh_token ?? oldRefresh) };
  }

  /** Asks a token now (client_credentials, password) and gives it sealed, as a sign-in would: the «Ottieni token» button. */
  async fetch(principal, settings) {
    if (settings.grant !== 'client_credentials' && settings.grant !== 'password') fail('invalid', 'OAuth 2.0: tipo di concessione non valido');
    const form = { grant_type: settings.grant };
    if (str(settings.scope)) form.scope = str(settings.scope);
    if (str(settings.audience)) form.audience = str(settings.audience);
    if (settings.grant === 'password') Object.assign(form, { username: str(settings.username), password: typeof settings.password === 'string' ? settings.password : '' });
    return this.#seal(principal, settings, await this.#request(principal, settings, form));
  }

  // ---------- Sign-in on the provider's page (authorization code + PKCE) ----------

  #prune() {
    const now = Date.now();
    for (const f of this.#flows.values()) if (now - f.created > LIFE) this.#drop(f);
  }

  #drop(flow) {
    this.#flows.delete(flow.id);
    this.#byState.delete(flow.state);
    for (const wake of flow.waiters) wake();
    flow.waiters.clear();
  }

  #mine(principal, id) {
    this.#prune();
    const flow = typeof id === 'string' ? this.#flows.get(id) : null;
    return flow && flow.owner === principal.id ? flow : fail('not_found', 'Accesso scaduto o già usato: riprova');
  }

  /** → { id, url, redirectUri, manual }: the page opens url in a window. */
  start(principal, settings, origin) {
    this.#prune();
    if ([...this.#flows.values()].filter(f => f.owner === principal.id).length >= PER_USER) fail('rate_limited', 'Troppi accessi in corso');
    const authorize = webUrl(settings.authorizeUrl, 'Indirizzo di autorizzazione');
    webUrl(settings.tokenUrl, 'Indirizzo del token');
    if (!str(settings.clientId)) fail('invalid', 'OAuth 2.0: manca l’ID del client');
    let redirectUri, manual = false;
    if (str(settings.redirectUri)) {
      redirectUri = webUrl(settings.redirectUri, 'Indirizzo di ritorno', { loopbackHttp: false }).href;
      manual = true;
    } else {
      const base = webUrl(origin ?? '', 'lilOS', { loopbackHttp: false });
      redirectUri = new URL(CALLBACK, base.origin).href;
    }
    const flow = {
      id: token().slice(0, 24), owner: principal.id, settings: { ...settings }, state: token(), verifier: token(), redirectUri, manual,
      created: Date.now(), status: 'pending', error: null, result: null, waiters: new Set(),
    };
    const extra = settings.params && typeof settings.params === 'object' ? settings.params : {};
    for (const [k, v] of Object.entries(extra)) if (typeof v === 'string' && k.length < 64) authorize.searchParams.set(k, v);
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('client_id', str(settings.clientId));
    authorize.searchParams.set('redirect_uri', redirectUri);
    if (str(settings.scope)) authorize.searchParams.set('scope', str(settings.scope));
    if (str(settings.audience)) authorize.searchParams.set('audience', str(settings.audience));
    authorize.searchParams.set('state', flow.state);
    authorize.searchParams.set('code_challenge', createHash('sha256').update(flow.verifier).digest('base64url'));
    authorize.searchParams.set('code_challenge_method', 'S256');
    this.#flows.set(flow.id, flow);
    this.#byState.set(flow.state, flow);
    return { id: flow.id, url: authorize.href, redirectUri, manual };
  }

  /** The provider sent the window back (?code&state). → { ok, text } for the page shown there. */
  async callback(query) {
    this.#prune();
    const flow = this.#byState.get(query.get('state') ?? '');
    if (!flow) return { ok: false, text: 'Accesso scaduto o già usato: chiudi questa finestra e riprova.' };
    this.#byState.delete(flow.state);
    const code = query.get('code');
    try {
      if (!code) fail('invalid', String(query.get('error_description') || query.get('error') || 'accesso non riuscito').split(/\r?\n/)[0].slice(0, 300));
      const answer = await this.#request({ id: flow.owner }, flow.settings, { grant_type: 'authorization_code', code: code.slice(0, 4096), redirect_uri: flow.redirectUri, code_verifier: flow.verifier });
      flow.result = await this.#seal({ id: flow.owner }, flow.settings, answer);
      flow.status = 'done';
      return { ok: true, text: 'Accesso eseguito: torna a NetTest. Puoi chiudere questa finestra.' };
    } catch (err) {
      flow.status = 'error';
      flow.error = String(err?.message ?? err).slice(0, 300);
      return { ok: false, text: `Accesso non riuscito: ${flow.error}` };
    } finally {
      for (const wake of flow.waiters) wake();
      flow.waiters.clear();
    }
  }

  /** A sign-in to an address that does not come back to lilOS: the user pastes where the window ended. */
  async paste(principal, id, raw) {
    const flow = this.#mine(principal, id);
    let url;
    try { url = new URL(String(raw ?? '').trim().slice(0, 8192)); } catch { fail('invalid', 'Indirizzo non valido: copia tutto l’indirizzo della pagina'); }
    const expected = new URL(flow.redirectUri);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname) fail('invalid', `L’indirizzo deve cominciare con ${flow.redirectUri}`);
    if (url.searchParams.get('state') !== flow.state) fail('invalid', 'Questo indirizzo è di un altro accesso');
    if (flow.status === 'pending') await this.callback(url.searchParams);
    return this.#view(flow);
  }

  #view(flow) {
    const out = { status: flow.status, ...(flow.error && { error: flow.error }), ...(flow.result && { tokens: flow.result }) };
    if (flow.status !== 'pending') this.#drop(flow);   // the result is taken once
    return out;
  }

  /** { status: 'pending' | 'done' | 'error', error?, tokens? }; with wait, answers when it changes (25 s at most). */
  async status(principal, id, { wait = false } = {}) {
    const flow = this.#mine(principal, id);
    if (wait && flow.status === 'pending') {
      await new Promise(resolve => {
        const timer = setTimeout(done, WAIT);
        function done() { clearTimeout(timer); flow.waiters.delete(done); resolve(); }
        flow.waiters.add(done);
      });
    }
    return this.#view(flow);
  }

  cancel(principal, id) {
    const flow = this.#flows.get(id);
    if (flow && flow.owner === principal.id) this.#drop(flow);
  }
}
