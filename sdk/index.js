/**
 * lilOS SDK: the building blocks shared by the system shell and by apps.
 * Import only from here ('@lilos/sdk'); the files behind it may move.
 * Styles: import '@lilos/sdk/styles.css' once, before any other stylesheet.
 */

// Core
export { h, svg, isEditing, trackDrag } from './core/dom.js';
export { Emitter, bus } from './core/events.js';
export { storage, uid } from './core/storage.js';
export { session, initials } from './core/session.js';
export { settings } from './core/settings.js';
export { shortcuts, comboFromEvent } from './core/shortcuts.js';
export { menus } from './core/menus.js';
export { UndoStack, history } from './core/history.js';
export { fs } from './core/fs.js';
export { tags, TAG_COLORS } from './core/tags.js';
export { splitName, fileType, fileTypeList } from './core/fileTypes.js';

// UI
export { icon, logo } from './ui/icons.js';
export { openMenu, closeMenu } from './ui/ContextMenu.js';
export { avatar } from './ui/avatar.js';
export { appIcon } from './ui/appIcon.js';
export { toggle, selectField, segmented, swatches, slider, textField, actionButton } from './ui/controls.js';
export { shortcutField } from './ui/shortcutField.js';
export { selectionGesture } from './ui/selectionGesture.js';
export { toast } from './ui/toast.js';

// Windows
export { Window, WINDOW_EDGES } from './ui/Window.js';
export { SettingsView } from './ui/SettingsView.js';
export { SettingsWindow } from './ui/SettingsWindow.js';

export { version as SDK_VERSION } from './package.json';
