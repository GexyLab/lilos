import { fail } from '../errors.js';

/**
 * The services of installed apps (apps/appServices.js), for signed-in users:
 *   GET    /api/services                         { available, enabled, admin, services: [service] }
 *   PUT    /api/services-options                 { enabled }   the user's services start when they come in
 *   PUT    /api/services/:app/:entry/startup     { when: 'none' | 'login' | 'system', params? }   'system': admins
 *   POST   /api/services/:app/:entry/start       also stop, restart   (the system's: admins)
 *   POST   /api/services/:app/:entry/call        { data, from? } → { result }   what its lilos.handle() returns
 *   GET    /api/services/:app/:entry/log         { lines: [{ at, level, text }] }
 *   GET    /api/services-events                  text/event-stream: 'change' { owner, app, entry } when a
 *                                                service the user sees changes, 'notify' { app, text } from
 *                                                theirs (and, for admins, from the system's)
 *
 *   service: { app, entry, label, name, glyph, color, params, startup, values, system, canControl, status, since, error }
 *            status: 'off' | 'starting' | 'on' | 'error'
 */
const APP = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const ENTRY = /^[a-z][a-zA-Z0-9]{0,30}$/;
const HEARTBEAT = 25_000;

const target = params => {
  if (!APP.test(params.app) || !ENTRY.test(params.entry)) fail('invalid', 'Servizio non valido');
  return [params.app, params.entry];
};

export function serviceRoutes(kernel) {
  const { router, appServices } = kernel;
  const signedIn = principal => principal ?? fail('unauthorized', 'Accesso richiesto');

  router.add('GET', '/api/services', async ({ principal }) => appServices.list(signedIn(principal)));

  router.add('PUT', '/api/services-options', async ({ principal, json }) => appServices.setOptions(signedIn(principal), await json(4 << 10)));

  router.add('PUT', '/api/services/:app/:entry/startup', async ({ principal, params, json }) => {
    const { when, params: values } = await json(16 << 10);
    return appServices.setStartup(signedIn(principal), ...target(params), { when, params: values });
  });

  for (const action of ['start', 'stop', 'restart']) {
    router.add('POST', `/api/services/:app/:entry/${action}`, async ({ principal, params }) => appServices.control(signedIn(principal), ...target(params), action));
  }

  router.add('POST', '/api/services/:app/:entry/call', async ({ principal, params, json }) => {
    const { data = null, from = null } = await json(1 << 20);
    if (from !== null && (typeof from !== 'string' || !APP.test(from))) fail('invalid', 'Mittente non valido');
    return { result: await appServices.call(signedIn(principal), ...target(params), data, from) };
  });

  router.add('GET', '/api/services/:app/:entry/log', async ({ principal, params }) => appServices.log(signedIn(principal), ...target(params)));

  router.add('GET', '/api/services-events', async ({ req, res, principal }) => {
    const user = signedIn(principal);
    const admin = user.role === 'admin';
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Accel-Buffering': 'no' });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const mine = owner => owner === user.id || owner === '*';
    const onChange = e => { if (mine(e.owner)) send('change', e); };
    const onNotify = e => { if (e.owner === user.id || (e.owner === '*' && admin)) send('notify', { app: e.app, text: e.text }); };
    appServices.on('change', onChange);
    appServices.on('notify', onNotify);
    const beat = setInterval(() => res.write(': ok\n\n'), HEARTBEAT);
    res.write(': ok\n\n');
    req.on('close', () => {
      clearInterval(beat);
      appServices.off('change', onChange);
      appServices.off('notify', onNotify);
    });
  });
}
