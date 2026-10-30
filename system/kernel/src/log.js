/** One line per event on stdout/stderr. Never log passwords, tokens or file contents. */
const write = (stream, level, scope, msg) => stream.write(`${new Date().toISOString()} ${level} [${scope}] ${msg}\n`);

export function logger(scope) {
  return {
    info: msg => write(process.stdout, 'INFO ', scope, msg),
    warn: msg => write(process.stderr, 'WARN ', scope, msg),
    error: (msg, err) => write(process.stderr, 'ERROR', scope, err ? `${msg}: ${err.stack ?? err}` : msg),
  };
}
