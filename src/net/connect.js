import { fs, net, kernel, shortcuts } from '@lilos/sdk';
import { onKernelEvent } from '../apps/services.js';
import { sharedFolder, NETWORK_NAME } from '../systemFs.js';
import { systemActions } from '../notifications/card.js';
import { notify } from '../notifications/notify.js';
import { showTransfers, transfersShown } from './TransfersWindow.js';

/** How long a run of transfers goes before the window opens by itself. */
const OPEN_AFTER = 5000;

/**
 * The network in lilOS: the connections become folders in Rete (fs.setMounts), what the kernel
 * streams about them reaches fs and net, and the Trasferimento dati window opens by itself when a
 * run of transfers lasts more than 5 seconds (once per run: closed, it stays closed until the next
 * one) or when a file that exists already waits for the user. The taskbar's button opens it too.
 * Call before connectServices() (it adds its listeners to the kernel's stream).
 */
export function connectNet({ wm, button }) {
  if (!kernel.connected) return;
  const open = () => showTransfers(wm);
  button.onOpen = () => (transfersShown(wm) && wm.active === wm.get('transfers') ? wm.close(wm.get('transfers')) : open());
  systemActions.set('transfers', open);
  shortcuts.register({ id: 'system.transfers', label: 'Apri il trasferimento dati', group: 'Generale', keys: [], run: open });

  // The connections, as folders of Rete
  const mounts = () => {
    const folder = sharedFolder(NETWORK_NAME);
    if (folder) fs.setMounts(folder, net.mounts().map(m => ({ id: m.id, name: m.name, protocol: m.protocol, state: m.state })));
  };
  net.on('mounts', mounts);
  mounts();
  fs.on('netError', ({ message }) => notify(`Rete: ${message}`, { level: 'error' }));

  onKernelEvent('net.mount', () => net.mountChanged());
  onKernelEvent('net.change', d => fs.netChanged(d?.mount, d?.path));
  onKernelEvent('net.transfers', s => net.transfersChanged(s));
  onKernelEvent('fs.external', d => fs.external(d));
  onKernelEvent('net.notify', d => notify(String(d?.text ?? ''), { level: d?.level ?? 'info' }));
  onKernelEvent('', () => {
    net.load().catch(() => {});
    net.loadTransfers().catch(() => {});
  });

  // The window by itself: after 5 seconds of a run, or for a choice to make
  let seen = null, shown = null, timer = 0;
  const asked = new Set();
  net.on('transfers', s => {
    const conflict = s.queues.find(q => q.conflict)?.conflict;
    if (conflict && !asked.has(conflict.id)) {
      asked.add(conflict.id);
      if (!transfersShown(wm)) open();
    }
    if (!s.active || !s.run) {
      clearTimeout(timer);
      seen = null;
      return;
    }
    if (s.run === seen) return;
    seen = s.run;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const now = net.transfers;
      if (now.active && now.run === seen && shown !== seen) {
        shown = seen;
        if (!transfersShown(wm)) open();
      }
    }, OPEN_AFTER);
  });
  net.loadTransfers().catch(() => {});
}
