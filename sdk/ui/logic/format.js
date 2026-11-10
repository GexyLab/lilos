/**
 * A value passing in a Logic Studio program, short, for a pill on a link or next to a port:
 * numbers in the user's language, yes/no for booleans, lists and objects summed up.
 */
export function formatLogicValue(v, lang = 'en', max = 18) {
  let s;
  if (v === null) s = '∅';
  else if (typeof v === 'number') s = Number.isFinite(v) ? new Intl.NumberFormat(lang, { maximumFractionDigits: 3 }).format(v) : String(v);
  else if (typeof v === 'boolean') s = v ? (lang.startsWith('it') ? 'sì' : 'yes') : 'no';
  else if (typeof v === 'string') s = v;
  else if (Array.isArray(v)) s = `[${v.length}]`;
  else if (typeof v === 'object' && typeof v.message === 'string' && 'at' in v) s = `⚠ ${v.message}`;
  else if (typeof v === 'object') s = `{${Object.keys(v).slice(0, 2).join(', ')}${Object.keys(v).length > 2 ? '…' : ''}}`;
  else s = String(v);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
