# Mass

`unit.mass` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a mass (what is usually called "weight"): tonnes, kilograms and their submultiples, pounds, ounces, stones, carats.

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
| **From** (`from`) | the units in the table below | kg | The unit the value comes in. |
| **To** (`to`) | the units in the table below | lb | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `kg · lb`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- The pound is the international one: exactly 0.45359237 kg; 1 lb = 16 oz; 1 st = 14 lb.
- The tonne is the metric one (1000 kg), not the US or UK "ton".
- The carat (of gems) is 0.2 g.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `kg` | kilogram | base unit |  |
| `t` | tonne | 1000 kg |  |
| `g` | gram | 0.001 kg |  |
| `mg` | milligram | 0.000001 kg |  |
| `µg` | microgram | 1e−9 kg | `ug`, `μg`, `mcg` |
| `lb` | pound | 0.45359237 kg | `lbs` |
| `oz` | ounce | 0.028349523125 kg |  |
| `st` | stone | 6.35029318 kg | `stone` |
| `ct` | carat | 0.0002 kg |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 70 kg to lb

```
[Constant · Variable: 70] value ──▶ value [Mass: kg · lb] result ──▶ value [Print (console.log)]
```

Writes `154.323583529`.

With **Round** and 2 **Decimals** it writes `154.32`.

### 2. 8 oz to g

```
[Constant · Variable: 8] value ──▶ value [Mass: oz · g] result ──▶ value [Print (console.log)]
```

Writes `226.796185`.

With **Round** and 2 **Decimals** it writes `226.8`.

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
