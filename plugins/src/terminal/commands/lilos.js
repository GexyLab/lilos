import { fs, tags, session, TAG_COLORS } from '@lilos/sdk';
import { installedApps, launch, openFile } from '@lilos/system';
import { options } from './options.js';
import { ShellError } from '../shell/signals.js';
import { columns, human } from './files.js';
import { byName } from '../shell/paths.js';
import { i18n, t } from '../i18n.js';

/** Commands of lilOS itself: open, trash, tag, apps; and date, whoami, hostname, uname. */
const toTerminal = ctx => ctx.stdout === ctx.shell.host.stdout;
const findApp = name => {
  const key = String(name).toLowerCase();
  return installedApps().find(a => a.id.toLowerCase() === key) ?? installedApps().find(a => a.name.toLowerCase() === key) ?? null;
};

async function open(ctx) {
  const { opts, args } = options(ctx, { values: 'a', long: { app: 'a' } });
  if (opts.a != null) {
    const app = findApp(opts.a);
    if (!app) throw new ShellError(t('open.noApp', { app: opts.a }));
    if (!args.length) { launch(app.id); return 0; }
    for (const path of args) {
      const node = ctx.resolve(path);
      if (!node) throw new ShellError(t('err.noSuchFile', { path }));
      launch(app.id, node.type === 'folder' ? { folder: node.id } : { file: node.id });
    }
    return 0;
  }
  if (!args.length) throw new ShellError(t('help.usageShort', { usage: ctx.cmd.usage }), 2);
  let status = 0;
  for (const path of args) {
    const node = ctx.resolve(path);
    if (!node) { await ctx.error(t('err.noSuchFile', { path })); status = 1; continue; }
    if (node.type === 'folder') launch('files', { folder: node.id });
    else if (node.type === 'app') launch(node.app);
    else openFile(node);
  }
  return status;
}

const when = ms => i18n.date(ms, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Trashed items matching names or ids (the newest first for equal names). */
function pick(ctx, names) {
  const all = fs.trashed();
  return names.map(name => {
    const item = all.find(x => x.id === name) ?? all.find(x => x.name === name) ?? all.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!item) throw new ShellError(t('trash.notInTrash', { name }));
    return item;
  });
}

async function trash(ctx) {
  const [sub = 'list', ...rest] = ctx.args;
  switch (sub) {
    case 'list': case 'ls': {
      const items = fs.trashed();
      if (!items.length) { await ctx.out(`${t('trash.empty')}\n`); return 0; }
      for (const item of items) {
        const from = fs.exists(item.trashed.from) ? fs.path(item.trashed.from) : t('trash.deletedFolder');
        const size = item.type === 'folder' ? t('trash.items', { n: item.inside }) : human(item.bytes);
        await ctx.out(`${when(item.trashed.at)}  ${size.padStart(10)}  ${item.name}${item.type === 'folder' ? '/' : ''}  ← ${from}\n`);
      }
      return 0;
    }
    case 'put': {
      if (!rest.length) throw new ShellError(t('trash.missingPut'), 2);
      let status = 0;
      for (const path of rest) {
        const node = ctx.resolve(path);
        if (!node) { await ctx.error(t('err.noSuchFile', { path })); status = 1; continue; }
        if (!fs.trash([node.id]).length) { await ctx.error(t('trash.cannotTrash', { path })); status = 1; }
      }
      return status;
    }
    case 'restore': {
      if (!rest.length) throw new ShellError(t('trash.missingRestore'), 2);
      for (const { id, parent } of fs.untrash(pick(ctx, rest).map(item => item.id))) await ctx.out(`${t('trash.restored', { path: fs.path(id) })}${parent === fs.root ? '' : ''}\n`);
      return 0;
    }
    case 'rm': {
      if (!rest.length) throw new ShellError(t('trash.missingName'), 2);
      const n = fs.purge(pick(ctx, rest).map(item => item.id));
      await ctx.out(`${t('trash.purged', { n })}\n`);
      return 0;
    }
    case 'empty': {
      const n = fs.purgeTrash();
      await ctx.out(`${n ? t('trash.emptied', { n }) : t('trash.alreadyEmpty')}\n`);
      return 0;
    }
  }
  throw new ShellError(`${t('err.unknownSubcommand', { sub })}\n${t('help.usageLine', { usage: ctx.cmd.usage })}`, 2);
}

function tagByName(name, create = false) {
  const tag = tags.byName(name) ?? tags.get(name);
  if (tag) return tag;
  if (create) return tags.create({ name });
  throw new ShellError(t('tag.noSuchTag', { name }));
}

