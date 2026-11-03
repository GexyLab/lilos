import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSTALL_FILE, checkInstallSettings, readInstallSettings } from '../src/installSettings.js';

/**
 * Installs lilOS from a release (the folder system/lilos of the official repository, or a copy of it):
 *   node system/kernel/tools/install.js [<folder>] [--settings <file>] [--from <kernel folder>]
 * run from that release. <folder> gets run.js, package.json, current.json and the release in
 * releases/<version> (see src/apps/systemPackage.js), and the data:
 *   --settings <file> the installation settings (src/installSettings.js): the folder when <folder>
 *                     is not given, which lilOS and which modules (the carried ones or the newest of
 *                     the official repository) or a system image instead, the kernel's configuration,
 *                     the repositories; the apps, users and settings of the first start go to the
 *                     kernel in <folder>. Without it, the release's tools/lilos-install.json
 *   --from <folder>   config.json, repos.json and modules/ (with their data, such as the users) of
 *                     a copy of the repository (its system/kernel) or of another installed lilOS:
 *                     the same database, so the same users and files
 *   otherwise         the configuration of the release, and its modules from the official repository
 * Then lilOS starts with: cd <folder> && node run.js (later versions come from the AppStore).
 */
const RELEASE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DEFAULT_SETTINGS = join(RELEASE, 'system', 'kernel', 'tools', INSTALL_FILE);
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const exists = path => stat(path).then(() => true, () => false);
const sha256 = data => `sha256-${createHash('sha256').update(data).digest('base64')}`;
const noNodeModules = path => !/[\\/]node_modules([\\/]|$)/.test(path);
const temps = [];

/** Extracts a .zip, .tar.gz, .tgz or .tar with the system's tar (on Windows its bsdtar, which reads zip too). */
async function extract(file) {
  const into = await mkdtemp(join(tmpdir(), 'lilos-image-'));
  temps.push(into);
  const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', file, '-C', into], { stdio: 'inherit' });
  return into;
}

