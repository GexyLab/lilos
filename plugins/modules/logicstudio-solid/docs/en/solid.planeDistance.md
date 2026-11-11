# Point–plane distance

`solid.planeDistance` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

The distance of a point from a plane, with sign, and the projection of the point on the plane.

## Inputs

| Port | Type | Description |
|---|---|---|
| **plane** (`plane`) | any | The plane: an object `{a, b, c, d}` (for ax + by + cz + d = 0) or a list `[a, b, c, d]`. It is the output of [Plane through 3 points](solid.plane). |
| **point** (`point`) | list | The point: a list `[x, y, z]` or an object `{x, y, z}`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **distance** (`distance`) | number | The distance (always ≥ 0). |
| **signed distance** (`signed`) | number | The signed distance: positive on the side the normal (a, b, c) points to, negative on the other. Hidden by default: show it with the eye in Properties. |
| **projection on the plane** (`projection`) | list | The point on the plane closest to P (the perpendicular projection). |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

With plane ax + by + cz + d = 0, normal n = (a, b, c) and point P:

- signed distance s = (n·P + d) / |n|; distance = |s|
- projection = P − (s / |n|)·n

The block waits for the plane and the point. The coefficients a, b, c must not all be 0.

## Examples

### 1. The point (1, 2, 8) from the plane z = 5

```
[Constant · Variable: {"a":0,"b":0,"c":1,"d":-5}] value ──▶ plane  [Point–plane distance] distance ──▶ value [Print (console.log)]
[Constant · Variable: [1,2,8]] value ──▶ point                                            projection on the plane ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
3
[1,2,5]
```

### 2. A plane as a list [a, b, c, d]: x + y + z = 3

```
[Constant · Variable: [1,1,1,-3]] value ──▶ plane  [Point–plane distance] distance ──▶ value [Print (console.log)]
[Constant · Variable: [0,0,0]] value ──▶ point                            signed distance ──▶ value [Print (console.log)]
                                                                          projection on the plane ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
1.73205080756888
-1.73205080756888
[1,1,1]
```

The signed distance is hidden by default. The point (0, 0, 0) is on the side opposite to the normal (1, 1, 1): that is why the sign is negative.

## Errors

| Message | When |
|---|---|
| piano: serve un oggetto { a, b, c, d } o una lista [a, b, c, d] ("plane: an object { a, b, c, d } or a list [a, b, c, d] is needed") | The **plane** input is neither an object nor a list. |
| piano: a, b, c e d devono essere numeri ("plane: a, b, c and d must be numbers") | One of the four coefficients is not a number. |
| piano: a, b e c non possono essere tutti 0 ("plane: a, b and c cannot all be 0") | a, b and c are all 0: it is not a plane. |
| punto: serve un punto o un vettore [x, y, z] ("punto: a point or a vector [x, y, z] is needed") | The point is not a list of 3 (or 2) elements nor an object. |

## See also

- [Plane through 3 points](solid.plane) to get the plane from three points
- [Line–plane intersection](solid.linePlane) where a line meets the plane
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
