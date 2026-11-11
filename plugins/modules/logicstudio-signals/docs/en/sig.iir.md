# IIR filter (butter, cheby1, cheby2)

`sig.iir` · Signals · [Signals](logicstudio-signals) · version 1

Filters a signal with a classic **IIR** (infinite impulse response) filter: Butterworth, Chebyshev I or Chebyshev II; low-pass, high-pass, band-pass or band-stop; up to order 20. The filter works itself out from the frequencies and the order, is made of second-order sections and keeps its state from one frame to the next. It also sends its **coefficients**, so you can draw its response with [Frequency response (freqz, Bode)](sig.response).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal to filter: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). The imaginary part `im`, if there is one, is ignored. |
| **reset** (`reset`) | pulse | Takes the filter back to zero (no memory of past frames). Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The filtered signal, with the same `fs` and `t0`. If a list came in, a list goes out. |
| **coefficients** (`coefficients`) | object | `{ fs, sos, b, a }`: the second-order sections (`sos`, each `[b0, b1, b2, 1, a1, a2]`), the `b` and `a` coefficients of the whole filter and the `fs` it is designed for. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid frequencies or order, an invalid signal or one that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Family** (`family`) | Butterworth (flat), Chebyshev I (ripple in the pass band), Chebyshev II (ripple in the stop band) | Butterworth | The shape of the response (see the theory). |
| **Kind** (`band`) | low-pass, high-pass, band-pass, band-stop | low-pass | Which frequencies pass. |
| **Order** (`order`) | from 1 to 20 | 4 | The higher, the steeper the cut. In band-pass and band-stop filters the poles are doubled (order 2: 4 poles, 2 sections). |
| **Cutoff frequency (Hz)** (`f1`) | more than 0 and less than fs/2 | 100 | The cutoff; in band filters, the **lower** frequency of the band. |
| **Upper frequency (Hz)** (`f2`) | more than **f1** and less than fs/2 | 200 | The **upper** frequency of the band. It shows only with **band-pass** or **band-stop**. |
| **Pass-band ripple (dB)** (`ripple`) | more than 0 | 1 | How much the gain may ripple in the pass band. It shows only with **Chebyshev I**. |
| **Stop-band attenuation (dB)** (`attenuation`) | more than 0 | 40 | The least attenuation in the stop band. It shows only with **Chebyshev II**. |
| **Zero phase (forward and backward, filtfilt)** (`zeroPhase`) | yes / no | no | Filters forward and backward: no phase delay, but no state between frames (see below). |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers coming in on **signal**. It is also used for the coefficients sent at the start. |

## How it works

- Frequencies are in Hz and the filter uses the `fs` of the signal that comes in. If the `fs` changes, the filter is worked out again.
- **The state stays between frames**: consecutive frames of the same signal join without jumps, as if it were one long signal. **reset** takes it back to zero; a change of the settings (a new design of the filter) also takes it back to zero.
- With **Zero phase** each frame is filtered **forward and backward**, with the edges extended to reduce transients. There is no phase delay, but the filter acts twice (at the cutoff the gain of a Butterworth goes from −3 dB to −6 dB) and it **keeps no state**: each frame stands on its own. It is fine on a whole signal, worse on short consecutive frames.
- **At the start** the block sends the coefficients worked out at the **fs of plain lists**, so [Frequency response (freqz, Bode)](sig.response) can draw them before any signal arrives. Then it sends the coefficients **with the first signal** (at its `fs`) and again after every change of the design or every **reset**.
- If a list of numbers comes in, a list goes out; if a signal comes in, a signal goes out.
- If the parameters are not right, the error comes with the first signal (nothing is said at the start).

## A bit of theory

An IIR filter computes the output from the inputs and **also from past outputs**, with the difference equation

`y[n] = Σ b[k]·x[n−k] − Σ a[k]·y[n−k]`   (the first sum from k = 0, the second from k = 1)

Its transfer function is `H(z) = (b0 + b1·z⁻¹ + …) / (1 + a1·z⁻¹ + …)`. The roots of the numerator are the **zeros**, those of the denominator the **poles**. The filter is **stable** if all the poles are inside the unit circle (`|p| < 1`); the ones designed by this block are. The filter is a chain of **second-order sections** (biquads): it is far more precise, numerically, than a single polynomial of high order.

