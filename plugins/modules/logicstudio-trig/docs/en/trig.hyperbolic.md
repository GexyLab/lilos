# Hyperbolic functions (Math.sinh, Math.cosh…)

`trig.hyperbolic` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Computes a hyperbolic function (sine, cosine, tangent, cotangent, secant, cosecant) or one of its inverses.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x** (`x`) | number | The number to work on. A text with a number (`"0.5"`) is fine. It is not an angle: there are no units here. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the function. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. The value is not a number, is out of domain, or the result is too large. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`fn`) | sinh, cosh, tanh, coth, sech, csch, asinh, acosh, atanh, acoth, asech, acsch | sinh | Which function to compute. |

## How it works

At every value that arrives the block computes the function and sends the result on **value**.

| Function | Name | Accepted values |
|---|---|---|
| **sinh** | hyperbolic sine | any |
| **cosh** | hyperbolic cosine | any |
| **tanh** | hyperbolic tangent | any |
| **coth** | hyperbolic cotangent | all except 0 |
| **sech** | hyperbolic secant | any |
| **csch** | hyperbolic cosecant | all except 0 |
| **asinh** | inverse hyperbolic sine | any |
| **acosh** | inverse hyperbolic cosine | 1 or more |
| **atanh** | inverse hyperbolic tangent | between −1 and 1, excluded |
| **acoth** | inverse hyperbolic cotangent | less than −1 or more than 1 |
| **asech** | inverse hyperbolic secant | more than 0 and at most 1 |
| **acsch** | inverse hyperbolic cosecant | all except 0 |

- These are functions of any number, not of an angle: that is why the block has no **Unit** setting.
- sinh and cosh grow fast: from about 710 up the result is too large for the computer and the block gives an error instead of an infinite number.
- The result is rounded to **15 significant digits**.

## Examples

### 1. The hyperbolic sine of 1

```
[Constant · Variable: 1] value ──▶ x [Hyperbolic functions: sinh] value ──▶ value [Print (console.log)]
```

Writes `1.1752011936438`.

### 2. The hyperbolic tangent of 0.5

Function **tanh**, x = 0.5: writes `0.46211715726001`.

### 3. The inverse hyperbolic cosine of 2

Function **acosh**, x = 2: writes `1.31695789692482`. The function **asech** with x = 0.5 gives the same number.

### 4. A value out of domain

Function **atanh**, x = 1: error `atanh vuole un valore tra −1 e 1 esclusi`.

### 5. A number that is too large

Function **sinh**, x = 1000: error `sinh(1000) è troppo grande`.

## Errors

| Message | When |
|---|---|
| x: serve un numero ("x: a number is needed") | x is not a number. |
| coth non è definita per x = 0 ("coth is not defined for x = 0") | **coth** with x = 0. |
| csch non è definita per x = 0 ("csch is not defined for x = 0") | **csch** with x = 0. |
| acsch non è definita per x = 0 ("acsch is not defined for x = 0") | **acsch** with x = 0. |
| acosh vuole un valore maggiore o uguale a 1 ("acosh wants a value greater than or equal to 1") | **acosh** with x less than 1. |
| atanh vuole un valore tra −1 e 1 esclusi ("atanh wants a value between −1 and 1, excluded") | **atanh** with x less than or equal to −1, or greater than or equal to 1. |
| acoth vuole un valore minore di −1 o maggiore di 1 ("acoth wants a value less than −1 or more than 1") | **acoth** with x between −1 and 1 (included). |
| asech vuole un valore maggiore di 0 e al massimo 1 ("asech wants a value more than 0 and at most 1") | **asech** with x less than or equal to 0, or more than 1. |
| sinh(1000) è troppo grande ("sinh(1000) is too large") | The result does not fit in a number (for example **sinh** or **cosh** of 1000). The function name and the value change. |

## See also

- [Trigonometric functions (Math.sin, Math.cos…)](trig.fn) for the functions of an angle
- [Inverse functions (Math.asin, Math.acos…)](trig.inverse)
- [Math functions](core.math) for logarithm and exponential
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
