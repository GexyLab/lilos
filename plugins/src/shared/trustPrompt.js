import { messageBox } from '@lilos/sdk';

/**
 * Asks the user to confirm a server lilOS does not know yet (its SSH key, or a TLS certificate that
 * is not valid), or one whose key CHANGED since it was confirmed (someone may be in between): a
 * message box over the window with the fingerprint. The safe answer is the default one: Enter and
 * Esc cancel, the user must choose Continue.
 *
 *   if (await trustPrompt(win, err.details.trust, { t, name: mount.name })) connect({ trust: trust.fingerprint });
 *
 *   trust   what the kernel sends: { fingerprint, text?, kind: 'ssh' | 'tls', host?, changed?, previous? }
 *   t       the app's t (its locales have the shared.trust.* strings: see README.md, «Componenti condivisi»)
 *   name    what the server is called in the title (a connection's name; default trust.host)
 *
 * Resolves true when the user continues; false when cancelled, when the window closes, or when
 * there is no fingerprint to show. The promise has close(): takes the box away (resolves false),
 * e.g. when the kernel asks again.
 */
export function trustPrompt(win, trust, { t, name = trust?.host ?? '' } = {}) {
  if (!trust?.fingerprint) return Object.assign(Promise.resolve(false), { close() {} });
  const changed = trust.changed === true;
  const tls = trust.kind === 'tls';
  const lines = [
    changed ? t('shared.trust.changedText') : t(tls ? 'shared.trust.firstTls' : 'shared.trust.first'),
    '',
    ...(trust.host ? [`${t('shared.trust.server')}: ${trust.host}`] : []),
    `${t(tls ? 'shared.trust.certificate' : 'shared.trust.key')}: ${trust.text || trust.fingerprint}`,
    ...(changed && trust.previous ? [`${t('shared.trust.previous')}: ${trust.previous}`] : []),
    '',
    t(changed ? 'shared.trust.askChanged' : 'shared.trust.ask'),
  ];
  const box = messageBox(win, {
    icon: changed ? 'error' : 'warning',
    title: t(changed ? 'shared.trust.changedTitle' : 'shared.trust.title', { name }),
    text: lines.join('\n'),
    buttons: ['cancel', 'continue'],
    default: 'cancel',
  });
  const answer = box.then(value => value === 'continue');
  answer.close = () => box.close(null);
  return answer;
}
