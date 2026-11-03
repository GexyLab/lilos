import { netError } from './lib/shared/errors.js';

/**
 * MQTT packets (3.1.1 and 5.0), bytes both ways. A packet: a fixed header (type in the high
 * nibble, flags in the low one, then the remaining length as a variable byte integer) and its
 * body. Strings and binary data are prefixed by their length (2 bytes); MQTT 5 adds properties
 * (a variable byte length, then id + value pairs) after the variable header of most packets.
 */
export const CONNECT = 1, CONNACK = 2, PUBLISH = 3, PUBACK = 4, PUBREC = 5, PUBREL = 6, PUBCOMP = 7;
export const SUBSCRIBE = 8, SUBACK = 9, UNSUBSCRIBE = 10, UNSUBACK = 11, PINGREQ = 12, PINGRESP = 13, DISCONNECT = 14, AUTH = 15;
const MAX_VARINT = 268_435_455;

// The properties of MQTT 5: id → [name, kind]
const PROPS = {
  0x01: ['payloadFormatIndicator', 'byte'], 0x02: ['messageExpiryInterval', 'u32'], 0x03: ['contentType', 'str'],
  0x08: ['responseTopic', 'str'], 0x09: ['correlationData', 'bin'], 0x0b: ['subscriptionIdentifier', 'varint'],
  0x11: ['sessionExpiryInterval', 'u32'], 0x12: ['assignedClientIdentifier', 'str'], 0x13: ['serverKeepAlive', 'u16'],
  0x15: ['authenticationMethod', 'str'], 0x16: ['authenticationData', 'bin'], 0x17: ['requestProblemInformation', 'byte'],
  0x18: ['willDelayInterval', 'u32'], 0x19: ['requestResponseInformation', 'byte'], 0x1a: ['responseInformation', 'str'],
  0x1c: ['serverReference', 'str'], 0x1f: ['reasonString', 'str'], 0x21: ['receiveMaximum', 'u16'], 0x22: ['topicAliasMaximum', 'u16'],
  0x23: ['topicAlias', 'u16'], 0x24: ['maximumQoS', 'byte'], 0x25: ['retainAvailable', 'byte'], 0x26: ['userProperties', 'pair'],
  0x27: ['maximumPacketSize', 'u32'], 0x28: ['wildcardSubscriptionAvailable', 'byte'], 0x29: ['subscriptionIdentifierAvailable', 'byte'],
  0x2a: ['sharedSubscriptionAvailable', 'byte'],
};
const PROP_IDS = Object.fromEntries(Object.entries(PROPS).map(([id, [name, kind]]) => [name, [Number(id), kind]]));

const malformed = what => netError('invalid', `Pacchetto MQTT non valido dal broker (${what})`);

/** A packet's body, written field by field. */
export class Writer {
  #parts = [];

