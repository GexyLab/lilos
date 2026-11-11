# Derivative (symbolic)

`fn.derivative` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Computes the derivative of a function **symbolically**: the result is another function, written as a text. For `x^3 + sin(x)` it gives `3x^2 + cos(x)`. You can differentiate up to 10 times.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **f'** (`derivative`) | text | The derivative, simplified, as a text. It links to **f** of the other blocks (for example [Evaluate f(x)](fn.eval)). |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `x^3 + sin(x)` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable. |
| **Order** (`order`) | number (from 1 to 10) | 1 | How many times to differentiate (from 1 to 10). |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`).

The block applies the rules of differentiation (sum, product, quotient, chain rule, power, exponential) and the derivatives of the known functions, then simplifies the result. For `x^x` it uses logarithmic differentiation: `x^x*(ln(x) + 1)`.

- **The other names are constants**: in the derivative of `a x^3` the name `a` stays as it is (`3a*x^2`) and `y` in `x^2 + y` counts as a constant (the derivative is `2x`). Here you do not need to give a value to the parameters.
- `abs(x)` gives `sign(x)`; `floor`, `ceil`, `round` and `sign` give 0. For `min` and `max` there is no symbolic derivative (error): for a value use [Derivative at a point](fn.derivativeAt), which falls back to the numeric calculation.
- With **Order** 2 or more the derivative is repeated: the second derivative of `x^3` is `6x`. The result cannot be longer than 20000 characters.
- If nothing is linked to **f**, the block runs **once when the schema starts** with the settings.

## Examples

### 1. A sum

Nothing linked, default function `x^3 + sin(x)`:

```
[Derivative (symbolic): x^3 + sin(x)] f' ──▶ value [Print (console.log)]
```

At the start it writes `3x^2 + cos(x)`. With `3x^2 + 2sin(x) - ln(x)` it writes `6x + 2cos(x) - 1/x`.

### 2. Product, exponential, quotient

`x sin(x)` → `x*cos(x) + sin(x)`; `e^(2x)` → `2e^(2x)`; `1/x` → `-1/x^2`; `(x+1)/(x-1)` → `1/(x - 1) - (x + 1)/(x - 1)^2`; `sqrt(x)` → `1/(2sqrt(x))`.

### 3. Successive derivatives

`x^3` with **Order** 2 → `6x`. `x^5` with **Order** 4 → `120x`. `sin(x)` with **Order** 10 → `-sin(x)`.

### 4. Another variable

Function `t^2 + t`, **Variable** `t` → `2t + 1`.

### 5. When it does not work

`max(x, 1)` → "Derivata simbolica non disponibile per max()" (symbolic derivative not available). **Order** 11 → "Ordine: da 1 a 10" (order: from 1 to 10).

## Errors

| Message | When |
|---|---|
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the block stopped and "…" says why (see the page [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The name in **Variable** is not valid (it must start with a letter or `_`). |
| «…» è una costante, non può essere la variabile (""…" is a constant, it cannot be the variable") | **Variable** is `pi` or `e`. |
| Ordine: da 1 a 10 ("Order: from 1 to 10") | The **Order** setting is not an integer between 1 and 10. |
| Derivata simbolica non disponibile per …() ("Symbolic derivative not available for …()") | The function uses `min` or `max` (or another function without a symbolic derivative). |
| La derivata è troppo lunga (più di 20000 caratteri) ("The derivative is too long (more than 20000 characters)") | With many successive derivatives the text grows too much. |

## See also

- [Derivative at a point f'(x)](fn.derivativeAt) for the value of the derivative
- [Tangent line](fn.tangent) and [Taylor polynomial](fn.taylor), which use the derivatives
- [Antiderivative (indefinite integral)](int.primitive) for the inverse operation
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
