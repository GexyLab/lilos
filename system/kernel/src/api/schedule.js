import { fail } from '../errors.js';

/**
 * The scheduler (the 'scheduler' service and schedule/), for signed-in users. A user sees and
 * changes their own operations; an admin everybody's and the system's (owner '*'), and the owner is
 * told. `app` (query or body): the request is an app's (lilOS sends it for its apps, see the SDK's
 * schedule.js): it makes operations of its own and changes only those.
 *
 *   GET    /api/schedule                    ?owner&app → { admin, tasks: [task] }
 *   POST   /api/schedule                    task → task          (owner: admins may give another user or '*')
 *   GET    /api/schedule/:id                → task
 *   PUT    /api/schedule/:id                task → task
 *   DELETE /api/schedule/:id
 *   POST   /api/schedule/:id/enable         { on } → task
 *   POST   /api/schedule/:id/run            → run
 *   POST   /api/schedule/:id/move           { at, to, scope: 'this' | 'all' } → task   (only when)
 *   GET    /api/schedule-history            ?task&owner&state&limit&before → [run]
 *   GET    /api/schedule-occurrences        ?from&to&owner&task (ms) → { items, series }
 *   GET    /api/schedule-pending            → [run]   the user's browser runs waiting for lilOS
 *   POST   /api/schedule-runs/:id/claim     → { task, run }   a page takes a browser run ('conflict': another has it)
 *   POST   /api/schedule-runs/:id/result    { state: 'ok' | 'error' | 'skipped', text, log }
 *   POST   /api/schedule-runs/:id/cancel    → run
 *   GET    /api/schedule-catalog            → { services, hosts, users }   what the editor offers
 *
 * task and run: see the module (the module scheduler, index.js); `what` without secrets (schedule/what.js).
 */
const APP = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const ID = /^[\w-]{1,64}$/;

