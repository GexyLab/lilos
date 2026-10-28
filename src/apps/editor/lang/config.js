import { Emitter, storage } from '@lilos/sdk';

/**
 * Editor language settings, persisted under 'lilos:editor-lang' and validated on read:
 *   engines:  { langId: 'treesitter' | 'textmate' | 'simple' }   highlighting engine per language
 *   builtin:  { json, css, html }: boolean                        language servers running in the browser
 *   external: [{ lang, url }]                                      language servers over WebSocket
 *   schemas:  { fileId: { type: 'file', id } | { type: 'url', url } }   JSON schema per file
 *   grammars: [fileId]                                              TextMate grammars added by the user
 *
 * Events: 'change' (section name)
 */
const KEY = 'editor-lang';
const ENGINES = new Set(['treesitter', 'textmate', 'simple']);
const ID = /^[\w.:-]{1,80}$/;

export const isSchemaUrl = url => {
  try { return ['https:', 'http:'].includes(new URL(url).protocol); } catch { return false; }
};

function sanitize(raw) {
  const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const engines = {};
  for (const [lang, e] of Object.entries(v.engines ?? {})) if (ID.test(lang) && ENGINES.has(e)) engines[lang] = e;
  const builtin = { json: true, css: true, html: true };
  for (const k of Object.keys(builtin)) if (typeof v.builtin?.[k] === 'boolean') builtin[k] = v.builtin[k];
  const external = (Array.isArray(v.external) ? v.external : [])
    .filter(s => s && ID.test(s.lang) && typeof s.url === 'string' && /^wss?:\/\//.test(s.url))
    .map(s => ({ lang: s.lang, url: s.url }));
  const schemas = {};
  for (const [fileId, s] of Object.entries(v.schemas ?? {})) {
    if (!ID.test(fileId) || !s) continue;
    if (s.type === 'file' && ID.test(s.id)) schemas[fileId] = { type: 'file', id: s.id };
    else if (s.type === 'url' && isSchemaUrl(s.url)) schemas[fileId] = { type: 'url', url: s.url };
  }
  const grammars = [...new Set((Array.isArray(v.grammars) ? v.grammars : []).filter(id => typeof id === 'string' && ID.test(id)))];
  return { engines, builtin, external, schemas, grammars };
}

class EditorConfig extends Emitter {
  #data = sanitize(storage.get(KEY));

  get(section) {
    return structuredClone(this.#data[section]);
  }

  set(section, value) {
    this.#data = sanitize({ ...this.#data, [section]: value });
    storage.set(KEY, this.#data);
    this.emit('change', section);
  }

  /** Change one entry of an object section (engines, builtin, schemas); undefined removes it. */
  setEntry(section, key, value) {
    const obj = this.get(section);
    if (value === undefined) delete obj[key];
    else obj[key] = value;
    this.set(section, obj);
  }
}

export const editorConfig = new EditorConfig();
