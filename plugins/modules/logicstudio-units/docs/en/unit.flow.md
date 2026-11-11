# Flow rate

`unit.flow` · Units · [Quantities and units](logicstudio-units) · version 1

Converts a flow rate (volume that goes by in a time): cubic metres per second and per hour, litres per second, minute and hour, US gallons per minute.

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
| **From** (`from`) | the units in the table below | L/min | The unit the value comes in. |
| **To** (`to`) | the units in the table below | m³/h | The unit to convert it to. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

At every value that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **result**. Under its title the block shows the two units chosen, for example `L/min · m³/h`.

The result is rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show (`0.30000000000000004` becomes `0.3`). With **Round** you can keep fewer decimals.

The units are chosen in Properties. To choose them while the program runs (from a menu, from a file) use [Convert (from · to)](unit.convert).

- The gallon of **gal/min** is the US one.

## The units

| Symbol | Unit | Equals | Also written |
|---|---|---|---|
| `m³/s` | cubic metre per second | base unit | `m3/s` |
| `m³/h` | cubic metre per hour | 0.000277777777777778 m³/s | `m3/h` |
| `L/s` | litre per second | 0.001 m³/s | `l/s` |
| `L/min` | litre per minute | 0.0000166666666666667 m³/s | `l/min`, `lpm` |
| `L/h` | litre per hour | 2.77777777777778e−7 m³/s | `l/h` |
| `gal/min` | US gallon per minute | 0.0000630901964 m³/s | `gpm` |

The **Also written** column is for [Convert (from · to)](unit.convert) and [Parse measure](unit.parse), which get units as text.

## Examples

### 1. 12 L/min to m³/h

```
[Constant · Variable: 12] value ──▶ value [Flow rate: L/min · m³/h] result ──▶ value [Print (console.log)]
```

Writes `0.72`.

### 2. 5 gal/min to L/min

```
[Constant · Variable: 5] value ──▶ value [Flow rate: gal/min · L/min] result ──▶ value [Print (console.log)]
```

Writes `18.92705892`.

With **Round** and 2 **Decimals** it writes `18.93`.

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
