# Solve a triangle (laws of sines and cosines)

`trig.triangle` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Given 3 values of any triangle (at least one side) finds all the others: sides, angles, area, perimeter, heights and radii. In the ambiguous case it finds both solutions.

## Inputs

| Port | Type | Description |
|---|---|---|
| **side a** (`a`) | number | The side a, opposite the angle α. |
| **side b** (`b`) | number | The side b, opposite the angle β. |
| **side c** (`c`) | number | The side c, opposite the angle γ. |
| **α (opposite a)** (`alpha`) | number | The angle α, in the chosen **Unit**: more than 0 and less than half a turn. |
| **β (opposite b)** (`beta`) | number | The angle β, like α. |
| **γ (opposite c)** (`gamma`) | number | The angle γ, like α. |

**Exactly three** values are needed, with at least one side. An input with no value (or an empty one) does not count. With fewer than three the block waits; with more than three it gives an error.

## Outputs

| Port | Type | Description |
|---|---|---|
| **a** (`a`) | number | The side a. |
| **b** (`b`) | number | The side b. |
| **c** (`c`) | number | The side c. |
| **α** (`alpha`) | number | The angle α, in the chosen **Unit**. |
| **β** (`beta`) | number | The angle β, in the chosen **Unit**. |
| **γ** (`gamma`) | number | The angle γ, in the chosen **Unit**. |
| **area** (`area`) | number | The area. |
| **perimeter** (`perimeter`) | number | The perimeter. |
| **height on a** (`ha`) | number | Hidden by default: show it with the eye in Properties. The height on the side a. |
| **height on b** (`hb`) | number | Hidden by default: show it with the eye in Properties. The height on the side b. |
| **height on c** (`hc`) | number | Hidden by default: show it with the eye in Properties. The height on the side c. |
| **inradius** (`inradius`) | number | Hidden by default: show it with the eye in Properties. The radius of the circle inside the triangle. |
| **circumradius** (`circumradius`) | number | Hidden by default: show it with the eye in Properties. The radius of the circle around the triangle. |
| **solutions** (`solutions`) | number | Hidden by default: show it with the eye in Properties. How many solutions the triangle has: 1 or 2. |
| **second solution** (`second`) | object | Hidden by default: show it with the eye in Properties. In the ambiguous case, the second solution: an object with the same names as the outputs (`a`, `b`, `c`, `alpha`, `beta`, `gamma`, `area`, `perimeter`, `ha`, `hb`, `hc`, `inradius`, `circumradius`). In the other cases there is none. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. The values are not enough or do not make a triangle. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Unit** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit of the angles, in and out. |

## How it works

The side a is opposite the angle α, the side b β, the side c γ, and α + β + γ = 180°. The block recognizes the case from the three values that arrive:

| Given | Case | How it is solved |
|---|---|---|
| 3 sides | SSS | Law of cosines: `cos α = (b² + c² − a²) ÷ (2·b·c)`, and the same for β; γ = 180° − α − β. Each side must be less than the sum of the other two. |
| 2 angles and 1 side | ASA or AAS | The third angle is 180° minus the two; law of sines: `a ÷ sin α = b ÷ sin β = c ÷ sin γ` gives the other sides. |
| 2 sides and the angle **between** them | SAS | Law of cosines: the third side is `√(p² + q² − 2·p·q·cos(angle))`; then as in the 3 sides case. |
| 2 sides and an angle **not between** them | SSA (ambiguous case) | Law of sines: the angle opposite the other side has `sin = side × sin(angle) ÷ opposite side`. It can give 0, 1 or 2 triangles. |

The ambiguous case (two sides and an angle opposite one of them):

- if that sine is **greater than 1** the triangle does not exist: the side opposite the angle is too short (error);
- if it is **equal to 1** there is a single solution, a right angle;
- otherwise there are two possible angles, one acute and one obtuse (its supplement, 180° minus the acute one). Each angle is valid only if its sum with the given angle stays under 180°. If both are valid, the block gives two triangles: the **first solution** comes out on the normal outputs, with the acute angle; the **second solution** comes out on the hidden port **second solution**, and **solutions** is 2. If only one is valid (usually when the side opposite the given angle is the longest), **solutions** is 1.

