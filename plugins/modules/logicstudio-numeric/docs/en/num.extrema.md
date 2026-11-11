# Maxima · Minima · Inflections

`num.extrema` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Finds in an interval the **maxima**, the **minima** and the **inflections** of a function, and its highest and lowest point.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as text (for example `x^2 + sin(x)`). If it is not linked, the **Function** setting is used. |
| **from** (`a`) | number | The start of the interval. If it is not linked, the **From** setting is used. |
| **to** (`b`) | number | The end of the interval. If it is not linked, the **To** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **local maxima {x, y}** (`maxima`) | list | The relative maxima, a list of `{x, y}` points. |
| **local minima {x, y}** (`minima`) | list | The relative minima, a list of `{x, y}` points. |
| **inflection points {x, y}** (`inflections`) | list | The inflections, a list of `{x, y}` points. |
| **highest point {x, y}** (`maximum`) | object | The highest point of the interval, **ends included** (it can be an end): `{x, y}`. Hidden by default: show it with the eye in Properties. |
| **lowest point {x, y}** (`minimum`) | object | The lowest point of the interval, ends included: `{x, y}`. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text | `x^3 - 3x` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable (letters, digits and `_`; it cannot be `pi` or `e`). |
| **From (when a is not linked)** (`a`) | a text | `-3` | The start of the interval, when **a** is not linked: a number or an expression like `-pi`. |
| **To (when b is not linked)** (`b`) | a text | `3` | The end of the interval, when **b** is not linked. |
| **Sub-intervals to scan** (`n`) | number (from 10 to 100000) | `600` | In how many sub-intervals to divide the interval to look for the changes of sign of the derivatives (from 10 to 100000). |

## How it works

The function comes from the **f** input (a text like `x^2 + 1`) or, if **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How a function is written is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions». Angles are in radians. The variable is **x**, or the name chosen in **Variable**; any other name in the function is a parameter and needs a value (given with the block [Function f(x)](fn.define)).

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

- The zeros of the first derivative are looked for: where it goes from positive to negative there is a **maximum**, from negative to positive a **minimum**. Where the second derivative changes sign there is an **inflection**. The derivatives are symbolic; if the function cannot be differentiated (`abs`, `min`…) they are numeric.
- A point where the derivative touches 0 without changing sign (`x^3` at 0) is neither a maximum nor a minimum, but it is an inflection.
- The ends of the interval are never relative maxima or minima; they can be the **highest** or **lowest point**.
- Maxima very close together (less than a sub-interval) can be missed: increase the sub-intervals.
- For the complete study, with the zeros and where the function grows, there is [Study of a function](fn.study).

## Examples

### 1. A polynomial

Function `x^3 - 3x`, from −3 to 3 (the default values):

```
[Maxima · Minima · Inflections: x^3 - 3x, -3 → 3] maxima ──▶ value [Print (console.log)]
```

Writes `[{"x":-1,"y":2}]`; the minima are `[{"x":1,"y":-2}]` and the inflection `{"x":0,"y":0}`. The highest point is the end `{"x":3,"y":18}`.

### 2. A bell

The peak of `exp(-x^2)` between −4 and 4:

```
[Maxima · Minima · Inflections: exp(-x^2), -4 → 4] maxima ──▶ value [Print (console.log)]
```

Writes `[{"x":0,"y":1}]`.

### 3. A sine

Function `sin(x)`, from `0` to `2pi`:

```
[Maxima · Minima · Inflections: sin(x), 0 → 2pi] maxima ──▶ value [Print (console.log)]
```

The maximum is at x = 1.570796327 (π/2) and the minimum at x = 4.71238898 (3π/2).

## Errors

| Message | When |
|---|---|
| Espressione vuota ("The expression is empty") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the reader stopped and «…» says why (see [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression, like «x^2 + 1»") | Something that is neither a text nor a number arrives on **f** (a list, an object). |
| Nome di variabile non valido: «…» ("Invalid variable name: «…»") | The name in **Variable** is not good (it must start with a letter or `_`; it cannot be the name of a function). |
| «…» è una costante, non può essere la variabile ("«…» is a constant, it cannot be the variable") | **Variable** is `pi` or `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: … (give it a value with the block Function f(x); the variable is x)") | The function contains a name that is not the variable and has no value. With more names the message says «Parametri senza valore». |
| da: serve un numero ("from: a number is needed") | The value **from** is empty or not a number. |
| da: serve un numero (o un'espressione come pi/2), non «…» ("from: a number is needed (or an expression like pi/2), not «…»") | The value **from** is a text that is neither a number nor an expression of numbers (for example `abc`). |
| da: l'infinito non è ammesso qui ("from: infinity is not allowed here") | The value **from** is `inf` or `∞`. |
| L'intervallo deve avere «da» minore di «a» ("The interval must have «da» smaller than «a»") | The start end is not smaller than the end end. |
| Sottointervalli: da 10 a 100000 ("Sub-intervals: from 10 to 100000") | The **Sub-intervals to scan** setting is not an integer between 10 and 100000. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo ("Calculation too long (more than 8 seconds): use fewer points or a shorter interval") | The calculation takes more than 8 seconds: the block stops so that it does not hold the program. |

## See also

- [Study of a function](fn.study) for the complete study: zeros, maxima, minima, inflections and where it grows
- [Solve f(x) = 0](fn.solve) to find a zero
- [Derivative (symbolic)](fn.derivative) for the derivative as a formula
- [Sample f](num.sample) to draw the function with its points
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
