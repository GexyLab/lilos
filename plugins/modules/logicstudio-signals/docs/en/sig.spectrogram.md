# Spectrogram (STFT)

`sig.spectrogram` · Signals · [Signals](logicstudio-signals) · version 1

Shows **how the spectrum changes over time**. The signal is cut into short overlapping windows, the spectrum of each is computed (short-time Fourier transform, STFT) and the result is a **grid in dB** ready for the [Heat map](charts.heatmap): time runs from left to right, frequency goes up from the bottom to the top. It is ideal for a voice, a rising whistle (chirp), a phone key.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples }` or a plain list of numbers (taken as a signal at **fs of plain lists**). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **grid (dB) for Heat map** (`grid`) | object | `{ rows, cols, values }`. `rows` are the row names: the frequencies in Hz (as text, 4 significant digits), **from the highest to the lowest**. `cols` are the column names: the times in seconds (at the centre of each window). `values` is the list of rows, each with one value in dB per column. It links directly to the [Heat map](charts.heatmap). |
| **times (s)** (`times`) | list | The time of the centre of each window, in seconds, as numbers. Hidden by default: show it with the eye in Properties. |
| **frequencies (Hz)** (`frequencies`) | list | The frequencies from 0 to fs/2, **from the lowest to the highest**, as numbers. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Missing or invalid signal, too long, invalid segment, grid too big. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Segment (samples)** (`segment`) | 2 or more | 256 | The length of each window, in samples. If the signal is shorter, it becomes as long as the signal. |
| **Overlap (%)** (`overlap`) | 0 to 99 | 50 | How much a window overlaps the previous one. |
| **Window** (`window`) | Rectangular, Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey | Hann | The window applied to each segment. |
| **Kaiser β** (`beta`) | 0 to 50 | 8.6 | Only visible with the **Kaiser** window. |
| **Tukey α (tapered part)** (`alpha`) | 0 to 1 | 0.5 | Only visible with the **Tukey** window. |
| **Range shown (dB under the maximum)** (`range`) | 10 to 300 | 100 | Every value lower than (maximum − range) is brought up to that level, so the colours of the map are not wasted on the floor. |
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. |

## How it works

- The windows are `Segment` samples long; the next one starts `Segment · (1 − Overlap/100)` samples later (at least 1). The number of whole windows is `⌊(N − Segment)/step⌋ + 1`; the final samples that are not enough for a window are left out.
- Each window is multiplied by the chosen window function and goes through the FFT. The value of each cell is the **power density** of the window, in dB (10·log10), as in the [power spectral density](sig.psd) but without averaging.
- The rows go **from the highest frequency down to 0**: in the heat map the low frequencies are therefore at the bottom, as in every spectrogram.
- The maximum of the whole grid sets the top level; the values are rounded to 0.01 dB.
- The grid has `windows × (Segment/2 + 1)` cells and cannot exceed **4 times the limit** `signalSamples` (262144 by default). If it is too big, make the segment longer or reduce the overlap.

## A bit of theory

The Fourier transform says which frequencies are there, but not **when**. The STFT computes the spectrum on short sliding windows: `S[m, k] = Σ x[n]·w[n − m·step]·e^(−i2πkn/L)`. The squared magnitude, in dB, is the **spectrogram**.

There is an unavoidable trade-off between time and frequency:

- a **long** window tells two close frequencies apart well (`Δf = fs/Segment` small) but blurs in time;
- a **short** window locates an event well in time but has fuzzy frequencies.

There is no best choice in absolute terms: it depends on the signal. A steady tone wants long windows; a sharp click, short ones. The **overlap** does not improve the resolution: it only makes the map smoother in time and gives more weight to the samples at the edges, which the window attenuates. The usual 50% with Hann is a good starting point.

## Examples

### 1. A tone over time

```
[Oscillator (waveform generator)] signal ──▶ signal [Spectrogram (STFT)] grid (dB) for Heat map ──▶ data [Heat map]
```

With a 100 Hz sine, 4096 samples at fs 1000 Hz and the default settings: 31 windows and 129 rows. The first row is `500`, the second `496.1`; the first column `0.128` s. In the map you see a bright horizontal line at 100 Hz.

### 2. A rising whistle

A [Chirp](sig.chirp) going from 50 to 400 Hz in a few seconds draws a rising diagonal in the map. With a segment of 128 samples the diagonal is sharper in time; with 512 it is sharper in frequency.

```
[Chirp (scipy.signal.chirp)] signal ──▶ signal [Spectrogram (STFT)] grid (dB) for Heat map ──▶ data [Heat map]
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
| Il segmento deve avere almeno 2 campioni ("The segment must have at least 2 samples") | **Segment** is below 2. |
| Servono almeno 2 campioni ("At least 2 samples are needed") | The signal has fewer than 2 samples. |
| Spettrogramma troppo grande: … × … celle, al massimo … (allunga il segmento o riduci la sovrapposizione) ("Spectrogram too big: … cells, at most …") | The cells (windows × rows) exceed 4 times the `signalSamples` limit. |
| Finestra sconosciuta: … ("Unknown window") | The window chosen in Properties does not exist (hand-written configuration). |

## See also

- [Heat map](charts.heatmap) to draw the grid
- [FFT (np.fft.fft)](sig.fft) for the spectrum of a single block of samples
- [Power spectral density (scipy.signal.welch)](sig.psd) for the average spectrum over time
- [Chirp (scipy.signal.chirp)](sig.chirp) to try the block
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
