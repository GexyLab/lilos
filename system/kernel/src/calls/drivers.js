import dgram from 'node:dgram';
import { isIP } from 'node:net';
import { fail } from '../errors.js';
import { connectTo, networkMessage } from '../net/connect.js';
import { httpRequest, findHeader } from '../net/http.js';
import { connectSocket } from '../ws.js';
import { defineStrings } from '../strings.js';

/**
 * The protocols of NetTest's live sessions (calls/sessions.js): a connection that stays open and
 * passes messages both ways. WebSocket, SSE, TCP, TLS and UDP are the kernel's own; a kernel module
 * adds others as the service 'call.<protocol>' (call-grpc gives 'call.grpc', call-mqtt 'call.mqtt').
 *
 *   label        string | { en, it }
 *   open(values, ctx) → conn        connects; values are the request's, variables and secrets put in
 *       ctx.output(msg)             a message for the user: { type, data, meta? } (see below)
 *       ctx.closed({ reason })      the connection is over (once; also before open() is over)
 *       ctx.lookup                  node's dns.lookup giving only addresses the kernel may connect to
 *                                   (net/guard.js): pass it to net/tls connect
 *       ctx.check(values)           throws if the kernel may not connect there (for a name it resolves itself)
 *       ctx.tls(host, port)         { verify, pinned, ca?, cert?, key? }: what connectTo's tls wants (the
 *                                   fingerprint the user confirmed for that server, the request's files)
 *       ctx.signal                  aborted when the user closes the session while it connects
 *       ctx.connectTo               net/connect.js's connectTo, the same the kernel uses
 *   conn.send(msg)                  what the user sends: { type: 'text' | 'binary' | 'json', data, meta? }
 *   conn.command?(name, args) → result   anything else the protocol does (MQTT subscribe, gRPC end…)
 *   conn.info?                      shown in the session's bar
 *   conn.close()
 *   invoke?(values, input, ctx) → { messages, status, meta }   one call that is not a session (gRPC
 *                                   unary): also in collection runs
 *   describe?(values, ctx) → any    what the server says it offers (gRPC reflection)
 *
 * A message: { type: 'text' | 'binary' | 'json' | 'event' | 'info' | 'error', data: string (binary in
 * base64), meta?: { … } } (an SSE event's name and id, an MQTT topic, a gRPC status…).
 * Errors with a `net` field or KernelErrors say why in words; 'untrusted' carries details.trust.
 */
export const DRIVER_PREFIX = 'call.';
const MAX_SSE_LINE = 1 << 20;

const { t } = defineStrings('lilos:kernel.calls.drivers', { en: { strings: {
  port: 'Port not valid',
  url: 'Address not valid',
  closedBy: 'Closed by the server ({code})',
  closedByReason: 'Closed by the server ({code}: {reason})',
  closed: 'The connection is closed',
  unknownCommand: 'Unknown command',
  notStream: 'The server answered {status} instead of a stream of events',
  notStreamType: 'The server answered {status} ({type}) instead of a stream of events',
  lineTooLong: 'Line too long: dropped',
  eventTooLong: 'Event too long: dropped',
  streamEnded: 'The server closed the stream',
  receiveOnly: 'Server-Sent Events: receive only',
  noHost: 'The server is missing',
  ended: 'The server closed the connection',
  tooBig: 'Datagram too large (65507 bytes at most)',
} } });

const label = (en, it) => ({ en, it });
const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const port = v => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fail('invalid', t('port'));
};
const payload = msg => {
  if (msg?.type === 'binary') return Buffer.from(str(msg.data), 'base64');
  return Buffer.from(str(msg?.data), 'utf8');
};
const headerPairs = list => (Array.isArray(list) ? list : []).filter(h => h && h.enabled !== false && str(h.key).trim()).map(h => [str(h.key).trim(), str(h.value)]);
/** Bytes as the user sees them: text when they are UTF-8 and printable, otherwise binary. */
const asMessage = buf => {
  const text = buf.toString('utf8');
  return !text.includes('�') && !/[\0-\x08\x0e-\x1f]/.test(text) ? { type: 'text', data: text } : { type: 'binary', data: buf.toString('base64') };
};

