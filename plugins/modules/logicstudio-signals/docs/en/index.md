# Signals

`logicstudio-signals` · needs the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for **signal theory**: make signals (sine, square, noise, chirp…), look at them in frequency (FFT, power spectral density, spectrogram), filter them (IIR, FIR, biquad) and see the response of the filters, compare them (convolution, correlation), measure them (RMS, THD, SNR, frequency) and modulate them (AM, FM, PM).

## How to install it

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-signals` ("Logic Studio: i blocchi per la teoria dei segnali…"). If the engine is missing, the AppStore installs it too. After the installation the blocks appear in the **Blocks** tab of the IDE, in the **Signals** category.

A project that uses these blocks on a lilOS without the package shows the blocks with **The package is missing**, and an active program waits until the package comes back.

## How a signal travels

A signal does not go one sample at a time: a message carries **a frame of samples**, an object like this:

```
{ fs: 1000, t0: 0, samples: [0, 0.31, 0.59, …] }
```

- `fs` is the **sampling rate** in Hz: how many samples per second.
- `t0` is the **time of the first sample**, in seconds. Generators move it forward from one frame to the next, so the frames line up.
- `samples` are the samples. A **complex** signal also has `im`, the imaginary part, of the same length.

A **list of numbers** is a signal too: every block that takes a signal has the setting **fs of plain lists** (1000 Hz by default), the sampling rate given to lists. Many blocks answer a list with a list.

Why frames? The engine makes at most a certain number of runs per second ([Limits](logicstudio-engine/limits)): a message per sample would only work for very slow signals. For values that arrive one at a time (a sensor, MQTT, an [Interval (setInterval)](core.every)) there is [Buffer (samples → frames)](sig.buffer), which gathers them into frames; [Play samples](sig.play) does the opposite.

**Spectra** are objects with the frequencies `f` and the values: the spectrum of the [FFT](sig.fft) (`mag`, `db`, `phase`…), the power spectral density of [Welch](sig.psd) (`psd`, `db`) and the response of a filter ([Frequency response](sig.response): `mag`, `db`, `phase`, `groupDelay`). [To chart](sig.toChart) turns signals and spectra into the data of the [Charts](logicstudio-charts).

### How long it can be

A signal has at most **65,536 samples** by default. An administrator can change the limit in **Control Panel → Logic Studio → Limits**, under **Samples per signal, at most** (from 1024 to 1,048,576). A longer signal raises the exception «Segnale troppo lungo» (signal too long).

## The blocks

### Generation

Each one sends a frame at the start, or at each pulse on **generate** when it is linked. In Properties: sampling rate, number of samples and **Time goes on**.

| Block | What it does |
|---|---|
| [Oscillator (waveform generator)](sig.oscillator) | Sine, square (with duty cycle), triangle, sawtooth, pulse train; frequency, amplitude, phase and offset |
| [Noise (np.random)](sig.noise) | Gaussian or uniform white noise, pink (1/f), brown (1/f²); with a seed to repeat it exactly |
| [Impulse · Step · Ramp](sig.elementary) | The elementary signals: impulse δ, step, ramp, exponential, rectangle, sinc, Gaussian |
| [Chirp (scipy.signal.chirp)](sig.chirp) | A sine that goes up (or down) in frequency, linear or logarithmic |

### Signal ↔ data

| Block | What it does |
|---|---|
| [Signal from list](sig.fromList) | Makes a signal from a list of numbers, with fs and t₀ |
| [Signal parts](sig.info) | Samples, fs, N, duration, times, imaginary part |
| [Buffer (samples → frames)](sig.buffer) | Gathers single values into frames of N samples, overlapping too |
| [Play samples](sig.play) | Sends the samples of a frame one at a time (at most 100 per second) |
| [To chart](sig.toChart) | Signals and spectra → data for a chart, several series too |

### Time-domain operations

| Block | What it does |
|---|---|
| [Add · Multiply signals](sig.combine) | Adds, subtracts, multiplies, divides, mean, minimum, maximum sample by sample |
| [Gain · Offset](sig.gain) | Gain (in dB too), offset, inversion, removes the mean, normalizes |
| [Window (scipy.signal.get_window)](sig.window) | Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey |
| [Delay · Trim · Zero-padding](sig.edit) | Delays, shifts in a circle, trims, adds zeros, reverses time, repeats |
| [Resample](sig.resample) | Changes fs: windowed sinc with anti-aliasing, linear, hold |
| [Quantize (ADC)](sig.quantize) | Like an analog-to-digital converter: bits, range, codes, error, SQNR |
| [Nonlinearity (clip, rectify)](sig.nonlinear) | Hard or soft saturation, rectifiers, dead zone, square, sign |

### Frequency

| Block | What it does |
|---|---|
| [FFT (np.fft.fft)](sig.fft) | The spectrum: one- or two-sided, as amplitude, RMS or raw, with window and zero-padding |
| [IFFT (np.fft.ifft)](sig.ifft) | From the spectrum back to the signal |
| [Power spectral density (scipy.signal.welch)](sig.psd) | The PSD with Welch's method: overlapping, averaged segments |
| [Spectrogram (STFT)](sig.spectrogram) | The spectrum changing over time, for the Heat map |
| [Peaks (find_peaks)](sig.peaks) | The peaks of a spectrum (or of a signal), with interpolated frequency |
| [Goertzel (tones, DTMF)](sig.goertzel) | The amplitude of a few frequencies, and the phone keys (DTMF) |

### Filters

Filters keep their **state** from one frame to the next: a stream of frames is filtered without jumps. At the start they send their **coefficients**, which [Frequency response](sig.response) draws even before any signal.

| Block | What it does |
|---|---|
| [IIR filter (butter, cheby1, cheby2)](sig.iir) | Butterworth, Chebyshev I and II: low-pass, high-pass, band-pass, band-stop, order 1–20, zero phase too |
| [Biquad (RBJ, equalizer)](sig.biquad) | One second-order section: notch, peak, shelf and all-pass too |
| [FIR filter (firwin)](sig.fir) | Windowed, moving average or given coefficients; linear phase |
| [Sample filter (moving average, EMA)](sig.smooth) | For single values or signals: exponential, moving mean and median |
| [Difference equation (lfilter)](sig.difference) | Any filter from the coefficients b and a |
| [Frequency response (freqz, Bode)](sig.response) | Magnitude, phase, group delay, poles, zeros and stability of a filter |

### Convolution and correlation

| Block | What it does |
|---|---|
| [Convolution (np.convolve)](sig.convolve) | Full, same length, valid or circular |
| [Correlation (np.correlate)](sig.correlate) | Correlation and autocorrelation, with the estimated delay between two signals |

### Measures

| Block | What it does |
|---|---|
| [Measures (RMS, peak, mean)](sig.measure) | RMS, peak, mean, minimum, maximum, peak to peak, standard deviation, crest factor, power, energy, dB |
| [Distortion (THD, SNR, SINAD)](sig.distortion) | Harmonic distortion, noise, ENOB of a tone |
| [Frequency · Period](sig.frequency) | The frequency of a periodic signal, with three methods |
| [Envelope (scipy.signal.hilbert)](sig.envelope) | Envelope, instantaneous phase and frequency, analytic signal |
| [dB ↔ linear](sig.db) | Amplitude and power decibels, dBm, dBV, dBu |

### Modulation

| Block | What it does |
|---|---|
| [Modulate (AM, FM, PM)](sig.modulate) | AM with carrier, DSB-SC, FM, PM |
| [Demodulate (AM, FM, PM)](sig.demodulate) | Brings the message back: with the same settings as Modulate |

## A first example

The spectrum of a 50 Hz square wave: the odd harmonics (150, 250, 350 Hz…) with an amplitude falling like 1/n.

```
[Oscillator (waveform generator): square 50 Hz] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart] chart data ──▶ data [Lines]
```

With **Show: Decibel** in [To chart](sig.toChart) the small harmonics show well too.

More examples are in the pages of the blocks: a noisy sensor cleaned up ([Buffer](sig.buffer) and [IIR filter](sig.iir)), a message modulated and demodulated in AM ([Modulate](sig.modulate)), the delay between two signals ([Correlation](sig.correlate)).

## Errors

Errors (signal too long, frequency above fs/2, signals with different fs, wrong coefficients…) come out of the block's **Exception** port, or go to the main console if it is not linked. The messages are in the page of each block.

## See also

- [Charts](logicstudio-charts), to draw signals, spectra and spectrograms
- [Lists and matrices](logicstudio-collections), to work on lists of samples
- [Constants](logicstudio-constants) (π, e…)
- [Limits](logicstudio-engine/limits), including **Samples per signal**
- [How a block works](ide/blocks)
