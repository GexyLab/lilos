# Data rate

`unit.dataRate` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a data rate: bits per second and their multiples, bytes per second and their multiples.

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
| **From** (`from`) | the units in the table below | Mbit/s | The unit the value comes in. |
| **To** (`to`) | the units in the table below | MB/s | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `Mbit/s · MB/s`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- Connections are measured in **bits** per second (Mbit/s), downloads often in **bytes** per second (MB/s): 1 B/s = 8 bit/s.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `bit/s` | bit per second | base unit | `bps` |
| `kbit/s` | kilobit per second | 1000 bit/s | `kbps`, `kb/s` |
| `Mbit/s` | megabit per second | 1000000 bit/s | `Mbps`, `Mb/s` |
| `Gbit/s` | gigabit per second | 1000000000 bit/s | `Gbps`, `Gb/s` |
| `B/s` | byte per second | 8 bit/s |  |
| `kB/s` | kilobyte per second | 8000 bit/s |  |
| `MB/s` | megabyte per second | 8000000 bit/s |  |
| `GB/s` | gigabyte per second | 8000000000 bit/s |  |
| `MiB/s` | mebibyte per second | 8388608 bit/s |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 100 Mbit/s to MB/s

```
[Constant · Variable: 100] value ──▶ value [Data rate: Mbit/s · MB/s] result ──▶ value [Print (console.log)]
```

Writes `12.5`.

### 2. 25 MB/s to Mbit/s

```
[Constant · Variable: 25] value ──▶ value [Data rate: MB/s · Mbit/s] result ──▶ value [Print (console.log)]
```

Writes `200`.

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
