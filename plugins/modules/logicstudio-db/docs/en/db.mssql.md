# SQL · SQL Server (connect)

`db.mssql` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Opens a connection to **Microsoft SQL Server** (also **Azure SQL**) and sends the reference, to be linked to the **connection** input of the other database blocks. It connects with a SQL Server user and password (sign-in with a Windows account is not available).

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
| **server** (`info`) | object | Hidden. What the server is: `{ "kind": "mssql", "label": "SQL Server", "name": "srv.esempio.it:1433/magazzino", "server": "SQL Server …" }`. |
| **Exception** (`error`) | object | When the connection fails: no such server, wrong password, address not allowed, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Server (name or address)** (`host`) | text | empty | The database computer: a name (`srv.esempio.it`, or `mio.database.windows.net` for Azure SQL) or an address. |
| **Port** (`port`) | 1 to 65535 | 1433 | SQL Server's port. It does not count if you write an **Instance**. |
| **Instance (empty: the port)** (`instance`) | text | empty | The name of a named instance (for example `SQLEXPRESS`). See below. |
| **Database** (`database`) | text | empty | The database to connect to. Empty: the user's default one. |
| **User** (`user`) | text | empty | The SQL Server user (for example `sa`). |
| **Password** (`password`) | password field | empty | The user's password. What you type is not shown and is sealed by the engine. |
| **Encrypted connection (TLS)** (`tls`) | No (not encrypted), Encrypted (certificate not checked), Encrypted and checked | Encrypted (certificate not checked) | Whether and how to encrypt the connection. Azure SQL always wants the encrypted connection. |
| **Connections in the pool** (`poolSize`) | 1 to 10 | 4 | How many connections to the server the block keeps open at most (a transaction takes one). Free ones close after 30 seconds. |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection and sends **connection**, then **connected**, then **server**. Otherwise the connection opens only with **connect**.
- With **connect** the block closes the connection it already had (its old reference stops working) and opens a new one.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, all the connections (and the transactions and cursors inside them) close.
- The connection is made by the **kernel**. The server's name is resolved and every address checked; this computer and the local network stay blocked unless an administrator allows them; the lilOS database never opens. See [Database blocks (SQL)](logicstudio-db).
- The **Password** is sealed by the engine for you, on this lilOS: on another lilOS or for another user it gives "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)" (password not readable, type it again) and must be typed again. It can also come from the hidden input **password**, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**.

### SQL Server in particular

- **Instance**: with an instance name the block asks the port to the *SQL Server Browser* service (UDP port 1434) of the same computer; the **Port** is not used. Without an instance the **Port** is used (1433 by default). The Browser service and the UDP port must be reachable.
- **Encryption**: the default is "Encrypted (certificate not checked)", because many servers have a certificate of their own. For Azure SQL and for servers with a real certificate choose "Encrypted and checked".
- **Pool**: the block keeps a small pool of its own (a connection runs one request at a time).
- **Values**: `BIGINT` comes out as a number when it is exact, as text otherwise; `DECIMAL`, `NUMERIC` and `MONEY` come out as numbers; dates and times as ISO text; `VARBINARY` as `{ "$bytes": "base64" }`. A column without a name comes out as `col1`, `col2`...
- **Parameters**: `:name` becomes `@p1`, `@p2`..., with the type chosen from the value (integer, decimal, yes/no, Unicode text, binary). An ISO text stays text: use `CONVERT` or `CAST` in the SQL if you need a date.
- **More statements**: a query may have more statements; the last result that has rows comes out.
- **Writing**: [SQL · Insert (INSERT)](db.insert) uses `OUTPUT INSERTED.*`: the inserted rows come out and **last id** is the first field of the last row (usually the `IDENTITY` column).
- **Read table**: with **Skip rows** the block uses `OFFSET … FETCH` (and `ORDER BY (SELECT NULL)` if you choose no order); without it, `TOP`.
- **Names**: between square brackets (`[clienti]`).
- **Isolation**: SQL Server is the only one that also knows *Snapshot* (the database must have it switched on).
- Notifications (LISTEN and NOTIFY) are not available.

## Examples

### 1. Reading a warehouse every minute

Settings: **Server** `srv.esempio.it`, **Database** `magazzino`, **User** `lettore`, **Encrypted connection (TLS)** "Encrypted and checked". **SQL · Query**: `SELECT TOP 20 codice, giacenza FROM articoli ORDER BY giacenza`.

```
[SQL · SQL Server (connect)] connection ──▶ connection [SQL · Query (query)] rows ──▶ rows [Table]
[Interval (setInterval): 60 s] pulse ──────────▶ run
```

### 2. A named instance

**Server** `192.168.1.30`, **Instance** `SQLEXPRESS`; the administrator has ticked "Allow databases on this computer and on the local network".

```
[SQL · SQL Server (connect)] connection ──▶ connection [SQL · Tables and columns (schema)] tables ──▶ rows [Table]
[Button: Connect] pressed ──▶ connect                connected ──▶ run
```

**Connect at start** is not ticked: the [Button](ui.button) opens the connection; when **connected** arrives, [SQL · Tables and columns (schema)](db.tables) lists the tables and views.

## Errors

The messages are in Italian, as the block sends them; the server's own messages are in English. The common errors (server, address, quotas, password not readable...) are listed on the [Database blocks (SQL)](logicstudio-db) page. In addition:

| Message | When |
|---|---|
| Manca il server | **Server** is empty (missing server). |
| L'amministratore non permette i database SQL Server (impostazioni del modulo logicstudio-db) | SQL Server is switched off in the module settings (the administrator does not allow it). |
| SQL Server non ha risposto in 30 s: la query è stata annullata | The operation went over the time limit (SQL Server did not answer in 30 s: the query was cancelled). |
| Tutte le 4 connessioni a SQL Server sono occupate da … s | All the connections of the pool are in use, for example by open transactions (all 4 connections are busy for … s). |
| La transazione è già chiusa | A transaction was used after its commit or rollback (the transaction is already closed). |
| Login failed for user '…' | Wrong user or password (the server's message). |
| Failed to connect to … in … ms | The server or the instance does not answer (the library's message). |

## See also

- [SQL · Query (query)](db.query), [SQL · Read table (SELECT)](db.select), [SQL · Insert (INSERT)](db.insert), [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Database blocks (SQL)](logicstudio-db), for the limits, the quotas and the module settings
- [Input (readline)](core.consoleRead), to ask whoever uses the program for the password
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
