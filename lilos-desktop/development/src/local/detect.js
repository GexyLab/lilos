import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { settings } from '../store.js';

/**
 * A lilOS already on this computer, installed by hand: a kernel that answers on 127.0.0.1 on the
 * usual ports (GET /api/session gives { mode, user }), and, if there, the version written in
 * ~/lilos/current.json (the usual folder of tools/install.js). Not the program's own lilOS.
 */
const PORTS = [8790, 8791, 8792, 8793, 8794, 8795];

async function answers(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/session`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return false;
    const body = await res.json();
    return body && (body.mode === 'multi' || body.mode === 'single');
  } catch {
    return false;
  }
}

export async function findInstalled() {
  const own = settings().local.port;
  let version = null, dir = null;
  try {
    dir = join(homedir(), 'lilos');
    version = String(JSON.parse(readFileSync(join(dir, 'current.json'), 'utf8')).version);
  } catch {
    dir = null;
  }
  const found = [];
  for (const port of PORTS) {
    if (port === own) continue;
    if (await answers(port)) found.push({ url: `http://127.0.0.1:${port}`, port, version: port === 8790 ? version : null, dir: port === 8790 ? dir : null });
  }
  return found;
}
