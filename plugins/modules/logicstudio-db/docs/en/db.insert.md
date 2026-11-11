# SQL · Insert (INSERT)

`db.insert` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Inserts a row, or a list of rows, into a table **without writing SQL**. The row is an object `{ "column": value }` on the **row** input; if you do not use it, the added inputs are the row's columns. The values go separately, as parameters.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the insert. |
| **connection** (`connection`) | object | The reference of a connection block (or of a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)). It does not start the block. |
| **row** (`row`) | any | An object `{ "column": value }` (one row) or a list of objects (several rows). If it has a value (even an empty one, but not `null`), the added inputs are not used. It does not start the block. |
| **table** (`table`) | text | Hidden. If it has a non-empty value, it takes the place of the **Table** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rows inserted** (`affected`) | number | How many rows were inserted. |
| **last id** (`lastId`) | any | The number the database generated for the new row (`AUTO_INCREMENT`, `IDENTITY`, `INTEGER PRIMARY KEY`...), where the database gives it; otherwise `null`. |
| **rows inserted** (`rows`) | list | Hidden. The inserted rows, as the database returned them (with the generated values). Only with PostgreSQL, SQL Server and SQLite; empty in the others. |
| **Exception** (`error`) | object | When the insert fails: invalid name, a row that is not an object, a value the database does not accept, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Table (schema.table for a schema)** (`table`) | text | empty | The table to insert into, when the **table** input has no value. `schema.table` names a schema. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 32 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **column** of the row: it is called **column 1**... and must be **renamed** with the column's name, for example `nome`.

The added inputs **only hold their value**: a value arriving there does not start the insert, even if the input "starts it". The insert starts only with **run**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**:

1. The row is the value of **row**, if it has one (not `null`); otherwise the object made with the added inputs that have a value.
2. The block writes `INSERT INTO table (columns) VALUES (…)` with the values as parameters and runs it.
3. It sends **rows inserted**, **last id** and the returned rows.

- **More rows**: a list of objects inserts all the rows. The columns are those of the **first** row: a column missing in another row is `NULL`, an extra one is ignored. At most as many rows as the module's maximum rows of a result (10000 by default).
- **Split statements**: if there are many rows, they are inserted in several statements (to respect the maximum number of parameters). The block puts them together in a **transaction** (all or none), unless you are already inside one: if you link the **transaction** of a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction), it decides. Oracle inserts one row per statement. ClickHouse has no transactions: the statements run one after the other, and if one fails the rows of the ones before stay inserted.
- **last id**: PostgreSQL, SQL Server and SQLite take it from the returned row (the **first** field of the last row: if your table does not start with the key column, use the hidden **rows inserted** output); MySQL and MariaDB give the `AUTO_INCREMENT` number; Oracle and ClickHouse do not give it.
- **Names**: table and columns (letters, digits and `_`, at most 63 characters) are checked and quoted for the database. On Oracle an all-lower-case name is written upper case.
- **Values**: `null` is `NULL`. Objects and lists become JSON text (PostgreSQL gets them as JSON); `{ "$bytes": "base64" }` becomes binary; an ISO text is a date where the database accepts it. See [Database blocks (SQL)](logicstudio-db).

## Examples

### 1. Saving a row from a form

Add the inputs `nome` and `email`. **Table** `iscritti`.

```
[Text field: nome]  text ──▶ nome  [SQL · Insert (INSERT)] rows inserted ──▶ value [Print (console.log)]
[Text field: email] text ──▶ email                        last id ──▶ value [Value: member number]
[SQL · PostgreSQL (connect)] connection ──▶ connection
[Button: Join] pressed ──▶ run
```

Pressing **Join** the database receives `INSERT INTO "iscritti" ("nome", "email") VALUES ($1, $2) RETURNING *`. **last id** is the number given to the row.

### 2. Recording an object with the time

```
[Now (date and time)] ISO ──▶ quando [Object literal { }] object ──▶ row [SQL · Insert (INSERT): misure]
[Number field: valore] value ──▶ valore
[SQL · SQLite (open)] connection ──▶ connection
[Interval (setInterval): 60 s] pulse ──▶ run
```

[Object literal { }](core.compose) prepares `{ "quando": "2026-11-11T10:05:00.000Z", "valore": 22.5 }`; with the **row** input you do not need to add inputs.

### 3. Many rows, all or none

```
[SQL · SQL Server (connect)] connection ──▶ connection [SQL · Insert (INSERT): righe_ordine] rows inserted ──▶ value [Value: inserted]
[Array literal [ ]: the list of rows] list ──▶ row
[Button: Save] pressed ──▶ run
```

The 500 rows of the list go in a single operation: if one row is refused, none is inserted.

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| Serve una riga { colonna: valore } o una lista di righe | **row** is neither an object nor a list of objects, or the list is empty (a row or a list of rows is needed). |
| Troppe righe in una volta (al massimo 10000) | The list has more rows than the module's maximum (too many rows at once). |
| La riga da inserire non ha colonne | The object is empty (and there are no added inputs with a value): the row has no columns. |
| Manca il nome della tabella | **Table** is empty (the table name is missing). |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | The name has symbols or spaces (invalid table name). |
| Colonna non valida: «…» (lettere, cifre e _) | A column name is not valid. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Il database è aperto in sola lettura | (SQLite) The database is open with **Read only**. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| … (a message from the database) | A database rule is not respected (duplicate key, missing value, wrong type...). |

## See also

- [SQL · Update (UPDATE)](db.update), [SQL · Delete (DELETE)](db.delete), [SQL · Read table (SELECT)](db.select)
- [SQL · Query (query)](db.query), for a hand-written insert
- [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction), for several writes together
- [Object literal { }](core.compose), to prepare the row
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
