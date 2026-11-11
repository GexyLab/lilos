# Shape

`core.uiShape` · Drawing · [Core blocks](logicstudio-core) · version 1

A shape in a window: a rectangle, a circle, a diamond, a triangle, a line or an arrow. It is for drawing: the diagram of a plant with tanks and pipes, a box that separates two parts, a big indicator light. A schema can change its fill, its line colour and its text while the program runs.

It works in any container; in the [Free area](ui.free) you put it exactly where you want, even above or below other components.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Shape** | Rectangle, Rounded rectangle, Ellipse · circle, Diamond, Triangle, Line · arrow | Rectangle | |
| **Width (px)**, **Height (px)** | 4 to 4000 | 120 × 80 | The size of the shape. |
| **Direction (line)** | Horizontal, Vertical, Diagonal ↘, Diagonal ↗ | Horizontal | Only for **Line · arrow**, as in the [Shape of the schemas](core.drawShape). |
| **Arrows (line)** | None, At the end, At the start, At both ends | None | Only for **Line · arrow**. |
| **Corner radius (px)** | 0 to 400 | 12 | Only for **Rounded rectangle**. |
| **Line colour** | a colour, or empty | empty | Empty: the text colour of the theme. |
| **Line width (px)** | 0 to 40 | 2 | 0: no line. |
| **Line** | Solid, Dashed, Dotted | Solid | |
| **Fill** | a colour, or empty | empty | Not for the line. Empty: empty inside. |
| **Text inside** | multi-line text (translatable) | empty | In the centre of the shape. |
| **Text size (px)** | 8 to 96 | 13 | |

Colours are written `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()` or with a name; anything that is not a colour is ignored.

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **fill** (`fill`) | text | A new colour for the inside (not for the line). |
| **line colour** (`stroke`) | text | A new colour for the line and the arrowheads. |
| **text** (`text`) | text | The text in the centre; an empty text removes it. |
| **enabled** (`enabled`) | yes/no | `false` makes it fainter. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; nothing passes through it for this component. |

## Examples

### 1. A tank that changes colour

A Free area with a **Shape** Rounded rectangle 80 × 140 (the tank) and a horizontal Line · arrow (the pipe).

```
[Compare (== != < >): a < b] if true  ──▶ send [Constant · Variable: "#e5484d"] value ──▶ fill [Shape: tank]
[Compare (== != < >): a < b] if false ──▶ send [Constant · Variable: "#2da44e"] value ──▶ fill [Shape: tank]
[Template string: "{level} %"] text ──▶ text [Shape: tank]
```

The [Compare](core.compare) receives the level on **a** and the threshold on **b**; the two [Constant · Variable](core.value) blocks are of kind text, with **send** linked. Under the threshold the tank turns red, above it goes back to green; inside you read the level.

### 2. A separator with an arrow

A **Shape** Line · arrow, Arrows At the end, 300 × 24, Line Dashed, between two groups of fields: it shows the order in which to fill them in. No object is needed in the schema.

## See also

- [Styled text](core.uiText)
- [Lamp](ui.lamp) and [Gauge](ui.gauge) of the [Standard UI components](logicstudio-ui)
- [Shape](core.drawShape), for drawing on schemas
- [The object of a component](ide/components)
