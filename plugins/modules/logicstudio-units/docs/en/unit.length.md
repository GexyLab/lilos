# Length

`unit.length` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a length (or a distance) from one unit to another: metres and their multiples, inches, feet, yards, miles, nautical miles.

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
| **From** (`from`) | the units in the table below | m | The unit the value comes in. |
| **To** (`to`) | the units in the table below | ft | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `m · ft`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- Inch, foot, yard and mile are the 1959 international ones: 1 in is **exactly** 2.54 cm.
- The nautical mile is exactly 1852 m.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `m` | metre | base unit |  |
| `km` | kilometre | 1000 m |  |
| `cm` | centimetre | 0.01 m |  |
| `mm` | millimetre | 0.001 m |  |
| `µm` | micrometre | 0.000001 m | `um`, `μm` |
| `nm` | nanometre | 1e−9 m |  |
| `in` | inch | 0.0254 m |  |
| `ft` | foot | 0.3048 m |  |
| `yd` | yard | 0.9144 m |  |
| `mi` | mile | 1609.344 m |  |
| `nmi` | nautical mile | 1852 m | `NM` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 5 mi to km

```
[Constant · Variable: 5] value ──▶ value [Length: mi · km] result ──▶ value [Print (console.log)]
```

Writes `8.04672`.

With **Round** and 2 **Decimals** it writes `8.05`.

### 2. 180 cm to ft

```
[Constant · Variable: 180] value ──▶ value [Length: cm · ft] result ──▶ value [Print (console.log)]
```

Writes `5.90551181102`.

With **Round** and 2 **Decimals** it writes `5.91`.

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
