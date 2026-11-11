# Biquad (RBJ, equalizer)

`sig.biquad` · Signals · [Signals](logicstudio-signals) · version 1

A single **second-order** filter (biquad) with the formulas of Robert Bristow-Johnson's "Audio EQ Cookbook" (RBJ): low-pass, high-pass, band-pass, notch, peak (bell), low shelf, high shelf and all-pass. You choose the frequency, the **Q** factor and, for peak and shelves, the gain in dB. It is the building brick of equalizers: several blocks in a row make a multi-band equalizer. It keeps its state from one frame to the next and sends its **coefficients** for [Frequency response (freqz, Bode)](sig.response).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal to filter: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). The imaginary part `im`, if there is one, is ignored. |
| **reset** (`reset`) | pulse | Takes the filter back to zero. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The filtered signal, with the same `fs` and `t0`. If a list came in, a list goes out. |
| **coefficients** (`coefficients`) | object | `{ fs, sos, b, a }`: the section `[b0, b1, b2, 1, a1, a2]` (`sos`, with one section only), the `b` and `a` coefficients and the `fs` it is worked out for. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid frequency or Q, an invalid signal or one that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`kind`) | low-pass, high-pass, band-pass, notch (removes one frequency), peak (bell), low shelf, high shelf, all-pass | low-pass | The shape of the response. |
| **Frequency (Hz)** (`frequency`) | more than 0 and less than fs/2 | 100 | The cutoff frequency, or the centre of the band, notch or peak; for the shelves the middle frequency. |
| **Q** (`q`) | from 0.01 to 100 | 0.7071 | How narrow (or resonant) the response is. 0.7071 (= 1/√2) gives a filter as flat as a Butterworth. |
| **Gain (dB)** (`gain`) | number (positive raises, negative lowers) | 6 | By how many dB it raises or lowers. It shows only with **peak**, **low shelf** and **high shelf**. |
| **Zero phase (forward and backward, filtfilt)** (`zeroPhase`) | yes / no | no | Filters forward and backward: no phase delay, but no state between frames. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers coming in on **signal**. It is also used for the coefficients sent at the start. |

## How it works

- The filter uses the `fs` of the signal that comes in; if the `fs` or a setting changes, it is worked out again and the state goes back to zero.
- **The state stays between frames**: consecutive frames join without jumps. **reset** takes it back to zero.
- With **Zero phase** each frame is filtered **forward and backward** (with the edges extended) and **keeps no state**; the filter acts twice, so the gain in dB doubles (a 6 dB peak becomes 12 dB).
- **At the start** the block sends the coefficients worked out at the **fs of plain lists**, so [Frequency response (freqz, Bode)](sig.response) can draw them before the signal. Then it sends them with the first signal (at its `fs`) and after every change or **reset**.
- If a list of numbers comes in, a list goes out; if a signal comes in, a signal goes out.
- If the parameters are not right, the error comes with the first signal.

The gains, measured with `fs` = 48000 Hz, **Frequency** 1000 Hz, Q = 0.7071 and gain 6 dB:

| Kind | At 10 Hz | At 1000 Hz | At 10000 Hz |
|---|---|---|---|
| low-pass | 0 dB | −3 dB | −43 dB |
| high-pass | −77 dB | −3 dB | 0 dB |
| band-pass | −36 dB | 0 dB | −18 dB |
| notch | 0 dB | very low | −0.06 dB |
| all-pass | 0 dB | 0 dB | 0 dB |
| low shelf | +6 dB | +3 dB | 0 dB |
| high shelf | 0 dB | +3 dB | +6 dB |

## A bit of theory

A biquad is a filter with two poles and two zeros: `y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2]`, that is `H(z) = (b0 + b1·z⁻¹ + b2·z⁻²) / (1 + a1·z⁻¹ + a2·z⁻²)`. With the RBJ formulas the coefficients come from

- `ω0 = 2π·f/fs` (the frequency in radians per sample),
- `α = sin(ω0) / (2·Q)`,
- `A = 10^(gain/40)` (for peak and shelves).

For example the low-pass has `b = [(1−cos ω0)/2, 1−cos ω0, (1−cos ω0)/2]` and `a = [1+α, −2·cos ω0, 1−α]`, all divided by `a0 = 1+α`.

**The Q factor**:

- in the low-pass and high-pass, Q = 0.7071 gives the flattest response (like a second-order Butterworth); a higher Q raises a resonance peak near the frequency;
- in the band-pass and notch, Q is the ratio between the centre frequency and the width of the band: the width at −3 dB is about `f/Q`. A high Q means a narrow band;
- in the peak, Q sets the width of the bell; at the centre the gain is exactly the chosen one;
- in the shelves, the chosen gain is reached far from the frequency; at the **Frequency** it is half the dB.

The **all-pass** does not change the magnitude (gain 1 at every frequency) but changes the phase: it is used to correct the phase of other filters. The biquad is stable as long as Q > 0 and the frequency is below fs/2.

## Examples

### 1. Removing 50 Hz hum

`fs` = 1000 Hz, **Kind** notch, **Frequency** 50, **Q** 10 (a band of about 5 Hz):

```
[Noise (np.random)] signal ──▶ a [Add · Multiply signals] signal ──▶ signal [Biquad (RBJ, equalizer)] signal ──▶ signal or spectrum [To chart]
[Oscillator (waveform generator): 50 Hz] signal ──▶ b
```

The 50 Hz sine disappears (after a short transient) and the rest stays almost the same.

### 2. A three-band equalizer

Three biquads in a row: low shelf at 100 Hz (+4 dB), peak at 1000 Hz (−3 dB, Q 1), high shelf at 8000 Hz (+2 dB), with `fs` = 48000 Hz:

```
[Biquad: low shelf] signal ──▶ signal [Biquad: peak] signal ──▶ signal [Biquad: high shelf] signal ──▶ signal [To chart]
```

For a +6 dB peak at 1000 Hz with Q = 1, at 48000 Hz the coefficients are `[1.04395, −1.89532, 0.86772, 1, −1.89532, 0.91168]` and the gain at 1000 Hz is 6 dB.

### 3. Seeing the response

```
[Biquad (RBJ, equalizer)] coefficients ──▶ coefficients [Frequency response (freqz, Bode)] response ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
```

## Errors

| Message | When |
|---|---|
| La frequenza (… Hz) deve stare tra 0 e fs/2 (… Hz) ("The frequency must be between 0 and fs/2") | **Frequency** is not more than 0 and less than fs/2. |
| Q deve essere più di 0 ("Q must be more than 0") | **Q** is 0 or less. |
| Il segnale manca ("The signal is missing") | An empty value (`null`) came in on **signal**. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | Another kind of value came in. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is not more than 0. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample number N is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [IIR filter (butter, cheby1, cheby2)](sig.iir) for filters of higher order
- [Frequency response (freqz, Bode)](sig.response) to draw magnitude, phase, poles and zeros
- [Difference equation (lfilter)](sig.difference) for coefficients you choose
- [FIR filter (firwin)](sig.fir) for a linear-phase filter
- [FFT (np.fft.fft)](sig.fft) to see the spectrum
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
