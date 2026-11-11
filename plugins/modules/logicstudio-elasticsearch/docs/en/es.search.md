# Elasticsearch · Search (_search)

`es.search` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Searches the documents of one or more indices with a **query** (Query DSL, in JSON) and sends the documents found, the total and any aggregations. Each added input is a `match` *field = value*, put in AND with the query.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the search. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **query** (`query`) | any | Hidden. The query as an object (or JSON text). If it has a non-empty value, it takes the place of the **Query** setting. It does not start the block. |
| **size** (`size`) | number | Hidden. How many documents at most. Takes the place of **How many (size)**. It does not start the block. |
| **from** (`from`) | number | Hidden. Which document to start from (for pages). Takes the place of **From (from)**. It does not start the block. |
| **index** (`index`) | text | Hidden. Takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **documents** (`hits`) | list | The documents found: each is an object with the document's fields plus `_id`, the id. |
| **total** (`total`) | number | How many documents the search found in all (not only the ones that came out). Elasticsearch counts exactly up to 10000: beyond that, the number may be approximate, unless the search body has `"track_total_hits": true`. |
| **aggregations** (`aggregations`) | object | Hidden. The result of the search's aggregations (`aggs`), or `null`. |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if you asked for more documents than the module allows (10000 by default). |
| **Exception** (`error`) | object | When the search fails: missing connection, invalid index, wrong query, result too large… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The index (or several indices separated by commas, `a, b`) to search, when the **index** input has no value. |
| **Query (JSON)** (`query`) | multi-line JSON text | `{ "match_all": {} }` | The query. Empty or `match_all`: all documents. It can be just the query (`{ "match": { "titolo": "caffè" } }`) or a **whole body** (`{ "query": …, "aggs": … }`, see below). |
| **How many (size)** (`size`) | 0 to 1000000 | 10 | How many documents at most. It cannot exceed the module's limit (10000 by default). |
| **From (from)** (`from`) | 0 to 1000000 | 0 | Which document to start from. |
| **Sort (e.g. date:desc, name)** (`sort`) | text | empty | The order of the documents: fields separated by commas, each with `:asc` or `:desc` (`asc` by default), for example `data:desc, nome`. Or JSON (an Elasticsearch list or object). |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field** of the search: it is called **field 1**, **field 2**… and must be **renamed** with the name of the document field, for example `citta`.

Added inputs **only keep their value**: a value arriving there does not start the search. The search starts only with **run**. An input with no value (empty or `null`) does not count. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**, the block sends the search to the cluster (`POST /index/_search`) and sends **documents**, **total**, **aggregations** and **truncated**.

### The query and the body

- If the **query** is just a query (`{ "term": … }`), the search uses it as it is. If it has keys of a search body (`query`, `aggs`, `aggregations`, `_source`, `sort`, `size`, `from`, `highlight`, `track_total_hits`, `search_after`, `knn`…), it is a **whole body** and is sent as it is, with the **How many**, **From** and **Sort** settings overriding it.
- A JSON text is read; a text that is not JSON gives an error.
- To get only the aggregations, set **How many** to 0.

### The added inputs

Each added input with a value becomes a condition in AND with the query: a normal value becomes `{ "match": { "field": value } }`; a **list** becomes `{ "terms": { "field": [ … ] } }` (any one of the values). An object becomes JSON text. If the query takes all documents, only these conditions remain.

### How many documents

**How many** cannot exceed the module's limit (**Documents of a result**, 10000 by default): if you ask for more, the allowed ones come out and **truncated** is `true`. A result bigger than the maximum size is an error. To read past the first documents use **From** with **How many**, but Elasticsearch does not allow going beyond 10000 in total with `from + size`: for that you need `search_after` or other techniques in the body.

### Several indices

In **Index** you can write several indices separated by commas (`log-1, log-2`), up to 64.

## Examples

### 1. Search by word and show the results

Settings: **Index** `articoli`, **Query** `{ "match": { "titolo": "caffè" } }`, **Sort** `data:desc`, **How many** 20.

```
[Elasticsearch · Connection (connect)] connection ──▶ connection [Elasticsearch · Search (_search)] documents ──▶ rows [Table]
[Button: Search] pressed ──▶ run                                                  total ──▶ value [Value: found]
```

### 2. A filter with two fields

Two added inputs, renamed `citta` and `stato`. **Query** `{ "match_all": {} }`.

```
[Selection: city] value ──▶ citta [Elasticsearch · Search (_search)] documents ──▶ rows [Table]
[Selection: status] value ──▶ stato
[Button: Filter] pressed ──▶ run
```

If you choose `Roma` and `attivo`, the search is `bool.must = [ match citta=Roma, match stato=attivo ]`. A field left empty does not filter.

### 3. Count by group with aggregations

**Query**:

```
{ "size": 0, "aggs": { "per_citta": { "terms": { "field": "citta.keyword" } } } }
```

```
[Button: Count] pressed ──▶ run [Elasticsearch · Search (_search)] aggregations ──▶ object [Get property: per_citta.buckets] value ──▶ rows [Table]
```

The keys `size` and `aggs` make it a whole body; `size: 0` decides the number of documents. The aggregations are the hidden output **aggregations**.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca l'indice | No index. |
| Troppi indici (al massimo 64) | More than 64 indices in the list. |
| Nome dell'indice non valido: … | An index has capitals, forbidden symbols or spaces (see [Elasticsearch blocks](logicstudio-elasticsearch)). |
| Query non valido: serve un oggetto JSON | The query is a text that is not JSON. |
| Query non valido: serve un oggetto JSON { … } | The query is a list, a number or something else. |
| Quanti (size) non valido: … (un intero da 0 a 1000000) | **How many** is not an integer in that range. |
| Da (from) non valido: … (un intero da 0 a 1000000) | **From** is not an integer in that range. |
| Ordine non valido: JSON sbagliato | The order starts with `[` or `{` but is not JSON. |
| Ordine non valido: … (asc o desc) | An element of the order has a direction other than `asc` or `desc`. |
| Elasticsearch ha risposto 400 (richiesta non valida): search_phase_execution_exception: … | The query does not suit the cluster (wrong field type, syntax…). |
| Elasticsearch ha risposto 404 (non trovato): index_not_found_exception: … | The index does not exist. |

The common errors (connection, network, quotas, result too large) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Connection (connect)](es.connect), [Elasticsearch · Count (_count)](es.count), [Elasticsearch · Get document (get)](es.get), [Elasticsearch · Delete by query (_delete_by_query)](es.deleteByQuery)
- [Get property](core.get), to read a field of a result
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
