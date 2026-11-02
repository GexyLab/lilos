// Copy of modules/_shared/kernel.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import { netError } from './errors.js';

/**
 * What the drivers take from the kernel since lilOS 1.22.0: without it they stop with a clear
 * message instead of working around it (an older kernel has the module's update waiting).
 */
const OLD_KERNEL = 'Questo modulo richiede lilOS ≥ 1.22.0: aggiorna lilOS';

/**
 * The ctx (of init(), connect(), open()…) if it has every one of `members`, else the clear error:
 * jsonStore of init(), tokens of connect() and shares() (null when the connection has no refresh
 * token, which still counts as there), output and closed of the terminals' open().
 */
export function needKernel(ctx, ...members) {
  if (members.some(m => ctx?.[m] === undefined)) throw netError('unsupported', OLD_KERNEL);
  return ctx;
}

/**
 * ctx.lookup of connect(), shares() and open(): dns.lookup's signature, resolving only to the
 * addresses the kernel's NetGuard allows. Every connection a driver opens resolves through it, so
 * it goes to an address checked a moment ago (no DNS rebinding between the kernel's check and the
 * connection).
 */
export function needLookup(ctx) {
  if (typeof ctx?.lookup !== 'function') throw netError('unsupported', OLD_KERNEL);
  return ctx.lookup;
}

/**
 * ctx.paths: { cleanPath, joinPath, parentOf, baseName, isSafeName, cleanName } of the kernel's
 * net/drivers.js, from the first of `ctxs` that has it (the module's ctx or connect()'s).
 */
export function needPaths(...ctxs) {
  const paths = ctxs.find(c => c?.paths && typeof c.paths.baseName === 'function')?.paths;
  if (!paths) throw netError('unsupported', OLD_KERNEL);
  return paths;
}
