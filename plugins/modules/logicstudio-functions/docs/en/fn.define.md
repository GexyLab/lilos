# Function f(x)

`fn.define` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Prepares a function for the other blocks: it gives a value to its **parameters** and sends the simplified function, as a text, on **f**. For example `a x^2 + b` with a = 3 and b = 1 becomes `3x^2 + 1`.

## Inputs

The block is born **without inputs**: the parameters are the added inputs (see **Added ports**).

## Outputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, with the parameters replaced and simplified, written as a text (for example `3x^2 + 1`). It links to the **f** input of the other blocks of this package. |
| **names left** (`names`) | list | The list (in alphabetical order) of the names left in the function: the variable and the parameters without a value. For `e^(-k t)` with **k** = 0.5 it is `["t"]`. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Added ports

In the **Properties**, **Ports** section, use **Add input** to add one input for each parameter, up to 16, of type number. They are born with the name **parametro 1**, **parametro 2**… (in an English IDE **parameter 1**…): **rename** them with the name the parameter has in the function, for example `a` and `b`. They show in italics on the block. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | a text (up to 2000 characters) | `x^2` | The function, with the parameters written by name: `a x^2 + b`. |

## How it works

Every time a value arrives on a parameter, the block:

1. reads the function from the **Function** setting;
2. replaces every name that has an added input with the value of the input;
3. **simplifies** the result and writes it as a text on **f**.

The simplification does the sums that can be done, puts the terms in order and writes fractions as fractions: `x^2/2 + x/3` stays as it is, `2(x+1)` becomes `2x + 2`.

- A parameter that is **linked but has no value** (nothing has arrived yet) makes the block **wait**.
- An added input that is **not linked and has no start value** is not replaced: its name stays in the function (and in **names left**). A block after it that receives `2x^2 + b` stops with "Parametro senza valore: b" until **b** has a value.
- You can give a value to the variable too: with an added input called `x` equal to 2, `x^2 + 1` becomes `5`.
- The value can be a number or a text with a number (`"2,5"` or `"2.5"`).
- If **no input is linked**, the block runs **once when the schema starts** and sends the function written in **Function** (simplified).
- The block is only for parameters: a function without parameters can be written directly in the **Function** setting of the other blocks.

## Examples

### 1. A parabola with two parameters

Function `a x^2 + b`, added inputs **a** and **b**:

```
[Constant · Variable: 3] value ──▶ a [Function f(x): a x^2 + b] f ──▶ value [Print (console.log)]
[Constant · Variable: 1] value ──▶ b
```

Writes `3x^2 + 1`.

### 2. One function at a time

Link **f** to the block [Evaluate f(x)](fn.eval) and give it **x** = 2:

```
[Function f(x): a x^2 + b] f ──▶ f [Evaluate f(x)] f(x) ──▶ value [Print (console.log)]
```

With **a** = 3 and **b** = 1 it writes `13`.

### 3. A parameter that stays

Function `e^(-k t)`, added input **k** = 0.5: **f** gets `e^(-t/2)` and **names left** is `["t"]`.

Function `a x^2 + b` with only **a** = 2: `2x^2 + b` comes out and **names left** is `["b","x"]`. The block [Evaluate f(x)](fn.eval) after it would say "Parametro senza valore: b".

### 4. With nothing linked

Function `3x^2 + 2sin(x) - ln(x)`, nothing linked: at the start it writes `3x^2 + 2sin(x) - ln(x)`.

## Errors

| Message | When |
|---|---|
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere N: … ("Invalid expression at character N: …") | The function is badly written; N is the character where the block stopped and "…" says why (see the page [Functions and derivatives](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … ("Invalid expression: … wants … arguments, it has …") | A function has the wrong number of arguments, for example `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) ("Expression too long (at most 2000 characters)") | The function has more than 2000 characters. |
| … : serve un numero ("…: a number is needed") | The value of a parameter is not a number (for example the text `"abc"`). The message starts with the name of the parameter. |

## See also

- [Evaluate f(x)](fn.eval) to evaluate the function at a point
- [Derivative (symbolic)](fn.derivative) to differentiate the function
- [Definite integral ∫ₐᵇ f(x) dx](int.definite) to integrate it
- [Constant · Variable](core.value) to give a value to the parameters
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
