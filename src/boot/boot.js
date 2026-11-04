import { kernel } from '@lilos/sdk/kernel';
import { errorText, licenseScreen, loginScreen, messageScreen, progressScreen, rememberSignIn, startScreen } from './screens.js';
import { hasLocalData, importLocalData } from './migrate.js';
import { bootStrings, loadBootLanguage } from './strings.js';

const { t } = bootStrings('lilos:boot', { en: { strings: {
  'step.signedIn': 'Sign-in verified',
  'step.kernel': 'Kernel reached',
  'step.license': 'License accepted',
  'step.data': 'Reading your data',
  'step.desktop': 'Opening the desktop',
  'offline.title': 'The lilOS kernel is not answering',
  'offline.text': '{host} is not answering. Start the kernel (npm run kernel, the service or the lilOS program) or check the network.',
  'failed.title': 'lilOS does not start',
  retryNow: 'Try again now',
  retry: 'Try again',
  exit: 'Exit',
  'license.waitTitle': 'The lilOS license must be accepted',
  'license.waitText': 'Before lilOS can be used, an administrator must read and accept its license. Try again once they have.',
  'license.neededTitle': 'lilOS does not start without its license',
  'license.neededText': 'lilOS can be used only after its license has been accepted.',
  'license.read': 'Read the license',
  'import.title': 'Data in this browser',
  'import.text': 'This browser has lilOS folders, files and settings saved before accounts existed. Do you want to move them into your account? They will then be deleted from the browser.',
  'import.later': 'Not now',
  'import.move': 'Move into my account',
  'import.progress': 'Moving your data…',
  'session.otherUser': 'The session of {username} is open here: sign in as that user',
  'expired.title': 'Session expired',
  'expired.text': 'Enter the password of {name}: pending changes will be saved.',
  'locked.title': 'lilOS is locked',
  'locked.text': 'Enter the password of {name} to come back.',
  'locked.unlock': 'Unlock',
  'locked.notYou': 'Not {name}?',
  'locked.otherUser': 'Sign in as another user',
} } });

// Seconds before trying the kernel again by itself, at each failed try in a row (then the last)
const RETRY = [5, 10, 30];

/**
 * Before lilOS starts: reaches the kernel, signs the user in (when lilOS has more users), has the
 * license of lilOS accepted (once per installation), offers to bring in the data this browser kept
 * before the kernel, then loads the user's data, showing each step.
 * Resolves when the SDK can be imported, with a function that takes the start-up screen away (call
 * it once the desktop is there).
 */
export async function boot(root) {
  for (let failed = 0; ; failed++) {
    // The language of the last user of this browser (or the browser's) until the user is known
    await loadBootLanguage(kernel);
    try {
      const { mode, user } = await kernel.session();
      if (mode === 'multi' && !user) await loginScreen(root, (name, password, options) => kernel.login(name, password, options));
      if (!(await licenseAccepted(root, mode))) continue;
      if (hasLocalData()) await offerImport(root);
      const who = kernel.user;
      const start = startScreen(root, {
        name: who?.name || who?.username || null,
        steps: [t(mode === 'multi' ? 'step.signedIn' : 'step.kernel'), t('step.license'), t('step.data'), t('step.desktop')],
      });
      start.step(2);
      await kernel.connect();
      // The user's own language for the screens of the session (expired, locked)
      await loadBootLanguage(kernel, kernel.data?.storage?.locale);
      start.step(3);
      return () => root.querySelector(':scope > .boot')?.remove();
    } catch (err) {
      const offline = err.code === 'offline';
      await messageScreen(root, {
        title: offline ? t('offline.title') : t('failed.title'),
        text: offline ? t('offline.text', { host: location.host }) : errorText(err),
        tone: 'danger',
        auto: offline ? { seconds: RETRY[Math.min(failed, RETRY.length - 1)], value: true } : null,
        buttons: [{ label: offline ? t('retryNow') : t('retry'), value: true, primary: true }],
      });
    }
  }
}

