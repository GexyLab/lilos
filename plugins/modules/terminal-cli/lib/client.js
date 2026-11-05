import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * The kernel's HTTP API, as lilOS's page uses it: the session cookie, X-Lilos (the kernel refuses
 * changes without it), X-Lilos-Client: cli (the user's open pages hear of the files changed here,
 * api/home.js) and X-Lilos-Locale (the kernel's messages in the user's language).
 */
const COOKIE = 'lilos_session';
const TIMEOUT_MS = 60_000;

/** The kernel does not answer at that address (exit code 3). */
export class Unreachable extends Error {
  constructor(url, cause) {
    super(cause?.message ?? String(cause));
    this.url = url;
  }
}

/** The kernel answered with an error: status, code ('unauthorized', 'forbidden'…) and its message. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code || `HTTP ${status}`);
    this.status = status;
    this.code = code;
  }
}

export class Client {
  token = null;
  locale = 'en';

  constructor(url) {
    this.url = String(url).replace(/\/+$/, '');
  }

  async request(method, path, { json, body, raw = false, timeout = TIMEOUT_MS } = {}) {
    const headers = { 'X-Lilos': '1', 'X-Lilos-Client': 'cli', 'X-Lilos-Locale': this.locale };
    if (this.token) headers.Cookie = `${COOKIE}=${this.token}`;
    if (json !== undefined) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(this.url + path, {
        method, headers, redirect: 'manual', signal: AbortSignal.timeout(timeout),
        body: json !== undefined ? JSON.stringify(json) : body,
      });
    } catch (err) {
      throw new Unreachable(this.url, err.cause ?? err);
    }
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const m = new RegExp(`^${COOKIE}=([^;]*)`).exec(c);
      if (m) this.token = m[1] || null;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let data = null;
      try { data = JSON.parse(text); } catch { /* not JSON */ }
      throw new ApiError(res.status, data?.error ?? null, data?.message ?? text.slice(0, 200));
    }
    if (raw) return Buffer.from(await res.arrayBuffer());
    const text = await res.text();
    if (!text) return undefined;
    try { return JSON.parse(text); } catch { return text; }
  }

  get(path, options) { return this.request('GET', path, options); }
  post(path, json = {}, options) { return this.request('POST', path, { ...options, json }); }
  delete(path, options) { return this.request('DELETE', path, options); }
}

/**
 * The sessions kept with «Resta connesso» and the history of the lines typed, in the folder of the
 * computer's user: %APPDATA%\lilos-cli on Windows, $XDG_CONFIG_HOME/lilos-cli or ~/.config/lilos-cli
 * elsewhere (not «lilos»: on Windows it would be the program lilOS's own folder, %APPDATA%\lilOS).
 * LILOS_CLI_DIR changes it. cli.json: { servers: { [url]: { token, username, savedAt } } },
 * readable only by that user.
 */
export function configDir() {
  if (process.env.LILOS_CLI_DIR) return process.env.LILOS_CLI_DIR;
  if (process.platform === 'win32') return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'lilos-cli');
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'lilos-cli');
}

const sessionsFile = () => join(configDir(), 'cli.json');

function readSessions() {
  try {
    const data = JSON.parse(readFileSync(sessionsFile(), 'utf8'));
    return data && typeof data.servers === 'object' && !Array.isArray(data.servers) ? data : { servers: {} };
  } catch {
    return { servers: {} };
  }
}

function writeSessions(data) {
  mkdirSync(configDir(), { recursive: true, mode: 0o700 });
  const file = sessionsFile();
  writeFileSync(`${file}.tmp`, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(`${file}.tmp`, file);
  try { chmodSync(file, 0o600); } catch { /* Windows: the folder of the user already */ }
}

export const savedSession = url => readSessions().servers[url] ?? null;

export function saveSession(url, value) {
  const data = readSessions();
  if (value) data.servers[url] = value;
  else delete data.servers[url];
  writeSessions(data);
}
