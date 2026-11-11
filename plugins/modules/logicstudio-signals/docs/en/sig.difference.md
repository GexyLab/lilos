# Difference equation (lfilter)

`sig.difference` · Signals · [Signals](logicstudio-signals) · version 1

The most general linear filter: you write the **b** (input) and **a** (output) coefficients of the difference equation yourself, as in `scipy.signal.lfilter`. With the **b** list alone it is an FIR filter; with **a** as well it is an IIR (recursive) filter. It suits filters found elsewhere (a book, a design program), integrators, differentiators, first-order filters and trying out an idea. It keeps its state from one frame to the next and sends its coefficients to [Frequency response (freqz, Bode)](sig.response).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal to filter: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). The imaginary part `im`, if there is one, is ignored. |
| **coefficients** (`coefficients`) | any | Ready-made coefficients, in place of the **b** and **a** settings: a list (`b` only, FIR filter), an object `{ b, a }` or an object `{ sos }` (second-order sections, each `[b0, b1, b2, a0, a1, a2]`), also in a JSON text. The **coefficients** output of the other filter blocks fits. Hidden by default: show it with the eye in Properties. |
| **reset** (`reset`) | pulse | Takes the filter back to zero (no memory of past frames). Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The filtered signal, with the same `fs` and `t0`. If a list came in, a list goes out. |
| **coefficients** (`coefficients`) | object | `{ fs, b, a }` (or `{ fs, sos, b, a }` if the coefficients came in as sections), with `a[0]` = 1 and the `fs` of the signal. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid coefficients, an invalid signal or one that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Coefficients b (input)** (`b`) | JSON list, or numbers separated by spaces, commas or semicolons | `[0.5, 0.5]` | The coefficients that multiply the inputs `x[n]`, `x[n−1]`, … |
| **Coefficients a (output)** (`a`) | as above | `[1]` | The coefficients that multiply past outputs; the first (`a0`) divides everything and cannot be 0. `[1]` means no recursion (FIR). |
| **Zero phase (forward and backward, filtfilt)** (`zeroPhase`) | yes / no | no | Filters forward and backward: no phase delay, but no state between frames. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers coming in on **signal**. It is also used for the coefficients sent at the start. |

Coefficients are written for example `[1, -0.5]`, or `1 -0.5`, or `1, -0.5`. A single number (`2`) is not enough: write it as a list (`[2]`) or with another value beside it.

## How it works

- For every sample the block computes:

  `a0·y[n] = b0·x[n] + b1·x[n−1] + … − a1·y[n−1] − a2·y[n−2] − …`

  First it divides all the coefficients by `a0`, so that `a0` is 1.
- **The state stays between frames**: consecutive frames of the same signal join without jumps. **reset** takes it back to zero; changing **b**, **a** or the value on **coefficients** also takes it back to zero.
- With **Zero phase** each frame is filtered **forward and backward**, with the edges extended, and **keeps no state**.
- **At the start** the block sends the coefficients of the settings at the **fs of plain lists**, so [Frequency response (freqz, Bode)](sig.response) can draw them before the signal. Then it sends them with the first signal (at its `fs`) and after every change or **reset**.
- The coefficients on the **coefficients** input, if there are any, **win** over **b** and **a**.
- If a list of numbers comes in, a list goes out; if a signal comes in, a signal goes out.
- **Mind stability**: if a pole is outside the unit circle the output grows without end. Check it with [Frequency response (freqz, Bode)](sig.response): the **stable** output tells you.

## A bit of theory

The **difference equation** is the recipe of a linear time-invariant (LTI) filter:

`y[n] = Σ b[k]·x[n−k] − Σ a[k]·y[n−k]`   (the first sum from k = 0, the second from k = 1, with `a0` = 1)

The **transfer function** is got with the Z transform:

`H(z) = (b0 + b1·z⁻¹ + … + bM·z⁻ᴹ) / (1 + a1·z⁻¹ + … + aN·z⁻ᴺ)`

The roots of the numerator are the **zeros**, those of the denominator the **poles**. The filter is **stable** if all the poles are inside the unit circle (`|p| < 1`). The gain at a frequency `f` is read on `H(e^(j·2π·f/fs))`.

