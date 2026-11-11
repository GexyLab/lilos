# Tangent line

`fn.tangent` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The tangent line to the graph of a function at a point, and the normal line: slope, intercept and equations.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |
| **x₀** (`x0`) | number | The x of the point of tangency. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **slope m** (`slope`) | number | The slope m, that is the derivative at x₀. |
| **intercept q** (`intercept`) | number | The intercept q: where the tangent cuts the y axis. |
| **equation** (`equation`) | text | The equation of the tangent, as a text, for example `y = 2x - 1`. |
| **f(x₀)** (`y0`) | number | The value f(x₀). Hidden by default: show it with the eye in the Properties. |
| **normal line** (`normal`) | text | The equation of the normal line (perpendicular to the tangent at the point): `y = -x/2 + 3/2`, or `x = 1` if the tangent is horizontal. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `x^2` | The function, when **f** is not linked. |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

In this block the variable is always **x**; any other name is a parameter and needs a value (see [Function f(x)](fn.define)).

The block computes y₀ = f(x₀) and the slope m = f'(x₀) (with the symbolic derivative, or numeric if the function has none), then writes the tangent y = m·x + q with q = y₀ − m·x₀. The normal has slope −1/m and goes through the same point; if m = 0 the normal is the vertical line `x = x₀`.

The equations are simplified: `y = x - 1`, `y = -x/4 + 1`. Irrational numbers are written with 12 digits (`y = 2.71828182846x`).

- If f has no finite value at x₀ there is an error; if the derivative is not finite (vertical tangent, `sqrt(x)` at 0) the message says so.
- At a corner point (`abs(x)` at 0, where the slopes on the left and on the right differ) the tangent does not exist and the block gives an error.
- The block does not start by itself at the start: it needs **x₀**.

## Examples

### 1. A parabola

`x^2` at **x₀** = 1:

```
[Constant · Variable: 1] value ──▶ x₀ [Tangent line: x^2] equation ──▶ value [Print (console.log)]
```

Writes `y = 2x - 1`. **slope m** is `2`, **intercept q** `-1`, **f(x₀)** `1`, **normal line** `y = -x/2 + 3/2`.

### 2. Other functions

- `ln(x)` at 1: `y = x - 1`, normal `y = -x + 1`.
- `1/x` at 2: `y = -x/4 + 1`, normal `y = 4x - 15/2`.
- `sin(x)` at 0: `y = x`, normal `y = -x`.
- `x^2` at 0: `y = 0`, normal `x = 0`.
- `e^x` at 1: `y = 2.71828182846x`.

### 3. When it does not work

- `sqrt(x)` at 0: "La tangente in x = 0 è verticale o non esiste" (the tangent at x = 0 is vertical or does not exist).
- `abs(x)` at 0: "La derivata non esiste in x = 0: è un punto angoloso" (the derivative does not exist at x = 0: it is a corner point).
- `1/x` at 0: "La funzione non ha un valore finito in x = 0" (the function has no finite value).

## Errors

| Message | When |
|---|---|
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the block stopped and "…" says why (see the page [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression, like «x^2 + 1»") | Something that is neither a text nor a number arrives on **f** (a list, an object). |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: … (give it a value with the block Function f(x); the variable is x)") | The function contains a name that is not the variable and has no value. With more names the message says "Parametri senza valore", and with more variables it ends with "le variabili sono x, y". |
| La funzione non ha un valore finito in x = … ("The function has no finite value in x = …") | The function gives an infinite or non-numeric value (division by zero, root of a negative number, logarithm of zero…). |
| La tangente in x = … è verticale o non esiste ("The tangent at x = … is vertical or does not exist") | The derivative at the point is not a finite number. |
| La derivata non esiste in x = …: è un punto angoloso ("The derivative does not exist at x = …: it is a corner point") | The slopes on the left and on the right of the point differ (for example `abs(x)` at 0). In this block the variable is always x. |
| x₀: serve un numero ("x₀: a number is needed") | **x₀** is not a number. |

## See also

- [Derivative at a point f'(x)](fn.derivativeAt) for the slope alone
- [Taylor polynomial](fn.taylor) to approximate better than the tangent
- [Table of values](fn.table) to draw the function together with the tangent
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
