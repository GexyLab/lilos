# Angle of a point (Math.atan2)

`trig.atan2` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Finds the angle of a point (x, y) from the x axis, in the right quadrant.

## Inputs

| Port | Type | Description |
|---|---|---|
| **y** (`y`) | number | The y coordinate of the point. |
| **x** (`x`) | number | The x coordinate of the point. |

The block works when **y** and **x** both have a value: if one of them is missing, it waits.

## Outputs

| Port | Type | Description |
|---|---|---|
| **angle** (`angle`) | number | The angle of the point, in the chosen **Unit** and **Range**. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. A value is not a number, or the point is the origin. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Unit** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit the angle goes out in. |
| **Range** (`range`) | From −180° to 180°, From 0° to 360° | From −180° to 180° | In which turn the angle falls. |

## How it works

At every pair (y, x) the block computes the angle of the ray going from the origin to the point, counted from the positive x axis counterclockwise, and sends it on **angle**.

- With **From −180° to 180°** the points below the x axis have a negative angle: (−1, −1) is −135°. With **From 0° to 360°** the same point is 225°. The range holds in any unit (in radians it is from −π to π and from 0 to 2π; in turns from −0.5 to 0.5 and from 0 to 1).
- Unlike [Inverse functions (Math.asin, Math.acos…)](trig.inverse) with **atan**, which gives only angles between −90° and 90°, here the signs of x and y tell the quadrant.
- A point on the negative x axis (y = 0, x < 0) is 180° (with the range from −180° to 180° it is 180°, not −180°).
- The origin (0, 0) has no angle: it is an error.
- The result is rounded to **15 significant digits**.

## Examples

### 1. The point (1, 1)

```
[Constant · Variable: 1] value ──▶ y [Angle of a point: °] angle ──▶ value [Print (console.log)]
[Constant · Variable: 1] value ──▶ x
```

Writes `45`.

### 2. A point at the bottom left

(y = −1, x = −1): with the range from −180° to 180° it writes `-135`; with from 0° to 360° it writes `225`.

### 3. A point on the negative x axis

(y = 0, x = −5): writes `180`.

### 4. In radians

(y = 1, x = 0), **Unit** radians: writes `1.5707963267949` (π ÷ 2).

### 5. Any point

(y = 3, x = 4): writes `36.869897645844`. With y = −3 and the range from 0° to 360° it writes `323.130102354156`.

## Errors

| Message | When |
|---|---|
| y: serve un numero ("y: a number is needed") | **y** is not a number. |
| x: serve un numero ("x: a number is needed") | **x** is not a number. |
| L'angolo non è definito per x = 0 e y = 0 ("The angle is not defined for x = 0 and y = 0") | The point is the origin. |

## See also

- [Cartesian → polar](trig.toPolar) to get the distance from the origin too
- [Inverse functions (Math.asin, Math.acos…)](trig.inverse) for the plain arctangent
- [Convert and normalize an angle](trig.convert) to change the unit or the range of an angle
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
