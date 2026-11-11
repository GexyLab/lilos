# Polygon (area · perimeter)

`plane.polygon` · Geometry · [Plane geometry](logicstudio-plane) · version 1

A **polygon** from a list of points: area (the *shoelace* formula), perimeter, centroid, whether it is convex and the direction of the vertices.

## Inputs

| Port | Type | Description |
|---|---|---|
| **points [[x, y], …]** (`points`) | list | The vertices, in order along the outline: a list of points (at least 3). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **polygon** | object | The shape `{kind: "polygon", points}`, to give to [Point inside shape](plane.inside), [Transform (translate · rotate · scale · reflect · shear)](plane.transform) and [Shape → SVG](plane.svg). |
| **area** | number | The area, always positive. |
| **perimeter** | number | The perimeter (the outline is closed: the last vertex goes back to the first). |
| **centroid** | list | The centroid (the centre of mass of the solid figure). |
| **convex** | yes/no | **yes** if the polygon is convex (no reflex angle). |
| **orientation** | text | `ccw` if the vertices run counter-clockwise, `cw` if clockwise, `none` if the area is zero. |
| **vertices** (`count`) | number | How many vertices. |
| **Exception** (`error`) | object | The input is not a list of points, or has fewer than 3 points. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Tolerance (ε)** (`epsilon`) | a number | 1e-9 | The tolerance (ε) with which three consecutive vertices count as aligned, to decide whether the polygon is convex. |

## How it works

The vertices must be given in order along the outline, clockwise or counter-clockwise. The area and the centroid are those of a **simple** polygon (the outline does not cross itself): for a polygon with a tangled outline, like a five-point star drawn without lifting the pen, the result has no geometric meaning. A tangled polygon is never convex.

With zero area (aligned vertices) the centroid is the average of the vertices and the orientation is `none`. The polygon is 2D: the z of the points does not count.

## Examples

### 1. A rectangle

```
[List: (0,0) (4,0) (4,3) (0,3)] list ──▶ points [Polygon (area · perimeter)] area ──▶ value [Print (console.log)]
```

| Output | Value |
|---|---|
| area | `12` |
| perimeter | `14` |
| centroid | `[2, 1.5]` |
| convex | yes |
| orientation | `ccw` |
| vertices | `4` |

With the same points in reverse order the orientation is `cw` and the rest does not change.

### 2. Not convex

With `(0, 0)`, `(4, 0)`, `(1, 1)`, `(0, 4)` the vertex `(1, 1)` is reflex and **convex** is no. With `(0, 0)`, `(2, 0)`, `(4, 0)`, `(4, 3)`, `(0, 3)` the vertex `(2, 0)` is on the side and **convex** stays yes.

## Errors

| Message | When |
|---|---|
| Serve una lista di punti ("A list of points is needed") | The input is not a list. |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Servono almeno 3 punti ("At least 3 points are needed") | The list has fewer than 3 points. |

## See also

- [Convex hull](plane.hull) for the convex hull of a cloud of points
- [Regular polygon](plane.regular) for a regular polygon
- [Point inside shape](plane.inside) to know whether a point is inside
- [Bounding box](plane.bounds) for the rectangle that contains it
- [How a block works](ide/blocks)
