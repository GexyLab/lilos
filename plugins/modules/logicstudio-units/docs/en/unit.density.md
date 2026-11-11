# Density

`unit.density` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a density (mass per volume): kilograms per cubic metre, grams per cubic centimetre, kilograms and grams per litre, pounds per cubic foot.

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
| **From** (`from`) | the units in the table below | kg/m³ | The unit the value comes in. |
| **To** (`to`) | the units in the table below | g/cm³ | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `kg/m³ · g/cm³`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 g/cm³ = 1 kg/L = 1000 kg/m³; 1 g/L = 1 kg/m³. Water is about 1 g/cm³.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `kg/m³` | kilogram per cubic metre | base unit | `kg/m3` |
| `g/cm³` | gram per cubic centimetre | 1000 kg/m³ | `g/cm3`, `g/cc` |
| `kg/L` | kilogram per litre | 1000 kg/m³ | `kg/l` |
| `g/L` | gram per litre | 1 kg/m³ | `g/l` |
| `lb/ft³` | pound per cubic foot | 16.0184633739601 kg/m³ | `lb/ft3` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 7.85 g/cm³ to kg/m³

```
[Constant · Variable: 7.85] value ──▶ value [Density: g/cm³ · kg/m³] result ──▶ value [Print (console.log)]
```

Writes `7850`.

### 2. 62.4 lb/ft³ to kg/m³

```
[Constant · Variable: 62.4] value ──▶ value [Density: lb/ft³ · kg/m³] result ──▶ value [Print (console.log)]
```

Writes `999.552114535`.

With **Round** and 2 **Decimals** it writes `999.55`.

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
