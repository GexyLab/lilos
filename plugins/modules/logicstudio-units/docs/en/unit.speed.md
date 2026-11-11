# Speed

`unit.speed` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a speed: metres per second, kilometres per hour, miles per hour, knots, feet per second.

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
| **From** (`from`) | the units in the table below | km/h | The unit the value comes in. |
| **To** (`to`) | the units in the table below | m/s | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `km/h · m/s`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- 1 km/h = 1/3.6 m/s; the knot is one nautical mile per hour (1.852 km/h).

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `m/s` | metre per second | base unit |  |
| `km/h` | kilometre per hour | 0.277777777777778 m/s | `kmh`, `kph` |
| `mph` | mile per hour | 0.44704 m/s |  |
| `kn` | knot | 0.514444444444444 m/s | `kt` |
| `ft/s` | foot per second | 0.3048 m/s | `fps` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 100 km/h to mph

```
[Constant · Variable: 100] value ──▶ value [Speed: km/h · mph] result ──▶ value [Print (console.log)]
```

Writes `62.1371192237`.

With **Round** and 2 **Decimals** it writes `62.14`.

### 2. 10 m/s to km/h

```
[Constant · Variable: 10] value ──▶ value [Speed: m/s · km/h] result ──▶ value [Print (console.log)]
```

Writes `36`.

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
