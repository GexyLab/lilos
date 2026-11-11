# Nonlinearity (clip, rectify)

`sig.nonlinear` · Signals · [Signals](logicstudio-signals) · version 1

Applies a nonlinear function to every sample: hard clip, soft saturation, half-wave or full-wave rectifier, dead zone, square or sign.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal: a real signal `{ fs, t0, samples }` or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The changed signal, with the same fs and the same `t0`. If a plain list came in, a plain list goes out. |
| **Exception** (`error`) | object | A maximum lower than the minimum in **Clip**, a signal that is too long, or an input that is not a signal. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | see the table below | clip | The function to apply. |
| **Minimum** (`min`) | number | −0.5 | The lowest level. It shows only with **clip**. |
| **Maximum** (`max`) | number | 0.5 | The highest level. It shows only with **clip**. |
| **Drive** (`drive`) | from 0 up | 2 | How strong the saturation is. It shows only with **soft saturation (tanh)**. |
| **Threshold** (`threshold`) | from 0 up | 0.1 | The width of the dead zone on each side of zero. It shows only with **dead zone**. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

| Operation | Function for each sample `x` | Example (with the default settings) on `[−1, −0.3, 0, 0.05, 0.3, 1]` |
|---|---|---|
| **Clip** (`clip`) | `x` kept between **Minimum** and **Maximum** | `[−0.5, −0.3, 0, 0.05, 0.3, 0.5]` |
| **Soft saturation** (`tanh`) | `tanh(drive·x) / tanh(drive)` | `[−1, −0.557, 0, 0.103, 0.557, 1]` |
| **Half-wave rectifier** (`halfWave`) | `max(0, x)` | `[0, 0, 0, 0.05, 0.3, 1]` |
| **Full-wave rectifier** (`fullWave`) | `abs(x)` | `[1, 0.3, 0, 0.05, 0.3, 1]` |
| **Dead zone** (`deadzone`) | 0 if `abs(x) ≤ threshold`, otherwise `x` minus `threshold` toward zero | `[−0.9, −0.2, 0, 0, 0.2, 0.9]` |
| **Square** (`square`) | `x²` | `[1, 0.09, 0, 0.0025, 0.09, 1]` |
| **Sign** (`sign`) | −1, 0 or +1 | `[−1, −1, 0, 1, 1, 1]` |

## How it works

Every sample is treated on its own, without memory: the output depends only on the value coming in at that moment. The signal goes out with the same length, fs and `t0`.

- **Clip** with **Maximum** lower than **Minimum** gives an exception; with the two equal the signal becomes a constant.
- **Soft saturation** is divided by `tanh(drive)`, so an input of ±1 always goes out at ±1 whatever the drive. With **Drive** 0 the signal passes unchanged. For small values of `x` the curve is almost a straight line with slope `drive / tanh(drive)`.
- **Dead zone** removes the part of the signal inside ±threshold and shortens everything else by `threshold` (so there is no jump).
- **Sign** gives 0 for a sample exactly at 0.
- The imaginary part of a complex signal is not kept.

## A bit of theory

A system is *linear* if the output for a sum is the sum of the outputs. The operations of this block are not, and the result shows in the spectrum: **new frequencies are born**.

- **Saturation (clip, tanh).** A symmetric curve creates only **odd** harmonics (3f, 5f, 7f…). Hard clipping creates many and strong ones (a heavily clipped sine tends to a square wave); tanh creates fewer, falling faster: a "warmer" sound. The higher the drive, the closer the signal gets to a square wave.
- **Full-wave rectifier `|x|`.** A sine of frequency `f` becomes a signal of frequency `2f` (plus a DC component `2A/π ≈ 0.637·A` and its even harmonics).
- **Half-wave.** It has a DC of `A/π`, the fundamental `f` and **even** harmonics. It is the first step to extract an envelope (then low-pass filter).
- **Square.** `sin²(ωt) = ½ − ½·cos(2ωt)`: a DC and double the frequency. With two frequencies `f₁` and `f₂`, `f₁ ± f₂` are born (intermodulation); squaring a sum of tones reveals the beat frequencies.
- **Dead zone.** It cuts small signals: it is seen in an unbiased amplifier (*crossover distortion*) or as a noise threshold.
- **Sign (comparator).** Turns any signal into a two-level wave: it keeps only the zero crossings. A sine becomes a square wave.

## Examples

### 1. A clipped sine

```
[Oscillator (waveform generator)] signal ──▶ signal [Nonlinearity (clip, rectify): clip −0.5 … 0.5] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart]
```

The sine from ±1 is squashed at ±0.5; in the spectrum, besides the starting line, lines at 3f, 5f, 7f… appear.

### 2. Rectify and filter

```
[Oscillator (waveform generator)] signal ──▶ signal [Nonlinearity (clip, rectify): full-wave] signal ──▶ signal [IIR filter (butter, cheby1, cheby2): low-pass] signal ──▶ signal [To chart]
```

The low-pass removes the peaks: what is left is the mean of the absolute value, an almost constant signal (a level indicator).

### 3. A comparator with a threshold

Link [Add · Multiply signals](sig.combine) in **Subtract** (signal − threshold) to a **Sign** block: the output is +1 when the signal is above the threshold, −1 below.

## Errors

| Message | When |
|---|---|
| Il massimo deve essere almeno il minimo ("The maximum must be at least the minimum") | In **Clip**, **Maximum** is lower than **Minimum**. |
| Operazione sconosciuta: … ("Unknown operation") | The operation saved in the project does not exist (it does not happen when choosing it from the menu). |
| Il segnale manca ("The signal is missing") | The block runs without a signal on the input. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a number, a text or an object that is not a signal. |
| Il segnale: il valore … non è un numero ("The signal: value … is not a number") | A list or a signal holds something that is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | More samples than the limit (see [Engine limits](logicstudio-engine/limits)). |

## See also

- [Envelope (scipy.signal.hilbert)](sig.envelope) for the envelope of a signal without rectifying
- [Distortion (THD, SNR, SINAD)](sig.distortion) to measure the harmonics that are born
- [Quantize (ADC)](sig.quantize) to round to the levels of a converter
- [Gain · Offset](sig.gain) to bring the signal to the right level before saturating it
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
