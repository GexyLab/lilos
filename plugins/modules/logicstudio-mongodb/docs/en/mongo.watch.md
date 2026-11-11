# MongoDB · Watch changes (watch)

`mongo.watch` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Sends every **change** of a collection (or of the whole database) as it happens: an insert, an update, a replacement, a delete. It needs a MongoDB replica set or cluster. The block keeps listening as long as the program runs.

## Inputs

| Port | Type | Description |
|---|---|---|
| **listen** (`listen`) | pulse | Any value arriving here starts listening (if the block was already listening, it starts over). |
| **stop** (`stop`) | pulse | Hidden. Stops listening. |
| **connection** (`connection`) | object | The reference of a [MongoDB · Connection (MongoClient)](mongo.connect) block. **It starts the block**: with **Listen as soon as the connection arrives** ticked, when the connection arrives it starts listening. |
| **collection** (`collection`) | text | Hidden. If it has a non-empty value, it takes the place of the **Collection** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **document** (`document`) | object | The document of the change, whole (with **Whole document also for updates**). For deletes it is `null`. |
| **operation** (`operation`) | text | What change it is: `insert`, `update`, `replace` or `delete` (and, with **All**, others too, such as `drop` or `invalidate`). |
| **key (_id)** (`key`) | object | Hidden. The document's key: `{"_id": {"$oid": "…"}}`. |
| **change** (`change`) | object | Hidden. The whole change as MongoDB sends it (`operationType`, `ns`, `documentKey`, `updateDescription` with the changed fields…). |
| **listening** (`listening`) | yes/no | Hidden. `true` when the block has started listening, `false` when it stops (with **stop**, because of an error or because the connection closed). |
| **lost** (`dropped`) | number | Hidden. How many changes were lost because the program did not read them fast enough (see below). |
| **Exception** (`error`) | object | When listening does not start or is interrupted: missing or closed connection, single server, invalid pipeline, too many watches, server error… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Collection (empty = the whole database)** (`collection`) | text | empty | The collection to watch. Empty: every collection of the connection's database. The **collection** input (if it has a value) takes its place; a value on **collection** does not restart listening. |
| **Changes** (`operation`) | All, Inserts (insert), Updates (update, replace), Deletes (delete) | All | Which changes to output. |
| **More stages (JSON list, e.g. [{"$match": {"fullDocument.status": "new"}}])** (`pipeline`) | JSON | empty | More aggregation stages, applied after the **Changes** choice: for example `$match` on `fullDocument.field`. |
| **Whole document also for updates (updateLookup)** (`fullDocument`) | yes / no | yes | For updates the server adds the whole document as it is now. Without it, **document** for an update is `null` (only **change** shows what changed). |
| **Listen as soon as the connection arrives** (`auto`) | yes / no | yes | If ticked, when the connection arrives the block starts listening. If not, only with **listen**. |

## How it works

- **It starts** with **listen**, or (with **Listen as soon as the connection arrives**) when the **connection** arrives: the block asks MongoDB for a *change stream* on the collection or on the database, and sends `listening = true` when the server has answered.
- **Each change** comes out with four outputs, in the order **operation**, **key (_id)**, **document**, **change**. Link **operation** to an [If · Else](core.if) or to [Pick by index (MUX)](core.select) to do different things for an insert and for a delete.
- **The kernel keeps the listening** and the block reads it now and then: if there is nothing at that moment, it waits up to 20 seconds. When the program stops, the listening closes.
- **Lost changes**: the kernel keeps at most 1000 changes waiting (and at most 4096 KB: the maximum size of a result). If the program does not read them fast enough, the oldest are lost and the **lost** output says how many.
- **An error** from the server (for example the replica set changed primary in a way that the listening does not continue) stops the listening: **listening** becomes `false` and the error comes out of **Exception**. To restart you need **listen** again. If the connection closes (with **close** or because the program stops), the listening ends without an error.
- **Chosen operations**: "Inserts" lets `insert` through; "Updates" `update` and `replace`; "Deletes" `delete`. "All" does not filter.
- A connection can have at most **10** listenings.
- **It needs a replica set or a cluster** (even a one-server replica set): with a single server the block gives a clear error. The **server** output of the connection tells `changeStreams`.

## Examples

### 1. Warn when an order arrives

**Collection** `ordini`, **Changes** "Inserts (insert)".

```
[MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Watch changes (watch)] document ──▶ value [Get property: cliente] value ──▶ text [Notify: "New order"]
```

As soon as the connection is ready, [MongoDB · Watch changes (watch)](mongo.watch) starts listening; for each inserted order, [Get property](core.get) reads the customer and [Notify](lilos.notify) sends the warning.

### 2. Only the big orders, without starting by itself

Untick **Listen as soon as the connection arrives**. **More stages**: `[{"$match": {"fullDocument.totale": {"$gt": 1000}}}]`.

```
[Button: Listen] pressed ──▶ listen [MongoDB · Watch changes (watch)] document ──▶ value [Print (console.log)]
[Button: Stop]   pressed ──▶ stop                                     operation ──▶ value [Value]
```

With **Listen** the program starts receiving only the documents with `totale` over 1000; with **Stop** it stops. The hidden ports, such as **stop** and **listening**, are shown with the **eye**.

## Errors

The messages are in Italian, as the block sends them; the MongoDB server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [MongoDB blocks](logicstudio-mongodb) page. In addition:

| Message | When |
|---|---|
| Manca il nome della raccolta (collection) | The **Collection** is empty and the **collection** input has no value. |
| Nome della raccolta non valido: … | The name is longer than 200 characters or contains `$`. |
| Osserva modifiche funziona solo con un replica set o un cluster di MongoDB (non con un server singolo) | The server you are connected to is not a replica set. A single server can be turned into a one-server replica set. |
| Troppe osservazioni su questa connessione (al massimo 10) | You already have 10 listenings on this connection. |
| Pipeline non valida: serve una lista di passi [{ "$match": … }] | **More stages** is not a list of objects. |
| Pipeline non valida: scrivi un JSON, per esempio … (…) | **More stages** is not JSON. |
| MongoDB non ha risposto in 30 s | The server did not open the listening within the time limit of an operation. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Connection (MongoClient)](mongo.connect), for the connection and `changeStreams`
- [MongoDB · Find (find)](mongo.find), to read the documents already there
- [If · Else](core.if), [Pick by index (MUX)](core.select), to act according to the operation
- [Notify](lilos.notify), to warn whoever uses lilOS
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
