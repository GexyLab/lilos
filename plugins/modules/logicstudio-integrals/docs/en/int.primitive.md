# Antiderivative (indefinite integral)

`int.primitive` · Integrals · [Integrals](logicstudio-integrals) · version 1

Finds the antiderivative of a function, that is the formula F(x) whose derivative is f(x), and writes it as text.

## Inputs

| Port | Type | Description |
|---|---|---|
| **f (function)** (`f`) | text | The function, such as `x e^x`. If it is not linked, the **Function** setting is used. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **F (antiderivative)** (`primitive`) | text | The antiderivative, with the constant **C** added if it is not 0. It can be linked to another block that wants a function (for example [Definite integral](int.definite)). |
| **∫ f dx = F + C** (`text`) | text | The whole formula, to show: `∫ x*e^x dx = x*e^x - e^x + C`. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An error (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Function** (`expr`) | text | `x e^x` | The function, if **f** is not linked. |
| **Variable** (`variable`) | text | `x` | The name of the variable of integration. |
| **Constant C added to F** (`C`) | number | 0 | A number the block adds to the antiderivative. With 0 nothing is added. |

## How it works

The block does not calculate numbers: it looks for the **formula** with a table of known forms.

- **Polynomials** and **powers** of a linear expression: `3x^2 + 2x + 1`, `(2x+1)^5`, `1/x` (which gives `ln(abs(x))`), `sqrt(3x+1)`.
- **Exponentials** `e^`, and `a^x`.
- **Functions**: `sin`, `cos`, `tan`, `sec`, `csc`, `sinh`, `cosh`, `tanh`, `ln`, `sqrt`, `cbrt`, `asin`, `acos`, `atan`, `abs`.
- **Squares** `sin²`, `cos²`, `sec²`, `csc²`, `tan²`.
- **1 / (quadratic polynomial)**: gives an arctangent or a logarithm, according to the discriminant (`1/(1+x^2)` → `atan(x)`).
- **1 / square root of a quadratic polynomial**: gives an arcsine or a logarithm (`1/sqrt(1-x^2)` → `asin(x)`).
- **By parts**: `x^n` times `e^`, `sin`, `cos`, `sinh`, `cosh`, and `x^n` times `ln(x)`.
- **By substitution**: the forms `u'·h(u)` and `u·u'` (for example `2x*cos(x^2)` → `sin(x^2)`).
- Other names in the function (such as `a` in `a*x`) stay in the result as parameters.

**Every result is checked**: the block derives it and compares it with the function at several points. If it does not match, or the form is not in the table, it sends an error instead of a wrong result. In that case use the [Definite integral](int.definite), which works with numbers.

The constant C is always written `+ C` in the long text; the number **C** in Properties only goes into the antiderivative.

With no input linked it calculates once at the start of the schema.

## Examples

### 1. By parts

```
[Antiderivative: x e^x] F (antiderivative) ──▶ value [Print (console.log)]
```

No input is linked: it calculates at the start. It writes `x*e^x - e^x`. With **∫ f dx = F + C** linked it writes `∫ x*e^x dx = x*e^x - e^x + C`.

### 2. A polynomial with the constant

```
[Constant · Variable: 3x^2+2x+1] value ──▶ f [Antiderivative, C = 5] F (antiderivative) ──▶ value [Print (console.log)]
```

Writes `x^3 + x^2 + x + 5`.

### 3. Other antiderivatives

| Function | Antiderivative |
|---|---|
| `sin(x)^2` | `x/2 - sin(2x)/4` |
| `1/(1+x^2)` | `atan(x)` |
| `ln(x)` | `x*ln(x) - x` |
| `2x*cos(x^2)` | `sin(x^2)` |
| `cos(3x)` | `sin(3x)/3` |
| `x^2*e^x` | `x^2*e^x - 2x*e^x + 2e^x` |

## Errors

| Message | When |
|---|---|
| Primitiva non trovata in forma chiusa: usa l'integrale definito numerico ("Antiderivative not found in closed form: use the numeric definite integral") | The form is not in the table (for example `sin(x)/x` or `e^(x^2)`), or the check by deriving did not succeed. |
| Espressione vuota ("Empty expression") | The function is empty. |
| Espressione non valida al carattere …: … ("Invalid expression at character …") | The function is badly written. |
| Espressione non valida: … vuole … argomenti, ne ha … ("… wants … arguments, it has …") | A function has the wrong number of arguments. |
| f deve essere un'espressione di testo, come «x^2 + 1» ("f must be a text expression") | Something that is not a text arrives at the **f** input. |
| Nome di variabile non valido: «…» ("Invalid variable name") | The **Variable** is not a valid name. |
| «…» è una costante, non può essere la variabile ("… is a constant, it cannot be the variable") | The **Variable** is `pi` or `e`. |

## See also

- [Definite integral](int.definite) for the value of the integral between two ends
- [Derivative (symbolic)](fn.derivative) for the opposite step
- [Function f(x)](fn.define) to give a name to the function
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
