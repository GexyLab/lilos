/**
 * A little Markdown for the screens before lilOS starts (the license, src/boot/screens.js): headings,
 * paragraphs, lists, rules, **bold**, *italic*, `code` and [links](https://…). Plain DOM, never
 * HTML: the text comes from the network. Headings start from h2 (the screen has the h1).
 */
const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

function inline(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    last = m.index + m[0].length;
    const [, bold, italic, code, label, href] = m;
    let node;
    if (bold != null) (node = document.createElement('strong')).append(...inline(bold));
    else if (italic != null) (node = document.createElement('em')).append(...inline(italic));
    else if (code != null) (node = document.createElement('code')).textContent = code;
    else if (/^https?:\/\//i.test(href)) {
      node = document.createElement('a');
      node.href = href;
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
      node.append(...inline(label));
    } else {
      node = document.createTextNode(label);   // relative links lead nowhere here
    }
    out.push(node);
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

/** The nodes of `source`. */
export function markdown(source) {
  const out = [];
  let para = null;
  let list = null;
  const end = () => { para = null; list = null; };
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    let m;
    if (!line) {
      end();
    } else if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
      end();
      const h = document.createElement(`h${m[1].length + 1}`);
      h.append(...inline(m[2]));
      out.push(h);
    } else if (/^(-{3,}|\*{3,})$/.test(line)) {
      end();
      out.push(document.createElement('hr'));
    } else if ((m = /^(?:[-*]|(\d+)\.)\s+(.*)$/.exec(line))) {
      para = null;
      const tag = m[1] ? 'ol' : 'ul';
      if (list?.tagName.toLowerCase() !== tag) out.push(list = document.createElement(tag));
      const li = document.createElement('li');
      li.append(...inline(m[2]));
      list.append(li);
    } else if (list && !para && /^\s/.test(raw)) {
      list.lastChild.append(' ', ...inline(line));   // a list item that goes on
    } else {
      list = null;
      if (para) para.append(' ', ...inline(line));
      else {
        out.push(para = document.createElement('p'));
        para.append(...inline(line));
      }
    }
  }
  return out;
}
