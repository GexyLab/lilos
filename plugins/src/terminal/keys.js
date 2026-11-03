import * as sdk from '@lilos/sdk';

/**
 * Terminal's shortcuts (contributes.commands in app.json; the user changes them in the Control
 * Panel → Shortcuts). The terminals take every other key for themselves, so they let these pass
 * on to lilOS: see isCommand(). The window runs them (window.js command()).
 */
export const COMMANDS = [
  'terminal.newShell', 'terminal.splitRight', 'terminal.splitDown', 'terminal.detach', 'terminal.broadcast',
  'terminal.focusLeft', 'terminal.focusRight', 'terminal.focusUp', 'terminal.focusDown',
  'terminal.previousTab', 'terminal.nextTab',
  'terminal.moveLeft', 'terminal.moveRight', 'terminal.moveUp', 'terminal.moveDown',
];

/** True if the key event is one of Terminal's shortcuts (as the user set them). */
export function isCommand(e) {
  if (!(e.altKey || e.ctrlKey || e.metaKey)) return false;
  return COMMANDS.some(id => {
    try { return sdk.shortcuts.matches(e, id); } catch { return false; }
  });
}

/** The keys of a command for a menu ('Alt Maiusc D'), or ''. */
export function keysOf(id) {
  try { return sdk.shortcuts.label(id); } catch { return ''; }
}
