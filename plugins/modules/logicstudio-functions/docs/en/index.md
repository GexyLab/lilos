# Functions and derivatives

`logicstudio-functions` · requires the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for **functions** and **differential calculus**: computing a function written as a formula (`3x^2 + 2sin(x) - ln(x)`), making its table, finding its roots, solving equations and polynomials, powers, exponentials and logarithms, and then **derivatives** (symbolic and numeric), the tangent line, limits, the Taylor polynomial and the study of a function.

## How to install

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-functions` ("Logic Studio: the blocks for algebraic, exponential and logarithmic functions and differential calculus…"). If the engine is missing, the AppStore installs it too. After the installation the blocks show in the **Blocks** tab of the IDE, in the **Functions** category.

A project that uses these blocks on a lilOS where the package is not installed shows the blocks with **Package missing**, and a running program waits until the package is back.

## The blocks

### Functions

| Block | What it does |
|---|---|
| [Function f(x)](fn.define) | Gives a value to the parameters of a function (`a x^2 + b`) and sends it, simplified, to the other blocks. |
| [Evaluate f(x)](fn.eval) | The value of the function at a point or at a list of points. |
| [Table of values](fn.table) | The function on many points between two ends, ready for a chart. |
| [Solve f(x) = 0](fn.solve) | A root of the function, with Brent's or Newton's method. |

### Algebraic

| Block | What it does |
|---|---|
| [Quadratic equation ax² + bx + c = 0](fn.quadratic) | The two solutions, also complex, the discriminant and the vertex. |
| [Polynomial: value and roots](fn.poly) | The value of a polynomial and all its roots, also complex. |
| [Operations on polynomials](fn.polyOps) | Sum, product, division with remainder, GCD, derivative and integral. |
| [Powers and roots (Math.pow, Math.sqrt)](fn.power) | xⁿ, n-th root, square, cube, √, ∛, 1/x. |

### Exponentials and logarithms

| Block | What it does |
|---|---|
| [Exponentials (Math.exp)](fn.exp) | eˣ, 2ˣ, 10ˣ, aˣ, eˣ − 1. |
| [Logarithms (Math.log)](fn.log) | ln, log₁₀, log₂, log in a base of your choice, ln(1 + x). |
| [Exponential growth and decay](fn.growth) | N(t) = N₀·e^(k·t) from the rate or from the half-life or doubling time. |

### Differential calculus

| Block | What it does |
|---|---|
| [Derivative (symbolic)](fn.derivative) | The derivative as a function, up to the 10th order. |
| [Derivative at a point f'(x)](fn.derivativeAt) | The value of the derivative at a point, exact or numeric, up to the 4th order. |
| [Tangent line](fn.tangent) | Slope, intercept and equations of the tangent and of the normal. |
| [Limit (numeric)](fn.limit) | The limit at a point or at infinity, with the two sides. |
| [Taylor polynomial](fn.taylor) | The approximation with a polynomial, up to the 12th order. |
| [Study of a function](fn.study) | Zeros, maxima, minima, inflection points, increasing and decreasing in an interval. |
| [Rate of change of a signal (d/dt)](fn.signalDerivative) | The rate of change of a measure over time. |

The blocks that start by themselves when the schema starts, when nothing is linked to their inputs, are **Function f(x)**, **Table of values**, **Solve f(x) = 0**, **Derivative (symbolic)** and **Study of a function**: they use their settings.

## Expressions

A function travels as a **text**: an expression like `3x^2 + 2sin(x) - ln(x)`. Every block that has an input **f** takes it from there or, when **f** is not linked, from the **Function** setting of the block. The package has an expression reader of its own: no `eval`, no libraries.

### Numbers and operators

- Numbers are written **with a dot**: `2.5`, `.5`, `1e-3`. The comma does not work (`1,5` is an error).
- The operations: `+`, `-` (also `−`), `*` (also `·` and `×`), `/` (also `÷`), `^` (also `**`) and the powers `²` and `³` (`x²` is `x^2`). Parentheses are round.
- `^` reads from the right: `x^2^3` is `x^(2^3)`, that is `x^8`. A minus in front is applied after the power: `-x^2` is `-(x^2)`. A sign can follow `^`: `2^-1`.
- The constants are `pi` (also `π`) and `e`. They cannot be the variable.
- **Angles are always in radians**: `sin(pi/2)` is 1. For degrees use [Angle](unit.angle) of the package [Quantities and units](logicstudio-units).

### Implicit product

The `*` sign can be left out between a number, a name or a parenthesis and what follows: `3x`, `2(x+1)`, `(x+1)(x-1)`, `x sin(x)`, `2 pi x`, `x y`. Two things to watch:

- A **number after a name or a parenthesis** is not a product: `x 3` and `(x)3` are errors (write `3x`).
- A name **followed by a parenthesis** is read as a function: `x(2)` gives "`x` is not a known function". Write `x*(2)` or `(2)x`.

### Names

A name is made of letters, digits and `_`, starts with a letter or `_` and can end with apostrophes (`y'` and `y''` are names). Upper and lower case are different. A name that is neither a function nor a constant is a **variable** or a **parameter** (see below).

