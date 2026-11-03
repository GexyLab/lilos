import * as sdk from '@lilos/sdk';   // `term`: missing in older lilOS, so not imported by name
import { DESK_NAME, pickFile } from '@lilos/system';
import { fieldsForm, shown, withDefaults } from '../shared/fieldsForm.js';
import { badge } from './remote/RemoteTab.js';
import { fieldRow } from './remote/dialogs.js';
import { options } from './options.js';
import { t } from './i18n.js';

const { h, fs, storage } = sdk;

/** Path shown for a folder: '~' for the home (and a folder that went), '~/Documenti/Note' inside it. */
const tildePath = id => fs.tildePath(id) ?? '~';

/**
 * .term files: links to a terminal, opened by Terminal (contributes.fileTypes) with a double click.
 * JSON, readable and editable with the Editor:
 *
 *   { type: 'lilos.term', version: 1, name, protocol,          'local' or a remote protocol (ssh…)
 *     values?, settings?,       remote: as for term.open (never the secret fields)
 *     sealed?,                  remote: the password, if the user chose to keep it; encrypted by
 *                               lilOS for that user on that lilOS (term.seal): useless to others
 *     cwd?,                     local: a folder of lilOS ('~/Documenti'); remote: of the server ('/var/www')
 *     command?,                 local: a command line run after the start (remote: values.command, SSH)
 *     open? }                   'tab' | 'window'; none: as the Options of Terminal say
 *
 * A file that runs a command asks first, unless Terminal saved it on this account or the user
 * already said yes to that same content (TRUSTED: hashes of the contents).
 */
export const TYPE = 'lilos.term';
const TRUSTED = 'terminal.trusted';
const TRUSTED_MAX = 300;
const PROTOCOL = /^[a-z][a-z0-9-]{0,30}$/;
const TEXT_MAX = 256 << 10;

const str = (v, max) => (typeof v === 'string' && v.length <= max && !/[\0]/.test(v) ? v : undefined);

/** The link in a file's text, checked; throws if it is not one. */
export function parseTerm(text) {
  let raw;
  try { raw = JSON.parse(String(text).slice(0, TEXT_MAX)); } catch { raw = null; }
  if (!raw || typeof raw !== 'object' || raw.type !== TYPE || raw.version !== 1 || !PROTOCOL.test(raw.protocol ?? '')) throw new Error(t('file.invalid'));
  const term = { type: TYPE, version: 1, protocol: raw.protocol, name: str(raw.name, 60) ?? '' };
  if (raw.protocol !== 'local') {
    const values = {};
    for (const [k, v] of Object.entries(raw.values && typeof raw.values === 'object' ? raw.values : {})) {
      if (/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(k) && (['number', 'boolean'].includes(typeof v) || str(v, 4096) !== undefined)) values[k] = v;
    }
    term.values = values;
    if (raw.settings && typeof raw.settings === 'object') {
      term.settings = Object.fromEntries(Object.entries(raw.settings).filter(([k, v]) => ['term', 'encoding', 'backspace'].includes(k) && str(v, 40) !== undefined));
    }
    if (str(raw.sealed, 64 << 10)) term.sealed = raw.sealed;
  }
  if (str(raw.cwd, 4096)) term.cwd = raw.cwd;
  if (str(raw.command, 4096)?.trim()) term.command = raw.command;
  if (raw.open === 'tab' || raw.open === 'window') term.open = raw.open;
  return term;
}

export const termText = term => `${JSON.stringify(term, null, 2)}\n`;

