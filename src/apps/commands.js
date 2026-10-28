import { shortcuts } from '@lilos/sdk';

/**
 * App shortcuts: declared in the registry (`commands`), registered at start-up in the group named
 * after the app, run by whichever handler the app attached and reports active.
 */
const handlers = new Map(); // command id → Set<{ isActive(), run(event) }>

const active = id => [...(handlers.get(id) ?? [])].find(h => h.isActive()) ?? null;

export function registerAppCommands(apps) {
  for (const app of apps) {
    for (const cmd of app.commands ?? []) {
      shortcuts.register({
        id: cmd.id, label: cmd.label, group: app.name, keys: cmd.keys,
        whenEditing: cmd.whenEditing ?? true,   // app commands mostly run while typing (Ctrl+S)
        when: () => !!active(cmd.id),
        run: e => active(cmd.id).run(e),
      });
    }
  }
}

/** An app window handles a command while isActive() is true. Returns the function that detaches it. */
export function handleCommand(id, handler) {
  if (!handlers.has(id)) handlers.set(id, new Set());
  handlers.get(id).add(handler);
  return () => handlers.get(id).delete(handler);
}
