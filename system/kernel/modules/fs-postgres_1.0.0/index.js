import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * lilOS's file system in PostgreSQL (table lilos_nodes, schema.sql), with its access control.
 *
 *   /                      area root
 *   /system                area system      the kernel's
 *   /system/app            area app         installed apps: every user reads, only the kernel writes
 *   /system/commons        area commons     shared libraries: same
 *   /system/tmp            area tmp         temporary data: only the kernel
 *   /home                  area homes       only the kernel lists it
 *   /home/<user>           area home        the user's home: only that user (and the kernel)
 *
 * A node takes area and owner from its parent when created, and never changes them: nothing moves
 * from a home to another, or out of the homes. A user does not learn that what they may not read
 * exists ('not_found', as for a missing node). Names are not unique in a folder (lilOS keeps them
 * unique where it needs to): lookup() takes the oldest.
 *
 * Configuration: { url } (LILOS_PG_URL wins), { poolSize }.
 */
const { Pool } = pg;

const BASE = [
  { id: 'fs:root', parent: null, name: '', area: 'root' },
  { id: 'fs:system', parent: 'fs:root', name: 'system', area: 'system' },
  { id: 'fs:app', parent: 'fs:system', name: 'app', area: 'app' },
  { id: 'fs:commons', parent: 'fs:system', name: 'commons', area: 'commons' },
  { id: 'fs:tmp', parent: 'fs:system', name: 'tmp', area: 'tmp' },
  { id: 'fs:home', parent: 'fs:root', name: 'home', area: 'homes' },
];
const BASE_IDS = new Set(BASE.map(b => b.id));
const READABLE = new Set(['app', 'commons']);   // by every user
const TYPES = new Set(['folder', 'file', 'app']);
const ID = /^[\w:~/.-]{1,300}$/;
const MAX_NAME = 255;
const MAX_DEPTH = 256;
const COLUMNS = 'id, parent, name, type, area, owner, meta, size, created, modified';

let pool, ctx;

const isUser = p => p?.kind === 'user' && typeof p.id === 'string' && p.id.length > 0;
const isKernel = p => p?.kind === 'kernel';
const homeId = userId => `home:${userId}`;

function can(principal, row, write) {
  if (isKernel(principal)) return true;
  if (!isUser(principal)) return false;
  if (row.area === 'home') return row.owner === principal.id;
  return !write && READABLE.has(row.area);
}

/** Nodes nobody but the kernel can rename, move or remove: the base folders and the homes. */
const isFixed = row => BASE_IDS.has(row.id) || (row.area === 'home' && row.id === homeId(row.owner) && row.parent === 'fs:home');

const toNode = (row, content = false) => ({
  id: row.id, parent: row.parent, name: row.name, type: row.type, meta: row.meta ?? {},
  size: Number(row.size), created: Number(row.created), modified: Number(row.modified),
  ...(content && { content: row.content ?? Buffer.alloc(0) }),
});

function checkId(id) {
  if (typeof id !== 'string' || !ID.test(id)) ctx.fail('invalid', 'Identificatore non valido');
  return id;
}

function checkNode(n) {
  if (!n || typeof n !== 'object') ctx.fail('invalid', 'Elemento non valido');
  checkId(n.id);
  checkId(n.parent);
  if (!TYPES.has(n.type)) ctx.fail('invalid', `Tipo non valido: ${String(n.type).slice(0, 20)}`);
  if (typeof n.name !== 'string' || !n.name || n.name.length > MAX_NAME || /[/\0]/.test(n.name)) ctx.fail('invalid', 'Nome non valido');
  if (!Number.isFinite(n.created) || !Number.isFinite(n.modified)) ctx.fail('invalid', 'Date non valide');
  if (n.meta != null && (typeof n.meta !== 'object' || Array.isArray(n.meta))) ctx.fail('invalid', 'Metadati non validi');
  return n;
}

async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function row(db, id, { lock = false, content = false } = {}) {
  const { rows } = await db.query(`select ${COLUMNS}${content ? ', content' : ''} from lilos_nodes where id = $1${lock ? ' for update' : ''}`, [id]);
  return rows[0] ?? null;
}

/** The row if the principal may read it, else 'not_found'. */
async function readable(db, principal, id, options) {
  const r = await row(db, checkId(id), options);
  if (!r || !can(principal, r, false)) ctx.fail('not_found', 'Elemento inesistente');
  return r;
}

