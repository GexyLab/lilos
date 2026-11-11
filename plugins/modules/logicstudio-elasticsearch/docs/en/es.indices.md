# Elasticsearch · Indices (_cat/indices)

`es.indices` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Lists the cluster's **indices**, with how many documents they have, their status and their size. It is useful to fill a selection or to keep an eye on data growth.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the request. |
| **connection** (`connection`) | object | The handle from the **connection** output of [Elasticsearch · Connection (connect)](es.connect). It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **names** (`names`) | list | The index names, in alphabetical order, for example `["eventi", "utenti"]`. |
| **indices** (`indices`) | list | Hidden. The indices in full: a list of objects `{ "index": "eventi", "health": "green", "status": "open", "docs": 1250, "bytes": 482113 }`. `docs` is the number of documents, `bytes` the size on disk; `health`, `status` or `docs` can be `null` (for example for a closed index). |
| **Exception** (`error`) | object | When the request fails: missing connection, permission denied, quota used up… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

This block has no settings.

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block asks `GET /_cat/indices` in JSON and sends **names**, then **indices**. At most as many indices as the module's maximum rows (10000 by default) come out. System indices (those starting with a dot) are there, if the cluster shows them to that user.

## Examples

### 1. Fill a selection

```
[Elasticsearch · Connection (connect)] connection ──▶ connection [Elasticsearch · Indices (_cat/indices)] names ──▶ options [Selection: index]
[Interval (setInterval): 600 s] pulse ──▶ run
```

### 2. A table of indices with their size

```
[Button: Refresh] pressed ──▶ run [Elasticsearch · Indices (_cat/indices)] indices ──▶ rows [Table]
```

The [Table](ui.table) shows a row per index with `docs` and `bytes`.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Elasticsearch ha risposto 403 (permesso negato): … | The user cannot read the list of indices. |
| Elasticsearch ha risposto 401 (utente, password o chiave API non validi): … | The credentials are no longer valid. |

The common errors (connection, network, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Count (_count)](es.count), [Elasticsearch · Search (_search)](es.search), [Elasticsearch · Connection (connect)](es.connect)
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
