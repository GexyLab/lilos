# MongoDB · Update (updateOne · updateMany)

`mongo.update` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Changes the documents that match the **filter**: `{"$set": {…}}`, `{"$inc": {…}}`… An object without operators is a `$set`. Each added input is a field of the filter.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [MongoDB · Connection (MongoClient)](mongo.connect) block. It does not start the block. |
| **filter** (`filter`) | object | A filter object, for example `{"status": "new"}`. If it has a non-empty value, it takes the place of the **Filter** of the settings. It does not start the block. |
| **update** (`update`) | any | The change: an object with operators (`{"$set": {"done": true}}`), an object of fields only (it becomes a `$set`) or a list of aggregation stages. If it has a non-empty value, it takes the place of the **Update** of the settings. It does not start the block. |
| **collection** (`collection`) | text | Hidden. If it has a non-empty value, it takes the place of the **Collection** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matched** (`matched`) | number | How many documents matched the filter. |
| **modified** (`modified`) | number | How many documents were really changed (a document that already had those values is "matched" but not "modified"). |
| **id inserted** (`upsertedId`) | any | Hidden. With **upsert**, the `_id` of the document inserted because none matched; otherwise `null`. |
| **Exception** (`error`) | object | When the update fails: missing or closed connection, invalid filter or update, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field of the filter**: it is called **field 1**, **field 2**… and must be **renamed** with the name of the document's field, for example `status` or `customer.city`. The filter becomes `{"status": value}`: equality.

The added inputs **only keep their value**: a value arriving there does not start the block, even if the input "starts it". The block starts only with **run**. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Collection** (`collection`) | text | empty | The name of the collection, when the **collection** input has no value. At most 200 characters, without `$` and without null characters. |
| **Filter (JSON, empty = every document)** (`filter`) | JSON | empty | The filter, when the **filter** input has no value. Empty: every document. It can also be written as in the MongoDB shell (see below). |
| **Update (JSON, e.g. {"$set": {"done": true}})** (`update`) | JSON | empty | The change, when the **update** input has no value. |
| **Documents** (`many`) | The first one that matches (…One), All those that match (…Many) | The first one that matches | Whether the block acts on the first document that matches or on all of them. |
| **Insert it when none matches (upsert)** (`upsert`) | yes / no | no | If no document matches, it creates a new one from the filter and the change. |

## How it works

When a value arrives on **run**, the block calls `updateOne` (or `updateMany`, with **Documents** "All those that match") with the filter and the change.

### The filter

- The filter is a JSON object in MongoDB's format: `{"status": "new", "age": {"$gt": 30}}`. See the [MongoDB blocks](logicstudio-mongodb) page for the values (ObjectId, dates) and for the "shell" way of writing.
- The **filter** input (if it has a non-empty value) wins over the **Filter** of the settings. It can be an object or a text holding the JSON.
- Each **added input** with a value becomes `field = value` and is added to the filter (if the field is already there, the added input wins). An added input that has not received a value yet does not count. A `null` value looks for the documents where the field is `null` or missing.
- An added input called `_id` with a text of 24 hexadecimal digits finds both the **ObjectId** and the equal text.
- A text stays a text; an object is read as Extended JSON: `{"$oid": "…"}` is an ObjectId, `{"$date": "…"}` a date.
- The name of an added input cannot begin with `$` nor be longer than 200 characters.

### The change

- **With operators**: `{"$set": {"status": "done"}, "$inc": {"tries": 1}}`. The operators are MongoDB's (`$set`, `$unset`, `$inc`, `$push`, `$pull`, `$rename`…).
- **Without operators**: `{"status": "done"}` becomes `{"$set": {"status": "done"}}`. Better for simple cases.
- **Mixed**: operators and fields together (`{"$set": {…}, "status": "x"}`) is an error.
- **A list of stages** (`[{"$set": {…}}]`): it is a change with an aggregation pipeline, which can use the values of the other fields.
- An empty change is an error: there is nothing to change.
- As for the filter, the values are Extended JSON (`{"$date": "…"}`, `{"$oid": "…"}`).

### First or all, and upsert

- **The first one that matches** changes a single document, even if more match; **All** changes them all. With an empty filter, the first document of the collection or all of them.
- With **upsert**, if no document matches a new document is inserted, made of the fields of the filter (equalities) and of the change; **id inserted** gives its `_id`.
- The outputs arrive in the order **matched**, **modified**, **id inserted**.

## Examples

### 1. Mark an order as shipped

**Collection** `ordini`, **Update** `{"stato": "spedito"}`. Add an input called `_id`.

```
[Table] selected row ──▶ object [Get property: _id.$oid] value ──▶ _id [MongoDB · Update (updateOne · updateMany)] modified ──▶ value [Value]
[Button: Ship] pressed ──────────────────────────────────────────────────▶ run
```

The `_id` is the `$oid` part of the ObjectId: an input called `_id` with that 24-digit text finds the document. The change becomes `{"$set": {"stato": "spedito"}}`.

### 2. A counter with upsert

**Collection** `contatori`, **Update** `{"$inc": {"visite": 1}}`, **Documents** "The first one that matches", **upsert** ticked. Add an input called `pagina`.

```
[Text field: pagina] text ──▶ pagina [MongoDB · Update (updateOne · updateMany)] matched ──▶ value [Print (console.log)]
[Button: Count] pressed ─────────────▶ run
```

The first time for `home` no document matches: `{"pagina": "home", "visite": 1}` is inserted. After that, every press adds 1 to `visite`.

## Errors

The messages are in Italian, as the block sends them; the MongoDB server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [MongoDB blocks](logicstudio-mongodb) page. In addition:

| Message | When |
|---|---|
| Manca il nome della raccolta (collection) | The **Collection** is empty and the **collection** input has no value. |
| Nome della raccolta non valido: … | The name is longer than 200 characters or contains `$`. |
| Filtro non valido: scrivi un JSON, per esempio {"nome": "Anna", "eta": {"$gt": 30}} (…) | The filter is not JSON (nor written as in the shell), with the details after it. |
| Filtro non valido: serve un oggetto JSON { … } | The filter is JSON but not an object (for example a list). |
| Filtro: testo troppo lungo (al massimo 1024 KB) | The filter written as text is over 1 MB. |
| Campo del filtro non valido: … | An added input has an empty name, one beginning with `$` or longer than 200 characters. |
| Manca la modifica: per esempio {"$set": {"stato": "fatto"}} | The **Update** is empty and the **update** input has no value. |
| Modifica non valida: scrivi un JSON, per esempio … (…) | The change is a text that is not JSON. |
| Modifica vuota | The change is an object without fields. |
| Modifica non valida: usa solo operatori ($set, $inc…) oppure solo campi (diventano $set) | Operators and fields in the same object. |
| Modifica non valida: una pipeline è una lista di passi [{ "$set": … }] | The list is empty or contains something that is not an object. |
| Modifica non valida: serve un oggetto { "$set": … } | The change is neither an object nor a list. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Insert (insertOne · insertMany)](mongo.insert), to add documents
- [MongoDB · Delete (deleteOne · deleteMany)](mongo.delete)
- [MongoDB · Find (find)](mongo.find), to reread
- [Object literal { }](core.compose), to prepare a change
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
