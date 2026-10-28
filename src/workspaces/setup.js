import { fs, storage } from '@lilos/sdk';
import { apps } from '../apps/registry.js';
import { DESK_NAME, fillDesk } from '../systemFs.js';
import { loadWorkspaces, saveWorkspaces, newWorkspace, workspaceKey } from './store.js';

/** Keys that every workspace now keeps apart: before workspaces they belonged to the only desk. */
const LEGACY_PARTS = ['camera', 'desktop-layout', 'workareas'];

export const appIds = () => new Set(apps.map(a => a.id));

/**
 * Removes the keys ('lilos:ws:<id>:…') of workspaces that no longer exist: written after a reset
 * by the last save of the page, or left by a workspace deleted in another tab.
 */
function dropOrphanKeys(live) {
  try {
    const orphans = [];
    for (let i = 0; i < localStorage.length; i++) {
      const m = /^lilos:(ws:([\w-]+):.+)$/.exec(localStorage.key(i));
      if (m && !live.has(m[2])) orphans.push(m[1]);
    }
    orphans.forEach(key => storage.remove(key));
  } catch {
    /* storage blocked: nothing to clean */
  }
}

/** A new private desk for a workspace; returns its id. */
export function createDesk(workspaceId) {
  return fs.create(fs.root, { type: 'folder', name: DESK_NAME, system: true, private: true, workspace: workspaceId }).id;
}

/**
 * Loads the workspaces before the desk is built and sets the current one in fs. Call after
 * setupFileSystem(), while no workspace is set yet (fs shows everything). It also repairs:
 *
 * - no workspace (first start, or data from before workspaces): one, "Principale", takes the old
 *   shared /Scrivania (made private), the owner of every file, and the old camera, positions and
 *   workareas; on first start its desk gets the seed;
 * - a private desk whose workspace is not in the list (the list was lost): the workspace comes back;
 * - a workspace whose desk is gone: it gets a new empty one.
 *
 * Returns the state { current, list }.
 */
export function setupWorkspaces({ firstStart }) {
  const ids = appIds();
  const state = loadWorkspaces(ids);
  const live = () => state.list.filter(w => !w.removed);
  const desks = () => fs.children(fs.root).filter(n => n.private && n.type === 'folder');

  for (const desk of desks()) {
    if (live().some(w => w.id === desk.workspace)) continue;
    const old = state.list.find(w => w.id === desk.workspace);
    state.list = state.list.filter(w => w !== old);
    state.list.push(newWorkspace({ id: desk.workspace, name: old?.name ?? 'Workspace recuperato', color: old?.color, desk: desk.id, apps: ids }));
  }

  if (!live().length) {
    const ws = newWorkspace({ name: 'Principale', desk: null, apps: ids });
    const legacy = fs.children(fs.root).find(n => n.name === DESK_NAME && n.type === 'folder' && n.system && !n.private);
    if (legacy) fs.makePrivate(legacy.id, ws.id);
    ws.desk = legacy?.id ?? createDesk(ws.id);
    if (firstStart) fillDesk(ws.desk, workspaceKey(ws.id, 'desktop-layout'));
    fs.claim(ws.id);   // no workspace is set yet: the seed and the old files get their owner here
    for (const part of LEGACY_PARTS) {
      const value = storage.get(part);
      if (value === undefined) continue;
      storage.set(workspaceKey(ws.id, part), value);
      storage.remove(part);
    }
    state.list.unshift(ws);
    state.current = ws.id;
  }

  for (const ws of live()) {
    const desk = fs.get(ws.desk);
    if (desk?.private && desk.workspace === ws.id && desk.parent === fs.root) continue;
    ws.desk = desks().find(n => n.workspace === ws.id)?.id ?? createDesk(ws.id);
  }

  if (!live().some(w => w.id === state.current)) state.current = live()[0].id;
  dropOrphanKeys(new Set(live().map(w => w.id)));
  saveWorkspaces(state);
  fs.setWorkspace(state.current);
  return state;
}
