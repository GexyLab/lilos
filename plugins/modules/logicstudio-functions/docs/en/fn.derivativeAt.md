# Derivative at a point f'(x)

`fn.derivativeAt` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The value of the derivative of a function at a point, or at a list of points, up to the 4th order: exact (symbolic) when possible, otherwise numeric.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |
| **x (number or list)** (`x`) | any | The point: a number or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **f'(x)** (`value`) | any | The value of the derivative, rounded to 15 significant digits: a number, or a list if **x** is a list. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `x^2` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable. |
| **Method** (`method`) | `auto` Exact (symbolic), else numeric; `numeric` Numeric (central differences) | `auto` | How to compute the derivative. |
| **Order** (`order`) | number (from 1 to 4) | 1 | How many times to differentiate (from 1 to 4). |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`).

Any other name in the function is a parameter and needs a value (see [Function f(x)](fn.define)).

- **Exact, else numeric** (the default): the block differentiates the function symbolically (like [Derivative (symbolic)](fn.derivative)) **Order** times and computes the result at the point. If the function has no symbolic derivative (`min`, `max`) it falls back to the numeric calculation.
- **Numeric**: central differences with Richardson extrapolation: two approximations with different steps (the step is proportional to |x|, but at least 1) are combined to remove the main error. For smooth functions it gives about 10-12 correct digits for order 1, fewer for higher orders. Do not use it near a point where the function is not defined.
- At a **corner point** (the slopes on the left and on the right differ, like `abs(x)` at 0 or `max(x, 1)` at 1) the derivative does not exist: error.
- If the derivative has no finite value at the point (`sqrt(x)` at 0, `1/x` at 0) there is an error, also in a list.
- The block does not start by itself at the start: it needs a value on **x**.

## Examples

### 1. One point

`x^3` at 2:

```
[Constant · Variable: 2] value ──▶ x [Derivative at a point: x^3] f'(x) ──▶ value [Print (console.log)]
```

Writes `12`. With **Order** 2 it writes `12` again (the second derivative is 6x). `sin(x)` at 0 gives `1`.

### 2. A list

`x^2` with **x** = `[0, 1, 2, 3]`: `[0,2,4,6]`.

### 3. Exact and numeric

`x^3` at 2 with the **Numeric** method: `11.9999999999979` (instead of 12). `sin(x)` at 1 with **Numeric**: `0.540302305868175`. `max(x, 1)` at 3 with the default method falls back to numeric by itself: `1.00000000000004`.

### 4. When it does not work

`sqrt(x)` at 0: "La derivata non ha un valore finito in x = 0" (the derivative has no finite value). `abs(x)` at 0: "La derivata non esiste in x = 0: è un punto angoloso" (the derivative does not exist: it is a corner point). **Order** 5: "Ordine: da 1 a 4" (order: from 1 to 4).

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
| Ordine: da 1 a 4 ("Order: from 1 to 4") | The **Order** setting is not an integer between 1 and 4. |
| La derivata non esiste in x = …: è un punto angoloso ("The derivative does not exist at x = …: it is a corner point") | The slopes on the left and on the right of the point differ (for example `abs(x)` at 0). The message uses the name of the **Variable**. |
| La derivata non ha un valore finito in … = … ("The derivative has no finite value in … = …") | The derivative is infinite or not a number at the point. |
| … : serve un numero ("…: a number is needed") | **x** (or one of its elements) is not a number. |
| La lista delle x ha più di 10000 elementi ("The list of the x has more than 10000 elements") | The input list is too long. |

## See also

- [Derivative (symbolic)](fn.derivative) for the derivative as a function
- [Tangent line](fn.tangent) for the slope and the equation
- [Rate of change of a signal](fn.signalDerivative) for the derivative of a measure over time
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
