# Cartesian, cylindrical, spherical coordinates

`solid.coords` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

Changes the coordinates of a point: Cartesian, cylindrical or spherical.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point** (`point`) | list | The point, a list of 3 values in the **From** system. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **point** (`point`) | list | The point in the **To** system, a list of 3 values. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **From** (`from`) | Cartesian [x, y, z] / Cylindrical [ρ, φ, z] / Spherical [r, θ, φ] | Cartesian [x, y, z] | The system the point comes in. |
| **To** (`to`) | Cartesian [x, y, z] / Cylindrical [ρ, φ, z] / Spherical [r, θ, φ] | Spherical [r, θ, φ] | The system the point goes out in. |
| **Angle unit** (`unit`) | Degrees / Radians / Gradians / Turns | Degrees | The unit of the angles (φ and θ), in and out. |

## How it works

The three systems, with the angles in the chosen unit:

- **Cartesian** `[x, y, z]`
- **Cylindrical** `[ρ, φ, z]`: ρ distance from the z axis, φ angle in the xy plane from the x axis
- **Spherical** `[r, θ, φ]`: r distance from the origin, θ angle **from the z axis** (0 to 180°), φ angle in the xy plane from the x axis

The block always goes through Cartesian coordinates: from cylindrical x = ρ·cos φ, y = ρ·sin φ; from spherical x = r·sin θ·cos φ, y = r·sin θ·sin φ, z = r·cos θ. On the way out: cylindrical ρ = √(x² + y²), φ = atan2(y, x); spherical r = √(x² + y² + z²), θ = arccos(z / r), φ = atan2(y, x). At the origin θ is 0. Tiny values (under 10⁻¹⁴, rounding errors) come out as 0.

With **From** and **To** equal the point passes unchanged. The output φ goes from −180° to 180°.

## Examples

### 1. From Cartesian to spherical

```
[Constant · Variable: [1,1,0]] value ──▶ point  [Cartesian, cylindrical, spherical coordinates: Cartesian [x, y, z], Spherical [r, θ, φ]] point ──▶ value [Print (console.log)]
```

Settings: **From** = Cartesian [x, y, z]; **To** = Spherical [r, θ, φ] (θ from the z axis).

Writes `[1.4142135623731,90,45]`.

r = √2, θ = 90° (on the xy plane), φ = 45°.

### 2. From cylindrical to Cartesian

```
[Constant · Variable: [2,90,5]] value ──▶ point  [Cartesian, cylindrical, spherical coordinates: Cylindrical [ρ, φ, z], Cartesian [x, y, z]] point ──▶ value [Print (console.log)]
```

Settings: **From** = Cylindrical [ρ, φ, z]; **To** = Cartesian [x, y, z].

Writes `[0,2,5]`.

ρ = 2, φ = 90°, z = 5: the point is on the y axis.

## Errors

| Message | When |
|---|---|
| punto: serve un punto o un vettore [x, y, z] ("punto: a point or a vector [x, y, z] is needed") | The point is not a list of 3 (or 2) elements nor an object. |
| punto: le coordinate devono essere numeri ("punto: the coordinates must be numbers") | A coordinate is not a number. |

## See also

- [Transform points (move, scale, rotate)](solid.transform) to move and rotate points
- [Convert and normalize an angle](trig.convert) to change the unit of an angle
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
