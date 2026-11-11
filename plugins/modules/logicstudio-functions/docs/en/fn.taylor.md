# Taylor polynomial

`fn.taylor` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The Taylor polynomial of a function around a point: the approximation with a polynomial, up to the 12th order.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |
| **x₀ (centre)** (`x0`) | number | The centre of the expansion, where the function and its derivatives must have a value. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **polynomial** (`polynomial`) | text | The polynomial, as a text, for example `x^3/6 + x^2/2 + x + 1`. It links to **f** of the other blocks. |
| **coefficients c₀, c₁…** (`coefficients`) | list | The coefficients c₀, c₁… c_n of the polynomial in the powers of (x − x₀): c_k = f⁽ᵏ⁾(x₀) / k!. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `e^x` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable. |
| **Order** (`order`) | number (from 1 to 12) | 3 | How many times to differentiate (from 1 to 12). |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`). Any other name is a parameter and needs a value (see [Function f(x)](fn.define)).

The block differentiates the function symbolically from 0 to **Order** times, computes every derivative at **x₀**, divides by the factorial (c_k = f⁽ᵏ⁾(x₀) / k!) and writes the sum c₀ + c₁(x − x₀) + c₂(x − x₀)² + …, without the terms with coefficient 0. With x₀ = 0 the terms are simple powers of x.

- The text is the **simplified** polynomial, which may mix forms (`x - (x - 1)^2/2 + (x - 1)^3/3 - 1` for `ln(x)` at 1: it is equal to (x−1) − (x−1)²/2 + (x−1)³/3). For the powers of (x − x₀) use the **coefficients**.
- Fractions are written as fractions when the denominator is at most 64 (`x^3/6`); bigger ones stay decimals (`0.00833333333333x^5` for 1/120).
- If a derivative has no finite value at x₀ (`ln(x)` at 0) there is an error. For `min` and `max` there is no symbolic derivative (error). At a corner point like `abs(x)` at 0 there is an error.
- The block does not start by itself at the start: it needs **x₀**.

## Examples

### 1. eˣ at 0

`e^x`, **Order** 3, **x₀** = 0:

```
[Constant · Variable: 0] value ──▶ x₀ [Taylor polynomial: e^x] polynomial ──▶ value [Print (console.log)]
```

Writes `x^3/6 + x^2/2 + x + 1`. **coefficients** is `[1,1,0.5,0.166666666666667]`.

### 2. Sine and cosine at 0

`cos(x)`, **Order** 4: `x^4/24 - x^2/2 + 1` (coefficients `[1,0,-0.5,0,0.0416666666666667]`). `sin(x)`, **Order** 5: `0.00833333333333x^5 - x^3/6 + x`.

### 3. A different centre

`ln(x)`, **Order** 3, **x₀** = 1: `x - (x - 1)^2/2 + (x - 1)^3/3 - 1`, **coefficients** `[0,1,-0.5,0.333333333333333]`. `sqrt(x)`, **Order** 2, **x₀** = 4: coefficients `[2,0.25,-0.015625]`.

### 4. A geometric series

`1/(1-x)`, **Order** 4, **x₀** = 0: `x^4 + x^3 + x^2 + x + 1`.

### 5. When it does not work

`ln(x)` at 0: "La derivata di ordine 0 non ha un valore finito in x = 0" (the derivative of order 0 has no finite value). `abs(x)` at 0: "La derivata non esiste in x = 0: è un punto angoloso" (it is a corner point). **Order** 13: "Ordine: da 1 a 12" (order: from 1 to 12).

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
| Ordine: da 1 a 12 ("Order: from 1 to 12") | The **Order** setting is not an integer between 1 and 12. |
| La derivata di ordine N non ha un valore finito in … = … ("The derivative of order N has no finite value in … = …") | The function (N = 0) or one of its derivatives is infinite or not a number at x₀. |
| Derivata simbolica non disponibile per …() ("Symbolic derivative not available for …()") | The function uses `min` or `max` (or another function without a symbolic derivative). |
| La derivata non esiste in x = …: è un punto angoloso ("The derivative does not exist at x = …: it is a corner point") | A derivative has different slopes on the left and on the right of x₀ (for example `abs(x)` at 0). The message uses the name of the **Variable**. |
| x₀: serve un numero ("x₀: a number is needed") | **x₀** is not a number. |

## See also

- [Derivative (symbolic)](fn.derivative), which this block repeats
- [Tangent line](fn.tangent), the Taylor polynomial of order 1
- [Evaluate f(x)](fn.eval) to compare the polynomial with the function
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
