# Evaluate f(x)

`fn.eval` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Computes the value of a function at a point, or at a list of points: from `x^2 + 1` and x = 3 it gets 10.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, as a text (`x^2 + 1`). When it is not linked the **Function** setting is used. |
| **x (number or list)** (`x`) | any | The point: a number (also as a text, `"2.5"`) or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **f(x)** (`y`) | any | The value f(x), rounded to 15 significant digits. With a list of points it is the list of the values, in the same order. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Added ports

For functions with more variables (`a x + b`) add one input for each extra variable, up to 8, of type number, in the **Properties**, **Ports** section. They are born with the name **altra variabile 1**… (in an English IDE **other variable 1**…): **rename** them with the name the variable has in the function (**a**, **b**). The block waits until all of them have a value. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function (when f is not linked)** (`expr`) | a text (up to 2000 characters) | `x^2` | The function, when **f** is not linked. |
| **Variable** (`variable`) | a text | `x` | The name of the variable, the one that takes the value of **x**. |

## How it works

The function comes from the input **f** (a text like `x^2 + 1`) or, when **f** is not linked, from the **Function** setting. If **f** is linked but nothing has arrived yet, the block waits. How to write a function is explained in the page [Functions and derivatives](logicstudio-functions), section "Expressions".

The variable is **x**, or the name chosen in **Variable** (letters, digits and `_`, with optional apostrophes at the end; it cannot be `pi` or `e`).

When a value arrives on **x** (or a new **f**) the block computes the function. The trigonometric functions want angles **in radians**: for an angle in degrees go first through the block [Angle](unit.angle) of the package [Quantities and units](logicstudio-units).

- **A number**: if the result is not a finite number (`1/x` at 0, `sqrt(x)` at −4, `ln(x)` at 0) the block gives an error.
- **A list** (up to 10000 elements): every element is computed; where the function has no finite value the list has `null` and the block gives **no** error.
- The other names in the function are variables: each one has an added input with the same name. A name without an input is a parameter without a value (error). To give a value to a parameter you can also use [Function f(x)](fn.define) before this block.
- The block does not start by itself at the start: it needs a value on **x**.

## Examples

### 1. One value

```
[Constant · Variable: 3] value ──▶ x [Evaluate f(x): x^2 + 1] f(x) ──▶ value [Print (console.log)]
```

Writes `10`.

### 2. A list of points

Same function, with the list `[0, 1, 2, 3]` on **x**: `[1,2,5,10]` comes out.

### 3. Where the function does not exist

Function `1/x`. With **x** = 0 the block gives an error ("La funzione non ha un valore finito in x = 0": the function has no finite value); with the list `[0, 2, 4]` it gives `[null,0.5,0.25]`.

### 4. Two variables

Function `a x + b`, added inputs **a** = 3 and **b** = 4, **x** = 2: writes `10`.

### 5. Radians

Function `sin(pi x)` with **x** = 1: writes `1.22464679914735e-16`, that is zero with the computer's small error: the sine of π radians is 0.

## Errors

| Message | When |
|---|---|
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the block stopped and "…" says why (see the page [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression, like «x^2 + 1»") | Something that is neither a text nor a number arrives on **f** (a list, an object). |
| Nome di variabile non valido: «…» ("Invalid variable name") | The name in **Variable** is not valid (it must start with a letter or `_`). |
| «…» è una costante, non può essere la variabile (""…" is a constant, it cannot be the variable") | **Variable** is `pi` or `e`. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) ("Parameter without a value: … (give it a value with the block Function f(x); the variable is x)") | The function contains a name that is not the variable and has no value. With more names the message says "Parametri senza valore", and with more variables it ends with "le variabili sono x, y". |
| La funzione non ha un valore finito in … = … ("The function has no finite value in x = …") | The function gives an infinite or non-numeric value (division by zero, root of a negative number, logarithm of zero…). |
| … : serve un numero ("…: a number is needed") | The value of **x** (or of an element of the list, or of another variable) is not a number. The message starts with the name of the variable. |
| La lista delle x ha più di 10000 elementi ("The list of the x has more than 10000 elements") | The input list is too long. |

## See also

- [Table of values](fn.table) to compute the function on many close points
- [Function f(x)](fn.define) to give a value to the parameters
- [Derivative at a point f'(x)](fn.derivativeAt) for the derivative at the same point
- [Constant · Variable](core.value) to give a value to **x**
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
