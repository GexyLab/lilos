# Polynomial: value and roots

`fn.poly` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

A polynomial given by its coefficients: it computes its value at one or more points and finds **all the roots**, also complex ones.

## Inputs

| Port | Type | Description |
|---|---|---|
| **coefficients** (`coefficients`) | list | The coefficients, in a list of numbers, in the order chosen in **Coefficients**. At most 101 (degree 100). |
| **x (number or list)** (`x`) | any | The point, or a list of points, where to compute the polynomial. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **p(x)** (`value`) | any | The value p(x): a number, or a list if **x** is a list. |
| **roots {re, im}** (`roots`) | list | All the roots, one for each degree (double ones twice), as a list of `{re, im}`, in order of real part. |
| **real roots** (`real`) | list | The real roots, without repetitions, in increasing order. |
| **degree** (`degree`) | number | The degree of the polynomial. Hidden by default: show it with the eye in the Properties. |
| **expression** (`expression`) | text | The polynomial written as a text, for example `x^3 - 6x^2 + 11x - 6`. It can be linked to **f** of the function blocks. Hidden by default: show it with the eye in the Properties. |
| **derivative coefficients** (`derivative`) | list | The coefficients of the derivative, in the same order as the input ones. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Coefficients** (`order`) | `high` From the highest power ([1, -3, 2] = x² − 3x + 2); `low` From the constant term ([2, -3, 1] = 2 − 3x + x²) | `high` | In which order the coefficients of the list come. |

## How it works

The coefficients arrive in a list of numbers. With the order **From the highest power** the list `[1, -3, 2]` is `x² − 3x + 2`; with **From the constant term** the list `[2, -3, 1]` is the same polynomial. Highest coefficients equal to 0 (`[0, 1, 2]` from the highest power) are removed.

- **The value** is computed with Horner's method and rounded to 15 significant digits.
- **The roots**: for degree 1 and 2 the closed formula is used; from degree 3 the **Aberth–Ehrlich** method, which finds all the roots together, also complex ones, starting from points spread on a circle. Very small real or imaginary parts (below 10⁻¹³, 10⁻¹⁰ in proportion) become 0. Multiple roots are found but with less precision.
- A constant polynomial (`[5]`) has no roots: **roots** and **real roots** are empty lists. The zero polynomial (`[0]`) has infinite roots: error.
- If only a new **x** arrives, the block recomputes only **p(x)**; if the coefficients arrive, it recomputes everything.
- The block does not start by itself at the start.

## Examples

### 1. A polynomial of degree 3

`x³ − 6x² + 11x − 6`, list `[1, -6, 11, -6]` (from the highest power), **x** = 2:

```
[Constant · Variable (list): 1, -6, 11, -6] value ──▶ coefficients [Polynomial: value and roots] real roots ──▶ value [Print (console.log)]
```

Writes `[1,2,3]`. On the other outputs: **p(x)** = 0, **degree** = 3, **expression** = `x^3 - 6x^2 + 11x - 6`, **derivative coefficients** = `[3,-12,11]`.

### 2. A list of points

Same polynomial, **x** = `[0, 1, 4]`: **p(x)** is `[-6,0,6]`.

### 3. Complex roots

`x² + 1`, list `[1, 0, 1]`: **roots {re, im}** is `[{"re":0,"im":-1},{"re":0,"im":1}]` and **real roots** is `[]`.

### 4. From the constant term

Order **From the constant term**, list `[2, -3, 1]`: **expression** is `x^2 - 3x + 2`, **real roots** is `[1,2]`, **derivative coefficients** is `[-3,2]`.

### 5. Degree 4

`x⁴ − 1`, list `[1, 0, 0, 0, -1]`: **real roots** is `[-1,1]` and the four roots are −1, −i, i, 1.

## Errors

| Message | When |
|---|---|
| La lista dei coefficienti deve essere una lista ("The list of the coefficients must be a list") | A value that is not a list arrives on **coefficients**. |
| La lista dei coefficienti ha più di 10000 elementi ("The list of the coefficients has more than 10000 elements") | The list is too long (and anyway the limit is degree 100). |
| La lista dei coefficienti è vuota ("The list of the coefficients is empty") | The list has no elements. |
| Al massimo il grado 100 ("At most degree 100") | The list has more than 101 coefficients. |
| coefficienti, elemento N: serve un numero ("coefficients, element N: a number is needed") | Element number N of the list is not a number. |
| Il polinomio nullo ha infinite radici ("The zero polynomial has infinite roots") | All the coefficients are 0. |
| x: serve un numero ("x: a number is needed") | **x** (or one of its elements) is not a number. |
| La lista delle x ha più di 10000 elementi ("The list of the x has more than 10000 elements") | The list of points is too long. |

## See also

- [Operations on polynomials](fn.polyOps) for sum, product, division, GCD, derivative and integral
- [Quadratic equation](fn.quadratic) for degree 2
- [Solve f(x) = 0](fn.solve) for any function
- [List [ ]](core.list) to write the list of the coefficients
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
