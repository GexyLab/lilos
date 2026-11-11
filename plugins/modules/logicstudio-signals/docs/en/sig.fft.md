# FFT (np.fft.fft)

`sig.fft` · Signals · [Signals](logicstudio-signals) · version 1

Computes the **spectrum** of a signal: how much there is of each frequency. It uses the fast Fourier transform (FFT) and works with any length, not only powers of 2. The result is a spectrum object that you can draw, search for peaks ([Peaks](sig.peaks)) or bring back to the time domain ([IFFT](sig.ifft)).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples, im? }` or a plain list of numbers (taken as a signal at **fs of plain lists**). With an imaginary part (`im`) it is a complex signal. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **spectrum** (`spectrum`) | object | The spectrum: `{ kind, fs, t0, n, df, sided, scale, window, f, mag, db, phase, re, im }`. `kind` is `"spectrum"`; `n` is the number of FFT points; `df` the distance between two frequencies (Hz); `sided` is `"one"` or `"two"`; `scale` and `window` repeat the settings used. `f` are the frequencies in Hz, `mag` the magnitude (in the chosen scale), `db` the magnitude in dB (20·log10, floor −300), `phase` the phase in radians, `re` and `im` the **raw** real and imaginary parts of the FFT. All are lists of the same length. |
| **magnitude** (`magnitude`) | list | Only the `mag` list. Hidden by default: show it with the eye in Properties. |
| **frequencies (Hz)** (`frequencies`) | list | Only the `f` list. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Missing or invalid signal, too long, or with fewer than 2 samples. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Window** (`window`) | Rectangular (none), Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett (triangular), Kaiser, Tukey | Rectangular | The window that weights the samples before the FFT (see the theory). |
| **Kaiser β** (`beta`) | 0 to 50 | 8.6 | Only visible with the **Kaiser** window. The higher it is, the lower the tails and the wider the peak. |
| **Tukey α (tapered part)** (`alpha`) | 0 to 1 | 0.5 | Only visible with the **Tukey** window. The part of the window that rises and falls; 0 is rectangular, 1 is Hann. |
| **Spectrum** (`sided`) | One-sided (0 … fs/2), Two-sided (−fs/2 … fs/2) | One-sided | One-sided: only the frequencies from 0 to fs/2. Two-sided: the negative ones too. A complex signal **always** gives a two-sided spectrum. |
| **Scale** (`scale`) | Amplitude (a sine of amplitude A reads A), RMS, Raw \|X[k]\| | Amplitude | Amplitude: a sine of amplitude A reads A on its frequency. RMS: the same divided by √2 (except at 0 Hz). Raw: the FFT magnitude with no division at all. |
| **Points (0 = N; more = zero-padding)** (`size`) | number, 0 or more | 0 | How many points the FFT has. 0 is the length of the signal. With a larger number the signal is padded with zeros; with a smaller one it is cut. |
| **Round up to a power of 2** (`pow2`) | yes / no | no | Takes the points up to the next power of 2 (1000 becomes 1024). |
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. A `{ fs, samples }` signal already carries its own. |

## How it works

For each signal that arrives, the block multiplies the samples by the window, pads with zeros up to **Points**, computes the FFT and sends the spectrum.

- One-sided: the points go from 0 to fs/2 (N/2 + 1 values). Two-sided: from −fs/2 to just under fs/2, with 0 in the middle.
- In the **Amplitude** scale the magnitude is divided by the sum of the window and, in the one-sided spectrum, doubled (except at 0 Hz and at fs/2), so a sine of amplitude A reads A. That is why the scale is right whatever the window, if the frequency falls on a point.
- **re** and **im** are the raw values: [IFFT](sig.ifft) uses them to get back to the signal.
- To show the spectrum just link it to [To chart](sig.toChart), which picks magnitude and frequencies by itself.

## A bit of theory

The **discrete Fourier transform** (DFT) of N samples is `X[k] = Σ x[n]·e^(−i2πkn/N)`, for k = 0 … N−1. The value X[k] says how much of the signal there is at frequency `f_k = k·fs/N`. The FFT is just a fast way of computing the same thing, in about N·log N operations instead of N².

- **Resolution**: the distance between two points is `Δf = fs/N`. To tell two close frequencies apart you need more samples, that is a longer recording: `Δf = 1 / duration`.
- **Nyquist**: with samples at rate fs you only see frequencies up to **fs/2**. A higher tone folds back (aliasing) and shows up at a lower frequency.
- **Real signal**: the spectrum is symmetric (negative frequencies mirror the positive ones), so half is enough: that is the one-sided spectrum.
- **Spectral leakage**: the FFT assumes the samples are one period of a repeating signal. If the window does not hold a whole number of periods, the jump between the end and the start spreads energy over nearby frequencies. A **window** (Hann, Hamming, Blackman…) brings the edges to zero and reduces the leakage, at the price of a slightly wider peak. Flat-top gives the most accurate amplitude; Rectangular the narrowest peak.
- **Zero-padding**: adding zeros adds no information and **does not improve the resolution**; it makes the points denser and the peak smoother to read.

## Examples

### 1. The spectrum of a sine

```
[Oscillator (waveform generator)] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart] chart data ──▶ data [Lines]
```

With a 50 Hz sine of amplitude 2, at fs 1000 Hz and 1000 samples, `Δf` is 1 Hz and the point at 50 Hz is `2`. The decibel value is 6.02 (20·log10 2).

### 2. Less leakage with a window

A 50.3 Hz sine does not fall on a grid point. With the **Rectangular** window the peak is low and the tails rise far away; with **Hann** the tails fall much faster.

```
[Oscillator (waveform generator): 50.3 Hz] signal ──▶ signal [FFT (np.fft.fft): Hann] spectrum ──▶ data [Peaks (find_peaks)] position ──▶ value [Print (console.log)]
```

Peaks interpolate between the points: the position comes out close to 50.3 Hz.

### 3. More points, same resolution

A 1000-sample signal with **Round up to a power of 2** gives 1024 points: `df` goes from 1 to 0.9765625 Hz, but two tones closer than 1 Hz stay mixed up.

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | An empty value arrives. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a single number, a text that is not JSON, or an object without `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is missing or not above 0. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample N (from 1) of the list is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | The imaginary part has a different number of samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | The signal, or the FFT **Points**, exceed the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |
| Servono almeno 2 campioni ("At least 2 samples are needed") | The signal has fewer than 2 samples. |
| Finestra sconosciuta: … ("Unknown window") | The window chosen in Properties does not exist (it can happen with a hand-written configuration). |

## See also

- [IFFT (np.fft.ifft)](sig.ifft) to go from the spectrum back to the signal
- [Power spectral density (scipy.signal.welch)](sig.psd) for an averaged spectrum of a noisy signal
- [Spectrogram (STFT)](sig.spectrogram) to see how the spectrum changes over time
- [Peaks (find_peaks)](sig.peaks) to find the main frequencies
- [Window (scipy.signal.get_window)](sig.window) to apply a window separately
- [To chart](sig.toChart) to draw the spectrum
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
