# Double and triple integral

`int.multiple` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes a double integral ∬ f(x, y) dy dx or a triple integral ∭ f(x, y, z) dz dy dx. The inner ends can depend on the outer variables, so you can integrate over curved regions.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, such as `x*y` or `x*y*z`. If it is not linked, the **Function** setting is used. |
| **x from** (`x1`) | any | The left end of x: a number or an expression such as `pi/2`. If it is not linked, the **x from** setting is used. |
| **x to** (`x2`) | any | The right end of x. |
| **y from (number or in x)** (`y1`) | any | The lower end of y: a number, or an expression that uses only `x` (for example `-sqrt(1-x^2)`). |
| **y to (number or in x)** (`y2`) | any | The upper end of y. |
| **z from (in x, y)** (`z1`) | any | The lower end of z (triple only): a number, or an expression in `x` and `y`. Hidden by default: show it with the eye in Properties. |
| **z to (in x, y)** (`z2`) | any | The upper end of z (triple only). Hidden by default: show it with the eye in Properties. |

For every end that is not linked, the setting with the same name is used.

## Outputs

| Port | Type | Description |
|---|---|---|
| **integral** (`value`) | number | The value of the integral. |
| **evaluations** (`evaluations`) | number | How many times the function was calculated. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function f(x, y) or f(x, y, z)** (`expr`) | text | `x*y` | The function, if **f** is not linked. The variables are always `x`, `y` (and `z`). |
| **Integral** (`dims`) | Double ∬ dy dx / Triple ∭ dz dy dx | Double | How many variables. |
| **x from** (`x1`) | number or expression | `0` | The lower end of x. |
| **x to** (`x2`) | number or expression | `1` | The upper end of x. |
| **y from** (`y1`) | number or expression in x | `0` | The lower end of y. |
| **y to** (`y2`) | number or expression in x | `1` | The upper end of y. |
| **z from** (`z1`) | number or expression in x, y | `0` | The lower end of z. Only counts in the triple integral. |
| **z to** (`z2`) | number or expression in x, y | `1` | The upper end of z. Only counts in the triple integral. |
| **Tolerance** (`tolerance`) | from 1e-12 to 0.1 | 1e-8 | The error the calculation tries not to exceed. |

## How it works

The block does the integrals one inside the other, from the inside: for each x it calculates the integral in y (in the triple, for each x and y first the integral in z), then the integral in x of the result. Every integral is an adaptive Gauss–Kronrod; the tolerance is tighter for the inner ones.

- The ends of **x** are numbers or expressions without variables (`pi`, `2*pi`).
- The ends of **y** are numbers or expressions that use only `x`: `0`, `x`, `1-x`, `sqrt(1-x^2)`.
- The ends of **z** are numbers or expressions in `x` and `y`.
- The ends must have a finite value: `inf` is not allowed.
- The number of evaluations grows fast (a double integral makes hundreds or thousands). The block stops after **2000000 evaluations** of the function.
- Precision is very good for smooth functions; with ends that have a square root (like a circle) it is lower (about 8-9 digits).
- With no input linked it calculates once at the start of the schema.

## Examples

### 1. The default rectangle

```
[Double and triple integral: x*y, x from 0 to 1, y from 0 to 1] integral ──▶ value [Print (console.log)]
```

No input is linked: it calculates at the start. It writes `0.25`; with **evaluations** linked, `225`.

### 2. A triangle

`f = x+y`, x from 0 to 1, **y from** = `0`, **y to** = `x`: writes `0.5`.

### 3. The area of a circle

`f = 1`, x from -1 to 1, **y from** = `-sqrt(1-x^2)`, **y to** = `sqrt(1-x^2)`: writes `3.1415926551622` (π, with about 9 right digits).

### 4. A triple integral

**Integral** = triple, `f = x*y*z`, all ends from 0 to 1: writes `0.125`.

The volume of a tetrahedron: `f = 1`, x from 0 to 1, y from 0 to `1-x`, z from 0 to `1-x-y`: writes `0.16666666666667` (1/6).

## Errors

| Message | When |
|---|---|
| y da: può usare solo x, non … ("y from: it can use only x, not …") | An end of y uses a variable other than x (for z: other than x and y). The name of the end (`y da`, `y a`, `z da`, `z a`) starts the message. |
| y da: serve un numero o un'espressione ("y from: a number or an expression is needed") | An end of y or z is empty. |
| y da non ha un valore finito ("y from has no finite value") | The expression of an end has no finite value for some x (for example `sqrt(1-x^2)` outside [-1, 1] gives `NaN`). |
| y da: serve un numero finito ("y from: a finite number is needed") | An end of y or z arrives as a number and is infinite or `NaN`. |
| x da: serve un numero (o un'espressione come pi/2), non «…» ("x from: a number is needed, or an expression like pi/2") | An end of x is neither a number nor an expression without variables. |
| x a: l'infinito non è ammesso qui ("x to: infinity is not allowed here") | An end (of x, y or z) is `inf` or `-inf`: in place of `x a` is the name of the end. |
| La funzione non ha un valore finito in x = … ("The function has no finite value at x = …") | The function gives an infinity or "not a number" at a point. |
| Troppe valutazioni della funzione (più di 2000000) ("Too many evaluations of the function") | More than 2000000 evaluations are needed. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); le variabili sono x, y) ("Parameter without a value: give it a value with the Function f(x) block; the variables are x, y") | The function has a name that is not x, y (or z). |
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | The function or an end is badly written. |

## See also

- [Definite integral](int.definite) for the integral in one variable
- [Area between two curves](int.area) for the area between two curves y = f(x)
- [Function f(x)](fn.define) to give a name to the functions
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
