import * as sdk from '@lilos/sdk';   // `host`: missing in older lilOS, so not imported by name
import { t } from './i18n.js';

/**
 * Inside the program lilOS (lilos-desktop), files go to the computer and back:
 *   «Apri sul computer»       a file of the home: a copy opened with the computer's program for its
 *                             type, and when that program saves, the file in lilOS changes too.
 *                             A file of Rete › Questo computer (netfs-local) opens where it is
 *   «Mostra nella cartella del computer»   a file or folder of Rete › Questo computer, in the
 *                             computer's file manager (Explorer, Finder…)
 *   «Esporta sul computer…»   the computer's save dialog (one file) or folder dialog (several)
 * Nothing in a browser.
 */
const host = () => (sdk.host?.native ? sdk.host : null);
const say = (text, level) => sdk.toast(text, { level });
const fail = (key, vars) => err => say(t(key, { ...vars, error: err.message }), 'error');

/** The path on the computer of a node of a connection of this computer (netfs-local), or null. */
function localPath(node) {
  if (!node.net || !sdk.net?.mount) return null;
  let ref;
  try { ref = sdk.fs.netRef(node.id); } catch { return null; }
  const mount = sdk.net.mount(ref.mount);
  if (mount?.protocol !== 'local' || typeof mount.values?.folder !== 'string') return null;
  const root = mount.values.folder.replace(/[\\/]+$/, '');
  const slash = root.includes('\\') || /^[A-Za-z]:/.test(root) ? '\\' : '/';
  return ref.path === '/' ? (root || slash) : `${root}${ref.path.split('/').join(slash)}`;
}

export function computerEntries(nodes) {
  const h = host();
  if (!h || !nodes.length) return [];
  const one = nodes.length === 1 ? nodes[0] : null;
  const onComputer = one && localPath(one);
  const files = nodes.filter(n => n.type === 'file' && !n.web);
  const entries = [];
  if (onComputer && h.trusted) {
    if (one.type === 'file') entries.push({ label: t('computer.open'), icon: 'monitor', action: () => h.openPath(onComputer).catch(fail('computer.openFailed', { name: one.name })) });
    entries.push({ label: t('computer.reveal'), icon: 'folderOpen', action: () => h.reveal(onComputer).catch(fail('computer.openFailed', { name: one.name })) });
  } else if (one?.type === 'file' && !one.net && !one.web && h.trusted) {
    entries.push({ label: t('computer.open'), icon: 'monitor', action: () => h.openOnComputer(one.id).catch(fail('computer.openFailed', { name: one.name })) });
  }
  if (files.length && files.length === nodes.length) {
    entries.push({
      label: files.length === 1 ? t('computer.export') : t('computer.exportMany', { count: files.length }), icon: 'download',
      action: async () => {
        try {
          const done = await h.exportToComputer(files.map(n => n.id));
          if (done?.saved?.length) say(done.saved.length === 1 ? t('computer.exported', { path: done.saved[0] }) : t('computer.exportedMany', { count: done.saved.length }), 'success');
        } catch (err) {
          say(t('computer.exportFailed', { error: err.message }), 'error');
        }
      },
    });
  }
  return entries.length ? ['-', ...entries] : [];
}
