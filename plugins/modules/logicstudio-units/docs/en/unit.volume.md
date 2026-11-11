# Volume

`unit.volume` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a volume or a capacity: cubic metres and centimetres, litres and their submultiples, cubic inches and feet, US and imperial gallons, quarts, pints and fluid ounces.

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
| **From** (`from`) | the units in the table below | L | The unit the value comes in. |
| **To** (`to`) | the units in the table below | gal US | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `L · gal US`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 L = 1 dm³ = 1000 cm³; 1 mL = 1 cm³.
- **US** and **imperial (UK)** units are different and chosen apart: 1 US gal = 3.785411784 L, 1 UK gal = 4.54609 L.
- The US quart and pint are the liquid ones (1/4 and 1/8 of a US gallon); the imperial pint is 1/8 of an imperial gallon. The US fluid ounce is 1/128 of a US gallon, the imperial one 1/160 of an imperial gallon.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `m³` | cubic metre | base unit | `m3`, `m^3`, `mc` |
| `L` | litre | 0.001 m³ | `l` |
| `dL` | decilitre | 0.0001 m³ | `dl` |
| `cL` | centilitre | 0.00001 m³ | `cl` |
| `mL` | millilitre | 0.000001 m³ | `ml` |
| `cm³` | cubic centimetre | 0.000001 m³ | `cm3`, `cc` |
| `in³` | cubic inch | 0.000016387064 m³ | `in3` |
| `ft³` | cubic foot | 0.028316846592 m³ | `ft3` |
| `gal US` | US gallon | 0.003785411784 m³ |  |
| `gal UK` | imperial gallon | 0.00454609 m³ |  |
| `qt US` | US quart | 0.000946352946 m³ |  |
| `pt US` | US pint | 0.000473176473 m³ |  |
| `pt UK` | imperial pint | 0.00056826125 m³ |  |
| `fl oz US` | US fluid ounce | 0.0000295735295625 m³ |  |
| `fl oz UK` | imperial fluid ounce | 0.0000284130625 m³ |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 1 gal US to L

```
[Constant · Variable: 1] value ──▶ value [Volume: gal US · L] result ──▶ value [Print (console.log)]
```

Writes `3.785411784`.

With **Round** and 2 **Decimals** it writes `3.79`.

### 2. 500 mL to fl oz US

```
[Constant · Variable: 500] value ──▶ value [Volume: mL · fl oz US] result ──▶ value [Print (console.log)]
```

Writes `16.9070113509`.

With **Round** and 2 **Decimals** it writes `16.91`.

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
