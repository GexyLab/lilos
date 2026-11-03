import { randomBytes } from 'node:crypto';
import { netError } from './lib/shared/errors.js';
import {
  Writer, Reader, packet, packetReader, reasonText,
  CONNECT, CONNACK, PUBLISH, PUBACK, PUBREC, PUBREL, PUBCOMP, SUBSCRIBE, SUBACK, UNSUBSCRIBE, UNSUBACK, PINGREQ, PINGRESP, DISCONNECT, AUTH,
} from './codec.js';

/**
 * MQTT for NetTest (service 'call.mqtt', see the kernel's calls/drivers.js): a live session with a
 * broker, MQTT 3.1.1 or 5.0, over TCP (mqtt://, port 1883) or TLS (mqtts://, 8883). The client is
 * this module's own (codec.js), on the kernel's socket (ctx.connectTo, through its guard).
 *
 *   values  { url, clientId?, username?, password?, version: '3.1.1' | '5', clean: true, keepalive: 60,
 *             sessionExpiry? (MQTT 5, seconds), will?: { topic, payload, qos, retain }, settings }
 *   conn.send({ type: 'text' | 'binary' | 'json', data, meta: { topic, qos, retain, properties? } })
 *       publishes; with QoS 1 and 2 it resolves when the broker has acknowledged it
 *   conn.command('subscribe', { topic, qos, noLocal?, retainAsPublished?, retainHandling? }) → { topic, qos: granted }
 *   conn.command('unsubscribe', { topic }) · conn.command('ping') → { ms }
 *   messages from the broker → ctx.output({ type: 'text' | 'binary', data, meta: { topic, qos, retain, dup?, properties? } })
 *   conn.info  { version, clientId, sessionPresent, subscriptions: [{ topic, qos }], keepalive, server? (MQTT 5: what CONNACK said), remote, tls }
 *
 * QoS 2 received: delivered once, when the PUBLISH comes (the same packet id again before its
 * PUBREL is a repeat: acknowledged, not shown again). The broker is told not to use topic aliases
 * (Topic Alias Maximum 0); MQTT 5's enhanced authentication (AUTH) is not supported.
 */
const MAX_PACKET = 16 << 20;
const ACK_TIMEOUT = 30_000;
const CONNECT_TIMEOUT = 30_000;

const label = (en, it) => ({ en, it });
const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const u16 = id => new Writer().u16(id).buffer();

/** Bytes as the user sees them: text when they are UTF-8 and printable, otherwise binary (base64). */
const asMessage = buf => {
  const text = buf.toString('utf8');
  return !text.includes('�') && !/[\0-\x08\x0e-\x1f]/.test(text) ? { type: 'text', data: text } : { type: 'binary', data: buf.toString('base64') };
};

const WORDS = {
  ECONNREFUSED: 'Connessione rifiutata', ECONNRESET: 'Connessione interrotta dal broker', EPIPE: 'Connessione chiusa', ETIMEDOUT: 'Tempo scaduto',
  EHOSTUNREACH: 'Server irraggiungibile', ENETUNREACH: 'Rete irraggiungibile',
};
const reasonOf = err => {
  if (err?.net || err?.constructor?.name === 'KernelError') return str(err.message);
  const code = str(err?.code);
  return WORDS[code] ? `${WORDS[code]} (${code})` : str(err?.message ?? err).slice(0, 200) || 'Errore di rete';
};

/** 'mqtt://host:1883', 'mqtts://host:8883' ('tcp://', 'ssl://', 'tls://' too, or host:port) → { host, port, secure, username, password }. */
function targetOf(url) {
  let text = str(url).trim();
  if (!text) throw netError('invalid', 'Manca l\'indirizzo del broker');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `mqtt://${text}`;
  let u;
  try { u = new URL(text); } catch { throw netError('invalid', 'Indirizzo non valido'); }
  const scheme = u.protocol.slice(0, -1).toLowerCase();
  if (scheme === 'ws' || scheme === 'wss') throw netError('unsupported', 'MQTT su WebSocket non è supportato: usa mqtt:// o mqtts://');
  if (!['mqtt', 'mqtts', 'tcp', 'ssl', 'tls'].includes(scheme)) throw netError('invalid', `Schema non supportato: ${scheme} (usa mqtt:// o mqtts://)`);
  const secure = ['mqtts', 'ssl', 'tls'].includes(scheme);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!host) throw netError('invalid', 'Manca il broker');
  const decode = s => { try { return decodeURIComponent(s); } catch { return s; } };
  return { host, port: u.port ? Number(u.port) : secure ? 8883 : 1883, secure, username: decode(u.username), password: decode(u.password) };
}

