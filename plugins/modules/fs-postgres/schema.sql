-- lilOS file system. Applied at every start: only creates what is missing.

create sequence if not exists lilos_rev;

create table if not exists lilos_nodes (
  id        text primary key,
  parent    text references lilos_nodes(id) on delete cascade,
  name      text not null,
  type      text not null check (type in ('folder', 'file', 'app')),
  area      text not null,            -- root | system | app | commons | tmp | homes | home
  owner     text,                     -- the user whose home holds the node; null outside the homes
  meta      jsonb not null default '{}'::jsonb,
  size      bigint not null default 0,
  created   bigint not null,
  modified  bigint not null,
  content   bytea,
  rev       bigint not null default nextval('lilos_rev')
);

create index if not exists lilos_nodes_parent on lilos_nodes (parent);
create index if not exists lilos_nodes_owner on lilos_nodes (owner);

-- Big contents (1.1.0): written as a stream, they are kept in pieces of 1 MB. `chunks` says which
-- generation of pieces is the content (null: the content is in `content`); a write in progress adds
-- a new generation and switches to it only at the end.
alter table lilos_nodes add column if not exists chunks text;

create table if not exists lilos_chunks (
  node  text not null references lilos_nodes(id) on delete cascade,
  gen   text not null,
  seq   integer not null,
  data  bytea not null,
  primary key (node, gen, seq)
);

-- Size of the pieces of a generation (1.2.0): the kernel's files.dbChunk when it was written, so a
-- change of the setting does not touch the files already in pieces (null: 1 MB, as before 1.2.0).
alter table lilos_nodes add column if not exists chunk_size integer;
