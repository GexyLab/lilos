# Number field

`ui.number` · Commands · [Standard UI components](logicstudio-ui) · version 1

A field where the user types a number, with little arrows to increase or decrease it and the unit next to it. It sends the number when the user has finished typing it.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the field. |
| **Minimum** | number, or empty | empty (none) | The smallest number the little arrows reach. |
| **Maximum** | number, or empty | empty (none) | The largest number the little arrows reach. |
| **Step** | number | 1 | By how much the little arrows (and the arrow keys) change the number at each press. |
| **Unit** | text | empty | Text to the right of the field, smaller (for example `€`). |

The field always opens empty: for an initial number use the **value** input with an at start value.

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | Puts a number in the field, without the field sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be typed in. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The number, when the user confirms a change: presses Enter or leaves the field (and, depending on the browser, at every click on the little arrows). |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**When it sends.** Like the [Text field](ui.text): not at every digit, but when the change is confirmed (Enter, or leaving the field). The little arrows of the field and the **up/down arrow** keys change the number by one **Step**; in many browsers every click on the little arrows sends the new value at once. After Enter the field loses the focus.

**What it sends.** Always a **number** (never a text). The decimal separator to type depends on the browser and the language (usually both `2,5` and `2.5` are fine); the number that reaches the schema is 2.5.

**What it does not send.**

- If the user empties the field, the field **sends nothing** (the schema keeps the last number received).
- If the user types something that is not a number, the browser considers it empty: it sends nothing.

**Minimum, Maximum and Step are not checks.** They apply to the little arrows, but a number **typed by hand** is sent even if it is outside the range or not a multiple of the step: with minimum 1 and maximum 10, if the user types 25, the schema receives 25 (the browser can only mark the field as invalid). If the number must stay in a range, use a [Clamp](core.clamp) in the schema.

**From the schema**, a value on **value** is converted to a number and written in the field: `"4,5"` becomes 4.5; `null` and `""` become **0** (they do not empty the field); a text that is not a number (for example `"—"`) **empties** the field. Beware: the field is redrawn and, if the user is typing, it loses what they have not confirmed and the keyboard focus.

## Examples

### 1. A price with VAT

```
Window «VAT»
└ Column (root)
  ├ Number field  number1  Label «Price without VAT»  Minimum 0  Step 0.01  Unit «€»
  └ Value         value1   Label «With VAT:»  Unit «€»  Decimals 2
```

```
[Number field: Price without VAT] value ──▶ a [Multiply (×)] result ──▶ value [Value: With VAT:]
[Constant · Variable: 1.22]                     value ──▶ b
```

The user types 100 and presses Enter: you see «With VAT: 122.00 €».

### 2. A quantity between 1 and 10

```
Window «Order»
└ Column (root)
  ├ Number field  number1  Label «Quantity»  Minimum 1  Maximum 10
  └ Label         label1   Text «»  Size small
```

```
[Number field: Quantity] value ──▶ value [Clamp: 1…10] result ──▶ value [Number field: Quantity]
                                                       result ──▶ n [Template string: «You order {n} pieces.»] text ──▶ text [Label: label1]
```

If the user types 25, the [Clamp](core.clamp) brings it to 10, the field shows 10 and the label says «You order 10 pieces.». Sending the value back to the field does not create an endless loop: a value that arrives on the input of the field does not come out of its output. (In the [Template string](core.format) add the input **n**.)

## Accessibility and keyboard

- It is a real number field: you reach it with **Tab**; **up/down arrow** change the number by one step; **Enter** confirms.
- The **Label** above and the **Unit** next to it are not linked to the field: the screen reader reads the number but not the name of the field.

## See also

- [Slider](ui.slider), to choose in a range with the mouse
- [Text field](ui.text)
- [Clamp](core.clamp), [Type cast](core.convert)
- [Standard UI components](logicstudio-ui)