### Functions

A function is written with parentheses (`sin(x)`, `max(1, x)`). For functions with **one argument** the parentheses can be left out: the name applies to the **factor** that follows, that is a number, a name, a parenthesis or a power.

| Written | Read as | Why |
|---|---|---|
| `sin x^2` | `sin(x^2)` | the power is one factor |
| `sin x cos x` | `sin(x) * cos(x)` | each function takes its own factor |
| `sqrt x + 1` | `sqrt(x) + 1` | the sum is not a factor |
| `sin -x` | `sin(-x)` | a minus in front is allowed |
| `sin 2x` | `sin(2) * x` | `2` is the factor, then `x` multiplies: write `sin(2x)` |

The functions, with their number of arguments:

| Group | Functions |
|---|---|
| Trigonometric | `sin`, `cos`, `tan`, `cot`, `sec`, `csc` (1 argument) |
| Inverse trigonometric | `asin`, `acos`, `atan`, `acot`, `asec`, `acsc` (1); `atan2(y, x)` (2) |
| Hyperbolic | `sinh`, `cosh`, `tanh`, `coth`, `sech`, `csch` (1) |
| Inverse hyperbolic | `asinh`, `acosh`, `atanh` (1) |
| Exponentials and logarithms | `exp` (1), `ln` (1), `log` (1 or 2), `log2` (1), `log10` (1) |
| Powers and roots | `sqrt` (1), `cbrt` (1), `root(n, x)` (2), `pow(a, b)` (2) |
| Value | `abs`, `sign`, `floor`, `ceil`, `round` (1) |
| More arguments | `min`, `max`, `hypot` (from 1 to 16) |

- `ln` is the **natural** logarithm, `log` the **base 10** one, `log(b, x)` the **base b** one (`log(2, 8)` is 3), `log2` and `log10` the base 2 and base 10 ones.
- `exp(x)` is `e^x`; `root(n, x)` is the n-th root (`root(3, 27)` is 3, and `root(3, -27)` is −3); `pow(a, b)` is `a^b`.
- `round` rounds to the nearest whole number (halves go up).
- A function with too many or too few arguments gives an error (see below).

The limits: at most **2000 characters** and 200 parentheses inside one another.

### The variable

Almost all blocks have a **Variable** setting, `x` by default: it is the name that takes the value (for example the one of the **x** input of [Evaluate f(x)](fn.eval)). It can be letters, digits and `_` with apostrophes at the end, but not `pi` or `e`. [Tangent line](fn.tangent) always uses `x`.

### Parameters

The other names in the expression are **parameters**: they need a value. You give it with the block [Function f(x)](fn.define): put the function `a x^2 + b` in its **Function** setting, add the inputs **a** and **b** and link **f** to the other blocks. [Evaluate f(x)](fn.eval) can also have added inputs for more variables. A name without a value stops the block with "Parametro senza valore" (parameter without a value).

[Derivative (symbolic)](fn.derivative) is the exception: the names other than the variable are constants, and stay in the result (`a x^3` gives `3a*x^2`).

### How results are written

The functions that come out of the blocks ([Function f(x)](fn.define), [Derivative (symbolic)](fn.derivative), [Taylor polynomial](fn.taylor)…) are **simplified** and written so that they can be put back into another block:

