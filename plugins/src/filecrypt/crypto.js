import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { parse, join, headerBytes, toBase64, fromBase64, ALGORITHMS, KDFS } from './format.js';

/**
 * The cryptography of FileCrypt, all in the app (lilOS and its kernel never see a password, a key
 * or a content in clear, except what an app opens):
 *   content   AES-256-GCM, AES-128-GCM (Web Crypto) or ChaCha20-Poly1305 (@noble/ciphers, in the
 *             app's code), with a random key of each file and a new nonce at every save
 *   password  Argon2id (hash-wasm, a library of the manifest: the global `hashwasm`) or PBKDF2-SHA256
 *             (Web Crypto): the key it gives encrypts the file's key (AES-256-GCM)
 * A file's state while it is unlocked: { alg, key, recipients }; saving it again needs no password.
 */
const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();
const WRAP_AAD = encoder.encode('LILOS-ENC/1 key');

export const KDF_DEFAULTS = {
  argon2id: { name: 'argon2id', m: 65536, t: 3, p: 1 },          // 64 MiB, 3 passes
  pbkdf2: { name: 'pbkdf2', hash: 'SHA-256', iterations: 600_000 },
};

/** Parameters read from a file (untrusted): within bounds, or an error (a file must not hang the app). */
function checkKdf(kdf) {
  if (kdf?.name === 'argon2id') {
    const ok = [kdf.m, kdf.t, kdf.p].every(Number.isInteger) && kdf.m >= 8192 && kdf.m <= 262_144 && kdf.t >= 1 && kdf.t <= 10 && kdf.p >= 1 && kdf.p <= 4;
    if (ok) return kdf;
  } else if (kdf?.name === 'pbkdf2') {
    if (kdf.hash === 'SHA-256' && Number.isInteger(kdf.iterations) && kdf.iterations >= 100_000 && kdf.iterations <= 10_000_000) return kdf;
  }
  throw new Error('bad-header');
}

export const random = n => globalThis.crypto.getRandomValues(new Uint8Array(n));

/** The same password typed on any keyboard gives the same bytes. */
export const normalize = password => String(password).normalize('NFC');

/** How much work a derivation asks (Argon2id: KiB × passes); one unlock may spend at most WORK. */
const cost = kdf => (kdf.name === 'argon2id' ? kdf.m * kdf.t * kdf.p : kdf.iterations / 10);
const WORK = 1_600_000;
export const keyLength = alg => (alg === 'AES-128-GCM' ? 16 : 32);

/** The key a password gives, with a recipient's salt and parameters: 32 bytes. */
async function derive(password, salt, kdf) {
  if (kdf.name === 'argon2id') {
    const lib = globalThis.hashwasm;
    if (!lib?.argon2id) throw new Error('no-argon2');
    return lib.argon2id({ password, salt, parallelism: kdf.p, iterations: kdf.t, memorySize: kdf.m, hashLength: 32, outputType: 'binary' });
  }
  const base = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: kdf.iterations }, base, 256));
}

async function aes(op, key, nonce, data, aad) {
  const k = await subtle.importKey('raw', key, 'AES-GCM', false, [op]);
  const params = { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 };
  return new Uint8Array(await (op === 'encrypt' ? subtle.encrypt(params, k, data) : subtle.decrypt(params, k, data)));
}

async function seal(alg, key, nonce, data, aad) {
  if (alg === 'ChaCha20-Poly1305') return chacha20poly1305(key, nonce, aad).encrypt(data);
  return aes('encrypt', key, nonce, data, aad);
}

/** Decrypts; any failure (wrong key, changed bytes) is 'wrong'. */
async function open(alg, key, nonce, data, aad) {
  try {
    if (alg === 'ChaCha20-Poly1305') return chacha20poly1305(key, nonce, aad).decrypt(data);
    return await aes('decrypt', key, nonce, data, aad);
  } catch {
    throw new Error('wrong');
  }
}

/** A password recipient for a file's key. */
async function passwordRecipient(key, password, kdfName) {
  const kdf = KDF_DEFAULTS[kdfName] ?? KDF_DEFAULTS.argon2id;
  const salt = random(16);
  const nonce = random(12);
  const kek = await derive(normalize(password), salt, kdf);
  const wrapped = await aes('encrypt', kek, nonce, key, WRAP_AAD);
  return { type: 'password', kdf, salt: toBase64(salt), nonce: toBase64(nonce), key: toBase64(wrapped) };
}

/** The file's bytes, encrypted again with its state (a new nonce, the same key and recipients). */
export async function reseal(plain, state) {
  const nonce = random(12);
  const header = { v: 1, alg: state.alg, nonce: toBase64(nonce), recipients: state.recipients };
  return join(header, await seal(state.alg, state.key, nonce, plain, headerBytes(header)));
}

/** A content encrypted for the first time: { bytes, state }. */
export async function encrypt(plain, { password, alg = 'AES-256-GCM', kdf = 'argon2id' }) {
  if (!ALGORITHMS.includes(alg) || !KDFS.includes(kdf)) throw new Error('bad-options');
  const key = random(keyLength(alg));
  const state = { alg, key, recipients: [await passwordRecipient(key, password, kdf)] };
  return { bytes: await reseal(plain, state), state };
}

/**
 * An encrypted file opened with a password: { plain, state }. 'wrong' if the password is not its;
 * 'corrupt' if it is, but the content was changed or damaged.
 */
export async function unlock(bytes, password) {
  const { header, aad, body } = parse(bytes);
  let budget = WORK;
  for (const r of header.recipients) {
    if (r?.type !== 'password') continue;
    const kdf = checkKdf(r.kdf);
    if ((budget -= cost(kdf)) < 0) throw new Error('bad-header');
    const kek = await derive(normalize(password), fromBase64(r.salt), kdf);
    let key;
    try { key = await open('AES-256-GCM', kek, fromBase64(r.nonce), fromBase64(r.key), WRAP_AAD); } catch { continue; }
    if (key.length !== keyLength(header.alg)) throw new Error('bad-header');
    // The key came out: the password is right, a failure now is a changed file
    let plain;
    try { plain = await open(header.alg, key, fromBase64(header.nonce), body, aad); } catch { throw new Error('corrupt'); }
    return { plain, state: { alg: header.alg, key, recipients: header.recipients } };
  }
  throw new Error('wrong');
}

/** An encrypted file read again while it is unlocked: its content in clear. */
export async function decrypt(bytes, state) {
  const { header, aad, body } = parse(bytes);
  if (header.alg !== state.alg) throw new Error('wrong');
  return open(header.alg, state.key, fromBase64(header.nonce), body, aad);
}

/** How strong a password looks: 0 (too weak) … 4 (strong). Not a promise: a hint. */
export function strength(password) {
  const p = String(password);
  if (p.length < 8) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(p)).length;
  const unique = new Set(p).size;
  let score = p.length >= 16 ? 3 : p.length >= 12 ? 2 : 1;
  if (classes >= 3) score++;
  if (unique < p.length / 3) score--;
  return Math.max(1, Math.min(4, score));
}
