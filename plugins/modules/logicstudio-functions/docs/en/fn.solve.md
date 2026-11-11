# Solve f(x) = 0

`fn.solve` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Finds a root of a function, that is a value of x where f(x) = 0, with Brent's method (in an interval) or Newton's method (from a start point).

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |
| **interval from** (`a`) | number | The start of the interval (Brent method). A number or a text like `pi/2`. When it is not linked the setting is used. |
| **interval to** (`b`) | number | The end of the interval (Brent method). Like **interval from**. |
| **start point (Newton)** (`x0`) | number | The start point (Newton method). When it is not linked the setting is used. Hidden by default: show it with the eye in the Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **root** (`root`) | number | The root found, rounded to 15 significant digits. |
| **f(root)** (`value`) | number | The value of the function at the root: it should be very close to 0 (for `x^2 - 2` it is about −2.6·10⁻¹⁴). Hidden by default: show it with the eye in the Properties. |
| **iterations** (`iterations`) | number | How many steps the method made. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `x^2 - 2` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable. |
| **Method** (`method`) | `brent` Brent, in the interval [a, b]; `newton` Newton, from the point x0 | `brent` | Which method to use. |
| **Interval from (when a is not linked)** (`a`) | a number or an expression of numbers (`pi/2`) | `0` | The start of the interval, when **interval from** is not linked. `pi/2` is fine too. |
| **Interval to (when b is not linked)** (`b`) | a number or an expression of numbers | `2` | The end of the interval, when **interval to** is not linked. |
| **Start point (when x0 is not linked)** (`x0`) | a number or an expression of numbers | `1` | The start point of Newton, when **start point** is not linked. |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`).

The ends **a** and **b** and the point **x0** are numbers or texts that count as numbers (`"2.5"`, `pi/2`). Infinity is not allowed.

**Brent** (the default method) looks for the root in the interval [a, b]. It needs f(a) and f(b) to have **opposite signs**: then there is surely a root, and the method always finds it, mixing bisection and interpolation. It stops when the interval is smaller than about 10⁻¹³ (at most 200 steps). If one of the ends is already a root, it returns at once with 0 steps. If the interval has several roots it finds only one, and you do not know which: choose an interval with a single root (for all the roots in an interval there is [Study of a function](fn.study)). If the function changes sign but **does not go to zero** at the point found (a jump or a pole, like `1/x` between −1 and 1) the block gives an error instead of a false root.

**Newton** starts from **x0** and repeats x ← x − f(x) / f'(x). The derivative f' is the **symbolic** one; if the function has none (`min`, `max`) the numeric one is used. It stops when two consecutive steps are closer than about 10⁻¹³ (at most 100 steps). It is faster than Brent but may fail to arrive: it depends on the start point, and where the derivative is 0 it stops.

- If the block runs for **f** and a linked input has no value yet, it waits.
- If nothing is linked, it runs **once when the schema starts** with the settings (by default `x^2 - 2` in [0, 2]).

## Examples

### 1. The square root of 2

Nothing linked, default values (`x^2 - 2` in [0, 2], Brent):

```
[Solve f(x) = 0] root ──▶ value [Print (console.log)]
```

At the start it writes `1.41421356237309` (**f(root)** is −2.62·10⁻¹⁴, **iterations** 8).

### 2. cos(x) = x

Function `cos(x) - x`, interval [0, 1]: root `0.739085133215156` in 7 steps.

### 3. Newton

Newton method, function `x^2 - 2`, **x0** = 1: root `1.41421356237309` in 6 steps.

### 4. When it does not work

- `x^2 + 1` in [0, 2]: error "f(a) e f(b) hanno lo stesso segno: nessuna radice garantita nell'intervallo" (f(a) and f(b) have the same sign).
- `1/x` in [−1, 1]: error "f cambia segno in x ≈ -5.68434188608051e-14 senza annullarsi: è un salto o un polo, non una radice" (f changes sign at x ≈ … without going to zero: it is a jump or a pole, not a root).
- Newton on `x^2 + 1` from **x0** = 1: after one step it arrives at 0, where the derivative is 0: error "Derivata nulla in x = 0: Newton non può continuare" (zero derivative, Newton cannot go on).

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
| … : serve un numero ("…: a number is needed") | An end or the start point is empty or not a number. The message starts with `a`, `b` or `x0`. |
| f(a) e f(b) hanno lo stesso segno: nessuna radice garantita nell'intervallo ("f(a) and f(b) have the same sign: no root guaranteed in the interval") | Brent: the function has the same sign at the two ends. |
| La funzione non ha un valore finito agli estremi dell'intervallo ("The function has no finite value at the ends of the interval") | Brent: f(a) or f(b) is infinite or not a number. |
| La radice non converge in 200 iterazioni ("The root does not converge in 200 iterations") | Brent did not stop in 200 steps (a rare case). |
| f cambia segno in x ≈ … senza annullarsi: è un salto o un polo, non una radice ("f changes sign at x ≈ … without going to zero: it is a jump or a pole, not a root") | Brent: the function changes sign in the interval but is not 0 at the point found, like `1/x` between −1 and 1. |
| La funzione non ha un valore finito in x = … ("The function has no finite value in x = …") | The function gives an infinite or non-numeric value (division by zero, root of a negative number, logarithm of zero…). |
| Derivata nulla in x = …: Newton non può continuare ("Zero derivative at x = …: Newton cannot go on") | Newton arrived at a point where f' is 0. |
| Newton non converge in 100 iterazioni: prova un altro punto di partenza o un intervallo ("Newton does not converge in 100 iterations: try another start point or an interval") | Newton did not stop in 100 steps. |

## See also

- [Polynomial: value and roots](fn.poly) for the roots of a polynomial, also complex
- [Quadratic equation](fn.quadratic) for the closed formula
- [Study of a function](fn.study) to find all the zeros in an interval
- [Derivative (symbolic)](fn.derivative) for the derivative Newton uses
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
