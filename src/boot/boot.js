import { kernel } from '@lilos/sdk/kernel';
import { licenseScreen, loginScreen, messageScreen, progressScreen, rememberSignIn, startScreen } from './screens.js';
import { hasLocalData, importLocalData } from './migrate.js';

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
    try {
      const { mode, user } = await kernel.session();
      if (mode === 'multi' && !user) await loginScreen(root, (name, password, options) => kernel.login(name, password, options));
      if (!(await licenseAccepted(root, mode))) continue;
      if (hasLocalData()) await offerImport(root);
      const who = kernel.user;
      const start = startScreen(root, {
        name: who?.name || who?.username || null,
        steps: [mode === 'multi' ? 'Accesso verificato' : 'Kernel raggiunto', 'Licenza accettata', 'Lettura dei tuoi dati', 'Apertura del desktop'],
      });
      start.step(2);
      await kernel.connect();
      start.step(3);
      return () => root.querySelector(':scope > .boot')?.remove();
    } catch (err) {
      const offline = err.code === 'offline';
      await messageScreen(root, {
        title: offline ? 'Il kernel di lilOS non risponde' : 'lilOS non si avvia',
        text: offline ? `${location.host} non risponde. Avvia il kernel (npm run kernel, il servizio o il programma lilOS) o controlla la rete.` : err.message,
        tone: 'danger',
        auto: offline ? { seconds: RETRY[Math.min(failed, RETRY.length - 1)], value: true } : null,
        buttons: [{ label: offline ? 'Riprova ora' : 'Riprova', value: true, primary: true }],
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
        title: 'Licenza di lilOS da accettare',
        text: "Prima che lilOS si possa usare, un amministratore deve leggere e accettare la sua licenza d'uso. Riprova quando l'ha fatto.",
        buttons: [{ label: 'Esci', value: 'exit' }, { label: 'Riprova', value: 'retry', primary: true }],
      });
    if (choice === 'accepted') return true;
    if (choice !== 'exit') continue;
    if (mode === 'multi') {
      await kernel.request('DELETE', '/session');
      return false;
    }
    await messageScreen(root, {
      title: 'Senza la licenza lilOS non parte',
      text: "lilOS si può usare solo dopo averne accettato la licenza d'uso.",
      buttons: [{ label: 'Leggi la licenza', value: true, primary: true }],
    });
  }
}

async function offerImport(root) {
  const { fresh } = await kernel.request('GET', '/boot');
  if (!fresh) return;   // only into an empty home
  const yes = await messageScreen(root, {
    title: 'Dati in questo browser',
    text: 'Questo browser ha cartelle, file e impostazioni di lilOS salvati prima degli account. Vuoi portarli nel tuo account? Dopo verranno cancellati dal browser.',
    buttons: [{ label: 'Non ora', value: false }, { label: 'Porta nel mio account', value: true, primary: true }],
  });
  if (!yes) return;
  progressScreen(root, 'Trasferimento dei dati…');
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
      throw new Error(`Qui è aperta la sessione di ${kernel.data.user.username}: accedi con quell'utente`);
    }
  }, { onto: document.body, ...options });
  signingIn = false;
  kernel.resume();
}

/** While lilOS runs: when the session ends, sign in again over it; nothing waiting is lost. */
export function watchSession() {
  kernel.on('signedout', () => {
    if (signingIn) return;
    const { username, name } = kernel.data.user;
    signInAgain({ title: 'Sessione scaduta', text: `Inserisci la password di ${name}: le modifiche in attesa verranno salvate.`, username, name });
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
  const { username, name } = kernel.data.user;
  // Out of reach of the keyboard too while locked
  const under = [...document.body.children].filter(e => !e.inert);
  under.forEach(e => { e.inert = true; });
  await signInAgain({
    title: 'lilOS è bloccato', text: `Inserisci la password di ${name} per tornare.`, username, name, submit: 'Sblocca',
    // Session already ended: lilOS starts again from the sign-in
    other: { lead: `Non sei ${name}?`, label: 'Accedi con un altro utente', onClick: () => location.reload() },
  });
  under.forEach(e => { e.inert = false; });
}
