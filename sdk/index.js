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
export { locale, LANGUAGES, formatBytes } from './core/locale.js';
export { textDirection } from './core/i18n.js';
export { kernel, KernelError } from './core/kernel.js';
export { apps, repositories, kernelModules, packages, systemReleases, languagePacks } from './core/apps.js';
export { notifications } from './core/notifications.js';
export { kernelSettings, DEFAULT_FILE_LIMITS } from './core/kernelSettings.js';
export { schedule } from './core/schedule.js';
export { logic, LiveProgram } from './core/logic.js';
export { LogicSchema, LogicWindow, LogicProject, LOGIC_FORMATS, LOGIC_EXTENSIONS, PORT_TYPES, portsOf, typesMatch, linkKey } from './core/logicModel.js';
export { settings } from './core/settings.js';
export { shortcuts, comboFromEvent } from './core/shortcuts.js';
export { menus } from './core/menus.js';
export { UndoStack, history } from './core/history.js';
export { fs } from './core/fs.js';
export { net } from './core/net.js';
export { term } from './core/term.js';
export { calls } from './core/calls.js';
export { serial } from './core/serial.js';
export { host } from './core/host.js';
export { pipes, PipeStopped } from './core/pipeCatalog.js';
export { automation } from './core/automation.js';
export { tags, TAG_COLORS } from './core/tags.js';
export { splitName, fileType, fileTypeList } from './core/fileTypes.js';

// UI
export { icon, logo } from './ui/icons.js';
export { openMenu, closeMenu } from './ui/ContextMenu.js';
export { avatar } from './ui/avatar.js';
export { appIcon } from './ui/appIcon.js';
export { toggle, checkbox, selectField, segmented, radios, swatches, slider, textField, actionButton, busyButton } from './ui/controls.js';
export { resizeHandle } from './ui/resizeHandle.js';
export { shortcutField } from './ui/shortcutField.js';
export { selectionGesture } from './ui/selectionGesture.js';
export { toast } from './ui/toast.js';
export { LogicCanvas } from './ui/logic/LogicCanvas.js';
export { LogicConsoles, LogicConsoleView } from './ui/logic/LogicConsole.js';
export { LogicUI, COMMON_INPUTS } from './ui/logic/LogicUI.js';
export { formatLogicValue } from './ui/logic/format.js';
export { chart, CHART_KINDS } from './ui/charts.js';

// Windows
export { Window, WINDOW_EDGES } from './ui/Window.js';
export { SettingsView } from './ui/SettingsView.js';
export { SettingsWindow } from './ui/SettingsWindow.js';
export { messageBox } from './ui/messageBox.js';

export { version as SDK_VERSION } from './package.json';
