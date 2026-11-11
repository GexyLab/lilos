# Window (scipy.signal.get_window)

`sig.window` · Signals · [Signals](logicstudio-signals) · version 1

Multiplies a signal by a window (Hann, Hamming, Blackman…) that brings it smoothly down to zero at the edges, before its spectrum is computed. It also gives the window itself, its coherent gain and its equivalent noise bandwidth (ENBW).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal: a real signal `{ fs, t0, samples }` or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The signal multiplied by the window, with the same fs and the same `t0`. If a plain list came in, a plain list goes out. |
| **window** (`window`) | list | The window values, one per sample. Hidden by default: show it with the eye in Properties. |
| **coherent gain** (`coherentGain`) | number | The mean of the window, `Σw / N`. Hidden by default: show it with the eye in Properties. |
| **ENBW (bins)** (`enbw`) | number | The equivalent noise bandwidth, in FFT bins. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An input that is not a signal, or a signal that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Window** (`window`) | rectangular (none), Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett (triangular), Kaiser, Tukey | Hann | The kind of window. |
| **Kaiser β** (`beta`) | from 0 to 50 | 8.6 | The higher it is, the lower the side lobes and the wider the main lobe. It shows only with the **Kaiser** window. |
| **Tukey α (tapered part)** (`alpha`) | from 0 to 1 | 0.5 | The fraction of the window taken by the two rises/falls (0 = rectangular, 1 = Hann). It shows only with the **Tukey** window. |
| **Periodic (for spectra)** (`periodic`) | yes / no | yes | With yes the denominator is `N` ("DFT-even" window, right for the FFT); with no it is `N − 1` (symmetric, right for designing filters). |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

## How it works

The window has the same length `N` as the signal that arrives; each sample is multiplied by the matching value. The **coherent gain** and **ENBW** outputs are calculated on the window of that length:

- **coherent gain** = `Σw / N`;
- **ENBW** = `N · Σw² / (Σw)²`, in bins (a bin is `fs / N`).

If the length is 1 the window is 1; if the signal is empty, the coherent gain and the ENBW are 0. The imaginary part of a complex signal is not kept.

The values for a large `N` (periodic window):

| Window | Coherent gain | ENBW (bins) |
|---|---|---|
| Rectangular | 1 | 1 |
| Hann | 0.5 | 1.5 |
| Hamming | 0.54 | 1.363 |
| Blackman | 0.42 | 1.727 |
| Blackman-Harris | 0.359 | 2.004 |
| Flat-top | 0.216 | 3.770 |
| Bartlett | 0.5 | 1.333 |
| Kaiser (β 8.6) | 0.421 | 1.721 |
| Tukey (α 0.5) | 0.75 | 1.222 |

## A bit of theory

- **Why a window.** The FFT imagines that the `N` samples repeat forever. If the signal does not hold a whole number of periods, the jump between the end and the start dirties the spectrum: the energy of a line "leaks" onto the nearby lines (*leakage*). A window that goes to zero at the edges removes the jump.
- **The formulas** (with `n = 0…N−1`, periodic window):
  - Hann: `w[n] = 0.5 − 0.5·cos(2πn/N)`
  - Hamming: `w[n] = 0.54 − 0.46·cos(2πn/N)`
  - Blackman: `w[n] = 0.42 − 0.5·cos(2πn/N) + 0.08·cos(4πn/N)`
  - Kaiser: `w[n] = I₀(β·√(1 − (2n/N − 1)²)) / I₀(β)`, with `I₀` the modified Bessel function.
  - Bartlett: a triangular tent; Blackman-Harris and Flat-top are sums of 4 and 5 cosines.
- **Coherent gain.** A window lowers the amplitude of a line by a factor `Σw / N`. To read the right amplitude the FFT divides by `Σw` (the [FFT](sig.fft) block already does); by hand you multiply by `1 / coherent gain` (Hann: ×2).
- **ENBW.** It is the width of a rectangular filter that would let through the same power of white noise: wider windows see more noise, but separate far lines better. It is needed to convert a noise power into a density (W/Hz).
- **Choosing.** Rectangular: best resolution but strong leakage (right for signals with whole periods). Hann/Hamming: a good compromise. Blackman-Harris: very low side lobes. **Flat-top**: the amplitude of a line is read with minimum error (under 0.01 dB) but the lines are very wide.
- **Periodic or symmetric.** For spectra the periodic one is used; the symmetric one (denominator `N − 1`) is for designing the coefficients of a FIR filter.

## Examples

### 1. The spectrum of a sine without leakage

```
[Oscillator (waveform generator)] signal ──▶ signal [Window (scipy.signal.get_window)] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart]
```

With a 52.5 Hz sine at fs 1000 Hz and 1000 samples (not a whole number of periods) the peak with the **rectangular** window has wide tails; with **Hann** the tails fall much faster.

### 2. The coherent gain to correct the amplitude

With **Hann**, the list `[1, 1, 1, 1, 1, 1, 1, 1]` becomes `[0, 0.146, 0.5, 0.854, 1, 0.854, 0.5, 0.146]`: **coherent gain** 0.5 and **ENBW** 1.5. To put the right amplitude back, multiply by `1 / 0.5 = 2` with [Gain · Offset](sig.gain).

### 3. Symmetric window

With **Periodic** off and 5 samples at 1 the Hann window is `[0, 0.5, 1, 0.5, 0]`: the symmetric shape that reaches 1 in the middle.

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

- [FFT (np.fft.fft)](sig.fft) to compute the spectrum (it already has a window among its settings)
- [Power spectral density (scipy.signal.welch)](sig.psd) for the power density, with window and averaging
- [FIR filter (firwin)](sig.fir) for filters designed with a window
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
