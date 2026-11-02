import { fail } from '../errors.js';
import { writeHomeFile } from './web.js';

/**
 * «Comando del Terminale»: lines for a shell, run by the kernel as the operation's owner.
 *   in lilOS        the Terminal's own shell, as its service 'shell' (the Terminal app, 1.5.0 or
 *                   newer, with services-isolate 1.1.0): the same commands as in its window, on
 *                   the user's home; not the ones that open apps or files (they need lilOS's page),
 *                   nor files an app protects (an encrypted one). ~/.bashrc is not read, as cron does.
 *   on an SSH host  the lines through a saved host of the Terminal (term/terminals.js exec): its
 *                   password or key saved, its server key confirmed before.
 * Done when the exit status is 0. The output (stdout and stderr together) goes to the history and,
 * with saveTo, into a file of the home (replaced, or added at the end).
 */
const TERMINAL = 'terminal';
const ENTRY = 'shell';
const KEPT = 64 << 10;

const lastLine = text => String(text).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r/g, '').trim().split('\n').pop()?.slice(0, 200) ?? '';
const plainText = text => String(text).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r\n?/g, '\n');

export async function runCommand({ kernel, task, run, principal, signal }) {
  const w = task.what;
  let output, code, ended = null;
  if (w.host) {
    ({ output, code, signal: ended } = await kernel.terminals.exec(principal, w.host, w.lines, { signal, maxOutput: KEPT }));
    output = plainText(output);
  } else {
    const service = (await kernel.appServices.catalog()).find(s => s.app === TERMINAL && s.entry === ENTRY);
    if (!service) fail('unavailable', 'Serve il Terminale 1.5.0 o più recente: aggiornalo dall’AppStore');
    const result = await kernel.appServices.runScheduled(principal, TERMINAL, ENTRY, { lines: w.lines, cwd: w.cwd }, { task, run });
    if (result?.error && !Number.isInteger(result.code)) fail('unavailable', String(result.error).slice(0, 300));
    output = plainText(result?.log ?? '');
    code = Number.isInteger(result?.code) ? result.code : result?.ok === false ? 1 : 0;
  }
  if (w.saveTo) await writeHomeFile(kernel, principal, w.saveTo.folder, w.saveTo.name, Buffer.from(output, 'utf8'), { append: w.saveTo.mode === 'append' });
  const tail = lastLine(output);
  if (ended) return { state: 'error', text: `Terminato dal segnale SIG${ended} (${code})${tail ? `: ${tail}` : ''}`, log: output };
  if (code !== 0) return { state: 'error', text: `Uscito con ${code}${tail ? `: ${tail}` : ''}`, log: output };
  return { state: 'ok', text: tail ? `Uscito con 0 · ${tail}` : 'Uscito con 0', log: output };
}
