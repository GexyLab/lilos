import { connect as tcpConnect, isIP } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

/**
 * Telnet for the remote terminals (service 'term.telnet', see the kernel's term/drivers.js):
 * RFC 854 with the options a terminal needs: binary (8-bit, so UTF-8 passes), suppress go-ahead,
 * the server's echo, terminal type (1091), window size (NAWS, 1073) and the user name
 * (NEW-ENVIRON, 1572: many servers then ask only the password). Optionally over TLS (telnets, port
 * 992): a certificate not valid for the server is shown to the user to confirm (ctx.confirm).
 * When the server does not echo, what the user types is echoed here (line mode of old devices).
 */
const IAC = 255, DONT = 254, DO = 253, WONT = 252, WILL = 251, SB = 250, SE = 240;
const AYT = 246, IP = 244, BRK = 243;
const BINARY = 0, ECHO = 1, SGA = 3, TTYPE = 24, NAWS = 31, NEW_ENVIRON = 39;
const IS = 0, SEND = 1, VAR = 0, VALUE = 1;
const OURS = new Set([BINARY, SGA, TTYPE, NAWS, NEW_ENVIRON]);     // options we do (WILL)
const THEIRS = new Set([BINARY, SGA, ECHO]);                        // options we let the server do (DO)
const CONNECT_TIMEOUT = 20_000;

const netError = (net, message, extra = {}) => Object.assign(new Error(message), { net, ...extra });

function connectionError(err) {
  if (err?.net) return err;
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN|ENETUNREACH/.test(err?.code ?? '')) return netError('unreachable', err.message);
  return netError('lost', err?.message ?? String(err));
}

/** The certificate of a TLS socket: { fingerprint, text }. */
function certificateOf(socket, host) {
  const cert = socket.getPeerCertificate?.() ?? {};
  const name = String((Array.isArray(cert.subject?.CN) ? cert.subject.CN[0] : cert.subject?.CN) || host).replace(/[^\x20-\x7e]/g, '').slice(0, 80);
  return { kind: 'tls', fingerprint: cert.fingerprint256 ?? '', text: `${name} ${cert.fingerprint256 ?? ''}`.slice(0, 200) };
}

const label = (en, it) => ({ en, it });

const driver = {
  label: label('Telnet', 'Telnet'),
  order: 20,
  port: 23,
  secure: values => values?.tls === true,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: '192.168.1.1' },
    { key: 'port', type: 'number', label: label('Port', 'Porta'), min: 1, max: 65535, placeholder: '23' },
    { key: 'user', type: 'text', label: label('User', 'Utente'), hint: label('Optional: told to the server, which may then ask only the password', 'Facoltativo: detto al server, che poi può chiedere solo la password') },
    { key: 'tls', type: 'checkbox', label: label('Telnet over TLS (port 992)', 'Telnet su TLS (porta 992)'), default: false },
  ],

  address: v => `${v.tls ? 'telnets' : 'telnet'}://${v.user ? `${v.user}@` : ''}${v.host ?? ''}${v.port && v.port !== (v.tls ? 992 : 23) ? `:${v.port}` : ''}`,

  async open(values, ctx) {
    const host = values.host, port = values.port ?? (values.tls ? 992 : 23);
    const socket = await new Promise((resolve, reject) => {
      let done = false;
      const fail = err => { if (!done) { done = true; clearTimeout(timer); s.destroy(); reject(err); } };
      const timer = setTimeout(() => fail(netError('unreachable', 'Il server non risponde')), CONNECT_TIMEOUT);
      ctx.signal?.addEventListener('abort', () => fail(netError('cancelled', 'Annullato')), { once: true });
      const s = values.tls
        ? tlsConnect({ host, port, ...(isIP(host) ? {} : { servername: host }), rejectUnauthorized: false, minVersion: 'TLSv1.2' })
        : tcpConnect({ host, port });
      s.once('error', err => fail(connectionError(err)));
      s.once(values.tls ? 'secureConnect' : 'connect', async () => {
        clearTimeout(timer);
        if (values.tls && !s.authorized) {
          const cert = certificateOf(s, host);
          const ok = cert.fingerprint ? await ctx.confirm(cert).catch(() => false) : false;
          if (!ok) return fail(netError('untrusted', 'Certificato del server non confermato'));
        }
        if (done) return;
        done = true;
        resolve(s);
      });
    });
    return session(socket, values, ctx);
  },
};

