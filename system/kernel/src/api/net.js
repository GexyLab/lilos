import { Transform } from 'node:stream';
import { KernelError, fail } from '../errors.js';
import { send, sendStream } from '../http.js';
import { CALLBACK_PATH, callbackPage } from '../net/signin.js';

/**
 * The network connections of the signed-in user (net/network.js) and their transfers
 * (net/transfers.js). Each user sees and changes only theirs.
 *
 *   GET    /api/net                              { protocols, mounts }
 *   POST   /api/net/mounts                       { name, protocol, values, auto, remember, trust?, secret } → mount
 *   PUT    /api/net/mounts/:id                   { name?, values?, auto?, remember?, forget?, secret? } → mount
 *   DELETE /api/net/mounts/:id
 *   POST   /api/net/mounts/:id/connect           { secret?, remember?, trust? } → mount
 *   POST   /api/net/mounts/:id/disconnect        → mount
 *   POST   /api/net/test                         { protocol, values, trust?, secret }   tries without saving
 *   POST   /api/net/shares                       { protocol, values, trust?, secret } → { shares }
 *   GET    /api/net/mounts/:id/list?path=        { entries: [{ name, type, size, modified }] }
 *   GET    /api/net/mounts/:id/content?path=     the bytes of a file
 *   PUT    /api/net/mounts/:id/content?path=     writes a file (body: its bytes, at most 1 GB)
 *   POST   /api/net/mounts/:id/ops               { op: 'mkdir' | 'rename' | 'remove', path, to? }
 *   GET    /api/net/mounts/:id/link?path=        { url }   the page on the provider's site (protocols with links)
 *   GET    /api/net/mounts/:id/space             { used, total } | { used: null }   the account's space (protocols with space)
 *   POST   /api/net/mounts/:id/import            → { id, url }   the provider's page to pick what to copy (protocols with an importer)
 *   GET    /api/net/mounts/:id/import/:imp?wait=1   { status, count, size, path, error? }   path: copy it with POST /transfers
 *   POST   /api/net/mounts/:id/put-home          { home, folder, ifExists } → { path, name }   a file of the home into the connection
 *   POST   /api/net/signin                       { protocol, values, redirectUri, manual? } → { id, url, manual }   sign-in on the provider's page
 *   POST   /api/net/signin/:id/paste             { url } → status   a sign-in by hand: the address of the page that did not open
 *   GET    /api/net/signin/:id?wait=1            { status: 'pending' | 'done' | 'error', account?, error? }
 *   DELETE /api/net/signin/:id
 *   GET    /api/net/signin/callback              where the provider sends the window back (no session: see net/signin.js)
 *   GET    /api/net/transfers                    the snapshot the transfer window shows
 *   GET    /api/net/transfers/items/:id          { items, more }   inside a folder of a queue
 *   POST   /api/net/transfers                    { sources: [ref], target: ref, workspace? } → { queue }
 *   POST   /api/net/transfers/:action            cancel { ids?, queue?, all? } · resolve { id, action, all? }
 *                                                retry { ids?, queue? } · dismiss { ids?, queue?, all? } · pause { queue, paused }
 *
 * A finished sign-in is used by its id: `signin` in POST /mounts, PUT /mounts/:id, /connect and /test.
 *
 * Errors of a connection: 'secret_required' (details.reason 'missing' or 'auth': ask the password;
 * 'signin': sign in again),
 * 'untrusted' (details.trust { kind, fingerprint, text }: ask the user to confirm, then connect
 * again with `trust`), 'unavailable' (the server cannot be reached).
 */
const ID = /^[a-f0-9]{16}$/;
const SIGNIN = /^[\w-]{24}$/;
const ITEM = /^[a-f0-9]{20}$/;
const MAX_UPLOAD = 1 << 30;