/**
 * The license of lilOS (kernel: src/license.js), until it is accepted: an administrator reads and
 * accepts it, the others wait for one. False when the user went out (signed out: sign in again).
 */
async function licenseAccepted(root, mode) {
  for (;;) {
    const license = await kernel.request('GET', '/license');
    if (license.accepted) return true;
    const choice = license.canAccept
      ? await licenseScreen(root, license, () => kernel.request('POST', '/license/accept', { sha256: license.sha256 }))
      : await messageScreen(root, {
        title: t('license.waitTitle'),
        text: t('license.waitText'),
        buttons: [{ label: t('exit'), value: 'exit' }, { label: t('retry'), value: 'retry', primary: true }],
      });
    if (choice === 'accepted') return true;
    if (choice !== 'exit') continue;
    if (mode === 'multi') {
      await kernel.request('DELETE', '/session');
      return false;
    }
    await messageScreen(root, {
      title: t('license.neededTitle'),
      text: t('license.neededText'),
      buttons: [{ label: t('license.read'), value: true, primary: true }],
    });
  }
}

async function offerImport(root) {
  const { fresh } = await kernel.request('GET', '/boot');
  if (!fresh) return;   // only into an empty home
  const yes = await messageScreen(root, {
    title: t('import.title'),
    text: t('import.text'),
    buttons: [{ label: t('import.later'), value: false }, { label: t('import.move'), value: true, primary: true }],
  });
  if (!yes) return;
  progressScreen(root, t('import.progress'));
  await importLocalData(kernel);
}

let signingIn = false;   // the sign-in over lilOS is open (session expired, or locked)

/** Signs the same user in again over the running lilOS, then sends what was waiting. */
async function signInAgain(options) {
  signingIn = true;
  await loginScreen(null, async (username, password, { remember = rememberSignIn() } = {}) => {
    const { user } = await kernel.request('POST', '/session', { username, password, remember });
    if (user.id !== kernel.data.user.id) {
      await kernel.request('DELETE', '/session').catch(() => {});
      throw new Error(t('session.otherUser', { username: kernel.data.user.username }));
    }
  }, { onto: document.body, ...options });
  signingIn = false;
  kernel.resume();
}

/** While lilOS runs: when the session ends, sign in again over it; nothing waiting is lost. */
export function watchSession() {
  kernel.on('signedout', async () => {
    if (signingIn) return;
    signingIn = true;
    await loadBootLanguage(kernel, kernel.locale);   // the language lilOS is in now
    const { username, name } = kernel.data.user;
    signInAgain({ title: t('expired.title'), text: t('expired.text', { name }), username, name });
  });
}

/**
 * Locks lilOS (more users only): saves what is pending and ends the session on the kernel, so that
 * loading the page again asks to sign in too; the windows stay open under a screen that asks the
 * same user's password. Resolves when the user is back. The user's services stop meanwhile, as at
 * any sign-out, and start again when they sign in.
 */
export async function lockSession() {
  if (signingIn || kernel.mode !== 'multi') return;
  signingIn = true;
  try {
    await kernel.flush();
    await kernel.request('DELETE', '/session');
  } catch (err) {
    signingIn = false;
    throw err;
  }
  await loadBootLanguage(kernel, kernel.locale);   // the language lilOS is in now
  const { username, name } = kernel.data.user;
  // Out of reach of the keyboard too while locked
  const under = [...document.body.children].filter(e => !e.inert);
  under.forEach(e => { e.inert = true; });
  await signInAgain({
    title: t('locked.title'), text: t('locked.text', { name }), username, name, submit: t('locked.unlock'),
    // Session already ended: lilOS starts again from the sign-in
    other: { lead: t('locked.notYou', { name }), label: t('locked.otherUser'), onClick: () => location.reload() },
  });
  under.forEach(e => { e.inert = false; });
}
