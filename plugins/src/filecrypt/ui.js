import { h, baseStyle } from '../shared/sandbox/dom.js';

/**
 * What FileCrypt's windows share. The app runs isolated (a sandbox) or in a Shadow DOM: it has no
 * lilOS SDK, only `lilos` (the shared sandbox kit: h, the base style). Texts always go in as text,
 * never as HTML (file names are untrusted).
 */
export { h };

/** A select of [value, label] options. */
export function select(options, value, onChange) {
  const el = h('select', { onchange: () => onChange?.(el.value) }, ...options.map(([v, label]) => h('option', { value: v }, label)));
  el.value = String(value);
  return el;
}

/**
 * A channel with the vault: ask(message) → its answer (throws with the vault's error), and
 * onStatus(fn) for the list of unlocked files it sends while the window follows it.
 */
export async function vaultChannel(lilos) {
  const port = await lilos.app.connect('vault');
  const pending = new Map();
  const listeners = new Set();
  let next = 1;
  port.onmessage = e => {
    const m = e.data ?? {};
    if (m.status && m.id == null) return listeners.forEach(fn => fn(m.status));
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error)); else p.resolve(m);
  };
  return {
    ask: message => new Promise((resolve, reject) => {
      const id = next++;
      pending.set(id, { resolve, reject });
      port.postMessage({ ...message, id });
    }),
    onStatus: fn => listeners.add(fn),
    close: () => port.close(),
  };
}

export const STYLE = baseStyle('fc', { gap: 14, overflow: 'auto' }) + `
  .fc h2 { font-size: 12px; font-weight: 600; margin: 4px 0 0; color: var(--dim); text-transform: uppercase; letter-spacing: .04em; }
  .fc .fc-form { display: flex; flex-direction: column; gap: 12px; }
  .fc label { display: flex; flex-direction: column; gap: 5px; font-weight: 500; }
  .fc .error { min-height: 1.45em; }
  .fc .warn { padding: 9px 11px; background: color-mix(in srgb, var(--danger, #d64545) 10%, transparent); }
  .fc .meter { display: flex; gap: 4px; }
  .fc .meter span { flex: 1; height: 4px; border-radius: 2px; background: var(--border); }
  .fc .meter[data-level="1"] span:nth-child(-n+1) { background: #d64545; }
  .fc .meter[data-level="2"] span:nth-child(-n+2) { background: #e0a030; }
  .fc .meter[data-level="3"] span:nth-child(-n+3) { background: #7fb24a; }
  .fc .meter[data-level="4"] span { background: #3f9d5c; }
  .fc .hint { font-weight: 400; }
  .fc details { border: 1px solid var(--border); border-radius: var(--radius-sm, 6px); padding: 6px 10px; }
  .fc details[open] { padding-bottom: 10px; }
  .fc details > div { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  .fc summary { cursor: pointer; font-weight: 500; }
  .fc li { padding: 7px 10px; }
  .fc li .when { color: var(--dim); font-size: 12px; }
  .fc .settings { display: grid; grid-template-columns: 1fr; gap: 10px; }
`;
