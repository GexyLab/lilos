# Area

`unit.area` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts an area: square metres and their multiples, hectares, ares, square inches, feet, yards and miles, acres.

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
| **From** (`from`) | the units in the table below | m² | The unit the value comes in. |
| **To** (`to`) | the units in the table below | ft² | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `m² · ft²`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 ha = 10000 m², 1 a (are) = 100 m².
- The acre is the international one: 4046.8564224 m².

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `m²` | square metre | base unit | `m2`, `m^2`, `mq` |
| `km²` | square kilometre | 1000000 m² | `km2`, `km^2` |
| `cm²` | square centimetre | 0.0001 m² | `cm2`, `cm^2` |
| `mm²` | square millimetre | 0.000001 m² | `mm2`, `mm^2` |
| `ha` | hectare | 10000 m² |  |
| `a` | are | 100 m² |  |
| `in²` | square inch | 0.00064516 m² | `in2`, `sq in` |
| `ft²` | square foot | 0.09290304 m² | `ft2`, `sq ft` |
| `yd²` | square yard | 0.83612736 m² | `yd2`, `sq yd` |
| `ac` | acre | 4046.8564224 m² | `acre` |
| `mi²` | square mile | 2589988.110336 m² | `mi2`, `sq mi` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 2.5 ha to m²

```
[Constant · Variable: 2.5] value ──▶ value [Area: ha · m²] result ──▶ value [Print (console.log)]
```

Writes `25000`.

### 2. 1000 ft² to m²

```
[Constant · Variable: 1000] value ──▶ value [Area: ft² · m²] result ──▶ value [Print (console.log)]
```

Writes `92.90304`.

With **Round** and 2 **Decimals** it writes `92.9`.

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
