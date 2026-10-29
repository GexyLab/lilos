import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createPrivateKey, generateKeyPairSync, sign, createPublicKey } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { canonical, checkManifest, sha256 } from '../src/apps/manifest.js';

/**
 * For whoever makes an app package:
 *   node system/kernel/tools/pack.js <folder> [--sign key.pem]
 *       lists every file of the folder in lilos.json "files" with its hash (lilos.json and
 *       dot-files excluded), then checks the manifest; with --sign also signs it (publisher.key
 *       and signature are written).
 *   node system/kernel/tools/pack.js --keygen key.pem
 *       makes an Ed25519 key: keep the .pem secret; the public key printed goes in the kernel's
 *       configuration (apps.trustedPublishers) of whoever trusts the publisher.
 */
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const rawPublic = key => `ed25519:${createPublicKey(key).export({ format: 'der', type: 'spki' }).subarray(12).toString('base64')}`;

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(full, base));
    else if (e.isFile()) out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

try {
  if (flag('--keygen')) {
    const { privateKey } = generateKeyPairSync('ed25519');
    await writeFile(flag('--keygen'), privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
    console.log(`Chiave privata: ${flag('--keygen')}\nChiave pubblica: ${rawPublic(privateKey)}`);
    process.exit(0);
  }
  const dir = args[0];
  if (!dir) throw new Error('Uso: node system/kernel/tools/pack.js <cartella> [--sign key.pem] | --keygen key.pem');
  const manifest = JSON.parse(await readFile(join(dir, 'lilos.json'), 'utf8'));
  manifest.files = {};
  for (const path of (await walk(dir)).filter(p => p !== 'lilos.json').sort()) manifest.files[path] = sha256(await readFile(join(dir, path)));
  delete manifest.signature;
  if (flag('--sign')) {
    const key = createPrivateKey(await readFile(flag('--sign'), 'utf8'));
    manifest.publisher = { ...manifest.publisher, key: rawPublic(key) };
    manifest.signature = `ed25519:${sign(null, Buffer.from(canonical(manifest)), key).toString('base64')}`;
  }
  checkManifest(manifest);
  await writeFile(join(dir, 'lilos.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${manifest.id} ${manifest.version}: ${Object.keys(manifest.files).length} file${manifest.signature ? ', firmato' : ''}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
