# MongoDB · Insert (insertOne · insertMany)

`mongo.insert` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Inserts a document in a collection, or each one of the documents of a list. Each added input is a field of the document: you can build the document without writing JSON.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [MongoDB · Connection (MongoClient)](mongo.connect) block. It does not start the block. |
| **document or list** (`document`) | any | An object (one document) or a list of objects (several documents). It can also be a text holding the JSON. It does not start the block. |
| **collection** (`collection`) | text | Hidden. If it has a non-empty value, it takes the place of the **Collection** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **ids** (`ids`) | list | The `_id` of the inserted documents, in order (a list even for a single one). An ObjectId comes out as `{"$oid": "…"}`. |
| **first id** (`id`) | any | Hidden. The `_id` of the first inserted document (`null` with an empty list). |
| **count** (`count`) | number | Hidden. How many documents were inserted. |
| **Exception** (`error`) | object | When the insert fails: missing or closed connection, missing or invalid document, duplicate key, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field of the document**: it is called **field 1**… and must be **renamed** with the name of the field, for example `cliente` or `totale`.

The added inputs **only keep their value**: a value arriving there does not start the insert. The block starts only with **run**. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Collection** (`collection`) | text | empty | The name of the collection, when the **collection** input has no value. At most 200 characters, without `$` and without null characters. |

## How it works

When a value arrives on **run**, the block builds the document and inserts it with `insertOne`; with a list it uses `insertMany`.

- **The document**: the object on the **document or list** input, plus the added inputs that have a value (if a field is in both, the added input wins). Without the input, the document is made of the added inputs only.
- **A list** of documents: each one is inserted, **in order**, and if one fails (a duplicate key, for example) the following ones are not inserted, while the previous ones stay. With a list **no added inputs are needed**: if there are any with a value, there is an error.
- An empty list inserts nothing and sends an empty **ids** and **count** 0.
- **The values**: a text stays a text, numbers and yes/no stay as they are. An object is read as Extended JSON: `{"$oid": "…"}` is an ObjectId, `{"$date": "…"}` a date (otherwise a date would stay a text). A `{ "$bytes": "…" }` from the other blocks becomes binary data.
- A document without `_id` gets a new one (an ObjectId), which comes out on **ids**.
- At most as many documents per call as the maximum documents of a result (10000 by default).

## Examples

### 1. Save a measurement

**Collection** `misure`. Add three inputs and call them `sensore`, `valore` and `quando`.

```
[Interval (setInterval): 60 s] pulse ──▶ read [Now (date and time)] ISO ──▶ quando [MongoDB · Insert (insertOne · insertMany)] ids ──▶ value [Print (console.log)]
                               pulse ──▶ run
[Number field: temperatura]    value ──▶ valore
[Constant · Variable: "serra"] value ──▶ sensore
```

The pulse of the [Interval (setInterval)](core.every) reads the time with [Now (date and time)](core.now) and starts the block on **run**; the values arrive at the added inputs: every minute a document `{"sensore": "serra", "valore": 22.5, "quando": "2026-11-11T10:05:00.000Z"}`. The `quando` field is a text; to save a real date send it `{"$date": "2026-11-11T10:05:00.000Z"}` built with [Object literal { }](core.compose).

### 2. Import a list

```
[Button: Import] pressed ──▶ run [MongoDB · Insert (insertOne · insertMany): contatti] count ──▶ value [Value]
[Array literal [ ]: objects] list ──▶ document or list
```

A list of objects arrives on **document or list** and is inserted with `insertMany`. If a document has an `_id` that is already there, the ones before it stay inserted and from the error on they are not.

## Errors

The messages are in Italian, as the block sends them; the MongoDB server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [MongoDB blocks](logicstudio-mongodb) page. In addition:

| Message | When |
|---|---|
| Manca il nome della raccolta (collection) | The **Collection** is empty and the **collection** input has no value. |
| Nome della raccolta non valido: … | The name is longer than 200 characters or contains `$`. |
| Manca il documento da inserire | The **document or list** input has no value and there are no added inputs with a value. |
| Con una lista di documenti non servono ingressi aggiunti: mettili nei documenti | A list arrives and there are also added inputs with a value. |
| Documento non valido: scrivi un JSON, per esempio {"nome": "Anna", "eta": {"$gt": 30}} (…) | The text on the input is not JSON, with the details after it. |
| Ogni documento deve essere un oggetto { … } | The list contains something that is not an object (a number, a text, a list). |
| Troppi documenti in una volta (al massimo 10000) | The list has more documents than the module's limit. |
| Documento: testo troppo lungo (al massimo 1024 KB) | The document written as text is over 1 MB. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Update (updateOne · updateMany)](mongo.update), to change a document that is already there (with **upsert** it inserts it if missing)
- [MongoDB · Find (find)](mongo.find), to reread the documents
- [Object literal { }](core.compose), to prepare a document
- [Now (date and time)](core.now), for the time of a field
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