const websocket = {
  label: label('WebSocket', 'WebSocket'),
  async open(values, ctx) {
    let url;
    try { url = new URL(str(values.url).trim()); } catch { fail('invalid', t('url')); }
    if (url.protocol === 'http:') url.protocol = 'ws:';
    if (url.protocol === 'https:') url.protocol = 'wss:';
    await ctx.check({ url: url.href.replace(/^ws/, 'http') });
    const secure = url.protocol === 'wss:';
    const { ws, response, tls } = await connectSocket(url, {
      headers: headerPairs(values.headers), protocols: str(values.protocols).split(',').map(p => p.trim()).filter(Boolean),
      lookup: ctx.lookup, signal: ctx.signal, tls: secure ? await ctx.tls(url.hostname, Number(url.port) || 443) : {},
    }).catch(err => {
      if (err?.response) ctx.output({ type: 'info', data: `${err.response.status}`, meta: { headers: err.response.headers } });
      throw err;
    });
    ws.on('message', (data, binary) => ctx.output(binary ? { type: 'binary', data: data.toString('base64') } : { type: 'text', data: data.toString('utf8') }));
    ws.on('pong', () => ctx.output({ type: 'info', data: 'pong' }));
    ws.on('close', ({ code, reason }) => ctx.closed({ reason: code === 1000 || code === 1005 ? '' : reason ? t('closedByReason', { code, reason }) : t('closedBy', { code }) }));
    return {
      info: { status: response.status, protocol: response.protocol, headers: response.headers, tls },
      send(msg) {
        if (!ws.open) fail('invalid', t('closed'));
        ws.send(msg.type === 'binary' ? payload(msg) : str(msg.data));
      },
      command(name) {
        if (name === 'ping') return ws.ping(Buffer.from('lilOS'));
        fail('invalid', t('unknownCommand'));
      },
      close: () => ws.close(1000, ''),
    };
  },
};

/** Server-Sent Events: a GET that stays open, its events one by one. */
const sse = {
  label: label('Server-Sent Events', 'Server-Sent Events'),
  async open(values, ctx) {
    let url;
    try { url = new URL(str(values.url).trim()); } catch { fail('invalid', t('url')); }
    await ctx.check({ url: url.href });
    const headers = headerPairs(values.headers);
    if (!findHeader(headers, 'accept')) headers.push(['Accept', 'text/event-stream']);
    if (!findHeader(headers, 'cache-control')) headers.push(['Cache-Control', 'no-cache']);
    if (!findHeader(headers, 'user-agent')) headers.push(['User-Agent', 'lilOS NetTest']);
    const abort = new AbortController();
    const res = await httpRequest(url, {
      method: 'GET', headers, lookup: ctx.lookup, signal: AbortSignal.any([ctx.signal, abort.signal]), timeoutMs: 24 * 3600_000,
      tls: url.protocol === 'https:' ? await ctx.tls(url.hostname, Number(url.port) || 443) : {},
    });
    const type = String(findHeader(res.headers, 'content-type') ?? '');
    if (res.status !== 200 || !/text\/event-stream/i.test(type)) {
      res.body.destroy();
      fail('invalid', type ? t('notStreamType', { status: res.status, type: type.split(';')[0] }) : t('notStream', { status: res.status }));
    }
    let buffer = '', event = {}, data = [], dataSize = 0;
    const dispatch = () => {
      if (data.length) ctx.output({ type: 'event', data: data.join('\n'), meta: { event: event.event || 'message', ...(event.id !== undefined && { id: event.id }) } });
      event = {};
      data = [];
      dataSize = 0;
    };
    res.body.setEncoding('utf8');
    res.body.on('data', chunk => {
      buffer += chunk;
      if (buffer.length > MAX_SSE_LINE && !buffer.includes('\n')) { buffer = ''; return ctx.output({ type: 'error', data: t('lineTooLong') }); }
      const lines = buffer.split(/\r\n|\r|\n/);
      buffer = lines.pop();
      for (const line of lines) {
        if (!line) { dispatch(); continue; }
        if (line.startsWith(':')) continue;
        const i = line.indexOf(':');
        const field = i < 0 ? line : line.slice(0, i);
        const value = i < 0 ? '' : line.slice(i + 1).replace(/^ /, '');
        if (field === 'data') {
          dataSize += value.length;
          if (dataSize > MAX_SSE_LINE) { data = []; dataSize = 0; ctx.output({ type: 'error', data: t('eventTooLong') }); continue; }
          data.push(value);
        }
        else if (field === 'event') event.event = value;
        else if (field === 'id') event.id = value;
        else if (field === 'retry') ctx.output({ type: 'info', data: `retry ${value} ms` });
      }
    });
    res.body.on('end', () => ctx.closed({ reason: t('streamEnded') }));
    res.body.on('error', err => ctx.closed({ reason: abort.signal.aborted ? '' : networkMessage(err) }));
    return {
      info: { status: res.status, headers: res.headers, tls: res.tls, httpVersion: res.httpVersion },
      send() { fail('invalid', t('receiveOnly')) },
      close() { abort.abort(); res.body.destroy(); },
    };
  },
};

