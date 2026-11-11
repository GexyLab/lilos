# Area between two curves

`int.area` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes the area of the part of the plane between two curves f and g (or between f and the x axis), in an interval. The area is always positive, even where the curves swap places.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The first curve, such as `x^2`. If it is not linked, the **Function** setting is used. |
| **g (second curve)** (`g`) | text | The second curve. If it is not linked, the **Second curve g** setting is used. |
| **a (from)** (`a`) | any | The left end: a number or an expression such as `-pi`. If it is not linked, the **From a** setting is used. |
| **b (to)** (`b`) | any | The right end. If it is not linked, the **To b** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **area** (`area`) | number | The area between the two curves, always positive or zero. |
| **∫ (f − g)** (`signed`) | number | The integral with its sign: where f is above g it counts more, where it is below it counts less. Hidden by default: show it with the eye in Properties. |
| **crossing points x** (`crossings`) | list | The x values, inside the interval, where f and g cross, in order. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | text | `x` | The first curve f, if **f** is not linked. |
| **Second curve g** (`g`) | text | `0` | The second curve, if **g** is not linked. `0` means the x axis. |
| **Variable** (`variable`) | text | `x` | The name of the variable in the two functions. |
| **From a** (`a`) | number or expression | `-1` | The end a, if the input is not linked. |
| **To b** (`b`) | number or expression | `1` | The end b, if the input is not linked. |
| **Method** (`method`) | Adaptive Gauss–Kronrod / Adaptive Simpson / Romberg / Trapezoids / Rectangles at the midpoint | Adaptive Gauss–Kronrod | How the integral is calculated (see [Definite integral](int.definite)). |
| **Tolerance** (`tolerance`) | from 1e-15 to 0.1 | 1e-10 | The error the adaptive methods try not to exceed. |
| **Intervals** (`n`) | from 1 to 99999 | 1000 | How many intervals, for Trapezoids and Rectangles. |

## How it works

The area is ∫ |f(x) − g(x)| dx between a and b. To remove the absolute value the block:

1. looks at f − g at 1000 points of the interval and finds where it changes sign;
2. refines each point with Brent's method (these are the **crossing points**);
3. integrates f − g in each piece, takes the absolute value of each piece and adds them up.

With **g** = `0` it is the area between the curve and the x axis, with the parts below the axis counted as positive.

- If **a** is larger than **b** the two ends are swapped: the area is the same, and **∫ (f − g)** changes sign.
- The curves must cross at points where they change sign: if they only touch (like `x^2` and `0` at 0) the point does not appear among the crossing points, but the area is right.
- The ends must be **finite**.
- Each piece stops after **100000 evaluations** of the function.
- With no input linked it calculates once at the start of the schema.

## Examples

### 1. The area between a parabola and a line

```
[Area between two curves: f = x^2, g = x, from 0 to 1] area ──▶ value [Print (console.log)]
```

No input is linked: it calculates at the start. It writes `0.16666666666667` (1/6). **∫ (f − g)** is `-0.16666666666667`, because here x² is below x.

### 2. A function that crosses the axis

`sin(x)` with g = `0`, from 0 to 2π (write `2*pi` in **To b**):

- **area**: `4` (two humps of 2)
- **∫ (f − g)**: `0` (the two humps cancel)
- **crossing points x**: `[3.14159265358979]`

### 3. An odd curve

`x^3` against `x` from -1 to 1: **area** `0.5`, **∫ (f − g)** `0`, **crossing points** `[0]`.

With the default settings (f = `x`, g = `0`, from -1 to 1) the area is `1`.

## Errors

| Message | When |
|---|---|
| a: serve un numero (o un'espressione come pi/2), non «…» ("a: a number is needed, or an expression like pi/2") | An end is neither a number nor an expression without variables. |
| a: l'infinito non è ammesso qui ("a: infinity is not allowed here") | An end is `inf` or `-inf`. |
| La funzione non ha un valore finito in x = … ("The function has no finite value at x = …") | f or g gives an infinity or "not a number" at a point. |
| Troppe valutazioni della funzione (più di 100000) ("Too many evaluations of the function") | A piece needs more than 100000 evaluations. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: give it a value with the Function f(x) block; the variable is x") | f or g has a name that is not the variable. |
| Espressione vuota ("Empty expression") | f or g is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | f or g is badly written. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression") | Something that is not a text arrives at an **f** or **g** input. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |

## See also

- [Definite integral](int.definite) for the area with its sign
- [Solid of revolution](int.revolution) for the volume made by turning the same region
- [Arc length](int.arcLength) for the length of a curve
- [Function f(x)](fn.define) to give a name to the functions
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
