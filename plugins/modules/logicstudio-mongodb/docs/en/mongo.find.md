# MongoDB · Find (find)

`mongo.find` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Reads the documents of a collection that match the **filter**, with the fields, the order and the number you want. Each added input is a field of the filter: for simple cases there is no need to write JSON.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [MongoDB · Connection (MongoClient)](mongo.connect) block. It does not start the block. |
| **filter** (`filter`) | object | A filter object, for example `{"status": "new"}`. If it has a non-empty value, it takes the place of the **Filter** of the settings. It does not start the block. |
| **collection** (`collection`) | text | Hidden. If it has a non-empty value, it takes the place of the **Collection** of the settings. It does not start the block. |
| **limit** (`limit`) | number | Hidden. If it has a non-empty value, it takes the place of **At most (limit)**. It does not start the block. |
| **skip** (`skip`) | number | Hidden. If it has a non-empty value, it takes the place of **Skip (skip)**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **documents** (`documents`) | list | The documents read, each an object in Extended JSON. |
| **first** (`first`) | object | Hidden. The first document, or `null` if there are none. |
| **count** (`count`) | number | How many documents came out (not how many the collection has: for that there is [MongoDB · Count (countDocuments)](mongo.count)). |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if there are more documents beyond the module's limit (10000 by default) and they did not come out. |
| **Exception** (`error`) | object | When the read fails: missing or closed connection, invalid filter, invalid collection name, time out, result too large… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field of the filter**: it is called **field 1**, **field 2**… and must be **renamed** with the name of the document's field, for example `status` or `customer.city`. The filter becomes `{"status": value}`: equality.

The added inputs **only keep their value**: a value arriving there does not start the block, even if the input "starts it". The block starts only with **run**. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Collection** (`collection`) | text | empty | The name of the collection, when the **collection** input has no value. At most 200 characters, without `$` and without null characters. |
| **Filter (JSON, empty = every document)** (`filter`) | JSON | empty | The filter, when the **filter** input has no value. Empty: every document. It can also be written as in the MongoDB shell (see below). |
| **Fields (projection, e.g. {"name": 1})** (`projection`) | JSON | empty | Which fields to output: `{"name": 1, "age": 1}` only those (and `_id`), `{"name": 0}` all except that. Empty: all. |
| **Order (sort, e.g. {"age": -1})** (`sort`) | JSON | empty | How to sort: `1` from the smallest, `-1` from the largest; several fields in the order they are written. Empty: the database's own order. |
| **At most (limit, 0 = up to the module's limit)** (`limit`) | number from 0 | 0 | How many documents to read at most. 0: the module's limit (10000 by default). It cannot go over that limit. |
| **Skip (skip)** (`skip`) | number from 0 | 0 | How many documents to skip at the start, to read in pages. |

## How it works

When a value arrives on **run**, the block asks the database for the documents with `find(filter, projection, sort, skip, limit)`.

### The filter

- The filter is a JSON object in MongoDB's format: `{"status": "new", "age": {"$gt": 30}}`. See the [MongoDB blocks](logicstudio-mongodb) page for the values (ObjectId, dates) and for the "shell" way of writing.
- The **filter** input (if it has a non-empty value) wins over the **Filter** of the settings. It can be an object or a text holding the JSON.
- Each **added input** with a value becomes `field = value` and is added to the filter (if the field is already there, the added input wins). An added input that has not received a value yet does not count. A `null` value looks for the documents where the field is `null` or missing.
- An added input called `_id` with a text of 24 hexadecimal digits finds both the **ObjectId** and the equal text.
- A text stays a text; an object is read as Extended JSON: `{"$oid": "…"}` is an ObjectId, `{"$date": "…"}` a date.
- The name of an added input cannot begin with `$` nor be longer than 200 characters.

### The result

- The documents come out as **Extended JSON (relaxed)**: an ObjectId is `{"$oid": "…"}`, a date `{"$date": "…"}`, numbers and texts stay as they are. To read a field of a document there is [Get property](core.get).
- **Limit**: the block asks for one document more than the limit to know whether there are more: if there are, **truncated** is `true`. With **At most** lower than the module's limit there is never **truncated**: you asked for exactly that number.
- The module's limit (10000 documents) and the maximum size of the result (4096 KB by default) always hold: a bigger result gives an error ("Risultato troppo grande", result too large). Ask for fewer documents, or fewer fields with **Fields (projection)**.
- Without **Order** the documents come out in the order the database chooses, which can change. If you read in pages with **Skip**, always choose an order.
- The outputs arrive in the order **documents**, **first**, **count**, **truncated**.

## Examples

### 1. The orders in a table

**Collection** `ordini`, **Order** `{"totale": -1}`, **At most** 50.

```
[MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Find (find)] documents ──▶ rows [Table]
[Button: Refresh] pressed ──────────────────────────────────▶ run
```

When the program starts it connects; every time you press **Refresh** the block rereads the 50 biggest orders and the [Table](ui.table) shows them.

### 2. Search by one or more fields

**Collection** `ordini`. Add two inputs and call them `stato` and `cliente.citta`.

```
[Text field: stato]  text ──▶ stato          [MongoDB · Find (find)] first ──▶ value [Value]
[Text field: citta]  text ──▶ cliente.citta                         count ──▶ value [Value: found]
[Button: Search] pressed ───▶ run
```

With `stato` = `nuovo` and `cliente.citta` = `Milano` the filter is `{"stato": "nuovo", "cliente.citta": "Milano"}`. A text field that is still empty sends the empty text, which is a value: if you want to ignore it, do not link it.

### 3. A filter with a date

**Filter** `{"creato": {"$gte": ISODate("2026-11-01")}, "stato": {"$in": ["nuovo", "aperto"]}}`.

The filter written "shell-style" (`ISODate`, keys without quotes are accepted) becomes the JSON `{"creato": {"$gte": {"$date": "2026-11-01T00:00:00Z"}}, …}`. To look for a document by `_id` add an input called `_id` and send it the 24-digit text: it finds the ObjectId.

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
| Proiezione non valida: … / Ordine non valido: … | **Fields (projection)** or **Order (sort)** is not a JSON object (the same message as the filter, with "Proiezione" or "Ordine" in place of "Filtro"). |
| Numero non valido: … | **At most** or **Skip** is not a whole number from 0. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The documents read are over the maximum size of the result. |
| MongoDB non ha risposto in 30 s | The read went over the time limit of an operation. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Count (countDocuments)](mongo.count), to know how many there are
- [MongoDB · Aggregate (aggregate)](mongo.aggregate), to group and calculate
- [Get property](core.get), to read a field of a document
- [Table](ui.table), to show the documents
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
