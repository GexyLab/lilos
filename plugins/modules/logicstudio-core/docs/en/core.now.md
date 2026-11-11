# Date and time

`core.now` · Time · [Core blocks](logicstudio-core) · version 1

Reads the date and time right now and sends them in three forms: as ISO text, as a number of milliseconds and as an object with year, month, day, hour…

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Any value that arrives here makes it read the time. What arrives does not matter. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **ISO** (`iso`) | text | The date and time in ISO format, **in universal time** (UTC): for example `2026-11-11T14:05:01.003Z`. |
| **milliseconds** (`ms`) | number | The milliseconds passed since 1 January 1970 at 00:00 UTC: for example `1794405901003`. |
| **parts** (`parts`) | object | The date and time split into fields, **in local time** (see below). |
| **Exception** (`error`) | object | In practice it does not happen. |

## How it works

Every time something arrives on **read**, the block reads the clock and sends, in this order, **ISO**, **milliseconds** and **parts**. The three outputs describe the same instant.

The **parts** object has these fields, all numbers:

| Field | What it holds | Values |
|---|---|---|
| `year` | the year | for example 2026 |
| `month` | the month | from 1 (January) to 12 (December) |
| `day` | the day of the month | from 1 to 31 |
| `hour` | the hour | from 0 to 23 |
| `minute` | the minutes | from 0 to 59 |
| `second` | the seconds | from 0 to 59 |
| `weekday` | the day of the week | from 0 (**Sunday**) to 6 (Saturday): Monday is 1 |

Good to know:

- The clock is the one of the **computer where lilOS runs**, not the one of your browser. The **local** time of **parts** is also that of the time zone of that computer: if lilOS runs on a server in another country, **parts** has the time of that place.
- **ISO** is always in universal time (it ends with `Z`): in Italy in winter it is one hour behind **parts**, in summer two.
- The numbers of **parts** have no zero in front: 9:05 is `hour` 9 and `minute` 5.
- There are no milliseconds in **parts**: use **milliseconds** or **ISO**.
- **milliseconds** is for measuring how much time passes: the difference between two readings, with [Subtract](core.subtract), is the duration in milliseconds.

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. The three outputs

Read on 11 November 2026 at 15:05:01 in Italy (winter time, UTC+1):

| Output | Value |
|---|---|
| **ISO** | `"2026-11-11T14:05:01.003Z"` |
| **milliseconds** | `1794405901003` |
| **parts** | `{"year": 2026, "month": 11, "day": 11, "hour": 15, "minute": 5, "second": 1, "weekday": 3}` (Wednesday) |

### 2. A line with the time at every click

```
[Button: Clock in] pressed ──▶ read [Date and time] parts ──▶ object [Split object] hour   ──▶ h [Format text: "In at {h}:{m}"] text ──▶ value [Write to console]
                                                                                    minute ──▶ m
```

On [Format text](core.format) add two inputs, rename them **h** and **m**, and remove **starts it** from **h**, so it writes a single line per click: `In at 15:5`.

### 3. How long it took

```
[Button: Go]   pressed ──▶ read [Date and time A] milliseconds ──▶ b [Subtract] result ──▶ a [Divide: b = 1000] result ──▶ value [Write to console]
[Button: Stop] pressed ──▶ read [Date and time B] milliseconds ──▶ a
```

On [Subtract](core.subtract) remove **starts it** from **b**: at the click on **Stop** the console writes the seconds passed since the click on **Go**, for example `12.48`. On [Divide](core.divide) the input **b** has the initial value 1000 and **starts it removed** (otherwise at start Divide would run with **a** empty and the console would write `0`).

### 4. Only on weekdays

```
[Every… 3600 s] pulse ──▶ read [Date and time] parts ──▶ object [Get field: weekday] value ──▶ a [Compare: a ≥ b, b = 1] …
```

With a second Compare (`a ≤ b`, **b** = 5) and an [AND](core.and) you know whether today is a day from Monday to Friday. On the two Compare blocks remove **starts it** from **b**, which has only the initial value.

## See also

- [Every…](core.every) to read the time at intervals
- [Split object](core.decompose) and [Get field](core.get) to use the fields of **parts**
- [Format text](core.format)
- [How a block works](ide/blocks)
