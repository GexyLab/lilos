/**
 * The format of an encrypted file, LILOS-ENC/1: bytes that describe themselves.
 *
 *   LILOS-ENC/1\n
 *   {"v":1,"alg":"AES-256-GCM","nonce":"…","recipients":[{"type":"password","kdf":{…},"salt":"…","nonce":"…","key":"…"}]}\n
 *   <the content, encrypted>
 *
 * The content is encrypted with a key of its own (random, one per file), with `alg` and `nonce`;
 * the two lines before it are its associated data: changing a byte of them makes it fail to open.
 * Each recipient is a way to get that key back: for now a password (the key encrypted with
 * AES-256-GCM under a key derived from the password with `kdf`). Certificates may come later as
 * other recipients, without another format.
 */
export const MAGIC = 'LILOS-ENC/1';
const MAX_HEADER = 16 << 10;
const MAX_RECIPIENTS = 4;
export const ALGORITHMS = ['AES-256-GCM', 'AES-128-GCM', 'ChaCha20-Poly1305'];
export const KDFS = ['argon2id', 'pbkdf2'];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function fromBase64(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new Error('bad base64');
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** The two lines before the content, as bytes (the associated data of the content). */
export function headerBytes(header) {
  return encoder.encode(`${MAGIC}\n${JSON.stringify(header)}\n`);
}

/** True if the bytes start like an encrypted file. */
export function looksEncrypted(bytes) {
  const head = encoder.encode(`${MAGIC}\n`);
  return bytes.length >= head.length && head.every((b, i) => bytes[i] === b);
}

/** { header, aad, body } of an encrypted file's bytes; throws if they are not one. */
export function parse(bytes) {
  if (!looksEncrypted(bytes)) throw new Error('not-encrypted');
  const start = MAGIC.length + 1;
  const end = bytes.indexOf(10, start);
  if (end < 0 || end - start > MAX_HEADER) throw new Error('bad-header');
  let header;
  try { header = JSON.parse(decoder.decode(bytes.subarray(start, end))); } catch { throw new Error('bad-header'); }
  if (!header || header.v !== 1 || !ALGORITHMS.includes(header.alg) || typeof header.nonce !== 'string' || !Array.isArray(header.recipients)) throw new Error('bad-header');
  // Each recipient costs a key derivation: a file must not ask for a hundred
  if (header.recipients.length < 1 || header.recipients.length > MAX_RECIPIENTS) throw new Error('bad-header');
  return { header, aad: bytes.subarray(0, end + 1), body: bytes.subarray(end + 1) };
}

/** The bytes of an encrypted file: its header, then the encrypted content. */
export function join(header, body) {
  const head = headerBytes(header);
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
}
