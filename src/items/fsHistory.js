import { fs, locale } from '@lilos/sdk';

const { t } = locale.define('lilos:fsHistory', {
  en: { strings: {
    one: '«{name}»', many: '{n} items', home: 'Home',
    gone: 'The item no longer exists', folderGone: 'The folder they were in no longer exists',
    itemsGone: 'The items no longer exist', notTrashed: 'The items are no longer in the trash',
    createdGone: 'The folder no longer exists', foldersGone: 'The items or the folders no longer exist',
    delete: 'Delete {what}', trash: 'Move {what} to the trash', restore: 'Restore {what}',
    create: 'Create «{name}»', rename: 'Rename «{from}» to «{to}»',
    move: 'Move «{name}» to «{folder}»', moveMany: 'Move {what} to «{folder}»',
  } },
});

/**
 * File system actions that go into an undo history (UndoStack): the desktop, the File Manager and
 * the Editor's folder panel use the same ones, each with its own stack. Every function does the
 * action and records it (stack may be null: then it only does it).
 *
 * Undo and redo check that what they act on still exists: if not they throw, and the stack drops
 * the entry. Undoing a move to the trash takes the nodes out of it; undoing a permanent removal
 * puts them back with their ids and contents (fs.snapshot).
 */
const named = nodes => (nodes.length === 1 ? t('one', { name: nodes[0].name }) : t('many', { n: nodes.length }));

const exists = id => {
  if (!fs.exists(id)) throw new Error(t('gone'));
  return fs.get(id);
};

/**
 * Removes nodes with everything inside them (system ones are skipped): into the trash, or for
 * good with `permanent`.
 */
export async function removeNodes(stack, ids, { permanent = false } = {}) {
  let nodes = ids.map(id => fs.get(id)).filter(n => n && !n.system);
  // Of a network connection: removed on the server, for good, with no undo
  for (const n of nodes) if (n.net && fs.exists(n.id)) fs.remove(n.id);
  nodes = nodes.filter(n => !n.net);
  if (!nodes.length) return;
  if (!permanent) return trashNodes(stack, nodes);
  const targets = nodes.map(n => n.id);
  let snap = await fs.snapshot(targets);
  targets.forEach(id => { if (fs.exists(id)) fs.remove(id); });
  stack?.push({
    label: t('delete', { what: named(nodes) }),
    undo: async () => {
      if (!(await fs.restore(snap)).length) throw new Error(t('folderGone'));
    },
    redo: async () => {
      const present = targets.filter(id => fs.exists(id));
      if (!present.length) throw new Error(t('itemsGone'));
      snap = await fs.snapshot(present);
      present.forEach(id => fs.remove(id));
    },
  });
}

function trashNodes(stack, nodes) {
  let targets = fs.trash(nodes.map(n => n.id));
  if (!targets.length) return;
  stack?.push({
    label: t('trash', { what: named(nodes.filter(n => targets.includes(n.id))) }),
    undo: () => {
      if (!fs.untrash(targets).length) throw new Error(t('notTrashed'));
    },
    redo: () => {
      targets = fs.trash(targets);
      if (!targets.length) throw new Error(t('itemsGone'));
    },
  });
}

/**
 * Takes nodes out of the trash, back where they were or into the folder `parentId` (see
 * fs.untrash). Undo moves them to the trash again. Returns [{ id, parent }] for each one put back.
 */
export function restoreNodes(stack, ids, parentId = null) {
  const restored = fs.untrash(ids, parentId);
  let back = restored.map(r => r.id);
  if (back.length) {
    stack?.push({
      label: t('restore', { what: named(back.map(id => fs.get(id))) }),
      undo: () => {
        back = fs.trash(back);
        if (!back.length) throw new Error(t('itemsGone'));
      },
      redo: () => {
        if (!fs.untrash(back, parentId).length) throw new Error(t('notTrashed'));
      },
    });
  }
  return restored;
}

/** Records a node just created (and maybe already renamed): undo removes it, redo puts it back as it was. */
export function recordCreated(stack, id) {
  const node = fs.get(id);
  if (!stack || !node || node.net) return;   // on a server: removing it again is for good, it cannot come back
  let snap = null;
  stack.push({
    label: t('create', { name: node.name }),
    undo: async () => {
      exists(id);
      snap = await fs.snapshot([id]);   // what was written in it meanwhile comes back on redo
      fs.remove(id);
    },
    redo: async () => {
      if (!snap || !(await fs.restore(snap)).length) throw new Error(t('createdGone'));
    },
  });
}

/** Renames; returns the final name (made unique by fs). */
export function renameNode(stack, id, name) {
  const before = exists(id).name;
  const after = fs.rename(id, name);
  if (after !== before) {
    stack?.push({
      label: t('rename', { from: before, to: after }),
      undo: () => { exists(id); fs.rename(id, before); },
      redo: () => { exists(id); fs.rename(id, after); },
    });
  }
  return after;
}

/** Moves into another folder; returns the final name. */
export function moveNode(stack, id, parentId) {
  const node = exists(id);
  const from = node.parent;
  const name = fs.move(id, parentId);
  if (from !== parentId) {
    const where = fs.get(parentId);
    stack?.push({
      label: t('move', { name, folder: where.name || t('home') }),
      undo: () => { exists(id); fs.move(id, from); },
      redo: () => { exists(id); fs.move(id, parentId); },
    });
  }
  return name;
}

/**
 * Moves several nodes into a folder as one step (dragging a selection). Nodes already there, or
 * that cannot go (system, the folder itself or one around it), are skipped. Undo puts each one
 * back in its folder with its old name. Returns the ids moved; throws if none could move.
 */
export function moveNodes(stack, ids, parentId) {
  const moves = [];
  let error = null;
  for (const id of ids) {
    const node = fs.get(id);
    if (!node || node.parent === parentId) continue;
    try {
      fs.move(id, parentId);
      moves.push({ id, from: node.parent, name: node.name });
    } catch (err) {
      error ??= err;
    }
  }
  if (!moves.length) {
    if (error) throw error;
    return [];
  }
  const where = fs.get(parentId);
  // Each one that can, in `to` (or its folder of origin); throws if none could
  const apply = to => {
    let done = 0;
    for (const m of moves) {
      try {
        exists(m.id);
        fs.move(m.id, to ?? m.from);
        if (!to && fs.get(m.id).name !== m.name) fs.rename(m.id, m.name);
        done++;
      } catch { /* gone, or its folder is: skipped */ }
    }
    if (!done) throw new Error(t('foldersGone'));
  };
  stack?.push({
    label: t('moveMany', { what: named(moves), folder: where.name || t('home') }),
    undo: () => apply(null),
    redo: () => apply(parentId),
  });
  return moves.map(m => m.id);
}
