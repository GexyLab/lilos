# Elasticsearch · Bulk index (_bulk)

`es.bulk` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Indexes a **list of documents** with a single request: much faster than one document at a time. The id of each document can come from one of its fields, if you name it; otherwise the cluster picks it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the write. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **documents** (`documents`) | list | The list of documents: each an object (or a JSON text of an object). It does not start the block. |
| **index** (`index`) | text | Hidden. If it has a non-empty value, it takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **indexed** (`indexed`) | number | How many documents were written. |
| **errors** (`errors`) | number | Hidden. How many documents were not written. |
| **failed** (`failed`) | list | Hidden. The documents that failed (at most the first 100), each `{ "position": 3, "id": "abc", "status": 400, "error": "mapper_parsing_exception: …" }`: `position` is the place in the list (from 0). |
| **Exception** (`error`) | object | When the whole request fails: missing connection, list too long, an invalid document, cluster refusing… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The index to write to, when the **index** input has no value. |
| **Field with the id (empty: automatic)** (`idField`) | text | empty | The name of the field that holds each document's id (for example `codice`). A document without that field (or with an empty value) gets an automatic id. With the same id, a new document replaces the old one. |
| **Visible to searches** (`refresh`) | Soon (as the index refreshes), Wait until visible (wait_for), At once (refresh: costly) | Soon | When the documents show up in searches. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block sends all the documents with `POST /index/_bulk` and sends **indexed**, then **errors** and **failed**.

- An empty list does nothing: `indexed` is 0.
- The documents are at most as many as the module's maximum rows (10000 by default).
- The cluster answers for each document: if some fail and others do not, **it is not an error of the block**. The good ones are written; **errors** says how many were not, and **failed** says which and why (the first 100). Check **errors** after an important upload.
- The id field can hold a text or a number; an object becomes JSON text.

## Examples

### 1. Load a list

```
[Array literal [ ]] list ──▶ documents [Elasticsearch · Bulk index (_bulk)] indexed ──▶ value [Value: loaded]
[Elasticsearch · Connection (connect)] connection ──▶ connection
[Button: Load] pressed ──▶ run
```

Settings: **Index** `prodotti`, **Field with the id** `codice`. If the list contains `{ "codice": "A1", "nome": "Caffè" }`, the document has id `A1`: loading the same list again updates the documents, it does not duplicate them.

### 2. Warn if something went wrong

```
[Elasticsearch · Bulk index (_bulk)] errors ──▶ a [Compare (== != < >): a < b] if false ──▶ send [Notify: "Some documents were not loaded"]
                                             [Constant · Variable: 1] value ──▶ b
```

With 0 errors `0 < 1` is true and nothing happens; with 1 or more, [Notify](lilos.notify) warns you. **failed** says which documents.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca l'indice | No index. |
| Nome dell'indice non valido: … | The index has capitals, forbidden symbols or spaces (see [Elasticsearch blocks](logicstudio-elasticsearch)). |
| Troppi documenti in una volta: 20000 (al massimo 10000) | The list has more documents than the module's limit. |
| Il documento 3 è vuoto | An element of the list is empty (the number is its position, from 1). |
| Documento 3 non valido: serve un oggetto JSON | An element is a text that is not JSON. |
| Documento 3 non valido: serve un oggetto JSON { … } | An element is a list, a number or something else. |
| Id del documento 3 troppo lungo | A document's id is over 512 bytes. |
| Elasticsearch ha risposto 413 (richiesta troppo grande): … | The request is too large for the cluster: send fewer documents at a time. |
| Elasticsearch ha risposto 404 (non trovato): … | The cluster usually creates the index; if it does not, it may not be allowed. |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Index (index)](es.index), [Elasticsearch · Count (_count)](es.count), [Elasticsearch · Connection (connect)](es.connect)
- [Array literal [ ]](core.list), to prepare a list
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
