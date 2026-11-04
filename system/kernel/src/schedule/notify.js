import { fail } from '../errors.js';
import { defineStrings } from '../strings.js';

const { t } = defineStrings('lilos:kernel.schedule.notify', { en: { strings: {
  noService: 'No kernel module keeps the notifications',
  sent: 'Notification sent',
  sentAdmins: { one: 'Notification sent to {n} administrator', other: 'Notification sent to {n} administrators' },
} } });

/**
 * A reminder: a notification for the owner (for the system: for every admin). It comes from the
 * app that made the operation, or from the Pianificazione app (lilOS when that is not installed).
 * A click opens what the reminder says: an app made by the operation's app goes straight to its
 * entry point; anything else through the Pianificazione app's 'open' entry point, which opens the
 * app or the file ({ app, entry, args } or { node }: not `file`, which a click never hands over).
 */
export async function runNotify({ kernel, task, sender, say }) {
  if (!kernel.services.has('notifications')) fail('unavailable', t('noService'));
  const { text, level, open } = task.what;
  const from = await sender();
  let action = null;
  if (!from.system && open) {
    if (task.app && open.app === task.app) action = { entry: open.entry, args: open.args ?? null };
    else action = { entry: 'open', args: open.file !== undefined ? { node: open.file } : { app: open.app, entry: open.entry, args: open.args ?? null } };
  }
  const to = task.owner === '*' ? await kernel.adminIds() : [task.owner];
  for (const id of to) await kernel.service('notifications').send(id, { from, level, text, action });
  return { state: 'ok', text: say(to.length === 1 ? t('sent') : t('sentAdmins', { n: to.length })) };
}
