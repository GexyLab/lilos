import { fail } from '../errors.js';
import { defineStrings } from '../strings.js';

/**
 * Installing apps and kernel modules with what they need (apps/dependencies.js), admins only:
 *   POST /api/packages/plan      target → plan
 *   POST /api/packages/install   { ...target, root: { grant, allowUnsigned }, steps: { [key]: { grant, allowUnsigned } } }
 *                                → { result, installed: [{ key, kind, id, version, action }], restartRequired }
 *   GET  /api/packages/removal?kind=app|module&id=…   → { blockedBy, unneeded, restartRequired }
 *   POST /api/packages/remove    { kind, id, also: [keys of unneeded] } → { removed: [keys], restartRequired }
 *
 *   target: { install: { kind: 'app' | 'module', source } }
 *         | { update: { kind: 'app' | 'module', id, ref?, reinstall? } }   (reinstall: apps only)
 */
// App ids and module names (a module may have a one-letter name)
const ID = /^[a-z0-9][a-z0-9.-]{0,63}$/;
const KINDS = ['app', 'module'];
const { t } = defineStrings('lilos:kernel.api.packages', { en: { strings: {
  signIn: 'Sign in first', kind: 'kind must be "app" or "module"', id: 'id not valid', target: 'install or update is needed',
  package: 'Package not valid',
} } });

const signedIn = principal => principal ?? fail('unauthorized', t('signIn'));

function target(body) {
  const kind = k => (KINDS.includes(k) ? k : fail('invalid', t('kind')));
  if (body?.install && typeof body.install === 'object') {
    return { install: { kind: kind(body.install.kind), source: body.install.source } };
  }
  if (body?.update && typeof body.update === 'object') {
    const u = body.update;
    if (!ID.test(u.id ?? '')) fail('invalid', t('id'));
    return {
      update: {
        kind: kind(u.kind), id: u.id,
        ...(typeof u.ref === 'string' && { ref: u.ref }),
        reinstall: u.kind === 'app' && u.reinstall === true,
      },
    };
  }
  return fail('invalid', t('target'));
}

const answer = a => ({ grant: Array.isArray(a?.grant) ? a.grant.filter(s => typeof s === 'string').slice(0, 100) : [], allowUnsigned: a?.allowUnsigned === true });

export function packageRoutes(kernel) {
  const { router, dependencies } = kernel;

  router.add('POST', '/api/packages/plan', async ({ principal, json }) => dependencies.plan(signedIn(principal), target(await json(64 << 10))));

  router.add('POST', '/api/packages/install', async ({ principal, json }) => {
    const body = await json(256 << 10);
    const steps = {};
    if (body.steps && typeof body.steps === 'object' && !Array.isArray(body.steps)) {
      for (const [key, a] of Object.entries(body.steps).slice(0, 100)) if (/^(app|module):[a-z0-9.-]{1,64}$/.test(key)) steps[key] = answer(a);
    }
    return dependencies.apply(signedIn(principal), target(body), { root: answer(body.root), steps });
  });

  router.add('GET', '/api/packages/removal', async ({ principal, query }) => {
    const kind = query.get('kind'), id = query.get('id') ?? '';
    if (!KINDS.includes(kind) || !ID.test(id)) fail('invalid', t('package'));
    return dependencies.removal(signedIn(principal), kind, id);
  });

  router.add('POST', '/api/packages/remove', async ({ principal, json }) => {
    const { kind, id, also } = await json(16 << 10);
    if (!KINDS.includes(kind) || !ID.test(id ?? '')) fail('invalid', t('package'));
    return dependencies.remove(signedIn(principal), kind, id, { also: Array.isArray(also) ? also.filter(k => typeof k === 'string').slice(0, 100) : [] });
  });
}
