# Arc length

`int.arcLength` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes the length of the curve y = f(x) between two ends.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The curve, such as `x^2`. If it is not linked, the **Function** setting is used. |
| **a (from)** (`a`) | any | The left end: a number or an expression such as `pi/2`. If it is not linked, the **From a** setting is used. |
| **b (to)** (`b`) | any | The right end. If it is not linked, the **To b** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **length** (`length`) | number | The length of the arc, always positive. |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | text | `x^2` | The curve, if **f** is not linked. |
| **Variable** (`variable`) | text | `x` | The name of the variable in the function. |
| **From a** (`a`) | number or expression | `0` | The end a, if the input is not linked. |
| **To b** (`b`) | number or expression | `1` | The end b, if the input is not linked. |
| **Method** (`method`) | Adaptive Gauss–Kronrod / Adaptive Simpson / Romberg / Trapezoids / Rectangles at the midpoint | Adaptive Gauss–Kronrod | How the integral is calculated (see [Definite integral](int.definite)). |
| **Tolerance** (`tolerance`) | from 1e-15 to 0.1 | 1e-10 | The error the adaptive methods try not to exceed. |
| **Intervals** (`n`) | from 1 to 99999 | 1000 | How many intervals, for Trapezoids and Rectangles. |

## How it works

The length is

L = ∫ √(1 + f′(x)²) dx

The derivative f′ is calculated symbolically when possible, otherwise numerically. The result is the absolute value of the integral, so swapping a and b does not change the length.

- The ends must be **finite**.
- Where the curve is vertical (like `sqrt(1-x^2)` at x = 1) the derivative is not finite: the result is a little less precise, but the block works.
- It stops after **100000 evaluations** of the function.
- With no input linked it calculates once at the start of the schema.

## Examples

### 1. An arc of a parabola

```
[Arc length: x^2, from 0 to 1] length ──▶ value [Print (console.log)]
```

With the default settings it calculates at the start and writes `1.4789428575446`.

### 2. A straight line

`f = x`, from 0 to 1: writes `1.4142135623731` (√2, the diagonal of the square).

### 3. The catenary

`f = cosh(x)`, from 0 to 1: writes `1.1752011936438` (sinh 1).

### 4. A quarter of a circle

`f = sqrt(1-x^2)`, from 0 to 1: writes `1.5707963110674` (close to π/2 = 1.5707963267949).

## Errors

| Message | When |
|---|---|
| a: serve un numero (o un'espressione come pi/2), non «…» ("a: a number is needed, or an expression like pi/2") | An end is neither a number nor an expression without variables. |
| a: l'infinito non è ammesso qui ("a: infinity is not allowed here") | An end is `inf` or `-inf`. |
| La funzione non ha un valore finito in x = … ("The function has no finite value at x = …") | The derivative (or f) gives an infinity or "not a number" at a point. |
| Troppe valutazioni della funzione (più di 100000) ("Too many evaluations of the function") | More than 100000 evaluations are needed. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: give it a value with the Function f(x) block; the variable is x") | The function has a name that is not the variable. |
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | The function is badly written. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |

## See also

- [Derivative (symbolic)](fn.derivative) for the derivative f′ as a formula
- [Solid of revolution](int.revolution) for the surface made by turning the curve
- [Definite integral](int.definite) for the other integrals
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
