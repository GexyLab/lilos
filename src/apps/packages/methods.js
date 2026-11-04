import { fs, storage, pipes, bus, notifications, net, term, calls, serial, kernel, automation, schedule, locale, messageBox } from '@lilos/sdk';
import { launch } from '../registry.js';
import { coversPath } from './permissions.js';
import { callEntrypoint, connectEntrypoint } from '../entrypoints.js';
import { openFile } from '../open.js';
import { filePreview } from '../filePreview.js';
import { notify } from '../../notifications/notify.js';
import { hardwareRule } from '../../host/desktop.js';

const { t } = locale.define('lilos:apps.methods', {
  en: { strings: {
    fileTooBig: 'File too large', textTooLong: 'Text too long', denied: 'Permission denied: {permission}',
    deniedContent: 'Permission denied: only an app with the file.read and file.write pipes can mark a content as its own',
    fileGone: 'The file no longer exists', readOnly: 'The file was handed over for reading only',
    noFile: 'The file does not exist', notFile: 'It is not a file', noFolder: 'The folder does not exist',
    emptyName: 'The name cannot be empty', notOwnEvent: 'The event {event} does not belong to {app}',
    notOwnAction: 'The action {action} does not belong to {app}',
    handOnlyOpen: 'Only files opened with the app can be handed over', nameOnlyOpen: 'Only files opened with the app can be named',
    useOnlyOpen: 'Only files opened with the app can be used', openOnlyHanded: 'Only a file opened with the app or handed to it can be opened',
    'window.title': 'Only a window has a title', 'window.close': 'Only a window can be closed',
    'window.message': 'Only a window can show a message', 'window.terminal': 'Only a window can show a terminal',
    'window.signIn': 'Only a window can sign in', 'window.session': 'Only a window can show a session',
    'window.choosePort': 'Only a window can choose a port', 'window.forgetPort': 'Only a window can forget a port',
    'window.openPort': 'Only a window can open a port', 'window.channel': 'Only a window can open a channel',
    keepAlive: 'Only a background entry point can stay running',
    noPipes: 'This part of the app cannot subscribe to pipes', badStage: 'stage must be "before" or "after"',
    badPosition: 'Invalid position', maxEvents: 'At most {max} events per app', badKey: 'Invalid key',
    valueTooBig: 'Value too large', unknownSchedulerEntry: 'Unknown entry point of the Scheduler',
    notNetwork: 'It is not in a network connection', sftpOnly: 'The terminal opens only on SFTP connections',
    popupBlocked: 'The browser blocked the sign-in tab', noSignIn: 'No such sign-in', badMethod: 'Invalid method',
    notStarted: '{app} did not start: {message}', unknownMethod: 'Unknown function: {method}',
  } },
});

/**
 * What an installed app may ask of lilOS through `lilos` (see bridge.js), each request checked
 * against the app's permissions. The same for every way the app runs; an app that is not
 * isolated could go around them, an isolated one cannot.
 */
const MAX_TEXT = 10 << 20;
const MAX_BYTES = 10 << 20;
const STORAGE_KEY = /^[\w.-]{1,64}$/;
const STAGES = ['before', 'after'];
const MAX_EVENTS = 20;   // events an app defines
const POSITIONS = ['first', 'middle', 'last'];

/** '~/Documenti/a.txt' → the node, if visible from the current workspace. */
const resolveHome = path => (typeof path === 'string' && /^~(\/[^/]+)*$/.test(path) ? fs.resolve(path) : null);
const splitPath = path => [path.slice(0, path.lastIndexOf('/')) || '~', path.slice(path.lastIndexOf('/') + 1)];
const fail = msg => { throw new Error(msg); };

/** The contents an app writes: text, or bytes (a Blob, an ArrayBuffer, a typed array). */
function content(data) {
  if (data instanceof Blob) return data.size <= MAX_BYTES ? data : fail(t('fileTooBig'));
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return data.byteLength <= MAX_BYTES ? new Blob([data]) : fail(t('fileTooBig'));
  const text = String(data);
  return text.length <= MAX_TEXT ? text : fail(t('textTooLong'));
}

