import { kernel } from '@lilos/sdk/kernel';
import { loginScreen, messageScreen, progressScreen } from './screens.js';
import { hasLocalData, importLocalData } from './migrate.js';

/**
 * Before lilOS starts: reaches the kernel, signs the user in (when lilOS has more users), offers
 * to bring in the data this browser kept before the kernel, then loads the user's data.
 * Resolves when the SDK can be imported.
 */
export async function boot(root) {
  for (;;) {
    try {
      const { mode, user } = await kernel.session();
      if (mode === 'multi' && !user) await loginScreen(root, (name, password) => kernel.login(name, password));
      if (hasLocalData()) await offerImport(root);
      progressScreen(root, 'Avvio di lilOS…');
      await kernel.connect();
      root.replaceChildren();
      return;
    } catch (err) {
      await messageScreen(root, {
        title: err.code === 'offline' ? 'Il kernel di lilOS non risponde' : 'lilOS non si avvia',
        text: err.code === 'offline' ? 'Avvialo con "npm run kernel", poi riprova.' : err.message,
        buttons: [{ label: 'Riprova', value: true, primary: true }],
      });
    }
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

/** While lilOS runs: when the session ends, sign in again over it; nothing waiting is lost. */
export function watchSession() {
  let open = false;
  kernel.on('signedout', async () => {
    if (open) return;
    open = true;
    await loginScreen(null, async (username, password) => {
      const { user } = await kernel.request('POST', '/session', { username, password });
      if (user.id !== kernel.data.user.id) {
        await kernel.request('DELETE', '/session').catch(() => {});
        throw new Error(`Qui è aperta la sessione di ${kernel.data.user.username}: accedi con quell'utente`);
      }
    }, { title: 'Sessione scaduta', text: 'Accedi di nuovo: le modifiche in attesa verranno salvate.', onto: document.body });
    open = false;
    kernel.resume();
  });
}
