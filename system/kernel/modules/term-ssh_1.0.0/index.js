import ssh2 from 'ssh2';
import { createHash } from 'node:crypto';

/**
 * SSH for the remote terminals (service 'term.ssh', see the kernel's term/drivers.js): a shell on a
 * server, with a password, a private key or the questions the server asks (keyboard-interactive,
 * such as a one-time code). What the user did not save is asked in the terminal itself, as ssh
 * does: the password (three tries), the passphrase of the key. The server's key is shown to the
 * user to confirm the first time, and again with a warning if it changed (ctx.confirm).
 */
const { Client, utils } = ssh2;
const CONNECT_TIMEOUT = 20_000;   // until the server answers (signing in may take the user longer)
const TRIES = 3;

const netError = (net, message, extra = {}) => Object.assign(new Error(message), { net, ...extra });

function connectionError(err) {
  if (err?.net) return err;
  if (err?.level === 'client-authentication') return netError('auth', 'Accesso negato dal server');
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN|ENETUNREACH/.test(err?.code ?? '') || err?.level === 'client-timeout') {
    return netError('unreachable', err.message);
  }
  return netError('unreachable', err?.message ?? String(err));
}

/** 'ssh-ed25519' from a host key as the server sends it (a length-prefixed name first). */
function keyType(key) {
  try { return key.subarray(4, 4 + key.readUInt32BE(0)).toString('ascii'); } catch { return 'ssh'; }
}

