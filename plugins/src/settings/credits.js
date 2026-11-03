import { h } from '@lilos/sdk';
import credits from './credits.json';
import { t, i18n } from './i18n.js';

/**
 * Control Panel → About → Credits: the libraries, fonts and tools of other authors that lilOS and
 * its official apps and kernel modules use, from credits.json (made by scripts/credits.mjs, which
 * the build checks). Each row: name and version; license, copyright and who uses it; a link to
 * the library's site.
 */

/** Who uses a library: an app by its name, a kernel module, lilOS itself. */
function userName(id) {
  if (id === 'lilos') return 'lilOS';
  if (id.startsWith('module:')) return t('credits.module', { name: id.slice(7) });
  const names = credits.names[id];
  return names?.[i18n.lang] ?? names?.en ?? id;
}

function row(lib) {
  const users = lib.usedBy.map(userName).join(', ');
  const usedBy = lib.kind === 'tool' ? t('credits.builds')
    : lib.kind === 'font' ? t('credits.fontUsedBy', { users })
    : lib.via ? t('credits.via', { libraries: lib.via.join(', '), users })
    : t('credits.usedBy', { users });
  return {
    label: lib.version ? `${lib.name} ${lib.version}` : lib.name,
    description: [lib.license, lib.copyright, usedBy, lib.optional && t('credits.optional')].filter(Boolean).join(' · '),
    keywords: `${t('credits.keywords')} ${lib.license} ${users}`,
    control: () => h('a', {
      class: 'credits-link', href: lib.url, target: '_blank', rel: 'noopener noreferrer',
      title: lib.url, 'aria-label': t('credits.siteOf', { name: lib.name }),
    }, t('credits.site')),
  };
}

export function creditsSections() {
  const of = kind => credits.libraries.filter(l => l.kind === kind);
  const direct = of('library').filter(l => !l.via);
  const indirect = of('library').filter(l => l.via);
  return [
    { title: t('credits.libraries'), rows: direct.map(row) },
    { title: t('credits.indirect'), rows: indirect.map(row) },
    { title: t('credits.fonts'), rows: of('font').map(row) },
    { title: t('credits.tools'), rows: of('tool').map(row) },
  ].filter(s => s.rows.length);
}
