import { settings, locale } from '@lilos/sdk';

const { t } = locale.define('lilos:systemSettings', {
  en: { strings: {
    'retention.days': { one: '{n} day', other: '{n} days' }, 'retention.year': '1 year', 'retention.forever': 'Forever',
    lasso: '{keys} + drag',
    'color.blue': 'Blue', 'color.violet': 'Violet', 'color.magenta': 'Magenta', 'color.red': 'Red', 'color.orange': 'Orange',
    'color.green': 'Green', 'color.teal': 'Teal', 'color.graphite': 'Graphite',
    'color.night': 'Night', 'color.deepBlue': 'Deep blue', 'color.forest': 'Forest', 'color.plum': 'Plum', 'color.earth': 'Earth',
    'color.mist': 'Mist', 'color.sky': 'Sky', 'color.sage': 'Sage', 'color.sand': 'Sand',
  } },
});

const RETENTION_DAYS = [1, 7, 14, 30, 60, 90, 365, 0];
const LASSO_VALUES = ['Alt', 'Ctrl+Alt', 'Alt+Shift'];
const ACCENT_COLORS = [
  ['#3b6ef5', 'blue'], ['#7c5cdb', 'violet'], ['#c2417a', 'magenta'], ['#e5484d', 'red'],
  ['#d9822b', 'orange'], ['#30a46c', 'green'], ['#0d9488', 'teal'], ['#5f6673', 'graphite'],
];
const DESK_COLOR_LIST = [
  ['#1f2227', 'graphite'], ['#101826', 'night'], ['#1d3352', 'deepBlue'], ['#1d3b34', 'forest'], ['#3a2340', 'plum'],
  ['#43302a', 'earth'], ['#e6e8ec', 'mist'], ['#d9e5f2', 'sky'], ['#dde9dc', 'sage'], ['#efe5d8', 'sand'],
];
const retentionLabel = days => (days === 0 ? t('retention.forever') : days === 365 ? t('retention.year') : t('retention.days', { n: days }));
const lassoLabel = value => t('lasso', { keys: value.split('+').join(' + ') });

/** System preferences and their defaults. Imported first by main.js, before anyone reads them. */
settings.define({
  accent: '#3b6ef5',   // main color
  motion: true,        // animations and transitions
  snap: true,          // desktop items snap to the grid when dropped
  minimap: true,       // minimap in the HUD
  lasso: 'Alt',        // modifiers that turn a drag on the desk into a free-form (lasso) selection
  theme: 'dark',       // 'dark' (desk, chrome and windows dark) or 'light' (all light)
  deleteConfirm: true,     // ask before deleting files and folders
  deletePermanent: false,  // delete for good instead of moving to the trash
  trashRetention: 30,      // days an item stays in the trash before it is deleted for good (0: forever)
  deskHidden: [],          // keys of the fixed desk items turned off in every workspace (desktop/fixedItems.js)
  deskPreviews: false,     // files on the desk show the preview their app makes instead of their icon (apps/thumbnails.js)
  deskColor: '',           // color of the desk background ('' for the theme's)
  wallpaper: '',           // id of the image file behind the desk, '' for none (desktop/wallpaper.js)
  startupApps: true,       // open the apps chosen in Control Panel → Avvio when the user comes in (apps/startup.js)
  userPhoto: '',           // profile photo: a small JPEG as a data: URL, '' for none (user/photo.js)
  userPageHidden: [],      // keys of what the user page does not show (user/items.js)
  notifyShown: 5,          // notifications the notification bar shows together (notifications/NotificationBell.js)
  notifySeconds: 10,       // seconds the bar stays after the last one arrived
  taskbarWorkspaces: 'current',  // taskbar: 'current' (one button, the current workspace) or 'all' (one per workspace) (workspaces/WorkspaceSwitcher.js)
});

/** How long the trash keeps what it holds (days; 0 never deletes by itself), labels in the system's language. */
export const retentionOptions = () => RETENTION_DAYS.map(value => ({ value, label: retentionLabel(value) }));

/** Modifier combinations that can start the lasso (a plain drag draws the rectangle). */
export const lassoOptions = () => LASSO_VALUES.map(value => ({ value, label: lassoLabel(value) }));

/**
 * How a drag on the desk background selects, from the modifiers held when it starts:
 * { mode: 'lasso' | 'rect', additive } — additive (keep the current selection) with Ctrl/Cmd or
 * Shift, unless that key is part of the lasso combination.
 */
export function selectionMode(e) {
  const stored = settings.get('lasso');
  const combo = (LASSO_VALUES.includes(stored) ? stored : 'Alt').split('+');
  const held = { Ctrl: e.ctrlKey || e.metaKey, Alt: e.altKey, Shift: e.shiftKey };
  const lasso = combo.every(k => held[k]);
  const additive = (held.Ctrl && !(lasso && combo.includes('Ctrl'))) || (held.Shift && !(lasso && combo.includes('Shift')));
  return { mode: lasso ? 'lasso' : 'rect', additive };
}

/** Accent colors, labels in the system's language. */
export const accents = () => ACCENT_COLORS.map(([value, name]) => ({ value, label: t(`color.${name}`) }));

/** Colors offered for the desk background (any other hex color works too). */
export const deskColors = () => DESK_COLOR_LIST.map(([value, name]) => ({ value, label: t(`color.${name}`) }));

// The same lists as constants, for apps built before the functions (Control Panel): the values are
// fixed, the labels are read in the system's language when used
const lazy = (pairs, label) => Object.freeze(pairs.map(([value, name]) => Object.freeze({ value, get label() { return label(value, name); } })));
export const RETENTION_OPTIONS = lazy(RETENTION_DAYS.map(v => [v]), retentionLabel);
export const LASSO_OPTIONS = lazy(LASSO_VALUES.map(v => [v]), lassoLabel);
export const ACCENTS = lazy(ACCENT_COLORS, (value, name) => t(`color.${name}`));
export const DESK_COLORS = lazy(DESK_COLOR_LIST, (value, name) => t(`color.${name}`));

const root = document.documentElement;

/** True for a light color (#rrggbb): what is drawn on it must then be dark. */
function isLight(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3;
}

// What the desk color decides: its dots, and labels and hovers on it, dark on a light color and light on a dark one
const DESK_VARS = ['--canvas', '--canvas-dot', '--on-canvas', '--on-canvas-hover', '--on-canvas-shadow'];
const ON_DARK = ['rgba(255, 255, 255, .09)', '#e9ebef', 'rgba(255, 255, 255, .07)', '0 1px 2px rgba(0, 0, 0, .6)'];
const ON_LIGHT = ['rgba(0, 0, 0, .13)', '#1f2328', 'rgba(0, 0, 0, .06)', '0 1px 2px rgba(255, 255, 255, .8)'];

settings.watch('accent', color => {
  // Stored values are untrusted: only a plain hex color reaches the stylesheet
  if (/^#[0-9a-f]{6}$/i.test(color)) root.style.setProperty('--accent', color);
});
settings.watch('deskColor', color => {
  // Stored values are untrusted: only a plain hex color reaches the stylesheet; otherwise the theme's
  if (!/^#[0-9a-f]{6}$/i.test(color)) return DESK_VARS.forEach(v => root.style.removeProperty(v));
  [color, ...(isLight(color) ? ON_LIGHT : ON_DARK)].forEach((value, i) => root.style.setProperty(DESK_VARS[i], value));
});
settings.watch('theme', theme => {
  root.dataset.theme = theme === 'light' ? 'light' : 'dark';
});
settings.watch('motion', on => {
  if (on) delete root.dataset.motion;
  else root.dataset.motion = 'off';
});
