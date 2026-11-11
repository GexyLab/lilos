# Inverse functions (Math.asin, Math.acos…)

`trig.inverse` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

From a value finds the angle: arcsine, arccosine, arctangent, arccotangent, arcsecant or arccosecant.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value to find the angle of. A text with a number (`"0.5"`) is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **angle** (`angle`) | number | The angle, in the chosen **Unit**. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. The value is not a number or is out of the domain of the function. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`fn`) | asin, acos, atan, acot, asec, acsc | asin | Which function to compute. |
| **Unit** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit the angle goes out in. |

## How it works

At every value that arrives the block computes the angle and sends it on **angle**.

| Function | Accepted values | Angle that comes out (in degrees) |
|---|---|---|
| **asin** | from −1 to 1 | from −90° to 90° |
| **acos** | from −1 to 1 | from 0° to 180° |
| **atan** | any | between −90° and 90°, excluded |
| **acot** | any | between 0° and 180°, excluded |
| **asec** | less than −1 or more than 1 (−1 and 1 too) | from 0° to 180°, 90° excluded |
| **acsc** | less than −1 or more than 1 (−1 and 1 too) | from −90° to 90°, 0° excluded |

- **acot** always comes out between 0° and 180° (not between −90° and 90°): acot(1) = 45°, acot(0) = 90°, acot(−1) = 135°. It is the angle `90° − atan(value)`.
- **asec**(x) is acos(1 ÷ x) and **acsc**(x) is asin(1 ÷ x).
- The result is rounded to **15 significant digits**. Well-known angles come out clean (asin(0.5) gives `30`, not `30.000000000000004`).
- For the angle of a point (x, y) in all four quadrants use [Angle of a point (Math.atan2)](trig.atan2): **atan** alone cannot tell whether x is negative.

## Examples

### 1. The angle that has sine 0.5

```
[Constant · Variable: 0.5] value ──▶ value [Inverse functions: asin] angle ──▶ value [Print (console.log)]
```

Writes `30`.

### 2. The arctangent of 1 in radians

Function **atan**, **Unit** radians, value 1: writes `0.785398163397448` (π ÷ 4).

### 3. The arccotangents

Function **acot**: value 1 writes `45`, value −1 writes `135`, value 0 writes `90`.

### 4. Arccosine in gradians

Function **acos**, **Unit** gradians, value 0.5: writes `66.6666666666667`.

### 5. A value out of domain

Function **asin**, value 2: error `asin vuole un valore tra −1 e 1`.

## Errors

| Message | When |
|---|---|
| valore: serve un numero ("value: a number is needed") | The value is not a number (for example a text like `"abc"`). |
| asin vuole un valore tra −1 e 1 ("asin wants a value between −1 and 1") | **asin**, with a value outside −1…1. |
| acos vuole un valore tra −1 e 1 ("acos wants a value between −1 and 1") | **acos**, with a value outside −1…1. |
| asec vuole un valore minore di −1 o maggiore di 1 ("asec wants a value less than −1 or more than 1") | **asec**, with a value between −1 and 1 (excluded). |
| acsc vuole un valore minore di −1 o maggiore di 1 ("acsc wants a value less than −1 or more than 1") | **acsc**, with a value between −1 and 1 (excluded). |

## See also

- [Trigonometric functions (Math.sin, Math.cos…)](trig.fn) to do the opposite
- [Angle of a point (Math.atan2)](trig.atan2) for the angle of a point in all quadrants
- [Hyperbolic functions (Math.sinh, Math.cosh…)](trig.hyperbolic) for the inverse hyperbolic ones
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
