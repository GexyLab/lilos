# SI prefixes (k, M, m, µ…)

`unit.prefix` · Units · [Quantities and units](logicstudio-units) · version 1

Changes the prefix of a value: from milli to micro, from none to kilo, from mega to giga… It works for **any unit**, also those the package does not have as a quantity: volts, amperes, ohms, farads, henries, coulombs.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value, with the **From** prefix. A text with a number (`"4.7"`) is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The value with the **To** prefix. |
| **Exception** (`error`) | object | The value is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **From** (`from`) | p, n, µ, m, c, d, (none), da, h, k, M, G, T | (none) | The prefix of the value that arrives. |
| **To** (`to`) | as **From** | k | The prefix of the result. |
| **Round** (`round`) | yes / no | no | Rounds the result. |
| **Decimals** (`decimals`) | from 0 to 10 | 2 | How many decimals to keep. It shows only with **Round**. |

The prefixes:

| Prefix | Name | Equals |
|---|---|---|
| `p` | pico | 10⁻¹² |
| `n` | nano | 10⁻⁹ |
| `µ` | micro | 10⁻⁶ |
| `m` | milli | 10⁻³ |
| `c` | centi | 10⁻² |
| `d` | deci | 10⁻¹ |
| (none) | — | 1 |
| `da` | deca | 10 |
| `h` | hecto | 10² |
| `k` | kilo | 10³ |
| `M` | mega | 10⁶ |
| `G` | giga | 10⁹ |
| `T` | tera | 10¹² |

## How it works

At every value that arrives the block multiplies it by the **From** prefix and divides it by the **To** prefix, then rounds to 12 significant digits. Under its title the block shows the two prefixes, for example `none · k`.

The block **does not know which unit it is**: it is just a change of scale. For the units the package knows (m, g, L, W, Pa, Hz, B…) you can also use the quantity's block, which checks the units.

These are the decimal prefixes of the International System. For the binary prefixes of data (KiB, MiB…) there is [Data](unit.data).

## Examples

### 1. A 4.7 µF capacitor in nanofarads

```
[Constant · Variable: 4.7] value ──▶ value [SI prefixes (k, M, m, µ…): µ · n] result ──▶ value [Print (console.log)]
```

Writes `4700`.

### 2. From volts to kilovolts

With **From** (none) and **To** `k`: 1500 → `1.5`; with **From** `k` and **To** (none): 2.2 → `2200`; with **From** `M` and **To** `m`: 1 → `1000000000`.

## Errors

| Message | When |
|---|---|
| Serve un numero ("A number is needed") | The value is not a number. |
| Prefisso sconosciuto ("Unknown prefix") | A prefix in Properties does not exist in this version of the package (a schema made with a newer version). |

## See also

- [Format measure](unit.format), which can choose the right prefix by itself (1500 m → 1.5 km)
- [Data](unit.data) for the binary prefixes (KiB, MiB…)
- [Quantities and units](logicstudio-units)
- [How a block works](ide/blocks)
