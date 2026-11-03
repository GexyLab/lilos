import { fail } from '../errors.js';

/**
 * The license of lilOS (src/license.js), shown before lilOS starts (src/boot/boot.js).
 *   GET    /api/license          { accepted, text, sha256, source, url, acceptedAt, canAccept }
 *                                 source 'remote' | 'bundled' (the copy of the release); url: its page
 *   POST   /api/license/accept   { sha256 } → as GET   (administrators: the text they read)
 */
const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');
const SHA256 = /^[0-9a-f]{64}$/;

export function licenseRoutes(kernel) {
  const { router, license } = kernel;
  const withRole = (principal, status) => ({ ...status, canAccept: principal.role === 'admin' });

  router.add('GET', '/api/license', async ({ principal }) => withRole(signedIn(principal), await license.status()));
  router.add('POST', '/api/license/accept', async ({ principal, json }) => {
    const { sha256 } = await json(4 << 10);
    if (typeof sha256 !== 'string' || !SHA256.test(sha256)) fail('invalid', 'Impronta della licenza non valida');
    return withRole(principal, await license.accept(signedIn(principal), sha256));
  });
}
