# Shape

`core.drawShape` · Drawing · [Core blocks](logicstudio-core) · version 1

A shape drawn on the sheet of the schema: a rectangle to enclose an area, a circle, a diamond, a triangle, a line or an arrow to point at something. Like a [Text](core.drawText), **the program does not run it**: it only makes the schema clearer.

## Inputs and outputs

None. A shape has no ports, not even the **Exception**, and does not link to anything.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Shape** (`shape`) | Rectangle, Rounded rectangle, Ellipse · circle, Diamond, Triangle, Line · arrow | Rectangle | What is drawn. An ellipse with equal width and height is a circle. |
| **Width (px)** (`w`) | 4 to 4000 | 200 | |
| **Height (px)** (`h`) | 4 to 4000 | 120 | |
| **Direction** (`direction`) | Horizontal, Vertical, Diagonal ↘, Diagonal ↗ | Horizontal | Only for **Line · arrow**: how the line runs in the box **Width** wide and **Height** tall. Horizontal goes left to right at half height; Vertical top to bottom; ↘ from the top left corner to the bottom right one; ↗ from the bottom left to the top right. |
| **Arrows** (`arrows`) | None, At the end, At the start, At both ends | None | Only for **Line · arrow**: the arrowheads. The end is on the right (or at the bottom, for Vertical). |
| **Corner radius (px)** (`radius`) | 0 to 400 | 12 | Only for **Rounded rectangle**. |
| **Line colour** (`stroke`) | a colour, or empty | empty | Empty: a grey of the theme. |
| **Line width (px)** (`strokeWidth`) | 0 to 40 | 2 | 0: no line (makes sense with a fill). |
| **Line** (`dash`) | Solid, Dashed, Dotted | Solid | |
| **Fill** (`fill`) | a colour, or empty | empty | Not for the line. Empty: the shape is empty inside. A colour with transparency (`#2f81f733`) lets the grid and the blocks show through. |
| **Text inside** (`text`) | multi-line text | empty | Written in the centre of the shape. |
| **Text size (px)** (`textSize`) | 8 to 96 | 13 | |

Colours are chosen and typed as for the [Text](core.drawText): `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()` or a name.

## How it works

- You take it from the **Blocks** tab, **Drawing** category.
- When selected, it has a small square in the bottom right corner: dragging it changes **Width** and **Height** (in steps of 10 px; with **Alt** held, free). **Ctrl Z** brings them back as they were.
- **Double click** on the shape to write the **Text inside** right there on the sheet (**Ctrl Enter** or a click elsewhere keeps it, **Esc** does not).
- A shape **without a fill** is picked only by its line: inside it, the click and the selection rectangle reach the blocks and the sheet. So you can draw a box around some blocks and keep working inside it. A shape **with a fill** is picked on its whole area.
- It sits **below** the links and the blocks; it moves, is duplicated, aligned and deleted like a block, and can be in a [group](ide/groups).
- It counts as a block for the engine limit **Blocks per schema**; the program skips it.

## Examples

### 1. A coloured area

```
Shape: Rounded rectangle, 420 × 220, Line colour #2f81f7, Fill #2f81f733
Text: "Alarms" (Bold) in the top left corner

inside: [Compare (== != < >)] if true ──▶ … [Notify]
```

The blocks inside the box stay selectable and linkable: the box is picked by its edge.

### 2. An arrow that explains

```
Shape: Line · arrow, Horizontal, Arrows At the end, 160 × 30, Line width 3
Text inside: "goes to the window"
```

Put it between a block and the [object of a component](core.component) to remember where the value ends up. For an arrow going down diagonally use **Diagonal ↘**.

## Errors

None: the shape does nothing while the program runs.

## See also

- [Text · Comment](core.drawText)
- [Shape](core.uiShape) for windows: the same shape, which a schema can colour while the program runs
- [Schemas](ide/schemas)
