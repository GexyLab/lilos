# SQL · Delete (DELETE)

`db.delete` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Deletes the rows of a table that match the conditions, **without writing SQL**. The conditions are the added inputs, one per column (`column = value`). Without conditions the block deletes nothing, unless you tick **All the rows**: so a forgotten input does not empty the table.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the deletion. |
| **connection** (`connection`) | object | The reference of a connection block (or of a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)). It does not start the block. |
| **table** (`table`) | text | Hidden. If it has a non-empty value, it takes the place of the **Table** of the settings. It does not start the block. |
| **conditions** (`where`) | object | Hidden. An object `{ "column": value }` with more conditions, together with those of the added inputs (if a column is in both, the added input wins). It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rows deleted** (`affected`) | number | How many rows were deleted. |
| **Exception** (`error`) | object | When the deletion fails: no condition, invalid name, rows that other tables still use, time out... |

The hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Table (schema.table for a schema)** (`table`) | text | empty | The table to delete from, when the **table** input has no value. |
| **All the rows (when there is no condition)** (`all`) | yes / no | no | If ticked, without conditions it deletes **all** the rows of the table. If not, without conditions it gives an error. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **condition**: it is called **condition (column) 1**... and must be **renamed** with the column's name, for example `id`.

The added inputs **only hold their value**: a value arriving there does not start the deletion, even if the input "starts it". The deletion starts only with **run**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**, the block writes `DELETE FROM table WHERE conditions` and runs it, with the values as parameters.

- **Conditions**: as in [SQL · Read table (SELECT)](db.select): `column = value`, all with **AND**; `null` becomes `IS NULL`; a list becomes `IN (…)` (an empty list finds no rows). An input that has not received a value yet does not count.
- **Without conditions** the block gives an error, unless **All the rows** is ticked: then it deletes every row (the table stays, empty).
- **Names**: table and columns (letters, digits and `_`, at most 63 characters) are checked and quoted for the database. On Oracle an all-lower-case name is written upper case.
- If no row matches the conditions, **rows deleted** is 0 and it is not an error.
- A deletion cannot be undone: try it first on test data, or put it in a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction) and commit only if the number of rows is the expected one. ClickHouse has no transactions and accepts `DELETE FROM` only in certain versions.

## Examples

### 1. Deleting an order

**Table** `ordini`. Add an input and call it `id`.

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Delete (DELETE)] rows deleted ──▶ value [Print (console.log)]
[Number field: id] value ──▶ id
[Button: Delete] pressed ──▶ run
```

With `id` = 7 the database receives `DELETE FROM "ordini" WHERE "id" = $1`.

### 2. Emptying a work table

**Table** `temporanea`, **All the rows** ticked, no added input.

```
[On start (main)] pulse ──▶ run [SQL · Delete (DELETE)] rows deleted ──▶ value [Print (console.log)]
[SQL · SQLite (open)] connection ──▶ connection
```

Each time the program starts, the table `temporanea` is emptied.

### 3. Deleting only if the rule says so

```
[SQL · Delete (DELETE)] rows deleted ──▶ a [Compare (== != < >): a = b] if false ──▶ send [Notify: "Deleted more than expected"]
                                          [Constant · Variable: 1] value ──▶ b
```

To be sure you delete just one, check **rows deleted**: if it is not 1, warn. To really undo, make the deletion inside a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction) and use **roll back**.

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| Nessuna condizione: si cancellerebbero tutte le righe. Aggiungi una condizione o spunta «Tutte le righe» | There is no condition and **All the rows** is not ticked (no condition: all rows would be deleted). |
| Manca il nome della tabella | **Table** is empty (the table name is missing). |
| Nome della tabella non valido: «…» (lettere, cifre e _; schema.tabella per lo schema) | The name has symbols or spaces (invalid table name). |
| Colonna non valida: «…» (lettere, cifre e _) | A column of the conditions is not a valid name. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Il database è aperto in sola lettura | (SQLite) The database is open with **Read only**. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| … (a message from the database) | A database rule prevents it (for example a foreign key). |

## See also

- [SQL · Insert (INSERT)](db.insert), [SQL · Update (UPDATE)](db.update), [SQL · Read table (SELECT)](db.select)
- [SQL · Query (query)](db.query), for a hand-written deletion
- [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
