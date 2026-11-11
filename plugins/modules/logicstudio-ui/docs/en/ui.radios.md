# Option buttons

`ui.radios` · Commands · [Standard UI components](logicstudio-ui) · version 1

A group of options one under the other, each with its own dot: the user chooses one. It suits a few choices (about 2 to 5), all to be seen together.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the group. |
| **Options (comma separated)** | text (translatable) | «One, Two» | The options, in order: `Small, Medium, Large`. Spaces around the commas are removed; empty items are skipped. |
| **Chosen at the start** | text | empty | The option chosen when the window opens. It must be written as in the Options. Empty: no choice. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | text | Chooses the option with that value, without the group sending anything. |
| **options** (`options`) | list | Replaces the options. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be chosen. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | text | When the user chooses an option: its value. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**The options.** Each option has a **value** (what goes to the schema) and a **text** (what is shown). With the options written in the Properties, value and text are the same. On the **options** input you can send:

| Arrives | Options |
|---|---|
| a list of texts `["Red", "Green"]` | value and text the same |
| a list of objects `[{ "value": "r", "label": "Red" }]` | value `r`, «Red» is shown |
| an object with only `value` or only `label` | what is there counts for both |
| a text `"Red, Green"` | as in the Properties: split at the commas |
| numbers `[1, 2, 3]` | values `"1"`, `"2"`, `"3"` (they become text) |

In lists, unlike the text with commas, empty items also become options. An object with neither `value` nor `label` becomes an option «undefined».

**The value that comes out is always a text**, even if the options were numbers: with the options `[1, 2, 3]` choosing the second sends `"2"`. If you need a number, use [Convert](core.convert) **To** number.

**Choosing.** The user chooses with a click on the dot or on the text; with the keyboard, the **arrow keys** move to the next or previous option **and choose it**: every arrow key press sends a value. Choosing again the option already chosen sends nothing.

**From the schema.** A value on **value** chooses the option that has that value (compared as text: the number `2` chooses the option `"2"`). If no option has that value, none is chosen. When new **options** arrive, the one with the same value as before stays chosen, if it is still there.

**When opened** the **Chosen at the start** is shown, but the program does not receive it: the group sends something only when the user chooses.

The options written in the Properties are translated as a single text (the whole line with the commas); the options sent by the schema are not translated.

## Examples

### 1. The size of an order

```
Window «Order»
└ Column (root)
  ├ Option buttons  radios1  Label «Size»  Options «S, M, L, XL»  Chosen at the start «M»
  └ Value           value1   Label «Price:»  Unit «€»  Decimals 2
```

Add to the [Cases](core.switch) block the outputs **S**, **M**, **L**, **XL**:

```
[Option buttons: Size] value ──▶ value [Cases] S  ──▶ send [Value: 9]  value ──▶ value [Value: Price:]
                                               M  ──▶ send [Value: 10] value ──▶ value
                                               L  ──▶ send [Value: 11] value ──▶ value
                                               XL ──▶ send [Value: 12] value ──▶ value
```

Choosing **L**, the price becomes «11.00 €». (The price of M is not shown until the user chooses something: to show it at once, turn on **Send at start** for the Value 10.)

### 2. Options with a code

The schema gives the options at the start, with a code different from the text:

```
[Value: JSON] value ──▶ options [Option buttons: Shipping]
[Option buttons: Shipping] value ──▶ value [Write to console]
```

The [Value](core.value), of type JSON, contains `[{"value":"std","label":"Standard (3-5 days)"},{"value":"exp","label":"Express (24 hours)"}]`. The user sees the two long texts; choosing «Express (24 hours)» the console writes `exp`.

## Accessibility and keyboard

- The options are real option buttons, with their text linked: **Tab** enters the group (on the chosen option), the **arrow keys** move between the options and choose them, **Tab** leaves the group.
- The **Label** above the group is not linked to the group: the screen reader reads the options but not the name of the group.
- When the schema sends a value or new options, the group is redrawn and, if it had the keyboard focus, it loses it.

## See also

- [Selection](ui.select), for many options in little space
- [List](ui.list), for a list that is always open
- [Cases](core.switch), to do different things according to the choice
- [Standard UI components](logicstudio-ui)
