# Line–plane intersection

`solid.linePlane` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

Where a line meets a plane: the intersection point, the parameter t and whether the line is parallel to the plane.

## Inputs

| Port | Type | Description |
|---|---|---|
| **plane** (`plane`) | any | The plane: an object `{a, b, c, d}` (for ax + by + cz + d = 0) or a list `[a, b, c, d]`. |
| **point of the line** (`point`) | list | A point of the line. |
| **direction of the line** (`direction`) | list | The direction of the line: a non-zero vector. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **point** (`point`) | list | The intersection point. It **does not go out** if the line is parallel to the plane. |
| **t (point + t·direction)** (`t`) | number | The parameter: the intersection is point + t·direction. Hidden by default: show it with the eye in Properties. |
| **parallel** (`parallel`) | yes/no | `true` if the line is parallel to the plane (or lies in it), otherwise `false`. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The line is P + t·v (point P, direction v), the plane has normal n = (a, b, c) and term d:

- t = −(n·P + d) / (n·v)
- intersection = P + t·v

If n·v is (almost) 0 the line is parallel to the plane: the block sends only **parallel** = `true` (no point and no t). The same happens if the line lies in the plane: the two cases are not told apart. Otherwise it sends point, t and **parallel** = `false`. The block waits for the plane, the point and the direction.

## Examples

### 1. A vertical line that pierces the plane z = 5

```
[Constant · Variable: {"a":0,"b":0,"c":1,"d":-5}] value ──▶ plane  [Line–plane intersection] point ──▶ value [Print (console.log)]
[Constant · Variable: [1,2,0]] value ──▶ point of the line                                   t (point + t·direction) ──▶ value [Print (console.log)]
[Constant · Variable: [0,0,1]] value ──▶ direction of the line                               parallel ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
[1,2,5]
5
false
```

**t** is hidden by default.

### 2. A horizontal line: parallel

```
[Constant · Variable: {"a":0,"b":0,"c":1,"d":-5}] value ──▶ plane  [Line–plane intersection] parallel ──▶ value [Print (console.log)]
[Constant · Variable: [0,0,0]] value ──▶ point of the line                                   point ──▶ value [Print (console.log)]
[Constant · Variable: [1,0,0]] value ──▶ direction of the line
```

Writes `true`.

Nothing comes out of the **point** port: the console writes only `true`.

## Errors

| Message | When |
|---|---|
| direzione: il vettore nullo non individua una retta ("direction: the zero vector does not define a line") | The direction is (0, 0, 0). |
| piano: serve un oggetto { a, b, c, d } o una lista [a, b, c, d] ("plane: an object { a, b, c, d } or a list [a, b, c, d] is needed") | The plane is neither an object nor a list (other «piano: …» messages as in [Point–plane distance](solid.planeDistance)). |
| punto: serve un punto o un vettore [x, y, z] ("punto: a point or a vector [x, y, z] is needed") | The point (or the direction, with «direzione:») is not a list of 3 (or 2) elements nor an object. |

## See also

- [Plane through 3 points](solid.plane) to get the plane from three points
- [Point–plane distance](solid.planeDistance) the distance of a point from the plane
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
