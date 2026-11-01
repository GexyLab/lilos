import { fail } from '../errors.js';
import { KERNEL } from '../services.js';

/**
 * Notifications (the 'notifications' service of a module, such as notifications-basic), for
 * signed-in users; each one sees and changes only theirs:
 *   GET    /api/notifications            { available, keep, items: [notification] }   newest first;
 *                                        available: false without the service (lilOS then keeps them in the page)
 *   POST   /api/notifications            { app?, text, level?, action? } → notification   for the user who asks.
 *                                        app: the installed app that sends it (lilOS sends for its apps);
 *                                        without it, lilOS itself
 *   POST   /api/notifications/read       { ids? }   without ids: all of them
 *   POST   /api/notifications/remove     { ids? }
 *   PUT    /api/notifications-options    { keep } → { keep }
 * New ones and changes reach the user's pages on /api/services-events ('notification.new', 'notification.change').
 */
const APP = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const ENTRY = /^[a-z][a-zA-Z0-9]{0,30}$/;
const LEVELS = ['info', 'success', 'warning', 'error'];
const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * What lilos.ui.notify() gets — a text, or { text, level?, action? } — as the service takes it.
 * Throws 'invalid' for anything else.
 */
export function notificationOf(value) {
  const n = typeof value === 'string' ? { text: value } : plain(value) ? value : fail('invalid', 'Una notifica è un testo o { text, level, action }');
  if (typeof n.text !== 'string' || !n.text.trim()) fail('invalid', 'La notifica non ha testo');
  const level = n.level ?? 'info';
  if (!LEVELS.includes(level)) fail('invalid', 'Livello non valido: info, success, warning o error');
  let action = null;
  if (n.action != null) {
    if (!plain(n.action) || (n.action.entry != null && !ENTRY.test(n.action.entry))) fail('invalid', 'Azione non valida: { entry, args }');
    action = { entry: n.action.entry ?? 'main', args: n.action.args ?? null };
  }
  return { text: n.text, level, action };
}

/** The sender as the service saves it: an installed app with its name, or lilOS. */
export async function senderOf(kernel, app) {
  if (app == null) return { system: true };
  if (typeof app !== 'string' || !APP.test(app) || !await kernel.installer.state(app)) fail('invalid', 'Mittente non valido: l’app non è installata');
  let name = app;
  try {
    name = JSON.parse((await kernel.installer.file(KERNEL, app, 'lilos.json')).toString('utf8')).name || app;
  } catch { /* its id, then */ }
  return { app, name: String(name) };
}

export function notificationRoutes(kernel) {
  const { router } = kernel;
  const service = () => kernel.service('notifications');

  router.add('GET', '/api/notifications', async ({ principal }) => {
    signedIn(principal);
    if (!kernel.services.has('notifications')) return { available: false, keep: null, items: [] };
    return { available: true, ...await service().list(principal) };
  });

  router.add('POST', '/api/notifications', async ({ principal, json }) => {
    const user = signedIn(principal);
    const body = await json(16 << 10);
    const from = await senderOf(kernel, body?.app ?? null);
    return service().send(user.id, { from, ...notificationOf(body) });
  });

  for (const action of ['read', 'remove']) {
    router.add('POST', `/api/notifications/${action}`, async ({ principal, json }) => {
      const { ids = null } = await json(64 << 10) ?? {};
      await service()[action](signedIn(principal), ids);
    });
  }

  router.add('PUT', '/api/notifications-options', async ({ principal, json }) => {
    const { keep } = await json(4 << 10) ?? {};
    return service().setOptions(signedIn(principal), { keep });
  });
}
