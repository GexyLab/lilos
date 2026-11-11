# Simplify

`num.simplify` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Writes a function in a simpler way: it adds equal terms (`2x + 3x` becomes `5x`), removes `*1` and `+0`. As an alternative it **expands** it as a polynomial (`(x+1)(x-1)` becomes `x^2 - 1`).

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as text (for example `x^2 + sin(x)`). If it is not linked, the **Function** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **f (simplified)** (`f`) | text | The function written in a simple way, as text, ready for the other blocks. |
| **changed** (`changed`) | yes/no | `true` if the text is different from the starting one (written in the orderly form), `false` if there was nothing to simplify. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text | `2x + 3x + sin(x)^2 + cos(x)^2` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable (letters, digits and `_`; it cannot be `pi` or `e`). |
| **Method** (`mode`) | Simplify / Expanded polynomial (a + bx + cx²…) | Simplify | **Simplify** applies the rules of simplification; **Expanded polynomial** expands products and powers and sorts the terms from the highest degree, but only if the function is a polynomial in the variable. |

## How it works

The function comes from the **f** input (a text like `x^2 + 1`) or, if **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How a function is written is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions». Angles are in radians. The variable is **x**, or the name chosen in **Variable**; any other name in the function is a parameter and needs a value (given with the block [Function f(x)](fn.define)).

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

- Simplification does not reduce fractions of polynomials: `(x^2 - 1)/(x - 1)` stays as it is.
- Simple decimal numbers become fractions (`0.5x` comes out `x/2`) and numbers have at most 12 significant digits.
- **Expanded polynomial** accepts only numbers, the variable, sums, products and whole powers from 0 to 20; the result has the coefficients added up (`(x+2)^3` gives `x^3 + 6x^2 + 12x + 8`).
- The other names (the parameters) stay in the result with **Simplify**; with **Expanded polynomial** they are not allowed.

## Examples

### 1. Adding terms

Function `2x + 3x + sin(x)^2 + cos(x)^2`:

```
[Simplify: 2x + 3x + sin(x)^2 + cos(x)^2] f ──▶ value [Print (console.log)]
```

Writes `5x + sin(x)^2 + cos(x)^2` (the two squares stay written): **changed** is `true`.

### 2. Expanding a product

Function `(x+1)(x-1)`, method **Expanded polynomial**:

```
[Simplify: (x+1)(x-1), polynomial] f ──▶ value [Print (console.log)]
```

Writes `x^2 - 1`.

### 3. A cube

Function `(x+2)^3`, method **Expanded polynomial**:

```
[Simplify: (x+2)^3, polynomial] f ──▶ value [Print (console.log)]
```

Writes `x^3 + 6x^2 + 12x + 8`.

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
| f non è un polinomio in … con coefficienti numerici (di grado al massimo 20) ("f is not a polynomial in … with numeric coefficients (of degree 20 at most)") | With the **Expanded polynomial** method, the function contains something other than sums, products and whole powers of the variable, has other names or has a degree above 20. |

## See also

- [Compose f∘g](num.compose) to put a function into another
- [Function f(x)](fn.define) which already sends the function simplified
- [Derivative (symbolic)](fn.derivative) for the derivative, already simplified
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
