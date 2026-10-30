/**
 * '@lilos/system': what system apps (installed from the official repository, run inside lilOS
 * without a sandbox) use of the system besides the SDK. They are built apart and import
 * '/host/system.js' and '/host/sdk.js', which hand them these same modules (see
 * scripts/host-shims.mjs and system.js). Change it with care: removing or renaming something
 * breaks the installed apps that use it.
 */
export { version } from '../package.json';
export { ACCENTS, LASSO_OPTIONS, RETENTION_OPTIONS } from './systemSettings.js';
export { SYSTEM_FOLDERS, DESK_NAME } from './systemFs.js';
export { FOLDER_COLOR, itemIcon } from './desktop/itemIcons.js';
export { FIXED_ITEMS as DESK_FIXED_ITEMS } from './desktop/fixedItems.js';
export { LIMITS as WORKSPACE_LIMITS } from './workspaces/store.js';
export { describeWorkspace, onWorkspacesChange, workspaceManager } from './workspaces/info.js';
export { apps, registry, getApp, isInstalled, installedApps, launch } from './apps/registry.js';
export { fileApps, appFor, defaultAppFor, setAppFor, resetAppsFor, knownExtensions, openFile } from './apps/open.js';
export { handleCommand } from './apps/commands.js';
export { callEntrypoint, connectEntrypoint, entrypointsOf } from './apps/entrypoints.js';
export { startup } from './apps/startup.js';
export { executionMode, canChangeExecution } from './apps/packages/isolation.js';
export { describePermission } from './apps/packages/permissions.js';
export { showAppProperties, showAppSecurity } from './apps/appProperties.js';
export { showProperties } from './items/properties.js';
export { pickFile } from './apps/filePicker.js';
export { addTarget } from './items/targets.js';
export { links, linkEntry } from './items/links.js';
export { markItem, dropZone, dragItems, movableInto, moveInto } from './items/itemDrag.js';
export { recordCreated, renameNode, moveNode, restoreNodes, removeNodes } from './items/fsHistory.js';
export { confirmRemove } from './items/confirmRemove.js';
export { tagDots, tagSubmenu, setTag } from './tags/tagUi.js';
