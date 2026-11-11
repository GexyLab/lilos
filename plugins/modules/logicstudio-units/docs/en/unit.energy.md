# Energy

`unit.energy` · Units · [Quantities and units](logicstudio-units) · version 1

Converts an energy: joules and their multiples, watt-hours and kilowatt-hours, calories and kilocalories, BTUs, electronvolts.

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
| **From** (`from`) | the units in the table below | kWh | The unit the value comes in. |
| **To** (`to`) | the units in the table below | MJ | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `kWh · MJ`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- The calorie is the **thermochemical** one, 4.184 J; the "Calorie" on food labels is the kilocalorie (kcal).
- The BTU is the "International Table" one, 1055.05585262 J; 1 kWh = 3.6 MJ.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `J` | joule | base unit |  |
| `kJ` | kilojoule | 1000 J |  |
| `MJ` | megajoule | 1000000 J |  |
| `Wh` | watt-hour | 3600 J |  |
| `kWh` | kilowatt-hour | 3600000 J |  |
| `cal` | calorie | 4.184 J |  |
| `kcal` | kilocalorie | 4184 J | `Cal` |
| `BTU` | British thermal unit | 1055.05585262 J | `Btu` |
| `eV` | electronvolt | 1.602176634e−19 J |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 2000 kcal to kWh

```
[Constant · Variable: 2000] value ──▶ value [Energy: kcal · kWh] result ──▶ value [Print (console.log)]
```

Writes `2.32444444444`.

With **Round** and 2 **Decimals** it writes `2.32`.

### 2. 1 kWh to MJ

```
[Constant · Variable: 1] value ──▶ value [Energy: kWh · MJ] result ──▶ value [Print (console.log)]
```

Writes `3.6`.

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
