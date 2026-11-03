import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from './config.js';
import { INSTALL_FILE, readInstallSettings, withoutPasswords } from './installSettings.js';
import { readUserKey, writeUserKey } from './api/home.js';
import { normalizeUrl } from './apps/sources.js';
import { writeJson } from './jsonFile.js';
import { logger } from './log.js';
import { KERNEL } from './services.js';

/**
 * The first start of an installation made with lilos-install.json (src/installSettings.js): the
 * file in the kernel's data folder, written by tools/install.js. Its `settings` are the starting
 * settings of every new home (api/home.js); once, the users and the apps it asks for, then the
 * file gets `applied` and loses the passwords.
 */
const log = logger('install');
const FILE = join(DATA_DIR, INSTALL_FILE);

/** The installation settings, or null when there are none (or they are damaged: said in the log). */
export async function loadInstallSettings() {
  if (!(await stat(FILE).catch(() => null))) return null;
  try {
    return await readInstallSettings(FILE);
  } catch (err) {
    log.error(`Impostazioni di installazione non lette: ${err.message}`);
    return null;
  }
}

/** Users, apps and per-user settings of the file, once (after the system apps). */
export async function applyInstallSettings(kernel, settings) {
  if (!settings || settings.applied) return settings;
  if (settings.users.length && !kernel.multiUser) log.warn('Impostazioni di installazione: lilOS è a utente singolo, gli utenti del file restano fuori');
  const users = kernel.multiUser ? kernel.service('users') : null;
  for (const u of users ? settings.users : []) {
    try {
      let user = (await users.list()).find(x => x.username === u.username);
      if (!user) {
        if (!u.password) {
          log.warn(`Utente ${u.username} senza password nelle impostazioni di installazione: non creato`);
          continue;
        }
        user = await users.create({ username: u.username, name: u.name ?? undefined, password: u.password, role: u.role });
        log.info(`Utente ${user.username} (${user.role}) creato dalle impostazioni di installazione`);
      }
      if (Object.keys(u.settings).length) {
        const principal = await kernel.userPrincipal(user.id);
        await writeUserKey(kernel, principal, 'settings', { ...await readUserKey(kernel, principal, 'settings', {}), ...u.settings });
      }
    } catch (err) {
      log.warn(`Utente ${u.username} non creato: ${err.message}`);
    }
  }

  // The apps still missing: the official ones came with the system apps, the others from their repository
  for (const app of settings.apps ?? []) {
    try {
      if (await kernel.installer.state(app.id)) continue;
      let repo = app.repo ? (await kernel.repos.list()).find(r => normalizeUrl(r.url) === normalizeUrl(app.repo)) : { id: 'official' };
      repo ??= await kernel.repos.add(KERNEL, { url: app.repo });
      const catalog = await kernel.repos.catalog(repo.id);
      const entry = catalog.apps.find(a => a.manifest?.id === app.id);
      if (!entry) throw new Error(`non è nel repository ${catalog.repo.name ?? catalog.repo.url}`);
      const source = { type: 'git', url: catalog.repo.url, ref: catalog.ref, path: entry.path };
      const { installed } = await kernel.dependencies.installAuto({ install: { kind: 'app', source } }, { allowUnsigned: app.allowUnsigned });
      log.info(`App ${app.id} installata dalle impostazioni di installazione`);
      if (installed.some(s => s.kind === 'module')) log.warn(`${app.id}: moduli installati, attivi dal prossimo avvio del kernel`);
    } catch (err) {
      log.warn(`App ${app.id} non installata: ${err.message}`);
    }
  }

  const done = { ...withoutPasswords(settings), applied: new Date().toISOString() };
  await writeJson(FILE, done, { pretty: true });
  return done;
}
