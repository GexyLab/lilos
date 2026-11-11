# SQL · Transaction (BEGIN · COMMIT · ROLLBACK)

`db.transaction` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Opens a **transaction** on a connection: several writes that all count together or not at all. The block sends a reference from the **transaction** output; you link it to the **connection** input of the blocks that must be inside (in place of the connection's reference), and then you **commit** or **roll back**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **begin** (`begin`) | pulse | Opens the transaction on the connection and sends **transaction**. |
| **commit** (`commit`) | pulse | Commits: the changes made inside become final. Sends **committed**. |
| **roll back** (`rollback`) | pulse | Rolls back: the changes made inside disappear. Sends **rolled back**. |
| **connection** (`connection`) | object | The reference of a connection block. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **transaction** (`transaction`) | object | The reference of the open transaction. Link it to the **connection** input of the blocks that must be inside. |
| **committed** (`committed`) | pulse | A pulse when the transaction was committed. |
| **rolled back** (`rolledBack`) | pulse | A pulse when the transaction was rolled back by **roll back**. |
| **Exception** (`error`) | object | When the transaction does not open or does not close: a transaction already open, no transaction open, closed connection, a database that has none (ClickHouse)... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Isolation level** (`isolation`) | The database's default, Read uncommitted, Read committed, Repeatable read, Serializable, Snapshot (SQL Server) | The database's default | How separate the transaction is from what the others do at the same moment. Each database only knows some levels (see below). |
| **Rolled back by itself after (seconds)** (`timeoutSeconds`) | 1 to 600 | 60 | If you neither commit nor roll back in this time, the transaction rolls back by itself. |

## Added ports

This block has no added ports.

## How it works

1. **begin** opens the transaction on the connection and sends **transaction**. If the block already has an open transaction, it gives an error.
2. You link **transaction** to the **connection** input of [SQL · Query (query)](db.query), [SQL · Insert (INSERT)](db.insert), [SQL · Update (UPDATE)](db.update), [SQL · Delete (DELETE)](db.delete) or [SQL · Tables and columns (schema)](db.tables): their statements run inside the transaction. The blocks linked to the normal connection stay outside.
3. **commit** makes the changes final and sends **committed**; **roll back** throws them away and sends **rolled back**. Then the block can begin another.

### When the transaction rolls back by itself

- after **Rolled back by itself after (seconds)** (60 by default, 600 at most), so as not to leave an open transaction that blocks others;
- when the program stops, or when the block restarts (for example if you edit the schema);
- when the connection closes.

A **commit** arriving after the automatic rollback gives the error "Connessione chiusa (o di un altro programma)…" (the transaction is gone).

### What it keeps busy

- A transaction keeps **a connection of the pool** to itself (for SQLite, the whole database: the other blocks wait) until it ends. Do not leave it open longer than needed.
- The blocks linked to the normal connection go on using the other connections of the pool and **do not see** the changes not yet committed.
- You cannot open transactions inside a transaction: **begin** wants the connection, not another transaction's reference. A [SQL · Read rows one by one (cursor)](db.cursor) or a [SQL · Listen (LISTEN)](db.listen) use the connection, not the transaction.
- The statements of an **[SQL · Insert (INSERT)](db.insert)** block with many rows, outside a transaction, put themselves in a transaction (all or none).

### The isolation levels

| Level | PostgreSQL | MySQL · MariaDB | SQL Server | Oracle | SQLite |
|---|---|---|---|---|---|
| The database's default | yes | yes | yes | yes (Read committed) | yes |
| Read uncommitted | yes | yes | yes | as Read committed | as deferred |
| Read committed | yes | yes | yes | yes | as deferred |
| Repeatable read | yes | yes | yes | becomes Serializable | immediate |
| Serializable | yes | yes | yes | yes | immediate |
| Snapshot | ignored | ignored | yes | becomes Serializable | as deferred |

"Deferred" and "immediate" are SQLite's `BEGIN DEFERRED` and `BEGIN IMMEDIATE`. A choice the database does not know gives no error: its default level applies. **ClickHouse has no transactions**: **begin** with a ClickHouse connection gives the error "ClickHouse non annulla le modifiche: le transazioni non sono supportate" (ClickHouse does not roll back changes: transactions are not supported).

## Examples

### 1. A transfer: all or nothing

Two [SQL · Update (UPDATE)](db.update) blocks, one that takes away and one that adds, in the same transaction.

```
[Button: Transfer] pressed ──▶ begin [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)] transaction ──▶ connection [SQL · Update (UPDATE): conti (id = 1, saldo - 50)]
                                                                       transaction ──▶ connection [SQL · Update (UPDATE): conti (id = 2, saldo + 50)]
[SQL · PostgreSQL (connect)] connection ──▶ connection (of the Transaction)
[SQL · Update (UPDATE): conti (id = 2)] rows changed ──▶ commit
```

When the second update has finished, its **rows changed** pulse goes to **commit**. If an update gives an error and nobody commits, the transaction rolls back by itself when the time runs out (or at once, if you link **Exception** to **roll back**): either both succeed, or neither.

### 2. Rolling back if something goes wrong

```
[SQL · Update (UPDATE)] Exception ──▶ roll back [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)] rolled back ──▶ value [Print (console.log): "rolled back"]
                        rows changed ──▶ commit
```

If the update gives an error, **Exception** sends the pulse to **roll back**; if it succeeds, **rows changed** sends **commit**.

### 3. A summary inside the transaction

[SQL · Query (query)](db.query) with **transaction** also sees the changes not yet committed made by the same transaction:

```
[SQL · Insert (INSERT): righe_ordine] rows inserted ──▶ run [SQL · Query (query): SELECT SUM(importo) FROM righe_ordine WHERE ordine = :ordine] value ──▶ value [Value: provisional total]
```

If the total is not right, **roll back** removes the inserted rows too.

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| Troppe transazioni, cursori o ascolti aperti su questa connessione (al massimo 20) | The same connection already has 20 open (too many): close the ones you do not need. |
| Una transazione è già aperta: confermala o annullala prima di iniziarne un'altra | **begin** with a transaction already open in this block (a transaction is already open: commit or roll it back first). |
| Nessuna transazione aperta | **commit** or **roll back** without an open transaction (for example two **commit** in a row): no open transaction. |
| Una transazione si apre su una connessione (non dentro un'altra transazione) | **connection** holds the reference of a transaction, a cursor or a listening (a transaction opens on a connection, not inside another). |
| Serve una transazione (l'uscita «transazione» di Transazione) | The reference is not a transaction's. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection (or the transaction) was closed. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| ClickHouse non annulla le modifiche: le transazioni non sono supportate | A ClickHouse connection. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| … (a message from the database) | For example a write that breaks a rule: the transaction stays open until you roll it back (or it times out). |

## See also

- [SQL · Update (UPDATE)](db.update), [SQL · Insert (INSERT)](db.insert), [SQL · Delete (DELETE)](db.delete), [SQL · Query (query)](db.query)
- [SQL · PostgreSQL (connect)](db.postgres), [SQL · SQLite (open)](db.sqlite)
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
