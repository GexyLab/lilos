# Simulate over time

`num.simulate` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Makes a differential equation (or a system) **run in time** while the schema runs: at regular intervals it sends the simulated time **t** and the value **y**. It is used to simulate a system (a tank that empties, a pendulum, a population) and draw it live.

## Inputs

| Port | Type | Description |
|---|---|---|
| **start** (`start`) | pulse | Pulse: starts the simulation (or resumes it from where it was). |
| **stop** (`stop`) | pulse | Pulse: stops the simulation, keeping the state. |
| **reset** (`reset`) | pulse | Pulse: brings the time back to 0 and the state to the starting values, without starting. |
| **f (equations)** (`f`) | text | The equations, as text, separated by `;`. If it is not linked, the **Equations** setting is used. |
| **y(0)** (`y0`) | any | The starting values: a list or a number (one per variable). If it is not linked, the **Starting values** setting is used. Hidden by default: show it with the eye in Properties. |
| **parameters** (`params`) | object | An object with the values of the parameters, for example `{"k": 2}`; a name in the equations that is neither a variable nor the time is a parameter. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **t** (`t`) | number | The simulated time, which starts from 0. |
| **y (first variable)** (`y`) | number | The value of the first variable. |
| **state** (`state`) | list | The value of all the variables, in a list in the order of **Variables**. |
| **running** (`running`) | yes/no | `true` when it starts, `false` when it stops (with **stop**, at **t maximum** or because of an error). |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Added ports

With **Add input** (in Properties) you add more **equations**: every added input is a text with one or more equations, appended to the ones of **f**. It is used when the equations come from different blocks.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Equations y′ = … (a ; between them; used when f is not linked)** (`expr`) | a text (equations separated by `;`) | `-0.5 y` | The equations, one per variable and separated by `;`, when **f** is not linked. Write only the right side (`-0.5 y`) or also the left one (`y' = -0.5 y`). |
| **Variables (y1, y2…)** (`variables`) | a text (from 1 to 16 names) | `y` | The names of the variables, separated by commas or spaces (`y` by default). The order is the one of the equations. |
| **Time variable** (`timeVar`) | a text | `t` | The name of the time in the equations (`t` by default). |
| **Starting values** (`initial`) | a text (numbers separated by commas) | `1` | The starting values, separated by commas (one per variable). |
| **Method** (`method`) | Runge-Kutta 4 / Euler | Runge-Kutta 4 | **Runge-Kutta 4** is accurate; **Euler** is simpler and less accurate. |
| **Step of the simulation (time units)** (`dt`) | number (from 0.000001 to 1000) | `0.01` | The step of the calculation in simulated time units (from 0.000001 to 1000): smaller is more accurate and slower. |
| **Send every (ms)** (`tick`) | number (from 20 to 60000) | `100` | Every how many milliseconds to send the new value (from 20 to 60000). |
| **Speed (simulated time per real second)** (`speed`) | number (from 0.001 to 100000) | `1` | How much simulated time passes for every real second: 1 is real time, 10 goes ten times faster. |
| **Stop at t (0: never)** (`tMax`) | number (from 0) | `0` | The simulated time to stop at (0: never). |
| **Start by itself when the program starts** (`auto`) | yes / no | no | If turned on, the simulation starts by itself when the schema starts (only if **start** is not linked). |

## How it works

The equations are in the form `y' = f(t, y)`: write the right side, with `t` for the time and the name of the variable (`-0.5 y` for `y' = -0.5 y`). A system has one equation per variable, in the order of **Variables**: for an oscillator with `y` and `v` write `v; -k*y`. The syntax of the expressions is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions»; angles are in radians.

- With **start** the block sends the state at once and then updates it every **Send every** milliseconds, advancing the simulation by the real time that passed times the **Speed**, in steps of **Step**. With **stop** it stops and **start** resumes from where it was; **reset** starts again from 0.
- If the equations, the starting values or the parameters change while it runs, the change is used from the next step; the current state stays if the number of variables is the same.
- At every moment at most 5000 steps are made: if the computer falls behind, the simulation falls behind too (it does not skip).
- For a whole solution in one go, with all the points, there is [Differential equation](int.ode).

## Examples

### 1. A tank that empties

Equation `-0.5 y`, starting value 1, speed 1:

```
[Button: Start] ──▶ start [Simulate over time: -0.5 y] t, y ──▶ [Live chart]
```

After 1 real second y is about 0.6065 (e^(−0.5)); the chart shows the decay.

### 2. An oscillator

Variables `y, v`, equations `v; -k*y`, starting values `1, 0`, **parameters** `{"k": 1}`:

```
[Constant · Variable (JSON): {"k": 1}] value ──▶ parameters [Simulate over time: v; -k*y] state ──▶ value [Label]
```

After 2π seconds **state** is `[1, 0]` again.

### 3. Stopping by itself

**Stop at t** 5 and **Start by itself** turned on:

```
[Simulate over time: y, t maximum 5, start by itself] running ──▶ value [Print (console.log)]
```

When the schema starts it writes `true`; when the simulated time reaches 5 it writes `false`.

## Errors

| Message | When |
|---|---|
| Servono da 1 a 16 variabili ("From 1 to 16 variables are needed") | The **Variables** setting is empty or has more than 16. |
| Nome di variabile non valido: «…» ("Invalid variable name: «…»") | A variable name is not good (it must start with a letter or `_`, at most 16 characters; it cannot be a function or `pi` or `e`). |
| Due variabili hanno lo stesso nome ("Two variables have the same name") | Two names among the variables and the time variable are the same. |
| Servono … equazioni (una per variabile: …) ma ce ne sono … ("… equations are needed (one per variable: …) but there are …") | The equations (separated by `;`, plus the ones of the added ports) are not as many as the variables. |
| Al massimo 16 equazioni ("At most 16 equations") | There are more than 16 equations. |
| Nome di parametro non valido: «…» ("Invalid parameter name: «…»") | A name in the **parameters** object is not good. |
| Il parametro «…»: serve un numero ("The parameter «…»: a number is needed") | The value of a parameter is not a number. |
| Servono … valori iniziali (uno per variabile) ma ce ne sono … ("… starting values are needed (one per variable) but there are …") | The starting values are not as many as the variables. |
| Valore iniziale: serve un numero ("Starting value: a number is needed") | A starting value is not a number. |
| Espressione vuota ("The expression is empty") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the reader stopped and «…» says why (see [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: … (give it a value with the block Function f(x); the variable is x)") | The function contains a name that is not the variable and has no value. With more names the message says «Parametri senza valore». |
| Invia ogni (ms): da 20 a 60000 ("Send every (ms): from 20 to 60000") | The **Send every** setting is out of range. |
| La soluzione non è finita: diverge intorno a t = … ("The solution is not finite: it diverges around t = …") | The solution became infinite (`y' = y^2` blows up in finite time): the simulation stops. |

## See also

- [Differential equation y' = f(x, y)](int.ode) to solve a differential equation in one go, with all the points
- [Rate of change of a signal (d/dt)](fn.signalDerivative) for the derivative of a signal
- [Real time](charts.live) to draw the solution while it arrives
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
