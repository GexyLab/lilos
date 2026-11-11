# MongoDB · Delete (deleteOne · deleteMany)

`mongo.delete` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Deletes the documents that match the **filter**. With an empty filter it refuses to delete, unless you tick **Every document**. Each added input is a field of the filter.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [MongoDB · Connection (MongoClient)](mongo.connect) block. It does not start the block. |
| **filter** (`filter`) | object | A filter object, for example `{"status": "new"}`. If it has a non-empty value, it takes the place of the **Filter** of the settings. It does not start the block. |
| **collection** (`collection`) | text | Hidden. If it has a non-empty value, it takes the place of the **Collection** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **deleted** (`deleted`) | number | How many documents were deleted. |
| **Exception** (`error`) | object | When the delete fails: missing or closed connection, invalid filter, empty filter without "Every document", time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field of the filter**: it is called **field 1**, **field 2**… and must be **renamed** with the name of the document's field, for example `status` or `customer.city`. The filter becomes `{"status": value}`: equality.

The added inputs **only keep their value**: a value arriving there does not start the block, even if the input "starts it". The block starts only with **run**. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Collection** (`collection`) | text | empty | The name of the collection, when the **collection** input has no value. At most 200 characters, without `$` and without null characters. |
| **Filter (JSON, empty = every document)** (`filter`) | JSON | empty | The filter, when the **filter** input has no value. Empty: every document. It can also be written as in the MongoDB shell (see below). |
| **Documents** (`many`) | The first one that matches (…One), All those that match (…Many) | The first one that matches | Whether the block acts on the first document that matches or on all of them. |
| **Every document (even with an empty filter)** (`all`) | yes / no | no | The permission to delete with an empty filter: without it, an empty filter is an error. |

## How it works

When a value arrives on **run**, the block calls `deleteOne` (or `deleteMany`, with **Documents** "All those that match") with the filter.

### The filter

- The filter is a JSON object in MongoDB's format: `{"status": "new", "age": {"$gt": 30}}`. See the [MongoDB blocks](logicstudio-mongodb) page for the values (ObjectId, dates) and for the "shell" way of writing.
- The **filter** input (if it has a non-empty value) wins over the **Filter** of the settings. It can be an object or a text holding the JSON.
- Each **added input** with a value becomes `field = value` and is added to the filter (if the field is already there, the added input wins). An added input that has not received a value yet does not count. A `null` value looks for the documents where the field is `null` or missing.
- An added input called `_id` with a text of 24 hexadecimal digits finds both the **ObjectId** and the equal text.
- A text stays a text; an object is read as Extended JSON: `{"$oid": "…"}` is an ObjectId, `{"$date": "…"}` a date.
- The name of an added input cannot begin with `$` nor be longer than 200 characters.

### The empty filter protection

If the filter (added inputs included) is empty, the block **does nothing** and gives the error "Filtro vuoto: eliminerebbe tutti i documenti…" (empty filter: it would delete all the documents), unless **Every document** is ticked. This way an unlinked text field or a badly written filter does not empty the collection. With **Every document**, **Documents** "All those that match" and an empty filter **all** the documents of the collection are deleted (the collection stays); with "The first one that matches", just one.

A filter that is not empty but too wide also deletes what it finds: try first with [MongoDB · Count (countDocuments)](mongo.count) or [MongoDB · Find (find)](mongo.find), and use **Try** on a test collection.

## Examples

### 1. Delete a chosen document

**Collection** `contatti`, **Documents** "The first one that matches". Add an input called `_id`.

```
[Text field: id] text ──▶ _id [MongoDB · Delete (deleteOne · deleteMany)] deleted ──▶ value [Value]
[Button: Delete] pressed ────────────▶ run
```

A text of 24 hexadecimal digits finds the ObjectId with that `_id`. If the id is not there, `deleted` is 0, without an error.

### 2. Clean up old documents

**Collection** `log`, **Filter** `{"creato": {"$lt": {"$date": "2026-01-01T00:00:00Z"}}}`, **Documents** "All those that match".

```
[Interval (setInterval): 86400 s] pulse ──▶ run [MongoDB · Delete (deleteOne · deleteMany)] deleted ──▶ value [Print (console.log)]
```

Once a day the program deletes the documents older than 2026. With a non-empty filter **Every document** is not needed.

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
| Filtro vuoto: eliminerebbe tutti i documenti. Scrivi un filtro, oppure spunta «Tutti i documenti» se è proprio quello che vuoi | The filter is empty and **Every document** is not ticked. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Count (countDocuments)](mongo.count), to check how many it would find
- [MongoDB · Find (find)](mongo.find), to see what it deletes
- [MongoDB · Update (updateOne · updateMany)](mongo.update)
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
