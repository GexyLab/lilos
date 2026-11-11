# Integrals

`logicstudio-integrals` · needs the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for **integrals**: the definite integral (also with infinite ends), the symbolic antiderivative, the integral function, the mean value, the area between two curves, solids of revolution, arc length, double and triple integrals, the integral of data and of signals, and differential equations.

## How to install

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-integrals`. If the engine is missing, the AppStore installs it too. After the installation the blocks appear in the **Blocks** tab of the IDE, in the **Integrals** category.

A project that uses these blocks on a lilOS where the package is not installed shows the blocks with **Package missing**, and a running program waits until the package is back.

## The blocks

### Integrals of functions

| Block | What it does |
|---|---|
| [Definite integral](int.definite) | Computes ∫ f(x) dx between two ends, with the method you choose; the ends can be infinite. |
| [Antiderivative (indefinite integral)](int.primitive) | Finds the antiderivative F(x) as text, and checks the result by deriving it. |
| [Integral function](int.function) | Computes F(x) = ∫ₐˣ f(t) dt for one number or for a list of x values. |
| [Mean value on [a, b]](int.mean) | The mean value of f on an interval, and a point c where f is exactly the mean. |

### Geometric applications

| Block | What it does |
|---|---|
| [Area between two curves](int.area) | The area between f and g (or between f and the x axis), and the points where the curves meet. |
| [Solid of revolution](int.revolution) | Volume and lateral surface of a solid made by turning a curve around the x or the y axis. |
| [Arc length](int.arcLength) | The length of a curve between two ends. |
| [Double and triple integral](int.multiple) | ∬ and ∭, also with ends that depend on the outer variables. |

### Data and signals

| Block | What it does |
|---|---|
| [Integral of sampled data](int.data) | The integral of a list of numbers or of `{x, y}` points, with trapezoids or Simpson, and the running integral. |
| [Signal integrator](int.signal) | Adds up over time a value that comes from a sensor, with reset and anti-windup limits. |

### Differential equations

| Block | What it does |
|---|---|
| [Differential equation](int.ode) | Solves y′ = f(x, y) or y″ = f(x, y, y′) with Runge-Kutta or Euler. |

## Expressions

Functions travel as **text**, with the same syntax as the [Functions and derivatives](logicstudio-functions) package (the full description is there, together with the [Function f(x)](fn.define) block that gives a name to a function and its parameters):

- numbers are written with a **dot** (`2.5`, `1e-3`);
- the operators are `+ - * / ^`; the power is also written `**`, `²`, `³`;
- the product can stay **implicit**: `3x`, `2(x+1)`, `x sin(x)`, `(x+1)(x-1)`;
- the functions: `sin cos tan cot sec csc`, `asin acos atan`, `sinh cosh tanh`, `asinh acosh atanh`, `exp`, `ln` (natural), `log` (base 10, or `log(b, x)`), `log2`, `log10`, `sqrt`, `cbrt`, `root(n, x)`, `abs`, `sign`, `floor`, `ceil`, `round`, `min`, `max`, `atan2`, `pow`, `hypot`;
- the constants are `pi` (also `π`) and `e`;
- angles are always in **radians**.

Every block takes the function from the **f** input or, if it is not linked, from the **Function** setting. The variable is called `x`; in Properties you can give it another name (**Variable**), for example `t`. Any other name in the expression (for example `k` in `k*x`) is a **parameter without a value**: give it a value with [Function f(x)](fn.define), or write a number.

## The ends of the interval

The ends (**a**, **b**) can come from an input or be written in Properties. They are written as:

- a **number**: `2`, `-1.5`, also with a comma (`2,5`);
- an **expression without variables**: `pi/2`, `2*pi`, `sqrt(2)`, `e^2`;
- **`inf`** and **`-inf`** (also `∞` and `-∞`), only where the block allows it: [Definite integral](int.definite) and [Integral function](int.function). With infinite ends only the Gauss-Kronrod method works.

In the [Definite integral](int.definite), if a is larger than b the integral changes sign. If a and b are equal, the integral is 0.

## When the blocks calculate

The blocks whose inputs are all also settings ([Definite integral](int.definite), [Antiderivative](int.primitive), [Mean value](int.mean), [Area](int.area), [Solid of revolution](int.revolution), [Arc length](int.arcLength), [Double and triple integral](int.multiple), [Differential equation](int.ode)) **calculate once at the start of the schema** when no input is linked: just write the function and the ends in Properties. With a linked input they calculate at every value that arrives, once they have received all the linked values.

## The limits

So that a heavy schema cannot block the engine:

| Calculation | Limit |
|---|---|
| Every numeric integral | 100000 evaluations of the function |
| Double and triple integral | 2000000 evaluations |
| Differential equation | 1000000 evaluations |
| Integral function with a list | 1000 x values |
| List of data | 10000 elements |
| Expression | 2000 characters |

Past the limit the block sends an error (for example "Troppe valutazioni della funzione (più di 100000)"). See also [Limits and quotas](logicstudio-engine/limits).

## Errors

Errors (a badly written expression, a parameter without a value, a function with no finite value, an antiderivative that cannot be found…) go out of the **Exception** port of the block, or go to the main console if it is not linked. Each page lists the exact messages.

## See also

- [Functions and derivatives](logicstudio-functions) for the full syntax, derivatives and the table of values ([Derivative](fn.derivative), [Table of values](fn.table))
- [Solid geometry](logicstudio-solid) for volumes and surfaces of the common solids (for example [Sphere](solid.sphere))
- [Constant · Variable](core.value) and [Print (console.log)](core.consoleWrite) to give a block a value and see its result
- [How a block works](ide/blocks)
