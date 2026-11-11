# Intersection

`plane.intersect` · Geometry · [Plane geometry](logicstudio-plane) · version 1

Where two objects **meet**: two lines, two segments, a line and a circle, two circles. It also says when they do not meet.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | any | The first object. A line is the shape from [Line through two points](plane.line), a list of two points `[[x1, y1], [x2, y2]]` or an object `{a, b, c}`; a circle is the shape from [Circle](plane.circle). |
| **b** | any | The second object, of the same kind. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **points [[x, y], …]** (`points`) | list | The list of the common points, each one a list `[x, y]` (empty if there are none). |
| **first point** (`point`) | list | The first point, a list `[x, y]`. It is not sent if there are none. |
| **count** | number | How many points: 0, 1 or 2. |
| **found** | yes/no | **yes** if there is at least one point, **no** otherwise. |
| **none** | pulse | A pulse when the two objects do **not** meet. |
| **Exception** (`error`) | object | An object is not of the expected type, or the two objects coincide (infinitely many common points). |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Between** (`mode`) | Two lines / Two segments / A line and a circle / Two circles | Two lines | Between which objects to look. |
| **Tolerance (ε)** (`epsilon`) | a number | 1e-9 | The tolerance (ε) used to decide that two lines are parallel or that a line is tangent. |

## How it works

| Between | Objects | Possible points |
|---|---|---|
| Two lines | **a**, **b** lines | 0 (parallel) or 1 |
| Two segments | **a**, **b** segments (the line of [Line through two points](plane.line) counts as the segment between its two points, and a list of two points is the segment) | 0 or 1 |
| A line and a circle | a line and a circle, in any order | 0, 1 (tangent) or 2 |
| Two circles | **a**, **b** circles | 0, 1 (tangent) or 2 |

When there are points, **points**, **point**, **count** and **found** = yes come out. When there are none the pulse **none** comes out, **found** is no and **count** is 0.

Two equal lines, two equal circles or two overlapping segments have **infinitely many** common points: the block gives an error, because the list could not hold them. Two segments touching at one end only have that point in common. For the meeting of a line with a plane in space there is [Line–plane intersection](solid.linePlane).

## Examples

### 1. Two crossing lines

```
[Line (0,0)-(2,2)] line ──▶ a [Intersection: Two lines]
[Line (0,2)-(2,0)] line ──▶ b [Intersection: Two lines] point ──▶ value [Print (console.log)]
                                                 none ──▶ [Print: "parallel"]
```

It sends the point `[1, 1]`. With two parallel lines (`(0,0)-(1,0)` and `(0,1)-(1,1)`) the pulse **none** comes out instead.

### 2. Circles and lines

With the circle of centre `(0, 0)` and radius 5:

| With | Output |
|---|---|
| the line `y = 0` | `[[-5, 0], [5, 0]]` |
| the line `y = 5` (tangent) | `[[0, 5]]` |
| the line `y = 6` | no points, pulse **none** |
| the circle of centre `(8, 0)` and radius 5 | `[[4, 3], [4, -3]]` |
| the circle of centre `(10, 0)` and radius 5 | `[[5, 0]]` |

## Errors

| Message | When |
|---|---|
| Non è una retta: «…» ("Not a line") | The value is not a line: it must be the line of [Line through two points](plane.line), a list of two points `[[x1, y1], [x2, y2]]` or an object `{a, b, c}`. |
| Non è un cerchio: «…» ("Not a circle") | The value is not the shape of a circle (see [Circle](plane.circle)). |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Le rette coincidono: i punti in comune sono infiniti ("The lines coincide: infinitely many common points") | With **Two lines**: they are the same line. |
| I segmenti si sovrappongono: i punti in comune sono infiniti ("The segments overlap: infinitely many common points") | With **Two segments**: they lie on the same line and share a stretch. |
| I cerchi coincidono: i punti in comune sono infiniti ("The circles coincide: infinitely many common points") | With **Two circles**: same centre and same radius. |
| I due punti coincidono: non definiscono una retta ("The two points are the same: they do not define a line") | The two points are the same point. |

## See also

- [Line through two points](plane.line) and [Circle](plane.circle) to build the objects
- [Point inside shape](plane.inside) to know whether a point is inside a shape
- [Distance (Math.hypot)](plane.distance) for the distance between a point and a line
- [Line–plane intersection](solid.linePlane) for the meeting of a line with a plane
- [How a block works](ide/blocks)
