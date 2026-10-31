import { settings } from '@lilos/sdk';

/**
 * What the user page (opened from the user's name in the taskbar or in the menu) can show, by
 * group, in this order. Name and photo are always there; each of these is turned on or off in
 * Sistema → Pagina utente (the 'userPageHidden' setting holds the keys turned off). Some fields
 * are for Sistema, which reads these lists.
 *   key          stable id
 *   group        key of its group
 *   name         label in Sistema
 *   glyph        SDK icon
 *   description  what it shows or does
 */
export const USER_PAGE_GROUPS = Object.freeze([
  { key: 'header', name: 'Intestazione' },
  { key: 'actions', name: 'Azioni' },
  { key: 'account', name: 'Account' },
  { key: 'session', name: 'Questa sessione' },
  { key: 'footer', name: 'Piè di pagina' },
].map(Object.freeze));

export const USER_PAGE_ITEMS = Object.freeze([
  { key: 'details', group: 'header', glyph: 'user', name: 'Nome utente e ruolo', description: 'Sotto il nome: il nome con cui accedi e se sei amministratore' },
  { key: 'lock', group: 'actions', glyph: 'lock', name: 'Blocca', description: 'Copre lo schermo finché non inserisci di nuovo la password; le app restano aperte' },
  { key: 'logout', group: 'actions', glyph: 'logout', name: 'Chiudi sessione', description: 'Salva, chiude le app e torna alla schermata di accesso' },
  { key: 'restart', group: 'actions', glyph: 'restart', name: 'Riavvia il sistema', description: 'Riavvia il kernel di lilOS per tutti gli utenti; solo per gli amministratori' },
  { key: 'photo', group: 'account', glyph: 'camera', name: 'Foto profilo', description: 'Scegliere, cambiare o togliere la foto' },
  { key: 'theme', group: 'account', glyph: 'palette', name: 'Tema', description: 'Chiaro o scuro' },
  { key: 'language', group: 'account', glyph: 'globe', name: 'Lingua', description: 'La lingua delle app' },
  { key: 'settings', group: 'account', glyph: 'gear', name: 'Tutte le impostazioni', description: 'Apre Sistema' },
  { key: 'workspace', group: 'session', glyph: 'workspace', name: 'Workspace', description: 'Quello in cui sei e quanti ce ne sono' },
  { key: 'windows', group: 'session', glyph: 'window', name: 'Finestre aperte', description: 'Quante finestre sono aperte e quante app lavorano in background' },
  { key: 'startup', group: 'session', glyph: 'power', name: 'All’avvio', description: 'Quante app si aprono quando entri' },
  { key: 'storage', group: 'session', glyph: 'disk', name: 'Spazio usato', description: 'Quanto occupano i tuoi file' },
  { key: 'about', group: 'footer', glyph: 'info', name: 'Versione di lilOS', description: 'La versione di lilOS e l’indirizzo a cui sei collegato' },
].map(Object.freeze));

const known = key => USER_PAGE_ITEMS.some(i => i.key === key);

/** Keys turned off (the saved list is untrusted). */
function hiddenKeys() {
  const saved = settings.get('userPageHidden');
  return Array.isArray(saved) ? [...new Set(saved.filter(known))] : [];
}

/** True if the user page shows the item `key`. */
export const isUserPageShown = key => !hiddenKeys().includes(key);

/** Shows the item `key` on the user page, or hides it. */
export function setUserPageShown(key, shown) {
  if (!known(key)) return;
  const keys = hiddenKeys().filter(k => k !== key);
  settings.set('userPageHidden', shown ? keys : [...keys, key]);
}
