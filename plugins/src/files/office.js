import { storage, openMenu, splitName, messageBox } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `net`, `notifications`: missing in older lilOS, so not imported by name
import * as system from '@lilos/system';   // appFor: read by name only where it exists
import { network, mountOf, protocolOf, openInBrowser, askSignIn } from './network.js';
import { t } from './i18n.js';

/**
 * Office documents and the connections whose links open them in Office for the web (OneDrive):
 *   - a document of such a connection: «Apri in Office online» (and the double click, when no app
 *     of lilOS is chosen for its type), in a new browser tab; anything else there: «Apri nel browser»;
 *   - a document of the home: «Carica su OneDrive e apri», a copy into the OneDrive folder chosen
 *     in Control Panel → OneDrive, then opened the same way. The original stays where it is: what
 *     is changed in Office is changed in the copy on OneDrive.
 * The user's choices are in storage 'onedrive' (Control Panel writes them):
 *   { mount: id | null, folder: '/lilOS', ifExists: 'ask' | 'replace' | 'keep', doubleClick: true }
 */
const OFFICE = {
  word: ['doc', 'docx', 'docm', 'dot', 'dotx', 'odt', 'rtf'],
  excel: ['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'ods'],
  powerpoint: ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'pot', 'potx', 'odp'],
};
const KEY = 'onedrive';
export const DEFAULTS = { mount: null, folder: '/lilOS', ifExists: 'ask', doubleClick: true };

/** The user's choices for OneDrive (checked: they come from storage). */
export function prefs() {
  const saved = storage.get(KEY, {}) ?? {};
  return {
    mount: typeof saved.mount === 'string' ? saved.mount : null,
    folder: typeof saved.folder === 'string' && saved.folder.trim() ? saved.folder.trim() : DEFAULTS.folder,
    ifExists: ['ask', 'replace', 'keep'].includes(saved.ifExists) ? saved.ifExists : DEFAULTS.ifExists,
    doubleClick: saved.doubleClick !== false,
  };
}

/** 'word' | 'excel' | 'powerpoint' for an Office document, or null. */
export function officeKind(node) {
  if (node?.type !== 'file') return null;
  const ext = splitName(node.name)[1].toLowerCase();
  return Object.keys(OFFICE).find(k => OFFICE[k].includes(ext)) ?? null;
}

/** The connections a document of the home can go to and open in Office (OneDrive, connected or not). */
export function officeMounts() {
  const net = network();
  if (!net?.putHome) return [];
  return net.mounts().filter(m => protocolOf(m)?.office);
}

/** True if the node is in a connection whose links open Office documents. */
const inOfficeMount = node => !!node?.net && !!protocolOf(mountOf(node.id))?.office;

/**
 * The double click on a document of OneDrive: Office for the web, unless the user turned it off
 * or chose an app of lilOS for its type. Returns true if it took it.
 */
export function openOffice(browser, node) {
  if (!officeKind(node) || !inOfficeMount(node) || !prefs().doubleClick) return false;
  if (system.appFor?.(splitName(node.name)[1].toLowerCase())) return false;
  openInBrowser(browser, node.id);
  return true;
}

/** The entries of the item menu for one node: the ones above, where they apply. */
export function officeEntries(browser, nodes) {
  if (nodes.length !== 1 || !network()) return [];
  const node = nodes[0];
  const kind = officeKind(node);
  if (node.net) {
    if (!protocolOf(mountOf(node.id))?.links) return [];
    // An Office document's link opens Office for the web: one entry that says so
    const office = kind && inOfficeMount(node);
    return [{ label: office ? t(`office.open.${kind}`) : t('net.web.open'), icon: 'globe', action: () => openInBrowser(browser, node.id) }];
  }
  if (!kind || !officeMounts().length) return [];
  return [{ label: t('office.upload'), icon: 'arrowUp', action: () => uploadAndOpen(browser, node) }];
}

/**
 * Carica su OneDrive e apri: the connection from the user's choice (or the only one, or one picked
 * from a menu), the file copied into their folder, then Office for the web in a new tab. Call it
 * right from a click (the tab opens at once, then goes to the document).
 */
export function uploadAndOpen(browser, node, { mount = null, ifExists = null } = {}) {
  const mounts = officeMounts();
  const p = prefs();
  const m = mount ?? mounts.find(x => x.id === p.mount) ?? (mounts.length === 1 ? mounts[0] : null);
  if (!m) {
    if (!mounts.length) return void browser.netError(new Error(t('office.none')));
    const r = browser.list.querySelector(`[data-id="${CSS.escape(node.id)}"]`)?.getBoundingClientRect();
    openMenu(r ? r.left + 40 : innerWidth / 2, r ? r.bottom : innerHeight / 2, [
      { label: t('office.pick'), disabled: true },
      ...mounts.map(x => ({ label: x.name, icon: 'globe', action: () => uploadAndOpen(browser, node, { mount: x }) })),
    ]);
    return;
  }
  const net = network();
  const policy = ifExists ?? p.ifExists;
  let placed = null;
  net.openWeb(async () => {
    placed = await net.putHome(m.id, node.id, p.folder, policy);
    return net.link(m.id, placed.path);
  }).then(() => {
    sdk.notifications?.send({ app: 'files', text: t('office.uploaded', { name: placed.name, folder: `${m.name}${p.folder === '/' ? '' : p.folder}` }) }).catch(() => {});
  }, async err => {
    if (err.code === 'conflict' && err.details?.exists) return askExisting(browser, node, m, err.details.name);
    if (err.code === 'secret_required') {
      if (await askSignIn(browser, m)) browser.netError(new Error(t('office.again')));
      return;
    }
    browser.netError(err, { title: t('office.failed', { name: node.name }) });
  });
}

/** A file with that name is on OneDrive already: replace it, keep both, or give up. */
async function askExisting(browser, node, m, name) {
  const ifExists = await messageBox(browser.win, {
    icon: 'warning',
    title: t('office.exists.title'),
    text: t('office.exists.text', { name, folder: prefs().folder }),
    buttons: ['cancel', { value: 'keep', label: t('office.exists.keep') }, { value: 'replace', label: t('office.exists.replace'), icon: 'arrowUp', primary: true }],
  });
  if (ifExists === 'keep' || ifExists === 'replace') uploadAndOpen(browser, node, { mount: m, ifExists });
}
