import { fail } from '../errors.js';
import { defineStrings } from '../strings.js';

const { t } = defineStrings('lilos:kernel.api.settings', { en: { strings: {
  signIn: 'Sign in first', admin: 'Only an administrator sees the settings of the kernel', user: 'User not found',
} } });

/**
 * The kernel's settings (settings.js), for Control Panel:
 *
 *   GET /api/settings                  admins: { items: [{ key, type, scope, restart, value, default,
 *                                      source, locked, zero?, min?, max? }], quotas }
 *                                      (quotas: false when the fs module cannot say the space used)
 *   GET /api/settings?user=<id>        the same for a user (their own values, where they have them)
 *   PUT /api/settings                  admins: { set: { key: value }, reset: [key], user? } → as GET
 *   GET /api/settings/users            admins: every user's space: [{ id, username, name, role, used,
 *                                      quota, own }] (own: a quota of their own)
 *
 * The limits that count for the user who asks are GET /api/fs/limits (home.js).
 */
export function settingsRoutes(kernel) {
  const { router } = kernel;
  const admin = principal => {
    if (!principal) fail('unauthorized', t('signIn'));
    if (principal.role !== 'admin') fail('forbidden', t('admin'));
    return principal;
  };
  const userOf = async id => {
    if (id == null || id === '') return null;
    if (typeof id !== 'string' || !(await kernel.userPrincipal(id))) fail('not_found', t('user'));
    return id;
  };
  const view = user => ({ items: kernel.settings.describe(user), quotas: kernel.fileLimits.quotas });

  router.add('GET', '/api/settings', async ({ principal, query }) => {
    admin(principal);
    return view(await userOf(query.get('user')));
  });

  router.add('PUT', '/api/settings', async ({ principal, json }) => {
    admin(principal);
    const { set = {}, reset = [], user = null } = await json(64 << 10);
    const id = await userOf(user);
    await kernel.settings.update(principal, { set, reset, user: id });
    return view(id);
  });

  router.add('GET', '/api/settings/users', async ({ principal }) => {
    admin(principal);
    const own = kernel.settings.userValues();
    const out = [];
    for (const id of await kernel.userIds()) {
      const p = await kernel.userPrincipal(id);
      if (!p) continue;
      out.push({
        id, username: p.username, name: p.name, role: p.role,
        used: await kernel.fileLimits.used(id).catch(() => null),
        quota: kernel.settings.get('files.quota', id),
        own: own.get(id)?.['files.quota'] !== undefined,
      });
    }
    return out;
  });
}
