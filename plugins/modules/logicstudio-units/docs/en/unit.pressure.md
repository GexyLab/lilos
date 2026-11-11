# Pressure

`unit.pressure` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a pressure: pascals and their multiples, bars, millibars, atmospheres, psi, millimetres and inches of mercury, torrs, metres of water.

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
| **From** (`from`) | the units in the table below | bar | The unit the value comes in. |
| **To** (`to`) | the units in the table below | psi | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `bar · psi`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 bar = 100000 Pa; 1 hPa = 1 mbar; 1 atm = 101325 Pa = 760 Torr.
- mmHg, inHg and mH₂O are the conventional values (mercury at 0 °C, water at 4 °C at standard gravity).
- The block **does not tell** absolute pressure from gauge pressure ("bar g", "psig"): it converts the number as it is.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `Pa` | pascal | base unit |  |
| `hPa` | hectopascal | 100 Pa |  |
| `kPa` | kilopascal | 1000 Pa |  |
| `MPa` | megapascal | 1000000 Pa |  |
| `bar` | bar | 100000 Pa |  |
| `mbar` | millibar | 100 Pa |  |
| `atm` | standard atmosphere | 101325 Pa |  |
| `psi` | pound per square inch | 6894.75729316836 Pa |  |
| `mmHg` | millimetre of mercury | 133.322387415 Pa |  |
| `Torr` | torr | 133.322368421053 Pa | `torr` |
| `inHg` | inch of mercury | 3386.389 Pa |  |
| `mH₂O` | metre of water | 9806.65 Pa | `mH2O` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 2.2 bar to psi

```
[Constant · Variable: 2.2] value ──▶ value [Pressure: bar · psi] result ──▶ value [Print (console.log)]
```

Writes `31.9083023006`.

With **Round** and 2 **Decimals** it writes `31.91`.

### 2. 1013.25 hPa to mmHg

```
[Constant · Variable: 1013.25] value ──▶ value [Pressure: hPa · mmHg] result ──▶ value [Print (console.log)]
```

Writes `759.999891726`.

With **Round** and 2 **Decimals** it writes `760`.

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
