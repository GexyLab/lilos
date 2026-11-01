import ftp from 'basic-ftp';
import { isIP } from 'node:net';
import { posix } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { TLSSocket } from 'node:tls';

/**
 * FTP and FTPS for the Rete folder (services 'netfs.ftp' and 'netfs.ftps', see the kernel's
 * net/drivers.js), with basic-ftp.
 *
 * FTPS: explicit (AUTH TLS on the usual port) or implicit (TLS from the start, usually port 990).
 * The password never travels on a TLS connection that is not verified: the connection is made
 * without rejecting the certificate, then, BEFORE the login, the certificate must be valid for the
 * server (signed by a known authority, right name) or be the one the user confirmed (its SHA-256
 * fingerprint, `trust`); otherwise the connection closes with 'untrusted' and the fingerprint to
 * show. Every data connection (listings and files) must then show the same certificate, or come
 * from the same TLS session.
 *
 * A basic-ftp client runs one command at a time: the session keeps one client for listings and
 * the other operations (one after the other) and opens a client of its own for every file read or
 * written, closed when the file is done, so a folder can be listed while a file goes.
 */
const { Client, FTPError, FileType } = ftp;
const TIMEOUT = 30_000;
const CONTROL = /[\0-\x1f\x7f]/;

const netError = (net, message, extra = {}) => Object.assign(new Error(message), { net, ...extra });

const abortError = signal => (signal?.reason instanceof Error ? signal.reason : Object.assign(new Error('Annullato'), { name: 'AbortError' }));

/** An error of basic-ftp (or of the network) with `net`, what went wrong. `connecting`: while the connection opens. */
function ftpError(err, { connecting = false, client = null } = {}) {
  if (err?.net || err?.name === 'AbortError') return err;
  if (client?.pinError) return client.pinError;
  const message = String(err?.message ?? err);
  if (err instanceof FTPError) {
    const code = err.code;
    if (code === 530 || code === 532) return netError('auth', 'Utente o password non validi');
    if (code === 421 || code === 425 || code === 426) return netError(connecting ? 'unreachable' : 'lost', message);
    if (code === 550 || code === 450) {
      if (/permission|denied|not allowed|access/i.test(message)) return netError('denied', message);
      if (/exists/i.test(message) && !/not exist|no such/i.test(message)) return netError('exists', message);
      return netError('not_found', message);
    }
    if (code === 451 || code === 452 || code === 552 || code === 553) return netError('denied', message);
    if (code === 500 || code === 502 || code === 504) return netError('unsupported', message);
    if (code === 501) return netError('invalid', message);
    return err;
  }
  if (connecting) return netError('unreachable', message);
  if (/ECONNRESET|EPIPE|ETIMEDOUT|ECONNABORTED/.test(err?.code ?? '') || /closed|FIN packet|transmission error|Timeout|socket hang up/i.test(message)) {
    return netError('lost', message);
  }
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|EAI_AGAIN|ENETUNREACH/.test(err?.code ?? '')) return netError('unreachable', message);
  return err;
}

/** The certificate of a TLS socket: { fingerprint, text }. */
function certificateOf(socket, host) {
  const cert = socket.getPeerCertificate?.() ?? {};
  const fingerprint = cert.fingerprint256 ?? '';
  const name = (Array.isArray(cert.subject?.CN) ? cert.subject.CN[0] : cert.subject?.CN) || host;
  return { fingerprint, text: `${name} · ${fingerprint}` };
}

/**
 * Every TLS data connection of a client must come from the TLS session of its control connection
 * or show the certificate already verified (`fingerprint`). basic-ftp sets the data socket right
 * after starting its handshake, and an upload waits for 'secureConnect': this check is put first
 * on that event, so nothing goes through a data connection that fails it; the client then closes
 * with that error.
 */
function pinDataConnections(client, fingerprint) {
  const context = client.ftp;
  const accessor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(context), 'dataSocket');
  Object.defineProperty(context, 'dataSocket', {
    configurable: true,
    get() { return accessor.get.call(this); },
    set(socket) {
      if (socket instanceof TLSSocket) {
        socket.prependOnceListener('secureConnect', () => {
          if (socket.isSessionReused() || socket.authorized || certificateOf(socket).fingerprint === fingerprint) return;
          client.pinError = netError('denied', 'Il canale dati del server ha un certificato diverso da quello confermato');
          socket.destroy();
          context.closeWithError(client.pinError);
        });
      }
      accessor.set.call(this, socket);
    },
  });
}

