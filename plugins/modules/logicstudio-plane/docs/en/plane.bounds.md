# Bounding box

`plane.bounds` · Geometry · [Plane geometry](logicstudio-plane) · version 1

The **bounding box** of points or shapes: the minimum and maximum corners, width, height and the rectangle as a shape.

## Inputs

| Port | Type | Description |
|---|---|---|
| **points or shapes** (`points`) | any | A point, a shape, or a list of points and shapes together. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rectangle** (`rect`) | object | The rectangle as a shape `{kind: "rect", x, y, width, height, min, max}`. |
| **min** | list | The corner with the smallest coordinates, a list `[x, y]`. |
| **max** | list | The corner with the largest coordinates, a list `[x, y]`. |
| **width** | number | The width (largest x - smallest x). |
| **height** | number | The height (largest y - smallest y). |
| **center** | list | The centre of the rectangle, a list `[x, y]`. |
| **area** | number | The area `width × height`. |
| **Exception** (`error`) | object | A value is neither a point nor a shape, or the list is empty. |

## How it works

Of a circle the centre ± the radius count; of an ellipse its exact rectangle (even rotated); of a polygon the vertices; of a line the two points that define it; of a parabola and a hyperbola a stretch of curve near the vertex. For a single point the rectangle has width and height 0. The computation is in the plane: the z of a 3D point is ignored.

## Examples

### 1. A cloud of points

```
[List: (1,2) (5,-1) (3,8)] list ──▶ points [Bounding box] width ──▶ value [Print (console.log)]
```

**min** `[1, -1]`, **max** `[5, 8]`, width `4`, height `9`, area `36`, centre `[3, 3.5]`.

### 2. Shapes and points together

The list of the circle of centre `(0, 0)` and radius 2 with the point `(5, 5)` has **min** `[-2, -2]` and **max** `[5, 5]`. With a single point `(7, 7)` width, height and area are `0`.

## Errors

| Message | When |
|---|---|
| Non è un punto né una figura: «…» ("Neither a point nor a shape") | The value is not a point, a list of points or a shape. |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Figura sconosciuta: «…» ("Unknown shape") | A shape has a `kind` the block does not know. |
| Serve almeno un punto ("At least one point is needed") | The list is empty. |

## See also

- [Point inside shape](plane.inside) to check a point in the rectangle
- [Convex hull](plane.hull) for the convex hull
- [Shape → SVG](plane.svg) to draw
- [How a block works](ide/blocks)
