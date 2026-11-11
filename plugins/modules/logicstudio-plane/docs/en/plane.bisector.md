# Bisector (axis of a segment · of an angle)

`plane.bisector` · Geometry · [Plane geometry](logicstudio-plane) · version 1

The **perpendicular bisector** of a segment or the **angle bisector** of an angle.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a [x, y]** (`a`) | list | The first end of the segment, or a point on the first side of the angle. |
| **b [x, y]** (`b`) | list | The second end of the segment, or a point on the second side of the angle. |
| **vertex [x, y]** (`vertex`) | list | The vertex of the angle. Needed only for **Angle a-vertex-b**. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **line** | object | The line, as a shape. |
| **equation** | text | The equation as text. |
| **midpoint** | list | The midpoint of the segment. Sent only for **Segment a-b**. |
| **Exception** (`error`) | object | A value is not a point, or the points are the same. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Of** (`mode`) | Segment a-b (perpendicular bisector) / Angle a-vertex-b (bisector) | Segment a-b (perpendicular bisector) | What to take the bisector of. |

## How it works

**Segment a-b**: the line perpendicular to `a-b` through its midpoint; each of its points is at the same distance from **a** and from **b**.

**Angle a-vertex-b**: the angle has its vertex at **vertex** and its sides towards **a** and towards **b**. The bisector splits it into two equal angles. If the two sides are opposite (a straight angle) the bisector is the perpendicular to the sides.

## Examples

### 1. The bisector of a segment

```
[Point: (0, 0)] point ──▶ a [Bisector: Segment]
[Point: (4, 0)] point ──▶ b [Bisector: Segment] equation ──▶ value [Print (console.log)]
```

It sends `x = 2` and the midpoint `[2, 0]`.

### 2. The bisector of a right angle

With **vertex** = `(0, 0)`, **a** = `(1, 0)` and **b** = `(0, 1)` it sends `y = x`. With **a** = `(1, 0)` and **b** = `(-1, 0)` (a straight angle) it sends `x = 0`.

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| I due punti coincidono: non definiscono una retta ("The two points are the same: they do not define a line") | The two points are the same point. |
| Il vertice coincide con un punto ("The vertex is the same as a point") | With **Angle a-vertex-b**: **a** or **b** is at the vertex, and the side has no direction. |

## See also

- [Midpoint · Lerp (t)](plane.midpoint) for the midpoint alone
- [Parallel · Perpendicular](plane.parallel) for a perpendicular through any point
- [Intersection](plane.intersect) to find the centre of a circle from the meeting of two bisectors
- [How a block works](ide/blocks)
