/**
 * What apps may know about workspaces, without depending on the system's controller: the File
 * Manager uses it to say which workspace each file belongs to. Connected by Workspaces at start-up.
 */
let source = null;

export function connectWorkspaceInfo(workspaces) {
  source = workspaces;
}

/**
 * { id, name, color, removed, current } of a workspace (a node's `workspace`), or null for none:
 * system folders shared by everyone, or lilOS without workspaces.
 */
export const describeWorkspace = id => (id ? source?.describe(id) ?? null : null);

/** The system's Workspaces controller (for the Settings app, which manages them), or null. */
export const workspaceManager = () => source;

/** Calls fn when workspaces change (added, renamed, removed, switched). Returns the function that stops it. */
export function onWorkspacesChange(fn) {
  const offs = source ? [source.on('change', fn), source.on('switch', fn)] : [];
  return () => offs.forEach(off => off());
}
