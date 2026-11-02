import { Socket } from 'node:net';

/**
 * rlogin for the remote terminals (service 'term.rlogin', see the kernel's term/drivers.js):
 * RFC 1282. The client says who it is and the terminal type, the server asks the password itself
 * (in the terminal) unless it trusts the client (.rhosts).
 *
 * Two limits of Node:
 * - the server asks the window size with urgent (out-of-band) data, which Node does not show: the
 *   size is sent once the user signed in (after the first Enter and the server's answer to it:
 *   some rlogind read the size only after the login, before it would end up in the password) and
 *   at each change after that. A login without password (.rhosts) gets it at the first command;
 * - rlogind trusts only clients on a privileged port (512-1023): the connection tries one (allowed
 *   on Windows and to root), otherwise it goes from an ordinary port and many servers refuse it.
 */
const CONNECT_TIMEOUT = 20_000;
const RESERVED = { from: 1023, to: 512, tries: 24 };

const netError = (net, message, extra = {}) => Object.assign(new Error(message), { net, ...extra });

function connectionError(err) {
  if (err?.net) return err;
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN|ENETUNREACH/.test(err?.code ?? '')) return netError('unreachable', err.message);
  return netError('lost', err?.message ?? String(err));
}

const label = (en, it) => ({ en, it });

const driver = {
  label: label('rlogin', 'rlogin'),
  order: 30,
  port: 513,
  secure: false,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'sun4.lan' },
    { key: 'port', type: 'number', label: label('Port', 'Porta'), min: 1, max: 65535, placeholder: '513' },
    { key: 'user', type: 'text', label: label('User', 'Utente'), required: true },
    { key: 'localUser', type: 'text', label: label('Local user', 'Utente locale'), hint: label('Who you are for .rhosts; empty: the same user', 'Chi sei per .rhosts; vuoto: lo stesso utente') },
  ],

  address: v => `rlogin://${v.user ? `${v.user}@` : ''}${v.host ?? ''}${v.port && v.port !== 513 ? `:${v.port}` : ''}`,

  async open(values, ctx) {
    const host = values.host, port = values.port ?? 513;
    const attempt = localPort => new Promise((resolve, reject) => {
      const s = new Socket();
      let done = false;
      const fail = err => { if (!done) { done = true; clearTimeout(timer); s.destroy(); reject(err); } };
      const timer = setTimeout(() => fail(netError('unreachable', 'Il server non risponde')), CONNECT_TIMEOUT);
      ctx.signal?.addEventListener('abort', () => fail(netError('cancelled', 'Annullato')), { once: true });
      s.once('error', fail);
      s.connect({ host, port, ...(localPort && { localPort }) }, () => {
        clearTimeout(timer);
        done = true;
        resolve(s);
      });
    });
    let socket = null;
    for (let i = 0, p = RESERVED.from; i < RESERVED.tries && p >= RESERVED.to && !socket; i++, p--) {
      try {
        socket = await attempt(p);
      } catch (err) {
        if (err.code === 'EADDRINUSE') continue;          // that port is taken: the next one
        if (err.code === 'EACCES' || err.code === 'EPERM') break;   // not allowed here: an ordinary port
        throw connectionError(err);
      }
    }
    if (!socket) {
      ctx.print('Nessuna porta privilegiata disponibile: il server potrebbe rifiutare la connessione.');
      try {
        socket = await attempt(0);
      } catch (err) {
        throw connectionError(err);
      }
    }
    const user = String(values.user ?? '').replace(/\0/g, '');
    const localUser = String(values.localUser || user).replace(/\0/g, '');
    const term = String(ctx.term || 'xterm-256color').replace(/[^\x21-\x7e]/g, '');
    socket.write(Buffer.from(`\0${localUser}\0${user}\0${term}/38400\0`, 'utf8'));
    return session(socket, ctx);
  },
};

function session(socket, ctx) {
  const data = [], closed = [];
  let pending = [], gone = false, acked = false, said = false;
  // The window size: 'wait' (not signed in yet), 'enter' (Enter typed: the server's answer next), 'on'
  let sizing = 'wait', size = { cols: ctx.cols, rows: ctx.rows };
  const output = chunk => (data.length ? data.forEach(fn => fn(chunk)) : pending.push(chunk));
  const windowSize = (cols, rows) => {
    const b = Buffer.alloc(12);
    b.set([0xff, 0xff, 0x73, 0x73]);
    b.writeUInt16BE(rows, 4);
    b.writeUInt16BE(cols, 6);
    if (!socket.destroyed) socket.write(b);
  };
  socket.on('data', chunk => {
    // The server's first byte, a zero, says it took the connection
    if (!acked) {
      acked = true;
      if (chunk[0] === 0) chunk = chunk.subarray(1);
    }
    if (!chunk.length) return;
    said = true;
    output(chunk);
    if (sizing === 'enter') {
      sizing = 'sending';
      setTimeout(() => { sizing = 'on'; windowSize(size.cols, size.rows); }, 500);
    }
  });
  const end = reason => {
    if (gone) return;
    gone = true;
    closed.forEach(fn => fn({ reason }));
    socket.destroy();
  };
  // Closed before saying anything: rlogind refuses whom it does not trust (an ordinary port above all)
  const closedBy = () => end(said ? '' : 'Il server ha chiuso la connessione subito: forse accetta solo client su una porta privilegiata (512-1023)');
  socket.on('end', closedBy);
  socket.on('close', closedBy);
  socket.on('error', err => end(`Connessione persa: ${err.message}`));
  return {
    info: null,
    signals: [],
    onData(fn) {
      data.push(fn);
      pending.forEach(fn);
      pending = [];
    },
    onClose(fn) { closed.push(fn); },
    write(bytes) {
      if (socket.destroyed) return;
      socket.write(bytes);
      if (sizing === 'wait' && bytes.includes(13)) sizing = 'enter';
    },
    resize(cols, rows) {
      size = { cols, rows };
      if (sizing === 'on') windowSize(size.cols, size.rows);
    },
    pause() { socket.pause(); },
    resume() { socket.resume(); },
    close() { end(''); },
  };
}

export default {
  async init(ctx) {
    ctx.provide('term.rlogin', driver);
  },
};
