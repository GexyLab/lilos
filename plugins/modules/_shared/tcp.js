import net from 'node:net';
import tls from 'node:tls';
import { randomInt } from 'node:crypto';
import { netError, socketError } from './errors.js';

const CONNECT_TIMEOUT = 20_000;

/**
 * The address a host name resolves to through `lookup` (ctx.lookup: only addresses the kernel
 * allows; an IP address is checked as it is): { address, family }. For libraries that connect by
 * themselves (basic-ftp): they are given the address, TLS keeps the name (servername).
 */
export function resolveHost(host, lookup) {
  return new Promise((resolve, reject) => {
    lookup(String(host), {}, (err, address, family) => (err ? reject(socketError(err)) : resolve({ address, family })));
  });
}

/**
 * A TCP connection to host:port, or TLS with `tls` (tls.connect's options: servername,
 * rejectUnauthorized…; it resolves after the handshake, the certificate is for the caller to
 * check). The name resolves through `lookup`. Rejects once, with a driver error (socketError, the
 * system's code in `code`): 'unreachable' after `timeout` ms, 'cancelled' when `signal` aborts.
 * The socket keeps a listener that swallows errors: the caller adds its own.
 */
export function tcpConnect(host, port, { tls: secure = null, signal = null, timeout = CONNECT_TIMEOUT, localPort, lookup } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(netError('cancelled', 'Annullato'));
    const options = { host, port, ...(lookup && { lookup }), ...(localPort && { localPort }) };
    const socket = secure ? tls.connect({ ...secure, ...options }) : net.connect(options);
    let done = false;
    const settle = (err, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (err) { socket.destroy(); reject(err); } else resolve(value);
    };
    const onAbort = () => settle(netError('cancelled', 'Annullato'));
    const timer = setTimeout(() => settle(netError('unreachable', 'Il server non risponde', { code: 'ETIMEDOUT' })), timeout);
    signal?.addEventListener('abort', onAbort, { once: true });
    socket.on('error', err => settle(socketError(err)));
    socket.once('close', () => settle(netError('unreachable', 'Connessione chiusa dal server')));
    socket.once(secure ? 'secureConnect' : 'connect', () => settle(null, socket));
  });
}

/**
 * A TCP connection from a privileged port (below 1024) when the system allows it, else from any
 * port: servers that trust the client's machine (rlogind, NFS's "secure" exports) want one. The
 * name resolves once; ports in use are skipped. → { socket, privileged }
 */
export async function privilegedConnect(host, port, { lookup, from = 1023, to = 512, tries = 24, ...options } = {}) {
  const { address } = lookup ? await resolveHost(host, lookup) : { address: host };
  let p = randomInt(to, from + 1);
  for (let i = 0; i < tries; i++, p = p > to ? p - 1 : from) {
    try {
      return { socket: await tcpConnect(address, port, { ...options, localPort: p }), privileged: true };
    } catch (err) {
      if (err.code === 'EADDRINUSE' || err.code === 'EADDRNOTAVAIL') continue;   // that port is taken: the next one
      if (err.code === 'EACCES' || err.code === 'EPERM') break;                  // not allowed here: an ordinary port
      throw err;
    }
  }
  return { socket: await tcpConnect(address, port, options), privileged: false };
}
