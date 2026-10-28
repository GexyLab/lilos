import { fs, openMenu } from '@lilos/sdk';

/**
 * Removes nodes from the file system. Removing is permanent: when a folder with something
 * inside is involved, a small menu at (x, y) asks for confirmation first.
 */
export function confirmRemove(ids, x, y) {
  const nodes = ids.map(id => fs.get(id)).filter(n => n && !n.system);
  const inside = nodes.reduce((sum, n) => sum + (n.type === 'folder' ? fs.count(n.id) : 0), 0);
  const run = () => nodes.forEach(n => { if (fs.exists(n.id)) fs.remove(n.id); });
  if (!inside) return run();
  const what = nodes.length === 1 ? `«${nodes[0].name}»` : `${nodes.length} elementi`;
  openMenu(x, y, [
    { label: `Elimina ${what} e ${inside === 1 ? 'l’elemento' : `i ${inside} elementi`} dentro`, icon: 'trash', danger: true, action: run },
    { label: 'Annulla', icon: 'x', action: () => {} },
  ]);
}
