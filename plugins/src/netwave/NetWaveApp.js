import { makeWindow } from './browser.js';
import './netwave.css';

/**
 * NetWave Browser: web pages in tabs, in as many windows as wanted, each window savable as a
 * session (.nwsession) and a history that keeps both the pages and the sessions opened. The pages
 * never run inside lilOS: the program lilOS shows each one in a process and a session of its own
 * (the SDK's host.web, lilos-desktop's web.js); NetWave draws everything around them.
 *
 *   default       a window ({ url } a page, { file } a .nwsession, { private: true }; getState() back)
 *   filePreview   the previews of .nwsession files
 */
export default function createNetWave({ args, openWindow } = {}) {
  return makeWindow(args ?? {}, openWindow);
}

export { filePreview } from './preview.js';
