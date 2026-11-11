import { Window, h, icon, logic, markdown } from '@lilos/sdk';
import { t, i18n } from './i18n.js';

/**
 * The documentation, in a window of its own (one per IDE): the IDE's guide (docs/<lang>/*.md of
 * this app, pages ide/<page>) and the pages of every package (their docs/ folders, served by the
 * engine). A page is reached by an address:
 *
 *   ide/<page>        a page of the IDE's guide          core.add       the page of a block or component type
 *   <pack>            a package's first page (index)      <pack>/<page>  another page of a package
 *
 * The same addresses are the links inside the pages ([Somma](core.add)). Opened from the context
 * menus («Documentazione»), F1, the «?» of Proprietà and the toolbar.
 */
const IDE_ORDER = ['index', 'projects', 'schemas', 'blocks', 'links', 'groups', 'windows', 'components', 'consoles', 'run', 'create-app', 'formats', 'shortcuts', 'docs'];
const PACK_ORDER = ['logicstudio-core', 'logicstudio-collections', 'logicstudio-constants', 'logicstudio-units', 'logicstudio-signals', 'logicstudio-solid', 'logicstudio-trig', 'logicstudio-functions', 'logicstudio-integrals', 'logicstudio-lilos', 'logicstudio-net', 'logicstudio-db', 'logicstudio-mongodb', 'logicstudio-redis', 'logicstudio-influxdb', 'logicstudio-elasticsearch', 'logicstudio-ui', 'logicstudio-charts', 'logicstudio-engine'];
const TYPE = /^[a-z][a-z0-9]*\.[a-zA-Z][a-zA-Z0-9]{0,40}$/;
const PAGE = /^[a-z][a-z0-9-]{0,40}$/;
const PACK = /^[a-z][a-z0-9-]{0,40}$/;

// The IDE's guide: one lazy chunk per page, loaded (in the user's language) when the window opens
const IDE = import.meta.glob('./docs/*/*.md', { query: '?raw', import: 'default' });
const ideCache = new Map();   // page → text
let ideLoading = null;

/** Loads every page of the guide, in the user's language or else English, else Italian. */
function loadIde() {
  ideLoading ??= Promise.all(IDE_ORDER.map(async page => {
    for (const l of [i18n.lang, 'en', 'it']) {
      const load = IDE[`./docs/${l}/${page}.md`];
      if (!load) continue;
      try { ideCache.set(page, await load()); return; } catch { /* the next language */ }
    }
  })).catch(() => { ideLoading = null; });
  return ideLoading;
}
const ideText = page => ideCache.get(page) ?? null;
const titleOf = text => /^#\s+(.+)$/m.exec(text ?? '')?.[1]?.trim() ?? null;

export class DocsViewer {
  win;
  #studio;
  #nav; #content; #search; #back; #forward;
  #index = null;          // [{ pack, label, pages: [{ page, title }] }] from the engine
  #history = [];
  #at = -1;
  #query = '';
  #current = null;        // { pack, page }

