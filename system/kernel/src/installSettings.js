import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';

/**
 * The installation settings of lilOS: lilos-install.json, read by who installs lilOS (tools/install.js,
 * the program lilOS) and, at the first start, by the kernel. Every field can be left out:
 *
 *   { format: 1,
 *     installer: { dir, mode, server }     where lilOS goes, and (program lilOS) where it runs:
 *                dir     the folder of the installed lilOS (~, %VAR%, $VAR; relative: to this file)
 *                mode    'local' (on this computer) | 'server' (the program opens `server`) | null (it asks)
 *                server  { url, name?, trusted? }
 *     image:     path | url | null        a system image (src/image.js, made by tools/image.js): a lilOS
 *                                         ready and set up (versions, configuration, modules, apps, users,
 *                                         files) installed instead of the official release; a folder, a
 *                                         .zip or .tar.gz of it, or an http(s) address of one of those.
 *                                         With it `lilos` does not count, and modules, kernel, repos,
 *                                         apps, users and settings add to what the image has
 *     lilos:     { source }               'local': the release carried by the installer; 'server': the
 *                                         newest one of the official repository (the carried one stays
 *                                         as the version to go back to)
 *     kernel:    { host, port, origins, loopbackOrigins, secureCookies, net, oauth, settings, ui }   into config.json
 *                                         (settings: the kernel's settings, src/settings.js, e.g.
 *                                         { "files.maxFileSize": 2147483648, "files.quota": 10737418240 };
 *                                         ui false: lilOS without UI, only the API; see config.js)
 *     modules:   { source, list, config } list: [{ name, source?, config? }] the kernel's modules (null:
 *                                         those of the release's config.json, or of the image); source
 *                                         'server' (newest of the official repository) or 'local' (the
 *                                         copy the release carries, when it has one); config: { name:
 *                                         { … } } the configuration of a module, whatever the list
 *     repos:     [{ url, name? }]         repositories added for apps and modules
 *     apps:      [id | { id, repo?, allowUnsigned? }]   installed at the first start (null: the usual
 *                                         system apps); repo: the url of a repository in `repos`
 *                                         (else the official one); allowUnsigned: an app not verified,
 *                                         accepted here instead of in the AppStore's warning
 *     users:     [{ username, name?, role?, password?, settings? }]   created at the first start; without
 *                                         a password a user is not created (the program asks for its
 *                                         first administrator)
 *     settings:  { theme, accent, … }     the starting settings of lilOS of every new user (the keys
 *                                         of src/systemSettings.js), also of users made later
 *     acceptLicense: true | false         who prepares the installation accepts the license of lilOS
 *                                         (src/license.js) for it: no administrator is asked at the
 *                                         first start (they are asked again when its text changes)
 *     applied:   date                     written by the kernel when it has created users and apps,
 *                                         together with removing the passwords from the file }
 *
 * The kernel keeps its copy in its data folder (INSTALL_FILE); the passwords never stay there.
 */
export const INSTALL_FILE = 'lilos-install.json';

const SOURCES = ['local', 'server'];
const MODES = ['local', 'server'];
const NAME = /^[a-z][a-z0-9-]{0,40}$/;
const APP_ID = /^[a-z0-9][a-z0-9.-]{0,63}$/;
const USERNAME = /^[a-z0-9][a-z0-9._-]{1,31}$/;
const KERNEL_KEYS = ['host', 'port', 'origins', 'loopbackOrigins', 'secureCookies', 'net', 'oauth', 'settings', 'ui'];
const MAX_USERS = 200;
const MAX_APPS = 200;

const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);
const bad = (where, why) => { throw new Error(`${INSTALL_FILE}: ${where} ${why}`); };

