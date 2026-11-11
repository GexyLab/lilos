# Elasticsearch · Delete document (delete)

`es.delete` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Deletes the document with an **id** from an index. If the document is not there it is not an error: **found** is `false`. **It really deletes**: try it first with **Test** on a test index.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the deletion. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **id** (`id`) | text | The id of the document to delete. A number is fine. It does not start the block. |
| **index** (`index`) | text | Hidden. If it has a non-empty value, it takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **found** (`found`) | yes/no | `true` if the document was there and was deleted, `false` if it was not there. |
| **result** (`result`) | text | Hidden. `deleted` or `not_found`. |
| **Exception** (`error`) | object | When the deletion fails: missing connection, invalid index or id, index not found… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The document's index, when the **index** input has no value. |
| **Visible to searches** (`refresh`) | Soon (as the index refreshes), Wait until visible (wait_for), At once (refresh: costly) | Soon | When the deletion shows up in searches. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block sends `DELETE /index/_doc/id` and sends **found**, then **result**. It deletes one document only: for many documents use [Elasticsearch · Delete by query (_delete_by_query)](es.deleteByQuery).

## Examples

### 1. Delete a document from a button

```
[Text field: id] text ──▶ id [Elasticsearch · Delete document (delete)] found ──▶ a [Compare (== != < >): a = b] if false ──▶ send [Notify: "It was not there"]
[Button: Delete] pressed ──▶ run                                       [Constant · Variable: true] value ──▶ b
```

### 2. Delete the id read from a list

```
[Elasticsearch · Search (_search)] documents ──▶ object [Get property: 0._id] value ──▶ id [Elasticsearch · Delete document (delete)]
[Interval (setInterval): 3600 s] pulse ──▶ run [Elasticsearch · Search (_search)]
```

Every hour the search finds the documents of a queue; [Get property](core.get) takes the `_id` of the first and the block deletes it. The document is identified by its `_id`, which every result of [Elasticsearch · Search (_search)](es.search) carries. Linking **run** of the delete block too (through a short [Delay (setTimeout)](core.delay)) starts the deletion after the id has arrived.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca l'indice | No index. |
| Nome dell'indice non valido: … | The index has capitals, forbidden symbols or spaces (see [Elasticsearch blocks](logicstudio-elasticsearch)). |
| Manca l'id del documento | The id is empty. |
| Id del documento troppo lungo (al massimo 512 byte) | The id is over 512 bytes. |
| Elasticsearch ha risposto 404 (non trovato): … | The index does not exist. |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Delete by query (_delete_by_query)](es.deleteByQuery), [Elasticsearch · Index (index)](es.index), [Elasticsearch · Get document (get)](es.get)
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