  constructor(studio) {
    this.#studio = studio;
    this.win = new Window({ title: t('docs.title'), icon: 'help', width: 980, height: 680, minWidth: 560, minHeight: 360 });
    this.#back = h('button', { type: 'button', class: 'ls-doc-nav', title: t('docs.back'), 'aria-label': t('docs.back'), onclick: () => this.#move(-1) }, icon('arrowLeft'));
    this.#forward = h('button', { type: 'button', class: 'ls-doc-nav', title: t('docs.forward'), 'aria-label': t('docs.forward'), onclick: () => this.#move(1) }, icon('arrowRight'));
    const home = h('button', { type: 'button', class: 'ls-doc-nav', title: t('docs.home'), 'aria-label': t('docs.home'), onclick: () => this.go('ide/index') }, icon('home'));
    this.#search = h('input', { type: 'search', class: 'ls-search', placeholder: t('docs.search'), 'aria-label': t('docs.search') });
    this.#search.addEventListener('input', () => { this.#query = this.#search.value.trim().toLowerCase(); this.#renderNav(); });
    this.#search.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const first = this.#nav.querySelector('button.ls-doc-it'); first?.click(); }
    });
    this.#nav = h('nav', { class: 'ls-doc-tree', 'aria-label': t('docs.contents') });
    this.#content = h('article', { class: 'ls-doc-page lilos-md', tabIndex: 0 });
    this.win.body.append(h('div', { class: 'ls ls-doc' },
      h('div', { class: 'ls-doc-side' }, h('div', { class: 'ls-doc-bar' }, this.#back, this.#forward, home), this.#search, this.#nav),
      h('div', { class: 'ls-doc-main' }, this.#content)));
    this.win.el.addEventListener('keydown', e => {
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); this.#move(-1); }
      else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); this.#move(1); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); this.#search.focus(); this.#search.select(); }
    });
    this.#loadIndex();
  }

  get closed() { return !this.win.el.isConnected; }

  /** Shows the page of an address (see above); a link that leads nowhere shows a notice. */
  go(address, { push = true } = {}) {
    const target = this.#resolve(address);
    if (push) {
      this.#history.splice(this.#at + 1);
      this.#history.push(address);
      this.#at = this.#history.length - 1;
    }
    this.#show(target, address);
  }

  async #loadIndex() {
    await loadIde();
    try {
      this.#index = await logic.docIndex(i18n.lang);
    } catch {
      this.#index = [];
    }
    this.#renderNav();
  }

  /** An address → { pack, page } ('ide' for the IDE's guide), or null. */
  #resolve(address) {
    const a = String(address ?? '').trim();
    if (a.startsWith('ide/')) return PAGE.test(a.slice(4)) ? { pack: 'ide', page: a.slice(4) } : null;
    if (TYPE.test(a)) {
      const pack = (this.#studio.catalog?.packages ?? []).find(p => p.blocks.some(b => b.type === a) || p.components.some(c => c.type === a));
      return pack ? { pack: pack.name, page: a } : { pack: null, page: a };
    }
    const [pack, page = 'index', more] = a.split('/');
    if (more !== undefined || !PACK.test(pack) || !(page === 'index' || PAGE.test(page) || TYPE.test(page))) return null;
    return { pack, page };
  }

  /** Whether a link inside a page leads somewhere: the markdown() link option. */
  #link = href => (this.#resolve(href) ? () => this.go(href) : null);

  async #show(target, address) {
    this.#current = target;
    this.#back.disabled = this.#at <= 0;
    this.#forward.disabled = this.#at >= this.#history.length - 1;
    this.#renderNav();
    let text = null;
    if (target?.pack === 'ide') { await loadIde(); if (this.#current !== target) return; text = ideText(target.page); }
    else if (target?.pack) {
      this.#content.replaceChildren(h('p', { class: 'ls-hint' }, t('docs.loading')));
      try {
        text = (await logic.doc(target.pack, target.page, i18n.lang))?.markdown ?? null;
      } catch (err) {
        if (this.#current !== target) return;
        this.#content.replaceChildren(h('h1', {}, t('docs.title')), h('p', {}, t('docs.failed', { error: err.message })));
        return;
      }
    }
    if (this.#current !== target) return;   // another page was asked meanwhile
    if (!text) {
      this.#content.replaceChildren(...this.#missing(target, address));
    } else {
      this.#content.replaceChildren(...markdown(text, { link: this.#link }));
    }
    this.#content.parentElement.scrollTop = 0;
    this.win.setTitle(t('docs.title'), titleOf(text) ?? address);
    this.#nav.querySelector('.on')?.scrollIntoView?.({ block: 'nearest' });
  }

  #missing(target, address) {
    const out = [h('h1', {}, t('docs.missingTitle'))];
    const def = target?.page && (this.#studio.blockDef(target.page) ?? this.#studio.componentDef(target.page));
    if (def) {
      out.push(h('p', {}, t('docs.missingType', { name: this.#studio.label(def), type: def.type })));
      if (def.description) out.push(h('p', {}, this.#studio.label({ label: def.description })));
    } else {
      out.push(h('p', {}, t('docs.missing', { address })));
    }
    if (target?.pack && target.pack !== 'ide' && target.page !== 'index') {
      out.push(h('p', {}, h('a', { href: '#', onclick: e => { e.preventDefault(); this.go(target.pack); } }, t('docs.packIndex'))));
    }
    return out;
  }

  #move(step) {
    const at = this.#at + step;
    if (at < 0 || at >= this.#history.length) return;
    this.#at = at;
    this.go(this.#history[at], { push: false });
  }

  // ------------------------------------------------------------------ the contents, on the left

  #renderNav() {
    const q = this.#query;
    const match = (...words) => !q || words.some(w => String(w ?? '').toLowerCase().includes(q));
    const groups = [];

    const idePages = IDE_ORDER.filter(p => ideText(p)).map(p => ({ address: `ide/${p}`, title: titleOf(ideText(p)) ?? p, pack: 'ide', page: p }));
    groups.push({ label: t('docs.ide'), items: idePages.filter(p => match(p.title, p.page)) });

    const packs = [...(this.#index ?? [])].sort((a, b) => rank(a.pack) - rank(b.pack) || a.pack.localeCompare(b.pack));
    for (const p of packs) {
      const items = [];
      const index = p.pages.find(x => x.page === 'index');
      if (index) items.push({ address: p.pack, title: t('docs.overview'), pack: p.pack, page: 'index', strong: true });
      const others = p.pages.filter(x => x.page !== 'index' && !TYPE.test(x.page)).sort((a, b) => a.title.localeCompare(b.title));
      for (const x of others) items.push({ address: `${p.pack}/${x.page}`, title: x.title, pack: p.pack, page: x.page });
      // Blocks and components by category, as in the palette
      const typed = p.pages.filter(x => TYPE.test(x.page)).map(x => ({ ...x, def: this.#studio.blockDef(x.page) ?? this.#studio.componentDef(x.page) }));
      const byCat = new Map();
      for (const x of typed) {
        const cat = x.def?.category ?? 'other';
        (byCat.get(cat) ?? byCat.set(cat, []).get(cat)).push(x);
      }
      for (const [cat, list] of byCat) {
        const kind = list[0].def && this.#studio.componentDef(list[0].page) ? 'components' : 'blocks';
        items.push({ heading: t(`cat.${kind}.${cat}`) ?? cat });
        for (const x of list.sort((a, b) => a.title.localeCompare(b.title))) items.push({ address: x.page, title: x.title, pack: p.pack, page: x.page, type: x.page });
      }
      // a category stays when something under it is found
      const shown = [];
      let heading = null;
      for (const it of items) {
        if (it.heading) { heading = it; continue; }
        if (!match(it.title, it.type, p.pack)) continue;
        if (heading) { shown.push(heading); heading = null; }
        shown.push(it);
      }
      groups.push({ label: this.#studio.label(p) || p.pack, items: shown });
    }

    const cur = this.#current;
    const rows = [];
    for (const g of groups) {
      if (!g.items.some(it => !it.heading)) continue;
      rows.push(h('div', { class: 'ls-doc-group' }, g.label));
      for (const it of g.items) {
        if (it.heading) { rows.push(h('div', { class: 'ls-doc-cat' }, it.heading)); continue; }
        const on = cur && cur.pack === it.pack && cur.page === it.page;
        rows.push(h('button', {
          type: 'button', class: `ls-doc-it${on ? ' on' : ''}${it.strong ? ' strong' : ''}`, title: it.type ?? '',
          'aria-current': on ? 'page' : null,
          onclick: () => this.go(it.address),
        }, it.title));
      }
    }
    if (this.#index === null) rows.push(h('p', { class: 'ls-hint' }, t('docs.loading')));
    else if (!rows.length) rows.push(h('p', { class: 'ls-hint' }, t('docs.noResults')));
    this.#nav.replaceChildren(...rows);
  }
}

const rank = pack => { const i = PACK_ORDER.indexOf(pack); return i < 0 ? PACK_ORDER.length : i; };

/** The documentation's window of this IDE, opened (or brought forward) on a page. */
export function showDoc(studio, address = 'ide/index') {
  let viewer = studio.docsViewer;
  if (!viewer || viewer.closed) {
    viewer = studio.docsViewer = new DocsViewer(studio);
    viewer.win.on('destroy', () => { if (studio.docsViewer === viewer) studio.docsViewer = null; });
  }
  viewer.go(address);
  studio.openWindow(viewer.win, 'docs');
  return viewer;
}

/** The address of the page about a block of a schema (the component's page for its object). */
export function blockDocAddress(studio, block, componentOf) {
  const def = studio.blockDef(block?.type);
  if (def?.role === 'component') {
    const comp = componentOf?.(block);
    return comp?.def?.type ?? block.type;
  }
  return block?.type ?? 'ide/blocks';
}

/** The «?» of Proprietà: the page of what is shown there. */
export function docButton(studio, address) {
  return h('button', {
    type: 'button', class: 'ls-doc-q', title: `${t('menu.docs')} (F1)`, 'aria-label': t('menu.docs'),
    onclick: () => studio.showDoc(address),
  }, icon('help'));
}
