# Gradient ∇f

`num.gradient` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Computes the **gradient** of a function of several variables at a point: the list of the partial derivatives `[∂f/∂x, ∂f/∂y, …]`, its magnitude and the formulas of the partial derivatives.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as text (for example `x^2 + sin(x)`). If it is not linked, the **Function** setting is used. |
| **point [x, y, …] or {x, y, …}** (`point`) | any | The point: a list `[x, y, …]` (in the order of the variables) or an object `{x, y, …}`. If it is not linked, the **Point** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **gradient [∂f/∂x, …]** (`list`) | list | The partial derivatives in a list, in the order of the variables (like the points of the solid blocks). |
| **gradient {x, y, …}** (`gradient`) | object | The same in an object, for example `{"x": 2, "y": 4}`. |
| **magnitude** (`magnitude`) | number | The magnitude of the gradient, that is the slope of the steepest climb. |
| **partial derivatives (text)** (`symbolic`) | object | The formulas of the partial derivatives, as text (`{"x": "2x", "y": "2y"}`), or `null` for the ones that cannot be differentiated (`min`, `max`…). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text | `x^2 + 3x*y + y^2` | The function, when **f** is not linked. |
| **Variables (in order)** (`variables`) | a text (from 1 to 8 names) | `x, y` | The names of the variables, separated by commas or spaces, from 1 to 8 (`x, y` by default). |
| **Point (when the input is not linked)** (`point`) | a text (numbers, list or object) | `1, 2` | The point when **point** is not linked: `1, 2` or `[1, 2]` or `{"x": 1, "y": 2}`. |
| **Method** (`method`) | Exact (symbolic), else numeric / Numeric (central differences) | Exact (symbolic), else numeric | **Exact** differentiates the formula and uses the derivatives; if it cannot be differentiated it falls back to numeric calculation. **Numeric** always uses central differences. |
| **Numeric step h** (`step`) | number (from 1e-9 to 1) | `0.00001` | The step h of the numeric calculation (from 1e-9 to 1; it is multiplied by the size of the point). |

## How it works

The function comes from the **f** input (a text like `x^2 + 1`) or, if **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How a function is written is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions». Angles are in radians. The variable is **x**, or the name chosen in **Variable**; any other name in the function is a parameter and needs a value (given with the block [Function f(x)](fn.define)). Here the function can have more variables: they are the ones in **Variables**, and any other name is a parameter that needs a value.

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

- With the **Exact** method the gradient is computed with the symbolic derivatives: `x^2 + y^2` at (1, 2) gives exactly `[2, 4]`. If a derivative does not exist as a formula (`max(x, y)`) that component is computed with central differences.
- The point is a list in the order of the variables, or an object with the names; as text the numbers can be written separated by commas or spaces.
- The gradient points towards the steepest climb of the function; its length is the slope.

## Examples

### 1. A paraboloid

Function `x^2 + y^2`, variables `x, y`, point `1, 2`:

```
[Gradient ∇f: x^2 + y^2, 1, 2] list ──▶ value [Print (console.log)]
```

Writes `[2,4]`; the magnitude is 4.47213595499958 and the formulas are `{"x":"2x","y":"2y"}`.

### 2. A point that comes from another block

Function `x^2 + 3x*y + y^2` and the point `[1, 2]`:

```
[Constant · Variable (JSON): [1, 2]] value ──▶ point [Gradient ∇f: x^2 + 3x*y + y^2] list ──▶ value [Print (console.log)]
```

Writes `[8,7]`.

### 3. Three variables

Function `x*y*z`, variables `x, y, z`, point `1 2 3`:

```
[Gradient ∇f: x*y*z, 1 2 3] list ──▶ value [Print (console.log)]
```

Writes `[6,3,2]`.

## Errors

| Message | When |
|---|---|
| Espressione vuota ("The expression is empty") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the reader stopped and «…» says why (see [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression, like «x^2 + 1»") | Something that is neither a text nor a number arrives on **f** (a list, an object). |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: … (give it a value with the block Function f(x); the variable is x)") | The function contains a name that is not the variable and has no value. With more names the message says «Parametri senza valore». |
| Variabili: da 1 a 8 nomi ("Variables: from 1 to 8 names") | The **Variables** setting is empty or has more than 8 names. |
| Variabili: due nomi sono uguali ("Variables: two names are the same") | A name appears twice in **Variables**. |
| Nome di variabile non valido: «…» ("Invalid variable name: «…»") | The name in **Variable** is not good (it must start with a letter or `_`; it cannot be the name of a function). |
| Il punto non è valido: scrivi «1, 2» oppure [1, 2] ("The point is not valid: write «1, 2» or [1, 2]") | The point, written as a text that starts with `[` or `{`, is not valid JSON. |
| Il punto ha … valori, servono … ("The point has … values, … are needed") | The point is a list with fewer values than the variables. |
| Manca il valore di «…» nel punto ("The value of «…» is missing in the point") | The point is an object without one of the variables. |
| «x»: serve un numero ("«x»: a number is needed") | The value **«x»** is empty or not a number. |
| La funzione non è definita (o non è derivabile) in questo punto ("The function is not defined (or not differentiable) at this point") | At the point the function or its derivative has no finite value. |

## See also

- [Derivative at a point f'(x)](fn.derivativeAt) for the derivative of a function of one variable
- [Derivative (symbolic)](fn.derivative) for the symbolic derivative of one variable
- [Tangent line](fn.tangent) for the tangent line
- [Maxima · Minima · Inflections](num.extrema) for maxima and minima of a function of one variable
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
