# SQL · ClickHouse (connect)

`db.clickhouse` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Opens a connection to a **ClickHouse** server and sends the reference, to be linked to the **connection** input of the other database blocks. The module uses ClickHouse's **HTTP** interface (port 8123), with no library. ClickHouse is a database made for big amounts of data to read and analyse (logs, measures over time).

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
| **server** (`info`) | object | Hidden. What the server is: `{ "kind": "clickhouse", "label": "ClickHouse", "name": "ch.esempio.it:8123/misure", "server": "ClickHouse 24.8.1.1" }`. |
| **Exception** (`error`) | object | When the connection fails: no such server, wrong password, address not allowed, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Server (name or address)** (`host`) | text | empty | The database computer: a name or an address. |
| **Port** (`port`) | 1 to 65535 | 8123 | ClickHouse's HTTP port. With the encrypted connection (HTTPS) it is usually **8443**: type it by hand. |
| **Database** (`database`) | text | empty | The starting database. Empty: the server's default one (`default`). |
| **User** (`user`) | text | `default` | The user. |
| **Password** (`password`) | password field | empty | The user's password (it may be empty: the `default` user usually has none). What you type is not shown and is sealed by the engine. |
| **Encrypted connection (TLS)** (`tls`) | No (not encrypted), Encrypted (certificate not checked), Encrypted and checked | No (not encrypted) | Whether and how to encrypt the connection: "No" uses HTTP, the other two HTTPS. |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

This block has no **Connections in the pool**: each statement is an HTTP request of its own.

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection (it asks the server for its version) and sends **connection**, then **connected**, then **server**. Otherwise the connection opens only with **connect**.
- With **connect** the block closes the connection it already had (its old reference stops working) and opens a new one.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, the requests in progress stop and the connection closes.
- The connection is made by the **kernel**. The server's name is resolved and every address checked; this computer and the local network stay blocked unless an administrator allows them; the lilOS database never opens. See [Database blocks (SQL)](logicstudio-db).
- The **Password** is sealed by the engine for you, on this lilOS: on another lilOS or for another user it gives "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)" (password not readable, type it again) and must be typed again. It can also come from the hidden input **password**, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**. User and password travel in the request's headers, never in the address.

### ClickHouse in particular

- **No transactions**: ClickHouse does not undo changes. The [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction) block with a ClickHouse connection gives the error "ClickHouse non annulla le modifiche: le transazioni non sono supportate" (ClickHouse does not roll back changes: transactions are not supported).
- **Very big inserts**: an [SQL · Insert (INSERT)](db.insert) with many rows is split into several statements (at most 1000 parameters each, for example 250 rows of 4 columns). With the other databases the statements run in a transaction; ClickHouse has none, so if a statement in the middle fails, the rows of the statements before it **stay inserted**.
- **Parameters**: `:name` becomes the server's parameter `{p1:Type}`, with the type chosen from the value: integer (`Int64`), decimal (`Float64`), yes/no (`Bool`), text (`String`), binary (as hexadecimal text, `unhex`). A text stays a `String`: for a date use `toDateTime(:quando)` (or `parseDateTimeBestEffort(:quando)`) in the SQL.
- **Values**: 64-bit and bigger integers come out as numbers when they are exact, as text otherwise; the rest as ClickHouse writes it in JSON (dates and times as text).
- **Rows read as they come**: the response arrives row by row and reading stops after the module's maximum rows (plus one, to say **cut**). A response over 64 MB stops with "Risposta di ClickHouse troppo grande".
- **FORMAT**: if the query ends with `FORMAT …` (for example `FORMAT CSV`), the response text comes out as it is in a single row `{ "result": "…" }`.
- **Rows changed**: for statements that write, **rows changed** is the number of written rows the server declares (ClickHouse does not say it for all). **Last id** stays empty.
- **Update and Delete**: the [SQL · Update (UPDATE)](db.update) and [SQL · Delete (DELETE)](db.delete) blocks write `UPDATE … SET …` and `DELETE FROM …`, which only work with the ClickHouse versions that accept them and only on some tables; otherwise write the statement yourself (`ALTER TABLE … UPDATE …`) with [SQL · Query (query)](db.query).
- **Cursor**: [SQL · Read rows one by one (cursor)](db.cursor) reads the response as it goes, one group at a time.
- **Tables**: [SQL · Tables and columns (schema)](db.tables) lists the tables and views of the chosen database.
- Notifications (LISTEN and NOTIFY) are not available.

## Examples

### 1. The values of the last hours

**SQL · Query**: `SELECT toStartOfHour(quando) AS ora, avg(valore) AS media FROM misure WHERE quando > now() - INTERVAL 24 HOUR GROUP BY ora ORDER BY ora`.

```
[SQL · ClickHouse (connect)] connection ──▶ connection [SQL · Query (query)] rows ──▶ rows [Table]
[Interval (setInterval): 300 s] pulse ──────────────────▶ run
```

### 2. Searching with a parameter

```
[SQL · ClickHouse (connect)] connection ──▶ connection [SQL · Query (query): SELECT count() FROM eventi WHERE sensore = :sensore AND quando > toDateTime(:da)] value ──▶ value [Value: eventi]
[Selection: sensore] value ──▶ sensore (added input)
[Text field: da] text ──▶ da (added input)
[Button: Count] pressed ──▶ run
```

SQL query's hidden **value** output is the first value of the first row: here the number of events. With `da` = `2026-11-01 00:00:00` the query counts the events of the chosen sensor since then.

## Errors

The messages are in Italian, as the block sends them; the server's own messages are in English. The common errors (server, address, quotas, password not readable...) are listed on the [Database blocks (SQL)](logicstudio-db) page. In addition:

| Message | When |
|---|---|
| L'amministratore non permette i database ClickHouse (impostazioni del modulo logicstudio-db) | ClickHouse is switched off in the module settings (the administrator does not allow it). |
| ClickHouse non annulla le modifiche: le transazioni non sono supportate | [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction) was used with a ClickHouse connection. |
| ClickHouse non ha risposto in 30 s: la query è stata annullata | The operation went over the time limit (ClickHouse did not answer in 30 s: the query was cancelled). |
| Risposta di ClickHouse troppo grande (oltre 64 MB): chiedi meno righe o colonne | The response is over 64 MB (ask for fewer rows or columns). |
| La risposta di ClickHouse si è interrotta | The server closed the connection halfway through the response (the response was interrupted). |
| Connessione chiusa | The connection was used after being closed. |
| Code: 516. DB::Exception: … Authentication failed | Wrong user or password (the server's message). |
| Code: 60. DB::Exception: Table … does not exist | The table does not exist (the server's message). |

## See also

- [SQL · Query (query)](db.query), [SQL · Read table (SELECT)](db.select), [SQL · Insert (INSERT)](db.insert), [SQL · Read rows one by one (cursor)](db.cursor)
- [Database blocks (SQL)](logicstudio-db), for the limits, the quotas and the module settings
- [Input (readline)](core.consoleRead), to ask whoever uses the program for the password
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
