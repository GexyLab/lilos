# SQL · Read rows one by one (cursor)

`db.cursor` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Runs a query and sends its rows **one at a time** (or in groups), instead of all together. It is for big tables, which would not fit in the limit of a result, and for processing rows as they come. The rows go by themselves at each pause, or at each pulse on **next** if you link that input.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here opens the query (if one was open, it closes it) and sends the first rows. |
| **next** (`next`) | pulse | Sends the next rows. If it is linked, the rows go forward only with its pulses. |
| **stop** (`stop`) | pulse | Hidden. Closes the query before the end, without sending **done**. |
| **connection** (`connection`) | object | The reference of a connection block (not a transaction's). It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **row** (`row`) | any | The row (an object `{ "column": value }`); with **Rows at a time** greater than 1, the list of rows. |
| **index** (`index`) | number | The row's sequence number (the first is 0); with groups, of the group's first row. It comes out before **row**. |
| **done** (`done`) | pulse | A pulse when the rows are over (after the last one). |
| **Exception** (`error`) | object | When the query does not open or a read fails: invalid SQL, missing parameter, closed connection, time out... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **SQL** (`sql`) | multi-line text | `SELECT * FROM tabella` | The query to go through. `:name` is a parameter, as in [SQL · Query (query)](db.query). |
| **Rows at a time (more than 1: a list)** (`batch`) | 1 to 1000 | 1 | How many rows to send each time. 1: one row (an object). More than 1: a list. |
| **Pause between rows by itself (ms)** (`pause`) | 0 to 60000 | 0 | How many milliseconds to wait between one send and the next, when **next** is not linked. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 32 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **parameter** of the query, to be **renamed** with the name used in the SQL, without the colon (as in [SQL · Query (query)](db.query)).

The added inputs **only hold their value**: a value arriving there does not open the query. The query opens only with **run**. See [How a block works](ide/blocks).

## How it works

1. With **run** the block closes any query already open and opens a new one with the settings' SQL and the parameters. The database prepares the read; the rows are not all in the program yet.
2. The block reads the first group of rows and sends **index** and **row**.
3. Then:
   - if **next** is **not** linked, the block goes on by itself, waiting the **Pause** between one group and the next, until the end;
   - if **next** is linked, the block waits: at each pulse on **next** it sends the next group.
4. When the rows run out, it sends **done** and the query closes. With **stop** it closes earlier, without **done**; it also closes when the program stops or the connection closes.

### Good to know

- **Reads only**: PostgreSQL opens the cursor in a read-only transaction; it is made for `SELECT`, not for writing.
- **The ceiling**: the rows of a cursor are at most the module's **maximum rows** (10000 by default): beyond that, the cursor closes with **done**. Each step counts as an operation in the per-minute quota, and the size of each group has the limit of a result (4096 KB).
- **One query at a time per block**: a new **run** closes the previous query. To read two tables together use two blocks.
- **Normal connection**, not a transaction: a cursor inside a transaction does not exist.
- **SQLite**: the cursor keeps the only access to the database busy until it ends; the other blocks wait. Do not leave it halfway.
- **MySQL, MariaDB, SQL Server and ClickHouse**: the rows come from the server as they go; a cursor stopped halfway closes the connection it used.
- **Oracle**: the rows come from a server *result set*.
- If a read takes longer than the time limit of an operation (30 seconds), there is the error.

## Examples

### 1. One row per second

**SQL** `SELECT * FROM misure ORDER BY id`, **Pause** 1000 ms.

```
[SQL · SQLite (open)] connection ──▶ connection [SQL · Read rows one by one (cursor)] row ──▶ value [Print (console.log)]
[Button: Play] pressed ──▶ run                                      done ──▶ send [Notify: "Done"]
```

The program "replays" the measures like a film: a row per second, with a [Notify](lilos.notify) at the end.

### 2. One row each time you ask

**next** linked to a [Button](ui.button).

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Read rows one by one (cursor): SELECT * FROM clienti ORDER BY id] row ──▶ object [Destructure object]
[Button: Start] pressed ──▶ run
[Button: Next]  pressed ──▶ next
```

**Start** opens the query and shows the first customer; each **Next** shows the following one, until **done**.

### 3. In groups of 100, with a parameter

**SQL** `SELECT id, valore FROM misure WHERE sensore = :sensore`, **Rows at a time** 100, **Pause** 0. Add an input `sensore`.

```
[Selection: sensore] value ──▶ sensore [SQL · Read rows one by one (cursor)] row ──▶ rows [Table]
[SQL · ClickHouse (connect)] connection ──▶ connection
[Button: Load] pressed ──▶ run
```

The [Table](ui.table) receives a list of 100 rows at a time (each group replaces the previous one); to accumulate use a memory block.

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| Manca la query SQL | The **SQL** is empty (the SQL query is missing). |
| Manca il valore del parametro :nome (aggiungi un ingresso «nome» al blocco) | The SQL has `:name` but the input with a value is missing. |
| Scorri righe usa una connessione (non una transazione) | **connection** holds the reference of a transaction, or of a cursor or listening (the cursor uses a connection, not a transaction). |
| Serve un cursore aperto | (internal) Reading from a cursor that is already closed. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | A group is over the maximum size: lower **Rows at a time**. |
| Troppe operazioni sul database: al massimo 600 al minuto | Each step counts: slow down or raise **Rows at a time**. |
| Il database non ha risposto in 30 s | A read went over the time limit. |
| … (a message from the database) | The SQL is not valid, the table does not exist... |

## See also

- [SQL · Query (query)](db.query), for small results, all together
- [SQL · Read table (SELECT)](db.select), with **Skip rows** to read in pages
- [Database blocks (SQL)](logicstudio-db), for the limits, the quotas and the module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
