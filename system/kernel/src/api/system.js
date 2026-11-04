import { fail } from '../errors.js';
import { defineStrings } from '../strings.js';

/**
 * lilOS's own versions (apps/systemPackage.js): the version for every signed-in user, the rest for admins.
 *   GET    /api/system                    { version, mode, … } (admins: releases, next, previous, updated, failed)
 *   POST   /api/system/update             { ref? } → { version, previous, restartRequired } | { version, unchanged }
 *   POST   /api/system/use                { version } → { version, restartRequired }
 *   DELETE /api/system/releases/:version  deletes a version kept on disk
 *   POST   /api/system/acknowledge        { notice: 'updated' | 'failed' }: the admins saw it
 * The new version runs after POST /api/kernel/restart (api/store.js).
 */
const { t } = defineStrings('lilos:kernel.api.system', { en: { strings: {
  signIn: 'Sign in first', ref: 'Reference not valid', version: 'Version not valid',
} } });
const signedIn = principal => principal ?? fail('unauthorized', t('signIn'));
const VERSION = /^\d{1,6}\.\d{1,6}\.\d{1,6}$/;
const REF = /^(?!-)[\w./-]{1,200}$/;

export function systemRoutes(kernel) {
  const { router, system } = kernel;

  router.add('GET', '/api/system', async ({ principal }) => system.info(signedIn(principal)));
  router.add('POST', '/api/system/update', async ({ principal, json }) => {
    const { ref } = await json(4 << 10);
    if (ref !== undefined && (typeof ref !== 'string' || !REF.test(ref))) fail('invalid', t('ref'));
    return system.update(signedIn(principal), { ref });
  });
  router.add('POST', '/api/system/use', async ({ principal, json }) => {
    const { version } = await json(4 << 10);
    if (typeof version !== 'string' || !VERSION.test(version)) fail('invalid', t('version'));
    return system.use(signedIn(principal), version);
  });
  router.add('DELETE', '/api/system/releases/:version', async ({ principal, params }) => system.remove(signedIn(principal), params.version));
  router.add('POST', '/api/system/acknowledge', async ({ principal, json }) => {
    const { notice } = await json(4 << 10);
    await system.acknowledge(signedIn(principal), notice);
  });
}
