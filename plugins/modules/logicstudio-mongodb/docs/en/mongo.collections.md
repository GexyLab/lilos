# MongoDB · Collections (listCollections)

`mongo.collections` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Lists the **collections** of the connection's database: the names, and what kind they are (collection, view…). Useful to choose a collection in a [Selection](ui.select) or to check that it exists.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [MongoDB · Connection (MongoClient)](mongo.connect) block. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **names** (`names`) | list | The names of the collections, in alphabetical order, as a list of texts. |
| **collections** (`collections`) | list | Hidden. The collections as objects: `{ "name": "ordini", "type": "collection" }` (the type can also be `view` or `timeseries`). |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if there are more collections than the module's limit (10000 by default) and the others did not come out. |
| **Exception** (`error`) | object | When the read fails: missing or closed connection, permission denied, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

This block has no settings.

## How it works

When a value arrives on **run**, the block asks MongoDB for the list of the collections of the database you chose in the connection (only those the user can see). This block has no settings: the database is the one of the connection block.

## Examples

### 1. Choose the collection from a selection

```
[MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Collections (listCollections)] names ──▶ options [Selection: collection]
                                     connected ──▶ run
```

As soon as the connection is ready, the [Selection](ui.select) fills with the names of the collections. The chosen name (**value** output) can go to the hidden **collection** input of [MongoDB · Find (find)](mongo.find).

### 2. A list with the types

```
[MongoDB · Collections (listCollections)] collections ──▶ rows [Table]
```

The hidden **collections** output has one object per collection (`name` and `type`): the [Table](ui.table) shows the two columns and lets you see at once which ones are views.

## Errors

The messages are in Italian, as the block sends them; the MongoDB server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [MongoDB blocks](logicstudio-mongodb) page. In addition:

| Message | When |
|---|---|
| Permesso negato dal database: … | The user cannot list the collections of the database. |
| MongoDB non ha risposto in 30 s | The list went over the time limit of an operation. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The list is over the maximum size of a result. |
| E11000 duplicate key error … / altri messaggi del server | The server refuses the operation (duplicate key, validation, permissions…): the message is the server's own, in English. |

## See also

- [MongoDB · Connection (MongoClient)](mongo.connect), to choose the database
- [MongoDB · Find (find)](mongo.find)
- [Selection](ui.select), to choose a name
- [MongoDB blocks](logicstudio-mongodb), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
