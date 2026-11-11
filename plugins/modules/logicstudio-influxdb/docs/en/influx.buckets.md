# InfluxDB · Buckets (list)

`influx.buckets` · Database · [InfluxDB blocks](logicstudio-influxdb) · version 1

Lists the **buckets** the token can see (with InfluxDB 1.x and 3.x they are the **databases**). It is useful to fill a selection, or to check that a bucket exists before writing to it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the request. |
| **connection** (`connection`) | object | The handle from the **connection** output of [InfluxDB · Connection (connect)](influx.connect). It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **names** (`names`) | list | The bucket names, for example `["casa", "sensori", "_monitoring"]`. |
| **buckets** (`buckets`) | list | Hidden. The buckets in full: a list of objects `{ "name": "casa", "id": "0a1b…", "type": "user", "retentionSeconds": 0 }`. With 1.x and 3.x `id`, `type` and `retentionSeconds` are `null`. |
| **Exception** (`error`) | object | When the request fails: missing connection, token without permission, quota used up… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

This block has no settings.

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block asks the server for the list, in the way suited to the version:

1. **InfluxDB 2.x**: reads the buckets of the connection's organization, a hundred at a time (`retentionSeconds` is the retention period in seconds, 0 if infinite).
2. If the server does not have that API (3.x), it asks for the list of InfluxDB 3 **databases**.
3. If there is not even that (1.x), it runs `SHOW DATABASES` with InfluxQL.

At most as many items as the module's maximum rows (10000 by default) come out.

## Examples

### 1. Fill a selection with the buckets

```
[InfluxDB · Connection (connect)] connection ──▶ connection [InfluxDB · Buckets (list)] names ──▶ options [Selection: bucket]
[Interval (setInterval): 600 s] pulse ──▶ run
```

The [Selection](ui.select) shows the bucket names, refreshed every 10 minutes.

### 2. Check that a bucket exists

```
[InfluxDB · Buckets (list)] names ──▶ object [Get property: 0] value ──▶ a [Compare (== != < >): a = b] if false ──▶ send [Notify: "The first bucket is not casa"]
```

[Get property](core.get) takes the first name of the list and [Compare (== != < >)](core.compare) compares it with `casa` (b); if it differs, [Notify](lilos.notify) warns you before a write gives an error.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| InfluxDB ha risposto 401 (token o password non validi): … | The token is wrong (also 403: the token has no permission to read the buckets). |
| InfluxDB ha risposto 404 (non trovato): … | The organization does not exist. |
| Errore della query InfluxQL: … | With 1.x, `SHOW DATABASES` is not allowed for that user. |

The common errors (connection, network, quotas) are in the page [InfluxDB blocks](logicstudio-influxdb).

## See also

- [InfluxDB · Connection (connect)](influx.connect), [InfluxDB · Write point (write)](influx.write), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query)
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
