/**
 * The credits of every external library, font and tool the repository uses, shown by the Control
 * Panel in About → Credits: src/settings/credits.json.
 *
 * What it lists:
 * - the dependencies of the apps (root package.json) with the ones they bring, each with the apps
 *   that import it (found in src/<app>/);
 * - the dependencies of the kernel modules (modules/<name>/package-lock.json);
 * - the code copied into the repository (VENDORED below: Tree-sitter grammars, smb3-client);
 * - the web fonts of lilOS (its index.html, one folder up) and of the apps (FONTS below);
 * - the tools that build lilOS and the apps (root devDependencies).
 * Licenses, copyright and sites come from node_modules: run `npm ci` in the root and in every
 * module with a package-lock.json first.
 *
 *   npm run credits            writes src/settings/credits.json
 *   npm run check:credits      stops if credits.json misses a library or lists one no longer used
 *                              (only the lockfiles are read: no node_modules needed; the build
 *                              runs it too)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src', 'settings', 'credits.json');

/** Web fonts: added by hand, the check stops on a family missing here. */
const FONTS = {
  'Manrope': { license: 'OFL-1.1', copyright: 'Copyright 2018 The Manrope Project Authors', url: 'https://github.com/sharanda/manrope' },
  'JetBrains Mono': { license: 'OFL-1.1', copyright: 'Copyright 2020 The JetBrains Mono Project Authors', url: 'https://github.com/JetBrains/JetBrainsMono' },
};

/**
 * Code copied into the repository: every LICENSE outside node_modules must be one of these (the
 * check stops otherwise). `read` gives name, version, license, copyright and site.
 */
const VENDORED = [
  // Tree-sitter grammars of the Editor, copied by scripts/vendor-tree-sitter.mjs
  ...[...readFileSync(join(root, 'scripts', 'vendor-tree-sitter.mjs'), 'utf8').matchAll(/\{ name: '([^']+)', pkg: '([^']+)', version: '([^']+)' \}/g)]
    .map(([, dir, pkg, version]) => ({
      license: `src/editor/public/tree-sitter/${dir}/LICENSE`, usedBy: ['editor'],
      read: text => ({ name: pkg, version, license: licenseName(text), copyright: copyrightLine(text), url: `https://github.com/tree-sitter/${pkg}` }),
    })),
  // smb3-client, built and copied with the lilOS changes (VENDORED.md)
  {
    license: 'modules/netfs-smb/lib/smb3-client/LICENSE', usedBy: ['module:netfs-smb'],
    read: text => {
      const notes = readFileSync(join(root, 'modules/netfs-smb/lib/smb3-client/VENDORED.md'), 'utf8');
      const [, url, version] = notes.match(/\[smb3-client\]\(([^)]+)\) ([\d.]+)/) ?? [];
      if (!version) throw new Error('smb3-client: versione non trovata in VENDORED.md');
      return { name: 'smb3-client', version, license: licenseName(text), copyright: copyrightLine(text), url };
    },
  },
];

/**
 * Programs a kernel module downloads when it needs them (not in a lockfile): their names and
 * versions are read from the module's own list, licenses here; the check stops on one missing.
 */
const DOWNLOADED = {
  // 'modules/<name>/tools.js': { '<program>': { license, copyright, url } },
};

const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.name === 'node_modules' ? [] : e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const rel = file => relative(root, file).split(sep).join('/');

function licenseName(text) {
  if (/MIT License|Permission is hereby granted, free of charge/i.test(text)) return 'MIT';
  if (/Apache License/i.test(text) && /Version 2\.0/.test(text)) return 'Apache-2.0';
  if (/ISC License|Permission to use, copy, modify, and\/or distribute/i.test(text)) return 'ISC';
  if (/SIL OPEN FONT LICENSE/i.test(text)) return 'OFL-1.1';
  return '';
}
const copyrightLine = text => text.split(/\r?\n/).map(l => l.trim()).find(l => /^(copyright|\(c\)|©)/i.test(l)) ?? '';

