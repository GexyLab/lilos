# Sample f

`num.sample` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Computes the function on **n equally spaced points** between **a** and **b** and sends the lists of the x and of the y and the `{x, y}` points. It is used to **draw a function** or to pass it to a block that works on lists (derivative of data, interpolation, regression).

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as text (for example `x^2 + sin(x)`). If it is not linked, the **Function** setting is used. |
| **from a** (`a`) | number | The start of the interval. If it is not linked, the **From a** setting is used. |
| **to b** (`b`) | number | The end of the interval. If it is not linked, the **To b** setting is used. |
| **points** (`n`) | number | How many points, ends included. If it is not linked, the **Points** setting is used. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **x list** (`x`) | list | The x, in a list. |
| **y list** (`y`) | list | The y, in a list (`null` where the function has no finite value). |
| **points {x, y}** (`points`) | list | The points, in the form `[{"x":0,"y":0},{"x":1,"y":1}]`. Link it to a chart of the [Charts](logicstudio-charts) package. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text | `sin(x)` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable (letters, digits and `_`; it cannot be `pi` or `e`). |
| **From a (when a is not linked)** (`a`) | a text | `0` | The start of the interval, when **a** is not linked: a number or an expression like `pi/2`. |
| **To b (when b is not linked)** (`b`) | a text | `2 pi` | The end of the interval, when **b** is not linked (`2 pi` by default). |
| **Points** (`n`) | number (from 2 to 200000) | `100` | How many points to compute (from 2 to 200000). |

## How it works

The function comes from the **f** input (a text like `x^2 + 1`) or, if **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How a function is written is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions». Angles are in radians. The variable is **x**, or the name chosen in **Variable**; any other name in the function is a parameter and needs a value (given with the block [Function f(x)](fn.define)).

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

The x of point number i (from 0 to n−1) is `a + (b − a)·i/(n − 1)`: the first point is exactly **a** and the last exactly **b**. Numbers are rounded to 15 significant digits.

- Where the function has no finite value (`1/x` at 0, `sqrt(x)` below zero) the y is `null` and the block does **not** give an error: a chart skips that point.
- **a** can be greater than **b**: the points go backwards.
- The ends are numbers, texts with a number (`"2,5"`) or expressions of numbers like `pi/2`; infinity is not allowed.
- [Table of values](fn.table) does almost the same, but gives the points as a list of `{x, y}` and the two lists as hidden outputs: here the x and y lists are normal outputs.

## Examples

### 1. A wave for a chart

Function `sin(x)`, from 0 to `2 pi`, 100 points (the default values):

```
[Sample f: sin(x)] points ──▶ data [Lines]
```

When the schema starts the chart draws one period of the sine.

### 2. Five points

Function `x^2`, from 0 to 4, 5 points:

```
[Sample f: x^2, 0 → 4, 5 points] y ──▶ value [Print (console.log)]
```

Writes `[0,1,4,9,16]`.

### 3. A point where it does not exist

Function `1/x`, from −1 to 1, 3 points:

```
[Sample f: 1/x, -1 → 1, 3 points] y ──▶ value [Print (console.log)]
```

Writes `[-1,null,1]`.

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
| Punti: da 2 a 200000 ("Points: from 2 to 200000") | The number of points is not an integer between 2 and 200000. |
| a: serve un numero ("a: a number is needed") | The value **a** is empty or not a number. |
| a: serve un numero (o un'espressione come pi/2), non «…» ("a: a number is needed (or an expression like pi/2), not «…»") | The value **a** is a text that is neither a number nor an expression of numbers (for example `abc`). |
| a: l'infinito non è ammesso qui ("a: infinity is not allowed here") | The value **a** is `inf` or `∞`. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo ("Calculation too long (more than 8 seconds): use fewer points or a shorter interval") | The calculation takes more than 8 seconds: the block stops so that it does not hold the program. |

## See also

- [Table of values](fn.table) for a table of points to draw, with the start and end x
- [Evaluate f(x)](fn.eval) for the value at a single point
- [Integral of sampled data](int.data) to integrate the points you get
- [Lines](charts.line) and [Scatter](charts.scatter) to draw the points
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
