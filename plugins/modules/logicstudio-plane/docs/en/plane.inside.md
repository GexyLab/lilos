# Point inside shape

`plane.inside` · Geometry · [Plane geometry](logicstudio-plane) · version 1

Tells whether a **point** is inside a shape, on its edge or outside: polygon, circle or rectangle.

## Inputs

| Port | Type | Description |
|---|---|---|
| **shape** | any | The shape: a polygon, a circle or a rectangle (as they come out of [Polygon (area · perimeter)](plane.polygon), [Regular polygon](plane.regular), [Circle](plane.circle), [Bounding box](plane.bounds)), or a list of points, which counts as a polygon. |
| **point [x, y]** (`point`) | list | The point to check. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **where** | text | The text `inside`, `edge` (on the edge) or `outside`. |
| **inside** | yes/no | **yes** if the point is inside, edge excluded. |
| **on the edge** (`edge`) | yes/no | **yes** if the point is on the edge. |
| **outside** | yes/no | **yes** if the point is outside. |
| **Exception** (`error`) | object | A value is not a point or a shape, or the shape is not one of the supported ones. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Tolerance for the edge** (`epsilon`) | a number | 1e-9 | The tolerance for the edge: a point at this distance or less from the outline is «on the edge». |

## How it works

For the polygon the block first checks whether the point is near a side (on the edge, within the tolerance), then counts how many times a ray from the point crosses the outline: an odd number means inside. For the circle the distance from the centre is compared with the radius; for the rectangle the coordinates with its limits. With tolerance `0` the edge is only the exact outline, and a point 1e-10 from the outline falls outside. The check is 2D.

## Examples

### 1. A point and a square

```
[Polygon: (0,0) (4,0) (4,4) (0,4)] polygon ──▶ shape [Point inside shape]
[Point: (2, 2)] point ──▶ point [Point inside shape] inside ──▶ condition [If · Else]
```

| Point | where |
|---|---|
| `(2, 2)` | `inside` |
| `(4, 2)` | `edge` |
| `(0, 0)` | `edge` |
| `(5, 2)` | `outside` |

### 2. Circle and rectangle

With the circle of centre `(0, 0)` and radius 5: `(3, 4)` is on the edge (distance 5), `(1, 1)` is inside, `(4, 4)` is outside. With the rectangle from `(0, 0)` to `(4, 3)` of [Bounding box](plane.bounds): `(2, 1)` is inside, `(4, 1)` on the edge, `(5, 1)` outside. A list `[[0, 0], [4, 0], [0, 4]]` counts as a triangle: `(1, 1)` is inside.

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è un cerchio: «…» ("Not a circle") | The value is not the shape of a circle (see [Circle](plane.circle)). |
| Figura non supportata: «…» ("Unsupported shape") | The shape is not a polygon, a circle, a rectangle or a list of points. |
| Servono almeno 3 punti ("At least 3 points are needed") | The polygon has fewer than 3 points. |

## See also

- [Polygon (area · perimeter)](plane.polygon), [Circle](plane.circle) and [Bounding box](plane.bounds) to build the shape
- [Distance (Math.hypot)](plane.distance) to know how far it is
- [How a block works](ide/blocks)
