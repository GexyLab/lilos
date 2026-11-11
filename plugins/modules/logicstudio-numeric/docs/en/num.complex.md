# Complex numbers

`num.complex` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Does calculations with **complex numbers**: sum, product, division, power, root, conjugate, exponential, logarithm, sine, cosine, and converts to and from the polar form. It gives the real and imaginary part, the modulus and the argument.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** (`a`) | any | The first number: `3+4i`, `-2j`, `i`, a number, an object `{re, im}` or a list `[re, im]`. If it is not linked, the **a** setting is used. |
| **b** (`b`) | any | The second number (for the operations on two numbers; with **from polar**, the angle). If it is not linked, the **b** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result {re, im}** (`result`) | object | The result as an object `{re, im}`. |
| **as text** (`text`) | text | The result as text (`4+2i`). |
| **re** (`re`) | number | The real part. |
| **im** (`im`) | number | The imaginary part. |
| **modulus** (`modulus`) | number | The modulus (the distance from the origin). |
| **argument (rad)** (`argument`) | number | The argument, that is the angle, in radians between −π and π. |
| **polar {r, theta}** (`polar`) | object | The polar form `{r, theta}`. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | a + b / a − b / a × b / a ÷ b / a ^ b / b-th root of a / conjugate of a / −a / 1 ÷ a / √a / e^a / ln a / sin a / cos a / a as it is (modulus, argument…) / from polar: modulus a, angle b | a + b | The operation: `a + b`, `a − b`, `a × b`, `a ÷ b`, `a ^ b`, the b-th root, the conjugate, `−a`, `1 ÷ a`, `√a`, `e^a`, `ln a`, `sin a`, `cos a`, **a as it is** (to get only the modulus and the argument) or **from polar** (modulus a and angle b in radians). |
| **a (when the input is not linked)** (`a`) | a text (a complex number) | `3+4i` | The first number, when the **a** input is not linked. |
| **b (when the input is not linked)** (`b`) | a text (a complex number) | `1-2i` | The second number, when the **b** input is not linked. |

## How it works

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

- Complex numbers are written with `i` or `j` (`3+4i`, `-2j`, `i`, `1.5-2i`), with a single number (the real part) or with an object or a list; decimal commas count as points.
- The operations on a single number (conjugate, square root, exponential…) use only **a**.
- Values smaller than a millionth of a billionth of the biggest one are set to 0, so `i^2` gives exactly `-1`.
- **b-th root** gives the principal root (the one with the smallest angle).

## Examples

### 1. A product

`(3+4i) × (1−2i)`:

```
[Complex numbers: a × b, 3+4i, 1-2i] text ──▶ value [Print (console.log)]
```

Writes `11-2i`.

### 2. Modulus and argument

**a as it is** with `3+4i`:

```
[Complex numbers: a as it is, 3+4i] modulus ──▶ value [Print (console.log)]
```

Writes `5`; the argument is 0.9272952180016122.

### 3. Euler's identity

`e^(iπ)` with **a** = `[0, 3.141592653589793]` (the list `[re, im]`):

```
[Complex numbers: e^a] text ──▶ value [Print (console.log)]
```

Writes `-1`.

## Errors

| Message | When |
|---|---|
| Non è un numero complesso: «…» ("It is not a complex number: «…»") | A value cannot be read as a complex number (write `3+4i`, `-2j`, `i`, a number, `{re, im}` or `[re, im]`). |
| Numero complesso non valido ("Invalid complex number") | A text is longer than 80 characters. |
| Un numero complesso deve avere parti finite ("A complex number must have finite parts") | A number is infinite. |
| Divisione per zero ("Division by zero") | A division by 0 (`a ÷ 0`, `1 ÷ 0`, the 0-th root). |
| Il logaritmo di 0 non esiste ("The logarithm of 0 does not exist") | With **ln a**, a is 0. |
| Il risultato non è un numero finito ("The result is not a finite number") | The result is beyond the representable numbers (for example `e^1000`). |
| Modulo: serve un numero ("Modulus: a number is needed") | The value **Modulus** is empty or not a number. |
| Angolo: serve un numero ("Angle: a number is needed") | The value **Angle** is empty or not a number. |

## See also

- [Quadratic equation ax² + bx + c = 0](fn.quadratic) which gives the complex solutions of a quadratic equation
- [Polynomial: value and roots](fn.poly) which gives the complex roots of a polynomial
- [FFT (np.fft.fft)](sig.fft) which gives the spectrum of a signal (modulus and phase)
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
