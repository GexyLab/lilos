import { Emitter } from './events.js';
import { storage, uid } from './storage.js';
import { fs } from './fs.js';

const STORAGE_KEY = 'tags';
const MAX_TAGS = 100;
const MAX_NAME = 30;
const ID = /^[\w-]{1,40}$/;
const COLOR = /^#[0-9a-f]{6}$/i;

/** Colors offered for tags, in order (a new tag takes the first one not in use). */
export const TAG_COLORS = [
  { value: '#e5484d', label: 'Rosso' },
  { value: '#d9822b', label: 'Arancione' },
  { value: '#d4a72c', label: 'Giallo' },
  { value: '#30a46c', label: 'Verde' },
  { value: '#0d9488', label: 'Verde acqua' },
  { value: '#3b6ef5', label: 'Blu' },
  { value: '#7c5cdb', label: 'Viola' },
  { value: '#8b8d98', label: 'Grigio' },
];

const cleanName = v => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '');

/**
 * Tags that can be put on files and folders (fs.setTags) to find them wherever they are
 * (fs.tagged). Defined here, shared by every workspace, saved under 'lilos:tags':
 *
 *   Tag: { id, name, color, visible }
 *
 * Names are unique (case-insensitive). An invisible tag hides the items that carry it everywhere
 * (fs.setHiddenTags): they are found again only through the tag. Deleting a tag takes it off
 * every item.
 *
 * Events: 'change' (after every change)
 */
class Tags extends Emitter {
  #list = [];

  constructor() {
    super();
    this.#list = load();
    this.#apply();
  }

  /** Every tag, in creation order (copies). */
  list() {
    return this.#list.map(t => ({ ...t }));
  }

  get(id) {
    const tag = this.#list.find(t => t.id === id);
    return tag ? { ...tag } : null;
  }

  /** The tag with this name (case-insensitive), or null. */
  byName(name) {
    const key = cleanName(name).toLowerCase();
    const tag = this.#list.find(t => t.name.toLowerCase() === key);
    return tag ? { ...tag } : null;
  }

  /** New visible tag; returns it. Throws if the name is empty or taken, or there are too many. */
  create({ name, color } = {}) {
    const clean = cleanName(name);
    if (!clean) throw new Error('Il nome del tag non può essere vuoto');
    if (this.byName(clean)) throw new Error(`Esiste già un tag «${clean}»`);
    if (this.#list.length >= MAX_TAGS) throw new Error(`Al massimo ${MAX_TAGS} tag`);
    const used = new Set(this.#list.map(t => t.color));
    const tag = {
      id: uid(), name: clean, visible: true,
      color: COLOR.test(color ?? '') ? color : (TAG_COLORS.find(c => !used.has(c.value)) ?? TAG_COLORS[this.#list.length % TAG_COLORS.length]).value,
    };
    this.#list.push(tag);
    this.#save();
    return { ...tag };
  }

  /** Throws if the name is empty or used by another tag. */
  rename(id, name) {
    const tag = this.#list.find(t => t.id === id);
    const clean = cleanName(name);
    if (!tag) throw new Error('Tag inesistente');
    if (!clean) throw new Error('Il nome del tag non può essere vuoto');
    if (clean === tag.name) return;
    const other = this.byName(clean);
    if (other && other.id !== id) throw new Error(`Esiste già un tag «${clean}»`);
    tag.name = clean;
    this.#save();
  }

  setColor(id, color) {
    const tag = this.#list.find(t => t.id === id);
    if (!tag || !COLOR.test(color) || tag.color === color) return;
    tag.color = color;
    this.#save();
  }

  /** Visible: its items show everywhere. Invisible: they are hidden everywhere (found through the tag). */
  setVisible(id, visible) {
    const tag = this.#list.find(t => t.id === id);
    if (!tag || tag.visible === !!visible) return;
    tag.visible = !!visible;
    this.#save();
    this.#apply();
  }

  /** Deletes the tag and takes it off every item (hidden items come back). */
  remove(id) {
    if (!this.#list.some(t => t.id === id)) return;
    this.#list = this.#list.filter(t => t.id !== id);
    fs.dropTag(id);
    this.#save();
    this.#apply();
  }

  #apply() {
    fs.setHiddenTags(this.#list.filter(t => !t.visible).map(t => t.id));
  }

  #save() {
    storage.set(STORAGE_KEY, this.#list);
    this.emit('change');
  }
}

/** Stored data is untrusted: well-formed tags only, unique ids and names. */
function load() {
  const data = storage.get(STORAGE_KEY);
  if (!Array.isArray(data)) return [];
  const ids = new Set(), names = new Set();
  const list = [];
  for (const raw of data.slice(0, MAX_TAGS)) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !ID.test(raw.id) || ids.has(raw.id)) continue;
    const name = cleanName(raw.name);
    if (!name || names.has(name.toLowerCase())) continue;
    ids.add(raw.id);
    names.add(name.toLowerCase());
    list.push({ id: raw.id, name, color: COLOR.test(raw.color ?? '') ? raw.color : TAG_COLORS[0].value, visible: raw.visible !== false });
  }
  return list;
}

export const tags = new Tags();