/** The package a module specifier names: 'a/b' → 'a', '@s/a/b' → '@s/a'. */
const packageOf = spec => spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/').replace(/\?.*$/, '');

/** Lockfile path of `name` as required from the package at `from` (node's lookup, walking up). */
function resolveIn(packages, from, name) {
  let base = from;
  for (;;) {
    const path = `${base ? `${base}/` : ''}node_modules/${name}`;
    if (packages[path]) return path;
    if (!base) return null;
    const i = base.lastIndexOf('/node_modules/');
    base = i < 0 ? '' : base.slice(0, i);
  }
}

/**
 * The production packages of a lockfile, each with the direct dependencies that bring it (`via`,
 * itself for a direct one). Type-only packages (@types/*) are left out: no code of theirs runs.
 */
function lockPackages(lockFile, direct) {
  const { packages } = readJson(lockFile);
  const found = new Map();   // lockfile path → { name, version, via: Set }
  for (const dep of direct) {
    const start = resolveIn(packages, '', dep);
    if (!start) throw new Error(`${rel(lockFile)}: ${dep} manca, esegui npm install`);
    const queue = [start];
    const seen = new Set();
    while (queue.length) {
      const path = queue.shift();
      if (seen.has(path)) continue;
      seen.add(path);
      const entry = packages[path];
      const name = entry.name ?? path.slice(path.lastIndexOf('node_modules/') + 13);
      if (name.startsWith('@types/')) continue;
      const item = found.get(path) ?? { path, name, version: entry.version, lockLicense: entry.license, optional: !!entry.optional, via: new Set() };
      item.via.add(dep);
      found.set(path, item);
      for (const d of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies })) {
        const next = resolveIn(packages, path, d);
        if (next) queue.push(next);   // an optional one may be missing for this platform
      }
    }
  }
  return [...found.values()];
}

/** The apps of src/ (folders with an app.json) and the external packages each one imports. */
function appImports() {
  const apps = {};
  for (const id of readdirSync(join(root, 'src'))) {
    if (!existsSync(join(root, 'src', id, 'app.json'))) continue;
    const used = new Set();
    for (const file of walk(join(root, 'src', id)).filter(f => /\.(js|mjs)$/.test(f) && !rel(f).includes('/public/'))) {
      for (const [, spec] of readFileSync(file, 'utf8').matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"./][^'"]*)['"]/g)) used.add(packageOf(spec));
    }
    apps[id] = used;
  }
  return apps;
}

/** Names of the apps and kernel modules credits.json mentions, in English and Italian. */
function userNames(ids) {
  const names = {};
  for (const id of ids) {
    if (id.startsWith('module:')) continue;   // a module is shown by its name
    const app = readJson(join(root, 'src', id, 'app.json'));
    const locales = existsSync(join(root, 'src', id, 'locales.json')) ? readJson(join(root, 'src', id, 'locales.json')) : {};
    names[id] = { en: locales.en?.strings?.['@name'] ?? app.name, it: locales.it?.strings?.['@name'] ?? app.name };
  }
  return names;
}

/** Web font families named in Google Fonts links of lilOS and of the apps. */
function fontFamilies() {
  const files = [join(root, '..', 'index.html'), ...walk(join(root, 'src')).filter(f => /\.(html|css|js)$/.test(f))];
  const families = new Set();
  for (const file of files.filter(existsSync)) {
    for (const [url] of readFileSync(file, 'utf8').matchAll(/https:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s)]+/g)) {
      for (const [, family] of url.matchAll(/family=([^:&]+)/g)) families.add(decodeURIComponent(family.replace(/\+/g, ' ')));
    }
  }
  return [...families].sort();
}

/**
 * Everything credits.json must list, from lockfiles and sources only: what the check compares.
 * Each entry: { kind, name, version, usedBy[], via[]?, optional?, path?, lockLicense?, read? }.
 */
