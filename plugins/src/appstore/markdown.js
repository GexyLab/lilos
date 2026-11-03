import { h } from '@lilos/sdk';

/**
 * A small Markdown renderer for the READMEs of the repositories. They come from anyone: the text
 * becomes DOM nodes one by one (never HTML), links open only http(s) addresses, in a new tab, and
 * images are not loaded (their alt text is shown instead).
 *
 * Blocks: headings, paragraphs, lists (- * + and 1.), ``` code, > quotes, --- rules, | tables |.
 * Inline: `code`, **bold**, *italic* / _italic_, [text](url), ![alt](url).
 */
const INLINE = /(`+)([^`]+?)\1|\*\*(.+?)\*\*|__(.+?)__|\*(?!\s)(.+?)\*|\b_(?!\s)(.+?)_\b|!\[([^\]]*)\]\([^)]*\)|\[([^\]]+)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))+)>?(?:\s+"[^"]*")?\s*\)|<(https?:\/\/[^>\s]+)>/;

function inline(text) {
  const out = [];
  let rest = text;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) { out.push(rest); break; }
    if (m.index) out.push(rest.slice(0, m.index));
    if (m[2] !== undefined) out.push(h('code', {}, m[2]));
    else if (m[3] !== undefined || m[4] !== undefined) out.push(h('strong', {}, ...inline(m[3] ?? m[4])));
    else if (m[5] !== undefined || m[6] !== undefined) out.push(h('em', {}, ...inline(m[5] ?? m[6])));
    else if (m[7] !== undefined) out.push(m[7] ? `[${m[7]}]` : '');
    else out.push(link(m[8] ?? m[10], m[9] ?? m[10]));
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

function link(label, url) {
  let safe = null;
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'http:') safe = u.href;
  } catch { /* relative or not an address: plain text */ }
  const children = inline(label);
  return safe ? h('a', { href: safe, target: '_blank', rel: 'noopener noreferrer', title: safe }, ...children) : h('span', {}, ...children);
}

const cells = row => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,9}[.)])\s+(.*)$/;
const BLOCK_START = /^\s{0,3}(#{1,6}\s|```|~~~|>|[-*+]\s|\d{1,9}[.)]\s|(-\s*){3,}$|(\*\s*){3,}$)/;

export function renderMarkdown(source) {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = /^\s{0,3}(```|~~~)/.exec(line);
    if (fence) {
      const body = [];
      for (i++; i < lines.length && !lines[i].trimStart().startsWith(fence[1]); i++) body.push(lines[i]);
      i++;
      out.push(h('pre', {}, h('code', {}, body.join('\n'))));
      continue;
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      out.push(h(`h${heading[1].length}`, {}, ...inline(heading[2])));
      i++;
      continue;
    }

    if (/^\s{0,3}((-\s*){3,}|(\*\s*){3,}|(_\s*){3,})$/.test(line)) { out.push(h('hr')); i++; continue; }

    if (/^\s{0,3}>/.test(line)) {
      const body = [];
      for (; i < lines.length && /^\s{0,3}>/.test(lines[i]); i++) body.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
      out.push(h('blockquote', {}, ...renderMarkdown(body.join('\n'))));
      continue;
    }

    if (line.includes('|') && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && lines[i].includes('|') && lines[i].trim(); i++) rows.push(cells(lines[i]));
      out.push(h('div', { class: 'md-table' }, h('table', {},
        h('thead', {}, h('tr', {}, ...head.map(c => h('th', {}, ...inline(c))))),
        h('tbody', {}, ...rows.map(r => h('tr', {}, ...head.map((_, k) => h('td', {}, ...inline(r[k] ?? '')))))))));
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
      out.push(h(ordered ? 'ol' : 'ul', {}, ...items.map(([first, ...more]) => {
        const nested = more.filter(l => LIST_ITEM.test(l));
        const text = [first, ...more.filter(l => !LIST_ITEM.test(l))].join(' ');
        return h('li', {}, ...inline(text), nested.length ? renderMarkdown(nested.join('\n')) : null);
      })));
      continue;
    }

    const para = [];
    for (; i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]); i++) para.push(lines[i].trim());
    if (!para.length) { para.push(line.trim()); i++; }
    out.push(h('p', {}, ...inline(para.join(' '))));
  }
  return out;
}
