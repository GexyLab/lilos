# Integral function F(x) = ∫ₐˣ f(t) dt

`int.function` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes the integral of a function from a fixed end **a** up to an end **x** that comes from the program. It also works for a list of x values: so you can draw the curve of F(x).

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, such as `e^(-t^2)`. If it is not linked, the **Function** setting is used. |
| **a (from)** (`a`) | any | The fixed left end: a number, an expression such as `pi/2`, or `-inf`. If it is not linked, the **From a** setting is used. |
| **x (number or list)** (`x`) | any | The moving end: a number, an expression, `inf`, or a **list** of values. Every value that arrives here makes the block calculate. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **F(x)** (`value`) | any | The value of the integral: a number, or a list of numbers (one for each x of the list, in the same order). |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | text | `e^(-t^2)` | The function, if **f** is not linked. |
| **Variable** (`variable`) | text | `t` | The name of the variable in the function. |
| **From a** (`a`) | number or expression | `0` | The end a, if the input is not linked. |
| **Method** (`method`) | Adaptive Gauss–Kronrod / Adaptive Simpson / Romberg / Trapezoids / Rectangles at the midpoint | Adaptive Gauss–Kronrod | How the integral is calculated (see [Definite integral](int.definite)). |
| **Tolerance** (`tolerance`) | from 1e-15 to 0.1 | 1e-10 | The error the adaptive methods try not to exceed. |
| **Intervals** (`n`) | from 1 to 99999 | 1000 | How many intervals, for Trapezoids and Rectangles. |

## How it works

At every **x** that arrives the block calculates ∫ f(t) dt from **a** to **x** with the chosen method, and sends the result on **F(x)**. If f or a are linked and nothing has arrived yet, the block waits.

- If **x** is a **list**, it calculates one integral for each element and sends a list of results. At most **1000 x values** at a time.
- If **x** is smaller than **a**, the result is negative; if it is equal, it is 0.
- **a** and **x** can be `inf` and `-inf` (with the Gauss–Kronrod method).
- Each integral stops after **100000 evaluations** of the function (the limit is for each x).
- The variable is `t` by default, so it is not mixed up with the x of the end.

## Examples

### 1. The curve of F(x)

```
[Constant · Variable: [0, 0.5, 1, 2]] value ──▶ x [Integral function: e^(-t^2), a = 0] F(x) ──▶ value [Print (console.log)]
```

Writes `[0,0.46128100641279,0.74682413281242,0.88208139076242]`. The block works like the error function (not normalized): for a very large x it gets close to √π/2.

### 2. A single number

With x = 1 and the default settings it writes `0.74682413281242`.

With x = `inf` it writes `0.88622692545276` (√π/2).

### 3. A logarithm as an integral

Function `1/t`, **From a** = 1, x = 2: it writes `0.69314718055994`, that is ln 2.

## Errors

| Message | When |
|---|---|
| x: serve un numero (o un'espressione come pi/2), non «…» ("x: a number is needed, or an expression like pi/2") | An x is neither a number nor an expression without variables. |
| x: serve un numero ("x: a number is needed") | An x is empty. |
| Al massimo 1000 valori di x ("At most 1000 x values") | The list of x has more than 1000 elements. |
| La lista delle x ha più di 10000 elementi ("The list of x has more than 10000 elements") | The list is huge (over 10000 elements). |
| a: serve un numero (o un'espressione come pi/2), non «…» ("a: a number is needed, or an expression like pi/2") | The end a is not valid. |
| Con estremi infiniti usa il metodo Gauss-Kronrod ("With infinite ends use the Gauss-Kronrod method") | An end is infinite and the method is another one. |
| La funzione non ha un valore finito in x = … ("The function has no finite value at x = …") | The function gives an infinity or "not a number" at a point. |
| Troppe valutazioni della funzione (più di 100000) ("Too many evaluations of the function") | An integral needs more than 100000 evaluations. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è t) ("Parameter without a value: give it a value with the Function f(x) block; the variable is t") | The function has a name that is not the variable. |
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | The function is badly written. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |

## See also

- [Definite integral](int.definite) for an integral between two fixed ends
- [Antiderivative (indefinite integral)](int.primitive) for the formula of F
- [Table of values](fn.table) to get a list of x to send here
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
