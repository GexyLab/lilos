import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Registry } from './lib/registry.js';
import { Supervisor, publicProgram } from './lib/supervisor.js';
import { Logs } from './lib/logs.js';
import { cleanOverrides, globalLimits, QUOTA } from './lib/limits.js';
import { Secrets } from './lib/secrets.js';

/**
 * Logic Studio Engine: runs the schemas and projects of Logic Studio (logic blocks, dataflow) for
 * every user, in a worker per user, with quotas per user and limits for all (module settings).
 * The blocks and the Componenti UI come from other kernel modules, the packages, which require the
 * service 'logicstudio' and register themselves (lib/registry.js).
 *
 * API (/api/modules/logicstudio-engine…, signed-in users; apps with the permission
 * kernel:logicstudio-engine):
 *   GET    /catalog                      blocks and components of the installed packages
 *   GET    /components/:pack             the browser code of a package's components (JavaScript)
 *   GET    /docs/:lang                   the documentation's pages of every package (and of the engine), with titles
 *   GET    /docs/:pack/:page/:lang       a page: { pack, page, lang, markdown } (page: index, a type as core:add, or a name)
 *   GET    /status                       limits, my quota and what I use
 *   POST   /seal                         { value } → { sealed }: a secret setting of a block (type 'secret', such as
 *                                        a password), sealed for me on this lilOS (lib/secrets.js)
 *   GET    /programs[?all=1]             my programs (an admin: everyone's with all=1)
 *   POST   /programs                     { kind: 'test'|'active'|'app', name, documents, source, lang } → program
 *   GET    /programs/:id
 *   DELETE /programs/:id[?forget=1]      stops it (forget: removes it from the list too)
 *   POST   /programs/:id/input           { schema, block, port, value }
 *   POST   /programs/:id/component       { window, component, port, value }
 *   GET    /programs/:id/ui              the last values sent to its windows
 *   GET    /programs/:id/consoles        its consoles, lines and questions
 *   POST   /programs/:id/answer          { console, ask, value }       POST /programs/:id/cancel { console, ask }
 *   GET    /logs[?program=]              my log
 *   GET    /admin/users                  (admins) programs and quotas of each user
 *   PUT    /admin/quotas/:user           (admins) { maxActive, … } | null
 *   WS     /live/:id                     a program live: status, values, states, ui, consoles; in: input,
 *                                        component, answer, cancel
 */

const MAX_DOCUMENTS = 8 << 20;
const MAX_VALUE = 256 * 1024;
const ID = /^[\w-]{1,64}$/;

let supervisor, registry, restoreTimer;

