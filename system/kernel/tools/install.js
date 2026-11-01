import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Installs lilOS from a release (the folder system/lilos of the official repository, or a copy of it):
 *   node system/kernel/tools/install.js <folder> [--from <kernel folder>]
 * run from that release. <folder> gets run.js, package.json, current.json and the release in
 * releases/<version> (see src/apps/systemPackage.js), and the data:
 *   --from <folder>   config.json, repos.json and modules/ (with their data, such as the users) of
 *                     a copy of the repository (its system/kernel) or of another installed lilOS:
 *                     the same database, so the same users and files
 *   otherwise         the configuration of the release, and its modules from the official repository
 * Then lilOS starts with: cd <folder> && node run.js (later versions come from the AppStore).
 */
const RELEASE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const exists = path => stat(path).then(() => true, () => false);
const sha256 = data => `sha256-${createHash('sha256').update(data).digest('base64')}`;

try {
  const from = flag('--from');
  const [target] = args;
  if (!target) throw new Error('Uso: node system/kernel/tools/install.js <cartella> [--from <cartella del kernel>]');
  const root = resolve(target);
  if (await exists(join(root, 'current.json'))) throw new Error(`In ${root} lilOS è già installato: le nuove versioni si installano dall'AppStore`);
  // config.js reads where the data are when it is imported: before any import of the kernel
  process.env.LILOS_DATA_DIR = root;
  const { checkSystem } = await import('../src/apps/systemPackage.js');
  const manifest = checkSystem(JSON.parse(await readFile(join(RELEASE, 'system.json'), 'utf8')));
  const major = Number(process.versions.node.split('.')[0]);
  if (major < manifest.node) throw new Error(`lilOS ${manifest.version} richiede Node.js ${manifest.node} o successivo (qui c'è il ${major})`);

  console.log(`lilOS ${manifest.version} → ${root}`);
  const dest = join(root, 'releases', manifest.version);
  for (const [path, hash] of Object.entries(manifest.files)) {
    const data = await readFile(join(RELEASE, ...path.split('/')));
    if (sha256(data) !== hash) throw new Error(`${path}: il contenuto non corrisponde a system.json`);
    await mkdir(dirname(join(dest, ...path.split('/'))), { recursive: true });
    await writeFile(join(dest, ...path.split('/')), data);
  }
  for (const file of ['system.json', 'README.md', 'CHANGELOG.md']) {
    if (await exists(join(RELEASE, file))) await cp(join(RELEASE, file), join(dest, file));
  }
  await cp(join(RELEASE, 'system', 'kernel', 'run.js'), join(root, 'run.js'));
  if (!await exists(join(root, 'package.json'))) {
    await writeFile(join(root, 'package.json'), `${JSON.stringify({ name: 'lilos-installed', private: true, type: 'module', scripts: { start: 'node run.js' } }, null, 2)}\n`);
  }

  const { installDependencies, writeModule, checkModule, adoptModule } = await import('../src/apps/modulePackage.js');
  const { Repos } = await import('../src/apps/repos.js');
  const { openSource } = await import('../src/apps/sources.js');
  const official = () => new Repos({ allowLocalSources: false }).catalog('official');
  if (from) {
    const source = resolve(from);
    if (!await exists(join(source, 'config.json'))) throw new Error(`In ${source} non c'è config.json`);
    for (const file of ['config.json', 'repos.json']) if (await exists(join(source, file))) await cp(join(source, file), join(root, file));
    // Without node_modules: installed again here, from each module's lockfile
    await cp(join(source, 'modules'), join(root, 'modules'), { recursive: true, filter: path => !/[\\/]node_modules([\\/]|$)/.test(path) });
    // Modules put in by hand that are the official ones become official: the AppStore updates them
    let catalog = null;
    for (const dir of await readdir(join(root, 'modules')).catch(() => [])) {
      console.log(`  modulo ${dir}`);
      const path = join(root, 'modules', dir);
      const [name, version] = dir.split('_');
      if (!await exists(join(path, 'source.json'))) {
        try {
          catalog ??= await official();
          const entry = catalog.modules.find(m => m.module?.name === name && m.module.version === version);
          const opened = entry && await openSource({ type: 'git', url: catalog.repo.url, ref: catalog.ref, path: entry.path });
          if (opened && await adoptModule(opened, checkModule(JSON.parse((await opened.read('module.json')).toString('utf8'))), path)) continue;
          console.log('    installato a mano: non è quello del repository ufficiale, non si aggiornerà dall\'AppStore');
        } catch (err) {
          console.log(`    installato a mano (repository ufficiale non raggiungibile: ${err.message})`);
        }
      }
      await installDependencies(path);
    }
  } else {
    if (!await exists(join(root, 'config.json'))) await cp(join(dest, 'system', 'kernel', 'config.json'), join(root, 'config.json'));
    const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
    const catalog = await official();
    for (const want of config.modules ?? []) {
      const entry = catalog.modules.find(m => m.module?.name === want.name) ?? null;
      if (!entry) throw new Error(`Il modulo ${want.name} non è nel repository ufficiale`);
      const opened = await openSource({ type: 'git', url: catalog.repo.url, ref: catalog.ref, path: entry.path });
      const module = checkModule(JSON.parse((await opened.read('module.json')).toString('utf8')));
      console.log(`  modulo ${module.name} ${module.version}`);
      await writeModule(opened, module, join(root, 'modules', `${module.name}_${module.version}`));
      want.version = module.version;
    }
    await writeFile(join(root, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  }

  await writeFile(join(root, 'current.json'), JSON.stringify({ version: manifest.version, previous: null }, null, 2));
  console.log(`Fatto. Avvia lilOS con: cd "${root}" && node run.js`);
  if (!from) console.log(`Un amministratore si crea con: node releases/${manifest.version}/system/kernel/cli.js users-basic add <nome> --admin`);
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
