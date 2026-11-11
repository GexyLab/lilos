# Value

`ui.value` · Text and values · [Standard UI components](logicstudio-ui) · version 1

Shows a value that arrives from a schema: a number formatted for the user's language, with its unit, or a text.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text before the value, on the same line, lighter. |
| **Unit** | text | empty | Text after the value, smaller, with a space before it (for example `kg`). |
| **Decimals** | from 0 to 10, or empty | empty | How many digits after the decimal point to show for numbers. Empty: up to 3, without trailing zeros. |
| **When empty** | text | «—» | What is shown when there is no value yet, or when an empty value arrives. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to show. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

When opened the Value shows the **Label**, the **When empty** text in bold and the **Unit**. Every value that arrives on **value** takes the place of the bold text:

| Arrives | What you see (English language) |
|---|---|
| `1234.5` (number), Decimals empty | `1,234.5` |
| `12345.6` (number), Decimals empty | `12,345.6` |
| `2.345678` (number), Decimals empty | `2.346` (at most 3 decimals, rounded) |
| `7` (number), Decimals 2 | `7.00` |
| `"12.5"` (text) | `12.5`: a text is not formatted, even if it contains a number |
| `true` | `true` |
| `{ "t": 21 }` (object) | `{"t":21}` |
| `null`, nothing or `""` | the **When empty** text |

- Numbers follow the language of whoever looks at the window: the thousands separator and the decimal point change with the language (in Italian, for example, `1234,5` and `12.345,6`).
- Invalid numbers (`NaN`, infinity) are shown as text: `NaN`, `Infinity`.
- The unit always stays, even when «—» is shown.

If you want decimals also for a number that arrived as a text, first pass it through a [Convert](core.convert) block **To** number.

## Examples

### 1. A weight with a unit

```
Window «Scale»
└ Column (root)
  └ Value  value1  Label «Weight:»  Unit «kg»  Decimals 1
```

```
[Read file: ~/scale.txt] content ──▶ value [Convert: number] result ──▶ value [Value: Weight:]
```

If the file contains `72.456`, the window shows «Weight: **72.5** kg».

### 2. The result of a calculation

```
Window «Total»
└ Column (root)
  ├ Number field  number1  Label «Price»
  ├ Number field  number2  Label «Quantity»
  └ Value         value1   Label «Total:»  Unit «€»  Decimals 2  When empty «enter the data»
```

```
[Number field: Price]    value ──▶ a [Multiply] result ──▶ value [Value: Total:]
[Number field: Quantity] value ──▶ b
```

Until the user types something, you see «Total: **enter the data** €». With price 4.5 and quantity 3, you see «Total: **13.50** €».

## Accessibility

Label, value and unit are normal text, read in a row by a screen reader. When the value changes, the screen reader does not announce it by itself.

## See also

- [Label](ui.label), [Gauge](ui.gauge), [Progress bar](ui.progress)
- [Convert](core.convert), [Calculate](core.math) to round before showing
- [Standard UI components](logicstudio-ui)
