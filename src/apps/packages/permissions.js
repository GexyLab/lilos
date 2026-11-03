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

/** The permissions every app has without asking (the kernel's level 'implicit'). */
export const IMPLICIT_PERMISSIONS = Object.freeze(['fs.app', 'fs.tmp', 'fs.open', 'ui.notify', 'clipboard.write', 'auth.remote']);

/** The permissions of a list that need the user's consent ('fs.read:~/Documenti' yes, 'ui.notify' no), as the kernel's needsGrant. */
export const needsGrant = permissions => (Array.isArray(permissions) ? permissions : []).filter(p => typeof p === 'string' && !IMPLICIT_PERMISSIONS.includes(p.split(':')[0]));

const LABELS = {
  'fs.app': 'I propri dati', 'fs.tmp': 'I propri file temporanei', 'fs.open': 'I file che apri con l’app',
  'fs.read': 'Leggere i file in', 'fs.write': 'Leggere e modificare i file in', 'fs.workspaces': 'Vedere i file privati di tutti i workspace',
  'fs.preview': 'Chiedere l’anteprima dei file all’app che li apre',
  'tags.read': 'Vedere i tag', 'tags.write': 'Creare e assegnare tag', 'desktop.items': 'Mettere elementi sulla scrivania',
  'desktop.widget': 'Mostrare widget sulla scrivania', 'ui.notify': 'Mostrare avvisi', 'ui.menus': 'Aggiungere voci ai menu',
  'ui.commands': 'Aggiungere comandi', 'ui.shortcuts': 'Aggiungere scorciatoie da tastiera', 'clipboard.write': 'Copiare negli appunti',
  'clipboard.read': 'Leggere gli appunti', net: 'Collegarsi a', term: 'Aprire terminali remoti (SSH, Telnet…) e usare gli host salvati',
  calls: 'Fare richieste di rete dal kernel (HTTP, WebSocket, TCP, gRPC, MQTT…) verso qualunque server', 'media.camera': 'Usare la fotocamera', 'media.microphone': 'Usare il microfono',
  geo: 'Conoscere la posizione', 'apps.call': 'Avviare parti dell’app', 'ai.use': 'Usare l’intelligenza artificiale',
  'ai.expose': 'Rendere le proprie azioni disponibili all’assistente', background: 'Lavorare anche quando lilOS è chiuso',
  'auth.remote': 'Accedere al proprio servizio', 'apps.manage': 'Installare e rimuovere app', 'workspaces.manage': 'Gestire i workspace',
  'settings.system': 'Cambiare le impostazioni di sistema', pipe: 'Vedere e cambiare ciò che passa dall’evento',
  'pipe.own': 'Gestire i propri file nell’evento',
  serial: 'Usare le porte seriali e USB del tuo computer (schede come Arduino)', kernel: 'Usare il modulo del kernel',
  schedule: 'Pianificare operazioni (le sue: promemoria, i suoi servizi, aprirsi)',
  'schedule.read': 'Vedere tutte le operazioni pianificate',
  'schedule.move': 'Vedere e spostare nel tempo le operazioni pianificate',
};

/** 'fs.read:~/Documenti' → 'Leggere i file in Home/Documenti'. */
export function describePermission(permission) {
  const i = permission.indexOf(':');
  const name = i < 0 ? permission : permission.slice(0, i);
  const param = i < 0 ? '' : permission.slice(i + 1);
  return `${LABELS[name] ?? name}${param ? ` ${param.replace(/^~/, 'Home')}` : ''}`;
}
