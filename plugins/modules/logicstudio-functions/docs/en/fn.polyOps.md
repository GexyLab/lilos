# Operations on polynomials

`fn.polyOps` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The operations between polynomials given by their coefficients: sum, difference, product, division with remainder, GCD, derivative and integral.

## Inputs

| Port | Type | Description |
|---|---|---|
| **p (coefficients)** (`p`) | list | The first polynomial: the list of the coefficients, in the order chosen in **Coefficients**. |
| **q (coefficients)** (`q`) | list | The second polynomial, like **p**. For **derivative** and **integral** it is not needed and the block does not wait for it. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The coefficients of the result, in the same order as the input ones. For the division it is the **quotient**. |
| **remainder** (`remainder`) | list | The remainder of the division (only with **p ÷ q**). Hidden by default: show it with the eye in the Properties. |
| **expression** (`expression`) | text | The result written as a text, for example `x^2 - 1`. It can be linked to **f** of the function blocks. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | `add` p + q; `sub` p − q; `mul` p · q; `div` p ÷ q (quotient and remainder); `gcd` GCD of p and q; `derivative` derivative of p; `integral` integral of p (constant 0) | `mul` | The operation to do. |
| **Coefficients** (`order`) | `high` From the highest power ([1, -3, 2] = x² − 3x + 2); `low` From the constant term ([2, -3, 1] = 2 − 3x + x²) | `high` | In which order the coefficients come, in input and in output. |

## How it works

The polynomials arrive as lists of coefficients: with **From the highest power** `[1, -3, 2]` is `x² − 3x + 2`, with **From the constant term** it is `[2, -3, 1]`. The result comes out in the same order. The block runs when **p** arrives (and **q**, if the operation wants it) and waits until the polynomials it needs have arrived. Each polynomial can go up to degree 100.

- **Sum and difference**: coefficient by coefficient. If everything cancels the result is `[0]`.
- **Product**: the degree is the sum of the degrees.
- **Division**: division with remainder between polynomials; the quotient goes on **result** and the remainder on **remainder**, so that p = quotient · q + remainder. Very small coefficients in the remainder (less than 10⁻¹² of the biggest of p) become 0. Dividing by the zero polynomial is an error.
- **GCD**: Euclid's algorithm; the result is **monic** (the highest coefficient is 1). If they have no factor in common the GCD is `[1]`.
- **Derivative**: the derivative of p (of a constant: `[0]`).
- **Integral**: an antiderivative of p with constant 0: the coefficients are divided by 1, 2, 3…
- Highest coefficients equal (or almost equal) to 0 are removed from the result.
- The block does not start by itself at the start.

## Examples

### 1. A product

Operation **p · q**, **p** = `[1, 1]` (x + 1), **q** = `[1, -1]` (x − 1): **result** is `[1,0,-1]`, **expression** is `x^2 - 1`.

### 2. A division

Operation **p ÷ q**, **p** = `[1, 2, 3]` (x² + 2x + 3), **q** = `[1, 1]` (x + 1): **result** (the quotient) is `[1,1]` and **remainder** is `[2]`: x² + 2x + 3 = (x + 1)(x + 1) + 2. With **p** = `[1, 0, -1]` and the same **q** the remainder is `[0]` and the quotient `[1,-1]`.

### 3. The greatest common divisor

Operation **GCD**, **p** = `[1, -3, 2]` (x² − 3x + 2) and **q** = `[1, -1]` (x − 1): **result** is `[1,-1]`, that is x − 1.

### 4. Derivative and integral

Operation **derivative**, **p** = `[1, 0, -3, 5]`: **result** `[3,0,-3]`, **expression** `3x^2 - 3`. Operation **integral**, **p** = `[3, 2, 1]`: **result** `[1,1,1,0]`, **expression** `x^3 + x^2 + x`.

### 5. A sum

Operation **p + q**, **p** = `[1, 2, 3]`, **q** = `[1, 1]`: **result** `[1,3,4]`, **expression** `x^2 + 3x + 4`. With **p − p** the result is `[0]`.

## Errors

| Message | When |
|---|---|
| La lista dei coefficienti di p deve essere una lista ("The list of the coefficients of p must be a list") | A value that is not a list arrives on **p** (or on **q**: the message says "di q"). |
| La lista dei coefficienti di p ha più di 10000 elementi ("The list of the coefficients of p has more than 10000 elements") | The list is too long. |
| La lista dei coefficienti di p è vuota ("The list of the coefficients of p is empty") | The list has no elements. |
| Al massimo il grado 100 ("At most degree 100") | A list has more than 101 coefficients. |
| coefficienti di p, elemento N: serve un numero ("coefficients of p, element N: a number is needed") | Element number N of the list is not a number. |
| Divisione per il polinomio nullo ("Division by the zero polynomial") | Operation **p ÷ q** with **q** = `[0]`. |

## See also

- [Polynomial: value and roots](fn.poly) for the value and the roots
- [Derivative (symbolic)](fn.derivative) to differentiate a function written as an expression
- [Antiderivative (indefinite integral)](int.primitive) for the antiderivative of a function written as an expression
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
