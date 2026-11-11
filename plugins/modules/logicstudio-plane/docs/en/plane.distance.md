# Distance (Math.hypot)

`plane.distance` · Geometry · [Plane geometry](logicstudio-plane) · version 1

Measures the **distance** of a point from another point, a line or a segment, and finds the closest point.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point [x, y]** (`p`) | list | The point to measure. |
| **a [x, y]** (`a`) | list | The second point, or the first point of the line or segment. |
| **b [x, y]** (`b`) | list | The second point of the line or segment. Needed only for **the line** and **the segment**. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **distance** | number | The distance, always positive or zero. |
| **closest point** (`closest`) | list | The point closest to **p** on the line or the segment (the foot of the perpendicular), a list `[x, y]`. It is not sent for the distance between two points. |
| **Exception** (`error`) | object | A value is not a point, or the two points of the line are the same. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Distance from the point to** (`mode`) | another point (p, a) / the line through a and b / the segment a-b | another point (p, a) | What to measure from. See the table below. |

## How it works

It is the `Math.hypot` formula for two points; for the other cases **p** is projected on the object and the stretch is measured. For distances in space and from a plane there are [Distance and midpoint](solid.distance) and [Point–plane distance](solid.planeDistance).

| From what | Inputs | What is measured |
|---|---|---|
| Another point | p, a | The straight distance between **p** and **a**. |
| The line through a and b | p, a, b | The distance from the line through **a** and **b** (endless on both sides). |
| The segment a-b | p, a, b | Like the line, but if the perpendicular falls outside the segment the nearest end counts. |

With the segment, if **a** and **b** are the same point, the distance is that from the point.

## Examples

### 1. Between two points

```
[Point: (0, 0)] point ──▶ p [Distance (Math.hypot)]
[Point: (3, 4)] point ──▶ a [Distance (Math.hypot)] distance ──▶ value [Print (console.log)]
```

It sends `5`.

### 2. From a line and from a segment

| From what | p | a | b | distance | closest |
|---|---|---|---|---|---|
| line | `[0, 5]` | `[0, 0]` | `[10, 0]` | `5` | `[0, 0]` |
| line | `[20, 5]` | `[0, 0]` | `[10, 0]` | `5` | `[20, 0]` |
| segment | `[13, 4]` | `[0, 0]` | `[10, 0]` | `5` | `[10, 0]` |

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| I due punti coincidono: non definiscono una retta ("The two points are the same: they do not define a line") | The two points are the same point. |

## See also

- [Distance and midpoint](solid.distance) for the distance and midpoint in space
- [Line through two points](plane.line) to get the line with its equation
- [Intersection](plane.intersect) to find where two objects meet
- [How a block works](ide/blocks)
