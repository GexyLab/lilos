import { h } from '../core/dom.js';

/**
 * markdown(source, options) → the DOM nodes of a Markdown text, made one by one (never HTML): safe
 * for text that comes from packages, repositories or the network. Put them in an element with the
 * class `lilos-md` for the SDK's styles.
 *
 * Blocks: headings, paragraphs, lists (- * + and 1.), ``` code, > quotes, --- rules, | tables |.
 * Inline: `code`, **bold**, *italic* / _italic_, [text](url), ![alt](url) (shown as its alt text:
 * images are never loaded).
 *
 * Links: http(s) addresses open in a new tab. Any other address goes to `options.link(href)`,
 * which returns a function to call on click (or null: plain text). Without `link` it is plain text.
 */
const INLINE = /(`+)([^`]+?)\1|\*\*(.+?)\*\*|__(.+?)__|\*(?!\s)(.+?)\*|\b_(?!\s)(.+?)_\b|!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))+)>?(?:\s+"[^"]*")?\s*\)|<(https?:\/\/[^>\s]+)>/;

const cells = row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,9}[.)])\s+(.*)$/;
const BLOCK_START = /^\s{0,3}(#{1,6}\s|```|~~~|>|[-*+]\s|\d{1,9}[.)]\s|(-\s*){3,}$|(\*\s*){3,}$)/;
const MAX_DEPTH = 8;

export function markdown(source, options = {}) {
  return blocks(String(source ?? ''), options, 0);
}

function inline(text, options) {
  const out = [];
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) { out.push(rest); break; }
    if (m.index) out.push(rest.slice(0, m.index));
    if (m[2] !== undefined) out.push(h('code', {}, m[2]));
    else if (m[3] !== undefined || m[4] !== undefined) out.push(h('strong', {}, ...inline(m[3] ?? m[4], options)));
    else if (m[5] !== undefined || m[6] !== undefined) out.push(h('em', {}, ...inline(m[5] ?? m[6], options)));
    else if (m[7] !== undefined) out.push(m[7] ? `[${m[7]}]` : '');
    else out.push(link(m[8] ?? m[10], m[9] ?? m[10], options));
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

function link(label, url, options) {
  const children = inline(label, options);
  let safe = null;
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'http:') safe = u.href;
  } catch { /* relative, or not an address */ }
  if (safe) return h('a', { href: safe, target: '_blank', rel: 'noopener noreferrer', title: safe }, ...children);
  const go = typeof options.link === 'function' ? options.link(url) : null;
  if (typeof go !== 'function') return h('span', {}, ...children);
  return h('a', {
    href: '#', dataset: { href: url },
    onclick: e => { e.preventDefault(); go(e); },
  }, ...children);
}

function blocks(source, options, depth) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = /^\s{0,3}(```|~~~)\s*([\w-]*)/.exec(line);
    if (fence) {
      const body = [];
      for (i++; i < lines.length && !lines[i].trimStart().startsWith(fence[1]); i++) body.push(lines[i]);
      i++;
      out.push(h('pre', {}, h('code', fence[2] ? { dataset: { lang: fence[2] } } : {}, body.join('\n'))));
      continue;
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      out.push(h(`h${heading[1].length}`, {}, ...inline(heading[2], options)));
      i++;
      continue;
    }

    if (/^\s{0,3}((-\s*){3,}|(\*\s*){3,}|(_\s*){3,})$/.test(line)) { out.push(h('hr')); i++; continue; }

    if (/^\s{0,3}>/.test(line)) {
      const body = [];
      for (; i < lines.length && /^\s{0,3}>/.test(lines[i]); i++) body.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
      out.push(h('blockquote', {}, ...(depth < MAX_DEPTH ? blocks(body.join('\n'), options, depth + 1) : [body.join(' ')])));
      continue;
    }

    if (line.includes('|') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && lines[i].includes('|') && lines[i].trim(); i++) rows.push(cells(lines[i]));
      out.push(h('div', { class: 'md-table' }, h('table', {},
        h('thead', {}, h('tr', {}, ...head.map(c => h('th', {}, ...inline(c, options))))),
        h('tbody', {}, ...rows.map(r => h('tr', {}, ...head.map((_, k) => h('td', {}, ...inline(r[k] ?? '', options)))))))));
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const ordered = /\d/.test(item[1]);
      const items = [];
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i]);
        if (m && /\d/.test(m[1]) === ordered && !/^\s{2,}/.test(lines[i])) { items.push([m[2]]); i++; continue; }
        // Continuation lines and nested items stay with the item above
        if (items.length && lines[i].trim() && (/^\s{2,}/.test(lines[i]) || !BLOCK_START.test(lines[i]))) { items.at(-1).push(lines[i].trim()); i++; continue; }
        break;
      }
      const start = ordered ? Number.parseInt(item[1], 10) : 1;
      out.push(h(ordered ? 'ol' : 'ul', ordered && start !== 1 ? { start } : {}, ...items.map(([first, ...more]) => {
        const nested = more.filter(l => LIST_ITEM.test(l));
        const text = [first, ...more.filter(l => !LIST_ITEM.test(l))].join(' ');
        return h('li', {}, ...inline(text, options), nested.length && depth < MAX_DEPTH ? blocks(nested.join('\n'), options, depth + 1) : null);
      })));
      continue;
    }

    const para = [];
    for (; i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]); i++) para.push(lines[i].trim());
    if (!para.length) { para.push(line.trim()); i++; }
    out.push(h('p', {}, ...inline(para.join(' '), options)));
  }
  return out;
}
