# Exponential growth and decay

`fn.growth` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

Exponential growth and decay N(t) = N₀·e^(k·t): from the rate k, or from the half-life or the doubling time.

## Inputs

| Port | Type | Description |
|---|---|---|
| **N₀ (start value)** (`n0`) | number | The start value N₀ (at t = 0). |
| **t (time)** (`t`) | number | The time, in the same unit as **k** or **T**. |
| **k (rate)** (`k`) | number | The rate k (with the **Rate** mode). When it is not linked the **k** setting is used. Hidden by default: show it with the eye in the Properties. |
| **T (half-life or doubling time)** (`T`) | number | The half-life or the doubling time (with the other two modes). When it is not linked the **T** setting is used. Hidden by default: show it with the eye in the Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **N(t)** (`n`) | number | The value N(t), rounded to 15 significant digits. |
| **k (rate)** (`k`) | number | The rate used: the given one, or the one derived from **T** (negative for the half-life). Hidden by default: show it with the eye in the Properties. |
| **half-life or doubling time** (`halfLife`) | number | The half-life (if k < 0) or the doubling time (if k > 0), that is ln 2 / |k|. It does not come out if k = 0. Hidden by default: show it with the eye in the Properties. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Given** (`mode`) | `rate` rate k: N = N₀·e^(k·t); `halfLife` half-life T (decay); `doubling` doubling time T (growth) | `rate` | Which datum you know. |
| **k (when the input is not linked)** (`k`) | a number | 0.05 | The rate, when the **k** input is not linked. |
| **T (when the input is not linked)** (`T`) | a number | 10 | The half-life or doubling time, when the **T** input is not linked. |

## How it works

The block runs when **N₀** or **t** arrives (and waits until both are there) and computes N = N₀·e^(k·t).

- With **Rate**, k is the **k** input (or the setting). Positive is growth, negative is decay.
- With **Half-life T** it uses k = −ln 2 / T: after a time T the value is half (N₀ = 100, T = 5: at t = 10 the value is 25).
- With **Doubling time T** it uses k = ln 2 / T: after a time T the value is double.
- The inputs **k** and **T** are hidden by default: if you do not link them the settings are used, and the block uses only what the chosen mode needs.
- A result too big for the computer is an error.

## Examples

### 1. A rate

**Rate** mode, **k** = 0.05, **N₀** = 100, **t** = 10:

```
[Constant · Variable: 100] value ──▶ N₀ [Exponential growth and decay] N(t) ──▶ value [Print (console.log)]
[Constant · Variable: 10] value ──▶ t
```

Writes `164.872127070013`. **k** is `0.05` and the doubling time `13.8629436111989`.

### 2. A half-life

**Half-life T** mode, **T** = 5, **N₀** = 100, **t** = 10: **N(t)** is `25` and **k** is `-0.138629436111989`. With **N₀** = 80, **T** = 3, **t** = 3 it gives `40`.

### 3. A doubling

**Doubling time T** mode, **T** = 10, **N₀** = 100, **t** = 30: **N(t)** is `800`.

### 4. When it does not work

With **T** = 0: "T deve essere maggiore di 0" (T must be greater than 0).

## Errors

| Message | When |
|---|---|
| N₀: serve un numero ("N₀: a number is needed") | **N₀** is not a number. |
| t: serve un numero ("t: a number is needed") | **t** is not a number. |
| k: serve un numero ("k: a number is needed") | The rate is not a number. |
| T: serve un numero ("T: a number is needed") | The time T is not a number. |
| T deve essere maggiore di 0 ("T must be greater than 0") | With half-life or doubling, **T** is 0 or negative. |
| Il risultato è troppo grande ("The result is too big") | The result is not a finite number (it is over the largest number of the computer, about 10³⁰⁸). |

## See also

- [Exponentials](fn.exp) for eˣ
- [Logarithms](fn.log) to get t or k from two values
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
