import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { join } from 'node:path';
import { promisify } from 'node:util';

/**
 * Users and sign-in, standalone: everything is in users.json, in this module's folder.
 *
 *   { version: 1, users: [{ id, username, name, role: 'admin' | 'user', password, created,
 *                           sessions: [{ hash, created, expires, seen }] }] }
 *
 * Passwords: scrypt ('scrypt$N$r$p$salt$hash', base64). Sessions: a random token in the user's
 * cookie, only its SHA-256 here; it ends `sessionDays` after sign-in or `idleDays` after last use.
 * The file is re-read when it changes (the CLI writes it while the kernel runs) and written whole,
 * through a temporary file, one change at a time.
 */
const scrypt = promisify(scryptCallback);
const USERNAME = /^[a-z0-9][a-z0-9._-]{1,31}$/;
const ID = /^[\w-]{8,32}$/;
const HASH = /^[0-9a-f]{64}$/;
const ROLES = new Set(['admin', 'user']);
const COST = { N: 1 << 15, r: 8, p: 1, maxmem: 64 << 20 };
const KEY_LENGTH = 64;
const PASSWORD = { min: 8, max: 256 };
const MAX_NAME = 60;
const MAX_SESSIONS = 20;
const DAY = 86_400_000;
const SEEN_EVERY = 3_600_000;   // last use is saved at most once an hour

// After this many wrong passwords each try waits twice as long; an address may be shared by many people
const FREE_FAILS = { u: 5, ip: 20 };
const MAX_WAIT = 15 * 60_000;

const sha256 = text => createHash('sha256').update(text).digest('hex');
const publicUser = u => ({ id: u.id, username: u.username, name: u.name, role: u.role });
const cleanName = (v, fallback) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '') || fallback;

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, COST);
  return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  const [kind, N, r, p, salt, hash] = String(stored).split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const cost = { N: Number(N), r: Number(r), p: Number(p), maxmem: COST.maxmem };
  if (!(cost.N >= 1024 && cost.N <= 1 << 20 && cost.r >= 1 && cost.r <= 32 && cost.p >= 1 && cost.p <= 16)) return false;
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, cost);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** users.json, validated on every read: it is edited by hand too. */
class Store {
  #file;
  #data = { version: 1, users: [] };
  #mtime = -1;
  #queue = Promise.resolve();