function collect() {
  const entries = new Map();   // kind:name@version → entry
  const add = (key, entry) => {
    const old = entries.get(key);
    if (!old) return entries.set(key, { ...entry, usedBy: new Set(entry.usedBy), via: new Set(entry.via ?? []) });
    entry.usedBy.forEach(u => old.usedBy.add(u));
    (entry.via ?? []).forEach(v => old.via.add(v));
  };

  // Apps
  const pkg = readJson(join(root, 'package.json'));
  const imports = appImports();
  const direct = Object.keys(pkg.dependencies ?? {});
  for (const dep of direct) {
    if (!Object.values(imports).some(s => s.has(dep))) throw new Error(`${dep} (package.json) non è importato da nessuna app: toglilo dalle dipendenze`);
  }
  for (const p of lockPackages(join(root, 'package-lock.json'), direct)) {
    const usedBy = Object.keys(imports).filter(id => [...p.via].some(d => imports[id].has(d)));
    add(`library:${p.name}@${p.version}`, { kind: 'library', ...p, usedBy, via: p.via.has(p.name) ? [] : [...p.via] });
  }

  // Kernel modules
  for (const name of readdirSync(join(root, 'modules'))) {
    const dir = join(root, 'modules', name);
    if (!existsSync(join(dir, 'package.json'))) continue;
    const deps = Object.keys(readJson(join(dir, 'package.json')).dependencies ?? {});
    if (!deps.length) continue;
    if (!existsSync(join(dir, 'package-lock.json'))) throw new Error(`modules/${name}: manca package-lock.json`);
    for (const p of lockPackages(join(dir, 'package-lock.json'), deps)) {
      add(`library:${p.name}@${p.version}`, { kind: 'library', ...p, usedBy: [`module:${name}`], via: p.via.has(p.name) ? [] : [...p.via] });
    }
  }

  // Copied code: every LICENSE outside node_modules has its entry
  const licenses = [...walk(join(root, 'src')), ...walk(join(root, 'modules'))].filter(f => /^(LICEN[CS]E|COPYING)(\.\w+)?$/i.test(f.split(sep).pop())).map(rel);
  const unknown = licenses.filter(l => !VENDORED.some(v => v.license === l));
  if (unknown.length) throw new Error(`codice copiato senza riconoscimento (aggiungilo a VENDORED in scripts/credits.mjs): ${unknown.join(', ')}`);
  for (const v of VENDORED) {
    if (!existsSync(join(root, v.license))) throw new Error(`${v.license} non esiste più: aggiorna VENDORED in scripts/credits.mjs`);
    const info = v.read(readFileSync(join(root, v.license), 'utf8'));
    add(`library:${info.name}@${info.version}`, { kind: 'library', ...info, usedBy: v.usedBy, vendored: true });
  }

  // Programs downloaded by kernel modules
  for (const [file, known] of Object.entries(DOWNLOADED)) {
    const module = file.split('/')[1];
    const listed = [...readFileSync(join(root, file), 'utf8').matchAll(/name: '([^']+)', version: '([^']+)'/g)];
    if (!listed.length) throw new Error(`${file}: nessun programma trovato (aggiorna DOWNLOADED in scripts/credits.mjs)`);
    for (const [, name, version] of listed) {
      if (!known[name]) throw new Error(`${name} (${file}) senza riconoscimento: aggiungilo a DOWNLOADED in scripts/credits.mjs`);
      add(`library:${name}@${version}`, { kind: 'library', name, version, ...known[name], usedBy: [`module:${module}`], vendored: true });
    }
  }

  // Fonts
  for (const family of fontFamilies()) {
    if (!FONTS[family]) throw new Error(`font ${family} senza riconoscimento: aggiungilo a FONTS in scripts/credits.mjs`);
    add(`font:${family}`, { kind: 'font', name: family, ...FONTS[family], usedBy: ['lilos'] });
  }

  // Build tools
  const lock = readJson(join(root, 'package-lock.json')).packages;
  for (const dep of Object.keys(pkg.devDependencies ?? {})) {
    add(`tool:${dep}`, { kind: 'tool', name: dep, version: lock[`node_modules/${dep}`]?.version, path: `node_modules/${dep}`, usedBy: [] });
  }
  return [...entries.values()];
}

