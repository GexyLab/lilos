import { settings, locale } from '@lilos/sdk';

const { t } = locale.define('lilos:userPageItems', {
  en: { strings: {
    'group.header': 'Header', 'group.actions': 'Actions', 'group.account': 'Account', 'group.session': 'This session', 'group.footer': 'Footer',
    'details.name': 'Username and role', 'details.description': 'Under the name: the name you sign in with and whether you are an administrator',
    'lock.name': 'Lock', 'lock.description': 'Covers the screen until you type your password again; your apps stay open',
    'logout.name': 'Sign out', 'logout.description': 'Saves, closes the apps and goes back to the sign-in screen',
    'restart.name': 'Restart the system', 'restart.description': 'Restarts the lilOS kernel for all users; administrators only',
    'shutdown.name': 'Shut down', 'shutdown.description': 'Stops lilOS for all users (in the lilOS program it closes the program too); administrators only',
    'photo.name': 'Profile photo', 'photo.description': 'Choose, change or remove the photo',
    'theme.name': 'Theme', 'theme.description': 'Light or dark',
    'language.name': 'Language', 'language.description': 'The language of the apps',
    'settings.name': 'All settings', 'settings.description': 'Opens Control Panel',
    'workspace.name': 'Workspace', 'workspace.description': 'The one you are in and how many there are',
    'windows.name': 'Open windows', 'windows.description': 'How many windows are open and how many apps work in the background',
    'startup.name': 'At startup', 'startup.description': 'How many apps open when you sign in',
    'storage.name': 'Space used', 'storage.description': 'How much space your files take',
    'about.name': 'lilOS version', 'about.description': 'The version of lilOS and the address you are connected to',
  } },
});

/** A group: its name in the system's language, read when shown. */
const group = key => Object.freeze({ key, get name() { return t(`group.${key}`); } });
/** An item: name and description in the system's language, read when shown. */
const item = (key, group, glyph) => Object.freeze({
  key, group, glyph,
  get name() { return t(`${key}.name`); },
  get description() { return t(`${key}.description`); },
});

/**
 * What the user page (opened from the user's name in the taskbar or in the menu) can show, by
 * group, in this order. Name and photo are always there; each of these is turned on or off in
 * Control Panel → Pagina utente (the 'userPageHidden' setting holds the keys turned off). Some fields
 * are for Control Panel, which reads these lists.
 *   key          stable id
 *   group        key of its group
 *   name         label in Control Panel (in the system's language)
 *   glyph        SDK icon
 *   description  what it shows or does
 */
export const USER_PAGE_GROUPS = Object.freeze(['header', 'actions', 'account', 'session', 'footer'].map(group));

export const USER_PAGE_ITEMS = Object.freeze([
  item('details', 'header', 'user'),
  item('lock', 'actions', 'lock'),
  item('logout', 'actions', 'logout'),
  item('restart', 'actions', 'restart'),
  item('shutdown', 'actions', 'power'),
  item('photo', 'account', 'camera'),
  item('theme', 'account', 'palette'),
  item('language', 'account', 'globe'),
  item('settings', 'account', 'gear'),
  item('workspace', 'session', 'workspace'),
  item('windows', 'session', 'window'),
  item('startup', 'session', 'power'),
  item('storage', 'session', 'disk'),
  item('about', 'footer', 'info'),
]);

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
