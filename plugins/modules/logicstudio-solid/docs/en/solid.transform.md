# Transform points (move, scale, rotate)

`solid.transform` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

Moves, scales or rotates a point or a list of points.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point or list of points** (`point`) | list | A point `[x, y, z]` or a list of points `[[x, y, z], …]` (up to 10000). `{x, y, z}` objects are fine too. |
| **vector (offset, factors, axis)** (`vector`) | list | It depends on the transform: the offset (**Translate**), the factors `[kx, ky, kz]` (**Scale**) or the axis of the rotation (**Rotate about the vector**). Not needed for rotations about the x, y, z axes. |
| **angle** (`angle`) | number | The angle of the rotation, in the chosen unit. Not needed for **Translate** and **Scale**. |
| **centre** (`centre`) | list | The centre of the scale or the rotation. If it is not linked it is the origin (0, 0, 0). Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **point or list of points** (`point`) | list | The transformed point, or the list of the transformed points (in the same order). |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Transform** (`op`) | see the table below | Rotate about the z axis through the centre | Which transform (table below). |
| **Angle unit** (`unit`) | Degrees / Radians / Gradians / Turns | Degrees | The unit of the rotation angle. |

The options of **Transform**:

| Option | Internal name |
|---|---|
| Translate by the vector | `translate` |
| Scale by the factors [kx, ky, kz] from the centre | `scale` |
| Rotate about the x axis through the centre | `rotateX` |
| Rotate about the y axis through the centre | `rotateY` |
| Rotate about the z axis through the centre | `rotateZ` |
| Rotate about the vector through the centre | `rotateAxis` |

## How it works

The block waits for the inputs the chosen transform needs (**point** and **vector** for Translate, Scale and Rotate about the vector; **point** and **angle** for the rotations about the axes and for Rotate about the vector). If **centre** is linked, it waits for that too. With centre *c*:

- **Translate**: p + v (the centre does not matter)
- **Scale**: c + (p − c) · (kx, ky, kz), component by component
- **Rotate about the x, y or z axis**: rotates p about the axis parallel to the chosen one that goes through c, by an angle θ (positive anticlockwise looking from the axis towards the origin, the right-hand rule)
- **Rotate about the vector**: as above, with the axis along v (Rodrigues' rotation): p′ = c + r·cos θ + (k × r)·sin θ + k·(k·r)·(1 − cos θ), with r = p − c and k = v / |v|

A point with two values `[x, y]` counts as `[x, y, 0]`: for **Scale**, two factors `[2, 3]` count as `[2, 3, 1]`: z stays as it is. Coordinates under 10⁻¹⁴ in absolute value come out as 0 (no `6.1e-17` from a sine).

## Examples

### 1. Rotating a point by 90° about z

```
[Constant · Variable: [1,0,0]] value ──▶ point or list of points  [Transform points: Rotate about the z axis through the centre] point or list of points ──▶ value [Print (console.log)]
[Constant · Variable: 90] value ──▶ angle
```

Settings: **Transform** = Rotate about the z axis through the centre.

Writes `[0,1,0]`.

### 2. Moving three points together

```
[Constant · Variable: [[0,0,0],[1,0,0],[1,1,0]]] value ──▶ point or list of points  [Transform points: Translate by the vector] point or list of points ──▶ value [Print (console.log)]
[Constant · Variable: [10,20,30]] value ──▶ vector (offset, factors, axis)
```

Settings: **Transform** = Translate by the vector.

Writes `[[10,20,30],[11,20,30],[11,21,30]]`.

A list of points comes out as a list of points.

### 3. Doubling a point relative to a centre

```
[Constant · Variable: [3,3,3]] value ──▶ point or list of points         [Transform points: Scale by the factors [kx, ky, kz] from the centre] point or list of points ──▶ value [Print (console.log)]
[Constant · Variable: [2,2,2]] value ──▶ vector (offset, factors, axis)
[Constant · Variable: [1,1,1]] value ──▶ centre
```

Settings: **Transform** = Scale by the factors [kx, ky, kz] from the centre.

Writes `[5,5,5]`.

The **centre** input is hidden by default. The point (3, 3, 3) is (2, 2, 2) away from the centre; doubled it becomes (4, 4, 4) away, that is (5, 5, 5).

## Errors

| Message | When |
|---|---|
| punto: serve un punto o un vettore [x, y, z] ("punto: a point or a vector [x, y, z] is needed") | A point is not a list of 3 (or 2) elements nor an object (same for «vettore:» and «centro:»). |
| angolo: serve un numero ("angolo: a number is needed") | The angle is not a number. |
| asse: il vettore nullo non ha una direzione ("asse: the zero vector has no direction") | With **Rotate about the vector**, the vector is (0, 0, 0). |
| Al massimo 10000 punti ("At most 10000 points") | The list has more than 10000 points. |

## See also

- [Cartesian, cylindrical, spherical coordinates](solid.coords) to change coordinate system
- [3D point [x, y, z]](solid.point) to build a point
- [A × B](coll.matMultiply) for transforms with matrices
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
