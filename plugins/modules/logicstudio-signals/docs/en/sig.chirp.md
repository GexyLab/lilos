# Chirp (scipy.signal.chirp)

`sig.chirp` · Signals · [Signals](logicstudio-signals) · version 1

Generates a **chirp**: a sine whose frequency changes in time, from a start frequency to an end frequency, linearly or logarithmically. It is the test signal to see in one go how a filter or a system answers at all frequencies.

## Inputs

| Port | Type | Description |
|---|---|---|
| **generate** (`generate`) | pulse | A pulse generates a new frame. If it is **not linked**, the block sends one frame when the program starts. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The frame: `{ fs, t0, samples }`. |
| **Exception** (`error`) | object | Invalid sampling rate or number of samples, invalid frequencies for the logarithmic sweep, signal too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Start frequency f₀ (Hz)** (`f0`) | 0 or more | 10 | The frequency at the first sample. |
| **End frequency f₁ (Hz)** (`f1`) | 0 or more | 200 | The frequency reached at the end of the frame. |
| **Sweep** (`method`) | Linear / Logarithmic | Linear | How the frequency changes in time. |
| **Amplitude** (`amplitude`) | number | 1 | The peak of the signal. |
| **Sampling rate fs (Hz)** (`fs`) | more than 0 | 1000 | How many samples per second. |
| **Samples N** (`samples`) | from 1 | 1000 | How many samples each frame has; with `fs` it gives the length `T = N / fs` of the sweep. |
| **Time goes on (each frame after the last)** (`continue`) | yes / no | yes | Changes only the `t0` written in the frame (see below). |

## How it works

- The **sweep** lasts as long as the frame, `T = N / fs`: the frequency is `f₀` at the first sample and reaches `f₁` at the end. The signal is `A·cos(2π·phase(t))` and starts with value `A` (cosine at phase 0).
- **Linear**: the instantaneous frequency grows (or falls) at a constant rate, `f(t) = f₀ + (f₁ − f₀)·t / T`, and the phase is `f₀·t + (f₁ − f₀)·t² / (2T)`.
- **Logarithmic**: the frequency changes by constant ratios, `f(t) = f₀·(f₁/f₀)^(t/T)`, and the phase is `f₀·(e^(k·t) − 1) / k` with `k = ln(f₁/f₀) / T`. With `f₀ = f₁` a cosine at constant frequency comes out.
- If `f₁` is less than `f₀` the sweep goes down.
- **Every frame does the sweep again from the start**: with a pulse on **generate** for every frame, the signal starts again from `f₀` each time. **Time goes on** changes only the `t0` of the frame (the written time), not the samples.
- The block does not check that `f₀` and `f₁` are below `fs/2`: above that limit there is aliasing (see the theory).

## A bit of theory

A signal with a changing frequency is `x(t) = A·cos(φ(t))` and its **instantaneous frequency** is the derivative of the phase: `f(t) = (1/2π)·dφ/dt`. In the linear chirp `f(t)` is a straight line: the spectrum is almost flat between `f₀` and `f₁`, because every frequency "passes" for the same time. In the logarithmic chirp every **octave** lasts the same time, and the spectrum falls by 3 dB per octave (like pink noise): it is used to measure audio systems, where decades of frequency matter.

That is why the chirp is the classic signal to measure a **frequency response**: a single signal goes through all the frequencies, and the amplitude of the output over time tells the gain of the system at the frequency of that instant. It is seen well with a [Spectrogram (STFT)](sig.spectrogram) (a diagonal line) or with the [Power spectral density (Welch)](sig.psd).

Remember the **Nyquist** limit: the sweep must stay below `fs/2`. With `fs = 1000` and `f₁ = 800` Hz, the part above 500 Hz folds downward (aliasing) and the sweep seems to turn back.

## Examples

### 1. How much a filter lets through

A 10 to 200 Hz chirp of 1 second goes into a low-pass; the FFT of the output shows the filter cutting:

```
[Chirp (scipy.signal.chirp)] signal ──▶ signal [IIR filter (butter, cheby1, cheby2)] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart] chart data ──▶ data [Lines]
```

### 2. The sweep in time

You look at the signal in time with a [To chart](sig.toChart): the oscillations get narrower as the frequency goes up.

```
[Chirp (scipy.signal.chirp)] signal ──▶ data [To chart] chart data ──▶ data [Lines]
```

With the default settings (10→200 Hz, `fs` 1000, 1000 samples) the sweep lasts 1 second.

### 3. Logarithmic chirp

With **Sweep** logarithmic, **f₀** 20, **f₁** 20000 and `fs` 48000, the audio range from 20 Hz to 20 kHz is covered evenly by octaves; with **Linear**, almost all the time is spent above 1000 Hz.

## Errors

| Message | When |
|---|---|
| La frequenza di campionamento deve essere più di 0 ("The sampling rate must be more than 0") | **fs** is 0 or negative. |
| Serve almeno un campione ("At least one sample is needed") | **Samples N** is less than 1. |
| Con l'andamento logaritmico f₀ e f₁ devono essere più di 0 ("With the logarithmic sweep f₀ and f₁ must be more than 0") | **Logarithmic** with **f₀** or **f₁** equal to 0 (or negative). |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | **Samples N** is over the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |

## See also

- [Spectrogram (STFT)](sig.spectrogram) to see the frequency changing in time
- [Frequency response (freqz, Bode)](sig.response)
- [Oscillator (waveform generator)](sig.oscillator), [Impulse · Step · Ramp](sig.elementary)
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
