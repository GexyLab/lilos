import { h, fs, splitName } from '@lilos/sdk';

/**
 * A note is a text file `.sticky`: plain text with a few rules, so that any editor opens it.
 *
 *   the first line        the title
 *   - text / * text       a bulleted line
 *   - [ ] text / - [x]    a line with a box to tick
 *   **text**              bold
 *
 * What is not text is the app's data on the file (fs.setAppMeta, at most 1 KB): its color and
 * size on the desk, the title and the start of the text (the window lists the notes of every
 * desk without reading them), the reminder, and the name the app gave the file (it follows the
 * title until the user renames it).
 */
export const APP_ID = 'stickynotes';
export const EXT = 'sticky';

/** The paper: the same in the light and dark themes. */
export const COLORS = {
  yellow: '#fff0a3', pink: '#ffd3de', green: '#cdeec4', blue: '#cce3ff', violet: '#e3d8ff', orange: '#ffd9b3',
};
export const COLOR_NAMES = Object.keys(COLORS);
export const INK = '#2b2a26';

export const SIZES = { small: [160, 140], medium: [200, 180], large: [280, 240] };
export const MIN = { w: 120, h: 90 };
export const MAX = { w: 600, h: 600 };
const TITLE_MAX = 80;
const EXCERPT_MAX = 240;
const NAME_MAX = 60;

const clamp = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** The app's data on a note, checked (it is stored, so untrusted), with defaults. */
export function metaOf(node, defaults = {}) {
  const m = node?.apps?.[APP_ID] ?? {};
  const color = COLOR_NAMES.includes(m.color) ? m.color : COLOR_NAMES.includes(defaults.color) ? defaults.color : 'yellow';
  const [dw, dh] = SIZES.medium;
  return {
    color,
    w: clamp(m.w, MIN.w, MAX.w, dw),
    h: clamp(m.h, MIN.h, MAX.h, dh),
    title: text(m.title, TITLE_MAX),
    excerpt: text(m.excerpt, EXCERPT_MAX),
    remind: Number.isSafeInteger(m.remind) && m.remind > 0 ? m.remind : null,
    task: typeof m.task === 'string' && m.task.length <= 80 ? m.task : null,
    auto: m.auto !== false,
    named: typeof m.named === 'string' ? m.named.slice(0, 255) : null,
    checks: Array.isArray(m.checks) && m.checks.length === 2 && m.checks.every(Number.isSafeInteger) ? m.checks : null,
  };
}

/** The data as stored: only what is not a default, small. */
export function packMeta(m) {
  const out = { color: m.color, w: m.w, h: m.h };
  if (m.title) out.title = m.title.slice(0, TITLE_MAX);
  if (m.excerpt) out.excerpt = m.excerpt.slice(0, EXCERPT_MAX);
  if (m.remind) out.remind = m.remind;
  if (m.task) out.task = m.task;
  if (m.auto === false) out.auto = false;
  if (m.named) out.named = m.named;
  if (m.checks) out.checks = m.checks;
  return out;
}

const CHECK = /^\s*[-*]\s+\[( |x|X)\]\s?(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;

/** The kind of a line: { kind: 'check', done, text } | { kind: 'bullet', text } | { kind: 'text', text }. */
export function lineOf(line) {
  const check = CHECK.exec(line);
  if (check) return { kind: 'check', done: check[1] !== ' ', text: check[2] };
  const bullet = BULLET.exec(line);
  if (bullet) return { kind: 'bullet', text: bullet[1] };
  return { kind: 'text', text: line };
}

/** Title (first line, without its marks), the rest's lines, the boxes ticked of all. */
export function parse(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const first = lineOf(lines[0] ?? '');
  const title = plain(first.text).trim();
  const body = lines.slice(1).map((line, i) => ({ ...lineOf(line), line: i + 1 }));
  // Empty lines at the end say nothing
  while (body.length && body.at(-1).kind === 'text' && !body.at(-1).text.trim()) body.pop();
  const checks = body.filter(l => l.kind === 'check');
  return { title, body, checks: checks.length ? [checks.filter(l => l.done).length, checks.length] : null };
}

/** The text without its marks (for the title and the excerpt). */
export const plain = s => String(s).replace(/\*\*(.+?)\*\*/g, '$1');

/** What the app keeps on the file: title, the start of the rest, the boxes. */
export function summary(source) {
  const { title, body, checks } = parse(source);
  const excerpt = body.map(l => plain(l.text).trim()).filter(Boolean).join(' · ').slice(0, EXCERPT_MAX);
  return { title: title.slice(0, TITLE_MAX), excerpt, checks };
}

/** The text with the box of line `index` ticked or not. */
export function toggleLine(source, index) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const m = CHECK.exec(lines[index] ?? '');
  if (!m) return source;
  lines[index] = lines[index].replace(/\[( |x|X)\]/, m[1] === ' ' ? '[x]' : '[ ]');
  return lines.join('\n');
}

/** A line's text with **bold** as <b>. */
export function inline(s) {
  const out = [];
  let last = 0;
  for (const m of String(s).matchAll(/\*\*(.+?)\*\*/g)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(h('b', {}, m[1]));
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** The name a note's file gets from its title ('' when the title has nothing usable). */
export function nameFor(title, untitled) {
  const base = fs.cleanName(String(title ?? '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).trim();
  return `${base || untitled}.${EXT}`;
}

/** True for a .sticky file. */
export const isNote = node => node?.type === 'file' && splitName(node.name)[1].toLowerCase() === EXT;

/** The name of a note without its extension, for a note the app never saw (made by the Editor). */
export const bareName = node => splitName(node.name)[0];
