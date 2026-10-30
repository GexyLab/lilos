import { apps as installed } from '@lilos/sdk';

/**
 * The code of installed apps, checked before it runs: each file against the hash in its
 * manifest, each library against its SRI hash (cached ones from /system/commons, the others
 * downloaded from their address).
 */
async function digest(algo, text) {
  const bytes = new Uint8Array(await crypto.subtle.digest(algo, new TextEncoder().encode(text)));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export const sha256 = async text => `sha256-${await digest('SHA-256', text)}`;

/** True if `text` matches `integrity` ('sha384-…'). */
export async function sri(text, integrity) {
  const algo = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' }[integrity.slice(0, 6)];
  return !!algo && integrity.slice(7) === await digest(algo, text);
}

/** The text of one of the app's files, if it is the one its manifest lists. */
export async function appCode(pkg, file) {
  const code = await installed.file(pkg.id, file);
  if (await sha256(code) !== pkg.manifest.files?.[file]) throw new Error(`Il codice di ${pkg.manifest.name} non corrisponde al manifesto`);
  return code;
}

/** The text of a library of the manifest, checked. */
export async function libraryCode(lib) {
  let text;
  if (lib.cache) {
    text = await installed.library(lib.name, lib.version);
  } else {
    const res = await fetch(lib.url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`La libreria ${lib.name} non si scarica (${res.status})`);
    text = await res.text();
  }
  if (!await sri(text, lib.integrity)) throw new Error(`La libreria ${lib.name} non corrisponde al suo hash`);
  return text;
}

/** Every library of the manifest, checked, in order. */
export const librariesCode = manifest => Promise.all((manifest.libraries ?? []).map(libraryCode));

export const escapeAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Inline code must not close its <script> early
export const inline = code => code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

/** The origins of the app's 'net:' permissions (its connect-src in a sandbox). */
export const netOrigins = manifest => (manifest.permissions ?? []).filter(p => p.startsWith('net:')).map(p => p.slice(4));

/** The entry points of an app: { name: { kind, file?, label?, window? } }; `main` is always there. */
export function entrypoints(manifest) {
  const declared = manifest?.entrypoints && typeof manifest.entrypoints === 'object' ? manifest.entrypoints : {};
  return { main: { kind: 'window' }, ...declared };
}
