import { pipes, PipeStopped } from './pipes.js';

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
 *   file.remove { node, ids }   trash.put { ids }   trash.restore { ids }   trash.purge { count }
 *   tags.assign { node, tags }   window.open { app, entry, title }   window.close { app, entry, title }
 *   workspace.switch { from, to }   settings.change { key, value }
 *
 * Protected (only lilOS and system apps), to look at:
 *   system.ready { at }   session.login { user, workspace }   session.logout {}
 *   apps.install { id, version }   apps.update { id, version, from }   apps.remove { id }
 *   permissions.change { id, granted }   settings.system { isolated }   pipes.change {}
 *
 * Contents travel as Blobs (bytes): a handler that changes one gives back a Blob or a string.
 */
const toBlob = v => (v instanceof Blob ? v : v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? new Blob([v]) : typeof v === 'string' ? new Blob([v]) : null);

function content(data) {
  const blob = toBlob(data.content);
  if (!blob) throw new Error('Il contenuto deve essere un Blob o un testo');
  return { ...data, content: blob };
}

// lilOS's own synchronous handlers may stop these (runSync): apps only look at them
const observe = (name, label) => pipes.define(name, { label, sync: true, stop: true });
const reserved = (name, label) => pipes.define(name, { label, protected: true, sync: true });

pipes.define('file.open', { label: 'Apertura di un file', description: 'Prima che un file si apra nella sua app', edit: { before: ['app'] }, stop: true });
pipes.define('file.read', { label: 'Lettura di un file', description: 'Il contenuto di un file letto da un’app', edit: { after: ['content'] }, stop: true, check: (d, stage) => (stage === 'after' ? content(d) : d) });
pipes.define('file.write', { label: 'Salvataggio di un file', description: 'Il contenuto di un file prima che si salvi', edit: { before: ['content'] }, stop: true, check: (d, stage) => (stage === 'before' ? content(d) : d) });
pipes.define('app.launch', { label: 'Avvio di un’app', description: 'Un’app, o una sua finestra, sta per aprirsi', edit: { before: ['args'] }, stop: true });

observe('file.create', 'Creazione di un elemento');
observe('file.rename', 'Cambio di nome');
observe('file.move', 'Spostamento');
observe('file.copy', 'Copia di un file');
observe('file.remove', 'Eliminazione definitiva');
observe('trash.put', 'Spostamento nel Cestino');
observe('trash.restore', 'Ripristino dal Cestino');
observe('trash.purge', 'Svuotamento del Cestino');
observe('tags.assign', 'Tag di un elemento');
observe('window.open', 'Apertura di una finestra');
observe('window.close', 'Chiusura di una finestra');
observe('workspace.switch', 'Cambio di workspace');
observe('settings.change', 'Cambio di un’impostazione');

reserved('system.ready', 'Sistema pronto');
reserved('session.login', 'Utente entrato');
reserved('session.logout', 'Uscita dall’account');
reserved('apps.install', 'Installazione di un’app');
reserved('apps.update', 'Aggiornamento di un’app');
reserved('apps.remove', 'Rimozione di un’app');
reserved('permissions.change', 'Permessi di un’app');
reserved('settings.system', 'Impostazioni di sistema');
reserved('pipes.change', 'Iscrizioni alle pipe');

export { pipes, PipeStopped };
