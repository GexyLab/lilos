import { locale, messageBox } from '@lilos/sdk';
import { onKernelEvent } from './apps/services.js';

const { t } = locale.define('lilos:language', {
  en: { strings: {
    'reload.title': 'lilOS in {name}',
    'reload.text': 'What is already open stays in the language it was drawn in. Reload lilOS to see everything in the new language.',
    'reload.now': 'Reload now', 'reload.later': 'Later',
  } },
});

/** A language's name in itself ('it' → 'Italiano'); the tag when Intl does not know it. */
function ownName(code) {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    return code;
  }
}

/**
 * The page in lilOS's language: lang and dir of <html> (right to left for Arabic, Urdu…), kept up
 * to date. The packs are read again when the kernel says they changed (installed, updated, removed
 * by anyone) or comes back. Most of lilOS is drawn once: when the language of its texts changes,
 * it offers to reload. Call before connectServices().
 */
export function connectLanguage() {
  const root = document.documentElement;
  let shown = locale.language;
  const apply = () => {
    root.lang = locale.language;
    root.dir = locale.dir;
  };
  apply();
  locale.on('change', async () => {
    apply();
    if (locale.language === shown) return;
    shown = locale.language;
    const answer = await messageBox(null, {
      icon: 'info', title: t('reload.title', { name: ownName(locale.language) }), text: t('reload.text'),
      buttons: [{ value: 'later', label: t('reload.later') }, { value: 'reload', label: t('reload.now'), primary: true }],
    });
    if (answer === 'reload') location.reload();
  });
  onKernelEvent('languages', () => locale.refresh());
  onKernelEvent('', () => locale.refresh());
}
