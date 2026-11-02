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
 *   Optional, for big contents (the kernel falls back to read/write, whole in memory, without them):
 *   readStream(principal, id, { start }) → Readable     the content from byte `start`
 *   writeFrom(principal, id, source, { signal }) → size  the content from a stream of bytes; it becomes
 *                                                       the file's only once all of it arrived
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
 *
 * notifications  Messages for a user from lilOS and the apps (notifications-basic). Optional: without
 *                it lilOS keeps them only in the page. The kernel checks who sends (api/notifications.js).
 *   send(userId, { from, level, text, action }) → notification   throws 'rate_limited'
 *     from    { app, name } (the app that sends) | { system: true } (lilOS)
 *     level   'info' | 'success' | 'warning' | 'error';  action  { entry, args } | null: what a click opens
 *   list(principal) → { keep, items: [notification] }   newest first
 *   read(principal, ids | null)     null: all of them;  remove(principal, ids | null)
 *   setOptions(principal, { keep }) → { keep }           how many it keeps (1-200)
 *   notification: { id, at, from, level, text, action, read }
 *   It tells the user's pages with ctx.emit: 'notification.new' { id }, 'notification.change' {}.
 *
 * scheduler  Operations at a date and time or repeated, also with lilOS closed (module scheduler).
 *            REQUIRED: the kernel does not start without it, and puts the module back when it is
 *            missing (modules.js REQUIRED_MODULES). It keeps the operations, their clock and history;
 *            what they do is the kernel's (schedule/), which checks it before save() and does it in
 *            host.run(). Who sees what is the module's: a user their own, an admin everybody's.
 *   start(host)    the kernel is ready: the clock starts. host:
 *     rules                          the SDK's scheduleRules.js (checkWhen, nextAfter, gap, moveWhen, RuleError)
 *     run(task, run, signal) → Promise<{ state?: 'ok' | 'error' | 'waiting' | 'skipped', text, log }>
 *                                    does it ('waiting': a browser operation and no lilOS open: the run
 *                                    stays until resolve() or it expires); a throw is an error
 *     notify(task, run)              tell the owner how it went (the task's options.notify)
 *     changed(owner, ids)            operations of `owner` changed; ran(run): a run started or ended
 *   list(principal, { owner, app }) → [task]          get(principal, id) → task | null
 *   save(principal, task) → task                       without id: a new one (owner: admins may give another)
 *   remove(principal, ids) → ids                       setEnabled(principal, id, on) → task
 *   runNow(principal, id) → run                        cancel(principal, runId) → run
 *   history(principal, { task, owner, limit, before, state }) → [run]   newest first
 *   pending(principal) → [run]                         its browser runs waiting for lilOS
 *   resolve(principal, runId, { state, text, log }) → run              a browser run done or skipped
 *   occurrences(principal, { from, to, owner, task }) → { items, series }   planned and done, ≤ 62 days
 *   move(principal, id, { at, to, scope: 'this' | 'all' }) → task      only when, never what
 *   dropApp(appId), dropOwner(userId)                  an app uninstalled, a user removed: theirs go
 *   task, run, occurrence: see the module (modules/scheduler_*). Events go through host, not ctx.emit.
 */
export const INTERFACES = {
  auth: ['login', 'session', 'logout', 'logoutAll'],
  users: ['get', 'list', 'create', 'setPassword', 'remove'],
  fs: ['home', 'stat', 'list', 'tree', 'lookup', 'apply', 'read', 'write', 'remove'],
  runtime: ['start'],
  notifications: ['send', 'list', 'read', 'remove', 'setOptions'],
  scheduler: ['start', 'list', 'get', 'save', 'remove', 'setEnabled', 'runNow', 'cancel', 'history', 'pending', 'resolve', 'occurrences', 'move', 'dropApp', 'dropOwner'],
};

export const KERNEL = Object.freeze({ kind: 'kernel' });

/** Throws if `impl` lacks a method the kernel calls on `name`. */
export function checkService(name, impl) {
  const missing = (INTERFACES[name] ?? []).filter(m => typeof impl?.[m] !== 'function');
  if (missing.length) throw new Error(`Il servizio "${name}" non ha: ${missing.join(', ')}`);
}
