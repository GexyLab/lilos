import { shortcuts } from '@lilos/sdk';

/**
 * Item commands (open, rename, delete, select all, deselect) shared by every view of items:
 * the desktop and the File Manager. Each view adds a target; the commands act on the one
 * that is active (the desktop while no window is focused, a File Manager while its window is).
 *
 *   target: { isActive(), selectionSize(), open(), rename(), remove(), selectAll(), deselect() }
 */
const targets = new Set();

/** Returns the function that removes the target. */
export function addTarget(target) {
  targets.add(target);
  return () => targets.delete(target);
}

export const activeTarget = () => [...targets].find(t => t.isActive()) ?? null;

export function registerItemCommands() {
  const group = 'Elementi';
  const size = () => activeTarget()?.selectionSize() ?? 0;
  shortcuts.register({ id: 'items.open', label: 'Apri gli elementi selezionati', group, keys: ['Enter'], when: () => size() > 0, run: () => activeTarget().open() });
  shortcuts.register({ id: 'items.rename', label: 'Rinomina', group, keys: ['F2'], when: () => size() === 1, run: () => activeTarget().rename() });
  shortcuts.register({ id: 'items.delete', label: 'Elimina gli elementi selezionati', group, keys: ['Delete'], when: () => size() > 0, run: () => activeTarget().remove() });
  shortcuts.register({ id: 'items.selectAll', label: 'Seleziona tutto', group, keys: ['Ctrl+A'], when: () => !!activeTarget(), run: () => activeTarget().selectAll() });
  shortcuts.register({ id: 'items.deselect', label: 'Togli la selezione', group, keys: ['Escape'], when: () => size() > 0, run: () => activeTarget().deselect() });
}
