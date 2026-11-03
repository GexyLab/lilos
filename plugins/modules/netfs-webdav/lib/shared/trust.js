// Copy of modules/_shared/trust.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import { createHash } from 'node:crypto';

/**
 * What a server shows to be trusted, as the kernel passes it to the user to confirm (`trust` of an
 * 'untrusted' error, or ctx.confirm of the terminals): { kind: 'tls' | 'ssh', fingerprint, text }.
 * The text is the server's: only printable ASCII, short, with the fingerprint.
 */
const printable = (s, max) => String(s).replace(/[^\x20-\x7e]/g, '').slice(0, max);

/** The certificate of a TLS socket: its SHA-256 fingerprint ('AB:CD:…') and 'name · fingerprint'. */
export function certificateOf(socket, host = '') {
  const cert = socket.getPeerCertificate?.() ?? {};
  const fingerprint = cert.fingerprint256 ?? '';
  const cn = Array.isArray(cert.subject?.CN) ? cert.subject.CN[0] : cert.subject?.CN;
  return { kind: 'tls', fingerprint, text: `${printable(cn || host, 80)} · ${fingerprint}` };
}

/** 'ssh-ed25519' from a host key as the server sends it (a length-prefixed name first). */
function keyType(key) {
  try { return key.subarray(4, 4 + key.readUInt32BE(0)).toString('ascii'); } catch { return 'ssh'; }
}

/** An SSH host key (the raw blob): 'SHA256:…' as OpenSSH writes it, and 'ssh-ed25519 SHA256:…'. */
export function sshKeyOf(key) {
  const fingerprint = `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}`;
  return { kind: 'ssh', fingerprint, text: printable(`${keyType(key)} ${fingerprint}`, 120) };
}
