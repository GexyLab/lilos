# SQL · Update (UPDATE)

`db.update` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Changes the columns of **values** in the rows of a table that match the conditions, **without writing SQL**. The conditions are the added inputs, one per column (`column = value`). Without conditions the block does nothing, unless you tick **All the rows**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the update. |
| **connection** (`connection`) | object | The reference of a connection block (or of a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)). It does not start the block. |
| **values** (`values`) | object | An object `{ "column": new value }` with the columns to change. It does not start the block. |
| **table** (`table`) | text | Hidden. If it has a non-empty value, it takes the place of the **Table** of the settings. It does not start the block. |
| **conditions** (`where`) | object | Hidden. An object `{ "column": value }` with more conditions, together with those of the added inputs (if a column is in both, the added input wins). It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rows changed** (`affected`) | number | How many rows were changed (for MySQL and MariaDB, those that matched the conditions). |
| **Exception** (`error`) | object | When the update fails: nothing to change, no condition, invalid name, a value not accepted, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Table (schema.table for a schema)** (`table`) | text | empty | The table to update, when the **table** input has no value. |
| **All the rows (when there is no condition)** (`all`) | yes / no | no | If ticked, without conditions it changes **all** the rows of the table. If not, without conditions it gives an error. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **condition**: it is called **condition (column) 1**... and must be **renamed** with the column's name, for example `id`.

The added inputs **only hold their value**: a value arriving there does not start the update, even if the input "starts it". The update starts only with **run**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**, the block writes `UPDATE table SET column = value, … WHERE conditions` and runs it, with all the values as parameters.

- **Values**: each key of **values** is a column to change; `null` empties it (`NULL`). An empty object or an input without a value gives "Niente da cambiare" (nothing to change).
- **Conditions**: as in [SQL · Read table (SELECT)](db.select): `column = value`, all with **AND**; `null` becomes `IS NULL`; a list becomes `IN (…)` (an empty list finds no rows). An input that has not received a value yet does not count: **careful**, if by mistake no input has a value, the conditions are empty and the block stops with the error (unless **All the rows**).
- **All the rows**: tick it only if you really want to change every row; with conditions present it has no effect.
- **Names**: table and columns (letters, digits and `_`, at most 63 characters) are checked and quoted for the database. On Oracle an all-lower-case name is written upper case.
- **Rows changed**: if no row matches the conditions, it is 0 and it is not an error.
- ClickHouse accepts `UPDATE … SET` only in certain versions: see [SQL · ClickHouse (connect)](db.clickhouse).

## Examples

### 1. Changing an order's status

**Table** `ordini`. Add an input and call it `id`.

```
[Object literal { }: { "stato": "spedito" }] object ──▶ values [SQL · Update (UPDATE)] rows changed ──▶ value [Print (console.log)]
[Number field: id] value ──▶ id
[SQL · PostgreSQL (connect)] connection ──▶ connection
[Button: Ship] pressed ──▶ run
```

With `id` = 7 the database receives `UPDATE "ordini" SET "stato" = $1 WHERE "id" = $2`.

### 2. Changing several rows with a list

```
[Array literal [ ]: [3, 5, 8]] list ──▶ id (added input) [SQL · Update (UPDATE): articoli]
[Object literal { }: { "attivo": 0 }] object ──▶ values
[SQL · SQLite (open)] connection ──▶ connection
```

The condition is `"id" IN (?, ?, ?)`: the three articles are switched off.

### 3. Inside a transaction

```
[SQL · Transaction (BEGIN · COMMIT · ROLLBACK)] transaction ──▶ connection [SQL · Update (UPDATE): conti]
                                                transaction ──▶ connection [SQL · Update (UPDATE): conti]
```

Two updates (one account going down, one going up) are in the same transaction: see [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction).

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| Niente da cambiare: serve un oggetto { colonna: valore } in «valori» | **values** is empty or not an object (nothing to change). |
| Nessuna condizione: si cambierebbero tutte le righe. Aggiungi una condizione o spunta «Tutte le righe» | There is no condition and **All the rows** is not ticked (no condition: all rows would change). |
| Manca il nome della tabella | **Table** is empty (the table name is missing). |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | The name has symbols or spaces (invalid table name). |
| Colonna non valida: «…» (lettere, cifre e _) | A column of **values** or of the conditions is not a valid name. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Il database è aperto in sola lettura | (SQLite) The database is open with **Read only**. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| … (a message from the database) | A database rule is not respected. |

## See also

- [SQL · Insert (INSERT)](db.insert), [SQL · Delete (DELETE)](db.delete), [SQL · Read table (SELECT)](db.select)
- [SQL · Query (query)](db.query), for a hand-written update (conditions other than "equal")
- [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
