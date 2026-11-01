import { notifications } from '@lilos/sdk';

/**
 * A message from lilOS itself: every one is a notification (the notification bar shows it, the
 * Notifiche window keeps it), both for what answers something the user just did ("Annullato:
 * Rinomina") and for what does not (an app that did not start). level: 'info' (default) |
 * 'success' | 'warning' | 'error'. What the kernel does not take stays in the page (notifications.send).
 */
export function notify(text, { level = 'info' } = {}) {
  notifications.send({ text, level }).catch(err => console.warn('[lilos] notifica non mostrata:', err.message, text));
}
