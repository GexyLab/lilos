# Frequency · Period

`sig.frequency` · Signals · [Signals](logicstudio-signals) · version 1

Measures the **frequency** (and the **period**) of a periodic signal, for example a sine, a square wave or a sound. It also works with few periods and picks between three methods: zero crossings, autocorrelation, spectrum peak.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples }` or a plain list of numbers (taken as a signal at **fs of plain lists**). It needs at least a few periods. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **frequency (Hz)** (`frequency`) | number | The frequency found, in Hz. |
| **period (s)** (`period`) | number | The period, `1 / frequency`, in seconds. |
| **Exception** (`error`) | object | Invalid signal, too long, with fewer than 4 samples, or frequency not found. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Method** (`method`) | Zero crossings, Autocorrelation, Spectrum peak (FFT) | Zero crossings | How the frequency is looked for (see below). |
| **Hysteresis (fraction of the peak)** (`hysteresis`) | 0 to 0.9 | 0.1 | Only visible with the **Zero crossings** method. The signal must go below this fraction of the peak, on the negative side, before a new zero crossing counts: so noise near zero does not count as extra crossings. |
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. |

## How it works

First the block removes the mean from the signal. Then:

- **Zero crossings**: looks for the points where the signal goes from negative to positive (rising only), computing the precise instant with a straight line between the two samples. The frequency is the number of periods between the first and the last crossing, divided by the time elapsed. It needs at least 2 crossings. It is the simplest and fastest method, and fine for clean waves.
- **Autocorrelation**: compares the signal with itself shifted in time; the highest maximum after the first drop below zero is the period, refined with a parabola. It copes better with non-sinusoidal waves (a sound with many harmonics) and a little noise.
- **Spectrum peak (FFT)**: takes the FFT with a Hann window and looks for the highest point (excluding 0 Hz), then refines with a parabola. It copes well with noise, but needs a signal with more periods.

If the signal is not periodic (for example a flat line, or a single period), the block gives an error instead of a wrong frequency.

## A bit of theory

A signal is **periodic** with period T if `x(t + T) = x(t)`; the frequency is `f = 1/T`. Three ways of seeing it:

- in **time**, T is the distance between two equal points, for example between two zero crossings in the same direction;
- with the **autocorrelation** `r[k] = Σ x[n]·x[n+k]`: the signal is similar to itself shifted by a period, so r has a maximum at `k = T·fs`;
- in **frequency**, the fundamental tone is the highest peak of the spectrum; the resolution of an FFT is `fs/N`, but the parabolic interpolation brings it down to a fraction of that.

With less than one period in the window, no method can find the frequency. With few periods, zero crossings give the smallest error if the signal is clean, because every period counts. For a signal with many harmonics (a violin, a voice) the fundamental may not be the highest peak of the spectrum: in that case the autocorrelation is more reliable.

## Examples

### 1. The note of a tuning fork

A 440 Hz sine at fs 8000 Hz, 800 samples (0.1 s):

```
[Oscillator (waveform generator)] signal ──▶ signal [Frequency · Period] frequency (Hz) ──▶ value [Print (console.log)]
```

With the Zero crossings method it gives about 440 Hz and a period of about 0.00227 s.

### 2. A noisy signal

A 50 Hz sine with a lot of noise on top: zero crossings multiply. First try a higher **Hysteresis** (0.3–0.5) or change the method to **Spectrum peak (FFT)**.

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | An empty value arrives. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a single number, a text that is not JSON, or an object without `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is missing or not above 0. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample N (from 1) of the list is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | The imaginary part has a different number of samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | The signal exceeds the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |
| Servono almeno 4 campioni ("At least 4 samples are needed") | The signal has fewer than 4 samples. |
| Non trovo una frequenza: il segnale non sembra periodico in questa finestra ("I cannot find a frequency: the signal does not look periodic in this window") | The chosen method does not find enough periods (flat signal, a single period, noise). |

## See also

- [FFT (np.fft.fft)](sig.fft) and [Peaks (find_peaks)](sig.peaks) for several frequencies at once
- [Correlation (np.correlate)](sig.correlate) for the full autocorrelation
- [Goertzel (tones, DTMF)](sig.goertzel) to measure known frequencies
- [Measures (RMS, peak, mean)](sig.measure) for the other measures of a signal
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
