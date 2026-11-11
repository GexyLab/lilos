# Database blocks (SQL)

`logicstudio-db` · needs the engine `logicstudio-engine` (1.7.0 or later) and the [Basic blocks](logicstudio-core)

The blocks that make a Logic Studio program talk to a SQL database: **PostgreSQL**, **MySQL and MariaDB**, **Microsoft SQL Server** (also Azure SQL), **SQLite** (a file in your home, or in memory), **Oracle** (12c or later) and **ClickHouse**. You can write the SQL by hand, with safe parameters, or read, insert, update and delete rows without writing SQL. There are also transactions, cursors for big tables, the list of tables and columns and, for PostgreSQL, notifications. In the block list of the IDE they are in the **Database** category.

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("Database blocks (SQL)"). The AppStore also installs the engine and the basic blocks, if they are missing. After the installation the blocks appear in the **Blocks** tab of the IDE.

## The blocks

A **connection** block (one per database) opens the connection and sends a reference from its **connection** output; that reference is linked to the **connection** input of all the other blocks.

| Block | Type | What it does |
|---|---|---|
| [SQL · PostgreSQL (connect)](db.postgres) | `db.postgres` | The connection to a PostgreSQL server (port 5432). |
| [SQL · MySQL · MariaDB (connect)](db.mysql) | `db.mysql` | The connection to a MySQL or MariaDB server (port 3306). |
| [SQL · SQL Server (connect)](db.mssql) | `db.mssql` | The connection to Microsoft SQL Server or Azure SQL (port 1433, or an instance). |
| [SQL · SQLite (open)](db.sqlite) | `db.sqlite` | A SQLite database in a file of your home (made when missing), or in memory. |
| [SQL · Oracle (connect)](db.oracle) | `db.oracle` | The connection to an Oracle Database server (port 1521, service name). |
| [SQL · ClickHouse (connect)](db.clickhouse) | `db.clickhouse` | The connection to a ClickHouse server, through its HTTP interface (port 8123). |
| [SQL · Query (query)](db.query) | `db.query` | Runs the SQL you write; `:name` is a parameter and each added input with that name gives its value. Sends rows, first row, rows changed. |
| [SQL · Read table (SELECT)](db.select) | `db.select` | Reads the rows of a table without SQL; each added input is a condition column = value. |
| [SQL · Insert (INSERT)](db.insert) | `db.insert` | Inserts a row or a list of rows; without **row**, the added inputs are the columns. |
| [SQL · Update (UPDATE)](db.update) | `db.update` | Changes the columns of **values** in the rows that match the conditions. |
| [SQL · Delete (DELETE)](db.delete) | `db.delete` | Deletes the rows that match the conditions. |
| [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction) | `db.transaction` | Opens a transaction: the blocks linked to its **transaction** output are confirmed or cancelled together. |
| [SQL · Read rows one by one (cursor)](db.cursor) | `db.cursor` | Runs a query and sends its rows one at a time (or in groups): for big tables. |
| [SQL · Tables and columns (schema)](db.tables) | `db.tables` | The list of tables and views, or the columns of a table. |
| [SQL · Listen (LISTEN)](db.listen) | `db.listen` | PostgreSQL only: receives the notifications of a channel while the program runs. |
| [SQL · Notify (NOTIFY)](db.notify) | `db.notify` | PostgreSQL only: sends a notification on a channel. |

## A first example

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Query (query): SELECT * FROM ordini WHERE cliente = :cliente] rows ──▶ rows [Table]
[Text field: cliente] text ──▶ cliente
[Button: Search] pressed ──▶ run
```

The program connects to the database at start. When you press **Search**, the query runs with the value of the text field as the parameter `:cliente`, and the rows go to the [Table](ui.table). The value never ends up in the SQL text: the database receives it separately, so even a name like `Rossi'; DROP TABLE ordini; --` is only a name.

## Good to know

### The kernel makes the connections

The connections do not start from your browser or from the program, but from the **kernel**, the computer lilOS runs on, on behalf of the user who owns the program. This means:

- it also works when lilOS is closed in the browser, if the program is active;
- the program never sees the password or a network link: it only holds a **reference** (an object that comes out of the **connection** output), which works for that program only. A reference copied into another program does not work ("Connessione chiusa (o di un altro programma)": connection closed, or from another program);
- when the program stops, all its connections, transactions, cursors and listenings close;
- an active program really uses the database, even when you are not looking: try it first with **Try**, especially with the blocks that write.

### The reference to the connection (handle)

The **connection** output is a small object that holds only a random code, the kind of database and the server's name. It is carried by a [link](ide/blocks) to all the blocks that must use that connection. A [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction) block sends a reference of its own (**transaction**): linked in place of the connection, it makes that block run inside the transaction.

