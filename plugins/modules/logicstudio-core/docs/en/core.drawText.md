# Text · Comment (// note)

`core.drawText` · Drawing · [Core blocks](logicstudio-core) · version 1

A text written on the sheet of the schema: a title for an area, an explanation next to a group of blocks, a reminder. It is like a `// note` comment in code: **the program does not run it**, it is only for whoever reads the schema.

## Inputs and outputs

None. A text has no ports, not even the **Exception**, and does not link to anything.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Text** (`text`) | multi-line text, up to 2000 characters | «Testo» | What is read. Line breaks are kept. |
| **Size (px)** (`size`) | 8 to 96 | 14 | The size of the letters. |
| **Colour** (`color`) | a colour, or empty | empty | Empty: the text colour of the theme (light or dark). |
| **Background** (`background`) | a colour, or empty | empty | A coloured box behind the text; empty: none. |
| **Bold**, **Italic**, **Underlined** | yes/no | no | The style of the letters. |
| **Alignment** (`align`) | left, centre, right | left | Where the shorter lines go, inside the width of the text. |
| **Width (px)** (`w`) | 0 to 4000 | 0 | 0: the text is as wide as its longest line. A number: longer lines wrap at that width. |

A **colour** is chosen with the small square next to the field or typed: `#e8743b`, `#e8743b80` (with transparency), `rgb(232 116 59)`, `hsl(20 80% 57%)` or a name like `orange`. Anything that is not a colour is ignored and the colour of the theme stays.

## How it works

- You take it from the **Blocks** tab, **Drawing** category, like the other blocks.
- **Double click** on the text to write it right there on the sheet: **Ctrl Enter** or a click elsewhere keeps it, **Esc** leaves it as it was. Also from the right click, **Write the text**.
- When selected, it has a small square in the bottom right corner: dragging it changes the **Width** (in steps of 10 px; with **Alt** held, free). **Ctrl Z** brings it back as it was.
- It moves, is selected with the rectangle, is duplicated (**Ctrl D**), aligned and deleted (**Del**) like a block. It can be in a [group](ide/groups): it moves with the group and changes nothing about how the group runs.
- It sits **below** the links and the blocks, so it never covers a port.
- It does not have the **Label**: its text is already what is read.
- It counts as a block for the engine limit **Blocks per schema** (200 by default); the program skips it and spends no time on it.

## Examples

### 1. The title of an area

```
Text: "Reading the sensors"  (Size 18, Bold, Colour #58a6ff)

[Interval (setInterval): 5 s] pulse ──▶ send [HTTP request (fetch)] …
```

Put the text above the blocks that read the sensors and a [Shape](core.drawShape) **Rounded rectangle** with a light fill around all of them: whoever opens the schema sees at once what that part does.

### 2. A multi-line note

```
Text: "Warning:
the value arrives in °C,
the window shows it in °F"  (Italic, Background #f0b42933, Width 220)
```

Next to a block of [Quantities and units](logicstudio-units), the light yellow background makes it look like a sticky note.

## Errors

None: the text does nothing while the program runs.

## See also

- [Shape](core.drawShape), for rectangles, circles, lines and arrows on the schema
- [Styled text](core.uiText), the same text inside a window
- [Schemas](ide/schemas) and [Groups](ide/groups)
