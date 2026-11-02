import net from 'node:net';
import { paramBlock, screenSize, Screen, Keys, LOGOUT } from './supdup.js';

/**
 * SUPDUP for the Terminale remoto app (service 'term.supdup', see the kernel's term/drivers.js):
 * the display protocol of the MIT ITS systems (RFC 734, RFC 747), over TCP port 95. The core and
 * the page speak xterm, so supdup.js translates both ways: the server's %TD display codes into
 * escape sequences, and the keys xterm sends into SUPDUP input with its bucky bits.
 *
 * No sign in here: SUPDUP has none, the user logs in on the server's own screen (":login name"
 * on ITS). Nothing is encrypted.
 *
 * The screen size is sent once, in the parameter block when the connection opens: SUPDUP has no
 * message to change it later (neither RFC 734/747 nor ITS's intelligent terminal protocol have
 * one), so a resize keeps the size the server knows and only sets the xterm up again.
 */
export { paramBlock, screenSize, Screen, Keys, LOGOUT, TTYOPT, TD, bucky, keyWith } from './supdup.js';

const DEFAULT_PORT = 95;
const CONNECT_TIMEOUT = 20_000;
const CLOSE_TIMEOUT = 2_000;
const RESYNC_QUIET = 400, RESYNC_GIVE_UP = 3_000;
const RESETS_OUTPUT = [0o23 /* ^S */, 0o7 /* ^G */];

const netError = (kind, message, extra = {}) => Object.assign(new Error(message), { net: kind, ...extra });

function connectionError(err) {
  if (err?.net) return err;
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN|ENETUNREACH/.test(err?.code ?? '')) return netError('unreachable', err.message);
  if (/ECONNRESET|EPIPE|ECONNABORTED/.test(err?.code ?? '')) return netError('lost', err.message);
  return netError('invalid', err?.message ?? String(err));
}

const label = (en, it) => ({ en, it });
const portOf = values => (values.port === undefined || values.port === null || values.port === '' ? DEFAULT_PORT : Number(values.port));

const driver = {
  label: label('SUPDUP', 'SUPDUP'),
  order: 40,
  port: DEFAULT_PORT,
  secure: false,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'its.example' },
    { key: 'port', type: 'number', label: label('Port', 'Porta'), min: 1, max: 65535, placeholder: String(DEFAULT_PORT) },
  ],

  address(values) {
    const port = portOf(values);
    return `supdup://${values.host}${port === DEFAULT_PORT ? '' : `:${port}`}`;
  },

  check(values) {
    const host = typeof values?.host === 'string' ? values.host.trim() : '';
    if (!host || /[\s/@]/.test(host)) throw netError('invalid', 'Server non valido');
    const port = portOf(values);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw netError('invalid', 'Porta non valida');
  },

  open(values, ctx) {
    driver.check(values);
    const { cols, rows } = screenSize(ctx.cols, ctx.rows);
    const signal = ctx.signal;
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(netError('cancelled', 'Connessione annullata'));
      const socket = net.connect({ host: values.host.trim(), port: portOf(values) });
      let settled = false;
      const fail = err => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        socket.destroy();
        reject(err);
      };
      const onAbort = () => fail(netError('cancelled', 'Connessione annullata'));
      const timer = setTimeout(() => fail(netError('unreachable', 'Il server non risponde')), CONNECT_TIMEOUT);
      signal?.addEventListener('abort', onAbort, { once: true });
      socket.once('error', err => fail(connectionError(err)));
      socket.once('close', () => fail(netError('unreachable', 'Connessione chiusa dal server')));
      socket.once('connect', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 30_000);
        socket.write(paramBlock(cols, rows));   // the server answers with its greeting
        resolve(session(socket, cols, rows));
      });
    });
  },
};

function session(socket, cols, rows) {
  const screen = new Screen(cols, rows);
  const keys = new Keys();
  let dataFn = null, closeFn = null;
  const pending = [];          // output before onData is set
  let ended = null;            // { reason } once the connection is over
  let closing = false;         // close() was called: the end is not an error
  let failure = null;

  const emit = buf => {
    if (!buf.length) return;
    if (dataFn) dataFn(buf); else pending.push(buf);
  };
  const end = reason => {
    if (ended) return;
    ended = { reason };
    emit(Buffer.from(screen.teardown()));
    closeFn?.(ended);
  };

  // Output resets the server may not announce. Typing ^S (flush output) or ^G (quit) makes ITS
  // reset the output and hold it until it is told the cursor position (^\ ^P v h). The %TDORS
  // that should ask for it does not reach a TCP client (tested with KA ITS 1652: nothing arrives,
  // not even as urgent data), so the reference client hangs there until reconnected. Here, after
  // such a key, once the server has been quiet for RESYNC_QUIET ms, the cursor position is sent.
  // When the server was not holding output it is harmless: with nothing in flight, the position
  // we send is the one ITS already has. If output keeps flowing (nothing was held), nothing is sent.
  let lastData = Date.now(), resync = null;
  const cancelResync = () => { clearTimeout(resync); resync = null; };
  const scheduleResync = () => {
    cancelResync();
    const started = Date.now();
    const tick = () => {
      resync = null;
      if (ended || closing || socket.destroyed) return;
      const quiet = Date.now() - Math.max(lastData, started);
      if (quiet >= RESYNC_QUIET) return socket.write(Buffer.from(screen.cursorReport()));
      if (Date.now() - started < RESYNC_GIVE_UP) resync = setTimeout(tick, RESYNC_QUIET - quiet);
    };
    resync = setTimeout(tick, RESYNC_QUIET);
  };

  emit(Buffer.from(screen.setup()));
  socket.removeAllListeners('error');
  socket.removeAllListeners('close');
  socket.on('data', data => {
    lastData = Date.now();
    const { out, reply } = screen.feed(data);
    emit(out);
    if (reply && !socket.destroyed) {
      cancelResync();
      socket.write(reply);
    }
  });
  socket.on('error', err => { failure = err; });
  // A server that logs the user out closes the connection: that is the normal end (reason '').
  // An error (reset, timeout) is a dropped connection.
  socket.on('close', () => end(failure && !closing ? `Connessione con il server interrotta (${failure.code ?? failure.message})` : ''));

  return {
    signals: [],
    info: null,

    onData(fn) {
      dataFn = fn;
      for (const buf of pending.splice(0)) fn(buf);
    },

    onClose(fn) {
      closeFn = fn;
      if (ended) fn(ended);
    },

    write(data) {
      if (ended || closing || socket.destroyed) return;
      const bytes = keys.encode(Buffer.isBuffer(data) ? data : Buffer.from(data));
      if (!bytes.length) return;
      socket.write(bytes);
      if (RESETS_OUTPUT.some(c => bytes.includes(c))) scheduleResync();
    },

    /** No resize in SUPDUP: the server keeps the size it was told; the xterm is set up again. */
    resize() {
      if (!ended) emit(Buffer.from(screen.setup({ clear: false })));
    },

    pause() { socket.pause(); },
    resume() { socket.resume(); },

    /** Logs the remote job out (escape 300 301), then closes the connection. */
    close() {
      if (ended || closing) return;
      closing = true;
      if (!socket.destroyed) socket.end(LOGOUT);
      setTimeout(() => socket.destroy(), CLOSE_TIMEOUT).unref();
    },
  };
}

export default {
  async init(ctx) {
    ctx.provide('term.supdup', driver);
  },
};

export { driver };
