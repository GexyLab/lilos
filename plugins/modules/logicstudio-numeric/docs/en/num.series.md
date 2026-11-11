# Series Σ · Product Π

`num.series` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Computes a **sum** Σ or a **product** Π of the terms `f(n)`, for n from a start to an end, also **infinite**: it says whether the series converges and, if so, to what.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as text (for example `x^2 + sin(x)`). If it is not linked, the **Function** setting is used. |
| **from n** (`from`) | number | The first n. If it is not linked, the **From n** setting is used. |
| **to n** (`to`) | number | The last n. If it is not linked, the **To n** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the sum or product. It does not come out if the series does not converge. |
| **converges** (`converges`) | yes/no | `true` if the series converges (or if it is finite), `false` if it diverges; for a series that stops at the limit of terms it can be missing (empty). |
| **partial sums** (`partial`) | list | The partial sums (or products), at most as many as **Partial sums kept** says, to see how the value is approached. |
| **terms used** (`terms`) | number | How many terms were used. |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text | `1/n^2` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `n` | The name of the index (`n` by default). |
| **Operation** (`kind`) | Sum Σ / Product Π | Sum Σ | **Sum Σ** adds the terms; **Product Π** multiplies them. |
| **From n (when not linked)** (`from`) | a text (number or expression) | `1` | The first n, when **from n** is not linked (number or expression). |
| **To n, also inf (when not linked)** (`to`) | a text (number, expression or `inf`) | `inf` | The last n, when **to n** is not linked: a number or `inf` for an infinite series. |
| **Most terms** (`maxTerms`) | number (from 10 to 2000000) | `100000` | How many terms at most to compute for an infinite series (from 10 to 2000000). |
| **Partial sums kept** (`keep`) | number (from 2 to 5000) | `200` | How many partial sums to keep in **partial sums** (from 2 to 5000). |

## How it works

The function comes from the **f** input (a text like `x^2 + 1`) or, if **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How a function is written is explained in the page [Functions and derivatives](logicstudio-functions), section «Expressions». Angles are in radians. The variable is **x**, or the name chosen in **Variable**; any other name in the function is a parameter and needs a value (given with the block [Function f(x)](fn.define)). Here the default variable is **n**.

If **no** input is linked, the block computes **once when the schema starts**, with the settings. If one or more inputs are linked, it waits until they all have a value and then computes at every new value.

- If **To n** is a number, the sum (or product) is finite and the value is exact; **converges** is `true`.
- If **To n** is `inf`, the block adds terms until they become negligible, or up to **Most terms**. Then it judges: if the terms do not go to zero the series **diverges**; if they alternate and decrease it **converges** and half of the last term is taken off the value; if they decrease like `C/n^p` with p greater than 1 it **converges** and an estimate of the tail is added, otherwise (the harmonic series `1/n`) it **diverges**.
- It is a numeric calculation: the sum of `1/n^2` gives 1.64493406689824 instead of π²/6 = 1.6449340668482264 (error below one in a billion).
- For the **product** the series of `f(n) − 1` is judged.

## Examples

### 1. The Basel problem

Function `1/n^2`, from 1 to `inf` (the default values):

```
[Series Σ · Product Π: 1/n^2, 1 → inf] value ──▶ value [Print (console.log)]
```

Writes 1.64493406689824, that is π²/6; **converges** is `true`.

### 2. The harmonic series

Function `1/n`, from 1 to `inf`:

```
[Series Σ · Product Π: 1/n, 1 → inf] converges ──▶ value [Print (console.log)]
```

Writes `false`: the series diverges and **value** does not come out.

### 3. A finite sum and a factorial

`n` from 1 to 100 gives 5050; with **Product Π**, `n` from 1 to 5 gives 120:

```
[Series Σ · Product Π: n, 1 → 100] value ──▶ value [Print (console.log)]
```

Writes `5050`.

## Errors

| Message | When |
|---|---|
| Espressione vuota ("The expression is empty") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the reader stopped and «…» says why (see [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression, like «x^2 + 1»") | Something that is neither a text nor a number arrives on **f** (a list, an object). |
| Nome di variabile non valido: «…» ("Invalid variable name: «…»") | The name in **Variable** is not good (it must start with a letter or `_`; it cannot be the name of a function). |
| «…» è una costante, non può essere la variabile ("«…» is a constant, it cannot be the variable") | **Variable** is `pi` or `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: … (give it a value with the block Function f(x); the variable is x)") | The function contains a name that is not the variable and has no value. With more names the message says «Parametri senza valore». |
| n iniziale: serve un numero ("n start: a number is needed") | The value **n start** is empty or not a number. |
| n iniziale: serve un numero (o un'espressione come pi/2), non «…» ("n start: a number is needed (or an expression like pi/2), not «…»") | The value **n start** is a text that is neither a number nor an expression of numbers (for example `abc`). |
| n finale: serve un numero ("n end: a number is needed") | The value **n end** is empty or not a number. |
| n finale: serve un numero (o un'espressione come pi/2), non «…» ("n end: a number is needed (or an expression like pi/2), not «…»") | The value **n end** is a text that is neither a number nor an expression of numbers (for example `abc`). |
| n finale è minore di n iniziale ("n end is smaller than n start") | The end is before the start. |
| Il termine non è un numero finito per n = … ("The term is not a finite number for n = …") | In a finite sum or product a term is not a number (for example `log(n-5)` for n = 1). |
| Termini al massimo: da 10 a 2000000 ("Most terms: from 10 to 2000000") | The **Most terms** setting is out of range. |
| Somme parziali tenute: da 2 a 5000 ("Partial sums kept: from 2 to 5000") | The **Partial sums kept** setting is out of range. |
| Calcolo troppo lungo (più di 8 secondi): riduci i punti o l'intervallo ("Calculation too long (more than 8 seconds): use fewer points or a shorter interval") | The calculation takes more than 8 seconds: the block stops so that it does not hold the program. |

## See also

- [Sequence aₙ](num.sequence) to see the terms
- [Definite integral ∫ₐᵇ f(x) dx](int.definite) for the integral instead of the sum
- [Taylor polynomial](fn.taylor) to approximate a function with a polynomial
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
