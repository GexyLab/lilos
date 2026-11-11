# Angle

`unit.angle` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts an angle: radians, degrees, arcminutes, arcseconds, gradians (gon), turns.

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
| **From** (`from`) | the units in the table below | ° | The unit the value comes in. |
| **To** (`to`) | the units in the table below | rad | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `° · rad`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 turn = 360° = 2π rad = 400 gon; 1° = 60′; 1′ = 60″.
- Sine and cosine of [Math functions](core.math) want the angle **in radians**: for an angle in degrees put this block before them, from **°** to **rad**.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `rad` | radian | base unit |  |
| `°` | degree | 0.0174532925199433 rad | `deg` |
| `′` | arcminute | 0.000290888208665722 rad | `'`, `arcmin` |
| `″` | arcsecond | 0.00000484813681109536 rad | `"`, `arcsec` |
| `gon` | gradian | 0.015707963267949 rad | `grad` |
| `rev` | turn | 6.28318530717959 rad | `turn` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 90 ° to rad

```
[Constant · Variable: 90] value ──▶ value [Angle: ° · rad] result ──▶ value [Print (console.log)]
```

Writes `1.57079632679`.

With **Round** and 2 **Decimals** it writes `1.57`.

### 2. 0.5 rev to °

```
[Constant · Variable: 0.5] value ──▶ value [Angle: rev · °] result ──▶ value [Print (console.log)]
```

Writes `180`.

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
