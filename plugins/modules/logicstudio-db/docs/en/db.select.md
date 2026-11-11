# SQL · Read table (SELECT)

`db.select` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Reads the rows of a table **without writing SQL**: you choose the table, the columns, the order and how many rows; the conditions are the added inputs, one per column (`column = value`). The names are checked and quoted for that database, and the values go separately, as parameters.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the read. |
| **connection** (`connection`) | object | The reference of a connection block (or of a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)). It does not start the block. |
| **table** (`table`) | text | Hidden. If it has a non-empty value, it takes the place of the **Table** of the settings. It does not start the block. |
| **conditions** (`where`) | object | Hidden. An object `{ "column": value }` with more conditions, together with those of the added inputs (if a column is in both, the added input wins). It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rows** (`rows`) | list | The rows read, each an object `{ "column": value }`. |
| **first row** (`first`) | object | The first row, or `null` if there are none. |
| **more rows** (`truncated`) | yes/no | Hidden. `true` if the table has more rows besides those read (that is, beyond **Rows, at most**). |
| **Exception** (`error`) | object | When the read fails: missing or closed connection, invalid name, a table that does not exist, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Table (schema.table for a schema)** (`table`) | text | empty | The table (or view) to read, when the **table** input has no value. `schema.table` names a schema; up to three parts. |
| **Columns (a, b, c or *)** (`columns`) | text | `*` | The columns to read, separated by commas. `*`: all. |
| **Order (column or column DESC)** (`order`) | text | empty | How to sort: a column, `column DESC` for the opposite, or several separated by commas (`cliente, totale DESC`). Empty: no order (the database's own). |
| **Rows, at most (0 = the module's limit)** (`limit`) | 0 to 1000000 | 100 | How many rows to read at most. 0: the limit of the module settings (10000 by default). It cannot go over that limit. |
| **Skip rows** (`offset`) | number from 0 | 0 | How many rows to skip at the start, to read in pages. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **condition**: it is called **condition (column) 1**... and must be **renamed** with the column's name, for example `cliente`.

The added inputs **only hold their value**: a value arriving there does not start the read, even if the input "starts it". The read starts only with **run**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**, the block puts together `SELECT columns FROM table WHERE conditions ORDER BY order LIMIT … OFFSET …` (in the database's own form: `TOP`, `FETCH NEXT`...) and runs it with the values as parameters.

- **Conditions**: each column with a value is a `column = value` condition; all together with **AND**. An added input that has not (yet) received a value does not count. A `null` value becomes `column IS NULL`. A **list** becomes `column IN (…)` (with an empty list, no rows). With no condition at all every row is read (up to the limit).
- **Names**: the table, each column and the order columns must be made of letters, digits and `_` (starting with a letter or `_`, at most 63 characters, ASCII letters only); the table may have the schema (`schema.table`). No expressions, functions or aliases: for those use [SQL · Query (query)](db.query).
- **Limit**: the block asks for one row more than the limit to know whether there are others: with more rows, **more rows** is `true`. The limit never goes over the module settings' maximum rows, nor the maximum size of the result.
- **Order**: without an order the database chooses the order of the rows and it may change. If you read in pages with **Skip rows**, always choose an order (SQL Server, without one, uses any order).
- On Oracle an all-lower-case name is written upper case, as in SQL (`ordini` is the table `ORDINI`); the columns come out in upper case.

## Examples

### 1. A customer's latest orders

**Table** `ordini`, **Order** `id DESC`, **Rows, at most** 20. Add an input and call it `cliente`.

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Read table (SELECT)] rows ──▶ rows [Table]
[Selection: cliente] value ──▶ cliente
[Button: Show] pressed ──▶ run
```

The read is `SELECT * FROM "ordini" WHERE "cliente" = $1 ORDER BY "id" DESC LIMIT 20`.

### 2. Reading in pages

**Table** `articoli`, **Order** `codice`, **Rows, at most** 50. **Skip rows** is chosen in the settings.

```
[SQL · SQLite (open)] connection ──▶ connection [SQL · Read table (SELECT)] rows ──▶ rows [Table]
                                                                  more rows ──▶ value [Lamp: more pages]
[Button: Read] pressed ──▶ run
```

If **more rows** is `true`, there are more than 50 articles: the [Lamp](ui.lamp) lights up.

### 3. Finding several customers at once

```
[SQL · MySQL · MariaDB (connect)] connection ──▶ connection [SQL · Read table (SELECT): clienti] rows ──▶ rows [Table]
[Array literal [ ]: ["Roma", "Milano"]] list ──▶ citta (added input)
[Button: Search] pressed ──▶ run
```

A list becomes an `IN (?, ?)` condition on the column `citta`: the customers of Roma or Milano.

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| Manca il nome della tabella | **Table** is empty (and the **table** input has no value): the table name is missing. |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | The name has symbols or spaces, or more than three parts (invalid table name). |
| Colonna non valida: «…» (lettere, cifre e _) | A column of **Columns**, an added input or a key of **conditions** is not a valid name (invalid column). |
| Ordine non valido: «…» (colonna oppure colonna DESC) | The **Order** is not in the form `column` or `column DESC` (invalid order). |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| Il database non ha risposto in 30 s | The read went over the time limit. |
| … (a message from the database) | The table or a column does not exist, or you have no permission to read them. |

## See also

- [SQL · Query (query)](db.query), for hand-written SQL
- [SQL · Insert (INSERT)](db.insert), [SQL · Update (UPDATE)](db.update), [SQL · Delete (DELETE)](db.delete)
- [SQL · Tables and columns (schema)](db.tables), to see which tables and columns there are
- [SQL · Read rows one by one (cursor)](db.cursor), for very big tables
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
