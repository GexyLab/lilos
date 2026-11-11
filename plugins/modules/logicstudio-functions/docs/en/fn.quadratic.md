# Quadratic equation ax² + bx + c = 0

`fn.quadratic` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Solves the equation `ax² + bx + c = 0`: the two solutions (also complex), the discriminant and the vertex of the parabola.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** (`a`) | number | The coefficient of x². It cannot be 0. |
| **b** (`b`) | number | The coefficient of x. |
| **c** (`c`) | number | The constant term. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **x₁** (`x1`) | number | The smaller solution. It comes out only when Δ ≥ 0 (real solutions). |
| **x₂** (`x2`) | number | The bigger solution (equal to **x₁** if Δ = 0). It comes out only when Δ ≥ 0. |
| **Δ (discriminant)** (`delta`) | number | The discriminant b² − 4ac. |
| **complex roots** (`complex`) | yes/no | `true` if Δ < 0 (the solutions are complex). Hidden by default: show it with the eye in the Properties. |
| **roots {re, im}** (`roots`) | list | The two solutions as a list of `{re, im}` objects (real part and imaginary part). For Δ < 0 they are two conjugate complex numbers. Hidden by default: show it with the eye in the Properties. |
| **vertex x** (`vertexX`) | number | The x of the vertex, −b / 2a. Hidden by default: show it with the eye in the Properties. |
| **vertex y** (`vertexY`) | number | The y of the vertex. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

This block has no settings.

## How it works

The block runs when a value arrives on **a**, **b** or **c**, and waits until all three have one. Then it computes Δ = b² − 4ac and the solutions with the closed formula, in a form that does not lose digits when b is large compared to a and c.

- **Δ > 0**: two different real solutions, on **x₁** (the smaller) and **x₂** (the bigger).
- **Δ = 0**: a double solution; **x₁** and **x₂** are equal.
- **Δ < 0**: complex solutions. **x₁** and **x₂** **do not come out**; read **roots {re, im}** (hidden by default) and **complex roots** (`true`).

The vertex is the point (−b / 2a ; a·x² + b·x + c) computed at that x. The results are rounded to 15 significant digits. For a polynomial of higher degree use [Polynomial: value and roots](fn.poly).

## Examples

### 1. Two solutions

`x² − 3x + 2 = 0`, that is **a** = 1, **b** = −3, **c** = 2: **x₁** = 1, **x₂** = 2, **Δ** = 1; the vertex is (1.5 ; −0.25).

### 2. A double solution

`x² + 2x + 1 = 0`: **Δ** = 0, **x₁** = **x₂** = −1.

### 3. Complex solutions

`x² + 2x + 5 = 0`: **Δ** = −16, **complex roots** = `true`, **roots {re, im}** = `[{"re":-1,"im":-2},{"re":-1,"im":2}]`, vertex (−1 ; 4). **x₁** and **x₂** do not come out.

### 4. On a console

```
[Constant · Variable: 2] value ──▶ a [Quadratic equation] x₁ ──▶ value [Print (console.log)]
[Constant · Variable: -4] value ──▶ b
[Constant · Variable: -6] value ──▶ c
```

Writes `-1` (the solutions of `2x² − 4x − 6 = 0` are −1 and 3; **Δ** = 64).

## Errors

| Message | When |
|---|---|
| a = 0: non è un'equazione di secondo grado ("a = 0: it is not a quadratic equation") | **a** is 0. |
| a: serve un numero ("a: a number is needed") | **a** (or **b**, or **c**: the message starts with its name) is not a number. |

## See also

- [Polynomial: value and roots](fn.poly) for higher degrees
- [Solve f(x) = 0](fn.solve) for any function
- [Math functions](core.math) for simple calculations
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
