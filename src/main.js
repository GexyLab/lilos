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

import './systemSettings.js';
import { bus, fs, settings, shortcuts, history } from '@lilos/sdk';
import { setupFileSystem } from './systemFs.js';
import { setupTrash } from './systemTrash.js';
import { registerItemCommands } from './items/targets.js';
import { apps, launch } from './apps/registry.js';
import { registerAppCommands } from './apps/commands.js';
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
// Shared folders first, then the workspaces (each with its own desk): fs then shows only the current one's
const state = setupWorkspaces(setupFileSystem());
setupTrash();
const space = state.list.find(w => w.id === state.current);
const key = part => workspaceKey(space.id, part);

const canvas = new Canvas(root, { key: key('camera') });
const hud = createHud(canvas);
root.append(hud);
registerItemCommands();
registerAppCommands(apps);
const desktop = new Desktop(canvas, space.desk, key('desktop-layout'));
const taskbar = new Taskbar(root);
const wm = new WindowManager(canvas, taskbar);
wm.setWorkspace(space.id);   // before any window opens (workareas reopen theirs right away)
const launcher = connectLauncher(wm);
setChooser(createOpenWith(wm));
const workareas = new Workareas({ canvas, desktop, wm, launcher, key: key('workareas') });
const workspaces = new Workspaces({ state, canvas, desktop, wm, launcher, workareas, taskbar });
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

if (import.meta.env.DEV) window.lilos = { bus, canvas, desktop, taskbar, wm, workareas, workspaces, settings, shortcuts, fs, history };
