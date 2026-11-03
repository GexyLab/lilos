import { cleanName } from './text.js';

/**
 * Renaming a file or folder in place (File Manager's list, Editor's tree): the input the caller
 * drew in the node's row, already holding its name. Focuses it and selects the name up to the
 * extension (all of it for a folder); Enter or leaving the field keeps the new name, Esc gives up.
 * Every key stays in the field (the list's shortcuts must not get them).
 *
 *   const name = await inlineRename(input, node);   // node: { name, type }
 *   if (name && fs.exists(id)) renameNode(history, id, name);
 *
 * Resolves the new name (spaces collapsed, trimmed) when it was kept and differs from node.name,
 * otherwise null; after it the caller draws its list again (the input goes away with it).
 *   onDone(name)   called at once, before the promise resolves, with the same value: for callers
 *                  that must act in the same task as the key or the blur
 */
export function inlineRename(input, node, { onDone = null } = {}) {
  return new Promise(resolve => {
    input.focus();
    const dot = node.type === 'file' ? node.name.lastIndexOf('.') : -1;
    input.setSelectionRange(0, dot > 0 ? dot : node.name.length);
    let done = false;
    const finish = keep => {
      if (done) return;
      done = true;
      const value = cleanName(input.value);
      const name = keep && value && value !== node.name ? value : null;
      onDone?.(name);
      resolve(name);
    };
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  });
}