/**
 * ctx: { pkg, win?, handles, readOnly?, instance?, pipe? }
 *   win        the app's window (null in the background)
 *   handles    ids of the files the app was opened with or handed: it may read and write them
 *   readOnly   ids of the files handed to it only to read, while a call lasts (a preview, see
 *              filePreview.js): anything with has(id)
 *   instance   the background entry point (background.js), for keepAlive
 *   pipe       its place in the pipes (pipes.js pipeTarget), for lilos.pipes
 */
export function hostMethods({ pkg, win = null, handles, readOnly = new Set(), instance = null, pipe = null }) {
  const perms = pkg.manifest.permissions ?? [];
  // The channels this window holds (remote terminals, serial ports, kernel modules): they close with it
  const channels = new Set();
  win?.on('destroy', () => channels.forEach(port => port.detach()));
  const terminal = () => (perms.includes('term') ? term : fail(t('denied', { permission: 'term' })));
  const requests = () => (perms.includes('calls') ? calls : fail(t('denied', { permission: 'calls' })));
  // The OAuth sign-ins by hand this window started (calls.signInByHand)
  const byHand = new Set();
  // Serial ports: with the permission, or for every app when the program lilOS lets all of them (hardwareRule)
  const ports = () => (perms.includes('serial') || hardwareRule() === 'all' ? serial : fail(t('denied', { permission: 'serial' })));
  const moduleApi = name => (typeof name === 'string' && perms.includes(`kernel:${name}`) ? kernel.module(name) : fail(t('denied', { permission: `kernel:${String(name).slice(0, 40)}` })));
  // The scheduler: an app's own operations (schedule), all of the user's to read (schedule.read) or to move (schedule.move)
  const own = () => (perms.includes('schedule') ? schedule.forApp(pkg.id) : fail(t('denied', { permission: 'schedule' })));
  const reader = () => (perms.includes('schedule.read') || perms.includes('schedule.move') ? schedule : fail(t('denied', { permission: 'schedule.read' })));
  const SCHEDULER_ENTRIES = new Set(['main', 'edit', 'create', 'history']);
  // What a calendar needs: when, how it went, what kind of action. Never what it does in detail
  // (command lines, addresses, bodies) nor what the runs wrote
  const brief = t => ({ id: t.id, owner: t.owner, app: t.app, name: t.name, enabled: t.enabled, when: t.when, next: t.next, last: t.last, running: t.running, recurrence: t.recurrence, what: { type: t.what?.type } });
  const briefRun = ({ log, text, ...run }) => run;
  const target = (ref, write) => {
    if (handles.has(ref)) return fs.get(ref) ?? fail(t('fileGone'));
    if (readOnly.has(ref)) return write ? fail(t('readOnly')) : fs.get(ref) ?? fail(t('fileGone'));
    if (!coversPath(perms, ref, { write })) fail(t('denied', { permission: ref }));
    return resolveHome(ref);
  };
  const fileOf = (ref, write) => {
    const node = target(ref, write) ?? fail(t('noFile'));
    return node.type === 'file' ? node : fail(t('notFile'));
  };
  // A new item at `ref` (a path the app may write): its folder, and its name (made unique when asked;
  // the unique name must be covered by the permissions too)
  const newParent = ref => (resolveHome(splitPath(ref)[0]) ?? fail(t('noFolder'))).id;
  const newName = (ref, unique) => {
    const [dir, name] = splitPath(ref);
    if (!unique) return name;
    const free = fs.uniqueName(newParent(ref), fs.cleanName(name) || fail(t('emptyName')));
    return coversPath(perms, `${dir}/${free}`, { write: true }) ? free : fail(t('denied', { permission: `${dir}/${free}` }));
  };
  const made = node => ({ id: node.id, name: node.name, ref: fs.tildePath(node.id) });
  // Who asks, for the handlers of the pipes: its own handlers are skipped
  const caller = node => ({ app: pkg.id, opened: handles.has(node.id) || readOnly.has(node.id), ...(pkg.system && { system: true }) });
  const ownEvent = name => {
    const def = typeof name === 'string' ? pipes.describe(name) : null;
    return def?.owner === pkg.id ? name : fail(t('notOwnEvent', { event: String(name).slice(0, 60), app: pkg.manifest.name }));
  };
  // An app hands another one (or another part of itself) only files it may use itself
  const handed = data => {
    if (!data || typeof data !== 'object') return data;
    const ids = [...('file' in data ? [data.file] : []), ...('files' in data ? (Array.isArray(data.files) ? data.files : [null]) : [])];
    if (ids.length > 100 || ids.some(id => typeof id !== 'string' || !handles.has(id))) fail(t('handOnlyOpen'));
    return data;
  };
  // content: true says lilOS must not read the file without the app: only for an app that reads
  // and writes its contents through the pipes (it would lock the user out of their files otherwise)
  const ownsContent = ['file.read', 'file.write'].every(e => perms.includes(`pipe:${e}`) || perms.includes(`pipe.own:${e}`));
  // Message boxes waiting for the app to check what the user filled in (lilos.ui.messageBox with validate)
  const boxes = new Map();
  let boxSeq = 0;
  const claim = value => {
    if (value && typeof value === 'object' && value.content === true && !ownsContent) fail(t('deniedContent'));
    return value;
  };
  return {
    'window.setTitle': text => (win ? win.setTitle(String(text).slice(0, 100)) : fail(t('window.title'))),
    // As the close button: the window manager closes it
    'window.close': () => (win ? win.emit('close') : fail(t('window.close'))),
    // A notification (permission ui.notify, which every app has): lilOS signs it with the app, never the app itself.
    // ui.toast is its old name: there is no message at the bottom of the screen any more
    'ui.toast': async text => { await notifications.send({ app: pkg.id, text: String(text) }); },
    'ui.notify': async value => {
      const n = value !== null && typeof value === 'object' ? value : { text: String(value ?? '') };
      await notifications.send({ app: pkg.id, text: n.text, level: n.level, action: n.action ?? null });
    },
    // A message box over the window (the SDK's messageBox, plain data only): { button, values }. With
    // validate, every answer but Cancel comes back with `box`, and the app replies with
    // ui.messageBox.check(box, problem): null closes it (that call resolves the final answer), a
    // text is shown and that call resolves the next answer
    'ui.messageBox': async spec => {
      if (!win) fail(t('window.message'));
      const options = boxOptions(spec);
      const wrap = r => (r && typeof r === 'object' ? r : { button: r ?? null, values: {} });
      if (plainObject(spec).validate !== true) return wrap(await messageBox(win, options));
      const id = `box${++boxSeq}`;
      let reply;
      let checking = false;   // the app has an answer to check: the next call it makes is a check
      const next = () => new Promise(r => { reply = r; });
      const first = next();
      messageBox(win, {
        ...options,
        validate: (values, button) => new Promise(checked => {
          boxes.set(id, problem => { checking = false; const answer = next(); checked(problem); return answer; });
          checking = true;
          reply({ button, values, box: id });
        }),
      }).then(r => {
        // Closed (Cancel, Esc, the window) while the app was checking: its check gets the answer
        if (checking) boxes.set(id, () => wrap(r));
        else { boxes.delete(id); reply(wrap(r)); }
      });
      return first;
    },
    'ui.messageBox.check': (id, problem) => {
      const check = boxes.get(String(id));
      if (!check) return { button: null, values: {} };   // gone meanwhile (the window closed)
      boxes.delete(String(id));
      return check(problem === false ? false : problem == null || problem === true ? true : String(problem).slice(0, 1000));
    },
    'clipboard.write': text => navigator.clipboard.writeText(String(text).slice(0, MAX_TEXT)),
    'files.read': async (ref, options) => {
      const node = fileOf(ref, false);
      return options?.bytes === true ? fs.readBlob(node.id, { caller: caller(node) }) : fs.read(node.id, { caller: caller(node) });
    },
    // options.mark: the app's own data on the file, saved with the content (null takes it away);
    // options.unique: always a new file, named 'a 2.txt' when 'a.txt' is taken. → { id, name, ref }
    'files.write': async (ref, data, options) => {
      const value = content(data);
      const unique = options?.unique === true;
      let node = unique ? null : target(ref, true);
      if (!node) node = fs.create(newParent(ref, unique), { type: 'file', name: newName(ref, unique) });
      if (node.type !== 'file') fail(t('notFile'));
      const mark = options && typeof options === 'object' && 'mark' in options ? { app: pkg.id, value: claim(options.mark ?? null) } : null;
      await fs.write(node.id, value, { caller: caller(node), mark });
      return made(node);
    },
    // A file the app may use: its name and the app's own data on it
    'files.info': ref => {
      const node = target(ref, false) ?? fail(t('noFile'));
      return { id: node.id, name: node.name, type: node.type, size: node.size ?? 0, modified: node.modified, path: fs.path(node.id), ref: fs.tildePath(node.id), meta: fs.appMeta(node.id, pkg.id) };
    },
    'files.setMeta': (ref, value) => {
      const node = target(ref, true) ?? fail(t('noFile'));
      fs.setAppMeta(node.id, pkg.id, claim(value ?? null));
    },
    // Opens one of its files with its app (the file.open pipe again: after unlocking it, for one)
    'files.open': ref => {
      if (!handles.has(ref)) fail(t('openOnlyHanded'));
      openFile(fs.get(ref) ?? fail(t('fileGone')));
    },
    // Files the app has locked again: lilOS closes the windows that show them
    'files.locked': ids => {
      const list = (Array.isArray(ids) ? ids : []).filter(id => handles.has(id) && fs.appMeta(id, pkg.id));
      if (list.length) bus.emit('files:locked', list);
      return list.length;
    },
    // Which of its files are shown in a window now (they are in use: not locked for inactivity)
    'files.shown': ids => {
      const list = (Array.isArray(ids) ? ids : []).filter(id => handles.has(id));
      const shown = [];
      bus.emit('files:shown', { ids: list, answer: id => shown.push(id) });
      return [...new Set(shown)];
    },
    'pipes.subscribe': (event, opts) => {
      if (!pipe) fail(t('noPipes'));
      const o = opts && typeof opts === 'object' ? opts : {};
      if (o.stage !== undefined && !STAGES.includes(o.stage)) fail(t('badStage'));
      if (o.position !== undefined && !POSITIONS.includes(o.position)) fail(t('badPosition'));
      return pipe.subscribe(String(event), { stage: o.stage ?? 'after', position: o.position ?? 'middle', where: o.where ?? null });
    },
    'pipes.unsubscribe': sub => pipe?.unsubscribe(String(sub)),
    // Its own events ('<app id>.<name>'): defined, then run (the result after every handler)
    'pipes.define': (name, def) => {
      const d = def && typeof def === 'object' ? def : {};
      const fields = v => (Array.isArray(v) ? v.filter(f => typeof f === 'string' && /^(?!__proto__$|constructor$|prototype$)\w{1,40}$/.test(f)).slice(0, 20) : []);
      if (!pipes.has(String(name)) && pipes.catalog().filter(e => e.owner === pkg.id).length >= MAX_EVENTS) fail(t('maxEvents', { max: MAX_EVENTS }));
      pipes.define(String(name), {
        label: typeof d.label === 'string' ? d.label : String(name), description: typeof d.description === 'string' ? d.description : '',
        edit: { before: fields(d.edit?.before), after: fields(d.edit?.after) }, stop: d.stop === true, owner: pkg.id,
      });
    },
    'pipes.run': (name, data) => pipes.run(ownEvent(name), data && typeof data === 'object' ? data : { value: data ?? null }, { caller: { app: pkg.id } }),
    // What the user did, for an automation being recorded (an action of its manifest); the files it
    // names must be ones it was given, and what it made one it may write
    'automation.recording': () => automation.recording && !automation.paused,
    'automation.record': (id, data) => {
      const def = typeof id === 'string' && id.startsWith(`${pkg.id}.`) ? automation.describe(id) : null;
      if (!def || def.app !== pkg.id) fail(t('notOwnAction', { action: String(id).slice(0, 60), app: pkg.manifest.name }));
      const d = plainObject(data);
      const params = plainObject(d.params);
      for (const [name, p] of Object.entries(def.params)) {
        if (!['file', 'files', 'folder'].includes(p.type) || !(name in params)) continue;
        if ([params[name]].flat().some(ref => typeof ref !== 'string' || !handles.has(ref))) fail(t('nameOnlyOpen'));
      }
      if (d.file != null && !handles.has(d.file)) fail(t('nameOnlyOpen'));
      const made = [d.result ?? []].flat().filter(ref => typeof ref === 'string' && (handles.has(ref) || coversPath(perms, fs.tildePath(ref), { write: true })));
      return automation.record(id, { params, defaults: d.defaults ?? null, file: d.file ?? null, result: made.length ? made : null }) !== null;
    },
    // The preview of a file it may read, made by the app that opens it (see filePreview.js)
    'files.preview': (ref, options) => {
      if (!perms.includes('fs.preview')) fail(t('denied', { permission: 'fs.preview' }));
      const size = typeof options?.size === 'number' ? Math.min(options.size, 4096) : undefined;
      return filePreview(fileOf(ref, false), { size, from: pkg.id });
    },
    'files.list': path => {
      if (!coversPath(perms, path, { write: false })) fail(t('denied', { permission: path }));
      const node = resolveHome(path) ?? fail(t('noFolder'));
      return fs.children(node.id).map(n => ({ name: n.name, type: n.type, size: n.size ?? 0, modified: n.modified }));
    },
    // options.unique: always a new folder, 'Archivio 2' when 'Archivio' is taken. → { id, name, ref }
    'files.mkdir': (path, options) => {
      const unique = options?.unique === true;
      if (!coversPath(perms, path, { write: true })) fail(t('denied', { permission: path }));
      const found = unique ? null : resolveHome(path);
      if (found) return made(found);
      return made(fs.create(newParent(path, unique), { type: 'folder', name: newName(path, unique) }));
    },
    'storage.get': key => (STORAGE_KEY.test(key) ? storage.get(`app:${pkg.id}:${key}`, null) : fail(t('badKey'))),
    'storage.set': (key, value) => {
      if (!STORAGE_KEY.test(key)) fail(t('badKey'));
      if ((JSON.stringify(value) ?? '').length > 256 << 10) fail(t('valueTooBig'));
      storage.set(`app:${pkg.id}:${key}`, value);
    },
    'schedule.list': () => own().list(),
    'schedule.get': id => own().get(id),
    'schedule.create': task => own().create(plainObject(task)),
    'schedule.update': (id, task) => own().update(id, plainObject(task)),
    'schedule.remove': id => own().remove(id),
    'schedule.enable': (id, on) => own().enable(id, on),
    'schedule.run': id => own().run(id),
    'schedule.tasks': async () => (await reader().tasks()).map(brief),
    'schedule.occurrences': range => {
      const { from, to } = plainObject(range);
      return reader().occurrences({ from: Number(from), to: Number(to) });
    },
    'schedule.history': async query => {
      const { task, limit, before } = plainObject(query);
      return (await reader().history({ task: typeof task === 'string' ? task : undefined, limit, before })).map(briefRun);
    },
    'schedule.move': (id, change) => {
      if (!perms.includes('schedule.move')) fail(t('denied', { permission: 'schedule.move' }));
      const { at, to, scope } = plainObject(change);
      return schedule.move(id, { at, to, scope });
    },
    'schedule.open': (entry, args) => {
      if (!SCHEDULER_ENTRIES.has(entry)) fail(t('unknownSchedulerEntry'));
      // An app proposes only when (and, at most, a reminder or opening itself): the user writes the rest
      const a = { ...plainObject(args), from: pkg.id };
      if (a.what && !(a.what.type === 'notify' || (a.what.type === 'open' && a.what.app === pkg.id))) delete a.what;
      launch('scheduler', a, entry);
    },
    'schedule.describe': when => {
      try { return schedule.describe(schedule.rules.checkWhen(when), locale.code); } catch (err) { return fail(err.message); }
    },
    'term.load': () => terminal().load(),
    'term.saveHost': (id, config, secret) => terminal().saveHost(id === null ? null : String(id), plainObject(config), plainObject(secret)),
    'term.removeHost': id => terminal().removeHost(String(id)),
    'term.open': spec => {
      const { host, protocol, values, secret, sealed, settings, name, cwd } = plainObject(spec);
      const at = typeof cwd === 'string' ? { cwd } : {};
      return terminal().open(typeof host === 'string' ? { host, ...at }
        : { protocol, values, settings, ...(secret && { secret: plainObject(secret) }), ...(typeof sealed === 'string' && { sealed }), ...(typeof name === 'string' && { name }), ...at });
    },
    'term.seal': spec => {
      const { host, protocol, values, secret } = plainObject(spec);
      return terminal().seal(typeof host === 'string' ? { host } : { protocol, values, secret: plainObject(secret) });
    },
    // SSH to the server of the SFTP connection a handed file or folder is in, in that folder
    'term.openHere': id => {
      terminal();
      if (!handles.has(id)) fail(t('useOnlyOpen'));
      const node = fs.get(id) ?? fail(t('fileGone'));
      const folder = node.type === 'folder' ? node.id : node.parent;
      const ref = fs.isRemote(folder) ? fs.netRef(folder) : fail(t('notNetwork'));
      if (net.mount(ref.mount)?.protocol !== 'sftp') fail(t('sftpOnly'));
      return term.open({ mount: ref.mount, path: ref.path });
    },
    'term.close': id => terminal().close(String(id)),
    'term.attach': (id, size) => {
      terminal();
      if (!win) fail(t('window.terminal'));
      const port = term.attach(String(id), plainObject(size));
      channels.add(port);
      return port;
    },
    'calls.info': () => requests().info(),
    'calls.send': body => requests().send(plainObject(body)),
    'calls.run': body => requests().run(plainObject(body)),
    'calls.progress': (id, opts) => requests().progress(String(id), plainObject(opts)),
    'calls.cancelRun': id => requests().cancelRun(String(id)),
    'calls.seal': value => requests().seal(String(value ?? '')),
    'calls.trust': trust => requests().trust(plainObject(trust)),
    'calls.describe': body => requests().describe(plainObject(body)),
    'calls.token': settings => requests().token(plainObject(settings)),
    // The provider's page in a window lilOS opens (the app's click counts for it), back to lilOS's callback
    'calls.signIn': settings => {
      if (!win) fail(t('window.signIn'));
      return requests().signIn({ ...plainObject(settings), redirectUri: '' });
    },
    // To an address of the provider's own (settings.redirectUri): a tab, then the app asks the user where it ended
    'calls.signInByHand': async settings => {
      if (!win) fail(t('window.signIn'));
      requests();
      const tab = window.open('about:blank', '_blank');
      if (!tab) fail(t('popupBlocked'));
      try {
        const started = await kernel.request('POST', '/calls/oauth/signin', { settings: plainObject(settings) });
        tab.opener = null;
        tab.location.href = started.url;
        byHand.add(started.id);
        return { id: started.id, redirectUri: started.redirectUri };
      } catch (err) {
        tab.close();
        throw err;
      }
    },
    'calls.signInPaste': async (id, address) => {
      requests();
      if (!byHand.has(id)) fail(t('noSignIn'));
      const s = await kernel.request('POST', `/calls/oauth/signin/${encodeURIComponent(id)}/paste`, { url: String(address ?? '') });
      if (s.status !== 'pending') byHand.delete(id);
      return s;
    },
    'calls.signInCancel': id => {
      if (!byHand.delete(id)) return;
      kernel.request('DELETE', `/calls/oauth/signin/${encodeURIComponent(id)}`).catch(() => {});
    },
    'calls.sessions': () => requests().sessions(),
    'calls.openSession': body => requests().openSession(plainObject(body)),
    'calls.closeSession': id => requests().closeSession(String(id)),
    'calls.attach': id => {
      requests();
      if (!win) fail(t('window.session'));
      const port = calls.attach(String(id));
      channels.add(port);
      return port;
    },
    'serial.supported': () => ports().supported,
    'serial.ports': () => ports().ports(),
    'serial.request': options => {
      if (!win) fail(t('window.choosePort'));
      const filters = plainObject(options).filters;
      return ports().request({ filters: Array.isArray(filters) ? filters.slice(0, 50).map(plainObject) : [] });
    },
    'serial.forget': id => (win ? ports().forget(String(id)) : fail(t('window.forgetPort'))),
    'serial.open': async (id, options) => {
      if (!win) fail(t('window.openPort'));
      const port = await ports().open(String(id), plainObject(options));
      channels.add(port);
      return port;
    },
    'kernel.request': (name, method, path, body) => {
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(String(method).toUpperCase())) fail(t('badMethod'));
      return moduleApi(name).request(method, String(path), body === null ? undefined : body);
    },
    'kernel.channel': (name, path) => {
      if (!win) fail(t('window.channel'));
      const port = moduleApi(name).channel(String(path));
      channels.add(port);
      return port;
    },
    'app.call': (entry, data) => callEntrypoint(pkg.id, entry, handed(data), { from: pkg.id }),
    'app.connect': entry => connectEntrypoint(pkg.id, entry),
    'app.keepAlive': on => (instance ? instance.setKeepAlive(on === true) : fail(t('keepAlive'))),
    'app.failed': message => {
      console.error(`[lilos] ${pkg.id}:`, message);
      notify(t('notStarted', { app: pkg.manifest.name, message: String(message).slice(0, 200) }), { level: 'error' });
      instance?.stop();
    },
    'apps.call': (app, entry, data) => {
      if (!perms.includes(`apps.call:${app}`)) fail(t('denied', { permission: `apps.call:${app}` }));
      return callEntrypoint(app, entry, handed(data), { from: pkg.id });
    },
  };
}

