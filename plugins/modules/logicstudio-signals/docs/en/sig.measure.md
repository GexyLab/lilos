# Measures (RMS, peak, mean)

`sig.measure` · Signals · [Signals](logicstudio-signals) · version 1

Measures a signal in time: effective value (RMS), peak, mean (DC), minimum, maximum, peak to peak, standard deviation, crest factor, mean power, energy and RMS in dB.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal: a real signal `{ fs, t0, samples }` or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **RMS** (`rms`) | number | The effective value. |
| **peak** (`peak`) | number | The largest absolute value of the samples. |
| **mean (DC)** (`mean`) | number | The mean of the samples (the DC component). |
| **minimum** (`min`) | number | The lowest sample. Hidden by default: show it with the eye in Properties. |
| **maximum** (`max`) | number | The highest sample. Hidden by default: show it with the eye in Properties. |
| **peak to peak** (`peakToPeak`) | number | Maximum minus minimum. Hidden by default: show it with the eye in Properties. |
| **standard deviation** (`std`) | number | The standard deviation of the samples. Hidden by default: show it with the eye in Properties. |
| **crest factor** (`crest`) | number | Peak divided by RMS. Hidden by default: show it with the eye in Properties. |
| **mean power** (`power`) | number | The mean of the squares of the samples. Hidden by default: show it with the eye in Properties. |
| **energy** (`energy`) | number | The sum of the squares divided by the fs. Hidden by default: show it with the eye in Properties. |
| **RMS in dB** (`db`) | number | The RMS in decibels relative to **dB reference**. Hidden by default: show it with the eye in Properties. |
| **all the measures** (`all`) | object | All the measures together, plus `n` (how many samples) and `duration` (duration in seconds). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An empty signal, an input that is not a signal, or a signal that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **dB reference (0 dB)** (`ref`) | number more than 0 | 1 | The value that corresponds to 0 dB for the **RMS in dB** output. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in (needed for the energy and the duration). A real signal already carries its fs. |

## How it works

For each signal that arrives, the block calculates all the measures on the whole signal (it does not update sample by sample) and sends them: you link only the outputs you need.

| Measure | Formula |
|---|---|
| RMS | `√( Σx² / N )` |
| peak | the larger of `abs(minimum)` and `abs(maximum)` |
| mean | `Σx / N` |
| peak to peak | `maximum − minimum` |
| standard deviation | `√( power − mean² )` (calculated on `N`, not on `N − 1`) |
| crest factor | `peak / RMS` (0 if the RMS is 0) |
| mean power | `Σx² / N` |
| energy | `Σx² / fs` |
| RMS in dB | `20·log₁₀( RMS / reference )`, never below −300 dB |

The block measures *all* the samples that arrive together in a signal: a signal of 1000 samples gives a single measure. For sliding measures, cut the stream into frames with [Buffer (samples → frames)](sig.buffer).

With a sine of amplitude 1 and frequency 50 Hz for 1 s at 1000 Hz: RMS 0.7071, peak 1, mean about 0, peak to peak 2, crest factor 1.4142, power 0.5, energy 0.5 (1000 samples · 0.5 / 1000 Hz), **RMS in dB** −3.01. With `[1, 2, 3, 4]` at 10 Hz: RMS 2.7386, peak 4, mean 2.5, standard deviation 1.118, power 7.5, energy 3, duration 0.4 s.

## A bit of theory

- **RMS.** It is the effective value: that of a DC voltage that would heat a resistor like the signal. For a sine of amplitude `A` it is `A / √2 ≈ 0.707·A`; for a square wave it is `A`; for a triangle `A / √3`.
- **Mean, deviation and RMS.** It always holds that `RMS² = mean² + deviation²`: the power is the sum of the constant part (mean²) and of the part that oscillates (deviation²). For a signal with no DC, standard deviation and RMS are equal.
- **Crest factor** `= peak / RMS`: 1 for a square wave, 1.414 (3.01 dB) for a sine, 1.73 for a triangle, 3–4 for Gaussian noise. It tells how "spiky" the wave is and how much margin is needed before a converter saturates.
- **Power and energy.** The mean power is `Σx²/N`; the energy `Σx²/fs` is the integral of `x(t)²` over time: by Parseval's theorem it is the same one gets by summing the spectrum.
- **Measuring well.** The RMS and mean of a periodic signal are precise if the window holds **whole** periods; otherwise the rest of a period dirties them (an error that falls with more periods). The mean of a sine over a whole period is zero.
- **dB.** An RMS of 1 relative to a reference of 1 is 0 dB; 0.1 is −20 dB. See [dB ↔ linear](sig.db).

## Examples

### 1. The level of a signal

```
[Oscillator (waveform generator)] signal ──▶ signal [Measures (RMS, peak, mean)] RMS ──▶ value [Label]
```

With the default sine (amplitude 1) the label shows about `0.707`.

### 2. Measuring how much it oscillates

```
[Signal from list] signal ──▶ signal [Measures (RMS, peak, mean)] standard deviation ──▶ value [Print (console.log)]
```

The **standard deviation** output is hidden by default: show it with the eye in Properties. If you want the signal without its DC instead, use [Gain · Offset](sig.gain) with **Remove the mean (DC) first**.

### 3. A single output with everything

Link **all the measures** to a [To chart](sig.toChart) or to a block that reads objects: the object has `rms`, `peak`, `mean`, `min`, `max`, `peakToPeak`, `std`, `crest`, `power`, `energy`, `db`, `n` and `duration`.

## Errors

| Message | When |
|---|---|
| Il segnale è vuoto ("The signal is empty") | The signal has no samples (list `[]`). |
| Il segnale manca ("The signal is missing") | The block runs without a signal on the input. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a number, a text or an object that is not a signal. |
| Il segnale: il valore … non è un numero ("The signal: value … is not a number") | A list or a signal holds something that is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | More samples than the limit (see [Engine limits](logicstudio-engine/limits)). |

## See also

- [Distortion (THD, SNR, SINAD)](sig.distortion) to measure harmonics and noise
- [Frequency · Period](sig.frequency) to measure the frequency of a signal
- [dB ↔ linear](sig.db) to convert the measures to dB
- [Gain · Offset](sig.gain) to remove the mean or normalize to a peak or RMS
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
