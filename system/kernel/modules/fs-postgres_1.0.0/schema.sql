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
