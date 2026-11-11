# MongoDB · Count (countDocuments)

`mongo.count` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Counts how many documents match the **filter**, without reading them. Each added input is a field of the filter.

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
| **count** (`count`) | number | How many documents match the filter. With an empty filter, all those of the collection. |
| **Exception** (`error`) | object | When the count fails: missing or closed connection, invalid filter, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field of the filter**: it is called **field 1**, **field 2**… and must be **renamed** with the name of the document's field, for example `status` or `customer.city`. The filter becomes `{"status": value}`: equality.

The added inputs **only keep their value**: a value arriving there does not start the block, even if the input "starts it". The block starts only with **run**. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Collection** (`collection`) | text | empty | The name of the collection, when the **collection** input has no value. At most 200 characters, without `$` and without null characters. |
| **Filter (JSON, empty = every document)** (`filter`) | JSON | empty | The filter, when the **filter** input has no value. Empty: every document. It can also be written as in the MongoDB shell (see below). |

## How it works

When a value arrives on **run**, the block calls `countDocuments(filter)` with the time limit of an operation also on the server.

### The filter

- The filter is a JSON object in MongoDB's format: `{"status": "new", "age": {"$gt": 30}}`. See the [MongoDB blocks](logicstudio-mongodb) page for the values (ObjectId, dates) and for the "shell" way of writing.
- The **filter** input (if it has a non-empty value) wins over the **Filter** of the settings. It can be an object or a text holding the JSON.
- Each **added input** with a value becomes `field = value` and is added to the filter (if the field is already there, the added input wins). An added input that has not received a value yet does not count. A `null` value looks for the documents where the field is `null` or missing.
- An added input called `_id` with a text of 24 hexadecimal digits finds both the **ObjectId** and the equal text.
- A text stays a text; an object is read as Extended JSON: `{"$oid": "…"}` is an ObjectId, `{"$date": "…"}` a date.
- The name of an added input cannot begin with `$` nor be longer than 200 characters.

The number does not have the limit of the maximum documents of a result: it is a single number, and can be bigger than 10000. On a very big collection with a filter that does not use an index the count can be slow and stop at the time limit.

## Examples

### 1. How many new orders

**Collection** `ordini`. Add an input called `stato`, linked to a [Constant · Variable](core.value) with the text `nuovo`.

```
[Interval (setInterval): 30 s] pulse ──▶ run [MongoDB · Count (countDocuments)] count ──▶ value [Value: new orders]
[Constant · Variable: "nuovo"] value ──▶ stato
```

Every 30 seconds the [Value](ui.value) shows how many orders have `stato` equal to `nuovo`.

### 2. Warn if there are too many

```
[MongoDB · Count (countDocuments): code] count ──▶ a [Compare (== != < >): a > b] if true ──▶ send [Notify: "Too many jobs queued"]
[Constant · Variable: 100] value ──▶ b
```

[Compare (== != < >)](core.compare) with `a > b` and 100 sends a [Notify](lilos.notify) when the queue goes over 100 documents.

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
| MongoDB non ha risposto in 30 s | The count went over the time limit of an operation. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Find (find)](mongo.find), to read the documents
- [MongoDB · Aggregate (aggregate)](mongo.aggregate), to count by groups
- [Compare (== != < >)](core.compare), to react to the number
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