  byte(n) { this.#parts.push(Buffer.from([n & 0xff])); return this; }
  u16(n) { const b = Buffer.alloc(2); b.writeUInt16BE(n); this.#parts.push(b); return this; }
  u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); this.#parts.push(b); return this; }
  varint(n) { this.#parts.push(varint(n)); return this; }
  raw(buf) { this.#parts.push(buf); return this; }
  str(s) { return this.bin(Buffer.from(String(s), 'utf8')); }
  bin(buf) {
    if (buf.length > 0xffff) throw netError('invalid', 'Testo troppo lungo per MQTT (al massimo 65535 byte)');
    return this.u16(buf.length).raw(buf);
  }

  /** MQTT 5 properties: { name: value } as PROPS names them (userProperties: [[key, value]]). */
  props(props = {}) {
    const w = new Writer();
    for (const [name, value] of Object.entries(props)) {
      if (value === undefined || value === null) continue;
      const [id, kind] = PROP_IDS[name] ?? [];
      if (!id) continue;
      if (kind === 'pair') {
        for (const [k, v] of value) w.byte(id).str(k).str(v);
        continue;
      }
      w.byte(id);
      if (kind === 'byte') w.byte(value);
      else if (kind === 'u16') w.u16(value);
      else if (kind === 'u32') w.u32(value);
      else if (kind === 'varint') w.varint(value);
      else if (kind === 'str') w.str(value);
      else w.bin(Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8'));
    }
    const body = w.buffer();
    return this.varint(body.length).raw(body);
  }

  buffer() { return Buffer.concat(this.#parts); }
}

export function varint(n) {
  if (!Number.isInteger(n) || n < 0 || n > MAX_VARINT) throw netError('invalid', 'Pacchetto MQTT troppo grande');
  const out = [];
  do {
    let b = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) b |= 128;
    out.push(b);
  } while (n > 0);
  return Buffer.from(out);
}

/** A whole packet: fixed header and body. */
export const packet = (type, flags, body = Buffer.alloc(0)) => Buffer.concat([Buffer.from([(type << 4) | flags]), varint(body.length), body]);

/** A packet's body, read field by field: a short one throws (malformed). */
export class Reader {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }

  get left() { return this.buf.length - this.pos; }
  #need(n, what) { if (this.left < n) throw malformed(what); }
  byte() { this.#need(1, 'byte'); return this.buf[this.pos++]; }
  u16() { this.#need(2, 'u16'); const v = this.buf.readUInt16BE(this.pos); this.pos += 2; return v; }
  u32() { this.#need(4, 'u32'); const v = this.buf.readUInt32BE(this.pos); this.pos += 4; return v; }
  varint() {
    let n = 0, mul = 1;
    for (let i = 0; i < 4; i++) {
      const b = this.byte();
      n += (b & 127) * mul;
      if (!(b & 128)) return n;
      mul *= 128;
    }
    throw malformed('lunghezza');
  }
  bin() { const n = this.u16(); this.#need(n, 'dati'); const v = this.buf.subarray(this.pos, this.pos + n); this.pos += n; return v; }
  str() { return this.bin().toString('utf8'); }
  rest() { const v = this.buf.subarray(this.pos); this.pos = this.buf.length; return v; }

  /** MQTT 5 properties → { name: value } (userProperties: [[key, value]], binary data in base64). */
  props() {
    const end = this.varint() + this.pos;
    if (end > this.buf.length) throw malformed('proprietà');
    const out = {};
    while (this.pos < end) {
      const id = this.varint();
      const [name, kind] = PROPS[id] ?? [];
      if (!name) throw malformed(`proprietà ${id}`);
      if (kind === 'pair') { (out.userProperties ??= []).push([this.str(), this.str()]); continue; }
      const value = kind === 'byte' ? this.byte() : kind === 'u16' ? this.u16() : kind === 'u32' ? this.u32() : kind === 'varint' ? this.varint() : kind === 'str' ? this.str() : this.bin().toString('base64');
      if (name === 'subscriptionIdentifier') (out.subscriptionIdentifiers ??= []).push(value);
      else out[name] = value;
    }
    return out;
  }
}

/**
 * Packets out of the bytes of the connection: push(chunk) calls onPacket({ type, flags, body })
 * for each whole one. A packet bigger than `max` throws (the connection is closed by the caller).
 */
export function packetReader(onPacket, max) {
  let chunks = [], size = 0, need = 2;
  return chunk => {
    chunks.push(chunk);
    size += chunk.length;
    if (size < need) return;
    let buf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, size);
    need = 2;
    while (buf.length >= 2) {
      // The remaining length: 1 to 4 bytes after the first
      let length = 0, mul = 1, i = 1, complete = false;
      for (; i < 5 && i < buf.length; i++) {
        length += (buf[i] & 127) * mul;
        mul *= 128;
        if (!(buf[i] & 128)) { complete = true; i++; break; }
      }
      if (!complete) {
        if (i >= 5) throw malformed('lunghezza');
        need = buf.length + 1;
        break;
      }
      if (length > max) throw netError('too_large', `Pacchetto troppo grande dal broker (${length} byte, al massimo ${max})`);
      if (buf.length < i + length) { need = i + length; break; }
      onPacket({ type: buf[0] >> 4, flags: buf[0] & 15, body: buf.subarray(i, i + length) });
      buf = buf.subarray(i + length);
    }
    chunks = buf.length ? [buf] : [];
    size = buf.length;
  };
}

// Return codes of CONNACK in 3.1.1
const CONNACK_V3 = {
  1: 'Versione del protocollo non accettata dal broker', 2: 'Identificativo del client rifiutato', 3: 'Servizio MQTT non disponibile',
  4: 'Nome utente o password errati', 5: 'Non autorizzato',
};

// Reason codes of MQTT 5 (CONNACK, PUBACK…, SUBACK, UNSUBACK, DISCONNECT)
const REASONS = {
  0x04: 'Disconnessione con messaggio di ultima volontà', 0x10: 'Nessun iscritto per questo argomento', 0x11: 'Nessuna iscrizione esistente',
  0x18: 'Continua l\'autenticazione', 0x19: 'Nuova autenticazione',
  0x80: 'Errore non specificato', 0x81: 'Pacchetto malformato', 0x82: 'Errore di protocollo', 0x83: 'Errore specifico del broker',
  0x84: 'Versione del protocollo non supportata', 0x85: 'Identificativo del client non valido', 0x86: 'Nome utente o password errati',
  0x87: 'Non autorizzato', 0x88: 'Server non disponibile', 0x89: 'Server occupato', 0x8a: 'Client bandito', 0x8b: 'Il server si sta spegnendo',
  0x8c: 'Metodo di autenticazione errato', 0x8d: 'Keep alive scaduto', 0x8e: 'Sessione presa da un altro client', 0x8f: 'Filtro dell\'argomento non valido',
  0x90: 'Nome dell\'argomento non valido', 0x91: 'Identificativo di pacchetto in uso', 0x92: 'Identificativo di pacchetto sconosciuto',
  0x93: 'Superato il massimo di messaggi in attesa', 0x94: 'Alias dell\'argomento non valido', 0x95: 'Pacchetto troppo grande',
  0x96: 'Troppi messaggi', 0x97: 'Quota superata', 0x98: 'Azione amministrativa', 0x99: 'Formato del contenuto non valido',
  0x9a: 'Messaggi conservati (retain) non supportati', 0x9b: 'QoS non supportata', 0x9c: 'Usa un altro server', 0x9d: 'Server spostato',
  0x9e: 'Iscrizioni condivise non supportate', 0x9f: 'Troppe connessioni', 0xa0: 'Tempo massimo di connessione superato',
  0xa1: 'Identificativi di iscrizione non supportati', 0xa2: 'Iscrizioni con caratteri jolly non supportate',
};

/** A reason code in words: '…' (0x87). */
export const reasonText = (code, v5 = true) => `${(v5 ? REASONS[code] : CONNACK_V3[code]) ?? 'Errore'} (${v5 ? `0x${code.toString(16).padStart(2, '0')}` : code})`;
