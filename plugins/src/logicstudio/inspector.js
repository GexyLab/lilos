import { h, icon, textField, selectField, checkbox, actionButton, messageBox, portsOf, PORT_TYPES, logic } from '@lilos/sdk';
import { docButton, blockDocAddress } from './docs.js';
import { textareaField, colorField } from './fields.js';
import { t, i18n } from './i18n.js';

/**
 * Proprietà: what is selected in the editor shown. For a block: its label, its settings, its
 * inputs (whether they start it, a value at the start) and its ports. The ports a block allows
 * to add (its definition's `grow`) are added, renamed, moved and removed only here; base ports
 * have a lock and never go. The eye beside each port hides it on the drawing or shows it again
 * (not when it is linked); the Exception output starts hidden. For a block in a group, the button
 * beside the eye exposes the port (reached from outside the group). For a group: its name,
 * collapsed or not, its thread, its «Run» and the ports it exposes.
 */
export class Inspector {
  el;
  #studio;

  constructor(studio) {
    this.#studio = studio;
    this.el = h('div', { class: 'ls-insp' });
  }

  render() {
    const studio = this.#studio;
    const tab = studio.current;
    if (studio.collapsed?.right) {
      // folded: a strip with the panel's name written vertically; a click opens it again
      const open = () => studio.setCollapsed('right', false);
      this.el.replaceChildren(
        h('div', { class: 'ls-insp-tabs' }, h('button', { type: 'button', class: 'ls-fold', title: t('side.expand'), 'aria-expanded': 'false', onclick: open }, icon('arrowLeft'))),
        h('div', { class: 'ls-vtabs' }, h('button', { type: 'button', class: 'ls-vtab on', title: t('inspector.title'), onclick: open }, h('span', {}, t('inspector.title')))));
      return;
    }
    const head = h('div', { class: 'ls-insp-tabs' }, h('span', { class: 'on' }, t('inspector.title')), h('i', { class: 'sp' }),
      h('button', { type: 'button', class: 'ls-fold', title: t('side.collapse'), 'aria-expanded': 'true', onclick: () => studio.setCollapsed('right', true) }, icon('arrowRight')));
    let body;
    if (tab?.kind === 'schema') body = this.#schema(tab.view);
    else if (tab?.kind === 'window') body = tab.view.inspector?.() ?? [];
    else if (tab?.kind === 'map') body = tab.view.inspector?.() ?? [];
    else body = [h('p', { class: 'ls-empty' }, t('inspector.nothing'))];
    this.el.replaceChildren(head, h('div', { class: 'ls-insp-body' }, ...[body].flat()));
  }

  // ------------------------------------------------------------------ schema

