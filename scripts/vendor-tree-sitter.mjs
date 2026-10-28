/**
 * Copies the Tree-sitter grammars used by the Editor into public/tree-sitter/<name>/:
 * the WebAssembly parser, queries/highlights.scm and the license, from the official npm packages.
 * The packages are not dependencies because their install scripts build native bindings.
 *
 *   node scripts/vendor-tree-sitter.mjs
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Versions pinned on purpose (published at least two weeks before being adopted)
const GRAMMARS = [
  { name: 'javascript', pkg: 'tree-sitter-javascript', version: '0.25.0' },
  { name: 'python', pkg: 'tree-sitter-python', version: '0.25.0' },
  { name: 'json', pkg: 'tree-sitter-json', version: '0.24.8' },
  { name: 'css', pkg: 'tree-sitter-css', version: '0.25.0' },
  { name: 'html', pkg: 'tree-sitter-html', version: '0.23.2' },
  { name: 'bash', pkg: 'tree-sitter-bash', version: '0.25.1' },
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'tree-sitter');
const work = mkdtempSync(join(tmpdir(), 'lilos-ts-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  for (const g of GRAMMARS) {
    const dir = join(work, g.name);
    mkdirSync(dir);
    execFileSync(npm, ['pack', `${g.pkg}@${g.version}`, '--silent'], { cwd: dir, shell: process.platform === 'win32' });
    const tgz = readdirSync(dir).find(f => f.endsWith('.tgz'));
    execFileSync('tar', ['-xzf', tgz], { cwd: dir });
    const pkg = join(dir, 'package');
    const dest = join(out, g.name);
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(join(pkg, `tree-sitter-${g.name}.wasm`), join(dest, `tree-sitter-${g.name}.wasm`));
    cpSync(join(pkg, 'queries', 'highlights.scm'), join(dest, 'highlights.scm'));
    if (existsSync(join(pkg, 'LICENSE'))) cpSync(join(pkg, 'LICENSE'), join(dest, 'LICENSE'));
    console.log(`${g.pkg}@${g.version} → public/tree-sitter/${g.name}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
