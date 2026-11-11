# Elasticsearch · Index (index)

`es.index` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Adds a **document** to an index. With an **id** it writes exactly the document with that id (if it exists, it replaces it); without an id, Elasticsearch picks one. If the index does not exist, the cluster usually creates it by itself.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the write. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |
| **document** (`document`) | object | The document to write: an object, or a JSON text. It does not start the block. |
| **id** (`id`) | text | The document id. Empty: the cluster picks it. A number is fine. It does not start the block. |
| **index** (`index`) | text | Hidden. If it has a non-empty value, it takes the place of the **Index** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **id** (`id`) | text | The id of the written document (the given one or the one the cluster picked). |
| **result** (`result`) | text | Hidden. `created` if the document is new, `updated` if it replaced one. |
| **Exception** (`error`) | object | When the write fails: missing connection, invalid index, missing document, id already present (with "Only if new"), quota used up… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Index** (`index`) | text | empty | The index to write to, when the **index** input has no value. |
| **Visible to searches** (`refresh`) | Soon (as the index refreshes), Wait until visible (wait_for), At once (refresh: costly) | Soon | When the document shows up in searches. "Soon" is Elasticsearch's normal behavior (about a second). `wait_for` makes the block wait until the document is visible; "At once" forces a refresh, which costs the cluster. |
| **Only if new (op_type create)** (`create`) | yes / no | no | If ticked and there is an **id**, the write succeeds only if that id does not exist; otherwise it is a conflict error. Without an id nothing changes. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block sends the document to the cluster: with an **id** `PUT /index/_doc/id`, without an id `POST /index/_doc`. When the cluster says yes, **id** comes out, then **result**.

- The **index** must have a valid name (see [Elasticsearch blocks](logicstudio-elasticsearch)): lower case, no spaces or symbols.
- The **document** must be an object; a JSON text is read. A list or a number do not work.
- The **id** can be a text or a number, up to 512 bytes.
- With the same id, a second document **replaces** the first (the whole document, not just the changed fields: for that there is [Elasticsearch · Update (update)](es.update)).

## Examples

### 1. A document with an automatic id

```
[Elasticsearch · Connection (connect)] connection ──▶ connection [Elasticsearch · Index (index)] id ──▶ value [Print (console.log)]
[Object literal { }] object ──▶ document
[Button: Save] pressed ──▶ run
```

Settings: **Index** `eventi`. The cluster picks the id and sends it on **id**.

### 2. One document per user, without overwriting

Settings: **Index** `utenti`, **Only if new** ticked.

```
[Text field: name] text ──▶ id [Elasticsearch · Index (index)] id ──▶ value [Notify: "User created"]
[Object literal { }] object ──▶ document                          Exception ──▶ value [Notify: "Already exists"]
[Button: Create] pressed ──▶ run
```

If a document with that id already exists, the cluster answers 409 and [Notify](lilos.notify) shows "Already exists".

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Id del documento non valido: «..» | The id is `.` or `..`, which in the address would mean the whole index (id not valid). |
| Manca l'indice | No index, neither in the input nor in the settings. |
| Nome dell'indice non valido: … (solo lettere minuscole) | The index has capital letters. |
| Nome dell'indice non valido: … (niente \ / * ? " < > \| , # : né spazi) | The index has forbidden symbols or spaces. |
| Nome dell'indice non valido: … (non può cominciare con - _ +) | The index starts with `-`, `_` or `+`. |
| Nome dell'indice troppo lungo (al massimo 255 byte) | The index is too long. |
| Id del documento troppo lungo (al massimo 512 byte) | The id is too long. |
| Manca il documento (un oggetto) | The document is empty. |
| Documento non valido: serve un oggetto JSON | The document is a text that is not JSON. |
| Documento non valido: serve un oggetto JSON { … } | The document is a list, a number or something else. |
| Elasticsearch ha risposto 409 (conflitto: il documento c'è già o è cambiato): … | With "Only if new", the id exists. |
| Elasticsearch ha risposto 400 (richiesta non valida): … | The document does not agree with the index mapping (for example a text in a numeric field). |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Connection (connect)](es.connect), [Elasticsearch · Get document (get)](es.get), [Elasticsearch · Update (update)](es.update), [Elasticsearch · Bulk index (_bulk)](es.bulk)
- [Object literal { }](core.compose), to prepare the document
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
