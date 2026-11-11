# InfluxDB · Query (Flux · InfluxQL · SQL)

`influx.query` · Database · [InfluxDB blocks](logicstudio-influxdb) · version 1

Runs a query in **Flux** (InfluxDB 2.x and 1.8+), **InfluxQL** (1.x, 2.x, 3.x) or **SQL** (3.x) and sends the rows of the result. Each added input is a **parameter** of the query: `params.name` in Flux, `$name` in InfluxQL and SQL. The value goes to the server separately, it is not pasted into the query text.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the query. |
| **connection** (`connection`) | object | The handle from the **connection** output of [InfluxDB · Connection (connect)](influx.connect). It does not start the block. |
| **query** (`query`) | text | Hidden. If it has a non-empty value, it takes the place of the **Query** setting. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rows** (`rows`) | list | The rows of the result, each an object `{ "column": value }`, with values in their type (numbers, texts, yes/no; times are ISO texts). |
| **count** (`count`) | number | Hidden. How many rows came out. |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if there were more rows than the maximum and the others did not come out. |
| **Exception** (`error`) | object | When the query fails: missing connection, error in the query, language not suited to the server, result too large, quota used up… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Language** (`language`) | Flux (2.x), InfluxQL, SQL (3.x) | Flux (2.x) | The query language. |
| **Query** (`query`) | multi-line text | `from(bucket: "my-bucket")` and, on the next line, `  \|> range(start: -1h)` | The query to run, when the **query** input has no value. At most 100000 characters. |
| **Database for InfluxQL and SQL (empty: the connection's bucket)** (`bucket`) | text | empty | The database to query with InfluxQL and SQL. With Flux the bucket is written in the query. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **parameter**: it is called **parameter 1**, **parameter 2**… and must be **renamed** with the parameter name, for example `city`.

Added inputs **only keep their value**: a value arriving there does not start the query. The query starts only with **run**. An input with no value (or `null`) does not count. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**, the block sends the query to the server in the chosen language and, when the answer comes, sends **rows**, then **count** and **truncated**.

### Flux

- The block sends the query to `/api/v2/query` and reads the result (annotated CSV) of **all the tables**, one after the other, into a single list of rows.
- Values keep their type: `long` and `double` are numbers (an integer too big for a number stays text, like `+Inf`), `boolean` is yes/no, the rest is text; times are ISO texts (`2026-11-11T10:00:00Z`). An empty value is `null`.
- The **parameters**: in front of the query (after `import` and comments) the block puts `params = { name: value, … }`, and in the query you write `params.name`. Parameter names must be valid Flux names: letters, digits and `_`, not starting with a digit. A text is written safely, a list becomes a Flux list, an object a record.
- If the query gives an error, the server's message arrives on **Exception** as "Errore della query Flux: …".
- InfluxDB 3 has no Flux: it gives "InfluxDB 3 non usa Flux: scegli SQL o InfluxQL" (InfluxDB 3 does not use Flux: choose SQL or InfluxQL).

### InfluxQL

- The query goes to `/query` (the v1 API) on the chosen **database**: the one in the setting or, if empty, the connection's bucket. With 2.x the bucket acts as the database.
- Each row has `_measurement` (the measurement), the tags of the group and the columns (`time`, `mean`, …).
- Parameters are written `$name` in the query, and the value goes separately.
- Errors are "Errore della query InfluxQL: …".

### SQL (InfluxDB 3)

- The query goes to `/api/v3/query_sql` on the chosen database. Parameters are written `$name`.
- With a server that is not InfluxDB 3 it gives "Questo server non risponde a SQL: serve InfluxDB 3 (con InfluxDB 2 usa Flux o InfluxQL)" (this server does not answer SQL: InfluxDB 3 is needed).

### How many rows

At most as many rows as the module's maximum rows (10000 by default) come out: if there were more, **truncated** is `true`. A result bigger than the maximum size (4096 KB by default) is an error: ask for fewer rows or columns (`limit`, `aggregateWindow`, `LIMIT`…).

## Examples

### 1. The average temperature of each hour

Flux language, **Query**:

```
from(bucket: "casa")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "ambiente" and r._field == "value")
  |> aggregateWindow(every: 1h, fn: mean)
```

```
[InfluxDB · Connection (connect)] connection ──▶ connection [InfluxDB · Query (Flux · InfluxQL · SQL)] rows ──▶ rows [Table]
[Button: Refresh] pressed ──▶ run                                                      Exception ──▶ value [Print (console.log)]
```

The rows, with `_time` and `_value`, go into the [Table](ui.table).

### 2. A parameter: the room chosen by the user

Flux language. One added input, renamed `stanza`. **Query**:

```
from(bucket: "casa")
  |> range(start: -1h)
  |> filter(fn: (r) => r.stanza == params.stanza)
  |> last()
```

```
[Selection: room] value ──▶ stanza [InfluxDB · Query (Flux · InfluxQL · SQL)] rows ──▶ object [Get property: 0._value] value ──▶ value [Value]
[Button: Read]  pressed ──▶ run
```

If you choose `cucina` in the [Selection](ui.select), the block writes `params = {stanza: "cucina"}` in front of the query. Even a name like `x") |> drop() //` stays a plain text. [Get property](core.get) takes `_value` of the first row.

### 3. SQL on InfluxDB 3

SQL language, **Database** `casa`, one added input `soglia`. **Query**: `SELECT time, temp FROM ambiente WHERE temp > $soglia ORDER BY time DESC LIMIT 20`.

```
[Number field: threshold] value ──▶ soglia [InfluxDB · Query (Flux · InfluxQL · SQL)] rows ──▶ rows [Table]
[Button: Search] pressed ──▶ run
```

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca la query | The query is empty. |
| Query troppo lunga (al massimo 100000 caratteri) | The query is over 100000 characters. |
| Manca il bucket (nelle impostazioni del blocco o della connessione) | InfluxQL or SQL with no database. |
| Il bucket non valido: … | The database name is longer than 255 characters or has control characters. |
| Nome di parametro non valido per Flux: … | The name of an added input is not a valid Flux name. |
| Parametro troppo annidato | A parameter has too many levels of lists and objects. |
| Parametro non valido: Infinity | A numeric parameter is infinite. |
| Errore della query Flux: … | Flux found an error in the query (the server's message follows). |
| Errore della query InfluxQL: … | InfluxQL found an error in the query. |
| InfluxDB 3 non usa Flux: scegli SQL o InfluxQL | Flux on a 3.x server. |
| Questo server non risponde a SQL: serve InfluxDB 3 (con InfluxDB 2 usa Flux o InfluxQL) | SQL on a server that is not 3.x. |
| Risposta SQL non valida | The server answered SQL with something that is not a list. |
| Risposta CSV non valida: virgolette non chiuse | The Flux response is incomplete. |
| InfluxDB ha risposto 400 (richiesta non valida): … | The server refuses the query (also 401, 403, 404…). |

The common errors (connection, network, quotas, result too large) are in the page [InfluxDB blocks](logicstudio-influxdb).

## See also

- [InfluxDB · Connection (connect)](influx.connect), [InfluxDB · Write point (write)](influx.write), [InfluxDB · Buckets (list)](influx.buckets)
- [Interval (setInterval)](core.every), to read at intervals
- [Get property](core.get), to read a field of a row
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
