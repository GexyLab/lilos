/**
 * Checks on the permissions of an installed app, the same rules as the kernel's
 * (system/kernel/src/apps/permissions.js): 'fs.read:~/Documenti' lets the app read inside
 * ~/Documenti, 'fs.write:…' read and write.
 */
export function coversPath(permissions, path, { write = true } = {}) {
  if (typeof path !== 'string' || !/^~(\/[^/\0]+)*$/.test(path) || path.split('/').includes('..')) return false;
  const target = path.toLowerCase();
  return permissions.some(p => {
    const m = /^fs\.(read|write):(.+)$/.exec(p);
    if (!m || (write && m[1] !== 'write')) return false;
    const base = m[2].toLowerCase();
    return target === base || target.startsWith(base === '~' ? '~/' : `${base}/`);
  });
}

export const hasPermission = (permissions, name) => permissions.includes(name);