  #schema(view) {
    const { blocks, links, groups = [] } = view.selection;
    const doc = view.doc;
    if (groups.length === 1 && !blocks.length) return this.#group(view, doc.group(groups[0]));
    if (blocks.length === 1 && !groups.length) return this.#block(view, doc.block(blocks[0]));
    if (blocks.length || groups.length) {
      const free = blocks.filter(id => !doc.groupOf(id)).length;
      return [h('p', { class: 'ls-insp-note' }, groups.length ? t('group.manySel', { blocks: blocks.length, groups: groups.length }) : t('inspector.many', { n: blocks.length })),
        h('div', { class: 'ls-insp-acts col' },
          free && !view.canvas.readOnly ? actionButton({ label: t('group.make'), icon: icon('group'), primary: true, onClick: () => view.canvas.groupSelection() }) : null,
          actionButton({ label: t('menu.removeBlocks', { n: blocks.length + groups.length }), danger: true, icon: 'trash', onClick: () => view.canvas.removeSelection() }))];
    }
    if (links.length) {
      return [h('p', { class: 'ls-insp-note' }, t('inspector.links', { n: links.length })),
        h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('menu.removeLink'), danger: true, icon: icon('trash'), onClick: () => view.canvas.removeSelection() }))];
    }
    // Nothing selected: the schema itself
    const ports = doc.schemaPorts(type => this.#studio.blockDef(type));
    const out = [this.#section(t('inspector.schema'))];
    out.push(this.#row(t('inspector.name'), h('span', { class: 'ls-ro' }, view.name)));
    out.push(this.#row(t('inspector.blocks'), h('span', { class: 'ls-ro' }, String(doc.data.blocks.length))));
    out.push(this.#section(t('inspector.schemaPorts')));
    if (!ports.inputs.length && !ports.outputs.length) out.push(h('p', { class: 'ls-hint' }, t('inspector.noSchemaPorts')));
    for (const p of ports.inputs) out.push(h('div', { class: 'ls-port-line' }, icon('portIn'), h('span', {}, p.name), h('em', {}, t(`type.${p.type}`))));
    for (const p of ports.outputs) out.push(h('div', { class: 'ls-port-line' }, icon('portOut'), h('span', {}, p.name), h('em', {}, t(`type.${p.type}`))));
    out.push(h('p', { class: 'ls-hint' }, t('inspector.schemaHint')));
    return out;
  }

  // ------------------------------------------------------------------ group

  #group(view, g) {
    if (!g) return [];
    const studio = this.#studio;
    const doc = view.doc;
    const ro = view.canvas.readOnly;
    const out = [];
    out.push(h('div', { class: 'ls-insp-h cat-group' }, icon('group'), h('b', {}, g.name), docButton(studio, 'ide/groups')));
    out.push(this.#row(t('inspector.name'), textField({ value: g.name, maxLength: 80, disabled: ro, onChange: v => doc.setGroup(g.id, { name: v }) })));
    out.push(h('div', { class: 'ls-field' }, checkbox({ value: g.collapsed, label: t('group.collapsedField'), disabled: ro, onChange: v => doc.setGroup(g.id, { collapsed: v }) })));
    out.push(h('div', { class: 'ls-field' }, checkbox({ value: g.thread, label: t('group.threadField'), disabled: ro, onChange: v => doc.setGroup(g.id, { thread: v }) })));
    out.push(h('p', { class: 'ls-hint' }, t('group.threadHint')));
    if (g.thread && g.blocks.some(id => ['schemaIn', 'schemaOut', 'component'].includes(studio.blockDef(doc.block(id)?.type)?.role))) out.push(h('p', { class: 'ls-insp-note warn' }, t('group.threadNo')));

    // Run
    out.push(this.#section(t('group.run')));
    const from = doc.data.links.filter(l => l.to[0] === g.id);
    const to = doc.data.links.filter(l => l.from[0] === g.id);
    out.push(h('p', { class: `ls-insp-note${from.length ? '' : ' warn'}` }, from.length ? t('group.runOn', { n: from.length }) : t('group.runOff')));
    out.push(h('p', { class: 'ls-hint' }, t('group.runInside', { n: to.length })));

    // Exposed ports
    out.push(this.#section(t('group.exposed')));
    if (!g.expose.length) out.push(h('p', { class: 'ls-hint' }, t('group.noExposed')));
    else {
      const rows = [];
      g.expose.forEach((e, i) => {
        const b = doc.block(e.block);
        const def = b && studio.blockDef(b.type);
        const comp = def?.role === 'component' ? view.componentOf(b) : null;
        const p = def && portsOf(b, def, { lang: i18n.lang, component: comp, errorLabel: t('port.error') })[e.side === 'in' ? 'inputs' : 'outputs'].find(x => x.name === e.port);
        if (!p) return;
        const where = `${b.label || studio.label(def)} › ${p.label}`;
        rows.push(h('tr', {},
          h('td', { class: 'vis' }, h('span', { title: t(e.side === 'in' ? 'inspector.inputs' : 'inspector.outputs') }, icon(e.side === 'in' ? 'portIn' : 'portOut'))),
          h('td', { class: 'nm' }, h('i', { class: `ls-dotc t-${p.type}` }),
            textField({ value: e.name ?? '', placeholder: p.label, maxLength: 60, className: 'ls-port-name', disabled: ro, onChange: v => doc.renameExposed(g.id, e.block, e.side, e.port, v) })),
          h('td', { class: 'acts' }, h('span', { class: 'ls-port-acts' },
            h('button', { type: 'button', class: 'ls-icon-btn', title: t('inspector.up'), disabled: ro || i === 0, onclick: () => doc.moveExposed(g.id, i, i - 1) }, icon('arrowUp')),
            h('button', { type: 'button', class: 'ls-icon-btn', title: t('inspector.down'), disabled: ro || i === g.expose.length - 1, onclick: () => doc.moveExposed(g.id, i, i + 1) }, icon('arrowDown')),
            h('button', { type: 'button', class: 'ls-link-btn danger', disabled: ro, onclick: () => this.#unexpose(view, g, e, p.label) }, t('inspector.removePort'))))));
        rows.push(h('tr', { class: 'opts' }, h('td', { colspan: 3 }, h('span', { class: 'ls-hint' }, where))));
      });
      out.push(h('table', { class: 'ls-ports' }, ...rows));
    }
    out.push(h('p', { class: 'ls-hint' }, t('group.exposeHint')));

    out.push(this.#section(t('inspector.blocks')));
    out.push(h('p', { class: 'ls-hint' }, t('group.blocks', { n: g.blocks.length })));
    out.push(h('div', { class: 'ls-insp-acts col' },
      actionButton({ label: t('group.ungroup'), icon: icon('group'), disabled: ro, onClick: () => view.canvas.ungroupSelection() }),
      actionButton({ label: t('group.remove'), icon: icon('trash'), danger: true, disabled: ro, onClick: () => view.canvas.removeSelection() })));
    return out;
  }

  /** Stops exposing a port: the links across the group's edge to it go too (asked first). */
  async #unexpose(view, g, e, label) {
    const doc = view.doc;
    const inside = id => g.blocks.includes(id) || id === g.id;
    const crossing = doc.data.links.filter(l => (e.side === 'out' ? l.from[0] === e.block && l.from[1] === e.port && !inside(l.to[0]) : l.to[0] === e.block && l.to[1] === e.port && !inside(l.from[0])));
    if (crossing.length) {
      const res = await messageBox(this.#studio.win, {
        icon: 'warning', title: t('group.unexposeQ', { name: label }), text: t('inspector.removeLinks', { n: crossing.length }),
        buttons: ['cancel', { value: 'ok', label: t('group.unexpose'), danger: true }],
      });
      if (res !== 'ok') return;
    }
    doc.setExposed(g.id, e.block, e.side, e.port, false);
  }

  /** For a port of a block in a group: exposed (reached from outside the group) or not. */
  #exposeButton(view, block, side, p) {
    const g = view.doc.groupOf(block.id);
    if (!g) return null;
    const s = side === 'inputs' ? 'in' : 'out';
    const on = g.expose.some(e => e.block === block.id && e.side === s && e.port === p.name);
    const label = t(on ? 'group.unexpose' : 'group.expose');
    return h('button', {
      type: 'button', class: `ls-icon-btn ls-expose${on ? ' on' : ''}`, title: label, 'aria-label': `${label}: ${p.label}`, 'aria-pressed': on ? 'true' : 'false',
      disabled: view.canvas?.readOnly,
      onclick: () => (on ? this.#unexpose(view, g, { block: block.id, side: s, port: p.name }, p.label) : view.doc.setExposed(g.id, block.id, s, p.name, true)),
    }, icon(side === 'inputs' ? 'portIn' : 'portOut'));
  }

  #block(view, block) {
    if (!block) return [];
    const studio = this.#studio;
    const doc = view.doc;
    const def = studio.blockDef(block.type);
    const out = [];
    if (!def) {
      return [h('p', { class: 'ls-insp-note warn' }, t('block.missingText', { type: block.type })),
        h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('menu.removeBlock'), danger: true, icon: icon('trash'), onClick: () => view.canvas.removeSelection() }))];
    }
    out.push(h('div', { class: `ls-insp-h cat-${def.category}` }, icon(def.icon ?? 'blocks'), h('b', {}, studio.label(def)),
      docButton(studio, blockDocAddress(studio, block, b => view.componentOf(b)))));
    if (def.description) out.push(h('p', { class: 'ls-hint' }, studio.label({ label: def.description })));
    // an obsolete block still runs, but the palette no longer offers it: say what replaces it
    if (def.obsolete) out.push(h('p', { class: 'ls-insp-note warn' }, [t('block.obsolete'), studio.label({ label: def.obsolete })].filter(Boolean).join(' ')));
    if (!def.role) out.push(this.#row(t('inspector.label'), textField({ value: block.label ?? '', placeholder: studio.label(def), maxLength: 80, onChange: v => doc.setLabel(block.id, v.trim()) })));
    const home = doc.groupOf(block.id);
    if (home) {
      out.push(h('div', { class: 'ls-port-line' }, icon('group'), h('span', {}, t('group.inGroup', { name: home.name })),
        h('button', { type: 'button', class: 'ls-link-btn', onclick: () => view.canvas.select([], [], { groups: [home.id] }) }, t('group.show'))));
    }

    // Settings
    if (def.role === 'component') out.push(...this.#componentObject(view, block));
    const config = (def.config ?? []).filter(c => !(def.role === 'component'));
    if (config.length) {
      out.push(this.#section(t('inspector.settings')));
      for (const c of config) {
        if (c.when && !Object.entries(c.when).every(([k, want]) => (Array.isArray(want) ? want.includes(block.config[k]) : block.config[k] === want))) continue;
        if (c.type === 'checkbox') out.push(h('div', { class: 'ls-field' }, checkbox({ value: !!block.config[c.key], label: studio.label(c), onChange: v => view.doc.setConfig(block.id, c.key, v) })));
        else out.push(this.#row(studio.label(c), this.#control(view, block, def, c)));
      }
      if (def.role === 'schemaIn' || def.role === 'schemaOut') out.push(...this.#schemaPortLinks(view, block, def));
    }

    // Ports (a drawing, Testo or Forma, has none)
    if (def.role === 'drawing') {
      out.push(h('p', { class: 'ls-hint' }, t('inspector.drawingHint')));
      out.push(this.#section(t('inspector.block')));
      out.push(h('p', { class: 'ls-hint mono' }, `${def.type} v${def.version}`));
      return out;
    }
    const comp = def.role === 'component' ? view.canvas && this.#componentOf(view, block) : null;
    const ports = portsOf(block, def, { lang: i18n.lang, component: comp, errorLabel: t('port.error') });
    out.push(this.#section(t('inspector.ports')));
    out.push(this.#portTable(view, block, def, ports, comp));
    if (def.grow && !comp) {
      const acts = [];
      for (const side of ['inputs', 'outputs']) {
        const g = def.grow[side];
        if (!g) continue;
        const have = block.added?.[side]?.length ?? 0;
        const max = Math.min(g.max, studio.limits?.maxAddedPorts ?? 32);
        acts.push(actionButton({
          label: t(side === 'inputs' ? 'inspector.addInput' : 'inspector.addOutput'), icon: icon('plus'), primary: true,
          onClick: () => { try { doc.addPort(block.id, def, side, { limit: max, lang: i18n.lang }); } catch (err) { messageBox(studio.win, { icon: 'warning', title: err.message }); } },
        }));
        if (have >= max) acts.at(-1).disabled = true;
        acts.push(h('span', { class: 'ls-hint' }, t('inspector.addedCount', { n: have, max })));
      }
      out.push(h('div', { class: 'ls-insp-acts col' }, ...acts));
    }
    out.push(this.#section(t('inspector.block')));
    const pack = (studio.catalog?.packages ?? []).find(p => p.blocks.some(b => b.type === def.type));
    out.push(h('p', { class: 'ls-hint mono' }, `${def.type} v${def.version}${pack ? ` · ${pack.name} ${pack.version}` : ''}`));
    return out;
  }

  /** The table of ports: base ones with a lock; added ones with ↑ ↓, a name to change (when it matters) and Togli. */
  #portTable(view, block, def, ports, comp) {
    const doc = view.doc;
    const rows = [];
    for (const side of ['inputs', 'outputs']) {
      const list = ports[side];
      if (!list.length) continue;
      rows.push(h('tr', { class: 'side' }, h('th', { colspan: 4 }, t(side === 'inputs' ? 'inspector.inputs' : 'inspector.outputs'))));
      const added = list.filter(p => p.added);
      for (const p of list) {
        const name = p.added && def.grow?.[side]?.name === 'user' && !comp
          ? textField({ value: p.label, maxLength: 60, className: 'ls-port-name', onChange: v => doc.renamePort(block.id, side, p.name, v) })
          : h('span', { class: p.added ? 'added' : '' }, p.label);
        let tail;
        if (!p.added) tail = h('span', { class: 'ls-lock', title: t('inspector.basePort') }, icon('lock'));
        else if (comp) tail = h('span', { class: 'ls-hint' }, t('inspector.ofComponent'));
        else {
          const i = added.indexOf(p);
          tail = h('span', { class: 'ls-port-acts' },
            h('button', { type: 'button', class: 'ls-icon-btn', title: t('inspector.up'), disabled: i === 0, onclick: () => doc.movePort(block.id, side, i, i - 1) }, icon('arrowUp')),
            h('button', { type: 'button', class: 'ls-icon-btn', title: t('inspector.down'), disabled: i === added.length - 1, onclick: () => doc.movePort(block.id, side, i, i + 1) }, icon('arrowDown')),
            h('button', { type: 'button', class: 'ls-link-btn danger', onclick: () => this.#removePort(view, block, side, p) }, t('inspector.removePort')));
        }
        rows.push(h('tr', { class: `${p.error ? 'err' : ''}${p.hidden && !this.#linked(doc, block, side, p) ? ' hid' : ''}` },
          h('td', { class: `vis${doc.groupOf(block.id) ? ' two' : ''}` }, this.#eye(view, block, side, p), this.#exposeButton(view, block, side, p)),
          h('td', { class: 'nm' }, h('i', { class: `ls-dotc t-${p.type}` }), name),
          h('td', { class: 'ty' }, t(`type.${p.type}`)),
          h('td', { class: 'acts' }, tail)));
        if (side === 'inputs' && !p.error && !comp) rows.push(h('tr', { class: 'opts' }, h('td', { colspan: 4 }, this.#inputOptions(doc, block, p))));
      }
    }
    return h('table', { class: 'ls-ports' }, ...rows);
  }

  #linked(doc, block, side, p) { return doc.linksOf(block.id, p.name, side).length > 0; }

  /** The eye of a port: hides it on the drawing or shows it again; a linked port is always shown. */
  #eye(view, block, side, p) {
    const linked = this.#linked(view.doc, block, side, p);
    const hidden = p.hidden && !linked;
    const key = `${side}:${p.name}`;
    return h('button', {
      type: 'button', class: `ls-icon-btn ls-eye${hidden ? ' off' : ''}`,
      title: linked ? t('inspector.linkedPort') : t(hidden ? 'inspector.showPort' : 'inspector.hidePort'),
      'aria-label': `${linked ? t('inspector.linkedPort') : t(hidden ? 'inspector.showPort' : 'inspector.hidePort')}: ${p.label}`,
      // not `disabled` when linked: its tooltip says why
      'aria-disabled': linked ? 'true' : null,
      disabled: view.canvas?.readOnly,
      dataset: { eye: key },
      onclick: () => {
        if (linked) return;
        view.doc.setPortHidden(block.id, side, p.name, !hidden, p.hiddenByDefault);
        // the sidebar was drawn again: the keyboard stays on this eye
        [...this.el.querySelectorAll('[data-eye]')].find(b => b.dataset.eye === key)?.focus();
      },
    }, icon(hidden ? 'eyeOff' : 'eye'));
  }

  /** «Lo avvia» and the value at the start of an input. */
  #inputOptions(doc, block, p) {
    const opt = block.ports?.[p.name] ?? {};
    return h('span', { class: 'ls-in-opts' },
      checkbox({ value: opt.trigger !== false, label: t('inspector.starts'), onChange: on => doc.setPort(block.id, p.name, { trigger: on }) }),
      p.type !== 'pulse' ? textField({ value: opt.start === undefined ? '' : JSON.stringify(opt.start), placeholder: t('inspector.startValue'), className: 'ls-start', mono: true,
        onChange: v => { let value = v.trim(); if (value === '') value = null; else { try { value = JSON.parse(value); } catch { /* a word: text */ } } doc.setPort(block.id, p.name, { start: value }); } }) : null);
  }

  async #removePort(view, block, side, p) {
    const doc = view.doc;
    const links = doc.linksOf(block.id, p.name, side);
    if (links.length) {
      const res = await messageBox(this.#studio.win, {
        icon: 'warning', title: t('inspector.removeQ', { name: p.label }), text: t('inspector.removeLinks', { n: links.length }),
        buttons: ['cancel', { value: 'ok', label: t('inspector.removePort'), danger: true }],
      });
      if (res !== 'ok') return;
    }
    doc.removePort(block.id, side, p.name);
  }

  #control(view, block, def, c) {
    const doc = view.doc;
    const studio = this.#studio;
    const value = block.config[c.key];
    const set = v => {
      // A schema port renamed: the project's links follow it
      if ((def.role === 'schemaIn' || def.role === 'schemaOut') && c.key === 'port' && studio.ws?.project) {
        studio.ws.project.renamePortRef(view.name, String(value ?? ''), String(v));
      }
      doc.setConfig(block.id, c.key, v);
    };
    switch (c.type) {
      case 'checkbox': return checkbox({ value: !!value, onChange: set });
      case 'select': return selectField({ value, options: (c.options ?? []).map(o => (typeof o === 'object' ? { value: o.value, label: studio.label(o) } : { value: o, label: optionLabel(c.key, o) })), onChange: set });
      case 'number': return textField({ type: 'number', value: value ?? '', min: c.min, max: c.max, step: c.step ?? 'any', onChange: v => set(v === '' ? null : Number(v)) });
      case 'console': return selectField({ value: value ?? 'main', options: this.#consoles().map(x => ({ value: x.id, label: x.name })), onChange: set });
      case 'secret': return this.#secretControl(value, set);
      // a long text on several lines in a fixed-width font (an SQL query, a filter…)
      case 'code': return textareaField({ value: value ?? '', onChange: set, rows: 6, maxLength: c.maxLength ?? 20000, mono: true, className: 'ls-code', label: studio.label(c) });
      case 'json': return textField({ value: value === undefined ? '' : JSON.stringify(value), mono: true, onChange: v => { try { set(JSON.parse(v)); } catch { set(v); } } });
      case 'textarea': return textareaField({ value: value ?? '', onChange: set });
      case 'color': return colorField({ value: value ?? '', onChange: set });
      default: return textField({ value: value ?? '', maxLength: 2000, onChange: set });
    }
  }

  /**
   * A secret setting (type 'secret', a password): never shown; what is typed is sealed by the
   * engine for this user (logic.seal) and only the sealed text goes in the schema.
   */
  #secretControl(value, set) {
    const saved = typeof value === 'string' && value !== '';
    const status = h('div', { class: 'ls-secret-status' }, saved ? t('inspector.secretSaved') : t('inspector.secretEmpty'));
    const field = textField({
      type: 'password', value: '', placeholder: saved ? '••••••••' : '',
      onChange: async v => {
        if (v === '') return;
        try { set(await logic.seal(v)); } catch (err) { status.textContent = t('inspector.secretFailed', { message: err?.message ?? String(err) }); }
      },
    });
    const clear = saved ? actionButton({ label: t('inspector.secretClear'), onClick: () => set('') }) : null;
    return h('div', { class: 'ls-secret' }, field, status, clear);
  }

  /** The consoles of the project (or of the schema alone). */
  #consoles() {
    const ws = this.#studio.ws;
    const list = ws?.project?.data.consoles.list ?? this.#studio.current?.doc?.data.consoles?.list ?? [{ id: 'main', name: t('console.main') }];
    return list.map(c => ({ id: c.id, name: c.id === 'main' ? `${c.name || t('console.main')} ★` : c.name }));
  }

  /** An Ingresso / Uscita di schema: where it goes in the project. */
  #schemaPortLinks(view, block, def) {
    const project = this.#studio.ws?.project;
    if (!project) return [h('p', { class: 'ls-hint' }, t('inspector.aloneHint'))];
    const ref = `${view.name}:${block.config.port}`;
    const mine = project.data.links.filter(l => (def.role === 'schemaOut' ? l.from === ref : l.to === ref));
    const out = [this.#section(t('inspector.projectLinks'))];
    if (!mine.length) out.push(h('p', { class: 'ls-hint' }, t('inspector.noProjectLinks')));
    for (const l of mine) {
      const other = def.role === 'schemaOut' ? l.to : l.from;
      out.push(h('div', { class: 'ls-port-line' }, icon(def.role === 'schemaOut' ? 'arrowRight' : 'arrowLeft'), h('span', {}, other.replace(':', ' › ')),
        h('button', { type: 'button', class: 'ls-link-btn danger', onclick: () => project.unlink(l.from, l.to) }, t('inspector.unlink'))));
    }
    out.push(h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('inspector.inMap'), icon: icon('grid'), onClick: () => this.#studio.openMap() })));
    return out;
  }

  /** The object of a Componente UI: which window and which component it stands for. */
  #componentObject(view, block) {
    const ws = this.#studio.ws;
    const out = [this.#section(t('inspector.component'))];
    if (!ws?.project) return [...out, h('p', { class: 'ls-hint' }, t('inspector.componentAlone'))];
    const windows = Object.keys(ws.project.data.windows);
    out.push(this.#row(t('inspector.window'), selectField({ value: block.config.window, options: windows, onChange: v => { view.doc.setConfig(block.id, 'window', v); view.doc.setConfig(block.id, 'component', ''); } })));
    const win = ws.loaded(ws.project.data.windows[block.config.window] ?? '');
    const comps = win ? win.components(type => this.#studio.componentDef(type)).map(n => ({ value: n.id, label: `${n.props?.label || n.props?.text || n.id} · ${this.#studio.label(this.#studio.componentDef(n.type)) || n.type}` })) : [];
    out.push(this.#row(t('inspector.componentName'), selectField({ value: block.config.component, options: [{ value: '', label: '—' }, ...comps], onChange: v => view.doc.setConfig(block.id, 'component', v) })));
    return out;
  }

  #componentOf(view, block) {
    const ws = this.#studio.ws;
    const path = ws?.project?.data.windows[block.config.window];
    const node = path ? ws.loaded(path)?.find(block.config.component)?.node : null;
    return node ? { def: this.#studio.componentDef(node.type), added: node.added ?? { inputs: [], outputs: [] } } : null;
  }

  #section(text) { return h('h5', { class: 'ls-sec' }, text); }
  #row(label, control) { return h('label', { class: 'ls-field' }, h('span', {}, label), control); }
}

/** An option of a select of a block, in words when the IDE knows it ('gt' → «a > b»). */
function optionLabel(key, value) {
  const k = `opt.${key}.${value}`;
  const s = t(k);
  return s === k ? String(value) : s;
}

export { PORT_TYPES };
