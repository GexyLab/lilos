import { sshConnect } from './connect.js';
import { needLookup, needKernel } from './lib/shared/kernel.js';
import { netError } from './lib/shared/errors.js';

/**
 * SSH for the remote terminals (service 'term.ssh', see the kernel's term/drivers.js): a shell on a
 * server, with a password, a private key or the questions the server asks (keyboard-interactive,
 * such as a one-time code). What the user did not save is asked in the terminal itself, as ssh
 * does: the password (three tries), the passphrase of the key (connect.js). The server's key is
 * shown to the user to confirm the first time, and again with a warning if it changed (ctx.confirm).
 */

/** A word for the shell, quoted ('it'\''s'). */
const quote = text => `'${String(text).replace(/'/g, `'\\''`)}'`;

const label = (en, it) => ({ en, it });

export const term = {
  label: label('SSH', 'SSH'),
  order: 10,
  port: 22,
  secure: true,
  fields: [
    { key: 'host', type: 'text', label: label('Server', 'Server'), required: true, placeholder: 'example.com' },
    { key: 'port', type: 'number', label: label('Port', 'Porta'), min: 1, max: 65535, placeholder: '22' },
    { key: 'user', type: 'text', label: label('User', 'Utente'), required: true },
    {
      key: 'auth', type: 'select', label: label('Sign in with', 'Accesso'), default: 'password',
      options: [{ value: 'password', label: label('Password', 'Password') }, { value: 'key', label: label('SSH key', 'Chiave SSH') }],
    },
    {
      key: 'password', type: 'password', label: label('Password', 'Password'), secret: true, when: { auth: 'password' },
      hint: label('Empty: asked in the terminal when connecting', 'Vuota: chiesta nel terminale quando ti colleghi'),
    },
    { key: 'key', type: 'file', label: label('Private key', 'Chiave privata'), secret: true, required: true, when: { auth: 'key' }, hint: label('A file of lilOS, such as id_ed25519', 'Un file di lilOS, per esempio id_ed25519') },
    { key: 'passphrase', type: 'password', label: label('Key passphrase', 'Passphrase della chiave'), secret: true, when: { auth: 'key' }, hint: label('Empty: asked in the terminal if the key has one', 'Vuota: chiesta nel terminale se la chiave ne ha una') },
    { key: 'command', type: 'text', label: label('Command at start', 'Comando all’avvio'), placeholder: 'tmux new -A -s main', hint: label('Runs instead of the shell', 'Parte al posto della shell') },
  ],

  address: v => `ssh://${v.user ? `${v.user}@` : ''}${v.host ?? ''}${v.port && v.port !== 22 ? `:${v.port}` : ''}`,

  async open(values, ctx) {
    needKernel(ctx, 'output', 'closed');
    const { client, shown, cipher } = await sshConnect(values, {
      secret: ctx.secret ?? {}, lookup: needLookup(ctx), signal: ctx.signal,
      confirm: key => ctx.confirm(key), ask: (prompt, opts) => ctx.ask(prompt, opts), print: text => ctx.print(text),
    });
    const window = { term: ctx.term || 'xterm-256color', cols: ctx.cols, rows: ctx.rows, width: 0, height: 0 };
    const steps = [];
    if (ctx.cwd) steps.push(`cd ${quote(ctx.cwd)}`);
    if (values.command) steps.push(values.command);
    else if (ctx.cwd) steps.push('exec "${SHELL:-/bin/sh}" -l');
    return new Promise((resolve, reject) => {
      // Closed before the terminal opened
      const closed = () => reject(netError('unreachable', 'Connessione chiusa dal server'));
      client.once('close', closed);
      const started = (err, stream) => {
        client.off('close', closed);
        if (err) {
          client.end();
          return reject(netError('unsupported', `Il server non apre il terminale: ${err.message}`));
        }
        resolve(session(client, stream, ctx, { text: shown?.text ?? '', cipher }));
      };
      if (steps.length) client.exec(steps.join(' && '), { pty: window }, started);
      else client.shell(window, started);
    });
  },
};

function session(client, stream, ctx, info) {
  let code = null, signal = null, gone = null;
  const output = chunk => ctx.output(chunk);
  stream.on('data', output);
  stream.stderr?.on('data', output);
  // The server's exit-status (a number) or exit-signal (null and the signal's name, 'KILL')
  stream.on('exit', (c, name) => { code = Number.isInteger(c) ? c : null; signal = code === null && name ? String(name).replace(/^SIG/, '') : null; });
  // `code`/`signal` too, for those that want the exit status (the kernel's exec): both null when
  // the server told nothing (the connection was cut, or close() from here)
  const end = (reason, last = {}) => {
    if (gone) return;
    gone = { reason, code: null, signal: null, ...last };
    ctx.closed(gone);
    client.end();
  };
  stream.on('close', () => end(signal ? `Terminata dal segnale SIG${signal}` : code === null || code === 0 ? '' : `Uscita con codice ${code}`, { code, signal }));
  client.on('close', () => end('Connessione persa'));
  client.on('error', err => end(`Connessione persa: ${err.message}`));
  return {
    info: { key: info.text, cipher: info.cipher },
    signals: [],
    write(bytes) { stream.write(bytes); },
    resize(cols, rows) { stream.setWindow(rows, cols, 0, 0); },
    pause() { stream.pause(); },
    resume() { stream.resume(); },
    close() { end(''); },
  };
}
