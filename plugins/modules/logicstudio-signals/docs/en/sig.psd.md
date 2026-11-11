# Power spectral density (scipy.signal.welch)

`sig.psd` · Signals · [Signals](logicstudio-signals) · version 1

Computes the **power spectral density** (PSD) with the **Welch method**: it cuts the signal into overlapping segments, computes the spectrum of each and takes the **average**. It is the right tool for a noisy signal: the result is much smoother and more reliable than a single FFT.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples }` or a plain list of numbers (taken as a signal at **fs of plain lists**). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **PSD** (`psd`) | object | `{ kind, fs, df, scaling, segments, f, psd, db }`. `kind` is `"psd"`; `df` is the distance between two frequencies (Hz); `scaling` is `"density"` or `"spectrum"`; `segments` is how many segments were averaged; `f` are the frequencies from 0 to fs/2; `psd` the values; `db` the values in dB (10·log10, floor −300). |
| **total power** (`power`) | number | The power of the signal: the sum of the values (multiplied by `df` in the Density scaling). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Missing or invalid signal, too long, with fewer than 2 samples, or invalid segment. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Segment (samples)** (`segment`) | 2 or more | 256 | How many samples each segment has. If the signal is shorter, the segment becomes as long as the signal. |
| **Overlap (%)** (`overlap`) | 0 to 99 | 50 | How much a segment overlaps the previous one. |
| **Window** (`window`) | Rectangular, Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey | Hann | The window applied to each segment. |
| **Kaiser β** (`beta`) | 0 to 50 | 8.6 | Only visible with the **Kaiser** window. |
| **Tukey α (tapered part)** (`alpha`) | 0 to 1 | 0.5 | Only visible with the **Tukey** window. |
| **Scaling** (`scaling`) | Density (unit²/Hz), Power spectrum (unit²) | Density | Density: the power per Hz. Power spectrum: the power in each point (a sine of amplitude A gives A²/2 on its point). |
| **Detrend** (`detrend`) | Remove the mean of each segment, No | Remove the mean | Removes the DC component from each segment before computing its spectrum. |
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. |

## How it works

1. The signal is divided into segments of **Segment** samples; each segment starts `Segment · (1 − Overlap/100)` samples after the previous one. The final samples that are not enough for a whole segment are left out.
2. Each segment loses its mean (if **Detrend**), is multiplied by the window and goes through the FFT.
3. The power of each frequency is computed, doubled (except 0 Hz and fs/2) because the spectrum is one-sided, and averaged over the segments.

The resolution is `Δf = fs / Segment`: short segments give a smooth but not very detailed curve, long ones more detail and more noise. The integral of the density (that is **total power**) is the mean power of the signal: a sine of amplitude 1 gives about 0.5.

## A bit of theory

For a noisy signal, a single FFT is a very noisy estimate: the value at each point fluctuates randomly, and the fluctuation **does not shrink** when the signal gets longer. The Welch method reduces this variance by **averaging** K spectra: the fluctuation falls by about `1/√K`. You pay with resolution, because each segment is shorter than the whole signal.

- **Density** (unit²/Hz): for white noise it is flat and does not depend on how many points are used. The power in a band is the area under the curve.
- **Power spectrum** (unit²): the value of a point is the power in that point; handy for reading the amplitude of a tone (A²/2).
- **Overlap**: with a window that goes to zero at the edges (Hann), samples near the edges weigh little; overlapping by 50% makes them count in a neighbouring segment and gives more segments without making the signal longer.
- **dB**: for power `dB = 10·log10(P)` (for amplitude it would be 20·log10).

## Examples

### 1. The PSD of a tone

A 100 Hz sine, amplitude 1, 4096 samples at fs 1000 Hz, with the default settings: 31 segments, `df` = 3.90625 Hz, **total power** about 0.5.

```
[Oscillator (waveform generator)] signal ──▶ signal [Power spectral density (scipy.signal.welch)] PSD ──▶ data [To chart] chart data ──▶ data [Lines]
```

[To chart](sig.toChart) draws the PSD in linear values by itself (with **Show** = Decibel you see it in dB).

### 2. Noise and a peak

A tone buried in noise: in a single FFT the peak is lost in the fluctuations; with several segments the floor flattens and the peak stands out.

```
[Add · Multiply signals] signal ──▶ signal [Power spectral density (scipy.signal.welch)] PSD ──▶ data [Peaks (find_peaks)] position ──▶ value [Print (console.log)]
[Oscillator (waveform generator)] signal ──▶ a [Add · Multiply signals]
[Noise (np.random)] signal ──▶ b [Add · Multiply signals]
```

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | An empty value arrives. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a single number, a text that is not JSON, or an object without `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is missing or not above 0. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample N (from 1) of the list is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | The imaginary part has a different number of samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | The signal exceeds the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |
| Servono almeno 2 campioni ("At least 2 samples are needed") | The signal has fewer than 2 samples. |
| Il segmento deve avere almeno 2 campioni ("The segment must have at least 2 samples") | **Segment** is below 2. |
| Finestra sconosciuta: … ("Unknown window") | The window chosen in Properties does not exist (hand-written configuration). |

## See also

- [FFT (np.fft.fft)](sig.fft) for the spectrum of a single block of samples, with phase
- [Spectrogram (STFT)](sig.spectrogram) to see the spectrum change over time
- [Peaks (find_peaks)](sig.peaks) to find the main frequencies (it takes the PSD too)
- [Noise (np.random)](sig.noise) to try the block
- [To chart](sig.toChart) to draw the PSD
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