### The password

The **Password** setting of the connection blocks is a new field, made on purpose: what you type is not shown and never comes back. The engine **seals** it (AES-GCM) for you, on this lilOS, and the schema keeps only the sealed text. So:

- whoever opens the schema (or a project file) does not see the password;
- another user, or the same schema on another lilOS, **cannot open it**: the connection gives the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: it must be typed again in the block's Properties; the schema comes from another user or another lilOS), and the password must be typed again;
- the password can also come from the hidden input **password**, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**: then it is not saved anywhere. A non-empty value on the input wins over the one in the settings.

The server's errors, including those that could contain the password, come out of **Exception** on one line and without the password (three dots take its place).

### The encrypted connection (TLS)

The connection blocks (except SQLite) have the **Encrypted connection (TLS)** choice:

| Choice | What it means |
|---|---|
| **No (not encrypted)** | No encryption: password and data travel in the clear. Fine only on a network you trust. |
| **Encrypted, certificate not checked** | The data travels encrypted, but the server's certificate is not checked: it protects from whoever listens, not from whoever pretends to be the server. |
| **Encrypted and checked** | Encrypted, and the certificate (chain and server name) must be valid: an expired, self-signed or other-name certificate gives an error. |

The starting value is **No** for PostgreSQL, MySQL and MariaDB, Oracle and ClickHouse, and **Encrypted, certificate not checked** for SQL Server. For a server on the internet use **Encrypted and checked**.

### The addresses and the administrator's setting

The server's name is resolved and **every** address it has is checked before connecting; then the connection goes to the address that was checked. So a name cannot be moved to a forbidden address between the check and the connection.

