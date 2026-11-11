# Frequency response (freqz, Bode)

`sig.response` · Signals · [Signals](logicstudio-signals) · version 1

Works out how a filter treats each frequency: **magnitude** (gain, also in dB), **phase** and **group delay**, that is the Bode plot, plus **poles**, **zeros** and whether the filter is **stable**. It links to the **coefficients** output of the filter blocks and needs no signal: the filters send their coefficients at the start, so the response shows at once.

## Inputs

| Port | Type | Description |
|---|---|---|
| **coefficients** (`coefficients`) | any | The filter: an object `{ b, a }`, an object `{ sos }` (second-order sections `[b0, b1, b2, a0, a1, a2]`), a list of numbers (an FIR filter: `b` only), also in a JSON text. If the object has an `fs` (like the one from the filter blocks), it is used for the frequencies. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **response** (`response`) | object | `{ kind: "response", fs, f, mag, db, phase, groupDelay }`: the frequencies `f` (Hz), the magnitude `mag` (ratio), the magnitude `db` (dB, never below −300), the phase `phase` (**degrees**, unwrapped, with no 360° jumps) and the group delay `groupDelay` (**seconds**). For [To chart](sig.toChart) and the charts. |
| **poles** (`poles`) | list | The poles of `H(z)`: a list of objects `{ re, im, abs }` (real part, imaginary part, magnitude). Hidden by default: show it with the eye in Properties. |
| **zeros** (`zeros`) | list | The zeros of `H(z)`, in the same format. Hidden by default: show it with the eye in Properties. |
| **stable** (`stable`) | yes/no | True if all the poles are inside the unit circle (`abs < 1`). An FIR filter is always stable. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid coefficients. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Points** (`points`) | from 8 to 8192 | 512 | How many frequencies to compute. |
| **Frequencies** (`scale`) | linear, logarithmic (decades) | linear | How the frequencies are spread, from 0 (or from the lowest) to fs/2. The logarithmic one suits the Bode plot. |
| **Lowest frequency (Hz)** (`fmin`) | more than 0 | 1 | Where the logarithmic scale starts (not above fs/20). It shows only with **logarithmic**. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate to use when the coefficients carry no `fs` (a list, or a hand-written `{ b, a }`). |

## How it works

- At every new value on **coefficients** the block does the whole calculation again. No signal is needed: the filter blocks send their coefficients **at the start** (designed at their **fs of plain lists**), then again with the first signal (at the real `fs`) and after every change of design.
- The frequencies go from 0 (or from **Lowest frequency**) to **fs/2**, the Nyquist frequency. The `fs` is the one of the coefficients, if there is one, otherwise the **fs of plain lists**.
- With sections (`sos`) the magnitude is the product of the magnitudes of the sections and the phase is the sum. Poles and zeros are those of all the sections.
- The **magnitude in dB** does not go below −300 dB (where the filter is 0, for example at the zero of a notch). The phase is "unwrapped": it makes no 360° jumps when it goes from −180° to +180°.
- The **group delay** is computed from the slope of the phase (`−Δφ/Δω`, with the neighbouring samples) and comes in seconds. In a linear-phase FIR it is constant.
- To draw the plot: link **response** to [To chart](sig.toChart) (by default it shows the magnitude in dB; with **Show** = Phase it shows the phase) and then to a [Lines](charts.line) chart. The horizontal axis is the frequency.

## A bit of theory

The **frequency response** is the transfer function computed on the unit circle, `H(e^(jω))` with `ω = 2π·f/fs`:

`H(e^(jω)) = (b0 + b1·e^(−jω) + b2·e^(−2jω) + …) / (1 + a1·e^(−jω) + a2·e^(−2jω) + …)`

A sine wave at frequency `f` comes out of the filter with its amplitude multiplied by the **magnitude** `|H|` and its phase increased by the **phase** `arg H`. The gain in decibels is `20·log10(|H|)`: −3 dB means about 0.707 times the amplitude, −6 dB half, −20 dB a tenth.