async function tag(ctx) {
  const [sub = 'ls', ...rest] = ctx.args;
  const swatch = color => (toTerminal(ctx) ? `\x1b[38;2;${parseInt(color.slice(1, 3), 16)};${parseInt(color.slice(3, 5), 16)};${parseInt(color.slice(5, 7), 16)}m●\x1b[0m ` : '');
  switch (sub) {
    case 'ls': case 'list': {
      if (rest.length) {
        for (const name of rest) {
          const tag = tagByName(name);
          for (const node of fs.tagged(tag.id).sort((a, b) => byName(fs.path(a.id), fs.path(b.id)))) await ctx.out(fs.path(node.id) + (node.type === 'folder' ? '/' : '') + '\n');
        }
        return 0;
      }
      const list = tags.list();
      if (!list.length) { await ctx.out(`${t('tag.none')}\n`); return 0; }
      for (const tag of list) await ctx.out(`${swatch(tag.color)}${tag.name}  (${fs.tagged(tag.id).length})${tag.visible ? '' : `  ${t('tag.hidden')}`}\n`);
      return 0;
    }
    case 'show': {
      let status = 0;
      for (const path of rest.length ? rest : ['.']) {
        const node = ctx.resolve(path);
        if (!node) { await ctx.error(t('err.noSuchFile', { path })); status = 1; continue; }
        const names = (node.tags ?? []).map(id => tags.get(id)).filter(Boolean).map(tag => swatch(tag.color) + tag.name);
        await ctx.out(`${path}: ${names.length ? names.join(', ') : t('tag.noTags')}\n`);
      }
      return status;
    }
    case 'add': case 'rm': {
      const [name, ...paths] = rest;
      if (!name || !paths.length) throw new ShellError(t('help.usageShort', { usage: t('tag.usageAddRm', { sub }) }), 2);
      const created = sub === 'add' && !tags.byName(name);
      const tag = tagByName(name, sub === 'add');
      if (created) await ctx.out(`${t('tag.created', { name: tag.name })}\n`);
      let status = 0;
      for (const path of paths) {
        const node = ctx.resolve(path);
        if (!node) { await ctx.error(t('err.noSuchFile', { path })); status = 1; continue; }
        if (node.system) { await ctx.error(t('tag.system', { path })); status = 1; continue; }
        const now = node.tags ?? [];
        fs.setTags(node.id, sub === 'add' ? [...now, tag.id] : now.filter(id => id !== tag.id));
      }
      return status;
    }
    case 'new': {
      const [name, color] = rest;
      if (!name) throw new ShellError(t('help.usageShort', { usage: t('tag.usageNew') }), 2);
      const found = color ? TAG_COLORS.find(c => c.label.toLowerCase() === color.toLowerCase())?.value ?? color : undefined;
      const tag = tags.create({ name, color: found });
      await ctx.out(`${t('tag.createdShown', { tag: swatch(tag.color) + tag.name })}\n`);
      return 0;
    }
    case 'delete': {
      if (!rest.length) throw new ShellError(t('help.usageShort', { usage: t('tag.usageDelete') }), 2);
      for (const name of rest) {
        tags.remove(tagByName(name).id);
      }
      return 0;
    }
  }
  throw new ShellError(`${t('err.unknownSubcommand', { sub })}\n${t('help.usageLine', { usage: ctx.cmd.usage })}`, 2);
}

async function apps(ctx) {
  const list = [...installedApps()].sort((a, b) => byName(a.name, b.name));
  const width = Math.max(...list.map(a => a.id.length));
  for (const app of list) {
    const version = app.package?.manifest?.version ?? '';
    await ctx.out(`${app.id.padEnd(width)}  ${app.name}${version ? `  ${version}` : ''}\n`);
  }
}

/** Names of days (0: Sunday) and months (0: January) in the system's language. */
const dayName = (day, weekday) => i18n.date(new Date(2024, 0, 7 + day, 12), { weekday });
const monthName = (month, style) => i18n.date(new Date(2024, month, 15, 12), { month: style });

