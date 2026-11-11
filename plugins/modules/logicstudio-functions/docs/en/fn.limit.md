# Limit (numeric)

`fn.limit` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The limit of a function as x tends to a point or to infinity, computed **numerically**, with the two one-sided limits.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |
| **x₀ (number, inf, -inf)** (`x0`) | any | The point x tends to: a number, a text like `pi/2`, or `inf`, `-inf` (also `∞`, `-∞`). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **limit** (`value`) | number | The limit. A number if the limit is finite; the infinite number (+∞ or −∞) if the function grows without bound (with **exists** false); nothing if there is no limit or it cannot be settled. |
| **exists** (`exists`) | yes/no | `true` only if the limit is a **finite number**. For an infinite limit it is `false` (the value +∞ or −∞ still comes out on **limit**). |
| **from the left** (`left`) | number | The limit from the left (x → x₀⁻): a number, ±∞, or nothing. Only for a finite x₀. Hidden by default: show it with the eye in the Properties. |
| **from the right** (`right`) | number | The limit from the right (x → x₀⁺), like **from the left**. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `sin(x)/x` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable. |
| **Side** (`side`) | `both` Both sides; `left` From the left (x → x₀⁻); `right` From the right (x → x₀⁺) | `both` | From which side to approach (only for a finite x₀). With a single side, the other is not computed. |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`). Any other name is a parameter and needs a value (see [Function f(x)](fn.define)).

**The method.** The block does no symbolic work: it computes the function on points ever closer to x₀, on one side (x₀ ± h with h = 10⁻¹, 10⁻² … 10⁻⁹, in proportion to |x₀| if it is large), or ever farther (x = 10, 10² … 10⁹) if x₀ is infinite, and looks at how the values go.

- From pairs of close samples it gets **extrapolated** values (Richardson extrapolation, which removes the error that grows with h): for each pair two estimates, one for an error proportional to h and one for an error proportional to h². The pair where the two estimates **agree best** wins, and the side gets the finite limit that comes out of it.
- If the result equals f(x₀) within the precision reached, exactly f(x₀) comes out; a result near 0 becomes 0; otherwise it is written with 10 significant digits.
- If the last values are all huge (over 10⁵), of the same sign and **ever bigger**, the limit is +∞ or −∞.
- Otherwise (values that oscillate like `sin(1/x)`, that grow slowly like `ln(x)` at 0, that do not exist on that side like `sqrt(x)` to the left of 0) the side **does not settle** and the limit does not exist. A slow divergence like `ln(x)` at 0 is therefore reported as a limit that does not exist, not as −∞.
- With **Both sides** the two sides must give the same result (equal, or finite with a relative difference below 10⁻⁶); otherwise **limit** stays empty (for `1/x` at 0 the sides are −∞ and +∞, for `abs(x)/x` they are −1 and 1, for `x ln(x)` at 0 the left side is outside the domain). With one side only, that side counts.
- With an infinite x₀ the side is the one of the chosen infinity and **from the left** and **from the right** stay empty.
- The evaluations where the function gives an error or is not a number count as "not settled".

It is always a numeric estimate: for a continuous function the limit is the value, and with [Evaluate f(x)](fn.eval) you get it at once. Functions that oscillate or have jumps inside the range of the samples may not settle: the block then says the limit does not exist.

- The block does not start by itself at the start: it needs **x₀**.

## Examples

### 1. The notable limit

`sin(x)/x` at 0:

```
[Constant · Variable: 0] value ──▶ x₀ [Limit (numeric): sin(x)/x] limit ──▶ value [Print (console.log)]
```

Writes `1`. **exists** is `true`; **from the left** and **from the right** are `1`.

### 2. A limit that does not exist

- `1/x` at 0: **limit** empty, **exists** `false`, **from the left** −∞, **from the right** +∞. With the side **From the right**: **limit** +∞, **exists** `false`.
- `abs(x)/x` at 0: **from the left** −1, **from the right** 1, **limit** empty, **exists** `false`.
- `ln(x)` at 0 from the right: **exists** `false` and **limit** empty (slow divergence).
- `tan(x)` with **x₀** `pi/2`: from the left +∞, from the right −∞: no limit.

### 3. An infinite limit

`1/x^2` at 0: **limit** +∞, **exists** `false`. `x^2` with **x₀** `inf`: +∞. `x^3` with `-inf`: −∞.

### 4. Continuous functions and points to "fill in"

`x^2` at 3: `9`. `2x` at 0: `0`. `(x^2-1)/(x-1)` at 1: `2` (the function is not defined at 1, but the limit exists). `(e^x-1)/x` at 0: `1`. `(1-cos(x))/x^2` at 0: `0.5`, **exists** `true`.

### 5. One side only

`x ln(x)` at 0: the left side is outside the domain, so with **Both sides** **limit** is empty and **exists** `false`; with the side **From the right** **limit** is `0` and **exists** `true`.

### 6. At infinity

`(1+1/x)^x` with **x₀** `inf`: **limit** `2.718281828`, **exists** `true` (the number e). `1/x` with `inf`: `0`. `x/(x+1)` with `inf`: `1`. `atan(x)` with `inf`: `1.570796327`. `e^x` with `-inf`: `0`.

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
| x₀: serve un numero ("x₀: a number is needed") | **x₀** is empty or not a number. |

## See also

- [Evaluate f(x)](fn.eval) for the value of a continuous function
- [Derivative at a point f'(x)](fn.derivativeAt), which is a limit of the difference quotient
- [Study of a function](fn.study) for zeros, maxima, minima and inflections
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