/**
 * A client connected and logged in. `trust`: the fingerprint the user confirmed (or, for the clients
 * of an open session, the one already checked). Returns { client, fingerprint }.
 */
async function openClient(values, secret, { secure, trust }) {
  const host = values.host, port = values.port ?? 21;
  const user = values.user || 'anonymous';
  const password = values.user ? secret.password ?? '' : secret.password || 'lilos@';
  if (CONTROL.test(host ?? '') || CONTROL.test(user) || CONTROL.test(password)) throw netError('invalid', 'Server, utente o password con caratteri non validi');
  const client = new Client(TIMEOUT);
  let fingerprint = null;
  try {
    // The certificate is checked here, before the login (rejectUnauthorized: false only to see it)
    const tlsOptions = () => ({ host, ...(isIP(host) ? {} : { servername: host }), rejectUnauthorized: false, minVersion: 'TLSv1.2' });
    try {
      if (secure && values.tls === 'implicit') await client.connectImplicitTLS(host, port, tlsOptions());
      else await client.connect(host, port);
      if (secure && values.tls !== 'implicit') {
        try {
          await client.useTLS(tlsOptions());
        } catch (err) {
          if (err instanceof FTPError) throw netError('unsupported', `Il server non accetta FTPS esplicito (AUTH TLS): ${err.message}`);
          throw err;
        }
      }
    } catch (err) {
      throw ftpError(err, { connecting: true });
    }
    if (secure) {
      const socket = client.ftp.socket;
      if (!(socket instanceof TLSSocket) || !socket.encrypted) throw netError('unreachable', 'Connessione TLS non stabilita');
      const cert = certificateOf(socket, host);
      if (!cert.fingerprint) throw netError('unreachable', 'Il server non ha mostrato un certificato');
      if (!socket.authorized && cert.fingerprint !== trust) throw netError('untrusted', 'Server da confermare', { trust: { kind: 'tls', ...cert } });
      fingerprint = cert.fingerprint;
      pinDataConnections(client, fingerprint);
    }
    try {
      await client.sendIgnoringError('OPTS UTF8 ON');
      await client.login(user, password);
      await client.useDefaultSettings();
    } catch (err) {
      throw ftpError(err, { connecting: true, client });
    }
    return { client, fingerprint };
  } catch (err) {
    client.close();
    throw err;
  }
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** The time of an entry of a LIST (Unix 'Nov  1 12:34' / 'Nov  1  2025', or DOS '11-01-26  12:34PM'), as UTC; 0 when unknown. */
function listTime(raw) {
  const text = String(raw ?? '').trim().replace(/\s+/g, ' ');
  let m = /^([a-z]{3}) (\d{1,2}) (?:(\d{1,2}):(\d{2})|(\d{4}))$/i.exec(text);
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
    const month = MONTHS[m[1].toLowerCase()], day = Number(m[2]);
    if (m[5]) return Date.UTC(Number(m[5]), month, day);
    const now = new Date();
    let time = Date.UTC(now.getUTCFullYear(), month, day, Number(m[3]), Number(m[4]));
    if (time > Date.now() + 86_400_000) time = Date.UTC(now.getUTCFullYear() - 1, month, day, Number(m[3]), Number(m[4]));
    return time;
  }
  m = /^(\d{2})-(\d{2})-(\d{2}|\d{4}) (\d{1,2}):(\d{2}) ?([AP]M)?$/i.exec(text);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    let hour = Number(m[4]) % (m[6] ? 12 : 24);
    if (m[6]?.toUpperCase() === 'PM') hour += 12;
    return Date.UTC(year, Number(m[1]) - 1, Number(m[2]), hour, Number(m[5]));
  }
  return 0;
}

/**
 * The bytes of `source`, read only when the upload starts (after the TLS handshake of the data
 * connection); an empty one ends a little later. Some servers (vsftpd) fail an empty upload when
 * the end of the data connection arrives together with the end of its handshake ("500 OOPS" in
 * clear on the control connection).
 */
