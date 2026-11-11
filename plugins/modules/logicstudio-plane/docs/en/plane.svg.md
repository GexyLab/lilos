# Shape → SVG

`plane.svg` · Geometry · [Plane geometry](logicstudio-plane) · version 1

Turns a shape, points or a list of shapes into **SVG** text, ready to be shown or saved to a file.

## Inputs

| Port | Type | Description |
|---|---|---|
| **shape, points or list** (`shapes`) | any | What to draw: a shape, a point, or a list of shapes and points together. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **SVG** (`svg`) | text | The SVG text: an `<svg>` element with a `viewBox` computed by itself. |
| **Exception** (`error`) | object | A colour is not valid, a value is not a point or a shape, or there is nothing to draw. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Stroke colour** (`stroke`) | text | #222222 | The outline colour: a name (`red`), a hex colour (`#ff0000`), `rgb(…)`, `hsl(…)`, `none` or `currentColor`. Points are filled with this colour. |
| **Fill colour** (`fill`) | text | none | The fill colour of closed shapes, in the same formats. `none` leaves them empty. |
| **Stroke width (pixels)** (`strokeWidth`) | 0 to 50 | 1.5 | The outline width, in pixels (it does not change with zoom). |
| **Point radius (pixels)** (`pointRadius`) | 0 to 50 | 3 | The radius of the points, in pixels. |
| **Margin (pixels)** (`padding`) | 0 to 1000 | 10 | The margin around the drawing, in pixels. |
| **Width (pixels)** (`width`) | 10 to 4000 | 400 | The width of the drawing in pixels; the height follows the proportions. |
| **y goes up (as in maths)** (`flipY`) | yes / no | yes | If on, y goes up as in maths (in SVG it normally goes down). |

## How it works

What is drawn: a **point** as a dot; a **circle**, an **ellipse** (even rotated), a **rectangle**, a **polygon** as the shape; a **line** as the segment between the two points that define it (it is not endless); a **parabola** and a **hyperbola** as a curve sampled near the vertex. All shapes have the same colours.

The block is meant to be simple and safe: the text holds only computed numbers and the two colours, which are checked (a colour with odd characters, like `"><script>` or `url(#x)`, gives an error) and anyway protected. The drawing is centred and fills the chosen width.

## Examples

### 1. A circle and a point

```
[Circle: centre (0,0) r 5] circle ──▶ shapes [List] list ──▶ shapes [Shape → SVG] svg ──▶ value [Print (console.log)]
[Point: (1, 1)]            point  ──▶ shapes [List]
```

It sends a text like `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="…"><circle … /><circle … /></svg>`. Show it with a component that can draw HTML or save it to an `.svg` file.

### 2. A coloured polygon

With **Outline colour** `#1f6feb` and **Fill colour** `#cfe3ff`, the polygon from [Polygon (area · perimeter)](plane.polygon) comes out with a blue outline and a light blue fill. Putting together the conics of [Conic (ellipse · parabola · hyperbola)](plane.conic) draws an ellipse, a parabola and a hyperbola in the same SVG.

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è un punto né una figura: «…» ("Neither a point nor a shape") | The value is not a point, a list of points or a shape. |
| Figura sconosciuta: «…» ("Unknown shape") | A shape has a `kind` the block does not know. |
| Colore non valido: «…» ("Invalid colour") | The outline or fill colour is not in the allowed formats: the message says which (`contorno` for outline or `riempimento` for fill). |
| Non c'è niente da disegnare ("There is nothing to draw") | The list is empty. |

## See also

- [Polygon (area · perimeter)](plane.polygon), [Circle](plane.circle), [Conic (ellipse · parabola · hyperbola)](plane.conic), [Line through two points](plane.line) for the shapes to draw
- [Bounding box](plane.bounds) for the size of the drawing
- [How a block works](ide/blocks)
