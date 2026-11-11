# Regression (fit)

`num.fit` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Finds the curve that **best approximates** the data (least squares regression): a line, a polynomial, an exponential, a logarithm or a power. It gives the coefficients, the curve as a function, how well it fits (R²) and, if needed, a predicted value.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | list | The list of the x. If missing, the x are 0, 1, 2… |
| **y** (`y`) | list | The list of the y, or a list of points `{x, y}` or `[x, y]`. |
| **at** (`at`) | number | An x where to give the value of the curve. If it is not linked, the **x for the value** setting is used. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **coefficients** (`coefficients`) | list | The coefficients of the curve (see **How it works**). |
| **f (function)** (`f`) | text | The curve as a text function, to link to other blocks. |
| **R²** (`r2`) | number | R², from 0 to 1: 1 means the curve passes through all the points, 0 that it explains nothing. |
| **RMS error** (`rmse`) | number | The root-mean-square error: the typical distance between the data and the curve, in the units of y. |
| **value at x** (`prediction`) | number | The value of the curve at the x asked for (it only comes out if there is an x). |
| **residuals** (`residuals`) | list | The differences between the data and the curve, one per point. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Model** (`model`) | Linear: y = a·x + b / Polynomial of degree n / Exponential: y = a·e^(b·x) / Logarithmic: y = a + b·ln x / Power: y = a·x^b | Linear: y = a·x + b | The family of curves. **Linear** `y = a·x + b`; **Polynomial** of degree n; **Exponential** `y = a·e^(b·x)`; **Logarithmic** `y = a + b·ln x`; **Power** `y = a·x^b`. |
| **Degree n** (`degree`) | number (from 1 to 12) | `2` | The degree of the polynomial (from 1 to 12). |
| **Variable of the function** (`variable`) | a text | `x` | The name of the variable in the text function. |
| **x for the value (empty: none)** (`at`) | a text (number or expression, or empty) | empty | An x to give the value for (empty: none), when **at** is not linked. |

## How it works

The block waits until all the linked inputs have a value and computes at every new value; it does not start by itself when the schema starts.

- **Coefficients**: linear `[a, b]` for `a·x + b`; polynomial from the highest degree, `[c₂, c₁, c₀]`; exponential `[a, b]`; logarithmic `[a, b]` for `a + b·ln x`; power `[a, b]`. Negligible coefficients (one in a thousand billion of the biggest) are set to 0.
- Exponential, logarithmic and power are computed with logarithms, so they want positive data.
- At least as many points as coefficients are needed; with a high degree the results can be unstable.
- A high R² does not say that the model is right: look at the **residuals** too.

## Examples

### 1. A line

The points (0, 1), (1, 3), (2, 5), (3, 7):

```
[Constant · Variable (JSON): [0, 1, 2, 3]] ──▶ x [Regression]
[Constant · Variable (JSON): [1, 3, 5, 7]] ──▶ y
```

**coefficients** `[2, 1]`, **f** `2 * x + 1`, **R²** `1`.

### 2. Noisy data and a prediction

y = `[1, 3, 2, 5]` for x = `[0, 1, 2, 3]`, **x for the value** 4:

```
[Regression: linear, x for the value 4] prediction ──▶ value [Print (console.log)]
```

The line is `1.1 * x + 1.1`, R² = 0.69 and the predicted value at 4 is `5.5`.

### 3. A parabola

The points of `x² + 1` at 0…3, **Polynomial** of degree 2:

```
[Regression: polynomial, degree 2] f ──▶ f [Sample f]
```

**coefficients** `[1, 0, 1]`, **f** `x^2 + 1`.

## Errors

| Message | When |
|---|---|
| Servono dei dati: una lista di numeri o di punti ("Data are needed: a list of numbers or of points") | The input is not a list. |
| Le liste x e y hanno lunghezze diverse (… e …) ("The lists x and y have different lengths (… and …)") | The two lists do not have the same number of items. |
| Serve una lista di numeri per le x ("A list of numbers is needed for the x") | The **x** input is not a list. |
| Servono almeno 2 punti ("At least 2 points are needed") | After removing the items that are not numbers fewer than 2 points are left. |
| Il modello esponenziale vuole tutte le y maggiori di zero ("The exponential model wants all the y greater than zero") | With **Exponential** a y is zero or negative. |
| Il modello logaritmico vuole tutte le x maggiori di zero ("The logarithmic model wants all the x greater than zero") | With **Logarithmic** an x is zero or negative. |
| Il modello a potenza vuole tutte le x e le y maggiori di zero ("The power model wants all the x and the y greater than zero") | With **Power** an x or a y is zero or negative. |
| Grado: da 1 a 12 ("Degree: from 1 to 12") | The **Degree n** setting is not an integer between 1 and 12. |
| Servono almeno … punti per questo modello (ce ne sono …) ("At least … points are needed for this model (there are …)") | The points are fewer than the coefficients of the model (degree + 1). |
| I punti non bastano a determinare il modello ("The points are not enough to determine the model") | The points are too much alike (for example the same x for all). |
| x: serve un numero ("x: a number is needed") | The value **x** is empty or not a number. |
| x: serve un numero (o un'espressione come pi/2), non «…» ("x: a number is needed (or an expression like pi/2), not «…»") | The value **x** is a text that is neither a number nor an expression of numbers (for example `abc`). |
| Nome di variabile non valido: «…» ("Invalid variable name: «…»") | A variable name is not good (it must start with a letter or `_`, at most 16 characters; it cannot be a function or `pi` or `e`). |

## See also

- [Interpolation](num.interpolate) for a curve that passes through all the points
- [Evaluate f(x)](fn.eval) to compute the curve found at a point
- [Sample f](num.sample) to draw the curve found
- [Scatter](charts.scatter) to draw the points and the curve
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