function settledEnd(source) {
  return Readable.from((async function* bytes() {
    let size = 0;
    for await (const chunk of source) {
      size += chunk.length;
      yield chunk;
    }
    if (!size) await delay(EMPTY_UPLOAD_DELAY);
  })(), { objectMode: false });
}
const EMPTY_UPLOAD_DELAY = 500;

const label = (en, it) => ({ en, it });

function makeDriver(secure) {
  const scheme = secure ? 'ftps' : 'ftp';
  const fields = [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'ftp.example.com' },
    {
      key: 'port', type: 'number', label: label('Port', 'Porta'), default: 21, min: 1, max: 65535,
      ...(secure && { hint: label('21 for explicit TLS; implicit TLS usually uses 990', '21 per il TLS esplicito; il TLS implicito di solito usa la 990') }),
    },
  ];
  if (secure) {
    fields.push({
      key: 'tls', type: 'select', label: label('TLS', 'TLS'), default: 'explicit',
      options: [
        { value: 'explicit', label: label('Explicit (AUTH TLS)', 'Esplicito (AUTH TLS)') },
        { value: 'implicit', label: label('Implicit (TLS from the start)', 'Implicito (TLS dall’inizio)') },
      ],
    });
  }
  fields.push(
    { key: 'user', type: 'text', label: label('User', 'Utente'), hint: label('Empty: anonymous access', 'Vuoto: accesso anonimo') },
    {
      key: 'password', type: 'password', label: label('Password', 'Password'), secret: true,
      ...(!secure && { hint: label('With plain FTP the password travels unencrypted: use FTPS or SFTP when the server has them', 'Con l’FTP semplice la password viaggia in chiaro: se il server li ha, usa FTPS o SFTP') }),
    },
    { key: 'path', type: 'text', label: label('Remote folder', 'Cartella remota'), default: '/', placeholder: '/www', hint: label('Without / at the start: inside the login folder', 'Senza / all’inizio: dentro la cartella di accesso') },
  );

  return {
    label: secure ? label('FTPS (FTP over TLS)', 'FTPS (FTP con TLS)') : label('FTP', 'FTP'),
    order: secure ? 20 : 10,
    fields,

    address: v => `${scheme}://${v.user ? `${v.user}@` : ''}${v.host ?? ''}${v.port && v.port !== 21 ? `:${v.port}` : ''}${v.path && v.path !== '/' ? (v.path.startsWith('/') ? v.path : `/${v.path}`) : ''}`,

    async connect(values, { secret = {}, trust = null } = {}) {
      const rawRoot = String(values.path || '/');
      if (CONTROL.test(rawRoot)) throw netError('invalid', 'Cartella remota non valida');
      const { client, fingerprint } = await openClient(values, secret, { secure, trust });
      try {
        let root = rawRoot.startsWith('/') ? posix.normalize(rawRoot) : posix.join(await client.pwd(), rawRoot);
        if (root.length > 1) root = root.replace(/\/+$/, '');
        const features = await client.features();
        return session(client, { values, secret, secure, fingerprint, root, canRestart: features.has('REST') });
      } catch (err) {
        client.close();
        throw ftpError(err, { connecting: true, client });
      }
    },
  };
}

