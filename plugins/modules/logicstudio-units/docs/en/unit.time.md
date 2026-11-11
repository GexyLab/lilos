# Time

`unit.time` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a duration: seconds and their submultiples, minutes, hours, days, weeks, years.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value to convert, in the **From** unit. A text with a number (`"2.5"`, `"2,5"`) is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The value in the **To** unit. |
| **Exception** (`error`) | object | The value is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **From** (`from`) | the units in the table below | s | The unit the value comes in. |
| **To** (`to`) | the units in the table below | min | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `s · min`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- The year is the astronomers' Julian year, **365.25 days**. There is no month, because it has no fixed length.
- For dates and times of day there are the **Time** blocks of the [Core blocks](logicstudio-core).

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `s` | second | base unit |  |
| `ms` | millisecond | 0.001 s |  |
| `µs` | microsecond | 0.000001 s | `us`, `μs` |
| `ns` | nanosecond | 1e−9 s |  |
| `min` | minute | 60 s |  |
| `h` | hour | 3600 s |  |
| `d` | day | 86400 s |  |
| `wk` | week | 604800 s |  |
| `yr` | year (365.25 days) | 31557600 s |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 90 min to h

```
[Constant · Variable: 90] value ──▶ value [Time: min · h] result ──▶ value [Print (console.log)]
```

Writes `1.5`.

### 2. 2 d to s

```
[Constant · Variable: 2] value ──▶ value [Time: d · s] result ──▶ value [Print (console.log)]
```

Writes `172800`.

## Errors

| Message | When |
|---|---|
| Serve un numero ("A number is needed") | The value is not a number (for example a text like `"abc"`). |
| Unità sconosciuta: «…» ("Unknown unit") | A unit in Properties does not exist in this version of the package (a schema made with a newer version). |

## See also

- [Convert (from · to)](unit.convert) to choose the units while the program runs
- [Format measure](unit.format) to show the result with its unit
- [Quantities and units](logicstudio-units), all the quantities
- [How a block works](ide/blocks)
