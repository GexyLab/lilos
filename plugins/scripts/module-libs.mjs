/**
 * Code shared by the kernel modules. A module is installed alone (only its own folder, as
 * modules/<name>_<version>), so it cannot import from a sibling: the shared sources live in
 * modules/_shared/ (not a module: the catalog does not list it) and each module gets a copy of what
 * it uses in its own lib/shared/.
 *
 * What a module uses is what its code imports from lib/shared/ ('./lib/shared/http.js',
 * '../shared/xml.js'…), plus what those files import in turn: nothing to declare elsewhere. A copy
 * starts with a line saying where it comes from; edit modules/_shared/, then sync.
 *
 *   npm run sync:modules       writes the copies (and removes the ones no longer imported)
 *   npm run check:modules      stops if a copy is missing, differs from its source or is not
 *                              imported any more (the build runs it too)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = join(root, 'modules');
const SHARED = join(MODULES, '_shared');
const HEADER = name => `// Copy of modules/_shared/${name} (scripts/module-libs.mjs): edit it there, then npm run sync:modules\n`;

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.name === 'node_modules' ? [] : e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const rel = file => relative(root, file).split(sep).join('/');
const importsOf = text => [...text.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

/** The shared files `name` needs: itself and what it imports from its siblings, at any depth. */
function closure(names) {
  const out = new Set();
  const visit = name => {
    if (out.has(name)) return;
    const file = join(SHARED, name);
    if (!existsSync(file)) throw new Error(`modules/_shared/${name} non esiste`);
    out.add(name);
    for (const spec of importsOf(readFileSync(file, 'utf8'))) if (spec.startsWith('./')) visit(spec.slice(2));
  };
  names.forEach(visit);
  return out;
}

/** Each module that uses shared code → { dir, wanted: Set of file names }. */
function plan() {
  const out = [];
  for (const name of readdirSync(MODULES)) {
    const dir = join(MODULES, name);
    if (name.startsWith('_') || !existsSync(join(dir, 'module.json'))) continue;
    const libDir = join(dir, 'lib', 'shared');
    const used = new Set();
    for (const file of walk(dir).filter(f => /\.(js|mjs)$/.test(f) && !f.startsWith(libDir + sep))) {
      for (const spec of importsOf(readFileSync(file, 'utf8'))) {
        if (!spec.startsWith('.')) continue;
        const target = join(dirname(file), spec);
        if (dirname(target) === libDir) used.add(target.slice(libDir.length + 1));
      }
    }
    out.push({ name, libDir, wanted: closure(used) });
  }
  return out;
}

const expected = file => HEADER(file) + readFileSync(join(SHARED, file), 'utf8');
const present = libDir => (existsSync(libDir) ? readdirSync(libDir).filter(f => f.endsWith('.js')) : []);

/** What is wrong with the copies: [message]. */
export function checkModuleLibs() {
  const problems = [];
  for (const { libDir, wanted } of plan()) {
    for (const file of wanted) {
      const copy = join(libDir, file);
      if (!existsSync(copy)) problems.push(`manca ${rel(copy)}`);
      else if (readFileSync(copy, 'utf8') !== expected(file)) problems.push(`${rel(copy)} è diverso da modules/_shared/${file}`);
    }
    for (const file of present(libDir)) if (!wanted.has(file)) problems.push(`${rel(join(libDir, file))} non è più usato`);
  }
  return problems;
}

function sync() {
  for (const { name, libDir, wanted } of plan()) {
    for (const file of present(libDir)) if (!wanted.has(file)) { rmSync(join(libDir, file)); console.log(`modules/${name}: tolto ${file}`); }
    if (!wanted.size) {
      if (existsSync(libDir) && !readdirSync(libDir).length) rmSync(libDir, { recursive: true });
      continue;
    }
    mkdirSync(libDir, { recursive: true });
    for (const file of wanted) {
      const copy = join(libDir, file);
      if (existsSync(copy) && readFileSync(copy, 'utf8') === expected(file)) continue;
      writeFileSync(copy, expected(file));
      console.log(`modules/${name}: ${file}`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    const problems = checkModuleLibs();
    if (problems.length) {
      console.error(`Codice condiviso dei moduli non allineato (npm run sync:modules):\n  ${problems.join('\n  ')}`);
      process.exit(1);
    }
    console.log('Codice condiviso dei moduli: allineato');
  } else {
    sync();
  }
}
