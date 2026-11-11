# Resample

`sig.resample` · Signals · [Signals](logicstudio-signals) · version 1

Changes the sampling rate of a signal: brings it to a new fs, with a band-limited interpolation (windowed sinc, which avoids aliasing when going down), linear or stepped.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal: a real signal `{ fs, t0, samples }` or a list of numbers (taken at **fs of plain lists**). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The signal at the new fs. It is always a real signal (even if a list came in), with the **new fs** and the same `t0`. |
| **Exception** (`error`) | object | Invalid new fs, a signal that is too long (coming in or going out), or an input that is not a signal. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **New fs (Hz)** (`fsOut`) | number more than 0 | 500 | The sampling rate of the result. |
| **Method** (`method`) | band-limited (windowed sinc, anti-aliasing) / linear interpolation / sample and hold | band-limited | How to calculate the new samples. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

## How it works

Sample `j` of the result is taken at the time `j / new_fs` (from the start of the signal). The number of samples is

`M = floor(N · new_fs / old_fs)`

with `N` the samples coming in: from 1000 samples at 1000 Hz to 500 Hz, 500 come out; to 2000 Hz, 2000 come out. The duration stays the same (within one sample).

- **Band-limited** (windowed sinc). Each new sample is a weighted sum of the nearby samples, with the `sinc` kernel cut by a Blackman window, 16 samples wide on each side (16 / c when going down, where `c = new_fs / old_fs`). When going down in fs, the cutoff is at `new_fs / 2`, so the frequencies that are too high are removed first (anti-aliasing). Near the start and the end the kernel falls outside the signal and samples are missing: the first and last values are less precise. To do well, signals should be long enough (more than about thirty samples).
- **Linear interpolation.** Joins the samples with straight segments. It does not filter: going down in fs there can be aliasing. The last sample, when the next one would be missing, is repeated.
- **Sample and hold.** Each new sample takes the value of the previous sample nearest in time (stepped). It does not filter.

With equal fs the result is practically the same signal. The imaginary part of a complex signal is not kept.

Example with `[0, 1, 2, 3, 4, 5, 6, 7]` at 1000 Hz to 500 Hz: **linear** and **hold** → `[0, 2, 4, 6]`; to 2000 Hz with **linear** → `[0, 0.5, 1, 1.5, …, 6.5, 7, 7]` (16 samples, the last one repeated).

## A bit of theory

- **Nyquist.** An fs can represent frequencies up to `fs / 2`. Above that, frequencies "fold" down (*aliasing*): a 700 Hz sine sampled at 1000 Hz appears at 300 Hz.
- **Going down in fs (decimation).** Before throwing samples away, everything above `new_fs / 2` must be removed with a low-pass filter; otherwise the aliasing can no longer be repaired. The **band-limited** method does it by itself; **linear** and **hold** do not.
- **Going up in fs (interpolation).** The new samples are rebuilt from the original signal. The ideal interpolation is Shannon's formula: `x(t) = Σ x[n] · sinc((t − n·T) / T)` with `sinc(u) = sin(πu)/(πu)`. It cannot be computed to infinity, so the block uses a short sinc multiplied by a window.
- **Linear and stepped.** They are fast but they are poor low-pass filters: linear interpolation lowers the high frequencies (a small drop in amplitude), sample and hold produces a copy of the spectrum at multiples of the original fs ("images") and a `sinc` drop.
- **Aligning two signals.** To add or multiply two signals they need the same fs: with a ratio that is not whole (for example 1000 → 441 Hz) this block calculates the new instants anyway.

## Examples

### 1. From 1000 Hz to 100 Hz

```
[Oscillator (waveform generator): fs 1000] signal ──▶ signal [Resample: 100 Hz] signal ──▶ signal [To chart]
```

A 20 Hz sine can be seen well even at 100 Hz (5 samples per period). An 80 Hz sine, instead, is above the 50 Hz of the new fs: with the **band-limited** method it disappears, with **hold** it becomes a shadow at 20 Hz.

### 2. Adding two signals with different fs

```
[Oscillator (waveform generator): fs 1000] signal ──▶ a [Add · Multiply signals]
[Oscillator (waveform generator): fs 500 ] signal ──▶ [Resample: 1000 Hz] signal ──▶ b
```

Without the **Resample** block, **Add · Multiply** would give an exception about the different fs.

### 3. A list taken at 8000 Hz

With **fs of plain lists** 8000 and **New fs** 4000, a list of 1000 numbers becomes a signal of 500 samples at 4000 Hz: the output is a signal, not a list.

## Errors

| Message | When |
|---|---|
| La nuova fs deve essere più di 0 ("The new fs must be more than 0") | **New fs** is 0 or negative. |
| Il segnale manca ("The signal is missing") | The block runs without a signal on the input. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a number, a text or an object that is not a signal. |
| Il segnale: il valore … non è un numero ("The signal: value … is not a number") | A list or a signal holds something that is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The input signal, or what would come out, goes over the limit (see [Engine limits](logicstudio-engine/limits)). |

## See also

- [Add · Multiply signals](sig.combine), which wants signals with the same fs
- [IIR filter (butter, cheby1, cheby2)](sig.iir) and [FIR filter (firwin)](sig.fir) to remove high frequencies by hand
- [Quantize (ADC)](sig.quantize) to also simulate the bits of a converter
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
