import { fs, net, openMenu, settings, locale } from '@lilos/sdk';
import { removeNodes } from './fsHistory.js';

/**
 * Deleting files and folders, as set in Control Panel → Usabilità → Cestino: into the trash or for
 * good (deletePermanent), asking first or not (deleteConfirm). And the same small menu that asks
 * before anything that cannot be undone: deleting from the trash, emptying it.
 */

const { t, number } = locale.define('lilos:confirmRemove', {
  en: { strings: {
    cancel: 'Cancel',
    one: '“{name}”', many: '{count} items',
    trash: 'Move {what} to the trash', permanent: 'Delete {what} permanently',
    inside: { one: '{what} and the item inside', other: '{what} and the {count} items inside' },
    netRemoveText: '{verb} {what}: {text}', netRemove: 'Delete',
    netRecycles: 'Delete {what} from {service} (it goes to its recycle bin)',
    netServer: 'Delete {what} from the server (permanent)', netServerFolders: 'Delete {what} from the server with everything inside (permanent)',
    purge: 'Delete “{name}” permanently', purgeMany: 'Delete {count} items permanently',
    emptyTrash: { one: 'Delete the item in the trash permanently', other: 'Delete all {count} items in the trash permanently' },
  } },
});

const what = nodes => (nodes.length === 1 ? t('one', { name: nodes[0].name }) : t('many', { count: number(nodes.length) }));

/** Removes nodes the way the settings say. With an undo history (stack), Ctrl Z puts them back. */
export const deleteNodes = (stack, ids) => removeNodes(stack, ids, { permanent: settings.get('deletePermanent') });

/**
 * "Sposta nel cestino «nome»", "Elimina definitivamente 3 elementi e i 12 elementi dentro"…
 * Items of a network connection go for good, from the server ("Elimina dal server…"), or into
 * the server's own recycle bin when its protocol has one ("Elimina da OneDrive… (nel suo cestino)").
 */
export function deleteLabel(nodes) {
  if (nodes.some(n => n.net)) {
    const protocols = [...new Set(nodes.map(n => net.mount(n.net)?.protocol))].map(id => net.protocols.find(p => p.id === id));
    // What removing does there, as the protocol says it ("Togli dall’album …: restano in Google Foto")
    if (protocols.length === 1 && protocols[0]?.removeText) {
      return t('netRemoveText', { verb: nodes[0].removeLabel ? net.text(nodes[0].removeLabel) : t('netRemove'), what: what(nodes), text: net.text(protocols[0].removeText) });
    }
    if (protocols.length === 1 && protocols[0]?.recycles) return t('netRecycles', { what: what(nodes), service: net.text(protocols[0].label) });
    return t(nodes.some(n => n.type === 'folder') ? 'netServerFolders' : 'netServer', { what: what(nodes) });
  }
  const inside = nodes.reduce((sum, n) => sum + (n.type === 'folder' ? fs.count(n.id) : 0), 0);
  const all = inside ? t('inside', { what: what(nodes), n: inside, count: number(inside) }) : what(nodes);
  return t(settings.get('deletePermanent') ? 'permanent' : 'trash', { what: all });
}

/**
 * The small menu at (x, y) that asks before something that cannot be undone: `label` (red, with
 * the trash icon) runs `action`, Annulla does nothing. `then` runs once it is answered, either way.
 */
export function confirmMenu(x, y, label, action, { then, icon = 'trash' } = {}) {
  openMenu(x, y, [
    { label, icon, danger: true, action: async () => { await action(); then?.(); } },
    { label: t('cancel'), icon: 'x', action: () => then?.() },
  ]);
}

/**
 * Removes nodes from the file system. If the settings ask for it (always, for items of a network
 * connection: they cannot come back), a small menu at (x, y) asks for confirmation first. With an undo history (stack), the removal is recorded there and Ctrl Z puts
 * everything back. `then` runs once the menu is answered (or right away without it).
 */
export function confirmRemove(ids, x, y, stack = null, { then } = {}) {
  const nodes = ids.map(id => fs.get(id)).filter(n => n && !n.system);
  if (!nodes.length) return;
  const run = () => deleteNodes(stack, nodes.map(n => n.id));
  if (!settings.get('deleteConfirm') && !nodes.some(n => n.net)) return run().then(() => then?.());
  confirmMenu(x, y, deleteLabel(nodes), run, { then });
}

/**
 * Deletes items of the trash (ids of fs.trashed()) for good, always asking first with the menu at
 * (x, y): it cannot be undone. `then` runs once the menu is answered.
 */
export function confirmPurge(ids, x, y, { then } = {}) {
  const nodes = fs.trashed().filter(n => ids.includes(n.id));
  if (!nodes.length) return;
  const label = nodes.length === 1 ? t('purge', { name: nodes[0].name }) : t('purgeMany', { count: number(nodes.length) });
  confirmMenu(x, y, label, () => fs.purge(nodes.map(n => n.id)), { then });
}

/** Empties the trash (what the current workspace sees of it), always asking first with the menu at (x, y). */
export function confirmEmptyTrash(x, y, { then } = {}) {
  const n = fs.trashed().length;
  if (!n) return;
  confirmMenu(x, y, t('emptyTrash', { n, count: number(n) }), () => fs.purgeTrash(), { then });
}
