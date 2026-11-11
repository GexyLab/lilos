# Fuel consumption

`unit.fuel` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a fuel consumption: litres per 100 km, kilometres per litre, miles per US and imperial gallon.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value to convert, in the **From** unit. A text with a number (`"2.5"`, `"2,5"`) is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The value in the **To** unit. |
| **Exception** (`error`) | object | The value is not a number or the consumption is 0 or negative. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **From** (`from`) | the units in the table below | L/100km | The unit the value comes in. |
| **To** (`to`) | the units in the table below | km/L | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `L/100km · km/L`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- These units are **the inverse of each other**: with L/100km less is better, with km/L and mpg more is better. The block uses the right formulas (km/L = 100 / L/100km), not a factor.
- For the same reason a consumption of **0 or less** cannot be converted: the block sends an exception (also from L/100km to L/100km, so the result does not depend on the target unit).
- **US mpg** and **UK mpg** use different gallons: 30 UK mpg is about 25 US mpg.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `L/100km` | litres per 100 km | base unit | `l/100km`, `L/100 km`, `l/100 km` |
| `km/L` | kilometres per litre | L/100km = 100 / km/L | `km/l` |
| `mpg US` | miles per US gallon | L/100km ≈ 235.215 / mpg US | `mpg` |
| `mpg UK` | miles per imperial gallon | L/100km ≈ 282.481 / mpg UK |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 6.5 L/100km to km/L

```
[Constant · Variable: 6.5] value ──▶ value [Fuel consumption: L/100km · km/L] result ──▶ value [Print (console.log)]
```

Writes `15.3846153846`.

With **Round** and 2 **Decimals** it writes `15.38`.

### 2. 35 mpg US to L/100km

```
[Constant · Variable: 35] value ──▶ value [Fuel consumption: mpg US · L/100km] result ──▶ value [Print (console.log)]
```

Writes `6.72041666667`.

With **Round** and 2 **Decimals** it writes `6.72`.

## Errors

| Message | When |
|---|---|
| Serve un numero ("A number is needed") | The value is not a number (for example a text like `"abc"`). |
| Il consumo deve essere maggiore di zero ("The consumption must be more than zero") | The value is 0 or negative. |
| Unità sconosciuta: «…» ("Unknown unit") | A unit in Properties does not exist in this version of the package (a schema made with a newer version). |

## See also

- [Convert (from · to)](unit.convert) to choose the units while the program runs
- [Format measure](unit.format) to show the result with its unit
- [Quantities and units](logicstudio-units), all the quantities
- [How a block works](ide/blocks)
