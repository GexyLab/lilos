/**
 * AppStore → Aggiornamenti: a service (it runs in lilOS's kernel, also with lilOS closed). It looks
 * for newer versions of the installed apps and tells the user about the ones it has not told them
 * about yet. No imports: it runs in the kernel's isolate, with only `lilos` (see the kernel's
 * apps/serviceApi.js).
 *
 * Started by the scheduler (args.reason 'schedule': the AppStore's operation «Controlla
 * aggiornamenti», daily by default) it only answers { schedule } calls: one check each, the result
 * as { text }. Started otherwise (at sign-in, by hand) it checks at once and then every `ore` hours.
 *
 * Repositories the user switched off in the AppStore (storage 'repos.disabled', [{ id, name }])
 * are skipped: apps.updates() names the repository, it has no id.
 *
 * Calls: { op: 'check' } checks now; { schedule } checks for the scheduler; anything else returns
 * the last result { at, updates }.
 * Texts: lilos.locale gives the app's strings (locales.json) in the user's language; a kernel
 * older than translations has none, so then the Italian ones here.
 */
const ITALIAN = {
  'notify.updates': ({ n, names }) => (n === 1 ? `Aggiornamento disponibile: ${names}. Apri l’AppStore.` : `${n} aggiornamenti disponibili: ${names}. Apri l’AppStore.`),
  'service.found': ({ n }) => (n === 1 ? '1 aggiornamento disponibile' : `${n} aggiornamenti disponibili`),
};

export async function updates({ lilos, args }) {
  const t = lilos.locale?.i18n.t ?? ((key, params) => ITALIAN[key]?.(params ?? {}) ?? key);
  const hours = Math.min(168, Math.max(1, Number(args.ore) || 24));
  let last = null;

  const check = async () => {
    try {
      // Not from the repositories the user switched off in the AppStore (its windows keep them here)
      const off = new Set(((await lilos.storage.get('repos.disabled')) ?? []).map(r => r?.name));
      const found = (await lilos.apps.updates()).filter(u => !off.has(u.repo));
      const told = (await lilos.storage.get('updates.told')) ?? {};
      const fresh = found.filter(u => told[u.id] !== u.latest);
      if (fresh.length) {
        const names = fresh.slice(0, 3).map(u => `${u.name} ${u.latest}`).join(', ') + (fresh.length > 3 ? '…' : '');
        await lilos.ui.notify(t('notify.updates', { n: fresh.length, names }));
        for (const u of fresh) told[u.id] = u.latest;
        await lilos.storage.set('updates.told', told);
      }
      last = { at: Date.now(), updates: found };
      console.log(`Controllati gli aggiornamenti: ${found.length} disponibili`);
    } catch (err) {
      console.error('Controllo degli aggiornamenti non riuscito:', err.message);
    }
    return last;
  };

  lilos.handle(async data => {
    if (data?.schedule) {
      const done = await check();
      return done ? { text: t('service.found', { n: done.updates.length }) } : { ok: false, error: 'Controllo non riuscito' };
    }
    return data?.op === 'check' ? check() : last;
  });
  if (args.reason === 'schedule') return;
  // Not awaited: reading the repositories can take a while, and the service is on meanwhile
  check();
  setInterval(check, hours * 3600_000);
}
