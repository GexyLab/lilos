import { fail } from '../errors.js';
import { send } from '../http.js';

/**
 *   GET    /api/apps                     installed apps: [{ ...state, manifest }]
 *   GET    /api/apps/:id/file?path=…     a file of the app (its code, for lilOS to run it)
 *   GET    /api/apps/:id/v/:version/<path>   the same, path-like: system apps are imported from here
 *   GET    /api/commons/:name/:version   a cached library
 *   POST   /api/apps                     { source, grant, allowUnsigned }          admins
 *   POST   /api/apps/:id/update          { ref, reinstall, grant, allowUnsigned }  admins
 *   DELETE /api/apps/:id                                                          admins
 *   GET    /api/apps-security            { isolated }   how apps run unless an app has its own choice
 *   PUT    /api/apps-security            { isolated: true | false }                admins
 *   PUT    /api/apps/:id/security        { isolated: true | false | null }         admins (null: the general rule)
 */
const ID = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const TYPES = { js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', wasm: 'application/wasm', html: 'text/plain', txt: 'text/plain', md: 'text/plain' };
const FILE_PATH = /^(?!.*\.\.)[\w.-]+(\/[\w.-]+){0,15}$/;
// System apps run inside lilOS: their modules and workers are loaded from here, so their own
// requests (chunks, workers, wasm) must be allowed
const CODE_CSP = "default-src 'self' blob: data:; script-src 'self' blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'";

const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');
const appParam = id => (ID.test(id) ? id : fail('invalid', 'App non valida'));

/** What a user sees of an app's state: where it came from on the kernel's disk is the admins'. */
export function visible(app, principal) {
  if (principal.role === 'admin' || app.source?.type !== 'local') return app;
  return { ...app, source: { type: 'local' } };
}

export function appRoutes(kernel) {
  const { router, installer } = kernel;

  router.add('GET', '/api/apps', async ({ principal }) => (await installer.list()).map(a => visible(a, signedIn(principal))));

  router.add('GET', '/api/apps/:id/file', async ({ principal, params, query, res }) => {
    const path = query.get('path') ?? '';
    if (!/^(?!.*\.\.)[\w.-]+(\/[\w.-]+){0,15}$/.test(path)) fail('invalid', 'Percorso non valido');
    const data = await installer.file(signedIn(principal), appParam(params.id), path);
    send(res, 200, data, { 'Content-Type': `${TYPES[path.split('.').pop()] ?? 'application/octet-stream'}; charset=utf-8` });
  });

  // Path-like, so that a module's relative imports (chunks, workers) resolve next to it
  router.add('GET', '/api/apps/:id/v/:version/*', async ({ principal, params, res }) => {
    if (!FILE_PATH.test(params.rest) || !/^\d+\.\d+\.\d+$/.test(params.version)) fail('invalid', 'Percorso non valido');
    const data = await installer.file(signedIn(principal), appParam(params.id), params.rest, params.version);
    const type = TYPES[params.rest.split('.').pop()] ?? 'application/octet-stream';
    send(res, 200, data, { 'Content-Type': type.startsWith('text/') || type.endsWith('json') ? `${type}; charset=utf-8` : type, 'Content-Security-Policy': CODE_CSP, 'Cache-Control': 'private, max-age=31536000, immutable' });
  });

  router.add('GET', '/api/commons/:name/:version', async ({ principal, params, res }) => {
    if (!/^[\w.-]{1,64}$/.test(params.name) || !/^\d+\.\d+\.\d+$/.test(params.version)) fail('invalid', 'Libreria non valida');
    send(res, 200, await installer.library(signedIn(principal), params.name, params.version), { 'Content-Type': 'text/javascript; charset=utf-8' });
  });

  router.add('POST', '/api/apps', async ({ principal, json }) => {
    const body = await json(64 << 10);
    return installer.install(signedIn(principal), { source: body.source, grant: strings(body.grant), allowUnsigned: body.allowUnsigned === true });
  });

  router.add('POST', '/api/apps/:id/update', async ({ principal, params, json }) => {
    const body = await json(64 << 10);
    return installer.update(signedIn(principal), appParam(params.id), {
      ...(typeof body.ref === 'string' && { ref: body.ref }),
      reinstall: body.reinstall === true, grant: strings(body.grant), allowUnsigned: body.allowUnsigned === true,
    });
  });

  router.add('DELETE', '/api/apps/:id', async ({ principal, params }) => {
    await installer.uninstall(signedIn(principal), appParam(params.id));
  });

  router.add('GET', '/api/apps-security', async ({ principal }) => {
    signedIn(principal);
    return installer.security();
  });

  router.add('PUT', '/api/apps-security', async ({ principal, json }) => {
    const body = await json(4 << 10);
    return installer.setSecurity(signedIn(principal), { isolated: body.isolated });
  });

  router.add('PUT', '/api/apps/:id/security', async ({ principal, params, json }) => {
    const body = await json(4 << 10);
    return visible(await installer.setAppSecurity(signedIn(principal), appParam(params.id), body.isolated ?? null), principal);
  });
}

const strings = v => (Array.isArray(v) ? v.filter(s => typeof s === 'string').slice(0, 100) : []);
