/**
 * Permissions an app may ask for in its manifest ("permissions"). Levels:
 *   implicit   given without asking
 *   install    shown at installation: who installs grants them (`grant`)
 *   use        granted at installation, asked again to the user each time they are used
 *   reserved   only for system apps (from the official repository)
 *
 * Parameters follow a colon: 'fs.read:~/Documenti', 'net:https://api.example.com', 'apps.call:notes'.
 */
export const PERMISSIONS = {
  'fs.app': { level: 'implicit', label: 'I propri dati' },
  'fs.tmp': { level: 'implicit', label: 'I propri file temporanei' },
  'fs.open': { level: 'implicit', label: 'I file che apri con l’app' },
  'fs.read': { level: 'install', label: 'Leggere i file in', param: 'path' },
  'fs.write': { level: 'install', label: 'Leggere e modificare i file in', param: 'path' },
  'fs.workspaces': { level: 'reserved', label: 'Vedere i file privati di tutti i workspace' },
  'tags.read': { level: 'install', label: 'Vedere i tag' },
  'tags.write': { level: 'install', label: 'Creare e assegnare tag' },
  'desktop.items': { level: 'install', label: 'Mettere elementi sulla scrivania' },
  'desktop.widget': { level: 'install', label: 'Mostrare widget sulla scrivania' },
  'ui.notify': { level: 'implicit', label: 'Mostrare avvisi' },
  'ui.menus': { level: 'install', label: 'Aggiungere voci ai menu' },
  'ui.commands': { level: 'install', label: 'Aggiungere comandi' },
  'ui.shortcuts': { level: 'install', label: 'Aggiungere scorciatoie da tastiera' },
  'clipboard.write': { level: 'implicit', label: 'Copiare negli appunti' },
  'clipboard.read': { level: 'use', label: 'Leggere gli appunti' },
  net: { level: 'install', label: 'Collegarsi a', param: 'origin' },
  'media.camera': { level: 'use', label: 'Usare la fotocamera' },
  'media.microphone': { level: 'use', label: 'Usare il microfono' },
  geo: { level: 'use', label: 'Conoscere la posizione' },
  'apps.call': { level: 'install', label: 'Usare le azioni dell’app', param: 'app' },
  'ai.use': { level: 'install', label: 'Usare l’intelligenza artificiale' },
  'ai.expose': { level: 'install', label: 'Rendere le proprie azioni disponibili all’assistente' },
  background: { level: 'install', label: 'Lavorare anche quando lilOS è chiuso' },
  'auth.remote': { level: 'implicit', label: 'Accedere al proprio servizio' },
  'apps.manage': { level: 'reserved', label: 'Installare e rimuovere app' },
  'workspaces.manage': { level: 'reserved', label: 'Gestire i workspace' },
  'settings.system': { level: 'reserved', label: 'Cambiare le impostazioni di sistema' },
};

const PARAM = {
  path: v => /^~(\/[^/\0]{1,255}){0,16}$/.test(v) && !v.split('/').includes('..'),
  origin: v => {
    try {
      const u = new URL(v);
      return (u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost')) && u.origin === v;
    } catch {
      return false;
    }
  },
  app: v => /^[a-z0-9][a-z0-9.-]{1,63}$/.test(v),
};

/** { name, param, level, label } for a permission string, or null if it is not one. */
export function parsePermission(text) {
  if (typeof text !== 'string' || text.length > 300) return null;
  // 'net:https://…' has more colons: the name is what comes before the first one
  const i = text.indexOf(':');
  const name = i < 0 ? text : text.slice(0, i);
  const param = i < 0 ? null : text.slice(i + 1);
  const def = PERMISSIONS[name];
  if (!def || (def.param ? !param || !PARAM[def.param](param) : param !== null)) return null;
  return { name, param, level: def.level, label: def.label };
}

/** The permissions that need someone's consent (not implicit). */
export const needsGrant = list => list.filter(p => parsePermission(p).level !== 'implicit');

/** True if `path` ('~/Documenti/Note/a.md') is inside a path granted by fs.write (or fs.read when reading). */
export function coversPath(permissions, path, { write = true } = {}) {
  return permissions.some(p => {
    const parsed = parsePermission(p);
    if (!parsed || (parsed.name !== 'fs.write' && (write || parsed.name !== 'fs.read'))) return false;
    const base = parsed.param.toLowerCase();
    const target = path.toLowerCase();
    return target === base || target.startsWith(base === '~' ? '~/' : `${base}/`);
  });
}
