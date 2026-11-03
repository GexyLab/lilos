import { fs, notifications } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t } from './i18n.js';

/**
 * The automations as files: .automata in the user's home (lilOS's library indexes them),
 * new ones in ~/Automazioni. Reading checks them (they are untrusted); writing is JSON.
 */
export const engine = () => system.automations ?? null;
export const library = () => engine()?.library ?? null;

export async function load(id) {
  return engine().check(await fs.read(id));
}

export async function save(id, doc) {
  await fs.write(id, `${JSON.stringify(doc, null, 2)}\n`);
}

/** A new file for an automation, in ~/Automazioni; resolves with its id. */
export async function create(doc) {
  const folder = engine().folder();
  const base = fs.cleanName(doc.name || t('newName'), { portable: true }) || t('newName');
  const node = fs.create(folder.id, { type: 'file', name: fs.uniqueName(folder.id, `${base}.automata`) });
  await save(node.id, doc);
  return node.id;
}

export const tell = (text, level = 'info') => notifications.send({ app: 'automata', text, level }).catch(() => {});
