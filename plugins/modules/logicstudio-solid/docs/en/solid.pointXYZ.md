# Coordinates of a point

`solid.pointXYZ` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

Splits a 3D point or vector into its three coordinates.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point** (`point`) | list | The point: a list `[x, y, z]` (or `[x, y]`, with z = 0) or an object `{x, y, z}`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The x coordinate. |
| **y** (`y`) | number | The y coordinate. |
| **z** (`z`) | number | The z coordinate. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

At every point that arrives the block sends the three coordinates on the three outputs. With two values the **z** coordinate comes out as 0. The coordinates can be texts with a number (`"2.5"`).

## Examples

### 1. The coordinates of a point

```
[Constant · Variable: [3,-4,12]] value ──▶ point  [Coordinates of a point] x ──▶ value [Print (console.log)]
                                                                           y ──▶ value [Print (console.log)]
                                                                           z ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
3
-4
12
```

### 2. An {x, y} object without z

```
[Constant · Variable: {"x":5,"y":6}] value ──▶ point  [Coordinates of a point] x ──▶ value [Print (console.log)]
                                                                               y ──▶ value [Print (console.log)]
                                                                               z ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
5
6
0
```

## Errors

| Message | When |
|---|---|
| punto: serve un punto o un vettore [x, y, z] ("punto: a point or a vector [x, y, z] is needed") | The value is not a list of 3 (or 2) elements nor an object. |
| punto: le coordinate devono essere numeri ("punto: the coordinates must be numbers") | A coordinate is not a number. |

## See also

- [3D point [x, y, z]](solid.point) the opposite: three numbers into a point
- [Get list[i]](coll.get) another way to read an element
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
