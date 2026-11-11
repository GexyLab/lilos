# Elasticsearch · Count (_count)

`es.count` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Counts how many documents a **query** finds in one or more indices, without reading them. Each added input is a `match` *field = value*, in AND with the query. With no query it counts all the documents.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the count. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **query** (`query`) | any | Hidden. The query as an object (or JSON text). If it has a non-empty value, it takes the place of the **Query** setting. It does not start the block. |
| **index** (`index`) | text | Hidden. Takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **count** (`count`) | number | How many documents match. |
| **Exception** (`error`) | object | When the count fails: missing connection, invalid index, wrong query… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The index (or several indices separated by commas, up to 64), when the **index** input has no value. |
| **Query (JSON; empty: all)** (`query`) | multi-line JSON text | empty | Which documents to count, in Query DSL. Empty: all documents. If it has the keys of a body (`{ "query": … }`), its `query` counts. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field**: it is called **field 1**, **field 2**… and must be **renamed** with the name of the document field, for example `stato`. A value becomes `{ "match": { "field": value } }`, a list becomes `{ "terms": … }`; they are in AND with the query. An input with no value (empty or `null`) does not count.

Added inputs **only keep their value**: the count starts only with **run**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**, the block sends `POST /index/_count` with the query and sends **count**. The number is exact (it does not have the 10000 limit of a search's total).

## Examples

### 1. How many documents there are

```
[Elasticsearch · Connection (connect)] connection ──▶ connection [Elasticsearch · Count (_count)] count ──▶ value [Value: documents]
[Interval (setInterval): 60 s] pulse ──▶ run
```

Settings: **Index** `eventi`. Every minute the [Value](ui.value) shows how many events there are.

### 2. How many documents of a certain kind

One added input, renamed `livello`.

```
[Selection: level] value ──▶ livello [Elasticsearch · Count (_count)] count ──▶ value [Value]
[Button: Count] pressed ──▶ run
```

Choosing `errore`, it counts the documents with `livello` `errore`.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca l'indice | No index. |
| Troppi indici (al massimo 64) | More than 64 indices in the list. |
| Nome dell'indice non valido: … | An index has capitals, forbidden symbols or spaces (see [Elasticsearch blocks](logicstudio-elasticsearch)). |
| Query non valido: serve un oggetto JSON | The query is a text that is not JSON. |
| Query non valido: serve un oggetto JSON { … } | The query is a list, a number or something else. |
| Elasticsearch ha risposto 404 (non trovato): index_not_found_exception: … | The index does not exist. |
| Elasticsearch ha risposto 400 (richiesta non valida): … | The query does not suit the cluster. |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Search (_search)](es.search), [Elasticsearch · Delete by query (_delete_by_query)](es.deleteByQuery), [Elasticsearch · Indices (_cat/indices)](es.indices)
- [Interval (setInterval)](core.every)
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
