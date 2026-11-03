import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOG_DIR, PG_DIR, pgTool, toolEnv } from '../runtime.js';
import { openLog, run } from './proc.js';

/**
 * The PostgreSQL the program carries, for the module fs-postgres of the lilOS run here: data in
 * <data>/postgres, listening only on 127.0.0.1 (no Unix socket), user `lilos` with a password
 * made at the first start. pg_ctl starts it in the background and stops it.
 */
export const USER = 'lilos';
export const DATABASE = 'lilos';

export const initialized = () => existsSync(join(PG_DIR, 'PG_VERSION'));

export const newPassword = () => randomBytes(24).toString('base64url');

export const url = ({ pgPort, pgPassword }) => `postgres://${USER}:${encodeURIComponent(pgPassword)}@127.0.0.1:${pgPort}/${DATABASE}`;

/** Creates the database cluster (once): initdb with the password, no other way in. */
export async function init(password) {
  if (initialized()) return;
  rmSync(PG_DIR, { recursive: true, force: true });
  mkdirSync(PG_DIR, { recursive: true });
  const pwfile = join(LOG_DIR, `pw-${process.pid}.tmp`);
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(pwfile, password, { mode: 0o600 });
  const log = openLog('postgres-init');
  try {
    const { code, output } = await run(pgTool('initdb'), [
      '-D', PG_DIR, '-U', USER, `--pwfile=${pwfile}`, '-A', 'scram-sha-256', '-E', 'UTF8', '--no-locale',
    ], { env: toolEnv(), log });
    if (code !== 0) throw new Error(`initdb non è riuscito (${code}): ${output.trim().split('\n').at(-1)}`);
  } finally {
    rmSync(pwfile, { force: true });
    log.end();
  }
}

/** Starts the server on 127.0.0.1:port and waits for it. */
export async function start(port) {
  const log = openLog('postgres');
  try {
    const { code, output } = await run(pgTool('pg_ctl'), [
      '-D', PG_DIR, '-l', join(LOG_DIR, 'postgres-server.log'), '-w', '-t', '60',
      '-o', `-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=`,
      'start',
    ], { env: toolEnv(), log });
    if (code !== 0) throw new Error(`PostgreSQL non è partito (${code}): ${output.trim().split('\n').at(-1)}`);
  } finally {
    log.end();
  }
}

export async function stop() {
  if (!initialized()) return;
  const log = openLog('postgres');
  try {
    await run(pgTool('pg_ctl'), ['-D', PG_DIR, '-m', 'fast', '-w', '-t', '30', 'stop'], { env: toolEnv(), log });
  } finally {
    log.end();
  }
}

/** True if the server of this folder is running (pg_ctl status). */
export async function running() {
  if (!initialized()) return false;
  const { code } = await run(pgTool('pg_ctl'), ['-D', PG_DIR, 'status'], { env: toolEnv() });
  return code === 0;
}
