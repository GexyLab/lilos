/**
 * Builds the packages of the official apps and kernel modules into build/ (not committed: the
 * official repository gets them with `npm run publish:repo`, see scripts/publish.mjs).
 *
 * Apps: build/apps/<id>/ with lilos.json (from src/<id>/app.json) holding the hash of every built
 * file, dist/, locales.json and README.md (src/<id>/README.md, what the AppStore shows). Vite puts
 * each app in one minified dist/index.js; only what the app loads when needed (workers, wasm, the
 * Editor's grammars) stays apart.
 * The translations (src/<id>/locales.json, see lilOS's SDK i18n.js) go to locales.json, named by
 * `locales` in the manifest; the build stops if a language lacks keys of English.
 * An app that uses shared components (src/shared) gets their strings in it too, the parts it needs
 * of src/shared/locales.json (scripts/shared-locales.mjs).
 * It also stops if the credits of the Control Panel miss a library (scripts/credits.mjs), or if
 * the copies of the kernel modules' shared code differ from modules/_shared (scripts/module-libs.mjs).
 * Services (entry points of kind 'service') run in the kernel's isolate, where nothing can be
 * imported: src/<id>/services/*.js are copied as they are; src/<id>/kernel/<name>.js are bundled
 * with what they import into dist/<name>.js, with '@lilos/sdk' and '@lilos/system' taken from
 * src/<id>/kernel/sdk.js and system.js (what the app gives the code it shares with its windows).
 * `alone` (in APPS): entry points in a file of their own (`file` in the manifest), each one module
 * with all it imports in dist/<name>.js, so the other files do not carry what only they need.
 *
 * Kernel modules: build/modules/<name>/, see buildModule. Language packs: build/languages/<language>/,
 * see scripts/languages.mjs.
 *
 *   npm run build [-- <app, module or language/<language>>…] [--no-minify] [--no-merge]
 *
 * With no names it builds every app, module and language pack of catalog.json; a name both an app
 * and a module have needs app/ or module/ before it (scheduler); a language pack always has
 * language/ before it (language/it). --no-merge copies the modules' code as it is.
 */
import { build } from 'vite';
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appConfig } from '../vite.config.js';
import { checkCredits } from './credits.mjs';
import { checkModuleLibs } from './module-libs.mjs';
import { sharedTable, checkSharedTable, withShared } from './shared-locales.mjs';
import { LANGUAGES, buildLanguage } from './languages.mjs';

// Paths here and in vite.config.js are relative to plugins/
process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..'));

export const APPS = [
  { id: 'files', entry: 'FilesApp.js' },
  { id: 'editor', entry: 'EditorApp.js' },
  { id: 'settings', entry: 'SettingsApp.js' },
  { id: 'appstore', entry: 'AppStoreApp.js' },
  { id: 'photo', entry: 'PhotoApp.js' },
  { id: 'terminal', entry: 'TerminalApp.js' },
  { id: 'filecrypt', entry: 'FileCryptApp.js' },
  { id: 'calculator', entry: 'CalculatorApp.js' },
  { id: 'keyboard', entry: 'KeyboardApp.js' },
  { id: 'automata', entry: 'AutomataApp.js' },
  { id: 'scheduler', entry: 'SchedulerApp.js' },
  { id: 'nettest', entry: 'NetTestApp.js' },
  { id: 'stickynotes', entry: 'StickyNotesApp.js' },
  { id: 'logicstudio', entry: 'LogicStudioApp.js' },
  { id: 'netwave', entry: 'NetWaveApp.js' },
];

/** The kernel modules of the catalog, by name. */
export const MODULES = JSON.parse(readFileSync('catalog.json', 'utf8')).modules.map(path => path.split('/').pop());

/** Every language without `extends` has every key of English, and none that English lacks. */
function checkLocales(id, table) {
  const en = Object.keys(table.en?.strings ?? {});
  if (!en.length) throw new Error(`${id}: locales.json senza "en"`);
  for (const [lang, { extends: ext, strings = {} }] of Object.entries(table)) {
    if (lang === 'en' || ext) continue;
    const missing = en.filter(k => !Object.hasOwn(strings, k));
    const extra = Object.keys(strings).filter(k => !en.includes(k));
    if (missing.length || extra.length) throw new Error(`${id}: locales.json, ${lang}: ${missing.length ? `mancano ${missing.join(', ')}` : ''}${extra.length ? ` in più ${extra.join(', ')}` : ''}`);
  }
}

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.name === 'node_modules' ? [] : e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const sha256 = data => `sha256-${createHash('sha256').update(data).digest('base64')}`;

