import { notifications } from '../core/notifications.js';

/**
 * Old name of a message to the user. There is no message at the bottom of the screen any more:
 * it is a notification from lilOS (notifications.send), shown in the notification area and kept
 * in the Notifiche window. Kept for the apps that still call it; `timeout` is ignored (how long
 * the notification bar stays is the user's choice, Control Panel → Notifiche).
 *
 *   toast('Elemento eliminato', { level: 'success' })
 */
export function toast(text, { level = 'info' } = {}) {
  notifications.send({ text: String(text), level }).catch(err => console.warn('[lilos] notifica non mostrata:', err.message, text));
}
