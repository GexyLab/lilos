import { argsOf, oops } from './common.js';
import { Handles } from './handles.js';
import { allowed, denied } from './policy.js';
import { serialActions } from './serial.js';
import { usbActions } from './usb.js';
import { hidActions } from './hid.js';
import { midiActions } from './midi.js';
import { mediaActions } from './media.js';
import { audioActions } from './audio.js';
import { systemActions } from './system.js';
import { gpioActions } from './gpio.js';
import { homeFiles } from './shared/logic-files.js';

/**
 * The actions of the Hardware blocks, made in the kernel's main thread for the program's owner
 * (the engine's broker): fn(user, args, tools), user = { kind: 'user', id, username, name, role },
 * tools = { program: { id, name, kind }, signal (aborts when the program ends), … }.
 *
 * Every action checks first that the user may use its device class (policy.js). The devices kept
 * open live in `handles` (handles.js); hw.read is the long poll of all of them, hw.close closes one.
 *
 * makeActions({ policy: () => policy, fs: () => fs service, log }) → { actions, handles }
 */
export function makeActions({ policy, fs, log = null, maxHandlesPerUser = 16 }) {
  const handles = new Handles({ maxPerUser: maxHandlesPerUser, log });
  const files = homeFiles(fs);
  const need = (user, cls) => {
    if (user?.kind !== 'user' || !user.id) throw oops('Serve un utente');
    if (!allowed(policy(), user, cls)) throw denied(cls);
  };
  const env = { handles, need, files, log };

  const actions = {
    ...serialActions(env),
    ...usbActions(env),
    ...hidActions(env),
    ...midiActions(env),
    ...mediaActions(env),
    ...audioActions(env),
    ...systemActions(env),
    ...gpioActions(env),

    /** What an open device sent: { items, dropped, closed, reason }, waiting up to waitMs (≤ 20 s). */
    async 'hw.read'(user, args, tools) {
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle);
      // Permission taken back while it was open: the device is closed
      try { need(user, h.cls); } catch (err) { await handles.close(h.id, err.message); throw err; }
      return handles.take(h, a.waitMs, tools?.signal);
    },

    async 'hw.close'(user, args, tools) {
      const a = argsOf(args);
      let h;
      try { h = handles.get(user, tools, a.handle); } catch { return { closed: false }; }
      return { closed: await handles.close(h.id, null) };
    },
  };
  return { actions, handles };
}
