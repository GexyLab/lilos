# Numerical analysis

`logicstudio-numeric` · needs the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for the **numerical calculations** that the other math packages do not have: sampling a function, composing it, simplifying it, the gradient, maxima and minima; sequences, series and the real-time simulation of a differential equation; the derivative, interpolation and regression of measured data; complex numbers.

## How to install

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-numeric` («Logic Studio: the blocks for numerical analysis…»). If the engine is missing, the AppStore installs it together. After the installation the blocks show in the **Blocks** tab of the IDE, in the category **Numerical analysis**.

A project that uses these blocks on a lilOS where the package is missing shows the blocks with **The package is missing**, and a running program waits until the package comes back.

## The blocks

### A function written as a formula

| Block | What it does |
|---|---|
| [Sample f](num.sample) | Computes the function on many points between two ends: the x and y lists and the points for a chart. |
| [Compose f∘g](num.compose) | Puts one function into another: `f(g(x))`. |
| [Simplify](num.simplify) | Writes the function in a simpler way, or expands it as a polynomial. |
| [Gradient ∇f](num.gradient) | The gradient of a function of several variables at a point. |
| [Maxima · Minima · Inflections](num.extrema) | Maxima, minima and inflections in an interval, and the highest and lowest point. |

### Sequences, series and differential equations

| Block | What it does |
|---|---|
| [Sequence aₙ](num.sequence) | The terms of a sequence, explicit or by recurrence (Fibonacci). |
| [Series Σ · Product Π](num.series) | Sum Σ or product Π, also infinite, with a verdict on convergence. |
| [Simulate over time](num.simulate) | A differential equation (or a system) running in time while the schema runs. |

### Measured data and complex numbers

| Block | What it does |
|---|---|
| [Derivative of data](num.dataDerivative) | The slope `dy/dx` of a list of data, also with irregular x. |
| [Interpolation](num.interpolate) | The curve through the points (linear, Lagrange, spline) and its value in between. |
| [Regression (fit)](num.fit) | The curve that best approximates the data (line, polynomial, exponential, logarithm, power), with R². |
| [Complex numbers](num.complex) | Calculations with complex numbers, also in polar form. |

The blocks that start by themselves when the schema starts, when nothing is linked to their inputs, are the ones that compute with the settings: **Sample f**, **Compose f∘g**, **Simplify**, **Gradient ∇f**, **Maxima · Minima · Inflections**, **Sequence aₙ**, **Series Σ · Product Π** and **Complex numbers**. **Derivative of data**, **Interpolation** and **Regression** wait for the data; **Simulate over time** starts with the **start** pulse (or by itself, if chosen).

## Formulas

A function travels as **text**, with the same syntax as the blocks of [Functions and derivatives](logicstudio-functions): an expression like `3x^2 + 2sin(x) - ln(x)`, with the implicit product (`3x`), the constants `pi` and `e`, angles in **radians** and the functions `sin`, `cos`, `exp`, `ln`, `log`, `sqrt`… The full syntax, the functions and the errors are explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions»: it holds here exactly as it is.

Every block with a function takes it from the **f** input or, if **f** is not linked, from the **Function** setting; the variable is `x` (or the name chosen in **Variable**). Any other name in the function is a **parameter** and needs a value, which is given with the block [Function f(x)](fn.define). The exceptions are [Compose f∘g](num.compose) and [Simplify](num.simplify), which work on the text and leave the parameters where they are, and [Gradient ∇f](num.gradient), which has several variables (**Variables** setting).

All the loops are bounded (points, terms, steps and 8 seconds at most): a block never holds the program for long. Errors come out of the **Exception** port of the block.

## Where the other blocks are

This package has only what the others do not have. The rest of the math with formulas is in:

| What | Where |
|---|---|
| Value of a function, table of values, solving `f(x) = 0`, polynomials | [Function f(x)](fn.define), [Evaluate f(x)](fn.eval), [Table of values](fn.table), [Solve f(x) = 0](fn.solve), [Polynomial](fn.poly), [Operations on polynomials](fn.polyOps) |
| Derivative (symbolic and at a point), tangent line, limit, Taylor polynomial, study of a function, derivative of a signal | [Derivative (symbolic)](fn.derivative), [Derivative at a point](fn.derivativeAt), [Tangent line](fn.tangent), [Limit](fn.limit), [Taylor polynomial](fn.taylor), [Study of a function](fn.study), [Rate of change of a signal](fn.signalDerivative) |
| Definite and indefinite integral, integral of data and of a signal, differential equation solved in one go | [Definite integral](int.definite), [Primitive](int.primitive), [Integral of data](int.data), [Integral of a signal](int.signal), [Differential equation](int.ode) |
| Fourier transform and the rest of the signals | [FFT](sig.fft) and the other blocks of [Signals](logicstudio-signals) |

## See also

- [Functions and derivatives](logicstudio-functions)
- [Integrals](logicstudio-integrals)
- [Signals](logicstudio-signals)
- [How a block works](ide/blocks)