function session(main, { values, secret, secure, fingerprint, root, canRestart }) {
  const full = path => (root === '/' ? path : path === '/' ? root : `${root}${path}`);
  const streams = new Set();     // the clients of the files being read or written
  const lost = [];
  let closing = false, queue = Promise.resolve();

  // The connection drops by itself: basic-ftp closes its context (closeWithError) for every
  // error of the control connection
  const closeWithError = main.ftp.closeWithError.bind(main.ftp);
  main.ftp.closeWithError = err => {
    const first = !main.ftp._closingError;
    closeWithError(err);
    if (first && !closing) lost.splice(0).forEach(fn => fn());
  };

  /** Runs fn(client) on the main client, after what is running there. */
  const run = fn => {
    const result = queue.then(async () => {
      if (closing) throw netError('lost', 'Connessione chiusa');
      try {
        return await fn(main);
      } catch (err) {
        const mapped = ftpError(err, { client: main });
        if (main.closed && !mapped.net && !(err instanceof FTPError)) throw netError('lost', mapped.message);
        throw mapped;
      }
    });
    queue = result.catch(() => {});
    return result;
  };

  const entryOf = (info, type) => ({
    name: info.name,
    type,
    size: type === 'folder' ? 0 : Number(info.size) || 0,
    modified: info.modifiedAt?.getTime() || listTime(info.rawModifiedAt),
  });

  /** The entries of a folder (on the main client). */
  async function listOn(client, path) {
    const out = [];
    for (const info of await client.list(full(path))) {
      if (!info.name || info.name === '.' || info.name === '..' || info.name.includes('/')) continue;
      let type = info.type === FileType.Directory ? 'folder' : 'file';
      // A link: a folder if one can enter it (a broken one is shown as a file)
      if (info.type === FileType.SymbolicLink) {
        type = await client.cd(full(path === '/' ? `/${info.name}` : `${path}/${info.name}`)).then(() => 'folder', () => 'file');
      }
      out.push(entryOf(info, type));
    }
    return out;
  }

  /** A client of its own for one file; closed when `signal` aborts. */
  async function streamClient(signal) {
    if (closing) throw netError('lost', 'Connessione chiusa');
    if (signal?.aborted) throw abortError(signal);
    const { client } = await openClient(values, secret, { secure, trust: fingerprint });
    streams.add(client);
    const abort = () => client.close();
    signal?.addEventListener('abort', abort, { once: true });
    const done = () => { signal?.removeEventListener('abort', abort); streams.delete(client); client.close(); };
    if (signal?.aborted) { done(); throw abortError(signal); }
    return { client, done };
  }

  const stat = async path => {
    if (path === '/') return { name: '', type: 'folder', size: 0, modified: 0 };
    const name = posix.basename(path);
    try {
      return (await run(client => listOn(client, posix.dirname(path)))).find(e => e.name === name) ?? null;
    } catch (err) {
      if (err.net === 'not_found') return null;
      throw err;
    }
  };

  /** Many servers answer only "550 failed": when `path` is there, it was not allowed (a folder not empty…). */
  const refused = async (err, path) => {
    if (err.net === 'not_found' && (await stat(path).catch(() => null))) throw netError('denied', err.message);
    throw err;
  };

  return {
    // REST (read from a point) only if the server says so; APPE (add to a file) is in every FTP server (RFC 959)
    resume: { read: canRestart, write: true },

    list: path => run(client => listOn(client, path)),

    stat,

    async read(path, { start = 0, signal } = {}) {
      const { client, done } = await streamClient(signal);
      const out = new PassThrough();
      out.on('error', () => {});      // the reader gets it through the stream it pipes
      client.downloadTo(out, full(path), start > 0 ? start : 0).then(
        () => done(),
        err => { done(); if (!out.destroyed) out.destroy(signal?.aborted ? abortError(signal) : ftpError(err, { client })); },
      );
      return out;
    },

    async write(path, source, { start = 0, signal } = {}) {
      const { client, done } = await streamClient(signal);
      try {
        const bytes = secure ? settledEnd(source) : source;
        if (start > 0) await client.appendFrom(bytes, full(path));
        else await client.uploadFrom(bytes, full(path));
      } catch (err) {
        if (signal?.aborted) throw abortError(signal);
        throw ftpError(err, { client });
      } finally {
        done();
      }
    },

    async mkdir(path) {
      try {
        await run(async client => client.send(`MKD ${await client.protectWhitespace(full(path))}`));
      } catch (err) {
        // Many servers say only "failed": it is there already?
        if (err.net && err.net !== 'lost' && (await stat(path).catch(() => null))) throw netError('exists', err.message);
        throw err;
      }
    },

    async rename(from, to) {
      // FTP replaces what is there with the same name: not without asking (as SFTP)
      if (await stat(to)) throw netError('exists', 'Esiste già sul server');
      await run(client => client.rename(full(from), full(to))).catch(err => refused(err, from));
    },

    remove: (path, { folder = false } = {}) => run(client => (folder ? client.removeEmptyDir(full(path)) : client.remove(full(path)))).catch(err => refused(err, path)),

    onLost(fn) { lost.push(fn); },

    close() {
      closing = true;
      main.close();
      for (const client of streams) client.close();
      streams.clear();
    },
  };
}

export default {
  async init(ctx) {
    ctx.provide('netfs.ftp', makeDriver(false));
    ctx.provide('netfs.ftps', makeDriver(true));
  },
};