const plainObject = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/**
 * What an app may put in a message box (lilos.ui.messageBox): texts, fields and buttons, within
 * limits. Never Nodes, functions or patterns (a RegExp of the app would run in lilOS's page).
 */
function boxOptions(spec) {
  const s = plainObject(spec);
  const text = (v, max) => (v == null ? '' : String(v).slice(0, max));
  const num = v => (Number.isFinite(v) ? v : undefined);
  const primitive = v => (typeof v === 'string' ? v.slice(0, 10000) : typeof v === 'number' || typeof v === 'boolean' ? v : null);
  const option = o => (o && typeof o === 'object' ? { value: text(o.value, 200), label: text(o.label ?? o.value, 200), disabled: o.disabled === true } : text(o, 200));
  const fields = Array.isArray(s.fields) ? s.fields.slice(0, 20).map(plainObject).filter(f => typeof f.name === 'string' && /^[\w.-]{1,40}$/.test(f.name)).map(f => ({
    name: f.name, type: text(f.type || 'text', 20), label: text(f.label ?? f.name, 200), value: primitive(f.value),
    placeholder: f.placeholder == null ? undefined : text(f.placeholder, 200), hint: f.hint == null ? undefined : text(f.hint, 500),
    required: f.required === true, disabled: f.disabled === true, min: num(f.min), max: num(f.max), step: num(f.step),
    maxLength: num(f.maxLength), rows: num(f.rows) && Math.min(20, Math.max(2, f.rows)),
    options: Array.isArray(f.options) ? f.options.slice(0, 200).map(option) : undefined,
  })) : null;
  const buttons = Array.isArray(s.buttons) ? s.buttons.slice(0, 6).map(b => (b && typeof b === 'object'
    ? { value: text(b.value, 40), label: text(b.label ?? b.value, 80), primary: b.primary === true, danger: b.danger === true, icon: typeof b.icon === 'string' ? b.icon.slice(0, 40) : undefined }
    : text(b, 40))) : undefined;
  return {
    icon: typeof s.icon === 'string' ? s.icon : null, title: text(s.title, 200), text: text(s.text ?? s.message, 4000),
    fields, ...(buttons && { buttons }), default: typeof s.default === 'string' ? s.default : null,
    width: num(s.width) && Math.min(900, Math.max(240, s.width)),
  };
}

/** Runs one request of the app. */
export function invoke(methods, method, params) {
  const run = typeof method === 'string' && Object.hasOwn(methods, method) ? methods[method] : null;
  if (!run) fail(t('unknownMethod', { method }));
  return run(...(Array.isArray(params) ? params : []));
}

/** What to transfer with a result (a channel opened by app.connect). */
export const transferOf = result => (result instanceof MessagePort ? [result] : []);