  constructor(file) { this.#file = file; }

  /** Current data (read again if the file changed). */
  async read() {
    const s = await stat(this.#file).catch(() => null);
    if (!s) {
      this.#data = { version: 1, users: [] };
      this.#mtime = 0;
    } else if (s.mtimeMs !== this.#mtime) {
      const raw = JSON.parse(await readFile(this.#file, 'utf8'));
      this.#data = clean(raw);
      this.#mtime = s.mtimeMs;
    }
    return this.#data;
  }

  /** Runs fn(data) and saves, one change at a time. Returns what fn returns. */
  change(fn) {
    const run = this.#queue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      const tmp = `${this.#file}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
      await rename(tmp, this.#file);
      this.#mtime = (await stat(this.#file)).mtimeMs;
      return result;
    });
    this.#queue = run.catch(() => {});
    return run;
  }
}

function clean(raw) {
  const users = [];
  for (const u of Array.isArray(raw?.users) ? raw.users : []) {
    if (!u || !ID.test(u.id) || !USERNAME.test(u.username) || !ROLES.has(u.role) || typeof u.password !== 'string') continue;
    if (users.some(o => o.id === u.id || o.username === u.username)) continue;
    const sessions = (Array.isArray(u.sessions) ? u.sessions : []).filter(s => s && HASH.test(s.hash) && Number.isFinite(s.expires) && Number.isFinite(s.seen));
    users.push({ id: u.id, username: u.username, name: cleanName(u.name, u.username), role: u.role, password: u.password, created: Number.isFinite(u.created) ? u.created : Date.now(), sessions });
  }
  return { version: 1, users };
}

function checkPassword(ctx, password) {
  if (typeof password !== 'string' || password.length < PASSWORD.min || password.length > PASSWORD.max) {
    ctx.fail('invalid', `La password deve avere da ${PASSWORD.min} a ${PASSWORD.max} caratteri`);
  }
}

let store, ctx, limits;

export default {
  async init(context) {
    ctx = context;
    store = new Store(join(ctx.dir, 'users.json'));
    const users = (await store.read()).users;
    const sessionMs = (Number(ctx.config.sessionDays) || 30) * DAY;
    const idleMs = (Number(ctx.config.idleDays) || 7) * DAY;
    if (!users.length) ctx.log.warn('Nessun utente: aggiungine uno con "npm run kernel:cli -- users-basic add <nome> --admin"');
    // Wrong passwords, in memory: { fails, until } per 'u:<name>' and 'ip:<address>'
    limits = new Map();
    const dummy = await hashPassword(randomBytes(16).toString('hex'));

    const waitFor = key => Math.max(0, (limits.get(key)?.until ?? 0) - Date.now());
    const failed = key => {
      const entry = limits.get(key) ?? { fails: 0, until: 0 };
      entry.fails++;
      const free = FREE_FAILS[key.slice(0, key.indexOf(':'))];
      if (entry.fails > free) entry.until = Date.now() + Math.min(MAX_WAIT, 1000 * 2 ** (entry.fails - free));
      limits.set(key, entry);
      if (limits.size > 10_000) limits.clear();
    };

    ctx.provide('auth', {
      async login(username, password, { ip = '' } = {}) {
        const name = String(username).trim().toLowerCase();
        const keys = [`u:${name}`, `ip:${ip}`];
        const wait = Math.max(...keys.map(waitFor));
        if (wait) ctx.fail('rate_limited', 'Troppi tentativi: riprova tra poco', { retryAfter: Math.ceil(wait / 1000) });
        const user = (await store.read()).users.find(u => u.username === name);
        // Same work whether the user exists or not: the answer time does not tell which
        const ok = await verifyPassword(String(password), user?.password ?? dummy) && !!user;
        if (!ok) {
          keys.forEach(failed);
          ctx.fail('invalid_credentials', 'Nome utente o password non corretti');
        }
        limits.delete(keys[0]);
        const token = randomBytes(32).toString('base64url');
        const now = Date.now();
        const expires = now + sessionMs;
        await store.change(data => {
          const u = data.users.find(o => o.id === user.id);
          if (!u) ctx.fail('invalid_credentials', 'Nome utente o password non corretti');
          u.sessions = u.sessions.filter(s => s.expires > now && s.seen + idleMs > now);
          u.sessions.push({ hash: sha256(token), created: now, expires, seen: now });
          u.sessions = u.sessions.slice(-MAX_SESSIONS);
        });
        ctx.log.info(`Accesso: ${name}`);
        return { token, user: publicUser(user), expires };
      },

      async session(token) {
        if (typeof token !== 'string' || token.length > 100) return null;
        const hash = sha256(token);
        const now = Date.now();
        for (const u of (await store.read()).users) {
          const s = u.sessions.find(o => o.hash === hash);
          if (!s) continue;
          if (s.expires <= now || s.seen + idleMs <= now) return null;
          if (now - s.seen > SEEN_EVERY) {
            await store.change(data => {
              const live = data.users.find(o => o.id === u.id)?.sessions.find(o => o.hash === hash);
              if (live) live.seen = now;
            });
          }
          return publicUser(u);
        }
        return null;
      },

      async logout(token) {
        const hash = sha256(String(token));
        await store.change(data => data.users.forEach(u => { u.sessions = u.sessions.filter(s => s.hash !== hash); }));
      },

      async logoutAll(userId) {
        await store.change(data => {
          const u = data.users.find(o => o.id === userId);
          if (u) u.sessions = [];
        });
      },
    });

    ctx.provide('users', {
      async get(id) {
        const u = (await store.read()).users.find(o => o.id === id);
        return u ? publicUser(u) : null;
      },

      async list() {
        return (await store.read()).users.map(publicUser);
      },

      async create({ username, name, password, role = 'user' }) {
        const clean = String(username ?? '').trim().toLowerCase();
        if (!USERNAME.test(clean)) ctx.fail('invalid', 'Nome utente non valido: 2-32 tra lettere minuscole, cifre, punto, trattino e trattino basso');
        if (!ROLES.has(role)) ctx.fail('invalid', 'Ruolo non valido');
        checkPassword(ctx, password);
        const user = {
          id: randomBytes(9).toString('base64url'), username: clean, name: cleanName(name, clean), role,
          password: await hashPassword(password), created: Date.now(), sessions: [],
        };
        await store.change(data => {
          if (data.users.some(o => o.username === clean)) ctx.fail('conflict', `L'utente ${clean} esiste già`);
          data.users.push(user);
        });
        return publicUser(user);
      },

      async setPassword(id, password) {
        checkPassword(ctx, password);
        const hash = await hashPassword(password);
        await store.change(data => {
          const u = data.users.find(o => o.id === id) ?? ctx.fail('not_found', 'Utente inesistente');
          u.password = hash;
          u.sessions = [];   // a new password signs out everywhere
        });
      },

      async remove(id) {
        await store.change(data => {
          const before = data.users.length;
          data.users = data.users.filter(o => o.id !== id);
          if (data.users.length === before) ctx.fail('not_found', 'Utente inesistente');
        });
      },
    });
  },

  async stop() {},

  /** Run with: npm run kernel:cli -- users-basic <command> … */
  commands: {
    async list({ services }) {
      for (const u of await services.get('users').list()) console.log(`${u.username}\t${u.role}\t${u.name}`);
    },

    async add({ services, args, prompt }) {
      const [username] = args.positional;
      if (!username) throw new Error('Uso: users-basic add <nome> [--name "Nome visibile"] [--admin]');
      const password = await prompt.password('Password: ', { confirm: true });
      const user = await services.get('users').create({ username, name: args.flags.name, password, role: args.flags.admin ? 'admin' : 'user' });
      console.log(`Creato ${user.username} (${user.role})`);
    },

    async passwd({ services, args, prompt }) {
      const users = services.get('users');
      const user = (await users.list()).find(u => u.username === String(args.positional[0] ?? '').toLowerCase());
      if (!user) throw new Error('Utente inesistente');
      await users.setPassword(user.id, await prompt.password('Nuova password: ', { confirm: true }));
      console.log(`Password cambiata: ${user.username} deve accedere di nuovo`);
    },

    async remove({ services, args }) {
      const users = services.get('users');
      const user = (await users.list()).find(u => u.username === String(args.positional[0] ?? '').toLowerCase());
      if (!user) throw new Error('Utente inesistente');
      await users.remove(user.id);
      console.log(`Rimosso ${user.username} (la sua home resta nel file system)`);
    },
  },
};
