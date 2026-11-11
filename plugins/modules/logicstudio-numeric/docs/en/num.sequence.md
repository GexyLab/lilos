# Sequence aₙ

`num.sequence` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Computes the terms of a **sequence** aₙ from n start to n end: in the explicit kind (`aₙ = f(n)`, like `1/n^2`) or the recursive one (`aₙ = f(n, a, b)` with `a = aₙ₋₁` and `b = aₙ₋₂`, like Fibonacci).

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as text (for example `x^2 + sin(x)`). If it is not linked, the **Function** setting is used. |
| **from n** (`from`) | number | The first n. If it is not linked, the **From n** setting is used. |
| **to n** (`to`) | number | The last n. If it is not linked, the **To n** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **terms** (`terms`) | list | The terms, in a list (`null` where the formula does not give a finite number). |
| **n list** (`n`) | list | The values of n, in a list. |
| **points {x, y}** (`points`) | list | The `{x, y}` points with x = n and y = aₙ, for a chart. |
| **last term** (`last`) | number | The last term. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text | `1/n^2` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `n` | The name of the index (`n` by default). |
| **Kind** (`mode`) | Explicit: aₙ = f(n) / Recursive: aₙ = f(n, a, b), a = aₙ₋₁, b = aₙ₋₂ | Explicit: aₙ = f(n) | **Explicit** computes `f(n)` for every n. **Recursive** starts from the first term and computes every term from the two previous ones. |
| **First term (recursive)** (`first`) | a text (a number) | `1` | The first term (recursive only): a number. |
| **Second term (recursive, optional)** (`second`) | a text (a number, or empty) | empty | The second term (recursive only). If empty, the second one is computed with the formula, with `b = 0`. |
| **From n (when not linked)** (`from`) | number | `1` | The first n, when **from n** is not linked. |
| **To n (when not linked)** (`to`) | number | `10` | The last n, when **to n** is not linked. |

## How it works

The function comes from the **f** input (a text like `x^2 + 1`) or, if **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How a function is written is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions». Angles are in radians. The variable is **x**, or the name chosen in **Variable**; any other name in the function is a parameter and needs a value (given with the block [Function f(x)](fn.define)). Here the default variable is **n**.

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

- **Explicit**: every term is `f(n)`, for n from **From n** to **To n** (whole numbers: decimals are rounded).
- **Recursive**: the formula uses `n`, `a` (the previous term) and `b` (the one before). The first term is **First term**; the second is **Second term** if there is one, otherwise it is computed with `b = 0`.
- At most 100000 terms.

## Examples

### 1. The reciprocals of the squares

Function `1/n^2`, from 1 to 4:

```
[Sequence aₙ: 1/n^2, 1 → 4] terms ──▶ value [Print (console.log)]
```

Writes `[1,0.25,0.111111111111111,0.0625]`.

### 2. Fibonacci

Recursive, function `a + b`, first and second term 1, from 1 to 10:

```
[Sequence aₙ: a + b, recursive, 1, 1, 1 → 10] terms ──▶ value [Print (console.log)]
```

Writes `[1,1,2,3,5,8,13,21,34,55]`.

### 3. The powers of 2

Recursive, function `2a`, first term 1, from 0 to 5:

```
[Sequence aₙ: 2a, recursive, 1, 0 → 5] terms ──▶ value [Print (console.log)]
```

Writes `[1,2,4,8,16,32]`.

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
| n iniziale: serve un numero ("n start: a number is needed") | The value **n start** is empty or not a number. |
| n finale: serve un numero ("n end: a number is needed") | The value **n end** is empty or not a number. |
| n finale è minore di n iniziale ("n end is smaller than n start") | The end is before the start. |
| Troppi termini (più di 100000) ("Too many terms (more than 100000)") | The sequence has more than 100000 terms. |
| La variabile non può chiamarsi a né b: sono i due termini precedenti ("The variable cannot be called a or b: they are the two previous terms") | In the recursive kind the variable has the name of one of the two terms. |
| Primo termine: serve un numero ("First term: a number is needed") | The value **First term** is empty or not a number. |
| Secondo termine: serve un numero ("Second term: a number is needed") | The value **Second term** is empty or not a number. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo ("Calculation too long (more than 8 seconds): use fewer points or a shorter interval") | The calculation takes more than 8 seconds: the block stops so that it does not hold the program. |

## See also

- [Series Σ · Product Π](num.series) to add up the terms
- [Sample f](num.sample) for a function of a real variable
- [Table of values](fn.table) for a table of values of a function
- [Scatter](charts.scatter) to draw the terms
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
