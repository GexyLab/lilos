import { Window, h, fs } from '@lilos/sdk';
import * as system from '@lilos/system';
import { createMain } from './list.js';
import { createEditorWindow } from './editor.js';
import { t } from './i18n.js';
import './scheduler.css';

/**
 * Scheduler («Pianificazione»): the operations lilOS does at a date and time or repeated, also
 * with lilOS closed (the kernel's required module 'scheduler', through the SDK's schedule).
 * A required system app; its entry points are the exports here:
 *   default    the main window: Elenco and Storico (list.js)
 *   edit       an operation to change ({ id }), in the editor (editor.js)
 *   create     a new operation: from the menu of a file or folder ({ files, action }) or from
 *              another app ({ when, what?, name? })
 *   history    the main window on the history ({ task, run }): notifications open it
 *   open       what a reminder says to open ({ node } a file, or { app, entry, args }); its
 *              window closes at once
 */
export default createMain;
export const edit = createEditorWindow;
export const create = createEditorWindow;
export const history = ({ args, openWindow } = {}) => createMain({ args: { ...(args ?? {}), tab: 'history' }, openWindow });

export function open({ args } = {}) {
  const win = new Window({ title: t('app.name'), icon: 'clock', width: 320, height: 140 });
  const a = args && typeof args === 'object' ? args : {};
  let message = '';
  if (typeof a.node === 'string') {
    const node = fs.get(a.node);
    if (node) system.openFile(node);
    else message = t('open.gone');
  } else if (typeof a.app === 'string' && system.isInstalled(a.app)) {
    system.launch(a.app, a.args ?? undefined, typeof a.entry === 'string' ? a.entry : 'main');
  } else message = t('open.noApp');
  win.body.append(h('p', { class: 'sc-empty' }, message || t('open.done')));
  // Only a step on the way: it goes as soon as it is open (unless it has something to say)
  if (!message) setTimeout(() => win.emit('close'), 0);
  return win;
}
