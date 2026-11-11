# SQL · PostgreSQL (connect)

`db.postgres` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Opens a connection to a **PostgreSQL** server and sends the reference, to be linked to the **connection** input of the other database blocks. It also works with servers compatible with PostgreSQL (for example Supabase, Neon, CockroachDB, Amazon RDS).

## Inputs

| Port | Type | Description |
|---|---|---|
| **connect** (`connect`) | pulse | Any value arriving here opens the connection (if this block already has one, it closes it first). |
| **close** (`close`) | pulse | Hidden. Closes the connection. |
| **password** (`password`) | text | Hidden. The password, if you do not want to keep it in the settings. If it has a non-empty value, it takes the place of the **Password** of the settings. **It does not start the block**: it only holds the value for the next connection. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **connection** (`connection`) | object | The reference to the open connection. It only works for this program. |
| **connected** (`connected`) | yes/no | `true` when the connection is open, `false` when it is closed with **close**. |
| **server** (`info`) | object | Hidden. What the server is: `{ "kind": "postgres", "label": "PostgreSQL", "name": "db.esempio.it:5432/vendite", "server": "PostgreSQL 16.2 …" }`. |
| **Exception** (`error`) | object | When the connection fails: no such server, wrong password, address not allowed, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Server (name or address)** (`host`) | text | empty | The database computer: a name (`db.esempio.it`) or an address (`192.168.1.20`). |
| **Port** (`port`) | 1 to 65535 | 5432 | PostgreSQL's port. |
| **Database** (`database`) | text | empty | The database to connect to. Empty: the user's default one. |
| **User** (`user`) | text | empty | The user. |
| **Password** (`password`) | password field | empty | The user's password. What you type is not shown and is sealed by the engine (see below). |
| **Encrypted connection (TLS)** (`tls`) | No (not encrypted), Encrypted (certificate not checked), Encrypted and checked | No (not encrypted) | Whether and how to encrypt the connection. The server must have SSL on for the encrypted choices. |
| **Connections in the pool** (`poolSize`) | 1 to 10 | 4 | How many connections to the server the block keeps open at most, for operations that arrive together (a transaction takes one). |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection and sends **connection**, then **connected**, then **server**. Otherwise the connection opens only with **connect**.
- With **connect** the block closes the connection it already had (its old reference stops working) and opens a new one with the settings of that moment.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, all the connections (and the transactions, cursors and listenings inside them) close.
- The connection is made by the **kernel**, not by the program. The server's name is resolved and every address checked: this computer and the local network stay blocked unless an administrator allows them; the database lilOS uses for itself never opens. See [Database blocks (SQL)](logicstudio-db).
- The server's errors come out of **Exception** on one line, without the password.

### The password

The **Password** setting is sealed by the engine (AES-GCM) for you, on this lilOS: the schema keeps only the sealed text. Another user, or the same schema on another lilOS, cannot open it and gets the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: it must be typed again in the block's Properties): the password must be typed again. It can also come from the hidden input **password**, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**; a non-empty value on the input wins over the one in the settings.

### PostgreSQL in particular

- **Values**: `bigint` and `numeric` numbers come out as numbers when they are exact, as text when they would not be (too many digits for a Logic Studio number). Dates and times come out as ISO text (`2026-11-11T10:05:00.000Z`). JSON and JSONB values come out as objects and lists, arrays as lists, `bytea` as `{ "$bytes": "base64" }`.
- **Parameters**: `:name` becomes `$1`, `$2`...; the same name used twice is a single parameter. Casts like `::int`, strings, quoted names and text between `$$…$$` are not touched.
- **Writing**: [SQL · Insert (INSERT)](db.insert) uses `RETURNING *`: the inserted rows come out and **last id** is the first field of the last row.
- **Cursor**: [SQL · Read rows one by one (cursor)](db.cursor) uses a server cursor inside a read-only transaction.
- **Notifications**: only PostgreSQL has [SQL · Listen (LISTEN)](db.listen) and [SQL · Notify (NOTIFY)](db.notify). Each listening keeps one connection of the pool busy.
- **Tables**: [SQL · Tables and columns (schema)](db.tables) lists the tables and views of all schemas, except `pg_catalog` and `information_schema`.
- **Isolation**: *Snapshot* does not exist in PostgreSQL and is ignored (the database's default applies).
- The time limit of an operation is also the server's `statement_timeout`. The server sees the connection as `application_name` = `lilOS Logic Studio`.

## Examples

### 1. A table in a window

Settings: **Server** `db.esempio.it`, **Database** `vendite`, **User** `anna`, **Password** (typed in the field), **Encrypted connection (TLS)** "Encrypted and checked". **SQL · Query (query)**: `SELECT id, cliente, totale FROM ordini ORDER BY id DESC LIMIT 50`.

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Query (query)] rows ──▶ rows [Table]
[Button: Refresh]      pressed ───────────────────▶ run              Exception ──▶ value [Print (console.log)]
```

At start the program connects; each time you press the [Button](ui.button) **Refresh**, [SQL · Query (query)](db.query) reads the orders again and the [Table](ui.table) shows them.

### 2. The password asked of whoever uses the program

Untick **Connect at start** and leave **Password** empty.

```
[Input (readline): "Password?", Hide what is typed] value ──▶ password [SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Tables and columns (schema)] tables ──▶ value [Print (console.log)]
[Button: Connect] pressed ─────────────────────────────────────────▶ connect                    connected ──▶ run
```

The password arrives on the hidden input, which holds it without starting the block. The [Button](ui.button) opens the connection; when the block sends **connected**, [SQL · Tables and columns (schema)](db.tables) lists the tables.

### 3. Receiving the database's alerts

A function of the database does `NOTIFY ordini` when a new order arrives.

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Listen (LISTEN): ordini] message ──▶ value [Print (console.log)]
```

[SQL · Listen (LISTEN)](db.listen) starts by itself as soon as the connection arrives and sends every notification on the channel `ordini`.

## Errors

The messages are in Italian, as the block sends them; the server's own messages are in the server's language (English). The most common network and quota errors (unknown server, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many connections, password not readable...) are listed on the [Database blocks (SQL)](logicstudio-db) page. In addition:

| Message | When |
|---|---|
| Manca il server | **Server** is empty (missing server). |
| Server sconosciuto: … / Server non raggiungibile: … (…) | The name does not exist, or the network does not reach the server (unknown server / server not reachable). |
| Porta non valida: … | **Port** is not between 1 and 65535 (invalid port). |
| Indirizzo non permesso: … | The address is forbidden (local network without the administrator's permission, link-local, multicast): address not allowed. |
| L'amministratore non permette i database PostgreSQL (impostazioni del modulo logicstudio-db) | PostgreSQL is switched off in the module settings (the administrator does not allow it). |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…) | The password was sealed by another user or on another lilOS. |
| PostgreSQL non ha risposto in 30 s | The server did not answer within the time limit of an operation (PostgreSQL did not answer in 30 s). |
| password authentication failed for user "…" | The server refuses the user or the password (the message is the server's). |
| The server does not support SSL connections | You chose an encrypted connection, but the server has no SSL on. |

## See also

- [SQL · Query (query)](db.query), [SQL · Read table (SELECT)](db.select), [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [SQL · Listen (LISTEN)](db.listen), [SQL · Notify (NOTIFY)](db.notify), PostgreSQL only
- [Database blocks (SQL)](logicstudio-db), for the limits, the quotas and the module settings
- [Input (readline)](core.consoleRead), to ask whoever uses the program for the password
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