/** True if `id` is `ancestor` or inside it. */
async function isInside(db, id, ancestor) {
  const { rows } = await db.query(
    `with recursive up(id, parent, depth) as (
       select id, parent, 0 from lilos_nodes where id = $1
       union all select n.id, n.parent, up.depth + 1 from lilos_nodes n join up on n.id = up.parent where up.depth < ${MAX_DEPTH}
     ) select 1 from up where id = $2 limit 1`, [id, ancestor]);
  return rows.length > 0;
}

/** Puts in an order where every parent comes before its children (when both are in the list). */
function parentsFirst(list) {
  const byId = new Map(list.map(n => [n.id, n]));
  if (byId.size !== list.length) ctx.fail('invalid', 'Lo stesso elemento compare due volte');
  const out = [], state = new Map();
  const visit = n => {
    if (state.get(n.id) === 2) return;
    if (state.get(n.id) === 1) ctx.fail('invalid', 'Cartelle una dentro l\'altra in cerchio');
    state.set(n.id, 1);
    const parent = byId.get(n.parent);
    if (parent) visit(parent);
    state.set(n.id, 2);
    out.push(n);
  };
  list.forEach(visit);
  return out;
}

async function put(db, principal, n) {
  const parent = await row(db, n.parent, { lock: true });
  if (!parent || !can(principal, parent, false)) ctx.fail('not_found', 'La cartella di destinazione non esiste');
  if (!can(principal, parent, true) || parent.area === 'homes' || parent.area === 'root' || parent.id === 'fs:system') ctx.fail('forbidden', 'Non puoi scrivere in questa cartella');
  if (parent.type !== 'folder') ctx.fail('invalid', 'La destinazione non è una cartella');
  const meta = JSON.stringify(n.meta ?? {});
  const existing = await row(db, n.id, { lock: true });
  if (!existing) {
    await db.query(
      `insert into lilos_nodes (id, parent, name, type, area, owner, meta, created, modified) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [n.id, n.parent, n.name, n.type, parent.area, parent.owner, meta, n.created, n.modified]);
    return;
  }
  if (!can(principal, existing, true)) ctx.fail('forbidden', 'Elemento di un altro utente');
  if (existing.type !== n.type) ctx.fail('invalid', 'Il tipo di un elemento non cambia');
  if (existing.area !== parent.area || existing.owner !== parent.owner) ctx.fail('forbidden', 'Non si sposta in un\'altra area');
  if (existing.parent !== n.parent || existing.name !== n.name) {
    if (isFixed(existing)) ctx.fail('forbidden', 'Elemento di sistema');
    if (existing.parent !== n.parent && await isInside(db, n.parent, n.id)) ctx.fail('invalid', 'Una cartella non può andare dentro se stessa');
  }
  await db.query(
    `update lilos_nodes set parent = $2, name = $3, meta = $4, created = $5, modified = $6, rev = nextval('lilos_rev') where id = $1`,
    [n.id, n.parent, n.name, meta, n.created, n.modified]);
}

async function removeOne(db, principal, id) {
  const r = await row(db, checkId(id), { lock: true });
  if (!r || !can(principal, r, false)) ctx.fail('not_found', 'Elemento inesistente');
  if (!can(principal, r, true) || isFixed(r)) ctx.fail('forbidden', 'Elemento di sistema');
  await db.query('delete from lilos_nodes where id = $1', [id]);   // the subtree goes with it (on delete cascade)
}

async function connect(url, size) {
  for (let attempt = 1; ; attempt++) {
    const candidate = new Pool({ connectionString: url, max: size, statement_timeout: 15_000 });
    try {
      await candidate.query('select 1');
      return candidate;
    } catch (err) {
      await candidate.end().catch(() => {});
      if (attempt >= 10) throw new Error(`Database non raggiungibile: ${err.message}`);
      ctx.log.warn(`Database non ancora pronto (${attempt}/10)`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

export default {
  async init(context) {
    ctx = context;
    const url = process.env.LILOS_PG_URL ?? ctx.config.url;
    if (typeof url !== 'string' || !url) throw new Error('fs-postgres: manca "url" nella configurazione (o LILOS_PG_URL)');
    pool = await connect(url, Number(ctx.config.poolSize) || 10);
    pool.on('error', err => ctx.log.error('Connessione al database', err));
    await pool.query(await readFile(join(ctx.dir, 'schema.sql'), 'utf8'));
    const now = Date.now();
    for (const b of BASE) {
      await pool.query(
        `insert into lilos_nodes (id, parent, name, type, area, created, modified) values ($1, $2, $3, 'folder', $4, $5, $5) on conflict (id) do nothing`,
        [b.id, b.parent, b.name, b.area, now]);
    }

    ctx.provide('fs', {
      async home(principal) {
        if (!isUser(principal)) ctx.fail('forbidden', 'Solo un utente ha una home');
        const id = homeId(principal.id);
        const now = Date.now();
        const { rowCount } = await pool.query(
          `insert into lilos_nodes (id, parent, name, type, area, owner, created, modified) values ($1, 'fs:home', $2, 'folder', 'home', $3, $4, $4) on conflict (id) do nothing`,
          [id, String(principal.username ?? principal.id).slice(0, MAX_NAME), principal.id, now]);
        return { id, path: `/home/${principal.username ?? principal.id}`, created: rowCount === 1 };
      },

      async stat(principal, id) {
        const r = await row(pool, checkId(id));
        return r && can(principal, r, false) ? toNode(r) : null;
      },

      async list(principal, id) {
        await readable(pool, principal, id);
        const { rows } = await pool.query(`select ${COLUMNS} from lilos_nodes where parent = $1 order by created, id`, [id]);
        return rows.filter(r => can(principal, r, false)).map(r => toNode(r));
      },

      async tree(principal, id, { content = false } = {}) {
        await readable(pool, principal, id);
        const { rows } = await pool.query(
          `with recursive t as (
             select ${COLUMNS}${content ? ', content' : ''}, 0 as depth from lilos_nodes where id = $1
             union all
             select ${COLUMNS.split(', ').map(c => `n.${c}`).join(', ')}${content ? ', n.content' : ''}, t.depth + 1
             from lilos_nodes n join t on n.parent = t.id where t.depth < ${MAX_DEPTH}
           ) select * from t order by depth, created, id`, [id]);
        return rows.filter(r => can(principal, r, false)).map(r => toNode(r, content));
      },

      async lookup(principal, path) {
        let current = await row(pool, 'fs:root');
        for (const part of String(path).split('/').filter(Boolean)) {
          const { rows } = await pool.query(
            `select ${COLUMNS} from lilos_nodes where parent = $1 and lower(name) = lower($2) order by created, id limit 1`, [current.id, part]);
          current = rows[0];
          if (!current) return null;
        }
        return can(principal, current, false) ? toNode(current) : null;
      },

      async apply(principal, { put: puts = [], remove = [] } = {}) {
        if (!Array.isArray(puts) || !Array.isArray(remove)) ctx.fail('invalid', 'Modifiche non valide');
        const ordered = parentsFirst(puts.map(checkNode));
        await tx(async db => {
          for (const n of ordered) await put(db, principal, n);
          for (const id of remove) {
            if (await row(db, checkId(id))) await removeOne(db, principal, id);   // already gone with its folder: fine
          }
        });
      },

      async read(principal, id) {
        const r = await readable(pool, principal, id, { content: true });
        if (r.type !== 'file') ctx.fail('invalid', 'Non è un file');
        return r.content ?? Buffer.alloc(0);
      },

      async write(principal, id, data) {
        if (!Buffer.isBuffer(data)) ctx.fail('invalid', 'Contenuto non valido');
        await tx(async db => {
          const r = await readable(db, principal, id, { lock: true });
          if (!can(principal, r, true)) ctx.fail('forbidden', 'Non puoi scrivere questo file');
          if (r.type !== 'file') ctx.fail('invalid', 'Non è un file');
          await db.query(`update lilos_nodes set content = $2, size = $3, modified = $4, rev = nextval('lilos_rev') where id = $1`, [id, data, data.length, Date.now()]);
        });
      },

      async remove(principal, ids) {
        if (!Array.isArray(ids)) ctx.fail('invalid', 'Elenco non valido');
        await tx(async db => {
          for (const id of ids) await removeOne(db, principal, id);
        });
      },
    });
  },

  async stop() {
    await pool?.end();
  },
};