export async function buildApp(id, { minify = true, shared = sharedTable() } = {}) {
  const { entry, alone = [] } = APPS.find(a => a.id === id);
  await build({ configFile: false, ...appConfig(id, entry, { minify }) });
  const pkg = join('build', 'apps', id);
  for (const f of alone) {
    const config = appConfig(id, f, { minify });
    await build({
      configFile: false, ...config,
      build: {
        ...config.build, emptyOutDir: false, copyPublicDir: false,
        lib: { ...config.build.lib, fileName: () => f },
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
    });
  }
  // Services (entry points of kind 'service') run in the kernel's isolate: modules without imports, copied as they are
  const services = join('src', id, 'services');
  if (existsSync(services)) for (const f of readdirSync(services).filter(f => f.endsWith('.js'))) copyFileSync(join(services, f), join(pkg, 'dist', f));
  // …or bundled into one module (src/<id>/kernel/<name>.js, except sdk.js and system.js)
  const kernelDir = join('src', id, 'kernel');
  if (existsSync(kernelDir)) {
    for (const f of readdirSync(kernelDir).filter(f => f.endsWith('.js') && !['sdk.js', 'system.js', 'kfs.js'].includes(f))) {
      await build({
        configFile: false, logLevel: 'warn',
        resolve: { alias: { '@lilos/sdk': resolvePath(kernelDir, 'sdk.js'), '@lilos/system': resolvePath(kernelDir, 'system.js') } },
        build: {
          outDir: join(pkg, 'dist'), emptyOutDir: false, target: 'es2022', minify, copyPublicDir: false,
          lib: { entry: resolvePath(kernelDir, f), formats: ['es'], fileName: () => f },
          rollupOptions: { output: { inlineDynamicImports: true } },
        },
      });
    }
  }
  const locales = join('src', id, 'locales.json');
  if (existsSync(locales)) {
    const table = JSON.parse(readFileSync(locales, 'utf8'));
    checkLocales(id, table);
    // With the strings of the shared components it uses; as it is when it uses none
    const full = withShared(id, table, shared);
    if (full === table) copyFileSync(locales, join(pkg, 'locales.json'));
    else writeFileSync(join(pkg, 'locales.json'), `${JSON.stringify(full, null, 2)}\n`);
  }
  if (existsSync(join('src', id, 'README.md'))) copyFileSync(join('src', id, 'README.md'), join(pkg, 'README.md'));
  const files = {};
  for (const file of walk(join(pkg, 'dist')).sort()) files[relative(pkg, file).split(sep).join('/')] = sha256(readFileSync(file));
  if (existsSync(locales)) files['locales.json'] = sha256(readFileSync(join(pkg, 'locales.json')));
  const styles = readdirSync(join(pkg, 'dist')).filter(f => f.endsWith('.css')).map(f => `dist/${f}`);
  const template = JSON.parse(readFileSync(join('src', id, 'app.json'), 'utf8'));
  const manifest = {
    ...template,
    entry: 'dist/index.js',
    ...(styles.length && { styles }),
    ...(existsSync(locales) && { locales: 'locales.json' }),
    files,
  };
  writeFileSync(join(pkg, 'lilos.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${id} ${manifest.version}: ${Object.keys(files).length} file`);
}

/**
 * A kernel module's package in build/modules/<name>: its own code (index.js with what it imports,
 * such as lib/) bundled and minified into index.js; a top-level .js the bundle does not reach
 * (runner.js of services-isolate, started as a process of its own) bundled apart; every other file
 * (module.json, README.md, package.json and its lockfile, schema.sql, LICENSE…) copied as it is.
 * npm packages and node: modules stay imports: the kernel installs the npm ones (npm ci).
 * build.json (not copied), when there: { alias: { '<bare import>': '<file of the module>' } } —
 * terminal-cli bundles the Terminal's shell with its own '@lilos/sdk' and '@lilos/system'.
 */
export async function buildModule(name, { minify = true, merge = true } = {}) {
  const src = resolvePath('modules', name);
  const out = resolvePath('build', 'modules', name);
  rmSync(out, { recursive: true, force: true });
  const reached = new Set([join(src, 'build.json')]);
  const own = existsSync(join(src, 'build.json')) ? JSON.parse(readFileSync(join(src, 'build.json'), 'utf8')) : {};
  const alias = Object.fromEntries(Object.entries(own.alias ?? {}).map(([from, to]) => [from, join(src, to)]));
  const aliased = new Set(Object.keys(alias));
  if (merge) {
    const entries = readdirSync(src).filter(f => f.endsWith('.js')).sort((a, b) => (a === 'index.js' ? -1 : b === 'index.js' ? 1 : a < b ? -1 : 1));
    for (const f of entries) {
      if (reached.has(join(src, f))) continue;
      const [output] = [await build({
        configFile: false, logLevel: 'warn', publicDir: false,
        resolve: { alias },
        // Everything the module imports by a relative path or an alias is in the bundle
        ssr: { noExternal: [...aliased] },
        build: {
          outDir: out, emptyOutDir: false, target: 'node22', minify, ssr: join(src, f), copyPublicDir: false,
          rollupOptions: {
            external: id => !id.startsWith('.') && !isAbsolute(id) && !aliased.has(id),   // node: modules and npm packages
            output: { format: 'es', entryFileNames: f, codeSplitting: false },
          },
        },
      })].flat();
      for (const chunk of output.output) for (const id of chunk.moduleIds ?? []) reached.add(resolvePath(id));
    }
  }
  for (const file of walk(src)) {
    // module.json is the package's manifest even when the code imports it (its version)
    if (reached.has(file) && relative(src, file) !== 'module.json') continue;
    mkdirSync(dirname(join(out, relative(src, file))), { recursive: true });
    cpSync(file, join(out, relative(src, file)));
  }
  const { version } = JSON.parse(readFileSync(join(src, 'module.json'), 'utf8'));
  console.log(`modulo ${name} ${version}: ${walk(out).length} file`);
}

/**
 * Names as the tags of lilOS's repository give them, 'app/<id>', 'module/<name>' and
 * 'language/<language>', or bare when only an app or only a module has that name:
 * [{ kind: 'app' | 'module' | 'language', name }].
 */
export function packagesOf(names) {
  return names.map(full => {
    const pack = /^language\/(.+)$/.exec(full);
    if (pack) {
      if (!LANGUAGES.includes(pack[1])) throw new Error(`Lingua non presente nel catalogo: ${pack[1]}`);
      return { kind: 'language', name: pack[1] };
    }
    const [, prefix, name] = /^(?:(app|module)\/)?(.+)$/.exec(full);
    const kinds = [APPS.some(a => a.id === name) && 'app', MODULES.includes(name) && 'module'].filter(k => k && (!prefix || k === prefix));
    if (!kinds.length) throw new Error(`Né app né modulo: ${full}`);
    if (kinds.length > 1) throw new Error(`${name} è sia un'app sia un modulo: scrivi app/${name} o module/${name}`);
    return { kind: kinds[0], name };
  });
}

/** Builds the named apps, modules and language packs (all of them with none); returns what it built. */
export async function buildAll(names = [], { minify = true, merge = true } = {}) {
  const chosen = packagesOf(names);
  const apps = APPS.map(a => a.id).filter(id => !names.length || chosen.some(p => p.kind === 'app' && p.name === id));
  const modules = MODULES.filter(n => !names.length || chosen.some(p => p.kind === 'module' && p.name === n));
  const languages = LANGUAGES.filter(l => !names.length || chosen.some(p => p.kind === 'language' && p.name === l));
  if (apps.length) checkCredits();
  const stale = checkModuleLibs();
  if (stale.length) throw new Error(`codice condiviso dei moduli non allineato (npm run sync:modules): ${stale.join('; ')}`);
  const shared = sharedTable();
  const sharedErrors = checkSharedTable(shared);
  if (sharedErrors.length) throw new Error(`src/shared/locales.json: ${sharedErrors.join('; ')}`);
  for (const id of apps) await buildApp(id, { minify, shared });
  for (const name of modules) await buildModule(name, { minify, merge });
  for (const language of languages) buildLanguage(language);
  return { apps, modules, languages };
}

if (process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  await buildAll(args.filter(a => !a.startsWith('--')), { minify: !args.includes('--no-minify'), merge: !args.includes('--no-merge') });
}