Then it computes the area `½·b·c·sin α`, the perimeter, the heights `2 × area ÷ side`, the inradius `area ÷ semiperimeter` and the circumradius `a ÷ (2·sin α)`.

- The results are rounded to **15 significant digits**.
- With **three angles** the triangle is not determined (triangles of any size are possible): at least one side is needed.
- For a triangle with a right angle, [Right triangle](trig.rightTriangle) is simpler.

## Examples

### 1. Three sides

```
[Constant · Variable: 3] value ──▶ side a [Solve a triangle: °] gamma ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ side b
[Constant · Variable: 5] value ──▶ side c
```

Writes `90`. The other outputs: α `36.869897645844`, β `53.130102354156`, area `6`, perimeter `12`, heights `4`, `3` and `2.4`, inradius `1`, circumradius `2.5`, solutions `1`.

### 2. Two angles and a side

α = 40°, β = 60°, c = 10: γ `80`, a `6.52703644666139`, b `8.79385241571817`, area `28.2628968711784`, perimeter `25.3208888623796`.

### 3. Two sides and the angle between them

a = 5, b = 7, γ = 60°: c `6.2449979983984`, α `43.897886248014`, β `76.102113751986`, area `15.1554445662277`.

### 4. The ambiguous case: two solutions

a = 7, b = 10, α = 30°. First solution: β `45.584691402807`, γ `104.415308597193`, c `13.5592335234107`, area `33.8980838085268`, **solutions** `2`. Second solution (hidden port **second solution**): `beta` `134.415308597193`, `gamma` `15.584691402807`, `c` `3.76127455227803`, `area` `9.40318638069507`.

### 5. The ambiguous case: one solution, or none

a = 12, b = 10, α = 30°: a single solution, β `24.6243183521641`, γ `125.375681647836`, c `19.5689661524801`, **solutions** `1`. With a = 4, b = 10, α = 30°: error `Con questi valori il triangolo non esiste: il lato opposto all'angolo è troppo corto`.

### 6. In gradians

**Unit** gradians, a = 3, b = 4, γ = 100 (a right angle): c `5`, α `40.9665529398267`, β `59.0334470601733`.

## Errors

| Message | When |
|---|---|
| a: serve un numero ("a: a number is needed") | A value is not a number. In place of `a` is the port name (`b`, `c`, `α`, `β`, `γ`). |
| Il lato a deve essere maggiore di 0 ("The side a must be greater than 0") | A side is 0 or negative (`a`, `b` or `c`). |
| L'angolo α deve essere tra 0 e 180° esclusi ("The angle α must be between 0 and 180°, excluded") | An angle is 0, negative or half a turn or more (`α`, `β` or `γ`). The limit is written in the chosen unit: `3.14159265358979 rad`, `200 gon`, `0.5 giri`. |
| Servono esattamente 3 valori (almeno un lato): ne sono arrivati 4 ("Exactly 3 values are needed (at least one side): 4 arrived") | More than three values arrived (the number changes). |
| Con tre angoli il triangolo non è determinato: serve almeno un lato ("With three angles the triangle is not determined: at least one side is needed") | Three angles and no side arrived. |
| Con questi lati il triangolo non esiste: ogni lato deve essere minore della somma degli altri due ("With these sides the triangle does not exist: each side must be less than the sum of the other two") | Three sides where one is as long as the other two together, or more. |
| La somma degli angoli supera 180° ("The sum of the angles exceeds 180°") | With two angles: the sum is 180° or more. |
| Con questi valori il triangolo non esiste: il lato opposto all'angolo è troppo corto ("With these values the triangle does not exist: the side opposite the angle is too short") | Two sides and an angle (ambiguous case): the side opposite the given angle is too short to reach the other. |
| Con questi valori il triangolo non esiste ("With these values the triangle does not exist") | Two sides and an angle: neither of the two possibilities gives a triangle. |

## See also

- [Right triangle](trig.rightTriangle) for a triangle with a right angle
- [Trigonometric functions (Math.sin, Math.cos…)](trig.fn)
- [Inverse functions (Math.asin, Math.acos…)](trig.inverse)
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
