import { baseStyle } from '../shared/sandbox/dom.js';

/**
 * The style of Zip's window. The app runs isolated (a sandbox) or in a Shadow DOM: it has no lilOS
 * SDK, only `lilos`. The base every isolated app shares, and the list of what an archive holds.
 */
export const STYLE = baseStyle('zp') + `
  .zp .list { flex: 1; min-height: 60px; overflow: auto; }
  .zp .list li { padding: 5px 10px; }
  .zp .list .folder .name { color: var(--dim); }
  .zp .list .size { color: var(--dim); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .zp .list .more { color: var(--dim); font-style: italic; }
  .zp .empty { border: 1px solid var(--border); border-radius: var(--radius-sm, 6px); }
  .zp .ok { color: var(--text); }
`;
