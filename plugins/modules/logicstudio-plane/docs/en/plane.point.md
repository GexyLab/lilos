# 2D point [x, y]

`plane.point` · Geometry · [Plane geometry](logicstudio-plane) · version 1

Builds a **2D point** from two numbers: the list `[x, y]`.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** | number | The x coordinate. |
| **y** | number | The y coordinate. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **point [x, y]** (`point`) | list | The point, the list `[x, y]`. |
| **Exception** (`error`) | object | A coordinate is not a number. |

## How it works

The block waits for **x** and **y**: once it has both it sends the point, and sends it again at every new value. Numbers can also arrive as text (`"2.5"`).

As in [Solid geometry](logicstudio-solid), a point is a **list** `[x, y]`: so it works with the blocks of [Lists and matrices](logicstudio-collections). The other blocks of this package also accept a point as an object `{x, y}` or as a list `[x, y, z]` (the z is ignored, because here everything happens in the plane). For points in space there is [3D point [x, y, z]](solid.point).

## Examples

### 1. A point

```
[Constant: 3] value ──▶ x [2D point [x, y]]
[Constant: 4] value ──▶ y [2D point [x, y]] point ──▶ value [Print (console.log)]
```

It sends `[3, 4]`.

### 2. Numbers as text

With **x** = `"2.5"` and **y** = `"-1"` it sends `[2.5, -1]`. With only **x** linked the block waits and sends nothing.

## Errors

| Message | When |
|---|---|
| Non è un numero: «…» ("Not a number") | A linked value is not a number (a text holding a number, like `"2.5"`, is fine). |

## See also

- [Coordinates of a 2D point](plane.split), which does the opposite
- [3D point [x, y, z]](solid.point) for a point in space
- [Polar → cartesian](trig.fromPolar) to start from radius and angle
- [How a block works](ide/blocks)
