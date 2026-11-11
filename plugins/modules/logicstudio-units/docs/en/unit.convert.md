# Convert (from · to)

`unit.convert` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Converts a value from one unit to another, with the two units arriving **as text** (`"km/h"`, `"m/s"`). It finds the quantity by itself and works with all the units of the package.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value to convert. A text with a number (`"2.5"`) is fine. |
| **from** (`from`) | text | The unit the value comes in, for example `"km/h"`. |
| **to** (`to`) | text | The unit to convert it to, for example `"m/s"`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The value in the **to** unit. |
| **quantity** (`quantity`) | text | The quantity of the two units, by its `id` (`speed`, `length`…: see the table in [Quantities and units](logicstudio-units)). |
| **Exception** (`error`) | object | Unknown unit, units of different quantities, value that is not a number, and the errors of temperatures and fuel consumption. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

## How it works

The block waits until it has **all three inputs**; then, at every new value or change of unit, it converts and sends **result** and **quantity**.

- Units are written with the exact **symbol** (case matters: `kN` is the kilonewton, `kn` the knot) or one of the other ways listed in the **Also written** column of each quantity's page (`m2` for `m²`, `C` for `°C`, `kmh` for `km/h`). Spaces before and after do not count.
- The two units must be of the **same quantity**: from `km` to `kg` gives an exception.
- The calculation is the same as the blocks of each quantity, also for temperatures and fuel consumption, and the result is rounded to 12 significant digits.
- If the units never change, the quantity's block is handier ([Length](unit.length), [Temperature](unit.temperature)…): there the units are chosen from a menu.

The units of **from** and **to** can also be written as the inputs' **starting value** in Properties: then you only link the value.

## Examples

### 1. A value with the units written in Properties

**from** has starting value `km/h`, **to** has `m/s`:

```
[Constant · Variable: 36] value ──▶ value [Convert (from · to)] result ──▶ value [Print (console.log)]
```

Writes `10`; **quantity** sends `speed`.

### 2. Units chosen in a window

Two [Selections](ui.select) filled by [Units of a quantity](unit.list) choose the units; a [Number field](ui.number) gives the value:

```
[Number field]    value ──▶ value [Convert (from · to)] result ──▶ value [Format measure] text ──▶ text [Label]
[Selection: from] value ──▶ from
[Selection: to]   value ──▶ to
```

With 25, `°C` and `°F` the label shows `77`.

### 3. Different units

- `1`, `"m2"`, `"cm²"` → `10000`, quantity `area`;
- `1`, `" kg "`, `"lbs"` → `2.20462262185`;
- `1`, `"km"`, `"kg"` → exception «Unità incompatibili: «km» (lunghezza) e «kg» (massa)» ("Incompatible units: km (length) and kg (mass)").

## Errors

| Message | When |
|---|---|
| Unità sconosciuta: «…» ("Unknown unit") | **from** or **to** is not a symbol, nor another way to write a unit, of the package. For example `gal`: write `gal US` or `gal UK`. |
| Unità incompatibili: «…» (…) e «…» (…) ("Incompatible units") | The two units are of different quantities; the message says which (in Italian). |
| Serve un numero ("A number is needed") | The value is not a number. |
| Temperatura sotto lo zero assoluto ("Temperature below absolute zero") | A temperature below 0 K. |
| Il consumo deve essere maggiore di zero ("The consumption must be more than zero") | A fuel consumption of 0 or less. |

## See also

- [Parse measure](unit.parse) for a text with number and unit together (`"12.5 km"`)
- [Units of a quantity](unit.list) to fill a menu with the units
- [Quantities and units](logicstudio-units), all the quantities and their symbols
- [How a block works](ide/blocks)
