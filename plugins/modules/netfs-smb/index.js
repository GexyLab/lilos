import { pipeline } from 'node:stream/promises';
import { Client, SmbError } from './lib/smb3-client/index.js';
import { netError, socketError, isDriverError } from './lib/shared/errors.js';
import { needLookup } from './lib/shared/kernel.js';

/**
 * SMB for the Rete folder (service 'netfs.smb', see the kernel's net/drivers.js): the shares of
 * Windows computers and NAS, SMB 2.0.2 to 3.1.1, signed and encrypted when the server offers it.
 * SMB1 (CIFS) is not supported: it is not safe, and Windows has it off. Sign-in with NTLMv2 (user,
 * password, domain or workgroup) or as a guest. What is in a folder is watched (CHANGE_NOTIFY)
 * while it is open in lilOS. The protocol is smb3-client (lib/smb3-client, see VENDORED.md); the
 * server's name resolves through the kernel (ctx.lookup: only addresses it allows).
 */
const label = (en, it) => ({ en, it });

// NTSTATUS codes
const NOT_FOUND = new Set([0xc0000034, 0xc000003a, 0xc000000f, 0xc00000cc]);
const AUTH = new Set([0xc000006d, 0xc0000071, 0xc0000072, 0xc000006e]);
const DENIED = new Set([0xc0000022, 0xc0000061]);
const IN_USE = new Set([0xc0000043, 0xc0000054, 0xc0000056]);
const LOST = new Set([0xc00000c9, 0xc0000203, 0xc000035c, 0xc0000008]);
const STATUS = { COLLISION: 0xc0000035, NOT_EMPTY: 0xc0000101, DISK_FULL: 0xc000007f, BAD_SHARE: 0xc00000cc };

