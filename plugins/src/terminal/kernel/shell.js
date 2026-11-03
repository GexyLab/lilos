/**
 * The Terminal's shell in the kernel: the service 'shell', which the scheduler calls for its
 * «Comando del Terminale» operations (the kernel's schedule/command.js). Bundled with the shell
 * and its commands into one module without imports (scripts/build.mjs, src/<app>/kernel/*.js):
 * '@lilos/sdk' and '@lilos/system' are kernel/sdk.js and kernel/system.js.
 *
 * Each call { schedule: { params: { lines, cwd } } } runs the lines in a new shell, on the user's
 * home loaded again, in `cwd` (a folder's id; the home without it), and answers
 * { ok, code, text, log }: the exit status and what the commands wrote (stdout and stderr, the
 * last 64 KB). ~/.bashrc is not read, as cron does. The commands that open apps or files say they
 * need lilOS's page. When the scheduler gives up («Annulla», the operation's time limit: the
 * handler's third argument, services-isolate 1.2.0) the shell gets Ctrl+C: the command stops with
 * 130 and what it wrote so far is the answer.
 */
import { connect } from './sdk.js';
import { Shell } from '../shell/Shell.js';
import { commands } from '../commands/index.js';
import { EmptyReader, FnWriter } from '../shell/streams.js';
import { ExitSignal, Interrupt, ParseError, Incomplete } from '../shell/signals.js';

const KEPT = 64 << 10;

// What the kernel's isolate lacks of a browser and the shell uses
globalThis.performance ??= { now: () => Date.now() };
globalThis.queueMicrotask ??= fn => { Promise.resolve().then(fn); };
globalThis.structuredClone ??= value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
// wc -c counts bytes with TextEncoder
if (typeof globalThis.TextEncoder !== 'function') {
  globalThis.TextEncoder = class {
    encode(text) {
      const out = [];
      for (const ch of String(text)) {
        const c = ch.codePointAt(0);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
        else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
      return new Uint8Array(out);
    }
  };
}

async function run(lilos, { lines = '', cwd = null } = {}, request) {
  if (request?.cancelled) return { ok: false, code: 130, log: '' };
  let fs;
  try {
    fs = await connect(lilos);
  } catch (err) {
    return { ok: false, code: 1, error: err.message, log: '' };
  }
  let log = '';
  const write = text => { log = (log + text).slice(-KEPT); };
  const out = new FnWriter(write);
  const host = {
    stdin: new EmptyReader(), stdout: out, stderr: out,
    clear: () => {}, columns: () => 120,
    history: { list: () => [], clear: () => {} },
  };
  const shell = new Shell({ host, commands });
  if (typeof cwd === 'string' && fs.get(cwd)?.type === 'folder') shell.cwd = cwd;
  let code = 0;
  const off = request?.onCancel?.(() => shell.token.abort());
  try {
    await shell.run(String(lines), host);
    code = shell.token.aborted ? 130 : shell.status;
  } catch (err) {
    if (err instanceof ExitSignal) code = err.code ?? 0;
    else if (err instanceof Interrupt) code = 130;
    else if (err instanceof ParseError || err instanceof Incomplete) { write(`bash: ${err.message}\n`); code = 2; }
    else { write(`bash: ${err?.message ?? err}\n`); code = 1; }
  } finally {
    off?.();
  }
  try {
    await fs.flush();
  } catch (err) {
    write(`bash: ${err.message}\n`);
    code ||= 1;
  }
  return { ok: code === 0, code, log };
}

export function shell({ lilos }) {
  // One run at a time: two operations at once would share the same tree
  let queue = Promise.resolve();
  lilos.handle((data, from, request) => {
    // Only the scheduler (the kernel refuses `schedule` from pages and apps, see AppServices.call)
    if (from !== 'scheduler' || !data?.schedule) return { ok: false, code: 2, error: 'Il servizio shell esegue solo i comandi della Pianificazione' };
    const next = queue.then(() => run(lilos, data.schedule.params ?? {}, request));
    queue = next.catch(() => {});
    return next;
  });
}
