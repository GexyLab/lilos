import { fail } from '../errors.js';
import { logger } from '../log.js';

/**
 * What the AppStore uses: reading repositories and catalogs for every signed-in user, the rest for admins:
 *   GET    /api/repos                    [repo]
 *   POST   /api/repos                    { url, name? } → repo
 *   DELETE /api/repos/:id
 *   GET    /api/repos/:id/catalog        apps and modules the repository offers (see repos.js)
 *   GET    /api/repos/:id/readme?path=   the whole README.md of one of its packages (text)
 *   GET    /api/modules                  installed kernel modules (see modulePackage.js)
 *   POST   /api/modules                  { source, allowUnsigned } → { name, version, restartRequired }
 *   POST   /api/modules/:name/update     { ref?, allowUnsigned }
 *   DELETE /api/modules/:name
 *   POST   /api/kernel/restart           restarts the kernel (when run by run.js)
 */
const log = logger('kernel');
const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');
const admin = principal => (signedIn(principal).role === 'admin' ? principal : fail('forbidden', 'Solo un amministratore'));
const NAME = /^[a-z][a-z0-9-]{0,40}$/;

export function storeRoutes(kernel) {
  const { router, repos, moduleAdmin } = kernel;

  router.add('GET', '/api/repos', async ({ principal }) => {
    signedIn(principal);
    return repos.list();
  });
  router.add('POST', '/api/repos', async ({ principal, json }) => {
    const { url, name } = await json(16 << 10);
    return repos.add(admin(principal), { url, name });
  });
  router.add('DELETE', '/api/repos/:id', async ({ principal, params }) => {
    await repos.remove(admin(principal), params.id);
  });
  router.add('GET', '/api/repos/:id/catalog', async ({ principal, params }) => {
    signedIn(principal);
    return repos.catalog(params.id);
  });
  router.add('GET', '/api/repos/:id/readme', async ({ principal, params, query }) => {
    signedIn(principal);
    return repos.readme(params.id, query.get('path') ?? '');
  });

  router.add('GET', '/api/modules', async ({ principal }) => {
    admin(principal);
    return moduleAdmin.list();
  });
  router.add('POST', '/api/modules', async ({ principal, json }) => {
    const body = await json(16 << 10);
    return moduleAdmin.install(admin(principal), { source: body.source, allowUnsigned: body.allowUnsigned === true });
  });
  router.add('POST', '/api/modules/:name/update', async ({ principal, params, json }) => {
    const body = await json(16 << 10);
    if (!NAME.test(params.name)) fail('invalid', 'Nome non valido');
    return moduleAdmin.update(admin(principal), params.name, { ...(typeof body.ref === 'string' && { ref: body.ref }), allowUnsigned: body.allowUnsigned === true });
  });
  router.add('DELETE', '/api/modules/:name', async ({ principal, params }) => moduleAdmin.remove(admin(principal), params.name));

  router.add('POST', '/api/kernel/restart', async ({ principal }) => {
    admin(principal);
    if (!process.env.LILOS_SUPERVISED) fail('unavailable', 'Il kernel non è stato avviato con "npm run kernel": riavvialo a mano');
    log.info(`Riavvio chiesto da ${principal.username}`);
    setTimeout(() => kernel.stop().finally(() => process.exit(75)), 200);
    return { restarting: true };
  });
}