function session(socket, values, ctx) {
  const data = [], closed = [];
  let pending = [], gone = false;
  let size = { cols: ctx.cols, rows: ctx.rows };
  // Option states: false (off), 'asked' (we asked, no answer yet), true (on)
  const local = new Map(), remote = new Map();
  const output = chunk => (data.length ? data.forEach(fn => fn(chunk)) : pending.push(chunk));
  const send = bytes => { if (!socket.destroyed) socket.write(Buffer.from(bytes)); };

  const naws = () => {
    const n = [size.cols >> 8, size.cols & 255, size.rows >> 8, size.rows & 255];
    // A 255 in the numbers is doubled, as any IAC inside a subnegotiation
    send([IAC, SB, NAWS, ...n.flatMap(b => (b === IAC ? [IAC, IAC] : [b])), IAC, SE]);
  };
  const subneg = (option, bytes) => {
    if (option === TTYPE && bytes[0] === SEND && local.get(TTYPE) === true) {
      send([IAC, SB, TTYPE, IS, ...Buffer.from(String(ctx.term || 'xterm-256color').toUpperCase(), 'ascii'), IAC, SE]);
    } else if (option === NEW_ENVIRON && bytes[0] === SEND && local.get(NEW_ENVIRON) === true) {
      const user = values.user ? [VAR, ...Buffer.from('USER', 'ascii'), VALUE, ...Buffer.from(values.user, 'utf8').filter(b => b > 3 && b !== IAC)] : [];
      send([IAC, SB, NEW_ENVIRON, IS, ...user, IAC, SE]);
    }
  };
  const ask = (verb, option) => {
    (verb === WILL ? local : remote).set(option, 'asked');
    send([IAC, verb, option]);
  };
  const negotiate = (verb, option) => {
    if (verb === DO || verb === DONT) {
      const want = verb === DO && OURS.has(option) && !(option === NEW_ENVIRON && !values.user);
      const was = local.get(option);
      if (want) {
        local.set(option, true);
        if (was !== true && was !== 'asked') send([IAC, WILL, option]);
        if (option === NAWS && was !== true) naws();
      } else {
        local.set(option, false);
        if (verb === DO || was) send([IAC, WONT, option]);
      }
    } else {
      const want = verb === WILL && THEIRS.has(option);
      const was = remote.get(option);
      if (want) {
        remote.set(option, true);
        if (was !== true && was !== 'asked') send([IAC, DO, option]);
      } else {
        remote.set(option, false);
        if (verb === WILL || was) send([IAC, DONT, option]);
      }
    }
  };

  // ---------- What the server sends ----------
  let state = 'data', verb = 0, option = 0, sb = [], lastCR = false;
  socket.on('data', chunk => {
    const out = [];
    for (const b of chunk) {
      switch (state) {
        case 'data':
          if (b === IAC) { state = 'iac'; break; }
          // CR NUL is a lone CR in the NVT; in binary mode the bytes are as they are
          if (b === 0 && lastCR && remote.get(BINARY) !== true) { lastCR = false; break; }
          lastCR = b === 13;
          out.push(b);
          break;
        case 'iac':
          if (b === IAC) { out.push(IAC); state = 'data'; } else if (b >= WILL && b <= DONT) { verb = b; state = 'option'; } else if (b === SB) { sb = []; state = 'sb-option'; } else state = 'data';   // GA, NOP, DM…: nothing to show
          break;
        case 'option':
          negotiate(verb, b);
          state = 'data';
          break;
        case 'sb-option':
          option = b;
          state = 'sb';
          break;
        case 'sb':
          if (b === IAC) state = 'sb-iac';
          else if (sb.length < 1024) sb.push(b);
          break;
        case 'sb-iac':
          if (b === SE) { subneg(option, sb); state = 'data'; } else { if (b === IAC && sb.length < 1024) sb.push(IAC); state = 'sb'; }
          break;
      }
    }
    if (out.length) output(Buffer.from(out));
  });
  const end = reason => {
    if (gone) return;
    gone = true;
    closed.forEach(fn => fn({ reason }));
    socket.destroy();
  };
  socket.on('end', () => end(''));
  socket.on('close', () => end(''));
  socket.on('error', err => end(`Connessione persa: ${err.message}`));

  // What a terminal usually offers at once
  ask(DO, SGA);
  ask(WILL, TTYPE);
  ask(WILL, NAWS);
  ask(WILL, BINARY);
  ask(DO, BINARY);

  /** The server does not echo: what the user types is shown here. */
  const echo = bytes => {
    const shown = [];
    for (const b of bytes) {
      if (b === 13) shown.push(13, 10);
      else if (b === 0x7f || b === 8) shown.push(8, 32, 8);
      else if (b >= 32 || b === 9) shown.push(b);
    }
    if (shown.length) output(Buffer.from(shown));
  };

  return {
    info: values.tls ? { tls: socket.getProtocol?.() ?? 'TLS' } : null,
    signals: ['break', 'interrupt', 'ayt'],
    onData(fn) {
      data.push(fn);
      pending.forEach(fn);
      pending = [];
    },
    onClose(fn) { closed.push(fn); },
    write(bytes) {
      const binary = local.get(BINARY) === true;
      const out = [];
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b === IAC) out.push(IAC, IAC);
        else if (b === 13 && !binary && bytes[i + 1] !== 10) out.push(13, 0);   // a lone CR is CR NUL
        else out.push(b);
      }
      send(out);
      if (remote.get(ECHO) !== true) echo(bytes);
    },
    resize(cols, rows) {
      size = { cols, rows };
      if (local.get(NAWS) === true) naws();
    },
    signal(name) {
      if (name === 'break') send([IAC, BRK]);
      else if (name === 'interrupt') send([IAC, IP]);
      else if (name === 'ayt') send([IAC, AYT]);
    },
    pause() { socket.pause(); },
    resume() { socket.resume(); },
    close() { end(''); },
  };
}

export default {
  async init(ctx) {
    ctx.provide('term.telnet', driver);
  },
};
