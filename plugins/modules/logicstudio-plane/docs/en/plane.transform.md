# Transform (translate · rotate · scale · reflect · shear)

`plane.transform` · Geometry · [Plane geometry](logicstudio-plane) · version 1

**Transforms** a point, a list of points or a shape in the plane: moves it, rotates it, scales it, reflects it or shears it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point, points or shape** (`target`) | any | What to transform: a point, a list of points or of shapes, or a shape. |
| **vector [x, y]** (`vector`) | list | Translate: the displacement `[dx, dy]`. Scale: the factors `[sx, sy]`. Shear: the factors `[kx, ky]`. |
| **center [x, y]** (`center`) | list | The centre of the rotation, the scale or the shear; the point of a reflection. If missing it is the origin `[0, 0]`. |
| **angle** | number | The rotation angle, positive counter-clockwise. If not linked the setting **Angle** is used. |
| **factor** | number | The uniform scale. If not linked (and there is no **vector**) the setting **Factor** is used. |
| **line** | object | The line of the reflection (a line from [Line through two points](plane.line), a list of two points or `{a, b, c}`). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** | any | The result, of the same kind as **target**: a point (always a list `[x, y]`), a list, a shape. |
| **Exception** (`error`) | object | Something is missing, a value is not a point or a shape, or the transformation distorts a shape that must stay as it is. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Transformation** (`op`) | Translate / Rotate / Scale / Reflect on a line / Reflect through a point / Shear | Rotate | The transformation. See the table below. |
| **Angle (if not linked)** (`angle`) | a number | 90 | The rotation angle when **angle** is not linked. |
| **Factor (if not linked)** (`factor`) | a number | 2 | The scale factor when **factor** and **vector** are not linked. |
| **Angle unit** (`unit`) | Degrees (°) / Radians (rad) / Gradians (gon) | Degrees (°) | The unit of the angles. |

## How it works

| Transformation | Needs | What it does |
|---|---|---|
| Translate | **vector** | Moves by `[dx, dy]`. |
| Rotate | **angle** (or the setting), **center** (optional) | Rotates around the centre, counter-clockwise. |
| Scale | **factor** (or the setting) or **vector**, **center** (optional) | Enlarges or shrinks from the centre; a negative factor rotates by 180°. |
| Reflect on a line | **line** | Mirrors on the line. |
| Reflect through a point | **center** | Mirrors through the point (central symmetry). |
| Shear | **vector** = `[kx, ky]`, **center** (optional) | `x' = x + kx·y`, `y' = y + ky·x`. |

Behind it there is a 3×3 matrix: the same as [Transformation matrix (3×3)](plane.matrix), applied as [Apply matrix](plane.apply) does. To move and rotate points in space there is [Transform points (move, scale, rotate)](solid.transform).

What happens to shapes: **polygons** and **lines** are transformed point by point. A **circle** or an **ellipse** stay as they are with translate, rotate, reflect and uniform scale (with other transformations, like the shear or a different scale on x and y, the circle would no longer be a circle and the block gives an error). A **rectangle** stays a rectangle with translate and scale of the sides; with a rotation it becomes a polygon. **Parabola** and **hyperbola** can only be drawn, not transformed.

## Examples

### 1. Rotating a point

```
[Point: (1, 0)] point ──▶ target [Transform: Rotate]
[Constant: 90] value ──▶ angle [Transform: Rotate] result ──▶ value [Print (console.log)]
```

It sends `[0, 1]`. With **center** = `(1, 1)` and angle 180, the point `(2, 1)` goes to `[0, 1]`.

### 2. Other transformations

| Transformation | target | Inputs | Output |
|---|---|---|---|
| Translate | `{x: 1, y: 2}` | vector `[3, 4]` | `[4, 6]` |
| Scale | `[1, 1]` | factor 3, center `[1, 0]` | `[1, 3]` |
| Reflect on a line | `[1, 2]` | line through `[0, 0]` and `[1, 1]` | `[2, 1]` |
| Reflect through a point | `[1, 2]` | center `[0, 0]` | `[-1, -2]` |
| Shear | `[1, 2]` | vector `[1, 0]` | `[3, 2]` |

A list of points `[[0, 0], [1, 1]]` with the translation `[1, 1]` gives the list `[[1, 1], [2, 2]]`.

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è un punto né una figura: «…» ("Neither a point nor a shape") | The value is not a point, a list of points or a shape. |
| Non è una retta: «…» ("Not a line") | The value is not a line: it must be the line of [Line through two points](plane.line), a list of two points `[[x1, y1], [x2, y2]]` or an object `{a, b, c}`. |
| Manca il vettore ("The vector is missing") | With translate or shear: **vector** is not linked. |
| Manca la retta di simmetria ("The line of symmetry is missing") | With the reflection on a line: **line** is not linked. |
| Questa trasformazione deforma il cerchio: non resta un cerchio ("This transformation distorts the circle: it does not stay a circle") | A circle with a shear or a scale that differs on x and y. |
| Questa trasformazione deforma l'ellisse: serve una traslazione, una rotazione, una riflessione o una scala uniforme ("This transformation distorts the ellipse: a translation, rotation, reflection or uniform scale is needed") | An ellipse with a shear or a scale that differs on x and y. |
| Questa figura non si può trasformare: «…» ("This shape cannot be transformed") | A parabola or a hyperbola. |
| Trasformazione sconosciuta: «…» ("Unknown transformation") | The **Transformation** setting is not valid (a badly saved project). |

## See also

- [Transformation matrix (3×3)](plane.matrix) and [Apply matrix](plane.apply) to combine several transformations into one matrix
- [Transform points (move, scale, rotate)](solid.transform) to move, scale and rotate points in space
- [Shape → SVG](plane.svg) to draw the result
- [How a block works](ide/blocks)
