# Cartesian → polar

`trig.toPolar` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Turns a point (x, y) into polar coordinates: the distance from the origin and the angle.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The x coordinate of the point. |
| **y** (`y`) | number | The y coordinate of the point. |

The block works when **x** and **y** both have a value: if one of them is missing, it waits.

## Outputs

| Port | Type | Description |
|---|---|---|
| **r (distance)** (`r`) | number | The distance of the point from the origin, `√(x² + y²)`. Never negative. |
| **θ (angle)** (`angle`) | number | The angle of the point, in the chosen **Unit** and **Range**. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. A value is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Unit** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit the angle goes out in. |
| **Range** (`range`) | From −180° to 180°, From 0° to 360° | From 0° to 360° | In which turn the angle falls. |

## How it works

At every pair (x, y) the block computes the distance `r = √(x² + y²)` and the angle θ of the ray going from the origin to the point, counted from the positive x axis counterclockwise.

- With **From 0° to 360°** (default) a point at the bottom left like (−1, −1) has the angle 225°; with **From −180° to 180°** it has −135°.
- The origin (0, 0) gives no error: **r** is 0 and **θ** is 0.
- The result is rounded to **15 significant digits**.
- To get only the angle, with the error on the origin, use [Angle of a point (Math.atan2)](trig.atan2) (there the default range is the other one).
- For the opposite use [Polar → cartesian](trig.fromPolar).

## Examples

### 1. The point (3, 4)

```
[Constant · Variable: 3] value ──▶ x [Cartesian → polar: °] r ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ y
```

Writes `5`. The angle θ is `53.130102354156`.

### 2. A point at the bottom left

(x = −1, y = −1): r `1.4142135623731` and θ `225`. With the range from −180° to 180° θ is `-135`.

### 3. On the negative y axis

(x = 0, y = −2): r `2`, θ `270`.

### 4. In radians, and the origin

(x = 0, y = 2), **Unit** radians: r `2`, θ `1.5707963267949`. The point (0, 0) gives r `0` and θ `0`.

### 5. In turns

(x = 6, y = 8), **Unit** turns: r `10`, θ `0.147583617650433`.

## Errors

| Message | When |
|---|---|
| x: serve un numero ("x: a number is needed") | **x** is not a number. |
| y: serve un numero ("y: a number is needed") | **y** is not a number. |

## See also

- [Polar → cartesian](trig.fromPolar) for the opposite
- [Angle of a point (Math.atan2)](trig.atan2) for the angle alone
- [Coordinates](solid.coords) for spherical and cylindrical coordinates (package [Solid geometry](logicstudio-solid))
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