The **group delay** `τg = −dφ/dω` is the delay (in seconds) with which a group of nearby frequencies travels, that is the envelope of the signal. If it is constant, the shape of the signal is not distorted (linear phase); if it varies with frequency (an IIR), different frequencies arrive at different times.

The **poles** (roots of the denominator) and the **zeros** (of the numerator) explain the response: a pole near the unit circle, at frequency `f`, makes a ridge; a zero on the circle makes a null. A causal filter is **stable** if all the poles are inside the unit circle, `|p| < 1`; a pole outside makes the output grow without end.

## Examples

### 1. The Bode plot of an IIR filter

```
[IIR filter (butter, cheby1, cheby2)] coefficients ──▶ coefficients [Frequency response (freqz, Bode)] response ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
```

With **Frequencies** logarithmic the plot is like the ones in books. In the IIR filter, changing the settings changes the curve at once.

### 2. An average of two samples

The list `[0.5, 0.5]` comes in on the **coefficients** input (with **fs of plain lists** = 1000 Hz, **Points** 9):

```
[Constant · Variable: [0.5, 0.5]] value ──▶ coefficients [Frequency response (freqz, Bode)]
```

The frequencies are 0, 62.5, 125 … 500 Hz; the magnitude is 0 dB at 0 Hz, −3.01 dB at 250 Hz and −300 dB (zero) at 500 Hz; the phase goes from 0° down to −90° (at 500 Hz); the group delay is 0.0005 s (half a sample); **poles** empty, **zeros** `[{ re: -1, im: 0, abs: 1 }]`, **stable** true.

### 3. A hand-written filter and the stability check

With `{ "b": [1], "a": [1, -0.5], "fs": 8000 }` the frequencies reach 4000 Hz, there is a single pole at `0.5` and **stable** is true. With `"a": [1, -1.1]` the pole is at 1.1 and **stable** becomes false:

```
[Difference equation (lfilter)] coefficients ──▶ coefficients [Frequency response (freqz, Bode)] stable ──▶ value [Print (console.log)]
```

## Errors

| Message | When |
|---|---|
| I coefficienti non sono JSON valido ("The coefficients are not valid JSON") | A text that is not JSON came in on **coefficients**. |
| I coefficienti devono essere una lista (FIR), { b, a } o { sos } ("The coefficients must be a list (FIR), { b, a } or { sos }") | There is neither a list nor an object with `b` or `sos`. |
| La sezione N deve avere 6 coefficienti [b0, b1, b2, a0, a1, a2] ("Section N must have 6 coefficients") | In `sos`, section N does not have 6 numbers. |
| La sezione N ha a0 = 0 ("Section N has a0 = 0") | In `sos`, section N has `a0` = 0. |
| I coefficienti: il valore N non è un numero ("value N is not a number") | A coefficient of a list or of a section is not a number. |
| I coefficienti b: il valore N non è un numero ("value N is not a number") | The same, in the `b` list of `{ b, a }`. |
| I coefficienti a: il valore N non è un numero ("value N is not a number") | The same, in the `a` list of `{ b, a }`. |
| Serve almeno un coefficiente b ("At least one b coefficient is needed") | In `{ b, a }`, the `b` list is empty. |
| Il primo coefficiente a (a0) non può essere 0 ("The first a coefficient (a0) cannot be 0") | In `{ b, a }`, `a` is empty or starts with 0. |

## See also

- [IIR filter (butter, cheby1, cheby2)](sig.iir), [Biquad (RBJ, equalizer)](sig.biquad), [FIR filter (firwin)](sig.fir) and [Difference equation (lfilter)](sig.difference), which send the coefficients
- [To chart](sig.toChart) and [Lines](charts.line) to draw the plot
- [FFT (np.fft.fft)](sig.fft) for the spectrum of a real signal
- [Signals](logicstudio-signals)
- [How a block works](ide/blocks)