const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');
const mountId = params => (ID.test(params.id) ? params.id : fail('invalid', 'Connessione non valida'));
const plain = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** Connections tried at once by a user (Prova, Elenca): a few, not a scan of the network. */
const trying = new Map();
async function limited(user, fn) {
  const n = trying.get(user.id) ?? 0;
  if (n >= 3) fail('rate_limited', 'Troppe prove di connessione in corso');
  trying.set(user.id, n + 1);
  try {
    return await fn();
  } finally {
    const left = trying.get(user.id) - 1;
    if (left > 0) trying.set(user.id, left); else trying.delete(user.id);
  }
}

export function netRoutes(kernel) {
  const { router, network: net, transfers } = kernel;

  router.add('GET', '/api/net', async ({ principal }) => net.list(signedIn(principal)));

  router.add('POST', '/api/net/mounts', async ({ principal, json }) => {
    const body = await json(256 << 10);
    return net.create(signedIn(principal), body, plain(body.secret));
  });

  router.add('PUT', '/api/net/mounts/:id', async ({ principal, params, json }) => {
    const body = await json(256 << 10);
    return net.update(signedIn(principal), mountId(params), body, plain(body.secret));
  });

  router.add('DELETE', '/api/net/mounts/:id', async ({ principal, params }) => {
    await net.remove(signedIn(principal), mountId(params));
  });

  router.add('POST', '/api/net/mounts/:id/connect', async ({ principal, params, json }) => {
    const { secret = null, remember, trust, signin } = await json(256 << 10);
    return net.connect(signedIn(principal), mountId(params), { secret: secret && plain(secret), remember, trust, signin });
  });

  router.add('POST', '/api/net/mounts/:id/disconnect', async ({ principal, params }) => net.disconnect(signedIn(principal), mountId(params)));

  router.add('POST', '/api/net/test', async ({ principal, json }) => {
    const user = signedIn(principal), body = await json(256 << 10);
    await limited(user, () => net.test(user, body, plain(body.secret)));
    return { ok: true };
  });

  router.add('POST', '/api/net/shares', async ({ principal, json }) => {
    const user = signedIn(principal), body = await json(256 << 10);
    return { shares: await limited(user, () => net.shares(user, body, plain(body.secret))) };
  });

  router.add('GET', '/api/net/mounts/:id/list', async ({ principal, params, query }) => {
    return { entries: await net.listFolder(signedIn(principal), mountId(params), query.get('path') ?? '/') };
  });

  router.add('GET', '/api/net/mounts/:id/content', async ({ req, res, principal, params, query }) => {
    const user = signedIn(principal), id = mountId(params), path = query.get('path') ?? '';
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    const entry = await net.stat(user, id, path) ?? fail('not_found', 'Non esiste sul server');
    if (entry.type === 'folder') fail('invalid', 'Non è un file');
    // A document with no bytes of its own (Google's): its export, of a size not known before
    if (entry.web && !entry.export) fail('invalid', 'Si apre solo sul web');
    const stream = await net.read(user, id, path, { signal: controller.signal, ...(entry.web && { format: entry.export }) });
    // A size of 0 may be one the server does not say (Google Photos): no length then
    await sendStream(res, stream, entry.size > 0 && !entry.web ? { 'Content-Length': String(entry.size) } : {});
  });

  router.add('PUT', '/api/net/mounts/:id/content', async ({ req, principal, params, query }) => {
    const user = signedIn(principal), id = mountId(params), path = query.get('path') ?? '';
    if (Number(req.headers['content-length']) > MAX_UPLOAD) fail('too_large', 'File troppo grande');
    const controller = new AbortController();
    let size = 0;
    const body = new Transform({
      transform(chunk, _enc, done) {
        size += chunk.length;
        done(size > MAX_UPLOAD ? new KernelError('too_large', 'File troppo grande') : null, chunk);
      },
    });
    req.on('error', err => body.destroy(err));
    req.on('close', () => { if (!req.complete) { controller.abort(); body.destroy(new Error('Invio interrotto')); } });
    body.on('error', () => {});   // the driver gets it through the stream it reads
    req.pipe(body);
    const length = Number(req.headers['content-length']);
    await net.write(user, id, path, body, { signal: controller.signal, ...(Number.isSafeInteger(length) && { size: length }) });
  });

  router.add('POST', '/api/net/mounts/:id/ops', async ({ principal, params, json }) => {
    const user = signedIn(principal), id = mountId(params);
    const { op, path, to } = await json(16 << 10);
    if (op === 'mkdir') return net.mkdir(user, id, path);
    if (op === 'rename') return net.rename(user, id, path, to);
    if (op === 'remove') return net.removePath(user, id, path);
    return fail('invalid', 'Operazione non valida');
  });

  router.add('GET', '/api/net/mounts/:id/link', async ({ principal, params, query }) => {
    return { url: await net.link(signedIn(principal), mountId(params), query.get('path') ?? '/') };
  });

  router.add('GET', '/api/net/mounts/:id/space', async ({ principal, params }) => {
    return (await net.space(signedIn(principal), mountId(params))) ?? { used: null };
  });

  router.add('POST', '/api/net/mounts/:id/import', async ({ principal, params }) => net.importStart(signedIn(principal), mountId(params)));

  router.add('GET', '/api/net/mounts/:id/import/:imp', async ({ principal, params, query }) => {
    if (!/^[\w.-]{1,200}$/.test(params.imp)) fail('invalid', 'Importazione non valida');
    return net.importStatus(signedIn(principal), mountId(params), params.imp, { wait: query.get('wait') === '1' });
  });

  router.add('POST', '/api/net/mounts/:id/put-home', async ({ principal, params, json }) => {
    const { home, folder, ifExists } = await json(16 << 10);
    return net.putHome(signedIn(principal), mountId(params), { home, folder: typeof folder === 'string' ? folder : '/', ifExists: ['replace', 'keep'].includes(ifExists) ? ifExists : 'ask' });
  });

  // Before /signin/:id: the provider sends the window back here, without lilOS's session
  router.add('GET', CALLBACK_PATH, async ({ res, query }) => {
    const page = callbackPage(await net.signins.callback(query));
    send(res, 200, page, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" });
  });

  router.add('POST', '/api/net/signin', async ({ req, principal, json }) => {
    const user = signedIn(principal), body = await json(64 << 10);
    return net.signins.start(user, { protocol: body.protocol, values: plain(body.values), redirectUri: body.redirectUri, manual: body.manual === true }, req.headers.origin ?? null);
  });

  router.add('POST', '/api/net/signin/:id/paste', async ({ principal, params, json }) => {
    if (!SIGNIN.test(params.id)) fail('invalid', 'Accesso non valido');
    const { url } = await json(16 << 10);
    return net.signins.paste(signedIn(principal), params.id, url);
  });

  router.add('GET', '/api/net/signin/:id', async ({ principal, params, query }) => {
    if (!SIGNIN.test(params.id)) fail('invalid', 'Accesso non valido');
    return net.signins.status(signedIn(principal), params.id, { wait: query.get('wait') === '1' });
  });

  router.add('DELETE', '/api/net/signin/:id', async ({ principal, params }) => {
    if (SIGNIN.test(params.id)) net.signins.cancel(signedIn(principal), params.id);
  });

  router.add('GET', '/api/net/transfers', async ({ principal }) => transfers.snapshot(signedIn(principal)));

  router.add('GET', '/api/net/transfers/items/:id', async ({ principal, params }) => {
    if (!ITEM.test(params.id)) fail('invalid', 'Elemento non valido');
    return transfers.children(signedIn(principal), params.id);
  });

  router.add('POST', '/api/net/transfers', async ({ principal, json }) => transfers.enqueue(signedIn(principal), await json(1 << 20)));

  for (const action of ['cancel', 'resolve', 'retry', 'dismiss', 'pause']) {
    router.add('POST', `/api/net/transfers/${action}`, async ({ principal, json }) => {
      await transfers[action](signedIn(principal), await json(256 << 10));
    });
  }
}
