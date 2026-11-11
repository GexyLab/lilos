# Data

`unit.data` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts an amount of data: bits, bytes and their decimal (kB, MB…) and binary (KiB, MiB…) multiples.

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
| **From** (`from`) | the units in the table below | MB | The unit the value comes in. |
| **To** (`to`) | the units in the table below | MiB | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `MB · MiB`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- **kB, MB, GB, TB** are decimal (1 kB = 1000 B); **KiB, MiB, GiB, TiB** are binary (1 KiB = 1024 B). Many systems write "GB" meaning GiB: a 500 GB disk is 465.66 GiB.
- 1 B = 8 bits. **kbit, Mbit, Gbit** are in bits (also written kb, Mb, Gb, with a lower-case b).

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `bit` | bit | base unit |  |
| `B` | byte | 8 bit | `byte` |
| `kB` | kilobyte (1000 B) | 8000 bit |  |
| `MB` | megabyte (1000 kB) | 8000000 bit |  |
| `GB` | gigabyte (1000 MB) | 8000000000 bit |  |
| `TB` | terabyte (1000 GB) | 8000000000000 bit |  |
| `KiB` | kibibyte (1024 B) | 8192 bit |  |
| `MiB` | mebibyte (1024 KiB) | 8388608 bit |  |
| `GiB` | gibibyte (1024 MiB) | 8589934592 bit |  |
| `TiB` | tebibyte (1024 GiB) | 8796093022208 bit |  |
| `kbit` | kilobit | 1000 bit | `kb` |
| `Mbit` | megabit | 1000000 bit | `Mb` |
| `Gbit` | gigabit | 1000000000 bit | `Gb` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 500 GB to GiB

```
[Constant · Variable: 500] value ──▶ value [Data: GB · GiB] result ──▶ value [Print (console.log)]
```

Writes `465.661287308`.

With **Round** and 2 **Decimals** it writes `465.66`.

### 2. 1 MiB to kB

```
[Constant · Variable: 1] value ──▶ value [Data: MiB · kB] result ──▶ value [Print (console.log)]
```

Writes `1048.576`.

With **Round** and 2 **Decimals** it writes `1048.58`.

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
