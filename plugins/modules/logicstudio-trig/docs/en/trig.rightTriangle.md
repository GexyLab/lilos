# Right triangle

`trig.rightTriangle` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Given any two values of a right triangle (two sides, or a side and an angle), finds the sides, the angles, the area and the perimeter.

## Inputs

| Port | Type | Description |
|---|---|---|
| **leg a** (`a`) | number | The leg opposite the angle α. |
| **leg b** (`b`) | number | The leg opposite the angle β. |
| **hypotenuse c** (`c`) | number | The hypotenuse, the side opposite the right angle. |
| **α (opposite a)** (`alpha`) | number | The angle α, in the chosen **Unit**: more than 0 and less than a right angle. |
| **β (opposite b)** (`beta`) | number | The angle β, like α. |

**Exactly two** values are needed: an input with no value (or an empty one) does not count. With fewer than two the block waits; with more than two it gives an error.

## Outputs

| Port | Type | Description |
|---|---|---|
| **a** (`a`) | number | The leg a. |
| **b** (`b`) | number | The leg b. |
| **c** (`c`) | number | The hypotenuse. |
| **α** (`alpha`) | number | The angle α, in the chosen **Unit**. |
| **β** (`beta`) | number | The angle β, in the chosen **Unit**. |
| **area** (`area`) | number | The area. |
| **perimeter** (`perimeter`) | number | The perimeter. |
| **height on c** (`height`) | number | Hidden by default: show it with the eye in Properties. The height on the hypotenuse. |
| **inradius** (`inradius`) | number | Hidden by default: show it with the eye in Properties. The radius of the circle inside the triangle. |
| **circumradius** (`circumradius`) | number | Hidden by default: show it with the eye in Properties. The radius of the circle around the triangle. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. The values are not enough or do not make a triangle. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Unit** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit of the angles, in and out. |

## How it works

The triangle has its right angle between the legs **a** and **b**; **c** is the hypotenuse, α is opposite a and β is opposite b, and α + β = a right angle (90°). When two values arrive the block finds the others:

| Given | How the rest is found |
|---|---|
| a and b | c = √(a² + b²) |
| a leg and c | the other leg = √(c² − leg²); c must be longer than the leg |
| a side and α (or β) | with the trigonometric functions: for example, with c and α, a = c·sin α and b = c·cos α; with a and α, c = a ÷ sin α and b = a ÷ tan α; with b and α, a = b·tan α and c = b ÷ cos α |
| one angle and the other | not enough: at least one side is needed |

Then it computes the angles (β = right angle − α), the area `a·b ÷ 2`, the perimeter `a + b + c`, the height on the hypotenuse `a·b ÷ c`, the inradius `(a + b − c) ÷ 2` and the circumradius `c ÷ 2`.

- The angles are in the chosen **Unit**, both when you give them and when they come out; the right angle is 90°, π ÷ 2 rad, 100 gon or 0.25 turns.
- The results are rounded to **15 significant digits**.
- For a triangle without a right angle use [Solve a triangle (laws of sines and cosines)](trig.triangle).

## Examples

### 1. The 3-4-5 triangle

```
[Constant · Variable: 3] value ──▶ leg a [Right triangle: °] c ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ leg b
```

With a = 3 and b = 4 the outputs are c `5`, α `36.869897645844`, β `53.130102354156`, area `6`, perimeter `12`, height on c `2.4`, inradius `1`, circumradius `2.5`. With a = 3 and c = 5 the same values come out (b = `4`).

### 2. A hypotenuse and an angle

c = 10 and α = 30°: a `5`, b `8.66025403784439`, β `60`, area `21.650635094611`, perimeter `23.6602540378444`.

### 3. A leg and the other angle

b = 5 and β = 40°: α `50`, a `5.95876796297105`, c `7.77861913430206`.

### 4. Angles in gradians

**Unit** gradians, a = 6 and α = 50 (that is 45°): b `6`, c `8.48528137423857`, β `50`, area `18`.

### 5. Too many values

a = 1, b = 2 and c = 3: error `Servono esattamente 2 valori: ne sono arrivati 3`. With a = 5 and c = 5: error `L'ipotenusa deve essere più lunga del cateto`.

## Errors

| Message | When |
|---|---|
| a: serve un numero ("a: a number is needed") | A value is not a number. In place of `a` is the port name (`b`, `c`, `α`, `β`). |
| Servono esattamente 2 valori: ne sono arrivati 3 ("Exactly 2 values are needed: 3 arrived") | More than two values arrived (here 3: the number changes). |
| Il lato a deve essere maggiore di 0 ("The side a must be greater than 0") | A side is 0 or negative (`a`, `b` or `c`). |
| L'angolo α deve essere tra 0 e 90° esclusi ("The angle α must be between 0 and 90°, excluded") | An angle is 0, negative or not less than a right angle (`α` or `β`). In other units the limit changes: `1.5707963267949 rad`, `100 gon`, `0.25 giri`. |
| Con due angoli il triangolo non è determinato: serve almeno un lato ("With two angles the triangle is not determined: at least one side is needed") | Only α and β arrived. |
| L'ipotenusa deve essere più lunga del cateto ("The hypotenuse must be longer than the leg") | With a leg and c, the leg is as long as c or longer. |

## See also

- [Solve a triangle (laws of sines and cosines)](trig.triangle) for any triangle
- [Trigonometric functions (Math.sin, Math.cos…)](trig.fn)
- [Cartesian → polar](trig.toPolar)
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
