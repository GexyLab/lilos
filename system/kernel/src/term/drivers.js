import { FIELD_TYPES, protocolInfo } from '../net/drivers.js';

/**
 * Remote terminal protocols (the Terminale remoto app): a kernel module provides one as the
 * service 'term.<protocol>' (term-ssh gives 'term.ssh'). The kernel finds them when it starts.
 *
 *   label        string | { en, it, … }   the name the user picks ('SSH')
 *   order?       number                   its place in the list (lower first)
 *   port         number                   the usual port (shown, and used when the field is empty)
 *   fields       [field]                  what a connection asks for, as for the Rete protocols
 *                                          (net/drivers.js); 'host' is the server, 'port' its port
 *   secure       boolean | (values) → boolean   whether what passes is encrypted
 *   address(values) → string               how the connection is shown ('ssh://ann@host:2222')
 *   check?(values)                         throws (with `net`) if the values cannot be used as they are
 *   open(values, ctx) → session            connects (and signs in, when the protocol does it)
 *       ctx.secret     { key: value } of the secret fields, {} if none
 *       ctx.cols, ctx.rows                 the size of the screen
 *       ctx.term       the terminal type to announce ('xterm-256color')
 *       ctx.cwd        a folder to start in, or null (only protocols that can: SSH)
 *       ctx.ask(prompt, { echo }) → text   asks the user a line in the terminal itself (a password
 *                                          the server wants); rejects if the user gives up (Ctrl+C)
 *       ctx.confirm(trust) → boolean       the key or certificate the server showed,
 *                                          { kind: 'ssh' | 'tls', fingerprint, text }: true if the user
 *                                          trusts it (confirmed now or before, here or for a
 *                                          connection of the Rete folder: net/knownHosts.js), false to give up
 *       ctx.print(text)                    a line for the user in the terminal (what is going on)
 *       ctx.signal                         AbortSignal: the user closed the session while connecting
 *       ctx.output(Buffer)                 (since lilOS 1.21.0) what the server sends, as soon as it
 *                                          sends it: also before open() is over (a banner), nothing
 *                                          to keep aside
 *       ctx.closed({ reason, code?, signal? })   (since lilOS 1.21.0) the connection is over (reason:
 *                                          a message for the user, or ''; code and signal: how a
 *                                          command ended, for SSH); once, also before open() is over
 *       ctx.lookup                         (since lilOS 1.21.0) node's dns.lookup(hostname, options,
 *                                          callback), giving only addresses the kernel may connect
 *                                          to (net/guard.js): pass it to net/tls connect
 *       ctx.paths                          (since lilOS 1.21.0) the path helpers of net/drivers.js
 *
 * session (the bytes are what the screen of an xterm shows and sends: a protocol whose server
 * speaks another language, such as SUPDUP, translates both ways):
 *   onData?(fn(Buffer)), onClose?(fn({ reason }))   what drivers before lilOS 1.21.0 used instead
 *                              of ctx.output and ctx.closed: still listened to when there
 *   write(Buffer)              what the user types
 *   resize(cols, rows)
 *   signal?(name)              'break' (Telnet BREAK, SSH break), 'interrupt', 'ayt'…: see signals
 *   signals?                   [name] the ones it knows, for the Tasti menu
 *   pause?(), resume?()        stops reading from the server while the page catches up
 *   info?                      { fingerprint text… } shown in the status bar
 *   close()
 *
 * Errors carry `net` as for the Rete drivers: 'auth' (wrong credentials, after the user was asked
 * again), 'untrusted' (the user did not trust the server), 'unreachable', 'lost', 'invalid'…
 */
export const DRIVER_PREFIX = 'term.';
const KEY = /^[a-z][a-zA-Z0-9]{0,30}$/;

/** The protocols the active modules provide: Map id → driver. Drivers with a malformed description are left out. */
export function findDrivers(services, log) {
  const drivers = new Map();
  for (const [name, impl] of services) {
    if (!name.startsWith(DRIVER_PREFIX)) continue;
    const id = name.slice(DRIVER_PREFIX.length);
    try {
      if (!/^[a-z][a-z0-9-]{0,30}$/.test(id)) throw new Error('nome non valido');
      if (typeof impl?.open !== 'function' || typeof impl.address !== 'function') throw new Error('mancano open() o address()');
      if (!Array.isArray(impl.fields) || impl.fields.some(f => !KEY.test(f?.key ?? '') || !FIELD_TYPES.has(f.type))) throw new Error('campi non validi');
      if (!Number.isInteger(impl.port) || impl.port < 1 || impl.port > 65535) throw new Error('porta non valida');
      drivers.set(id, impl);
    } catch (err) {
      log.warn(`Protocollo di terminale ${name} ignorato: ${err.message}`);
    }
  }
  return drivers;
}

/** Whether a connection with these values is encrypted. */
export function isSecure(driver, values) {
  try {
    return typeof driver.secure === 'function' ? !!driver.secure(values) : driver.secure === true;
  } catch {
    return false;
  }
}

/** How the page sees a protocol: the Rete description plus its port and whether it is encrypted (null: it depends). */
export const termProtocolInfo = (id, d) => ({
  ...protocolInfo(id, d),
  port: d.port,
  secure: typeof d.secure === 'function' ? null : d.secure === true,
});
