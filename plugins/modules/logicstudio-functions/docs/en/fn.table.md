# Table of values

`fn.table` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Computes a function on many equally spaced points between two ends and sends the table: a list of `{x, y}` points ready for a chart.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text. When it is not linked the **Function** setting is used. |
| **from** (`from`) | number | The first value of x. When it is not linked the **From** setting is used. |
| **to** (`to`) | number | The last value of x. When it is not linked the **To** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **points {x, y}** (`points`) | list | The points, in the form `[{"x":0,"y":0},{"x":1,"y":1}]`. It links to the chart [Lines](charts.line) or [Scatter](charts.scatter). |
| **x list** (`xs`) | list | Only the x, in a list. Hidden by default: show it with the eye in the Properties. |
| **y list** (`ys`) | list | Only the y, in a list (`null` where the function has no finite value). Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `x^2` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable. |
| **From** (`from`) | a number | -10 | The first value of x, when **from** is not linked. |
| **To** (`to`) | a number | 10 | The last value of x, when **to** is not linked. |
| **Points** (`count`) | number (from 2 to 10000) | 101 | How many points to compute, ends included. |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`).

The block computes `n` points (the **Points** setting, from 2 to 10000): the x of point number i (from 0 to n−1) is `from + (to − from) · i / (n − 1)`, so the first point is exactly **from** and the last exactly **to**. The x and the y are rounded to 15 significant digits.

- Where the function has no finite value (`1/x` at 0, `sqrt(x)` below zero) the y is `null` and the block gives **no** error. The charts skip the points without a y.
- **from** can be bigger than **to**: the table goes backwards. If they are equal, all the points are the same.
- The ends are numbers, texts with a number (`"2.5"`) or expressions of numbers like `pi/2`. Infinity is not allowed.
- If nothing is linked to **f**, **from** and **to**, the block runs **once when the schema starts** with the settings.
- A very dense table makes a slow chart: 100-500 points are enough for a smooth curve.

## Examples

### 1. A parabola

Function `x^2`, from 0 to 4, 5 points, nothing linked:

```
[Table of values: x^2, 0 → 4, 5 points] points ──▶ value [Print (console.log)]
```

At the start it writes `[{"x":0,"y":0},{"x":1,"y":1},{"x":2,"y":4},{"x":3,"y":9},{"x":4,"y":16}]`.

### 2. A point where the function does not exist

Function `1/x`, from −1 to 1, 3 points: **y list** is `[-1,null,1]`.

### 3. The ends from the inputs

Function `2x`, 3 points, **from** = 0 and **to** = 1 linked: `[{"x":0,"y":0},{"x":0.5,"y":1},{"x":1,"y":2}]`.

### 4. An expression as an end

Function `sin(x)`, **from** `0`, **to** `pi`, 5 points: the x of the last point is `3.14159265358979` and its y `1.22464679914735e-16`.

### 5. A chart

```
[Table of values: sin(x), 0 → 6.28] points ──▶ data [Lines]
```

With 101 points (the default) the chart draws a wave.

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
| Punti: da 2 a 10000 ("Points: from 2 to 10000") | The **Points** setting is not an integer between 2 and 10000. |
| da: serve un numero (o un'espressione come pi/2), non «…» ("from: a number is needed (or an expression like pi/2), not "…"") | An end is a text that is neither a number nor an expression of numbers (for example `abc`). For **to** the message starts with `a`. |
| da: l'infinito non è ammesso qui ("from: infinity is not allowed here") | An end is `inf` or `∞` (for **to**: "a: …"). |
| da: serve un numero ("from: a number is needed") | An end is empty or not a number (for **to**: "a: …"). |

## See also

- [Evaluate f(x)](fn.eval) for a single point
- [Lines](charts.line) and [Scatter](charts.scatter) to draw the table
- [Study of a function](fn.study) for zeros, maxima, minima and inflections
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
