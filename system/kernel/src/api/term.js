import { fail } from '../errors.js';
import { acceptSocket } from '../ws.js';

/**
 * The remote terminals of the signed-in user (term/terminals.js). Each user sees and changes only theirs.
 *
 *   GET    /api/term                            { protocols, encodings, hosts, sessions }
 *   POST   /api/term/hosts                      { name, folder, protocol, values, settings, remember, secret } → host
 *   PUT    /api/term/hosts/:id                  { name?, folder?, values?, settings?, remember?, forget?, secret? } → host
 *   DELETE /api/term/hosts/:id
 *   GET    /api/term/sessions                   [session]
 *   POST   /api/term/sessions                   { host } | { protocol, values, secret?, settings? } | { mount, path? } → session
 *   DELETE /api/term/sessions/:id               closes it
 *   GET    /api/term/sessions/:id/socket?cols=&rows=    WebSocket: the session's screen and keys
 *
 * The socket is opened by the browser without the X-Lilos header: it must carry an Origin that
 * lilOS allows (http.js checkSocketOrigin), so another site cannot open one with the user's cookie.
 */
const ID = /^[a-f0-9]{16}$/;
const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');
const plain = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const idOf = (params, what) => (ID.test(params.id) ? params.id : fail('invalid', `${what} non valido`));

export function termRoutes(kernel) {
  const { router, sockets, terminals: terms } = kernel;

  router.add('GET', '/api/term', async ({ principal }) => terms.list(signedIn(principal)));

  router.add('POST', '/api/term/hosts', async ({ principal, json }) => {
    const body = await json(256 << 10);
    return terms.create(signedIn(principal), body, plain(body.secret));
  });

  router.add('PUT', '/api/term/hosts/:id', async ({ principal, params, json }) => {
    const body = await json(256 << 10);
    return terms.update(signedIn(principal), idOf(params, 'Host'), body, plain(body.secret));
  });

  router.add('DELETE', '/api/term/hosts/:id', async ({ principal, params }) => {
    await terms.remove(signedIn(principal), idOf(params, 'Host'));
  });

  router.add('GET', '/api/term/sessions', async ({ principal }) => terms.sessions(signedIn(principal)));

  router.add('POST', '/api/term/sessions', async ({ principal, json }) => terms.open(signedIn(principal), await json(256 << 10)));

  router.add('DELETE', '/api/term/sessions/:id', async ({ principal, params }) => {
    await terms.close(signedIn(principal), idOf(params, 'Sessione'));
  });

  sockets.add('GET', '/api/term/sessions/:id/socket', async ({ req, socket, head, principal, params, query }) => {
    const user = signedIn(principal), id = idOf(params, 'Sessione');
    terms.sessions(user).some(s => s.id === id) || fail('not_found', 'Sessione inesistente');
    const ws = acceptSocket(req, socket, head, { maxMessage: 256 << 10 });
    if (!ws) fail('invalid', 'Serve un WebSocket');
    const size = key => (query.has(key) ? Number(query.get(key)) : undefined);
    terms.attach(user, id, ws, { cols: size('cols'), rows: size('rows') });
  });
}
