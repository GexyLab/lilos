# Elasticsearch · Delete by query (_delete_by_query)

`es.deleteByQuery` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Deletes **all the documents** that a query finds in an index. An empty query, or one that takes all the documents (like `match_all`), is **refused**, unless the "All the documents" box is ticked. Each added input is a `match` *field = value*, in AND with the query. **It really deletes**: try it first with **Test** and count first with [Elasticsearch · Count (_count)](es.count).

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the deletion. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **query** (`query`) | any | Hidden. The query as an object (or JSON text). If it has a non-empty value, it takes the place of the **Query** setting. It does not start the block. |
| **index** (`index`) | text | Hidden. Takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **deleted** (`deleted`) | number | How many documents were deleted. |
| **Exception** (`error`) | object | When the deletion fails: missing connection, query that takes everything, wrong query… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The index (just one) to delete from, when the **index** input has no value. |
| **Query (JSON)** (`query`) | multi-line JSON text | empty | Which documents to delete, in Query DSL: `{ "range": { "data": { "lt": "2026-01-01" } } }`. If it has the keys of a body (`{ "query": … }`), its `query` counts. |
| **All the documents (also without a query)** (`all`) | yes / no | no | Without this box, a query that takes everything is an error. Ticked, **all** the documents of the index are deleted. |
| **Visible at once (refresh)** (`refresh`) | yes / no | no | If ticked, after the deletion the index is refreshed and the deletion shows up in searches at once. It costs the cluster. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field**: it is called **field 1**, **field 2**… and must be **renamed** with the name of the document field, for example `stato`. A value becomes `{ "match": { "field": value } }`, a list becomes `{ "terms": … }`; they are in AND with the query. An input with no value does not count.

Added inputs **only keep their value**: the deletion starts only with **run**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**:

1. The block builds the query (the **Query** with the added inputs in AND).
2. If the query takes all the documents (no query, `{}`, `match_all`, or a `bool` that filters nothing) and **All the documents** is not ticked, it stops with an error.
3. Otherwise it sends `POST /index/_delete_by_query` (with `conflicts=proceed`: documents changed in the meantime are skipped) and sends **deleted**.

With the added inputs filled in, the query no longer takes everything: for example with `stato = vecchio` it deletes only the documents with that status.

## Examples

### 1. Remove old logs, every night

Settings: **Index** `registri`, **Query** `{ "range": { "quando": { "lt": "now-30d" } } }`.

```
[Interval (setInterval): 86400 s] pulse ──▶ run [Elasticsearch · Delete by query (_delete_by_query)] deleted ──▶ value [Print (console.log)]
[Elasticsearch · Connection (connect)] connection ──▶ connection
```

### 2. Delete by status

One added input, renamed `stato`. **Query** empty.

```
[Selection: status] value ──▶ stato [Elasticsearch · Delete by query (_delete_by_query)] deleted ──▶ value [Value: deleted]
[Button: Delete] pressed ──▶ run
```

If the selection is empty, there is no condition and the query takes everything: the deletion is **refused**, and nothing is lost.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| La query prende tutti i documenti dell'indice: per cancellarli davvero tutti spunta «Tutti i documenti» | The query is empty or takes everything and the box is not ticked. |
| Manca l'indice | No index. |
| Nome dell'indice non valido: … | The index has capitals, forbidden symbols or spaces (see [Elasticsearch blocks](logicstudio-elasticsearch)). Here the index is just one (no commas). |
| Query non valido: serve un oggetto JSON | The query is a text that is not JSON. |
| Query non valido: serve un oggetto JSON { … } | The query is a list, a number or something else. |
| Elasticsearch ha risposto 400 (richiesta non valida): … | The query does not suit the cluster. |
| Elasticsearch ha risposto 404 (non trovato): index_not_found_exception: … | The index does not exist. |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Count (_count)](es.count), [Elasticsearch · Search (_search)](es.search), [Elasticsearch · Delete document (delete)](es.delete)
- [Interval (setInterval)](core.every)
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