- the sums with numbers are done and the terms put in order (`x^2 + x^3` comes out `x^3 + x^2`);
- the number in front sticks to the name (`3x`, `2e^(2x)`), between two factors that are not numbers there is `*` (`x*sin(x)`);
- simple fractions are fractions: `x^3/3`, `-1/x^2`, `x/2`, `-cos(3x)/3` (the denominator goes up to 64; beyond that the numbers stay decimals);
- other numbers have at most 12 significant digits (`2.71828182846x`);
- the simplification does not reduce fractions of polynomials: `(x^2 - 1)/(x - 1)` stays as it is.

The numbers that come out of the blocks are rounded to **15 significant digits**, so the leftovers of the computer's floating-point numbers do not show (`0.30000000000000004` comes out `0.3`).

## Errors of expressions

If a function is badly written, the block sends an error from its **Exception** port (or to the main console if it is not linked), with one of these messages (`N` is the number of the character where the reader stopped, counting from 1). The messages are in Italian; the English gloss is in brackets.

| Message | When | Example |
|---|---|---|
| Espressione vuota ("Empty expression") | The function is empty or only spaces. | |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long") | More than 2000 characters. | |
| Espressione non valida al carattere N: numero scritto male ("Invalid expression at character N: badly written number") | A number cannot be read. | |
| Espressione non valida al carattere N: «c» non è ammesso ("… not allowed") | A character that is not part of expressions. | `x$` (character 2) |
| Espressione non valida al carattere N: l'espressione finisce troppo presto ("… the expression ends too soon") | Something is missing at the end. | `2x +` (character 5) |
| Espressione non valida al carattere N: manca una parentesi chiusa ("… a closing parenthesis is missing") | A parenthesis is not closed. | `(x+1` (character 5) |
| Espressione non valida al carattere N: parentesi chiusa in più ("… extra closing parenthesis") | A `)` without its `(`. | `x+1)` (character 4) |
| Espressione non valida al carattere N: troppe parentesi annidate ("… too many nested parentheses") | More than 200 parentheses inside one another. | |
| Espressione non valida al carattere N: «…» fuori posto ("… out of place") | A piece that cannot be there. | `3 4` (character 3), `1,5` (character 2), `*x` (character 1) |
| Espressione non valida al carattere N: manca un operatore prima del numero ("… an operator is missing before the number") | A number after a name or a parenthesis. | `x 3` (character 3) |
| Espressione non valida al carattere N: sin vuole un argomento ("… sin wants an argument") | A function without an argument. | `sin` (character 4) |
| Espressione non valida al carattere N: «foo» non è una funzione conosciuta ("… is not a known function") | A name followed by a parenthesis that is not a function. | `foo(x)`, `x(2)` |
| Espressione non valida: sin vuole 1 argomenti, ne ha 2 ("Invalid expression: sin wants 1 arguments, it has 2") | Too many or too few arguments (`da 1 a 2` for `log`, `da 1 a 16` for `min`…). | `sin(1, 2)`, `pow(2)` |
| Parametro senza valore: … ("Parameter without a value") | A name that is not the variable has no value. The message goes on with "(dagli un valore con il blocco Funzione f(x); la variabile è x)" ("give it a value with the block Function f(x); the variable is x"); with more names it is "Parametri senza valore" and "le variabili sono x, y". | `a x` without **a** |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** setting is not a name. | `1x` |
| «…» è una costante, non può essere la variabile ("… is a constant, it cannot be the variable") | **Variable** is `pi` or `e`. | `pi` |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression") | Something that is neither a text nor a number arrives on **f**. | a list |

Calculation errors (a logarithm of zero, a division by zero…) have their own messages, listed in the page of each block.

## Errors of the blocks

Errors come out of the **Exception** port of the block, which is hidden by default, or go to the main console if it is not linked. Each page lists the exact messages. The messages are in Italian.

## Numbers and lists

The blocks that take a number also accept a text with a number (`"2,5"` and `"2.5"` are fine). The blocks with lists accept up to **10000 elements**; polynomials go up to **degree 100**. Where a block works on a list of points, a point without a finite value becomes `null` and gives no error.

## See also

- [Integrals](logicstudio-integrals) to integrate the same functions, for example [Definite integral ∫ₐᵇ f(x) dx](int.definite) and [Antiderivative (indefinite integral)](int.primitive)
- [Basic blocks](logicstudio-core), for example [Constant · Variable](core.value) and [Print (console.log)](core.consoleWrite)
- [Charts](logicstudio-charts) to draw a [Table of values](fn.table)
- [Quantities and units](logicstudio-units) for degrees and radians
- [How a block works](ide/blocks)
