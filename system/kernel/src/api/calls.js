import { fail } from '../errors.js';
import { send } from '../http.js';
import { acceptSocket } from '../ws.js';
import { callbackPage } from '../net/signin.js';
import { CALLBACK } from '../calls/oauth.js';

/**
 * NetTest's requests (calls/), for the signed-in user: each user sees and changes only theirs.
 *
 *   GET    /api/calls                           { protocols, scripts, sessions, multiUser }
 *   POST   /api/calls/send                      { request, chain, environment, collection, globals } → { result, vars, secret, renewed }
 *   POST   /api/calls/runs                      { collection, only?, environment, globals, data?, iterations?, delayMs?, stopOnError? } → { id, total }
 *   GET    /api/calls/runs/:id?after=&wait=1    { results, next, done, summary, total }
 *   DELETE /api/calls/runs/:id                  stops it
 *   POST   /api/calls/seal                      { value } → { sealed }   a secret value for a .nettest file
 *   POST   /api/calls/trust                     { host, port, fingerprint }   the user confirmed a certificate
 *   POST   /api/calls/describe                  { request, environment… } → what the server offers (gRPC reflection)
 *   POST   /api/calls/oauth/token               { settings } → tokens (sealed): client credentials, password
 *   POST   /api/calls/oauth/signin              { settings } → { id, url, redirectUri, manual }   sign-in on the provider's page
 *   GET    /api/calls/oauth/signin/:id?wait=1   { status, error?, tokens? }
 *   POST   /api/calls/oauth/signin/:id/paste    { url } → status
 *   DELETE /api/calls/oauth/signin/:id
 *   GET    /api/calls/oauth/callback            where the provider sends the window back (no session)
 *   GET    /api/calls/sessions                  [session]
 *   POST   /api/calls/sessions                  { request, environment, collection, globals } → session
 *   DELETE /api/calls/sessions/:id              closes it
 *   GET    /api/calls/sessions/:id/socket       WebSocket: the session's messages (calls/sessions.js)
 *
 * Errors of a request (the network, the server) are in the result, not HTTP errors; 'untrusted'
 * (a certificate to confirm) is result.error.code with result.error.trust.
 */
const ID = /^[a-f0-9]{16}$/;
const SIGNIN = /^[\w-]{24}$/;
const MAX_BODY = 64 << 20;
const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');
const plain = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const idOf = (params, what) => (ID.test(params.id) ? params.id : fail('invalid', `${what} non valida`));
const signinOf = params => (SIGNIN.test(params.id) ? params.id : fail('invalid', 'Accesso non valido'));

export function callsRoutes(kernel) {
  const { router, sockets, calls } = kernel;

  router.add('GET', '/api/calls', async ({ principal }) => calls.info(signedIn(principal)));

  router.add('POST', '/api/calls/send', async ({ res, principal, json }) => {
    const user = signedIn(principal);
    const body = await json(MAX_BODY);
    // The page that asked went away (Annulla): the request stops
    const abort = new AbortController();
    res.once('close', () => { if (!res.writableFinished) abort.abort(); });
    return calls.send(user, body, { signal: abort.signal });
  });

  router.add('POST', '/api/calls/runs', async ({ principal, json }) => calls.run(signedIn(principal), await json(MAX_BODY)));
  router.add('GET', '/api/calls/runs/:id', async ({ principal, params, query }) => calls.progress(signedIn(principal), idOf(params, 'Esecuzione'), {
    after: Math.max(0, Number(query.get('after')) || 0), wait: query.get('wait') === '1',
  }));
  router.add('DELETE', '/api/calls/runs/:id', async ({ principal, params }) => { calls.cancelRun(signedIn(principal), idOf(params, 'Esecuzione')); });

  router.add('POST', '/api/calls/seal', async ({ principal, json }) => calls.seal(signedIn(principal), (await json(128 << 10)).value));
  router.add('POST', '/api/calls/trust', async ({ principal, json }) => { await calls.trust(signedIn(principal), await json(4 << 10)); });
  router.add('POST', '/api/calls/describe', async ({ principal, json }) => calls.describe(signedIn(principal), await json(4 << 20)));

  router.add('POST', '/api/calls/oauth/token', async ({ principal, json }) => calls.oauth.fetch(signedIn(principal), plain((await json(64 << 10)).settings)));
  // Before /oauth/signin/:id: the provider sends the window back here, without lilOS's session
  router.add('GET', CALLBACK, async ({ res, query }) => {
    send(res, 200, callbackPage(await calls.oauth.callback(query)), { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" });
  });
  router.add('POST', '/api/calls/oauth/signin', async ({ req, principal, json }) => calls.oauth.start(signedIn(principal), plain((await json(64 << 10)).settings), req.headers.origin ?? null));
  router.add('GET', '/api/calls/oauth/signin/:id', async ({ principal, params, query }) => calls.oauth.status(signedIn(principal), signinOf(params), { wait: query.get('wait') === '1' }));
  router.add('POST', '/api/calls/oauth/signin/:id/paste', async ({ principal, params, json }) => calls.oauth.paste(signedIn(principal), signinOf(params), (await json(16 << 10)).url));
  router.add('DELETE', '/api/calls/oauth/signin/:id', async ({ principal, params }) => { calls.oauth.cancel(signedIn(principal), signinOf(params)); });

  router.add('GET', '/api/calls/sessions', async ({ principal }) => calls.sessions.list(signedIn(principal)));
  router.add('POST', '/api/calls/sessions', async ({ principal, json }) => calls.openSession(signedIn(principal), await json(4 << 20)));
  router.add('DELETE', '/api/calls/sessions/:id', async ({ principal, params }) => { await calls.sessions.close(signedIn(principal), idOf(params, 'Sessione')); });

  sockets.add('GET', '/api/calls/sessions/:id/socket', async ({ req, socket, head, principal, params }) => {
    const user = signedIn(principal);
    const session = calls.sessions.get(user, idOf(params, 'Sessione'));
    const ws = acceptSocket(req, socket, head, { maxMessage: 16 << 20 });
    if (!ws) fail('invalid', 'Serve un WebSocket');
    session.attach(ws);
  });
}
