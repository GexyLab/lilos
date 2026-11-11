# Torque

`unit.torque` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a torque (moment of a force): newton metres, kilogram-force metres, pound-force feet and inches.

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
| **From** (`from`) | the units in the table below | N·m | The unit the value comes in. |
| **To** (`to`) | the units in the table below | lbf·ft | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `N·m · lbf·ft`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- Torque wrenches and engine data sheets use N·m or lbf·ft (also written lb·ft or ft·lbf).

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `N·m` | newton metre | base unit | `Nm`, `N*m`, `N m`, `N.m` |
| `kgf·m` | kilogram-force metre | 9.80665 N·m | `kgfm`, `kgf*m`, `kgm` |
| `lbf·ft` | pound-force foot | 1.3558179483314 N·m | `lbft`, `lb·ft`, `ft·lbf`, `lbf*ft` |
| `lbf·in` | pound-force inch | 0.112984829027617 N·m | `lbin`, `lb·in`, `in·lbf`, `lbf*in` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 120 N·m to lbf·ft

```
[Constant · Variable: 120] value ──▶ value [Torque: N·m · lbf·ft] result ──▶ value [Print (console.log)]
```

Writes `88.5074579133`.

With **Round** and 2 **Decimals** it writes `88.51`.

### 2. 25 kgf·m to N·m

```
[Constant · Variable: 25] value ──▶ value [Torque: kgf·m · N·m] result ──▶ value [Print (console.log)]
```

Writes `245.16625`.

With **Round** and 2 **Decimals** it writes `245.17`.

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