/** A word for the shell, quoted ('it'\''s'). */
const quote = text => `'${String(text).replace(/'/g, `'\\''`)}'`;

const label = (en, it) => ({ en, it });

const driver = {
  label: label('SSH', 'SSH'),
  order: 10,
  port: 22,
  secure: true,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'example.com' },
    { key: 'port', type: 'number', label: label('Port', 'Porta'), min: 1, max: 65535, placeholder: '22' },
    { key: 'user', type: 'text', label: label('User', 'Utente'), required: true },
    {
      key: 'auth', type: 'select', label: label('Sign in with', 'Accesso'), default: 'password',
      options: [{ value: 'password', label: label('Password', 'Password') }, { value: 'key', label: label('SSH key', 'Chiave SSH') }],
    },
    {
      key: 'password', type: 'password', label: label('Password', 'Password'), secret: true, when: { auth: 'password' },
      hint: label('Empty: asked in the terminal when connecting', 'Vuota: chiesta nel terminale quando ti colleghi'),
    },
    { key: 'key', type: 'file', label: label('Private key', 'Chiave privata'), secret: true, required: true, when: { auth: 'key' }, hint: label('A file of lilOS, such as id_ed25519', 'Un file di lilOS, per esempio id_ed25519') },
    { key: 'passphrase', type: 'password', label: label('Key passphrase', 'Passphrase della chiave'), secret: true, when: { auth: 'key' }, hint: label('Empty: asked in the terminal if the key has one', 'Vuota: chiesta nel terminale se la chiave ne ha una') },
    { key: 'command', type: 'text', label: label('Command at start', 'Comando all’avvio'), placeholder: 'tmux new -A -s main', hint: label('Runs instead of the shell', 'Parte al posto della shell') },
  ],

  address: v => `ssh://${v.user ? `${v.user}@` : ''}${v.host ?? ''}${v.port && v.port !== 22 ? `:${v.port}` : ''}`,

  open(values, ctx) {
    const { secret = {}, signal } = ctx;
    const host = values.host, port = values.port ?? 22, username = values.user;
    return new Promise((resolve, reject) => {
      const client = new Client();
      let settled = false, refused = false, shown = null, cipher = '';
      let stopped = null;   // why signing in stopped on our side (the user gave up, a key that cannot be read)
      const fail = err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        client.end();
        reject(err);
      };
      const timer = setTimeout(() => fail(netError('unreachable', 'Il server non risponde')), CONNECT_TIMEOUT);
      signal?.addEventListener('abort', () => fail(netError('cancelled', 'Annullato')), { once: true });
      client.on('handshake', info => {
        clearTimeout(timer);
        cipher = info?.cs?.cipher ?? '';
      });
      client.on('error', err => fail(refused ? netError('untrusted', 'Chiave del server non confermata') : stopped ?? connectionError(err)));
      client.on('close', () => fail(stopped ?? netError('unreachable', 'Connessione chiusa dal server')));
      client.on('ready', () => {
        const window = { term: ctx.term || 'xterm-256color', cols: ctx.cols, rows: ctx.rows, width: 0, height: 0 };
        const steps = [];
        if (ctx.cwd) steps.push(`cd ${quote(ctx.cwd)}`);
        if (values.command) steps.push(values.command);
        else if (ctx.cwd) steps.push('exec "${SHELL:-/bin/sh}" -l');
        const started = (err, stream) => {
          if (err) return fail(netError('unsupported', `Il server non apre il terminale: ${err.message}`));
          settled = true;
          resolve(session(client, stream, { text: shown?.text ?? '', cipher }));
        };
        if (steps.length) client.exec(steps.join(' && '), { pty: window }, started);
        else client.shell(window, started);
      });

      // ---------- Signing in ----------
      const ask = async (prompt, echo = false) => {
        try {
          return await ctx.ask(prompt, { echo });
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
          if (!/passphrase|encrypted|decrypt/i.test(one.message) || i === TRIES) throw netError('auth', `Chiave privata non valida: ${one.message}`);
          if (i > 0) ctx.print('Passphrase sbagliata.');
          passphrase = await ask('Passphrase della chiave: ');
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
        if (left.includes('password') && passwords < TRIES) {
          let password;
          if (!triedSaved && secret.password) { triedSaved = true; password = secret.password; } else {
            if (passwords > 0 || triedSaved) ctx.print('Permesso negato, riprova.');
            password = await ask(`Password di ${username}@${host}: `);
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
                if (name) ctx.print(name);
                if (instructions) ctx.print(instructions);
                const answers = [];
                for (const p of prompts) {
                  // The password saved answers the first question that asks for one
                  if (!triedSaved && secret.password && !p.echo && /password/i.test(p.prompt)) { triedSaved = true; answers.push(secret.password); continue; }
                  answers.push(await ask(p.prompt, p.echo === true));
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
        host, port, username, readyTimeout: 0, keepaliveInterval: 15_000, keepaliveCountMax: 4,
        authHandler: (methods, _partial, done) => {
          next(methods).then(done, err => {
            stopped ??= err?.net ? err : netError('auth', String(err?.message ?? err));
            client.end();
          });
        },
        hostVerifier: (raw, verify) => {
          const fingerprint = `SHA256:${createHash('sha256').update(raw).digest('base64').replace(/=+$/, '')}`;
          shown = { kind: 'ssh', fingerprint, text: `${keyType(raw)} ${fingerprint}`.replace(/[^\x20-\x7e]/g, '').slice(0, 120) };
          ctx.confirm(shown).then(ok => { refused = !ok; verify(ok); }, () => { refused = true; verify(false); });
        },
      };
      try {
        client.connect(options);
      } catch (err) {
        fail(connectionError(err));
      }
    });
  },
};

function session(client, stream, info) {
  const data = [], closed = [];
  let pending = [], code = null, gone = false;
  const output = chunk => (data.length ? data.forEach(fn => fn(chunk)) : pending.push(chunk));
  stream.on('data', output);
  stream.stderr?.on('data', output);
  stream.on('exit', c => { code = c; });
  const end = reason => {
    if (gone) return;
    gone = true;
    closed.forEach(fn => fn({ reason }));
    client.end();
  };
  stream.on('close', () => end(code === null || code === 0 ? '' : `Uscita con codice ${code}`));
  client.on('close', () => end('Connessione persa'));
  client.on('error', err => end(`Connessione persa: ${err.message}`));
  return {
    info: { key: info.text, cipher: info.cipher },
    signals: [],
    onData(fn) {
      data.push(fn);
      pending.forEach(fn);
      pending = [];
    },
    onClose(fn) { closed.push(fn); },
    write(bytes) { stream.write(bytes); },
    resize(cols, rows) { stream.setWindow(rows, cols, 0, 0); },
    pause() { stream.pause(); },
    resume() { stream.resume(); },
    close() { end(''); },
  };
}

export default {
  async init(ctx) {
    ctx.provide('term.ssh', driver);
  },
};
