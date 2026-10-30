import { apps as installed, kernel } from '@lilos/sdk';

/**
 * How an installed app runs. An administrator chooses it for every app (Impostazioni → App →
 * Sicurezza) and, if they want, for a single one (the app's Proprietà → Sicurezza): the app's own
 * choice wins. Isolated is the default.
 *
 *   isolated   windows in an iframe sandbox without an origin of its own, background entry
 *              points in a hidden one: the app reaches lilOS only through `lilos` and its permissions
 *   open       windows in lilOS's page (in a Shadow DOM), background entry points in a Web
 *              Worker: faster, but the app can do whatever the user can, permissions or not
 *
 * Some apps have one mode only: system apps (official repository) run inside lilOS, remote apps
 * are their own site, apps with sdk '1' run at the top of their module and only in a sandbox.
 */
export function executionMode(pkg) {
  if (!pkg) return { mode: 'isolated', fixed: true, reason: 'App non installata' };
  if (pkg.system) return { mode: 'system', fixed: true, reason: 'Le app di sistema fanno parte di lilOS e girano dentro lilOS' };
  if (pkg.manifest?.kind !== 'local') return { mode: 'remote', fixed: true, reason: 'Un’app remota è un sito a sé: gira sempre isolata, nella sua origine' };
  if (String(pkg.manifest.sdk) !== '2') return { mode: 'isolated', fixed: true, reason: 'L’app usa l’SDK 1, che funziona solo isolato' };
  const own = typeof pkg.isolated === 'boolean' ? pkg.isolated : null;
  const isolated = own ?? installed.security().isolated;
  return { mode: isolated ? 'isolated' : 'open', fixed: false, own };
}

/** True if this app runs in a sandbox (system apps never do; they are trusted). */
export const isIsolated = pkg => ['isolated', 'remote'].includes(executionMode(pkg).mode);

/** Only administrators change how apps run (the kernel checks it too). */
export const canChangeExecution = () => kernel.connected && kernel.user?.role === 'admin';