export function scheduleRoutes(kernel) {
  const { router, schedules } = kernel;
  const service = () => kernel.service('scheduler');
  const signedIn = p => p ?? fail('unauthorized', 'Accesso richiesto');
  const appOf = v => (v == null || v === '' ? null : APP.test(v) ? v : fail('invalid', 'App non valida'));
  const id = v => (ID.test(v ?? '') ? v : fail('invalid', 'Identificatore non valido'));
  const intOf = v => (v == null || v === '' ? null : Number.isSafeInteger(Number(v)) ? Number(v) : fail('invalid', 'Numero non valido'));

  /** The task `id`, when `app` (an app asking) may touch it. */
  const mine = async (principal, taskId, app) => {
    const task = await service().get(principal, id(taskId)) ?? fail('not_found', 'Operazione inesistente');
    if (app && task.app !== app) fail('not_found', 'Operazione inesistente');
    return task;
  };

  router.add('GET', '/api/schedule', async ({ principal, query }) => {
    const p = signedIn(principal);
    const app = appOf(query.get('app'));
    const owner = query.get('owner') || null;
    const tasks = await service().list(p, { owner, app });
    return { admin: p.role === 'admin', tasks: tasks.map(t => schedules.view(t)) };
  });

  router.add('POST', '/api/schedule', async ({ principal, json }) => {
    const p = signedIn(principal);
    const body = await json(256 << 10) ?? {};
    const app = appOf(body.app);
    if (app && body.owner !== undefined && body.owner !== p.id) fail('forbidden', 'Un’app pianifica solo per chi la usa');
    const { id: _ignored, ...rest } = body;
    const task = await service().save(p, await schedules.prepare(p, { ...rest, app }));
    if (task.owner !== p.id) await schedules.tellOwner(p, task, 'create');
    return schedules.view(task);
  });

  router.add('GET', '/api/schedule/:id', async ({ principal, params, query }) => schedules.view(await mine(signedIn(principal), params.id, appOf(query.get('app')))));

  router.add('PUT', '/api/schedule/:id', async ({ principal, params, json }) => {
    const p = signedIn(principal);
    const body = await json(256 << 10) ?? {};
    const old = await mine(p, params.id, appOf(body.app));
    const full = await service().get({ kind: 'kernel' }, old.id);
    const task = await service().save(p, await schedules.prepare(p, { ...body, id: old.id, owner: old.owner, app: old.app }, full));
    await schedules.tellOwner(p, task, 'save');
    return schedules.view(task);
  });

  router.add('DELETE', '/api/schedule/:id', async ({ principal, params, query }) => {
    const p = signedIn(principal);
    const task = await mine(p, params.id, appOf(query.get('app')));
    await service().remove(p, [task.id]);
    await schedules.tellOwner(p, task, 'remove');
  });

  router.add('POST', '/api/schedule/:id/enable', async ({ principal, params, json }) => {
    const p = signedIn(principal);
    const { on, app } = await json(4 << 10) ?? {};
    const task = await mine(p, params.id, appOf(app));
    const out = await service().setEnabled(p, task.id, on);
    await schedules.tellOwner(p, out, on ? 'on' : 'off');
    return schedules.view(out);
  });

  router.add('POST', '/api/schedule/:id/run', async ({ principal, params, json }) => {
    const p = signedIn(principal);
    const { app } = await json(4 << 10) ?? {};
    const task = await mine(p, params.id, appOf(app));
    const run = await service().runNow(p, task.id);
    await schedules.tellOwner(p, task, 'run');
    return run;
  });

  router.add('POST', '/api/schedule/:id/move', async ({ principal, params, json }) => {
    const p = signedIn(principal);
    const { at, to, scope, app } = await json(4 << 10) ?? {};
    const task = await mine(p, params.id, appOf(app));
    const out = await service().move(p, task.id, { at, to, scope });
    await schedules.tellOwner(p, out, 'move');
    return schedules.view(out);
  });

  router.add('GET', '/api/schedule-history', async ({ principal, query }) => {
    const p = signedIn(principal);
    const app = appOf(query.get('app'));
    const task = query.get('task') || null;
    if (app && task) await mine(p, task, app);
    const runs = await service().history(p, {
      task, owner: query.get('owner') || null, state: query.get('state') || null,
      limit: intOf(query.get('limit')) ?? 100, before: intOf(query.get('before')),
    });
    return app ? runs.filter(r => r.app === app) : runs;
  });

  router.add('GET', '/api/schedule-occurrences', async ({ principal, query }) => {
    const p = signedIn(principal);
    const app = appOf(query.get('app'));
    const out = await service().occurrences(p, {
      from: intOf(query.get('from')), to: intOf(query.get('to')),
      owner: query.get('owner') || null, task: query.get('task') || null,
    });
    return app ? { items: out.items.filter(i => i.app === app), series: out.series.filter(s => s.app === app) } : out;
  });

  router.add('GET', '/api/schedule-pending', async ({ principal }) => service().pending(signedIn(principal)));

  router.add('POST', '/api/schedule-runs/:id/claim', async ({ principal, params }) => schedules.claim(signedIn(principal), id(params.id)));

  router.add('POST', '/api/schedule-runs/:id/result', async ({ principal, params, json }) => {
    const body = await json(320 << 10) ?? {};
    return schedules.report(signedIn(principal), id(params.id), body);
  });

  router.add('POST', '/api/schedule-runs/:id/cancel', async ({ principal, params }) => service().cancel(signedIn(principal), id(params.id)));

  router.add('GET', '/api/schedule-catalog', async ({ principal }) => {
    const p = signedIn(principal);
    const services = (await kernel.appServices.catalog()).map(s => ({ app: s.app, entry: s.entry, label: s.label, name: s.name, glyph: s.glyph, color: s.color, params: s.params }));
    const hosts = ((await kernel.terminals.list(p).catch(() => null))?.hosts ?? []).filter(h => h.protocol === 'ssh').map(h => ({ id: h.id, name: h.name, address: h.address }));
    let users = [];
    if (p.role === 'admin') {
      users = kernel.multiUser
        ? (await kernel.services.get('users')?.list() ?? []).map(u => ({ id: u.id, name: u.name, username: u.username, role: u.role }))
        : [{ id: p.id, name: p.name, username: p.username, role: p.role }];
    }
    return { services, hosts, users, runtime: kernel.appServices.available };
  });
}
