# Temperature

`unit.temperature` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a temperature between degrees Celsius, Fahrenheit, kelvins and degrees Rankine.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value to convert, in the **From** unit. A text with a number (`"2.5"`, `"2,5"`) is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The value in the **To** unit. |
| **Exception** (`error`) | object | The value is not a number or the temperature is below absolute zero. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **From** (`from`) | the units in the table below | °C | The unit the value comes in. |
| **To** (`to`) | the units in the table below | °F | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `°C · °F`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- These units **do not share the same zero**: multiplying is not enough, the block uses the right formulas (°F = °C × 9/5 + 32; K = °C + 273.15; °R = K × 9/5).
- A temperature **below absolute zero** (under 0 K, that is −273.15 °C or −459.67 °F) does not exist: the block sends an exception.
- **It converts temperatures, not temperature differences.** A difference of 10 °C is a difference of 18 °F, but the block converts 10 °C to 50 °F. For a difference use Celsius ↔ kelvin (the same) or multiply by 9/5.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `°C` | degree Celsius | K = °C + 273.15 | `C`, `degC`, `℃` |
| `°F` | degree Fahrenheit | K = (°F + 459.67) × 5/9 | `F`, `degF`, `℉` |
| `K` | kelvin | base unit |  |
| `°R` | degree Rankine | K = °R × 5/9 | `R`, `degR` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 37 °C to °F

```
[Constant · Variable: 37] value ──▶ value [Temperature: °C · °F] result ──▶ value [Print (console.log)]
```

Writes `98.6`.

### 2. −40 °C to °F

```
[Constant · Variable: -40] value ──▶ value [Temperature: °C · °F] result ──▶ value [Print (console.log)]
```

Writes `-40`.

## Errors

| Message | When |
|---|---|
| Serve un numero ("A number is needed") | The value is not a number (for example a text like `"abc"`). |
| Temperatura sotto lo zero assoluto ("Temperature below absolute zero") | The value is below 0 K (−273.15 °C, −459.67 °F, 0 °R). |
| Unità sconosciuta: «…» ("Unknown unit") | A unit in Properties does not exist in this version of the package (a schema made with a newer version). |

## See also

- [Convert (from · to)](unit.convert) to choose the units while the program runs
- [Format measure](unit.format) to show the result with its unit
- [Quantities and units](logicstudio-units), all the quantities
- [How a block works](ide/blocks)