/** ~, %VAR%, $VAR and ${VAR} of a path, then absolute (relative to `base`). */
export function expandPath(path, base) {
  const env = name => process.env[name] ?? process.env[Object.keys(process.env).find(k => k.toUpperCase() === name.toUpperCase())] ?? '';
  const out = String(path)
    .replace(/^~(?=$|[\\/])/, homedir())
    .replace(/%([\w()]+)%/g, (_, n) => env(n))
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (_, a, b) => env(a ?? b));
  return isAbsolute(out) ? resolve(out) : resolve(base, out);
}

function source(value, where, fallback) {
  if (value == null) return fallback;
  return SOURCES.includes(value) ? value : bad(where, `deve essere ${SOURCES.map(s => `"${s}"`).join(' o ')}`);
}

function serverOf(raw) {
  if (raw == null) return null;
  const s = typeof raw === 'string' ? { url: raw } : isObject(raw) ? raw : bad('installer.server', 'deve essere un indirizzo o { url, name, trusted }');
  let url;
  try {
    url = new URL(String(s.url));
  } catch {
    bad('installer.server.url', 'non è un indirizzo');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') bad('installer.server.url', 'deve essere http o https');
  return { url: url.origin, name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 80) : url.host, trusted: s.trusted === true };
}

function userOf(raw, i) {
  const where = `users[${i}]`;
  if (!isObject(raw)) bad(where, 'deve essere un oggetto');
  const username = String(raw.username ?? '').trim().toLowerCase();
  if (!USERNAME.test(username)) bad(`${where}.username`, 'non è valido: 2-32 tra lettere minuscole, cifre, punto, trattino e trattino basso');
  if (raw.role != null && raw.role !== 'admin' && raw.role !== 'user') bad(`${where}.role`, 'deve essere "admin" o "user"');
  if (raw.password != null && (typeof raw.password !== 'string' || raw.password.length < 8 || raw.password.length > 256)) bad(`${where}.password`, 'deve avere da 8 a 256 caratteri');
  if (raw.settings != null && !isObject(raw.settings)) bad(`${where}.settings`, 'deve essere un oggetto');
  return {
    username, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : null,
    role: raw.role ?? 'user', password: raw.password ?? null, settings: raw.settings ?? {},
  };
}

function appOf(raw, i) {
  const a = typeof raw === 'string' ? { id: raw } : isObject(raw) ? raw : bad(`apps[${i}]`, 'deve essere un id o { id, repo, allowUnsigned }');
  if (!APP_ID.test(String(a.id ?? ''))) bad(`apps[${i}].id`, 'non è un id di app');
  if (a.repo != null && typeof a.repo !== 'string') bad(`apps[${i}].repo`, 'deve essere l\'indirizzo di un repository');
  return { id: a.id, repo: a.repo && a.repo !== 'official' ? a.repo : null, allowUnsigned: a.allowUnsigned === true };
}

/**
 * The settings checked and complete (every field there, with its default), or throws saying what
 * is wrong. `base`: the folder relative paths start from (the file's own).
 */
