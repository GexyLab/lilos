import { createInterface } from 'node:readline';
import { quote } from '../../src/terminal/shell/Shell.js';
import manifest from './module.json';
import { ApiError, Client, Unreachable, savedSession } from './lib/client.js';
import { StdinReader, LineReader, StreamWriter } from './lib/io.js';
import { SignInFailed, signIn, signOut } from './lib/login.js';
import { Repl } from './lib/repl.js';
import { CliShell } from './lib/shell.js';
import { i18n, setLanguage, t } from './lib/strings.js';

/**
 * The command lilos (index.js runs it from cli.js of the kernel: `terminal-cli sh -- …`):
 *
 *   lilos                     the shell of lilOS in this terminal (from a pipe: a script)
 *   lilos <command> [args…]   one line of the shell (the arguments quoted as they came), then out
 *   lilos -c "<line>"         one line as it is (pipes, ;, && of lilOS's shell)
 *   options: --server URL, --user NAME, --cwd FOLDER, --no-color, --logout, --version, --help
 *
 * Exit codes: the command's (130 after Ctrl+C), 2 wrong use, 3 the kernel does not answer, 4 not
 * signed in. LILOS_SERVER, LILOS_USER and LILOS_PASSWORD stand for --server, --user and the
 * password; NO_COLOR for --no-color.
 */
const VALUE = new Set(['-c', '--server', '--user', '--cwd']);

function parseArgs(list) {
  const opts = { command: null, server: null, user: null, cwd: null, color: true, logout: false, version: false, help: false };
  let i = 0;
  for (; i < list.length; i++) {
    const a = list[i];
    if (a === '--') { i++; break; }
    if (!a.startsWith('-') || a === '-') break;
    const [name, inline] = a.startsWith('--') ? a.split(/=(.*)/s) : [a];
    if (VALUE.has(name)) {
      const value = inline ?? list[++i];
      if (value === undefined) return { error: t('cli.needsValue', { option: name }) };
      opts[{ '-c': 'command', '--server': 'server', '--user': 'user', '--cwd': 'cwd' }[name]] = value;
    } else if (name === '--no-color') opts.color = false;
    else if (name === '--logout') opts.logout = true;
    else if (name === '--version' || name === '-V') opts.version = true;
    else if (name === '--help' || name === '-h') opts.help = true;
    else return { error: t('cli.badOption', { option: a }) };
  }
  return { opts, words: list.slice(i) };
}

/** An address as the user writes it (lilos.azienda.it:8790) → http(s)://host:port. */
function serverUrl(value) {
  const s = String(value).trim();
  const url = new URL(/^https?:\/\//i.test(s) ? s : `http://${s}`);
  return url.origin;
}

/** A visible question before the shell starts (the user's name). */
function ask(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
    rl.question(question, answer => { rl.close(); resolve(answer); });
    rl.on('SIGINT', () => { rl.close(); process.stdout.write('\n'); resolve(''); });
  });
}

/** stdout of the interactive shell: what follows the last newline is kept (the prompt of a command that reads a line). */
class TailWriter extends StreamWriter {
  repl = null;
  write(text) {
    super.write(text);
    if (this.repl) this.repl.tail = (this.repl.tail + String(text)).split('\n').pop();
  }
}

