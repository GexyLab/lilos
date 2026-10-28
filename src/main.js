import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/canvas.css';
import './styles/desktop.css';
import './styles/taskbar.css';
import './styles/start-menu.css';

import { bus } from './core/events.js';
import { Canvas } from './canvas/Canvas.js';
import { createHud } from './canvas/Hud.js';
import { Desktop } from './desktop/Desktop.js';
import { Taskbar } from './taskbar/Taskbar.js';

const root = document.getElementById('app');

const canvas = new Canvas(root);
root.append(createHud(canvas));
const desktop = new Desktop(canvas);
const taskbar = new Taskbar(root);

// No window manager yet: requests are only logged
bus.on('app:launch', ({ id }) => console.info('[lilos] avvia app:', id));
bus.on('item:open', item => console.info('[lilos] apri:', item.type, item.name));

if (import.meta.env.DEV) window.lilos = { bus, canvas, desktop, taskbar };
