import { notifications, toast } from '@lilos/sdk';

/**
 * A notification from lilOS itself, for what does not answer something the user just did (an app
 * that did not start, an update to finish). If it cannot be sent, a toast says it instead.
 */
export function notify(text, { level = 'info' } = {}) {
  notifications.send({ text, level }).catch(() => toast(text, { timeout: 6000 }));
}
