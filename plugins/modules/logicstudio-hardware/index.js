import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { makeActions } from './lib/actions.js';
import { CLASSES, allowed, checkPolicy, cleanPolicy, isAdmin } from './lib/policy.js';
import { libsStatus } from './lib/native.js';
import { IS_LINUX, forgetFound, killAll, toolsFound } from './lib/tools.js';

/**
 * Logic Studio, the Hardware blocks: devices of the computer that runs lilOS (serial ports, USB,
 * HID, webcam, audio, MIDI, system information, printers, GPIO and I²C on Linux). It registers
 * blocks.js with the engine (logicstudio-engine), which loads it in the worker of each user, and
 * the actions those blocks ask for (lib/actions.js), made here in the kernel's main thread.
 *
 * Who may use what: only administrators, unless an administrator allows a class of devices to
 * everyone or to some users (lib/policy.js, kept in <dataDir>/policy.json).
 *
 * API (/api/modules/logicstudio-hardware…, signed-in users):
 *   GET  /status[?refresh=1]   for anyone: { admin, classes: { serial: true, … } (what I may use),
 *                              platform, tools: { ffmpeg: true, … }, libraries: { serialport: 'ok', … },
 *                              open: how many devices my programs keep open }
 *                              refresh=1: looks for the system tools again and tries every library
 *   GET  /admin/policy         (admins) { defaultAllow: { serial: false, … }, users: { <id>: { … } }, classes }
 *   PUT  /admin/policy         (admins) the same object (without classes): replaces the policy
 *
 * The native libraries are loaded when a block first needs them, never here: if one does not load
 * on this computer, only its blocks fail (with an Italian error) and /status says so.
 */

let handle = null, handles = null, sweeper = null;

export default {
  async init(ctx) {
    await mkdir(ctx.dataDir, { recursive: true });
    const store = ctx.jsonStore(join(ctx.dataDir, 'policy.json'), { clean: cleanPolicy, invalid: 'empty' });
    await store.read();
    ctx.provide('logicblock.hardware', { api: 1 });

    const made = makeActions({ policy: () => store.current, fs: () => ctx.service('fs'), log: ctx.log });
    handles = made.handles;
    // Belt and braces: the handles of programs that ended without their signal being heard
    sweeper = setInterval(() => handles.sweep().catch(() => {}), 30_000);
    sweeper.unref?.();

    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Hardware', it: 'Hardware' },
      blocks: join(ctx.dir, 'blocks.js'),
      docs: join(ctx.dir, 'docs'),
      actions: made.actions,
    });

    const user = p => (p?.kind === 'user' && /^[\w-]{1,64}$/.test(p.id ?? '') ? p : ctx.fail('forbidden', 'Serve un utente'));
    const admin = p => (isAdmin(user(p)) ? p : ctx.fail('forbidden', 'Solo un amministratore'));

    ctx.route('GET', '/status', async ({ principal, query }) => {
      const p = user(principal);
      const refresh = query.get('refresh') === '1';
      if (refresh) forgetFound();
      return {
        admin: isAdmin(p),
        classes: Object.fromEntries(CLASSES.map(c => [c, allowed(store.current, p, c)])),
        platform: process.platform,
        gpio: IS_LINUX,
        tools: await toolsFound(),
        libraries: await libsStatus(refresh),
        open: handles.list(h => h.owner === p.id).length,
      };
    });

    ctx.route('GET', '/admin/policy', ({ principal }) => {
      admin(principal);
      return { ...store.current, classes: CLASSES };
    });

    ctx.route('PUT', '/admin/policy', async ({ principal, json }) => {
      admin(principal);
      let next;
      try { next = checkPolicy(await json(1 << 20)); } catch (err) { ctx.fail('invalid', err.message); }
      await store.replace(next);
      ctx.log.info('Logic Studio Hardware: permessi cambiati');
      return { ...store.current, classes: CLASSES };
    });
  },

  async stop() {
    clearInterval(sweeper);
    handle?.unregister();
    await handles?.closeAll().catch(() => {});
    await killAll().catch(() => {});
  },
};
