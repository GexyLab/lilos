# Parse measure

`unit.parse` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Reads a text like `"12.5 km"` or `"20°C"` and gets the **number**, the **unit** and the **quantity** out of it. If you want, it converts the value to another unit right away.

## Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The measure to read: a number followed by a unit. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The number read (or converted, with **Convert to**). |
| **unit** (`unit`) | text | The unit: the package's symbol if it knows it (`m2` becomes `m²`), otherwise as written. |
| **quantity** (`quantity`) | text | The quantity's `id` (`length`, `temperature`…), or an empty text if the unit is not in the package. |
| **Exception** (`error`) | object | The text does not start with a number, the unit is missing, or the conversion cannot be done. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Convert to** (`to`) | a unit, or empty | empty | If set, the value is converted to this unit (as [Convert (from · to)](unit.convert) does) and **unit** sends this one. |
| **The unit is required** (`need`) | yes / no | yes | With **no**, a text with the number alone (`"42"`) is fine: **unit** and **quantity** send an empty text. |

## How it works

At every text that arrives the block reads the **number** first, then everything after it as the **unit** (spaces before and after removed). The space between number and unit is optional: `"12.5km"` and `"12.5 km"` work the same.

The number:

- can have a sign (`-3`, `+3`, also the typographic minus `−3`) and an exponent (`1e3` = 1000);
- **with a single separator**, the comma or the point marks the decimals: `"12,5"` and `"12.5"` are both 12.5. Careful: `"1,234"` is 1.234, not 1234;
- **with point and comma together**, the last of the two marks the decimals and the other the thousands: `"1.234,5"` and `"1,234.5"` are both 1234.5;
- **with the same separator repeated**, they are thousands: `"1.000.000"` is 1000000. Space and apostrophe can also group thousands (`"1 000"`, `"1'000"`).

The unit **does not have to be in the package**: `"230 V"` gives value 230, unit `V` and an empty quantity. It must be only with **Convert to**.

## Examples

### 1. A distance written by a person

```
[Text field] value ──▶ text [Parse measure] value ──▶ value [Print (console.log)]
```

| Text | value | unit | quantity |
|---|---|---|---|
| `12,5 km` | `12.5` | `km` | `length` |
| `-3 °C` | `-3` | `°C` | `temperature` |
| `20°C` | `20` | `°C` | `temperature` |
| `1.234,5 m2` | `1234.5` | `m²` | `area` |
| `.5 L` | `0.5` | `L` | `volume` |
| `230 V` | `230` | `V` | (empty) |

### 2. Read and convert in one step

With **Convert to** `m/s`, the text `"100 km/h"` gives value `27.7777777778`, unit `m/s`, quantity `speed`. The text `"3 kg"` gives an exception, because kilograms do not become metres per second.

## Errors

| Message | When |
|---|---|
| Non è una misura: «…» ("Not a measure") | The text does not start with a number (for example `"km"` or `"about 3 m"`), or is longer than 200 characters. |
| Manca l'unità di misura ("The unit is missing") | There is only the number and **The unit is required** is yes; or **Convert to** is set and the text has no unit. |
| Unità sconosciuta: «…» ("Unknown unit") | With **Convert to**: the text's unit, or the one of **Convert to**, is not in the package. |
| Unità incompatibili: «…» (…) e «…» (…) ("Incompatible units") | With **Convert to**: the two units are of different quantities. |
| Temperatura sotto lo zero assoluto ("Temperature below absolute zero") | With **Convert to**: a temperature below 0 K. |
| Il consumo deve essere maggiore di zero ("The consumption must be more than zero") | With **Convert to**: a fuel consumption of 0 or less. |

## See also

- [Format measure](unit.format), which does the opposite
- [Convert (from · to)](unit.convert) when number and unit already arrive apart
- [String functions](core.text) to prepare the text (remove spaces, change case…)
- [How a block works](ide/blocks)
