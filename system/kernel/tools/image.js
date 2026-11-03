import { cp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { INSTALL_DIR, MODULES_DATA_DIR, MODULES_DIR, loadConfig } from '../src/config.js';
import { exportFs, writeImageInfo } from '../src/image.js';
import { resolveModules, startModule } from '../src/modules.js';

/**
 * Makes a system image of this installed lilOS (src/image.js), to install it ready, with its
 * configuration, modules, apps, users and files, elsewhere (lilos-install.json "image"):
 *   node releases/<version>/system/kernel/tools/image.js <out folder> [--name "…"] [--description "…"]
 * run with lilOS stopped. The users' sessions stay out (who installs the image signs in again);
 * the database is not copied: the file system goes into the image through the fs service.
 */
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const exists = path => stat(path).then(() => true, () => false);
const SKIP = new Set(['node_modules', '.image']);
// The installation's own: its settings, and the database and logs the program lilOS keeps there
const TOP_SKIP = new Set(['lilos-install.json', 'postgres', 'logs']);
const LOCAL_USER = { id: 'local', username: 'utente', name: 'Utente', role: 'admin' };

try {
  const name = flag('--name');
  const description = flag('--description');
  const [target] = args;
  if (!target) throw new Error('Uso: node releases/<versione>/system/kernel/tools/image.js <cartella> [--name "…"] [--description "…"]');
  if (!INSTALL_DIR) throw new Error('Un\'immagine si fa da un lilOS installato (con tools/install.js), non da una copia del repository');
  const out = resolve(target);
  if ((await readdir(out).catch(() => [])).length) throw new Error(`${out} non è vuota`);
  const config = await loadConfig();
  const running = await fetch(`http://127.0.0.1:${config.port}/api/session`, { signal: AbortSignal.timeout(1500) }).then(r => r.ok, () => false);
  if (running) throw new Error(`lilOS risponde sulla porta ${config.port}: fermalo prima di fare l'immagine`);
  const { version } = JSON.parse(await readFile(join(INSTALL_DIR, 'current.json'), 'utf8'));

  // The fs and users services, with the modules they need (as cli.js)
  const all = await resolveModules(MODULES_DIR, config.modules);
  const needed = new Set(all.filter(m => m.provides.includes('fs') || m.provides.includes('users')).map(m => m.name));
  for (const mod of [...all].reverse()) {
    if (!needed.has(mod.name)) continue;
    for (const s of mod.requires) needed.add(all.find(m => m.provides.includes(s)).name);
  }
  const services = new Map();
  const started = [];
  const host = { route() {}, socket() {}, emit() {}, dataDir: MODULES_DATA_DIR };
  for (const mod of all.filter(m => needed.has(m.name))) started.push(await startModule(mod, services, host));
  if (!services.has('fs')) throw new Error('Nessun modulo fornisce il servizio "fs"');
  const users = services.has('users') ? await services.get('users').list() : [LOCAL_USER];

  console.log(`Immagine di lilOS ${version} → ${out}`);
  console.log('  file system: app, librerie e home degli utenti…');
  const count = await exportFs(services.get('fs'), users, out);
  for (const mod of started.reverse()) await mod.impl.stop?.();

  console.log('  cartella installata: versioni, configurazione, moduli e loro dati…');
  await cp(INSTALL_DIR, join(out, 'lilos'), {
    recursive: true,
    filter: path => {
      const parts = relative(INSTALL_DIR, path).split(/[\\/]/);
      return !parts.some(part => SKIP.has(part)) && !TOP_SKIP.has(parts[0]) && !path.endsWith('.tmp');
    },
  });
  // Sessions are keys to sign in: never in an image (users-basic keeps them in users.json)
  for (const dir of await readdir(join(out, 'lilos', 'modules')).catch(() => [])) {
    const file = join(out, 'lilos', 'modules', dir, 'users.json');
    if (!await exists(file)) continue;
    const data = JSON.parse(await readFile(file, 'utf8'));
    for (const u of data.users ?? []) u.sessions = [];
    await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
  }
  // The starting settings of new users go with the image (lilos-install.json stays out: it is this installation's)
  const install = JSON.parse(await readFile(join(INSTALL_DIR, 'lilos-install.json'), 'utf8').catch(() => '{}'));
  await writeImageInfo(out, {
    name: name ?? `lilOS ${version}`, description: description ?? '', lilos: version,
    created: new Date().toISOString(), users: users.length, ...count,
    settings: install.settings && typeof install.settings === 'object' && !Array.isArray(install.settings) ? install.settings : {},
  });
  console.log(`Fatto: ${count.nodes} elementi, ${count.files} file (${Math.round(count.bytes / 1024)} KB), ${users.length} utenti`);
  console.log('Si installa con "image": "<questa cartella, o un suo .zip / .tar.gz>" in lilos-install.json');
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