export function checkInstallSettings(raw, { base = process.cwd() } = {}) {
  if (!isObject(raw)) bad('', 'deve contenere un oggetto JSON');
  if (raw.format != null && raw.format !== 1) bad('format', `${raw.format} non è gestito (questa versione legge il formato 1)`);
  const installer = raw.installer ?? {};
  if (!isObject(installer)) bad('installer', 'deve essere un oggetto');
  if (installer.mode != null && !MODES.includes(installer.mode)) bad('installer.mode', 'deve essere "local", "server" o null');
  const server = serverOf(installer.server);
  if (installer.mode === 'server' && !server) bad('installer.server', 'serve con mode "server"');
  if (installer.dir != null && (typeof installer.dir !== 'string' || !installer.dir.trim())) bad('installer.dir', 'deve essere una cartella');

  const kernel = raw.kernel ?? {};
  if (!isObject(kernel)) bad('kernel', 'deve essere un oggetto');
  const unknown = Object.keys(kernel).filter(k => !KERNEL_KEYS.includes(k));
  if (unknown.length) bad('kernel', `ha chiavi sconosciute: ${unknown.join(', ')} (ammesse: ${KERNEL_KEYS.join(', ')})`);
  if (kernel.port != null && !(Number.isInteger(kernel.port) && kernel.port > 0 && kernel.port < 65536)) bad('kernel.port', 'non è una porta');
  if (kernel.ui != null && typeof kernel.ui !== 'boolean') bad('kernel.ui', 'deve essere true o false');

  const modules = raw.modules ?? {};
  if (!isObject(modules)) bad('modules', 'deve essere { source, list, config }');
  if (modules.config != null && (!isObject(modules.config) || Object.entries(modules.config).some(([k, v]) => !NAME.test(k) || !isObject(v)))) {
    bad('modules.config', 'deve essere { "<modulo>": { … } }');
  }
  const modulesSource = source(modules.source, 'modules.source', 'server');
  let list = null;
  if (modules.list != null) {
    if (!Array.isArray(modules.list)) bad('modules.list', 'deve essere una lista');
    list = modules.list.map((m, i) => {
      if (!isObject(m) || !NAME.test(String(m.name ?? ''))) bad(`modules.list[${i}]`, 'deve essere { name, source, config }');
      if (m.config != null && !isObject(m.config)) bad(`modules.list[${i}].config`, 'deve essere un oggetto');
      return { name: m.name, source: source(m.source, `modules.list[${i}].source`, modulesSource), config: m.config ?? null };
    });
  }

  const repos = raw.repos ?? [];
  if (!Array.isArray(repos)) bad('repos', 'deve essere una lista');
  const apps = raw.apps == null ? null : Array.isArray(raw.apps) ? raw.apps.slice(0, MAX_APPS).map(appOf) : bad('apps', 'deve essere una lista o null');
  const users = raw.users ?? [];
  if (!Array.isArray(users)) bad('users', 'deve essere una lista');
  if (users.length > MAX_USERS) bad('users', `ha più di ${MAX_USERS} utenti`);
  const settings = raw.settings ?? {};
  if (!isObject(settings)) bad('settings', 'deve essere un oggetto');
  if (raw.image != null && (typeof raw.image !== 'string' || !raw.image.trim())) bad('image', 'deve essere una cartella, un archivio o un indirizzo');
  const image = raw.image == null ? null : /^https?:\/\//i.test(raw.image) ? raw.image.trim() : expandPath(raw.image, base);
  if (raw.acceptLicense != null && typeof raw.acceptLicense !== 'boolean') bad('acceptLicense', 'deve essere true o false');

  return {
    format: 1,
    installer: { dir: installer.dir ? expandPath(installer.dir, base) : null, mode: installer.mode ?? null, server },
    image,
    lilos: { source: source(raw.lilos?.source, 'lilos.source', 'local') },
    kernel: Object.fromEntries(KERNEL_KEYS.filter(k => kernel[k] !== undefined).map(k => [k, kernel[k]])),
    modules: { source: modulesSource, list, config: modules.config ?? {} },
    repos: repos.map((r, i) => {
      const repo = typeof r === 'string' ? { url: r } : r;
      if (!isObject(repo) || typeof repo.url !== 'string') bad(`repos[${i}]`, 'deve essere un indirizzo o { url, name }');
      return { url: repo.url, name: typeof repo.name === 'string' ? repo.name : null };
    }),
    apps,
    users: users.map(userOf),
    settings,
    acceptLicense: raw.acceptLicense === true,
    applied: typeof raw.applied === 'string' ? raw.applied : null,
  };
}

/** Reads and checks a lilos-install.json (relative paths in it start from its folder). */
export async function readInstallSettings(file) {
  let raw;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(err.code === 'ENOENT' ? `${file}: il file non esiste` : `${file}: non è JSON valido (${err.message})`);
  }
  return checkInstallSettings(raw, { base: dirname(resolve(file)) });
}

/** The settings without the users' passwords: what stays written once they are used. */
export const withoutPasswords = settings => ({ ...settings, users: settings.users.map(({ password, ...u }) => u) });
