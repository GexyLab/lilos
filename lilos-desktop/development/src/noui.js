import { app, clipboard, dialog, shell } from 'electron';
import { join } from 'node:path';
import { setAutostart } from './autostart.js';
import { addCommand, commandText } from './command.js';
import { t } from './i18n.js';
import { shownLicense } from './license.js';
import { local } from './local/index.js';
import { launcherPath, setUi } from './local/kernel.js';
import { LOG_DIR, bundledRelease, hasRuntime } from './runtime.js';
import { addProfile, localProfile, noUi, settings, update } from './store.js';
import { openTerminal } from './terminal.js';
import { openProfile } from './windows.js';

/**
 * lilOS without UI («Senza UI» at the first start): the same kernel and database as «Su questo
 * computer», installed with install.js --no-ui ("ui": false: the kernel serves no page, only its
 * API). No window of lilOS ever: the program lives in the tray (tray.js) and keeps the kernel on;
 * lilOS is used from the lilos command in a terminal. settings.local.ui is false, the local profile
 * is there as for «Su questo computer» (resume() starts it), but its window never opens
 * (windows.js openProfile). From here to lilOS with the UI: switchToUi (only that way, for now).
 */
export const NO_UI_MIN = '1.33.0';

const newer = (a, b) => {
  const [x, y] = [a, b].map(v => String(v).split('.').map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

/** Whether this copy of the program can install lilOS without UI: { ok, version } (the carried release). */
export function noUiSupport() {
  const release = bundledRelease();
  return { ok: hasRuntime() && !!release && newer(release.version, NO_UI_MIN) >= 0, version: release?.version ?? null };
}

let running = null;

/**
 * Installs and starts lilOS without UI, then what the person chose: start with the computer, the
 * lilos command on the PATH. The progress goes to the welcome page (local's 'progress'). Answers
 * what the page «Pronto» says: { version, port, command, launcher, onPath, localBinMissing, pathError }.
 */
export function setupNoUi(options) {
  running ??= doSetup(options).finally(() => { running = null; });
  return running;
}

async function doSetup({ username = null, password = null, autostart = true, path = true, acceptLicense = false } = {}) {
  if (localProfile()) throw new Error(t('welcome.local.exists'));
  if (!noUiSupport().ok) throw new Error(t('noui.unsupported', { min: NO_UI_MIN }));
  await local.setup({ username, password, noUi: true, acceptLicense });
  update(d => { d.local.ui = false; d.startAtLogin = autostart; });
  const license = shownLicense();
  if (acceptLicense) local.note(t('noui.log.license', { source: t(license?.source === 'bundled' ? 'noui.log.bundled' : 'noui.log.remote') }));
  local.note(t('noui.log.kernel', { version: local.version ?? '?', port: settings().local.port }));
  setAutostart(autostart);
  if (autostart) local.note(t('noui.log.autostart'));
  let result = { onPath: false, localBinMissing: false, pathError: null };
  if (path) {
    try {
      result = { ...result, ...await addCommand() };
      local.note(t('noui.log.path'));
    } catch (err) {
      result.pathError = err.message;
      local.note(t('noui.log.pathFailed', { error: err.message }));
    }
  }
  // Last: with the profile there, the program is set up (main.js no longer shows the welcome page)
  addProfile({ name: t('profile.local'), kind: 'local', url: null, trusted: true });
  return { ...result, version: local.version, port: settings().local.port, command: commandText(), launcher: launcherPath() };
}

/** The program is set up without UI: nothing of it is shown but the tray (no Dock icon on macOS either). */
export function settle() {
  if (noUi() && process.platform === 'darwin') app.dock?.hide();
}

/** «Apri il terminale lilOS»: a terminal of the computer with lilos started (the kernel started first, if needed). */
export async function openCliTerminal() {
  try {
    if (local.status !== 'running') await local.start();
    await openTerminal(launcherPath());
  } catch (err) {
    dialog.showMessageBox({ type: 'error', message: t('noui.terminalFailed'), detail: `${err.message}\n\n${t('noui.terminalHint', { command: commandText() })}`, noLink: true });
  }
}

/** «Copia il comando lilos». */
export const copyCommand = () => clipboard.writeText(commandText());

/** «Log del kernel»: the log the program keeps of the kernel's output. */
export const openKernelLog = () => shell.openPath(join(LOG_DIR, 'kernel.log'));

/**
 * «Passa a lilOS con la UI», after a question: "ui" out of config.json, the kernel restarted (with
 * the UI and no app it installs the system apps by itself), then lilOS's window, as «Su questo
 * computer» opens it (the status page while the kernel starts). True if it switched.
 */
export async function switchToUi() {
  const { response } = await dialog.showMessageBox({
    type: 'question', buttons: [t('noui.switch.ok'), t('common.cancel')], defaultId: 0, cancelId: 1, noLink: true,
    message: t('noui.switch.title'), detail: t('noui.switch.text'),
  });
  if (response !== 0) return false;
  // Stopped first, then the window starts it again (load() in windows.js): no race with the old kernel
  await local.stop().catch(() => {});
  setUi(true);
  update(d => { d.local.ui = true; });
  if (process.platform === 'darwin') app.dock?.show();
  const profile = localProfile();
  if (profile) openProfile(profile);
  return true;
}