// Not in a Windows name: '\' would walk up the tree, ':' opens an alternate data stream
const BAD_PART = /[\\:*?"<>|\0-\x1f]/;
const badParts = parts => parts.some(p => p === '.' || p === '..' || BAD_PART.test(p));

function smbError(err) {
  if (isDriverError(err)) return err;
  const status = err instanceof SmbError || typeof err?.status === 'number' ? err.status : null;
  if (status === STATUS.BAD_SHARE) return netError('not_found', 'Condivisione inesistente sul server');
  if (NOT_FOUND.has(status)) return netError('not_found', err.message);
  if (AUTH.has(status)) return netError('auth', 'Utente o password non validi');
  if (DENIED.has(status)) return netError('denied', 'Accesso negato dal server');
  if (IN_USE.has(status)) return netError('denied', 'Il file è in uso da un altro utente sul server');
  if (status === STATUS.COLLISION) return netError('exists', err.message);
  if (status === STATUS.NOT_EMPTY) return netError('denied', 'La cartella non è vuota');
  if (status === STATUS.DISK_FULL) return netError('denied', 'Spazio esaurito sul server');
  if (LOST.has(status) || /connection closed/i.test(err?.message ?? '')) return netError('lost', err?.message ?? 'Connessione persa');
  // The socket's own failures: as they are when connecting, else as the cause of the library's error
  // (its errors with an NTSTATUS have a code of their own: ENOENT…)
  const socket = typeof err?.cause?.code === 'string' ? err.cause : status === null && (err?.code || /timed? ?out/i.test(err?.message ?? '')) ? err : null;
  if (socket) return socketError(socket);
  return netError('invalid', err?.message ?? String(err));
}

/** The client's options for these values: a guest signs in with an empty password. */
function options(values, secret, lookup) {
  const guest = values.auth === 'guest';
  return {
    host: values.host, port: values.port ?? 445, connectTimeout: 15_000, lookup,
    username: guest ? 'guest' : values.user ?? '', password: guest ? '' : secret.password ?? '',
    domain: values.domain ?? '',
    // Unsigned answers are refused (they could be forged on the way); a guest has no key to sign
    // with, and old NAS that cannot sign need the user's explicit choice
    signing: guest || values.unsigned === true ? 'if-offered' : 'required',
  };
}

async function open(values, secret, lookup) {
  const client = new Client(options(values, secret, lookup));
  try {
    await client.connect();
  } catch (err) {
    await client.close().catch(() => {});
    const mapped = smbError(err);
    // A server that only speaks SMB1 closes the connection at NEGOTIATE
    if (mapped.net === 'lost' || /NEGOTIATE/.test(err?.message ?? '')) {
      throw netError('unreachable', 'Il server non risponde in SMB 2 o 3 (SMB1/CIFS non è supportato)');
    }
    throw mapped;
  }
  return client;
}

const driver = {
  label: label('SMB (Windows and NAS shares)', 'SMB (condivisioni Windows e NAS)'),
  order: 50,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'nas.local' },
    { key: 'port', type: 'number', label: label('Port', 'Porta'), default: 445, min: 1, max: 65535 },
    { key: 'share', type: 'text', label: label('Share', 'Condivisione'), required: true, placeholder: 'Foto' },
    {
      key: 'auth', type: 'select', label: label('Sign in', 'Accesso'), default: 'password',
      options: [{ value: 'password', label: label('User and password', 'Utente e password') }, { value: 'guest', label: label('Guest', 'Ospite') }],
    },
    { key: 'domain', type: 'text', label: label('Domain or workgroup', 'Dominio o gruppo di lavoro'), default: 'WORKGROUP', when: { auth: 'password' } },
    { key: 'user', type: 'text', label: label('User', 'Utente'), required: true, when: { auth: 'password' } },
    { key: 'password', type: 'password', label: label('Password', 'Password'), secret: true, required: true, when: { auth: 'password' } },
    {
      key: 'unsigned', type: 'checkbox', when: { auth: 'password' },
      label: label('Allow unsigned connections (old NAS only: less safe)', 'Consenti connessioni non firmate (solo vecchi NAS: meno sicuro)'),
    },
    { key: 'path', type: 'text', label: label('Folder in the share', 'Cartella dentro la condivisione'), default: '/', placeholder: '/' },
  ],

  address: v => `smb://${v.auth === 'guest' ? '' : `${v.domain && v.domain !== 'WORKGROUP' ? `${v.domain};` : ''}${v.user ?? ''}@`}${v.host ?? ''}${v.port && v.port !== 445 ? `:${v.port}` : ''}/${v.share ?? ''}${v.path && v.path !== '/' ? v.path : ''}`,

  /** The disk shares of a server (the connection dialog's «Elenca»). */
  async shares(values, ctx = {}) {
    const client = await open(values, ctx.secret ?? {}, needLookup(ctx));
    try {
      return (await client.listShares()).filter(s => s.type === 'disk' && !s.name.endsWith('$')).map(s => s.name);
    } catch (err) {
      throw smbError(err);
    } finally {
      await client.close().catch(() => {});
    }
  },

  async connect(values, ctx = {}) {
    if (!values.share || /[\\/]/.test(values.share)) throw netError('invalid', 'Condivisione non valida');
    const client = await open(values, ctx.secret ?? {}, needLookup(ctx));
    const root = (values.path ?? '/').split('/').filter(Boolean);
    if (badParts(root)) {
      await client.close().catch(() => {});
      throw netError('invalid', 'Cartella dentro la condivisione non valida');
    }
    const full = path => {
      const parts = path.split('/').filter(Boolean);
      if (badParts(parts)) throw netError('invalid', 'Nome non valido per una condivisione SMB (\\ : * ? " < > |)');
      return [values.share, ...root, ...parts].join('/');
    };
    try {
      await client.readdir(full('/'));   // the share and the folder are there, and can be read
    } catch (err) {
      await client.close().catch(() => {});
      throw smbError(err);
    }
    const call = async fn => { try { return await fn(); } catch (err) { throw smbError(err); } };
    const lost = [];
    let closed = false;
    // The library has no event for a dropped connection: the first 'lost' error tells
    const failed = err => { if (err.net === 'lost' && !closed) { closed = true; lost.splice(0).forEach(fn => fn()); } return err; };
    const run = async fn => { try { return await fn(); } catch (err) { throw failed(smbError(err)); } };

    return {
      resume: { read: true, write: true },

      list: path => run(async () => (await client.readdir(full(path), { withFileTypes: true })).map(d => ({
        name: d.name, type: d.isDirectory() ? 'folder' : 'file', size: d.size ?? 0, modified: d.mtime?.getTime?.() ?? 0,
      }))),

      async stat(path) {
        if (path === '/') return { name: '', type: 'folder', size: 0, modified: 0 };
        try {
          const s = await client.stat(full(path));
          return { name: path.slice(path.lastIndexOf('/') + 1), type: s.isDirectory ? 'folder' : 'file', size: s.size, modified: s.mtime.getTime() };
        } catch (err) {
          const mapped = failed(smbError(err));
          if (mapped.net === 'not_found') return null;
          throw mapped;
        }
      },

      async read(path, { start = 0 } = {}) {
        await this.stat(path).then(s => { if (!s) throw netError('not_found', 'Non esiste sul server'); });
        const stream = client.createReadStream(full(path), { start });
        stream.on('error', () => {});   // the reader gets it through the stream it pipes
        return stream;
      },

      async write(path, source, { start = 0, signal } = {}) {
        await run(() => pipeline(source, client.createWriteStream(full(path), { start }), { signal }));
      },

      mkdir: path => run(() => client.mkdir(full(path))),
      rename: (from, to) => run(() => client.rename(full(from), full(to))),
      remove: (path, { folder = false } = {}) => run(() => (folder ? client.rmdir(full(path)) : client.rm(full(path)))),

      watch(path, onChange) {
        const controller = new AbortController();
        const done = (async () => {
          try {
            for await (const _ of client.watch(full(path), { signal: controller.signal })) onChange();
          } catch { /* stopped, or the folder went: nothing more to tell */ }
        })();
        // Resolves once the folder's handle is closed (it can then be removed)
        return () => { controller.abort(); return done; };
      },

      onLost(fn) { lost.push(fn); },

      close() {
        closed = true;
        return call(() => client.close());
      },
    };
  },
};

export default {
  async init(ctx) {
    ctx.provide('netfs.smb', driver);
  },
};
