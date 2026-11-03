import { automation, fs, tags } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t, i18n } from './i18n.js';

/**
 * Steps in words: the label of an action, its params as short texts, the references to nodes.
 * lilOS's own actions (lilos.*) are translated here; an app's come translated from its manifest.
 */
const NODE_TYPES = ['file', 'files', 'folder'];
const has = key => t(key) !== key;

export const actionOf = step => automation.describe(step.action);

/** The label of an action ('Ridimensiona'). */
export function actionLabel(id) {
  if (has(`action.${id}`)) return t(`action.${id}`);
  return automation.describe(id)?.label ?? id;
}

/** The label of a param of an action. */
export function paramLabel(id, name, param) {
  if (has(`action.${id}.${name}`)) return t(`action.${id}.${name}`);
  return param?.label || name;
}

export const appName = id => (id ? system.getApp?.(id)?.name ?? id : 'lilOS');
export const appColor = id => (id ? system.getApp?.(id)?.color ?? '#5b6b82' : '#3b6ef5');
export const appGlyph = (id, action) => (id ? system.getApp?.(id)?.glyph ?? 'window' : GLYPHS[action] ?? 'folder');

const GLYPHS = {
  'lilos.create': 'filePlus', 'lilos.rename': 'pencil', 'lilos.move': 'folderOpen', 'lilos.copy': 'file',
  'lilos.trash': 'trash', 'lilos.restore': 'undo', 'lilos.delete': 'trash', 'lilos.emptyTrash': 'trash',
  'lilos.tags': 'tag', 'lilos.open': 'open', 'lilos.launch': 'window', 'lilos.close': 'x',
  'lilos.workspace': 'workspace', 'lilos.setting': 'gear', 'lilos.place': 'grip', 'lilos.arrange': 'grid',
};

/** '~/Documenti/a.txt' for a node, '' if gone. */
export const homePath = id => (id && fs.exists(id) ? fs.tildePath(id) ?? '' : '');

/** A reference of a saved step in words. */
export function refText(ref) {
  if (!ref) return t('ref.none');
  if (ref.input) return ref.parent ? t('ref.inputFolder') : t('ref.input');
  if (Number.isInteger(ref.step)) return Number.isInteger(ref.index) ? t('ref.stepItem', { n: ref.step + 1, k: ref.index + 1 }) : t('ref.step', { n: ref.step + 1 });
  if (ref.id && fs.exists(ref.id)) return homePath(ref.id);
  return ref.path ? ref.path.replace(/^\/home\/[^/]+/, '~') : t('ref.none');
}

export const refKind = ref => (ref?.input || Number.isInteger(ref?.step) ? 'ref' : 'plain');

/** A value of a param in words (references for nodes). */
export function valueText(action, name, p, v) {
  if (v === undefined || v === null || v === '') return t('value.empty');
  switch (p?.type) {
    case 'boolean': return v ? t('value.yes') : t('value.no');
    case 'number': return i18n.number(v);
    case 'choice': {
      const o = p.options?.find(x => x.value === v);
      return has(`action.${action}.${name}.${v}`) ? t(`action.${action}.${name}.${v}`) : o?.label ?? String(v);
    }
    case 'file': case 'folder': return refText(v);
    case 'files': {
      const list = Array.isArray(v) ? v : [v];
      return list.length > 2 ? t('value.items', { n: list.length }) : list.map(refText).join(', ');
    }
    case 'tags': return (Array.isArray(v) ? v : []).map(id => tags.get?.(id)?.name ?? id).join(', ') || t('value.noTags');
    case 'places': return t('value.places', { n: Array.isArray(v) ? v.length : 0 });
    case 'secret': return '••••';
    default:
      if (action === 'lilos.launch' && name === 'app') return appName(v);
      if (action === 'lilos.open' && name === 'app') return v ? appName(v) : t('value.defaultApp');
      if (action === 'lilos.close' && name === 'app') return appName(v);
      if (action === 'lilos.workspace') return system.describeWorkspace?.(v)?.name ?? String(v);
      if (typeof v === 'string') return v;
      return JSON.stringify(v).slice(0, 60);
  }
}

/** The params of a step to show in its row: [{ label, text, kind }] (kind: 'ask' | 'changed' | 'ref' | 'plain'). */
export function stepChips(step) {
  const def = actionOf(step);
  if (!def) return Object.entries(step.params ?? {}).slice(0, 4).map(([name, v]) => ({ label: name, text: JSON.stringify(v).slice(0, 40), kind: 'plain' }));
  const out = [];
  for (const [name, p] of Object.entries(def.params)) {
    if (!(name in step.params) && step.fields?.[name]?.mode !== 'ask' && p.type !== 'secret') continue;
    if (step.action === 'lilos.launch' && name === 'entry' && step.params.entry === 'main') continue;
    const mode = step.fields?.[name]?.mode ?? 'use';
    const text = mode === 'template' ? step.fields[name].template : valueText(step.action, name, p, step.params[name]);
    const kind = mode === 'ask' ? 'ask' : mode === 'template' ? 'template'
      : NODE_TYPES.includes(p.type) ? refKind(Array.isArray(step.params[name]) ? step.params[name][0] : step.params[name])
        : step.changed?.includes(name) ? 'changed' : 'plain';
    out.push({ label: paramLabel(step.action, name, p), text, kind });
  }
  if (step.file) out.unshift({ label: t('field.file'), text: refText(step.file), kind: refKind(step.file) });
  return out;
}

/** True when a step refers to a step that is not before it (it was moved or removed). */
export function brokenRefs(step, index) {
  const refs = [];
  const walk = v => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      if (Number.isInteger(v.step)) refs.push(v.step);
      else if (v.ref) walk(v.ref);
    }
  };
  walk(Object.values(step.params ?? {}));
  walk(step.file);
  return refs.some(n => n < 0 || n >= index);
}

/** A recorded step (not saved yet: node ids) in words, for the recorder. */
export function recordedText(s) {
  const def = automation.describe(s.action);
  const name = id => (id && fs.exists(id) ? fs.get(id).name : fs.trashed().find(n => n.id === id)?.name ?? t('value.gone'));
  const parts = [];
  for (const [nm, p] of Object.entries(def?.params ?? {})) {
    const v = s.params?.[nm];
    if (v === undefined) continue;
    if (s.action === 'lilos.launch' && nm === 'entry') continue;
    // What it was before, when the action says it (a rename: old → new name)
    if (s.defaults && nm in s.defaults && s.changed?.includes(nm) && typeof v === 'string' && p.type === 'text') {
      parts.push({ text: `${s.defaults[nm]} → ${v}`, changed: true });
      continue;
    }
    if (p.subject && s.action === 'lilos.rename') continue;
    let text;
    if (p.type === 'file' || p.type === 'folder') text = name(v);
    else if (p.type === 'files') text = v.length > 2 ? t('value.items', { n: v.length }) : v.map(name).join(', ');
    else text = valueText(s.action, nm, p, v);
    parts.push({ text, changed: s.changed?.includes(nm) });
  }
  if (s.file) parts.unshift({ text: name(s.file), changed: false });
  return parts;
}
