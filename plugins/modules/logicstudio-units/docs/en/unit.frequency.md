# Frequency

`unit.frequency` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a frequency or a rotation speed: hertz and its multiples, revolutions per minute, radians per second.

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
| **From** (`from`) | the units in the table below | Hz | The unit the value comes in. |
| **To** (`to`) | the units in the table below | rpm | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `Hz · rpm`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 Hz = 60 rpm = 2π rad/s.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `Hz` | hertz | base unit |  |
| `kHz` | kilohertz | 1000 Hz |  |
| `MHz` | megahertz | 1000000 Hz |  |
| `GHz` | gigahertz | 1000000000 Hz |  |
| `rpm` | revolutions per minute | 0.0166666666666667 Hz | `giri/min` |
| `rad/s` | radian per second | 0.159154943091895 Hz |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 3000 rpm to Hz

```
[Constant · Variable: 3000] value ──▶ value [Frequency: rpm · Hz] result ──▶ value [Print (console.log)]
```

Writes `50`.

### 2. 2.4 GHz to MHz

```
[Constant · Variable: 2.4] value ──▶ value [Frequency: GHz · MHz] result ──▶ value [Print (console.log)]
```

Writes `2400`.

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
