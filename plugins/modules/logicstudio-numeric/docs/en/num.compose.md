# Compose f∘g

`num.compose` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Puts one function into another: from `f(x)` and `g(x)` it makes `f(g(x))` (or `g(f(x))`). The result is a function, written as text, that can be linked to the other blocks.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as text (for example `x^2 + sin(x)`). If it is not linked, the **Function** setting is used. |
| **g (function)** (`g`) | text | The inner function (or the outer one, with the order `g(f(x))`), as text. If it is not linked, the **Function g** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **f∘g (function)** (`f`) | text | The composed function, as text and simplified (for example `sin(x^2)`). |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text | `sin(x)` | The function, when **f** is not linked. |
| **Function g (when g is not linked)** (`inner`) | a text | `x^2` | The function g, when **g** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable (letters, digits and `_`; it cannot be `pi` or `e`). |
| **Order** (`order`) | f(g(x)) / g(f(x)) | f(g(x)) | `f(g(x))` puts g into f; `g(f(x))` puts f into g. |

## How it works

The function comes from the **f** input (a text like `x^2 + 1`) or, if **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How a function is written is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions». Angles are in radians. The variable is **x**, or the name chosen in **Variable**; any other name in the function is a parameter and needs a value (given with the block [Function f(x)](fn.define)).

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

Every **x** of the outer function is replaced by the whole inner function, then the result is simplified. The other names (the parameters) stay in the result: the composition is symbolic, they do not need a value here.

- With `f = sin(x)` and `g = x^2` you get `sin(x^2)`; with the order `g(f(x))` you get `sin(x)^2`.
- The result cannot be longer than 2000 characters.

## Examples

### 1. The sine of a square

Nothing linked, **Function** `sin(x)`, **Function g** `x^2`:

```
[Compose f∘g: sin(x), x^2] f ──▶ value [Print (console.log)]
```

Writes `sin(x^2)`.

### 2. The other way round

The same functions with the order `g(f(x))`:

```
[Compose f∘g: sin(x), x^2, g(f(x))] f ──▶ value [Print (console.log)]
```

Writes `sin(x)^2`.

### 3. From other blocks

```
[Function f(x): a x + 1] f ──▶ f [Compose f∘g] f ──▶ f [Sample f]
[Function f(x): x^2]    f ──▶ g
```

The chart shows the composed function.

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
| La composizione è troppo lunga (più di 2000 caratteri) ("The composition is too long (more than 2000 characters)") | Putting one function into the other the result is longer than 2000 characters. |

## See also

- [Simplify](num.simplify) to write the result in a simpler way
- [Derivative (symbolic)](fn.derivative) to differentiate the composed function
- [Function f(x)](fn.define) to give a value to the parameters
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
