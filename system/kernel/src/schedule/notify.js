import { fail } from '../errors.js';

/**
 * A reminder: a notification for the owner (for the system: for every admin). It comes from the
 * app that made the operation, or from the Pianificazione app (lilOS when that is not installed).
 * A click opens what the reminder says: an app made by the operation's app goes straight to its
 * entry point; anything else through the Pianificazione app's 'open' entry point, which opens the
 * app or the file ({ app, entry, args } or { file }).
 */
export async function runNotify({ kernel, task, sender }) {
  if (!kernel.services.has('notifications')) fail('unavailable', 'Nessun modulo del kernel conserva le notifiche');
  const { text, level, open } = task.what;
  const from = await sender();
  let action = null;
  if (!from.system && open) {
    if (task.app && open.app === task.app) action = { entry: open.entry, args: open.args ?? null };
    else action = { entry: 'open', args: open.file !== undefined ? { file: open.file } : { app: open.app, entry: open.entry, args: open.args ?? null } };
  }
  const to = task.owner === '*' ? await kernel.adminIds() : [task.owner];
  for (const id of to) await kernel.service('notifications').send(id, { from, level, text, action });
  return { state: 'ok', text: to.length === 1 ? 'Notifica mandata' : `Notifica mandata a ${to.length} amministratori` };
}
