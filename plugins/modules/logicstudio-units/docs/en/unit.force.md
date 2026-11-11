# Force

`unit.force` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a force: newtons, kilonewtons, dynes, kilograms-force, pounds-force.

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
| **From** (`from`) | the units in the table below | N | The unit the value comes in. |
| **To** (`to`) | the units in the table below | kgf | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `N · kgf`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 kgf (or kp) is the weight of 1 kg at standard gravity: 9.80665 N. 1 lbf = 4.4482216152605 N.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `N` | newton | base unit |  |
| `kN` | kilonewton | 1000 N |  |
| `dyn` | dyne | 0.00001 N |  |
| `kgf` | kilogram-force | 9.80665 N | `kp` |
| `lbf` | pound-force | 4.4482216152605 N |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 10 kgf to N

```
[Constant · Variable: 10] value ──▶ value [Force: kgf · N] result ──▶ value [Print (console.log)]
```

Writes `98.0665`.

With **Round** and 2 **Decimals** it writes `98.07`.

### 2. 500 N to lbf

```
[Constant · Variable: 500] value ──▶ value [Force: N · lbf] result ──▶ value [Print (console.log)]
```

Writes `112.40447155`.

With **Round** and 2 **Decimals** it writes `112.4`.

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