function streamDriver(secure) {
  return {
    label: secure ? label('TLS', 'TLS') : label('TCP', 'TCP'),
    async open(values, ctx) {
      const host = str(values.host).trim() || fail('invalid', t('noHost'));
      const p = port(values.port);
      await ctx.check({ host });
      const { socket, tls } = await connectTo({
        host, port: p, secure, lookup: ctx.lookup, signal: ctx.signal,
        tls: secure ? { ...(await ctx.tls(host, p)), ...(str(values.servername) && { servername: str(values.servername) }) } : {},
        alpn: secure && str(values.alpn) ? str(values.alpn).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      });
      socket.on('data', buf => ctx.output(asMessage(buf)));
      socket.on('end', () => ctx.closed({ reason: t('ended') }));
      socket.on('close', () => ctx.closed({ reason: '' }));
      socket.on('error', err => ctx.closed({ reason: networkMessage(err) }));
      return {
        info: { remote: `${socket.remoteAddress}:${socket.remotePort}`, tls },
        send(msg) { socket.write(payload(msg)); },
        command(name) {
          if (name === 'end') return socket.end();   // half-close: no more from us, the server may still answer
          fail('invalid', t('unknownCommand'));
        },
        close: () => socket.destroy(),
      };
    },
  };
}

const udp = {
  label: label('UDP', 'UDP'),
  async open(values, ctx) {
    const host = str(values.host).trim() || fail('invalid', t('noHost'));
    const p = port(values.port);
    // The address is checked once (the guard's lookup) and then used as it is: no name to point elsewhere later
    const address = await new Promise((resolve, reject) => ctx.lookup(host, {}, (err, a) => (err ? reject(err) : resolve(a))));
    const socket = dgram.createSocket(isIP(address) === 6 ? 'udp6' : 'udp4');
    await new Promise((resolve, reject) => {
      socket.once('error', reject);
      socket.connect(p, address, () => { socket.off('error', reject); resolve(); });
    });
    socket.on('message', (buf, rinfo) => ctx.output({ ...asMessage(buf), meta: { from: `${rinfo.address}:${rinfo.port}`, size: rinfo.size } }));
    socket.on('error', err => ctx.output({ type: 'error', data: networkMessage(err) }));
    socket.on('close', () => ctx.closed({ reason: '' }));
    return {
      info: { remote: `${address}:${p}`, local: (() => { try { const a = socket.address(); return `${a.address}:${a.port}`; } catch { return null; } })() },
      send(msg) {
        const buf = payload(msg);
        if (buf.length > 65507) fail('too_large', t('tooBig'));
        socket.send(buf);
      },
      close: () => socket.close(),
    };
  },
};

export const BUILTIN = new Map([['ws', websocket], ['sse', sse], ['tcp', streamDriver(false)], ['tls', streamDriver(true)], ['udp', udp]]);

/** The protocols the kernel and its modules give: Map id → driver. Malformed ones are left out. */
export function findCallDrivers(services, log) {
  const drivers = new Map(BUILTIN);
  for (const [name, impl] of services) {
    if (!name.startsWith(DRIVER_PREFIX)) continue;
    const id = name.slice(DRIVER_PREFIX.length);
    try {
      if (!/^[a-z][a-z0-9-]{0,30}$/.test(id) || BUILTIN.has(id)) throw new Error('nome non valido');
      if (typeof impl?.open !== 'function' && typeof impl?.invoke !== 'function') throw new Error('mancano open() e invoke()');
      drivers.set(id, impl);
    } catch (err) {
      log.warn(`Protocollo di NetTest ${name} ignorato: ${err.message}`);
    }
  }
  return drivers;
}