const qosOf = (v, what = 'QoS') => {
  const n = v === undefined || v === null || v === '' ? 0 : Number(v);
  if (![0, 1, 2].includes(n)) throw netError('invalid', `${what} non valida: 0, 1 o 2`);
  return n;
};

/** The user properties of MQTT 5 as { key: value } or [[key, value]] → [[key, value]]. */
const pairsOf = v => (Array.isArray(v) ? v.filter(p => Array.isArray(p) && p.length >= 2).map(([k, x]) => [str(k), str(x)]) : v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => [k, str(x)]) : undefined);

const driver = {
  label: label('MQTT', 'MQTT'),

  async open(values, ctx) {
    if (typeof ctx?.connectTo !== 'function' || typeof ctx.lookup !== 'function') throw netError('unsupported', 'Questo modulo richiede una versione di lilOS con NetTest: aggiorna lilOS');
    const target = targetOf(values.url);
    const v5 = ['5', '5.0'].includes(str(values.version).trim());
    const keepalive = values.keepalive === undefined || values.keepalive === '' ? 60 : Number(values.keepalive);
    if (!Number.isInteger(keepalive) || keepalive < 0 || keepalive > 65535) throw netError('invalid', 'Keep alive non valido: da 0 a 65535 secondi');
    const username = str(values.username) || target.username;
    const password = str(values.password) || target.password;
    if (password && !username && !v5) throw netError('invalid', 'In MQTT 3.1.1 la password richiede anche il nome utente');
    const will = values.will && str(values.will.topic) ? { topic: str(values.will.topic), payload: str(values.will.payload), qos: qosOf(values.will.qos, 'QoS del testamento'), retain: !!values.will.retain } : null;
    const options = {
      v5, keepalive, username, password, will, clean: values.clean !== false,
      clientId: str(values.clientId).trim() || `nettest-${randomBytes(6).toString('hex')}`,
      sessionExpiry: values.sessionExpiry === undefined || values.sessionExpiry === '' ? null : Number(values.sessionExpiry),
      timeoutMs: Number(values.settings?.timeoutMs) > 0 ? Math.min(Number(values.settings.timeoutMs), 120_000) : CONNECT_TIMEOUT,
    };
    await ctx.check({ host: target.host });
    const { socket, tls } = await ctx.connectTo({
      host: target.host, port: target.port, secure: target.secure, lookup: ctx.lookup, signal: ctx.signal, timeoutMs: options.timeoutMs,
      tls: target.secure ? await ctx.tls(target.host, target.port) : {},
    });
    return session(socket, options, ctx, { remote: `${socket.remoteAddress}:${socket.remotePort}`, tls });
  },
};

/** The CONNECT packet. */
function connectPacket(o) {
  let flags = o.clean ? 0x02 : 0;
  if (o.will) flags |= 0x04 | (o.will.qos << 3) | (o.will.retain ? 0x20 : 0);
  if (o.password) flags |= 0x40;
  if (o.username) flags |= 0x80;
  const w = new Writer().str('MQTT').byte(o.v5 ? 5 : 4).byte(flags).u16(o.keepalive);
  if (o.v5) {
    // A session kept after the connection only when asked for (clean false: an hour unless said)
    const expiry = Number.isInteger(o.sessionExpiry) && o.sessionExpiry >= 0 ? o.sessionExpiry : o.clean ? 0 : 3600;
    w.props({ sessionExpiryInterval: expiry || undefined, maximumPacketSize: MAX_PACKET, topicAliasMaximum: 0 });
  }
  w.str(o.clientId);
  if (o.will) {
    if (o.v5) w.props({});
    w.str(o.will.topic).bin(Buffer.from(o.will.payload, 'utf8'));
  }
  if (o.username) w.str(o.username);
  if (o.password) w.bin(Buffer.from(o.password, 'utf8'));
  return packet(CONNECT, 0, w.buffer());
}