async function hash(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const trustedList = () => { const list = storage.get(TRUSTED, []); return Array.isArray(list) ? list.filter(x => typeof x === 'string') : []; };
async function isTrusted(text) { return trustedList().includes(await hash(text)); }
async function trust(text) {
  const key = await hash(text);
  storage.set(TRUSTED, [...trustedList().filter(x => x !== key), key].slice(-TRUSTED_MAX));
}

/** 'ssh://deploy@web-01:22', or the folder of a shell. */
export function termAddress(term) {
  if (term.protocol === 'local') return term.cwd || '~';
  const v = term.values ?? {};
  return `${term.protocol}://${v.user ? `${v.user}@` : ''}${v.host ?? ''}${v.port ? `:${v.port}` : ''}`;
}

/**
 * Opens a .term file of lilOS in owner (a TerminalWindow), or in a new window if it (or the
 * Options) say so; fresh: owner was opened for this file, so it is used anyway.
 */
export async function openTermFile(owner, id, { fresh = false } = {}) {
  const node = fs.get(id);
  if (node?.type !== 'file') throw new Error(t('file.missing'));
  const text = await fs.read(id);
  const term = parseTerm(text);
  const command = term.protocol === 'local' ? term.command : term.values.command;
  if (command && !(await isTrusted(text))) {
    const answer = await sdk.messageBox(owner.win, {
      icon: 'warning', title: t('file.command.title'),
      text: t('file.command.text', { name: node.name, command }),
      buttons: ['cancel', 'continue'], default: 'cancel',
    });
    if (answer !== 'continue') return;
    await trust(text);
  }
  const where = fresh ? 'tab' : term.open ?? options.get('openTerm');
  const target = where === 'window' ? owner.newWindow({ empty: true }) : owner;
  const name = term.name || node.name.replace(/\.term$/i, '');
  try {
    if (term.protocol === 'local') {
      const folder = term.cwd ? fs.resolve(term.cwd) : null;
      if (term.cwd && folder?.type !== 'folder') throw new Error(t('file.noFolder', { path: term.cwd }));
      const shell = target.makeShell({ cwd: folder?.id, run: term.command });
      shell.customName = term.name || null;
      target.add(shell);
      return;
    }
    if (!sdk.term?.available) throw new Error(t('remote.cmd.unavailable'));
    const spec = { protocol: term.protocol, values: term.values, name, ...(term.settings && { settings: term.settings }), ...(term.cwd && { cwd: term.cwd }) };
    try {
      await target.openRemote(term.sealed ? { ...spec, sealed: term.sealed } : spec);
    } catch (err) {
      if (!term.sealed || err?.code !== 'forbidden') throw err;
      // A password kept by someone else, or on another lilOS: it is asked as usual
      sdk.notifications?.send?.({ text: `${node.name}: ${err.message}`, level: 'warning' });
      await target.openRemote(spec);
    }
  } finally {
    if (target !== owner && !target.tabs.length) target.win.emit('close');
  }
}

// ---------- Saving ----------

/** What a tab or a saved host would be in a .term file, or null (a session the kernel opened from the Rete folder). */
function baseOf(owner, { tab, host }) {
  if (host) return { name: host.name, protocol: host.protocol, values: { ...host.values }, settings: host.settings, host };
  if (!tab.remote) {
    const cwd = tab.shell.cwd;
    return { name: tab.customName || (cwd === fs.root ? t('ui.title') : fs.get(cwd)?.name ?? t('ui.title')), protocol: 'local', cwd: tildePath(cwd) };
  }
  const spec = tab.spec;
  if (!spec) return null;
  if (spec.host) {
    const saved = owner.data.hosts.find(x => x.id === spec.host);
    return saved ? { ...baseOf(owner, { host: saved }), name: tab.customName || saved.name, cwd: spec.cwd } : null;
  }
  if (!spec.protocol || !spec.values) return null;
  return { name: owner.nameOf(tab), protocol: spec.protocol, values: { ...spec.values }, settings: spec.settings, cwd: spec.cwd };
}

export const canSaveTerm = (owner, tab) => !!baseOf(owner, { tab });

const deskFolder = () => fs.children(fs.root).find(n => n.system && n.type === 'folder' && n.name === DESK_NAME)?.id ?? null;
const fileName = name => `${fs.cleanName(name, { portable: true }).slice(0, 80).trim() || 'terminal'}.term`;

/** A name not used yet in the folder: 'web-01.term', 'web-01 (2).term'… */
function freeName(folder, name) {
  const taken = new Set(fs.children(folder).map(n => n.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  const stem = name.replace(/\.term$/i, '');
  for (let i = 2; ; i++) if (!taken.has(`${stem} (${i}).term`.toLowerCase())) return `${stem} (${i}).term`;
}

async function writeTerm(folder, name, term) {
  const text = termText(term);
  const node = fs.create(folder, { type: 'file', name });
  await fs.write(node.id, text);
  await trust(text);   // made here: its command runs without asking
  return node;
}

const linkOf = (base, extra = {}) => {
  const term = { type: TYPE, version: 1, name: base.name, protocol: base.protocol };
  if (base.protocol !== 'local') {
    term.values = base.values;
    if (base.settings) term.settings = base.settings;
  }
  if (base.cwd) term.cwd = base.cwd;
  return { ...term, ...extra };
};

/** «Add to desk»: a .term on the desk, without asking anything (no password in it). */
export async function addTermToDesk(owner, what) {
  const base = baseOf(owner, what);
  const desk = deskFolder();
  if (!base || !desk) throw new Error(t('file.cannot'));
  const node = await writeTerm(desk, freeName(desk, fileName(base.name)), linkOf(base));
  sdk.notifications?.send?.({ text: t('file.onDesk', { name: node.name }), level: 'success' });
}

/** «Save as link (.term)…»: where, what to keep in it, and maybe the password. */
export async function saveTermDialog(owner, what) {
  const base = baseOf(owner, what);
  if (!base) return owner.error(t('file.cannot'));
  const local = base.protocol === 'local';
  const protocol = owner.data.protocols.find(p => p.id === base.protocol);
  let folder = deskFolder() ?? fs.root;
  const name = h('input', { class: 'ctl-text', type: 'text', value: fileName(base.name).replace(/\.term$/, ''), maxLength: 80, spellcheck: 'false' });
  const where = h('input', { class: 'ctl-text', type: 'text', value: tildePath(folder), readOnly: true, tabIndex: -1 });
  const cwd = h('input', { class: 'ctl-text', type: 'text', value: base.cwd ?? '', spellcheck: 'false', placeholder: local ? '~/Documenti' : '/var/www' });
  const command = h('input', { class: 'ctl-text', type: 'text', value: '', spellcheck: 'false', placeholder: local ? 'ls -l' : '' });
  const openAs = h('select', { class: 'ctl-select' },
    h('option', { value: '' }, t('file.openDefault', { how: t(`options.openTerm.${options.get('openTerm')}`) })),
    h('option', { value: 'tab' }, t('options.openTerm.tab')),
    h('option', { value: 'window' }, t('options.openTerm.window')));
  const keep = h('input', { type: 'checkbox' });
  const remembered = !!base.host?.remembered;
  // The password (or key) of the protocol, to keep it in the file: asked here unless the host keeps one
  const fields = local ? [] : protocol?.fields ?? [];
  const values = withDefaults(fields, { ...base.values });
  const secrets = fields.some(f => f.secret && shown(f, values));
  const secretForm = secrets && !remembered
    ? fieldsForm(fields, { t, only: 'secret', values: base.values, text: v => sdk.term.text(v), filePlaceholder: '~/.ssh/id_ed25519', pickFile: o => pickFile(owner.openWindow, o) })
    : null;
  const secretBox = h('div', { class: 'tm-secret', hidden: true }, remembered ? h('small', { class: 'tm-hint' }, t('file.passwordSaved')) : secretForm?.el);
  keep.addEventListener('change', () => { secretBox.hidden = !keep.checked; });

  const change = async () => {
    const node = await pickFile(owner.openWindow, { kind: 'folder', title: t('file.pickFolder') });
    if (node) { folder = node.id; where.value = tildePath(folder); }
  };

  // Written before the box closes: what goes wrong is said in it
  const save = async () => {
    const file = fileName(name.value);
    if (!fs.get(folder)) return t('file.noFolder', { path: where.value });
    if (fs.children(folder).some(n => n.name.toLowerCase() === file.toLowerCase())) return t('file.exists', { name: file });
    const path = cwd.value.trim();
    if (path && local && fs.resolve(path)?.type !== 'folder') return t('file.noFolder', { path });
    if (path && !local && !path.startsWith('/')) return t('file.serverFolder');
    const extra = { cwd: path || undefined };
    if (local && command.value.trim()) extra.command = command.value.trim();
    if (!local && command.value.trim()) extra.values = { ...base.values, command: command.value.trim() };
    if (openAs.value) extra.open = openAs.value;
    if (keep.checked) {
      if (remembered) extra.sealed = await sdk.term.seal({ host: base.host.id });
      else {
        const secret = secretForm ? await secretForm.secret() : {};
        for (const [k, v] of Object.entries(secret)) if (!String(v).trim()) delete secret[k];
        if (!Object.keys(secret).length) return t('file.noPassword');
        extra.sealed = await sdk.term.seal({ protocol: base.protocol, values: extra.values ?? base.values, secret });
      }
    }
    const term = JSON.parse(JSON.stringify(linkOf(base, extra)));   // undefined fields go
    const node = await writeTerm(folder, file, term);
    sdk.notifications?.send?.({ text: t('file.saved', { path: tildePath(node.id) }), level: 'success' });
  };

  const summary = local ? null : h('div', { class: 'tm-summary' }, badge(base.protocol), h('code', {}, termAddress({ protocol: base.protocol, values: base.values })));
  const answer = sdk.messageBox(owner.win, {
    title: t('file.saveTitle'),
    width: 440,
    content: h('div', { class: 'sh-fields' },
      fieldRow(t('file.name'), name, { beside: h('span', { class: 'tm-suffix' }, '.term') }),
      fieldRow(t('file.folder'), where, { beside: h('button', { type: 'button', class: 'ctl-btn', onclick: change }, t('file.change')) }),
      summary,
      fieldRow(t(local ? 'file.cwdLocal' : 'file.cwdRemote'), cwd),
      (local || base.protocol === 'ssh') && fieldRow(t(local ? 'file.command' : 'file.commandRemote'), command, { hint: !local && t('file.commandRemoteHint') }),
      fieldRow(t('file.openAs'), openAs),
      !local && (remembered || secrets) && h('label', { class: 'tm-check' }, keep, t('file.keepPassword')),
      !local && secretBox,
      !local && h('small', { class: 'tm-hint' }, t('file.passwordHint'))),
    buttons: ['cancel', { value: 'save', label: t('file.save'), primary: true }],
    validate: save,
  });
  name.focus();
  name.select();
  await answer;
}
