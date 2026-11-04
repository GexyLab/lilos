import { history, shortcuts, menus, locale } from '@lilos/sdk';
import { notify } from './notifications/notify.js';

const { t } = locale.define('lilos:systemHistory', {
  en: { strings: {
    group: 'Edit', undo: 'Undo', redo: 'Redo',
    undone: 'Undone: {label}', redone: 'Redone: {label}',
    failed: 'This can no longer be done: {message}', error: 'error',
  } },
});

/**
 * Central undo / redo: Ctrl Z, Ctrl Y and Ctrl Shift Z act on the history of whoever has the
 * focus (see `history` in the SDK). The desk's history is the root, used while no window is
 * active; windows and panels attach their own. Inside text fields the browser keeps its own undo
 * unless the place says it handles text.
 *
 * Each step is confirmed with a short message ("Annullato: Rinomina…"); a step that cannot be
 * done any more (what it acted on is gone) is dropped and said so.
 */
export function setupHistory({ root, activeWindow }) {
  history.setRoot(root);
  history.setContext(() => activeWindow()?.el ?? null);

  const group = t('group');
  shortcuts.register({
    id: 'edit.undo', label: t('undo'), group, keys: ['Ctrl+Z'], whenEditing: true, repeat: true,
    when: () => history.handles('undo'), run: () => history.undo(),
  });
  shortcuts.register({
    id: 'edit.redo', label: t('redo'), group, keys: ['Ctrl+Y', 'Ctrl+Shift+Z'], whenEditing: true, repeat: true,
    when: () => history.handles('redo'), run: () => history.redo(),
  });

  history.on('undo', ({ label }) => { if (label) notify(t('undone', { label })); });
  history.on('redo', ({ label }) => { if (label) notify(t('redone', { label })); });
  history.on('error', ({ error }) => notify(t('failed', { message: error?.message ?? t('error') }), { level: 'error' }));

  // Usable in the menus (Control Panel → Usabilità → Menu contestuale): on the desk's history
  menus.defineAction('edit.undo', {
    label: t('undo'), icon: 'undo', shortcut: 'edit.undo',
    enabled: () => root.canUndo, run: () => history.undoOn(root),
  });
  menus.defineAction('edit.redo', {
    label: t('redo'), icon: 'redo', shortcut: 'edit.redo',
    enabled: () => root.canRedo, run: () => history.redoOn(root),
  });
}
