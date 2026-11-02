import { fs, net, openMenu, settings } from '@lilos/sdk';
import { removeNodes } from './fsHistory.js';

/**
 * Deleting files and folders, as set in Control Panel → Usabilità → Cestino: into the trash or for
 * good (deletePermanent), asking first or not (deleteConfirm).
 */

/** Removes nodes the way the settings say. With an undo history (stack), Ctrl Z puts them back. */
export const deleteNodes = (stack, ids) => removeNodes(stack, ids, { permanent: settings.get('deletePermanent') });

/**
 * "Sposta nel cestino «nome»", "Elimina definitivamente 3 elementi e i 12 elementi dentro"…
 * Items of a network connection go for good, from the server ("Elimina dal server…"), or into
 * the server's own recycle bin when its protocol has one ("Elimina da OneDrive… (nel suo cestino)").
 */
export function deleteLabel(nodes) {
  if (nodes.some(n => n.net)) {
    const what = nodes.length === 1 ? `«${nodes[0].name}»` : `${nodes.length} elementi`;
    const protocols = [...new Set(nodes.map(n => net.mount(n.net)?.protocol))].map(id => net.protocols.find(p => p.id === id));
    // What removing does there, as the protocol says it ("Togli dall’album …: restano in Google Foto")
    if (protocols.length === 1 && protocols[0]?.removeText) return `${nodes[0].removeLabel ? net.text(nodes[0].removeLabel) : 'Elimina'} ${what}: ${net.text(protocols[0].removeText)}`;
    if (protocols.length === 1 && protocols[0]?.recycles) return `Elimina da ${net.text(protocols[0].label)} ${what} (va nel suo cestino)`;
    return `Elimina dal server ${what}${nodes.some(n => n.type === 'folder') ? ' con tutto quello che contiene' : ''} (definitivo)`;
  }
  const inside = nodes.reduce((sum, n) => sum + (n.type === 'folder' ? fs.count(n.id) : 0), 0);
  const what = nodes.length === 1 ? `«${nodes[0].name}»` : `${nodes.length} elementi`;
  const verb = settings.get('deletePermanent') ? 'Elimina definitivamente' : 'Sposta nel cestino';
  return `${verb} ${what}${inside ? ` e ${inside === 1 ? 'l’elemento' : `i ${inside} elementi`} dentro` : ''}`;
}

/**
 * Removes nodes from the file system. If the settings ask for it (always, for items of a network
 * connection: they cannot come back), a small menu at (x, y) asks for confirmation first. With an undo history (stack), the removal is recorded there and Ctrl Z puts
 * everything back. `then` runs once the menu is answered (or right away without it).
 */
export function confirmRemove(ids, x, y, stack = null, { then } = {}) {
  const nodes = ids.map(id => fs.get(id)).filter(n => n && !n.system);
  if (!nodes.length) return;
  const run = async () => { await deleteNodes(stack, nodes.map(n => n.id)); then?.(); };
  if (!settings.get('deleteConfirm') && !nodes.some(n => n.net)) return run();
  openMenu(x, y, [
    { label: deleteLabel(nodes), icon: 'trash', danger: true, action: run },
    { label: 'Annulla', icon: 'x', action: () => then?.() },
  ]);
}