The three families:

- **Butterworth**: the flattest possible gain in the pass band, no ripple; at the cutoff it is −3.01 dB; then it falls by `20·N` dB per decade (N = order).
- **Chebyshev I**: steeper than Butterworth, but with a constant **ripple** in the pass band (`ripple` dB). The cutoff is where the gain leaves that band: with ripple 1 dB, at **f1** the gain is −1 dB.
- **Chebyshev II**: flat pass band and ripple in the **stop band**. Here **f1** is where the stop band begins: from there on the gain stays below `−attenuation` dB (with 40 dB, at **f1** it is −40 dB).

The digital filter comes from an **analog prototype**, transformed with the **bilinear transform** `s = 2·fs·(z−1)/(z+1)`. The transform bends the frequency axis (it squeezes it towards fs/2), so the cutoff frequencies are **pre-warped**: `ωa = 2·fs·tan(π·f/fs)`. This way the cutoff falls exactly where you wrote it.

An IIR filter has **non-linear** phase: different frequencies are delayed differently (see the group delay in [Frequency response](sig.response)). If phase matters, use **Zero phase** (on a whole signal) or an [FIR filter](sig.fir).

## Examples

### 1. Taking a fast disturbance off a slow signal

A 5 Hz sine with a disturbance at 200 Hz, `fs` = 1000 Hz. A 4th-order low-pass at 20 Hz leaves only the 5 Hz:

```
[Oscillator (waveform generator): 5 Hz]   signal ──▶ a [Add · Multiply signals] signal ──▶ signal [IIR filter (butter, cheby1, cheby2)] signal ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
[Oscillator (waveform generator): 200 Hz] signal ──▶ b
```

With a frame of 1000 samples (5 Hz + 200 Hz, amplitude 1 each), the RMS value after the initial transient is 0.7071, that of the 5 Hz sine alone.

### 2. Drawing the filter's response

```
[IIR filter (butter, cheby1, cheby2)] coefficients ──▶ coefficients [Frequency response (freqz, Bode)] response ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
```

The coefficients come out at the start, so the chart is there at once. With the default settings (Butterworth, low-pass, order 4, cutoff 100 Hz, fs 1000 Hz) the response is about 0 dB at 0 Hz and at 50 Hz, −3.01 dB at 100 Hz, −15.8 dB at 150 Hz, −28 dB at 200 Hz. With Chebyshev I (1 dB) it is −1 dB at 100 Hz and −23.6 dB at 150 Hz; with Chebyshev II (40 dB) it is −40 dB at 100 Hz.

### 3. Keeping a band

**Kind** band-pass, **Cutoff frequency** 80 and **Upper frequency** 120, order 2 (4 poles, 2 sections): it lets the 80 – 120 Hz band pass and removes the rest.

## Errors

| Message | When |
|---|---|
| L'ordine va da 1 a 20 ("The order goes from 1 to 20") | **Order** outside the range. |
| La frequenza di taglio (… Hz) deve stare tra 0 e fs/2 (… Hz) ("The cutoff frequency must be between 0 and fs/2") | **Cutoff frequency** (or **Upper frequency**) is not more than 0 and less than fs/2. |
| La seconda frequenza deve essere più alta della prima ("The second frequency must be higher than the first") | In band filters, **Upper frequency** is not more than **Cutoff frequency**. |
| L'ondulazione deve essere più di 0 dB ("The ripple must be more than 0 dB") | Chebyshev I with **Ripple** 0 or less. |
| L'attenuazione deve essere più di 0 dB ("The attenuation must be more than 0 dB") | Chebyshev II with **Attenuation** 0 or less. |
| Il segnale manca ("The signal is missing") | An empty value (`null`) came in on **signal**. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | Another kind of value came in. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is not more than 0. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample number N is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [Frequency response (freqz, Bode)](sig.response) to draw magnitude, phase, poles and zeros of the coefficients
- [Biquad (RBJ, equalizer)](sig.biquad) for a single second-order filter (also notch, peak, shelf)
- [FIR filter (firwin)](sig.fir) for a linear-phase filter
- [Difference equation (lfilter)](sig.difference) for coefficients you choose
- [Sample filter (moving average, EMA)](sig.smooth) to smooth values
- [FFT (np.fft.fft)](sig.fft) to see the spectrum before and after the filter
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
