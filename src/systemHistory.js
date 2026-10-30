import { history, shortcuts, toast, menus } from '@lilos/sdk';

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

  const group = 'Modifica';
  shortcuts.register({
    id: 'edit.undo', label: 'Annulla', group, keys: ['Ctrl+Z'], whenEditing: true, repeat: true,
    when: () => history.handles('undo'), run: () => history.undo(),
  });
  shortcuts.register({
    id: 'edit.redo', label: 'Ripeti', group, keys: ['Ctrl+Y', 'Ctrl+Shift+Z'], whenEditing: true, repeat: true,
    when: () => history.handles('redo'), run: () => history.redo(),
  });

  history.on('undo', ({ label }) => { if (label) toast(`Annullato: ${label}`); });
  history.on('redo', ({ label }) => { if (label) toast(`Ripetuto: ${label}`); });
  history.on('error', ({ error }) => toast(`Non si può più fare: ${error?.message ?? 'errore'}`));

  // Usable in the menus (Sistema → Usabilità → Menu contestuale): on the desk's history
  menus.defineAction('edit.undo', {
    label: 'Annulla', icon: 'undo', shortcut: 'edit.undo',
    enabled: () => root.canUndo, run: () => history.undoOn(root),
  });
  menus.defineAction('edit.redo', {
    label: 'Ripeti', icon: 'redo', shortcut: 'edit.redo',
    enabled: () => root.canRedo, run: () => history.redoOn(root),
  });
}
