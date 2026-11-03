import { NetTestWindow } from './window.js';
import './nettest.css';

/**
 * NetTest: requests to APIs and services on the network, made by lilOS's kernel (no CORS, the
 * network the kernel reaches, within the rules an admin sets): HTTP/REST and GraphQL with
 * variables, environments with secret values, auth (Basic, Bearer, API key, Digest, AWS, OAuth 2.0),
 * scripts and checks; live sessions (WebSocket, SSE, TCP, TLS, UDP, MQTT) and gRPC; collections in
 * .nettest files, run in order, with data files, or by the Scheduler with lilOS closed.
 * The kernel's side is calls/ (the SDK's `calls`); a system app, from the AppStore.
 *
 *   default       the window ({ file } a .nettest to open; { tabs, active } as getState kept them)
 *   filePreview   the previews of .nettest files
 */
export default function createNetTest({ args, openWindow } = {}) {
  const w = new NetTestWindow({ args: args ?? {}, openWindow });
  w.win.on('launch', a => { if (typeof a?.file === 'string') w.openFileArg(a.file); });
  return w.win;
}

export { filePreview } from './preview.js';
