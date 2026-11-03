import ssh2 from 'ssh2';
import { netError, socketError, isDriverError } from './lib/shared/errors.js';
import { sshKeyOf } from './lib/shared/trust.js';
import { tcpConnect } from './lib/shared/tcp.js';

/**
 * An SSH connection, signed in: what the terminals (term.js) and SFTP (sftp.js) share.
 *
 * The TCP connection is made here, through the kernel's ctx.lookup (only addresses it allows),
 * and handed to ssh2. The server's key is shown to `confirm` (the user, or the fingerprint saved
 * for the connection); signing in goes by what the server accepts, in this order: the private key,
 * the password, keyboard-interactive (the server's questions, such as a one-time code). What is not
 * saved is asked with `ask` (in the terminal): the password (three tries), the passphrase of the
 * key, the server's questions; without `ask` (SFTP) the password saved answers the first question
 * that hides what is typed, and anything else fails as 'auth'.
 */
const { Client, utils } = ssh2;
const CONNECT_TIMEOUT = 20_000;   // until the server shows its key (signing in may take the user longer)
const TRIES = 3;

/** An ssh2 error as a driver error. */
export function connectionError(err) {
  if (isDriverError(err)) return err;
  if (err?.level === 'client-authentication') return netError('auth', 'Accesso negato dal server');
  if (err?.level === 'client-timeout') return netError('unreachable', 'Il server non risponde');
  if (/passphrase|privateKey|Cannot parse/i.test(err?.message ?? '')) return netError('auth', 'Chiave privata non valida o passphrase sbagliata');
  return socketError(err);
}

/**
 * Connects and signs in. Resolves with { client, shown, cipher } once ssh2 is ready (shown: the
 * server's key, { kind: 'ssh', fingerprint, text }).
 *   values    { host, port, user, auth: 'password' | 'key' }
 *   secret    { password, key, passphrase } (what was saved)
 *   lookup    ctx.lookup
 *   confirm(shown) → Promise<boolean>   the server's key is trusted
 *   ask?(prompt, { echo }) → Promise<text>, print?(text)   the user, in the terminal
 *   signal?   gives up ('cancelled')
 *   readyTimeout   ms for the whole sign-in (0: no limit, the user may be typing)
 */
export function sshConnect(values, { secret = {}, lookup, confirm, ask = null, print = () => {}, signal = null, readyTimeout = 0 }) {
  const host = values.host, port = values.port ?? 22, username = values.user;
  return new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false, refused = false, shown = null, cipher = '';
    let stopped = null;   // why signing in stopped on our side (the user gave up, a key that cannot be read)
    const fail = err => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      client.end();
      reject(err);
    };
    const onAbort = () => fail(netError('cancelled', 'Annullato'));
    const timer = setTimeout(() => fail(netError('unreachable', 'Il server non risponde')), CONNECT_TIMEOUT);
    signal?.addEventListener('abort', onAbort, { once: true });
    const untrusted = () => netError('untrusted', 'Chiave del server da confermare', { trust: shown });
    client.on('handshake', info => {
      clearTimeout(timer);
      cipher = info?.cs?.cipher ?? '';
    });
    client.on('error', err => fail(refused ? untrusted() : stopped ?? connectionError(err)));
    client.on('close', () => fail(refused ? untrusted() : stopped ?? netError('unreachable', 'Connessione chiusa dal server')));
    client.on('ready', () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve({ client, shown, cipher });
    });

    // ---------- Signing in ----------
    const question = async (prompt, echo = false) => {
      if (!ask) throw netError('auth', 'Il server chiede qualcosa che non è salvato nella connessione');
      try {
        return await ask(prompt, { echo });
      } catch (err) {
        stopped = netError('cancelled', 'Annullato');
        throw err;
      }
    };
    let key = null, triedSaved = false, passwords = 0, rounds = 0, keyTried = false;
    const loadKey = async () => {
      let passphrase = secret.passphrase;
      for (let i = 0; i <= TRIES; i++) {
        const parsed = utils.parseKey(secret.key ?? '', passphrase);
        const one = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!(one instanceof Error)) return one;
        if (!/passphrase|encrypted|decrypt/i.test(one.message) || i === TRIES || !ask) throw netError('auth', `Chiave privata non valida: ${one.message}`);
        if (i > 0) print('Passphrase sbagliata.');
        passphrase = await question('Passphrase della chiave: ');
      }
      return null;
    };
    const next = async methods => {
      const left = methods ?? [];
      if (methods === null) return { type: 'none', username };
      if (values.auth === 'key' && !keyTried && left.includes('publickey')) {
        keyTried = true;
        key ??= await loadKey();
        return { type: 'publickey', username, key };
      }
      if (left.includes('password') && passwords < TRIES && (ask || (!triedSaved && secret.password))) {
        let password;
        if (!triedSaved && secret.password) { triedSaved = true; password = secret.password; } else {
          if (passwords > 0 || triedSaved) print('Permesso negato, riprova.');
          password = await question(`Password di ${username}@${host}: `);
          passwords++;
        }
        return { type: 'password', username, password };
      }
      if (left.includes('keyboard-interactive') && rounds < TRIES) {
        rounds++;
        return {
          type: 'keyboard-interactive', username,
          prompt: (name, instructions, _lang, prompts, finish) => {
            (async () => {
              if (name) print(name);
              if (instructions) print(instructions);
              const answers = [];
              for (const p of prompts) {
                // The password saved answers the first question that asks for one (without anyone to
                // ask, the first that hides what is typed: servers word it in their own language)
                if (!triedSaved && secret.password && !p.echo && (!ask || /password/i.test(p.prompt))) { triedSaved = true; answers.push(secret.password); continue; }
                answers.push(await question(p.prompt, p.echo === true));
              }
              finish(answers);
            })().catch(err => {
              stopped ??= err?.net ? err : netError('cancelled', 'Annullato');
              client.end();
            });
          },
        };
      }
      return false;
    };
    const options = {
      host, port, username, readyTimeout, keepaliveInterval: 15_000, keepaliveCountMax: 4,
      authHandler: (methods, _partial, done) => {
        next(methods).then(done, err => {
          stopped ??= err?.net ? err : netError('auth', String(err?.message ?? err));
          client.end();
        });
      },
      hostVerifier: (raw, verify) => {
        // The server answered: the user may take their time to read and confirm its key
        clearTimeout(timer);
        shown = sshKeyOf(raw);
        // An answer that comes after the connection ended (closed by the server, the user gave up)
        // must not reach ssh2: its handshake is gone, and verify() would throw out of the kernel
        const answer = ok => {
          refused = !ok;
          if (settled) return;
          try { verify(ok); } catch (err) { fail(connectionError(err)); }
        };
        Promise.resolve().then(() => confirm(shown)).then(answer, () => answer(false));
      },
    };
    tcpConnect(host, port, { lookup, signal, timeout: CONNECT_TIMEOUT }).then(sock => {
      if (settled) { sock.destroy(); return; }
      try {
        client.connect({ ...options, sock });
      } catch (err) {
        sock.destroy();
        fail(connectionError(err));
      }
    }, fail);
  });
}
