# Trigonometric functions (Math.sin, Math.cos…)

`trig.fn` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Computes the sine, cosine, tangent, cotangent, secant or cosecant of an angle.

## Inputs

| Port | Type | Description |
|---|---|---|
| **angle** (`angle`) | number | The angle, in the chosen **Unit**. A text with a number (`"30.5"`) is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the function. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. The angle is not a number, or the function is not defined for that angle. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`fn`) | sin, cos, tan, cot, sec, csc | sin | Which function to compute. |
| **Unit** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit the angle comes in. |

## How it works

At every angle that arrives the block computes the function and sends the result on **value**.

| Function | Equals | Not defined when |
|---|---|---|
| **sin** | sine | never |
| **cos** | cosine | never |
| **tan** | sine ÷ cosine | the cosine is 0 (90°, 270°…) |
| **cot** | cosine ÷ sine | the sine is 0 (0°, 180°…) |
| **sec** | 1 ÷ cosine | the cosine is 0 |
| **csc** | 1 ÷ sine | the sine is 0 |

- **Right angles are exact**: sin 180° gives `0` and not `1.22e-16`, cos 90° gives `0`. That is why tan 90° is an **error** and not a huge number (`1.6e16`). It holds for degrees, gradians and turns; in radians only for 0 (π cannot be written exactly).
- The result is rounded to **15 significant digits**.
- Angles with more turns are handled well (450° is 90° plus a whole turn): tan 450° is an error like tan 90°.
- The [Math functions](core.math) block does sine and cosine only in radians; this one works in the chosen unit.

## Examples

### 1. The sine of 30°

```
[Constant · Variable: 30] value ──▶ angle [Trigonometric functions: sin] value ──▶ value [Print (console.log)]
```

Writes `0.5`.

### 2. The cosine of 60°

Function **cos**, angle 60: writes `0.5`. With angle 90 it writes `0` (exact).

### 3. The tangent of 1 radian

Function **tan**, **Unit** radians, angle 1: writes `1.5574077246549`.

### 4. A quarter turn

**Unit** turns, function **sin**, angle 0.25: writes `1`.

### 5. The cotangent of 30°

Function **cot**, angle 30: writes `1.73205080756888`.

## Errors

| Message | When |
|---|---|
| angolo: serve un numero ("angle: a number is needed") | The angle is not a number (for example a text like `"abc"`). |
| tan non è definita per 90° (cos = 0) ("tan is not defined for 90°") | The function is not defined: **tan** or **sec** when the cosine is 0, **cot** or **csc** when the sine is 0 (then it ends with `(sin = 0)`). The function name and the angle change (`1.5707963267949 rad`, `100 gon`, `0.25 giri`). |

## See also

- [Inverse functions (Math.asin, Math.acos…)](trig.inverse) to go from the value back to the angle
- [Hyperbolic functions (Math.sinh, Math.cosh…)](trig.hyperbolic)
- [Convert and normalize an angle](trig.convert) to change the unit of an angle
- [Math functions](core.math) for sine and cosine in radians
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
