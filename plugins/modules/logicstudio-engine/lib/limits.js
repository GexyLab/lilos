/**
 * Global limits (the module's settings, Control Panel → Logic Studio → Limiti) and the quotas of
 * each user (defaults from the settings, an admin may give a user other ones: Quote).
 */

export const GLOBAL = {
  totalActive: { min: 1, max: 10000, default: 200 },
  totalMemoryMb: { min: 64, max: 65536, default: 1024 },
  maxBlocks: { min: 10, max: 5000, default: 200 },
  maxLinks: { min: 10, max: 20000, default: 600 },
  runsPer10s: { min: 100, max: 1000000, default: 10000 },
  blockSeconds: { min: 1, max: 600, default: 30 },
  testMinutes: { min: 1, max: 240, default: 5 },
  maxSchemas: { min: 1, max: 200, default: 20 },
  maxWindows: { min: 1, max: 100, default: 10 },
  maxComponents: { min: 10, max: 2000, default: 200 },
  maxProjectLinks: { min: 10, max: 5000, default: 200 },
  maxAddedPorts: { min: 1, max: 64, default: 32 },
  maxConsoles: { min: 1, max: 50, default: 10 },
  consoleLinesPerSecond: { min: 1, max: 10000, default: 50 },
  chartPoints: { min: 10, max: 100000, default: 1000 },
};

export const QUOTA = {
  maxActive: { min: 0, max: 1000, default: 10 },
  maxTests: { min: 0, max: 100, default: 2 },
  cpuPercent: { min: 1, max: 100, default: 25 },
  memoryMb: { min: 16, max: 8192, default: 128 },
  netPerMinute: { min: 0, max: 100000, default: 120 },
  logMb: { min: 1, max: 10240, default: 20 },
};

const clamp = (v, { min, max, default: d }) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};

/** The global limits from the module's config (ctx.config). */
export function globalLimits(config) {
  return Object.fromEntries(Object.entries(GLOBAL).map(([k, spec]) => [k, clamp(config?.[k], spec)]));
}

/** A user's quota: the defaults (config, keys quota<Name>) with the admin's overrides for them. */
export function quotaOf(config, overrides) {
  const out = {};
  for (const [k, spec] of Object.entries(QUOTA)) {
    const base = clamp(config?.[`quota${k[0].toUpperCase()}${k.slice(1)}`], spec);
    out[k] = overrides && overrides[k] !== undefined ? clamp(overrides[k], spec) : base;
  }
  return out;
}

/** An admin's quota for a user, checked: only known keys, in range; null removes the override. */
export function cleanOverrides(raw) {
  if (raw === null) return null;
  const out = {};
  for (const [k, spec] of Object.entries(QUOTA)) if (raw?.[k] !== undefined && raw[k] !== null) out[k] = clamp(raw[k], spec);
  return Object.keys(out).length ? out : null;
}

/** What the worker's executor needs. */
export const runtimeLimits = (global, quota) => ({ runsPer10s: global.runsPer10s, blockMs: global.blockSeconds * 1000, cpuPercent: quota.cpuPercent });
