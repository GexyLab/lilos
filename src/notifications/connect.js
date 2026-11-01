import { notifications, shortcuts } from '@lilos/sdk';
import { notificationsShown, showNotifications } from './NotificationsWindow.js';

/**
 * Notifications in lilOS: the bell of the taskbar opens the Notifiche window (also a shortcut,
 * with no key until the user picks one), and the notifications kept by the kernel are read.
 * What arrives later comes from the kernel's event stream (apps/services.js).
 */
export function connectNotifications({ bell, wm }) {
  const toggle = () => {
    const open = wm.get('notifications');
    if (open && notificationsShown(wm) && wm.active === open) return wm.close(open);
    bell.hide();
    showNotifications(wm);
  };
  bell.onOpen = toggle;
  bell.onShown = () => notificationsShown(wm);
  shortcuts.register({ id: 'system.notifications', label: 'Apri o chiudi le notifiche', group: 'Generale', keys: [], run: toggle });
  return notifications.load();
}
