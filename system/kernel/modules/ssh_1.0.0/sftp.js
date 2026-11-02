import { posix } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { sshConnect } from './connect.js';
import { netError, isDriverError } from './lib/shared/errors.js';
import { needLookup } from './lib/shared/kernel.js';
import { under } from './lib/shared/paths.js';

/**
 * SFTP for the Rete folder (service 'netfs.sftp', see the kernel's net/drivers.js): files and
 * folders of a server through SSH, with a password or a private key (connect.js). The server's key
 * is checked against the fingerprint the user confirmed: the first time (or if it changed) the
 * connection stops with 'untrusted' and the fingerprint to show.
 */
const S_IFMT = 0o170000, S_IFDIR = 0o040000, S_IFLNK = 0o120000;
// SFTP status codes (draft-ietf-secsh-filexfer-02)
const NO_SUCH_FILE = 2, PERMISSION_DENIED = 3;
const READY_TIMEOUT = 20_000;     // nobody to ask: signing in has this long

function sftpError(err) {
  if (isDriverError(err)) return err;
  if (err?.code === NO_SUCH_FILE) return netError('not_found', err.message);
  if (err?.code === PERMISSION_DENIED) return netError('denied', err.message);
  if (err?.code === 'ECONNRESET' || /No response from server|not connected|Channel/i.test(err?.message ?? '')) return netError('lost', err.message);
  return netError('invalid', err?.message ?? String(err));
}

const label = (en, it) => ({ en, it });

export const sftp = {
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

  async connect(values, ctx = {}) {
    const { secret = {}, trust = null } = ctx;
    const { client } = await sshConnect(values, {
      secret, lookup: needLookup(ctx), readyTimeout: READY_TIMEOUT,
      confirm: shown => shown.fingerprint === trust,
    });
    return new Promise((resolve, reject) => {
      client.sftp((err, channel) => {
        if (err) {
          client.end();
          return reject(netError('unsupported', `SFTP non disponibile: ${err.message}`));
        }
        resolve(session(client, channel, posix.normalize(values.path || '/')));
      });
    });
  },
};

function session(client, sftp, root) {
  const full = path => under(root, path);
  const call = (method, ...args) => new Promise((resolve, reject) => {
    sftp[method](...args, (err, value) => (err ? reject(sftpError(err)) : resolve(value)));
  });
  const entryOf = (name, attrs, link = false) => ({
    name,
    type: (attrs.mode & S_IFMT) === S_IFDIR ? 'folder' : 'file',
    size: Number(attrs.size) || 0,
    modified: (Number(attrs.mtime) || 0) * 1000,
    ...(link && { link: true }),
  });
  const lost = [];
  client.on('close', () => lost.splice(0).forEach(fn => fn()));

  return {
    resume: { read: true, write: true },

    async list(path) {
      const out = [];
      for (const e of await call('readdir', full(path))) {
        if (e.filename === '.' || e.filename === '..') continue;
        let attrs = e.attrs, link = false;
        // A link: what it points to (a broken one is shown as a file), and it stays marked as a link
        if ((attrs.mode & S_IFMT) === S_IFLNK) {
          link = true;
          attrs = await call('stat', posix.join(full(path), e.filename)).catch(() => attrs);
        }
        out.push(entryOf(e.filename, attrs, link));
      }
      return out;
    },

    async stat(path) {
      try {
        const attrs = await call('stat', full(path));
        const own = await call('lstat', full(path)).catch(() => null);
        return entryOf(posix.basename(path), attrs, !!own && (own.mode & S_IFMT) === S_IFLNK);
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
