# Peaks (find_peaks)

`sig.peaks` · Signals · [Signals](logicstudio-signals) · version 1

Finds the **peaks** of a spectrum, a power spectral density or a signal: the points higher than their neighbours. In a spectrum it gives the **main frequencies** (with interpolation between the points, more precise than the FFT grid); in a signal it gives the instants of the local maxima.

## Inputs

| Port | Type | Description |
|---|---|---|
| **spectrum or signal** (`data`) | any | A spectrum from [FFT](sig.fft), a PSD from [Power spectral density](sig.psd), a signal `{ fs, t0, samples }` or a plain list of numbers (taken as a signal at **fs of plain lists**). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **peaks** (`peaks`) | list | The peaks found, from the highest to the lowest. From a spectrum or a PSD each peak is `{ f, value, db }` (frequency in Hz, value, value in dB). From a signal it is `{ t, value, index }` (time in seconds, sample value, sample number from 0). If there is no peak, the list is empty. |
| **position of the highest (Hz or s)** (`position`) | number | The frequency (or time) of the highest peak. It is not sent if there are no peaks. |
| **value of the highest** (`value`) | number | The value of the highest peak. It is not sent if there are no peaks. |
| **Exception** (`error`) | object | Missing or invalid data, too long, or with `f` and values of different lengths. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **How many, at most** (`count`) | 1 to 1000 | 5 | How many peaks to keep, starting from the highest. |
| **Not lower than (dB under the highest)** (`minDb`) | 0 or less | −60 | Discards the peaks lower than this relative to the highest. −60 keeps down to a thousandth of the amplitude of the highest; 0 keeps only the highest (and equal ones). |
| **Minimum distance (Hz or s)** (`distance`) | 0 or more | 0 | Two peaks closer than this do not both count: the higher stays. 0 discards nothing. |
| **Skip 0 Hz (DC)** (`skipDC`) | yes / no | yes | Only for spectra and PSDs: ignores the point at 0 Hz, where the mean of the signal usually sits. |
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. |

## How it works

A point is a peak if it is **higher than its left neighbour and not lower than the right one** (the points of a flat stretch count as one peak, the first). Then:

1. **Interpolation** (spectra and PSDs only): for each peak the dB of the point and of its two neighbours are taken and a parabola is passed through the three points; its vertex gives the frequency and the value, **more precise** than the grid point. That is why the frequency found can fall between two FFT points.
2. **Threshold**: peaks with dB below `highest + minDb` are discarded.
3. The rest are sorted by value, highest first. The list is scanned: a peak closer than **Minimum distance** to one already taken is skipped; it stops at **How many**.

For the PSD the value is power and the dB are 10·log10; for the spectrum the value is the magnitude and the dB 20·log10.

> With a signal, the values are those of the samples, without interpolation, and the threshold uses the dB of the absolute value.

## A bit of theory

The spectrum of a pure tone, seen through an FFT, is not a line but a peak with the shape of the transform of the window. If the tone does not fall on a grid point (`k·fs/N`), the maximum point is near the true frequency but does not coincide with it: the error can reach `Δf/2`.

**Parabolic interpolation** on the logarithm of the amplitude (that is, in dB) relies on the fact that the top of a peak of a Gaussian-like window is almost a parabola. With 3 points the position is estimated as `δ = ½·(a − c) / (a − 2b + c)` relative to the central point, in fractions of `Δf`, and the frequency is `f = (k + δ)·Δf`. With a smooth window (Hann, Blackman-Harris) the error drops to a small fraction of `Δf`; with Rectangular it is worse.

The **minimum distance** rule exists because a window with long tails, or a tone with close harmonics, makes secondary peaks beside the true one; this way only the highest of each group is kept.

## Examples

### 1. The two frequencies of a signal

A signal with a sine of amplitude 2 at 50.3 Hz and one of amplitude 0.5 at 120 Hz, at fs 1000 Hz and 1000 samples, goes through an FFT with a Hann window:

```
[Add · Multiply signals] signal ──▶ signal [FFT (np.fft.fft): Hann] spectrum ──▶ data [Peaks (find_peaks)] peaks ──▶ value [Print (console.log)]
[Oscillator (waveform generator): 50.3 Hz, amplitude 2] signal ──▶ a [Add · Multiply signals]
[Oscillator (waveform generator): 120 Hz, amplitude 0.5] signal ──▶ b [Add · Multiply signals]
```

With **How many** = 3 it prints two peaks: about 50.32 Hz (value 2.03; 6.15 dB) and 120.00 Hz (value 0.5; −6.02 dB). The position is precise to a fraction of Δf (1 Hz), the value slightly above 2 because of the interpolation.

### 2. Only the real tones, not their tails

With a rectangular-window FFT the secondary peaks are tails of the main one. With **Not lower than** = −40 the lower tails are discarded; with a **Minimum distance** of 5 Hz, of two close peaks only the higher stays.

### 3. Maxima in time

With a signal instead of a spectrum, **peaks** gives `{ t, value, index }`: for example the instants of the beats in a heart signal, with a **Minimum distance** of 0.3 s so as not to count the same beat twice.

## Errors

| Message | When |
|---|---|
| Il dato manca ("The data is missing") | An empty value arrives. |
| Il dato deve essere una lista di numeri o un oggetto { fs, samples } ("The data must be a list of numbers or an object { fs, samples }") | The input is a single number, a text that is not JSON, or an object without `samples` and without `f`. |
| Il dato ha una frequenza di campionamento (fs) non valida ("The data has an invalid sampling rate") | The signal has `fs` missing or not above 0. |
| Il dato: il valore N non è un numero ("value N is not a number") | Sample N (from 1) of the list is not a number. |
| Il dato ha samples e im di lunghezze diverse ("samples and im have different lengths") | The imaginary part has a different number of samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | The signal exceeds the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |
| Lo spettro ha f e valori di lunghezze diverse ("The spectrum has f and values of different lengths") | The `f` and `mag` (or `psd`) lists are not the same length. |

## See also

- [FFT (np.fft.fft)](sig.fft) to get the spectrum
- [Power spectral density (scipy.signal.welch)](sig.psd) for a cleaner PSD
- [Frequency · Period](sig.frequency) for the frequency of a single periodic tone
- [Goertzel (tones, DTMF)](sig.goertzel) to measure known frequencies
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
