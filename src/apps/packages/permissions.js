import { locale } from '@lilos/sdk';

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

// The labels with {target} take the permission's param ('fs.read:~/Documenti')
const { t } = locale.define('lilos:apps.permissions', {
  en: { strings: {
    'fs.app': 'Its own data', 'fs.tmp': 'Its own temporary files', 'fs.open': 'The files you open with the app',
    'fs.read': 'Read the files in {target}', 'fs.write': 'Read and change the files in {target}', 'fs.workspaces': 'See the private files of every workspace',
    'fs.preview': 'Ask the app that opens files for their preview',
    'tags.read': 'See the tags', 'tags.write': 'Create and assign tags', 'desktop.items': 'Put items on the desktop',
    'desktop.widget': 'Show widgets on the desktop', 'ui.notify': 'Show notices', 'ui.menus': 'Add menu items',
    'ui.commands': 'Add commands', 'ui.shortcuts': 'Add keyboard shortcuts', 'clipboard.write': 'Copy to the clipboard',
    'clipboard.read': 'Read the clipboard', net: 'Connect to {target}', term: 'Open remote terminals (SSH, Telnet…) and use the saved hosts',
    calls: 'Make network requests from the kernel (HTTP, WebSocket, TCP, gRPC, MQTT…) to any server', 'media.camera': 'Use the camera', 'media.microphone': 'Use the microphone',
    geo: 'Know the location', 'apps.call': 'Start parts of the app {target}', 'ai.use': 'Use artificial intelligence',
    'ai.expose': 'Make its actions available to the assistant', background: 'Work even when lilOS is closed',
    'auth.remote': 'Sign in to its own service', 'apps.manage': 'Install and remove apps', 'workspaces.manage': 'Manage workspaces',
    'settings.system': 'Change the system settings', pipe: 'See and change what goes through the event {target}',
    'pipe.own': 'Manage its own files in the event {target}',
    serial: 'Use the serial and USB ports of your computer (boards like Arduino)', kernel: 'Use the kernel module {target}',
    schedule: 'Schedule operations (its own: reminders, its services, opening itself)',
    'schedule.read': 'See all the scheduled operations',
    'schedule.move': 'See and move in time the scheduled operations',
    other: '{permission} {target}', home: 'Home',
  } },
});

const LABELS = new Set(['fs.app', 'fs.tmp', 'fs.open', 'fs.read', 'fs.write', 'fs.workspaces', 'fs.preview', 'tags.read', 'tags.write',
  'desktop.items', 'desktop.widget', 'ui.notify', 'ui.menus', 'ui.commands', 'ui.shortcuts', 'clipboard.write', 'clipboard.read', 'net',
  'term', 'calls', 'media.camera', 'media.microphone', 'geo', 'apps.call', 'ai.use', 'ai.expose', 'background', 'auth.remote',
  'apps.manage', 'workspaces.manage', 'settings.system', 'pipe', 'pipe.own', 'serial', 'kernel', 'schedule', 'schedule.read', 'schedule.move']);
const TARGETED = new Set(['fs.read', 'fs.write', 'net', 'apps.call', 'pipe', 'pipe.own', 'kernel']);

/** 'fs.read:~/Documenti' → 'Read the files in Home/Documenti', in the system's language. */
export function describePermission(permission) {
  const i = permission.indexOf(':');
  const name = i < 0 ? permission : permission.slice(0, i);
  const param = i < 0 ? '' : permission.slice(i + 1);
  const target = param.replace(/^~/, t('home'));
  if (TARGETED.has(name)) return t(name, { target }).trim();
  const label = LABELS.has(name) ? t(name) : name;
  return param ? t('other', { permission: label, target }) : label;
}
