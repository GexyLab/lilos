import { fail } from '../errors.js';
import { canonicalLocale } from '../../../../sdk/core/i18n.js';
import { defineStrings } from '../strings.js';

/**
 * Language packs (apps/languagePackage.js). The list and the strings are for everyone, also before
 * signing in: the sign-in page is in the language too.
 *   GET    /api/languages              [{ language, name, englishName?, version, lilos?, dir }]
 *                                      (signed in: also installedBy, installedAt, canRemove)
 *   GET    /api/languages/:language    { language, version, dir, strings: { [part]: { key: text } } }
 *   POST   /api/languages              { language } → the pack, installed or updated from the official repository
 *   DELETE /api/languages/:language    who installed it or an admin
 * Changes reach every open lilOS as the event 'languages' (/api/services-events).
 */
const { t } = defineStrings('lilos:kernel.api.languages', { en: { strings: {
  signIn: 'Sign in first',
  language: 'Language not valid',
} } });

const signedIn = principal => principal ?? fail('unauthorized', t('signIn'));
const tag = v => (typeof v === 'string' && v.length <= 35 && canonicalLocale(v) === v ? v : fail('invalid', t('language')));

export function languageRoutes(kernel) {
  const { router, languages } = kernel;

  router.add('GET', '/api/languages', async ({ principal }) => languages.list(principal));
  router.add('GET', '/api/languages/:language', async ({ params }) => languages.strings(tag(params.language)));
  router.add('POST', '/api/languages', async ({ principal, json }) => {
    const { language } = await json(4 << 10);
    return languages.install(signedIn(principal), tag(language));
  });
  router.add('DELETE', '/api/languages/:language', async ({ principal, params }) => {
    await languages.remove(signedIn(principal), tag(params.language));
  });
}
