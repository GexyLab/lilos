# Definite integral ∫ₐᵇ f(x) dx

`int.definite` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes the integral of a function between two ends, with a numeric method of your choice. The ends can be infinite (improper integrals).

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, such as `sin(x)` or `1/(1+x^2)`. If it is not linked, the **Function** setting is used. |
| **a (from)** (`a`) | any | The left end: a number, an expression such as `pi/2`, or `-inf`. If it is not linked, the **From a** setting is used. |
| **b (to)** (`b`) | any | The right end: a number, an expression, or `inf`. If it is not linked, the **To b** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **integral** (`value`) | number | The value of the integral. |
| **error estimate** (`estimate`) | number | How wrong the result can be, according to the method. With trapezoids and rectangles it is not sent (there is no estimate). Hidden by default: show it with the eye in Properties. |
| **evaluations** (`evaluations`) | number | How many times the function was calculated. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | text | `sin(x)` | The function, if **f** is not linked. |
| **Variable** (`variable`) | text | `x` | The name of the variable in the function. |
| **From a** (`a`) | number or expression | `0` | The end a, if the input is not linked. |
| **To b** (`b`) | number or expression | `pi` | The end b, if the input is not linked. |
| **Method** (`method`) | Adaptive Gauss–Kronrod / Adaptive Simpson / Romberg / Trapezoids / Rectangles at the midpoint | Adaptive Gauss–Kronrod | How the integral is calculated (see below). |
| **Tolerance** (`tolerance`) | from 1e-15 to 0.1 | 1e-10 | The error the adaptive methods try not to exceed. |
| **Intervals** (`n`) | from 1 to 99999 | 1000 | How many intervals, for Trapezoids and Rectangles. |

## How it works

The block calculates ∫ f(x) dx from **a** to **b** with the chosen **method**:

| Method | What it does |
|---|---|
| **Adaptive Gauss–Kronrod** (`gk`) | Gauss–Kronrod with 7 and 15 points: it splits the interval where the error is largest until it is below the **Tolerance**. It is the most precise and the only one that accepts infinite ends. |
| **Adaptive Simpson** (`simpson`) | Simpson's rule, with the interval split where needed. |
| **Romberg** (`romberg`) | Trapezoids with extrapolation: very precise for smooth functions. |
| **Trapezoids** (`trapezoid`) | **n** trapezoids of equal width. No error estimate. |
| **Rectangles** (`midpoint`) | **n** rectangles, with the height taken at the midpoint. No error estimate. |

- **Infinite ends** (`inf`, `-inf`): a change of variable turns the infinite interval into a finite one; only the Gauss–Kronrod method works.
- If **a** is larger than **b**, the result changes sign. If they are equal, it is 0.
- The function must have a finite value at every point where it is calculated: `1/x` between -1 and 1 gives an error, because it has no value at 0. If the value is missing exactly at an end (for example `1/sqrt(1-x^2)` at 1), the block calculates it a hair further inside.
- It stops after **100000 evaluations** of the function.
- The result has 14 significant digits.
- With no input linked it calculates once at the start of the schema; with a linked input it calculates at every value that arrives, once all the linked values are there.

## Examples

### 1. The area of one hump of the sine

```
[Constant · Variable: pi] value ──▶ b [Definite integral: sin(x), a = 0] integral ──▶ value [Print (console.log)]
```

Writes `2`.

### 2. An improper integral: the bell curve

```
[Definite integral: e^(-x^2), a = -inf, b = inf] integral ──▶ value [Print (console.log)]
```

No input is linked: the block calculates once at the start. It writes `1.7724538509055`, that is √π.

With **evaluations** linked, it writes `465`.

### 3. Comparing the methods

`x^2` from 0 to 1 is 1/3. With 10 intervals:

- **Trapezoids**: `0.335`
- **Rectangles**: `0.3325`
- **Gauss–Kronrod**: `0.33333333333333` (with **error estimate** `1.17e-15`)

## Errors

| Message | When |
|---|---|
| a: serve un numero (o un'espressione come pi/2), non «…» ("a: a number is needed, or an expression like pi/2") | The end a is neither a number nor an expression without variables. For b the message starts with `b:`. |
| a: serve un numero ("a: a number is needed") | The end a is empty. |
| Con estremi infiniti usa il metodo Gauss-Kronrod ("With infinite ends use the Gauss-Kronrod method") | An end is `inf` or `-inf` and the method is another one. |
| La funzione non ha un valore finito in x = … ("The function has no finite value at x = …") | The function gives an infinity or "not a number" at a point (for example `1/x` at 0, or `ln(x)` with a negative x). |
| Troppe valutazioni della funzione (più di 100000) ("Too many evaluations of the function") | More than 100000 evaluations are needed. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: give it a value with the Function f(x) block; the variable is x") | The function has a name that is not the variable (for example `k` in `k*x`). |
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | The function is badly written (a missing parenthesis, a character that is not allowed, a badly written number). |
| Espressione non valida: … vuole … argomenti, ne ha … ("… wants … arguments, it has …") | A function has the wrong number of arguments. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression") | Something that is not a text arrives at the **f** input. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |
| «…» è una costante, non può essere la variabile ("… is a constant, it cannot be the variable") | The **Variable** is `pi` or `e`. |

## See also

- [Antiderivative (indefinite integral)](int.primitive) for the formula of the integral, instead of the number
- [Integral function](int.function) for F(x) with a moving upper end
- [Mean value on [a, b]](int.mean), [Area between two curves](int.area)
- [Function f(x)](fn.define) to give a name to the function and its parameters
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