/** The folder of a system image (a folder, an archive, an address of an archive) and its image.json. */
async function openImage(where) {
  let path = where;
  if (/^https?:\/\//i.test(where)) {
    console.log(`Scarico l'immagine ${where}…`);
    const res = await fetch(where, { redirect: 'follow' });
    if (!res.ok) throw new Error(`${where}: ${res.status} ${res.statusText}`);
    const dir = await mkdtemp(join(tmpdir(), 'lilos-download-'));
    temps.push(dir);
    path = join(dir, basename(new URL(where).pathname) || 'image.tar.gz');
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  const info = await stat(path).catch(() => null);
  if (!info) throw new Error(`L'immagine ${path} non esiste`);
  let dir = info.isDirectory() ? path : await extract(path);
  // An archive of the folder, not of its contents: image.json one level down
  if (!await exists(join(dir, 'image.json'))) {
    const inner = await readdir(dir);
    if (inner.length === 1 && await exists(join(dir, inner[0], 'image.json'))) dir = join(dir, inner[0]);
  }
  const { readImage } = await import('../src/image.js');
  return { dir, info: await readImage(dir) };
}

try {
  const from = flag('--from');
  const settingsFile = flag('--settings') ?? (await exists(DEFAULT_SETTINGS) ? DEFAULT_SETTINGS : null);
  const settings = settingsFile ? await readInstallSettings(settingsFile) : checkInstallSettings({});
  const [target] = args;
  if (!target && !settings.installer.dir) throw new Error('Uso: node system/kernel/tools/install.js [<cartella>] [--settings <file>] [--from <cartella del kernel>]');
  const root = resolve(target ?? settings.installer.dir);
  if (await exists(join(root, 'current.json'))) throw new Error(`In ${root} lilOS è già installato: le nuove versioni si installano dall'AppStore`);
  if (from && settings.image) throw new Error('--from e "image" insieme non si possono usare: scegli da dove viene lilOS');
  // config.js reads where the data are when it is imported: before any import of the kernel
  process.env.LILOS_DATA_DIR = root;
  const { checkSystem } = await import('../src/apps/systemPackage.js');
  const { compareVersions } = await import('../src/apps/manifest.js');
  const { IMAGE_DIR } = await import('../src/image.js');
  const major = Number(process.versions.node.split('.')[0]);
  const checkNode = m => { if (major < m.node) throw new Error(`lilOS ${m.version} richiede Node.js ${m.node} o successivo (qui c'è il ${major})`); };
  const carried = checkSystem(JSON.parse(await readFile(join(RELEASE, 'system.json'), 'utf8')));
  if (settingsFile) console.log(`Impostazioni di installazione: ${settingsFile}`);

  const { installDependencies, writeModule, checkModule, adoptModule } = await import('../src/apps/modulePackage.js');
  const { Repos } = await import('../src/apps/repos.js');
  const { openSource, normalizeUrl } = await import('../src/apps/sources.js');
  let catalog = null;
  const official = async () => (catalog ??= await new Repos({ allowLocalSources: false }).catalog('official'));

  /** A module folder already in modules/: official when it is the official one (the AppStore updates it), then its dependencies. */
  async function adopt(dir) {
    const path = join(root, 'modules', dir);
    const [name, version] = dir.split('_');
    if (!await exists(join(path, 'source.json'))) {
      try {
        const cat = await official();
        const entry = cat.modules.find(m => m.module?.name === name && m.module.version === version);
        const opened = entry && await openSource({ type: 'git', url: cat.repo.url, ref: cat.ref, path: entry.path });
        if (opened && await adoptModule(opened, checkModule(JSON.parse((await opened.read('module.json')).toString('utf8'))), path)) return;
        console.log('    installato a mano: non è quello del repository ufficiale, non si aggiornerà dall\'AppStore');
      } catch (err) {
        console.log(`    installato a mano (repository ufficiale non raggiungibile: ${err.message})`);
      }
    }
    await installDependencies(path);
  }

  /** The newest version of a module from the official repository, into modules/: its version. */
  async function serverModule(name) {
    const cat = await official();
    const entry = cat.modules.find(m => m.module?.name === name) ?? null;
    if (!entry) throw new Error(`Il modulo ${name} non è nel repository ufficiale`);
    const opened = await openSource({ type: 'git', url: cat.repo.url, ref: cat.ref, path: entry.path });
    const module = checkModule(JSON.parse((await opened.read('module.json')).toString('utf8')));
    console.log(`  modulo ${module.name} ${module.version}`);
    await writeModule(opened, module, join(root, 'modules', `${module.name}_${module.version}`));
    return module.version;
  }

  /** A release (its system.json `files`, read by `read`) into releases/<version>. */
  async function writeRelease(manifest, read, extra = {}) {
    const at = join(root, 'releases', manifest.version);
    for (const [path, hash] of Object.entries(manifest.files)) {
      const data = await read(path);
      if (sha256(data) !== hash) throw new Error(`${path}: il contenuto non corrisponde a system.json`);
      await mkdir(dirname(join(at, ...path.split('/'))), { recursive: true });
      await writeFile(join(at, ...path.split('/')), data);
    }
    for (const file of ['README.md', 'CHANGELOG.md']) {
      const data = await read(file).catch(() => null);
      if (data) await writeFile(join(at, file), data);
    }
    await writeFile(join(at, 'system.json'), JSON.stringify({ ...manifest, ...extra }, null, 2));
    return at;
  }

  let version, previous = null;
  if (settings.image) {
    // A system image: lilOS as it was set up elsewhere, instead of the carried release
    const image = await openImage(settings.image);
    const current = JSON.parse(await readFile(join(image.dir, 'lilos', 'current.json'), 'utf8'));
    version = String(current.version);
    checkNode(checkSystem(JSON.parse(await readFile(join(image.dir, 'lilos', 'releases', version, 'system.json'), 'utf8'))));
    console.log(`Immagine «${image.info.name}» (lilOS ${version}) → ${root}`);
    await cp(join(image.dir, 'lilos'), root, { recursive: true, filter: noNodeModules });
    if (current.previous && await exists(join(root, 'releases', current.previous, 'system.json'))) previous = current.previous;
    // run.js of the version that runs (the one in the image may be older)
    await cp(join(root, 'releases', version, 'system', 'kernel', 'run.js'), join(root, 'run.js'));
    for (const dir of await readdir(join(root, 'modules')).catch(() => [])) {
      console.log(`  modulo ${dir}`);
      await adopt(dir);
    }
    // The file system (apps, homes): the kernel loads it at its first start (src/image.js)
    await cp(join(image.dir, 'fs'), join(root, IMAGE_DIR, 'fs'), { recursive: true });
    // New users start as in the image's system, with the settings' own on top
    if (image.info.settings && typeof image.info.settings === 'object') settings.settings = { ...image.info.settings, ...settings.settings };
  } else {
    console.log(`lilOS ${carried.version} → ${root}`);
    checkNode(carried);
    await writeRelease(carried, path => readFile(join(RELEASE, ...path.split('/'))));
    await cp(join(RELEASE, 'system.json'), join(root, 'releases', carried.version, 'system.json'));
    await cp(join(RELEASE, 'system', 'kernel', 'run.js'), join(root, 'run.js'));
    version = carried.version;
    if (settings.lilos.source === 'server' && !from) {
      // The newest lilOS of the official repository next to the carried one, which stays to go back to
      const cat = await official();
      const newest = cat.system?.system;
      if (!newest) throw new Error(`Il repository ufficiale non ha versioni di lilOS${cat.system?.error ? ` (${cat.system.error})` : ''}`);
      if (compareVersions(newest.version, carried.version) > 0) {
        const { read, source } = await openSource({ type: 'git', url: cat.repo.url, ref: cat.ref, path: cat.system.path });
        const server = checkSystem(JSON.parse((await read('system.json')).toString('utf8')));
        checkNode(server);
        console.log(`lilOS ${server.version} dal repository ufficiale (la ${carried.version} resta per tornare indietro)`);
        const at = await writeRelease(server, read, { source });
        await cp(join(at, 'system', 'kernel', 'run.js'), join(root, 'run.js'));
        previous = version;
        version = server.version;
      } else {
        console.log(`lilOS ${carried.version} è già la versione più recente del repository ufficiale`);
      }
    }
  }
  if (!await exists(join(root, 'package.json'))) {
    await writeFile(join(root, 'package.json'), `${JSON.stringify({ name: 'lilos-installed', private: true, type: 'module', scripts: { start: 'node run.js' } }, null, 2)}\n`);
  }
  const releaseDir = join(root, 'releases', version);

  if (from) {
    const source = resolve(from);
    if (!await exists(join(source, 'config.json'))) throw new Error(`In ${source} non c'è config.json`);
    for (const file of ['config.json', 'repos.json']) if (await exists(join(source, file))) await cp(join(source, file), join(root, file));
    // Without node_modules: installed again here, from each module's lockfile
    await cp(join(source, 'modules'), join(root, 'modules'), { recursive: true, filter: noNodeModules });
    // Modules put in by hand that are the official ones become official: the AppStore updates them
    for (const dir of await readdir(join(root, 'modules')).catch(() => [])) {
      console.log(`  modulo ${dir}`);
      await adopt(dir);
    }
    if (settingsFile) console.log('  con --from configurazione, moduli e repository sono quelli copiati: delle impostazioni valgono app, utenti e impostazioni');
  } else {
    if (!await exists(join(root, 'config.json'))) await cp(join(releaseDir, 'system', 'kernel', 'config.json'), join(root, 'config.json'));
    const config = JSON.parse(await readFile(join(root, 'config.json'), 'utf8'));
    Object.assign(config, settings.kernel);
    if (settings.image) {
      // The image's modules stay; the settings change their configuration and add the missing ones
      const have = new Map((config.modules ?? []).map(m => [m.name, m]));
      for (const want of settings.modules.list ?? []) {
        const mod = have.get(want.name);
        if (mod) mod.config = { ...mod.config, ...want.config };
        else (config.modules ??= []).push({ name: want.name, version: await serverModule(want.name), config: want.config ?? {} });
      }
      if (config.modules?.some(m => m.name === 'fs-postgres') && !settings.modules.config['fs-postgres']?.url && !settings.modules.list?.some(m => m.name === 'fs-postgres' && m.config?.url)) {
        console.log('  attenzione: fs-postgres usa il database scritto nell\'immagine: dai il tuo in modules.config["fs-postgres"].url');
      }
    } else {
      const defaults = new Map((config.modules ?? []).map(m => [m.name, m]));
      const wanted = settings.modules.list
        ? settings.modules.list.map(m => ({ name: m.name, source: m.source, config: { ...defaults.get(m.name)?.config, ...m.config } }))
        : (config.modules ?? []).map(m => ({ ...m, source: settings.modules.source }));
      const inRelease = await readdir(join(releaseDir, 'system', 'kernel', 'modules')).catch(() => []);
      const modules = [];
      for (const want of wanted) {
        const local = want.source === 'local' && inRelease.filter(d => d.startsWith(`${want.name}_`)).sort((a, b) => compareVersions(a.split('_')[1], b.split('_')[1])).at(-1);
        if (local) {
          console.log(`  modulo ${local} (portato dalla release)`);
          await cp(join(releaseDir, 'system', 'kernel', 'modules', local), join(root, 'modules', local), { recursive: true });
          await adopt(local);
          modules.push({ name: want.name, version: local.split('_')[1], config: want.config ?? {} });
          continue;
        }
        if (want.source === 'local') console.log(`  ${want.name}: la release non lo porta, lo prendo dal repository ufficiale`);
        modules.push({ name: want.name, version: await serverModule(want.name), config: want.config ?? {} });
      }
      config.modules = modules;
    }
    for (const mod of config.modules ?? []) if (settings.modules.config[mod.name]) mod.config = { ...mod.config, ...settings.modules.config[mod.name] };
    // The official apps of the first start: the kernel installs them (kernel.js bootstrapApps), the others too (lilos-install.json)
    if (settings.apps) config.apps = { ...config.apps, bootstrap: settings.apps.filter(a => !a.repo).map(a => a.id) };
    await writeFile(join(root, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);

    const repos = new Repos({ allowLocalSources: false });
    const known = new Set((await repos.list()).map(r => normalizeUrl(r.url)));
    for (const repo of settings.repos) {
      if (known.has(normalizeUrl(repo.url))) continue;
      const added = await repos.add({ kind: 'kernel' }, { url: repo.url, ...(repo.name && { name: repo.name }) });
      console.log(`  repository ${added.name} (${added.url})`);
    }
  }

  // What the kernel does at its first start: users, apps, settings (it removes the passwords afterwards)
  await writeFile(join(root, INSTALL_FILE), `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
  await writeFile(join(root, 'current.json'), JSON.stringify({ version, previous }, null, 2));
  console.log(`Fatto. Avvia lilOS con: cd "${root}" && node run.js`);
  if (!from && !settings.image && !settings.users.some(u => u.role === 'admin' && u.password)) {
    console.log(`Un amministratore si crea con: node releases/${version}/system/kernel/cli.js users-basic add <nome> --admin`);
  }
  for (const dir of temps) await rm(dir, { recursive: true, force: true }).catch(() => {});
  process.exit(0);
} catch (err) {
  for (const dir of temps) await rm(dir, { recursive: true, force: true }).catch(() => {});
  console.error(err.message);
  process.exit(1);
}
