import { app } from 'electron';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { DATA_DIR } from './runtime.js';
import { settings, update } from './store.js';

/**
 * The installation settings of lilOS (lilos-install.json, read in full by the release's
 * tools/install.js: system/kernel/src/installSettings.js there). The program looks for one, first found:
 *   LILOS_INSTALL_FILE         a path (tests, scripts)
 *   <program data>/            lilos-install.json put there before the first start
 *   next to the program        put next to the setup (the Windows installer copies it), the
 *                              AppImage or lilOS.app
 * Of it the program reads only what it does itself: where lilOS goes (installer.dir), where it
 * runs (installer.mode, installer.server), the first administrator, whether there is an image,
 * whether lilOS has no UI ("installer": { "mode": "local" } with "kernel": { "ui": false }: lilOS
 * without UI, noui.js) and whether the license is accepted already (acceptLicense).
 */
export const INSTALL_FILE = 'lilos-install.json';

function candidates() {
  const out = [];
  if (process.env.LILOS_INSTALL_FILE) out.push(resolve(process.env.LILOS_INSTALL_FILE));
  out.push(join(DATA_DIR, INSTALL_FILE));
  if (app.isPackaged) {
    if (process.env.APPIMAGE) out.push(join(dirname(process.env.APPIMAGE), INSTALL_FILE));
    // lilOS.app/Contents/MacOS/lilOS: next to lilOS.app
    if (process.platform === 'darwin') out.push(join(resolve(process.execPath, '..', '..', '..', '..'), INSTALL_FILE));
    out.push(join(dirname(process.execPath), INSTALL_FILE));
  }
  return out;
}

/** ~, %VAR%, $VAR and ${VAR} of a path, then absolute (relative to `base`), as installSettings.js does. */
function expandPath(path, base) {
  const env = name => process.env[name] ?? process.env[Object.keys(process.env).find(k => k.toUpperCase() === name.toUpperCase())] ?? '';
  const out = String(path)
    .replace(/^~(?=$|[\\/])/, homedir())
    .replace(/%([\w()]+)%/g, (_, n) => env(n))
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (_, a, b) => env(a ?? b));
  return isAbsolute(out) ? resolve(out) : resolve(base, out);
}

let cached;

/**
 * { file, dir, mode, server: { url, name, trusted } | null, admin: { username, password } | null, image,
 *   noUi, acceptLicense } or null when there is no file. A file that is not JSON: null too, and
 * install.js says why.
 */
export function installSettings() {
  if (cached !== undefined) return cached;
  cached = null;
  const file = candidates().find(f => existsSync(f));
  if (!file) return cached;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const i = raw?.installer ?? {};
    let server = null;
    if (i.server) {
      const s = typeof i.server === 'string' ? { url: i.server } : i.server;
      const url = new URL(String(s.url));
      if (url.protocol === 'http:' || url.protocol === 'https:') server = { url: url.origin, name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 80) : url.host, trusted: s.trusted === true };
    }
    const admin = (Array.isArray(raw.users) ? raw.users : []).find(u => u?.role === 'admin' && typeof u.password === 'string' && typeof u.username === 'string');
    cached = {
      file,
      dir: typeof i.dir === 'string' && i.dir.trim() ? expandPath(i.dir, dirname(file)) : null,
      mode: i.mode === 'local' || (i.mode === 'server' && server) ? i.mode : null,
      server,
      admin: admin ? { username: admin.username.trim().toLowerCase(), password: admin.password } : null,
      image: typeof raw.image === 'string' && !!raw.image.trim(),
      noUi: i.mode === 'local' && raw.kernel?.ui === false,
      acceptLicense: raw.acceptLicense === true,
    };
  } catch {
    cached = { file, dir: null, mode: null, server: null, admin: null, image: false, noUi: false, acceptLicense: false };
  }
  return cached;
}

/**
 * What the program can do by itself at the first start, without the welcome page:
 * { kind: 'remote', server } | { kind: 'local', admin, noUi } (admin null: the image has the users) | null.
 * lilOS without UI goes by itself only when the file accepts the license: no page of lilOS will ask
 * it later, so otherwise the welcome page shows it first (welcome.js, fromFile).
 */
export function automaticSetup() {
  const s = installSettings();
  if (s?.mode === 'server') return { kind: 'remote', server: s.server };
  if (s?.mode === 'local' && (s.admin || s.image) && (!s.noUi || s.acceptLicense)) return { kind: 'local', admin: s.admin, noUi: s.noUi };
  return null;
}

/**
 * The mark of a new installation: the Windows installers (.exe and .msi) lay down
 * resources/first-run (build/first-run), the program deletes it once the person chose what to do
 * with the installation found (the welcome page, previous). An update lays it down too: the
 * program noted the version it downloaded (settings.updating), so it is not asked then.
 * LILOS_FIRST_RUN: another path (tests).
 */
const FIRST_RUN = process.env.LILOS_FIRST_RUN || (app.isPackaged ? join(process.resourcesPath, 'first-run') : null);

/** The program was installed (not updated) since its last start. */
export function justInstalled() {
  if (!FIRST_RUN || !existsSync(FIRST_RUN)) return false;
  const updating = settings().updating;
  if (updating) update(d => { d.updating = null; });
  if (updating !== app.getVersion()) return true;
  forgetInstalled();
  return false;
}

export function forgetInstalled() {
  if (!FIRST_RUN) return;
  try { rmSync(FIRST_RUN, { force: true }); } catch { /* asked again at the next start */ }
}

/** After the first start: a file in the program's own folder keeps no passwords (lilOS has them now). */
export function forgetPasswords() {
  const s = installSettings();
  if (!s || s.file !== join(DATA_DIR, INSTALL_FILE)) return;
  try {
    const raw = JSON.parse(readFileSync(s.file, 'utf8'));
    if (!Array.isArray(raw.users) || !raw.users.some(u => u && 'password' in u)) return;
    raw.users = raw.users.map(u => { const { password, ...rest } = u ?? {}; return rest; });
    writeFileSync(s.file, `${JSON.stringify(raw, null, 2)}\n`, { mode: 0o600 });
  } catch { /* left as it is */ }
}
