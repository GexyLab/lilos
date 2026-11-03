import { fs } from '@lilos/sdk';
import { resolve } from './shell/paths.js';
import { byName } from './shell/paths.js';

/**
 * Tab completion of the word before the cursor: command names at the start of a command
 * (after |, ;, &&, $( …), variables after $, otherwise paths of lilOS.
 * Returns { start, end, items: [{ value, label, folder }] }: the word to replace and the candidates.
 */
const SPECIAL = /[\s'"\\$`|&;<>()*?[\]{}!#]/g;
const escape = s => s.replace(SPECIAL, '\\$&');

export function complete(shell, line, cursor) {
  const before = line.slice(0, cursor);
  // The word: back to an unescaped blank or operator (quotes are not followed, kept simple)
  let start = cursor;
  while (start > 0 && !(/[\s|&;<>()]/.test(before[start - 1]) && before[start - 2] !== '\\')) start--;
  const raw = before.slice(start);
  const word = raw.replace(/\\(.)/g, '$1').replace(/^['"]/, '');
  const prefix = before.slice(0, start).trimEnd();
  const commandPosition = !prefix || /(^|[|&;(]|\$\(|\b(then|do|else|elif|if|while|until|sudo|xargs|time|command|which|type|help))$/.test(prefix);

  const variable = /\$\{?([A-Za-z_]\w*)?$/.exec(word);
  if (variable) {
    const name = variable[1] ?? '';
    const head = word.slice(0, word.length - name.length);
    const items = shell.variables().map(([n]) => n).filter(n => n.startsWith(name))
      .map(n => ({ value: head + n + (head.endsWith('{') ? '}' : ''), label: n }));
    return { start, end: cursor, items };
  }

  if (commandPosition && !word.includes('/')) {
    const names = new Set([...shell.commands.names(), ...shell.functions.keys(), ...shell.aliases.keys()]);
    const items = [...names].filter(n => n.startsWith(word)).sort(byName).map(n => ({ value: escape(n), label: n }));
    if (items.length || !word) return { start, end: cursor, items };
  }

  // A path: the folder part as written, the last part completed
  const slash = word.lastIndexOf('/');
  const dirText = slash >= 0 ? word.slice(0, slash + 1) : '';
  const partial = slash >= 0 ? word.slice(slash + 1) : word;
  let dirPath = dirText || '.';
  if (dirPath === '~/' || dirPath.startsWith('~/')) dirPath = (shell.getVar('HOME') ?? fs.home) + dirPath.slice(1);
  const dir = resolve(shell.cwd, dirPath);
  if (dir?.type !== 'folder') return { start, end: cursor, items: [] };
  const lower = partial.toLowerCase();
  const items = fs.children(dir.id)
    .filter(n => n.name.toLowerCase().startsWith(lower) && (partial.startsWith('.') || !n.name.startsWith('.')))
    .sort((a, b) => byName(a.name, b.name))
    .map(n => ({ value: escape(dirText) + escape(n.name) + (n.type === 'folder' ? '/' : ''), label: n.name + (n.type === 'folder' ? '/' : ''), folder: n.type === 'folder' }));
  return { start, end: cursor, items };
}

/** The longest start shared by all the values (case-insensitive like lilOS names, the first's case). */
export function commonPrefix(values) {
  if (!values.length) return '';
  let p = values[0];
  for (const v of values.slice(1)) {
    let i = 0;
    while (i < p.length && i < v.length && p[i].toLowerCase() === v[i].toLowerCase()) i++;
    p = p.slice(0, i);
  }
  return p;
}
