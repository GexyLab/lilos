# Differential equation y' = f(x, y)

`int.ode` · Integrals · [Integrals](logicstudio-integrals) · version 1

Solves a differential equation with an initial condition: 1st order y′ = f(x, y) or 2nd order y″ = f(x, y, y′). It gives the value at the end and all the points of the solution, ready for a chart.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function f, such as `-2x*y`. It uses `x` (or the name chosen in **Variable**), `y` and, in the 2nd order, `y'`. If it is not linked, the **f** setting is used. |
| **x₀** (`x0`) | any | The starting point: a number or an expression. If it is not linked, the **x₀** setting is used. |
| **y(x₀)** (`y0`) | number | The value of y at x₀. If it is not linked, the **y(x₀)** setting is used. |
| **y'(x₀) (2nd order)** (`dy0`) | number | The slope at x₀, only in the 2nd order. If it is not linked, the **y'(x₀)** setting is used. Hidden by default: show it with the eye in Properties. |
| **x end** (`x1`) | any | The end point: a number or an expression. It can be smaller than x₀ (going backwards). If it is not linked, the **x end** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **y(x end)** (`y`) | number | The value of y at the end point. |
| **y'(x end)** (`dy`) | number | The slope at the end point (only in the 2nd order). Hidden by default: show it with the eye in Properties. |
| **points {x, y}** (`points`) | list | All the calculated points, `{x, y}`, from the first (x₀) to the last (x end). At most 10000. |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Order** (`order`) | 1st: y′ = f(x, y) / 2nd: y″ = f(x, y, y′) | 1st | Which equation is solved. |
| **f** (`expr`) | text | `-2x*y` | The function, if the input is not linked. |
| **Variable** (`variable`) | text | `x` | The name of the independent variable (for example `t`). |
| **x₀** (`x0`) | number or expression | `0` | The starting point. |
| **y(x₀)** (`y0`) | number | 1 | The initial value. |
| **y'(x₀)** (`dy0`) | number | 0 | The initial slope. It shows only with **Order** 2nd. |
| **x end** (`x1`) | number or expression | `2` | The end point. |
| **Method** (`method`) | Runge–Kutta 4(5), adaptive (Dormand–Prince) / Runge–Kutta 4, fixed steps / Euler, fixed steps | Runge–Kutta 4(5) | How it is solved (see below). |
| **Steps (RK4, Euler)** (`steps`) | from 1 to 1000000 | 1000 | How many steps, for the fixed-step methods. |
| **Tolerance (RK45)** (`tolerance`) | from 1e-14 to 0.1 | 1e-8 | The error Runge–Kutta 4(5) tries not to exceed. |

## How it works

| Method | What it does |
|---|---|
| **Runge–Kutta 4(5), adaptive** (`rk45`) | Dormand–Prince: it chooses the length of every step by itself, small where the solution changes fast and large where it is calm. It is the most convenient and precise. |
| **Runge–Kutta 4** (`rk4`) | All steps equal, much more precise than Euler. |
| **Euler** (`euler`) | All steps equal, the simplest and the least precise: useful to see the error. |

The **2nd order** is solved as two 1st order equations together (y and y′). For example an oscillator y″ = −y, or free fall y″ = −9.81.

- If **x end** equals **x₀**, the solution has only the starting point.
- **points** has, with RK45, one point for every accepted step; with RK4 and Euler one point for every step (if there are more than 10000, one every few).
- If the solution grows without end (like y′ = y²), the block stops with an error.
- The block stops after **1000000 evaluations** of the function.
- With no input linked it calculates once at the start of the schema.

## Examples

### 1. The default decay

```
[Differential equation: y' = -2x*y, y(0) = 1, up to 2] y(x end) ──▶ value [Print (console.log)]
```

No input is linked: it calculates at the start. It writes `0.0183156414589237` (the true solution is e⁻⁴ = 0.0183156388887). The block also sends 31 points, the first `{"x":0,"y":1}`.

### 2. The three methods compared

y′ = y, y(0) = 1, up to x = 1 (the true solution is e = 2.718281828…), with 10 fixed steps:

- **Runge–Kutta 4(5)**: `2.71828183620885` (11 points in the list, with the default tolerance)
- **Runge–Kutta 4**: `2.71827974413517`
- **Euler**: `2.5937424601`

### 3. A spring and a fall (2nd order)

**Order** = 2nd, `-y`, y(0) = 0, y′(0) = 1, **x end** = `pi/2`: **y** = `0.999999995102742` (sin(π/2) = 1) and **y′** = `-8.84496666880841e-10` (cos(π/2) = 0).

Free fall: `-9.81`, y(0) = 100, y′(0) = 0, **x end** = 2: **y** = `80.38`, **y′** = `-19.62`.

### 4. A growth that slows down

`y*(1-y)` (logistic), y(0) = 0.1, **x end** = 5: **y** = `0.942825618123814`.

## Errors

| Message | When |
|---|---|
| Passo troppo piccolo in x = …: l'equazione è rigida o la soluzione esplode ("Step too small at x = …: the equation is stiff or the solution blows up") | RK45 must take tiny steps (the solution goes to infinity, as in `y^2`, or the equation is stiff). |
| La soluzione non è più finita in x = … ("The solution is no longer finite at x = …") | The solution becomes infinite or "not a number". |
| Troppi passi: allarga la tolleranza ("Too many steps: widen the tolerance") | RK45 made more than 200000 attempts. |
| Troppe valutazioni della funzione (più di 1000000) ("Too many evaluations of the function") | More than 1000000 evaluations are needed. |
| x₀: serve un numero (o un'espressione come pi/2), non «…» ("x₀: a number is needed, or an expression like pi/2") | **x₀** is neither a number nor an expression without variables. For the end point the name is `x finale`. |
| x₀: l'infinito non è ammesso qui ("x₀: infinity is not allowed here") | **x₀** or **x end** is `inf`. |
| y(x₀): serve un numero ("y(x₀): a number is needed") | **y(x₀)** is not a number. |
| y'(x₀): serve un numero ("y'(x₀): a number is needed") | **y'(x₀)** is not a number (2nd order). |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); le variabili sono x, y) ("Parameter without a value: give it a value with the Function f(x) block; the variables are x, y") | The function has a name that is not `x`, `y` (or `y'`). |
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | The function is badly written. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |

## See also

- [Definite integral](int.definite) when f depends only on x
- [Signal integrator](int.signal) to integrate a live value over time
- [Table of values](fn.table) to get the values of a formula
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
