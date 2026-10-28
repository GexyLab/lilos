import '@lilos/sdk/styles.css';
import './styles/canvas.css';
import './styles/desktop.css';
import './styles/taskbar.css';
import './styles/start-menu.css';
import './styles/open-with.css';

import './systemSettings.js';
import { bus, fs, settings, shortcuts } from '@lilos/sdk';
import { setupFileSystem } from './systemFs.js';
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

const root = document.getElementById('app');
const deskFolder = setupFileSystem();

const canvas = new Canvas(root);
const hud = createHud(canvas);
root.append(hud);
registerItemCommands();
registerAppCommands(apps);
const desktop = new Desktop(canvas, deskFolder);
const taskbar = new Taskbar(root);
const wm = new WindowManager(canvas, taskbar);
connectLauncher(wm);
setChooser(createOpenWith(wm));

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

if (import.meta.env.DEV) window.lilos = { bus, canvas, desktop, taskbar, wm, settings, shortcuts, fs };