A few classic filters:

| Filter | b | a | What it does |
|---|---|---|---|
| average of two samples | `[0.5, 0.5]` | `[1]` | low-pass, zero at fs/2 |
| differentiator (difference) | `[1, -1]` | `[1]` | `y[n] = x[n] − x[n−1]`, high-pass |
| leaky integrator | `[0.1]` | `[1, -0.9]` | `y[n] = 0.1·x[n] + 0.9·y[n−1]`, low-pass, pole at 0.9 |
| accumulator | `[1]` | `[1, -1]` | sum of all the samples; pole at 1 (on the edge of stability) |

In the leaky filter, a step at the input (`1, 1, 1, …`) gives `0.1; 0.19; 0.271; 0.3439; …` and tends to 1: the time constant is about `−1/ln(0.9) ≈ 9.5` samples.

## Examples

### 1. A first-order filter

**b** `[0.1]`, **a** `[1, -0.9]`, `fs` = 1000 Hz, on a step:

```
[Impulse · Step · Ramp] signal ──▶ signal [Difference equation (lfilter)] signal ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
```

It gives `0.1, 0.19, 0.271, 0.3439, …`. If the frames come one after the other, the second goes on where the first ends.

### 2. Coefficients written as text

**b** `1 2 1`, **a** `1 0.5`: on `[1, 0, 0]` it gives `[1, 1.5, 0.25]`.

### 3. An unstable filter

**b** `[1]`, **a** `[1, -1.1]` (pole at 1.1): on `[1, 0, 0, 0, 0]` it gives `[1, 1.1, 1.21, 1.331, 1.4641]`, which grows without end. [Frequency response (freqz, Bode)](sig.response) gives **stable** = no.

### 4. Coefficients from another block

```
[IIR filter (butter, cheby1, cheby2)] coefficients ──▶ coefficients [Difference equation (lfilter)]
```

(with the hidden port shown in Properties): the second block applies the same filter, handy to filter another signal with the same recipe.

## Errors

| Message | When |
|---|---|
| I coefficienti b devono essere una lista ("The b coefficients must be a list") | **b** is not a list (nor separated numbers). |
| I coefficienti a devono essere una lista ("The a coefficients must be a list") | **a** is not a list (nor separated numbers). |
| Serve almeno un coefficiente b ("At least one b coefficient is needed") | The **b** list is empty. |
| Il primo coefficiente a (a0) non può essere 0 ("The first a coefficient (a0) cannot be 0") | **a** is empty or starts with 0. |
| I coefficienti b: il valore N non è un numero ("value N is not a number") | Coefficient number N of **b** is not a number. |
| I coefficienti a: il valore N non è un numero ("value N is not a number") | Coefficient number N of **a** is not a number. |
| I coefficienti non sono JSON valido ("The coefficients are not valid JSON") | A text that is not JSON came in on **coefficients**. |
| I coefficienti devono essere una lista (FIR), { b, a } o { sos } ("The coefficients must be a list (FIR), { b, a } or { sos }") | On **coefficients** there is neither a list nor an object with `b` or `sos`. |
| La sezione N deve avere 6 coefficienti [b0, b1, b2, a0, a1, a2] ("Section N must have 6 coefficients") | In `sos`, section N does not have 6 numbers. |
| La sezione N ha a0 = 0 ("Section N has a0 = 0") | In `sos`, section N has `a0` = 0. |
| I coefficienti: il valore N non è un numero ("value N is not a number") | A coefficient of a list or of a section is not a number. |
| Il segnale manca ("The signal is missing") | An empty value (`null`) came in on **signal**. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | Another kind of value came in. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is not more than 0. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample number N is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [Frequency response (freqz, Bode)](sig.response) for magnitude, phase, poles, zeros and stability
- [IIR filter (butter, cheby1, cheby2)](sig.iir) to design a filter from the frequencies
- [FIR filter (firwin)](sig.fir) to design a linear-phase FIR
- [Biquad (RBJ, equalizer)](sig.biquad) for a second-order filter
- [Sample filter (moving average, EMA)](sig.smooth) to smooth values
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
