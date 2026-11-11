# Powers and roots (Math.pow, Math.sqrt)

`fn.power` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Powers and roots of a number: xⁿ, the n-th root, the square, the cube, the square root, the cube root, the reciprocal.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The number. |
| **n (exponent or index)** (`n`) | number | The exponent (for **xⁿ**) or the index of the root (for **ⁿ√x**). The other operations do not use it and the block does not wait for it. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The result, rounded to 15 significant digits. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | `pow` xⁿ; `root` n-th root ⁿ√x; `square` x²; `cube` x³; `sqrt` √x; `cbrt` ∛x; `reciprocal` 1/x | `pow` | The operation. |

## How it works

At every value that arrives the block does the chosen operation. For xⁿ and ⁿ√x it also waits for **n**.

- **xⁿ**: the power. A negative number with a non-integer exponent (`(-8)^0.5`) has no real result: error.
- **ⁿ√x**: the root of index **n**, that is x raised to 1/n. A negative number has a root only with an **odd** integer **n** (`ⁿ√-27` with n = 3 gives −3). Index 0 does not exist.
- **√x**: the number must be 0 or more. **∛x**: it is fine for negative numbers too (∛−27 = −3).
- **1/x**: for 0 it gives an error.
- **0** with a **negative** exponent (`0^-1`) is a division by 0: error.
- A result too big for the computer (over about 10³⁰⁸) is an error, not an infinity.
- For powers inside a function written as a text you do not need this block: expressions already have `^`.

## Examples

### 1. 2 to the 10

Operation **xⁿ**, **x** = 2 and **n** = 10:

```
[Constant · Variable: 2] value ──▶ x [Powers and roots] result ──▶ value [Print (console.log)]
[Constant · Variable: 10] value ──▶ n
```

Writes `1024`.

### 2. Roots

Operation **ⁿ√x**: **x** = 27, **n** = 3 gives `3`; **x** = −27, **n** = 3 gives `-3`. Operation **√x** with 2 gives `1.4142135623731`; **∛x** with −27 gives `-3`.

### 3. Square, cube, reciprocal

**x²** with 1.5 gives `2.25`; **x³** with −3 gives `-27`; **1/x** with 4 gives `0.25`.

### 4. The errors

**xⁿ** with **x** = −8 and **n** = 0.5: "Potenza di un numero negativo con esponente non intero: il risultato non è reale" (power of a negative number with a non-integer exponent: the result is not real). **√x** with −2: "La radice quadrata di un numero negativo non è reale" (the square root of a negative number is not real). **xⁿ** with **x** = 0 and **n** = −1: "0 elevato a un esponente negativo non esiste (è una divisione per 0)" (0 raised to a negative exponent does not exist: it is a division by 0). **1/x** with 0: "Il reciproco di 0 non esiste" (the reciprocal of 0 does not exist).

## Errors

| Message | When |
|---|---|
| x: serve un numero ("x: a number is needed") | **x** is not a number (for example a text like `"abc"`). |
| n: serve un numero ("n: a number is needed") | **n** is not a number. |
| Potenza di un numero negativo con esponente non intero: il risultato non è reale ("Power of a negative number with a non-integer exponent: the result is not real") | **xⁿ** with a negative **x** and a non-integer **n**. |
| L'indice della radice non può essere 0 ("The index of the root cannot be 0") | **ⁿ√x** with **n** = 0. |
| La radice di indice pari di un numero negativo non è reale ("The even-index root of a negative number is not real") | **ⁿ√x** with a negative **x** and an even or non-integer **n**. |
| La radice quadrata di un numero negativo non è reale ("The square root of a negative number is not real") | **√x** with a negative **x**. |
| Il reciproco di 0 non esiste ("The reciprocal of 0 does not exist") | **1/x** with **x** = 0. |
| 0 elevato a un esponente negativo non esiste (è una divisione per 0) ("0 raised to a negative exponent does not exist (it is a division by 0)") | **xⁿ** with **x** = 0 and a negative **n**. |
| Il risultato è troppo grande ("The result is too big") | The result is not a finite number (it is over the largest number of the computer, about 10³⁰⁸). |

## See also

- [Exponentials](fn.exp) for eˣ, 2ˣ, 10ˣ and aˣ
- [Logarithms](fn.log) for the inverse operation
- [Math functions](core.math) for the other functions of numbers
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