async function session(socket, o, ctx, { remote, tls }) {
  const v5 = o.v5;
  let connected = false, over = false, closing = false;
  let keepalive = o.keepalive, lastSent = Date.now(), timer = null, ping = null, nextId = 0;
  const waiting = new Map();     // packet id → { expect, resolve, reject, timer }
  const inbound = new Set();     // QoS 2 packet ids received, until their PUBREL
  const aliases = new Map();     // MQTT 5 topic aliases (the broker should not use them: we said 0)
  const info = { version: v5 ? '5' : '3.1.1', clientId: o.clientId, sessionPresent: false, subscriptions: [], keepalive, remote, tls };
  let connack;
  const ready = new Promise((resolve, reject) => { connack = { resolve, reject }; });

  const write = buf => {
    if (over || socket.destroyed) throw netError('lost', 'La connessione è chiusa');
    socket.write(buf);
    lastSent = Date.now();
  };

  /** The connection is over: before CONNACK open() fails with `err`, after it the session closes with its words. */
  const finish = (err, graceful = false) => {
    if (over) return;
    over = true;
    clearInterval(timer);
    const reason = err ? reasonOf(err) : '';
    for (const w of waiting.values()) { clearTimeout(w.timer); w.reject(err ?? netError('lost', 'Connessione chiusa')); }
    waiting.clear();
    for (const p of ping?.waiters ?? []) p.reject(err ?? netError('lost', 'Connessione chiusa'));
    if (graceful) socket.end(); else socket.destroy();
    if (!connected) connack.reject(err ?? netError('lost', 'Il broker ha chiuso la connessione'));
    else ctx.closed({ reason: closing ? '' : reason });
  };

  /** Waits for the broker's answer to packet `id`. */
  const expect = (id, type) => new Promise((resolve, reject) => {
    const entry = { expect: type, resolve, reject, timer: null };
    const arm = () => {
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => { waiting.delete(id); reject(netError('unreachable', 'Il broker non ha risposto in tempo')); }, ACK_TIMEOUT);
    };
    entry.arm = arm;
    arm();
    waiting.set(id, entry);
  });
  const newId = () => {
    for (let i = 0; i < 65535; i++) {
      nextId = (nextId % 65535) + 1;
      if (!waiting.has(nextId)) return nextId;
    }
    throw netError('rate_limited', 'Troppi messaggi in attesa di risposta');
  };
  const answered = (id, type) => {
    const entry = waiting.get(id);
    if (!entry || entry.expect !== type) return null;
    return entry;
  };
  const settle = (entry, id, code, props, ok) => {
    clearTimeout(entry.timer);
    waiting.delete(id);
    if (code >= 0x80) entry.reject(netError('denied', `${reasonText(code)}${props?.reasonString ? `: ${props.reasonString}` : ''}`));
    else entry.resolve(ok);
  };

  const onPacket = ({ type, flags, body }) => {
    const r = new Reader(body);
    if (!connected && type !== CONNACK) throw netError('invalid', 'Il broker non ha risposto con CONNACK: è un broker MQTT?');
    switch (type) {
      case CONNACK: {
        if (connected) throw netError('invalid', 'CONNACK ripetuto dal broker');
        const ackFlags = r.byte(), code = r.byte();
        const props = v5 && r.left ? r.props() : {};
        if (code !== 0) {
          const auth = v5 ? [0x86, 0x87, 0x8c].includes(code) : [4, 5].includes(code);
          const err = netError(auth ? 'auth' : 'denied', `Il broker ha rifiutato la connessione: ${reasonText(code, v5)}${props.reasonString ? ` – ${props.reasonString}` : ''}`);
          return finish(err);
        }
        connected = true;
        info.sessionPresent = !!(ackFlags & 1);
        if (props.assignedClientIdentifier) info.clientId = props.assignedClientIdentifier;
        if (props.serverKeepAlive !== undefined) info.keepalive = keepalive = props.serverKeepAlive;
        if (v5) info.server = props;
        startKeepalive();
        return connack.resolve();
      }
      case PUBLISH: {
        const qos = (flags >> 1) & 3, retain = !!(flags & 1), dup = !!(flags & 8);
        if (qos === 3) throw netError('invalid', 'PUBLISH con QoS 3 dal broker');
        let topic = r.str();
        const id = qos ? r.u16() : 0;
        const props = v5 ? r.props() : null;
        if (props?.topicAlias) {
          if (topic) aliases.set(props.topicAlias, topic);
          else topic = aliases.get(props.topicAlias) ?? '';
        }
        const payload = r.rest();
        if (qos === 2) {
          if (inbound.has(id)) return write(packet(PUBREC, 0, u16(id)));   // a repeat: already shown
          inbound.add(id);
        }
        ctx.output({ ...asMessage(payload), meta: { topic, qos, retain, ...(dup && { dup }), ...(props && Object.keys(props).length && { properties: props }) } });
        if (qos === 1) write(packet(PUBACK, 0, u16(id)));
        else if (qos === 2) write(packet(PUBREC, 0, u16(id)));
        return;
      }
      case PUBACK:
      case PUBCOMP: {
        const id = r.u16();
        const code = v5 && r.left ? r.byte() : 0;
        const props = v5 && r.left ? r.props() : null;
        const entry = answered(id, type);
        if (entry) settle(entry, id, code, props, { code });
        return;
      }
      case PUBREC: {
        const id = r.u16();
        const code = v5 && r.left ? r.byte() : 0;
        const props = v5 && r.left ? r.props() : null;
        const entry = answered(id, PUBREC);
        if (!entry) {
          // Not ours (any more): MQTT 5 says so, 3.1.1 just goes on
          return write(packet(PUBREL, 2, v5 ? new Writer().u16(id).byte(0x92).buffer() : u16(id)));
        }
        if (code >= 0x80) return settle(entry, id, code, props);
        entry.expect = PUBCOMP;
        entry.arm();
        return write(packet(PUBREL, 2, u16(id)));
      }
      case PUBREL: {
        const id = r.u16();
        inbound.delete(id);
        return write(packet(PUBCOMP, 0, u16(id)));
      }
      case SUBACK:
      case UNSUBACK: {
        const id = r.u16();
        const props = v5 && r.left ? r.props() : null;
        const codes = [...r.rest()];
        const entry = answered(id, type);
        if (entry) { clearTimeout(entry.timer); waiting.delete(id); entry.resolve({ codes, props }); }
        return;
      }
      case PINGRESP: {
        const p = ping;
        ping = null;
        for (const w of p?.waiters ?? []) w.resolve({ ms: Date.now() - p.at });
        return;
      }
      case DISCONNECT: {
        const code = r.left ? r.byte() : 0;
        const props = v5 && r.left ? r.props() : {};
        const more = [props.reasonString, props.serverReference && `server: ${props.serverReference}`].filter(Boolean).join(', ');
        return finish(netError('lost', `Il broker ha chiuso la sessione: ${reasonText(code)}${more ? ` (${more})` : ''}`));
      }
      case AUTH:
        throw netError('unsupported', 'Il broker chiede l\'autenticazione estesa di MQTT 5 (AUTH): non è supportata');
      default:
        throw netError('invalid', `Pacchetto MQTT di tipo ${type} inatteso dal broker`);
    }
  };

  const sendPing = () => {
    ping ??= { at: Date.now(), waiters: [] };
    write(packet(PINGREQ, 0));
    return ping;
  };
  function startKeepalive() {
    if (!keepalive) return;
    const every = keepalive * 1000;
    timer = setInterval(() => {
      if (over) return;
      // No answer to the last ping for a whole keep alive: the broker is gone
      if (ping && Date.now() - ping.at > every) return finish(netError('lost', 'Il broker non risponde (keep alive scaduto)'));
      if (!ping && Date.now() - lastSent >= every * 0.75) {
        try { sendPing(); } catch { /* closing */ }
      }
    }, Math.max(500, Math.min(every / 4, 15_000)));
    timer.unref?.();
  }

  const read = packetReader(p => onPacket(p), MAX_PACKET);
  socket.on('data', chunk => {
    if (over) return;
    try { read(chunk); } catch (err) { finish(err); }
  });
  socket.on('error', err => finish(err));
  const gone = () => finish(netError('lost', connected ? 'Il broker ha chiuso la connessione' : 'Il server ha chiuso la connessione senza rispondere con CONNACK: è un broker MQTT?'));
  socket.on('end', gone);
  socket.on('close', gone);

  // CONNECT, then CONNACK within the time allowed
  const onAbort = () => finish(Object.assign(new Error('Annullato'), { name: 'AbortError', code: 'ABORT_ERR' }));
  ctx.signal?.addEventListener('abort', onAbort, { once: true });
  const wait = setTimeout(() => finish(netError('unreachable', 'Il broker non ha risposto alla connessione (CONNACK)')), o.timeoutMs);
  try {
    write(connectPacket(o));
    await ready;
  } finally {
    clearTimeout(wait);
    ctx.signal?.removeEventListener('abort', onAbort);
  }

  return {
    info,

    async send(msg) {
      const meta = msg?.meta && typeof msg.meta === 'object' ? msg.meta : {};
      const topic = str(meta.topic);
      if (!topic) throw netError('invalid', 'Manca l\'argomento (topic) del messaggio');
      if (/[+#\0]/.test(topic)) throw netError('invalid', 'L\'argomento di un messaggio non può contenere + # (sono per le iscrizioni)');
      const qos = qosOf(meta.qos);
      if (v5 && info.server?.maximumQoS !== undefined && qos > info.server.maximumQoS) throw netError('invalid', `Il broker accetta al massimo QoS ${info.server.maximumQoS}`);
      const retain = meta.retain === true || meta.retain === 'true';
      if (retain && v5 && info.server?.retainAvailable === 0) throw netError('invalid', 'Il broker non conserva i messaggi (retain)');
      const payload = msg.type === 'binary' ? Buffer.from(str(msg.data), 'base64') : Buffer.from(str(msg.data), 'utf8');
      const id = qos ? newId() : 0;
      const w = new Writer().str(topic);
      if (qos) w.u16(id);
      if (v5) {
        const p = meta.properties && typeof meta.properties === 'object' ? meta.properties : {};
        w.props({
          payloadFormatIndicator: p.payloadFormatIndicator === undefined ? undefined : Number(p.payloadFormatIndicator) ? 1 : 0,
          messageExpiryInterval: Number(p.messageExpiryInterval) > 0 ? Number(p.messageExpiryInterval) : undefined,
          contentType: str(p.contentType) || undefined, responseTopic: str(p.responseTopic) || undefined,
          correlationData: str(p.correlationData) || undefined, userProperties: pairsOf(p.userProperties),
        });
      }
      w.raw(payload);
      const max = info.server?.maximumPacketSize;
      if (max && w.buffer().length + 5 > max) throw netError('too_large', `Messaggio troppo grande per il broker (al massimo ${max} byte)`);
      // The answer cannot come before this turn is over: waited for after the write
      write(packet(PUBLISH, (qos << 1) | (retain ? 1 : 0), w.buffer()));
      if (qos) await expect(id, qos === 1 ? PUBACK : PUBREC);
    },

    async command(name, args) {
      const a = args && typeof args === 'object' ? args : {};
      if (name === 'subscribe') {
        const topic = str(a.topic);
        if (!topic) throw netError('invalid', 'Manca l\'argomento (topic) da seguire');
        const qos = qosOf(a.qos);
        const id = newId();
        const w = new Writer().u16(id);
        if (v5) w.props({});
        const options = qos | (v5 ? (a.noLocal ? 4 : 0) | (a.retainAsPublished ? 8 : 0) | ((Number(a.retainHandling) & 3) << 4) : 0);
        w.str(topic).byte(options);
        write(packet(SUBSCRIBE, 2, w.buffer()));
        const { codes, props } = await expect(id, SUBACK);
        const code = codes[0] ?? 0x80;
        if (code >= 0x80) throw netError('denied', `Iscrizione a ${topic} rifiutata: ${v5 ? reasonText(code) : 'il broker non la permette'}${props?.reasonString ? ` (${props.reasonString})` : ''}`);
        info.subscriptions = [...info.subscriptions.filter(s => s.topic !== topic), { topic, qos: code }];
        return { topic, qos: code };
      }
      if (name === 'unsubscribe') {
        const topic = str(a.topic);
        if (!topic) throw netError('invalid', 'Manca l\'argomento (topic)');
        const id = newId();
        const w = new Writer().u16(id);
        if (v5) w.props({});
        w.str(topic);
        write(packet(UNSUBSCRIBE, 2, w.buffer()));
        const { codes, props } = await expect(id, UNSUBACK);
        const code = codes[0] ?? 0;
        if (v5 && code >= 0x80) throw netError('denied', `Disiscrizione da ${topic} rifiutata: ${reasonText(code)}${props?.reasonString ? ` (${props.reasonString})` : ''}`);
        info.subscriptions = info.subscriptions.filter(s => s.topic !== topic);
        return { topic };
      }
      if (name === 'ping') {
        const p = sendPing();
        return new Promise((resolve, reject) => p.waiters.push({ resolve, reject }));
      }
      throw netError('invalid', 'Comando sconosciuto');
    },

    close() {
      if (over) return;
      closing = true;
      try { write(packet(DISCONNECT, 0)); } catch { /* already gone */ }
      finish(null, true);
    },
  };
}

export default {
  async init(ctx) {
    ctx.provide('call.mqtt', driver);
  },
};
