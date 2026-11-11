# SQL · Oracle (connect)

`db.oracle` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Opens a connection to an **Oracle Database** server (12c or later) and sends the reference, to be linked to the **connection** input of the other database blocks. You do not need to install Oracle Client: the module talks directly to the server (*thin* mode).

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
| **server** (`info`) | object | Hidden. What the server is: `{ "kind": "oracle", "label": "Oracle", "name": "ora.esempio.it:1521", "server": "Oracle Database 23ai …" }`. |
| **Exception** (`error`) | object | When the connection fails: no such server, wrong password, unknown service, address not allowed, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Server (name or address)** (`host`) | text | empty | The database computer: a name or an address. |
| **Port** (`port`) | 1 to 65535 | 1521 | The port of Oracle's *listener*. |
| **Service name** (`serviceName`) | text | `FREEPDB1` | The service name of the database to connect to, for example `FREEPDB1` (Oracle Free) or `ORCLPDB1`. Letters, digits and `. _ $ # -`. |
| **User** (`user`) | text | empty | The user (the schema that owns the tables). |
| **Password** (`password`) | password field | empty | The user's password. What you type is not shown and is sealed by the engine. |
| **Encrypted connection (TLS)** (`tls`) | No (not encrypted), Encrypted (certificate not checked), Encrypted and checked | No (not encrypted) | Whether and how to encrypt the connection (Oracle calls it *tcps*: the encrypted port is usually 2484). |
| **Connections in the pool** (`poolSize`) | 1 to 10 | 4 | How many connections to the server the block keeps open at most (a transaction takes one). |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection and sends **connection**, then **connected**, then **server**. Otherwise the connection opens only with **connect**.
- With **connect** the block closes the connection it already had (its old reference stops working) and opens a new one.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, all the connections (and the transactions and cursors inside them) close.
- The connection is made by the **kernel**. The server's name is resolved and every address checked; this computer and the local network stay blocked unless an administrator allows them; the lilOS database never opens. See [Database blocks (SQL)](logicstudio-db).
- The **Password** is sealed by the engine for you, on this lilOS: on another lilOS or for another user it gives "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)" (password not readable, type it again) and must be typed again. It can also come from the hidden input **password**, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**.

### Oracle in particular

- **Service name**: the *service name* is needed, not the old SID. If it is empty the connection gives "Manca il servizio di Oracle…" (the Oracle service is missing).
- **Column names in upper case**: Oracle writes names typed without quotes in upper case, so the columns of a query come out as `ID`, `NOME`, `TOTALE`. To read them with [Get property](core.get) use the upper-case name. The blocks without SQL ([SQL · Read table (SELECT)](db.select), [SQL · Insert (INSERT)](db.insert)...) do it by themselves: an all-lower-case name (`clienti`, `nome`) is made upper case; a name with capitals stays as it is.
- **Parameters**: `:name` becomes `:1`, `:2`... (by position); a name used twice counts as two parameters with the same value.
- **No final semicolon**: Oracle does not accept it at the end of a statement; one statement per query.
- **Values**: `NUMBER` comes out as a number when it is exact, as text otherwise; `CLOB` as text; `BLOB` and `RAW` as `{ "$bytes": "base64" }`; `DATE` and `TIMESTAMP` as ISO text. Yes/no become 1 and 0 (the `BOOLEAN` type only exists from Oracle 23ai); objects and lists become JSON text.
- **Writing**: each row is an `INSERT` statement of its own (Oracle has no multi-row insert in one) and there is no `RETURNING`: **last id** stays empty. Outside a transaction each statement is committed at once (*autocommit*).
- **Read table**: uses `OFFSET … ROWS FETCH NEXT … ROWS ONLY`.
- **Tables**: [SQL · Tables and columns (schema)](db.tables) lists the tables and views of the user you connected with.
- **Isolation**: Oracle only knows *Read committed* (the default) and *Serializable*; *Repeatable read* and *Snapshot* become *Serializable*.
- **Encrypted connection**: the encryption is made by lilOS itself, with a small local tunnel used only by this connection. The listener's redirects to another address (RAC installations) are not followed.
- Notifications (LISTEN and NOTIFY) are not available.
- **Redirects**: lilOS always reaches the server through a small local tunnel (also without encryption) and closes the connection if the listener asks to move to another address (a *redirect*, typical of RAC and shared servers): so the kernel never reaches an address it did not check. A server that redirects cannot be used: connect to the instance directly.

## Examples

### 1. Reading an Oracle Free table

Settings: **Server** `192.168.1.40` (with the local network allowed), **Service name** `FREEPDB1`, **User** `demo`. **SQL · Query**: `SELECT id, nome, totale FROM ordini WHERE totale > :minimo ORDER BY totale DESC`.

```
[SQL · Oracle (connect)] connection ──▶ connection [SQL · Query (query)] rows ──▶ rows [Table]
[Number field: minimo] value ──▶ minimo
[Button: Search] pressed ──▶ run
```

The table's columns are `ID`, `NOME`, `TOTALE`.

### 2. Updating a row

```
[SQL · Oracle (connect)] connection ──▶ connection [SQL · Update (UPDATE): ordini] rows changed ──▶ value [Print (console.log)]
[Object literal { }: { "stato": "spedito" }] object ──▶ values
[Number field: id] value ──▶ id (added input, the condition id = value)
[Button: Ship] pressed ──▶ run
```

The statement is `UPDATE "ORDINI" SET "STATO" = :1 WHERE "ID" = :2`. Outside a transaction the change is already committed.

## Errors

The messages are in Italian, as the block sends them; the server's own messages are in English. The common errors (server, address, quotas, password not readable...) are listed on the [Database blocks (SQL)](logicstudio-db) page. In addition:

| Message | When |
|---|---|
| Il server Oracle ha chiesto di collegarsi a un altro indirizzo (redirect): non è permesso | The listener asked to move to another address (redirect, not allowed); connect to the instance directly. |
| Manca il servizio di Oracle (nome del servizio, per esempio FREEPDB1, o il database) | **Service name** is empty. |
| Nome del servizio non valido: … (lettere, cifre, . _ $ # -) | The service name has symbols that are not allowed (invalid service name). |
| La connessione TLS a Oracle non è riuscita: … | The encryption could not be set up (invalid certificate, unencrypted port...): the TLS connection to Oracle failed. |
| L'amministratore non permette i database Oracle (impostazioni del modulo logicstudio-db) | Oracle is switched off in the module settings (the administrator does not allow it). |
| Oracle non ha risposto in 30 s: la query è stata annullata | The operation went over the time limit (Oracle did not answer in 30 s: the query was cancelled). |
| La transazione è già chiusa | A transaction was used after its commit or rollback (the transaction is already closed). |
| ORA-01017: invalid credential or not authorized | Wrong user or password (the server's message). |
| ORA-12514 / NJS-518: cannot connect to database. Service … is not registered with the listener | The service name does not exist (the server's or the library's message). |
| ORA-00933: SQL command not properly ended | The SQL has a semicolon at the end or more than one statement. |

## See also

- [SQL · Query (query)](db.query), [SQL · Read table (SELECT)](db.select), [SQL · Insert (INSERT)](db.insert), [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Database blocks (SQL)](logicstudio-db), for the limits, the quotas and the module settings
- [Input (readline)](core.consoleRead), to ask whoever uses the program for the password
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
