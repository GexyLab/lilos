# Color

`ui.color` · Commands · [Standard UI components](logicstudio-ui) · version 1

A row of seven colored squares: the user chooses one, and the component sends its code (for example `#2a78d6`).

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the colors. |
| **At the start** | a color code | `#2a78d6` (blue) | The color chosen when the window opens. It must be one of the seven below, written the same (lowercase included); otherwise none is chosen. |

The seven colors, always the same:

| Code | Color |
|---|---|
| `#2a78d6` | blue |
| `#1baf7a` | green |
| `#eda100` | yellow |
| `#e34948` | red |
| `#6250d6` | purple |
| `#eb6834` | orange |
| `#6b7280` | gray |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **color** (`value`) | text | Chooses the color with that code, without the component sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be chosen. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **color** (`value`) | text | The code of the color, when the user chooses one. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

- A click on a square chooses it and sends its code, even if it was already chosen.
- With the keyboard, the **arrow keys** move to the next or previous color **and choose it**: every key press sends a code. From the last one you go back to the first.
- You cannot choose other colors: only the seven in the table.
- **From the schema**, **color** chooses the square with exactly that code. `#2A78D6` (uppercase), `blue` or `rgb(…)` match none: no square is chosen.
- **When opened** the program does not receive the initial color: if a schema needs to know it, give it the same code with a [Constant · Variable](core.value) block.

## Examples

### 1. The color of a note

```
Window «Note»
└ Column (root)
  ├ Text field  text1   Label «Title»
  ├ Color       color1  Label «Color»  At the start «#eda100»
  └ Button      button1 Text «Save»
```

```
[Constant · Variable: «#eda100»]       value ──▶ color [Object literal { }] object ──▶ content [writeFile: ~/note.json  JSON]
[Text field: Title]      text  ──▶ title
[Color: Color]           color ──▶ color
[Button: Save]           pressed ──▶ save
```

In the [Object literal { }](core.compose) block the fields **color** and **title** do not start the block; **save** does. The initial [Constant · Variable](core.value) gives the **color** field the same yellow that is shown when opened. Pressing **Save**, the file contains, for example, `{"color":"#e34948","title":"Shopping","save":true}`.

### 2. A color-coded priority

```
[Color: Priority] color ──▶ value [Switch · Case] #e34948   ──▶ send [Constant · Variable: «Urgent»]  value ──▶ text [Label: label1]
                                          otherwise ──▶ send [Constant · Variable: «Normal»]  value ──▶ text [Label: label1]
```

Add to the [Switch · Case](core.switch) an output called `#e34948`, equal to the code of red. Choosing red, the label says «Urgent»; with any other color it says «Normal». The two [Constant · Variable](core.value) blocks have the **send** input linked, so they send the text only when the color changes.

## Accessibility and keyboard

- The colors are a group of choices: **Tab** enters the group (on the chosen color), the **arrow keys** move and choose, **Tab** leaves.
- For a screen reader each square is named by its code (`#2a78d6`), not by the name of the color; moving the mouse over it shows the same code. The **Label** above is not linked to the group.

## See also

- [Option buttons](ui.radios)
- [Lamp](ui.lamp), which has four colors of its own
- [Standard UI components](logicstudio-ui)