export function strftime(format, d, utc = false) {
  const g = k => (utc ? d[`getUTC${k}`]() : d[`get${k}`]());
  const p = (v, n = 2) => String(v).padStart(n, '0');
  const start = utc ? Date.UTC(g('FullYear'), 0, 1) : new Date(g('FullYear'), 0, 1).getTime();
  const offset = utc ? 0 : -d.getTimezoneOffset();
  const map = {
    Y: () => g('FullYear'), y: () => p(g('FullYear') % 100), m: () => p(g('Month') + 1), d: () => p(g('Date')), e: () => String(g('Date')).padStart(2),
    H: () => p(g('Hours')), I: () => p(((g('Hours') + 11) % 12) + 1), M: () => p(g('Minutes')), S: () => p(g('Seconds')), N: () => p(g('Milliseconds'), 3) + '000000',
    p: () => (g('Hours') < 12 ? 'AM' : 'PM'), A: () => dayName(g('Day'), 'long'), a: () => dayName(g('Day'), 'short'), B: () => monthName(g('Month'), 'long'), b: () => monthName(g('Month'), 'short'), h: () => monthName(g('Month'), 'short'),
    j: () => p(Math.floor((d - start) / 86400e3) + 1, 3), u: () => g('Day') || 7, w: () => g('Day'), s: () => Math.floor(d / 1000),
    z: () => (offset >= 0 ? '+' : '-') + p(Math.floor(Math.abs(offset) / 60)) + p(Math.abs(offset) % 60), Z: () => (utc ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone),
    F: () => `${map.Y()}-${map.m()}-${map.d()}`, T: () => `${map.H()}:${map.M()}:${map.S()}`, D: () => `${map.m()}/${map.d()}/${map.y()}`, R: () => `${map.H()}:${map.M()}`,
    c: () => strftime(t('date.formatC'), d, utc), x: () => strftime(t('date.formatX'), d, utc), X: () => map.T(), n: () => '\n', t: () => '\t', '%': () => '%',
  };
  return format.replace(/%([a-zA-Z%])/g, (m, c) => (map[c] ? String(map[c]()) : m));
}

async function date(ctx) {
  const { opts, args } = options(ctx, { flags: 'uR', values: 'dI', long: { utc: 'u', date: 'd', 'iso-8601': 'I', rfc: 'R' } });
  let d = new Date();
  if (opts.d != null) {
    const v = opts.d.trim();
    d = /^@\d+$/.test(v) ? new Date(Number(v.slice(1)) * 1000) : v === 'now' ? new Date() : v === 'yesterday' || v === 'ieri' ? new Date(Date.now() - 86400e3) : v === 'tomorrow' || v === 'domani' ? new Date(Date.now() + 86400e3) : new Date(v);
    if (Number.isNaN(d.getTime())) throw new ShellError(t('date.invalid', { date: opts.d }));
  }
  const fmt = args.find(a => a.startsWith('+'));
  if (fmt) return ctx.out(strftime(fmt.slice(1), d, opts.u) + '\n');
  if (opts.I != null) return ctx.out(strftime(opts.I === 'seconds' ? '%Y-%m-%dT%H:%M:%S%z' : '%F', d, opts.u) + '\n');
  if (opts.R) return ctx.out(d.toUTCString() + '\n');
  await ctx.out(strftime(t('date.format'), d, opts.u) + '\n');
}

export const lilosCommands = [
  { name: 'open', get usage() { return t('help.open.usage'); }, get summary() { return t('help.open.summary'); }, run: open,
    get help() { return t('help.open.text'); } },
  { name: 'trash', get usage() { return t('help.trash.usage'); }, get summary() { return t('help.trash.summary'); }, run: trash,
    get help() { return t('help.trash.text'); } },
  { name: 'tag', get usage() { return t('help.tag.usage'); }, get summary() { return t('help.tag.summary'); }, run: tag,
    get help() { return t('help.tag.text'); } },
  { name: 'apps', usage: 'apps', get summary() { return t('help.apps.summary'); }, run: apps },
  { name: 'date', get usage() { return t('help.date.usage'); }, get summary() { return t('help.date.summary'); }, run: date,
    get help() { return t('help.date.text'); } },
  { name: 'whoami', usage: 'whoami', get summary() { return t('help.whoami.summary'); }, run: ctx => ctx.out((session.user?.username || ctx.shell.getVar('USER') || t('shell.defaultUser')) + '\n') },
  { name: 'hostname', usage: 'hostname', get summary() { return t('help.hostname.summary'); }, run: ctx => ctx.out((ctx.shell.getVar('HOSTNAME') ?? 'lilos') + '\n') },
  { name: 'uname', usage: 'uname [-a]', get summary() { return t('help.uname.summary'); }, run: ctx => ctx.out(ctx.args.includes('-a') ? `lilOS lilos ${ctx.shell.getVar('BASH_VERSION')} ${navigator.platform || ''}\n`.replace(/ \n$/, '\n') : 'lilOS\n') },
];

export { columns };
