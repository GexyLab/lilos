/**
 * XDR (RFC 4506): what ONC RPC and NFS write on the wire. The reader checks every length against
 * what is left and against a limit: what a server sends is not trusted.
 */
export class XdrError extends Error {}

export class Reader {
  #buf; #at = 0;

  constructor(buf) {
    this.#buf = buf;
  }

  get left() { return this.#buf.length - this.#at; }

  #need(n) {
    if (n < 0 || this.#at + n > this.#buf.length) throw new XdrError('Risposta del server troncata');
  }

  uint() {
    this.#need(4);
    const v = this.#buf.readUInt32BE(this.#at);
    this.#at += 4;
    return v;
  }

  int() {
    this.#need(4);
    const v = this.#buf.readInt32BE(this.#at);
    this.#at += 4;
    return v;
  }

  /** A 64-bit unsigned number, as a Number (sizes and offsets past 2^53 are refused). */
  uhyper() {
    const hi = this.uint(), lo = this.uint();
    const v = hi * 2 ** 32 + lo;
    if (!Number.isSafeInteger(v)) throw new XdrError('Numero troppo grande dal server');
    return v;
  }

  /** A 64-bit value kept as its 8 bytes (cookies, file ids). */
  hyperBytes() {
    return this.fixed(8);
  }

  bool() {
    const v = this.uint();
    if (v > 1) throw new XdrError('Valore booleano non valido dal server');
    return v === 1;
  }

  fixed(n) {
    this.#need(n);
    const v = this.#buf.subarray(this.#at, this.#at + n);
    this.#at += n + ((4 - (n % 4)) % 4);
    if (this.#at > this.#buf.length) throw new XdrError('Risposta del server troncata');
    return Buffer.from(v);
  }

  opaque(max) {
    const n = this.uint();
    if (n > max) throw new XdrError('Dato troppo lungo dal server');
    return this.fixed(n);
  }

  string(max) {
    return this.opaque(max).toString('utf8');
  }
}

export class Writer {
  #parts = [];

  uint(v) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(v >>> 0);
    this.#parts.push(b);
    return this;
  }

  int(v) {
    const b = Buffer.alloc(4);
    b.writeInt32BE(v | 0);
    this.#parts.push(b);
    return this;
  }

  uints(list) {
    for (const v of list) this.uint(v);
    return this;
  }

  uhyper(v) {
    if (!Number.isSafeInteger(v) || v < 0) throw new XdrError('Numero non valido');
    return this.uint(Math.floor(v / 2 ** 32)).uint(v % 2 ** 32);
  }

  bool(v) {
    return this.uint(v ? 1 : 0);
  }

  fixed(buf) {
    this.#parts.push(buf);
    const pad = (4 - (buf.length % 4)) % 4;
    if (pad) this.#parts.push(Buffer.alloc(pad));
    return this;
  }

  opaque(buf) {
    return this.uint(buf.length).fixed(buf);
  }

  string(s) {
    return this.opaque(Buffer.from(s, 'utf8'));
  }

  done() {
    return Buffer.concat(this.#parts);
  }
}
