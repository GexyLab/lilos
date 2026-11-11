# MongoDB · Aggregate (aggregate)

`mongo.aggregate` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Runs an **aggregation pipeline**: a list of stages (`$match`, `$group`, `$sort`, `$lookup`…) that filters, groups and calculates, and sends the documents of the result.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [MongoDB · Connection (MongoClient)](mongo.connect) block. It does not start the block. |
| **pipeline** (`pipeline`) | list | The list of stages. If it has a non-empty value, it takes the place of the **Pipeline** of the settings. It can also be a text holding the JSON. It does not start the block. |
| **collection** (`collection`) | text | Hidden. If it has a non-empty value, it takes the place of the **Collection** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **documents** (`documents`) | list | The documents of the result, each an object in Extended JSON. |
| **first** (`first`) | object | Hidden. The first document, or `null` if there are none. |
| **count** (`count`) | number | How many documents came out. |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if the result had more documents than the module's limit (10000 by default) and the others did not come out. |
| **Exception** (`error`) | object | When the aggregation fails: missing or closed connection, invalid pipeline, a stage the server refuses, time out, result too large… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Collection** (`collection`) | text | empty | The name of the collection, when the **collection** input has no value. At most 200 characters, without `$` and without null characters. |
| **Pipeline (JSON list of stages)** (`pipeline`) | JSON | `[]` | The list of stages, for example `[{"$match": {"stato": "nuovo"}}, {"$group": {"_id": "$cliente", "totale": {"$sum": "$importo"}}}]`. Empty: `[]`, which gives all the documents. |

## How it works

When a value arrives on **run**, the block calls `aggregate(pipeline)` on the collection.

- **The pipeline** is a list of objects, one per stage: `[{"$match": {…}}, {"$group": {…}}, {"$sort": {"total": -1}}]`. The list on the **pipeline** input (if it has a non-empty value) wins over the one in the settings. It can also be written "shell-style", with `ISODate("…")` and `ObjectId("…")`.
- The values are Extended JSON, as in the filters: `{"$date": "…"}` is a date, `{"$oid": "…"}` an ObjectId; in the results the same.
- The block **does not remove nor change** any stage: what the pipeline can do depends on the database user's permissions. A `$out` or `$merge` stage writes in a collection; use it only if you want that.
- The aggregation does not use the server's disk (`allowDiskUse` is false) and has the time limit of an operation also on the server: a `$group` or `$sort` stage that is too big stops with a server error.
- **Limit**: as in [MongoDB · Find (find)](mongo.find), at most the documents of the module's limit (10000 by default); if there are more, **truncated** is `true`. The maximum size of the result (4096 KB by default) holds too.
- The collection name is needed here too. Pipelines that do not start from a collection (`$documents`, `$currentOp`) cannot be used.

## Examples

### 1. The total by customer

**Collection** `ordini`, **Pipeline**:

```
[{"$match": {"stato": "pagato"}}, {"$group": {"_id": "$cliente", "totale": {"$sum": "$importo"}}}, {"$sort": {"totale": -1}}, {"$limit": 10}]
```

```
[MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Aggregate (aggregate)] documents ──▶ rows [Table]
[Button: Ranking] pressed ─────────────────────────────▶ run
```

The [Table](ui.table) shows the 10 customers who spent the most: a column `_id` (the customer) and one `totale`.

### 2. A pipeline calculated by the program

**Template string**: `[{"$match": {"stato": "{a}"}}, {"$count": "quanti"}]`.

```
[Text field: stato] text ──▶ a [Template string] text ──▶ pipeline [MongoDB · Aggregate (aggregate): ordini] first ──▶ value [Print (console.log)]
[Button: Count] pressed ──▶ run
```

[Template string](core.format) puts the chosen status in the text of the pipeline; the block also accepts a text holding the JSON on **pipeline**. Careful: the value goes inside the JSON, so use a field you trust (a `"` in the text would spoil it: you get the "Pipeline non valida" error).

## Errors

The messages are in Italian, as the block sends them; the MongoDB server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [MongoDB blocks](logicstudio-mongodb) page. In addition:

| Message | When |
|---|---|
| Manca il nome della raccolta (collection) | The **Collection** is empty and the **collection** input has no value. |
| Nome della raccolta non valido: … | The name is longer than 200 characters or contains `$`. |
| Pipeline non valida: scrivi un JSON, per esempio … (…) | The pipeline is a text that is not JSON. |
| Pipeline non valida: serve una lista di passi [{ "$match": … }, { "$group": … }] | It is not a list, or contains something that is not an object. |
| Pipeline: testo troppo lungo (al massimo 1024 KB) | The pipeline written as text is over 1 MB. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size. Add a `$limit` or a `$project`. |
| MongoDB non ha risposto in 30 s | The aggregation went over the time limit of an operation. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Find (find)](mongo.find), for simple reads
- [MongoDB · Count (countDocuments)](mongo.count)
- [Table](ui.table), to show the result
- [Array literal [ ]](core.list), [Object literal { }](core.compose), to prepare the stages
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
