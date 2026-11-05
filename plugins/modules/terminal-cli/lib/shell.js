import { connect, fs } from './sdk.js';
import { Shell } from '../../../src/terminal/shell/Shell.js';
import { ExitSignal, Incomplete, Interrupt, ParseError, Token } from '../../../src/terminal/shell/signals.js';
import { commands } from './commands.js';
import { httpHome } from './home.js';
import { i18n } from './strings.js';

/**
 * One shell of the Terminal over the user's home, for the command lilos: the tree loaded from the
 * kernel before each line (what lilOS's pages and other shells changed meanwhile), the changes sent
 * back after it. `host` is the shell's terminal ({ stdin, stdout, stderr, clear, columns, history }).
 */
export class CliShell {
  constructor({ client, user, host }) {
    this.client = client;
    this.host = host;
    const home = httpHome(client);
    // The user's language of lilOS comes with the tree (null: the computer's)
    const load = home.load;
    home.load = async () => {
      const data = await load();
      this.locale = data.locale ?? null;
      return data;
    };
    this.locale = null;
    this.lilos = {
      home,
      app: { user },
      locale: { get code() { return i18n.code; }, i18n },
    };
    this.shell = null;
  }

  /** The home again from the kernel (first: the shell is made on it). */
  async refresh() {
    await connect(this.lilos);
    if (!this.shell) {
      this.shell = new Shell({ host: this.host, commands });
      this.shell.client = this.client;   // appstore and license talk to the kernel through it
    }
  }

  /** Changes the working folder: a path of lilOS (~/Documenti, /home/…); false when it is not a folder. */
  chdir(path) {
    const node = this.shell.resolve(path);
    if (node?.type !== 'folder') return false;
    this.shell.cwd = node.id;
    return true;
  }

  /**
   * Runs source text: { status } or { incomplete } (more lines are needed: an if without fi…) or
   * { exit: code } (`exit`). The changes of the tree go to the kernel afterwards, whatever happened.
   */
  async run(source, { onStart } = {}) {
    const shell = this.shell;
    shell.token = new Token();
    onStart?.(shell.token);
    const io = this.host;
    let out = { status: 0 };
    try {
      await shell.run(source, io);
      out = { status: shell.token.aborted ? 130 : shell.status };
    } catch (err) {
      if (err instanceof Incomplete) out = { incomplete: true, message: err.message };
      else if (err instanceof ExitSignal) out = { exit: err.code ?? shell.status ?? 0 };
      else if (err instanceof Interrupt) out = { status: 130 };
      else if (err instanceof ParseError) { io.stderr.write(`bash: ${err.message}\n`); out = { status: 2 }; }
      else { io.stderr.write(`bash: ${err?.message ?? err}\n`); out = { status: 1 }; }
    }
    if (!out.incomplete && out.status !== undefined) shell.status = out.status;
    try {
      await fs.flush();
    } catch (err) {
      io.stderr.write(`bash: ${err.message}\n`);
      if (out.status === 0) out.status = 1;
    }
    return out;
  }
}
