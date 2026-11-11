# Mean value on [a, b]

`int.mean` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes the mean value of a function on an interval: the integral divided by the length of the interval. It also finds a point c where the function is exactly the mean.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, such as `x^2`. If it is not linked, the **Function** setting is used. |
| **a (from)** (`a`) | any | The left end: a number or an expression such as `pi/2`. If it is not linked, the **From a** setting is used. |
| **b (to)** (`b`) | any | The right end: a number or an expression. If it is not linked, the **To b** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **mean value** (`mean`) | number | The integral divided by (b − a). |
| **integral** (`integral`) | number | The integral between a and b. Hidden by default: show it with the eye in Properties. |
| **c with f(c) = mean** (`c`) | number | A point of the interval where f is the mean value (the first one, from the left). If none is found, nothing is sent. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An error of the calculation (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | text | `x^2` | The function, if **f** is not linked. |
| **Variable** (`variable`) | text | `x` | The name of the variable in the function. |
| **From a** (`a`) | number or expression | `0` | The end a, if the input is not linked. |
| **To b** (`b`) | number or expression | `3` | The end b, if the input is not linked. |
| **Method** (`method`) | Adaptive Gauss–Kronrod / Adaptive Simpson / Romberg / Trapezoids / Rectangles at the midpoint | Adaptive Gauss–Kronrod | How the integral is calculated (see [Definite integral](int.definite)). |
| **Tolerance** (`tolerance`) | from 1e-15 to 0.1 | 1e-10 | The error the adaptive methods try not to exceed. |
| **Intervals** (`n`) | from 1 to 99999 | 1000 | How many intervals, for Trapezoids and Rectangles. |

## How it works

The block calculates the integral I of f between a and b, then the **mean value** = I / (b − a).

Then it looks for the point **c** where f(c) equals the mean value (the mean value theorem says it exists, if f is continuous): it looks for where f − mean changes sign and refines the point. The first one found is sent.

- The ends must be **finite**: `inf` is not allowed here.
- If a and b are equal the interval has length 0 and the block sends an error.
- If **a** is larger than **b** the mean value stays the same, but **integral** changes sign.
- It stops after **100000 evaluations** of the function for the integral.
- With no input linked it calculates once at the start of the schema.

## Examples

### 1. The mean of x² between 0 and 3

```
[Mean value: x^2, from 0 to 3] mean value ──▶ value [Print (console.log)]
```

No input is linked: it calculates at the start. It writes `3`. The integral is `9` and **c** is `1.73205080756888` (√3: f(√3) = 3).

### 2. The mean of a wave

```
[Constant · Variable: pi] value ──▶ b [Mean value: sin(x), a = 0] mean value ──▶ value [Print (console.log)]
```

Writes `0.636619772367581` (2/π). With the other outputs linked: **integral** `2`, **c** `0.69010709137454`.

### 3. An empty interval

With **From a** = 1 and **To b** = 1 the block sends the error "L'intervallo ha lunghezza 0".

## Errors

| Message | When |
|---|---|
| L'intervallo ha lunghezza 0 ("The interval has length 0") | a and b are equal. |
| b: l'infinito non è ammesso qui ("b: infinity is not allowed here") | An end is `inf` or `-inf` (for a the message starts with `a:`). |
| a: serve un numero (o un'espressione come pi/2), non «…» ("a: a number is needed, or an expression like pi/2") | An end is neither a number nor an expression without variables. |
| La funzione non ha un valore finito in x = … ("The function has no finite value at x = …") | The function gives an infinity or "not a number" at a point. |
| Troppe valutazioni della funzione (più di 100000) ("Too many evaluations of the function") | More than 100000 evaluations are needed. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: give it a value with the Function f(x) block; the variable is x") | The function has a name that is not the variable. |
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | The function is badly written. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |

## See also

- [Definite integral](int.definite) for the integral alone
- [Integral of sampled data](int.data) for the mean of a list of measures (integral divided by the duration)
- [Function f(x)](fn.define) to give a name to the function
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
