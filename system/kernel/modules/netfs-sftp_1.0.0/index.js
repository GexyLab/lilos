import ssh2 from 'ssh2';
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { pipeline } from 'node:stream/promises';

/**
 * SFTP for the Rete folder (service 'netfs.sftp', see the kernel's net/drivers.js): files and
 * folders of a server through SSH, with a password or a private key. The server's key is checked
 * against the fingerprint the user confirmed: the first time (or if it changed) the connection
 * stops with 'untrusted' and the fingerprint to show.
 */
const { Client } = ssh2;
const S_IFMT = 0o170000, S_IFDIR = 0o040000, S_IFLNK = 0o120000;
// SFTP status codes (draft-ietf-secsh-filexfer-02)
const NO_SUCH_FILE = 2, PERMISSION_DENIED = 3;

const netError = (net, message, extra = {}) => Object.assign(new Error(message), { net, ...extra });

function connectionError(err) {
  if (err?.net) return err;
  if (err?.level === 'client-authentication') return netError('auth', 'Utente o credenziali non validi');
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN|ENETUNREACH/.test(err?.code ?? '') || err?.level === 'client-timeout') {
    return netError('unreachable', err.message);
  }
  if (/passphrase|privateKey|Cannot parse/i.test(err?.message ?? '')) return netError('auth', 'Chiave privata non valida o passphrase sbagliata');
  return netError('unreachable', err?.message ?? String(err));
}

function sftpError(err) {
  if (err?.net) return err;
  if (err?.code === NO_SUCH_FILE) return netError('not_found', err.message);
  if (err?.code === PERMISSION_DENIED) return netError('denied', err.message);
  if (err?.code === 'ECONNRESET' || /No response from server|not connected|Channel/i.test(err?.message ?? '')) return netError('lost', err.message);
  return netError('invalid', err?.message ?? String(err));
}

/** 'ssh-ed25519' from a host key as the server sends it (a length-prefixed name first). */
function keyType(key) {
  try { return key.subarray(4, 4 + key.readUInt32BE(0)).toString('ascii'); } catch { return 'ssh'; }
}

const label = (en, it) => ({ en, it });

const driver = {
  label: label('SFTP (SSH)', 'SFTP (SSH)'),
  order: 30,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'example.com' },
    { key: 'port', type: 'number', label: label('Port', 'Porta'), default: 22, min: 1, max: 65535 },
    { key: 'user', type: 'text', label: label('User', 'Utente'), required: true },
    {
      key: 'auth', type: 'select', label: label('Sign in with', 'Accesso'), default: 'password',
      options: [{ value: 'password', label: label('Password', 'Password') }, { value: 'key', label: label('SSH key', 'Chiave SSH') }],
    },
    { key: 'password', type: 'password', label: label('Password', 'Password'), secret: true, required: true, when: { auth: 'password' } },
    { key: 'key', type: 'file', label: label('Private key', 'Chiave privata'), secret: true, required: true, when: { auth: 'key' }, hint: label('A file of lilOS, such as id_ed25519', 'Un file di lilOS, per esempio id_ed25519') },
    { key: 'passphrase', type: 'password', label: label('Key passphrase', 'Passphrase della chiave'), secret: true, when: { auth: 'key' }, hint: label('Only if the key has one', 'Solo se la chiave ne ha una') },
    { key: 'path', type: 'text', label: label('Remote folder', 'Cartella remota'), default: '/', placeholder: '/var/www' },
  ],

  address: v => `sftp://${v.user ?? ''}@${v.host ?? ''}${v.port && v.port !== 22 ? `:${v.port}` : ''}${v.path && v.path !== '/' ? v.path : ''}`,

  connect(values, { secret = {}, trust = null } = {}) {
    return new Promise((resolve, reject) => {
      const client = new Client();
      let seen = null, settled = false;
      const fail = err => { if (!settled) { settled = true; client.end(); reject(err); } };
      client.on('error', err => fail(seen && !seen.ok ? netError('untrusted', 'Server da confermare', { trust: seen.trust }) : connectionError(err)));
      client.on('close', () => fail(netError('unreachable', 'Connessione chiusa dal server')));
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) return fail(netError('unsupported', `SFTP non disponibile: ${err.message}`));
          settled = true;
          resolve(session(client, sftp, posix.normalize(values.path || '/')));
        });
      });
      const options = {
        host: values.host, port: values.port ?? 22, username: values.user,
        readyTimeout: 20_000, keepaliveInterval: 15_000, keepaliveCountMax: 4,
        hostVerifier: key => {
          const fingerprint = `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}`;
          const ok = trust === fingerprint;
          seen = { ok, trust: { kind: 'ssh', fingerprint, text: `${keyType(key)} ${fingerprint}` } };
          return ok;
        },
      };
      if (values.auth === 'key') {
        options.privateKey = secret.key;
        if (secret.passphrase) options.passphrase = secret.passphrase;
      } else {
        options.password = secret.password;
        options.tryKeyboard = true;
        client.on('keyboard-interactive', (_name, _instr, _lang, prompts, finish) => finish(prompts.map(() => secret.password ?? '')));
      }
      try {
        client.connect(options);
      } catch (err) {
        fail(connectionError(err));
      }
    });
  },
};

function session(client, sftp, root) {
  const full = path => (root === '/' ? path : path === '/' ? root : `${root}${path}`);
  const call = (method, ...args) => new Promise((resolve, reject) => {
    sftp[method](...args, (err, value) => (err ? reject(sftpError(err)) : resolve(value)));
  });
  const entryOf = (name, attrs) => ({
    name,
    type: (attrs.mode & S_IFMT) === S_IFDIR ? 'folder' : 'file',
    size: Number(attrs.size) || 0,
    modified: (Number(attrs.mtime) || 0) * 1000,
  });
  const lost = [];
  client.on('close', () => lost.splice(0).forEach(fn => fn()));

  return {
    resume: { read: true, write: true },

    async list(path) {
      const out = [];
      for (const e of await call('readdir', full(path))) {
        if (e.filename === '.' || e.filename === '..') continue;
        let attrs = e.attrs;
        // A link: what it points to (a broken one is shown as a file)
        if ((attrs.mode & S_IFMT) === S_IFLNK) attrs = await call('stat', posix.join(full(path), e.filename)).catch(() => attrs);
        out.push(entryOf(e.filename, attrs));
      }
      return out;
    },

    async stat(path) {
      try {
        return entryOf(posix.basename(path), await call('stat', full(path)));
      } catch (err) {
        if (err.net === 'not_found') return null;
        throw err;
      }
    },

    async read(path, { start = 0 } = {}) {
      await call('stat', full(path));   // a missing file fails here, not in the middle of a copy
      const stream = sftp.createReadStream(full(path), { start });
      stream.on('error', () => {});      // the reader gets it through the stream it pipes
      return stream;
    },

    async write(path, source, { start = 0, signal } = {}) {
      const target = sftp.createWriteStream(full(path), start > 0 ? { flags: 'r+', start } : { flags: 'w' });
      try {
        await pipeline(source, target, { signal });
      } catch (err) {
        throw err?.name === 'AbortError' ? err : sftpError(err);
      }
    },

    mkdir: path => call('mkdir', full(path)),
    rename: (from, to) => call('rename', full(from), full(to)),
    remove: (path, { folder = false } = {}) => call(folder ? 'rmdir' : 'unlink', full(path)),

    onLost(fn) { lost.push(fn); },

    close() { client.end(); },
  };
}

export default {
  async init(ctx) {
    ctx.provide('netfs.sftp', driver);
  },
};
