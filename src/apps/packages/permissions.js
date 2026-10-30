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

const LABELS = {
  'fs.app': 'I propri dati', 'fs.tmp': 'I propri file temporanei', 'fs.open': 'I file che apri con l’app',
  'fs.read': 'Leggere i file in', 'fs.write': 'Leggere e modificare i file in', 'fs.workspaces': 'Vedere i file privati di tutti i workspace',
  'tags.read': 'Vedere i tag', 'tags.write': 'Creare e assegnare tag', 'desktop.items': 'Mettere elementi sulla scrivania',
  'desktop.widget': 'Mostrare widget sulla scrivania', 'ui.notify': 'Mostrare avvisi', 'ui.menus': 'Aggiungere voci ai menu',
  'ui.commands': 'Aggiungere comandi', 'ui.shortcuts': 'Aggiungere scorciatoie da tastiera', 'clipboard.write': 'Copiare negli appunti',
  'clipboard.read': 'Leggere gli appunti', net: 'Collegarsi a', 'media.camera': 'Usare la fotocamera', 'media.microphone': 'Usare il microfono',
  geo: 'Conoscere la posizione', 'apps.call': 'Avviare parti dell’app', 'ai.use': 'Usare l’intelligenza artificiale',
  'ai.expose': 'Rendere le proprie azioni disponibili all’assistente', background: 'Lavorare anche quando lilOS è chiuso',
  'auth.remote': 'Accedere al proprio servizio', 'apps.manage': 'Installare e rimuovere app', 'workspaces.manage': 'Gestire i workspace',
  'settings.system': 'Cambiare le impostazioni di sistema',
};

/** 'fs.read:~/Documenti' → 'Leggere i file in Home/Documenti'. */
export function describePermission(permission) {
  const i = permission.indexOf(':');
  const name = i < 0 ? permission : permission.slice(0, i);
  const param = i < 0 ? '' : permission.slice(i + 1);
  return `${LABELS[name] ?? name}${param ? ` ${param.replace(/^~/, 'Home')}` : ''}`;
}
