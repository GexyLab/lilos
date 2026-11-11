# Polar → cartesian

`trig.fromPolar` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Turns polar coordinates (distance and angle) into a point (x, y).

## Inputs

| Port | Type | Description |
|---|---|---|
| **r (distance)** (`r`) | number | The distance from the origin. If it is negative the point is on the opposite side. |
| **θ (angle)** (`angle`) | number | The angle, in the chosen **Unit**, counted from the positive x axis counterclockwise. |

The block works when **r** and **θ** both have a value: if one of them is missing, it waits.

## Outputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The x coordinate, `r × cos θ`. |
| **y** (`y`) | number | The y coordinate, `r × sin θ`. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. A value is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Unit** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit the angle comes in. |

## How it works

At every pair (r, θ) the block computes `x = r × cos θ` and `y = r × sin θ` and sends them on **x** and **y**.

- **Right angles are exact**: with θ = 90° the point is (0, r) and not (1.2e-16, r). It holds for degrees, gradians and turns; in radians only for 0, because π cannot be written exactly (θ = π rad gives y `1.22464679914735e-16`, not 0).
- An angle larger than a turn, or negative, is fine: −90° is the same point as 270°.
- The results are rounded to **15 significant digits**.
- For the opposite use [Cartesian → polar](trig.toPolar).

## Examples

### 1. A point on the y axis

```
[Constant · Variable: 2] value ──▶ r (distance) [Polar → cartesian: °] y ──▶ value [Print (console.log)]
[Constant · Variable: 90] value ──▶ θ (angle)
```

Writes `2`. The x is `0`.

### 2. An angle of 30°

r = 10, θ = 30°: x `8.66025403784439`, y `5`.

### 3. Half a turn

r = 5, θ = 180°: x `-5`, y `0`.

### 4. In turns

r = 1, θ = 0.125 turns (45°): x `0.707106781186548`, y `0.707106781186547`. The last digits can differ because of the computer's rounding.

### 5. Back to the starting point

r = 5, θ = 53.13010235415598°: x `3`, y `4`. With θ = −90° and r = 2: x `0`, y `-2`.

## Errors

| Message | When |
|---|---|
| r: serve un numero ("r: a number is needed") | **r** is not a number. |
| angolo: serve un numero ("angle: a number is needed") | **θ** is not a number. |

## See also

- [Cartesian → polar](trig.toPolar) for the opposite
- [Trigonometric functions (Math.sin, Math.cos…)](trig.fn)
- [Coordinates](solid.coords) for spherical and cylindrical coordinates (package [Solid geometry](logicstudio-solid))
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
