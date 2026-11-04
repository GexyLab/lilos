import { pipes, PipeStopped } from './pipes.js';
import { locale } from './locale.js';

/**
 * The system's events (see pipes.js), declared once here so that each one gets its pipe however
 * many places run it. Data of each event, and what a handler may change:
 *
 * Open to apps (before and after):
 *   file.open      { node, app }               before: change `app` (who opens it), or stop
 *   file.read      { node } → { node, content }   before: stop; after: change `content` (a Blob)
 *   file.write     { node, content } → { node }   before: change `content`, or stop
 *   app.launch     { id, entry, args }         before: change `args`, or stop
 *
 * Open to apps, only to look at (after); before is for lilOS's own synchronous handlers:
 *   file.create { node }   file.rename { node, from }   file.move { node, from }   file.copy { node, source }
 *   file.remove { node, ids }   trash.put { ids }   trash.restore { ids }   trash.purge { count, ids }
 *   tags.assign { node, tags }   window.open { app, entry, title }   window.close { app, entry, title }
 *   workspace.switch { from, to }   settings.change { key, value }
 *   desk.place { workspace, reason: 'drag' | 'arrange' | 'place', items: [{ node, x, y, from: { x, y } }] }
 *   device.attach { kind: 'drive' | 'serial', id, name, path? }   device.detach { kind, id, name }
 *                  (only inside the program lilOS: a USB stick or memory card, a serial port)
 *
 * Protected (only lilOS and system apps), to look at:
 *   system.ready { at }   session.login { user, workspace }   session.logout {}
 *   apps.install { id, version }   apps.update { id, version, from }   apps.remove { id }
 *   permissions.change { id, granted }   settings.system { isolated }   pipes.change {}
 *
 * Contents travel as Blobs (bytes): a handler that changes one gives back a Blob or a string.
 */
const { t } = locale.define('lilos:sdk.pipeCatalog', {
  en: { strings: {
    content: 'The content must be a Blob or a text',
    'label.file.open': 'Opening a file',
    'label.file.read': 'Reading a file',
    'label.file.write': 'Saving a file',
    'label.app.launch': 'Starting an app',
    'label.file.create': 'Creating an item',
    'label.file.rename': 'Renaming',
    'label.file.move': 'Moving',
    'label.file.copy': 'Copying a file',
    'label.file.remove': 'Deleting for good',
    'label.trash.put': 'Moving to the Trash',
    'label.trash.restore': 'Restoring from the Trash',
    'label.trash.purge': 'Emptying the Trash',
    'label.tags.assign': 'Tags of an item',
    'label.window.open': 'Opening a window',
    'label.window.close': 'Closing a window',
    'label.workspace.switch': 'Switching workspace',
    'label.settings.change': 'Changing a setting',
    'label.desk.place': 'Icons moved on the desktop',
    'label.device.attach': 'Connecting a device',
    'label.device.detach': 'Disconnecting a device',
    'label.system.ready': 'System ready',
    'label.session.login': 'User signed in',
    'label.session.logout': 'Signing out',
    'label.apps.install': 'Installing an app',
    'label.apps.update': 'Updating an app',
    'label.apps.remove': 'Removing an app',
    'label.permissions.change': 'Permissions of an app',
    'label.settings.system': 'System settings',
    'label.pipes.change': 'Pipe subscriptions',
    'description.file.open': 'Before a file opens in its app',
    'description.file.read': 'The content of a file read by an app',
    'description.file.write': 'The content of a file before it is saved',
    'description.app.launch': 'An app, or one of its windows, is about to open',
  } },
});

const toBlob = v => (v instanceof Blob ? v : v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? new Blob([v]) : typeof v === 'string' ? new Blob([v]) : null);

function content(data) {
  const blob = toBlob(data.content);
  if (!blob) throw new Error(t('content'));
  return { ...data, content: blob };
}

// lilOS's own synchronous handlers may stop these (runSync): apps only look at them. Labels are
// functions: they follow the system's language (pipes.describe)
const observe = (name, label) => pipes.define(name, { label, sync: true, stop: true });
const reserved = (name, label) => pipes.define(name, { label, protected: true, sync: true });

pipes.define('file.open', { label: () => t('label.file.open'), description: () => t('description.file.open'), edit: { before: ['app'] }, stop: true });
pipes.define('file.read', { label: () => t('label.file.read'), description: () => t('description.file.read'), edit: { after: ['content'] }, stop: true, check: (d, stage) => (stage === 'after' ? content(d) : d) });
pipes.define('file.write', { label: () => t('label.file.write'), description: () => t('description.file.write'), edit: { before: ['content'] }, stop: true, check: (d, stage) => (stage === 'before' ? content(d) : d) });
pipes.define('app.launch', { label: () => t('label.app.launch'), description: () => t('description.app.launch'), edit: { before: ['args'] }, stop: true });

observe('file.create', () => t('label.file.create'));
observe('file.rename', () => t('label.file.rename'));
observe('file.move', () => t('label.file.move'));
observe('file.copy', () => t('label.file.copy'));
observe('file.remove', () => t('label.file.remove'));
observe('trash.put', () => t('label.trash.put'));
observe('trash.restore', () => t('label.trash.restore'));
observe('trash.purge', () => t('label.trash.purge'));
observe('tags.assign', () => t('label.tags.assign'));
observe('window.open', () => t('label.window.open'));
observe('window.close', () => t('label.window.close'));
observe('workspace.switch', () => t('label.workspace.switch'));
observe('settings.change', () => t('label.settings.change'));
observe('desk.place', () => t('label.desk.place'));
observe('device.attach', () => t('label.device.attach'));
observe('device.detach', () => t('label.device.detach'));

reserved('system.ready', () => t('label.system.ready'));
reserved('session.login', () => t('label.session.login'));
reserved('session.logout', () => t('label.session.logout'));
reserved('apps.install', () => t('label.apps.install'));
reserved('apps.update', () => t('label.apps.update'));
reserved('apps.remove', () => t('label.apps.remove'));
reserved('permissions.change', () => t('label.permissions.change'));
reserved('settings.system', () => t('label.settings.system'));
reserved('pipes.change', () => t('label.pipes.change'));

export { pipes, PipeStopped };
