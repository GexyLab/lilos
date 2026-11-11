# Coordinates of a 2D point

`plane.split` · Geometry · [Plane geometry](logicstudio-plane) · version 1

Splits a **2D point** into its x and y coordinates.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point [x, y]** (`point`) | list | The point: a list `[x, y]` (`[x, y, z]` too, the z is ignored) or an object `{x, y}`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **x** | number | The x coordinate. |
| **y** | number | The y coordinate. |
| **Exception** (`error`) | object | The value is not a point. |

## How it works

At every point that arrives the block sends the two coordinates together. For a point in space there is [Coordinates of a point](solid.pointXYZ).

## Examples

### 1. The coordinates of a point

```
[Point: (3, 4)] point ──▶ point [Coordinates of a 2D point] x ──▶ value [Print (console.log)]
```

It sends `3`. Port **y** sends `4`.

### 2. From an object or a three-value list

With `{"x": 1, "y": 2}` you get x = 1, y = 2. With the list `[1, 2, 7]` you still get x = 1, y = 2: the z does not count.

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |

## See also

- [2D point [x, y]](plane.point), which does the opposite
- [Coordinates of a point](solid.pointXYZ) for a point in space
- [How a block works](ide/blocks)