/** What identifies an entry for the check. */
const identity = e => JSON.stringify([e.kind, e.name, e.version ?? '', [...e.usedBy].sort(), [...(e.via ?? [])].sort()]);

/** License, copyright and site of a package installed in node_modules. */
function packageInfo(dir, lockLicense) {
  const pj = join(dir, 'package.json');
  if (!existsSync(pj)) throw new Error(`${rel(dir)} non è installato: esegui npm ci nella sua cartella`);
  const meta = readJson(pj);
  const licenseFile = readdirSync(dir).find(f => /^(LICEN[CS]E|COPYING)(\.\w+)?$/i.test(f));
  const text = licenseFile ? readFileSync(join(dir, licenseFile), 'utf8') : '';
  const author = typeof meta.author === 'string' ? meta.author : meta.author?.name;
  const repo = typeof meta.repository === 'string' ? meta.repository : meta.repository?.url;
  const repoUrl = repo && repo.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/^github:/, 'https://github.com/').replace(/\.git$/, '').replace(/^([\w-]+\/[\w.-]+)$/, 'https://github.com/$1');
  return {
    license: (typeof meta.license === 'string' ? meta.license : meta.license?.type ?? meta.licenses?.[0]?.type) ?? lockLicense ?? licenseName(text),
    copyright: copyrightLine(text) || (author ? `© ${author.replace(/\s*[<(].*$/, '')}` : ''),
    url: (meta.homepage || repoUrl || `https://www.npmjs.com/package/${meta.name}`).replace(/#readme$/, '').replace(/^http:\/\//, 'https://'),
  };
}

function build() {
  const out = [];
  for (const e of collect()) {
    let info = {};
    if (e.kind === 'tool') info = packageInfo(join(root, e.path));
    else if (e.kind === 'library' && !e.vendored) {
      // A module's package lives in that module's node_modules
      const module = [...e.usedBy].find(u => u.startsWith('module:'));
      info = packageInfo(join(root, ...(module ? ['modules', module.slice(7)] : []), e.path), e.lockLicense);
    }
    const entry = {
      kind: e.kind, name: e.name, version: e.version ?? '',
      license: e.license ?? info.license ?? '', copyright: e.copyright ?? info.copyright ?? '', url: e.url ?? info.url ?? '',
      usedBy: [...e.usedBy].sort(),
      ...(e.via.size && { via: [...e.via].sort() }),
      ...(e.optional && { optional: true }),
    };
    if (!entry.license) throw new Error(`${e.name}: licenza non trovata`);
    out.push(entry);
  }
  const order = { library: 0, font: 1, tool: 2 };
  out.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return { libraries: out, names: userNames(new Set(out.flatMap(e => e.usedBy).filter(u => u !== 'lilos'))) };
}

/** Stops if credits.json does not list exactly what collect() finds. */
export function checkCredits() {
  if (!existsSync(OUT)) throw new Error('src/settings/credits.json manca: esegui npm run credits');
  const listed = new Set(readJson(OUT).libraries.map(identity));
  const wanted = new Set(collect().map(identity));
  const missing = [...wanted].filter(i => !listed.has(i)).map(i => JSON.parse(i).slice(1, 3).join(' '));
  const extra = [...listed].filter(i => !wanted.has(i)).map(i => JSON.parse(i).slice(1, 3).join(' '));
  if (missing.length || extra.length) {
    throw new Error(`riconoscimenti non aggiornati (esegui npm run credits):${missing.length ? ` mancano ${missing.join(', ')};` : ''}${extra.length ? ` non più usati ${extra.join(', ')}` : ''}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    checkCredits();
    console.log('credits.json: aggiornato');
  } else {
    const credits = build();
    writeFileSync(OUT, `${JSON.stringify(credits, null, 2)}\n`);
    console.log(`credits.json: ${credits.libraries.length} voci`);
  }
}
