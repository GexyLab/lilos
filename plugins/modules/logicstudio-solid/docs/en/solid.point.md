# 3D point [x, y, z]

`solid.point` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

Puts three numbers together into a 3D point (or vector), a list `[x, y, z]`.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The x coordinate. |
| **y** (`y`) | number | The y coordinate. |
| **z** (`z`) | number | The z coordinate. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **point** (`point`) | list | The point `[x, y, z]`. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

An input that is **not linked** counts as 0: if you link only **x** and **y** it outputs `[x, y, 0]`. The block waits for all the inputs that are linked, then at every new value it sends the point.

A text with a number (`"2.5"`) is fine. For the opposite, see [Coordinates of a point](solid.pointXYZ).

## Examples

### 1. A point from three numbers

```
[Constant · Variable: 1] value ──▶ x  [3D point [x, y, z]] point ──▶ value [Print (console.log)]
[Constant · Variable: 2] value ──▶ y
[Constant · Variable: 3] value ──▶ z
```

Writes `[1,2,3]`.

### 2. Only x and y linked: z counts as 0

```
[Constant · Variable: 4] value ──▶ x   [3D point [x, y, z]] point ──▶ value [Print (console.log)]
[Constant · Variable: -2] value ──▶ y
```

Writes `[4,-2,0]`.

## Errors

| Message | When |
|---|---|
| x: serve un numero ("x: a number is needed") | The value of **x** is not a number (and the same for «y:» and «z:»). |

## See also

- [Coordinates of a point](solid.pointXYZ) the opposite: the three coordinates of a point
- [Distance and midpoint](solid.distance) the distance between two points
- [Get list[i]](coll.get) to read a coordinate as a list element
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
