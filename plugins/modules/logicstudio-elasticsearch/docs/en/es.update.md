# Elasticsearch · Update (update)

`es.update` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Changes **some fields** of the document with an id (a *partial document*): the other fields stay as they are. With "Create it when missing" the document is added when it is not there (*upsert*).

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the update. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **fields to change** (`document`) | object | The fields to change, as an object (or JSON text): `{ "stato": "chiuso" }`. It does not start the block. |
| **id** (`id`) | text | The document id. A number is fine. It does not start the block. |
| **index** (`index`) | text | Hidden. If it has a non-empty value, it takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | text | `updated` (changed), `noop` (it was already so, nothing to change) or `created` (new, with upsert). |
| **id** (`id`) | text | Hidden. The document id. |
| **Exception** (`error`) | object | When the update fails: missing connection, document not found (without upsert), missing fields… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The document's index, when the **index** input has no value. |
| **Create it when missing (upsert)** (`upsert`) | yes / no | no | If ticked and the document is not there, it is created with the given fields. If not, it is an error. |
| **Visible to searches** (`refresh`) | Soon (as the index refreshes), Wait until visible (wait_for), At once (refresh: costly) | Soon | When the change shows up in searches. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block sends `POST /index/_update/id` with the partial document (and `doc_as_upsert` if needed). The given fields are **merged** into the document's: objects inside merge, lists and simple values are replaced. If the document changed between the cluster reading and writing it, the cluster retries up to 3 times.

## Examples

### 1. Close an order

```
[Elasticsearch · Connection (connect)] connection ──▶ connection [Elasticsearch · Update (update)] result ──▶ value [Notify: "Order updated"]
[Object literal { }] object ──▶ fields to change
[Text field: order id] text ──▶ id
[Button: Close] pressed ──▶ run
```

[Object literal { }](core.compose) prepares `{ "stato": "chiuso" }`; the other fields of the order do not change.

### 2. A counter with upsert

**Create it when missing** ticked. Every time an event arrives, the block writes `{ "ultimo_evento": "2026-11-11T10:00:00Z" }` into the document `sensore-1`: if it was not there it creates it, if it was there it changes only that field.

```
[Now (date and time)] ISO ──▶ value [Object literal { }: ultimo_evento] object ──▶ fields to change [Elasticsearch · Update (update)]
```

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca l'indice | No index. |
| Nome dell'indice non valido: … | The index has capitals, forbidden symbols or spaces (see [Elasticsearch blocks](logicstudio-elasticsearch)). |
| Manca l'id del documento | The id is empty. |
| Id del documento troppo lungo (al massimo 512 byte) | The id is over 512 bytes. |
| Manca il documento (i campi da cambiare) | The fields to change are empty. |
| Documento non valido: serve un oggetto JSON | It is a text that is not JSON. |
| Documento non valido: serve un oggetto JSON { … } | It is a list, a number or something else. |
| Elasticsearch ha risposto 404 (non trovato): document_missing_exception: … | The document is not there and upsert is not ticked. |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Index (index)](es.index), [Elasticsearch · Get document (get)](es.get), [Elasticsearch · Delete document (delete)](es.delete)
- [Object literal { }](core.compose), [Now (date and time)](core.now)
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
