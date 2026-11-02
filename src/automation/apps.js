import { automation, locale } from '@lilos/sdk';
import { apps, registry } from '../apps/registry.js';

/**
 * The actions installed apps declare in their manifest (contributes.automation, checked by the
 * kernel's manifest.js), in the automation catalog with their translated labels:
 *
 *   { id: 'photo.resize', label: 'Resize', target?: 'window', entry?: 'work', result?: 'file',
 *     confirm?: true, params: { width: { type: 'number', label: 'Width', min: 1 }, … } }
 *
 * target 'window': a window of the app does it (lilos automation.handle); entry: one of its
 * entry points does it, called with { automation: { action, params }, files }.
 * Labels: '@automation.<id>.label', '@automation.<id>.params.<name>.label' (and .options.<value>.label).
 */
function defineFor(app) {
  automation.forgetApp(app.id);
  const list = app.text?.contributes?.automation;
  if (!app.package || !Array.isArray(list)) return;
  for (const a of list.slice(0, 30)) {
    if (!a || typeof a.id !== 'string' || !a.id.startsWith(`${app.id}.`)) continue;
    try {
      automation.define(a.id, {
        label: a.label, description: a.description, app: app.id, entry: a.entry ?? null,
        target: a.target, result: a.result, confirm: a.confirm === true, params: a.params ?? {},
      });
    } catch (err) {
      console.warn(`[lilos] ${app.id}: azione ${a.id} non valida:`, err.message);
    }
  }
}

export function connectAppActions() {
  apps.forEach(defineFor);
  registry.on('change', ({ id, app }) => (app ? defineFor(app) : automation.forgetApp(id)));
  locale.on('change', () => apps.forEach(defineFor));
}