- **Never allowed**, not even by the administrator: the "link-local" addresses `169.254.x.x` and `fe80::…` (where many clouds keep the machine's secret data), multicast addresses, `0.x.x.x`, `255.255.255.255` and `::`.
- **Blocked unless the administrator allows them**: this computer (`127.x.x.x`, `localhost`, `::1`), local networks (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), the carriers' shared network (`100.64.x.x`–`100.127.x.x`), reserved and documentation addresses, and IPv6 addresses that carry an IPv4 address inside.
- To allow the second group, an administrator ticks **Allow databases on this computer and on the local network** in the module settings.

A database on your home or office network therefore needs an administrator to tick that box. SQLite does not use the network and is not touched by these rules.

### The lilOS database is never opened

The databases lilOS uses for itself (for example the one of `fs-postgres`, written in the kernel's configuration) **cannot be reached** by the blocks, not even with the local network allowed and not even under another name of the same computer: the connection gives "Questo è il database di lilOS: i blocchi non possono usarlo" (this is lilOS's own database: the blocks cannot use it). On the same server you can use another database or another port, not the one of lilOS.

### The values

- Big numbers (`bigint`, `numeric`, `NUMBER`...) come out as numbers when they are exact, and as **text** when a Logic Studio number could not represent them without losing digits.
- Dates and times come out as **ISO text** (`2026-11-11T10:05:00.000Z`).
- Binary data comes out as `{ "$bytes": "base64" }`; an object of that shape, sent to a block, becomes binary again.
- Objects and lists sent to a database that has no type for them (MySQL, SQL Server, SQLite, Oracle) become JSON text; PostgreSQL receives them as JSON.
- `null` values are the database's "nothing".
- Each database has its own particulars: they are on the page of its connection block.

### The conditions of the blocks without SQL

For [SQL · Read table (SELECT)](db.select), [SQL · Update (UPDATE)](db.update) and [SQL · Delete (DELETE)](db.delete), each added input is a `column = value` condition (the input's name is the column's name), joined with **AND**. A `null` value becomes `IS NULL`; a list becomes `IN (…)` (an empty list finds no rows). The object on the hidden input **conditions** adds more columns. Table and column names are checked (letters, digits and `_`, at most 63 characters) and quoted for that database; `schema.table` names a schema. Update and Delete **without** conditions do nothing: they give an error, unless **All the rows** is ticked.

### Module settings

An administrator changes them, in the settings of the `logicstudio-db` module, and they count from the next operation for all programs.

| Setting | Default | Values | What it does |
|---|---|---|---|
| **Allow databases on this computer and on the local network** | no | yes / no | If ticked, connections may go to `localhost`, `192.168.x.x`, `10.x.x.x` and the other non-public networks. Link-local and multicast addresses and the lilOS databases stay forbidden. |
| **Time limit of an operation (seconds)** | 30 | 1 to 600 | How long a connection or a query may last. When it runs out, the operation stops with an error. |
| **Rows of a result, at most** | 10000 | 1 to 1000000 | The highest number of rows that a query, a read or a cursor give. If there are more, **cut** (or **more rows**) is true and the others do not come out. |
| **Size of a result, at most (KB)** | 4096 | 16 to 65536 | How big a result may be (measured as JSON). If it is bigger, an error. |
| **Open connections per user, at most** | 10 | 1 to 100 | The connections open together from all the programs of a user. |
| **Operations per minute per user, at most** | 600 | 1 to 100000 | The operations (queries, reads, writes, cursor steps, opening connections...) a user may do in a minute. |
| **Size of a SQLite file, at most (MB)** | 1024 | 1 to 1024 | How big the file of a SQLite database may be. |
| **Allow PostgreSQL**, **MySQL and MariaDB**, **SQL Server**, **SQLite**, **Oracle**, **ClickHouse** | yes | yes / no | Which databases may be used. A switched-off kind gives an error at the connection. |

### Quotas and limits

| What | Limit |
|---|---|
| Operations per minute, per user | 600 by default (module setting); it counts for all the user's programs together, tests included |
| Open connections, per user | 10 by default (module setting) |
| Time of an operation | 30 seconds by default (module setting) |
| Rows of a result | 10000 by default (module setting) |
| Size of a result | 4096 KB by default (module setting) |
| Text of a query | 100000 characters |
| Parameters of a query | 2000 (SQL Server), 1000 (Oracle, ClickHouse), 999 (SQLite), 30000 (PostgreSQL, MySQL and MariaDB) |
| Rows of a single [SQL · Insert (INSERT)](db.insert) | as many as the rows of a result, at most |
| Time limit of a block | 30 seconds by default (Control Panel → Logic Studio → **Limits**): it holds even if the time limit of an operation is longer |

These operations are the database's; they are not mixed up with the network requests of the [Network blocks](logicstudio-net) package. See also [Limits](logicstudio-engine/limits).

### The SQLite files

SQLite has no server: the database is a file in **your home**, for example `~/Documenti/dati.sqlite`. The file is read and written **as you**, so your rules and your space quota apply. Only the files of your home (`~/…` or `/home/<user>/…`): never the `.config` folder, never a file whose content is protected by an app.

- The file is read **whole into memory** when the block connects and written back **one second after the last change**, at each **commit** of a transaction and at the close. If a query that lasts too long is stopped, the changes not yet saved are lost.
- A file open **for writing** belongs to **one program at a time**; another program gets an error, or can open it with **Read only**.
- With **In memory** there is no file: the database lives while the program runs.
- A new file is made (empty) when you connect, in the folder you name, which must exist.
- SQLite runs in a **thread of its own**: a query that lasts too long is stopped without blocking lilOS.
- The maximum size is the **Size of a SQLite file, at most (MB)** setting (1024 at most).

The details are on the [SQL · SQLite (open)](db.sqlite) page.

### Apps made with Create app

An app made with **Create app** that contains database blocks uses the database on behalf of whoever launches it, with their quotas. See [Permissions](logicstudio-engine/permissions) and [Making an app](ide/create-app).

### The most common errors

Errors come out of the block's **Exception** output, in Italian and on one line. The ones that hold for all blocks:

| Message | When |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value (the connection is missing). |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed (by **close**, by a new **connect** or because the program stopped): open it again with the connection block. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute (too many operations). |
| Il database non ha risposto in 30 s | The operation went over the time limit (the drivers also say "… non ha risposto in 30 s: la query è stata annullata", the query was cancelled). |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size (ask for fewer rows or columns). |
| Troppe connessioni aperte: al massimo 10 per utente | You have too many open connections. |
| Il programma non è in esecuzione | The program was stopping (the program is not running). |

The connection errors (server, address, password...) are listed on the page of each connection block; the SQL ones (a table that does not exist, a wrong column...) are written by the database.

## Libraries

The databases are reached with these libraries, included in the module:

| Library | For | License |
|---|---|---|
| `pg` | PostgreSQL | MIT |
| `mysql2` | MySQL and MariaDB | MIT |
| `tedious` | SQL Server | MIT |
| `sql.js` | SQLite (SQLite compiled to WebAssembly) | MIT |
| `oracledb` (*thin* mode, no Oracle Client) | Oracle | Apache-2.0 or UPL-1.0 |

ClickHouse uses its HTTP interface, with no library. The licenses are also in Control Panel → About → Credits.

## Known limits

- MySQL and MariaDB accept a single statement per query.
- ClickHouse has no transactions.
- SQL · Listen (LISTEN) and SQL · Notify (NOTIFY) exist only for PostgreSQL.
- The NoSQL databases (MongoDB, Redis...) are not in this package yet.

## See also

- [Basic blocks](logicstudio-core), [Network blocks](logicstudio-net), [lilOS blocks](logicstudio-lilos)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits), [Permissions](logicstudio-engine/permissions)
- [How a block works](ide/blocks)
