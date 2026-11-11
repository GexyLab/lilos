# Exponentials (Math.exp)

`fn.exp` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The exponential functions: eˣ, 2ˣ, 10ˣ, aˣ with a base of your choice, and eˣ − 1 precise near 0.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The exponent. |
| **a (base)** (`a`) | number | The base, for **aˣ**. The other functions do not use it and the block does not wait for it. Hidden by default: show it with the eye in the Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The result, rounded to 15 significant digits. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`base`) | `e` eˣ; `two` 2ˣ; `ten` 10ˣ; `a` aˣ (the **a** input); `expm1` eˣ − 1 | `e` | Which function to compute. |

## How it works

At every value that arrives on **x** the block computes the chosen function. With **aˣ** it also waits for the base **a**, which must be greater than 0; the **a** input is hidden by default and is used only with that function.

**eˣ − 1** is computed with a formula that stays precise when x is very close to 0: `eˣ - 1` computed by hand with x = 10⁻¹⁰ would lose almost all the digits, the block gives `1.00000000005e-10`.

A result too big for the computer (for eˣ, x over about 709) is an error. For the inverse function see [Logarithms](fn.log).

## Examples

### 1. e to the 1

Function **eˣ**, **x** = 1:

```
[Constant · Variable: 1] value ──▶ x [Exponentials: eˣ] result ──▶ value [Print (console.log)]
```

Writes `2.71828182845905`.

### 2. Other bases

**2ˣ** with 10 gives `1024`; **10ˣ** with −3 gives `0.001`; **aˣ** with **x** = 3 and **a** = 2 gives `8`.

### 3. Near zero

**eˣ − 1** with **x** = 10⁻¹⁰ (`1e-10`) gives `1.00000000005e-10`.

### 4. When it does not work

**aˣ** with **a** = 0: "La base a deve essere maggiore di 0" (the base a must be greater than 0). **eˣ** with **x** = 1000: "Il risultato è troppo grande" (the result is too big).

## Errors

| Message | When |
|---|---|
| x: serve un numero ("x: a number is needed") | **x** is not a number (for example a text like `"abc"`). |
| a: serve un numero ("a: a number is needed") | The base **a** is not a number. |
| La base a deve essere maggiore di 0 ("The base a must be greater than 0") | **aˣ** with **a** zero or negative. |
| Il risultato è troppo grande ("The result is too big") | The result is not a finite number (it is over the largest number of the computer, about 10³⁰⁸). |

## See also

- [Logarithms](fn.log) for the inverse function
- [Exponential growth and decay](fn.growth) for N₀·e^(k·t)
- [Powers and roots](fn.power) for xⁿ
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
