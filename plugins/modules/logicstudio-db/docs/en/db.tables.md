# SQL · Tables and columns (schema)

`db.tables` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Lists the **tables and views** of the database; with a table's name, it lists its **columns**. It is useful to find out what a database looks like before writing queries, or to build a program that adapts to the tables it finds.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the read. |
| **connection** (`connection`) | object | The reference of a connection block. It does not start the block. |
| **table** (`table`) | text | If it has a non-empty value, it takes the place of the **Table** of the settings: the block lists that table's columns. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **tables** (`tables`) | list | Without a table: the tables and views, each `{ "schema": "public", "name": "ordini", "type": "table" }` (`type` is `table` or `view`). |
| **columns** (`columns`) | list | With a table: the columns, each `{ "name": "id", "type": "integer", "nullable": false, "default": "nextval(…)", "key": true }`. |
| **Exception** (`error`) | object | When the read fails: missing or closed connection, time out... |

Each time **only one** of the two outputs comes out: **tables** if there is no table, **columns** if there is.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Table (empty: all the tables)** (`table`) | text | empty | The table whose columns to list, when the **table** input has no value. Empty: lists the tables. `schema.table` names a schema. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**:

- **without a table** the block sends on **tables** the list of tables and views (at most the module's maximum rows, 10000 by default);
- **with a table** it sends on **columns** its columns, in the order they have in the table.

The columns have: `name`, `type` (the type, as the database writes it: `integer`, `varchar(80)`, `NUMBER(10,2)`...), `nullable` (yes/no: accepts `NULL`), `default` (the default value, or `null`) and `key` (yes/no: part of the primary key).

### What each database lists

| Database | Tables |
|---|---|
| PostgreSQL | Tables and views of all schemas, except `pg_catalog` and `information_schema`. With `schema.table` you choose the schema; without, the current one. |
| MySQL · MariaDB | Those of the database chosen in the connection (`schema` is the database's name). |
| SQL Server | Those of the database chosen in the connection. |
| SQLite | The tables and views of the file (without the `sqlite_…` system ones), with the schema `main`. |
| Oracle | The tables and views of the user you connected with (`schema` is its name). Names are in upper case. |
| ClickHouse | Those of the database chosen in the connection. |

The names of columns and tables that come out can be used in the other database blocks: for example the **name** of each item of **tables** goes into the **table** input of [SQL · Read table (SELECT)](db.select).

## Examples

### 1. Discovering the tables

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Tables and columns (schema)] tables ──▶ rows [Table]
[Button: List] pressed ──▶ run
```

The [Table](ui.table) shows `schema`, `name` and `type` of each table and view.

### 2. The columns of a chosen table

Use the hidden **table** input.

```
[Selection: table] value ──▶ table [SQL · Tables and columns (schema)] columns ──▶ rows [Table]
[SQL · MySQL · MariaDB (connect)] connection ──▶ connection
[Button: Show] pressed ──▶ run
```

Choose `clienti` and press **Show**: the table shows name, type, whether it accepts `NULL`, the default value and whether it is the key.

### 3. Checking that a table exists

```
[SQL · SQLite (open)] connection ──▶ connection [SQL · Tables and columns (schema)] tables ──▶ list [Store (set · get)]
[On start (main)] pulse ──▶ run
```

At start the program reads the list of tables and keeps it in memory; with [SQL · Query (query)](db.query) you can then create, only if it is missing, the table you need (`CREATE TABLE IF NOT EXISTS …`).

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Questa non è una connessione né una transazione | The **connection** input holds the reference of a cursor or a listening. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The list is over the maximum size. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| Il database non ha risposto in 30 s | The read went over the time limit. |

A table that does not exist gives an empty **columns**, not an error.

## See also

- [SQL · Read table (SELECT)](db.select), [SQL · Query (query)](db.query)
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
