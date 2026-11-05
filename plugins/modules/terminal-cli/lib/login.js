import { ApiError, saveSession, savedSession } from './client.js';
import { t } from './strings.js';

/** Who runs the command lilos cannot sign in (exit code 4). */
export class SignInFailed extends Error {}

/**
 * Signs in to the kernel at client.url: a lilOS without auth module has one user and asks nothing;
 * otherwise the session kept with «Resta connesso» (cli.json), or the user (--user, or asked) and
 * the password (LILOS_PASSWORD, or asked without echo). Asked only with a terminal; «Resta connesso»
 * keeps the session, else it ends with the command (temporary).
 *   → { mode, ui, user, temporary }
 */
export async function signIn(client, { username = null, tty, ask, password }) {
  const info = await client.get('/api/session');
  if (info.mode === 'single') return { ...info, temporary: false };
  if (info.user) return { ...info, temporary: false };

  const saved = savedSession(client.url);
  if (saved?.token && (!username || saved.username === username)) {
    client.token = saved.token;
    const again = await client.get('/api/session').catch(() => null);
    if (again?.user) return { ...again, temporary: false };
    client.token = null;
    saveSession(client.url, null);
  }

  username ??= process.env.LILOS_USER || null;
  if (!username && !tty) throw new SignInFailed(t('cli.login.noTerminal'));
  for (let attempt = 1; ; attempt++) {
    const name = username ?? (await ask(t('cli.login.user'))).trim();
    if (!name) throw new SignInFailed(t('cli.login.cancelled'));
    let secret = process.env.LILOS_PASSWORD || null;
    try {
      secret ??= await password(t('cli.login.password'));
    } catch (err) {
      throw new SignInFailed(err.message);
    }
    try {
      await client.post('/api/session', { username: name, password: secret, remember: true });
    } catch (err) {
      // Wrong user or password: asked again (three times) when there is someone to ask
      if (err instanceof ApiError && err.status === 401 && tty && attempt < 3 && !process.env.LILOS_PASSWORD) {
        process.stderr.write(`${err.message}\n`);
        continue;
      }
      throw err instanceof ApiError && err.status < 500 ? new SignInFailed(err.message) : err;
    }
    const now = await client.get('/api/session');
    const keep = tty && /^(|s|si|sì|y|yes)$/i.test((await ask(t('cli.login.remember'))).trim());
    if (keep) saveSession(client.url, { token: client.token, username: now.user?.username ?? name, savedAt: new Date().toISOString() });
    return { ...now, temporary: !keep };
  }
}

/** Signs out of the kernel and forgets the session kept for it. */
export async function signOut(client) {
  const saved = savedSession(client.url);
  if (saved?.token) client.token = saved.token;
  if (client.token) await client.delete('/api/session').catch(() => {});
  saveSession(client.url, null);
}
