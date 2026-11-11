# Midpoint · Lerp (t)

`plane.midpoint` · Geometry · [Plane geometry](logicstudio-plane) · version 1

The **midpoint** between two points, or any point of the segment that joins them (linear interpolation, *lerp*).

## Inputs

| Port | Type | Description |
|---|---|---|
| **a [x, y]** (`a`) | list | The first point (the one at `t = 0`). |
| **b [x, y]** (`b`) | list | The second point (the one at `t = 1`). |
| **t** | number | Where to stand between **a** and **b**. If it is not linked the setting **t** is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **point [x, y]** (`point`) | list | The point `a + (b - a) × t`, a list `[x, y]`. |
| **Exception** (`error`) | object | A value is not a point or a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **t (if not linked)** (`t`) | a number | 0.5 | The value of **t** when the input is not linked. `0.5` is the midpoint. |

## How it works

With `t = 0` it sends **a**, with `t = 1` **b**, with `t = 0.5` the midpoint. **t** can also go outside the range 0 to 1: `t = 2` is the point beyond **b**, as far from **b** as **b** is from **a**; `t = -1` is the point on the other side of **a**. For two points in space [Distance and midpoint](solid.distance) gives the midpoint.

## Examples

### 1. The midpoint

```
[Point: (0, 0)] point ──▶ a [Midpoint · Lerp (t)]
[Point: (4, 2)] point ──▶ b [Midpoint · Lerp (t)] point ──▶ value [Print (console.log)]
```

It sends `[2, 1]`.

### 2. A movement

With **a** = `(0, 0)`, **b** = `(10, 0)` and **t** coming from a slider from 0 to 1, the point slides from one end to the other: `t = 0.1` gives `[1, 0]`, `t = 2` gives `[20, 0]`.

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è un numero: «…» ("Not a number") | A linked value is not a number (a text holding a number, like `"2.5"`, is fine). |

## See also

- [Distance (Math.hypot)](plane.distance) for the distance
- [Bisector (axis of a segment · of an angle)](plane.bisector) for the perpendicular bisector of a segment
- [Distance and midpoint](solid.distance) for the distance and midpoint in space
- [How a block works](ide/blocks)
