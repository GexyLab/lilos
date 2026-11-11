# Gain · Offset

`sig.gain` · Signals · [Signals](logicstudio-signals) · version 1

Changes the level of a signal: multiplies it by a gain (in times or in dB), adds an offset, and can remove the mean, bring it to a set peak or RMS, or invert it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal: a real signal `{ fs, t0, samples }` or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The changed signal, with the same fs and the same `t0`. If a plain list came in, a plain list goes out. |
| **Exception** (`error`) | object | An input that is not a signal, or a signal that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Gain** (`gain`) | number | 1 | The factor to multiply by. |
| **Gain in** (`unit`) | times (×) / decibel (dB) | times | How to read the gain. With **dB** the factor is `10^(gain/20)`: 6 dB is about ×2, −20 dB is ×0.1. |
| **Offset (added at the end)** (`offset`) | number | 0 | A value added to every sample after the gain. |
| **Remove the mean (DC) first** (`removeMean`) | yes / no | no | Before anything else it subtracts the mean of the signal (the DC component). |
| **Normalize** (`normalize`) | no / peak to the level / RMS to the level | no | Brings the largest `abs(x)` (peak) or the effective value (RMS) to the **Level**. |
| **Level** (`level`) | number from 0 up | 1 | The wanted peak or RMS. It shows only with **Normalize** on peak or RMS. |
| **Invert (× −1)** (`invert`) | yes / no | no | Changes the sign of the gain. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

## How it works

For every signal that arrives, the steps are always in this order:

1. **Remove the mean**, if on;
2. **Normalize**, if on: multiplies by `level / peak` (or `level / RMS`);
3. **Gain** (and **Invert**): multiplies by the gain, taken in times or converted from dB;
4. **Offset**: adds the constant.

As a formula: `y = (x' · normalization) · gain · (±1) + offset`.

- A signal that is all zero cannot be normalized (peak or RMS 0): in that case the normalization is skipped.
- A plain list comes in at **fs of plain lists** and goes out as a plain list; a signal goes out as a signal with the same fs and the same `t0`. The imaginary part of a complex signal is not kept.

## A bit of theory

- **dB.** A gain in decibels is `G_dB = 20·log₁₀(gain)` for amplitudes. So +6.02 dB = ×2, +20 dB = ×10, −6.02 dB = ×0.5, 0 dB = ×1. For *powers* the formula is `10·log₁₀`, which gives the same table because power is amplitude squared. See [dB ↔ linear](sig.db).
- **Offset.** Adding a constant changes only the DC component (the line at 0 Hz of the spectrum); it changes neither the other frequencies nor the peak-to-peak amplitude.
- **Removing the mean** zeroes the line at 0 Hz and is useful before an FFT, so the low frequencies are not hidden under the DC.
- **Peak or RMS.** Normalizing to the peak uses the whole range without saturating; normalizing to the RMS brings different signals to the same mean energy (same "loudness"). A sine has peak = `√2 · RMS` (crest factor 1.414).
- **A negative gain** (or **Invert**) turns the phase by 180°: the amplitude spectrum does not change.

## Examples

### 1. A sine from ±1 to ±0.5, moved up

```
[Oscillator (waveform generator)] signal ──▶ signal [Gain · Offset] signal ──▶ signal [To chart]
```

With **Gain** 0.5 and **Offset** 0.5 the sine from −1…+1 becomes a wave from 0 to 1.

### 2. Preparing a signal for the FFT

```
[Signal from list] signal ──▶ signal [Gain · Offset] signal ──▶ signal [Window (scipy.signal.get_window)] signal ──▶ signal [FFT (np.fft.fft)]
```

With **Remove the mean (DC) first** on, the line at 0 Hz disappears and the low frequencies can be seen.

### 3. Numbers

- List `[1, −1, 0.5]` with **Gain** 6.0206 **dB** → about `[2, −2, 1]`.
- List `[2, 4, 6, 4]` with **Remove the mean**, **Normalize** on peak at 1 and **Offset** 0.5 → `[−0.5, 0.5, 1.5, 0.5]`.
- Signal `[3, −3, 3, −3]` with **Normalize** to RMS 1 → `[1, −1, 1, −1]`.

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | The block runs without a signal on the input. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a number, a text or an object that is not a signal. |
| Il segnale: il valore … non è un numero ("The signal: value … is not a number") | A list or a signal holds something that is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | More samples than the limit (see [Engine limits](logicstudio-engine/limits)). |

## See also

- [Add · Multiply signals](sig.combine) to combine two signals
- [dB ↔ linear](sig.db) to convert values to and from dB
- [Nonlinearity (clip, rectify)](sig.nonlinear) to saturate or rectify
- [Measures (RMS, peak, mean)](sig.measure) to read peak, RMS and mean before normalizing
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