export default {
  async init(ctx) {
    await mkdir(ctx.dataDir, { recursive: true });
    registry = new Registry(ctx.log);
    const store = ctx.jsonStore(join(ctx.dataDir, 'active.json'), { clean: d => ({ programs: Array.isArray(d?.programs) ? d.programs : [] }) });
    const quotas = ctx.jsonStore(join(ctx.dataDir, 'quotas.json'), { clean: d => ({ users: d?.users && typeof d.users === 'object' ? d.users : {} }) });
    await Promise.all([store.read(), quotas.read()]);
    const logs = new Logs(ctx.dataDir);
    const secrets = new Secrets(ctx.dataDir);
    supervisor = new Supervisor({ ctx, registry, store, quotas, logs, secrets, workerFile: join(ctx.dir, 'worker.js') });

    // A package that arrives may be what a saved program was waiting for
    const restoreSoon = (ms = 500) => {
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => supervisor.restore().catch(err => ctx.log.warn(`Logic Studio: programmi attivi non ripartiti: ${err.message}`)), ms);
    };

    ctx.provide('logicstudio', {
      api: 1,
      async register(info) {
        const handle = await registry.register(info);
        restoreSoon();
        return handle;
      },
      catalog: () => registry.catalog(),
    });

    const user = principal => (principal?.kind === 'user' && ID.test(principal.id ?? '') ? principal : ctx.fail('forbidden', 'Serve un utente'));
    const isAdmin = principal => principal?.role === 'admin';
    const mine = (principal, id) => {
      const p = supervisor.get(id) ?? ctx.fail('not_found', 'Programma sconosciuto');
      if (p.owner !== principal.id && !isAdmin(principal)) ctx.fail('not_found', 'Programma sconosciuto');
      return p;
    };
    const value = v => {
      if (v !== undefined && JSON.stringify(v).length > MAX_VALUE) ctx.fail('too_large', 'Valore troppo grande (al massimo 256 KB)');
      return v;
    };
    const who = p => ({ id: p.id, username: p.username ?? p.id, name: p.name ?? p.username ?? p.id, role: p.role ?? 'user' });

    ctx.route('GET', '/catalog', ({ principal }) => { user(principal); return registry.catalog(); });

    ctx.route('GET', '/components/:pack', ({ principal, params, res }) => {
      user(principal);
      const pack = registry.pack(params.pack);
      if (!pack?.componentsCode) ctx.fail('not_found', 'Pacchetto senza componenti');
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(pack.componentsCode);
    });

    // The documentation: the packages' docs/ folders, and the engine's own (pages logicstudio-engine/…)
    const engineDocs = () => ({ name: ctx.name, version: ctx.version, label: { en: 'Logic Studio Engine', it: 'Logic Studio Engine' }, dir: join(ctx.dir, 'docs') });
    ctx.route('GET', '/docs/:lang', async ({ principal, params }) => {
      user(principal);
      return registry.docIndex(params.lang, [engineDocs()]);
    });
    ctx.route('GET', '/docs/:pack/:page/:lang', async ({ principal, params }) => {
      user(principal);
      // a type comes as core:add (the SDK's module paths have no dots)
      return (await registry.doc(params.pack, String(params.page).replace(':', '.'), params.lang, engineDocs())) ?? ctx.fail('not_found', 'Pagina della documentazione non trovata');
    });

    // A secret setting of a block (a password): the schema keeps it sealed, only the kernel opens it
    ctx.route('POST', '/seal', async ({ principal, json }) => {
      const p = user(principal);
      const { value: v } = await json(16 << 10);
      if (typeof v !== 'string' || v.length > 4096) ctx.fail('invalid', 'Serve un testo di al massimo 4096 caratteri');
      return { sealed: await secrets.seal(p.id, v) };
    });

    ctx.route('GET', '/status', ({ principal }) => {
      const p = user(principal);
      return { limits: globalLimits(ctx.config), quotaKeys: Object.keys(QUOTA), ...supervisor.usage(p.id), admin: isAdmin(p) };
    });

    ctx.route('GET', '/programs', ({ principal, query }) => {
      const p = user(principal);
      return supervisor.list({ owner: query.get('all') === '1' && isAdmin(p) ? null : p.id });
    });

    ctx.route('POST', '/programs', async ({ principal, json }) => {
      const p = user(principal);
      const body = await json(MAX_DOCUMENTS);
      const lang = typeof body?.lang === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(body.lang) ? body.lang : 'en';
      const source = body?.source && typeof body.source.path === 'string' ? { path: body.source.path.slice(0, 1000) } : null;
      return supervisor.start(who(p), { kind: body?.kind, name: body?.name, documents: body?.documents ?? {}, source, lang, watch: !!body?.watch, args: body?.args });
    });

    // Asking keeps a run from the command line going (kind 'cli', see supervisor.touch)
    ctx.route('GET', '/programs/:id', ({ principal, params }) => {
      const p = mine(user(principal), params.id);
      if (p.owner === principal.id) supervisor.touch(p.id);
      return publicProgram(p);
    });

    ctx.route('DELETE', '/programs/:id', async ({ principal, params, query }) => {
      const p = mine(user(principal), params.id);
      if (query.get('forget') === '1') await supervisor.remove(p.id);
      else await supervisor.stop(p.id, principal.id === p.owner ? null : 'Fermato da un amministratore');
    });

    ctx.route('POST', '/programs/:id/input', async ({ principal, params, json }) => {
      const p = mine(user(principal), params.id);
      const b = await json();
      supervisor.input(p.id, { schema: String(b?.schema ?? ''), block: String(b?.block ?? ''), port: String(b?.port ?? ''), value: value(b?.value) });
    });

    ctx.route('POST', '/programs/:id/component', async ({ principal, params, json }) => {
      const p = mine(user(principal), params.id);
      const b = await json();
      supervisor.component(p.id, { window: String(b?.window ?? ''), component: String(b?.component ?? ''), port: String(b?.port ?? ''), value: value(b?.value) });
    });

    ctx.route('GET', '/programs/:id/ui', ({ principal, params }) => supervisor.uiState(mine(user(principal), params.id).id));

    // What lilOS needs to open the windows of a program without the IDE: their documents, the
    // main one, the translations, what the consoles do outside the IDE, the options of the app
    ctx.route('GET', '/programs/:id/windows', ({ principal, params }) => {
      const p = mine(user(principal), params.id);
      const project = p.documents?.project ?? null;
      return {
        id: p.id, name: p.name, source: p.source ?? null, status: p.status,
        main: project?.main ?? Object.keys(p.documents?.windows ?? {})[0] ?? null,
        windows: p.documents?.windows ?? {}, texts: project?.texts ?? {}, entrypoints: project?.entrypoints ?? {},
        consoles: p.spec?.consoles ?? null, options: p.spec?.options ?? null,
      };
    });
    ctx.route('GET', '/programs/:id/consoles', ({ principal, params }) => mine(user(principal), params.id).consoles?.state() ?? []);

    ctx.route('POST', '/programs/:id/answer', async ({ principal, params, json }) => {
      const p = mine(user(principal), params.id);
      const b = await json();
      return { result: p.consoles?.answer(String(b?.console ?? ''), Number(b?.ask), String(b?.value ?? '').slice(0, 4000)) ?? 'stale' };
    });

    ctx.route('POST', '/programs/:id/cancel', async ({ principal, params, json }) => {
      const p = mine(user(principal), params.id);
      const b = await json();
      p.consoles?.cancel(String(b?.console ?? ''), Number(b?.ask));
    });

    ctx.route('GET', '/logs', ({ principal, query }) => logs.read(user(principal).id, { program: query.get('program') }));

    ctx.route('GET', '/admin/users', ({ principal }) => {
      if (!isAdmin(user(principal))) ctx.fail('forbidden', 'Solo un amministratore');
      const owners = new Set([...supervisor.list().map(p => p.owner), ...Object.keys(quotas.current.users ?? {})]);
      return [...owners].map(id => ({ id, overrides: quotas.current.users?.[id] ?? null, ...supervisor.usage(id), programs: supervisor.list({ owner: id }) }));
    });

    ctx.route('PUT', '/admin/quotas/:user', async ({ principal, params, json }) => {
      if (!isAdmin(user(principal))) ctx.fail('forbidden', 'Solo un amministratore');
      if (!ID.test(params.user)) ctx.fail('invalid', 'Utente non valido');
      const overrides = cleanOverrides(await json());
      await quotas.change(d => { if (overrides) d.users[params.user] = overrides; else delete d.users[params.user]; });
      return supervisor.usage(params.user);
    });

    // A program live, for the IDE and for the windows lilOS opens
    ctx.socket('/live/:id', ({ principal, params, accept }) => {
      const p = mine(user(principal), params.id);
      const ws = accept({ maxMessage: 512 * 1024 });
      const send = msg => { try { if (ws.buffered < 4 << 20) ws.send(JSON.stringify(msg)); } catch { /* closed */ } };
      const off = supervisor.watch(p.id, send);
      send({ t: 'hello', program: publicProgram(p), consoles: p.consoles?.state() ?? [], ui: supervisor.uiState(p.id) });
      if (p.status === 'running' || p.status === 'starting') supervisor.snapshot(p.id).then(values => send({ t: 'values', values })).catch(() => {});
      ws.on('message', data => {
        let msg;
        try { msg = JSON.parse(String(data)); } catch { return; }
        try {
          if (msg.t === 'input') supervisor.input(p.id, { schema: String(msg.schema), block: String(msg.block), port: String(msg.port), value: value(msg.value) });
          else if (msg.t === 'component') supervisor.component(p.id, { window: String(msg.window), component: String(msg.component), port: String(msg.port), value: value(msg.value) });
          else if (msg.t === 'answer') send({ t: 'answered', ask: msg.ask, result: p.consoles?.answer(String(msg.console), Number(msg.ask), String(msg.value ?? '').slice(0, 4000)) ?? 'stale' });
          else if (msg.t === 'cancel') p.consoles?.cancel(String(msg.console), Number(msg.ask));
        } catch (err) {
          send({ t: 'error', message: err?.text ?? err?.message ?? String(err) });
        }
      });
      ws.on('close', off);
    });

    ctx.onConfig(() => ctx.log.info('Logic Studio: limiti aggiornati (valgono per i programmi che partono da ora)'));
    restoreSoon(3000);
  },

  async stop() {
    clearTimeout(restoreTimer);
    await supervisor?.shutdown();
  },
};
