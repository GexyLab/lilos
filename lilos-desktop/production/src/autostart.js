import { app } from 'electron';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * The program starts with the computer (when the user signs in), with --hidden: the kernel runs,
 * the window stays closed (the tray icon opens it). Windows and macOS: the system's login items;
 * Linux: ~/.config/autostart/lilos.desktop (XDG), with the AppImage's path when it is one.
 */
const LINUX_FILE = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'autostart', 'lilos.desktop');

export function setAutostart(on) {
  if (!app.isPackaged) return;
  if (process.platform === 'linux') {
    if (!on) return rmSync(LINUX_FILE, { force: true });
    const exec = process.env.APPIMAGE || process.execPath;
    mkdirSync(join(LINUX_FILE, '..'), { recursive: true });
    writeFileSync(LINUX_FILE, [
      '[Desktop Entry]', 'Type=Application', 'Name=lilOS', `Exec="${exec}" --hidden`, 'Icon=lilos',
      'X-GNOME-Autostart-enabled=true', 'NoDisplay=true', '',
    ].join('\n'));
    return;
  }
  app.setLoginItemSettings({ openAtLogin: on, openAsHidden: on, args: on ? ['--hidden'] : [] });
}
