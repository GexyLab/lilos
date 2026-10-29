import '@lilos/sdk/styles.css';
import './styles/canvas.css';
import './styles/desktop.css';
import './styles/taskbar.css';
import './styles/start-menu.css';
import './styles/open-with.css';
import './styles/workareas.css';
import './styles/workspaces.css';
import './styles/tags.css';
import './styles/items.css';
import './styles/packages.css';

import './systemSettings.js';
import * as sdk from '@lilos/sdk';
import { bus, fs, settings, shortcuts, history, kernel, toast } from '@lilos/sdk';
import * as systemApi from './systemApi.js';
import { watchSession } from './boot/boot.js';
import { setupFileSystem } from './systemFs.js';
import { setupTrash } from './systemTrash.js';
import { registerItemCommands } from './items/targets.js';
import { launch } from './apps/registry.js';
import { registerPackages, connectPackages } from './apps/packages/packages.js';
import { openFile, setChooser } from './apps/open.js';
import { createOpenWith } from './apps/openWith.js';
import { Canvas } from './canvas/Canvas.js';
import { createHud } from './canvas/Hud.js';
import { Desktop } from './desktop/Desktop.js';
import { Taskbar } from './taskbar/Taskbar.js';
import { WindowManager } from './windows/WindowManager.js';
import { connectLauncher } from './apps/launcher.js';
import { Workareas } from './workareas/Workareas.js';
import { setupHistory } from './systemHistory.js';
import { setupWorkspaces } from './workspaces/setup.js';
import { workspaceKey } from './workspaces/store.js';
import { Workspaces } from './workspaces/Workspaces.js';

const root = document.getElementById('app');
watchSession();
watchSaving();
// What system apps import as /host/sdk.js and /host/system.js (scripts/host-shims.mjs)
globalThis.__lilosHost = Object.freeze({ sdk, system: systemApi });
// Installed apps first: the workspaces show every app they find
registerPackages();
// Shared folders first, then the workspaces (each with its own desk): fs then shows only the current one's
const state = setupWorkspaces(setupFileSystem());
setupTrash();
const space = state.list.find(w => w.id === state.current);
const key = part => workspaceKey(space.id, part);

const canvas = new Canvas(root, { key: key('camera') });
const hud = createHud(canvas);
root.append(hud);
registerItemCommands();
const desktop = new Desktop(canvas, space.desk, key('desktop-layout'));
const taskbar = new Taskbar(root);
const wm = new WindowManager(canvas, taskbar);
wm.setWorkspace(space.id);   // before any window opens (workareas reopen theirs right away)
const launcher = connectLauncher(wm);
setChooser(createOpenWith(wm));
const workareas = new Workareas({ canvas, desktop, wm, launcher, key: key('workareas') });
const workspaces = new Workspaces({ state, canvas, desktop, wm, launcher, workareas, taskbar });
connectPackages({ desk: () => workspaces.current?.desk ?? null }).catch(err => console.error('[lilos] app:', err));
setupHistory({ root: desktop.history, activeWindow: () => wm.active });

// The desktop keeps the keyboard only while no window is focused
wm.on('focus', win => { desktop.keyboard = !win; });

settings.watch('snap', on => { desktop.snapToGrid = on; });
settings.watch('minimap', on => {
  hud.classList.toggle('no-minimap', !on);
  canvas.changed();
});

// Folders open in the File Manager; files with their app (or the "Apri con" window)
bus.on('item:open', node => {
  if (node?.type === 'folder') launch('files', { folder: node.id });
  else if (node?.type === 'file') openFile(node);
});

if (import.meta.env.DEV) window.lilos = { bus, canvas, desktop, taskbar, wm, workareas, workspaces, settings, shortcuts, fs, history, kernel };

/** Tells when changes cannot reach the kernel (they are retried), and when they did after all. */
function watchSaving() {
  let failing = false;
  kernel.on('status', ({ saving, error }) => {
    if (error) {
      if (!failing) toast(`Modifiche non salvate: ${error}. Riprovo…`, { timeout: 6000 });
      failing = true;
    } else if (!saving && failing) {
      toast('Modifiche salvate');
      failing = false;
    }
  });
  addEventListener('beforeunload', e => { if (kernel.pending) e.preventDefault(); });
}
