import { storage, uid } from '@lilos/sdk';
import { ACCENTS } from '../systemSettings.js';

const STORAGE_KEY = 'workspaces';
const MAX_WORKSPACES = 20;
const MAX_REMOVED = 100;
const MAX_NAME = 40;
const ID = /^[\w-]{1,40}$/;
const COLOR = /^#[0-9a-f]{6}$/i;

/** What each workspace keeps apart, under 'lilos:ws:<id>:<part>'. */
export const PARTS = ['camera', 'desktop-layout', 'workareas', 'windows'];

/**
 * Saved workspaces ('lilos:workspaces'), validated on load: stored data is untrusted.
 *
 *   { current: id, list: [Workspace] }
 *   Workspace: { id, name, color, created, desk, apps: [app ids], known: [app ids] }
 *   Removed:   { id, name, color, created, removed }   kept so the files they made still say whose they are
 *
 * `desk` is the workspace's private desk folder; `apps` the apps installed in it (system apps are
 * always installed and need not be listed); `known` the apps lilOS had when it was last saved, so
 * an app added to lilOS later arrives installed (one the user removed stays removed).
 * Everything else a workspace has (camera, desk positions, workareas, windows) lives in its own
 * keys: see workspaceKey().
 */
const finite = v => Number.isFinite(v);

export const cleanName = v => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '');
export const cleanColor = v => (typeof v === 'string' && COLOR.test(v) ? v : ACCENTS[0].value);

/** 'ws:<id>:<part>': the storage key of one part of a workspace. */
export const workspaceKey = (id, part) => `ws:${id}:${part}`;

function cleanWorkspace(raw, now, appIds) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !ID.test(raw.id)) return null;
  const base = { id: raw.id, name: cleanName(raw.name) || 'Workspace', color: cleanColor(raw.color), created: finite(raw.created) ? raw.created : now };
  if (finite(raw.removed)) return { ...base, removed: raw.removed };
  if (typeof raw.desk !== 'string' || !raw.desk) return null;
  const installed = Array.isArray(raw.apps) ? raw.apps.filter(a => appIds.has(a)) : [...appIds];
  // Apps lilOS did not have when this was saved: installed (without `known`, every app was known)
  const known = new Set(Array.isArray(raw.known) ? raw.known : Array.isArray(raw.apps) ? [...appIds] : []);
  const added = [...appIds].filter(a => !known.has(a));
  return { ...base, desk: raw.desk, apps: [...new Set([...installed, ...added])], known: [...appIds] };
}

/** { current, list }: `list` has live and removed workspaces; `current` may be invalid (the caller fixes it). */
export function loadWorkspaces(appIds) {
  const data = storage.get(STORAGE_KEY);
  const now = Date.now();
  const seen = new Set();
  const all = Array.isArray(data?.list) ? data.list.slice(0, MAX_WORKSPACES + MAX_REMOVED) : [];
  const list = all.map(w => cleanWorkspace(w, now, appIds)).filter(w => w && !seen.has(w.id) && seen.add(w.id));
  const live = list.filter(w => !w.removed).slice(0, MAX_WORKSPACES);
  const removed = list.filter(w => w.removed).slice(-MAX_REMOVED);
  return { current: typeof data?.current === 'string' ? data.current : null, list: [...live, ...removed] };
}

export function saveWorkspaces(state) {
  storage.set(STORAGE_KEY, state);
}

export function newWorkspace({ name, color, desk, apps, id = uid() }) {
  return { id, name: cleanName(name) || 'Workspace', color: cleanColor(color), created: Date.now(), desk, apps: [...apps], known: [...apps] };
}

/** Removes every key of a workspace. */
export function forgetWorkspace(id) {
  PARTS.forEach(part => storage.remove(workspaceKey(id, part)));
}

export const LIMITS = { MAX_WORKSPACES, MAX_NAME };
