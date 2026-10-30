import { createInterface } from 'node:readline';
import { loadConfig, MODULES_DIR } from './src/config.js';
import { resolveModules, startModule } from './src/modules.js';

/**
 * Commands of the kernel's modules, run without the kernel:
 *   node system/kernel/cli.js <module> <command> [args] [--flag value] [--switch]
 * Only the module and the modules it needs are started.
 */
function parseArgs(list) {
  const positional = [], flags = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith('--')) positional.push(a);
    else if (list[i + 1] && !list[i + 1].startsWith('--')) flags[a.slice(2)] = list[++i];
    else flags[a.slice(2)] = true;
  }
  return { positional, flags };
}

/** Reads a line without echoing it (falls back to LILOS_PASSWORD when not on a terminal). */
function readHidden(question) {
  if (!process.stdin.isTTY) {
    if (process.env.LILOS_PASSWORD) return Promise.resolve(process.env.LILOS_PASSWORD);
    return Promise.reject(new Error('Serve un terminale per scrivere la password (o la variabile LILOS_PASSWORD)'));
  }
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = text => { if (text.includes(question)) process.stdout.write(question); };
    rl.question(question, answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
    rl.on('SIGINT', () => { rl.close(); reject(new Error('Annullato')); });
  });
}

const prompt = {
  async password(question, { confirm = false } = {}) {
    const first = await readHidden(question);
    if (confirm && process.stdin.isTTY && first !== await readHidden('Ripeti: ')) throw new Error('Le due password non coincidono');
    return first;
  },
};

const [name, command, ...rest] = process.argv.slice(2);
try {
  if (!name || !command) throw new Error('Uso: node system/kernel/cli.js <modulo> <comando> [argomenti]');
  const config = await loadConfig();
  const wanted = config.modules.find(m => m.name === name) ?? { name, version: null, config: {} };
  const all = await resolveModules(MODULES_DIR, config.modules.some(m => m.name === name) ? config.modules : [...config.modules, wanted]);
  // The module and, recursively, those that provide what it requires
  const needed = new Set([name]);
  for (const mod of [...all].reverse()) {
    if (!needed.has(mod.name)) continue;
    for (const s of mod.requires) needed.add(all.find(m => m.provides.includes(s)).name);
  }
  const services = new Map();
  const started = [];
  for (const mod of all.filter(m => needed.has(m.name))) started.push(await startModule(mod, services, { route() {} }));
  const target = started.find(m => m.name === name);
  const run = target.impl.commands?.[command];
  if (typeof run !== 'function') throw new Error(`${name} non ha il comando "${command}" (comandi: ${Object.keys(target.impl.commands ?? {}).join(', ') || 'nessuno'})`);
  await run({ services, args: parseArgs(rest), prompt, ctx: target.ctx });
  for (const mod of started.reverse()) await mod.impl.stop?.();
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
