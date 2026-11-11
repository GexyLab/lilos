# Solid of revolution

`int.revolution` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes the volume and the lateral surface of the solid made by turning the region under a curve around the x axis or the y axis. With a second, inner curve the solid has a hole.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The outer curve, such as `sqrt(x)`. If it is not linked, the **Function** setting is used. |
| **a (from)** (`a`) | any | The left end: a number or an expression. If it is not linked, the **From a** setting is used. |
| **b (to)** (`b`) | any | The right end. If it is not linked, the **To b** setting is used. |
| **g (inner curve)** (`g`) | text | The inner curve, which makes the hole. If it is not linked, the **Inner curve g** setting is used. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume of the solid. |
| **lateral surface** (`surface`) | number | The lateral surface of the turned outer curve f. |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | text | `sqrt(x)` | The outer curve, if **f** is not linked. |
| **Inner curve g** (`g`) | text | `0` | The inner curve (a hole), if **g** is not linked. `0` means no hole. |
| **Variable** (`variable`) | text | `x` | The name of the variable in the two functions. |
| **From a** (`a`) | number or expression | `0` | The end a, if the input is not linked. |
| **To b** (`b`) | number or expression | `4` | The end b, if the input is not linked. |
| **Axis** (`axis`) | x axis (discs) / y axis (shells, 0 ≤ a < b) | x axis | Around which axis the region turns. |
| **Method** (`method`) | Adaptive Gauss–Kronrod / Adaptive Simpson / Romberg / Trapezoids / Rectangles at the midpoint | Adaptive Gauss–Kronrod | How the integrals are calculated (see [Definite integral](int.definite)). |
| **Tolerance** (`tolerance`) | from 1e-15 to 0.1 | 1e-10 | The error the adaptive methods try not to exceed. |
| **Intervals** (`n`) | from 1 to 99999 | 1000 | How many intervals, for Trapezoids and Rectangles. |

## How it works

**x axis (discs and washers).** Every section is a disc with a hole: the volume is

V = π ∫ |f(x)² − g(x)²| dx

with the integral split where f² − g² changes sign. The lateral surface is

S = 2π ∫ |f(x)| · √(1 + f′(x)²) dx

**y axis (shells).** Every vertical strip turns and makes a cylindrical shell: the volume is

V = 2π ∫ x · |f(x) − g(x)| dx

(split where f − g changes sign), and the surface is S = 2π ∫ x · √(1 + f′(x)²) dx. Here 0 ≤ a < b is needed.

- The **surface** is only for the outer curve **f**: the surface of the hole is not counted.
- The derivative f′ is symbolic when possible, otherwise numeric.
- **a** must be smaller than **b**; the ends must be finite.
- Each integral stops after **100000 evaluations** of the function.
- With no input linked it calculates once at the start of the schema.

## Examples

### 1. A paraboloid

```
[Solid of revolution: sqrt(x), from 0 to 4, x axis] volume ──▶ value [Print (console.log)]
```

With the default settings it calculates at the start and writes `25.1327412287183` (8π). The **lateral surface** is `36.1769031974113`.

### 2. A cone

`f = x`, from 0 to 1, x axis: **volume** `1.04719755119659` (π/3), **surface** `4.44288293815838` (π√2).

### 3. A sphere

`f = sqrt(1-x^2)`, from -1 to 1: **volume** `4.18879020478629` (4π/3), **surface** `12.5663706143592` (4π).

### 4. A solid with a hole

`f = x`, **Inner curve g** = `x^2`, from 0 to 1, x axis: **volume** `0.418879020478629` (2π/15).

### 5. Shells around the y axis

`f = x`, from 0 to 1, **Axis** = y: **volume** `2.09439510239317` (2π/3).

## Errors

| Message | When |
|---|---|
| Serve a minore di b ("a must be smaller than b") | a is equal to or larger than b. |
| Per la rotazione attorno all'asse y serve 0 ≤ a < b ("For a rotation around the y axis 0 ≤ a < b is needed") | With the y axis, a is negative. |
| a: serve un numero (o un'espressione come pi/2), non «…» ("a: a number is needed, or an expression like pi/2") | An end is neither a number nor an expression without variables. |
| a: l'infinito non è ammesso qui ("a: infinity is not allowed here") | An end is `inf` or `-inf`. |
| La funzione non ha un valore finito in x = … ("The function has no finite value at x = …") | f or g gives an infinity or "not a number" at a point. |
| Troppe valutazioni della funzione (più di 100000) ("Too many evaluations of the function") | An integral needs more than 100000 evaluations. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: give it a value with the Function f(x) block; the variable is x") | f or g has a name that is not the variable. |
| Espressione vuota ("Empty expression") | f or g is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | f or g is badly written. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |

## See also

- [Area between two curves](int.area) for the area of the region that turns
- [Arc length](int.arcLength) for the length of the curve
- [Sphere](solid.sphere) for the direct formulas of the sphere
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
