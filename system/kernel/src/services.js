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
 *
 * runtime  Runs the services of installed apps (manifest entry points of kind 'service'), each isolated
 *          from the kernel and from the others. Optional: without it lilOS has no services.
 *   start({ key, code, info, limits }, host) → Promise<handle>   resolves when the entry point has started
 *     code    the ES module of the service; its export named info.entry gets ({ lilos, args })
 *     info    { id, version, entry, args, user: { id, username, name } | null }
 *     limits  { memoryMb, cpuMs }   memory of the service, time a single run of its code may take
 *     host    { call(method, params) → Promise   the lilos API, checked by the kernel (apps/serviceApi.js)
 *               log(level, text)                 what the service writes with console.*
 *               exit(reason) }                   it stopped by itself (error, memory, crash)
 *   handle: { request(data, from) → Promise<result>   what its lilos.handle() function returns
 *             stop() → Promise }
 */
export const INTERFACES = {
  auth: ['login', 'session', 'logout', 'logoutAll'],
  users: ['get', 'list', 'create', 'setPassword', 'remove'],
  fs: ['home', 'stat', 'list', 'tree', 'lookup', 'apply', 'read', 'write', 'remove'],
  runtime: ['start'],
};

export const KERNEL = Object.freeze({ kind: 'kernel' });

/** Throws if `impl` lacks a method the kernel calls on `name`. */
export function checkService(name, impl) {
  const missing = (INTERFACES[name] ?? []).filter(m => typeof impl?.[m] !== 'function');
  if (missing.length) throw new Error(`Il servizio "${name}" non ha: ${missing.join(', ')}`);
}
