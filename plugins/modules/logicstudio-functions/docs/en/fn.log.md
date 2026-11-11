# Logarithms (Math.log)

`fn.log` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The logarithms: natural, base 10, base 2, a base of your choice, and ln(1 + x) precise near 0.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The number. It must be greater than 0 (for **ln(1 + x)**: greater than −1). |
| **b (base)** (`b`) | number | The base, for **log_b x**. The other functions do not use it and the block does not wait for it. Hidden by default: show it with the eye in the Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The result, rounded to 15 significant digits. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`base`) | `ln` ln x (natural); `log10` log₁₀ x; `log2` log₂ x; `b` log_b x (the **b** input); `log1p` ln(1 + x) | `ln` | Which logarithm to compute. |

## How it works

At every value that arrives on **x** the block computes the chosen logarithm. With **log_b x** it also waits for the base **b**, which must be greater than 0 and different from 1 (the result is ln x / ln b); the **b** input is hidden by default.

**ln(1 + x)** is computed with a formula that stays precise when x is near 0: with x = 10⁻¹⁰ it gives `9.9999999995e-11`.

In functions written as a text (for example in [Evaluate f(x)](fn.eval)) `ln` is the natural logarithm, `log` is the base 10 one and `log(b, x)` is the base b one.

## Examples

### 1. Natural logarithm

Function **ln x**, **x** = 2.718281828459045 (the number e): the result is `1`.

```
[Constant · Variable: 1000] value ──▶ x [Logarithms: log₁₀ x] result ──▶ value [Print (console.log)]
```

With **log₁₀ x** it writes `3`.

### 2. Other bases

**log₂ x** with 8 gives `3`; **log_b x** with **x** = 81 and **b** = 3 gives `4`; **log₁₀ x** with 0.5 gives `-0.301029995663981`.

### 3. Near zero

**ln(1 + x)** with **x** = 10⁻¹⁰ gives `9.9999999995e-11`.

### 4. When it does not work

**ln x** with 0: "Il logaritmo vuole x > 0" (the logarithm wants x > 0). **ln(1 + x)** with −1: "ln(1 + x) vuole x > −1". **log_b x** with **b** = 1: "La base del logaritmo deve essere maggiore di 0 e diversa da 1" (the base of the logarithm must be greater than 0 and different from 1).

## Errors

| Message | When |
|---|---|
| x: serve un numero ("x: a number is needed") | **x** is not a number (for example a text like `"abc"`). |
| b: serve un numero ("b: a number is needed") | The base **b** is not a number. |
| Il logaritmo vuole x > 0 ("The logarithm wants x > 0") | **x** is 0 or negative (with ln, log₁₀, log₂ and log_b). |
| ln(1 + x) vuole x > −1 ("ln(1 + x) wants x > −1") | **x** is −1 or less with **ln(1 + x)**. |
| La base del logaritmo deve essere maggiore di 0 e diversa da 1 ("The base of the logarithm must be greater than 0 and different from 1") | **log_b x** with **b** ≤ 0 or **b** = 1. |

## See also

- [Exponentials](fn.exp) for the inverse function
- [Powers and roots](fn.power) for xⁿ and ⁿ√x
- [Math functions](core.math) for the other functions of numbers
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
