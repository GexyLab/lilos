import { netError } from './errors.js';

/**
 * A small namespace-aware XML parser for the answers of HTTP services (S3, Azure Blob Storage,
 * WebDAV's multistatus): elements as { ns, name, qname, children, text }, with the namespace
 * resolved (prefixes vary from server to server: D:, d:, lp1:, a default xmlns). No DTD (a
 * DOCTYPE is refused, so no entity tricks), bounded in size, depth and elements: deep nesting would
 * make every namespace lookup walk a long chain of scopes (seconds of CPU for the whole kernel).
 * Throws 'invalid' on what it cannot read.
 */
const LIMITS = { maxLength: 16 << 20, maxDepth: 64, maxElements: 500_000 };

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodeEntities = s => (s.includes('&') ? s.replace(/&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z]{2,4});/g, (m, e) => {
  if (e[0] !== '#') return ENTITIES[e] ?? m;
  const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  try { return String.fromCodePoint(code); } catch { return m; }
}) : s);

const START_TAG = /<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
const ATTRIBUTE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function parseXml(text, limits = {}) {
  const { maxLength, maxDepth, maxElements } = { ...LIMITS, ...limits };
  const bad = () => netError('invalid', 'Risposta del server non valida (XML)');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.length > maxLength) throw bad();
  const root = { ns: '', name: '', qname: '', children: [], text: '' };
  // The open elements, each with the namespaces in scope (a new scope only where one is declared)
  const stack = [{ el: root, scope: { xml: 'http://www.w3.org/XML/1998/namespace', '': '' } }];
  let i = 0, elements = 0;
  while (i < text.length) {
    const top = stack[stack.length - 1];
    const lt = text.indexOf('<', i);
    if (lt < 0) { top.el.text += decodeEntities(text.slice(i)); break; }
    if (lt > i) top.el.text += decodeEntities(text.slice(i, lt));
    if (text.startsWith('<!--', lt)) {
      const end = text.indexOf('-->', lt + 4);
      if (end < 0) throw bad();
      i = end + 3;
    } else if (text.startsWith('<![CDATA[', lt)) {
      const end = text.indexOf(']]>', lt + 9);
      if (end < 0) throw bad();
      top.el.text += text.slice(lt + 9, end);
      i = end + 3;
    } else if (text.startsWith('<?', lt)) {
      const end = text.indexOf('?>', lt + 2);
      if (end < 0) throw bad();
      i = end + 2;
    } else if (text.startsWith('<!', lt)) {
      throw bad();   // DOCTYPE and the like: no service sends them
    } else if (text[lt + 1] === '/') {
      const gt = text.indexOf('>', lt);
      if (gt < 0 || stack.length < 2 || text.slice(lt + 2, gt).trim() !== top.el.qname) throw bad();
      stack.pop();
      i = gt + 1;
    } else {
      START_TAG.lastIndex = lt;
      const m = START_TAG.exec(text);
      if (!m || ++elements > maxElements || stack.length > maxDepth) throw bad();
      let scope = top.scope;
      for (const [, key, v1, v2] of m[2].matchAll(ATTRIBUTE)) {
        if (key !== 'xmlns' && !key.startsWith('xmlns:')) continue;
        if (scope === top.scope) scope = Object.create(top.scope);
        scope[key === 'xmlns' ? '' : key.slice(6)] = decodeEntities(v1 ?? v2 ?? '');
      }
      const colon = m[1].indexOf(':');
      const ns = scope[colon < 0 ? '' : m[1].slice(0, colon)];
      if (ns === undefined) throw bad();   // a prefix never declared
      const el = { ns, name: colon < 0 ? m[1] : m[1].slice(colon + 1), qname: m[1], children: [], text: '' };
      top.el.children.push(el);
      if (!m[3]) stack.push({ el, scope });
      i = START_TAG.lastIndex;
    }
  }
  if (stack.length !== 1) throw bad();
  return root;
}

/** The first child element named `name` (in namespace `ns`, or any), or null. */
export const kid = (el, name, ns) => el?.children.find(c => c.name === name && (ns === undefined || c.ns === ns)) ?? null;
/** The child elements named `name` (in namespace `ns`, or any). */
export const kids = (el, name, ns) => el?.children.filter(c => c.name === name && (ns === undefined || c.ns === ns)) ?? [];
/** The text inside an element (its children's too), trimmed; '' for none. */
export const txt = el => (el ? (el.text + el.children.map(txt).join('')).trim() : '');

/** Text for an XML document: <, >, &, ' and " escaped. */
export const escapeXml = s => String(s).replace(/[<>&'"]/g, c => `&#${c.charCodeAt(0)};`);
