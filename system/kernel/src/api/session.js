import { fail } from '../errors.js';
import { cookies, clientIp } from '../http.js';

export const SESSION_COOKIE = 'lilos_session';

const cookie = (kernel, value, maxAge) => [
  `${SESSION_COOKIE}=${value}`, 'Path=/api', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAge}`,
  ...(kernel.config.secureCookies ? ['Secure'] : []),
].join('; ');

const publicUser = p => (p ? { id: p.id, username: p.username, name: p.name, role: p.role } : null);

/**
 *   GET    /api/session   { mode: 'multi' | 'single', user | null }
 *   POST   /api/session   { username, password } → { user }   signs in (session cookie)
 *   POST   /api/session/verify  { username, password } → { ok, role }   checks a password, no session
 *   DELETE /api/session   signs out
 */
export function sessionRoutes(kernel) {
  const { router } = kernel;

  router.add('GET', '/api/session', ({ principal }) => ({
    mode: kernel.multiUser ? 'multi' : 'single',
    user: publicUser(principal),
  }));

  router.add('POST', '/api/session', async ({ req, res, json }) => {
    if (!kernel.multiUser) fail('invalid', 'lilOS ha un solo utente: non serve accedere');
    const { username, password } = await json(16 << 10);
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) fail('invalid', 'Nome utente e password sono obbligatori');
    const { token, user, expires } = await kernel.service('auth').login(username, password, { ip: clientIp(req) });
    res.setHeader('Set-Cookie', cookie(kernel, token, Math.max(0, Math.floor((expires - Date.now()) / 1000))));
    kernel.appServices.userSeen({ kind: 'user', id: user.id, username: user.username, name: user.name, role: user.role });
    return { user: publicUser(user) };
  });

  // Somebody else's password, checked without signing in as them (an administrator lets the program
  // lilOS out of the kiosk at the computer of another user): a sign-in that ends at once
  router.add('POST', '/api/session/verify', async ({ req, json, principal }) => {
    if (!kernel.multiUser) fail('invalid', 'lilOS ha un solo utente: non serve');
    if (!principal) fail('unauthorized', 'Accedi prima');
    const { username, password } = await json(16 << 10);
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) fail('invalid', 'Nome utente e password sono obbligatori');
    const auth = kernel.service('auth');
    const { token, user } = await auth.login(username, password, { ip: clientIp(req) });
    await auth.logout(token);
    return { ok: true, role: user.role };
  });

  router.add('DELETE', '/api/session', async ({ req, res, principal }) => {
    if (!kernel.multiUser) return;
    const token = cookies(req)[SESSION_COOKIE];
    if (token) await kernel.service('auth').logout(token);
    // Their services stop with them (sessions will change: for now any sign-out stops them)
    if (principal) await kernel.appServices.userLeft(principal.id);
    res.setHeader('Set-Cookie', cookie(kernel, '', 0));
  });
}
