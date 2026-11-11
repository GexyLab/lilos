# Elasticsearch · Get document (get)

`es.get` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Reads the **document** with an id from an index. If the document is not there it is not an error: **found** is `false` and **document** is `null`.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the read. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **id** (`id`) | text | The id of the document to read. A number is fine. It does not start the block. |
| **index** (`index`) | text | Hidden. If it has a non-empty value, it takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **document** (`document`) | object | The document (its `_source`, that is the fields you wrote), or `null` if it is not there. The id is not inside the document. |
| **found** (`found`) | yes/no | `true` if the document is there. |
| **Exception** (`error`) | object | When the read fails: missing connection, invalid index, missing id, index not found… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The index to read, when the **index** input has no value. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block asks `GET /index/_doc/id` and sends **document**, then **found**. An id that does not exist (404 with `found: false`) gives `null` and `false`. An index that does not exist is instead a cluster error ("no such index").

## Examples

### 1. Show a document

```
[Text field: id] text ──▶ id [Elasticsearch · Get document (get)] document ──▶ object [Get property: messaggio] value ──▶ value [Value]
[Button: Read] pressed ──▶ run
```

### 2. Warn if it is missing

```
[Elasticsearch · Get document (get)] found ──▶ a [Compare (== != < >): a = b] if false ──▶ send [Notify: "Document not found"]
                                     [Constant · Variable: true] value ──▶ b
```

With **found** `false` the comparison with `true` gives false and [Notify](lilos.notify) warns you.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca l'indice | No index, neither in the input nor in the settings. |
| Nome dell'indice non valido: … | The index has capitals, forbidden symbols or spaces, or starts with `-`, `_`, `+` (see [Elasticsearch blocks](logicstudio-elasticsearch)). |
| Manca l'id del documento | The id is empty. |
| Id del documento troppo lungo (al massimo 512 byte) | The id is over 512 bytes. |
| Elasticsearch ha risposto 404 (non trovato): … | The index does not exist. |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Index (index)](es.index), [Elasticsearch · Search (_search)](es.search), [Elasticsearch · Update (update)](es.update)
- [Get property](core.get), to read a field of the document
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
