import { fs, tags } from '@lilos/sdk';
import { options, int } from './options.js';
import { ShellError } from '../shell/signals.js';
import { matchPattern } from '../shell/pattern.js';
import { byName, segments } from '../shell/paths.js';
import { i18n, t } from '../i18n.js';

/** Commands on files and folders of lilOS: ls, cat, mkdir, touch, cp, mv, rm, rmdir, stat, find, tree… */
const C = { reset: '\x1b[0m', folder: '\x1b[1;34m', app: '\x1b[36m', script: '\x1b[32m', dim: '\x1b[2m' };

const isScript = node => node.type === 'file' && /\.(sh|bash)$/i.test(node.name);
const missing = path => t('files.cannotAccess', { path });
const toTerminal = ctx => ctx.stdout === ctx.shell.host.stdout;

export function human(bytes) {
  if (bytes < 1024) return String(bytes);
  const units = ['K', 'M', 'G', 'T'];
  let v = bytes, u = -1;
  do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
  return (v < 10 ? i18n.number(Number(v.toFixed(1)), { minimumFractionDigits: 1 }) : String(Math.round(v))) + units[u];
}

function shortDate(ms) {
  const d = new Date(ms), now = new Date();
  const day = t('ls.date', { day: String(d.getDate()).padStart(2), month: i18n.date(d, { month: 'short' }) });
  const recent = Math.abs(now - d) < 180 * 86400e3;
  return recent ? `${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : `${day}  ${d.getFullYear()}`;
}

/** Size of a node: bytes for files, items inside for folders. */
const sizeOf = node => (node.type === 'file' ? node.size ?? 0 : node.type === 'folder' ? fs.children(node.id).length : 0);

function colored(ctx, node, name = node.name, classify = false) {
  const suffix = classify ? (node.type === 'folder' ? '/' : node.type === 'app' ? '@' : isScript(node) ? '*' : '') : '';
  if (!toTerminal(ctx)) return name + suffix;
  const color = node.type === 'folder' ? C.folder : node.type === 'app' ? C.app : isScript(node) ? C.script : '';
  return color ? `${color}${name}${C.reset}${suffix}` : name + suffix;
}

/** Names in columns, filled top to bottom like ls. */
export function columns(items, width) {
  if (!items.length) return '';
  const len = s => s.plain.length;
  for (let cols = Math.min(items.length, Math.max(1, Math.floor(width / 3))); cols >= 1; cols--) {
    const rows = Math.ceil(items.length / cols);
    const widths = [];
    for (let c = 0; c < cols; c++) widths.push(Math.max(0, ...items.slice(c * rows, (c + 1) * rows).map(len)));
    const total = widths.reduce((a, b) => a + b, 0) + 2 * (cols - 1);
    if (total > width && cols > 1) continue;
    let out = '';
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        const item = items[c * rows + r];
        if (!item) continue;
        const last = c === cols - 1 || !items[(c + 1) * rows + r];
        line += item.text + (last ? '' : ' '.repeat(widths[c] - len(item) + 2));
      }
      out += line + '\n';
    }
    return out;
  }
  return items.map(i => i.text).join('\n') + '\n';
}

function sortNodes(list, opts) {
  const sorted = [...list].sort((a, b) => (opts.t ? b.modified - a.modified : opts.S ? sizeOf(b) - sizeOf(a) : 0) || byName(a.name, b.name));
  return opts.r ? sorted.reverse() : sorted;
}

async function listing(ctx, entries, opts) {
  if (!entries.length) return;
  if (!opts.l) {
    if (opts['1'] || !toTerminal(ctx)) {
      for (const { node, name } of entries) await ctx.out(colored(ctx, node, name, opts.F) + '\n');
    } else {
      const items = entries.map(({ node, name }) => ({ text: colored(ctx, node, name, opts.F), plain: name + (opts.F && (node.type !== 'file' || isScript(node)) ? ' ' : '') }));
      await ctx.out(columns(items, ctx.shell.host.columns?.() ?? 80));
    }
    return;
  }
  const rows = entries.map(({ node, name }) => {
    const type = node.type === 'folder' ? 'd' : node.type === 'app' ? 'l' : '-';
    const size = node.type === 'file' ? (opts.h ? human(node.size ?? 0) : String(node.size ?? 0)) : node.type === 'folder' ? String(fs.children(node.id).length) : '-';
    const tagNames = (node.tags ?? []).map(id => tags.get(id)?.name).filter(Boolean);
    let shown = colored(ctx, node, name, opts.F);
    if (node.type === 'app') shown += ` -> app:${node.app}`;
    if (tagNames.length) shown += (toTerminal(ctx) ? C.dim : '') + ' ' + tagNames.map(t => '#' + t).join(' ') + (toTerminal(ctx) ? C.reset : '');
    return { type, size, date: shortDate(node.modified ?? node.created ?? 0), shown };
  });
  const w = Math.max(...rows.map(r => r.size.length));
  for (const r of rows) await ctx.out(`${r.type}  ${r.size.padStart(w)}  ${r.date}  ${r.shown}\n`);
}

const visibleChildren = (id, opts) => fs.children(id).filter(n => opts.a || opts.A || !n.name.startsWith('.'));

async function ls(ctx) {
  const { opts, args } = options(ctx, { flags: 'laA1htrSdRF', long: { all: 'a', 'almost-all': 'A', 'human-readable': 'h', reverse: 'r', recursive: 'R', directory: 'd', classify: 'F' } });
  const paths = args.length ? args : ['.'];
  let status = 0;
  const files = [], dirs = [];
  for (const path of paths) {
    const node = ctx.resolve(path);
    if (!node) { await ctx.error(missing(path)); status = 2; continue; }
    if (node.type === 'folder' && !opts.d) dirs.push({ node, name: path });
    else files.push({ node, name: path });
  }
  await listing(ctx, sortNodes(files.map(f => ({ ...f.node, shownName: f.name })), opts).map(n => ({ node: n, name: n.shownName })), opts);
  const many = paths.length > 1 || opts.R;
  let first = !files.length;
  const showDir = async (node, label) => {
    await ctx.tick();
    if (many) await ctx.out(`${first ? '' : '\n'}${label}:\n`);
    first = false;
    const children = sortNodes(visibleChildren(node.id, opts), opts);
    const entries = children.map(n => ({ node: n, name: n.name }));
    if (opts.a) entries.unshift({ node, name: '.' }, ...(node.id !== fs.root ? [{ node: fs.get(node.parent), name: '..' }] : []));
    await listing(ctx, entries, opts);
    if (opts.R) for (const child of children.filter(n => n.type === 'folder')) await showDir(child, `${label.replace(/\/$/, '')}/${child.name}`);
  };
  for (const { node, name } of dirs) await showDir(node, name);
  return status;
}

async function cat(ctx) {
  const { opts, args } = options(ctx, { flags: 'nbsEA', long: { number: 'n', 'number-nonblank': 'b', 'squeeze-blank': 's', 'show-ends': 'E' } });
  let n = 0;
  for await (const { text } of ctx.inputs(args)) {
    if (!opts.n && !opts.b && !opts.s && !opts.E) { await ctx.out(text); continue; }
    const lines = text.split('\n');
    const trailing = text.endsWith('\n');
    if (trailing) lines.pop();
    let out = '', blank = false;
    for (const line of lines) {
      if (opts.s && line === '' && blank) continue;
      blank = line === '';
      const numbered = opts.b ? line !== '' : opts.n;
      out += (numbered ? `${String(++n).padStart(6)}\t` : '') + line + (opts.E ? '$' : '') + '\n';
    }
    if (!trailing && out.endsWith('\n')) out = out.slice(0, -1);
    await ctx.out(out);
  }
  return ctx.failed ? 1 : 0;
}

/** Creates the folders of a path that are missing (mkdir -p). Returns the last one. */
function makeFolders(ctx, path) {
  let node = fs.get(fs.root);
  for (const name of segments(ctx.cwd, path)) {
    const next = fs.children(node.id).find(n => n.name.toLowerCase() === name.toLowerCase()) ?? fs.resolve(`${fs.path(node.id)}/${name}`);
    if (next && next.type !== 'folder') throw new ShellError(t('mkdir.notAFolder', { path, name }));
    node = next ?? fs.create(node.id, { type: 'folder', name });
  }
  return node;
}

async function mkdir(ctx) {
  const { opts, args } = options(ctx, { flags: 'pv', long: { parents: 'p', verbose: 'v' } });
  if (!args.length) throw new ShellError(t('err.missingOperand'), 2);
  let status = 0;
  for (const path of args) {
    try {
      const existing = ctx.resolve(path);
      if (existing) {
        if (opts.p && existing.type === 'folder') continue;
        throw new ShellError(t('mkdir.exists', { path }));
      }
      if (opts.p) makeFolders(ctx, path);
      else {
        const { parent, name } = ctx.locate(path);
        if (parent?.type !== 'folder' || !name) throw new ShellError(t('mkdir.noParent', { path }));
        fs.create(parent.id, { type: 'folder', name });
      }
      if (opts.v) await ctx.out(`${t('mkdir.created', { path })}\n`);
    } catch (err) {
      await ctx.error(err.message);
      status = 1;
    }
  }
  return status;
}

async function touch(ctx) {
  const { opts, args } = options(ctx, { flags: 'cam', long: { 'no-create': 'c' } });
  if (!args.length) throw new ShellError(t('err.missingOperand'), 2);
  let status = 0;
  for (const path of args) {
    const node = ctx.resolve(path);
    if (node) {
      // Writing the same content again moves the modification date (as it is stored: an encrypted file stays so)
      if (node.type === 'file') await (fs.copyContent ? fs.copyContent(node.id, node.id) : fs.write(node.id, await fs.readBlob(node.id)));
      continue;
    }
    if (opts.c) continue;
    const { parent, name } = ctx.locate(path);
    if (parent?.type !== 'folder' || !name) { await ctx.error(t('files.cannotCreate', { path })); status = 1; continue; }
    fs.create(parent.id, { type: 'file', name });
  }
  return status;
}

/** Copies a node (with what it contains) into a folder under a name; merges into an existing folder. */
async function copyNode(ctx, node, parentId, name, opts) {
  await ctx.tick();
  const existing = fs.children(parentId).find(n => n.name.toLowerCase() === name.toLowerCase());
  if (node.type === 'folder') {
    let target = existing;
    if (target && target.type !== 'folder') throw new ShellError(t('cp.overwriteFile', { name }));
    target ??= fs.create(parentId, { type: 'folder', name, color: node.color });
    for (const child of fs.children(node.id)) await copyNode(ctx, child, target.id, child.name, opts);
    return;
  }
  if (existing) {
    if (opts.n) return;
    if (existing.type === 'folder') throw new ShellError(t('files.overwriteFolder', { name }));
    if (existing.type === 'file' && node.type === 'file') {
      // The content as it is stored, with the apps' data on it: a copy of an encrypted file stays encrypted
      await (fs.copyContent ? fs.copyContent(node.id, existing.id) : fs.write(existing.id, await fs.readBlob(node.id)));
      if (opts.v) await ctx.out(`${t('cp.verbose', { from: fs.path(node.id), to: fs.path(existing.id) })}\n`);
      return;
    }
    fs.trash([existing.id]);
  }
  if (node.type === 'file' && fs.copy) {
    const copy = await fs.copy(node.id, parentId, { name });
    if (opts.v) await ctx.out(`${t('cp.verbose', { from: fs.path(node.id), to: fs.path(copy.id) })}
`);
    return;
  }
  const copy = fs.create(parentId, { type: node.type, name, app: node.app });
  if (node.type === 'file') await fs.write(copy.id, await fs.readBlob(node.id));
  if (opts.v) await ctx.out(`${t('cp.verbose', { from: fs.path(node.id), to: fs.path(copy.id) })}\n`);
}

/** Sources and target of cp / mv: [{ node, path }], and where each goes: (node) → { parent, name }. */
function plan(ctx, args) {
  if (args.length < 2) throw new ShellError(args.length ? t('files.missingDestination', { path: args[0] }) : t('err.missingOperand'), 2);
  const destPath = args.at(-1);
  const sources = args.slice(0, -1);
  const dest = ctx.resolve(destPath);
  if (sources.length > 1 && dest?.type !== 'folder') throw new ShellError(t('files.targetNotFolder', { path: destPath }));
  return {
    sources,
    target: node => {
      if (dest?.type === 'folder' && dest.id !== node.id) return { parent: dest, name: node.name };
      if (dest) return { parent: fs.get(dest.parent), name: dest.id === node.id ? segments(ctx.cwd, destPath).at(-1) : dest.name, existing: dest };
      const { parent, name } = ctx.locate(destPath);
      if (parent?.type !== 'folder' || !name) throw new ShellError(t('files.cannotCreate', { path: destPath }));
      return { parent, name };
    },
  };
}

async function cp(ctx) {
  const { opts, args } = options(ctx, { flags: 'rRanvfp', long: { recursive: 'r', 'no-clobber': 'n', verbose: 'v', force: 'f', archive: 'a' } });
  const { sources, target } = plan(ctx, args);
  let status = 0;
  for (const path of sources) {
    try {
      const node = ctx.resolve(path);
      if (!node) throw new ShellError(t('files.cannotStat', { path }));
      if (node.type === 'folder' && !(opts.r || opts.R || opts.a)) throw new ShellError(t('cp.omitting', { path }));
      const { parent, name } = target(node);
      if (node.type === 'folder' && fs.isInside(parent.id, node.id)) throw new ShellError(t('cp.intoItself', { path }));
      await copyNode(ctx, node, parent.id, name, opts);
    } catch (err) {
      if (!(err instanceof ShellError) && !(err instanceof Error)) throw err;
      await ctx.error(err.message);
      status = 1;
    }
  }
  return status;
}

async function mv(ctx) {
  const { opts, args } = options(ctx, { flags: 'nvfi', long: { 'no-clobber': 'n', verbose: 'v', force: 'f' } });
  const { sources, target } = plan(ctx, args);
  let status = 0;
  for (const path of sources) {
    try {
      const node = ctx.resolve(path);
      if (!node) throw new ShellError(t('files.cannotStat', { path }));
      if (node.system) throw new ShellError(t('mv.system', { path }));
      const { parent, name } = target(node);
      if (node.type === 'folder' && fs.isInside(parent.id, node.id)) throw new ShellError(t('mv.intoItself', { path }));
      const clash = fs.children(parent.id).find(n => n.id !== node.id && n.name.toLowerCase() === name.toLowerCase());
      if (clash) {
        if (opts.n) continue;
        if (clash.type === 'folder' && node.type !== 'folder') throw new ShellError(t('files.overwriteFolder', { name }));
        if (clash.type === 'folder' && fs.children(clash.id).length) throw new ShellError(t('mv.notEmpty', { path, name }));
        fs.trash([clash.id]);
      }
      if (node.parent !== parent.id) fs.move(node.id, parent.id);
      if (fs.get(node.id).name !== name) fs.rename(node.id, name);
      if (opts.v) await ctx.out(`${t('mv.verbose', { from: path, to: fs.path(node.id) })}\n`);
    } catch (err) {
      await ctx.error(err.message);
      status = 1;
    }
  }
  return status;
}

async function rm(ctx) {
  const { opts, args } = options(ctx, { flags: 'rRfvdi', long: { recursive: 'r', force: 'f', verbose: 'v', dir: 'd', purge: 'P' } });
  if (!args.length && !opts.f) throw new ShellError(t('err.missingOperand'), 2);
  let status = 0;
  for (const path of args) {
    const node = ctx.resolve(path);
    if (!node) {
      if (!opts.f) { await ctx.error(t('files.cannotRemove', { path, reason: t('reason.noSuchFile') })); status = 1; }
      continue;
    }
    try {
      if (node.id === fs.root) throw new ShellError(t('rm.home', { path }));
      if (node.type === 'folder' && !(opts.r || opts.R)) {
        if (!opts.d) throw new ShellError(t('files.cannotRemove', { path, reason: t('reason.isADirectory') }));
        if (fs.children(node.id).length) throw new ShellError(t('files.cannotRemove', { path, reason: t('reason.notEmpty') }));
      }
      if (node.system) throw new ShellError(t('files.cannotRemove', { path, reason: t('reason.system') }));
      if (opts.P) fs.remove(node.id);
      else if (!fs.trash([node.id]).length) throw new ShellError(t('files.cannotRemove', { path, reason: t('reason.containsSystem') }));
      if (opts.v) await ctx.out(`${opts.P ? t('rm.purged', { path }) : t('rm.trashed', { path })}\n`);
    } catch (err) {
      await ctx.error(err.message);
      status = 1;
    }
  }
  return status;
}

async function rmdir(ctx) {
  const { opts, args } = options(ctx, { flags: 'pv', long: { parents: 'p', verbose: 'v' } });
  if (!args.length) throw new ShellError(t('err.missingOperand'), 2);
  let status = 0;
  for (const path of args) {
    const chain = opts.p ? segments(ctx.cwd, path).map((_, i, all) => '~/' + all.slice(0, all.length - i).join('/')) : [path];
    for (const p of chain) {
      const node = ctx.resolve(p);
      const fail = async reason => { await ctx.error(t('files.cannotRemove', { path: p, reason })); status = 1; };
      if (!node) { await fail(t('reason.noSuchFile')); break; }
      if (node.type !== 'folder') { await fail(t('reason.notADirectory')); break; }
      if (fs.children(node.id).length) { await fail(t('reason.notEmpty')); break; }
      if (node.system || node.id === fs.root) { await fail(t('reason.system')); break; }
      fs.trash([node.id]);
      if (opts.v) await ctx.out(`${t('rmdir.removed', { path: p })}\n`);
    }
  }
  return status;
}

const fullDate = ms => i18n.date(ms, { dateStyle: 'medium', timeStyle: 'medium' });
const typeName = n => (n.type === 'folder' ? t('stat.folder') : n.type === 'app' ? t('stat.appLink', { app: n.app }) : n.size ? t('stat.file') : t('stat.emptyFile'));

async function stat(ctx) {
  const { opts, args } = options(ctx, { values: 'c', long: { format: 'c' } });
  if (!args.length) throw new ShellError(t('err.missingOperand'), 2);
  let status = 0;
  for (const path of args) {
    const node = ctx.resolve(path);
    if (!node) { await ctx.error(missing(path)); status = 1; continue; }
    if (opts.c != null) {
      const map = { n: path, N: `'${path}'`, s: String(node.size ?? 0), F: typeName(node), Y: String(Math.floor(node.modified / 1000)), y: new Date(node.modified).toISOString(), W: String(Math.floor(node.created / 1000)), w: new Date(node.created).toISOString(), i: node.id, '%': '%' };
      await ctx.out(opts.c.replace(/%(.)/g, (m, c) => map[c] ?? m) + '\n');
      continue;
    }
    const tagNames = (node.tags ?? []).map(id => tags.get(id)?.name).filter(Boolean);
    await ctx.out([
      `  File: ${path}`,
      `  ${t('stat.type', { type: typeName(node) })}`,
      `  ${t('stat.path', { path: fs.path(node.id) })}`,
      node.type === 'folder' ? `  ${t('stat.items', { n: fs.children(node.id).length, total: fs.count(node.id) })}` : node.type === 'file' ? `  ${t('stat.size', { size: node.size ?? 0, human: human(node.size ?? 0) })}` : null,
      `  ${t('stat.created', { date: fullDate(node.created) })}`,
      `  ${t('stat.modified', { date: fullDate(node.modified) })}`,
      tagNames.length ? `  ${t('stat.tags', { tags: tagNames.join(', ') })}` : null,
      node.system ? `  ${t('stat.system')}` : null,
      `  Id: ${node.id}`,
    ].filter(Boolean).join('\n') + '\n');
  }
  return status;
}

// ---------- find ----------

function parseFind(ctx, tokens) {
  let i = 0;
  const global = { maxdepth: Infinity, mindepth: 0 };
  const execs = [];
  const or = () => {
    let left = and();
    while (tokens[i] === '-o' || tokens[i] === '-or') { i++; const right = and(); const l = left; left = n => l(n) || right(n); }
    return left;
  };
  const and = () => {
    let left = not();
    for (;;) {
      if (tokens[i] === '-a' || tokens[i] === '-and') i++;
      else if (i >= tokens.length || tokens[i] === '-o' || tokens[i] === '-or' || tokens[i] === ')') return left;
      const right = not();
      const l = left;
      left = n => l(n) && right(n);
    }
  };
  const not = () => {
    if (tokens[i] === '!' || tokens[i] === '-not') { i++; const e = not(); return n => !e(n); }
    return primary();
  };
  const arg = name => {
    if (i >= tokens.length) throw new ShellError(t('find.missingArgument', { name }));
    return tokens[i++];
  };
  const primary = () => {
    const tok = tokens[i++];
    switch (tok) {
      case '(': { const e = or(); if (tokens[i++] !== ')') throw new ShellError(t('err.missingParen')); return e; }
      case '-name': { const p = arg(tok); return n => matchPattern(p, n.node.name); }
      case '-iname': { const p = arg(tok); return n => matchPattern(p, n.node.name, { ignoreCase: true }); }
      case '-path': case '-wholename': { const p = arg(tok); return n => matchPattern(p, n.path); }
      case '-ipath': { const p = arg(tok); return n => matchPattern(p, n.path, { ignoreCase: true }); }
      case '-type': {
        const k = arg(tok);
        const want = { f: 'file', d: 'folder', l: 'app' }[k];
        if (!want) throw new ShellError(t('find.badType', { type: k }));
        return n => n.node.type === want;
      }
      case '-empty': return n => (n.node.type === 'folder' ? !fs.children(n.node.id).length : n.node.type === 'file' && !n.node.size);
      case '-size': {
        const v = arg(tok);
        const m = /^([+-]?)(\d+)([ckMG]?)$/.exec(v);
        if (!m) throw new ShellError(t('find.badSize', { value: v }));
        const unit = { c: 1, k: 1024, M: 1024 ** 2, G: 1024 ** 3, '': 512 }[m[3]];
        const size = Number(m[2]);
        return n => {
          if (n.node.type !== 'file') return false;
          const s = Math.ceil((n.node.size ?? 0) / unit);
          return m[1] === '+' ? s > size : m[1] === '-' ? s < size : s === size;
        };
      }
      case '-mtime': case '-mmin': {
        const v = arg(tok);
        const m = /^([+-]?)(\d+)$/.exec(v);
        if (!m) throw new ShellError(t('find.badValue', { option: tok, value: v }));
        const unit = tok === '-mtime' ? 86400e3 : 60e3;
        return n => {
          const age = Math.floor((Date.now() - n.node.modified) / unit);
          return m[1] === '+' ? age > +m[2] : m[1] === '-' ? age < +m[2] : age === +m[2];
        };
      }
      case '-newer': {
        const ref = ctx.resolve(arg(tok));
        if (!ref) throw new ShellError(t('find.cannotFind', { path: tokens[i - 1] }));
        return n => n.node.modified > ref.modified;
      }
      case '-maxdepth': global.maxdepth = int(arg(tok)); return () => true;
      case '-mindepth': global.mindepth = int(arg(tok)); return () => true;
      case '-true': return () => true;
      case '-false': return () => false;
      case '-print': global.printed = true; return n => (n.out.push(n.path), true);
      case '-print0': global.printed = true; return n => (n.out.push(n.path + '\0'), true);
      case '-delete': global.printed = true; return n => (n.deletes.push(n.node.id), true);
      case '-exec': case '-ok': {
        const cmd = [];
        while (i < tokens.length && tokens[i] !== ';' && tokens[i] !== '+') cmd.push(tokens[i++]);
        const plus = tokens[i] === '+';
        if (i >= tokens.length) throw new ShellError(t('find.execEnd'));
        i++;
        if (!cmd.length) throw new ShellError(t('find.execCommand'));
        global.printed = true;
        const ex = { cmd, plus, batch: [] };
        execs.push(ex);
        return n => {
          if (plus) { ex.batch.push(n.path); return true; }
          n.runs.push(cmd.map(a => a.replaceAll('{}', n.path)));
          return true;
        };
      }
    }
    throw new ShellError(t('find.unknownPredicate', { name: tok }));
  };
  const expr = tokens.length ? or() : () => true;
  if (i < tokens.length) throw new ShellError(t('find.unexpected', { arg: tokens[i] }));
  return { expr, global, execs };
}

async function find(ctx) {
  const args = ctx.args;
  let k = 0;
  while (k < args.length && !/^[-(!]/.test(args[k])) k++;
  const starts = k ? args.slice(0, k) : ['.'];
  const { expr, global, execs } = parseFind(ctx, args.slice(k));
  let status = 0;
  const deletes = [];
  const run = async argv => {
    const code = await ctx.shell.invoke(argv, ctx.io);
    if (code !== 0) status = 1;
    return code === 0;
  };
  for (const start of starts) {
    const root = ctx.resolve(start);
    if (!root) { await ctx.error(t('files.quotedNoSuchFile', { path: start })); status = 1; continue; }
    const walk = async (node, path, depth) => {
      await ctx.tick();
      if (depth >= global.mindepth) {
        const n = { node, path, out: [], deletes, runs: [] };
        if (expr(n) && !global.printed) n.out.push(path);
        for (const line of n.out) await ctx.out(line.endsWith('\0') ? line : line + '\n');
        for (const argv of n.runs) await run(argv);
      }
      if (node.type === 'folder' && depth < global.maxdepth) {
        for (const child of [...fs.children(node.id)].sort((a, b) => byName(a.name, b.name))) {
          await walk(child, path.endsWith('/') ? path + child.name : `${path}/${child.name}`, depth + 1);
        }
      }
    };
    await walk(root, start, 0);
  }
  for (const ex of execs.filter(e => e.plus && e.batch.length)) {
    const at = ex.cmd.indexOf('{}');
    await run(at < 0 ? [...ex.cmd, ...ex.batch] : [...ex.cmd.slice(0, at), ...ex.batch, ...ex.cmd.slice(at + 1)]);
  }
  // Deepest first, so a folder is not trashed before what it contains is considered
  if (deletes.length) fs.trash([...deletes].reverse().filter(id => fs.exists(id)));
  return status;
}

async function tree(ctx) {
  const { opts, args } = options(ctx, { flags: 'adf', values: 'L' });
  const max = opts.L != null ? int(opts.L) : Infinity;
  let folders = 0, files = 0, status = 0;
  for (const start of args.length ? args : ['.']) {
    const root = ctx.resolve(start);
    if (!root) { await ctx.error(t('files.quotedNoSuchFile', { path: start })); status = 1; continue; }
    await ctx.out(colored(ctx, root, start) + '\n');
    const walk = async (node, prefix, depth) => {
      if (depth > max) return;
      const children = sortNodes(visibleChildren(node.id, opts).filter(n => !opts.d || n.type === 'folder'), {});
      for (let i = 0; i < children.length; i++) {
        await ctx.tick();
        const child = children[i];
        const last = i === children.length - 1;
        const name = opts.f ? `${prefix.replace(/[│├└─ ]/g, '')}${child.name}` : child.name;
        await ctx.out(`${prefix}${last ? '└── ' : '├── '}${colored(ctx, child, name)}${child.type === 'app' ? ` -> app:${child.app}` : ''}\n`);
        if (child.type === 'folder') {
          folders++;
          await walk(child, prefix + (last ? '    ' : '│   '), depth + 1);
        } else files++;
      }
    };
    await walk(root, '', 1);
  }
  await ctx.out(`\n${t('tree.folders', { n: folders })}${opts.d ? '' : `, ${t('tree.files', { n: files })}`}\n`);
  return status;
}

async function basename(ctx) {
  const { opts, args } = options(ctx, { flags: 'az', values: 's', long: { multiple: 'a', suffix: 's' } });
  if (!args.length) throw new ShellError(t('err.missingOperand'), 2);
  const names = opts.a || opts.s != null ? args : [args[0]];
  const suffix = opts.s ?? (opts.a ? null : args[1]);
  for (const path of names) {
    let base = path.replace(/\/+$/, '').split('/').pop() || (path.startsWith('/') ? '/' : '');
    if (suffix && base.endsWith(suffix) && base !== suffix) base = base.slice(0, -suffix.length);
    await ctx.out(base + (opts.z ? '\0' : '\n'));
  }
}

async function dirname(ctx) {
  if (!ctx.args.length) throw new ShellError(t('err.missingOperand'), 2);
  for (const path of ctx.args) {
    const trimmed = path.replace(/\/+$/, '');
    const i = trimmed.lastIndexOf('/');
    await ctx.out((i < 0 ? '.' : i === 0 ? '/' : trimmed.slice(0, i).replace(/\/+$/, '') || '/') + '\n');
  }
}

async function realpath(ctx) {
  const { opts, args } = options(ctx, { flags: 'emq' });
  let status = 0;
  for (const path of args.length ? args : ['.']) {
    const node = ctx.resolve(path);
    if (node) { await ctx.out(fs.path(node.id) + '\n'); continue; }
    if (opts.m) { await ctx.out([fs.home, ...segments(ctx.cwd, path)].join('/') + '\n'); continue; }
    if (!opts.q) await ctx.error(t('err.noSuchFile', { path }));
    status = 1;
  }
  return status;
}

export const fileCommands = [
  { name: 'ls', get usage() { return t('help.ls.usage'); }, get summary() { return t('help.ls.summary'); }, run: ls,
    get help() { return t('help.ls.text'); } },
  { name: 'cat', usage: 'cat [-nbsE] [file…]', get summary() { return t('help.cat.summary'); }, run: cat,
    get help() { return t('help.cat.text'); } },
  { name: 'mkdir', get usage() { return t('help.mkdir.usage'); }, get summary() { return t('help.mkdir.summary'); }, run: mkdir, get help() { return t('help.mkdir.text'); } },
  { name: 'touch', usage: 'touch [-c] file…', get summary() { return t('help.touch.summary'); }, run: touch },
  { name: 'cp', get usage() { return t('help.cp.usage'); }, get summary() { return t('help.cp.summary'); }, run: cp,
    get help() { return t('help.cp.text'); } },
  { name: 'mv', get usage() { return t('help.mv.usage'); }, get summary() { return t('help.mv.summary'); }, run: mv,
    get help() { return t('help.mv.text'); } },
  { name: 'rm', get usage() { return t('help.rm.usage'); }, get summary() { return t('help.rm.summary'); }, run: rm,
    get help() { return t('help.rm.text'); } },
  { name: 'rmdir', get usage() { return t('help.rmdir.usage'); }, get summary() { return t('help.rmdir.summary'); }, run: rmdir },
  { name: 'stat', get usage() { return t('help.stat.usage'); }, get summary() { return t('help.stat.summary'); }, run: stat,
    get help() { return t('help.stat.text'); } },
  { name: 'find', get usage() { return t('help.find.usage'); }, get summary() { return t('help.find.summary'); }, run: find,
    get help() { return t('help.find.text'); } },
  { name: 'tree', get usage() { return t('help.tree.usage'); }, get summary() { return t('help.tree.summary'); }, run: tree },
  { name: 'basename', get usage() { return t('help.basename.usage'); }, get summary() { return t('help.basename.summary'); }, run: basename },
  { name: 'dirname', get usage() { return t('help.dirname.usage'); }, get summary() { return t('help.dirname.summary'); }, run: dirname },
  { name: 'realpath', get usage() { return t('help.realpath.usage'); }, get summary() { return t('help.realpath.summary'); }, run: realpath },
];
