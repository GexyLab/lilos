/**
 * Services the kernel itself uses. A module may provide any service (any name): for these the
 * kernel also checks that the methods it calls are there.
 *
 * A principal says who is asking: { kind: 'user', id, username, name, role } for a person,
 * { kind: 'kernel' } for the kernel itself. Modules decide what each principal may do.
 *
 * auth   Signs users in and keeps their sessions.
 *   login(username, password, { ip }) → { token, user, expires }     throws 'invalid_credentials' | 'rate_limited'
 *   session(token) → user | null                                      user: { id, username, name, role }
 *   logout(token)
 *   logoutAll(userId)
 *
 * users  The people who can use lilOS.
 *   get(id) → user | null; list() → [user]
 *   create({ username, name, password, role }) → user; setPassword(id, password); remove(id)
 *
 * fs     The file system, access control included: every method gets the principal and refuses
 *        what it may not do ('not_found' for what it may not see, 'forbidden' for what it may not change).
 *   home(principal) → { id, path, created }       the user's home, made on first use
 *   stat(principal, id) → node | null
 *   list(principal, id) → [node]
 *   tree(principal, id, { content }) → [node]     the node and everything inside it
 *   lookup(principal, path) → node | null
 *   apply(principal, { put: [node], remove: [id] })   one transaction: creates, updates, moves, removes
 *   read(principal, id) → Buffer
 *   write(principal, id, Buffer)
 *   remove(principal, ids)
 *
 *   node: { id, parent, name, type: 'folder' | 'file' | 'app', meta: {}, size, created, modified, content? }
 */
export const INTERFACES = {
  auth: ['login', 'session', 'logout', 'logoutAll'],
  users: ['get', 'list', 'create', 'setPassword', 'remove'],
  fs: ['home', 'stat', 'list', 'tree', 'lookup', 'apply', 'read', 'write', 'remove'],
};

export const KERNEL = Object.freeze({ kind: 'kernel' });

/** Throws if `impl` lacks a method the kernel calls on `name`. */
export function checkService(name, impl) {
  const missing = (INTERFACES[name] ?? []).filter(m => typeof impl?.[m] !== 'function');
  if (missing.length) throw new Error(`Il servizio "${name}" non ha: ${missing.join(', ')}`);
}
