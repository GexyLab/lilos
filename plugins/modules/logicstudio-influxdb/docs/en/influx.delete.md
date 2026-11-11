# InfluxDB · Delete data (delete)

`influx.delete` · Database · [InfluxDB blocks](logicstudio-influxdb) · version 1

Deletes from a bucket the points of a **time range** that match a **filter** (*predicate*), for example `_measurement="cpu" AND host="a"`. It works only with **InfluxDB 2.x** (`POST /api/v2/delete`). **It really deletes, for good**: try it first with **Test** on a test bucket.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the deletion. |
| **connection** (`connection`) | object | The handle from the **connection** output of [InfluxDB · Connection (connect)](influx.connect). It does not start the block. |
| **start** (`start`) | any | The start of the range: an ISO date or milliseconds since 1970. If it has a non-empty value, it takes the place of the **Start** setting. It does not start the block. |
| **stop** (`stop`) | any | The end of the range, like **start**. It takes the place of the **Stop** setting. It does not start the block. |
| **filter (predicate)** (`predicate`) | text | Hidden. If it has a non-empty value, it takes the place of the **Filter** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **done** (`done`) | pulse | When the deletion succeeded. |
| **Exception** (`error`) | object | When the deletion fails: missing filter, invalid dates, server that is not 2.x, token without permission… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Filter (predicate)** (`predicate`) | multi-line text | empty | Which points to delete, for example `_measurement="ambiente" AND stanza="cucina"`. At most 10000 characters. |
| **Start (ISO date; empty: 1970)** (`start`) | text | empty | From when to delete. Empty: from 1970, that is from the beginning. |
| **Stop (ISO date; empty: now)** (`stop`) | text | empty | Until when to delete. Empty: until now. |
| **Bucket (empty: the connection's)** (`bucket`) | text | empty | The bucket to delete from. Empty: the connection's. |
| **All the data of the range (without a filter)** (`all`) | yes / no | no | Without a filter the block refuses to delete, unless this box is ticked: then it deletes **all** the data of the range. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**:

1. If there is no filter and the **All the data of the range** box is not ticked, the block stops with an error: deleting everything must be a deliberate choice.
2. The dates (from the input or the settings) are read as an ISO date (`2026-11-11T10:00:00Z`) or as milliseconds; without **start** it starts from 1970, without **stop** it goes up to now.
3. The block asks the server to delete, and sends **done** when it has said yes.

The filter uses the syntax of InfluxDB's *delete predicates*: `=` comparisons between a key and a quoted text, joined by `AND`. The filter rules are those of InfluxDB 2: if the filter does not follow them, the server refuses it.

With InfluxDB 3 and 1.x the server does not have this API: the block gives an error.

## Examples

### 1. Delete the data of a faulty sensor

Settings: **Filter** `_measurement="ambiente" AND stanza="cantina"`, **Start** `2026-11-10T00:00:00Z`, **Stop** `2026-11-11T00:00:00Z`.

```
[Button: Delete] pressed ──▶ run [InfluxDB · Delete data (delete)] done ──▶ send [Notify: "Data deleted"]
[InfluxDB · Connection (connect)] connection ──▶ connection           Exception ──▶ value [Print (console.log)]
```

### 2. Keep only the last 30 days, every night

Settings: **Filter** `_measurement="ambiente"`, **Start** empty. The **stop** comes from an input.

```
[Interval (setInterval): 86400 s] pulse ──▶ read [Now (date and time)] ISO ──▶ stop [InfluxDB · Delete data (delete)]
                                  pulse ──▶ run
```

A date calculation that subtracts 30 days from now gives the **stop** (an ISO text). The block deletes everything older than that. With an [Interval (setInterval)](core.every) the block also starts when the program starts: remember that every start deletes.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca il filtro (predicate): senza filtro si cancellano tutti i dati dell'intervallo; spunta «Tutti i dati dell'intervallo» per farlo davvero | Empty filter and box not ticked. |
| Filtro troppo lungo | The filter is longer than 10000 characters. |
| Inizio non valido: … (serve una data ISO, come 2026-11-11T10:00:00Z) | The start is not a date. |
| Fine non valido: … (serve una data ISO, come 2026-11-11T10:00:00Z) | The stop is not a date. |
| Manca il bucket (nelle impostazioni del blocco o della connessione) | No bucket, neither in the block nor in the connection. |
| Il bucket non valido: … | The name is longer than 255 characters or has control characters. |
| Questo server non sa cancellare con un filtro (/api/v2/delete): serve InfluxDB 2 | The server is not 2.x. |
| InfluxDB ha risposto 400 (richiesta non valida): … | The filter is not valid for InfluxDB. |
| InfluxDB ha risposto 403 (il token non ha il permesso): … | The token cannot delete in that bucket. |

The common errors (connection, network, quotas) are in the page [InfluxDB blocks](logicstudio-influxdb).

## See also

- [InfluxDB · Connection (connect)](influx.connect), [InfluxDB · Write point (write)](influx.write), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query)
- [Interval (setInterval)](core.every), [Now (date and time)](core.now)
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
