# Format measure

`unit.format` · Unit conversions · [Quantities and units](logicstudio-units) · version 1

Makes a text with a number and its unit, like `12.5 km` or `21.5 °C`, with the decimals you want. If you want, it chooses the handiest prefix by itself: 1500 m becomes `1.5 km`, 0.0042 s becomes `4.2 ms`.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The number to write. A text with a number (`"2.5"`) is fine. |
| **unit** (`unit`) | text | The unit to write after the number: **any** text, also a unit the package does not have (`V`, `Ω`, `%`). Optional: without a unit the block writes the number only. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The measure, written. |
| **Exception** (`error`) | object | The value is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to write at most. |
| **Drop trailing zeros** (`trim`) | yes / no | yes | With **yes** `12.50` becomes `12.5` and `3.00` becomes `3`; with **no** the decimals are always the ones chosen. |
| **Decimal separator** (`separator`) | `.` (12.5) or `,` (12,5) | `.` | The decimal mark. Thousands are not grouped. |
| **Choose the prefix** (`auto`) | yes / no | no | Changes the unit's prefix so that the number is between 1 and 1000 (see below). |

## How it works

The block waits for the **value**; at every value, or change of unit, it writes the number with the decimals chosen (rounding), then a space and the unit. After `°` (angles), `′`, `″` and `%` there is no space: `3°`, `45%`. After `°C` and `°F` there is, as the International System wants: `21.5 °C`. A number that rounds to zero is written `0`, never `-0`.

The unit is written **as it arrives**: the block does not change it even when it has another way to write it (`m2` stays `m2`). To get the package's symbol, go through [Parse measure](unit.parse) first.

### Choose the prefix

With **Choose the prefix** the block changes the unit's prefix, when the unit allows it, so that the number is **between 1 and 1000**:

| Unit (also with a prefix, like `cm`, `kg`, `mA`) | Prefixes the block uses |
|---|---|
| `m` | n, µ, m, (none), k |
| `g` | µ, m, (none), k |
| `s` | n, µ, m, (none) |
| `L` | µ, m, (none) |
| `B`, `bit` | (none), k, M, G, T (decimal: 1 kB = 1000 B) |
| `W`, `J`, `N`, `Pa`, `Hz`, `V`, `A`, `Ω`, `F`, `H`, `Wh`, `eV` | p, n, µ, m, (none), k, M, G, T |

- The limited prefixes avoid odd writings: 1500 kg stays `1500 kg` (not `1.5 Mg`), 7200 s stays `7200 s` (for hours there is [Time](unit.time)).
- A measure in centimetres or decilitres can go back to a prefix of the list: 150 cm → `1.5 m`.
- Other units (`°C`, `ft`, `km/h`, `m²`, `dB`…) stay as they are.
- The value 0 stays in the unit that arrives.

## Examples

### 1. A temperature with one decimal

```
[Constant · Variable: 21.456] value ──▶ value [Format measure] text ──▶ text [Label]
```

With **unit** `°C` (the input's starting value) and **Decimals** 1, the label shows `21.5 °C`.

### 2. A distance with the right prefix

With **Choose the prefix**:

| value | unit | text |
|---|---|---|
| 1500 | `m` | `1.5 km` |
| 150 | `cm` | `1.5 m` |
| 0.0042 | `s` | `4.2 ms` |
| 2500000 | `B` | `2.5 MB` |
| 0.0047 | `F` | `4.7 mF` |
| 1500 | `kg` | `1500 kg` |
| 12 | `ft` | `12 ft` |

### 3. A conversion to show

```
[Number field] value ──▶ value [Length: km · mi] result ──▶ value [Format measure] text ──▶ text [Label]
```

With **unit** `mi`, 10 km give `6.21 mi`.

## Errors

| Message | When |
|---|---|
| Serve un numero ("A number is needed") | The value is not a number. |

## See also

- [Parse measure](unit.parse), which does the opposite
- [SI prefixes (k, M, m, µ…)](unit.prefix) to change the prefix of a number
- [Template string](core.format) for more complex texts
- [How a block works](ide/blocks)
