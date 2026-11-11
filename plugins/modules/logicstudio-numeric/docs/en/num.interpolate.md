# Interpolation

`num.interpolate` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Finds a curve that **passes exactly through** the given points, and gives the value at any point in between (or a list of points), with three methods: linear, Lagrange polynomial, natural cubic spline.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | list | The list of the x (they need not be in order). |
| **y** (`y`) | list | The list of the y, or a list of points `{x, y}` or `[x, y]`. |
| **at** (`at`) | any | Where to compute: a number, an expression, or a list of numbers. If it is not linked, the **x** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **y** (`y`) | any | The value (or the values, if **at** is a list) of the curve. |
| **f (function)** (`f`) | text | The curve as a text function, to link to other blocks (for example [Sample f](num.sample)). It does not come out if it would be longer than 2000 characters (many points). |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Method** (`method`) | Linear / Lagrange polynomial / Natural cubic spline | Natural cubic spline | **Linear** joins the points with segments. **Lagrange polynomial** is the only polynomial that passes through all of them (unstable with many points). **Natural cubic spline** is a smooth curve made of pieces of third degree (the default). |
| **x (when the input is not linked)** (`at`) | a text (number or expression) | `0` | Where to compute when the **at** input is not linked: a number or an expression like `pi/2`. |
| **Allow x outside the data** (`extrapolate`) | yes / no | no | If turned on, an x outside the interval of the data can be asked for (the first or last piece is extended). |
| **Variable of the function** (`variable`) | a text | `x` | The name of the variable in the text function. |

## How it works

The block waits until all the linked inputs have a value and computes at every new value; it does not start by itself when the schema starts.

- The data are sorted by x and the values that are not numbers are removed. At least 2 points are needed, at most 5000 (60 for Lagrange).
- Outside the interval of the data there is an error, unless **Allow x outside the data** is turned on: then the first or last piece is extended (the natural spline becomes a straight line).
- The function **f** uses `max(0, x − x₀)` to join the pieces, so it is a normal formula: the spline for (0, 0), (1, 1), (2, 4) is `0.5x + 0.5x^3 - max(0, x - 1)^3`. With Lagrange it is the polynomial. With more than about 40 points the formula is longer than 2000 characters and **f** does not come out.

## Examples

### 1. A broken line

Data (0, 0), (1, 1), (2, 4), method **Linear**, at 1.5:

```
[Constant · Variable (JSON): [0, 1, 2]] ──▶ x [Interpolation]
[Constant · Variable (JSON): [0, 1, 4]] ──▶ y
[Constant · Variable: 1.5]              ──▶ at
```

**y** is `2.5`, and **f** is `x + 2 * max(0, x - 1)`.

### 2. A smooth curve

The same data with the **Natural cubic spline**:

```
[Interpolation: spline] y ──▶ value [Print (console.log)]
```

At 1.5 it is `2.3125`; it passes exactly through (0, 0), (1, 1), (2, 4).

### 3. A polynomial

The points of `x^3` at 0…4 with **Lagrange**, at 2.5:

```
[Interpolation: Lagrange] y ──▶ value [Print (console.log)]
```

Writes `15.625` (2.5 cubed): the polynomial is exactly `x^3`.

## Errors

| Message | When |
|---|---|
| Servono dei dati: una lista di numeri o di punti ("Data are needed: a list of numbers or of points") | The input is not a list. |
| Le liste x e y hanno lunghezze diverse (… e …) ("The lists x and y have different lengths (… and …)") | The two lists do not have the same number of items. |
| Serve una lista di numeri per le x ("A list of numbers is needed for the x") | The **x** input is not a list. |
| Servono almeno 2 punti ("At least 2 points are needed") | After removing the items that are not numbers fewer than 2 points are left. |
| Troppi punti per interpolare (al massimo 5000) ("Too many points to interpolate (at most 5000)") | The data have more than 5000 points. |
| Il polinomio di Lagrange è instabile con più di 60 punti: usa la spline ("The Lagrange polynomial is unstable with more than 60 points: use the spline") | With **Lagrange polynomial** the data have more than 60 points. |
| Due punti hanno la stessa x (…) ("Two points have the same x (…)") | In the data the same x is there twice. |
| x = … è fuori dai dati (da … a …) ("x = … is outside the data (from … to …)") | The point asked for is outside the interval of the data and **Allow x outside the data** is off. |
| x: serve un numero ("x: a number is needed") | The value **x** is empty or not a number. |
| x: serve un numero (o un'espressione come pi/2), non «…» ("x: a number is needed (or an expression like pi/2), not «…»") | The value **x** is a text that is neither a number nor an expression of numbers (for example `abc`). |
| x: l'infinito non è ammesso qui ("x: infinity is not allowed here") | The value **x** is `inf` or `∞`. |
| La lista delle x ha più di 10000 elementi ("The list of the x has more than 10000 items") | The point is a list that is too long. |
| Nome di variabile non valido: «…» ("Invalid variable name: «…»") | A variable name is not good (it must start with a letter or `_`, at most 16 characters; it cannot be a function or `pi` or `e`). |

## See also

- [Regression (fit)](num.fit) for a curve that passes near the points without touching all of them
- [Sample f](num.sample) to get data from a function
- [Resample](sig.resample) to resample a signal
- [Scatter](charts.scatter) to draw the points
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
