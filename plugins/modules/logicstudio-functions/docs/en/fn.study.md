# Study of a function

`fn.study` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Studies a function in an interval: zeros, local maxima and minima, inflection points, where it increases and where it decreases, absolute maximum and minimum.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |
| **from** (`a`) | number | The start of the interval. A number or a text like `pi/2`. When it is not linked the **From** setting is used. |
| **to** (`b`) | number | The end of the interval. Like **from**; it must be bigger. When it is not linked the **To** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **zeros** (`zeros`) | list | The x where f is 0, in increasing order. |
| **local maxima {x, y}** (`maxima`) | list | The local maxima: a list of `{x, y}`. |
| **local minima {x, y}** (`minima`) | list | The local minima: a list of `{x, y}`. |
| **inflection points {x, y}** (`inflections`) | list | The inflection points: a list of `{x, y}`. |
| **increasing on [from, to]** (`increasing`) | list | The intervals where f increases: a list of [from, to] pairs. Hidden by default: show it with the eye in the Properties. |
| **decreasing on [from, to]** (`decreasing`) | list | The intervals where f decreases: a list of [from, to] pairs. Hidden by default: show it with the eye in the Properties. |
| **absolute maximum {x, y}** (`max`) | object | The highest point found: an `{x, y}` object. Hidden by default: show it with the eye in the Properties. |
| **absolute minimum {x, y}** (`min`) | object | The lowest point found: an `{x, y}` object. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `x^3 - 3x` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable. |
| **From (when the input is not linked)** (`a`) | a number or an expression of numbers | `-3` | The start of the interval, when **from** is not linked. `-pi` is fine too. |
| **To (when the input is not linked)** (`b`) | a number or an expression of numbers | `3` | The end of the interval, when **to** is not linked. |
| **Samples** (`samples`) | number (from 10 to 10000) | 1000 | How many small intervals to use to look for sign changes (samples + 1 points are tried). |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`). Any other name is a parameter and needs a value (see [Function f(x)](fn.define)).

The block divides the interval [from, to] into **Samples** equal parts and computes, at all the points, f, its first derivative f' and its second derivative f'' (symbolic; numeric for functions that have none). Then it looks for:

- **the zeros**: where f changes sign between two samples (or is exactly 0 at a sample). Each sign change is refined with Brent's method. **Poles** (like `1/x` at 0, where f jumps from −∞ to +∞) are discarded: if f is not small at the point found, it is not a zero.
- **the critical points**: where f' changes sign. If f' goes from + to − it is a **local maximum**; from − to + a **local minimum**.
- **the inflection points**: where f'' changes sign.
- **increasing and decreasing**: the interval is split at the critical points, and in each piece the sign of f' at the middle decides; neighbouring pieces of the same kind are joined.
- **absolute maximum and minimum**: among the samples, the critical points and the ends of the interval.

The results are rounded to 15 significant digits. If nothing is linked to **f**, **from** and **to**, the block runs **once when the schema starts** with the settings (by default `x^3 - 3x` in [−3, 3]).

**The limits.** A sign change narrower than a step (two very close zeros) may be missed: increase the **Samples** (up to 10000). A zero where the function touches the axis without crossing it (like `x^2` at 0) is found only if it falls exactly on a sample. A zero right at the end of the interval is found even if rounding leaves it at 10⁻¹⁶ (for `sin(x)` in [0, 2pi] the zeros are 0, π and 2π); an inflection point right at the end is not. Near a pole the **absolute maximum** and **minimum** can be huge values taken at the samples closest to the pole (for `1/x` in [−2, 2] they are 250 and −250). At a corner point like `abs(x)` at 0 the minimum is there, but there is no inflection and no tangent: read the results with care.

## Examples

### 1. A cubic

Nothing linked, default values (`x^3 - 3x` in [−3, 3]), 1000 samples:

```
[Study of a function] zeros ──▶ value [Print (console.log)]
```

At the start it writes `[-1.73205080756888,0,1.73205080756888]`. The other outputs: **local maxima** `[{"x":-1,"y":2}]`, **local minima** `[{"x":1,"y":-2}]`, **inflection points** `[{"x":0,"y":0}]`, **increasing** `[[-3,-1],[1,3]]`, **decreasing** `[[-1,1]]`, **absolute maximum** `{"x":3,"y":18}`, **absolute minimum** `{"x":-3,"y":-18}`.

### 2. A parabola, with the ends linked

Function `x^2 - 4`, **from** = −5 and **to** = 5: **zeros** `[-2,2]`, **local minima** `[{"x":0,"y":-4}]`, **decreasing** `[[-5,0]]`, **increasing** `[[0,5]]`, no local maximum and no inflection.

### 3. A bell

`e^(-x^2)` in [−3, 3]: no zeros, **local maxima** `[{"x":0,"y":1}]`, **inflection points** at the two points `{"x":-0.707106781186548,"y":0.606530659712633}` and `{"x":0.707106781186548,"y":0.606530659712633}`, **increasing** `[[-3,0]]`, **decreasing** `[[0,3]]`.

### 4. A zero at the end

`sin(x)` in [0, 2pi]: **zeros** `[0,3.14159265358979,6.28318530717959]`, local maximum (π/2 ; 1), local minimum (3π/2 ; −1).

### 5. When it does not work

**from** = 2 and **to** = 1: "L'intervallo deve avere «da» minore di «a»" (the interval must have «da» smaller than «a»). **Samples** = 5: "Campioni: da 10 a 10000" (samples: from 10 to 10000).

## Errors

| Message | When |
|---|---|
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the block stopped and "…" says why (see the page [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression, like «x^2 + 1»") | Something that is neither a text nor a number arrives on **f** (a list, an object). |
| Nome di variabile non valido: «…» ("Invalid variable name") | The name in **Variable** is not valid (it must start with a letter or `_`). |
| «…» è una costante, non può essere la variabile (""…" is a constant, it cannot be the variable") | **Variable** is `pi` or `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: … (give it a value with the block Function f(x); the variable is x)") | The function contains a name that is not the variable and has no value. With more names the message says "Parametri senza valore", and with more variables it ends with "le variabili sono x, y". |
| … : serve un numero (o un'espressione come pi/2), non «…» ("…: a number is needed (or an expression like pi/2), not "…"") | A bound or point written as a text is neither a number nor an expression of numbers (for example `abc`). |
| … : l'infinito non è ammesso qui ("…: infinity is not allowed here") | A bound or start point is `inf` or `∞`. |
| … : serve un numero ("…: a number is needed") | An end is empty or not a number. The message starts with `da` or `a`. |
| L'intervallo deve avere «da» minore di «a» ("The interval must have «da» smaller than «a»") | The start is not smaller than the end. |
| Campioni: da 10 a 10000 ("Samples: from 10 to 10000") | The **Samples** setting is not an integer between 10 and 10000. |

## See also

- [Solve f(x) = 0](fn.solve) for a root in a precise interval
- [Table of values](fn.table) to draw the function
- [Derivative (symbolic)](fn.derivative) for f' and f''
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
