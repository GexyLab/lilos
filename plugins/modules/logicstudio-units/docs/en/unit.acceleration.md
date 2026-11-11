# Acceleration

`unit.acceleration` · Units · [Quantities and units](logicstudio-units) · version 1

Converts an acceleration: metres per second squared, standard gravity, feet per second squared, gals.

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
| **From** (`from`) | the units in the table below | m/s² | The unit the value comes in. |
| **To** (`to`) | the units in the table below | gn | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `m/s² · gn`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- **gn** is standard gravity, 9.80665 m/s² (the "g" of a car or a plane). The symbol is not "g" so it is not mistaken for the gram.
- The **Gal** (capital G, 1 cm/s²) is used in geophysics; it has nothing to do with the gallon.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `m/s²` | metre per second squared | base unit | `m/s2`, `m/s^2` |
| `gn` | standard gravity | 9.80665 m/s² | `g0` |
| `ft/s²` | foot per second squared | 0.3048 m/s² | `ft/s2`, `ft/s^2` |
| `Gal` | gal (cm/s²) | 0.01 m/s² |  |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 3 gn to m/s²

```
[Constant · Variable: 3] value ──▶ value [Acceleration: gn · m/s²] result ──▶ value [Print (console.log)]
```

Writes `29.41995`.

With **Round** and 2 **Decimals** it writes `29.42`.

### 2. 20 m/s² to gn

```
[Constant · Variable: 20] value ──▶ value [Acceleration: m/s² · gn] result ──▶ value [Print (console.log)]
```

Writes `2.03943242596`.

With **Round** and 2 **Decimals** it writes `2.04`.

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
