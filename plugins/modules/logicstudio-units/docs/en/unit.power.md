# Power

`unit.power` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a power: watts and their multiples, metric and imperial horsepower, BTUs per hour, kilocalories per hour.

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
| **From** (`from`) | the units in the table below | kW | The unit the value comes in. |
| **To** (`to`) | the units in the table below | CV | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `kW · CV`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- **CV** is metric horsepower (PS in German), 735.49875 W; **hp** is imperial (mechanical) horsepower, about 745.7 W. European car data sheets use metric horsepower.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `W` | watt | base unit |  |
| `kW` | kilowatt | 1000 W |  |
| `MW` | megawatt | 1000000 W |  |
| `CV` | metric horsepower | 735.49875 W | `PS` |
| `hp` | horsepower | 745.69987158227 W |  |
| `BTU/h` | BTU per hour | 0.293071070172222 W | `Btu/h` |
| `kcal/h` | kilocalorie per hour | 1.16222222222222 W |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 100 kW to CV

```
[Constant · Variable: 100] value ──▶ value [Power: kW · CV] result ──▶ value [Print (console.log)]
```

Writes `135.96216173`.

With **Round** and 2 **Decimals** it writes `135.96`.

### 2. 12000 BTU/h to kW

```
[Constant · Variable: 12000] value ──▶ value [Power: BTU/h · kW] result ──▶ value [Print (console.log)]
```

Writes `3.51685284207`.

With **Round** and 2 **Decimals** it writes `3.52`.

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
