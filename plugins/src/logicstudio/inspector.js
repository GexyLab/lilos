import { h, icon, textField, selectField, checkbox, actionButton, messageBox, portsOf, PORT_TYPES } from '@lilos/sdk';
import { docButton, blockDocAddress } from './docs.js';
import { t, i18n } from './i18n.js';

/**
 * Proprietà: what is selected in the editor shown. For a block: its label, its settings, its
 * inputs (whether they start it, a value at the start) and its ports. The ports a block allows
 * to add (its definition's `grow`) are added, renamed, moved and removed only here; base ports
 * have a lock and never go. The eye beside each port hides it on the drawing or shows it again
 * (not when it is linked); the Eccezione output starts hidden.
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
    const head = h('div', { class: 'ls-insp-tabs' }, h('span', { class: 'on' }, t('inspector.title')));
    let body;
    if (tab?.kind === 'schema') body = this.#schema(tab.view);
    else if (tab?.kind === 'window') body = tab.view.inspector?.() ?? [];
    else if (tab?.kind === 'map') body = tab.view.inspector?.() ?? [];
    else body = [h('p', { class: 'ls-empty' }, t('inspector.nothing'))];
    this.el.replaceChildren(head, h('div', { class: 'ls-insp-body' }, ...[body].flat()));
  }

  // ------------------------------------------------------------------ schema

  #schema(view) {
    const { blocks, links } = view.selection;
    const doc = view.doc;
    if (blocks.length === 1) return this.#block(view, doc.block(blocks[0]));
    if (blocks.length > 1) {
      return [h('p', { class: 'ls-insp-note' }, t('inspector.many', { n: blocks.length })),
        h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('menu.removeBlocks', { n: blocks.length }), danger: true, icon: 'trash', onClick: () => view.canvas.removeSelection() }))];
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
    if (!def.role) out.push(this.#row(t('inspector.label'), textField({ value: block.label ?? '', placeholder: studio.label(def), maxLength: 80, onChange: v => doc.setLabel(block.id, v.trim()) })));

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

    // Ports
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
          h('td', { class: 'vis' }, this.#eye(view, block, side, p)),
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
        view.doc.setPortHidden(block.id, side, p.name, !hidden);
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
      case 'json': return textField({ value: value === undefined ? '' : JSON.stringify(value), mono: true, onChange: v => { try { set(JSON.parse(v)); } catch { set(v); } } });
      default: return textField({ value: value ?? '', maxLength: 2000, onChange: set });
    }
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