export async function main({ argv = [], kernel = {}, prompt } = {}) {
  const parsed = parseArgs(argv[0] === '--' ? argv.slice(1) : argv);
  if (parsed.error) {
    process.stderr.write(`lilos: ${parsed.error}\n${t('cli.seeHelp')}\n`);
    return 2;
  }
  const { opts, words } = parsed;
  if (opts.help) { process.stdout.write(`${t('cli.usage')}\n`); return 0; }
  if (opts.version) { process.stdout.write(`lilos (terminal-cli ${manifest.version})\n`); return 0; }

  let client;
  try {
    client = new Client(serverUrl(opts.server ?? process.env.LILOS_SERVER ?? kernel.url ?? 'http://127.0.0.1:8790'));
  } catch {
    process.stderr.write(`lilos: ${t('cli.badServer', { server: opts.server ?? process.env.LILOS_SERVER })}\n`);
    return 2;
  }
  client.locale = i18n.code;
  if (opts.logout) {
    const had = !!savedSession(client.url);
    await signOut(client);
    process.stdout.write(`${had ? t('cli.loggedOut', { url: client.url }) : t('cli.noSession', { url: client.url })}\n`);
    return 0;
  }

  const interactive = opts.command === null && !words.length && !!process.stdin.isTTY;
  const color = opts.color && !process.env.NO_COLOR && !!process.stdout.isTTY;
  let auth;
  try {
    auth = await signIn(client, {
      username: opts.user, tty: !!process.stdin.isTTY, ask,
      password: question => (prompt ? prompt.password(question) : Promise.reject(new Error(t('cli.login.noTerminal')))),
    });
  } catch (err) {
    if (err instanceof Unreachable) { process.stderr.write(`lilos: ${t('cli.unreachable', { url: client.url })} (${err.message})\n`); return 3; }
    if (err instanceof SignInFailed || err instanceof ApiError) { process.stderr.write(`lilos: ${err.message}\n`); return 4; }
    throw err;
  }
  client.user = auth.user;
  client.mode = auth.mode;

  const stdout = new TailWriter(process.stdout, { color });
  const host = {
    stdin: null,
    stdout,
    stderr: new StreamWriter(process.stderr, { color: color && !!process.stderr.isTTY }),
    clear: () => { if (process.stdout.isTTY) process.stdout.write('\x1b[2J\x1b[H'); },
    // Not a terminal: ls one name per line, as on any system
    columns: () => (process.stdout.isTTY ? process.stdout.columns || 80 : 1),
    history: { list: () => [], clear: () => {} },
  };
  const cli = new CliShell({ client, user: auth.user, host });
  let code = 0;
  try {
    await cli.refresh();
    setLanguage(cli.locale);
    client.locale = i18n.code;
    if (opts.cwd && !cli.chdir(opts.cwd)) {
      process.stderr.write(`lilos: ${t('cli.noFolder', { path: opts.cwd })}\n`);
      return 1;
    }
    if (interactive) {
      const repl = new Repl(cli, { color });
      stdout.repl = repl;
      host.history = { list: () => repl.historyList, clear: () => repl.clearHistory() };
      host.stdin = new LineReader(repl);
      await banner(client, auth);
      code = await repl.run();
    } else {
      host.stdin = new StdinReader();
      // Ctrl+C stops the command (130); twice, lilos at once
      let stops = 0;
      let token = null;
      process.on('SIGINT', () => { if (++stops > 1 || !token) process.exit(130); token.abort(); });
      const source = opts.command ?? (words.length ? words.map(quote).join(' ') : await host.stdin.readAll());
      if (!words.length && opts.command === null) host.stdin = new StdinReader();
      const result = await cli.run(source, { onStart: tk => { token = tk; } });
      if (result.incomplete) {
        process.stderr.write(`bash: ${result.message || t('parse.unexpectedEndOfFile')}\n`);
        code = 2;
      } else code = result.exit ?? result.status;
    }
  } catch (err) {
    if (err instanceof Unreachable) { process.stderr.write(`lilos: ${t('cli.unreachable', { url: client.url })}\n`); code = 3; }
    else if (err instanceof ApiError && err.status === 401) { process.stderr.write(`lilos: ${t('cli.sessionEnded')}\n`); code = 4; }
    else if (err instanceof ApiError) { process.stderr.write(`lilos: ${err.message}\n`); code = 1; }
    else throw err;
  } finally {
    if (auth.temporary) await client.delete('/api/session').catch(() => {});
  }
  return code;
}

/** The first lines of the interactive shell: lilOS, the address, without UI; the license changed for admins. */
async function banner(client, auth) {
  const info = await client.get('/api/system').catch(() => null);
  const dim = s => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s);
  process.stdout.write(`${t('cli.banner', { version: info?.version ?? '?', url: client.url })}${auth.ui === false ? dim(` · ${t('cli.noUi')}`) : ''}\n`);
  process.stdout.write(`${t('cli.welcome', { version: manifest.version })}\n`);
  if (auth.user?.role === 'admin' || auth.mode === 'single') {
    const license = await client.get('/api/license').catch(() => null);
    if (license && !license.accepted) process.stdout.write(`${process.stdout.isTTY ? `\x1b[33m${t('cli.licenseChanged')}\x1b[0m` : t('cli.licenseChanged')}\n`);
  }
  process.stdout.write('\n');
}
